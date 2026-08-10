# CH-019: The shape every table copies — `User`, `ref_code`, and the Policy base fields

**Date**: 2026-08-10
**Phase**: W04（M1 slice 1）
**Scope**: `core-model` · `entity-scope`（消費，未修改）· `modules`（測試）
**Components**: —
**PR**: **MERGED** #34（`5bb0c9f`，2026-08-10）

---

## Problem

`02a` §0 自稱 "**Every** entity in the platform" 並明訂「不在這份清單上的不可建」。
**`User` 不在那份清單上**，三份文件互相指向而沒有一份定義欄位：
`02a:94`（base field `owner_user_id UUID FK → User` —— 是**引用**）·
`02:37`（一列概念，指向 `05`）· `05` §Identity（描述 OIDC 委派與授權模型，**無欄位**）。

實務後果不是「少一張表」。`02a` §1.1 規定**每個** domain entity 都有
`owner_user_id` / `created_by` / `updated_by` 三個 FK 指向 `User`，§3 另有七個領域專屬的 user FK。

> **M1 建其餘 32 張表時若 `User` 仍無標的，M4 要回頭替 32 張表加欄位 + migration + 回填。**
> 成本是超線性的 —— 這是 `AD-UserEntitySpec-1` 被列為「越晚做越貴」的理由。

同時 `Policy`（W02 建的唯一業務表）的 header **自陳**五類刻意留空的欄位（`schema.prisma:97-106`
於本 phase 前），其中 `ref_code` 與三個 user FK 都在等 `User` 存在。

---

## Root Cause

不是「還沒做」。根因是 **`User` 的範疇語義沒有先例，而那個問題擋住的不只是 `User` 一張表**：

- 約束 8 鐵律 1 的字面是「所有業務 table 必有 `entity_id NOT NULL`」
- 唯一的全域表先例是 `OrgEntity`，而它的理由**不可移植** —— 它是全域的因為它*定義*範疇
- `05` §Identity 把授權寫成 role-based + entity scope，但**沒說 scope 存在哪一張表上**

於是三件事互相擋住：不知道 `users` 有沒有 `org_entity_id` 就寫不了 migration；
沒有 `users` 表就補不了 `Policy` 的四個欄位；沒有 `ref_code` 就沒有一張「形狀完整」的表可供複製。

⭐ **這個決定不能「先選一個之後再改」** —— `org_entity_id` 是 RLS policy 的錨點，
改它等於改 32 張表的 FK 語義。

---

## Solution

