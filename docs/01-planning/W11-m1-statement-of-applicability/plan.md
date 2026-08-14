---
status: closed   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W11 Plan — Statement of Applicability (M1 slice 8)

**Summary**: 建 `StatementOfApplicability` —— ISO 27001 的**強制產出**，`02a` §0 索引上 Wave 1 的一列，
19 / 35 實體裡還沒有它。一張表 + 2 個端點，**19 → 20**。
關鍵範圍決策：`framework_id` **不建 FK**（`Framework` 不在索引上，且 W06 已為 `Control` 做過同一裁決）。
無 user-facing surface → **gate-only verified，不做 drive-through**。
feature continuation（複用 W06-W10 的 pattern）→ **不產出 design note**。

**Status**: Closed（2026-08-14 —— 五個 US 全數交付；核可紀錄：laitim2001 於 2026-08-14
核可執行，`framework` 表示法同日裁決為選項 B，D2 / D4 依 plan 所提建議執行）

**Branch**: `feature/W11-soa`
**Base**: `main` HEAD `f171049`（CH-027 完全收尾 —— PR #54 + #55 皆 MERGED，`run_all` 8/8）
<!-- 起草時記的是 5a676f9；#55 merge 後 rebase，base 前進一格。 -->
**Baseline 引用的 SHA**: `7c8d46f`（CH-027 的 detector 落地；`a75e02e` / `17ad2d5` 是 rebase 前的死值）
**Slice**: M1 slice **8 / N**（`07:32` 的 Wave-1 資料基礎；其餘 15 張表是 slice 9..N）
**Scope decisions**: (a) `framework` 存**字串**不是 FK (b) 唯一鍵**從第一版就含 `org_entity_id`**
(c) 2 個端點（list + create），無 GET-by-id (d) `implementation_status` 的 enum 值**自宣告並記在 schema**

---

## 0. Background

### The gap（M1 slice 8 —— 索引上的一列，沒有實作）

- `02a:32` 把 `StatementOfApplicability` 列為 **Wave 1**，備註寫死一句 **"Mandatory ISO 27001 output"**。
- 今天有 `Control`（W06，控制清單），但**沒有任何地方記錄「這條控制適不適用、為什麼」**。
- SoA 是 27001 認證審查的必備文件之一，也是 `02a` §0 索引裡少數被標成「強制」的實體。

### Why it matters（缺失的能力）

稽核員問的是「**你選了哪些控制、哪些判為不適用、理由是什麼、誰核准的**」。
今天平台答得出前半（`controls` 有列），答不出後半 —— 適用性判斷、理由、核准人**沒有落點**。
`02a:215` 明說 SoA 是「derived from which controls were selected during risk treatment」，
而那個推導的**結果**目前沒有地方存。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `5a676f9`）| Anchor |
|-------|--------------------------------------------|--------|
| 實體索引 | SoA 在 Wave 1 且標「Mandatory」，未建 | `02a:32` |
| 欄位規格 | 9 個欄位，**第一個是 `framework_id`** | `02a:215` |
| `Framework` 實體 | ⛔ **不在 §0 索引上任何一節**，而 §0 規定「不在這張清單上的一律不可建」 | `02a:16-19` |
| 同一問題的前例 | `Control.frameworkRefs` 是 `String[]`，docstring 明寫「指向不存在的表的 FK **不具備正確的可能性**」 | `schema.prisma:942-946` |
| 唯一鍵風險 | W10 量到：唯一索引**不受 RLS 管且早於複合 FK**，呼叫端可選值的唯一 tuple 就是 existence oracle | `AD-UniqueKeyOracle-1` |
| ref_code 前綴 | 無登記表；`RefCodeInput.prefix` 由**各 repository 自宣告**（W04 D3 ruling） | `ref-code.ts:69-71` |

→ 表可以建，但**不能照字面建**：`framework_id` 沒有可指的表，而唯一鍵若照直覺設計會複製 W10 剛關掉的漏洞。

### The design（一張表 + 1 個 migration + 1 個 repository + 2 個端點）

```
NEW  prisma/schema.prisma            model StatementOfApplicability (+ enum SoaImplementationStatus)
NEW  migrations/<ts>_soa/            CREATE TABLE + GRANT + 3 policies + unique key WITH org_entity_id
NEW  core-model/soa.repository.ts    list / create（asset.repository.ts 的形狀）
NEW  modules/soa/                    controller + module（control 模組的形狀）
```

