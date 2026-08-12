# CH-022 — the guard a foreign key could not be

**Date**: 2026-08-12
**Phase**: W07（M1 slice 4）
**Scope**: `core-model` · `modules` · `entity-scope`（消費，未修改）
**Components**: `control_tests` · `evidence` · `/control-tests` · `/evidence` · `extension_fields`（policy 修補）
**PR**: **MERGED** #44（rebase，main head `19bc4f7`，2026-08-12 08:34 UTC）—— 六個 required check 全 SUCCESS

---

## Problem

三件事同時卡住，而第三件是前兩件的共同根因。

**一、`Control.effectiveness` 的規格指向一張不存在的表。**
`02a:418` 寫它 "reflects the latest completed `ControlTest`"，W06 建了 `controls`
卻**沒有任何東西測它** —— `CreateControlInput` 因此刻意不收 `effectiveness`
（接受呼叫者給的值＝讓寫這條 control 的人告訴平台它有效）。派生沒有來源。

**二、`extension_fields` 帶著一個活著的隔離缺陷。**
W03 的單一 `FOR ALL` policy：`USING` 含 `org_entity_id IS NULL`（group 列人人可讀），
`WITH CHECK` 只要求 `∈ scope`。一次 `UPDATE` 把 group 列的 `org_entity_id` 改成自己
→ **兩側都過**（`AD-GroupRowTheft-1`）。

**三、⭐ 到目前為止「跨實體引用」全靠複合 FK，而這一片用不上它。**
W05/W06 每一張引用別表的子表都用 `(parent_id, org_entity_id)` 複合 FK 擋住跨實體引用。
`ControlTest → Control` **結構上不可用**：`controls` 明文拒絕 `@@unique([id, org_entity_id])`
（`schema.prisma:808-812`），因為 M7 的 `Risk ↔ Control` 連結表要讓 group control
連到**任何**實體的 risk —— 兩個 `org_entity_id` 本來就會不同。
`Evidence` 更極端：`linked_type` + `linked_id` 是多型的，**連 FK 都沒有**。

---

## Root Cause

第三項不是「還沒做」，是**一個沒有人問過的問題**：當父表拒絕錨點時，子表的跨實體引用由誰擋？

如果答案是「沒有人」，那麼一個 A 實體的寫入者可以建一筆指向 B 實體私有 control 的測試記錄 ——
而且**成功本身就是一個 oracle**：它確認了那個 ID 存在。**正是 約束 8 要求查無資料回 404 而非 403
的那個洩漏**，只是發生在資料庫層，任何 controller 都改不掉。

所以本 phase 的順序是**先量再設計**。先寫表再補防護會讓「防護有沒有生效」變成無法回答的問題。

---

## Solution

### Day 1 —— 三個問題各跑一次（真 PostgreSQL，`isms_app_user` 非 owner 非 superuser）

**實驗對照組先建立**：HK1 範疇下三個 control 的可見性 = **0 / 1 / 1**
（SG1 私有 / SG1 擁有的 group / HK1 自己的）。

| # | 問題 | 結果 |
|---|---|---|
| **M1** | HK1 寫一列 `control_id` = SG1 私有 control（**存在但完全看不到**）| ⛔ **INSERT 成功** —— RI 檢查繞過 RLS |
| **M2** | 同上但指向 group control | 成功（依 `02a:415` **應為合法**）|
| **M2c** | 指向**完全不存在**的 id | 拒絕 `23503` |
| **M3b** | **無 FK** 時 `linked_id` = 純垃圾 | **也成功** —— 毫無防護 |

> **M1 + M2c 合起來就是那個 oracle。** 指向別人的私有列 → 成功；指向不存在的 → `23503`。

### 由量測導出機制（不是由 best practice 導出）

`BEFORE INSERT OR UPDATE` + `SECURITY INVOKER` trigger `assert_parent_in_scope(table, column)`，
`NOT EXISTS → RAISE`。四個候選的比較與否決理由見 design note §1。

