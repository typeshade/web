# Editor architecture

The editor uses Atomic Design for its UI and feature modules for its behavior.
Each file owns one responsibility. A component, controller, reducer or compiler
stage has one owning module; consumers import that module directly.

## UI composition

```text
editor/
  components/
    atoms/          Individual controls and visual primitives
    molecules/      Related controls, inputs, toolbars and panel framing
    organisms/      Sound, Picture, graph, project and timeline panels
  templates/        Workspace chrome and panel arrangement
  pages/            Controller-to-view composition
  providers/        Shared interaction and layout contexts
  hooks/            Feature controllers and UI interaction hooks
  state/            Document data, projection, history and restoration
  engine/           Sound and scene playback adapters
  interactions/     Menu contracts and command descriptions
  commands/         Shared application command catalog and search
  code/             Draft reconciliation, diagnostics and editor language setup
  layout/           Layout contracts, storage and application
  shared/           Small utilities with one purpose
  styles/           Ordered base, layout, control and feature styles
```

Runtime UI dependencies point from pages through templates, organisms, molecules
and atoms. A layer can reuse its peers or lower layers. Atoms and molecules receive
feature state and actions through props; they do not start document or playback
controllers. Small UI interaction and layout hooks are allowed. Type-only imports
can describe feature contracts without introducing a runtime dependency.

Every TSX module except the root entry defines one named component matching its
filename. For example, `Timeline` arranges layers, `TimelineClip` owns a clip's
gestures and `ClipHandle` renders its accessible handle. `GraphCanvas` composes
`GraphNodeCard`, `GraphConnections`, `GraphToolbar` and the searchable node picker.
`useGraphViewport` owns framing and zoom, `useGraphGestures` owns marquee/group
drags, `useGraphConnections` owns temporary cables and wire selection, and
`useGraphSelection` owns node selection. Compilation and node search have their
own controllers. Avoid forwarding barrels so an import identifies its owner.

`WorkspaceGrid` accepts panel slots. `WorkspaceShell` composes the menu, document
bar, transport, tool rail and status. `StudioPage` selects the Sound/Picture panel
composition and connects feature controllers. Keep media/viewer mounting behavior
stable when changing that composition: hidden workspaces retain session state.

`StudioApp` shows `StartPage` at `/` or `StudioPage` under `/studio/`, as one page.
`useAppRoute` owns that choice and the launch request the editor opens with.
`useStartScreen` reads Recent from `ProjectHistory` and validates a chosen file with
`readProjectFile`; the start screen never writes the working document. In the editor,
`useProjectLaunch` opens the request, keeps the URL naming the open project
(`state/documentIdentity.ts`) and calls the checkpoint in `useProjectFiles` before
it returns to the start screen.

## State and resource ownership

`useEditorDocument` owns the authoritative reducer, document revision and local
save. Document changes use this dispatch; feature hooks must not keep a second
copy of the patch or scene. `state/` stays independent of React UI and audio
resources. Its reducer owns history and gesture checkpoints, while projection,
selection, updates and restoration are separate modules.

`useEditor` only composes controllers. Its feature hooks separate playback,
recording, variation snapshots, saved sounds, clip commands, imported assets,
media and project files. Transient selection, code drafts, drag previews and
session settings belong to their corresponding controller or component.

`useAudioResources` owns one `SoundEngine` and one `SceneTransport`, and releases
them on unmount. UI components cannot construct audio contexts, nodes, workers
or engines. Playback and scene controllers retain generation guards; imports and
graph compilation retain document/owner guards. An asynchronous result must not
replace a newer edit or a different selected source.

The sound domain lives in `website/sound/`, outside the UI hierarchy. Patch types,
defaults, presets, limits and validation each have a separate owner. Envelope
sampling, delay, reverb, finite output processing and spectrum analysis also have
individual modules. Consumers import the operation they need directly.

The graph domain lives in `website/graph/`. Types,
catalog, node creation, recipes, validation, ordering, identity and parameter
layout have separate modules. `compilationClient` owns worker requests/cache;
`compiler/` separates code validation, source emission and kernel generation.
`preparePatch` resolves layer programs, `loadGraphModule` installs a module and
`dsp` executes it. The compiler remains in a lazy worker; the audio callback
does not import it. Live and finite rendering share the same graph DSP.

Connection edits, group duplication/deletion and connected-node insertion are
pure operations in the graph domain. Group copying remaps internal IDs and
retains external inputs. Validation runs before applying a structural edit.
Transient connection previews never disconnect an applied wire. `graphLayout`
and `graphGeometry` own UI placement; layout edits do not alter the compile key.
Viewport memory is bounded to 32 source owners for the current editor session.

