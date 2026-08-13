---
status: closed   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W09 Plan — shared assessment engine (M1 slice 6)

**Summary**: 建 `AssessmentTemplate` / `AssessmentInstance` / `AssessmentResponse` 三張表 ——
`05` §Shared assessment engine 明訂「build **once**, rather than three times」的那一個引擎，
RCSA、控制測試、供應商稽核共用它。⭐ **範圍上的關鍵決定是「不建第四張表」**：
`Assessment (RCSA)` 在 `02a` 被寫成獨立實體，但它的欄位與 `AssessmentInstance` 幾乎全等，
使用者 2026-08-13 裁決它是**用例不是表** → 本 phase 要改 `02a` §0（最高權威文件）且分母 36 → 35。
本 phase **無 user-facing surface**，故驗證止於 API 層，報告一律寫 **gate-only verified**。
**非 spike**（複製 W05–W08 已驗證的形狀）→ **不產出 design note**。

**Status**: Closed（2026-08-13 —— 六個 US 全數交付，20 條 drift/finding 見
[progress.md](./progress.md)；元驗證 6/6 方向相符；**gate-only verified**，無 drive-through。
retrospective 見 [retrospective.md](./retrospective.md)）

**Branch**: `feature/W09-assessment-engine`
**Base**: `main` HEAD `a18b366`（PR #49 merged —— 分支清理 + `AD-UnpushedWorkInvisible-1`）
**Slice**: M1 slice **6 / N**；建完為 **17 / 35**
**Scope decisions**:
(a) **3 張表不是 4 張** —— `Assessment (RCSA)` 是 `subject_type = risk` 的 `AssessmentInstance`，
不另建表；`02a` §0 那一列改為註記，分母 36 → 35
(b) `AssessmentTemplate` 的 `sections` / `questions` 走 **JSONB**，
`AssessmentResponse.question_id` 是 **JSONB 內部的鍵、不是 FK** ——
規格沒有 `AssessmentQuestion` 實體，建一張就是自行發明（已確認參數 #9）→ 缺口記成 AD
(c) `status` 是 **bare enum**，**不建工作流引擎** —— W08 `Issue.status` / `Action.status` 先例，
故 **ADR-0002 不擋本 phase**
(d) `subject_type` + `subject_id` 多型引用**不給 FK** —— W07 `Evidence.linked_type/linked_id` 先例
(e) ⭐ **SoD 用 DB CHECK 約束** `reviewer_user_id <> assignee_user_id` ——
本專案第一個跨欄位不等式約束（guardrail 6）
(f) **不建 `Assessment` 的 RCSA 專用端點** —— 端點是引擎的，subject_type 是參數

---

## 0. Background

### The gap（M1 其餘 22 張表的第一組；`05` §Shared assessment engine 至今 0 張）

- `05:38-47` 用一個 ★ 標記指出「三個看似不同的需求其實是同一個 pattern」：
  RCSA、控制測試、供應商稽核都是 *template → assign → respond → review → findings → Issue*。
- 那個引擎**一張表都還沒建**。W07 建了 `ControlTest`，但它是**控制測試自己的**表 ——
  也就是 `05` 明文警告的「build it three times」已經開始發生了。
- `Issue` / `Action`（W08）是這條鏈的**下游**，已經在位；上游的 findings 來源仍然缺席。

### Why it matters（缺失的能力）

第一線的 RCSA 是**已確認參數 #6**（「第一線 UX 要輕」）的唯一承載體，
而它今天在資料層沒有落點。更立即的是**架構性風險**：
每多一個模組自建一套問卷結構，`05` 那個「一次做完」的判斷就越難回頭執行 ——
這正是 guardrail 3 禁止的「個別模組自行發明共用實體的私有定義」。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `a18b366`）| Anchor |
|-------|--------------------------------------------|--------|
| 引擎三表 | 索引列出，`schema.prisma` 無對應 model | `02a:52` |
| 欄位規格 | 三張表各有完整欄位清單，**但 `sections`/`questions` 的結構未定義** | `02a:326-333` |
| SoD | `reviewer_user_id ≠ assignee_user_id`，且供應商稽核另有獨立性要求 | `02a:336-338` · `05:47` |
| 生命週期 | `Scheduled → InProgress → Submitted → Reviewed → Completed`，**只定義一次** | `02a` §4 |
| ⚠️ 實體重複 | `Assessment (RCSA)` 與 `AssessmentInstance` 欄位幾乎全等、命名不同 | `02a:223` vs `02a:330` |
| 引用目標 | `AssessmentResponse.evidence_id` 指向 W07 建的 `evidence` | `02a:333` |

