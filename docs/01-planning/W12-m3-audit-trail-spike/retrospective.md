# Phase W12 — Retrospective

**Phase**: W12 — audit-trail hash chain spike，用量測拍板 ADR-0003
**Period**: 2026-08-14（Day 0-4 同日）
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: **#58 MERGED**（`ea58fdb`，rebase merge）—— CI **六個 required check 全綠**：
`gates` 2m43s · 映像 build + 啟動探測 1m33s · SAST 32s · trivy 27s · gitleaks（全歷史）16s · SCA 11s。
⭐ `gates` 在 CI 的 PostgreSQL 上跑完整 int suite，**包含 3 個併發 benchmark** ——
那組時間斷言因此不是只在我這台機器上成立。
**Change record**: [`docs/03-implementation/changes/CH-029-w12-audit-trail.md`](../../03-implementation/changes/CH-029-w12-audit-trail.md)

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `audit_log` 表 + migration（append-only 由 GRANT 與缺席的 policy 兩層）| ✅ 完成 |
| US-2 | A（DB trigger）+ B（應用層錨定）+ verify-integrity + 竄改偵測測試 | ✅ 完成 |
| US-3 | 量測表（A vs B × 寫入 / 驗證成本 + 對照組；C 由推導）| ✅ 完成（**追加了 plan 沒要求的併發量測**）|
| US-4 | contracts 介面 + 攔截點 + 1 個接上的模組 + 繞不過的證明 | ✅ 完成 |
| US-5 | 四個中性化，預期方向先 commit，結果逐項對照 | ✅ 完成（4/4 方向正確；N2 補測後重跑）|
| US-6 | ADR-0003 採納 + design note + CH-029 + 導航檔 + calibration | ✅ 完成 |

**未完成項目**：無。checklist 25 項全部 `[x]`，**沒有 🚧**。

**與 plan §4 的偏離（`git diff --name-status main..HEAD` 對照，`AD-DecisionSideEffect-1` (b)）**：

| plan §4 | 實際 | 為什麼 |
|---|---|---|
| `audit-trail/audit.repository.ts` + spec | **`audit.recorder.ts` + spec** | D17：這一層不是 repository（它不擁有 client、不查詢），它是 hook 的實作 |
| — | **`entity-scope/scoped-prisma.provider.spec.ts`（EDIT）** | D20：coverage 紅燈揭出 `$extends` 被整個 stub 掉 |
| — | **`docs/02-architecture/cross-scope-interfaces.md`（EDIT）** | 8-point gate #8 —— 本 repo 第一批真正的跨範疇契約要登記 |
| `AFTER INSERT` trigger（§3.2 / checklist 1.2）| **`BEFORE INSERT`** | D11：AFTER 改不了 `NEW`，存 hash 就要 `UPDATE` —— 而那正是 append-only 要扣住的權限。**原文保留不刪** |

---

## Q2 — Calibration（工時校準）

- **Scope class**: `spike`（**第 6 個資料點**）
- **Agent-delegated**: `no`（plan §7 預先宣告；實際 0% 委派）⇒ `agent_factor` 1.0，**三段式**
- **Bottom-up est**: 6.0 hr
- **Committed (calibrated)**: 3.9 hr（mult **0.65**）
- **量法宣告**（`AD-CalibrationDay0InOrOut-1`）：**含 Day 0**，窗口 = branch **第一個 commit**
  → **closeout commit**。⚠️ plan / checklist 起草在第一個 commit **之前**，故本值仍是**下界**。
- **Actual**: **4.00 hr**（239.97 min）—— `7503f8d` **14:33:25** → `f7a0c03` **18:33:23**，
  兩端皆為 author date，**在 closeout commit 存在之後才算**
  - ⭐ **merge 後在 main 側重算，值完全相同** —— rebase 改寫了全部 12 個 SHA 而 author date
    逐秒不變（`AD-DesignNoteAnchor-1` 的第 3 個資料點）。**要改的只是 SHA 字串，不是數字。**
- **Ratio**: 4.00 / 3.9 = **1.025**
- **Band 判定**: ✅ **IN**（0.7–1.2）

> ⛔ **這三格原本是留白的，那不是漏填。** `AD-EstimateAsMeasurement-1` 已被記 **2 次**，
> 第 2 次（W11）錯的正是 band 判定本身 —— closeout 當下 closeout commit 還不存在，
> 於是 actual 用了「估的收尾時刻」得 1.13 IN，merge 後逐秒重算是 1.236 **OVER**。
> 該 AD 的提議修法就是**留白到 closeout commit 之後再回填**，本 phase 是它的第一次執行，
> 代價是 closeout 成為**兩個 commit**。

