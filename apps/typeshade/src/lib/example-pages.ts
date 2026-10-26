// One page per example, at /guide/examples/<id>/: every `"use typeshade"` file the `.shade.ts`
// registry lists. The compiler's `fn()` registry (examples/index.ts) has no pages; its old
// routes redirect (src/lib/retired-examples.mjs, astro.config.mjs). The gallery's tiles link
// here instead of to GitHub, so a reader who clicks an example sees it run on the site and
// keeps the file on GitHub as one link in the footer row.
//
// Everything a page shows is read at build time: the example's own source file, the emitted
// text the compiler baked into examples/__emit-goldens__/ at the pinned commit, and the group
// the pager walks. Nothing here is copy; the words around it are `examples.page` in every
// dictionary.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  NO_STILL_REASONS,
  NO_STILL_REASON_KEYS,
  SHADE_STILL_EXAMPLES,
} from '../../scripts/artifacts.mjs';
import { TEMPLATE_ID } from './example-data.ts';
import { facts } from './examples.ts';
import { hostExampleIds } from './host-example-pages.ts';
import { playgroundExampleIds } from './playground-examples.ts';
import { SHADE_GROUPS, shadeExampleList } from './shade-examples.ts';

/** Which registry an example is written in. Every page the build writes is a `.shade.ts`
 *  example; the example data the Worker serves (src/lib/example-data.ts) still names the
 *  other one, for a release published before the `fn()` registry left the site. */
export type Corpus = 'registry' | 'shade';

/** Why the page draws no picture for one example. The sentence each one gets is copy and
 *  lives in the dictionaries under `examples.page.noPicture`; the table behind it is
 *  NO_STILL_REASONS in scripts/artifacts.mjs. */
export type NoPictureReason = 'no-glsl' | 'control' | 'texture' | 'uniform' | 'vertex-buffer';

export const noPictureReasons = NO_STILL_REASON_KEYS as readonly NoPictureReason[];

/** The emitted text of one example, as the compiler baked it at the pinned commit. An
 *  example with no GLSL ES 3.00 form has the WGSL alone. */
export interface Emitted {
  readonly wgsl: string;
  readonly glsl?: { readonly vertex: string; readonly fragment: string };
}

/** One example page. `title` is the registry's own English wording; the page reads the title
 *  and the description it shows from the dictionary. */
export interface ExamplePage {
  readonly id: string;
  readonly corpus: Corpus;
  /** The file in the compiler's examples directory, for the code frame and the GitHub link. */
  readonly file: string;
  readonly title: string;
  /** The group the pager walks: a `.shade.ts` group key. */
  readonly group: string;
  /** The page draws the example live over its build-time still. */
  readonly drawn: boolean;
  /** Why it does not, where it does not. */
  readonly reason?: NoPictureReason;
  readonly source: string;
  /** The line the code pane opens on, counted from 0. Several of these files begin with a
   *  banner comment and a block of imports, and a pane that opened there would show a reader
   *  no shader at all. */
  readonly entryLine: number;
  readonly emitted: Emitted;
  readonly previous?: string;
  readonly next?: string;
  /** The Playground opens this file from `#example=<id>`. */
  readonly inPlayground: boolean;
}

const examplesDir = path.resolve(process.cwd(), 'vendor/shader-dsl/examples');
const goldensDir = path.join(examplesDir, '__emit-goldens__');

// The compiler's own files cite its issue tracker as "<project> #1840". No page names that
// former host (scripts/check-seo.mjs enforces it, and src/lib/blurb.ts already drops the same
// citations from the registry's sentences), so the project's name comes off the number and
// the number stays. Nothing else about a file is rewritten.
const FORMER_HOST = /\bX-?GIS (#\d+)/g;
const NAMES_FORMER_HOST = /x-?gis/i;

/** One golden file, read from the pinned checkout. The compiler bakes these in its own emit
 *  suite (examples/emit-goldens.test.ts), so the text a page prints is what the compiler
 *  produced at that commit and costs the site nothing to show. A golden the build expects and
 *  does not find stops the build with the id that wanted it. */
function golden(id: string, name: string): string {
  const file = path.join(goldensDir, name);
  if (!existsSync(file)) {
    throw new Error(
      `[example-pages] '${id}' expects examples/__emit-goldens__/${name}, which the compiler pinned at ` +
        `${facts.pinnedCommit} does not have. Bake the goldens upstream, then move the pin`,
    );
  }
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  // A page prints a golden as the compiler wrote it, so nothing is rewritten here; a bake
  // that started citing the former host would have to be fixed upstream.
  if (NAMES_FORMER_HOST.test(text))
    throw new Error(
      `[example-pages] the golden examples/__emit-goldens__/${name} names the former host`,
    );
  return text;
}

/** The goldens of one example. The rule is the compiler's own: a WGSL file for every example,
 *  and both GLSL ES 3.00 stages for the ones the registry marks as having a GLSL form. */
function emittedFor(id: string, renderable: boolean): Emitted {
  const wgsl = golden(id, `${id}.wgsl`);
  if (!renderable) return { wgsl };
  return {
    wgsl,
    glsl: { vertex: golden(id, `${id}.vertex.glsl`), fragment: golden(id, `${id}.fragment.glsl`) },
  };
}

function sourceOf(file: string): string {
  const full = path.join(examplesDir, file);
  if (!existsSync(full))
    throw new Error(`[example-pages] examples/${file} is not in the pinned checkout`);
  const text = readFileSync(full, 'utf8')
    .replace(/\r\n/g, '\n')
    .trimEnd()
    .replace(FORMER_HOST, '$1');
  if (NAMES_FORMER_HOST.test(text))
    throw new Error(
      `[example-pages] examples/${file} still names the former host after the citations came off`,
    );
  return text;
}

// Where the shader starts in one of these files, so the code pane opens on it and the reader
// scrolls up for the header. A `.shade.ts` file declares a stage with `@vertex`, `@fragment`
// or `@compute`. A file with none opens on its first export. The file's own text is never
// touched.
const STAGE_LINE = /^[\t ]*(?:@vertex|@fragment|@compute)\b/;
const EXPORT_LINE = /^[\t ]*export\b/;

function entryLineOf(id: string, source: string): number {
  const lines = source.split('\n');
  const stage = lines.findIndex((line) => STAGE_LINE.test(line));
  if (stage >= 0) return stage;
  const exported = lines.findIndex((line) => EXPORT_LINE.test(line));
  if (exported >= 0) return exported;
  throw new Error(
    `[example-pages] examples/${id} declares no stage and exports nothing, so the code pane has ` +
      'no line to open on. Widen STAGE_LINE here if the compiler now writes a stage another way',
  );
}

// The order the gallery shows: the `.shade.ts` groups. The pager walks one group at a time, so
// previous and next stay inside the group a reader arrived from.
const drawn = new Set<string>(SHADE_STILL_EXAMPLES);
const reasons = NO_STILL_REASONS as Record<string, NoPictureReason>;
const inPlayground = new Set<string>(playgroundExampleIds);

/** The reason table against the registry, in both directions. An example that stops being
 *  drawable upstream needs a line here before it can reach a page as an empty frame, and a
 *  reason for an example that is drawn again is stale and says so. */
{
  const all = shadeExampleList.map((e) => e.id);
  const missing = all.filter((id) => !drawn.has(id) && !reasons[id]);
  const stale = Object.keys(reasons).filter((id) => !all.includes(id) || drawn.has(id));
  const unknown = Object.entries(reasons)
    .filter(([, r]) => !noPictureReasons.includes(r))
    .map(([id]) => id);
  const parts = [
    missing.length > 0 ? `no reason for ${missing.join(', ')}` : '',
    stale.length > 0
      ? `a reason for ${stale.join(', ')}, which the page draws or the registry has dropped`
      : '',
    unknown.length > 0 ? `an unknown reason on ${unknown.join(', ')}` : '',
  ].filter(Boolean);
  if (parts.length > 0)
    throw new Error(
      `[example-pages] NO_STILL_REASONS in scripts/artifacts.mjs is out of date (${parts.join('; ')})`,
    );
}

function withPager(group: readonly ExamplePage[]): readonly ExamplePage[] {
  return group.map((page, i) => ({
    ...page,
    ...(i > 0 ? { previous: group[i - 1]!.id } : {}),
    ...(i < group.length - 1 ? { next: group[i + 1]!.id } : {}),
  }));
}

function build(): readonly ExamplePage[] {
  const byId = new Map(shadeExampleList.map((e) => [e.id, e]));
  const shade = SHADE_GROUPS.flatMap((g) =>
    withPager(
      g.ids.map((id) => {
        const e = byId.get(id)!;
        const source = sourceOf(e.file);
        return {
          id,
          corpus: 'shade' as const,
          file: e.file,
          title: e.title,
          group: g.key,
          drawn: drawn.has(id),
          ...(reasons[id] ? { reason: reasons[id]! } : {}),
          source,
          entryLine: entryLineOf(e.file, source),
          emitted: emittedFor(id, e.renderable),
          inPlayground: inPlayground.has(id),
        };
      }),
    ),
  );
  return shade;
}

/** Every example page, in the order the gallery lists them. */
export const examplePages: readonly ExamplePage[] = build();

const pageById = new Map(examplePages.map((p) => [p.id, p]));

export function examplePage(id: string): ExamplePage {
  const page = pageById.get(id);
  if (!page) throw new Error(`[example-pages] no example '${id}' in the .shade.ts registry`);
  return page;
}

/** The routes the two dynamic route files build, one per example in each language: every
 *  `.shade.ts` example, every host example (src/lib/host-example-pages.ts), and the template
 *  the Worker fills in for an example newer than the build (worker/index.ts). */
export function examplePaths(): { params: { id: string } }[] {
  return [
    ...examplePages.map((p) => ({ params: { id: p.id } })),
    ...hostExampleIds.map((id) => ({ params: { id } })),
    { params: { id: TEMPLATE_ID } },
  ];
}

/** Where one example's file sits on GitHub, at the pinned commit. */
export function exampleSourceHref(file: string): string {
  return `${facts.mirrorUrl}/blob/${facts.pinnedCommit}/examples/${file}`;
}

/** The route of one example's page, locale-neutral. */
export function examplePath(id: string): string {
  return `/guide/examples/${id}/`;
}
