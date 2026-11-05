# TypeAudio studio

TypeAudio's website lives in this application. The library source is pinned by the
`sources/typeaudio` submodule at `575b42b`; `src` is a link to that source, not a fork.
The initial website was imported from TypeAudio revision
`1d6eb0d272f6f61fdf81b4023652f033e6261f35` (PRs 19–21), including the worker module
identity fix, sound designer and synchronous AudioWorklet. Those PRs need not be
merged to build this application. The library modules are unchanged between
these revisions. Documentation comes from the pinned library revision.

## Development

Use Node 24, pnpm 10.28.2 and Bun 1.4.3 or newer.

```sh
git submodule update --init sources/typeaudio
pnpm install --frozen-lockfile
pnpm dev:typeaudio
pnpm check:typeaudio
pnpm test:typeaudio
pnpm build:typeaudio
pnpm --filter typeaudio-site exec playwright-core install chromium
pnpm --filter typeaudio-site test:browser
```

The preparation script links the pinned app compiler into the library's ignored
`node_modules`. Both module trees must use one runtime registry. It refuses to
replace an existing, different compiler installation. Generated shader host views
are ignored. Vite builds each worker as one module to preserve resident array
identity even when its URL contains a query string. The separate Vite application
preserves this compiler pipeline; it consumes the web workspace's shared UI tokens.

## Sound exploration

- Live runs on the CPU audio thread at 48 kHz. Controls preserve oscillator phase
  and effect tails; continuous settings settle over approximately 12 ms.
- The XY pad maps horizontal movement to logarithmic filter cutoff and vertical
  movement to oscillator blend. Ordinary sliders offer the same keyboard controls.
- Store A and B capture session-only patches. Recall preserves the running voice;
  the blend control interpolates frequencies logarithmically. Discrete settings
  switch at the midpoint. Save locally or export JSON to keep a resulting patch.
- Live LFO uses sine or triangle modulation of cutoff, pitch or oscillator blend.
  Its clock advances in the audio processor at 128-frame control intervals, without
  UI timers. Beat sync means one cycle per beat at the selected tempo. Depth zero
  disables the modulation. Filter cutoff modulation requires the filter to be on.
- CPU/WebGPU Render and WAV export remain finite, **unmodulated** renders. They do
  not record a live performance. LFO controls and render completion explain this.
- Older version-1 JSON patches remain valid and default to modulation depth zero.
  New exports include the live modulation settings. Snapshots are not exported.

The design draws on [Ableton rack variations and macro controls](https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/)
and [Bitwig's modulation system](https://www.bitwig.com/userguide/latest/the_unified_modulation_system/).
These references inform direct sound manipulation and quick comparison; this site
is a small sound designer, not a full DAW. Browser performance and end-to-end audio
latency still require measurement on the user's hardware.

## Publishing

The TypeAudio CI workflow checks and builds this application. Its artifact is
`website/dist`. Production publishing still belongs to `typeshade/typeaudio`;
this PR does not change the existing manual production workflows for the other
three sites. A reviewed TypeAudio cutover must retire the old publisher before
adding this app to the production selector. Do not let both repositories publish
`typeaudio-site` concurrently.
