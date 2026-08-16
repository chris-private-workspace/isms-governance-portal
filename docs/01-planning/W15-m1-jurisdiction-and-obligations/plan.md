---
status: closed_partial   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W15 Plan — M1 slice 10: the jurisdiction spine and the obligation library

**Summary**: 建 `Jurisdiction` · `Regulation` · `Obligation` 三張表，並補上 `OrgEntity.jurisdiction_id`
—— 那個欄位在 `02a:159` 有規格、而 `schema.prisma` **對 `jurisdiction` 全檔零命中**，正因為父表不存在。
**關鍵範圍決策**：三張表**全部是全域參考資料**（無 `org_entity_id`、無 RLS，複製 W05 的
`threats`/`vulnerabilities` 形狀）· **不建端點**（今天沒有寫者）· **不建 `status`**（§4 無 lifecycle）。
⚪ **無 UI** → drive-through 不適用，一律標 **gate-only verified**。
❌ **不需要 design note**（feature continuation，非 spike）。

**Status**: **`closed_partial`**（2026-08-16 closeout；**MERGED PR #67**，`d01d505`）——
⚠️ **partial 的理由只有一個，寫在這裡而不是四捨五入掉**：**AC-2 從未被驗證** ——
「欄位逐個對上 `02a:161` / `:198` / `:200`，且不含 D2 的四個 base 欄位」這個比對
**沒有被執行也沒有被寫下來**，而且今天**加一個欄位或拿掉一個欄位，全部 gate 都不會紅**
（`AD-W15ConstraintSurfaceUntested-1`）。其餘 10 條 AC 達標。
原核可紀錄保留於下 —— §3.1 的 **D1–D5 五個決策點
全部照建議拍板同日**。其中 **D1（`obligations` 進全域參考清單）**是唯一**擴充既有規則**的一項，
依 `multi-tenant-data.md:81` 的程序走：舉證寫進該檔本身 + PR 描述複述。
其餘四個都是複製既有先例（D2 ← `Threat` 形狀 · D3 ← W13 對無寫入路徑模型的裁決 ·
D4 ← `Policy` · D5 ← 不預先宣稱不知道的事）。
↓ **以下為原始核可紀錄，不覆寫** ↓
**原 Status**: **Draft** —— 待使用者核可。

**Branch**: `feature/W15-jurisdiction-and-obligations`
**Base**: `main` HEAD `52a74ac`（CH-032 收尾 —— 關掉本 repo 唯一有日期的死線）
**Slice**: M1 slice **10 / N**（22 → **25 / 35** 實體）。不關閉任何 AD；⚠️ 可能**新增** 1 條（見 §3.1 D4）
**Scope decisions**: (a) 三張表皆全域參考、無 RLS (b) 零端點、以 seed 承載資料
(c) 無 `status` / `ref_code` / `owner_user_id` / `extensions`（精簡參考庫形狀）
(d) `OrgEntity.jurisdiction_id` nullable (e) `Regulation.version` 只留 base int

---

## 0. Background

### The gap（M1 DoD 的 13 張未建表中，依賴鏈最深的三張）

`02a:427` 規定 `Obligation → Regulation / Jurisdiction` 兩條 N:1 **都是 required**，
所以這三張表**不能拆開建** —— 先建 `Obligation` 會沒有父表可指。

而 `Jurisdiction` 自己**零 FK 依賴**，是這 13 張裡唯一的根參考表，
同時是 `OrgEntity` 一個**已規格但未建**欄位的父表。

### Why it matters（缺失的能力）

「管轄區」是本平台**已確認參數 #4**（11 個管轄區 / 13 家 OpCo）的資料層承載體，
而今天它只存在於文件裡：`schema.prisma` 對 `jurisdiction` **零命中**，
所以「這家 OpCo 屬於哪個管轄區」在資料庫裡**問不出來**。

