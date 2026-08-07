# Shell components

## AppShell

```
┌──────────────┬─────────────────────────────────────────────┐
│ NavRail 232  │ Topbar 56                                    │
│ (64 collapsed)├─────────────────────────────────────────────┤
│              │ main — overflow-y auto, padding 22px 26px 40px│
│              │   page — max-width 1400px                     │
└──────────────┴─────────────────────────────────────────────┘
```

Root element carries `data-grc` and `data-theme="light|dark"` so the tokens resolve.
Seen in: `fragments/shell/02-app-shell.html`.

## NavRail

`.grc-nav` — 232px, `--nav-bg`, sticky full height, 160ms width transition to 64px when collapsed.

- Product mark and platform name at the top (name hidden when collapsed).
- Groups with 10px/700 uppercase headings in `--nav-text-2`:
  - **Oversight** — Dashboard, Risks, Risk programme, Controls, Policies, Issues, Assessments, Audit issues
  - **Operations** — ISMS AI Agent, Security incidents, Suppliers
  - **Compliance** — APAC ISMS profiles, OS portfolio
  - **System** — Admin
- Item: 34px tall, radius 8px, 8px side inset, 10px gap, 15px stroke icon + 12.5px label.
  Hover and active use `--nav-surface` with white text; active is 600 weight.
- Count badges (Audit issues, Security incidents) sit right-aligned in mono 10px.
- Collapse toggle pinned at the bottom. When collapsed, labels are hidden and each item keeps a
  `title` for the native tooltip.
- Items are gated by the permission matrix — a role without read access to a module does not see
  its link at all.

## Topbar

`.grc-topbar` — 56px, `--surface`, bottom hairline, sticky, z-index 20. Left to right:

1. **Scope selector** — "APAC region roll-up" or a single OpCo. Changes the data scope of every screen.
2. **Period segmented control** — Q1 / Q2 / Q3 / Q4 / YTD.
3. **Search field** — 320px, radius 9px, `--surface-2`, magnifier icon, ⌘K hint chip on the right.
   Opens the command palette over the page.
4. **Notification bell** — unread count badge in `--rag-r`; opens the notification drawer.
5. **Language** — EN / 日本語 (the JP font stack is already in `--sans`).
6. **Theme toggle** — light / dark.
7. **Avatar menu** — my profile, preferences, switch entity role, sign out.

## CommandPalette

Centred overlay, 640px wide, radius 12px, `--shadow`, backdrop blur. Grouped results across risks,
controls, policies, incidents and audit findings; each row shows the record ID in mono, the title,
and the module name. Enter navigates to the record.

## NotificationDrawer

Right slide-over, 380px. Items grouped by day, unread marked with a 6px `--primary` dot, each with
the source module, one-line summary and relative time. "Mark all read" in the header.

## AgentLauncher + AgentDrawer

`fragments/shell/30-ai-drawer.html`.

- Launcher: fixed bottom-right pill, 44px tall, `--surface` with `--border-strong`, icon + "ISMS AI Agent".
- Drawer: right slide-over, 420px, the same chat panel as the full `/agent` screen but without the
  right-hand column. Closing preserves the thread.
