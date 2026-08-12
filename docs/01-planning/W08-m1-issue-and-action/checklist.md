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

- [x] **`schema.prisma` +1 model +2 enum（`IssueSource` · `IssueSeverity` · `IssueStatus`）**
  - DoD: 欄位照 `02a:229` + §1.1 base fields；`source` 只有 `test` / `manual`；
        `@@unique([id, orgEntityId])` 存在，docstring 寫明**為什麼它給得起而 `controls` 給不起**
  - Verify: `npx prisma validate`；讀回 docstring 確認無 orphan claim
  - → `The schema at prisma\schema.prisma is valid 🚀`。⚠️ **實為 3 個 enum**（本行標題寫 +2
    卻列了 3 個名字，起草筆誤）；連同 `ActionStatus` 全 phase 共 **4 個**，plan §3.0/§4 寫 3
  - → ⭐ 額外寫進 docstring 的兩個**規格缺口**（不是實作選擇）：`source` 是裸 enum
    （追不回哪一次 test）· `risk_accepted` 無指向 `risks` 的欄位。皆按 已確認參數 #9 記錄不發明
- [x] **migration：`issues` 表 + per-command policies**
  - DoD: `FOR SELECT` / `FOR INSERT` / `FOR UPDATE`，**無 `FOR DELETE`**；`FORCE ROW LEVEL SECURITY`
        跟隨 W07 的決定；複合唯一鍵在 SQL 裡確實存在
  - Verify: `npm run prisma:migrate -w apps/api` 後查 `pg_policies` 逐條列出
  - → 兩張表**同一個 migration**（`20260812211801_issue_and_action`，Prisma 一次生成，非兩個）。
    `pg_policies` 實查：`issues_read`/`_insert`/`_update` 三條、無 DELETE；
    `relrowsecurity=t relforcerowsecurity=t`；GRANT 為 `INSERT,SELECT,UPDATE`
  - → ⚠️ **時間戳有真問題並已處置**：Prisma 用 **UTC**（`20260812131655`），而 W07 手建的
    `20260812164500_correct_parent_guard_comment` 用**本地時間** → 新 migration 會排在一個
    **已套用**的之前。重命名為 `20260812211801`（本地當下，晚於它）。⛔ 這不是編時間 ——
    目錄名的唯一功能是排序，而正確的順序就是它現在表示的。→ 記 AD

### 1.2 `Action` model + migration

- [x] **`schema.prisma` +1 model +1 enum（`ActionStatus`）**
  - DoD: 欄位照 `02a:231`；`verified_by` 依 D-verifiedby 的結論，docstring 記錄推斷依據
  - Verify: `npx prisma validate`
  - → `verified_by` **給了 FK**（不同於同後綴的 `created_by`/`updated_by`）：§1.1 把那兩個標
    "Audit"（列的 metadata），§3 把這個列為 Action 自己的欄位。領域引用給 RI，稽核 metadata
    是 ADR-0003 的事。欄位名保留 `verified_by` 不改成 `_user_id`（已確認參數 #9）
  - → **不建 `owner_user_id`**：`assignee_user_id` 就是它的 contextual owner，兩欄一義正是
    `Asset` docstring 拒絕過的形狀
- [x] **migration：`actions` 表 + 複合 FK + per-command policies**
  - DoD: `FOREIGN KEY (issue_id, org_entity_id) REFERENCES issues(id, org_entity_id)`；
        policies 同 §1.1
  - Verify: `\d actions` 讀出約束定義（不是 grep migration 檔）
  - → `pg_constraint` 實查：`actions_issue_id_org_entity_id_fkey -> FOREIGN KEY (issue_id,
    org_entity_id) REFERENCES issues(id, org_entity_id) ON UPDATE CASCADE ON DELETE RESTRICT` ✅
  - → ⭐ **無 `assert_parent_in_scope` trigger**（刻意）——`pg_trigger` 實查兩表各只有
    `validate_extensions`。複合 FK 就是這裡的機制；Day 3 N1 會移掉它驗證這句話

