# Phase W15 — Checklist (M1 slice 10: jurisdiction spine + obligation library)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `52a74ac`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [ ] **Prong 1 — path verify**：plan §4 的 NEW 檔（migration 目錄 · `jurisdiction.int.spec.ts` ·
      W15 progress/retro · `CH-033`）全部**不存在**；EDIT 檔（`schema.prisma` ·
      `int-global-setup.js` · `multi-tenant-data.md`）全部**存在**
- [ ] **`CH-033` 編號未被佔用** —— `ls docs/03-implementation/changes/ | sort -V | tail -1`
      應為 `CH-032`（⚠️ **不要用 `ls` 目測**，`AD-ChNumber-1`：前向引用預留編號是合法的）
- [ ] **Prong 2 — content verify**（drift → progress.md，格式 `D{N}` + Finding + Implication）：
  - [ ] **D-jurisdiction-absent** — `jurisdiction` 在 `schema.prisma` **與** `migrations/` 兩邊
        皆零命中（本 plan 只驗過 schema 這一半）
  - [ ] **D-orgentity-rls** — grep `org_entities` 的 policy 形狀；加一個 nullable FK 欄位是否需重寫
        （W14 D3 對 `policies` 的同形答案是「不需要」—— ⛔ 重驗，不沿用）
  - [ ] **D-seed-orgentity** — `int-global-setup.js` 現有 OpCo seed 的列數與 `code` 值
  - [ ] **D-refcode-counter** — 確認 `Threat`/`Vulnerability` 真的**沒有** `ref_code`
        （若有 ⇒ plan §3.1 D2 的形狀要改，且本片要動 `RefCodeCounter`）
  - [ ] **D-globallist** — 重讀 `multi-tenant-data.md:57-66` 逐列，確認 `jurisdictions`/`regulations`
        真的在清單上、`obligations` 真的不在（本 plan 的 D1 完全建立在這個讀數上）
  - [ ] ⭐ **D-audit-drift-guard** — 讀 `audit-coverage.int.spec.ts` 的守衛實作，
        確認它從 **repository 的 `client.<delegate>.<write>(` 呼叫**導出，
        所以「3 個新 model 而零 repository」**不該**讓它轉紅
- [ ] **Prong 3 — schema verify**：`_prisma_migrations` 的 head 與 `migrations/` 最後一個目錄一致
      （⚠️ W14 Day 0 用錯 role 而改用 int suite 的重建作為證據 —— 兩者**不等價**，記下用的是哪個）
- [ ] **D-baselines** — api unit **480 / 40** · api int **218 / 17** · web **10 / 1** ·
      lint **0** · type-check **0** · build **0 / 0** ·
      coverage **92.14 / 91.77 / 98.98 / 93.56** · `run_all` **8 / 8** ·
      `check_entity_index` **22 / 35** · `lint:negative` PASS
      （⚠️ **root script，加 `-w apps/api` 會 `Missing script`**）
- [ ] **Catalog drift** — progress.md Day-0 表格
- [ ] **Go/no-go** — 範圍變動 ≤ 20% 繼續 / 20-50% 修訂 §5+§7 並回報 / > 50% 中止重寫

### 0.2 Branch

- [ ] `git checkout -b feature/W15-jurisdiction-and-obligations`（從 `main` `52a74ac`）
- [ ] **第一個 commit 夾帶審計 #6 的 7 條漂移修正**（使用者 2026-08-15 裁決）——
      AD-17 / 18 / 19 / 22 / 23 / 25 / 26，含 AD-26 的第 2 個實例（`CH-032` 列缺 SHA，我造成的）

---

## Day 1 — Schema + migration (US-1, US-2)

### 1.1 ⭐ 先量：漂移守衛在「新 model 但零 repository」下的行為

- [ ] **在建表之後、跑 int suite 之前先寫下預期，再跑**
  - DoD: 觀察到 `audit-coverage` 的漂移守衛**仍綠**（3 個新 model 不在 `AUDITED_MODELS`
    而**沒有**轉紅），因為守衛從 repository 的寫入呼叫導出，不是從 model 清單
  - ⛔ **順序是這條檢查唯一的價值來源** —— 它是 W14 的**反向對照組**（那次有 repository
    而未接清單 ⇒ 恰好 1 紅、訊息自己指名）。兩個方向合起來才證明守衛量的是「寫入面」不是「表數」
  - Verify: `npm run test:int -w apps/api 2>&1 | grep -A3 "allowlist still matches"`

### 1.2 Schema + migration

- [ ] **`schema.prisma` +3 model +1 enum +1 欄位**
  - DoD: `Jurisdiction`（`code` UNIQUE · `name` · `residencyPolicy` · `notes`）·
    `Regulation`（`name` · `jurisdictionId` · `effectiveDate` · `sourceUrl`）·
    `Obligation`（`regulationId` · `jurisdictionId` · `reference` · `text` · `summary`）;
    `OrgEntity` +`jurisdictionId String?`。⛔ **三張表皆無** `orgEntityId` / `refCode` /
    `status` / `ownerUserId` / `extensions`（plan §3.1 D2）
  - Verify: `npm run type-check -w apps/api`
