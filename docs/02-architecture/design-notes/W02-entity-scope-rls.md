# entity-scoping-rls Design Note (Phase W02 extract)

**Purpose**: Spike-extract design note from Phase W02；記錄 entity-scoped row-level security 已驗證的 runtime invariant
**Created**: 2026-08-09 (Phase W02 Day 4 closeout)
**Phase source**: W02 Day 1–3
**Verified ratio**: 24/25 ≈ 96%
**Status**: Active

---

## 0. Spike Summary

- **Phase scope**: US-1 schema · US-2 RLS · US-3 scope 解析 · US-4 滾升 · US-5 fail-closed ·
  US-6 旁路偵測 · US-7 closeout
- **驗證期間**: 2026-08-09 ~ 2026-08-09（Day 0–4，單日）
- **Calibration**: bottom-up 17 hr / committed 11 hr (mult 0.65) / actual ~12.1 hr / ratio **1.10**
  （Day 1-3 逐項加總 8.9 hr；Day 0 **未逐項記錄**，以 ~2.0 hr 估入；Day 4 ~1.2 hr）
- **驗證增量**: +13 unit tests（20 → 33）· +20 integration tests（0 → 20）· drive-through **N/A（無 UI）**
- **無 user-facing surface** —— 本文件所有結論一律 **gate-only verified**，不得被讀成「使用者可用」

---

## 1. Decision Matrix

決策是：**在 Prisma 之上，範疇要靠什麼機制抵達資料庫**。`decision-form.md` OQ-3 列的三個選項，
加上 spike 期間才浮現的第四個。

| Option | 應用層 bug 是否仍隔離 | 旁路成本 | pooler 相容 | Decision |
|--------|---------------------|---------|------------|----------|
| **A RLS + client extension（選定）** | ✅ 資料庫拒絕，與應用層是否正確無關 | 需 detector 守 3 個 API | ⚠️ 依賴 tx-local `set_config`；目前無 pooler | ✅ 選定 —— guardrail 4 明文「優先資料庫層」，而 ADR-0010 拿掉物理隔離後 RLS 是**唯一**屏障 |
| B 應用層過濾（`WHERE org_entity_id IN (...)`） | ❌ 漏一個 `WHERE` 就是跨 OpCo 洩漏 | 無從偵測 —— 漏寫不留痕跡 | ✅ | ❌ 否決 —— `multi-tenant-data.md:182-183` 已寫明症狀：「它跑得通、看起來對、測試也會過」 |
| C 兩者並用 | ✅ | 同 A 再加一層 | ✅ | ❌ ~~**本 phase 否決，非永久**~~ → ✅ **已解封 2026-08-12**（使用者裁決條件是「證據表出現」而非 M3；W07 建了 `evidence` → `BACKLOG.md` `AD-DualLayerHighRisk-1`）。原文：只有一張業務表時第二層無法被證明有效；`multi-tenant-data.md:212` 指定高風險表（稽核 / 證據 / 事件）並用，那是 M3 的事 |
| D 每請求獨立連線（不用 extension） | ✅ | 低 | ❌ 連線成本隨請求數線性上升 | ❌ 否決 —— extension 已證明在 pool max=10 下無汙染（§2.2），付連線成本買不到額外保證 |

**選 A 的具體理由**（不是「best practice」）：本專案的隔離軸是組織實體，而**滾升是合法的跨實體讀取**。
選項 B 會讓「滾升」與「忘記過濾」在程式碼上長得一模一樣 —— 兩者都是「少了一個條件的查詢」。
RLS 把這個區別移到連線層：範疇是連線的屬性，滾升是**設定一個比較大的範疇**，
而忘記設定則是**錯誤**，不是一個比較大的結果集。

---

## 2. Verified Invariants

### 2.1 US-2 — 範疇隨 query 抵達同一個 transaction

- **Implementation**: `apps/api/src/entity-scope/scoped-prisma.provider.ts:68-89`（`runScoped`）·
  `:91-104`（`buildScopedClient` 的 `$allOperations` 掛載）
- **Behavior**: 每個 operation 被 enlist 進一個 transaction，其第一句是
  `set_config('app.entity_scope', <csv>, TRUE)`。RLS policy 從**同一條連線**讀到範疇。
- **Verification**: `npm run test:int -w apps/api`
  （`entity-scope.int.spec.ts` 12 項全部依賴這個機制成立）
