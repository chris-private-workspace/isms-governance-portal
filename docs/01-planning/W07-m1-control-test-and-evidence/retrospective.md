# Phase W07 — Retrospective

**Phase**: W07 — M1 slice 4：`ControlTest` + `Evidence`，與父表拒絕複合錨點時的範疇防護
**Period**: 2026-08-12（Day 0-4 同日）
**Plan**: [plan.md](./plan.md)
**PR**: ⏳ **未推送** —— push 是 outward-facing，等使用者確認
**Change record**: `docs/03-implementation/changes/CH-022-w07-control-test-and-evidence.md`
**Design note**: `docs/02-architecture/design-notes/W07-cross-entity-references.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | RI 檢查與 RLS 的關係：**M1-M8 八個問題各有實測答案**，機制由結果導出 | ✅ 完成 |
| US-2 | `ControlTest` 表 + `/control-tests` + 四個範疇測試 | ✅ 完成 |
| US-3 | `Evidence` 表 + `/evidence` + 四個範疇測試 + 多型連結的範疇防護 | ✅ 完成 |
| US-4 | `extension_fields` per-command 拆分（**先看到紅**才修）| ✅ 完成 |
| US-5 | 元驗證 **8 組全紅** | ✅ 完成（⭐ 其中 2 組在修法前是 0）|
| US-6 | `CH-022` + design note + retro + calibration + 導航檔 | ✅ 完成 |

**未完成項目**：無。checklist 無未勾 `[]`；Day 2 的唯一 🚧（`risks` int 11b）已於 Day 3 解封並驗證。

**超出 plan §4 的**（兩項，都在 Day 4 closeout 自檢中發現）：

1. `20260812164500_correct_parent_guard_comment` —— `COMMENT ON FUNCTION` 在 Day 2 的
   SQLSTATE 改判時沒跟著改，「both raise 42501」這句**錯誤宣稱活在資料庫裡**
   （`pg_description` 實查確認，不是讀原始碼推論）。以**新 migration** 更正，
   因為編輯已套用的 migration 會撞 `AD-MigrationChecksum-1`。
2. `02a:227`（Evidence）的偏離註記 —— plan §4 #21 只寫了 `:225`，但 `linked_type` 只建一個值
   同樣是有記錄的偏離（W06 對 `02a:217` 的處置先例）。

**AC 逐條**：10 條全部達成。AC-8 的措辭依 plan 要求寫成
「**API-level verified**（真進程 + 真 PostgreSQL），無 UI，不主張可用性」，
全篇無 drive-through PASS 字樣。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `spike`（**第 5 個資料點**，⭐ **同單位的第 2 個有效點** —— W04 之後首次）
- **Agent-delegated**: `no`（plan 時宣告，實際亦無委派）→ 三段式
- **Bottom-up est**: **19.75 hr**
- **Committed (calibrated)**: **12.8 hr** (mult 0.65)
- **Actual**: **~3.4 hr**（12:27 起算至 closeout，**同日無跨夜**）
- **Ratio**: 3.4 / 12.8 = **0.27**
- **Band 判定**: ⛔ **UNDER**（< 0.7），而且是**大幅** UNDER

### 資料來源（這次是量的，不是估的）

| 段 | 錨點 | 值 |
|---|---|---|
| Day 1 | 12:27（`date`）→ 12:37（`date`）| **10 min** |
| Day 2 | `b1dfaef` 12:39:45 → `9f9e45a` 14:46:05 | **2 hr 06 min** |
| Day 3 | `9f9e45a` → `5aa768e` 15:17:06 | **31 min** |
| Day 4 | `5aa768e` → closeout commit | closeout 時填 |

`AD-CalibrationMetric-2` 的定義（branch 第一個 commit → closeout）本次**乾淨適用** ——
沒有跨夜、沒有閒置區間。Day 0 的起草在窗口之外，故本值是**下界**。

### ⛔ 但真正的發現不是 ratio，是我差點把估算當成量測交出去

Day 3 的 progress 表原本寫 **1 hr 22 min**，宣稱結束於 **16:05**。
Day 4 起手取 `date` 得到 **15:41** —— **一個還沒發生的時刻**。
commit 時間戳給出真值：Day 3 = **31 min**，原值**超估 2.6 倍**。

根因：15:14 之後沒有再取過任何一次 `date`，剩下四段全是**先寫下預期耗時、再把它當成量測**。
每段單看都「合理」，累積起來把 31 分鐘寫成 82 分鐘。

⚠️ `AD-CalibrationNoActual-1` 要求「逐日記錄逐任務分鐘數」，**我照做了** ——
但**記錄的動作本身不保證那些數字是量到的**。這條 AD 修好了「有沒有記」，
沒有修「記的是不是真的」。→ `AD-EstimateAsMeasurement-1`。

### 行動：**該修的是估算，不是乘數**

`actual / bottom-up` = 3.4 / 19.75 = **0.17**，遠低於 CALIBRATION-MATRIX §乘數表明訂的
**0.4 下限** —— 而該表對這個情況已經寫好了判準：
「**低於 0.4 代表你的 bottom-up 估算方式有系統性問題，該修的是估算不是乘數**」。

歸因（Day 1 / Day 2 progress 各記過一次，方向一致）：**bottom-up 假設從零建，
而實際的藍本複用率極高** —— 兩個 repository / 兩個 controller / 兩個 module / 兩個 int spec
的形狀已由 W03-W06 定死，寫的是**差異**不是全部。量測床（`int-global-setup.js` + 三筆 fixture control）
W06 也已經備好，「量測 2.0 hr」實際 10 min。

- **乘數 KEEP 0.65** —— `spike` 現有 W04 **0.81 (IN)** 與 W07 **0.27 (UNDER)**，
  兩點且**方向相反**，不構成 3-phase 證據。單點不調（matrix §何時調整）。
- **改估算方式**：下個 phase 的 bottom-up 必須對每一項標註
  **「有藍本 / 無藍本」**，有藍本的按「寫差異」估而不是按「寫全部」估。→ `AD-BottomUpBlueprint-1`。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md`
