---
name: land-pr
description: Land a typeshade.github.io pull request on main. Load this before merging any pull request here, and whenever the owner says to merge one; it runs from reading the diff to checking the deployed page.
---

# Landing a pull request

CLAUDE.md "Merging" is the policy; this is the procedure. Each step names the `gh` command and
the GitHub MCP tool that does the same; either works. `N` is the pull request number, the
repository is `typeshade/typeshade.github.io`.

Stop at the first step that fails, say which one and why, and leave the pull request open.

1. **Read the pull request and its diff.** `gh pr view N --json title,body,headRefName,headRefOid,files`
   and `gh pr diff N`; MCP `pull_request_read` with `get`, `get_files` and `get_diff`. Write
   down the head commit (`headRefOid`, `head.sha`) and what the pull request says it does.

2. **Confirm it is green and merges cleanly.**
   - Every required check (`build`) has passed on that head commit. `gh pr checks N`, or
     `gh pr view N --json statusCheckRollup`; MCP `pull_request_read` with `get_check_runs`
     and `get_status`. A check that ran on an older commit counts for nothing. A pending check
     is waited for. A red one is fixed on the branch, never bypassed.
   - The branch merges into a freshly fetched main:
     `git fetch origin main <branch>` then
     `git merge-tree --write-tree origin/main origin/<branch>`, which exits 0 when it merges
     cleanly. On a conflict, merge main into the branch, push the branch, and start again from
     step 1, since the head moved.

3. **Check the submodule pointer.** `git diff origin/main...origin/<branch> -- vendor/shader-dsl`
   prints nothing unless the pull request moves the pin; in `get_files`, `vendor/shader-dsl`
   is not listed. A pull request that moves it and is not about the pin stops here. One that is
   about the pin has had the checks in CLAUDE.md "The copy follows the pinned compiler".

4. **Read layout changes by hand.** If the diff touches `src/styles/`, a `.astro` file or
   `src/components/`, list every added or removed line that sets a width, padding or grid
   columns:

   ```sh
   git diff origin/main...origin/<branch> -- '*.css' '*.astro' \
     | grep -E '^[-+][^-+]' \
     | grep -E 'max-(width|inline-size)|max-w-|--container|--wide|--content|padding|\bp[xyibse]{0,2}-[0-9]|grid-template-columns|grid-cols-|columns:'
   ```

   Flag a removed `max-width` or `max-inline-size` with nothing in its place, and a grid whose
   column count changed. Either one is allowed only when the request asked for it in those words
   (CLAUDE.md "Layout and CSS changes"); otherwise stop and ask. Put the list in the report.

5. **Squash-merge.** Only when the owner said in this conversation to merge this pull request.
   The subject follows the log (`site: ...`, `rules: ...`, `chore: ...`) and ends in `(#N)`. The
   body says what changed and the evidence: the checks green on the head commit, and for a
   layout change the before and after measurements.
   - `gh pr merge N --squash --match-head-commit <head> --subject "..." --body "..."`. Add
     `--admin` only to bypass the missing review, and only after step 2 has passed, because it
     would bypass a red check too.
   - MCP `merge_pull_request` with `merge_method: squash`, `expectedHeadSha: <head>`,
     `commit_title` and `commit_message`.

   Never push to main and never force-push it.

6. **Verify the deploy.** Find the merge commit (`gh pr view N --json mergeCommit`) and the
   `deploy` run for it: `gh run list --workflow deploy.yml --branch main --event push --json databaseId,headSha,status,conclusion`,
   then `gh run watch <id> --exit-status`; MCP `actions_list` with `list_workflow_runs`,
   `resource_id: deploy.yml` and `branch: main`. Both jobs, `build` and `cloudflare`, succeed.
   - `deploy.yml` cancels a run on main when a newer push arrives. That is fine when the newer
     run deploys. When a cancelled run leaves the head of main with no successful deploy,
     dispatch the workflow on main: `gh workflow run deploy.yml --ref main`, MCP
     `actions_run_trigger` with `run_workflow`, `workflow_id: deploy.yml`, `ref: main`. Never
     push an empty commit to start one.
   - A run that fails is read (`gh run view <id> --log-failed`, MCP `get_job_logs`) and fixed
     in a new pull request.

7. **Spot-check the live page.** Open https://typeshade.dev on a page the pull request changed,
   in English and at `/ko/`, and confirm the change is there (the CDN can lag a few minutes).
   For a layout change, measure the same elements as in step 4 at 1440 and 390 and compare
   them with the numbers in the pull request.

8. **Report.** The merge commit, the deploy run and its result, what the live page showed, the
   list from step 4 if there was one, and every request the owner made in this session as done,
   in progress or not started (CLAUDE.md "Tracking requests"). Name the ones still open, with the
   one the owner wants most first.
