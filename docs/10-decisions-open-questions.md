# Decisions and Open Questions

## Agreed decisions

### D1 — Fork OpenCode Desktop

A fork is required for native UI, Electron process management and future workspace changes. The product should still minimize modifications to OpenCode core.

### D2 — Side pipeline, not blocking middleware

The Wife pipeline observes OpenCode results and events. It does not sit between tool completion and the agent's next step.

### D3 — Technical output and spoken output remain separate

OpenCode UI keeps the complete technical response. The character receives a short spoken version.

### D4 — Global registration, project binding, session runtime

- global character assets are registered once
- projects reference a character and override policy
- sessions store transient activity/presentation state only

### D5 — Stable semantics, configurable mappings

System state names remain fixed. Users map each Live2D model's motions and expressions to those semantics and may add `custom.*` actions.

### D6 — Persona model outputs intent, not assets

The lightweight model selects text, state, gesture and emotion from an allowed list. Asset resolution remains deterministic.

### D7 — Audio drives mouth movement

MVP lip sync uses playback-side audio energy. Text and AI do not control frame-by-frame mouth values.

### D8 — Background sessions are quiet by default

They update state and can notify, but do not normally speak or replace the active character.

### D9 — Classic Mode is a first-class mode

It must bypass character, persona and TTS resources and remain useful for debugging.

### D10 — Workspace changes come later

Split panes and detachable tabs are separate, high-conflict workstreams after the character pipeline is validated.

### D11 — Live2D runtime: pixi.js 7 + lipsyncpatch fork

The renderer uses `pixi-live2d-display-lipsyncpatch` (MIT). Its `motion(group, index, priority)` and `expression(name)` APIs map directly onto the semantic model. Decided during Phase A planning.

### D12 — Cubism core is downloaded at build time and bundled

The proprietary `live2dcubismcore.min.js` never enters the repository. `script/fetch-cubism-core.ts` downloads it into `packages/app/public/vendor/` (gitignored) and it ships inside the app, so end users perform no extra setup. A documented manual-placement fallback exists.

### D13 — Desktop-first runtime with a `wife://` protocol

The sandboxed renderer cannot read model folders and blob URLs cannot resolve relative model references. Desktop picks the folder via a native dialog, stores the absolute path machine-locally, and Electron Main serves model files through a whitelisted `wife://<characterId>/<path>` protocol. The web build shows an empty state in the panel.

### D14 — Wife panel placement and toggle

The character renders in a right-side split between the conversation and the review panel (`chat | wife | review`), toggled by a Toggle Wife titlebar button that mirrors Toggle Review. Left edge stays free for future navigation; RTL ordering falls out of flex direction automatically.

### D15 — i18n policy for new keys

New UI keys are translated in English and Traditional Chinese; other locales receive English placeholders with a `// TODO: translate via translate:app` comment so the parity test stays green until `translate:app` is run.

## Open product questions

### Q1 — Character visibility model

Choose the initial supported surface:

- dedicated character tab
- persistent side dock
- detached always-on-top window

> Resolved: a right-side split panel toggled from the titlebar (chat | wife | review), delivered as Phase A. Detached ownership remains a later option.

### Q2 — Persona model provider

Need to decide:

- reuse the active OpenCode provider/model
- configure a dedicated inexpensive model
- provide both with a fallback

Recommendation: dedicated lightweight structured-output model, with deterministic templates always available.

### Q3 — Project binding storage

Options:

- user-local application database only
- optional `.opencode/wife.json`
- both, with clear merge rules

Recommendation: user-local binding by default; repository file only for shareable nonpersonal recommendations.

### Q4 — Voice asset portability

Should a character package include large GPT/SoVITS weights, or reference globally registered model assets?

Recommendation: internally use asset IDs. Portable export may optionally bundle weights after explicit licensing/storage confirmation.

### Q5 — Emotional reference audio

Should emotion select different GPT-SoVITS reference samples?

Recommendation: one default reference in MVP. Add emotional references only after consistency testing.

### Q6 — Conversation memory scope

How much persona-specific history should persist?

Possible levels:

- no persistent memory
- project-local preferences only
- project conversation summaries

Recommendation: keep the initial persona request stateless except for recent spoken-line deduplication and explicit project configuration.

### Q7 — User speech input

This design covers character output. Voice input/STT should be a separate flow to avoid coupling the first MVP to microphone permissions and wake-word behavior.

### Q8 — Multiple characters simultaneously

Not required for MVP. The arbiter and window runtime should avoid assuming a single global character forever, but the first UI should display one character per window.

## Explicit non-goals for MVP

- phoneme-perfect viseme synchronization
- arbitrary simultaneous Live2D motion blending
- autonomous character conversation unrelated to work
- narration of every tool call
- replacing OpenCode's technical response
- storing hidden reasoning or chain-of-thought
- cloud character marketplace
- split panes or cross-window tab drag
