# Implementation Plan

## Working strategy

Treat this as a large multi-file feature:

- develop on a dedicated product branch
- split milestones into independently reversible commits
- keep upstream integration points small
- validate the uncertain runtime pieces before workspace UI expansion
- update documents together with behavior changes

## Repository strategy

```text
origin   = product fork
upstream = anomalyco/opencode
```

Suggested long-lived branches:

```text
upstream-dev   mirror/reference for upstream dev
wife/main      stable product integration
```

Feature branches:

```text
feat/character-registry
feat/live2d-runtime
feat/voice-runtime
feat/project-binding
feat/persona-pipeline
feat/presentation-arbiter
feat/workspace-split
feat/tab-detach
```

Use Conventional Commits and keep commits independently revertible.

## Milestone 0 — Baseline and integration boundary

> Status: delivered on `wife-baseline` (branch `wife-baseline`, commits `feat(wife-core)…`, `feat(app): add wife mode setting and toggle`, `chore(i18n)…`, `fix(app): restore custom-elements reference directive`, `feat(wife): add gated event bridge provider`).

Deliverables:

- fork builds and launches Desktop
- Classic Mode switch (app setting `general.wifeMode`, default off, settings UI section)
- dedicated Wife module directories (`packages/wife-core`, `packages/app/src/features/wife/`)
- minimal event bridge with no behavior change (per-server `wife.activity` debug logging, gated by the flag)
- logging namespace (`wife.*` from `@opencode-ai/wife-core/log`) and feature flag

Acceptance:

- upstream behavior remains unchanged with Wife Mode disabled
- disabling Wife Mode does not start Live2D or TTS resources

## Milestone 1 — Character registry

> Status: delivered on `character-registry`. Preview player is a static avatar/capability summary; WebGL Live2D preview is deferred to the Live2D runtime milestone (Cubism SDK core cannot be committed to the repo). Settings entry lives under its own sidebar category (Settings → Wife → General / Characters), delivered on `wife-settings`.

Deliverables:

- import character package or Live2D model
- asset validation
- motion/expression/parameter scan
- preview player
- semantic mapping UI
- persisted character definition and capability cache

Acceptance:

- user registers a model without hand-editing JSON
- missing mappings use visible fallbacks
- invalid imports do not crash the app

Suggested commits:

```text
feat(wife-schema): add character and asset schemas
feat(wife-registry): persist registered characters
feat(wife-live2d): scan and preview model capabilities
feat(wife-settings): add semantic motion mapping
```

## Milestone 2 — Voice engine and lip sync

Deliverables:

- GPT-SoVITS engine definition
- managed process or endpoint connection
- voice preset registration
- streaming synthesis
- renderer audio playback
- volume-based lip sync
- test sentence UI

Acceptance:

- one sentence plays with synchronized mouth movement
- engine crash does not affect OpenCode
- speech can be cancelled

## Milestone 3 — Project binding

Deliverables:

- global default character
- project character selection
- active-tab character switching
- session temporary override
- per-project speech policy

Acceptance:

- two projects can use different characters
- switching tabs selects the correct character
- configuration stores references, not duplicated assets

## Milestone 4 — Deterministic activity pipeline

Deliverables:

- event normalizer
- session activity store
- rule-based states
- template permission/question/completion/error lines
- presentation arbiter MVP

Acceptance:

- routine tools do not generate speech
- permission and completion are presented once
- background progress does not take over the active character

## Milestone 5 — Lightweight persona director

Deliverables:

- structured persona request/response
- validation and stale-result cancellation
- recent-speech deduplication
- configurable progress triggers
- semantic gesture/emotion selection

Acceptance:

- spoken lines are concise and supported by activity data
- model failure uses templates
- AI never outputs asset paths or tool decisions

## Milestone 6 — Runtime hardening

Deliverables:

- process restart policy
- diagnostics page
- performance limits
- queue expiry and interruption behavior
- multi-window ownership
- end-to-end tests

Acceptance:

- no duplicate speech across windows
- repeated TTS failures degrade cleanly
- long coding sessions do not leak unbounded activity data

## Milestone 7 — Workspace UI extensions

Only after the character pipeline is stable:

1. generalize utility tabs
2. create pane layout tree
3. move tabs between panes
4. persist layouts
5. detach tabs into new BrowserWindows
6. support a dedicated Live2D tab/window

These changes touch high-conflict upstream UI files and should remain separate from the character runtime milestones.

## Verification strategy

### During development

Run focused checks when changing shared logic or completing a milestone slice:

- schema/unit tests
- reducer/trigger-policy tests
- Live2D import fixture tests
- speech queue tests
- relevant renderer tests

### Milestone completion

Run once:

- full typecheck
- lint
- unit tests
- Desktop build
- packaged smoke test where relevant

## Definition of done for each milestone

- acceptance criteria pass
- no swallowed errors
- configuration migration is defined
- related documentation is updated
- commits are clear and independently revertible
- upstream-facing files contain only necessary integration changes
