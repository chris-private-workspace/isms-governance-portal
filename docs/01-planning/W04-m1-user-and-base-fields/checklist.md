# Phase W04 — Checklist (M1 slice 1: the shape every table copies)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `65ce121`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 NEW 檔皆不存在、EDIT 檔皆存在；
      `CH-019` 未被佔用（**grep 全 repo 的 `CH-\d+` 引用，不是 `ls` 目錄** —— `AD-ChNumber-1`）；
      下一個可用 ADR 編號（若 D1 需要）以 `Glob docs/14-adr/*` 確認
      → **10 個路徑，0 漂移**；ADR **0012**（`0002/0003/0008/0009` 是有主題的預留，不可填）
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-user-spec** — Grep `User` 於全 `docs/02-architecture/`，確認**確實沒有欄位規格**。
        ⛔ 這是整個 plan 的前提；找到規格就**停下重估範圍**
        → **僅 3 命中**（`02a:92` FK 引用 · `02:37` 概念列 · `09:13` 無關表頭）→ **前提成立**
  - [x] **D-globaltable** — 讀 `docs/rules-on-demand/multi-tenant-data.md` 的合法全域表清單，
        確認 D1 選項 A 的判準真的存在且適用（**不要靠記憶引用**）
        → ⚠️ **漂移 `D-globaltable`**：`users` 不在五類清單上；`:67` / `:374` 要求 **PR 描述舉證** + 需更新清單本身
  - [x] **D-basefields** — 逐欄比對 `02a:86-98` 的 13 個 base field vs `schema.prisma` 的 `Policy`，
        確認「缺 6 個」這個數字（plan §3.3 依賴它）→ **確認 6 個**
  - [x] **D-statusenum** — 確認 `02a:300-312` 的 Policy 狀態機是 6 個狀態且已規格化（D4 依賴它）
        → **確認 6 態** → D4 可行
- [x] **Prong 2.5 — child component tree** — **N/A**（無前端工作）
- [x] **Prong 3 — schema verify**：
  - [x] `users` / `user` 表在 `schema.prisma` 與 `prisma/migrations/**` **零命中**（確認是新建不是重建）
        → 唯一命中是 `schema.prisma:101` 的**註解**（→ 漂移 D4，Day 2 要更新它）
  - [x] **D-devdb** — `isms_dev` 的 `_prisma_migrations` head == `prisma/migrations/` 最新目錄
        （`AD-DevDbDrift-1`：W03 是 Day 3 才發現它落後兩天）→ **三列全 applied，完全一致**
- [x] **D-baselines** — 逐項跑並記實際輸出（**不經 pipe，看退出碼** —— `AD-GrepAssertion-1`）：
      unit 78 · int 32 · web 10 · lint 0 · type 0 · format 0 · build 0 · `run_all` 6/6 · `lint:negative` PASS
      → **全部相符**；`lint:negative` 實際輸出 `17 檔, 0 bypass, 3 allowlisted`（→ 漂移 D3）
- [x] **Catalog drift** — progress.md Day-0 表格（`D{N}` ID + Finding + Implication，交叉引用 plan §8）
      → **10 列**，其中 D1 / D2 已加進 plan §8 Risks（**未改 §3**，鐵律）
- [x] **Go/no-go** — 範圍變動 ≤20% 繼續 / 20-50% 修訂並再確認 / >50% 中止重寫
      → **~10% → 繼續 Day 1**

### 0.2 Branch

- [x] `git checkout -b feature/W04-m1-user-base-fields`（從 `main` `65ce121`）

---

## Day 1 — 拍板 `User` 的形狀 (US-1, US-2)

### 1.1 ⛔ D1 — `users` 的範疇語義

- [x] **量測與論證三個選項**（plan §3.1 D1），產出可引用的證據而非偏好
  - DoD: 三個選項各有一段「它會讓什麼表達不出來」；**引用 `05` §Identity 與 `multi-tenant-data.md` 原文**
  - Verify: 論證寫進 progress.md Day 1，**含反方論據**
  - → ⭐ 讀 `03` 找到**比原論據更強的一行**：`03:31` "scope is derived from role assignment"
- [x] **向使用者呈報 D1 並取得拍板**
  - DoD: 使用者明確選定；⛔ **助手不得代選**（CLAUDE.md §禁止反模式）
  - Verify: 拍板記錄在 progress.md，含日期與理由
  - → 草稿先呈報再落地；使用者核可 A + ADR（2026-08-10）
