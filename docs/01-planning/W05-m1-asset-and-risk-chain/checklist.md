# Phase W05 — Checklist (M1 slice 2: the asset-based risk chain)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `a2b1906`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 NEW 檔皆不存在、EDIT 檔皆存在；
      `CH-020` 未被佔用（**grep 全 repo 的 `CH-\d+` 引用，不是 `ls` 目錄** —— `AD-ChNumber-1`）；
      下一個可用 ADR 編號以 `Glob docs/14-adr/*` 確認（**`0002/0003/0008/0009` 是有主題的預留，不可填**）
      → **10 個路徑，0 漂移**；`CH-020` 僅出現在 W05 自己的 pre-doc（未被佔用）；ADR **0013** 可用
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] ⛔ **D-tablename** — `02a` 的 `Threat`/`Vulnerability` vs `multi-tenant-data.md:61` 的
        `threat_library`/`vulnerability_library`。**兩處都是權威** → **Day 0 裁決，不可拖到 Day 2**
  - [x] **D-ratingname** — `02a:405` 的 `rating_inherent`/`rating_residual` vs `:194-195` 的
        `score_before`/`score_after`。**Grep 全 `docs/`** 確認哪一套被別處引用（可能是 §7 儀表板 vs §3 實體）
        → ⭐⭐ **不是命名漂移，是兩個概念**：`score_*` 是 1–25 整數、`rating_*` 是分帶。
        **儀表板數的是分帶**（`02a:414` · `03:90` · `08:25`）。⛔ 仍不建 `rating_*` —— `02a:405`/`:429`
        自相矛盾且 `:429` 是開放決策 #5「Confirm before M7」→ 建了就是替未拍板的決定選邊。已入 plan §8
  - [x] **D-riskscales** — `risk_scales` 在 `multi-tenant-data.md:62` 清單上但表不存在。
        確認它是「已規劃未建」還是「寫了但沒人打算建」→ **直接決定 D2 的可行選項**
        → ⭐ 全 repo **只有 `multi-tenant-data.md:65` 一處**，`02a` 從未提過 →
        建它得**自行發明欄位**（違反參數 #9）。**D2-C 的理由因此升級**，不只是零消費者
  - [x] **D-w04shape** — W04 design note §2 七個不變式**逐條**確認仍成立（本 phase 要複製它們）
        → **八個 `file:line` 錨點全部解析成功**，藍本未漂移
  - [x] **D-entityindex** — 確認五個實體**都已在 `02a` §0 索引表上**（若已在則 §0 不需改，
        plan §3.0 依賴這個判斷）
        → **五個全在 `02a:29-31`**（成對格）→ §0 不需改。
        ⚠️ 第一次 grep 回報 0 是我 pattern 錯（要求獨佔首格）—— **零命中先證明搜對地方**
- [x] **Prong 2.5 — child component tree** — **N/A**（無前端工作）
- [x] **Prong 3 — schema verify**：
  - [x] `AssetGroup`/`Asset`/`Threat`/`Vulnerability`/`Risk` 在 `schema.prisma` 與
        `prisma/migrations/**` **零命中**（確認是新建不是重建）
        → 唯一命中是 `schema.prisma:164-166` 的 **W04 註解**（→ Day 2 必須更新，orphan claim）
  - [x] ⭐ **D-devdb** — `isms_dev` 的 `_prisma_migrations` **head 比對 + checksum 比對**
        （`AD-MigrationChecksum-1`：W04 只驗 `applied=true`，Day 2 才撞到 checksum 不符）
        → **5 目錄 / 5 列 / 全 applied，且五個 sha256 逐一相符** —— 升級後的檢查生效，起點乾淨
- [x] **D-baselines** — 逐項跑並記實際輸出（**不經 pipe，看退出碼** —— `AD-GrepAssertion-1`）：
      unit 86 · int 34 · web 10 · lint 0 · type 0 · format 0 · build 0 · `run_all` 6/6 ·
      `lint:negative` PASS（18 檔 0 bypass 3 allowlisted）· coverage 94.11/90.42/92.45/94.76
      → **全部相符**（逐項獨立取退出碼，不經 pipe）
- [x] **Catalog drift** — progress.md Day-0 表格（`D-<name>` + Finding + Implication，交叉引用 plan §8）
- [x] **Go/no-go** — 範圍變動 ≤20% 繼續 / 20-50% 修訂並再確認 / >50% 中止重寫
      → **~5% → 繼續 Day 1**（兩個發現都不改交付內容，只強化裁決理由 + 加一條 §8 風險）

### 0.2 Branch

- [x] `git checkout -b feature/W05-m1-asset-risk-chain`（從 `main` `a2b1906`）

---

## Day 1 — 拍板評分與校準的落點 (US-2)

### 1.1 ⛔ D1 / D2 — derived 欄位與閾值