→ 三表可照規格建；**`Assessment` 那一列必須先解決才能定分子與分母**，
且 `evidence_id` 是否走複合 FK 取決於 `evidence` 有沒有給得起複合錨點（W07/W08 的 D1 判準第三次適用）。

### The design（backend-only：1 個 migration + 3 個 repository + 1 組端點 + 元驗證）

```
migration  20260814HHMMSS_assessment_engine
  ├── enum  assessment_subject_type   (risk | control | vendor | entity)
  ├── enum  assessment_question_type  (yes_no_na | score | free_text)
  ├── enum  assessment_instance_status(scheduled|in_progress|submitted|reviewed|completed)
  ├── table assessment_templates   (org_entity_id, name, version, subject_type,
  │                                 definition JSONB ← sections + questions)
  ├── table assessment_instances   (org_entity_id, template_id, template_version,
  │                                 subject_type, subject_id, period,
  │                                 assignee_user_id, reviewer_user_id, status)
  │         └── CHECK (reviewer_user_id IS NULL OR reviewer_user_id <> assignee_user_id)
  ├── table assessment_responses   (org_entity_id, instance_id, question_id,
  │                                 answer JSONB, evidence_id NULL)
  ├── 複合 FK  instances → templates · responses → instances · responses → evidence
  ├── per-command RLS policies（SELECT/INSERT/UPDATE，無 DELETE）+ FORCE RLS
  └── validate_extensions trigger × 3

core-model/  assessment-template.repository.ts · assessment-instance.repository.ts
             assessment-response.repository.ts （+ 各自 spec）
modules/assessment/  controller + module（+ spec + int spec）
docs/02-architecture/02a-data-model-spec.md  §0 索引：Assessment 一列改註記
scripts/lint/check_entity_index.py           分母 36 → 35 的來源隨索引自動改變
```

**為何 `definition` 是單一 JSONB 欄而不是 `sections` + `questions` 兩欄**：
`AssessmentResponse.question_id` 要求題目有穩定身分，而規格沒有給題目一張表。
把 sections 與 questions 放在同一個 JSONB 文件裡，題目的 `id` 是文件內的鍵，
**版本化的單位是整份 definition**（`template_version` 已在 `AssessmentInstance` 上）。
拆成兩欄會讓「哪個版本的哪一題」需要跨欄位重組，而那正是 `template_version` 存在的理由。

### Ground truth（recon head-start —— 於 `main` HEAD `a18b366` 讀過的 code）

- `docs/02-architecture/05-platform-foundation-services.md:38-47` — 引擎的三個實體與 SoD 要求
- `docs/02-architecture/02a-data-model-spec.md:52` — §0 索引把三者列為 Wave 1 foundation services
- `docs/02-architecture/02a-data-model-spec.md:326-338` — 三者的欄位清單 + SoD 註記
- `docs/02-architecture/02a-data-model-spec.md:223` — `Assessment (RCSA)` 的欄位清單（重複來源）
- `scripts/lint/check_entity_index.py` — `SECTION_FOUNDATION` / `EXCLUDED` / `ALIASES` 的解析方式

**Baselines（W08 closeout）**: web test 10 · api unit 276/27 suites · api int 125/10 suites ·
lint 0 error 0 warning · coverage 92.07 / 91.9 / 96.63 / 93.62 · build clean ×2 · `run_all` 7/7 ·
`lint:negative` PASS。**Day-0 重新驗證**（W08 的 baseline 是抄來的，不是本 phase 量的）。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-evidence-anchor** — `evidence` 有沒有 `@@unique([id, orgEntityId])`？
  → 有 = `responses.evidence_id` 走複合 FK（W08 形狀）；沒有 = 走 trigger（W07 形狀）→ 移動 §8 R1
