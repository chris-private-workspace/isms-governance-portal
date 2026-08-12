---
status: active   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W08 Plan — Issue + Action，與父表接受錨點時的分流驗收

**Summary**: 交付 M1 slice 5 —— `Issue` + `Action`（CAPA）兩張表與 `/issues`、`/actions`
兩組端點（14/35 實體，Day 0 機械導出後確認）。它關掉 W07 留下的懸邊：`02a:392-393` 的
`Failed / Partial → raises Issue` 至今**沒有目標表**。核心不是第 13、14 張表，而是
**第一次驗證 W07 design note 的 D1 判準會真的分流** —— `Issue` 是本專案自己的父表、
沒有 M7 連結表的約束，所以它**能**給 `@@unique([id, org_entity_id])`，於是 `Action → Issue`
應走 D1 **選項 B（複合 FK）**而非選項 D（trigger）。⚠️ 一個判準若永遠導出同一個答案，
它就不是判準；本 phase 是它第一次可能導出**不同**答案的場合，所以要驗，不要假設。
同時 Day 0 順帶交付 `AD-EntityCountDerivation-1` + `AD-EntityIndexIncomplete-1` 的
**結構性解法**（實體計數 detector，`run_all` 6/6 → 7/7）——使用者 2026-08-12 裁決，不單開 CH。
⚪ **無 UI → API-level verified**，不做 drive-through、不暗示可用性。
**feature-continuation class → 不產出 design note**（理由見 §1）。

**Status**: **Approved-to-execute**（使用者 2026-08-12 —— 範圍裁決 slice 5 = `Issue` + `Action`；
`RefCodeCounter` 明記為刻意排除 → Scope decision (f)；approve 後開 Day 0）

**Branch**: `feature/W08-issue-and-action`
**Base**: `main` HEAD `edb5853`（審計 #3 的收尾 commit，PR #46 merged；Day 0 §0.2 實測確認）
**Slice**: M1 slice 5 / N（前一片 W07 = slice 4）。關掉 `AD-EntityCountDerivation-1`、
`AD-EntityIndexIncomplete-1`；驗收 W07 design note D1 的分流判準
**Scope decisions**（(a)-(e) 由設計文件與既有先例導出；(f) 由使用者 2026-08-12 裁決）:
(a) `Action → Issue` 走**複合 FK**（D1 選項 B），**不用** trigger —— `Issue` 沒有 `Control` 那個
    「M7 連結表要讓兩側 entity 不同」的約束，所以它給得起錨點。**但必須中性化驗收**：
    移掉複合 FK 後跨實體引用測試要轉紅，否則就是 `AD-BorrowedRefusal-1` 第 4 次
(b) `Issue.source` **只建 `test` + `manual` 兩個值** —— `02a:229` 另列 assessment / audit /
    incident，三張表都不存在（ADR-0014 砍 `subtree`、W07 砍 `Evidence.linked_type` 的同一判準）
(c) ⛔ **不建 `source_id`** —— `02a:229` 的 `source` 是**沒有配對 id 欄位的裸 enum**，
    所以「`ControlTest` raises `Issue`」這條邊在資料層**追不回去**。這是規格缺口不是實作選擇；
    發明一個 `source_id` 就是自行發明欄位（已確認參數 #9）→ 登記 AD，本 phase 照規格建
(d) **「Remediated 之前需 ≥1 個 Action」不強制**（`02a:409`）—— 那是 transition 規則，
    而端點是 create-only，沒有 transition（同 W07 對 SoD 的處理）
(e) **`ControlTest` 終態自動建 `Issue` 不做** —— 那是 workflow（M5），不是資料模型
(f) **`RefCodeCounter` 明記為刻意排除**（使用者 2026-08-12 裁決）—— ⚠️ **理由於 Day 0 更正**：
    起草時寫的「它沒有 `org_entity_id`」是**錯的**（`schema.prisma:184` 有，docstring `:174`
    明寫 Entity-scoped ON PURPOSE，見 progress.md `D-refcounter`）。正確判準是它**沒有 §1.1
    base fields**（無 `id`／`ref_code`／`status`／`owner_user_id`／`version`／`extensions`／
    `retired_at`；主鍵是 `@@id([orgEntityId, entityType])`），且它是**發** `ref_code` 的機制
    而非**被發**的記錄。`02a` §0 加一個**明文 excluded 清單**，detector 讀它；分母不含它。
    ⚠️ 白名單列名字**不用 pattern** —— pattern 會讓未來真的漏掉一張領域表也不報紅，
    那就是把 `AD-EntityIndexIncomplete-1` 換個地方重演

