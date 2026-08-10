# governed-extensions Design Note (Phase W03 extract)

**Purpose**: Spike-extract design note from Phase W03；記錄受治理擴充欄位（ADR-0005）與第一條後端垂直切片已驗證的 runtime invariant
**Created**: 2026-08-10 (Phase W03 Day 4 closeout)
**Phase source**: W03 Day 1–3
**Verified ratio**: 26/27 ≈ 96%
**Status**: Active

---

## 0. Spike Summary

- **Phase scope**: US-1 OQ-6 拍板 · US-2 scoped client 的第一個消費者 · US-3 第一個業務端點 ·
  US-4 約束 8 四項 + 並行汙染 · US-5 closeout
- **驗證期間**: 2026-08-10 ~ 2026-08-10（Day 0–4，單日）
- **Calibration**: bottom-up 19 hr / committed 12.5 hr (mult 0.65) / actual **~4.3 hr**（牆鐘）/ ratio **0.34**
  ⚠️ **與 W02 記錄的 1.10 不可比** —— 兩者的 `actual` 是不同的量，見 retrospective Q2 與 `CALIBRATION-LOG.md`
- **驗證增量**: +45 unit（33 → 78）· +12 integration（20 → 32）· drive-through **N/A（無 UI）**
- **無 user-facing surface** —— 本文件所有結論一律 **API-level verified**，
  **不得**被讀成「使用者可用」

---

## 1. Decision Matrix

決策是：**在地擴充欄位存在哪裡，以及「誰有權宣告一個欄位」由什麼強制**。
`decision-form.md` OQ-6 列的三個選項，在真 schema 上各實測一次後拍板（ADR-0005）。

| Option | 在地欄位可否被治理 | RLS 是否管得到 | 加欄位的代價 | Decision |
|--------|------------------|---------------|------------|----------|
| **A JSONB + 中央 catalog（選定）** | ✅ catalog 是唯一宣告來源，兩層都讀它 | ⚠️ **管不到 JSONB 內容**（`D-jsonb-rls` 實測）→ 故需 trigger | 插一列 catalog | ✅ 選定 —— 見下 |
| B 每個 OpCo 自己的側表 | ⚠️ 治理靠 review 慣例，沒有機械強制 | ✅ 側表本身受 RLS | 建表 + migration | ❌ 否決 —— 這正是設計原則 2 要避免的分叉，只是換了個位置 |
| C EAV（key-value 表） | ✅ | ✅ | 插一列 | ❌ 否決 —— 每次讀 policy 都要 join 一張會長到百萬列的表；且型別只能存字串，驗證退回應用層 |

**選 A 的具體理由**（不是「best practice」）：本專案的擴充是**稀疏且以記錄為單位讀取**的 ——
一份 policy 的在地欄位總是跟那份 policy 一起被讀。JSONB 讓它與記錄同生共死，
而 catalog 把「誰能宣告」這件事集中到一個**本身也是 entity-scoped** 的地方
（`migration.sql:80-83`）。

**選 A 的代價，明說**：`WITH CHECK` 對 JSONB 內容完全無效（§2.1），所以治理必須**額外**
建一層 trigger。B 和 C 不需要這一層。付這個代價換到的是「加一個在地欄位不需要 migration」。

---

## 2. Verified Invariants

### 2.1 US-1 — RLS `WITH CHECK` 看不見 JSONB 內容

- **Implementation**: `apps/api/prisma/migrations/20260810134319_governed_extensions/migration.sql:9-13`
  （這個實測結論被寫進 migration 的頂端註解，因為它是後面 60 行存在的理由）
- **Behavior**: 欄位是 SG1、但 JSONB 內宣稱 `org_entity_id=HK1` 的列，**INSERT 被放行**；
  HK1 之後讀它 `sees=0`（**無讀取洩漏**）。控制組：欄位層級跨實體寫入被 `42501` 拒絕。
- **Verification**: Day 1 五案例 probe（受限角色，前提已斷言）—— 結論逐列轉錄於
  `docs/01-planning/W03-governed-extension-spike/progress.md` Day 0 表格 `D-jsonb-rls` 一列
- **Test fixture**: 一次性 probe，**未進版控**（非常駐測試）；其結論的常駐替身是 §2.2
- **Failure mode**: 若誤以為 RLS 涵蓋 JSONB，擴充欄位治理會**沒有任何一層** ——
  而失敗方向是安靜的（寫得進去、讀得出來、測試全綠）

