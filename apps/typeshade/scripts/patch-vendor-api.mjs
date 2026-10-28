import { readFileSync, writeFileSync } from 'node:fs';

const file = 'vendor/shader-dsl/src/index.ts';
const source = readFileSync(file, 'utf8');
const legacy = "export { compile, type TsCompilerDiagnostic } from './compiler/ts/compile.js'";
const fixed =
  "export { compile } from './compiler/ts/compile.js'\nexport { type TsCompilerDiagnostic } from './compiler/ts/source-file.js'";

if (source.includes(legacy)) {
  writeFileSync(file, source.replace(legacy, fixed));
  console.log(`patched ${file}: resolved type-only TsCompilerDiagnostic re-export`);
} else {
  console.log(`vendor API already exports TsCompilerDiagnostic directly (or has moved): ${file}`);
}
