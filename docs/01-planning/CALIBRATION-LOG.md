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

### `pattern-reuse-feature`

**現行乘數**: 0.50 | **資料點**: 1（⚠️ **定義受污染，不可與未來的點併入同一窗口**）

#### Phase W05 — ratio 0.69（UNDER band，**僅在修正定義下**）⛔ 這一則的重點是定義破了

- Bottom-up 14 hr → committed 7.0 hr (mult 0.50) → actual **4.86 hr（修正）/ 15.20 hr（字面）**
- **⛔ 預先宣告的定義在這裡失效，而失效方式是可預測的**：plan §7 宣告
  `actual` = branch base → closeout commit 的牆鐘跨度（W04 同定義）。但 base `a2b1906`
  是 **W04 的 closeout commit**，不是 W05 的起工時刻 —— 兩者之間隔了 **10h20m 的一夜**
  （`a2b1906` 08-10 23:11 → 本 phase 第一個 commit `c70e57a` 08-11 09:31）。
  字面套用得到 15.20 hr / ratio **2.17**；扣除間隙是 4.86 hr / ratio **0.69**。
  ⚠️ **這兩個數字是 closeout commit `8f08f3f`（author date 14:23:25）落地後從 `git log` 回讀的。**
  先寫下的估計是 `~14:30 → 0.71 (IN)`，真實時間戳給 **0.69 (UNDER)** ——
  差 0.006，**但它跨過一條判定線**，所以照 W04 `5bb0c9f` 的先例單獨開 commit 修正。
  ⚠️ **本則的 SHA 一律是 rebase 後 main 上的**（PR #36 用 rebase merge，branch 側的
  `785be55` / `f9195da` 已不在 main 上）。**author date 未被 rebase 改變，所以算術不受影響。**
  **它不是量錯，是這個定義從一開始就內含一個沒被寫出來的前提**：base 是本 phase 的起工時刻。
  W04 恰好背靠背在同一個晚上，所以前提成立而沒人看見它。
- **⚠️ 修正值是下界**：plan 與 checklist 的起草發生在第一個 commit 之前，時點**不可機械導出**。
  不替它補估計 —— 那正是 `AD-CalibrationMetric-1` 當初在批評的事。
- **⚠️ 修正定義套回 W04 會改變一個已登記的點**：`6b2e364` 18:33 → `5bb0c9f` 22:26 = 3.89 hr，
  ratio **0.66** 而非登記的 0.81。**沒有改它** —— 重算一個已登記的點是決定不是整理。
- **是雜訊還是訊號**：**兩者都不是，是計量問題** —— 與 W03 那則同一個病的第二次發作。
  W03 發現「actual 欄一直在混裝兩種量」並提議了定義；本次發現**那個定義本身有隱含前提**。
  ⭐ 值得記的是：**兩次都不是靠更多資料點發現的，是靠寫下定義然後照著量**。
- **行動**：**KEEP 0.50**，本點標記為「定義受污染」→ `AD-CalibrationMetric-2`。
  ⚠️ **UNDER band 不觸發調降** —— matrix 的鐵律是「單次離群值忽略，需要 3-phase 移動證據」，
  而這裡連「一個可用的點」都還不是。在定義修好之前，
  `pattern-reuse-feature` 的有效樣本數是 **0**，不是 1。

---

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

**現行乘數**: 0.65 | **資料點**: 4（⚠️ **仍只有 1 個可用** —— W06 無有效 actual，見下）

#### Phase W06 — ⛔ **無 ratio**（不是 UNDER、不是 OVER，是**量不到**）

- Bottom-up 13 hr → committed ~6.5 hr (0.50) → **Day 1 改判 spike** → ~8.5 hr (0.65)
- **改判理由**：D1 拍板的 A′ 是本 repo 第一個非單一 `FOR ALL` 的 policy 形狀，
  觸發 plan §1/§7 **起草時就寫好**的條件。⭐ 值得記的是**改判發生在 Day 1 而非 retro**——
  預先宣告條件的價值就在這裡：它讓改判是執行規則，不是事後歸類。
