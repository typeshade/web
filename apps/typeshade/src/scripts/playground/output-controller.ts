import type { ModuleDecl } from '../../../vendor/shader-dsl/src/core/ir/nodes.ts';
import type { EmitChoice, PlaygroundCopy, Target, View } from './contracts.ts';
import { emitGlsl, emitWgsl } from './emission.ts';
const isTarget = (view: View): view is Target =>
  view === 'wgsl' || view === 'glslVertex' || view === 'glslFragment';
const TARGET_LANGUAGE: Readonly<Record<Target, string>> = {
  wgsl: 'wgsl',
  glslVertex: 'cpp',
  glslFragment: 'cpp',
};
interface OutputState {
  readonly emitted: Partial<Record<Target, string>>;
  readonly monacoApi: any;
  readonly workspace: {
    readonly activeFile: string;
    readonly passGraph: readonly { name: string; path: string }[];
    readonly passModules: ReadonlyMap<string, ModuleDecl | undefined>;
  };
}
/** Owns output selection and discards stale asynchronous syntax highlighting. */
export function createOutputController(
  root: HTMLElement,
  copy: PlaygroundCopy,
  output: HTMLElement,
  sizeLabel: HTMLElement,
  currentChoice: () => EmitChoice,
  state: OutputState,
) {
  const reflectionPane = root.querySelector('[data-reflection]');
  const consolePane = root.querySelector('[data-console]');

  let painted = 0;

  let view: View = 'result';

  let target: Target = 'wgsl';

  /** The three texts the file at `path` emits: a pass's own, or the program's. */
  const emittedFor = (path: string): Partial<Record<Target, string>> => {
    const pass = state.workspace.passGraph.find((p) => p.path === path);
    const module = pass ? state.workspace.passModules.get(pass.name) : undefined;
    if (!pass || !module) return state.emitted;
    const choice = currentChoice();
    const glsl = emitGlsl(module, choice);
    return {
      wgsl: emitWgsl(module, choice),
      glslVertex: 'failed' in glsl ? undefined : glsl.vertex,
      glslFragment: 'failed' in glsl ? undefined : glsl.fragment,
    };
  };

  const paintOutput = (): void => {
    const token = ++painted;
    // The three texts are emitted on every compile whichever tab is up; only the one the
    // text panel is showing is written into it, and the panel is repainted on a tab switch.
    if (!isTarget(view)) return;
    // The text tabs follow the file tabs: with a pass's file in the editor they show what that
    // pass emits (compiler change 0026), and with any other file the program's.
    const source = emittedFor(state.workspace.activeFile)[target];
    if (!source) {
      output.textContent = target === 'wgsl' ? copy.noOutput : copy.noGlsl;
      sizeLabel.textContent = '';
      return;
    }
    output.textContent = source;
    sizeLabel.textContent = `${source.length} B`;
    if (!state.monacoApi) return;
    state.monacoApi.editor
      .colorize(source, TARGET_LANGUAGE[target], { tabSize: 2 })
      .then((html: string) => {
        // colorize writes every space as a non-breaking space, which a reader copying the
        // output would paste into a shader file as U+00A0 and no compiler accepts. It emits
        // the character itself, and reading innerHTML back spells that as an entity, so both
        // forms are replaced. The pane is a <pre>, so an ordinary space holds the same column.
        if (token === painted) output.innerHTML = html.replace(/&nbsp;|\u00a0/g, ' ');
      })
      .catch(() => {});
  };

  /** The one tab strip over the result column, and the panel and the controls each tab owns. */
  const tabs = [...root.querySelectorAll('[data-target]')].filter(
    (node): node is HTMLButtonElement => node instanceof HTMLButtonElement,
  );

  const resultPanel = root.querySelector('#pg-panel-result');

  const metas = [...root.querySelectorAll('[data-meta]')].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  /** Which of the three control groups in the tab row belongs to a view. */
  const metaFor = (next: View): string =>
    next === 'result' || next === 'reflection' || next === 'console' ? next : 'text';

  /** Shows one tab's panel and moves the selected state onto its tab. Nothing here compiles,
   *  emits or draws: every panel already holds what the last compile put in it, and the
   *  canvas keeps the pixels it was drawn with while it is behind another tab. */
  const selectView = (next: View, focus = false): void => {
    view = next;
    if (isTarget(next)) target = next;
    for (const tab of tabs) {
      const on = tab.dataset.target === next;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      // One roving tabindex, so Tab reaches the strip once and the arrows move inside it.
      tab.tabIndex = on ? 0 : -1;
      if (on) {
        if (isTarget(next)) output.setAttribute('aria-labelledby', tab.id);
        if (focus) tab.focus();
      }
    }
    if (resultPanel instanceof HTMLElement) resultPanel.hidden = next !== 'result';
    output.hidden = !isTarget(next);
    if (reflectionPane instanceof HTMLElement) reflectionPane.hidden = next !== 'reflection';
    if (consolePane instanceof HTMLElement) consolePane.hidden = next !== 'console';
    const wanted = metaFor(next);
    for (const meta of metas) meta.hidden = meta.dataset.meta !== wanted;
    if (isTarget(next)) paintOutput();
  };
  return {
    emittedFor,
    paintOutput,
    selectView,
    tabs,
    get view() {
      return view;
    },
    get target() {
      return target;
    },
  };
}
