# Phase W10 — Retrospective

**Phase**: W10 — Risk Management Report as an immutable versioned snapshot (M1 slice 7)
**Period**: 2026-08-13 ~ 2026-08-13
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: ⏳ pending
**Change record**: `docs/03-implementation/changes/CH-026-w10-rm-report-snapshot.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 兩張表 + migration，照 `02a:253/255` 字面值（`state` 除外，記錄為 deviation）| ✅ 完成 |
| US-2 | `rm_report_versions` 無 `FOR UPDATE` policy；不可變性**兩層都被單獨量過** | ✅ 完成 |
| US-3 | 兩條複合 FK；跨報告、跨實體、不存在三種指向各有測試 | ✅ 完成 |
| US-4 | 端點 —— **4 個不是 5 個**（D8）| ✅ 完成（範圍縮小，已記錄）|
| US-5 | 元驗證：**6 個**中性化（plan 寫 4），預期方向寫在跑之前 | ✅ 完成，**6/6 相符** |
| US-6 | `02a` §3.1 deviation 註記 + CH-026 + closeout | ✅ 完成（**19 / 35**）|

**未完成 / 縮小的**：

- **端點 5 → 4**（D8）—— plan §3.3 列了 `GET /:id`，而全 repo 12 個 controller **沒有任何
  GET-by-id 先例**。照既有風格交付，不刪 plan 那一行
- **`isCurrent` 不做**（D9）—— 版本 repository 拿不到父表 delegate，而且做了就是
  `02a:257` 被砍掉的那個第二表述
- **不能產生快照** —— 只能保存呼叫端給的 payload；`sheet` **不驗證結構**
  → `AD-AssessmentDefinitionUnvalidated-1` 家族
- **3 年保存期無機制** —— `retired_at` 存在但沒有路徑寫得了它（retire 是 UPDATE）
  → 新 AD `AD-ImmutableRowRetention-1`
- checklist Day 1.3 前提被 D1 推翻，標 🚧 後於 Day 2.1 解封，**不刪項**

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（第 4 個資料點）
- **Agent-delegated**: `no`（plan 時宣告；實際自己直接做）
- **Bottom-up est**: 7.0 hr
- **Committed (calibrated)**: 3.5 hr（mult 0.50）
- **Actual（可量測的部分）**: **49.4 min = 0.82 hr** —— Day 1-3 四段閉合區間：
  Day 1 **7.98** · Day 2 **30.2** · 預期表 **1.07** · Day 3 **10.15**
- **Ratio**: 0.82 / 3.5 = **0.24**
- **Band 判定**: **UNDER**（< 0.7）

**⛔ Day 0 沒有數字，而且這次知道為什麼**：Day 0 是本 phase 第一個 commit，前面沒有錨點。
W09 的 `AD-CalibrationIdleGap-1` 已經證明使用者訊息時間戳不在 git 裡。⛔ 不編一個數字去補。

⭐ **四個資料點的分散第一次有了解釋，而它不是雜訊**：

| Phase | Ratio | 窗口是否**含 Day 0** |
|---|---|---|
| W08 窗口 | 0.84 | 含（且含 169/238 分鐘的等待）|
| W08 逐段 | 0.23 | **不含** |
| W09 | 0.50 | **含**（Day 0 = 54.4 min，佔該 phase 近半）|
| W10 | 0.24 | **不含**（無前錨點可含）|

**0.23 / 0.24 是同一種量法，0.50 / 0.84 是另一種。** 這個 class 從來不是雙峰分佈，
是**兩種定義混在同一欄**。→ 新 AD `AD-CalibrationDay0InOrOut-1`：matrix 需要一欄
「窗口是否含 Day 0」，否則 3-phase 移動平均是在平均兩種不同的東西。

⭐ **`AD-BottomUpBlueprint-1` 的第 2 個對照點**：新估法預測 **80 min**（10 項 × 8 min），
其中 9 項落在 Day 1-3，預測 72 min vs 實測 **49.4 min** —— 高估 46%。
舊法 bottom-up 7.0 hr 對同一段是 **8.5 倍**。新法仍明顯較準，但**方向反了**
（W09 是低估 9%，W10 是高估 46%），兩點不足以調整係數。

- [x] 已回填 `calibration-matrix.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `calibration-log.md`
- [x] |R − 1.0| = 76% > 30% → AD 已記入 BACKLOG

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**11**（Day 0 六條 D1-D6，Day 2 再五條 D7-D11）
- Day-0 成本：無法量測（見 Q2）
- **預防的返工**：~**3 hr**。D3 是關鍵 —— 整個 C 方案壓在兩個「應該可以」的假設上
  （Prisma 表達得出來、MATCH SIMPLE 讓 NULL 指標通過）。任一為假，Day 1 的 schema、migration、
  repository 介面與端點形狀**全部要重來**
