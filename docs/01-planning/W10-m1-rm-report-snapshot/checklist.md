# Phase W10 — Checklist (RM report as an immutable versioned snapshot)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `d6300ce`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 NEW 檔全部不存在、EDIT 檔全部存在；
      ⚠️ 不只驗「plan 說在哪」，還要驗**新檔該放哪**（對照 `modules/issue/`、`modules/control-test/`
      的四檔形狀 —— 兩者一致）—— W09 在同一個 phase 內犯了兩次 Risk Class D
- [x] `CH-026` 編號未被佔用（實測最大為 `CH-025-assessment-process-subject.md`）
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-circular-fk** — ⭐ **由推論升級為量測**：`prisma validate` 通過 ·
        `migrate diff` DDL 正確 · runtime probe 四項全中（NULL 指標可插 / 首版可插 /
        promote 成功 / **跨報告指標 23503**）→ progress.md **D3**
  - [x] **D-composite-self** — `@@unique` 產出 `rm_report_versions_id_report_id_key` → **D5**
  - [x] **D-grant-shape** — GRANT 全部表級，無 column-level 先例；`GRANT SELECT` only 有先例 → **D4**
  - [x] **D-refcode-prefix** — ⚠️ **抓到 drift**：`ref-code.ts` 無前綴登記表且 `:65-69` 明文拒絕建 → **D1**
  - [x] **D-policy-count** — `<table>_read` / `_insert` / `_update`，每表三條 → **D6**
  - [x] **D-devplus** — `02a:253/255` 逐字重讀，欄位清單無遺漏、無自行發明
  - [x] **（追加）repository 檔數** — `asset.repository.ts` 一檔兩表 vs W08 兩檔，兩種先例並存 → **D2**
- [x] **Prong 2.5 — child component tree**：**N/A**（無前端變更）
- [x] **Prong 3 — schema verify**：`rm_reports` / `rm_report_versions` 在 schema 與 migration
      目錄中皆不存在；`check_entity_index.py` 現值 **17/35**；detector 用
      `{model, table, ALIASES}` 比對 → 兩個新 model 名與 `02a:40` 一致，**不需加 ALIAS**
- [x] **D-baselines** — 實測：api unit **315/31** · api int **145/11** · web **10/1** · lint **0/0** ·
      type clean ×2 · build clean ×2 · `run_all` **7/7** —— 全部與 W09 記錄相符
      （⚠️ coverage 留待 Day 2 full gate 一併跑，Day 0 未單獨執行 `test:cov`）
- [x] **Catalog drift** — progress.md Day-0 表格（D1-D6，交叉引用 plan §8；§4 標註 drift ID 不刪列）
- [x] **Go/no-go** — 範圍變動 **~12.5%**（16 條中 2 條）≤ 20% → **續行 Day 1**

### 0.2 Branch

- [x] ⏳ 確認 **PR #51 已 merge**（`gh pr view 51` → `MERGED`，merge commit `d6300ce`，
      2026-08-13 06:59:39Z，`laitim2001`），`git fetch --prune` 後 main 前進 `6446099..d6300ce`
- [x] `git checkout -b feature/W10-rm-report-snapshot`（從 `main` `d6300ce`）
      ⚠️ 本機 `chore/w09-status-flip` 的 `git branch -d` **失敗**（rebase merge 改寫了 SHA，
      ancestry 答不出來）→ 先用 `git cherry -v main` 確認 patch 已在 main（`-` 前綴）才 `-D`

---

## Day 1 — 兩張表與不可變性 (US-1, US-2, US-3)

### 1.1 Schema

- [x] **`schema.prisma` +2 model**（`RiskManagementReport` · `RMReportVersion`）
  - DoD: 欄位逐一對應 `02a:253/255`；`state` 不建且 docstring 寫明理由與三選一結論；
        `prepared_by`/`approved_by` 是 `String`；兩張表皆有 `org_entity_id` 與 §1.1 base fields
  - Verify: `npm run prisma:generate -w apps/api` → ✅ 20 models（13 → 20，header 同步修正）

### 1.2 Migration

- [x] **`20260813071857_rm_report_snapshot/migration.sql`**
  - DoD: 兩張表 + 兩條複合 FK + `FORCE ROW LEVEL SECURITY` +
        `rm_reports` 三條 policy（SELECT/INSERT/UPDATE）+
        `rm_report_versions` **兩條**（SELECT/INSERT，⛔ 無 UPDATE）+
        GRANT 無 UPDATE 於版本表；註解寫明「守衛是缺席的 policy，GRANT 只是縱深」
  - Verify: `prisma migrate dev` 套用成功；**`pg_policies` 實測 5 條**
        （`rm_reports` 3 / `rm_report_versions` **2**）· `relforcerowsecurity=t` ×2 ·
        `role_table_grants` 版本表僅 SELECT+INSERT

### 1.3 Ref code 前綴

- [ ] 🚧 **`ref-code.ts` +2 前綴** —— **Day-0 D1 證明此任務前提不成立**：該檔沒有前綴登記表，
      且 `:65-69` 明文拒絕建一個。**不刪本項**（保留「原計畫 vs 現實」軌跡）。
      解封條件：前綴改宣告為新 repository 的 module 常數，於 **Day 2.1** 完成並驗證與既有
      12 個前綴無衝突。屆時本項若仍未勾，代表 Day 2.1 也漏了。

### 1.x Partial gate

