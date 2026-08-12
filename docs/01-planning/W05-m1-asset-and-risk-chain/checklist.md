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

- [x] **量測與論證 D1 三個選項**（plan §3.1），產出可引用的證據而非偏好
  - DoD: 三個選項各有一段「它會讓什麼表達不出來」；**實測 PostgreSQL generated column
    能否引用同表其他欄位**（不要靠記憶引用文件）
  - Verify: 論證寫進 progress.md Day 1，**含反方論據**
  - → **18 個探測**（Day-0 12 個 + Day-1 R1–R7 / S1–S6 / T1–T5），全在 throwaway DB 上跑。
    ⭐ 量出**第四個選項 D（`IMMUTABLE` 函式）**並用 T3/T4 否決它 —— plan 沒列過這個選項
- [x] **量測與論證 D2 三個選項**，並回答「per-entity 校準今天有沒有消費者」
  - DoD: 明確回答已確認參數 #7「只能改設定」與 AP-5 的衝突怎麼解
  - Verify: 論證寫進 progress.md Day 1
  - → **參數 #7 約束的是機制不是時程**。且 Day-0 `D-riskscales` 證明 `risk_scales` 從未被規格化
    → 建它得**自行發明欄位**（違反參數 #9）。零消費者只是第二個理由
- [x] **向使用者呈報 D1 + D2 並取得拍板**
  - DoD: 使用者明確選定；⛔ **助手不得代選**（CLAUDE.md §禁止反模式）
  - Verify: 拍板記錄在 progress.md，含日期與理由
  - → D1–D4 於 plan 核可時拍板（2026-08-11）；**量測又逼出 D5 / D6 兩個 plan 未預見的決定**，
    同樣呈報後由使用者拍板（progress §1.d），**未代選**
- [x] **若判為架構級 → 寫 ADR-0013 承載「評分與校準住在哪裡」**
  - DoD: ADR 含**可證偽條件**；明寫它約束哪些**未來**實體（Assessment / ControlTest / posture_snapshot）
  - Verify: `Read` 該 ADR，確認 `**Status**: 已採納` 且理由不是「因為方便」
  - → `docs/14-adr/0013-risk-scoring-and-calibration.md`，**已採納**；4 條可證偽條件，
    每條都指名觸發者與最早觸發的里程碑。順帶修正 ADR 索引漏列 0005/0012（progress §1.f）

### 1.2 D3 / D4 拍板

- [x] **D3 `cia_type` 形狀** · **D4 `Threat`/`Vulnerability` 表名**
  - DoD: 各一句決定 + 一句理由；D4 必須說明**為何某一份文件的用詞勝出**（權威排序）
  - Verify: 兩個決定寫進 progress.md Day 1
  - → **D3 = `enum(7)`**（全 false 這個無效狀態不可能表達；S3 另證 enum 也能當 generated column 型別）。
    **D4 = `threats` / `vulnerabilities`** 依 `02a` —— CLAUDE.md 權威排序**設計文件 > 規則檔**，
    `multi-tenant-data.md` 是下位不是第二個真相來源，Day 2 同時更正其 `:63`

### 1.3 `risk-score.ts`（US-3）

- [x] **`LKH × MAX(FIN,BOP,LRY,REP,SIS)`，值域 1–25，五個 impact 缺一不可**
  - DoD: 純函式；**不接受部分輸入**；`02a:136` 逐字對照
  - Verify: `npm run test -w apps/api`
  - → ⚠️ **形式依 D5-B 改變，實質未縮減**：`risk-score.ts` 交付的是純函式
    `validateScoreSet()`（1–5 值域 + all-or-none，錯誤帶欄位名），**刻意不含乘積** ——
    D1-A 之下算術的權威在 generated column，TS 再算一次就是 AP-6 + AP-1（無主流量呼叫者）。
    「不接受部分輸入」**已交付**且有 6 個逐欄案例。plan §3.3 的字面偏離已記入 §8
