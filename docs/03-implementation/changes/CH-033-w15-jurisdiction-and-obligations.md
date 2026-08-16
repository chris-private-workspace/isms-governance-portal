# CH-033: 管轄區骨幹與義務庫 —— 三張全域參考表

**Date**: 2026-08-16
**Phase**: W15
**Scope**: `core-model`（schema / migration / seed / int spec）
**Components**: —
**PR**: #67

---

## Problem

`02a:159` 規定 `OrgEntity` 帶 `jurisdiction_id`，而 `schema.prisma` 對 `jurisdiction`
**全檔零命中** —— 父表不存在，所以那個欄位建不起來。連帶地，「這家 OpCo 屬於哪個管轄區」
在資料庫裡**問不出來**，而已確認參數 #4（11 管轄區 / 13 OpCo）是整個平台的範圍定義。

Wave 2 的義務庫（`10:69`）也因此沒有落點：`Regulation` / `Obligation` 的依賴鏈缺最上游那一節。

---

## Root Cause

不是「還沒做」。**前九片全部是 entity-scoped 的業務表**，而這三張是**全域參考資料** ——
第一次撞上「新增全域表」這個類別，而 `multi-tenant-data.md:81` 對它有一道額外的舉證程序。
排序上它一直排在業務表後面，直到 slice 10 才輪到。

---

## Solution

三張表**全部無 `org_entity_id`、無 RLS**，複製 W05 `threats` / `vulnerabilities` 的形狀。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/api/prisma/migrations/20260816045848_jurisdiction_and_obligations/migration.sql` | 新增 | 3 表 + `residency_policy` enum + `org_entities.jurisdiction_id`（nullable）+ 4 FK + 3 `GRANT SELECT` |
| `apps/api/prisma/schema.prisma` | 修改 | +3 model +1 enum +1 欄位；**後續修正**：`onDelete: Restrict` + `@@index([jurisdictionId])`（見下）|
| `apps/api/test/int-global-setup.js` | 修改 | 11 管轄區 / 2 法規 / 1 義務 seed + 計數 guard |
| `apps/api/src/core-model/jurisdiction.int.spec.ts` | 新增 | 7 個 `it()` |
| `docs/rules-on-demand/multi-tenant-data.md` | 修改 | `obligations` **併入既有列**（非新增列）+ 舉證 |
| `apps/api/src/audit-trail/audit.recorder.ts` | 修改 | ⚠️ D10 還原時動到 ×2 處，**plan §4 沒有這一列** |

**三個 load-bearing 細節**：

1. ⭐ **`GRANT SELECT` only 不只是權限設定** —— 它讓「沒有寫入路徑可稽核」成為**資料庫保證**
   而非「今天剛好沒有 repository」的觀察。這是三張表不進 `AUDITED_MODELS` 的唯一支撐（D3）。
2. ⭐ **`jurisdiction_id` nullable 的理由是表達力不是方便** —— `type` 包含 `region`，
   而 APAC 節點橫跨 11 個管轄區，**沒有單一正確值**。NOT NULL 表達不了階層的根（Day 0 D3）。
3. ⭐ **FK 測試必須走 owner 連線** —— app 角色沒有 INSERT 權限，PostgreSQL 會在**評估任何約束之前**
   以 42501 拒絕。照 plan 原樣用 app 角色寫，兩條 FK 測試會**全綠而什麼都沒測到**（Day 0 D7）。

**後續修正（同 PR，commit `e02eb57`）**：`OrgEntity.jurisdiction` 是 optional relation 且未寫
`onDelete`，Prisma 預設 `SetNull` 而 migration 是 `RESTRICT` ⇒ schema 與 DB 不一致。
同批另三條 FK 是 required relation（`RESTRICT` 本就是預設）故未漂。DB 端已正確，**不需新 migration**。

---

## Verification

**Gate**: type-check **0** · `run_all` **8/8** · api unit **480/40** · **api int 225/18**（baseline 218/17 → **+7 tests / +1 suite**）· web **10/1** · coverage **92.14 / 91.77 / 98.98 / 93.56**（逐位不變，事先預測並命中）· `check_entity_index` **25/35** · build clean

**新增測試**: `jurisdiction.int.spec.ts` —— 7 條。**負面測試**：測試 4/5/6 各以 SQLSTATE **23503**
斷言一條 FK；測試 7 以 **42501** 斷言應用角色寫不進去（**用真實 seed 值**，讓缺權限成為唯一可能的拒絕原因）。

**兩次中性化實測**：
- **N1**（移除 `org_entities_jurisdiction_id_fkey`）→ 預測 1 紅、實際 **224/1 failed**，訊息自己指名。
  ⭐ 直覺的「2 紅」在寫下之前被 grep 推翻（`rls-direct` 排第 17、先跑完，看不到多出來的第 6 列）。
- **N2**（給 `jurisdictions` 加 entity-scoped RLS policy）→ 預測 3 紅**且逐條指定機制**、實際
  **222/3 failed**，三種紅的形狀逐項命中（錯的值 / 例外 42704 / catalog 兩欄各變一個）。

⚠️ **已知缺口**（`AD-W15ConstraintSurfaceUntested-1`，P1，不在本片修）：第四條 FK
`regulations_jurisdiction_id_fkey` 零測試 · `GRANT SELECT` 只有 `jurisdictions` 被正面證明 ·
測試 7 只覆蓋三個 write verb 中的 INSERT · AC-2 的欄位形狀無可執行檢查 · 測試 4/5/7 從未被中性化證明。

**Drive-through**: 零端點、零 UI，無人可驅動的路徑。

**Verdict**: ⚪ **N/A（純資料層 —— gate-only verified）**

---

## Impact

- **Breaking change**: no
- **Migration**: **yes** —— `20260816045848_jurisdiction_and_obligations`。**純加法**
  （`CREATE TYPE` / `CREATE TABLE` / `CREATE INDEX` / `ADD COLUMN` nullable / `ADD CONSTRAINT` / `GRANT SELECT`），
  無 `DROP`、無回填、未對既有表加 NOT NULL ⇒ **可逆**
- **Config**: 無
- **重啟需求**: 無（無 startup-only wiring）
- **Rollback**: drop 三張表 + `org_entities.jurisdiction_id`。無資料遷移要還原；
  全部語句在 PG 中 transactional，中途失敗乾淨 rollback。估時 < 5 min

---

## 相關

- **關掉的待辦**: 無
- **同類前例**: `CH-020`（W05 `threats` / `vulnerabilities` —— 全域參考表的形狀來源）
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-RegulationVersionCollision-1` ·
  `AD-CalibrationNoTimeRecord-1` · `AD-W15ConstraintSurfaceUntested-1` ·
  `AD-EntityScopeNoDriftGuard-1` · `AD-W15InvariantInCommentOnly-1`
