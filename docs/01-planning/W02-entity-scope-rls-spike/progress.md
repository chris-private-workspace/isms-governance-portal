# Phase W02 Progress — entity-scoping spike

**Plan**: [`plan.md`](./plan.md) · **Checklist**: [`checklist.md`](./checklist.md)

---

## Day 0 — 2026-08-09

### Today's Accomplishments

- 三-prong Day-0 verify 全部執行（Prong 1 / 2 / 3；2.5 為 N/A —— 非前端 phase）
- 承重假設 **D-prisma7-rls 實測成立**，另有 **3 項推翻 plan 的預期**
- 分支 `feature/W02-entity-scope-rls` 已開（base `903ce35`）

### Day 0 — Drift Findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-fieldname** | `org_entity_id` 用於 **`docs/02-architecture/` 的 6 份文件**（`02a:90` · `03:99` · `11:73` · `12:42` · `13:37` · `17:35`）；`entity_id` 只出現在較低權威層（`CLAUDE.md:260-261` · `multi-tenant-data.md` ~20 處 · `schema.prisma:14` · `architecture.md:77`）| 依 CLAUDE.md 權威排序，**`org_entity_id` 勝出**，且它是整個設計文件層的一致慣例而非單一文件用法。待修 3 處 | 🟡 小調整 |
| **D-prisma7-rls** ⭐ | Prisma **7.9.1** 實測六項全過：`$extends` 是 function（**不在 prototype 上，由 Proxy 提供**）· `$extends({query:{$allOperations}})` 可建立 · tx 內 `set_config(…,true)` → `"abc-123"` · **tx 後 → `""`（不洩漏）** | **plan §3.3 的承重假設成立**，`ADR-0001:103` 描述的機制在 7.9.1 上可行。tx 後不洩漏 → transaction-local 對 pooled connection 是安全的 | ✅ |
| **D-failclosed** ⭐ | `current_setting('app.entity_scope')` **不帶 `missing_ok`** 時，未設定 → `ERROR 42704`；**帶 `missing_ok=true`** → `null` → predicate 靜默過濾掉全部 | **fail-closed 不必在 extension 實作** —— PostgreSQL 預設就是。比 plan §3.3 假設的更強：extension 有 bug 漏設 scope 時，**資料庫層仍會拒絕**。兩層獨立成立 | ✅ 簡化 |
| **D-superuser** 🔴 | `docker/compose.yml` 的 `POSTGRES_USER: isms_dev` → `rolsuper=t, rolbypassrls=t`。而 `prisma.service.ts:43` 讀的 `DATABASE_URL` 正是它 | **superuser 繞過 RLS，`FORCE` 也擋不住**（FORCE 解決的是 table owner，不是 superuser）。app 若繼續用這個角色，policy 寫得再完美都無效。**範圍擴大**：compose / `.env.example` / `image-smoke.yml` 都要動 | 🔴 需改 plan §4 |
| **D-forcerls** | 實測：owner + ENABLE（無 FORCE）→ 看得到全部；非 owner + FORCE → 只看得到自己範疇的 1 列 | FORCE 必要但不充分。真正的關鍵是**連線角色本身**（見 D-superuser）| ✅ |
| **D-migration-role** | `prisma.config.ts:11-15` **W01 已預想到這件事**並寫下警語（「an application connecting as owner bypasses row-level security entirely」），但 `prisma.config.ts:47` 與 `prisma.service.ts:43` **現在讀的是同一個 `DATABASE_URL`** | 分離目前只是**結構上的**，不是實際的。要加第二個連線字串 | 🟡 小調整 |
| **D-docsgap** | 我在 plan §3.2 寫「`FORCE RLS` / DB 角色這一塊 `docs/` 零命中，是設計文件的空白」—— **技術上正確但不完整**：W01 已把這個知識寫進 `prisma.config.ts:11-15` 的註解 | 不是「沒人知道」，是**知識只存在於一個 `.ts` 註解裡，沒進設計文件**。與 `AD-ImageDigest-1` 同一種病 | 🟡 修正 plan 措辭 |
| **D-testinfra** | `jest.config.js` 無 `globalSetup` / `setupFiles` / `testTimeout`；`prisma/migrations/` 目錄**不存在**（從未跑過 migration）| 整合測試基礎設施**不存在**，要從零建：測試用 database 隔離 + setup/teardown + timeout。工作量高於 plan §7 的估計 | 🟡 小調整 |
| **D-basefields** | `02a:84-98` 逐項確認：`owner_user_id` 需 User 表（M4）· `extensions` 需 ADR-0005 | 如 plan 預期，兩者延後 | ✅ |
| **D-baselines** | api test **20** · web test **10** · lint **0** · type **0** · build **clean** · coverage **100/78.57/100/100** · run_all **6/6** | 基線已記錄 | ✅ |

