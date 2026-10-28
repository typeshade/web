// The sections of the compiler's AUTHORING.md, read once at build time. The content loader
// (src/content.config.ts) takes the bodies from here, and the English copy takes each
// section's title and description from the same read, so the two cannot drift.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { authoringSections, type AuthoringSection } from './authoring.ts';
import { RETIRED_GUIDE_SECTIONS } from './retired-guide-sections.mjs';

export const GUIDE_FILE = 'vendor/shader-dsl/AUTHORING.md';

export const guideSections: readonly AuthoringSection[] = authoringSections(
  readFileSync(path.resolve(process.cwd(), GUIDE_FILE), 'utf8'),
);

/** The id of every section with a page of its own, in the file's order. The overview is the
 *  text in front of the first heading, and it is the guide's own page. */
export const guideSectionIds: readonly string[] = guideSections
  .filter((s) => s.id !== 'overview')
  .map((s) => s.id);

// A retired section's redirect against the pinned file: a section that comes back has its own
// page again, and its old redirect would write a second file at the same route.
{
  const back = Object.keys(RETIRED_GUIDE_SECTIONS).filter((id) => guideSectionIds.includes(id));
  if (back.length > 0)
    throw new Error(
      `[guide] ${GUIDE_FILE} has the section ${back.join(', ')} again; remove its line from src/lib/retired-guide-sections.mjs`,
    );
}