### 1.3 Repository × 2

- [x] **`issue.repository.ts` + `.spec.ts`**
  - DoD: 藍本 `control-test.repository.ts`；`ISSU-` 發號；SQLSTATE → `scope-refusal.ts` 的映射
  - Verify: `npm run test -w apps/api -- issue.repository`
  - → 8 個測試全過，檔案覆蓋率 **100 / 100 / 100 / 100**
- [x] **`action.repository.ts` + `.spec.ts`**
  - DoD: 同上；`ACTN-` 發號；複合 FK 違反（`23503`）映射到 `UnknownReferenceError`
  - Verify: `npm run test -w apps/api -- action.repository`
  - → 9 個測試全過，覆蓋率 **100 / 100 / 100 / 100**。含一條**呼叫序列**斷言
    （`['catalog','issueRefCode','insert']`）—— 它釘的是「中間沒有人去查父列」
- [x] **`scoped-client.types.ts` +2 介面**
  - DoD: 結構型別自宣告（W03 的技術），**不是** DI token；⛔ `ScopedActionClient` **不得**含 `issue`
  - Verify: `npm run type-check -w apps/api`
  - → EXIT=0。`ScopedIssueClient` 無需辯護的省略（它是**父**表）；`ScopedActionClient` 不含 `issue`
- [x] **錨點重新校準**（計畫外 —— `AD-DesignNoteAnchor-1`「造成偏移的 phase 負責」）
  - DoD: 本 phase 對 `schema.prisma` 的插入位移了既有行號；**活參考**逐一改，歷史快照不追
  - Verify: 逐一 grep 實際新行號，**不推算**
  - → 量到：`Entity-scoped ON PURPOSE` 163→**174** · `model RefCodeCounter` 172→**183** ·
    `model AssetGroup` 538→**622** · 其複合錨點 569→**653** · controls 拒絕錨點段 808-812→**892-896**
  - → 已改 5 處活參考：`check_entity_index.py` · W07 design note（×2，**行數 344=344 不變**）·
    `BACKLOG.md:77` · `ROADMAP.md:77` · W08 plan（4 處）。
    不追：`CH-022` · `W07/retrospective.md` · `memory/project_w07_*`（歷史快照）

### 1.x Partial gate

- [x] `npm run lint -w apps/api` · `npm run type-check -w apps/api`（**分開跑，取各自退出碼**）
  - → lint 0 · type-check 0 · format **首跑 1**（兩個 repository 的長 import）→ `prettier --write`
    → 0；重驗 CR count = **0**（prettier 未引入 CRLF）
  - → 完整 unit suite: **252 / 25 suites**（Day-0 為 235/23）；coverage
    **93.02 / 92.76 / 96.39 / 94.35**，四項**全部高於** Day-0 baseline
  - → `run_all` **7/7**，`entity-index` 自動由 12/36 變 **14 / 36** —— 這是 Day-0 那個 detector
    真的在導出而非硬編碼的證明（我沒有碰它）

---

## Day 2 — 端點與整合測試 (US-2, US-3, US-4)

### 2.1 Controller + module × 2

- [x] **`modules/issue/` — controller + module + `.controller.spec.ts`**
  - DoD: 藍本 `modules/control-test/`；create-only；server-owned 欄位不收呼叫者輸入
  - Verify: `npm run test -w apps/api -- issue.controller`
  - → ⭐ **本專案第一個 body 帶 enum 的端點**，而那需要前幾片都不需要的東西：
    Prisma 拒絕未知 enum variant 的錯誤**不帶** `scope-refusal.ts` 認得的 SQLSTATE，
    所以沒有守衛時 `{"severity":"urgent"}` 是 **500** —— 一個 typo 被回報成故障。
    合法值由 `Object.values(IssueSource)` **導出**不是抄寫（抄寫會在 schema 加 variant 時變成謊）