**四個規格層面的決定，逐一記錄理由：**

**D1 — `framework_id` 存字串，不建 FK**（使用者 2026-08-14 裁決，選項 B）

`Framework` 不在 §0 索引上，而索引的第一句就是「Nothing is buildable that is not on this list」。
三個選項與代價：

| | 選項 | 為什麼不 / 為什麼是 |
|---|---|---|
| A | 一併建 `Framework`（+ `FrameworkControl`）| 要先改 §0 索引；slice 8 從 1 張表變 2-3 張表 + 一次 `Control` 資料遷移 |
| **B** | **與 `Control` 相同的字串表示法** ✅ | W06 對**完全相同**的問題已裁決過，且 `schema.prisma:944-946` 已預告「它們到來時這個欄位變成 migration 的**輸入**，不是旁邊多一個真相來源」 |
| C | 不帶 framework | ⛔ 否決 —— SoA 的定義就是「對某個框架的適用性聲明」 |

⇒ 欄位名 **`framework`**（不是 `framework_id`）—— 名字不該宣稱一個不存在的外鍵。
記為 recorded deviation 寫回 `02a:215`，形式沿用 `:225` / `:219` / `:260`。

**D2 — `control_id` 不建，因為規格沒給**（表面化，不自行發明）

`02a:215` 說 SoA 「derived from which controls were selected」，但欄位清單裡**沒有** `control_id`。
這與 `AD-IssueBareEnum-1` 同形：**規格只給了半條邊**。
已確認參數 #9 禁止自行發明欄位 ⇒ 照規格建，缺口記成 AD 並在 schema docstring 寫明。
今天的替代是靠 `clause_ref` 字串對應 `Control.frameworkRefs` 的字串 —— **那不是可查詢的關聯**，要說清楚。

**D3 — 唯一鍵從第一版就含 `org_entity_id`**（直接套用 W10 的量測結果，不重蹈）

SoA 的自然唯一鍵是 `(framework, clause_ref)` per entity，而**兩半都來自 request body**。
這正是 `AD-UniqueKeyOracle-1` 的判準：**呼叫端可以自己選值的唯一 tuple 就是一個 existence oracle**
（唯一索引不受 RLS 管、又早於複合 FK 觸發）。
⇒ `@@unique([orgEntityId, framework, clauseRef])`，且**本 phase 要主動量測它**（見 §3.y N3），
不是宣稱它安全。

**D4 — `implementation_status` 的 enum 值是自宣告的**

`02a:215` 給了欄位名，**沒有給值**。不給值就建不出 enum，所以必須選 —— 但要標明是選的。
提議 `implemented / partially_implemented / not_implemented / planned`，
⚠️ **刻意不含 `not_applicable`** —— `applicable` 已經是獨立的 bool，兩處表達同一事實沒有調解規則
（`02a:225` 為 `ControlTest.result` 拒絕過的同一形狀）。
落點沿用 W04 D3 ruling：**記在 schema docstring**，不建一個沒人要求的登記表。

### Ground truth（recon head-start —— 於 `main` HEAD `5a676f9` 讀過的 code）

- `schema.prisma:919-968` — `Control` 的完整形狀（本 phase 的欄位藍本：`refCode` / `orgEntityId` /
  `version` / `extensions` / `createdBy` / `updatedBy` / 三個時間戳 / `retiredAt`）
- `schema.prisma:942-946` — D1 所引的 docstring
- `ref-code.ts:69-75` — `prefix` 由呼叫端宣告，`formatRefCode(prefix, entityCode, seq)`
- `modules/control/` — 模組四檔的形狀（`controller` · `controller.spec` · `int.spec` · `module`）
- `core-model/asset.repository.ts` · `control.repository.ts` — 單表 repository 的形狀

**Baselines（W10 closeout + CH-027）**: api unit **351 / 33 suites** · api int **160 / 12** · web **10 / 1** ·
coverage **92.01 / 90.81 / 97.4 / 93.44** · `run_all` **8/8** · `check_entity_index` **19 / 35** ·
lint 0 · type 0 · build clean ×2。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-index** — grep `02a` §0 確認 SoA 那一列未被改動、`Framework` 仍不在任何一節 → 影響 D1
- **D-refcode** — grep 既有 repository 的 `prefix:` 實際值，確認無 `SOA` 衝突 → 影響 §3.3
- **D-policy** — 讀最近一個 migration 的 policy 形狀，確認 3 條 per-command 的當前寫法 → 影響 §3.2
- **D-unique** — 確認 W10 修補後的唯一鍵寫法（`@@unique` 欄位順序）→ 影響 D3

