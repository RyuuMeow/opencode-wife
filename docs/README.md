# OpenCode Wife — Documentation

> OpenCode Wife is a fork-based product layer around OpenCode Desktop: a Live2D character companion driven by OpenCode activity. The Wife layer must never block OpenCode — failure isolation is the core constraint.
> Public-facing docs live in the root [README](../README.md) (with [繁體中文](../README.zh-TW.md) and [简体中文](../README.zh-CN.md)).

## Getting started

1. Install the Windows x64 installer. The first release is unsigned, so Windows SmartScreen will warn — choose "More info" → "Run anyway".
2. Side Chat works out of the box. Live2D is optional: open **Settings → Wife → Live2D runtime**, download the Web SDK from Live2D, accept its terms, and select the SDK ZIP or `live2dcubismcore.min.js`.
3. Attach a Live2D model folder to a character (**Settings → Wife → Characters** → Edit → model folder). The panel (`mod+alt+w`) shows the character overlaid with the Side Chat.

### Panel controls

- **Top-left dropdown** — switch the displayed character for the current session.
- **Top-right mouse icon** — Live2D model adjustment mode: drag to move, wheel to zoom (0.2x–3x); chat UI pauses and `Escape` returns to chat.
- **Wheel over the conversation** — scroll up to open the detailed conversation history, scroll down to collapse it.

## Side Chat and commands

- Each main Agent session owns one persistent, archived, read-only Wife session (`read`/`glob`/`grep` tools only; no write or exec tools, no permission prompts).
- `/send` turns the Side Chat into an editable Agent draft (Replace / Append / Cancel; never auto-submitted).
- `/clear` permanently deletes the current Wife session and pointer; character, persona, model, and Live2D preferences survive.
- Reply choices are generated asynchronously by a separate low-cost model (default `opencode/deepseek-v4-flash` at `low`) and render as buttons.

## AI model and provider configuration

- The Wife session shares the active provider/model configuration; the choice generator has its own model/variant setting under **Settings → Wife → Reply choices**.
- `Settings → Wife → General` sets the character persona (user address plus bounded speaking instructions) applied from the next reply.

## Live2D runtime and characters

- The proprietary Cubism Core is **not bundled**. The setup wizard records version, SHA-256, source, and install time; replace/remove are supported from the same UI. Side Chat works without it. The bundled runtime requires a Core with the `csmGetDrawableRenderOrders` API — newer Cubism 5 SDK cores are rejected with guidance to use the official CDN file instead.
- Model folders are picked through a native directory dialog and served via the `wife://` protocol; references resolve relative to the `.model3.json` directory (VTS-style loose motion/expression packs are discovered automatically).
- Semantic mapping binds the character's motions/expressions to the stable state/gesture/emotion vocabulary.

## Shared data, backup, and compatibility

- Wife and upstream OpenCode share Agent state (sessions, projects, credentials) and **only one of the two apps may run at a time** — the second launch focuses the running app instead of starting another backend.
- Wife-specific data (characters, persona, Live2D paths, Side Chat settings) lives only in the Wife profile.
- On first run, Wife imports safe UI preferences from an existing OpenCode profile (Settings → Wife → OpenCode data can re-import).
- A compatibility guard checks the shared database schema before starting; if upstream OpenCode has upgraded beyond the supported base (`1.18.14`), Wife refuses to start with an actionable message. Upgrade Wife after upgrading OpenCode.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Live2D panel shows a setup state | Install the Cubism Core runtime (Settings → Wife → Live2D runtime) |
| Model does not render | Attach a model folder to the character; check the folder contains a `.model3.json` |
| "Shared OpenCode data is newer…" | Update OpenCode Wife; the installed OpenCode uses a newer schema |
| Second app launch does nothing | The other app is already running and owns the backend — focus its window |
| SmartScreen warning | Expected for the unsigned first release; verify the SHA-256 checksum before running |

## Release and local builds

- Windows x64 alpha installer: workflow dispatch on `.github/workflows/release.yml` builds a candidate artifact; pushing a `v*` tag creates a draft prerelease with SHA-256 checksums.
- Local build: `bun install`, then `bun run build` in `packages/app` and `bunx electron-vite build` + `bun run package:win` in `packages/desktop` (see 12-handoff.md for environment notes).
- The repository never contains `live2dcubismcore.min.js`, Live2D sample models, or the official SDK ZIP; verify with the release workflow's artifact checks.

## Document map

| Document | Status | Purpose |
|---|---|---|
| [01-one-pager.md](./01-one-pager.md) | Current | Product summary, goals, boundaries, key decisions |
| [02-product-design.md](./02-product-design.md) | Current | Product behavior, user experience, configuration model |
| [03-system-architecture.md](./03-system-architecture.md) | Implemented | Components, boundaries, ownership, failure isolation |
| [04-character-system.md](./04-character-system.md) | Implemented | Character registration, Live2D capabilities, motion mapping, voice presets |
| [05-data-model.md](./05-data-model.md) | Implemented | Configuration and runtime data structures |
| [06-event-persona-pipeline.md](./06-event-persona-pipeline.md) | Paused | OpenCode events → activity snapshots → persona model → presentation intent |
| [07-live2d-tts-runtime.md](./07-live2d-tts-runtime.md) | Partial | Live2D runtime delivered; TTS/lip sync (Milestone 6) paused |
| [08-project-session-routing.md](./08-project-session-routing.md) | Paused | Project-based character assignment, active tabs, arbitration |
| [09-implementation-plan.md](./09-implementation-plan.md) | Current | Milestones, branches, commits, verification, delivery order |
| [10-decisions-open-questions.md](./10-decisions-open-questions.md) | Current | Agreed decisions, unresolved choices, explicit non-goals |
| [11-testing-observability.md](./11-testing-observability.md) | Current | Tests, diagnostics, fallbacks, runtime telemetry |
| [12-handoff.md](./12-handoff.md) | Current | Implementation state, verification commands, pending items, next steps |
