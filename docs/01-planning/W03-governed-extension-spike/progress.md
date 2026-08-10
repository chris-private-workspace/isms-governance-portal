# Phase W03 Progress

## Day 0 — 2026-08-10 — Plan-vs-Repo Verify

### Drift Findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-proc-freshness** | api 進程 PID 36976 啟動於 `2026-08-09 19:30:13`，而 `dist/entity-scope/*.js` 的 mtime 是 `2026-08-09 23:50:16` —— **進程比它要執行的產物早 4h20m**。web 進程 PID 36748 啟動於 `2026-08-08 20:54`，早於 W01 交付 | 這兩個進程的**任何 runtime 觀測都不可採信**。Day 3 的 clean restart 不是可選項。⚠️ W02 記錄的是「舊 4h10m」——**幾乎是同一個進程，當時發現後並沒有真的被換掉**（Risk Class C 第 3 次）| 🟡 已知風險 → plan §8 已有一行；Day 3.1 處理 |
| **D-scopefn-shape** | `app_entity_scope()` 回傳 **`uuid[]`** 不是 `uuid`；policy 實為 `org_entity_id = ANY (app_entity_scope())`；scope 從 `app.entity_scope` 讀**逗號分隔**的 uuid 清單。函式為 `STABLE` + `SECURITY INVOKER` | plan 起草時憑記憶假設單一 uuid，probe 因此第一輪失敗。**repository 的 scope 是多值**，並行測試要用不同的 **id 集合**而非單一 id。§3.2 具體化，未推翻 | 🟡 小調整 |
| **D-jsonb-rls** ⭐ | 五案例實測（受限角色，前提已斷言）：**CASE1** 欄位 SG1 + JSONB 內宣稱 `org_entity_id=HK1` → **INSERT 被放行**；**CASE2** SG1 讀得回；**CASE3** HK1 `sees=0`（**無讀取洩漏**）；**CASE4** 欄位層級跨實體寫入 → `violates row-level security policy`（控制組成立）；**CASE5** scope 帶兩個 id → 滾升正常 | ⭐ **`WITH CHECK` 完全不管 JSONB 內容**。好消息：不造成讀取洩漏。壞消息：**catalog 驗證必須在寫入路徑，而且是唯一一道防線** —— entity scoping 有 RLS 當第二層，擴充欄位治理沒有。直接回答 `06:35` 留白的 "validation approach"，並成為 ADR-0005 的可證偽條件與 §Security impact 素材 | 🟢 §3.1 未被推翻，**被具體化**。⚠️ **本列「唯一一道防線」的推論已於 Day 1 被推翻**（trigger 看得到 JSONB）—— 見 Day 1 段。**原文保留不改**，維持「當時判斷 vs 後來量到」的審計軌跡 |
| **D-probe-setup** | 第一輪 probe 的 `CREATE POLICY` 因型別不符而失敗，留下一張 **FORCE-RLS 但無 policy** 的表（＝全部拒絕）。`CASE2 sg1_sees=0` / `CASE3 hk1_sees=0` **看起來像結果，實際什麼都沒證明** | **前提斷言必須涵蓋 setup，不只角色**。第二輪加入 `SETUP ok: policy present` 才有效。這是「前提沒被斷言的測量，綠紅都不可採信」的**第 2 次**（W02 第 1 次是殘留 fixture 汙染斷言）| 🟢 已修正；教訓進 retro |
| **D-scopedclient-split** | `scope-boundaries.md:120-128` **仍寫著**「型別住在契約層」的設計意圖，並自承「尚未跑過……**驗證失敗則本節與上表都要重寫**」。W02 已量到它做不到（契約層是葉節點，不能 import generated Prisma 型別）| W03 Day 2 就是那個驗證。**已加一條 Day 4 checklist 項**：用量到的三段拆法取代該節的設計意圖文字 | 🟢 已納入 checklist |
| **D-schema-claims** | `schema.prisma:95-104` 的 8 個刻意缺欄清單與 plan §0 **逐項一致**；`Policy` 全欄位確為 scalar；`extensions` 標註 `needs ADR-0005, not adopted` | plan §0 的 Root cause 表無需修正 | ✅ |
| **D-adr5-tendency** | `06:18` "JSONB for governed extensions" · `06:35` "JSONB + central field catalog; **validation approach**" —— 逐字確認 | spike 要驗的是**留白的那一半**（validation），不是重開方案比較。§3.1 的定位正確 | ✅ |
| **D-env-role** | int 測試的 global-setup 印出 `[int] isms_test rebuilt, migrated and seeded; app role isms_app_user is least-privilege.`；probe 亦實測 `isms_app_user super=false bypassrls=false` | **測試連線與 probe 連線的角色前提皆成立**。⚠️ **dev server 的連線角色尚未驗** —— 待 Day 3.1 clean restart | 🟡 部分 |
| **D-baselines** | lint 0 · type-check 0 · format 0 · unit **33**（cov 95.95/82.35/88/96.29）· web **10** · int **20** · **build 0** | 與 plan §0 宣稱**逐項一致**，無需修訂 | ✅ |

