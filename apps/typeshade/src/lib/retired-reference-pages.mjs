// The language reference pages a pin removed. Each once had a page at
// /reference/functions/<name>/, and its route redirects to the page that now holds what it
// said.
//
// A plain list, because astro.config.mjs reads it before the build, where the reference's
// reader (TypeScript) cannot be imported. src/lib/language-reference.ts holds it against the
// pinned compiler, so a function that comes back stops the build until its line here goes.

/** Function name to the locale-neutral route that replaces its page. */
export const RETIRED_REFERENCE_FUNCTIONS = {
  // Compiler change 0130 (with 0140): a stage is an attribute on the function declaration, so
  // the stage calls of change 0111 are no functions. Each attribute page carries the lesson
  // the stage call's page had.
  vertex: '/reference/attributes/vertex/',
  fragment: '/reference/attributes/fragment/',
  compute: '/reference/attributes/compute/',
  workgroup_size: '/reference/attributes/workgroup_size/',
  // Compiler change 0131 removed `numerics` and put nothing in its place. Rule 6.7 is the page
  // that says so at the pin: the change removed it, and a leftover call is an unknown function
  // (TS8004).
  numerics: '/reference/rules/6-7/',
};

/** The routes the build writes as redirects, locale-neutral. */
export function retiredReferenceRedirects() {
  return Object.fromEntries(
    Object.entries(RETIRED_REFERENCE_FUNCTIONS).map(([name, to]) => [
      `/reference/functions/${name}/`,
      to,
    ]),
  );
}
