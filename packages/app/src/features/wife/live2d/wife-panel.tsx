import { createEffect, createMemo, createSignal, For, lazy, onCleanup, onMount, Show, Suspense } from "solid-js"
import { createStore } from "solid-js/store"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { LoaderV2 } from "@opencode-ai/ui/v2/loader-v2"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { TooltipV2 } from "@opencode-ai/ui/v2/tooltip-v2"
import { PromptInputV2, type PromptInputV2PersistedState } from "@opencode-ai/session-ui/v2/prompt-input"
import { createPromptInputV2Controller } from "@opencode-ai/session-ui/v2/prompt-input/interaction"
import { Markdown } from "@opencode-ai/session-ui/markdown"
import { ModelSelectorPopoverV2 } from "@/components/dialog-select-model"
import { useSettingsDialog } from "@/components/settings-dialog"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useLocal, type ModelKey, type ModelSelection } from "@/context/local"
import { usePlatform } from "@/context/platform"
import { useSDK } from "@/context/sdk"
import { useServerSDK } from "@/context/server-sdk"
import { useSettings } from "@/context/settings"
import type { Sizing } from "@/pages/session/helpers"
import { Persist, persisted } from "@/utils/persist"
import { useWifeRegistry } from "../registry/wife-registry"
import { Avatar, HISTORY_WHEEL_DISTANCE, WifeChatArea } from "../chat/wife-chat-area"
import type { WifeChatController } from "../chat/wife-chat-controller"
import type { PresentationIntent } from "./live2d-view"

export const WIFE_PANEL_WIDTH_MIN = 260
// Keep Pixi/Cubism initialization out of the 240ms panel-width transition.
const LIVE2D_START_DELAY_MS = 260

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

type WifePanelPreference = {
  characterID?: string
  model?: ModelKey
  variant?: string
}

