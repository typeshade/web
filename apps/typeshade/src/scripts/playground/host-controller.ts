import type { TypeshadeDiagnostic } from '../../../vendor/shader-dsl/src/language-service/index.ts';
import type { startHostFrame, HostEvent, HostRun } from '../playground-host-run.ts';
import { HOST_URI, type LanguageClient } from '../playground-language.ts';
import { CONSOLE_SHOWN, createConsoleView } from './console-view.ts';
import type { PlaygroundCopy, PlaygroundExample, View } from './contracts.ts';
import { fillNumbers } from './view-helpers.ts';

interface HostContext {
  readonly client: LanguageClient | undefined;
  readonly monacoApi: any;
  readonly version: number;
  readonly documentUri: string;
  readonly view: View;
  readonly openedExample: string;
  readonly examples: readonly PlaygroundExample[];
}
interface HostOptions {
  startFrame: typeof startHostFrame;
  hostTypes: string;
  root: HTMLElement;
  copy: PlaygroundCopy;
  context: HostContext;
  fileMarker(diagnostic: TypeshadeDiagnostic): unknown;
  paintTabs(): void;
  onEdit(): void;
  selectView(view: View): void;
  sentence: ReturnType<typeof createConsoleView>['sentence'];
  paintConsole: ReturnType<typeof createConsoleView>['paintConsole'];
}
/** Owns host.ts diagnostics, explicit Run/Stop, and stale build cancellation. */
export function createHostController({
  startFrame,
  hostTypes,
  root,
  copy,
  context,
  fileMarker,
  paintTabs,
  onEdit,
  selectView,
  sentence,
  paintConsole,
}: HostOptions) {
  const w = copy.workspace;
  const consolePane = root.querySelector('[data-console]');
  const frame = root.querySelector('[data-gpu-frame]');

  // ── host.ts ────────────────────────────────────────────────────────────────────────────
  // The TypeScript an application writes around the module (compiler change 0062), in a tab
  // beside the main file. The language worker checks it against the DOM, the runtime and the
  // host view of each module it imports (playground-host-service.ts), and builds it for Run,
  // which runs it in a sandboxed frame over the canvas (playground-host-run.ts) and never on its
  // own: not on a keystroke, not from a link. A host example opens with its own host.ts; any
  // other file gets a starter written from its host face (playground-host-default.ts) the first
  // time host.ts is shown, run or downloaded.

  const HOST_TAB = 'host.ts';

  /** Where the markers on host.ts come from: its own check, apart from the compiler's. */
  const HOST_MARKERS = 'typeshade-host';

  let hostModel: any;

  /** Whether host.ts holds a text: its example's, the link's or the starter. Until then the
   *  model is empty, nothing checks it and the link carries none. */
  let hostReady = false;

  /** The text host.ts opened with, which the link need not carry; undefined for one a link
   *  brought with nothing to compare it with. */
  let hostPristine: string | undefined;

  /** Whether the reader has looked at host.ts or run it: until then it is not checked, so a
   *  reader who never opens it never downloads the declarations it is checked against. */
  let hostSeen = false;

  let hostMarkers = 0;

  let hostChecks = 0;

  let hostTimer = 0;

  /** Raised each time the page sets host.ts's text, so a starter asked for before is dropped. */
  let hostEpoch = 0;

  /** True while the page itself writes host.ts, which is no edit of the reader's. */
  let hostSetting = false;

  const hostText = (): string => (hostReady && hostModel ? (hostModel.getValue() as string) : '');

  /** Whether the link has to carry host.ts. */
  const hostCarried = (): boolean => hostReady && hostText() !== hostPristine;

  /** Asks the worker for host.ts's diagnostics and puts them on its model. */
  const checkHost = (): void => {
    if (!context.client || !hostModel || !hostReady || !hostSeen || !context.monacoApi) return;
    const asked = ++hostChecks;
    const text = hostText();
    void context.client
      .request('hostDiagnostics', HOST_URI, context.version, { text, types: hostTypes })
      .then((found) => {
        if (!found || asked !== hostChecks || text !== hostText()) return;
        hostMarkers = found.filter((diagnostic) => diagnostic.severity === 'error').length;
        context.monacoApi.editor.setModelMarkers(hostModel, HOST_MARKERS, found.map(fileMarker));
        paintTabs();
      });
  };

  /** Gives host.ts a text, or none (`undefined`), as the workspace opens. */
  const setHost = (text: string | undefined, pristine: string | undefined): void => {
    hostEpoch += 1;
    hostChecks += 1;
    hostReady = text !== undefined;
    hostPristine = pristine;
    hostMarkers = 0;
    if (hostModel) {
      hostSetting = true;
      hostModel.setValue(text ?? '');
      hostSetting = false;
      context.monacoApi?.editor.setModelMarkers(hostModel, HOST_MARKERS, []);
    }
    checkHost();
    paintTabs();
  };

  /** Writes the starter into a host.ts that has no text yet. The starter is of the main file the
   *  worker holds, so an answer about a version the editor has left is asked again. */
  const ensureHost = async (): Promise<void> => {
    if (hostReady || !context.client) return;
    const epoch = hostEpoch;
    for (let tries = 0; tries < 4; tries += 1) {
      const asked = context.version;
      const starter = await context.client.request('hostStarter', context.documentUri, asked, {});
      if (epoch !== hostEpoch || hostReady) return;
      if (starter) {
        setHost(starter, starter);
        return;
      }
      if (asked === context.version) return;
    }
  };

  /** An edit of the reader's to host.ts: checked once the typing settles, and carried by the
   *  link. It runs only on Run. */
  const hostEdited = (): void => {
    if (hostSetting) return;
    hostTicket += 1;
    window.clearTimeout(hostTimer);
    hostTimer = window.setTimeout(checkHost, 350);
    onEdit();
    paintTabs();
  };

  // Run: host.ts and the modules it imports, built by the worker, in a frame over the canvas.
  // Its console lines and errors fill the Console tab as they come, each with the line of
  // host.ts it came from; a second click stops it and removes the frame.
  const runHostButton = root.querySelector('[data-run-host]');

  const runHostLabel = root.querySelector('[data-run-host-label]');

  const hostNote = root.querySelector('[data-host-note]');

  const hostResult = root.querySelector('[data-host-result]');

  /** The line under the frame that shows what run() returned, or hides it. */
  const showHostResult = (text: string | undefined): void => {
    if (!(hostResult instanceof HTMLElement)) return;
    hostResult.textContent = text === undefined ? '' : `run() ${text}`;
    hostResult.hidden = text === undefined;
  };

  let hostRun: HostRun | undefined;

  /** Raised by every Run and Stop, so a build that comes back after either is dropped. */
  let hostTicket = 0;

  let hostList: HTMLOListElement | undefined;

  let hostLines = 0;

  let hostMore: HTMLParagraphElement | undefined;

  const syncRunHost = (): void => {
    if (!(runHostButton instanceof HTMLButtonElement)) return;
    const running = hostRun !== undefined;
    runHostButton.setAttribute('aria-pressed', String(running));
    runHostButton.querySelector('[data-icon-run]')?.toggleAttribute('hidden', running);
    runHostButton.querySelector('[data-icon-stop]')?.toggleAttribute('hidden', !running);
    // The name stays on the button when a narrow file bar shows its icon alone.
    runHostButton.setAttribute('aria-label', running ? w.stopHost : w.runHost);
    if (runHostLabel instanceof HTMLElement)
      runHostLabel.textContent = running ? w.stopHost : w.runHost;
    if (hostNote instanceof HTMLElement) hostNote.hidden = !running;
  };

  /** Removes the frame of a run, if one is up. `say` adds a line saying so to its report. */
  const stopHost = (say = false): void => {
    hostTicket += 1;
    showHostResult(undefined);
    if (!hostRun) return;
    hostRun.stop();
    hostRun = undefined;
    syncRunHost();
    if (say && consolePane instanceof HTMLElement && consolePane.dataset.report === 'host')
      consolePane.append(sentence(w.hostStopped));
  };

  /** One line of the run's report, the way a console line of the module's is drawn: where it
   *  ran, the line of host.ts it came from, then what it printed. */
  const hostLine = (method: string, source: string, text: string): void => {
    if (!hostList || !(consolePane instanceof HTMLElement)) return;
    hostLines += 1;
    consolePane.dataset.lines = String(hostLines);
    if (hostLines > CONSOLE_SHOWN) {
      hostMore ??= sentence('');
      hostMore.textContent = fillNumbers(copy.consoleMore, { more: hostLines - CONSOLE_SHOWN });
      if (!hostMore.isConnected) consolePane.append(hostMore);
      return;
    }
    const li = document.createElement('li');
    if (method === 'warn' || method === 'error') li.className = method;
    const part = (className: string, value: string): HTMLSpanElement => {
      const node = document.createElement('span');
      node.className = className;
      node.textContent = value;
      return node;
    };
    const tier = part('tier', 'host');
    tier.dataset.tier = 'host';
    li.append(tier, part('source', source), part('at', ''), part('value', text));
    hostList.append(li);
  };

  /** Brings the run's report to the front from the Result tab, where the frame shows none of
   *  it. A reader on another tab chose it and stays there. */
  const showHostReport = (): void => {
    if (context.view === 'result') selectView('console');
  };

  const onHostEvent = (event: HostEvent): void => {
    const at = (line: number | undefined): string => (line ? `${HOST_TAB}:${line}` : HOST_TAB);
    switch (event.kind) {
      case 'console':
        hostLine(event.method, at(event.line), event.text);
        return;
      case 'error':
        hostLine('error', at(event.line), event.text);
        showHostReport();
        return;
      case 'returned':
        hostLine('log', 'run()', event.text);
        // What a run returns is written to the Console tab. A run that drew nothing leaves
        // the Result tab an empty frame, so the tab with its value comes to the front; one
        // that drew keeps its picture, with the value on a line under it.
        if (event.drew) showHostResult(event.text);
        else showHostReport();
        return;
      case 'started':
        if (event.call === 'none' && consolePane instanceof HTMLElement)
          consolePane.append(sentence(w.hostNone));
        return;
      case 'unloaded':
        if (consolePane instanceof HTMLElement) consolePane.append(sentence(w.hostUnloaded));
        return;
    }
  };

  const runHost = async (): Promise<void> => {
    if (!context.client || !hostModel || !(frame instanceof HTMLElement)) return;
    stopHost();
    const ticket = hostTicket;
    hostSeen = true;
    await ensureHost();
    if (!hostReady || ticket !== hostTicket) return;
    let build = await context.client.request('hostBuild', HOST_URI, context.version, {
      text: hostText(),
    });
    // The main file moved under the build: once more, against the text the worker now holds.
    build ??= await context.client.request('hostBuild', HOST_URI, context.version, {
      text: hostText(),
    });
    if (!build || ticket !== hostTicket) return;
    checkHost();
    if (context.view !== 'result' && context.view !== 'console') selectView('result');
    hostList = document.createElement('ol');
    hostList.dataset.consoleBlock = 'host';
    hostLines = 0;
    hostMore = undefined;
    paintConsole({ report: 'host', lines: 0 }, sentence(w.hostConsole), hostList);
    for (const problem of build.problems) hostLine('error', HOST_TAB, problem);
    if (!build.host.code) return;
    const example = context.examples.find((candidate) => candidate.id === context.openedExample);
    hostRun = startFrame(
      frame,
      {
        host: build.host,
        modules: build.modules,
        ...(example?.host !== undefined ? { example: example.id } : {}),
      },
      onHostEvent,
      { background: getComputedStyle(frame).backgroundColor, title: w.hostFrame },
    );
    syncRunHost();
  };
  if (runHostButton instanceof HTMLButtonElement)
    runHostButton.addEventListener('click', () => {
      if (hostRun) stopHost(true);
      else void runHost();
    });
  return {
    HOST_TAB,
    hostTypes,
    hostText,
    hostCarried,
    checkHost,
    setHost,
    ensureHost,
    hostEdited,
    stopHost,
    get hostModel() {
      return hostModel;
    },
    set hostModel(value: any) {
      hostModel = value;
    },
    get hostReady() {
      return hostReady;
    },
    get hostPristine() {
      return hostPristine;
    },
    get hostSeen() {
      return hostSeen;
    },
    set hostSeen(value: boolean) {
      hostSeen = value;
    },
    get hostMarkers() {
      return hostMarkers;
    },
  };
}
