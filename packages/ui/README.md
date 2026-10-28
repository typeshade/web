# Shared site UI

`@typeshade/site-ui` is linked into all three apps with `workspace:*`.
CSS, Astro and React have separate exports. Static Astro consumers do not require
React or Ant Design; these are optional peers supplied by interactive apps.

- `styles/tokens.css`: palette, spacing, radius, typography and motion primitives.
- `styles/product-theme.css`: TypeCV/TypeNN fonts, color scheme and Tailwind role mappings.
- `styles/product-{header,footer,frame,sidebar}.css`: TypeCV/TypeNN shell owners.
- `astro/ReadingSurface` and `astro/HomeSurface`: scoped editorial and home layouts.
- `astro/`: native HTML primitives and the product header, composed with slots.
- `react/`: document-theme subscription and Ant Design integration for islands.
- `styles/semantics.css`: surface, text, action, danger, focus and control roles.
- `recipes/`: Tailwind classes and typed CVA variants shared by Astro and React.
- `styles/tailwind.css`: semantic token mappings and explicit workspace source detection.
- `styles/controls.css`: the small Ant Design focus bridge.
- `styles/tooltip.css`: positioning and visibility for the DOM tooltip controller.
- `react/controls.tsx`: Button, IconButton, Link, Field, Input, TextArea, NumberInput,
  Select and Checkbox. Numeric and choice interaction is backed by Ant Design.

Use Tailwind CSS v4 with the Vite plugin. Import the shared integration in each
app's main stylesheet; it registers the package sources that automatic app
detection does not scan:

```css
@layer theme, base, antd, components, utilities;
@import "tailwindcss";
@import "@typeshade/site-ui/tokens.css";
@import "@typeshade/site-ui/semantics.css";
@import "@typeshade/site-ui/tailwind.css";
/* Import the site's theme adapter after the shared defaults. */
```

A site adapter overrides roles, not individual component internals.
If using Ant's reset, import it with `layer(base)`. `ThemeProvider` uses
`@ant-design/cssinjs`'s `StyleProvider layer`, so Ant styles sit in the `antd`
layer and consumer utilities can override their sizing. React consumers supply
the optional `@ant-design/cssinjs` peer alongside Ant Design. Keep the layer order
before imports; declaring it after Tailwind would put Ant above the utilities.
Wrap React controls in ThemeProvider so the Ant controls read the same semantic
roles as native Astro/React actions. Native controls and compositions use the
same Tailwind recipes in both renderers. CVA defines typed size/tone/variant
choices; `cn` combines conditional classes with `clsx` and resolves conflicting
utilities with `tailwind-merge`. Consumer `class`/`className` comes last, so
`class="px-ui-6"` overrides button padding consistently in Astro and React.
Keep complete class literals in recipes; dynamically constructing partial
utility names would make Tailwind source detection miss them.

Use `react/theme` for theme-only islands. Shell, generated prose/code, tooltips
and the Ant Design DOM bridge retain owner-imported CSS where selectors need
to reach markup outside the component. Do not add duplicate CSS skins for
components already covered by recipes.

```tsx
import { Field, NumberInput, Button } from '@typeshade/site-ui/react';

<Field label="Batch size" description="Examples per training step." error={error}>
  <NumberInput min={1} max={128} value={batch} onChange={setBatch} />
</Field>
<Button variant="primary" loading={running} onClick={run}>Train model</Button>
```

Field owns one control's ID; set `id` on Field if you need a stable external target.
Field supplies required/disabled state and connects help and errors automatically.
NumberInput reports `number | null`; keep each app's existing empty-value policy.
Select supports a single typed string choice. Input and TextArea use normal change
events. Checkbox requires visible label content. Use `tone="danger"` for a destructive
action, `loading` for an in-progress action, and `type="submit"` explicitly for forms.
Use an anchor or Astro LinkButton for navigation. Button defaults to `type="button"`.

Run `pnpm dev:ui` to inspect the workbench at `http://localhost:4324/`.
Open `/patterns/` for tabs, dialogs, native forms, disclosure menus and tooltips.
Run `pnpm build:ui && pnpm test:controls && pnpm test:patterns` for browser/axe checks. The workbench has
no production deployment. The [UI audit](../../docs/ui-audit.md) records migration
decisions, removed CSS and app ownership boundaries.

Edit source here and verify all apps with the root build/check commands. No npm
release or tarball synchronization is needed. Keep domain execution, datasets,
translated copy and routing in the apps. New component styles belong with their
components. Global entries contain only reset, tokens, theme, fonts and base
accessibility. Put responsive and forced-color rules beside the styles they
override. Do not import route styles from the global entry or a shared barrel.
Use `HomeSurface` around product landing content and `ReadingSurface` around
product documentation/playground page chrome; their selectors are limited to
those roots. Product-specific document and feature layouts stay in the apps.

Run `pnpm test:styles apps/typenn/dist apps/typecv/dist apps/typeshade/dist` to
check global import boundaries and route-specific CSS in built HTML. CI runs
this after each site's build.

Run `pnpm test:ui apps/typeshade/dist apps/typenn/dist apps/typecv/dist` after
building. Set `UI_CHROMIUM` to use a custom browser executable or `UI_SCREENSHOTS`
to retain desktop captures.

Compositions are exported from `react`: `Tabs`, `Toolbar`, `Panel`, `EmptyState`
and `Alert`. Tabs is controlled (`items`, `value`, `onChange`, accessible `label`),
uses automatic activation and supports disabled items. Alert defaults to static
content; set `live` only for a new status or error. Toolbar is a labelled group,
so its actions retain ordinary Tab order.

Astro exports include `Field`, `Checkbox`, `IconButton`, `Dialog`, `Toolbar`,
`Panel`, `Alert`, `TabList` and `Tab`. The tab primitives render the shared
appearance and roles; IDs, panels and the DOM controller remain explicit.
Native Field requires an explicit `id` and `label`; use
`as="select"` with option children or `as="textarea"` with text children. Set
`hidden` on Field to hide the label and control together. Native IconButton adds
a focus/hover tooltip using `description` (or the required label).

Import DOM behavior explicitly from `dom/tabs`, `dom/dialog` or `dom/menus`.
`controlDialog(dialog).open(trigger, initialFocus?)` records the actual opener;
use it after delayed initialization as well. The dialog element requires
`aria-labelledby`; it keeps native validation, close and cancel behavior.
`enhanceTabs(group)` requires tab IDs, aria-controls and labelled panels; hide the
head until `data-ui-tabs-ready` is present, and leave panels readable before that.
`bindDisclosureMenus(menus, mobileMenu?)` enhances native navigation disclosures,
not an ARIA application menu. DOM controllers return cleanup/destroy functions
for consumers with a mount/unmount lifecycle.
