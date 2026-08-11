# ADR-0013: the risk score is computed by the database; the acceptance threshold is a group constant with no configuration table yet

**Date**: 2026-08-11
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: W05

---

## Context

已確認參數 #7 fixes the arithmetic — `LKH(1–5) × MAX(FIN,BOP,LRY,REP,SIS)` → 1–25, treatment
required at ≥16 — and adds that per-entity calibration is permitted **only through
configuration**. `02a:139` adds that all five impacts are stored and "the maximum is derived,
not entered"; `02a:196` marks `acceptance_status` and `in_it_risk_register` derived too.

**What none of them says is whether a derived value LANDS.** That gap is invisible while
there are no scored tables, and W05 creates the first one. It stops being answerable cheaply
almost immediately: `Assessment`, `ControlTest` and the M8 `posture_snapshot` all carry
derived numbers, and a platform whose scores live in two different places depending on which
phase built the table is a platform whose roll-up cannot be trusted.

The second question rides on the first. If the threshold 16 is data, `acceptance_status`
cannot be computed at write time; if it is a constant, it can. So "where does the score live"
and "where does the threshold live" are one decision, not two.

**這不是效能問題，是可信度問題。** 平台的旗艦交付物是跨實體滾升（`07` M8）。A number that a
caller could have written, or that could silently disagree with the inputs beside it, is not
evidence — and guardrail 1 says this platform must pass the controls it enforces.

---

## Options

### 分數落在哪裡

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** PostgreSQL generated column（`GENERATED ALWAYS AS ... STORED`）| **呼叫者物理上寫不了** —— measured: a write to the column is a hard error, not a silently ignored field. Derived and source are set in ONE write, so they cannot drift. Indexable and sortable, which M8's roll-up needs | Formula welded into migration SQL; changing it needs a migration. Prisma cannot express it — see Consequences | Low now; a formula change is a table rewrite |
| **B** 應用層算，不存 | One implementation, in TypeScript; changing the formula needs no migration | ⚠️ M8 must sort and filter by score. Not storing it means pulling every row into the application to rank them — the flagship query becomes the worst query | Low now, **high at M8** |
| **C** 存 + trigger 維護 | Queryable and still a single application-side implementation | Two implementations of one rule (TS + PL/pgSQL) with **nothing forcing them to agree** — AP-6. W03's two-layer split is the opposite case: there the second layer is *proven* to hold alone | Medium, and permanent |
| **D** generated column calling an `IMMUTABLE` SQL function ⭐ | Formula in **one** place instead of eight; `RETURNS NULL ON NULL INPUT` makes a partial input yield NULL rather than a confident wrong number | ⛔ **Measured fatal** —— see below | Low now, **unbounded later** |

⭐ **D was not in the phase plan; it was found while measuring A and it is the better-looking
option right up to the point it is measured.** `CREATE OR REPLACE FUNCTION` **succeeds** while
generated columns depend on that function, and PostgreSQL neither rewrites the stored values
nor raises anything. W05 Day-1 probe T3/T4: after replacing the body, the identical input
`(4,2,5,1,3,1)` reads **20** in the row written before and **16** in the row written after.
The table then holds two generations of the formula with nothing marking which is which —
exactly the divergence A exists to make impossible, reintroduced through a statement that
looks like routine maintenance. The inline form has no equivalent: `ALTER COLUMN ... SET
EXPRESSION` rewrites the table and recomputes every row.

### 閾值 16 落在哪裡

| Option | 優點 | 缺點 |
|--------|------|------|
| **A** 常數寫在 code | Simplest; `02a:120`'s 16 is the group standard | Contradicts 參數 #7 outright — governed calibration has nowhere to go, and nothing records that |
| **B** 今天就建 `risk_scales` | The per-entity calibration 參數 #7 promises has a home from day one | ⚠️ **Zero consumers** — no UI, no endpoint, nobody to change a setting. And ⛔ **`risk_scales` has never been specified by any design document**: it appears in exactly one line of the whole repository (`rules-on-demand/multi-tenant-data.md:65`) and `02a` has never mentioned it. Building it means **inventing its columns**, which 已確認參數 #9 forbids |
| **C** 常數 + 明文記錄解封條件 | Honest about both halves: there is no calibration requirement today, and the mechanism 參數 #7 requires is named rather than forgotten | Needs a carrier that will actually be read again |

