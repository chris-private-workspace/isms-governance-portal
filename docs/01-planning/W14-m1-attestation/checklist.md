# Phase W14 — Checklist (Attestation, and the second polymorphic link)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `91bd789`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：12 個編輯目標存在如預期（7 個 NEW 不存在；5 個 EDIT 存在）；
      `CH-031` 編號未被佔用（`ls docs/03-implementation/changes/ | sort -V | tail -1` 應為 `CH-030`）
      ✅ 7/7 absent · 5/5 exists · 最大號 `CH-030`
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-trigger-signature** — grep `assert_parent_in_scope` **全部**呼叫端（⛔ 不只 migrations/，
        也要掃 `*.spec.ts` 與 `__fixtures__`）。預期 2 個 trigger；> 2 就改用新增
        polymorphic 變體，**並把 plan §3.3 的做法移進 §Risks 而不是默默改掉**
        ✅ **預期 2、實際 2**（`:227` · `:236`）。⛔ **但抓到 plan 的機制缺口** ——
        函式讀 `TG_ARGV`，那是建 trigger 時寫死的字面值，換不掉 → **D1** 進 §Risks
  - [x] **D-audit-guard** — 讀 `audit-coverage.int.spec.ts` 的漂移守衛，確認它導出寫入面的方式
        **會**看見一個新的 repository。若它只掃硬編碼清單，那條守衛本身就是 Potemkin
        ✅ **守衛為真**（`:486-517` readdirSync + regex + 雙向比對）⇒ 1.1 的順序有意義
  - [x] **D-policy-column** — 讀 `policies` 的 RLS policy，確認加 bool 欄位不需重寫 policy
        ✅ `FOR ALL`，運算式只引用 `org_entity_id`
  - [x] **D-issue-source-stale** — 確認 `schema.prisma:573` 的過時註解不影響本片判斷（本片不修）
        ✅ 談的是 `IssueSource` 缺值，與 attestation 無關
  - [x] **D-subject-both-built** — ⭐ 確認 `policies` 與 `controls` **都**能提供 scope 查詢，
        這是 attestation 與 evidence 的關鍵差異（evidence 只有一個父表可查）
        ⛔⭐ **本次 Day 0 最高價值的發現** —— `controls_read` 含 `applies_to_scope = 'group' OR …`，
        group control 對任何實體合法可讀 ⇒ **acceptance 3 與 N1 的測試設計會變成恆真** → **D5**
- [x] **Prong 2.5 — child component tree** — **N/A**（無前端）
- [x] **Prong 3 — schema verify**：`attestations` 不存在；`Policy.requires_attestation` 不存在；
      `EvidenceLinkedType` 恰好一個值；migration head 與 `_prisma_migrations` 一致
      ✅ 前三項確認。⚠️ **第四項改用等價證據** —— `_prisma_migrations` 查詢用錯 role 而失敗，
      改以 int suite 的 `rebuilt, migrated and seeded` 為證；**兩者不等價**（它驗的是
      `isms_test` 不是 dev DB），已記在 progress.md
- [x] **D-baselines** — api unit 451/38 · api int 203/16 · web 10/1 ·
      coverage 92.27/91.66/98.95/93.64 · run_all 8/8 · entity-index 21/35 · lint/type/build 全 0
      ✅ **九項逐位對上**。⚠️ `lint:negative` 是 **root** script，`-w apps/api` 會 Missing script
- [x] **Catalog drift** — progress.md Day-0 表格 ✅ **D1–D8 八條**
- [x] **Go/no-go** — 範圍變動 ≤ 20% 繼續；20-50% 修訂 §Acceptance + §Workload 並再確認；> 50% 中止
      ✅ **GO** —— 估 ~15%，全部落在「怎麼做」而非「做什麼」；D1 / D5 / D6 / D8 已進 §Risks

### 0.2 Branch

