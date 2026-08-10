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

### 2.1 DI token 三段拆法

- [ ] **`contracts/scoped-prisma.token.ts`**（token 在 `api`）
  - DoD: 型別住 `core-model`、實例由 `entity-scope` 提供 —— 三個範疇各司其職
  - Verify: `npm run lint -w apps/api`（`eslint-plugin-boundaries` 對跨範疇 import 開火）

### 2.2 PolicyRepository

- [ ] **`core-model/policy.repository.ts` 經 DI 取得範疇化 client**
  - DoD: **不持有裸 client**；所有 operation 經 `runScoped`
  - Verify: `node scripts/assert-no-scope-bypass.mjs`（三條規則 + self-test 皆綠）
- [ ] **`core-model/extension-validator.ts` —— catalog 驅動的寫入驗證**
  - DoD: 不在 catalog 的 key、型別不符的值、缺 required 欄位 → 三種皆拒
  - Verify: `npm run test -w apps/api`
- [ ] **單元測試含負面案例**
  - DoD: `policy.repository.spec.ts` 斷言空 scope 時 operation **從未被呼叫**；
        `extension-validator.spec.ts` 三種拒絕各一
  - Verify: `npm run test:cov -w apps/api`（覆蓋率門檻）

### 2.x Full gate

- [ ] lint 0 · type-check 0 · format 0 · unit test ≥ 33 · build clean · `run_all` 6/6 ·
      `lint:negative` PASS

---

## Day 3 — 整合驗證 (US-3, US-4) — 真 DB + 真 RLS，**無 UI → gate-only verified**

_(本 phase 無 user-facing surface，故 drive-through **N/A**。收尾一律寫 `gate-only verified`，
**絕不暗示可用性**。)_

### 3.1 Clean restart

- [ ] **殺掉陳舊 dev server / 孤兒 worker，確認新程序是 3210 的唯一擁有者**
  - DoD: 列程序看 PID/PPID/StartTime，任何父程序已死或 StartTime 早於本次重啟者強制殺掉
  - Verify: 擷取證明 `PolicyModule` 已載入的 startup log 行（見 `local-runtime-ops.md`）

### 3.2 第一個業務端點

- [ ] **`GET /policies` · `POST /policies`**
  - DoD: 範疇**只能**來自 session/憑證（約束 8 鐵律 3）；查無資料回 **404** 不回 403
  - Verify: `npm run test:int -w apps/api`
- [ ] **Cache-Control 政策**（關 `AD-CacheControl-1`）
  - DoD: 業務 API 回應 `no-store, private`；⚠️ **「什麼算 sensitive」的判準已寫成文字**，
        不是只加一個 header
  - Verify: `security.spec.ts` 逐條斷言（模仿 `16:21` 四標頭的既有寫法）

### 3.3 約束 8 四個範疇測試

- [ ] **跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 / 滾升角色只見授權子樹**
  - DoD: 四項各一個測試；RLS 那項**完全不經應用層**（模仿 `rls-direct.int.spec.ts`）
  - Verify: `npm run test:int -w apps/api`

### 3.4 並行範疇汙染常駐測試（關 `AD-ScopeConcurrency-1`）

- [ ] **兩個不同範疇的 client 交錯查詢 N 次，各自只見己列**
  - DoD: 常駐整合測試（非 scratchpad）；**先斷言角色前提**再跑
  - Verify: `npm run test:int -w apps/api`

### 3.5 元驗證（spike 強制 —— 每個宣稱會擋東西的機制都弄壞一次）

- [ ] **catalog 驗證中性化 → 非法擴充欄位應被放行 → 測試紅** → 還原 → 綠
- [ ] **RLS policy → `USING (true)` → 範疇測試紅** → 還原 → 綠
  - DoD: 兩次「弄壞 → 紅 → 還原 → 綠」的實際輸出（含紅了幾個）記入 progress.md
  - Verify: 每次都跑 `npm run test:int -w apps/api` 並記退出碼

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
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
