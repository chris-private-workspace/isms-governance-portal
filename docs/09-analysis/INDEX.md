# 09-analysis — 分析報告總索引

**Purpose**: 所有狀態 / 分析快照的索引。**每份新增必須在此加 1 行。**

> ⚠️ 狀態快照**會過期**。每份文件的標題或開頭必須寫明它是哪一天的快照，
> 避免半年後有人把它當現況。

---

## 索引（newest-first）

| 日期 | 文件 | 一句話 |
|------|------|--------|
| 2026-08-10 | [`architecture-completion-distance-20260810.md`](./architecture-completion-distance-20260810.md) | 距離 `02-architecture` 規劃完成有多遠：Wave 1 **12 個里程碑完成 1 部分 + 1 大部分**、**3 / 35 實體**、**0 / 30 螢幕**、8 個範疇 4 個空。⭐ 障礙是**序列不是數量**：M1 的 base field 依賴排在它後面的 M4/M5；**`User` 不在「完整索引」裡**（`AD-UserEntitySpec-1`）|
| 2026-08-10 | [`secure-dev-dod-automation-classification-20260810.md`](./secure-dev-dod-automation-classification-20260810.md) | `16` 的 28 點 secure-development DoD 逐點分類：**A 已覆蓋 4+2 · B 今天可做 3+2 · C 無標的 7 · D 不可機械化 5 · N 需拍板 5**。M0 DoD 明文要求的自動化，實作仍為 0 |
| 2026-08-07 | [`screen-fragment-audit-20260807.md`](./screen-fragment-audit-20260807.md) | 30 個 screen fragment 對照規格：**markup 乾淨無金融業殘留**（降低移植成本），但風險表單實作的是**另一套風險方法論**、事件表單**完全沒有 `11` 要求的 restricted block**、導航是 5 組不是 4 組 |
| 2026-08-07 | [`mockup-data-vs-spec-audit-20260807.md`](./mockup-data-vs-spec-audit-20260807.md) | 設計交付物 24 個資料檔逐一對照規格：**旗艦儀表板以國家為鍵，結構上無法表達 14 OpCo / 12 管轄區**；OpCo 清單含印度缺中國，與 `15` §1 完全相反；核心檔案殘留金融業框架 |

---

## 分類建議

當索引超過 ~20 行時，改成分組：

- **架構 / 設計分析**
- **現實檢查 / 落差審計**（實際做到 vs 宣稱做到）
- **效能 / 成本分析**
- **決策紀錄**（build vs buy、技術選型）
