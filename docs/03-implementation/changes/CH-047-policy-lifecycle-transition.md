# CH-047: Policy 生命週期轉換 —— 這個 repo 的第一條 update 路徑

**Date**: 2026-08-21
**Phase**: W25
**Scope**: `workflow`（新）· `core-model`（repository / 型別 / 錯誤分類）· `modules`（policy controller）
**Components**: —
**PR**: **PR-pending**

---

## Problem

**`Policy.status` 在 API 層有 0 條寫入路徑。** 六個生命週期狀態自 W03 起就在 schema 裡
（`apps/api/prisma/schema.prisma:373-382`），`/policies` 也真的把它們渲染出來 ——
但**沒有任何方式可以改變它**。`policy.controller.ts` 當時只有 `GET` × 2 與 `POST`，
沒有 `@Put` / `@Patch`；全 `apps/api` 唯一寫 status 的地方是 `prisma/seed.ts`。

⇒ 平台顯示著一個沒有人能推進的生命週期。同時 **OQ-7 擋著 M5**
（`07-wave1-build-plan.md:36`「drives the policy approval flow」）。

**量化**：W25 Day 0 實測 —— 整棵產品樹 `client.*.update` / `.delete` **零命中**
（4 個命中全非 domain 寫入：`chain.ts` 的 crypto `.update()` × 3、`ref-code.ts:97` 的內部計數器）。

---

## Root Cause

**不是「還沒做」。** 根因是**兩個先前的設計決定各自把 update 推走了，而沒有人回頭問「那生命週期怎麼辦」**：

1. `runScoped` 一次呼叫 = 一個 `$transaction`（`apps/api/src/entity-scope/scoped-prisma.provider.ts:97-113`），
   所以「兩個寫入必須是一個工作單元」的需求無法在應用層滿足。
   W10 需要移動指標 → 推進資料庫 trigger；W14 需要更正 → 改成「更正就是新增一筆」。
2. 於是 `scoped-client.types.ts` 到 W25 之前**一個 `update` delegate 都沒有** ——
   每個介面都只有 `findMany` + `create`。

⇒ 兩次迴避都合理，但它們合起來讓「生命週期轉換」這個**無法迴避 update 的需求**沒有落點。
`audit-coverage.int.spec.ts:26-32` 早就寫下了這個洞：「Updates and deletes are audited by
construction (WRITE_OPERATIONS lists them) but **nothing exercises that path yet**」。

---

## Solution

