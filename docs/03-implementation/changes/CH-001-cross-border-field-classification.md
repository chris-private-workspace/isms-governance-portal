# CH-001: Classify every roll-up field for cross-border transfer, and make the residency border configuration

**Date**: 2026-08-07
**Phase**: 無 —— 獨立 CH
**Scope**: `entity-scope`, `core-model`
**Components**: —
**PR**: #2

---

## Problem

ADR-0006 (deployment & data-residency topology) is blocking for M0 — no table can be created
until it is settled — but it was unanswerable as posed. "What does PIPL require for the China
entity?" has no engineering answer, and asking Legal that question returns a legal essay rather
than a topology.

The blocking chain is real: `07` M0's definition of done requires ADR-0006 settled;
ADR-0001 (framework) and ADR-0004 (RLS strategy) both depend on the topology; M1 cannot create
a table before any of them. Nine ADRs are open and none is written.

Meanwhile the data that would cross the border was never enumerated anywhere. `03` said only
that `Jurisdiction` "carries a residency policy", and `02a` modelled that as a three-value enum.

## Root Cause

Not "the ADR hasn't been written yet" — that is the symptom.

The design treated residency as a **property of a jurisdiction** (`residency_policy`:
none/conditional/localised) rather than as a **rule about specific fields**. A three-value enum
cannot express "aggregate counts may leave but record narratives may not", which is the only
form in which the question is actually decidable. So the decision had nowhere to land, and it
stalled.

Second contributing cause: the two applicable legal regimes were collapsed into one line —
`15-design-alignment.md` §1 lists "China (PIPL/DSL/CSL)" as a single item. PIPL (personal
information) and DSL/CSL (important data) constrain **different tiers** of this platform's data
and have different answers. Treating them as one question made it look harder than it is.

## Solution

Enumerate the fields, tier them, and move the border into configuration.

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/02-architecture/03-multi-entity-and-jurisdiction.md` | 新增 §Cross-border data classification | Three tiers with per-field personal-info and posture-disclosure flags; PIPL-vs-DSL split; topology consequences per possible legal answer; four answerable questions for Legal |
| `docs/02-architecture/02a-data-model-spec.md` §3 Jurisdiction | 修改 | `residency_policy` enum expanded with 7 configuration fields (`deployment_region`, `cross_border_max_tier`, `cross_border_metric_allowlist`, `cross_border_pseudonymise_actors`, `cross_border_requires_approval`, `cross_border_legal_basis`, review stamps) |
| `docs/02-architecture/02a-data-model-spec.md` §7 `posture_snapshot` | 修改 | `metric_key` fixed to the nine metrics `08` defines; added `source_region` / `replicated_to_region` / `replicated_at` / transfer-approval fields |

Two decisions inside this that are load-bearing and easy to undo by accident:

1. **`metric_key` is a fixed governed set, not free-form.** Each key is individually classified
   for transfer. A free-form key would cross the border unreviewed — the classification would
   silently stop covering the data it exists to cover.
2. **The transfer rule is enforced at the database layer**, alongside the entity-scoping RLS,
   not in application code. An application-only check fails silently and unlogged, and an
   unlogged cross-border transfer is the one failure here that cannot be remediated afterwards.

Chosen over the alternative of writing ADR-0006 directly: the ADR still needs a legal input this
project does not have. This change produces the artifact that makes that input obtainable,
without pre-committing the decision.

Also identified: `Jurisdiction.cross_border_pseudonymise_actors` removes the entire PIPL surface
from tier 2, because `risk_owner` name + job title is the only tier-2 field carrying personal
information. The same fix is already required independently by
`rules-on-demand/multi-tenant-data.md` (audit trail stores pseudonyms, to reconcile the erasure
right with guardrail 5). Two constraints, one mechanism.

## Verification

**Gate**: `run_all` 5/5 · no code, no build, no tests

**新增測試**: none — documentation change. The rules this specifies become testable at M2
(the four entity-scope tests in `multi-tenant-data.md` §測試 gain a fifth: a snapshot row whose
`metric_key` is outside the jurisdiction allowlist must not replicate).

**Drive-through**: ⚪ N/A — no user-facing surface exists yet.

**Verdict**: ⚪ N/A（純文件 —— **gate-only verified**）

## Impact

- **Breaking change**: no
- **Migration**: no (no schema exists yet; this changes the spec M1 will build from)
- **Config**: none yet — introduces 7 `Jurisdiction` fields that M1 must create
- **重啟需求**: —
- **Rollback**: revert the PR; nothing depends on it yet

## 相關

- **Unblocks**: ADR-0006 → ADR-0001 / ADR-0004 → M0. Still requires the Legal answer to the four
  questions in `03` §Questions for Legal / the DPO.
- **Confirms**: `08` §Open decisions #2 (`posture_snapshot`) — already confirmed in `02a` §7,
  now given a second, independent justification (it is the residency interface).
- **產生的待辦** → `docs/01-planning/BACKLOG.md`:
  - Dashboard freshness: read the comparison matrix from `posture_snapshot` for *all* entities so
    the as-at time is uniform. Confirm before M8.
  - `15` §7 actions #3 and #4 remain open and both change the data model — settle before M1.
