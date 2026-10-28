// The warnings a kernel function's refused loop gets (TS8070), read from the pinned compiler's
// surface document (§65, "A loop that runs as a kernel"). The control-flow page shows them as
// the compiler writes them at the pin, so a reworded warning reaches the page with the next pin
// and nothing here is typed twice. A pin whose §65 has no such table stops the build.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SURFACE = path.join('vendor/shader-dsl', 'docs/use-typeshade-surface.md');

/** One row of §65's table: the proof's rule the loop breaks, and the warning's text. */
export interface KernelLoopWarning {
  /** `R1` to `R6`, the labels §65 gives the proof's rules. */
  readonly rule: string;
  /** The warning, as the compiler prints it. */
  readonly warning: string;
}

/** The cells of one Markdown table row, split on the pipes that are not escaped. */
function cells(row: string): string[] {
  const out: string[] = [];
  let cell = '';
  const body = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (c === '\\' && body[i + 1] === '|') {
      cell += '|';
      i++;
    } else if (c === '|') {
      out.push(cell.trim());
      cell = '';
    } else {
      cell += c;
    }
  }
  out.push(cell.trim());
  return out;
}

/** §65's `Rule | Warning` table at the pin, in the order it is written. */
export function kernelLoopWarnings(): readonly KernelLoopWarning[] {
  const text = readFileSync(path.resolve(SURFACE), 'utf8');
  const start = text.indexOf('\n## 65.');
  const end = start < 0 ? -1 : text.indexOf('\n## ', start + 1);
  const section = start < 0 ? '' : text.slice(start, end < 0 ? undefined : end);
  const rows: KernelLoopWarning[] = [];
  let inTable = false;
  for (const line of section.split('\n')) {
    if (!inTable) {
      const head = line.startsWith('|') ? cells(line) : [];
      inTable = head[0] === 'Rule' && head[1] === 'Warning';
      continue;
    }
    if (!line.startsWith('|')) break;
    const [rule, warning] = cells(line);
    if (/^-+$/.test(rule ?? '')) continue;
    if (rule === undefined || warning === undefined) continue;
    rows.push({ rule, warning: warning.replace(/^`|`$/g, '') });
  }
  if (rows.length === 0) {
    throw new Error(
      `[kernel-loops] ${SURFACE} at the pin has no "Rule | Warning" table in §65; the control-flow page shows it`,
    );
  }
  return rows;
}
