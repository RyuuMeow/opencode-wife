# OpenCode Desktop Wife — Documentation Index

> Status: Milestone 0, Milestone 1, Phase A, and the Side Chat core are delivered on `live2d-runtime`. Side Chat + character persona is the current product mainline; Milestone 3 and later are paused — see [12-handoff.md](./12-handoff.md).
> Basis: the design discussion around extending `anomalyco/opencode` with a low-impact presentation layer.

## Project position

OpenCode Desktop Wife is a fork-based product layer built around OpenCode Desktop.

OpenCode remains responsible for:

- agent reasoning and model calls
- session lifecycle
- tool execution and permissions
- files, diffs, terminal and technical output
- the original coding workflow

The Wife layer is responsible for:

- selecting a character for the active project
- interpreting OpenCode events into semantic activity
- deciding whether a character should speak
- converting technical information into concise spoken language
- controlling Live2D state, gesture, emotion and lip sync
- running GPT-SoVITS or another TTS engine
- presenting additional desktop UI such as a character tab, dock or detached window

The key constraint is **failure isolation**: disabling or crashing the Wife layer must not prevent OpenCode from working.

## Document map

| Document | Purpose |
|---|---|
| [01-one-pager.md](./01-one-pager.md) | Product summary, goals, boundaries and key decisions |
| [02-product-design.md](./02-product-design.md) | Product behavior, user experience and configuration model |
| [03-system-architecture.md](./03-system-architecture.md) | Components, boundaries, ownership and failure isolation |
| [04-character-system.md](./04-character-system.md) | Character registration, Live2D capabilities, motion mapping and voice presets |
| [05-data-model.md](./05-data-model.md) | Configuration and runtime data structures |
| [06-event-persona-pipeline.md](./06-event-persona-pipeline.md) | OpenCode events → activity snapshots → lightweight persona model → presentation intent |
| [07-live2d-tts-runtime.md](./07-live2d-tts-runtime.md) | Motion playback, expressions, GPT-SoVITS streaming and lip sync |
| [08-project-session-routing.md](./08-project-session-routing.md) | Project-based character assignment, active tabs, background sessions and arbitration |
| [09-implementation-plan.md](./09-implementation-plan.md) | Milestones, branches, commits, verification and delivery order |
| [10-decisions-open-questions.md](./10-decisions-open-questions.md) | Agreed decisions, unresolved choices and explicit non-goals |
| [11-testing-observability.md](./11-testing-observability.md) | Tests, diagnostics, fallbacks and runtime telemetry |
| [12-handoff.md](./12-handoff.md) | Current implementation state, verification commands, pending decisions and next steps |

## Recommended source layout

```text
packages/
├── wife-core/
│   ├── activity/
│   ├── live2d/          (model3 scanning, path resolution, semantic mapping suggestions)
│   ├── persona/
│   ├── presentation/
│   └── schema/
├── app/src/features/wife/
│   ├── bridge/          (gated event observation)
│   ├── registry/        (persisted character registry)
│   ├── character/       (list, settings page, semantic mapping editor)
│   └── live2d/          (Live2D view and panel — Phase A)
└── desktop/src/main/wife/
    ├── character-registry/
    ├── runtime/
    ├── speech/
    └── ipc/
```

Keep changes to upstream OpenCode files limited to small integration points. Product logic belongs in dedicated Wife modules.

## Suggested implementation order

1. Register and preview one character. (done)
2. Refine the delivered Side Chat, persona, automatic Agent context, `/send`, and `/clear` workflows.
3. Resume project binding, observation, presentation intent, voice, and later runtime work only after the Side Chat use case is stable.

Current progress: Phase A and the core persistent read-only Side Chat are delivered, including global character persona, bounded current-Agent context, `/send`, and `/clear`; see 12-handoff.md.