- **Test fixture**: `apps/api/test/int-global-setup.js:31-45`（5 個 org entity + 2 個 policy）
- **Failure mode**: 若 operation 跑在另一條連線上，範疇不在那裡 → 資料庫拒絕（`42501`）。
  **失敗方向是吵鬧的，不是安靜的** —— 這是選 A 的附帶收益。

### 2.2 US-2 — 並行請求不互相汙染

- **Implementation**: 同 `:83-87` —— `$transaction([...])` 的批次形式，非 interactive
- **Behavior**: 兩個不同範疇的 client 交錯查詢時，各自只看到自己的列。
- **Verification**（一次性量測，記於 `progress.md` Day 2）：
  120 次交錯 scoped 讀 × pool `max: 1` 與 `max: 10` → **0 錯**
- **Test fixture**: 量測腳本在 scratchpad，未進 repo；常駐版本是 `entity-scope.int.spec.ts`
- **Failure mode**: 汙染會表現為「A 的請求看到 B 的列」—— **這是唯一不會拋錯的失敗模式**，
  所以它是 §4 唯一列為「已量測但無常駐迴歸測試」的項目

### 2.3 US-5 — 未設定範疇是錯誤，不是空結果 ⭐ 本 spike 最重要的發現

- **Implementation**: `apps/api/prisma/migrations/20260809171812_entity_scope_fail_closed/migration.sql:29-49`
  （`app_entity_scope()`）· `:56-62`（policy 改掛該函式）
- **Behavior**: `app.entity_scope` 未定義 → `42704`；定義為空字串 → `42501 app.entity_scope is not set`。
  兩者都是錯誤，**都不是 0 列**。
- **Verification**:
  ```
  docker compose -f docker/compose.yml exec -T postgres \
    psql -U isms_app_user -d isms_dev -c "SET app.entity_scope = ''; SELECT count(*) FROM policies;"
  # -> ERROR:  app.entity_scope is not set
  #    HINT:  Every query must go through the entity-scope client extension.
  ```
- **Test fixture**: `apps/api/src/entity-scope/rls-direct.int.spec.ts:106-120`（未設定 / 設為空各一項）
- **Failure mode**: 退化回空結果集。在這個平台上那不是空畫面，是「這個 OpCo 沒有 policy」這句**假話**
  （`multi-tenant-data.md:207-210`）。

> **這一項推翻了 Day-0 的結論。** Day-0 量到「不帶 `missing_ok` 的 `current_setting` 未設定時
> `42704`」，於是判定 fail-closed 由 PostgreSQL 免費提供、extension 不必實作，並據此減了 0.5 hr。
> Day-2 量到那句話的邊界：`set_config(…, true)` 的**值**是 transaction-local，
> 但「這個參數存在」不是 —— COMMIT 之後參數仍在、值為空字串，`current_setting` 從此不再 raise。
> **production 的 pooled 連線從第二個請求起全部處於後者。**
> 免費的東西只在一條從未被 scope 過的連線上成立。

### 2.4 US-2 — `WITH CHECK` 擋住列走出範疇

- **Implementation**: `apps/api/prisma/migrations/20260809171812_entity_scope_fail_closed/migration.sql:58-62`
- **Behavior**: `USING` 決定看得到哪些列；`WITH CHECK` 決定寫得進哪些列。只有 `USING` 時，
  INSERT 可以把列塞進別的實體、UPDATE 可以把自己的列搬過去。
- **Verification**: `npm run test:int -w apps/api`
- **Test fixture**: `apps/api/src/entity-scope/entity-scope.int.spec.ts:96-124`
  （INSERT 與 UPDATE 各一項，**且拒絕後重讀確認資料未變**）
- **Failure mode**: 只驗回應碼會漏掉「拒絕了但資料被改了」（`multi-tenant-data.md:290-291`）

### 2.5 US-4 — 滾升是子樹過濾，不是繞過

- **Implementation**: `apps/api/src/entity-scope/entity-scope.resolver.ts:94-132`（`resolve`）·
  `:134-144`（`expandSubtrees`，materialised path 前綴比對）
- **Behavior**: `rollUp` 決定「要不要展開到子孫」，**不決定要不要過濾**。
  APAC 指派與全域指派的差別是回傳哪些列，不是有沒有過濾。
