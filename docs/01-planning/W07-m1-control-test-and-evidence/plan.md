---
status: closed   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W07 Plan — ControlTest + Evidence，與父表拒絕複合錨點時的範疇防護

**Summary**: 交付 M1 slice 4 —— `ControlTest` + `Evidence` 兩張表與 `/control-tests`、`/evidence`
兩組端點（13/35 實體）。核心不是第 12、13 張表，而是**第一次遇到「複合 FK 用不上」的子表**：
W05/W06 用 `(asset_group_id, org_entity_id)` 複合 FK 關掉跨實體引用，而 `controls` **刻意不建**
`@@unique([id, org_entity_id])`（schema.prisma:755-758，M7 連結表需要兩側 entity 不同），
`evidence` 更是**多型連結、完全沒有 FK**。所以本 phase 要量的是：RI 檢查會不會繞過 RLS、
以及父表拒絕錨點時什麼機制能補上。⚪ **無 UI → API-level verified**，不做 drive-through、
不暗示可用性。**spike class → 產出 design note**（8-point gate）。

**Status**: **Closed**（2026-08-12 —— MERGED PR #44，六個 required check 全 SUCCESS）
起手為 Approved-to-execute（使用者 2026-08-12 —— 選定 scope = `ControlTest` + `Evidence`；
裁決 Scope decision (b) `result` 不建、(e) US-4 留在本 phase；detector 明確再延）

**Branch**: `feature/W07-control-test-and-evidence` —— **MERGED** PR #44（rebase，main head `19bc4f7`）
**Base**: `main` HEAD `5189cf3`（PR #43 的 merge commit，Day 0 §0.2 實測確認）
**Slice**: M1 slice 4 / N（前一片 W06 = slice 3）。關掉 `AD-ReturningMasksCheck-1`（carryover）、
`AD-GroupRowTheft-1`、`AD-CalibrationNoActual-1` 的執行面
**Scope decisions**:
(a) `Evidence.linked_type` **只建 `control_test` 一個值** —— `02a:227` 另列 attestation / assessment，
    兩張表都不存在，建了就是「指向不存在的表的設定」（ADR-0014 砍 `subtree` 的同一判準）
(b) `ControlTest` **只建 `status`，不建 `result`** —— `02a:225` 的 `result` 與 `02a` §4 lifecycle 的
    三個終態（Passed / Partial / Failed）是同一件事，兩個欄位就是兩種說法、無法分辨
(c) `Control.effectiveness` 的派生**不做** —— 本 phase 端點是 create-only，沒有任何 test 會轉到終態，
    派生沒有觸發點（同 W06 對 `not_tested` 的判定）
(d) SoD（`reviewer_user_id` ≠ tester）**不做** —— `02a:416` 明寫「enforced in the review transition」，
    而 review transition 不在本 phase
(e) **順帶關掉一個活著的隔離缺陷**：`extension_fields` 的 `FOR ALL` policy 可被用來奪取 group 列

---

## 0. Background

### The gap（`AD-ReturningMasksCheck-1` carryover + 一個未被命名的結構缺口）

- W06 建了 `controls`，但**沒有任何東西測它**。`Control.effectiveness` 的規格（`02a:418`）
  寫「reflects the latest completed `ControlTest`」，而 `ControlTest` 表不存在。
- 到目前為止，每一張引用別張表的子表都靠**複合 FK** 擋住跨實體引用
  （`assets.(asset_group_id, org_entity_id)` → `asset_groups`）。`ControlTest → Control` **用不上這招**：
  `controls` 刻意不建複合錨點。
- `Evidence` 更極端 —— `linked_type` + `linked_id` 是多型的，**連 FK 都沒有**。
- `extension_fields` 的單一 `FOR ALL` policy：`USING` 含 `org_entity_id IS NULL`（group 列人人可讀），
  `WITH CHECK` 只要求 `∈ scope`。**`UPDATE` 一個 group 列並把 `org_entity_id` 改成自己 → 兩側都過。**

### Why it matters（缺失的能力）

