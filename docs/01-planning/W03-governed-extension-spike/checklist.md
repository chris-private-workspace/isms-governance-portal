# Phase W03 — Checklist (Governed extension storage, proven against RLS)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `5bbc252`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 16 個目標存在如預期（NEW 檔不存在；EDIT 檔存在）；
      `CH-018` 編號未被佔用（**grep 全 repo 的 `CH-\d+` 引用，不是 `ls` 目錄** —— `AD-ChNumber-1`）
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-proc-freshness** — port 3200/3210 的進程年齡 vs `dist` 的 mtime（Risk Class C）
  - [x] **D-env-role** — `.env` 的 `DATABASE_URL` 指向受限角色；實測 `super=f bypassrls=f`
  - [x] **D-schema-claims** — `schema.prisma:95-104` 的 8 個缺欄清單與 plan §0 一致；
        `Policy` 全欄位確為 scalar
  - [x] **D-adr5-tendency** — `06:18` 與 `06:35` 對 JSONB / field catalog 的敘述逐字確認
  - [x] **D-scopedclient-split** — `AD-ScopedClientDI-1` 記的三段拆法與
        `scope-boundaries.md:124` 的現況一致（後者已知**做不到**，確認未被改回）
- [x] **Prong 2.5 — child component tree** — **N/A**（無前端變更）
- [x] **Prong 3 — schema verify**：現有兩個 migration 已套用；`policies` / `org_entities`
      的 RLS policy 與 `app_entity_scope()` 存在；**JSONB 欄位與 `WITH CHECK` 的交互先做最小實測**
      （D-jsonb-rls —— 這條若翻盤會移動 §3.1）
- [x] **D-baselines** — unit 33 · int 20 · web 10 · lint 0 · type 0 · build clean ·
      coverage 95.95/82.35/88/96.29 · `run_all` 6/6
- [x] **Catalog drift** — progress.md Day-0 表格（D-ID + finding + implication，交叉引用 plan §8）
- [x] **Go/no-go** — 範圍變動 ≤20% 續行 / 20-50% 修訂 §5+§7 並再確認 / >50% 中止重寫

### 0.2 Branch

- [x] `git checkout -b feature/W03-governed-extension`（從 `main` `5bbc252`）

---

## Day 1 — Governed extension storage 拍板 (US-1)

### 1.1 三方案最小實測

- [x] **JSONB + 中央 catalog 的最小可跑案例**
  - DoD: `Policy.extensions` 寫入 / 讀出 / 查詢各一次，**且在 RLS 之下**
  - Verify: 探測腳本先斷言角色前提，再跑；輸出寫入 progress.md
- [x] **量到 `WITH CHECK` 對 JSONB 內容的涵蓋範圍**（D-jsonb-rls）
  - DoD: 明確回答「RLS 管不管得到 JSONB 內部的 `org_entity_id`」——
        管不到則 catalog 驗證**必須**在寫入路徑，這句話進 ADR
  - Verify: 直接 `pg` 連線實測，不經應用層
- [x] **catalog 的範疇歸屬兩種都建一次**（D-catalog-scope）
  - DoD: entity-scoped 與全域各一個最小案例，各自的代價寫成一句話
  - Verify: 兩個案例的實際 SQL + 結果進 progress.md
- [x] ⚠️ **對有狀態行為必含「第二次呼叫」案例**（`AD-Day0Scope-1` —— W02 的承重結論就是這樣被推翻的）

### 1.2 ADR-0005

- [x] **`docs/14-adr/0005-governed-extension-storage.md` 採納**
  - DoD: Options 表（A/B/C）· Decision · Consequences · **≥3 條可證偽條件，每條指得出量測方式** ·
        §Security & compliance impact（本專案強制的第五區塊，`06:70`）
  - Verify: `python scripts/lint/run_all.py`（doc-links + path-references）
- [x] **`decision-form.md` OQ-6 移入已拍板**，去向指向 ADR-0005
  - DoD: §開放中不再有 OQ-6；§已拍板新增一列含拍板日
  - Verify: `grep -n "OQ-6" docs/decision-form.md`

### 1.x Partial gate

- [x] `npm run lint -w apps/api` · `npm run type-check -w apps/api` · `run_all` 6/6

---

## Day 2 — Scoped client DI + repository (US-2)

### 2.0 Schema + migration（**checklist 起草時遺漏，Day 2 補入**）

> plan §4 第 1-2 項有 `schema.prisma` EDIT 與 migration NEW，但 checklist 起草時
> **沒有對應任務**。repository 沒有 `extensions` 欄位就無事可做，故補在 2.1 之前。