⭐ **關掉 oracle 的是「執行順序」，不是「有 trigger」**（M5，本 phase 最重要的一次量測）：
`BEFORE` trigger 跑在約束之前，所以**不存在的 id 也走 `NOT EXISTS` 分支**，
與不可讀的拿到**同一個**錯誤，FK 沒機會開火。**順序相反的話 oracle 會原封不動地活下來，
而外觀上像修好了。** 這一項不量就會漏。

| # | 驗收 | 結果 |
|---|---|---|
| M4a/M4b | 裝上後：跨實體拒絕 / **group 仍成功**（未誤擋）| ✅ |
| M5 | 「存在但不可見」與「不存在」是否可分辨 | ✅ **不可分辨** |
| M6 | UPDATE 路徑重新指向不可讀父列 | ✅ 拒絕（`OR UPDATE` 是必要的）|
| M8 | **中性化**：`DISABLE TRIGGER` → M5a 轉為成功 | ✅ 擋住它的**確實是** trigger |

### Day 2 —— SQLSTATE 改判，而 `scope-refusal.ts` 早就寫好了正確答案

trigger 原本 raise `42501`。那是 RLS 對「**列自身**越界」用的碼，repository 會映射成
`ScopeRefusedError` →「org entity X not found」——**但真正錯的是 `control_id`，這是歸因錯誤的 404**。

改成 `23503` → `UnknownReferenceError`，其 docstring 描述的正是這個情境
（"either because no such record exists, or because it belongs to another entity"），
且它**只帶欄位名不帶 id**。⭐ **改完重新量一次**（不因為「只是改個常數」就假設 M5 還成立）——
oracle 仍關閉，且兩個訊號現在各說各的：父列不可達 `23503` · 列自身越界 `42501`。

**代價明說**：Prisma 認得 `23503` 並改寫訊息，**丟掉 trigger 自己的文字**；`42501` 它沒有對應所以原樣透出。
所以「斷言 PostgreSQL 原始訊息」只對 RLS 有效。兩個碼都完整到達 repository，
因為 `scope-refusal.ts` 讀的是 SQLSTATE 不是文字。

### 落地

`20260812055744_control_test_and_evidence`：兩張表 + 2 enum + **六條 per-command policy**
（各 `SELECT`/`INSERT`/`UPDATE`，**無 `FOR DELETE`** —— 缺席比窄的更嚴格，W06 §2.2）
+ `assert_parent_in_scope()` + 兩個 trigger + 擴充 trigger。
⛔ 兩張表**不做** group widening —— 測試結果屬於單一實體，滾升是授權擴張不是表級寬讀。

`20260812063000_extension_fields_per_command`：`FOR ALL` → 三條 per-command。
根因寫進 migration：`UPDATE` 的 `USING` 看**舊列**、`WITH CHECK` 看**新列** ——
group 列通過前者、改寫後的列通過後者。**先看到紅**（`count` 期望 0，實得 **1**）才修。

三個刻意的空缺：

- **`ControlTest` 不建 `result`** —— `02a` §4 的三個終態就是結果，兩個欄位＝兩種說法且無和解規則
- **create 路徑不收 `status`/`performedAt`/`reviewerUserId`/`conclusion`** ——
  `02a:416` 的 SoD 明寫 enforced in the review transition，而 transition 不在本 phase。
  收了就是讓執行者自我認證
- **`Evidence.linked_type` 只有 `control_test`** —— 另外兩個目標表不存在（ADR-0014 砍 `subtree` 的同一判準）

⭐ **兩個 scoped client 都不暴露父表 delegate**（`scoped-client.types.ts:158` / `:176`）——
能先讀父表的 repository 就有能力分辨「不存在」與「不是你的」。不給 delegate 讓那段程式碼
**compile 不過**，而不只是「不建議寫」。

---

## Verification

