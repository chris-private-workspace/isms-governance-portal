# CH-018: Governed extension storage, and the first business endpoint that consumes it

**Date**: 2026-08-10
**Phase**: W03
**Scope**: `core-model` · `entity-scope`（消費）· `modules` · bootstrap
**Components**: —
**PR**: **MERGED** #31（`b20f3f1`，2026-08-10）

---

## Problem

`07:32` 的 **M1 DoD 明文要求** "governed-extension mechanism **working**"，而該機制的儲存與驗證
方式（OQ-6 / ADR-0005）自 2026-08-07 起在 `decision-form.md` 開放中，標「⚠️ 未指定決策者」。

實務後果不是「少一個功能」，是 **M1 的第一張表不能建** —— 欄位形狀取決於一個沒有答案的問題。
M1 是所有模組的地基，它被擋住等於整個 Wave 1 被擋住。

同時 guardrail 3 的「canonical core + **governed** local extensions」只有前半句能執行：
13 家 OpCo 一旦需要在地欄位，**各自加欄位**是唯一可行路徑 —— 那正是設計原則 2 指名要避免的分叉。

---

## Root Cause

不是「還沒做」。根因是 **W02 交付了機制卻沒有消費者**：

- `apps/api/src/core-model/` 在 W02 結束時只有 `prisma.service.ts` —— 沒有 repository
- 因此 `scope-boundaries.md:120-128` 的「`core-model` 經 DI 取得範疇化 client」
  **從未被任何程式碼驗證過**，卻已寫成設計文件的一節（`AD-ScopedClientDI-1`）
- 而 ADR-0005 需要知道「驗證放在哪一層」才拍得了板，那又取決於 RLS `WITH CHECK`
  管不管得到 JSONB 內容 —— 一個**只能量測、不能推論**的問題

三者互相擋住：沒有 repository 就驗不了 DI；沒有量測就寫不了 ADR；沒有 ADR 就不敢建表。

---

## Solution

