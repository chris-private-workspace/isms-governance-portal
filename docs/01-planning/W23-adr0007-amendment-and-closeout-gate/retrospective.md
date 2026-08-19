# Phase W23 — Retrospective

**Phase**: W23 — 裁決本地密碼衝突 + 給 closeout 補上它缺的那一格
**Period**: 2026-08-19 ~ 2026-08-19
**Plan**: [plan.md](./plan.md)
**PR**: PR-pending
**Change record**: `docs/03-implementation/changes/CH-043-break-glass-adr-and-the-closeout-cell-that-was-missing.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | D1 拍板（本地密碼路徑的性質）| ✅ 完成 —— **(a) break-glass**，寫在 ADR-0015 §Decision，不是留在對話記錄 |
| US-2 | ADR-0015 採納，可證偽條件真的可能 fire | ✅ 完成 —— **5 條**，每條帶 `*Fires when*:`；舊 FC2 刪除並留下理由 |
| US-3 | `AD-30` / `AD-43` 關閉 | ✅ 完成 —— 全檔零 Azure China 現在式；OpCo **13** |
| US-4 | 四個落點各兩格 + E5 機械守衛 | ✅ 完成 —— 兩格 md5 逐字相同 ×4；E5 + landed gate |
| US-5 | E5 負面驗證 PASS（**MANDATORY**）| ✅ 完成 —— **9 個情境**，預測先 commit |
| US-6 | `CH-043` + retrospective + calibration | ✅ 完成 |

**未完成項目**：無。**範圍超出計畫的部分**列在 Q6。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `docs / audit / template`（**第 1 個資料點** —— live 表上原本沒有這一列）
- **Agent-delegated**: `no`（plan 宣告值，實際符合 —— 全片零委派）
- **Bottom-up est**: **6.5 hr**
- **Committed (calibrated)**: **2.6 hr**（mult 0.40）
- **Actual**: **≈ 1.6 hr**（Day 0 `15` + Day 1 `16` + Day 2 `24` + Day 3 `12` + Day 4 `~29` = **96 min**）
- **Ratio**: 1.6 / 2.6 = **0.62**
- **Band 判定**: **UNDER**（< 0.7）

**發生了什麼**：

三個 phase 連續同一個訊號，而它**不在乘數上**：

| Phase | class | ratio (actual/committed) | **actual/bottom-up** |
|---|---|---|---|
| W22 | `greenfield-feature` | 0.46 UNDER | **0.26** |
| **W23** | `docs / audit / template` | **0.62 UNDER** | **0.25** |

`CALIBRATION-MATRIX.md` 開頭就寫著「**低於 0.4 代表你的 bottom-up 估算方式有系統性問題，
該修的是估算不是乘數**」。連續兩個 phase 的 `actual/bottom-up` 都落在 **0.25-0.26** ——
⇒ **不是這兩個 class 的乘數錯了，是 bottom-up 估算本身系統性高估約 4 倍。**

W22 retro 已經指出根因的一半：**有藍本的東西被當成沒藍本估**。W23 再次驗證 ——
E5 的 bottom-up 是 1.5 hr（按「寫一個新 detector」估），而 E1–E4 就在同一個檔裡，
真實成本是 24 min，**其中還包含了兩個我自己的 bug**。

⚠️ **但本片的分子有一個真實的膨脹來源，必須寫出來**：Day 4 花了約 29 min，
其中**超過一半**是計畫外的 —— 發現 marker 格式漏了 4 種、發現 E5 會在 closeout 當下誤擋。
若沒有那兩件事，Day 4 約 12 min，總計 79 min，ratio **0.51**。
⇒ **本片的 ratio 偏高（相對其他 UNDER 點）不是估得比較準，是做了計畫外的工作。**

**行動**: **KEEP 0.40**（單點不 re-point）。⛔ **但要記一條 AD 針對 bottom-up 方法** ——
第 2 次落在 0.25-0.26 已經越過「單次離群值」的門檻。

- [x] 已回填 `calibration-matrix.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `calibration-log.md` §1
- [x] |R − 1.0| = 0.38 > 30% → AD 已記入 `BACKLOG.md`（`AD-BottomUpEstimateInflated-1`）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**5**（Prong 1: **0** / Prong 2: **5** / Prong 3: N/A）
- Day-0 成本：**15 min**
- **預防的返工**：~**3-4 hr**
- **ROI**: ~**14×**

**最有價值的那個 drift**：**`D-adr-breakglass`** —— plan 把衝突的方向寫反了。

它值錢不在於省時間，而在於**沒有它，這份 ADR 會論證錯的東西**：
plan 寫「ADR-0007 禁止 break-glass」，而 `0007:67` 其實**要求** break-glass，只是把它指派給
Entra emergency accounts。若照 plan 寫，ADR-0015 會花整節論證一件 ADR-0007 從沒說過的事，
而**真正的矛盾（`:67` vs `:103`）會原封不動留在那裡**。

