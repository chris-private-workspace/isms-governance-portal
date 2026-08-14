# Phase W12 — Checklist (Audit-trail hash chain spike → ADR-0003)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `1c5a6ac`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 14 個目標逐一確認（NEW 檔不存在 / EDIT 檔存在）；
      `CH-029` 編號未被佔用；`docs/02-architecture/design-notes/` 存在
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -1`
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-fields** — `multi-tenant-data.md` §稽核軌跡 的欄位**逐欄**對照 `05:21` 的六項
        Content 要求（actor / action / target / before-after / timestamp / source context），
        缺哪一項要指名
        ⚠️ **不得用命中數代替逐欄讀**（`AD-NarrowPatternWideClaim-1`，本週第 4 次）
  - [x] **D-txn** — ⭐ 讀 `scoped-prisma.provider.ts` 的交易邊界，回答：
        「讀 `prev_hash` 與寫新列**能不能**在同一個交易內」。**這一格決定選項 A/C 可不可行**
  - [x] **D-intercept** — 讀 ADR-0004 §Consequences 的實際措辭，確認「攔截點與 entity-scope
        共用」是**它說的**還是 `decision-form.md:25` 的轉述
  - [x] **D-index** — `02a` §0 的 `audit_log` 那一列仍為 Wave 1 且註記未變；
        `AuditLog` / `audit_log` 在 `schema.prisma` 零命中
  - [x] **D-throughput** — 取得**接稽核之前**的單次寫入基準（沒有它就沒有「變慢多少」）
  - [x] **D-appendonly** — 讀 W10 的 `rm_report_versions` migration：append-only 當時被量到
        是 **GRANT** 在擋不是 policy。確認今天那個結論的措辭，本 phase 的 N3 要重量一次
- [x] **Prong 2.5 — child component tree**：**N/A**（無前端）
- [x] **Prong 3 — schema verify**：`audit_log` 不存在；migration head 與 `schema.prisma` 一致；
      ⛔ 確認 dev DB checksum 漂移（`AD-DevDbChecksumDrift-1`）**是否仍在** ——
      仍在則 migration 手寫，並記下 `_prisma_migrations` 的查詢結果
- [x] **D-baselines** — api unit **376 / 35** · api int **172 / 13** · web **10 / 1** ·
      coverage **91.83 / 91.01 / 97.5 / 93.29** · `run_all` **8/8** ·
      `check_entity_index` **20 / 35** · lint 0 · type 0 · build clean ×2
  - ⛔ **逐項取 exit code**（各自 `> log 2>&1; echo $?`），不共用管線後的 `$?`（W11 D9）
- [x] **Catalog drift** — progress.md Day-0 表格（`D1..Dn`）
- [x] **Go/no-go** — 範圍變動 % → 繼續 / 修訂 / 中止
  - ⛔ **D-txn 若答「不能同交易」** → §3.2 的選項 A/C 要改形狀（W10 的 DB trigger 退路），
    那是 20-50% 範圍變動 ⇒ **修訂 plan 並跟使用者再確認**，不要默默改

### 0.2 Branch

- [x] `git checkout -b feature/W12-audit-trail`（從 `main` `1c5a6ac`）

---

## Day 1 — Table · chain · verify (US-1, US-2)

### 1.1 Model + migration

- [ ] **`schema.prisma`：`model AuditLog`** + **`migrations/<ts>_audit_log/migration.sql`**
  - DoD: `entity_id NOT NULL`；`actor_id` **假名且 docstring 註明永不存個資**（`02a:311`）；
    ⛔ **GRANT 只有 SELECT + INSERT**，且**不建 `FOR UPDATE` / `FOR DELETE` policy**；
    per-command policy 只有 read + insert 兩條
  - Verify: `npx prisma validate` + int suite（它 DROP+CREATE 後 `migrate deploy`）
  - ⚠️ **用 Write/Edit 工具寫 migration，不用 heredoc**（W09/W10/CH-027 三次同形違反）

### 1.2 兩個 chain 策略（⚠️ Day-0 D3 後由三個縮為兩個，使用者核可）

- [ ] **A = migration 內的 `AFTER INSERT` trigger（PL/pgSQL）· B = `chain.ts` 應用層錨定**
  - DoD: 兩者各有「竄改一列 → verify 指出**第一個**斷點」的測試；共用同一個 hash 定義
  - Verify: `npm run test -w apps/api -- chain`
  - ⛔ **起手先確認 `pgcrypto` 可用** —— A 是本 repo 第一段做 hash 的 PL/pgSQL，
    寫完才發現沒有 digest 函式的代價是重寫
  - ⭐ **C 不實作** —— 由 A、B 的數字推導；ADR 中必須寫明那是**推導不是量測**

### 1.3 verify-integrity routine

- [ ] **`audit-trail/verify.ts` + spec**
  - DoD: 回報**第一個**斷點的位置，不是布林值；空鏈與單列鏈各有測試
  - Verify: `npm run test -w apps/api -- verify`

### 1.x partial gate

- [ ] format ×2 · lint · type-check · api unit —— **逐項取 exit code，只報跑過的**

---

## Day 2 — Interception · scope tests · measurement (US-3, US-4)

### 2.1 攔截點 + 接上 1 個模組

- [ ] **`contracts/audit-hook.ts`（介面）+ `scoped-prisma.provider.ts`（依賴它）+
      `audit.module.ts` + `app.module.ts`（接線）**
  - DoD: 接上 **1 個模組**（`soa`）；該模組的寫入**繞不過**；
    ⛔ **`npm run lint` 必須綠** —— 那是邊界矩陣的機械證明（Day-0 D1）
  - Verify: `npm run test:int -w apps/api -- audit` + `npm run lint`
  - ⛔ **不改 `eslint.config.mjs` 的 MATRIX** —— 它守著 CH-012 的常駐負面案例

### 2.2 範疇測試 + 竄改偵測

- [ ] **`audit.int.spec.ts`：4 個範疇測試 + 竄改偵測**
  - DoD: 跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 /
    **append-only 由誰擋要指名**（GRANT vs policy —— W10 在這裡量到過反直覺結果）
  - Verify: `npm run test:int -w apps/api -- audit`

### 2.3 量測

- [ ] **`bench.int.spec.ts`：A vs B × 寫入 / 驗證成本 + 對照組**
  - DoD: p50 / p95 寫入延遲（真實 endpoint 路徑，**非孤立 INSERT**）；
    驗證耗時（鏈長 1k / 10k）；**對照組 = 未接稽核的同一路徑**（D-throughput 的基準）
  - ⛔ **這是跨層比較**（PL/pgSQL vs TypeScript）—— 結果表要標明，不得假裝兩個數字同質
  - Verify: 結果表寫進 progress.md
  - ⚠️ **預期方向先寫下來再跑**（同 W10 / W11 的中性化紀律）

### 2.x Full gate

- [ ] format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit · api int ·
      web · coverage（**branch / funcs 不低於 baseline**）· `run_all` 8/8 ·
      `check_entity_index` **21 / 35**
  - ⛔ **十一項全跑才能說「gate 全綠」**

---

## Day 3 — 整合驗證（純後端 ⇒ 無 drive-through）(US-5)

_(本 phase 無 user-facing surface。報告一律寫 **gate-only verified**，絕不暗示可用性。)_

### 3.1 中性化預測（⛔ 寫下並 **commit** 之後才執行）

- [ ] **四個中性化的預期方向寫進 progress.md 並 commit**
  - DoD: N1 `prev_hash` 串接 · N2 攔截點 · N3 append-only（補 UPDATE GRANT）· N4 SELECT policy
    —— 每個寫明**預期哪些測試轉紅、哪些不動**
  - ⚠️ **中性化 = 放行，不是刪除**（W11 在 N4 用了刪除，量到的是 no-op 而非 guard）

### 3.2 執行 + 逐項對照

- [ ] **四個中性化各自執行、還原、記錄**
  - DoD: 每次跑完立即還原並驗證（`git diff` 濾掉註解行後為空）；控制組與最終還原各驗一次
  - ⛔ **零轉紅先查再下結論**；⛔ **方向不符預期時先懷疑元驗證本身**（`AD-MetaVerificationBug-1`）
  - ⛔ **補完測試後必須重跑該中性化**（W10 與 W11 各在這裡漏過一次）

### 3.3 ADR-0003 的可證偽條件（⛔ 這是 ADR 能否採納的門檻）

- [ ] **從量測導出可證偽條件，寫進 ADR**
  - DoD: 條件是**可觀測、可重跑**的（例：「若寫入 p95 超過 X ms，本決定作廢」），
    不是「若需求改變」這種永遠不會被觸發的句子
  - Verify: `14-adr/README.md` 的 forcing-function 判準逐條對照

### 3.x Full gate（⛔ 逐項複製 Day 2 §2.x 的清單 —— 中性化本身會改 code）

- [ ] format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit · api int ·
      web · coverage · `run_all` 8/8 · `check_entity_index` 21/35
  - ⛔ **`AD-PartialGateReportedAsFull-1` 已 3 次，全部是 `format:check`，全部因為
    Day 3 改了 code 而 gate 停在 Day 2**

---

## Day 4 — closeout

### 4.1 Change record + design note

- [ ] **`docs/03-implementation/changes/CH-029-w12-audit-trail.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含量測表 + **gate-only verified** 聲明）
- [ ] **`docs/02-architecture/design-notes/W12-audit-trail.md`** —— ⛔ **spike 強制**，
      對照 `docs/rules-on-demand/spike-design-note-gate.md` 的 **8-point gate** 逐項自查
      （必須有實作 + `file:line` + 可重現驗證；**extract 不是 pre-write**）