- [x] ⛔ **先確認 PR #62 已 merge**（`gh pr view 62 --json state`）—— 未 merge 就從
      `chore/w13-post-merge-repoint` 開，並在 progress.md 記下這個選擇
      ✅ 已 merge（`cd2cc3e` → **`9ae6166`**，又是 rebase）⇒ 從 `main` 開
- [x] `git checkout -b feature/W14-attestation` ✅ pre-doc commit `7bea684`

---

## Day 1 — Schema + migration (US-1, US-3)

### 1.1 ⭐ 先證明 W13 漂移守衛會紅（US-4 的前置）

- [x] **在改 `AUDITED_MODELS` 之前**先建表 + repository，跑一次 int suite
  - DoD: **觀察到**漂移守衛轉紅，並記下它的錯誤訊息原文
  - ⛔ 順序不可顛倒 —— 先修再跑等於沒驗證過那條守衛
  - Verify: `npm run test:int -w apps/api`
  - ✅ **恰好 1 紅 / 202 綠**，訊息 `+ Array [ + "Attestation", ]` 落在 `unaudited`
    （`:514`）。15 條覆蓋測試**一條未動** ⇒ 守衛的偵測獨立於它們。原文記於 progress.md

### 1.2 `Attestation` model + migration

- [x] **`schema.prisma` 的 `Attestation` + migration.sql 建表**
  - DoD: `02a:235` 六個欄位 + §1.1 base fields；`subject_id` 無 FK；
        RLS 四條 per-command policy（沿用 ADR-0014 形狀，無 `FOR DELETE`）
  - Verify: `npm run prisma:migrate -w apps/api`
  - ✅ 建成。⛔ **DoD 的「四條」依 Day 0 D8 修正為 2 條**（`INSERT` / `SELECT`）——
    原文保留：四條與「無 `FOR DELETE`」本來就不可能同時成立。理由見 progress.md Day 1
  - ⚠️ Verify 指令**未照抄執行** —— `prisma migrate dev` 在 dev DB 有 W10 留下的 checksum
    衝突（W11 遇過同一件事）。改以 int suite 的 `rebuilt, migrated and seeded` 為證
- [x] **`result` 建 / `status` 不建的理由寫進 schema docstring**
  - DoD: 引用 `02a:417`（其他 lifecycle 清單獨缺 Attestation）+ W07 對 `ControlTest.result`
        的相反方向判斷；**是有記錄的偏離，不是疏漏**
  - Verify: Read 該段
  - ✅ 另外記了 `result` 用 String 的理由 —— 本 schema 兩個先例分歧
    （`Evidence.kind` String vs `SoA.implementation_status` enum），分野是**值域有沒有外部來源**

### 1.3 `Policy.requires_attestation`

- [ ] 🚧 **阻塞：AP-3 —— 這個欄位今天沒有讀者也沒有寫者**
  - **`bool NOT NULL DEFAULT false`**
  - DoD: 既有 policy 列全部拿到 `false`，不需要 backfill 腳本
  - Verify: `npm run test:int -w apps/api` policy suite 不變
  - ⛔ **理由**：attestation 的 create **不可能**讀它（`ScopedAttestationClient` 刻意不暴露
    `policy` —— 那是 oracle 防線）· plan §4 把 `policy.controller.ts` 標為 **UNTOUCHED**
    ⇒ create 不接受它 · 無 workflow（M5）· 無 UI ⇒ **永遠為 `false`，關掉不會壞任何東西**。
    這正是 W07 拒絕在 `EvidenceLinkedType` 建第二個值時用的那把尺
    （"a setting nobody can exercise"）
  - ✅ **已裁定 2026-08-15（使用者）：(a) 移出本片 → M6。**
    三個選項原文保留：(a) 移出本片 → M6；(b) 擴大範圍讓 `policy.controller.ts` 的 create
    接受它（plan §4 需改）；(c) 明示接受並在 retro AP-3 自檢記為 1 次違規
  - **解封條件**：Policy 模組真的要讀這個欄位的那一片（M6）。
    ⛔ 本項**維持未勾** —— 它不是做完了，是被移出了。追蹤登記在
    `BACKLOG.md` 的 `AD-PolicyAttestationFlag-1`，因為 ROADMAP 第 9 列的教訓是
    **有解封條件的東西必須出現在一份會被讀的清單上**，而 checklist 在 phase 收尾後沒有人會回頭掃

