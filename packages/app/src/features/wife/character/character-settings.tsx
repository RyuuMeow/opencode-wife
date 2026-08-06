import { Component, JSX, Show, createMemo, createSignal } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Icon } from "@opencode-ai/ui/v2/icon"
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
  type ScanIssue,
  type SuggestedMappings,
} from "@opencode-ai/wife-core"
import { SettingsListV2 } from "@/components/settings-v2/parts/list"
import { SettingsRowV2 } from "@/components/settings-v2/parts/row"
import { useLanguage } from "@/context/language"
import { useWifeRegistry } from "../registry/wife-registry"
import { CapabilitySummary } from "./capability-summary"
import { SemanticMappingEditor } from "./semantic-mapping"

const MAX_TEXT_BYTES = 5 * 1024 * 1024
const MAX_ASSET_BYTES = 200 * 1024 * 1024
const AVATAR_SIZE = 128

function fileSetFromFiles(files: File[]) {
  const byPath = new Map(files.map((file) => [normalizeModelPath(file.webkitRelativePath || file.name), file]))
  return {
    has: (path: string) => byPath.has(normalizeModelPath(path)),
    readText: async (path: string) => {
      const file = byPath.get(normalizeModelPath(path))
      if (!file || file.size > MAX_TEXT_BYTES) return undefined
      return file.text()
    },
    list: () => [...byPath.keys()],
  }
}

async function downscaleImage(file: File, size: number) {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")
  if (!context) return undefined
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return canvas.toDataURL("image/jpeg", 0.85)
}