- [x] **`schema.prisma`：`Policy.extensions` + `model ExtensionField`**
  - DoD: catalog 的 `orgEntityId` **nullable**（NULL = 全域，Day 1 實測的形狀）
  - Verify: `npx prisma validate`
- [x] **migration：JSONB 欄位 + catalog 表 + RLS + trigger 同一個 migration**
  - DoD: ADR-0004 的規則 —— **沒有任何窗口讓列不受治理**
  - Verify: `npm run prisma:migrate -w apps/api` 後查 `pg_policies` 與 `pg_trigger`

### 2.1 DI token 三段拆法

- [ ] 🚧 **阻塞（刻意不做）：`contracts/scoped-prisma.token.ts`** ——
      Day 2 量到今天建它就是 **零消費者的 DI token = AP-5 + AP-3**，
      而 `AD-ScopedClientDI-1` 自己就寫著「⛔ 現在建 = 零消費者的 DI token」。
      **解封條件：M4 有真的憑證來源之後**，request-scoped provider 才有東西可注入。
      Day 2 實際交付的是下一項（結構型別 + 參數傳遞），它在 boundaries 下**可行且已驗證**
- [x] **`core-model` 宣告它需要的結構型別，實例由 `modules` 層傳入**
  - DoD: `core-model` 全程**不 import `entity-scope`**；型別用 generated Prisma
        （matrix 已將 `apps/api/src/generated/**` 歸為 `core-model`，所以合法）
  - Verify: `npm run lint -w apps/api`（`eslint-plugin-boundaries` 對跨範疇 import 開火）

### 2.2 PolicyRepository

- [x] **`core-model/policy.repository.ts` 經 DI 取得範疇化 client**
  - DoD: **不持有裸 client**；所有 operation 經 `runScoped`
  - Verify: `node scripts/assert-no-scope-bypass.mjs`（三條規則 + self-test 皆綠）
- [x] **`core-model/extension-validator.ts` —— catalog 驅動的寫入驗證**
  - DoD: 不在 catalog 的 key、型別不符的值、缺 required 欄位 → 三種皆拒
  - Verify: `npm run test -w apps/api`
- [x] **單元測試含負面案例**
  - DoD: `policy.repository.spec.ts` 斷言空 scope 時 operation **從未被呼叫**；
        `extension-validator.spec.ts` 三種拒絕各一
  - Verify: `npm run test:cov -w apps/api`（覆蓋率門檻）

### 2.x Full gate

- [x] lint 0 · type-check 0 · format 0 · unit test ≥ 33 · build clean · `run_all` 6/6 ·
      `lint:negative` PASS

---

## Day 3 — 整合驗證 (US-3, US-4) — 真 DB + 真 RLS，**無 UI → gate-only verified**

_(本 phase 無 user-facing surface，故 drive-through **N/A**。收尾一律寫 `gate-only verified`，
**絕不暗示可用性**。)_

### 3.1 Clean restart

- [x] **殺掉陳舊 dev server / 孤兒 worker，確認新程序是 3210 的唯一擁有者**（使用者於 08-10 許可）
  - DoD: 列程序看 PID/PPID/StartTime，任何父程序已死或 StartTime 早於本次重啟者強制殺掉
  - Verify: 擷取證明 `PolicyModule` 已載入的 startup log 行（見 `local-runtime-ops.md`）
  - ✅ 舊進程比 `dist` 舊 19h；殺鏈 4 層；port 無 listener；web 3200 與其他專案進程未動；
        startup log 三行證據（`PolicyModule` · 三條路由 · `DEV PRINCIPAL ACTIVE` 警告）

### 3.1b Runtime 觀測（3.1 解封後執行）

- [x] **dev DB 補上 W03 的前提**
  - DoD: `20260810134319_governed_extensions` 套用到 `isms_dev` + seed 4 筆 catalog
  - Verify: `prisma migrate deploy` exit 0；`SELECT` 列出 4 筆（2 全域 / SG1 / HK1）
- [x] **11 個案例的 API 級驗證**（真進程 + 真 PostgreSQL + 真 RLS）
  - DoD: 三個端點各走一次主路徑 + 每個拒絕分支各一次；全案 `Cache-Control: no-store, private`
  - Verify: 輸出寫檔後 Read，逐案記入 progress.md（**不看 shell 即時 stdout**）

### 3.2 第一個業務端點

- [x] **`GET /policies` · `POST /policies`**
  - DoD: 範疇**只能**來自 session/憑證（約束 8 鐵律 3）；查無資料回 **404** 不回 403
  - Verify: `npm run test:int -w apps/api`
- [x] **Cache-Control 政策**（關 `AD-CacheControl-1`）
  - DoD: 業務 API 回應 `no-store, private`；⚠️ **「什麼算 sensitive」的判準已寫成文字**，
        不是只加一個 header
  - Verify: `security.spec.ts` 逐條斷言（模仿 `16:21` 四標頭的既有寫法）

