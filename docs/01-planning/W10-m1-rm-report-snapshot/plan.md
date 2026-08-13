---
status: closed   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W10 Plan — Risk Management Report as an immutable versioned snapshot

**Summary**: 建 `RiskManagementReport` + `RMReportVersion`（M1 slice 7），把 `02a` §3.1 的
「live register + 週期性不可變快照」從紙上變成兩張表 + 五個端點。關掉的 gap 是 **M1 DoD 的
`versioning` 在 schema 層完全沒有標的** —— 前九片建的十七張表沒有一張是快照。關鍵範圍決策：
`02a:253/257` 同時給了 `current_version_id`（父表指標）**與** `state`（子表欄位），兩者說同一件事；
本 phase **只建父表指標**，讓快照列拿到「**完全沒有 `FOR UPDATE` policy**」的不可變性
（ADR-0014 的缺席即最嚴格），`superseded` 改為導出。無 UI → **gate-only verified**，不做 drive-through。
非 spike → **不產 design note**。

**Status**: Closed（2026-08-13 收尾，PR 待開。使用者 2026-08-13 核可執行。範圍先於同日由使用者在四個候選群中
選定本組；§0 The design 的 A/B/C 三選一連同「`state` 記錄為 deviation」一併核可）

**Branch**: `feature/W10-rm-report-snapshot`
**Base**: `main` HEAD `d6300ce`（W09 狀態翻面 —— PR #51，`gh pr view` 驗證 MERGED 06:59:39Z）
**Slice**: M1 slice **7 / N**。關掉 `02a` §3.1 的零實作狀態；不關任何既有 AD（它不是某條 AD 的產物）
**Scope decisions**: (a) `state` 不建，`current_version_id` 單邊持有真相 —— 記錄為 deviation
(b) 快照 payload 是 JSONB 且**不驗證結構**，同 `AD-AssessmentDefinitionUnvalidated-1` 家族
(c) `prepared_by` / `approved_by` 是 **text 不是 FK** —— `02a:262` 明令不得把委員會塞進 user
(d) **不建「從 live register 產生快照」的能力** —— payload 由呼叫端提供，產生器屬 M7/M8

---

## 0. Background

### The gap（M1 DoD 的 `versioning` 沒有標的）

`07:32` 的 M1 DoD 是「Core entities & relationships migrated; stable IDs, **versioning**,
soft-delete; governed-extension mechanism working」。

已建的十七張表都有 `version Int @default(1)` —— 那是**樂觀鎖的計數器**，不是版本化。
沒有任何一張表保存**過去某個時點的內容**。`02a` §3.1 指名的那個機制（live register 之上的
週期性不可變快照）今天**一行實作都沒有**。

### Why it matters（缺失的能力）

Risk Management Report 是**受控交付物**，由 ISC 核准、每版保存三年（`05:76`）。
稽核時被問的不是「現在的風險登記簿長怎樣」，而是「**2025.7 版核准當下**它長怎樣」。
沒有快照表，這個問題只能靠 live register 回答 —— 而 live register 一直在變。

`02a:248` 已經寫明另一半理由：兩份風險資料會漂移，而 guardrail 3 禁止模組持有共用實體的私有定義。
`riskRegister.js` 的形狀是**被渲染的登記表**，不是第二個 store。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（recon 讀於 `6446099`；`d6300ce` 在其上只動 6 個 docs 檔，無 code）| Anchor |
|-------|--------------------------------------------|--------|
| Schema | 18 個 model，**無** `RiskManagementReport` / `RMReportVersion` | `apps/api/prisma/schema.prisma` |
| 索引分母 | 35 個 Wave-1 實體，已建 17 | `check_entity_index.py` 輸出 |
| 規格 | 兩張表的欄位已逐一指定，含 `state` 與 `current_version_id` **兩者** | `02a:253` · `02a:255` |
| 不可變性 | 「correcting a report means issuing a new version, never editing one」 | `02a:260` |
| 核准人 | `by:'ITSC'` / `appr:'ISC'` 是**治理機構不是人** | `02a:262` · `rmVersions.js:4` |
| 既有 UPDATE 守衛 | 每張表都 `GRANT SELECT, INSERT, UPDATE`，且 policy 有 `FOR UPDATE` | `20260811093148_control_library/migration.sql:106,131` |
| 缺席即嚴格 | 無 `FOR DELETE` policy → 未來就算 `GRANT DELETE` 也刪不掉任何列 | 同上 `:30-31`（migration 註解） |

