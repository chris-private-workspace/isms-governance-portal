---
status: closed   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W12 Plan — Audit-trail hash chain spike, to settle ADR-0003

**Summary**: 量測 OQ-4 的選項，用**真實寫入路徑**而非孤立 INSERT，
據此拍板 **ADR-0003** 並交付 `audit_log` 與 verify-integrity routine。
⚠️ **Day-0 後經使用者核可修訂為 A vs B 兩個**（原為三個 —— 見 §3.2 revision note 與 §8 D3）。
關掉 **OQ-4**，讓 **R4**（連續 8 個 phase 擴大、18 張表無稽核）首次有 mitigation，
並使 `07` 的 milestone security gate（「every state change is audited」）**首次可達**。
⛔ 本 phase **不**把 11 個模組全部接上 —— 只接 1 個以取得真實數字。
無 user-facing surface ⇒ **gate-only verified，不做 drive-through**。
**spike ⇒ 必須產出 design note**（Day 4，`task-workflow.md` §Step 5.5）。

**Status**: Closed（2026-08-14 Day 4 收尾；六個 US 全數交付、checklist 25 項全勾、無 🚧。
⏳ **calibration 的 actual 於第二個 closeout commit 回填** —— `AD-EstimateAsMeasurement-1`）
—— 原為 Approved-to-execute（laitim2001 於 2026-08-14 核可；軌別同日由使用者選定「先拍板 ADR-0003」，
**但改判為 Phase 軌（spike）而非「不走軌」** —— `14-adr/README.md:106` 的判準是「需先 spike」，
且 ADR-0004 / 0005 各由 W02 / W03 spike 拍板，本 repo 對此有兩個先例。
⚠️ **Day-0 後修訂並經 laitim2001 於 2026-08-14 再確認**：範圍由三個策略縮為 **A vs B**，
理由是 D3 —— `runScoped` 的 array 形式交易讓 A/C 的應用層實作不可行）

**Branch**: `feature/W12-audit-trail`
**Base**: `main` HEAD `1c5a6ac`（W11 post-merge 修補；PR #56 + #57 皆 MERGED）
**Slice**: standalone spike —— 關掉 **OQ-4** → **ADR-0003**；`audit-trail` 範疇的第一段 code
**Scope decisions**: (a) 三個選項**都實作到可量測**，不預選 (b) 量測必須在**真實寫入路徑**上
(c) 只接 **1 個模組**取得數字，不接 11 個 (d) `actor_id` 假名，**永不存個資**

---

## 0. Background

### The gap（OQ-4 未拍板 · R4 連續 8 個 phase 擴大）

- guardrail 5 要求**所有狀態變更**寫入 append-only、防篡改的日誌。今天**一條都沒有**。
- `RISK_REGISTER` R4：W02 兩張表 → … → W11 **十八張，無一有稽核**，
  且該列自己寫著「⛔ 每個新增業務表的 phase 都會讓它更大，**而沒有任何 gate 會叫**」。
- `created_by` / `updated_by` 欄位存在但**永遠是 NULL**（刻意 —— 填佔位使用者會讓 M3 的問題
  用謊話被回答）。

### Why it matters（缺失的能力）

稽核員問的是「**誰在什麼時候把什麼改成什麼，憑什麼**」。今天平台一個字都答不出來。

更尖銳的三個例子已經在 register 上：`evidence` 這張表**存在的目的就是證據等級的主張**，
而寫入它的動作沒有稽核；`Issue.status = risk_accepted` 是一次**正式的風險接受**，
今天是一個沒有簽名的 enum 值；W11 的 SoA 一列 `applicable = false` 是一次**正式的控制排除**，
可以被任何人在任何時候寫成任何理由。

