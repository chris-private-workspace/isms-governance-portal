# CH-021 — the control library, and the write paths that make W05's claims testable

**Date**: 2026-08-12
**Phase**: W06（M1 slice 3）
**Scope**: `core-model` · `modules` · `entity-scope`（消費，未修改）
**Components**: `controls` · `/controls` · `/assets` · `/asset-groups`
**PR**: ⏳ PR-pending

---

## Problem

三件事同時卡住，而它們互相解鎖。

**一、`Control` 是 M7 的前置，但它帶著一個本 repo 沒有先例的問題。**
至今每一張表的範疇都是**表級**的：scoped（`org_entity_id NOT NULL` + RLS）或 global
（`users` / `threats` / `vulnerabilities`）。`Control` 兩者皆非 —— `02a:217` 的
`applies_to_scope` 讓**範疇成為每一列的屬性**，同一張表裡有些列只屬於一個實體、
有些列是全集團共用的。`02a:413` 更直接依賴這個區分。

**二、W05 建了 `asset_groups` / `assets` 卻沒有寫入路徑。**
兩張表的 RLS 與複合 FK 因此是**宣稱過但無法開火**的 —— W05 自己的 checklist 2.4
（約束 8 四項範疇測試）就標著 🚧，解封條件正是「有端點可以寫」。

**三、`CLAUDE.md` 貼著硬 gate 運行。** 29,804 / 30,000，headroom **196**
（`AD-ClaudeMdBudget-1`，觸發條件早已成立）。下一次 closeout 只要動一行就會撞牆。

---

## Root Cause

第一項的根因不是「還沒做」，是**語義未拍板**。W04/W05 的順序教訓在這裡第三次成立：
先決定 `applies_to_scope` 的範疇語義，才決定要建什麼。選錯的代價不是一張表 ——
**每一張未來「有共用列」的表都會複製這個形狀**。

Day-0 又推翻了 plan 的三項斷言，其中最重要的一項改變了問題本身：
不對稱的 `USING`/`WITH CHECK` **不是新形狀**，W03 的 `extension_fields` 已經是
（`20260810134319_*/migration.sql:80-83`）。所以 D1 的問題從「發明什麼形狀」變成
**「`extension_fields` 以 catalog 身分取得的鐵律 1 豁免，能不能移轉到一張業務表」**——
從 PostgreSQL 問題變成 guardrail 問題。

---

## Solution

### D1 —— 量測三個形狀，由使用者拍板（助手不代選）

throwaway 資料庫、PostgreSQL 18、以 `isms_app_user`（非 owner 非 superuser）連線、
**16 個案例各自 `BEGIN`/`ROLLBACK`**。證據：
[`d1-rls-probe.out`](../../01-planning/W06-m1-control-and-asset-endpoints/artifacts/d1-rls-probe.out)。

呼叫者 HK1，group 列的擁有者 SG1：

| 動作 | **A** 單一 `FOR ALL` | **B** `extension_fields` 逐字（NULL = group）| **A′** per-command |
|---|---|---|---|
| 讀別人的 group 列 | ✅ | ✅ | ✅ |
| 改它（只改 title）| ⛔ 42501 | ⛔ 42501 | ⛔ 0 rows |
| **刪它** | ⚠️ **成功** | ⚠️ **成功** | ⛔ 0 rows |
| **自建**一列 group | ⚠️ **成功** | ⛔ 42501 | ⛔ 42501 |
| 把自己的列**升格** | ⚠️ **成功** | ⛔ 42501 | ⛔ 42501 |
| **奪取**（改成自己持有 + 降格）| ⚠️ **成功** | ⚠️ **成功** | ⛔ 0 rows |
| 負向對照：改自己的列 | — | — | ✅ 通過 |

三個決定性的發現：

1. **`DELETE` 沒有 `WITH CHECK`** —— 它只看 `USING`，而那正是被放寬的一半。不對稱的
   `FOR ALL` 因此對刪除**完全沒有寫入側防護**。今天沒爆是因為**沒有一張表授予 `DELETE`**，
   不是因為 RLS。
2. **A 與 B 都擋不住「奪取」** —— `USING` 放行（還是 group）、`WITH CHECK` 放行（新持有者是我），
   一家 OpCo 可以把全集團共用的 control 從其他 12 家眼前靜默移走。
   ⚠️ 這個洞**現在就存在於 `extension_fields`** → `AD-GroupRowTheft-1`，**不當場修**。
3. **A 與 B 的實質差別是「group 標記可不可偽造」** —— A 的標記是寫入者控制的欄位值，
   而 `WITH CHECK (org_entity_id = ANY(...))` 根本不看它；B 的標記是 NULL，
   `NULL = ANY(...)` 求值為 NULL，`WITH CHECK` 視同 false。B 的保護是三值邏輯的副作用。

