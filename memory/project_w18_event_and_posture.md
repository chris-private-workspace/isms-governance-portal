# W18 — `events` + `posture_snapshots`（M1 slice 13）

**Closed**: 2026-08-17 · **PR**: **MERGED (PR #77, `d370f8c`)** · **Status**: `closed`
**權威來源**: [`retrospective.md`](../docs/01-planning/W18-m1-event-and-posture-snapshot/retrospective.md)
· [`CH-037`](../docs/03-implementation/changes/CH-037-w18-event-and-posture-snapshot.md)

---

## 一句話

兩張 entity-scoped、append-only 的表把實體索引推到 **34 / 36**，
而本片真正的交付是**一個區分**：同樣的構造，兩個不可互換的理由。

---

## 交付

| 檔案 | 動作 |
|------|------|
| `apps/api/prisma/schema.prisma` | EDIT — 3 enum + 2 model + `OrgEntity` 兩個反向關聯 |
| `apps/api/prisma/migrations/20260817033944_event_and_posture_snapshot/migration.sql` | NEW — 2 表 · 3 index · 2 FK · RLS ×2 · 4 policy · 2 GRANT · 2 COMMENT |
| `apps/api/src/core-model/event-and-posture.int.spec.ts` | NEW — 17 測試 |
| `apps/api/test/int-global-setup.js` | EDIT — 3 events + 5 snapshots + 2 計數守衛 |
| `scripts/lint/check_entity_index.py` | EDIT — +1 ALIAS |
| `docs/02-architecture/02a-data-model-spec.md` | EDIT — `:42` 的過期宣稱（⚠️ 偏離 plan 的 UNTOUCHED，見 D13）|

**Gate**：`run_all` 9/9 · `check_entity_index` **34/36** · api int **265/21**（248 → +17）·
api unit 480/40 · web 10/1 · coverage 92.14/91.77/98.98/93.56（逐位等於 baseline）·
`lint:negative` 0 bypasses。⚪ **gate-only verified**，零 user-facing surface。

---

## 核心：同一個構造，兩個不可互換的理由

兩表最後都是 RLS `ENABLE`+`FORCE` + 2 policy + `SELECT, INSERT` 無 UPDATE。

| 表 | append-only 的理由 | 解封 |
|---|---|---|
| `posture_snapshots` | **BY SPECIFICATION** —— `02a:475` 明文 "do not retro-edit them" | **無**。加 `GRANT UPDATE` 是牴觸規格 |
| `events` | **BY INABILITY** —— 推進狀態需要 `status`，而它有兩份互斥 lifecycle | **M6** |

⇒ int 測試 7 與 13 斷言**同一個 42501**，各自寫明是哪一種。
一個叫「the table is immutable」的測試會在這個區分消失之後**繼續通過**。

---

## Day-0：11 條 drift，其中一條是不同類的

**D1 —— 論證漂移，本片最有價值的產出。**
plan 給 `Event.status` 不建的第一個理由是「不在 `02a:233` 的欄位清單上」。
而 `02a:157` 明說 §3 **只列 entity-specific 欄位**、每個 entity **另外**帶 §1.1 base fields，
而 `status` 正是其中之一 ⇒ **那個理由對任何 base field 都成立，所以不是理由**。

⛔ **它與其餘十條不同類**：其餘是「plan 說 X 而實際是 Y」（**事實漂移** —— Day 1 的第一個
grep 或第一次跑測試就會抓到）。D1 是**論證漂移** —— 它會安靜通過所有 gate、寫進
migration banner、然後**被下一片當範本**。

⭐ 抓到它的不是 grep，是**一個 agent 在回答另一個問題（base fields 有哪些）時順帶引用了
`02a:157`**。⇒ Day-0 的價值有一部分來自**問題問得夠寬**。

存活的理由是 JUDGEMENT 等級且更窄：`02a:417` 給 5 態、`11:45-58` 給 8 個具名狀態，
共通 4 個，從未裁決。⚠️ 與 `Attestation` 的同一個省略（`schema.prisma:2228`）**理由相反** ——
那裡是「§4 沒給 lifecycle」，這裡是「§4 給了，而另一份權威給了不相容的另一份」。

**其他關鍵 drift**：

- **D3** —— `posture_snapshots` 的 base-field 信封抄 **`AuditLog`** 不是 `Attestation`。
  `AuditLog:2063-2072` 的三個理由逐條命中批次寫入的快照，尤其
  **`retired_at` 在 append-only 表上就是 redaction 機制**。`02a:465-473` 的七欄清單獨立地同意。
- ⚠️ `extensions` 的省略標為 **JUDGEMENT 而非 MECHANICAL** —— `retention_policies` 的理由是
  「`validate_extensions()` 讀 `NEW.org_entity_id` 而它沒有」，**本表有** ⇒ 借用會是
  `AD-BorrowedRefusal-1` 的形狀。
- **D8** —— `AD-UniqueKeyOracle-1` 的判準**跑過**而不是引用：`period` 與 `metric_key`
  都由排程 job 供給 ⇒ `org_entity_id` 必須在鍵裡。第 4 個資料點、第 2 個正面的。
- **D13**（Day 1）—— plan 把 `02a` 標成 UNTOUCHED，那對「不新增列」是對的、
  對「列的內容」是錯的：`:42` 寫著 "the table is not built yet"。
- **D14**（Day 1）—— `loss_amount` 有**第二個獨立的**不可用理由：**無幣別欄位**，
  13 OpCo 跨 11 管轄區 ⇒ **M6 之後仍不可解讀**。plan 只記了 AP-3 那一個。
- **D15**（Day 1）—— 我的測試 3 預測錯了 SQL 排序。真正的教訓是**那個斷言本來就不該依賴
  `ORDER BY`** —— 它要證明的是「三個值都可達」，那是集合。

---

## 中性化：5 條全中，含紅的形狀

| # | 改動 | 實際 |
|---|------|------|
| N1 | 刪 `events_insert` policy | 1 紅（測試 6），測試 5 仍綠 |
| N2 | 刪 posture 的 `FORCE` | 1 紅（測試 8）|
| N3 | 加 `GRANT UPDATE` | 2 紅（測試 7、17），⭐ 測試 7 以 `resolved instead of rejected` + `rowCount: 0` |
| N4 | 唯一鍵拿掉 `org_entity_id` | **`globalSetup` 崩潰**，23505 指名該 constraint |
| N5 | 刪 `events_read` policy | 2 紅（測試 2、4）|

⭐⭐ **N1 是對 W17 的對照實驗**：同一個中性化，W17 得 **0 轉紅**（247 全綠）、W18 得 **1**。
唯一差別是本片有「範疇內 INSERT 成功」那個測試 ⇒ `AD-VacuousScopeTest-1` 的修法
**首次被實測確認有效**而非被推論。

⭐ **N3 讓 banner 的宣稱不再是借來的**：「有 GRANT 無 policy ⇒ 不拋錯、影響 0 列」
在此之前引用自 W10 N1a / W16 N3a，本片在自己的表上量到。

⚠️ **五條全中不全是好消息。** 它說模型準確，不說練習有收穫 ——
W17 的 N4 預測失敗產出的價值高於本片五條的總和。
⇒ 下一片應**提高中性化難度**：挑沒把握的機制，不挑確定會紅的。

---

## Calibration

`pattern-reuse-feature` 第 **11** 點 · bottom-up 6.0 → committed 3.0（mult 0.50）→
actual **1.63 hr**（98.0 min，五段）· ratio **0.545 UNDER** · **KEEP 0.50**

⭐ **本 class 第一個「乾淨的 UNDER」** —— T0 首次蓋在**讀第一個檔案之前**，分子完整。

⛔ **ratio 對分子的方向與直覺相反，我在 retro 初稿寫反過一次**：
`ratio = actual / committed`，分子變大則 ratio **變大**。所以 W17 的 0.78 是**下限**，
真值 **> 0.78** 而非 < 0.78 ⇒ **本欄歷史上的 UNDER 有一部分是量測 artifact
（actual 被低估），不是真的高估工時**。這讓本點的訊號**更強**而非更弱。

⚠️ W17 留的判準（「第 11 點落 0.7-0.85 → re-point 0.45」）**字面不觸發**，因為本點更低。
新判準：**第 12 點在同量法下再落 < 0.7** 則 re-point 0.45；
⛔ 3-phase 移動平均**不得跨量法計算**（`AD-CalibrationT0PlacementShift-1`）。

---

## Anti-pattern 自檢

**AP-3 違規 1 次，如實記**：`events.loss_amount` 今天零寫入者 ⇒ 每列 NULL。
不藏在 N/A 底下（W17 先例）。三件事讓它是**有記錄的偏離**：使用者明確裁決建它 ·
兩個獨立理由寫進 docstring 與 banner（第二個在 M6 後仍成立）· 解封點明確（M6）。

其餘 AP-1/2/4/5/6/7 皆 0。⭐ AP-5 主動拒絕三處（residency 五欄 · `events` 的
`occurred_at`/`severity` index · posture 的第二個 index）；AP-7 反而**修掉**一個（`02a:42`）。

---

## Carryover

- **slice 14**：`AccessRequest` · `AccessReviewCampaign`。
  🔴 **建之前必須裁決**：`02a:325` 的 `org_entity_id` **nullable** 與約束 8 鐵律 1 衝突。
  規格解釋了「為什麼要 nullable」（外部稽核員的 just-in-time 存取），
  **但沒有回答「NULL 的列怎麼被 RLS 治理」** —— `extension_fields` 的同形狀曾產生
  `AD-GroupRowTheft-1`。
- **7 條新 AD** → BACKLOG（132 條 / P0 7 / P1 73 / P2 52，detector 導出）

## 關聯

[[project_w17_retention_and_legal_hold]] · [[project_w14_attestation]] ·
[[feedback_evidence_must_support_claim]] · [[feedback_day0_must_grep_plan_assumptions]]
