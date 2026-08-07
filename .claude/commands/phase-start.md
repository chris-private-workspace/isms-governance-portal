---
description: 開新 phase — 依 frozen template 產生 plan + checklist，等使用者核可
argument-hint: [phase id, e.g. 3.2] [scope phrase]
---

# Phase Start

開一個新 phase。**這一步只產生文件，不寫任何 code。**

## 你要做的事

### 1. 確認起點

- 讀 `docs/01-planning/BACKLOG.md` §Open Carryover ADs
- 若使用者沒指定目標 → **列出 P0/P1 候選讓使用者挑**，不要自己選
- 確認 phase 編號（接續前一個；查 `docs/02-architecture/` 現有的最大號）

### 2. 讀 frozen template（強制）

```
docs/01-planning/_templates/phase/plan.md.tpl
docs/01-planning/_templates/phase/checklist.md.tpl
```

⚠️ **對照的是這兩個檔案，不是上一個 phase 的 plan。**
「模仿最近一個 phase」是相對錨點，會造成逐次累積的格式漂移。

### 3. 做 recon（起草前）

在寫 plan 之前，先讀真實的 code：

- Grep 相關的既有實作（**建新東西前必須先確認它不存在**）
- 讀出 root cause 的 `file:line` 錨點
- 記錄當前 baseline 數字（test / lint / build）

plan §0 的 Root cause 表和 Ground truth 區塊**必須有真實的 `file:line`**，
不可以是推測。

### 4. 查 calibration

Read `docs/01-planning/CALIBRATION-MATRIX.md`：

- 找出這個 phase 的 scope class + 乘數
- 決定 `Agent-delegated:` 的值（yes / no / partial / TBD-Day-1-decision）
- 算出三段式或四段式的承諾工時

### 5. 產生 plan + checklist

- Plan: `docs/01-planning/W{NN}-{slug}/plan.md`
- Checklist: `docs/01-planning/W{NN}-{slug}/checklist.md`

**結構完全照 frozen template**。範圍差異用 content 表達，不改 structure。

### 6. 停下來等核可

產生完之後：

- 摘要 §1 Phase Goal + §4 File Change List + §7 Workload 給使用者
- **明確問「是否核可執行」**
- 核可前**不要**開分支、**不要**寫 code

## 檢查清單

- [ ] Plan 的 H1 是**一行短句**（不是一段話）
- [ ] §0 用小標題 + 換行（不是散文牆）
- [ ] §0 Root cause 表有真實 `file:line`
- [ ] §4 File Change List 含 UNTOUCHED 行
- [ ] §5 有 drive-through 判準（若 user-facing）
- [ ] §7 有 scope class + Agent-delegated + 三/四段式
- [ ] §9 Out of Scope 有列出「誘人但不做」的項目
- [ ] Checklist 是 Day 0-4，每項有 DoD + Verify
- [ ] Checklist **沒有**時間估算

$ARGUMENTS