- [ ] **手寫 migration + UTC 時間戳**
  - DoD: `CREATE TABLE` ×3 + `ALTER TABLE org_entities ADD COLUMN` + FK；
    ⛔ **零 `ENABLE ROW LEVEL SECURITY`、零 `CREATE POLICY`**，且**理由寫進 migration 註解**
    （複製 W05 `migration.sql:30-33` 的形狀：「match 已在清單上的列，不加寬」）
  - ⚠️ **第四次繞開 `AD-DevDbChecksumDrift-1`** —— 在 progress.md 明寫，不要靜靜繞過
  - Verify: `npm run test:int -w apps/api`（global setup 會 DROP + CREATE + migrate + seed）
- [ ] ⛔ **`prisma generate`**（`AD-PrismaEnumThreeTruths-1` —— 本片新增一個 enum，
      schema / generated client / DB catalog **三份真相**，中間那份會在 runtime 擋）
  - Verify: `npm run type-check -w apps/api` 且 int suite 綠

### 1.3 Seed

- [ ] **11 個管轄區 seed + 既有 OpCo 指過去**
  - DoD: `int-global-setup.js` 有 11 列 `jurisdictions`；既有 OpCo seed 的 `jurisdiction_id` 已填
  - ⛔ **錨定結構邊界改檔**（`AD-TextEditStructuralScope-1` —— W14 同一天犯兩次）：
    用唯一 ref code / 含換行的完整界定符，**且加 `assert` 確認插入筆數符合預期**
  - Verify: `npm run test:int -w apps/api`

### 1.x partial gate

- [ ] `type-check` 0 · `lint` 0 · `check_entity_index` **25 / 35**

---

## Day 2 — 整合測試 + 全域清單舉證 (US-3, US-4)

### 2.1 負面測試

- [x] **AC-4 全域可讀** — `jurisdiction.int.spec.ts`
  - DoD: 以 SG1 範疇連線讀到**全部 11 個**管轄區。⚠️ **測試名稱要寫明它證明的是「沒有 policy」**
    （`AD-TestNameWiderThanProof-1`）
  - Verify: `npm run test:int -w apps/api`
  - ✅ 測試 1（SG1 範疇）+ 測試 2（**從未設過 scope**，分辨「無 policy」與「permissive policy」）
    + 測試 3（catalog 直接讀 `relrowsecurity` / `pg_policies`，**涵蓋另外兩張表**）
- [x] **AC-5 FK 完整性** — 指向不存在的 `regulation_id` / `jurisdiction_id` 皆被拒
  - DoD: 斷言 **SQLSTATE `23503`**，⛔ **不斷言訊息字串**（`AD-GrepAssertion-1` 同族）
  - Verify: 同上
  - ✅ 測試 4 / 5，走 **owner** 連線（Day-0 D7）；測試 7 把「權限先於約束」變成可見的對照
- [x] ⛔⭐ **D9（Day 2 發現，plan 未預見）：AC-3 沒有任何測試 ⇒ N1 原本是空實驗**
  - DoD: `jurisdiction` 在全 repo `*.spec.ts` 零命中 ⇒ 補**測試 6**（`org_entities` 指向不存在的
    `jurisdiction_id` → 23503），**AC-3 因此才有可被 N1 falsify 的行為**
  - ⛔ **不改 plan §5 原文** —— 保留「計畫寫了什麼 vs 現實是什麼」的軌跡，本條進 §Risks

### 2.2 全域清單舉證（D1）

- [x] **`multi-tenant-data.md` 全域清單 +1 列 `obligations` + 舉證**
  - DoD: 舉證寫明「`02a:200` 五個欄位全部是法規內容，per-entity 適用性住在
    `ObligationControlMapping`（`10:69`，Wave 2）」；`:81` 要求的 PR 描述複述留待 Day 4
  - Verify: `python scripts/lint/run_all.py`（rules-hygiene + path-references）
  - ✅ **併入既有列而非新增列**（見 D10）⇒ 行數 **390 → 390**、`--numstat` **1/1**、
    錨點 `:64` `:67` `:81` `:145` `:161` `:197` `:212` `:294` 逐字不變、**0 檔需重新指向**
- [x] ⛔⭐ **D10：第一版加了一列，違反既有的 `AD-MdAnchorLineShift-1`（「被大量錨定的文件，
      編輯不得改變行數」）** —— 已全部還原重做
  - ⛔ 我是**做完 7 檔重新指向、正要寫 BACKLOG 條目時**才查到那條規則已經存在
    ⇒ `AD-NegativeGate-1` 家族：**規則存在、正確，而沒有任何載體在執行它**
  - ⭐ 順帶量到 `AD-16` 的**第 4/5/6 個實例**（`resolver.ts:16` / `:39` / `resolver.spec.ts:80`
    引 `:145` 卻指向 404 那一節，**由 W04/W05 造成，與本片無關**）→ BACKLOG，不在此修

