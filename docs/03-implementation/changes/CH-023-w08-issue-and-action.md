# CH-023: Issue + Action，與 W07 判準第一次導出另一個答案

**Date**: 2026-08-12
**Phase**: W08（M1 slice 5）
**Scope**: `core-model` · `modules` · tooling（`scripts/lint/`）
**Components**: —
**PR**: #47（pending）

---

## Problem

三件事，前兩件是同一個計數器的兩半。

**一、`02a` §4 有兩條邊指向不存在的表。** ControlTest 的 lifecycle 在 `02a:392-393` 寫
`Failed / Partial → raises Issue`，而 `Issue` 表不存在。W07 plan §3.x 明文把它排到 slice 5。
`02a` §0 把 `Issue` · `Action` 放在 **shared core** 而非模組本地，理由是「每個會產生 finding
的模組都要用它」—— 今天 assessment / test / audit / incident **沒有一個**有地方放它的 finding。

**二、Wave 1 實體計數是手寫的，所以每份文件都不一樣。** 分子曾經是 8 / 9 / 10 / 12，全部
寫在當時有效的文件裡（`AD-EntityCountDerivation-1`）。而 `02a` §0 開頭那句
「Nothing is buildable that is not on this list; adding an entity means adding a row here
**in the same change**」**沒有任何東西在強制** —— `RefCodeCounter` 建於 W04（`7251670`），
在索引外活了三個 phase（`AD-EntityIndexIncomplete-1`）。

**三、W07 的 D1 判準只產生過一個答案。** 它說「父表結構上給不起錨點時才用 trigger」，
而在此之前每個遇到的父表都給不起。**只有一個答案的判準還不算判準。**

---

## Root Cause

**計數**：`02a` §0 對自己下了一條規則，而規則的執行者是「記得」。六個既有 detector
（`check_doc_links` / `check_path_references` / `check_rules_hygiene` / `check_status_markers` /
`check_mockup_fidelity` / `check_workflow_placeholders`）**沒有一個**比對 `schema.prisma` 與
那份索引。

**判準**：W07 design note D1 否決「複合 FK」的理由是**結構性的** ——
`schema.prisma:892-896` 明寫 `controls` 不能給 `@@unique([id, org_entity_id])`，因為 M7 的
`Risk ↔ Control` 連結表需要兩側 `org_entity_id` **不同**。那是 `controls` 特有的約束，
不是複合 FK 的缺陷。`issues` 沒有任何 M:N 連結表，`Action` 是它唯一的子表。

---

## Solution

