# TypeShade web

Websites and shared UI for TypeShade, TypeNN and TypeCV. Node 24, pnpm 10.28.2
and Bun 1.4.3 are used by CI. Each website builds and deploys independently.

| Workspace        | Domain           | Source                                                |
| ---------------- | ---------------- | ----------------------------------------------------- |
| `apps/typeshade` | typeshade.dev    | compiler pinned at `apps/typeshade/vendor/shader-dsl` |
| `apps/typenn`    | nn.typeshade.dev | library pinned at `sources/typenn`                    |
| `apps/typecv`    | cv.typeshade.dev | library and documentation pinned at `sources/typecv`  |
| `packages/ui`    | shared           | `@typeshade/site-ui`, linked with `workspace:*`       |

## Content and agent handoff

[AGENTS.md](AGENTS.md) records the owner's cross-site instructions.
[Content style](docs/content-style.md) defines the English-first writing and Korean translation
workflow. [Content review](docs/content-review.md) tracks the current all-site audit and its
verification. Read these before changing page or UI text.

## Development

```sh
git clone --recurse-submodules https://github.com/typeshade/web.git
cd web
pnpm install --frozen-lockfile
pnpm prepare:source typenn
pnpm dev:typenn
```

For TypeCV, run `pnpm prepare:source typecv` before development or a build.
TypeShade reads its pinned compiler source directly and needs no runtime build.
Submodule initialization can be limited to the selected app, as the CI workflow does.
The source repositories use their own npm lockfiles; they are not pnpm workspaces.

Use `pnpm build:typeshade`, `pnpm build:typenn`, or `pnpm build:typecv` to build one
site. The corresponding `check:*` command checks its types. Bun must be on PATH
for TypeShade's documentation validation scripts. Runtime preparation runs in each
app's prebuild hook after its source library has been built.

## Shared UI

Edit `packages/ui` and use its CSS, Astro or React subpath exports. No tarball
copying or npm publishing is needed. The app-specific GPU, learning and editor
logic stays in the app. See [UI architecture](packages/ui/README.md).
For page structure and locale data, see [Editing site pages](docs/page-templates.md).

Run `pnpm dev:ui` for the component workbench at http://localhost:4324/.
`pnpm check:ui && pnpm build:ui && pnpm test:controls && pnpm test:patterns` verifies control states,
keyboard interactions and automated accessibility. CI checks the workbench on each
PR and retains screenshots as an artifact. It has no production deployment.
See [the UI audit and adoption plan](docs/ui-audit.md) for adoption scope and app ownership boundaries.

## CI and deployment

See [the repository transition](docs/repository-migration.md) for source reconciliation,
library cleanup, operational switches and the production cutover sequence.

`Website checks` selects apps from changed paths. A change to an app or its source
pin checks that app. Shared UI, lockfile, workspace, submodule configuration or
pipeline changes check all apps in parallel. Dependency downloads are cached.
Build outputs are separate artifacts. Root documentation alone does not rebuild
sites. Selection rules have unit tests (`pnpm test:scope`).

Production deployments are manual per app, from `main`, using `Production deploy`.
Configure `CLOUDFLARE_API_TOKEN` for the selected `<site>-production` environment;
TypeCV also requires `RECORDS_READ_TOKEN`. Existing Worker names, domains and storage
are retained. Production operations stay off until `WEBSITE_OPERATIONS_ENABLED=true`.
No production deployment is performed by opening or merging the migration PR.

`WEBSITE_PREVIEWS_ENABLED=true` separately enables isolated same-repository PR previews. Before
enabling it, configure the repository variable `CLOUDFLARE_PREVIEW_ACCOUNT_ID` with a 32-character
hexadecimal ID for the Cloudflare account that owns preview Workers, and make `CLOUDFLARE_API_TOKEN`
available with access to that account. Preview Workers are named `<site>-site-pr-<number>` and
always use this preview account, independent of the production Wrangler account and Worker name;
there is no production-account fallback. They serve static assets without production storage, so
they do not validate TypeShade's live gallery/sharing endpoints or TypeCV's sample and record
endpoints. Closed PRs remove their isolated preview Workers. Production deployment records previous
versions and checks the deployed host; its summary includes Worker rollback commands, not database
rollback.

Before making this repository the production owner, verify a selected deployment
and disable that site's old repository deployment workflow to avoid competing
publishers. Existing repositories and live sites are not modified by this migration.
Legacy workflow sources are retained under `apps/typeshade/.github` as references;
only the root `.github/workflows` directory runs in this repository.

## Source versions and history

Update a library by checking out a reviewed commit in its submodule and committing
the gitlink change here. Rebuild and verify the affected app. Do not edit library
implementation files in this repository.

The TypeShade website's original Git history is retained as a merge parent. Its
compiler-rule history reader recognizes both the original and relocated gitlink
paths, so the documentation can still compare the previous pinned compiler.
`apps/typeshade/history.json` records the immutable legacy history boundary;
new pins are read from this repository's first-parent history.
TypeCV and TypeNN website snapshots include the shared-UI refactor from the
migration workspace; their library implementation history remains upstream.

## Browser checks

```sh
pnpm exec playwright install chromium
pnpm test:ui apps/typeshade/dist apps/typenn/dist apps/typecv/dist
```

The smoke checks cover English/Korean routes, desktop/mobile layout, hydrated UI,
shared CSS, persisted theme switching, and TypeNN CPU matrix results. Full app
regression commands remain in each app's package.json and scripts directories.
Large datasets and generated builds are ignored. Existing tracked fonts and
example images remain with their sites; dataset hosting remains external.