### Prong 1 — Path verify

全部符合預期：`contracts/` 與 `modules/` 僅有 `.gitkeep`；`core-model/` 僅 `prisma.service.ts` + spec；
`docs/14-adr/0005-*` 不存在（0002/0003/0005 皆無）；`design-notes/` 僅 W01/W02；
**`CH-018` 未被佔用**（grep 全 repo 的 `CH-\d+` 引用，非 `ls` 目錄 —— `AD-ChNumber-1`）。

### Go / No-Go

**GO —— 範圍變動 < 20%。**

- `D-jsonb-rls` **具體化**了 §3.1（catalog 驗證的位置從「待定」變成「必須在寫入路徑且是唯一防線」），
  但沒有推翻它 —— §5 Acceptance 與 §7 Workload 皆不需修訂
- `D-scopefn-shape` 是 probe 寫法的修正，不影響交付物
- `D-proc-freshness` 已在 plan §8，Day 3.1 有對應 checklist 項
- `D-scopedclient-split` **增加**一條 Day 4 checklist 項（文件同步），不增加設計工作

### Today's Accomplishments

- 0.1 三-prong Day-0 verify — 9 個 drift 全部有結論（3 個 ✅ · 4 個 🟢 · 2 個 🟡）
- 0.2 Branch `feature/W03-governed-extension`（從 `main` `5bbc252`）
- 額外：`D-jsonb-rls` 的五案例實測（原 checklist 只要求「最小實測」，實際做成了可直接進 ADR 的證據）

### Issue / Discovery

⚠️ **本 phase 承諾的「逐日計時」（`AD-TimeTracking-2`）在 AI 執行下做不到。**
工作由 AI session 執行，我沒有牆鐘可讀，逐項工時**無法由我自行量測** ——
W02 的 12.1 hr 也是從 commit 時間戳回推的。這使 `AD-TimeTracking-1/2` 的可行性存疑：
它們要求的資料在目前的執行模式下**只能回推，不能量測**。
**Day 4 retro 要正面處理這一條**，而不是再記一次「這次也沒計時」。

### Remaining for Day 1（Day 0 當下的規劃 —— 實際結果見下方 Day 1 段）

- 1.1 三方案最小實測（`D-jsonb-rls` 已完成其中最關鍵的一項 —— catalog 範疇歸屬與
  「第二次呼叫」案例仍待做）
- 1.2 ADR-0005 起草與採納

### Notes

- probe 腳本保留在 scratchpad，**未進版控**（一次性量測，非常駐測試）。
  其結論已完整轉錄到本檔 `D-jsonb-rls` 一列
- `isms_dev`（compose 的 `POSTGRES_USER`）是 **superuser 且 bypassrls** ——
  compose.yml 註解已警告。所有 RLS 實測一律 `SET ROLE isms_app_user` 後進行

---

## Day 1 — 2026-08-10 — OQ-6 三方案實測 → ADR-0005

### 量測結果（受限角色 `isms_app_user`，前提與 setup 皆已斷言）

| Q | 問題 | 結果 | 對 ADR 的意義 |
|---|------|------|--------------|
| **Q1** | `CHECK` constraint 能否查 catalog 表？ | ❌ `ERROR: cannot use subquery in check constraint` | **靜態 constraint 出局** —— catalog 是動態資料，CHECK 看不到它 |
| **Q2** | trigger 能否查 catalog 並拒絕？ | ✅ CASE-C（借用 HK1 的 key）與 CASE-D（未宣告的 key）**皆被 `23514` 擋下** | ⭐ **catalog 驗證可以有 DB 層第二道防線** |
| **Q3** | trigger 內的 catalog 讀取是否被 RLS 過濾？ | trigger 為 **`INVOKER`**；CASE-E `hk1_catalog_rows=2`（全域 1 + 自己 1）| catalog 的 RLS 與 trigger 相容，不需要 `DEFINER`（後者會以 owner 身分跑，是提權面） |
| **Q4** | 單一 catalog 能否同時服務全域與 per-entity 欄位？ | ✅ nullable `org_entity_id` + policy `IS NULL OR = ANY(scope)`：全域 key 通過、自己的 key 通過、**別人的 key 被擋** | **D-catalog-scope 有答案了**：不必二選一 |
| **Q5** | `app_entity_scope()` 第二次呼叫行為一致？ | CASE-F `first=1 second=1`；CASE-G（已被 scope 過的連線、未設 scope 的新 tx）→ **`app.entity_scope is not set`** | ⭐ W02 補的 `app_entity_scope()` **fail-closed 在第二次呼叫仍成立** —— `AD-Day0Scope-1` 要求的「第二次呼叫案例」已覆蓋 |