- **D-template-scope** — `AssessmentTemplate` 是 entity-scoped、全域庫、還是列級範疇？
  規格未寫 → 三種先例都在（`Threat` 全域 · `extension_field_catalog` entity-scoped ·
  `Control` 列級 ADR-0014）→ 移動 §8 R2
- **D-assessment-row** — `02a` §0 的 `Assessment` 那一列實際長什麼樣、
  `check_entity_index.py` 怎麼解析它 → 決定 §3.5 的改法
- **D-question-id** — `02a` 全文有沒有任何地方定義 `question_id` 的型別/來源 → 決定 (b) 是否成立
- **D-user-fk** — `assignee_user_id` / `reviewer_user_id` 指向 `users`，
  而 ADR-0012 定 `users` **全域無 `org_entity_id`** → 複合 FK **不適用**，確認單欄 FK 是對的

## 1. Phase Goal

把 `05` §Shared assessment engine 的三個實體從散文變成 runtime：三張表、per-command RLS、
一組端點、以及**本專案第一個職責分離的資料庫層強制**。
證明方式是 gate 全綠 + 每個宣稱會擋東西的機制各有一個**被它擋住**的常駐負面案例，
外加 Day 3 的元驗證（中性化 → 預期方向**寫在跑之前**，見 `AD-MetaVerificationBug-1`）。
**無 user-facing surface** → 不做 drive-through，報告一律寫「gate-only verified」。
**非 spike** → 不產出 design note；**不需要新 ADR**（(c)(d)(e) 全部落在既有 ADR 之內，
理由寫進 CH-024）。

## 2. User Stories

- **US-1**（schema）: 作為區域 ISO，我希望問卷模板、指派實例與作答分開儲存，
  以便同一份問卷可以在不同實體、不同期間重複使用而不必複製題目。
- **US-2**（isolation）: 作為合規負責人，我希望評估資料依實體隔離且跨實體引用會被資料庫拒絕，
  以便一個 OpCo 的自評不可能引用到另一個 OpCo 的證據。
- **US-3**（SoD）: 作為稽核人員，我希望「覆核者不得是執行者」由資料庫強制，
  以便職責分離不依賴任何人記得在應用層檢查。
- **US-4**（endpoints）: 作為第一線負責人，我希望能建立模板、指派實例、提交作答，
  以便 RCSA 有一條真的可以走的路徑。
- **US-5**（meta-verification）: 作為開發者，我希望每個守衛被中性化時**確實有測試轉紅**，
  以便綠燈證明的是它宣稱的那件事。
- **US-6**（closeout）: 作為專案維護者，我希望 `02a` §0 的實體重複被解決、
  計數的分母隨之更正，以便索引宣稱的完整性是真的。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   apps/api/prisma/migrations/<ts>_assessment_engine/migration.sql
