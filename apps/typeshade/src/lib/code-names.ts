import { languageEntries } from './language-reference.ts';

/** The names of the language, from the same registry the reference pages are made from. */
export interface CodeNames {
  /** A name no sentence uses as a word: `f32`, `vec3`, `global_invocation_id`, `atan2`. It is
   *  code wherever it appears. */
  readonly always: ReadonlySet<string>;
  /** An attribute without its `@`: `vertex`, `compute`, `builtin`. It is code after the `@`. */
  readonly attributes: ReadonlySet<string>;
  /** A name that is also an ordinary word (`dot`, `step`, `mix`, `min`). It is code only as a
   *  call, `dot(a, b)`. */
  readonly calls: ReadonlySet<string>;
}

let cached: CodeNames | undefined;

/** A word of the language that a sentence can use as a word has no digit, no capital and no
 *  underscore. Such a type name (`bool`, `atomic`) or constant is left to the author's backticks. */
const isPlainWord = (name: string): boolean => /^[a-z]+$/.test(name);

export function codeNames(): CodeNames {
  if (cached) return cached;
  const always = new Set<string>();
  const attributes = new Set<string>();
  const calls = new Set<string>();
  for (const entry of languageEntries()) {
    const name = entry.name;
    if (entry.kind === 'attribute') attributes.add(name);
    else if (entry.kind === 'type' || entry.kind === 'builtin') {
      // `bool` and `position` are words too; the author backticks them.
      if (!isPlainWord(name)) always.add(name);
    } else if (entry.kind === 'function') {
      if (isPlainWord(name)) calls.add(name);
      else always.add(name);
    }
  }
  cached = { always, attributes, calls };
  return cached;
}
