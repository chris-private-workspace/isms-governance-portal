# CH-024: The shared assessment engine, and a snapshot the caller cannot write

**Date**: 2026-08-13
**Phase**: W09 (M1 slice 6)
**Scope**: `core-model` + `modules` — 3 tables, 2 migrations, 6 endpoints (NO frontend)
**Components**: —
**PR**: #50

---

## Problem

`05:38-47` marks the shared assessment engine with a ★ and states the reason plainly:
RCSA, control testing and vendor service audits are *the same pattern* —
template → assign → respond → review → findings → issue — so it must be built
**once** "rather than three times".

Not one of its three tables existed. Meanwhile W07 built `ControlTest` as control
testing's own table, so the thing `05` warns about had already started: each module
growing its own questionnaire shape is exactly the "private definition of a shared
entity" guardrail 3 forbids.

Downstream was already in place (`Issue` → `Action`, W08). The upstream that
produces findings was missing.

---

## Root Cause

Not "nobody got to it". The engine sits in `05` (foundation services) while the
modules that consume it sit in `02a` §3, and the build order followed `02a`. A
slice sequence driven by one document will finish that document's list before
starting another's, and nothing was watching the seam.

`02a:52` does carry the three entities, which is why `check_entity_index.py`
counted them as unbuilt rather than unknown — the index was right, the ordering
was silent.

---

## Solution

### 範圍決策

**Three tables, not four** (user, 2026-08-13). `02a:34` lists `Assessment` (RCSA)
as a Wave-1 entity, and `02a:223` gives it a full column list — which duplicates
`AssessmentInstance` under different names (`assessor_user_id` for
`assignee_user_id`; `submitted_at`+`reviewed_at` for `status`), while §4 defines
**one** lifecycle for the pair. Ruled a use case, not a table.

