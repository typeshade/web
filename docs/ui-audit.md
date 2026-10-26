# Shared UI adoption

Scope: the three public sites, including training/reconstruction labs, playground
forms, static actions and repeated interaction patterns. Editor, chart, dataset
and runtime interfaces remain with their apps.

## Observed patterns

| Pattern                 | Existing implementations                                                                                                 | Shared implementation                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Actions                 | TypeShade `styles/controls.css`, both product `styles/home.css`, extra TypeCV `cv-features.css`, Ant buttons inside labs | One shared stylesheet, native React/Astro Button, Astro static call sites; compatibility aliases removed                    |
| Form labels             | TypeNN wraps Ant Select/InputNumber in labels; TypeCV places its help outside the focal field                            | Field owns the label ID, description and error associations; controls inherit disabled/required state                       |
| Number and choice input | Direct Ant imports with page-owned presentation                                                                          | NumberInput/Select expose the existing typed value handlers through the package; Ant remains the interaction implementation |
| Text entry              | TypeNN model trials separately assemble text areas and feature inputs                                                    | Input/TextArea use the same Field and theme contract                                                                        |
| Theme                   | Palette/radius shared, application variable names differ, React only reads brand/font/radius                             | Semantic `ui-*` roles own product themes; TypeShade maps its own palette through one adapter                                |
| Responsive forms        | TypeNN forces two columns on small screens; TypeCV puts everything in a wrapping Space                                   | One field per narrow row and intrinsic grid sizing; long Korean labels and button copy wrap                                 |
| State verification      | Home/theme smoke tests; no shared state inventory                                                                        | Dedicated UI workbench, keyboard/ARIA/axe checks, small-screen and motion checks, lab integration smoke tests               |

## Ownership and API decisions

- The token layer has palette/size primitives (`tokens.css`) and semantic roles
  (`semantics.css`). Components use surface, text, border, action, danger and focus
  roles. The site can change these roles without editing component selectors.
- Light primary action blue is darker than the old `#1677ff` so white action text
  has adequate contrast. Focus and control boundaries have separate roles from
  subtle panel dividers. Dark and explicit/system theme precedence are covered.
- Buttons are native elements. Actions default to `type="button"`; navigation
  remains an anchor. Loading retains the label, sets `aria-busy` and disables the
  action. IconButton requires a label and hides decorative glyphs from the name.
- Ant Design supplies numeric editing, combobox keyboard behavior, checkbox and
  text control internals. The shared package owns their theme and field contract.
  Feature components do not override Ant's internal selectors for these controls.
- Field represents one labelled control. It generates stable IDs with React
  `useId`, links optional help and errors, and propagates required/disabled/invalid
  state. Pass an explicit ID to Field when external code needs it. Application
  code owns validation rules and error copy; Field does not invent validation.
- Form layout stays in each app. An SfM upload and a training configuration have
  different ordering and behavior, even when they use the same atoms.
- `apps/ui` is a development workbench with no production deployment or product
  navigation entry. It renders Astro and React controls together and is checked
  by CI. No UI package publication is required.

## Acceptance checks

Use `pnpm check:ui`, `pnpm build:ui`, `pnpm test:controls`, then build the public
apps and run `pnpm test:ui` on their outputs. The browser checks exercise actual
controls, including keyboard selection, numeric bounds, label activation, repeated
labels, error/help IDs, blocked disabled/loading actions and explicit submit behavior.
The workbench runs axe in light/dark themes and checks 320/390/1440px widths,
reduced motion and forced colors. The app smoke tests check actual lab field wiring
in English and Korean. These checks do not establish full-site accessibility or
hardware GPU correctness.

## Compositions and native adoption

The four follow-on slices are implemented together so the abstractions have real
consumers, rather than existing only in the workbench.

