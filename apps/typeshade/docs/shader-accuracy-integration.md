# Shader accuracy documentation integration

The owner approved the four follow-ups on 2026-10-23 (UTC).
The site baseline is `d9fe79da1d5e8bc289357036dcf9fe0fb2fcda6c`.
The starting compiler pin is `3b40e065e17fd4d6929d4c30ab45656da73f0fcd`.

## Scope

Integrate the upstream corrections to `fma`, GLSL precision, `f64T`, and vertex reflection.
Update the compiler pin, affected Korean translations, and all intervening downstream obligations.
Keep article routes, layout and interactive examples intact.

The upstream correction and deployment verification are in progress.

## Integration

Upstream PR: https://github.com/typeshade/typeshade/pull/756.
Site PR: https://github.com/typeshade/typeshade.github.io/pull/229.
The correction commit is `91c2fe31de045ebf0e5f2c333ac98b95cc460280`.
It changes comments and guide prose, with identical code ASTs in all four changed source files.
The site will retain this exact compiler revision after its upstream merge.

Thirteen API translations and three guide translations changed.
The integration also records delivered portions of 0085 and the fixed-array bindings of 0086.
It does not claim that the remaining 0085 proposal work is implemented.
The existing compiled TypeScript destructuring sample now includes a fixed-array omission.
Playground examples remain read from the compiler, with no stale blanket-refusal fixture found.

Read Rules 11.8, 11.11 and 11.13 against their affected English and Korean paragraphs.
Updated owner selection, automatic fp64 selection and deferred executor explanations.
Retained explicit fusion facts and console repacking requirements that still apply to this pin.
The rule history now compares this compiler with the preceding site pin and reports three changed rules.

## Verification

On 2026-10-23 UTC, with Bun 1.4.3 and Node 24.19.0:

- API translation validation: all 518 references current; no problems.
- Guide validation: all 15 translations current; no problems.
- Reference notes: one note and 31 inputs current; no problems.
- Type checks, copy checks, formatting and IfChange checks passed.
- Downstream impact reports no removed names or unrecorded implemented proposals.
- Korean prose tooling: low risk, 15.4 percent change in the 23 changed API fields.
  Its numeric warnings are deliberate source corrections: the 0085 identifier, the GLSL 4.5.1 citation,
  and IEEE 754 replace unsupported format claims. The DeviceOptions warning is a wording match;
  the new text explicitly preserves mutual exclusion at both TypeScript and runtime levels.

Build, rendered-page review, current-head CI and deployment evidence remain in progress.
No layout dimensions, grids, route names or search metadata templates changed.

## Comparison catalog correction

The first site CI run failed because the active regression comparison still named the previous compiler pin.
Regenerated it with `bun scripts/regression-catalog.ts --new` using Bun 1.4.3.
The active pair is now the previous candidate `3b40e065` and the reviewed correction `91c2fe31`.
The retained registry and prior runtime artifacts are preserved.
The workload and measurement sources are unchanged; this update makes no performance claim.
Both `check:regression-catalog` and the original 22-fixture `check:benchmark-catalog` passed.
Compiler PR 756 has merged as `bdd0a8f1`, preserving the exact site pin in main's ancestry.
The refreshed site head must pass CI before merge and deployment.
The retained-catalog test previously assumed the active baseline was also the historical comparison's baseline.
It now finds a historical comparison by its recorded projection capability rather than the moving active baseline.
All prior acceptance and corruption-refusal assertions remain; all 17 benchmark contract tests passed.
