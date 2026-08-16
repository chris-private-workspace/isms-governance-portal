---
status: closed   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W17 Plan — Records retention and legal hold

**Summary**: 建 M1 的第 12 片 —— `retention_policy`（**全域**參考表）與 `legal_holds`
（**entity-scoped**）兩張表，關掉 `05` §Records retention 今天完全無處可存的缺口。
**30 / 36 → 32 / 36**。零端點、零 repository、零 controller —— 消費者在 M6b（處置排程）。
關鍵範圍決策：(a) `retention_policy` 走全域表（使用者裁定），因此**必須依
`multi-tenant-data.md:81` 走舉證程序**；(b) ⭐ **W14 的 `assert_polymorphic_parent_in_scope()`
對 `legal_holds` 結構上不可用** —— 見 §0 D3，這是本 plan 最重要的一項發現。
**無 drive-through**（零 user-facing surface）· **無 design note**（feature continuation）。

**Status**: Closed（使用者核可 2026-08-16；方向與 `retention_policy` 範疇軸同日裁定。
T0 `2026-08-16T13:24:10Z`）

**Branch**: `feature/W17-retention-and-legal-hold`
**Base**: `main` HEAD `5c42384`（W16 post-merge 標籤翻轉 + `AD-MergeLabelRuleConflict-1`）
**Slice**: M1 slice **12 / N**（W16 是 11）。不關任何 AD —— **新增** 2 條候選（見 §9）
**Scope decisions**: (a) `retention_policy` 全域、無 `org_entity_id`、`GRANT SELECT` only ·
(b) `legal_holds` entity-scoped `NOT NULL` + RLS **`ENABLE` 加 `FORCE`** ·
(c) **不建**多型守衛 trigger，理由寫進 migration banner 並登記 AD ·
(d) **不建** `status` 欄 —— `applied_at` / `released_at` 已承載終態 ·
(e) `record_class` 是**字串標籤不是 FK**

---

## 0. Background

### The gap（`02a:50` 登記為 Wave 1，而兩張表都不存在）

- `05:63` 說保存期限散落在風險管理與供應商管理兩份公司程序裡（資產清冊 3 年、
  風險管理報告 3 年、供應商服務報告 1 年），因此保存是**平台級能力，不是各模組的事後補丁**。
- `05:69` 說 legal hold 是 **first-class concept**：它**不管保存期限**一律中止處置，
  只有被授權角色能施加與解除，本身要被稽核，且受 hold 的紀錄在 UI 上要**明顯標示**。
- 今天 `grep -c '^model RetentionPolicy\|^model LegalHold' schema.prisma` 為 **0**。
  `check_entity_index.py` 報 **30 / 36**。

### Why it matters（缺失的能力）

`05:66` 寫著一句本片唯一真正棘手的約束：**「retiring a record must never break
audit-trail integrity」** —— 保存治理的是**紀錄**，稽核軌跡按它自己的規則保存。
沒有 `retention_policy`，「這類紀錄該留多久、到期怎麼處置」今天**只存在於兩份 PDF 程序裡**；
沒有 `legal_holds`，「這批紀錄因訴訟／稽核不得處置」**無處可表達**，
而那正是 `05:69` 說它是 first-class 的原因。

⚠️ 本片**不建處置排程**（那會真的刪東西）。本片只建**可存放這些決定的地方**。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `5c42384`）| Anchor |
|-------|--------------------------------------------|--------|
| 實體索引 | `retention_policy` · `LegalHold` 同列，Wave **1**，described in `05` §Records retention | `02a:50` |
| 欄位規格（retention）| 6 欄：`record_class` · `duration` · `trigger` · `disposition` · `basis` · `review_cadence` | `02a:314-316` |
| 值域來源（retention）| **6 列**確認的 class / 期限 / 依據 | `05:73-80` |
| 欄位規格（hold）| 8 欄：`scope_type` + `scope_id`（多型）· `reason` · `applied_by` · `applied_at` · `released_by` · `released_at` · `status` | `02a:318-321` |
| 行為規則（hold）| 覆寫保存期限 · 僅授權角色 · 本身可稽核 · UI 須明顯標示 | `05:69` |
| 全域表豁免清單 | 5 列 + identity 一類；`retention_policy` **不在上面** | `multi-tenant-data.md:57-65` |
| 新增全域表的程序 | **必須在 PR 描述中舉證**；預設是「有 `entity_id`」 | `multi-tenant-data.md:81-82` |
| 多型守衛契約 | `TG_ARGV = (type_column, id_column, 然後 (type_value, table) 對)`；`SECURITY INVOKER`；unmapped type **fail closed** 23503 | `20260815090746_polymorphic_parent_guard/migration.sql:31-93` |
| 全域表模板 | 無 RLS、無 policy、`GRANT SELECT` only；⛔ **FK 測試不能走 app 角色**（無 INSERT 權限 ⇒ 42501 先於約束評估）| `20260816045848_jurisdiction_and_obligations/migration.sql:11-50,145-149` |