**`Action → Issue` 走複合 FK（D1 選項 B），不用 trigger。** 照抄 W07 的 trigger 會多一層
每列的動態查詢（其成本 W07 design note §4 明記**未量**），換來的是零額外保證。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/api/prisma/schema.prisma:1107` | 新增 | `model Issue` —— 本專案**第三張**給出複合錨點的父表；docstring 寫明為什麼它給得起而 `controls` 給不起 |
| `apps/api/prisma/schema.prisma:1171` | 新增 | `model Action` —— `@relation(fields: [issueId, orgEntityId], references: [id, orgEntityId])` |
| `…/migrations/20260812211801_issue_and_action/migration.sql` | 新增 | 4 enum · 2 表 · **複合 FK** · 6 條 per-command policy（無 `FOR DELETE`）· FORCE RLS · 2 個 `validate_extensions` trigger。⛔ **刻意沒有** `assert_parent_in_scope` |
| `apps/api/src/core-model/{issue,action}.repository.ts` | 新增 | 第 6、7 個 scoped-client 消費者 |
| `apps/api/src/core-model/scoped-client.types.ts` | 修改 | +2 介面；⛔ `ScopedActionClient` **不含** `issue` delegate |
| `apps/api/src/modules/{issue,action}/` | 新增 | 兩組 create-only 端點 |
| `scripts/lint/check_entity_index.py` | 新增 | `schema.prisma` 的 `^model` ∩ `02a` §0 → `built N / total M`；`run_all` 6/6 → **7/7** |
| `scripts/lint/__fixtures__/entity-index-drift/` | 新增 | detector 的負面案例（三個 model 走三條比對路徑）|
| `docs/02-architecture/02a-data-model-spec.md:19` | 修改 | 同行追加 excluded 清單的指標（**行數不變**）|

**Load-bearing 細節，拿掉就會壞**：

1. **`ScopedActionClient` 不含 `issue`。** 三個 phase、三種機制（複合 FK → trigger → 複合 FK），
   保護的都是同一條不變式：**「別人的 issue」與「不存在的 issue」必須同一個錯誤**。
   一個讀得到父表的 repository **有能力**分辨兩者 —— 那個 oracle 會變成「不建議寫」而不是「寫不出來」。
2. **`action.int.spec.ts` 測試 8 的 `(issueId, orgEntityId)` 是刻意匹配的一對。**
   顯而易見的寫法（`SG1_ISSUE` + `orgEntityId: HK1`）會靠**複合 FK 的 23503** 通過，
   而 `actions_insert` 從未被評估 —— 那就是 `AD-BorrowedRefusal-1` 第 4 次。
3. **`IssueController` 的 enum 守衛，且清單是 `Object.values(IssueSource)` 導出的。**
   Prisma 拒絕未知 enum variant 的錯誤**不帶** `scope-refusal.ts` 認得的 SQLSTATE，
   所以沒有它時 `{"severity":"urgent"}` 是 **500**。抄一份字面清單會在 `audit` 進 schema 那天
   繼續拒絕它，而**不會有任何測試失敗來說這件事**。
4. **`check_entity_index.py` 的 `ALIASES`。** model `ExtensionField` / table `extension_fields` /
   索引 `extension_field_catalog` —— **三個名字，無規則可導**。逐字比對的 detector 會在同一次
   執行裡報一個假孤兒和一個假缺口。

---

## Verification

**Gate**（逐 workspace 分開跑取真退出碼，**全程未用 `tail`** —— `AD-GrepAssertion-1` (d)）：

lint 0/0 · format:check ✅×2 · type-check ✅×2 · build ✅×2 · web 10 ·
unit **276 / 27 suites**（baseline 235/23 → **+41**）· int **125 / 10 suites**（baseline 105/8 → **+20**）·
coverage 92.07 / 91.9 / 96.63 / 93.62 · `run_all` **7/7** · `lint:negative` PASS（41 檔 0 bypass 3 allowlisted）

⚠️ **coverage 三項低於 Day-0 baseline，已歸因**：`modules/*/*.module.ts` 全部 0%（既有 6 個皆然），
它們是 DI metadata 沒有可測邏輯，每加一個稀釋一次。jest 門檻 80/70/80/80 → 四項遠高於。
趨勢記為 `AD-ModuleCoverageDilution-1`。

**新增測試**：`{issue,action}.repository.spec.ts`（各 100% 覆蓋）· `{issue,action}.controller.spec.ts` ·
`{issue,action}.int.spec.ts`。**負面測試逐一中性化驗收**：

| N | 中性化 | **實際轉紅** |
|---|---|---|
| N1 | 移掉 `actions_issue_id_org_entity_id_fkey` | 測試 **4、5、6**（其餘 **8 綠**）|
| N2 | `issues_insert` `WITH CHECK` → `true` | **只有** 7 |
| N3 | `actions_insert` `WITH CHECK` → `true` | **只有** 8 |
| N4 | `issues_read` `USING` → `true` | 5 + 9（roll-up）|
| N5 | `actions_read` `USING` → `true` | 7 + 11（roll-up）|
| N6 | fixture 孤兒變成非孤兒 | `run_all` **6/7** |

⭐ **N1 是本 phase 的結論**：移掉那把鑰匙，跨實體插入**成功了**
（`Received promise resolved instead of rejected`）。擋住它的**確實是複合 FK**。
順帶證實了一件 Day 2 只能推論的事：測試 6 走 UPDATE 路徑而**從未為此寫過任何 SQL**，
卻隨 FK 一起失效 —— **FK 免費涵蓋 UPDATE**，W07 的 trigger 必須明寫 `BEFORE INSERT OR UPDATE`。

⚠️ **N6 第一版是壞的元驗證**：把 fixture 孤兒改名成 `Policy2`/`policies`，以為它就不再是孤兒 ——
兩個名字**都不在**索引上，所以它仍是孤兒，`run_all` 照樣 7/7，**exit 0 讀起來像通過**。
更正為 `Risk`/`risks` 才得到 6/7。→ `AD-MetaVerificationBug-1`

**API-level 走查**（真進程 + 真 PostgreSQL，11 項，逐項貼在 `progress.md` Day 3）：
`ISSU-SG1-000001` / `ACTN-SG1-000001` 建立成功 · 跨實體 **404 不是 403** ·
`severity:"urgent"` **400 不是 500** · ⭐ **API 層 oracle**：`issueId` 存在但不可讀、
與完全不存在，兩者回應 `issue or assignee not found` **逐字相同**。

**Verdict**: ⚪ **API-level verified（gate + 真進程 + 真 PostgreSQL），無 UI，不主張可用性。**
本 slice 沒有任何 user-facing surface，**不是** drive-through。

---

## Impact

- **Breaking change**: no
- **Migration**: yes —— `20260812211801_issue_and_action`，**可逆**（drop 兩表 + 4 enum）。
  ⚠️ 目錄名是**本地時間**：Prisma 生成的是 UTC（`20260812131655`），會排在**已套用**的
  `20260812164500_correct_parent_guard_comment`（W07 手建、本地時間）**之前** → `AD-MigrationTimestampTz-1`
- **Config**: 無新增環境變數
- **重啟需求**: 兩個新 module 掛在 `app.module.ts` —— **startup-only wiring**，需重啟
- **Rollback**: migration 反向 + `app.module.ts` 移除兩個 import，~0.5 天。
  ⛔ **detector 不要退** —— 它是 `AD-EntityCountDerivation-1` 的結構性解法，退了計數就回到人算

---

## 相關

- **關掉的待辦**: `AD-EntityCountDerivation-1` ✅ · `AD-EntityIndexIncomplete-1` ✅
- **同類前例**: `CH-020`（W05 複合 FK 首次）· `CH-021`（W06 per-command policy）·
  `CH-022`（W07 trigger —— 本次是它的判準第一次導出**另一個**答案）
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-IssueBareEnum-1` ·
  `AD-MigrationTimestampTz-1` · `AD-ModuleCoverageDilution-1` · `AD-TestNameWiderThanProof-1` ·
  `AD-MetaVerificationBug-1`
