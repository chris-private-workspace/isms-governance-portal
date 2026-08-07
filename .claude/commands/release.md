---
description: 發版流程 — 版號決定 → pre-flight → 切 tag → 部署 → 驗證 → 公告
argument-hint: [版號，如 1.2.0，或留白讓我判斷]
---

# Release

完整規則見 `docs/rules-on-demand/release-process.md`（**先 Read 它**）。
資訊流見 `docs/INFORMATION-FLOW.md` §情境 D。

## 1. 決定版號

看 `CHANGELOG.md` 的 `[Unreleased]` 區塊 + 自上個 tag 以來的 commit：

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

| 有什麼 | 版號 |
|-------|------|
| 刪/改名欄位、加必填參數、改預設值、縮小接受範圍 | **MAJOR** |
| 新功能、新選填欄位、新設定（有預設值）| **MINOR** |
| 只有 bug 修復，行為回歸到「原本應該有的樣子」| **PATCH** |

⚠️ **判準**：有沒有人會因為升級而壞掉，而且**他什麼都沒做錯**？

**把理由說出來給使用者確認** —— 是哪個變更讓它成為 MAJOR/MINOR？

## 2. Pre-flight

- [ ] 主分支 CI 全綠（含 `python scripts/lint/run_all.py`）
- [ ] `gh pr list --state open` —— 確認沒有該進這版卻還開著的 PR
- [ ] **CHANGELOG 的 `[Unreleased]` 完整**（寫給使用者看，不是 commit 訊息複製貼上）
- [ ] Breaking change 有遷移說明
- [ ] Migration 測過 + **確認可逆**（不可逆要明確標示）
- [ ] 新增/變更的環境變數已列出且部署環境已設定
- [ ] **Staging 部署此版本並實際驅動主路徑**（不是只看 health check）

## 3. 切版

```bash
# CHANGELOG: [Unreleased] → [X.Y.Z] — YYYY-MM-DD，並開新的空 [Unreleased]
git add CHANGELOG.md && git commit -m "chore(release): vX.Y.Z"

git tag -a vX.Y.Z -m "<一句話重點>"   # annotated，不是 lightweight
```

⏳ **push tag 前問使用者確認**（push 是 outward-facing 動作）。

```bash
git push origin main && git push origin vX.Y.Z
```

## 4. Release notes

模板：`docs/13-deployment/_TEMPLATE-release-notes.md`

**Breaking change 放最上面**，含：影響誰 / 原本 / 現在 / 怎麼遷移 / **為什麼要這樣改**。

## 5. 部署 + 驗證 ⭐

- [ ] 部署到 production
- [ ] **確認部署的真的是這個版本**（查 build info / commit SHA，不要只信「部署成功」）
- [ ] 健康檢查通過
- [ ] ⭐ **實際驅動主路徑**（真 UI + 真後端）
- [ ] **這一版的主要新功能，實際用一次**
- [ ] 錯誤率 / 延遲對比部署前
- [ ] 日誌有沒有新的例外類型

> 「部署成功」只證明程式跑起來了 —— 跟 gate 全綠一樣，**它不證明能用**。

## 6. 公告 + 觀察

- [ ] Release notes 發布
- [ ] Breaking change → 通知受影響的下游
- [ ] 觀察窗口（1-24 小時，依流量）
- [ ] 異常 → rollback（計畫應該在部署前就準備好了）

## Rollback 準備（部署**前**就要有答案）

| 問題 | 答案 |
|------|------|
| 怎麼回？ | |
| 多快？ | |
| 這版寫的資料，舊版讀得懂嗎？ | |
| Migration 可逆嗎？ | |
| **什麼指標超過什麼值就回滾？** | ← 事先訂好，不要在事發時辯論 |

$ARGUMENTS