> ⚠️ **Day 0 據此推論「catalog 驗證是唯一一道防線」，Day 1 推翻了它** ——
> `WITH CHECK` 看不到 JSONB，但 **trigger 看得到**。原文保留於 progress.md 並標註，
> 維持「當時判斷 vs 後來量到」的審計軌跡。

### 2.2 US-1 — 兩層是獨立的，這是量到的不是宣稱的 ⭐

- **Implementation**: 應用層 `apps/api/src/core-model/extension-validator.ts:75-107` ·
  資料庫層 `migration.sql:94-153`（`validate_extensions()` + `policies_validate_extensions` trigger）
- **Behavior**: 兩層讀**同一份 catalog rows**，都不硬編欄位清單，所以不會對「什麼被宣告了」
  產生分歧；型別名對齊 `jsonb_typeof` 的輸出詞彙（`string` / `number` / `boolean`），
  所以不會對「型別叫什麼」產生分歧。
- **Verification**（元驗證，兩個方向各弄壞一次）:

  | 弄壞什麼 | 結果 | 意義 |
  |---|---|---|
  | trigger 中性化 | `npm run test:int -w apps/api` → **3 failed** | 正是那三個繞過 validator 的測試 |
  | validator 中性化 | unit **8 failed** · int **只有 2 failed** | ⭐ 那三個「database refuses」**仍然通過** |

  → **應用層完全失效時，資料完整性仍然成立。**
- **Test fixture**: `apps/api/src/modules/policy/policy.int.spec.ts:123-152`
  （三個案例一律**經 client 而非 repository** 寫入，validator 因此不在路徑上）
- **Failure mode**: 若兩層退化成同一層（例如有人把 trigger 改成信任應用層送來的旗標），
  這三個測試會全部變綠 —— 而**全綠正是它失效的樣子**。這是 ADR-0004 否決選項 C 的
  理由（「無法證明它擋得住任何東西的第二層與註解無異」）在本 phase 的正面對照。

### 2.3 US-2 — `core-model` 取得範疇化 client 的實際形狀（不是 AD 預測的那個）

- **Implementation**: `apps/api/src/core-model/scoped-client.types.ts:52-60`（結構型別宣告）·
  `apps/api/src/core-model/policy.repository.ts:69-100`（消費者）·
  `apps/api/src/modules/policy/policy.controller.ts:78-81`（唯一同時持有兩者的地方）
- **Behavior**: client 以**方法參數**抵達，不是注入的相依。`core-model` 從不認識
  `ScopedPrismaClient` 的真實型別，只認自己宣告的結構形狀。
  ⭐ **repository 沒有自己的 client，所以不存在「忘記範疇化」的程式碼路徑** ——
  沒有東西可以拿來查。
- **Verification**: `npm run lint -w apps/api`（`eslint-plugin-boundaries` 對跨範疇 import 開火）+
  `node scripts/assert-no-scope-bypass.mjs`（17 檔 0 bypass，含 self-test）
- **Test fixture**: `apps/api/src/core-model/policy.repository.spec.ts:52-76`
  （recording double —— 結構型別讓一個純物件就能滿足，無需 PostgreSQL）
- **Failure mode**: 若有人把裸 client 存進 repository 欄位，detector 開火；
  若有人讓 `core-model` import `entity-scope`，boundaries lint 開火並**指名兩個範疇**

> **`AD-ScopedClientDI-1` 預測的三段拆法（token 在 `api` / 型別在 `core-model` /
> 實例由 `entity-scope` 提供）只有後兩段成立。** token 不存在 —— 建它就是零消費者的
> DI token（AP-5 + AP-3）。解封條件是 M4 有真的憑證來源。見 §4。

### 2.4 US-3 — 範疇只能來自憑證，連失敗路徑也不例外

- **Implementation**: `apps/api/src/modules/policy/policy.controller.ts:78-81`
  （`resolve(devPrincipal())` —— 參數清單裡沒有任何 request 來源的東西）
- **Behavior**: 約束 8 鐵律 3。今天的來源是會自我宣告的 dev stub，M4 換成 token 時**改一行**。
- **Verification**: `npm run test -w apps/api`
- **Test fixture**: `apps/api/src/modules/policy/policy.controller.spec.ts:85-101` ——
  斷言的是 **resolver 實際收到的參數**，而不是「沒有把參數接過去」。
  且**故意用一個會 404 的 id**：範疇必須在那之前就已解析完成。
- **Failure mode**: 若有人加了 `?entityId=` 之類的旁路，這個測試會看到多出來的欄位