⭐⭐ **兩件事同時成立，而這在 `spike` 這一欄是第一次**：

1. **ratio 1.025 —— 本欄第一個 IN-band 點**（前四個可用點：W02 1.10 但量法不同單位 ·
   W03 0.34 · W04 0.81 · W07 **0.30**）。
2. ⭐ **`actual / bottom-up` = 4.00 / 6.0 = 0.667，第一次高於 matrix 的 0.4 下限。**
   `AD-BottomUpBlueprint-1` 說 bottom-up 系統性高估約 5 倍（W07 0.17 · W08 0.097 · W09 0.25），
   而本 phase 是 **0.667**。歸因是可指認的：**plan §7 的 bottom-up 是 Day-0 之後逐項重算的**
   （−0.5 少一個策略、+0.5 A 改 PL/pgSQL 且多一層契約），也就是在**已知真實形狀**之後才估的。
   ⚠️ **這同時削弱了它作為資料點的價值** —— 那不是「事前估算變準了」，是「事後重估比較準」，
   而後者本來就應該。⇒ 不足以支持修改估算方法，記為**一個有條件的正向資料點**。

**行動**: **KEEP 0.65**。⚠️ 單點 IN 不構成調整依據（需 3-phase 移動證據），
且本欄的分散仍然巨大（0.30 – 1.03）。

**逐段間隙檢查**（`AD-CalibrationIdleGap-1`）：最大間隙 **75.6 min**（benchmark commit ——
兩次獨立執行 + coverage 紅燈追查）與 **56.7 min**（closeout 本身），
⭐ **沒有一段是「等使用者」** —— 本 phase 是單次連續 session，所以窗口內沒有 W08 那種
169 分鐘的等待。這個 ratio 因此不含該 AD 描述的汙染。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] 若 |R − 1.0| > 30%：**不適用**（|1.025 − 1.0| = 0.025）

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量：7** —— Prong 1: **1**（`audit-trail/` 不是只有 `.gitkeep`，它有 CH-012 的常駐負面
  fixture）/ Prong 2: **5**（D1–D5）/ Prong 3: **1**（`AD-DevDbChecksumDrift-1` 確認**仍在**
  ⇒ migration 預期手寫）
- **Day-0 成本**：⚠️ **未逐項計時，不編一個數字**。可量的邊界：`7503f8d`（plan + checklist +
  Day 0 全部 findings）→ `2e228ad`（D7 更正）相距 **2 分 35 秒**，Day 1 首個 commit 在其後
  **31 分**。起草在窗口之外（見 Q2 的量法宣告）。
- **預防的返工**：~1.5-2 hr（**估算，非量測**）—— D3 若留到實作才發現，代價是把已寫好的
  應用層 A/C 全部丟掉、重寫成 PL/pgSQL，並回頭改 plan §3.2；D1 若留到實作才發現，代價是
  攔截點寫完之後被 lint 機械拒絕。
- **ROI**: ~2-3×（分子是估算，故只給區間不給小數）

**最有價值的那個 drift：D3。**
`runScoped` 用 **array 形式**的 `$transaction`（`scoped-prisma.provider.ts:83`）——
一批**已建構好**的 PrismaPromise，中間插不進應用邏輯。而該函式的 docstring `:92-95` 明說
array 形式**正是它能被 extension 掛上的原因**。

⇒ 「讀 `prev_hash` → 寫稽核列」在應用層做不到 ⇒ **選項 A / C 必須落在資料庫**。
plan §3.2 原本寫「三個策略同一個介面，差異只在 `computeHash`」，那句話從此不成立。
這是 **20-50% 範圍變動**，依 checklist §0.1 的預先指示 **NO-GO 並等使用者裁決**，
使用者選了「縮成 A vs B」。

⭐ **三個 finding 全部是 checklist 預先點名要查的格子**（D-intercept / D-txn），
不是碰巧發現的 —— Day 0 的 ROI 在這個 phase 是**它避免了寫到一半才發現主方案不可行**。

