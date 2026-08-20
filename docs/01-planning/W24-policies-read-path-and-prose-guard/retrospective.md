# Phase W24 — Retrospective

**Phase**: W24 — Unclaim the platform, wire policies, guard the prose
**Period**: 2026-08-19 ~ 2026-08-20
**Plan**: [plan.md](./plan.md)
**PR**: PR-pending
**Change record**: `docs/03-implementation/changes/CH-044-unclaim-the-platform-and-guard-the-prose.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 平台自宣稱移除 + 2 個 affordance | ✅ 完成（**改 3 個字串不是 4 個** —— 見下） |
| US-2 | dev seed 跨 SG1/HK1，六 status + 一筆軟刪除 | ✅ 完成（8 筆） |
| US-3 | `/policies` 讀真 API，三狀態齊備，逐條處置 | ✅ 完成（**列表頁**；詳情頁 Day-0 D3 移出） |
| US-3b | `vitest.config.mts` `maxWorkers`，無旗標跑滿 | ✅ 完成（`Test Files 11`） |
| US-4 | 兩條規則 + 單元測試 + **負面驗證實測** | ✅ 完成（29 tests + 4 次中性化全中） |
| US-5 | 27 頁盤點定稿，零 code 變更 | ✅ 完成 |
| US-6 | drive-through PASS，截圖 + observed-vs-intended | ✅ 完成（`/login` · `/policies` · shell ×2 · 詳情頁 ×1） |
| US-7 | CH-044 + retrospective + calibration + 導航檔 + BACKLOG | ✅ 完成 |

⭐ **US-1 的計畫是「4 個字串」，實際只改了 3 個。** `claim2`
（`Tamper-evident, append-only audit trail`）逐條驗證後**實測為真** ——
`audit-trail/chain.ts` + migration + 15 個被稽核的模型都在。
plan 把它跟另外兩條放在同一句話裡，是因為起草時假設三條同類。**它們不同類。**

**未完成項目**：`/policies/[id]` 資料源（checklist §2.3 最後一項，🚧 保留不刪）——
Day-0 D3 量到接完只剩 3 個真欄位、10 個區塊裡 9 個無來源，使用者裁決只接列表頁。
解封條件在 plan §9：`Policy` 要能承載文件本體 + 版本歷史。**這不是「以後再說」，是後端未備。**

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 12 個資料點**）
- **Agent-delegated**: `partial`（盤點補掃派工；接線 / 守衛 / drive-through 自己做）
- **Bottom-up est (B1)**: 20.5 hr
- **Committed (calibrated)**: **7.7 hr**（20.5 × 0.50 × agent_factor 0.75）
- **Actual**: **~2.9 hr**（Day 0+1 46 min · Day 2 45 min · Day 3 37 min · Day 4 ~45 min）
- **Ratio**: 2.9 / 7.7 = **0.377**
- **Band 判定**: **UNDER**（< 0.7）

**發生了什麼**：分子含大量背景等待（兩輪盤點 agent、多次測試套件、兩次冷啟動編譯），
`AD-CalibrationIdleWindow-1` 的已知問題。但**這不足以解釋 2.6 倍的差距** ——
W18 第 11 點（0.545）用的是同一種量法（T0 蓋在讀第一個檔案前，分子完整）。

**行動**: **re-point `pattern-reuse-feature` 0.50 → 0.45**。
matrix 第 11 點寫的判準是「第 12 點**同量法**再 <0.7 則 re-point 0.45」——
本點同量法、0.377 < 0.7，**判準字面觸發**，照做。

⛔ **但要明說 re-point 治標不治本**：0.45 只會把 committed 從 7.7 降到 6.9，ratio 仍是 0.42。
真正的訊號在下一段。

### ⭐ B1 vs B2 比較（`AD-BottomUpEstimateInflated-1` 第 3 個資料點）

| 估法 | 值 | `actual / est` |
|---|---|---|
| **B1** 傳統手工 bottom-up（原始） | 20.5 hr | **0.141** |
| B1 class-calibrated × agent_factor | 7.7 hr | 0.377 |
| **B2** AI 步驟估（plan §7 並列記錄） | 7.6 hr | **0.382** |

三個 phase 的 `actual / bottom-up`：W22 **0.26** · W23 **0.25** · W24 **0.141**。
⇒ 訊號指向 **bottom-up 方法本身**，不是某個 class 的乘數。三點都遠低於 matrix 表頭的 0.4 下限。

⚠️ **plan §7 預先警告過本片對這條 AD 分辨力低**（B2 7.6 與 calibrated B1 7.7 幾乎重合），
而結果確實如此：兩者的 ratio 只差 0.005。**不得把「兩者都接近」當成兩種方法都對** ——
正確的讀法是**兩者都高估約 2.6 倍**，B2 唯一勝出的是它省掉了乘數這一層中介。
要分辨仍需一個 B1/B2 分岔較大的 phase。

- [x] 已回填 `calibration-matrix.md`（≤ 1 行）
- [x] 完整敘述已寫入 `calibration-log.md` §1
- [x] |R − 1.0| > 30% → AD 已在 BACKLOG（`AD-BottomUpEstimateInflated-1` 第 3 點）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**15**（D1–D15；Prong 1: 0 · Prong 2: 6 具名 + 盤點補掃 6 缺口 · Prong 2.5: 0 · Prong 3: 0）
- Day-0 成本：~20 min（含兩輪派工的背景等待）
- **預防的返工**：~3–4 hr
- **ROI**: ~10×

**最有價值的那個 drift**：⭐ **D3** —— `/policies/[id]` 接完 API 只剩 **3 個真欄位**，
10 個區塊裡 9 個無來源（對照 W22 的 `risks/[id]` 留下 9 個）。
沒有它，本片會照 plan 接完詳情頁，然後在 drive-through 才發現那一頁**沒有後端可接** ——
那是一整頁的白工，而且結果會是一個比 fixture 更難看的畫面。

⚠️ **D3 同時暴露 plan §8 R1 的判準寫錯了**：R1 寫成「欄位比例 > 一半無來源」，
列表頁 4/8 **字面不觸發**。真正該問的是「**這一頁的後端存在嗎**」。
比例是代理指標，`AD-ProxyMetricAsAnswer-1` 的形狀。

次要但值得記：**D1**（vitest 根因）阻塞本片所有 gate 斷言，一行修掉；
**D2**（`/dashboard` 用 fixture id `RSK-1042` 連到要 uuid 的 `/risks/[id]`，**每個連結必定 404**）
不是顯示不一致而是**點了就壞**，本片不修但已記錄。

---

## Q4 — 做得好的（保持）

- ⭐ **逐條驗證而不是逐條照做**。plan 把三條 claim 寫成同一類，實際查了才發現 `claim2` 是真的。
  **一個「移除三條宣稱」的任務，正確交付是移除兩條** —— 拿掉一句真話換來的誠實是負的。
- ⭐ **負面驗證的預測寫在執行之前**，四次全中。`AD-GateGreenDecaysAfterFix-1` 說 `run_all`
  全綠不是證據，這是它的可執行形式。
- ⭐ **守衛的每個放行都當成洞來測**（型別位置靜默 / 值位置開火，各一條）。
  若寫成「提到就報」，它會對 W22 唯一做對的那一頁天天開火，一個 phase 內就被關掉。
- **affordance 與文字一起換**。W22 的教訓（只換文字不換 affordance 等於沒修）第一次被預先套用，
  而且用 computed style 驗證而非看截圖。
- **抽出 `lib/api/client.ts`**（計畫外）。第二個呼叫者出現時才抽，邊界是量出來的不是猜的。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 所有新 code 從主入點可達 |
| AP-2 Cross-directory scattering | 0 | ⭐ 主動避免 —— policies 是第二個 API 呼叫者，抽出 `client.ts` 而非複製 |
| AP-3 Potemkin | 0 | drive-through PASS；`New policy` 是帶理由的 disabled，列刻意不提供 affordance |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | 守衛的兩條規則各有當前標的；category 篩選器**移除**而非留空殼 |
| AP-6 Mock vs real divergence | **1（已修）** | ⛔ `policies.test.tsx` 的 shell mock 丟掉 `trf` 的插值變數 ⇒ meta 行結構上不可觀測。**Day 3 drive-through 才發現**，修法是讓 mock 真的插值 |
| AP-7 命名 / orphan claim | 0 | ⚠️ 但發現既有的一條：`/policies` 的 `_warning` 引用已被 ADR-0015 取代的 ADR-0007 → BACKLOG |
| **總計** | **1** | |

**Lint**: `run_all.py` **10/10** ✅（9 → 10，新增 `fixture-prose`）

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-MockDropsInterpolation-1` | ⭐ 測試的 shell mock 回傳 `t(key)` 並丟掉 `vars`，使**每一個經由 `trf` 印出的數字**在該檔案裡結構上不可觀測。8 個測試全過，缺陷在 drive-through 第二次點擊就現形 | mock 一律走**真實的格式化函式**；凡是「簡化掉一個轉換」的 mock，要問「這個簡化讓什麼斷言變成不可能」 | 候選 |
| `AD-VitestWorkerTimeoutUnderLoad-1` | 同一份 code：高負載 **7/11 檔**（4 個 worker 啟動 timeout, exit 1）· 乾淨負載 **11/11**。與已關的 `AD-UndiagnosedWebTestFailure-1` **症狀相反**（那條是綠的假零，這條是紅的） | gate sweep 一律記下 `Test Files N`；候選結構解法沿用該 AD 留下的：CI 對 `N < 11` fail | 候選 |
| `AD-DemoBadgeStatic-1` | API 掛掉時 `PART REAL` badge 仍宣稱「part is live data from the API」，而畫面上一筆 live 資料都沒有 —— **當下不成立的陳述**，正是本 phase 關切的形狀 | badge 隨資料狀態變化；⚠️ 它是跨 25 頁的 shell 元件，需獨立排期 | 候選 |
| `AD-ScopeSelectorDualDisplay-1` | header 顯示 `Ricoh Hong Kong Ltd` 而 sidebar 同時顯示 `SG-1`（伺服器真實範疇）。sidebar 說的是真話且列表註記已明說，但同一畫面同時顯示兩個範疇 | 選擇器要嘛真的過濾、要嘛顯示為唯讀的伺服器範疇 | 候選 |
| `AD-PlanRiskCriterionIsProxy-1` | plan §8 R1 的判準寫成「無來源欄位 > 一半」，列表頁 4/8 **字面不觸發**；真正該問的是「這一頁的後端存在嗎」 | plan §Risks 的判準避免用比例；問存在性 | 候選 |

