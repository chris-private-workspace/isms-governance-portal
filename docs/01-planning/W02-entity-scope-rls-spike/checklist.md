# Phase W02 — Checklist (entity-scoping spike: prove RLS holds under Prisma)

[Plan](./plan.md)

> 🔴 **只能 `[ ]` → `[x]`，永不刪除未勾選項**（PROCESS R6）。做不完標 `🚧 阻塞: <reason>`。

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `903ce35`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify** —— ✅ 9 個 NEW 全部 0 筆、4 個 EDIT 全部 1 筆；
      `ADR-0004` 被 20 個檔案前向引用但**檔案不存在** → 編號未佔用（與 `CH-010` 同形狀）
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-fieldname** — **`org_entity_id` 勝出**：它在 `docs/02-architecture/` 的 **6 份**
        文件一致使用（`02a:90` · `03:99` · `11:73` · `12:42` · `13:37` · `17:35`）；
        `entity_id` 全部落在較低權威層。待修 3 處
  - [x] **D-prisma7-rls** ⭐ **承重假設成立** —— `$extends` 是 function（**不在 prototype 上，
        Proxy 提供** —— 我先前的 prototype 檢查是假陰性）· `$allOperations` 可建立 ·
        tx 內 `set_config` → `"abc-123"` · **tx 後 → `""` 不洩漏**
  - [x] **D-basefields** — 如預期：`owner_user_id`（M4）· `extensions`（ADR-0005）延後
  - [x] **D-scopeboundaries** — 矩陣方向與 §3.3 的 DI 設計一致
  - [x] **D-testinfra** — 🟡 **整合測試基礎設施不存在**：`jest.config.js` 無
        `globalSetup` / `setupFiles` / `testTimeout`，且 `prisma/migrations/` 目錄不存在
        （從未跑過 migration）。要從零建 → §7 已修訂 +1.5 hr
- [x] **Prong 2.5 — child component tree** — ⚪ **N/A**（非前端 phase）
- [x] **Prong 3 — schema verify**（動 DB → 必做）：
  - [x] **D-migration-dir** — `apps/api/prisma/migrations/` **不存在**；
        `prisma.config.ts:51` 已宣告 `migrations: { path: 'prisma/migrations' }`
  - [x] **D-forcerls** — 實測（獨立 database，用完 DROP）：owner + ENABLE（無 FORCE）→ 全部可見；
        非 owner + FORCE → 只見自己範疇。⚠️ **兩次嘗試**：第一次有兩處設計缺陷，見 progress
  - [x] **D-superuser** 🔴 **Day-0 最重要的發現** —— `isms_dev` 是
        `rolsuper=t, rolbypassrls=t`，而 app 現在就用它連線。
        **superuser 繞過 RLS，FORCE 也擋不住**（FORCE 解決的是 table owner）
  - [x] **D-failclosed** ⭐ **範圍縮小** —— 不帶 `missing_ok` 的 `current_setting`
        未設定時 `ERROR 42704`。fail-closed **由 PostgreSQL 免費提供**，兩層獨立成立
  - [x] **D-migration-role** — `prisma.config.ts:11-15` W01 已預想到，但
        `:47` 與 `prisma.service.ts:43` **現在讀同一個 `DATABASE_URL`** → 分離只是結構上的
- [x] **D-baselines** — api test **20** · web test **10** · lint **0** · type **0** ·
      build **clean** · coverage **100/78.57/100/100** · run_all **6/6** · image-smoke **pass**
- [x] **Catalog drift** — 10 個 D-* 寫入 progress.md Day-0 表格
- [x] **Go/no-go** — 範圍變動 **~15-20%**（+3 檔案 −1 實作）→
      **使用者 2026-08-09 核可納入 `compose.yml` / `.env.example` / `image-smoke.yml`**；
      plan §3.2 / §4 / §7 / §Risks 已修訂

### 0.2 Branch

- [x] `git checkout -b feature/W02-entity-scope-rls`（從 `main` `903ce35`）

---

## Day 1 — Schema + RLS at the database (US-1, US-2)

### 1.1 Schema

