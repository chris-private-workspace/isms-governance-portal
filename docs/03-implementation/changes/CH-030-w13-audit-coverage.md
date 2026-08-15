# CH-030: Connect the audit trail to every model that has a write path

**Date**: 2026-08-15
**Phase**: W13
**Scope**: audit-trail（+ entity-scope / modules 的既有測試補強）
**Components**: —
**PR**: #61

---

## Problem

W12 交付了稽核機制（`audit_log` + 攔截點 + `verifyChain`）並拍板 ADR-0003，
但 `audit.module.ts:38` 的 `AUDITED_MODELS` 只有 **一個名字**（`StatementOfApplicability`）。

`07` §Security gate 寫的是「no milestone is done until **every state change is audited**」
⇒ **M1 的 DoD 從「不可達」變成「可達但未達」**，而**沒有任何機械檢查在守這個差別**。

⚠️ 這與 `RISK_REGISTER` R4 原本的失效模式**完全相同**：每個新增業務表的 phase 都讓分母變大，
而沒有東西會叫。W12 之前它已經這樣走了十個 phase。

量化：**稽核覆蓋 1 / 21 張業務表**。稽核員能問「誰改了這份 SoA」，
但對 `Issue.status` 一次正式的風險接受、對 `RMReportVersion` 一份不可變的受控交付物、
對 `Evidence` 一個存在目的就是證據等級主張的實體 —— **一個字都答不出來**。

---

## Root Cause

**不是「還沒做」。** W12 刻意只接一個模組，理由寫在 `audit.recorder.ts:118-124`：
在 ADR-0003 選定策略之前，先從一條真實寫入路徑取得數字，比先接十一個模組更有價值。
那個判斷是對的。

真正的根因是**那個刻意的暫時狀態沒有任何到期機制**：允許清單是一個 `Set` 字面值，
少一個名字不會 fail 任何 gate、不會出現在任何報表、不會有人被問。
⇒ 與 `AD-DeferralUnwatched-1` 同族：**解封條件寫得很好、可檢查、而沒有東西在看**。

---

## Solution

