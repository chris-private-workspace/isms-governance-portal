# Phase W08 — Checklist (Issue + Action，與複合 FK 的分流驗收)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `edb5853`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 28 個目標逐一確認（NEW 檔不存在；EDIT 檔存在）；
      `CH-023` 未被佔用 —— **grep 全 repo 的 `CH-\d+` 引用，不用 `ls` 目錄**（`AD-ChNumber-1`）；
      plan 引用的每個 `AD-*` 在 `BACKLOG.md` 存在（`AD-AdRegistry-1`）
      → 16（plan）+ 11（checklist）個 AD 全部存在；`CH-02[3-9]` 零命中
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-denominator** — 手數 `02a` §0 得 23+9+4=36，BACKLOG 記 35 → 逐節重數並記錄哪一節差
        → **差在 foundation services 節**（該節 5 列 = 9 個實體，非 8）
  - [x] **D-refcounter** — ✅ 已定案為**明記排除**（使用者 2026-08-12）→ 剩下的是
        grep `schema.prisma` 確認還有沒有第二張同類基礎設施表，白名單一次列全
        → 13 個 model 中僅此一張；⛔ **plan 的排除理由是錯的，已更正**（它**有** `org_entity_id`）
  - [x] **D-source** — grep `02a` 全檔確認 `Issue.source` 是否真的沒有配對 id 欄位
        → 確認：裸 enum，§5 也無 Issue→ControlTest 的邊
  - [x] **D-verifiedby** — grep `02a` 確認 `verified_by` 型別是否另有定義
        → 全檔僅 `:231` 一處無型別；命名慣例（`_by` vs 同行的 `_user_id`）指向 `createdBy` 形狀
  - [x] **D-issuestatus** — 確認 `risk_accepted` 是否需指向 `risks` 的欄位
        → `:379-380` 只在狀態機，無欄位 → 與 D-source **同形狀**，合併為一條 AD
  - [x] **D-anchor** — `02a` 目前被幾處 `file:line` 錨定（決定 §3.x 編輯的行數紀律強度）
        → **329 處 / 66 檔**（扣 W08 自身 25 = 304），比 `AD-MdAnchorLineShift-1` 記的大一個數量級
  - [x] **D-namemap（Day 0 新增）** — `ExtensionField` / `extension_fields` /
        `extension_field_catalog` 三名不一致 → detector 需明文別名映射；已入 plan §Risks
- [x] **Prong 2.5 — child component tree** — **N/A**（無前端變更）
- [x] **Prong 3 — schema verify**：`issues` / `actions` 對 `schema.prisma` + `migrations/` 零命中；
      `asset_groups` 複合錨點與 `assets` 複合 FK 的實際 SQL 逐字讀出（藍本確認）；
      `_prisma_migrations` 的 checksum 與檔案 sha256 相符（`AD-MigrationChecksum-1`）
      → **10/10 逐字相符**，全部 `finished_at` 非空；複合 FK 藍本實為 **2 個**實例
- [x] **D-baselines** — 逐 workspace 分開跑，**不用 `tail`**：unit 235/23 · int 105/8 · web 10 ·
      coverage 92.58/92.32/96.26/94 · lint 0/0 · build ×2 · `run_all` 6/6 · `lint:negative` PASS
      → **逐項與 W07 記錄一致，零漂移**
- [x] **Catalog drift** — progress.md Day-0 表格 → **12 條**
- [x] **Go/no-go** — 範圍變動 % → 繼續 / 修訂 §Acceptance + §Workload / 中止
      → **GO**（< 10%；無一條改變 §4／§5 主體）

### 0.2 Branch

- [x] `git checkout -b feature/W08-issue-and-action`（從 `main` `edb5853`，**不從已合併的 feature branch 延續** —— `AD-DesignNoteAnchor-1` 第三形態；驗證 `git rev-parse HEAD` == `origin/main`）
      → `edb58539d06f40a43b4f2e12bd8b3bf7ffe17c40`，match **True**

### 0.3 實體計數 detector（US-1）

- [x] **`scripts/lint/check_entity_index.py`**
  - DoD: 由 `schema.prisma` 的 `^model` 與 `02a` §0 索引導出 `built N / total M`；
        `schema \ 索引` 非空即 exit 1；排除清單是**明文白名單**不是 pattern
  - Verify: `python scripts/lint/check_entity_index.py`
  - → `OK (12 / 36 Wave-1 entities built)`；逐節印出 23 + 9 + 4
