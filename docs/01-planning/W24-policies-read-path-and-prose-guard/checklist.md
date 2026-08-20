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

- [x] **殺光 3200 / 3210 上的孤兒 worker，確認新程序是唯一擁有者，擷取 startup log**
  - DoD: ⭐ **沒有孤兒** —— 我第一眼判定 `2628` 是孤兒 worker，查了才知道它是 nest CLI 自己
        spawn 的 `cmd.exe` wrapper（`local-runtime-ops.md` §4「一個服務兩個進程」）。
        兩條鏈的祖先都是上個 session 的 `bash.exe`：**使用者 kill 的是 task 追蹤不是程序**。
        仍全數重啟（9 個 PID），playwright MCP × 4 與 codex × 1 不動
  - Verify: `3200` pid `21032` / `3210` pid `57180`，各 **1 個** listener，皆晚於最後 commit；
        startup log 有 `DevPrincipal` WARN + `Nest application successfully started` +
        `listening on http://127.0.0.1:3210` + `/policies` 三條路由 mapped。
        ⚠️ `[::1]:3210` 被拒是綁 `127.0.0.1` 的預期行為，非故障

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [x] **`/login`** —— 三條 claim 與 footer 一起看：**沒有任何未經標示的認證宣稱**，綠勾已處置
  - DoD: 三條 claim 逐字如 Day 1 所改；footer `Demonstration build · not a production environment`。
        ⭐ affordance 用 computed style 驗（不是看截圖）：三個勾 stroke 全 `rgb(124,135,148)` =
        `--rag-n`，`--rag-g`(`#1e8a5c`) 在這三處**一次未出現**
- [x] **`/policies`** —— 列數 == API 筆數；切到另一個 persona 看範疇；停掉 API 看錯誤狀態；
      category 篩選器的處置在真 UI 上成立
  - DoD: **8 == 8** 逐筆對上，六 status 全覆蓋，軟刪除的 `900004` 不在其中；
        fixture `Information Security Policy` 不在 DOM；32 個 `data-no-source`（8×4）；
        `PART REAL`；category 篩選器已移除；`Status` 篩選器有效果（Draft→3 / Published→1 / All→8）
  - DoD: 範疇 —— scope selector 切到 `Ricoh Hong Kong Ltd` ⇒ **8 列一列未動**，
        證實頁面註記「changes the label and nothing else」為真（範疇由伺服器 DevPrincipal 決定）
  - DoD: 停掉 API（真的 kill 5 個 PID，非 mock）⇒ `data-source-state="error"` · 0 列 ·
        **fixture 零洩漏** · 「Nothing is shown rather than sample data in its place」；重啟後回復 8 列
- [x] **shell 迴歸抽查**（plan §8 R7 —— 改 shell 影響 25 個畫面）
  - DoD: 額外開 **2 個未接 API 的畫面**確認 shell 沒壞 → `/controls`（14 nav · 10 header btn · 10 列）
        + `/isms-profiles`（⭐ **shell chrome 內 0 個 RAG 綠元素**）
- [x] **逐控件走查**：可點 / 有效果 / 標籤真實 / 結果真的渲染
  - DoD: ⛔ **「標籤真實」這一格抓到一個缺陷** —— meta 行的 `N policies` 算篩選後、
        `M under review` 算全集，Published 篩選下印出「1 policies · 1 under review」而畫面上 0 筆。
        已修（`page.tsx:139` 改從 `view` 算）+ 補測試。根因見 progress.md Day 3
  - DoD: `New policy` 非死控件（`disabled` + `not-allowed` + `opacity:.5` + title 說明理由）；
        列不可點（`cursor:auto`、無 onclick、0 連結 0 按鈕）；persona 按鈕 → POST 200 → `/dashboard`
- [x] 截圖 + observed-vs-intended → progress.md Day 3
  - Verify: `artifacts/day3-01-login.png` · `day3-02-policies-list.png` · `day3-03-policies-api-down.png`
