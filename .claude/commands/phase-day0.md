---
description: Day-0 三-prong plan-vs-repo grep 驗證 — 寫 code 前的強制關卡
---

# Phase Day 0 — Plan-vs-Repo Verify

**這是投報率最高的一步。** 實測 ROI 4-60×。

## 先讀完整程序

```
docs/rules-on-demand/day0-plan-verify.md
```

裡面有完整的 prong 步驟 + drift-class grep 對照表。**先讀它再開始。**

## 執行順序

### Prong 1 — Path Verify

plan §4 File Change List + §3 Technical Spec 提到的**每一個路徑**：

- NEW 檔 → Glob 應該回 0 筆
- EDIT 檔 → Glob 應該回 1 筆
- **測試基礎設施也要驗**（fixture / marker / e2e spec）—— 幽靈測試檔會在 plan 之間傳播

### Prong 2 — Content Verify ⭐

plan 對現有 code 的**每一個事實斷言** → Grep 那個符號。

**檔案存在 ≠ 內容如你所想。** 對照 drift-class 表逐類檢查：

- 宣稱死了但其實活著（或反之）
- 宣稱有但其實沒 import
- 名字已經被改過
- 宣稱存在的介面其實不存在
- 單位 / 型別錯誤
- 陳舊的 docstring / 註解
- 儲存路徑 / 巢狀結構猜錯

### Prong 2.5 — Child Tree（僅前端頁面 phase）

grep entry 元件的 import → 對**每一個子元件**跑 anti-pattern grep。
entry 對了不代表子元件對。

### Prong 3 — Schema Verify（僅動 DB 時）

欄位級別比對：名稱 / 型別 / nullable / default / FK / migration head。

### 記錄基線

```
D-baselines — test <N> · lint <N> · type <N> · build <status> · coverage <N>%
```

## 輸出

寫進 `docs/01-planning/W{NN}-{slug}/progress.md` Day 0 條目：

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|

**鐵律**：drift finding 加到 **plan §Risks**，**不要**默默改 §Technical Spec。
默默改寫等於銷毀「原本計畫什麼 vs 現實逼你改成什麼」的審計軌跡。

## Go / No-Go

| 範圍變動 | 行動 |
|---------|------|
| ≤ 20% | 繼續 Day 1，風險記入 §Risks |
| 20-50% | 修訂 plan §5 + §7，**跟使用者再確認** |
| > 50% | **中止**，用現實基線重寫 plan |

## 最後

- [ ] 開分支：`git checkout -b feature/W{NN}-<scope>`
- [ ] Checklist §0.1 全部勾選
- [ ] **回報 drift 摘要 + go/no-go 判定給使用者**