`07:33` 的 M2 DoD 明寫 *"jurisdiction tagging for the obligation library"* ——
本片交付那句話的資料層一半。⛔ **另一半（義務庫的內容填充）是 D003，Wave 2「建介面不填充」。**

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `52a74ac`）| Anchor |
|-------|--------------------------------------------|--------|
| Schema | `jurisdiction` 全檔**零命中**（大小寫不敏感） | `apps/api/prisma/schema.prisma` |
| Spec | `OrgEntity` 規格含 `jurisdiction_id` (FK) | `02a:159` |
| Spec | 三張表的欄位逐個列出（4 / 5 / 5 個） | `02a:161` · `:198` · `:200` |
| Spec | `Obligation` 的兩條 N:1 **required** | `02a:427` |
| Spec | ⚠️ `every domain record → OrgEntity` 也標 **required** | `02a:430` |
| Rule | `jurisdictions` / `regulations` **已在合法全域清單上** | `docs/rules-on-demand/multi-tenant-data.md:64` |
| Rule | ⛔ `obligations` **不在**該清單上；預設是「有 `entity_id`」，例外**要舉證** | 同上 `:81` |
| Precedent | W05 對 `threats`/`vulnerabilities` 的原話：*"this phase is the first that simply matches a row already on the list. **Nothing here widens it.**"* | `migrations/20260811024841_asset_and_risk_chain/migration.sql:30-33` |
| Precedent | 已建的參考庫形狀**精簡**：無 `org_entity_id` / `ref_code` / `status` / `owner_user_id` / `extensions` | `schema.prisma:779`（`Threat`）· `:797`（`Vulnerability`）|

→ 三張表裡**兩張**只是 match 已在清單上的列（零加寬），**一張**（`obligations`）需要走
`multi-tenant-data.md:81` 的舉證程序。⇒ 本片的設計工作集中在那一張，其餘是複製。

### The design（3 張新表 + 1 個既有表加欄位 + seed；零應用層變更）

```
NEW   migrations/<ts>_jurisdiction_and_obligations/migration.sql
        CREATE TABLE jurisdictions   (id, code UNIQUE, name, residency_policy, notes, version, ts…)
        CREATE TABLE regulations     (id, name, jurisdiction_id FK, effective_date, source_url, version, ts…)
        CREATE TABLE obligations     (id, regulation_id FK, jurisdiction_id FK, reference, text, summary, version, ts…)
        ALTER TABLE org_entities ADD COLUMN jurisdiction_id UUID NULL REFERENCES jurisdictions(id)
        -- ⛔ 三張表皆無 RLS、無 GRANT 變更（全域參考資料）
EDIT  prisma/schema.prisma           3 個 model + OrgEntity 加 1 欄 + 1 個 enum
EDIT  test/int-global-setup.js       seed 11 個管轄區 + 把既有 OpCo seed 指過去
EDIT  docs/rules-on-demand/multi-tenant-data.md   全域清單 +1 列（obligations）+ 舉證
NEW   src/core-model/…               ⛔ 無 —— 本片零 repository、零 controller、零端點
UNTOUCHED  audit-trail/audit.module.ts（AUDITED_MODELS 不動 —— 見 §3.1 D3）
```

**為何零端點**：`Threat` / `Vulnerability` 建了五個 phase 至今沒有端點，而那**不是遺漏**
—— 它們在 W13 記錄的「5 個模型今天沒有 repository 寫入路徑」名單上，理由是加進稽核清單
等於加一個不會被觸發的名字（AP-3）。本片三張表今天同樣**沒有寫者**：
11 個管轄區是集團固定事實（已確認參數 #4），法規內容是 **D003**（Wave 2「建介面不填充」）。

### Ground truth（recon head-start —— 於 `main` HEAD `52a74ac` 讀過的 code）

- `schema.prisma:779` / `:797` — `Threat` / `Vulnerability` 的實際欄位集（本片的形狀藍本）
- `schema.prisma:343` — `ExtensionField.orgEntityId` 是 **nullable**（第三種形狀，本片**不採用**）
- `schema.prisma:81` — `OrgEntity` 現有欄位，**無 `jurisdictionId`**
- `migration.sql:30-33`（W05）— 「no RLS，因為已在清單上」的原始論證
- `multi-tenant-data.md:57-66` — 合法全域清單五列 · `:81` 新增要舉證

**Baselines（W14 closeout）**: api unit **480 / 40 suites** · api int **218 / 17** · web **10 / 1** ·
lint 0 · type-check 0 · build 0 / 0 · coverage **92.14 / 91.77 / 98.98 / 93.56** ·
`run_all` **8 / 8** · `check_entity_index` **22 / 35**。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-jurisdiction-absent** — 重驗 `jurisdiction` 在 schema 與 migrations **兩邊**都零命中
  （本 plan 只驗過 schema）→ 若 migrations 裡已有殘留，§3.1 D5 的形狀要改
- **D-orgentity-rls** — grep `org_entities` 的 policy 形狀：加一個 nullable FK 欄位是否需要重寫
  （W14 的 D3 對 `policies` 問過同一件事，答案是不需要）→ 影響 §4 的 migration 內容
