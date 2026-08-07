# Component Catalog

**Purpose**: 所有 component 的單一清單。**change / bug 標「影響哪些 component」的權威來源。**
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> 沒有這張表，「這個改動影響什麼」只能靠記憶回答 —— 而記憶會漏。

---

| ID | Component | 範疇 | 職責（一句話）| 依賴 | 狀態 |
|---|---|---|---|---|---|
| C1 | | | | | 規劃中 / 開發中 / 穩定 / 淘汰中 |

---

## 慣例

- **ID 不重用。** Component 淘汰了就標 `淘汰中` → `已移除`，ID 留著（歷史紀錄會引用它）
- 「依賴」只寫**直接**依賴；傳遞依賴由這張表自然推導
- 新 component 進表的時機：**第一次有 code 落地時**，不是規劃時
- 逐 component 的深度設計 note **rolling JIT**：第一次重度改動它時才寫，放 `components/`

## 依賴檢查

反向依賴（下層 import 上層）是架構腐化的第一個徵兆。定期掃：

```bash
# 依你的語言調整；重點是讓它可執行、可放進 CI
{grep 或 import-linter 指令}
```
