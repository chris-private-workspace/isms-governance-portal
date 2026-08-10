---
status: closed
---

# Phase W03 Plan — Governed extension storage, proven against RLS

**Summary**: 拍板 **ADR-0005**（受治理擴充欄位儲存），並在同一個 phase 用它建出第一條
**真實的後端垂直切片** —— Policy repository → `/policies` endpoint → 經 RLS 讀寫真 DB。
關掉 ROADMAP 主線的**三條 M1 前置**（`AD-CacheControl-1` · `AD-ScopedClientDI-1` ·
`AD-ScopeConcurrency-1`）與 `decision-form.md` **OQ-6**。
**範圍決定：不含前端頁面** —— 因此無 drive-through，收尾標 `gate-only verified`。
**是 spike phase → design note MANDATORY**。

**Status**: **CLOSED**（2026-08-10）—— 原為 Approved-to-execute（使用者於 2026-08-10 核可並
指示開始 Day 0；範圍經同日 AskUserQuestion 選定「後端垂直切片」）。
收尾見 [retrospective.md](./retrospective.md)。⚠️ **範圍有一處超出 §4**：
`core-model/scope-refusal.ts` 等 7 檔 —— Day 3 API 級驗證找出的、US-3 交付物自身的缺陷，
deviation 記於 [progress.md](./progress.md)「Day 3（續）」

**Branch**: `feature/W03-governed-extension`
**Base**: `main` HEAD `5bbc252`（CH-017 節流閘 + hook）
**Slice**: 關 OQ-6 / ADR-0005 · `AD-ScopedClientDI-1` · `AD-CacheControl-1` ·
`AD-ScopeConcurrency-1`。M1 arc 的第 1 片（standalone spike，M1 本體是後續 phase）
**Scope decisions**: (a) 後端到 API 層，**前端零改動** (b) 沿用 W02 已建的 `Policy` 表，
**不建新業務表** (c) OQ-6 三方案**在真 schema 上實測**後拍板，不做紙上比較
(d) field catalog 的**驗證機制**是本 spike 的承重問題，不是 JSONB 本身

---

## 0. Background

### The gap（OQ-6 / ADR-0005 未拍板 → M1 無法開始）

- `07:32` 的 **M1 DoD 明文要求** "governed-extension mechanism **working**" —— 那就是 ADR-0005。
- ADR-0005 自 2026-08-07 起在 `decision-form.md` **開放中**，標「⚠️ 未指定決策者」。
- 因此 M1 的第一張表**不能建**：欄位形狀取決於一個沒有答案的問題。

### Why it matters（缺失的能力）

沒有受治理的擴充機制，guardrail 3 的「canonical core + **governed** local extensions」
只有前半句能執行。實務後果是：13 家 OpCo 一旦需要在地欄位，**各自加欄位**是唯一可行路徑 ——
那正是 CLAUDE.md 設計原則 2 指名要避免的分叉。

同時 M1 是所有模組的地基，它被擋住等於整個 Wave 1 被擋住。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `5bbc252`）| Anchor |
|-------|--------------------------------------------|--------|
| Schema | 刻意不建業務表，理由寫明是 ADR-0005 未採納 | `apps/api/prisma/schema.prisma:9-12` |
| Policy 表 | 存在但**刻意不完整**，缺的欄位逐項列出，含 `extensions — needs ADR-0005` | `schema.prisma:95-104` |
| 技術傾向 | 已傾向 **JSONB + central field catalog**，但「validation approach」是空白 | `06:18` · `06:35` |
| 消費者 | `core-model` **無 repository** —— 範疇化 client 的 DI 從未被驗證 | `AD-ScopedClientDI-1` |
| 端點 | 全 API 只有 `GET /health` 一個 | `health.controller.ts:19,23` |

→ **ADR-0005 擋著 M1 這件事，W01 就寫進了 schema 註解**，但從未進入任何追蹤清單 ——
直到 2026-08-10 填 `ROADMAP.md` 時才被發現（`CH-017` 的同一個根因：寫在沒人回頭讀的地方）。
修正必須同時做兩件事：**拍板機制**，並**用一個真的消費者證明它能跑**。

