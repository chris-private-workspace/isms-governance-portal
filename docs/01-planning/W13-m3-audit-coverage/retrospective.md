# Phase W13 — Retrospective

**Phase**: W13 — Connect the audit trail to every reachable write path
**Period**: 2026-08-14 ~ 2026-08-15
**Plan**: [plan.md](./plan.md)
**PR**: #61（PR-pending）
**Change record**: `docs/03-implementation/changes/CH-030-w13-audit-coverage.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 空集合回頭檢查 + 結果表 + 補上的非空前提 | ✅ 完成 —— 13 個 spec / ~30 個範疇測試逐一讀過，補 4 處 |
| US-2 | `AUDITED_MODELS` 擴到全部可達模型 + 枚舉方法 + `RefCodeCounter` 記錄理由 | ✅ 完成 —— 1 → **15**，導出方法與**三條實測理由**寫在常數旁 |
| US-3 | 每個模型一條覆蓋測試 | ✅ 完成 —— 15 條，**N2 證明它們逐模型獨立** |
| US-4 | 四個中性化，預期方向先 commit，結果逐項對照 | ✅ 完成 —— `8a0cd04` 先行；2 個完全命中、2 個方向對但數字少算 |
| US-5 | `AD-AuditCoverageOneTable-1` CLOSED + CH-030 + R4 + 導航檔 + calibration | ✅ 完成 |

**未完成項目**：

- 🚧 **`AssessmentResponse` 的批次寫入成本未量**（`AD-ResponseRefCodeCost-1`）——
  覆蓋測試只寫 1 筆 response，量不到「40 題 = 40 次發號 + 40 列稽核」。
  → 留在該 AD，解封條件：有批次端點或效能 phase 時。
- 🚧 **`update` / `delete` 的稽核未被任何測試走過** —— 不是遺漏，是**今天沒有那種路徑**
  （Day 0 枚舉：零個 `client.*.update` / `.delete`）。→ `AD-AuditWriteOpsUntested-1`（新增）

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 6 個資料點**）
- **Agent-delegated**: **no**（plan 時宣告；實際自己直接做，0% 委派）
- **Bottom-up est**: **4.5 hr**
- **Committed (calibrated)**: **2.25 hr**（mult 0.50）
- **Actual**: **<PENDING —— closeout commit 之後回填>**
- **量法自報**（`AD-CalibrationDay0InOrOut-1`）：**含 Day 0**，窗口 =
  branch 第一個 commit（`9427e42`，2026-08-14T22:48:06+08:00）→ **closeout commit**
- **Ratio**: **<PENDING>**
- **Band 判定**: **<PENDING>**

⛔ **actual 等 closeout commit 真的存在之後再算**（`AD-EstimateAsMeasurement-1`；
W12 首次執行該修法，本片是**第 2 次**）。

⭐ **同時驗證第二個估法**（`AD-BottomUpBlueprint-1` 的**第 2 個對照點**）：
plan §7 預測「無藍本 1 項（空集合回頭檢查）+ 有藍本改差異 5 項 × ≈8 min ≈ 40 min」。
**實際發生的事推翻了「5 項有藍本」的分類** —— Day 2 的覆蓋測試**沒有藍本**
（plan 假設它是「複製 W12 的形狀 14 次」，而實測顯示那個形狀在 module-local 圖裡不成立，
必須新設計一個 composes-AppModule 的檔案）。⇒ 有藍本 4 項 / 無藍本 2 項。

- [x] 已回填 `calibration-matrix.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `calibration-log.md`
- [ ] 若 |R - 1.0| > 30%：AD 已記入 `BACKLOG.md` —— **待 actual 算出後判定**

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**11**（Prong 1: **0** / Prong 2: **9** / Prong 3: **0**（N/A 已驗證）+ D-baselines）
- Day-0 成本：**~65 min**
- **預防的返工**：~**2 hr**
- **ROI**: ~**1.8×**

**最有價值的那個 drift**：**D-refcode-b**。

它從一段 code 讀出「`refCodeCounter.upsert` 的 args 沒有 `data` key」，
進而推出「多實體 scope 下會 throw」。這把 plan §3.2 的判定從「訊噪比」升級為
「**接上它會讓滾升角色的每個 create 失敗**」，並且直接改寫了 Day 3 N3 的預期方向。
⇒ 若沒有它，N3 會用錯的預期跑，而錯的預期在**方向對的時候最難察覺**。

⚠️ **但 Day 0 也漏了一條，而且是最貴的那條**：`D-graph`（module-local 圖沒有 hook）。
我在 D-reach 時**讀過** `scoped-prisma.provider.ts:151-165` 那段解釋，
卻沒有把它連到 plan §3.0 的做法上。**讀過 ≠ 用上。**
若 Day 2 沒有先做那個實驗就直接寫 11 條測試，會得到 11 條永遠紅的測試，
或更糟 —— 寫成 `≥ 0` 而成為本片正要消滅的 Potemkin。

---

## Q4 — 做得好的（保持）

- **寫第一條測試之前先問「這個圖裡有 hook 嗎」，然後用兩組對照去量。**
  這是本片最高價值的 15 分鐘。plan 的做法看起來完全合理，而它是錯的。
- **N3 的預期方向由 Day 0 的 code read 導出，而執行結果又推翻了其中一半。**
  三個量測全中、第 5 個紅的測試給出一條沒人想到的理由 —— 兩者都被記錄，沒有只留下好看的那半。
