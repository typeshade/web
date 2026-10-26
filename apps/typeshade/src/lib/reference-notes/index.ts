// The reference notes: the sections a person writes for one name of the language reference
// (DESIGN.md, Reference notes). A note is three files and one record. The prose is
// content/reference/en/<kind>-<name>.md and its translation content/reference/ko/; the values
// each section read are content/reference/readings/<kind>-<name>.json; the code a note draws
// on, the samples, the compile cases, the scope its code spans compile in, its assertions and
// its literals, is the record registered here under the entry's id, `function/pow`.
//
// This module holds the registry and the one question src/lib/design-rules.ts asks of it,
// which rules a note names, so it imports nothing that reads the rules.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ControlProp } from '../live-shader-contract.ts';
import { FIXTURE_STILLS, fixtureExp2 } from './fixture.ts';
import { functionPow } from './function-pow.ts';

/** A sample a `{{code <id>}}` token draws: a whole `"use typeshade"` file. */
export interface NoteSample {
  readonly code: string;
  /** The name over the frame. */
  readonly file?: string;
}

/** The range of one uniform field a live example gives a control; its label is page copy and
 *  comes from the marker in the prose. */
export type NoteControl = Omit<ControlProp, 'label'>;

/** The code behind a `<!-- live: <id> -->` marker: what LiveShader compiles and draws. */
export interface NoteLive {
  readonly code: string;
  readonly files?: Readonly<Record<string, string>>;
  readonly file?: string;
  readonly aspect?: '3/1' | '2/1' | '16/9' | '4/3' | '3/2' | '1/1';
  readonly plot?: { x: readonly [number, number]; y: readonly [number, number] };
  readonly controls?: Readonly<Record<string, NoteControl>>;
}

/** A program a `{{compile <case>}}` token reads with both halves, compile() and the language
 *  service. Where both accept it, `wgsl` picks the emitted line the token draws: the first line
 *  of the WGSL that holds it; `glsl` does the same in the GLSL ES 3.00 stages. */
export interface NoteCompileCase {
  readonly source: string;
  readonly wgsl?: string;
  readonly glsl?: string;
}

/** One note's code. */
export interface NoteRecord {
  /** The parameters every code span of the note compiles against, `x: f32, y: f32`. */
  readonly scope: string;
  readonly samples: Readonly<Record<string, NoteSample>>;
  readonly live: Readonly<Record<string, NoteLive>>;
  readonly compile: Readonly<Record<string, NoteCompileCase>>;
  /** What an `{{assert <id>}}` token claims holds at the pin. Each returns true when it does. */
  readonly asserts: Readonly<Record<string, () => boolean>>;
  /** A code span that is no entry's name and no expression in scope, with the reason it may
   *  stand: a type, a statement, an edit an exercise asks for. */
  readonly literals: Readonly<Record<string, string>>;
}

/** A still the build captures for a live example, the shape of STILLS in scripts/artifacts.mjs. */
export interface NoteStill {
  readonly id: string;
  readonly live?: boolean;
  readonly page: string;
}

/** The notes the site publishes, by entry id. */
export const NOTES: Readonly<Record<string, NoteRecord>> = { 'function/pow': functionPow };

/** Where the published notes live. */
export const NOTE_ROOT = 'content/reference';

/** A note no page publishes, which every check is proven against: it is read only when
 *  REFERENCE_NOTES_FIXTURE=1, by the checks and by a build into a directory of its own
 *  (scripts/reference-notes.test.ts, DESIGN.md Reference notes). */
export const FIXTURE_ROOT = 'scripts/fixtures/reference-notes';
export const FIXTURE_NOTES: Readonly<Record<string, NoteRecord>> = { 'function/exp2': fixtureExp2 };

/** The notes one run reads: the published ones, or the fixture. */
export interface NoteSet {
  /** The directory holding en/, ko/ and readings/, relative to the site root or absolute. */
  readonly root: string;
  readonly notes: Readonly<Record<string, NoteRecord>>;
  /** Stills the fixture declares beside STILLS, which the published notes never need. */
  readonly stills: readonly NoteStill[];
  readonly fixture: boolean;
}

/** The set this process reads, chosen by REFERENCE_NOTES_FIXTURE: unset for the published
 *  notes, 1 for the fixture, and a directory for a copy of the fixture with a fault planted in
 *  it (scripts/reference-notes.test.ts). */
export function noteSet(): NoteSet {
  const fixture = process.env.REFERENCE_NOTES_FIXTURE;
  if (!fixture) return { root: NOTE_ROOT, notes: NOTES, stills: [], fixture: false };
  const root = fixture === '1' ? FIXTURE_ROOT : fixture;
  return { root, notes: FIXTURE_NOTES, stills: FIXTURE_STILLS, fixture: true };
}

/** `function/pow` as its file name, `function-pow`. */
export const noteFileName = (id: string): string => id.replace('/', '-');

/** A note's prose in one language, relative to the site root or absolute. */
export const noteFile = (set: NoteSet, locale: string, id: string): string =>
  path.join(set.root, locale, `${noteFileName(id)}.md`);

/** A note's reading. */
export const readingFile = (set: NoteSet, id: string): string =>
  path.join(set.root, 'readings', `${noteFileName(id)}.json`);

/** The rules each English note names, by `{{rule N.M}}` or in prose ("Rule 9.4"), so
 *  READ_AGAINST in src/lib/design-rules.ts holds the note to the version it was read against.
 *  `mentioned` is that module's own reading of a rule named in prose. */
export function noteRuleMentions(
  mentioned: (text: string) => readonly string[],
): { readonly number: string; readonly where: string }[] {
  const set = noteSet();
  const out: { number: string; where: string }[] = [];
  for (const id of Object.keys(set.notes)) {
    const file = noteFile(set, 'en', id);
    const full = path.resolve(process.cwd(), file);
    if (!existsSync(full)) continue;
    const text = readFileSync(full, 'utf8');
    const numbers = new Set([
      ...[...text.matchAll(/\{\{\s*rule\s+(\d{1,2}\.\d{1,2})\s*\}\}/g)].map((m) => m[1]!),
      ...mentioned(text),
    ]);
    for (const number of numbers)
      out.push({ number, where: `the reference note ${file}, which names the rule` });
  }
  return out;
}