### ⚠️ 兩次測試設計缺陷（我自己的，記下來因為它們差點產生錯誤結論）

**第一次 D-forcerls 有兩處無效**：

1. 我預期「FORCE 會擋住連線角色」，實測仍看得到全部 → 我一度以為 FORCE 無效。
   真因是**連線角色是 superuser**，而 superuser 不受任何 policy 與 FORCE 約束。
   我的預期錯了，不是 PostgreSQL 的行為錯了。
2. 測「未設 scope」時我用了 `RESET app.entity_scope` —— 那把參數設回**預設值（空字串）**，
   不是「從未定義」。於是拿到 `0 rows`，看起來像靜默失敗。
   **控制組從未被套用。** 改用全新 session、從未 SET 過 → `ERROR 42704`，fail-closed 成立。

> 這是本 session 第三次遇到同一形狀：**改了設定 / 跑了指令，不等於我以為的狀態真的達成**。
> 前兩次分別是 CH-013 的 openssl 元驗證與 `$extends` 的 prototype 假陰性。
> 三次都靠「去解釋為什麼結果不如預期」才發現，沒有一次是被 gate 抓到的。

### Go / No-Go

**範圍變動 ~15-20%（在邊界上）→ 需使用者確認後才進 Day 1。**

- **擴大**：D-superuser 讓 `docker/compose.yml` · `.env.example` · `.github/workflows/image-smoke.yml`
  進入 File Change List（plan §4 原本只列了 13 項，且明確標 `image-smoke.yml` 為 UNTOUCHED）。
  其中 **compose 與 CI workflow 依 Developer Preferences 屬「改 shared infra / CI-CD」→ 必問**
- **擴大**：D-testinfra —— 整合測試基礎設施要從零建，plan §7 的 bottom-up 未計入
- **縮小**：D-failclosed —— fail-closed 由 PostgreSQL 免費提供，extension 不必自己實作

### Remaining for Next Day

- 使用者 2026-08-09 核可納入 3 個檔案 → plan §3.2 / §4 / §7 / §Risks 已修訂 → Day 1

---

## Day 1 — 2026-08-09

### Today's Accomplishments

- **1.1 Schema** — `OrgEntity` + `Policy` 最小真實子集 — 約 35 分鐘（估 ~60 分鐘）
- **1.2 Migration + RLS + 角色** — 約 40 分鐘（估 ~120 分鐘）
- **1.3 ⭐ RLS 層獨立驗證通過** — 約 30 分鐘（估 ~60 分鐘）

### ⭐ 1.3 的結果 —— 約束 8 的四個範疇測試，在資料庫層全部成立

全程 `psql` 直連，**完全不經應用層**（`07:55` 要求的 critical 那一半）。
角色 `w02_probe`（`rolsuper=f, rolbypassrls=f`，經 `isms_app` 取得權限）：

| # | 測試 | 結果 |
|---|---|---|
| 1 | scope = SG1 | 1 row —— 只看到自己的 |
| 2 | 以 id 直接查 HK1（scope 仍是 SG1）| **0 rows** —— 跨實體讀拒絕 |
| 3 | INSERT 一列到 HK1 | **`ERROR: new row violates row-level security policy`** |
| 4 | UPDATE 把 SG1 的列移到 HK1 | **同一個 ERROR** —— `WITH CHECK` 生效 |
| 5 | scope = SG1,HK1（授權子樹）| 2 rows —— 滾升是加法 |
| 6 | DELETE | **`ERROR: permission denied`** —— 軟刪除是結構性的，不是慣例 |
| 7 | 拒絕之後重讀資料 | 兩列 `org_entity_id` **都是原值** |

第 7 項是刻意的：`multi-tenant-data.md:290-291` 警告「只驗回應碼會漏掉
**回 404 但資料被改了**」。只斷言 ERROR 不夠，要證明資料真的沒動。

### 關鍵設計決定（都寫進 migration 註解，供 design note extract）

- **RLS 與建表同一個 migration** —— 分開會留下一個「列已存在但未受保護」的窗口
- **`WITH CHECK` 不可省** —— 只有 `USING` 的話，INSERT 可以把列塞進別的實體，
  UPDATE 可以把列搬過去。測試 3/4 就是它
