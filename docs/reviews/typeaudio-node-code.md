# TypeAudio node and code relationship

Owner report, 2026-11-07: writing code inside a node does not feel connected to the visible graph.
This is a bounded follow-up to the [editor UX correction](typeaudio-editor-ux.md), in [PR #47](https://github.com/typeshade/web/pull/47).

## Observed problem

The editor exposes three different things without a clear boundary: built-in node settings, one Code node's sample body, and generated engine source.
Selecting Noise or Lowpass previously left another node's editable Code body and Apply action active.
The browser regression reproduced this before the change: selecting Noise still exposed `#apply-graph-code`.

Parameters `p0` through `p3` belong to the graph, but the code editor did not identify their actual names.
The relationship between a cable and `input` or `out` also required the user to infer the source and destination.
The default example used parameter indices directly throughout the calculation.

## Delivered behavior

| User action | Result |
| --- | --- |
| Select Noise, Lowpass or another built-in node | Show its real connections and settings. The selected node has no editable sample body or Apply action. |
| Select one Code node or its document tab | Select that node in the graph and edit only its sample body. |
| Inspect another node and return | Retain the draft, Monaco model, cursor and local code Undo. |
| Select several nodes | Show the selection and links to its members; no unrelated code remains editable. |
| Read a Code node's context bar | See the actual upstream name before `input`, and downstream names after `out`. |
| Open Bindings & state | Follow a connection to its node or focus the actual graph parameter control. |
| Complete or hover `p0`, `input` or `out` | Receive TypeShade language information plus descriptions derived from this graph. |
| Open Generated kernel | Inspect read-only engine output for the applied graph. Selecting any node exits this view. |

Code node output ports now display `out`, matching the variable in the editor.
Sample tabs identify their scope; they do not pretend to be complete TypeScript files.
The default Impact example declares meaningful local names such as `const pitch: f32 = p0;`.
This is ordinary supported source code. It does not introduce hidden aliases or rewrite user identifiers.

For the graph `Noise → Code → Lowpass → Output`, this sample body reads Noise and sends scaled samples to Lowpass:

```ts
const strength: f32 = p2;
out = input * strength;
```

`p2` refers to the graph's third exposed parameter, named Strength in this example.
Changing the display name does not change the binding index or rewrite existing code.
Unconnected `input` and unassigned parameters read zero. The UI identifies these cases.
Connection lookup uses node IDs, so duplicate display names do not change execution.

## Execution boundary

The Code editor writes a **per-sample body**, not a complete TypeScript module.
The current graph renderer runs at 48 kHz. It supplies `input`, `out`, `time`, `sampleRate`, `p0…p3` and `state0…state3`.
Local variables are recalculated for each sample. State values persist between samples and reset on Retrigger.
The graph owns cables, other nodes, parameter definitions and execution order.

TypeAudio validates this sample-body contract before execution. Its restrictions do not describe the capabilities of the TypeShade language as a whole.
Functions, imports, arbitrary loops and whole-graph TypeScript authoring remain outside this editor contract.
Generated kernel output is an inspection view, not an editable round-trip representation.

An eventual graph/code authoring model needs an engine-owned API, stable node identities and source mappings.
It must define how code edits update connections, parameters, state and errors without losing project history.
That work remains separate from this correction. Do not add a second Web-only graph language or advertise unsupported round trips.

## Ownership and preservation

`code/nodeContext.ts` derives descriptions from the engine-owned graph and definitions.
Language providers retain actual TypeShade completion/hover results; model metadata adds the graph-specific explanation.
Selection changes choose the document. They do not apply a draft or replace the saved project.
The Monaco resource stays mounted during built-in inspection to preserve editing history.

Project version 2, draft ownership keys, engine/compiler pins and authored study sources are unchanged.
Applied code remains separate from saved drafts. Existing project recovery and candidate preview behavior remain in force.

## Verification

The application implementation is `f772ecf150ab0d91ee9afae6f98194c563122985`.
The [verification receipt](typeaudio-node-code-verification.json) records commands, environment, browser suites and remaining limits.
Tests cover actual selection changes, code Undo/Redo, draft preservation, graph bindings, completion help and real AudioWorklet progress.
Unit tests cover node IDs, renamed parameters, disconnected bindings and exact PCM equality between old and clarified Impact source.

The English review covers the changed node/code tabs, connection descriptions, binding help, settings view and README.
It does not establish independent-user acceptance, physical-phone typing or full accessibility coverage.
No engine or compiler pin changed. No merge or deployment is included.
