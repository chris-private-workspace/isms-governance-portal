---
status: closed  # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W18 Plan — Event skeleton and posture snapshot

**Summary**: M1 slice 13 —— `events`（`02a:233` 的 **6 欄骨架**）+ `posture_snapshots`
（`02a:463` 的 **7 欄**，旗艦儀表板的資料來源）。兩張皆 entity-scoped、皆 **append-only**
（無 UPDATE grant、無 `FOR UPDATE` policy）。實體索引 **32 / 36 → 34 / 36**。
**零端點、零 repository** —— `posture_snapshots` 的寫入者是 M8 的排程 job，`events` 的表單在 M6。
關鍵範圍決策是**一條界線**：`02a:38` 說 `Event` 是 Wave 1、`02a:58` 說 `Event` extension 是
Wave 2 ⇒ 本片只建 `02a:233` 那 6 欄，`11` 的 10+ 個欄位、`status`、`business_unit`、
restricted block **全部不在本片**。⚪ 無 user-facing surface ⇒ **gate-only verified**，非 spike ⇒ 無 design note。

**Status**: Closed（2026-08-17 —— AC-1~AC-9 全數達成，見 [retrospective.md](./retrospective.md) Q1）
**Branch**: `feature/W18-event-and-posture-snapshot`
**Base**: `main` HEAD `fd6472a`（CH-036 post-merge —— `sha-anchors` detector 進 `run_all`，9/9）
**Slice**: M1 slice 13 / N —— 關掉實體索引的 2 格；`AccessRequest` / `AccessReviewCampaign` 是 slice 14
**Scope decisions**: (a) `Event` 嚴格照 `02a:233` 六欄，`11` 的一切屬 Wave 2 ·
(b) `severity` 用 **S1/S2/S3**（`11:35-39`，使用者 2026-08-17 裁決）·
(c) `loss_amount` **建但 nullable**（使用者裁決）· (d) `posture_snapshots` **不建**五個 residency 欄位
（`02a:488` banner）· (e) 兩表皆 append-only ⇒ 2 條 policy，無 UPDATE ·
(f) `metric_key` 建成 **enum**（`02a:477` 明說 not free-form）

---

## 0. Background

### The gap（實體索引的最後 4 格裡的 2 格）

`check_entity_index.py` 報 **32 / 36**。缺的四個是 `Event` · `posture_snapshot` ·
`AccessRequest` · `AccessReviewCampaign`，四者在 `schema.prisma` 皆零命中。

本片做前兩個。後兩個延到 slice 14 —— `02a:325` 的 `AccessRequest.org_entity_id` 是 **nullable**，
與約束 8 鐵律 1（所有業務 table 必有 `entity_id NOT NULL`）直接衝突，需要獨立裁決。

### Why it matters（缺失的能力）

`posture_snapshot` 是**旗艦滾升儀表板的唯一資料來源**（`02a:459` · `08`）。
沒有它，「所有 OpCo 的 ISMS 現況一眼看完」這個專案的主驅動力（已確認參數 #5）**無處可讀**——
而 `02a:513` 已經決定矩陣要對**所有**實體讀快照（統一 as-at），不是部分即時算。

`Event` 是 `02a:229` 的 `Issue.source = incident` 指向的東西。今天那個 enum 值**建不出來**
（`schema.prisma:649-652` 明記原因），因為事件記錄不存在。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `fd6472a`）| Anchor |
|-------|--------------------------------------------|--------|
| 實體索引 | 32 / 36；兩者**都已在索引上**，本片**不需新增索引列** | `02a:38` · `02a:42` |
| `Event` 欄位規格 | **一行 6 欄，無註腳、無值域、無 recorded deviation** —— §3 裡最單薄的一條 | `02a:233` |
| `Event` 的 Wave 界線 | Wave 1 = 骨架；「Extended into the incident record by `11`」= **Wave 2** | `02a:38` · `02a:58` |
| `Event.severity` 值域 | ⛔ `02a` §2 的 enum 註冊表**完全沒有它**。唯一來源是 `11` 的 S1/S2/S3 + 定義 + SLA | `02a:113-129` · `11:35-39` |
| `Event.loss_amount` | 🔴 `11` **全檔無 `loss`**；8 筆樣本資料**無金額欄位** | `11`（grep 零命中）|
| `Event.status` | ⛔ **不在 `02a:233` 的欄位清單上**。且有 **4 份互斥 lifecycle**（只有 4 態共通） | `02a:417` · `11:45-58` |
| `posture_snapshot` 欄位 | 7 欄，表格逐欄列出 | `02a:465-473` |
| residency 五欄 | **banner 明寫 NOT BUILT in Wave 1** —— ADR-0010 單一區域，零 consumer | `02a:488-492` |
| `metric_key` | **9 個治理固定值逐一列出**，`not free-form` | `02a:477-486` |
| `rag` | `{Green, Amber, Red}`；閾值 configurable 且待第二道防線確認（**計算邏輯，非欄位值域**）| `08:33-45` · `08:61` |
| append-only | 「snapshots are historical record — **do not retro-edit them**」 | `02a:475` |
| 無反向 FK | `event_id` / `eventId` 全 repo **零命中** —— 沒有既有表需要子表錨點 | grep |

