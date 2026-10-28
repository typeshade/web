# Repository and deployment transition

This is the handoff for moving the websites out of the library repositories. Source migration
and draft cleanup changes are in progress. No production cutover, repository archival, DNS
change or remote data migration has been performed by this work.

## Ownership

| Repository | Responsibility after cutover |
| --- | --- |
| `typeshade/web` | All three sites, shared UI, web tests, previews, deployment and site operations |
| `typeshade/typeshade` | Compiler/runtime, source documentation, examples and package releases |
| `typeshade/typenn` | Neural-network library, library tests and package releases |
| `typeshade/typecv` | Computer-vision library, library tests and package releases |
| `typeshade/typeshade.github.io` | Historical source and a pointer to this repository; no active site workflows |

Library documentation and examples remain with their implementation. The web repository reads
reviewed, pinned source revisions through submodules; it does not maintain a second editable
library implementation. Updating a source pin is a reviewed change with app validation.

Research tools are classified by what they measure or produce, not by whether they run a
browser. TypeCV retains global-descriptor training, observation expansion, focal-direction,
RGB rotation/structure benchmarks and the vanishing-point probe, with local helpers and
frozen fixtures where they formerly imported website code. Lab-specific decoder, keyframe,
KLT, ORB and phase-preparation tools move with the web app; their analyzer and command docs
move with them. The cleanup PR does not change library implementation files under `src/`.


## Source reconciliation

The original working directories have uncommitted changes. They remain untouched. Cleanup
branches use isolated worktrees under `/workspace/migration-worktrees`, based on these fetched
remote revisions:

| Source | Revision examined |
| --- | --- |
| TypeNN | `eea7f190a1df2c0591e1e72f718b109e7d06db04` |
| TypeCV | `715fd1b694508014315e1a505aa2c970051a7f3a` |
| Previous TypeShade site | `3ac1d1fd074e60708cbfeed78b42d00ec9e2e60a` |

The old local copies are not a sufficient migration baseline: remote TypeCV now includes a
multi-video/dense reconstruction lab, hardware-check pages, record collection, sample hosting
and additional tests. The TypeCV baseline was advanced from `db7216a` to `715fd1b` during
review to preserve hardware-check operations and resolve cleanup conflicts.
The previous TypeShade site also received nullable-value documentation and a compiler pin
update after the original import. Preserve these changes before merging the removal PRs.
The original files and working-tree status are fingerprinted in the verification workspace at
`artifacts/migration/original-worktrees.json`; this artifact contains hashes, not credentials.

## Observed production configuration

Read-only Cloudflare API checks on 2026-10-27 confirmed these existing custom domains:

| Domain | Worker |
| --- | --- |
| `typeshade.dev` | `typeshade-site` |
| `gallery.typeshade.dev` | `typeshade-gallery` |
| `nn.typeshade.dev` | `typenn-site` |
| `cv.typeshade.dev` | `typecv-site` |

Use these Workers and their existing storage; do not recreate the production databases or
buckets during the repository move. TypeCV now has a Worker for `/api/*` and `/sample/*` and
KV/R2 bindings, so treating it as a static-only deployment would lose functionality.

GitHub reported zero environments in `typeshade/web` during this check. Listing Actions secret
metadata returned HTTP 403 with the current integration; this does **not** establish whether a
repository or organization secret exists. Cloud-environment credential readiness also does not
establish that GitHub Actions has access to the same credential.

The old `typeshade.github.io` root and introduction URL returned HTTP 404, while
`typeshade.dev` returned HTTP 200. No new redirect has been configured. Existing Pages/domain
ownership settings must be checked separately if the old GitHub Pages address is to be served.

## Cutover sequence

1. Finish the source reconciliation and pass app/library checks. Review the cleanup PRs
   together with this repository's changes; confirm no newer upstream website changes have
   arrived since the revisions above.
2. Configure GitHub production environments (`typeshade-production`, `typenn-production`,
   `typecv-production`) and their intended branch restrictions and access controls. Verify
   Cloudflare token access to the existing Workers and required storage. TypeCV record-reader
   credentials and TypeShade issue-form GitHub App access need their own verification. The
   migrated issue form targets `typeshade/web` for site reports and `typeshade/typeshade` for
   compiler reports: grant the existing App installation the intended Issues permission in
   the web repository, verify its runtime installation credentials, and create the `site form`
   label before deploying that change. Updating source links alone does not grant App access.
3. Merge the web changes and required predecessor PRs with operational switches still off.
   `WEBSITE_OPERATIONS_ENABLED` is the explicit repository switch for production operations;
   `WEBSITE_PREVIEWS_ENABLED` separately controls isolated static previews. Preview creation
   and deletion use the fixed `CLOUDFLARE_PREVIEW_ACCOUNT_ID` repository variable; keep its
   account stable until all existing PR Workers are removed. A merge alone must
   not start a second publisher. Preview output is not proof of production storage behavior.
4. At the agreed cutover, stop the corresponding old deployment/publishing workflows and
   wait for their in-flight jobs to finish. Record current Worker deployment/version IDs and
   review any pending D1 migrations before enabling the new production operations.