建出第一條轉換路徑，並讓**合法性**與**並行控制**分屬兩層。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/api/src/workflow/transitions.ts:68` | 新增 | 轉換表，**窮舉 `Record<PolicyStatus, …>`** —— schema 加減狀態是編譯錯誤 |
| `apps/api/src/workflow/transition.guard.ts:78` | 新增 | `assertTransition`，純 predicate；錯誤帶 `from`/`to`/**`allowed` 集合** |
| `apps/api/src/core-model/policy.repository.ts:147` | 修改 | `transitionStatus()` —— **compare-and-set** |
| `apps/api/src/core-model/policy.repository.ts:111` | 修改 | `byId()` —— 用既有的 `findMany` delegate，不加寬介面 |
| `apps/api/src/core-model/scoped-client.types.ts:112` | 修改 | `policy.update` —— **該檔案的第一個 `update` delegate** |
| `apps/api/src/core-model/scope-refusal.ts:184` | 修改 | `isRecordNotFound()`（P2025）—— 該檔第一個非 SQLSTATE 碼 |
| `apps/api/src/modules/policy/policy.controller.ts:143` | 修改 | `PATCH /policies/:id/status` |

### ⭐ 三個 load-bearing 細節（拿掉就會壞，而且壞得很安靜）

1. **`expected` 必須在 `where` 裡，不能在上面的 `if` 裡**（`policy.repository.ts:153`）。
   read-then-write 跨兩個交易 ⇒ TOCTOU 窗 ⇒ 稽核列會宣稱一次「從它已經離開的狀態」出發的轉換。
   `policy.repository.spec.ts` 為此**斷言位置而非結果**。
2. ⛔ **必須用 `update` 不是 `updateMany`**。後者匹配不到時回 `{count:0}` 而交易**照樣 COMMIT**
   ⇒ 留下一筆宣稱轉換發生了的稽核列（稽核 entry 在寫入之前就進了同一交易，且讀不到寫入結果）。
   `update` 會拋 → 回滾 → 稽核列一起消失。
3. **守衛套在 `modules` 不在 `core-model`**：`eslint.config.mjs` 的
   `MATRIX['core-model'] = ['api','core-model']` ⇒ repository 不被允許知道生命週期。
   讓它知道就等於狀態機有了第二個定義處。

---

## Verification

**Gate**: lint **0** · type-check **0** · format **0** ·
api unit **507**（baseline 484 → **+23**）· api int **280**（baseline 269 → **+11**）·
web **104**（不變）· build clean · `run_all` **11/11**

**新增測試**:

- `apps/api/src/workflow/transition.guard.spec.ts`（17）—— **三次中性化預測全部逐格命中**：
  守衛 no-op ⇒ 5 紅 · 刪一條邊 ⇒ 1 紅且總數 17→**16** · 加偽邊 ⇒ 2 紅。
  ⭐ 刪邊那次揭露：導出的 `it.each` 對「漏抄一條邊」**零偵測力**（案例消失而非轉紅），
  擋住它的只有可達性斷言。
- `apps/api/src/workflow/workflow.int.spec.ts`（11）—— 約束 8 的四個範疇測試，
  其中「RLS 層獨立成立」用 **raw SQL 連線**（無任何應用層）驗證 `rowCount 0`。
  另**把三條結構性限制釘成測試**：`before` 恆 NULL · create/update 的 `resource_id` 不同 ·
  滾升 scope 不能轉換。
- `apps/api/src/core-model/policy.repository.spec.ts`（+6）

**Drive-through**: ✅ **PASS**（真 UI + 真後端 + 真 DB，2026-08-21）

`POL-SG1-000002` 由 `draft` 經 `in_review → approved` 推到 `published`，**列表徽章跟著變**；
兩次非法轉換各得 **HTTP 422** 且 body 列出 `allowed`。
真 dev DB 直查：**恰好 3 筆 `Policy.update`**，兩次 422 **一筆都沒留**；
`prev_hash` 逐列等於前一列 `row_hash`（4 筆全 `chained = t`，`row_hash` 32 bytes）
⇒ **本 repo 第一次在 update 路徑上驗證防篡改鏈**。
截圖：`docs/01-planning/W25-oq7-workflow-spike/artifacts/day3-policies-after-transition.png`

⛔ **射程**：轉換能力已 drive-through 驗證，**但 `/policies` 上沒有控件會呼叫它**
（plan §3.x 排除建控件）。**使用者今天無法從介面推進政策狀態。**

**Verdict**: ✅ PASS（含上述射程限制）

---

## Impact

- **Breaking change**: no —— 純新增端點
- **Migration**: no —— 狀態值早已在 schema
- **Config**: 無
- **重啟需求**: 有（新路由是 startup-time wiring）。驗證用的證據行：
  `LOG [RouterExplorer] Mapped {/policies/:id/status, PATCH} route`
- **Rollback**: revert 本片的 7 個檔；無資料變更需要回復（狀態欄位本來就存在）。估 < 1 hr

---

## 相關

- **關掉的待辦**: OQ-7（`docs/decision-form.md`）· ADR-0002 已採納
- **同類前例**: 無 —— 這是本 repo 的第一條 domain update 路徑
- **產生的待辦** → `docs/01-planning/BACKLOG.md`（UI 入口缺口 · `shell.inert` 文案 ·
  `loc-*` 尺粒度 · seed 繞過 repository · `audit-coverage` 註解 orphan claim）
