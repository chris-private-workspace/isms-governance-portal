---
status: closed  # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W02 Plan — entity-scoping spike: prove RLS holds under Prisma

**Summary**: 用**最小**的真實資料切片（`OrgEntity` + 一張業務表）證明 guardrail 4 的
資料庫層強制在 NestJS + Prisma 下真的成立 —— 或證明它不成立。這是 **ADR-0001 §可證偽條件 #1**
的驗證，也是 **ADR-0004** 的解封條件；`07:64` 明文說這幾份 ADR「cannot be written ahead of
the spike measurements」。不做完整 M1 資料模型（使用者 2026-08-09 拍板）。
**產出 design note（spike 強制）+ ADR-0004。** 無 user-facing surface → **無 drive-through**，
結論一律寫 gate-only verified。

**Status**: **CLOSED 2026-08-09** —— 七個 US 全部交付；ADR-0004 拍板、OQ-3 關閉、
ADR-0001 §可證偽條件 #1 裁決未觸發。**兩項未完成已標 🚧 並轉 AD**
（`AD-ScopedClientDI-1` · `AD-ScopeConcurrency-1`），見
[retrospective.md](./retrospective.md) Q1。
（原：Approved-to-execute，laitim2001 於 2026-08-09 核可 plan；範圍兩項同日拍板：
最小 RLS spike 不做完整 M1 · 驗單一實體 + 授權子樹）

**Branch**: `feature/W02-entity-scope-rls`
**Base**: `main` HEAD `903ce35`（CH-013 closeout —— image-smoke 已在線）
**Slice**: standalone spike。解封 **ADR-0004**、驗證 **ADR-0001 可證偽條件 #1**、
關 `decision-form.md` **OQ-3**。M1 / M2 的前置，但**不交付 M1**。
**Scope decisions**:
(a) 最小切片 —— 2 張表，不建 `02a` 的 19 個實體；
(b) 範疇形狀驗**單一實體 + 授權子樹滾升**兩者（滾升是旗艦，且是本專案與 SaaS 隔離最大的差異）；
(c) 欄位命名採 **`org_entity_id`**（`02a:90`）而非 `entity_id` —— 見 §0 Root cause；
(d) **不建 `extensions` JSONB 欄位** —— 那是 ADR-0005 的決定，未拍板；
(e) RLS policy 與第一張表**必須同一個 migration** —— 先建表後補 policy 之間存在違反 guardrail 4 的窗口。

---

## 0. Background

### The gap（`AD-RLS-Unverified`／OQ-3／ADR-0001 可證偽條件 #1）

平台目前**沒有任何實體範疇隔離**，而且承重機制**從未被寫過，也從未被跑過**。

- `apps/api/src/core-model/prisma.service.ts:12` 明文標示 `THIS CLIENT IS NOT YET ENTITY-SCOPED`
- `apps/api/prisma/schema.prisma` **零 model** —— 所以今天沒有資料可洩
- ADR-0001 承認 RLS「is not a framework guarantee」，wrapper「must be written and proven」

### Why it matters（缺失的能力）

**M1 建第一張表的瞬間，未範疇化的 client 就是 guardrail 4 的違反。** 這不是「之後補」
能解決的：`org_entity_id` 的形狀、policy 的掛法、DB 角色模型都在建表當下決定，
事後補等於重做 migration。

更重的是 **ADR-0010 拿掉了物理隔離**。`07:33` 原話：RLS「now the *only* isolation barrier」。
`multi-tenant-data.md:180-185` 說得更直白 —— 滾升現在只是一個少了 `WHERE org_entity_id` 的查詢，
**它跑得通、看起來對、測試也會過**。

而 ADR-0001 §可證偽條件 #1 把賭注講得很清楚：若 spike 顯示有寫入路徑繞過 extension
**且無法在 CI 機械偵測**，則 entity-scoping 或稽核完整性不可強制，**要先換掉 Prisma
（Drizzle/Kysely），再考慮框架**。這是在建 19 個實體之前必須知道的事。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `903ce35`）| Anchor |
|-------|--------------------------------------------|--------|
| Prisma client | 單一未範疇化 client，`$connect()` 於 `onModuleInit` | `prisma.service.ts:41-50` |
| Schema | 零 model；datasource + generator only | `schema.prisma:30-37` |
| RLS 機制 | 需 client extension 包 `$transaction` + `set_config('app.entity_scope', …, true)`，**未寫** | `ADR-0001:103-105` |
| 旁路路徑 | `$queryRaw` / migration / Prisma Studio 繞過 extension；「CI must detect those paths **mechanically, not by review**」 | `ADR-0001:112-113` |
| 賭注 | 一個 extension 要同時滿足 guardrail 4 與 5；**未測試** | `ADR-0001:121-125` |
| 範疇形狀 | 單一實體 / 子樹 / 全區，由角色指派推導 | `03:31` |
| policy 示意 | `org_entity_id = ANY(string_to_array(current_setting('app.entity_scope'), ',')::uuid[])` —— **示意非定案** | `multi-tenant-data.md:200-205` |
| 靜默失敗 | 漏設 scope → policy 回**空集合而非報錯**；「那不是空畫面，是錯誤的保證」 | `multi-tenant-data.md:207-210` |
| ⚠️ 欄位命名衝突 | `02a` 用 `org_entity_id`；rule 與 W01 註解用 `entity_id` | `02a:90` vs `multi-tenant-data.md:35` · `schema.prisma:14` |
| ⚠️ 文件空白 | **`FORCE ROW LEVEL SECURITY` / DB 角色分離全 `docs/` 零命中** | grep 2026-08-09 |

→ 修正必須做的事：(1) 寫出並證明那個 extension；(2) 讓 policy 在**非 owner 角色**下真的生效；
(3) 讓「漏設 scope」是 **fail-closed 的錯誤**而不是空結果；(4) 把旁路路徑變成 CI 抓得到的東西；
(5) 用 `org_entity_id` 並修正兩處較低權威的來源。

### The design（backend-only：2 張表 + 1 個 client extension + RLS policy + 6 類測試）

```
apps/api/prisma/schema.prisma          + OrgEntity（全域）+ 1 張業務表（org_entity_id NOT NULL）
apps/api/prisma/migrations/…           表 + RLS policy + FORCE RLS + 角色，同一個 migration
apps/api/src/entity-scope/             scope 解析（授權子樹）+ Prisma client extension
apps/api/src/core-model/prisma.service 改為僅由 entity-scope 經 DI 提供範疇化 client
scripts/                               旁路路徑 detector（$queryRaw 等）
```

**為何不先建完整 M1**：ADR-0001 的賭注若不成立，19 個實體全部要重做。
先驗證機制、再長資料模型 —— 與「文檔成長跟隨已驗證的 runtime」同構。

### Ground truth（recon head-start —— 於 `main` HEAD `903ce35` 讀過的 code）

- `02a:84-98` — base fields 清單。**`owner_user_id` FK → User 屬 M4，`extensions` 屬 ADR-0005，兩者本 phase 都不建**
- `02a:25` — `OrgEntity` 是「The scoping and roll-up spine」，Wave 1
- `multi-tenant-data.md:57-67` — 全域表白名單，`org_entities` 在列（它**定義**範疇，不能被範疇過濾）
- `multi-tenant-data.md:144-149` — 滾升三條件；**禁止**為滾升開一條免 RLS 的連線
- `multi-tenant-data.md:294-299` — 「RLS 層獨立成立」測試要**繞過應用層直接連 DB**
- `07:55` — access-control tests 必須涵蓋 app **and — critically — database/RLS layer**
- `prisma.service.ts:19-22` — W01 已寫下設計意圖：client 所有權移到 `entity-scope`，**經 DI 而非 import**

**Baselines（CH-013 closeout `903ce35`）**: api test **20** · web test **10** ·
lint **0** · type-check **0** · build **clean** · coverage **100/78.57/100/100** ·
run_all **6/6** · image-smoke **pass**。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-fieldname** — `org_entity_id` vs `entity_id` 三處來源，確認權威並列出所有待修處 → §Risks
- **D-prisma7-rls** — Prisma 7 的 client extension API 形狀（`$allOperations`？）與 registry 現況 → 若與 ADR-0001:103 的描述不符，§3 要改
- **D-forcerls** — 本機 PostgreSQL 18 上 `FORCE ROW LEVEL SECURITY` 與 owner 繞過的實際行為 → 決定角色模型
- **D-basefields** — `02a` base fields 中哪些在本 phase 建得起來（無 User / 無 ADR-0005）→ §3 表定義
- **D-migration-role** — `prisma migrate` 用哪個 DB 角色、能否與 app 角色分離 → 若不能，policy 可能對 app 連線無效

