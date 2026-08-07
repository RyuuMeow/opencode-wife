# Data Model

## Configuration layers

```text
Machine configuration
├── TTS engines and local executable paths
└── asset storage locations

Global user configuration
├── registered characters
├── default character
└── default behavior preferences

Project binding
├── character reference
├── persona overrides
└── speech overrides

Session/window runtime
├── temporary character override
├── current state and emotion
└── speech queue/playback state
```

## Character definition

```ts
type CharacterDefinition = {
  schemaVersion: 1
  id: string
  name: string
  version: string
  avatar?: AvatarProfile        // optional: a character can exist without a Live2D model yet
  avatarImage?: string          // square profile picture as a downscaled data URL
  voicePresetId?: string
  personaPresetId?: string
  behavior?: CharacterBehaviorDefaults
}
```

> Implementation note: the model folder path for a character is machine-local state and lives outside `CharacterDefinition` — the registry keeps `modelFolders: Record<characterId, string>` (absolute path, used by the desktop `wife://` protocol to serve model files to the runtime).

## Avatar profile

```ts
type AvatarProfile = {
  type: "live2d-cubism"
  modelAssetId: string
  display: {
    scale: number
    anchorX: number
    anchorY: number
    offsetX: number
    offsetY: number
  }
  lipSync: LipSyncProfile
  states: Partial<Record<CharacterState, StateBinding>>
  gestures: Record<string, GestureBinding>
  emotions: Record<string, EmotionBinding>
}
```

## Motion references

```ts
type MotionRef = {
  group: string
  index: number
  weight?: number
}

type StateBinding = {
  motions?: MotionRef[]
  selection?: "first" | "random" | "weighted"
  loop?: boolean
  emotion?: string
  fallback?: CharacterState
}

type GestureBinding = {
  motions?: MotionRef[]
  selection?: "first" | "random" | "weighted"
  priority?: number
  interruptible?: boolean
  fallback?: string[]
}

type EmotionBinding = {
  expression?: string
  fadeInMs?: number
  fadeOutMs?: number
  fallback?: string
}
```

## Lip sync profile

```ts
type LipSyncProfile = {
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
```

## TTS engine configuration

Machine-local and never committed to a project:

```ts
type TTSEngineDefinition = {
  id: string
  type: "gpt-sovits" | string
  mode: "managed-process" | "external-endpoint"
  endpoint?: string
  process?: {
    executable: string
    args: string[]
    workingDirectory?: string
  }
  startup: {
    autoStart: boolean
    warmup: boolean
    timeoutMs: number
  }
}
```

## Voice preset

```ts
type VoicePreset = {
  schemaVersion: 1
  id: string
  engineId: string
  modelAssets: {
    gpt: string
    sovits: string
  }
  references: Record<string, VoiceReference>
  defaults: {
    reference: string
    textLanguage: string
    speedFactor: number
    streaming: boolean
  }
}

type VoiceReference = {
  audioAssetId: string
  transcript: string
  language: string
  tags?: string[]
}
```

## Project binding

```ts
type ProjectCharacterBinding = {
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
```

## Speech policy

```ts
type SpeechPolicy = {
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
```

## Activity snapshot

```ts
type ActivitySnapshot = {
  projectKey: string
  sessionId: string
  status: "idle" | "thinking" | "working" | "waiting_user" | "completed" | "failed"
  phase?: "planning" | "researching" | "editing" | "verifying"
  task?: string
  startedAt?: number
  updatedAt: number
  recentActions: string[]
  changedFiles: string[]
  pendingPermission?: string
  pendingQuestion?: string
  completionSummary?: string
  errorSummary?: string
}
```

## Persona request and output

```ts
type PersonaRequest = {
  trigger: PersonaTrigger
  activity: ActivitySnapshot
  project: {
    name?: string
    userAddress?: string
  }
  recentSpeech: string[]
  allowedGestures: string[]
  allowedEmotions: string[]
  policy: SpeechPolicy
}

type PresentationIntent = {
  speak: boolean
  text?: string
  state?: CharacterState
  gesture?: string
  emotion?: string
  priority: PresentationPriority
  interruptible: boolean
  expiresAt?: number
}
```

## Runtime state

```ts
type CharacterRuntimeState = {
  windowId: string
  projectKey?: string
  sessionId?: string
  characterId?: string
  state: CharacterState
  emotion: string
  currentMotion?: string
  speech: {
    activeJobId?: string
    queueLength: number
    speaking: boolean
  }
  timestamps: {
    lastSpeechAt?: number
    lastInteractionAt?: number
  }
}
```

## Persistence guidance

Persist:

- character definitions and asset IDs
- capability caches
- TTS engine definitions
- voice presets
- project bindings
- user defaults

Do not persist as authoritative state:

- current motion frame
- mouth-open value
- active audio chunk
- transient speech queue
- current session status copied from OpenCode

Runtime state should be reconstructable from OpenCode state and persisted configuration.
