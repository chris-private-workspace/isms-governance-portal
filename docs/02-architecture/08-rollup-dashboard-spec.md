# 08 — Roll-up Dashboard Spec

The Wave 1 flagship. Its job: let management and the regional office see risk & compliance posture **across all APAC subsidiaries at a glance**, with roll-up and drill-down, respecting entity scope. This spec defines the layout, metrics, thresholds, interactions, and the data the model must feed it.

## Audience & views

- **Regional / management view** — roll-up across all in-scope entities. The default landing view for regional-office and management users.
- **Entity drill-down** — one subsidiary's detail; reached by clicking an entity row.
- **Scope-respecting** — the same RLS scope as everywhere else (`03`): a subsidiary user lands on their own entity; the regional office sees all. The dashboard never bypasses scoping.

## Layout

1. **Header** — title + scope selector (region / entity subtree) + period selector + an overall posture pill (RAG).
2. **KPI row** — headline roll-up numbers: total risks; high/critical risks; control coverage %; overdue tests; open critical issues; RCSA completion %.
3. **Entity comparison matrix (the centerpiece)** — rows = entities, columns = key metrics, cells RAG-coloured. This is the panel that delivers the driver: scan for red. Rows are click-through to drill-down.
4. *(Optional, later)* risk-by-residual-rating distribution, and an "attention" list of the worst issues/overdue items.

## Metric definitions

All metrics are computed within the viewer's entity scope and rolled up over `OrgEntity.path`.

| Metric | Definition / formula | Source (from `02a`) |
|---|---|---|
| Total risks | count of active `Risk` in scope | Risk |
| High / critical | count of `Risk` where `rating_residual ∈ {High, Critical}` | Risk |
| Control coverage | % of risks with ≥1 linked control; and % of controls with `effectiveness = effective` | Risk ↔ Control, Control |
| Overdue tests | count of controls whose latest `ControlTest` is older than their `frequency` window (or never tested) | Control, ControlTest |
| Open critical issues | count of `Issue` where `severity = critical` and status ≠ Closed | Issue |
| RCSA completion | completed `Assessment` ÷ scheduled `Assessment` in the period | Assessment |
| Policy attestation | acknowledged `Attestation` ÷ required, per policy per entity | Policy, Attestation |
| Overall posture (RAG) | derived by a configurable roll-up rule (see below) | derived |

## RAG thresholds (defaults — configurable by governance)

| Metric | Green | Amber | Red |
|---|---|---|---|
| Control coverage | ≥ 80% | 70–79% | < 70% |
| RCSA completion | ≥ 80% | 60–79% | < 60% |
| Policy attestation | ≥ 90% | 80–89% | < 80% |
| Open critical issues | 0 | 1 | ≥ 2 |
| Overdue tests (per entity) | 0–2 | 3–5 | > 5 |
| Residual high/critical count | contextual — default ≤3 / 4–6 / ≥7, ideally normalised to entity size | |

- Thresholds are **configuration, not code** — the second line governs them.
- **Overall posture rule (default, configurable):** red if any critical issue is overdue OR coverage < red threshold; amber if any metric is amber; else green.

## Interactions

- **Drill-down:** click an entity row → that entity's detail (its risks, controls, issues).
- **Filters:** period, jurisdiction, entity subtree.
- **Board export:** point-in-time export (PDF/snapshot) for board/management reporting.

## Data-model dependencies

- The metrics read the status/rating/date fields already specified in `02a §6`. Confirm each entity carries them (it does in the current spec).
- **Trend & point-in-time reporting need snapshots.** Live queries give *current* posture only. To show trends and to reproduce "posture as at quarter-end" for the board, add a **`posture_snapshot`** table capturing per-entity metric values per period, written by a scheduled job (e.g. monthly). **This is a model addition to confirm** — recommended, because internal-visibility stakeholders will ask "are we improving?", which live-only data can't answer.
- Everything is entity-scoped so the roll-up is a hierarchy aggregation; no separate reporting store is needed for Wave 1.

## Open decisions (confirm)

1. **RAG thresholds** above — keep defaults, and confirm the second line owns them.
2. **Posture snapshots** — add the `posture_snapshot` table for trends/board reporting? (Recommended: yes, monthly.)
3. **Overall posture roll-up rule** — keep the default rule, or weight metrics differently.
4. **Board export** — required in Wave 1, or a later add?