⚠️ **The ruling had a cost nobody saw when it was made.** It was decided on the
column overlap; the enums were not compared. `02a:326` and `05:43` both give the
engine `risk/control/**vendor**/entity`, while `02a:223` gives `Assessment`
`risk/control/**process**/entity`. `process` now has no home, so an RCSA over a
process — which `02a:223` explicitly contemplates — cannot be expressed. Built to
the two sources that agree; recorded as `AD-AssessmentProcessSubject-1` rather
than merged on my own authority (已確認參數 #9).

**`AssessmentTemplate` is entity-scoped by default, not by specification.**
Measured at Day 0: `02a:52`, `02a:326` and `05:42` are all silent on its scope
shape, and three precedents were available — a global library (`Threat`), an
entity-scoped catalog (`extension_fields`), and row-level scope (`Control`,
ADR-0014). The most restrictive was taken, because widening later is a migration
while narrowing later is a data-loss question. `05:39`'s "shared" describes three
*consumers* of a mechanism, not sharing of rows.

### 逐項變更

**1. Three tables + three enums** (`schema.prisma`, `20260813032048_assessment_engine`)
— per-command RLS (SELECT/INSERT/UPDATE, no DELETE), `FORCE ROW LEVEL SECURITY`,
one `validate_extensions` trigger each, composite anchors on templates and
instances.

**2. `evidence` gains a composite anchor** (same migration) — **the first time this
project has gone back to a table an earlier phase delivered.** `asset_groups`,
`assets` and `issues` each got theirs in the same migration as the child that
needed one, so "can this parent offer `(id, org_entity_id)`" had never been asked
retroactively. W07's D1 criterion answers it: a trigger is for parents that
*structurally* cannot offer the pair — `controls` cannot, because a group-shared
control legitimately belongs to a different entity than its child. `evidence` has
no `applies_to_scope`; one row belongs to one entity. So it can, and
`assessment_responses.evidence_id` gets a key rather than a trigger that would
have been the wrong mechanism for the right fear.

**3. Segregation of duties as a CHECK** (same migration) — the first cross-column
constraint in this schema. `CHECK (reviewer_user_id IS NULL OR reviewer_user_id <>
assignee_user_id)`, and NULL is permitted on purpose: an instance may be scheduled
before anyone is named, and a constraint forcing both present would turn a duty
separation into a mandatory-field rule.

⛔ **Half of `05:47` is not enforced anywhere**: "for vendor audits the auditor must
be independent of the relationship manager" needs a `vendors` table, which `02a:59`
puts in Wave 2. Named in the migration so the gap is visible from the schema.

**4. `template_version` is taken by the database**
(`20260813033104_assessment_template_version_snapshot`) — see below.

**5. Six endpoints, three status codes** (`modules/assessment/`) — one controller
over three tables, because splitting the HTTP surface by table would re-introduce
at the edge the separation the data model just removed.

**6. `02a` §0 index correction** — the `Assessment` row is annotated, not deleted, so
the old name still finds its home. Denominator **36 → 35**, derived by
`check_entity_index.py`, not written by hand.

### ⭐ 關鍵設計細節 — the snapshot nobody can write

`02a:330` wants `template_version` to be a **snapshot** of the template's version at
assignment, so later edits cannot silently rewrite what an assignment was answered
against. Taking a snapshot means reading the template. But every scoped client
since W05 withholds the parent delegate, on stated grounds: *not granting it makes
the oracle unwritable rather than merely discouraged.*

Three options, two of them bad:

| Option | Why not |
|---|---|
| Caller supplies the version | Not a snapshot — an **assertion** wearing the word. Worse than the AP-3 risk already recorded as D12 |
| Grant `assessmentTemplate` to the instance client | Dismantle three phases of guard to fetch one integer |
| **Database fills it in `BEFORE INSERT`** | ✅ interface stays narrow AND the column means what `02a` says |

⭐ **That trigger nearly opened an oracle of its own.** Raising when the template is
unreachable would answer "not yours" differently from "not there" — the trap W07
measured from the other side, where what closed its oracle was the **order of
execution** rather than the trigger's presence. `COALESCE(..., 0)` and no RAISE, so
the composite key refuses both with `23503`. And `0` rather than NULL because a
BEFORE trigger runs ahead of NOT NULL too: a NULL would raise `23502` first and
bring the oracle back by a different route.

**Measured**: caller claiming 99 stores 1 · template bumped to 2 stores 2 ·
unreachable template gives 23503 not 23502 · an unrelated UPDATE does not re-take
it.

---

## Verification

**⚠️ gate-only verified — no drive-through.** This slice has no user-facing surface
(`apps/web` untouched), so no claim is made about usability.

| Gate | Result |
|---|---|
| lint | 0 error 0 warning ×2 |
| format · type-check · build | clean ×2 each |
| api unit | **314 / 31 suites** (was 276/27) |
| api integration | **145 / 11 suites** (was 125/10) |
| web | 10 |
| coverage | 92.07 / 90.67 / 97.14 / 93.49 (thresholds 80/70/80/80) |
| `run_all` | **7/7** · `check_entity_index` **17 / 35** |
| `lint:negative` | PASS (46 files, 0 bypasses, 3 allowlisted) |

**Meta-verification — six neutralisations, expectations written first**
(`AD-MetaVerificationBug-1`), including which tests must *not* move:

| N | Predicted red | Measured |
|---|---|---|
| N1 drop `responses→evidence` key | 12 | **12** |
| N2 `templates_insert` → `WITH CHECK (true)` | 15, and **16 stays green** | **matched** |
| N4 drop the SoD CHECK | 9, and **9c wrongly stays green** | **matched** |
| N4′ after anchoring 9c | 9 + 9c | **matched** |
| N5 drop `instances→templates` key | 8 · 10 · 11 | **matched** |
| N6 fixture orphan → a real index row | self-test FAIL, `run_all` 6/7 | **matched** |

⭐ N2's prediction is `AD-BorrowedRefusal-1` **predicted in advance for the first
time**: test 16 goes through the repository, which calls `issueRefCode` first, so
W04's counter policy refuses on the policy's behalf. Test 15 uses `createMany` to
bypass it, which is why only 15 pins this policy.

⛔ **The first N1 measured nothing and looked like a result.** Dropping the
constraint on `isms_test` with psql then running the suite gave 20/20 green — not
because the guard is redundant, but because the integration setup rebuilds and
re-migrates `isms_test` on every run. Written-first expectations are the only
reason that was read as "this measured nothing". **Neutralise the source, not the
state.**

Restore verified rather than assumed: both migrations byte-identical to backups
(`diff -q`), fixture `git diff` empty, all suites green.

---

## Impact

**Closed**: `AD-EntityIndexIncomplete-1`'s remaining half — the index now says what
`Assessment` is instead of listing an entity that will never be built.
D12 (template_version was AP-3-adjacent) is closed by the trigger plus a test that
exercises it at version 2.

**Opened**: `AD-AssessmentProcessSubject-1` (⚠️ a consequence of the user's ruling) ·
`AD-AssessmentDefinitionUnvalidated-1` · `AD-AssessmentQuestionNoFk-1` ·
`AD-ResponseRefCodeCost-1` · `AD-NeutraliseRebuiltState-1` · `AD-VendorAuditorSod-1`.

**Entities**: **17 / 35** (was 14 / 36 — the numerator gained three, the denominator
lost one because `Assessment` stopped being a row to build).

⚠️ **Coverage branch fell 1.23** (91.9 → 90.67), more than one module file explains
(`AD-ModuleCoverageDilution-1`) — the extra is the controller's three validation
paths. All four metrics remain far above the 80/70/80/80 thresholds.