---

## Decision

**分數選 A（generated column）· 閾值選 C（常數 + 本 ADR 承載解封條件）。**

A because the property that matters is not that the score is *correct* — a test can show that —
but that it **cannot be anything else**. A caller with a valid token, a repository with a bug,
and a migration that backfills badly are three different ways for a stored score to stop
matching its inputs, and a generated column closes all three at once rather than one at a time.

C because 已確認參數 #7 constrains the **mechanism, not the schedule**: calibration must go
through configuration *when it exists*. Building the configuration table before anything can
read or write it is AP-5, and here it is worse than the usual AP-5 — the table has no
specification, so building it today means authoring its columns and thereby making a design
decision that belongs to whoever writes the calibration requirement.

⚠️ **The threshold therefore lands inside the generated expression**, which makes it *more*
expensive to change than the TypeScript constant option A would have been. That is accepted
deliberately: a compliance threshold that is cheap to change quietly is not a feature.

### 否決其他選項的理由

- **分數 B（不存）** — Not wrong today, wrong at M8. The roll-up dashboard ranks and filters
  entities by score; B turns the flagship query into a full-table fetch. Rejected on the
  phase that has the least room to absorb it.
- **分數 C（trigger）** — Two implementations with no forcing function. W03 accepted two layers
  for governed extensions, but only because the second is proven to hold **with the first
  neutralised** (ADR-0004 rejected its option C on the same ground). A trigger mirroring a TS
  function has no such proof available: neutralise either and the other still "works".
- **分數 D（IMMUTABLE function）** — measured above. It buys a real simplification and pays for
  it with a silent, unbounded correctness hazard. **The formula appearing in eight places is a
  legibility cost; two generations of the formula in one column is a compliance incident.**
- **閾值 A（常數，不記錄）** — indistinguishable from C in code and strictly worse in six months,
  because nothing would connect the constant to 參數 #7's promise.
- **閾值 B（今天建 `risk_scales`）** — no consumer *and* no specification. Either alone would be
  enough to defer it.

---

## Consequences

### 我們接受了什麼

- ⚠️ **Prisma cannot express a generated column.** The field must be declared
  `Int? @default(dbgenerated("<expr>"))`, and W05 measured that Prisma's diff engine compares
  that text to PostgreSQL's normalised expression **byte for byte** — a missing pair of outer
  parentheses makes every later `migrate dev` emit an `ALTER COLUMN ... SET DEFAULT` that then
  **fails to apply**, permanently, for a reason the next session will not guess.
  **取得正規化文字的方式是 `pg_get_expr(adbin, adrelid)`**, never by hand and never by
  `prisma db pull` — the latter rewrites the whole schema file and drops its header comments.
  Both paths Prisma uses (`--from-config-datasource` and the `--from-migrations` shadow
  database) were measured and agree.
- ⚠️ **A generated column cannot reference another generated column** (measured: `cannot use
  generated column ... in column generation expression`). Every derived field that depends on
  the score therefore **repeats the whole expression** — four in the migration, four mirrored
  in `schema.prisma`. The mitigation is mechanical, not disciplinary: `risk-score.ts` exports
  the canonical text and the integration suite asserts each column's `pg_get_expr` against it.
- ⚠️ **Changing the formula or the threshold is a migration with a table rewrite**, not a
  deploy. Accepted; see above.
- ⚠️ **`GREATEST` ignores NULL**, so a partially filled score set produces a confident wrong
  number rather than an error. The generated column alone does **not** close this. It is closed
  by an all-or-none `CHECK (num_nonnulls(...) IN (0, 6))` per score set, which is therefore
  part of this decision rather than a detail of it.
