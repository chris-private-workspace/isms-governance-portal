# 06-reference — 參考素材

**Purpose**: 樣板、範例、playbook —— 開發時對照的參考物。**不是規格，也不是實例記錄。**
**Created**: 2026-08-07
**Status**: Active

## 已附方法論 playbook

- ⭐ [`mockup-to-production-frontend-playbook.md`](./mockup-to-production-frontend-playbook.md)
  —— **如何把 design mockup 轉成生產前端而不累積視覺 drift**。
  核心：mockup 拆兩層，視覺層（CSS）**逐字複製、永不翻譯**，邏輯層（JSX）重寫接 API。
  **若你的專案有一份手寫 mockup 要在生產 toolchain 重現，寫第一頁之前先讀這份。**
  觸發式紅線與 DoD 在 [`../rules-on-demand/mockup-fidelity.md`](../rules-on-demand/mockup-fidelity.md)。

## 其他建議住客
- Sample 輸入 / 輸出檔（用來測試 / 示範）
- 樣板 workflow / 樣板 config
- 外部方法論的可遷移版本

## 慣例
- 若有 **read-only 的第三方 reference**（license 風險）→ 獨立處理（gitignore + 不 copy），
  不要混進這層 git-tracked 的內容
- 這層的東西應該是**別人也能用**的；只對本專案有意義的 → `../02-architecture/` 或 `../05-usage/`