⭐ **第二有價值的是 D17，而它推翻了 D3 的一半**：Day 0 說「應用層插不進」是對的，
但 Day 2 量到**可以往那個陣列再加一個元素** ⇒ 稽核列因此能與領域寫入**同一個交易**。
精確界線是「稽核列的每個值都必須在領域寫入執行**之前**就算得出來」——
`before` / `after` / `resource_id` 三個限制全部由此導出。

---

## Q4 — 做得好的（保持）

- **兩次量測都先寫預測再 commit，才執行**（`1fcdf8f` benchmark 五個預測 · `294e178`
  中性化四個預期）。⭐ 這不是形式：benchmark 的 **P2 / P3 兩個預測被推翻**，而其中 P3 的反向
  結果（稽核的主成本是那筆額外 INSERT，不是鏈的策略）**直接寫進了 ADR 的 Decision**。
  如果數字先出來，我幾乎確定會把它讀成「符合預期」。
- **「第一個要懷疑的是儀器」在同一個 phase 內從教訓變成習慣。** D7 記下它（那次是**事後**才發現
  兩個結論都錯），D13（`repeat('00',64)` 產生 128 個字元）與 D19（benchmark 說稽核讓寫入變快）
  兩次都是**當場**先懷疑量法。D19 特別值得記：多插一列不可能讓寫入變快，所以我沒有去找
  「為什麼稽核比較快」的解釋。
- **N3 沒有把 `Received: "NO ERROR"` 當成答案。** 那句話只證明「沒報錯」，
  而「沒報錯」與「沒改到列」的差別是「還有第二層」與「只剩一層的安全事故」。
  直接數列：可見 7 列 / `UPDATE 0` / 0 列被改。⭐ **這是 W10 與 W11 兩次答錯之後才學會的問法。**
- **對照組是同一個 repository、同一張表、同一組 policy**，只差 hook 不在 DI 圖裡 ——
  不是另一條「看起來像」的路徑（AP-6 由構造避免）。
- **追加了 plan 沒有要求的併發量測**，理由是結構性的：A 的核心成本是 per-entity 鎖，
  而**單執行緒 benchmark 量不到它**。決定就是在那個維度上做出來的。
- **coverage 紅燈沒有被當成數字問題處理。** 追下去發現的是 **B 的正確性從未被斷言過**，
  而我正要拿 B 當成本基準線。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | **1（已處置）** | ⚠️ `AuditLogRecorder` 的 `app-chain` 模式是**沒有任何 production 路徑會選**的 production code —— 那就是 AP-1 的形狀。判準（checklist 4.2）是「**ADR 有沒有引用它的量測數字**」：有 —— FC1 / FC2 以它為基準線。ADR 明寫那是**當下的用途**不是「將來可能有用」，並附解封條件：⛔ **Wave 1 結束前未重量就刪掉 B** → `AD-StrategyBSunset-1` |
| AP-2 Cross-directory scattering | 0 | `audit-trail` 的 code 全在 `audit-trail/`；契約在 `contracts/` 是**矩陣要求的**落點，不是散落 |
| AP-3 Potemkin | **1 找到、1 修好、0 出貨** | 🚩 **策略 B 的寫入路徑從未被任何測試斷言過正確性** —— bench 斷言的是**時間**，而時間不在乎寫入者是壞的（一個永遠寫 32 個零的實作會 benchmark 得很好看）。抓到它的是 coverage funcs **88.88%**，不是我。已補 unit round-trip + int（用**儲存後**的列重算）|
| AP-4 PoC accumulation | N/A | `experimental/` 無新增 |
| AP-5 Speculative abstraction | 0 | ⭐ 反向資料點：**選項 C 就是因為這條而不實作** —— 它唯一的好處在驗證成本，而該維度被量到不區分 |
| AP-6 Mock vs real divergence | 0 | int 全部對真 PostgreSQL 18.4；對照組與稽核組是同一條路徑 |
| AP-7 命名 / orphan claim | **1（刻意保留）** | plan §3.2 與 checklist 1.2 寫的 `AFTER INSERT` 是錯的。⛔ **原文保留不刪**，更正寫在相鄰處（D11 + checklist 的 ⛔ 段落）—— 那是防漂移紀律要求的形狀，不是 orphan claim。⚠️ 但 plan §4 #4 的 `audit.repository.ts` 已不存在，Q1 的偏離表是它的去向 |
| **總計** | **3（其中 2 個已處置、1 個已修）** | |

**Lint**: `run_all.py` **8 / 8** ✅