EDIT  apps/api/prisma/schema.prisma                      3 model + 3 enum
NEW   apps/api/src/core-model/assessment-template.repository.ts   (+ .spec.ts)
NEW   apps/api/src/core-model/assessment-instance.repository.ts   (+ .spec.ts)
NEW   apps/api/src/core-model/assessment-response.repository.ts   (+ .spec.ts)
EDIT  apps/api/src/core-model/scoped-client.types.ts     +3 介面
NEW   apps/api/src/modules/assessment/assessment.controller.ts    (+ .spec.ts)
NEW   apps/api/src/modules/assessment/assessment.module.ts
NEW   apps/api/test/assessment.int.spec.ts
EDIT  apps/api/src/app.module.ts                          註冊 AssessmentModule
EDIT  docs/02-architecture/02a-data-model-spec.md         §0 索引 Assessment 一列
UNTOUCHED  scripts/lint/check_entity_index.py             ← 分母由索引導出，不改 code
UNTOUCHED  apps/web/**                                    ← 無 user-facing surface
```

### 3.1 Schema（US-1）— `schema.prisma` + migration

- 三個 enum 照 `02a` 的字面值建，**不擴充**；`Object.values()` 導出驗證清單（W08 先例）
- `assessment_templates.definition` 為 `Json`，**應用層不驗其內部結構**
  （驗它就是替沒有規格的東西發明規格）→ 缺口記成 AD
- 三張表都有 `org_entity_id NOT NULL`（約束 8 鐵律 1）+ §1.1 base fields
- ⚠️ `AssessmentTemplate` 的範疇形狀**待 D-template-scope 決定**，
  預設走 entity-scoped（最保守）；若 Day 0 判定應為列級，改用 ADR-0014 的三條 policy

### 3.2 Isolation（US-2）— per-command RLS + 複合 FK

- `SELECT` / `INSERT` / `UPDATE` 三條 per-command policy，**無 `FOR DELETE`**（W06 先例：
  缺席的 policy 比窄的 policy 更嚴格）；`FORCE ROW LEVEL SECURITY`
- 表間引用走**複合 FK**（`(template_id, org_entity_id)` 等），依 W08 的 D1 判準 ——
  ⚠️ `evidence_id` 那一條取決於 **D-evidence-anchor**
- `assignee_user_id` / `reviewer_user_id` 走**單欄 FK** —— `users` 全域無 `org_entity_id`
  （ADR-0012），複合 FK 在此不適用且不應勉強

### 3.3 SoD（US-3）— DB CHECK 約束

```sql
CONSTRAINT assessment_instances_sod
  CHECK (reviewer_user_id IS NULL OR reviewer_user_id <> assignee_user_id)
```

- `NULL` 放行是刻意的：實例可以在尚未指派覆核者時存在
- ⛔ **供應商稽核的「稽核者需獨立於關係經理」不在本 phase** ——
  那需要 `Supplier` 與關係經理欄位，兩者都不存在 → §9

### 3.4 Endpoints（US-4）— `modules/assessment/`

- `POST /assessment-templates` · `POST /assessment-instances` · `POST /assessment-responses`
  + 各自的 `GET`（list，entity-scoped）
- enum 值非法時回 **400 不是 500**（W08 量到 Prisma 的 enum 錯誤不帶本 app 認得的 SQLSTATE）
- 查無資料回 **404 不回 403**（約束 8）

### 3.5 索引更正（US-6）— `02a` §0

- `Assessment (RCSA)` 那一列**不刪除**，改為註記：它是 `subject_type = risk` 的
  `AssessmentInstance`，不是獨立實體 —— 保留列是為了讓讀者從舊名字找得到新落點
- 分母隨之 36 → 35，**由 `check_entity_index.py` 從索引導出**，不手寫

### 3.x 明確不做的事

- **不建 `AssessmentQuestion` 表** —— 規格沒有它（已確認參數 #9）
- **不建工作流引擎** —— `status` 是 enum；ADR-0002 仍待 spike
- **不驗證 `definition` JSONB 的內部結構** —— 沒有規格可依
- **不建 RCSA 專用端點** —— subject_type 是參數不是路由
- **不碰 `apps/web`** —— 本 phase 無 UI

### 3.y Validation（US-1..US-6）

Gates: lint 0/0 · web test 10 · api unit（新增 ≥ 3 個 suite）· api int（新增 1 個 suite）·
type-check ×2 clean · build ×2 clean · coverage ≥ jest 門檻（80/70/80/80）·
`run_all` **7/7** · `lint:negative` PASS。
⛔ **無 drive-through** —— 純後端，報告寫「gate-only verified」，不得暗示可用性。
每個 gate **逐 workspace 可見**，⛔ 不用 `tail` / `--silent`（`AD-GrepAssertion-1`）。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/migrations/<ts>_assessment_engine/migration.sql` | NEW（⚠️ 含 Day-0 **D2** 追加的 `ALTER TABLE evidence ADD CONSTRAINT … UNIQUE (id, org_entity_id)`）|
| 2 | `apps/api/prisma/schema.prisma` | EDIT（3 新 model + 3 enum + `Evidence` 加 `@@unique([id, orgEntityId])`）|
| 3 | `apps/api/src/core-model/assessment-template.repository.ts` (+ `.spec.ts`) | NEW |
| 4 | `apps/api/src/core-model/assessment-instance.repository.ts` (+ `.spec.ts`) | NEW |
| 5 | `apps/api/src/core-model/assessment-response.repository.ts` (+ `.spec.ts`) | NEW |
| 6 | `apps/api/src/core-model/scoped-client.types.ts` | EDIT |
| 7 | `apps/api/src/modules/assessment/assessment.controller.ts` (+ `.spec.ts`) | NEW |
| 8 | `apps/api/src/modules/assessment/assessment.module.ts` | NEW |
| 9 | `apps/api/test/assessment.int.spec.ts` | NEW |
| 10 | `apps/api/src/bootstrap/app.module.ts` | EDIT（⚠️ Day-0 **D1** 更正 —— 原寫 `src/app.module.ts`，不存在）|
| 11 | `docs/02-architecture/02a-data-model-spec.md` | EDIT |
| 12 | `docs/03-implementation/changes/CH-024-w09-assessment-engine.md` | NEW |
| — | `scripts/lint/check_entity_index.py` | **UNTOUCHED**（分母由索引導出）|
| — | `apps/web/**` | **UNTOUCHED**（無 UI）|
| — | `docs/14-adr/**` | **UNTOUCHED**（不需要新 ADR）|

## 5. Acceptance Criteria

1. 三張表存在於 `schema.prisma` 與已套用的 migration；`check_entity_index.py` 報 **17 / 35**
2. 每張表的四個範疇測試齊全（跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 /
   滾升角色只看到授權子樹）
3. SoD CHECK 存在，且有一個**會被它擋住**的常駐負面案例（同一個 user 同時是 assignee 與 reviewer
   → 插入失敗）
4. 端點對非法 enum 回 400、對不存在或越界的 id 回 404（**不是 403、不是 500**）
5. **元驗證**：每個守衛中性化後**預期轉紅的測試在跑之前就寫下來**，且實測方向相符；
   方向不符時**先懷疑元驗證本身**（`AD-MetaVerificationBug-1`）
6. `02a` §0 的 `Assessment` 一列已註記；分母由索引導出為 35，**無任何一處手寫**
7. **無 drive-through（本 phase 無 user-facing surface）** —— 所有報告寫「gate-only verified」
8. `AD-*` 已 CLOSE / 新增；calibration 已記錄；導航檔 + BACKLOG 已更新

## 6. Deliverables

- [ ] US-1 三張表 + 三個 enum + migration，照 `02a` 字面值不擴充
- [ ] US-2 per-command RLS + 複合 FK + 四項範疇測試 ×3 表
- [ ] US-3 SoD CHECK 約束 + 常駐負面案例
- [ ] US-4 六個端點（3 POST + 3 GET），400 / 404 語義正確
- [ ] US-5 元驗證：中性化清單 + 預期方向（**跑之前寫下**）+ 實測結果
- [ ] US-6 `02a` §0 註記 + 分母 35 由索引導出 + CH-024 + closeout

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50** —— 三張表的形狀由 W05–W08 定死
  （repository / controller / module / int spec / per-command policy 全部有藍本），
  寫的是差異不是全部。**第 3 個資料點**（`CALIBRATION-MATRIX.md:54`：前兩點
  「兩點定義都有爭議」，W08 窗口 ratio 0.84 IN 但逐段 0.23 UNDER，
  差額全是等待使用者 → `AD-CalibrationIdleGap-1`）。
  ⚠️ 本 phase 有**兩個沒有藍本的小機制**（SoD CHECK、業務表上的 JSONB 文件欄），
  但兩者都是單點而非跨檔案，不足以改 class。
- **Agent-delegated: `no`**（< 20% —— 自己直接做）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est ~**7.5 hr** → class-calibrated commit ~**3.75 hr** (mult 0.50)。
  逐項【藍本度】標記（`AD-BottomUpBlueprint-1` 的 W08 提議，**本 phase 照舊估一次再比對**）：
  migration【有藍本改差異】1.5 · 三個 repository + spec【有藍本改差異】2.5 ·
  端點 + int spec【有藍本改差異】2.0 · SoD CHECK【無藍本】0.5 ·
  `02a` 索引 + 分母【有藍本改內容】0.5 · 元驗證【有藍本改差異】0.5。
  ⭐ **同時記下新方法的預測**：8 個交付項 × 實測 ≈ 8 min/項（W08 唯一資料點）= **~64 min**。
  Day-4 retro Q2 比對三個數字（committed 3.75 hr · 新方法 1.07 hr · actual），
  ⛔ **兩端錨點閉合的區段才進 calibration**（`AD-EstimateAsMeasurement-1`），
  且窗口要扣掉等待使用者的間隔（`AD-CalibrationIdleGap-1`）。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **R1** ✅ **已於 Day 0 解決，但答案是第三種** —— `evidence` **沒有**複合錨點（全 schema 只有 `AssetGroup`/`Asset`/`Issue` 有，且**三個都與自己的子表同 phase 出生**）。但它也**不是**結構上給不起：無 `appliesToScope`，是單純 entity-scoped | 依 W07/W08 的 D1 判準 → **走複合 FK**，而這要求 W09 的 migration **ALTER `evidence` 加上錨點**。⭐ 本專案**第一次回頭改前一個 phase 的表**，也是第一次由子表引用更早 phase 建好的父表。additive index，非破壞性。完整推導見 [progress.md](./progress.md) **D2** |
| **R2** `AssessmentTemplate` 的範疇形狀規格未寫，三種先例都成立 | Day-0 **D-template-scope**；預設走最保守的 entity-scoped，並把判斷理由寫進 CH-024。⛔ 不自行發明第四種 |
| **R3** `definition` JSONB 無結構驗證 = 潛在 AP-3（欄位在但沒有東西保證內容） | **明確標示**：CH-024 寫清楚「不驗證是因為沒有規格」，並開 AD。⛔ 不寫一個假的 validator 充數 |
| **R4** `question_id` 不是 FK，findings 追不回題目 —— 與 `AD-IssueBareEnum-1` 同族 | 記成 AD 並指出它是**規格缺口不是實作選擇**；M7 之前必須拍板 |
| **R5** 改 `02a`（最高權威文件）可能與其他文件的引用衝突 | Day-0 全 repo grep `Assessment (RCSA)` 的引用；`run_all` 的 `doc-links` / `path-references` 會抓錨點 |
| **R6** Risk Class C —— 陳舊的長駐 dev server 掩蓋 migration 生效 | Day 2/3 驗證前乾淨重啟並擷取 startup log；`docs/rules-on-demand/local-runtime-ops.md` |
| **R7** Risk Class A —— 新表的整合測試可能揭露既有的測試隔離漏洞 | 逐 suite 跑一次再合跑；失敗時先查 fixture 共用狀態 |
| **R8** 新增 2 個 NestJS module 檔會再次稀釋覆蓋率（`AD-ModuleCoverageDilution-1`）| 預期現象，非缺陷；Day-4 記錄下降幅度，⛔ 不為 `@Module` metadata 寫測試（AP-3）|

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **供應商稽核的獨立性檢查** —— 需要 `Supplier` 與關係經理欄位，兩者皆不存在 → slice 7..N
- **`AssessmentTemplate.definition` 的結構驗證** —— 無規格 → AD
- **findings → `Issue` 的自動化** —— `05:47` 要求它，但那是工作流（ADR-0002 待 spike）→ AD
- **控制測試改走本引擎** —— W07 的 `ControlTest` 已存在；遷移是行為變更 → 另開 CH
- **`Assessment` 的舊名相容層** —— 不建（沒有消費者，AP-5）
- **RCSA 的 UI** —— Wave 1 至今無 user-facing surface；M8 之前不動