### The design（backend-only：1 個 JSONB 欄位 + 1 張 catalog 表 + 1 個 repository + 1 個 controller）

```
schema.prisma
  Policy.extensions          Json?    @db.JsonB      <- 受治理的擴充承載
  model ExtensionField       NEW                     <- 中央 field catalog
    orgEntityId, entityType, key, dataType, required, enumValues…

core-model/policy.repository.ts        NEW  <- 第一個範疇化 client 的消費者
core-model/extension-validator.ts      NEW  <- catalog 驅動的寫入驗證
modules/policy/policy.controller.ts    NEW  <- GET /policies · POST /policies
bootstrap/security.ts                  EDIT <- Cache-Control 政策（AD-CacheControl-1）
```

**為何選 JSONB 而非 EAV / 側表**：`06:18` 已把 JSONB 列為選 PostgreSQL 的理由之一。
本 spike **不重開那個比較**，而是驗證它未被回答的那一半 —— **validation approach**：
一個 JSONB 欄位若沒有 catalog 強制，就是「各自加欄位」換了個位置而已。

### Ground truth（recon head-start —— 於 `main` HEAD `5bbc252` 讀過的 code）

- `schema.prisma:95-104` — Policy 刻意缺的 8 個欄位逐項列出，`extensions` 是其中之一
- `schema.prisma:105-125` — Policy 全欄位為 scalar，選它正因為 Risk 帶 4 個未建表的 FK
- `entity-scope/scoped-prisma.provider.ts:68-89` — `runScoped` 把每個 operation 包進
  設 `app.entity_scope` 的 transaction；repository 必須經由它，不得持有裸 client
- `06:35` — ADR-0005 的待答項是「JSONB + central field catalog; **validation approach**」
- `AD-ScopedClientDI-1` — 可行拆法已記錄：**token 在 `api`、型別在 `core-model`、
  實例由 `entity-scope` 提供**（`scope-boundaries.md:124` 的原設計意圖做不到）

**Baselines（W02 closeout）**: unit test 33 · int test 20 · web test 10 ·
coverage 95.95/82.35/88/96.29 · lint 0 · type-check 0 · build clean · `run_all` 6/6。
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-proc-freshness** — port 3200/3210 有 listener 但**進程年齡未驗**（W02 踩過 Risk Class C：
  進程比 `dist` 舊 4 小時 10 分）→ 若陳舊，所有 runtime 觀測不可採信
- **D-env-role** — `.env` 是否仍指向受限角色（`AD-EnvDrift-1`：W02 曾整輪以 superuser 跑而全綠）
- **D-jsonb-rls** — JSONB 欄位與 RLS policy 的交互**未驗**：`WITH CHECK` 是否覆蓋 JSONB 內容
- **D-catalog-scope** — field catalog 自身該不該 entity-scoped？若是，跨實體共用欄位無處可放；
  若否，它是第二張 `org_entities` 式的全域表 → 影響 §3.2

## 1. Phase Goal

拍板 **ADR-0005**（含可證偽條件），並用**第一個真實的 repository + endpoint** 證明該機制能在
W02 建立的 RLS 之下運作 —— 擴充欄位的寫入受 catalog 強制、讀寫皆經範疇過濾、
且跨實體存取在應用層與資料庫層各自被拒。以 gates（lint / type / unit / **int** / build /
`run_all`）+ **元驗證**（弄壞 catalog 驗證與 RLS，各看它紅）證明。
**產出 design note（spike 強制）+ ADR-0005 + change record。無 user-facing surface → 無 drive-through。**

## 2. User Stories

- **US-1**（decision）: 作為專案擁有者，我希望 OQ-6 由**實測**而非論證拍板，
  以便 ADR-0005 的可證偽條件是量出來的而不是想出來的。
- **US-2**（core-model）: 作為 M1 的建置者，我希望有**第一個經 DI 取得範疇化 client 的 repository**，
  以便 `AD-ScopedClientDI-1` 的三段拆法被真實消費者驗證過，而不是繼續當設計意圖。