→ 兩張表的形狀**不同且都有既有藍本**：`retention_policy` 抄 W15 的全域表，
`legal_holds` 抄 W16 的 entity-scoped 表。**唯一沒有藍本的是多型 `scope_id`**（見 D3）。

### The design（2 個 model + 3 個 enum + 1 支 migration + 1 個 int spec；零 TypeScript）

```
apps/api/prisma/schema.prisma                          EDIT   +2 model +3 enum, header 31 → 33
apps/api/prisma/migrations/<utc>_retention_and_hold/   NEW    2 表 · 2 RLS policy · FORCE · 2 FK · 1 UNIQUE · 1 CHECK · GRANT 兩層
apps/api/src/core-model/retention-and-hold.int.spec.ts NEW    ~8 條，每條對應一條會消失的約束
apps/api/test/int-global-setup.js                      EDIT   seed 兩實體 × 2 表 + 計數守衛 2 列
docs/rules-on-demand/multi-tenant-data.md              EDIT   §鐵律 1 豁免表 —— 併入既有列，行數不變
docs/02-architecture/02a-data-model-spec.md            EDIT   §0 索引 :50 標記已建
```

**為什麼兩張表放同一片**：規格來源是同一節（`05:61-80`），且語義耦合 ——
`05:69` 的 hold **覆寫** retention 的期限。分開建會讓「覆寫」這個關係在兩片之間懸空。

### Ground truth（recon head-start —— 於 `main` HEAD `5c42384` 讀過的 code）

- `apps/api/prisma/schema.prisma:1` — header 自稱 **31 models**，實測 `^model ` = **31**、`^enum ` = **30**（自我可重現）
- `02a:44-52` — Foundation services 一節，`retention_policy` / `LegalHold` 在 `:50`
- `05:73-80` — 六列表格；⚠️ **`duration` 欄不是同一種量**（見 D5）
- `20260816045848_jurisdiction_and_obligations/migration.sql:38-50` — GRANT SELECT only 的完整論證
- `20260815090746_polymorphic_parent_guard/migration.sql:46-47` — `::uuid` cast **在** mapping walk **之前**
- `multi-tenant-data.md:64` — W15 把 `obligations` **併入既有列**而非新增列（`AD-MdAnchorLineShift-1`）

**Baselines（W16 closeout，且已在 CI 獨立確認）**: api unit **480 / 40** · api int **235 / 19** ·
web **10 / 1** · coverage **92.14 / 91.77 / 98.98 / 93.56** · `run_all` **8 / 8** ·
`check_entity_index` **30 / 36** · build clean。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-schema-scope-line** — `schema.prisma` 的 `Scope:` 行**已知**漏 W13–W16，header 註解說是刻意留著。
  Day 0 確認它是否仍是刻意，還是已經該修 → 不移動任何 §Risks，僅記錄
- **D-devdb-checksum** — `AD-DevDbChecksumDrift-1`：W16 量到 `isms_dev` 只套了 **17 / 22**。
  本片是**第 6 次**。Day 0 用 `migrate diff --exit-code` 取**新的真數**，不用 int suite 的重建訊息代替
- **D-namedatalen** — 本片所有索引 / 約束名逐一量長度 vs `NAMEDATALEN` **63**（W11 已踩過，W16 差點第三次）
- **D-unique-oracle** — 依 `AD-UniqueKeyOracle-1` 對本片每一個唯一鍵套判準（三條路徑：`@@unique` · 單欄 `@unique` · `CREATE UNIQUE INDEX`）
- **D-force-rls** — ⭐ **W16 的 DR3 是本 plan 已經吸收的教訓**：§3.2 明寫 `FORCE`。
  Day 0 仍要對既有 migration 逐字確認寫法，**不從本 plan 抄**

