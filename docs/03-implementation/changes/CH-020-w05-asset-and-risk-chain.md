# CH-020: The methodology becomes a schema — asset → threat → vulnerability → risk, and a score nobody can write

**Date**: 2026-08-11
**Phase**: W05（M1 slice 2）
**Scope**: `core-model` · `modules` · `entity-scope`（消費，未修改）
**Components**: —
**PR**: **MERGED** #36（rebase，main head `700f5d6`，2026-08-11 14:56 +0800）—— 六個 required check 全 SUCCESS

---

## Problem

已確認參數 **#7**（`LKH × MAX(FIN,BOP,LRY,REP,SIS)`，≥16 需處理）與 **#8**（資產基礎評估：
資產群組 → 資產 → 威脅 → 弱點 → CIA）是**公司程序的硬規則**，不是產品偏好。
W05 之前，這兩條**在 runtime 裡一個字都不存在**：

- 資產鏈五個環節（`AssetGroup` / `Asset` / `Threat` / `Vulnerability` / `Risk`）**全部零命中**
- 評分公式只活在 `02a:119,136,139-142` 的散文與表格裡，**沒有任何 code**
- `02a:196` 的 `in_it_risk_register`（殘餘 ≥16 進 IT Risk Register）同樣只是文字

實務後果不是「少五張表」，而是**兩件下游工作沒有標的**：

> `AD-RiskForm-1`（🔴 P0）判定設計交付物「實作的是另一套方法論，完全沒有 before/after 結構」——
> 而在本 phase 之前，**本專案自己也沒有**。你不能拿設計稿去對一個不存在的模型。
> 同樣地，M8 的旗艦滾升儀表板要聚合的數字，在資料庫裡不存在。

還有第三件，性質不同：**W04 的 design note §2 宣稱七個不變式「可被複製」，而那個宣稱從未被任何東西測試過。**
它是 M1 其餘 32 張表的施工依據，卻只有 1 個資料點（它自己）。

---

## Root Cause

不是「還沒做」。三個獨立的**未拍板語義**互相擋住，而每一個都會約束**每一張帶分數的表**：

1. **derived 欄位存不存？** `02a:139` 只說「五個 impact 要存，max 是 derived」，
   **沒說 derived 要不要落地**。存了，公式就焊在 migration 裡；不存，M8 的
   `ORDER BY score` 就得把全部列拉回應用層再算。
2. **閾值 16 放哪？** 參數 #7 訂「per-entity 校準**只能改設定**」，而
   `multi-tenant-data.md:65` 把 `risk_scales` 列為合法全域表 —— 但那張表**從未被任何設計文件規格化**。
3. **`Threat` / `Vulnerability` 叫什麼、`cia_type` 是什麼形狀？**
   兩份權威文件對表名的說法不同（`02a` vs `multi-tenant-data.md:63`）。

⭐ 這三個和 W04 的 `org_entity_id` 問題**同一個形狀**：它們不是「先選一個之後再改」的東西。
generated column 的公式改一次要 migration + 全表重寫；閾值同理。
**所以順序必須是：先拍板語義，再決定要建什麼。**

---

## Solution