**使用者拍板 A′**，且 **`subtree` 不建**。→ **ADR-0014**（架構級：它約束每一張未來有共用列的表）。

### 拍板後的追加量測 —— 三條 policy 不是四條

A′ 的預覽帶一條窄的 `FOR DELETE`。本 repo 不授予 `DELETE`，那條 policy 因此永遠碰不到 ——
中性化它不會有任何測試轉紅，**那是 AP-3 的定義**。第二個 throwaway 庫（**故意授予 `DELETE`**）：

| 條件 | 結果 |
|---|---|
| 刪**自己的**列，`DELETE` 已授權，**無 `FOR DELETE` policy** | **DELETE 0** |
| `SELECT` / 自己的列 `UPDATE` | **不受影響** |

> **缺席 = 全拒；窄 policy = 窄範圍內允許。少寫一條比寫一條窄的更嚴格**，
> 而且讓這張表不再依賴 GRANT 姿態被維持 —— 那正是發現 1 指出的脆弱處。

### 落地

`20260811093148_control_library`：`controls` + 5 個 enum + **三條 per-command policy**
（`SELECT` 寬、`INSERT`/`UPDATE` 窄且拒 `group` 值、**無 `FOR DELETE`**）+ 擴充 trigger。
對真 DB 回讀確認：`pg_policies` **3 列** · `relrowsecurity`/`relforcerowsecurity` = `t`/`t` ·
`isms_app` grants = **INSERT, SELECT, UPDATE**。

兩個 repository（第 3、4 個範疇化 client 消費者）+ 三個端點。兩個刻意的空缺：

- **`CreateControlInput` 沒有 `appliesToScope`** —— insert policy 只接受一個合法值（欄位預設）。
  **只有一個合法值的欄位不是欄位。**
- **也沒有 `effectiveness`** —— 它「from latest test」（`02a:217`），而 `ControlTest` 是 M7。
  接受呼叫者給的值等於讓寫這條 control 的人告訴平台它有效。

⭐ **`asset.repository.ts` 的兩個方法收不同形狀的 client**：`createGroup` 拿得到
`assetGroup` delegate，`create` 拿不到。runtime 是同一個物件，差別在型別 ——
能先讀父表就能分辨「不存在」與「不是你的」，那正是約束 8 禁止的 oracle。

---

## Verification

**Gate**: lint **0** · type-check **0** · format **0** · `run_all` **6/6** ·
`lint:negative` **PASS（28 檔 0 bypass 3 allowlisted —— allowlist 未增加）** ·
unit **192 / 19 suites**（baseline 138/15）· int **81 / 6 suites**（baseline 54/4）·
web **10** · build **0** ·
coverage **93.35 / 92.47 / 95.74 / 94.56**（baseline 94.13 / 92.17 / 94.36 / 95.03）。

⚠️ **coverage 第一次量四項全低於 baseline，未當作過關**。branch 的退步先被證明**不是計數假象**
（排除 `*.module.ts` 後數字一模一樣），才補 6 個**帶主張**的測試 → branch **92.47 > 92.17**、
funcs **95.74 > 94.36**。stmts/lines 仍低，差額**已量測歸因**：排除 `*.module.ts` 為
**98.96 / 99.10** —— 四個 module 檔在 unit config 下皆 0%（只被 int 載入）。
⛔ **不補「實例化 module」的測試**，那是測 NestJS 的 decorator。

### API-level 走查（真進程 + 真 PostgreSQL + 真 RLS）

兩輪 15 個案例，**每案帶自己的 nonce 並斷言回應回的是那個 nonce**
（W05 第一版走查印出陳舊回應且看起來是通過的）。

⭐ **第一輪（SG1）不足以證明 ADR-0014 的放寬** —— SG1 自己就是那筆 group control 的擁有者。
重啟為 `DEV_PRINCIPAL_ENTITIES=HK1` 才是證據：

- **B1** `GET /controls` → **只有 `CTRL-SG1-000001`（scope=group，owner=SG1）**，
  **看不到** SG1 的兩筆 local
- **B5** 同一個進程 `GET /asset-groups` → **只有 HK1 自己的**

> 兩種 policy 形狀，同一個進程，行為不同 —— 這是本 phase 最乾淨的一格證據。

**Oracle 探測**：A8（別人存在的 group）與 A9（不存在的 group）→ **皆 404 `asset group not found`，逐字相同**。
拒絕點這次落在**複合 FK（23503）**；跨實體建資源則落在**發號 counter（42501）**。兩個都量到了。

### ⛔⛔ 元驗證找到一個真缺口