- **Verification**: `npm run test -w apps/api`（單元 7 項）+ `npm run test:int -w apps/api`（整合 3 項）
- **Test fixture**: `apps/api/src/entity-scope/entity-scope.resolver.spec.ts:29-35`（五層階層）
- **Failure mode**: `if role == 'regional_iso': return all()`（`multi-tenant-data.md:145` 點名）。
  抓得到它的只有**兄弟分支斷言** —— 一個「回傳全部」的 resolver 能通過其餘每一項。

### 2.6 US-3 — 範疇只能由 resolver 鑄造

- **Implementation**: `apps/api/src/entity-scope/entity-scope.resolver.ts:46`（未匯出的 brand symbol）·
  `:49-56`（`EntityScope`）· `:79-80`（唯一鑄造點 `mintScope`）
- **Behavior**: 其他模組沒有那個 symbol 的名字，就造不出符合 `EntityScope` 的值。
  鐵律 3「範疇只能來自憑證、不能來自請求參數」因此是**編譯錯誤**。
- **Verification**: `npm run type-check -w apps/api` ——
  可用「在 resolver 外面寫 `const s = {entityIds:['x']} as EntityScope`」重現，TS 報 `TS2352`
  （這正是我自己第一版寫法被拒的方式）
- **Test fixture**: 型別層機制，無 runtime fixture
- **Failure mode**: 若有人加上 `as unknown as EntityScope` 就繞過了。型別擋的是**手滑**，不是**惡意**。

### 2.7 US-2 — 連線角色本身才是決定性的

- **Implementation**: `docker/init-app-role.sh` · `apps/api/prisma/migrations/20260809075152_entity_scope_spike/migration.sql:76-106`
  （`isms_app` NOLOGIN 群組 + 條件式 membership）· `.env.example:25-41`（兩個連線字串）
- **Behavior**: `FORCE ROW LEVEL SECURITY` 解決的是 **table owner**，**擋不住 superuser**。
  應用程式連線角色必須是 `rolsuper=f, rolbypassrls=f`。
- **Verification**:
  ```
  docker compose -f docker/compose.yml exec -T postgres psql -U isms_dev -d isms_dev -tAc \
    "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname LIKE 'isms%'"
  # isms_app_user | f | f      <- 應用程式
  # isms_dev      | t | t      <- migration 專用
  ```
- **Test fixture**: `apps/api/test/int-global-setup.js:76-93`（跑測試前先斷言，不成立即 throw）·
  `apps/api/src/entity-scope/rls-direct.int.spec.ts:38-51`
- **Failure mode**: **整套隔離無聲失效，而每一個測試照樣通過。**
  2026-08-09 實際發生過：`.env` 仍是 W01 的單一角色 URL，十二項探測全綠而 RLS 全程未生效。

### 2.8 US-2 — 不 GRANT DELETE，軟刪除變成結構性的

- **Implementation**: `apps/api/prisma/migrations/20260809075152_entity_scope_spike/migration.sql:90-93`
- **Behavior**: `GRANT SELECT, INSERT, UPDATE`，**沒有 DELETE**。guardrail 3 的軟刪除因此由權限強制。
- **Verification**: `npm run test:int -w apps/api`
- **Test fixture**: `apps/api/src/entity-scope/rls-direct.int.spec.ts:96-104`（`DELETE` → `42501`）
- **Failure mode**: 若有人補了 GRANT，軟刪除退回成一條「要靠人記得」的慣例

### 2.9 US-6 — 旁路路徑由 CI 機械偵測

- **Implementation**: `scripts/assert-no-scope-bypass.mjs:53-73`（三條規則）· `:80-92`（allowlist 三個檔案）·
  `:150-165`（self-test，**不在旗標後面**）
- **Behavior**: `$queryRaw`/`$executeRaw`/`*Unsafe` · `.connection` · `new PrismaClient(`
  出現在 allowlist 以外即 fail。
- **Verification**: `npm run lint:negative`（ci.yml 的 `Negative gates` 步驟本來就跑它 ——
  **CI 接線零改動**）
- **Test fixture**: `apps/api/src/entity-scope/__fixtures__/scope-bypass.ts`（常駐，刻意錯的）
- **Failure mode**: pattern 失效 → 報「0 violations」→ 與乾淨的 repo 無法區分。
  self-test 就是為此存在：兩種弄壞法（生產程式碼加真旁路 / 把 pattern 改成永不匹配）都實測過紅。

### 2.10 US-2 — 資料庫層獨立於應用層成立