→ 不可變性在本 schema **已經有一個被裁決過的表達方式**：**不寫那條 policy**。
W06 的 migration 註解自己說「這張表不依賴 GRANT 維持原狀」—— 所以守衛必須是 policy，
GRANT 只是縱深。要讓快照列真的不可改，它就**不能有任何需要被 UPDATE 的欄位**。

### The design（父表持有可變指標，子表一條 `FOR UPDATE` policy 都沒有）

```
schema.prisma
  model RiskManagementReport
    id · ref_code · org_entity_id · title
    current_version_id  UUID?          ← 唯一的可變真相；NULL = 尚未發版
    @@unique([id, orgEntityId])        ← 給子表的錨點（issues:1178 同形）
  model RMReportVersion
    id · ref_code · org_entity_id · report_id · version_label
    prepared_by TEXT · approved_by TEXT ← 委員會，刻意不是 FK
    effective_date · change_note · snapshot_at
    sheet  JSONB                        ← 凍結的五張表：Services/Assets/Threats/Assessment/Treatment
    @@unique([reportId, versionLabel])  ← 同一份報告不得有兩個同名版本
    @@unique([id, reportId])            ← 讓父表的指標能複合參照回「本報告的」版本
    ⛔ 無 state 欄位

migration.sql
  FK (report_id, org_entity_id)      → rm_reports(id, org_entity_id)     ← 跨實體：23503
  FK (current_version_id, id)        → rm_report_versions(id, report_id) ← 跨報告：23503
  GRANT SELECT, INSERT, UPDATE ON rm_reports          TO isms_app
  GRANT SELECT, INSERT         ON rm_report_versions  TO isms_app   ← 無 UPDATE
  policy rm_reports:          SELECT / INSERT / UPDATE  （三條）
  policy rm_report_versions:  SELECT / INSERT           （兩條，⛔ 沒有 FOR UPDATE）
```

**為何不是另外兩個**（`02a` 兩個欄位都給了，必須三選一 —— 同 W09 `template_version` 的形狀）：

| 選項 | 「哪一版是現行」住哪 | 為什麼不 |
|---|---|---|
| A. 兩個都建 | 父表指標 **＋** 子表 `state` | 兩處說同一件事而**沒有調解規則** —— `02a:225` 已經為 `ControlTest.result` 拒絕過這個形狀。且它強迫快照列必須可 UPDATE |
| B. 只建 `state` | 子表欄位 + partial unique index | 需要 `FOR UPDATE` policy，那麼「payload 凍結」就只剩 column-level GRANT 撐著 —— 而 W06 自己的 migration 註解說**守衛不得依賴 GRANT** |
| **C. 只建指標** ✅ | **父表**單一欄位 | 快照列**一條 `FOR UPDATE` policy 都沒有**（ADR-0014 的缺席即最嚴格）；「至多一個現行版」是**構造上為真**而不是靠 index 約束；`superseded` 由 `id <> report.current_version_id` 導出 |

⚠️ C 的代價是**明確的規格偏離**：`02a:257` 列了 `state`。這與 `ControlTest.result`（`02a:225`）
與 `applies_to_scope = subtree`（`02a:219`）同類，收尾時以同樣方式在 `02a` 記錄，**不是默默不建**。

### Ground truth（recon head-start —— 於 `6446099` 讀過的 code；Day-0 全部重驗於 `d6300ce`）

- `apps/api/prisma/schema.prisma:1130-1194` — `Issue` / `Action` 是父子對的藍本：
  父表 `@@unique([id, orgEntityId])`，子表 `@relation(fields: [issueId, orgEntityId], ...)`
- `apps/api/prisma/schema.prisma:1178-1180` — 父表錨點的註解（「id 本身已唯一；這一對存在
  是為了讓子表能同時指名兩者，不一致時被拒」）
