# TypeAudio studio integration

The TypeAudio site is now an application in this web workspace. This change does
not transfer production publishing or remove the original website. See the
[application README](../../apps/typeaudio/README.md) for source provenance, commands
and the publishing boundary.

## Implemented scope

The existing continuous AudioWorklet, finite CPU/WebGPU renderer, six presets,
effects, patch library and documentation routes were retained. The studio adds
an XY cutoff/blend pad, two session snapshots, logarithmic A/B interpolation, and
live sine/triangle modulation with a tempo-synchronized option. Randomize, Undo
and Reset are now accessible in Live as well as Render mode. The shorter opening
section brings the sound controls closer to the top of the page.

The interaction references are Ableton Live 12 rack variations/macros and Bitwig's
unified modulation system, linked in the application README. These are product
interaction references, not evidence of equivalent DSP or DAW feature coverage.

## Content review boundary

Reviewed the new English introduction, XY instructions, snapshot labels, live LFO
controls and limitations, render completion notice, and application documentation.
Removed paired marketing headings from the imported home page and corrected its
repository ownership description. The imported four engine documents retain
pinned source attribution and existing English content; this pass does not claim
a new technical or translated review of every document. TypeAudio remains an
English-only site, as before this change.

## Local validation

- Shader and TypeScript checks pass; the compiler emits its existing Bun
  `moduleSuffixes` advisory.
- Thirteen tests pass: actual oscillator/filter audio, effects, WAV encoding,
  phase-preserving live updates, patch validation and backwards compatibility,
  every preset-pair interpolation, audio-thread modulation and beat sync.
- Production build produces one self-contained module per audio worker, four
  documentation routes, sitemap and 404 page.
- Chromium checks pass: CPU/WebGPU PCM agreement within 1/32768, query-bearing
  worker regression, saved/imported patches, rendering, spectrum, autoplay,
  stop/restart and actual eight-voice live AudioWorklet processing.
- New browser coverage exercises captured XY dragging, A/B recall, logarithmic
  morphing, tempo sync and stored LFO settings while verifying one worklet node
  and no offline-render worker requests during live edits. Mobile touch input and
  the keyboard slider alternative also pass.
- Desktop (1440px) and mobile (390px) screenshots were inspected. No horizontal
  overflow or application runtime errors were observed.
- Six existing scope-selection tests pass. TypeAudio uses its own path-filtered
  workflow so the legacy three-site browser/production matrix is unchanged.

These checks do not measure physical speaker latency or low-end device headroom.
Live modulation is not included in Render-mode WAV files; the UI explains this.
Production cutover and a production URL verification remain separate work.