### ⭐ 這推翻了 Day 0 的一個推論

Day 0 的 `D-jsonb-rls` 記著「catalog 驗證**必須在寫入路徑，而且是唯一一道防線**」。
**那句話是錯的。** 正確的是：**RLS 看不到 JSONB，但 trigger 看得到** ——
catalog 驗證可以有 DB 層背書，正如 entity scoping 有 RLS。

兩者的差別在於**誰寫表達式**：RLS policy 是靜態表達式（因此看不到動態的 catalog），
trigger 是程式（因此可以查表）。Day 0 從「RLS 不管 JSONB」跳到「DB 完全幫不上忙」，
**跳過了 trigger 這一格**。

### ⚠️ 本輪 probe 的輸出瑕疵（要記，因為它差點造成相反結論）

`Q1` 的 `ALTER TABLE ... ADD CONSTRAINT` 失敗後，緊接的
`SELECT 'Q1 UNEXPECTED: CHECK with subquery was accepted'` **仍然印了出來** ——
它不在 transaction 內，而 `\set ON_ERROR_STOP off` 讓 psql 繼續執行下一句。

CASE-C / CASE-D 沒有這個問題，因為它們在 `BEGIN...COMMIT` 內，
錯誤讓整個 transaction abort，後續語句被忽略。

> **通則**：`ON_ERROR_STOP off` 之下，**非交易語句**的失敗不會阻止後面那句「宣告成功」的訊息。
> 斷言式的探測腳本，每個 case 都要包在 transaction 裡，否則失敗與成功會印出同一段文字。
> 這是「證據要真的支持結論」在本 phase 的第 2 次（Day 0 的 `D-probe-setup` 是第 1 次）。

### Today's Accomplishments

- 1.1 三方案最小實測 —— Q1-Q5 全部有結論；`D-catalog-scope` 與 `AD-Day0Scope-1`
  要求的「第二次呼叫」案例一併覆蓋
- 1.2 ADR-0005 起草與採納（見 `docs/14-adr/0005-governed-extension-storage.md`）

### Notes

- probe 腳本留在 scratchpad，**未進版控**（一次性量測）。結論已完整轉錄至上表
- **效能未量**：trigger 每次寫入要對每個 JSONB key 查一次 catalog。今天資料量是個位數，
  量不出東西 —— 與 `AD-ScopeFnCost-1` 同樣的狀況，寫成 ADR-0005 的可證偽條件

---

## Day 2 — 2026-08-10 — Scoped client DI + repository

### ⭐ 三段拆法的實際形式，與 AD 預測的不同

`AD-ScopedClientDI-1` 記的是「token 在 `api`、型別在 `core-model`、實例由 `entity-scope` 提供」。
讀 `eslint.config.mjs` 的 MATRIX 之後，實際可行的形式更簡單：

| 事實 | 出處 |
|---|---|
| `core-model: ['api', 'core-model']` —— 不能 import `entity-scope` | `eslint.config.mjs` MATRIX |
| **generated Prisma client 被歸類為 `core-model`**（`apps/api/src/generated/**`）| 同上 ELEMENTS |
| `api: ['api']` —— 契約層是葉節點，**不能**名 Prisma 型別 | 同上 |
| `modules` 可同時 import `core-model` 與 `entity-scope` | 同上 |

→ **core-model 宣告它需要的結構型別**（`ScopedPolicyClient`），實例由 `modules` 層傳入。
沒有 token、沒有 provider、兩個方向都不跨界。同樣手法一個範疇之外已經用過：
`scoped-prisma.provider.ts:60` 的 `ScopeCarrier` 就是結構宣告，好讓測試 double 能替身。