- [x] **`modules/action/` — controller + module + `.controller.spec.ts`**
  - DoD: 同上
  - Verify: `npm run test -w apps/api -- action.controller`
  - → `issueId` 直通；`status`/`completedAt`/`verifiedBy` 三者一起被擋（三者同時可設 = 自簽自核）
- [x] **`bootstrap/app.module.ts` 掛 2 個 module**
  - DoD: 兩組路由在 `/api-docs` 出現
  - Verify: 啟動後 `curl http://localhost:3210/api-docs-json` 確認路徑存在
  - → ⏳ **路由存在性留到 Day 3 §3.2 用真進程驗**（Day 2 只有 `build` EXIT=0 證明它編得起來，
    那**不證明**路由掛上了 —— 依 `verification-discipline.md`，這裡不宣稱）

### 2.2 整合測試 — 四個範疇測試 × 2

- [x] **`issue.int.spec.ts`**
  - DoD: 跨實體讀拒 / 跨實體寫拒且**資料未變** / RLS 層獨立成立 / 滾升角色只見授權子樹
  - Verify: `npm run test:int -w apps/api -- issue.int`
  - → 9 個測試全過。⚠️ 這是**平淡的那個**：Issue 是父表、不引用任何東西，所以沒有
    trigger 或 key 能擋在它的 `WITH CHECK` 前面 —— 只需要兩個 bypass 而不是三個
- [x] **`action.int.spec.ts`**
  - DoD: 同上，另加 §3.4 的三個分流測試
  - Verify: `npm run test:int -w apps/api -- action.int`
  - → 11 個測試全過。測試 4 = **Day 3 N1 的目標**（移掉複合 FK 後必須轉綠）；
    測試 5 = oracle（absent 與 unreadable 訊息**逐字相同**）；測試 6 = UPDATE 重指向
  - → ⭐ 順帶量到一個 W07 沒有的好處：**FK 不需要被要求就涵蓋 UPDATE**，
    而 W07 的 trigger 必須明寫 `BEFORE INSERT OR UPDATE` 才行 —— 少一件會被忘記的事
- [x] **繞開發號的直接寫入測試（`AD-BorrowedRefusal-1` 第 4 次的防線）**
  - DoD: 不經 repository、**不產生 `RETURNING`**、不帶 `ref_code`；
        在 `actions` 自己的 `WITH CHECK` 中性化下**會紅**
  - Verify: 中性化 → 跑 → 確認轉紅 → 還原 → 再跑
  - → 已寫成 `action.int.spec.ts` 測試 8，**第三個 bypass 是刻意設計的**：
    `issueId: HK1_ISSUE` 配 `orgEntityId: HK1` —— **這一對是匹配的**，所以複合 FK 滿足、
    無法代勞。⛔ 顯而易見的寫法（`SG1_ISSUE` + `HK1`）會靠 key 的 23503 通過而
    `actions_insert` 從未被評估 —— 那就是第 4 次。⏳ **中性化驗收是 Day 3 N3**
- [x] **`int-global-setup.js` 種入跨範疇 fixture**
  - DoD: SG1 的 issue + HK1 的 issue 各一，供跨實體引用測試使用
  - Verify: 重建 `isms_test` 後查列數
  - → issues `a80`/`a81` · actions `a90`/`a91`，各實體一筆；`issue`/`action` 兩個
    ref_code counter 由種入的列**導出**不是寫死（否則第一個經 API 建立的會拿到已用的號）

### 2.x Full gate

