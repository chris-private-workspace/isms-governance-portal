# Phase W16 — Checklist (ISMS profile: five entity-scoped tables, no endpoints)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `157921f`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：NEW 檔（`migrations/<UTC>_isms_profile/` ·
      `core-model/isms-profile.int.spec.ts` · W16 progress/retro · `CH-034`）全部**不存在**；
      EDIT 檔（`schema.prisma` · `int-global-setup.js` · `02a-data-model-spec.md` ·
      `13-isms-profile-module.md`）全部**存在**；
      `CH-034` 未被前向引用佔用（grep `CH-034` 全 repo，不是 `ls` 目錄 —— `AD-ChNumber-1`）
- [x] **Prong 1b — plan 引用的每個 `AD-*` 都在 `BACKLOG.md` 存在**（`AD-AdRegistry-1`：
      編號會製造「已登記」的錯覺）。⭐ **Day-0 DR1 修正：不是 16 條，是 20 條**（原數字手寫）
      —— 20/20 逐條命中 `BACKLOG.md` 的表格列
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] 🔴 **D-oracle-criterion**（ROADMAP 4d 的 `AD-UniqueKeyOracle-1` —— **這一格就是那個 `[ ]`**）
        ⭐ **Day-0 DR2 修正：原文寫「每一個 `@@unique`」是把判準寫窄了** ——
        單欄 `@unique` 與 migration 裡的 `CREATE UNIQUE INDEX`（含 partial）**同樣是唯一索引**。
        實際掃描三條獨立路徑：`@@unique` **10** · 單欄 `@unique` **22** ·
        `CREATE UNIQUE INDEX` **34**（含 2 條 partial）。逐個套判準「這個 tuple 的欄位是不是
        全部由呼叫端可給、且不含 `orgEntityId`」。⛔ 判準是「兩個**可分辨的結果**」不是
        「兩個不同 SQLSTATE」（W11 修正）。
        **結果：今天零個可達的 oracle**，但安全性來自 GRANT 與「沒有 repository」，
        **不是**來自鍵的設計 —— 完整分類與覆蓋聲明在 progress.md §Oracle sweep
  - [x] **D-grant-precedent** — 量測 entity-scoped 表（`attestations` / `policies` /
        `rm_report_versions`）的 `GRANT` 實際是哪些 verb。⛔ **不得假設**（W15 D7 的教訓）
        → **三層**：`SELECT,INSERT,UPDATE`（12 可變表）· `SELECT,INSERT`（3 張 append-only）·
        `SELECT` only（7 張全域／無寫入路徑）。**全 repo 零個 `GRANT DELETE`**
  - [x] **D-rls-shape** — 逐字讀 `attestations` 的 RLS policy（幾條、有無 `FOR UPDATE`／
        `FOR DELETE`、`USING` vs `WITH CHECK` 各寫了什麼）→ 決定五張新表各要幾條
        → 可變表 **3 條**、append-only **2 條** ⇒ 本片 **14 條**；⭐ 且量到 plan 漏了 `FORCE`（DR3）
  - [x] ⭐ **D-immutable** — 逐字確認 `rm_report_versions` 到底有沒有 `FOR UPDATE` policy /
        `GRANT UPDATE`（D14 直接抄它；**抄之前要先看清楚被抄的是什麼**）
        → 兩者皆無；且 W10 的 **N1a 已實測**「只放行 GRANT、policy 留空 ⇒ **不報錯但零筆被改**」
        ⇒ 兩層產生**可分辨的結果**（42501 vs rowCount 0），測試 8 / N3 據此重寫
  - [x] **D-audit-guard** — 確認漂移守衛對「零 repository 的新 model」的行為，
        並記下它讀的是**文字**不是 build graph（W15 實測）
        → `audit-coverage.int.spec.ts:517` **排除 `.spec.` 檔** ⇒ 1.1b 的 stub 必須是非 spec 檔
  - [x] **D-index-arity** — 確認 `check_entity_index.py` 的 `entities_in_cell` 逐格拆名
        ⇒ 在 `02a:60` 加第五個名字後分母確實 35 → **36**（先跑一次確認，不要事後才發現）
        → `check_entity_index.py:102-114` 逐個 backtick token 抽名，確認
  - [x] **D-seed-order** — 確認 `int-global-setup.js` 的 insert 順序是手工維持（`:484-511`）、
        `SEED.*` 是位置元組（`:504` 為 7 元）、計數守衛自我指涉（`:759-763`）
  - [x] **D-13-lines** — `13:21` · `13:27` · `13:29` · `13:31` · `13:37/39/41/43` · `13:45` ·
        `13:49` 逐行重讀，確認 plan §3.1 的 15 個裁決引用的原文與今天的檔案一致（全檔 70 行讀過）
  - [x] **D-02a-lines** — `02a:18` · `:60` · `:67` · `:70` · `:71` · `:92` · `:93` ·
        `:128` · `:430` · `:437` 逐行重讀（`:128`/`:437` 是 D13 的依據）
