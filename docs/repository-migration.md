# Repository and deployment transition

All three sites and the gallery are deployed from `typeshade/web`. The original library working
directories remain untouched. No repository archival, DNS change or remote data migration has
been performed. The current status below supersedes the dated observations later in this file.

## Current execution status (2026-10-28)

Production operations are enabled; previews remain disabled. The seven old publishing workflows
were disabled with no active runs before activation. After cleanup merges, GitHub reports all
seven as `deleted`; a second read at 14:29 UTC confirmed no active runs. The operations guard
accepts this explicit deleted state while still checking paths and every active run status.
Missing or unreadable workflow metadata is not treated as deletion. Do not re-run setup to
inspect configuration: setup deliberately disables operations. Use the read-only readiness workflow.

The first complete production rollout uses web `40e3eabd0e707857126589b41ee150b852a1cec8`:

| Service | Successful deploy run | Version receiving 100% of traffic |
| --- | --- | --- |
| TypeCV | [40701635938](https://github.com/typeshade/web/actions/runs/40701635938) | `62841e27-ffc9-478c-981c-d3d9e823704f` |
| TypeNN | [40702329950](https://github.com/typeshade/web/actions/runs/40702329950) | `e67c2ac4-2b1d-46d5-8e5b-aee7a85d0923` |
| TypeShade | [40702781357](https://github.com/typeshade/web/actions/runs/40702781357) | `617dbfc9-8e1b-406b-a32f-e2a1f8481060` |
| Gallery | [40702781357](https://github.com/typeshade/web/actions/runs/40702781357) | `255bddf2-1415-4f0f-985f-8bdf2e27e386` |

Readiness [40701093158](https://github.com/typeshade/web/actions/runs/40701093158) and guarded
activation [40701448039](https://github.com/typeshade/web/actions/runs/40701448039) passed on the
same revision. The authenticated Cloudflare deployment API independently confirmed all four
versions at 100% on 2026-10-28 at 14:17 UTC. Existing KV, R2 and D1 resources were preserved;
D1 already contained the eight checked-in migrations. Gallery Access secrets remain in place.

GitHub-hosted public HTTP probes encounter Cloudflare's browser challenge. Deployment records
that result as **blocked**, not a successful health check, after separately confirming the uploaded
Worker version. No WAF, bot-protection or TLS settings were changed. External verification at
14:15 UTC passed 27 HTTP/API checks: EN/KO homes and Playgrounds, TypeCV lab/docs/config, protected
record-reader rejection (401 without credentials), 16-byte sample Range response (206), TypeShade
examples/releases/gallery APIs, search assets and the gallery homepage. There are 101 published
shader examples and four gallery entries. The inline issue form retains its existing disabled
state (`open: false`) and GitHub-link fallback.

Browser checks covered all three EN/KO homes at desktop/mobile widths, hydrated TypeCV lab
controls and sharing consent, and TypeNN Playground CPU MatMul in both languages (exact result `[19, 22, 43, 50]`).
TypeNN mobile navigation had no overflow at 390px. TypeShade search returned
32 results for `ocean`; EN/KO mobile menus, three example pages and the Playground worked.
All four gallery links loaded their shared shader into the Playground. No application runtime
errors were observed. Initial screenshots captured lazy images and React controls before they
were ready; scrolling and waiting for initialization confirmed they load. Google Analytics
requests and some Cloudflare RUM requests aborted during navigation; telemetry delivery was not
verified. All checked application assets loaded successfully.

A remaining TypeCV visual regression was found after hydration: the 3D empty-state message used
light-page text colors on a dark viewer. The source-pin follow-up fixes this in the lab stylesheet
and adds a computed browser contrast check for EN/KO at desktop/mobile widths. This follow-up
must pass CI and be redeployed before its correction is counted as live.

Cleanup and source-pin follow-up:

- TypeCV [#276](https://github.com/typeshade/typecv/pull/276) merged as
  `451e12ccea28397fcdec0594f1194268a57f814a`. Its merge tree equals the reviewed `d8b4df6` tree;
  no library implementation files under `src/` changed from the pinned pre-cleanup revision.
- Historical site [#242](https://github.com/typeshade/typeshade.github.io/pull/242) merged as
  `bca213452566152ed4b1b55dbdf8294c10d9a33a`. Its source/history remain available; its four
  publishing workflows are removed.
- TypeNN [#25](https://github.com/typeshade/typenn/pull/25) merged as
  `7ffc9fcb8c5558489ed583df73498431703db2c9`. Its merge tree equals reviewed `bd15afc`;
  no library implementation files under `src/` changed. Both library gitlinks now target their
  cleanup merges. TypeShade compiler pin `3e1e842` is unchanged.
- TypeCV documentation overrides preserve dated measurement paths while updating current
  operational instructions. Their source hashes and revision must match the cleanup merge.
  The source library's internal root `docs/website-migration.md` is excluded from public documentation pages
  and sitemap generation; it remains available in the library repository.

The source-pin follow-up passes local checks/builds for TypeCV (131 pages) and TypeNN
(17 pages), the three TypeCV documentation/link guards, internal-doc publication filtering,
stylesheet ownership and shared EN/KO desktop/mobile browser smoke. The 3D contrast regression
passes with the fix and fails when the previous built CSS colors are restored. The built output
was restored immediately after that negative check. CI remains required before merging this
follow-up; local success is not a remote CI result.

Local receipts are under `artifacts/migration/` in the cutover workspace: pre-cutover resource
metadata, old-workflow states, post-cutover versions, HTTP results and browser screenshots/reports.
These are ignored operational artifacts without credential values. The run/PR links and version
IDs above are the durable handoff; local paths alone are not evidence available to other sessions.

## Setup and first-rollout history

The following entries record earlier observations and the actions that resolved them. Statements
about missing environments, old versions or paused operations describe their original check time.

- Web PRs #1 through #7 were merged into `main` in order using merge commits, after the owner
  authorized the CI/CD transition. The final stack merge is `f7d4584`. At that commit, the
  application/source tree matches `9d12c05`, whose complete ten-job CI run `40671210525` passed.
  The only additional files are the read-only readiness workflow/helper/tests from PR #8.
  Post-merge run [40690726064](https://github.com/typeshade/web/actions/runs/40690726064)
  at `6f0da24` subsequently passed all ten jobs, including all four TypeCV browser shards.
- Readiness run [40688434326](https://github.com/typeshade/web/actions/runs/40688434326)
  ran inside GitHub Actions. It confirmed that production operations and previews are disabled,
  the Cloudflare credential is available at repository/organization scope, and the TypeCV
  record-reader credential is not available there. All three production environments are missing.
  The check failed on these prerequisites and skipped the environment-scoped credential jobs.
  Cloudflare write permissions were not verified by this first inspection.
- After the owner registered the administrative Actions secret, setup run
  [40695653261](https://github.com/typeshade/web/actions/runs/40695653261) passed. It created
  all three production environments with main-only branch policies, generated the TypeCV
  record-reader environment secret, and explicitly set both operation switches to false.
  Readiness run [40695996488](https://github.com/typeshade/web/actions/runs/40695996488) then
  passed all four jobs: configuration plus effective credentials and Worker deployment reads
  for all three sites, including the TypeShade gallery. These reads do not prove storage or
  deployment write permission.
- The managed executor replaces outbound GitHub authentication with its connected app identity.
  Explicitly invalid authentication also returned the same authenticated user/app in a diagnostic.
  Adding a runtime PAT or reinstalling the GitHub app did not grant environment/secret/variable
  administration. Do not repeat those steps, paste tokens into chat, put tokens in workflow
  dispatch inputs, or infer GitHub Actions credentials from executor variables.
- `setup-production.yml` provides a manual, `main`-only setup path inside GitHub Actions.
  It requires one repository Actions secret, `DEPLOYMENT_ADMIN_TOKEN`, with access to
  `typeshade/web` and Administration, Environments, Secrets and Variables read/write permissions.
  Register this credential through GitHub's secret-entry UI; the chat executor cannot write it.
  Use a fresh credential if an earlier one was disclosed, and revoke/remove the temporary
  credential after the administrative work is complete.
- Setup creates missing production environments, restricts them to the `main` branch, preserves
  existing supported protection rules and credentials, and generates a missing TypeCV
  record-reader secret directly into the environment. It keeps both operations switches false,
  verifies the written configuration, and does not run Cloudflare writes or deployment.
  Incompatible existing restrictions stop setup for review rather than being deleted.
- Closing PR #7 triggered preview cleanup despite previews never having been configured.
  Run `40689556465` failed on the absent preview account before any Worker deletion.
  Cleanup now reports that it was not attempted when previews are disabled and no account is
  configured. A retained account still permits cleanup after uploads are disabled; keep that
  account setting until existing PR Workers are removed.
- `production-operations.yml` changes the production switch through the administrative
  Actions secret. Enabling requires a successful Deployment readiness run on the same main
  commit, all seven legacy publishing workflows disabled, and no active runs for those
  workflows. Disable mode remains available for rollback without requiring readiness.
  This workflow does not deploy, change previews, or write to Cloudflare.
- Read-only checks after setup found the existing TypeCV KV namespace and all three required
  R2 buckets. The D1 migration ledger already contains the eight checked-in migrations.
  Worker traffic still targets the previous versions listed below; refresh immediately before
  dispatching production deploy. The check receipt is `artifacts/migration/pre-cutover.json`
  in the execution workspace and contains resource metadata, not credential values.

- Readiness run `40697109161` passed on `64a1a3e`. All seven legacy publishing workflows were
  then disabled. Activation run `40697767637` verified no active legacy runs and enabled
  production operations. TypeCV deploy run `40697947202` published version
  `e3916e16-f01e-4706-9c3a-642c193818d0`, but its public HTTP check failed. External checks
  returned 200 for EN/KO homepages and config (`files: true`), 401 for unauthenticated records,
  and 206 with the requested 16 bytes for the published pyramid video. A real Chromium GET
  also rendered the expected new TypeCV heading with TLS verification enabled.
- Diagnostic run `40699538503` established that GitHub-hosted runner requests to all three
  domains receive 403 with `cf-mitigated: challenge`, regardless of user agent. This is a
  Cloudflare browser challenge, not proof that the new Worker failed. Operations were paused
  using run `40699193471` while adjusting verification; legacy publishers remain disabled.
- Deployment now separately confirms the exact uploaded version receives 100% of traffic via
  Cloudflare's authenticated deployment API. Public HTTP checks distinguish a real 200 pass,
  a proven Cloudflare challenge (blocked; external browser/API verification required), and
  all other HTTP/network failures (fail). A blocked check is not reported as a health pass.
  No bot protection, WAF rule, cookie, challenge or TLS setting is modified or bypassed.

Readiness, activation and the three deployments subsequently passed; see the current execution
status above. Historical observations below describe their original check time.

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

## Historical production configuration before cutover

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

On 2026-10-28, the executor rechecked the live configuration and attempted the next setup step:

- The three upstream `main` revisions still match the source reconciliation table.
- `web` still has zero deployment environments. Creating `typecv-production` with custom
  branch restrictions returned HTTP 403 (`Resource not accessible by integration`); a
  subsequent read confirmed that no environment was created. Listing Actions variables and
  secret metadata also returned 403. Environment administration and Actions secrets/variables
  access must be granted to the GitHub connection before the executor can finish that setup.
  Do not paste credential values into chat or infer Actions readiness from local Cloudflare access.
- Created and verified the `site form` label in `typeshade/web`.
- Cloudflare Worker binding metadata and `wrangler secret list` show no GitHub App/token
  binding on `typeshade-site`, and no `RECORDS_READ_TOKEN` on `typecv-site`. The existing gallery
  has its two Access secret bindings. TypeShade's live `/data/issues/` returns `open: false`:
  its existing GitHub-link fallback remains available. Enabling the inline form additionally
  requires GitHub credentials/access and both Turnstile keys; those are not verified existing
  credentials. TypeCV's record-reader secret remains required by the new production workflow.
  Its live `/api/config/` returns `files: true`. Secret values were neither retrieved nor printed.
- TypeShade's remote D1 migration list reports no migrations to apply at this revision.
- The old publishers remain active. No workflow was in progress in the three old repositories
  at the observation time; recheck immediately before cutover.
- Curl GET checks returned HTTP 200 for all three English/Korean entry pages and the gallery.

The following pre-cutover versions were captured read-only for rollback planning. They are the
original baseline, not the currently deployed versions:

| Worker | Version receiving 100% of traffic on 2026-10-28 |
| --- | --- |
| `typecv-site` | `544aaef3-ef81-4698-99a3-aec1ff66f252` |
| `typenn-site` | `13007611-4c73-42df-a0a7-6966f1bda338` |
| `typeshade-site` | `91b566fc-5958-41c1-ba74-998dfe3a6e12` |
| `typeshade-gallery` | `cc89df04-8125-49a3-a7a0-701156296123` |

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
   compiler reports. Preserve the current GitHub-link fallback, or, when enabling the inline
   form, grant the App installation the intended Issues permission in the web repository and
   verify its runtime credentials and Turnstile key pair. The `site form` label was created
   during execution. Updating source links alone does not grant App access.
3. Merge the web changes and required predecessor PRs with operational switches still off.
   The stack is web PRs **#1 → #2 → #3 → #4 → #5 → #6 → #7**; each targets the previous
   branch, and all were still open drafts during the 2026-10-28 check. Preserve ancestry
   through the stack and verify the next PR's base/diff after each merge.
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

## Validation history

The following evidence was gathered while preparing the original review changes:

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
Its complete CI run `40659388503` at `d8b4df6` passed: Node 22/24 checks and digest comparisons,
all three GPU shards, and the aggregate WebGPU check. No failed or interrupted run is counted as
success. The app utility moves passed syntax/help checks and bounded keyframe/decoder fixtures;
long research benchmarks were not rerun merely to verify their file ownership.

Web run `40660009787` at `14a1f6c` passed all three site jobs, Python analysis and website
shards 1, 3 and 4. Shard 2 passed 100/101 tests, including the real multi-video dense run
(8 views, 12,725 points) and record/export comparison. Its remaining failure was the desktop
analysis-column width in `upstream-site.test.mjs`; the stylesheet still used equal columns
instead of giving the 3D card the intended larger share. The shared-controls keyboard
selection also failed again, so the earlier local passes did not establish its CI stability.
The stylesheet now gives the 3D card the larger share. Waiting for the combobox's
`aria-activedescendant` alone still failed in run `40667101454`, despite local passes.
The pinned rc-select implementation queues a post-open timer that resets the active option
to the selected value; holding that timer until after ArrowDown reproduced the failure
deterministically in Chromium 1194. The harness now registers for popup animation completion
before opening, waits for it with a bounded Playwright wait, then checks the keyboard target
and committed value. This tests keyboard operation after the popup is ready; it does not fix
rc-select's behavior for immediate input during its opening transition. Final remote CI must
still confirm both fixes before treating the web migration as verified.

Visual inspection subsequently found additional missing route styles: the video empty state
was dark text on a dark stage, and pipeline labels/counts ran together. Restored the pinned
source's active lab rules for empty states, pipeline/timeline controls, multi-video inputs,
viewer overlays/diagnostics, placement controls and responsive layouts in the lab stylesheet.
The global stylesheet remains unchanged. New built-page checks verify the empty-state bounds,
pipeline row/count layout and media-panel text contrast in both locales at desktop/mobile
widths; they failed on the old build at the empty-state bounds assertion. The earlier partial
upstream browser run passed its public UI/width checks but was stopped during Dense processing
to rebuild these styles, so it is not a complete suite pass.
The restored 131-page build passes the new EN/KO desktop/mobile smoke and contrast checks,
all stylesheet-ownership checks, frame navigation (1/1) and GPU preparation (2/2).
