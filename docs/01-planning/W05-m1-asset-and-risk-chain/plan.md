---
status: closed_partial  # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W05 Plan — M1 slice 2: the asset-based risk chain

**Summary**: 建 M1 的**方法論核心** —— `AssetGroup → Asset → Threat → Vulnerability → Risk`
五張表，把已確認參數 #7（`LKH × MAX(FIN,BOP,LRY,REP,SIS)`）與 #8（資產基礎評估）從規格變成 runtime。
**關鍵範圍決策**：Risk **含**兩組評分與 derived 欄位；**不含** Control / SoA / ControlTest（slice 3）。
⭐ 這是第一個**複製 W04 形狀而非設計形狀**的 phase —— 判準是 design note §2 的七個不變式夠不夠用。
⚪ **無 UI** → drive-through 不適用，一律標 **API-level verified**。
❌ **不需要 design note**（feature continuation，非 spike —— 見 §1）。

**Status**: **closed_partial**（2026-08-11 收尾，MERGED PR #36）—— US-1/2/3/5/6 完成，
**US-4 部分**：約束 8 四項只對 `Risk` 完全成立，`AssetGroup` / `Asset` 兩張表**無端點**故未逐條測
（checklist 2.4 標 🚧 **未刪**，解封：slice 3 的 `POST /assets` 同一個 PR）。
↓ **以下為原始核可紀錄，不覆寫** ↓
**原 Status**: **Approved-to-execute**（使用者核可 2026-08-11。§3.1 的 **D1–D4 全部由使用者拍板同日**；
D1/D2 判為架構級 → **ADR-0013** 於 Day 1 產出。⛔ **D1-A 有一個未解的前置** ——
Prisma 對 generated column 的 drift 行為未測，Day 1 先答，答錯就退 D1-B）

**Branch**: `feature/W05-m1-asset-risk-chain` —— **MERGED** PR #36（rebase，head `700f5d6`，2026-08-11 14:56 +0800）
**Base**: `main` HEAD `a2b1906`（W04 closeout + #34/#35 merged）

> **`closed_partial` 而不是 `closed`，理由是 §5 的一條驗收標準未達成**：
> AC-4「約束 8 四項對 `AssetGroup` / `Asset` / `Risk` 成立」只對 `Risk` 完全成立。
> 兩張表**沒有端點**，四項裡的「跨實體寫拒」需要一個會寫它們的呼叫者，
> 而硬造測試專用寫入路徑是約束 2 禁止的。**解封：slice 3 建 `POST /assets` 時同一個 PR 補齊。**
> ⚠️ 這與 W04 砍掉 `user.repository.ts` 不同 —— 那是 Day 1 核可的範圍縮減（plan §4 標 DROPPED），
> 這是**一條驗收標準沒被滿足**。前者用 `closed`，後者用 `closed_partial`。
**Slice**: M1 slice **2 / N** —— 建 5 個實體（累計 7 / 35）；**不關 M1**（DoD 需全部核心實體）
**Scope decisions**: (a) 五張表一次到位，因為 `Risk` 的三個 FK 缺一不可
(b) **含一個真實端點** `POST/GET /risks` —— 評分邏輯沒有呼叫者就是 AP-3
(c) `Control` / `SoA` / `ControlTest` **不建** —— `Risk.treatment` 今天是欄位不是關聯
(d) 認證仍是 `dev-principal`，M4 才換

---

## 0. Background

### The gap（M1 slice 2；`AD-RiskForm-1` 的前置）

W04 交付了「一張業務表長什麼樣」，但**平台的方法論主軸一張表都沒有**：

- 已確認參數 #8 訂的是**資產基礎評估**（資產群組→資產→威脅→弱點→CIA），五個環節**全部不存在**
- 已確認參數 #7 訂的評分公式 `LKH × MAX(五種 impact)` 只存在於 `02a` 的散文裡，**沒有任何 code**
- `AD-RiskForm-1`（🔴 P0）說設計交付物「實作的是另一套方法論，完全沒有 before/after 結構」
  —— 而今天**本專案自己也沒有**，所以那條 P0 還沒有可對照的標的