前三點合起來是同一個問題：**當父表拒絕複合錨點時，子表的跨實體引用由誰擋？**
如果答案是「沒有人」，那麼一個 A 實體的寫入者可以建一筆指向 B 實體私有 control 的測試記錄 ——
而且**成功本身就是一個 oracle**：它確認了那個 ID 存在，正是 約束 8 要求回 404 而非 403 的理由。
第四點是已經在跑的程式碼裡的隔離缺陷，不是設計問題。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `<sha>`）| Anchor |
|-------|--------------------------------------------|--------|
| 父表拒絕錨點 | `controls` 無 `@@unique([id, orgEntityId])`，docstring 明寫「M7 的連結表 CANNOT use one」 | `apps/api/prisma/schema.prisma:755-758` |
| 既有的關洞手法 | `assets` 用複合 FK 指向 `asset_groups` | `apps/api/prisma/migrations/20260811024841_asset_and_risk_chain/migration.sql` |
| 既有的 trigger 前例 | 受治理擴充用 `SECURITY INVOKER` trigger 做 RLS 給不了的那層 | `apps/api/prisma/migrations/20260810134319_governed_extensions/migration.sql:86-89` |
| 奪取洞 | 單一 `FOR ALL`，`USING` 含 `IS NULL`、`WITH CHECK` 不含 | 同上 `:80-83` |
| 陳述將變成 orphan | `not_tested` 的 docstring 寫「`ControlTest` does not exist until M7」 | `apps/api/prisma/schema.prisma:448-449` |
| FORCE RLS 不一致 | 7 張表只有 3 張有 `FORCE`，無記錄理由 | 各 `migration.sql`（grep `FORCE ROW LEVEL`）|

→ 本 phase 必須**先量測 RI 檢查與 RLS 的關係**，才能決定 `ControlTest` / `Evidence` 的防護長什麼樣；
先寫表再補防護會讓「防護有沒有生效」變成無法回答的問題。

### The design（`量測 → 依結果選機制 → 兩張表 + 兩組端點 + 中性化驗收`）

```
Day 1  M1  scope-A 寫 control_tests，control_id 指向 scope-B 的 entity-local control
           → 成功 or 42501？（RI 檢查是否繞過 RLS —— 量，不假設）
       M2  同上但目標是 group control（§5.2 類推：這可能是合法的）
       M3  evidence.linked_id 指向 scope-B 的 control_test（無 FK，無 RI 檢查）

       依 M1-M3 結果選機制：
         若 RI 繞過 RLS → SECURITY INVOKER trigger 做存在性檢查（前例：governed_extensions）
         若 RI 不繞過   → 記錄下來，並確認 evidence 仍然需要 trigger（它根本沒有 FK）

Day 2  control_tests + evidence 的 model / migration / per-command policies / trigger
       + extension_fields 的 FOR ALL → per-command 拆分

Day 3  真進程 + 真 PostgreSQL 走兩組端點（API-level）
       + 元驗證：每個「宣稱會擋東西」的機制各中性化一次，確認對應測試轉紅
```

不選「只靠 repository 先讀父列再寫」的原因：約束 8 鐵律 2 要求**優先資料庫層**，
而應用層檢查的失效模式（有人繞過 repository 直接寫）正是 W06 量到 `RETURNING` 遮蔽時的同一形狀。

### Ground truth（recon head-start —— 於 `main` HEAD `<sha>` 讀過的 code）

- `docs/02-architecture/02a-data-model-spec.md:225` — ControlTest 欄位清單
- `docs/02-architecture/02a-data-model-spec.md:227` — Evidence 欄位清單（多型 linked_type/linked_id）
- `docs/02-architecture/02a-data-model-spec.md:385-396` — ControlTest lifecycle（5 態）
- `docs/02-architecture/02a-data-model-spec.md:410` — `ControlTest → Control` N:1 **required**
- `docs/02-architecture/02a-data-model-spec.md:415-418` — 範疇/SoD/派生三條規則
- `apps/api/src/core-model/control.repository.ts` — 本 phase 兩個 repository 的藍本
- `apps/api/src/modules/control/` — 本 phase 兩個 module 的藍本