⭐ 第二名是 `D-baselines` —— 它抓到的不是 drift 而是**測試 runner 的一個綠色故障**
（合併跑 web 回報 `Test Files 1 passed (1)`，真值 10/95）。那條的價值跨越本片。

---

## Q4 — 做得好的（保持）

- ⭐ **把預測 commit 在執行之前**（`c67a38a`, 13:31:04）。「我預測了」從一句宣稱變成 git 能裁決的事。
  ⇒ 這個做法應該成為所有負面驗證的預設。
- ⭐ **「措辭一致」用 md5 而不是逐處對讀**。對讀正是 `AD-ProxyMetricAsAnswer-1` 出事的地方。
- ⭐ **變異測試（plan 沒要求，自行加做）** —— 它產出了本片最重要的發現，而
  「跑一次 detector 看它綠」永遠得不到那個結論。
- **預測「維持綠」的格子**。9 個情境裡有 3 個預測是綠，而那 3 個才是證明「它不是對什麼都開火」的。
- **`gh pr list` 查每一個 PR 號與 merge commit**，一次都沒有靠記憶 —— 10 個 marker 全部如此。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | E5 在既有 detector 內，`run_all` 已註冊；四個落點都在主流程文件上 |
| AP-2 Cross-directory scattering | 0 | ADR 在 `14-adr/`，detector 在 `scripts/lint/`，各自單一目錄 |
| AP-3 Potemkin | **0，但這是本片自己量出來的** | ⭐ 負面驗證證明 E5 會擋住它宣稱會擋的東西；⚠️ **同時證明 `run_all` 9/9 對三個真實迴歸完全無感** —— 那不是本片的 AP-3，是對「gate 綠即證據」這個假設的反證 |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | landed gate 有當下的真實使用案例（本片自己的 closeout 就會誤報）；`require_landed` 參數有兩個真實呼叫端 |
| AP-6 Mock vs real divergence | 0 | fixture 與真 repo 走**同一個** `stale_pending()`；⚠️ 唯一分歧是 `require_landed`，已具名測試兩個方向 |
| AP-7 命名 / orphan claim | **1 → 已修** | 我在測試 docstring 裡引用了 `AD-E5BlindToStandaloneCh-1` 而它當時**還不存在** —— 那是 orphan claim，已補上該 AD |
| **總計** | **1（已修）** | |

**Lint**: `run_all.py` **9/9** ✅ · detector 測試 **4 檔 63 tests**（13 + 18 + **24** + 8 = 63）

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-GateGreenDecaysAfterFix-1` 🟡 | 三個真實迴歸下 `run_all` 全部 9/9 —— 一個 gate 的偵測力隨它守的缺陷被修好而歸零 | (a) 變異測試變成**改 detector 時的常規動作**；(b) `run_all` 輸出附每個 detector 的**檢查項數**，讓「少了一項」看得見 | 候選 |
| `AD-BottomUpEstimateInflated-1` 🟡 | `actual/bottom-up` 連兩個 phase 落在 **0.25-0.26**，遠低於 matrix 自己宣告的 0.4 下限 | 估算時**先問「這個東西有沒有藍本」**；有藍本者按「改既有檔」估而非「寫新檔」 | 候選（**第 2 個資料點**）|
| `AD-E5BlindToStandaloneCh-1` 🟡 | 檔頭完全不含 phase id 的單檔記錄，E5 解不出授權 ⇒ 跳過 | 用 git 當授權：引入 commit 是否已在 `origin/main` 上 | 候選 |
| `AD-DecisionTableSaysUndecided-1` 🟡 | 兩份導航檔把已採納的 ADR 顯示成未定（**本片之前就存在**）| 一次性掃過所有引用 ADR 狀態的文件；或加 detector 比對 | 候選 |
| `AD-GateMessagePointsAtWrongCause-1` 🟢 | detector 失敗訊息指向錯的成因，同一天 2 次 | 「對照組沒有如預期表現」的訊息必須把**「對照組被改壞」列在第一個** | 1 個已修 |
| `AD-ProfileChangePasswordNoFuture-1` 🟢 | 按鈕存在理由隨 ADR-0015 過期 | 下次碰 `/my-profile` 時**按鈕與檔頭同時改** | 候選 |

**升級既有 AD**：`AD-NarrowPatternWideClaim-1` —— ⭐ **這個形狀升了一層：枚舉步驟本身可以是窄的**
（見 Q7）。

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

### ⭐ 本片最貴的一課：我枚舉了開放集合

Day 2 我照 `lint-detector-authoring.md:67` 先做枚舉，並在 progress.md 裡寫「**枚舉先於 pattern，
而它立刻付錢**」。那句話是真的 —— 它抓到了第 5 種格式 `PR 待開`。

**但我枚舉的是「我想得到的拼法」，那是一個開放集合。** Day 4 讀 CH-042 的格式時**偶然**撞到
`#86（pending）`，重做才發現實際還漏了 **3 種格式 + 1 個搜錯範圍**（`memory/` 沒掃）
⇒ **E5 上線時對 9 個活的 stale marker 漏了 4 個（44%）**。