`useCodeDocuments` owns unapplied code buffers at the page level, keyed by source
owner and node ID. It survives panel unmounts and keeps newer typing when a worker
applies an older submitted snapshot. Clean buffers follow document edits; dirty
buffers require explicit conflict resolution when applied code changes. Drafts
stay in memory and are excluded from document saves/exports. A beforeunload guard
covers unapplied edits. `codeDraft` contains the reconciliation rule.

`useMonacoEditor` owns editor instances, per-document models, cursor/view state,
local Undo and disposal. Monaco, its CSS and its editor worker load only for the
code panel, separately from the TypeShade compiler and audio worklet. Language
setup provides tokens, bounded vocabulary completion and hover help, not a full
TypeScript language server. Worker errors with explicit node/line locations get
markers only while that attempted text is still active. `codeDiagnostic` never
invents a source position for an unlocated error.

`createStudioCommands` reuses File/Edit/Window menu descriptions and adds graph,
code and workspace actions. `useCommandPalette` owns global shortcuts; the modal
`CommandPalette` owns search, result selection and focus restoration. Disabled
actions remain visible and cannot execute. `useCodeLayout` owns persisted code
placement; `WorkspaceGrid` uses the existing panel slots for horizontal/vertical
splits and code focus. Narrow layouts fall back to a horizontal split.

## Styles and extensions

`styles/index.css` is the stylesheet entry. Its imports preserve the previous
cascade order. Put changes in the stylesheet for the affected feature; do not
add another global override block at the end of the entry. Shared site tokens and
generated documentation styles retain their existing owners.

When extending the editor:

1. Put pure document behavior in `state/` or the relevant domain module. Add a
   feature action/controller when it needs resources or asynchronous work.
2. Add one UI component per file at the smallest useful composition level.
   Connect feature state at an organism or page; pass controls their data/actions.
3. Keep document edits on the existing dispatch and preserve stale-result guards.
   Give any new resource one explicit lifecycle owner.
4. Run the app's `check`, `test` and `build` scripts, then the browser suites that
   exercise the changed behavior. Broad workspace refactors require `test:browser`.

`scripts/check-editor-architecture.mjs` runs as part of `check`. It checks the
named-component convention, upward UI imports, feature controllers in primitives,
document/domain-to-UI imports, UI resource construction, direct compiler imports
and runtime import cycles. These checks protect the boundaries; review still decides
whether each module has a coherent responsibility.

## Full TypeShade function authoring

`functions/` outside the editor owns source keys, worker preparation, engine program registration,
source DSP adaptation and pure graph-instance operations. It does not import editor code.
The engine owns source reflection, typed connection validation and execution.
`useFunctionCompilation` rejects late results by source owner, document epoch and current graph identity.
`useFunctionDocuments` keeps full-module drafts on the existing document store, separately from applied source.
Monaco models share one virtual source set for imported completion, diagnostics and definition navigation.
`useFunctionEditor` owns selection and operations. `useFunctionViewport` owns transient pan/zoom and drag transactions.

Function molecules own pins, bindings, controls and edges. Function organisms compose the canvas,
inspector and code dock in existing workspace slots. The command palette includes module files and source actions.
Project version 3 preserves function documents, drafts and canvas positions. Existing graph projects keep their version and behavior.
The source transport and timeline use the existing SoundDsp/Worker/AudioWorklet pipeline.
`check-function-authoring-browser.ts` exercises source editing, wiring, live state, stale results,
file recovery, exact WAV regeneration, Picture editing and mobile viewport access.


The Network virtual module shares Monaco's project, drafts and Undo ownership with the function modules.
`useFunctionDocuments` excludes it from the engine module map. The compilation Worker applies or validates
it through the engine composition API, or projects a visual edit against the previous applied source.
Equivalent execution structure retains the original bindings and node order, so authoring-only edits do not invalidate audio.
`functionComposition` and `functionLayout` are excluded by `audioPatch`; audible function/control changes remain included.

Composition projects use version 4, sound files version 3 and browser envelopes version 3.
Automatic draft rebasing uses `reconcileDrafts` and does not count as newer user input during a protected import.
`FunctionInputRename` owns the input form; engine symbol edits preserve stable port IDs and bindings.
`check-composition-browser.ts` exercises cross-view changes, rename, source preservation, language tools,
Live continuity, empty/invalid drafts, conflicts, stale preparations, save/reopen and mobile access.
