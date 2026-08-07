# 03-implementation — 改動 & 修復實例

**Purpose**: Change 與 Bug-fix 兩軌的實例存放區（活躍 + 歷史）。
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> Phase 軌住在 [`../01-planning/W{NN}-*/`](../01-planning/README.md)，**不在這一層**。
> 三軌的分類、lifecycle、gate：[`../01-planning/PROCESS.md`](../01-planning/PROCESS.md)。
> 模板：[`../01-planning/_templates/`](../01-planning/README.md)。

---

## 編號慣例

| 類型 | 格式 | 範圍 |
|---|---|---|
| Change | `CH-NNN`（3 位補零）| **全專案單調遞增**，不 per-phase 重來 |
| Bug | `BUG-NNN`（3 位補零）| 全專案單調遞增 |

建立前先查最大號：

```bash
ls docs/03-implementation/changes/ | sort -V | tail -1
ls docs/03-implementation/bugs/     | sort -V | tail -1
```

---

## 每個實例：單檔 或 資料夾

**輕量（預設）** —— 單檔 1-page，`Problem / Root Cause / Solution / Verification / Impact`：

```
changes/CH-NNN-{kebab}.md      bugs/BUG-NNN-{kebab}.md
```

模板 [`../01-planning/_templates/record.md.tpl`](../01-planning/README.md)。目標 40-70 行。
**phase Day 4 收尾產出的記錄一律用這個** —— 過程已在 phase 四件套裡。

**完整（需要獨立追蹤 / Sev1/Sev2）** —— 資料夾：

```
changes/CH-NNN-{kebab}/        bugs/BUG-NNN-{kebab}/
├── spec.md                    ├── report.md
├── checklist.md               ├── checklist.md
└── progress.md                ├── progress.md
                               └── postmortem.md（Sev1/Sev2 必寫）
```

> 判準：**過程本身有價值 → 資料夾；只有結論有價值 → 單檔。**
> 完整判準與 lifecycle 見 [`../01-planning/PROCESS.md`](../01-planning/PROCESS.md) §3.3 / §4.3。

**重構**（行為不變的結構調整）也走 Change 軌，但用 `spec-refactor.md.tpl` ——
它額外要求**量化改善了什麼** + **行為不變的證明** + **防復發守門**。

> 判準：**如果使用者看得到任何不同，那就是行為變更**，用一般的 `spec.md.tpl`。

---

## 為什麼每次都要留一份

**修 bug 之前先 Grep 這裡** —— 這個 bug 修過嗎？

同一個 bug 修第三次的時候，你會希望前兩次的紀錄存在。
而且那時該做的不是再修一次，是解決**根因** ——
那正是 `report.md` §Initial Diagnosis 與 postmortem 的用途。

三份 pre-doc 各自回答什麼：

```
plan.md    (Phase)   要交付什麼 + 怎麼證明交付了
spec.md    (Change)  為什麼這樣設計 —— 決策理由是核心價值
report.md  (Bug)     什麼壞了 + 為什麼測試沒抓到 + 怎麼防止再發生
```

---

## 其他住客

一次性的實作 memo / 調查筆記 / runbook（不屬 CH/BUG 但屬實作紀錄）可直接放這一層。
模板：[`_TEMPLATE-memo.md`](./_TEMPLATE-memo.md)。

---

## 不放這裡的

- ❌ Phase artifacts（截圖 / drift 報告）→ `../01-planning/W{NN}-*/artifacts/`
- ❌ 設計文件 → `../02-architecture/`
- ❌ 架構決定 → `../14-adr/`
- ❌ 一次性深度分析 → `../09-analysis/`
