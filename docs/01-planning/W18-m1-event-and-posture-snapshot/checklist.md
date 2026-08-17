# Phase W18 — Checklist (Event skeleton + posture snapshot)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `fd6472a`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 7 個編輯目標存在如預期
      （2 個 NEW 不存在 · 3 個 EDIT 存在 · 3 個 UNTOUCHED 存在）；
      `CH-037` 編號未被佔用 —— ✅ 最大號 `CH-036`
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -3`
- [x] **Prong 2 — content verify**（每條結論寫進 progress.md Day 0）：
  - [x] **D-basefields** — `02a` §1.1 的 base fields 哪幾個適用；
        `legal_holds` / `attestations` 的 migration 實際帶了哪幾個（讀 SQL，不是讀 schema 註解）
        —— ✅ D2：兩者是**同一個 9 欄信封**，共同省略 `status`/`owner_user_id`/`is_active`
  - [x] **D-refcode** — `events` 要不要 `ref_code`；`RefCodeCounter` 是 per-entity 發號，
        `posture_snapshots` 由排程 job 批次寫入 ⇒ 發號是否適用
        —— ⭐ D3：規則是「有 `org_entity_id NOT NULL` ⇒ 帶 `ref_code`」+ **3 個例外**，
        而 `AuditLog:2063-2072` 的三個理由**逐條命中快照** ⇒ `events` 帶 · `posture_snapshots` **不帶**
  - [x] **D-alias** — `check_entity_index.py` 的 ALIAS 機制：`PostureSnapshot` / `posture_snapshots` /
        `posture_snapshot` 三個名字要對到哪一個（W17 `RetentionPolicy` 先例逐行讀）
        —— ✅ D4：`:187` 三元組交集、無 snake_case 轉換 ⇒ `PostureSnapshot` **需要**、`Event` **不需要**
  - [x] **D-ragcase** — `08:33-45` 的 RAG 字面大小寫（`Green` vs `green`），enum 值逐字對齊
        —— ✅ D6：規格**自相分歧**（表頭大寫 / 散文小寫）⇒ 改由 33/33 全小寫的專案慣例定案
  - [x] **D-uniquekey** — `AD-UniqueKeyOracle-1` 判準對 `(org_entity_id, period, metric_key)` 跑一次
        —— ✅ D8：兩欄皆 caller-supplied ⇒ 判準觸發 ⇒ 鍵設計正確；**N4 改設計**
  - [x] **D-auditmodels** — **讀** `audit-coverage.int.spec.ts` 確認守衛對「零 repository 的表」的行為
        （W17 先例：不是假設它會放行）
        —— ✅ D5：`:516-531` 從 `client.X.<write>(` 呼叫點導出 ⇒ 結構性忽略，既有先例 10 個
- [x] **Prong 2.5 — child component tree** — ⚪ **N/A**（零前端）
- [x] **Prong 3 — schema verify**：`Event` / `PostureSnapshot` / `posture_snapshot` /
      `event_id` / `eventId` 在 `schema.prisma` 與 migrations 全樹零命中（確認真的沒建過）—— ✅ 零命中
  - Verify: `Grep "model Event|PostureSnapshot|posture_snapshot" apps/api`
- [x] **D-baselines** — 逐位重驗：api unit **480/40** ✅ · api int **248/20** ✅ ·
      coverage branches **91.77** / funcs **98.98** / lines **93.57** ✅（clover 逐位）·
      `run_all` **9/9** ✅ · `check_entity_index` **32/36** ✅
      —— 🟡 **stmts 92.14 未證實**（`tail -30` 截掉 `All files` 行）· web baseline 未跑，Day 2 full gate 補
- [x] **Catalog drift** — progress.md Day-0 表格（`D{N}` ID + Finding + Implication）—— **11 條 + baselines**
- [x] **Go/no-go** — 範圍變動 ≤ 20% 繼續 / 20-50% 修訂 plan 並再確認 / > 50% 中止
      —— ✅ **GO**，範圍變動 ≈ 0%（無一條改變交付物清單）

### 0.2 Branch

- [x] `git checkout -b feature/W18-event-and-posture-snapshot`（從 `main` `fd6472a`）

---

## Day 1 — schema + migration (US-1, US-2)

### 1.1 `schema.prisma` — 2 model + 3 enum

- [x] **`enum EventSeverity`** —— ⚠️ **值為 `s1 s2 s3` 小寫**（Day-0 D7，可推翻）
  - DoD: 值域逐字照 `11:35-39`；docstring 記明**這是 Wave 1 的表引用 Wave 2 文件的值域**，
    且 `02a` §2 的 enum 註冊表缺這一列（⇒ 新 AD）
  - Verify: `Grep "EventSeverity" apps/api/prisma/schema.prisma`
- [x] **`enum PostureMetricKey`** —— 九個值逐字照 `02a:482-483`
  - DoD: 建 enum 而非 TEXT 的理由（`02a:477` "not free-form" + `:485` "review step"）寫進 docstring
  - DoD: ⛔ 九個值逐一比對，**不准少一個也不准自己補一個** —— int 測試 15 用**外部抄寫的清單**斷言
- [x] **`enum PostureRag`** —— 值域 `08:33-45`，大小寫依 D-ragcase 定案 → `green amber red`
- [x] **`model Event`** → `@@map("events")`
  - DoD: 欄位嚴格照 `02a:233` 六欄 + `org_entity_id` + base fields（D-basefields 定案）
  - DoD: `loss_amount` nullable；docstring 記明它今天永遠為 NULL（**AP-3 形狀，如實記**）+ 解封點 M6
        —— ⭐ **並記下第二個獨立理由**：`02a:233` **無幣別欄位**，13 OpCo × 11 管轄區不共用幣別
        ⇒ 就算有人寫了也無法解讀（新 AD `AD-LossAmountNoCurrency-1`）
  - DoD: `detected_at` 用 `02a:233` 的名字；`11:75` 的 `discovered_at` 別名與
    "the template does" 那句話寫進 docstring；**標為可推翻**
  - DoD: `status` **不建** —— ⚠️ **理由已依 Day-0 D1 修正**：不是「不在欄位清單」（那對任何
    base field 都成立），而是**兩份權威給出不相容的 lifecycle 且從未裁決**（JUDGEMENT 等級）
- [x] **`model PostureSnapshot`** → `@@map("posture_snapshots")`
  - DoD: 7 欄照 `02a:465-473`；`period` TEXT（兩種格式）· `metric_value` Decimal(18,4)
  - DoD: `@@unique([orgEntityId, period, metricKey])` —— D-uniquekey 的結論寫進 docstring
  - DoD: residency 五欄 **不建**，`02a:488` banner 原文與「ADR-0010 ⇒ 零 consumer」寫進 docstring
  - DoD: ⭐ **base-field 信封依 Day-0 D3 改用 `AuditLog` 而非 `Attestation`** ——
    `extensions` 的省略**明確標為 JUDGEMENT 而非 MECHANICAL**（本表有 `org_entity_id`，
    借用 `retention_policies` 的理由會是 `AD-BorrowedRefusal-1`）
- [x] `npx prisma validate` 通過 · `npx prisma format` 已跑
  - Verify: `npx prisma validate --schema=apps/api/prisma/schema.prisma` → `valid 🚀`
  - ⚠️ **D12（新）**：`prisma format` 順帶重排了 **11 行既有內容**（`StatementOfApplicability` ·
    `Attestation` · `ISMSProfile` 的欄位對齊）—— 那是 formatter 的**確定性輸出**，不是本片的編輯。
    **保留**（還原只會讓下個 phase 再撞一次），記進 BACKLOG：schema 無 format gate

### 1.2 Migration

- [x] **`migrations/20260817033944_event_and_posture_snapshot/migration.sql`**
  - DoD: 3 enum + 2 表 + 3 index/unique + RLS `ENABLE` **且** `FORCE`（逐表）
  - DoD: 各表 2 條 policy（SELECT / INSERT）· `GRANT SELECT, INSERT` —— **無 UPDATE、無 DELETE**
  - DoD: banner 寫明**三個「不建」**（residency 五欄 / `Event.status` / restricted block）
    各自的理由與解封點，形狀比照 `20260816135016_retention_and_legal_hold/migration.sql:200-212`
  - DoD: banner 寫明 `severity` 的值域來源是 `11:35-39`（Wave 2 文件）與依賴方向
  - DoD: ⭐ banner 明確區分**兩表 append-only 的理由不同** —— 快照是 `02a:475` **明文且無解封**、
    事件是**能力尚不可表達且 M6 解封**。同一個缺席的 GRANT，兩個不能互換的宣稱
  - DoD: 目錄名用 **UTC** 時戳（`AD-MigrationTimestampTz-1`）—— 實測 `20260817033944` UTC
    vs `20260817113944` local，**差 8 小時**
  - Verify: ⚠️ **不照抄 plan 的 `npm run prisma:migrate`**（= `migrate dev`，被
    `AD-DevDbChecksumDrift-1` 擋）。改由 int suite 的 global setup 套用（它跑 `migrate deploy`）
    → ✅ `[int] isms_test rebuilt, migrated and seeded`，**248 passed**（舊 seed 那一輪）
- [x] **`prisma generate` 已跑**（`AD-PrismaEnumThreeTruths-1`：三份真相，部署路徑不會自動重建）
  - Verify: ⚠️ **路徑不是 `node_modules/.prisma`** —— 本專案輸出到
    `apps/api/src/generated/prisma`。實際輸出：`✔ Generated Prisma Client (v7.9.1) in 2.45s`

### 1.3 `check_entity_index.py` +1 ALIAS

- [x] **依 D-alias 的結論加 ALIAS** —— `"PostureSnapshot": "posture_snapshot"`；`Event` 不需要
  - DoD: 若 D-alias 證明不需要 ALIAS，**這一項標 🚧 並寫明原因**，不是靜默跳過
  - Verify: `python scripts/lint/check_entity_index.py` → ✅ **34 / 36**（models 33 → 35）

### 1.x partial gate

- [x] `npm run lint -w apps/api` ✅ EXIT=0 · `npm run type-check -w apps/api` ✅ EXIT=0 ·
      `npm run build -w apps/api` ✅ EXIT=0 · `format:check` ✅ *All matched files use Prettier code style*

---

## Day 2 — seed + 整合測試 (US-3)

### 2.1 Seed

- [x] **`test/int-global-setup.js` 兩張表 seed + 計數守衛** —— 3 events + **5** posture snapshots
  - DoD: 跨實體資料（≥ 2 個 entity）才能讓 AC-4 的兩個方向都可測 —— ✅ SG1 + HK1 皆有
  - DoD: ⛔ **不得產生真實個資或有效卡號**（guardrail 7）—— ✅ 全部標 `Fixture`，無姓名／無卡號
  - DoD: ⭐ **rows 1 & 4 共用 `(period, metric_key)` 而分屬不同實體** —— 這個 fixture 本身
    就是唯一鍵形狀的常駐斷言，且 N4 的預期紅（setup 崩潰）已預先寫在註解裡
  - Verify: `npm run test:int -w apps/api` 起得來 —— ✅

### 2.2 整合測試

- [x] **`core-model/event-and-posture.int.spec.ts`** —— **17 個測試**
  - DoD: **AC-2** — `relrowsecurity` / `relforcerowsecurity` 逐表斷言（不是查一次算兩表）
    —— ✅ 測試 1 / 8，兩個獨立查詢
  - DoD: **AC-3** — `information_schema.role_table_grants` 逐表斷言 grant 集合
    **恰為** `{SELECT, INSERT}`；UPDATE / DELETE 缺席 —— ✅ 測試 17，`toEqual` 非 `toContain`
  - DoD: **AC-4 兩個方向** — 跨實體 INSERT 被拒（SQLSTATE `42501`）**且**範疇內 INSERT 成功。
    ⚠️ W17 的 N4 證明：少了後者，policy 整個消失測試仍全綠
    —— ✅ events 測試 5 / 6 · posture 測試 11 / 12（**四個測試，兩表各兩個方向**）
  - DoD: **AC-5** — `information_schema.columns` 與 migration `CREATE TABLE` 區塊兩條獨立路徑逐欄相符；
    ⛔ **先跑陽性對照證明查詢儀器有效**，才採信「residency 五欄缺席」的零
    —— ✅ 測試 16：先 `toEqual` 七欄（陽性對照），**再**斷言五欄缺席
  - DoD: ⭐ 額外 —— 測試 15 用**外部抄寫的九個 metric key** 斷言 enum（不從 `pg_enum` 讀回自比）；
    測試 10 用 owner 連線證明「兩個實體可共存同一 `(period, metric_key)`」——
    app-role 讀會被 RLS 過濾成一列，那是**不可能失敗**的形狀
  - Verify: `npm run test:int -w apps/api` → ✅ **265 passed / 21 suites**（248 + 17）

### 2.x Full gate

- [x] `format:check` ✅ · `lint` ✅ · `type-check` ✅ · `build` ✅ ·
      `lint:negative`（⚠️ **root script**）✅ `0 bypasses` ·
      api unit ✅ **480/40** · api int ✅ **265/21** · web ✅ **10/1** ·
      coverage **92.14 / 91.77 / 98.98 / 93.56** ✅ 逐位 · `run_all` ✅ **9/9** ·
      `check_entity_index` ✅ **34/36**

---

## Day 3 — 中性化實測 (US-3) — ⚪ drive-through N/A（gate-only verified）

_零端點、零 UI、零 CLI 使用者路徑 ⇒ 無主流量可駕駛。_
_⛔ **明記為非省略**：本 phase 交付物不得在任何文件暗示可用性。_
_中性化實測是這一層的等價物 —— 它回答「拿掉這條約束會不會有人發現」。_

### 3.1 預測先行

- [ ] **把 ≥ 4 條中性化的預測寫進 progress.md 並先 commit**
  - DoD: ⛔ **預測的 commit 必須早於執行** —— 事後寫的預測不是預測
  - DoD: 每條註明：改什麼 · 預測哪幾個測試轉紅 · 紅的形狀（SQLSTATE / 斷言訊息）

### 3.2 逐次執行

- [ ] **N1 刪 `events_insert` policy** — 預期**恰 1 紅**（測試 6），而測試 5 **仍綠**
- [ ] **N2 刪 `posture_snapshots` 的 `FORCE`** — 預期**恰 1 紅**（測試 8）
- [ ] **N3 加回 `GRANT UPDATE` on `events`** — 預期**恰 2 紅**（測試 7、17）
- [ ] **N4 把 `org_entity_id` 從 posture 唯一鍵拿掉**（⚠️ **依 Day-0 D8 改設計**，
      不是「刪 unique 約束」）— 預期 **setup 崩潰**（seed 的 rows 1 & 4 衝突，23505），
      **不是**單一測試轉紅
- [ ] **N5 刪 `events_read` policy** — 預期**恰 2 紅**（測試 2、4）
  - DoD: 每次**只改一處**，跑完整 int suite，記錄實際轉紅集合
  - DoD: ⛔ **零轉紅 = 揭露真缺口**，必須補測試（W17 的 N4 先例），不是「符合預期」
  - DoD: ⛔ **紅得比預測多也要解釋** —— 多出來的紅若不能由該改動解釋，就是測試在互相依賴
  - Verify: 每次 `npm run test:int -w apps/api` 的實際輸出貼進 progress.md

### 3.3 復原驗證

- [ ] **全部中性化復原後 int suite 回到全綠**
  - DoD: `git diff` 對 migration / spec 為空
  - Verify: `git status --porcelain apps/api` + `npm run test:int -w apps/api`

---

## Day 4 — closeout (US-4)

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-037-w18-event-and-posture-snapshot.md`**（單檔 1-page）
  - DoD: Problem / Root Cause / Solution / Verification / Impact
  - DoD: §Verification 明寫 **gate-only verified（drive-through N/A，非省略）**
  - DoD: 記下**中性化抓到而一般 gate 沒抓到的**（若有）
  - DoD: ⚪ 非 spike（複用 W14/W17 pattern）⇒ **無 design note**，理由寫一行

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration
      （`pattern-reuse-feature` 0.50，**第 11 個資料點**；ratio 出 band 就標記 re-point）
- [ ] `calibration-matrix.md` 那一行 —— ⚠️ **該行帶預先判準**：
      「若第 11 點再落 0.7-0.85 則 re-point 0.45」⇒ 本次 ratio 直接觸發或否決調整。
      ≤ 1 行 ~250 字元；完整敘述 → `calibration-log.md`
- [ ] Final gate sweep: `format:check` · `lint` · `type-check` · `build` · `lint:negative` ·
      api unit · api int · web · coverage · `run_all` **9/9** · `check_entity_index` **34/36**
- [ ] `plan.md` frontmatter `status:` → `closed` + 內文 `**Status**` 一起翻（R9）
  - Verify: `python scripts/lint/check_status_markers.py`
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md` 新 AD（`Event.status` 未裁決 · `severity` 未登記進 `02a` §2 enum 註冊表 ·
      `loss_amount` 的 AP-3）· `ROADMAP.md`
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      —— ⚠️ `loss_amount` 的 AP-3 **如實記一次**，不藏在 N/A 底下
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view --json state,mergedAt` 驗證後翻狀態標籤