**核心改動只有一行**（允許清單 1 → 15），工作量在**證明**。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/api/src/audit-trail/audit.module.ts:67` | 修改 | `AUDITED_MODELS` 1 → **15**；**枚舉方法**與**兩個排除的理由**寫在常數旁 |
| `apps/api/src/audit-trail/audit-coverage.int.spec.ts` | **新增** | 15 條逐模型覆蓋測試 + **1 條漂移守衛** |
| `apps/api/src/entity-scope/entity-scope.int.spec.ts:155,168` | 修改 | 補非空前提（`AD-VacuousScopeTest-1`）|
| `apps/api/src/modules/asset/asset.int.spec.ts:282` | 修改 | 同上 |
| `apps/api/src/modules/risk/risk.int.spec.ts:353` | 修改 | 同上 —— ⚠️ 此處 seed 無 `risks`，前提**必須自建** |

### 覆蓋率（⛔ 機械導出，不是手寫累加）

導出方法（可重跑，`AD-RiskTableCountManual-1` 要求）：

```
audited     = AUDITED_MODELS 的字串數                                        -> 15
tables      = grep -c '^model' apps/api/prisma/schema.prisma                 -> 22
business    = tables - 1  (AuditLog 是稽核表自身，不是業務表)                 -> 21
```

| 分類 | 數 | 名單 |
|---|---|---|
| **已稽核** | **15** | `Policy` `AssetGroup` `Asset` `Risk` `Control` `ControlTest` `Evidence` `Issue` `Action` `AssessmentTemplate` `AssessmentInstance` `AssessmentResponse` `RiskManagementReport` `RMReportVersion` `StatementOfApplicability` |
| 可達但刻意不接 | 1 | `RefCodeCounter` —— 見下 |
| 無 repository 寫入路徑 | 5 | `OrgEntity` `User` `ExtensionField` `Threat` `Vulnerability` |
| **合計** | **21** | 15 + 1 + 5 = 21 ✅ 與 `business` 相符 |

⛔ **五個不可達的模型不加進清單。** 一個永遠不會被觸發的允許清單項會讓覆蓋率**看起來**更好，
那正是 AP-3。它們有寫入路徑時再加，而**漂移守衛就是負責說出那一刻的東西**。

### ⛔ 「覆蓋」一詞的限定，必須連著數字一起讀

**接上 15 個模型 ≠ 稽核了所有狀態變更類型。**
W13 Day 0 枚舉到全 codebase **零個 `client.*.update`、零個 `.delete`** ——
15 個領域寫入**全部是 `create`**。`update` 測試走 raw SQL 驗 RLS，而 raw query 沒有 model，
**不被稽核**（已命名的洞，ADR-0003 記載）。

⇒ 正確讀法：**每一個有寫入路徑的模型，它的 create 都留下稽核列。**
`update` / `delete` 由構造涵蓋（`WRITE_OPERATIONS` 列了它們），但**今天沒有任何東西走那條路**。

### `RefCodeCounter` 刻意不接 —— 三條理由**全部是量出來的**（Day 3 N3）

| # | 實測 |
|---|---|
| 1 | 一次領域 create 產生 **2 列**稽核，第二列 `resource_id` **null**、`after` **null**（upsert 的 args 是 `{where, create, update}`，沒有 `data` key）|
| 2 | **多實體 scope 下 throw**：`UnattributableWriteError: refusing RefCodeCounter.upsert: no org_entity_id in the payload and the scope names 2 entities, so the audit row would guess` ⇒ 滾升角色的**每個 create 都會失敗** |
| 3 | ⭐ **失敗的寫入會留下稽核列** —— `issueRefCode` 跑在自己的交易裡、在領域 insert 之前（`policy.repository.ts:107` 從 W03 就寫明「two statements, not one transaction」），所以領域寫入被拒時 counter 那列**已經 commit**。稽核軌跡會記錄**一件沒有發生的事** |

⇒ 第 3 條是**實測撞出來的，不在原本的推理裡**。對稽核員而言，一列假的比缺一列更糟。

### load-bearing 細節（拿掉就會壞，但不明顯）

- **`audit-coverage.int.spec.ts` 必須 composes `AppModule`。** Day 2 實測：同一個 `AssetGroup` create
  在 `AppModule` 圖下寫一列、在 `AssetModule` 圖下 **`before=9 after=9`**。
  `AuditModule` 是 `@Global` 但 global provider **只在被拉進圖裡才生效**，
  而 `ScopedPrismaFactory` 對 hook 是 `@Optional`（`scoped-prisma.provider.ts:151-165` 解釋為何必須如此）。
  ⇒ 原 plan 要把覆蓋測試放進 11 個模組 spec，**在那些圖裡稽核是關的**。
- **覆蓋斷言依 `refCode` 查，不用 count delta。** 兩個 suite 現在都 composes `AppModule`，
  jest 平行 worker 共用一個 DB ⇒ 「表長了一列」是兩者之間的 race。
- **漂移守衛自帶非空前提**（`reachable.size > 10`）—— 否則掃不到檔案時它自己就是空集合上的真。

---

## Verification

**Gate**（十一項，各自取 exit code）: format ×2 **0/0** · lint **0** · type-check **0** ·
build ×2 **0/0** · `lint:negative` **PASS** · api unit **451/38** · **api int 203/16**（baseline 187 → **+16**）·
web **10/1** · coverage **92.27 / 91.66 / 98.95 / 93.64**（與 baseline **逐位相同**）·
`run_all` **8/8** · `check_entity_index` **21/35**（**未變動** —— 本片不建表）

**新增測試**: `audit-coverage.int.spec.ts` —— 15 條逐模型覆蓋（**斷言恰好一列**，依本次 `refCode` 查）
+ 1 條**漂移守衛**（從 `core-model` 原始碼導出寫入面，與清單雙向比對）。

**負面測試（中性化，預期方向先 commit `54a509a` 再執行）**:

| N | 做什麼 | 預期紅 | 實際紅 | |
|---|---|---|---|---|
| N1 | 清空允許清單 | 26 | **27** | ⚠️ 少算 `bench.int.spec.ts:217`（它有自己的健全性檢查）|
| **N2** | **只移除 `Issue` 一個名字** | **恰好 2** | **恰好 2** | ✅ ⭐ **其餘 14 條未動** |
| N3 | 補回 `RefCodeCounter` | 2 | **5** | ⚠️ 三個量測全中；第 5 個紅的給出上表第 3 條理由 |
| N4 | 拿掉前提斷言 + 保持 V3 中性化 | **0** | **0** | ✅ 證明前提是唯一讓 V3 紅的東西 |

⭐ **N2 是本片唯一能區分「真覆蓋」與「宣稱覆蓋」的證據**：加 15 個字串進 Set 會讓數字變好看，
而沒有任何測試會在名字被刪時轉紅 —— 那是教科書級的 Potemkin。N2 給的正是預測的形狀。

⚠️ **N1 的預測失誤值得記**：我只列了「預期會受影響的兩個 suite」，沒有 grep 誰 import
`AUDITED_MODELS`（答案是 **4 個**檔案）。Day 0 的覆蓋聲明**明確寫了「未掃 `bench.int.spec.ts`」**
—— 記下盲點，卻沒讓它觸發任何動作。

**Drive-through**: ⚪ **不適用** —— 本 phase 無 user-facing surface。

**Verdict**: ⚪ N/A（純後端 —— **gate-only verified**）

---

## Impact

- **Breaking change**: no —— 純新增稽核列；無 API / schema 變更
- **Migration**: no
- **Config**: 無新增環境變數
- **重啟需求**: ⚠️ **有** —— `AUDITED_MODELS` 在 `AuditModule` 建構時注入 `AuditLogRecorder`，
  是 **startup-only wiring**。跑中的程序不會撿到新清單（Risk Class C）
- **Rollback**: 還原 `audit.module.ts` 的常數即可（~1 min）。⚠️ 已寫入的稽核列不會消失，
  也**不應**被刪除 —— 表是 append-only 且應用角色無 DELETE 權限（W12 量到 42501）
- **寫入成本**: 每個領域 create **+1 列**稽核（同一個交易）。
  🚧 `AssessmentResponse` 的批次成本（`AD-ResponseRefCodeCost-1`：40 題 = 40 次發號 + 現在 40 列稽核）
  **本片未量** —— 覆蓋測試只寫 1 筆，量不到

---

## 相關

- **關掉的待辦**: `AD-AuditCoverageOneTable-1`（🔴 P0）· `AD-VacuousScopeTest-1` 的**通則部分**
- **同類前例**: `CH-029`（W12，機制）—— 本片是同一條 M3 arc 的第 2 片
- **產生的待辦** → `docs/01-planning/BACKLOG.md`
