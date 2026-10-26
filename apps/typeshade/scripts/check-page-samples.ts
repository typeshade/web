// The TypeShade code samples of the language guide and the concept pages are excerpts: one
// page builds a program over several samples, and a sample uses names an earlier one declared
// (`camera`, `pixels`, `VsIn`, `addBias`). This check compiles every sample through the pinned
// compiler. Before it compiles, it adds the declaration of each shared name the sample uses and
// does not declare itself. An error diagnostic fails the check and names the page, the sample
// and the code. A page or a sample that is not listed here is not checked, so the page list
// below is the whole set.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileTsSource } from '../vendor/shader-dsl/src/compiler/ts/source-file.ts';

const PAGES = [
  'LanguagePage',
  'LanguageStringKeysPage',
  'LanguageStagesPage',
  'LanguageFunctionsPage',
  'ConceptsCpuAndGpuPage',
] as const;

const DIRECTIVE = '"use typeshade";\n';

// A shared name: the sample needs it when `uses` matches and `declares` does not.
const SHARED: readonly { uses: RegExp; declares: RegExp; source: string }[] = [
  {
    uses: /\bCamera\b|\bcamera\b/,
    declares: /\bclass Camera\b/,
    source: 'class Camera {\n  view: mat4\n  pos: vec3\n}\n',
  },
  {
    uses: /\bcamera\b/,
    declares: /\bdeclare const camera\b/,
    source: 'declare const camera: uniform<Camera>\n',
  },
  {
    uses: /\bpixels\b/,
    declares: /\bdeclare const pixels\b/,
    source: 'declare const pixels: storage<array<f32>, "read_write">\n',
  },
  {
    uses: /\bVsIn\b/,
    declares: /\bclass VsIn\b/,
    source: 'class VsIn {\n  @location(0) position: vec3\n  @location(1) uv: vec2\n}\n',
  },
  {
    uses: /\bpositions\b/,
    declares: /\bpositions\b\s*[:=]/,
    source: 'declare const positions: storage<array<vec4>>\n',
  },
  {
    uses: /\baddBias\b/,
    declares: /\bfunction addBias\b/,
    source: 'function addBias(value: f32): f32 {\n  return value + 0.5\n}\n',
  },
];

// A sample that is host code, not a shader: the check does not compile it, and it must still be
// host code (it awaits the runtime), so a sample that moves to another index fails here.
const HOST: Readonly<Record<string, readonly number[]>> = { LanguageStagesPage: [2] };
// A sample that is statements without a function around them: the check wraps it in a compute
// entry before it compiles.
const STATEMENTS: Readonly<Record<string, readonly number[]>> = { ConceptsCpuAndGpuPage: [3] };

const root = new URL('..', import.meta.url).pathname;
const SAMPLE = /<TypeShadeCode[^>]*?\bcode=(?:\{`((?:[^`\\]|\\.)*)`\}|\{'((?:[^'\\]|\\.)*)'\})/g;
const unescape = (text: string): string =>
  text.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\`/g, '`').replace(/\\\\/g, '\\');

let failures = 0;
let total = 0;
for (const page of PAGES) {
  const source = readFileSync(join(root, 'src/components/pages', `${page}.astro`), 'utf8');
  let index = 0;
  for (const match of source.matchAll(SAMPLE)) {
    index += 1;
    total += 1;
    const code = unescape(match[1] ?? match[2] ?? '');
    if (HOST[page]?.includes(index)) {
      if (!/\bawait\b/.test(code))
        throw new Error(
          `[check-page-samples] ${page}, sample ${index} is listed as host code and does not await`,
        );
      total -= 1;
      continue;
    }
    const wrapped = STATEMENTS[page]?.includes(index)
      ? `@compute([64, 1, 1])\nexport function fragment(@builtin("global_invocation_id") gid: vec3u) {\n${code.replace(/^/gm, '  ')}\n}`
      : code;
    const body = wrapped.startsWith(DIRECTIVE.trim())
      ? wrapped.slice(wrapped.indexOf('\n') + 1)
      : wrapped;
    const prelude = SHARED.filter((s) => s.uses.test(body) && !s.declares.test(body)).map(
      (s) => s.source,
    );
    const program = `${DIRECTIVE}\n${prelude.join('\n')}${prelude.length > 0 ? '\n' : ''}${body}\n`;
    const result = compileTsSource(program, {
      fileName: `${page}-${index}.shade.ts`,
      requireDirective: true,
      emit: false,
    });
    const errors = result.diagnostics.filter((d) => d.category === 'error');
    if (errors.length > 0) {
      failures += 1;
      console.error(
        `[check-page-samples] ${page}, sample ${index}: ${errors.map((e) => `${e.code} ${e.message}`).join('; ')}`,
      );
    }
  }
}
if (total === 0)
  throw new Error('[check-page-samples] found no samples: the pattern no longer matches the pages');
if (failures > 0) {
  console.error(`[check-page-samples] ${failures} of ${total} samples do not compile`);
  process.exit(1);
}
console.log(`[check-page-samples] ${total} samples compile`);