→ 兩張表都是**純資料層、無消費者、append-only**。設計上最接近的既有先例是
`attestations`（2 條 policy、無 UPDATE grant）與 `legal_holds`（同上），
**不是** `issues`（3 條含 `FOR UPDATE`）。

### The design（core-model only：2 model + 3 enum + 1 migration + int spec）

```
schema.prisma
  + model Event            -> @@map("events")            6 欄 + base fields
  + model PostureSnapshot  -> @@map("posture_snapshots") 7 欄
  + enum EventSeverity     -> S1 | S2 | S3               (11:35-39)
  + enum PostureMetricKey  -> 9 個治理值                  (02a:482-483)
  + enum PostureRag        -> green | amber | red         (08:33-45)

migrations/<ts>_event_and_posture_snapshot/migration.sql
  2 表 · 3 enum · RLS ENABLE + FORCE · 各 2 policy (SELECT / INSERT)
  GRANT SELECT, INSERT （**無 UPDATE / 無 DELETE**）
  posture_snapshots: UNIQUE (org_entity_id, period, metric_key)  ← 見 §3.2 的 oracle 檢查

test/int-global-setup.js   seed 兩張表
core-model/event-and-posture.int.spec.ts   負面測試，SQLSTATE 斷言
```

為何 append-only 而非 `FOR UPDATE`：`02a:475` 對快照是明文（"do not retro-edit"）；
對 `events` 則是**能力尚不可表達** —— 事件的狀態推進需要 `status`，而那有 4 份互斥清單且
從未裁決（見 §3.x）。給出 UPDATE grant 等於出貨一條無限制的編輯路徑，再宣稱限制是未來工作
（W17 對 `legal_holds` 的同一把尺，`20260816135016_...:200-212`）。

### Ground truth（recon head-start —— 於 `main` HEAD `fd6472a` 讀過的 code）

- `02a:233` — `**Event / Incident**` 六欄，逐字讀過
- `02a:463-503` — `posture_snapshot` 兩張表格（建 7 欄 / 不建 5 欄）
- `02a:475` — append-only 明文
- `02a:482-483` — 九個 `metric_key` 逐一列出
- `08:33-45` — RAG 閾值表與 overall posture rule
- `11:35-39` — S1/S2/S3 的定義與 SLA 表（`severity` 的唯一權威值域）
- `20260816135016_retention_and_legal_hold/migration.sql:200-212` — 「不給 UPDATE grant」的論證形狀
- `20260815083338_attestation/migration.sql:95-116` — 2 條 policy 的先例

**Baselines（W17 closeout + CH-036）**: api unit **480 / 40** · api int **248 / 20** ·
web **10 / 1** · coverage **92.14 / 91.77 / 98.98 / 93.56** · `run_all` **9 / 9**
（⚠️ CH-036 後是 9 不是 8）· `check_entity_index` **32 / 36**。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-basefields** — `02a` §1.1 的 base fields（`ref_code` / `status` / `owner_user_id` /
  `version` / `extensions` / `retired_at`）**哪些適用於這兩張表**？`legal_holds` / `attestations`
  實際帶了哪幾個？→ 直接決定 §3.1/§3.2 的欄位數，可能移動 §Risks
- **D-refcode** — `events` 要不要 `ref_code`？`RefCodeCounter` 是 per-entity 發號，
  而 `posture_snapshots` 由排程 job 批次寫入 ⇒ 發號可能不適用 → §Risks