- **`current_setting` 不帶 `missing_ok`** —— Day-0 D-failclosed 的直接應用
- **不 GRANT DELETE** —— guardrail 3 要軟刪除。**收回權限讓它變成結構性的**，
  而不是一條要靠人記得的慣例
- **`isms_app` 是 NOLOGIN 群組角色、無密碼** —— 權限集合進版控（可 review），
  實際登入帳號由環境建立並 GRANT membership。guardrail 7：原始碼中無密鑰
- **`org_entities` 不上 RLS** —— 它*定義*範疇，被範疇過濾會使階層與子樹滾升無法解析
  （`multi-tenant-data.md:61` 的全域表白名單）

### 意外 / 卡住

- 無。Day-0 把承重假設全部先驗過，Day 1 沒有撞到意料外的東西 ——
  這正是 `day0-plan-verify.md` 宣稱的 ROI

### Notes

- 種子資料（5 個 org_entity + 2 個 policy）目前是**手動塞進 `isms_dev` 的臨時資料**。
  Day 3 的自動化測試要有自己的 fixture，不依賴這批
- `w02_probe` 是臨時登入角色。正式的 app 角色由 **1.2b** 的 `docker/compose.yml` 建立

### 1.2b — 受限 app 角色（範圍擴大的部分）— 約 50 分鐘（估 ~120 分鐘）

```
isms_app       f/f/f/f   ← 群組角色（NOLOGIN、無密碼、進版控）
isms_app_user  f/f/f/f   ← login role（密碼由環境提供）
isms_dev       t/t/t/t   ← bootstrap superuser（migration 用）
```

用 `isms_app_user` 實連驗證：`is_super=f` · scope=SG1 → 1 row ·
scope=SG1,HK1 → 2 rows · `DELETE` → `permission denied`。

**一個沒預料到的順序問題**：PostgreSQL 的 `/docker-entrypoint-initdb.d/` 只在
資料目錄**為空時**執行，也就是在 migration **之前** —— 所以 init script 想 GRANT
`isms_app` 群組時，那個群組還不存在（它由 migration 建立）。

解法是把兩邊都寫成條件式：init script 只建 login role，**migration 用
`IF EXISTS` 授予 membership**。兩條路徑（新 volume / 既有 volume）收斂到同一個狀態。

**既有 volume 永遠不會跑 initdb**，所以另加 `npm run db:app-role`。
⭐ 本機正是既有 volume，所以我**實際走了 fallback 那條路**建立角色 ——
不是寫完指令就當它會動。

**`image-smoke.yml` 加了一道前置斷言**：連線前先查 `pg_roles`，
不是 `super=f bypassrls=f` 就 `::error::` 並 exit 1。
沒有它的話，角色設定壞掉時這一步會**靜靜退回成用 superuser 跑**，而 job 照樣全綠 ——
那正是本專案已經出現六次的形狀。

### Day 1 Gate

```
lint 0 · type-check 0 · lint:negative PASS · api test 20（baseline 不變）
build clean · run_all 6/6 · prisma validate 🚀 · migrate deploy applied
```

### 意外 / 卡住

- Day 1 本體無意外 —— Day-0 把承重假設全驗過了，這正是 `day0-plan-verify.md` 宣稱的 ROI
- 1.2b 的 initdb 順序問題是唯一的意外，已解且成本低

### Notes

- 種子資料（5 org_entity + 2 policy）是**手動塞的臨時資料**。Day 3 的自動化測試
  要有自己的 fixture，不依賴這批
- ⚠️ **新發現，尚未處理**：`prisma migrate deploy` 至今只在**已有資料的 `isms_dev`**
  上跑過，**從未在乾淨資料庫上跑過** —— 與 CH-013 的「Dockerfile 從未被 build 過」
  同一形狀。Day 3 在 CI 建整合測試環境時會自然覆蓋它，屆時確認

### Remaining for Next Day

- Day 2：client extension（承重）+ 所有權移轉 + 授權子樹解析

### Notes

- 探測腳本全部寫在 scratchpad 或用完即刪，**未進 repo**
- D-forcerls 用**獨立 database**（`w02_day0_probe` / `w02_probe2`）實測，用完 `DROP`，
  全程未碰 `isms_dev` 的資料。teardown 已驗證

---

## Day 2 — 2026-08-09

### Today's Accomplishments

