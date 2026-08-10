# ADR-0012: `users` is a global table; entity scope lives on the role assignment, not on the person

**Date**: 2026-08-10
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: W04

---

## Context

`02a` §1.1 gives every domain entity three foreign keys to `User` (`owner_user_id`,
`created_by`, `updated_by`), and §3 adds seven more domain-specific ones
(`risk_owner_user_id`, `asset_owner_user_id`, `custodian_user_id`, `assessor_user_id`,
`reviewer_user_id`, `tester_user_id`, `assignee_user_id`). **None of them has a target**:
`User` is specified nowhere — not in `02a` §0's self-described "complete index", not in §3,
not in `05`. Verified W04 Day-0: three mentions across all of `docs/02-architecture/`,
每一個都是引用而非定義。

M1 is about to create 32 tables carrying those FKs. Deciding `users`' shape late means
retrofitting all of them, so the decision comes first — but it cannot be made by pattern-matching,
because **the existing rule does not cover this table**.

`rules-on-demand/multi-tenant-data.md:28` scopes 鐵律 1 to tables holding
**業務資料（非全域參考資料）** — business data that is not global reference data. Its
legal-global list (`:57-66`) names five classes, all of them reference data: `org_entities`,
frameworks, threat/vulnerability libraries, jurisdictions/regulations, risk scales.

`users` is neither. It is **identity data**: not a business record produced by an entity's
operations, and not a shared reference library either. The binary is incomplete, and that —
not "users deserves an exception" — is what this ADR is actually settling.

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** `users` global, no `org_entity_id`; scope carried by the M4 role assignment | Matches `03:31` verbatim — "scope is derived from role assignment". A regional ISO spanning 13 OpCos is expressible with no extra machinery. `users` is not in `03:23`'s list of domain records | Departs from 鐵律 1's letter → needs written justification in the ADR **and the PR description** (`multi-tenant-data.md:67`, `:374`). **A global table of people is cross-entity visible by construction** — see Consequences | Low now; the visibility question moves to M4 |
| **B** `users` entity-scoped, `org_entity_id NOT NULL` | Literal compliance with 鐵律 1; RLS covers it for free with the existing mechanism | **Cannot express a cross-entity user** — and regional roll-up across 13 OpCos is the flagship (M8). Would force one row per (person × entity), making "who is this person" unanswerable | Low now, **very high at M8** |
| **C** `users` global + a `user_entity_scope` join table now | Scope explicit and auditable from day one | Zero consumers until M4 supplies a real credential source. Building it today is exactly the "DI token with no consumer" that W03 declined under `AD-ScopedClientDI-1` | Medium, mostly wasted |

---

## Decision

**選 A.**

Because `03:31` already states — as settled design, not as an option — that a user's scope
**is derived from role assignment**, putting `org_entity_id` on `users` would encode the same
fact in a second, contradictory place. And because the platform's flagship deliverable is a
regional roll-up across 13 OpCos (`07` M8): the regional ISO is not a person who belongs to one
entity, so B makes the primary use case unrepresentable.

**This is not an exception to 鐵律 1 — it is a class the rule never covered.** 鐵律 1 governs
業務資料; `users` is identity data. The remedy is therefore to extend the rule's taxonomy,
not to record a carve-out (see Consequences).

### 否決其他選項的理由

- **B (entity-scoped)** — Not "worse", but **incapable**: a regional ISO or a group-level auditor
  has no single owning entity. Modelling one person as N rows breaks every FK that means
  "who did this" and would surface at M8, the phase with the least slack.
- **C (join table now)** — Right shape, wrong phase. It has no consumer until M4 introduces a
  credential source; `AD-ScopedClientDI-1` measured this exact failure mode in W03 and the DI
  token was, correctly, not built. C becomes the expected M4 design, and this ADR does not
  foreclose it.

---

## Consequences

### 我們接受了什麼

- ⚠️ **A global table of people is cross-entity readable by construction.** Anyone who can query
  `users` sees that a person exists at every OpCo. `03` classifies a risk owner's name and job
  title as personal information (tier 2), so this table holds personal data with **no
  database-layer entity filter**. Today the exposure is nil — there is no user-listing endpoint
  and no UI — but **M4 must decide who may enumerate users, and that decision is now
  application-layer, not RLS**. Recorded so it is not discovered later as a surprise.
- 鐵律 1's letter no longer describes every table. The taxonomy must be updated in the same
  change, or the next reader audits `users` as a violation (W04 Day-0 D1).
- `users` gets **no** `home_org_entity_id` either. An employer field is real but has no consumer
  today, and sitting next to a deliberately absent `org_entity_id` it would be read as the scope
  anchor — the one misreading this ADR exists to prevent. AP-5; defer to M4.

### 這個決定約束了什麼

- Every `*_user_id` FK across the 32 remaining M1 tables points at a **global** table. A later
  move to B is not a migration, it is a redesign.
- M4's role assignment carries `(user, role, entity_scope)` — option C's shape. This ADR makes
  that the expected direction rather than an open question.
- **A query joining `users` must never widen an entity-scoped result set.** The scoped table's
  RLS still filters the rows; joining a global table to them adds columns, never rows. Any
  future query that starts from `users` and reaches business data is a scope-bypass shape and
  belongs in the detector's sights.

### 可證偽條件 ⭐

- **若出現「一個實體的管理員不得知道其他實體有哪些使用者存在」的需求** — that is a per-entity
  visibility requirement on the user list itself, which a global table with no RLS cannot serve.
  This is the most likely one to fire, and it fires at **M4**, not later.
- **若 M4 量到 role assignment 無法表達某個真實的 scope 形狀** — the premise taken from `03:31`
  would be wrong, and scope would have to live somewhere else.
- **若某個管轄區要求員工個資按法律實體隔離儲存** — 11 in-scope jurisdictions, none currently
  requires it (ADR-0010 settled the localisation question), but this is the legal-side trigger.
- **若 `users` 的列數成長到單表查詢成本顯著** — not expected (hundreds, not millions), listed
  because a global table has no natural partition key.

### Rollback

- **怎麼回滾**: add `org_entity_id` to `users`, backfill from role assignments, add the RLS
  policy, then split any cross-entity person into N rows and repoint the FKs that named them.
- **估計成本**: ~3-5 天 **if done before M4 issues real credentials**; open-ended after, because
  splitting a person into N rows rewrites "who did this" in the audit trail (M3).
- **回滾窗口**: closes at **M4**. After real users exist, the identity rows are referenced by
  audit history that must not be rewritten.

---

## 相關

- **依據**: `03:31`（scope is derived from role assignment）· `03:23`（"every **domain record**"
  的列舉不含 `User`）· `05` §Identity（role-based, each assignment carrying an entity scope）
- **例外登記**: `rules-on-demand/multi-tenant-data.md` §鐵律 1 —— 本 ADR 要求在同一個 change 內
  擴充其分類（identity 資料為第三類），**不是**在五類清單上加第六列
- **同型先例**: `AD-ScopedClientDI-1`（W03 拒建零消費者的 DI token）—— 本 ADR 用同一判準否決 C
- **實作**: `W04` / `CH-019`
