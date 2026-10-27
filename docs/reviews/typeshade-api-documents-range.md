# TypeShade API Korean review: entries 201–359

Reviewed the canonical worklist entries 201–359, inclusive (159 entries): `wgslbuiltinname` (`WgslBuiltinName`) through `i32`. I compared every available English/Korean text field in each entry, including descriptions, parameters, returns, members, exceptions, and target notes. I retained technical identifiers, values, examples, numerals, code spans, links, and field structure. The initial range review preserved the canonical source hashes; integration subsequently refreshed only entries affected by reviewed English corrections.

The review corrected Korean wording and register inconsistencies in the assigned range, including malformed predicate endings, awkward machine-translated clauses, and inconsistent terminology. Particular fixes include the formal register in `f64T.description`, `boolT.summary`, and type/texture summaries; a clearer allowed-format explanation in `TextureOptions.summary`; and code formatting for the `global_invocation_id` builtin. No English source or API identifiers were edited.

Source-level issues identified and relayed to the API adapter owner for site-owned English presentation overrides:

- `CpuValue.description` and `CpuPrecision.description` initially appeared to describe CPU precision differently; source inspection confirmed that representation and per-operation rounding are distinct (see the integrated API review). Canonical sources are `vendor/shader-dsl/src/core/cpu-runtime.ts:32–37` and `vendor/shader-dsl/src/core/oracle.ts:756–764`.
- `createRuntime.summary` has malformed English (“on the first tier of `prefer` the environment has”) at `vendor/shader-dsl/src/runtime/runtime.ts:617–618`.
- `Frame.members.submit` says the promise resolves “to what their buffers held,” which appears to mean that it resolves with the recorded contents. This wording is in the canonical API entry's `members.submit` field.

The initial range-only validation was blocked by an adapter under construction. Integration corrected its source match, reconciled translation code spans and refreshed the affected hashes after paired review. Final `check:api-ko` passes all 518 entries. See [the integrated API report](typeshade-api.md) for the corrected English passages and verification.
