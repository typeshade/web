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

Publication is pending until a main-branch production run and public-browser checks
are recorded below. A successful upload alone does not establish the user flow.
