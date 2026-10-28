import test, { after } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as gpu from '../../sources/typecv/dist/gpu.js';
import * as internal from '../../sources/typecv/dist/internal/gpu.js';
import { CASES } from './src/lib/hardware-check/cases.ts';
import { cpuDigests } from './src/lib/hardware-check/run.ts';
import { digestRecorder } from './digest-fixture.mjs';

// The CPU-tier digests of the hardware check's cases (docs/lab-run-records.md, "Hardware check"):
// the digest of each case's input and of its answer on TypeShade's CPU tier, the oracle of Rule
// 1.2. The check page computes the same two digests in the visitor's browser, and
// scripts/compare-hardware-check.mjs compares them with this fixture. An equal input with another
// answer says that the CPU tier of that browser differs from Node's; another input says that the
// page built a different input. `web/.github/workflows/ci.yml` runs this file after `pnpm prepare:source typecv` builds the pinned library, and
// TYPECV_DIGEST_UPDATE=1 records the fixture. The fixture holds the digests of Node 22, as the
// other fixtures of tests/digests/ do (digest-fixture.mjs).

const fixture = JSON.parse(
  readFileSync(
    join(
      import.meta.dirname,
      './public/sample/probe/south-building-pair-triangulation.json',
    ),
    'utf8',
  ),
);
const api = { gpu, internal, fixture };
const recorder = digestRecorder(join(import.meta.dirname, './tests/digests/hardware-check.json'), {
  compared: ['input', 'cpu'],
  update:
    'pnpm prepare:source typecv && TYPECV_DIGEST_UPDATE=1 node --test apps/typecv/hardware-check-cpu.test.mjs',
});
after(() => recorder.write());

for (const c of CASES)
  test(`the CPU-tier digests of the hardware check's case ${c.name}`, async () => {
    recorder.check(c.name, await cpuDigests(c, api));
  });
