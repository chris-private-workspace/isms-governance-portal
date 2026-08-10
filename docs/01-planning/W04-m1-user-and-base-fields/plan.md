---
status: active   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W04 Plan — M1 slice 1: the shape every table copies

**Summary**: M1 要建 35 個實體，本 phase **一個都不多建** —— 它交付的是「**一張業務表完整長什麼樣**」的
答案，並用 `User` 與既有的 `Policy` 兩張表證明它。關掉 `AD-UserEntitySpec-1`（`User` 沒有欄位規格，
而 `02a` §1.1 的每個實體都有 3 個 FK 指向它）。**關鍵範圍決策**：不建 `Role` / `Permission`（M4）、
不建其餘 32 張表（後續 slice）。⚪ **無 user-facing surface** → drive-through 不適用，
一律標 **API-level verified**。✅ **需要 design note**（spike：`User` 的範疇語義無前例可循）。

**Status**: **Approved-to-execute**（使用者核可 2026-08-10，同時拍板 §3.1 **D1 = A（全域）+ ADR**。
Day-0 三-prong 已跑：10 path · 4 content · 3 schema，**2 個漂移 + 1 個 orphan claim**，
範圍變動 ~10% → 繼續 Day 1。詳見 [progress.md](./progress.md) Day 0）

**Branch**: `feature/W04-m1-user-base-fields`
**Base**: `main` HEAD `65ce121`（W03 closeout + 審計 #2 五條漂移修正 + `User` 排序拍板）
**Slice**: M1 slice **1 / N** —— 關 `AD-UserEntitySpec-1`；不關 M1（M1 的 DoD 需要全部核心實體）
**Scope decisions**: (a) `User` 只建到「讓 FK 有標的 + 能被範疇測試」的最小集合
(b) `Role` / `Permission` **不建** —— 零消費者，是 M4 的工作（同 W03 拒建 DI token 的判斷）
(c) `Policy` 補齊**今天可建的** base fields，`status` 的**轉換強制**留給 M5
(d) 認證**不做** —— `dev-principal` 仍是唯一範疇來源，M4 才換掉

---

## 0. Background

### The gap（`AD-UserEntitySpec-1`）

`02a` §0 自稱 "**Every** entity in the platform" 並明訂 "Nothing is buildable that is not on this list"。
**`User` 不在那份清單上**，也不在 §3 的任何欄位規格裡。

三份文件互相指向，沒有一份定義欄位：

- `02a:92` —— base field `owner_user_id | UUID FK → User`（**引用**，不是定義）
- `02:37` —— 一列概念 `` `User` `Role` `Permission` | Identity & access (see `05`) ``（**指向 `05`**）
- `05` §Identity —— 描述 OIDC 委派與 role-based + entity scope 的授權模型，**沒有欄位**

### Why it matters（缺失的能力）

不是「少一張表」。`02a` §1.1 規定**每個** domain entity 都有 `owner_user_id` / `created_by` /
`updated_by` 三個 FK 指向 `User`，而 §3 另有大量領域專屬的 user FK
（`risk_owner_user_id` · `asset_owner_user_id` · `custodian_user_id` · `assessor_user_id` ·
`reviewer_user_id` · `tester_user_id` · `assignee_user_id`）。

**M1 建 32 張表時若 `User` 仍無標的，M4 要回頭替 32 張表加欄位 + migration + 回填。**
成本是超線性的，這正是使用者 2026-08-10 拍板「先建最小 `User`」的理由。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `65ce121`）| Anchor |
|-------|--------------------------------------------|--------|
| 資料模型索引 | `User` 不在 §0 三張索引表的任何一張 | `02a:21-60` |
| 欄位規格 | §3 逐一規格化 20 個實體，**無 `User`** | `02a:142-220` |
| 既有表的缺口 | `Policy` header **自陳** 5 類刻意留空欄位 | `schema.prisma:97-106` |
| 範疇來源 | 唯一來源是寫死的 `dev-principal`，production 拋錯 | `dev-principal.ts:54-104` |
| 全域表先例 | `OrgEntity` **刻意無** `org_entity_id` —— 它*定義*範疇 | `schema.prisma:62-66` |
| 狀態機 | Policy lifecycle **已規格化**（6 態）—— enum 今天可建 | `02a:300-312` |