六組中性化（N1-N6），每次只改一處、跑完 `git checkout` 還原：

| # | 中性化什麼 | 轉紅 |
|---|---|---|
| N1 | `controls_read` 的 group 分支 | **3** |
| N2 | insert+update 不再拒 `group` 值 | **2** |
| N3 | `controls_update` 的 `USING` 放寬 | **4**（含奪取）|
| N4 | `controls_insert` `WITH CHECK` → `true` | 1 → **2** |
| N5 | `assets`+`asset_groups` `WITH CHECK` → `true` | **0 → 2** |
| N6 | 複合 FK 退化成單欄 | **2** |

**N4 第一次是空跑**（anchor 在 insert/update 逐字相同 → 編輯沒套用），那個「78 passed」
**沒有被當成發現**。⭐ 正因它暴露 driver 會靜默空跑，**N5 的零轉紅也不能照收** ——
重跑時加上「跑完直接查 `isms_test` 的 `pg_policies`」，用資料庫證據確認編輯真的進去了。

確認生效後直接量根因：

| `WITH CHECK (true)` 下同一句 INSERT | 結果 |
|---|---|
| 帶 `RETURNING`（Prisma `create()` 一定會發）| **拒絕** —— `new row violates row-level security policy` |
| 拿掉 `RETURNING` | **`INSERT 0 1`，列真的落地** —— HK1 持有，由 SG1 範疇的連線寫入 |

> PostgreSQL 把 SELECT policy 套用在要回傳的那一列上。所以 `control.int` 12b、
> `asset.int` 3b/6b —— 以及它們複製的 **W05 int 11b** —— 證明的是**讀的 policy 藏住了那一列**，
> 從來不是**寫的 policy 拒絕了它**。

⚠️ **不是現存外洩** —— 今天的 `WITH CHECK` 是對的。壞掉的是**測試察覺它壞掉的能力**。
⭐ **`AD-BorrowedRefusal-1` 第 3 次**，而 **W05 條款 2 正是為了防它而追加的** ——
Day 2 照它做了三個測試，三個都沒做到它宣稱的事。

**處置是修不是記**：`createMany` 不發 `RETURNING` → 新增 `control.int` **12c** 與
`asset.int` **6c**（×2 表），**重跑同樣兩個中性化**：N4 **1 紅 → 2 紅**、N5 **0 紅 → 2 紅**。

**還原驗證**：`git status apps/api/prisma/` **空**（6 次暫時編輯逐 byte 還原）·
`prisma migrate status` **7 migrations, up to date**（checksum 未受損，`AD-MigrationChecksum-1`）·
`isms_dev` 全程未被中性化碰到（只影響每次 int run 都重建的 `isms_test`）。

**Drive-through**: ⚪ **無 user-facing surface** → 不適用。
**Verdict**: ✅ **API-level verified against a clean process**。⛔ **不暗示可用性** ——
W01–W06 的零 UI drive-through 記錄不變。

---

## Impact

**解鎖**：`02a` §0 的 Wave 1 shared core 未建數 **-1**（累計 8 → 9 / 35）。
**W05 checklist 2.4 的 🚧 於本 phase 關閉** —— 約束 8 四項對 `AssetGroup` / `Asset` / `Control`
三張表成立，且複合 FK 從「存在」變成「會拒絕」。

**新增的敞口**：本 phase 再新增**三條無稽核的寫入路徑**（`RISK_REGISTER` R4 已更新）。

**約束了什麼**（ADR-0014）：每一張未來「有共用列」的表都跟隨這個形狀；
一張把 `USING` 放寬在單一 `FOR ALL` 下的表是偏離，不是風格選擇。

**沒有做的**：`StatementOfApplicability` · `ControlTest` · `Risk ↔ Control` 連結 ·
`Framework` / `FrameworkControl`（`framework_refs` 本 phase 是字串陣列）·
`applies_to_scope = subtree`（**`02a:217` 已註記為有記錄的偏離**）。

---

## 相關

- **ADR**: [`0014`](../../14-adr/0014-row-level-entity-scope-and-per-command-policies.md)
- **Phase 四件套**: [`W06-m1-control-and-asset-endpoints/`](../../01-planning/W06-m1-control-and-asset-endpoints/plan.md)
- **Design note**: [`W06-row-level-scope.md`](../../02-architecture/design-notes/W06-row-level-scope.md)
- **前一片**: [`CH-020`](./CH-020-w05-asset-and-risk-chain.md)（W05 —— 本 phase 解封了它的 2.4）
- **產生的 AD**: `AD-GroupRowTheft-1` · `AD-ReturningMasksCheck-1` · `AD-SilentFieldDrop-1`
