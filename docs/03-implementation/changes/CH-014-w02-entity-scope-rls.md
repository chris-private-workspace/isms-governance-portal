# CH-014: Entity-scoped row-level security, proven end to end

**Date**: 2026-08-09
**Phase**: W02
**Scope**: `core-model` · `entity-scope` · 工具鏈（CI / lint / 測試基礎設施）
**Components**: —
**PR**: #25（MERGED `02dffef`）

---

## Problem

平台**沒有任何實體範疇隔離**，而承重機制從未被寫過也從未被跑過。
`prisma.service.ts:12`（W01）明文標示 `THIS CLIENT IS NOT YET ENTITY-SCOPED`。

問題在 M1 建第一張表的瞬間從理論變成違反：ADR-0010 拿掉物理隔離後，
`07:33` 記載 RLS 是「now the *only* isolation barrier」，而
`multi-tenant-data.md:182-183` 把症狀寫得很清楚 —— 滾升現在只是一個少了
`WHERE org_entity_id` 的查詢，**它跑得通、看起來對、測試也會過**。

量化起點：業務表 0 張、RLS policy 0 條、隔離測試 0 個、旁路 detector 0 個。

---

## Root Cause

不是「還沒做」。根因是 **ADR-0001 選了一個沒有內建這個能力的 ORM**，並把補救記成一句設計意圖：
`ADR-0001:103-105` 寫下 client extension「must be written and proven; it is not a framework
guarantee」，然後 `ADR-0001:121-125` 把它列為整個後端選擇的承重假設 —— **未經測試**。

同一種病在 W01 又長了一次：`prisma.config.ts:11-15` 已經預想到「app 角色與 migration 角色必須分開」
並寫下警語，但 `prisma.config.ts:47` 與 `prisma.service.ts:43` **讀的是同一個 `DATABASE_URL`**。
知識存在，只存在於註解裡，沒有任何機制強制它。

---

## Solution

