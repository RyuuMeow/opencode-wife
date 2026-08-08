import { createEffect, createMemo, createSignal, For, lazy, onCleanup, Show, Suspense } from "solid-js"
import { createStore } from "solid-js/store"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { PromptInputV2, type PromptInputV2PersistedState } from "@opencode-ai/session-ui/v2/prompt-input"
import { createPromptInputV2Controller } from "@opencode-ai/session-ui/v2/prompt-input/interaction"
import { Markdown } from "@opencode-ai/session-ui/markdown"
import { ModelSelectorPopoverV2 } from "@/components/dialog-select-model"
import { useSettingsDialog } from "@/components/settings-dialog"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useLocal } from "@/context/local"
import { usePlatform } from "@/context/platform"
import { useSettings } from "@/context/settings"
import type { Sizing } from "@/pages/session/helpers"
import { useWifeRegistry } from "../registry/wife-registry"
import { Avatar, HISTORY_WHEEL_DISTANCE, WifeChatArea, type WifeChatMessage } from "../chat/wife-chat-area"
import { splitIntoSentences } from "../chat/sentences"
import type { PresentationIntent } from "./live2d-view"

export const WIFE_PANEL_WIDTH_MIN = 260

const Live2DView = lazy(async () => {
  try {
    return { default: (await import("./live2d-view")).Live2DView }
  } catch {
    return { default: RuntimeMissing }
  }
})

function RuntimeMissing() {
  const language = useLanguage()
  return <EmptyState title={language.t("wife.panel.empty.runtimeMissing")} />
}

function EmptyState(props: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div class="flex flex-col items-center justify-center gap-3 h-full px-6 text-center">
      <span class="text-13-regular text-v2-text-text-muted">{props.title}</span>
      <Show when={props.action}>
        <ButtonV2 size="small" variant="neutral" onClick={props.action?.onClick}>
          {props.action?.label}
        </ButtonV2>
      </Show>
    </div>
  )
}