- [ ] **量測與論證 D1 三個選項**（plan §3.1），產出可引用的證據而非偏好
  - DoD: 三個選項各有一段「它會讓什麼表達不出來」；**實測 PostgreSQL generated column
    能否引用同表其他欄位**（不要靠記憶引用文件）
  - Verify: 論證寫進 progress.md Day 1，**含反方論據**
- [ ] **量測與論證 D2 三個選項**，並回答「per-entity 校準今天有沒有消費者」
  - DoD: 明確回答已確認參數 #7「只能改設定」與 AP-5 的衝突怎麼解
  - Verify: 論證寫進 progress.md Day 1
- [ ] **向使用者呈報 D1 + D2 並取得拍板**
  - DoD: 使用者明確選定；⛔ **助手不得代選**（CLAUDE.md §禁止反模式）
  - Verify: 拍板記錄在 progress.md，含日期與理由
- [ ] **若判為架構級 → 寫 ADR-0013 承載「評分與校準住在哪裡」**
  - DoD: ADR 含**可證偽條件**；明寫它約束哪些**未來**實體（Assessment / ControlTest / posture_snapshot）
  - Verify: `Read` 該 ADR，確認 `**Status**: 已採納` 且理由不是「因為方便」

### 1.2 D3 / D4 拍板

- [ ] **D3 `cia_type` 形狀** · **D4 `Threat`/`Vulnerability` 表名**
  - DoD: 各一句決定 + 一句理由；D4 必須說明**為何某一份文件的用詞勝出**（權威排序）
  - Verify: 兩個決定寫進 progress.md Day 1

### 1.3 `risk-score.ts`（US-3）

- [ ] **`LKH × MAX(FIN,BOP,LRY,REP,SIS)`，值域 1–25，五個 impact 缺一不可**
  - DoD: 純函式；**不接受部分輸入**；`02a:136` 逐字對照
  - Verify: `npm run test -w apps/api`
- [ ] ⭐ **測試必須會抓到公式錯誤**
  - DoD: `MAX` 換成 `SUM` / 平均 / 只取 FIN 時**至少一個案例要紅**
  - Verify: ⚠️ fixture **刻意避開 SUM == MAX 的輸入**（否則 SUM 版本會通過而測試看起來有效）

### 1.x partial gate

- [ ] `npm run test -w apps/api`（新測試綠）+ `python scripts/lint/run_all.py` → 6/6

---

## Day 2 — 建五張表與端點 (US-1, US-4)

### 2.1 五張表 + migration

- [ ] **`schema.prisma` 加 5 model + enum；migration 含表 + RLS + GRANT（形狀依 D1–D4）**
  - DoD: `AssetGroup`/`Asset`/`Risk` 有 `org_entity_id NOT NULL` + RLS policy + `FORCE`；
    `Threat`/`Vulnerability` **docstring 明寫引用 `multi-tenant-data.md:63` 的既有清單**
    （⚠️ **不是新增例外** —— 若寫成新增，那就是 W04 那條規則沒被正確消費）
    （行號由 Day-0 `D-tablename` 更正：plan 與本檔原寫 `:61`）
  - Verify: `npm run prisma:migrate -w apps/api`；`\d+ <table>` 逐表確認 RLS 狀態符合 §3.2
- [ ] **derived 欄位依 D1 落地**
  - DoD: 若選 generated column → **實測寫入來源欄位後 derived 值自動正確**；
    若選應用層 → **有一個製造分歧再看它被抓到的測試**
  - Verify: 對真 DB 寫一列並讀回，記實際值進 progress.md

### 2.2 `risk.repository.ts` + `scoped-client.types.ts`

- [ ] **第二個範疇化 client 消費者**（W04 因 ADR-0012 失去了證明這件事的機會）
  - DoD: **不持有裸 client**；範疇化實例走方法參數（比照 `policy.repository.ts:69-100`）
  - Verify: `npm run lint -w apps/api`（boundaries 規則）+ `npm run lint:negative`（allowlist 不得增加）
- [ ] **`ref_code` 發號沿用 W04 的 `issueRefCode`，prefix 自宣告**
  - DoD: **不建 prefix 登記表**（W04 的裁決：歧義刻意保持可見）
  - Verify: 單元測試斷言 repository 蓋的章，呼叫者無法提供

### 2.3 端點 `POST /risks` · `GET /risks`

- [ ] **比照 policy 模組：範疇只來自憑證、404 不是 403、`Cache-Control` 全域生效**
  - DoD: controller 的參數清單**沒有任何 request 來源的實體 id**（約束 8 鐵律 3）
  - Verify: `npm run test -w apps/api`；斷言 resolver **實際收到的參數**

### 2.4 範疇測試（US-4）

