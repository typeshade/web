# Working in this repository with Claude Code

Read `DESIGN.md` for the writing and design rules and `.claude/skills/typeshade-site/SKILL.md`
for the maintenance workflow. This file adds what keeps the copy true to the compiler it
documents.

## The language of the conversation

Answer the owner in Korean, every reply, from the first to the last of a session: a status
report, a question, a summary after a merge. What goes into the repository keeps the language
it has: code, comments, commit messages and pull request titles and bodies in English, and the
Korean pages and the Korean dictionary in Korean as `.claude/skills/typeshade-site/SKILL.md`
writes them.

## Korean published content

Load `.claude/skills/readable-korean/SKILL.md` before writing or reviewing Korean page copy,
translations, headings or labels. It records the owner's preference for neutral, readable,
Wikipedia-like explanations, polite formal endings such as `~입니다` and `~합니다`, established
terminology and English when it improves clarity. The current preference for polite formal
endings supersedes the earlier plain explanatory register. Keep technical facts, source parity
and localization wiring intact.

## Writing and configuration management

Every reply to the owner and every task follows two disciplines from aircraft maintenance
practice. The writing follows the principles of ASD-STE100, Simplified Technical English. The
work follows the configuration management functions of SAE EIA-649 and ISO 10007. Both are
local conventions, and they claim no compliance or certification. The site's pages also follow
`DESIGN.md` (Voice), which states the same principles for page copy.

**Writing.**

- Keep descriptive text and procedures apart. Write a procedure as numbered steps in the
  imperative, with one action in each step.
- Give each sentence one topic. Keep a step to 20 words and a descriptive sentence to 25. Give
  each paragraph one topic.
- Use one term for one thing. Use the exact identifier of each file, page, check and command.
- Use the active voice when the actor is known. Do not invent an actor.
- Put a warning before the step it applies to. Name an action that cannot be undone (a merge,
  a force push, a deletion) before it is done.
- Keep facts, inferences, proposals, decisions and observed results apart. Label each one when
  the difference matters.
- A reply in Korean applies these principles in Korean: short sentences, one topic in each, one
  action in each step, the same term for the same thing. ASD-STE100's dictionary is English and
  governs only English text.

**Configuration management.**

- Identification. Name each configuration item by its identifier: a repository, a branch, a
  commit, a pull request, a compiler proposal, the submodule pin, a deployment or a required
  check. "The latest" is no identifier. A commit hash is one.
- Baselines. `main` at a commit is this repository's baseline. The pin `vendor/shader-dsl` is
  its baseline of the compiler. The live site is the deployment of one `main` commit.
- Change control. Change a baseline only through a pull request. A pin moves only with the
  checks of "The copy follows the pinned compiler". The approval is a review or the owner's
  go-ahead in the conversation (Merging). A pull request does only what its description says.
  One pull request carries one change, so two unrelated changes are two pull requests.
- Status accounting. Record the status of each request and each change: not started, in
  progress or done (Tracking requests). A status report names each one with its identifiers.
  List each open item with its reason and its next action: deferred work, a compiler proposal
  this repository still owes, a check that is not green.
- Verification and audit. Support a claim of completion with the checks that actually ran:
  the command or check, the date, the configuration (commit, pin, tool versions) and the
  result. Functional verification (the build, the `qa:*` passes, the browser checks) and the
  document audit (the pages and records match the pinned compiler) are separate. One does not
  replace the other. Report a check that did not run as not run.
- Deviations. Record each difference between the request and the delivered work on the pull
  request, with its disposition: closed, accepted by the owner, or open.

Each task runs in the order of a maintenance task card:

1. Identify the request, the configuration items it touches and their baselines.
2. Find the change record that authorizes the change, or open one.
3. Make the change inside what that record declares.
4. Verify the change with the functional checks and the document audit.
5. Record what was done, on which configuration, what was verified and what remains open.
6. Report the status of every request to the owner.

## The copy follows the pinned compiler

`vendor/shader-dsl` is the compiler, pinned as a git submodule. A page, a component or a script
that names something the compiler removed is wrong even when the build is green, so moving the
pin is a step with checks, not a memory:

- When a change moves the pin, run
  `bun vendor/shader-dsl/scripts/downstream-impact.ts --repo typeshade.github.io --submodule vendor/shader-dsl`
  and fix every line it lists: each one still names an export or a file the new compiler
  removes. It also lists every compiler change proposal the new pin implements that names this
  repository and that `compiler-changes.md` does not record yet: do the work the proposal lists,
  then add its id to that file. Then run `bun run check:guide`, which lists the Korean guide
  pages the new `AUTHORING.md` leaves stale.