- [x] |R − 1.0| = 73% > 30% → AD 已記入 `BACKLOG.md`

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**6**（Prong 1: **1** / Prong 2: **5** / Prong 3: **0** —— 兩張表確認不存在，乾淨）
- Day-0 成本：⚠️ **未量測**。Day 0 的 progress 明寫「沒有可靠的逐任務計時，
  自 Day 1 起才記錄」，**所以這裡不填數字** —— 依 Q2 的教訓，估一個上去就是同一個錯誤再犯一次。
- **ROI**: ⛔ **不產出比值**（分母不存在）。改以「若沒抓到會怎樣」逐條說明。

**最有價值的那個 drift**：⭐ **D5** —— `governed_extensions/migration.sql:89-92` 記錄了
**W03 已實測** `SECURITY INVOKER` trigger 的讀取受 RLS 過濾，且明寫 `DEFINER` 是 escalation surface。
它把 Day 1 的候選機制從「沒人試過的點子」降級為「本 codebase 有實測前例的做法」。
⚠️ **但它答不了 M1** —— RI 檢查是否繞過 RLS 是另一個問題，前例只證明 trigger 的**讀取**受過濾。
把兩者混為一談就會跳過 M1，而 M1 正是整個 phase 的支點。

**次高**：**D4** —— 確認 `Control:808-812` 明文拒絕複合錨點、而 `assets` 確實有複合 FK。
plan §0 的核心前提因此**被證實**而不是被假設。若它不成立，整個 phase 的問題就不存在。

⛔ **最貴的那個是我自己製造的**：**D2**。第一次用 `grep "FORCE ROW LEVEL"`（單空格）得到 3/7，
實際 W05/W06 為對齊寫成兩空格，**7 張表全部都有**。
而我**已經把 3/7 當成事實對使用者講過一次**。它沒有造成設計損害（結論是「新表照樣加 FORCE」），
但它是本 phase 四次 evidence 問題裡的第一次。

---

## Q4 — 做得好的（保持）

- **先量再設計，而且量測結果推翻了預設。** plan §3.2/3.3 的防護欄刻意寫成「依 M1-M3 結果決定」，
  沒有預先寫死 trigger。M1 的答案（RI 繞過 RLS）如果是反的，這個 phase 交付的東西會完全不同。
- ⭐ **M5 是自己加的問題，而它是最重要的一個。** checklist 1.2b 整節是計畫外的 ——
  「trigger 是關掉 oracle，還是只換個編號？」不在原 plan 裡。答案（取決於**執行順序**而非 trigger）
  是整份 design note 的核心。**裝好防護之後多問一句「它真的關掉那件事了嗎」**。