- **US-3**（api）: 作為區域 ISO，我希望 `/policies` 只回我範疇內的政策且**回應不被快取**，
  以便第一個業務端點就同時滿足約束 8 與 `16:22`（`AD-CacheControl-1`）。
- **US-4**（entity-scope）: 作為稽核人員，我希望**並行請求不會互相污染範疇**，
  以便唯一不會拋錯的隔離失敗模式有常駐測試守著（`AD-ScopeConcurrency-1`）。
- **US-5**（closeout）: 作為下一個 phase 的自己，我希望 design note / ADR / change record /
  BACKLOG / ROADMAP 同步收尾，以便解封條件不再寫在沒人回頭讀的地方。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   apps/api/src/core-model/policy.repository.ts          第一個範疇化 client 消費者
NEW   apps/api/src/core-model/extension-validator.ts        catalog 驅動的寫入驗證
NEW   apps/api/src/core-model/policy.repository.spec.ts     單元（含負面）
NEW   apps/api/src/contracts/scoped-prisma.token.ts         DI token（AD-ScopedClientDI-1 拆法）
NEW   apps/api/src/modules/policy/policy.controller.ts      GET/POST /policies
NEW   apps/api/src/modules/policy/policy.module.ts
NEW   apps/api/src/modules/policy/policy.int.spec.ts        四個範疇測試 + 並行汙染
NEW   apps/api/prisma/migrations/<ts>_governed_extensions/  JSONB 欄位 + catalog 表 + RLS
EDIT  apps/api/prisma/schema.prisma                         Policy.extensions + ExtensionField
EDIT  apps/api/src/bootstrap/app.module.ts                  掛 PolicyModule
EDIT  apps/api/src/bootstrap/security.ts                    Cache-Control 政策
EDIT  apps/api/src/bootstrap/security.spec.ts               新標頭的逐條斷言
UNTOUCHED  apps/web/**                                      範圍決定 (a)
UNTOUCHED  docs/06-reference/design_handoff_*/               不 port（見 §9）
```

### 3.1 Governed extension storage（US-1）— `schema.prisma` · migration

- `Policy.extensions Json? @db.JsonB` —— nullable，因為多數記錄不會有在地擴充
- `model ExtensionField`（中央 catalog）：`entityType` · `key` · `dataType` ·
  `required` · `enumValues` · `orgEntityId`
- ⚠️ **catalog 的範疇歸屬是 Day-1 要量的**（D-catalog-scope）：
  它若 entity-scoped，跨實體共用欄位無處可放；若全域，它是第二張 `org_entities` 式的表。
  **不預先選** —— 兩種都建一次最小案例再決定
- 擴充欄位與 RLS 同一個 migration（ADR-0004 §約束：**沒有任何窗口讓列不受保護**）

### 3.2 Scoped client DI（US-2）— `contracts/scoped-prisma.token.ts` · `policy.repository.ts`

- 依 `AD-ScopedClientDI-1` 已記錄的拆法：**token 在 `api`、型別在 `core-model`、
  實例由 `entity-scope` 提供**
- repository **不得**持有裸 client —— `assert-no-scope-bypass.mjs` 的三條規則對它生效
- 模仿錨點：`entity-scope/scoped-prisma.provider.ts:68-89` 的 `runScoped`

### 3.3 First business endpoint（US-3）— `policy.controller.ts` · `security.ts`

- `GET /policies` · `POST /policies`，範疇**只能**來自 session/憑證（約束 8 鐵律 3）
- 查無資料回 **404**，不回 403（約束 8）
- **Cache-Control 政策**（`AD-CacheControl-1`）：業務 API 回應 `no-store, private`；
  ⚠️ **「什麼算 sensitive」的判準要寫進 `16` 的對照，不是只加一個 header**

### 3.4 Concurrency（US-4）— `policy.int.spec.ts`

- 兩個不同範疇的 client **交錯查詢 N 次**，斷言每次只回自己的列
- W02 只做過一次性 scratchpad 量測（120 次 0 錯），**本 phase 讓它常駐**

### 3.x 明確不做的事

- **不建 M1 的其餘實體** —— 本 phase 只證明機制，實體圖是 M1 本體
- **不做前端** —— 範圍決定 (a)；`09-policies.html` 的移植等「設計真相來源」拍板
- **不補 Policy 缺的 8 個欄位** —— 它們各自依賴 M4/M5/M6
- **不碰 workflow / status 狀態機** —— OQ-7 未拍板

### 3.y Validation（US-1..US-5）

Gates: lint 0 · type-check 0 · format 0 · unit test ≥ 33（baseline）· **int test ≥ 20**（baseline）·
web test 10（不變）· build clean · `run_all` 6/6 · `lint:negative` PASS。
**元驗證（spike 強制）**：(1) catalog 驗證中性化 → 寫入非法擴充欄位應被擋，看它紅；
(2) RLS policy 中性化 → 範疇測試應紅。
**無 drive-through** —— 純後端，收尾明確標 `gate-only verified`。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_governed_extensions/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/policy.repository.ts` | NEW |
| 4 | `apps/api/src/core-model/extension-validator.ts` | NEW |
| 5 | `apps/api/src/core-model/policy.repository.spec.ts` | NEW |
| 6 | `apps/api/src/core-model/extension-validator.spec.ts` | NEW |
| 7 | `apps/api/src/contracts/scoped-prisma.token.ts` | NEW |
| 8 | `apps/api/src/modules/policy/policy.controller.ts` | NEW |
| 9 | `apps/api/src/modules/policy/policy.module.ts` | NEW |
| 10 | `apps/api/src/modules/policy/policy.int.spec.ts` | NEW |
| 11 | `apps/api/src/bootstrap/app.module.ts` | EDIT |
| 12 | `apps/api/src/bootstrap/security.ts` | EDIT |
| 13 | `apps/api/src/bootstrap/security.spec.ts` | EDIT |
| 14 | `docs/14-adr/0005-governed-extension-storage.md` | NEW |
| 15 | `docs/02-architecture/design-notes/W03-governed-extensions.md` | NEW |
| 16 | `docs/03-implementation/changes/CH-018-w03-governed-extensions.md` | NEW |
| 17 | `docs/decision-form.md` · `BACKLOG.md` · `ROADMAP.md` | EDIT |
| — | `apps/web/**` | **UNTOUCHED** |
| — | `docs/06-reference/design_handoff_isms_grc_platform/**` | **UNTOUCHED** |
| — | `apps/api/src/entity-scope/scoped-prisma.provider.ts` | **UNTOUCHED**（除非 Day-2 量到必須改，屆時記 deviation）|

