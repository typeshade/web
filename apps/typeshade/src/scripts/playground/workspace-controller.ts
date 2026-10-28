import type { ModuleDecl } from '../../../vendor/shader-dsl/src/core/ir/nodes.ts';
import type { TypeshadeDiagnostic } from '../../../vendor/shader-dsl/src/language-service/index.ts';
import type { BindingsModel } from '../playground-bindings.ts';
import { diagnosticsForDocument } from '../playground-diagnostics.ts';
import type { LanguageClient } from '../playground-language.ts';
import type { PlaygroundCopy, PlaygroundExample } from './contracts.ts';
import type { createHostController } from './host-controller.ts';
import { markerSeverity } from './monaco.ts';
import { el } from './view-helpers.ts';
import {
  FILE_PATH,
  MAIN_MODEL_URI,
  normalisePath,
  passNameOf,
  rewriteImports,
} from './workspace-paths.ts';

interface WorkspaceContext {
  readonly client: LanguageClient | undefined;
  readonly monacoApi: any;
  readonly editor: any;
  readonly model: any;
  readonly version: number;
  readonly documentUri: string;
  readonly fileName: string;
  readonly openedExample: string;
  readonly host: ReturnType<typeof createHostController>;
}
interface WorkspaceOptions {
  root: HTMLElement;
  copy: PlaygroundCopy;
  context: WorkspaceContext;
  examples: PlaygroundExample[];
  library: Record<string, string>;
  bindings: BindingsModel;
  syncDocument(): void;
  onEdit(): void;
  serviceFailed(message?: string): void;
  retireStill(): void;
  nameMain(name: string): void;
  paintOutput(): void;
}

