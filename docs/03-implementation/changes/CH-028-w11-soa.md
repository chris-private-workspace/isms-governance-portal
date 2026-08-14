# CH-028 — Statement of Applicability, and the layer that was doing the work

**Type**: Change (phase-produced record — W11, M1 slice 8)
**Status**: Closed（PR pending）
**Created**: 2026-08-14
**Phase**: [W11](../../01-planning/W11-m1-statement-of-applicability/plan.md)

---

## Problem

`02a:32` lists `StatementOfApplicability` as Wave 1 and annotates it **"Mandatory ISO 27001
output"** — one of the few entities on the §0 index marked mandatory at all. Nineteen tables in,
it did not exist.

The platform could already list controls (`controls`, W06). What it could not record was the
decision **about** each control: is this clause applicable, why or why not, how far implemented,
who approved that. An auditor's first question about an ISMS is "which controls did you select,
which did you exclude, and on what grounds" — the platform answered the first half and had
nowhere to put the second.

## Root cause

Not a defect: an unbuilt slice. What made it non-trivial is that the spec line cannot be built
literally.

`02a:215` opens with `framework_id`, and **`Framework` is on no section of the §0 index** — whose
first sentence is that nothing off that list is buildable. Day 0 measured something stronger than
expected: the word `Framework` appears **nowhere in the whole document**. The spec has never said
what one would contain, so building the foreign key would mean inventing the entity first.

The same line names `implementation_status` and gives no values, and describes the SoA as
"derived from which controls were selected during risk treatment" while listing no `control_id`
— half an edge, the shape already on file as `AD-IssueBareEnum-1`.

## Solution

One table, one migration, one repository, two endpoints — plus three recorded deviations written
back to the spec line they deviate from.

| File | Type | Note |
|------|------|------|
| `prisma/schema.prisma` | edit | `model StatementOfApplicability` + `enum SoaImplementationStatus` + 2 back-relations |
| `migrations/20260814023210_soa/migration.sql` | new | **hand-written** — `migrate dev` refuses on a pre-existing checksum drift, and `migrate diff` outputs an empty file silently under Prisma 7 |
| `core-model/soa.repository.ts` · `.spec.ts` | new | list / create, the `issue.repository.ts` single-table shape; 9 unit tests |
| `core-model/scoped-client.types.ts` | edit | `ScopedSoaClient` |
| `modules/soa/` (4 files) | new | `GET /soa` · `POST /soa`; 16 controller tests, 12 integration tests |
| `bootstrap/app.module.ts` | edit | +1 module |
| `02a:215` | edit | three recorded deviations, **inline** |

**Four decisions worth re-reading before changing any of this:**

1. **`framework` is a string and the column is not called `framework_id`.** The identical ruling
   W06 made for `Control.framework_refs` (`schema.prisma:942-946`), whose docstring already named
   the exit: when `Framework` arrives, these columns become the migration's **input**, not a
   second source of truth kept beside it. Dropping the `_id` suffix is the point — a name should
   not claim an edge that does not exist.

2. **`org_entity_id` is in the unique key from the first version, and Day 3 measured that it had
   to be.** Both other halves of `(framework, clause_ref)` come from the request body, which is
   the `AD-UniqueKeyOracle-1` criterion exactly. Removing the entity from the key, a probe for a
   clause HK1 holds answers **23505** and one nobody holds **succeeds** — SG1 enumerates Hong
   Kong's statement of applicability one clause at a time while unable to read a single row of it.
   ⭐ Louder than W10's leak: with no parent foreign key to fall through to, the two outcomes are
   "error" and "success" rather than two different errors.

3. **The migration's own comment about `WITH CHECK` was wrong, and the neutralisation is what
   caught it.** See Verification.

4. **The `02a` deviation is inline, not a blockquote.** The two blockquote deviations (`:219`,
   `:260`) shift every line below them, and this repo is full of `02a:NNN` references that no gate
   would notice going stale (`AD-MdAnchorLineShift-1`). Measured: 514 lines before and after, one
   line changed.

## Verification

⛔ **gate-only verified.** No user-facing surface, so no drive-through was performed and nothing
here should be read as a statement about usability.

**Gates** (measured after restoring every neutralisation; each taking its own exit code, never a
`$?` inherited from a pipeline):

| Gate | Result |
|---|---|
| api unit | **376 / 35 suites** (from 351 / 33) |
| api int | **172 / 13 suites** (from 160 / 12) |
| web | 10 / 1 |
| format · lint · type-check · build · `lint:negative` | 0 · 0 · 0 · clean ×2 · PASS |
| coverage | 91.83 / **91.01** / 97.5 / 93.29 |
| `run_all.py` | **8 / 8** |
| `check_entity_index` | **20 / 35** (from 19 / 35) |