### 1.x partial gate

- [x] `npm run type-check -w apps/api` · `npm run lint -w apps/api` ✅ **0 · 0**
- [x] `python scripts/lint/check_entity_index.py` → **22 / 35** ✅ 機械導出（`models in schema.prisma: 23`）

---

## Day 2 — Trigger 分支 + endpoints + 稽核 (US-2, US-4)

### 2.1 ⭐ Trigger 依 `linked_type` 分支

- [x] **`evidence_linked_in_scope` 改為依 `NEW.linked_type` 決定查哪張父表**
  - DoD: `control_test` → 查 `control_tests`；`attestation` → 查 `attestations`；
        ⛔ **未知值仍 raise**（fail-closed 保留）；`OR UPDATE` 保留
  - Verify: `npm run test:int -w apps/api`
- [x] **不可分辨性**：「撞別實體的 id」與「不存在的 id」回同一個錯誤
  - DoD: 兩個案例的 SQLSTATE **與訊息**都相同 —— 否則是 W10 量到的那種 oracle
  - Verify: 兩條整合測試逐一斷言

### 2.2 `EvidenceLinkedType` + 端點

- [x] **enum 加 `attestation`** · **attestation create + list 端點**
  - DoD: create 走 `runScoped`；list 依範疇過濾；查無資料回 **404 不回 403**
  - Verify: `npm run test:int -w apps/api`

### 2.3 稽核接上

- [x] **`AUDITED_MODELS` 15 → 16 + 覆蓋測試 +1**
  - DoD: 1.1 觀察到的紅**恰好因此變綠**；覆蓋斷言**依 `refCode` 查**不用 count delta
        （W13 已踩過：兩個 AppModule suite 平行跑是 race）
  - Verify: `npm run test:int -w apps/api`

### 2.4 四個範疇測試（US-2）

- [x] **跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 / 滾升只見授權子樹**
  - DoD: ⛔ **每個斷言都要有非空前提**（先斷言對造實體確實有 N > 0 列）——
        W13 補過 4 處恆真斷言，同一個形狀不要再造一次
  - Verify: `npm run test:int -w apps/api`

### 2.x Full gate

- [x] format api/web · lint · type-check · build api/web · `lint:negative` ·
      api unit · **api int** · web · coverage · `run_all` 8/8 —— **各自的 exit code 分開記**

---

## Day 3 — 中性化驗證 (US-5) — ⚪ 無 drive-through（純後端）

### 3.1 Clean restart

- [x] `prisma migrate reset` + 乾淨重啟；確認新程序是 3210 的唯一擁有者，擷取 startup log
      （見 `task-workflow.md` §Risk Class C —— 孤兒 worker 可能仍在服務該 port）
  - ⚪ **N/A 而非執行** —— 本 phase 純後端，3210 上沒有長駐 dev server 可殺。
    int suite 的 global setup **每次 DROP + CREATE + migrate + seed**，
    所以 Risk Class C 描述的失效模式在這裡結構上不成立。
    ⛔ 記錄而非略過：這一項對前端 / 長駐服務 phase 仍然必要

### 3.2 ⭐ 預期方向先 commit，再執行

- [x] **四個中性化的預期紅數逐測試寫下並 commit**
  - DoD: ⛔ 逐測試（不是總數）；⛔ **先 grep 消費者再預測** ——
        W13 的 N1/N3 少算就是因為列了「我以為會受影響的 suite」
        （`AD-NeutralisationConsumerGrep-1`）
  - Verify: commit hash 記入 progress.md
