# Handoff — Current State

> Last updated: 2026-08-09. This file is the operational handoff for whoever continues the Wife work. Product design lives in the other docs; this one records what exists, how to verify, and what is pending.

## Project position

OpenCode Desktop fork adding a low-impact presentation layer: a Live2D character companion driven by OpenCode activity. Failure isolation is the core constraint — the Wife layer must never block OpenCode.

## Repository layout

- `origin` = product fork, `upstream` = anomalyco/opencode (mirrored branches under `remotes/upstream/`).
- Default branch: `dev` (AGENTS.md). Local `main` may not exist.
- Active work branches:

| Branch | Content |
|---|---|
| `wife-baseline` | Milestone 0: wife-core package, Classic Mode flag, gated event bridge |
| `character-registry` | Milestone 1: schemas, scanner, registry, mapping suggestions |
| `wife-settings` | Character management UI iterations |
| `live2d-runtime` | Phase A: Live2D runtime (current base for the roadmap) |

## What is delivered

### Milestone 0 (`wife-baseline`)
- `packages/wife-core` (workspace package): `wife.*` logger, character schemas, Live2D model3 scanner, mapping suggestions.
- App: `settings.general.wifeMode` flag (default off) + Settings → Wife category (tabs: Wife / Characters) — the settings sidebar category came later on `wife-settings`.
- `WifeProvider` exposes the global wifeMode gate; the former all-server debug event subscription was removed because it had no runtime consumer and flooded the terminal during active sessions.

### Milestone 1 + UI iterations (`character-registry`, `wife-settings`)
- **Schemas** (`wife-core/src/schema/character.ts`): CharacterDefinition (avatar optional, avatarImage data URL), bindings, lip sync profile, speech policy, capabilities, vocabulary (8 states / 6 gestures / 7 emotions).
- **Scanner** (`wife-core/src/live2d/model3.ts`):
  - references resolve relative to the model3 directory (`..` collapsed; absolute/URL rejected)
  - VTS-style loose `*.motion3.json` / `*.exp3.json` discovery when the model declares none
  - optional assets (physics/pose/display-info/user-data) warn; required ones block
- **Mapping suggestions** (`live2d/mapping.ts`): English + CJK name matching (e.g. 待机动画 → state.idle).
- **Registry** (`app/src/features/wife/registry/wife-registry.tsx`): persisted `wife.registry.v1`; register(name) creates empty characters; update / setCapabilities / remove.
- **Characters tab** (Settings → Wife → Characters): provider-style list (icon + name + capability tag + Edit), instant "Add character", character settings page with sections — Avatar (square picker + remove), General (name, Live2D model folder), Semantic mapping (collapsible narrow groups, collapsed by default, autosave), Danger zone (delete).
- **i18n**: all wife keys present in 27 locales; en + zht translated, others English placeholders with `// TODO: translate via translate:app` (policy D15).

## Phase A — Live2D runtime (delivered on `live2d-runtime`)

- deps `pixi.js@7` + `pixi-live2d-display-lipsyncpatch`; `script/fetch-cubism-core.ts` (repo root) → `packages/app/public/vendor/live2dcubismcore.min.js` (gitignored) + script tag in `app/index.html`
- `context/layout.tsx` `wifePanel` contract (mirrors `reviewPanel`, persisted `wife.panelOpened`); session-header Toggle Wife buttons in both titlebar variants (legacy ghost + V2 ghost-muted, `wife-sparks` icon now in the V2 icon set); `wife.toggle` command with keybind `mod+alt+w` (+ command palette suggestion); i18n `command.wife.toggle` / `session.panel.wife` / `wife.panel.*` (D15)
- desktop: `wife-pick-model-folder` IPC (`packages/desktop/src/main/wife.ts`) — native dialog + recursive folder scan (json text up to 5MB, files up to 200MB) + electron-store whitelist `wife.modelFolders` in one call; `wife://` protocol (privileged scheme + `protocol.handle` with Range passthrough; pure `resolveWifePath` in `wife-path.ts`, tested); preload `ElectronAPI.pickWifeModelFolder` + `Platform.pickWifeModelFolder`
- `features/wife/live2d/live2d-view.tsx` (pixi Application + `Live2DModel.from("wife://<id>/<model3>")` + `applyIntent`: state motion NORMAL priority, gesture FORCE with onFinish return-to-state, expression) and `wife-panel.tsx` aside (resizable, `chat | wife | review` in `pages/session.tsx`); panel header uses the character SelectV2, runtime startup is deferred past the panel transition, and empty states cover web / no model / load failure
- settings model picker: native dialog on desktop (folder path stored in registry `modelFolders` + main whitelist), webkitdirectory input on web; both reuse `scanLive2dModel` (manifest → `Live2dFileSet`)

## Milestone 2 — Wife Assistant Chat (core delivered)