- [x] `npm run type-check -w apps/api` clean · `npm run lint -w apps/api` 0/0 ·
      **`check_entity_index` 17 → 19 / 35**（Day-0 預測「不需加 ALIAS」成立）

---

## Day 2 — Repository 與端點 (US-4)

### 2.1 Repository

- [ ] **`rm-report.repository.ts` + `rm-report-version.repository.ts`（+ 各自 spec）**
  - DoD: 各自的 scoped-client 介面**只含自己的 delegate**（不開父表 delegate）；
        發版是**單一交易**（insert 版本 → repoint 父表）；23503/23505 對應到既有 refusal 分類
  - Verify: `npm run test -w apps/api -- rm-report`

### 2.2 端點

- [ ] **`modules/rm-report/` 四檔 + `app.module.ts` 註冊**
  - DoD: 五個端點；查無一律 404；`isCurrent` 由指標**導出**不是欄位；
        controller spec 覆蓋 400 / 404 分支
  - Verify: `npm run test -w apps/api -- rm-report.controller`

### 2.3 整合測試

- [ ] **`rm-report.int.spec.ts`** —— 每張表四項範疇測試 + 不可變 + 指標完整性
  - DoD: 跨實體讀 404 / 跨實體寫拒絕且**資料未變**（逐欄位比對）/ RLS 層獨立成立
        （繞過 repository 直接 SQL）/ 滾升角色只見授權子樹；
        UPDATE 已發布版本被拒；跨報告與跨實體指標各一個 23503；
        第二版發布後**第一版逐欄位未變**
  - Verify: `npm run test:int -w apps/api -- rm-report`

### 2.x Full gate

- [ ] lint 0/0 · format clean ×2 · type clean ×2 · build clean ×2 ·
      api unit · api int · web 10 · `npm run test:cov -w apps/api` ≥ baseline ·
      `python scripts/lint/run_all.py` 7/7 · `check_entity_index` **19/35** · `lint:negative` PASS

---

## Day 3 — 元驗證 (US-5) — ⛔ 無 UI，本 phase 為 **gate-only verified**

_(本 phase 無 user-facing surface，故不做 drive-through。以中性化取代：
每一個守衛被關掉一次，證明綠燈來自守衛而不是來自測試的存在。
⛔ 報告一律寫「gate-only verified」，絕不暗示可用性。)_

### 3.1 預期方向（**必須在跑任何一項之前寫下**）

- [ ] **在 progress.md 寫下 N1..N4 的預期方向**，含**預期不動的那一項**
  - DoD: 每項標「預期轉紅的測試名稱 + 理由」或「預期不動 + 理由」；寫完才准執行
  - Verify: progress.md Day 3 有該表格且 commit 時間早於中性化執行

### 3.2 中性化（改 **migration 來源**，不改 live DB —— `AD-NeutraliseRebuiltState-1`）

- [ ] **N1** — 為 `rm_report_versions` 補上一條 `FOR UPDATE` policy + GRANT UPDATE
      → 預期：不可變測試由紅轉綠（即 UPDATE 成功）
- [ ] **N2** — 移除 `(current_version_id, id)` 複合 FK → 預期：跨報告指標測試轉綠
- [ ] **N3** — 移除 `(report_id, org_entity_id)` 複合 FK → 預期：跨實體子表 insert 轉綠
- [ ] **N4** — 移除版本表的 `FOR INSERT` policy 的 `WITH CHECK`
      → 預期方向於 3.1 事先寫下（`AD-BorrowedRefusal-1` 第 5 次的檢查點）
- [ ] **每項跑完整 int setup**（資料庫重建），逐項記錄實測 vs 預期
  - Verify: `npm run test:int -w apps/api -- rm-report`（每次中性化後）

### 3.3 復原

- [ ] **migration 復原為中性化前狀態**，全套 gate 重跑一次
  - DoD: `git diff` 對 migration 目錄為空；int 測試回到全綠
  - Verify: `git status --short apps/api/prisma/ && npm run test:int -w apps/api`

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-026-w10-rm-report-snapshot.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 **gate-only verified** 聲明
      + 三選一的結論 + `state` deviation）
- [ ] **`02a` §3.1 記錄 `state` deviation**，形式對齊 `02a:225` / `02a:219`

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 4 個資料點**；
      ratio 出 band 就標記 re-point；**必答**：舊式 bottom-up 7.0 hr 與 blueprint 80 min
      哪一個接近實測）
- [ ] `calibration-matrix.md` 那一行 —— 填這個骨架，**≤ 1 行 ~250 字元**
      （lint 上限 400；完整敘述 → `calibration-log.md`）：
      `| \`pattern-reuse-feature\` | <mult> | <mean> | KEEP/re-point (W10 ratio ~<Y> IN/OVER band; <一子句>; if 2nd >1.20 → <Z>; → calibration-log) |`
- [ ] Final gate sweep: lint 0/0 · format ×2 · type ×2 · build ×2 · api unit · api int · web 10 ·
      coverage ≥ baseline · `run_all` 7/7 · `check_entity_index` 19/35 · `lint:negative` PASS
- [ ] **`RISK_REGISTER.md` R4 敞口 15 → 17 張表**（兩張新表同樣無稽核，ADR-0003 未拍板）
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（新 AD 記入）· `ROADMAP.md` 第 4 列推進到 slice 7
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      ⚠️ **AP-3 重點檢查**：一張「快照表」而沒有產生快照的能力 —— §9 已明記，retro 需複查是否成立
- [ ] `plan.md` frontmatter `status:` 翻成 `closed`（R9），內文標記一致
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