- `apps/api/src/core-model/scoped-client.types.ts` — 每個 repository 自宣告的結構型別；
  **刻意不含父表 delegate**（W05 起的紀律，W09 的三選一因此成立）
- `apps/api/src/modules/{action,assessment,...}/` — 每個模組 4 檔：controller / controller.spec /
  int.spec / module
- `apps/api/prisma/migrations/20260811093148_control_library/migration.sql:30-31` — 「這張表不依賴
  GRANT 維持原狀」的原文，本 phase 直接繼承這個判準
- `docs/06-reference/design_handoff_isms_grc_platform/data/rmVersions.js:4-8` — 五筆真實版本標籤
  （`2025.7` / `2024` / `1.2` / `1.1` / `1.0`），證明 `version_label` 不是 semver
- `05:76` — Risk Management Report & SoA 保存 **3 years per version**

**Baselines（W09 closeout）**: api unit 315/31 · api int 145/11 · web 10 · lint 0/0 ·
type clean ×2 · build clean ×2 · coverage 92.07/90.67/97.14/93.49 · `run_all` 7/7 ·
`check_entity_index` 17/35。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-circular-fk** — Prisma 能否表達「父表 FK → 子表」與「子表 FK → 父表」的雙向參照？
  → 若不能，§3.1 的 C 方案要改用 deferrable FK 或改由 migration 手寫 → 移動 §Risks
- **D-composite-self** — `rm_reports.current_version_id` 的複合 FK 需要
  `rm_report_versions(id, report_id)` 的唯一索引；確認 Prisma 會產生它 → 影響 §3.1
- **D-grant-shape** — 既有 migration 是否**全部**是表級 GRANT（無 column-level）→ 確認 C 方案
  不需要引入新的 GRANT 形狀 → 影響 §3.2
- **D-refcode-prefix** — `ref-code.ts` 的既有前綴清單，確認 `RMRP` / `RMRV` 未被佔用 → 影響 §3.1
- **D-ch-number** — `CH-026` 未被佔用 → 影響 §4

## 1. Phase Goal

在 `core-model` 建立本專案第一組**版本化快照**表，使「某份風險管理報告在核准當下的內容」成為
可查詢、且**在資料庫層被拒絕修改**的資料；並以元驗證證明那個拒絕來自「缺席的 `FOR UPDATE`
policy」而非任何應用層檢查。證明方式：五個端點的整合測試 + 每張表四項範疇測試 +
四項中性化（預期方向**寫在跑之前**）。⛔ 無 UI 表面 → **gate-only verified**，
報告不得暗示可用性。非 spike（複用 W05–W09 的 pattern）→ **不產 design note**，不需 ADR。

## 2. User Stories

- **US-1**（schema）: 作為區域 ISO，我希望一份風險管理報告能持有多個具名版本，
  以便稽核時能引用「2025.7 版」而不是「現在的登記簿」。
- **US-2**（immutability）: 作為稽核人員，我希望已發布的版本**在資料庫層**無法被修改，
  以便我對快照的信任不依賴應用程式的自律。
- **US-3**（integrity）: 作為平台維運者，我希望「現行版指標」不可能指向別份報告或別個實體的版本，
  以便一個錯誤的 UUID 不會製造一份看起來合法的假報告。
- **US-4**（endpoints）: 作為第二道防線使用者，我希望能建立報告、發布新版、列出版本，
  以便交付物的產出過程留在平台內而不是回到 Excel。
- **US-5**（meta-verification）: 作為本專案的維護者，我希望每一個守衛都被中性化過一次，
  以便「測試全綠」是守衛有效的證據，而不只是測試存在的證據。
- **US-6**（closeout）: 作為下一個 session，我希望 `02a` 的 `state` 偏離被記錄、實體計數被機械導出，
  以便半年後沒有人把「刻意不建」讀成「漏建」。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   apps/api/src/core-model/rm-report.repository.ts          報告的 CRUD + 發版的交易