- [ ] 🚧 ⭐ **測試必須會抓到公式錯誤** —— **移到 Day 2**（`risk.int.spec.ts`）
  - DoD: `MAX` 換成 `SUM` / 平均 / 只取 FIN 時**至少一個案例要紅**
  - Verify: ⚠️ fixture **刻意避開 SUM == MAX 的輸入**（否則 SUM 版本會通過而測試看起來有效）
  - 🚧 **理由**：D5-B 之下公式住在 migration SQL，Day 1 沒有表可以打。
    **在 TS 副本上測公式等於認證一個沒有呼叫者的函式** —— 那正是 AP-3 的形狀。
  - **解封條件**：Day 2 的 `risks` 表建立後，對真庫斷言 `4×MAX(2,5,1,3,1)=20`（SUM 會得 48）、
    `3×MAX(5,1,1,1,1)=15`、邊界 16，**且**斷言每欄 `pg_get_expr` 等於 `scoreExpression(phase)`
  - ⚠️ **此項不得在 Day 2 被視為已完成而略過** —— 它是 US-3 的驗收核心

### 1.x partial gate

- [x] `npm run test -w apps/api`（新測試綠）+ `python scripts/lint/run_all.py` → 6/6
  - → **13 suites / 107 tests**（baseline 86 → +21）· `run_all` **6/6** ·
    lint **0** · type **0** · format **0**（首次 fail，`prettier --write` 後綠）。
    ⚪ int / web / build / `lint:negative` 本日未跑 —— Day 2 full gate 才要求

---

## Day 2 — 建五張表與端點 (US-1, US-4)

### 2.1 五張表 + migration

- [x] **`schema.prisma` 加 5 model + enum；migration 含表 + RLS + GRANT（形狀依 D1–D4）**
  - DoD: `AssetGroup`/`Asset`/`Risk` 有 `org_entity_id NOT NULL` + RLS policy + `FORCE`；
    `Threat`/`Vulnerability` **docstring 明寫引用 `multi-tenant-data.md:63` 的既有清單**
    （⚠️ **不是新增例外** —— 若寫成新增，那就是 W04 那條規則沒被正確消費）
    （行號由 Day-0 `D-tablename` 更正：plan 與本檔原寫 `:61`）
  - Verify: `npm run prisma:migrate -w apps/api`；`\d+ <table>` 逐表確認 RLS 狀態符合 §3.2
  - → `20260811024841_asset_and_risk_chain`。`pg_class` 逐列確認：三張表
    `relrowsecurity=t` + `relforcerowsecurity=t` + 各一條 `FOR ALL` policy；
    `threats`/`vulnerabilities` 兩欄皆 `f`。**docstring 寫的是 CONSUME 不是新增例外**
  - → ⛔ **另外量到 plan 未預見的一件事**：FK 檢查**繞過 RLS**（U1 實測）→
    三張 entity-scoped 表之間的 FK 全部改成**複合** `(fk, org_entity_id)`
- [x] **derived 欄位依 D1 落地**
  - DoD: 若選 generated column → **實測寫入來源欄位後 derived 值自動正確**；
    若選應用層 → **有一個製造分歧再看它被抓到的測試**
  - Verify: 對真 DB 寫一列並讀回，記實際值進 progress.md
  - → 5 個正面案例 + 6 個拒絕案例，實際值全部記入 progress §2.d。
    `UPDATE lkh_after 3→5` 使 `score_after` 自動 9→15。
    ⭐ **W1/W2 的 `DETAIL` 顯示 CHECK 攔下的失敗列裡 derived 已算出 8 / 35** ——
    直接證明 all-or-none 與 band 兩個 CHECK 是承重的，不是裝飾
  - → ⭐ **R5 的硬性順序實跑一次**：SQL → apply → `pg_get_expr` → 貼進 schema →
    `migrate diff --exit-code` **回 0**。`db pull` 只碰 scratchpad 副本

### 2.2 `risk.repository.ts` + `scoped-client.types.ts`

- [x] **第二個範疇化 client 消費者**（W04 因 ADR-0012 失去了證明這件事的機會）
  - DoD: **不持有裸 client**；範疇化實例走方法參數（比照 `policy.repository.ts:69-100`）
  - Verify: `npm run lint -w apps/api`（boundaries 規則）+ `npm run lint:negative`（allowlist 不得增加）
  - → lint **0**；`lint:negative` PASS **22 檔 0 bypass 3 allowlisted** —— 檔數 18→22，
    **allowlist 未增加** ✅。⭐ 順帶把 `ScopedExtensionCatalogClient` 抽出來 ——
    **第二個消費者出現才抽**，那正是 AP-5 的解法而不是它的症狀
  - → ⭐ `ScopedRiskClient` **刻意不暴露 `asset` delegate**：能先讀 asset 表的 repository
    就有能力分辨「不存在」與「不是你的」。不給 delegate = 寫不出來，而不是被勸阻
