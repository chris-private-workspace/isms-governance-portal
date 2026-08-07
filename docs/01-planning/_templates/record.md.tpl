# <CH|BUG>-NNN: <一行描述>

> **1-page 記錄 —— Change / Bug 兩軌共用的輕量形式。**
> 位置 `docs/03-implementation/{changes,bugs}/<CH|BUG>-NNN-<slug>.md`（**單檔**，不是資料夾）
>
> **什麼時候用這個**：
> - phase 在 Day 4 收尾產出的變更記錄（**最常見** —— 過程已經記在 phase 四件套裡了）
> - 不需要獨立 gate、當天就能收掉的獨立 Change / Bug
>
> **什麼時候改用資料夾三件套**（`_templates/change/` · `_templates/bugfix/`）：
> 需要跨天追蹤、需要獨立的 pre-doc gate、Sev1/Sev2、或要留完整調查時間線時。
> 判準：**過程本身有價值就用資料夾；只有結論有價值就用這一頁。**
>
> 目標長度 **40-70 行**。寫到 150 行代表你該用資料夾形式了。
> 複製時刪掉這個 blockquote。

**Date**: YYYY-MM-DD
**Phase**: W{NN}（或 `無 —— 獨立 <CH|BUG>`）
**Scope**: <受影響的範疇 / 模組>
**Components**: <C1, C3 —— 見 `docs/02-architecture/COMPONENT_CATALOG.md`；沒有就寫 `—`>
**PR**: #N

> 單檔形式**沒有** `status:` frontmatter，而且這是刻意的：1-page 記錄用於**當天收得掉**的工作，
> 它記的是結論不是生命週期。`check_status_markers.py` 也因此不掃它。
> 若你發現自己在更新這份檔案的狀態 —— 那代表它該升級成資料夾三件套。

---

## Problem

<什麼壞了（BUG）/ 這個變更解決什麼（CH）。**從外部視角寫** —— 使用者或系統觀察到什麼。>

<有量化證據就放這裡：掃描命中數、失敗率、影響範圍。具體數字讓後人知道問題有多大。>

---

## Root Cause

<**寫根因，不是表象。**「還沒做」不是根因 —— 「為什麼當初的設計會留下這個洞」才是。>

<含 `file:line` 錨點。>

---

## Solution

<改了什麼 + **為什麼這樣做而不是另一種做法**。>

| 檔案 | 類型 | 說明 |
|------|------|------|
| `<path>:<line>` | 新增 / 修改 / 刪除 | <說明> |

<若有「看起來是小事、拿掉就會壞」的 load-bearing 細節，一定要寫出來。>

---

## Verification

**Gate**: `<TYPECHECK>` <N> · `run_all` <N>/<N> · test <N> passed（baseline <M> → **+<D>**）· build clean

**新增測試**: `<test file>` —— <測什麼；特別標出**負面測試**：關掉會壞什麼>

**Drive-through**（user-facing 時 MANDATORY）:
<做了什麼 → 觀察到什麼；截圖路徑>

**Verdict**: ✅ PASS / ⚪ N/A（純後端 —— **gate-only verified**）

> ⚠️ 沒開過車就不要寫「verified」。

---

## Impact

- **Breaking change**: yes / no
- **Migration**: yes / no（yes 則寫編號 + 是否可逆）
- **Config**: <新增 / 變更的環境變數 + 預設值>
- **重啟需求**: <startup-only 的 wiring 要特別標>
- **Rollback**: <怎麼回滾 + 估時>

---

## 相關

- **關掉的待辦**: `AD-<Topic>-<N>`
- **同類前例**: <之前的 <CH|BUG>-NNN；若這是第 2 次以上，Solution 要寫結構性解法>
- **產生的待辦** → `docs/01-planning/BACKLOG.md`
