# ADR-0014: scope is a per-row property on tables that need it, and write-side scope needs per-command policies rather than one asymmetric `FOR ALL`

**Date**: 2026-08-11
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: W06

---

## Context

Every table in this repository is scoped at the **table** level: either
`org_entity_id NOT NULL` plus an RLS policy (`policies`, `risks`, `assets`, `asset_groups`),
or global with no policy at all (`org_entities`, `users`, `threats`, `vulnerabilities`).
`Control` is the first entity that is neither. `02a:217` gives it `applies_to_scope`
— *this entity only / subtree / group-shared* — which makes scope **a property of the row**,
and `02a:413` then relies on that distinction: a group-shared control may link to any entity's
risks, an entity-local one may not.

This is not a question that can be deferred cheaply. `00:59` lists the
**group-shared/inherited control library** as one of Wave 1's answers to the "inconsistent
practices" pain point, and `02:26` describes `Control` as "may be group-shared or entity-local"
in the core data model itself. More importantly, the shape chosen here is copied: every later
table with rows that some entities share and others own — framework catalogues, group policies,
regional obligations — inherits whatever `Control` does.

W03 already built one asymmetric policy, on `extension_fields`
(`20260810134319_*/migration.sql:80-83`): `USING` wider than `WITH CHECK`, so a group-wide row
is readable by everyone and writable by no one. **That precedent is what made this look like a
solved problem, and measuring it is what showed it is not.** `extension_fields` is a *catalog*;
鐵律 1 (`CLAUDE.md` 約束 8 — every business table carries `entity_id NOT NULL`) never applied
to it. `Control` is a business table. The question is therefore not "what shape do we invent"
but **"does the exemption a catalog holds transfer to a business table, and does the shape
actually hold when written down"**.

---

## Options

All four were measured on PostgreSQL 18 in throwaway databases, as `isms_app_user`
(non-owner, non-superuser), 16 cases each isolated in its own transaction.
Evidence: `docs/01-planning/W06-m1-control-and-asset-endpoints/artifacts/d1-rls-probe.out`.

Caller is HK1 throughout; the group-shared row is owned by SG1.

| Case | **A** one `FOR ALL` | **B** nullable, NULL = group | **A′** per-command |
|---|---|---|---|
| read another entity's group row | ✅ visible | ✅ visible | ✅ visible |
| update it (title only) | ⛔ 42501 | ⛔ 42501 | ⛔ 0 rows |
| **delete it** | ⚠️ **DELETE 1** | ⚠️ **DELETE 1** | ⛔ 0 rows |
| mint a brand-new group row | ⚠️ **INSERT 1** | ⛔ 42501 | ⛔ 42501 |
| promote own row to group | ⚠️ **UPDATE 1** | ⛔ 42501 | ⛔ 42501 |
| **steal** (reassign owner, demote) | ⚠️ **UPDATE 1** | ⚠️ **UPDATE 1** | ⛔ 0 rows |
| own-row write (negative control) | — | — | ✅ passes |

**C** — build `Control` as an ordinary entity-scoped table and defer `applies_to_scope`
entirely — has nothing to measure; it is the absence of the feature.

Three findings decided this, and none of them was in the phase plan:

1. ⭐ **`DELETE` has no `WITH CHECK`.** It consults `USING` alone — the half that was
   deliberately widened. An asymmetric `FOR ALL` policy therefore has **no write-side
   protection on delete at all**, in both A and B. What prevents this today is the `GRANT`,
   not the policy: no table in this repository grants `DELETE` to `isms_app`. A future
   `GRANT DELETE` would open it with no change to any policy and no test turning red.
2. ⭐ **Neither A nor B prevents theft.** Reassigning a group row to yourself passes `USING`
   (it is still group-shared) *and* `WITH CHECK` (the new owner is you). One OpCo can remove a
   group-wide control from the other twelve, silently. This hole **exists in `extension_fields`
   today** — recorded as `AD-GroupRowTheft-1`, not fixed here.
