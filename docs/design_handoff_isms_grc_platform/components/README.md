# Components

The component inventory for the platform. Build these first — every screen is assembled from them.
Class names refer to `styles/components.css`; "seen in" points at the fragment to read for exact markup.

Grouped specs:

- `shell.md` — navigation rail, topbar, agent drawer
- `data-display.md` — data table, KPI card, record panel, lifecycle stepper
- `status.md` — RAG pill, status dot, grade badge, the `tok()` rule
- `controls.md` — buttons, inputs, filter chips, segmented tabs, role switch, toasts and banners
- `document-viewer.md` — policy viewer and its side menu
- `chat.md` — ISMS AI Agent panel

## Build order

1. `AppShell` (rail + topbar) — every screen sits inside it
2. `DataTable`, `StatusPill`, `RagDot` — the list screens are ~80% of the product
3. `SegmentedTabs`, `FilterChips`, `Button`, `Field` — interaction primitives
4. `DetailHeader`, `RecordPanel`, `LifecycleStepper` — the detail pages
5. `KpiCard`, heat matrix, trend cards — dashboard
6. `DocumentViewer`, `ChatPanel` — the two specialised surfaces

## Conventions that apply to every component

- **Monospace for data.** Identifiers, ISO dates, counts, percentages and file names use `--mono`.
  Labels and prose use IBM Plex Sans.
- **One shadow.** `--shadow` only. Depth comes from borders and surface steps, not elevation.
- **Status colour comes from one function.** Never hard-code a status colour at the call site — see
  `status.md`.
- **Gap, not margins.** Sibling groups use flex/grid with `gap`.
- **Tables scroll, they don't reflow.** Below the design width a table scrolls horizontally inside
  its card; columns are never dropped, because each one is audit-relevant.
- **Icons** are 24×24 stroke SVGs (Lucide-style, `stroke-width` 1.7–2.1, round caps) rendered at
  13–18px. No icon fonts, no emoji.
