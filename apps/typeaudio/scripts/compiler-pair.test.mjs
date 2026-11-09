import test from "node:test";
import assert from "node:assert/strict";
import { compilerPin, verifyCompilerPair } from "./compiler-pair.mjs";
const pkg = (sha) => ({
  devDependencies: {
    typeshade: `https://github.com/typeshade/typeshade/archive/${sha}.tar.gz`,
  },
});
test("paired promotion refuses floating pins and divergent runtime versions", () => {
  const baseline = pkg("a".repeat(40));
  assert.doesNotThrow(() =>
    verifyCompilerPair(baseline, structuredClone(baseline)),
  );
  assert.throws(
    () => verifyCompilerPair(baseline, pkg("b".repeat(40))),
    /same TypeShade/,
  );
  for (const bad of [
    pkg("main"),
    pkg("abc1234"),
    {},
    { devDependencies: { typeshade: "/tmp/compiler" } },
  ])
    assert.throws(() => compilerPin(bad), /full commit/);
});