⚠️ **AP-3 的另一個維度必須寫清楚**：機制存在，**覆蓋是 1 / 21 張表**。
「有稽核軌跡了」這句話在今天是**錯的**；正確說法是「稽核軌跡有了第一個機制與第一張接上的表」。
→ `AD-AuditCoverageOneTable-1`（🔴 P0，它擋著 M1 的 DoD）。

⛔⭐ **而導出那個分母的動作，當場推翻了我自己剛寫進三份文件的「1 / 19」** ——
19 是從 **R4 的手寫累加鏈**推的，而那條鏈是錯的。機械真值：`schema.prisma` **22 個 `^model`**
減去 `audit_log` 自己 = **21**，逐個 migration 的 `CREATE TABLE` 加總交叉驗證相符
（2·**1**·2·**5**·1·2·2·3·2·1）。缺口指名得出來：**R4 完全跳過 W03 的 `extension_fields`**，
且 **W05 記 +3 而實際建了 5 張**（`threats` / `vulnerabilities` 兩個全域庫被漏掉）。
⇒ `AD-RiskTableCountManual-1` **第一次被實地擊中**，而它的原文早就寫著
「它對的原因是每個 phase 都有人記得改」。已更正 CH-029 · design note · **ADR-0003** · R4 · 本檔。

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-DeferralUnwatched-1` | **OQ-4 的延後理由是可檢查的**（「判準是寫入吞吐量，零 code 時量不出來」），**而它早已不成立卻沒有任何東西在看** —— 條件失效發生在好幾個 phase 之前 | `decision-form.md` 每一列加「**解封條件**」欄 + 一個 detector 在 closeout 時檢查是否成立。⚠️ 不要做成「有沒有人回頭看」—— 那正是失效的東西 | 候選 |
| `AD-VacuousScopeTest-1` | **約束 8 的四個範疇測試中，第 1 個在稽核完全關閉時仍然全綠** —— 空陣列上 `every()` 真、`some()` 假 ⇒「看不到別人的列」與「一列都沒有」是同一個觀察 | 四個範疇測試的模板必須含**非空前提**（先斷言「另一個實體確實有 N > 0 列」）。⚠️ **其餘 int spec 未逐一檢查** —— 同形狀 W11 已記過一次，本次是第 2 次 | 驗證中(1/3) |
| `AD-AuditCoverageOneTable-1` | **稽核機制存在，覆蓋 1 / 21 張表，而沒有任何 gate 會叫** —— 與 R4 原本的失效模式**完全相同**（每個新增業務表的 phase 都讓敞口更大） | `AUDITED_MODELS` 與 `schema.prisma` 的 `^model` 數做機械比對，差額寫進 `check_entity_index.py` 的輸出（**它已經在數 `^model` 了**）。⛔ 不要再開一個手寫計數器 —— 那是 `AD-RiskTableCountManual-1` 的形狀 | 候選 🔴 P0 |
| `AD-StrategyBSunset-1` | **被 ADR 否決的策略 B 留在 repo**，因為 FC1 / FC2 拿它當基準線 | Wave 1 結束前重量一次 FC1 / FC2；未重量就**刪掉 B** 並把兩條條件改寫成絕對值 | 候選（有期限）|
| `AD-BenchOrderBias-1` | **第一版 benchmark 說「稽核讓寫入變快」** —— 三組依序跑、各自建 `TestingModule`（各自的連線池），暖機偏差 ~4 ms **大於**被量的效應 ~2 ms | 比較型 benchmark 一律**交錯**執行，並印出**對照組自身的漂移**（drift 與 overhead 同量級時，該比較不值得讀）。⚠️ 這是 `AD-EstimateAsMeasurement-1` 的鄰居：不是編數字，是**量錯東西** | 候選 |

**本 phase 給既有 AD 的資料點**：

- `AD-BorrowedRefusal-1` **第 7 次 —— 而這次終於量到答案**（GRANT 給 42501、缺席的 policy 給
  安靜的 `UPDATE 0`）。判準（中性化後有測試轉紅）在此**可滿足**，因為兩層可以逐層放行。
- `AD-EstimateAsMeasurement-1` —— 本 phase **第一次執行它提議的修法**（Q2 留白到 closeout
  commit 之後）。
- `AD-NarrowPatternWideClaim-1` —— 本 phase **3 次**（D7 的兩個錯誤結論 · D13 的 `repeat('00',64)` ·
  D15 的 `tail -25`），⭐ 其中 **D13 / D15 / D19 三次是當場攔下的**，D7 那次是事後。
- `AD-MetaVerificationBug-1` —— N4 方向不符時**先懷疑元驗證本身**，量到的是**測試執行順序**
  而非機制問題（已驗證 2/3 → **3/3**）。
- `AD-DevDbChecksumDrift-1` —— Day 0 確認**仍在**，migration 因此手寫。
- `AD-DualLayerHighRisk-1` —— 它預期的 `audit_log` 現在存在了，第二層的標的因此具體化。
- `AD-RiskTableCountManual-1` —— ⭐ **第一次被實地擊中**（R4 的手寫計數 18，真值 21）。
  它的原文寫「數字今天是對的，所以這條不急」—— 那句話今天不再成立，優先度 🟢 P2 → 🟡 P1。

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **接上其餘 10 個模組** → `AD-AuditCoverageOneTable-1`（🔴 P0，擋 M1 DoD）
- **滾升讀取的稽核**（guardrail 4 明文要求）→ M8 才有滾升端點；⭐ FC4 **由構造保證會觸發**
- **真實的 `before` / `after`** → ADR-0003 **FC3**（需要每張領域表一個 trigger）
- **raw query 不被稽核** → 已命名的洞，需要語句解析
- **`ScopedPrismaFactory` 的 `@Optional` fail-open** → 補償是 `audit.int.spec.ts` 由 `AppModule`
  組圖；真正的修法要等 11 個 int suite 統一組圖方式
- **`AD-VacuousScopeTest-1` 的回頭檢查** —— 其餘 int spec 未逐一掃

**這個 phase 關掉的**：

- **OQ-4** ✅ CLOSED → [ADR-0003](../../14-adr/0003-audit-trail-hash-chain.md)（`decision-form.md`
  已移入已拍板區；`14-adr/README.md` 尚待撰寫 **4 → 3**）
- `AD-BorrowedRefusal-1` **未關閉**，但它第一次得到**答案**而不是又一個錯誤宣稱

---

## Design Note 8-Point Self-Check

（`docs/rules-on-demand/spike-design-note-gate.md`；note 為
[`W12-audit-trail.md`](../../02-architecture/design-notes/W12-audit-trail.md)）

| # | Point | 狀態 | 備註 |
|---|-------|------|------|
| 1 | Section header 對應 US | ✅ | §0 逐條列 US-1..US-6；§2 的 10 個不變式各自對應 |
| 2 | 每個 claim 有 `file:line` | 🟡 | 31 / 33 已錨定；**2 條明確標為推導**（§2.6 的 `foreign` 種類 · §4 的 Azure extension 機制）|
| 3 | Decision matrix | ✅ | §1 三個矩陣（D1 鏈的落點 · D2 攔截點 · D3 時戳精度），各含否決理由 |
| 4 | Verification command | ✅ | 每個不變式一條可重跑指令（`npm run test -- chain` / `test:int -- audit` / `lint:negative`）|
| 5 | Test fixture ref | ✅ | 逐條指到 `<spec>:<line>` |
| 6 | Open invariant 分界 | ✅ | §4 列 **10 項**延後 / 未驗證，含量測條件的限制 |
| 7 | Rollback 路徑 | ✅ | §5 —— ⭐ fallback **是實作過且有測試的**（策略 B），但混寫的表兩個常式都驗不了 |
| 8 | Cross-ref single-source | ✅ | 3 個新契約已登記至 `cross-scope-interfaces.md`（#1-#3），design note **只 link 不重複簽名** |

**Verified ratio**: 31 / 33 ≈ **94%** 🟡
⚠️ **低於 95% 門檻，而我選擇不用「拿掉那兩條」的方式湊到門檻** ——
那兩條是真實的知識（N4 下的斷點種類 · Azure 的 extension 機制），刪掉它們會讓 note 更乾淨
而讓讀者更少知道一件事。⇒ 標為推導並保留。

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [ ] Calibration ratio 回填 matrix — ⏳ **隨 actual 一起**（見 Q2 的 ⛔）
- [ ] Matrix 那一行 ≤ 1 行 ~250 字元 — ⏳ 同上
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— **R4 由「開放」改為 🟡 部分緩解**，措辭寫
      「**首次有 mitigation，覆蓋 1 / 21**」。⛔ **不得讀成「已解決」**：本 phase 交付的是**機制**，
      21 張表裡只接了 1 張。⛔ 同時更正 R4 自己的手寫計數（18 → 21，原文保留）
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