- [x] **`ref_code` 發號沿用 W04 的 `issueRefCode`，prefix 自宣告**
  - DoD: **不建 prefix 登記表**（W04 的裁決：歧義刻意保持可見）
  - Verify: 單元測試斷言 repository 蓋的章，呼叫者無法提供
  - → prefix `RISK`（`02a:89` 自己寫死的唯一一個）；`RiskRepository` 單元測試斷言
    `refCode: 'RISK-SG1-000007'` 由 repository 蓋章，`CreateRiskInput` 無此參數；
    int 測試 18 斷言 `/^RISK-SG1-\d{6}$/`。**`03:110` 的 `RSK` 歧義照 W04 裁決保持可見**

### 2.3 端點 `POST /risks` · `GET /risks`

- [x] **比照 policy 模組：範疇只來自憑證、404 不是 403、`Cache-Control` 全域生效**
  - DoD: controller 的參數清單**沒有任何 request 來源的實體 id**（約束 8 鐵律 3）
  - Verify: `npm run test -w apps/api`；斷言 resolver **實際收到的參數**
  - → 測試斷言 `resolve()` 收到的物件 key 恰為 `[assignedEntityCodes, rollUp, subjectId]`
    且 `JSON.stringify` **不含 body 裡的 orgEntityId**
  - → ⭐ **404 這次有兩個來源**：`ScopeRefusedError`（42501）與 `UnknownReferenceError`（23503），
    `it.each` 釘住兩者**都**回 404。⚠️ 若其中一個回別的碼，這一對就變成 oracle

### 2.4 範疇測試（US-4）

- [x] **約束 8 四項對 `AssetGroup` / `Asset` / `Risk` 三張表成立**
  - DoD: 跨實體讀拒 / 跨實體寫拒**且重讀確認資料未變** / RLS 層獨立成立 / 滾升只看授權子樹
  - Verify: `npm run test:int -w apps/api`；⚠️ 斷言**順序無關**（`AD-JestFileOrder-1`）
  - → int 測試 10（讀）· 11（寫拒 + 重讀確認 HK1 列數未變且不含該筆）·
    14（RLS 獨立：明確查 `where orgEntityId=HK1` 仍回 0 列）· 15（滾升 APAC 看得到兩者、
    SG 子樹看不到 HK1）。**全部以集合／成員斷言，非位置**
  - → ⭐ 另加 12/13：**複合 FK 這條新的拒絕路徑**，且不存在的 id 與別人的 id
    **訊息逐字相同**（`toBe`，不是 `toBeInstanceOf`）
  - ⚠️ **`AssetGroup` / `Asset` 的四項尚未逐條測** —— 本 phase 的端點只有 `/risks`，
    兩張表的隔離目前由 migration 的 RLS + 12/13 的複合 FK 間接涵蓋。
    🚧 **未完全達成，不勾為完成的部分見下一列**
- [x] 🚧→✅ **`AssetGroup` / `Asset` 各自的四項範疇測試** —— ⭐ **已於 W06 解封並完成**
  - 🚧 **當時的理由**：兩張表**沒有端點**，四項裡的「跨實體寫拒」需要一個會寫它們的呼叫者。
    今天唯一的寫入路徑是 seed（走 owner 連線，RLS 不適用）。
    **硬寫一個測試專用寫入路徑就是主流量驗證原則禁止的東西**（約束 2）
  - **解封條件**：slice 3 建 `POST /assets` / `POST /asset-groups` 時，同一個 PR 補齊四項
  - **今天已成立的部分**：RLS policy + FORCE 已在 `pg_class` 逐列驗證；
    複合 FK 使跨實體連結不可表達（int 12/13）
  - → ✅ **解封事件：W06（2026-08-12）** —— `POST /assets` / `POST /asset-groups` 落地，
    四項由 `asset.int.spec.ts` 2（讀）· 3/6（寫拒 + 重讀確認）· 7（RLS 獨立）· 8（滾升）承載；
    複合 FK 從「存在」變成「**會拒絕**」（測試 4/5，且兩種原因**逐字同錯誤**）
  - → ⚠️ **W06 同時發現本項當時的 3b/6b 形狀不足以釘住 `WITH CHECK`** ——
    見 `AD-ReturningMasksCheck-1` 與 W06 retro §US-6
