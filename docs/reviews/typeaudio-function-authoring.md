# TypeAudio function authoring in the existing editor

Status: implementation in progress, 2026-11-07. Continues Web PR #47.
Base: Web `63216066bb8a2109d0c7e5b6286500b04ab39cb0`.
Engine: TypeAudio `ac094ecc079c92af0e7621521b3c4f3efc762d60`, PR #30.
Compiler: unchanged `87af4eb0d9d15f02b66b8341b72cab0944290472`.

## Delivery contract

The existing studio will open agent-authored function graphs, compose reusable function instances,
edit complete TypeShade modules, audition the result and save/reopen without losing source or drafts.
Node pins reflect the engine's descriptors. The editor does not add another processing language.

Function sounds enter the existing Sound/Picture workspace, transport, timeline and project history.
Applied source stays separate from incomplete drafts. Failed or stale compilation preserves current work.
Reusable function instances keep independent state. Named control edits preserve running state.

Old source projects retain their graph semantics. Projects containing function sounds use an explicit
new format version so older editors reject them instead of silently dropping their sound source.
Agent engine documents can be imported as a new standalone source through the protected project flow.

## Acceptance gates

- Create a function sound; inspect typed connections; add, duplicate, connect and remove instances.
- Use pointer and keyboard/context-menu operations; retain node positions and Undo/Redo.
- Edit a full module with TypeShade diagnostics, completion and imported helper support.
- Keep invalid drafts across selection, save/reopen, reload and protected project switches.
- Apply valid source, render audible PCM, change controls during Live and export reproducible WAV.
- Import the engine impact fixture, then save/reopen the edited source in the existing project format.
- Preserve all six earlier study fixtures and existing graph/timeline/state behavior.
- Check desktop and mobile viewport flows; do not infer physical-device deadlines from browser tests.

## Boundaries

This slice adopts E2a's mono CPU function profile. It does not implement arbitrary code-to-graph
round trips, general project graph conversion, event scheduling, a native runtime or an Unreal plugin.
The previous graph editor remains available for existing projects. No merge or production deployment
is implied. Update this record with actual commands, results and remaining limits before handoff.
