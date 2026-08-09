# ADR-0004: Entity scoping is enforced by PostgreSQL row-level security, driven by a Prisma client extension

**Date**: 2026-08-09
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: W02

---

## Context

`decision-form.md` OQ-3 has been open since 2026-08-07 and could not be answered by argument:
guardrail 4 requires database-layer enforcement, but ADR-0001:103-105 recorded that Prisma has no
built-in mechanism for it — a client extension "must be written and proven; it is not a framework
guarantee". ADR-0001 §可證偽條件 #1 made that the load-bearing assumption of the entire backend
choice.

Two things raised the stakes since. **ADR-0010 removed physical isolation**: with China out of scope
all entities share one database, so `07:33` records RLS as "now the *only* isolation barrier".
And M1 creates the first business table — at which point an unscoped client stops being a
theoretical problem and becomes a live guardrail-4 violation.

W02 was the spike. This ADR records what it decided; the measurements live in
`docs/02-architecture/design-notes/W02-entity-scope-rls.md`.

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** PostgreSQL RLS + client extension | Isolation survives application bugs — the database refuses regardless of whether the query was written correctly; roll-up and "forgot to filter" become *structurally different* (a larger scope vs an error) | Bypass paths exist (`$queryRaw`, migrations, Prisma Studio) and must be caught mechanically; depends on transaction-local `set_config`, which is untested under a connection pooler | Measured: ~7 hr including the detector and 20 integration tests |
| **B** Application-layer filtering only | No database mechanism to maintain; works under any pooler | A missing `WHERE org_entity_id` leaves no trace. `multi-tenant-data.md:182-183` states the symptom precisely: "它跑得通、看起來對、測試也會過" — and on this platform roll-up queries look exactly like unfiltered ones | Low upfront, unbounded later |
| **C** Both, on high-risk tables | Defence in depth where it matters most (audit, evidence, incidents) | Nothing to apply it to yet — one business table exists, and a second layer that cannot be shown to catch anything is indistinguishable from a comment | Deferred |

---

## Decision

**選 A — RLS with `FORCE ROW LEVEL SECURITY`, driven by a Prisma client extension that wraps every
operation in a transaction setting `app.entity_scope`.**

Because this platform's isolation axis is the organisational entity and **roll-up is legitimate
cross-entity reading**, option B would make "roll-up" and "forgot to filter" identical in the source
— both are a query with one fewer condition. RLS moves the distinction to the connection: scope is a
property of the connection, roll-up is *setting a larger scope*, and forgetting is an **error**
rather than a larger result set. That is the property guardrail 4 is asking for, and no amount of
review discipline reproduces it.

### 否決其他選項的理由

- **B** — its failure mode is silent and leaves nothing to detect. On an ISMS platform the silent
  answer is "this OpCo has no risks", which is a false assurance rather than a blank screen
  (`multi-tenant-data.md:207-210`). B remains the documented downgrade path if a pooler ever makes
  `SET LOCAL` unusable, exactly as OQ-3 requires.
- **C** — not rejected on merit, **deferred**. With one business table a second layer cannot be shown
  to catch anything the first does not, and an unfalsifiable layer is AP-3. `multi-tenant-data.md:197`
  names audit / evidence / incident tables as its targets; those arrive at M3.

---

## Consequences

### 我們接受了什麼

- **The application must connect as a role RLS applies to.** Measured in W02: `FORCE` constrains the
  table owner but **not a superuser**. Two connection strings now exist (`.env.example:25-41`), and
  getting them wrong voids isolation completely while every test still passes.
- **Fail-closed had to be built, not inherited.** Day-0 measured that an unset `app.entity_scope`
  raises 42704 and concluded the database failed closed for free. It only does so on a connection
  that has never been scoped: `set_config` leaves the parameter defined as `''`, after which
  `current_setting` stops raising and the query returns zero rows. Migration `20260809171812`
  replaces that with an explicit function.
- **Three Prisma APIs are now restricted** (`$queryRaw`/`$executeRaw`, `.connection`,
  `new PrismaClient(`). The allowlist is three files; every future addition is a place the guarantee
  stops holding.
- **A per-operation transaction.** Every read now costs a BEGIN/COMMIT. Not measured under load.

### 這個決定約束了什麼

- Every business table carries `org_entity_id NOT NULL` **and** an RLS policy in the **same
  migration** — there is no window in which rows exist unprotected.