- [x] lint 0/0 · format:check ✅×2 · type-check ✅×2 · unit · int · web · build ✅×2 ·
      `run_all` **7/7** · `lint:negative` PASS · coverage ≥ Day-0 baseline
      （⚠️ **逐 workspace 分開跑，不用 `tail`**）
  - → lint 0/0 · format ×2 · type-check ×2 · build ×2 · web 10 · `run_all` **7/7**
    （`entity-index` 仍 14/36）· `lint:negative` PASS（**41** 檔 0 bypass 3 allowlisted）
  - → unit **276 / 27 suites** · int **125 / 10 suites**
  - → ⚠️ **coverage 三項低於 Day-0 baseline**（92.07/91.9/96.63/93.62 vs 92.58/92.32/96.26/94）
    → **已歸因，不是本 phase 的退化**：`modules/*/*.module.ts` 全部是 0%（既有 7 個皆然 ——
    asset · control · control-test · evidence · policy · risk），因為它們是 DI metadata、
    沒有可測邏輯。我加的是第 8、9 個，每加一個就稀釋一次。
    jest 門檻是 80/70/80/80，四項**遠高於**它 → gate 綠。⛔ **趨勢本身要記** → Day 4 進 BACKLOG

---

## Day 3 — API-level 驗證 + 元驗證 (US-4, US-5) — 真進程 + 真 PostgreSQL

_(⚪ 本 phase **無 UI**，故不做 drive-through。所有結論一律寫
**「API-level verified（gate + 真進程 + 真 PostgreSQL），無 UI，不主張可用性」**，
**絕不**寫「verified」或「~X% working」。)_

### 3.1 Clean restart

- [x] **乾淨重啟**
  - DoD: 殺掉陳舊 dev server / 孤兒 worker；確認新程序是 3210 的**唯一擁有者**；
        擷取證明 wiring 生效的 startup log 行（`task-workflow.md` §Risk Class C）
  - Verify: 列出所有 node 程序的 PID / PPID / StartTime，確認無父程序已死的殘留
        ⚠️ 殺之前先確認那不是使用者或其他 session 的程序
  - → **3210 本來就沒有 listener，沒有東西要殺**。14 個 node 程序逐一檢視：3200 是本專案的
    web dev server（PID 11688→36748，**8/8 啟動，非本 session**）· 另有別專案 frontend ·
    azurite · playwright MCP · statusline —— **一個都沒碰**
  - → 啟動 log 擷取（這是 Day 2 刻意不宣稱的那件事的證據）：
    `IssueModule dependencies initialized` · `ActionModule dependencies initialized` ·
    `Mapped {/issues, GET}` `{/issues, POST}` `{/actions, GET}` `{/actions, POST}` ·
    `WARN [DevPrincipal] DEV PRINCIPAL ACTIVE` · `listening on http://127.0.0.1:3210`
  - → 收工後 `TaskStop` + 複驗：**3210 free**，無父程序已死的殘留 worker

### 3.2 API-level 走查（不是 drive-through）

- [x] **`POST /issues` 主路徑** —— 建立、回應含 `ISSU-` ref_code、跨實體讀取回 **404 不是 403**
  - → A2 **201** `ISSU-SG1-000001`，`status:"open"`，`dueDate`/`ownerUserId`/`description` 皆 null
  - → A3 **404** `org entity …c1 not found`（訊息帶的是**呼叫者自己送的** id，非查得的）
  - → ⭐ A4 `severity:"urgent"` → **400** `severity must be one of: low, medium, high, critical`
    —— 沒有這個守衛時它是 **500**。本 phase 新增的那一段，第一次在真進程上被驗
  - → A5 `source:"audit"` → **400** `source must be one of: test, manual` —— 清單是**導出的**
- [x] **`POST /actions` 主路徑** —— 綁到自己 entity 的 issue 成功
  - → B1 **201** `ACTN-SG1-000001`，`completedAt`/`verifiedBy` null、`status:"open"`
  - → B4 `GET /actions` 列出它；B5 `GET /issues` 只見 SG1 的，看不到手動種入的 HK1 那筆
