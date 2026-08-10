# Phase W04 Progress

**Phase**: W04 — M1 slice 1: the shape every table copies
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W04-m1-user-base-fields`

---

## Day 0 — 2026-08-10 — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-globaltable** | ⭐ **`users` 不在合法全域表清單上。** `multi-tenant-data.md:57-67` 列出五類（`org_entities` · `frameworks`/`framework_controls` · `threat_library`/`vulnerability_library` · `jurisdictions`/`regulations` · `risk_scales`），`:67` 明訂「這五類以外要新增全域表，**必須在 PR 描述中舉證**」，`:374` 的 checklist 重述同一要求 | D1 選 A（全域）需要**三件事**而非 plan §3.1 寫的一件：(a) ADR 承載理由 · (b) **PR 描述舉證**（plan 未提，這是規則指定的位置）· (c) **更新那張清單本身**，否則下次讀清單的人會判 `users` 為違規 | 🟡 小調整 → plan §8 加一行 |
| **D-detector-scope** | ⭐ **旁路 detector 的 allowlist 是「檔案層級」不是「表層級」。** `assert-no-scope-bypass.mjs:76-85` 的 `ALLOW` 映射的是「哪個**檔案**可以用 `$queryRaw` / `.connection` / `new PrismaClient`」，**沒有全域表的概念**。先例：`entity-scope.resolver.ts` 讀 `org_entities`（無 RLS 的全域表）被 allowlist 為 `unscoped-connection` | `users` 若無 RLS，`user.repository.ts` 要嘛**進 ALLOW**（detector docstring `:21-22` 明寫「每加一筆就是保證不成立的又一個地方」），要嘛**用範疇化 client 查一張沒有 RLS 的表**。⛔ Day 1 D1 拍板時必須連這個一起決定，否則 Day 2 才會撞到 | 🟡 需在 Day 1 一併決定 |
| **D-allowlist-count** | **`assert-no-scope-bypass.mjs:20` docstring 說 "The allowlist is **four** entries"，實測輸出 `3 allowlisted`**（`ALLOW` 有 3 個 Map 條目、6 個 file-rule 配對 —— 都不是 4） | orphan claim（AP-7）。⛔ **不逕行改** —— 依 `AD-EslintSettingsClaim-1` 與 `AD-OpensslClaim-1` 的先例：只知道「今天是 3」，不知道「W02 當時是幾個」，改掉等於用猜測取代紀錄 → 記 BACKLOG | 🟢 記錄，不當場修 |
| **D-userfk-comment** | `schema.prisma:101` 註解寫 `` `owner_user_id` — needs a User table (M4) `` | 本 phase 建了 `User` 之後這句就是 orphan claim。Day 2 補欄位時**必須同時更新該註解區塊**（plan §3.3 已涵蓋，此處是提醒） | ✅ 已在 plan 內 |
| **D-user-spec** | Grep `\bUser\b` 於 `docs/02-architecture/*.md` → **僅 3 命中**：`02a:92`（base field FK 引用）· `02:37`（一列概念，指向 `05`）· `09:13`（表格標題 "User \| What they do here"，**與實體無關**） | **plan 的整個前提成立** —— `User` 確實沒有欄位規格 | ✅ 確認 |
| **D-basefields** | `02a:86-98` 的 13 個 base field 逐欄比對 `schema.prisma:107-137` 的 `Policy` → 缺 **6 個**（`ref_code` · `status` · `owner_user_id` · `created_by` · `updated_by` · `is_active`） | plan §3.3 的「6 降到 ≤1」數字正確 | ✅ 確認 |
| **D-statusenum** | `02a:300-312` Policy 狀態機 **6 態已規格化**（Draft → InReview → Approved → Published → UnderRevision → Retired） | D4（建 enum + 欄位、不建轉換強制）可行 | ✅ 確認 |
| **D-devdb** | `isms_dev` 的 `_prisma_migrations` 三列全部 `applied=true`，與 `prisma/migrations/` 的三個目錄**完全一致** | ⭐ **W03 的 `AD-DevDbDrift-1` 漂移已修復，本 phase 起點乾淨**。這正是把它拉到 Day 0 的理由 —— W03 是 Day 3 才發現 | ✅ 確認 |
| **D-adrnum** | ADR 目錄有 `0001/0004/0005/0006/0007/0010/0011`；**`0002/0003/0008/0009` 預留未建**（CLAUDE.md：待 spike / 待 Wave 3）；`ADR-001[2-9]` 全 repo **零命中** | D1 的 ADR 用 **0012**。⚠️ 不可填空缺編號 —— 那四個是有主題的預留（`AD-ChNumber-1`） | ✅ 確認 |
| **D-baselines** | lint **0** · type-check **0** · format **0** · unit **api 78 / web 10** · int **32** · build **0** · `run_all` **6/6** · `lint:negative` PASS（**17 檔掃描, 0 bypass, 3 allowlisted**） | 基線已記錄；與 W03 closeout 完全一致 | ✅ |

### Prong 覆蓋

- **Prong 1（path）**: 10 個路徑驗證（NEW 2 · EDIT 4 · design-note 1 · ADR 目錄 · CH 編號 · migration 目錄），**0 個漂移**
- **Prong 2（content）**: 4 個 plan 宣稱驗證（D-user-spec · D-globaltable · D-basefields · D-statusenum），
  **2 個漂移（`D-globaltable` · `D-detector-scope`）+ 1 個 orphan claim（`D-allowlist-count`）**
- **Prong 2.5（child tree）**: **N/A** —— 無前端工作
- **Prong 3（schema）**: 3 個驗證（`users` 零命中 · migration head 比對 · migration 目錄清單），**0 個漂移**

> ⭐ **Prong 2 又一次是唯一有產出的 prong。** 三個發現全部來自「讀規則與 detector 的**原文**」，
> 而不是路徑存不存在 —— 這與 `day0-plan-verify.md` 說的「路徑驗證單獨做是不夠的」一致。
> 特別是 **`D-detector-scope`**：它不在任何 plan 宣稱的射程內，
> 是讀全域表判準時**順著讀到 detector 實作**才發現的。
>
> ⚠️ **命名**：本 phase 的 drift 用 `D-<name>`（W03 慣例）。plan §3.1 的**決定**用 `D1..D4` ——
> 兩者是不同的東西。Day 0 初稿誤用 `D1..D4` 當 drift ID，Day 1 修正。

### Go / No-Go

**範圍變動**: **~10%** → **繼續 Day 1**

`D-globaltable` 與 `D-detector-scope` 都是**新增的約束**而非範圍變動：前者多兩個交付動作
（PR 描述舉證 + 更新清單），後者把一個 Day 2 才會撞到的決定提前到 Day 1。兩者都不改變 plan 的形狀。
依 `day0-plan-verify.md` 鐵律，**不改 plan §3 Technical Spec**，改動加進 **§8 Risks**。

### 時間

⚠️ Day 0 未逐項計時（`AD-TimeTracking-2` 的同一個缺口）。
本 phase 依 `AD-CalibrationMetric-1` 的提議改用**牆鐘跨度**：
branch base `65ce121` → closeout commit，`git log` 機械導出。Day 4 retro Q2 填入。

---

## Day 1 — 2026-08-10 — 拍板 `User` 的形狀

### 四個決定

| # | 決定 | 結論 | 依據 |
|---|---|---|---|
| **D1** | `users` 的範疇語義 | ✅ **A：全域表，無 `org_entity_id`** → [ADR-0012](../../14-adr/0012-user-scope-semantics.md) **已採納** | ⭐ `03:31` 明訂 "scope is derived from **role assignment**"；`03:23` 的 "every **domain record**" 列舉（risk/control/policy/asset）**不含 `User`** |
| **D2** | `is_active` 存或算 | ✅ **不存** —— 用 `retired_at IS NULL` | §1.1 自己標它是 "Derived convenience flag"。存 = 造出第二個可能與 `retired_at` 不一致的真相；本專案已有 `AD-NegativeGate-1` 這類「兩份資料靜默分歧」的教訓 |
| **D3** | `ref_code` 序號機制 | ✅ **counter 表 + `UPDATE … RETURNING`**，唯一約束兜底。⚠️ **並發保證未驗證 —— Day 2 用真並發測試證明** | sequence 需要 per (type, entity) **動態 DDL**（13 entity × N type = 數百個 sequence，且 DDL 在請求路徑上）；counter 表只要一列，行鎖僅阻塞同一組合。⛔ 應用層檢查排除 —— 那正是 `AD-GrepAssertion-1` 的形狀 |
| **D4** | `status` 現在建 enum 嗎 | ✅ **建 enum + 欄位，不建轉換強制** | `02a:300-312` 的 6 態**已規格化**。docstring 必須明寫「**轉換今天沒有被任何東西擋住**」—— 否則會被讀成 workflow 已存在（AP-3） |

### 產出

- **ADR-0012** —— `users` 全域 + entity scope 住在 role assignment。**4 條可證偽條件**，
  最可能開火的是「一個實體的管理員不得知道其他實體有哪些使用者存在」，且它**在 M4 開火不是更晚**
- **`02a` §0 索引** —— `User` 加入 Foundation services 分區；
  `Role` / `Permission` 加入 **"Not yet specified"** 分區並註明 M4（索引首次涵蓋 identity）
- **`02a` §3.2 `User` 規格** —— 三個欄位（`oidc_subject` · `email` · `display_name`），
  **逐項可追溯到 `05` §Identity**。同時明列**哪些 base field 不適用與為什麼**，
  以及三個「刻意不建、沒有消費者不要加」（`home_org_entity_id` · `last_login` · 任何 role 欄位）
- **`multi-tenant-data.md` 鐵律 1 擴充** —— **identity 是第三類**，不是在參考資料清單加第六列

### Issues / Discoveries

- 🚩 **`user.repository.ts` 砍掉**（使用者核可）。ADR-0012 拍板 `users` 為全域無 RLS 表之後，
  它原本的理由「第二個**範疇化 client** 消費者」**不成立** —— 它屬於 `entity-scope.resolver.ts`
  讀 `org_entities` 那一類。而今天沒有任何東西要讀 user（無端點、無 UI）→ 零消費者 = AP-5 + AP-3。
  ⭐ **與 `AD-ScopedClientDI-1` 同一形狀**：W03 也是拍板後才發現提議的 DI token 沒有消費者。
  **兩次都是「ADR 拍板改變了某個元件的存在理由」，而不是「估錯了工作量」。**
  plan §4 標 DROPPED、checklist 2.2 標 🚧（**都不刪行**）；解封條件 **M4**
- ⚠️ **`ref_code` 格式在兩處不一致**：`02a:89,103` 是三段 `<TYPE>-<ENTITY_CODE>-<seq>`
  （例 `RISK-SG-000123`），而 `03:110` 的 tier-2 欄位表舉例是**兩段** `RSK-0987`。
  判定**以 `02a` 為準** —— 它是資料模型的權威，`03:110` 是分類表的示意而非格式規格。
  ⛔ 不當場改 `03`（記錄即可，非阻塞）
- ⚠️ **`ref_code` 的消費者確認存在** —— 一度懷疑它與 `user.repository.ts` 同樣是零消費者，
  但 `policy.controller.ts` 的 **POST 端點**（W03 交付）就是它的真實消費者：建立 policy 時要發號。
  **與 repository 的差別是「有沒有人今天就會呼叫它」**，不是「是不是新東西」
- 🔧 **修正一個我自己造成的命名衝突** —— Day 0 的 drift 用了 `D1..D4`，
  而 plan §3.1 的**決定**也叫 `D1..D4`。W03 的慣例是 `D-<name>`（逐一確認過）。
  Day-0 的四個已改名為 `D-globaltable` / `D-detector-scope` / `D-allowlist-count` / `D-userfk-comment`

### Remaining for Next Day

- Day 2 全部（`users` 表 + migration · `ref-code.ts` · `Policy` 補欄位 · 範疇測試）
- ⛔ **Day 2 必須做的兩件「不在原 checklist 上」的事**：
  (a) `schema.prisma:97-106` 的刻意缺欄清單要**逐項更新**（`D-userfk-comment`）；
  (b) `ref_code` 的**並發測試**必須是「會抓到重號」的那種，不是「跑起來沒事」

### Notes

- ⭐ **ADR 寫完才發現 plan 的元件不需要存在** —— 這是本 phase 到目前為止最有價值的一次返工避免。
  順序是對的：**先拍板語義，再決定要建什麼**。若照原 plan 先建 repository 再寫 ADR，
  會得到一個有測試、有覆蓋率、通過所有 gate 的零消費者元件 —— 而**每一項 gate 都會是綠的**
- **D3 的並發保證今天是論證不是量測。** 依 `verification-discipline.md`，
  它在 Day 2 被真並發測試證明之前，一律標**未驗證**

---

## Day 2 — 2026-08-10 — 建表與補欄位

### 🚩 一個阻塞，以及它揭露的東西

`prisma migrate dev` **拒絕生成 migration**：`20260809075152_entity_scope_spike` 的 checksum
與資料庫記錄不符，它要求 `migrate reset`（**會 drop `isms_dev`**）。

**沒有照它說的做，先診斷**：

| 檢查 | 結果 |
|---|---|
| 是不是 CRLF/LF？ | ❌ **不是** —— raw 與去除 CR 後的 hash 相同，檔案本來就是 LF |
| 三個 migration 誰不符？ | **只有第一個**（`a5eea1df…` vs DB 的 `ac8d1b35…`）|
| 檔案被 git 改過嗎？ | ❌ 只有 **1 個 commit**（W02 原始），從未被修改 |
| 那 `isms_dev` 的 schema 對嗎？ | ✅ **完全正確** —— RLS enabled+forced · 2 個 policy · 2 個函式 · GRANT 無 DELETE |

→ **根因**：W02 當時先 `migrate dev`（記下只含 Prisma 生成 DDL 的 checksum），**再手動編輯**加入
RLS/GRANT/trigger。後兩個 migration 的 checksum 相符，表示流程之後已經改成先寫完整內容再套用。

⭐ **這暴露了 Day-0 `D-devdb` 的盲點**：我驗了「有沒有套用」（`applied=true`），
**沒驗「套用的是不是同一份內容」**。`AD-DevDbDrift-1` 的檢查應該包含 checksum 比對。→ 新 AD

**處置**：使用者授權後 `migrate reset` 重建。⚠️ Prisma 有 AI 專用安全閘，
**明確拒絕接受先前的問答作為同意**，要求把使用者的確切同意文字傳給它 —— 照做了。
重建後驗證 GRANT / RLS / checksum 三項全部正確。

### 產出

| 檔案 | 內容 |
|---|---|
| `schema.prisma` | `model User`（**無 `org_entity_id`**，ADR-0012）· `model RefCodeCounter`（**有** `org_entity_id`）· `enum PolicyStatus`（6 態）· `Policy` +5 欄 |
| `migrations/20260810185500_user_and_base_fields/` | 表 + RLS + GRANT + **回填 + counter 同步** |
| `core-model/ref-code.ts` + `.spec.ts` | 發號；`upsert` + `increment` = 單一 SQL 語句 |
| `core-model/scoped-client.types.ts` | `ScopedRefCodeClient`；`ScopedPolicyClient` 繼承它 |
| `core-model/policy.repository.ts` | create 路徑發號；**validate 在發號之前** |
| `test/int-global-setup.js` | users seed + policy ref_code + **counter 由 policies 導出** |

### Issues / Discoveries

- ⭐ **`ref_code NOT NULL` 讓 type checker 指出四個直接繞過 repository 寫 policy 的地方**
  （`policy.repository.spec.ts` 的 double · `entity-scope.int.spec.ts` ×2 · `policy.int.spec.ts` ×3）。
  那些是**刻意**繞過應用層去驗 RLS/trigger 的測試，合法 —— 但現在必須明確提供 ref_code。
  **一個 NOT NULL 欄位比任何 lint 規則都更能列出「誰在繞過 repository」。**
  → 測試專用號段 **`9xxxxx`**（counter 從 1 遞增，短期不會撞）
- ⭐ **migration 生成的 `ADD COLUMN ref_code TEXT NOT NULL` 是錯的** ——
  它在任何**已有列**的表上直接失敗。今天恰好成功，因為 `isms_dev` 剛 reset、`isms_test` 每次重建，
  **那正是讓錯誤形式看起來正確的條件**。改為 加欄位（nullable）→ 回填 → `SET NOT NULL`
- ⭐ **回填之後必須同步 counter，否則下一次發號就撞號** —— counter 從 0 開始、
  回填的第一筆是 000001 → 第一個 API 建立的 policy 拿到 000001 → unique violation，
  而呼叫者什麼都沒做錯。migration 與 seed **都改成從 `policies` 導出** counter，不寫死
- ✅ **Day-0 `D-detector-scope` 的擔憂沒有實現** —— `lint:negative` 掃 18 檔、
  allowlist 仍是 **3**。`ref-code.ts` 走正常的範疇化 client 路徑，不需要 raw query 或 `.connection`。
  （擔憂的前提是 `user.repository.ts`，而它 Day 1 就砍掉了）
- ⚠️ **`format:check` 失敗，而 `tail` 顯示的是 web 的成功訊息** ——
  **是退出碼揭露的**（`FORMAT=1`）。`AD-GrepAssertion-1` 的形狀，這次守住了，
  因為用的是 `PIPESTATUS[0]` 而不是讀 tail 的輸出

### 元驗證（提前做 —— 測試註解已經宣稱了它）

| 弄壞什麼 | 結果 |
|---|---|
| `upsert` 的 `{ increment: 1 }` → 固定 `1`（所有並發拿同一號）| int **2 failed** —— 含並發測試的 `size` 斷言（`policy.int.spec.ts:257`）|
| 還原 | int **34 passed** |

→ **重號會被抓到，不是「跑起來沒事」**。⛔ 若不做這一步，那條測試註解就是一個未兌現的宣稱。

### Gate

lint **0** · type-check **0** · format **0** · unit **86**（baseline 78 → +8）·
int **34**（baseline 32 → +2）· web **10** · build **0** · `run_all` **6/6** ·
`lint:negative` PASS（**18 檔 0 bypass, 3 allowlisted**）·
coverage **94.11 / 90.42 / 92.45 / 94.76**（baseline 93.69 / 90.21 / 92 / 94.32，**四項全升**）

### Remaining for Next Day

- Day 3：clean restart + API-level 驗證（真進程 + 真 PostgreSQL + 真 RLS）
- ⛔ Day 3 必驗：**發號在真進程上的行為** —— 今天只在測試進程裡驗過

---

## Day 3 — 2026-08-10 — API-level 驗證

_(⚪ 本 phase **無 user-facing surface** → drive-through 不適用。
一律標 **API-level verified**，不暗示可用性。)_

### Clean restart

| 項目 | 觀察 |
|---|---|
| port **3210**（API） | **空的** —— 無孤兒程序 |
| port **3200**（web） | ⚠️ 有 listener（PID 36748，**8/8 啟動，不是我開的**）→ **不碰**（`local-runtime-ops.md` §4；本 phase `apps/web` UNTOUCHED）|
| 啟動方式 | `node dist/bootstrap/main.js`（**重 build 後的新程序，非 watch 模式**）—— `--reload` 只重載模組碼、不重跑 startup |
| startup 證據 | 三個路由 mapped · ⭐ **`DevPrincipal` 警告有出現**（W03 的 mock 誠實原則生效）|
| 收尾 | ⚠️ `TaskStop` 停了 npm 但**子程序仍在 listening** —— 正是 Risk Class C 加強版描述的情況。確認 PID 51136 的 cmdline 與啟動時間確為我啟動的那個，才 kill。**驗到「無 API 程序殘留」，不只是「port 空了」** |

`isms_dev` 在 reset 後是空的 → 重新 seed（org_entities 5 · extension_fields 4 · users 1）。
⭐ **刻意不 seed policies**，讓 counter 從 0 開始，才能驗到「第一次發號 = 000001」。

### 🚩 首次探測就 500 —— 而所有 gate 都是綠的

```
GET /policies  → 500    POST /policies → 500
```

log：`permission denied for schema public`（**42501**），發生在 `entity-scope.resolver.ts:84` 讀 `org_entities`。

**根因 —— 兩條建庫路徑產生的 schema 權限不同，而只有一條被測試過**：

| 路徑 | 做什麼 | `public` schema 的 ACL |
|---|---|---|
| `int-global-setup.js`（**isms_test**）| `CREATE DATABASE` → 從 **template1 複製** | 帶內建的 `GRANT USAGE TO PUBLIC` → 應用角色**免費繼承** |
| `prisma migrate reset`（**isms_dev**）| **不 drop database** —— `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public` | **ACL 為 null** = 只有 owner 有權限 |

實測：`schema_acl: <null>` · `has_schema_privilege('isms_app_user','public','USAGE') = false`。

⭐ **這個權限從來沒有被本 repo 的任何東西授予過** —— 它是從 template 繼承的，而**被測試的恰好是繼承到的那一條路徑**。
W02/W03/W04 的每一個表層級 GRANT 都疊在一個沒有任何 migration 陳述過的假設上。

⚠️ **我自己的一個錯誤結論**：reset 之後我查了 `information_schema.role_table_grants` 就寫下
「GRANT 與 RLS **全部完好**」。那是**表層級**的證據，被用來回答一個涵蓋 **schema 層級**的問題 ——
`feedback_evidence_must_support_claim` 的形狀。**證據是真的，結論超出了它的射程。**

**處置**：新增 `20260810215500_grant_schema_usage`（**不改已套用的 migration** —— 那正是今天稍早
踩過的 checksum 坑）。`GRANT USAGE`，**不給 CREATE**：能 DDL 的角色也能 drop 掉約束它的 RLS policy。
實測 `has_usage: true · has_create: false`。

### API-level 驗證（真進程 + 真 PostgreSQL + 真 RLS，11 個案例）

| # | 案例 | 預期 | 實際 | |
|---|---|---|---|---|
| 1 | `GET /policies`（空庫）| `[]` + dev 標記 | `{"data":[],"_devPrincipal":true,"_warning":…}` | ✅ |
| 2 | `POST` 第一筆 | **`POL-SG1-000001`** | `POL-SG1-000001` | ✅ ⭐ 空 counter 起算 |
| 3 | `POST` 第二筆 | `POL-SG1-000002` | `POL-SG1-000002` | ✅ 遞增 |
| 4 | 新欄位的預設值 | `status=draft`；三個 user FK 為 null | 完全相符 | ✅ **誠實：今天沒有憑證可填** |
| 5 | `POST` 跨實體（HK1）| **404**，非 500/403 | 404 `org entity …c1 not found` | ✅ |
| 6 | `POST` 不存在的實體 | **與 #5 同形狀** | 404，除 id 外**逐字相同** | ✅ ⭐ oracle 防護成立 |
| 7 | `POST` 未宣告的擴充 key | 422 + key | `422 {"key":"notDeclared"}` | ✅ |
| 8 | `GET /policies` | 2 筆，含 refCode | 2 筆 | ✅ |
| 9 | `Cache-Control`（200 **與** 404）| `no-store, private` | 兩者皆是；`x-powered-by` 不存在 | ✅ |
| 10 | `GET` 不存在的 policy id | 404 | 404 | ✅ |
| 11 | **422 之後 counter 的狀態** | 未被燒號 | `last_seq=2, policies=2` | ✅ ⭐ |

⭐ **#6 值得特別記**：拒絕點已經**從 policy insert 移到了 counter upsert**（發號在前），
而「不存在」與「不是你的」仍然不可區分。**同一個保證，在不同的位置重新成立。**

⭐ **#11 是 unit test 驗過的順序在真進程上的確認** —— validate 在 allocate 之前，
所以被拒絕的 payload 不會在序號上留洞。

### 元驗證（checklist 3.3）

| 弄壞什麼 | 結果 |
|---|---|
| 發號的 `{ increment: 1 }` → 固定值（Day 2 已做）| int **2 failed**，含並發測試的 size 斷言 |
| `ref_code_counters` 的 RLS policy → `USING(true) WITH CHECK(true)` | int **2 failed** —— 見下 |
| 兩者還原 | int **34 passed** |

第二列的兩個失敗**不是同一件事的兩個症狀**：

1. `refuses to issue a code for an entity outside the scope` —— **resolved to `"PRB-HK1-000001"`**。
   SG1 的 client 成功替 HK1 發了號。這是直接證據。
2. `2b. a nonexistent entity id is refused the same way as a real out-of-scope one` ——
   預期 `ScopeRefusedError`，收到 `PrismaClientKnownRequestError`。
   ⭐ **這是新知識**：counter 的 RLS 失效**不只是「能替別人發號」** ——
   它讓錯誤型別改變，於是「不存在」與「不是你的」**重新變得可區分**。
   **W04 的發號路徑現在是 W03 那個 oracle 防護的一部分**，而在寫它的時候沒有人知道。

### Verdict

✅ **API-level verified against a clean process** —— 真進程 + 真 PostgreSQL + 真 RLS，11 案例 + 2 組元驗證。
⚠️ **不是「可用」**：沒有 UI，沒有人透過 UI 用過它。W01–W04 至今**零 UI drive-through**。

---

## Day 4 — YYYY-MM-DD — Closeout

<待填>