⛔ **正解**：marker **欄位**（`^\*\*PR\*\*:`）是**封閉且可 grep** 的；它的**值**不是。
**錨定封閉集合，分類它的值。**

⚠️ 諷刺的地方：我在 Day 2 的 commit message 裡引用了 `AD-NarrowPatternWideClaim-1` 來說明
自己做對了什麼 —— 而我當時正在犯它，只是升了一層。

### 第二課：我是自己這個 gate 的第一個使用者，而它擋住了我

Day 4 模擬 closeout（翻 `status: closed`）時，E5 對 **`CH-043` 與 `plan.md` 兩處開火** ——
其中 `plan.md:280` 那一行**正是 R4 本身的文字**（「合法的 PR-pending 不可被擋」）。
**detector 對警告它不該開火的那句話開火了。**

根因是流程順序：closeout **先翻 status、後開 PR**（`phase-closeout` §4.5 在 §7 之前），
所以從 closeout commit 到 post-merge commit 之間，「closed + pending」**兩者都是對的**。
⇒ 加上 **landed gate**：E5 只裁決**已經落在 `origin/main` 上**的 closeout。

⚠️ **這個缺陷 plan R4 已經預言，而我照樣做出來了** —— 因為我寫的負面案例
（`W98-fixture-active`）測的是「pre-doc 還 active」，而真實的誤擋情境是
「**pre-doc 已 closed 但還沒 merge**」。**負面案例測對了方向，測錯了狀態。**

**帶到下個 phase 的**：

- `AD-GateGreenDecaysAfterFix-1` · `AD-BottomUpEstimateInflated-1` · `AD-E5BlindToStandaloneCh-1` ·
  `AD-DecisionTableSaysUndecided-1` · `AD-GateMessagePointsAtWrongCause-1` ·
  `AD-ProfileChangePasswordNoFuture-1`
- ⛔⭐ **`AD-UndiagnosedWebTestFailure-1` —— 我在本片內把自己的歸因推翻了兩次中的第二次**。
  Day 0 判定「**合併跑**才會只跑一部分」，緩解訂為「web 一律單獨跑」。
  **Day 4 的 final gate 用單獨跑直接重現了** `Test Files 1 passed (1)` ⇒ **那個緩解擋不住任何東西**。
  新的實測事實：**頻率約 1/5**；**部分跑執行的永遠是字母序第一個檔**
  （`demo-session.test.ts`，恰好 5 個 test）⇒ 症狀是「跑完第一個檔就停並回報 passed」。
  ⛔ 仍不宣稱機制。⇒ **唯一與機制無關的緩解是把檔數當斷言**：每次都要看到 `Test Files 10`。
- **M4 的前置**：ADR-0015 FC-3 要求一次**不碰 Entra 的 break-glass 演練**，且它是 M4 done 的前提。

**這個 phase 關掉的**：

- `AD-LocalPasswordFallback-1` 🔴 P0 ✅ CLOSED（卡兩個 phase）
- `AD-30` ✅ CLOSED（ADR-0007 那半）
- `AD-43` ✅ CLOSED（ADR-0007 那半）
- `AD-StalePrPendingNoDetector-1` ✅ CLOSED

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）—— **只動 2 行**
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [x] Calibration ratio 回填 matrix（**不在** CLAUDE.md / MEMORY.md 散文裡）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— **E2 新增 W23 實例**（把 `architecture.md` 依角色分類而沒讀它）·
      **新增 E6**（R5 的新形狀：gate 的偵測力隨缺陷被修好而歸零）· **R5 緩解證據 +1**（E5 是新的常駐負面案例）
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] ⭐ **已採納的 ADR 已複查** —— ✅ **本片就是在做這件事**：ADR-0007 被 ADR-0015 取代，
      6 處活的指標已 repoint；既有漂移（`06-tech-stack:38` + `architecture.md:106-108`）
      記為 `AD-DecisionTableSaysUndecided-1`，未當場修（**本片之前就存在**）
- [ ] ⭐ **`PR-pending` 標記已翻** —— 🚧 **merge 之後才做得到**。本檔與 `CH-043` 現為 `PR-pending`，
      merge 後以 `gh pr view <N> --json state,mergedAt` 驗證再翻。
      機械守衛：`check_status_markers.py` **E5** + landed gate
- [x] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