- **ROI**: 無法計算分母，但**質的判準成立**：Day 0 花在 probe 上的時間以分鐘計，
  它保護的是三天份的形狀決定

**最有價值的那個 drift**：**D3**，而它的價值不在「發現問題」——它**確認了設計可行**。

前九片的 Day 0 都在找 plan 說錯了什麼。這次最貴的一條是**把一個假設變成量測**：
`prisma validate` → `migrate diff` 的 DDL → runtime probe 四項（NULL 指標可插 / 首版可插 /
promote 成功 / 跨報告指標 23503）。⭐ **Day 0 的產出可以是「你可以放心蓋下去」**，
而那和「你猜錯了」一樣值錢 —— 前提是你真的去量，而不是因為看起來合理就往下走。

---

## Q4 — 做得好的（保持）

- **⭐ 把預測寫進測試本身，然後讓它失敗**。int 測試 6 的名字現在還留著
  「which is not what was predicted」。它預測 raw UPDATE 會命中 0 列而不報錯，實際是 42501 ——
  於是 migration 註解裡那句因果被當場推翻。**一個帶著預測的測試，失敗時比成功時值錢**
- **⭐ 補完測試後再跑一次中性化**。測試 15 第一版用 `create()`，N4 重跑**仍全綠** ——
  `RETURNING` 遮蔽了 `WITH CHECK`。這條陷阱本專案已經記錄過（`AD-ReturningMasksCheck-1`），
  我照樣踩了，而抓到它的**不是那份紀錄，是重跑**
- **遇到規格給了兩個互斥欄位就把三個選項寫下來再選**（A/B/C 表）—— 與 W09
  `template_version` 同一個動作，第二次證明它讓「為什麼不是另外兩個」變成可讀的紀錄
- **量測用的 SQL 全部包在 `BEGIN`/`ROLLBACK` 裡** —— 五次 probe，dev DB 零殘留

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 四個端點皆由 `bootstrap/app.module.ts` 註冊，int spec 實際建起模組 |
| AP-2 Cross-directory scattering | 0 | repository 在 `core-model/`、端點在 `modules/rm-report/`；建前已 grep 過既有 12 個前綴 |
| AP-3 Potemkin | **0，但複查過一次** | ⚠️ 「快照表而不能產生快照」是否為 Potemkin？**不是**：關掉它會壞的事情答得出來 —— 版本存不進去、指標不會動、已發布版本可被改寫，三者各有測試且中性化時各自轉紅。產生器是**另一個能力**，不是本能力缺的一半。§9 明記 |
| AP-4 PoC accumulation | N/A | |
| AP-5 Speculative abstraction | 0 | ⚠️ 一度想加 trigger 擋 UPDATE，因缺席的 policy 已是更強形式而放棄（migration 註解記錄） |
| AP-6 Mock vs real divergence | 0 | unit 用 double、int 用真 DB |
| AP-7 命名 / orphan claim | **1，已修** | ⛔ migration 註解宣稱「GRANT 是縱深、policy 是執行的那一半」，被 int 測試 6 推翻。**在同一天內就地更正**，並把未驗證的那半降級寫成 prediction |