- **改了常數就重新量。** SQLSTATE 從 `42501` 改成 `23503` 之後**重跑 M5**，
  而不是假設「只是改個錯誤碼、結論不變」。
- **零轉紅先查是不是假象。** N7 第一次「STAYED GREEN」被當成可疑而非發現 ——
  查下去發現錨點在該 migration 出現三次，我中性化到了 `asset_groups`。
  這條規則（W06 的教訓）在本 phase 救回一個錯誤結論。
- **HK1 的 0 rows 沒有被當成隔離證據。** 「看不到別人的」與「自己沒有資料」在單邊資料下
  是同一個觀察 —— 建了 HK1 自己的列再讀一次才算數。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 兩個新 module 皆由 `bootstrap/app.module.ts:50-51` 進入主流量 |
| AP-2 Cross-directory scattering | 0 | control-test / evidence 各自集中；建檔前 Grep 過既有 repository |
| AP-3 Potemkin | **0（1 個被攔下）** | ⭐ `ControlTest.result` **在建之前**被判定為與 §4 終態重複 → 不建。⚪ drive-through 不適用（無 UI）→ **API-level verified** |
| AP-4 PoC accumulation | N/A | 無 PoC；量測腳本留在 scratchpad，未進 repo |
| AP-5 Speculative abstraction | 0 | `linked_type` 只建一個值；`assert_parent_in_scope` 收參數是因為**當下就有兩個呼叫點**，不是為了未來 |
| AP-6 Mock vs real divergence | 0 | 無 mock；dev-principal 啟動時警告且每個回應帶 `_devPrincipal` |
| AP-7 命名 / orphan claim | **1（已修）** | ⛔ `COMMENT ON FUNCTION` 說「both raise 42501」而函式 raise `23503` —— **錯誤宣稱活在資料庫裡**。以新 migration 更正並實查確認 |
| **總計** | **1**（已修，非遺留） | |

**Lint**: `run_all.py` **6/6** ✅

### Design Note 8-Point Self-Check

| # | Point | 狀態 | 備註 |
|---|-------|------|------|
| 1 | Section header 對應 US | ✅ | §2.1–2.8 每節標 US 編號 |
| 2 | 每個 claim 有 `file:line` | ✅ | 全部錨點**逐一驗過**；4 個原本寫錯的已更正（見下）|
| 3 | Decision matrix | ✅ | §1 D1 六列 × 四選項 + D2 六列 × 兩選項，含逐項否決理由 |
| 4 | Verification command | ✅ | `npm run test:int -w apps/api` + 具名測試 |
| 5 | Test fixture ref | ✅ | `test/int-global-setup.js` `SEED.controls`（W06 已種）|
| 6 | Open invariant 分界 | ✅ | §4 列 **7** 項延後，含 `hash` 無任何驗證 |
| 7 | Rollback 路徑 | ✅ | §5 四列，兩列標「不要退」並說明理由 |
| 8 | Cross-ref single-source | ✅ | §3 兩個介面；明寫**無**新契約類型 |

**Verified ratio**: **29 / 29 = 100%** —— 22 個路徑式錨點（腳本逐一印出目標行）
+ 7 個 `02a:NNN`（逐行讀出）。**不是宣稱，是把每一行的內容印出來比對過。**

⛔ **而過程兩次不對，兩次都是被機械檢查抓到的**：

1. 初稿 4 個錨點錯（`schema.prisma:755-758` 應為 `808-812`；`governed_extensions:86-91`
   應為 `89-92`；另兩個是我從**自己剛編輯過的 `02a`** 讀出來的位移值）。
