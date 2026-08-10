# ADR-0005: Local extensions live in a JSONB column, governed by a catalog table and enforced by a trigger

**Date**: 2026-08-10
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: W03

---

## Context

`decision-form.md` OQ-6 has been open since 2026-08-07. It is not a preference question:
guardrail 3 requires a *canonical core with **governed** local extensions*, and without a
mechanism the second half is unenforceable — 13 OpCos needing a local field would each add
their own column, which is the fork CLAUDE.md §Design Principles 2 exists to prevent.

It is also **the thing blocking M1**. `07:32` states the M1 DoD as "governed-extension
mechanism **working**", and `schema.prisma:9-12` records that the entity graph was deliberately
not created because "its column shape depends on ADR-0005 (governed extension storage), which is
not adopted". That note was written in W01 and never entered any tracking list — it surfaced on
2026-08-10 while filling `ROADMAP.md`.

The technical direction was already leaning: `06:18` lists "JSONB for governed extensions" among
the reasons PostgreSQL was chosen, and `06:35` names ADR-0005 as "JSONB + central field catalog;
**validation approach**". The last two words were the blank. W03 was the spike; measurements live
in `docs/02-architecture/design-notes/W03-governed-extensions.md`.

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** JSONB column + central catalog table | One column per entity, no schema change per OpCo; the catalog makes "which fields exist here" a query rather than tribal knowledge; PostgreSQL indexes JSONB natively | The column is opaque to constraints — **measured**: `WITH CHECK` does not see JSONB contents at all, and a `CHECK` constraint cannot consult the catalog (`cannot use subquery in check constraint`) | Measured: the catalog + trigger is ~40 lines of SQL |
| **B** EAV (entity-attribute-value rows) | Every value is a row, so ordinary constraints and RLS apply directly | Every read of one record becomes a join with N rows; typing lives in application code anyway; the shape fights the "one record, one row" assumption the rest of the model is built on | Not prototyped — rejected on shape before cost mattered |
| **C** Per-entity side tables | Real columns, real types, real constraints | 13 OpCos × N modules of migrations, each a schema change requiring deployment; the canonical core stops being canonical the moment two entities diverge | Highest, and it grows with the entity count |

---

## Decision

**選 A — a `jsonb` column governed by a catalog table, with validation enforced in
BOTH the write path AND a database trigger.**

The choice of JSONB was already implied by `06:18`. What W03 settled is the blank in `06:35`:
**where validation lives**. The measured answer changed the design mid-spike.

Day 0 measured that RLS cannot see into JSONB — a row whose column says SG1 and whose JSONB
claims `org_entity_id = HK1` is accepted (no read leak follows: HK1 still cannot see the row).
The conclusion drawn from that was "the write path is the only barrier". **Day 1 disproved it.**
A `CHECK` constraint cannot consult the catalog, but a **trigger can** — it is a program, not a
static expression, so it can query the catalog table and refuse. Measured: an undeclared key and
a key belonging to another entity are both rejected with `23514`.

That restores the property ADR-0004 chose RLS for: **the database refuses regardless of whether
the application remembered to check**. Extension governance gets the same two-layer shape as
entity scoping, rather than resting on one layer of application discipline.

### 否決其他選項的理由

- **B (EAV)** — rejected on shape, not cost. It turns every single-record read into an N-row join
  and still leaves typing to application code, so it pays the join cost without buying the
  guarantee. The one thing it would have bought — ordinary constraints — the trigger provides.
- **C (per-entity side tables)** — the failure mode is slow and irreversible: the canonical core
  stops being canonical the first time two entities diverge, and each divergence is a migration
  and a deployment. Directly contrary to CLAUDE.md §Design Principles 2.

---

## Consequences

### 我們接受了什麼

- **A trigger runs on every insert and update of an extensible table**, and it queries the catalog
  once per JSONB key. **Not measured under load** — today's tables hold single-digit rows.
- **The catalog is itself entity-scoped, with a deliberate NULL**: `org_entity_id IS NULL` means a
  group-wide field. Measured to work in one table — a global key, an own-entity key and a
  *foreign* entity's key produce accept / accept / **refuse** respectively.
- **The trigger function is `SECURITY INVOKER`** (the default). Measured: its catalog read is
  therefore subject to the catalog's own RLS, and it still sees what it should (global + own).
  `DEFINER` would run it as the schema owner and is an escalation surface — **it must not be used
  to "fix" a visibility problem**.
- **JSONB contents remain outside RLS.** The trigger governs *which keys may exist*; it does not
  make the column's contents scope-filtered. Anything that must be scope-filtered is a **column**,
  not an extension.

### 這個決定約束了什麼

