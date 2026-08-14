# Calibration Matrix — live scope-class 乘數表

**Purpose**: 工時校準的**現行決策表**（scope-class 乘數 + agent delegation factor）。
On-demand 讀取 —— 從 always-loaded 的 `task-workflow.md` 抽出來，讓每個 session 不必付它的載入成本。

**Category / Scope**: Development Process / cross-phase live data
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

---

## 何時讀 / 何時寫這個檔

- **起草 plan（§7 Workload）**：查你這個 phase 的 scope class 乘數 + agent_factor
- **Day 4 closeout（retro Q2）**：回填/更新你那一行 —— **≤ 1 行（~250 字元）**：
  verdict + ratio/band + rollback trigger + `→ calibration-log` 指標。
  **完整敘述進 [`CALIBRATION-LOG.md`](./CALIBRATION-LOG.md)**，不是進這個格子。

> ⚠️ **Lint 強制**：`scripts/lint/check_rules_hygiene.py` 會讓任何超過 **400 字元**的表格行 fail。
> **為什麼需要機械守門**：這張表曾**兩度**重新膨脹到佔整個檔案 47% ——
> 因為每個 closeout 都把前一個臃腫的格子當範本抄，而沒有任何東西會 fail。

---

## 三段式 / 四段式承諾格式

Plan §7 必須寫成：

```
Bottom-up est ~X hr → class-calibrated commit ~Y hr (mult Z)
```

委派給 agent 時（≥ 80% Day 1 工作）：

```
Bottom-up ~X hr → class-calibrated ~Y hr (mult Z) → agent-adjusted ~Y' hr (agent_factor F)
```

`Y = X × Z`；`Y' = Y × F`

---

## Scope-class 乘數表

**預設值**：未分類 scope 用 **0.55**（mid-band）。
乘數範圍 [0.4, 1.0]。**低於 0.4 代表你的 bottom-up 估算方式有系統性問題**，該修的是估算不是乘數。

<!-- 新專案從空表開始。每個 phase closeout 加/更新一行。 -->

| Scope class | Mult | 3-phase mean | Status（1 行）|
|-------------|------|---------------|--------------|
| `greenfield-scaffold` | 0.60 | n/a (1 pt) | KEEP (W01 ratio ~0.35 UNDER band; 工時未逐項記錄，數字由 commit 時間戳回推故品質打折; if 2nd <0.70 → 0.40; → calibration-log) |
| `pattern-reuse-feature` | 0.50 | n/a (5 pt, 跨 0.23~1.24) | KEEP (W11 **1.24 OVER 但僅超 0.036**; ⛔ 該值**修正過** —— merge 前用估的收尾時間得 1.13 IN，author date 逐秒重算才是 1.24 → `AD-EstimateAsMeasurement-1` **再犯**; ⚠️ 起草在首個 commit 之前故不在窗口 → `AD-CalibrationDay0InOrOut-1`; 單次離群依規則忽略; → calibration-log) |
| `spike` | 0.65 | n/a (5 pt, 2 同單位且**方向相反**) | KEEP (W07 ratio **0.30 UNDER**; 同日無跨夜故定義首次乾淨適用; W04 0.81 IN —— 兩點反向不構成 3-phase 證據; ⛔ actual/bottom-up **0.20** 遠低於本表 0.4 下限 → **該修估算不是乘數** `AD-BottomUpBlueprint-1`; ⚠️ Day 3 工時原記 82 min 實為 31 min（估算被當量測）→ `AD-EstimateAsMeasurement-1`; → calibration-log) |

### 常見 scope class 起始建議值

沒有資料點時的起手值（之後靠實測修正）：

| Scope class | 建議起手 | 理由 |
|-------------|---------|------|
| `mechanical-refactor`（rename / move / 格式套用）| 0.40 | 高度可預測；bottom-up 最容易高估 |
| `pattern-reuse-feature`（複製既有 pattern 到新地方）| 0.50 | 有藍本可抄 |
| `greenfield-feature`（新功能、有既有基礎設施）| 0.55 | 預設 mid-band |
| `spike`（新領域 / 新技術 / 沒有藍本）| 0.65 | 探索成本無法事先拆解 |
| `integration-with-external`（接第三方 / 新服務）| 0.70 | 外部依賴是變異度主要來源 |
| `docs / audit / template` | 0.40 | 幾乎純寫作，估算誤差小 |
| `bug-fix-with-unknown-root-cause` | 0.85 | 診斷時間本質上不可估 |