**Gate（逐 workspace 可見，非 `tail -N`）**: lint **0** · format:check **All matched files ×2** ·
type-check clean ×2 · unit **235 / 23 suites**（baseline 192/19）· int **105 / 8 suites**（104/6）·
build clean · `run_all` **6/6** · coverage **92.58 / 92.32 / 96.26 / 94**（baseline 93.36 / 92.47 / 95.74）。

⚠️ **coverage 兩項低於 baseline，未當作過關**。branches 的降幅先被逐處查出四個未走到的分支
並補**帶主張**的測試（90.41 → **92.32**）。剩餘差距**全部**是兩個新 `.module.ts` 的 0%，
與既有四個一致；W07 新增的每一個非 module 檔案皆 **100% statements**。

### ⚪ API-level 走查（真進程 + 真 PostgreSQL + 真 RLS）

**⛔ 這不是 drive-through。** 兩組端點**沒有 UI**，本節只證明「API 會回應且行為正確」，
**不主張任何可用性**（`verification-discipline.md` §適用範圍的純後端豁免）。

三次重啟各驗一段範疇。startup log 逐行擷取（兩個 module initialized + 四條路由 mapped
+ dev-principal 警告），證明 wiring 生效而不是推測。

| 探測 | 觀察 |
|---|---|
| `POST /control-tests` → `POST /evidence` → 兩個 GET | 201 `CTST-SG1-000001` · 201 `EVID-SG1-000001` · 皆讀得回 |
| 指向 **HK1 私有 control** vs 指向**不存在的 id** | ⭐ **404，status 與 body 逐位元組相同** —— oracle 在 HTTP 層也是關的 |
| `orgEntityId=HK1`（列自身越界）| 404「org entity …c1 not found」—— **歸因正確**，仍不洩漏存在性 |
| HK1 範疇：指向 **SG1 的 group control** | **201** ✅ ADR-0014 的擴寬在上一層存活 |
| HK1 範疇：再讀 `GET /control-tests` | 只有自己的那筆 |

⚠️ **HK1 第一次讀是 0 rows，而「看不到 SG1 的列」與「HK1 沒有列」在那時是同一個觀察。**
所以讓 HK1 建了自己的列**再讀一次**，雙邊都有資料時才算量到隔離。

### 元驗證：8 個機制逐一中性化 —— **8/8 全紅**

中性化改的是 **migration** 不是活資料庫 —— int suite 每次 `globalSetup` 都會 drop/recreate
`isms_test`，直接改資料庫會在任何測試執行**之前**被洗掉，然後整輪回綠而什麼都沒證明。

| # | 中性化的機制 | 轉紅 |
|---|---|---|
| N1 / N2 | `control_tests` 的 read `USING` / insert `WITH CHECK` | 1 / **1** |
| N3 / N4 | `evidence` 的 read `USING` / insert `WITH CHECK` | 1 / **1** |
| N5 / N6 | 兩個 `assert_parent_in_scope` trigger | **3** / **2** |
| N7 | `risks` 的 `WITH CHECK`（carryover 驗收）| **1** |
| N8 | `extension_fields_update` 的 `USING` 還原成修補前 | **1** |

⛔ **N7 第一次是「STAYED GREEN」，而那是量測錯誤不是發現。** 我的錨點字串在那個 migration 裡
出現**三次**（`asset_groups` / `assets` / `risks`），`replace` 換掉第一個 ——
**中性化到的是 `asset_groups`，`risks` 從未被動過**。改用完整 policy 區塊後 RED ×1。

⭐ **N2 / N4 在修法之前都是 0。** 兩個「釘 INSERT policy」的測試第一版**都是綠的**，
但綠的原因是 **trigger 先擋** —— 那張表自己的 `WITH CHECK` **從未被評估**。
這是 `AD-BorrowedRefusal-1` **第 3 次**（W05 = counter 代勞 · W06 = `RETURNING` 遮蔽 · W07 = trigger 先擋）。
修法：讓 trigger 通過（父列取當前範疇讀得到的），`WITH CHECK` 才是唯一還能拒絕的。

**還原驗證**：`git diff` + grep 確認四個 migration **逐位元組還原**（無殘留 `NEUTRALISED` / `(true)`）。

