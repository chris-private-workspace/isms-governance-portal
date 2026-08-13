# Phase W09 — Checklist (shared assessment engine)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `a18b366`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：7 個 NEW 目標皆不存在；4 個 EDIT 目標**3 存在 1 不存在** → **D1**；
      `CH-024` 未被佔用（最後是 `CH-023-w08-issue-and-action.md`）
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-evidence-anchor** — `evidence` model 有沒有 `@@unique([id, orgEntityId])`？
        → 決定 `responses.evidence_id` 走複合 FK（W08）或 trigger（W07）
        → **沒有；但它也給得起（無 `appliesToScope`）→ 複合 FK + ALTER `evidence`**（**D2**）
  - [x] **D-template-scope** — grep `AssessmentTemplate` 於 `02a` / `05` / `13`，
        確認規格是否曾指定範疇形狀；三種先例的錨點各讀一次
        （`Threat` 全域 · `extension_field_catalog` · `Control` ADR-0014）
        → **三處全部沒有提到範疇** → 走 entity-scoped（**D3**）
  - [x] **D-assessment-row** — 讀 `02a` §0 的 `Assessment (RCSA)` 那一列原文，
        並讀 `check_entity_index.py` 的 `parse_index` 確認註記後分母會變 35
        → 它在 `02a:34`（Shared core），引擎三張在 `:52`（Foundation services）→ **跨區段**（**D5**）
  - [x] **D-question-id** — grep `question_id` 全 repo，確認 `02a` 沒有在別處定義它的來源
        → **全 repo 只出現 1 次**（`02a:333`），無定義（**D4**）
  - [x] **D-user-fk** — 確認 `users` 無 `org_entity_id`（ADR-0012），單欄 FK 是對的（**D7**）
  - [x] **D-refs-to-assessment** — 全 repo grep `Assessment (RCSA)` 的引用，
        確認改 `02a` §0 不會弄斷別處（R5）→ 僅 `02a:223` 一處（其餘是本 phase 自己的文件）
- [x] **Prong 2.5 — child component tree**：**N/A**（無前端變更）
- [x] **Prong 3 — schema verify**：`schema.prisma` 確認三個 model 不存在（grep 命中 0）；
      最後一個 migration 為 `20260812211801_issue_and_action`；
      → **改用 `prisma migrate dev --create-only` 生成目錄名**（機器產生 UTC 戳），
      即 `AD-MigrationTimestampTz-1` 的修法之一
- [x] **D-baselines** — 逐 workspace 實測並記錄：web test **10** · api unit **276/27** ·
      api int **125/10** · lint **0/0** · type-check clean ×2 · build clean ×2 ·
      coverage **92.07/91.9/96.63/93.62** · `run_all` **7/7** · `lint:negative` **PASS**
      ⛔ **不得引用 plan 抄來的 W08 數字** —— 那是待驗證的宣稱（實測後**十項全部相符**）
      ⚠️ `lint:negative` 是 **root** script，叫法是 `npm run lint:negative`（**無 `-w`**）—— **D8**
- [x] **Catalog drift** — progress.md Day-0 表格（**8 條 D1–D8**）
- [x] **Go/no-go** — 範圍變動 **~8%** → **繼續 Day 1**

### 0.2 Branch

- [x] `git checkout -b feature/W09-assessment-engine`（從 `main` `a18b366`）

---

## Day 1 — Schema + isolation (US-1, US-2)

### 1.1 Enums + models

- [x] **三個 enum 照 `02a` 字面值建，不擴充**
  - DoD: `assessment_subject_type` / `assessment_question_type` /
        `assessment_instance_status` 的值與 `02a:326-333` + §4 逐字相同
  - Verify: `pg_enum` 實測 → `risk|control|vendor|entity` · `yes_no_na|score|free_text` ·
        `scheduled|in_progress|submitted|reviewed|completed` **三者逐字相符**
  - ⛔ **代價已發現**：`02a:223` 的第五個值 `process` 因「`Assessment` 不建表」而**沒有落點** → 見 progress D9
- [x] **三個 model + §1.1 base fields + `org_entity_id NOT NULL`**
  - DoD: 三張表皆有 `org_entity_id`，含 `assessment_responses`（子表冗餘是故意的，約束 8）
  - Verify: `migrate deploy` 成功；`check_entity_index.py` 報 **17 / 36**（機械導出）

### 1.2 複合 FK + 單欄 FK

- [x] **表間引用依 D-evidence-anchor 的結論選形狀**
  - DoD: `instances → templates`、`responses → instances` 走複合 FK；
        `responses → evidence` 依 Day-0 結論；`*_user_id → users` 走單欄 FK
  - Verify: `pg_get_constraintdef` 實測 → **3 個複合 FK**（含 `(evidence_id, org_entity_id)`）
        + 3 個 user 單欄 FK + 3 個 org_entity 單欄 FK
  - ⭐ `evidence` 的錨點由本 migration 補上 —— **首次回頭改前一個 phase 的表**

