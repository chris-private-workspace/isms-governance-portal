# Phase W24 — Checklist (Unclaim the platform, wire policies, guard the prose)

[Plan](./plan.md) · [Progress](./progress.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ 盤點補掃 + Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `5e517c5`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md` · 結果 → [progress.md](./progress.md) Day 0

- [x] **Prong 1 — path verify**：18 個編輯目標存在如預期（6 個 NEW 檔不存在；11 個 EDIT 檔存在）；
      `CH-044` 未被佔用
  - DoD: 逐路徑核對，不符者記入 progress.md Day-0 表 → **0 漂移**（+3 父目錄齊備、CH-044 零命中）
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -1` → `CH-043-*`
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-policy-fields** — `/policies` 與 `/policies/[id]` 逐欄對 `Policy` model
    - DoD: 列表頁 **4/8 無來源**（恰好一半，「>一半」門檻字面不觸發）；
      詳情頁**只剩 3 個真欄位**、9 個區塊無來源 → **D3，使用者裁決只接列表頁**
  - [x] **D-record-claim-set** — `/policies/[id]` 那 13 條逐條標「指得到 API 欄位嗎」
    - DoD: **13 條中只有 1 條**指得到（status pill）⇒ plan §8 **R2 的零標的風險不成立**
  - [x] **D-fetch-direct** — 枚舉今天直接 `fetch(` 的表面
    - DoD: **3 個** —— `login:203` · `app/page.tsx:45` · ⭐ **`AppShell.tsx:247`**
      （shell 自己符合「集合 A」定義，獨立確認 plan §3.4 的掃描面設計）
  - [x] **D-seed-policy** — `9xxxxx` 保留段與 `ref_code_counters` 的互動能否沿用
    - DoD: 可沿用（upsert by fixed id）。⭐ 附帶：owner 欄位保持 NULL 的理由是
      **guardrail 7**（*"inventing a person here would be inventing PII"*），不只是「M4 才有」
  - [x] **D-white-tick** — `audit-issues/[ref]/page.tsx:723-734` 白勾是否無條件渲染
    - DoD: **成立** —— `:716-717` 外框有 `a.done ?` 條件，`:723-734` 的 `stroke="#fff"` 勾無條件
      → BACKLOG（**本片不修**）
  - [x] **D-dashboard-fixture-risks** — `/dashboard:1071-1089` 是否仍讀 fixture `risks.ts`
    - DoD: **成立，且比預期嚴重** —— `:1059` 用 fixture id `RSK-1042` 連到要 uuid 的
      `/risks/[id]` ⇒ **每個連結必定 404**。不是顯示不一致，是點了就壞 → BACKLOG
- [x] **Prong 2.5 — child component tree**：`policies` 兩頁的子元件樹 grep
  - DoD: `policies/` 全樹 = 2 個 `page.tsx`、**0 子元件檔、0 local 元件宣告** ⇒ 0 漂移
- [x] **Prong 3 — schema verify**：`Policy` 欄位級比對（型別 / nullable / enum 值域 / migration head）
  - Verify: `npx prisma migrate status` → `Database schema is up to date!`（25 migrations）⇒ 0 漂移
- [x] **D-baselines** — api test **484 / 40 suites** · api int **269 / 21**（見 §4.2 註）·
      web **10 files / 95 tests**（⚠️ 需 `--maxWorkers=4`；`npm run test` 現況 `1 (1)` + exit 1）·
      lint **0** · type **0** · build **`✓ Compiled successfully`** · `run_all` **9/9**（31 pre-doc）
  - Verify: `npm run test -w apps/web`（單獨跑，記下 `Test Files` 那一行）→ **重現了 `AD-UndiagnosedWebTestFailure-1`，並診斷出根因（D1）**
- [x] **Catalog drift** — progress.md Day-0 表格 → **15 條 drift finding（D1-D15）**
- [x] **Go/no-go** — 範圍變動 **~15%** ≤20% → **繼續**（D1 / D3 經使用者裁決後調整 plan）

### 0.2 盤點補掃（D-inventory-gaps —— 使用者裁決「全部補掃」）

- [x] **補掃六個缺口**（派工，broad search）
  - DoD: (a) `zh-Hant` 九份全讀 → **1 條實質偏離（D8）+ 3 條術語不一致 + 1 錯字（D9）** ·
        (b) `data/extended/` 10 檔 → **`/risk-programme` 8 → 29 條** ·
        (c) `lib/tok.ts` → **`tok('G')` 確認是綠**（`#1E8A5C` / `#3FB07C`），草稿判定不需推翻 ·
        (d) `entityPosture.ts` 全檔 · (e) `AppShell.tsx` 全檔 → **shell 每頁 +4 條** ·
        (f) `notifications.ts` → **是死檔，貢獻 0 條（D6）**
  - DoD: 派工 prompt 要求回報衝突 → **回報 4 條，全部成立**（含 D5 `/controls/[id]` 只修一邊）
  - Verify: 兩輪合併覆蓋核對 → **兩輪都漏的只有 2 檔**，已親自補讀（`permMatrix.ts` /
        `adminSections.ts`，依收斂規則各 **0 條**）

### 0.3 Branch

- [x] `git checkout -b feature/W24-policies-prose-guard`（從 `main` `5e517c5`）

---

## Day 1 — 平台停止宣稱它沒有的東西 + seed + vitest 根因 (US-1, US-2, US-3b)

### 1.1 讀 i18n 規則（guardrail 9 trigger）

- [x] **Read `docs/rules-on-demand/i18n-glossary.md`**
  - DoD: 動任何使用者可見文字之前完成 → ⭐ 其 §最重要的一條當場生效兩次

### 1.2 平台自宣稱（US-1）

- [x] **`auth.claim1` / `claim2` / `claim3` 改成誠實的等價物**
  - DoD: ⭐ **逐條驗證後只改兩條** —— `claim2`（tamper-evident append-only audit trail）
        **實測為真**（`audit-trail/chain.ts` + migration + 15 個模型），**不動**。
        `claim1` → `Built to ISO/IEC 27001 & 27017` /「依 ISO/IEC 27001 與 27017 建置」；
        `claim3` → `Entity-scoped access, enforced in the database` /「實體範疇存取控制，
        於資料庫層強制」（ADR-0004 + RLS 24 表，**同等強度且為真**）
  - Verify: `grep -rn "SOC 2\|27001 certified" apps/web/src` → **零個認證宣稱**
        （15 個 `SOC 2` 命中全是 `fw:` 框架條款參照，合法）
- [x] **`shell.env.meta` 改掉**（`en` + `zh-Hant`；今天兩語言**逐字相同**）
  - DoD: → `Seeded data · not production` /「種子資料 · 非正式環境」，**兩語言不再逐字相同**。
        ⚠️ 刻意避開「示範」—— repo 已有**兩種**譯法（「示範版本」/「示範環境」），
        依 GLOSSARY §最重要的一條不可自己挑第三種
- [x] **affordance 一併處置**（⭐ AD 的附帶教訓：只換文字不換 affordance 等於沒修）
  - DoD: `IconTick` stroke `var(--rag-g)` → `var(--rag-n)`（三條共用同一元件，改 stroke
        而非 markup 以保持 port 結構完整，約束 6）；`AppShell.tsx` 綠點 + 綠光暈 →
        `var(--rag-n)` + 中性 halo。兩處都加了說明為什麼的註解

### 1.3 vitest 根因（US-3b，Day-0 D1）

- [x] **`vitest.config.mts:74` `poolOptions` → `maxWorkers: 4`**
  - DoD: → **`Test Files 10 (10)` / `Tests 95 (95)`，零 Errors，零 DEPRECATED，exit 0**。
        `:64-73` 註解改寫保留，並記下 W19 的診斷是對的、死掉的只有承載方式
  - Verify: 無管線重定向 → `REAL EXIT=0`。同機對照：`Duration 82.65s → 40.64s`

### 1.4 dev seed（US-2）

- [x] **`seed.ts` 加 policies，跨 SG1 / HK1**
  - DoD: **8 筆**（4 SG1 / 4 HK1）· 六個 status **在畫面可見的列上**全覆蓋
        （⛔ 第一版把 `approved` 只放在軟刪除那筆上 ⇒ 永不渲染，補第 8 筆）·
        1 筆 `retiredAt` 非 NULL · owner/createdBy/updatedBy **全 NULL**（guardrail 7）
  - Verify: 連跑兩次輸出**逐字相同** → `8 demo policies upserted, 7 of them live`；
        psql 確認 `POL-SG1-900004` `soft_del = t`

### 1.x partial gate

- [x] lint + format + type-check（`apps/web` + `apps/api`）→ **0 / clean ×2 / 0**
      （+ seed.ts 獨立 `prettier` + `tsc --noEmit` 皆 0 —— `AD-SeedFileUngated-1`）
- [x] `npm run test -w apps/web` —— i18n parity 綠，**`Test Files 10` / 95 tests**

---

## Day 2 — 讀取路徑 + 守衛 + 盤點定稿 (US-3, US-4, US-5)

### 2.1 `lib/api/policies.ts`（US-3）

- [x] **兩個呼叫 + `PolicyRow` + 檔頭「API 送不出什麼」**
  - DoD: ⚠️ **一個呼叫不是兩個** —— 詳情頁不接（D3），所以沒有 `getPolicy`。
        檔頭逐欄列出 4 個無來源欄位 + `version` 的形狀差異，註明是 `curl` 量的
  - DoD: ⭐ **計畫外多了 `lib/api/client.ts`** —— policies 是第二個呼叫者，
        複製 fetch/信封/錯誤型別就是 AP-2。抽出後 risks 的 10 檔 95 測試**零變動通過**
  - Verify: `curl -s localhost:3210/policies` → 13 欄 + `_devPrincipal` + `_warning`；
        跨實體 id → **404**（約束 8）

### 2.2 ⭐ 具名檢查項（`AD-FixtureProseBecomesForgedEvidence-1` 的解封條件原文）

- [x] **列出 `/policies` 上所有對「這一筆記錄」做出的陳述，逐條問「API 送得出來嗎」**
  - DoD: **9 條裁決**（progress.md Day 2 的表）—— 3 留 / 4 `NoSource` / 2 改寫。
        ⭐ 其中兩條是**這個檢查才會問出來的**：meta 行的 `group-wide`（範疇宣稱，實際 SG1）
        與檔頭的「THE ONE SCREEN THAT IS NOT ENTITY-SCOPED」（被資料庫直接推翻）
  - DoD: ⭐ **Day-0 D2 補上的第二問**：「誰連結進這一頁？」→ `/policies/[id]` 的唯一入口是
        `policies/page.tsx:325`（同片處理）⇒ 不會複製 dashboard→risks 的斷鏈。
        **但它抓到了第 8 條**（列可點 → 詳情頁讀 fixture）。已寫進模板（§2.6）
  - Verify: 裁決表寫入 progress.md Day 2

### 2.3 列表頁接線（US-3）

- [x] **`/policies` 資料源 + loading / error / empty 三狀態**
  - DoD: 列數 == API 回的筆數；**負面測試**斷言 fixture 第一列標題（`Information Security Policy`）
        不在 DOM 裡
- [x] **category 篩選器處置**（Day-0 D4 / plan §8 R10）
  - DoD: 移除，或改用有來源的維度。⛔ 不得留一個永遠沒有選項的死控件
- [x] **`DemoBadge` 給 `partial`**
  - DoD: ⛔ 不得整頁標 `fixture` —— 那是 W22 抓到的反向違反
- [x] **`policies.test.tsx`**
  - Verify: `npm run test -w apps/web`（**期望 `Test Files 11`**）
- [ ] 🚧 ~~**`/policies/[id]` 資料源 + 四狀態（含 not-found）**~~
      **移出範圍** —— Day-0 **D3** 量到接完只剩 3 個真欄位、9 個區塊無來源；
      使用者 2026-08-19 裁決只接列表頁。解封條件見 plan §9（**不是「以後再說」**：
      `Policy` 要能承載文件本體 + 版本歷史）。⛔ 本項**保留不刪**，因為它是計畫過的交付物

### 2.4 守衛（US-4）

- [x] **`check_fixture_prose.py` 規則 1**（record-claim export × 已接 API 的表面）
  - DoD: 掃描面含 `app/**/page.tsx` **與 `components/shell/**`**（Day-0 D-fetch-direct 已獨立確認
        shell 符合定義）；型別位置放行；config-driven + `--self-test`；
        檔頭有「它量的是有沒有人繞過機制」的誠實聲明
- [x] **`check_fixture_prose.py` 規則 2**（平台自宣稱清單 × 無 demo 標示的表面）
  - DoD: 檔頭明寫**這條是刻意的開放集合例外**及其理由
- [x] **`data/**` 加 `@record-claim` 標記**（值不動）
  - Verify: `git diff --stat apps/web/src/data/`（只有註解行）
- [x] **`scripts/lint/tests/test_fixture_prose.py`** —— **29 tests**，unittest + importlib（照慣例）
  - DoD: ⛔ **第一版把 self-test 做成 `--self-test` 旗標而 `run_all` 不跑它** —— 一個不會被
        自動執行的 self-test 等於沒有。改為**無條件先跑**（照 `check_backlog_counts.py:303`），
        另建獨立測試檔給 CI（`ci.yml:108` 跑 `scripts/lint/tests/test_*.py`）
  - DoD: ⭐ **測試抓到一個設計問題**：allowlist 標記寫在註解裡（最自然的寫法）會被
        `strip_comments()` 吃掉 ⇒ claim 查 stripped body、allowlist 查原始 source
- [x] **註冊進 `run_all.py`**
  - Verify: `python scripts/lint/run_all.py`（**期望 10/10**）
- [x] ⛔ **負面驗證（這是驗收，不是附加）**
  - DoD: 規則 1 —— 把一個 record-claim export 放回 `/policies` 值位置 ⇒ **指定測試轉紅
        並指名該 export 與該檔**；規則 2 —— 把 `"SOC 2 Type II"` 放回 shell ⇒ 轉紅並指名。
        兩條都要改回後轉綠。⛔ 依 `AD-GateGreenDecaysAfterFix-1`，`run_all` 全綠**不是**證據
  - Verify: 每次中性化的**預測寫在執行之前**，結果貼進 progress.md

### 2.5 盤點定稿（US-5）

- [x] **`docs/09-analysis/fixture-prose-inventory-20260819.md`**
  - DoD: 27 頁（**含 0 條的頁**）· 每條 `file:line` + 逐字原文 + 類型 + fixture 來源 +
        affordance 欄 · **明文寫出 affordance 的收斂規則**（排除純風險評級與產品生命週期）·
        附覆蓋聲明（兩輪 agent + 我親補的 2 檔）
  - DoD: ⭐ **`/policies/[id]` 的 9 個無來源區塊逐一登記** —— 那是它今天不接的證據
  - DoD: ⛔ **零 code 變更**
  - Verify: `git diff --stat`（該 commit 只有 `docs/`）

### 2.6 模板加一格（AD 的原文要求）

- [x] **`docs/01-planning/_templates/phase/checklist.md.tpl` Day-2 加具名項**
  - DoD: 一行，內容是 §2.2 那個檢查的通用形式，**含 Day-0 D2 補上的第二問**
        （「誰連結進這一頁？」）；`check_rules_hygiene.py` 不因此超標
  - Verify: `python scripts/lint/run_all.py`

### 2.x Full gate

- [x] lint **0** · format **clean ×2** · type **0** · web **`Test Files 11` / 103 tests** ·
      `run_all` **10/10** · detector 測試 **5 檔全綠**（`test_fixture_prose.py` **29 tests**）
      ⚠️ api test / api int / build 留到 Day 4 final gate（本片零 API 邏輯變更）

---

## Day 3 — Drive-through (US-6) — 真 UI + 真後端 + 真 DB

### 3.1 Clean restart

- [ ] **殺光 3200 / 3210 上的孤兒 worker，確認新程序是唯一擁有者，擷取 startup log**
  - DoD: 依 `task-workflow.md` §Risk Class C —— 列出所有 node 程序、檢視 PID/PPID/StartTime，
        強制殺掉父程序已死或 StartTime 早於本次重啟的 worker
  - Verify: startup log 行 + `netstat` 確認唯一擁有者

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [ ] **`/login`** —— 三條 claim 與 footer 一起看：**沒有任何未經標示的認證宣稱**，綠勾已處置
- [ ] **`/policies`** —— 列數 == API 筆數；切到另一個 persona 看範疇；停掉 API 看錯誤狀態；
      category 篩選器的處置在真 UI 上成立
- [ ] **shell 迴歸抽查**（plan §8 R7 —— 改 shell 影響 25 個畫面）
  - DoD: 額外開 **2 個未接 API 的畫面**確認 shell 沒壞
- [ ] **逐控件走查**：可點 / 有效果 / 標籤真實 / 結果真的渲染
- [ ] 截圖 + observed-vs-intended → progress.md Day 3
- [ ] 🚧 ~~**`/policies/[id]`**~~ **移出範圍**（見 §2.3）—— 但**仍要開一次確認 shell 改動沒弄壞它**

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-044-<slug>.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含 drive-through PASS + 關掉的 AD）
  - DoD: 明寫兩個**射程限制**：規則 2 是開放集合會漏 · 未標記的新 export 對規則 1 不可見；
        並明記 US-1 是「有記錄的設計偏離」（W19 先例）
  - DoD: ⭐ 保留 vitest 的**同負載對照**（`npm run test` 1 檔+exit 1 vs `--maxWorkers=4` 10 檔+exit 0）

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 12 個資料點**；
      ⚠️ 該 class 的判準是「第 12 點同量法再 <0.7 則 re-point 0.45」）
- [ ] ⭐ **B1 vs B2 比較**（`AD-BottomUpEstimateInflated-1` 第 3 個資料點）
  - DoD: `actual` 落在 B1（20.5 hr）還是 B2（7.6 hr）附近。⚠️ **本片分辨力低** ——
        B2 與 calibrated B1（7.7）幾乎重合，不得把「兩者都接近」當成兩種方法都對
- [ ] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（完整敘述 → `calibration-log.md`）
- [ ] Final gate sweep: lint 0 · type 0 · api test ≥ 484 · api int ≥ 269 ·
      web **`Test Files 11`** · build clean · `run_all` **10/10**
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated（**只有 2 行**）· `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`
  - DoD: CLOSE —— `AD-FixtureProseBecomesForgedEvidence-1` 機械層 · `AD-UndiagnosedWebTestFailure-1`（D1 根因已修）
  - DoD: 新增 —— D2 斷鏈 · D3 詳情頁後端未備 · D6 死檔 · D7 硬編碼 posture · D8 分級偏離 ·
        D9 錯字 · D12 白勾 · D15「量測方式吃掉紅燈」第 2 次
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] ⭐ **已採納的 ADR 已複查** —— 本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
- [ ] ⭐ **`PR-pending` 標記已翻** —— 以 `gh pr view <N> --json state,mergedAt` **驗證**，
      不採信「已 merge」的宣稱。機械守衛：`check_status_markers.py` **E5**