RLS + client extension（ADR-0004 記錄選它與否決 B/C 的理由）。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/api/prisma/schema.prisma` | 修改 | `OrgEntity`（全域，無 `org_entity_id`）+ `Policy`（`org_entity_id NOT NULL` + FK + 複合索引）|
| `apps/api/prisma/migrations/20260809075152_entity_scope_spike/migration.sql` | 新增 | 表 + `ENABLE`/`FORCE` RLS + policy + `isms_app` 群組角色，**同一個 migration** |
| `apps/api/prisma/migrations/20260809171812_entity_scope_fail_closed/migration.sql` | 新增 | `app_entity_scope()` —— 未設定與空字串**都**是 `42501` |
| `apps/api/src/entity-scope/scoped-prisma.provider.ts:68-89` | 新增 | `runScoped` —— 每個 operation enlist 進含 `set_config` 的 transaction |
| `apps/api/src/entity-scope/entity-scope.resolver.ts:94-144` | 新增 | 授權子樹解析（materialised path 前綴）+ branded `EntityScope` |
| `apps/api/src/core-model/prisma.service.ts:45-81` | 修改 | 不再 `extends PrismaClient`；改為 `connection` + `probe()` |
| `apps/api/src/health/*` · `bootstrap/app.module.ts` | 修改 | health 改用 `probe()`，連線改由 `EntityScopeModule` 提供 |
| `scripts/assert-no-scope-bypass.mjs` | 新增 | 三條旁路規則 + **每次執行都跑的 self-test** |
| `apps/api/test/int-*.js` · `jest.int.config.js` | 新增 | 整合測試基礎設施（每次 DROP/CREATE/migrate/seed）|
| `docker/init-app-role.sh` · `docker/compose.yml` · `.env.example` | 修改 | 受限 app 角色 + 兩個連線字串 |
| `.github/workflows/{ci,image-smoke}.yml` | 修改 | 整合測試接線（使用者拍板：重用既有 compose）+ 角色前置斷言 |

**Load-bearing 細節，拿掉就會壞**：

- **`WITH CHECK` 不可省** —— 只有 `USING` 時 INSERT 可把列塞進別的實體、UPDATE 可把列搬過去
- **不 GRANT DELETE** —— 軟刪除因此是權限結構，不是慣例
- **`set_config` 的第三個參數 `TRUE`** —— transaction-local，pooled 連線不會把範疇帶到下一個請求
- **`app_entity_scope()` 必須 SECURITY INVOKER**（預設）—— DEFINER 會讓它以 schema owner 身分跑
- **`base.$executeRaw` 而非 extended client** —— 否則 `set_config` 自己會被攔截而無限遞迴

---

## Verification

**Gate**: type-check 0 · lint 0 · format clean · `run_all` 6/6 · `lint:negative` PASS ×2 ·
unit test **33**（baseline 20 → **+13**）· coverage 95.95/82.35/88/96.29 ·
integration test **20**（baseline 0 → **+20**）· web test 10 · build clean

**新增測試**:

- `apps/api/src/entity-scope/entity-scope.int.spec.ts` —— 約束 8 四個範疇測試 + fail-closed。
  **負面**：跨實體 INSERT/UPDATE 皆 `42501`，且**拒絕後重讀確認資料未變**
- `apps/api/src/entity-scope/rls-direct.int.spec.ts` —— **不經應用層**，`pg` 直連。
  **負面**：從未設定 → `42704`；設為空 → `42501`；`DELETE` → `42501`
- `apps/api/src/entity-scope/*.spec.ts` —— **負面**：空 scope 時 `operation` 從未被呼叫；
  SG 滾升不得觸及 HK
- `apps/api/src/entity-scope/__fixtures__/scope-bypass.ts` —— 常駐的刻意錯誤，detector 的 self-test 標的

**元驗證**（三次，弄壞 → 紅 → 還原 → 綠）:

| 弄壞什麼 | 結果 |
|---|---|
| RLS policy → `USING (true)` | **14/20 整合測試紅** → 還原 20/20 |
| 生產程式碼加真旁路 | detector FAIL，指到 `health.service.ts:43`，兩條規則各報一次 |
| detector 自己的 `raw-query` pattern 中性化 | **self-test FAIL 且在掃描前就停** |

**Drive-through**: ⚪ **N/A —— 本 phase 無 user-facing surface**（plan §3.x 刻意）

**Verdict**: ⚪ **gate-only verified**。上述任一項都不得被讀成「使用者可用」。

---

## Impact

- **Breaking change**: yes（內部）—— `PrismaService` 不再是 client。注入它的程式碼要改用
  `ScopedPrismaFactory.forScope()`；目前唯一的既有消費者是 health，已一併改
- **Migration**: yes —— `20260809075152`（表 + RLS + 角色）· `20260809171812`（fail-closed 函式）。
  兩者皆可逆（`DROP POLICY` / `DROP FUNCTION`），表不需回滾
- **Config**: **`.env` 需要兩個新變數** —— `DATABASE_URL` 改指向 `isms_app_user`（受限），
  新增 `DATABASE_URL_MIGRATE` 指向 owner。`.env.example` 已更新；
  **`.env` 不在版控，既有開發機必須自己補**（本次踩過：舊 `.env` 讓探測整輪以 superuser 跑）
- **重啟需求**: **是 —— startup-only wiring**。`EntityScopeModule` 在 bootstrap 註冊；
  對著舊進程驗證會得到錯誤結論（本次實際遇到：port 3210 的進程比 `dist` 舊 4 小時 10 分）
- **既有 volume**: initdb script 只在資料目錄為空時執行 → 既有開發機跑 `npm run db:app-role`
- **Rollback**: 見 ADR-0004 §Rollback；~0.5 天

---

## 相關

- **關掉的待辦**: `decision-form.md` **OQ-3** ✅ · `AD-NegativeGate-1` 4/5 → **5/5** ·
  W01 Day 1 記的紅旗「`prisma migrate deploy` 從未在乾淨資料庫上跑過」✅（整合測試每次重建）
  ⚠️ plan §0 引用的 `AD-RLS-Unverified` **從未進 BACKLOG**，所以無處可關 → `AD-AdRegistry-1`
- **裁決**: **ADR-0001 §可證偽條件 #1 未觸發** —— 三條旁路路徑全部由 CI 機械偵測；
  migration 與 Prisma Studio 需要 owner 憑證，屬憑證管理而非不可偵測的程式路徑
- **同類前例**: `CH-012`（常駐負面 gate）· `CH-013`（元驗證紀律）——
  **這是第三次**用同一個形狀，因此本次直接把 self-test 做成不可跳過（不在旗標後面）
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-ScopeConcurrency-1`（並行汙染無常駐測試）·
  `AD-ScopedClientDI-1`（`core-model` 的 DI 消費者待 M1）· `AD-PoolerScope-1` ·
  `AD-ScopeFnCost-1`（`app_entity_scope()` 每列成本未量測）· `AD-Day0Scope-1`（Day-0 對狀態性行為
  的量測範圍過窄）· `AD-EnvDrift-1` · `AD-TimeTracking-2` · `AD-AdRegistry-1`
