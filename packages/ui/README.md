# Shared site UI

`@typeshade/site-ui` is linked into all three apps with `workspace:*`.
CSS, Astro and React have separate exports. Static Astro consumers do not require
React or Ant Design; these are optional peers supplied by interactive apps.

- `styles/tokens.css`: palette, spacing, radius, typography and motion primitives.
- `styles/product-theme.css`: TypeCV/TypeNN fonts and semantic theme mappings.
- `styles/product-shell.css`: TypeCV/TypeNN navigation and documentation shell.
- `astro/`: native HTML primitives and the product header, composed with slots.
- `react/`: document-theme subscription and Ant Design integration for islands.

Edit source here and verify all apps with the root build/check commands. No npm
release or tarball synchronization is needed. Keep domain execution, datasets,
translated copy and routing in the apps. New component styles belong with their
components; existing global files retain their deliberate cascade order.

Run `pnpm test:ui apps/typeshade/dist apps/typenn/dist apps/typecv/dist` after
building. Set `UI_CHROMIUM` to use a custom browser executable or `UI_SCREENSHOTS`
to retain desktop captures.
