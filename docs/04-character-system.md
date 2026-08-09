# Character System

> Status: **Implemented** — registration, scanning, and mapping are delivered; `custom.*` gestures/emotions UI is pending


## Design principle

A Live2D model does not inherently understand application concepts such as `working` or `waiting_user`. The system therefore separates semantic intent from model-specific assets.

```text
OpenCode activity
→ semantic state / gesture / emotion
→ character profile mapping
→ motion / expression / parameter operations
```

## Stable semantic vocabulary

### Core state

Long-lived base behavior:

```ts
type CharacterState =
  | "idle"
  | "listening"
  | "thinking"
  | "working"
  | "waiting_user"
  | "speaking"
  | "success"
  | "error"
```

Core state names are application contracts and are not replaced by user-defined names.

### Gesture

Short one-shot behavior:

```ts
type CharacterGesture =
  | "thinking"
  | "nod"
  | "shake_head"
  | "wave"
  | "look_at_user"
  | "celebrate"
  | `custom.${string}`
```

### Emotion

Expression-level intent:

```ts
type CharacterEmotion =
  | "neutral"
  | "focused"
  | "happy"
  | "concerned"
  | "confused"
  | "annoyed"
  | "embarrassed"
  | `custom.${string}`
```

## User customization boundary

Users may configure:

- which motions represent each state or gesture
- random selection weights
- expression mapping
- fallback order
- motion priority and interruptibility
- optional custom gestures/emotions
- lip-sync parameters and tuning

Users do not redefine the meaning of system states, because the event pipeline depends on stable semantics.

> Implementation status: `custom.*` gestures/emotions are accepted by the type system but the mapping editor currently renders only the fixed lists; adding custom entries is not yet implemented (see 12-handoff.md).

## Capability scanning

When importing a model, scan `.model3.json` and referenced files to build:

```ts
type CharacterCapabilities = {
  motionGroups: Record<string, { index: number; file?: string }[]>
  expressions: { id: string; file?: string }[]
  parameters: { id: string; min?: number; max?: number; default?: number }[]
  lipSyncParameterIds: string[]
  eyeBlinkParameterIds: string[]
  supportsGaze: boolean
  supportsAngle: boolean
  supportsMouthForm: boolean
}
```

Cache the scan result, but regenerate it when assets change.

Implementation notes (delivered):

- References are resolved relative to the `.model3.json` directory (`..` segments are collapsed; absolute paths and URLs are rejected). Any ancestor folder can be picked.
- When the model declares no expressions/motions (VTube Studio packs), the top level of the model folder is scanned for loose `*.exp3.json` / `*.motion3.json` files; each loose motion becomes its own group named after the file.
- Missing physics/pose/display-info/user-data assets produce warnings; missing moc/textures/motions/expressions block the attach.
- Semantic mapping suggestions match both English and common CJK motion/expression names (e.g. 待机动画 → state.idle).

## Motion model

MVP composition:

```text
one base state motion
+ zero or one one-shot gesture
+ one expression
+ procedural blink/breath/gaze/lip-sync
```

Do not allow arbitrary simultaneous motion stacking in the first release because motions may write the same parameters and produce unpredictable results.

## Priority

```ts
enum MotionPriority {
  Idle = 10,
  State = 20,
  Gesture = 30,
  Speech = 40,
  UserInteraction = 50,
  Critical = 100,
}
```

Examples:

- idle loops yield to any state
- a nod may interrupt a working loop
- a permission prompt may interrupt normal speech
- critical presentation is not interrupted by ambient activity

## Fallback resolution

Example for `gesture.thinking`:

```text
gesture.thinking motion
→ state.thinking motion
→ emotion.focused expression
→ procedural look_down
→ state.idle
```

Missing capability is a normal condition, not an error.

## Character package

```text
characters/luna/
├── character.json
├── avatar/
│   ├── luna.model3.json
│   ├── luna.moc3
│   ├── textures/
│   ├── motions/
│   └── expressions/
├── voice/
│   ├── voice.json
│   └── references/
└── persona/
    └── default.json
```

The application may internally store assets elsewhere, but a portable character package should preserve relative paths.

## Security and validation

Registration must reject or warn about:

- missing referenced files
- path traversal outside the package root
- duplicate character IDs
- unsupported schema version
- oversized or malformed assets
- missing voice transcript for a reference audio file
- absolute paths in portable package manifests

Character packages are data, not executable plugins. Do not execute arbitrary scripts from imported packages.