**token 刻意不建**（checklist 2.1 標 🚧）：它需要 provider，provider 需要 per-request scope，
per-request scope 需要憑證來源 —— 那是 M4。今天建 = 零消費者的 token = AP-5 + AP-3，
而 `AD-ScopedClientDI-1` 自己就寫著這句話。

### 元驗證：boundaries 真的在擋

在 `policy.repository.ts` 暫時加 `import { ScopedPrismaFactory } from '../entity-scope/…'`：

```
error  There is no policy allowing dependencies from elements of type
       "core-model" to elements of type "entity-scope"   boundaries/dependencies
lint_exit=1
```

→ 還原後 lint=0。**錯誤訊息指名了兩個範疇**，符合 CLAUDE.md 的宣稱。

### Migration：Prisma 拒絕產生，原因是一個既有 drift

`prisma migrate dev --create-only` 失敗：

```
The migration `20260809075152_entity_scope_spike` was modified after it was applied.
We need to reset the "public" schema
```

W02 把 RLS 手寫進那個 migration（CH-014 明記「同一個 migration」），套用後檔案又被改過，
本機 `isms_dev` 的 checksum 因此不符。

**未 reset，也不需要**：整合測試對全新的 `isms_test` 跑 `migrate deploy`
（`int-global-setup.js:56-61` DROP/CREATE/migrate），而 `deploy` **不做 drift 檢測** ——
migration 的正確性由它驗證。migration 目錄與 SQL 因此手寫。
⚠️ **本機 dev DB 的 migration 歷史仍不一致**，Day 4 記入 BACKLOG。

### Migration 驗證：測試通過只證明「沒壞」

20/20 整合測試通過只說明既有行為未受影響。新物件是**直接查目錄**確認的：

| 物件 | 實測 |
|---|---|
| `extension_fields` | `rls=true forced=true` |
| catalog policy | `USING = (org_entity_id IS NULL OR = ANY(app_entity_scope()))` |
| catalog policy | `WITH CHECK = (org_entity_id = ANY(app_entity_scope()))` —— **刻意窄於 USING** |
| trigger | `policies_validate_extensions on policies args=policy` |
| partial unique | `extension_fields_global_key` + `extension_fields_entity_key` |
| 欄位 | `extensions jsonb NOT NULL default '{}'` |

**USING 寬於 WITH CHECK 是設計而非疏漏**：讀得到全域宣告（否則沒人能用），
但**不能替全體宣告全域欄位** —— 那不是單一 OpCo 有權做的事。

### ⚠️ 我又犯了 `AD-GrepAssertion-1`（第 7 次）

跑 gate 時寫了 `npm run lint:negative -w apps/api 2>&1 | tail -3; echo "negative=$?"` ——
`$?` 抓到的是 **`tail` 的退出碼**，不是 npm 的。npm 其實報了
「script 不存在」（`lint:negative` 在**根目錄** package.json，不在 `apps/api`），
而我印出了 `negative=0`。

同一個 phase 內第 3 次「證據不支持結論」（Day 0 `D-probe-setup`、Day 1 Q1 的
transaction 外 SELECT、本次）。**共同結構：拿一個便宜的代理指標去回答需要看真實輸出的問題。**
修法：`cmd >/dev/null 2>&1; echo $?`，不要 pipe 之後再取 `$?`。

### Today's Accomplishments

- 2.0 schema（`Policy.extensions` + `ExtensionField`）+ migration（DDL + 兩個 partial unique
  + catalog RLS + trigger，**同一個 migration**）
- 2.1 `core-model/scoped-client.types.ts` —— 結構型別（token 標 🚧）
- 2.2 `policy.repository.ts` · `extension-validator.ts` + 兩個 spec

### Gate

lint 0 · type-check 0 · format 0 · **unit 48**（baseline 33 → **+15**）·
coverage **96.99/88.23/91.17/97.29**（baseline 95.95/82.35/88/96.29，四項全升）·
`extension-validator.ts` 與 `policy.repository.ts` 皆 **100%** ·
int 20 · build 0 · `run_all` 6/6 · `lint:negative` PASS · `assert-no-scope-bypass` PASS（13 檔 0 旁路）

### Remaining for Day 3

- ⛔ **需先確認範圍**：`/policies` endpoint 的 scope 從哪來？今天沒有 identity（M4），
  而約束 8 鐵律 3 規定 scope **只能**來自憑證／session。三個選項待使用者拍板，見下方

---

## Day 3 — 2026-08-10 — 第一個業務端點 + 整合驗證

### 交付