## 5. Acceptance Criteria

1. **ADR-0005 已採納**，含 ≥ 3 條**可證偽條件**，且每條指得出量測方式。
2. `decision-form.md` **OQ-6** 移入已拍板，去向指向 ADR-0005。
3. `Policy.extensions` 與 `ExtensionField` catalog 存在，**擴充欄位與其 RLS 在同一個 migration**。
4. **catalog 驗證有負面測試**：寫入不在 catalog 的 key、或型別不符的值 → 被拒且**資料未變**。
5. `PolicyRepository` **經 DI 取得範疇化 client**，且 `assert-no-scope-bypass.mjs` 對它為綠。
6. `/policies` 通過**約束 8 四個範疇測試**：跨實體讀拒 / 跨實體寫拒且資料未變 /
   RLS 層獨立成立 / 滾升角色只看到授權子樹。查無資料回 **404**。
7. 業務 API 回應帶 `Cache-Control: no-store, private`，且**「什麼算 sensitive」的判準已記錄**。
8. **並行範疇汙染有常駐整合測試**（兩個範疇交錯 N 次，各自只見己列）。
9. 兩個元驗證各做一次（catalog 驗證中性化 → 紅；RLS 中性化 → 紅），結果記入 progress.md。
10. Gates 全綠（§3.y）。**無 drive-through** —— 純後端，報告明確標 `gate-only verified`，
    不得暗示可用性。
