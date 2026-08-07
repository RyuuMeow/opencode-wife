# Live2D and TTS Runtime

## Runtime selection (decided — Phase A)

The Live2D renderer uses **pixi.js 7 + `pixi-live2d-display-lipsyncpatch`** (MIT, maintained fork). Its API aligns directly with the semantic model:

- `model.motion(group, index, priority)` maps 1:1 to `MotionRef { group, index }` plus the `MotionPriority` ladder from the character system.
- `model.expression(name)` maps to `EmotionBinding.expression`.
- Automatic blink/gaze and physics are built in; `model.speak()` covers Milestone 2 audio-driven lip sync.

### Cubism core provisioning

The proprietary `live2dcubismcore.min.js` cannot be committed to the repository. It is downloaded once at build time by `script/fetch-cubism-core.ts` into `packages/app/public/vendor/` (gitignored) and bundled with the app, so end users do not download anything extra. If the download fails, the file can be placed manually at that path.

### Model asset access (decided — Phase A)

The sandboxed renderer cannot read arbitrary files and blob URLs cannot resolve the model's relative references. Instead:

- Desktop picks the model folder through a native directory dialog (`pick-model-folder` IPC); the absolute path is stored machine-locally in the registry (`modelFolders`).
- Electron Main registers a `wife://` custom protocol: `wife://<characterId>/<relativePath>` reads files from the whitelisted registered folder and returns them, so `Live2DModel.from("wife://<id>/<model3path>")` resolves relative references naturally.
- Web build shows an empty state for the runtime panel (desktop-first for the renderer).

## Runtime responsibilities

The presentation runtime turns a semantic `PresentationIntent` into:

- base state motion
- optional gesture motion
- expression
- generated speech
- audio playback
- synchronized mouth movement

## Action resolution

```text
intent.state = working
intent.gesture = nod
intent.emotion = focused
        ↓
character profile
        ↓
base motion: Work/0
one-shot motion: Agree/0
expression: Serious
```

The persona model never selects `.motion3.json` filenames.

## Live2D update layers

MVP layering:

1. apply base state motion
2. apply one-shot gesture according to priority
3. apply expression
4. update blink, breathing, gaze and physics
5. apply lip-sync value
6. call model update/render

When motions conflict, gesture priority wins temporarily and the runtime returns to the base state after completion.

## GPT-SoVITS runtime

Recommended deployment:

```text
Electron Main
├── starts or connects to GPT-SoVITS
├── health checks and warm-up
├── selects voice model/reference
├── requests streaming PCM
└── sends stream metadata/chunks to renderer

Renderer
├── buffers and plays PCM
├── calculates playback-side audio energy
└── updates Live2D lip sync
```

External process and filesystem access stay in Electron Main. The sandboxed renderer receives a narrow IPC API.

## Speech job

```ts
type SpeechJob = {
  id: string
  windowId: string
  projectKey: string
  sessionId?: string
  characterId: string
  text: string
  voicePresetId: string
  referenceId?: string
  priority: PresentationPriority
  interruptible: boolean
  createdAt: number
  expiresAt?: number
}
```

## Queue policy

- critical/permission may interrupt progress speech
- a noninterruptible permission prompt is not replaced by ambient speech
- stale progress jobs are dropped
- duplicate text is merged or rejected
- switching active projects may cancel low-priority speech
- completion speech from a background project defaults to notification-only

## Lip sync

### Source of truth

Mouth movement is derived from the audio being played, not from text or persona output.

```text
PCM audio
→ playback buffer
→ RMS/energy analysis
→ gate and gain
→ nonlinear curve
→ attack/release smoothing
→ Live2D LipSync parameters
```

### Default algorithm

```ts
function normalizeMouth(rms: number, profile: LipSyncProfile) {
  if (rms < profile.gate) return 0
  const value = Math.min(1, (rms - profile.gate) * profile.gain)
  return Math.pow(value, profile.curve)
}
```

Apply asymmetric smoothing:

- attack: 20–45 ms
- release: 70–130 ms

Suggested defaults:

```json
{
  "gain": 4,
  "gate": 0.015,
  "curve": 0.65,
  "attackMs": 35,
  "releaseMs": 90,
  "weight": 0.8
}
```

### Parameter discovery

Use the model's LipSync group when available. Do not assume a single hardcoded parameter. If discovery fails, let the user select parameters manually.

Common fallback:

```text
ParamMouthOpenY
```

Optional advanced support:

```text
ParamMouthForm
```

### Playback-side analysis

The same audio samples should be analyzed at the renderer playback endpoint. Separate precomputed mouth-value IPC streams risk drift caused by buffering.

## Audio stream contract

```ts
type PCMStreamInfo = {
  sampleRate: number
  channels: 1 | 2
  format: "pcm_s16le" | "pcm_f32le"
}
```

Use an AudioWorklet or equivalent low-latency playback processor. It should emit a compact current-energy value to the render loop rather than copying large sample arrays every frame.

## Speech ending

On stream end:

- set target mouth value to zero
- allow release smoothing to close the mouth
- return expression/state according to current activity
- complete the speech job only after buffered audio finishes

## Reference audio selection

MVP: one reliable default reference per voice.

Later:

```text
emotion.happy     → happy reference
emotion.concerned → concerned reference
otherwise         → default reference
```

Reference switching must be tested for timbre consistency before enabling it by default.

## Runtime fallbacks

| Failure | Behavior |
|---|---|
| TTS startup fails | disable speech and show diagnostic |
| synthesis fails | show speech bubble or template notification |
| audio underrun | pause mouth movement with playback |
| missing motion | resolve fallback state/expression |
| invalid lip-sync parameter | disable lip sync for that character |
| renderer crash | recreate renderer without affecting OpenCode session |