- [ ] **約束 8 四項對 `AssetGroup` / `Asset` / `Risk` 三張表成立**
  - DoD: 跨實體讀拒 / 跨實體寫拒**且重讀確認資料未變** / RLS 層獨立成立 / 滾升只看授權子樹
  - Verify: `npm run test:int -w apps/api`；⚠️ 斷言**順序無關**（`AD-JestFileOrder-1`）
- [ ] **全域庫的相對行為**：`Threat`/`Vulnerability` 對兩個範疇**都讀得到**
  - DoD: 這是**刻意的**，測試要把它釘住，否則未來有人「順手」加 RLS 不會有東西紅

### 2.x Full gate

- [ ] lint 0 · type-check 0 · format 0 · unit ≥86 · int ≥34 · web 10 · build 0 ·
      `run_all` 6/6 · `lint:negative` PASS —— **逐項記實際輸出，不寫「都過了」**

---

## Day 3 — API-level 驗證 (US-5) — 真進程 + 真 PostgreSQL + 真 RLS

_(⚪ **無 user-facing surface** → drive-through 不適用。一律標 **API-level verified**，
**絕不暗示可用性**。W01–W05 的零 UI drive-through 記錄不變。)_

### 3.1 Clean restart

- [ ] **殺掉陳舊 dev server / 孤兒 worker，確認新程序是該 port 唯一擁有者**
  - DoD: 驗「活著的服務程序」不是「port 擁有者 PID」（Risk Class C 加強版）
  - Verify: 擷取證明 wiring 生效的 startup log 行（`RiskModule` 載入 + 路由 mapped）
  - ⚠️ **殺之前確認那是不是我開的** —— W04 在 port 3200 遇到非本 session 的程序，正確地沒碰它
- [ ] **`isms_dev` 套用本 phase 的 migration 並重新 seed 資產鏈**
  - DoD: ⭐ **在 reset 過的庫上驗**（`AD-DbBuildPathParity-1`：CI 的庫從 template1 繼承權限，
    所以 CI 綠**不涵蓋** GRANT 相關缺陷）

### 3.2 API-level 驗證

- [ ] **對真進程走完 `Risk` 主路徑**，逐案例記 observed-vs-intended
  - DoD: 至少涵蓋 —— 建立（分數由伺服器算）· 讀取 · 跨實體 404 · 不存在的 asset_id ·
    `score >= 16` 時 `in_it_risk_register` 為 true · 邊界值 15/16
  - Verify: 案例表寫進 progress.md Day 3
- [ ] **oracle 探測**：不存在的實體 id 與不屬於你的實體 id **回同一個答案**
  - DoD: 除 id 外逐字相同（比照 W03 案例 2b / W04 案例 #6）
  - ⚠️ **拒絕點這次可能又移動了**（發號 vs FK vs RLS）—— 記下它**這次落在哪**

### 3.3 元驗證（US-5 —— `AD-NegativeGate-1` 第 8 個實例）

- [ ] **把本 phase 每個「宣稱會擋東西」的機制各中性化一次**
  - DoD: 每次都記「弄壞什麼 → 幾個測試紅 → 還原 → 綠」。
    ⭐ **若某個機制弄壞後沒有東西紅，那就是缺口不是通過**
  - Verify: 表格記入 progress.md Day 3
  - 至少三組：**評分公式**（MAX→SUM）· **三張表的 RLS** · **derived 欄位的一致性機制**

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-020-w05-asset-and-risk-chain.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 **API-level verified** 標示）
- [ ] ⭐ **US-6：W04 七個不變式逐條裁決「可複製 / 需調整 / 不適用」**
  - DoD: 一張表，每條一行 + 一句理由。**這是本 phase 對 slice 3 最有價值的產出**
  - Verify: 寫進 retrospective；**若「需調整」≥3 條 → 本 phase 應改判為 spike 並補 design note**

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 1 個資料點**；
      `actual` = branch base → closeout commit 牆鐘，與 W04 同定義）
  - ⚠️ **若 Day 1 已改判為 spike** → class 改 `spike` 0.65 並在 Q2 說明改判理由
- [ ] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `CALIBRATION-LOG.md`）
- [ ] Final gate sweep: lint 0 · type 0 · format 0 · unit ≥86 · int ≥34 · web 10 · build 0 ·
      `run_all` 6/6 · `lint:negative` PASS
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated（**各 1 行**）· `MEMORY.md` pointer + subfile ·
      `BACKLOG.md` §Shipped 加列 · `ROADMAP.md` 第 4 項進度（**兩處都要改**）
- [ ] ⭐ **AD-12b（審計 #3）**：`retrospective.md.tpl` §Closeout Self-Check **加一列 RISK_REGISTER 複查**
  - DoD: 併入本 phase，**不另開 CH**（節流閘配額；它只是模板加一列）
  - Verify: 本 phase 自己就是第一個執行它的 —— **R4 因新增三條無稽核寫入路徑而需更新**
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻 `status:` frontmatter
