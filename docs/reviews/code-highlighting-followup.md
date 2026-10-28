# Shared code-highlighting follow-up

The shared helper now distinguishes TypeScript and TSX fences. It accepts `ts`, `typescript`,
`tsx`, and `typescriptreact`; parses the first language word so metadata such as
`ts title="example.ts"` does not disable highlighting; and returns no language for unknown fence
labels so the caller can keep its existing renderer. TSX uses Shiki's TSX grammar. The existing
one-argument `highlightTypeScriptBlock(code)` call still renders TypeScript, and inline
highlighting keeps its existing behavior.

Token-to-HTML rendering is shared by inline and block output. The output keeps source text
selectable, escapes HTML, preserves source newlines, and carries light/dark token colors. Tests
cover the fence aliases and metadata, TSX grammar selection, unknown-language pass-through,
escaping, line endings, and exact rendered text.

Verification: `node --test packages/ui/code/highlight.test.mjs` passes all 3 tests. The TypeCV docs
renderer now uses `typescriptFenceLanguage(rawLang)` before retrieving its existing
`block:${rawLang}:${text}` entry; its application check, build and three link/rendering tests pass.
An independent compatibility comparison against the helper at `c62f78e` confirmed identical
HTML for all 1,405 unique inline snippets found on 1,642 built TypeShade pages. The evidence
is recorded in `artifacts/ui/highlighter-compatibility.json` in the verification workspace.
