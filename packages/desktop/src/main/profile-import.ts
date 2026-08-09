import { copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"

const MANIFEST = "wife-profile-import.json"
const VERSION = 1
const SAFE_DEFAULT_KEYS = new Set(["app-version.v1", "settings.v3", "highlights.v1"])
const SAFE_SETTINGS_KEYS = new Set(["oldLayoutEligible", "tauriMigrated", "firstLaunchOnboardingComplete"])

type JsonObject = Record<string, unknown>

export type ProfileImportResult = {
  source: string
  version: number
  imported: string[]
  skipped: string[]
  completedAt: string
}

export async function importOpenCodePreferences(input: {
  source: string
  target: string
  force?: boolean
}) {
  await mkdir(input.target, { recursive: true })
  const manifest = await readJson(join(input.target, MANIFEST))
  const key = `${input.source}:${VERSION}`
  if (!input.force && isRecord(manifest?.imports) && manifest.imports[key]) {
    return manifest.imports[key] as ProfileImportResult
  }

  const imported: string[] = []
  const skipped: string[] = []
  await mergeStore(input.source, input.target, "default.dat", (source, target) => {
    return Object.fromEntries(
      Object.entries(source)
        .filter(([name]) => SAFE_DEFAULT_KEYS.has(name) || (hasWifeMarker(source) && name === "wife.registry.v1"))
        .map(([name, value]) => [
          name,
          name === "settings.v3" ? mergeSerializedSettings(value, target[name], input.force === true) : target[name] ?? value,
        ]),
    )
  }, imported, skipped)
  await mergeStore(
    input.source,
    input.target,
    "opencode.global.dat",
    (source, target) => (input.force ? { ...target, ...source } : { ...source, ...target }),
    imported,
    skipped,
  )
  await mergeStore(
    input.source,
    input.target,
    "opencode.settings",
    (source, target) =>
      input.force
        ? { ...target, ...Object.fromEntries(Object.entries(source).filter(([name]) => SAFE_SETTINGS_KEYS.has(name))) }
        : { ...Object.fromEntries(Object.entries(source).filter(([name]) => SAFE_SETTINGS_KEYS.has(name))), ...target },
    imported,
    skipped,
  )

  if (hasWifeMarker(await readJson(join(input.source, "default.dat")))) {
    await mergeStore(input.source, input.target, "wife", (source, target) => ({ ...source, ...target }), imported, skipped)
  }

  const workspaceFiles = await globStoreFiles(input.source, /^opencode\.workspace\..+\.dat$/)
  await Promise.all(
    workspaceFiles.map((name) =>
      mergeStore(
        input.source,
        input.target,
        name,
        (source, target) => (input.force ? { ...target, ...source } : { ...source, ...target }),
        imported,
        skipped,
      ),
    ),
  )

  const draftSource = join(input.source, "drafts.sqlite")
  const draftTarget = join(input.target, "drafts.sqlite")
  if ((await exists(draftSource)) && !(await exists(draftTarget))) {
    await copyFile(draftSource, draftTarget)
    imported.push("drafts.sqlite")
  } else {
    skipped.push("drafts.sqlite")
  }

  const result: ProfileImportResult = {
    source: input.source,
    version: VERSION,
    imported: [...new Set(imported)].sort(),
    skipped: [...new Set(skipped)].sort(),
    completedAt: new Date().toISOString(),
  }
  await writeJson(join(input.target, MANIFEST), {
    version: VERSION,
    imports: { ...(isRecord(manifest?.imports) ? manifest.imports : {}), [key]: result },
  })
  return result
}

async function mergeStore(
  sourceRoot: string,
  targetRoot: string,
  name: string,
  merge: (source: JsonObject, target: JsonObject) => JsonObject,
  imported: string[],
  skipped: string[],
) {
  const source = await readJson(join(sourceRoot, name))
  if (!source) return skipped.push(name)
  const target = (await readJson(join(targetRoot, name))) ?? {}
  const next = merge(source, target)
  if (JSON.stringify(next) === JSON.stringify(target)) return skipped.push(name)
  await writeJson(join(targetRoot, name), next)
  imported.push(name)
}

function mergeSerializedSettings(source: unknown, target: unknown, preferSource: boolean) {
  const sourceValue = parseSerializedObject(source)
  const targetValue = parseSerializedObject(target)
  return JSON.stringify(mergeSettings(sourceValue, targetValue, preferSource))
}

function mergeSettings(source: JsonObject, target: JsonObject, preferSource: boolean): JsonObject {
  return Object.fromEntries(
    [...new Set([...Object.keys(source), ...Object.keys(target)])].map((name) => {
      const sourceValue = source[name]
      const targetValue = target[name]
      if (name.toLowerCase().startsWith("wife") && targetValue !== undefined) return [name, targetValue]
      if (isRecord(sourceValue) && isRecord(targetValue)) {
        return [name, mergeSettings(sourceValue, targetValue, preferSource)]
      }
      return [name, preferSource ? sourceValue ?? targetValue : targetValue ?? sourceValue]
    }),
  )
}

function parseSerializedObject(value: unknown) {
  if (typeof value !== "string") return {}
  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function hasWifeMarker(value: JsonObject | undefined) {
  return Boolean(value?.["wife.registry.v1"])
}

async function globStoreFiles(root: string, pattern: RegExp) {
  const { readdir } = await import("node:fs/promises")
  return readdir(root, { withFileTypes: true }).then(
    (entries) => entries.filter((entry) => entry.isFile() && pattern.test(entry.name)).map((entry) => basename(entry.name)),
    () => [],
  )
}

async function readJson(path: string): Promise<JsonObject | undefined> {
  return readFile(path, "utf8").then(
    (value) => {
      const parsed = JSON.parse(value)
      return isRecord(parsed) ? parsed : undefined
    },
    () => undefined,
  )
}

async function writeJson(path: string, value: JsonObject) {
  const temporary = `${path}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  await rename(temporary, path)
}

async function exists(path: string) {
  return stat(path).then(
    () => true,
    () => false,
  )
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