- [x] **`POST /actions` 跨實體引用** —— `issue_id` 指向另一 entity 的 issue → 被拒，
      錯誤訊息**只帶欄位名不帶 id**
  - → ⭐ **API 層的 oracle 測試**：為此在 `isms_dev` 種了一筆 HK1 的 issue（`…dd01`）
    - B3a（**存在**但不可讀）→ 404 `issue or assignee not found`
    - B3b（**不存在**）　　 → 404 `issue or assignee not found`
    - **逐字相同** —— 呼叫者無法分辨「屬於別人」與「不存在」
- [x] observed-vs-intended 對照 → progress.md Day 3（逐項貼出實際回應，不是摘要）

### 3.3 元驗證（每個宣稱會擋東西的機制各中性化一次）

> ⚠️ **措辭更正**：plan / 本檔原寫 N1「必須**轉綠**」，指的是**被禁止的操作變成成功**。
> 而測試斷言的是拒絕，所以那個判準的可觀察形式是**測試從 pass 變 fail**。兩者是同一件事，
> 但「轉綠」字面讀起來像「測試通過」，會把判準讀反。以下一律用「測試轉紅／轉綠」的字面意思。
>
> ⚠️ **中性化必須改 migration 檔本身**，不能只改資料庫：`int-global-setup.js:317-318` 每次
> `test:int` 都 `DROP DATABASE … WITH (FORCE)` + `CREATE` + `migrate deploy`，任何直接下的
> SQL 會被沖掉。六次編輯／還原後 `isms_dev` 的 checksum 逐字複驗（見 3.3 末項）。

- [x] **N1 — 移掉 `actions` 的複合 FK** → §3.4 測試 1 必須**轉綠**（= 測試 4 **轉紅**）
  - DoD: 這是 D1 分流的**核心驗收** —— 若移掉後仍然紅，擋住的不是複合 FK，必須查清是誰
  - Verify: 中性化前後各跑一次，逐次貼出結果
  - → **3 failed, 8 passed**，而且是**正確的三個**：
    測試 4「SG1 may NOT action HK1's issue」→ `Received promise resolved instead of rejected`
    （**插入成功了** —— 擋住它的確實是這把鑰匙）· 測試 5 oracle → `Received constructor: Object` ·
    測試 6 UPDATE 重指向 → `resolved instead of rejected`
  - → ⭐ **順帶證實 Day 2 記的那個好處**：測試 6 從未為 UPDATE 寫過任何額外 SQL，
    而它隨 FK 一起失效 —— FK 免費涵蓋 UPDATE，W07 的 trigger 必須明寫 `OR UPDATE`
  - → 其餘 **8 個全綠**（含測試 8 的 RLS、9、10、11）—— 它們**不依賴**這把鑰匙
- [x] **N2 — 中性化 `issues` 的 `WITH CHECK`** → 對應測試轉紅
  - → **1 failed, 8 passed** —— **只有**測試 7（`issues_insert` 的專屬測試）
- [x] **N3 — 中性化 `actions` 的 `WITH CHECK`** → 對應測試轉紅（含 2.2 的直接寫入測試）
  - → **1 failed, 10 passed** —— **只有**測試 8。⭐⭐ `AD-BorrowedRefusal-1` **第 4 次確認不存在**：
    Day 2 刻意讓 `(issueId, orgEntityId)` 配對匹配好讓複合 FK 無法代勞，這裡證明了那個設計有效
  - → ⚠️ **順帶量到一件要記的事**：測試 6（issue）與測試 9（action）—— 兩個「cross-entity WRITE
    through the repository」—— 在 INSERT policy 中性化下**仍然綠**。它們借的是 `ref_code_counters`
    的拒絕（W05 的形狀）。**這不是缺口**，因為 7/8 才是 INSERT policy 的專屬測試且正確轉紅；
    但那兩個測試的**名稱比它們實際證明的寬** → 記進 progress
- [x] **N4 — 中性化 `issues` 的 `USING`** → 跨實體讀測試轉紅
  - → **2 failed**：測試 5（跨實體讀）+ 測試 9（roll-up）。roll-up 一起紅是**正確的** ——
    它也走 SELECT policy，`USING(true)` 讓它看到全部