### ⛔ 兩個假 gate 宣稱（Day 2 報告的更正）

`format:check` 與 `type-check` 在 Day 2 **其實都是紅的**（`apps/api` 各兩個問題：
2 個 Prettier + 2 個 **TS2353**）。根因是同一個：`... 2>&1 | tail -N` 讀**多 workspace** 的 npm 輸出，
兩次都是 api 失敗、web 成功，而 `tail` 只留下最後一個 workspace 的成功訊息。
**`tail -N` 用在多 workspace 輸出上就是一個會藏住失敗的過濾器** ——
與 CLAUDE.md 禁止 `lint --silent` 同一族。

⚠️ 另一個相關事實：**jest 不做完整型別檢查**，TS2353 在測試裡不會炸 ——
235 個綠測試**不涵蓋**那兩個型別錯誤。已修正並以逐 workspace 可見的方式重驗。

**Drive-through**: ⚪ **無 user-facing surface** → 不適用。
**Verdict**: ✅ **API-level verified against a clean process**。⛔ **不暗示可用性** ——
W01–W07 的零 UI drive-through 記錄不變。

---

## Impact

**解鎖**：`02a` §0 的 Wave 1 shared core 已建數 **8 → 10 / 35**。
`Control.effectiveness` 從「指向不存在的表」變成「有來源但尚無觸發點」（派生仍未做，見 design note §4）。

**關掉的**：`AD-GroupRowTheft-1`（一個**活著的**隔離缺陷，先看到紅才修）·
`AD-ReturningMasksCheck-1`（`risks` 11b 改 `createMany`，並在中性化下確認轉紅）·
`AD-CalibrationNoActual-1` 的執行面（逐日記錄了分鐘數 —— ⚠️ 但**記錄不等於量測**，見 Q2）。

**新增的敞口**：再新增**兩條無稽核的寫入路徑**（`RISK_REGISTER` R4 已更新，累計 **10 張表無一有稽核**）。

**約束了什麼**：每一張**引用別表而父表無法提供複合錨點**的子表都跟隨這個形狀 ——
`BEFORE INSERT OR UPDATE` + `SECURITY INVOKER`，且**不給 repository 父表 delegate**。
一張只靠單純 FK 的子表是缺陷，不是風格選擇。

**順帶修的（不在 plan §4，Day 4 closeout 自檢發現）**：
`20260812164500_correct_parent_guard_comment` —— `COMMENT ON FUNCTION` 在 SQLSTATE 改判時
沒跟著改，**「both raise 42501」這句錯誤宣稱活在資料庫裡**（`pg_description` 實查確認）。
以**新 migration** 更正而非編輯已套用的檔（`AD-MigrationChecksum-1`）。

**沒有做的**：`Issue`（`02a` §4 的 `Failed → raises Issue` 沒有目標表）· `Attestation` / `Assessment` ·
review transition 與 SoD 強制 · `Control.effectiveness` 派生 · `hash` 的任何驗證（見 design note §4）。

---

## 相關

- **Design note**: [`W07-cross-entity-references.md`](../../02-architecture/design-notes/W07-cross-entity-references.md)
- **Phase 四件套**: [`W07-m1-control-test-and-evidence/`](../../01-planning/W07-m1-control-test-and-evidence/plan.md)
- **前一片**: [`CH-021`](./CH-021-w06-control-and-asset-endpoints.md)（W06 —— 本 phase 關掉了它產生的兩條 AD）
- **ADR**: [`0014`](../../14-adr/0014-row-level-entity-scope-and-per-command-policies.md)（per-command 形狀；本 phase 兩張表不做 group widening）
- **新增的 AD**: `AD-EstimateAsMeasurement-1` · `AD-BottomUpBlueprint-1` · `AD-MdAnchorLineShift-1`
- **升級的 AD**: `AD-BorrowedRefusal-1`（第 3 次 → 該改結構性解法）·
  `AD-GrepAssertion-1`（多 workspace 的新形狀）
