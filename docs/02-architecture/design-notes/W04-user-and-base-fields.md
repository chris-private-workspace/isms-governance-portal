# user-and-base-fields Design Note (Phase W04 extract)

**Purpose**: Spike-extract design note from Phase W04；記錄 `User` 的範疇語義（ADR-0012）與一張業務表「完整形狀」的已驗證 runtime invariant，供 M1 slice 2..N 複製
**Created**: 2026-08-10 (Phase W04 Day 4 closeout)
**Phase source**: W04 Day 0–3
**Verified ratio**: 22/23 ≈ 96%
**Status**: Active

---

## 0. Spike Summary

- **Phase scope**: US-1 `User` 欄位規格 · US-2 範疇語義拍板 · US-3 `users` 表 ·
  US-4 `Policy` base fields + 發號 · US-5 元驗證 · US-6 closeout
- **驗證期間**: 2026-08-10（Day 0–4，單日）
- **Calibration**: bottom-up 9 hr / committed 5.9 hr (mult 0.65) / actual **4.79 hr**（牆鐘）/
  ratio **0.81** —— ⭐ **spike class 的第 3 個資料點，且是第一個與前一個以同一定義量測的**
- **驗證增量**: +8 unit（78 → 86）· +2 integration（32 → 34）· drive-through **N/A（無 UI）**
- ⚪ **無 user-facing surface** —— 本文件所有結論一律 **API-level verified**，
  **不得**被讀成「使用者可用」

> **本 phase 交付的是形狀不是數量。** M1 有 35 個實體，這裡建了 1 個（`User`）+
> 補完 1 個（`Policy`）。判準是「其餘 32 張表能不能複製而不用重新設計」——
> §2 的每一節就是那份可複製清單。

---

## 1. Decision Matrix

決策是：**`users` 有沒有 `org_entity_id`**。它決定 RLS policy 的錨點，
所以不是「先選一個之後再改」的東西 —— 改它等於改 32 張表的 FK 語義。

| Option | 旗艦場景（區域 ISO 跨 13 OpCo）可否表達 | RLS 涵蓋 | 今天的消費者 | Decision |
|--------|--------------------------------------|---------|------------|----------|
| **A 全域，無 `org_entity_id`（選定）** | ✅ scope 掛在 role assignment 上，一個人可跨多個 OpCo | ❌ **不涵蓋** —— 誰可列舉使用者是 M4 的應用層決定 | — | ✅ 選定 —— 見下 |
| B Entity-scoped（`org_entity_id NOT NULL`）| ❌ **表達不出來** —— 跨實體使用者需要拆表或加 join 表 | ✅ 免費 | — | ❌ 否決 —— 它讓 M8 的旗艦場景在資料模型層就不可能 |
| C 全域 + `user_entity_scope` join 表 | ✅ 且 scope 顯式、可稽核 | ✅ join 表本身受 RLS | ⛔ **零**（M4 才有真憑證）| ❌ 否決 —— AP-5，與 W03 拒建 DI token 同一形狀 |

**選 A 的具體理由**（不是「best practice」）：`03:31` 明訂 user 的 scope 來自 **role assignment**，
而 `03:23` 列舉「every **domain record**」時（risk / control / policy / asset）**不含 `User`**。
換句話說，把 `entity_id` 放到人身上是把 assignment 的屬性搬到主體上 —— 一個人可以有多個 assignment。

**選 A 的代價，明說**（ADR-0012 §Consequences）：**一張全域的人員表在構造上就是跨實體可讀的**。
RLS 對它沒有意見，所以「一個實體的管理員能不能知道其他實體有哪些使用者存在」
變成 M4 的應用層問題 —— 那是**四條可證偽條件裡最可能開火的一條**，且它**在 M4 開火，不是更晚**。

### ⭐ 這個決定改的是規則的分類，不是加一個例外

`multi-tenant-data.md` 原本只有兩類：業務資料（範疇化）/ 參考資料（全域，五類列舉）。
`users` 兩者皆非 —— 那五類**全部沒有個資**，identity **有**。