---

## 0. Background

### The gap（`AD-EntityCountDerivation-1` · `AD-EntityIndexIncomplete-1` + W07 的懸邊）

- `02a` §4 的 ControlTest lifecycle 有兩條邊指向 `Issue`（`:392` `:393`），而 **`Issue` 表不存在**。
  W07 plan §3.x 明文把它排到 slice 5：「`Failed → raises Issue` 那條邊沒有目標表」。
- `Issue` / `Action` 在 `02a` §0 被標為「**Shared by every module that raises findings**」——
  它不是某個模組的表，是 foundation。今天每個會產生 finding 的模組（assessment / test /
  audit / incident）都沒有地方放它的 finding。
- **實體計數是手寫的**，所以每份文件都不一樣（`AD-EntityCountDerivation-1`）。2026-08-12
  已把兩個活面改成 12/35，但那**仍然是人算的，只是算對了** —— 沒有任何東西在守。
- **索引宣稱自己完整而事實上不完整**（`AD-EntityIndexIncomplete-1`）：`RefCodeCounter` 在
  `schema.prisma:183` 但不在 `02a` §0 上，而該索引第一句寫「Nothing is buildable that is not
  on this list; adding an entity means adding a row here **in the same change**」。

### Why it matters（缺失的能力）

前兩點：**沒有 `Issue` 就沒有「發現 → 處置 → 驗證」的閉環**。控制測試可以失敗，但失敗之後
沒有任何記錄能承接它；CAPA 是 ISO 27001 的必要能力（`02a` §0 把 `Issue`/`Action` 放在
shared core 而非模組本地，正是因為每個模組都要用它）。

後兩點是同一個問題的兩面：**「M1 完成了多少」這個問題今天沒有機械答案**。分母（35）與
分子（12）都是人算的，而 M1 的 DoD 是「Core entities & relationships from `02` migrated」——
一個無法機械回答的 DoD 在收尾時只能靠宣稱。⚠️ 起草本 plan 時手數 `02a` §0 得到
**23 + 9 + 4 = 36**，而 BACKLOG 記的分母是 **35（23+8+4）** —— **分母本身可能也是錯的**，
見 §STALE `D-denominator`。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `edb5853`）| Anchor |
|-------|--------------------------------------------|--------|
| 懸邊無目標表 | ControlTest lifecycle 兩條終態邊寫 `raises Issue`，`Issue` 不存在 | `docs/02-architecture/02a-data-model-spec.md:392-393` |
| `Issue` 規格 | `title` · `source`(enum) · `severity` · `description` · `due_date` —— **無 source_id** | `02a:229` |
| `Action` 規格 | `issue_id`(FK) · `description` · `assignee_user_id` · `due_date` · `completed_at` · `verified_by` | `02a:231` |
| 父表可否給錨點 | `controls` 明文拒絕（M7 連結表）；`asset_groups` / `assets` **給了** | `schema.prisma:892-896` vs `:653` `:712`（Day-1 校準後）|
| 既有的複合 FK 藍本 | `assets.(asset_group_id, org_entity_id)` → `asset_groups` | `migrations/20260811024841_asset_and_risk_chain/migration.sql` |
| 既有的 trigger 形狀 | `assert_parent_in_scope()`，`BEFORE INSERT OR UPDATE` + `SECURITY INVOKER` | W07 migration · `design-notes/W07-cross-entity-references.md` §1 D1 |
| 計數無機械來源 | 6 個 detector，無一比對 `schema.prisma` 與 `02a` §0 | `scripts/lint/*.py`（`check_doc_links` / `check_path_references` / `check_rules_hygiene` / `check_status_markers` / `check_mockup_fidelity` / `check_workflow_placeholders`）|
| 索引不完整 | `RefCodeCounter` 在 schema 不在索引 | `schema.prisma:183` vs `02a:21-61` |

