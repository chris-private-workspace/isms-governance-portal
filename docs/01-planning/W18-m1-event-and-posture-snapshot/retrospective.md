# Phase W18 — Retrospective

**Phase**: W18 — M1 slice 13: `events` + `posture_snapshots`
**Period**: 2026-08-17 ~ 2026-08-17
**Plan**: [plan.md](./plan.md)
**PR**: **MERGED (PR #77, `d370f8c`)** — 2026-08-17T05:40:31Z，CI 6/6，經 `gh` 驗證
**Change record**: `docs/03-implementation/changes/CH-037-w18-event-and-posture-snapshot.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `posture_snapshots` 表 + 2 enum + RLS + seed | ✅ 完成 |
| US-2 | `events` 表 + 1 enum + RLS + seed | ✅ 完成 |
| US-3 | 整合測試（負面測試以 SQLSTATE 斷言）+ 中性化實測 | ✅ 完成（17 測試 · 5 條中性化）|
| US-4 | CH-037 + retrospective + BACKLOG / ROADMAP / calibration 回填 | ✅ 完成 |

**Acceptance criteria**（plan §5）逐條：

| AC | 結果 |
|----|------|
| AC-1 `check_entity_index` **34 / 36** | ✅ 分母不變，models 33 → 35 |
| AC-2 兩表 RLS `ENABLE` + `FORCE` 逐表實測 | ✅ 測試 1 / 8，**兩個獨立查詢**非一次查兩表 |
| AC-3 GRANT 集合逐表斷言 `SELECT, INSERT` only | ✅ 測試 17，`toEqual` 非 `toContain` |
| AC-4 跨實體 INSERT 被拒 **且** 範疇內 INSERT 成功 | ✅ 測試 5/6（events）· 11/12（posture）—— **四個測試，兩表各兩個方向** |
| AC-5 逐欄位對照 + 缺席證明 + **先跑陽性對照** | ✅ 測試 16：先 `toEqual` 七欄，**再**斷言 residency 五欄缺席 |
| AC-6 中性化 ≥ 4 次，預測先 commit | ✅ **5 次**，預測 commit `4837316` 早於第一次執行 |
| AC-7 `AD-UniqueKeyOracle-1` 判準已跑過並記錄 | ✅ Day-0 D8，第 4 個資料點 |
| AC-8 Drive-through N/A（gate-only verified），明記非省略 | ✅ CH-037 §Verification + 本檔 |
| AC-9 三個「不建」各自在 banner + docstring 寫明理由與解封點 | ✅ residency 五欄 · `Event.status` · restricted block |

**未完成項目**：無。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 11 個資料點**）
- **Agent-delegated**: `no`（plan §7 宣告；Day-0 用了 2 個 agent 做機械掃描，屬 recon 非 Day 1 工作）
- **Bottom-up est**: 6.0 hr
- **Committed (calibrated)**: 3.0 hr（mult 0.50）
- **Actual**: **98.0 min = 1.63 hr**
- **Ratio**: 1.63 / 3.0 = **0.545**
- **Band 判定**: **UNDER**（< 0.7）

**逐段量測**（宣告的量法：commit author date 為段界）：

| 段 | 區間 | 分鐘 |
|---|------|------|
| 1 | T0 `10:47:33` → `3f69e08` | **45.60** |
| 2 | `3f69e08` → `0dc410a` | 25.08 |
| 3 | `0dc410a` → `4837316` | 1.18 |
| 4 | `4837316` → `d8179af` | 19.95 |
| 5 | `d8179af` → `3ec5f0b` | 6.18 |
| | **總計** | **98.0** |

⚠️ **> 30 min 的段必須逐條說明（量法宣告的要求）**：段 1 為 **45.60 min**。
它**不是**等待間隙，是單一段連續工作 —— Day-0 三-prong（讀 on-demand 規則、派 2 個 agent、
讀 5 份規格段落、跑 3 組 baseline、寫 11 條 drift、建 checklist）。⇒ **計入**。

⚠️ **未計入的最後一段**：本檔與 calibration 回填、導航檔更新發生在 `3ec5f0b` **之後**，
估 ~20 min。含它的話 **118 min = 1.97 hr ⇒ ratio 0.656**。
⭐ **兩端同 band（皆 < 0.7）** ⇒ band 判定穩健，這個結論不依賴我怎麼算最後一段（W13 的做法）。

**發生了什麼**（ratio 出 band，必填）：

三個環節都比估的便宜，而**便宜的原因各不相同**：

1. **規格閱讀與範圍決策（估 1.5 hr）** —— 實際落在段 1 內。便宜的原因是**規格自己劃了界線**：
   `02a:38` / `02a:58` 的 Wave 分界、`02a:488` 的 NOT BUILT banner、`02a:477` 的 governed set。
   我幾乎沒有做「範圍決策」，我做的是**把規格已有的決策抄下來並註明出處**。
2. **schema + migration（估 1.5 hr）** —— 段 2 的 25 min 內完成。`attestations` / `legal_holds`
   提供了逐欄可抄的信封，`AuditLog` 提供了省略的理由詞彙。**第三次複用同一個 pattern**。
3. **中性化 + AC-2（估 1.0 hr）** —— 段 4 的 20 min。⚠️ 這一格的便宜有一半是**運氣**：
   五條全中，所以沒有任何一條需要回頭查「為什麼紅得不對」。W17 的 N4 零轉紅花掉的時間
   全在那個「查清楚」上。

**行動**: **KEEP 0.50**，但**修訂 matrix 的預先判準**。

⚠️ `CALIBRATION-MATRIX.md:54` 帶的預先判準是「若第 11 點再落 **0.7-0.85** 則 re-point **0.45**」。
本點是 **0.545**，**低於**那個區間 ⇒ **判準的字面不觸發**。⛔ 但那不代表沒有訊號 ——
原判準隱含假設「若再偏低，會偏在 0.7-0.85」，而實際偏得更多。

⭐ **本點與前十點有一個不可比的差異，而它的方向與直覺相反**：
本點是本 class **第一個「T0 蓋在讀第一個檔案之前」的點** ⇒ 分子第一次涵蓋整段工作。

⛔ **注意 ratio 對分子的方向**：`ratio = actual / committed`，分子變大則 ratio **變大**。
W17 的 0.78 是**下限**（起草段在窗口外沒被量到）⇒ 它的真值 **> 0.78**，不是 < 0.78。
⇒ 歷史上那些 UNDER band 的點，**有一部分是量測 artifact**（actual 被低估）而非真的高估工時。

⇒ 這讓本點的意義更強而不是更弱：**它是本 class 第一個「乾淨的 UNDER」** ——
分子完整而仍然落在 0.545。這個 UNDER **不可能**用「起草段沒量到」解釋掉。
⚠️ 但乾淨的點只有 **1 個**，離 3-phase 證據還很遠。

**修訂後的判準（寫進 matrix）**：若**第 12 點在同一量法下**（T0 蓋在讀第一個檔案之前）
再落 **< 0.7**，則 re-point **0.45**。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] |R − 1.0| = 0.455 > 30% → 已記入 BACKLOG（`AD-CalibrationT0PlacementShift-1`）

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量**：**11**（Prong 1: 0 異常 / Prong 2: **D1-D8 + D11** / Prong 3: 0 異常 / baselines 1）
  —— Day 1 另發現 4 條（D12-D15）
- **Day-0 成本**：**45.6 min**（含派 2 個 agent + 自己複核它們引用的 5 處程式碼）
- **預防的返工**：~**1.5-2 hr**

| Drift | 若沒抓到會發生什麼 | 估計成本 |
|---|---|---|
| **D1** | 一個**對任何 base field 都成立**的假理由寫進 migration banner + schema docstring，成為下一片抄襲的模板 | 不可量化（**污染的是判斷不是程式碼**）|
| **D3** | 抄 `Attestation` 的信封 ⇒ 建了 `ref_code` / `version` / `updated_at` / `retired_at` 四個欄位 ⇒ 之後發現 `retired_at` 在 append-only 表上是 redaction 機制 ⇒ 拆 | 30-45 min |
| **D8** | 唯一鍵少了 `org_entity_id` ⇒ existence oracle ⇒ **合規事故**（約束 8） | 不可量化 |
| **D9** | 照抄 plan 的 `npm run prisma:migrate` ⇒ 撞 `AD-DevDbChecksumDrift-1` | 20-30 min |
| **D4** | 沒加 ALIAS ⇒ detector FAIL，且訊息是「1 model on no index row」不會指出要加 alias | 5-10 min |

- **ROI**: ~**2-2.6×**

**最有價值的那個 drift**：**D1**。

它與其他十條**不同類**：其餘都是「plan 說 X 而實際是 Y」（事實漂移），D1 是
**「plan 的理由撐不住」**（論證漂移）。⛔ 事實漂移會被 Day 1 的第一個 grep 或第一次跑測試抓到；
**論證漂移不會被任何東西抓到** —— 它會安靜地通過所有 gate、寫進文件、然後被下一片當範本。

⭐ 抓到它的機制值得記：不是 grep，是**一個 agent 在回答另一個問題時順帶引用了 `02a:157`**。
我原本問的是 base fields 有哪些，回來的證據裡有一句「§3 只列 entity-specific 欄位」——
那句話與 plan 的理由直接矛盾。⇒ **Day-0 的價值有一部分來自問題問得夠寬**。

---

## Q4 — 做得好的（保持）

- ⭐ **T0 蓋在讀第一個檔案之前** —— W17 retrospective 指定的改進，本片首次執行。
  結果是本 class 第一個分子涵蓋整段工作的資料點（見 Q2）。
- ⭐ **預測先 commit，且 commit 內容包含「我對哪兩條沒把握」** —— `4837316` 明寫
  N2 與 N3 是關於**機制**的預測，並說明它們若錯代表我的哪個模型錯。
  ⇒ 這讓「五條全中」有意義；若預測只寫「會紅」，全中不證明任何事。
- ⭐ **委派 agent 做機械掃描，但自己複核它們引用的每一處程式碼** ——
  兩個 agent 回報了 `check_entity_index.py:187`、`audit-coverage.int.spec.ts:516-531`、
  `schema.prisma:2063-2072` 等關鍵行，我逐一 Read 過才採用。
- ⭐ **coverage 用落檔 + Grep 取 `All files`，不用 `tail`** —— Day 0 我用 `tail -30`
  截掉了那一行並**如實記為未驗證**；Day 1 改掉量法後四項逐位對上。
  ⇒ `AD-PartialGateReportedAsFull-1` 的形狀在同一個 phase 內被發現並修正。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 兩表皆在 `core-model`，migration 進主 migration 序列 |
| AP-2 Cross-directory scattering | 0 | schema / migration / spec / seed 各在既有位置，建前已 Grep（Prong 3 零命中）|
| AP-3 Potemkin | **1** | ⚠️ **`events.loss_amount`** —— 見下 |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | ⭐ 主動拒絕三處：residency 五欄 · `events` 的 `occurred_at`/`severity` index · posture 的第二個 index |
| AP-6 Mock vs real divergence | 0 | 無 mock；int suite 跑真 PostgreSQL |
| AP-7 命名 / orphan claim | 0 | ⭐ 反而**修掉**一個：`02a:42` 的 "the table is not built yet" |
| **總計** | **1** | |

**AP-3 的那一次，如實記**：`events.loss_amount` 今天**沒有任何寫入者**（零 repository、零端點），
所以每一列都是 NULL。這**符合 AP-3 的定義**（結構在、接口完整、無實際內容）。

⛔ **不把它藏在 N/A 底下**（W17 先例）。三件事讓它是**有記錄的偏離**而非疏忽：
1. 使用者 2026-08-17 明確裁決建它
2. 兩個獨立的不可用理由都寫進 schema docstring 與 migration banner，
   其中**第二個（無幣別）在 M6 之後仍然成立**
3. 解封點明確：M6

**Lint**: `run_all.py` **9 / 9** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-EventStatusUnruled-1` | 兩份互斥 lifecycle，M6 前必須裁決 | M6 checklist 必須有那一列 | 候選 |
| `AD-EventSeverityUnregistered-1` | Wave 1 表引用 Wave 2 文件值域，`02a` §2 缺該列 | 把值域登記進 `02a` §2 | 候選 |
| `AD-LossAmountNoCurrency-1` | 無幣別欄位，M6 後仍不可解讀 | M6 一併裁決 amount + currency | 候選 |
| `AD-PostureRagMetricValueUndefined-1` | 第九個 metric key 是 band，`metric_value` 語義未定 | M8 連同 `08` 的 roll-up rule 定案 | 候選 |
| `AD-SchemaNoFormatGate-1` | 每個動 schema 的 phase 都會付一次無關重排的成本 | `prisma format --check` 進 `run_all` 或 CI | 候選 |
| `AD-AuditModuleStaleCount-1` | `audit.module.ts:48-57` 過期 10 個 model | 數字改為由指令產生 | 候選 |
| `AD-CalibrationT0PlacementShift-1` | ⭐ **量法改變讓新舊資料點不可比** —— 本點是本 class 第一個「T0 在讀第一個檔案之前」的點，`ratio 0.545` 與前十點（多數為下限）**不在同一個尺上** | matrix 需要一欄記「T0 落點」，且 3-phase 移動平均**不得跨量法計算** | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

⚠️ **一個不是 AD 但值得記的觀察**：**五條中性化全中不全是好消息。**
它證明我對這套機制的模型準確，但**沒有產出任何新知識**。
W17 的 N4 預測失敗（零轉紅）產出的價值高於本片五條全中的總和。
⇒ 下一片應**提高中性化難度**：挑我沒把握的機制，而不是挑我確定會紅的。

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **`AccessRequest` · `AccessReviewCampaign`** → slice 14。
  🔴 **建它之前必須裁決**：`02a:325` 的 `org_entity_id` **nullable** 與約束 8 鐵律 1 衝突。
  規格解釋了「為什麼要 nullable」（外部稽核員的 just-in-time 存取），
  **但沒有回答「NULL 的列怎麼被 RLS 治理」** —— 而 `extension_fields` 的同一形狀
  曾產生 `AD-GroupRowTheft-1`。
- 六條新 AD → BACKLOG §Open

**這個 phase 關掉的**：

- 完全關閉：**無**
- ⭐ **`AD-VacuousScopeTest-1`（W13 已關閉）的修法首次取得對照實測** ——
  同一個中性化，W17 得 0 轉紅、W18 得 1，唯一差別是那個正面測試。
  ⇒ 該修法從「被推論有效」升級為「**被量到有效**」。

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [x] Calibration ratio 回填 matrix（**不在** CLAUDE.md / MEMORY.md 散文裡）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— 見下
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