**Lint**: `run_all.py` **7/7** ✅ · `lint:negative` PASS(49) · `check_entity_index` 19/35

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-UniqueKeyOracle-1` | 唯一索引不受 RLS 管且**早於**複合 FK 觸發，所以任何**呼叫端可選的**唯一 tuple 都是 existence oracle | 建唯一索引時強制自問「這個 tuple 是呼叫端給的嗎」；是 → `org_entity_id` 必須在鍵裡。**值得一條 detector** | 候選 |
| `AD-CalibrationDay0InOrOut-1` | `pattern-reuse-feature` 的四點跨 0.23~0.84，而分界正是「窗口含不含 Day 0」 | `calibration-matrix.md` 增一欄記錄量法；⛔ 定義統一前不得調乘數 | 候選 |
| `AD-ImmutableRowRetention-1` | `05:76` 要求版本保存 3 年後歸檔，而不可變表**沒有任何路徑**寫得了 `retired_at` | 歸檔路徑出現時一併決定：加 policy、或改由另一張表記錄處置 | 候選 |
| `AD-BorrowedRefusal-1`（**第 5 次**）| 版本表 INSERT policy 的 `WITH CHECK` 零覆蓋 —— counter 先拒 | 本 phase **已補**（測試 15）。⚠️ 提議升級為結構性解法：新表的每一條 policy 都要有一個**繞過 `issueRefCode` 且不產生 `RETURNING`** 的直接寫入測試，寫進 checklist 模板 | 驗證中(2/3) |
| `AD-ReturningMasksCheck-1`（**更新**）| 已記錄的陷阱**再次被踩**，而抓到它的是重跑中性化不是那份紀錄 | 條款：任何「證明 policy 有效」的測試，其寫入路徑必須**先聲明它不產生 `RETURNING`** | 驗證中(2/3) |
| `AD-BottomUpBlueprint-1`（**更新**）| 新估法第 2 點：W09 低估 9%、W10 高估 46%，方向相反 | 等第 3 點再判斷；⛔ 兩點反向不構成證據 | 驗證中(2/3) |
| `AD-SchemaHeaderStale-1` | `schema.prisma` 的 MHist **連續兩片**（W08 / W09）未更新，`Purpose` 的 model 數停在 13 而實際 18 | 這是 `file-header-convention` 的機械可檢項 —— 提議 detector：header 宣稱的數字與可導出事實比對 | 候選 |
| `AD-PartialGateReportedAsFull-1` | ⛔ **Day 3 的 commit 寫「gate 全綠」，實際只跑了 int · lint · cov · run_all** —— 少了 format / type / build / web。Day 4 才抓到 `format:check` 在 Day 3 就已經紅了 | `AD-GrepAssertion-1` 的同族（**用較窄的檢查冒充較寬的結論**），只是這次受害的是自己的流程。提議：checklist 模板的 Day 3 §3.x **明列與 Day 2 §2.x 相同的 gate 清單**，不要只寫「跑 gate」 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- 快照產生器（從 live register 凍結）→ M7/M8
- `sheet` 結構 → `AD-AssessmentDefinitionUnvalidated-1` 家族
- 3 年保存 → `AD-ImmutableRowRetention-1`
- `StatementOfApplicability` —— 同屬受控交付物，但 `framework_id` 指向索引上**不存在**的
  `Framework` 實體，**需要使用者裁決**才能排片
- ⚠️ **R4 敞口 15 → 17 張表**，且新增的角度：其中一張是**不可變的受控交付物**，
  而「誰在何時發了哪一版」正是稽核第一個會問的，平台答不出來

**這個 phase 關掉的**：

- **M1 DoD 的 `versioning` 第一次有標的** ✅ —— 但 DoD 本身未達成（其餘 16 張表）
- **`02a:257` 的 `state` 幻影欄位** ✅ CLOSED —— 記錄為 deviation，不是漏建
- **Day-0 D3 / D5 兩條 plan §8 風險** ✅ CLOSED —— 由量測關閉

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— R4 敞口由 15 → **17 張表**
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] `python scripts/lint/run_all.py` 全綠
