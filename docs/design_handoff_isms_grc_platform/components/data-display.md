# Data display components

## DataTable

The workhorse. `.grc-table` inside `.grc-card` with `.grc-table-wrap`.

- Header: sticky, `--surface-2`, 10.5px/700 uppercase `.45px` tracking, `--text-3`, `white-space: nowrap`.
- Row: `var(--row-py) 16px` padding, 1px `--border` divider, 12.5px text; hover `--surface-2`;
  whole row is clickable (`cursor: pointer`) where a detail page exists.
- Selected row: `--primary-tint`.
- Primary cell pattern: bold 13px title with a 10.5px `--text-3` meta line beneath (owner, clause,
  linked record). ID cells sit above the title in mono 10.5px `--primary-ink`.
- Numeric, date and percentage cells are mono and right-aligned when they form a column of figures.
- Density is user-adjustable through `--row-py` (5 / 7 / 10px).
- Narrow viewports scroll the table horizontally inside the card. Give grid-based rows an explicit
  `min-width` so columns cannot collapse into each other.

Optional parts: a header strip above the table with the record count and actions; filter chips
above that; a footer row for totals.

## KpiCard

`.grc-kpi` — label (11px uppercase `--text-3`), value (26px/700, `-.6px`), delta line (11.5px).
Value takes a RAG colour when the KPI itself is a status. Laid out four across in `.grid-kpi`,
12px gap, dropping to two across below ~1100px.

## RecordPanel

The right column of every detail page. `.grc-record`, 320px, key/value rows: key 12px `--text-3`
left, value 12px/600 right-aligned (mono when it is an ID or date). A hairline separates the
metadata block from the actions at the bottom (Export, Print, Archive).

## DetailHeader

Above the tabs on every detail page:

- Row 1: record ID (mono 12px `--primary-ink`), grade or severity badge, status dot + label.
- Row 2: title, `.t-page-title`, max-width ~760px, `text-wrap: pretty`.
- Row 3: context line, 12.5px `--text-2` — e.g. `FY26 ISMS internal audit · Ricoh (Malaysia) Sdn Bhd · clause 6.1.3`.
- Right: primary and secondary actions, aligned to the top of the block.
- A back button sits above the header, 30px tall ghost with a chevron, labelled with the list name.

## LifecycleStepper

`.grc-steps` — an equal-width grid, one column per step, `min-width: 620px` inside a horizontal
scroller. Each step: a 24px numbered circle plus a 2px connector bar, then a 11.5px/600 label and a
10.5px `--text-3` state line (Complete / Current / Pending).

Used by: audit issue (Raised → CAP submitted → CAP in progress → Verification → Closed), incident
(Reported → Triaged → Contained → Eradicated → Closed), supplier assessment, risk treatment.

## HeatMatrix

Dashboard 5×5 likelihood × impact grid. Square cells, radius 6px, background from the score band,
count in the centre in mono 13px/700; axis labels 10.5px `--text-3`. Cells are clickable and filter
the risk register.

## Timeline / history list

Two-column grid: 120px mono timestamp, then the event sentence in 12.5px `--text-2` with
`line-height: 1.5`. One row per event, hairline dividers. Used by audit issue history, incident
timeline and version history.