NEW   apps/api/src/core-model/rm-report.repository.spec.ts     unit（double）
NEW   apps/api/src/core-model/rm-report-version.repository.ts  版本的 insert + 查詢
NEW   apps/api/src/core-model/rm-report-version.repository.spec.ts
NEW   apps/api/src/modules/rm-report/rm-report.controller.ts        5 端點
NEW   apps/api/src/modules/rm-report/rm-report.controller.spec.ts
NEW   apps/api/src/modules/rm-report/rm-report.int.spec.ts          範疇 + 不可變 + 指標完整性
NEW   apps/api/src/modules/rm-report/rm-report.module.ts
NEW   apps/api/prisma/migrations/<ts>_rm_report_snapshot/migration.sql
EDIT  apps/api/prisma/schema.prisma                             +2 model
EDIT  apps/api/src/core-model/scoped-client.types.ts            +2 介面（各只含自己的 delegate）
EDIT  apps/api/src/core-model/ref-code.ts                        +2 前綴
EDIT  apps/api/src/bootstrap/app.module.ts                       註冊 RmReportModule
EDIT  docs/02-architecture/02a-data-model-spec.md                §3.1 記錄 state 偏離
—     apps/api/src/core-model/scope-refusal.ts                   **UNTOUCHED**（23503/23505 已涵蓋）
—     apps/api/src/entity-scope/                                 **UNTOUCHED**
```

### 3.1 兩張表（US-1, US-3）— `schema.prisma` + migration

- 兩張表**都**有 `org_entity_id NOT NULL`（約束 8 鐵律 1；子表冗餘是故意的）
- `rm_report_versions.report_id` 走**複合 FK** `(report_id, org_entity_id)` —— 父表是本 phase
  新建的，給得起錨點，所以依 W07/W08 的 D1 判準用 FK 而**不是** W07 的 trigger
- `rm_reports.current_version_id` 走**複合 FK** `(current_version_id, id)` →
  `rm_report_versions(id, report_id)`，讓「指向別份報告的版本」在資料庫層變成 23503
- `@@unique([reportId, versionLabel])` —— 同一份報告的版本標籤唯一
- `version_label` 是**自由字串**：來源用 `2025.7` / `2024` / `1.2`，不是 semver，不加格式驗證
- `prepared_by` / `approved_by` 是 **`String`**（`ITSC` / `ISC`），不是 `@db.Uuid` 也不是 FK

### 3.2 不可變性（US-2）— migration policy

- `rm_report_versions` 只有 **`FOR SELECT`** 與 **`FOR INSERT`** 兩條 policy
- GRANT 為 `SELECT, INSERT`（無 `UPDATE`、無 `DELETE`）—— 縱深，不是守衛
- `FORCE ROW LEVEL SECURITY`（沿用既有每張表的做法）
- ⛔ **不加任何 trigger 去擋 UPDATE** —— 缺席的 policy 已經是更強的形式，
  加 trigger 等於為同一件事建第二個機制（AP-5）

### 3.3 五個端點（US-4）— `modules/rm-report/`

| Method | Path | 語義 |
|---|---|---|
| `POST` | `/rm-reports` | 建報告，`current_version_id` = NULL |
| `GET` | `/rm-reports/:id` | 查無 → **404**（不區分不存在／不在範疇內） |
| `POST` | `/rm-reports/:id/versions` | 發版：insert 版本 + repoint 父表，**同一交易** |
| `GET` | `/rm-reports/:id/versions` | 列出；`isCurrent` 由指標**導出**不是欄位 |
| `GET` | `/rm-reports/:id/versions/:versionId` | 查無 → **404** |

### 3.4 明確不做的事

- **不建「從 live register 產生快照」** —— payload 由呼叫端提供。產生器需要整個 register 的
  凍結規則（哪些欄位、哪個時點、如何處理已 retire 的風險），那是 M7/M8 的題目。
  ⚠️ 這讓本 phase 交付的是「保存快照的能力」而不是「產生快照的能力」，§9 明記
- **不驗證 `sheet` JSONB 的結構** —— 與 `AD-AssessmentDefinitionUnvalidated-1` 同一個理由：
  沒有規格可依，寫一個假 validator 比不寫更糟
- **不建 `state` 欄位**（§0 The design 的 C 方案）
- **不實作保存期限**（`05:76` 的三年）—— `retention_policy` 表未建

### 3.5 Validation（US-1..US-5）

Gates: lint 0/0 · format clean ×2 · type-check clean ×2 · build clean ×2 ·
api unit（新增 ≥ 20）· api int（新增 ≥ 14）· web 10（不動）· coverage 不低於 baseline ·
`run_all` 7/7 · `check_entity_index` **19 / 35** · `lint:negative` PASS。
⛔ **無 drive-through** —— 本 phase 無 UI 表面，報告一律寫 **gate-only verified**。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_rm_report_snapshot/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/rm-report.repository.ts` | NEW |
| 4 | `apps/api/src/core-model/rm-report.repository.spec.ts` | NEW |
| 5 | `apps/api/src/core-model/rm-report-version.repository.ts` | ~~NEW~~ → **併入 #3（Day-0 D2）** |
| 6 | `apps/api/src/core-model/rm-report-version.repository.spec.ts` | ~~NEW~~ → **併入 #4（Day-0 D2）** |
| 7 | `apps/api/src/core-model/scoped-client.types.ts` | EDIT |
| 8 | `apps/api/src/core-model/ref-code.ts` | ~~EDIT~~ → **UNTOUCHED（Day-0 D1）** |
| 9 | `apps/api/src/modules/rm-report/rm-report.controller.ts` | NEW |
| 10 | `apps/api/src/modules/rm-report/rm-report.controller.spec.ts` | NEW |
| 11 | `apps/api/src/modules/rm-report/rm-report.int.spec.ts` | NEW |
| 12 | `apps/api/src/modules/rm-report/rm-report.module.ts` | NEW |
| 13 | `apps/api/src/bootstrap/app.module.ts` | EDIT |
| 14 | `docs/02-architecture/02a-data-model-spec.md` | EDIT |
| 15 | `docs/03-implementation/changes/CH-026-w10-rm-report-snapshot.md` | NEW |
| — | `apps/api/src/core-model/scope-refusal.ts` | **UNTOUCHED** |
| — | `apps/api/src/entity-scope/` | **UNTOUCHED** |
| — | `apps/web/` | **UNTOUCHED** |

