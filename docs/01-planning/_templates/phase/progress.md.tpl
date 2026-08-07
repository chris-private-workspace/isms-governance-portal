# Phase W{NN} Progress

> **Progress.md 是 phase 期間的每日流水帳。**
> 位置：`docs/01-planning/W{NN}-{slug}/progress.md`
> 每天傍晚寫，**不要**「等 phase 結束再補」—— 細節屆時已遺失。
> 複製時刪掉這個 blockquote。

**Phase**: W{NN} — <short scope>
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W{NN}-<scope>`

---

## Day 0 — YYYY-MM-DD — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| D1 | <plan 宣稱 X；grep 顯示 Y> | <影響哪條 §Risks / 範圍變動> | 🔴 需改 plan / 🟡 小調整 / ✅ 確認無誤 |
| D2 | | | |
| D-baselines | test <N> · lint <N> · type <N> · build <status> · coverage <N>% | 基線已記錄 | ✅ |

### Prong 覆蓋

- Prong 1（path）: <N 個路徑驗證，M 個漂移>
- Prong 2（content）: <N 個宣稱驗證，M 個漂移>
- Prong 2.5（child tree）: <N/A 或 N 個子元件掃描>
- Prong 3（schema）: <N/A 或 N 個欄位驗證>

### Go / No-Go

**範圍變動**: ~N% → **繼續 Day 1** / 修訂 plan / 中止

---

## Day 1 — YYYY-MM-DD — <theme>

### Today's Accomplishments

- Task 1.1 <deliverable> — actual <Z> min（est ~<W> min，delta ±N%）
- Task 1.2 <deliverable> — actual <Z> min

### Issues / Discoveries

- <遇到的阻塞、意外發現、需要記住的事>

### Remaining for Next Day

- Task 1.3（前置工作已完成）

### Notes

- <學到的東西 / 決策 / 風險>

---

## Day 2 — YYYY-MM-DD — <theme>

<同上結構>

---

## Day 3 — YYYY-MM-DD — Drive-Through

### Drive-through 執行紀錄

**環境**: <dev server 版本 / 後端 PID / 使用的真實服務>
**Clean restart**: <確認新程序是唯一擁有者的證據 —— startup log 行>

### 逐控件走查

| 控件 / 步驟 | 可點？ | 有效果？ | 標籤真實？ | 結果渲染？ | 備註 |
|------------|-------|---------|-----------|-----------|------|
| <control> | ✅ | ✅ | ✅ | ✅ | |
| <control> | ✅ | ❌ | — | — | **發現 Potemkin → 修正於 <commit>** |

### Observed vs Intended

| 步驟 | 預期 | 實際 | 判定 |
|------|------|------|------|
| 1. <動作> | <預期發生> | <實際發生> | ✅ PASS / ❌ FAIL |

**截圖**: `artifacts/W{NN}-drivethrough-<step>.png`

**Verdict**: ✅ **DRIVE-THROUGH PASS** / ❌ FAIL（修正後重跑）

---

## Day 4 — YYYY-MM-DD — Closeout

### Today's Accomplishments

- retrospective 建立
- retrospective.md 完成
- calibration 回填
- 導航檔更新

### Final Gate Sweep

| Gate | 結果 |
|------|------|
| <lint 指令> | ✅ <N> issues |
| <type check 指令；無型別系統則填 echo 'n/a'> | ✅ <N> errors |
| <test 指令> | ✅ <N> passed |
| `python scripts/lint/run_all.py` | ✅ <N>/<N> |

### Phase 總時數

| Day | Actual |
|-----|--------|
| Day 0 | <N> min |
| Day 1 | <N> min |
| Day 2 | <N> min |
| Day 3 | <N> min |
| Day 4 | <N> min |
| **Total** | **<N> hr** |

→ retrospective Q2 用這個數字算 ratio。
