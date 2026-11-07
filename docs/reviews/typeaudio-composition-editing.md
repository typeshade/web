# TypeShade composition editing

In progress on Web PR #47, 2026-11-07. Builds on the verified function-authoring checkpoint `bc38b0160e4cad7986ae241da085924cf35d5a67`.
Engine composition implementation: `2448e957e31d2fafc038b08b8582c53dd4a4812e`, PR #30.
Compiler remains `87af4eb0d9d15f02b66b8341b72cab0944290472`.

The Network source tab contains genuine TypeShade imports, explicit state/context arguments, typed function calls and a returned output. A call corresponds to a graph instance. Stable annotations retain IDs across local variable renames. Function modules retain their complete processing bodies. Unsupported composition statements keep a draft and report a source location.

Graph edits project into the same composition module, preserving unrelated functions and comments. Input rename uses TypeShade symbol edits and preserves stable pin IDs and wires. Unapplied drafts block this separate rename operation. The graph and composition apply together through the existing document and Undo history.

Composition source is authoring data in `Patch.functionComposition`; the engine function-graph schema remains version 1. Projects with composition source or drafts use version 4, sound files version 3, and browser document envelopes version 3. Earlier projects retain their original source semantics. Comment-only composition edits do not change audio identity.

Checks at the first Web checkpoint: compiler/type/architecture checks passed (226 modules); 107 unit tests passed across 21 files. Actual browser acceptance is pending. Continue with graph/code, rename, conflict, Live, save/reopen and mobile checks before recording completion. No merge or deployment.

Reusable subgraphs, event scheduling, native/Unreal execution and physical-device deadline validation remain separate work.
