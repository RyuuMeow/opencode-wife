import { Component, JSX, Show, createMemo, createSignal, onCleanup } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import {
  createEmptyAvatar,
  findModel3Files,
  isPathSafe,
  normalizeModelPath,
  scanHasErrors,
  scanLive2dModel,
  suggestMappings,
  type AvatarProfile,
  type SuggestedMappings,
} from "@opencode-ai/wife-core"
import { useLanguage } from "@/context/language"
import { useWifeRegistry } from "../registry/wife-registry"
import { CapabilitySummary } from "./capability-summary"
import { SemanticMappingEditor } from "./semantic-mapping"

const MAX_TEXT_BYTES = 5 * 1024 * 1024
const MAX_ASSET_BYTES = 200 * 1024 * 1024

function fileSetFromFiles(files: File[]) {
  const byPath = new Map(files.map((file) => [normalizeModelPath(file.webkitRelativePath || file.name), file]))
  return {
    has: (path: string) => byPath.has(normalizeModelPath(path)),
    readText: async (path: string) => {
      const file = byPath.get(normalizeModelPath(path))
      if (!file || file.size > MAX_TEXT_BYTES) return undefined
      return file.text()
    },
  }
}

export const CharacterSettings: Component<{
  id: string
  onBack: () => void
}> = (props) => {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const character = createMemo(() => registry.character()(props.id))
  const capabilities = createMemo(() => registry.capabilities()(props.id))
  const [name, setName] = createSignal(character()?.name ?? "")
  const [mappings, setMappings] = createSignal<SuggestedMappings>(initialMappings(character()?.avatar))
  const [changingModel, setChangingModel] = createSignal(false)
  const [files, setFiles] = createSignal<File[]>([])
  const [models, setModels] = createSignal<string[]>([])
  const [modelPath, setModelPath] = createSignal<string>()
  const [scanning, setScanning] = createSignal(false)
  const [notice, setNotice] = createSignal<string>()
  const [previewUrl, setPreviewUrl] = createSignal<string>()
  const [oversizedFiles, setOversizedFiles] = createSignal(0)

  onCleanup(() => {
    const url = previewUrl()
    if (url) URL.revokeObjectURL(url)
  })

  const pickModel = async (list: FileList | null) => {
    if (!list) return
    const picked = Array.from(list)
    setFiles(picked)
    setNotice(undefined)
    const model3Files = findModel3Files(picked.map((file) => file.webkitRelativePath || file.name))
    if (model3Files.length === 0) {
      setNotice(language.t("wife.import.noModelFound"))
      return
    }
    setModels(model3Files)
    if (model3Files.length === 1) {
      await beginScan(model3Files[0]!, picked)
    }
  }

  const beginScan = async (path: string, picked: File[]) => {
    setModelPath(path)
    setScanning(true)
    try {
      const scan = await scanLive2dModel(path, fileSetFromFiles(picked))
      if (scanHasErrors(scan.issues)) {
        setNotice(scan.issues.map((issue) => `[${issue.code}] ${issue.message}`).join("; "))
        return
      }
      const suggested = suggestMappings(scan.capabilities)
      registry.update(props.id, {
        avatar: {
          ...createEmptyAvatar(path),
          states: suggested.states,
          gestures: suggested.gestures,
          emotions: suggested.emotions,
        },
      })
      registry.setCapabilities(props.id, scan.capabilities)
      setMappings(suggested)
      setChangingModel(false)
      setNotice(undefined)

      const image = picked.find(
        (file) =>
          /\.(png|jpe?g|webp)$/i.test(file.webkitRelativePath || file.name) &&
          isPathSafe(file.webkitRelativePath || file.name),
      )
      if (image) {
        const url = previewUrl()
        if (url) URL.revokeObjectURL(url)
        setPreviewUrl(URL.createObjectURL(image))
      }
      setOversizedFiles(picked.filter((file) => file.size > MAX_ASSET_BYTES).length)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setScanning(false)
    }
  }

  const save = () => {
    const current = character()
    if (!current) return
    registry.update(props.id, {
      name: name().trim() || current.name,
      avatar: current.avatar
        ? {
            ...current.avatar,
            states: mappings().states,
            gestures: mappings().gestures,
            emotions: mappings().emotions,
          }
        : undefined,
    })
  }

  const remove = () => {
    registry.remove(props.id)
    props.onBack()
  }

  return (
    <div class="flex flex-col gap-4">
      <ButtonV2 size="small" variant="ghost" icon="arrow-left" onClick={props.onBack}>
        {language.t("wife.characters.backToList")}
      </ButtonV2>

      <Show
        when={character()}
        fallback={<span class="text-12-regular text-text-weak">{language.t("common.loading")}</span>}
      >
        <div class="w-64">
          <TextInputV2
            type="text"
            appearance="base"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
            placeholder={language.t("wife.import.name")}
            aria-label={language.t("wife.import.name")}
          />
        </div>

        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">{language.t("wife.characters.settings.avatar")}</h3>

          <Show
            when={!character()?.avatar || changingModel()}
            fallback={<ConfiguredModel onModelChange={() => setChangingModel(true)} />}
          >
            <div class="flex flex-col gap-3">
              <input
                type="file"
                class="hidden"
                onChange={(event) => void pickModel(event.currentTarget.files)}
                {...({ webkitdirectory: "", directory: "" } as unknown as JSX.InputHTMLAttributes<HTMLInputElement>)}
              />
              <ButtonV2
                size="normal"
                variant="neutral"
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][webkitdirectory]')?.click()}
              >
                {language.t("wife.import.chooseFolder")}
              </ButtonV2>
              <Show when={models().length > 1}>
                <SelectV2
                  appearance="inline"
                  options={models()}
                  current={modelPath() ?? models()[0]}
                  placement="bottom-end"
                  gutter={6}
                  label={(option) => option}
                  onSelect={(option) => option && void beginScan(option, files())}
                />
              </Show>
              <Show when={scanning()}>
                <span class="text-12-regular">{language.t("common.loading")}</span>
              </Show>
              <Show when={notice()}>
                <span class="text-12-regular" style={{ color: "var(--text-on-critical-base)" }}>
                  {notice()}
                </span>
              </Show>
              <Show when={oversizedFiles() > 0}>
                <span class="text-12-regular" style={{ color: "var(--text-on-critical-weak)" }}>
                  {language.t("wife.import.oversized")} ({oversizedFiles()})
                </span>
              </Show>
            </div>
          </Show>

          <Show when={character()?.avatar && !changingModel()}>
            <div class="flex gap-4 pt-2">
              <Show when={previewUrl()}>
                <img src={previewUrl()} alt={name()} class="h-24 w-24 object-contain border border-line rounded-lg" />
              </Show>
              <div class="flex flex-col gap-2">
                <span class="text-12-regular text-text-weak">{character()?.avatar?.modelAssetId}</span>
                <Show when={capabilities()}>{(caps) => <CapabilitySummary capabilities={caps()} />}</Show>
              </div>
            </div>
          </Show>

          <Show when={capabilities()}>
            {(caps) => <SemanticMappingEditor capabilities={caps()} mappings={mappings()} onChange={setMappings} />}
          </Show>
        </div>

        <div class="flex justify-end gap-2">
          <ButtonV2 size="normal" variant="danger" onClick={remove}>
            {language.t("common.delete")}
          </ButtonV2>
          <ButtonV2 size="normal" variant="contrast" onClick={save}>
            {language.t("common.save")}
          </ButtonV2>
        </div>
      </Show>
    </div>
  )
}

const ConfiguredModel: Component<{ onModelChange: () => void }> = (props) => {
  const language = useLanguage()
  return (
    <ButtonV2 size="small" variant="ghost" onClick={props.onModelChange}>
      {language.t("wife.characters.settings.changeModel")}
    </ButtonV2>
  )
}

function initialMappings(avatar: AvatarProfile | undefined): SuggestedMappings {
  return {
    states: avatar?.states ?? {},
    gestures: avatar?.gestures ?? {},
    emotions: avatar?.emotions ?? {},
  }
}