→ `User` 的**欄位**要從 `05` §Identity 導出（OIDC 委派 → 不存密碼）；
`User` 的**範疇語義**沒有先例 —— `OrgEntity` 的全域性有明確理由（定義範疇），`User` 沒有同樣的理由，
但也不顯然適用約束 8 鐵律 1。**這是本 phase 唯一真正未決的東西**（§3.1 D1）。

### The design（backend-only：1 張新表 + 1 個 migration + `Policy` 補欄位 + 範疇測試）

```
NEW   core-model/user.repository.ts        # 第二個範疇化 client 消費者（證明 W03 的形狀可複製）
NEW   prisma/migrations/<ts>_user_and_base_fields/
        - CREATE TABLE users (+ RLS，形狀取決於 D1)
        - ALTER TABLE policies ADD ref_code, owner_user_id, created_by, updated_by, status
EDIT  prisma/schema.prisma                 # model User + Policy 補欄位 + enum PolicyStatus
NEW   core-model/ref-code.ts               # <TYPE>-<ENTITY_CODE>-<seq> 生成（D3）
EDIT  02a-data-model-spec.md               # §0 索引加列 + §3 加 User 規格（同一個 change —— §0 的規則）
```

**為何不順便建 `Role` / `Permission`**：今天零消費者。W03 已經在 `AD-ScopedClientDI-1`
量到同一個教訓 —— 提議的 DI token 在沒有憑證來源時建出來就是 AP-5，最後**沒有建**。

### Ground truth（recon head-start —— 於 `main` HEAD `65ce121` 讀過的 code）

- `schema.prisma:107-137` — `Policy` 現有 8 欄；`@@index([orgEntityId, retiredAt])` 是範疇優先的形狀
- `schema.prisma:62-66` — `OrgEntity` 無 `org_entity_id` 的**理由已寫在 docstring 裡**
- `policy.repository.ts:69-100` — repository **不持有裸 client**，範疇化實例走方法參數
- `scope-refusal.ts:66-97` — RLS 的 `42501` → 領域錯誤；`ScopeRefusedError` **只攜帶呼叫者送來的 id**
- `policy.int.spec.ts` 案例 2b — **RLS 在 FK 之前評估**，寫入路徑上「不存在」與「不是你的」不可區分
- `multi-tenant-data.md:61` — 合法全域表清單（D1 的判準來源）
- `02a:300-312` — Policy state machine 6 個狀態，**enum 值已規格化**

**Baselines（W03 closeout）**: unit **78** · int **32** · web **10** · lint **0** · type **0** ·
format **0** · build **0** · `run_all` **6/6** · `lint:negative` PASS · coverage **93.69 / 90.21 / 92 / 94.32**
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-user-spec** — 重新 grep `User` 於全 `docs/02-architecture/`，確認**真的沒有**欄位規格
  （本 plan 的整個前提）→ 若找到，**§3.1 D1 撤回、範圍重估**
- **D-devdb** — `isms_dev` 的 `_prisma_migrations` head vs `prisma/migrations/` 最新目錄
  （`AD-DevDbDrift-1`：W03 發現它落後兩天而 int 全綠）→ 影響 Day 2 的手動驗證
- **D-jest-order** — 新增 int suite 前確認 `AD-JestFileOrder-1` 的修法仍在
  （斷言必須順序無關）→ 影響 Day 2 的測試寫法

## 1. Phase Goal

