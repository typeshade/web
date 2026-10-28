# UI foundations: first adoption slice

Scope: the three public sites, with implementation in the TypeNN training lab,
TypeCV reconstruction lab and static site actions. This is the first design-system
slice; editor, chart, dataset and runtime interfaces still belong to their apps.

## Observed patterns

| Pattern                 | Existing implementations                                                                                                 | Change in this slice                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Actions                 | TypeShade `styles/controls.css`, both product `styles/home.css`, extra TypeCV `cv-features.css`, Ant buttons inside labs | One shared stylesheet, native React/Astro Button, legacy static `.button` aliases; remove duplicate definitions             |
| Form labels             | TypeNN wraps Ant Select/InputNumber in labels; TypeCV places its help outside the focal field                            | Field owns the label ID, description and error associations; controls inherit disabled/required state                       |
| Number and choice input | Direct Ant imports with page-owned presentation                                                                          | NumberInput/Select expose the existing typed value handlers through the package; Ant remains the interaction implementation |
| Text entry              | TypeNN model trials separately assemble text areas and feature inputs                                                    | Input/TextArea use the same Field and theme contract                                                                        |
| Theme                   | Palette/radius shared, application variable names differ, React only reads brand/font/radius                             | Semantic `ui-*` roles adapt existing site surfaces/text and drive React controls plus native CSS                            |
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

## Follow-on slices

1. Adapt remaining playground controls. TypeShade's editor uses native DOM event
   hooks, so extend the Astro/native field contract without introducing React into
   the static site. Preserve editor shortcuts and focus restoration.
2. Inventory Tab, Dialog, Alert, Tooltip and Menu behavior before extraction.
   Include keyboard navigation, focus management and dismissal semantics.
3. Extract repeated Toolbar/Panel/EmptyState compositions after at least two
   consumers demonstrate the same structure. Keep dataset selection, GPU state,
   code editors and visualizations in their owning apps.
4. Retire the legacy `.button` compatibility selectors after static call sites use
   the shared Astro components. Retire app token aliases when the remaining CSS
   has moved to semantic roles. Existing unrelated Ant overrides are still app-owned.