### 3.3 約束 8 四個範疇測試

- [x] **跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 / 滾升角色只見授權子樹**
  - DoD: 四項各一個測試；RLS 那項**完全不經應用層**（模仿 `rls-direct.int.spec.ts`）
  - Verify: `npm run test:int -w apps/api`

### 3.4 並行範疇汙染常駐測試（關 `AD-ScopeConcurrency-1`）

- [x] **兩個不同範疇的 client 交錯查詢 N 次，各自只見己列**
  - DoD: 常駐整合測試（非 scratchpad）；**先斷言角色前提**再跑
  - Verify: `npm run test:int -w apps/api`

### 3.5 元驗證（spike 強制 —— 每個宣稱會擋東西的機制都弄壞一次）

- [x] **catalog 驗證中性化 → 非法擴充欄位應被放行 → 測試紅** → 還原 → 綠
- [x] **RLS policy → `USING (true)` → 範疇測試紅** → 還原 → 綠
  - DoD: 兩次「弄壞 → 紅 → 還原 → 綠」的實際輸出（含紅了幾個）記入 progress.md
  - Verify: 每次都跑 `npm run test:int -w apps/api` 並記退出碼

### 3.6 修正 3.1b 找到的缺陷（**checklist 起草時不存在 —— drive-through 產生的**）

- [x] **跨實體寫入被拒時回 404，不再冒 500**
  - DoD: **先量再修** —— 證明「不存在的實體 id」與「跨實體的實體 id」在資料庫層
        已是同一個錯誤（否則 42501→404 會親手造出 oracle）；修正後三個案例逐字節同形
  - Verify: 實測 `42501 × 4 / 23503 × 0`；log 中未處理的 42501 堆疊 4 → 0
- [x] **把 RLS-before-FK 的排序釘成常駐測試**
  - DoD: `policy.int.spec.ts` 案例 **2b** —— 不存在的 id 與跨實體的 id 得到同一個錯誤類別；
        Postgres 升版翻轉順序時**必須紅**，不能悄悄恢復可區分性
  - Verify: `npm run test:int -w apps/api`（int 31 → 32）

---

## Day 4 — closeout (US-5)

### 4.1 Change record + design note

- [ ] **`docs/03-implementation/changes/CH-018-w03-governed-extensions.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含關掉的 AD；
      Verdict 明確標 **gate-only verified**）
- [ ] **`docs/02-architecture/design-notes/W03-governed-extensions.md`** ——
      spike phase **MANDATORY**，通過 8-point gate（`docs/rules-on-demand/spike-design-note-gate.md`），
      每個宣稱含 `file:line`

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`spike` 0.65，**第 2 個資料點**；
      ratio 出 band 就標記 re-point）
- [ ] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 →
      `calibration-log.md`）。⚠️ **本 phase 逐日計時**，補上 W02 缺的乾淨資料點（`AD-TimeTracking-2`）
- [ ] Final gate sweep: lint 0 · type-check 0 · format 0 · unit ≥ 33 · int ≥ 20 · web 10 ·
      build clean · `run_all` 6/6 · `lint:negative` PASS
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md` CLOSE 三條 AD · **`ROADMAP.md` 同步標 ✅**（兩份都存在，只改一處就是下次審計的漂移）
- [ ] **改寫 `docs/rules-on-demand/scope-boundaries.md:120-128`**（Day-0 `D-scopedclient-split` 觸發）
      —— 該節自稱「尚未被驗證的設計意圖……驗證失敗則本節與上表都要重寫」，
      而 W02 已量到「型別住契約層」做不到、W03 Day 2 實裝三段拆法。**用量到的形狀取代設計意圖**
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **`plan.md` frontmatter `status:` 翻為 `closed`**（PROCESS R9 —— 只 commit code 不算收尾）
- [x] **Commit** → PR push + open → CI → merge（使用者於 2026-08-10 授權 push + open PR）
  - ✅ **PR #31 MERGED** `b20f3f1`（`2026-08-10T08:43:51Z`）—— 經 `gh pr view` 驗證，
        非採信回報（`feedback_verify_pr_merged_via_tool_not_claim`）
  - ✅ 六個 required check 全 SUCCESS。⚠️ **第一輪紅了兩個**（int 順序相依 + production
        拒絕啟動）—— 見 progress.md「Day 4（續）」；兩者都是本機 gate 射程外的東西
  - ✅ 新增的負面 step **實際開火過**（log 逐字：`✅ production 啟動被拒絕（exit 1），
        理由是 DevPrincipalInProductionError`）—— 不是「job 綠所以應該有跑」
