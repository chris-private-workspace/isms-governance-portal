# CH-025: `process` rejoins the assessment engine's subject types

**Date**: 2026-08-13
**Phase**: 無 —— 獨立 CH（W09 post-closeout，同一個 PR）
**Scope**: `core-model` — 1 enum value, 1 migration, 1 spec correction
**Components**: —
**PR**: #50

---

## Problem

Two specifications each named a subject kind the other lacked:

| Source | `subject_type` values |
|---|---|
| `02a:326` (AssessmentTemplate) · `05:43` (AssessmentInstance) | risk · control · **vendor** · entity |
| `02a:223` (`Assessment` / RCSA) | risk · control · **process** · entity |

W09 built the four both sides agreed on, because merging two specifications is a
decision rather than a reading (已確認參數 #9), and recorded the difference as
`AD-AssessmentProcessSubject-1`. The consequence was concrete: **an RCSA over a
business process — which `02a:223` explicitly contemplates — could not be
expressed.**

---

## Root Cause

Not a specification conflict discovered late. It is a **side effect of a decision
made on different evidence**.

On 2026-08-13 the user ruled that `Assessment` (RCSA) is a use case rather than a
table, because its columns duplicate `AssessmentInstance` under different names
(`assessor_user_id` for `assignee_user_id`; `submitted_at`+`reviewed_at` for
`status`) while `02a` §4 defines one lifecycle for the pair. That reasoning is
sound and unchanged.

**The enums were never part of it.** Nobody compared them, so collapsing the two
tables silently dropped whichever subject kind lived only on the discarded one.
Losing `process` was not a trade anybody weighed — which is exactly why it is a
correction rather than a scope extension.

---

## Solution

### 範圍決策

**Add `process`, do not remove `vendor`.** The two lists are treated as a union,
not as rivals: `vendor` is named twice (`02a:326`, `05:43`) and vendor service
audits are one of the three consumers `05:39` builds this engine for. Nothing in
the user's ruling touched it.

⛔ **`02a:223` is NOT edited to drop `process`.** The opposite fix — declaring
that an RCSA does not cover processes — would have made the specification
consistent by deleting a capability, and no one asked for that.

### 逐項變更

**1. `AssessmentSubjectType` gains `process`** (`schema.prisma`) — order is
`risk, control, process, vendor, entity`: the superset that keeps **both** source
lists in their own relative order, so a reader comparing against either does not
have to reconcile a reshuffle.

**2. Migration** (`20260813053318_assessment_subject_process`) —
`ALTER TYPE ... ADD VALUE 'process' AFTER 'control'`. ⚠️ PostgreSQL 12+ permits
`ADD VALUE` inside a transaction as long as the label is not *used* in the same
transaction; this migration only declares it.

**3. `02a:326` corrected** — now lists five values, with a note recording that the
addition is **a ruling rather than a reading**, and why.

**4. `02a:34` annotation updated** — the `Assessment` row's "the ruling had a
cost" note becomes "since paid", pointing here.

**5. Controller spec** — the 400-path test used `process` as its unknown value and
now uses `supplier`. A **separate** test pins `process` as accepted.

### ⭐ 關鍵設計細節 — why the new test is not folded into the existing loop

`assessment.controller.spec.ts` already had "derives the accepted values from the
generated client", which iterates `Object.values(AssessmentSubjectType)` and
asserts each is accepted. That test would keep passing if `process` were removed
from the enum again — it asserts *every member is accepted*, not *this member
exists*. A named test for `process` is what would go red.

Same shape as W09's test 9c: an assertion about a set says nothing about
membership. `AD-TestNameWiderThanProof-1`, applied before it could bite.

---

## Verification

**⚠️ gate-only verified** — no user-facing surface.

- `pg_enum` after `migrate deploy`: **`risk | control | process | vendor | entity`**
- api unit **315 / 31 suites** (39 in the assessment suites, was 38)
- Full sweep re-run at closeout — see the commit body.

---

## Impact

**Closed**: `AD-AssessmentProcessSubject-1`.

⚠️ **A generalisable lesson, recorded as part of the AD's closure**: a decision to
merge two definitions must be checked **field by field including enum members**,
not by comparing field names. The overlap that justified the merge was real; the
difference that the merge destroyed was in a place nobody looked.

**Not changed**: `02a:223`'s own field list still describes `Assessment` (RCSA) as
it was specified. It is a historical description of an entity now realised as a
use case, and the `02a:34` annotation is what routes a reader from the old name to
the live one.
