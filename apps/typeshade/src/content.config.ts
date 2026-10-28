// The authoring guide is the compiler's own AUTHORING.md, read from the vendored checkout at
// the pinned commit, so the site never carries a copy that can drift from it. The file is one
// long document, so the loader stores one entry per top-level section and the site gives each
// section a page. Astro caches the store in node_modules/.astro, which the build script clears.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { promoteHeadings } from './lib/authoring.ts';
import { GUIDE_FILE, guideSections } from './lib/guide.ts';
import {
  guideTranslations,
  staleGuideTranslations,
  staleMessage,
  translationDir,
} from './lib/guide-translations.ts';
import { apiLoader } from './lib/api-loader.ts';
import { rulesLoader } from './lib/rules-loader.ts';
import { referenceNotesLoader } from './lib/reference-notes.ts';

const SECTIONS_MIN = 10;

const authoring: Loader = {
  name: 'authoring-guide',
  load: async ({ store, renderMarkdown, logger }) => {
    const sections = guideSections;
    if (sections.length < SECTIONS_MIN)
      throw new Error(
        `[guide] ${sections.length} sections in ${GUIDE_FILE}; the guide changed shape`,
      );
    store.clear();
    // The file the sections come from, so the cross-link plugin (src/lib/remark-api-links.mjs)
    // can tell the guide from the reference's own markdown.
    const fileURL = pathToFileURL(path.resolve(process.cwd(), GUIDE_FILE));
    for (const { id, title, order, sourceLine, description, body } of sections) {
      const data = { title, order, sourceLine, description };
      // The stored body keeps AUTHORING.md's own levels (englishHash and /llms-full.txt read
      // it); only what gets rendered is promoted, so the page's h1 is followed by h2, not h3.
      store.set({
        id,
        data,
        body,
        rendered: await renderMarkdown(promoteHeadings(body), { fileURL }),
      });
    }
    logger.info(`${sections.length} sections from ${GUIDE_FILE}`);
  },
};

// A translation of the guide: the same section ids, the body from content/guide/<locale>/.
// The reader (src/lib/guide-translations.ts) leaves out a file whose recorded English hash is
// not the pinned section's. A section with no current translation, stale or never made, is
// shown in English on that locale, under the note that says so.
const translated = (locale: string): Loader => ({
  name: `authoring-guide-${locale}`,
  load: async ({ store, renderMarkdown, logger }) => {
    const entries = guideTranslations(locale);
    store.clear();
    for (const t of entries.values()) {
      const fileURL = pathToFileURL(path.resolve(process.cwd(), t.file));
      const data = { order: t.order, sourceLine: t.sourceLine, source: t.source };
      store.set({
        id: t.id,
        data,
        body: t.body,
        rendered: await renderMarkdown(promoteHeadings(t.body), { fileURL }),
      });
    }
    for (const t of staleGuideTranslations(locale)) logger.warn(staleMessage(t));
    const missing = guideSections.filter((s) => !entries.has(s.id)).map((s) => s.id);
    if (missing.length)
      logger.warn(
        `${locale}: ${missing.length} section(s) without a translation, shown in English: ${missing.join(', ')}`,
      );
    logger.info(`${entries.size} sections from ${translationDir(locale)}`);
  },
});

export const collections = {
  // The API reference: one entry per public export, markdown fields rendered to HTML.
  api: defineCollection({ loader: apiLoader() }),
  // The design rules: one entry per rule of the compiler's reqs/, its text rendered to HTML.
  rules: defineCollection({ loader: rulesLoader() }),
  // The reference notes, one entry per note and language: each section's tokens drawn and its
  // Markdown rendered (src/lib/reference-notes.ts). Empty while no note is published.
  referenceNotes: defineCollection({ loader: referenceNotesLoader() }),
  guideKo: defineCollection({
    loader: translated('ko'),
    schema: z.object({ order: z.number(), sourceLine: z.number(), source: z.string() }),
  }),
  guide: defineCollection({
    loader: authoring,
    schema: z.object({
      title: z.string(),
      /** The section's place in AUTHORING.md, which the sidebar and the pager follow. */
      order: z.number(),
      sourceLine: z.number(),
      /** The opening sentences, where the section has prose to take them from. */
      description: z.string().optional(),
    }),
  }),
};