## 5. Acceptance Criteria

1. `check_entity_index.py` 報 **19 / 35**（分子 +2，分母不動）
2. 每張表四項範疇測試通過：跨實體讀拒絕（404）／跨實體寫拒絕且資料未變／RLS 層獨立成立／
   滾升角色只看到授權子樹
3. **對已發布版本的 UPDATE 在資料庫層被拒絕**，且該拒絕在**繞過 repository 直接下 SQL** 時同樣成立
4. `current_version_id` 指向別份報告的版本 → **23503**；指向別個實體的版本 → **23503**
5. 發版第二版後：父表指標改變，**第一版的每一個欄位逐一比對未變**（不是只比 `updated_at`）
6. 四項中性化各自轉紅（或明確預測「不動」並成立）；預期方向**寫在跑之前**
7. `02a` §3.1 記錄 `state` 的 deviation，形式與 `02a:225` / `02a:219` 一致
8. ⛔ **無 drive-through**（無 UI）；所有報告寫「gate-only verified」
9. CH-026 CLOSED；calibration 已記錄；導航檔 + BACKLOG 已更新

## 6. Deliverables

- [ ] US-1 兩張表 + migration，欄位照 `02a:253/255` 字面值（`state` 除外，記錄為 deviation）
- [ ] US-2 `rm_report_versions` 無 `FOR UPDATE` policy，且有測試證明 UPDATE 被資料庫拒絕
- [ ] US-3 兩條複合 FK，跨報告與跨實體各有一個 23503 測試
- [ ] US-4 五個端點，404 / 422 語義正確，發版是單一交易
- [ ] US-5 中性化清單 + 預期方向（跑之前寫下）+ 實測對照
- [ ] US-6 `02a` deviation 記錄 + CH-026 + closeout

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（**第 4 個資料點**。`CALIBRATION-MATRIX.md:54`
  記載此 class 現有三點跨 0.23~0.84，狀態是 **KEEP，等量測定義收斂**。本 phase 複用 W05–W09 的
  父子複合 FK / per-command policy / scoped client / 四項範疇測試；唯一的新機制是
  **「不寫那條 policy」**，而 ADR-0014 已經為 DELETE 裁決過同一形狀 —— 屬複用不屬 spike）。
- **Agent-delegated: `no`**（前九片全部自己直接做；本 phase 的核心是一個規格取捨，
  委派出去會把「為什麼不是另外兩個」變成不可讀的紀錄）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est ~7.0 hr（schema 1.0 · migration 1.5 · 兩個 repository + spec 1.5 ·
  端點 + controller spec 1.0 · int spec 1.0 · 中性化 0.5 · closeout 0.5）
  → class-calibrated commit **~3.5 hr** (mult 0.50)。Day-4 retro Q2 驗證。
- ⭐ **`AD-BottomUpBlueprint-1` 新估法的第 2 個對照點**（W09 首次成立：預測 64 min vs
  實測上界 58.5，誤差 < 10%）：本 phase 10 個交付項 × 8 min = **80 min**。
  兩個預測差 2.6 倍，retro Q2 必須說明哪一個接近實測。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ~~**循環 FK**：父表指向子表、子表指向父表~~ | ✅ **Day-0 D3 已關閉（量測，非推論）** —— Prisma 表達得出來、DDL 順序正確、runtime probe 證明 MATCH SIMPLE 讓 NULL 指標通過、跨報告指標被 23503 拒絕 |
| ~~**Prisma 不產生 `(id, report_id)` 唯一索引**~~ | ✅ **Day-0 D5 已關閉** —— `@@unique` 產出 `rm_report_versions_id_report_id_key`，migration 不必手寫 |
| **D1（Day-0）**：plan 原寫「EDIT `ref-code.ts` +2 前綴」，但該檔 `:65-69` 明文拒絕建前綴登記表 | `ref-code.ts` 轉 **UNTOUCHED**；前綴宣告為新 repository 的 module 常數，與既有 12 個前綴比對無衝突 |
| **D2（Day-0）**：plan 原列 2 個 repository 檔；repo 兩種先例並存 | 採 `asset.repository.ts` 先例用**一個檔** —— 發版是跨兩表的單一交易，拆檔會把交易推給 controller |
| **「至多一個現行版」若改用 partial unique index 會與 C 方案衝突** | C 方案下該不變式**構造上成立**（單值欄位），不加 index；⛔ 不要「補齊」它 |
| **Risk Class D（plan 路徑靠猜）—— W09 同 phase 犯兩次** | §3.0 每一條路徑都已在起草時 `ls` 過；Day-0 Prong 1 再驗一次「新檔該放哪」而不只是「plan 說在哪」 |
| **`AD-NeutraliseRebuiltState-1`**：中性化改 live DB 會被 int setup 重建覆蓋 | 中性化一律改 **migration 來源**，跑完整 int setup |
| **`AD-BorrowedRefusal-1`（已 5 次）**：新表的拒絕可能由上游 `ref_code` counter 代勞 | 中性化清單必須含一項**預測不動**的；寫測試時就先問「拿掉本表的守衛它還會紅嗎」 |
| **Risk Class C（陳舊進程）** | 本 phase 不起 dev server（無 UI）；int 測試每次重建資料庫 |
| **R4 敞口再擴大**：兩張新表同樣無稽核軌跡（ADR-0003 未拍板） | 不緩解，**記錄**：closeout 時 RISK_REGISTER 的 R4 由 15 → **17** 張表 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **從 live register 產生快照** — M7/M8；本 phase 只保存呼叫端給的 payload
- **`sheet` JSONB 的結構驗證** — 併入 `AD-AssessmentDefinitionUnvalidated-1` 家族
- **保存期限與處置**（`05:76` 三年） — 等 `retention_policy` / `LegalHold`（另一片）
- **`StatementOfApplicability`** — 同屬「受控交付物」但 `framework_id` 指向索引上不存在的
  `Framework` 實體，需先裁決 → 新 AD
- **委員會成為一等公民** — `AD-Model-Gaps`；本 phase 照 `02a:262` 用 free text
- **`state` 欄位** — 記錄為 deviation，不是待辦
