# Page Inventory — 路由 ↔ mockup ↔ parity 帳本

> **用於**：有 mockup 要移植成生產前端的專案。
> 位置：`docs/02-architecture/page-inventory.md`（複製本檔後改名）
>
> **這份文件同時是兩樣東西**：移植工作的**工作清單**，以及每條路由的**保真度帳本**。
> playbook 教你「怎麼移植不 drift」，這份記「**哪幾條移植了、到什麼程度**」。
> 沒有它，「還剩多少」只能靠記憶回答 —— 而記憶會漏，尤其在移植橫跨很多個 phase 時。
>
> 複製時刪掉這個 blockquote。

**Created**: YYYY-MM-DD
**Last Modified**: YYYY-MM-DD
**對應 mockup**: `{mockup 目錄}`（commit / 版本：`{sha}`）

---

## 怎麼用

1. **開 frontend phase 之前**：從下表挑未達 parity 的路由，那就是 scope
2. **每條路由收尾**：更新它那一行的 parity 狀態 + 是哪個 phase / commit 做的
3. **mockup 更新之後**：更新頂部的 mockup 版本，並標出哪幾條路由需要重新比對

> ⚠️ **這是衍生資料。** 它記的是「某次比對當時」的結論。
> 與 mockup 來源檔有出入時 —— **來源檔贏，改這份**
> （見 `rules-on-demand/mockup-fidelity.md` §AuditDocSync）。

**Parity 狀態**：
`✅ parity`（代碼層並排比對通過）· `🟡 near`（有已記錄的小偏差）·
`🔨 rebuilt`（用正確方法重建過）· `⚠️ translated`（舊翻譯法產物，**待重建**）·
`⬜ 未開始` · `⛔ 範疇外`

---

## 路由表

| # | 路由 | Mockup 來源 | Component | Parity | 由哪個 phase | 資料契約 |
|---|---|---|---|---|---|---|
| 1 | `/` | `page-<name>.jsx` | `C{N}` | ⬜ | | `{Schema}` |
| 2 | | | | | | |

> **`Mockup 來源` 欄要指到檔案**，不要只寫頁面名 —— 那是 Day-0 Prong 2 要 grep 的對象。
> **`資料契約` 欄**讓你在後端 schema 改動時，一眼看出哪幾頁要跟。

---

## 跨頁面元素（不屬於單一路由）

| 元素 | Mockup 來源 | Parity | 備註 |
|---|---|---|---|
| AppShell / 導覽 | `shell.jsx` | | 每一頁都繼承它 —— **它 drift 就是全站 drift** |
| 命令面板 / 全域搜尋 | | | |
| 通知 / 使用者選單 | | | |

---

## 範疇邊界（mockup 有、但這一期不做）

> **不要從表上刪掉它們。** 「刪掉」跟「刻意不做」在三個月後看起來一模一樣。
> 若 mockup 把它們畫成「看得到但不可用」，生產端也要照樣渲染
> —— 直接拿走等於破壞邊界的可見性（見 playbook §9）。

| 元素 / 路由 | 為什麼這一期不做 | 什麼條件下做 | 生產端怎麼呈現 |
|---|---|---|---|
| | | | 停用態 / 不渲染 |

---

## 待重建（⚠️ translated）

> 用舊翻譯法做出來的頁面。**不要 patch** —— 換方法後一次性重建（playbook §7.2）。

| 路由 | 已知偏差 | 重建優先度 |
|---|---|---|
| | | |
