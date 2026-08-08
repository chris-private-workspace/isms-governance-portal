---
name: template-vs-instance
description: "`*.template.md` 要 copy 成去掉 .template 的檔名再填，絕不就地改；使用者指定參考檔時，只取格式不自行增刪章節。"
metadata:
  type: feedback
---

# 模版與實際要分開；參考只取格式

**規則**：

1. **`*.template.md` / `_TEMPLATE-*.md` 不可就地修改。**
   依 `docs/12-ai-assistant/README.md`：「把模板 copy 成去掉 `.template` 的檔名再填」。
   模版保持通用可重用，專案專屬內容住在實例檔。
2. **使用者說「參考某檔」時，預設只是格式參考。**
   結構可以照抄，**章節清單不要自行增刪** —— 要加先問。

## 真實案例（2026-08-07 → 08-08）

被要求「參考 sibling 專案的 `02-compact-session.md`，幫本專案生成專屬版本」。做錯兩件事：

1. 直接覆寫 `docs/12-ai-assistant/01-prompts/compact-session.template.md`（170 行），
   把該檔第 3 行「Copy 成 `compact-session.md`」**那句規則本身**一起蓋掉
2. 加了一節參考格式沒有的 `### ⛔ 0. 絕對不可壓縮的四類`

修正：`git checkout 31664ae -- <該模版路徑>` 還原成 bootstrap 當時的內容（byte-identical），
另建 `compact-session.md` 為實例；那四項內容改釘進參考格式**既有的欄位**。

## 根因

把「生成專屬版本」讀成「就地客製化那個檔案」。

sibling 專案的目錄早就示範了正確擺法 —— `sample-2-*.md`（格式參考）與 `02-*.md`（實際）並存。
我當時只 Read 了單一檔案，**沒有先 list 整個目錄**。

## 怎麼做

- 動任何 `.template` / `_TEMPLATE-` 檔案前，先問「這是模版還是實例？」
- 實例不存在 → copy 一份再改；已存在 → 改實例，模版不動
- 使用者給參考路徑時，**先 Glob 整個目錄**再讀單一檔案 —— 目錄結構本身就是答案的一部分
- 想加參考格式沒有的東西 → 先講，不要順手加

Related: [[feedback_stay_anchored_no_auto_drift]] · [[feedback_check_existing_before_building]]
