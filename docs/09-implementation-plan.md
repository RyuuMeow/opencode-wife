# Implementation Plan

> Status: **Current** — roadmap reflects the delivered milestones and the paused remainder

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

Feature branches (short names, no type prefixes — see AGENTS.md):

```text
project-binding
wife-chat
activity-pipeline
persona-director
voice-runtime
runtime-hardening
workspace-extensions
```

Use Conventional Commits and keep commits independently revertible.

## Delivered work

### Milestone 0 — Baseline and integration boundary (delivered)

> Status: delivered on `wife-baseline` (commits `feat(wife-core)…`, `feat(app): add wife mode setting and toggle`, `chore(i18n)…`, `fix(app): restore custom-elements reference directive`, `feat(wife): add gated event bridge provider`).

Deliverables:

- fork builds and launches Desktop
- Classic Mode switch (app setting `general.wifeMode`, default off, settings UI section)
- dedicated Wife module directories (`packages/wife-core`, `packages/app/src/features/wife/`)
- minimal event bridge with no behavior change (per-server `wife.activity` debug logging, gated by the flag)
- logging namespace (`wife.*` from `@opencode-ai/wife-core/log`) and feature flag

Acceptance:

- upstream behavior remains unchanged with Wife Mode disabled
- disabling Wife Mode does not start Live2D or TTS resources

### Milestone 1 — Character registry (delivered)

> Status: delivered on `character-registry` + `wife-settings`. The original linear import wizard was replaced by an instant "Add character" flow plus a per-character settings page (avatar / general / semantic mapping / danger zone).

Deliverables:

- import character package or Live2D model
- asset validation
- motion/expression/parameter scan
- preview player (static avatar picker; live WebGL preview in Phase A)
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

### Phase A — Live2D runtime (delivered)

> Status: delivered on `live2d-runtime`. Runtime = `pixi.js@7` + `pixi-live2d-display-lipsyncpatch` (cubism4 entry); Cubism core downloaded at build time by `script/fetch-cubism-core.ts` and bundled (users download nothing); desktop reads model folders via a native dialog IPC (`wife-pick-model-folder`, which also scans the folder and whitelists it in Electron Main) + `wife://` protocol (privileged scheme with `corsEnabled`); panel is a right-side split between the conversation and the review panel (`chat | wife | review`), toggled by a Toggle Wife button next to Toggle Review (keybind `mod+alt+w`); web build shows an empty state in the panel (desktop-first). The panel has a manual intent test strip (state / gesture / emotion) driving `applyIntent` until the activity pipeline lands.

Commits:

```text
feat(wife): add live2d runtime dependencies and cubism core fetch script
feat(wife): add wife panel state and toggle button
feat(desktop): serve model files via wife protocol
feat(wife): add live2d view and wife side panel
fix(desktop): keep nested model file paths relative to the picked folder
fix(wife): load cubism4 runtime entry and guard lazy import failure
fix(wife): load cubism core in desktop renderer and reserve panel width
fix(desktop): enable CORS for the wife protocol
```

Acceptance:

- the model renders in the wife panel and plays mapped motions/expressions
- toggling the panel behaves like the review panel
- web build shows an empty state for the panel (desktop-first)

### Phase A polish — panel resizing and zoom (delivered)

Small UX follow-up completed on `live2d-runtime`:

- resizable wife panel width: `layout.wife.width` (persisted, default 320, min 260 / max 480), `ResizeHandle` on the panel's left edge, chat column absorbs the change (existing `sessionPanelWidth` calc)
- mouse-wheel zoom on the Live2D canvas: `zoomFactor` multiplied into the fit scale (`0.2x–3x`, runtime-only, multiplicative `exp(-deltaY * 0.001)`, centered on the viewport)

Commits:

```text
feat(wife): make wife panel width resizable
feat(wife): add wheel zoom to live2d view
```

### Alpha release preparation (delivered on `live2d-runtime`)

