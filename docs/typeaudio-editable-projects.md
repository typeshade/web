# Editable agent projects: first delivery milestone

Owner direction, 2026-11-06: an agent-authored sound must open in the existing Web editor, remain editable, and save for later editing.
This milestone precedes further immersive-engine expansion. It does not wait for HRTF or a general game scheduler.

## Acceptance

- Open an agent project from JSON or the existing editor's project browser.
- Inspect and edit every procedural source's graph, code, parameters, timing and gain.
- Preserve authored trajectories and room settings in the project and expose their controls.
- Regenerate audio after source edits. Never substitute an obsolete cached render for changed source.
- Undo and redo edits; export, reopen and reload without resetting source values.
- Retain the YouTube reference and source timing. Audio editing works without connecting the external player.
- Reject invalid or stale imports without replacing a newer document.
- Verify the flow on desktop and a mobile viewport in the existing application.

The first fixtures are the six Frieren passage candidates from TypeAudio PR #28.
Their source baseline is `87295117341448ddf56e0352903f0baf6051ce85`.
The six review audio files remain separate listening references. Editable projects contain source graphs, not flattened replacement audio.

## Implementation boundary

Use a versioned project envelope around the validated editor document. Keep older scene JSON imports supported.
Keep all content needed for procedural regeneration inside the exported JSON.
Use TypeAudio's existing graph and room implementations, with an exact engine/compiler version pair.
The first composition preview may prepare audio before playback. Do not label it a completed game runtime.
Keep project conversion, validation, playback resources, state and UI components in separate modules.

Implementation is in [Web PR #47](https://github.com/typeshade/web/pull/47), on
`feat/typeaudio-editable-studies`, based on Web PR #46 at `8517faca763e75dec997fa9ed6f792f4563a1acb`.
The TypeAudio pin is `86560f83a92ff8374346157000b8a467daa39aab` (room PR #24).
The compiler pin is unchanged: `87af4eb0d9d15f02b66b8341b72cab0944290472`.
No merge or deployment is included. The existing PR chain must be reconciled before publication.

The subsequent [UX review](reviews/typeaudio-editor-ux.md) found blocking inspector reachability,
candidate-switch recovery and draft/save semantics. Functional test passes do not establish UX
acceptance. Correct these findings before releasing the first milestone.

## Authoring contract

Agents deliver a JSON file with this envelope:

```json
{
  "schema": "typeaudio.project",
  "version": 1,
  "scene": { "version": 1 }
}
```

The abbreviated `scene` above shows the envelope, not a complete valid project.
Use one of the six complete [source fixtures](../apps/typeaudio/website/public/projects/)
as the working example. `decodeProject` validates the full document before import.

| Field | Meaning and current bounds |
| --- | --- |
| `scene.name`, `start`, `end`, `loop` | Timeline name and playback range; maximum 60-second range. |
| `scene.media` | Optional reference. These fixtures retain YouTube ID `YHCqcyX9N3s`; no video is embedded. |
| `scene.cues` | Up to 24 editable layers per project, with ID, name, start, gain, mute and optional trim/fades. |
| `cue.patch.graph` | Engine-owned graph schema, parameter definitions, node connections, seeds and applied Code source. |
| `cue.patch.duration` | Graph source length, 0.02–30 seconds. Ordinary synth patches retain their existing limits. |
| `cue.space` | Source trajectory, spread and room send. 1–16 points, starting at zero; source-relative times up to 60 seconds. |
| `scene.space` | Rectangular room/materials, listener pose, early/late gains, decay, master trim and highpass. |
| `scene.origin` | Authorship, original revision and notes. User edits are carried by the current scene, not a new origin revision. |
| `audioAssets` | Optional embedded PCM for imported audio. None is needed by these procedural fixtures. |

The graph validator and compiler remain the authority for supported operations.
Code nodes use TypeAudio's bounded per-sample TypeShade subset; they are not arbitrary
TypeScript modules. The study conversion separates source material and amplitude
envelope into two Code nodes. The four exposed parameters are Pitch, Decay,
Envelope span and Character. Source positions use room coordinates in metres,
with X right, Y up and negative Z forward. Trajectory time follows the source
through trims and splits; room/source positions must stay inside the room.

Agents must keep source code, parameters and seed-bearing nodes in the project.
A preview WAV alone does not meet this milestone. Return the editable JSON alongside
any optional listening reference. Validate and compile every source before handoff.
Use an explicit listening-review status; technical checks do not select an artistic candidate.

Legacy flat version-1 scene JSON still imports and exports. Projects with space or
origin metadata use the envelope so older editors reject them rather than silently
discarding these fields. Unsupported versions and invalid documents leave the current
editor document intact. Pending imports also leave the current workspace intact;
successful imports switch to Picture. Newer edits invalidate a delayed import.

## Ownership and playback

- `project/` owns file decoding/encoding, provenance validation and the example catalog.
- `scripts/projects/` converts the authored source study into editable graphs.
- `scene/` validates space, prepares offline stereo audio in a Worker and writes stereo WAV.
- Existing document state owns layer/source/space edits, undo/redo and local persistence.
- Project, clip and room components expose those operations in the existing workspace.

The mono source renderer uses the existing engine graph implementation. One shared
room processes every source continuously, including pre-range source history.
Composition playback and WAV export consume the same prepared stereo result.
Source, timing, trim, gain, trajectory and room edits invalidate that result;
the Effects fader only changes the output level. A stale render cannot enable playback
for a newer document. Selected-layer audition remains dry and says so in the status.

The six fixtures cover three separate passages, with A/B candidates and 15, 17 and
15 layers respectively. They are not the full 189-second mix. They preserve the
study's source programs and authored settings, but the editor's 30ms source taper
and picture-range export differ from the review masters. There is no added 2.5-second
tail handle. The provenance manifest records this source-edition boundary.

The first milestone does not require R1, HRTF, acoustic ray tracing, cloud user
accounts or an R2 catalog service. Source JSON ships with the current Web app;
private R2 review audio remains a separate asset set. Shared cloud project storage
and review revisions can be added after this local editable handoff is accepted.

## Verification and next action

Run `pnpm check:typeaudio`, `pnpm test:typeaudio`, `pnpm build:typeaudio`, then
`pnpm --filter typeaudio-site test:browser`. The agent-project browser suite must
open all six fixtures, produce nonzero stereo PCM, edit parameters/code and space,
save/reopen and reproduce the edited WAV, retain reload state, reject stale/invalid
imports and pass the mobile viewport flow. Existing state/timeline/import suites
must remain green. A mobile viewport is not a physical-device audio test.

Review PR #47 and its verification record first. After an authorized merge and
deployment, verify these same user operations at `audio.typeshade.dev` and collect
listening feedback. Resume broader engine R1 work after this first milestone;
retain the [durable recovery index](https://github.com/typeshade/typeaudio/issues/26)
and the owner's SwiftShader measurement boundary.