- ⛔ **為什麼不產出 ratio**：逐字套用 `AD-CalibrationMetric-2`（branch 第一個 commit →
  closeout commit）得到 **≈17.8 hr → ratio ≈2.09**，而中間跨了一夜
  （17:27 → 09:47，**約 16.3 hr 無活動**）。**新定義只移除了「上一個 phase 的 closeout 當 base」，
  完全沒有處理閒置區間** —— 它是為了修 W05 的污染而生的，**第一次套用就被同一類污染擊中**。
- **commit 時間戳在本 phase 根本量不到工作**：session 內相鄰 commit 間隔只有
  31.7 min（Day 0-1）與 24 min（Day 2-3），而 **Day 2 的全部實作**（schema + migration +
  2 repository + 2 controller + 6 個測試檔）落在兩個 session 之間那段無 commit 的區間裡。
  **每個 session 第一個 commit 之前的工作，這個量尺看不見。**
- ⭐ **真正的根因不是量尺壞了，是我沒用量尺。** `task-workflow.md` §Step 5 明文要求
  progress.md 逐日記錄逐任務工時；**W06 一次都沒記**。
  ⚠️ **W04 那則已經預告過這件事** —— 它寫著「`AD-TimeTracking-1/-2` 仍不建議關閉：
  本則證明的是牆鐘可用，不是逐項工時不需要」。**W06 就是它咬人的那個 phase。**
- **行動**：**KEEP 0.65**，本點記為**無有效 actual**，⛔ **不併入 3-phase 窗口**
  （與 `pattern-reuse-feature` 的受污染點同樣處理）。
  下個 phase **Day 1 起在 progress.md 記逐任務分鐘數**；**連續 2 個 phase 有資料後再檢討定義** ——
  先修執行，不要再改一次定義。→ `AD-CalibrationNoActual-1`
- ⚠️ **W04 那則預告的「第一次真正的 3-phase 窗口判定會在 W06 成立」因此沒有成立。**
  同單位的有效樣本仍是 **1**（W04）。

#### Phase W04 — ratio 0.81（IN band）⭐ 第一個「先定義、再量」的資料點

- Bottom-up 9 hr → committed 5.9 hr (mult 0.65) → actual **4.79 hr**
- **量測基礎**：`AD-CalibrationMetric-1` 提議的定義，**在 plan §7 起草時就寫進去**：
  branch base `65ce121` `08-10 17:38` → closeout commit。
  W03 那則是**事後**用這個定義回推的；本則是**事前宣告、事後照量**。差別不在數字，
  在於它是不是一個可被複製的程序。
- **⭐ 這一則的價值不在 ratio 而在「資料點的可用性」**：三個 `spike` 資料點的單位史是
  W02（人力工時估計）· W03（事後回推的牆鐘）· W04（事前宣告的牆鐘）。
  **只有 W04 是照定義量的**，所以嚴格說 3-phase 移動窗口目前有效樣本數是 **1**。
  ⚠️ 這不是壞消息 —— 它終於是**單調的**：從這裡開始每個 phase 都會加一個同單位的點，
  第一次真正的窗口判定會在 W06 成立。
- **是雜訊還是訊號**：**都不是，資訊量還不夠。** 0.81 落在 band 中段，
  而前兩個（重算後 0.75 / 0.34）分散極大。單看本點會誤以為「0.65 剛剛好」，
  但那是拿一個點去證明一條線。
- **行動**：**KEEP 0.65。** 依 matrix 的鐵律「單次離群值忽略，需要 3-phase 移動證據」——
  何況本點連離群都不是。**下一次可以談調整乘數的時機是 W06**，且必須是同單位的三點。
