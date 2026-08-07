---
description: 產生交接文件 — 當前狀態 / 下一步 / 環境狀態 / 走過的死路 / 待決事項
argument-hint: [交給誰] [原因：請假/換手/調度]
---

# Handoff — 任務交接

完整規則見 `docs/rules-on-demand/collaboration.md` §任務交接。

**核心判準**：**一個完全沒有這段記憶的人，讀完能不能直接接著做？**

## 1. 先蒐集事實（不要憑印象寫）

```bash
git branch --show-current
git log --oneline -8
git status
git stash list
```

再讀：

- `docs/01-planning/W{NN}-{slug}/checklist.md` —— 勾到哪、哪些標了 `🚧`
- `docs/01-planning/W{NN}-{slug}/progress.md` —— Day-0 drift + 每日紀錄

## 2. 產生交接文件

模板：`docs/12-ai-assistant/_TEMPLATE-handoff.md`
位置：`docs/01-planning/W{NN}-{slug}/handoff-YYYYMMDD.md`

### 八個區塊，兩個最重要

| # | 區塊 | |
|---|------|---|
| 1 | 當前狀態 | Day 進度 + checklist N/M |
| 2 | **下一步** | ⭐ 具體到可以直接動手（含檔案路徑/指令），不是「繼續做 X」|
| 3 | 程式碼狀態 | 分支 / 最後 commit / **未 commit 的工作** |
| 4 | **環境狀態** | ⭐ migration / 環境變數 / **暫時性 hack** / 外部依賴 / 啟動指令 |
| 5 | **走過的死路** | ⭐⭐ 試過什麼、為什麼不行 |
| 6 | 踩到的坑 | 不寫下來對方一定會再踩 |
| 7 | 待決事項 | 需要**誰**拍板、不決定會擋住什麼 |
| 8 | 相關資料 | plan / progress / design note / 相關 CHANGE |

> **§5 走過的死路是最有價值也最常被省略的部分。**
> 沒有它，接手的人會把你花了兩天排除的選項再試一次。

## 3. 交出去之前

- [ ] **未 commit 的工作已 commit 或 stash 並在文件說明**
      （⚠️ 不要把工作留在自己機器上就走 —— 對方拿不到）
- [ ] Checklist 已更新（完成的勾、被擋的標 `🚧 阻塞: <原因>`）
      ⚠️ **絕不刪除未勾選項**
- [ ] 交接文件寫完
- [ ] **口頭/訊息走一遍**（~15 分鐘）—— 文件補不上「為什麼」的直覺
- [ ] 之後 3 天保持可聯絡

## 4. 給接手者的驗收

接手者要能回答「YES」才算交接完成：

- [ ] 我能 checkout 分支並跑起來
- [ ] 我讀完了交接文件 + phase plan + progress
- [ ] **我知道下一步怎麼動手**（不知道就現在問）
- [ ] 環境狀態我確認過了

## 也適用於 AI session 交接

同一個人、不同 session 之間也適用 —— 差別只在省略「口頭走一遍」。
單純要存檔中斷、還沒要換人的話，用 `/save-progress` 比較輕量。

$ARGUMENTS