- [x] **Prong 2.5 — child component tree**：**N/A**（零前端）
- [x] 🔴 **Prong 3 — schema verify**：⛔ **直接查 `_prisma_migrations`**，比對其 head 與
      `migrations/` 最後一個目錄。**不得**用 int suite 的 `rebuilt/migrated/seeded` 訊息代替
      —— `AD-DevDbChecksumDrift-1` 明列「用 int suite 當 Prong 3 的證據，對本條而言等於沒驗」，
      而 W15 正是這樣繞過去的（**本片是第 5 次**）
      → ⭐⭐ **五個 phase 來第一個真實數字**：`isms_dev` 只套了 **17** 支、磁碟 **22** 支，
      head 卡在 `20260813153153_version_label_key_scoped`（2026-08-13）⇒ **落後 5 支**
  - [x] 同時比對 `schema.prisma` 與 DB 的**欄位級**現況：`prisma migrate diff` 生成比對
        ⛔ **Day-0 DR7：基準不得用 `isms_dev`**（落後 5 支）—— 改以剛重建的 `isms_test` 為基準
        （`--from-config-datasource --to-schema`）。⚠️ `--from-migrations` 需要
        `datasource.shadowDatabaseUrl`，而 `prisma.config.ts` **不在 §4 變更清單裡**，不為一次檢查偷改
        → ⭐⭐ **`--exit-code` 回 2（非空）：抓到兩處既有漂移 → DR12**
- [x] **D-baselines** — api unit **480 / 40 suites** · api int **225 / 18 suites** · web **10 / 1** ·
      lint 0 · type 0 · build clean · coverage **92.14 / 91.77 / 98.98 / 93.56** ·
      `run_all` **8 / 8** · `check_entity_index` **25 / 35** · `lint:negative` PASS
- [x] **Catalog drift** — progress.md Day-0 表格（**DR1–DR12**，十二條）（`D{N}` + Finding + Implication，
      交叉引用到 plan §8；⛔ **不默默改 plan §3**）
- [x] **Go/no-go** — 範圍變動 **< 10%** ⇒ ✅ **繼續 Day 1**（§5 十三條、§4 十四列**皆未變動**）
- [x] ⭐ **時間記錄**（`AD-CalibrationNoTimeRecord-1` + `AD-TimeTracking-2`）——
      Day 0 的 progress 條目要有與 Day 1-3 同格式的逐任務時間表格。
      量法已於 plan §7 宣告為「**含 Day 0，且含起草**」。
      ⚠️ **部分達成**：三-prong **14.6 min 是量測**（`date -u` 兩次），起草段 **~95 min 是估算**
      （起草開始時沒蓋時間戳）—— progress.md 已誠實標註；**Day 1 起每任務前後各蓋一次**

### 0.2 Branch

- [x] `git checkout -b feature/W16-isms-profile`（從 `main` `157921f`）
      —— `git rev-parse HEAD` == `git rev-parse origin/main` == `157921f`，逐位相符

---

## Day 1 — Schema + migration (US-1, US-2, US-4)

### 1.1 稽核漂移守衛：先證明它不是恆真

