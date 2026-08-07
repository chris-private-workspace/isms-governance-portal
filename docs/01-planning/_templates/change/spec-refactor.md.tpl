# CH-NNN — <重構簡短描述>（refactor）

> **用於**：結構重組、行為不變的改動。位置 `docs/03-implementation/changes/CH-NNN-<slug>/spec.md`
> 編號單調遞增 —— 先查：`ls docs/03-implementation/changes/ | sort -V | tail -1`
>
> **與 CHANGE 的差別**：CHANGE 改變**行為**，REFACTOR 不改變行為。
> 若你的改動讓使用者看到任何不同 → 那是 CHANGE 不是 REFACTOR。
>
> **這份模板的重點是「量化」** —— 重構若無法量化改善了什麼，通常代表它不該做。
>
> 複製時刪掉這個 blockquote。

**Date**: YYYY-MM-DD
**Phase**: W{NN}（或 `cross-phase chore —— 無 phase 編號`）
**Scope**: <範疇；標明有無 runtime 變更>
**Status**: ✅ DONE / 🔄 進行中

> **Modification History**
> - YYYY-MM-DD: Initial creation

---

## Problem

<現況為什麼需要重構。**必須量化** —— 「程式碼很亂」不是理由。>

量化的形式（挑適用的）：

- **重複**：同一份邏輯出現在 N 個地方 / 同一段文字在 context 裡出現 2 次
- **成本**：每個 session 多吃 N KB context / 每次建置多 N 秒 / 每次改動要同步 N 個檔
- **風險**：N 個地方各自維護、已經分歧 M 次
- **零使用**：某個東西 N 個 session 零呼叫，但每次都付載入成本

<若前一次重構留下了未涵蓋的邊界，說明這次補的是哪一塊。>

---

## Solution

### Part A — <子項名稱>

| 對象 | 處理 | 保留了什麼 |
|------|------|-----------|
| `<檔案 / 段落>` | <刪除 / 抽出 / 指標化 / 合併> | <為什麼這部分不能一起動> |

### Part B — <子項名稱>

<同上>

### 刻意不動的

<看起來該一起改但沒改的，以及原因。**這一節防止 reviewer 誤以為你漏了。**>

---

## Verification

### 行為不變的證明

<重構的驗證核心是「行為沒變」。>

- [ ] 既有測試**全數通過且未修改**（若改了測試 → 那就不是純重構，說明為什麼）
- [ ] <N> passed（baseline <N>，**無變化**）
- [ ] Public API / 對外行為 diff 為空

### 量化改善

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| <指標> | <值> | <值> | <改善> |

### Gate

`<TYPECHECK>` <N> · `run_all` <N>/<N> · test <N> · build clean

---

## Impact

- **Runtime 變更**: 有 / **無**（純結構）
- **Import 路徑變更**: <若有，列出對照表>
- **需要下游配合**: yes / no
- **Rollback**: <單一 revert 可回復嗎？>

---

## 防止復發

<結構性重構最常見的失敗是**再度膨脹回去**。>

- [ ] 有沒有加**機械式守門**（lint / CI check / size budget）？
- [ ] 若只靠文件約定 → **它會失效**。真實案例：同一張表格因為只有勸世文沒有 lint，
      重新膨脹了兩次，因為每次都把前一版臃腫的內容當範本抄

**加了什麼守門**：`<lint script / CI job>` — <它會在什麼情況 fail>

---

## 相關

- **前次相關重構**: `REFACTOR-XXX`（若這是同一路線的延續）
- **關掉的 AD**: `AD-<Topic>-<N>`
