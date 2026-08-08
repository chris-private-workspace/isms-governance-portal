---
status: done
affects_components: []
---

# CH-009 — 修正三軌分類在 pre-code 階段的失效

**Date**: 2026-08-08
**Phase**: 無（獨立 Change）
**Scope**: docs / rules only — 無 code
**Status**: 已完成（使用者 2026-08-08 核准，含 `AD-RuleBoundary-1` 綁入）
**PR**: #13

---

## Problem

`PROCESS.md:38`（§1.1 決策樹）的 Change 分支判準是「**改現有功能的行為**」。
本專案沒有 code、沒有 runtime、沒有行為 —— 所以嚴格照字面讀，**CH-001～008 有 6 個不該是 Change**：

| 形狀 | 實例 | 現況判定 |
|---|---|---|
| 改既定設計（改了 `02a` / `03` / 已採納 ADR）| CH-001 · 003 · 008 | 🟡 只在廣義解讀下成立 |
| 純稽核／分析（沒改任何東西，產出是報告）| CH-002 · 004 | ❌ 不該走任何軌 |
| 純 ADR（產出就是 ADR 本身）| CH-005 | ❌ 多餘的外殼 |
| 修一直都壞的行為 | CH-006 | ✅ 唯一無爭議正確的 |
| 全新工具 | CH-007 | ⚠️ §1.1 說全新功能 → Phase |

**兩個查證發現（不在原始症狀裡）**：

1. ⭐ **`PROCESS.md` 自我矛盾** —— `:146`（§3.1）說「行為本來就錯 → **Bug-fix**」，
   `:206`（§4.1）說「行為一直都錯 / spec 有缺口 → **Change**」。
   **同一個輸入，兩個相反的路由。**
2. **決策樹三方措辭漂移** —— `CLAUDE.md` 與 `.claude/rules/task-workflow.md` 都寫
   「改現有**行為**」，只有 `PROCESS.md §1.1` 寫「改現有**功能的**行為」並多一個
   acceptance-criteria 條件。

---

## Root Cause

**不是「當初寫錯了」。** 三軌模型來自 `claude-code-dev-template v2.6.1`，它是為
「**有一個在跑的系統，要改它**」設計的。本專案目前處於設計與決策階段 ——
產出是文件不是行為 —— 模板沒有為這個階段準備軌道。

Change 軌被當成**通用容器**使用，因為它是唯一「輕量 + 有 R1 gate」的選項。
這不是有意識的決定，是**預設值漂移**。

同一根因已第二次發作（第一次是 `AD-RuleBoundary-1`：ADR 撰寫時機 vs 文檔成長跟隨 runtime）。
依 `.claude/rules/README.md` §約束強度階梯，**2 次真實踩坑達到修規則的門檻**。

---

## Solution

### 範圍決策（使用者拍板 2026-08-08）

- **不新增第四軌。** `PROCESS.md:67` 自己警告「不要在分類上耗費儀式感」，
  多一條軌 = 多一個分類決策點。改判準措辭 + 加兩條逃生路徑，成本遠低於新軌。
- **不回溯改 CH-001～008。** 變更記錄是歷史 —— 與 `CH-008` 對 `09-analysis/` 報告採取的原則相同。
- **`AD-RuleBoundary-1` 綁進本 CH**（使用者確認）—— 根因相同，且該 AD 備註本就寫著
  「再發生 1 次則在 `14-adr/README.md` 補判準行」，觸發條件已成立。

### 逐項變更

**1. `PROCESS.md` §1.1 判準**（`:38`）—— 「改現有**功能的行為**」→「改現有**行為或既定設計**」。
已採納的 ADR、`02-architecture/` 設計文件、`02a` 資料模型規格都是既定設計。

**2. `PROCESS.md` §1.1 兩條逃生路徑** —— **純稽核／分析**（不改任何東西）→ 直接寫
`09-analysis/` 報告 + commit，不走軌；**純 ADR**（產出就是 ADR）→ 不需要 CH 外殼。

**3. `PROCESS.md` §1.2 分類線索** —— 加三列對應上述形狀。

**4. `PROCESS.md` §3.1**（`:146`）⭐ —— 修與 §4.1 的矛盾，**以 §4.1 為準**。

**5. `PROCESS.md` §3.1** —— 判準措辭同步為「改現有行為或既定設計」。

**6. `CLAUDE.md` §🔴 動手之前** —— 決策樹措辭對齊。⚠️ byte 預算，見 §關鍵設計細節。

**7. `.claude/rules/task-workflow.md` §Step 0** —— 同上對齊（決策樹 + pre-doc 表）。

**8. `docs/14-adr/README.md`** —— 補 ADR forcing-function 判準行，關閉 `AD-RuleBoundary-1`。