- **D-alias** — `PostureSnapshot` → 表 `posture_snapshots` → 索引 `posture_snapshot`
  **三個名字**，需要 `check_entity_index.py` 的 ALIAS（W17 `RetentionPolicy` 先例）→ §4
- **D-ragcase** — `08` 的 RAG 字面是 `Green/Amber/Red` 還是小寫？enum 值要逐字對齊 → §3.2
- **D-uniquekey** — `AD-UniqueKeyOracle-1` 的判準要對 `posture_snapshots` 的候選唯一鍵跑一次
  （`(org_entity_id, period, metric_key)` 三欄是否全部來自呼叫端）→ §3.2
- **D-auditmodels** — 兩表零 repository ⇒ 不進 `AUDITED_MODELS`；**閱讀**
  `audit-coverage.int.spec.ts` 確認守衛行為而非假設（W17 先例）→ §Risks

## 1. Phase Goal

把實體索引從 **32 / 36** 推到 **34 / 36**，方式是建立兩張 entity-scoped、append-only 的表，
且**每一個建的欄位都有可指認的值域來源、每一個不建的欄位都有寫下來的理由**。
證明方式：`run_all` 9/9 · `check_entity_index` 34/36 · 一組整合測試（負面測試以 SQLSTATE 斷言）
· **逐次序列的中性化實測**（預測寫在執行之前並先 commit）。
⚪ 零 user-facing surface ⇒ **gate-only verified**，drive-through N/A 但必須明記為非省略。
非 spike（複用 W14/W17 已驗證的 append-only pattern）⇒ **不產出 design note**。

## 2. User Stories

- **US-1**（core-model）: 作為區域 ISO，我希望每個實體每期的九個治理指標有一張不可回改的快照表，
  以便滾升儀表板對所有 OpCo 讀到**同一個 as-at**，而不是部分即時算部分讀快照。
- **US-2**（core-model）: 作為 ISMS 管理者，我希望事件記錄有一個帶實體範疇的骨架，
  以便 `Issue.source = incident` 之後指得到具體那一筆。
- **US-3**（驗證）: 作為維護者，我希望每一條約束都有一個「拿掉它就會轉紅」的測試，
  以便三個月後有人動了 policy 時不是靠 review 發現。