export const CharacterSettings: Component<{
  id: string
  onBack: () => void
}> = (props) => {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const character = createMemo(() => registry.character()(props.id))
  const capabilities = createMemo(() => registry.capabilities()(props.id))
  const mappings = createMemo<SuggestedMappings>(() => ({
    states: character()?.avatar?.states ?? {},
    gestures: character()?.avatar?.gestures ?? {},
    emotions: character()?.avatar?.emotions ?? {},
  }))
  const [changingModel, setChangingModel] = createSignal(false)
  const [files, setFiles] = createSignal<File[]>([])
  const [models, setModels] = createSignal<string[]>([])
  const [modelPath, setModelPath] = createSignal<string>()
  const [scanning, setScanning] = createSignal(false)
  const [notice, setNotice] = createSignal<string>()
  const [issues, setIssues] = createSignal<ScanIssue[]>([])
  const [oversizedFiles, setOversizedFiles] = createSignal(0)

  const setName = (value: string) => {
    registry.update(props.id, { name: value })
  }

  const updateMappings = (next: SuggestedMappings) => {
    const current = character()
    if (!current?.avatar) return
    registry.update(props.id, {
      avatar: {
        ...current.avatar,
        states: next.states,
        gestures: next.gestures,
        emotions: next.emotions,
      },
    })
  }

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return
    try {
      const dataUrl = await downscaleImage(file, AVATAR_SIZE)
      if (dataUrl) registry.update(props.id, { avatarImage: dataUrl })
    } catch {
      setNotice(language.t("common.requestFailed"))
    }
  }

  const pickModel = async (list: FileList | null) => {
    if (!list) return
    const picked = Array.from(list)
    setFiles(picked)
    setNotice(undefined)
    setIssues([])
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
        setIssues(scan.issues)
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
      setChangingModel(false)
      setNotice(undefined)
      setIssues([])
      setOversizedFiles(picked.filter((file) => file.size > MAX_ASSET_BYTES).length)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setScanning(false)
    }
  }

  const remove = () => {
    registry.remove(props.id)
    props.onBack()
  }

  return (
    <Show
      when={character()}
      fallback={<span class="text-12-regular text-v2-text-text-muted">{language.t("common.loading")}</span>}
    >
      <div class="settings-v2-section">
        <h3 class="settings-v2-section-title">{language.t("wife.characters.settings.avatar")}</h3>
        <span class="text-12-regular text-v2-text-text-muted">
          {language.t("wife.characters.settings.avatarDescription")}
        </span>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="wife-avatar-picker"
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][accept="image/*"]')?.click()}
          >
            <Show when={character()?.avatarImage} fallback={<Icon name="plus" />}>
              <img src={character()?.avatarImage} class="wife-avatar-image" alt="" />
            </Show>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              onChange={(event) => void pickAvatar(event.currentTarget.files?.[0])}
            />
          </button>
          <Show when={character()?.avatarImage}>
            <ButtonV2
              size="small"
              variant="ghost-muted"
              onClick={() => registry.update(props.id, { avatarImage: undefined })}
            >
              {language.t("wife.characters.settings.removeAvatar")}
            </ButtonV2>
          </Show>
        </div>
      </div>

      <div class="settings-v2-section">
        <h3 class="settings-v2-section-title">{language.t("wife.characters.settings.general")}</h3>
        <SettingsListV2>
          <SettingsRowV2
            title={language.t("wife.import.name")}
            description={language.t("wife.characters.settings.nameDescription")}
          >
            <div class="w-64">
              <TextInputV2
                type="text"
                appearance="base"
                value={character()?.name ?? ""}
                onInput={(event) => setName(event.currentTarget.value)}
                placeholder={language.t("wife.import.name")}
                aria-label={language.t("wife.import.name")}
              />
            </div>
          </SettingsRowV2>

          <SettingsRowV2
            title={language.t("wife.characters.settings.model")}
            description={language.t("wife.characters.settings.modelDescription")}
          >
            <Show
              when={!character()?.avatar || changingModel()}
              fallback={
                <div class="flex items-center gap-3">
                  <span class="text-12-regular text-v2-text-text-muted truncate max-w-[220px]">
                    {character()?.avatar?.modelAssetId}
                  </span>
                  <ButtonV2 size="small" variant="ghost" onClick={() => setChangingModel(true)}>
                    {language.t("wife.characters.settings.changeModel")}
                  </ButtonV2>
                </div>
              }
            >
              <div class="flex flex-col items-end gap-2">
                <input
                  type="file"
                  class="hidden"
                  onChange={(event) => void pickModel(event.currentTarget.files)}
                  {...({ webkitdirectory: "", directory: "" } as unknown as JSX.InputHTMLAttributes<HTMLInputElement>)}
                />
                <ButtonV2
                  size="normal"
                  variant="neutral"
                  onClick={() =>
                    document.querySelector<HTMLInputElement>('input[type="file"][webkitdirectory]')?.click()
                  }
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
                  <span class="text-12-regular" style={{ color: "var(--v2-state-fg-danger)" }}>
                    {notice()}
                  </span>
                </Show>
                <Show when={oversizedFiles() > 0}>
                  <span class="text-12-regular" style={{ color: "var(--v2-state-fg-warning)" }}>
                    {language.t("wife.import.oversized")} ({oversizedFiles()})
                  </span>
                </Show>
              </div>
            </Show>
          </SettingsRowV2>
        </SettingsListV2>

        <Show when={issues().length > 0}>
          <div class="flex flex-col gap-1 max-h-40 overflow-auto">
            {issues().map((issue) => (
              <span
                class="text-11-regular break-words"
                style={{
                  color: issue.severity === "error" ? "var(--v2-state-fg-danger)" : "var(--v2-state-fg-warning)",
                }}
              >
                [{issue.code}] {issue.path ? `${issue.path}: ` : ""}
                {issue.message}
              </span>
            ))}
          </div>
        </Show>
      </div>

      <Show when={capabilities()}>
        {(caps) => (
          <div class="settings-v2-section">
            <h3 class="settings-v2-section-title">{language.t("wife.import.step.mapping.title")}</h3>
            <span class="text-12-regular text-v2-text-text-muted">
              {language.t("wife.characters.settings.mappingDescription")}
            </span>
            <CapabilitySummary capabilities={caps()} />
            <SemanticMappingEditor capabilities={caps()} mappings={mappings()} onChange={updateMappings} />
          </div>
        )}
      </Show>

      <div class="settings-v2-section">
        <h3 class="settings-v2-section-title">{language.t("wife.characters.settings.dangerZone")}</h3>
        <SettingsListV2>
          <SettingsRowV2
            title={language.t("wife.characters.settings.delete")}
            description={language.t("wife.characters.settings.deleteDescription")}
          >
            <ButtonV2 size="normal" variant="danger" onClick={remove}>
              {language.t("common.delete")}
            </ButtonV2>
          </SettingsRowV2>
        </SettingsListV2>
      </div>
    </Show>
  )
}