→ `Issue`/`Action` 的表結構本身**完全有藍本**（W05 的複合 FK + ADR-0014 的 per-command policy），
所以本 phase 的風險不在「做不出來」，而在**做出來之後宣稱的東西沒有被證明**：
複合 FK 是否真的是那個擋住跨實體引用的東西，以及計數 detector 是否真的會 fail。

### The design（`Issue（可錨定的父表）+ Action（複合 FK 子表）+ 計數 detector`）

```
Day 0  detector: schema.prisma 的 ^model  ∩  02a §0 索引  → 對不上就 fail
       RefCodeCounter 的處置：明記為「基礎設施表、非領域實體、刻意不入索引」
       （提議 —— 另一個合法選項是補一列；使用者可否決）
       ⚠️ detector 必須自帶負面案例：塞一個假 model 進 fixture → 它要紅

Day 1  Issue   model + migration + per-command policies + @@unique([id, org_entity_id])
       Action  model + migration + per-command policies + 複合 FK → issues(id, org_entity_id)
       repository × 2（藍本：control-test.repository.ts）

Day 2  controller + module × 2（藍本：modules/control-test/）
       int spec × 2（藍本：control-test.int.spec.ts）—— 各四個範疇測試
       ⭐ 加一條「繞開發號、不產生 RETURNING 的直接寫入」（W05/W06/W07 三次的教訓）

Day 3  真進程 + 真 PostgreSQL 走兩組端點（API-level）
       元驗證：(1) 移掉 Action 的複合 FK → 跨實體引用測試必須轉紅
               (2) 中性化 issues / actions 各自的 WITH CHECK → 對應測試各轉紅
               (3) detector 的假 model fixture → 必須紅
```

**為什麼 `Action → Issue` 用複合 FK 而不是照抄 W07 的 trigger**：W07 design note D1 的選項 B
被否決的理由是**結構性的**（「`controls` 明文拒絕錨點」），不是「複合 FK 比較差」。
`Issue` 沒有那個約束 —— 它不參與任何 M:N 連結表，`Action` 是它唯一的子表。
照抄 trigger 會多一層動態查詢成本（W07 design note §4 明記該成本**未量**），
換來的是零額外保證。⚠️ **但這條推理必須被中性化驗收檢驗** —— 三次 `AD-BorrowedRefusal-1`
的共同教訓是：機制在、測試綠，不代表綠的是這個機制。

### Ground truth（recon head-start —— 於 `main` HEAD `edb5853` 讀過的 code）

- `docs/02-architecture/02a-data-model-spec.md:229` — Issue 欄位清單（裸 `source` enum）
- `docs/02-architecture/02a-data-model-spec.md:231` — Action 欄位清單
- `docs/02-architecture/02a-data-model-spec.md:372-383` — Issue lifecycle（7 態，含 RiskAccepted）
- `docs/02-architecture/02a-data-model-spec.md:398` — Action lifecycle（Open → InProgress → Completed → Verified）
- `docs/02-architecture/02a-data-model-spec.md:409` — `Issue → Action` 1:N，Remediated 前需 ≥1
- `docs/02-architecture/02a-data-model-spec.md:127` — Issue severity: low · medium · high · critical
- `docs/02-architecture/02a-data-model-spec.md:126` — Test result fail/partial → raises an Issue
- `apps/api/prisma/schema.prisma:622` · `:653` — AssetGroup 與它的複合錨點（Day-1 校準後）
- `apps/api/src/core-model/control-test.repository.ts` — 兩個 repository 的藍本
- `apps/api/src/modules/control-test/` — 兩個 module 的藍本
- `scripts/lint/check_status_markers.py` — detector 的藍本（含 self-test 不在旗標後面的形狀）

**Baselines（W07 closeout）**: unit **235 / 23 suites** · int **105 / 8 suites** ·
web **10** · coverage **92.58 / 92.32 / 96.26 / 94** · lint **0/0** · build ✅×2 ·
`run_all` **6/6** · `lint:negative` PASS（35 檔 0 bypass 3 allowlisted）。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-denominator** — 手數 `02a` §0 得 23+9+4 = **36**，BACKLOG 記 **35**（23+8+4）
  → detector 的第一個產出就是回答這個；分母若真是 36，兩個活面的 12/35 要一併更正
