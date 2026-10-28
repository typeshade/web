# Shared site UI

`@typeshade/site-ui` is linked into all three apps with `workspace:*`.
CSS, Astro and React have separate exports. Static Astro consumers do not require
React or Ant Design; these are optional peers supplied by interactive apps.

- `styles/tokens.css`: palette, spacing, radius, typography and motion primitives.
- `styles/product-theme.css`: TypeCV/TypeNN fonts and semantic theme mappings.
- `styles/product-shell.css`: TypeCV/TypeNN navigation and documentation shell.
- `astro/`: native HTML primitives and the product header, composed with slots.
- `react/`: document-theme subscription and Ant Design integration for islands.
- `styles/semantics.css`: surface, text, action, danger, focus and control roles.
- `styles/controls.css`: shared action styling, field states and accessibility modes.
- `react/controls.tsx`: Button, IconButton, Link, Field, Input, TextArea, NumberInput,
  Select and Checkbox. Numeric and choice interaction is backed by Ant Design.

Import tokens, the site's theme adapter, semantics and controls in that order.
Wrap React controls in ThemeProvider so the Ant controls read the same semantic
roles as native Astro/React actions. The CSS exports are explicit; importing a
component does not inject global CSS.

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
Run `pnpm build:ui && pnpm test:controls` for browser/axe checks. The workbench has
no production deployment. The [UI audit](../../docs/ui-audit.md) records migration
decisions, removed CSS and the remaining adoption slices.

Edit source here and verify all apps with the root build/check commands. No npm
release or tarball synchronization is needed. Keep domain execution, datasets,
translated copy and routing in the apps. New component styles belong with their
components; existing global files retain their deliberate cascade order.

Run `pnpm test:ui apps/typeshade/dist apps/typenn/dist apps/typecv/dist` after
building. Set `UI_CHROMIUM` to use a custom browser executable or `UI_SCREENSHOTS`
to retain desktop captures.