### 2.5 US-3 — 404 而非 403，讀寫兩條路徑理由不同 ⭐

- **Implementation**: 讀 `policy.controller.ts:89-102` · 寫 `policy.controller.ts:130-134` +
  `apps/api/src/core-model/scope-refusal.ts:66-97`
- **Behavior**: **讀**路徑天然不可區分 —— 範疇化 client 根本沒回傳那一列，
  controller 無從知道它存不存在。**寫**路徑則是資料庫先把兩者收斂成同一個錯誤：

  > 對著跑著的 API 實測三個 POST（不存在的實體 id / 真實但跨實體 / 真實祖先）：
  > **`42501` × 4，`23503` × 0**。Postgres 在 FK 約束之前評估 RLS `WITH CHECK`，
  > 所以不存在的實體 id **根本走不到**那個會告訴呼叫者「它不存在」的約束。

  → 寫入路徑的不可區分性是**資料庫保證的**，不是應用層記得要回一樣的答案。
- **Verification**: `npm run test:int -w apps/api`（案例 **2b**）+
  `npm run test -w apps/api`（`policy.controller.spec.ts:179-199` 斷言兩案例同形）
- **Test fixture**: `apps/api/src/modules/policy/policy.int.spec.ts:101-131`
- **Failure mode**: ⭐ Postgres 升版若翻轉評估順序，案例 2b **紅**。
  不釘的話，這個區別會**悄悄**回來 —— 而 404 vs 500 的差異就是一個可用的 oracle。

### 2.6 US-3 — Cache-Control 的判準，而不是 header

- **Implementation**: `apps/api/src/bootstrap/security.ts:53-78`（判準寫成文字）·
  `:126-131`（中介層）
- **Behavior**:

  > 問題不是「這個端點敏感嗎」，而是「**這個回應是 entity-scoped 嗎**」——
  > 而約束 8 要求每筆業務記錄都是 entity-scoped，所以只要回傳記錄，答案永遠是是。
  > **→ 全域 `no-store, private`，沒有例外清單。**

  例外清單過時的方向是洩漏；沒有清單就沒有這個失效模式。
- **Verification**: `npm run test -w apps/api`（`bootstrap/security.spec.ts` 逐條斷言）+
  Day 3 API 級驗證：**11 個案例全部帶 `Cache-Control: no-store, private`**，含 4xx 回應
- **Test fixture**: `apps/api/src/bootstrap/security.spec.ts`
- **Failure mode**: 若有人加了例外，這是**政策變更**不是設定變更 ——
  `security.ts:53-78` 那段文字是它必須先被改寫的地方

### 2.7 US-4 — 並行範疇不互相汙染（`AD-ScopeConcurrency-1` 的常駐替身）

- **Implementation**: 機制在 `apps/api/src/entity-scope/scoped-prisma.provider.ts`（W02 交付）
- **Behavior**: 兩個不同範疇的 client **交錯** 40 次查詢，每次只見己列。
  交錯而非循序是重點 —— 要排除的失效模式是「同一條 pooled 連線上 A 的範疇被 B 看見」，
  那只在請求重疊時才出現。
- **Verification**: `npm run test:int -w apps/api`
- **Test fixture**: `apps/api/src/modules/policy/policy.int.spec.ts:184-201`
- **Failure mode**: ⚠️ **這是唯一不會拋錯的隔離失效** —— 其餘每一種都表現為 `42501`/`42704`，
  只有這一種表現為「A 的請求看到 B 的列」。逐列斷言（不是只看第一列），
  因為汙染的表現是**多出來一列**。

### 2.8 US-3 — Mock 的誠實：三個入口都擋，boot 就宣告

- **Implementation**: `apps/api/src/modules/policy/dev-principal.ts:54-104`
- **Behavior**: `NODE_ENV=production` 時 `devPrincipal()` / `assertDevPrincipalAllowed()` /
  `warnDevPrincipalActive()` **三者皆拋** `DevPrincipalInProductionError`；
  boot 時 `logger.warn`；每筆回應帶 `_devPrincipal: true` + 說明字串。
- **Verification**: `npm run test -w apps/api`（`dev-principal.spec.ts` 7 項）+
  Day 3 startup log 實際擷取到 `WARN [DevPrincipal] DEV PRINCIPAL ACTIVE`
- **Test fixture**: `apps/api/src/modules/policy/dev-principal.spec.ts:34-47`
- **Failure mode**: CH-012 量過反例 —— 一個「已加上、已測試、測試也通過」的 mock 標記，
  對某一整類案例完全沒生效，而**那個通過的測試認證了這個跳過**。
  所以這裡擋的是**三個入口**而不是一個，且 boot 警告有 runtime 觀測而非只有測試。