- **US-4**（closeout）: 作為下一個接手的人，我希望所有「不建」的決定都有寫下來的理由與解封條件。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
EDIT   apps/api/prisma/schema.prisma                        + 2 model + 3 enum
NEW    apps/api/prisma/migrations/<ts>_event_and_posture_snapshot/migration.sql
NEW    apps/api/src/core-model/event-and-posture.int.spec.ts
EDIT   apps/api/test/int-global-setup.js                    seed + 計數守衛
EDIT   scripts/lint/check_entity_index.py                   +1 ALIAS（見 D-alias）
UNTOUCHED docs/02-architecture/02a-data-model-spec.md       索引列已存在（W17 教訓）
```

### 3.1 `events`（US-2）— `schema.prisma` · migration

- 欄位**嚴格照 `02a:233`**：`title` · `occurred_at` · `detected_at` · `severity` ·
  `description` · `loss_amount`（nullable）+ `org_entity_id` + base fields（Day-0 D-basefields 定案）
- `severity` → `enum EventSeverity { S1 S2 S3 }`，值域來源 `11:35-39`。
  ⚠️ **Wave 1 的表引用了 Wave 2 模組文件的值域** —— 理由寫進 migration banner：
  `02a` §2 的 enum 註冊表沒有它，而已確認參數 #9 要求照公司範本（Security Incident Template V2）
- `detected_at` —— 用 `02a:233` 的名字。⚠️ `11:75` 叫 `discovered_at` 並明寫
  "Distinguish occurred vs discovered — **the template does**"。本片跟著欄位清單走，
  **別名與那句話寫進 banner**；Wave 2 extension 若需要區分語義再處理。**此決定可推翻**
- `loss_amount` → `Decimal?`（nullable，使用者裁決）。banner 記明：`11` 全檔無 `loss`、
  8 筆樣本無金額、`11:13` 的對應概念是 `Damage/Impact*`（自由文字，Wave 2 欄位）
- RLS `ENABLE` **+ `FORCE`** · 2 policy（SELECT / INSERT）· `GRANT SELECT, INSERT`

### 3.2 `posture_snapshots`（US-1）— `schema.prisma` · migration

- 7 欄照 `02a:465-473`：`id` · `org_entity_id` · `period` · `metric_key` · `metric_value` ·
  `rag` · `captured_at`
- `metric_key` → `enum PostureMetricKey`，**九個值逐字照 `02a:482-483`**。
  建 enum 而非 TEXT：`02a:477` 明說 "fixed, governed set … not free-form"，
  `:485` 要求 "governed configuration **with a review step**" —— 改 enum 需要 migration，那就是 review step
- `rag` → `enum PostureRag`，值域 `08:33-45`（字面大小寫於 Day-0 D-ragcase 定案）
- `period` → TEXT（`02a:469` 給的是 "e.g. `2026-Q3` **or** month key" ⇒ 兩種格式，無單一規則）
- `metric_value` → `Decimal`（`02a:471` numeric）
- **UNIQUE `(org_entity_id, period, metric_key)`** —— ⚠️ 三欄**全部來自呼叫端**，
  `AD-UniqueKeyOracle-1` 的判準必須在建之前跑（D-uniquekey）。
  `org_entity_id` 在鍵裡對合法列冗餘，但那正是 W10 修法的形狀
- RLS `ENABLE` **+ `FORCE`** · 2 policy · `GRANT SELECT, INSERT` —— append-only（`02a:475`）

### 3.x 明確不做的事

| 不做 | 理由 | 解封 |
|---|---|---|
| **`posture_snapshot` 的 5 個 residency 欄位** | `02a:488` banner 明寫 NOT BUILT in Wave 1；ADR-0010 單一區域 ⇒ 零 consumer；建了就是 guardrail 8 明講的 **AP-5** | 不解封（除非 ADR-0010 被推翻）|
| **`Event.status`** | **不在 `02a:233` 的欄位清單上**，且有 4 份互斥 lifecycle（`02a:417` 5 態 / `11:45-58` 9 態 / mockup 兩份），只有 4 態共通，**從未裁決** | M6（表單）前需裁決 → 新 AD |
| **`business_unit` · `incident_type` · `ticket_number` · `location` 等 10+ 欄** | `11` 提供但屬 **Wave 2 的 `Event` extension**（`02a:58`）| Wave 2 |
| **restricted block**（violating acts / motives / disciplinary action / president view）| `02a:58` 標 Wave 2；且 `11:87-89` 的權限閘門依賴 CISO/HR **角色**，而 `Role` 是 M4 且 `02a:71` 明寫 "must not be built until specified" ⇒ **今天不可表達**（W17 `legal_holds` 同構）| M4 + Wave 2 · `AD-Incident-1`（🔴 P0）|
| **`Issue.source` 補 `incident` 值** | 即使補了仍是**裸 enum、指不到具體那筆**（`schema.prisma:1371-1372` 已記此缺口）。補一個指不到東西的值不會讓它變得可用 | M6 · 需 companion id 欄位 |
| **兩表的 repository / endpoint** | 消費者在 M8（快照排程 job）與 M6（事件表單）| M6 / M8 |
| **`FOR UPDATE` policy / `GRANT UPDATE`** | 快照是 `02a:475` 明文不可回改；事件的狀態推進需要 `status`，而它未裁決 | 各自的解封點 |

### 3.y Validation（US-1..US-4）

Gates（各自取 exit code，最後一次改動後重跑）：`format:check` · `lint` · `type-check` · `build` ·
`lint:negative`（⚠️ **root script**，非 `-w apps/api`）· api unit · **api int**（baseline 248/20）·
web · coverage（逐位比對）· `run_all` **9/9** · `check_entity_index` **34/36**。
加上**逐次序列的中性化實測**，預測先 commit。⚪ drive-through N/A（零 user-facing surface）——
**明記為非省略，不得暗示可用性**。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_event_and_posture_snapshot/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/event-and-posture.int.spec.ts` | NEW |
| 4 | `apps/api/test/int-global-setup.js` | EDIT |
| 5 | `scripts/lint/check_entity_index.py` | EDIT（+1 ALIAS，見 D-alias）|
| 6 | `docs/03-implementation/changes/CH-037-w18-event-and-posture-snapshot.md` | NEW（單檔 1-page）|
| 7 | `docs/01-planning/W18-*/` progress · retrospective | EDIT / NEW |
| — | `docs/02-architecture/02a-data-model-spec.md` | **UNTOUCHED** —— 索引列已存在（`:38` / `:42`）|
| — | `docs/rules-on-demand/multi-tenant-data.md` | **UNTOUCHED** —— 兩表皆 entity-scoped，無豁免可舉證 |
| — | `apps/api/src/**/*.repository.ts` | **UNTOUCHED** —— 零 repository |

