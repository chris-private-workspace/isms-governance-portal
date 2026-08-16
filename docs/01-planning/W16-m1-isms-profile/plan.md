---
status: active   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W16 Plan — ISMS profile: five entity-scoped tables, no endpoints

**Summary**: 建 `13-isms-profile-module.md` §Data model 的四張表 + **第五張 `ISMSProfileVersion`**
（使用者裁定，`02a:18` 允許「adding an entity means adding a row here **in the same change**」），
加 4 個 enum 與 `13:21`/`13:27` 的 **10 個 agreed-field 欄位**（11 選 1 被 `02a:437` 擋下，見 D13）
⇒ **25 / 35 → 30 / 36 實體**。**零端點、零 repository、零 controller** —— 消費者在 M6c。
與 W15 slice 10 的差別是**這五張是 entity-scoped 不是全域**，RLS policy、複合 FK、`GRANT`
全部回到承重位置。⛔ `13` 全檔 **70 行**要規格化五張表，與 `02a` / guardrail / 交付物 **14 處**
不一致，§3.1 逐條裁決。⚪ 純資料層，**gate-only verified**，無 drive-through。
Feature continuation ⇒ **無 design note**、**無 ADR**。

**Status**: Approved-to-execute（使用者核可 2026-08-16；D4 / D7 / D11-12 已裁定 —— §3.1 標 ✅USER。
D13（`posture` 不建）於核可時一併知情通過）

**Branch**: `feature/W16-isms-profile`
**Base**: `main` HEAD `157921f`（`docs(planning): AD-DevDbChecksumDrift-1 is at four…`，PR #70 merged）
**Slice**: M1 slice 11 / N —— M1 的 DoD 仍未達成；本片後其餘 **6** 張表是 slice 12..N
**Scope decisions**: (a) 五張表一起建 —— 四張是一個 FK 閉包，第五張由使用者裁定加入；
(b) 三張子表 + 版本表**加** `org_entity_id`，`13` 沒寫但 guardrail 要求，且 `13` 要跟著改；
(c) 版本表**不帶 `state` 欄**，改用父表 `current_version_id` 指標（**W10 `RMReportVersion` 先例**）；
(d) `13:21`/`13:27` 的 agreed fields **建 10 個**，`posture` 因 `02a:437` 不建

---

## 0. Background

### The gap（M1 DoD · `AD-DesignAlign-7` · ROADMAP 4d 的 `AD-UniqueKeyOracle-1`）

- `02a:60` 把四個實體登記為 **Wave 1**，`check_entity_index.py` 現報 **25 / 35** —— 這四張是缺口的一部分。
- `13:7`：它「is **load-bearing for other modules**」—— 認證範圍決定該實體的風險評估／控制測試／稽核
  要涵蓋什麼。**SoA 已於 W11 建好**，而它的「within its certification scope」今天無處可讀。
- `13:65` 是本片唯一的**新能力**（不在既有範本裡）：「which OP/OS products and services each entity
  may sell — a governance question the region **currently cannot answer in one place**」。
- `ROADMAP.md:82`（4d）把 `AD-UniqueKeyOracle-1` 的落點釘在**下一個 M1 slice 的 Day 0**，
  並自帶警語：**「本列進了 ROADMAP 不等於它會被做」** —— 前兩次就是這樣失效的。

### Why it matters（缺失的能力）

`13:59-65` 列了五個消費者。四個已經存在（風險評估 W05 · 控制測試 W07 · SoA W11 · 滾升 M8），
而它們今天都**假設**認證範圍已知。第五個（approved offerings）今天完全沒有存放處。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `157921f`）| Anchor |
|-------|--------------------------------------------|--------|
| 實體索引 | 四個實體已在索引上、Wave 欄為 `1`；`entities_in_cell` **逐格拆名** ⇒ 加第五個名字即分母 +1 | `02a:60` · `check_entity_index.py:159-169` |
| 索引約束 | 「Nothing is buildable that is not on this list; **adding an entity means adding a row here in the same change**」 | `02a:18` |
| Base fields | `org_entity_id` **Required**；`status` = 「Per the entity's state machine (§4)」 | `02a:92` · `02a:93` |
| 全域關係規則 | `every domain record → OrgEntity \| N:1 \| **required**` | `02a:430` |
| ⛔ **Derivations** | 「posture RAG values are **derived, not stored as source of truth**」；`02a:128` 亦註「Derived for dashboards」 | `02a:437` · `02a:128` |
| 規格本體 | `13` **全檔 70 行**；§Data model 只有四行（`:37/:39/:41/:43`），只給欄位**名稱** | `13:35-43` |
| 子表範疇 | `:39/:41/:43` 三行**只有 `isms_profile_id`，沒有 `org_entity_id`** | `13:39-43` |
| 禁建清單 | 「Governance bodies (ISC / ITSC) as approvers」**明文禁建** | `02a:70` |
| 禁建清單 | 「OS portfolio」= `ApprovedOffering` 的區域對應物，**明文禁建** | `02a:67` |
| 禁建清單 | `Role` / `Permission` **在 M4**，今天沒有 Role 實體 ⇒ `13:31` 的「role they acted under」只能是字串 | `02a:71` |
| 父表現況 | `OrgEntity` 有 `code` / `type`（含 `region`）/ `path` / `jurisdictionId` | `schema.prisma:82-107` |
| 藍本（entity-scoped）| `Attestation`（W14）—— 單表、2 條 RLS、無 `GRANT UPDATE`、**無 `status`** | W14 retro |
| ⭐ 藍本（版本表）| `RMReportVersion`（W10）—— **`state` 與父表指標互斥，只建父表指標**；版本表**一條 `FOR UPDATE` policy 都沒有** ⇒ 不可變性是**構造上為真** | W10 retro · ROADMAP:79 |
| 藍本（零端點）| W15 三張表 —— 零 repository ⇒ 不進 `AUDITED_MODELS`，漂移守衛須以 stub 逼紅證明非恆真 | W15 checklist 1.1a/1.1b |
| Seed 現況 | insert 順序**手工維持**（`:484-511`）；`SEED.*` 是**位置元組**（`SEED.entities` 已 7 元）；計數守衛**自我指涉**（`expected` 取自 `SEED.<key>.length`）| `int-global-setup.js:484-511` · `:759-763` |