- **Implementation**: policy 本身（2.3 / 2.4）
- **Behavior**: 不經 Nest、不經 Prisma、不經 extension，直接用 `pg` 下 SQL 時隔離依然成立。
- **Verification**: `npm run test:int -w apps/api`（`rls-direct.int.spec.ts` 8 項）
- **Test fixture**: `apps/api/src/entity-scope/rls-direct.int.spec.ts`
- **Failure mode**: 一個透過受測程式碼去問資料庫的測試**分不出是哪一層拒絕的**（`07:55` 要的正是這一層）。
  整套 policy 被中性化為 `USING (true)` 時實測 **14/20 紅**，還原後 20/20 —— 這套測試是活的。

---

## 3. Cross-Scope Contracts

本 spike **未新增跨範疇契約**，而這件事本身是一個發現：

`scope-boundaries.md:124` 記載的設計意圖是「範疇化 client 的**型別**住在契約層」。
**那做不到。** 契約層（`api`）是葉節點，依矩陣不能 import `core-model`；
而範疇化 Prisma client 的型別必然是 generated 的（`apps/api/src/generated/prisma`，
`eslint.config.mjs:60` 將其歸類為 `core-model`）。

可行的拆法是 **token 在 `api`、型別在 `core-model`、實例由 `entity-scope` 提供**，
`core-model` 因此仍然不 import `entity-scope`。**本 phase 沒有建它** ——
`core-model` 目前沒有任何 repository，建一個零消費者的 DI token 是 AP-5 + AP-3。
M1 的第一個 repository 是它真正的觸發點。

---

## 4. Open Invariants（延後，**未驗證**）

- [ ] **`core-model` 經 DI 取得範疇化 client** — 沒有消費者可以驗證（見 §3）。M1 第一個 repository 觸發
- [ ] **並行汙染的常駐迴歸測試** — §2.2 是一次性量測。它是唯一不會拋錯的失敗模式，
      卻沒有測試守著。**這是本文件最弱的一項**
- [ ] **pooler（PgBouncer）情境** — 目前無 pooler。transaction pooling 模式下 tx-local `set_config`
      的行為未驗；OQ-3 選項 B 的前提就在這裡
- [ ] **稽核軌跡** — 滾升讀取要被稽核（`multi-tenant-data.md:146`），本 phase 未做。M3 / ADR-0003
- [ ] **子表** — 只有一張業務表，`org_entity_id` 的冗餘規則（子表也要帶）未被實際考驗
- [ ] **`app_entity_scope()` 的每列成本** — 標 `STABLE` 讓 planner 每 statement 求值一次，
      但未做 `EXPLAIN` 量測。資料量成長後要驗
- [ ] **HTTP 404 映射** — 本 phase 無 endpoint。已驗的是它的**來源**（範疇外與不存在無法區分），
      狀態碼隨 endpoint 一起延後

---

## 5. Rollback / Fallback

- **若此設計後續證明錯**：revert `apps/api/src/entity-scope/` 全部 + `prisma.service.ts` 的
  connection/probe 拆分 + 兩個 migration（policy 與 `app_entity_scope()` 可 `DROP`，表可留）
- **估計回滾成本**: ~4 hr（程式碼）+ 一個 down migration
- **既有的 fallback 機制**: 有 —— 選項 B（應用層過濾）不需要新基礎設施，
  但依 OQ-3 原文，那個降級**必須被記錄而非默默發生**
- **回滾窗口**: M3 之後急遽上升 —— 稽核軌跡的攔截點會落在同一個 extension 內（ADR-0001:136-137）
- **可證偽條件**: 見 ADR-0004 §可證偽條件

---

## 6. References

- Phase plan: `docs/01-planning/W02-entity-scope-rls-spike/plan.md`
- Phase progress（三天的量測全文）: `docs/01-planning/W02-entity-scope-rls-spike/progress.md`
- Phase retrospective: `docs/01-planning/W02-entity-scope-rls-spike/retrospective.md`
- Change record: `docs/03-implementation/changes/CH-014-w02-entity-scope-rls.md`
- ADR: `docs/14-adr/0004-entity-scoping-enforcement.md`（本 spike 解封）
- 上游 ADR: `docs/14-adr/0001-backend-framework.md` §可證偽條件 #1
- 相關規則: `docs/rules-on-demand/multi-tenant-data.md` · `docs/rules-on-demand/scope-boundaries.md`

---

## Modification History

- 2026-08-09: Initial extract from Phase W02 closeout (Day 4)