- [x] **1.1a — 加表之前跑一次，記錄基線**
  - DoD: `audit-coverage.int.spec.ts` 全綠，記下綠的條數
        → **1 passed / 224 skipped / 225 total**（該測試存在、名稱唯一、通過）
  - Verify: ⛔ **原指令 `… | grep -A3 "allowlist still matches"` 在綠燈時零命中**，
        因為 jest 預設 reporter 不印通過的測試名 ⇒ 它證明不了任何事（progress D1-1）。
        改用 `npx jest --config jest.int.config.js -t "allowlist still matches the write surface" --verbose`
- [x] **1.1b — 用暫時 stub 逼出紅，確認訊息指名新 model**
  - DoD: 暫時新增含 `client.iSMSProfile.create` 的 stub（⚠️ **delegate 首字母才小寫** ——
        `iSMSProfile` 不是 `ismsProfile`，證據 `rm-report.repository.ts:161` 的 `client.rMReportVersion`）
        ⇒ 守衛**恰好 1 紅**，訊息含 `"ISMSProfile"` 且落在 **`unaudited`** 側（不是 `unreachable`）；
        ⛔ 驗完**立即刪除 stub**，不得留在 commit 裡
        → **四項預測逐項命中**（失敗點 `:543` · received `["ISMSProfile"]` · `unaudited` 側 ·
        `1 failed, 224 skipped`）；⭐ stub 無人 import 且**刻意不 type-check** 仍被偵測
  - Verify: `npx jest … -t "allowlist still matches the write surface" --verbose`；
        刪除後 `git status --porcelain` **空**、`core-model/` 無 `isms-*` 檔

### 1.2 `schema.prisma` +5 model +4 enum

- [x] **五個 model**（`ISMSProfile` / `ISMSSite` / `ISMSContact` / `ApprovedOffering` /
      `ISMSProfileVersion`）
  - DoD: 全部帶 `02a` §1.1 base fields（照 `Attestation` 逐欄位抄）；四張子表帶 `orgEntityId`
        + 複合 FK `references: [id, orgEntityId]`；父表加 `@@unique([id, orgEntityId])`、
        `@@unique([orgEntityId, profileYear])` 與 `currentVersionId` 指標；
        版本表加 `@@unique([orgEntityId, ismsProfileId, versionLabel])`；
        `onDelete` **全部顯式**（W15：Prisma 對 optional relation 預設 `SetNull`，
        與 migration 靜默分歧且本 repo 無測試斷言 ON DELETE）
  - Verify: `npx prisma validate --schema apps/api/prisma/schema.prisma`
- [x] **`ISMSProfile` 的 10 個 agreed-field 欄位**（D11 八個 + D12 兩個 bool）
  - DoD: `iso_27001` · `iso_27017` · `certification_state` · `certificate_number` ·
        `certification_body` · `certificate_issued_at` · `certificate_expires_at` ·
        `surveillance_at` · `iso_officer_name` · `review_at`
  - Verify: 逐欄位對上 plan §3.1 D11 / D12 的清單（**十個，不是九個也不是十一個**）
- [x] 🔴 **所有新索引／約束名逐個算長度，> 63 就明確命名**（⭐ Day-0 DR12 新增）
  - DoD: PostgreSQL `NAMEDATALEN` 上限 **63**，超過即**靜默截斷**。
        已知超標：`isms_profile_versions_org_entity_id_isms_profile_id_version_label_key`（**69**）。
        超標者在 schema 用 `@@unique([...], map: "<短名>")`，且 migration 的 `CREATE UNIQUE INDEX`
        字面值**與 `map:` 一字不差**
  - Verify: `docker exec isms-postgres-dev psql -U isms_dev -d isms_test -tAc "SELECT indexname, length(indexname) FROM pg_indexes WHERE tablename LIKE 'isms%' OR tablename='approved_offerings';"`
        —— **全部 ≤ 63 且無一被截斷**
- [x] 🔴 **`posture` 確認不存在**（D13）
  - DoD: `posture` 在五個新 model 中零命中
  - Verify: `grep -n 'posture' apps/api/prisma/schema.prisma`（只應命中既有的、非本片的）