- [x] **N1** 移除 trigger 的 attestation 分支 → 跨實體 attestation 證據**可插入**
- [x] **N2** 移除 `AUDITED_MODELS` 的 `Attestation` → **恰好 2 紅**（覆蓋 + 漂移守衛），其餘不動
- [x] **N3** 移除 `EvidenceLinkedType` 的 `attestation` → 型別錯誤
- [x] **N4** 拿掉範疇測試的非空前提 → 該測試仍紅（前提不是裝飾）

### 3.3 逐項對照

- [x] **實際 vs 預測逐項寫入 progress.md**
  - DoD: 數字不符要寫明**少算了什麼**與**為什麼**，不是只記差額
- [x] **還原驗證**：`git status` 空 + 重跑回 Day 2 的數字

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-031-w14-attestation.md`**
      （Problem / Root Cause / Solution / Verification / Impact）
      ⚪ **Verdict 必須寫「gate-only verified」** —— 純後端，不得暗示可用性
      [非 spike ⇒ **不產 design note**]
      ✅ 建立。Verdict 寫 ⚪ **gate-only verified**；Impact 記下**兩項不對稱的 rollback**
      （`ALTER TYPE ADD VALUE` 不可逆 · `evidence_linked_in_scope` 是 DROP 後重建）

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 7 個資料點**；
      ratio 出 band 就標記 re-point）
      ✅ ratio **1.08–1.13 IN**（committed 2.0 hr / actual 2.15–2.27 hr）⇒ **KEEP**，不 re-point
- [x] ⭐ **量法對照**：plan §7 宣告的「逐段相加並排除 > 60 min 間隙」vs 原始窗口法，
      兩者若不同即為 `AD-CalibrationWindowCrossSession-1` 的第一個實測資料點
      ✅ **兩者相同**（逐位 **100.88 min**，六個間隙最大 34.87 min）。
      ⛔ **這只證明新量法不擾動舊量法答對的那一類** —— W13 的跨 session 失效模式在本 phase
      **結構上不可能重現**，故未被驗證修復。該 AD **不關閉**，解封條件已寫上去
- [x] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `calibration-log.md`）
      ✅ **325 字元**（⚠️ 超過 ~250 的目標值但在 lint 上限內；`rules-hygiene` 8/8 綠）
- [x] Final gate sweep：十一項**各自的 exit code 分開記**（不是「都過了」）
      ✅ 實際跑了 **13 項**（十一項 + `format:check` 拆 api/web、`build` 拆 api/web），**全部 exit 0**。
      ⚠️ script 的 `tail -25` 把 coverage 的 `All files` 摘要切掉 —— 判定沒錯
      （退出碼取自 `PIPESTATUS[0]`），但**數字重跑一次才拿到**
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile
      （⛔ **≤ 300 字元** —— `AD-MemoryEntryRatchet-1`：13 個 phase 從 186 漲到 401，
      每次都拿前一個當範本；**不要看前一條的長度**）· `BACKLOG.md` · `ROADMAP.md`（**兩處都改**）
      ✅ MEMORY.md 條目 **293 字元**（先寫再量，未參照前一條）· ROADMAP **item 4 + MHist 兩處** ·
      BACKLOG **+2 AD / 4 更新 / Shipped index +1**，計數 106 → **108** 照抄 detector 輸出 ·
      順帶修掉 MEMORY.md 上「PR #61 pending」的 stale（#61 已 merge 為 `91bd789`）
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      ⛔ **AP-7 = 1（我造成的）** —— Day 2 改 `AUDITED_MODELS` 15→16 沒改 `audit.module.ts` 的
      docstring，而那段的第一句正是「rerun the derivation」。Day 4 重跑導出（**17 delegates /
      23 models / 6 無寫入路徑**）並修正三句。其餘 AP 皆 0 或 N/A；**AP-3 攔下 1 次**（US-3）
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
- [ ] ⏳ **post-merge**：若又是 rebase merge，全 repo 掃描重指被改寫的 SHA
      （`AD-DesignNoteAnchor-1` 已連續 5 次）；`git cherry` 驗證後刪分支
      （⛔ `git branch -d` 對 rebase merge 會拒絕，那是預期不是錯誤）