### 2.x Full gate

- [x] 十三項各自 exit code 分開取：`format:check` api/web · `lint` · `type-check` ·
      `build` api/web · `lint:negative` · api unit · **api int** · web · coverage ·
      `run_all` 8/8 · `check_entity_index` **25 / 35**
      —— ✅ 全 **0**；**api int 225 / 18**（+7 / +1）· api unit 480 / 40 · web 10 / 1
- [x] ⚠️ **coverage 不得因新 model 稀釋**（`AD-ModuleCoverageDilution-1` / `AD-ModuleFileZeroCoverage-1`）
      —— 本片零 `.ts` 產品檔，所以**預期逐位不變**；若變動，那本身是發現
      —— ✅ **92.14 / 91.77 / 98.98 / 93.56 逐位不變**，預期命中

---

## Day 3 — 中性化驗證 (US-4) — ⚪ 無 UI，drive-through 不適用

_(純資料層，無 user-facing surface ⇒ **gate-only verified**，⛔ 絕不暗示可用性。
Drive-through 的位置由**兩次中性化**承擔 —— 它們是本片唯一能證明「刻意」而非「遺漏」的機制。)_

### 3.1 Clean restart

- [x] ⚪ 本片無長駐 dev server（純資料層）；int suite global setup 每次重建 DB
      ⇒ Risk Class C 結構上不成立。⛔ **記錄而非打勾略過** —— progress §3.1 已寫明
      「量過之後判定不適用」而非「跳過」

### 3.2 中性化（預期方向**逐測試先 commit 再執行**）

- [x] ⛔ **先 grep 消費者再寫預測**（`AD-NeutralisationConsumerGrep-1` —— W13 少算就是因為
      列的是「我以為會受影響的 suite」）
  - ⭐ **量到兩件直接改變預測的事實**：(A) `app_entity_scope()` 未設 scope raise **42704**、
    空字串 raise **42501** ⇒ N2 的測試 1 與 2 是**兩種不同的紅**；
    (B) `rls-direct`（第 17）跑在 `jurisdiction`（第 18）**之前**
    ⇒ N1 留下的第 6 列 `org_entities` **不會**被 `toBe(5)` 看見 ⇒ **1 紅不是 2 紅**
  - ⛔ (B) **推翻了我的直覺**；⚠️ 它依賴 `--listTests` 順序 = 執行順序，那是**假設不是量測**
- [ ] **N1** 移除 `org_entities.jurisdiction_id` 的 FK 約束 → 預期 **AC-3 轉紅**、其餘不動
- [ ] **N2** ⭐ 暫時給 `jurisdictions` 加一條 entity-scoped RLS policy → 預期 **AC-4 轉紅**
  - ⛔ **這是本片的驗收核心**：它是唯一能區分「全域是刻意的」與「忘了加 RLS」的實驗。
    ⚠️ 若 AC-4 在加了 policy 之後**仍綠**，那代表該測試是恆真的（`AD-VacuousScopeTest-1` 形狀）
- [ ] 逐項對照預測 vs 實際，命中/落空**都**記入 progress.md（⛔ 預測錯**不改預測**）
- [ ] **還原驗證**：`git status` 空 · api int 回到 Day 2 的數字 · type-check 0

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-033-w15-jurisdiction-and-obligations.md`**
      （Problem / Root Cause / Solution / Verification / Impact）
      —— ⚪ **無 drive-through**，Verdict 寫 `gate-only verified`
- [ ] ❌ **不需要 design note**（feature continuation，非 spike）

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 8 個資料點**；
      ⚠️ plan §7 預告：ratio 明顯低於 band ⇒ 是 class 判斷過寬的訊號，Q2 要答這件事）
- [ ] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `calibration-log.md`）
- [ ] **新增 AD**：`Regulation.version` 與 base `version` 撞名（plan §3.1 D4，**第 2 次**，
      `Policy` 是第 1 次且無人記錄）→ `BACKLOG.md`
- [ ] Final gate sweep：十三項，各自 exit code 分開取，數字逐項記入 progress.md
- [ ] 導航檔: `CLAUDE.md` Current-Phase（**1 行**）+ Last-Updated · `MEMORY.md` pointer + subfile
      （~250-300 字元）· `BACKLOG.md` · `ROADMAP.md` 第 4 項（**兩處都要改** —— ROADMAP:58）
- [ ] `RISK_REGISTER.md` 複查（`retrospective.md.tpl:120`）——
      ⚠️ **R4 的覆蓋率欄位已於 2026-08-15 改為「當場導出」，不要再寫死分數**（審計 #6 AD-23）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
- [ ] ⭐ **§Shipped 那一列補 `MERGED (PR #N, sha)`** —— ⛔ 審計 #6 `AD-26` 量到這是**結構性時序問題**
      （那一列在 closeout 寫，而 merge 在 closeout 之後 ⇒ 寫下的當下**必然**不完整），
      W13 與 CH-032 各漏一次。**這一項就是為它加的。**