> Status: delivered ahead of `v0.1.0-alpha.1`. Detail in 12-handoff.md.

- `chore(brand)`: fork identity — product name, app IDs, `opencode-wife://` deep link, OW icon set, `NOTICE.md`
- `feat(desktop)`: share opencode agent state — separate Wife profile, shared Agent state, mutual single-instance exclusion
- `fix(desktop)`: guard shared data compatibility — base version `1.18.14`, read-only schema check, consistency backups
- `feat(desktop)`: import opencode preferences — idempotent first-run import + Settings re-import
- `fix(desktop)`: isolate fork updates — updater disabled, no upstream publish references
- `feat(desktop)`: add live2d runtime setup — user-supplied Cubism Core wizard replacing the build-time fetch
- `docs`: public documentation — root README (en/zh-TW/zh-CN), docs reorganization, SECURITY.md
- `ci(release)`: Windows x64 alpha workflow — candidate artifacts and draft prereleases

## Roadmap (revised order)

The roadmap was reordered during design review: the Wife Assistant Chat is the most visible interactive surface and has no hard dependency on the activity pipeline, so it moves ahead of it. Voice is deferred until the character has something to say and the assistant has text output (speech-bubble fallback covers the gap). Two independent loops share one presentation runtime:

```text
Loop A (observation):  events → activity store → trigger policy → persona → intent
Loop B (assistant):    user ⇄ wife session (read-only) → reply → intent
                         both → presentation coordinator → Live2D + bubble + speech queue
```

### Milestone 2 — Wife Assistant Chat

A second, restricted conversation surface inside the wife panel. The assistant watches nothing yet (that is Milestone 4); it answers project questions with read-only tools.

> Status: Side Chat core delivered on `live2d-runtime`. Each main session owns a persistent, archived Wife session with a verified deny-all/read-glob-grep permission profile. The overlay restores history, survives panel collapse, and isolates stop/error state. Character persona, automatic current-Agent context, `/send`, and `/clear` are delivered. Chat-driven presentation intent is paused with the downstream milestones.

Deliverables:

- wife session management: legacy API session (`POST /session` + prompt) with a `permission` deny ruleset — read-only profile denies `bash`/`edit`/`write`/`apply_patch`/`task`/`skill`, keeps `read`/`glob`/`grep`; shares the active provider/model configuration; no permission prompts
- session-level conversation memory (one persistent Wife session per main session; switching restores the matching history)
- context management: server-side auto-compaction (existing feature — no custom truncation)
- chat UI: the Live2D canvas hosts the conversation overlay, reuses `PromptInputV2` (controller mode) with a custom wife submit handler, lightweight message bubbles (reuse `Markdown`), and asynchronously generated choices rendered as buttons (visual-novel style; clicking sends the chosen text)
- speech bubble overlay on the Live2D canvas for chat replies
- global character chat persona: user address plus bounded free-form speaking/personality instructions, applied from the next reply
- automatic current-Agent snapshot: up to 80 recent messages projected into a 12,000-character untrusted read-only reference
- `/send`: a temporary archived deny-all/no-tools session summarizes the Side Chat and latest Agent snapshot into the scoped Agent composer; existing drafts offer Replace / Append / Cancel and are never auto-submitted
- `/clear`: confirmed permanent deletion of the current Wife session and pointer while preserving character, model, persona, compatibility, and Live2D preferences
- configurable reply-choice generation: a global enable switch plus independent model/variant, defaulting to `opencode/deepseek-v4-flash` at `low`; each successful reply runs in a temporary archived deny-all session without blocking bubble reveal

Acceptance:

- asking project questions returns useful answers; no write/exec tool is available to the wife session
- choices render as buttons and submit their text
- `/send` produces an editable Agent task without auto-submitting or crossing session boundaries
- `/clear` remains cleared after restart; its next normal message creates a fresh Wife session
- memory is session-scoped; a collapsed panel does not interrupt an in-flight reply
- model failure shows an error state without affecting the agent session

