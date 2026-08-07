---
description: 存檔當前進度 — 更新 checklist / progress，整理接手點，準備結束 session
---

# Save Progress

隨時可用。目標：**讓下一個 session（或明天的你）能無縫接手。**

## 1. 更新 Checklist

`docs/01-planning/W{NN}-{slug}/checklist.md`

- 完成的項目 `[ ]` → `[x]`
- 被擋住的：在該項下加 `🚧 阻塞: <原因>`
- ⚠️ **絕不刪除**未勾選的 `[ ]` 項

## 2. 寫 progress.md 今日條目

`docs/01-planning/W{NN}-{slug}/progress.md`

```markdown
## Day N — YYYY-MM-DD — <theme>

### Today's Accomplishments
- Task N.M <deliverable> — actual <Z> min（est ~<W> min，delta ±N%）

### Issues / Discoveries
- <阻塞 / 意外發現 / 要記住的事>

### Remaining for Next Day
- Task N.X（前置工作已完成：<什麼>）

### Notes
- <學到的 / 決策 / 風險>
```

**逐任務的實際時間住在這裡** —— checklist 不放時間估算。

## 3. 檢查工作區狀態

```bash
git branch --show-current    # 確認在對的分支
git status                   # 有沒有沒 commit 的東西
```

- 未 commit 的工作：commit 掉（訊息對應 checklist task ID），或明確記在 progress.md
- **不要**留一堆未 commit 的變更就結束 session

## 4. 跑一次 gate（若有 code 變更）

```bash
<lint 指令> && <type check 指令；無型別系統則填 echo 'n/a'> && <test 指令>
```

紅的話 → 記在 progress.md 的 "Remaining"，讓下次接手的人知道。

## 5. 寫接手點

在 progress.md 最後加：

```markdown
### 🔖 接手點（Next session starts here）

- **當前狀態**: <一句話：做到哪>
- **下一步**: <具體到可以直接動手的程度>
- **待決事項**: <需要使用者拍板的>
- **環境狀態**: <dev server 是否在跑 / 有無未套用的 migration / 有無暫時性的 hack>
```

**判準**：一個完全沒有本次 session 記憶的人，讀完能不能直接接著做？

## 6. 摘要給使用者

用**繁體中文**簡短回報：

- 今天完成了什麼（對應到哪些 checklist 項）
- 遇到什麼問題
- 下次從哪開始
- 有沒有需要使用者決定的事

## ⚠️ 誠實原則

只有**真的看到執行結果**才能寫「已完成 / 已 commit / 已驗證」。

- 沒實際跑過的 gate → 不要寫「gate 通過」
- 沒實際開車的功能 → 寫「gate-only verified」不要寫「verified」
- 沒實際看到 commit 成功 → 不要寫「已 commit」

$ARGUMENTS
