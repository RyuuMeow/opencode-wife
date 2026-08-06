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
  type Live2dScanResult,
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

function defaultName(modelPath: string) {
  const base =
    modelPath
      .split("/")
      .pop()
      ?.replace(/\.model3\.json$/i, "") ?? "character"
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export const ImportWizard: Component<{
  onDone: () => void
  onCancel: () => void
}> = (props) => {
  const language = useLanguage()
  const registry = useWifeRegistry()

  const [files, setFiles] = createSignal<File[]>([])
  const [models, setModels] = createSignal<string[]>([])
  const [modelPath, setModelPath] = createSignal<string>()
  const [result, setResult] = createSignal<Live2dScanResult>()
  const [name, setName] = createSignal("")
  const [mappings, setMappings] = createSignal<SuggestedMappings>({ states: {}, gestures: {}, emotions: {} })
  const [previewUrl, setPreviewUrl] = createSignal<string>()
  const [scanning, setScanning] = createSignal(false)
  const [notice, setNotice] = createSignal<string>()
  const [stage, setStage] = createSignal<"folder" | "model">("folder")

  onCleanup(() => {
    const url = previewUrl()
    if (url) URL.revokeObjectURL(url)
  })

  const pickFolder = async (list: FileList | null) => {
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
    setStage("model")
  }

  const beginScan = async (path: string, picked: File[]) => {
    setModelPath(path)
    setScanning(true)
    try {
      const scan = await scanLive2dModel(path, fileSetFromFiles(picked))
      setResult(scan)
      setMappings(suggestMappings(scan.capabilities))
      setName(defaultName(path))
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setScanning(false)
    }
  }

  const oversizedFiles = createMemo(() => files().filter((file) => file.size > MAX_ASSET_BYTES))

  const save = () => {
    const scan = result()
    if (!scan) return
    const characterName = name().trim() || defaultName(modelPath() ?? "")
    registry.register({
      name: characterName,
      avatar: {
        ...createEmptyAvatar(modelPath() ?? ""),
        states: mappings().states,
        gestures: mappings().gestures,
        emotions: mappings().emotions,
      },
      capabilities: scan.capabilities,
    })
    props.onDone()
  }

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h3 class="text-14-medium">{language.t("wife.import.title")}</h3>
        <ButtonV2 size="small" variant="ghost-muted" onClick={props.onCancel}>
          {language.t("common.close")}
        </ButtonV2>
      </div>

      <Show when={stage() === "folder"}>
        <div class="flex flex-col gap-3">
          <span class="text-12-regular text-text-weak">{language.t("wife.import.step.folder.description")}</span>
          <input
            type="file"
            class="hidden"
            onChange={(event) => void pickFolder(event.currentTarget.files)}
            {...({ webkitdirectory: "", directory: "" } as unknown as JSX.InputHTMLAttributes<HTMLInputElement>)}
          />
          <ButtonV2
            size="normal"
            variant="neutral"
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][webkitdirectory]')?.click()}
          >
            {language.t("wife.import.chooseFolder")}
          </ButtonV2>
          <Show when={notice()}>
            <span class="text-12-regular" style={{ color: "var(--text-on-critical-base)" }}>
              {notice()}
            </span>
          </Show>
        </div>
      </Show>

      <Show when={stage() === "model"}>
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
      </Show>

      <Show when={result() && !scanning()}>
        <div class="flex gap-4">
          <Show when={previewUrl()}>
            <img src={previewUrl()} alt={name()} class="h-32 w-32 object-contain border border-line rounded-lg" />
          </Show>
          <div class="flex flex-col gap-3">
            <span class="text-12-medium">{language.t("wife.import.step.scan.title")}</span>
            <CapabilitySummary capabilities={result()!.capabilities} />
          </div>
        </div>

        <Show when={oversizedFiles().length > 0}>
          <span class="text-12-regular" style={{ color: "var(--text-on-critical-weak)" }}>
            {language.t("wife.import.oversized")} ({oversizedFiles().length})
          </span>
        </Show>

        <Show when={result()!.issues.length > 0}>
          <div class="flex flex-col gap-1">
            <span class="text-12-medium">{language.t("wife.scan.issues")}</span>
            {result()!.issues.map((issue) => (
              <span
                class="text-11-regular"
                style={{
                  color: issue.severity === "error" ? "var(--text-on-critical-base)" : "var(--text-on-critical-weak)",
                }}
              >
                [{issue.code}] {issue.path ? `${issue.path}: ` : ""}
                {issue.message}
              </span>
            ))}
          </div>
        </Show>

        <div class="flex flex-col gap-2">
          <span class="text-12-medium">{language.t("wife.import.step.mapping.title")}</span>
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
          <SemanticMappingEditor capabilities={result()!.capabilities} mappings={mappings()} onChange={setMappings} />
        </div>

        <div class="flex justify-end gap-2">
          <ButtonV2 size="normal" variant="ghost-muted" onClick={() => setStage("folder")}>
            {language.t("wife.import.back")}
          </ButtonV2>
          <ButtonV2 size="normal" variant="contrast" disabled={scanHasErrors(result()!.issues)} onClick={save}>
            {language.t("common.save")}
          </ButtonV2>
        </div>
      </Show>
    </div>
  )
}