## 1. Phase Goal

在真實的 PostgreSQL 上證明：**一個實體的資料在資料庫層無法被另一個實體讀到或寫到，
即使應用層程式碼有 bug；而授權子樹的滾升讀取是合法且被稽核的**。
證明方式是 6 類測試全過（含**繞過應用層、用 `psql` 直連**的獨立驗證）+
一個會被 CI 執行的旁路偵測。**產出 design note（spike 強制，含 `file:line`）與 ADR-0004。**
無 user-facing surface → 無 drive-through，結論一律寫 **gate-only verified**。

## 2. User Stories

- **US-1**（schema）: 作為平台，我希望每筆業務記錄都帶 `org_entity_id NOT NULL` 並指向組織階層，以便範疇過濾與滾升共用同一個參照。
- **US-2**（RLS）: 作為稽核人員，我希望隔離由**資料庫**強制而非應用程式碼，以便應用層的 bug 不會變成資料外洩。
- **US-3**（scope 解析）: 作為 OpCo 使用者，我希望我的範疇來自憑證而非請求參數，以便沒有人能用改參數的方式看別人的資料。
- **US-4**（滾升）: 作為 Regional ISO，我希望看到**我被授權的子樹**的聚合，以便滾升是加法而不是後門。
- **US-5**（fail-closed）: 作為平台，我希望漏設範疇時**報錯**而不是回空集合，以便「這個 OpCo 沒有風險」永遠不會是一個謊。
- **US-6**（旁路偵測）: 作為維護者，我希望繞過 extension 的寫入路徑被 CI 機械抓到，以便這個保證不依賴 review 的注意力。
- **US-7**（closeout）: 作為下一個 phase，我希望拿到 design note + ADR-0004，以便 M1 建表時不必重新推導。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   apps/api/prisma/migrations/<ts>_entity_scope_spike/migration.sql   表 + RLS + 角色（同一個）
EDIT  apps/api/prisma/schema.prisma                                      + 2 個 model
NEW   apps/api/src/entity-scope/entity-scope.module.ts                   範疇 module
NEW   apps/api/src/entity-scope/scoped-prisma.provider.ts                client extension（承重）
NEW   apps/api/src/entity-scope/entity-scope.resolver.ts                 授權子樹解析
NEW   apps/api/src/entity-scope/*.spec.ts                                6 類測試
NEW   scripts/assert-no-scope-bypass.mjs                                 旁路 detector
EDIT  apps/api/src/core-model/prisma.service.ts                          不再匯出未範疇化 client
EDIT  package.json (root)                                                + lint:negative 的第二個斷言
—     apps/web/**                                                        UNTOUCHED（無 UI）
—     .github/workflows/image-smoke.yml                                  UNTOUCHED
```

### 3.1 Schema（US-1）— `schema.prisma` + migration

- **`OrgEntity`（全域表，無 `org_entity_id`）** —— 自我參照階層（`03:14-21`：Region → Country → Legal entity → BU）。
  它**定義**範疇，被範疇過濾會使階層無法解析（`multi-tenant-data.md:61`）。
- **業務表：`Policy` 的最小真實子集** —— 不發明假表（AP-3），但只建本 phase 驗證得了的欄位。
  ⚠️ **明確延後**：`owner_user_id`（M4 無 User 表）· `extensions`（ADR-0005 未定）·
  `ref_code` 的序號產生器（需 entity code 規則）。**延後項逐條寫進 migration 註解與 design note，不靜默省略。**
- 欄位名採 **`org_entity_id`**（`02a:90` 為最高權威）。複合索引以它起頭（`multi-tenant-data.md:50-51`）。
- 軟刪除 + version（guardrail 3）。

### 3.2 RLS（US-2）— migration.sql

- `ENABLE` **且** `FORCE ROW LEVEL SECURITY` —— 沒有 FORCE 時 table owner 繞過 policy。
  ⚠️ **Day-0 修正**：FORCE 解決的是 **table owner**，**擋不住 superuser** —— 見下。
- 🔴 **DB 角色分離（Day-0 D-superuser 使範圍擴大，使用者 2026-08-09 核可）**：
  實測 `POSTGRES_USER: isms_dev` 為 `rolsuper=t, rolbypassrls=t`，而 `prisma.service.ts:43`
  現在就是用它連線 —— **policy 寫得再完美都無效**。本 phase 必須：
  (1) `docker/compose.yml` 建一個受限 app 角色（非 owner、無 BYPASSRLS、無 superuser）；
  (2) `.env.example` 分出 app 與 migration 兩個連線字串
      （`prisma.config.ts:11-15` 已預想到，但兩者現在讀同一個 `DATABASE_URL`）；
  (3) `image-smoke.yml` 的 api 容器改用受限角色 —— **否則 CI 的 smoke 會用 superuser 跑，
      綠燈但證明不了隔離**。這正是本專案的「綠燈但空轉」形狀。
- policy 以 **不帶 `missing_ok` 的** `current_setting('app.entity_scope')` 為準 ——
  ⭐ **Day-0 D-failclosed**：未設定時 PostgreSQL 直接 `ERROR 42704`，
  fail-closed **由資料庫免費提供**，不必在 extension 實作，且與 extension 的檢查**兩層獨立成立**。
  加了 `missing_ok=true` 才會退化成靜默的空集合。
- policy **與表在同一個 migration**（scope decision (e)）。

### 3.3 Client extension（US-2/US-3/US-5）— `scoped-prisma.provider.ts` ⭐ 承重

- 每個 operation 包進 `$transaction`，先 `set_config('app.entity_scope', …, true)`（transaction-local）。
- **fail-closed**：scope 未設定時**拋錯**，不落到「policy 回空集合」那條路。
- 所有權在 `entity-scope`，`core-model` 與 `modules` **經 DI 取得，不 import**
  （`prisma.service.ts:19-22` 的設計意圖 + `scope-boundaries.md` 矩陣的承重假設）。

### 3.4 授權子樹（US-4）— `entity-scope.resolver.ts`

- 從角色指派解析出授權子樹（遞迴），**不是** query 參數、**不是** `if role == 'regional_iso': return all()`。
- 滾升 = 子樹過濾，**不開免 RLS 的連線**（`multi-tenant-data.md:149,161-163`）。

### 3.5 旁路偵測（US-6）— `scripts/assert-no-scope-bypass.mjs`

- 沿用 CH-012/CH-013 已建立的形狀：**常駐負面案例 + 在 CI 執行 + 自己被弄壞過**。
- 對象：`$queryRaw` / `$executeRaw` / 直接 import 未範疇化 client。

### 3.x 明確不做的事

- **不建 M1 的其餘 17 個實體** —— 使用者拍板的範圍邊界。
- **不做 pooler（PgBouncer）情境驗證** —— 目前沒有 pooler；OQ-3 選項 B 的前提待該情境出現時再驗（記 AD）。
- **不做稽核軌跡**（M3 / ADR-0003）—— 但滾升讀取要被稽核這件事在 design note 標為待接。
- **不做 API endpoint / UI** —— 無 user-facing surface 是刻意的，本 phase 驗的是資料層。

### 3.y Validation（US-1..US-7）

Gates: lint 0 · lint:negative PASS · type-check 0 · api test ≥ 26（baseline 20 + 6 類）·
web test 10（不變）· build clean · run_all 6/6 · image-smoke pass · coverage 門檻不退步。
**外加**：`psql` 直連的獨立隔離驗證（不經應用層）+ 旁路 detector 的元驗證。
⚪ **無 drive-through**（無 UI）—— 結論寫 gate-only verified。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_entity_scope_spike/migration.sql` | NEW |
| 3 | `apps/api/src/entity-scope/entity-scope.module.ts` | NEW |
| 4 | `apps/api/src/entity-scope/scoped-prisma.provider.ts` | NEW |
| 5 | `apps/api/src/entity-scope/entity-scope.resolver.ts` | NEW |
| 6 | `apps/api/src/entity-scope/scoped-prisma.spec.ts` | NEW |
| 7 | `apps/api/src/entity-scope/rls-direct.spec.ts` | NEW（`psql` 層獨立驗證）|
| 8 | `scripts/assert-no-scope-bypass.mjs` | NEW |
| 9 | `apps/api/src/core-model/prisma.service.ts` | EDIT |
| 10 | `package.json`（root）| EDIT |
| 11 | `docs/02-architecture/design-notes/W02-entity-scope-rls.md` | NEW（spike 強制）|
| 12 | `docs/14-adr/0004-entity-scoping-enforcement.md` | NEW |
| 13 | `docs/rules-on-demand/multi-tenant-data.md` · `schema.prisma` 註解 | EDIT（`entity_id` → `org_entity_id`）|
| 14 | `docker/compose.yml` | EDIT — 🔴 **Day-0 D-superuser**：建受限 app 角色 |
| 15 | `.env.example` | EDIT — 分出 app / migration 兩個連線字串 |
| 16 | `.github/workflows/image-smoke.yml` | EDIT — api 容器改用受限角色 |
| — | `apps/web/**` | **UNTOUCHED** |
| — | `.github/workflows/ci.yml` | **UNTOUCHED**（除非旁路 detector 需要接線）|

> 📌 **14-16 是 Day-0 之後才進來的**（使用者 2026-08-09 核可）。原 §4 把 `image-smoke.yml`
> 明確標為 UNTOUCHED —— 那個判斷建立在「app 用什麼角色連線不影響 CI」之上，而 D-superuser
> 推翻了它：**CI 若繼續用 superuser 跑 smoke，探測會綠，但它證明不了隔離。**

## 5. Acceptance Criteria

1. 業務表有 `org_entity_id NOT NULL` + FK + 以它起頭的複合索引；`OrgEntity` 為全域表且階層可解析。
2. RLS `ENABLE` **且** `FORCE`；app 連線角色非 owner、無 BYPASSRLS —— 用 `psql` 直連證明。
3. **四個範疇測試全過**（約束 8）：跨實體讀拒絕 / 跨實體寫拒絕**且資料未變** / RLS 層獨立成立 / 滾升限於授權子樹。
4. **fail-closed**：未設 scope 時**拋錯**，不是回空集合 —— 有測試證明兩者可區分。
5. **旁路 detector 在 CI 執行，且被弄壞過一次**（元驗證，CH-012/013 建立的紀律）。
6. `core-model` 取得範疇化 client 是**經 DI 而非 import**，boundaries lint 仍綠。
7. **design note 產出**（spike 強制，8-point gate，含 `file:line`）；**ADR-0004 產出**（含可證偽條件）。
8. ⚪ Drive-through **N/A**（無 UI）—— 報告一律寫 gate-only verified，不得暗示可用性。
9. OQ-3 關閉；`AD-RLS-Unverified` 關閉；calibration 已回填；BACKLOG + 導航檔已更新。

## 6. Deliverables

- [ ] US-1 `OrgEntity` + 業務表最小切片，`org_entity_id NOT NULL`
- [ ] US-2 RLS policy + FORCE + DB 角色分離，同一個 migration
- [ ] US-3 client extension（transaction-local `set_config`），scope 來自憑證
- [ ] US-4 授權子樹解析 + 滾升測試
- [ ] US-5 fail-closed 行為 + 可區分空結果的測試
- [ ] US-6 旁路 detector + CI 接線 + 元驗證
- [ ] US-7 design note + ADR-0004 + closeout

## 7. Workload Calibration

- Scope class **`spike` 0.65**（`CALIBRATION-MATRIX.md:64` 的建議起手值 ——
  「新領域 / 新技術 / 沒有藍本」。**NEW class，第 1 個資料點**。
  本專案唯一既有資料點是 `greenfield-scaffold` 0.60。）
- **Agent-delegated: `no`**（承重機制 + guardrail 4，設計判斷密度高，不委派）。
  `agent_factor` 1.0 → **三段式**。
- Bottom-up est ~**14 hr**（Day-0 verify 2 · schema+migration 3 · extension 4 ·
  子樹解析 1.5 · 測試 2.5 · detector 1）→ class-calibrated commit ~**9 hr** (mult 0.65)。
- **Day-0 後修訂（使用者核可範圍擴大）**：+2 hr DB 角色模型（compose / `.env.example` /
  `image-smoke.yml` 三處接線）· +1.5 hr 整合測試基礎設施（**D-testinfra**：`jest.config.js`
  無 setup、無 migrations 目錄，要從零建測試 database 隔離）· **−0.5 hr** fail-closed
  改由 policy 免費提供（**D-failclosed**）。
  → Bottom-up ~**17 hr** → class-calibrated commit ~**11 hr** (mult 0.65)。Day-4 retro Q2 驗證。
- ⚠️ `AD-TimeTracking-1`：W01 全程零工時紀錄，calibration 只能由 commit 時間戳回推。
  **本 phase 每日 progress 條目強制寫 `Task X.Y — actual Z min (est ~W min)`。**

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **ADR-0001 可證偽條件 #1 觸發** —— extension 攔不到全部路徑 | **STOP and ask**，不自行換 ORM。這是架構級決定（R5），要新 ADR |
| ~~Prisma 7 的 extension API 與 ADR-0001:103 的描述不符~~ | ✅ **Day-0 D-prisma7-rls 實測成立**（`$extends` + `$allOperations` + tx-local `set_config` 且 tx 後不洩漏）|
| ~~`FORCE RLS` / 角色模型在 `docs/` 完全空白~~ | 🟡 **Day-0 D-docsgap 修正此措辭**：不是沒人知道 —— W01 已寫進 `prisma.config.ts:11-15` 的註解，但**沒進設計文件**。與 `AD-ImageDigest-1` 同一種病 |
| 🔴 **Day-0 D-superuser** —— `POSTGRES_USER: isms_dev` 是 `rolsuper=t, rolbypassrls=t`，而 app 現在就是用它連線 | **superuser 繞過 RLS，FORCE 也擋不住。** 必須建受限 app 角色 → `docker/compose.yml` · `.env.example` · `image-smoke.yml` 進入範圍（原 §4 標 image-smoke 為 UNTOUCHED）。**改 shared infra / CI-CD 需使用者確認** |
| 🟡 **Day-0 D-testinfra** —— 整合測試基礎設施不存在（`jest.config.js` 無 setup / 無 migrations 目錄）| 要從零建測試 database 隔離 + setup/teardown + timeout。§7 bottom-up 未計入，Day-1 前修訂 |
| ✅ **Day-0 D-failclosed（範圍縮小）** | fail-closed 由 PostgreSQL 免費提供 —— policy 用**不帶 `missing_ok`** 的 `current_setting`，未設定即 `ERROR 42704`。extension 不必自己實作，且**兩層獨立成立** |
| 欄位命名兩套（`org_entity_id` vs `entity_id`）| Day-0 **D-fieldname** 確認權威 + 列出待修處；**不默默選一個** |
| RLS 靜默失敗（漏設 scope → 空集合）| US-5 專門處理；測試必須能區分「空」與「未設定」 |
| **Risk Class A**（測試間 singleton 汙染）| 範疇測試共用 Prisma client → per-suite reset fixture |
| **Risk Class C**（陳舊 dev server 掩蓋 wiring 修正）| 驗證 extension wiring 前乾淨重啟，比對 mtime 而非只看 port 擁有者（W01 已踩過）|
| 測試需要真 PostgreSQL | 本機 `docker/compose.yml` 已在；CI 需要 —— 沿用 `image-smoke.yml` 已驗證的 compose 起法 |
| 「綠燈但空轉」第 6 次 | 每個宣稱會擋住某件事的機制都要有常駐負面案例（`AD-NegativeGate-1`）—— US-6 + AC-5 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- M1 其餘 17 個實體 — 下一個 phase，依本 phase 的 design note 建
- `extensions` JSONB / 治理擴充 — ADR-0005，未拍板
- 稽核軌跡與 hash-chain — M3 / ADR-0003；design note 標出「滾升讀取要被稽核」的接點
- OIDC / 真實角色指派 — M4；本 phase 的 scope 來源用最小的可測替身，**且明確標示為替身**
- pooler（PgBouncer）情境下的 `SET LOCAL` 行為 — 目前無 pooler，記 AD
- API endpoint / UI — 無 user-facing surface 是刻意的