⚠️ **Coverage statements and lines are 0.18 and 0.15 BELOW baseline**, and that is reported rather
than rounded away. Cause identified mechanically: `soa.module.ts` is 0%, as **all ten existing
`*.module.ts` files are** — DI wiring is exercised only by the integration suite, which runs under
a different jest config. Every module folder added since W03 has diluted these two numbers the
same way. Branches and functions rose.

**Meta-verification — four planned neutralisations, 4/4 on direction**, written down and committed
(`0e4b1c6`, author date 03:10Z) before any of them ran:

| N | Neutralised | Predicted | Measured |
|---|---|---|---|
| N1 | SELECT policy → `USING (true)` | tests 5, 9 red | exactly those two |
| N2 | INSERT `WITH CHECK` → `(true)` | test 7 red, test 6 green | test 7 red — the raw INSERT reported `1`, the row really landed |
| N3 | entity out of the unique key | test 10 red | test 10 red: `DuplicateKeyError` vs success |
| N4 | UPDATE `WITH CHECK` dropped | **nothing red** | nothing red |

⭐ **N2 is the first time an INSERT policy in this codebase has turned anything red.** The previous
five phases all measured zero, because every path reaches the entity-scoped ref_code counter first
and is refused there. Test 7 was written from that lesson in advance — bypassing the counter and
emitting no RETURNING — and this time the guard proved itself.

🚩 **N4's finding is the phase's most useful output, and it arrived through two wrong
predictions.** N4 broke nothing, so test 12 was added (raw cross-entity UPDATE, no RETURNING, per
`AD-ReturningMasksCheck-1`) — and **re-running N4 left it green too**. The hypothesis that
PostgreSQL backfills an omitted `WITH CHECK` from `USING`, making N4 a no-op, produced two further
predictions and **both were wrong**: an explicit `WITH CHECK (true)` is still refused, and so is a
fully permissive update policy. Permitting one policy at a time found it:

```
_update WITH CHECK -> true                    still refused
_update USING -> true, WITH CHECK dropped     still refused
+ _insert WITH CHECK -> true                  still refused
+ _read USING -> true                         UPDATE 1   (the row left)
```

**The SELECT policy is what refuses a cross-entity move** — PostgreSQL checks the NEW row of an
UPDATE against it, which is what the error message says (`new row violates row-level security
policy`). The table has no triggers (`pg_trigger`: 0 rows), so nothing else participates. The
`_update` `WITH CHECK` is therefore redundant **today**, and no test can distinguish it —
`AD-BorrowedRefusal-1` in its sixth form. It is kept because it stops being redundant the moment
the read half widens past the write half, and **`controls` is already in that state**.

**New tests**: `soa.repository.spec.ts` (9) · `soa.controller.spec.ts` (16) · `soa.int.spec.ts`
(12, including the four scope tests 約束 8 requires and the oracle regression).

**Verdict**: ⚪ N/A — pure backend, **gate-only verified**.

## Impact

- **Breaking change**: no. **Migration**: `20260814023210_soa`, additive; reversible by dropping
  one table and one type.
- **19 → 20 / 35** Wave-1 entities, mechanically derived by `check_entity_index.py`.
- **`02a:215` gains three recorded deviations** in the inline form used at `:225` / `:227`.
- ⚠️ **R4 exposure grows from 17 to 18 tables.** The SoA is the ISO 27001 artifact an auditor
  reads first, and `approved_by` is caller-supplied free text with `created_by` still NULL — the
  platform stores who the entity *says* approved it and can prove nothing about it.
- ⚠️ **No `control_id`.** The link between a clause and the controls satisfying it is
  `clause_ref` matching a string inside `Control.framework_refs` — a correspondence a human can
  see and a query cannot follow.
- ⚠️ **The SoA cannot be generated from risk treatment.** `02a:215` says it is derived; the
  derivation rules are undecided. Same shape as W10's "snapshot table that cannot take a
  snapshot" — the storage guarantee stands on its own and is independently testable.
- ⛔ **A pre-existing checksum drift blocks `prisma migrate dev` for everyone.** W10 corrected an
  applied migration's comment in place. Not caused here, not fixed here → BACKLOG.

## Related

- [W11 plan](../../01-planning/W11-m1-statement-of-applicability/plan.md) §0 — D1–D4
- [W11 progress](../../01-planning/W11-m1-statement-of-applicability/progress.md) §Day 3 — the
  neutralisation tables and the policy isolation
- **關掉的待辦**: `AD-UniqueKeyOracle-1` gains its second data point (stays open — a detector is
  still unwritten)
- **同類前例**: `CH-026` (W10) — the same oracle, the same `AD-BorrowedRefusal-1`, one layer over