- **D-seed-orgentity** — `int-global-setup.js` 現有的 OpCo seed 有幾列、`code` 是什麼
  → 決定 seed backfill 寫得出來還是要新增列
- **D-refcode-counter** — 確認 `ref_code` 真的**不在**參考庫形狀上（`Threat` 無此欄位），
  否則本片要動 `RefCodeCounter` → 移動 §3.1 D2
- **D-audit-drift-guard** — ⭐ 本片新增 3 個 model 而**不接稽核**。W13 的漂移守衛從
  `core-model` 原始碼導出寫入面 ⇒ **沒有 repository 就不該轉紅**。Day 1 要**實際觀察到它仍綠**，
  而不是假設（W14 是反向對照：有 repository 而未接清單 ⇒ 恰好 1 紅）

## 1. Phase Goal

把已確認參數 #4 的「11 個管轄區」從文件變成 runtime，並補上 `02a:427` 要求的義務庫依賴鏈根部：
三張全域參考表 + `OrgEntity.jurisdiction_id`，`check_entity_index` 由 **22 / 35 → 25 / 35**。
證明方式是 gates + **兩個負面測試**（跨實體可讀性 · FK 完整性）+ **一次中性化**（§5 AC-6）。
⚪ 純資料層，**無 user-facing surface** ⇒ drive-through 不適用，報告一律標 `gate-only verified`。
不產出 design note（feature continuation）；⛔ **不產出 ADR** —— §3.1 D1 是走既有規則的舉證程序，
不是新的架構決定（對照：W04 對 identity 的擴充**升級成了 ADR-0012**，因為它推翻了「範疇是人的屬性」）。

## 2. User Stories

- **US-1**（schema）: 作為平台，我希望有 `Jurisdiction` 表，以便「這家 OpCo 屬於哪個管轄區」
  在資料庫裡問得出來，而不只是寫在文件上。
- **US-2**（schema）: 作為合規模組（Wave 2），我希望 `Regulation` / `Obligation` 的表與依賴鏈已存在，
  以便內容訂閱到位時只需填充、不需重新設計結構。
- **US-3**（governance）: 作為 reviewer，我希望 `obligations` 沒有 `org_entity_id` 這件事
  **有一份寫下來的舉證**，以便它不會在下一次審計被當成隔離缺口。
- **US-4**（integrity）: 作為稽核者，我希望這三張表的全域可讀性與 FK 完整性**各有一個會紅的測試**，
  以便「它們是刻意全域的」不是一句宣稱。
- **US-5**（closeout）: 作為下一個 session，我希望 calibration / BACKLOG / 導航檔已更新，
  以便接手時不必重建脈絡。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW      apps/api/prisma/migrations/<ts>_jurisdiction_and_obligations/migration.sql
