// The sections of the compiler's AUTHORING.md that a pin removed. Each once had a page at
// /guide/internals/<id>/, and before that at /guide/authoring/<id>/, which still redirects to
// it. A removed section's two routes redirect to the page that now holds what it said.
//
// A plain list, because astro.config.mjs reads it before the build, where the guide's reader
// (TypeScript) cannot be imported. src/lib/guide.ts holds it against the pinned AUTHORING.md,
// so a section that comes back stops the build until its line here goes.

/** Section id to the locale-neutral route that replaces its page. */
export const RETIRED_GUIDE_SECTIONS = {
  // Removed by compiler change 0060: AUTHORING.md teaches `"use typeshade"` alone, and the IR
  // builder's raw statements are described in the compiler's docs/ir-builder.md. The site
  // renders no page from that file; the reference page of `rawStmt` carries the same
  // description from the builder's JSDoc.
  'raw-statements': '/api/rawstmt/',
};

/** The routes the build writes as redirects, locale-neutral: each retired section's internals
 *  page and its older authoring page. */
export function retiredGuideRedirects() {
  return Object.fromEntries(
    Object.entries(RETIRED_GUIDE_SECTIONS).flatMap(([id, to]) => [
      [`/guide/internals/${id}/`, to],
      [`/guide/authoring/${id}/`, to],
    ]),
  );
}
