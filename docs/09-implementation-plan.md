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

> Status: delivered on `character-registry` + `wife-settings`. The original linear import wizard was replaced by an instant "Add character" flow plus a per-character settings page (avatar / general / semantic mapping / danger zone), delivered on `wife-settings`. Live WebGL preview is the next step (Phase A below).

Deliverables:

- import character package or Live2D model
- asset validation
- motion/expression/parameter scan
- preview player (static avatar picker delivered; live WebGL preview pending Phase A)
- semantic mapping UI (collapsible groups, narrow rows)
- persisted character definition and capability cache

Acceptance:

- user registers a model without hand-editing JSON
- missing mappings use visible fallbacks
- invalid imports do not crash the app

Implementation notes (delivered on `wife-settings`):

- model references resolve relative to the `.model3.json` directory; VTS-style loose `.motion3.json` / `.exp3.json` files are discovered when the model declares none; missing optional assets warn instead of block
- mapping suggestions match English and CJK names; `custom.*` gestures/emotions are type-level only (UI pending)
- Settings → Wife sidebar category with General / Characters tabs; i18n policy: en + zht translated, other locales carry English placeholders with `// TODO: translate via translate:app` comments until `translate:app` is run

## Phase A — Live2D runtime (delivered)

> Status: delivered on `live2d-runtime`. Runtime = `pixi.js@7` + `pixi-live2d-display-lipsyncpatch`; Cubism core downloaded at build time by `script/fetch-cubism-core.ts` and bundled (users download nothing); desktop reads model folders via a native dialog IPC (`wife-pick-model-folder`, which also scans the folder and whitelists it in Electron Main) + `wife://` protocol; panel is a right-side split between the conversation and the review panel (`chat | wife | review`), fixed 320px, toggled by a Toggle Wife button next to Toggle Review (keybind `mod+alt+w`); web build shows an empty state in the panel (desktop-first). The panel has a manual intent test strip (state / gesture / emotion) driving `applyIntent` until the Milestone 4 event pipeline lands.

Commits:

```text
feat(wife): add live2d runtime dependencies and cubism core fetch script
feat(wife): add wife panel state and toggle button
feat(desktop): serve model files via wife protocol
feat(wife): add live2d view and wife side panel
```

Acceptance:

- the model renders in the wife panel and plays mapped motions/expressions
- toggling the panel behaves like the review panel
- web build shows an empty state for the panel (desktop-first)

## > Status: delivered on `live2d-runtime` (above).

Milestone 2 — Voice engine and lip sync

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