- [x] **四個 enum**（`OfferingBusinessLine` / `OfferingType` / `OfferingApprovalStatus` /
      `CertificationState`）
  - DoD: 值用 `snake_case` + `@@map`，照既有 9 個 enum 的慣例；`approval_status` 是
        **四值**（D9，不是設計的三值）
  - Verify: `npm run type-check -w apps/api`
- [x] **header 修正**：`Purpose` 的 model count → **31**；MHist **+1 行 ≤ 100 字元**
  - DoD: 數字可由 `grep -c '^model' schema.prisma` 重現（`AD-SchemaHeaderStale-1` 的判準）
  - Verify: `grep -c '^model' apps/api/prisma/schema.prisma`

### 1.3 Migration（手寫）

- [x] **`migrations/<UTC>_isms_profile/migration.sql`**
  - DoD: 5 × `CREATE TABLE` + 5 × `ENABLE ROW LEVEL SECURITY` + policy（條數依 Day-0
        `D-rls-shape`）+ 4 × 複合 FK + 父表指標 FK + 2 × UNIQUE
        + `CHECK (user_id IS NOT NULL OR name IS NOT NULL)` + `GRANT`（依 `D-grant-precedent`）；
        ⛔ **UTC 時間戳**（`AD-MigrationTimestampTz-1`）
  - Verify: `npm run test:int -w apps/api`（global setup 會 DROP + CREATE + migrate + seed）
- [x] 🔴 **套用後 `migrate diff` 不得新增漂移**（⭐ Day-0 DR12 新增）
  - DoD: 對剛重建的 `isms_test` 跑 diff，輸出**只剩** Day-0 記錄的那兩處既有漂移
        （`statements_of_applicability` 索引名 · `audit_log` bytea 預設表示法）——
        **五張新表一處都不得出現**
  - Verify: `DATABASE_URL_MIGRATE="postgresql://isms_dev:isms_dev_local_only@127.0.0.1:5433/isms_test" npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma`
        （在 `apps/api/` 下跑；⛔ **基準不得用 `isms_dev`** —— DR7 落後 5 支）
- [x] 🔴 **版本表刻意不給 `FOR UPDATE` policy 與 `GRANT UPDATE`**（D14）
  - DoD: banner 註解寫明它是**刻意的**（否則三個月後看起來像忘了加），並引用 W10 先例
        與 `AD-ImmutableRowRetention-1`（`retired_at` 因此寫不進去，是已知且刻意的缺口）
  - Verify: 測試 8（見 2.2）會證明 `UPDATE` 被拒
- [x] **banner 另記 D1 與 D13**
  - DoD: 子表的 `org_entity_id` 是 guardrail 要求而非 `13` 要求；`posture` 缺席是 `02a:437`
        的要求 —— 兩個偏離**從 schema 本身看得見**（`AD-VendorAuditorSod-1` 的既有做法）
  - Verify: 讀 migration banner
- [x] ⛔ **`prisma generate`**（`AD-PrismaEnumThreeTruths-1` —— 本片新增 **4** 個 enum，
      schema / generated client / DB catalog 三份真相，中間那份會擋）
  - DoD: `apps/api/src/generated/prisma/**` 已重生成且含四個新 enum
  - Verify: `npm run type-check -w apps/api` 且 int suite 綠

### 1.4 文件：索引與規格

- [x] 🔴 **`02a:60` 那一格加 `ISMSProfileVersion`**（`02a:18` 要求同一個 change）
  - DoD: 分母 35 → **36**
  - Verify: `python scripts/lint/check_entity_index.py`
- [x] **在 `13` 記錄 D1 / D5 / D6 / D13 / D14 / D15 的裁決**
  - DoD: 每條寫「規格原文 → 裁決 → 依據」三段；⛔ **不刪除原文** ——
        guardrail 贏不代表規格的話要消失，那是審計軌跡
  - Verify: `python scripts/lint/run_all.py`（path-references + rules-hygiene）

### 1.x Partial gate

- [x] `format:check` api · `lint` api · `type-check` api · `prisma validate` —— **各自取 exit code**