2. ⭐ **驗證腳本自己第一版是錯的** —— 它先用 basename 解析，於是
   `20260810134319_governed_extensions/migration.sql:89` 與
   `20260812063000_extension_fields_per_command/migration.sql:32` 兩個**都比對到了另一個 migration**，
   印出一行看起來很正常的內容、報告 `0 unresolved`。
   **一個會產生自信錯誤輸出的驗證器，比沒有驗證器更糟。** 修掉解析順序後重跑才是真的。

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-BorrowedRefusal-1` **升級** | **第 3 次**：新表自己的 `WITH CHECK` 零覆蓋而測試全綠（W05 counter 代勞 · W06 `RETURNING` 遮蔽 · W07 **trigger 先擋**）| 依強度階梯第 3 次應改**結構性解法**：detector 檢查「每個 RLS `WITH CHECK` 有對應的中性化案例」；⚠️ 三次的**代勞者各不相同**，所以規則不能列舉代勞者，要驗**中性化後會紅** | 驗證中（3/3 已達）|
| `AD-GrepAssertion-1` **升級** | ⚠️ **原本我要開一條新 AD，自檢發現是重複的** —— 該條已載「`tail -N` 把 type-check 失敗讀成通過」。W07 是同一族的新形狀：**多 workspace** 輸出下 `tail` 只留最後一個（api 紅、web 綠）。附帶事實：**jest 不做型別檢查**，235 個綠測試不涵蓋 TS2353 | gate 輸出一律**逐 workspace 可見**（分別跑），不用尾部過濾器 | 已達第 4 級判準（同 session 內再犯）|
| `AD-EstimateAsMeasurement-1` | Day 3 的工時表把**向前推估**寫成量測，超估 2.6 倍，差點成為 calibration 的第 5 個資料點 | 每個時間區段**兩端都要有可觀察錨點**（`date` 或 commit 時間戳）；沒有閉合錨點的區段標 `~est` 且**不得進 calibration** | 候選（1/3）|
| `AD-BottomUpBlueprint-1` | `actual / bottom-up` = **0.17**，遠低於 matrix 明訂的 0.4 下限 —— 該修的是估算不是乘數 | bottom-up 逐項標「**有藍本 / 無藍本**」，有藍本的按「寫差異」估 | 候選（1/3）|
| `AD-MdAnchorLineShift-1` | 我在 `02a` 插入 8 行，讓 **~30 個 `02a:NNN` 錨點**（`schema.prisma`、6 個原始碼檔、ADR-0013/0014、W06 design note、BACKLOG）全部偏 +13 —— `AD-DesignNoteAnchor-1` 的**上游成因** | ⭐ 已用**結構性解法**當場處理：改成**同一行追加**，`git diff --numstat` 4/4、總行數 495=495、第 413 行逐字相同。通則：**被錨定的文件，編輯不得改變行數** | 候選（1/3）|

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `AD-BorrowedRefusal-2` 的結構性 detector —— **第 3 次了，不應再靠紀律**
- `Issue` 表（`02a` §4 的 `Failed → raises Issue` 仍無目標）· review transition 與 SoD ·
  `Control.effectiveness` 派生 · `hash` 的驗證 → 見 design note §4（7 項）
- ⚠️ **`02a:413` 指向的是 §5.2 的**節標題**而非 Scoping 那一條（實際在 `:415`）** ——
  ADR-0014（三處）· `schema.prisma:810` · W06 design note `:64` 都用這個值。
  **偏移是 W05/W06 造成的、不是本 phase**（本 phase 零位移已驗證），
  依 `AD-DesignNoteAnchor-1` 的分流原則不當場追改；**留給 detector 當現成的驗收命中**。
- 逐任務工時的**量測**（不只是記錄）→ `AD-EstimateAsMeasurement-1`

**這個 phase 關掉的**：

- `AD-GroupRowTheft-1` ✅ **CLOSED** —— per-command 拆分，先看到紅（`count` 1 → 0）才修
- `AD-ReturningMasksCheck-1` ✅ **CLOSED** —— `risks` 11b 改 `createMany`，N7 中性化下確認轉紅
- `AD-CalibrationNoActual-1` ✅ **CLOSED（部分達成，明說）** —— 本 phase 產出了
  `spike` class 的**第 2 個有效同單位 actual**。⚠️ 但它暴露了自己的盲點（記錄 ≠ 量測）
  → 後繼 `AD-EstimateAsMeasurement-1`
- W06 交給 slice 4 的**條款 2 修正版**（不得產生 `RETURNING`，驗收是中性化後會紅）
  ✅ **已套用且已驗收**

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔 + design note
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix（**這次是量到的**，不是編的）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— R4 敞口再擴大兩條寫入路徑，已更新
- [x] **`plan.md` frontmatter `status:`** —— ⏳ merge 後才翻（R9：只 commit code 不算收尾）
- [x] `python scripts/lint/run_all.py` 全綠
