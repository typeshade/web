# TypeNN content review

## Scope reviewed

Reviewed the English and Korean published routes, shared page shell, and interactive TypeNN copy:

- `apps/typenn/src/pages/404.astro`, `index.astro`
- `apps/typenn/src/pages/api/index.astro`, `examples/index.astro`, `guide/index.astro`, `guide/execution.astro`, `guide/training.astro`, `lab/index.astro`, `playground/index.astro`
- `apps/typenn/src/pages/ko/index.astro`, `ko/api/index.astro`, `ko/examples/index.astro`, `ko/guide/index.astro`, `ko/guide/execution.astro`, `ko/guide/training.astro`, `ko/lab/index.astro`, `ko/playground/index.astro`
- `apps/typenn/src/layouts/SiteLayout.astro`
- `apps/typenn/src/components/CodeBlock.astro`, `ThemeControl.tsx`, `Playground.tsx`, `Lab.tsx`, `KernelGraph.tsx`, `lab/LineChart.tsx`, `lab/TryModel.tsx`
- `apps/typenn/src/lab/copy.ts`, `format.ts`, `types.ts`, `datasets.ts`, `keras.ts`, `train.ts`, `graph-layout.ts`; `src/hooks/useTrainingLab.ts`
- `apps/typenn/README.md`, `PRODUCT.md`

For factual checks, read the vendored `src/vendor/typenn/index.d.ts` and version record, plus the
pinned workspace TypeNN source at `sources/typenn/src/nn/optim/{optimizer,adam,sgd}.ts`,
`src/runtime/execute.ts`, its README execution rules and GPU plan assertions. Reviewed the
dataset license/citation metadata in `src/lab/keras.ts` and `scripts/fetch_datasets.py`.

## Changes made

- Replaced the home page's paired slogans with a direct description of building neural networks
  in TypeScript. Changed the execution heading to “How TypeNN executes Tensor operations.” The
  Korean copy now translates those same ideas.
- In a second prose pass, replaced the remaining home slogan about “continuing into the system,”
  along with the vague MNIST “path” and API “surface” snippets. The home now explains the concrete
  Tensor/Module operations, what TypeNN records, and which TypeShade kernels run. The Korean
  version follows the same claims and calls to action.
- Reworded the getting-started, execution and training guides to describe when `data()` runs,
  which operations the MNIST example demonstrates, and how WebGL2 handles calls it cannot run.
  Retained TypeShade's `fuse()` name where needed to explain the implementation.
- Fixed a malformed `CodeBlock` element on the English execution guide that prevented the page
  from rendering correctly.
- Clarified that TypeNN builds and schedules Tensor graphs while TypeShade compiles and runs their
  kernel functions. Narrowed the dispatch explanation to reductions with a different output
  count; the source also permits a dense layer's MatMul, bias and ReLU calls to share a dispatch.
- Corrected API and product documentation: current SGD and Adam compute gradients and update
  parameters on the device in one plan. This matches the pinned optimizer source and the training
  loop. Changed the training guide heading so it covers every execution tier, including CPU.
- Replaced the lab's English task labels and dataset names in Korean mode, translated the license
  explanations and Fashion-MNIST/IMDB class labels, and added the missing Korean dispatch labels.
  Citation titles and dataset/API identifiers remain in their source form.
- Updated the TypeNN README's development, runtime sync and check commands to match the current
  pnpm workspace. Removed the obsolete claim that Korean routes are separately authored.
- Applied the shared `InlineTypeScript` component to selected function calls and expression chains
  in home, getting-started, execution, training and API copy. Standalone API names remain plain.

## Retained content

Kept the code examples, operation names, numeric output, backend support limits, browser/runtime
disclosures, measured CPU timings and their one-machine qualification, dataset sizes, and source
citations. They remain useful and are consistent with the source or dataset metadata reviewed.
The 404 fallback is English and links to Korean home; there is no separate Korean 404 route.

Runtime and browser exception messages are still shown verbatim below localized error headings so
they retain the diagnostic text supplied by the implementation. Their exact wording can vary by
runtime and browser.

## Validation

- `PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm --filter typenn-site check` — passed.
- `PATH=/tmp/site-tools/node_modules/.bin:$PATH pnpm --filter typenn-site build` — passed; all 17
  English and Korean routes rendered. The existing Vite bundle-size warning remains.
- `git diff --check -- apps/typenn` — passed.
- Playwright browser review of all 17 built routes at 320, 390 and 1440px — each returned HTTP
  200, document width matched the viewport, all in-page fragment links resolved, and the malformed
  CodeBlock text was absent. Long code, the backend support table and mobile documentation
  navigation use their contained horizontal scrollers as expected. Full-page 320px screenshots
  for the English/Korean home, execution, lab and Playground pages are in
  `/tmp/typenn-content-review/`.
- After the second copy/highlighting pass, reviewed the updated English/Korean home, getting-started,
  execution and training routes at 320, 390 and 1440px: each returned HTTP 200, had one `h1`,
  matched document width to viewport and had no unresolved fragment links. The shared inline
  highlighter rendered its selected expressions; representative 320px full-page screenshots are
  in `/tmp/typenn-content-review-v2/`.
- Reviewed the English/Korean API pages at 390px after adding inline highlighting; all selected
  call expressions rendered as `ts-inline-code` and plain API labels remained readable.
- Fenced TypeScript rendered syntax tokens on English/Korean execution and training guides and
  Playground snippets. Inline API identifiers remain plain monospace; no highlighting issue found.

No test files were added and no vendor runtime or dependency pin was edited.