**五個決定（D1–D4 於 plan 核可時拍板，D5–D6 由量測逼出後補拍），其中兩個判為架構級 → ADR-0013。**

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/14-adr/0013-risk-scoring-and-calibration.md` | 新增 | 評分與校準住在哪裡；**4 條可證偽條件**，各指名觸發者與最早觸發的里程碑 |
| `apps/api/prisma/schema.prisma:327-411` | 新增 | 6 個 enum（`AssetCategory` / `AssetClassification` / `CiaType` / `RiskTreatment` / `RiskAcceptanceStatus` / `RiskStatus`）|
| `apps/api/prisma/schema.prisma:413-664` | 新增 | 5 個 model；`Policy` docstring 的 orphan claim（"tables this phase does not build"）**同一個 commit 內改掉** |
| `prisma/migrations/20260811024841_asset_and_risk_chain/migration.sql` | 新增 | Prisma 產出 195 行 + **手寫 ~130 行**：`:248-291` 四個 generated column · `:301-317` 四個 CHECK · `:324-334` GRANT · `:343-365` RLS + FORCE + policy · `:375-385` 三個 extension trigger |
| `apps/api/src/core-model/risk-score.ts` | 新增 | **刻意不含算術**（D5）：`validateScoreSet()` · `TREATMENT_THRESHOLD` · `scoreExpression(phase)` |
| `apps/api/src/core-model/risk.repository.ts` | 新增 | **第二個範疇化 client 消費者** —— W04 因 ADR-0012 失去的那個證明機會 |
| `apps/api/src/core-model/scoped-client.types.ts:82-100` | 修改 | `ScopedRiskClient`；**第二個消費者出現才把 `ScopedExtensionCatalogClient` 抽出來** |
| `apps/api/src/core-model/scope-refusal.ts` | 修改 | `isUnknownReference`（23503）—— 第二個偵測器，見下 §load-bearing 3 |
| `apps/api/src/modules/risk/` | 新增 | `POST /risks` · `GET /risks` + controller/int 測試 |
| `apps/api/src/bootstrap/app.module.ts` · `test/int-global-setup.js` | 修改 | 掛 `RiskModule`；資產鏈 seed（兩個實體各一份）|
| `docs/rules-on-demand/multi-tenant-data.md:63` | 修改 | 表名更正為 `threats` / `vulnerabilities`（D4：**設計文件 > 規則檔**）|
| `docs/14-adr/README.md` | 修改 | 索引漏列 ADR-0005 / 0012；「尚待撰寫」5→**4** 份 |

### 六個決定，逐條一句理由

| # | 裁決 | 為什麼 |
|---|---|---|
| **D1** | **generated column + all-or-none CHECK** | 呼叫者**物理上寫不了**分數；M8 要能 `ORDER BY score`。前置條件（Prisma 看不看得見它）於 Day 1 R1–R7 實測後成立 |
| **D2** | **常數 + ADR-0013 記錄落點**，不建 `risk_scales` | 參數 #7 約束的是**機制不是時程**。⭐ 且 `risk_scales` 從未被規格化 → 建它得**自行發明欄位**（違反參數 #9）|
| **D3** | `cia_type` = **`enum(7)`** | 三個 boolean 允許「全 false」這個無效狀態；enum 讓它不可能表達 |
| **D4** | **`threats` / `vulnerabilities`** | CLAUDE.md 權威排序：設計文件 > 規則檔。同時**更正**那份規則檔，不是在它旁邊加註 |
| **D5** | `risk-score.ts` **不做 TS 算術** | 主流量**沒有一處**需要在 TS 算這個乘積 → 重算一次 = AP-6 + AP-1。⚠️ plan §3.3 的記錄型偏離，已入 §8 |
| **D6** | 未評分風險的 derived 欄位 = **NULL 三態** | 見下 §load-bearing 1 |

### 四個 load-bearing 細節（拿掉就會壞）

1. ⭐⭐ **`CASE ... ELSE 'acceptable'` 會讓平台捏造一個治理主張。**
   `NULL >= 16` 是 NULL，落進 `ELSE` —— 於是一筆**尚未做控制後評估**的風險被記成 `acceptable`。
   那不是預設值。`02a:343-353` 保證 Identified / AssessedBefore / Treated 三個狀態**必然**沒有 after 分數，
   所以那些列必然存在。四個 derived 欄位一律採 NULL-propagating 形式
   （`CASE WHEN lkh IS NULL THEN NULL WHEN ... END`）。**guardrail 1 的直接應用。**

2. ⭐ **all-or-none CHECK 不是加分項，是 D1 成立的必要條件。**
   `GREATEST` **忽略 NULL** —— 只填 2 個 impact 仍會算出一個看似合理的分數。
   而 `02a:348` 的狀態機讓 `*_after` 五欄在生命週期中**本來就會部分填寫**，那正是它咬人的位置。
   證據在錯誤訊息本身：拒絕列的 `DETAIL` 顯示 derived 已算出 **8**（4×2）——
   **CHECK 是唯一堵住它的東西**。同理 band CHECK 的 `DETAIL` 顯示 **35**，超出 `02a:119` 的 1–25。

3. ⭐ **FK 檢查繞過 RLS，所以三張 entity-scoped 表之間的 FK 一律複合。**
   實測（Day 2 U1）：單欄 FK 可以成功指向一列**你看不見的**資料。
   `assets → asset_groups` 與 `risks → assets` 各帶 `org_entity_id`；
   `risks → threats/vulnerabilities` 維持單欄（全域庫沒有實體軸）。
   **這是約束 8 要求的，不是防禦性設計。**

4. **`ScopedRiskClient` 刻意不暴露 `asset` delegate。**
   能先讀 asset 表的 repository 就有能力分辨「不存在」與「不是你的」——
   那正是約束 8 禁止的 oracle。**不給那個 delegate，是讓它寫不出來而不是被勸阻。**

### ⛔ 一個看起來更好、量完才知道要否決的選項

generated column **不能引用另一個 generated column**（Day 1 S1），
於是公式必須重複 4 次 + `schema.prisma` 4 個 `dbgenerated` 鏡像 = **8 處**。
那個代價大到值得問：能不能包成一個 `IMMUTABLE` SQL 函式，讓四欄引用同一份？

> **可以，而且它會靜默地把一張合規表分裂成兩個公式世代。**
> `CREATE OR REPLACE FUNCTION` 在有相依 generated column 的情況下**成功**，
> PostgreSQL 既不擋、也不重算、也不警告 —— 同一組輸入 `(4,2,5,1,3,1)`，
> **舊列讀 20、新列讀 16**，沒有任何東西標示哪列是哪個。
>
> ⭐ **公式出現在 8 處是可讀性代價；一欄兩世代是合規事故。**
> 選 inline（改它要 `ALTER COLUMN ... SET EXPRESSION`，**會重寫全表並重算每一列**），
> 可讀性用機械手段補：整合測試對每欄的 `pg_get_expr` 斷言等於 `scoreExpression(phase)`。

### 三個不是我選的、由 `02a` 機械導出的結果

| 結果 | 導出自 |
|---|---|
| `status` **只有 `risks` 有** | `02a` §1.1 定義 status 為「per the entity's state machine (§4)」，而 §4 只有 Policy / Risk / Issue / ControlTest 四條。替 Asset 發明一條就是參數 #9 |
| `extensions` **只有三張 entity-scoped 表有** | `validate_extensions()` 無條件引用 `NEW.org_entity_id` —— 掛到全域表是 runtime error。**被迫，不是偏好** |
| `threats`/`vulnerabilities` **無 `ref_code`** | 發號走 entity-scoped 的 counter，全域表沒有實體可發。與 W04 的 `users` 殊途同歸 |

### 明確不做（每項都有解封條件）

- **`Control` / `SoA` / `ControlTest`** —— M1 slice 3。`Risk.treatment` 今天是**欄位**不是關聯
- **`risk_scales`** —— D2 判定不建。解封條件寫進 **ADR-0013 的可證偽條件**
- **`rating_inherent` / `rating_residual`（分帶）** —— ⚠️ **旗艦儀表板數的是分帶不是分數**
  （`02a:414` · `03:90` · `08:25`），但 `02a:405`（derived）與 `:429`（owner enters）**互相矛盾**，
  且後者本身是開放決策 #5「Confirm before M7」。建了就是替未拍板的決定選邊 → **M8 前必須有人拍板**
- **`Asset.value` / `Asset.criticality`** —— `02a` 列名但**未定義值域** → `AD-AssetScales-1`
- **`asset_owner_user_id`** —— **不另建欄**：§1.1 已有 `owner_user_id`，兩欄一義是模組自行發明共用定義（guardrail 3）。
  `custodian_user_id` **有**建，因為保管人是另一個人做另一件事
- **稽核軌跡** —— M3。⚠️ 本 phase 新增**三條無稽核的寫入路徑**，`RISK_REGISTER` R4 敞口再擴大

---

## Verification

**Gate**: lint **0** · type-check **0** · format **0** · `run_all` **6/6** ·
`lint:negative` PASS（**22 檔 0 bypass, 3 allowlisted** —— 檔數 18→22 而 **allowlist 未增加**）·
unit **138 passed / 15 suites**（baseline 86 → **+52**）· int **54 passed / 4 suites**（baseline 34 → **+20**）·
web **10** · build **0**
覆蓋率 **94.13 / 92.17 / 94.36 / 95.03**（baseline 94.11 / 90.42 / 92.45 / 94.76 —— **四項全升**）

> ⚠️ **coverage 第一次量是 91.06 / 87.15 / 91.54 / 91.61，低於 baseline。**
> 沒有當作「門檻過了就算」帶過。補的三組測試**不是為了數字**：整合測試證明**資料庫產生那個 SQLSTATE**，
> 單元測試證明**這一層把它對映到哪個 domain error** —— 兩個不同的主張。

### API-level 驗證（真進程 + 真 PostgreSQL + 真 RLS，13 案例）

Startup log 證明接線生效：`RiskModule dependencies initialized` · `Mapped {/risks, GET}` ·
`Mapped {/risks, POST}`，PID 7364 是 3210 的唯一擁有者。

三個特別值得記：

- **A1 分數是 20 不是 48** —— fixture 刻意選 `4 × MAX(2,5,1,3,1)`，SUM 版本會給 48
- **A3 呼叫者自帶 `scoreBefore:1` → 201，而送出的 1 到不了任何地方**
- **A8 / A9 / A13 三者 body 逐字相同** —— 別人的資產 / 不存在的資產 / 不存在的威脅，
  **不洩漏是三個參照裡的哪一個**

> ⭐ **拒絕點這次落在複合 FK（23503），不是發號也不是 RLS。**
> 風險自己的實體在範疇內，`WITH CHECK` 通過了；是複合 FK 攔下的。
> **同一個 oracle 保證，在第三個位置重新成立** —— 而 A7（row 自己出範疇）仍走 42501、
> 訊息與 A8 不同，那**不是** oracle：兩句都沒回答「它存不存在」。

### ⛔ 第一版走查腳本無效，而且它印出來像通過的

PowerShell 的 hashtable `+` 在鍵重複時 **throw**，於是四個案例的 `Post` **根本沒執行**，
`$r` 保留上一輪的值。**它甚至印了 `A8 == A9 ? True`** ——
那行讀起來正是 oracle 安全性檢查通過，實際上在比較同一個陳舊值的兩份拷貝。
修法是結構性的不是「小心一點」：clone-and-overwrite + **每個案例的 title 帶自己的 nonce**。

### 元驗證（`AD-NegativeGate-1` 第 8 個實例）——⭐ 這次找到一個真缺口

| # | 中性化什麼 | 紅 |
|---|---|---|
| M1 | 評分公式 `GREATEST` → `+`（MAX→SUM）| **4** |
| M2 | 三張表的 RLS → `USING(true) WITH CHECK(true)` | **3 → 補測試後 4** |
| M3 | all-or-none CHECK → `CHECK (true)` | **1** |
| M4 | 複合 FK → 單欄 FK | **2** |

> ⭐⭐ **RLS 全部中性化後，「跨實體寫入被拒」那個測試竟然還是綠的。**
> 原因：`repo.create()` **先**經過 `issueRefCode`，而拒絕它的是 `ref_code_counters` 的 policy ——
> **W04 的，我沒動**。那個測試證明的是 **counter** 會拒絕，不是 `risks` 會拒絕。
> **`risks` 自己的 `WITH CHECK` 零覆蓋 —— 拿掉它，每一項 gate 仍然全綠。**
>
> 這是 W04「發號路徑成了別人保證的一部分」**同一形狀第 2 次**。

**處置是修不是記**：新增整合測試 11b（繞開 repository、不帶 `ref_code`、直接寫），
**在 RLS 仍中性化的狀態下重跑 → 11b 轉紅**（M2 由 3 紅變 4 紅）= 缺口關上**且證明關上了**。

**還原驗證**：`git checkout` 後與中性化前副本**逐位元組相同**，
`isms_dev` 的 `_prisma_migrations.checksum` 與檔案 SHA256 **仍相符**（`0ae3cd1e…`）。

### `AD-DbBuildPathParity-1` —— 這次真的驗了那條路徑

⛔ **沒有 reset `isms_dev`**（破壞性操作需使用者當下的明確文字）。改在 throwaway 庫上**精確重現** reset 路徑：
`DROP SCHEMA public CASCADE` → ACL 變 `(null)`、`isms_app` 的 USAGE = **f**（W04 撞 500 的那個狀態）
→ `migrate deploy` → USAGE **t** / CREATE **f**，五張表權限逐張如設計。**同一份證據，零風險。**

⭐ 同時量到 **那條 AD 提議的守衛放在它提議的位置會無效**：`isms_test` 走 `CREATE DATABASE`，
`has_schema_privilege` 斷言會靠 template1 繼承的 `=U` 輕鬆通過 —— **正是這條 AD 自己在講的病**。

### CI（PR #36，六個 required check 全 SUCCESS）

`gates` 1m39s · 映像 build + 啟動探測 1m46s · trivy 28s · SAST 25s · gitleaks（全歷史）15s · SCA 6s。
`mergeStateStatus` 從開 PR 時的 **BLOCKED** 轉為 **CLEAN** —— **擋與放兩個方向都在這個 PR 上觀測到**。

> ⚠️ **CI 綠涵蓋的範圍比它看起來窄，而這是本 phase 自己量過的。**
> `gates` 的整合測試跑在 `isms_test` 上，那個庫走 `CREATE DATABASE`（從 template1 複製），
> **免費繼承** `public` schema 的 `USAGE` —— 所以**這次 CI 綠不涵蓋 GRANT 相關缺陷**。
> 本 phase 的 GRANT 是 Day 3 在 throwaway 庫上另外驗的，**那份證據不在這次 CI run 裡**。
> 同理，四個 `dbgenerated` 鏡像文字的逐字一致性**沒有任何一個 check 在看**
> （`AD-SchemaMigrationDrift-1`）。

**Drive-through**: ⚪ **無 user-facing surface** → 不適用。
**Verdict**: ✅ **API-level verified against a clean process**。
⚠️ **不是「可用」** —— 沒有 UI，沒有人透過 UI 用過它。W01–W05 至今**零 UI drive-through**。

---

## Impact

- **Breaking change**: no（五張新表 + 兩個新端點；既有 `Policy` / `User` 行為不變）
- **Migration**: yes —— `20260811024841_asset_and_risk_chain`。⚠️ **含 4 個 generated column**：
  日後改公式**不能**用 `CREATE OR REPLACE`，必須 `ALTER COLUMN ... SET EXPRESSION`（**會重寫全表**）
- **`schema.prisma` 有一個逐字約束**：四個 `@default(dbgenerated("..."))` 的文字必須逐字等於
  PostgreSQL 正規化後的形式。取得方式是 `SELECT pg_get_expr(adbin, adrelid)`；
  ⛔ **不可用 `prisma db pull` 對真 schema**（會覆寫整檔並吃掉 `//` header）。
  今天**沒有任何 CI gate 在看這件事** → `AD-SchemaMigrationDrift-1`