- [x] **若判為全域表 → 寫 ADR 承載約束 8 的豁免**
  - DoD: ADR 含**可證偽條件**（什麼證據出現代表這個決定錯了）
  - Verify: `Read` 該 ADR，確認 `**Status**: 已採納` 且理由不是「因為方便」
  - → **ADR-0012 已採納**，4 條可證偽條件。⭐ 立場是「**規則的二分法不完整**」而非「users 是例外」
- [x] **【Day 1 追加】`multi-tenant-data.md` 鐵律 1 擴充 identity 為第三類**
  - DoD: 不是在參考資料清單加第六列（那五類**無個資**，這一類**有**）
  - Verify: 含「join `users` 只能加欄位不能加列」的查詢規則 + 舉證位置是 PR 描述

### 1.2 D2 / D3 / D4 拍板

- [x] **D2 `is_active` 存或算** · **D3 `ref_code` 序號機制** · **D4 `status` enum 現在建否**
  - DoD: 各一句決定 + 一句理由；D3 需**量測**並發行為，不是選一個看起來對的
  - Verify: 三個決定寫進 progress.md Day 1
  - → D2 **不存**（用 `retired_at IS NULL`）· D3 **counter 表**（⚠️ **並發保證未驗證，Day 2 證明**）
    · D4 **建 enum 不建轉換強制**

### 1.3 `User` 欄位規格入 `02a`

- [x] **`02a` §3 新增 `User` 規格 + §0 索引加列（同一個 change）**
  - DoD: 欄位**逐個可追溯到 `05` §Identity**；⛔ 無發明欄位；無密碼欄位
  - Verify: `python scripts/lint/run_all.py`（doc-links + path-references 不得紅）
  - → 3 個欄位（`oidc_subject` · `email` · `display_name`）+ 明列**哪些 base field 不適用與為什麼**
    + `Role`/`Permission` 進「Not yet specified」分區

### 1.x partial gate

- [x] `python scripts/lint/run_all.py` → 6/6

---

## Day 2 — 建表與補欄位 (US-3, US-4)

### 2.1 `users` 表 + migration

- [x] **`schema.prisma` 加 `model User`；migration 含表 + RLS（形狀依 D1）**
  - DoD: 若 entity-scoped → RLS policy + `FORCE`；若全域 → **docstring 明寫豁免理由**（比照 `OrgEntity:62-66`）
  - Verify: `npm run prisma:migrate -w apps/api`；`\d+ users` 確認 RLS 狀態符合 D1
  - → 實測：`users` RLS **false/false**（ADR-0012）· `ref_code_counters` **true/true** ·
    `users` GRANT **僅 SELECT**（M4 前無寫入路徑，結構性而非「還沒寫」）
  - 🚩 **阻塞並已解除**：`migrate dev` 因 W02 第一個 migration 的 checksum 不符而拒絕生成。
    診斷後（非 CRLF、非 git 改動、schema 實際正確）經**使用者明確授權**執行 `migrate reset`

### 2.2 `user.repository.ts`

- [ ] **第二個範疇化 client 消費者**（證明 W03 的形狀可複製）
  - DoD: **不持有裸 client**；範疇化實例走方法參數（比照 `policy.repository.ts:69-100`）
  - Verify: `npm run lint -w apps/api`（boundaries 規則）+ unit 測試
  - 🚧 **阻塞 → 不做（Day 1 範圍縮減，使用者核可 2026-08-10）**：ADR-0012 拍板 `users` 為
    **全域無 RLS 表**後，「範疇化 client 消費者」這個理由不成立 —— 它屬於
    `entity-scope.resolver.ts` 讀 `org_entities` 那一類。且今天無端點、無 UI，
    **零消費者 = AP-5 + AP-3**（與 `AD-ScopedClientDI-1` 同形狀）。
    **解封條件：M4**（真憑證來源 + 使用者管理需求）。詳見 plan §3.x

### 2.3 `ref-code.ts` + 並發

- [x] **`<TYPE>-<ENTITY_CODE>-<seq>` 生成，並發下不重號**
  - DoD: 保證在**資料庫層**（sequence / unique constraint），不是應用層檢查
  - Verify: 一個**會抓到重號**的測試（並發插入 → unique violation 或全部唯一）
  - → `upsert` + `{ increment: 1 }` = 單一 `INSERT … ON CONFLICT DO UPDATE … RETURNING`。
    40 個並發（各自獨立交易）→ 全部唯一**且連續**（gap 代表遺失分配，UNIQUE 抓不到）
  - → ⭐ **元驗證已做**：發號中性化 → int **2 failed**（含 `:257` 的 size 斷言）→ 還原 → **34 passed**