⭐ **而且它擋著一個 milestone**：`07` §Security gate 寫「no milestone is done until …
**every state change is audited**」⇒ **M1 的 DoD 在 `audit_log` 存在之前就是不可達的**，
與剩下幾張表無關。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `1c5a6ac`）| Anchor |
|-------|--------------------------------------------|--------|
| 決策 | OQ-4 三選一（A 逐列 chain / B 週期錨定 / C 混合），**「誰能決定」欄位是 ⚠️ 未指定** | `decision-form.md:19` |
| 為何延後 | 「W01 spike 之後 —— 判準是**寫入吞吐量**，零 code 時量不出來」 | `14-adr/README.md:106` |
| ⭐ 該條件現況 | **早已不成立** —— 今天 20 張表、172 個 int 測試、真 PostgreSQL。gate 可通過已久而無人回頭看 | 本 phase 的前提 |
| 規格（已定調部分）| append-only（永不 UPDATE/DELETE）+ **假名 actor，永不存個資** —— 後者是刪除權與 guardrail 5 的調和點 | `02a:309` |
| 規格（Wave 1 範圍）| 「the chained log table, a write path that no domain write can bypass, and a verify-integrity routine」 | `05:24` |
| 欄位清單 | `audit_log` 的欄位與 hash 欄在 rule 檔，不在 `02a` | `multi-tenant-data.md` §稽核軌跡 |
| 攔截點 | ADR-0004 §Consequences 已指定：**與 entity-scope 共用 client extension** | `decision-form.md:25` |
| 滾升 | guardrail 4：滾升是合法跨實體讀取，**其自身也必須被稽核** | `multi-tenant-data.md:161` |

→ 表可以建、鏈可以實作，**但不能先選一個**：OQ-4 的三個選項差在寫入成本與驗證成本，
而那正是**只能量、不能推**的東西。本 phase 的產出是那組數字，ADR 是它的結論。

### The design（一張表 + 三個可切換的 chain 策略 + 1 個接上的模組 + verify routine）

```
NEW  migrations/<ts>_audit_log/     audit_log（append-only：無 UPDATE/DELETE GRANT，無對應 policy）
NEW  contracts/audit-hook.ts        攔截介面（範疇 api）—— 依賴反轉，見 §3.3
NEW  audit-trail/chain.ts           B（應用層週期錨）+ 兩者共用的 hash 計算
NEW  audit-trail/audit.repository   append only；actor 假名；client 走參數不走 import
NEW  audit-trail/verify.ts          verify-integrity：重算鏈、回報第一個斷點
NEW  audit-trail/bench.int.spec.ts  ⭐ 量測：A(trigger) vs B(app) × 真實路徑 × 驗證成本
EDIT entity-scope/scoped-prisma      依賴 contracts 的介面 —— 只接 1 個模組
NEW  docs/14-adr/0003-*.md           ADR，含可證偽條件
NEW  docs/02-architecture/design-notes/W12-*.md   spike 的 design note
```

**為何三個都實作而不是先選**：`decision-form.md:19` 明寫「決定後改動代價高」。
而 W02 / W03 兩個 spike 的共同教訓是 —— **先量再設計**，
W07 甚至量到「關掉 oracle 的是執行順序不是 trigger 本身」這種推不出來的事。

### Ground truth（recon head-start —— 於 `main` HEAD `1c5a6ac` 讀過的 code）

- `05:18-24` — audit trail 的四條性質 + Wave 1 範圍三件事
- `02a:309-312` — 兩條**無論選哪個都成立**的性質（append-only · 假名 actor）
- `multi-tenant-data.md` §稽核軌跡 — `audit_log` 欄位草稿（`entity_id` / `actor_id` /
  `actor_scope` / `operation` …）
- `scope-refusal.ts` · `scoped-prisma.provider.ts:83` — `runScoped` 每個 operation 各自一個交易，
  ⚠️ **這會直接影響鏈的實作**（W10 為此把 promote 移進 DB trigger）
- `08-rollup-dashboard-spec.md` — 滾升讀取也要被稽核（guardrail 4）

