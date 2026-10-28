<p align="center">
  <a href="https://typeshade.dev/">
    <img height="112" src="./public/favicon.svg" alt="TypeShade">
  </a>
</p>

# TypeShade

**TypeScript for shaders.**

TypeShade lets you author shader programs in TypeScript with a TypeShade-specific language model. A source file opts into that model with the file-level directive `"use typeshade"`.

```ts
"use typeshade";

export function fragment(uv: vec2): vec4 {
  return vec4(uv, 0.0, 1.0);
}
```

The compiler lowers the source to an intermediate representation and emits shader source for the host. The current targets are WGSL for WebGPU and GLSL ES 3.00 for WebGL2. The compiled program can run through `typeshade/runtime` on WebGPU and WebGL2. Supported `@compute` entries also run on the WebGL2 tier through GLSL ES 3.00 passes.

## Why TypeShade?

Shader authoring should keep the parts developers already know from TypeScript: types, editor feedback, modules, and familiar control flow, while making GPU-specific rules explicit.

TypeShade is designed around that boundary:

- **TypeScript authoring:** write shader code in a familiar editor environment.
- **TypeShade semantics:** `"use typeshade"` marks the file as a shader file instead of ordinary application code. The file compiles with the shader files it imports as one program.
- **Static diagnostics:** invalid shader operations are reported before the host runs the program.
- **Multiple targets:** one source model can emit WGSL or GLSL for the supported hosts.
- **Two ways into a host:** the host consumes the emitted shader source directly, or imports the module through the Vite plugin and calls its entry points, which `typeshade/runtime` runs on WebGPU, WebGL2 or the CPU.

## Learn

Start with the documentation site:

- [Introduction](https://typeshade.dev/guide/introduction/)
- [Why TypeShade](https://typeshade.dev/guide/why/)
- [Quick start](https://typeshade.dev/guide/quick-start/)
- [Authoring / language guide](https://typeshade.dev/guide/authoring/)
- [API reference](https://typeshade.dev/api/)
- [Examples](https://typeshade.dev/guide/examples/)

The important concept to understand first is **`"use typeshade"`**. It is the boundary between ordinary TypeScript and TypeShade's shader authoring semantics.

## Repository layout

| Path                   | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `typeshade/`           | TypeShade compiler and language implementation        |
| `typeshade.github.io/` | Documentation site, examples, and generated reference |
| `.github/`             | CI and repository automation                          |

The documentation site is built with Astro and served by a Cloudflare Worker, which also serves the examples the compiler has added since the last build and opens on GitHub the issues readers file on the site ([docs/cloudflare.md](docs/cloudflare.md)). The compiler is vendored as a git submodule so examples and generated API documentation can be checked against a pinned compiler revision.

## Development

```bash
git clone --recurse-submodules https://github.com/typeshade/typeshade.github.io
cd typeshade.github.io
bun install
bun run dev
```

The production build verifies generated artifacts, documentation consistency, links, and SEO before deployment. See `DESIGN.md` for the site's writing and design rules and `.claude/skills/typeshade-site/SKILL.md` for the site maintenance workflow.

## Checks

`bun run format:check` runs first in CI, and `bun run format` fixes what it reports: Prettier over the TypeScript, CSS, JSON and Markdown, then `scripts/astro-semicolons.ts`, which writes the `;` in each component's frontmatter and `<script>`. Prettier leaves `.astro` files alone, because Astro keeps the whitespace written between tags and a reformatted component renders differently.

`bun run build` runs, in order:

- `check-style`: the voice rules in `DESIGN.md`, over `src/`, `scripts/` and the Markdown files, and that `src/styles/global.css` names only shared classes (DESIGN.md, Styling).
- `check-copy`: numerals, links and code spans equal in English and Korean; label widths.
- `check-i18n`: every string in the dictionaries, every locale URL through `localePath()`, no Hangul or locale literal outside `src/i18n/`, route parity between `src/pages` and `src/pages/ko`, one-line route files.
- `check-guide`: the Korean guide translations against the pinned English.
- `check-notes`: the reference notes against their rules and their readings at the pin (DESIGN.md, Reference notes). After the build, `bun scripts/check-reference-notes.ts --dist` reads the built pages.
- `check-api`: the reference data from the compiler.
- `check-api-translations`: the Korean API reference against the pinned JSDoc (`bun run check:api-ko`).
- The artifact hashes, the Korean font coverage, then Astro and Pagefind.

After the build: `bun run qa:seo`, `bun run qa:links` and `bun run qa:openseo` over `dist/`.

In a Claude Code session, `scripts/commit-gate.mjs` runs the checks that read only the source tree (`format:check`, `check-style`, `check-copy`, `check-i18n`, `check:notes:lint`) before every commit, side by side in about ten seconds, so a numeral that differs between the English and the Korean stops the commit instead of a CI build.

On a pull request, CI also checks what a compiler bump owes the site. The check runs `scripts/downstream-impact.ts` from the pinned compiler. It fails while a page, a component or a script still names an export or a file that the new pin removes. It also fails while a compiler change proposal that the new pin implements names this site and `compiler-changes.md` does not record its id. It also fails while a compiler `LINT.ThenChange(//typeshade.github.io/…)` target has not changed with its block. The site's own `LINT.IfChange` pairs are checked by the compiler's `scripts/ifchange.ts`. The compiler's `AGENTS.md` describes the convention.

A pull request that changes only documents (`.md` files outside `content/`, `src/` and `public/`) runs the build and the checks above, which read documents, and skips the browser checks and the preview, which open `dist/` and read none. The `change scope` job in `deploy.yml` decides from the diff, and the required check, `build`, passes on the build alone. A push to `main` runs everything.

## Status

TypeShade is pre-release. The public authoring model on `main` is file-level `"use typeshade"`; package and compiler details may change while the language surface matures.

## License

TypeShade is released under the Apache License 2.0, and was released under the MIT License before that. The site states the license of the compiler commit it is pinned to, read from that commit's `package.json`. This repository is licensed under the Apache License 2.0 as well: see `LICENSE` and `NOTICE`.

## Device benchmarks

The English and Korean `/benchmarks/` pages run versioned WebGPU workloads in a browser
Worker. One run compares both exact compiler/runtime builds across every experiment and
correctness check. Four section charts show timing and buffer-memory changes. Visitors inspect
results from a visitor-initiated run. A notice below Run explains automatic reporting. The
site Worker stores authorized records privately in D1. See [docs/benchmarks.md](docs/benchmarks.md)
for retention, migration and maintainer commands, and
[docs/benchmark-unification.md](docs/benchmark-unification.md) for the unified report, and
[docs/benchmark-projection.md](docs/benchmark-projection.md) for the private input projection cohort.

`bun run check:benchmark-catalog` checks the retained original fixtures against their compiler.
`bun run check:regression-catalog` checks the unified workload against both exact builds.
After `bun run build`, `bun run check:benchmarks` runs the instrument, consent flow and local
D1 collector in Chromium. Set `PLAYWRIGHT_CHROMIUM` when Chromium is installed outside Playwright.
