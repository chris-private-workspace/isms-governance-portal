# Phase W07 — Checklist (ControlTest + Evidence，父表拒絕複合錨點時的範疇防護)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `<sha>`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 27 個目標逐一確認（NEW 檔不存在；EDIT 檔存在）；
      `CH-022` 未被佔用（`ls docs/03-implementation/changes/ | sort -V | tail -1` → `CH-021`）
      → ⚠️ **D1**：`app.module.ts` 實際在 `apps/api/src/bootstrap/`
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-force** — `grep -n "FORCE ROW LEVEL" apps/api/prisma/migrations/*/migration.sql`，
        讀 W05/W06 migration 的鄰近註解確認 3/7 是刻意還是遺漏
        → ⛔ **假警報，7/7 都有** —— 單空格 pattern 漏掉對齊用的兩空格寫法（progress.md D2）
  - [x] **D-m7** — 確認 `schema.prisma:448-449` 仍寫「`ControlTest` does not exist until M7」
        → 確認；且 `:482`/`:761` 的另一句**不會**變 orphan，不得順手改
  - [x] **D-index** — 確認 `02a` §0 的 `Jurisdiction` / `posture_snapshot` Note 欄仍寫「Built」，
        且 migrations 全樹對兩者零命中，且 `02a:175` 寫「is built in M2」→ 三項全部確認
  - [x] **D-anchor** — `controls` 確認**無** `@@unique([id, orgEntityId])`；
        `assets` 確認**有**指向 `asset_groups` 的複合 FK（migration:214）
  - [x] **D-trigger** — `governed_extensions` 的 trigger 確認是 `SECURITY INVOKER`
        → ⭐ 且 `:89-91` 記錄 W03 **已實測**其讀取受 RLS 過濾（progress.md D5）
  - [x] **D-lifecycle** — `02a` §4 的 ControlTest 五態與 `02a:225` 的 `result` 欄位確認並存
- [x] **Prong 2.5 — child component tree** — **N/A**（無前端）
- [x] **Prong 3 — schema verify**：`control_tests` / `evidence` 表確認不存在（schema.prisma 的
      3 筆命中全是註解：`:448` `:482` `:761`）；migration head `20260811093148_control_library`；
      `migration_lock.toml` = postgresql
- [x] **D-baselines** — lint **0**（api+web）· type-check **clean** · test **19 suites / 192 passed** ·
      coverage **stmt 93.36 / br 92.47 / fn 95.74**（門檻 80/70/80/80）· build **clean** · run_all **6/6**
- [x] **Catalog drift** — progress.md Day-0 表格
- [x] **Go/no-go** — 範圍變動 < 20% → **GO**，繼續 Day 1

### 0.2 Branch

- [x] `git checkout -b feature/W07-control-test-and-evidence`（從 `origin/main`，**不從任何既有分支延續**
      —— `AD-DesignNoteAnchor-1` 第三形態）
      - 🚧 ~~阻塞：PR #43 未 merge~~ → **已解封** 2026-08-12（`gh` 確認 MERGED，merge commit `5189cf3`，
        又是 rebase merge：`1f75004` → `5189cf3`）
      - ⚠️ 副產物：`git checkout -b X origin/main` 把 upstream 設成 `origin/main`，一個裸 `git push`
        會直接推 main。**已 `git branch --unset-upstream`**；push 時用 `-u origin <branch>`
- [x] `git rev-parse HEAD~1` 等於 `origin/main` —— 分支建立時 HEAD **等於** `origin/main` = `5189cf3`
      （尚無 commit，故用 HEAD 直接比對，這比 `HEAD~1` 更強）

---

## Day 1 — 量測：RI 檢查與 RLS 的關係 (US-1)

### 1.1 量測 harness

- [x] **跨範疇 fixture 就位**（scope-A / scope-B 各一個 entity-local control，外加一個 group control）
  - DoD: 三筆 control 存在且 `app_entity_scope()` 對 A 只回 A
  - Verify: 對真 PostgreSQL 直接查詢，逐列斷言
  - ✅ **不必新建** —— W06 已種好三筆（`a50` SG1 local · `a51` SG1 擁有的 group · `a52` HK1 local）。
    HK1 範疇下的可見性實測：**0 / 1 / 1**

