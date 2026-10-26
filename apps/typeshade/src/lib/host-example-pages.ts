// The host examples (compiler change 0061): each one a `"use typeshade"` module and the
// `host.ts` that runs it, as an application writes it. The compiler lists them as `hostExamples`
// from `typeshade/examples`, generated from `examples/hosts/` with the text of both files, so
// the site reads the list and never a file. Each gets a page at /guide/examples/<id>/, beside
// the `.shade.ts` examples' pages, and a group of its own on the examples page.
//
// Everything a page shows is the compiler's at the pinned commit: the two files, the order and
// the tiers. `tiers` is checked upstream, not believed: the compiler's `gate:journeys` runs each
// host on WebGPU and on WebGL2 and its unit suite on the CPU tier, and a tier is listed exactly
// when the host's whole `run()` gives the reference with that tier alone
// (examples/hosts/_order.ts). The words around them are `examples.host` in every dictionary.
import { hostExamples } from '../../vendor/shader-dsl/examples/hosts/index.ts';
import { shortBlurb } from './blurb.ts';
import { shadeExampleIds } from './shade-examples.ts';

/** The tiers a host example can list, in the order a call tries them. */
export const HOST_TIERS = ['webgpu', 'webgl2', 'cpu'] as const;
export type HostTier = (typeof HOST_TIERS)[number];

/** One host example's page. */
export interface HostExamplePage {
  readonly id: string;
  /** The module's file and text, the path relative to the compiler's examples directory. */
  readonly shadeFile: string;
  readonly shadeSource: string;
  /** The host file's path and text. */
  readonly hostFile: string;
  readonly hostSource: string;
  readonly tiers: readonly HostTier[];
  readonly previous?: string;
  readonly next?: string;
}

// Some compiler titles open with the group's name ("Host: draw into a canvas"). The site
// shows them under the heading Host examples, so the name comes off and the rest is the title.
const TITLE_PREFIX = 'Host: ';
// The compiler cites its own proposals ("(change 0058)"), which have no page on the site.
const CHANGE_REFERENCE = /\s*\(change \d{4}\)/g;
const NAMES_FORMER_HOST = /x-?gis/i;

function check(): void {
  const problems: string[] = [];
  for (const h of hostExamples) {
    if (!h.title.trim()) problems.push(`'${h.id}' has an empty title`);
    if (shadeExampleIds.includes(h.id))
      problems.push(`'${h.id}' is also a .shade.ts example, and the two pages share a route`);
    if (h.tiers.length === 0) problems.push(`'${h.id}' lists no tier`);
    for (const tier of h.tiers)
      if (!(HOST_TIERS as readonly string[]).includes(tier))
        problems.push(`'${h.id}' lists the tier '${tier}', which the site has no words for`);
    for (const text of [h.title, h.blurb, h.shadeSource, h.hostSource])
      if (NAMES_FORMER_HOST.test(text)) problems.push(`'${h.id}' names the former host`);
  }
  if (problems.length > 0)
    throw new Error(`[host-examples] hostExamples at the pin: ${problems.join('; ')}`);
}
check();

/** Every host example's id, in the compiler's order. */
export const hostExampleIds: readonly string[] = hostExamples.map((h) => h.id);

/** The English title of each: the compiler's, without the group's name. */
export function hostTitles(): Record<string, string> {
  return Object.fromEntries(
    hostExamples.map((h) => {
      const rest = h.title.startsWith(TITLE_PREFIX) ? h.title.slice(TITLE_PREFIX.length) : h.title;
      return [h.id, rest.charAt(0).toUpperCase() + rest.slice(1)];
    }),
  );
}

/** The English line under each tile: the compiler's blurb, shortened to its first clause. */
export function hostDescriptions(): Record<string, string> {
  return Object.fromEntries(hostExamples.map((h) => [h.id, shortBlurb(h.blurb)]));
}

/** The English paragraph each page opens with: the compiler's whole blurb, less the citations
 *  of its own proposals. */
export function hostBlurbs(): Record<string, string> {
  return Object.fromEntries(
    hostExamples.map((h) => [h.id, h.blurb.replace(CHANGE_REFERENCE, '').trim()]),
  );
}

/** One locale's words for the host examples, checked against the list, so a host example added
 *  upstream cannot reach a page without them in each language. */
export function checkedHost(what: string, words: Record<string, string>): Record<string, string> {
  const missing = hostExampleIds.filter((id) => !words[id]);
  const extra = Object.keys(words).filter((id) => !hostExampleIds.includes(id));
  if (missing.length > 0) throw new Error(`[host-examples] no ${what} for ${missing.join(', ')}`);
  if (extra.length > 0)
    throw new Error(`[host-examples] ${what} for ${extra.join(', ')}, which hostExamples lacks`);
  return words;
}

/** Every host example's page, in the compiler's order, with the pager walking that order. */
export const hostExamplePages: readonly HostExamplePage[] = hostExamples.map((h, i, all) => ({
  id: h.id,
  shadeFile: h.shadeFile,
  shadeSource: h.shadeSource.replace(/\r\n/g, '\n').trimEnd(),
  hostFile: h.hostFile,
  hostSource: h.hostSource.replace(/\r\n/g, '\n').trimEnd(),
  tiers: h.tiers as readonly HostTier[],
  ...(i > 0 ? { previous: all[i - 1]!.id } : {}),
  ...(i < all.length - 1 ? { next: all[i + 1]!.id } : {}),
}));

const pageById = new Map(hostExamplePages.map((p) => [p.id, p]));

export function isHostExample(id: string): boolean {
  return pageById.has(id);
}

export function hostExamplePage(id: string): HostExamplePage {
  const page = pageById.get(id);
  if (!page) throw new Error(`[host-examples] no host example '${id}' in hostExamples`);
  return page;
}
