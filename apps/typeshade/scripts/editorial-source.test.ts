import { describe, expect, it } from 'bun:test';
import { editorialSourceText } from '../src/lib/editorial-source.ts';

describe('editorial source corrections', () => {
  it('replaces one exact pinned passage', () => {
    expect(editorialSourceText('before source after', 'source', 'display', 'fixture')).toBe(
      'before display after',
    );
  });

  it('fails when a pinned passage has drifted or is ambiguous', () => {
    expect(() => editorialSourceText('changed source', 'old source', 'display', 'fixture')).toThrow(
      'expected exactly one matching source passage',
    );
    expect(() => editorialSourceText('source source', 'source', 'display', 'fixture')).toThrow(
      'expected exactly one matching source passage',
    );
  });
});