---

## Day 2 — Seed + integration spec + 中性化 (US-2, US-3, US-4)

### 2.1 Seed

- [x] **`int-global-setup.js`：跨兩實體各一 profile + 各自 site / contact / offering / version**
  - DoD: 五張新表的 insert 排在 `org_entities` **之後**，四張子表在 `isms_profiles` 之後；
        編輯用**結構邊界錨定**（唯一 ref code / 含換行的完整界定符），不用行號或序數；
        ⚠️ **無真實個資**（guardrail 7）—— 聯絡人與 ISO officer 用明顯的佔位姓名
  - Verify: `npm run test:int -w apps/api`
- [x] **五張表加進 `:759` 的計數守衛**
  - DoD: 五列加入；⛔ **同時在 progress.md 記下它是自我指涉的**
        （`expected` 取自 `SEED.<key>.length`，與被檢查的陣列同源）——
        不得在任何文件寫成「seed 有守衛」而不加限定
  - Verify: 故意改壞一筆 INSERT ⇒ 守衛報錯並指名該表；改回

### 2.2 Integration spec — `core-model/isms-profile.int.spec.ts`

- [x] **測試 1-2：跨實體讀 / 寫拒絕**（五張表各一組）
  - DoD: 讀回 0 列（不是 403）；寫入被拒且**資料未變**（寫後重查確認）
  - Verify: `npm run test:int -w apps/api`
- [x] **測試 3：RLS 層獨立成立**（`rls-direct` 風格，不經應用層）
  - DoD: **逐表**斷言 `relrowsecurity` 為真；⚠️ 不硬編碼表名總數（W15 的 `THREE` 的教訓）
  - Verify: `npm run test:int -w apps/api`
- [x] **測試 4：複合 FK —— 子列指向別實體的 profile 被拒絕**
  - DoD: D1 的唯一證明；SQLSTATE 斷言，不斷言訊息字串
  - Verify: `npm run test:int -w apps/api`
- [x] 🔴 **測試 5：`@@unique([orgEntityId, profileYear])` 的兩個面**
  - DoD: 同實體同年 → **23505**；**不同實體同年 → 成功**。兩者皆斷言
  - Verify: `npm run test:int -w apps/api`
- [x] 🔴 **測試 6：`@@unique([orgEntityId, ismsProfileId, versionLabel])` 的兩個面**
  - DoD: 同上兩面 —— 這是 W10 `rm_report_versions` 的原案標的，判準逐字移轉
  - Verify: `npm run test:int -w apps/api`
- [x] **測試 7：`ISMSContact` 的 CHECK**（兩欄皆 NULL → 拒絕）
  - DoD: SQLSTATE 23514
  - Verify: `npm run test:int -w apps/api`
- [x] ⭐ **測試 8：app 角色無法 UPDATE 一列版本** ⚠️ **測試名刻意只講這件事**
  - DoD: ⭐ **Day-0 DR-immutable 改寫了本項**：兩層防線今天產生**可分辨的結果** ——
        GRANT 缺席 → **42501**（權限檢查早於 policy）；GRANT 放行而 policy 缺席 →
        **不報錯但 `rowCount = 0`**（W10 N1a 實測）。⇒ 本測試斷言 **42501**，
        且**名字不得叫「表是不可變的」** —— 它證明的是 GRANT 那一半
        （`AD-TestNameWiderThanProof-1`；W10 的 migration 註解 `:104-109` 記錄了
        第一版測試正是預測相反而失敗的）
  - Verify: `npm run test:int -w apps/api`
- [x] ⭐ **測試 9：`GRANT` 用 catalog 斷言**
  - DoD: 對 `information_schema.role_table_grants` 斷言 `isms_app` 對五張表的 privilege
        集合**恰好等於**預期（`toEqual` 排序陣列，**不是** `toContain`）——
        多一個 verb 自動紅（`AD-W15ConstraintSurfaceUntested-1` (c) 明列的修法）
  - Verify: `npm run test:int -w apps/api`