EDIT     apps/api/prisma/schema.prisma                      +3 model +1 enum +1 欄位
EDIT     apps/api/test/int-global-setup.js                  +11 jurisdiction seed，OpCo 指過去
NEW      apps/api/src/core-model/jurisdiction.int.spec.ts   全域可讀 + FK 完整性
EDIT     docs/rules-on-demand/multi-tenant-data.md          全域清單 +1 列（obligations）+ 舉證
UNTOUCHED apps/api/src/audit-trail/audit.module.ts          AUDITED_MODELS 不動（D3）
UNTOUCHED apps/api/src/contracts/                           零端點 ⇒ 零契約變更
UNTOUCHED apps/web/                                         無 UI
```

### 3.1 五個決策點（US-1..US-3）— ⛔ **核可時請一併拍板**

| # | 決策 | 建議 | 依據 / 代價 |
|---|---|---|---|
| **D1** | `obligations` 有沒有 `org_entity_id`？ | ⭐ **沒有**（列入全域參考清單，並在該檔寫下舉證）| `02a:200` 的五個欄位**全部是法規內容**（`regulation_id`/`jurisdiction_id`/`reference`/`text`/`summary`）—— 沒有任何 per-entity 的東西。法規條文對 13 家 OpCo 是同一份。⭐ **per-entity 的適用性住在 `ObligationControlMapping`**（`10:69`，Wave 2，且**不在 §0 索引上** ⇒ 本片不建）。⚠️ **代價**：這**擴充**了 `multi-tenant-data.md` 的清單（+1 列），是本片唯一加寬規則的動作 ⇒ 舉證必須寫進該檔與 PR 描述（`:81` 要求） |
| **D2** | 三張表要不要 `ref_code` / `status` / `owner_user_id` / `extensions`？ | ⭐ **都不要** | 複製 `Threat`/`Vulnerability` 的實際形狀（`schema.prisma:779`）—— 已建的參考庫只有 id + 業務欄位 + `version` + timestamps + `retired_at`。⛔ `status` 另有獨立理由：`02a` §4 的 lifecycle 清單**沒有這三個實體**（與 W14 `Attestation.status` **同一個判準**：沒有值域來源就不建，否則是自己發明一份業務從未同意的詞彙表）。`ref_code` 不建則避免動 `RefCodeCounter`（那是 per-entity 序列，對全域表沒有意義）|
| **D3** | 要不要接 `AUDITED_MODELS`？ | ⭐ **不要**（`audit.module.ts` UNTOUCHED）| 三張表**零 repository、零寫入路徑** ⇒ 加名字等於加一個不會被觸發的名字（AP-3）。這正是 W13 對那 5 個模型的原始裁決。⭐ **而漂移守衛會替我們把關**：它從 `core-model` 原始碼導出寫入面，所以「哪天有人加了 repository 卻忘了接」會轉紅 —— Day 1 要**實際觀察到它現在仍綠**（見 §0 D-audit-drift-guard）|
| **D4** | `Regulation.version`（`02a:198`）與 §1.1 base `version` int（`02a:95`）**撞名** | ⭐ **只留 base int**，複製 `Policy` 的既有做法（`schema.prisma:272`）| ⚠️ **代價要寫下來**：法規的「版本」（例如 `2012 Rev.3`）與樂觀鎖計數器是**兩個語意**，只留後者等於**丟掉前者**。⛔ `Policy` 已經付過同一筆代價，**而沒有任何地方記錄它** ⇒ 本片**新增 1 條 AD** 追蹤這個第 2 次出現的碰撞（規則：同形狀 2 次即立規則）。**替代方案**（改名 `edition`）被否決的理由：偏離規格字面，而 W11 的「欄位名不叫 `framework_id`」先例是**名字不該宣稱不存在的邊**，這裡沒有那個問題 |
| **D5** | `OrgEntity.jurisdiction_id` 是 NOT NULL 還是 nullable？ | ⭐ **nullable** | `02a:159` 只寫 `(FK)`，未指定 obligation。⛔ **NOT NULL 需要對既有 seed 做 backfill，而 backfill 的正確性今天無法驗證**（哪家 OpCo 屬哪個管轄區是業務事實，本片不發明它）。nullable + seed 把已知的指過去，是**不預先宣稱不知道的事**。⚠️ 若後續 M2 要收窄成 NOT NULL，那是一次 migration；反向（放寬）才是不可逆的 |

### 3.x 明確不做的事

- ⛔ **`cross_border_*` / `deployment_region` 七個欄位** —— `02a:163-177` 的 banner 明寫
  **NOT BUILT in Wave 1**，且 CLAUDE.md guardrail 8 說「建了就是 AP-5」。
  ⭐ 但 **`residency_policy` 要建** —— 它在 banner **之外**（`02a:161` 本體），是一個**分類標籤**
  不是在地化能力。⚠️ 誠實記錄：今天 11 個管轄區**全部會是 `none`**（D001），
  所以那個 enum 的另外兩個值今天零列使用 —— **這不是 AP-5**（值域由規格固定，不是我發明的），
  但它是一個要在 progress.md 寫下來的事實。
- ⛔ **`ObligationControlMapping`**（`02a:426` 的 M:N）—— `10:69` 是 Wave 2，且**不在 §0 索引上**，
  而 `02a:18` 說不在索引上的東西不可建。
- ⛔ **端點 / repository / controller** —— 見 §0 The design。
- ⛔ **`OrgEntity` 的 RLS 重寫** —— 加一個 nullable 欄位不需要（W14 D3 對 `policies` 已量過同形）。

### 3.y Validation（US-1..US-5）

Gates（各自 exit code 分開取）: `format:check` · `lint` · `type-check` · `build` api/web ·
`lint:negative`（⚠️ **root script，不可加 `-w apps/api`**）· api unit · **api int** · web ·
coverage · `run_all` **8/8** · `check_entity_index` **25 / 35**。
⚪ **無 drive-through**（純資料層，無 user-facing surface）—— 報告一律標 `gate-only verified`。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/migrations/<ts>_jurisdiction_and_obligations/migration.sql` | NEW |
| 2 | `apps/api/prisma/schema.prisma` | EDIT |
| 3 | `apps/api/src/generated/prisma/**` | REGEN（⛔ **`prisma generate` 必跑** —— `AD-PrismaEnumThreeTruths-1`：本片新增一個 enum）|
| 4 | `apps/api/test/int-global-setup.js` | EDIT |
| 5 | `apps/api/src/core-model/jurisdiction.int.spec.ts` | NEW |
| 6 | `docs/rules-on-demand/multi-tenant-data.md` | EDIT（全域清單 +1 列 + 舉證）|
| 7 | `docs/01-planning/W15-*/{progress,retrospective}.md` | NEW |
| 8 | `docs/03-implementation/changes/CH-033-w15-jurisdiction-and-obligations.md` | NEW |
| — | `apps/api/src/audit-trail/audit.module.ts` | **UNTOUCHED**（D3）|
| — | `apps/api/src/contracts/**` · `apps/web/**` | **UNTOUCHED**（零端點、無 UI）|
| — | `apps/api/src/core-model/*.repository.ts` | **UNTOUCHED**（零 repository）|

