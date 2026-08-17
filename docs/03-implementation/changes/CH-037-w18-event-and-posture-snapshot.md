# CH-037: W18 — `events` + `posture_snapshots`，兩張表與兩個不可互換的理由

**Date**: 2026-08-17
**Phase**: W18（M1 slice 13）
**Scope**: `core-model`（+ 非範疇：`scripts/lint`、`test`）
**Components**: —
**PR**: PR-pending

---

## Problem

實體索引停在 **32 / 36**。缺的四個裡有兩個是 M1 的必要表：

- **`posture_snapshot`** 是旗艦滾升儀表板的**唯一資料來源**（`02a:459`、`08:56`）。
  沒有它，「所有 OpCo 的 ISMS 現況一眼看完」——本專案的主驅動力（已確認參數 #5）——**無處可讀**，
  而 `02a:513` 已經決定矩陣要對**所有**實體讀快照（統一 as-at），不是部分即時算。
- **`Event`** 是 `02a:229` 的 `Issue.source = incident` 指向的東西。今天那個 enum 值
  **建不出來**（`schema.prisma:661-665` 明記原因），因為事件記錄不存在。

兩者在 `schema.prisma` 皆零命中（Day-0 Prong 3 實測）。

---

## Root Cause

不是「還沒做」。真正的成因是**兩份規格對同一個實體給出不相容的內容，而沒有機制強迫任何人先解決它**：

- `Event` 在 `02a:38` 是 Wave 1（六欄骨架），在 `02a:58` 的 extension 是 Wave 2（`11` 的 10+ 欄）。
  ⇒ 骨架建得起來，但**建它就必須逐欄回答「這一欄屬於哪一邊」**，而那個工作沒有人排期。
- `Event.status` 的值域有**兩份互斥的權威**：`02a:417` 給 5 態、`11:45-58` 給 8 個具名狀態，
  共通只有 4 個。⇒ 建 `status` 需要一次裁決，而**沒有任何 gate 會要求那次裁決發生**。
- `posture_snapshot` 的 `02a:488` banner 說 residency 五欄 NOT BUILT，
  但**沒說剩下七欄的 base-field 信封該長什麼樣** ⇒ 每個接手的人都要自己重新推導一次。

---

## Solution