11. `AD-ScopedClientDI-1` · `AD-CacheControl-1` · `AD-ScopeConcurrency-1` **CLOSED**；
    calibration 已回填 `CALIBRATION-MATRIX.md`；BACKLOG + ROADMAP + 導航檔已更新。

## 6. Deliverables

- [ ] US-1 ADR-0005 採納（含可證偽條件）+ OQ-6 關閉
- [ ] US-2 `PolicyRepository` 經 DI 取得範疇化 client（`AD-ScopedClientDI-1` CLOSED）
- [ ] US-3 `/policies` 端點 + Cache-Control 政策（`AD-CacheControl-1` CLOSED）
- [ ] US-4 並行範疇汙染常駐測試（`AD-ScopeConcurrency-1` CLOSED）
- [ ] US-5 design note + change record + 三處收尾同步（BACKLOG / ROADMAP / decision-form）

## 7. Workload Calibration

- Scope class **`spike` 0.65**（`CALIBRATION-MATRIX.md:54` —— **第 2 個資料點**；
  W02 ratio 1.10 IN band 但 Day 0 未計時故為部分回推，該行標 KEEP 並註明「需 2 個乾淨資料點再議」。
  **本 phase 逐日計時，補上那個乾淨資料點**（`AD-TimeTracking-2`））。
- **Agent-delegated: no**（本人直接執行）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est ~19 hr（Day-0 verify 2 · OQ-6 spike + ADR 5 · repository + DI 4 ·
  endpoint + Cache-Control + 範疇測試 + 並行 5 · closeout 3）
  → class-calibrated commit **~12.5 hr** (mult 0.65)。Day-4 retro Q2 驗證。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **Risk Class C —— 陳舊長駐進程** 讓 wiring 修正看起來沒生效（W02 已踩過，進程比 `dist` 舊 4h10m）| Day-0 驗進程年齡（D-proc-freshness）；驗 runtime 行為前**乾淨重啟**並擷取 startup log |
| **`.env` 未同步** → 整輪以 superuser 跑而全綠（`AD-EnvDrift-1`，W02 曾把 fixture 跨實體搬動）| 每個量測腳本**先斷言前提**（`super=f bypassrls=f`）；`int-global-setup.js` 已有 |
| **JSONB 與 RLS 的交互未知**（D-jsonb-rls）——`WITH CHECK` 是否管得到 JSONB 內容 | Day-1 最小案例實測；若 `WITH CHECK` 管不到，catalog 驗證必須在**寫入路徑**而非只靠 DB |
| **catalog 的範疇歸屬兩難**（D-catalog-scope）| 兩種都建一次最小案例再決定；**不預先選**，結果寫進 ADR-0005 |
| **對有狀態行為只測第一次呼叫**（`AD-Day0Scope-1`，W02 的承重結論就是這樣被推翻的）| 任何 GUC / session / 連線相關量測，**必含「第二次呼叫 / 用過之後」的案例** |
| **範圍蔓延到 M1 本體** —— 建了 catalog 就想建其餘實體 | §3.x 明列不做；deliverable 綁在「機制 + 一個消費者」，不是實體圖 |
| **拿格式化輸出做機器判斷**（`AD-GrepAssertion-1`，W02 一個 phase 內 2 次）| 斷言用退出碼或 SQL 述詞；非 grep 不可時必附「應該被抓到」的負面案例 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **前端頁面 / mockup port** — 需先拍板「設計真相來源」（27 個 fragments 是 2,298 個 inline style，
  `class=` 0 個；`components.css` 自承是 recreation 且從未被驗證與 inline 值相符）→ 另開 spike + ADR
- **M1 其餘實體圖** — 本 phase 只交付機制與一個消費者 → M1 本體 phase
- **Policy 缺的 8 個欄位**（`ref_code` / `status` / `owner_user_id` / …）— 各自依賴 M4 / M5 / M6
- **稽核軌跡攔截**（guardrail 5）— M3 / ADR-0003 / OQ-4
- **`16` 的 28 點自動化實作** — 分類已完成，實作 → `AD-SecDoDAutomation-1`
- **編號引用 detector** — 需先拍板「預留 vs 失效」判準 → `AD-StaleRecordRef-1`