3. ⭐ **The group marker's forgeability is the real difference between A and B.** A's marker is
   a domain column the writer controls, and `WITH CHECK (org_entity_id = ANY(...))` never looks
   at it — so any entity may publish to the whole group. B's marker is NULL, and
   `NULL = ANY(...)` evaluates to NULL, which `WITH CHECK` treats as failure. B's protection is
   a side effect of three-valued logic rather than a designed control, but it is real.

---

## Decision

**A′: `org_entity_id NOT NULL`, `applies_to_scope` as a domain column, and RLS split into
per-command policies — `SELECT` wide, `INSERT` and `UPDATE` narrow and refusing the `group`
value, and no `FOR DELETE` policy at all.**

**`subtree` is not built.** The enum carries `entity` and `group` only.

```sql
CREATE POLICY "controls_read" ON "controls" FOR SELECT
  USING ("applies_to_scope" = 'group' OR "org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "controls_insert" ON "controls" FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()) AND "applies_to_scope" <> 'group');

CREATE POLICY "controls_update" ON "controls" FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()) AND "applies_to_scope" <> 'group')
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()) AND "applies_to_scope" <> 'group');

-- No FOR DELETE policy, and no DELETE grant. Measured: an absent per-command
-- policy denies every row, even the caller's own.
```

A single `FOR ALL` policy **cannot** express "readable by all, writable only by the owner",
because `UPDATE` and `DELETE` select their rows through the same `USING` that was widened for
reading. Splitting by command is not a stylistic preference; it is the only construct in which
the read scope and the write scope can differ.

⭐ **The `FOR DELETE` policy is omitted rather than written narrowly, and that is stricter, not
laxer.** Measured with `DELETE` explicitly granted: with no `FOR DELETE` policy, deleting even
your own row returns **0 rows**, while `SELECT` and `UPDATE` are unaffected
(`artifacts/d1-rls-probe2-default-deny.out`, N1–N5). Absence is deny-all; a narrow policy is
allow-within-a-range. Omission also removes this table's dependence on the `GRANT` posture
being maintained — which is exactly the fragility finding 1 identified — and it agrees with
guardrail 3 and with `extension_fields:64-65`: retirement is a column, not a removal.

`subtree` is refused because nothing can honour it. `entity-scope.resolver.ts:120-142` expands
a scope **downward only** — assignment roots plus descendants, by `path` prefix — so a reader's
scope never contains its ancestors, and a control owned by a parent entity is simply invisible
to a child. Making `subtree` work requires an ancestor lookup **inside the policy**, which is
precisely what `02a:146`'s materialised `path` column exists to avoid (`resolver.ts:9-13`).
Shipping the enum value without the branch would be a setting a user can change that changes
nothing and reports no error — the definition of AP-3.

### 否決其他選項的理由

- **A (one `FOR ALL`)** — four measured holes, two of which (mint, promote) let any single OpCo
  make a statement on behalf of all thirteen. Choosing it would mean the group boundary is
  enforced by convention while the schema claims to enforce it.
- **B (nullable, NULL = group)** — breaks 鐵律 1 on a business table, and the exemption
  `extension_fields` holds does not transfer: a catalog has no owner to record, a control does.
  A NULL-owned control cannot answer "who is accountable for this" — the question M3's audit
  trail exists to answer. It also collapses scope to two states permanently, and it still loses
  to theft and delete. ⚠️ **It is not free of merit**: it blocks mint and promote for free, and
  it is the only shape with production mileage. It loses on ownership and 鐵律 1, not on RLS.
- **C (defer)** — leaves `02a:413` with nothing to stand on and removes one of the four Wave 1
  answers `00:59` promises. And the deferral is not cheap later: W04 established that changing
  an RLS anchor changes the semantics of every table sharing it.
- **⚠️ A correction of my own earlier reasoning**: the phase plan recorded that `02:26` listing
  `org_entity_id` among `Control`'s fields conflicts with option B. It does not — listing a
  field is not requiring `NOT NULL`, and that same line says "may be group-shared or
  entity-local". B's conflict is with 鐵律 1 alone.

---

## Consequences

### 我們接受了什麼

- ⛔ **No entity can create a group-shared control through the application.** Group rows are
  seeded by migration, or by an admin path that does not exist yet — the same posture
  `extension_fields:77-79` already states. `00:59` promises a group-shared library; **this
  decision delivers the reading and sharing of it, not the authoring of it.** That gap must be
  stated wherever the feature is described, not discovered by a user.