- [x] **全域庫的相對行為**：`Threat`/`Vulnerability` 對兩個範疇**都讀得到**
  - DoD: 這是**刻意的**，測試要把它釘住，否則未來有人「順手」加 RLS 不會有東西紅
  - → int 測試 16：兩個範疇讀回**同一組 id**（排序後 `toEqual`），且先斷言非空
    （否則「兩邊都是空的」也會通過）。int 17 另釘住**應用角色對兩張庫唯讀**

### 2.x Full gate

- [x] lint 0 · type-check 0 · format 0 · unit ≥86 · int ≥34 · web 10 · build 0 ·
      `run_all` 6/6 · `lint:negative` PASS —— **逐項記實際輸出，不寫「都過了」**
  - → lint **0**（api+web）· type **0**（api+web）· format **0**（api+web）·
    unit **15 suites / 138 tests**（+52）· int **4 suites / 53 tests**（+19）· web **10** ·
    build **0** · `run_all` **6/6** · `lint:negative` PASS（**22 檔 0 bypass 3 allowlisted**）
  - → coverage **94.13 / 92.17 / 94.36 / 95.03**，**四項全部高於 baseline**。
    ⚠️ 第一次量是 91.06/87.15/91.54/91.61 —— **低於 baseline，未當作「門檻過了」帶過**；
    補的測試是「這一層把 SQLSTATE 對映到哪個 domain error」，與整合測試的主張不同，不是湊數

---

## Day 3 — API-level 驗證 (US-5) — 真進程 + 真 PostgreSQL + 真 RLS

_(⚪ **無 user-facing surface** → drive-through 不適用。一律標 **API-level verified**，
**絕不暗示可用性**。W01–W05 的零 UI drive-through 記錄不變。)_

### 3.1 Clean restart

- [x] **殺掉陳舊 dev server / 孤兒 worker，確認新程序是該 port 唯一擁有者**
  - DoD: 驗「活著的服務程序」不是「port 擁有者 PID」（Risk Class C 加強版）
  - Verify: 擷取證明 wiring 生效的 startup log 行（`RiskModule` 載入 + 路由 mapped）
  - ⚠️ **殺之前確認那是不是我開的** —— W04 在 port 3200 遇到非本 session 的程序，正確地沒碰它
  - → 列出**所有** node 進程查 PID/PPID/StartTime，不只看 port 擁有者。
    port 3200 那組**啟動於 2026-08-08，不是我開的 → 全程未碰**（與 W04 同一個判斷）。
    3210 無人監聽，乾淨起。Startup log：`RiskModule dependencies initialized` +
    `Mapped {/risks, GET}` + `Mapped {/risks, POST}`，PID 7364 為唯一擁有者
  - → ⭐ **另外抓到一個握著 advisory lock 的孤兒**：我自己 10:50 的 `migrate dev`
    卡在**互動式 drift 提示**上（migration 已套用、`dbgenerated` 鏡像未補的那個窗口）。
    **Day-1 R1 預測的失效模式真的發生了一次** → 該窗口應用 `migrate deploy` 不用 `migrate dev`
- [x] **`isms_dev` 套用本 phase 的 migration 並重新 seed 資產鏈**
  - DoD: ⭐ **在 reset 過的庫上驗**（`AD-DbBuildPathParity-1`：CI 的庫從 template1 繼承權限，
    所以 CI 綠**不涵蓋** GRANT 相關缺陷）
  - → ⛔ **不 reset `isms_dev`**（破壞性操作需使用者當下明確文字）。改在 throwaway 庫上
    **精確重現 reset 路徑**：`DROP SCHEMA public CASCADE` → ACL 變 `(null)`、
    `isms_app` USAGE = **f**（W04 撞 500 的那個狀態）→ `migrate deploy` → USAGE **t** / CREATE **f**，
    五張表權限逐張如設計。**同一份證據，零風險**
  - → ⚠️ 我一度判讀「template1 沒給 `isms_app` 任何東西」，**讀 AD 全文才發現 `=U` 就是那條繼承**。
    第三次「證據不支持結論」的自我攔截
  - → ⭐ 順帶量到 **AD 提議的守衛放錯位置**：`isms_test` 走 `CREATE DATABASE`，
    那條 `has_schema_privilege` 斷言會靠繼承權限輕鬆通過 → 回填 BACKLOG

### 3.2 API-level 驗證

