# BUG-{NNN} — Checklist

> 從 [`report.md`](./report.md) §7 導出。
> 🔴 **只能 `[ ]` -> `[x]`，不能刪未勾選項**（PROCESS R6）。

## 調查

- [ ] **本地重現**
  - DoD: 照 report §2 步驟能穩定重現
  - Verify: `{指令}`
- [ ] **根因確認**
  - DoD: 能指出 `file:line` 並解釋**為什麼**會這樣，不只是「改這行就好了」
  - 寫回 report §6

## 修復

- [ ] **{修復動作}**
  - DoD: {}
  - Verify: `{指令}`

## Regression test（不可略）

- [ ] **新增測試**
  - DoD: **修之前 fail、修之後 pass** —— 兩個方向都要實際跑過
  - Verify: `git stash && {測試指令}` （應 fail）→ `git stash pop && {測試指令}`（應 pass）

## 驗證

- [ ] **在環境中重跑 report §2 的重現步驟**
  - DoD: 症狀消失
- [ ] **檢查同類型的其他位置**
  - DoD: 同一個 pattern 有沒有出現在別處（Grep）；有就一併處理或開 BACKLOG

## 收尾

- [ ] Sev1/Sev2 -> `postmortem.md`
- [ ] 新的風險型態 -> `../../../01-planning/RISK_REGISTER.md`
- [ ] BACKLOG 同步（R7）
