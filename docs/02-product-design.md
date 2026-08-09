# Product Design

> Status: **Current** — delivered surfaces are accurate; voice configuration and behavior defaults remain planned (Milestone 5/6)

## Product modes

### Classic Mode

The application behaves as close to upstream OpenCode Desktop as possible.

- no character rendering
- no persona requests
- no TTS process
- no Wife notifications
- original sessions and tools remain available

### Wife Mode

Adds the presentation layer:

- Live2D tab, dock or dedicated window
- project-specific character selection
- short spoken updates
- expression, gesture and mouth movement
- settings and diagnostics

Classic Mode is both a user preference and a debugging boundary.

## Character registration experience

> Status: the original linear wizard was replaced during implementation by an instant "Add character" flow plus a per-character settings page (sections below). This matches the character-as-assembly model: the character exists immediately and each aspect is configured incrementally.

The settings flow (Settings → Wife → Characters) behaves like a guided configuration surface.

### Add character

Clicking "Add character" instantly inserts an empty character into the list (default name follows the UI language, e.g. "New character" / 「新角色」). No wizard, no modal — the character is created and configured afterwards.

### Character settings page

Opening a character via its Edit button shows a settings page with labelled sections:

- **Avatar** — square clickable profile picture (picked image, downscaled and stored as a data URL) and its removal.
- **General** — character name; Live2D model folder (see below).
- **Semantic mapping** — collapsible groups (states / gestures / emotions, collapsed by default) that bind the character's motions and expressions to the system semantics.
- **Danger zone** — delete the character.

All changes save immediately (no explicit save button).

### Live2D model attachment

Selecting the model folder scans the model:

- model files and textures
- motion groups and motion counts
- expressions
- LipSync parameter IDs
- EyeBlink parameter IDs
- common gaze and angle parameters
- physics and pose files

References are resolved relative to the `.model3.json` directory (including `..` segments), so any ancestor folder of the model can be picked. When the model declares no motions/expressions (common for VTube Studio packs), the top level of the model folder is scanned for loose `.motion3.json` / `.exp3.json` files. Missing physics/pose/display-info/user-data assets only warn; missing moc/textures/motions/expressions block the attach.

On desktop, folder selection uses a native directory dialog and the folder path is stored machine-locally so the Live2D runtime can read the model files (Phase A).

### Voice configuration

(Planned — Milestone 6) Choose an existing TTS engine installation, then register a voice preset:

- GPT model
- SoVITS model
- default reference audio
- reference transcript and language
- optional emotional references
- synthesis defaults

The flow must include a test sentence and show the character's mouth response.

### Behavior defaults

(Planned — Milestone 5) Speech permissions, progress update level, minimum interval and user form of address.

## Project configuration

A project should normally configure only:

- enabled/disabled
- registered character ID
- project display name
- project-specific address or relationship preset
- speech policy overrides
- background-session behavior

It must not store absolute Live2D, Python, model or audio paths.

## Active project behavior

Default rule:

> The character displayed by a window follows the project of that window's active OpenCode tab.

When the active tab changes:

1. resolve the tab's project key
2. resolve the project's character binding
3. retain the current renderer when both projects use the same character
4. otherwise transition character with a short fade
5. load that project's activity snapshot

## Speaking policy

### Always eligible

- permission required
- explicit question required
- unrecoverable or user-relevant error
- task completion

### Conditionally eligible

- meaningful phase change
- long-running task update
- important discovery
- verification progress

### Never directly narrated

- token deltas
- routine file reads
- search calls
- every shell line
- every edit operation
- internal reasoning

## Visual behavior

A visual response is not always speech.

Examples:

| Event | State | Gesture | Emotion | Speech |
|---|---|---|---|---|
| Session starts | thinking | optional | focused | optional |
| Routine work | working | none | focused | no |
| Permission | waiting_user | look_at_user | concerned | yes |
| Completion | idle | nod/celebrate | happy | yes |
| Failure | waiting_user | optional | concerned | yes |
| User typing | listening | subtle gaze | neutral | no |

## Background sessions

Default policy:

- update their own activity snapshots
- do not change the visible character
- do not issue progress speech
- completion becomes a notification
- permission/question can raise a high-priority prompt
- critical failures can interrupt when configured

## Settings ownership

| Setting | Scope |
|---|---|
| TTS executable/endpoint | machine-global |
| character assets and mappings | character-global |
| default character | user-global |
| selected character | project-local user preference |
| speech behavior | character default + project override |
| temporary mute or character change | window/session runtime |
