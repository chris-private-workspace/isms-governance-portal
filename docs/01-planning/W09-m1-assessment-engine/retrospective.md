# Phase W09 — Retrospective

**Phase**: W09 — shared assessment engine (M1 slice 6)
**Period**: 2026-08-13 ~ 2026-08-13
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: #50（MERGED `6446099`，2026-08-13 05:44Z，經 `gh pr view` 驗證）
**Change record**: `docs/03-implementation/changes/CH-024-w09-assessment-engine.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 三張表 + 三個 enum + migration，照 `02a` 字面值不擴充 | ✅ 完成 |
| US-2 | per-command RLS + 複合 FK + 四項範疇測試 ×3 表 | ✅ 完成 |
| US-3 | SoD CHECK + 常駐負面案例 | ✅ 完成（⚠️ 只有一半的規則 —— 見下）|
| US-4 | 六個端點，400 / 404 / **422** 語義正確 | ✅ 完成 |
| US-5 | 元驗證：中性化清單 + 預期方向（跑之前寫下）+ 實測 | ✅ 完成，**6/6 相符** |
| US-6 | `02a` §0 註記 + 分母由索引導出 + CH-024 + closeout | ✅ 完成（**17 / 35**）|

**未完成項目**：

- **`05:47` 的第二句沒有實作** —— 「供應商稽核的稽核者需獨立於關係經理」需要 `vendors`
  與關係經理欄位，`02a:59` 把 vendors 放在 Wave 2 → `AD-VendorAuditorSod-1`。
  ⚠️ 已寫進 migration 的註解，讓缺口從 schema 本身看得見，而不是只在文件裡
- **`AssessmentTemplate.definition` 沒有結構驗證** —— 無規格可依 →
  `AD-AssessmentDefinitionUnvalidated-1`
- **D13 的 ref_code 成本沒有量到** —— 端點一次一筆，沒有批次路徑可量。
  「40 題 40 次」是**從程式碼推導**，⛔ 未寫成已量測 → `AD-ResponseRefCodeCost-1`
- **checklist Day 3 的 N3 未單獨執行** —— 標 🚧 + 理由，不刪項

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（第 3 個資料點）
- **Agent-delegated**: `no`（plan 時宣告；實際自己直接做）
- **Bottom-up est**: 7.5 hr
- **Committed (calibrated)**: 3.75 hr（mult 0.50）
- **Actual**: **1.88 hr**（112.95 min，`a18b366` 10:16:12 → `d5febf7` 12:09:09，
  commit 時間戳兩端錨點閉合）
- **Ratio**: 1.88 / 3.75 = **0.50**
- **Band 判定**: **UNDER**（< 0.7）

**發生了什麼**：

窗口內**四段全部是 commit-to-commit 的閉合區間**：Day 0 **54.4 min** ·
Day 1 **16.4** · Day 2 **24.6** · Day 3 **17.5**。

⚠️ **但每一段都含一個量不到的等待前綴** —— 四個 Day 各由一次使用者訊息啟動，
而使用者訊息的時間戳不在 git 裡。所以 16.4 / 24.6 / 17.5 是**工時的上界**，不是工時。
`AD-CalibrationIdleGap-1` 提議「扣掉 Day N 起始時間戳 − 前一個 commit」，
本 phase 證明**那個值無法從 commit 機械導出** —— 該提議需要一個 git 以外的錨點。
⛔ 不編一個數字去扣。

⭐ **`AD-BottomUpBlueprint-1` 的新估法第一次有了對照組，而且它準**：
新方法預測 8 個交付項 × 8 min = **64 min**；Day 1-3 的閉合區間加總 = **58.5 min**（上界）。
誤差 < 10%，而舊方法的 bottom-up（7.5 hr）誤差是 **7.7 倍**。
`actual / bottom-up` = 1.88 / 7.5 = **0.25** —— 高於 W08 的 0.097，仍低於 0.4 下限。

**行動**: **KEEP 0.50，等第 4 個資料點**。三點分別是 W08 窗口 0.84（含 71% 等待）、
W08 逐段 0.23、W09 0.50 —— **同一個 class 的三個數字跨越 0.23~0.84**，
這不是雜訊而是**量測定義未收斂**。⛔ 在定義穩定之前調乘數只是把問題藏起來。

- [x] 已回填 `calibration-matrix.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `calibration-log.md` §1
- [x] |R − 1.0| = 50% > 30% → AD 已記入 BACKLOG（`AD-CalibrationIdleGap-1` 更新）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**8**（Prong 1: 1 / Prong 2: 6 / Prong 3: 0 + baselines）
- Day-0 成本：**54.4 min**（含 plan/checklist 起草與兩次使用者裁決的等待）
- **預防的返工**：~**2 hr**（D2 若沒抓到：整個 `responses → evidence` 的守衛會走 W07 的
  trigger 形狀 —— 那是**錯的機制配對的恐懼**，且會在 Day 3 的 N1 才暴露，
  屆時要回頭改 migration + 重跑全部元驗證）
- **ROI**: ~**2.2×**

**最有價值的那個 drift**：**D2**。

它不是「plan 寫錯了」，而是**判準第一次遇到它沒回答過的情況**：W07/W08 的 D1 判準說
trigger 用在父表**結構上**給不起錨點時，而前三次的父子表都同 phase 出生，
所以「父表給得起但它還沒有」從未發生過。W09 是第一次由子表引用**前一個 phase 建好的表**。
答案是回頭替 `evidence` 補錨點 —— 本專案第一次改前一個 phase 的表。