### 1.3 SoD CHECK（US-3）

- [x] **`reviewer_user_id <> assignee_user_id` 的 CHECK 約束**
  - DoD: 約束存在且 `NULL` 放行；命名為 `assessment_instances_sod`
  - Verify: **四個方向實測** — A reviewer=assignee **FAIL** ✓ · B reviewer NULL **成功** ✓ ·
        C assignee NULL **成功** ✓ · D UPDATE 改成相等 **FAIL** ✓
  - ⭐ **D 是免費的**：CHECK 自動涵蓋 UPDATE，與 W08 量到「FK 免費涵蓋 UPDATE」同形狀

### 1.4 RLS

- [x] **per-command policy（SELECT / INSERT / UPDATE，無 DELETE）+ FORCE RLS**
  - DoD: 三張表各三條 policy；`FORCE ROW LEVEL SECURITY`
  - Verify: `pg_class` 實測 → 三張表皆 `rls=true force=true policies=3`

### 1.5 `validate_extensions` trigger

- [x] **三張表各掛一個**（W03 起的既有形狀）
  - DoD: trigger 存在
  - Verify: `pg_trigger`（排除 internal）實測 → 三張表各 **1** 個

### 1.x Partial gate

- [x] `npm run type-check -w apps/api` clean（⛔ 逐 workspace 可見，不用 `tail`）
      + `check_entity_index.py` **17 / 36**

---

## Day 2 — Repositories + endpoints (US-2, US-4)

### 2.1 三個 repository + spec

- [x] **`assessment-template.repository.ts`**（+ spec）
  - DoD: entity-scoped 讀寫；spec 覆蓋 `definition` 原樣通過、不寫 `version`/`status`
  - Verify: 9 個測試綠
- [x] **`assessment-instance.repository.ts`**（+ spec）
  - DoD: 同上；含 SoD 違反時的錯誤傳遞；**不接受 `templateVersion`**
  - Verify: 9 個測試綠，含「23514 → SoD 且**不是**兩個 404 之一」
- [x] **`assessment-response.repository.ts`**（+ spec）
  - DoD: 同上；`evidence_id` 可為 NULL；**未被問過的題目會被接受**（成本寫成測試）
  - Verify: 7 個測試綠
- [x] ⭐ **超出 plan：第二個 migration，`template_version` 由 DB 快照**
  - DoD: 呼叫端說 99 存入 1 · 模板升 2 存入 2 · 不可達模板 → 23503 非 23502 · UPDATE 不重取
  - Verify: 四項 psql 實測 + int spec 測試 5/6/7/8

### 2.2 `scoped-client.types.ts` +3 介面

- [x] **三個介面，⛔ 各自只含自己需要的 model**
  - DoD: `ScopedAssessmentInstanceClient` **不含** `assessmentTemplate`；
        `ScopedAssessmentResponseClient` **不含** `assessmentInstance` 與 `evidence`
  - Verify: type-check clean

### 2.3 `modules/assessment/` controller + module

- [x] **6 個端點（3 POST + 3 GET）**
  - DoD: 非法 enum → **400**；不存在或越界 id → **404**；**SoD → 422**；
        合法值由 `Object.values()` 導出
  - Verify: 13 個 controller 測試綠
- [x] **`bootstrap/app.module.ts` 註冊**（⚠️ 非 plan 寫的 `src/app.module.ts` —— D1）
  - DoD: `AssessmentModule` 在 imports 清單
  - Verify: type-check + build clean；**int spec 用 `Test.createTestingModule` 實際建起模組**

### 2.4 整合測試

- [x] **`src/modules/assessment/assessment.int.spec.ts`**（⚠️ 非 plan 寫的 `apps/api/test/` —— D15）
  - DoD: 跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 / 滾升只看到授權子樹
  - DoD: **測試名稱不得寬於它證明的東西**（`AD-TestNameWiderThanProof-1`）——
        每個測試名指出擋的是哪一層，Day 3 的四個 N 目標逐一標在測試上
  - Verify: **20/20 綠**
- [x] **SoD 的常駐負面案例**
  - DoD: 同一 user 同時為 assignee 與 reviewer → 插入失敗，且斷言的是 CHECK 不是別的
  - Verify: 測試 9（拒絕）+ 9b（單邊放行）+ 9c（**不是** 404 形狀）

### 2.x Full gate

- [x] lint **0/0** · web test **10** · api unit **314/31** · api int **145/11** ·
      type-check clean ×2 · build clean ×2 · coverage **92.07/90.67/97.14/93.49** ·
      `run_all` **7/7** · `lint:negative` **PASS**（46 檔 0 bypass 3 allowlisted）·
      `check_entity_index` **17 / 36**
      （⛔ 逐 workspace 逐項可見，不用 `tail` / `--silent`）

---

## Day 3 — Meta-verification (US-5) — 純後端，gate-only verified

_(本 phase 無 user-facing surface，故 Day 3 不是 drive-through。
⛔ 所有報告寫「gate-only verified」，不得暗示可用性。)_