- [x] 🚧 ~~**`/policies/[id]`**~~ **移出範圍**（見 §2.3）—— 但**仍要開一次確認 shell 改動沒弄壞它**
  - DoD: `POL-301` 正常渲染，h1 = `Information Security Policy`，`DEMO` badge 在，env dot 中性 ⇒ 未弄壞

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-044-unclaim-the-platform-and-guard-the-prose.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 drive-through PASS + 關掉的 AD）
  - DoD: 兩個射程限制已明寫於 §Impact；US-1 明記為「有記錄的設計偏離」（`15-design-alignment.md` ——
        「平台是否通過 SOC 2」是事實問題不是設計問題）
  - DoD: ⭐ vitest 同機對照**四列**已補（修正前無旗標 `Test Files 1` + exit 1 · 修正前加旗標 10 檔 ·
        修正後 Day 1 10 檔 · 修正後 Day 4 **11 檔 / 104 tests**）。⚠️ 起草第一版**漏了這一格**，
        是回頭核對 checklist DoD 才補上的

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 12 個資料點**；
      ⚠️ 該 class 的判準是「第 12 點同量法再 <0.7 則 re-point 0.45」）
  - DoD: actual **~2.9 hr** / committed 7.7 ⇒ ratio **0.377 UNDER**，量法與 W18 相同
        ⇒ **判準字面觸發** ⇒ **re-point 0.50 → 0.45**（本專案第一次 re-point）
- [x] ⭐ **B1 vs B2 比較**（`AD-BottomUpEstimateInflated-1` 第 3 個資料點）
  - DoD: `actual` 落在 B1（20.5 hr）還是 B2（7.6 hr）附近。⚠️ **本片分辨力低** ——
        B2 與 calibrated B1（7.7）幾乎重合，不得把「兩者都接近」當成兩種方法都對
  - DoD: ⭐ **警告成立** —— `actual/B2` **0.382** vs `actual/calibrated-B1` **0.377**，只差 **0.005**。
        已在 retro Q2 與 calibration-log 明寫正確讀法是**兩者都高估約 2.6 倍**，不是兩種方法都對。
        真訊號在 `actual/bottom-up` **0.141**（W22 0.26 · W23 0.25）⇒ 該修估算方法不是乘數