處置是把 **identity 立為第三類**（`docs/rules-on-demand/multi-tenant-data.md:67-79`），
不是在參考資料清單尾巴加第六列。差別在於：**加一列是記一個例外，改分類是讓下一個人自己就能判斷。**
同一節導出一條查詢規則：**join `users` 只能加欄位，永遠不能加列**（`:78-79`）——
任何「從 `users` 出發去撈業務資料」的查詢都是 scope-bypass 的形狀。

---

## 2. Verified Invariants

### 2.1 US-2 — `users` 全域，而**發號的 counter 不是** ⭐

- **Implementation**: `apps/api/prisma/schema.prisma:99-134`（`User`，無 `org_entity_id`，
  docstring 承載豁免理由）· `:136-162`（`RefCodeCounter`，**有** `org_entity_id`）·
  `prisma/migrations/20260810185500_user_and_base_fields/migration.sql:128-141`
- **Behavior**: 兩張同一天建的表，一張刻意無 RLS、一張刻意有。判準不是「新表要不要 RLS」，
  而是「**這張表上的一次寫入，跨實體時是不是一件該被拒絕的事**」：
  替別的實體發號**是**，記錄一個人的存在**不是**。
- **Verification**: `npm run test:int -w apps/api`（`policy.int.spec.ts:264`
  "refuses to issue a code for an entity outside the scope"）
- **Test fixture**: `apps/api/test/int-global-setup.js:62`（users seed）·
  `:180-183`（counter **由 policies 導出**，不寫死）
- **Failure mode**: ⚠️ 若有人「順手」替 `users` 加上 RLS，ADR-0012 就是被推翻了，
  其記錄的回滾代價適用（`migration.sql:128-130` 明寫這句話）。
  反方向更危險 —— 若有人替新表**省掉** RLS 並引用 `users` 當先例，
  那正是 §1 的第三類分類要防止的誤讀。

### 2.2 US-4 — 序號由資料庫在**一個語句**內配發

- **Implementation**: `apps/api/src/core-model/ref-code.ts:97-110`
  （`upsert` + `{ increment: 1 }` → 單一 `INSERT … ON CONFLICT DO UPDATE … RETURNING`）
- **Behavior**: 兩個並發呼叫者在 counter 那一列上序列化，而不是各自讀到同一個值。
  ⚠️ **應用層的 read-then-write 在單執行緒測試裡看起來一模一樣**，只在真實負載下才失敗 ——
  所以本 phase 欠的是一個**會嘗試製造重號**的測試，不是一個「跑起來沒事」的測試。
- **Verification**: `npm run test:int -w apps/api`（`policy.int.spec.ts:241`
  "issues forty contending reference codes with no collision"）
- **Test fixture**: `apps/api/src/modules/policy/policy.int.spec.ts:241-263` ——
  40 個**各自獨立交易**的並發呼叫；斷言是**全部唯一且連續**。
  ⭐ **連續是關鍵**：gap 代表遺失的配發，而 UNIQUE 索引**抓不到 gap**。
- **Failure mode**（元驗證實測）: 把 `{ increment: 1 }` 換成固定值 → int **2 failed**，
  含 `policy.int.spec.ts` 的 size 斷言。**重號會被抓到。**

### 2.3 US-4 — 發號在插入之前，驗證在發號之前

- **Implementation**: `apps/api/src/core-model/policy.repository.ts:102-121`
  （`validateExtensions` → `issueRefCode` → `client.policy.create`）
- **Behavior**: 兩個獨立的排序保證，理由不同：
  - **validate 先於 allocate** —— 被拒絕的 payload 不燒號（一個 typo 一個號）
  - **allocate 先於 insert** —— counter 是 entity-scoped，所以跨實體寫入
    **在這裡**就被 RLS 拒絕，policy 那一列根本沒被嘗試（`:114-116`）
  ⚠️ 兩者不在同一個交易裡，所以中途失敗會在序號上留 gap。**這是被接受的** ——
  `02a` 要求 `ref_code` 唯一且穩定，從未要求連續（`:107-112` 明寫理由）。