**Baselines（W06 closeout）**: run_all **6/6** · lint / type / test / build / coverage 於 Day 0 實測填入
（W06 retro 只留了 run_all 的數字）。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-force** — 7 張表只有 3 張 `FORCE ROW LEVEL SECURITY`，讀 W05/W06 migration 註解確認是否刻意
  → 若無記錄，新表要決定跟哪一邊，並把理由寫下來
- **D-m7** — `schema.prisma:448-449` 宣稱「`ControlTest` does not exist until M7」；本 phase 建它
  → 該註解會變成 orphan claim（AP-7），必須同時更正
- **D-index** — `02a` §0 索引寫 `Jurisdiction` / `posture_snapshot` 是「**Built** without …」，
  但 migrations 全樹對這兩個關鍵字**零命中**，且 `02a:175` 自己寫 `Jurisdiction` **is built in M2**
  → 索引的 Note 欄把「規格未含」寫成了「已建」，會誤導後續 slice 的排程
- **D-baselines** — W06 retro 只登記 run_all 6/6；其餘 gate 數字需實測

## 1. Phase Goal

在 `controls` 明確拒絕複合錨點的前提下，交付 `ControlTest` 與 `Evidence` 兩張表與其寫入端點，
並**用量測而非假設**確定跨實體引用由哪一層擋住；每個被宣稱有效的機制都必須通過
**中性化 → 對應測試轉紅**的元驗證。⚪ 無 UI，故驗證止於 API-level，報告**不得暗示可用性**。
產出：**design note**（spike class，8-point gate）+ `CH-022` change record。不預期產出 ADR ——
若 M1-M3 的結果導致「跨實體引用的防護機制」需要一個會約束後續 27 張表的選擇，則補一份。

## 2. User Stories

- **US-1**（量測）: 作為平台工程師，我希望知道 PostgreSQL 的 RI 檢查是否繞過 RLS，
  以便決定子表的跨實體引用該由 FK、trigger 還是應用層擋。
- **US-2**（ControlTest）: 作為第二道防線，我希望登記一次控制測試並綁定到一個控制項，
  以便 `Control.effectiveness` 未來有可派生的來源。
- **US-3**（Evidence）: 作為稽核人員，我希望把證據附到一次控制測試上並記錄其雜湊，
  以便證據等級的主張有可驗證的完整性錨點。
- **US-4**（隔離修補）: 作為區域 ISO，我希望沒有任何 OpCo 能把 group 層的擴充欄位定義
  改成自己專屬的，以便共用宣告維持共用。
- **US-5**（元驗證）: 作為 reviewer，我希望每個宣稱會擋東西的機制都被中性化過一次，
  以便「全綠」是有內容的，而不是沒有人在看。
