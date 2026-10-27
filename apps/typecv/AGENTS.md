# typecv website

Read the workspace [AGENTS.md](../../AGENTS.md), [content style](../../docs/content-style.md)
and [active content review](../../docs/content-review.md) before editing published text.
These record the owner's current all-site scope, English-first writing, Korean translation
policy, reference sites, Luna delegation preference and handoff state. They supersede older
local writing advice. Preserve implementation facts and source provenance.

## Build entry point

Use `pnpm --filter typecv-site build` from the workspace root. The current site is built
by Astro; `scripts/prepare.mjs` prepares runtime assets and JSON evidence. The legacy
`build.mjs` is not the production build and overwrites `dist` with the old templates.
Do not run it to validate changes to the Astro site.