export function WifePanel(props: {
  sessionID: string
  size: Sizing
  maxWidth: number
  resizeEdge: "start" | "end"
  chat: WifeChatController
}) {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const platform = usePlatform()
  const layout = useLayout()
  const settings = useSettings()
  const sdk = useSDK()
  const serverSDK = useServerSDK()
  const local = useLocal()
  const openCharacters = useSettingsDialog("wife-characters")
  const [preferences, setPreferences, , preferencesReady] = persisted(
    Persist.serverWorkspace(serverSDK().scope, sdk().directory, "wife-panel-preferences"),
    createStore<{ sessions: Record<string, WifePanelPreference | undefined> }>({ sessions: {} }),
  )

  const usableCharacters = createMemo(() => {
    if (platform.platform !== "desktop") return []
    return registry
      .list()
      .filter((character) => character.avatar && registry.modelFolder()(character.id))
  })
  const selectedCharacter = createMemo(
    () =>
      usableCharacters().find((character) => character.id === preferences.sessions[props.sessionID]?.characterID) ??
      usableCharacters()[0],
  )
  const [loadError, setLoadError] = createSignal<string>()
  const [runtimeEnabled, setRuntimeEnabled] = createSignal(false)
  const intent: PresentationIntent = { state: "idle", emotion: "neutral" }

  onMount(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const timer = window.setTimeout(() => setRuntimeEnabled(true), reducedMotion ? 0 : LIVE2D_START_DELAY_MS)
    onCleanup(() => window.clearTimeout(timer))
  })

  const [wifeInput, setWifeInput] = createStore<PromptInputV2PersistedState>({
    prompt: [{ type: "text", content: "", start: 0, end: 0 }],
    cursor: 0,
    context: { items: [] },
  })
  const [historyProgress, setHistoryProgress] = createSignal(0)
  const [modelInteraction, setModelInteraction] = createSignal(false)
  let historyScroll: HTMLDivElement | undefined
  const updatePreference = (patch: Partial<WifePanelPreference>) => {
    setPreferences("sessions", props.sessionID, (value) => ({ ...value, ...patch }))
  }

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !modelInteraction()) return
      setModelInteraction(false)
    }
    window.addEventListener("keydown", onKeyDown)
    onCleanup(() => window.removeEventListener("keydown", onKeyDown))
  })

  let interactionSessionID = props.sessionID
  createEffect(() => {
    const sessionID = props.sessionID
    if (sessionID === interactionSessionID) return
    interactionSessionID = sessionID
    setModelInteraction(false)
    setHistoryProgress(0)
  })

  const toggleModelInteraction = () => {
    const next = !modelInteraction()
    if (next) setHistoryProgress(0)
    setModelInteraction(next)
  }

  createEffect(() => {
    const sessionID = props.sessionID
    const model = local.model.current()
    const variant = local.model.variant.current()
    if (!model) return
    const initialize = () => {
      if (props.sessionID !== sessionID || preferences.sessions[sessionID]?.model) return
      setPreferences("sessions", sessionID, {
        ...preferences.sessions[sessionID],
        model: { providerID: model.provider.id, modelID: model.id },
        variant,
      })
    }
    if (preferencesReady()) {
      initialize()
      return
    }
    void preferencesReady.promise?.then(initialize)
  })

  const selectedModel = createMemo(() => {
    const value = preferences.sessions[props.sessionID]?.model
    if (!value) return local.model.current()
    return (
      local.model.list().find((item) => item.provider.id === value.providerID && item.id === value.modelID) ??
      local.model.current()
    )
  })
  const selectedVariant = createMemo(() => {
    const value = preferences.sessions[props.sessionID]?.variant
    if (!value || !selectedModel()?.variants || !Object.keys(selectedModel()!.variants!).includes(value)) {
      return undefined
    }
    return value
  })
  const wifeModel: ModelSelection = {
    ...local.model,
    current: selectedModel,
    cycle(direction) {
      const items = local.model
        .list()
        .filter((item) => local.model.visible({ providerID: item.provider.id, modelID: item.id }))
      const current = selectedModel()
      if (!current || items.length === 0) return
      const index = items.findIndex((item) => item.provider.id === current.provider.id && item.id === current.id)
      const next = items[(index + direction + items.length) % items.length]
      if (next) this.set({ providerID: next.provider.id, modelID: next.id })
    },
    set(value) {
      if (!value) return
      local.model.setVisibility(value, true)
      updatePreference({ model: value, variant: undefined })
    },
    variant: {
      ...local.model.variant,
      configured: () => undefined,
      selected: selectedVariant,
      current: selectedVariant,
      list: () => Object.keys(selectedModel()?.variants ?? {}),
      set: (value) => updatePreference({ variant: value }),
      cycle() {
        const items = this.list()
        if (items.length === 0) return
        const index = items.indexOf(this.current() ?? "")
        this.set(items[(index + 1) % items.length])
      },
    },
  }
  createEffect(() => {
    if (historyProgress() < 1) return
    queueMicrotask(() => {
      const target = historyScroll
      if (!target) return
      target.scrollTo({ top: target.scrollHeight })
    })
  })

  const submitWifeMessage = (text: string) => {
    const model = selectedModel()
    if (!model) return false
    return props.chat.submit(
      text,
      selectedCharacter()?.name ?? language.t("wife.panel.chat.roleAssistant"),
      { providerID: model.provider.id, modelID: model.id, variant: selectedVariant() },
    )
  }
  const wifeInputController = createPromptInputV2Controller({
    store: [wifeInput, setWifeInput],
    commands: () => [],
    context: () => [],
    searchContextFiles: () => [],
    view: {
      placeholder: () => language.t("wife.panel.chat.placeholder"),
      variant: {
        options: () => wifeModel.variant.list().map((value) => ({ id: value, label: value })),
        current: () => wifeModel.variant.current() ?? "default",
        onSelect: (value) => wifeModel.variant.set(value === "default" ? undefined : value),
      },
      submit: {
        stopping: props.chat.working,
        working: props.chat.working,
        onSubmit: () => {
          const text = wifeInputController.value()
          if (!text.trim()) return
          if (!submitWifeMessage(text)) return
          wifeInputController.onInput("", [{ type: "text", content: "", start: 0, end: 0 }], 0)
        },
        onStop: props.chat.stop,
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
    updatePreference({ characterID: id })
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
          edge={props.resizeEdge}
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
            <header class="flex items-center justify-between gap-2 h-10 shrink-0 px-3 border-b border-v2-border-border-base">
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
              <TooltipV2
                placement="bottom"
                value={language.t(
                  modelInteraction() ? "wife.panel.modelInteraction.exit" : "wife.panel.modelInteraction.enter",
                )}
              >
                <ButtonV2
                  type="button"
                  size="normal"
                  variant={modelInteraction() ? "neutral" : "ghost-muted"}
                  class="!size-7 !p-0 shrink-0"
                  aria-label={language.t(
                    modelInteraction() ? "wife.panel.modelInteraction.exit" : "wife.panel.modelInteraction.enter",
                  )}
                  aria-pressed={modelInteraction()}
                  disabled={!runtimeEnabled() || !!loadError()}
                  onClick={toggleModelInteraction}
                >
                  <Icon name="mouse" />
                </ButtonV2>
              </TooltipV2>
            </header>
            <div class="relative flex-1 min-h-0 bg-v2-background-bg-base">
              <Show when={!loadError()} fallback={<EmptyState title={language.t("wife.panel.empty.loadFailed")} />}>
                <Show
                  when={runtimeEnabled() && selectedCharacter()}
                  keyed
                  fallback={
                    <div class="absolute inset-0 flex items-center justify-center">
                      <LoaderV2 class="size-4 text-v2-icon-icon-muted" />
                    </div>
                  }
                >
                  {(character) => (
                    <Suspense
                      fallback={
                        <div class="absolute inset-0 flex items-center justify-center">
                          <LoaderV2 class="size-4 text-v2-icon-icon-muted" />
                          <span class="sr-only">{language.t("common.loading")}</span>
                        </div>
                      }
                    >
                      <Live2DView
                        modelUrl={url()}
                        avatar={() => character.avatar!}
                        intent={() => intent}
                        interactionEnabled={modelInteraction}
                        initialView={initialView()}
                        onViewChange={saveView}
                        onError={(message) => setLoadError(message)}
                      />
                    </Suspense>
                  )}
                </Show>
              </Show>
              <Show when={selectedCharacter()}>
                <div
                  class="pointer-events-none absolute inset-0 z-10 flex flex-col transition-opacity duration-150 ease-out motion-reduce:transition-none"
                  classList={{
                    "opacity-0": modelInteraction(),
                    "opacity-100": !modelInteraction(),
                  }}
                  aria-hidden={modelInteraction()}
                  inert={modelInteraction()}
                >
                  <div class="relative min-h-0 flex-1">
                    <WifeChatArea
                      messages={props.chat.messages}
                      choices={props.chat.choices}
                      avatarImage={() => selectedCharacter()?.avatarImage}
                      characterName={() => selectedCharacter()?.name}
                      heightRatio={() => settings.general.wifeChatHeightRatio()}
                      historyProgress={historyProgress}
                      onHistoryProgress={setHistoryProgress}
                      onChoice={submitWifeMessage}
                      loading={props.chat.loading}
                      error={props.chat.error}
                      loadingLabel={() => language.t("common.loading")}
                      errorLabel={() => language.t("common.requestFailed")}
                      interactive={() => !modelInteraction()}
                    />
                  </div>
                  <div
                    class="w-full px-3 pt-4 pb-3 md:max-w-200 md:mx-auto 2xl:max-w-[1000px]"
                    classList={{
                      "pointer-events-auto": !modelInteraction(),
                      "pointer-events-none": modelInteraction(),
                    }}
                  >
                    <PromptInputV2
                      controller={wifeInputController}
                      modelControl={
                        <ModelSelectorPopoverV2
                          model={wifeModel}
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
                              <Show when={selectedModel()}>
                                {(current) => (
                                  <ProviderIcon
                                    id={current().provider.id}
                                    class="size-4 shrink-0 opacity-60"
                                  />
                                )}
                              </Show>
                              <span class="truncate leading-4">
                                {selectedModel()?.id ?? language.t("dialog.model.select.title")}
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
                      <For each={props.chat.messages()}>
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