- `features/wife/chat/wife-chat-controller.ts`: one persistent archived Wife session per main session, recovered through a workspace-local pointer plus owner metadata; every use verifies the deny-all/read-glob-grep permission profile before prompting
- session prompts initially use JSON-schema output (`messages` 1+, `choices` 2–3); an explicit provider `tool_choice` incompatibility marks that provider/model as text-only in workspace persistence, immediately retries through the tagged text contract with stable message/part IDs, and reuses text mode on later requests
- assistant replies use as many short bubbles as needed to complete the thought; `<keep>...</keep>` explicitly preserves multi-sentence rhythm, inline code, quoted text, property chains, and explanations that would become fragments when split, while a final fragment guard rejoins messages beginning with punctuation
- thinking uses a centered three-dot status animation with reduced-motion fallback; replies always request 2–3 model-authored follow-up choices, and choices are accepted only from JSON schema or explicit `<choice>` tags rather than inferred from Markdown lists
- Wife prompts prefer natural plain conversation and discourage headings, lists, tables, and emphasis unless the user explicitly requests structured technical content or code
- schema-to-text compatibility retries reuse one chronologically sortable app `messageID`/`partID`; do not replace these with descriptive UUID prefixes because the session loop compares message IDs to determine whether an assistant turn follows its user turn
- Wife character/model/variant selection is persisted per main session and remains independent from the agent composer; Live2D zoom and position remain global per character
- the Wife resize handle moves to its trailing edge when a review/side panel is present, giving each three-column divider one unambiguous resize target
- Wife chat metadata is versioned; pre-v4 sessions are aborted, retired, and replaced automatically because legacy `msg_wife_*` prompt IDs permanently outrank chronological IDs and can keep the session loop running
- controller ownership lives in `SessionPage`, not `WifePanel`, so collapsing the panel does not interrupt work; stop aborts the Wife session and generation guards prevent late replies from crossing session boundaries
- loading and failures stay inside the assistant bubble surface with V2 semantic tokens; archived Wife sessions are excluded from ordinary completion/error notifications

Manual test asset: `E:\Temp\Baidu\w242水色眼罩小熊\水色小熊\模型文件` (VTS pack; 2 motions 待机动画/打瞌睡, 22 expressions). Synthetic `wife-demo\luna` fixture files do NOT render (placeholder moc3).

## Verification commands

- `bun run typecheck` from package dirs (wife-core / app / ui / desktop).
- `bun test` in `packages/wife-core` (28 tests).
- `bun run test:unit` in `packages/app` (724 tests; parity included via `bun test --conditions=solid --preload ./happydom.ts src/i18n/parity.test.ts`).
- `bunx oxlint <changed files>` — repo-wide lint has a pre-existing error in `packages/session-ui/src/v2/components/prompt-input/index.tsx` (octal literal) and ~4.8k pre-existing warnings.
- Builds: `bun run build` in `packages/app`; `bunx electron-vite build` in `packages/desktop` (skip prebuild — see environment notes).
- Dev servers: backend `bun run --conditions=browser ./src/index.ts serve --port 4096` from `packages/opencode`; app `bun dev -- --port 4444` from `packages/app`; open `http://localhost:4444`.

## Environment notes (this machine)

- bun 1.3.14 installed globally via npm (`C:\Users\guguc\AppData\Roaming\npm`), added to user PATH — new terminals required after the change.
- `bun` on Windows fails to extract os/cpu-filtered npm packages (pre-existing bug), so desktop `prebuild` fails at CLI download; workaround: `packages/desktop/resources/opencode-cli.exe` was copied manually from an npm-installed package (file is gitignored; kept on this machine).
- `packages/app/src/custom-elements.d.ts` was fixed upstream-incompletely (missing `/// <reference>`); if upstream ever rewrites the file, re-check it.
- Uncommitted working-tree changes that are NOT part of Wife work: `.opencode/opencode.jsonc` modification and deleted `.opencode/tool/github-*.ts` (user's own cleanup).

## Pending items / known gaps

- `custom.*` gestures/emotions: types accept them, mapping editor does not render or add them yet.
- Loose-scan motion/expression file paths live in capabilities but are not persisted as assets; the runtime reads them back from the model folder (desktop protocol), so re-picking a folder after re-import is not required as long as the folder path is stored.
- Milestone 2 still needs `/wife-context` and chat-driven presentation intent. Project binding (Milestone 3), observation (Milestone 4), persona (Milestone 5), and voice/lip sync (Milestone 6) remain pending.
- Web build intentionally shows an empty state (no `wife://` protocol in browsers).
- i18n: run `bun run translate:app -- all` (needs the opencode CLI) to replace placeholders in non-en/zht locales.
- Registry store is localStorage-backed; large avatar images are downscaled to 128px data URLs, but a future move to IndexedDB may be worth it if many characters accumulate.

## Suggested next steps

1. Finish Milestone 2 with `/wife-context` and chat-driven presentation intent.
2. Then Milestone 3 (project binding), Milestone 4 (activity pipeline / observation), Milestone 5 (persona), Milestone 6 (voice + lip sync).