- [x] **測試名逐條檢查：不得寬於證明**（`AD-TestNameWiderThanProof-1`，3/3 已達門檻）
  - DoD: 測 INSERT 的就叫 INSERT；覆蓋 N 個 verb 的才可以說 N 個
  - Verify: 逐條讀測試名 vs 斷言

### 2.3 中性化實驗（≥ 3 次）

- [x] **N1 / N2 / N3 的預期紅**形狀**寫在執行之前**
  - DoD: 每次逐條指定**機制 + 檔案 + 條數**（不只條數 —— W15 N2 的做法）；
        ⛔ 先跑 `--listTests` 取順序並把「誰先跑完」寫進預測（`AD-JestFileOrder-1`）；
        ⛔ **保留失敗身分**，不要只留計數行（W15：「過濾器決定了我事後能問的問題」）
  - Verify: 預測寫入 progress.md 並 commit **之後**才執行
- [x] **N1：拿掉一條複合 FK** ⇒ 預期測試 4 轉紅，其餘不動
- [x] **N2** ⛔ **原案（拿掉版本表 UNIQUE 的 `orgEntityId`）在寫預測時就被判定為恆真** ——
      複合 FK 已強迫 `isms_profile_id` 決定 `org_entity_id`，該鍵本來就按實體隔離。
      改打**父表**的 `@@unique([orgEntityId, profileYear])`。
      → **N2a**：seed 自己先炸（引爆點比預測早一層）；**N2b**（seed 年度錯開）：
      **恰好 1 紅、測試 6、失敗在 (a) 那一筆** —— oracle 現形
- [x] **N3a：只加 `GRANT UPDATE`，policy 仍缺席**（⭐ Day-0 DR-immutable 導出；
      這是 W10 N1a 在**另一張表**上的移轉檢查，不是重跑一個已解的問題）
      ⇒ 預期測試 8 轉紅**且紅的形狀是「不再是 42501」**；raw UPDATE **不報錯而 `rowCount = 0`**；
      **測試 9 的 catalog 斷言同時轉紅**（兩條都該叫，只有一條叫就是覆蓋有洞）
- [x] **N3b：N3a 再加上 `_update` policy** ⇒ 預期列**真的被改寫**
      ⇒ 兩層都拿掉才失去不可變性 ⇒ **兩層都是承重的**（W10 N1b 的同形驗收）
- [x] **預測錯了要寫下為什麼錯**（W15 N1 的做法 —— 比預測對更有價值）
      → **五次實驗，2 次預測完全正確、3 次不正確**，三次都是**把條數估低**。
      ⭐ 連帶量到 N1 與 N3b 是**相反的失敗模式**：同樣「比預期更紅」，
      前者是雜訊（我自己的並行汙染）、後者是訊號（覆蓋比預期好），
      而分辨方法只有一個 —— **每一條紅是否都能由該改動解釋**

### 2.x Full gate（**十三項各自取 exit code**）

- [x] `format:check` api
- [x] `format:check` web
- [x] `lint` api + web
- [x] `type-check` api + web
- [x] `build` api
- [x] `build` web
- [x] `lint:negative`
- [x] api unit
- [x] **api int**
- [x] web unit
- [x] coverage（門檻 80/70/80/80）
- [x] `python scripts/lint/run_all.py` **8 / 8**
- [x] `check_entity_index` **30 / 36**

---

## Day 3 — 整合驗證 (US-1, US-5) — ⚪ **gate-only verified，無 drive-through**

_(本片零 user-facing surface：無端點、無 UI、無 CLI。依 `verification-discipline.md` §適用範圍
屬「純後端 / 純 infra」豁免 —— **但報告必須明寫 `gate-only verified`，不得暗示可用性**。)_

### 3.1 Clean restart

- [x] **N/A + 記錄理由**：本片無 dev server；int suite 的 global setup 每次
      DROP + CREATE + migrate + seed ⇒ Risk Class C 結構上不成立。
      ⛔ **記錄而非打勾略過**

### 3.2 🔴 AC-2：逐欄位對照表（**這一項是 W15 `closed_partial` 的唯一理由**）