| Pattern                      | Consumers                                                                                                      | Behavior and ownership                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native Field/Checkbox/Button | TypeShade compiler options and submit/report forms; TypeCV EN/KO pair forms; TypeShade training/static actions | Explicit control IDs preserve DOM hooks, labels/help/errors share the React contract, native validation and FormData remain in the app                                          |
| Tabs                         | TypeNN graph captures; TypeShade front/example code and playground output                                      | Shared roving focus, disabled skipping, wrapping, Home/End, RTL and vertical arrows; React owns controlled selection, progressive Astro panels stay readable without JavaScript |
| Dialog                       | TypeShade report and gallery submission                                                                        | Native modal top layer, Escape, inert background, sequential focus containment, focus restoration to the original trigger even after asynchronous initialization                |
| Tooltip                      | TypeShade editor file actions                                                                                  | Accessible description, focus and pointer entry, hoverable text, Escape dismissal including pointer-triggered hints, viewport positioning                                       |
| Navigation disclosure        | TypeShade desktop language/version menus and mobile navigation                                                 | Native details/summary and links, one open disclosure, outside-click/Escape dismissal; mobile focus cycle and scroll lock; deliberately no application `menu` role              |
| Toolbar/Panel                | TypeNN graph actions and playground; TypeCV reconstruction; TypeShade editor/dialog actions                    | Shared spacing and surfaces, app-owned layout and content; Toolbar uses a labelled group without imposing arrow-key semantics                                                   |
| EmptyState/Alert             | TypeNN graph/results/playground; TypeCV reconstruction notice; TypeShade documentation notes                   | Static information stays quiet; explicitly live errors/statuses are announced                                                                                                   |

`semantics.css` now owns the TypeNN/TypeCV surface/text/link colors directly.
`product-theme.css` contains fonts, color-scheme and Tailwind mappings; old
`--ground`, `--panel`, `--ink` and similar CSS aliases are removed from app sources.
TypeShade's palette is preserved by `src/styles/ui-theme.css`, imported after
semantic defaults. Components consume `ui-*` roles in all three apps.

The `.button`, `.button-primary`, `.button-secondary` and `.button-lg` compatibility
selectors are removed. Duplicate native control/dialog/tab skins, two unused Ant
integration stylesheets and TypeCV's unused copy of the TypeNN matrix playground
styles are removed. TypeShade's output byte-count hook is now `data-output-size`
to avoid colliding with the shared buttons' size attribute.

## Regression coverage

`pnpm test:patterns` checks React and native tabs, disabled/RTL/vertical navigation,
native form labels and validation, modal Tab/Shift+Tab/Escape and focus restoration,
disclosure dismissal/mobile scroll lock, hoverable tooltips and Escape. It also
runs axe in light/dark themes with the dialog open/closed, checks 320/390/1440px,
and verifies no-JavaScript native tab content. Both workbench suites run in CI.

`pnpm test:ui` checks EN/KO home, lab and playground layouts. It executes TypeNN's
CPU matrix example and TypeCV's CPU pair verification (including result reset on
input change), audits playground form scopes, and checks TypeShade output tabs,
compiler option visibility, tooltips and submit/report dialog cancellation. The
report capability response is intercepted locally; no report is sent. TypeShade's
editor tests load its pinned Monaco CDN dependency, as the live editor does.

## Deliberate app boundaries

- TypeShade file tabs include rename, dirty state, pass toggles and editor focus;
  they remain an editor-specific file group. Output tabs share keyboard behavior
  while the app owns the combined WGSL/GLSL output panel and compilation state.
- Kernel graph hover inspection, chart rendering, datasets, GPU state, upload
  workflows and runtime execution remain in their apps. Shared UI does not import
  compiler, model or reconstruction code.
- Search retains its own native dialog behavior. Only the two repeated form
  dialogs use the new shared dialog controller in this slice.
- Automated axe checks cover the shared workbench and adopted form scopes, not a
  claim of whole-site accessibility certification or hardware GPU verification.
- Publishing, production cutover and merging the stacked migration PRs remain
  separate repository operations; this change adds no deployment trigger.