### Milestone 3 — Project binding

> Status: paused while Side Chat remains the product mainline.

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

### Milestone 4 — Activity pipeline (observation)

> Status: paused.

The character starts watching the agent work. Observation is event-driven and intentionally cheap.

Deliverables:

- event normalizer: OpenCode events → stable wife event contract (pure functions)
- session activity store: semantic snapshots (current task, phase, status, recent actions, permission/question state), capacity-bounded — the observation context is a small snapshot, never a transcript
- trigger policy: cooldowns, deduplication, background-session policy
- observation state machine: `observing` ⇄ `idle` (idle after 5 minutes without events) and `stopped` (panel collapsed or Wife Mode off — full stop, including activity updates; resumes from scratch)
- template bank: situation key → sentence list, random pick without immediate repeats; per-character `speechTemplates` + built-in defaults (e.g. long-idle: "好好休息一下,我會在這邊等你的"); settings UI editor
- idle behavior: random idle motions, occasional idle-template speech (30-minute cooldown, configurable)
- presentation coordinator v2: merges event-driven and chat intents with arbitration (speech/gesture priority)
- manual intent test strip stays as a debug surface

Acceptance:

- routine tools do not generate speech
- permission and completion are presented once
- the character goes idle after inactivity and pauses when the panel is collapsed
- background progress does not take over the active character

### Milestone 5 — Lightweight persona director

> Status: paused. This is separate from the delivered static character chat persona.

Deliverables:

- structured persona request/response via `LLM.generateObject` (text + emotion + gesture + optional choices)
- validation and stale-result cancellation
- recent-speech deduplication
- configurable progress triggers
- semantic gesture/emotion selection

Acceptance:

- spoken lines are concise and supported by activity data
- model failure uses templates
- AI never outputs asset paths or tool decisions

### Milestone 6 — Voice engine and lip sync

> Status: paused.

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

### Milestone 7 — Runtime hardening

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

### Milestone 8 — Workspace UI extensions

Only after the character pipeline is stable:

1. generalize utility tabs
2. create pane layout tree
3. move tabs between panes
4. persist layouts
5. detach tabs into new BrowserWindows
6. support a dedicated Live2D tab/window

These changes touch high-conflict upstream UI files and should remain separate from the character runtime milestones.

## Locked technical decisions

| Area | Decision |
|---|---|
| Wife session | Legacy API (`POST /session` + prompt); read-only profile via `permission` deny ruleset; `{ permission: "*", action: "deny" }` gives a no-tools mode |
| Structured output | `LLM.generateObject` (choices / persona) |
| Choices | Renderer-rendered buttons from structured output; clicking sends the chosen text (no server question API) |
| Input reuse | `PromptInputV2` (controller mode) with a custom wife submit handler |
| `/send` | Temporary deny-all/no-tools summary session; scoped editable Agent draft; never auto-submit |
| `/clear` | Permanently delete the assistant session and pointer after V2 confirmation |
| Memory | Session-scoped, keyed by session id, pruned |
| Context management | Wife memory uses server auto-compaction; current Agent context is a non-persisted bounded projection |
| Observation | Event-driven; activity snapshot input (small window, bounded); 5-minute idle threshold; 30-minute idle-speech cooldown; full stop when collapsed / Wife Mode off |
| Template bank | Per-character `speechTemplates` (sentence lists) + built-in defaults |
| Panel width | Resizable 260–480 px, default 320, persisted |
| Zoom | Wheel zoom 0.2x–3x, runtime-only, centered |
| Security | Permission ruleset is the primary boundary; renderer never renders write/exec tools; in-flight chat replies survive panel collapse |

## Verification strategy

### During development

Run focused checks when changing shared logic or completing a milestone slice:

- schema/unit tests
- reducer/trigger-policy tests (normalizer, trigger policy, coordinator arbitration — pure functions)
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