- **Verification**: `npm run test -w apps/api`
  （`policy.repository.spec.ts:145` "does not burn a reference number when validation rejects the payload"）
  + Day 3 API 案例 #11（422 之後 `last_seq=2, policies=2`）
- **Test fixture**: `apps/api/src/core-model/policy.repository.spec.ts:134-159`
  （recording double —— 無需 PostgreSQL）
- **Failure mode**: 若有人把 `issueRefCode` 提到 `validateExtensions` 之前，
  `:145` 那個測試會紅；若有人把它移到 `create` 之後，跨實體拒絕點會回到 policy insert，
  §2.4 那個保證的位置隨之改變。

### 2.4 US-2 — 拒絕點移動了，而 oracle 防護在新位置重新成立 ⭐

- **Implementation**: 拒絕現在發生於 `ref-code.ts:97-110` 的 counter upsert
  （W03 時發生於 `policy.repository.ts:123` 的 policy insert）
- **Behavior**: Day 3 對真進程實測 —— 跨實體的實體 id 與**根本不存在**的實體 id，
  兩者的 HTTP 回應**除 id 外逐字相同**（404 + 同一個訊息形狀）。
  RLS 仍在 FK 之前評估，所以「不存在」走不到那個會洩漏它不存在的約束。
- **Verification**: `npm run test:int -w apps/api`（`policy.int.spec.ts:117`
  "2b. a nonexistent entity id is refused the same way as a real out-of-scope one"）
  + Day 3 API 案例 #5 / #6
- **Test fixture**: `apps/api/src/modules/policy/policy.int.spec.ts:117-130`
- **Failure mode** ⭐ **本 phase 最有價值的一次量測**：把 counter 的 RLS 中性化
  （`USING(true) WITH CHECK(true)`）→ int **2 failed**，而**那兩個不是同一件事的兩個症狀**：
  1. `:264` —— SG1 成功發出 `PRB-HK1-000001`（能替別人發號，直接證據）
  2. `:117` —— **W03 寫的 2b**，因為**錯誤型別改變**（`ScopeRefusedError` → `PrismaClientKnownRequestError`）

  > **counter 的 RLS 失效讓「不存在」與「不是你的」重新變得可區分。**
  > W04 的發號路徑成了 W03 那個保證的一部分，而在寫它的時候沒有任何東西記錄這件事 ——
  > 這是元驗證產出**新知識**而非確認已知的一次。

### 2.5 US-4 — `ref_code` 永不由呼叫者提供

- **Implementation**: `apps/api/src/core-model/ref-code.ts:55-72`
  （`IssueRefCodeInput` **沒有**任何接受成品 code 的參數）· `schema.prisma:188-194`
- **Behavior**: unique 索引在 RLS **底下**執行，所以一次碰撞會對一個完全看不見 HK1 的 principal
  回答「`POL-HK1-000007` 存在嗎」。伺服器端發號讓那個問題**問不出來**。
- **Verification**: `npm run test -w apps/api`
  （`policy.repository.spec.ts:134` "stamps a ref_code the caller had no way to supply"）
- **Test fixture**: `apps/api/src/core-model/policy.repository.spec.ts:134-144`
- **Failure mode**: 若有人替 `CreatePolicyInput` 加上 `refCode?`，這個測試不會自動紅 ——
  ⚠️ **它斷言的是 repository 蓋的章，不是介面沒有那個欄位**。這是本 note 唯一一個
  **靠型別而非測試守住**的不變式。

### 2.6 US-4 — 回填與 counter 是同一個變更，不是兩個

- **Implementation**: `prisma/migrations/20260810185500_user_and_base_fields/migration.sql:73-93`
- **Behavior**: `ref_code` 先加為 nullable → 依 `(org_entity_id, created_at, id)` 回填 →
  `SET NOT NULL`。**接著立刻**用 `SELECT count(*) … GROUP BY org_entity_id` 播種 counter。
  ⭐ 跳過播種是那個微妙的失敗：counter 從 0 起算，下一次發號撞上回填的 `000001`，
  unique violation，而**呼叫者什麼都沒做錯**。