- [x] **負面 fixture — 孤兒 model**
  - DoD: fixture 內一個不在索引上的 model，detector 對它 **exit 1**；
        self-test **不在旗標後面**，每次執行都跑（W02 的做法）
  - Verify: 跑 detector 對 fixture，確認 exit code = 1 且訊息指名該 model
  - → `SELF-TEST PASS — fixture orphan detected`（`ShadowLedger`）。fixture 三個 model
    分別走 model 名 / ALIASES / 無命中三條路徑
- [x] **`run_all.py` 收錄**
  - DoD: `run_all` 由 6/6 變 **7/7**
  - Verify: `python scripts/lint/run_all.py`
  - → **7/7 passed**（改完導航檔後重跑仍 7/7，`rules-hygiene` 通過 = CLAUDE.md byte 預算未爆）
- [x] **`02a` §0 的 `RefCodeCounter` 處置**
  - DoD: 依 D-refcounter 的定案寫入；⚠️ **該檔行數不得改變**（`AD-MdAnchorLineShift-1`）
  - Verify: `git diff --numstat docs/02-architecture/02a-data-model-spec.md` 顯示 `N/N`（增刪相等）
  - → **1/1**；總行數 **495 = 495**；`02a:229` / `:231` 逐字仍是 Issue / Action 規格行（三項都是量的）
  - → ⚠️ **實作偏離已記錄**：清單住在 detector 的 `EXCLUDED`，`02a` §0 只**同行追加**指標
    （plan 原寫「`02a` §0 加清單」與 304 處錨點的行數紀律不相容）
- [x] **計數結果比對**
  - DoD: detector 印出的分子/分母與 `CLAUDE.md` · `ROADMAP.md` 現行的 12/35 比對；不符則兩處一併更正
  - Verify: 逐處貼出 detector 輸出與文件現值
  - → **不符**：分母真值 **36**。`CLAUDE.md:79` 與 `ROADMAP.md:72` 已改為 12/36
    （CLAUDE.md 的「其餘 23」一併改為 24）。⏳ `BACKLOG.md:71` · `STATUS_AUDIT.md` 留 Day 4 / 下次審計
- [x] **N0 元驗證 — `EXCLUDED` 是 load-bearing 的**（計畫外，`AD-NegativeGate-1` 要求）
  - DoD: 把 `EXCLUDED` 清空後，對**真** schema 必須 FAIL 並指名 `RefCodeCounter`
  - Verify: 中性化 → `FAIL — 1 model(s) on no index row: RefCodeCounter` / EXIT=1；還原 → EXIT=0
  - → self-test 只證明 detector 抓得到 fixture；本項證明它抓得到**真 schema 裡**的那一個

---

## Day 1 — Issue + Action 的表與 repository (US-2, US-3)

### 1.1 `Issue` model + migration

- [ ] **`schema.prisma` +1 model +2 enum（`IssueSource` · `IssueSeverity` · `IssueStatus`）**
  - DoD: 欄位照 `02a:229` + §1.1 base fields；`source` 只有 `test` / `manual`；
        `@@unique([id, orgEntityId])` 存在，docstring 寫明**為什麼它給得起而 `controls` 給不起**
  - Verify: `npx prisma validate`；讀回 docstring 確認無 orphan claim
- [ ] **migration：`issues` 表 + per-command policies**
  - DoD: `FOR SELECT` / `FOR INSERT` / `FOR UPDATE`，**無 `FOR DELETE`**；`FORCE ROW LEVEL SECURITY`
        跟隨 W07 的決定；複合唯一鍵在 SQL 裡確實存在
  - Verify: `npm run prisma:migrate -w apps/api` 後查 `pg_policies` 逐條列出

### 1.2 `Action` model + migration

- [ ] **`schema.prisma` +1 model +1 enum（`ActionStatus`）**
  - DoD: 欄位照 `02a:231`；`verified_by` 依 D-verifiedby 的結論，docstring 記錄推斷依據
  - Verify: `npx prisma validate`
- [ ] **migration：`actions` 表 + 複合 FK + per-command policies**
  - DoD: `FOREIGN KEY (issue_id, org_entity_id) REFERENCES issues(id, org_entity_id)`；
        policies 同 §1.1
  - Verify: `\d actions` 讀出約束定義（不是 grep migration 檔）

