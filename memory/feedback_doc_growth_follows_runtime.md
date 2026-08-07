---
name: doc-growth-follows-runtime
description: "文件成長必須跟隨已驗證的 runtime。禁止因為 gap analysis 的結果就預寫一批新規劃文件。"
metadata:
  type: feedback
---

# 文件成長跟隨 runtime，不能預寫

**規則**：新領域的設計文件必須從 **thin spike → retrospective → extract design note** 產生。
**禁止**因為 gap analysis 或 roadmap 的結果，就先寫一批新規劃文件。

## 真實案例（來源專案）

專案在 22 個 phase 期間產出了 21 份規劃文件（**1:1 比例**）。
後來的現實檢查發現：

> **程式碼對齊度 85% / runtime 對齊度 40%**

也就是說，文件寫的東西大部分**沒有真的跑起來**。

根因很單純：**文件先於實作**。文件描述的是「我們打算怎麼做」，
而不是「我們實際做了、而且驗證過的是什麼」。當實作因為現實阻力而偏離時，
文件不會自動更新 —— 它變成一份看起來權威、實際上誤導的東西。

## 正確順序

```
thin vertical spike（做一個真的能跑的薄切片）
   ↓
retrospective（記下實際學到什麼、什麼跟預期不同）
   ↓
extract design note（從已驗證的東西抽取）
```

**Design note 是 extract，不是 pre-write。**

## 判準

| 你想寫的東西 | 該不該現在寫 |
|-------------|-------------|
| 「我們打算這樣做 X」 | ❌ 這是 phase plan 的內容，不是設計文件 |
| 「我們做了 X，驗證了這些不變式（含 file:line）」 | ✅ 這是 design note |
| 「Y 領域的完整架構規劃」（還沒做過任何 Y）| ❌ 先做一個薄切片 |
| 「我們比較了 A/B/C，選了 A，因為在我們的處境下…」 | ✅ 但要在真的試過之後 |

## Design note 的品質判準

```
verified ratio = (有 file:line + 可重現驗證的 claim 數) / (總 claim 數)
```

目標 **≥ 95%**。低於 70% 的話，那不是 design note，是願望清單。

## 同樣的紀律適用於 phase 層級

「先寫一批規劃再實作」的 doc-level 反模式，
對應到 phase-level 就是「先寫 5 個 phase 的 plan 再開始做」。

**Rolling discipline**：一次只規劃下一個 phase。
前一個的 retrospective 是下一個的輸入。

Related: `docs/rules-on-demand/spike-design-note-gate.md` · [[feedback_check_existing_before_building]]