## 5. Acceptance Criteria

1. `check_entity_index` 回報 **25 / 35**（機械導出，不手數）。
2. 三張表存在，欄位逐個對上 `02a:161` / `:198` / `:200`，且**不含** D2 列出的四個 base 欄位。
3. `org_entities.jurisdiction_id` 存在、nullable、FK 指向 `jurisdictions(id)`；既有 seed 列已指過去。
4. **負面測試 A（全域可讀）**：以 SG1 範疇連線讀得到**所有** 11 個管轄區
   —— ⛔ 且該測試必須在**移除 seed 之外的任何 RLS 假設下仍成立**（它證明的是「沒有 policy」）。
5. **負面測試 B（FK 完整性）**：`obligations` 指向不存在的 `regulation_id` 被拒（**23503**），
   且指向不存在的 `jurisdiction_id` 同樣被拒。⚠️ 斷言用 SQLSTATE，不用訊息字串。
6. ⭐ **中性化 N1**：移除 `org_entities.jurisdiction_id` 的 FK 約束 → **AC-3 的測試轉紅**，
   且**其餘測試一條不動**。預期方向**先 commit 再執行**（W13/W14 紀律）。
7. ⭐ **中性化 N2**：暫時給 `jurisdictions` 加一條 entity-scoped RLS policy →
   **AC-4 轉紅**。⛔ 這是本片唯一能證明「全域是刻意的」而不是「忘了加 RLS」的實驗。
8. `multi-tenant-data.md` 的清單含 `obligations` 一列且**帶舉證**；PR 描述複述該舉證（`:81` 要求）。
9. 十三項 gate 各自 exit code 全 0，數字逐項記入 progress.md。
10. **不需要 drive-through**（純資料層）—— 報告標 `gate-only verified`，⛔ 不得暗示可用性。
11. D4 的 AD 已寫入 BACKLOG；calibration 已回填 `CALIBRATION-MATRIX.md`；導航檔 + BACKLOG 已更新。

## 6. Deliverables

- [ ] US-1 `Jurisdiction` 表 + `OrgEntity.jurisdiction_id` + 11 個管轄區 seed
- [ ] US-2 `Regulation` + `Obligation` 表與依賴鏈（`02a:427` 兩條 required N:1）
- [ ] US-3 `multi-tenant-data.md` 全域清單 +1 列 + 舉證（D1）
- [ ] US-4 `jurisdiction.int.spec.ts`：AC-4 / AC-5 兩個負面測試 + 兩次中性化（AC-6 / AC-7）
- [ ] US-5 closeout：CH-033 · retrospective · calibration · BACKLOG · 導航檔

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（Read `CALIBRATION-MATRIX.md:54` —— **第 8 個資料點**，
  7 點跨 0.23~1.24，W14 為 1.13 IN，狀態 KEEP）。
  ⚠️ **本片比前七點更偏「複製」**：零端點、零 repository、零 controller，
  且三張表的形狀有一個逐欄位可抄的藍本（`Threat`）⇒ 若 ratio 明顯低於 band，
  **那是 class 判斷過寬的訊號**（本片可能屬於一個更窄的 `schema-only` class），Day 4 retro Q2 要答這件事。