**Day-0 發現、本片不修、已記錄**：D2（dashboard→risks 斷鏈，點了就壞）· D5（`/controls/[id]` 仍在做
`/risks/[id]` 已被明令禁止的事）· D6（`notifications.ts` 死檔）· D7（`AppShell:553` 硬編碼 `rating:'A'`）·
D8（`Restricted`/「機密」分級偏離，guardrail 9 實質違反）· D9（錯字「捷造」）· D12（白底白勾）·
`_warning` 引用已被取代的 ADR-0007 · `risks.source.empty.*` 死 key

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `/policies/[id]` 資料源 → 解封條件在 plan §9（`Policy` 要能承載文件本體 + 版本歷史）
- 上表 5 條新 AD + 9 條 Day-0 發現 → `BACKLOG.md`

**這個 phase 關掉的**：

- `AD-FixtureProseBecomesForgedEvidence-1` ✅ **CLOSED（機械層）** —— 解封條件原文是
  「每一片『把畫面接上 API』的 phase，checklist 必須有一個具名的 `[ ]`」。已交付：
  checklist 模板 §2.y 那一格 + `check_fixture_prose.py`（守衛量的是**有沒有人繞過機制**）。
  ⛔ **存量的 27 頁文案不在關閉範圍** —— 那些畫面今天整頁都是樣本，盤點文件是它們的帳。
