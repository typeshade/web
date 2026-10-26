import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
export const sites = ["typeshade", "typenn", "typecv"];
export function affected(paths) {
  const selected = new Set();
  for (const path of paths) {
    if (
      /^(packages\/ui\/|scripts\/|\.github\/|package\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|\.gitmodules$)/.test(
        path,
      )
    )
      return sites;
    for (const site of sites) {
      if (
        path.startsWith(`apps/${site}/`) ||
        path === `sources/${site}` ||
        path.startsWith(`sources/${site}/`)
      )
        selected.add(site);
    }
  }
  return sites.filter((site) => selected.has(site));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [base, head = "HEAD"] = process.argv.slice(2);
  const paths = base
    ? execFileSync("git", ["diff", "--name-only", "--no-renames", base, head], {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
    : ["package.json"];
  console.log(JSON.stringify(affected(paths)));
}