- [x] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（完整敘述 → `calibration-log.md`）
- [x] Final gate sweep: lint 0 · type 0 · api test ≥ 484 · api int ≥ 269 ·
      web **`Test Files 11`** · build clean · `run_all` **10/10**
  - DoD: **api test 484 / 40 suites** · **api int 269 / 21** · api build exit 0 ·
        web build `✓ Compiled successfully in 2.7min` **31 routes**（與 Day-0 baseline 一致）·
        web test **`Test Files 11 (11)` / `Tests 104 (104)`** · `run_all` **10/10**
  - DoD: ✅ **lint / format / type 已於機器恢復後補跑（2026-08-20 13:43–13:48）**：
        web lint **0** · api lint **0** · web type **0** · api type **0** ·
        web fmt **clean** · api fmt **clean**，六項 exit 0，**耗時約 4 分鐘**
  - DoD: ⚠️ **補跑前這一格寫的是「引用 Day 3 實測值」** —— 當時 Day 4 的重跑因機器 I/O 飽和
        在 21 分鐘後仍未推進（eslint 活著但只累積 1.4s CPU），依 `local-runtime-ops.md` §1
        未殺掉重跑，且**明確不寫成「Day 4 重跑通過」**。⭐ 保留這段是因為它是本片的一個決定：
        **寧可標「欠著」也不標綠**；4 分鐘的實際耗時反證了當時不是工作量問題
  - DoD: ✅ **`run_all` 已重跑並涵蓋 closeout 尾段四個檔** —— **10/10**，
        `doc-links` 與 `path-references` 皆綠（先前那次 run_all 早於 retrospective /
        memory subfile / progress Day 4 / RISK_REGISTER）
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated（**只有 2 行**）· `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`
  - DoD: CLOSE —— `AD-FixtureProseBecomesForgedEvidence-1` 機械層 · `AD-UndiagnosedWebTestFailure-1`（D1 根因已修）
        ⇒ **兩條都已從 §Open 移除**（腳本逐行核對，印出被刪行的字元數與前 160 字作為證據）
  - DoD: 新增 —— D2 斷鏈 · D3 詳情頁後端未備 · D6 死檔 · D7 硬編碼 posture · D8 分級偏離 ·
        D9 錯字 · D12 白勾 · D15「量測方式吃掉紅燈」第 2 次
        ⇒ **新增 14 條**（含 D5 `/controls/[id]` 與 Day 3 的 5 條）。**D15 併入既有的
        `AD-GrepAssertion-1`** —— 它是該形狀的收集器；⚠️ 我一度想略過這一格，是回頭核對本 DoD 才加的。
        另補 2 條既有 AD 的 W24 資料點（`AD-ScopeSelectorInertOnLiveScreens-1` ·
        ⛔ `AD-ShaDetectorConsoleEncoding-1` —— **今天又撞到一次**，證明它的影響面比登記的大）
  - Verify: `python scripts/lint/check_backlog_counts.py` → detector 報 total 177→**189** /
        P1 96→**101** / P2 76→**83**（P0 不變 5），**照抄不手數**
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
  - DoD: **總計 1** —— ⛔ **AP-6 一件（已修）**：測試 mock 丟掉 `trf` 的插值變數。
        其餘 6 項 0 / N/A。⚠️ 不寫成 0 —— 那件事真的發生了，而且是本片最重要的發現
- [x] ⭐ **已採納的 ADR 已複查** —— 本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？
  - DoD: **ADR-0004** 本片是它的第 2 個消費者，行為與描述一致（範疇來自憑證，跨實體 id 回 404）⇒ 無需修改。
        ⚠️ **ADR-0007 已被 ADR-0015 取代（W23）而 `/policies` 的 `_warning` 仍引用它** ——
        既有 orphan claim，非本片造成且在 `apps/api`（不屬本片範疇）⇒ 記 BACKLOG 不順手改
  - DoD: ⭐ `RISK_REGISTER.md` **E5 一列已改寫** —— 本片正是它的處置；敞口降低但**未歸零**
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
  - 🚧 **阻塞：等使用者確認 push**。本地 commit 已完成，數量與 SHA 見
        `git log --oneline main..feature/W24-policies-prose-guard`。
        ⚠️ **這裡刻意不寫死數字** —— 第一版寫「5 個」並列了 6 個 hash，而下一個 commit
        立刻讓它變成 7。**一個會在下一次動作後過期的數字，不該寫進追蹤文件**。
        ⛔ 本項**不勾**，因為 push / PR / CI / merge 一項都還沒發生
  - ✅ **解封前欠的那件事已補**（使用者裁決「等機器恢復，補跑 run_all 和 lint 再說」）：
        `run_all` **10/10**（涵蓋 closeout 尾段四個檔）+ lint/type/format **六項全 0/clean**。
        ⇒ **gate 側已無欠項**，剩下的純粹是 push / PR / CI / merge
- [ ] ⭐ **`PR-pending` 標記已翻** —— 以 `gh pr view <N> --json state,mergedAt` **驗證**，
      不採信「已 merge」的宣稱。機械守衛：`check_status_markers.py` **E5**
  - 🚧 **阻塞：merge 尚未發生**。目前 `CH-044` / `retrospective` / `MEMORY.md` /
        `CLAUDE.md` / BACKLOG §Shipped 五處都寫 `PR-pending`，⭐ 而 `run_all` 的
        **E5 landed-gate 確認這是合法狀態**（plan 已 `closed` 但該 close 尚未落到 `origin/main`）