### 1.2 三個問題各跑一次

- [x] **M1 — A 寫 `control_tests`，`control_id` 指向 B 的 entity-local control**
  - DoD: 記錄成功/失敗 + SQLSTATE + 判定是哪一層（RI / RLS / GRANT）
  - Verify: 直連 SQL；結果寫進 progress.md **不論答案是什麼**
  - ⛔ **INSERT 成功 —— RI 檢查繞過 RLS**。與 M2c（不存在 → `23503`）合起來是一個存在性 oracle
- [x] **M2 — 同上但目標是 group control**
  - DoD: 記錄結果 + 依 `02a:415` 判斷這是否應為合法
  - ✅ 成功，且依 `02a:415` **應為合法**
- [x] **M3 — `evidence.linked_id` 指向 B 的 `control_test`（無 FK）**
  - DoD: 記錄結果；預期無任何 RI 檢查會發生
  - ✅ 成功；**M3b 連純垃圾 id 也成功** —— 無 FK 時毫無防護
- [x] **由 M1-M3 導出機制選擇並寫進 progress.md**
  - DoD: 明確寫「選什麼 / 因為量到什麼」，而不是「因為是 best practice」
  - ✅ `BEFORE INSERT OR UPDATE` + `SECURITY INVOKER` trigger，`NOT EXISTS → RAISE 42501`

### 1.2b 候選機制的量測（計畫外新增 —— M1 的結果逼出來的）

- [x] **M4 — 裝上 trigger 後重跑 M1 / M2**：`42501` 拒絕 / group 仍成功（未誤擋）
- [x] **M5 — ⭐ trigger 是關掉 oracle 還是只換編號**：兩種情況**同為 `42501`**，**oracle 關閉**
      （BEFORE trigger 先於 FK 檢查，`23503` 沒機會發生）
- [x] **M6 — UPDATE 路徑**：重新指向不可見父列被拒 `42501`（`OR UPDATE` 是必要的）
- [x] **M7 — 合法路徑未被誤擋**：own control / group control 皆成功
- [x] **M8 — 中性化**：`DISABLE TRIGGER` → M5a 轉為成功，證明擋住它的**確實是 trigger**

### 1.x partial gate

- [x] `npm run lint -w apps/api` · `npm run type-check -w apps/api`
  - ✅ **Day 1 未動 `apps/` 任何檔案**（量測腳本在 scratchpad），故維持 Day-0 baseline：
    lint 0 · type-check clean。Day 2 起才有新的增量要驗
- [x] progress.md 記錄 Day 1 逐任務實際分鐘數（`AD-CalibrationNoActual-1`）
      —— 12:27→12:37，**~10 min**（bottom-up 估 2.0 hr，歸因見 progress.md）

---

## Day 2 — 兩張表 + 兩組端點 + 隔離修補 (US-2, US-3, US-4)

### 2.1 `ControlTest`

- [ ] **`schema.prisma` + migration**（model · `ControlTestStatus` 五態 · per-command policies ·
      依 Day 1 結果的引用防護）
  - DoD: `prisma migrate` 乾淨套用；`pg_policies` 查得到三條、**查不到 `FOR DELETE`**
  - Verify: `npm run prisma:migrate -w apps/api` + `SELECT * FROM pg_policies WHERE tablename='control_tests'`
- [ ] **`control-test.repository.ts` + `.spec.ts`**
  - DoD: `ref_code` 為 `CTST-<ENTITY_CODE>-<seq>`；server-owned 欄位不接受呼叫者輸入
  - Verify: `npm run test -w apps/api`
- [ ] **`/control-tests` controller + module + `.controller.spec.ts`**，掛進 `app.module.ts`
  - DoD: 由主流量進入（約束 2）；`app.module.ts` 可見
  - Verify: `npm run build -w apps/api`

### 2.2 `Evidence`

- [ ] **`schema.prisma` + migration**（model · `linked_type` **只有 `control_test`** ·
      per-command policies · 多型連結的範疇防護）
  - DoD: enum 只有一個值且 docstring 記錄理由（ADR-0014 同判準）
  - Verify: 同上
- [ ] **`evidence.repository.ts` + `.spec.ts` + controller + module**
  - DoD: `hash` 欄位存在且必填（證據等級主張的完整性錨點）
  - Verify: `npm run test -w apps/api`

