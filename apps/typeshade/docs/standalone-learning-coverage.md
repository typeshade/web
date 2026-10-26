# Standalone learning coverage

## Request

Apply the precision guide's reader-first approach across the existing function and concept
pages. Readers arriving from GLSL, WGSL, or general GPU searches must find an explanation
without first learning TypeShade.

## Scope

Review existing function lessons and search discovery. Add missing language-name context
where the compiler provides a reliable mapping. Add standalone learning introductions to all
five existing introductory concept pages, before compiler-specific examples. Preserve all
function signatures, compiler target restrictions, generated samples, and document dimensions.

## Baseline

Branch `feat/glsl-precision-guide` at `dda9e5459a3da7cf245f8f2fa160183351889b8b`.
Compiler pin `94203d3cab6433065bbe111c3b93f66a4058828e`.

## Review

Check bilingual lesson coverage and code-derived language mappings. Review desktop and mobile
in both themes. Verify built-site search, discovery links, headings, and existing navigation.
Record the completed scope and any remaining gaps in the pull request.

## Search intent

The owner clarified that Google search acquisition is the goal. Visitors may know TypeScript,
WebGPU, WebGL2, WGSL, or GLSL without knowing TypeShade. The existing canonical routes remain
stable; each page must answer its topic before introducing the compiler.

| Query family                   | Destination                | Standalone answer                                                 |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------- |
| TypeScript WebGPU shader       | TypeScript and WebGPU      | Host work versus shader work and a scaled-array example           |
| CPU GPU execution difference   | CPU and GPU                | Invocation ownership, resources, synchronization, calls and loops |
| vertex fragment compute shader | The shader pipeline        | Stage choice and a weighted colour example                        |
| WebGPU vs WebGL2               | WebGPU and WebGL2          | API capabilities, availability checks and portability limits      |
| WGSL vs GLSL                   | WGSL and GLSL              | Language role, interpolation expressions and porting limits       |
| GLSL/HLSL operation names      | Canonical function lessons | Related names, meaning, examples, argument and target caveats     |

Google title tags for function lessons now prioritize the operation and its explanation.
Applicable titles include a related language name from the compiler's public vocabulary.
Concept descriptions use the standalone answer. Canonical URLs, language alternates,
breadcrumb structured data, sitemap inclusion and crawlable internal links remain part of
verification. Pagefind checks establish local discovery only; they do not measure Google
ranking. Search impressions, queries, clicks and positions require observation after deployment.

## Implementation

All five introductory concept pages now lead with a standalone explanation, a use case,
a worked example, and practical limits. The CPU/GPU article distinguishes language rules
from hardware scheduling and register allocation.

The existing 175 function lessons retain their plots or worked models. Forty-nine function
pages now expose related names from the pinned compiler's public foreign-name vocabulary
or a direct target call with unchanged arguments. A native disclosure distinguishes these
operations from accepted TypeShade aliases. Thirty-three Math member pages link directly
to the canonical explanation and examples.

Function Google titles emphasize the operation, available language context, examples and
input limits. Where the title budget permits, they include a related language name.
Descriptions omit code and inline-math delimiters. No compiler pin or document width changes.

## Verification

Local browser review on 2026-10-23 with Bun 1.4.3, Node 24.19.0 and Chromium/SwiftShader
covered 40 concept language, viewport and theme combinations and captured 136 views.
Document widths stayed at 836 pixels on 1440 desktop and 358 pixels on 390 mobile.
The review checked 175 function lessons, seven foreign-name queries in both languages,
script-free concept reading and the Math member links. Pagefind found the expected lesson
within the first ten results for all 14 queries; this is separate from Google ranking.

The production build, type checks, formatting, Korean copy gates, downstream impact,
IfChange, SEO, worker routes, OpenSEO and documentation navigation checks passed.
The external-link sweep found no broken destination, with nine transport/server warnings
on existing font-licence and pinned GitHub links. The pull request records the full results.

Google position has not been measured. The changes must be merged and deployed before
Google can crawl the new content. The stack remains unmerged in this work item.