### Why it matters（缺失的能力）

`02a:120` 的風險接受準則（≥16 需處理）與 `:196` 的 `in_it_risk_register` 是**公司程序的硬規則**，
不是產品偏好。在它們成為 runtime 之前：

- **M7 的 Risk register 沒有地基**，M8 的滾升儀表板沒有可滾升的數字
- `AD-RiskForm-1` 這條 P0 **無法開始比對** —— 你不能拿設計稿去對一個不存在的模型

⭐ 更直接的理由：**W04 的 design note §2 宣稱那七個不變式可被複製**，
而那個宣稱**至今未被任何東西測試過**。本 phase 是它的第一個負載。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `a2b1906`）| Anchor |
|-------|--------------------------------------------|--------|
| 已建實體 | **5 個 model**：`OrgEntity` · `User` · `RefCodeCounter` · `Policy` · `ExtensionField` | `schema.prisma:71,115,147,185,274` |
| 資產鏈 | `AssetGroup` / `Asset` / `Threat` / `Vulnerability` / `Risk` **零命中** | `schema.prisma` 全檔 |
| 評分公式 | 規格在散文與表格中，**無 code** | `02a:119,136,139-142` |
| 全域表判準 | `threat_library` / `vulnerability_library` **已在合法清單上** | `multi-tenant-data.md:63`（Day-0 更正，plan 原寫 `:61`）|
| 校準機制 | `risk_scales` **在清單上但表不存在，且從未被任何設計文件規格化** | `multi-tenant-data.md:65`（Day-0 更正，plan 原寫 `:62`）|
| 可複製的形狀 | 七個已驗證不變式（發號 · 拒絕點 · 排序 · RLS 判準 …） | `design-notes/W04-user-and-base-fields.md` §2 |
| 端點藍本 | `POST/GET /policies` 三個端點 + 404-not-403 + 422 帶 key | `policy.controller.ts:70-137` |

→ 五張表的**形狀**已有藍本（W04），但**評分**沒有 —— 它是本 phase 唯一真正新的東西，
所以驗證重心在「公式對不對」與「derived 值會不會與來源分歧」，不在「表建得對不對」。

### The design（backend-only：5 個 model + 1 個 migration + 評分函式 + 1 個端點）

```
NEW   core-model/risk-score.ts          # LKH × MAX(五 impact) —— 純函式，可單獨斷言
NEW   core-model/risk.repository.ts     # 第二個範疇化 client 消費者（W04 沒有機會證明這件事）
NEW   modules/risk/                     # controller + module，比照 policy 模組
NEW   prisma/migrations/<ts>_asset_and_risk_chain/
        - AssetGroup · Asset · Risk      (entity-scoped：org_entity_id + RLS + FORCE)
        - Threat · Vulnerability         (全域庫：無 org_entity_id，比照 ExtensionField 的全域半邊)
EDIT  prisma/schema.prisma              # 5 model + 3 enum
EDIT  02a-data-model-spec.md            # §0 索引不用改（五個都已在表上）—— 僅補 D1/D2 的裁決註記
```

**為何一次五張而不是分兩片**：`Risk` 的 `asset_id` / `threat_id` / `vulnerability_id` 三個 FK
（`02a:193`）缺一就建不出 `Risk`，而 `Asset` 又需要 `AssetGroup`。
拆片只會製造一個「有表但沒有標的」的中間狀態 —— 那正是 W04 砍掉 `user.repository.ts` 的理由。

### Ground truth（recon head-start —— 於 `main` HEAD `a2b1906` 讀過的 code）

- `02a:139` — 「**Store all five — the maximum is derived**」→ 五個 impact 存欄位，**max 不存**
- `02a:142` — 各 impact 的門檻與描述子是 **configuration**，不是 code
- `02a:131` — 集團標準量表 + **governed per-entity calibration，只能透過設定**
- `02a:196` — `acceptance_status` 與 `in_it_risk_register` 皆標 **derived**
- `02a:348-349` — 狀態機分岔點就是 `score >= 16`
- `schema.prisma:99-114` — 全域表的豁免理由**寫在 docstring 裡**的既有寫法
- `policy.repository.ts:102-121` — validate → allocate → insert 的排序，含「為何不是一個交易」
- `ref-code.ts:93-128` — 發號；`Risk` 的 `ref_code` prefix 需自宣告（`02a` 未定縮寫）

**Baselines（W04 closeout）**: unit **86** · int **34** · web **10** · lint **0** · type **0** ·
format **0** · build **0** · `run_all` **6/6** · `lint:negative` PASS（18 檔 0 bypass 3 allowlisted）·
coverage **94.11 / 90.42 / 92.45 / 94.76**
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-tablename** — `02a` 稱 `Threat` / `Vulnerability`，`multi-tenant-data.md:61` 稱
  `threat_library` / `vulnerability_library`。**兩處都是權威**（前者資料模型、後者隔離規則）
  → 定名前必須裁決；影響 migration 與 RLS allowlist 的可讀性
- **D-ratingname** — `02a:405` 用 `rating_inherent` / `rating_residual`，`:194-195` 用
  `score_before` / `score_after`。**同一份文件內兩套名字** → 可能是 §7 儀表板欄位 vs §3 實體欄位
  的差異，也可能是漂移。**Grep 全 `docs/` 確認哪一套被別處引用**
- **D-riskscales** — `risk_scales` 在全域表清單上但**表不存在**。確認它是「已規劃未建」
  還是「清單寫了但從未有人打算建」→ 直接決定 D2 的可行選項
- **D-w04shape** — W04 design note §2 的七個不變式**逐條確認仍成立**（本 phase 要複製它們）

## 1. Phase Goal

把已確認參數 #7 與 #8 從規格變成可執行的 runtime：五張表存在且**範疇語義正確**
（三張 entity-scoped + 兩張全域庫），評分公式有**單一實作**且 derived 值**不可能與來源分歧**，
並經一個真實端點端到端驗證。可測量目標：`02a` §0 的 Wave 1 shared core 從 **2/18 降到 7/18 未建**；
約束 8 的四項範疇測試對三張 entity-scoped 表成立；評分函式有**會抓到公式錯誤**的測試。
證明方式：gates + **API-level 驗證**（真進程 + 真 PostgreSQL + 真 RLS）+ **元驗證**。
⚪ 無 UI → **不做 drive-through**，一律標 API-level verified。
❌ **不產出 design note** —— 本 phase 是 **feature continuation**（複製 W04 已驗證的形狀），
不是 spike。若 Day 1 發現形狀**不可複製**，那才是新知識 → 屆時改判並補 design note（記入 §8）。

## 2. User Stories

- **US-1**（schema）: 作為資料模型維護者，我希望資產鏈四張表存在且範疇語義正確，
  以便 `Risk` 的三個 FK 有真實標的而不是註解裡的承諾。
- **US-2**（decision）: 作為架構決策者，我希望 derived 欄位與閾值的落點**被明確拍板並記錄**，
  以便它不會變成第 20 張表才被發現的隱性假設。
- **US-3**（domain）: 作為風險評估者，我希望評分嚴格等於 `LKH × MAX(五 impact)`，
  以便平台算出來的數字**就是公司程序規定的數字**。
- **US-4**（isolation）: 作為合規負責人，我希望三張 entity-scoped 表通過約束 8 四項，
  以便新增實體不會在隔離上開新洞。
- **US-5**（validation）: 作為單人開發者，我希望每個宣稱會擋住某件事的機制都有一個**會被它擋住**的
  常駐案例（`AD-NegativeGate-1` 第 8 個實例）。
- **US-6**（closeout）: 作為下一個 session 的自己，我希望知道 W04 的七個不變式**哪幾個真的可複製**，
  以便 slice 3 不用再問一次。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW       apps/api/src/core-model/risk-score.ts              + .spec.ts