export function WifePanel(props: { size: Sizing; maxWidth: number }) {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const platform = usePlatform()
  const layout = useLayout()
  const settings = useSettings()
  const openCharacters = useSettingsDialog("wife-characters")

  const usableCharacters = createMemo(() => {
    if (platform.platform !== "desktop") return []
    return registry
      .list()
      .filter((character) => character.avatar && registry.modelFolder()(character.id))
  })
  const [selectedId, setSelectedId] = createSignal<string>()
  const selectedCharacter = createMemo(
    () => usableCharacters().find((character) => character.id === selectedId()) ?? usableCharacters()[0],
  )
  const [loadError, setLoadError] = createSignal<string>()
  const intent: PresentationIntent = { state: "idle", emotion: "neutral" }

  const [wifeInput, setWifeInput] = createStore<PromptInputV2PersistedState>({
    prompt: [{ type: "text", content: "", start: 0, end: 0 }],
    cursor: 0,
    context: { items: [] },
  })
  const [wifeMessages, setWifeMessages] = createSignal<WifeChatMessage[]>([])
  const [wifeChoices, setWifeChoices] = createSignal<string[]>([])
  const [historyProgress, setHistoryProgress] = createSignal(0)
  let historyScroll: HTMLDivElement | undefined
  let wifePanStart: ((event: PointerEvent) => void) | undefined
  let replyVersion = 0
  const replyTimers = new Set<ReturnType<typeof setTimeout>>()
  const local = useLocal()
  createEffect(() => {
    if (historyProgress() < 1) return
    queueMicrotask(() => {
      const target = historyScroll
      if (!target) return
      target.scrollTo({ top: target.scrollHeight })
    })
  })

  const submitWifeMessage = (text: string) => {
    const version = ++replyVersion
    setWifeChoices([])
    setWifeMessages((messages) => [...messages, { id: crypto.randomUUID(), role: "user", content: text }])
    // Placeholder reply until the read-only wife session lands (Milestone 2).
    // Deliver it sentence by sentence so the bubbles feel conversational.
    const sentences = splitIntoSentences(`收到！你說的是：「${text}」讓我來想想看。這聽起來很有趣。`)
    const delays = sentences.map(
      (_, index) =>
        900 +
        sentences
          .slice(0, index)
          .reduce((total, sentence) => total + Math.min(3600, Math.max(1400, sentence.length * 90)), 0),
    )
    sentences.forEach((sentence, index) => {
      const timer = setTimeout(() => {
        replyTimers.delete(timer)
        if (version !== replyVersion) return
        setWifeMessages((messages) => [
          ...messages,
          { id: crypto.randomUUID(), role: "assistant", content: sentence },
        ])
        if (index !== sentences.length - 1) return
        setWifeChoices(["再多說一點", "換個方向看看", "先到這裡"])
      }, delays[index])
      replyTimers.add(timer)
    })
  }
  onCleanup(() => {
    replyVersion += 1
    replyTimers.forEach(clearTimeout)
  })
  const wifeInputController = createPromptInputV2Controller({
    store: [wifeInput, setWifeInput],
    commands: () => [],
    context: () => [],
    searchContextFiles: () => [],
    view: {
      placeholder: () => language.t("wife.panel.chat.placeholder"),
      variant: {
        options: () => local.model.variant.list().map((value) => ({ id: value, label: value })),
        current: () => local.model.variant.current() ?? "default",
        onSelect: (value) => local.model.variant.set(value === "default" ? undefined : value),
      },
      submit: {
        stopping: () => false,
        onSubmit: () => {
          const text = wifeInputController.value()
          if (!text.trim()) return
          submitWifeMessage(text)
          wifeInputController.onInput("", [{ type: "text", content: "", start: 0, end: 0 }], 0)
        },
        onStop: () => {},
      },
    },
  })

  const initialView = createMemo(() => {
    const character = selectedCharacter()
    return character ? registry.viewState()(character.id) : undefined
  })

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  const saveView = (view: { zoom: number; offsetX: number; offsetY: number }) => {
    const id = selectedCharacter()?.id
    if (!id) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => registry.setViewState(id, view), 250)
  }
  onCleanup(() => clearTimeout(saveTimer))

  const modelUrl = createMemo(() => {
    const character = selectedCharacter()
    if (!character?.avatar) return undefined
    return `wife://${character.id}/${character.avatar.modelAssetId}`
  })

  const onSelectCharacter = (id: string) => {
    setLoadError(undefined)
    setSelectedId(id)
  }

  return (
    <aside
      id="wife-panel"
      aria-label={language.t("session.panel.wife")}
      class="relative shrink-0 h-full min-w-0 flex flex-col overflow-hidden bg-v2-background-bg-base rounded-[10px] shadow-[var(--v2-elevation-raised)]"
      style={{ width: `${layout.wife.width()}px` }}
    >
      <div onPointerDown={() => props.size.start()}>
        <ResizeHandle
          direction="horizontal"
          edge="start"
          size={layout.wife.width()}
          min={WIFE_PANEL_WIDTH_MIN}
          max={props.maxWidth}
          onResize={(width) => {
            props.size.touch()
            layout.wife.resize(width)
          }}
        />
      </div>
      <Show
        when={platform.platform === "desktop" && modelUrl()}
        fallback={
          <EmptyState
            title={
              platform.platform === "desktop"
                ? language.t("wife.panel.empty.noModel")
                : language.t("wife.panel.empty.web")
            }
            action={
              platform.platform === "desktop"
                ? { label: language.t("wife.panel.empty.openSettings"), onClick: openCharacters }
                : undefined
            }
          />
        }
      >
        {(url) => (
          <>
            <header class="flex items-center h-10 shrink-0 px-3 border-b border-v2-border-border-base">
              <div class="w-40 min-w-0 shrink-0">
                <SelectV2
                  appearance="inline"
                  options={usableCharacters().map((character) => character.id)}
                  current={selectedCharacter().id}
                  placement="bottom-start"
                  gutter={6}
                  label={(id) => usableCharacters().find((character) => character.id === id)?.name ?? id}
                  onSelect={(id) => id && onSelectCharacter(id)}
                  aria-label={language.t("wife.panel.selectCharacter")}
                />
              </div>
            </header>
            <div class="relative flex-1 min-h-0 bg-v2-background-bg-base">
              <Show when={!loadError()} fallback={<EmptyState title={language.t("wife.panel.empty.loadFailed")} />}>
                <Show when={selectedCharacter()} keyed>
                  {(character) => (
                    <Suspense fallback={<span class="sr-only">{language.t("common.loading")}</span>}>
                      <Live2DView
                        modelUrl={url()}
                        avatar={() => character.avatar!}
                        intent={() => intent}
                        initialView={initialView()}
                        onViewChange={saveView}
                        onError={(message) => setLoadError(message)}
                        onPanReady={(start) => (wifePanStart = start)}
                      />
                    </Suspense>
                  )}
                </Show>
              </Show>
              <Show when={selectedCharacter()}>
                <div class="pointer-events-none absolute inset-0 z-10 flex flex-col">
                  <div class="relative min-h-0 flex-1">
                    <WifeChatArea
                      messages={wifeMessages}
                      choices={wifeChoices}
                      avatarImage={() => selectedCharacter()?.avatarImage}
                      characterName={() => selectedCharacter()?.name}
                      heightRatio={() => settings.general.wifeChatHeightRatio()}
                      historyProgress={historyProgress}
                      onHistoryProgress={setHistoryProgress}
                      onChoice={submitWifeMessage}
                      onPanStart={(event) => wifePanStart?.(event)}
                    />
                  </div>
                  <div class="pointer-events-auto w-full px-3 pt-4 pb-3 md:max-w-200 md:mx-auto 2xl:max-w-[1000px]">
                    <PromptInputV2
                      controller={wifeInputController}
                      modelControl={
                        <ModelSelectorPopoverV2
                          model={local.model}
                          trigger={(triggerProps) => (
                            <ButtonV2
                              {...triggerProps}
                              variant="ghost-muted"
                              size="normal"
                              style={{ height: "28px" }}
                              class="min-w-0 max-w-[220px] justify-start ![font-weight:440] group"
                              data-action="prompt-model"
                              data-control-type="popover"
                            >
                              <Show when={local.model.current()}>
                                {(current) => (
                                  <ProviderIcon
                                    id={current().provider.id}
                                    class="size-4 shrink-0 opacity-60"
                                  />
                                )}
                              </Show>
                              <span class="truncate leading-4">
                                {local.model.current()?.id ?? language.t("dialog.model.select.title")}
                              </span>
                              <span class="-ms-0.5 -me-1 flex shrink-0">
                                <Icon name="chevron-down" />
                              </span>
                            </ButtonV2>
                          )}
                        />
                      }
                    />
                  </div>
                </div>
              </Show>

              <Show when={selectedCharacter()}>
                <div
                  class="absolute inset-0 z-30 flex flex-col bg-v2-background-bg-base transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
                  classList={{
                    "pointer-events-auto": historyProgress() > 0,
                    "pointer-events-none": historyProgress() === 0,
                  }}
                  style={{
                    opacity: historyProgress(),
                    transform: `translateY(${(1 - historyProgress()) * 8}px)`,
                  }}
                  aria-hidden={historyProgress() === 0}
                  inert={historyProgress() === 0}
                  data-state={historyProgress() === 0 ? "closed" : historyProgress() === 1 ? "open" : "opening"}
                >
                  <header class="flex h-10 shrink-0 items-center justify-between px-3">
                    <span class="text-13-regular text-v2-text-text-base">
                      {language.t("wife.panel.chat.historyTitle")}
                    </span>
                    <ButtonV2
                      size="small"
                      variant="ghost-muted"
                      onClick={() => setHistoryProgress(0)}
                      aria-label={language.t("wife.panel.chat.historyClose")}
                    >
                      <Icon name="outline-xmark" />
                    </ButtonV2>
                  </header>
                  <div
                    ref={historyScroll}
                    class="flex-1 min-h-0 select-text overflow-y-auto px-3 pb-3"
                    onWheel={(event) => {
                      const target = event.currentTarget
                      const progress = historyProgress()
                      if (progress < 1) {
                        event.preventDefault()
                        event.stopPropagation()
                        setHistoryProgress(
                          Math.max(0, Math.min(1, progress - event.deltaY / HISTORY_WHEEL_DISTANCE)),
                        )
                        return
                      }
                      const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1
                      if (!atBottom || event.deltaY <= 0) return
                      event.preventDefault()
                      event.stopPropagation()
                      setHistoryProgress(Math.max(0, 1 - event.deltaY / HISTORY_WHEEL_DISTANCE))
                    }}
                  >
                    <div class="flex flex-col gap-3">
                      <For each={wifeMessages()}>
                        {(message) => (
                          <div class="flex flex-col">
                            <Show when={message.role === "assistant"}>
                              <div class="flex items-center gap-2">
                                <Avatar image={selectedCharacter()?.avatarImage} />
                                <span class="text-11-regular text-v2-text-text-muted">
                                  {selectedCharacter()?.name ?? language.t("wife.panel.chat.roleAssistant")}
                                </span>
                              </div>
                            </Show>
                            <div class="mt-1 flex">
                              <div
                                class={`max-w-[85%] rounded-xl px-3 py-2 backdrop-blur-sm ${
                                  message.role === "user"
                                    ? "ms-auto bg-v2-background-bg-layer-01"
                                    : "bg-v2-background-bg-layer-02"
                                }`}
                              >
                                <Markdown text={message.content} />
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </>
        )}
      </Show>
    </aside>
  )
}