| 項 | 內容 |
|---|---|
| 3.2 | `GET /policies` · `GET /policies/:id` · `POST /policies`（`:id` 是 404-not-403 的載體）|
| 3.2 | **Cache-Control 政策**（關 `AD-CacheControl-1`）—— 見下 |
| 3.3 | 約束 8 四個範疇測試，**透過 repository 而非直接用 client** |
| 3.4 | 並行範疇汙染常駐測試（關 `AD-ScopeConcurrency-1`）—— 40 次交錯，逐列斷言 |
| 3.5 | 元驗證 ×2 —— 見下 |
| — | `dev-principal.ts`（使用者拍板選項 B）+ 兩個新 spec |

### `AD-CacheControl-1`：判準而不是 header

`16:22` 要的是「敏感回應 `no-store, private`」。難的是**判準**：逐端點決定就要維護一份清單，
而清單過時的方向是洩漏。本專案採用的規則（`security.ts` §CACHE_CONTROL）：

> 問題不是「這個端點敏感嗎」，而是「**這個回應是 entity-scoped 嗎**」——
> 而約束 8 要求每筆業務記錄都是 entity-scoped，所以只要回傳記錄，答案永遠是是。
> 不是 entity-scoped 的只有不含記錄的回應（`/health`、OpenAPI schema），
> 而快取一個存活探測的價值是負的。
> **→ 全域 `no-store, private`，沒有例外清單。**

### ⭐ 元驗證：兩層是獨立的，這是量到的不是宣稱的

| 弄壞什麼 | 結果 |
|---|---|
| **trigger 中性化**（註解掉 `CREATE TRIGGER`）| int **3 failed** —— 正是那三個繞過 validator 的「database refuses」測試。exit=1 |
| **validator 中性化**（開頭 `return`）| unit **8 failed** · int **只有 2 failed** |

**第二列是本 phase 最有價值的一個觀測。** validator 完全死掉時，int 只紅 2 個而不是全部 ——
那三個「database refuses」**仍然通過**，因為 trigger 還在擋。

→ **應用層完全失效時，資料完整性仍然成立。** 這是 ADR-0005 宣稱的「兩層形狀」的直接證據，
不是從設計推論出來的。ADR-0004 否決選項 C 的理由正是「無法證明它擋得住任何東西的第二層
與註解無異」—— 這一層證明得出來。

### 踩到的三個坑

1. **測試間污染（Risk Class A 變體）**：`policy.int.spec.ts` 是**第一個會寫入的 suite**，
   第一次跑就讓 W02 的 `entity-scope.int.spec.ts` 紅了 —— 它斷言 SG1 的精確列表。
   `maxWorkers: 1` 決定順序，**但不會撤銷寫入**。修法：寫入的 suite 必須在 `afterAll`
   **retire 自己建的列**。⚠️ 只能軟刪除 —— `isms_app` 沒有 DELETE 權限（guardrail 3），
   **那是設計在起作用**：能硬刪的測試等於用了應用程式沒有的權限。

   > 🔴 **這一段的修法只成立了一半，PR #31 的 CI 才揭露。** 見下方「Day 4（續）」。
   > 原文保留不改 —— 當時的判斷與後來量到的差距本身就是紀錄。
2. **全域 catalog 欄位無法用 scoped client 建立** —— `WITH CHECK` 要求 `= ANY(scope)`，
   而全域欄位的 `org_entity_id` 是 NULL。這**不是 bug 是設計**（替全體宣告不是單一 OpCo
   有權做的事），實際後果是 seed 必須走 owner 連線。⚠️ `int-global-setup.js` 因此被修改，
   **它不在 plan §4 的檔案清單內** —— deviation 記於此。
3. ⚠️ **`AD-GrepAssertion-1` 我在本 phase 犯了 3 次**（Day 2 一次、Day 3 兩次）：
   `cmd 2>&1 | tail -N; echo $?` 抓到的是 **`tail` 的退出碼**。
   其中一次讓我把「type-check 失敗（`npm error code 2`）」讀成 `type=0`。
   **修法已內化為習慣**：`cmd >/tmp/f 2>&1; echo $?`，或 `${PIPESTATUS[0]}`。

### Gate（逐項退出碼，全部不經 pipe）

`lint 0 · type-check 0 · format 0 · test:cov 0` —— unit **67**（baseline 33 → **+34**）·
coverage **92.82/88.88/91.48/93.41** · int **31**（baseline 20 → **+11**）· web 10 ·
`build 0` · `lint:negative 0` · `run_all 0`

