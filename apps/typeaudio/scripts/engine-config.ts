import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const source = new URL("../../../sources/typeaudio/", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", source), "utf8"));
/** Resolve only public engine exports. The engine package is the single entry-point authority. */
export const engineAliases = Object.entries(pkg.exports as Record<string, string>).map(([key, target]) => ({
  find: new RegExp(`^${key === "." ? "typeaudio" : `typeaudio/${key.slice(2)}`}$`),
  replacement: fileURLToPath(new URL(target, source)),
}));

export function feedbackVersions() {
  const git = (cwd: URL, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const web = new URL("../../../", import.meta.url);
  const compiler = /\/([a-f0-9]{40})\.tar\.gz$/.exec(pkg.devDependencies.typeshade)?.[1];
  if (!compiler) throw new Error("The TypeAudio compiler must be pinned to a full commit.");
  return {
    web: git(web, "rev-parse", "HEAD"), typeaudio: git(source, "rev-parse", "HEAD"), typeshade: compiler,
    dirty: Boolean(git(web, "status", "--porcelain") || git(source, "status", "--porcelain")),
  };
}