- [x] **產出一份逐欄位對照表進 progress.md**
  - DoD: 五張表的**每一個**欄位一列 ——「`13` 原文 / 實作 / 差異 / 依據（D 編號）」；
        且每個 §3.1「不建」的欄位（`posture` · `region_code` · `status` · `state`）
        有一條 grep 證明它**不在** schema 裡
  - Verify: 表格行數 == `grep` 出的實際欄位數（兩條獨立路徑交叉檢查，
        `AD-NarrowPatternWideClaim-1`）
- [x] **15 個裁決逐條標記「已執行 / 未執行」**
  - DoD: 每條指向一個可執行的證據（測試名 / grep / migration 行號）
  - Verify: 無「已裁決但無證據」的列
- [x] ⛔ **若本項未完成 ⇒ 本 phase 只能標 `closed_partial`**，與 W15 同因

### 3.x Full gate 重跑（**逐項複製 Day 2 §2.x 的清單，不得寫「跑 gate」**）

> `AD-PartialGateReportedAsFull-1` 三次全是 `format:check`；W11 的第 3 次成因是
> **中性化本身改了測試檔**而 full gate 停在那之前 ⇒ Day 3 必須重跑全套。

- [x] `format:check` api
- [x] `format:check` web
- [x] `lint` api + web
- [x] `type-check` api + web
- [x] `build` api
- [x] `build` web
- [x] `lint:negative`
- [x] api unit
- [x] **api int**
- [x] web unit
- [x] coverage
- [x] `python scripts/lint/run_all.py` **8 / 8**
- [x] `check_entity_index` **30 / 36**

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-034-w16-isms-profile.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含 **§關鍵設計細節**（15 個裁決）
      + **§Drive-through 抓到而 gate 沒抓到的** ⇒ ⚪ 本片寫「N/A — gate-only verified，
      零 user-facing surface」而**不是留白**）
      ⛔ **無 design note** —— feature continuation（複用 W14 entity-scoped + W15 零端點
      + W10 版本表三個既有 pattern）

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 9 個資料點**；
      ratio 出 band 就標記 re-point）
  - DoD: ⭐ **兩條路徑的分子都要算**（progress.md 逐日時間記錄 **與** commit author date），
        差距 > 20% 要寫下差在哪，**不挑對自己有利的那個**（plan §7 已事先宣告）
- [ ] `calibration-matrix.md` 那一行 —— 填這個骨架，**≤ 1 行 ~250 字元**
      （lint 上限 400；完整敘述 → `calibration-log.md`）：
      `| \`pattern-reuse-feature\` | 0.50 | <mean> | KEEP/re-point (W16 ratio ~<Y> IN/OVER band; <一子句>; if 2nd >1.20 → <Z>; → calibration-log) |`
- [ ] Final gate sweep（**逐項複製 §2.x 的十三項**，各自取 exit code）
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated（**各 1 行，不加 Prev Phase 列**）·
      `MEMORY.md` pointer（~250-300 字元）+ `memory/project_w16_isms_profile.md` subfile
- [ ] `BACKLOG.md`：**關閉 `AD-DesignAlign-7`**（D7 已裁定）→ 移到 Shipped Pointer Index；
      新增 D5 / D6 / D9 / D11(重疊) / D13 五條 AD
- [ ] `ROADMAP.md` 第 4 項推進（**30 / 36**，並說明分母 +1 的理由）
      **+ 第 4d 項標記**（`AD-UniqueKeyOracle-1` 的 Day-0 落點已執行）
- [ ] `RISK_REGISTER.md` R3 / R4 更新 + Last Reviewed
      （⚠️ R4：五張新表**零寫入路徑**，敞口是否變大要據實寫）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      （⛔ **AP-3 要如實記 ≥ 1** —— `ISMSProfileVersion` 今天零消費者，是知情下的裁定）
- [ ] `plan.md` frontmatter `status:` → `closed` / `closed_partial` **+ 內文 `**Status**` 一起翻**（R9）
  - Verify: `python scripts/lint/check_status_markers.py`
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view <N> --json state,mergedAt` **驗證**後翻狀態標籤