- **Verification**: Day 3 API 案例 #2（空 counter 起算 → `POL-SG1-000001`）·
  `npm run test:int -w apps/api`（seed 走同一條導出邏輯，`int-global-setup.js:180-183`）
- **Test fixture**: `apps/api/test/int-global-setup.js:77`（註解明寫 counter 由這些列導出）
- **Failure mode** ⭐ **Prisma 生成的 DDL 是錯的**：`ADD COLUMN "ref_code" TEXT NOT NULL`
  在任何**已有列**的表上直接失敗。今天恰好成功，因為 `isms_dev` 剛 reset、`isms_test` 每次重建 ——
  **那正是讓錯誤形式看起來正確的條件**（`migration.sql:60-65` 記錄了這件事）。

### 2.7 US-3 — schema 層的權限，以及它為什麼能藏這麼久 ⭐

- **Implementation**: `prisma/migrations/20260810215500_grant_schema_usage/migration.sql:32`
- **Behavior**: `GRANT USAGE ON SCHEMA public TO isms_app`，**不給 `CREATE`**（`:28-30`）——
  能 DDL 的角色也能 drop 掉約束它的 RLS policy。
- **Verification**: 手動（可重現）——
  `psql -c "SELECT has_schema_privilege('isms_app_user','public','USAGE'), has_schema_privilege('isms_app_user','public','CREATE')"`
  → 修正後實測 `true / false`；修正前 `false / false`。
- **Test fixture**: ⚠️ **沒有**。這是本 note 唯一沒有常駐測試的不變式，而**原因本身就是結論**：
  CI 的資料庫用 `CREATE DATABASE`（從 template1 複製）建起來，**免費繼承**這個權限，
  所以任何跑在 CI 上的測試都無法區分「已授予」與「繼承到」。
- **Failure mode**: 缺這個 GRANT 時**每一個端點回 500**，而 lint / type / unit / int /
  build / `run_all` / `lint:negative` **全部是綠的**。
  ⭐ 這是本專案第 7 個「綠燈涵蓋範圍比讀者以為的窄」的實例（`AD-NegativeGate-1` 家族），
  也是第一個**根因在測試環境與開發環境的建置方式差異**上的。→ `AD-DbBuildPathParity-1`

---

## 3. Cross-Scope Contracts

| Contract | Owner scope | 登記於 | Signature |
|----------|------------|--------|-----------|
| `ScopedRefCodeClient` | `core-model` | `apps/api/src/core-model/scoped-client.types.ts:78-84` | 結構型別；`refCodeCounter.upsert` + `orgEntity.findUnique` |
| `ScopedPolicyClient` | `core-model` | `apps/api/src/core-model/scoped-client.types.ts:60` | **繼承** `ScopedRefCodeClient`（W03 的形狀未變，只是長出父介面）|

⚠️ **拆成兩個介面而不是把 counter 併進 `ScopedPolicyClient`**（`:73-77` 記錄理由）：
發號器會被**每一個**業務 repository 使用，而它們各自需要的 delegate 不同。
把發號需要的兩個 delegate 獨立宣告，讓 slice 2 的 repository 直接 `extends ScopedRefCodeClient`，
而不是複製一份 policy 專用的形狀。

---

## 4. Open Invariants（延後，**未驗證**）

- [ ] **`user.repository.ts`** — 刻意不建。ADR-0012 拍板 `users` 為全域無 RLS 表後，
      「第二個範疇化 client 消費者」這個理由不成立，且今天零消費者（無端點、無 UI）= AP-5 + AP-3。
      **解封條件：M4**（真憑證來源 + 使用者管理需求）。checklist 2.2 標 🚧 **未刪**。
- [ ] **誰可以列舉 `users`** — **未決，且 RLS 答不了**。ADR-0012 的第一條可證偽條件，
      **在 M4 開火**。今天沒有任何端點讀 user，所以這個敞口是理論的而非實際的。