NEW       apps/api/src/core-model/risk.repository.ts         + .spec.ts
NEW       apps/api/src/modules/risk/risk.controller.ts       + .spec.ts
NEW       apps/api/src/modules/risk/risk.module.ts
NEW       apps/api/src/modules/risk/risk.int.spec.ts
NEW       apps/api/prisma/migrations/<ts>_asset_and_risk_chain/migration.sql
EDIT      apps/api/prisma/schema.prisma                      5 model + 3 enum
EDIT      apps/api/src/core-model/scoped-client.types.ts     ScopedRiskClient
EDIT      apps/api/src/bootstrap/app.module.ts               掛 RiskModule
EDIT      apps/api/test/int-global-setup.js                  資產鏈 seed
EDIT      docs/02-architecture/02a-data-model-spec.md        D1/D2 裁決註記
UNTOUCHED apps/api/src/entity-scope/**                       W02/W03 機制不動
UNTOUCHED apps/api/src/modules/policy/**                     既有模組不動
UNTOUCHED apps/web/**                                        無 UI 工作
```

### 3.1 ⛔ 需要拍板的決定（**助手不得自行選**）

> W04 的教訓：**先拍板語義，再決定要建什麼**。D1/D2 合起來可能構成 **ADR-0013**
> ——「評分與校準住在哪裡」會約束**每一個帶分數的實體**（Risk / Assessment / ControlTest / posture）。

> ### ✅ 四項全部拍板 2026-08-11（使用者）—— **下方選項原文保留，不覆寫**
>
> 「當時考慮過什麼」與「選了什麼」是兩件事；只留結論會讓下一個人以為沒有別的選項。
>
> | # | 裁決 | 一句理由 |
> |---|---|---|
> | **D1** | **A —— generated column + all-or-none CHECK** | 呼叫者**物理上寫不了**分數（P3 硬錯誤）；M8 滾升要能 `ORDER BY score`。⚠️ **有條件** —— 見下 |
> | **D2** | **C —— 常數 + ADR-0013 記錄落點** | 參數 #7 約束的是**機制不是時程**；今天建 `risk_scales` 是零消費者 AP-5（W04 同形狀）|
> | **D3** | **A —— `enum(7)`** | 無效狀態**不可能表達**；今天沒有任何查詢需要按單一 CIA 成分過濾（YAGNI）|
> | **D4** | **`threats` / `vulnerabilities`（依 `02a`）** | CLAUDE.md 權威排序：設計文件 > 規則檔。**同時更正 `multi-tenant-data.md:61` 的鏡誤名稱** |
>
> **Day 1 實測（PostgreSQL 18.4 真庫，8 個探測）—— D1 的證據基礎**：
>
> | 探測 | 結果 |
> |---|---|
> | P1 generated column 引用同列欄位 + `GREATEST` | ✅ `4 × GREATEST(2,5,1,3,1)` = 20 |
> | ⭐ **P2 `GREATEST` 忽略 `NULL`** | ⚠️ 只填 2 個 impact **仍算出 20** —— 靜默算錯 |
> | P3 寫入 generated column | ❌ 硬錯誤 `cannot insert a non-DEFAULT value` |
> | P4 寫入 `DEFAULT` 關鍵字 | ⚠️ 接受（非漏洞，但 client 可以這樣送）|
> | P6 `UPDATE` 來源欄位 | ✅ 自動重算 2 → 10 |
> | P7 / P8 索引 / CHECK | ✅ 皆可 |
> | **Q1-Q4 `CHECK (num_nonnulls(...) IN (0,6))`** | ✅ 全填接受 · 全空接受 · **部分填寫拒絕** · **UPDATE 清空亦拒絕** |
>
> ⭐ **P2 是本次量測最有價值的發現**：`02a:348` 的狀態機讓 `*_after` 五欄在生命週期中**本來就會
> 部分填寫**，那正是 P2 咬人的位置。all-or-none CHECK 是 D1-A 成立的**必要條件，不是加分項**。
>
> ⛔ **D1-A 的條件與 fallback（Day 1 必須先答）**：Prisma **無法在 `schema.prisma` 表達
> generated column**，該欄位只能寫在 migration SQL。W02–W04 手寫進 migration 的是 RLS / trigger /
> GRANT —— **那些不是欄位所以 Prisma 從不抱怨**；這次是**欄位**，性質不同。
> **探測**：加欄位 → `prisma migrate dev --create-only` → 看它產不產生 `DROP COLUMN`。
> **產生 → 退 D1-B（應用層算不存），並在 progress.md 記錄退場理由**，不硬套。

**D1 ⭐ derived 欄位（`score_before` / `score_after` / `acceptance_status` / `in_it_risk_register`）存或算？**

| | 論據 | 代價 |
|---|---|---|
| **A. PostgreSQL generated column**（`GENERATED ALWAYS AS ... STORED`）| **資料庫保證不可能分歧** —— 與來源欄位同一次寫入算出；可索引、可排序、滾升查得動 | 公式**寫死在 migration 裡**；改公式要 migration。閾值若要可設定則 A 不適用於 `acceptance_status` |
| **B. 應用層算，不存** | 公式只有一份實作（`risk-score.ts`）；改公式不用 migration | ⚠️ **滾升儀表板要按分數排序／篩選** —— 不存就得把全部列拉回應用層再算，M8 的旗艦查詢會很難看 |
| **C. 存 + trigger 維護** | 兼顧可查與單一實作 | 兩份邏輯（TS + PL/pgSQL）→ **AP-6 風險**，正是 W03 兩層那條的反面（那裡兩層是刻意的，這裡是重複）|

⚠️ **`02a:139` 只說「五個 impact 要存、max 是 derived」，沒說 derived 要不要落地。**
我的建議：**`score_*` 用 A（公式是參數 #7 的硬規則，本來就不該輕易改）**，
而 `acceptance_status` / `in_it_risk_register` **取決於 D2** —— 若閾值可設定，它們就不能是 generated。

**D2 ⭐ 閾值 16 放哪？** 已確認參數 #7 訂「per-entity 校準**只能改設定**」，
`multi-tenant-data.md:62` 已把 `risk_scales` 列為合法全域表。三個選項：

| | 說明 | 代價 |
|---|---|---|
| **A. 常數寫在 code** | 今天最簡單；`02a:120` 的 16 是集團標準 | **與參數 #7 矛盾** —— 校準無處可去 |
| **B. 今天就建 `risk_scales`** | 清單上已經有它；per-entity 校準有落點 | ⚠️ **今天零消費者**（沒有 UI 可改設定）→ 與 W04 砍 `user.repository.ts` 同形狀的 AP-5 |
| **C. 常數 + 明文記錄解封條件** | 誠實：今天沒有校準需求，且**明說**它會在哪裡出現 | 需要一個不會被遺忘的落點（ADR 或 `02a` 註記）|

**D3 `cia_type`（`02a:193` 寫 "C/I/A combination"）—— enum 還是三個 boolean？**
組合有 7 種（C/I/A/CI/CA/IA/CIA）。enum 需要列 7 個值；三個 boolean 可組合但允許「全 false」這個無效狀態。

**D4 `Threat` / `Vulnerability` 的表名** —— `02a` vs `multi-tenant-data.md:61` 不一致（見 D-tablename）。
⛔ **Day 0 裁決，不要拖到 Day 2 寫 migration 時才發現。**

### 3.2 五張表的範疇語義（US-1）— 判準沿用 W04

| 表 | 範疇 | 判準（W04 design note §2.1 的那一句）|
|---|---|---|
| `AssetGroup` · `Asset` | **entity-scoped** | 一個 OpCo 的資產屬於它自己；跨實體寫入是該被拒絕的事 |
| `Risk` | **entity-scoped** | 同上，且 `02a:349` 的 IT Risk Register 是 per-entity 的 |
| `Threat` · `Vulnerability` | **全域庫** | 已在 `multi-tenant-data.md:61` 的合法清單上 —— ⭐ **本 phase 不改規則，只消費它** |

⭐ **與 W04 的差別**：W04 必須**擴充**規則（identity 第三類）；本 phase 是第一個
**直接引用既有清單**的 phase。若這條路徑走得順，那就是 W04 那個分類真的可用的證據。

### 3.3 評分（US-3）— `risk-score.ts`

- 純函式：`score(lkh, {fin,bop,lry,rep,sis}) => lkh * max(...)`，值域 **1–25**
- **不接受部分輸入** —— 五個 impact 缺一個就不是參數 #7 的公式
- 測試必須含**會抓到公式錯誤**的案例：`MAX` 換成 `SUM` / 平均 / 只取 FIN 時**要紅**
  （⚠️ 用「最大值恰好等於總和」的輸入會讓 SUM 與 MAX 同值 —— fixture 要刻意避開）

### 3.x 明確不做的事

- **`Control` / `StatementOfApplicability` / `ControlTest`** —— slice 3。
  `Risk.treatment`（`02a:193`）今天是**欄位**不是關聯，這是刻意的
- **`risk_scales` 表本身** —— **D2 裁決為不建**（今天零消費者 = AP-5）。
  ⭐ 解封條件寫進 **ADR-0013 的可證偽條件**，因為那是本專案唯一被證明會被回頭讀的載體
- **`Issue` / `Action` / `Evidence`** —— 沒有東西會產生 findings（零消費者，W04 的教訓）
- **稽核軌跡** —— M3。⚠️ 本 phase 再新增三條無稽核的寫入路徑，`RISK_REGISTER` R4 敞口再擴大
- **`AD-RiskForm-1` 的設計對照** —— 那是 M7/M8 的工作；今天只是讓它**有標的可對**

### 3.y Validation（US-1..US-6）

Gates: lint **0** · type **0** · format **0** · unit **≥ 86** · int **≥ 34** · web **10** ·
build **0** · `run_all` **6/6** · `lint:negative` PASS · coverage 不低於 baseline。
**API-level 驗證**（真進程 + 真 PostgreSQL + 真 RLS）取代 drive-through —— 無 UI，**明確標示**。
**元驗證**（US-5）：評分函式與三張表的 RLS 各中性化一次，確認對應測試轉紅再還原。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_asset_and_risk_chain/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/risk-score.ts` | NEW |
| 4 | `apps/api/src/core-model/risk-score.spec.ts` | NEW |
| 5 | `apps/api/src/core-model/risk.repository.ts` | NEW |
| 6 | `apps/api/src/core-model/risk.repository.spec.ts` | NEW |
| 7 | `apps/api/src/core-model/scoped-client.types.ts` | EDIT |
| 8 | `apps/api/src/modules/risk/risk.controller.ts` | NEW |
| 9 | `apps/api/src/modules/risk/risk.controller.spec.ts` | NEW |
| 10 | `apps/api/src/modules/risk/risk.module.ts` | NEW |
| 11 | `apps/api/src/modules/risk/risk.int.spec.ts` | NEW |
| 12 | `apps/api/src/bootstrap/app.module.ts` | EDIT |
| 13 | `apps/api/test/int-global-setup.js` | EDIT |
| 14 | `docs/02-architecture/02a-data-model-spec.md` | EDIT |
| 15 | `docs/03-implementation/changes/CH-020-w05-*.md` | NEW |
| 16 | `docs/14-adr/0013-risk-scoring-and-calibration.md` | NEW —— **D1/D2 已判為架構級，確定要寫** |
| — | `apps/api/src/entity-scope/**` | **UNTOUCHED** |
| — | `apps/api/src/modules/policy/**` | **UNTOUCHED** |
| — | `apps/web/**` | **UNTOUCHED** |

## 5. Acceptance Criteria

1. 五張表存在；三張 entity-scoped 有 RLS + `FORCE`，兩張全域庫**在 docstring 明寫引用
   `multi-tenant-data.md:61` 的既有清單**（不是新增例外）
2. **D1–D4 已拍板並記錄理由**；若 D1/D2 判為架構級 → ADR-0013 含**可證偽條件**
3. 評分嚴格等於 `LKH × MAX(FIN,BOP,LRY,REP,SIS)`，值域 1–25，且**公式錯誤會被測試抓到**
4. 約束 8 四項對 `AssetGroup` / `Asset` / `Risk` 成立（跨實體讀拒 / 跨實體寫拒且資料未變 /
   RLS 層獨立成立 / 滾升只看授權子樹）
5. `POST /risks` 端點可用：分數由伺服器算、`ref_code` 由伺服器發、跨實體回 **404 不是 403**
6. **元驗證 PASS**：評分與 RLS 各中性化 → 對應測試紅 → 還原 → 綠（`AD-NegativeGate-1` 第 8 個）
7. Gates 全綠（§3.y 逐項），**逐項寫實際輸出，不寫「都過了」**
8. ⚪ **無 drive-through** —— 報告標 **API-level verified**，不暗示可用性
9. **W04 七個不變式逐條裁決「可複製 / 需調整 / 不適用」**，寫進 retrospective（US-6）
10. calibration 已記錄；導航檔 + BACKLOG + ROADMAP 已更新

## 6. Deliverables

- [ ] US-1 四張資產鏈表 + 範疇處置
- [ ] US-2 D1–D4 拍板 + 理由記錄（ADR-0013 若需要）
- [ ] US-3 `risk-score.ts` + 會抓到公式錯誤的測試
- [ ] US-4 約束 8 四項對三張 entity-scoped 表
- [ ] US-5 元驗證 + 常駐負面案例
- [ ] US-6 CH-020 + retrospective（含七個不變式的可複製性裁決）+ closeout

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（Read `docs/01-planning/CALIBRATION-MATRIX.md`
  —— 該 class **尚無資料點**，用建議起手值 0.50「有藍本可抄」）。
  ⭐ **刻意不歸 `spike`**：本 phase 的形狀來自 W04 的 design note，**不是探索**。
  ⚠️ 若 Day 1 發現形狀不可複製 → 改歸 `spike` 0.65 並記入 retro Q2（**這本身就是 US-6 的答案**）。
- **Agent-delegated: no**（評分是領域規則，委派的複驗成本大於節省）。`agent_factor` **1.0** → 三段式。
- Bottom-up est **~14 hr**（Day-0 verify 0.5 · D1–D4 論證 2.0 · schema + migration 3.0 ·
  risk-score + 測試 2.0 · repository + 端點 3.0 · 範疇測試與元驗證 2.0 · closeout 1.5）→
  **class-calibrated commit ~7.0 hr (mult 0.50)**。Day-4 retro Q2 驗證
  （`actual` = branch base → closeout commit 牆鐘，與 W04 同定義）。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ⭐ **D1/D2 選錯 → 每個帶分數的實體都要重來** | 先拍板再寫 code（W04 的順序教訓）；若判為架構級就寫 ADR-0013 —— 它會約束 Assessment / ControlTest / posture_snapshot |
| ⭐ **本 phase 判為 feature continuation，但可能判錯** | §1 已寫明改判條件與後果（補 design note + 改 calibration class）。**US-6 就是這個判斷的驗收** |
| **derived 欄位與來源分歧**（AP-6 的資料版本） | D1 若選 B/C 必須有一個**製造分歧再看它被抓到**的測試；選 A 則由資料庫保證 |
| **評分測試選到「SUM == MAX」的輸入** | fixture 明確避開；至少一個案例的 MAX 嚴格小於 SUM |
| **`Risk` 的 `ref_code` prefix 未規格化**（W04 已記錄）| 比照 `policy.repository.ts` 自宣告，**不建登記表**（W04 的裁決） |
| ⭐ **【Day-0 `D-ratingband`】旗艦儀表板數的是分帶，不是分數** | `02a:414` · `03:90` · `08:25` 全部按 `rating_residual ∈ {High, Critical}` 聚合，而本 phase 只交付 `score_*`（1–25 整數）。⛔ **仍不建 `rating_*`**：`02a` §3 的 Risk 欄位規格未列它，且 `02a:405`（derived）與 `:429`（owner enters）**互相矛盾**，後者本身是**開放決策 #5「Confirm before M7」**。建了就是替一個未拍板的決定選邊。→ **M8 之前必須有人拍板分帶怎麼來**，記入 BACKLOG |
| **【Day-0 `D-riskscales`】`risk_scales` 從未被任何設計文件規格化** | 全 repo 僅 `multi-tenant-data.md:65` 一處提及。這讓 D2-C 的理由**從「零消費者」升級為「建它就得自行發明欄位」**（違反已確認參數 #9）|
| **Risk Class C** — 陳舊 dev server 掩蓋 wiring | Day 3 clean restart；驗「活著的服務程序」不是「port 擁有者 PID」 |
| **`AD-MigrationChecksum-1`** — `applied=true` ≠ 內容相同 | Day-0 `D-devdb` 除 head 比對外**加 checksum 比對**（W04 的直接教訓）|
| **`AD-DbBuildPathParity-1`** — CI 綠不涵蓋 reset 過的庫 | 本 phase 若動 GRANT，**必須在 reset 過的 `isms_dev` 上驗**，不能只看 CI |
| **Risk Class A** — 測試間 fixture 汙染 | 新 seed 進 `int-global-setup.js`；斷言**順序無關**（`AD-JestFileOrder-1`）|
| **範圍偏大（5 表 + 端點）** | 可縮減點已標明：端點是 (b)，砍掉它 phase 仍有意義，但評分就只有單元測試證明 |
| ⭐ **【Day-1 D5 —— §3.3 的記錄型偏離】`risk-score.ts` 不含算術** | §3.3 字面規劃「純函式 `score(lkh,{...}) => lkh * max(...)`」。D1-A 拍板後算術的權威在 generated column，Day-1 實測**主流量沒有任何一處需要在 TS 算這個乘積**（寫入 DB 算、讀取 DB 回、排序篩選皆 SQL）→ TS 再算一次 = AP-6（兩份實作）+ AP-1（無主流量呼叫者）。**使用者 2026-08-11 拍板改為 D5-B**：該檔只放驗證 + 閾值常數 + 公式正規化文字。⚠️ **US-3 實質未縮減** —— 「會抓到公式錯誤的測試」轉由 Day 2 整合測試承擔，打在公式真正住的地方；checklist 1.3 該項標 🚧 + 解封條件，**未刪除** |
| ⭐ **【Day-1 T3/T4】`IMMUTABLE` 函式版的 generated column 會靜默分裂資料** | plan 未列此選項；量測時發現它把公式從 8 處塌縮成 1 處而**看起來更好**。⛔ `CREATE OR REPLACE FUNCTION` 在有相依 generated column 時**成功且不重算**：同一組輸入舊列讀 20、新列讀 16。→ **採 inline expression**（改它要 `ALTER COLUMN ... SET EXPRESSION`，會重寫全表）。可讀性代價用機械手段補：整合測試對每欄 `pg_get_expr` 斷言 |
| **【Day-1 R5】`dbgenerated` 鏡像文字逐字比對** | 少一對外層括號 → 其後**每次** `migrate dev` 產出一句必然失敗的 SQL。Day 2 的 migration 程序固定為：寫 SQL → apply → `pg_get_expr` 取文字 → 貼進 `schema.prisma` → `migrate diff --exit-code` 回 0。⛔ **不用 `prisma db pull`**（會覆寫整檔並吃掉 `//` header）。無 CI gate 看這件事 → `AD-SchemaMigrationDrift-1` |
| ⛔ **【Day-1 §1.h】`acceptance_status` 算哪一組分數，`02a:196` 沒說** | 三種讀法各有後果（before → 治理完仍永遠 requires treatment；after → 與 `in_it_risk_register` 完全冗餘；`COALESCE(after, before)` → 兩欄各有意義且對應 `02a:141` 的兩句話）。第三種最說得通但**是推論不是 spec** → **Day 2 開場呈報，不自行選** |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **`Control` · `SoA` · `ControlTest`** — M1 slice 3
- **`Issue` · `Action` · `Evidence`** — 零消費者，等有東西產生 findings
- **`risk_scales` 管理介面 / per-entity 校準 UI** — M4 之後（且看 D2）
- **稽核軌跡** — M3。⚠️ R4 敞口本 phase 再擴大三條寫入路徑
- **`AD-RiskForm-1` 的設計對照修正** — M7/M8；本 phase 只讓它有標的
- **任何 UI** — `apps/web` 完全不動；W01–W05 的**零 UI drive-through 記錄不變**
- ⭐ **AD-12b 的 closeout 模板修補**（審計 #3）— **併入本 phase 的 Day 4**，不另開 CH
  （節流閘配額；它只是模板加一列）
