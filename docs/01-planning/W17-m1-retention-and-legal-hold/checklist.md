# Phase W17 — Checklist (Records retention and legal hold)

[Plan](./plan.md)

**T0 (UTC)**: `2026-08-16T13:24:10Z` —— ⭐ 蓋在動 checklist 之前，
清償 `AD-CalibrationNoTimeRecord-1` 的最小改進（W16 retro 指定）。
⚠️ **plan 起草段仍是估算** —— 那一段發生在 T0 之前，如實標註。

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `5c42384`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 14 個路徑逐一確認存在／不存在如預期
  - DoD: NEW 檔（migration 目錄 · int spec · W17 四件套 · CH-035）確認**不存在**；
    EDIT 檔（`schema.prisma` · `int-global-setup.js` · `multi-tenant-data.md` · `02a`）確認**存在**；
    **UNTOUCHED 四項確認存在**（不存在的東西無所謂「不碰」）
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -1` → **CH-035 未被佔用**
  - ✅ 4 NEW absent · 5 EDIT present · **UNTOUCHED 1 項失敗 → D1**（`audited-models.ts` 不存在）
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-idx** — `02a:50` 逐字確認 `retention_policy` · `LegalHold` 同列且 Wave = 1 ✅
  - [x] **D-fields-r** — `02a:314-316` 的 6 個欄位名逐字比對 plan §3.1 ✅
  - [x] **D-fields-h** — `02a:318-321` 的 8 個欄位名逐字比對 plan §3.2 ✅
  - [x] **D-domain** — `02a:314-315` 的 `trigger` / `disposition` 值域逐字確認 ✅
        （plan 宣稱 creation/closure/supersession · retain/archive/purge —— 相符）
  - [x] **D-six** — `05:73-80` **恰好 6 列** ✅，三欄已抄錄進 progress
  - [x] **D-guard** ⭐ — `polymorphic_parent_guard/migration.sql` 逐字確認
        `::uuid` cast 在 **line 47**、mapping walk 在 **52-59** ⇒ **cast 確實早於 walk** ✅
        （plan §3.3 的 D3 論證成立）
  - [x] **D-global** — 確認無 RLS / 無 policy / `GRANT SELECT` only ✅；
        W15 int spec 用 `asOwner()` + **`DATABASE_URL_MIGRATE`** → **D3**（plan 誤寫 superuser）
  - [x] **D-force** ⭐ — **D4**：單空格 pattern 只回 3 個命中（W16 用兩個空格對齊），
        寬容 pattern 實測 **ENABLE 24 / FORCE 24 / 缺口 0** ✅ ——
        差點據錯數字發出 P0 警報
  - [x] **D-exempt** — `multi-tenant-data.md:57-65` 確認 `retention_policy` **不在**清單上 ✅；
        `:65` 的 `risk_scales` 列語義相容，可併入
  - [x] **D-ondelete** — **D5**：2 個命中**皆為註解**，零斷言 ⇒ plan 宣稱成立 ✅
  - [x] **D-audited** — **D6**：守衛掃 `client.<delegate>.<write>(` on `core-model/*.ts`（排 `.spec.`），
        本片零 repository ⇒ 不進 `reachable` ⇒ **保持綠** ✅（讀 `:515-546` 確認，非假設）
- [x] **Prong 2.5 — child component tree**：**N/A**（零前端）
- [x] **Prong 3 — schema verify**：
  - [x] `^model ` = **31** · `^enum ` = **30** ✅（header 自稱 31，自我可重現）
  - [x] `RetentionPolicy` / `LegalHold` → **零命中** ✅
  - [x] ⭐ **D9**：`migrate status` → `isms_dev` **17 / 23**（6 支未套用，head 停在 W10 era）
  - [x] ⭐⭐ **D10**：舊工具量錯了東西 —— `--from-migrations` **跑不起來**（缺 `shadowDatabaseUrl`）、
        `--from-config-datasource` 預設打落後 6 支的 `isms_dev`。
        **新量法**（覆寫 `DATABASE_URL_MIGRATE` → `isms_test`）分離出**恰好 2 條**既有漂移
  - DoD: ⛔ **不得**用 int suite 的重建訊息代替 —— ✅ 未使用；改用 `isms_test` 的**結果**
    （它由 `migrate deploy` 從 migration 檔建成，非從 schema push ⇒ 非循環）
- [x] **D-oracle-criterion** ⭐ — 依 `AD-UniqueKeyOracle-1` 對本片規劃的唯一鍵套判準
  - DoD: **三條獨立路徑**都掃 → **18 / 26 / 43**（partial 0）；
    ⛔ **D7**：W16 記的 10 / 22 / 34 在其 base commit 上**三個數字都不可重現**
    ⇒ 判準改為**直接讀自己的鍵**：`retention_policies(record_class)` 呼叫端可選但
    **`GRANT SELECT` only 使其今天不可達** —— 安全性來自 GRANT 不來自鍵的設計
- [x] **D-namedatalen** — 13 個識別字逐一量，最長 **35** ≤ 63 ✅（**D8**，無需 `map:`）
- [x] **D-baselines** — api unit **480 / 40** · api int **235 / 19** · web **10 / 1** ·
      coverage **92.14 / 91.77 / 98.98 / 93.56** · `run_all` **8 / 8** ·
      `check_entity_index` **30 / 36** · build clean · `lint:negative` **PASS**
  - DoD: **逐項實跑取 exit code**，與 plan §0 Baselines **逐位相符** ✅
- [x] **Catalog drift** — progress.md Day-0 表格 **11 條**（D1–D11）
  - DoD: ⛔ **不默默改 plan §Technical Spec** —— ✅ D10 加進 plan §8 Risks；
    D1/D2/D3 是路徑與用語的事實錯誤，就地更正並在 progress 留痕
- [x] **Go/no-go** — ✅ **GO**：11 條 drift 全部落在文件層（3）／方法層（5）／確認成立（3），
      **零條動到設計**，範圍變動 **< 10%**

### 0.2 Branch

- [x] `git checkout -b feature/W17-retention-and-legal-hold`（從 `main` `5c42384`）

---

## Day 1 — Schema + migration (US-1, US-2, US-3)

### 1.1 `schema.prisma`

- [x] **2 個 model + 3 個 enum**
  - DoD: `RetentionPolicy`（無 `orgEntityId`）+ `LegalHold`（`orgEntityId` **NOT NULL**）；
    enum `retention_trigger` · `retention_disposition` · `legal_hold_scope_type`；
    header count 31 → **33** 且**自我可重現**（`grep -c '^model '` 相符）
  - Verify: `grep -c '^model ' apps/api/prisma/schema.prisma`
- [x] **`onDelete` 全部顯式**
  - DoD: `applied_by` / `released_by` → `users` 各自寫明 `Restrict` / `SetNull`；
    ⛔ 不依賴 Prisma 對 optional relation 的預設（W16 教訓）
  - Verify: `prisma migrate diff` 對 `onDelete` 零差異
  - ⚠️ **偏離 DoD 且刻意**：實作為 **`Restrict` / `Restrict`**，不是 `Restrict` / `SetNull`。
    DoD 那半是我起草時照抄 `ISMSProfile.owner` 的形狀，Day 1 想清楚後推翻：
    **誰下的 hold、誰解的，正是這張表要產出的證據** —— 人離職就把它 null 掉，
    等於銷毀稽核要問的那個事實。理由寫進 schema docstring 與 migration banner。
    ⇒ 「顯式」這個 DoD 本身**達成**（兩條都明寫），被推翻的是我預設的值

### 1.2 Migration

- [x] **`20260816135016_retention_and_legal_hold/migration.sql`**（手寫，UTC 目錄名）
  - DoD: 2 表 · `legal_holds` 的 RLS **`ENABLE` 加 `FORCE`** · 2 policy（SELECT + INSERT，
    **無 UPDATE / 無 DELETE**）· 2 條 users FK · 1 條 org_entities FK ·
    UNIQUE `retention_policies(record_class)` · CHECK（`released_at` 與 `released_by` 同生同滅）·
    GRANT 兩層（retention **SELECT only**；holds **SELECT, INSERT**）
  - Verify（**Day-0 D10 改寫 —— 原指令量錯了東西**）：先跑 int suite 讓 `isms_test`
    由 `migrate deploy` 重建，再從 `apps/api` 跑
    `DATABASE_URL_MIGRATE="…/isms_test?schema=public" npx prisma migrate diff
    --from-config-datasource --to-schema prisma/schema.prisma --exit-code`
  - DoD: 漂移集合**仍恰好是 Day-0 那 2 條既有的**（`audit_log.prev_hash`/`row_hash` 的
    default 表示法 · `statements_of_applicability` 的 index rename）—— **不得變大**。
    ⛔ 不能要求 EXIT=0：那 2 條先於本片存在，把門檻設成 0 會逼人去改不屬於本片的東西
- [x] **Migration banner 寫明三件事**
  - DoD: (a) `retention_policy` 為何全域（`multi-tenant-data.md:81` 的舉證，逐字）·
    (b) ⭐ **為何不建多型守衛**（`::uuid` cast 在 mapping walk 之前 + `class` 不是 uuid +
    `record` 泛指 31 張表）· (c) `record_class` 為何是 TEXT 不是 FK（3/6 類指向 Wave 2）
  - Verify: 三段各自可獨立閱讀，不互相引用才成立

### 1.3 豁免舉證

- [x] **`multi-tenant-data.md` 併入 `risk_scales` 那一列**
  - DoD: 論證寫入；⭐ **該檔行數不變**
  - Verify: `git diff --numstat docs/rules-on-demand/multi-tenant-data.md` → 新增數 = 刪除數

### 1.x Partial gate

- [x] `format:check` · `lint` · `type-check` · `build`（api）+ `npm run lint:negative`
      （⚠️ **root script，不是 `-w apps/api`** —— Day-0 D2）—— **各自取 exit code**
  - DoD: ⛔ gate 與 commit 之間用 `&&` **不用 `;`**
    （`AD-PartialGateReportedAsFull-1` 第 4 次的形狀：gate 跑了卻不 gate 任何東西）

---

## Day 2 — Seed + integration tests (US-1, US-2, US-3)

### 2.1 Seed

- [x] **`int-global-setup.js`：retention 六列 + holds 跨兩實體**
  - DoD: 六列逐字取自 `05:73-80`（**不改寫、不正規化** —— 已確認參數 #9）；
    holds 至少 HK1 / SG1 各一列，含一列已解除（`released_at` + `released_by` 皆非 NULL）
  - Verify: 計數守衛 2 列，seed 失敗時**具名**而非靜默
- [x] ⭐ **seed 本身是一條斷言，明確標示它**
  - DoD: W16 的 N2a 教訓 —— 縮小唯一鍵時 seed 先炸，得到 setup crash 而非具名失敗。
    在 seed 旁註明它依賴哪些約束

### 2.2 Integration spec

- [x] **`retention-and-hold.int.spec.ts` —— 實際 12 條**（預估 ~8；多出的 4 條是 grant catalog、RLS+FORCE catalog、未範疇 session 讀取、以及 retention 的 RLS-off catalog）
  - DoD: 負面測試**一律以 SQLSTATE 斷言**（23503 / 23505 / 23514 / 42501），
    **從不斷言訊息字串**；⭐ `retention_policy` 的約束測試走 **migration owner 連線** ——
    `asOwner()` + `DATABASE_URL_MIGRATE`（`jurisdiction.int.spec.ts:63-67`；Day-0 D3：
    **不是** superuser）（app 角色無 INSERT ⇒ 42501 **先於**約束評估 ⇒ 走 app 角色會全綠而空轉）
  - Verify: `npm run test:int -w apps/api` → **235 → ~243 / 19 → 20**
- [x] **AC-3 / AC-4 的 catalog 斷言**
  - DoD: `legal_holds` 的 `relrowsecurity` **與** `relforcerowsecurity` 皆真；
    權限用 **`toEqual`** 逐項比對（不是 `toContain`）——
    `retention_policies` 恰為 `['SELECT']`，`legal_holds` 恰為 `['SELECT','INSERT']`
  - Verify: 斷言失敗時印出實際 catalog 內容

### 2.3 中性化預測（**寫在執行之前**）

- [x] **預測表寫入 progress.md 並 commit**（`57d13c6` —— 預測早於實測）
  - DoD: 每個實驗寫 (a) 改什麼 (b) **哪幾條**測試該紅 (c) **紅在哪個位置**；
    ⭐ **承諾形狀與位置，對條數給區間**（`AD-NeutralisationCountUnderPredicted-1`：
    W16 三次全把條數估低）
  - Verify: commit hash 記入 progress，證明預測早於實測

### 2.x Full gate

- [x] `format:check` api/web · `lint` · `type-check` · `build` api/web · `lint:negative` ·
      api unit · api int · web · `run_all` **8/8** · `check_entity_index` **32/36**
  - DoD: ⛔ **一次只跑一個 int suite** —— 並行會互相 `DROP isms_test`
    （`AD-IntSuiteNoMutex-1`，W16 實測 12 紅假象）

---

## Day 3 — Constraint verification (US-1..US-4) — **gate-only verified，非省略**

_(本 phase 零 user-facing surface：無 UI、無端點、無 CLI。
「人能不能真的用」今天**問不出來**，也**不得暗示答案**。
Drive-through 的位置由中性化 + AC-2 逐欄位對照替代。)_

### 3.1 中性化實測

- [x] **≥ 3 次中性化，逐次全量捕獲輸出** —— 實際 **5 次 + N4a 複驗 = 6 次**
  - DoD: 拿掉約束 → 指名的測試轉紅 → 還原；⭐ **每一條紅都要能由該改動解釋**，
    否則懷疑量法（W16：N1 多出的 12 紅是**汙染**、N3b 多出的 2 紅是**訊號**，
    「比預期更紅」本身不帶資訊）
  - Verify: 還原後 `git diff --stat` 對 migration 與 seed **為空**；int 回到全綠
- [x] **預測 vs 實測對照表**寫入 progress.md（3 中 / 2 條數低估，兩次同一盲點）
  - DoD: 預測不正確的**逐個寫清楚錯在哪**，不修飾

### 3.2 AC-2 逐欄位對照

- [x] **兩條獨立路徑交叉檢查** —— 11 / 17 = **28 欄**，逐表相符
  - DoD: `information_schema` 導出的欄位數 vs migration `CREATE TABLE` 區塊的欄位數，**逐表相符**
  - Verify: 兩個數字分別記錄，不是同一個來源算兩次
- [x] **每一個「不建」的規格欄位有缺席證明** —— **10 條**，先跑陽性對照（3 列）
  - DoD: ⭐ **先跑陽性對照證明查詢儀器有效**才採信它的零
    （`legal_holds.status` · `retention_policy` 的任何未建欄位）
- [x] **每個裁決指向一個可重跑的證據** —— **15 個裁決**，零條無證據
  - DoD: 零條「已裁決但無證據」

### 3.3 識別字長度 + oracle 判準複驗

- [x] **AC-7**：所有新增識別字 ≤ **63**，逐一量過（最長 40）
- [x] **`AD-UniqueKeyOracle-1`**：對已建成的鍵重跑判準 —— `retention_policies(record_class)` 由 **N5 實測**證明「安全性來自 GRANT 不來自鍵」：加上 `GRANT INSERT` 後測試 3 立刻紅（插入成功）

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-035-w17-retention-and-legal-hold.md`**
  - DoD: Problem / Root Cause / Solution / Verification / Impact；
    含 **§Drive-through 抓到而 gate 沒抓到的**（本片為 N/A，**且明記為非省略**）；
    ⛔ 若 `migrate diff` 抓到 gate 抓不到的事，記在該節作為同形狀替代品（W16 先例）
- [x] 無 design note（feature continuation）· 無 ADR（無架構級決定）—— **在 retro 明說理由**（Q7 末段）

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration
  - DoD: `pattern-reuse-feature` **0.50**，**第 10 個資料點**；
    量法 = 逐段相加、排除 > 60 min 間隙、Day 0 計入；
    ⭐ T0 已蓋（`2026-08-16T13:24:10Z`）⇒ 分子是**量測**不是回推，
    但**起草段仍是估算**，如實標註
- [x] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）；
      完整敘述 → `CALIBRATION-LOG.md` §1
- [x] Final gate sweep（**十一項**各自取 exit code，且在最後一次改動之後重跑）—— 全綠
- [x] 導航檔 Minimal Touch: `CLAUDE.md` Current-Phase（**1 行**）+ Last-Updated ·
      `MEMORY.md` pointer（~250-300 字元）+ `memory/project_w17_*.md` subfile ·
      `BACKLOG.md` §Shipped 加 1 行 + §Open 加**新 AD**（計數由 detector 導出，**不手數**）·
      `ROADMAP.md` 第 4 項推進 · `RISK_REGISTER.md` R3 / R4
  - DoD: ⚠️ `CLAUDE.md` 位元組預算現為 **29,976 / 30,000（餘裕 24）**——
    ⛔ **用 bytes 量不用 chars**（W16 教訓），且權威是 lint 不是我的計算
- [x] **五個**新 AD 登記（plan 估三個）：`AD-LegalHoldScopeRefUnguarded-1` · `AD-RetentionDurationUnstructured-1` ·
      （第三個待 Day 0–3 產出）
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → **違規 1**（AP-3 如實記：兩張表今天零消費者）
  - DoD: ⛔ **AP-3 要如實記** —— 兩張表今天零消費者
- [x] `plan.md` frontmatter `status:` → `closed` **+ 內文 `**Status**` 一起翻**（R9）
  - Verify: `python scripts/lint/check_status_markers.py`
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view <N> --json state,mergedAt` **驗證**後翻狀態標籤
