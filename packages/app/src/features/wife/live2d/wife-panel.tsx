import { createMemo, createSignal, lazy, Show, Suspense } from "solid-js"
import { createStore } from "solid-js/store"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { LoaderV2 } from "@opencode-ai/ui/v2/loader-v2"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import {
  characterEmotions,
  characterGestures,
  characterStates,
  type CharacterEmotion,
  type CharacterGesture,
  type CharacterState,
} from "@opencode-ai/wife-core"
import { useSettingsDialog } from "@/components/settings-dialog"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { usePlatform } from "@/context/platform"
import type { Sizing } from "@/pages/session/helpers"
import { useWifeRegistry } from "../registry/wife-registry"
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

export function WifePanel(props: { size: Sizing; maxWidth: number; active: boolean }) {
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
      classList={{ hidden: !props.active }}
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
            <div class="relative flex-1 min-h-0 bg-v2-background-bg-layer-01">
              <Show when={!loadError()} fallback={<EmptyState title={language.t("wife.panel.empty.loadFailed")} />}>
                <Show when={selectedCharacter()} keyed>
                  {(character) => (
                    <Suspense
                      fallback={
                        <div class="absolute inset-0 flex items-center justify-center">
                          <LoaderV2 class="size-4 text-v2-icon-icon-muted" />
                        </div>
                      }
                    >
                      <Live2DView
                        modelUrl={url()}
                        avatar={() => character.avatar!}
                        intent={() => intent}
                        active={props.active}
                        onError={(message) => setLoadError(message)}
                      />
                    </Suspense>
                  )}
                </Show>
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