- `AD-UndiagnosedWebTestFailure-1` ✅ **CLOSED** —— 根因是 `vitest.config.mts` 的 `poolOptions`
  配置死掉（Day-0 D1 診斷）。修正後乾淨負載 **11/11 / 104 tests / exit 0**。
  ⚠️ 高負載下的 worker timeout 是**不同根因、相反症狀**，另開 AD 而非把這條留著不關。

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（只動 Current Phase + Last Updated 兩行）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ `RISK_REGISTER.md` 已複查 —— 見下
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] ⭐ **已採納的 ADR 已複查** —— 見下
- [ ] ⭐ **`PR-pending` 標記已翻** —— 待 merge 後以 `gh pr view` 驗證再翻
- [x] `python scripts/lint/run_all.py` 全綠

**RISK_REGISTER 複查結果**：本片**降低**了一條敞口 —— 平台對外宣稱未持有的認證
（guardrail 1/2，且已在公開 URL 上）。已更新該列。無新增風險。

**已採納的 ADR 複查結果**：
- **ADR-0004**（entity scoping / RLS）—— 本片的 `/policies` 讀取路徑是它的第 2 個消費者，
  行為與 ADR 描述一致（範疇來自伺服器憑證，跨實體 id 回 404）。**無需修改**。
- ⚠️ **ADR-0007 已被 ADR-0015 取代（W23）**，而 `/policies` 回應的 `_warning` 字串仍引用 0007。
  這是**既有**的 orphan claim（非本片造成），已記入 BACKLOG 而非在本片順手改
  —— 它在 `apps/api` 且不屬本片範疇。
