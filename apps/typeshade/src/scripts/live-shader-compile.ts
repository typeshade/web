// The compiler, in the browser, for one live example. This module is imported lazily and is
// the only place the page reaches the vendored compiler from, so TypeScript (about a megabyte
// gzipped) stays out of a page until a reader edits something. Every instance on a page
// awaits the same import, so the chunk is fetched once however many canvases are on it.

import { projectOptions, type LiveProject } from '../lib/live-shader-project.ts';
import { compile, reflect, packModule } from '../../vendor/shader-dsl/src/index.ts';
import {
  composeSource,
  controlsFor,
  isControllable,
  isReserved,
  isPlotHostField,
  layoutFor,
  RESERVED_UNIFORMS,
  type ControlProps,
  type LiveControl,
} from '../lib/live-shader-compile-contract.ts';
import type { ShaderData } from '../lib/shader-runtime.ts';

/** One message under the canvas. `line` and `character` are one-based and already moved back
 *  into the reader's own text. `located` is false for a message about the whole module, which
 *  has no line behind it; a page that printed one would send the reader to the wrong place. */
export interface LiveDiagnostic {
  readonly message: string;
  /** The compiler's code, `TS8022` or the like. Empty on a message the page wrote itself. */
  readonly code: string;
  readonly line: number;
  readonly character: number;
  readonly located: boolean;
  readonly category: 'error' | 'warning' | 'message';
}

// The compiler at the pinned commit still prints the mirror's own name in a module-level
// diagnostic ("shader-dsl [SD0020]: ..."), and the site spells it by its release name
// everywhere else. src/lib/remark-package-name.mjs does the same rename over the guide's
// markdown; this is the runtime half, for text the build never sees.
const MIRROR_NAME = /@xgis\/shader-dsl|\bshader-dsl\b/g;
const RELEASE_NAME = 'typeshade';
const renamed = (message: string): string => message.replace(MIRROR_NAME, RELEASE_NAME);

/** A message with no line behind it. */
const unlocated = (
  message: string,
  category: LiveDiagnostic['category'] = 'error',
): LiveDiagnostic => ({
  message: renamed(message),
  code: '',
  line: 1,
  character: 1,
  located: false,
  category,
});

export interface LiveCompileResult {
  readonly diagnostics: readonly LiveDiagnostic[];
  /** The emitted program, when the compiler reported no error. */
  readonly data?: ShaderData;
  readonly controls?: readonly LiveControl[];
}

/** Compile what the reader has typed. `compile()` at the pinned commit still returns WGSL
 *  beside an error diagnostic, so the gate here is the diagnostics, the way the Playground
 *  gates its own output. */
export function compileLive(
  id: string,
  title: string,
  source: string,
  props: ControlProps = {},
  project: LiveProject = {},
): LiveCompileResult {
  const { text, offset } = composeSource(source);
  const options = projectOptions(project);
  let result: ReturnType<typeof compile>;
  try {
    result = compile(text, options);
  } catch (error) {
    return { diagnostics: [unlocated(error instanceof Error ? error.message : String(error))] };
  }

  const diagnostics: LiveDiagnostic[] = result.diagnostics.map((d) => ({
    message: renamed(
      project.files &&
        Object.keys(project.files).length > 0 &&
        d.fileName &&
        d.fileName !== options.fileName
        ? `${d.fileName}:${d.line}: ${d.message}`
        : d.message,
    ),
    code: d.code ?? '',
    line: Math.max(1, d.line - offset),
    character: d.character,
    // A diagnostic whose line falls inside the prelude belongs to the module and not to a
    // line the reader can see.
    located:
      (!project.files ||
        Object.keys(project.files).length === 0 ||
        !d.fileName ||
        d.fileName === options.fileName) &&
      d.line - offset >= 1,
    category: d.category,
  }));
  const failed = diagnostics.some((d) => d.category === 'error');
  if (failed) return { diagnostics };
  if (!result.wgsl || !result.glsl) {
    return { diagnostics: [...diagnostics, unlocated('no shader was emitted')] };
  }

  let layout;
  try {
    layout = layoutFor(id, reflect(result.module));
  } catch (error) {
    return {
      diagnostics: [
        ...diagnostics,
        unlocated(error instanceof Error ? error.message : String(error)),
      ],
    };
  }

  // A reserved field the reader has re-typed with the wrong type would be filled with numbers
  // that do not fit it, so it is reported the way the compiler reports a mistake.
  for (const field of layout.fields) {
    if (isPlotHostField(layout, field)) continue;
    if (isReserved(field.name) && field.type !== RESERVED_UNIFORMS[field.name]) {
      return {
        diagnostics: [
          ...diagnostics,
          unlocated(
            `'${field.name}' is filled by the page as ${RESERVED_UNIFORMS[field.name]}, and this declares it as ${field.type}`,
          ),
        ],
      };
    }
  }

  const uncontrolled = layout.fields.filter(
    (f) => !isReserved(f.name) && !isPlotHostField(layout, f) && !isControllable(f.type),
  );
  const data: ShaderData = {
    id,
    title,
    wgsl: result.wgsl,
    manifest: packModule(result.module),
    vertex: result.glsl.vertex,
    fragment: result.glsl.fragment,
    layout,
    controls: {},
  };
  return {
    diagnostics: [
      ...diagnostics,
      ...uncontrolled.map((f) =>
        unlocated(`'${f.name}: ${f.type}' has no control, so it stays at zero`, 'warning'),
      ),
    ],
    data,
    controls: controlsFor(layout, props),
  };
}