### 🚧 3.1 Clean restart —— 未做，需使用者許可

port 3210（api，起於 08-09 19:30）與 3200（web，起於 08-08 20:54）的進程
**是使用者開的，不是本 session**。`local-runtime-ops.md:70` 規定撞到陌生進程要
**先停下來問**，`:94` 規定「重啟本身也是破壞性動作，先回報不要自動重啟」。

**因此本 phase 至今為 `gate-only verified`，且沒有任何 runtime 觀測** ——
Day 0 已證明那兩個進程比 `dist` 舊 4h20m，所以對它們 curl 得到的任何結果都不可採信。

---

## Day 3（續）— 2026-08-10 — Clean restart 與第一次 runtime 觀測

**使用者許可殺掉 3210 的 api 進程**（3200 web 依建議不動 —— 本 phase 不碰前端）。

### 3.1 Clean restart — 完成

進程鏈追到底：`bash 24332 → bash 49456 → npm 21728 → cmd 16380 → node 36976`。
`dist/bootstrap/main.js` 的 mtime 是 `08-10 14:31`，而該進程起於 `08-09 19:30` ——
**比它宣稱在跑的產物舊 19 小時**（Day 0 記的是 4h20m，之後 dist 又被重建過）。

殺完逐項驗：port 3210 **無 listener**；repo 內存活的 node 只剩 web 的兩個（3200）。
另外三個專案的進程（azurite · playwright MCP · `ai-enterprise-knowledge-solution-project` 的 3001）
**全程未動**。

startup log 的三行證據：

```
LOG  [InstanceLoader] PolicyModule dependencies initialized
LOG  [RouterExplorer] Mapped {/policies, GET} · {/policies/:id, GET} · {/policies, POST}
WARN [DevPrincipal] DEV PRINCIPAL ACTIVE — /policies is scoped by a hard-coded
     assignment (SG1), not by any credential. This must not reach a deployed environment.
```

第三行是 `dev-principal.spec.ts` 那個「boot 時宣告而不是靜靜啟動」的斷言**在真 runtime 的對應物**。

### 前置：dev DB 缺 W03 的前提

`isms_dev` **從未套用過 `20260810134319_governed_extensions`** —— int 測試每次重建自己的
`isms_test`，所以整個 Day 2-3 沒有任何東西會發現 dev DB 落後。`migrate deploy` 補上，
並用 owner 連線 seed 4 筆 catalog（2 全域 + SG1 + HK1，形狀同 int seed）。

> 這本身是一個訊號：**「int 綠」不涵蓋「開發者的資料庫可用」**。兩者用不同的資料庫，
> 而只有其中一個會自我修復。

### ⭐ Drive-through 抓到 67 unit + 31 int 全部沒抓到的缺陷

| 案例 | 修正前 | 修正後 |
|---|---|---|
| A 列表（範疇只來自 dev principal）| 200 · 只見 SG1 一列 | 同 |
| B 範疇內單筆 | 200 | 同 |
| C 真實但跨實體的 id | **404** | 同 |
| D 從未存在的 id | **404**（與 C 逐字同形）| 同 |
| E 全域 key + 自有 key | 201 · `extensions` 原樣回存 | 同 |
| F 未宣告 key | 422 · 帶 `key` | 同 |
| G 型別不符 | 422 · `expects number but got string` | 同 |
| H **借用 HK1 宣告的 key** | 422 · `not declared` | 同 |
| **I 跨實體寫入** | 🔴 **500 Internal server error** | ✅ **404 `org entity <id> not found`** |
| J 缺 title | 400 | 同 |
| 全案 | `Cache-Control: no-store, private` | 同 |

**I 的根因**：RLS 以 `42501` 拒絕（資料**確實沒落地** —— 重讀 HK1 仍只有原本一列），
但 `policy.controller` 沒有翻譯這個錯誤，直接讓它冒成 500。

**為什麼 gate 抓不到**：`policy.int.spec.ts` 案例 2 斷言的是 **repository 層**
（`rejects.toThrow()`），從未經過 controller；而 controller 的 unit spec 有一條
「不吞不是呼叫者錯的錯誤」—— 範疇拒絕就落在那條的「不是呼叫者的錯」裡。
**兩邊各自都對，缺的是它們之間那一段。**

### 修正前先量，而不是先假設 ⭐

直覺修法是「把 42501 映成 404」。但那要先回答一個問題：
**不存在的實體 id 會不會走到 FK violation（23503）而得到不同的答案？**
若會，這個「修正」會親手造出 404 vs 500 的 oracle —— 正是約束 8 禁止的那個。

