// Every public file of the pinned compiler belongs to one reference category, and the
// extractor refuses a file it has no row for. The rows the site writes by hand live in
// CATEGORY_BY_FILE in src/lib/api.ts; these are the ones the pin brought with it, kept here
// so a moved pin shows them as one diff instead of scattered through that table.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/lib/api.ts';
const source = readFileSync(file, 'utf8');
const marker = "  'src/core/ir/builder.ts': 'authoring',";
const rows = [
  // The "use typeshade" front end: the compile entry point, the file it reads and the
  // directive that opens one.
  "  'src/compiler/ts/compile.ts': 'authoring',",
  "  'src/compiler/ts/source-file.ts': 'authoring',",
  "  'src/compiler/ts/directive.ts': 'authoring',",
  // packModule hands a host the emitted text beside the bind groups, the entry points and
  // the vertex layout, which is what the Reflection category holds.
  "  'src/compiler/ts/pack.ts': 'reflection-api',",
  // A span is a field on an IR node, carried by every pass that rebuilds one.
  "  'src/core/ir/span.ts': 'ir',",
  // Lockstep dispatch runs a workgroup's invocations on the CPU.
  "  'src/core/debug/dispatch.ts': 'cpu-oracle',",
  // The console: the events a shader's console calls deliver on the CPU, and the decoder for
  // the ones the GPU records in the console buffer (compiler proposal 0014).
  "  'src/core/console.ts': 'console',",
  // The determinism report is read over a whole module, beside semanticDiff and measure.
  "  'src/core/passes/determinism.ts': 'tooling',",
];

const missing = rows.filter((row) => !source.includes(row.trim()));
if (missing.length === 0) {
  console.log(`API categories already patched: ${file}`);
} else if (source.includes(marker)) {
  writeFileSync(file, source.replace(marker, missing.join('\n') + '\n' + marker));
  console.log(`patched ${file}: ${missing.length} file(s) given a reference category`);
} else {
  throw new Error(`[api] could not find CATEGORY_BY_FILE insertion marker in ${file}`);
}
