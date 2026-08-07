# Status components

## The single source of status colour

Every rating in the product — risk level, control health, posture, SLA state, incident severity,
audit grade, assessment result — resolves to one of four tokens: **G**, **A**, **R**, **N**.
The design implements one helper and uses it everywhere:

```js
// returns the background, ink and dot colour for a rating
function tok(rating) {
  switch (rating) {
    case 'G': return { bg: 'var(--rag-g-bg)', ink: 'var(--rag-g-ink)', dot: 'var(--rag-g)' };
    case 'A': return { bg: 'var(--rag-a-bg)', ink: 'var(--rag-a-ink)', dot: 'var(--rag-a)' };
    case 'R': return { bg: 'var(--rag-r-bg)', ink: 'var(--rag-r-ink)', dot: 'var(--rag-r)' };
    default:  return { bg: 'var(--surface-3)', ink: 'var(--text-2)',   dot: 'var(--rag-n)' };
  }
}
```

Implement the equivalent once. Domain values map onto it in one place:

| Domain | G | A | R | N |
|---|---|---|---|---|
| Risk level | Low | Medium | High / Critical | — |
| Control status | Effective | Needs improvement | Ineffective | Not tested |
| Incident severity | S4 | S3 | S1 / S2 | — |
| Audit grade | Observation | Minor | Major | — |
| SLA / due date | Within SLA | Due soon | Breached / Overdue | No target |
| Certification | Certified | In transition | Out of scope | Not applicable |
| Task / action | Complete | In progress | Overdue | Not started |

## StatusPill

Filled chip carrying a status word. `.grc-pill` + `.grc-pill--{g|a|r|n}`.

- 22px tall, 0 10px padding, radius 6px, 11px/700 label
- background `--rag-*-bg`, text `--rag-*-ink`
- optional leading dot for compound states

Seen in: every list screen; `fragments/screens/25-audit-issues.html` (grade), `24-os-portfolio.html`
(residual risk), `03-dashboard.html` (posture).

## StatusDot + label

`.grc-status` wrapping a 7px `.grc-dot--*` and a 12px/600 label in the matching ink colour. Used
where the pill would be too heavy — inside detail headers and table rows with long status words.

## GradeBadge

Same geometry as StatusPill, used for audit finding grades (Major / Minor / Observation) and
incident severity (S1–S4). Severity badges additionally carry the numeral in mono.

## Score chips

Risk scores render as a chip with the numeric score in mono plus the band word, e.g. `12 High`.
Inherent and residual scores appear side by side with an arrow between them on detail pages.

## Progress bar

Used for attestation %, assessment completion and access review progress.

- track: 6px tall, radius 3px, `--surface-3`
- fill: same height, colour from `tok()` on the band
- always paired with the numeric value in mono to its right; never the bar alone
