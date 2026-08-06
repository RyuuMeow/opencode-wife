import type { CharacterCapabilities } from "../schema/character"

export type ScanSeverity = "error" | "warning"

export type ScanIssue = {
  severity: ScanSeverity
  code: string
  message: string
  path?: string
}

export type Live2dFileSet = {
  has(path: string): boolean | Promise<boolean>
  readText(path: string): Promise<string | undefined>
}

export type Live2dScanResult = {
  capabilities: CharacterCapabilities
  issues: ScanIssue[]
}

export type Model3MotionEntry = {
  File?: string
  Sound?: string
  FadeInTime?: number
  FadeOutTime?: number
}

export type Model3ExpressionEntry = {
  Name?: string
  File?: string
}

export type Model3Group = {
  Target?: string
  Name?: string
  Ids?: string[]
}

export type Model3Parameter = {
  Id?: string
  Min?: number
  Max?: number
  Default?: number
}

export type Model3Json = {
  Version?: number
  FileReferences?: {
    Moc?: string
    Textures?: string[]
    Physics?: string
    Pose?: string
    DisplayInfo?: string
    Expressions?: Model3ExpressionEntry[]
    Motions?: Record<string, Model3MotionEntry[]>
    UserData?: string
  }
  Groups?: Model3Group[]
  Parameters?: Model3Parameter[]
}

export function scanHasErrors(issues: ScanIssue[]) {
  return issues.some((issue) => issue.severity === "error")
}

export function normalizeModelPath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "")
}

export function isPathSafe(path: string) {
  const normalized = normalizeModelPath(path)
  if (/^[a-zA-Z]:\//.test(normalized) || normalized.includes("://")) return false
  return true
}

export function resolveModelPath(modelDir: string, reference: string) {
  const segments = [
    ...normalizeModelPath(modelDir).split("/").filter(Boolean),
    ...normalizeModelPath(reference).split("/").filter(Boolean),
  ]
  const resolved: string[] = []
  for (const segment of segments) {
    if (segment === ".") continue
    if (segment === "..") {
      resolved.pop()
      continue
    }
    resolved.push(segment)
  }
  return resolved.join("/")
}

export function parseModel3(raw: unknown, model3Path: string): { model: Model3Json; issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      model: {},
      issues: [
        { severity: "error", code: "invalid-model3", path: model3Path, message: "Invalid .model3.json content" },
      ],
    }
  }
  const model = raw as Model3Json
  if (model.Version !== 3) {
    issues.push({
      severity: "error",
      code: "unsupported-version",
      path: model3Path,
      message: `Unsupported .model3.json version: ${String(model.Version)}`,
    })
  }
  const references = model.FileReferences
  if (!references?.Moc) {
    issues.push({ severity: "error", code: "missing-moc", path: model3Path, message: "No Moc reference found" })
  }
  return { model, issues }
}

export function extractCapabilities(model: Model3Json): CharacterCapabilities {
  const motionGroups: CharacterCapabilities["motionGroups"] = {}
  for (const [group, entries] of Object.entries(model.FileReferences?.Motions ?? {})) {
    motionGroups[group] = (entries ?? []).map((entry, index) => ({ index, file: entry.File }))
  }

  const expressions = (model.FileReferences?.Expressions ?? []).map((entry) => ({
    id: entry.Name ?? entry.File ?? "",
    file: entry.File,
  }))

  const parameters = (model.Parameters ?? []).flatMap((parameter) => {
    if (!parameter.Id) return []
    return [
      {
        id: parameter.Id,
        min: parameter.Min,
        max: parameter.Max,
        default: parameter.Default,
      },
    ]
  })

  const groupIds = (name: string) =>
    (model.Groups ?? [])
      .filter((group) => group.Target === "Parameter" && group.Name === name)
      .flatMap((group) => group.Ids ?? [])

  const parameterIds = new Set(parameters.map((parameter) => parameter.id))
  const supportsGaze = [...parameterIds].some((id) => id.includes("EyeBall"))
  const supportsAngle = [...parameterIds].some((id) => id.includes("Angle"))

  return {
    motionGroups,
    expressions,
    parameters,
    lipSyncParameterIds: groupIds("LipSync"),
    eyeBlinkParameterIds: groupIds("EyeBlink"),
    supportsGaze,
    supportsAngle,
    supportsMouthForm: parameterIds.has("ParamMouthForm"),
  }
}

export async function scanLive2dModel(model3Path: string, files: Live2dFileSet): Promise<Live2dScanResult> {
  const issues: ScanIssue[] = []
  if (!isPathSafe(model3Path)) {
    issues.push({ severity: "error", code: "unsafe-path", path: model3Path, message: "Unsafe model path" })
  }

  const content = await files.readText(model3Path)
  if (content === undefined) {
    return {
      capabilities: emptyCapabilities(),
      issues: [
        ...issues,
        {
          severity: "error",
          code: "missing-model3",
          path: model3Path,
          message: "Selected .model3.json file could not be read",
        },
      ],
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return {
      capabilities: emptyCapabilities(),
      issues: [
        ...issues,
        { severity: "error", code: "malformed-json", path: model3Path, message: "Malformed .model3.json" },
      ],
    }
  }

  const { model, issues: parseIssues } = parseModel3(parsed, model3Path)
  issues.push(...parseIssues)

  const references = model.FileReferences ?? {}
  const modelDir = model3Path.includes("/") ? model3Path.slice(0, model3Path.lastIndexOf("/")) : ""
  const optionalReferences = [references.Physics, references.Pose, references.DisplayInfo, references.UserData]
  const referenced = [
    ...([references.Moc] as const).map((path) => ({ path, severity: "error" as const })),
    ...(references.Textures ?? []).map((path) => ({ path, severity: "error" as const })),
    ...(references.Expressions ?? []).flatMap((entry) =>
      entry.File ? [{ path: entry.File, severity: "error" as const }] : [],
    ),
    ...Object.values(references.Motions ?? {}).flatMap((entries) =>
      entries.flatMap((entry) => (entry.File ? [{ path: entry.File, severity: "error" as const }] : [])),
    ),
    ...optionalReferences.map((path) => ({ path, severity: "warning" as const })),
  ].filter(
    (entry): entry is { path: string; severity: "error" | "warning" } =>
      typeof entry.path === "string" && entry.path.length > 0,
  )

  for (const entry of referenced) {
    if (!isPathSafe(entry.path)) {
      issues.push({ severity: "error", code: "unsafe-path", path: entry.path, message: "Referenced path is invalid" })
      continue
    }
    const resolved = resolveModelPath(modelDir, entry.path)
    if (!(await files.has(resolved))) {
      issues.push({
        severity: entry.severity,
        code: "missing-asset",
        path: resolved,
        message: "Referenced file is missing",
      })
    }
  }

  return { capabilities: extractCapabilities(model), issues }
}

export function findModel3Files(paths: string[]) {
  return paths.filter((path) => path.endsWith(".model3.json") || path.endsWith(".model3")).sort()
}

export function emptyCapabilities(): CharacterCapabilities {
  return {
    motionGroups: {},
    expressions: [],
    parameters: [],
    lipSyncParameterIds: [],
    eyeBlinkParameterIds: [],
    supportsGaze: false,
    supportsAngle: false,
    supportsMouthForm: false,
  }
}