## 5. Acceptance Criteria

1. `check_entity_index.py` 報 **34 / 36**（分母不變 —— 兩者早在索引上）
2. 兩表 RLS **`ENABLE` + `FORCE`** 皆實測（`relrowsecurity` / `relforcerowsecurity` 逐表斷言）
3. `GRANT` 集合逐表斷言：**`SELECT, INSERT` only**，無 UPDATE、無 DELETE
4. 跨實體 INSERT 被拒（SQLSTATE 斷言）**且**範疇內 INSERT 成功
   —— ⚠️ W17 的 N4 證明少了後者，policy 可以整個消失而測試全綠
5. **AC-2 逐欄位對照**：`information_schema` 與 `CREATE TABLE` 區塊兩條獨立路徑逐表相符；
   每個「不建」的欄位有缺席證明，且**先跑陽性對照證明查詢儀器有效**才採信它的零
6. 中性化實測 ≥ 4 次，**預測寫在執行之前並先 commit**；每一條轉紅都能由該改動解釋
7. `AD-UniqueKeyOracle-1` 的判準已對 `posture_snapshots` 的唯一鍵跑過並記錄結論
8. ⚪ **Drive-through N/A（gate-only verified）** —— 零端點零 UI，
   **明記為非省略，且不得在任何文件暗示可用性**
9. 三個「不建」的決定（residency 五欄 / `Event.status` / restricted block）各自在
   migration banner 與 schema docstring 寫明理由與解封點；新 AD 進 BACKLOG；
   calibration 已回填；導航檔更新

## 6. Deliverables

- [ ] US-1 `posture_snapshots` 表 + enum + RLS + seed
- [ ] US-2 `events` 表 + enum + RLS + seed
- [ ] US-3 整合測試（負面測試以 SQLSTATE 斷言）+ 中性化實測
- [ ] US-4 CH-037 + retrospective + BACKLOG / ROADMAP / calibration 回填

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（`CALIBRATION-MATRIX.md:54`；**第 11 個資料點**。
  本片複製 W14 `attestations` / W17 `legal_holds` 已驗證的 append-only + 2-policy pattern）。
  ⚠️ **該行帶著一條預先寫好的判準**：「若第 11 點再落 **0.7-0.85** 則 re-point **0.45**」——
  本片就是第 11 點，所以這次的 ratio 會直接觸發或否決乘數調整，不是單純回填。
- **Agent-delegated: `no`**（< 20%）—— 核心是 schema + migration 的判斷密集工作；
  盤點階段已用過 agent。`agent_factor` 1.0 → **三段式**。
- Bottom-up est **~6.0 hr**（規格閱讀與範圍決策 1.5 · schema + migration 1.5 ·
  seed + 整合測試 1.5 · 中性化 + AC-2 1.0 · closeout 0.5）
  → class-calibrated commit **~3.0 hr** (mult 0.50)。Day-4 retro Q2 驗證。
- ⭐ **量法（`AD-CalibrationNoTimeRecord-1` 要求預先宣告）**：T0 已蓋於
  **`2026-08-17T02:47:33Z`**，**在讀第一個規格檔之前** —— 這是 W17 retrospective 指定的改進
  （W16 蓋在動 plan 前、W17 蓋在動 checklist 前，兩次都讓起草段落在窗口外，
  使 W17 的 0.78 成為**偏低的估計**）。本片分子首次涵蓋整段工作，逐 commit 分段，
  間隙 > 30 min 逐條列出並說明是否計入。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **`severity` 引用 Wave 2 文件的值域** —— Wave 1 的表依賴 `11:35-39`，若 `11` 在 Wave 2 改了值域，schema 與規格會分歧 | 使用者已裁決（2026-08-17）。banner 記明來源與依賴方向；`02a` §2 的 enum 註冊表缺這一列 ⇒ 開 AD 要求補登記 |