- ⚠️ **Cross-entity writes fail as `0 rows`, not as an error.** This aligns with 約束 8's
  404-not-403 rule, but it means repositories cannot distinguish "not found" from "not yours"
  and **must not try**. Note the measured contrast: under A the same write raised `42501` —
  which is *not* an oracle, because `WITH CHECK` only ever evaluates on rows that already
  passed `USING` and are therefore already readable.
- ⚠️ **Three policies per table instead of one** is more to read, and each must be checked
  separately. The mitigation is the meta-verification each phase already runs: neutralise each
  policy, watch specific tests turn red.
- ⚠️ **No row of `controls` can ever be deleted through the application**, including one created
  by mistake. Correction is retirement (a column) or a migration.
- **`subtree` exists in `02a:217` and not in the schema.** This is a recorded deviation, noted
  at that line, not an oversight.

### 這個決定約束了什麼

- **Every later table with both shared and owned rows follows this shape.** Framework
  catalogues, group-level policies, regional obligations. A table that widens `USING` under a
  single `FOR ALL` is a divergence from this ADR, not a local choice.
- **`app_entity_scope()` stays unchanged.** This decision deliberately adds no hierarchy lookup
  to the policy layer; the function remains the common base every policy shares.
- **A widened read scope obliges a narrowed write scope in the same migration.** The two halves
  were split here because they were written together; they must never be added apart.
- **No `GRANT DELETE` to `isms_app` on any table without revisiting this ADR.** The privilege
  and the missing policy are one control, expressed twice.

### 可證偽條件 ⭐

- **若某個 OpCo 需要在 runtime 建立或維護 group-shared control** — then the admin path this
  decision defers becomes required, and it needs a scope-elevation mechanism that does not exist
  (a group-level principal). **This is the most likely to fire**, and it fires no earlier than
  M4, because until Entra ID lands there is no principal to elevate.
- **若 `subtree` 出現真實需求** — the ancestor lookup this ADR refuses becomes necessary, and
  `02a:146`'s per-row cost argument must be re-measured rather than re-quoted. The enum gains a
  value (compatible in PostgreSQL); the policy gains a branch (not compatible with this ADR).
- **若「刪不掉自己建錯的列」在實務上不可接受** — the omitted `FOR DELETE` policy would have to
  return, narrow, together with a `GRANT DELETE`. That reopens finding 1 and needs a test that
  fails when the grant is added without the policy.
- **若 `AD-GroupRowTheft-1` 修好 `extension_fields` 時採用了不同形狀** — then two shapes for one
  problem exist in the repository and one of them is wrong. This ADR is the one that was
  measured; the divergence should be resolved toward it or this ADR should be superseded.

### Rollback

- **怎麼回滾**: `DROP POLICY` ×3 and create a single `FOR ALL` policy; drop `applies_to_scope`
  (or leave it unread). `schema.prisma` loses one enum.
- **估計成本**: ~0.5 天 while `controls` is the only table with the shape. It rises with each
  table that copies it.
- **回滾窗口**: practically, before the second table adopts the shape.

---

## 相關

- **依據**: `CLAUDE.md` 約束 8 鐵律 1（業務表必有 `entity_id NOT NULL` —— 否決 B）·
  guardrail 3（退役是欄位不是刪除 —— 支持省略 `FOR DELETE`）· guardrail 4（RLS 優先於應用層）·
  `02a:217`（三個值）· `02a:413`（group-shared control 的連結規則）· `02:26` · `00:59`
- **量測**: `W06` progress.md §1.b / §1.e —— 16 + 5 個案例，兩個 throwaway database，
  跑完即 `DROP`；原始輸出在 `W06-*/artifacts/d1-rls-probe*.out`
- **同型先例**: `ADR-0005` / `extension_fields`（W03）—— 第一個不對稱 policy。
  **本 ADR 不推翻它**，但量出它的兩個洞（`AD-GroupRowTheft-1`）並在新表上不重蹈
- **實作**: `W06` / `CH-021` · `apps/api/prisma/migrations/<ts>_control_library/migration.sql`
