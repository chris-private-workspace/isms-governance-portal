# Phase W11 — Checklist (Statement of Applicability)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `f171049`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 11 個目標逐一確認（NEW 檔不存在 / EDIT 檔存在）；
      `CH-028` 編號未被佔用
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -1`
  - → 3 NEW 皆不存在 · 4 EDIT 皆存在 · 最大號 `CH-027` ✅
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-index** — `02a` §0 的 SoA 那一列仍為 Wave 1「Mandatory」；`Framework` 仍**不在任何一節**
    - → ⭐ **比預期更強**：`Framework`（大寫）在 `02a` **全檔零命中** —— 規格從未定義過它
  - [x] **D-refcode** — 既有 repository 的 `prefix:` 實際值枚舉，確認 `SOA` 無衝突
        ⚠️ **枚舉不得憑印象**（CH-027 的 E3 教訓：嚴格 pattern 只中 88/91，差額才是真相）
    - → ⛔ **第一版枚舉不完整**（寫死常數名得 10 個，實為 **14** 個）—— 教訓當天再現，見 D3/D8。
      `SOA` 無衝突（結論不變，但重做過）
  - [x] **D-policy** — 讀最近一個 migration 的 3 條 per-command policy 當前寫法
    - → GRANT 明列 + `_read` / `_insert` / `_update`；`FOR UPDATE` 的 `USING` 與 `WITH CHECK` **兩個都要**
  - [x] **D-unique** — 讀 W10 `20260813153153_version_label_key_scoped` 的唯一鍵欄位順序
    - → `(report_id, org_entity_id, version_label)`；SoA 無 parent ⇒ entity 在**首位**
  - [x] **D-version** — 確認 `Policy.version` 是單一 int（`02a` 列的 `version` 與 §1.1 合併的先例）
- [x] **Prong 2.5 — child component tree**：**N/A**（無前端）
- [x] **Prong 3 — schema verify**：`statements_of_applicability` 不存在；migration head 與
      `schema.prisma` 一致；`enum SoaImplementationStatus` 不存在
  - → 三者皆零命中；head = `20260813153153_version_label_key_scoped`
- [x] **D-baselines** — api unit **351/33** · api int **160/12** · web **10/1** ·
      coverage **92.01/90.81/97.4/93.44** · `run_all` **8/8** · `check_entity_index` **19/35** ·
      lint 0 · type 0 · build clean ×2
  - → **九項全部實測且與 plan 宣稱相符（0 drift）**。⚠️ build 的第一次驗證用了管線後的 `$?`
    （量到的是 `tail` 的 exit code）→ 重跑取得 `REAL_BUILD_EXIT=0`，見 D9
- [x] **Catalog drift** — progress.md Day-0 表格（**D1..D9**）
- [x] **Go/no-go** — **範圍變動 0% → GO**；plan §3 未改，drift 全部進 §Risks

### 0.2 Branch

- [x] `git checkout -b feature/W11-soa`（從 `main` `5a676f9`）
  - → 已於 pre-doc 階段建立，plan + checklist 在此分支上

---

## Day 1 — Schema · migration · isolation (US-1, US-2)

### 1.1 Model + enum

- [x] **`schema.prisma`：`model StatementOfApplicability` + `enum SoaImplementationStatus`**
  - DoD: 欄位對齊 `02a:215`；**四個 deviation 各有 docstring**（D1 `framework` 非 FK ·
    D2 無 `control_id` · D3 唯一鍵含 entity · D4 enum 值自宣告且**刻意不含 `not_applicable`**）；
    `version` 單一 int（不是兩個）；`approvedBy` 是 `String?` 非 FK
  - Verify: `npx prisma validate` + `npm run type-check -w apps/api`
  - → `The schema is valid 🚀`；欄位名用 **`framework` 而非 `framework_id`**（名字不該宣稱不存在的邊）；
    順帶要在 `OrgEntity` / `User` 各補一條 back-relation（Prisma 要求雙向）

### 1.2 Migration

- [ ] **`migrations/<ts>_soa/migration.sql`**
  - DoD: `CREATE TABLE` + 複合 FK + GRANT 明列 + **3 條 per-command policy**（無 `FOR DELETE`）+
    **`@@unique([orgEntityId, framework, clauseRef])`**
  - Verify: `npm run prisma:migrate -w apps/api` 後 `\d statements_of_applicability`
  - ⚠️ **用 Edit 工具寫 migration，不用 heredoc** —— W09 / W10 / CH-027 三次同形違反
  - → ✅ 用 **Write 工具**（新檔）寫，無 heredoc。⛔ **Verify 指令跑不了** ——
    `migrate dev` 被 W10 留下的 checksum 漂移擋住（progress §B1）。改由 **int suite 驗證**
    （它 DROP+CREATE 後 `migrate deploy`，遇到的是空的 `_prisma_migrations`）：**160 / 12 全綠**
  - → **D10：不建複合 FK 也不建 `(id, org_entity_id)` 錨點** —— SoA 不是任何表的子表，
    沒有可複合的對象；今天零消費者的錨點是 AP-5（plan §3.2 的描述不精確，**原文保留**）

### 1.3 Repository

- [x] **`core-model/soa.repository.ts` + spec**
  - DoD: `list` / `create`（`asset.repository.ts` 的形狀）；`ref_code` 前綴 `SOA` 且 docstring
    註明自宣告（W04 D3 ruling）；23505 走 `DuplicateKeyError`
  - Verify: `npm run test -w apps/api -- soa.repository`
  - → **9 / 9 通過**。藍本改用 `issue.repository.ts`（Day-0 D2：`asset` 是雙表）。
    ⭐ 23505 的安全性**依 `scope-refusal.ts:183` 的條件逐條確認**（鍵含 `org_entity_id` ⇒ scoped
    ⇒ 可 surface），而不是假設 W10 的結論自動適用

### 1.x partial gate

- [x] lint 0 · type 0（**只跑這兩項就只能說這兩項** —— W10 Day 3 曾以 4 項冒充 9 項）
  - → 實跑七項並**逐項取 exit code**（不共用管線後的 `$?`）：format **0**（⛔ **修正前是 1**）·
    lint 0 · type 0 · unit **360 / 34** · int **160 / 12** · `run_all` **8/8** ·
    `check_entity_index` **20 / 35**
  - → ⛔ **`format:check` 當場紅了** —— 正是 W10 Day 3 漏掉的那一項。
    這次因為逐項取 exit code 而在**當天**發現，不是 Day 4
  - → ⛔ build 與 coverage **本日未跑**，故本段不宣稱它們的狀態（留 Day 2 full gate）

---

## Day 2 — Endpoints (US-3)

### 2.1 Module + controller

- [ ] **`modules/soa/` 四檔 + `app.module.ts` 註冊**
  - DoD: **2 個端點**（`GET /soa` · `POST /soa`）；⛔ 無 GET-by-id（無先例，不開新形狀）
  - Verify: `npm run test -w apps/api -- soa.controller`

### 2.2 整合 + 範疇測試

- [ ] **`soa.int.spec.ts`：4 個範疇測試**
  - DoD: 跨實體讀拒 / 跨實體寫拒**且資料未變** / RLS 層獨立成立 / **唯一鍵不洩漏存在性**
  - Verify: `npm run test:int -w apps/api -- soa`

### 2.3 `02a` deviation 註記

- [ ] **`02a:215` 加 D1 / D2 / D4 的 recorded deviation**
  - DoD: 形式沿用 `:219` / `:225` / `:260`（既有三個 deviation 的寫法）
  - Verify: 讀回該段，確認三個 deviation 各自說明「規格說什麼 / 建了什麼 / 為什麼」

### 2.x Full gate

- [ ] lint 0 · format check ×2 · type 0 · build clean ×2 · api unit · api int · web ·
      coverage 不低於 baseline · `run_all` 8/8 · `check_entity_index` **20/35** · `lint:negative`
  - ⛔ **九項全跑才能說「gate 全綠」**

---

## Day 3 — 整合驗證（純後端 ⇒ 無 drive-through）(US-4)

_(本 phase 無 user-facing surface。報告一律寫 **gate-only verified**，絕不暗示可用性。)_

### 3.1 中性化預測（⛔ 寫下並 **commit** 之後才執行）

- [ ] **四個中性化的預期方向寫進 progress.md 並 commit**
  - DoD: N1 SELECT policy · N2 INSERT `WITH CHECK` · N3 唯一鍵中的 `org_entity_id` ·
    N4 複合 FK —— 每個寫明**預期哪些測試轉紅、哪些不動**
  - ⚠️ **N2 預期可能零轉紅**（`AD-BorrowedRefusal-1` 已 5 次）—— 預測要寫出來，不是事後解釋

### 3.2 執行 + 逐項對照

- [ ] **四個中性化各自執行、還原、記錄**
  - DoD: 每個 case 跑完立即還原並驗證還原成功；控制組與最終還原各驗一次
  - ⛔ **零轉紅先查再下結論**；**方向不符預期時先懷疑元驗證本身**（`AD-MetaVerificationBug-1`）
  - Verify: 結果表逐列對照預測表

### 3.3 D3 的實測（`AD-UniqueKeyOracle-1` 第 2 個資料點）

- [ ] **量測唯一鍵是否為 existence oracle**
  - DoD: N3 狀態下，撞別實體的 `(framework, clause_ref)` 與不撞的**回不同 SQLSTATE**；
    修補後兩者收斂。⭐ **這是量測不是宣稱**
  - Verify: int 測試逐一斷言 SQLSTATE

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-028-w11-soa.md`**（Problem / Root Cause / Solution /
      Verification / Impact —— 含四個 deviation 的理由 + **gate-only verified** 聲明）

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 5 個資料點**；
      ⚠️ **必須自報量法** —— 本 phase 宣告為**含 Day 0**（`AD-CalibrationDay0InOrOut-1`））
- [ ] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）
- [ ] Final gate sweep（九項全跑，逐項寫實際數字）
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（新增 AD + §Shipped 加 1 行）· `ROADMAP.md` 第 4 列推進 ·
      `RISK_REGISTER.md`（**R4 17 → 18 張表無稽核**）
  - ⛔ **BACKLOG 計數在最後一次編輯之後跑** `python scripts/lint/check_backlog_counts.py`
    （CH-027 交付；它已經抓到過一次真實漂移）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      ⚠️ 含 **AP-7 orphan claim**：本 phase 若動 `02a` 行數，檢查誰引用了那些行號
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view` 驗證後翻 `status:` 標籤
  - ⚠️ **rebase merge 會改寫 SHA** —— 若 closeout 引用了「預測寫在前面」的 commit，
    改指 main 側並補 **author date**（CH-027 量到它逐秒不變）