- **D-refcounter** — ✅ **已定案（使用者 2026-08-12）：明記排除**，見 Scope decision (f)。
  Day 0 剩下的是執行面 —— grep `schema.prisma` 確認**還有沒有第二張**同類的基礎設施表
  （若有，白名單一次列全，不要每張表各判一次）
- **D-source** — `02a:229` 的 `source` 無配對 id 欄位；確認 `02a` 其他章節（§5 關係規則）
  是否另有規定 → 若真的沒有，登記 AD 並在 docstring 記錄這是規格缺口不是遺漏
- **D-verifiedby** — `02a:231` 的 `verified_by` 未標型別；§1.1 的 `created_by` 是 UUID
  → 確認是否有其他章節定義，沒有就按 UUID FK → User 建並記錄推斷依據
- **D-issuestatus** — `02a:372-383` 的 Issue lifecycle 含 `RiskAccepted`，而 `Risk` 表已存在
  → 確認該狀態是否需要指向 `risks` 的欄位（若需要而規格沒有，同 D-source 處理）
- **D-baselines** — 上列 W07 數字逐項實測重驗（⚠️ 逐 workspace 分開跑，**不得用 `tail`** ——
  `AD-GrepAssertion-1` (d)）

## 1. Phase Goal

交付 `Issue` 與 `Action` 兩張表與其寫入端點，關掉 `02a` §4 至今沒有目標表的兩條 lifecycle 邊；
並**用中性化驗收證明**跨實體引用的防護來自複合 FK 而非上游代勞 —— 這是 W07 design note
D1 判準第一次可能導出「選項 B」的場合，判準的價值取決於它會不會分流。
同時交付實體計數的**結構性解法**（detector），讓「M1 完成了多少」從人算變成機械導出。
⚪ 無 UI，故驗證止於 API-level，報告**不得暗示可用性**。
**不產出 design note** —— 依 `task-workflow.md` §Step 5.5，本 phase 是 feature continuation
（擴充已驗證的範疇、複用 W05 的複合 FK 與 ADR-0014 的 policy 形狀），不是 spike。
D1 分流的驗收結果**追加到 W07 design note**（它是活參考，明寫供 slice 2..N 複製），
⚠️ 追加須遵守 `AD-MdAnchorLineShift-1`：**不得改變該檔行數**（同行追加）。
不預期產出 ADR —— 若 Day 1 發現複合 FK 在此形狀下不成立，則需要一份約束後續 21 張表的選擇。

## 2. User Stories

- **US-1**（計數）: 作為維護者，我希望「M1 建了幾個實體」由 `schema.prisma` 與 `02a` §0
  機械導出，以便這個數字不再需要有人記得同步四份文件。
- **US-2**（Issue）: 作為第二道防線，我希望登記一筆 finding 並標明它的來源與嚴重度，
  以便控制測試失敗後有地方承接，而不是止於一個 `failed` 狀態。
- **US-3**（Action）: 作為 issue 負責人，我希望在一筆 issue 底下開立矯正措施並指派負責人，
  以便 CAPA 的「發現 → 處置」有可追蹤的記錄。
- **US-4**（分流驗收）: 作為 reviewer，我希望知道擋住 `Action` 跨實體引用的**確實是**複合 FK，
  以便 W07 的 D1 判準是一個會分流的判準，而不是一句沒有反例的話。
- **US-5**（元驗證）: 作為 reviewer，我希望每個宣稱會擋東西的機制都被中性化過一次，
  以便「全綠」是有內容的。