- **Config**: 無新變數
- **重啟需求**: ⚠️ **是** —— Prisma client 重新生成（5 個新 model）
- **對其他環境的影響**: GRANT 部分在 CI 上是 no-op（`CREATE DATABASE` 從 template1 繼承），
  **只在 reset 過的庫上有作用** —— 與 W04 的 `grant_schema_usage` 同一個盲區
- **dev 資料**: `isms_dev` 留下走查建立的 5 筆風險（`RISK-SG1-000001..000005`），
  `ref_code` 皆由 counter 正常發號，**無撞號風險**，刻意保留
- **Rollback**: revert 本 phase 的 commit + `prisma migrate resolve --rolled-back 20260811024841_asset_and_risk_chain`；
  估 ~0.5 hr。⚠️ **比 W04 對稱** —— 五張表無外部參照者，`ref_code` 只由本 phase 發出

---

## 相關

- **前置的 P0**: `AD-RiskForm-1` **未關閉**，但從「無標的可對」變成**有標的可對** ——
  設計交付物的 7 欄風險表單現在有一個 21 欄 + 完整 before/after 結構的模型可以對照（M7/M8 的工作）
- **新增的 ADR**: [ADR-0013](../../14-adr/0013-risk-scoring-and-calibration.md) —— **已採納**，4 條可證偽條件
- **規則變更**: `docs/rules-on-demand/multi-tenant-data.md:63` 表名更正（**下位文件對齊上位**，不是新增例外）
- **同類前例**: `AD-NegativeGate-1` 的第 **8** 個負面 gate。本次的結構性貢獻是
  **元驗證抓到一個「所有 gate 全綠而該表的 RLS 零覆蓋」的真缺口，並在同一天關上且證明關上了**
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-AssetScales-1` · `AD-SchemaMigrationDrift-1` ·
  `AD-RiskBand-1` · `AD-CalibrationMetric-2` · `AD-DesignNoteAnchor-1` · `AD-BorrowedRefusal-1`
- **Design note**: ❌ **不產出** —— 本 phase 是 feature continuation 不是 spike。
  判準與逐條裁決見 [retrospective §US-6](../../01-planning/W05-m1-asset-and-risk-chain/retrospective.md)
- **前一片**: `docs/03-implementation/changes/CH-019-w04-user-and-base-fields.md`（M1 slice 1）
