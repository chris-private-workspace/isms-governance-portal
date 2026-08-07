# Calibration Log — 完整敘述紀錄

**Purpose**: 每個 scope class 的完整校準敘述（為什麼超標 / 發生了什麼 / 學到什麼）。
`calibration-matrix.md` 的每一格只放 1 行判決 + 指標；**敘述住這裡**。

**Category / Scope**: Development Process / cross-phase historical record
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

---

## 為什麼要分成兩個檔

Matrix 是**決策表** —— 起草 plan 時查一眼就要能用。
Log 是**歷史紀錄** —— 只有在要調整某個乘數、或要理解某個異常時才讀。

把敘述留在 matrix 裡會發生什麼：真實案例是那張表**兩度**膨脹到佔檔案 47%，
每個 closeout 抄前一個臃腫的格子當範本，越滾越大，而查表的人每次都要跳過大段敘述。

**分開之後**：matrix 保持可掃描，log 可以盡情寫細節。

---

## §1 — 逐 class 敘述

<!-- 每個 scope class 一節，newest-first 累積資料點。 -->
<!-- 下面是格式範例，第一個真實 closeout 時替換掉。 -->

### `<example> greenfield-feature`

**現行乘數**: 0.55 | **資料點**: 0

<!--
每個資料點一段，格式：

#### Phase X.Y — ratio ~R（IN/OVER/UNDER band）

- Bottom-up X hr → committed Y hr (mult Z) → actual A hr
- **發生了什麼**：<2-4 句。哪個環節超出/低於預期，為什麼>
- **是雜訊還是訊號**：<這次的偏差是一次性的意外，還是這個 class 的系統性特徵？>
- **行動**：KEEP / re-point to <new> / 等更多資料點
-->

---

## §2 — Agent Delegation 觀察

<!-- 記錄 agent_factor 的實際表現，特別是「隱藏成本」的實測值 -->

### 委派 phase 的成本結構觀察

<!--
每次 agent-delegated phase 之後記錄：
- 寫 code 時間（agent）: X min
- 複驗時間（自己重跑 gate）: Y min
- prompt 精修時間: Z min
- 修正 agent 遺漏的時間: W min
- **實際節省 = 若自己寫的估計 - (X + Y + Z + W)**

這是唯一能判斷 agent_factor 準不準的方式。
-->

---

## §3 — 跨 class 觀察與模式

<!-- 累積 5+ 個 phase 之後，這裡會浮現一些跨 class 的規律。例如： -->
<!-- - 「所有含 drive-through 的 phase 都比同 class 的無 drive-through 版本多 ~1.5 hr」 -->
<!--   → 這代表 drive-through 應該獨立成一個 bottom-up 項目，而不是靠乘數吸收 -->
<!-- - 「Day 0 抓到 3 個以上 drift 的 phase，ratio 都在 band 內」 -->
<!--   → 這是 Day-0 驗證 ROI 的直接證據 -->

---

## §4 — 乘數變更歷史

| 日期 | Class | 從 | 到 | 觸發原因 |
|------|-------|---|---|---------|
| | | | | |
