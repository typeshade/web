// The shape of the example data the Worker serves (docs/cloudflare.md): what
// scripts/publish-examples.ts writes to R2, what worker/index.ts reads back, and what the
// gallery and the Playground fetch from /data/examples/. Types and routes only, so the Worker
// and the browser import it without the build-time libraries.

import type { Locale } from '../i18n/locales.ts';

export type DataLocale = Locale;
export type Words = Readonly<Record<DataLocale, string>>;

/** One example in a release's index. */
export interface ExampleEntry {
  readonly id: string;
  readonly corpus: 'registry' | 'shade';
  /** A registry category, a `.shade.ts` group key, or `new` for a file no group lists yet. */
  readonly group: string;
  readonly file: string;
  readonly title: Words;
  /** The gallery's line about it, with the code marks and links the dictionaries write. */
  readonly blurb: Words;
  /** The page's <title> and meta description (src/lib/example-meta.ts). */
  readonly page: Readonly<
    Record<DataLocale, { readonly title: string; readonly description: string }>
  >;
  /** Has a GLSL ES 3.00 form. */
  readonly renderable: boolean;
  readonly twinOf?: string;
  /** The site's build carries a still for it at /stills/<id>.webp. */
  readonly still: boolean;
  /** The file on GitHub, at the commit the release was read from. */
  readonly sourceHref: string;
}

/** One example's own file in a release: the entry and its texts. */
export interface ExampleRecord extends ExampleEntry {
  readonly source: string;
  /** The line the code pane opens on, from 0. */
  readonly entryLine: number;
  readonly emitted: {
    readonly wgsl?: string;
    readonly glsl?: { readonly vertex: string; readonly fragment: string };
  };
}

export interface ReleaseIndex {
  readonly release: string;
  readonly compiler: { readonly commit: string; readonly date: string };
  readonly site: { readonly commit: string };
  readonly createdAt: string;
  readonly examples: readonly ExampleEntry[];
}

/** The bucket and the database the Worker binds (wrangler.jsonc). */
export const BUCKET = 'typeshade-data';
export const DATABASE = 'typeshade';

/** Where a release's files sit in the bucket. */
export const releaseKey = (release: string, file: string): string => `releases/${release}/${file}`;

/** A gallery entry's title and its author's name, in characters: the Playground's Submit
 *  dialog caps its fields at these, and the Worker refuses anything longer. */
export const GALLERY_TITLE_MAX = 60;
export const GALLERY_AUTHOR_MAX = 40;

/** The route the prebuilt template of an example page sits at. The Worker serves it, filled
 *  in, for an example the build did not have (worker/index.ts). */
export const TEMPLATE_ID = 'runtime-example';
