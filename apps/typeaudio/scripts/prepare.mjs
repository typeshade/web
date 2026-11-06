import {
  mkdir,
  symlink,
  realpath,
  readFile,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { verifyCompilerPair } from "./compiler-pair.mjs";
const source = new URL("../../../sources/typeaudio/", import.meta.url);
const engine = JSON.parse(
  await readFile(new URL("package.json", source), "utf8"),
);
const site = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
verifyCompilerPair(engine, site);
// Source modules and website modules must resolve the very same resident registry.
// A second installed TypeShade runtime would break GPU array identity.
const compiler = await realpath(
  new URL("../node_modules/typeshade", import.meta.url),
);
await readFile(new URL("src/index.ts", source));
await mkdir(new URL("node_modules/", source), { recursive: true });
for (const dependency of ["typeshade", "typescript"]) {
  const target =
    dependency === "typeshade"
      ? compiler
      : await realpath(
          new URL(`../node_modules/${dependency}`, import.meta.url),
        );
  const link = new URL(`node_modules/${dependency}`, source);
  try {
    await symlink(target, fileURLToPath(link), "dir");
  } catch (error) {
    if (error.code !== "EEXIST" || (await realpath(link)) !== target)
      throw error;
  }
}
const paths = Object.fromEntries(
  Object.entries(engine.exports).map(([key, target]) => [
    key === "." ? "typeaudio" : `typeaudio/${key.slice(2)}`,
    [target],
  ]),
);
await writeFile(
  new URL("../typeaudio-paths.json", import.meta.url),
  JSON.stringify({ compilerOptions: { paths } }, null, 2) + "\n",
);