### 3.1 Clean restart

- [ ] **乾淨重啟並確認新程序是 3210 的唯一擁有者**
  - DoD: 列出所有 node 程序檢視 PID/PPID/StartTime，殺掉孤兒 worker；擷取 startup log
  - Verify: `docs/rules-on-demand/local-runtime-ops.md` 的程序

### 3.2 中性化清單（⛔ 預期方向必須在跑之前寫下）

- [x] **先寫下每個 N 的預期轉紅測試，再跑** —— `AD-MetaVerificationBug-1`
      （預期表寫於 progress.md Day 3，**在執行任何 N 之前**）
  - [x] **N1** 移掉 `responses → evidence` 的複合 FK → 預期 **12** → 實測 **12** ✅
  - [x] **N2** `assessment_templates_insert` → `WITH CHECK (true)` → 預期 **15 紅、16 仍綠**
        → 實測 **15 紅、16 綠** ✅（反直覺預測成立：16 的拒絕由 counter policy 代勞）
  - [x] 🚧 **N3 併入 N2** —— 原列「`SELECT` policy 中性化」，但 15 用 `createMany`
        已繞開 SELECT policy，而 14（跨實體讀）由三張表共用同一形狀的 policy 覆蓋。
        **未單獨執行**，理由記於此，不刪本項
  - [x] **N4** 移掉 SoD CHECK → 預期 **9 紅、9c 錯誤地仍綠** → 實測**完全相符** ✅
        → 修好 9c 後重跑 **9 + 9c 兩紅** ✅
  - [x] **N5** 移掉 `instances → templates` 複合 FK → 預期 **8 · 10 · 11** → 實測**三者** ✅
  - [x] **N6** fixture 孤兒改名為真正在索引上的 `Risk`/`risks` → 預期 `--self-test` FAIL
        → 實測 **FAIL** 且 `run_all` **6/7** ✅
- [x] **實測並比對方向**
  - DoD: 方向相符 → 記錄；**方向不符 → 先懷疑元驗證本身，不要先改產品碼**
  - Verify: 每個 N 各跑一次完整 assessment int suite，逐項記轉紅數 → progress.md Day 3
  - ⛔ **第一次 N1 是無效的**（改資料庫而非 migration，被 int setup 的重建覆蓋），
        20/20 全綠看起來像「守衛多餘」—— **靠事前寫下的預期才發現什麼都沒量到**

### 3.3 復原

- [x] **每個 N 復原後重跑，確認回到全綠**
  - DoD: 中性化的東西沒有一項殘留
  - Verify: 兩個 migration 與備份**逐位元組相同**（`diff -q`）· fixture `git diff` **空** ·
        int **145 / 11 全綠** · `run_all` **7/7**（entity-index 17/36）· unit **38 / 4 全綠**

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-024-w09-assessment-engine.md`**
      （Problem / Root Cause / Solution / Verification / Impact）
  - DoD: 含 **gate-only verified** 的明確標示、關掉與新增的 AD、
        以及 `AssessmentTemplate` 範疇形狀的判斷理由（R2）
  - DoD: **非 spike → 不寫 design note**（複製既有形狀，無新機制值得 extract）

### 4.2 `02a` §0 索引更正（US-6）

- [x] **`Assessment (RCSA)` 一列改為註記，不刪列**
  - DoD: 註明它是 `subject_type = risk` 的 `AssessmentInstance`；舊名找得到新落點
  - Verify: `check_entity_index.py` 報 **17 / 35** —— Shared core **23 → 22**（分母由索引導出）

### 4.3 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，第 3 個資料點；
      窗口 ratio **0.50 UNDER**）
      - ⛔ **`AD-CalibrationIdleGap-1` 的提議被本 phase 推翻** —— 它說扣除值「可從 commit
        機械導出」，而使用者訊息的時間戳**不在 git 裡**。四段皆閉合但含量不到的等待前綴，
        故只能報**上界**，⛔ 不編一個數字去扣
      - ⭐ **三數比對**：committed 3.75 hr · 新方法預測 **64 min** · 實測 Day 1-3 **58.5 min**
        → 新法誤差 < 10%，舊法（7.5 hr bottom-up）誤差 **7.7 倍**
- [x] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）
- [x] Final gate sweep: lint **0/0** · web test **10** · api unit **314/31** ·
      api int **145/11** · type-check clean ×2 · build clean ×2 ·
      coverage **92.07/90.67/97.14/93.49** · `run_all` **7/7** · `lint:negative` **PASS**
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（新增 6 條 + 更新 3 條）· `ROADMAP.md` · `RISK_REGISTER.md`（R4 12 → **15 張表**）
      ⛔ **計數在最後一次編輯之後才做**（`AD-CountBeforeLastEdit-1`），
      優先度**逐列解析不 grep** → **86 條（P0 5 / P1 50 / P2 31）**，兩次解析一致
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → **0**
- [x] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view` 驗證後翻 `status:` 標籤