## 1. Phase Goal

在 `core-model` 交付 `retention_policy` 與 `legal_holds` 兩張表，使
`check_entity_index.py` 由 **30 / 36** 進到 **32 / 36**，且每一條被建立的約束都有
一條**會因它消失而轉紅**的整合測試。證明方式：十三項 gate 各自取 exit code +
**中性化實測**（拿掉約束 → 指名的測試轉紅 → 還原 → `git diff --stat` 為空）+
**AC-2 逐欄位對照**（本片約 28 欄，遠小於 W16 的 94）。
本片**不產出** design note（feature continuation，複用 W15 / W16 已驗證的兩種 pattern），
**不產出** ADR（無架構級決定 —— D3 是實作決定，登記為 AD）。
⚪ **gate-only verified** —— 零端點、零 UI、零 CLI，無人可驅動的路徑。

## 2. User Stories

- **US-1**（retention）: 作為區域 ISO，我希望「哪一類紀錄留多久、到期怎麼處置、依據是什麼」
  有一個集團級的單一存放處，以便 13 家 OpCo 不會各自解讀同一條 ISO 27001 A.5.28。
- **US-2**（legal hold）: 作為法務／區域 ISO，我希望能對某實體的紀錄施加不受保存期限影響的
  hold 並記錄誰在何時施加與解除，以便訴訟／稽核期間的紀錄不會被例行處置刪掉。
- **US-3**（隔離）: 作為平台維運者，我希望 `legal_holds` 的實體隔離由**資料庫**強制且
  owner 也不能繞過，以便 guardrail 4 不依賴應用層記得過濾。
- **US-4**（舉證）: 作為未來讀這份 schema 的人，我希望 `retention_policy` 為何是全域表
  有一份**寫在會被讀到的地方**的論證，以便它不會被當成一次隨手的豁免。
- **US-5**（closeout）: 作為下一個 phase 的自己，我希望本片的裁決、中性化結果與 calibration
  都留在單一來源，以便不必重讀 diff 就能接手。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