- Client extension（承重）寫成並**用編譯後的生產類別對真 PostgreSQL 驗過**
- 所有權移轉：`PrismaService` 不再是 client，`entity-scope` 成為唯一查詢面
- 授權子樹解析（materialised path 前綴比對）+ `EntityScope` branded type
- 🔴 **推翻一項 Day-0 結論** —— 見下方 D-failclosed-2，並補一個 migration 修正它

### Task 時間

| Task | Actual | Est |
|---|---|---|
| 2.0 承重形狀量測（3 輪 probe）| ~55 min | ~30 min |
| 2.1 `scoped-prisma.provider.ts` | ~40 min | ~90 min |
| 2.2 所有權移轉（含 health / app.module 連帶）| ~35 min | ~45 min |
| 2.3 `entity-scope.resolver.ts` + 測試 | ~45 min | ~60 min |
| 2.4 fail-closed migration（計畫外）| ~25 min | — |

### 🔴 D-failclosed-2 — Day-0 的結論只在「從未被 scope 過的連線」上成立

Day-0 記的是：不帶 `missing_ok` 的 `current_setting` 未設定時 `ERROR 42704`，
所以 **fail-closed 由 PostgreSQL 免費提供**，`extension 不必自己實作`，
`兩層獨立成立`。據此 §7 還**減了 0.5 hr**。

Day 2 量到那句話的邊界：

```
virgin 連線，從未 scope 過        -> ERROR 42704        ← Day-0 量到的那個
同一連線跑過一次 scoped query 後  -> 0 rows，無錯誤     ← Day-0 沒量到的那個
```

`set_config(…, true)` 的**值**是 transaction-local，但**「這個參數存在」不是** ——
COMMIT 之後參數仍在，值為空字串。於是 `current_setting` 不再 raise，
`string_to_array('', ',')` 得到空陣列，`= ANY('{}')` 濾掉每一列。

**production 的 pooled 連線從第二個請求起全部處於後者。**
失敗形態因此不是「query 報錯」，而是「這個 OpCo 沒有 policy」——
`multi-tenant-data.md:207-210` 指名不得發生的那一種。

**處置**：新增 migration `20260809171812_entity_scope_fail_closed`，
policy 改走 `app_entity_scope()` 函式，把「未設定」與「空」都變成 `42501` 例外。
psql 三案例實測：

```
從未設定       -> ERROR unrecognized configuration parameter "app.entity_scope"
設為空字串     -> ERROR app.entity_scope is not set  (HINT: 必須走 extension)
設為 SG1       -> 1 row
```

Day-0 減掉的 0.5 hr 因此**還回來**，且「兩層獨立成立」現在是**設計出來的**，不是撿到的。

### 承重量測（三輪，全部在 scratchpad，未進 repo）

| 量測 | 結果 |
|---|---|
| `$transaction([set_config, query(args)])` 是否同一 tx | ✅ **120 次交錯 scoped 讀（pool max 1 與 10）→ 0 錯** |
| tx 後 scope 是否外洩 | ✅ 讀回 `''`，不帶到下一個請求 |
| 頂層 `$allOperations` 是否也攔 raw | ✅ `scoped.$queryRaw` 看得到 scope |
| `org_entities` 在 scoped 狀態下可讀 | ✅ 5 筆（全域表，無 policy）|
| 跨實體 INSERT / UPDATE | ✅ 兩者皆 `42501 new row violates row-level security policy` |

### ⚠️ 第一輪 probe 是**假的全綠**，而且是最危險的那種

第一輪十二項**全部通過**，包含「跨實體寫應該被拒」那幾項 —— 它們沒被拒。
原因：`.env`（本機、未追蹤）仍是 W01 的單一角色 URL，探測整輪**以 superuser 連線**，
RLS 全程未生效。Day 1 只改了 `.env.example`；`.env` 不在版控裡，從沒被改。

代價是真的：probe 8 把 SG1 的 policy **搬到了 HK1**，probe 7 在 HK1 插了一列。
兩者都已還原（`git` 管不到資料，是我用 owner 角色手動修的）。

> **若我沒跑這一輪，而是直接寫 provider 加測試 —— 測試會全綠，而且證明不了任何事。**
> 這是本 session 第四次遇到「改了設定 ≠ 我以為的狀態達成」。

**處置**：探測腳本自己先斷言前提（`rolsuper=f, rolbypassrls=f`，否則 abort）。
`.env` 已補齊兩個 URL。

### ⚠️ 第二輪的結論也是錯的（但錯在我的斷言）

