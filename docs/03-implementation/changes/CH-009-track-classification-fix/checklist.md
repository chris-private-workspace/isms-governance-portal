# CH-009 — Checklist

> 從 [`spec.md`](./spec.md) §Acceptance 導出。
> 🔴 **只能 `[ ]` -> `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

## 實作

### PROCESS.md（權威來源，先改）

- [x] **§1.1 判準：「改現有功能的行為」→「改現有行為或既定設計」**
  - DoD: 含「既定設計」的定義限制（已 approve 且約束後續工作）
- [x] **§1.1 兩條逃生路徑**
  - DoD: 純稽核／分析 → 不走軌；純 ADR → 不需要 CH 外殼
- [x] **§1.2 分類線索加三列**
  - DoD: 三種形狀（改設計 / 稽核 / ADR）各有一列使用者說法
- [x] **⭐ §3.1 修與 §4.1 的矛盾**
  - DoD: `:146` 不再說「行為本來就錯 → Bug-fix」；兩處都路由到 Change
  - Verify: Grep `行為一直都錯|行為本來就錯` 只剩一致的敘述
- [x] **§3.1 判準措辭同步**

### 導航層（對齊，不新增內容）

- [x] **`CLAUDE.md` §🔴 動手之前 決策樹**
  - DoD: 措辭與 PROCESS §1.1 一致；**byte 數 ≤ 29,062**
  - Verify: `python scripts/lint/check_rules_hygiene.py` + 實際 byte 比對
- [x] **`.claude/rules/task-workflow.md` §Step 0**
  - DoD: 決策樹 + pre-doc 表兩處都對齊

### AD-RuleBoundary-1

- [x] **`docs/14-adr/README.md` 補 ADR forcing-function 判準行**
  - DoD: 寫成**必要條件**（只有在有 forcing function 時才可無實作先寫），不是充分條件

### 追蹤層

- [x] **`BACKLOG.md`** — 關 `AD-RuleBoundary-1` · 新增 `AD-ClaudeMdBudget-1` · §Shipped 加 CH-009

## 測試

- [x] **無新增測試（純文件）**
  - Verify: `python scripts/lint/run_all.py`

## 驗收（對應 spec §Acceptance）

- [x] **A1** §1.1 判準含「既定設計」+ 兩條逃生路徑
- [x] **A2** `:146` 與 `:206` 不再矛盾
- [x] **A3** 三處措辭一致 — Verify: 逐處 Read 比對
- [x] **A4** `CLAUDE.md` ≤ 29,062 bytes
- [x] **A5** `14-adr/README.md` 有 forcing-function 判準行
- [x] **A6** ⭐ **CH-001～008 逐個重跑新判準全部有明確去處** — 表進 `progress.md`
- [x] **A7** `AD-RuleBoundary-1` 關閉；BACKLOG 同步

## Drive-through

- [x] **N/A —— 純文件變更，無 user-facing 行為**（PROCESS R8 豁免；報告寫 gate-only verified）

## 收尾

- [x] `progress.md` 寫完成摘要，`spec.md` status -> `done`
- [x] BACKLOG 同步（R7）
- [x] 架構級決定有 ADR（R5）—— N/A，本 CH 改的是流程不是架構
