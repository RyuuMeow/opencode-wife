export type CharacterState =
  | "idle"
  | "listening"
  | "thinking"
  | "working"
  | "waiting_user"
  | "speaking"
  | "success"
  | "error"

export type CharacterGesture =
  | "thinking"
  | "nod"
  | "shake_head"
  | "wave"
  | "look_at_user"
  | "celebrate"
  | `custom.${string}`

export type CharacterEmotion =
  | "neutral"
  | "focused"
  | "happy"
  | "concerned"
  | "confused"
  | "annoyed"
  | "embarrassed"
  | `custom.${string}`

export const characterStates = [
  "idle",
  "listening",
  "thinking",
  "working",
  "waiting_user",
  "speaking",
  "success",
  "error",
] as const satisfies readonly CharacterState[]

export const characterGestures = [
  "thinking",
  "nod",
  "shake_head",
  "wave",
  "look_at_user",
  "celebrate",
] as const satisfies readonly CharacterGesture[]

export const characterEmotions = [
  "neutral",
  "focused",
  "happy",
  "concerned",
  "confused",
  "annoyed",
  "embarrassed",
] as const satisfies readonly CharacterEmotion[]

export function isCharacterState(value: string): value is CharacterState {
  return (characterStates as readonly string[]).includes(value)
}

export function isCharacterEmotion(value: string): value is CharacterEmotion {
  return value.startsWith("custom.") || (characterEmotions as readonly string[]).includes(value)
}

export function isCharacterGesture(value: string): value is CharacterGesture {
  return value.startsWith("custom.") || (characterGestures as readonly string[]).includes(value)
}

export type MotionRef = {
  group: string
  index: number
  weight?: number
}

export type StateBinding = {
  motions?: MotionRef[]
  selection?: "first" | "random" | "weighted"
  loop?: boolean
  emotion?: string
  fallback?: CharacterState
}

export type GestureBinding = {
  motions?: MotionRef[]
  selection?: "first" | "random" | "weighted"
  priority?: number
  interruptible?: boolean
  fallback?: string[]
}

export type EmotionBinding = {
  expression?: string
  fadeInMs?: number
  fadeOutMs?: number
  fallback?: string
}

export type LipSyncProfile = {
  enabled: boolean
  mode: "volume" | "viseme"
  parameterIds: "auto" | string[]
  mouthFormParameterId?: string
  gain: number
  gate: number
  curve: number
  attackMs: number
  releaseMs: number
  weight: number
  delayMs: number
  blendMode: "add" | "overwrite"
}

export type AvatarDisplay = {
  scale: number
  anchorX: number
  anchorY: number
  offsetX: number
  offsetY: number
}

export type AvatarProfile = {
  type: "live2d-cubism"
  modelAssetId: string
  display: AvatarDisplay
  lipSync: LipSyncProfile
  states: Partial<Record<CharacterState, StateBinding>>
  gestures: Record<string, GestureBinding>
  emotions: Record<string, EmotionBinding>
}

export type SpeechPolicy = {
  enabled: boolean
  progressUpdates: "off" | "important-only" | "normal" | "active"
  speakPermissions: boolean
  speakQuestions: boolean
  speakCompletion: boolean
  speakErrors: boolean
  minimumIntervalMs: number
  maximumCharacters: number
  allowTechnicalTerms: boolean
}

export type CharacterBehaviorDefaults = {
  userAddress?: string
  speech?: Partial<SpeechPolicy>
}

export type CharacterDefinition = {
  schemaVersion: 1
  id: string
  name: string
  version: string
  avatar: AvatarProfile
  voicePresetId?: string
  personaPresetId?: string
  behavior?: CharacterBehaviorDefaults
}

export type CharacterCapabilities = {
  motionGroups: Record<string, { index: number; file?: string }[]>
  expressions: { id: string; file?: string }[]
  parameters: { id: string; min?: number; max?: number; default?: number }[]
  lipSyncParameterIds: string[]
  eyeBlinkParameterIds: string[]
  supportsGaze: boolean
  supportsAngle: boolean
  supportsMouthForm: boolean
}

export type ProjectCharacterBinding = {
  schemaVersion: 1
  projectKey: string
  enabled: boolean
  characterId?: string
  persona?: {
    projectName?: string
    userAddress?: string
    relationshipPreset?: string
    additionalContext?: string
  }
  speech?: Partial<SpeechPolicy>
  backgroundSessions?: {
    allowProgressSpeech: boolean
    notifyCompletion: boolean
    allowCriticalInterrupt: boolean
  }
}

export function createLipSyncProfile(overrides: Partial<LipSyncProfile> = {}): LipSyncProfile {
  return {
    enabled: true,
    mode: "volume",
    parameterIds: "auto",
    gain: 4,
    gate: 0.015,
    curve: 0.65,
    attackMs: 35,
    releaseMs: 90,
    weight: 0.8,
    delayMs: 0,
    blendMode: "add",
    ...overrides,
  }
}

export function createEmptyAvatar(modelAssetId: string): AvatarProfile {
  return {
    type: "live2d-cubism",
    modelAssetId,
    display: { scale: 1, anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0 },
    lipSync: createLipSyncProfile(),
    states: {},
    gestures: {},
    emotions: {},
  }
}
