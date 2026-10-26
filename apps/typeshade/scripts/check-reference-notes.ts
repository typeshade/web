// The reference notes against the pinned compiler (bun run check:notes, part of bun run build;
// DESIGN.md, Reference notes). With no flag it runs every check, in this order:
//   1. Each registered note has its English file and an entry at the pin; each note file is
//      registered.
//   2. The note rules N1 to N11 (below) on the English and on every translation.
//   3. Each sample compiles, each live example compiles with its controls, and each live
//      example has its still in STILLS (scripts/artifacts.mjs).
//   4. N4: each code span of the English is an entry's name, an expression that compiles in the
//      record's scope (all of a note's spans as one module), or a literal of the record.
//   5. Every input the note reads, computed again at the pin, against the reading.
//   6. A value the reading records that no section reads, and an input it does not record.
//   7. The rules a note names, through READ_AGAINST (src/lib/design-rules.ts).
//   8. Each translated section's stamps. A stale one is a warning: the page shows it in English.
// Everything but 8 fails the run. The flags:
//   --lint                  2 alone, without the compiler (the commit gate)
//   --read <note>           records the pin's value of every input the note reads
//   --read-ko <note> <id>…  stamps translated sections as read against the English and its values
//   --stale [--markdown]    the notes a pin leaves stale, for the pin pull request's body
//   --dist [dir]            the built pages carry every note section and no token
//   --trailers <base>       each commit from <base> that changes a reading names the note in a
//                           `Read-Against: <note>` line
// REFERENCE_NOTES_FIXTURE=1 runs any of them on the fixture note (scripts/fixtures/).
//
// The note rules:
//   N1  no fenced code block: code is a {{code}} token
//   N2  no address: a link is [text](key) to src/lib/links.ts, [text](#id), or {{ref}}
//   N3  a number sits in code, a token, a formula or a rule's name
//   N4  a code span names an entry, compiles in scope, or is a literal (in 4 above)
//   N5  no word that points at a time
//   N6  no speed, vendor, browser or driver word
//   N7  no section number
//   N8  a section that says what TypeShade, its compiler or its oracle does carries a token or
//       declares its reads
//   N9  a code span in a live example's anchor or exercise is in its sample
//   N10 no Korean particle that changes with the sound before it, right after a token
//   N11 a translation keeps the English's sections, tokens, live examples, code spans and
//       links, and the Korean rules (src/lib/translation-parity.ts, scripts/korean-tells.ts)
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { noteSet } from '../src/lib/reference-notes/index.ts';

// ── the command line ───────────────────────────────────────────────────────────────────

/** Whether the set holds a note, or a note file on disk that a check has to name. */
function anyNote(set: ReturnType<typeof noteSet>): boolean {
  if (Object.keys(set.notes).length) return true;
  return ['en', 'ko', 'readings'].some((d) => {
    const dir = path.resolve(process.cwd(), set.root, d);
    return existsSync(dir) && readdirSync(dir).length > 0;
  });
}

async function main(argv: string[]): Promise<number> {
  const set = noteSet();
  const flag = (name: string): boolean => argv.includes(name);
  // No note, and no file of one: the checks have nothing to read, and the compiler and the
  // dictionaries they load cost seconds, which the commit gate pays on every commit.
  if (
    !anyNote(set) &&
    !flag('--dist') &&
    !flag('--trailers') &&
    !flag('--read') &&
    !flag('--read-ko')
  ) {
    if (flag('--stale'))
      console.log(flag('--markdown') ? 'None.' : 'No reference note is stale at the pin.');
    else console.log(`check-reference-notes${flag('--lint') ? ' --lint' : ''}: no reference note`);
    return 0;
  }
  const { checkNotes, distProblems, readKorean, readNote, staleNotes, trailerProblems } =
    await import('./reference-notes-checks.ts');
  type Report = { errors: string[]; warnings: string[] };
  const after = (name: string): string[] => {
    const i = argv.indexOf(name);
    return i < 0 ? [] : argv.slice(i + 1).filter((a) => !a.startsWith('--'));
  };
  const print = (r: Report): number => {
    for (const w of r.warnings) console.warn(w);
    for (const e of r.errors) console.error(e);
    return r.errors.length ? 1 : 0;
  };
  if (flag('--read')) {
    const [id] = after('--read');
    if (!id)
      return print({
        errors: ['[reference-notes] --read names a note: --read function/pow'],
        warnings: [],
      });
    return print(readNote(set, id));
  }
  if (flag('--read-ko')) {
    const [id, ...sections] = after('--read-ko');
    return print(readKorean(set, id ?? '', sections));
  }
  if (flag('--stale')) {
    const { text, stale } = staleNotes(set, flag('--markdown'));
    console.log(text);
    return stale ? 1 : 0;
  }
  if (flag('--dist')) {
    const [dir = 'dist'] = after('--dist');
    const problems = distProblems(set, dir);
    for (const p of problems) console.error(p);
    if (!problems.length)
      console.log(
        `check-reference-notes --dist: ${Object.keys(set.notes).length} note(s) on their pages in every language, no token left, no note section elsewhere`,
      );
    return problems.length ? 1 : 0;
  }
  if (flag('--trailers')) {
    const [base] = after('--trailers');
    if (!base)
      return print({
        errors: ['[reference-notes] --trailers names the base: --trailers origin/main'],
        warnings: [],
      });
    const problems = trailerProblems(set, base);
    for (const p of problems) console.error(p);
    if (!problems.length)
      console.log(
        `check-reference-notes --trailers: every commit after ${base} that changes a reading names its note`,
      );
    return problems.length ? 1 : 0;
  }
  const lint = flag('--lint');
  const report = checkNotes(set, { lint });
  const code = print(report);
  if (code === 0) {
    const fallback = report.warnings.length
      ? `; ${report.warnings.length} translated section(s) shown in English`
      : '';
    console.log(
      lint
        ? `check-reference-notes --lint: ${report.notes} note(s), the note rules hold`
        : `check-reference-notes: ${report.notes} note(s)${set.fixture ? ' (the fixture)' : ''}, ${report.inputs} input(s) read again at the pin, no problems${fallback}`,
    );
  } else console.error(`check-reference-notes: ${report.errors.length} problem(s)`);
  return code;
}

process.exit(await main(process.argv.slice(2)));