實測（對著跑著的 API，三個 POST）：

```
42501 (RLS WITH CHECK) blocks : 4
23503 (FK violation)   blocks : 0
```

> **Postgres 在 FK 約束之前先評估 RLS `WITH CHECK`** —— 不存在的實體 id 根本走不到
> 那個會告訴呼叫者「它不存在」的約束。**寫入路徑上「不存在」與「不是你的」不可區分，
> 是資料庫保證的，不是應用層記得要回一樣的答案。**

修正前三個案例（不存在 / HK1 / SG 祖先）都是 500，修正後都是 404 且**逐字節同形**，
差異只有呼叫者自己送進來的 id。log 中未處理的 42501 堆疊：**4 → 0**。

這條排序事實已釘成常駐測試（`policy.int.spec.ts` 案例 **2b**）——
不釘的話，下次 Postgres 升版把順序翻回去，這個區別會**悄悄**回來。

### 這次修改的檔案

| 檔案 | 範疇 | 內容 |
|---|---|---|
| `core-model/scope-refusal.ts` | `core-model` | **NEW** —— `ScopeRefusedError` + `isScopeRefusal()`（結構式找 SQLSTATE，不比對訊息文字：訊息隨語系與版本變，SQLSTATE 不變）|
| `core-model/scope-refusal.spec.ts` | `core-model` | **NEW** —— fixture 是**從真 log 轉錄的**錯誤形狀，不是想像的形狀；含 5 條「必須不匹配」|
| `core-model/policy.repository.ts` | `core-model` | create() 翻譯 42501；其餘錯誤原樣拋出 |
| `core-model/policy.repository.spec.ts` | `core-model` | +2：翻譯成立 / outage 不被吞 |
| `modules/policy/policy.controller.ts` | `modules` | `ScopeRefusedError` → 404 |
| `modules/policy/policy.controller.spec.ts` | `modules` | +2：404 且訊息不得出現 scope/denied/forbidden；兩案例同形 |
| `modules/policy/policy.int.spec.ts` | `modules` | 案例 2 強化為 `toBeInstanceOf`；**新增 2b** 釘住 RLS-before-FK |

⚠️ **這 7 個檔案不在 plan §4 清單內** —— deviation 記於此。它們是 3.1 的 Verify
（drive-through）找出的、3.2 交付物自身的缺陷，屬於把 3.2 做完，不是新範圍。

### Gate（修正後重跑，逐項退出碼，不經 pipe）

`lint 0 · type-check 0 · format 0 · test:cov 0` —— unit **78**（Day 3 的 67 → **+11**）·
coverage **93.69/90.21/92/94.32**（branch 88.88 → **90.21**）· int **32**（31 → **+1**）·
`build 0` · `lint:negative 0`（17 檔 0 bypass）· `run_all 6/6`

### 驗證層級（誠實標記）

| 層 | 狀態 |
|---|---|
| Gate | ✅ 全綠 |
| Curl / probe | ✅ 11 個案例 + 3 個 oracle 探測 |
| **Drive-through（真 UI）** | ⚪ **N/A —— 本 phase 無 user-facing surface**。上表是**真進程 + 真 PostgreSQL + 真 RLS**，不是 UI |

→ 收尾措辭：**API-level verified against a clean process**。**不寫「可用」** ——
沒有人透過 UI 用過它，因為還沒有 UI。

### 環境還原

drive-through 建的 2 筆 policy 已 **retire**（軟刪除，與 domain 同語意）；
`GET /policies` 回到原本的單列。HK1 全程只有原本那一列 —— **沒有任何東西被種進去**。

---

## Day 4（續）— 2026-08-10 — PR #31 的 CI 抓到本機抓不到的兩件事

六個 required check：**四個安全掃描全綠**，`gates` 與 `映像 build + 啟動探測` 紅。
兩者性質完全不同。

### 🔴 ① `gates` — Day 3 記的污染修法**只成立了一半**

`entity-scope.int.spec.ts:69` 多看到一列 `"governed extensions accepted"`。

**兩層根因，缺一不會發生**：

1. **軟刪除擋不住沒有過濾的查詢** —— `afterAll` 確實 retire 了自己建的列，但
   `entity-scope.int.spec.ts:69` 呼叫的是 `policy.findMany()`，**沒有 `retiredAt` 過濾**，
   retired 的列照樣回來。`PolicyRepository.list()` 有過濾，所以 `policy.int.spec.ts` 自己看不到 —— 
   **修法在自己的 suite 裡看起來有效**。