- Roll-up is always a subtree filter. **No RLS-exempt connection may be opened for aggregation**,
  whatever the performance argument (`multi-tenant-data.md:149`).
- The audit trail's write interception (M3 / ADR-0003) lands inside the same extension, which is what
  makes the rollback window close after M3.
- `org_entities` stays global and policy-free: it *defines* scope, so scope-filtering it would make
  the hierarchy unresolvable.

### 可證偽條件 ⭐

1. **A connection pooler in transaction-pooling mode makes tx-local `set_config` unreliable.** Not
   tested — there is no pooler today. If one is introduced and scope leaks or vanishes across
   requests, option B becomes the documented downgrade and this ADR is superseded.
2. **The extension is shown to be skippable from application code in a way CI cannot detect.** The
   three known paths are detected today (`scripts/assert-no-scope-bypass.mjs`); a fourth that
   resists mechanical detection would fire **ADR-0001 §可證偽條件 #1** and put Prisma itself back on
   the table.
3. **Per-operation transaction cost becomes material.** If a realistic roll-up workload shows the
   BEGIN/COMMIT overhead dominating, the shape must change — a per-request scoped connection instead
   of a per-operation transaction.
4. **`app_entity_scope()` proves too expensive per row.** It is `STABLE` so the planner should
   evaluate it once per statement; that has not been measured with `EXPLAIN` at volume.

### ADR-0001 §可證偽條件 #1 是否觸發？ **否。**

Its wording: *any write path that bypasses the extension **and** cannot be caught mechanically in CI*.
W02 found three bypass paths and all are accounted for. `$queryRaw`/`$executeRaw`, `.connection`
and `new PrismaClient(` are caught by the detector on every push. Migrations and Prisma Studio do
bypass it — but both require the **owner** credential, which the application does not hold; that is
credential management, not an undetectable code path. **ADR-0001 stands.**

### Rollback

- **怎麼回滾**: revert `apps/api/src/entity-scope/`, the `prisma.service.ts` connection/probe split,
  and both migrations (`DROP POLICY` + `DROP FUNCTION`; the tables stay). Switch to option B by
  adding scope predicates in the repository layer.
- **估計成本**: ~0.5 天 for the code; the honest cost is losing the property that made A worth
  choosing.
- **回滾窗口**: rises sharply after **M3** — the audit hash-chain interception point lands inside the
  same extension.

---

## Security & compliance impact

*(本專案強制的第五個區塊 —— `06:70`。削弱任何 guardrail 的 ADR 必須說出來。)*

| Guardrail | Effect |
|---|---|
| **g4 — entity-scoped, DB-enforced** | ✅ **Satisfied and measured.** The four scope tests of 約束 8 pass through the application (`entity-scope.int.spec.ts`) and independently against the database with no application code present (`rls-direct.int.spec.ts`). Neutering the policy to `USING (true)` turned 14 of 20 red. |
| **g5 — tamper-evident audit trail** | ⚠️ **Not addressed here.** Roll-up reads must be audited (`multi-tenant-data.md:146`) and are not yet. The extension is the intended interception point; M3 / ADR-0003 carries it. Stated so it is not read as covered. |
| **g3 — canonical core, soft delete** | ✅ Strengthened structurally: `DELETE` is never granted, so soft delete is a privilege rather than a convention someone must remember. |
| **g1 — the platform must not be a risk source** | ✅ Positive. The failure direction is refusal, not silent disclosure — a scope that fails to arrive produces an error, never a plausible empty result. |
| **g7 — secure SDLC** | ✅ Positive. No credential in version control: `isms_app` is a NOLOGIN group role carrying only privileges, and the login account is created by the environment. |
| **g8 — privacy by design** | Neutral. Scope filtering is orthogonal to data minimisation. |

---

## 相關

- **相關 design note**: `docs/02-architecture/design-notes/W02-entity-scope-rls.md`
- **實作**: `W02` · `CH-014` · PR pending
- **驗證**: **ADR-0001 §可證偽條件 #1 — 未觸發**（見上）
- **關閉**: `decision-form.md` OQ-3
- **相關 ADR**: ADR-0001（本 ADR 驗證其承重假設）· ADR-0010（拿掉物理隔離，使 RLS 成為唯一屏障）·
  ADR-0003（稽核軌跡，共用同一個攔截點）· ADR-0005（governed extensions，尚未拍板）
- **上游**: `docs/rules-on-demand/multi-tenant-data.md` · `docs/02-architecture/07-wave1-build-plan.md:33`