### ⭐ 關鍵設計細節

- **「既定設計」不是萬用詞。** 判準是「**這份文件是否已被 approve 並約束後續工作**」。
  `02-architecture/` 設計文件、已採納 ADR、`02a` 規格算；起草中的東西不算。
  沒有這道限制，Change 軌會變成什麼都能塞的垃圾桶 —— 那正是這次要修的病。
- **§3.1/§4.1 矛盾以 §4.1 為準。** 理由不是「哪個先寫」，而是 Bug 軌的核心價值是
  「**為什麼測試沒抓到**」—— 一個從來沒對過的行為沒有「沒抓到」可言，它是 spec 缺口。
  `CH-006`（CI 從第一個 PR 起就沒綠過）的實際經驗支持這個方向。
- **CLAUDE.md 只改措辭，逃生路徑只寫在 `PROCESS.md`。** CLAUDE.md 已寫著
  「完整決策樹…見 PROCESS.md」，它是導航不是規則庫。且 byte headroom 只有 938。
  **A4 要求改完不高於改前** —— 靠刪掉 guardrail 8 裡一句與首句重複的話來補。
- **CH-009 是第一個在新判準下合法的 CH** —— 它改的是 `PROCESS.md`，那是既定設計。
  這不是文字遊戲，是一致性檢查：**一條無法解釋自己的規則不該上線**。
- **ADR forcing-function 判準的形狀是「必要條件」不是「充分條件」** ——
  寫成「只有在有 forcing function 時才可無實作先寫」，而不是「有 forcing function 就該寫」。
  後者會變成製造 forcing function 來正當化預寫。

### 明確不做的

新增第四軌 · 回溯重新分類 CH-001～008 · 動 `_templates/` ·
CLAUDE.md 的 byte 瘦身（→ `AD-ClaudeMdBudget-1`）· Bug 軌 §4.1 的其餘內容（只改被引用到的那列）

---

## Verification

### Gate

`run_all` 6/6（含 `rules-hygiene` 的 byte 預算）· actionlint · CI 綠

### 負面驗證 ⭐

改完後拿 **CH-001～008 逐個重跑新判準**，每一個都必須落到明確的軌或明確的「不走軌」。
**若還有落不進去的，代表判準仍不完整** —— 這是本 CH 唯一能證明修對了的方法。
結果表在 [`progress.md`](./progress.md)。

### Drive-through

⚪ **N/A（純文件 —— gate-only verified）**

---

## Impact

- **Breaking change**: no
- **Migration required**: no
- **Config change**: 無
- **重啟需求**: 無
- **Rollback**: revert PR。⚠️ 但**已依新判準分類過的後續工作不會自動回退**

---

## Acceptance

| # | 條件 |
|---|---|
| A1 | `PROCESS.md` §1.1 判準含「既定設計」+ 兩條逃生路徑 |
| A2 | `PROCESS.md:146` 與 `:206` 不再矛盾 —— 兩處都路由到 Change |
| A3 | 決策樹在 `PROCESS.md` / `CLAUDE.md` / `task-workflow.md` **三處措辭一致** |
| A4 | `CLAUDE.md` byte 數 **≤ 29,062**（CH-009 之前的值）|
| A5 | `14-adr/README.md` 有 ADR forcing-function 判準行 |
| A6 | CH-001～008 逐個重跑新判準，全部有明確去處，表在 `progress.md` |
| A7 | `AD-RuleBoundary-1` 關閉；BACKLOG 同步（R7）|

---

## Changelog

<!-- 偏離記錄。R3：deviation 必須先寫進這裡。 -->

| # | 偏離 | 影響 |
|---|---|---|
| **D1** | A6 的負面驗證跑出**第三個缺口**：`CH-007`（新增 lint detector，1 天）在新判準下**仍落不進去** —— 舊判準說「全新功能 → Phase」，但為 1 天的工具開 phase 四件套是純儀式 | §3.1 加一列：**新增內部工具 / lint / CI 步驟（非產品功能）且 < 3 天 → Change**，界線是「使用者會不會看到它」。這超出 spec 的 8 項逐項變更，但正是 A6「若還有落不進去的，代表判準仍不完整」設計來抓的東西 —— **負面驗證發揮了作用** |

---

## 相關

- **關掉的 AD**: `AD-RuleBoundary-1`
- **產生的待辦**: `AD-ClaudeMdBudget-1`（CLAUDE.md 已用 96.9%，headroom 938 bytes）
- **上游**: `CH-008` §Root Cause 的同一個根因（模板規則假設 code 存在）
- **後續**: `ADR-0011`（計算平台）· `CH-010`（Azure 資源清單）—— 兩者都會是新判準的首批使用者