→ 五張表的欄位規格**只有 `13` 那四行 + `13:21`/`13:27` 的 agreed field list**，
而它們與 `02a` 的 base fields、CLAUDE.md 的 guardrail、以及設計交付物三方各有出入。
**本片一半的工作是裁決，不是打字** —— §3.1 把 14 處逐條列出，每條給出處與先例。

### The design（entity-scoped 5 表 + 4 enum + RLS + 複合 FK；零應用層）

```
schema.prisma   +5 model  +4 enum
                ISMSProfile（父）+ 10 個 agreed-field 欄位 + current_version_id 指標
                ISMSSite / ISMSContact / ApprovedOffering / ISMSProfileVersion（子）
migration.sql   NEW  5 CREATE TABLE
                     + 5 × ENABLE ROW LEVEL SECURITY + policies
                     + 4 × 複合 FK  references (id, org_entity_id)
                     + 1 × 父表 current_version_id → 版本表（複合）
                     + @@unique(org_entity_id, profile_year)              ← AD-UniqueKeyOracle-1
                     + @@unique(org_entity_id, isms_profile_id, version_label) ← 同上（W10 的原案）
                     + CHECK (user_id IS NOT NULL OR name IS NOT NULL)
                     + GRANT（照 Attestation 先例；⛔ 版本表無 FOR UPDATE ⇒ 不可變）
02a §0 索引     EDIT  :60 那一格加第五個名字 ⇒ 分母 35 → 36
int-global-setup.js  seed：跨兩實體各一 profile + 各自子列 + 各一版本列
isms-profile.int.spec.ts  NEW —— 範疇 / FK / oracle / GRANT catalog / 不可變性
13-isms-profile-module.md EDIT —— 記錄 §3.1 的裁決（guardrail 贏，設計文件要改）
```

**為什麼版本表不帶 `state`**：W10 對 `RMReportVersion` 量到 —— 規格同時給了父表
`current_version_id` 與子表 `state` 兩種「哪一版現行」的說法，而它們**互斥**：翻 `state`
就是編輯一列本應永不編輯的資料。只建父表指標，版本表連 `FOR UPDATE` policy 都不要，
「至多一個現行版」於是變成**構造上為真**而非靠索引維持。`13:31` 的 `state` 由此消失得有理由。

### Ground truth（recon head-start —— 於 `main` HEAD `157921f` 讀過的 code / doc）

- `13:1-70` — 全檔讀過（70 行）。§Data model 四行是**唯一**逐欄位來源
- `13:21` / `13:27` — agreed field list；⚠️ 它們**不在** §Data model 裡（D11/D12 的來源）
- `13:29` — 「**Confirm whether those are still required**」＝ `AD-DesignAlign-7`（🟢 P2）
- `13:31` — 版本行為 `(v, date, by, role, note, state)`；`13:49` — 「versioned **by year**」
- `13:45` — 「**Model those only if actually needed.**」＝ 文件自己下的 YAGNI
- `02a:88-100` §1.1 base fields · `02a:128` + `:437` posture 是導出值 · `02a:430` · `02a:18`
- `schema.prisma:82-107` `OrgEntity`；現有 enum 皆 `snake_case` 值 + `@@map`
- `apps/api/src/core-model/jurisdiction.int.spec.ts` — 零端點表的 int spec **放 `core-model`**
- `apps/api/test/int-global-setup.js` — seed 的唯一家（本 repo **無** `prisma/seed.ts`）
- 設計交付物 `dc.html:3802` — `RAPO` = Ricoh Asia Pacific Operations Ltd, **Hong Kong**（**OpCo code**）
- 設計交付物 `dc.html:3844` — 版本史列的實際形狀（`v3.2` / date / by / note / status）

**Baselines（W15 closeout）**: api unit **480 passed / 40 suites** · api int **225 passed / 18 suites** ·
web **10 passed / 1 file** · lint 0 · type 0 · build clean ·
coverage **92.14 / 91.77 / 98.98 / 93.56** · `run_all` **8 / 8** · `check_entity_index` **25 / 35**。
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-oracle-criterion** — 對每個 `@@unique` 套 `AD-UniqueKeyOracle-1` 判準（ROADMAP 4d）
- **D-grant-precedent** — entity-scoped 表的 `GRANT` 先例逐字量測（W15 D7：每次都一樣的不會舉手）
- **D-rls-shape** — `Attestation` 與 `RMReportVersion` 的 policy 逐字讀 → 五張表各要幾條
- **D-immutable** — `rm_report_versions` 到底有沒有 `FOR UPDATE`／`GRANT UPDATE`，逐字確認
- **D-audit-guard** — 零 repository 的新 model 是否讓漂移守衛轉紅 → §checklist 1.1a/1.1b
- **D-index-arity** — 在 `02a:60` 那一格加第五個名字後，`check_entity_index` 分母確實 → 36
- **D-checksum** — ⛔ `_prisma_migrations` **直接查詢**（`AD-DevDbChecksumDrift-1` 第 5 次）