- **`AD-VacuousScopeTest-1` 先讀原文再動手。** 我記成「modules 的範疇測試有問題」，
  原文說的是 `audit_log` 自己的四個測試，**而 W12 已經修好它了**。
  照記憶做會去修一個已經對的東西。
- **中性化預測逐測試寫、先 commit。** N2 因此是一個乾淨的驗收：預測「恰好 2」，實際「恰好 2」。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 新檔在主流量的測試路徑上；`lint:negative` 掃到並跳過（測試檔）|
| AP-2 Cross-directory scattering | 0 | 覆蓋測試集中在 `audit-trail/`；⭐ 本片的**主要決策**就是不讓它散到 11 個目錄 |
| AP-3 Potemkin | **0** | ⭐ **N2 是這一格的證據**：移除一個名字 → 恰好一個模組轉紅。⛔ 若照原 plan 寫進 module-local 圖，這一格會是 **15** |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | 5 個無寫入路徑的模型**刻意不加**進清單 —— 那正是 AP-5 的形狀 |
| AP-6 Mock vs real divergence | 0 | 無 mock；全部對真 PostgreSQL |
| AP-7 命名 / orphan claim | 0 | `audit.module.ts` 的 docstring 已從「W12 connects exactly one」改寫為現況 |
| **總計** | **0** | |

**Lint**: `run_all.py` **8/8** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-Day0ReadNotApplied-1` | ⭐ **Day 0 讀到了關鍵事實，卻沒有把它套用到 plan 的做法上。** `scoped-prisma.provider.ts:151-165` 明寫「eleven integration suites build their graph from one module」，我在 D-reach 讀過，而 plan §3.0 正是要在那十一個 suite 裡加測試 —— 兩者矛盾，Day 0 沒有發現 | Day 0 Prong 2 增加一步：**每讀到一段解釋「為什麼現狀是這樣」的 docstring，回頭對照 plan §3 的做法一次**。判準：該段話若成立，plan 的哪一步會失敗？ | 候選 |
| `AD-NeutralisationConsumerGrep-1` | **中性化預測漏算 suite**，因為我列的是「預期會受影響的檔案」而不是「**誰 import 這個符號**」。N1 因此 26 vs 27、N3 2 vs 5 | 中性化預測**必須以一次 `grep <被改的符號>` 開場**，並把命中的每個檔案逐一判定（受影響 / 不受影響 + 理由）。⚠️ 這比「想一想還有誰」便宜且完整 | 候選 |
| `AD-AuditWriteOpsUntested-1` | **`update` / `delete` 的稽核路徑零測試覆蓋** —— 不是遺漏，是今天沒有那種寫入路徑。但 `WRITE_OPERATIONS` 列了它們，所以「已涵蓋」的宣稱**目前無人驗證** | 第一個 `update` 端點落地的 phase，**必須**同時加一條「update 留下稽核列且 `operation` 是 `X.update`」的測試。⚠️ 現在寫等於測一個不存在的路徑 | 候選（有解封條件）|
| `AD-CoverageStatementNoTrigger-1` | ⚠️ **Day 0 的覆蓋聲明寫下了盲點（「未掃 `bench.int.spec.ts`」），而那個盲點在 Day 3 正好造成預測失誤。記下來了，卻沒有任何東西讓我回頭看它** | 覆蓋聲明的每一條「未掃 X」在**同一份文件內**要配一個判定：「X 若與本片相關會怎樣」。⇒ 與 `AD-DeferralUnwatched-1` 同族（條件寫得好、沒人在看），但這次的距離只有兩天 | 候選 |
| `AD-MemoryEntryRatchet-1` | ⭐ **`MEMORY.md` 的 phase 條目 13 個 phase 從 186 漲到 401 字元（+116%）**，而 closeout policy 寫的是 ~250-300。曲線單調上升：W01 186 · W07 283 · W10 360 · W12 363 · W13 **401** | ⛔ 這正是 `task-workflow.md` §Phase Closeout 描述的**相對錨點棘輪**，而**它自己沒有機械守門** —— `check_rules_hygiene.py` 只管 always-loaded 檔案。候選：把 `- W{NN} [` 行納入同一個 400 字元檢查。⚠️ 本片已自行壓回 **279**，但下一個 phase 會看到 279 並超過它 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `AssessmentResponse` 批次成本未量 → `AD-ResponseRefCodeCost-1`（既有）
- `update` / `delete` 稽核無測試 → `AD-AuditWriteOpsUntested-1`（新增，有解封條件）
- `assessment.int.spec.ts:346` 標題說「on all three tables」而只測 2 張 → `AD-AssessmentTitleMismatch-1`（新增）
- Day 0 / 中性化的兩條流程 AD → `AD-Day0ReadNotApplied-1` · `AD-NeutralisationConsumerGrep-1`
- 覆蓋聲明無觸發 → `AD-CoverageStatementNoTrigger-1`

**這個 phase 關掉的**：

- `AD-AuditCoverageOneTable-1` ✅ **CLOSED**（🔴 P0 —— 覆蓋 1 → 15；漂移守衛防止它復發）
- `AD-VacuousScopeTest-1` ✅ **CLOSED**（通則部分 —— 13 個 spec 掃完，4 處補上並經 V1–V4 + N4 雙向驗證）

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [x] Calibration ratio 回填 matrix（**不在** CLAUDE.md / MEMORY.md 散文裡）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— **R4 從 🟡 partial 更新為真實覆蓋率**（機械導出 15 / 21），
      措辭明寫**三項仍未涵蓋**（5 個無寫入路徑 · `RefCodeCounter` 刻意不接 · raw query）。
      ⛔ 不得讀成「已解決」
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