- [ ] **`docs/14-adr/0003-audit-trail-hash-chain.md`** 採納 + `decision-form.md` OQ-4 → 已拍板

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`spike` 0.65，**第 6 個資料點**；
      ⚠️ 自報量法 = **含 Day 0，窗口為 branch 首個 commit → closeout commit**）
  - ⛔ **actual 等 closeout commit 真的存在之後再算** —— 不得用預估收尾時間
    （`AD-EstimateAsMeasurement-1` 已被記 2 次，第 2 次就是算錯了 band 判定）
- [ ] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）
- [ ] Final gate sweep（十一項全跑，逐項寫實際數字）
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated + **Tech Stack 那格的 ADR 清單**（0003 已採納）·
      `MEMORY.md` pointer + subfile · `BACKLOG.md`（新增 AD + §Shipped 加 1 行）·
      `ROADMAP.md` · `RISK_REGISTER.md`
  - ⛔ **R4 的措辭**：本 phase 交付的是**機制**，18 張表裡只接了 1 張 ——
    **不得寫成「已解決」**，要寫「首次有 mitigation，覆蓋 1 / 19」
  - ⛔ **BACKLOG 計數在最後一次編輯之後跑** `python scripts/lint/check_backlog_counts.py`
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      ⚠️ 含 **AP-1**：A 與 B 之中被 ADR 否決的那一個，留在 repo 裡是不是 side-track？
      判準是 **ADR 有沒有引用它的量測數字**；若沒有，它應該被刪而不是留著
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view` 驗證後翻 `status:` 標籤
  - ⚠️ **rebase merge 會改寫 SHA** —— 引用「預測寫在前面」的 commit 要改指 main 側並補
    **author date**（W11 量到它逐秒不變，第 3 個資料點）
