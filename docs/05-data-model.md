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

type CharacterBehaviorDefaults = {
  userAddress?: string
  personaInstructions?: string // maximum 2,000 characters in the settings UI
  // existing speech/template fields omitted
}
```

`userAddress` and `personaInstructions` are global character settings. They affect the next Side Chat reply without replacing the session, and are encoded as profile data that cannot override permissions, safety, language following, or the reply contract. `personaPresetId` remains reserved; there is no preset manager yet.

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

## Side Chat sessions and context

```ts
type WifeAssistantSessionLink = {
  ownerSessionId: string
  wifeSessionId: string
  kind: "assistant"
  permission: "deny-all + read/glob/grep"
}

type WifeHandoffSession = {
  ownerSessionId: string
  kind: "handoff"
  permission: "deny-all"
  archived: true
  temporary: true
}

type WifeChoiceSession = {
  ownerSessionId: string
  kind: "choice"
  permission: "deny-all"
  archived: true
  temporary: true
}
```

Each main Agent session owns one persistent archived assistant session. A normal Wife turn receives a non-persisted, at-most-12,000-character snapshot of the current owner session: title/status, visible user/assistant text, bounded tool status/title/error, and patch filenames. Reasoning, synthetic/ignored text, tool input/output, attachments, and other sessions are excluded.

Reply choices are generated after the main response by a separately configured global model in a temporary archived, deny-all session. The latest successful 2–3 choices are cached against the source assistant message ID for recovery; stale cache entries and orphaned temporary sessions are removed. `/send` uses a separate archived handoff session with no tools, writes only an editable plain-text task into the scoped main composer, and is deleted after completion. `/clear` permanently deletes the assistant session, pointer, and choice cache; persona, model/variant, character choice, model compatibility, and Live2D view state are separate persisted settings.

## Persistence guidance

Persist:

- character definitions and asset IDs
- capability caches
- TTS engine definitions
- voice presets
- project bindings
- user defaults
- per-main-session Wife assistant pointers and panel character/model preferences

Do not persist as authoritative state:

- current motion frame
- mouth-open value
- active audio chunk
- transient speech queue
- current session status copied from OpenCode

Runtime state should be reconstructable from OpenCode state and persisted configuration.