第二輪報「80 次交錯讀 → 40 次污染」。看起來像 extension 洩漏。
實際是 probe 9 留下的一列還在 SG1，所以每次 SG1 查詢回 **2** 列而我斷言 `length === 1`。
40 個「污染」全部是 `want=SG1, got=[SG1, SG1]` —— **沒有一次跨實體**。

第三輪加了 premise check（先確認每個實體剛好 1 列，不成立就 abort）後重測 → 0 錯。

> 兩輪連續踩到同一件事：**前提沒被斷言的測量，不管結果是綠是紅都不可採信。**

### 設計決策（非架構級）

- **`EntityScope` 用未匯出的 symbol brand** —— 其他模組沒有那個名字，就造不出這個型別。
  鐵律 3「scope 只能來自憑證」因此是**編譯錯誤**而不是 review 意見。
  TS 一開始拒絕我自己的 cast，那正是它在生效
- **`PrismaService` 不再 `extends PrismaClient`** —— 改為持有 `connection` + `probe()`。
  之前任何 injector 都離「未範疇化查詢」只有一個屬性存取；現在 `connection` 是**唯一
  具名的入口**，Day 3 的 detector 可以講規則而不是列白名單
- **`runScoped` 抽成獨立函式** —— 不是為了抽象，是為了讓「set_config 先、且在同一個 tx」
  這件事能被單元測試斷言（雙重身份記錄 `$transaction` 收到什麼）
- **health 改用 `probe()`** —— health 沒有 principal 也就沒有 scope，是唯一合法的無 scope
  資料庫存取。收窄成具名方法讓這個豁免**可數**，而不是散在外面的一個 `$queryRaw`

### Plan deviation（R3）

plan §4 未列的三個檔案進入變更：`health.module.ts` · `health.service.ts` · `app.module.ts`
（加上三個對應 spec）。原因是 2.2 的所有權移轉**強制**health 換掉相依 ——
plan 起草時假設 core-model 會留下可注入的東西，實際上沒有。
另加 plan §4 未列的第二個 migration（D-failclosed-2）。

### Day 2 Gate

```
lint 0 · type-check 0 · lint:negative PASS · format:check clean
api test 33（baseline 20，+13）· web test 10 · build clean · run_all 6/6
migrate deploy: 20260809171812_entity_scope_fail_closed applied
```

### ⭐ 用編譯後的生產類別驅動真 PostgreSQL（不是單元測試，也不是 probe）

單元測試用的是替身，probe 用的是我手寫的 pattern —— **生產程式碼是那個 pattern 的轉寫，
而轉寫不是量測**。所以額外跑一輪：`require('./dist/...')` 取真的
`PrismaService` / `EntityScopeResolver` / `ScopedPrismaFactory`，對真 DB、受限角色：

```
1  own entity read              -> ["SG1 access control policy"]
2  cross-entity read by id      -> null
3  cross-entity write           -> 42501 new row violates row-level security policy
4  roll-up SG subtree           -> SG1 only（不含 HK1）
5  roll-up APAC                 -> both
6  unscoped via connection      -> 42501 app.entity_scope is not set   ← 不是 []
7  factory with empty scope     -> EntityScopeError（未觸及 DB）
8  resolver with unknown code   -> EntityScopeError
9  拒絕後 HK1 policy 仍在 HK1   -> HK1
10 全樹總列數                    -> 2（沒有被塞進去的列）
```

⚪ **無 UI → 本 phase 一律 gate-only verified**，上表不得被讀成「使用者可用」。

### 意外 / 卡住

- 兩輪前提錯誤的量測（見上），共約 25 分鐘。**兩次都不是被 gate 抓到的**
- `prettier` 對 `entity-scope.resolver.spec.ts` 有格式差異，`--write` 修掉

### Remaining for Next Day

- Day 3：整合驗證（把上面那 10 項變成會在 CI 跑的測試）+ 旁路 detector + 元驗證
- ⚠️ 上面那輪 drive 是**一次性腳本**，不在 CI 裡 —— 在它變成測試之前，
  它證明的是「今天成立」，不是「明天不會壞」

### Notes

- 探測與 drive 腳本全部在 scratchpad，**未進 repo**
- 種子資料仍是手動塞的臨時資料；Day 3 的測試要有自己的 fixture
- `.env` 已補 `DATABASE_URL_MIGRATE` 與 app 角色 —— **`.env` 不在版控，
  其他機器 clone 後仍要自己照 `.env.example` 補**