---

## 3. Cross-Scope Contracts

| Contract | Owner scope | 登記於 | Signature |
|----------|------------|--------|-----------|
| `ScopedPolicyClient` | `core-model` | `apps/api/src/core-model/scoped-client.types.ts:52-60` | 結構型別；`policy.findMany/create` + `extensionField.findMany` |
| `ScopeRefusedError` | `core-model` | `apps/api/src/core-model/scope-refusal.ts:66-73` | `(orgEntityId: string)` |

⚠️ **兩者都刻意不住在契約層（`api`）**。契約層是葉節點，不能 import generated Prisma 型別 ——
W02 量到的事實，本 phase 的三段拆法據此成形。`docs/rules-on-demand/scope-boundaries.md`
§「範疇化 client 如何抵達 core-model」已於本次 closeout 用量到的形狀取代原本的設計意圖。

---

## 4. Open Invariants（延後，**未驗證**）

- [ ] **DI token（`contracts/scoped-prisma.token.ts`）** — 刻意不建。今天建它就是零消費者的
      DI token（AP-5 + AP-3）。**解封條件：M4 有真的憑證來源**，request-scoped provider
      才有東西可注入。checklist 2.1 標 🚧 未刪。
- [ ] **trigger 的每寫入成本** — 未量。今天資料量是 2 列，`EXPLAIN` 量不出東西。
      → `AD-ExtensionQueryCost-1`
- [ ] **擴充欄位的跨記錄過濾** — 未量。「找出所有 `reviewCycle=annual` 的 policy」今天沒有
      索引支援（JSONB GIN 索引未建）。**M1 有真實查詢需求時才建** —— 現在建是 YAGNI。
- [ ] **pooler 下的行為** — 未驗（`AD-PoolerScope-1`，W02 遺留）。
      本 phase 未引入 pooler，所以既沒驗證也沒推翻。
- [ ] **catalog 欄位的 retire 語意** — `retiredAt` 欄位存在且兩層都過濾它
      （`extension-validator.ts:79`），但**沒有測試涵蓋「retire 一個已被使用的欄位」**
      會發生什麼。既有記錄的該 key 會變成未宣告 —— 讀得出來、改不動。**這是設計待答，不是 bug。**

---

## 5. Rollback / Fallback

- **若此設計後續證明錯**：revert W03 的 5 個 commit +
  `prisma migrate resolve --rolled-back 20260810134319_governed_extensions`
- **估計回滾成本**: ~1 hr。⚠️ **不對稱** —— 已寫入的 `extensions` 內容在 rollback 後
  失去驗證來源（欄位還在，catalog 沒了）。回滾前要先決定那些資料的去向。
- **既有的 fallback 機制**: 有。選項 B（側表）不需要新機制 ——
  它是「每個 OpCo 自己建表」，也就是**不做這件事**的預設狀態。
- **可證偽條件**（ADR-0005 §可證偽條件，本 phase 未觸發任何一條）:
  1. trigger 的每寫入成本 > 5ms → 兩層方案不成立，退回單層 + 更嚴的 review
  2. 出現需要跨記錄過濾擴充欄位的高頻查詢，且 GIN 索引仍不夠 → JSONB 選錯
  3. catalog 的 entity-scoped 設計造成「全域欄位無法由任何應用路徑建立」變成實際障礙
     （今天靠 seed / migration，M1 之後需要管理介面）
  4. 兩層對同一份 catalog 產生分歧 → AP-6 成立，應合併為單層

---

## 6. References

- Phase plan: `docs/01-planning/W03-governed-extension-spike/plan.md`
- Phase progress（含元驗證輸出與 Day 3 API 級驗證）:
  `docs/01-planning/W03-governed-extension-spike/progress.md`
- Phase retrospective: `docs/01-planning/W03-governed-extension-spike/retrospective.md`
- Change record: `docs/03-implementation/changes/CH-018-w03-governed-extensions.md`
- ADR: `docs/14-adr/0005-governed-extension-storage.md`
- 前一份 design note（本文件多處延伸它）: `docs/02-architecture/design-notes/W02-entity-scope-rls.md`
- 相關規則: `docs/rules-on-demand/multi-tenant-data.md` · `docs/rules-on-demand/scope-boundaries.md`

---

## Modification History

- 2026-08-10: Initial extract from Phase W03 closeout (Day 4)
