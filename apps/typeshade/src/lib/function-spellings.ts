import { FOREIGN_NAMES } from '../../vendor/shader-dsl/src/language-service/index.ts';
import { builtinGroups } from './builtin-table.ts';

// A direct rename preserves every placeholder argument. Lowering expressions, private
// helpers, casts and changed argument lists cannot establish a spelling correspondence.
export function directCall(form: string | null | undefined) {
  const match = /^([A-Za-z][A-Za-z0-9]*)\(((?:[a-f](?:,\s*[a-f])*)?)\)$/.exec(form ?? '');
  return match ? { name: match[1], arguments: match[2].replace(/\s/g, '') } : undefined;
}

export interface FunctionSpelling {
  language: string;
  name: string;
}
let cache: Map<string, FunctionSpelling[]> | undefined;
export function functionSpellings(name: string): readonly FunctionSpelling[] {
  if (!cache) {
    cache = new Map();
    const add = (target: string, spelling: FunctionSpelling) => {
      const rows = cache!.get(target) ?? [];
      if (!rows.some((row) => row.name === spelling.name && row.language === spelling.language))
        rows.push(spelling);
      cache!.set(target, rows);
    };
    for (const [foreign, row] of Object.entries(FOREIGN_NAMES))
      if (row.kind === 'function' && row.name) add(row.name, { language: row.from, name: foreign });
    for (const group of builtinGroups())
      for (const row of group.rows) {
        const original = directCall(row.call);
        if (!original) continue;
        for (const target of ['wgsl', 'glsl'] as const) {
          const call = directCall(row[target]);
          if (call && call.arguments === original.arguments && call.name !== original.name)
            add(row.id, { language: target.toUpperCase(), name: call.name });
        }
      }
  }
  return cache.get(name) ?? [];
}
