# CH-003: Entity index in `02a`, and the three P0 data-model decisions

**Date**: 2026-08-07
**Phase**: 無 —— 獨立 CH
**Scope**: `core-model`
**Components**: —
**PR**: #4

---

## Problem

Six P0 backlog items were blocking M1. Reading the specs to action them showed the backlog had
mischaracterised two of them, and surfaced a seventh problem larger than any of the six.

`02a`'s opening line claimed: *"This is what a build should follow to create tables and state
machines."* **That was false.** `Vendor` and its three companions are specified in `12`;
`ISMSProfile` and three more in `13`; the incident extensions in `11`. No document stated how the
pieces compose, so there was no complete list of what M1 would create.

The two mischaracterisations:

- `AD-DesignAlign-4` ("add access management + legal hold to `05`") — **already done.** `05`
  §Access management and §Records retention both carry full prose. `15` §7 #4 had been stale for
  some time and was still marked High.
- `AD-Model-Vendor` ("`02a` has no Vendor entity") — literally true of `02a`, but the CH-002
  audit stated it as an absence from the platform. `12` §Data model specifies `Vendor`,
  `VendorEvaluation`, `ExternalPartyRiskAssessment` (1:1 to the source form, matching
  `suppliers.js`'s 16 fields) and `VendorServiceAudit`. The gap was navigational, not substantive.

## Root Cause

`02a` was written as *the* data model, then module documents were added later, each correctly
specifying its own entities next to the form and workflow it was derived from. Nobody updated
`02a`'s claim about its own scope, and no index was created.

That is a **navigational** failure, not a modelling one — the entities were all specified
somewhere. But it presents identically to a missing entity when read from `02a`, which is exactly
how CH-002 recorded it.

The stale `15` §7 row has the same shape: an action list that nothing reconciles against reality
drifts silently, and each reader re-derives the same wrong conclusion.

## Solution

Three decisions taken by the user, then applied.

| # | Decision | Chosen over |
|---|---|---|
| 1 | **`02a` carries a complete entity index; module docs keep authority over their own entities** | Absorbing everything into `02a` (would bloat it past 25 KB and leave module docs with fields detached from their source forms); a third catalogue file (three sources that drift) |
| 2 | **Accept the fuller audit-issues module**, revising W2-2 | Keeping the lightweight version — but the handoff ships two screens for it, `Auditor` holds Full there and nowhere else, and CAP verification is what carries certification risk |
| 3 | **RM Report is a versioned snapshot over the live register, not a second store** | Two independent risk entities — which would drift and violate guardrail 3 |

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/02-architecture/02a-data-model-spec.md` | 修改 | New §0 — complete entity index across all five documents, plus a "not yet specified, must not be built" table and §0.1 known field gaps. Header corrected. New §3.1 (RM Report snapshot) and §3.2 (foundation-service entities) |
| `docs/02-architecture/17-audit-issues-module.md` | 新增 | `AuditIssue` + `CorrectiveActionPlan`, the three enums, lifecycle, the two hard certification rules, retention, access control |
| `docs/02-architecture/15-design-alignment.md` | 修改 | §7 actions 3, 4 and 10 closed with what was decided and where it landed |
| `CLAUDE.md` · `README.md` | 修改 | 18 → 19 specs; both now point at `02a` §0 before table creation |
| `docs/01-planning/BACKLOG.md` | 修改 | Five ADs closed; `AD-DesignAlign-5` and `AD-Model-Gaps` rescoped to what actually remains; two entries added to §Known Issues |

Load-bearing details that are easy to lose:

- **`clause_refs` must accept ISO 27001 main-body clauses, not only Annex A.** The sample data
  carries `6.1.3`, `7.2, 7.3`, `7.5.2` alongside `A.7.14`. A field typed to Annex A would reject
  real findings — and main-body nonconformities are the ones that threaten certification.
- **`AccessRequest.requester_user_id` must be nullable**, with `grant_duration` alongside it.
  `accessRequests.js` shows `who:'External — BSI auditor'`, `opco:'—'`,
  `ask:'Auditor (read-only) — 14 days'`. Modelling requesters as internal users only would force
  external auditors into permanent accounts — the opposite of the just-in-time control in `05`.
- **`RMReportVersion.approved_by` records `ISC`, a committee, not a user.** Left as free text with
  the gap flagged. Coercing a committee into a user record would misstate who approved.
- **`AuditIssue` is not a subtype of `Issue`** and the two must not be merged. Different retention
  (6 years vs per-class), different closure gate (verified effectiveness for majors), different
  audience.

## Verification

**Gate**: `run_all` 5/5 · no code, no build, no tests

**新增測試**: none — documentation change. The index becomes mechanically checkable at M1: a
migration creating a table with no row in `02a` §0 should fail lint. Recorded as a candidate
detector in `BACKLOG` §Known Issues rather than written now, since there is no migration tooling
to hook it to yet.

**Drive-through**: ⚪ N/A — no user-facing surface exists.

**Verdict**: ⚪ N/A（純文件 —— **gate-only verified**）

## Impact

- **Breaking change**: no
- **Migration**: no
- **Config**: none
- **重啟需求**: —
- **Rollback**: revert the PR

## 相關

- **關掉的待辦**: `AD-DesignAlign-3`, `AD-DesignAlign-4`, `AD-Mockup-4`, `AD-Model-Vendor`,
  `AD-Model-AuditIssue`
- **同類前例**: CH-001 and CH-002 — the third instance of the same pattern. **The structural
  lesson is now clear: this project's specs are individually good and collectively unreconciled.**
  CH-001 found residency unmodellable, CH-002 found the sample data contradicting the scope,
  CH-003 found the data model split with no index. All three were navigational or reconciliation
  failures, none was a modelling error. Expect the same from the 30 screen fragments.
- **仍開著**: `AD-Mockup-2` / `AD-Mockup-3` (port-time fixture work, not spec decisions),
  `AD-DesignAlign-2/5/7`, `AD-Model-Gaps`, `AD-Port-BFSI`, `AD-Residency-1`
- **Still blocking M1**: ADR-0006 → ADR-0001 / ADR-0004. **The data model is now buildable;
  the deployment topology is not decided.**
