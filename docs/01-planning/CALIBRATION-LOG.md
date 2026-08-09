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

<!-- 格式範例（W01 closeout 時範例節已刪除，保留註解形式供參）：

### `<class>`

**現行乘數**: <mult> | **資料點**: <N>

每個資料點一段，格式：

#### Phase X.Y — ratio ~R（IN/OVER/UNDER band）

- Bottom-up X hr → committed Y hr (mult Z) → actual A hr
- **發生了什麼**：<2-4 句。哪個環節超出/低於預期，為什麼>
- **是雜訊還是訊號**：<這次的偏差是一次性的意外，還是這個 class 的系統性特徵？>
- **行動**：KEEP / re-point to <new> / 等更多資料點
-->

### `greenfield-scaffold`

**現行乘數**: 0.60 | **資料點**: 1

#### Phase W01 — ratio ~0.35（UNDER band）

- Bottom-up 24 hr → committed 14.4 hr (mult 0.60) → actual **~5 hr**
- **⚠️ 量測基礎不足**：`progress.md` 全程沒有逐任務工時（`task-workflow.md` Step 5 要求
  「Task X.Y — actual Z min」）。5 hr 是從 commit 時間戳回推的 ——
  首個 commit `e6ddff1` 16:30 → Day 3 收尾 `6ec4bf9` 19:57 = 3h27m，
  加上第一個 commit 之前的 plan 起草與 Day-0 verify，再加 Day 4 收尾。
  **這是估算不是量測**，資料點品質因此打折 → `AD-TimeTracking-1`
- **發生了什麼**：即使把量測誤差算進去，0.35 仍遠低於 band 下緣。兩個候選解釋，
  本 phase 無法區分：(a) bottom-up 的 24 hr 是「人手寫」的尺度，而實際是 AI 輔助執行 ——
  若如此，這個 class 的乘數應在 0.35-0.45；(b) 本 phase 的 scope 恰好高度模板化 ——
  骨架大量沿用姊妹專案 `unified-operation-platform` 的已知形狀，探索成本比一般 greenfield 低。
  值得注意的是，**耗時的不是「寫骨架」，而是五次「綠燈但什麼都沒做」的排查** ——
  boundaries 設定六次不生效、三個掃描 job 空轉、build 產物起不來。
  這類成本在 bottom-up 拆解時完全沒有對應的項目。
- **是雜訊還是訊號**：**不知道**，這是第 1 個資料點。若第 2 個 phase 也 < 0.70，
  那 (a) 就是訊號，應 re-point 到 0.40。
- **行動**：**等更多資料點**。依 matrix §何時調整乘數，單次離群值忽略，需要 3-phase 移動證據。
  第 1 個資料點就調乘數會讓它在兩極間振盪，永遠收斂不了。

---

### `spike`

**現行乘數**: 0.65 | **資料點**: 1

#### Phase W02 — ratio 1.10（IN band）

- Bottom-up 17 hr → committed 11 hr (mult 0.65) → actual **~12.1 hr**
- **量測基礎**：Day 1-3 有逐項工時（`AD-TimeTracking-1` 的要求），加總 **8.9 hr**。
  **Day 0 沒有** —— 而它是工作量第二大的一天（三-prong verify + 兩次獨立 database 的
  `FORCE RLS` 實測 + 範圍擴大協商），~2.0 hr 是回推的。Day 4 收尾 ~1.2 hr。
  另外逐項加總**不含間隙成本**（讀文件、跑 gate、commit、寫 progress），
  所以真實值偏高而非偏低 → `AD-TimeTracking-2`
- **發生了什麼**：ratio 落在 band 內，但過程不是「估得準」，而是**兩個方向的偏差互相抵消**。
  低估的一側：bottom-up 完全沒有「量測承重假設」這個項目 —— Day 2 花了 55 分鐘在三輪 probe
  上，而那 55 分鐘產出的不是程式碼，是**推翻 Day-0 一項結論**（D-failclosed 的範圍過窄）。
  Day-0 甚至因為那個錯誤結論**減了 0.5 hr**。
  高估的一側：Day-0 已經把承重機制驗過（`$extends` / `set_config` / `FORCE RLS` 行為），
  所以 2.1 的 extension 本體只花 40 分鐘（估 90）。
- **這個 class 的特徵假設**：`spike` 的變異來源不是「寫得慢」，是**量測與返工** ——
  W02 有三次「前提錯誤的量測」（superuser 連線、殘留 fixture、`RESET` 當成未設定），
  合計約 40 分鐘，且**沒有一次是被 gate 抓到的**。若第 2、3 個資料點也出現這一項，
  那不是雜訊，是這個 class 應該內建的成本。
- **是雜訊還是訊號**：第 1 個資料點，且品質有瑕疵（Day 0 未計時）。無法判斷。
- **行動**：**KEEP 0.65，等更多資料點**。需要 3-phase 移動證據，且下一個 `spike`
  必須 Day 0 也計時，否則第 2 個資料點會有同樣的瑕疵。

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