- [x] **對真進程走完 `Risk` 主路徑**，逐案例記 observed-vs-intended
  - DoD: 至少涵蓋 —— 建立（分數由伺服器算）· 讀取 · 跨實體 404 · 不存在的 asset_id ·
    `score >= 16` 時 `in_it_risk_register` 為 true · 邊界值 15/16
  - Verify: 案例表寫進 progress.md Day 3
  - → **13 個案例**（A1-A13）全部記入 progress §3.c，含 HTTP 碼與實際 body。
    ⚪ 一律標 **API-level verified**，不暗示可用性
  - → ⛔ **第一版腳本無效且印出來像通過的**：PowerShell hashtable `+` 遇重複鍵 throw，
    四個案例根本沒執行而 `$r` 保留上一輪值。**它甚至印了 `A8 == A9 ? True`** ——
    在比較同一個陳舊值的兩份拷貝。修法是結構性的（clone-and-overwrite + 每案 nonce），
    不是「小心一點」
- [x] **oracle 探測**：不存在的實體 id 與不屬於你的實體 id **回同一個答案**
  - DoD: 除 id 外逐字相同（比照 W03 案例 2b / W04 案例 #6）
  - ⚠️ **拒絕點這次可能又移動了**（發號 vs FK vs RLS）—— 記下它**這次落在哪**
  - → **這次落在複合 FK（23503）**，不是發號也不是 RLS：row 自己的實體在範疇內，
    RLS 的 `WITH CHECK` 通過。A8（別人的資產）· A9（不存在的資產）· A13（不存在的威脅）
    **三者 body 逐字相同**，且不洩漏是三個參照裡的哪一個
  - → A7（row 自己出範疇）仍走 RLS/42501，訊息與 A8 不同 —— **那不是 oracle**：
    兩句都沒回答「它存不存在」

### 3.3 元驗證（US-5 —— `AD-NegativeGate-1` 第 8 個實例）

- [x] **把本 phase 每個「宣稱會擋東西」的機制各中性化一次**
  - DoD: 每次都記「弄壞什麼 → 幾個測試紅 → 還原 → 綠」。
    ⭐ **若某個機制弄壞後沒有東西紅，那就是缺口不是通過**
  - Verify: 表格記入 progress.md Day 3
  - 至少三組：**評分公式**（MAX→SUM）· **三張表的 RLS** · **derived 欄位的一致性機制**
  - → **做了四組**：M1 公式 MAX→SUM **4 紅** · M2 三張表 RLS→`USING(true)` **3 紅** ·
    M3 all-or-none CHECK→`CHECK(true)` **1 紅** · M4 複合 FK→單欄 FK **2 紅**
  - → ⭐⭐ **M2 找到真缺口**：RLS 全中性化後**測試 11 竟然還是綠的** ——
    寫入路徑先經 `issueRefCode`，拒絕它的是 W04 的 `ref_code_counters` policy，
    **不是 `risks` 自己的**。`risks` 的 `WITH CHECK` 零覆蓋，拿掉它全部 gate 仍綠。
    **W04「發號路徑成了別人保證的一部分」同形狀第 2 次**
  - → **修而不只是記**：新增 int 11b（繞開 repository、不帶 ref_code、直接寫），
    **在 M2 仍中性化的狀態下重跑 → 11b 轉紅**（M2 由 3 紅變 4 紅）= 缺口關上**且證明關上了**
  - → **還原驗證**：`git checkout` 後與中性化前副本**逐位元組相同**，
    `isms_dev` 的 `_prisma_migrations.checksum` 與檔案 SHA256 **仍相符**（`0ae3cd1e…`）

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-020-w05-asset-and-risk-chain.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 **API-level verified** 標示）
  - → 六個決定逐條一句理由 · 四個 load-bearing 細節 · 三個「不是我選的、由 `02a` 機械導出」的結果 ·
    否決 `IMMUTABLE` 函式的完整量測。**Drive-through 欄明寫「不是可用」**