**同一個 phase 內把三者一起解開**：先量測（Day 1），據以拍板（ADR-0005），再用它建出第一條
真實的後端垂直切片（Day 2-3）。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/14-adr/0005-governed-extension-storage.md` | 新增 | JSONB + catalog；**應用層 + DB trigger 雙層**；4 條可證偽條件 |
| `apps/api/prisma/schema.prisma` | 修改 | `Policy.extensions` + `model ExtensionField`（`orgEntityId` **nullable** = 全域）|
| `prisma/migrations/20260810134319_governed_extensions/` | 新增 | 欄位 + catalog 表 + RLS（`:80-83`）+ trigger（`:94-153`）**同一個 migration** |
| `core-model/scoped-client.types.ts:52-60` | 新增 | `core-model` 宣告它需要的**結構型別**；實例由 `modules` 傳入 |
| `core-model/policy.repository.ts:69-100` | 新增 | 第一個範疇化 client 的消費者；**不持有裸 client** |
| `core-model/extension-validator.ts:75-107` | 新增 | catalog 驅動；型別名對齊 `jsonb_typeof` 的輸出詞彙 |
| `core-model/scope-refusal.ts:66-97` | 新增 | 把 RLS 的 `42501` 翻成領域錯誤（drive-through 發現，見下）|
| `modules/policy/policy.controller.ts:70-137` | 新增 | 三個端點；404-not-403；422 帶 key |
| `modules/policy/dev-principal.ts:54-104` | 新增 | 範疇的臨時來源；**production 拋錯**、boot 時警告、每筆回應帶標記 |
| `bootstrap/security.ts:78,131` | 修改 | 全域 `Cache-Control: no-store, private`（關 `AD-CacheControl-1`）|
| `test/int-global-setup.js:74-95` | 修改 | catalog seed。⚠️ **不在 plan §4 清單內** —— deviation 見 progress.md |

### 三個 load-bearing 細節（拿掉就會壞）

1. **兩層讀的是同一份 catalog rows** —— `extension-validator.ts:75-107` 與 trigger
   `migration.sql:94-153` 都不硬編欄位清單。這是它們不會分歧的唯一理由（AP-6）。
2. **catalog 的 `WITH CHECK` 比 `USING` 窄**（`migration.sql:73-83`）—— 全域欄位讀得到、
   寫不進去。替全體宣告不是單一 OpCo 有權做的事，代價是 seed 必須走 owner 連線。
3. **`ScopeRefusedError` 只攜帶呼叫者自己送來的 `orgEntityId`**（`scope-refusal.ts:66-73`）——
   絕不可擴充成「從資料庫查那個實體存不存在」，那正是約束 8 拒絕透露的事實。

---

## Verification

**Gate**: lint 0 · type-check 0 · format 0 · `run_all` **6/6** · `lint:negative` PASS（17 檔 0 bypass）·
unit **78 passed**（baseline 33 → **+45**）· int **32 passed**（baseline 20 → **+12**）· web 10 · build 0
覆蓋率 **93.69 / 90.21 / 92 / 94.32**

**新增測試（負面為主）**:

- `extension-validator.spec.ts` —— 未宣告 key / 型別不符 / 缺 required 各一
- `policy.repository.spec.ts` —— **驗證失敗時 `create` 從未被呼叫**（不是「有拋錯」而已）
- `policy.int.spec.ts` —— 約束 8 四項 + **三個繞過 validator 直接寫的 trigger 案例** +
  40 次交錯的並行範疇測試 + **案例 2b 釘住 RLS-before-FK 的評估順序**
- `scope-refusal.spec.ts` —— fixture **從真 log 轉錄**，含 5 條「必須不匹配」
- `dev-principal.spec.ts` —— production 三個入口皆拋錯

**元驗證（每個宣稱會擋東西的機制都弄壞一次）**:

| 弄壞什麼 | 結果 |
|---|---|
| trigger 中性化 | int **3 failed** —— 正是那三個繞過 validator 的測試 |
| validator 中性化 | unit **8 failed** · int **只有 2 failed** —— ⭐ 那三個「database refuses」**仍然通過** |
| RLS policy → `USING (true)` | 範疇測試紅 → 還原 → 綠 |

第二列是本 phase 最有價值的觀測：**應用層完全失效時，資料完整性仍然成立。**

**Drive-through**: ⚪ 無 user-facing surface。但 Day 3 做了 **API 級驗證**（真進程 + 真
PostgreSQL + 真 RLS，11 案例 + 3 個 oracle 探測），**並因此發現一個所有 gate 都沒抓到的缺陷** ——
跨實體寫入回 500 而非 404。詳見 progress.md「Day 3（續）」。

**Verdict**: ✅ PASS —— **API-level verified against a clean process**。
⚠️ **不是「可用」**：沒有 UI，沒有人透過 UI 用過它。

---

## Impact

- **Breaking change**: no（新增表與欄位，既有行為不變）
- **Migration**: yes —— `20260810134319_governed_extensions`。**可逆但有代價**：
  drop trigger + catalog 表即回到未治理狀態，已寫入的 `extensions` 內容會失去驗證來源
- **Config**: `DEV_PRINCIPAL_ENTITIES`（預設 `SG1`）· `DEV_PRINCIPAL_ROLLUP`（預設關）——
  **兩者在 `NODE_ENV=production` 下無效，devPrincipal() 直接拋錯**
- **重啟需求**: ⚠️ **是** —— `applySecurity()` 的 header 中介層與 `PolicyModule` 的載入
  都是 startup-only。對著陳舊進程驗證會看到修正「沒生效」（Risk Class C，本 phase 再次踩到）
- **Rollback**: revert 本 phase 的 5 個 commit + `prisma migrate resolve --rolled-back`；估 ~1 hr

---

## 相關

- **關掉的待辦**: `AD-CacheControl-1` ✅ · `AD-ScopedClientDI-1` ✅ · `AD-ScopeConcurrency-1` ✅ ·
  `decision-form.md` **OQ-6** ✅
- **同類前例**: `AD-NegativeGate-1` 的第 6 個負面 gate（W02 是第 5 個）——
  本次的結構性貢獻是**元驗證量到兩層的獨立性**，而不是再寫一次紀律
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-CalibrationMetric-1` ·
  `AD-DevDbDrift-1` · `AD-ExtensionQueryCost-1`