### 建了什麼

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/api/prisma/schema.prisma` | 修改 | 3 enum（`EventSeverity` / `PostureMetricKey` / `PostureRag`）+ 2 model + `OrgEntity` 兩個反向關聯 |
| `apps/api/prisma/migrations/20260817033944_event_and_posture_snapshot/migration.sql` | 新增 | 2 表 · 3 index · 2 FK · RLS `ENABLE`+`FORCE` ×2 · **4 條 policy** · 2 GRANT · 2 COMMENT |
| `apps/api/src/core-model/event-and-posture.int.spec.ts` | 新增 | **17 個測試** |
| `apps/api/test/int-global-setup.js` | 修改 | seed 3 events + 5 snapshots + 2 個計數守衛 |
| `scripts/lint/check_entity_index.py` | 修改 | +1 ALIAS（`PostureSnapshot` → `posture_snapshot`）|
| `docs/02-architecture/02a-data-model-spec.md` | 修改 | `:42` 的 *"the table is not built yet"* 已過時 —— 改事實陳述，不動設計 |

### ⭐ 這個 CH 的核心是一個**區分**，不是兩張表

兩表最後都是 entity-scoped + RLS `ENABLE`+`FORCE` + 2 policy + `SELECT, INSERT` 無 UPDATE。
**構造相同，理由不可互換**：

| 表 | append-only 的理由 | 解封條件 |
|---|---|---|
| `posture_snapshots` | **BY SPECIFICATION** —— `02a:475` 是明文指令：*"snapshots are historical record — do not retro-edit them"* | **無**。未來加 `GRANT UPDATE` 是**牴觸**規格，不是補完它 |
| `events` | **BY INABILITY** —— 推進事件狀態需要 `status`，而它有兩份互斥 lifecycle 且從未裁決 | **M6**，在表單之前 |

⇒ int 測試 7 與 13 斷言**同一個 42501**，而各自寫明是哪一種。
單一個叫「the table is immutable」的測試會在這個區分消失之後**繼續通過**。

### Load-bearing 的細節（拿掉就會壞，但看起來像小事）

1. **`posture_snapshots` 的 base-field 信封抄的是 `AuditLog` 不是 `Attestation`。**
   `AuditLog:2063-2072` 的三個理由逐條命中批次寫入的快照 ——
   尤其 **`retired_at` 在 append-only 表上就是 redaction 機制**。
   `02a:465-473` 的七欄清單**獨立地**得到同一個答案。
2. ⚠️ **`extensions` 的省略標為 JUDGEMENT，明確不是 `retention_policies` 的 MECHANICAL。**
   後者的理由是「`validate_extensions()` 讀 `NEW.org_entity_id` 而它沒有」——
   **本表有** ⇒ 借用那個理由會是 `AD-BorrowedRefusal-1` 的形狀。
   本表真正的理由：`02a:477-486` 治理 metric key 集合正是為了不讓人繞過 review step 加東西，
   而 JSONB 欄位就是那道側門。
3. **唯一鍵含 `org_entity_id`，且判準是**跑過**的不是引用的。**
   `AD-UniqueKeyOracle-1` 的判準（`BACKLOG.md:268`）是「這個 tuple 是呼叫端給的嗎」——
   `period` 與 `metric_key` 都是（排程 job 傳入）⇒ 觸發 ⇒ `org_entity_id` 必須在鍵裡。
   seed 的 rows 1 & 4 共用 `(2026-Q3, total_risks)` 而分屬 SG1 / HK1，**fixture 本身就是那道斷言**。

---

## Verification

**Gate**: `type-check` EXIT=0 · `lint` EXIT=0 · `build` EXIT=0 · `format:check` clean ·
`lint:negative` **0 bypasses** · `run_all` **9 / 9** · `check_entity_index` **34 / 36**（AC-1）·
api unit **480 / 40** · api int **265 / 21**（baseline 248 → **+17**）· web **10 / 1** ·
coverage **92.14 / 91.77 / 98.98 / 93.56**（**四項逐位等於 baseline**）

**新增測試**: `event-and-posture.int.spec.ts` —— 17 個。負面測試涵蓋：
跨實體 INSERT 被拒（測試 5 / 11）· **範疇內 INSERT 成功**（測試 6 / 12，⭐ 這半是 W17 的 N4 揭露缺少的）·
app role 不能 UPDATE（測試 7 / 13，各自說明是哪一種 append-only）· 重複唯一鍵 23505（測試 14）·
residency 五欄缺席（測試 16，**先跑七欄陽性對照**才採信那個零）。

**中性化實測 5 條，5 條全中，含紅的形狀**：

| # | 改動 | 實際 |
|---|------|------|
| N1 | 刪 `events_insert` policy | 1 failed（測試 6），測試 5 仍綠 |
| N2 | 刪 posture 的 `FORCE` | 1 failed（測試 8）|
| N3 | 加 `GRANT UPDATE` | 2 failed（測試 7、17），⭐ 測試 7 以 `resolved instead of rejected` + `rowCount: 0` 轉紅 |
| N4 | 唯一鍵拿掉 `org_entity_id` | **globalSetup 崩潰**：`duplicate key value violates unique constraint "posture_snapshots_org_entity_id_period_metric_key_key"` |
| N5 | 刪 `events_read` policy | 2 failed（測試 2、4）|

復原後 `git status --porcelain apps/api` 空、int suite **265 / 21**。

⭐ **N1 是對 W17 的直接對照實驗**：同一個中性化，W17 得 **0 轉紅**（247 全綠），本片得 **1**。
唯一差別是本片有測試 6。⇒「補一個正面測試」這個修法**被實測確認**，不是被推論。

**Drive-through**: ⚪ **N/A —— gate-only verified**
⛔ **非省略**：零端點、零 repository、零 UI、零 CLI 使用者路徑 —— 沒有主流量可駕駛。
消費者在 M8（快照排程 job）與 M6（事件表單）。
⚠️ **本記錄不得被讀成「這兩張表可以用了」** —— 它們可以被寫入與讀取，但今天沒有任何東西這樣做。

**Verdict**: ⚪ N/A（純資料層 —— **gate-only verified**）

---

## Impact

- **Breaking change**: no（純新增；既有表未動）
- **Migration**: yes —— `20260817033944_event_and_posture_snapshot`。
  **可逆**：`DROP TABLE events, posture_snapshots` + `DROP TYPE` ×3（無其他表引用它們）
- **Config**: 無新增環境變數
- **重啟需求**: 無（零 wiring 變更）。⚠️ 但 `prisma generate` **必須**在部署路徑跑
  （`AD-PrismaEnumThreeTruths-1` —— int suite 的 global setup 會重建，部署路徑不會）
- **Rollback**: 反向 migration，< 5 min。無資料遷移故無資料損失風險

---

## 相關

- **關掉的待辦**: 無完全關閉的。⭐ **`AD-VacuousScopeTest-1` 取得第一個「修法有效」的實測**
  （N1 對照 W17）；`AD-UniqueKeyOracle-1` 取得**第 4 個資料點、第 2 個正面的**
- **同類前例**: `CH-031`（W14 `attestations`）· `CH-035`（W17 `retention_policies` + `legal_holds`）
  —— 本片是同一個 append-only pattern 的第三次複用
- **產生的待辦** → [`BACKLOG.md`](../../01-planning/BACKLOG.md)：
  `AD-EventStatusUnruled-1` · `AD-EventSeverityUnregistered-1` · `AD-LossAmountNoCurrency-1` ·
  `AD-PostureRagMetricValueUndefined-1` · `AD-SchemaNoFormatGate-1` · `AD-AuditModuleStaleCount-1`