- ⚠️ **Derived fields are NULL for an unassessed risk, not `false`/`acceptable`.** The
  lifecycle at `02a:343-353` guarantees rows with an empty score set (Identified, AssessedBefore,
  Treated), and the natural `CASE ... ELSE 'acceptable'` writes a governance claim the platform
  was never told. Consumers (M7 register, M8 dashboard) must handle three states.
- **`risk_scales` does not exist.** Anyone looking for the calibration table listed in
  `multi-tenant-data.md:65` will not find it, and that line remains the only mention of it in
  the repository.

### 這個決定約束了什麼

- **Every scored entity built after this follows the same shape**: `Assessment`, `ControlTest`,
  M8's `posture_snapshot`. A later table computing its score in application code is not a local
  style choice, it is a divergence from this ADR.
- **No repository, service or controller may accept a score from a caller.** There is no such
  parameter to add — the database refuses the write — but the API shape must not pretend
  otherwise by exposing a settable field.
- **The threshold has exactly one home.** A second constant `16` anywhere in the codebase is a
  defect, not a duplication of a harmless literal.
- **Per-entity calibration, when it arrives, changes the storage decision for
  `acceptance_status` and `in_it_risk_register`** — a configurable threshold cannot be inside a
  generated expression. `score_*` is unaffected: 參數 #7 calibrates the scales, not the product.

### 可證偽條件 ⭐

- **若某個 OpCo 提出真實的 per-entity 閾值或量表校準需求** — then `risk_scales` (or whatever the
  requirement specifies) must be built, and `acceptance_status` / `in_it_risk_register` move out
  of generated columns into a computed read path. **This is the most likely one to fire**, and
  it fires no earlier than M4, because until there is a UI there is nobody to change a setting.
- **若 Prisma 的某個版本開始把 generated column 表達成 `@default(dbgenerated(...))` 以外的形狀** —
  the mirror text would drift on upgrade rather than on edit. The integration assertion against
  `pg_get_expr` is what turns that from a silent break into a red test.
- **若公司的風險管理程序改了公式** — 參數 #7 treats the formula as a hard rule of the procedure,
  not a product preference, so this fires from outside the platform. Cost is a migration with a
  table rewrite, which is the price this decision deliberately pays.
- **若 M8 量到 `ORDER BY score` 並不是滾升查詢真正需要的東西** — the main argument against option B
  would be wrong. ⚠️ Note `D-ratingband` (W05 Day 0): the dashboards specified at `02a:414` /
  `03:90` / `08:25` aggregate by **rating band**, not by the 1–25 score, and how the band is
  derived is still 開放決策 #5. If the band turns out not to come from the score at all, this
  premise weakens.

### Rollback

- **怎麼回滾**: `ALTER TABLE risks ALTER COLUMN score_before DROP EXPRESSION` (leaves the values
  as ordinary data), drop the `@default(dbgenerated(...))` from `schema.prisma`, then move the
  computation into `risk-score.ts` and call it on the write path.
- **估計成本**: ~1 天 while `risks` is the only scored table. It rises with each table that
  copies the shape, which is the point of settling it now.
- **回滾窗口**: no hard close, but each of `Assessment` / `ControlTest` / `posture_snapshot`
  adds a table to the rollback. Practically, revisit before M7 or not at all.

---

## 相關

- **依據**: 已確認參數 **#7**（公式與 governed per-entity calibration）· **#8**（資產基礎評估）·
  **#9**（不得自行發明欄位 —— 否決閾值 B 的第二個理由）· `02a:119-120`（值域與接受準則）·
  `02a:136-142`（評分模型）· `02a:194-196`（Risk 的兩組分數與 derived 欄位）·
  `02a:343-353`（生命週期 —— 為何 derived 欄位必須是三態）
- **量測**: `W05` progress.md Day 1 §1.a（R1–R7 · S1–S6 · T1–T5，共 18 個探測，全部在
  throwaway database 上跑）
- **同型先例**: `ADR-0004` 否決其 option C 的理由（無法獨立成立的第二層等同註解）——
  本 ADR 用同一判準否決分數 C
- **實作**: `W05` / `CH-020` · `apps/api/src/core-model/risk-score.ts`（**刻意不含算術**）