## 1. Phase Goal

建出 `StatementOfApplicability` 一張表與其 list / create 兩個端點，使 **`check_entity_index` 由
19 / 35 走到 20 / 35**，且實體範疇隔離在**資料庫層**成立（3 條 per-command policy + 唯一鍵含
`org_entity_id`）。證明方式：gates 全綠 + **中性化元驗證**（每個防護拿掉後有指定的測試轉紅，
預期方向寫在執行之前）。**無 user-facing surface ⇒ 報告一律 gate-only verified。**
非 spike（複用既有 pattern）⇒ **不產出 design note**；無架構級決定 ⇒ **不需要 ADR**。

## 2. User Stories

- **US-1**（schema）: 作為區域 ISO，我希望每條框架條款有一列適用性判斷，以便回答稽核員「你選了什麼、憑什麼」。
- **US-2**（isolation）: 作為平台維運者，我希望 SoA 的範疇隔離在 DB 層成立，以便它不依賴應用層記得過濾。
- **US-3**（API）: 作為第一線填表人，我希望能列出與新增 SoA 條目，以便 SoA 是活資料而不是離線 Excel。
- **US-4**（meta-verification）: 作為未來的維護者，我希望知道**關掉每個防護會壞哪個測試**，以便綠燈是有內容的。
- **US-5**（closeout）: 作為下一個 session，我希望 phase 紀錄、BACKLOG、ROADMAP、導航檔都是最新的。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW    apps/api/prisma/migrations/<ts>_soa/migration.sql   CREATE TABLE + GRANT + 3 policies
EDIT   apps/api/prisma/schema.prisma                       model + enum
NEW    apps/api/src/core-model/soa.repository.ts           list / create
NEW    apps/api/src/core-model/soa.repository.spec.ts      unit
EDIT   apps/api/src/core-model/scoped-client.types.ts      +1 介面
NEW    apps/api/src/modules/soa/soa.controller.ts          2 端點
NEW    apps/api/src/modules/soa/soa.controller.spec.ts     unit
NEW    apps/api/src/modules/soa/soa.int.spec.ts            整合 + 範疇測試 + oracle 量測
NEW    apps/api/src/modules/soa/soa.module.ts              DI
EDIT   apps/api/src/bootstrap/app.module.ts                +1 module
EDIT   docs/02-architecture/02a-data-model-spec.md          D1/D2/D4 的 recorded deviation
UNTOUCHED  apps/api/src/core-model/ref-code.ts             prefix 自宣告，不改機制
UNTOUCHED  apps/web/**                                      無 UI
```

### 3.1 Schema（US-1）— `schema.prisma`

- 欄位照 `02a:215`：`framework`（**D1：String 非 FK**）· `clauseRef` · `applicable`（Boolean）·
  `justification`（String?）· `implementationStatus`（**D4：自宣告 enum**）· `orgEntityId` ·
  `version` · `approvedBy` · `approvedAt`
- `approvedBy` 是 **`String?` 不是 FK** —— 沿用 W10 `prepared_by` / `approved_by` 的先例
  （呼叫端提供的名字，不是 `User` 參照；規格沒說它是 user id）
- §1.1 base fields 照 `Control`：`id` · `refCode` · `createdBy` / `updatedBy` · `extensions` ·
  `createdAt` / `updatedAt` / `retiredAt`
- ⚠️ **`version` 只有一個** —— `02a:215` 列的 `version` 與 §1.1 的樂觀鎖計數器合併成同一欄，
  沿用 `Policy`（`schema.prisma:256`）的先例，**不是**兩個欄位

### 3.2 Migration + RLS（US-2）— `migrations/<ts>_soa/`

- `CREATE TABLE` + 複合 FK 到 `org_entities`
- **3 條 per-command policy**（SELECT / INSERT / UPDATE），沿用 ADR-0014 的形狀
- ⛔ **無 `FOR DELETE`** —— 與既有表一致（軟刪除走 `retired_at`）
- **`@@unique([orgEntityId, framework, clauseRef])`** —— D3
- GRANT 明列，不用預設

### 3.3 Repository（US-1/US-3）— `core-model/soa.repository.ts`

- `list` / `create`，形狀抄 `asset.repository.ts`
- `ref_code` 前綴 **`SOA`**，自宣告並在 docstring 記錄它是自宣告（W04 D3 ruling）
- 唯一鍵衝突 → `DuplicateKeyError`（W10 已建的 23505 路徑，本 phase 是它的第二個消費者）

### 3.4 Module（US-3）— `modules/soa/`

- **2 個端點**：`GET /soa`（list）· `POST /soa`（create）
- ⛔ **無 GET-by-id** —— 既有模組都沒有先例，本 phase 不開新形狀

### 3.x 明確不做的事

| 不做 | 去向 |
|---|---|
| `Framework` / `FrameworkControl` 表 | 不在 §0 索引；要建必須先改索引（另開 slice + 一次 `Control` 遷移）|
| `control_id` 關聯 | D2 —— 規格沒給，記 AD |
| SoA 由風險處理**自動產生** | `02a:215` 說它 derived from control selection，但推導規則無人拍板 —— 同 W10「快照表但不能產生快照」，儲存保證先成立 |
| SoA 的核准工作流（誰能填 `approved_by`）| M5 workflow；今天是自由文字 |
| UI | 無 —— 本 phase gate-only |

### 3.y Validation（US-1..US-4）

Gates: lint 0 · type 0 · build clean ×2 · api unit / int 全綠 · coverage 不低於 baseline ·
`run_all` **8/8** · `check_entity_index` **20 / 35** · `lint:negative` PASS。

**中性化（US-4，預期方向必須寫在執行之前並先 commit）**：

| N | 拿掉什麼 | 用途 |
|---|---|---|
| N1 | SELECT policy | 跨實體讀是否真的被 DB 擋 |
| N2 | INSERT `WITH CHECK` | ⚠️ 依 `AD-BorrowedRefusal-1`（已 5 次）**預期它可能零轉紅** —— 若是，補一個繞開 ref_code 發號且**不產生 `RETURNING`** 的 raw INSERT 測試（`AD-ReturningMasksCheck-1`）|
| N3 | 唯一鍵中的 `org_entity_id` | **D3 的實測**：撞別實體的 `(framework, clause_ref)` 是否回不同的 SQLSTATE（W10 量到 23505 vs 23503）|
| N4 | 複合 FK | 跨實體的 `org_entity_id` 是否被拒 |

⛔ **無 drive-through** —— 無 UI。報告一律寫 gate-only verified。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_soa/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/soa.repository.ts` | NEW |
| 4 | `apps/api/src/core-model/soa.repository.spec.ts` | NEW |
| 5 | `apps/api/src/core-model/scoped-client.types.ts` | EDIT |
| 6 | `apps/api/src/modules/soa/soa.controller.ts` | NEW |
| 7 | `apps/api/src/modules/soa/soa.controller.spec.ts` | NEW |
| 8 | `apps/api/src/modules/soa/soa.int.spec.ts` | NEW |
| 9 | `apps/api/src/modules/soa/soa.module.ts` | NEW |
| 10 | `apps/api/src/bootstrap/app.module.ts` | EDIT |
| 11 | `docs/02-architecture/02a-data-model-spec.md` | EDIT（D1 / D2 / D4 的 deviation 註記）|
| 12 | `docs/03-implementation/changes/CH-028-w11-soa.md` | NEW（closeout 單檔記錄）|
| — | `apps/api/src/core-model/ref-code.ts` | **UNTOUCHED** —— prefix 自宣告，機制不動 |
| — | `apps/api/src/core-model/scope-refusal.ts` | **UNTOUCHED** —— 23505 路徑 W10 已建 |
| — | `apps/web/**` | **UNTOUCHED** —— 無 UI |

## 5. Acceptance Criteria

1. `check_entity_index` 回報 **20 / 35**（機械導出，不是手寫）
2. 3 條 per-command policy 存在，且 **N1 拿掉 SELECT policy 後有指定測試轉紅**
3. **D3 實測完成**：N3 拿掉唯一鍵中的 `org_entity_id` 後，跨實體撞鍵與不撞鍵回**不同**的 SQLSTATE；
   修補後兩者收斂
4. 4 個範疇測試（跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 / 唯一鍵不洩漏存在性）
5. `02a:215` 有 D1 / D2 / D4 的 recorded deviation 註記，形式沿用 `:219` / `:225` / `:260`
6. ⚪ **Drive-through 不適用**（純後端，無人透過 UI 驅動）—— 報告寫 **gate-only verified**
7. Gates 全綠（§3.y），coverage 不低於 baseline
8. `AD-UniqueKeyOracle-1` 取得**第二個資料點**；calibration 已回填；BACKLOG / ROADMAP / 導航檔已更新

## 6. Deliverables

- [ ] US-1 `StatementOfApplicability` model + enum + migration，欄位對齊 `02a:215` 且四個 deviation 有記錄
- [ ] US-2 3 條 per-command policy + 複合 FK + 唯一鍵含 `org_entity_id`
- [ ] US-3 `GET /soa` · `POST /soa` 兩個端點 + repository
- [ ] US-4 四個中性化，預期方向先 commit，結果逐項對照
- [ ] US-5 CH-028 + BACKLOG + ROADMAP + 導航檔 + calibration 回填

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（`CALIBRATION-MATRIX.md:54` / `:64` —— 「複製既有
  pattern 到新地方」。本 phase 是 W06-W10 的第 5 個資料點）。
  ⚠️ **依 `AD-CalibrationDay0InOrOut-1` 明確宣告量法**：本 phase 用**含 Day 0** 的窗口
  （branch 第一個 commit → closeout commit）。該欄現有 4 點跨 0.23~0.84 的分散
  **已查明是兩種量法混在同一欄**（0.23/0.24 不含 Day 0、0.50/0.84 含），
  ⛔ 定義統一前不得調乘數，但**每個新資料點必須自報量法**，否則污染會繼續累積。
- **Agent-delegated: no**（< 20% —— 本 phase 自己直接做）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est ~3.0 hr（Day 0 recon 0.5 · schema + migration 1.0 · repository 0.5 ·
  module + 端點 0.5 · 中性化 0.5）→ **calibrated commit ~1.5 hr（mult 0.50）**。Day-4 retro Q2 驗證。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **`AD-BorrowedRefusal-1` 第 6 次** —— INSERT policy 的中性化零轉紅（前 5 次有 2 次事先預測到）| §3.y N2 **已預先寫入預期**；若零轉紅，補 raw INSERT 且**不得產生 `RETURNING`**（`AD-ReturningMasksCheck-1` 在 W10 又被踩過一次）|
| **唯一鍵 oracle 復發** —— `(framework, clause_ref)` 兩半都來自 request body | D3 從第一版就把 `org_entity_id` 進鍵，且 N3 **實地量測**而非宣稱 |
| **`framework` 字串未來要遷移** | `schema.prisma:944-946` 已預告遷移方向；本 phase 的 docstring 沿用同一句，讓兩處說同一件事 |
| **`implementation_status` 的 enum 值被當成規格** | D4 在 schema docstring 明寫「自宣告」，並說明為何不含 `not_applicable` |
| **Day-0 D2：§3.3 的藍本寫錯** —— `asset.repository.ts` 是**雙表**（`AGRP` + `AST`），SoA 是單表 | 改抄 `control.repository.ts` / `issue.repository.ts`。⚠️ **§3.3 原文保留不改** —— 依 `day0-plan-verify.md` §記錄 drift findings，默默改 §Technical Spec 等於銷毀「計畫 vs 現實」的軌跡 |
| **Day-0 D8：我在 Day 0 內用不完整的 pattern 下結論兩次** | 本 phase 每一次「grep 得到 N 個」都必須有**第二條獨立路徑**交叉檢查（D3/D8 正是靠 14 vs 15 對不上才被抓到）。⛔ 這是同一週第 3 次（CH-027 E3 · E8 · 本次）→ closeout 記 AD |
| Risk Class C（陳舊 dev server 掩蓋 wiring 修正）| 本 phase 無長駐服務驗證需求；int 測試各自建 testing module |
| **R4 敞口再 +1 張表** | 無稽核軌跡（ADR-0003 未拍板）—— 不在本 phase 解決，但 closeout 必須把 17 → 18 記進 RISK_REGISTER |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- `Framework` / `FrameworkControl` 兩張表 — 需要先改 `02a` §0 索引 + 一次 `Control` 遷移 → 另開 slice
- SoA 從風險處理**自動產生** — 推導規則無人拍板 → AD
- SoA 的核准工作流與 SoD — M5 workflow
- SoA 的匯出（稽核員要的是一份文件）— 報表層，Wave 1 不做
- `control_id` 關聯 — D2，規格缺口 → AD
- UI — 無；本 phase gate-only verified