- **Every extensible table carries the trigger in the same migration as the JSONB column** —
  the same rule ADR-0004 established for RLS, for the same reason: no window in which rows exist
  ungoverned.
- **The catalog is the only place a field is declared.** A key that is not in the catalog cannot
  be written, so "add a local field" is a catalog insert, not a schema change — which is what
  makes the extension *governed* rather than merely *permitted*.
- **Extensions are not a place to put scope-bearing data.** `org_entity_id` inside JSONB is
  meaningless to RLS; a reviewer seeing one should treat it as a modelling error.
- **The owner credential can disable the trigger** (`ALTER TABLE ... DISABLE TRIGGER`). Same
  category as ADR-0004's migration bypass: credential management, not an application code path.

### 可證偽條件 ⭐

1. **Per-write trigger cost becomes material.** One catalog query per JSONB key per write, not
   measured at volume. Measure with `EXPLAIN (ANALYZE, BUFFERS)` on a realistic write mix; if the
   catalog read dominates, the shape must change — a per-transaction catalog snapshot, or
   validation moved wholly into the write path with the trigger reduced to a sampling check.
2. **The `INVOKER` assumption breaks.** If a future extensible table needs the trigger to see
   catalog rows its caller cannot, the design would push toward `SECURITY DEFINER` — which is an
   escalation surface. If that case appears, this ADR is wrong about the catalog's RLS shape and
   must be revisited before `DEFINER` is used.
3. **Querying inside extensions becomes a primary access path.** JSONB is indexable, but this
   decision assumes extensions are *read with the record*, not filtered across records at scale.
   A roll-up that filters on an extension key across 13 entities would falsify that assumption.
4. **A second mechanism appears for the same job.** If any module gains a local field by adding a
   column instead of a catalog entry, the governance is not being enforced by construction and the
   mechanism has failed regardless of whether the trigger works.

### Rollback

- **怎麼回滾**: drop the trigger and the catalog table; the `jsonb` column can stay (it becomes an
  ungoverned blob) or be dropped with the data. Switching to option C means one migration per
  entity per field.
- **估計成本**: ~0.5 天 for the mechanism. The real cost is that every extension written under it
  becomes unvalidated data the moment the trigger is gone.
- **回滾窗口**: closes once a second module adopts extensions — at that point the catalog holds
  cross-module declarations and dropping it means re-deriving them from data.

---

## Security & compliance impact

*(本專案強制的第五個區塊 —— `06:70`。削弱任何 guardrail 的 ADR 必須說出來。)*

| Guardrail | Effect |
|---|---|
| **g3 — canonical core, governed extensions** | ✅ **This is the mechanism g3 was asking for.** A local field is a catalog row, so divergence is visible in one table instead of spread across 13 schemas. Measured: a foreign entity's key is refused. |
| **g4 — entity-scoped, DB-enforced** | ⚠️ **Unchanged, and one thing is worth stating plainly**: RLS does not see JSONB. Scope-bearing data must be a column. The catalog itself is scoped (`IS NULL` = global), so *which fields exist* is already entity-aware. |
| **g5 — tamper-evident audit trail** | ⚠️ **Not addressed here.** Extension writes are ordinary writes and will be intercepted by the same M3 mechanism as everything else (ADR-0003). Stated so it is not read as covered. |
| **g1 — the platform must not be a risk source** | ✅ Positive. Failure direction is refusal (`23514`), not silent acceptance of an undeclared field. |
| **g7 — secure SDLC** | ✅ Positive. The trigger is `INVOKER`, so no privilege is gained by writing an extension. `DEFINER` is explicitly ruled out above. |
| **g8 — privacy by design** | ⚠️ **A real risk this ADR creates**: a free-form JSONB column is where personal data arrives without anyone declaring it. The catalog is the mitigation — a field must be declared before it can be written — but the catalog does **not** currently carry a data-classification flag. That is the natural place for one when `16`'s masking requirement (#16) lands at M7/Wave 2. |

---

## 相關

- **相關 design note**: `docs/02-architecture/design-notes/W03-governed-extensions.md`
- **實作**: `W03` · `CH-018` · PR 待開
- **關閉**: `decision-form.md` OQ-6
- **解封**: **M1** —— `07:32` 的 "governed-extension mechanism working"
- **相關 ADR**: ADR-0004（同樣的兩層形狀：應用層 + 資料庫強制；本 ADR 的 trigger 與其 RLS
  在同一張表上共存）· ADR-0003（稽核軌跡，擴充寫入與一般寫入走同一個攔截點）
- **上游**: `docs/02-architecture/06-tech-stack-and-decisions.md:18,35` ·
  `docs/02-architecture/07-wave1-build-plan.md:32`
