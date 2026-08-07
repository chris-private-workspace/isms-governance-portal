---
name: navigator-files-are-pointers-not-archive
description: "CLAUDE.md / MEMORY.md 只放指標，不放內容。導航檔一旦開始存檔 phase 紀錄，半年後就是 77KB 的 context 稅。"
metadata:
  type: feedback
---

# 導航檔是指標，不是檔案庫

**規則**：`CLAUDE.md` 和 `MEMORY.md` **只放指標**（導航 / 原則 / 規則 / 1 行狀態）。
phase 細節的單一來源在 memory subfile + retrospective.md。

## 真實案例（來源專案）

`CLAUDE.md` 從 30KB 的基礎版，在 20+ 個 phase 之後長到 **77KB**。
其中約 **58KB 是重複的 phase 紀錄**：

- 表格裡的 `Latest Phase` / `Prev Phase` / `Prev-Prev Phase` / `Prev³` / `Prev⁴` 列，每格塞滿 retro 細節
- Footer 的多段歷史區塊
- 檔尾的 `[歷史紀錄保留於下]` 存檔區塊
- 表格格裡 inline 的 20 條待辦清單

`MEMORY.md` 也超過了它自己的大小限制（28KB vs 24.4KB 上限），
12 個條目違反它自己訂的 200 字元規則（最糟的一條 ~3000 字元 = **15 倍超標**）。

**代價**：每個 session 開場就燒掉 **9-12% 的 context window** 在重複內容上。

**同一個 phase 的細節同時存在於 5 個地方**：
CLAUDE.md 表格 + CLAUDE.md footer + MEMORY.md 條目 + memory subfile + retrospective.md。

## 根因（四個，缺一不可）

1. **closeout 時把完整 retro 倒進「索引」條目** —— 忘了單一來源原則
2. **表格格累積歷史但沒有存檔切點** —— 沒人定義過什麼時候該把舊的移走
3. **沒有 lint 強制** —— 只有「請保持精簡」的勸世文，而勸世文不會 fail CI
4. **「捨不得刪」** —— 每個舊 phase 列都覺得「還有用」

第 3 點是關鍵：**同一張表格後來又膨脹了兩次**，
因為每個 closeout 都把前一個臃腫的格子當範本抄，而沒有任何東西會 fail。

## 規則

### CLAUDE.md 在 closeout 時**只能改 2 行**

✅ 允許：`Current Phase` 那一格（1 行）· `Last Updated` footer（1 行）·
里程碑達成時的 `Phase` 格 · 新增**永恆性**的原則 / 規則章節

❌ 禁止：加 `Prev Phase` 列 · 把 carryover / calibration / commit SHA / PR 編號 /
測試數塞進表格格 · footer 加歷史段落 · 檔尾加存檔區塊 · inline 待辦清單

### MEMORY.md 加 1 條品質指標（~250-300 字元）

```markdown
- [memory/project_wNN_<topic>.md](...) — Phase W{NN} closed YYYY-MM-DD; <1 句做了什麼>; <1 個短語：獨特之處>.
  Keywords: <未來檢索用的名稱>
```

**品質判準**：這條指標能不能讓未來的你用**關鍵字**找到這個 phase？

- ✅ 好關鍵字：feature 名 / AD ID / class 名 / 異常 pattern
- ❌ 壞關鍵字：泛詞（"frontend"、"refactor"）/ 只有日期 / 沒有上下文的數字

### 機械式守門（必要）

`scripts/lint/check_rules_hygiene.py` 為每個 always-loaded 檔案設 **byte 預算**。
超標即 fail。

**這是唯一有效的機制。** 前面兩次膨脹都是在有明確勸世文的情況下發生的。

## 判準

> 這份內容三個月後還有人會讀嗎？讀的人是為了**導航**還是為了**細節**？

- 導航 → 導航檔
- 細節 → subfile / retrospective / change record
- 待辦 → docs/01-planning/BACKLOG.md
- 數據 → calibration matrix / log