- **順帶結案的**：`AD-CalibrationMetric-1` 的提議定義已在本 phase **實際走過一遍**
  且成本可接受（`git log` 兩個 commit，< 1 min）→ 可從「提議」升為現行程序。
  ⚠️ 但 `AD-TimeTracking-1` / `-2` **仍不建議關閉** —— 本則證明的是「牆鐘可用」，
  不是「逐項工時不需要」；只是後者在目前執行模式下取不到。

#### Phase W03 — ratio 0.34（UNDER band）⭐ 這一則的重點不是數字，是量測本身

- Bottom-up 19 hr → committed 12.5 hr (mult 0.65) → actual **~4.3 hr**
- **量測基礎**：**牆鐘跨度**，`git log` 機械導出 ——
  branch base `5bbc252` `08-10 11:40` → closeout `~16:00`。
  plan §7 承諾的「逐日計時」**做不到**：工作由 AI session 執行，逐項工時只能回推。
  Day 0 progress 已記下這一點，本次不再重複記錄「又沒計時」，改為處理它。
- **⭐ 發生了什麼：這一欄一直在混裝兩種量。** 把三個 phase 的牆鐘跨度與登記的 actual 並排：

  | Phase | 牆鐘跨度（commit 首→尾）| 登記的 actual | 一致？|
  |---|---|---|---|
  | W01 | 08-08 16:30 → 20:57 = **4h27m** | ~5.0 hr | ✅ 同一個量 |
  | W02 | 08-09 16:03 → 08-10 00:13 = **8h10m** | **~12.1 hr** | ❌ **actual > 窗口** |
  | W03 | 08-10 11:40 → ~16:00 = **~4h20m** | ~4.3 hr | ✅ |

  **W02 那一列算術上不可能** —— 逐項加總 12.1 hr 大於工作實際發生的 8h10m 窗口，
  循序執行做不到。所以那 12.1 不是量測，是「這件事若由人手做要多久」的估計。
  W01 與 W03 是牆鐘，W02 是人力工時估計 —— **乘數的輸入從未一致，所以它不可能收斂**。
  這解釋了為什麼三個 phase 下來仍然停在「等更多資料點」：
  問題不在資料點的**數量**，在它們的**單位**。
- **用一致定義重算**：W01 **0.35** · W02 **0.75** · W03 **0.34**。
  三個裡兩個 UNDER band，且那兩個幾乎相同（0.34 / 0.35）——
  比原本 0.35 / 1.10 的雜訊圖像清楚得多。W01 的 calibration-log 曾提出假設 (a)
  「bottom-up 是人手尺度、實際是 AI 輔助執行 → 乘數應在 0.35-0.45」，
  這組重算值**與該假設一致**，但仍不足以據此調整（見下）。
- **是雜訊還是訊號**：**方法問題，不是數值問題。** 重算的 W02 (0.75) 是我事後換算的，
  不是當時量的；拿換算值當資料點，等於用一個推導填掉一個缺口 ——
  那正是本則在批評的事。
- **行動**：**KEEP 0.65，但先定義 `actual`** → `AD-CalibrationMetric-1`。
  提議定義：**branch base commit → closeout commit 的牆鐘跨度**，因為它
  (a) 由 `git log` 機械導出、(b) 含間隙成本、(c) **不依賴 AI 有一個鐘**。
  ⚠️ 代價明說：牆鐘含閒置（W02 的 8h10m 裡有 `20:35 → 23:52` 的 CI 修復間隔），
  會系統性高估專注工時 —— 但**一個一致的高估可以被乘數吸收，混裝的兩種量不行**。
  定義拍板後，`AD-TimeTracking-1` / `-2` 應一併結案：它們要求的資料
  在目前的執行模式下**不存在**，繼續要求只會每個 phase 記一次「這次也沒做到」。

#### Phase W02 — ratio 1.10（IN band）⚠️ 見上方 W03：此值與 W01/W03 不是同一個量

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