- [x] **`OrgEntity`（全域表）+ 業務表最小真實子集**（`schema.prisma`）
  - DoD: ✅ `policies.org_entity_id` NOT NULL + FK + 複合索引 `(org_entity_id, retired_at)`；
        軟刪除 `retired_at` + `version`；`OrgEntity` 自我參照、**無** `org_entity_id`、
        帶 `path`（materialised path，`02a:146`）
  - DoD: ✅ 延後欄位**逐條列在 model 的 doc comment 裡**（`ref_code` · `status` ·
        `owner_user_id` · `created_by`/`updated_by` · `extensions` · Policy 模組的 5 個欄位）
  - 📌 選 `Policy` 而非 `Risk` 當業務表：`02a:189` 的欄位**全是純量**，
        `Risk`（`02a:191`）有 4 個 FK 指向本 phase 不建的表
  - Verify: `npx prisma validate` → valid 🚀 · `prisma:generate` exit=0

### 1.2 RLS + 角色

- [x] **migration：表 + RLS policy + FORCE + 角色分離，同一個檔**
      （`20260809075152_entity_scope_spike`）
  - DoD: ✅ `ENABLE` + `FORCE ROW LEVEL SECURITY`
  - DoD: ✅ `isms_app` 為 **NOLOGIN 群組角色、無密碼** —— 權限集合進版控可 review，
        實際登入帳號由環境建立並 GRANT membership（guardrail 7：原始碼中無密鑰）
  - DoD: ✅ policy 與表在同一個 migration
  - DoD: ⭐ **`WITH CHECK` 與 `USING` 都寫** —— 只有 `USING` 的話 INSERT 可以把列塞進
        別的實體、UPDATE 可以搬過去。測試 3/4 就是它
  - DoD: ⭐ **不 GRANT DELETE** —— guardrail 3 的軟刪除**由權限結構強制**，不靠慣例
  - Verify: `prisma migrate deploy` → All migrations successfully applied

### 1.2b 🔴 受限 app 角色（Day-0 D-superuser 使範圍擴大，使用者 2026-08-09 核可）

- [x] **`docker/compose.yml`** + **`docker/init-app-role.sh`**（新）—— 受限 app 角色
  - 實測: `isms_app` f/f/f/f · `isms_app_user` f/f/f/f · `isms_dev` **t/t/t/t**
  - ⚠️ **順序問題已處理**：initdb script 只在 volume **首次**初始化時跑，而那是在
        migration **之前** —— 所以 `isms_app` 群組當下還不存在。解法是 init script 只建
        login role，**migration 用條件式 `IF EXISTS` 授予 membership**，兩條路徑收斂
  - ⚠️ **既有 volume 永遠不會跑 initdb** → 新增 `npm run db:app-role`（冪等）。
        **已實際用這條 fallback 路徑建立本機角色並驗證**，不是只寫了指令
- [x] **`.env.example`** —— 分出 `DATABASE_URL`（app）/ `DATABASE_URL_MIGRATE`（owner）
  - DoD: ✅ `prisma.config.ts` 改讀 `DATABASE_URL_MIGRATE ?? DATABASE_URL`。
        保留 fallback 讓單角色環境仍能 migrate，但**fallback 方向是不安全的那一邊** ——
        註解已寫明它存在的理由是「migration 仍跑得動」，不是「app 可以借用 owner 權限」
- [x] **`.github/workflows/image-smoke.yml`** —— api 容器改用受限角色
  - DoD: ⭐ **加了一道前置斷言**：連線前先查 `pg_roles`，
        `grep -q 'super=f bypassrls=f'` 不成立就 `::error::` 並 exit 1 ——
        否則角色設定壞掉時這一步會**靜靜退回成用 superuser 跑**，而 job 照樣全綠
  - DoD: 📌 **職責邊界寫進註解**：驗「image 能在受限角色下啟動並服務」；
        **不驗** policy 正確性與表權限（`/health` 只跑 `SELECT 1`，不需表權限）——
        那由 Day 3 的整合測試涵蓋。**不假裝這裡有驗**
  - Verify: ⏳ 待 push 後看 CI

### 1.3 ⭐ RLS 層獨立成立（不經應用層）

- [x] **用 `psql` 直接連、設兩個不同的 `app.entity_scope`，證明看到不同的列**
      —— ⭐ **約束 8 的四個範疇測試在資料庫層全部成立**
  - 實測（角色 `w02_probe`：`rolsuper=f, rolbypassrls=f`）：
        scope=SG1 → 1 row · 以 id 查 HK1 → **0 rows** ·
        INSERT 到 HK1 → **`ERROR: new row violates row-level security policy`** ·
        UPDATE 移到 HK1 → **同一個 ERROR** · scope=SG1,HK1 → 2 rows ·
        DELETE → **`ERROR: permission denied`**
  - DoD: ⭐ **拒絕之後重讀，兩列 `org_entity_id` 都是原值** ——
        `multi-tenant-data.md:290-291`：只驗回應碼會漏掉「回 404 但資料被改了」

