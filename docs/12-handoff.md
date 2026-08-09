# Handoff — Current State

> Last updated: 2026-08-10. This file records what exists, how to verify, and what is pending for the OpenCode Wife alpha release. Product design lives in the other docs.

## Project position

OpenCode Desktop fork adding a low-impact presentation layer: a Live2D character companion driven by OpenCode activity. Failure isolation is the core constraint — the Wife layer must never block OpenCode. See [README.md](./README.md) for the public overview and [01-one-pager.md](./01-one-pager.md) for the product summary.

## Repository layout

- `origin` = product fork, `upstream` = anomalyco/opencode (mirrored branches under `remotes/upstream/`).
- Default branch: `dev` (AGENTS.md). Local `main` may not exist.
- Active work branch: `live2d-runtime` (current base for the roadmap).

## What is delivered

### Milestone 0 (`wife-baseline`)
- `packages/wife-core` (workspace package): `wife.*` logger, character schemas, Live2D model3 scanner, mapping suggestions.
- App: `settings.general.wifeMode` flag (default off) + Settings → Wife category (tabs: Wife / Characters).
- `WifeProvider` exposes the global wifeMode gate; the former all-server debug event subscription was removed because it had no runtime consumer.

### Milestone 1 + UI iterations (`character-registry`, `wife-settings`)
- Schemas (`wife-core/src/schema/character.ts`): CharacterDefinition, bindings, lip sync profile, speech policy, capabilities, vocabulary (8 states / 6 gestures / 7 emotions).
- Scanner (`wife-core/src/live2d/model3.ts`): references resolve relative to the model3 directory; VTS-style loose motion/expression discovery; optional assets warn, required ones block.
- Mapping suggestions (`live2d/mapping.ts`): English + CJK name matching.
- Registry (`app/src/features/wife/registry/wife-registry.tsx`): persisted `wife.registry.v1`; instant "Add character" flow.
- Characters tab (Settings → Wife → Characters): list, character settings page (Avatar / General / Semantic mapping / Danger zone).
- i18n: all wife keys present in 27 locales; en + zht translated, others carry English placeholders until `translate:app` is run.

### Phase A — Live2D runtime (`live2d-runtime`)
- `pixi.js@7` + `pixi-live2d-display-lipsyncpatch` (cubism4 entry); Cubism core is NOT bundled — the user installs it through the runtime setup wizard (see below).
- Desktop: `wife://` protocol serving registered model folders; `wife-pick-model-folder` IPC with native directory dialog and folder scan; panel is `chat | wife | review` toggled by a titlebar button (keybind `mod+alt+w`); web build shows an empty state.
- Resizable panel width (260–480 px, persisted), wheel zoom on the Live2D canvas (0.2x–3x, runtime-only).

### Milestone 2 — Wife Assistant Chat (core delivered)
- One persistent archived Wife session per main session with a verified deny-all/read-glob-grep permission profile; recovery through a workspace-local pointer.
- Persona, automatic current-Agent context projection (bounded 12,000-character snapshot), `/send` handoff, `/clear`, reply choices (default `opencode/deepseek-v4-flash` at `low`), bubble display settings, stop/recovery isolation.
- Full detail is in `docs/05-data-model.md` (Side Chat sessions) and the commit history.

### Alpha release preparation (`live2d-runtime` tip)
- `chore(brand): establish fork identity` — product name OpenCode Wife, app ID `io.github.ryuumeow.opencode-wife` (`.dev`/`.beta` channels), deep link `opencode-wife://`, OW icon set, `NOTICE.md`.
- `feat(desktop): share opencode agent state` — Wife Desktop profile (`%APPDATA%\io.github.ryuumeow.opencode-wife`) with shared Agent state in the original Desktop state root; single-instance lock taken on the original namespace before switching profiles; two apps cannot run backends concurrently.
- `fix(desktop): guard shared data compatibility` — `OPENCODE_BASE_VERSION = "1.18.14"`; read-only schema check before sidecar start; refuse to start on unknown schema; consistency backups.
- `feat(desktop): import opencode preferences` — idempotent first-run import of safe UI preferences from the original profile, plus a Settings re-import action.
- `fix(desktop): isolate fork updates` — Wife updater disabled in alpha; sidecar `OPENCODE_DISABLE_AUTOUPDATE=1`; Help points to this repo's releases only.
- `feat(desktop): add live2d runtime setup` — user-supplied Cubism Core install wizard (SDK ZIP or `live2dcubismcore.min.js`), SHA-256/version metadata, `wife-runtime://` protocol, `LIVE2D_CUBISM_CORE_PATH` dev override, missing-core setup state in the panel and settings; `script/fetch-cubism-core.ts` removed.
- `docs: prepare public project documentation` — README (en / zh-TW / zh-CN), docs reorganized with status markers, SECURITY.md uses Private Vulnerability Reporting.

## Manual test model

A VTube Studio-style pack with 2 motions and 22 expressions can be used to exercise import and rendering. The synthetic `wife-demo/luna` fixture files do NOT render (placeholder moc3).

## Verification commands

- `bun run typecheck` from package dirs (wife-core / app / ui / desktop).
- `bun test` in `packages/wife-core` (28 tests).
- `bun run test:unit` in `packages/app` (772 tests; parity included via `bun test --conditions=solid --preload ./happydom.ts src/i18n/parity.test.ts`).
- `bunx oxlint <changed files>` — repo-wide lint has pre-existing warnings (~4.8k) and a pre-existing error in `packages/session-ui/src/v2/components/prompt-input/index.tsx` (octal literal).
- `bun test` in `packages/desktop` — 94 pass; `draft-store.test.ts` fails on this machine because bun on Windows lacks `node:sqlite` (pre-existing upstream test, unrelated to Wife work).
- Builds: `bun run build` in `packages/app`; `bunx electron-vite build` in `packages/desktop`; `bun run package:win` for the Windows installer.

## Environment notes (this machine)

- bun 1.3.14 installed globally via npm, added to user PATH — new terminals required after the change.
- bun on Windows fails to extract os/cpu-filtered npm packages (pre-existing bug), so desktop `prebuild` fails at CLI download; workaround: `packages/desktop/resources/opencode-cli.exe` is copied manually from an npm-installed package (file is gitignored; kept on this machine).
- `packages/app/src/custom-elements.d.ts` was fixed upstream-incompletely (missing `/// <reference>`); if upstream ever rewrites the file, re-check it.

## Pending items / known gaps

- `custom.*` gestures/emotions: types accept them, the mapping editor does not render or add them yet.
- Chat-driven presentation intent, project binding (Milestone 3), observation (Milestone 4), the activity persona director (Milestone 5), voice/lip sync (Milestone 6), and later work are paused.
- Web build intentionally shows an empty state (no `wife://` protocol in browsers).
- i18n: run `bun run translate:app -- all` (needs the opencode CLI) to replace placeholders in non-en/zht locales.
- Registry store is localStorage-backed; large avatar images are downscaled to 128px data URLs, but a future move to IndexedDB may be worth it if many characters accumulate.
- First release is an unsigned Windows x64 NSIS installer; users will see a SmartScreen warning.

## Suggested next steps

1. Build and install the alpha on a clean machine; verify side-by-side install with upstream OpenCode, shared sessions, mutual single-instance exclusion, and the Live2D runtime setup flow.
2. Exercise and refine the delivered Side Chat persona, automatic Agent context, `/send`, `/clear`, stop, recovery, and narrow-panel behavior.
3. Resume chat-driven presentation intent or Milestone 3+ only after the Side Chat use case is stable and the priority is explicitly revisited.
