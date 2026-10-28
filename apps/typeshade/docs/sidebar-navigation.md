# Documentation navigation

## Request

Reduce the desktop sidebar's complexity and make its relationship with the current page clear.

## Outcome

Show the current page and its parent context first. On a function page, name its function
family and provide a short list of related functions. Put site-wide navigation below it in
native collapsible groups. Keep the active page explicit and reachable without JavaScript.

Preserve the document container, grid columns, article width, destinations, and pager order.
Use the same navigation data on desktop and in the mobile documentation drawer.

The current page stays visible above the site-wide tree. Function pages link to their
family in the function index and show at most six related functions. An expandable parent
contains an Overview link and its children. The existing flat sidebar still determines
the pager order.

## Review

Compare the sidebar and article at 1440 and 390 in English and Korean, light and dark.
Check current-page visibility, relation labels, native disclosure controls, keyboard use,
all existing destinations, overflow, and unchanged article width. Keep before/after evidence.

## Measurements

Pow on 2026-10-23, light theme. Both languages have the same widths and positions.

| Viewport | Element                               | Before             | After          |
| -------- | ------------------------------------- | ------------------ | -------------- |
| 1440     | Article width and horizontal position | 836px at 312px     | 836px at 312px |
| 1440     | Sidebar width                         | 239px              | 239px          |
| 1440     | Visible navigation links              | 18                 | 7              |
| 1440     | Sidebar height, English               | 1000px, scrollable | 675px          |
| 1440     | Sidebar height, Korean                | 1000px, scrollable | 678px          |
| 390      | Article width and horizontal position | 358px at 16px      | 358px at 16px  |

The desktop rail remains hidden at 390px. The documentation drawer uses the same context
and collapsible tree. The before/after review covers 11 route types in both languages,
themes, and sizes. The rendered navigation audit covers every document and compares its
destinations and pager with the prior build when `NAVIGATION_BASELINE` names that build.