### 1.3 Repository × 2

- [ ] **`issue.repository.ts` + `.spec.ts`**
  - DoD: 藍本 `control-test.repository.ts`；`ISSU-` 發號；SQLSTATE → `scope-refusal.ts` 的映射
  - Verify: `npm run test -w apps/api -- issue.repository`
- [ ] **`action.repository.ts` + `.spec.ts`**
  - DoD: 同上；`ACTN-` 發號；複合 FK 違反（`23503`）映射到 `UnknownReferenceError`
  - Verify: `npm run test -w apps/api -- action.repository`
- [ ] **`scoped-client.types.ts` +2 介面**
  - DoD: 結構型別自宣告（W03 的技術），**不是** DI token；⛔ `ScopedActionClient` **不得**含 `issue`
  - Verify: `npm run type-check -w apps/api`

### 1.x Partial gate

- [ ] `npm run lint -w apps/api` · `npm run type-check -w apps/api`（**分開跑，取各自退出碼**）

---

## Day 2 — 端點與整合測試 (US-2, US-3, US-4)

### 2.1 Controller + module × 2

- [ ] **`modules/issue/` — controller + module + `.controller.spec.ts`**
  - DoD: 藍本 `modules/control-test/`；create-only；server-owned 欄位不收呼叫者輸入
  - Verify: `npm run test -w apps/api -- issue.controller`
- [ ] **`modules/action/` — controller + module + `.controller.spec.ts`**
  - DoD: 同上
  - Verify: `npm run test -w apps/api -- action.controller`
- [ ] **`bootstrap/app.module.ts` 掛 2 個 module**
  - DoD: 兩組路由在 `/api-docs` 出現
  - Verify: 啟動後 `curl http://localhost:3210/api-docs-json` 確認路徑存在

### 2.2 整合測試 — 四個範疇測試 × 2

- [ ] **`issue.int.spec.ts`**
  - DoD: 跨實體讀拒 / 跨實體寫拒且**資料未變** / RLS 層獨立成立 / 滾升角色只見授權子樹
  - Verify: `npm run test:int -w apps/api -- issue.int`
- [ ] **`action.int.spec.ts`**
  - DoD: 同上，另加 §3.4 的三個分流測試
  - Verify: `npm run test:int -w apps/api -- action.int`
- [ ] **繞開發號的直接寫入測試（`AD-BorrowedRefusal-1` 第 4 次的防線）**
  - DoD: 不經 repository、**不產生 `RETURNING`**、不帶 `ref_code`；
        在 `actions` 自己的 `WITH CHECK` 中性化下**會紅**
  - Verify: 中性化 → 跑 → 確認轉紅 → 還原 → 再跑
- [ ] **`int-global-setup.js` 種入跨範疇 fixture**
  - DoD: SG1 的 issue + HK1 的 issue 各一，供跨實體引用測試使用
  - Verify: 重建 `isms_test` 後查列數

### 2.x Full gate

- [ ] lint 0/0 · format:check ✅×2 · type-check ✅×2 · unit · int · web · build ✅×2 ·
      `run_all` **7/7** · `lint:negative` PASS · coverage ≥ Day-0 baseline
      （⚠️ **逐 workspace 分開跑，不用 `tail`**）

---

## Day 3 — API-level 驗證 + 元驗證 (US-4, US-5) — 真進程 + 真 PostgreSQL

_(⚪ 本 phase **無 UI**，故不做 drive-through。所有結論一律寫
**「API-level verified（gate + 真進程 + 真 PostgreSQL），無 UI，不主張可用性」**，
**絕不**寫「verified」或「~X% working」。)_

### 3.1 Clean restart

- [ ] **乾淨重啟**
  - DoD: 殺掉陳舊 dev server / 孤兒 worker；確認新程序是 3210 的**唯一擁有者**；
        擷取證明 wiring 生效的 startup log 行（`task-workflow.md` §Risk Class C）
  - Verify: 列出所有 node 程序的 PID / PPID / StartTime，確認無父程序已死的殘留
        ⚠️ 殺之前先確認那不是使用者或其他 session 的程序

### 3.2 API-level 走查（不是 drive-through）

