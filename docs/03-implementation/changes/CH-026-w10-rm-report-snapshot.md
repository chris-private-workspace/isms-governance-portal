# CH-026 — Risk Management Report as an immutable versioned snapshot

**Type**: Change (phase-produced record — W10, M1 slice 7)
**Status**: Closed（MERGED PR #52, `afa667a`）
**Created**: 2026-08-13
**Phase**: [W10](../../01-planning/W10-m1-rm-report-snapshot/plan.md)

---

## Problem

`07:32`'s M1 definition of done names **versioning**, and seventeen tables in, nothing in this
schema stored what anything looked like at a past moment. The `version` column every table
carries is an optimistic-lock counter, not a version history.

`02a` §3.1 specifies the mechanism — a live risk register plus periodic immutable snapshots,
approved by the Information Security Committee and retained three years per version (`05:76`) —
and had no implementation. Without it, "what did the register look like when 2025.7 was
approved?" can only be answered from live data that has since changed.

## Root cause

Not a defect: an unbuilt slice. What made it non-trivial is that `02a` specifies **two** ways to
say which version is current — `current_version_id` on the parent (`02a:253`) and
`state (current / superseded)` on the version (`02a:257`) — and building both would contradict
`02a:260`, which says a version is never edited. Flipping `state` is an edit.

## Solution

**Two tables, and the mutable half is the parent.** `rm_reports` holds `current_version_id`;
`rm_report_versions` holds the frozen sheets and gets **no `FOR UPDATE` policy at all**. `state`
is a recorded deviation (`02a:257`, note added by this change); *superseded* is derived.

| Piece | What it does |
|---|---|
| `20260813071857_rm_report_snapshot` | Both tables · two composite FKs · GRANT without UPDATE on versions · **five** policies (3 + **2**) |
| `20260813152548_promote_on_issue` | `AFTER INSERT` trigger: issuing a version moves the report's pointer, atomically |
| `20260813153153_version_label_key_scoped` | `org_entity_id` into the version-label unique key — closes an existence oracle |
| `core-model/rm-report.repository.ts` | One file, both tables (the `asset.repository.ts` shape) |
| `modules/rm-report/` | Four endpoints: list + create, per table |
| `scope-refusal.ts` | `DuplicateKeyError` / `isUniqueViolation` — SQLSTATE 23505, the fourth code |

**Three decisions worth re-reading before changing any of this:**

1. **The promote is in the database because it could not be in the repository.** `runScoped`
   (`scoped-prisma.provider.ts:83`) wraps every operation in its own transaction — `set_config` is
   transaction-local, which is what stops a pooled connection leaking one request's scope into the
   next. Two repository calls are two units of work. W04 already refused the fix
   (`policy.repository.ts:111`: threading `$transaction` widens every repository's interface), and
   here the cost is not cosmetic — a version whose promote failed could never be promoted, because
   the label is unique and the retry is refused. The trigger makes the interface **narrower**:
   `ScopedRmReportVersionClient` does not need `rmReport.update`.

2. **The unique index was an existence oracle, and it was measured, not reasoned about.** Both
   halves of `(report_id, version_label)` come from the request body; unique enforcement ignores
   RLS and fires ahead of the composite foreign key. Inserting into another entity's report
   answered **23505** for a label they hold and **23503** for one they do not — their whole version
   history, one guess at a time, with the id echoed in the error DETAIL. `org_entity_id` in the key
   is redundant for every row that can legitimately exist and closes the probe for the rest.

3. **The immutability comment was wrong about itself, and a failing test said so.** It claimed the
   GRANT was defence in depth and the absent policy did the enforcing. An integration test written
   predicting "an UPDATE matching zero rows" got 42501: privilege is checked before any policy. The
   comment was corrected in place and the claim demoted to a prediction, which Day 3 then settled.

## Verification

⛔ **gate-only verified.** This slice has no user-facing surface, so no drive-through was
performed and nothing here should be read as a statement about usability.

**Gates** (measured, after restoring every neutralisation):

| Gate | Result |
|---|---|
| api unit | **351 / 33 suites** (from 315 / 31) |
| api int | **160 / 12 suites** (from 145 / 11) |
| web | 10 / 1 |
| lint · format · type-check · build | 0 errors · clean ×2 · clean ×2 · clean ×2 |
| coverage | 92.01 / 90.81 / 97.4 / 93.44 |
| `run_all.py` | **7 / 7** |
| `check_entity_index` | **19 / 35** (from 17 / 35) |
| `lint:negative` | PASS — 49 files scanned |

**Meta-verification — six neutralisations, six matching predictions**, written down and committed
(**`8a9cce6`**, author date 07:54:16Z) before any of them ran:

| N | Neutralised | Predicted | Measured |
|---|---|---|---|
| N1a | GRANT UPDATE granted, policy still absent | test 6 red, test 5 green, row unchanged | exactly that — 0 rows carried the rewritten value |
| N1b | plus a `FOR UPDATE` policy | tests 5 + 6 red, rows really change | both red; `quietly rewritten` and `rewritten by raw sql` both present |
| N2 | pointer composite FK | test 7 red | test 7 red |
| N3 | child composite FK | tests 8, 12, 13 red | exactly those three |
| N4 | version insert `WITH CHECK` | **nothing red** | nothing red |
| N5 | entity out of the version-label key | test 12 red | test 12 red |

**N4 finding.** Predicted to break nothing and did — the insert policy shipped with no test
proving it, because every path reaches the entity-scoped ref_code counter first and is refused
there. `AD-BorrowedRefusal-1`, fifth appearance, second time named in advance. Test 15 was added
to close it; its first version used `create()` and left N4 green a second time, because Prisma's
`RETURNING` lets the select policy refuse ahead of `WITH CHECK` and the transaction rolls the
insert away (`AD-ReturningMasksCheck-1`, a trap already on file in this repo). A raw `INSERT`
with no `RETURNING` finally turns it red.

## Impact

- **17 → 19 / 35** Wave-1 entities, mechanically derived by `check_entity_index.py`.
- **`02a:257` gains a recorded-deviation note** for `state`, in the form used at `:225` and `:219`.
- **`scope-refusal.ts` gains a conditional predicate.** 23505 is safe to surface only for keys
  whose tuple is scoped or server-issued. The docstring says so; adding a unique index now means
  asking which kind it is.
- ⚠️ **R4 exposure grows from 15 to 17 tables.** Both new tables are unaudited (ADR-0003 open),
  and one of them is an immutable controlled deliverable — "who issued which version, when" is
  precisely what an auditor asks, and the platform cannot answer it from its own trail.
- ⚠️ **No snapshot can be produced by this platform.** The payload is supplied by the caller;
  freezing the live register needs rules nobody has decided. §9 of the plan records this, and the
  Day-4 AP-3 self-check re-examined whether that makes the table a Potemkin feature (it does not —
  the storage guarantee is real, testable, and independently useful; the generator is a separate
  capability, not a missing half of this one).
- ⚠️ **Nothing enforces the 3-year retention** (`05:76`). `retired_at` exists on the version table
  and no path can write it, since retiring is an UPDATE. Enabling archival is a policy change.

## Related

- [W10 plan](../../01-planning/W10-m1-rm-report-snapshot/plan.md) §0 — the A/B/C decision
- [W10 progress](../../01-planning/W10-m1-rm-report-snapshot/progress.md) §Day 3 — the neutralisation table
- `docs/02-architecture/02a-data-model-spec.md` §3.1