5. Deploy TypeCV, then TypeNN, then TypeShade and its gallery, verifying each before continuing.
   Check real URLs, locales, assets and application behavior. Include TypeCV sample/record
   endpoints and TypeShade search, examples, sharing and gallery routes. A destructive data
   cleanup is not part of an ordinary deployment.
6. Merge the library website-removal PRs and retire the old site workflows when the replacement
   is verified. Update pinned source revisions to those cleanup commits in a subsequent web
   PR. Confirm issue routing and any external compiler-update dispatch targets before
   archiving the historical site repository. Library repositories remain active.

For rollback, use the recorded previous version for each affected Worker and verify its URLs
again. Worker rollback does not undo D1 schema changes or stored data. Re-enable an old
publisher only after disabling the new one; two repositories must not deploy the same Worker
concurrently.

## Completion record

Prepared review changes:

- [Web implementation #7](https://github.com/typeshade/web/pull/7): shared templates and UI,
  all three reconciled applications, website tests and operational workflows.
- [TypeNN cleanup #25](https://github.com/typeshade/typenn/pull/25): CPU tests 684/684,
  GPU tests 9/9, lint and package dry run passed. Retained lockfile package versions are
  unchanged; 90 site-only dependency entries were removed. Its remote CI passed.
- [TypeCV cleanup #276](https://github.com/typeshade/typecv/pull/276): reconciled through
  `715fd1b`; formatting, typecheck, build, 477 unit tests and 6 surface tests passed. The
  library retains all three GPU shards and its digest-change guard. Global-descriptor
  training remains library-owned with the same 248 catalog frames. Retained dependency
  versions are unchanged; 91 site-only entries were removed.
- [Previous TypeShade site retirement #242](https://github.com/typeshade/typeshade.github.io/pull/242):
  removes its four workflows and preserves source/history. Merge is cutover-dependent.

All three applications built successfully. TypeCV generates 131 pages with shared English and
Korean templates for the lab and diagnostics. Its new hardware-check, record comparison,
export, CPU digest, flavor and browser coverage passed 24 tests. The website suite is moved
to four CI shards in this repository; the source library keeps its own GPU shards. Python
record-analysis tests also run in a dedicated web CI job with pinned requirements; all 75
passed locally on Python 3.12. TypeNN's 8 dataset helpers, 12 graph tests, all five Keras
source datasets and the EN/KO browser smoke passed after the runtime pin update. The Keras
download check in this proxy-managed workspace required `NODE_USE_ENV_PROXY=1`.

TypeShade's build, type check, four locale/backend nullable Playground combinations and
17 benchmark unit tests (349 assertions) passed. Its extended benchmark browser run, the
full TypeCV real multi-video suite and the initial TypeCV library `test:shade` run lost their
execution sessions before a final result could be recovered. They are not recorded as
passes. The complete required CI checks remain enabled; passing focused checks does not
replace those results. App-specific evidence and remaining browser checks are in
[the TypeCV review](reviews/typecv-upstream-migration.md) and
[the TypeShade review](../apps/typeshade/docs/reviews/typeshade-upstream-migration.md).

Workflow lint, frozen workspace install, 17 deployment/scope helper tests and shared code
highlighting tests passed. The first migration CI run (`40655627199`, commit `cdb5eda`) passed
shared controls, TypeCV build/UI checks and Python analysis. It exposed TypeNN measurement
harness type errors and a missing TypeShade Playwright browser revision. The harness now has
explicit WebGPU types and passes its type check and measurement smoke. CI installs each app
test runner’s locked browser revision as well as the shared runner’s browser. Focused TypeCV regression reruns now pass for GPU preparation, camera/frame navigation,
dense activity, run options, saved results and the public Playground. The lab stylesheet
restores omitted input/command/progress controls, applies theme aliases to drawer portals,
and excludes unrelated home/docs/global rules. Final shared UI and stylesheet ownership
checks passed. The follow-up CI result must be checked before cutover. Original dirty worktree file hashes and status were verified
unchanged on 2026-10-28. No production workflow was dispatched, no production credentials
were changed and no repository was archived. A successful build or a prepared workflow is
not a completed production migration.

### CI follow-up

At `5294af4`, all three site jobs, Python record analysis, and three of the four TypeCV website
shards passed in run `40658001545`; the remaining website shard was still running at handoff
preparation. The shared-controls job hit a keyboard synchronization failure. Its test now waits
for the focused control's visible active option, and the final version passed three consecutive
local runs without changing the Select component.

TypeCV cleanup run `40655044289` passed both Node digest comparisons and GPU shards 1 and 2.
Shard 3 exposed a removed observation-expansion benchmark dependency. Commits `9977fca` and
`d8b4df6` restore library benchmarks and their local helpers/fixtures; the failing RGB GPU case
then passed, along with eight evaluation tests. The final cleanup revision is `d8b4df6`.
Its new complete CI result remains to be checked; no failed or interrupted run is counted as
success. The app utility moves passed syntax/help checks and bounded keyframe/decoder fixtures;
long research benchmarks were not rerun merely to verify their file ownership.
