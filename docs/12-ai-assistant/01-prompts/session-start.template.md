# Session Start — APAC ISMS Governance Platform

> Copy 成 `session-start.md` 再填。**Volatile 區塊每次 phase 收尾要更新。**

## 起手步驟

1. 讀 `CLAUDE.md`（always-loaded 規則已在 context）
2. 讀本檔的「當前座標」
3. **分類任務**（`docs/01-planning/PROCESS.md` §1）→ 向使用者確認軌別
4. 依軌別讀對應的 pre-doc；缺了就 STOP（R1）

## 當前座標（volatile — 每次 phase 收尾更新）

| | |
|---|---|
| 當前 phase | `W{NN}-{slug}` — {一句話目標} |
| 狀態 | {Day N / 卡在什麼} |
| 上一個交付 | `W{NN-1}` — {一句話} |
| 進行中的 CH / BUG | |
| 開放問題 | 見 `docs/decision-form.md`（N 項）|

## 權威排序

```
docs/architecture.md + docs/02-architecture/   設計權威
    -> CLAUDE.md                                導航 + 原則
    -> .claude/rules/                           操作規則
    -> 既有程式碼                                現況（不代表正確）
```

## 這個專案容易踩的坑

<!-- 3-5 條。從 memory/ 的 feedback_* 提煉，只留最高頻的。 -->

- {}

## 本 session 不要做的

- 不要自己決定 `docs/decision-form.md` 裡的開放問題 —— STOP and ask
- 不要跳過任務分類直接寫 code（R1）
- 不要把 gate 通過寫成「已驗證」—— user-facing 要 drive-through（R8）