### 2.4 `Policy` 補齊 base fields

- [x] **`ref_code` · `owner_user_id` · `created_by` · `updated_by` · `status`（依 D2/D4）**
  - DoD: `schema.prisma:97-106` 的自陳清單逐項更新 —— **已建的移出、未建的保留並註明去向**
  - Verify: 比對 `02a:86-98`，缺口從 6 降到 ≤ 1
  - → **缺口 6 → 1**（僅 `is_active`，D2 判定不存）。清單已逐項更新，含
    「`status` 的**轉換**沒有被任何東西擋住，不要讀成 workflow」的明文警語
  - → 順帶修掉 header 的 orphan claim：Purpose 仍寫著 "Deliberately carries **NO models yet**"（W01 的話）

### 2.5 範疇測試

- [x] **約束 8 四項對 `User` 成立，或有記錄的豁免（依 D1）**
  - DoD: 跨實體讀拒絕 / 跨實體寫拒絕且資料未變 / RLS 層獨立成立 / 滾升只看授權子樹
  - Verify: `npm run test:int -w apps/api`；⚠️ 斷言**順序無關**（`AD-JestFileOrder-1`）
  - → **`users` 走的是記錄的豁免**（ADR-0012 + `multi-tenant-data.md` 第三類 + PR 描述舉證）。
    ⭐ 但**發號路徑仍有完整的範疇拒絕測試** —— `ref_code_counters` 是 entity-scoped，
    跨實體發號被同一條 RLS policy 拒絕（新增 int 案例）

### 2.x Full gate

- [x] lint 0 · type-check 0 · format 0 · unit ≥78 · int ≥32 · web 10 · build 0 ·
      `run_all` 6/6 · `lint:negative` PASS —— **逐項記實際輸出，不寫「都過了」**
  - → lint **0** · type **0** · format **0**（⚠️ 先紅後修：2 檔）· unit **86** · int **34** ·
    web **10** · build **0** · `run_all` **6/6** · `lint:negative` **18 檔 0 bypass, 3 allowlisted** ·
    coverage **94.11 / 90.42 / 92.45 / 94.76**（四項全升）

---

## Day 3 — API-level 驗證 (US-5) — 真進程 + 真 PostgreSQL + 真 RLS

_(⚪ **無 user-facing surface** → drive-through 不適用。本 phase 一律標 **gate-only / API-level verified**，
**絕不暗示可用性**。W01–W04 的零 UI drive-through 記錄不變。)_

### 3.1 Clean restart

- [x] **殺掉陳舊 dev server / 孤兒 worker，確認新程序是該 port 唯一擁有者**
  - DoD: 驗「活著的服務程序」不是「port 擁有者 PID」（Risk Class C 加強版）
  - Verify: 擷取證明 wiring 生效的 startup log 行
  - → port 3210 **本來就空**（無孤兒）。port 3200 有一個 **8/8 啟動、非我開啟**的 web dev server
    → **不碰**（§4；本 phase `apps/web` UNTOUCHED）
  - → ⚠️ **收尾時 `TaskStop` 停了 npm 但子程序仍在 listening** —— 正是 Risk Class C 加強版的情況。
    確認 cmdline + 啟動時間後 kill，並驗到「**無 API 程序殘留**」而不只是「port 空了」
- [x] **`isms_dev` 套用本 phase 的 migration**（`AD-DevDbDrift-1` 的直接對策）
  - → 並重新 seed（reset 後為空）。⭐ **刻意不 seed policies**，讓 counter 從 0 起算

### 3.2 API-level 驗證

- [x] **對真進程走完 `User` 與 `Policy` 的主路徑**，逐案例記 observed-vs-intended
  - → **11 個案例全數 PASS**。🚩 **首次探測即 500** → 根因是 `permission denied for schema public`，
    兩條建庫路徑的 schema 權限不同而只有一條被測試過 → 新 migration 修復（見 progress）
- [x] **oracle 探測**：不存在的 id 與不屬於你的 id **回同一個答案**（比照 W03 案例 2b）
  - → 兩者除 id 外**逐字相同**。⭐ 拒絕點已從 policy insert 移到 counter upsert，**保證在新位置重新成立**

### 3.3 元驗證（US-5 —— `AD-NegativeGate-1` 第 7 個實例）