交付一張**完整形狀正確**的業務表（`User`）與一張**補齊到今天可建上限**的既有表（`Policy`），
使後續 32 張表成為複製而非設計。可測量目標：`02a` §0 索引解析得到 `User`；
`Policy` 的 §1.1 base field 缺口從 **6 個降到 1 個**（`is_active`，D2 決定是否存）；
約束 8 的四項範疇測試對 `User` 成立（若 D1 判為 entity-scoped）或有**明確記錄的豁免理由**（若判為全域）。
證明方式：gates + **API-level 驗證**（真進程 + 真 PostgreSQL + 真 RLS）+ **元驗證**（弄壞它看它紅）。
⚪ 無 UI → **不做 drive-through，報告一律標 API-level verified**。
✅ **產出 design note**（spike）；**可能產出 ADR**（僅當 D1 判為需要）。

## 2. User Stories

- **US-1**（spec）: 作為資料模型的維護者，我希望 `User` 有欄位規格並出現在 `02a` §0 索引，
  以便後續 32 張表的 FK 有一個**文件上合法**的標的。
- **US-2**（decision）: 作為架構決策者，我希望 `User` 的範疇語義被**明確拍板並記錄理由**，
  以便它不會變成第 33 張表才被發現的隱性假設。
- **US-3**（schema）: 作為 API 開發者，我希望 `users` 表存在且被範疇機制正確處理，
  以便 `owner_user_id` 可以是真的 FK 而不是註解裡的承諾。
- **US-4**（schema）: 作為資料模型的維護者，我希望 `Policy` 補齊今天可建的 base fields，
  以便「一張表長什麼樣」有一個可複製的**實例**而不只是規格。
- **US-5**（validation）: 作為單人開發者，我希望每個宣稱會擋住某件事的機制都有一個**會被它擋住**的
  常駐案例，以便它靜默失效時 CI 會紅（`AD-NegativeGate-1` 第 7 個實例）。
- **US-6**（closeout）: 作為下一個 session 的自己，我希望 design note 記下量到的形狀，
  以便 slice 2 直接複製而不重新推導。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW       apps/api/src/core-model/user.repository.ts        + .spec.ts