/** Owns file models, tab navigation, renames, pass order, and model disposal. */
export function createWorkspaceController({
  root,
  copy,
  context,
  examples,
  library,
  bindings,
  syncDocument,
  onEdit,
  serviceFailed,
  retireStill,
  nameMain,
  paintOutput,
}: WorkspaceOptions) {
  const w = copy.workspace;

  // ── The workspace ──────────────────────────────────────────────────────────────────────
  // The file the canvas runs, and beside it the files it imports and any the reader adds, each
  // a model of its own under one editor and a tab over it. Every file is an open document in
  // the language worker, so an import reads the text the reader sees and an edit to an
  // imported file recompiles the program. Only the first file is a program the canvas runs;
  // the others are what it imports.

  interface WorkspaceFile {
    readonly model: any;
    readonly listener: { dispose(): void };
    markers: number;
  }

  /** The files beside the one the canvas runs, by their path from it (`lib/noise.shade.ts`),
   *  in the order they were opened. */
  const extras = new Map<string, WorkspaceFile>();

  /** The file the editor shows: '' for the one the canvas runs, else a key of `extras`. */
  let activeFile = '';

  /** The files drawn as passes before the main file each frame (compiler change 0026), in
   *  draw order: each file's path and the name its output is read by. */
  let passGraph: { name: string; path: string }[] = [];

  /** The module each pass compiled to at the version the panes show, by the pass's name;
   *  undefined for one that did not compile. */
  let passModules = new Map<string, ModuleDecl | undefined>();

  const syncPasses = (): void => {
    bindings.setPasses(passGraph.map((p) => p.name));
  };

  const fileTabs = root.querySelector('[data-file-tabs]');

  const newFileButton = root.querySelector('[data-new-file]');

  const fileError = root.querySelector('[data-file-error]');

  const uriOf = (path: string): string => new URL(path, context.documentUri).toString();

  /** The path of a workspace file by its uri, '' for the one the canvas runs. */
  const pathOfUri = (uri: string): string | undefined => {
    if (
      uri === context.documentUri ||
      uri === MAIN_MODEL_URI ||
      uri === context.model?.uri.toString()
    )
      return '';
    for (const path of extras.keys()) if (uriOf(path) === uri) return path;
    return undefined;
  };

  const sayFileError = (text: string): void => {
    if (!(fileError instanceof HTMLElement)) return;
    fileError.textContent = text;
    fileError.hidden = text === '';
  };

  /** The files the example the editor was filled from brings, as the library holds them. */
  const pristineFiles = (): Record<string, string> => {
    const example = examples.find((candidate) => candidate.id === context.openedExample);
    const out: Record<string, string> = {};
    for (const path of example?.imports ?? [])
      if (library[path] !== undefined) out[path] = library[path];
    return out;
  };

  const workspaceFiles = (): Record<string, string> =>
    Object.fromEntries([...extras].map(([path, file]) => [path, file.model.getValue() as string]));

  /** Whether the files beside the main one are other than the example's own, which is when a
   *  link has to carry them. */
  const filesMoved = (): boolean => {
    const now = workspaceFiles();
    const was = pristineFiles();
    const keys = Object.keys(now);
    return keys.length !== Object.keys(was).length || keys.some((key) => now[key] !== was[key]);
  };

  const paintTabs = (): void => {
    if (!(fileTabs instanceof HTMLElement)) return;
    // A name being typed, for a new file or a rename, keeps the strip as it is until the
    // field closes; an analysis arriving meanwhile repaints the markers on the next paint.
    if (fileTabs.querySelector('input')) return;
    fileTabs.textContent = '';
    const pristine = pristineFiles();
    const tab = (path: string, label: string): HTMLButtonElement => {
      const button = el('button', 'file-tab', label) as HTMLButtonElement;
      button.type = 'button';
      button.dataset.fileTab = path || context.fileName;
      button.title = w.renameHint;
      if (path === activeFile) button.setAttribute('aria-current', 'true');
      // A click on the tab already shown changes nothing, so the strip is not repainted
      // under a double click that is about to rename it.
      button.addEventListener('click', () => {
        if (path !== activeFile) showFile(path);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'F2' || (event.key === 'Enter' && path === activeFile)) {
          event.preventDefault();
          startRename(path);
        }
      });
      return button;
    };
    fileTabs.append(tab('', context.fileName));
    // host.ts beside the main file. It keeps its name, so it has no rename and no close.
    const hostTab = el('button', 'file-tab', context.host.HOST_TAB) as HTMLButtonElement;
    hostTab.type = 'button';
    hostTab.dataset.fileTab = context.host.HOST_TAB;
    if (activeFile === context.host.HOST_TAB) hostTab.setAttribute('aria-current', 'true');
    if (context.host.hostMarkers > 0) hostTab.classList.add('file-errors');
    if (
      context.host.hostReady &&
      context.host.hostPristine !== undefined &&
      context.host.hostText() !== context.host.hostPristine
    )
      hostTab.classList.add('file-dirty');
    hostTab.addEventListener('click', () => {
      if (activeFile !== context.host.HOST_TAB) showFile(context.host.HOST_TAB);
    });
    fileTabs.append(hostTab);
    for (const [path, file] of extras) {
      const pass = passGraph.find((p) => p.path === path);
      const button = tab(path, path);
      if (pass) button.classList.add('file-pass');
      if (pristine[path] !== undefined && pristine[path] !== file.model.getValue())
        button.classList.add('file-dirty');
      if (file.markers > 0) button.classList.add('file-errors');
      const close = el('button', 'file-close', '×') as HTMLButtonElement;
      close.type = 'button';
      const label = w.deleteFile.replace('{file}', path);
      close.setAttribute('aria-label', label);
      close.title = label;
      close.addEventListener('click', () => {
        if (window.confirm(w.confirmDelete.replace('{file}', path))) removeFile(path);
      });
      // Whether this file is drawn as a pass before the main file (compiler change 0026).
      const toggle = el(
        'button',
        'file-pass-toggle',
        pass ? `${w.pass} ${pass.name}` : w.pass,
      ) as HTMLButtonElement;
      toggle.type = 'button';
      toggle.setAttribute('aria-pressed', String(Boolean(pass)));
      toggle.title = w.passTitle.replace('{file}', path);
      toggle.addEventListener('click', () => {
        passGraph = pass
          ? passGraph.filter((p) => p.path !== path)
          : [
              ...passGraph,
              // Draw order is the order of the tabs.
              { name: passNameOf(path), path },
            ].sort(
              (a, b) => [...extras.keys()].indexOf(a.path) - [...extras.keys()].indexOf(b.path),
            );
        syncPasses();
        paintTabs();
        workspaceEdited();
      });
      const pair = el('span', 'file-pair');
      pair.append(button, toggle, close);
      fileTabs.append(pair);
    }
  };

  /** A diagnostic of a file with no prelude, as a marker on its model: its lines are the ones
   *  the service counts. */
  const fileMarker = (diagnostic: TypeshadeDiagnostic) => ({
    startLineNumber: diagnostic.range.start.line + 1,
    startColumn: diagnostic.range.start.character + 1,
    endLineNumber: diagnostic.range.end.line + 1,
    endColumn: Math.max(
      diagnostic.range.end.character + 1,
      diagnostic.range.start.line === diagnostic.range.end.line
        ? diagnostic.range.start.character + 2
        : 1,
    ),
    message: diagnostic.message,
    source: diagnostic.source === 'typescript' ? copy.sourceTypescript : copy.sourceTypeshade,
    code: String(diagnostic.code),
    severity: markerSeverity(context.monacoApi, diagnostic.severity),
  });

  /** Asks the worker about each file beside the main one and puts its diagnostics on its own
   *  model, since the list under the editor is the program's. A file with no prelude has its
   *  lines as the service counts them. */
  const paintFileMarkers = (): void => {
    if (!context.client || !context.monacoApi) return;
    const asked = context.version;
    for (const [path, file] of extras) {
      void context.client
        .request('analysis', uriOf(path), asked, {})
        .then((analysis) => {
          if (!analysis || asked !== context.version || extras.get(path) !== file) return;
          const found = diagnosticsForDocument(analysis.diagnostics, uriOf(path));
          file.markers = found.filter((diagnostic) => diagnostic.severity === 'error').length;
          context.monacoApi.editor.setModelMarkers(file.model, 'typeshade', found.map(fileMarker));
          paintTabs();
        })
        .catch((error: unknown) => {
          if (asked === context.version)
            serviceFailed(error instanceof Error ? error.message : String(error));
        });
    }
  };

  /** An edit anywhere in the workspace is an edit to the program: the main document is sent
   *  again under a new version, so every answer about the old program is dropped, and the
   *  panes and the link follow once the typing settles. */
  const workspaceEdited = onEdit;

  const addFile = (path: string, text: string): void => {
    if (!context.monacoApi || !context.client) return;
    const uri = context.monacoApi.Uri.parse(uriOf(path));
    context.monacoApi.editor.getModel(uri)?.dispose();
    const fileModel = context.monacoApi.editor.createModel(text, 'typescript', uri);
    context.client.update(uriOf(path), text, context.version);
    const listener = fileModel.onDidChangeContent(() => {
      context.client?.update(uriOf(path), fileModel.getValue(), context.version + 1);
      retireStill();
      workspaceEdited();
      paintTabs();
    });
    extras.set(path, { model: fileModel, listener, markers: 0 });
  };

  const removeFile = (path: string): void => {
    const file = extras.get(path);
    if (!file) return;
    extras.delete(path);
    passGraph = passGraph.filter((p) => p.path !== path);
    syncPasses();
    file.listener.dispose();
    file.model.dispose();
    context.client?.close(uriOf(path));
    if (activeFile === path) showFile('');
    else paintTabs();
    workspaceEdited();
  };

  // ── Names ────────────────────────────────────────────────────────────────────────────
  // The main file opens under its example's name and every tab can be renamed: a double
  // click, or F2 (and Enter on the tab shown) from the keyboard, turns the tab into a field
  // for the stem; the `.shade.ts` ending stays. An import of the renamed file in another tab
  // is rewritten to the new name, and the line under the bar says which tabs changed.

  /** Moves the file the canvas runs to a new name in the worker: the old document is closed
   *  and the text sent again under the new uri, so every answer names the new file. */
  const renameMain = (name: string): void => {
    if (name === context.fileName) return;
    const before = context.documentUri;
    nameMain(name);
    if (context.model && context.client) {
      context.client.close(before);
      syncDocument();
    }
    paintTabs();
  };

  /** Renames a workspace file ('' for the main one) to `next`, and rewrites the imports of it
   *  in the other tabs. Returns the names of the tabs whose imports changed. */
  const renameFile = (path: string, next: string): string[] => {
    const before = path === '' ? context.fileName : path;
    if (path === '') renameMain(next);
    else {
      const file = extras.get(path);
      if (!file) return [];
      const text = file.model.getValue() as string;
      const order = [...extras.keys()];
      file.listener.dispose();
      file.model.dispose();
      context.client?.close(uriOf(path));
      extras.delete(path);
      addFile(next, text);
      // The tab keeps its place in the strip, and a pass keeps its name, since the main file's
      // bindings read the pass by it.
      const moved = new Map(extras);
      extras.clear();
      for (const key of order) {
        const kept = moved.get(key === path ? next : key);
        if (kept) extras.set(key === path ? next : key, kept);
      }
      passGraph = passGraph.map((p) => (p.path === path ? { ...p, path: next } : p));
      if (activeFile === path) {
        activeFile = next;
        context.editor?.setModel(extras.get(next)?.model);
      }
    }
    const touched: string[] = [];
    const others: [string, any][] = [
      ['', context.model],
      ...[...extras].map(([key, file]): [string, any] => [key, file.model]),
      // host.ts imports the main file by its name, so its import follows a rename too.
      ...(context.host.hostReady && context.host.hostModel
        ? [[context.host.HOST_TAB, context.host.hostModel] as [string, any]]
        : []),
    ];
    for (const [key, other] of others) {
      if (key === (path === '' ? '' : next) || !other) continue;
      const importer = key === '' ? context.fileName : key;
      const text = other.getValue() as string;
      const out = rewriteImports(text, importer, before, next);
      if (out === text) continue;
      other.pushEditOperations([], [{ range: other.getFullModelRange(), text: out }], () => null);
      touched.push(importer);
    }
    workspaceEdited();
    return touched;
  };

  /** Turns the tab of `path` ('' for the main file) into a field for its new name. */
  function startRename(path: string): void {
    if (!(fileTabs instanceof HTMLElement) || !context.editor || path === context.host.HOST_TAB)
      return;
    if (fileTabs.querySelector('input')) return;
    const current = path === '' ? context.fileName : path;
    const button = [...fileTabs.querySelectorAll('[data-file-tab]')].find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.fileTab === current,
    );
    if (!button) return;
    const field = el('span', 'file-rename');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current.replace(/\.shade\.ts$/, '');
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', w.renameLabel.replace('{file}', current));
    input.dataset.renameFile = current;
    field.append(input, el('span', 'file-suffix', '.shade.ts'));
    button.replaceWith(field);
    input.focus();
    input.select();
    let done = false;
    const close = (focus: string): void => {
      done = true;
      field.remove();
      paintTabs();
      const tab = [...fileTabs.querySelectorAll('[data-file-tab]')].find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.dataset.fileTab === focus,
      );
      tab?.focus();
    };
    const finish = (commit: boolean): void => {
      if (done) return;
      if (!commit) {
        sayFileError('');
        close(current);
        return;
      }
      const stem = input.value
        .trim()
        .replace(/^\.\//, '')
        .replace(/\.shade\.ts$/, '');
      const next = `${stem}.shade.ts`;
      const why =
        stem === ''
          ? w.emptyName
          : !FILE_PATH.test(next)
            ? w.badName
            : path === '' && next.includes('/')
              ? w.mainNameSlash
              : next !== current && (next === context.fileName || extras.has(next))
                ? w.takenName
                : '';
      if (why) {
        input.setAttribute('aria-invalid', 'true');
        sayFileError(why);
        input.focus();
        return;
      }
      sayFileError('');
      if (next === current) {
        close(current);
        return;
      }
      done = true;
      field.remove();
      const touched = renameFile(path, next);
      close(next);
      if (touched.length > 0)
        sayFileError(
          w.importsRenamed
            .replace('{old}', current)
            .replace('{new}', next)
            .replace('{files}', touched.join(', ')),
        );
    };
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(false));
  }

  /** Empties the workspace down to the main file and fills it with `files`. */
  const setFiles = (
    files: Readonly<Record<string, string>>,
    graph: readonly { name: string; path: string }[] = [],
  ): void => {
    for (const [path, file] of extras) {
      file.listener.dispose();
      file.model.dispose();
      context.client?.close(uriOf(path));
    }
    extras.clear();
    for (const [path, text] of Object.entries(files)) addFile(path, text);
    passGraph = graph.filter((p) => extras.has(p.path));
    passModules = new Map();
    syncPasses();
    activeFile = '';
    if (context.editor && context.model) context.editor.setModel(context.model);
    sayFileError('');
    paintTabs();
  };

  function showFile(path: string): void {
    if (!context.editor || !context.model) return;
    if (path === context.host.HOST_TAB) {
      if (!context.host.hostModel) return;
      activeFile = context.host.HOST_TAB;
      context.host.hostSeen = true;
      context.editor.setModel(context.host.hostModel);
      paintTabs();
      paintOutput();
      void context.host.ensureHost().then(context.host.checkHost);
      return;
    }
    const file = path === '' ? undefined : extras.get(path);
    if (path !== '' && !file) return;
    activeFile = path;
    context.editor.setModel(file ? file.model : context.model);
    paintTabs();
    paintOutput();
  }

  const newFileText = (path: string): string => `"use typeshade"

// ${context.fileName} imports this file with: import { wave } from "./${path}"
export function wave(x: f32, t: f32): f32 {
  return 0.5 + 0.5 * sin(x * 6.0 + t)
}
`;

  const askFileName = (): void => {
    if (!(fileTabs instanceof HTMLElement) || !context.editor) return;
    if (fileTabs.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'lib/name.shade.ts';
    input.setAttribute('aria-label', w.newFileName);
    input.spellcheck = false;
    fileTabs.append(input);
    input.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    input.focus();
    let done = false;
    const finish = (commit: boolean): void => {
      if (done) return;
      const typed = input.value.trim();
      if (commit && typed !== '') {
        const path = normalisePath(typed);
        const why = !FILE_PATH.test(path)
          ? w.badName
          : path === context.fileName || extras.has(path)
            ? w.takenName
            : '';
        if (why) {
          input.setAttribute('aria-invalid', 'true');
          sayFileError(why);
          input.focus();
          return;
        }
        done = true;
        sayFileError('');
        input.remove();
        addFile(path, newFileText(path));
        showFile(path);
        workspaceEdited();
        return;
      }
      done = true;
      sayFileError('');
      input.remove();
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
        context.editor.focus();
      }
    });
    input.addEventListener('blur', () => {
      if (input.value.trim() === '') finish(false);
    });
  };
  if (fileTabs instanceof HTMLElement)
    fileTabs.addEventListener('dblclick', (event) => {
      const tab = (event.target as Element | null)?.closest('[data-file-tab]');
      if (!(tab instanceof HTMLElement)) return;
      const name = tab.dataset.fileTab ?? '';
      startRename(name === context.fileName ? '' : name);
    });
  if (newFileButton instanceof HTMLButtonElement)
    newFileButton.addEventListener('click', askFileName);
  return {
    uriOf,
    pathOfUri,
    workspaceFiles,
    filesMoved,
    paintTabs,
    fileMarker,
    paintFileMarkers,
    workspaceEdited,
    renameMain,
    setFiles,
    showFile,
    get extras() {
      return extras;
    },
    get activeFile() {
      return activeFile;
    },
    get passGraph() {
      return passGraph;
    },
    get passModules() {
      return passModules;
    },
    set passModules(value: Map<string, ModuleDecl | undefined>) {
      passModules = value;
    },
  };
}