- [x] **把本 phase 每個「宣稱會擋東西」的機制各中性化一次**
  - DoD: 每次都記「弄壞什麼 → 幾個測試紅 → 還原 → 綠」。⭐ **若某個機制弄壞後沒有東西紅，那就是缺口不是通過**
  - Verify: 表格記入 progress.md Day 3
  - → 發號原子性（Day 2）**2 紅** · counter RLS **2 紅** · 還原 **34 綠**
  - → ⭐ **counter RLS 那組產出新知識**：它的失效不只是「能替別人發號」，
    還讓錯誤型別改變 → **「不存在」與「不是你的」重新變得可區分**。
    W04 的發號路徑**成了 W03 oracle 防護的一部分**，而寫的時候沒有人知道

---

## Day 4 — closeout

### 4.1 Change record + design note

- [x] **`docs/03-implementation/changes/CH-019-w04-user-and-base-fields.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 **API-level verified** 標示
      + 關掉的 `AD-UserEntitySpec-1`）
  - → 4 個 load-bearing 細節；⭐ 記下「`grant_schema_usage` 對 CI 是 no-op」——
    **這個 migration 的價值在 CI 上量不到**，正是缺口能活到 Day 3 的原因
- [x] **design note**（spike gate —— `docs/rules-on-demand/spike-design-note-gate.md` 8 點）
  - DoD: 是 **extract 不是 pre-write**；每個宣稱附 `file:line`
  - Verify: 8-point gate 逐項自查寫進 retrospective
  - → 7 個已驗證不變式 · 6 個 open invariant · **verified ratio 22/23 ≈ 96%**。
    第 5 點 🟡：§2.7 無 fixture，**而原因本身就是結論**（CI 的建庫路徑量不到它）

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`spike` 0.65，**第 3 個資料點，第一個以一致定義登記**；
      `actual` = branch base → closeout commit 的牆鐘跨度）
  - → **actual 4.79 hr / committed 5.9 = ratio 0.81 IN band** → **KEEP 0.65**。
    ⭐ 價值不在數字：三個點的單位史是「人力工時估計 / 事後回推牆鐘 / **事前宣告牆鐘**」，
    **有效樣本數其實是 1**，第一次真正的 3-phase 窗口要到 W06
- [x] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `CALIBRATION-LOG.md`）
  - → matrix 行約 190 字元；`run_all` 的 rules-hygiene 已驗（**≤ 400 chars** 檢查通過）
- [x] Final gate sweep: lint 0 · type 0 · format 0 · unit ≥78 · int ≥32 · web 10 · build 0 ·
      `run_all` 6/6 · `lint:negative` PASS
  - → lint **0** · type **0** · format **0** · unit **86**（12 suites）· int **34**（3 suites）·
    web **10** · build **0** · `run_all` **6/6** · `lint:negative` **PASS（18 檔 0 bypass, 3 allowlisted）** ·
    coverage **94.11 / 90.42 / 92.45 / 94.76**
  - → ⚠️ 途中 `lint:negative` 回 **exit 1**：是我把 script 當成在 `apps/api`（它在 root）。
    **退出碼揭露的，不是輸出**（`AD-GrepAssertion-1` 的形狀，這次又守住了）
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated（**各 1 行**）· `MEMORY.md` pointer + subfile ·
      `BACKLOG.md` CLOSE `AD-UserEntitySpec-1` **並移出 §Open + 加 §Shipped 列**（審計 AD-7 的教訓）·
      `ROADMAP.md` 第 4 項標記進度（**兩處都要改**）
  - → CLAUDE.md 另改 2 處 ADR 清單（0012 已採納）—— 屬「真的變了才動」。
    §Open **56 條**（`AD-UserEntitySpec-1` 已移除）；順帶把 BACKLOG 開頭 stale 的「48 條」加註日期。
    ⭐ **`AD-NegativeGate-1` 那列已更新第 7 個實例** —— 它是計數的唯一權威（審計 AD-8 的教訓）
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
  - → **1**（AP-6）：`isms_test` 與 `isms_dev` 建法不同 → bug 在 dev 重現、test 不重現。
    **修了症狀，根因仍在** → `AD-DbBuildPathParity-1`。
    AP-3 最接近的一次（`status` 無轉換強制 · user FK 永遠 NULL）判定**不是** Potemkin，
    **因為兩者都在 docstring 明文宣告** —— 而這個判定依賴那兩段註解繼續存在
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻 `status:` frontmatter