EDIT      apps/api/prisma/schema.prisma                          +2 model +3 enum；header count 31 → 33
NEW       apps/api/prisma/migrations/<utc>_retention_and_hold/migration.sql
NEW       apps/api/src/core-model/retention-and-hold.int.spec.ts  ~8 條
EDIT      apps/api/test/int-global-setup.js                       seed + 計數守衛
EDIT      docs/rules-on-demand/multi-tenant-data.md               豁免舉證（行數不變）
EDIT      docs/02-architecture/02a-data-model-spec.md             §0 索引 :50
REGEN     apps/api/src/generated/prisma/**                        gitignored
UNTOUCHED apps/api/src/modules/**                                 零端點 —— 本片不碰任何 module
UNTOUCHED apps/api/src/audit-trail/audit.module.ts                零寫入路徑 ⇒ 不進 AUDITED_MODELS
UNTOUCHED apps/web/**                                             零 UI
```

### 3.1 `retention_policy`（US-1, US-4）— 全域參考表

- **無 `org_entity_id`、無 RLS、無 policy**。逐字複製 W15 三張表的形狀
  （`jurisdiction_and_obligations/migration.sql:11-50`）。
- 欄位（依 `02a:314-316`）：`record_class` · `duration` · `trigger` · `disposition` ·
  `basis` · `review_cadence`，加上 base fields `version` / `created_at` / `updated_at` / `retired_at`。
- `trigger` 與 `disposition` **建 enum** —— 值域由 `02a:314-315` 明文固定
  （`creation` / `closure` / `supersession`；`retain` / `archive` / `purge`）。
  這與 W14 拒建 `Attestation.status` 的判準一致：**分野是值域有沒有外部來源**。
- ⭐ **`record_class` 是 TEXT 不是 FK**。`05:73-80` 的六類裡有 **3 類指向 Wave 2 或未建的實體**
  （Security incident records → `Event` 未建；Audit issues → `17` 是 Wave 2；
  External party assessments → `12` 是 Wave 2）。建 FK 等於先發明那些實體 ——
  W11 對 `framework_id` 用過同一把尺。
- **UNIQUE `record_class`** —— 一類紀錄一條政策。⚠️ 依 `AD-UniqueKeyOracle-1` 套判準：
  這是全域表且 `GRANT SELECT` only ⇒ 呼叫端無法 INSERT ⇒ **今天不可達**，
  但要在 migration banner 明寫「安全性來自 GRANT 不是來自鍵的設計」。
- **`GRANT SELECT` only** —— 這條是 load-bearing 的：它是**為什麼本表不進 `AUDITED_MODELS`**
  的理由（app 角色物理上寫不了 ⇒「無寫入路徑可稽核」是資料庫保證而非今日程式碼的性質）。

### 3.2 `legal_holds`（US-2, US-3）— entity-scoped

- **`org_entity_id UUID NOT NULL`** + FK → `org_entities`。
- **RLS `ENABLE` 加 `FORCE`** —— ⭐ W16 DR3 的教訓已吸收進本 plan：沒有 `FORCE`，
  表的 owner（= 執行 migration 的角色）繞過全部 policy，而 int suite 連的是 app 角色
  ⇒ **沒有任何現有測試會發現**。int spec 必須斷言 `relforcerowsecurity`。
- Policy：`FOR SELECT` + `FOR INSERT`。**無 `FOR UPDATE`、無 `FOR DELETE`**。
- 欄位（依 `02a:318-321`）：`scope_type` · `scope_ref` · `reason` · `applied_by` ·
  `applied_at` · `released_by` · `released_at` + base fields。
- **`applied_by` / `released_by` → `users`**，`onDelete` **顯式** `Restrict` / `SetNull`
  （W16 教訓：Prisma 對 optional relation 預設 `SetNull`，隱式寫法與 migration 的
  `Restrict` 慣例分歧，而**本 repo 沒有任何測試斷言 `ON DELETE`**）。
- **CHECK**：`released_at IS NULL` 與 `released_by IS NULL` 必須同時成立或同時不成立
  —— 「解除了但不知道誰解的」不是合法狀態。

### 3.3 ⭐ D3 — 為什麼**不建**多型守衛 trigger（US-2）

`02a:318` 說 `scope_type` 是多型的 **record / class / entity**。
W14 的 `assert_polymorphic_parent_in_scope()` 看起來是現成答案，**而它結構上不適用**：

1. `polymorphic_parent_guard/migration.sql:47` 是
   `parent_id := (to_jsonb(NEW) ->> id_column)::uuid;` ——
   **cast 發生在 mapping walk 之前**。`scope_type = 'class'` 的目標是一個紀錄類別
   （`'Security incident records'`），**根本不是 uuid** ⇒ 會拋 `22P02` 而不是乾淨的 `23503`。
2. `scope_type = 'record'` 在 `02a:318` 是**泛指任何一張業務表**，而該函式要求
   每個 type value 對應**一張具名的表**。今天有 31 張，寫不出這個 mapping。
3. 只有 `scope_type = 'entity'` 能對應（→ `org_entities`）。

⇒ **本片建欄位與 CHECK，不建 trigger**，理由寫進 migration banner。
`scope_ref` 用 **TEXT**（不是 UUID），因為三種 type 裡有一種本來就不是 uuid。
⛔ 這是一個**明說的缺口**，不是省略：`scope_ref` 今天**沒有參照完整性**。
登記為 `AD-LegalHoldScopeRefUnguarded-1`，**解封條件**是第一個真的要解析 hold 的消費者
（M6b 處置排程）—— 屆時 `scope_type` 的值域也才有真實需求可依。

### 3.4 `record_class` 的值與 `05:73-80` 的關係（US-1）

seed 六列，逐字取自 `05:73-80`（含 `basis` 引文）。⚠️ **不改寫、不正規化** ——
那六列是**公司程序的既有內容**（已確認參數 #9：數位化既有範本，不得自行發明）。

### 3.x 明確不做的事

- ❌ **處置排程 / 到期計算 / 真的刪任何東西** —— 那是 M6b，且會碰 `05:66` 的稽核完整性約束
- ❌ **`status` 欄（`legal_holds`）** —— `applied_at` / `released_at` 已承載終態；
  W14 拒建 `Attestation.status`、W07 移除 `ControlTest.result` 是同一把尺。
  ⚠️ 差別要寫清楚：那兩次是**沒有值域來源**，這次是**終態已被承載** ⇒ 建它是冗餘不是發明
- ❌ **多型守衛 trigger** —— 見 D3
- ❌ **任何端點 / repository / controller** —— 消費者在 M6b
- ❌ **`retention_policy` 進 `AUDITED_MODELS`** —— `GRANT SELECT` only，無寫入路徑
- ❌ **`duration` 解析成結構化區間** —— 見 D5

### 3.y D5 — `duration` 的型別（US-1）

`05:73-80` 的六個值**不是同一種量**：`3 years after closure`（相對於事件）·
`3 years per version`（相對於版本）· `Contract term + 2 years`（相對於外部合約）·
`7 years, immutable`（帶著一個否定處置的旗標）。

⇒ 本片 `duration` 用 **TEXT**，並在 schema docstring 寫明**為什麼不是 interval**。
把它結構化需要先回答「per version 的錨點是哪一列」與「contract term 從哪裡讀」，
兩者今天都無來源。登記為 `AD-RetentionDurationUnstructured-1`，解封條件同 M6b。

### 3.z Validation（US-1..US-5）

Gates（十三項各自取 exit code，**且在最後一次改動之後重跑**）：
`format:check` api/web · `lint` api/web · `type-check` api/web · `build` api/web ·
`lint:negative`（⚠️ **root script 不是 `-w apps/api`** —— Day-0 D2）·
api unit（baseline **480 / 40**）· **api int（baseline 235 / 19 → 預期 ~243 / 20）** ·
web（**10 / 1**）· `test:cov`（**92.14 / 91.77 / 98.98 / 93.56**，預期**逐位不變** ——
本片新增零個進 unit coverage 的檔）· `run_all` **8 / 8** · `check_entity_index` **32 / 36**。

Drive-through：⚪ **N/A** —— 零 user-facing surface。**報告一律寫「gate-only verified」**，
不得暗示可用性。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<utc>_retention_and_hold/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/retention-and-hold.int.spec.ts` | NEW |
| 4 | `apps/api/test/int-global-setup.js` | EDIT |
| 5 | `docs/rules-on-demand/multi-tenant-data.md` | EDIT（**行數不得改變**）|
| 6 | `docs/02-architecture/02a-data-model-spec.md` | EDIT（§0 索引 `:50`）|
| 7 | `apps/api/src/generated/prisma/**` | REGEN（gitignored）|
| 8 | `docs/01-planning/W17-m1-retention-and-legal-hold/{plan,checklist,progress,retrospective}.md` | NEW |
| 9 | `docs/03-implementation/changes/CH-035-w17-retention-and-legal-hold.md` | NEW |
| 10 | `docs/01-planning/{BACKLOG,ROADMAP,CALIBRATION-MATRIX,CALIBRATION-LOG,RISK_REGISTER}.md` · `CLAUDE.md` · `MEMORY.md` · `memory/project_w17_*.md` | EDIT（closeout）|
| — | `apps/api/src/audit-trail/audit.module.ts`（`AUDITED_MODELS` 的家 —— **Day-0 D1 修正**，原寫 `audited-models.ts` 不存在）| **UNTOUCHED** —— 零寫入路徑 |
| — | `apps/api/src/modules/**` | **UNTOUCHED** —— 零端點 |
| — | `apps/web/**` | **UNTOUCHED** —— 零 UI |
| — | `docs/02-architecture/05-platform-foundation-services.md` | **UNTOUCHED** —— `05` 是規格來源，本片只消費不修改 |

## 5. Acceptance Criteria

1. **AC-1** — `check_entity_index.py` 報 **32 / 36**，且 `02a:50` 兩個實體名皆已標記為已建。
2. **AC-2** — **逐欄位對照**：`information_schema` 導出的欄位數與 migration `CREATE TABLE`
   區塊的欄位數**兩條獨立路徑逐表相符**；每一個「不建」的規格欄位有**缺席證明**，
   且缺席證明**先以陽性對照證明查詢儀器有效**才採信它的零。
   ⛔ 這是 W15 被判 `closed_partial` 的唯一理由，W16 已補上，本片不得回退。
3. **AC-3** — `legal_holds` 的 `relrowsecurity` **與** `relforcerowsecurity` 皆為真（int spec 斷言）。
4. **AC-4** — `retention_policy` 的 app 角色權限**恰為** `SELECT`（catalog 逐項 `toEqual` 斷言，
   不是 `toContain`）；`legal_holds` 恰為 `SELECT, INSERT`。
5. **AC-5** — 每一條新建的約束都有一條**會因它消失而轉紅**的測試。
   ≥ 3 次中性化實測，**預測寫在執行之前並鎖進 commit**；還原後 `git diff --stat` 對
   migration 與 seed **為空**，int 回到全綠。
6. **AC-6** — `multi-tenant-data.md` 的豁免舉證已寫入且**該檔行數不變**
   （`git diff --stat` 顯示 +N/-N 相等）；同一份論證同時出現在 **migration banner** 與 **PR 描述**
   （`:82`：舉證位置是 PR 描述，不只是 ADR）。
7. **AC-7** — 所有新增識別字長度 **≤ 63**（`NAMEDATALEN`），逐一量過而非目測。
8. **AC-8** — Drive-through **N/A（gate-only verified）**，且此判定在 CH / retro 中**明記為非省略**。
9. **AC-9** — 三個新 AD 已登記；calibration 已回填 matrix（≤ 1 行）+ log（完整敘述）；
   導航檔更新符合 Minimal Touch；`plan.md` frontmatter `status:` 已翻。

## 6. Deliverables

- [ ] US-1 `retention_policy` 表 + 3 enum + 六列 seed（逐字取自 `05:73-80`）
- [ ] US-2 `legal_holds` 表 + CHECK + 兩條 users FK（顯式 `onDelete`）
- [ ] US-3 RLS `ENABLE` + `FORCE` + 2 policy + GRANT 兩層，並有斷言證明
- [ ] US-4 `multi-tenant-data.md` 豁免舉證（行數不變）+ migration banner + PR 描述三處
- [ ] US-5 CH-035 · retrospective · calibration 回填 · 三個 AD 登記 · 導航檔

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（`CALIBRATION-MATRIX.md:54` ——
  現有 **9** 個資料點、跨 0.23~1.24、狀態 KEEP；本片是**第 10 點**）。
  理由：兩張表**各有一個已驗證的藍本** —— `retention_policy` 抄 W15 全域表、
  `legal_holds` 抄 W16 entity-scoped 表。⚠️ 但 W15 的教訓要事先寫進估算而非事後歸因：
  **零端點讓實作便宜卻讓驗證變貴**（沒有應用層可驅動，唯一能證明它的只有整合測試與中性化）
  ⇒ bottom-up 已把驗證面算進去。表數只有 W16 的 **0.4 倍**，但**多一種形狀**（全域 + entity-scoped）
  且全域表的測試要走 superuser 連線（W15 D7）。
- **Agent-delegated: `no`**（< 20% —— 本片自己直接做；Day 0 的盤點已由 agent 完成且**已獨立複驗**）。
  `agent_factor` **1.0** → 三段式。
- Bottom-up est **~6.4 hr**（Day 0 verify 0.9 · Day 1 schema+migration 1.6 ·
  Day 2 seed+int spec 1.8 · Day 3 中性化+AC-2 1.2 · Day 4 closeout 0.9）
  → class-calibrated commit **~3.2 hr** (mult 0.50)。Day-4 retro Q2 驗證。
- ⭐ **量法事先宣告**（`AD-CalibrationDay0InOrOut-1` + `AD-CalibrationWindowCrossSession-1`）：
  逐段相加、**排除 > 60 min 的間隙**、Day 0 **計入**。
  ⛔ **本片的最小改進**（W16 retro 指定）：**動 plan 之前先蓋一次 `date -u`** ——
  W16 的起草段 ~95 min 是估算不是量測，那是 `AD-CalibrationNoTimeRecord-1` 尚未清償的部分。
  ⚠️ 本 plan 起草**已經開始**才想起這件事 ⇒ 本片起草段仍是估算，**如實標註**，
  真正的第一次量測從 checklist 0.1 開始。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ⭐ **`scope_ref` 無參照完整性** —— 多型守衛結構上不可用（D3）| 明說的缺口，寫進 migration banner + 登記 `AD-LegalHoldScopeRefUnguarded-1`。⛔ **不得**用一個只涵蓋 `entity` 分支的 trigger 假裝有守衛 —— 那會是 `AD-VacuousScopeTest-1` 的形狀 |
| **全域表的 FK / 約束測試會全綠而空轉** —— app 角色無 INSERT ⇒ 42501 **先於**約束評估（W15 Day-0 D7）| `retention_policy` 的所有約束測試走 **migration owner 連線** —— `asOwner()` + `DATABASE_URL_MIGRATE`（`jurisdiction.int.spec.ts:63-67`；⚠️ **Day-0 D3 修正**：原寫「superuser」，那不是它的名字也不是它的憑證）；並用中性化證明它真的會紅 |
| **`AD-MdAnchorLineShift-1`** —— `multi-tenant-data.md` 被 100+ 個 `file:line` 錨點引用，編輯不得改變行數 | 舉證**併入 `risk_scales` 那一列**（`:65`，語義相容：兩者都是集團標準，per-entity 差異走設定不走分叉），不新增列。Day 4 用 `git diff --stat` 驗 +N/-N 相等 |
| **Risk Class C** — 陳舊的長駐程序掩蓋修正 | 本片零 runtime；但 int suite 的 global setup 會 DROP+CREATE，**並行跑兩個 int suite 會互相 DROP `isms_test`**（W16 實測 12 紅假象，`AD-IntSuiteNoMutex-1`）⇒ **一次只跑一個** |
| **`AD-DevDbChecksumDrift-1` 第 6 次** | ✅ Day-0 **D9** 已量：`isms_dev` **17 / 23**（6 支未套用，head 停在 W10 era）。本片**不用它當任何基準** |
| ⭐⭐ **Day-0 D10 —— 舊的 Prong 3 工具量錯了東西** | `--from-migrations`（真檢查）**跑不起來**（缺 `shadowDatabaseUrl`）；`--from-config-datasource` 預設打 `isms_dev`，輸出被 6 支未套用 migration 淹沒。**新量法**：覆寫 **`DATABASE_URL_MIGRATE`**（⚠️ 不是 `DATABASE_URL` —— `prisma.config.ts:53,61` 優先用前者）指向 `isms_test`，該庫由 `migrate deploy` 從 migration 檔建成 ⇒ 非循環。**基線是恰好 2 條既有漂移**（`audit_log` default 表示法 · `soa` index rename）；本片的 DoD 是**這個集合不變大** |
| **`NAMEDATALEN` 63 靜默截斷** | 所有識別字逐一量長度；超過就明確 `map:` |
| **中性化條數被估低**（`AD-NeutralisationCountUnderPredicted-1`，W16 三次全低）| 預測**承諾形狀與位置，對條數給區間**；每一條紅都要能由該改動解釋，否則懷疑量法 |
| **`02a` §0 索引與同一個 change**（`02a:18`）| 本片不新增索引外的實體 ⇒ 分母不變（36）。若 Day 0 發現需要新實體，**先 STOP and ask** |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **處置排程 / 到期計算 / 實際刪除** — M6b；且要先解 `05:66` 的稽核完整性約束
- **`legal_holds` 的 UI 標示**（`05:69` 要求受 hold 紀錄在 UI 明顯標示）— M8 前端
- **`scope_ref` 的參照完整性** — `AD-LegalHoldScopeRefUnguarded-1`，解封於 M6b
- **`duration` 結構化** — `AD-RetentionDurationUnstructured-1`，解封於 M6b
- **M1 其餘 4 張表** — `Event`（規格最薄，裁決數 > 欄位數）· `posture_snapshot`
  （擋於 `AD-RatingBand-1` / `AD-RiskBand-1` 未併）· `AccessRequest`
  （⛔ **`org_entity_id` nullable 無裁決文件，建前必須 STOP and ask**）·
  `AccessReviewCampaign`（`AccessReviewItem` 全樹零命中）
- **角色限制**（`05:69`「僅授權角色能施加與解除」）— `Role` 實體被 `02a:71` 擋到 M4；
  本片以 GRANT 層次表達（無 `UPDATE` 授權 ⇒ 解除今天不可達）