2. **jest 的檔案順序本機與 CI 不同** —— 冷快取依檔案大小、暖快取依上次執行時間。
   本機剛好 `entity-scope` 先跑，CI 是 `policy` 先跑。**同一個 commit，一邊綠一邊紅。**

**真正的缺陷其實在斷言本身**：`toEqual(['SG1 access control policy'])` 除了隔離之外，
還斷言了「沒有其他 SG1 列」—— 那是 **fixture 記帳，不是隔離性質**，而測試名稱
（"sees its own entity and nothing else"）從來沒有宣稱過它。

修法：斷言改成測試名稱一直在宣稱的那件事 —— **每一列都屬於 SG1，且 HK1 那列不在其中**。

**驗證用的是失敗的那個順序**，不是本機順序：

```
npx jest --config jest.int.config.js --runTestsByPath \
  src/modules/policy/policy.int.spec.ts \
  src/entity-scope/entity-scope.int.spec.ts \
  src/entity-scope/rls-direct.int.spec.ts
→ 32 passed, exit 0
```

失敗對照組不需要另外製造 —— **CI run `31367293849` 就是**。

→ `AD-JestFileOrder-1`

### ⭐ ② `映像 build + 啟動探測` — 不是 bug，是守衛正確開火

容器 log（`docker logs`，非推論）：

```
DevPrincipalInProductionError: dev-principal was reached with NODE_ENV=production.
Entity scope must come from a credential (CLAUDE.md 約束 8 鐵律 3);
this stub is a development affordance and must be removed at M4.
```

`apps/api/Dockerfile:94` 設 `ENV NODE_ENV=production` → `PolicyModule.onModuleInit()` →
`warnDevPrincipalActive()` 拋錯 → Nest init 失敗 → 程序死 → 探測 ECONNREFUSED。

> **這個 gate 是唯一會用「部署時的組態」執行真實產物的地方。**
> 本機 78 個 unit + 32 個 int **全部跑在 `NODE_ENV=test`**，
> Day 3 的 clean restart 跑在 `NODE_ENV=development`。
> 沒有任何一項會碰到這條路徑 —— 而它剛好是 production 唯一會走的那條。

**守衛是對的**：今天唯一的範疇來源是寫死的 SG1，讓它在 production 起來就是把
一個資料隔離事故部署出去（約束 8：隔離失敗不是一般 bug，是合規事故）。

但**一個永遠不會綠的 required check 會擋住所有 PR 到 M4** —— 那比沒有這個 check 更糟，
因為它會訓練人忽略它、或逼人把它關掉。

**使用者拍板（2026-08-10）：改 gate，正反兩面都驗。**

| Step | 斷言 |
|---|---|
| `Run api container` + `Probe api` | `-e NODE_ENV=development` → **必須起得來並服務 `/health`**（保住 CH-013「產物真的能啟動」的證明）|
| **`拒絕在 production 啟動（負面案例）`**（新增）| 不覆蓋 NODE_ENV → **必須退出**，且理由必須是 `DevPrincipalInProductionError` |

負面 step 把三種結果分開判，因為意義完全不同：

- **仍在執行** → 守衛沒開火（最危險：production image 會起來並服務）
- **退出碼 0** → 乾淨結束，不是拒絕
- **退出且理由對** → 通過

⚠️ **先看結構性訊號（`docker wait` 的退出碼），成立之後才 grep log 找理由** ——
兩個獨立訊號，不是拿一段格式化文字當唯一證據（`AD-GrepAssertion-1`）。

⚠️ **`job.name` 逐字未動**（`映像 build + 啟動探測`）—— 它是 branch protection 的
required context，比對是逐字的（`AD-CheckNameCoupling-1`）。已用 js-yaml 解析後印出確認。

**解封條件寫進 step 的輸出裡**：M4 提供真的憑證來源之後，這一步要改成「production 必須起得來」。

### 這是 `AD-NegativeGate-1` 的第 6 個負面 gate

而且它**幾乎是免費的** —— 行為本來就存在，只是從來沒有人在部署組態下執行過產物。
前 5 個：boundaries fixture · i18n parity · 安全標頭逐條 · build 產物能啟動 · RLS 真的在擋。

### Gate（修正後本機重跑）

`lint 0 · type-check 0 · format 0 · run_all 6/6` · int **32**（本機順序）·
int **32**（**強制 CI 順序**）· YAML 解析 OK 且 `job.name` 未變