## 1. Phase Goal

在 `main` 上新增五張 entity-scoped 表 + 一列索引，使 `check_entity_index.py` 由 **25 / 35**
走到 **30 / 36**，且每一條新約束（4 條複合 FK · 1 條父表指標 FK · 2 條 UNIQUE · 1 條 CHECK ·
5 組 RLS policy · GRANT 集合 · 版本表的不可變性）都有一條會因它消失而轉紅的整合測試。
證明方式：13 項 gate 全綠 + **至少 3 次中性化實驗**，每次**事先**寫下預期的紅**形狀**
（不只條數 —— W15 N2 的做法）。
⚪ 零 user-facing surface ⇒ **無 drive-through，報告一律寫 `gate-only verified`**。
Feature continuation ⇒ **不產出 design note**、**不產出 ADR**（§3.1 的 14 個裁決都有既有先例
或既有 guardrail 可援引，無 forcing function）。

## 2. User Stories

- **US-1**（schema）: 作為區域 ISO，我希望每家 OpCo 的 ISMS profile 有結構化的存放處，
  以便認證範圍不再只存在於一份 per-year 的 Excel 分頁裡。
- **US-2**（scoping）: 作為平台維運者，我希望五張表在**資料庫層**就被實體範疇隔離，
  以便一家 OpCo 讀不到另一家的站點、聯絡人、已核准產品清單與版本史。
- **US-3**（governance）: 作為區域治理者，我希望「哪家實體獲准販售哪些 OP/OS 產品與服務」
  有單一存放處，以便 `13:65` 說的那個「currently cannot answer in one place」被關掉。
- **US-4**（版本史）: 作為認證稽核的準備者，我希望 profile 的每次改版留下
  `(v, date, by, role, note)`，且**舊版不可被竄改**，以便它撐得起 `05:77` 的 3 年保存要求。
- **US-5**（規格調和）: 作為未來的實作者，我希望 `13` 與 `02a`／guardrail 的 14 處不一致
  **被寫下來而不是被默默解掉**，以便 M6c 接手時知道每個缺席的欄位是決定還是遺漏。
- **US-6**（closeout）: 作為下一個 phase 的自己，我希望 calibration 有**事先宣告的量法**
  與**逐日時間記錄**，以便第 9 個資料點不再是下限（`AD-CalibrationNoTimeRecord-1`）。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   apps/api/prisma/migrations/<UTC>_isms_profile/migration.sql
