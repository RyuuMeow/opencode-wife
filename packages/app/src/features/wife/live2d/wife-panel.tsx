import { createMemo, createSignal, lazy, onCleanup, Show, Suspense } from "solid-js"
import { createStore } from "solid-js/store"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { Icon } from "@opencode-ai/ui/v2/icon"
import {
  characterEmotions,
  characterGestures,
  characterStates,
  type CharacterEmotion,
  type CharacterGesture,
  type CharacterState,
} from "@opencode-ai/wife-core"
import { PromptInputV2, type PromptInputV2PersistedState } from "@opencode-ai/session-ui/v2/prompt-input"
import { createPromptInputV2Controller } from "@opencode-ai/session-ui/v2/prompt-input/interaction"
import { wifeLogger } from "@opencode-ai/wife-core/log"
import { ModelSelectorPopoverV2 } from "@/components/dialog-select-model"
import { useSettingsDialog } from "@/components/settings-dialog"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useLocal } from "@/context/local"
import { usePlatform } from "@/context/platform"
import type { Sizing } from "@/pages/session/helpers"
import { useWifeRegistry } from "../registry/wife-registry"
import type { PresentationIntent } from "./live2d-view"

export const WIFE_PANEL_WIDTH_MIN = 260

const log = wifeLogger("live2d")

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
  const [intent, setIntent] = createStore<PresentationIntent>({ state: "idle", emotion: "neutral" })

  const [wifeInput, setWifeInput] = createStore<PromptInputV2PersistedState>({
    prompt: [{ type: "text", content: "", start: 0, end: 0 }],
    cursor: 0,
    context: { items: [] },
  })
  const local = useLocal()
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
        onSubmit: () => log.info("submit", wifeInputController.value()),
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
            <header class="flex items-center gap-2 h-10 shrink-0 px-3 border-b border-v2-border-border-base">
              <span class="text-13-regular text-v2-text-text-base truncate">{selectedCharacter()!.name}</span>
              <Show when={usableCharacters().length > 1}>
                <div class="ms-auto w-32 shrink-0">
                  <SelectV2
                    appearance="inline"
                    options={usableCharacters().map((character) => character.id)}
                    current={selectedCharacter()!.id}
                    placement="bottom-end"
                    gutter={6}
                    label={(id) => usableCharacters().find((character) => character.id === id)?.name ?? id}
                    onSelect={(id) => id && onSelectCharacter(id)}
                    aria-label={language.t("wife.panel.selectCharacter")}
                  />
                </div>
              </Show>
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
                      />
                    </Suspense>
                  )}
                </Show>
              </Show>
              <Show when={selectedCharacter()}>
                <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 pt-3 pb-3">
                  <div class="pointer-events-auto w-full px-3 md:max-w-200 md:mx-auto 2xl:max-w-[1000px]">
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
            </div>
            <footer class="flex items-center gap-2 h-11 shrink-0 px-3 border-t border-v2-border-border-base">
              <SelectV2
                appearance="inline"
                options={[...characterStates]}
                current={intent.state}
                placement="top-start"
                gutter={6}
                label={(state) => language.t(`wife.panel.test.state.${state}`)}
                onSelect={(state) => state && setIntent("state", state as CharacterState)}
              />
              <SelectV2
                appearance="inline"
                options={["none", ...characterGestures]}
                current={intent.gesture ?? "none"}
                placement="top-start"
                gutter={6}
                label={(gesture) =>
                  gesture === "none"
                    ? language.t("wife.panel.test.none")
                    : language.t(`wife.panel.test.gesture.${gesture}`)
                }
                onSelect={(gesture) =>
                  setIntent("gesture", gesture && gesture !== "none" ? (gesture as CharacterGesture) : undefined)
                }
              />
              <SelectV2
                appearance="inline"
                options={[...characterEmotions]}
                current={intent.emotion}
                placement="top-start"
                gutter={6}
                label={(emotion) => language.t(`wife.panel.test.emotion.${emotion}`)}
                onSelect={(emotion) => emotion && setIntent("emotion", emotion as CharacterEmotion)}
              />
            </footer>
          </>
        )}
      </Show>
    </aside>
  )
}