**Baselines（W11 closeout）**: api unit **376 / 35** · api int **172 / 13** · web **10 / 1** ·
coverage **91.83 / 91.01 / 97.5 / 93.29** · `run_all` **8/8** · `check_entity_index` **20 / 35** ·
lint 0 · type 0 · build clean ×2。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-fields** — `multi-tenant-data.md` §稽核軌跡 的欄位清單**逐欄**比對 `05:21` 的 Content 要求
  （actor / action / target / before-after / timestamp / source context）→ 影響 §3.1
- **D-txn** — `runScoped` 的交易邊界：鏈的 `prev_hash` 讀取是否會與寫入分屬兩個交易 → 影響 §3.2
- **D-intercept** — ADR-0004 §Consequences 對攔截點的實際措辭，確認它真的說了「共用」→ 影響 §3.3
- **D-index** — `audit_log` 在 `02a` §0 的那一列是否仍為 Wave 1 且註記未變 → 影響驗收 1
- **D-throughput** — 既有 int suite 的單次寫入耗時基準（沒有基準就沒有「變慢多少」）→ 影響 §3.4

## 1. Phase Goal

用**量測**而非推論拍板 OQ-4：在真實寫入路徑上量出三個 chain 策略的寫入成本與驗證成本，
交付 `audit_log`、verify-integrity routine 與**一個接上的模組**，並據此採納 **ADR-0003**。
證明方式：gates 全綠 + **中性化元驗證**（拿掉 append-only 保護 / 竄改一列後 verify 必須指出斷點）
+ **量測表**（三個策略 × 兩個成本維度，數字先於結論）。
**無 user-facing surface ⇒ 報告一律 gate-only verified。**
**spike ⇒ Day 4 必須額外產出 design note**；**產出 ADR-0003（含可證偽條件）**。

## 2. User Stories