- [x] **N5 — 中性化 `actions` 的 `USING`** → 跨實體讀測試轉紅
  - → **2 failed**：測試 7 + 測試 11，同上
- [x] **N6 — detector 的孤兒 model fixture** → `run_all` 轉為 6/7 fail
  - → ⚠️ **第一版設計錯誤**：把 `ShadowLedger` 改名成 `Policy2` + table `policies`，
    以為它就不再是孤兒 —— 而 `Policy2` / `policies` **都不在**索引上（索引寫的是 `Policy`），
    所以它**仍然是孤兒**，run_all 照樣 7/7。⛔ **EXIT=0 讀起來像 N6 通過**
  - → 更正版：改成 `Risk` + `risks`（**真的在**索引上）→ `run_all` **6/7**，
    `[FAIL] entity-index`；還原後回 **7/7**
- [x] **零轉紅一律先查再下結論**
  - DoD: 任何一項零轉紅時，先查 `pg_policies` / `\d` 證實編輯真的生效，
        再判斷是「沒被測到」還是「編輯沒生效」（W06 N4/N5 的教訓）
  - Verify: 逐項貼出 anchor 中性化前後的**逐字差異**
  - → 每次中性化都先印 `anchor found: True`，還原後印 `restored byte-identical: True`
  - → **零轉紅發生 1 次（N6 第一版），查了，是我的元驗證設計錯而非機制沒被測到**
  - → 六次編輯／還原後複驗 `isms_dev` migration checksum：
    db `8d66d0c7…` = file `8d66d0c7…` **match True**（`AD-MigrationChecksum-1`）

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-023-w08-issue-and-action.md`**
  - DoD: Problem / Root Cause / Solution / Verification / Impact；
        含 API-level 驗證結論（**不得寫 drive-through PASS`**）+ 關掉的 AD
  - Verify: 逐條對照 plan §5 的 11 項 Acceptance
  - → Verdict 寫 **⚪ API-level verified，無 UI，不主張可用性**；四個 load-bearing 細節逐一寫出
- [x] **W07 design note 追加 D1 分流結果**
  - DoD: 記錄「判準第一次導出選項 B 且被中性化驗收」；
        ⚠️ **同行追加，不得改變該檔行數**（`AD-MdAnchorLineShift-1`）
  - Verify: `git diff --numstat` 顯示增刪相等
  - → **1/1**，行數 **344 = 344**。追加內容明記「⛔ 選 D 對 `ControlTest` 仍然正確，
    本段不推翻它 —— 判準沒變，只是第一次遇到符合另一側的父表」
- [x] **新 AD 登記到 `BACKLOG.md`**
  - DoD: `Issue.source` 無配對 id（規格缺口）· D-denominator 的結論 · Day 1-3 發現的其他
  - Verify: 逐條在 BACKLOG 可見，不是只寫在 progress
  - → 新增 **6** 條：`AD-IssueBareEnum-1`（**M7 前必須拍板**）· `AD-MigrationTimestampTz-1` ·
    `AD-ModuleCoverageDilution-1` · `AD-TestNameWiderThanProof-1` · `AD-MetaVerificationBug-1` ·
    `AD-CalibrationIdleGap-1`；關閉 **2** 條；更新 `AD-BorrowedRefusal-1`（第 4 次）與
    `AD-BottomUpBlueprint-1`（提議被執行且失敗，附替代方案）；`§Known Issues` 的 detector 條件標為已交付
  - → §Open **75 條（P0 5 / P1 46 / P2 24）**，⚠️ 兩種數法對照後才取值（見 BACKLOG 開頭）

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，第 2 個資料點；
      ⚠️ 第 1 個定義受污染 → 兩點不構成窗口；ratio 出 band 就標記 re-point）
  - → ⚠️ **兩個定義給出差 3.6 倍的答案，兩個都列**：窗口 **0.84 IN** / 逐段 **0.23 UNDER**。
    差額 169/238 min 是等待使用者，**可獨立機械算出**且與逐段量測交叉驗證（69 vs 66）
  - → 官方取拍板的定義（0.84），但**明記那個 IN 是巧合** —— 169 分鐘恰好把 0.23 抬進 band
