import { type ControlProp, type ControlProps } from '../../lib/live-shader-contract.ts';
import { fetchExample, fetchIndex, fetchShare, pageLocale } from '../example-data-client.ts';
import { decodeSource } from '../source-link.ts';
import type { PlaygroundCopy, PlaygroundExample } from './contracts.ts';
import { hashParams } from './links.ts';
import { exampleFileName, FILE_PATH, MAIN_FILE } from './workspace-paths.ts';
interface OpeningOptions {
  root: HTMLElement;
  copy: PlaygroundCopy;
  examples: PlaygroundExample[];
  library: Record<string, string>;
  sample: string;
  context: { readonly fileName: string; linkedControls: string | undefined };
  applyAspect(text: string | null): void;
  nameMain(name: string): void;
  levelPicker: HTMLSelectElement;
  parensPicker: HTMLSelectElement;
  precisionPicker: HTMLSelectElement;
  minifyToggle: HTMLInputElement;
  numbersPicker: HTMLSelectElement;
  obfuscateToggle: HTMLInputElement;
  fp64Picker: HTMLSelectElement;
  enginePicker: Element | null;
}
/** Decodes the initial URL and loads example data before any editor models are created. */
export function createOpeningLoader({
  root,
  copy,
  examples,
  library,
  sample,
  context,
  applyAspect,
  nameMain,
  levelPicker,
  parensPicker,
  precisionPicker,
  minifyToggle,
  numbersPicker,
  obfuscateToggle,
  fp64Picker,
  enginePicker,
}: OpeningOptions) {
  const examplePicker = root.querySelector('[data-example]');

  /** The examples the compiler has and this build does not, from the example data the Worker
   *  serves (src/scripts/example-data-client.ts), added to the picker in a group of their own
   *  so a link can name one. Where there is no Worker, the picker keeps the build's list. */
  const addReleaseExamples = async (): Promise<void> => {
    if (!(examplePicker instanceof HTMLSelectElement)) return;
    const index = await fetchIndex();
    const fresh = (index?.examples ?? []).filter(
      (x) => x.corpus === 'shade' && !examples.some((e) => e.id === x.id),
    );
    if (fresh.length === 0) return;
    const records = await Promise.all(fresh.map((x) => fetchExample(x.id)));
    const locale = pageLocale();
    const group = document.createElement('optgroup');
    group.label = copy.releaseGroup;
    for (const record of records) {
      if (!record) continue;
      examples.push({
        id: record.id,
        source: record.source,
        title: record.title[locale],
        description: record.blurb[locale],
      });
      group.append(new Option(record.title[locale], record.id));
    }
    if (group.childElementCount > 0) examplePicker.append(group);
  };

  /** The files a link carries beside the main one, or undefined where it carries none or
   *  what it carries is not a set of files the workspace can hold. */
  const linkedFiles = async (
    packed: string | null,
  ): Promise<Record<string, string> | undefined> => {
    if (!packed) return undefined;
    const text = await decodeSource(packed);
    if (text === undefined) return undefined;
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
      const files: Record<string, string> = {};
      for (const [path, value] of Object.entries(parsed)) {
        if (typeof value !== 'string' || !FILE_PATH.test(path) || path === context.fileName)
          continue;
        files[path] = value;
      }
      return files;
    } catch {
      return undefined;
    }
  };

  /** The passes an example draws, as the workspace holds them. */
  const graphFor = (example: PlaygroundExample | undefined): { name: string; path: string }[] =>
    (example?.passes ?? []).map((p) => ({ name: p.name, path: p.file }));

  /** The pass graph a link carries, `name:path` pairs joined by commas, or undefined. */
  const linkedGraph = (packed: string | null): { name: string; path: string }[] | undefined => {
    if (!packed) return undefined;
    const graph = packed
      .split(',')
      .map((pair) => pair.split(':'))
      .filter(
        (pair): pair is [string, string] =>
          pair.length === 2 &&
          /^[A-Za-z_][A-Za-z0-9_]*$/.test(pair[0]!) &&
          FILE_PATH.test(pair[1]!),
      )
      .map(([name, path]) => ({ name, path }));
    return graph.length > 0 ? graph : undefined;
  };

  /** The files an example brings, or, for a file with no example behind it, the library files
   *  it names in an import, so a link written before the workspace had tabs still opens them. */
  const filesFor = (
    source: string,
    example: PlaygroundExample | undefined,
  ): Record<string, string> => {
    const out: Record<string, string> = {};
    const paths =
      example?.imports ?? Object.keys(library).filter((path) => source.includes(`./${path}`));
    for (const path of paths) if (library[path] !== undefined) out[path] = library[path];
    return out;
  };

  /** The controls a live example's link carries (`controls=`): for each field, its range, its
   *  step and the value it stood at. Undefined where the link carries none, or carries
   *  anything but numbers, lists of numbers and the two flags. */
  const linkedControlsOf = async (packed: string | null): Promise<ControlProps | undefined> => {
    if (!packed) return undefined;
    const text = await decodeSource(packed);
    if (text === undefined) return undefined;
    const numbers = (v: unknown): boolean =>
      (typeof v === 'number' && Number.isFinite(v)) ||
      (Array.isArray(v) &&
        v.length <= 16 &&
        v.every((n) => typeof n === 'number' && Number.isFinite(n)));
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
      const out: Record<string, ControlProp> = {};
      for (const [name, prop] of Object.entries(parsed)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || !prop || typeof prop !== 'object') continue;
        const p = prop as Record<string, unknown>;
        const keep: { -readonly [K in keyof ControlProp]?: ControlProp[K] } = {};
        for (const key of ['min', 'max', 'step', 'value'] as const)
          if (numbers(p[key])) keep[key] = p[key] as number | number[];
        if (p.color === true) keep.color = true;
        if (p.toggle === true) keep.toggle = true;
        out[name] = keep;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    } catch {
      return undefined;
    }
  };

  /** The starting values a link's controls name, by field. */
  const seedOf = (controls: ControlProps | undefined): Record<string, number[]> =>
    Object.fromEntries(
      Object.entries(controls ?? {})
        .filter(([, prop]) => prop.value !== undefined && typeof prop.value !== 'boolean')
        .map(([name, prop]) => [name, ([] as number[]).concat(prop.value as number | number[])]),
    );

  /** What the page opens with: the source in the link, else the example the link names, else
   *  the first example. */
  const openingSource = async (): Promise<{
    source: string;
    example?: PlaygroundExample;
    controls?: ControlProps;
    /** Whether the source came in the link (`code=`). */
    linked?: boolean;
    files?: Record<string, string>;
    graph?: { name: string; path: string }[];
    host?: string;
  }> => {
    await addReleaseExamples();
    let params = hashParams();
    // A short link's id: the fragment it stands for is the Worker's to hand back.
    const shared = params.get('share');
    if (shared) {
      const fragment = await fetchShare(shared);
      if (fragment) params = new URLSearchParams(fragment);
    }
    // The options come off the fragment before the first render, so the panes are painted
    // once, under the settings the link carried.
    const level = params.get('opt');
    if (level === 'O0' || level === 'O1' || level === 'O2') levelPicker.value = level;
    if (params.get('parens') === 'minimal') parensPicker.value = 'minimal';
    if (params.get('minify') === '1') minifyToggle.checked = true;
    const numbers = params.get('numbers');
    if (numbers === 'f32' || numbers === 'false') numbersPicker.value = numbers;
    if (params.get('obfuscate') === '1') obfuscateToggle.checked = true;
    if (params.get('fp64') === 'integer') fp64Picker.value = 'integer';
    if (params.get('precision') === 'mediump') precisionPicker.value = 'mediump';
    const backend = params.get('backend');
    if (
      enginePicker instanceof HTMLSelectElement &&
      (backend === 'webgpu' || backend === 'webgl2' || backend === 'cpu')
    ) {
      enginePicker.value = backend;
    }
    const linkedHost = params.get('host');
    const host = linkedHost ? await decodeSource(linkedHost) : undefined;
    const code = params.get('code');
    if (code) {
      const source = await decodeSource(code);
      if (source !== undefined) {
        const example = examples.find((candidate) => candidate.source === source);
        applyAspect(params.get('aspect'));
        const controls = await linkedControlsOf(params.get('controls'));
        if (controls) context.linkedControls = params.get('controls')!;
        // A link written before the main file had a name of its own names none: it opens
        // under its example's name, or `main.shade.ts`.
        const linkedName = params.get('name');
        nameMain(
          linkedName !== null && FILE_PATH.test(linkedName) && !linkedName.includes('/')
            ? linkedName
            : exampleFileName(example?.id),
        );
        return {
          source,
          example,
          linked: true,
          ...(controls ? { controls } : {}),
          files: await linkedFiles(params.get('files')),
          graph: linkedGraph(params.get('passes')),
          ...(host !== undefined ? { host } : {}),
        };
      }
    }
    if (params.has('blank') && root.dataset.blank) {
      nameMain(MAIN_FILE);
      return { source: root.dataset.blank };
    }
    const named = params.get('example');
    const chosen =
      examples.find((candidate) => candidate.id === named) ??
      examples.find((candidate) => candidate.id === root.dataset.defaultExample) ??
      examples[0];
    if (chosen) nameMain(exampleFileName(chosen.id));
    return { source: chosen?.source ?? sample, example: chosen };
  };
  return { openingSource, filesFor, graphFor, seedOf };
}
