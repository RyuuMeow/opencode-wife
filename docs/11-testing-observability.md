# Testing and Observability

## Test layers

### Unit tests

Prioritize deterministic logic:

- configuration schema and migration
- project/character resolution precedence
- trigger cooldown and deduplication
- priority arbitration
- action fallback resolution
- speech queue interruption
- lip-sync normalization and smoothing

### Fixture tests

Maintain test character fixtures with:

- full capabilities
- missing expressions
- no LipSync group
- custom parameter IDs
- broken referenced file
- duplicate motion names

Do not require copyrighted production assets in the test suite.

### Integration tests

- OpenCode event → normalized activity event
- activity snapshot → trigger decision
- persona output validation
- project tab switch → character resolution
- speech job → TTS stream → playback completion
- renderer restart → runtime recovery

### End-to-end scenarios

1. Start task, perform routine tools, complete.
2. Permission is requested during active speech.
3. Persona request times out.
4. GPT-SoVITS crashes during playback.
5. Switch rapidly between projects using different characters.
6. Background project completes while another project is active.
7. Imported model lacks configured motion.
8. Classic Mode is enabled during an active session.

## Observability events

Use structured logs with correlation IDs:

```ts
type WifeLogContext = {
  eventId?: string
  projectKey?: string
  sessionId?: string
  windowId?: string
  characterId?: string
  speechJobId?: string
}
```

Log categories:

```text
wife.registry
wife.activity
wife.trigger
wife.persona
wife.presentation
wife.live2d
wife.tts
wife.audio
wife.window
```

## Important metrics

Local diagnostics may show:

- persona request latency and failure count
- TTS startup/synthesis latency
- audio buffer underruns
- speech queue length
- dropped stale intents
- Live2D frame time
- active model memory usage
- character load duration

Avoid collecting user code, raw prompts, generated speech text or local paths in external telemetry without explicit opt-in.

## Diagnostic UI

A developer panel should expose:

- active project/session/character
- latest normalized activity event
- current activity snapshot
- last trigger decision and reason
- current presentation intent
- resolved motion/expression
- TTS engine health
- speech queue
- audio energy and mouth value

This makes data-flow debugging possible without adding ad hoc logs throughout upstream code.

## Error rules

- errors must be logged or surfaced; do not silently swallow them
- repeated failures should be rate-limited
- user-facing messages should explain the degraded feature, not imply OpenCode failed
- a character package validation error should identify the exact asset/reference
- persona schema failures should retain the invalid response only in protected debug logs when safe

## Performance budgets

Initial targets:

- event normalization: negligible and synchronous
- activity aggregation: bounded memory per session
- persona calls: only at semantic checkpoints
- no more than one active TTS synthesis per speech owner
- Live2D frame loop must not wait on IPC or network
- audio callback must not perform expensive allocations

## Regression boundary

The highest-value regression test is:

> With Wife Mode disabled, OpenCode Desktop behavior and resource usage remain equivalent to the upstream integration baseline within reasonable measurement noise.