- [x] `calibration-matrix.md` 那一行 —— 填這個骨架，**≤ 1 行 ~250 字元**
      （lint 上限 400；完整敘述 → `calibration-log.md`）
  - → 已填；`rules-hygiene` PASS（行 ≤ 400 字元）。完整敘述進 `CALIBRATION-LOG.md` §1
- [x] **`AD-BottomUpBlueprint-1` 的驗收** —— 用「寫差異」估法後 `actual / bottom-up` 是否回到 ≥ 0.4；
      是則可關，否則記錄「問題不在估法」
  - → ⛔ **沒有回到 0.4，反而更低**：**0.116**（W07 是 0.17）。四段全在 9-12 倍、**無離群值**
  - → 結論：**「拆得更細」不是答案** —— 每項都用同一個錯誤的單位成本。**AD 不關**，
    附上替代方案（三級藍本度 × 實測單位成本，目前只有第三級的資料 ≈ **8 min/項**），
    ⚠️ 樣本只有一個 phase → **下個 phase 先照舊估一次再比對**，不現在改 plan 模板
- [x] **`git diff --name-status <base>..HEAD` 對照 plan §4** —— 抓漏做的附帶動作
      （`AD-DecisionSideEffect-1`，成本 < 1 min）
  - → **28 個目標全部命中，零計畫外檔案**；UNTOUCHED 五項全部未動。本次無漏做的附帶動作
- [x] Final gate sweep: lint 0/0 · format:check ×2 · type-check ×2 · unit · int · web ·
      build ×2 · `run_all` **7/7** · `lint:negative` PASS · coverage
      （⚠️ 逐 workspace 分開跑，取真退出碼）
  - → lint 0/0 · format ×2 · type-check ×2 · build ×2 · web ✅ · unit **276 / 27 suites** ·
    int **125 / 10 suites** · coverage **92.07 / 91.9 / 96.63 / 93.62** ·
    `run_all` **7/7**（含 `rules-hygiene` 與 `status-markers` E1-E4 clean）·
    `lint:negative` PASS（**41** 檔 0 bypass 3 allowlisted）
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（CLOSE 掉 `AD-EntityCountDerivation-1` / `AD-EntityIndexIncomplete-1`）·
      `ROADMAP.md` 主線第 4 列 · `RISK_REGISTER.md` R4（10 → 12 張無稽核寫入的表）
  - → 全數完成。⚠️ **計畫外的小修**：`MEMORY.md` 的 W05/W06/W07 三條 Keywords **原本錯位**
    （65 是 W06 的、66 是 W05 的，W07 **完全沒有**）—— 在我要加 W08 的同一區塊，故一併歸位
    並補上 W07 缺的那行。**沒有刪除任何既有 Keywords**
  - → `RISK_REGISTER` R4 從「反諷」升為「合規閉環缺一角」：CAPA 的 `status` 可被任何值覆寫
    任何值而**沒有東西記錄那次覆寫**，`risk_accepted` 是一次沒有簽名的正式風險接受
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
  - → **總計 0**。AP-7 逐一檢查三處新註記（`02a:19` · design note D1 · schema 兩個 enum
    docstring）皆指向**存在**的東西；AP-3 由 11 項 API-level 走查 + **N1-N6 六次中性化**支撐
- [x] **frontmatter `status:` 翻 `closed`**（R9 —— 只 commit code 不算收尾）
  - → `status: closed`；`check_status_markers` 回報 13 pre-doc、**E1/E2/E3/E4 clean**
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