---

## 何時調整乘數（3-phase 移動窗口）

| 條件 | 行動 |
|------|------|
| 連續 3 個 phase `actual / committed > 1.2` | **調高**乘數（你在低估）|
| 連續 3 個 phase `actual / committed < 0.7` | **調低**乘數（緩衝過多）|
| 單次離群值 | **忽略** —— 需要 3-phase 移動證據 |
| 某個 class 出現雙峰分佈（有些 0.5、有些 1.5）| 考慮**拆成兩個 sub-class** |

**為什麼要 3 個**：單一 phase 的 ratio 被太多雜訊影響
（一個沒預料到的 bug、一次環境問題、一個特別順的日子）。
用單點調整會讓乘數在兩個極端之間振盪，永遠收斂不了。

---

## Agent Delegation Factor

當 phase 主要由 subagent 執行時，class 乘數之上再乘一個 `agent_factor`。

Plan §7 **必須**明確宣告 `Agent-delegated:` 欄位：

| 值 | 判準 | agent_factor |
|---|------|-------------|
| `yes` | ≥ 80% Day 1 工作經 agent | 見下方 sub-class |
| `partial` | 20-79% | **0.75**（線性內插）|
| `no` | < 20%（自己直接做）| **1.0**（用三段式）|
| `TBD-Day-1-decision` | 取決於 Day 0 發現 | Day 1 開始前必須定案 |

### agent_factor sub-class（`yes` 的情況）

| Sub-class | Factor | 說明 |
|-----------|--------|------|
| `mechanical-pattern-reuse-heavy` | 0.30 | agent 抄既有 pattern，幾乎不用設計判斷 |
| `greenfield-port-style` | 0.45 | agent 依明確 spec 實作，設計已定 |
| `design-decisions-required` | 0.65 | agent 要自己做設計取捨（監督成本高）|

**為什麼要在 plan 時就宣告**：不預先宣告的話，calibration class 會在 retro 時被回溯歸類，
造成資料點汙染（有些 phase 事後歸類、有些事前宣告，兩種資料混在一起就沒有意義）。
預宣告同時逼你在起草時就想清楚執行方式。

### ⚠️ Agent 委派的隱藏成本

`agent_factor` 反映的是**寫 code 的時間**變快了。但下列成本**不會**變快，
而且常被低估：

- **複驗成本** —— 你必須自己重跑所有 gate（agent 的「全綠」不算數）
- **prompt 精修成本** —— 第一版 prompt 通常漏掉慣例 / 語言 / 邊界
- **修正成本** —— agent 常把主要功能做對，但靜默違反 baseline 約束

若你的 agent-delegated phase ratio 長期偏高，八成是這三項沒算進 bottom-up。

---

## Day 4 回填格式（照抄這個骨架）

```markdown
| `<class>` | <mult> | <mean> | KEEP/re-point (<phase> ratio ~<Y> IN/OVER band; <一個子句>; if 2nd >1.20 → <Z>; → calibration-log) |
```

**只放**：verdict + ratio/band + rollback trigger + 指標。
**完整敘述**（為什麼超標、發生了什麼、學到什麼）→ `calibration-log.md`。

---

## Retrospective Q2 必答

```markdown
### Q2 — Calibration

- Scope class: `<class>`（第 N 個資料點）
- Bottom-up est: X hr
- Committed (calibrated): Y hr (mult Z [× agent_factor F])
- **Actual: A hr**
- **Ratio: A / Y = R**
- Band 判定: IN (0.7-1.2) / OVER (>1.2) / UNDER (<0.7)
- 行動: KEEP / re-point to <new> / 需要更多資料點
- 若 |R - 1.0| > 30%：記一條待辦到 BACKLOG.md
```
