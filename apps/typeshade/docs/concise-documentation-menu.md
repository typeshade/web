# Concise documentation menu

The owner requested short, conventional menu labels on 2026-10-23 UTC.
The site baseline is `fda26c5a1ea7ececf08a36a00c67a74bf0e3ddde`.

## Scope

Use Docs for the header entry, Getting Started for the introductory navigation group,
and Quick Start for the installation page. Apply these names consistently in both locales,
including mobile navigation, the sidebar, footer, page heading and related entry links.
Retain existing destinations, localization, page descriptions and layout dimensions.
Use the conventional spelling Getting Started.

Verification and publication are in progress.

## Git installation

The owner also requested installation through an ordinary Git URL with npm.
Update the shared install command, package imports, setup instructions and pre-release text.
Verify the Git dependency's actual source entry points before documenting the execution command.
The repository itself can keep its compiler submodule; this change concerns reader installation.

## Observations

The live header contained Use TypeShade / TypeShade 사용하기 in both desktop and mobile navigation.
Captured 24 production views at 1440 and 390 pixels in both languages and themes.
The new labels are Docs, Getting Started, Quick Start and Playground.

Installed the public Git URL in an isolated npm project on 2026-10-23 UTC.
The resolved compiler revision was `e126e9af8642af7182a50044f552219a17070f99`.
The Git dependency exports TypeScript source; plain Node rejects type stripping under node_modules.
The documented tsx commands successfully compiled the page's gradient sample and generated its host views.
Plain Vite has the same source-loading limitation; running its CLI through tsx built the sample successfully.
Verified the documented npm prepare and npm build scripts with the installed Git dependency.
This source-install path does not require a compiler pin change or npm publishing hooks.

Menu changes and reader installation form the documentation entry workflow in this PR.

The owner separately reported slider movement and missing plot axes. Those graphics corrections
will be tracked in a separate pull request; this PR retains navigation and installation scope.

## Integration with the Why page

Before merging PR 231, integrate main `47afdb6d510102d07d3a33f793ffb91203891909`
(the bilingual Why TypeShade page from PR 232). Resolve the navigation conflict by
retaining the Why page and its sidebar link alongside Docs and Quick Start.
The installation description keeps the npm Git command.

On 2026-10-23 UTC, the integrated branch passed formatting, the full build, TypeScript,
IfChange and artifact hashes. SEO covered 2606 pages and 2486 sitemap entries; OpenSEO
reported no issues. All eight worker prefixes passed. External links had 1804 resolved
URLs, one font-license transport warning and zero broken URLs.

The 24 browser views at 1440/390 px in EN/KO and both themes retained the Docs label,
Quick Start heading, 65 px header and 836/358 px article widths without page overflow.
Evidence is in `/workspace/shared/concise-documentation-menu/after-main47/`.
No width, padding or grid-column rule was added or removed by this conflict resolution.
The compiler pin remains `91c2fe31`.

## Integration with the official Korean copy

Integrate main `2ea4efff78e7fab08346e1610e1f0edc05e19ea1` from PR 234 before merging.
Resolve six Korean dictionary conflicts while preserving the new page copy and the
updated readable-korean policy. Keep Docs, Getting Started, Quick Start and Playground
as concise labels. Preserve the verified npm Git installation, package imports and tsx commands.
Installation paragraphs use the merged policy's neutral polite register.

On 2026-10-23 UTC, the Korean change-rate and structural gates passed at 2.8% change.
The integrated branch passed formatting, the full build, TypeScript, IfChange and artifact
hashes. Copy validation covered 3345 strings. SEO covered 2606 pages and 2486 sitemap
entries; OpenSEO reported no issues and all eight worker prefixes passed.
The 24 menu views retained the 65 px header, 836/358 px articles and no page overflow.
Evidence is in `/workspace/shared/concise-documentation-menu/after-main234/`.
No width, padding or grid-column rule changed relative to this main revision.
The compiler pin remains `91c2fe31`. Required CI must pass on the resolved branch head.

The external-link pass checked 1805 URLs: 1773 passed, 32 returned temporary remote warnings, and none were broken.

## Sidebar regression after PR 234

The main deployment for `2ea4efff78e7fab08346e1610e1f0edc05e19ea1`
(run `39939396428`) failed in `check:standalone-learning`. The test still
clicked the third sidebar disclosure, although PR 234 replaced disclosures with
visible sections. This was a stale locator, not a GPU failure.

Use the current page URL to find its unique documentation group. Check that its
title and current-page link are visible and that the link has `aria-current="page"`.
Keep the mobile menu click, screenshots, content checks, search checks and all
other existing assertions. No product layout changes accompany this test fix.

The complete standalone-learning check passed: 175 function lessons, 40 concept views,
14 search queries and 136 screenshots. Formatting and TypeScript checks also passed.

## Remaining sidebar regression

CI on `aa20f5a` found the same stale disclosure selector in `check-glsl-precision`.
The precision check now locates the current page's unique sidebar group by URL,
verifies its visible title and current link, and checks `aria-current="page"`.
The precision model, optional WebGL queries, search checks, mobile menu opening
and screenshots are unchanged. An audit found no other sidebar summary selectors.

Verification on 2026-10-23: `check:glsl-precision` passed numerical rounding,
eight layouts, actual WebGL 1/2 queries, six search queries, two script-free
fallbacks and three failure/support cases. Formatting and TypeScript checks
passed. Browser and local server processes were closed.

## Integration with sidebar verification PR 237

Merge main `e87636880174c780696774c8c1abfa609e50912c`, which independently
resolved both removed-disclosure selectors. Preserve its approved URL-based
visible-link assertions and scroll behavior in both browser checks. This
supersedes the earlier group-based assertions described above. The browser
check files now match main exactly; no product behavior changes in this merge.