- **US-6**（closeout）: `CH-023` + retrospective + calibration + 導航檔。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   scripts/lint/check_entity_index.py            — schema.prisma ∩ 02a §0
NEW   scripts/lint/__fixtures__/entity-index-drift/  — detector 的負面案例
NEW   apps/api/prisma/migrations/<ts>_issue_and_action/migration.sql
NEW   apps/api/src/core-model/issue.repository.ts   (+ .spec.ts)
NEW   apps/api/src/core-model/action.repository.ts  (+ .spec.ts)
NEW   apps/api/src/modules/issue/{controller,module}.ts  (+ .controller.spec.ts, .int.spec.ts)
NEW   apps/api/src/modules/action/{controller,module}.ts (+ .controller.spec.ts, .int.spec.ts)
EDIT  apps/api/prisma/schema.prisma          — 2 model + 3 enum
EDIT  apps/api/src/core-model/scoped-client.types.ts — +2 介面
EDIT  apps/api/src/bootstrap/app.module.ts   — 掛 2 個 module
EDIT  apps/api/test/int-global-setup.js      — 種入跨範疇 fixture
EDIT  scripts/lint/run_all.py                — 收錄第 7 個 detector
EDIT  docs/02-architecture/02a-data-model-spec.md — RefCodeCounter 處置（⚠️ 不得改變行數）
UNTOUCHED apps/api/src/entity-scope/         — 本 phase 不動 resolver
UNTOUCHED apps/api/prisma/migrations/<既有 8 個> — 不編輯已套用的 migration（AD-MigrationChecksum-1）
```

### 3.1 實體計數 detector（US-1）— `scripts/lint/check_entity_index.py`

- 來源 A：`schema.prisma` 的 `^model (\w+)`
- 來源 B：`02a` §0 四張表格裡的實體名（含 `Not yet specified` 一節 —— 它們**在索引上但不可建**）
- 規則：`A \ B` 非空即 **fail**（schema 有而索引沒有 = `AD-EntityIndexIncomplete-1` 的形狀）；
  索引另設一個明文的 **excluded** 清單，`RefCodeCounter` 進去（Scope decision，見 D-refcounter）
- 輸出：`built N / total M`，讓 `CLAUDE.md` 與 `ROADMAP.md` 的那格有機械來源
- ⛔ **必須自帶負面案例**（`AD-NegativeGate-1`）：fixture 加一個不在索引上的假 model，
  detector 對它必須 fail。self-test **不放在旗標後面**（W02 的做法）

### 3.2 `Issue`（US-2）— `schema.prisma` + migration

- 欄位照 `02a:229`：`title` · `source` · `severity` · `description` · `due_date`，加 §1.1 base fields
- `source`: `IssueSource { test, manual }`（Scope decision (b)）
- `severity`: `IssueSeverity { low, medium, high, critical }`（`02a:127`）
- `status`: `IssueStatus { open, in_progress, remediated, verified, closed, risk_accepted }`（`02a:372-383`）
- `ref_code` 前綴 `ISSU-<ENTITY_CODE>-<seq>`（自宣告，同 W06/W07）
- **`@@unique([id, org_entity_id])`** —— 它是本專案第三張給出複合錨點的父表；
  docstring 要寫**為什麼它給得起而 `controls` 給不起**
- per-command policies（ADR-0014 形狀）：`FOR SELECT` / `FOR INSERT` / `FOR UPDATE`，**無 `FOR DELETE`**

### 3.3 `Action`（US-3）— `schema.prisma` + migration

- 欄位照 `02a:231`：`issue_id` · `description` · `assignee_user_id` · `due_date` ·
  `completed_at` · `verified_by`（型別待 D-verifiedby 確認）
- `status`: `ActionStatus { open, in_progress, completed, verified }`（`02a:398`）
- `ref_code` 前綴 `ACTN-<ENTITY_CODE>-<seq>`
- **複合 FK**：`FOREIGN KEY (issue_id, org_entity_id) REFERENCES issues(id, org_entity_id)`
  —— D1 選項 B，藍本 `assets → asset_groups`
- per-command policies 同 §3.2

### 3.4 分流驗收（US-4）— int spec

三個測試，**缺一不可**：

1. 跨實體引用被拒（`issue_id` 指向另一個 entity 的 issue）→ 期望 `23503`
2. 同一個測試在**移掉複合 FK** 後**轉綠**（= 擋住的確實是它）
3. 一條**繞開 `issueRefCode` 發號、不產生 `RETURNING`** 的直接寫入
   —— W05 借 counter、W06 借 `RETURNING`、W07 借 trigger，三次代勞者都不同

### 3.x 明確不做的事

- **`source_id`** —— Scope decision (c)。規格缺口，登記 AD，不發明欄位
- **`Issue.status = risk_accepted` 與 `risks` 的關聯欄位** —— 同上，除非 D-issuestatus 找到規格
- **「Remediated 前需 ≥1 Action」的強制** —— transition 規則，M5
- **`ControlTest` 終態自動建 Issue** —— workflow，M5
- **`audit_log`** —— ADR-0003 未拍板（OQ-4）；本 phase 再新增**兩條無稽核寫入路徑**（記入 R4）
- **`AD-DualLayerHighRisk-1`** —— 已解封但第一步是「定義第二層抓什麼 RLS 抓不到的東西」，
  沒有那個定義就實作，交付的仍然是註解
- **`CH-022:190` 的「8 → 10 / 35」** —— 已 merge 的歷史快照，改它是另一個決定

### 3.y Validation（US-1..US-5）

Gates: lint · format:check · type-check · test · build clean · `run_all` **7/7**（新 detector）·
`lint:negative` PASS · coverage 不低於 Day-0 baseline。
⚠️ **逐 workspace 分開跑取真退出碼，不用 `tail`**（`AD-GrepAssertion-1` (d)）。
加上 §3.4 的分流驗收與 §checklist Day 3 的元驗證。
⚪ 無 UI → **不寫 drive-through PASS**，寫
**「API-level verified（gate + 真進程 + 真 PostgreSQL），無 UI，不主張可用性」**。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `scripts/lint/check_entity_index.py` | NEW |
| 2 | `scripts/lint/__fixtures__/entity-index-drift/schema-with-orphan.prisma` | NEW |
| 3 | `scripts/lint/run_all.py` | EDIT（6 → 7）|
| 4 | `apps/api/prisma/schema.prisma` | EDIT（+2 model +3 enum）|
| 5 | `apps/api/prisma/migrations/<ts>_issue_and_action/migration.sql` | NEW |
| 6 | `apps/api/src/core-model/issue.repository.ts` | NEW |
| 7 | `apps/api/src/core-model/issue.repository.spec.ts` | NEW |
| 8 | `apps/api/src/core-model/action.repository.ts` | NEW |
| 9 | `apps/api/src/core-model/action.repository.spec.ts` | NEW |
| 10 | `apps/api/src/core-model/scoped-client.types.ts` | EDIT |
| 11 | `apps/api/src/modules/issue/issue.controller.ts` | NEW |
| 12 | `apps/api/src/modules/issue/issue.module.ts` | NEW |
| 13 | `apps/api/src/modules/issue/issue.controller.spec.ts` | NEW |
| 14 | `apps/api/src/modules/issue/issue.int.spec.ts` | NEW |
| 15 | `apps/api/src/modules/action/action.controller.ts` | NEW |
| 16 | `apps/api/src/modules/action/action.module.ts` | NEW |
| 17 | `apps/api/src/modules/action/action.controller.spec.ts` | NEW |
| 18 | `apps/api/src/modules/action/action.int.spec.ts` | NEW |
| 19 | `apps/api/src/bootstrap/app.module.ts` | EDIT |
| 20 | `apps/api/test/int-global-setup.js` | EDIT |
| 21 | `docs/02-architecture/02a-data-model-spec.md` | EDIT（RefCodeCounter 處置 —— **不得改變行數**）|
| 22 | `docs/02-architecture/design-notes/W07-cross-entity-references.md` | EDIT（D1 分流結果，同行追加）|
| 23 | `docs/03-implementation/changes/CH-023-w08-issue-and-action.md` | NEW |
| 24 | `docs/01-planning/W08-m1-issue-and-action/progress.md` · `retrospective.md` | NEW |
| 25 | `docs/01-planning/BACKLOG.md` · `ROADMAP.md` | EDIT |
| 26 | `docs/01-planning/CALIBRATION-MATRIX.md` · `CALIBRATION-LOG.md` | EDIT |
| 27 | `docs/01-planning/RISK_REGISTER.md` | EDIT（R4：無稽核寫入路徑 10 → 12 張表）|
| 28 | `CLAUDE.md` · `MEMORY.md` + `memory/project_w08_*.md` | EDIT / NEW |
| — | `apps/api/src/entity-scope/entity-scope.resolver.ts` | **UNTOUCHED** |
| — | `apps/api/src/modules/control-test/` · `evidence/` | **UNTOUCHED** |
| — | `apps/api/prisma/migrations/<既有 **10** 個>` | **UNTOUCHED**（`AD-MigrationChecksum-1`；Day-0 更正：起草寫 8）|
| — | `docs/14-adr/` | **UNTOUCHED**（除非 Day 1 推翻複合 FK）|
| — | `.github/workflows/` | **UNTOUCHED**（`run_all.py` 已被 CI 呼叫，不需改 workflow）|

## 5. Acceptance Criteria

1. `check_entity_index.py` 存在、被 `run_all.py` 收錄（**7/7**）、**且對 fixture 裡的孤兒 model 會 fail**
2. `RefCodeCounter` 的處置已寫進 `02a` §0（明記排除或補一列），且該檔**行數未變**
3. 實體計數的分子與分母**由 detector 印出**；若與現行的 12/35 不符，兩個活面一併更正
4. `issues` · `actions` 兩張表存在，各有 per-command policies（無 `FOR DELETE`）
5. 兩張表各通過四個範疇測試：跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 / 滾升角色只見授權子樹
6. `Action` 的跨實體引用（`issue_id` 指向不可見的 issue）被拒，**且拒絕來自複合 FK** ——
   移掉它之後該測試轉綠（§3.4 測試 2）
7. 有一條繞開發號、不產生 `RETURNING` 的直接寫入測試，且在 `WITH CHECK` 中性化下**會紅**
8. **元驗證**：每個新增的擋阻機制各中性化一次，對應測試轉紅（零轉紅 = 該機制沒被測到，必須查）
9. ⚪ **API-level verified**（真進程 + 真 PostgreSQL 走兩組端點）—— **不是** drive-through，
   報告措辭不得暗示可用性
10. 逐任務實際分鐘數逐日記入 progress.md，**每個時間區段兩端都有可觀察錨點**
    （`date` 輸出或 commit 時間戳）；無閉合錨點的區段標 `~est` 且**不進 calibration**
    （`AD-EstimateAsMeasurement-1`）
11. `CH-023` CLOSED；calibration 已記錄；導航檔 + BACKLOG + ROADMAP + RISK_REGISTER 已更新

## 6. Deliverables

- [ ] US-1 `check_entity_index.py` + 負面 fixture + `run_all` 7/7 + `RefCodeCounter` 處置
- [ ] US-2 `Issue` 表 + `/issues` 端點 + 四個範疇測試
- [ ] US-3 `Action` 表 + `/actions` 端點 + 四個範疇測試 + 複合 FK 引用防護
- [ ] US-4 D1 分流驗收：移掉複合 FK 後測試轉綠的紀錄
- [ ] US-5 元驗證：逐機制中性化紀錄
- [ ] US-6 closeout 全套

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（Read `CALIBRATION-MATRIX.md:54`；這會是第 **2**
  個資料點，⚠️ 第 1 個（W05）**定義受污染**，見 `AD-CalibrationMetric-2` —— 兩點不構成窗口）。
  歸為 pattern-reuse 而非 `spike` 的理由：兩張表的複合 FK 形狀由 W05 定死、per-command policy
  由 ADR-0014 定死、repository / controller / int spec 由 W06-W07 定死，寫的是**差異**不是全部。
  唯一沒有完整藍本的是 detector，而 `scripts/lint/` 已有 6 個同構的檔。
- **Agent-delegated: `no`**（範疇語義與中性化判定不外包 —— W06/W07 的教訓）。
  `agent_factor` 1.0 → **三段式**。
- Bottom-up est **~9.5 hr**，逐項標藍本（`AD-BottomUpBlueprint-1` 要求）：
  Day 0 verify 0.5【有藍本】· detector + fixture 0.75【半藍本】· `Issue` 表 1.0【有藍本】·
  `Action` 表 0.75【有藍本】· issue repo+spec 0.75【有藍本】· action repo+spec 0.75【有藍本】·
  issue controller+module 0.5【有藍本】· action controller+module 0.5【有藍本】·
  int spec × 2 1.5【有藍本】· 分流+元驗證 0.75【有藍本】· Day 3 API 驗證 0.75【有藍本】·
  closeout 1.5【有藍本】
  → class-calibrated commit **~4.75 hr** (mult 0.50)。Day-4 retro Q2 驗證。
- ⚠️ W07 的 `actual / bottom-up` 是 **0.17**（遠低於 0.4 下限）。本次 bottom-up 已改用
  「寫差異」估法（9.5 vs W07 的 19.75，工作量相近）—— **這個估法本身就是 `AD-BottomUpBlueprint-1`
  的驗收**：若這次 ratio 落回 band 內，該 AD 可關；若仍 < 0.4，問題不在估法。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ⭐ **`AD-BorrowedRefusal-1` 第 4 次** —— `Action` 的拒絕被 `issueRefCode` 發號或 SELECT policy 代勞 | §3.4 三個測試缺一不可；驗收是**移掉複合 FK 後測試轉綠**，不是「測試現在是綠的」 |
| **detector 對「刻意排除」判錯** —— `RefCodeCounter` 排除規則寫太寬，未來真的漏一張表也不會紅 | 排除採**明文白名單**（列名字），不用 pattern；fixture 的孤兒 model 是它的負面案例 |
| **分母本身是錯的**（D-denominator：手數 36 vs 記錄 35，差在 foundation services 節）| detector 的第一個產出就是回答它；⛔ 不得先假設 35 對 |
| ⭐ **D-namemap（Day 0 新增）** —— model `ExtensionField` / table `extension_fields` / 索引 `extension_field_catalog` **三個名字都不同且非機械可導** | detector **不做逐字比對**，帶一份明文別名映射；映射本身要能被讀懂為什麼存在。⚠️ 這擴大了 `AD-EntityIndexIncomplete-1`：索引不只漏了一個，還用了對不上的名字 |
| **`02a` 編輯改變行數** → ~30 個錨點全偏 | `AD-MdAnchorLineShift-1`：同行追加；改完 `git diff --numstat` 驗 `N/N` 且總行數不變 |
| **`source` 無 id 欄位使「raises Issue」追不回去** | Scope decision (c)：照規格建 + 登記 AD。⛔ 不發明 `source_id`（已確認參數 #9）|
| Risk Class C — 陳舊 dev server 掩蓋 wiring 修正 | Day 3 §3.1 乾淨重啟，驗證「活著的服務程序」而非 port 擁有者 PID |
| Risk Class A — 測試間 singleton 汙染 | 沿用既有 int 測試的 per-suite 重置 |
| `AD-JestFileOrder-1` — 新 int suite 改變檔案排序 → 本機綠 CI 紅 | 斷言用順序無關的性質，不用精確列表 |
| **CRLF 污染**（W06 踩過）| 一律用 Write/Edit 工具寫檔，不用 python `write_text`；`git add` 的警告不得忽略 |
| **gate 輸出被 `tail` 藏住紅**（W07 踩過兩次）| 逐 workspace 分開跑取真退出碼；`AD-GrepAssertion-1` (d) |
| ⏰ **`AD-TrivyExempt-1` 2026-09-07 到期** | 不在本 phase 範圍，但若 phase 跨到 9 月要先處理 —— 到期後所有 PR 停止可 merge |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- `Attestation` · `Assessment` · `StatementOfApplicability` · `Regulation` · `Obligation` — slice 6+
- `Risk ↔ Control` 連結表 — M7 前（它正是 `controls` 拒絕複合錨點的理由）
- `audit_log` — ADR-0003 / OQ-4 未拍板，**不得替它選邊**
- **`AD-DualLayerHighRisk-1`** — 已解封，但第一步是定義「第二層抓什麼」，不是實作
- **`AD-DesignNoteAnchor-1` 的 detector** — 在 `ROADMAP.md` 主線第 9 列 ⬜，本 phase 不動
  （本 phase 已用掉節流閘的 1 個治理/工具配額：`check_entity_index.py`）
- **`AD-RequiredCheckPrereq-1`（`ci.yml` 加 retry）** — 改 CI 需使用者確認且吃配額，本 phase 不做
- **`AD-SilentFieldDrop-1`** — 未拍板的 API 契約決策，沿用現狀