### 1.x Partial gate

- [x] lint **0** · type-check **0** · build **clean** · api test **20**（baseline 不變）

---

## Day 2 — Scoped client + subtree resolution (US-3, US-4, US-5)

### 2.1 Client extension ⭐ 承重

- [x] **`scoped-prisma.provider.ts`** —— 每個 operation 包 `$transaction` +
      `set_config('app.entity_scope', …, true)`
  - DoD: ✅ 形狀依實測，不依文字描述 —— **120 次交錯 scoped 讀（pool max 1 與 10）→ 0 錯**，
        證明 `query(args)` 真的在同一個 tx 內；tx 後 scope 讀回 `''` 不外洩
  - DoD: ⭐ **fail-closed** —— extension 在 `operation()` **被建立之前**就拒絕空 scope
  - DoD: 🔴 **D-failclosed-2 推翻 Day-0**：Day-0 的「fail-closed 由 PostgreSQL 免費提供」
        只在**從未被 scope 過的連線**上成立。`set_config` 之後 GUC 變成「已定義為空字串」，
        `current_setting` 不再 raise → **靜默回 0 列**。pooled 連線從第二個請求起全部如此。
        → 新增 migration `20260809171812_entity_scope_fail_closed`（plan §4 未列），
        policy 改走 `app_entity_scope()`，未設定與空**都**是 `42501`。兩層現在是**設計的**
  - Verify: ✅ 單元測試 6 項（斷言 set_config 排在 query **之前**、參數化非字串串接、
        空 scope 時 `operation` **從未被呼叫**）+ 三輪 probe 的實際 SQL 行為

### 2.2 所有權移轉

- [x] **`prisma.service.ts` 不再匯出未範疇化 client**
  - DoD: ✅ **不再 `extends PrismaClient`** —— 改為持有 `connection` + `probe()`。
        在此之前任何 injector 離「未範疇化查詢」只有一個屬性存取；現在 `connection`
        是**唯一具名入口**，Day 3 的 detector 得以講規則而非列白名單。
        新增測試直接斷言這個「不存在」（`service.policy` / `service.$queryRaw` 皆 undefined）——
        否則哪天有人把 `extends` 加回去，不會有任何測試變紅
  - DoD: 🚧 **「`core-model` 經 DI 取得而非 import」本日未能證明** ——
        `core-model` 目前**沒有任何 repository**，建一個零消費者的 DI token 就是 AP-5 + AP-3。
        Day 3 的範疇測試需要真正的消費者，屆時一併建立並驗證。**未勾此子項不代表已放棄**
  - DoD: 📌 **量到一件 plan 沒預料的事**：`scope-boundaries.md:124` 說範疇化 client 的
        **型別住在契約層** —— 那**做不到**。契約層是葉節點，不能 import `core-model`，
        而範疇化 Prisma client 的型別必然是 generated 的。可行拆法是
        **token 在 `api`、型別在 `core-model`、實例由 `entity-scope` 提供**。進 Day 4 design note
  - Verify: ✅ `lint:negative` PASS · `lint -w apps/api -w apps/web` 0 · type-check 0

### 2.3 授權子樹

- [x] **`entity-scope.resolver.ts`** —— 從角色指派解析授權子樹
  - DoD: ✅ 子樹來自 materialised `path` 前綴比對（`02a:146` 指定該欄位的理由）。
        `rollUp` 只決定「要不要展開到子孫」，**不決定要不要過濾** ——
        APAC 指派與全域指派的差別是回傳哪些列，不是有沒有過濾
  - DoD: ⭐ **`EntityScope` 用未匯出的 symbol brand** —— 其他模組沒有那個名字就造不出
        這個型別。鐵律 3「scope 只能來自憑證」因此是**編譯錯誤**而非 review 意見
        （TS 一開始拒絕我自己的 cast，那正是它在生效）
  - DoD: ✅ 無 OIDC（M4）→ `PrincipalAssignment` 的 doc comment **明寫**今天唯一的
        建構者是測試，且**刻意不接 HTTP**：一個會讀 request 的替身跟真的長得一樣（AP-6）。
        **沒有建替身 source** —— 那會是沒有主流量呼叫者的 AP-1 + AP-3
  - Verify: ✅ 7 項單元測試，含**兄弟分支斷言**（SG 滾升不得觸及 HK / HK1）——
        一個「回傳全部」的 resolver 能通過此檔其餘每一項斷言，只有這一項會抓到它