**先拍板語義（ADR-0012），再決定要建什麼。** 順序是本 phase 最有價值的一件事：
照原 plan 先建 `user.repository.ts` 再寫 ADR 的話，會得到一個**通過所有 gate 的零消費者元件**。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/14-adr/0012-user-scope-semantics.md` | 新增 | `users` 全域無 `org_entity_id`；**4 條可證偽條件** |
| `apps/api/prisma/schema.prisma:115-134` | 新增 | `model User` —— 三個欄位 + base fields，**無密碼欄位**（`05` 明訂委派 OIDC）|
| `apps/api/prisma/schema.prisma:147-162` | 新增 | `model RefCodeCounter` —— **有** `org_entity_id`（見下 §load-bearing 2）|
| `apps/api/prisma/schema.prisma:185-252` | 修改 | `Policy` +5 欄 + `enum PolicyStatus`（6 態）|
| `prisma/migrations/20260810185500_user_and_base_fields/` | 新增 | 表 + RLS + GRANT + **回填 + counter 同步**（同一個 migration）|
| `prisma/migrations/20260810215500_grant_schema_usage/` | 新增 | `GRANT USAGE ON SCHEMA public` —— Day 3 發現的缺口，見 §Verification |
| `apps/api/src/core-model/ref-code.ts:93-128` | 新增 | 發號；`upsert` + `increment` = 單一 `INSERT … ON CONFLICT DO UPDATE … RETURNING` |
| `apps/api/src/core-model/scoped-client.types.ts:78-84` | 修改 | `ScopedRefCodeClient`；`ScopedPolicyClient` 繼承它 |
| `apps/api/src/core-model/policy.repository.ts:104-120` | 修改 | **validate 在 allocate 之前** —— 被拒的 payload 不燒號 |
| `docs/02-architecture/02a-data-model-spec.md:48,260-270` | 修改 | §0 索引列 + §3.2 `User` 規格（**同一個 change** —— §0 自己的規則）|
| `docs/rules-on-demand/multi-tenant-data.md:67-79` | 修改 | 鐵律 1 擴充 **identity 為第三類** |
| `apps/api/test/int-global-setup.js:62,162-183` | 修改 | users seed；**counter 由 policies 導出**，不寫死 |

### 四個 load-bearing 細節（拿掉就會壞）

1. **ADR-0012 的立場是「規則的二分法不完整」，不是「`users` 是例外」。**
   `multi-tenant-data.md` 原本只有兩類（業務資料 = 範疇化 / 參考資料 = 全域），
   而那五類參考資料**全部沒有個資**。identity 兩者皆非 → 改的是**分類本身**（`:67-79`），
   不是在清單尾巴加第六列。⭐ 差別在於：加一列是記一個例外，改分類是讓下一個人自己就能判斷。

2. **`ref_code_counters` 是 entity-scoped，而那是本 phase 最有價值的半邊。**
   替別的實體發號**正是** RLS 存在要拒絕的跨實體寫入。counter 帶 `org_entity_id`，
   於是「這個 principal 可以寫 HK1 的 policy 嗎」與「它可以發 HK1 的號嗎」由**同一條 policy**
   回答（`migration.sql:138-141`）。一個機制，不是兩個。

3. **回填之後必須同步 counter，否則下一次發號就撞號。**
   counter 從 0 起算、回填的第一筆是 `000001` → 第一個 API 建立的 policy 也拿 `000001` →
   unique violation，而**呼叫者什麼都沒做錯**。migration（`:90-93`）與 seed 都改成
   **從 `policies` 導出** counter，不寫死。

4. **`ref_code` 永不由呼叫者提供**（`schema.prisma:190-193` · `ref-code.ts:21-25`）。
   unique 索引在 RLS **底下**執行，所以一次碰撞會對一個看不見 HK1 的 principal
   回答「`POL-HK1-000007` 存在嗎」。伺服器端發號讓那個問題問不出來。

### 明確不做（每項都有解封條件）

- **`user.repository.ts`** —— Day 1 砍掉。ADR-0012 拍板後它的存在理由「第二個範疇化 client
  消費者」不成立（`users` 無 RLS），且今天零消費者 = AP-5 + AP-3。**解封：M4**
- **`Role` / `Permission`** —— M4。已進 `02a` §0 的 "Not yet specified" 分區
- **`is_active`** —— 不建（D2）。`02a:98` 自稱它是 derived flag；存它 = 造出可與 `retired_at` 分歧的第二個真相
- **`status` 的轉換強制** —— M5。⚠️ docstring 明寫「轉換今天沒有被任何東西擋住」（`schema.prisma:171-175`）

---

## Verification

**Gate**: lint **0** · type-check **0** · format **0** · `run_all` **6/6** ·
`lint:negative` PASS（**18 檔 0 bypass, 3 allowlisted**）· unit **86 passed**（baseline 78 → **+8**）·
int **34 passed**（baseline 32 → **+2**）· web **10** · build **0**
覆蓋率 **94.11 / 90.42 / 92.45 / 94.76**（baseline 93.69 / 90.21 / 92 / 94.32 —— **四項全升**）

### 🚩 首次 API 探測就 500，而每一項 gate 都是綠的

`GET /policies` → **500**，log 是 `permission denied for schema public`（**42501**）。

根因是**兩條建庫路徑產生的 schema 權限不同，而被測試的恰好是免費繼承到權限的那一條**：

| 路徑 | 做什麼 | `public` 的 ACL |
|---|---|---|
| `int-global-setup.js`（`isms_test`）| `CREATE DATABASE` → 從 **template1 複製** | 帶內建 `GRANT USAGE TO PUBLIC` → **免費繼承** |
| `prisma migrate reset`（`isms_dev`）| **不 drop database** —— `DROP SCHEMA public CASCADE` + `CREATE SCHEMA` | **ACL 為 null**，只有 owner |

⭐ **這個權限從來沒有被本 repo 的任何東西授予過。** W02/W03/W04 的每一個表層級 GRANT
都疊在一個沒有任何 migration 陳述過的假設上。修法是**新 migration**（不改已套用的 —— 那正是
同一天稍早踩過的 checksum 坑），`GRANT USAGE` 但**不給 `CREATE`**：能 DDL 的角色也能 drop 掉約束它的 RLS policy。

### API-level 驗證（真進程 + 真 PostgreSQL + 真 RLS，11 案例全 PASS）

兩個特別值得記：

- **#6 oracle 防護** —— 跨實體與不存在的實體，回應除 id 外**逐字相同**。
  ⭐ 而拒絕點已經**從 policy insert 移到了 counter upsert**（發號在前）。
  **同一個保證，在新位置重新成立。**
- **#11 422 之後 counter 未被燒號** —— `last_seq=2, policies=2`。
  validate-before-allocate 的順序在真進程上確認。

### 元驗證（每個宣稱會擋東西的機制各弄壞一次）

| 弄壞什麼 | 結果 |
|---|---|
| `issueRefCode` 的 `{ increment: 1 }` → 固定值 | int **2 failed**（含並發測試的 size 斷言）|
| `ref_code_counters` 的 RLS → `USING(true) WITH CHECK(true)` | int **2 failed** —— 見下 |
| 兩者還原 | int **34 passed** |

第二列的兩個失敗**不是同一件事的兩個症狀**：一個是 SG1 成功發出 `PRB-HK1-000001`（直接證據），
另一個是 **W03 的 oracle 防護測試 2b** 因**錯誤型別改變**而失敗。

> ⭐ **counter 的 RLS 失效不只是「能替別人發號」** —— 它讓「不存在」與「不是你的」
> **重新變得可區分**。W04 的發號路徑現在是 W03 那個保證的一部分，而寫的時候沒有東西記錄這件事。

### 我自己的一個錯誤結論（記錄下來，因為它是形狀而非意外）

`migrate reset` 之後查了 `information_schema.role_table_grants` 就寫下「GRANT 與 RLS **全部完好**」。
那是**表層級**的證據，被用來回答一個涵蓋 **schema 層級**的問題。
**證據是真的，結論超出了它的射程** —— `feedback_evidence_must_support_claim` 的形狀。

**Drive-through**: ⚪ **無 user-facing surface** → 不適用。
**Verdict**: ✅ **API-level verified against a clean process**。
⚠️ **不是「可用」** —— 沒有 UI，沒有人透過 UI 用過它。W01–W04 至今**零 UI drive-through**。

---

## Impact

- **Breaking change**: no（新增表與欄位；`Policy` 既有 8 欄行為不變）
- **Migration**: yes —— 兩個。`20260810185500_user_and_base_fields`（**含回填**）+
  `20260810215500_grant_schema_usage`。
  ⚠️ **回填不可逆地決定了既有 policy 的 `ref_code`** —— 依 `02a:104` 它一旦發出就穩定
- **Config**: 無新變數
- **重啟需求**: ⚠️ **是** —— Prisma client 重新生成（新 model），且 GRANT 變更對已建立的連線
  不會回溯。對陳舊進程驗證會看到修正「沒生效」（Risk Class C）
- **對其他環境的影響**: ⭐ `grant_schema_usage` 對 **CI 與任何用 `CREATE DATABASE` 建起來的庫是 no-op**
  （它們早就從 template1 繼承了）。**它只在 reset 過的庫上有作用** —— 也就是說，
  這個 migration 的價值在 CI 上量不到，這正是缺口能存活到 Day 3 的原因
- **Rollback**: revert 本 phase 的 commit + `prisma migrate resolve --rolled-back` ×2；估 ~1 hr。
  ⚠️ **不對稱**：drop `users` 會使 `Policy` 的三個 FK 失去標的，已寫入的 `ref_code` 失去發號來源

---

## 相關

- **關掉的待辦**: `AD-UserEntitySpec-1` ✅（`User` 半邊；`Role` / `Permission` 已進
  `02a` §0 "Not yet specified" 並綁 M4）
- **新增的 ADR**: [ADR-0012](../../14-adr/0012-user-scope-semantics.md) —— **已採納**
- **規則變更**: `docs/rules-on-demand/multi-tenant-data.md` 鐵律 1 新增 **identity 第三類**
  + 查詢規則「join `users` 只能加欄位，永遠不能加列」
- **同類前例**: `AD-NegativeGate-1` 的第 **7** 個負面 gate（W03 是第 6 個）。
  本次的結構性貢獻是**量到一個機制的失效會改變另一個 phase 的保證** —— 不是再寫一次紀律
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-DbBuildPathParity-1` ·
  `AD-MigrationChecksum-1` · `AD-AllowlistCountClaim-1`
- **Design note**: `docs/02-architecture/design-notes/W04-user-and-base-fields.md`
