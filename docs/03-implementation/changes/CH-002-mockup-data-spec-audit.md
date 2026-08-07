# CH-002: Audit all 24 design-handoff data files against the specs

**Date**: 2026-08-07
**Phase**: 無 —— 獨立 CH（closes `AD-Mockup-1`）
**Scope**: `core-model`, `ui`
**Components**: —
**PR**: #3

---

## Problem

`data/README.md` states the sample field names are *"the ones used throughout the fragments, so
keeping them makes the fragments read directly against your data"* — which makes those 24 files
the de-facto API contract for all 30 screens. They had never been checked against the specs.

A spot-check during CH-001 found three contradictions in one file (`risks.js`): a single `imp`
value against the RCI procedure's five, `5 × 4 = 25` arithmetic, and `entity:'Japan'` against
`15` §1's confirmed scope. Two were already known to `15` §4; the third was not. That ratio
suggested the remaining 23 files were worth reading before M1 builds tables from `02a`.

## Root Cause

`15-design-alignment.md` reconciled the handoff's **documented** design decisions — screens,
roles, retention, module scope. It did not read the **sample data**, because `15` §4 correctly
classified sample values as illustrative.

The gap: values are illustrative, but **shapes and entity keys are not**. The fragments read
against these field names, so the entity model embedded in the data is the entity model the
screens assume. That layer was never audited.

Contributing: the handoff contains two generations of data. The ISMS-derived files were clearly
rebuilt from the real company procedures; the core Wave 1 files were not, and still carry a
financial-services prototype's framing.

## Solution

Read all 24 files; record the delta as a dated analysis snapshot; push only the findings that
revise an existing spec back into that spec.

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/09-analysis/mockup-data-vs-spec-audit-20260807.md` | 新增 | Full audit — 8 sections covering scope contradictions, entity keying, risk representations, enum/field gaps, dashboard metrics, and the files that are clean |
| `docs/09-analysis/INDEX.md` | 修改 | Index row (required by `docs/README.md` §快照類文件的紀律) |
| `docs/02-architecture/15-design-alignment.md` | 修改 | New §8 with the six findings that **revise §1–§7**; actions 8–10 added to §7. Pointer only — the audit is not duplicated |
| `docs/01-planning/BACKLOG.md` | 修改 | `AD-Mockup-1` closed; 7 successor ADs opened (4× 🔴 P0); shipped-pointer rows for CH-001 and CH-002 |

**Deliberately not done: `02a` was not edited.** Sample data does not get to amend the canonical
model — `15` §4 already establishes that the procedures win. The gaps are recorded as decisions
to make, not fields to adopt. Auto-absorbing `suppliers.js`'s 16 fields into `02a` would be
exactly the "assume it exists, build it" anti-pattern, and it would launder a prototype's guesses
into the spec that M1 builds from.

The headline finding is structural, not cosmetic: **the flagship dashboard's aggregate
(`data.js`) is keyed by country, and cannot represent 14 OpCos across 12 jurisdictions** — RAP and
RSG are both Singapore, RAPO and RHK both Hong Kong. Six other files key correctly by OpCo code.
Porting `data.js` verbatim inherits an entity model that structurally cannot hold the confirmed
scope, so this is a 約束 6 STOP-and-ask rather than something to approximate quietly.

Load-bearing detail that is easy to lose: **`15` §6 says the handoff supersedes `09` as the UI
specification.** That remains true for layout, tokens and typography. §8.2 now states explicitly
that it does **not** extend to the entity model underneath — without that sentence, a future
reader resolves the conflict in favour of the mockup and reintroduces the country key.

## Verification

**Gate**: `run_all` 5/5 · no code, no build, no tests

**新增測試**: none — documentation change.

**Drive-through**: ⚪ N/A — no user-facing surface exists yet.

**Verdict**: ⚪ N/A（純文件 —— **gate-only verified**）

Every finding was read from the file, not inferred. Files with no spec conflict are listed
explicitly in §6 of the audit, so "not mentioned" cannot be misread as "not checked".

## Impact

- **Breaking change**: no
- **Migration**: no
- **Config**: none
- **重啟需求**: —
- **Rollback**: revert the PR; nothing depends on it yet

## 相關

- **關掉的待辦**: `AD-Mockup-1`
- **同類前例**: CH-001 — same pattern (make an unanswerable question answerable by enumerating
  the actual fields). If a third arises, the structural lesson is that **`15` reconciled the
  handoff's prose but not its artifacts**, and the remaining unaudited artifacts are the 30 screen
  fragments and `design/support.js`.
- **產生的待辦** → `docs/01-planning/BACKLOG.md`: `AD-Mockup-2/3/4`, `AD-Model-Vendor`,
  `AD-Model-AuditIssue`, `AD-Model-Gaps`, `AD-Port-BFSI`
- **Feeds**: ADR-0007 (`sessionPolicy.js` names Okta); `15` §7 action #3 (audit-issues enums)