NEW   apps/api/src/core-model/isms-profile.int.spec.ts
EDIT  apps/api/prisma/schema.prisma            +5 model +4 enum；header count 22→31
EDIT  apps/api/test/int-global-setup.js        seed：跨兩實體 + 五張表
EDIT  docs/02-architecture/02a-data-model-spec.md   :60 加第五個實體名（02a:18 要求同一 change）
EDIT  docs/02-architecture/13-isms-profile-module.md   記錄 §3.1 的裁決
REGEN apps/api/src/generated/prisma/**         prisma generate（4 個新 enum）
UNTOUCHED apps/api/src/audit-trail/audit.module.ts     零 repository ⇒ 不進 AUDITED_MODELS
```

### 3.1 十四個裁決點（US-1, US-5）

`✅USER` = 使用者 2026-08-16 已裁定 · `⏳` = 等核可 · 其餘有既有先例／guardrail 可援引。

| # | 議題 | 裁決 | 依據 / 先例 |
|---|------|------|------------|
| **D1** | 三張子表沒有 `org_entity_id`（`13:39/41/43`）| **加**，`NOT NULL`，並用**複合 FK** `references: [id, orgEntityId]` + 父表 `@@unique([id, orgEntityId])` | 約束 8 鐵律 1「子表也要，冗餘是故意的」· `02a:92` · `02a:430`。CLAUDE.md：「設計文件若與 guardrail 衝突，**是設計文件要改**」⇒ `13` 一併 EDIT。複合 FK 是本 repo **7 處**既有 pattern |
| **D2** | `ISMSProfile` 的自然鍵 | `@@unique([orgEntityId, profileYear])` | `13:49` 年度版本。**含 `org_entity_id` ⇒ 不是 oracle**，Day 0 覆驗 |
| **D3** | 三張子表的自然鍵 | **不建**任何自然唯一鍵 | `13` 未要求；`(isms_profile_id, site_name)` 兩半皆呼叫端可給而不含 `org_entity_id` ⇒ **正是 W10 量到的 oracle 形狀**。不建即不存在 |
| **D4** ✅USER | 版本歷史 | **建第五張表 `ISMSProfileVersion`**，並在**同一個 change** 把它加進 `02a:60` | `02a:18` 明文允許「adding an entity means adding a row here in the same change」。⚠️ 見 D14 對 `state` 的處理 |
| **D5** | `ISMSProfile.status` | **不建** | `02a:93` status =「Per the entity's **state machine (§4)**」，而 `02a` §4 五個 lifecycle **沒有 ISMS profile**。W14 `Attestation` 同形已裁定不建。→ 新 AD |
| **D6** | `region_code`（`13:37`）| **不建** | `13:13` 的範例值 `RAPO` 經查是 **OpCo code**（`dc.html:3802`），`OrgEntity.code` 已承載；「region」是**結構**（`type='region'` + `path`）不是字串。建它 = 無複合 FK 維持的去正規化副本 = `AD-W15InvariantInCommentOnly-1` (a) 的形狀。→ 新 AD |
| **D7** ✅USER | `certifier_comment_scope` · `company_reply` · `certifier_comment_employees` | **建**（nullable text）| 在 `13:37`/`:39` 的 §Data model 行裡；設計拿掉是 UI 決定（已確認參數 #11）。⇒ **關閉 `AD-DesignAlign-7`** |
| **D8** | `ApprovedOffering.approved_by` | **自由文字**，不是 FK→User | `02a:70`「Governance bodies (ISC / ITSC) as approvers」**明文禁建**；設計填 `'ISC · ' + 人名`。先例：`RiskManagementReport.approved_by`（`schema.prisma:206-209`）|
| **D9** | `approval_status` 值域：`13:43` 四值 vs 設計三值 | **四值** `proposed / approved / suspended / withdrawn` | `13:43` 是 §Data model（程序側）；`Approved/Conditional/Pending`（`dc.html:4472`）是 UI 側。已確認參數 #11。M6c 需一張映射表 → 新 AD |
| **D10** | `ISMSContact` 的「`user_id` **or** `name`」| **兩欄皆 nullable + CHECK**（至少一個非空）| `13:41` 字面即「or」。CHECK 先例：`assessment_instances_sod`（W09）|
| **D11** ✅USER | `13:27` 九個認證屬性 | **建 8 個**：`certification_state`(enum) · `certificate_number` · `certification_body` · `certificate_issued_at` · `certificate_expires_at` · `surveillance_at` · `iso_officer_name` · `review_at`。⛔ 第 9 個 `posture` 見 D13 | 使用者裁定「全建」。⚠️ `iso_officer_name` 與 `ISMSContact(role='ISMS lead')` **語義重疊** ⇒ 兩個真相來源 → 新 AD（不因此不建，但要記下來）|
| **D12** ✅USER | standards toggles（`13:21`）| **建** `iso_27001` · `iso_27017` 兩個 bool | 使用者裁定。與已確認參數 #10（27001 + 27017 是產品定位）一致。⚠️ 交付物兩份自己也不一致（陣列 vs 兩個 bool）—— 取 bool，因為值域封閉 |
| **D13** ⏳🔴 | `posture`（`13:27` 第 9 個）| ⛔ **不建** —— 這是使用者裁定「全建」**之後**才浮出的資訊 | `02a:437`「posture RAG values are **derived, not stored as source of truth**」+ `02a:128`「**Derived for dashboards**」。⛔ 存一個 `posture` 欄 = 直接違反 `02a` 的全域規則。⚠️ 且它連著 `AD-RatingBand-1`（BACKLOG:224）與 `AD-RiskBand-1`（:231）——**同一件事的兩條登記，且對 gate 期限說法互相矛盾（M7 vs M8）**，兩條未合併前沒有權威值域。**若你要覆寫本條**，需要一份記錄在案的偏離（改 `02a:437` 或在 schema docstring 明記），一句話即可 |
| **D14** | 版本表的 `state`（`13:31` 的 `(…, state)`）| **不建 `state` 欄**；改在父表加 `current_version_id`；版本表**無 `FOR UPDATE` policy、無 `GRANT UPDATE`** | ⭐ **W10 `RMReportVersion` 先例**：`state` 與父表指標互斥，翻 `state` 就是編輯一列永不編輯的資料 ⇒ 只建指標，不可變性變成**構造上為真**。附帶解掉「三份文件三個值域」（`13:31` superseded / `README.md:43` Current\|Superseded / `dc.html` Published\|Superseded）—— 值域消失，爭議一併消失 |
| **D15** | 版本表的 `role`（`13:31`「the role they acted under」）| **字串**，不是 FK | `02a:71`：`Role` / `Permission` 在 **M4**，且「no field-level spec」⇒ 今天建 FK 等於先發明一個實體（W11 對 `framework_id` 的同形裁決）|

### 3.2 Schema（US-1, US-4）— `apps/api/prisma/schema.prisma`

- 五個 model 全部帶 `02a` §1.1 base fields（照 `Attestation` 逐欄位抄）
- 四個 enum（值用 `snake_case` + `@@map`，照本檔既有 9 個 enum 的慣例）：
  `OfferingBusinessLine`（`op`/`os`/`other`）· `OfferingType`（`product`/`service`）·
  `OfferingApprovalStatus`（四值，D9）· `CertificationState`（`certified`/`in_scope`/`not_in_scope`，D11）
  ⚠️ `ISMSContact.role` **不新增 enum** —— `13:41` 以括號給值而非正式受控字彙，且只有兩值
- ⛔ **新增 4 個 enum ⇒ 三份真相**（`AD-PrismaEnumThreeTruths-1`）：migration 之後**必跑 `prisma generate`**
- `onDelete` **全部顯式** —— W15 的教訓：Prisma 對 optional relation 預設 `SetNull`，
  與 migration 靜默分歧，且**本 repo 無任何測試斷言 ON DELETE**
- header 的 `Purpose` model count **→ 31**（現況 stale 為 22、實際 26；本片讓它更錯 ⇒ 順手修正，
  `AD-SchemaHeaderStale-1` 的判準是「數字要能被它自己寫出的指令重現」）

### 3.3 Migration（US-2, US-4）— `migrations/<UTC>_isms_profile/migration.sql`

- ⛔ **手寫**（`AD-DevDbChecksumDrift-1` **第 5 次**繞開）+ **UTC 時間戳**（`AD-MigrationTimestampTz-1`）
- ⭐ **Day-0 DR3 修正**：五張表各自 `ENABLE ROW LEVEL SECURITY` **＋ `FORCE ROW LEVEL SECURITY`**。
  原文只寫 `ENABLE` —— 那是一個 guardrail 4 的缺口：沒有 `FORCE`，**表的 owner（= migration
  執行的角色）會完全繞過 policy**，而 int suite 的 app 連線不是 owner ⇒ **測試不會發現**
  （理由逐字在 `attestation/migration.sql:83-84`）
- ⭐ **Day-0 DR5 量測**：policy 條數不再是「待決定」——
  可變表 **3 條** per-command（`_read` FOR SELECT USING · `_insert` FOR INSERT WITH CHECK ·
  `_update` FOR UPDATE USING+WITH CHECK）· append-only 表 **2 條**（無 `_update`）
  ⇒ 本片共 **3×4 + 2 = 14 條**。運算式一律 `"org_entity_id" = ANY (app_entity_scope())`。
  **全 repo 零條 `FOR DELETE` policy、零個 `GRANT DELETE`** —— 不「補齊」它
- ⭐ **Day-0 DR4 量測**：`GRANT` 三層已測得，**不是假設**——
  四張可變表 `GRANT SELECT, INSERT, UPDATE`（照既有 12 張 entity-scoped 可變表的一致形狀；
  ⚠️ **不引用 `13:33`** —— DR10 量到它與 `permMatrix.js:11` 對「誰能編輯」正面矛盾）；
  版本表 `GRANT SELECT, INSERT`（與 `rm_report_versions:121` / `attestations:78` 逐字同形）。
  **全 repo 零個 `GRANT DELETE`** —— 不「補齊」它
- ⛔ **版本表刻意不給 `FOR UPDATE` policy 與 `GRANT UPDATE`** —— 這是 D14 的執行點，
  且要在 banner 註解寫明它是**刻意的**，否則三個月後看起來像忘了加
- banner 註解另寫明 **D1**（子表的 `org_entity_id` 是 guardrail 要求而非 `13` 要求）
  與 **D13**（`posture` 缺席是 `02a:437` 的要求），讓兩個偏離**從 schema 本身看得見**
  （`AD-VendorAuditorSod-1` 的既有做法）

### 3.4 Seed（US-2）— `apps/api/test/int-global-setup.js`

- **跨兩個實體各一個 profile** —— 範疇測試需要「別人的列」才能證明讀不到
- 每個 profile 各配 1 site / 1 contact / 1 offering / 1 version
- ⛔ **insert 順序是手工維持的，沒有任何東西在檢查它**（`:484-511` 逐條讀過）：
  五張新表必須排在 `org_entities` **之後**，四張子表在 `isms_profiles` 之後
- ⛔ `SEED.*` 是**位置元組**（`SEED.entities` 於 `:504` 已 7 元，W15 加寬過一次）——
  正是 `AD-TextEditStructuralScope-1` 的形狀。編輯用**結構邊界錨定**，不用行號或序數
- ⚠️⭐ **既有計數守衛是自我指涉的**：`:759-763` 的 `expected` 取自 `SEED.<key>.length`，
  與被檢查的陣列同源 ⇒ 抓得到「INSERT 沒落地」，抓不到「`SEED` 陣列被改壞」。
  W15 的外部錨點是 `jurisdiction.int.spec.ts:46-50` 的 `IN_SCOPE`（逐字取自 `15:41`）。
  ⛔ **本片五張表沒有等價的外部事實可錨定** ⇒ 加守衛可以，
  但 **retro 必須明寫它是自我指涉的**，不得寫成「seed 有守衛」
- ⚠️ **不得產生真實個資**（guardrail 7）：聯絡人與 ISO officer 用明顯的佔位姓名

### 3.5 Integration spec（US-2, US-3, US-4）— `apps/api/src/core-model/isms-profile.int.spec.ts`

放 `core-model` 不放 `modules/` —— 本片零 module（先例：`jurisdiction.int.spec.ts`）。
`AD-W15ConstraintSurfaceUntested-1` 明列的四個缺口逐項避開：

1. 跨實體**讀**拒絕（五張表各一）
2. 跨實體**寫**拒絕且資料未變（寫後重查確認）
3. RLS 層獨立成立（`rls-direct` 風格，**逐表**斷言 `relrowsecurity`，不硬編碼表名總數）
4. 複合 FK：子列指向**別實體**的 profile → 拒絕（D1 的唯一證明）
5. `@@unique([orgEntityId, profileYear])`：同實體同年 → 23505；**不同實體同年 → 成功**
6. `@@unique([orgEntityId, ismsProfileId, versionLabel])`：同上兩面（W10 的原案標的）
7. `ISMSContact` CHECK：兩欄皆 NULL → 拒絕
8. ⭐ **版本表不可變**：`UPDATE` 一列已存在的版本 → 拒絕（D14 的唯一證明）
9. ⭐ **`GRANT` 用 catalog 斷言**：對 `information_schema.role_table_grants` 斷言 `isms_app`
   對五張表的 privilege 集合**恰好等於**預期（`toEqual` 排序陣列，不是 `toContain`）——
   多一個 verb 自動紅（`AD-W15ConstraintSurfaceUntested-1` (c) 明列的修法）
10. `check_entity_index` **30 / 36**

⚠️ **測試名不得寬於證明**（`AD-TestNameWiderThanProof-1`，3/3 已達結構性解法門檻）。

### 3.x 明確不做的事

- **端點 / repository / controller / DTO** — M6c（`07:39`）。今天沒有寫者
- **稽核接線** — 零 repository ⇒ 不進 `AUDITED_MODELS`（W15 D3 同形）。
  ⚠️ 但**必須證明守衛不是恆真**（§checklist 1.1a/1.1b）
- **D5 / D6 / D13 裁掉的欄位** — 各記一條 AD，不靜靜消失

### 3.y Validation（US-1..US-6）

Gates（**十三項各自取 exit code，不合併回報** —— `AD-PartialGateReportedAsFull-1` 三次全是
`format:check`）：`format:check` api · web · `lint` api+web · `type-check` api+web · `build` api ·
`build` web · `lint:negative` · api unit · **api int** · web unit · coverage ·
`run_all` **8/8** · `check_entity_index` **30/36**。
⚪ **無 drive-through** —— 零 user-facing surface；報告一律寫 `gate-only verified`。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT（+5 model +4 enum；header count → 31；MHist +1 行）|
| 2 | `apps/api/prisma/migrations/<UTC>_isms_profile/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/isms-profile.int.spec.ts` | NEW |
| 4 | `apps/api/test/int-global-setup.js` | EDIT（seed 跨兩實體 × 五張表）|
| 5 | `apps/api/src/generated/prisma/**` | REGEN（`prisma generate` —— 4 個新 enum）|
| 6 | `docs/02-architecture/02a-data-model-spec.md` | EDIT（`:60` 加 `ISMSProfileVersion`；`02a:18` 要求同一 change）|
| 7 | `docs/02-architecture/13-isms-profile-module.md` | EDIT（記錄 D1 / D5 / D6 / D13 / D14 / D15）|
| 8 | `docs/01-planning/W16-m1-isms-profile/{plan,checklist,progress,retrospective}.md` | NEW |
| 9 | `docs/03-implementation/changes/CH-034-w16-isms-profile.md` | NEW（CH-034 已驗證未被佔用）|
| 10 | `docs/01-planning/{BACKLOG,ROADMAP,RISK_REGISTER,CALIBRATION-MATRIX,CALIBRATION-LOG}.md` | EDIT（closeout）|
| 11 | `CLAUDE.md` · `MEMORY.md` · `memory/project_w16_isms_profile.md` | EDIT / NEW（closeout，各 1 行）|
| — | `apps/api/src/audit-trail/audit.module.ts` | **UNTOUCHED** —— 零 repository（但須證明守衛非恆真）|
| — | `apps/api/src/modules/**` | **UNTOUCHED** —— 零端點 |
| — | `apps/web/**` | **UNTOUCHED** —— 零 UI |

## 5. Acceptance Criteria

1. `check_entity_index.py` 報 **30 / 36**，五個 model 名逐字對上 `02a:60`。
2. 🔴 **§3.1 的 15 個裁決逐條可執行驗證** —— 每個「不建」的欄位有一條 grep 證明它不在 schema，
   每個「建」的欄位有一條測試或斷言碰到它。
   ⛔ **本條是針對 W15 `closed_partial` 唯一理由寫的**：W15 的 AC-2「欄位逐個對上 `02a`」
   從未被執行也從未被寫下來。本片**必須產出一份逐欄位對照表進 progress.md**，
   否則本片同樣不得標 `closed`。
3. 五張表各有 RLS policy 且 `rls-direct` 風格測試獨立成立（不經應用層）。
4. 複合 FK：子列指向別實體 profile 被拒絕，且該測試**拿掉複合 FK 後會轉紅**（中性化證明）。
5. 兩條 `@@unique` 各驗兩面：同實體重複 → 23505 / **不同實體同值 → 成功**
   —— `AD-UniqueKeyOracle-1` 的判準在本片被**正面**驗證而非只是宣稱。
6. **版本表不可變**：`UPDATE` 被拒絕，且該拒絕**不是**靠應用層。
7. `information_schema.role_table_grants` 的 catalog 斷言：`isms_app` 對五張表的 privilege
   集合**恰好等於**預期，多一個 verb 即紅。
8. 十三項 gate 各自 exit 0（清單見 §3.y）。
9. **至少 3 次中性化實驗**，每次**事先**寫下預期的紅**形狀**（機制 + 檔案 + 條數）；
   預測錯了要寫下為什麼錯（W15 N1 的做法）。
10. ⚪ **無 drive-through** —— 報告寫 `gate-only verified`（不是省略，是明記）。
11. `AD-UniqueKeyOracle-1`（ROADMAP 4d）在 Day 0 checklist 上有一個**被勾掉的** `[ ]`。
12. Calibration 已記錄且**量法在 plan 就宣告**（見 §7）；progress.md 逐日有時間數字。
13. `AD-DesignAlign-7` 已關閉（D7）；D5/D6/D9/D11/D13 各記一條新 AD；導航檔 + BACKLOG + ROADMAP 已更新。

## 6. Deliverables

- [ ] US-1 五個 model + 4 個 enum 進 `schema.prisma`，migration 套用成功，`prisma generate` 已跑
- [ ] US-2 五張表的 RLS + 複合 FK + GRANT catalog 斷言，各有會轉紅的測試
- [ ] US-3 `ApprovedOffering` 可承載「哪家實體獲准賣什麼」，seed 有跨實體樣本
- [ ] US-4 `ISMSProfileVersion` + 父表指標；不可變性有測試；`02a:60` 已加名字
- [ ] US-5 §3.1 的 15 個裁決寫進 `13` 與 migration banner；裁掉的各記一條 AD
- [ ] US-6 `CH-034` + retrospective + calibration（第 9 點，量法事先宣告）+ 導航檔

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（Read `CALIBRATION-MATRIX.md:54` —— **第 9 個資料點**，
  8 點跨 0.23~1.24，W15 為 **1.235 OVER**，狀態 KEEP、單點不調）。
  ⚠️ **W15 的教訓方向相同且本片更強**：零端點讓實作便宜卻讓驗證變貴（W15 實作 64.4 min /
  驗證 65.9 min）。本片同樣零端點，**但表數是 W15 的 1.67 倍、且 entity-scoped**
  （W15 三張全域表零 RLS policy；本片五張表要 RLS + 複合 FK + 不可變性 + 範疇測試）
  ⇒ **預期驗證面明顯大於 W15**。若 ratio 再次 OVER 那是**連續第 2 點**，
  依 matrix §何時調整需第 3 點才動乘數 —— Day 4 retro Q2 要明寫這件事。
- **Agent-delegated: `no`**（§3.1 的 15 個裁決密度高，委派的監督成本高於自己做；
  Day 0 之前的規格調查已由 agent 完成並經逐行複驗）。`agent_factor` 1.0 → **三段式**。
- **⭐ 量法事先宣告**（`AD-CalibrationNoTimeRecord-1` + `AD-CalibrationDay0InOrOut-1` 的三態要求）：
  **「含 Day 0，且含 plan / checklist 起草」** —— 窗口起點是本 plan 的第一次存檔，
  終點是 closeout commit 的 author date。分子由 **progress.md 的逐日逐任務時間記錄**相加，
  **不由 commit author date 事後反推**；author date 只作為交叉檢查的第二條路徑。
  ⛔ 兩條路徑差距 > 20% 時 retro 要寫下差在哪，**不挑對自己有利的那個**。
- Bottom-up est ~**8.3 hr**（Day-0 verify + 15 裁決覆驗 1.2 · schema 5 model + 4 enum + 10 欄 1.5 ·
  migration（5 表 + RLS + 複合 FK + CHECK + GRANT + 指標）1.6 · seed 0.6 · int spec 1.8 ·
  中性化 ×3 0.6 · `02a`/`13` 文件編輯 0.4 · closeout 0.6）
  → class-calibrated commit ~**4.15 hr** (mult 0.50)。Day-4 retro Q2 驗證。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| 🔴 **Day-0 DR3：plan 原文漏了 `FORCE ROW LEVEL SECURITY`** | 已於 §3.3 修正並標明來源。⚠️ 留下的教訓比修正本身重要：**沒有 FORCE 的 RLS 在 int suite 裡看起來完全正常**（app 連線不是 owner），所以這個缺口**不會被任何現有測試發現** —— 與 `AD-EntityScopeNoDriftGuard-1` 同一個家族 |
| 🟡 **Day-0 DR5：14 條 policy，而 §7 的 migration 估時（1.6 hr）沒有含這個量** | 單點不調承諾（matrix §何時調整需 3 點）。Day-4 retro Q2 要把「估時前不知道 policy 條數」列為 ratio 的已知成因之一 |
| 🟡 **Day-0 DR7：`isms_dev` 落後 5 支 migration** | ⛔ **`prisma migrate diff` 不得拿 `isms_dev` 當基準** —— 用 `--from-empty --to-schema`（W15 做法）或以每次重建的 `isms_test` 為準。用錯基準會把五個 phase 的成果報成「待套用」|
| 🔴 **D13：使用者裁定「全建 11 欄」，而其中 `posture` 撞 `02a:437`** | plan 依「其餘全做、明說少了什麼」處理：**建 10 欄，`posture` 不建並在 §3.1 D13 寫明理由與覆寫方式**。⚠️ 這是裁定**之後**才浮出的資訊，不是我擅自縮小範圍 —— 一句話即可覆寫 |
| ⛔ **`ISMSProfileVersion` 今天零消費者** | AP-3 的正面曝險（「關掉它會壞什麼？」今天答不出來）。⚠️ 使用者已在知情下裁定建它。緩解：不可變性測試 + 父表指標讓它**至少有一條結構性斷言**；`13:31` 的行為規格則是它的 DoD 來源。⛔ retro Q5 的 AP-3 欄要**如實記為 1 次**，不粉飾 |
| ⛔ **`AD-ImmutableRowRetention-1` 直接命中版本表** | 不可變表與 `retired_at`／`05:77` 的 3 年保存互斥 —— 無 `FOR UPDATE` policy ⇒ **沒有任何路徑寫得了 `retired_at`**。比照 `rm_report_versions`：欄位保留、schema docstring 明記它是結構性凍結的，讓缺口**從 schema 看得見**。⛔ 不為了「補齊」現在就加 policy —— 那會拆掉本片唯一的不可變性保證 |
| ⛔ **`prisma migrate dev` 對任何人都被擋住**（`AD-DevDbChecksumDrift-1` —— 本片**第 5 次**）| 手寫 migration + UTC 時間戳。⛔ **本片的 Prong 3 必須直接查 `_prisma_migrations`** —— W15 用 int suite 重建訊息當證據，該 AD 已明列「對本條而言等於沒驗」|
| ⛔ **新增 4 個 enum ⇒ 三份真相**（`AD-PrismaEnumThreeTruths-1`）| migration 之後**必跑 `prisma generate`**，§4 已列 REGEN。W14 實測：generated client 在 runtime 也驗證 enum 值 ⇒ 漏跑會讓分歧只在部署時現形 |
| **改 `02a` §0 索引會動分母**（35 → 36）| Day-0 `D-index-arity` 先驗 `entities_in_cell` 真的逐格拆名；⚠️ 分母變動要在 retro 與 ROADMAP 明講，否則「25/35 → 30/36」看起來像算錯（W09 有分母 −1 的先例，處理方式相同）|
| **實體範疇維度沒有 drift guard**（`AD-EntityScopeNoDriftGuard-1`）| ⛔ 本片新增**五張** entity-scoped 表，是這條 AD 至今最大一次曝險。本片**不實作** detector（治理工作，Step 0.0 配額），但 int spec 測試 3 要**逐表**斷言 RLS 已啟用 |
| **零 repository ⇒ 稽核漂移守衛可能恆真** | §checklist 1.1a / 1.1b 拆開：1.1b 用**暫時 stub** 逼出紅並確認訊息指名新 model 且落在 `unaudited` 側（W15 配方，含「stub 無人 import 仍被偵測」的已知性質）|
| **jest 檔案順序讓中性化的紅數與直覺不符**（`AD-JestFileOrder-1`）| 中性化**之前**先 `--listTests` 取順序並寫進預測；⛔ **保留失敗身分**不要只留計數行（W15：「過濾器決定了我事後能問的問題」）|
| **Risk Class C（陳舊長駐程序掩蓋 wiring）** | ⚪ 本片無 dev server；int suite 每次 DROP + CREATE + migrate + seed ⇒ 結構上不成立。**記錄而非打勾略過** |
| `AD-TextEditStructuralScope-1`：seed 是位置元組 + 手工 insert 順序 | 錨定結構邊界（唯一 ref code / 含換行的完整界定符）+ `assert` 計數；⚠️ 但計數守衛自我指涉，**不可寫成「有守衛」** |
| **`iso_officer_name` 與 `ISMSContact(role='ISMS lead')` 語義重疊** | 兩個真相來源。本片依裁定兩者都建，**記一條 AD**：M6c 決定哪個是權威、另一個是否改為導出 |
| **本片是 M6c 的資料層而 M6c 的 UI 尚未規格化** | `02a:67` 明文禁建 OS portfolio；`08-rollup-dashboard-spec.md` 對 ISMS **零命中** ⇒ `13:69` 的儀表板視圖今天沒有規格。**不預先為它建欄位**（AP-5）|

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **端點 / repository / controller** — M6c（`07:39`）；漂移守衛會在接上稽核的那天叫
- **`posture` 欄** — `02a:437` 導出值 → **新 AD**（D13）；且 `AD-RatingBand-1` / `AD-RiskBand-1`
  兩條登記未合併前沒有權威值域
- **`region_code` · `ISMSProfile.status`** — → **新 AD**（D5/D6）
- **`13:45` 的三組延伸**（applicable geography · framework linkage · validity period）——
  文件自己說「Model those only if actually needed」⇒ 建了就是 AP-5
- **`Role` 實體** — `02a:71` 在 M4；本片的版本 `role` 是字串（D15）
- **OS portfolio** — `02a:67` **明文禁建**（`AD-DesignAlign-5`，模組尚未規格化）
- **`13:69` 的區域儀表板視圖** — M8，且 `08-rollup-dashboard-spec.md` 對 ISMS 零命中
- **`audit.module.ts:50` 的 orphan claim** — 已登記於 `AD-SchemaHeaderStale-1`，非本片標的
- **實體範疇 drift detector**（`AD-EntityScopeNoDriftGuard-1`）— 治理工作，Step 0.0 配額
- **其餘 6 張表**（`Event` · `posture_snapshot` · `retention_policy` · `LegalHold` ·
  `AccessRequest` · `AccessReviewCampaign`）— slice 12..N。
  ⛔ **`AccessRequest` 的 `org_entity_id` 是 nullable（`02a:325`）而無任何裁決文件** ——
  建它之前必須 STOP and ask