### 2.x Full gate

- [x] lint 0 · lint:negative PASS · type-check 0 · api test **33**（≥ 24；baseline 20）·
      format:check clean · build clean · run_all 6/6
- [x] ⭐ **編譯後的生產類別對真 PostgreSQL 驅動一輪**（受限角色，10/10 如預期）——
      單元測試用替身、probe 用手寫 pattern，而**生產程式碼是那個 pattern 的轉寫，
      轉寫不是量測**。⚪ 無 UI → 結論仍寫 **gate-only verified**
  - ⚠️ 那輪 drive 是**一次性腳本、不在 CI**：它證明「今天成立」，不是「明天不會壞」。
        Day 3 把它變成測試

---

## Day 3 — 整合驗證（無 UI —— 結論一律寫 gate-only verified）

_(本 phase 無 user-facing surface。template 的 drive-through 改成對應的整合驗證，
並**明確寫「gate-only verified」**，絕不暗示可用性。)_

### 3.1 Clean restart

- [x] **乾淨重啟後驗證 wiring** —— 比對 `dist` mtime 與程序啟動時間，**不只看 port 擁有者**
  - DoD: ⭐ **Risk Class C 第二次現身，而且更嚴重**：port 3210 的持有者比
        `dist/entity-scope/scoped-prisma.provider.js` **舊 4 小時 10 分**
        （13:14:13 vs 17:24:28）—— 它從未載入過 `EntityScopeModule`
  - Verify: ✅ 殺掉 4684 + 父 53092 → port 空出 → 重啟 → 新進程唯一持有且**比 dist 新**。
        Startup log：`[InstanceLoader] EntityScopeModule dependencies initialized` ·
        `curl /health` → `{"status":"up","db":"up"}`（同時證明受限角色在真 runtime 可用）

### 3.2 四個範疇測試（約束 8）

- [x] **跨實體讀拒絕**（查無資料回 **404**，不區分「不存在」與「不在範疇內」）
  - 📌 **本 phase 無 endpoint（plan §3.x），所以驗在它真正發源的地方**：
        「不在範疇內」的 id 與「從不存在」的 id 必須**無法區分** —— 兩者皆 `null` 且
        `toEqual` 彼此。這裡若不同，之後任何 controller 都湊不出一致的 404。
        **HTTP 狀態碼映射隨 endpoint 一起延後，未偷偷當成已做**
- [x] **跨實體寫拒絕，且資料未變** —— INSERT 與 UPDATE 各一項，皆 `42501`；
      **拒絕後重讀**確認 HK1 仍只有原本那列、SG1 那列的 `org_entity_id` 未變。
      另加一項**成功寫入自己實體**，否則「全部都失敗」也能通過上面兩項
- [x] **RLS 層獨立成立** —— `rls-direct.int.spec.ts` 8 項，用 `pg` 直連下 SQL，
      **不經 Nest、不經 Prisma、不經 extension**。含 `DELETE` → `42501`（無 DELETE 授權）
- [x] **滾升角色只看到其授權子樹** —— SG 滾升只見 SG1；APAC 滾升見兩者；
      **SG 不滾升則什麼都看不到**（否則「滾升」只是一個貼在既有行為上的標籤）

### 3.3 fail-closed（US-5）

- [x] **漏設 scope 時報錯，不是回空集合**
  - DoD: ✅ 同一條連線、同一個 query：`HK`（無 live policy）→ `[]`，
        未設 scope → **throw `app.entity_scope is not set`**。兩者可區分
  - DoD: ✅ 直連層另驗兩種未設定：從未 SET → `42704`；SET 成空字串 → `42501`
  - DoD: ✅ 應用層在**資料庫看到之前**就拒絕空 scope（`EntityScopeError`）

### 3.4 旁路偵測（US-6）+ 元驗證