- A pin that moves a value a reference note reads fails the build until the note is read again
  (DESIGN.md, Reference notes). The message names each section that reads the value and prints
  the recorded value beside the new one. Read each named section against the new value, fix what
  no longer holds, then run `bun run check:notes --read <note>` and commit the reading with a
  line `Read-Against: <note>`. A Korean section whose English or values moved is shown in
  English until it is translated, or read again and stamped with
  `bun run check:notes --read-ko <note> <section>`.
- When you edit inside a `LINT.IfChange` block, edit its `LINT.ThenChange` targets in the same
  commit. `TYPESHADE_DOCS_ROOT=$PWD bun vendor/shader-dsl/scripts/ifchange.ts` checks this.
- `.claude/settings.json` runs `downstream-impact.ts` and `ifchange.ts` before every
  `git commit` and blocks the commit while one fails. A line of its own in the message, `NO_IFTTT=<reason>`, waives an unmet
  `LINT.ThenChange` and nothing else. Write it only after reading the target: a reviewer relies
  on it.
- CI runs the same checks on every pull request (`.github/workflows/deploy.yml`).

The compiler's `AGENTS.md` (section "Docs follow the code") describes the conventions these
checks come from.

## Before pushing

Run `bun run format:check` and `bun run build`, then the `qa:*` passes over `dist/`: the same
steps as CI's build job (README.md, Checks; the full review procedure is in the skill).
`.claude/settings.json` also runs the fast ones (prettier, check-style, check-copy, check-i18n
and the reference notes' lint, `scripts/commit-gate.mjs`) before every `git commit` and blocks
the commit while one fails.

## Merging

`main` is protected by a GitHub ruleset: a pull request, a Code Owner review (`.github/CODEOWNERS`)
and the required checks (`build`). The repository admin can bypass it, and an agent acting
through the owner's account can too, so the rule is written here:

- Merge only when every required check is green on the pull request's current head. A red
  check is fixed, never bypassed.
- Bypass only the review requirement, and only when the owner has said in the conversation to
  merge that pull request. The owner cannot approve their own pull request, so their go-ahead
  is the review.
- Never push to `main` directly, and never force-push it.
- The ruleset, the secrets and every other repository setting are the owner's to change: an
  agent has no admin access to them. When one must change, write the owner a script for the
  GitHub CLI (`gh auth login`, then `gh api`), in PowerShell, since the owner works on Windows.
  Never ask for a token in the conversation: a token pasted there is a leaked token.
- Each required check is a job's `name:` in `.github/workflows/deploy.yml`. Renaming or removing
  that job leaves every pull request waiting on a check that never reports, so the ruleset
  (Settings > Rules > Rulesets > `main`) changes in the same step.
- `.claude/skills/land-pr/SKILL.md` is the procedure, from reading the diff to the live page.

## Layout and CSS changes

DESIGN.md (Layout, the Container Rule) sets the shell, the measures and the grids. A request to
remove or reduce whitespace, to tighten or to widen asks for the smallest change that closes the
gap the maintainer can see:

- Never remove a container's `max-width` (`max-inline-size` in this CSS) or change a grid's
  column count unless the request says so in those words. "Reduce the whitespace" was once read
  as "remove": the shell lost its `max-width`, the page ran edge to edge, and a later change had
  to cap it at 1320px again.
- Measure the elements the change touches (width, height, column count) at 1440 and 390, before
  and after, and report both. The screenshots in the typeshade-site skill's procedure (step 5)
  show the result; the numbers show what moved.

## Delegating to an agent

Hand an agent the outcome a reader sees and the invariants that must not move ("the footer
keeps its three groups; nothing else on the page moves"). A bare number is a target an agent can
hit the wrong way: given a footer height, one reached it by laying the footer out in seven
columns. Measure or screenshot what comes back before the pull request is marked ready.

The owner's rules, given on 2026-10-13, for every session:

- Run at most three sub-agents at the same time. Start the next one only when one has finished.
- Stop a sub-agent as soon as its report is in. A sub-agent stops every server and background
  process that it started before it reports.
- Give every task its pull request first. Push the first commit early and open a draft pull
  request at once. Push each later commit to the same branch, so that no work stays only in the
  container.

## Tracking requests

Keep a list of every distinct request the maintainer makes in a session. Before a batch of
merges, and whenever asked, report each one as done, in progress or not started. Merge and CI
housekeeping never takes the place of an unfinished request: in one long session it crowded out
the editable Playground the maintainer wanted most, until they asked where it was.
