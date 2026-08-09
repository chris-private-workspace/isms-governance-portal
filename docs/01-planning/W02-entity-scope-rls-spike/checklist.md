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

- [ ] **`scoped-prisma.provider.ts`** —— 每個 operation 包 `$transaction` +
      `set_config('app.entity_scope', …, true)`
  - DoD: 形狀依 Day-0 **D-prisma7-rls** 的實測結果，不依 ADR-0001 的文字描述
  - DoD: **fail-closed** —— scope 未設定時**拋錯**，不落到「policy 回空集合」那條路
  - Verify: 單元測試 + 觀察實際送出的 SQL

### 2.2 所有權移轉

- [ ] **`prisma.service.ts` 不再匯出未範疇化 client**
  - DoD: 所有權移到 `entity-scope`，`core-model` **經 DI 取得而非 import**
        —— 這是 `prisma.service.ts:19-22` 寫下的設計意圖，**至今從未跑過**
  - Verify: `npm run lint:negative`（boundaries 仍綠）+ `npm run lint -w apps/api`

### 2.3 授權子樹

- [ ] **`entity-scope.resolver.ts`** —— 從角色指派解析授權子樹
  - DoD: **不是** query 參數、**不是** `if role == 'regional_iso': return all()`
        （`multi-tenant-data.md:145`）
  - DoD: 本 phase 無 OIDC（M4）→ scope 來源用最小替身，**且在 code 內明確標示為替身**
        （反 AP-6：mock 必須可見）
  - Verify: 子樹解析的單元測試（多層階層）

### 2.x Full gate

- [ ] lint 0 · lint:negative PASS · type-check 0 · api test ≥ 24 · build clean · run_all 6/6

---

## Day 3 — 整合驗證（無 UI —— 結論一律寫 gate-only verified）

_(本 phase 無 user-facing surface。template 的 drive-through 改成對應的整合驗證，
並**明確寫「gate-only verified」**，絕不暗示可用性。)_

### 3.1 Clean restart

- [ ] **乾淨重啟後驗證 wiring** —— 比對 `dist` mtime 與程序啟動時間，**不只看 port 擁有者**
  - DoD: Risk Class C。W01 踩過一次（跑著的 API 比 `dist` 舊 11m52s）
  - Verify: 擷取證明 extension 生效的 startup log 行

### 3.2 四個範疇測試（約束 8）

- [ ] **跨實體讀拒絕**（查無資料回 **404**，不區分「不存在」與「不在範疇內」）
- [ ] **跨實體寫拒絕，且資料未變** —— ⚠️ 只驗回應碼會漏掉「回 404 但資料被改了」
      （`multi-tenant-data.md:290-291`）
- [ ] **RLS 層獨立成立** —— Day 1.3 的 `psql` 驗證納入自動化測試
- [ ] **滾升角色只看到其授權子樹** —— 且**不經過**任何免 RLS 的連線

### 3.3 fail-closed（US-5）

- [ ] **漏設 scope 時報錯，不是回空集合**
  - DoD: 測試必須能**區分**「空結果」與「未設定 scope」——
        「這個 OpCo 沒有風險」在本平台不是空畫面，是錯誤的保證
        （`multi-tenant-data.md:207-210`）

### 3.4 旁路偵測（US-6）+ 元驗證

- [ ] **`scripts/assert-no-scope-bypass.mjs`** + CI 接線
  - DoD: 對象 `$queryRaw` / `$executeRaw` / 直接 import 未範疇化 client
  - DoD: ⭐ **自己被弄壞過一次**（CH-012/013 建立的紀律）——
        一個從沒紅過的 detector 就是下一個 Potemkin
  - Verify: 弄壞 → 紅 → 還原 → 綠，三步都記進 progress.md

### 3.5 證據

- [ ] `psql` 輸出 + 測試輸出 + observed-vs-intended → progress.md Day 3
      （**無截圖，因為無 UI**；結論寫 **gate-only verified**）

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