- **Agent-delegated: `no`**（三張表加起來的實作面小於一次委派的協調成本；
  Day 0 的規格調查已由 agent 完成）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est ~**3.6 hr**（Day 0 verify 0.6 · schema + migration 1.0 · seed 0.4 ·
  int spec 0.8 · 兩次中性化 0.4 · closeout 0.4）→ class-calibrated commit ~**1.8 hr** (mult 0.50)。
  Day-4 retro Q2 驗證。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ⛔ **`prisma migrate dev` 對任何人都被擋住**（W10 留下的 checksum 衝突，`AD-DevDbChecksumDrift-1` —— W14 是**第三次**撞上、第三次繞開）| **手寫 migration + UTC 時間戳**（`AD-MigrationTimestampTz-1`）。⚠️ 本片會是**第四次**繞開 —— 在 retro 明寫，因為「每次繞開都很便宜」正是它活到第四次的原因 |
| ⛔ **新增 enum（`residency_policy`）⇒ generated client 也驗證它** | `AD-PrismaEnumThreeTruths-1`（W14 N3b 實測）：schema / generated client / DB catalog **三份真相**。migration 之後**必跑 `prisma generate`**，且 §4 已把 REGEN 列為明確項 |
| **Risk Class C（陳舊長駐程序掩蓋 wiring）** | ⚪ 本片無 dev server；int suite 的 global setup 每次 DROP + CREATE + migrate + seed ⇒ 結構上不成立。**記錄而非打勾略過** |
| `AD-TextEditStructuralScope-1`：改 `int-global-setup.js` 的 seed 用字串操作 | ⛔ W14 **同一天犯兩次**。本片改 seed 時**錨定結構邊界**（唯一 ref code / 含換行的完整界定符）+ `assert` 計數符合預期 |
| 加 `jurisdiction_id` 到 `org_entities` 可能需要重寫其 RLS | Day-0 **D-orgentity-rls** 先量（W14 D3 對 `policies` 的同形答案是不需要）。⛔ 量了再寫，不假設 |
| **D1 擴充了一條既有規則** | 舉證寫進 `multi-tenant-data.md` 本身 + PR 描述（`:81` 明文要求）。⚠️ 若使用者不同意 D1 ⇒ `obligations` 改為帶 `org_entity_id` + RLS，**本片工作量約增加 40%**（多一組 policy + 四項範疇測試）|
| ⛔⭐ **Day-0 D7：plan 從頭到尾沒有寫 GRANT，而先例是 `SELECT` only** | 三張表照 `threats`/`vulnerabilities` 抄 **`GRANT SELECT` only**。⭐ 這**強化**了 §3.1 D3 的論證（從「今天沒有寫者」變成「**寫者被資料庫層擋著**」），⛔ **但它讓 §5 AC-5 的 FK 測試不能走應用層** —— 必須以 superuser 連線，與 W02 那 8 個「完全不經應用層」的測試同形。**AC-5 的連線在原文中是空白，Day 2 前補上** |
| **Day-0 D8：seed 範圍需要一個 §3.0 沒做的三分** | `jurisdictions` 11 列（集團固定事實 + AC-4 需要）· `regulations` **2 列** · `obligations` **1 列**，後兩者**僅為讓 FK 鏈可測的最小 fixture**。⛔ **與 D003「填充義務庫」的區分必須寫進 seed 註解**，否則會被讀成內容訂閱已開始。⚠️ 條文用佔位文字，**不抄真實法條**（本 repo 無授權的法規全文）|
| **Day-0 D3：`APAC` 是 region 節點，結構上沒有單一管轄區** | §3.1 D5（nullable）的理由由「backfill 不方便」升級為「**NOT NULL 表達不出組織階層的根節點**」。決定不變，論證更強 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **`cross_border_*` / `deployment_region` 七欄** — `02a:163` banner + guardrail 8；**規格保留、不建**
- **`ObligationControlMapping`** — Wave 2（`10:69`），且不在 `02a` §0 索引上
- **端點 / repository / 稽核接線** — 有寫者時才建（D3）；漂移守衛會在那天叫
- **`Event` · `posture_snapshot` · ISMS profile 四表 · retention / access 四表** — slice 11..N；
  ⚠️ 其中 **`Event` 需要一次使用者裁決**（`02a:417` 五態 vs `11:45-57` 九態互相矛盾），
  **`posture_snapshot` 的 `rag` 需要選 `AD-RiskBand-1` 的一邊**
- **`Regulation` 版本語意**（D4 丟掉的那個）— 新增 AD 追蹤，不在本片解
