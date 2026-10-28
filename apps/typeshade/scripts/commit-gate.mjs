// The fast checks from CI, before a Claude Code commit. `.claude/settings.json` registers this
// as a PreToolUse hook on Bash: it reads the tool call on stdin and does nothing unless the call
// is a `git commit`. Then it runs the checks below side by side (about ten seconds, check-copy
// being the slowest) and blocks the commit (exit 2, the report goes to the agent) while one
// fails. Each of them otherwise shows up in CI, one failed build at a time. Astro itself, the
// guide and API checks and the qa passes over dist/ stay in `bun run build` and after it, which
// are run before pushing (README.md, Checks).
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Scripts from CI's build job that finish in seconds and read only the source tree. */
const CHECKS = ['format:check', 'check:style', 'check:copy', 'check:i18n', 'check:notes:lint'];

let command = '';
try {
  command = JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? '';
} catch {
  process.exit(0);
}
if (!/(^|[;&|\s])git\s+(?:-C\s+\S+\s+)?commit\b/.test(command)) process.exit(0);

/** Resolves to the check's report when it fails, or null when it passes or cannot start. */
const run = (check) =>
  new Promise((resolve) => {
    // A shell resolves a `bun.cmd` shim on Windows.
    const child = spawn('bun', ['run', check], { shell: process.platform === 'win32' });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', () => resolve(null));
    child.on('close', (code) => resolve(code === 0 ? null : `bun run ${check}\n${out.trim()}`));
  });

const failed = (await Promise.all(CHECKS.map(run))).filter(Boolean);
if (failed.length > 0) {
  process.stderr.write(
    `${failed.join('\n\n')}\n\nCI runs the same checks. Fix each one, then commit again.\n`,
  );
  process.exit(2);
}
