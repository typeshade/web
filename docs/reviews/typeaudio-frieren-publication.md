# Frieren editable-study publication

The owner approved publishing the six editable passage studies on the existing
`audio.typeshade.dev` site on 2026-11-07. This delivery does not complete or approve
the full-scene sound design. It publishes three passages with A/B alternatives:

| Project IDs | Reference range | Layers |
| --- | --- | --- |
| `frieren-red-A`, `frieren-red-B` | 00:20–00:30 | 15 |
| `frieren-force-A`, `frieren-force-B` | 02:16.5–02:29.7 | 17 |
| `frieren-finale-A`, `frieren-finale-B` | 02:53–03:09.3 | 15 |

Use `https://audio.typeshade.dev/?project=<id>` to open an editable copy. Source
JSON is bundled under `/projects/`; it does not require private R2 credentials or
expiring audio links. The reference stays on YouTube (`YHCqcyX9N3s`). Browser-local
saved copies are not cloud backups; exported project files retain the source.

## Release boundary

The website dependency order is Web PR #45, #46, then #47. This first public review
uses the verified TypeAudio source commit
`5489ac494e69b5eb2dfae63546cc7643ecfea0f0`, with compiler
`87af4eb0d9d15f02b66b8341b72cab0944290472`. It does not publish an engine package or
merge the separate engine PR stack. The library's immutable gitlink and existing
remote history are sufficient to reproduce this website build. Future automated
engine promotion continues to require a merged engine revision.

The existing `typeaudio-site` Worker, custom domain, main-only protected production
environment, and deployment workflow remain in use. No R2 privacy, DNS, WAF or
other site's production settings change.

Before this rollout, Cloudflare reported deployment
`4fae28ce-353f-4c50-86b0-7b78806d3b01` and version
`a68f4425-aca6-49b2-92a4-c68cd4319f1d` at 100% traffic, created
2026-11-06T04:49:38.103817Z. This is the rollback reference.

## Verification before publication

The application baseline `479fb60dae42e06411406d0063a7fc8f21d65c20` passed 108 unit
tests, the architecture/type checks, production build and all 17 browser suites.
The receipts are linked from [the editable-project contract](../typeaudio-editable-projects.md).

PR #47's unrelated TypeShade tooltip failure was a real shared UI defect: focusing
an offscreen action emits a scroll event after focus, immediately hiding its hint.
A browser reproduction observed `focus, scroll` with a still-focused trigger and
hidden tooltip. The fix repositions visible keyboard hints on scroll/resize,
retains pointer dismissal and Escape, and hides hints whose trigger leaves the
viewport. The same reproduction now retains the hint. Shared UI type checking,
build and the pattern suite pass, including offscreen focus, position tracking,
Escape persistence, desktop/mobile widths and accessibility checks.

## Published and verified

Web #45, #46 and #47 are merged. Production run
[42347572090](https://github.com/typeshade/web/actions/runs/42347572090) deployed
`94bb1cf9f0176aa1fafa24eac3e88fba04a25972` on 2026-11-07 at 06:40 UTC. Its tree
matches the reviewed PR head `897bf64f0260bb4d39409a9606f3bc9c996993f1`.
The production build passed the checks, 108 unit tests and all 17 browser suites.
Cloudflare independently reports version `d5f68fe1-1d9e-4c75-915b-880c034a12d0`
at 100% traffic, deployment `581c8754-97aa-4bd2-b7f1-33dd3d67176b`.

The GitHub-hosted HTTP probe encountered Cloudflare's browser challenge; it was
recorded as blocked. Subsequent Chrome checks on the actual public domain passed:

- All six direct project links and source JSON requests returned HTTP 200. Every
  source file exactly matched the reviewed fixture bytes.
- Each project prepared nonzero stereo PCM, played and exported a 48 kHz stereo WAV.
- Parameter/code, timing and space edits changed the rendered sound. Undo/redo,
  project save/reopen and reload retained edits; reopening reproduced the same
  edited WAV. Invalid and stale imports did not overwrite current work.
- At 390×844 with touch emulation, project opening, parameter/space edits,
  save/reopen and touch-triggered playback passed without page-wide overflow.
  Desktop and mobile Project/Listen screenshots were inspected.
- The public graph-reproduction export reports the exact Web, engine and compiler
  commits above and `dirty: false`.

See the [durable verification receipt](typeaudio-frieren-publication-verification.json)
for per-project source/WAV hashes, timestamps and limits. The browser pass reused
the committed agent-project suite against the public origin, adding direct-link,
fixture-byte and build-version checks. It did not mock the application or YouTube.

The real **Connect reference** attempt failed at `https://www.youtube.com/iframe_api`
with `net::ERR_TUNNEL_CONNECTION_FAILED` in the managed verification environment.
The editor retained the authored 20–30 second range and displayed the load error.
Video playback and audiovisual synchronization are therefore **unverified**.
The published reference remains [the owner's YouTube video](https://youtu.be/YHCqcyX9N3s).
No network-policy, WAF, proxy or YouTube settings were changed to bypass the failure.

The six editable studies are available for listening review. Full-scene mixing,
candidate selection and physical-phone audio acceptance remain open.

To roll back only this site's Worker, run from `apps/typeaudio` with the existing
authorized deployment credentials:

```sh
pnpm exec wrangler versions deploy a68f4425-aca6-49b2-92a4-c68cd4319f1d@100 --config wrangler.jsonc --yes
```

This restores the prior site version; it does not reverse users' local edits or
change storage resources. Do not run it as a verification command.