- [x] **`scripts/assert-no-scope-bypass.mjs`** + CI 接線
  - DoD: ✅ 三條規則 —— `raw-query`（`$queryRaw`/`$executeRaw`/`*Unsafe`）·
        `unscoped-connection`（`.connection`）· `new-client`（`new PrismaClient(`）。
        allowlist **3 個檔案**，每一個都是「實作這個機制的程式碼」而非「例外」
  - DoD: ⭐ **CI 接線零改動** —— 掛進 `lint:negative`，而 ci.yml 的 `Negative gates`
        步驟本來就跑它
  - DoD: ⭐ **self-test 不在旗標後面，每次執行都跑** —— 一個 pattern 失效的 detector
        會報「0 violations」，那跟乾淨的 repo 長得一模一樣
  - Verify: ✅ **兩種弄壞法**：(1) 生產程式碼加真旁路 → FAIL 指到 `health.service.ts:43`，
        兩條規則各報一次；(2) 把 detector 自己的 `raw-query` pattern 改成永不匹配 →
        **self-test FAIL 且在掃描前就停**。兩者還原 → PASS。三步全記進 progress.md
  - 📌 第一版有**假陽性**（對解釋自己的註解開火）→ 比對前先剝註解。理由寫在檔案裡

### 3.5 證據

- [x] `psql` 輸出 + 測試輸出 + observed-vs-intended → progress.md Day 3
      （**無截圖，因為無 UI**；結論寫 **gate-only verified**）
- [x] ⭐ **這套整合測試自己也被弄壞過** —— policy 改成 `USING (true) WITH CHECK (true)`
      → **14/20 紅**；還原 → 20/20。否則它跟 Day 2 那個「十二項全綠」沒有分別
- [x] ⭐ **`init-app-role.sh` 的 initdb hook 第一次被真的執行** —— Day 1 只走過
      `db:app-role` 的 fallback。用拋棄式 compose project（`-p ismsinitcheck` +
      `ports: !override` 換 port）在全新 volume 上驗，**未碰 `docker_isms-pgdata`**：
      `[init-app-role] isms_app_user ready (NOSUPERUSER, NOBYPASSRLS)`。
      再把整合測試指過去跑 → **20/20**，CI 路徑端到端在本機驗過
- [x] **整合測試基礎設施**（Day-0 `D-testinfra`：它不存在）——
      `jest.int.config.js` + `test/int-{db,env,global-setup}.js`。每次 DROP/CREATE/migrate/seed，
      **副作用是 `prisma migrate deploy` 第一次跑在乾淨資料庫上**（Day 1 紅旗關閉）。
      globalSetup 先斷言角色 `super=f bypassrls=f`；`int-db.js` 拒絕操作不以 `_test` 結尾的資料庫
- [x] **CI 接線** —— 使用者 2026-08-09 拍板 **ci.yml + 既有 compose**（重用同一份 compose，
      `init-app-role.sh` 的角色建立只有一個實作，三條路徑不會漂移）。
      **新步驟不加存在性 guard** —— 「找不到就跳過」正是 W01 那個綠著掃 0 個目標的 trivy job
  - Verify: ⏳ **待 push 後看 CI**（本機已用拋棄式實例模擬過整條路徑）

---

## Day 4 — closeout

### 4.1 Design note + ADR ⭐ spike 強制

- [ ] **`docs/02-architecture/design-notes/W02-entity-scope-rls.md`**
  - DoD: 通過 `docs/rules-on-demand/spike-design-note-gate.md` 的 **8-point gate**；
        每個不變式含 `file:line`；**extract 不是 pre-write**
  - DoD: 補上 `docs/` 目前完全空白的兩塊：**`FORCE RLS` 與 DB 角色模型**
- [ ] **`docs/14-adr/0004-entity-scoping-enforcement.md`**
  - DoD: 4 個必備區塊 + ⭐**可證偽條件**（什麼觀察結果會推翻這個決定）
  - DoD: 若 spike 顯示 Prisma 攔不到全部路徑 → **STOP and ask**，
        不自行換 ORM（那是 ADR-0001 可證偽條件 #1 觸發，架構級決定 R5）
- [ ] **change record** — `docs/03-implementation/changes/CH-NNN-w02-entity-scope-rls.md`
      （單檔 1-page；編號**用 grep 全 repo 的 `CH-\d+` 引用**查最大號，不是 `ls`）

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`spike` 0.65，**第 1 個資料點**）
- [ ] `CALIBRATION-MATRIX.md` 新增 `spike` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）
- [ ] Final gate sweep: lint 0 · lint:negative PASS · type-check 0 · api test ≥ 26 ·
      web test 10 · build clean · run_all 6/6 · image-smoke pass
- [ ] 導航檔: `CLAUDE.md` Current-Phase（**1 行**）+ Last-Updated ·
      `MEMORY.md` pointer + subfile · `BACKLOG.md`
- [ ] **`decision-form.md` OQ-3 移到「已拍板」** + `14-adr/README.md` 索引更新（R4）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻 `status:`
