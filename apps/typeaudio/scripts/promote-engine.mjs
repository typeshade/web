import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { compilerPin } from "./compiler-pair.mjs";

const sha = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sha ?? ""))
  throw new Error("Pass a full TypeAudio commit SHA.");
const root = new URL("../../../", import.meta.url);
const source = new URL("sources/typeaudio/", root);
const git = (...args) =>
  execFileSync("git", args, { cwd: source, encoding: "utf8" }).trim();
if (git("status", "--porcelain"))
  throw new Error(
    "Preserve the dirty TypeAudio checkout before promoting a version.",
  );
git("fetch", "origin", "main");
git("cat-file", "-e", `${sha}^{commit}`);
git("merge-base", "--is-ancestor", sha, "origin/main");
// A reviewed engine commit is the authority for the paired compiler pin.
const engine = JSON.parse(git("show", `${sha}:package.json`));
const compiler = compilerPin(engine);
const file = new URL("../package.json", import.meta.url);
const site = JSON.parse(await readFile(file, "utf8"));
site.devDependencies.typeshade = compiler;
git("checkout", "--detach", sha);
await writeFile(file, JSON.stringify(site, null, 2) + "\n");
process.stdout.write(
  JSON.stringify({ typeaudio: sha, typeshade: compiler }, null, 2) + "\n",
);