NEW       apps/api/src/core-model/ref-code.ts               + .spec.ts
NEW       apps/api/prisma/migrations/<ts>_user_and_base_fields/migration.sql
EDIT      apps/api/prisma/schema.prisma                     model User · Policy 補欄位 · enum
EDIT      apps/api/src/modules/policy/policy.int.spec.ts    User 的範疇案例
EDIT      apps/api/test/int-global-setup.js                 users seed
EDIT      docs/02-architecture/02a-data-model-spec.md       §0 索引列 + §3 User 規格
UNTOUCHED apps/api/src/entity-scope/**                      W02/W03 的機制不動
UNTOUCHED apps/api/src/modules/policy/dev-principal.ts      認證是 M4，本 phase 不碰
UNTOUCHED apps/web/**                                       無 UI 工作
```

### 3.1 ⛔ 需要拍板的決定（**助手不得自行選**）

> 這一節是本 plan 的核心。四個問題裡 **D1 是架構級**，依 PROCESS R5 可能需要 ADR。
> CLAUDE.md §禁止反模式明訂「在 ADR 未拍板前替使用者選技術 —— **表面化它們，不要默默選**」。

**D1 ⭐ `users` 是 entity-scoped 表，還是像 `OrgEntity` 一樣的合法全域表？**

| | 論據 | 代價 |
|---|---|---|
| **A. 全域**（無 `org_entity_id`）| `05` §Identity 說 **entity scope 掛在 role assignment 上**，不在 user 上；區域 ISO 依定義跨多個 OpCo；`multi-tenant-data.md:61` 已有合法全域表的先例 | 違反約束 8 鐵律 1 的**字面**（「所有業務 table 必有 `entity_id NOT NULL`」）→ **必須明文記錄豁免理由**，否則下次審計會判為違規 |
| **B. Entity-scoped**（`org_entity_id NOT NULL`）| 字面符合約束 8；RLS 免費涵蓋 | **跨實體使用者無法表達** —— 而 13 OpCo 的區域治理正是本平台的旗艦場景（M8）。晚一點才發現的話，`users` 要拆表或加 join table |
| **C. 全域 + `user_entity_scope` join 表** | 兩者兼得：user 全域、scope 顯式且可稽核 | 今天零消費者（M4 才有真憑證）→ **AP-5 風險**，與 W03 拒建 DI token 同一形狀 |

⚠️ **這不是可以「先選一個之後再改」的決定** —— 它決定 `users` 有沒有 `org_entity_id`，
而那是 RLS policy 的錨點。改它 = 改 32 張表的 FK 語義。

**我的建議是 A + 明文豁免**，理由：`05` 已經把 scope 放在 assignment 上，B 會讓旗艦場景表達不出來，
而 C 的 join 表今天沒有消費者。但 **A 需要一份 ADR** 來承載「為什麼這張表可以沒有 `org_entity_id`」——
否則它就是一個沒有記錄的例外，而約束 8 的例外正是最不該靠記憶的東西。

> ✅ **已拍板 2026-08-10（使用者）：A（全域）+ ADR。**
> ⚠️ **Day-0 之後才知道的三件事**（見 progress.md D1 / D2，已入 §8）：
> (a) 舉證位置規則明訂是 **PR 描述**（`multi-tenant-data.md:67` · `:374`），不只是 ADR；
> (b) 必須**更新那張全域表清單本身**（`:57-66`），否則 `users` 對下一個讀者是違規；
> (c) detector 的 allowlist 是**檔案層級**，`user.repository.ts` 的查詢路徑要一併決定。
> ADR 編號 **0012**（Day-0 驗證：`0002/0003/0008/0009` 是有主題的預留，不可填）。

**D2 `is_active`（§1.1 列為 "Derived convenience flag"）—— 存欄位還是算出來？**
存 = 有可能與 `retired_at` 不一致的第二個真相；算 = 每個查詢都要記得。建議**不存**，用 `retired_at IS NULL`。

**D3 `ref_code` 的序號從哪來？** `<TYPE>-<ENTITY_CODE>-<seq>`（`02a:103`）。
候選：PostgreSQL sequence per (type, entity) / counter 表 / 應用層。⚠️ **並發安全是硬要求**，
且 `ref_code` 一旦發出就穩定（`02a:104`）。建議 Day 1 先量測，不先選。

**D4 `Policy.status` 現在建 enum 嗎？** §4 的 6 個狀態**已規格化**，enum 今天可建；
要等 M5 的是**轉換的 guard / SLA / escalation**。建議**建 enum + 欄位，不建轉換強制**，
並在 docstring 明寫「轉換今天沒有被任何東西擋住」——否則它會被誤讀成 workflow 已存在（AP-3）。

### 3.2 `User` 欄位（US-1）— 來源必須是 `05`，**不得發明**

`05` §Identity 給出的硬約束：認證委派 OIDC IdP、**平台不存密碼**、授權是 role-based + entity scope。
由此可導出的最小集合（**待 D1 定案後才是最終形狀**）：

- `id` UUID · `oidc_subject`（IdP 的 subject claim，unique）· `email` · `display_name`
- base fields 中適用的：`version` · `created_at` / `updated_at` · `retired_at`
- ⛔ **不含**：密碼欄位（`05` 明訂不存）· `role`（M4）· `last_login`（無消費者）

### 3.3 `Policy` 補齊（US-4）— `schema.prisma:97-106` 自陳清單逐項處置

| 欄位 | 本 phase | 理由 |
|---|---|---|
| `ref_code` | ✅ 建 | D3 定案後 |
| `owner_user_id` | ✅ 建 | `User` 存在了 |
| `created_by` / `updated_by` | ✅ 建 | 同上 |
| `status` | ✅ 建 enum + 欄位 | D4 —— 轉換強制留 M5 |
| `is_active` | ⛔ 看 D2 | |
| `category` · `effective_date` · `review_due` · `body_ref` · `requires_attestation` | ❌ 不建 | **M6 的 Policy 模組**，不是 base field |

### 3.x 明確不做的事

- **`Role` / `Permission`** — M4。今天建 = 零消費者的 AP-5
- **認證 / OIDC 接線** — M4。`dev-principal` 仍是唯一範疇來源
- **其餘 32 張 Wave 1 表** — 後續 slice。本 phase 的產出是**形狀**不是**數量**
- **`status` 的轉換強制** — M5 workflow engine
- **JSONB GIN 索引** — W03 已記錄解封條件是「M1 有真實查詢需求」，本 phase 仍無

### 3.y Validation（US-1..US-6）

Gates: lint **0** · type-check **0** · format **0** · unit **≥ 78**（新增只增不減）·
int **≥ 32** · web **10** · build **0** · `run_all` **6/6** · `lint:negative` PASS ·
coverage 不低於 baseline。
**API-level 驗證**（真進程 + 真 PostgreSQL + 真 RLS）取代 drive-through —— 無 UI，**明確標示**。
**元驗證**（US-5）：把新機制中性化一次，確認對應測試轉紅再還原。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_user_and_base_fields/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/user.repository.ts` | NEW |
| 4 | `apps/api/src/core-model/user.repository.spec.ts` | NEW |
| 5 | `apps/api/src/core-model/ref-code.ts` | NEW |
| 6 | `apps/api/src/core-model/ref-code.spec.ts` | NEW |
| 7 | `apps/api/src/modules/policy/policy.int.spec.ts` | EDIT |
| 8 | `apps/api/test/int-global-setup.js` | EDIT |
| 9 | `docs/02-architecture/02a-data-model-spec.md` | EDIT |
| 10 | `docs/02-architecture/design-notes/W04-*.md` | NEW（spike gate）|
| 11 | `docs/03-implementation/changes/CH-019-w04-*.md` | NEW |
| 12 | `docs/14-adr/00NN-user-scope-semantics.md` | NEW **僅當 D1 判為需要** |
| — | `apps/api/src/entity-scope/**` | **UNTOUCHED** |
| — | `apps/api/src/modules/policy/dev-principal.ts` | **UNTOUCHED** |
| — | `apps/web/**` | **UNTOUCHED** |

## 5. Acceptance Criteria

1. `02a` §0 的索引解析得到 `User`，且 §3 有它的欄位規格 —— **同一個 change 內**（`02a:19` 的規則）
2. **D1 已拍板並記錄理由**；若判為全域表，約束 8 的豁免**明文寫在 migration 與 schema docstring 裡**
3. `users` 表存在；`Policy` 的 base field 缺口從 6 降到 ≤ 1
4. 約束 8 四項範疇測試對 `User` 成立，或**有記錄的豁免**（依 D1）
5. `ref_code` 生成在**並發下**正確（不是「看起來對」——要有一個會抓到重號的測試）
6. **元驗證 PASS**：新機制中性化 → 對應測試紅 → 還原 → 綠（`AD-NegativeGate-1` 第 7 個）
7. Gates 全綠（§3.y 逐項），**逐項寫實際輸出，不寫「都過了」**
8. ⚪ **無 drive-through** —— 報告標 **API-level verified**，不暗示可用性
9. `AD-UserEntitySpec-1` CLOSED；calibration 已記錄；導航檔 + BACKLOG 已更新

## 6. Deliverables

- [ ] US-1 `User` 欄位規格進 `02a` §3 + §0 索引列
- [ ] US-2 D1 拍板 + 理由記錄（ADR 或 design note，依判斷）
- [ ] US-3 `users` 表 + migration + 範疇處置
- [ ] US-4 `Policy` base fields 補齊 + `ref-code.ts`
- [ ] US-5 元驗證 + 常駐負面案例
- [ ] US-6 design note + CH-019 + closeout

## 7. Workload Calibration

- Scope class **`spike` 0.65**（Read `docs/01-planning/CALIBRATION-MATRIX.md` —— 該 class 現有
  **2 個資料點且被標「不可比」**，因 `AD-CalibrationMetric-1` 量到 W02 的 `actual` 混裝兩種量。
  本 phase 是**第 3 個資料點**，且是**第一個以一致定義登記的**：
  `actual` = branch base commit → closeout commit 的**牆鐘跨度**，`git log` 機械導出）。
  歸為 spike 而非 greenfield-feature 的理由：`User` 的範疇語義**沒有先例**，D1 只能量測與論證，不能查表。
- **Agent-delegated: no**（設計決定佔比高，委派的複驗成本大於節省）。`agent_factor` **1.0** → 三段式。
- Bottom-up est **~9 hr**（Day-0 verify 0.5 · D1 量測與論證 2.5 · schema + migration 2.0 ·
  ref_code 併發 1.0 · 測試與元驗證 1.5 · closeout 1.5）→
  **class-calibrated commit ~5.9 hr (mult 0.65)**。Day-4 retro Q2 驗證。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ⭐ **D1 選錯，32 張表的 FK 語義要重來** | ✅ 使用者已拍板 **A（全域）+ ADR**（2026-08-10）。Day 1 仍要**先論證再寫 code** —— 拍板的是方向，理由要能被寫成可證偽的 ADR |
| **【Day-0 D1】全域表的舉證位置與清單本身** | `multi-tenant-data.md:67` / `:374` 明訂新增全域表**必須在 PR 描述中舉證** —— 不只是 ADR。故本 phase 需**三個動作**：ADR-**0012** · **PR 描述舉證** · **更新 `multi-tenant-data.md:57-66` 的清單**（否則下次讀清單的人會判 `users` 為違規）|
| **【Day-0 D2】detector 的 allowlist 是檔案層級不是表層級** | `assert-no-scope-bypass.mjs:76-85` 沒有全域表的概念。`users` 無 RLS 時，`user.repository.ts` 要嘛進 `ALLOW`（docstring `:21-22`：每加一筆就是保證不成立的又一個地方），要嘛用範疇化 client 查無 RLS 的表。⛔ **Day 1 與 D1 一起決定**，不要留到 Day 2 撞上 |
| `ref_code` 併發重號 | 用資料庫層保證（sequence / unique constraint），**不用應用層檢查**。⚠️ 依 `AD-GrepAssertion-1`，要有一個**會抓到重號**的測試而非只看「跑起來沒事」 |
| **Risk Class C** — 陳舊 dev server 掩蓋 wiring 修正 | Day 3 clean restart 前殺乾淨；驗證「活著的服務程序」不是「port 擁有者 PID」 |
| **`AD-DevDbDrift-1`** — `isms_dev` 落後而 int 全綠 | Day-0 `D-devdb` 明確比對 migration head（W03 是 Day 3 才發現） |
| **`AD-JestFileOrder-1`** — 新 int suite 的順序相依 | 斷言寫成**順序無關的性質**，不是精確列表 |
| **Risk Class A** — 測試間的 singleton / fixture 汙染 | 新 seed 進 `int-global-setup.js`；`users` 的 fixture 要能被重建 |
| `02a` 是設計文件，改它需要權威性 | §0 自己的規則（`02a:19`）**要求**同一個 change 加索引列 —— 這是被授權的，不是擅改 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **其餘 32 張 Wave 1 表** — M1 slice 2..N
- **`Role` / `Permission` / OIDC 接線** — M4
- **`status` 的轉換強制（guard / SLA / escalation）** — M5
- **Policy 模組欄位**（`category` / `effective_date` / `review_due` / `body_ref` / `requires_attestation`）— M6
- **任何 UI** — `apps/web` 完全不動；W01–W04 的**零 UI drive-through 記錄不變**
- **稽核軌跡** — M3。⚠️ 本 phase 新增的寫入路徑**同樣沒有稽核**，`RISK_REGISTER` R4 的敞口擴大一格