- [ ] **`ref_code` 的 prefix 縮寫** — ⚠️ **兩處不一致**：`02a:89` 用 `RISK`，
      設計交付物 `03:110` 的樣本用 `RSK-0987`（**兩段而非三段**）。判定**以 `02a` 為準**
      （資料模型的權威），但**縮寫本身從未被規格化** → 目前由各 repository 自宣告
      （`policy.repository.ts` 的 `REF_CODE_PREFIX`），歧義**刻意保持可見**而非在此發明一份登記表。
- [ ] **`status` 的轉換** — **沒有被任何東西擋住**。enum 是真的，狀態機（`02a:300-312`）
      在 **M5** 才成為約束。`schema.prisma:171-175` 明寫這句話，因為「有 status 欄位」
      很容易被讀成「workflow 已存在」（AP-3）。
- [ ] **稽核軌跡** — ⚠️ **本 phase 新增的寫入路徑同樣沒有稽核**（M3 / `RISK_REGISTER` R4）。
      `created_by` / `updated_by` 欄位存在但**永遠是 NULL** —— 因為今天沒有憑證來源，
      而填一個佔位使用者會讓 M3 的稽核問題**用謊話被回答**（`policy.repository.ts:129-133`）。
- [ ] **counter 在真實負載下的爭用** — 未量。40 個並發是**正確性**測試不是**效能**測試；
      同一個 (entity, type) 的所有寫入序列化在一列上，代價未測。

---

## 5. Rollback / Fallback

- **若此設計後續證明錯**：revert W04 的 commit +
  `prisma migrate resolve --rolled-back 20260810215500_grant_schema_usage` +
  `… 20260810185500_user_and_base_fields`
- **估計回滾成本**: ~1 hr。⚠️ **不對稱且比 W03 更嚴重** ——
  drop `users` 會使 `Policy` 的三個 FK 失去標的；已回填的 `ref_code` 依 `02a:104` 是**穩定**的，
  重跑回填不保證產生同一組號（`created_at` 相同時靠 `id` 決勝，而 `id` 是 uuid）。
  **回滾前要先決定既有 `ref_code` 的去向。**
- **既有的 fallback 機制**: 有，但代價明確。選項 B（entity-scoped `users`）不需要新機制 ——
  它只需要一個 `ALTER TABLE ADD COLUMN org_entity_id`，**但它讓 M8 的旗艦場景表達不出來**，
  所以「回退到 B」不是回滾，是換一個產品決定。
- **可證偽條件**（ADR-0012，本 phase 未觸發任何一條）:
  1. ⭐ 一個實體的管理員不得知道其他實體有哪些使用者存在 → 需要 `user_entity_scope` 或視圖層過濾
  2. 出現「同一個人在不同實體有不同身分屬性」的需求 → 全域單列不成立
  3. 法規要求使用者記錄本身依管轄區隔離 → 分類第三類需重審
  4. `users` 的跨實體可讀性造成實際的隱私事件 → A 選錯

---

## 6. References

- Phase plan: `docs/01-planning/W04-m1-user-and-base-fields/plan.md`
- Phase progress（含 Day 0 漂移表、Day 3 API 級驗證 11 案例與元驗證輸出）:
  `docs/01-planning/W04-m1-user-and-base-fields/progress.md`
- Phase retrospective: `docs/01-planning/W04-m1-user-and-base-fields/retrospective.md`
- Change record: `docs/03-implementation/changes/CH-019-w04-user-and-base-fields.md`
- ADR: `docs/14-adr/0012-user-scope-semantics.md`
- 資料模型規格（`User` §3.2 + §0 索引列）: `docs/02-architecture/02a-data-model-spec.md`
- 前一份 design note（本文件多處延伸它，特別是 §2.4）:
  `docs/02-architecture/design-notes/W03-governed-extensions.md`
- 相關規則: `docs/rules-on-demand/multi-tenant-data.md`（**本 phase 修改了它的鐵律 1**）

---

## Modification History

- 2026-08-10: Initial extract from Phase W04 closeout (Day 4)