- **US-6**（closeout）: `CH-022` + design note + retrospective + calibration + 導航檔。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   apps/api/prisma/migrations/<ts>_control_test_and_evidence/migration.sql
NEW   apps/api/src/core-model/control-test.repository.ts (+ .spec.ts)
NEW   apps/api/src/core-model/evidence.repository.ts     (+ .spec.ts)
NEW   apps/api/src/modules/control-test/{controller,module}.ts (+ .controller.spec.ts, .int.spec.ts)
NEW   apps/api/src/modules/evidence/{controller,module}.ts     (+ .controller.spec.ts, .int.spec.ts)
EDIT  apps/api/prisma/schema.prisma            — 2 model + 2 enum；更正 :448-449 的 orphan claim
EDIT  apps/api/src/core-model/scoped-client.types.ts — +2 介面
EDIT  apps/api/src/app.module.ts               — 掛 2 個 module
EDIT  apps/api/test/int-global-setup.js        — 種入跨範疇的量測 fixture
EDIT  apps/api/src/modules/risk/risk.int.spec.ts — 11b 改為不產生 RETURNING（carryover）
UNTOUCHED apps/api/src/entity-scope/           — 本 phase 不動 resolver
```

### 3.1 量測（US-1）— 一次性 SQL，不留在 repo

三個問題各一組 SQL，於 Day 1 對真 PostgreSQL 跑。**結果寫進 progress.md，不論答案是什麼**。
量測腳本本身不進 repo（W06 的做法）—— 進 repo 的是它導出的 policy 與測試。

### 3.2 `ControlTest`（US-2）— `schema.prisma` + migration

- 欄位照 `02a:225`：`control_id` · `scheduled_for` · `performed_at` · `tester_user_id` ·
  `reviewer_user_id` · `conclusion`，加 §1.1 base fields
- `status`: `ControlTestStatus { scheduled, in_progress, passed, partial, failed }`（`02a` §4 五態）。
  **不建 `result`** —— 見 Scope decision (b)，並在 docstring 記錄這是對 `02a:225` 的判定
- `ref_code` 前綴 `CTST-<ENTITY_CODE>-<seq>`（自宣告，同 W06 對 `CTRL-` 的處理）
- per-command policies（ADR-0014 形狀）：`FOR SELECT` / `FOR INSERT` / `FOR UPDATE`，**無 `FOR DELETE`**
- 跨實體引用防護：**依 M1/M2 結果決定**（trigger 或 FK 已足夠）

### 3.3 `Evidence`（US-3）— `schema.prisma` + migration

- 欄位照 `02a:227`：`kind` · `uri_or_blob_ref` · `hash` · `collected_at` · `linked_type` + `linked_id`
- `linked_type`: enum **只有 `control_test`**（Scope decision (a)）
- 跨實體引用防護：**沒有 FK 可用**，必然需要 trigger 或明確記錄的偏離

### 3.4 `extension_fields` per-command 拆分（US-4）— migration

`FOR ALL` → `FOR SELECT`（維持寬，group 列人人可讀）+ `FOR INSERT` + `FOR UPDATE`
（兩者都排除 `IS NULL`）。**DELETE 已由缺少 GRANT 擋住**，不補 policy。
驗收：一個「把 group 列的 `org_entity_id` 改成自己」的測試，在修補前**必須是紅的**。

### 3.x 明確不做的事

- **`Issue`** —— `02a` §4 的 `Failed → raises Issue` 那條邊沒有目標表；建 Issue 是另一片
- **`Attestation` / `Assessment`** —— Evidence 的另外兩個 linked_type 的目標
- **review transition 與 SoD 強制** —— `02a:416` 明寫在 transition，而端點是 create-only
- **`Control.effectiveness` 派生** —— 沒有觸發點
- **FORCE RLS 的全表補齊** —— 若 D-force 顯示是無意的，記 AD，不在本 phase 追改 4 張既有表

### 3.y Validation（US-1..US-5）

Gates: lint · type-check · test · build clean · `run_all` 6/6 · coverage 不低於 Day-0 baseline
（低於就先歸因再補，W06 的做法）。
加上 §3.z 的 **API-level 驗證 + 元驗證**。⚪ 無 UI → **不寫 drive-through PASS**，寫
**「API-level verified（gate + 真進程 + 真 PostgreSQL），無 UI，不主張可用性」**。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT（+2 model +2 enum；更正 `:448-449`）|
| 2 | `apps/api/prisma/migrations/<ts>_control_test_and_evidence/migration.sql` | NEW |
| 3 | `apps/api/prisma/migrations/<ts>_extension_fields_per_command/migration.sql` | NEW |
| 4 | `apps/api/src/core-model/control-test.repository.ts` | NEW |
| 5 | `apps/api/src/core-model/control-test.repository.spec.ts` | NEW |
| 6 | `apps/api/src/core-model/evidence.repository.ts` | NEW |
| 7 | `apps/api/src/core-model/evidence.repository.spec.ts` | NEW |
| 8 | `apps/api/src/core-model/scoped-client.types.ts` | EDIT |
| 9 | `apps/api/src/modules/control-test/control-test.controller.ts` | NEW |
| 10 | `apps/api/src/modules/control-test/control-test.module.ts` | NEW |
| 11 | `apps/api/src/modules/control-test/control-test.controller.spec.ts` | NEW |
| 12 | `apps/api/src/modules/control-test/control-test.int.spec.ts` | NEW |
| 13 | `apps/api/src/modules/evidence/evidence.controller.ts` | NEW |
| 14 | `apps/api/src/modules/evidence/evidence.module.ts` | NEW |
| 15 | `apps/api/src/modules/evidence/evidence.controller.spec.ts` | NEW |
| 16 | `apps/api/src/modules/evidence/evidence.int.spec.ts` | NEW |
| 17 | `apps/api/src/app.module.ts` | EDIT |
| 18 | `apps/api/test/int-global-setup.js` | EDIT |
| 19 | `apps/api/src/modules/risk/risk.int.spec.ts` | EDIT（11b carryover）|
| 20 | `apps/api/src/core-model/extension-validator.spec.ts` 或 int | EDIT（US-4 的紅→綠案例）|
| 21 | `docs/02-architecture/02a-data-model-spec.md` | EDIT（`:225` 的 `result` 判定 · D-index 更正）|
| 22 | `docs/02-architecture/design-notes/W07-*.md` | NEW（spike gate）|
| 23 | `docs/03-implementation/changes/CH-022-w07-control-test-and-evidence.md` | NEW |
| 24 | `docs/01-planning/W07-*/progress.md` · `retrospective.md` | NEW |
| 25 | `docs/01-planning/BACKLOG.md` · `ROADMAP.md` | EDIT（含 detector 的再延登記）|
| 26 | `docs/01-planning/CALIBRATION-MATRIX.md` · `CALIBRATION-LOG.md` | EDIT |
| 27 | `CLAUDE.md` · `MEMORY.md` + `memory/project_w07_*.md` | EDIT / NEW |
| — | `apps/api/src/entity-scope/entity-scope.resolver.ts` | **UNTOUCHED** |
| — | `apps/api/src/modules/control/` · `asset/` | **UNTOUCHED** |
| — | `docs/14-adr/` | **UNTOUCHED**（除非 M1-M3 迫出一個會約束後續 27 張表的選擇）|

## 5. Acceptance Criteria

1. M1 / M2 / M3 三個問題各有**實測答案**寫進 progress.md，含 SQLSTATE 與判定是哪一層擋的
2. `control_tests` · `evidence` 兩張表存在，各有 per-command policies（無 `FOR DELETE`）
3. 兩張表各通過四個範疇測試：跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 / 滾升角色只見授權子樹
4. 跨實體**引用**（`control_id` / `linked_id` 指向不可見的父列）被拒，且拒絕來自**資料庫層**
5. `extension_fields` 的 group 列奪取測試：修補前紅、修補後綠
6. `risks` int 11b 改為不產生 `RETURNING`，且在 `WITH CHECK` 中性化下**會紅**
7. **元驗證**：每個新增的擋阻機制各中性化一次，對應測試轉紅（零轉紅 = 該機制沒被測到，必須查）
8. ⚪ **API-level verified**（真進程 + 真 PostgreSQL 走兩組端點）—— **不是** drive-through，
   報告措辭不得暗示可用性
9. 逐任務實際分鐘數逐日記入 progress.md（`AD-CalibrationNoActual-1` 的執行面）
10. `CH-022` + design note（8-point gate）CLOSED；calibration 已記錄；導航檔 + BACKLOG + ROADMAP 已更新

## 6. Deliverables

- [ ] US-1 三個量測問題的實測答案 + 由結果導出的機制選擇
- [ ] US-2 `ControlTest` 表 + `/control-tests` 端點 + 四個範疇測試
- [ ] US-3 `Evidence` 表 + `/evidence` 端點 + 四個範疇測試 + 多型連結的範疇防護
- [ ] US-4 `extension_fields` per-command 拆分 + 奪取測試（紅→綠）
- [ ] US-5 元驗證：逐機制中性化紀錄
- [ ] US-6 closeout 全套

## 7. Workload Calibration

- Scope class **`spike` 0.65**（Read `CALIBRATION-MATRIX.md:55`；這會是第 **5** 個資料點，
  但**同單位的有效點仍只有 W04 的 0.81** —— W06 因跨夜污染無有效 actual）。
  歸為 spike 而非 `pattern-reuse-feature` 的理由：兩張表的 CRUD 確實是抄 W06，
  但**關掉跨實體引用的機制在本專案沒有藍本** —— 複合 FK 結構上不可用，
  多型連結連 FK 都沒有。這是新領域，不是複製。
- **Agent-delegated: `no`**（範疇語義的判斷不外包 —— W06 的教訓是量測與判定必須自己做）。
  `agent_factor` 1.0 → **三段式**。
- Bottom-up est ~19.75 hr（Day 0 verify 0.75 · 量測 2.0 · ControlTest 表 2.5 · ControlTest
  repo+controller 2.0 · Evidence 表 2.0 · Evidence repo+controller 2.0 · int 測試 2.5 ·
  extension_fields 1.0 · risks 11b 0.5 · Day 3 驗證+元驗證 2.0 · closeout 2.5）
  → class-calibrated commit **~12.8 hr** (mult 0.65)。Day-4 retro Q2 驗證。
- ⚠️ **本 phase 必須產出有效 actual** —— 逐任務分鐘數逐日記錄；跨夜時 branch 上第一個 commit
  到 closeout commit 的窗口要扣掉睡眠段並在 progress.md 註明。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **量測結果推翻設計**（例如 RI 檢查不繞過 RLS，trigger 是多餘的）| 這是量測的目的，不是風險 —— Day 1 先量再設計，§3.2/3.3 的防護欄刻意寫成「依結果決定」|
| **trigger 的 `SECURITY INVOKER` 在 RLS 下看不到父列 → 合法寫入被誤擋** | 量測 M2（group control）必須在寫 trigger 之前跑；group 列的可見性是 `controls_read` policy 的寬側，需確認 trigger 看得到 |
| **零轉紅假象**（W06 N4/N5 踩過）| 中性化前先確認 anchor 在中性化前後**逐字不同**；零轉紅一律先查 `pg_policies` / `pg_trigger` 證實編輯生效，再下結論 |
| **`RETURNING` 遮蔽**（W06 發現）| 所有「繞開發號的直接寫入」測試一律不得產生 `RETURNING`（用 `createMany` 或 raw），驗收是中性化後會紅 |
| Risk Class C — 陳舊 dev server 掩蓋 wiring 修正 | Day 3 §3.1 乾淨重啟，驗證「活著的服務程序」而非 port 擁有者 PID |
| Risk Class A — 測試間 singleton 汙染 | 沿用既有 int 測試的 per-suite 重置 |
| **CRLF 污染**（W06 踩過，錯的數字進了三份文件）| 一律用 Write/Edit 工具寫檔，不用 python `write_text`；`git add` 的警告不得忽略 |
| **範圍蔓延** —— US-4 是順帶的 | 它是**活著的隔離缺陷**（約束 8）故納入；若 Day 2 發現它比預估大，切掉並記 AD，不擠壓 US-1-3 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- `Issue` · `Action`（CAPA）· `Attestation` · `Assessment` — slice 5+
- `StatementOfApplicability` · `Framework` · `Risk ↔ Control` 連結 — slice 5+（M7 前）
- **`AD-DesignNoteAnchor-1` 的 detector — 明確再延**（使用者 2026-08-12 裁決）。
  ⚠️ 再延的登記**不寫在 BACKLOG 備註欄** —— 那正是這條 AD 這次被抓到的失效形狀
  （「slice 3 處理」寫在備註欄，而 W06 就是 slice 3，沒有人回頭看）。
  改為在 **`ROADMAP.md` 主線加一列 ⬜**，理由見 ROADMAP §為什麼 2026-08-10 才啟用（AD-5：
  有解封條件的項目必須出現在一份會被讀的清單上）。BACKLOG 那句改成指向 ROADMAP。
- **FORCE RLS 的一致性** — 若 D-force 顯示既有 4 張表是無意漏掉，記 AD 供後續統一處理
- `AD-SilentFieldDrop-1`（server-owned 欄位被靜默丟棄的策略）— 未拍板，本 phase 沿用 W06 現狀
