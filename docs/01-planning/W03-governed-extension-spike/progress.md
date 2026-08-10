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