### 2.3 `extension_fields` per-command 拆分（US-4）

- [ ] **先寫紅測試** —— 「把 group 列的 `org_entity_id` 改成自己」在修補前**必須紅**
  - DoD: 看到它紅（不是推測它會紅）
  - Verify: `npm run test -w apps/api`，貼出失敗輸出
- [ ] **migration：`FOR ALL` → `FOR SELECT` + `FOR INSERT` + `FOR UPDATE`**（後兩者排除 `IS NULL`）
  - DoD: 同一個測試轉綠；`DELETE` 維持靠缺少 GRANT 擋住（**不補 policy**）
  - Verify: 重跑 + `pg_policies`

### 2.4 carryover

- [ ] **`risks` int 11b 改為不產生 `RETURNING`**（`AD-ReturningMasksCheck-1`）
  - DoD: 中性化 `risks` 的 `WITH CHECK` 後它**會紅**
  - Verify: 中性化 → 跑 → 看到紅 → 還原

### 2.x Full gate

- [ ] lint `<N>` · type-check clean · test `<N>` · build clean · `run_all` 6/6
- [ ] coverage 不低於 Day-0 baseline（低於先歸因再補，不直接補測試湊數）
- [ ] progress.md Day 2 逐任務分鐘數

---

## Day 3 — API-level 驗證 + 元驗證 (US-5) — 真進程 + 真 PostgreSQL

_(⚪ **無 UI**。本 phase 不做 drive-through，報告一律寫「**API-level verified**」，
**不得暗示可用性** —— `verification-discipline.md` §適用範圍的純後端豁免。)_

### 3.1 Clean restart

- [ ] 殺掉陳舊的 api 進程並確認新程序是 3210 的唯一擁有者（列出所有 node 進程比對 PID/PPID/StartTime，
      不只看 port 擁有者 —— Risk Class C 加強版）
  - ⚠️ **殺之前先確認那不是使用者或其他 session 開的**
- [ ] 擷取證明 migration 與 module wiring 生效的 startup log 行

### 3.2 主路徑（API-level）

- [ ] `POST /control-tests` → 讀回；`POST /evidence` 綁到該 test → 讀回
- [ ] **跨實體引用被拒**：A 建指向 B 私有 control 的 test → 被拒，且拒絕來自資料庫層
- [ ] 四個範疇測試對兩張表各成立（讀拒 / 寫拒且資料未變 / RLS 獨立 / 滾升子樹）
- [ ] 觀察到的 vs 預期 → progress.md Day 3

### 3.3 元驗證（中性化）

- [ ] **逐機制中性化**：每條新 policy / trigger 各中性化一次
  - DoD: 對應測試**轉紅**；零轉紅一律先查 `pg_policies` / `pg_trigger` 證實編輯生效再下結論
  - Verify: 中性化前後 anchor **逐字不同**（W06 N4 空跑的教訓）
- [ ] 中性化矩陣（機制 × 轉紅測試數）寫進 progress.md
- [ ] 全部還原並重跑 full gate 確認回到綠

---

## Day 4 — closeout

### 4.1 Change record + design note

- [ ] **`docs/03-implementation/changes/CH-022-w07-control-test-and-evidence.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 **API-level verified** 措辭
      + 關掉的 AD）
- [ ] **design note**（spike class）—— 依 `docs/rules-on-demand/spike-design-note-gate.md` 的 8-point gate；
      主題是「父表拒絕複合錨點時，子表的跨實體引用由哪一層擋」
- [ ] `02a` 的兩處更正：`:225` 的 `result` 判定註記 · **D-index** 的「Built」措辭

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`spike` 0.65，第 5 個資料點；
      ⭐ **必須有有效 actual** —— 逐任務分鐘數已逐日記錄）
- [ ] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `calibration-log.md`）
- [ ] Final gate sweep: lint `<N>` · type clean · test `<N>` · build clean · `run_all` 6/6
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（CLOSE 掉本 phase 關掉的項）
- [ ] **`ROADMAP.md` 主線加一列 ⬜ 給 `AD-DesignNoteAnchor-1` 的 detector**，
      BACKLOG 那句改成指向它（plan §9 —— 再延要落在會被讀的清單上，不是備註欄）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻 `status:` 標籤
