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

Current status: implementation in progress on `feat/typeaudio-editable-studies`, based on Web PR #46 at `8517faca763e75dec997fa9ed6f792f4563a1acb`.
No merge or deployment is included in this checkpoint.
