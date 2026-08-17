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

- [ ] **`enum EventSeverity { S1 S2 S3 }`**
  - DoD: 值域逐字照 `11:35-39`；docstring 記明**這是 Wave 1 的表引用 Wave 2 文件的值域**，
    且 `02a` §2 的 enum 註冊表缺這一列（⇒ 新 AD）
  - Verify: `Grep "EventSeverity" apps/api/prisma/schema.prisma`
- [ ] **`enum PostureMetricKey`** —— 九個值逐字照 `02a:482-483`
  - DoD: 建 enum 而非 TEXT 的理由（`02a:477` "not free-form" + `:485` "review step"）寫進 docstring
  - DoD: ⛔ 九個值逐一比對，**不准少一個也不准自己補一個**
- [ ] **`enum PostureRag`** —— 值域 `08:33-45`，大小寫依 D-ragcase 定案
- [ ] **`model Event`** → `@@map("events")`
  - DoD: 欄位嚴格照 `02a:233` 六欄 + `org_entity_id` + base fields（D-basefields 定案）
  - DoD: `loss_amount` nullable；docstring 記明它今天永遠為 NULL（**AP-3 形狀，如實記**）+ 解封點 M6
  - DoD: `detected_at` 用 `02a:233` 的名字；`11:75` 的 `discovered_at` 別名與
    "the template does" 那句話寫進 docstring；**標為可推翻**
  - DoD: `status` **不建** —— 理由（不在欄位清單 + 4 份互斥 lifecycle）寫進 docstring
- [ ] **`model PostureSnapshot`** → `@@map("posture_snapshots")`
  - DoD: 7 欄照 `02a:465-473`；`period` TEXT（兩種格式）· `metric_value` Decimal
  - DoD: `@@unique([orgEntityId, period, metricKey])` —— D-uniquekey 的結論寫進 docstring
  - DoD: residency 五欄 **不建**，`02a:488` banner 原文與「ADR-0010 ⇒ 零 consumer」寫進 docstring
- [ ] `npx prisma format` + `npx prisma validate` 通過
  - Verify: `npm run prisma:format -w apps/api`（或 `npx prisma format --schema=...`）

### 1.2 Migration

- [ ] **`migrations/<ts>_event_and_posture_snapshot/migration.sql`**
  - DoD: 3 enum + 2 表 + 2 index/unique + RLS `ENABLE` **且** `FORCE`（逐表）
  - DoD: 各表 2 條 policy（SELECT / INSERT）· `GRANT SELECT, INSERT` —— **無 UPDATE、無 DELETE**
  - DoD: banner 寫明**三個「不建」**（residency 五欄 / `Event.status` / restricted block）
    各自的理由與解封點，形狀比照 `20260816135016_retention_and_legal_hold/migration.sql:200-212`
  - DoD: banner 寫明 `severity` 的值域來源是 `11:35-39`（Wave 2 文件）與依賴方向
  - Verify: `npm run prisma:migrate -w apps/api` 套用成功
- [ ] **`prisma generate` 已跑**（`AD-PrismaEnumThreeTruths-1`：三份真相，部署路徑不會自動重建）
  - Verify: `Grep "EventSeverity" apps/api/node_modules/.prisma/client/index.d.ts`

### 1.3 `check_entity_index.py` +1 ALIAS

- [ ] **依 D-alias 的結論加 ALIAS**
  - DoD: 若 D-alias 證明不需要 ALIAS，**這一項標 🚧 並寫明原因**，不是靜默跳過
  - Verify: `python scripts/lint/check_entity_index.py` → **34 / 36**

### 1.x partial gate

- [ ] `npm run lint -w apps/api` · `npm run type-check -w apps/api` · `npm run build -w apps/api`

---

## Day 2 — seed + 整合測試 (US-3)

### 2.1 Seed

- [ ] **`test/int-global-setup.js` 兩張表 seed + 計數守衛**
  - DoD: 跨實體資料（≥ 2 個 entity）才能讓 AC-4 的兩個方向都可測
  - DoD: ⛔ **不得產生真實個資或有效卡號**（guardrail 7）
  - Verify: `npm run test:int -w apps/api` 起得來

### 2.2 整合測試

- [ ] **`core-model/event-and-posture.int.spec.ts`**
  - DoD: **AC-2** — `relrowsecurity` / `relforcerowsecurity` 逐表斷言（不是查一次算兩表）
  - DoD: **AC-3** — `information_schema.role_table_grants` 逐表斷言 grant 集合
    **恰為** `{SELECT, INSERT}`；UPDATE / DELETE 缺席
  - DoD: **AC-4 兩個方向** — 跨實體 INSERT 被拒（SQLSTATE `42501`）**且**範疇內 INSERT 成功。
    ⚠️ W17 的 N4 證明：少了後者，policy 整個消失測試仍全綠
  - DoD: **AC-5** — `information_schema.columns` 與 migration `CREATE TABLE` 區塊兩條獨立路徑逐欄相符；
    ⛔ **先跑陽性對照證明查詢儀器有效**，才採信「residency 五欄缺席」的零
  - Verify: `npm run test:int -w apps/api` → 248 + N passing

### 2.x Full gate

- [ ] `format:check` · `lint` · `type-check` · `build` · `lint:negative`（⚠️ **root script**）·
      api unit · api int · web · coverage 逐位 · `run_all` **9/9** · `check_entity_index` **34/36**

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

- [ ] **N1 刪 `events` 的 INSERT policy** — 預期 AC-4 轉紅
- [ ] **N2 刪 `posture_snapshots` 的 `FORCE`** — 預期 AC-2 轉紅
- [ ] **N3 加回 `GRANT UPDATE`** — 預期 AC-3 轉紅
- [ ] **N4 刪 unique 約束** — 預期對應斷言轉紅
  - DoD: 每次**只改一處**，跑完整 int suite，記錄實際轉紅集合
  - DoD: ⛔ **零轉紅 = 揭露真缺口**，必須補測試（W17 的 N4 先例），不是「符合預期」
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