- [ ] **`POST /issues` 主路徑** —— 建立、回應含 `ISSU-` ref_code、跨實體讀取回 **404 不是 403**
- [ ] **`POST /actions` 主路徑** —— 綁到自己 entity 的 issue 成功
- [ ] **`POST /actions` 跨實體引用** —— `issue_id` 指向另一 entity 的 issue → 被拒，
      錯誤訊息**只帶欄位名不帶 id**
- [ ] observed-vs-intended 對照 → progress.md Day 3（逐項貼出實際回應，不是摘要）

### 3.3 元驗證（每個宣稱會擋東西的機制各中性化一次）

- [ ] **N1 — 移掉 `actions` 的複合 FK** → §3.4 測試 1 必須**轉綠**
  - DoD: 這是 D1 分流的**核心驗收** —— 若移掉後仍然紅，擋住的不是複合 FK，必須查清是誰
  - Verify: 中性化前後各跑一次，逐次貼出結果
- [ ] **N2 — 中性化 `issues` 的 `WITH CHECK`** → 對應測試轉紅
- [ ] **N3 — 中性化 `actions` 的 `WITH CHECK`** → 對應測試轉紅（含 2.2 的直接寫入測試）
- [ ] **N4 — 中性化 `issues` 的 `USING`** → 跨實體讀測試轉紅
- [ ] **N5 — 中性化 `actions` 的 `USING`** → 跨實體讀測試轉紅
- [ ] **N6 — detector 的孤兒 model fixture** → `run_all` 轉為 6/7 fail
- [ ] **零轉紅一律先查再下結論**
  - DoD: 任何一項零轉紅時，先查 `pg_policies` / `\d` 證實編輯真的生效，
        再判斷是「沒被測到」還是「編輯沒生效」（W06 N4/N5 的教訓）
  - Verify: 逐項貼出 anchor 中性化前後的**逐字差異**

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-023-w08-issue-and-action.md`**
  - DoD: Problem / Root Cause / Solution / Verification / Impact；
        含 API-level 驗證結論（**不得寫 drive-through PASS**）+ 關掉的 AD
  - Verify: 逐條對照 plan §5 的 11 項 Acceptance
- [ ] **W07 design note 追加 D1 分流結果**
  - DoD: 記錄「判準第一次導出選項 B 且被中性化驗收」；
        ⚠️ **同行追加，不得改變該檔行數**（`AD-MdAnchorLineShift-1`）
  - Verify: `git diff --numstat` 顯示增刪相等
- [ ] **新 AD 登記到 `BACKLOG.md`**
  - DoD: `Issue.source` 無配對 id（規格缺口）· D-denominator 的結論 · Day 1-3 發現的其他
  - Verify: 逐條在 BACKLOG 可見，不是只寫在 progress

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，第 2 個資料點；
      ⚠️ 第 1 個定義受污染 → 兩點不構成窗口；ratio 出 band 就標記 re-point）
- [ ] `calibration-matrix.md` 那一行 —— 填這個骨架，**≤ 1 行 ~250 字元**
      （lint 上限 400；完整敘述 → `calibration-log.md`）：
      `| \`pattern-reuse-feature\` | 0.50 | <mean> | KEEP/re-point (W08 ratio ~<Y> IN/OVER band; <一子句>; if 2nd >1.20 → <Z>; → calibration-log) |`
- [ ] **`AD-BottomUpBlueprint-1` 的驗收** —— 用「寫差異」估法後 `actual / bottom-up` 是否回到 ≥ 0.4；
      是則可關，否則記錄「問題不在估法」
- [ ] **`git diff --name-status <base>..HEAD` 對照 plan §4** —— 抓漏做的附帶動作
      （`AD-DecisionSideEffect-1`，成本 < 1 min）
- [ ] Final gate sweep: lint 0/0 · format:check ×2 · type-check ×2 · unit · int · web ·
      build ×2 · `run_all` **7/7** · `lint:negative` PASS · coverage
      （⚠️ 逐 workspace 分開跑，取真退出碼）
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（CLOSE 掉 `AD-EntityCountDerivation-1` / `AD-EntityIndexIncomplete-1`）·
      `ROADMAP.md` 主線第 4 列 · `RISK_REGISTER.md` R4（10 → 12 張無稽核寫入的表）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **frontmatter `status:` 翻 `closed`**（R9 —— 只 commit code 不算收尾）
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