| **`detected_at` vs `discovered_at` 命名分歧**（`02a` vs `11` + 公司範本）| 本片跟 `02a:233` 的欄位清單；別名與 `11:75` 那句話寫進 banner。**此決定標為可推翻**，Wave 2 extension 時重審 |
| **`loss_amount` 今天永遠為 NULL** = AP-3 的形狀 | 使用者裁決建它。**如實記一次 AP-3**，不藏在 N/A 底下（W17 先例）。解封點 M6 |
| **`AD-UniqueKeyOracle-1`：唯一鍵當存在性 oracle** —— `posture_snapshots` 的三欄鍵全部來自呼叫端 | 建表**之前**跑判準（D-uniquekey）。W10 / W11 / W16 三個資料點的修法是把 `org_entity_id` 放進鍵 |
| **恆真測試**（`AD-VacuousScopeTest-1`）—— 「policy 不比它該有的更寬」與「policy 存在」觀察不出差別 | AC-4 明列**兩個方向**；W17 的 N4 是這條的直接證據（刪 INSERT policy ⇒ 247 條全綠）|
| **Risk Class B：跨平台編碼** —— CH-036 剛修過 `run_all.py` 的 locale 解碼；新 detector 輸出若含中文可能再撞 | 本片不新增 detector；若動 `check_entity_index.py` 的訊息，先在本機跑 `run_all` 確認 |
| **Prisma 三份真相**（`AD-PrismaEnumThreeTruths-1`）—— 本片新增 **3 個 enum** | migration 套用後必跑 `prisma generate`；int suite 的 global setup 會重建，但**部署路徑不會** |
| 🔴 **Day-0 D1：§3.x 對 `Event.status` 的第一個理由不成立** —— 「不在 `02a:233` 的欄位清單上」對**任何** base field 都成立（`02a:157`：§3 只列 entity-specific 欄位），因此不是理由 | 省略 `status` 的理由收斂為**單一條、等級 JUDGEMENT**：`02a:417` 給 5 態、`11:45-58` 給 8 個具名狀態，共通 4 態，**從未裁決**。⚠️ 與 `Attestation`（`schema.prisma:2228-2235`）**理由相反** —— 那裡是「§4 沒給 lifecycle」，這裡是「§4 給了，而另一份權威不相容」。⛔ migration banner 必須寫修正後的理由，否則會成為下一個 phase 抄襲的假模板 |
| 🟡 **Day-0 D7：`EventSeverity` 的字面大小寫未經裁決** —— 使用者裁決的是**三級值域**，`11:37-39` 的字面是大寫 `S1/S2/S3`，而 33/33 個既有 enum 全小寫（`CiaType { c i a ci }` 是把大寫縮寫小寫化的直接先例）| 採 `{ s1 s2 s3 }` + `@@map("event_severity")`，**標為可推翻**並已在回報中向使用者標出。UI 顯示由 i18n 層負責（guardrail 9），資料層不承擔展示字面 |
| 🟡 **Day-0 D9：`npm run prisma:migrate` 是 `migrate dev`**，正是 `AD-DevDbChecksumDrift-1` 擋住的子指令 | checklist 1.2 的 Verify **不照抄 plan** —— 改 `npx prisma migrate deploy`（W17 已實證可用），migration 手寫 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **`AccessRequest` · `AccessReviewCampaign`** — slice 14。
  🔴 前者的 `org_entity_id` nullable（`02a:325`）與約束 8 鐵律 1 衝突，**建它之前必須裁決**：
  規格解釋了「為什麼要 nullable」（外部稽核員的 just-in-time 存取），
  **但沒有回答「NULL 的列怎麼被 RLS 治理」**——
  而 `extension_fields` 的同一形狀曾產生 `AD-GroupRowTheft-1`
- **`Event.status` 的 lifecycle 裁決** — M6 表單之前 → 新 AD
- **`Issue.source` 補 `incident`** — 需要 companion id 欄位，M6
- **restricted block 與其權限閘門** — Wave 2 + M4（`AD-Incident-1` 🔴 P0）
- **`AD-Model-Gaps` 的 `business_unit` 裁決** — 該欄屬 Wave 2 extension，本片碰不到
- **兩表的 repository / endpoint / 排程 job** — M6 / M8
