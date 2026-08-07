# CH-004: Audit all 30 screen fragments against the specs

**Date**: 2026-08-07
**Phase**: 無 —— 獨立 CH
**Scope**: `ui`, `core-model`
**Components**: —
**PR**: #5

---

## Problem

`15` reconciled the design handoff's **prose** — screens described, roles, retention, module scope.
CH-002 then audited its **sample data** and found the entity model contradicting the confirmed
scope. The **markup itself** — 30 fragments, ~470 KB, the thing that actually gets ported — had
never been read against the specs.

Two open questions it needed to answer:

1. Does the BFSI / India residue CH-002 found in `data/*.js` extend into the markup? That
   determines whether `AD-Port-BFSI` is a fixture job or a full-repo sweep.
2. Do the screens implement what the procedures require? `15` §4 had flagged one divergence
   (single impact value) without reading the form.

## Root Cause

Same pattern as CH-001/002/003: the specs are individually good and collectively unreconciled.
`15` was written from the handoff's documentation, so anything true of the artifacts but absent
from their description was never checked.

The specific mechanism here: **a missing field looks identical to an out-of-scope field.** `11`
mandates a restricted block on the incident form; screen 17 has no such block; nothing reconciled
the two, so the omission read as a design decision rather than a gap.

## Solution

Structural sweep, then full reads where the sweep flagged an anomaly. Findings recorded; nothing
redesigned. Two factual errors in `15` corrected in place.

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/09-analysis/screen-fragment-audit-20260807.md` | 新增 | 10 sections: the clean result, five findings, confirmations, actions, method note |
| `docs/09-analysis/INDEX.md` | 修改 | Index row |
| `docs/02-architecture/15-design-alignment.md` §6 | 修改 | **Nav groups corrected** — five, not four; the AI agent has its own group and is the first item |
| `docs/02-architecture/15-design-alignment.md` §4 | 修改 | Note that the risk-form gap is a different methodology, not four missing inputs |
| `docs/01-planning/BACKLOG.md` | 修改 | 6 new ADs (2× 🔴 P0); `AD-Port-BFSI` downgraded 🟡→🟢 |

### The result that reduces work

**The markup is clean.** A sweep for `India · RIN · Japan · MAS · FSA · APRA · HKMA · BNM · PBoC ·
AML · sanctions · DPDP` across all 30 fragments returns **one real hit** — an entity dropdown on
the registration screen. `AML` matched only as a substring of `SAML` and was discarded on
inspection.

`AD-Port-BFSI` is therefore a data-fixture job, not a markup sweep. Downgraded to 🟢 P2.

### The two findings that add work

**The risk form implements a different methodology** (§1 of the audit). Seven fields, no
before/after-control structure at all — one readout labelled "Residual" — no asset → threat →
vulnerability → CIA chain, and `Owner` as free text rather than a user reference. `15` §4 asked
for "both score sets"; there is no structure to extend. Free-text `Owner` is the quiet one: it
removes the FK, and with it SoD enforcement and notification routing.

**The incident form has no restricted block** (§2). `11` §Access control specifies violating acts,
motives, disciplinary action and president view as employee-conduct data requiring a CISO/HR
permission gate and audited access. It is absent from screen 17 entirely. Porting as designed
drops both the requirement and the control protecting it — the worst combination, because the
control's absence is invisible once the field group is also absent.

### Load-bearing details

- **Fragments contain no role logic** — role names appear twice across 30 files. `15` §5.1 requires
  navigation, route and action enforcement; porting the fragments delivers **none of it**. Stated
  explicitly in the audit because "we ported the screens" can be heard as "the permission model
  came with them".
- **The AI agent is the first nav item**, in its own `Intelligence` group above the flagship
  dashboard — a Wave 3 module at the top of the sidebar. That is a product-positioning decision
  living inside a nav structure, and no document makes it.
- The dashboard's column header is the generic `Entity`, so **the country-key problem is in the
  data, not the table**. The markup is agnostic — which is why `AD-Mockup-2` is a fixture fix.

## Verification

**Gate**: `run_all` 5/5 · no code, no build, no tests

**新增測試**: none — documentation change.

**Drive-through**: ⚪ N/A — no running app.

**Verdict**: ⚪ N/A（純文件 —— **gate-only verified**）

Screens not named in the audit were swept and showed no spec conflict; §10 states this so that
absence from the findings list reads as "checked", not "skipped".

## Impact

- **Breaking change**: no
- **Migration**: no
- **Config**: none
- **Rollback**: revert the PR

## 相關

- **同類前例**: CH-001, CH-002, CH-003. **Fourth instance of the same pattern**, and the last
  large unaudited artifact is `design/support.js` (67 KB) plus the standalone prototype.
- **產生的待辦**: `AD-RiskForm-1`, `AD-Incident-1` (both 🔴 P0), `AD-Nav-1`, `AD-Switcher-1`,
  `AD-Auth-1`, `AD-Nav-2`
- **關掉的待辦**: none — this was pure discovery
- **Still blocking M1**: ADR-0006 → ADR-0001 / ADR-0004. Unchanged by this audit.
