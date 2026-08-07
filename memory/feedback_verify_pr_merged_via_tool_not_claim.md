---
name: verify-pr-merged-via-tool-not-claim
description: "一份『PR 已 merge』的回報，可能是一個仍然 BLOCKED 的 PR。同步主分支之前用 gh 驗證。"
metadata:
  type: feedback
---

# 「PR 已 merge」必須用工具驗證，不能相信宣稱

**規則**：在同步主分支、或宣告 phase 完成之前，**用工具驗證** PR 真的 merged 了：

```bash
gh pr view <N> --json state,mergedAt,mergeStateStatus
```

## 為什麼

一份「PR 已 merge」的回報，實際上可能是：

- PR 仍然 `BLOCKED`（required check 沒回報 / 有衝突 / 等審查）
- PR 是 `OPEN` 但 CI 綠了 —— 看起來「可以 merge」被誤讀成「已 merge」
- PR 被 close 而非 merge

**後果**：基於錯誤的 merge 狀態去同步主分支 / 開下一個分支 / 更新狀態文件，
會產生一連串需要回頭修正的錯誤紀錄。

## 常見的卡住原因

| 症狀 | 根因 | 解法 |
|------|------|------|
| Required check 從未回報 | CI 有 paths filter，docs-only PR 不觸發 | 拿掉 paths filter（讓每個 PR 都跑完整 CI）|
| Check 卡在 pending | webhook 遺失 / 延遲 | 推一個空 commit 或改一行註解重新觸發 |
| 看起來綠但仍 BLOCKED | required check 的名稱與實際 job 名不符 | 對照 branch protection 設定的名稱 |

## Post-Merge Status Flip

Phase closeout 的文件是在 PR merge **之前**寫的 → 它們標的是 `PR-pending`。

`gh` 驗證 merge 之後，把這**兩個當前狀態面**翻成 `MERGED (PR #N, <sha>)`：

1. `CLAUDE.md` 的 `Current Phase` 那一格
2. `docs/01-planning/BACKLOG.md` 開頭的 carryover 區塊

更舊的區塊是歷史快照，不用每次都掃 —— 只有累積到會誤導人時才批次修正。

## 一般化

這條規則是 [[feedback_never_fabricate_tool_results]] 的一個特例：

> **任何「某個外部狀態已經改變」的宣稱，都要用工具重新查證。**

適用於：PR merged / 部署完成 / 服務已重啟 / migration 已套用 / 檔案已推送。
