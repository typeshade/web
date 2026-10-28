# Shared UI content review

Reviewed the Astro primitives in `packages/ui/astro`, the React controls, compositions,
editorial components and theme switch, and the DOM interaction helpers. Labels, descriptions,
errors and navigation text are supplied by each application. Removed the hardcoded English
`home` suffix from the shared brand link's accessible name so Korean pages do not inherit it.

Reviewed both workbench pages and `Examples.tsx` / `Patterns.tsx`. Replaced the vague generated
source placeholder with “Generated source preview.” Retained the control-state labels and
instructions: they describe the demonstrated interaction rather than a product claim.
The workbench is an English-only, noindex development fixture. Its deliberately long Korean
button and field text exercises wrapping; it is not a separately authored Korean product page.

Shared component checks, build and browser interaction verification are recorded in the
[integrated review ledger](../content-review.md). Shared code highlighting has passed helper tests and browser rendering checks across all
three applications, including TypeShade dictionary backticks and TypeCV fenced TypeScript.