- [x] ⭐ **US-6：W04 七個不變式逐條裁決「可複製 / 需調整 / 不適用」**
  - DoD: 一張表，每條一行 + 一句理由。**這是本 phase 對 slice 3 最有價值的產出**
  - Verify: 寫進 retrospective；**若「需調整」≥3 條 → 本 phase 應改判為 spike 並補 design note**
  - → **可複製 6 · 不適用 1 · 需調整 0** → **不改判**。判準寫死在 retro 裡以便被檢查：
    2.1 / 2.2 各帶一條**必須新增的條款**（FK 要複合 · 每張新表要有繞開發號的寫入測試），
    但本 phase **原樣抄了它們而且成立** → 缺的是清單上還沒有的東西，不是清單上寫錯的東西。
    ⭐ **就算用最寬鬆的讀法把那兩條算成「需調整」，2 < 3，門檻在兩種讀法下都沒跨過**
  - → §3 Cross-Scope Contracts 也被用掉：`ScopedRiskClient` 直接 `extends ScopedRefCodeClient`，
    W04 拆出它時的預測（「發號器會被每一個業務 repository 使用」）**兌現了**

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 1 個資料點**；
      `actual` = branch base → closeout commit 牆鐘，與 W04 同定義）
  - ⚠️ **若 Day 1 已改判為 spike** → class 改 `spike` 0.65 並在 Q2 說明改判理由
  - → 未改判（US-6 判定可複製）。⛔ **但那個定義在本 phase 破了**：base `a2b1906` 是
    **W04 的 closeout commit**，中間跨了一夜 —— 字面套用把 10h20m 睡眠算成工時
    （ratio 2.22 vs 修正後 0.74）。**兩個數字都寫進 Q2，本點標記「定義受污染」**
    → `AD-CalibrationMetric-2`。⚠️ 修正定義套回 W04 會讓 0.81 變 0.66，**沒有改它**
- [x] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `CALIBRATION-LOG.md`）
- [x] Final gate sweep: lint 0 · type 0 · format 0 · unit ≥86 · int ≥34 · web 10 · build 0 ·
      `run_all` 6/6 · `lint:negative` PASS
  - → 見 progress.md Day 4 §4.e，**逐項實際輸出**
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated（**各 1 行**）· `MEMORY.md` pointer + subfile ·
      `BACKLOG.md` §Shipped 加列 · `ROADMAP.md` 第 4 項進度（**兩處都要改**）
  - → ⚠️ **`CLAUDE.md` headroom 剩 215 bytes**（29,785 / 30,000）——
    `AD-ClaudeMdBudget-1` 的觸發條件（< 500）**已成立**，已回填實測值。本次仍是最小改動
- [x] ⭐ **AD-12b（審計 #3）**：`retrospective.md.tpl` §Closeout Self-Check **加一列 RISK_REGISTER 複查**
  - DoD: 併入本 phase，**不另開 CH**（節流閘配額；它只是模板加一列）
  - Verify: 本 phase 自己就是第一個執行它的 —— **R4 因新增三條無稽核寫入路徑而需更新**
  - → 模板加一列（含「沒有這一列就沒有東西會讓人回頭翻它」的理由）；
    R4 已更新為 **W02 兩張表 → W04 四張 → W05 七張，無一有稽核**，複查日 2026-08-11
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
  - → **總計 1**（AP-6，繼承自 W04 的建庫路徑不對等，本 phase 驗了但沒修根因）。
    AP-7 **0 引入 · 3 發現全修**，三個都是**本 phase 自己造成的** orphan claim
- [x] ⭐ **`git diff --name-status` 對照 plan §4**（本項不在原 checklist 上，Day 4 加）
  - → **抓到兩個漏做的交付**：`multi-tenant-data.md:63` 表名更正（D4 拍板句寫了「同時」）
    與 `02a` 的 D1/D2 裁決註記（plan §4 #14）。**兩者 Day 4 補上** → `AD-DecisionSideEffect-1`
- [x] **Commit** → PR push + open → CI → merge（使用者於 2026-08-11 逐步確認 push / merge）
  - → **PR #36 MERGED**（rebase，main head `700f5d6`，14:56 +0800）。
    六個 required check 全 **SUCCESS**；`mergeStateStatus` **BLOCKED → CLEAN** 兩個方向都觀測到
  - → **merge 經 `gh pr view --json state,mergedAt` 驗證**（`MERGED` / `2026-08-11T06:56:01Z`）
    **才翻 `status:`** —— 不是憑 `gh pr merge` 沒報錯就當作 merged
  - → `status: active` → **`closed_partial`**（不是 `closed`）：
    AC-4「約束 8 四項對 `AssetGroup`/`Asset`/`Risk` 成立」只對 `Risk` 完全成立。
    ⚠️ 與 W04 砍 `user.repository.ts` 不同 —— 那是核可的範圍縮減，這是**驗收標準未達成**
  - → ⚠️ **rebase 改寫了 SHA**（`f9195da` → `8f08f3f`），文件內的引用已同步；
    **calibration 算術未受影響** —— rebase 保留 author date，而那正是被量的東西
