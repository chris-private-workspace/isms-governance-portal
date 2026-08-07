# Interaction components

## Button

`.grc-btn` with `--primary` or `--ghost`. 34px default (38px on page headers, 30px inline in rows).
Radius 8px, 12.5px/600 label, optional 15px leading stroke icon, 7px gap. Transitions are 140ms on
colour only. Disabled is `opacity: .5` with `cursor: not-allowed`.

Rules from the design:
- One primary action per view. Everything else is ghost.
- Destructive actions are ghost with `--rag-r-ink` text; they always confirm.
- Buttons a role cannot use are **not rendered**, not disabled — except where disabling communicates
  a temporary state (see the tab lock below).

## Field / input

`.grc-field` — 11px uppercase label above a 36px input, 6px gap. Focus ring is
`--primary` border plus a 3px `--primary-tint` glow. Read-only and disabled inputs take `--surface-2`.
Textareas are 90px minimum with 1.55 line-height. Help text sits below in 11.5px `--text-3`;
validation errors replace it in `--rag-r-ink`.

Forms lay out on a 2-column grid (`minmax(0,1fr)` twice, 14px gap) with full-width rows for
textareas, grouped under 11px uppercase section headings with a hairline above.

## FilterChips

`.grc-chips` / `.grc-chip` — single-select. Active is `--primary` fill with white text; inactive is
`--surface-2` with a `--border-strong` outline. First chip is always "All". Counts may follow the
label in mono. The active filter is part of the screen state and should survive navigating into a
detail and back.

## SegmentedTabs

`.grc-tabs` / `.grc-tab` — a 3px-padded `--surface-3` track; the active tab is `--surface` with a
`--border-strong` border and `--primary-ink` label. Used for detail-page tabs, the period control,
the risk programme sheets and the role switches.

**Tab lock:** when a detail enters edit mode, the non-active tabs are disabled
(`opacity: .5`, `cursor: not-allowed`) so Save/Cancel in the header can never appear over a pane
with nothing to edit. This rule exists because it was a real defect — keep it.

## RoleSwitch

Visually a SegmentedTabs, semantically a permission scope. Two exist in the design:

- **Agent** — Platform admin / OpCo IT / OpCo OS: hides the knowledge-source list and agent
  configuration for the two OpCo roles.
- **ISMS profiles** — Platform administrator / OpCo administrator / OpCo OS: controls whether the
  OpCo list is visible, whether editing is allowed, and what the banner says.

In production these come from the signed-in user's role. Keep the switch only as an internal demo
affordance, or drop it and drive the same branches from the session.

## Banner

`.grc-banner` — 11px 15px, radius 10px, 1px border, 12.5px/600 text with a 16px leading icon.
Four variants (r / a / g / i). Sits directly under the detail header or above a card it qualifies.

Banners in the design, all of which carry meaning and should be reproduced:
- audit issue past its CAP date — escalated to the Information Security Committee
- OS service outside certified ISMS scope — scope extension required before it can be sold as certified
- policy file converted for preview, or scanned and not searchable
- ISMS profile read-only for OpCo OS, and "other operating companies are not visible" for OpCo admin
- incident severity S1/S2 notification set

## Toast

Bottom-centre, `--surface`, 1px `--border`, radius 10px, `--shadow`, 12.5px text with a leading
status dot, auto-dismiss ~4s. Fires on save, submit, version creation and export.

## EmptyState

Inside the card body: 20px padding, 12.5px `--text-3` sentence that says what is missing **and what
it would take to fill it** — e.g. "No evidence has been attached yet. Closure requires
implementation evidence accepted by the auditor." Never a bare "No data".