---

## Q4 — 做得好的（保持）

- **預期方向寫在跑之前，而且包含「預期不動的」** —— 六個 N 全部相符，
  其中兩個是反直覺的預測（N2 的 16 仍綠、N4 的 9c 仍綠）。
  ⭐ **沒有這個習慣，第一次 N1 的 20/20 全綠會被讀成「守衛是多餘的」**
- **拒絕測試旁邊放一個共用同一機制的正向測試** —— 測試 13 抓到測試 12
  是用一個不存在的 id 通過的。`AD-BorrowedRefusal-1` 第一次由結構抓到而非人察覺
- **遇到設計衝突時把三個選項都寫下來再選** —— `template_version` 的三選一
  （呼叫端傳 / 開 delegate / DB 填）讓「為什麼不是另外兩個」變成可讀的紀錄
- **實測而非引用** —— Day 0 的十項 baseline 全部重跑，結果與 W08 記錄相符，
  但那是**驗證過才採信**的順序

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 六個端點皆由 `bootstrap/app.module.ts` 註冊，int spec 實際建起模組 |
| AP-2 Cross-directory scattering | 0 | repository 在 `core-model/`、端點在 `modules/assessment/` |
| AP-3 Potemkin | **0，但有兩個被主動處理** | `template_version` 原本是 AP-3 邊緣（D12），改由 DB 填 + version-2 測試後可證偽；`definition` 不驗證是**明說的**缺口不是假裝的功能。⛔ **gate-only verified**，無 drive-through（無 UI）|
| AP-4 PoC accumulation | N/A | |
| AP-5 Speculative abstraction | 0 | 三個 scoped client 介面各自只含用得到的 delegate |
| AP-6 Mock vs real divergence | 0 | unit 用 double、int 用真 DB，兩者測不同的事 |
| AP-7 命名 / orphan claim | 0 | 無版本後綴；`02a` 的 `Assessment` 列改註記不刪，舊名找得到新落點 |
| **總計** | **0** | |

**Lint**: `run_all.py` **7/7** ✅ · `lint:negative` PASS · `check_entity_index` 17/35

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-AssessmentProcessSubject-1` | 「`Assessment` 不建表」的裁決基於**欄位重疊**做成，而 enum 沒有被比對 —— `process` 因此沒有落點 | 合併兩份規格的決定要**逐欄位含 enum 比對**，不只比對欄位名 | 候選 |
| `AD-NeutraliseRebuiltState-1` | 對 `isms_test` 直接 ALTER 的中性化被 int setup 的重建覆蓋，20/20 全綠**看起來像結果** | 中性化一律改**來源**（migration / 設定檔）。凡每次執行會重建的東西，對它動的手術不算數 → 寫進 `verification-discipline.md` | 候選 |
| `AD-AssessmentDefinitionUnvalidated-1` | `definition` JSONB 無任何結構驗證 | 規格補上結構，或明確記錄它永遠是自由文件 | 候選 |
| `AD-AssessmentQuestionNoFk-1` | `question_id` 不是 FK，未被問過的題目可以被作答 | 與 `AD-IssueBareEnum-1` 同族，M7 之前一起拍板 | 候選 |
| `AD-ResponseRefCodeCost-1` | 每答一題一次 `ref_code_counters`，而它是 per-entity 序列化點 | 有批次提交端點時**實測**再決定；⛔ 不先發明豁免 | 候選 |
| `AD-VendorAuditorSod-1` | `05:47` 的第二句無處可實作 | `vendors` 出現時一併補上 | 候選 |
| `AD-CalibrationIdleGap-1`（**更新**）| 該條提議「窗口扣掉 Day N 起始 − 前一個 commit」，而 W09 證明**該值無法從 commit 機械導出** | 需要 git 以外的錨點（session 起始戳），或改為「只用單段閉合區間，不用窗口」 | 驗證中(1/3) |
| `AD-TestNameWiderThanProof-1`（**更新**）| 測試 9c 的名稱寬於它證明的東西，**由 N4 主動抓到** | 每個「不是 X」的斷言旁邊要有一個「是 Y」的錨點 | 驗證中(2/3) |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `05:47` 的供應商稽核獨立性 → `AD-VendorAuditorSod-1`（等 `vendors`）
- `definition` 的結構 → `AD-AssessmentDefinitionUnvalidated-1`
- `process` subject type → `AD-AssessmentProcessSubject-1`（**需要使用者裁決**）
- ref_code 成本 → `AD-ResponseRefCodeCost-1`（等批次端點才量得到）
- ⚠️ **Risk Class D 在同一個 phase 內犯兩次**（D1 · D15）—— Day 0 Prong 1 只驗
  「plan 列的路徑存不存在」，沒驗「該放哪」。提議 Prong 1 加一句：
  **新檔案的目錄要對照同類既有檔的位置，不是對照 plan 的宣稱**

**這個 phase 關掉的**：

- **D12**（`template_version` 的 AP-3 風險）✅ CLOSED —— trigger + version-2 測試
- **`02a` §0 的 `Assessment` 幻影列** ✅ CLOSED —— 索引不再宣稱一個不會被建的實體

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— R4 敞口由 12 → **15 張表**（+3），
      且 `assessment_instances.status` 的 SoD 是**第一個有資料庫強制的職責分離**，
      但它的**變更沒有任何稽核**，這讓 R4 從「合規閉環缺一角」再多一角
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] `python scripts/lint/run_all.py` 全綠