- **US-1**（table）: 作為稽核員，我希望有一張 append-only 的日誌表，以便狀態變更有落點。
- **US-2**（chain）: 作為平台維運者，我希望竄改任何一列都會被 verify 指出來，以便日誌可被信任。
- **US-3**（measurement）: 作為決策者，我希望看到三個選項的**實測**寫入與驗證成本，以便 ADR 不是猜的。
- **US-4**（interception）: 作為開發者，我希望寫入路徑上有一個**無法繞過**的攔截點，以便未來的模組不必各自記得。
- **US-5**（meta-verification）: 作為未來的維護者，我希望知道關掉每個防護會壞哪個測試。
- **US-6**（closeout）: 作為下一個 session，我希望 ADR-0003 已採納、design note 已抽取、導航檔已更新。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW    apps/api/prisma/migrations/<ts>_audit_log/migration.sql   表 + GRANT（無 UPDATE/DELETE）+ RLS
EDIT   apps/api/prisma/schema.prisma                             model AuditLog
NEW    apps/api/src/contracts/audit-hook.ts                      介面（範疇 api，見 §3.3）
NEW    apps/api/src/audit-trail/chain.ts + spec                  B + 共用 hash 計算
NEW    apps/api/src/audit-trail/audit.repository.ts + spec       append only
NEW    apps/api/src/audit-trail/verify.ts + spec                 重算鏈 + 回報第一個斷點
NEW    apps/api/src/audit-trail/audit.module.ts                  DI
NEW    apps/api/src/audit-trail/audit.int.spec.ts                4 範疇測試 + 竄改偵測
NEW    apps/api/src/audit-trail/bench.int.spec.ts                ⭐ 三策略量測
EDIT   apps/api/src/entity-scope/scoped-prisma.provider.ts       攔截點（只接 1 個模組）
EDIT   apps/api/src/bootstrap/app.module.ts                      +1 module
NEW    docs/14-adr/0003-audit-trail-hash-chain.md                ADR（含可證偽條件）
NEW    docs/02-architecture/design-notes/W12-audit-trail.md      design note（spike 強制）
EDIT   docs/decision-form.md                                     OQ-4 移到「已拍板」
UNTOUCHED  其餘 10 個模組                                        本 phase 只接 1 個
UNTOUCHED  apps/web/**                                           無 UI
```

### 3.1 表（US-1）— `migrations/<ts>_audit_log/`

- 欄位以 `multi-tenant-data.md` §稽核軌跡 為底，**逐欄對照 `05:21` 的 Content 要求**補齊
- ⛔ **GRANT 只有 SELECT + INSERT** —— 沒有 UPDATE / DELETE，且**不建對應 policy**
  （ADR-0014：缺席的 policy 比窄的 policy 更嚴格；W10 量過這個形狀）
- `entity_id NOT NULL`（約束 8 鐵律 1）+ 三條 per-command policy 的**只讀寫兩條**
- `actor_id` **假名**，`02a:311` 已定調：**永不存個資**

### 3.2 鏈（US-2）— **A vs B 兩個**（⚠️ Day-0 修訂，原為三個）

> **Revision note（2026-08-14，使用者核可）** —— 原文寫「三個策略**同一個介面**，
> 差異只在 `computeHash` 與錨點寫入」，並把 C（混合）列為第三個實作項。
> **Day-0 的 D3 推翻了那個前提**：`runScoped` 用 array 形式的 `$transaction`
> （`scoped-prisma.provider.ts:83`），那是一批**已建構好**的 PrismaPromise，
> **中間插不進應用邏輯** —— 而該函式的 docstring（`:92-95`）明說 array 形式
> 正是它能被 extension 掛上的原因。⇒ 逐列 chain 的「讀 `prev_hash` → 寫列」
> **不能在應用層與領域寫入同交易**，必須落在資料庫。
> 兩個策略因此**不在同一層**，「同一個介面」不成立。

| 選項 | 落點 | 形狀 | 預期成本 |
|---|---|---|---|
| **A** 逐列 chain | **資料庫 trigger**（PL/pgSQL）| `AFTER INSERT` 讀上一列的 `hash`，寫 `hash(content ‖ prev_hash)` | 寫入貴（每列一次額外讀）· 驗證線性 |
| **B** 週期錨定 | **應用層** | 每列只存 content hash；每 N 列寫一個錨列 | 寫入便宜 · 驗證需重算整段 |

⭐ **C（混合）不實作，改為從 A 與 B 的數字推導** —— C 是「A 加上週期錨」，
它的寫入成本 ≈ A、驗證成本介於兩者之間，量完 A 與 B 就答得出來。
plan §8 原本就把「縮成 A vs B」列為預授權的退路。

⚠️ **A 落在 trigger 是 W10 的先例**：promote 因為**同一個** `runScoped` 限制
移進 `AFTER INSERT` trigger，副作用是介面更窄。本 phase 是同一個限制的第 2 次出現。

⛔ **量測因此是跨層比較**（PL/pgSQL vs TypeScript），這件事要寫進 ADR 的
可證偽條件裡 —— 不能假裝兩個數字是同質的。

### 3.3 攔截點（US-4）— **契約層反轉**（⚠️ Day-0 修訂，原為直接呼叫）

> **Revision note（2026-08-14）** —— 原文寫「攔截點放 `entity-scope/scoped-prisma.provider.ts`，
> ADR-0004 §Consequences 已指定 ⇒ 不另建機制」。**Day-0 的 D1 發現那在機械上被禁止**：
> `eslint.config.mjs:74` 讓 `entity-scope` **不能 import `audit-trail`**，
> `:78` 讓 `audit-trail` **不能 import `core-model`**（`generated/**` 也歸在那）。
> ⛔ 且 `audit-trail/__fixtures__/cross-scope-import.ts` 是 **CH-012 的常駐負面案例**，
> 改矩陣會弄壞它 —— **矩陣不動**。

```
NEW   contracts/audit-hook.ts     介面（範疇 api）—— 雙方都可 import api
EDIT  entity-scope/scoped-prisma  依賴介面，不依賴實作   （entity-scope → api ✅）
NEW   audit-trail/*               實作介面                （audit-trail → api ✅）
EDIT  bootstrap/app.module.ts     接線                    （bootstrap → 全部 ✅）
```

- ⭐ **ADR-0004 的宣稱仍然成立** —— 攔截確實落在同一個 extension 內，
  只是經過一層契約。⚠️ ADR-0004 `:85` / `:120` / `:132` **沒有提到需要這層**，
  讀的人會以為可以直接呼叫 ⇒ 本 phase 要在 ADR-0003 裡把它講清楚
- **`audit-trail` 不能持有 Prisma client** ⇒ 沿用 **`AD-ScopedClientDI-1`（W03 裁決）**：
  型別**自宣告為結構型別**、實例走**方法參數**（既有 pattern：`scoped-client.types.ts`）
- ⛔ 本 phase 只接 **1 個模組**（`soa` —— 最新、最小、W11 剛量過它的每一條 policy）
- 驗收是「該模組的寫入**繞不過**」：中性化拿掉攔截後必須有測試轉紅

### 3.4 量測（US-3）— `audit-trail/bench.int.spec.ts`

- **兩個維度**：寫入延遲（p50 / p95，N 次真實 endpoint 寫入）· 驗證耗時（鏈長 1k / 10k）
- ⛔ **必須在真實寫入路徑上量** —— 孤立 INSERT 量到的不是這個系統的成本
- ⛔ **必須有對照組**：接上稽核之前的同一條路徑（D-throughput 的基準）
- ⚠️ 數字寫進 progress **之前**先寫下預期方向（同 W10 / W11 的中性化紀律）

### 3.x 明確不做的事

| 不做 | 去向 |
|---|---|
| 接上其餘 10 個模組 | 下一個 phase —— 本 phase 要的是**數字**與**攔截點證明** |
| 滾升讀取的稽核 | guardrail 4 要求，但 M8 才有滾升端點 → AD |
| `retention_policy` / `LegalHold` | 另一個 slice（`AD-ImmutableRowRetention-1`）|
| 稽核軌跡的 UI / 匯出 | 報表層，Wave 1 不做 |
| before/after 快照的**壓縮或 diff 演算法** | 先存整份，量到問題再說（AP-5）|

### 3.y Validation（US-1..US-5）

Gates: format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit / int 全綠 ·
coverage 不低於 baseline 的 **branch / funcs**（⚠️ stmts / lines 見 `AD-ModuleFileZeroCoverage-1`）·
`run_all` **8/8** · `check_entity_index` **21 / 35**。

**中性化（US-5，預期方向必須寫在執行之前並先 commit）**：

| N | 拿掉什麼 | 用途 |
|---|---|---|
| N1 | `prev_hash` 的串接（改成只存 content hash）| 竄改偵測是否真的靠鏈 |
| N2 | 攔截點 | 該模組的寫入是否真的繞不過 |
| N3 | append-only（補上 UPDATE GRANT）| 是 GRANT 還是 policy 在擋（W10 量過這個形狀會反轉）|
| N4 | RLS 的 SELECT policy | 稽核日誌本身是否 entity-scoped |

⛔ **無 drive-through** —— 無 UI。報告一律寫 gate-only verified。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_audit_log/migration.sql` | NEW |
| 2b | `apps/api/src/contracts/audit-hook.ts` | NEW（Day-0 D1 新增）|
| 3 | `apps/api/src/audit-trail/chain.ts` + `.spec.ts` | NEW |
| 4 | `apps/api/src/audit-trail/audit.repository.ts` + `.spec.ts` | NEW |
| 5 | `apps/api/src/audit-trail/verify.ts` + `.spec.ts` | NEW |
| 6 | `apps/api/src/audit-trail/audit.module.ts` | NEW |
| 7 | `apps/api/src/audit-trail/audit.int.spec.ts` | NEW |
| 8 | `apps/api/src/audit-trail/bench.int.spec.ts` | NEW |
| 9 | `apps/api/src/entity-scope/scoped-prisma.provider.ts` | EDIT |
| 10 | `apps/api/src/bootstrap/app.module.ts` | EDIT |
| 11 | `docs/14-adr/0003-audit-trail-hash-chain.md` | NEW |
| 12 | `docs/02-architecture/design-notes/W12-audit-trail.md` | NEW |
| 13 | `docs/decision-form.md` | EDIT（OQ-4 → 已拍板）|
| 14 | `docs/03-implementation/changes/CH-029-w12-audit-trail.md` | NEW（closeout 單檔記錄）|
| — | `apps/api/src/core-model/scope-refusal.ts` | **UNTOUCHED** |
| — | `eslint.config.mjs` 的 MATRIX | **UNTOUCHED** —— ⛔ 改它會弄壞 CH-012 的常駐負面案例（Day-0 D1/D5）|
| — | `apps/api/src/audit-trail/__fixtures__/` | **UNTOUCHED** —— 「DO NOT FIX THIS FILE」|
| — | 其餘 10 個 `modules/*` | **UNTOUCHED** —— 只接 1 個 |
| — | `apps/web/**` | **UNTOUCHED** —— 無 UI |

## 5. Acceptance Criteria

1. `check_entity_index` 回報 **21 / 35**（機械導出）
2. **竄改任何一列後 verify 指出第一個斷點**，且 N1 拿掉串接後該測試轉紅
3. **A 與 B 的量測表存在**（⚠️ Day-0 修訂：原為三個），含對照組（未接稽核的同一路徑）
   與 p50 / p95 / 驗證耗時；**C 的成本由 A、B 推導並在 ADR 中寫明是推導不是量測**
4. **ADR-0003 已採納**，含**可證偽條件**（`14-adr/README.md` 的 forcing-function 判準）；
   OQ-4 移入 `decision-form.md` 的已拍板區
5. 4 個範疇測試（跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 / append-only 由誰擋清楚）
6. **接上的那個模組的寫入繞不過** —— N2 中性化後有測試轉紅
7. ⚪ **Drive-through 不適用**（純後端）—— 報告寫 **gate-only verified**
8. **design note 已抽取**（spike 強制，`spike-design-note-gate.md` 的 8-point gate）
9. Gates 全綠（§3.y）；R4 更新為「首次有 mitigation」；calibration 已回填；導航檔已更新

## 6. Deliverables

- [x] US-1 `audit_log` 表 + migration（append-only 由 GRANT 與缺席的 policy 兩層）
- [x] US-2 **A（DB trigger）+ B（應用層錨定）** + verify-integrity routine + 竄改偵測測試
- [x] US-3 量測表（**A vs B** × 寫入 / 驗證成本 + 對照組；C 由推導）
- [x] US-4 **contracts 介面** + 攔截點 + 1 個接上的模組 + 繞不過的證明
- [x] US-5 四個中性化，預期方向先 commit，結果逐項對照
- [x] US-6 **ADR-0003 採納** + design note + CH-029 + 導航檔 + calibration 回填
      （⏳ **calibration 的 actual 於 closeout commit 之後回填** —— `AD-EstimateAsMeasurement-1`）

## 7. Workload Calibration

- Scope class **`spike` 0.65**（`CALIBRATION-MATRIX.md:55` —— 新領域、無藍本。
  本 phase 是該欄的**第 6 個資料點**）。
  ⚠️ **依 `AD-CalibrationDay0InOrOut-1` 明確宣告量法**：**含 Day 0，且窗口 = branch 第一個
  commit → closeout commit**（與 W11 同一定義；W11 暴露的「起草不在窗口內」仍成立，照記）。
  ⛔ **依 W11 的教訓**：actual **必須等 closeout commit 真的存在之後再算**，
  不得用預估的收尾時間（`AD-EstimateAsMeasurement-1` 已因此被記了 2 次）。
- **Agent-delegated: no**（< 20% —— 自己直接做）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est ~6.0 hr —— ⚠️ **Day-0 後重新逐項拆解，總數巧合地相同**：
  Day 0 recon 0.7 · 表 + migration 1.0 · **A（PL/pgSQL trigger）0.9** ·
  **B（應用層）0.4** · **contracts 介面 0.3** · verify 0.6 · 攔截點 1.0 ·
  量測 0.7 · 中性化 0.4 → **calibrated commit ~3.9 hr（mult 0.65）**。
  ⭐ **少做一個策略（−0.5）但 A 改成 PL/pgSQL 且多一層契約（+0.5）**，
  兩邊抵消 —— 這是**重算的結果，不是為了讓數字好看而保留原值**。
  ⚠️ `spike` 這一欄的 `actual/bottom-up` 曾低到 0.20（`AD-BottomUpBlueprint-1`），
  所以這個 bottom-up 本身也是待驗的資料點。Day-4 retro Q2 驗證。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ✅ **已於 Day 0 實現（D3）**：`runScoped` 的 array 形式交易讓 A/C 的應用層實作不可行 | **A 改為 DB trigger、C 不實作**，使用者 2026-08-14 核可。§3.2 已修訂並保留 revision note。⚠️ **這條風險原本寫的是「Day-0 先量」，而它真的量到了東西** —— 若留到實作才發現，成本是重寫 §3.2 而不是改一段文字 |
| ✅ **已於 Day 0 實現（D1）**：攔截點的位置被邊界矩陣機械禁止 | 經 `api` 契約層反轉（§3.3）。⛔ **不改 MATRIX** —— 它守著 CH-012 的常駐負面案例 |
| ⛔ **A 是本 repo 第一段做 hash 的 PL/pgSQL** | W07 / W09 / W10 已有三個 trigger 先例（`assert_parent_in_scope` · `template_version` · promote），但都不算 hash。⚠️ `pgcrypto` 是否可用要在 Day 1 **先確認**，不要寫完才發現 |
| **量測沒有對照組就沒有意義** | §3.4 明列對照組為驗收的一部分；Day-0 **D-throughput** 先取基準 |
| `AD-BorrowedRefusal-1` **第 7 次** —— append-only 到底是 GRANT 還是 policy 在擋 | N3 專門量這個。⚠️ W10 在同一個問題上**寫錯過註解**（以為是 policy，實為 GRANT），且 W11 又錯一次（以為是 `WITH CHECK`，實為 SELECT policy）→ **本 phase 不預先在註解裡宣稱因果** |
| `AD-NarrowPatternWideClaim-1`（本週第 4 次）| 本 phase 每一次「grep 得到 N 個」都要有**第二條獨立路徑**交叉檢查。⭐ 本 plan 起草時已再現一次（實體計數 19 vs 20），當場攔下 |
| **`AD-PartialGateReportedAsFull-1` 第 4 次** —— Day 3 的中性化會改 code 而 full gate 停在 Day 2 | checklist Day 3 §3.x **逐項複製** Day 2 的 gate 清單，理由寫「中性化本身會改 code」|
| Risk Class C（陳舊 dev server）| 無長駐服務驗證需求；int 測試各自建 testing module |
| ⛔ **dev DB checksum 漂移未修**（`AD-DevDbChecksumDrift-1`）| `migrate dev` 仍會被擋 → migration **預期要手寫**，且改註解前先查 `_prisma_migrations` |
| **R4 更新的措辭風險** | 本 phase 交付的是**機制**不是覆蓋率 —— 18 張表裡只有 1 張接上。R4 的更新必須寫清楚這一點，不得讀成「已解決」 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- 接上其餘 10 個模組 — 下一個 phase；本 phase 交付機制與數字
- **選項 C（混合）的實作** — 由 A 與 B 的數字推導，ADR 要寫明那是推導不是量測
- **`runScoped` 改成 interactive `$transaction`** — 那是動 guardrail 4 最承重的一段，
  應該自己是一個 phase（使用者 2026-08-14 明確不選這條路）
- 滾升讀取的稽核（guardrail 4 明文要求）— M8 才有滾升端點 → AD
- `retention_policy` / `LegalHold` — 另一個 slice（`AD-ImmutableRowRetention-1`）
- 稽核日誌的查詢 API / UI / 匯出 — 報表層，Wave 1 不做
- 個資刪除流程（`erase_person`）— 需要 M4 的身分模型 → AD
- before/after 的 diff 壓縮 — 先存整份，量到問題再說（AP-5）
