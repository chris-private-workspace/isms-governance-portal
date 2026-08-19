# Phase W22 — Checklist (wire the risks screens to the real API)

[Plan](./plan.md)

> ⛔ **本片的順序有一處不可調換**：seed（Day 1）必須在 fetch 層（Day 2）之前。
> 先接前端會得到一個「成功顯示 0 筆」的假通過（plan §8 R5）。

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD **`e17464e`** —— PR #85 merge 後）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`
> ⛔ **本片的 recon 做在 PR #84 merge 之前的分支上，SHA 已被 rebase 改寫**
> （`f3511c8` → **`700ef62`**，author date `2026-08-18T14:47:10+08:00` 逐秒不變）——
> 錨點已重指，但**內容仍須全部重驗**：重指的是指標，不是事實。

- [x] **Prong 1 — path verify**：`apps/web/src/lib/api/` 不存在 · `apps/api/prisma/seed.ts` 不存在 ·
      八個 EDIT 目標全部存在 · **`CH-042` 未被佔用**
  - Verify: `Glob apps/api/prisma/**` + 列 `docs/03-implementation/changes/` 取最大號
  - ✅ **四項預測全中**。`prisma/` 只有 `migrations/` + `schema.prisma`；changes/ 最大號 `CH-041`，bugs/ 空
- [x] **Prong 2 — content verify**（drift → progress.md）—— 六個子項全部完成（2 個漂移）:
  - [x] **D-no-byid** — ✅ 如預期：`:77 @Controller('risks')` · `:91 @Get()` · `:97 @Post()`，無 `@Get(':id')`
  - [x] **D-policy-shape** — ✅ 如預期：`:89 @Get(':id')` · `:90 async byId` · `:98 NotFoundException`，list-then-find，且註解已寫明「回 403 等於得先知道那列存在」
  - [x] **D-fixture-import** — ⚠️ **半中**：兩頁都仍 import `@/data/risks`（`page.tsx:56` · `[id]/page.tsx:92`），但詳情頁**另有四個 fixture 來源** → 見 plan R7 `D-detail-hybrid`
  - [x] **D-no-seed** — ✅ 如預期：`find` 零命中，`package.json` 無 `prisma:seed`
  - [x] **D-threat-vuln-endpoints** — ✅ 如預期，且**比預期更強**：`modules/` 底下 13 個目錄**連 threat / vulnerability 目錄都沒有**，全 repo 零 `*.controller.ts` 提及它們
  - [x] **D-307** — ❌ **證偽**：`apps/web` 無 middleware；307 來自 `(app)/layout.tsx:50` 的未登入閘門，與 id 無關。已登入 + 不存在的 id → **200 + 行內 not-found 卡**（`[id]/page.tsx:218-228`，中英 key 皆備）→ 見 plan R8，AC-6/AC-8 已改寫
- [x] **Prong 2.5 — child component tree** —— ⭐ **本片必做**：
      `risks/page.tsx` 與 `[id]/page.tsx` **的子元件**是否也直接 import fixture？
      （entry 元件改對了不代表子元件跟著改 —— W20 的教訓）
  - Verify: 從兩頁的 import 逐層往下 grep `@/data/`
  - ✅ 兩頁的直接子元件（`DemoBadge` · `icons` · `shell-state`）零 risk fixture；
    `shell-state.ts:37` 只 import **type**。⚠️ 但 shell 層 `AppShell.tsx:103` 吃 `@/data/opcos` ——
    那是實體切換器，即 D1「切換 persona 不改變 API 回傳」會在畫面上長出來的地方 → checklist 2.2
- [x] **Prong 3 — schema verify**：**N/A** —— 本片零 schema 變更。
      ⚠️ **但要確認 `isms_dev` 的 migration head 是最新的**（`AD-DevDbChecksumDrift-1` 已 5 次）
  - ~~Verify: `npm run prisma:migrate -w apps/api` 的 status 輸出~~
    ⛔ **Day-0 更正**：該 script = `prisma migrate dev`，它**套用**遷移、偵測 drift 時要求 reset dev DB，
    而本項 DoD 只要 status。**一個 Verify 指令比它要驗的東西危險** → plan R10
  - Verify（更正後，唯讀）: `cd apps/api && npx prisma migrate status`
  - ❌ **落後一個**：25 個 migration 中 `20260817033944_event_and_posture_snapshot` **未套用**
    → `AD-DevDbChecksumDrift-1` **第 6 次**。Day 1 開工前跑 `prisma migrate deploy`（不是 `dev`）→ plan R9
- [x] **D-baselines** — ✅ **六項逐項實測，全部與 plan 宣稱相符**：
    api test **480 passed / 40 suites** · web test **88 passed / 9 files** · lint clean（api+web）·
    type-check clean（api+web）· format:check clean · build clean（`/risks` 與 `/risks/[id]` 皆 `ƒ` 動態）·
    `run_all` **9/9**（於 `e17464e`）
- [x] **Catalog drift** — progress.md Day-0 表格（4 條 drift：`D-detail-hybrid` · `D-307` · `D-migration-lag` · `D-verify-cmd`）
- [x] **Go/no-go** — **20-50% 帶** → 已修訂 plan §3.4 / §4 / §5 / §7 / §8 並回報；**使用者 2026-08-18 裁決後 GO**
- [x] **D1 / D2 拍板已取得**（plan §3.6）—— ⛔ D1 未定不可寫 fetch 層
- [x] **⏱ 寫入本日耗時到 progress.md** —— Day 0 **≈ 20 min**（est 30 min，ratio ≈ 0.67）

### 0.2 Branch

- [x] `git checkout -b feature/W22-risks-slice`（從 merge 後的 `main` `e17464e`）

---

## Day 1 — 端點與 seed (US-2, US-3)

### 1.1 `GET /risks/:id`

- [x] **`@Get(':id')` —— 逐字複製 `policy.controller.ts:89-102` 的形狀（含註解理由）**
  - DoD: 範疇內 200；**不存在**與**跨實體**都回 404 且回應體不可分辨
  - Verify: `npm run test -w apps/api` → **484 passed / 40 suites**（480 → 484，新增 4 個 `it()`）
  - ✅ 註解逐字帶過來了；O(n) 的代價另寫**有可觀察到期條件**的註解，不是「以後優化」
- [x] **四個範疇測試**（`risk.int.spec.ts` 測試 19-22）
  - DoD: 跨實體讀拒絕 / 不存在拒絕 / **兩者回應相同** / RLS 層獨立成立
  - ⛔ **必做中性化**：拿掉範疇過濾，斷言**哪幾條轉紅**；預測寫在執行之前
  - Verify: `npm run test:int -w apps/api` → **269 passed / 21 suites**（265 → 269）
  - ✅ **中性化 5/5 與預測相符**（2 紅 20/21 · 3 綠 19/22/單元），預測寫在 progress.md 執行之前
  - ⭐ 其中一格買到的是壞消息：**21 條單元測試在範疇完全失效時全部維持綠** —— 詳見 progress.md

### 1.2 Dev seed

- [x] **`apps/api/prisma/seed.ts`（冪等，固定 id `upsert`）**
  - DoD: 連跑兩次，列數不變
  - Verify: `npm run prisma:seed -w apps/api` ×2 → `SELECT count(*)` **12 → 12** ✅
  - ⚠️ 前置：`prisma migrate deploy` 先補上 Day-0 抓到的落後 migration（25/25）
- [x] ⭐ **跨兩個 `org_entity`，且兩邊都有風險**
  - DoD: ⛔ 否則範疇過濾「有生效」與「沒生效」在 drive-through 中看起來一模一樣
  - Verify: 逐 entity 計數 → **SG1: 9 · HK1: 3**，兩者皆 > 0 ✅
  - ✅ seed 自己在 `counts.length < 2` 時拋錯 —— 這條 DoD 有機械承載，不只靠人記得看
- [x] **guardrail 7 檢查**：無 checksum 有效卡號、無真實個資、email 用 `.invalid`
  - Verify: 人工讀一遍 + `python scripts/lint/run_all.py`
  - ✅ 零人名 / 零 email / 零卡號形狀數字；`owner_user_id`·`created_by`·`updated_by` 全留 NULL
  - 🚧 **gitleaks / semgrep 對新檔的結果延到 Day 2**（plan R3 原本就這樣排）

### 1.x partial gate

- [x] `lint` · `type-check` · `test -w apps/api` —— 三者 clean + **484 passed**
  - ⚠️ `format:check` **第一次紅**（python 就地編輯的三個檔），`prettier --write` 後綠
  - ⚠️ **`prisma/seed.ts` 不在上述任何一個 gate 的射程內** → `AD-SeedFileUngated-1`，本次手動補驗
- [x] **⏱ 寫入本日耗時到 progress.md** —— Day 1 **≈ 35 min**（15:42 → 16:17）

---

## Day 2 — 前端接上去 (US-1, US-4)

### 2.1 fetch 層

- [x] **`apps/web/src/lib/api/risks.ts` —— `list` / `byId` + 型別一處定義**
  - DoD: 無新增相依（不引資料抓取函式庫 —— AP-5）✅ 沿用 `app/page.tsx:45` 的 fetch pattern
  - Verify: `npm run type-check -w apps/web` → clean
  - ⚠️ 型別**刻意不放 `packages/types`** —— 只有一邊 import 的契約項目是平行定義
    → `AD-RiskContractUndeclared-1`

### 2.2 兩頁換資料源

- [x] **`risks/page.tsx` 資料源 fixture → API**
  - DoD: loading / error / empty **三個狀態都有可見 UI** ✅
  - ⛔ **error 不可回退到 fixture**（AP-6：後端掛掉時畫面看起來正常）
  - Verify: `npm run test -w apps/web` → **95 passed**（新增 7）
  - ✅ AC-5 有**具名測試**：斷言 fixture 第一列的標題（`Unpatched externally-facing systems`）
    **不在 DOM 裡** —— 若有人補回 `catch { return risks }`，畫面會完美而只有這條會紅
  - ⚠️ 額外：頂欄 scope 不再過濾此列表（範疇來自伺服器，再濾是演戲）；
    選項為空的篩選器整個不渲染（死控件 = W19 那 25 個的形狀）
- [x] **`risks/[id]/page.tsx` —— 只換 risk 表頭的資料源**（Day-0 裁決，plan §3.4 / R7）
  - ⛔ **Day-2 發現裁決在字面上執行不了**：fixture 區塊全靠 OpCo 碼當 key，API 給 UUID ⇒ 濾成空；
    且 `risks.find(r => r.id === id)` 用 UUID 找 fixture 必然落空 ⇒ **整頁必須由 API 驅動**。
    使用者二次裁決：照列表頁同一套用 `NoSource`（空清單不可接受 —— 讀起來是「這筆風險沒有控制」）
  - ✅ 四個狀態：loading / error / **not-found（兩種 404 同一張卡，零分支）** / unassessed
  - ~~DoD: 不存在的 id 得到 **404 頁面**，不是 307~~
    ⛔ **Day-0 證偽**：沒有 307 這回事，那是 `(app)/layout.tsx:50` 的未登入閘門
  - DoD（改寫後 = AC-6）: **不存在的 id** 與 **跨實體的 id** 渲染**完全相同**的畫面 ——
    同一張 not-found 卡、同一段文案，不因後者實際存在而有任何差異
  - ⛔ **兩種都要測**，只測前者證明不了不可分辨
  - Verify: 新增 web 測試斷言兩條路徑產生相同輸出 ✅ **比對 `innerHTML`**（遮蔽 id 之後
    必須逐字相同）—— 只斷言「兩者都顯示某種 not-found」抓不到未來新增的分支
- [x] ⭐ **`DemoBadge` 加「部分真實」變體**（Day-0 新增，plan §4 第 10 列 / R7）
  - DoD: 詳情頁指名**哪些區塊仍是樣本**（controls / issues / 稽核軌跡 / 簽核 / 階段）✅
  - ⛔ 沿用現有 badge 就是讓它**反過來說謊** —— 宣稱整頁是樣本，而表頭是真的
  - Verify: web 測試斷言 `[data-demo-variant="partial"]` 存在且 `"fixture"` 不存在
  - ⚠️ **列表頁也改用 partial** —— 它的列同樣已經是真實資料了
- [x] ⭐ **D1 的落差在 UI 上被標示**（若採選項 a）
  - DoD: 切換 persona **不改變** API 回傳這件事，畫面上說得出來 ✅
  - ⛔ 不標示就是 W19 那 25 個死控件的形狀
  - ✅ 做法：**移除**頂欄 scope 對列表的過濾（再濾一次是演戲，只能移除伺服器已決定要送的列），
    並在頁面上以 `risks.partialSource.text` 說明哪些欄位無來源
  - 🚧 **「切換 persona 不改變回傳」這句話本身尚未在真 UI 上走查** —— 留給 Day 3 drive-through

### 2.x Full gate

- [x] `format:check` · `lint` · `type-check` · `test`（api + web）· `build` · `run_all` 9/9
  - format clean · lint clean · type clean · api **484** · web **95** · build `✓ Compiled` · run_all **9/9**
  - ⚠️ `format:check` **第二次**因 python 就地編輯而先紅（4 檔），`--write` 後綠
  - 🚧 **gitleaks / semgrep 對新檔（plan R3）本機未安裝**，只在 CI 有
    ⇒ 解封條件：本片 PR 的 CI run
- [x] **⏱ 寫入本日耗時到 progress.md** —— Day 2 **≈ 36 min**（20:52 → 21:28）

---

## Day 3 — Drive-through (US-5) — 真 UI + 真後端 + 真 PostgreSQL

### 3.1 Clean restart

- [x] **殺掉陳舊的 dev server 與孤兒 worker；確認新程序是 3200 / 3210 的唯一擁有者**
  - DoD: 擷取**兩個服務的 startup log**（seed 只在啟動時載入 —— Risk Class C）
  - ✅ 啟動前 **0 個 node 程序**、兩個 port 皆空 ⇒ 「唯一擁有者」由**構造**保證，不是推論
  - ✅ 3200 = PID 51720（next dev）· 3210 = PID 51952（API）
  - ✅ **wiring 生效的證據**（非「它有回應」）：
    `[RouterExplorer] Mapped {/risks/:id, GET} route` ——
    新端點活在**這個**程序裡；`[DevPrincipal] DEV PRINCIPAL ACTIVE — ... (SG1) ...`；
    `[NestApplication] Nest application successfully started`；web `✓ Ready in 7.8s`
- [x] **確認瀏覽器用 `localhost` 不是 `127.0.0.1`**（W20：dev origin 檢查會回 403）
  - ✅ 全部探測走 `http://localhost:3200`，`POST /api/demo-session` 回 `{"ok":true}` 200

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [x] **`/risks` 列表顯示的列數 == `GET /risks` 回傳的列數**（**不是** fixture 的列數）
  - ✅ 真瀏覽器實測 **9 列**，ref code `RISK-SG1-900001..4` + `000001..5`；fixture 是 10 筆
- [x] **點一筆進詳情，看到的是同一列**
  - ✅ 點 `RISK-SG1-900003` → `/risks/0000ee00-…-03`，標題相符
- [ ] ~~**`/risks/<不存在的 id>` → 404 頁面**~~
      ⛔ **Day-0 已改寫**（AC-6）：改為**不存在的 id 與跨實體的 id 渲染完全相同的畫面**；
      HTTP 層兩者都是 200，真 404 status 另記 `AD-Real404Status-1`
- [x] **停掉 API → 列表顯示明確錯誤，不回退 fixture**
  - ✅ **真的 `Stop-Process` 掉 API**（3210 確認釋放）後重載：`data-source-state="error"`、
    0 列、**5 個 fixture 標題零洩漏**、無任何風險編號 ⇒ **AC-5**
- [x] **逐控件走查**：可點 / 有效果 / 標籤真實 / 結果真的渲染
  - ✅ row click · scope 選擇器 · Category 篩選（9 → 2 列，選項來自真實資料）·
    Residual 篩選 · badge · 返回連結
  - ⛔ **抓到 8 個缺陷，全部在 gate 全綠時存在** —— 詳見 progress.md，已全數修正並覆驗
- [x] ⭐ **切換 persona，記錄實際發生什麼** —— 與 D1 的預期比對
  - ⛔ **實際比預期更糟**：切到 `RSG` 後 meta 行變成「9 risks · **RSG**」而列一列沒變 ——
    選擇器改的是**宣稱**不是資料，比死控件更危險（它看起來生效了）
  - ✅ 修正：meta 行改為 `server-set scope`，說明行加「選擇器不會過濾這張清單」；
    覆驗切到 `RHK` 後標籤不再宣稱、無 HK1 洩漏
- [x] 截圖 + **observed-vs-intended 對照** → progress.md Day 3
  - ✅ 6 張 `artifacts/W22-drivethrough-0{1..6}-*.png`，含 **API 真的停掉**那張與
    **偽造證物**那張（修正前的證據）
- [x] **⏱ 寫入本日耗時到 progress.md** —— Day 3 **≈ 75 min**

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-042-<slug>.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含 drive-through PASS）
  - ✅ `CH-042-risks-read-path-meets-the-api.md`。⭐ Root Cause 寫的是**每一層的 gate 都把自己
    那一半當成全世界**（三層各自注入什麼 / 因此看不見什麼），不是「還沒做」
- [x] **開一條 AD 記錄 `byId` 的 O(n)**，解封條件寫成**可觀察的**（單一 entity 的風險數超過
      一個畫面能顯示的量），⛔ 不是「以後記得優化」
  - ✅ `AD-RiskByIdLinearScan-1` 🟢 —— 解封條件寫成「列表本身開始分頁」，
    且記明**今天不改的理由是安全不是效能**

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`greenfield-feature` 0.55，**第 1 個真資料點**）
  - ✅ ratio **0.46 UNDER**，KEEP 0.55（單點不 re-point）
  - ⭐ **真正的訊號在 `actual / bottom-up` = 0.26**（< 0.4 下限）⇒ matrix 判決是
    「該修的是估算不是乘數」；高估點有共同形狀：**有藍本的東西被當成沒有藍本估**
- [x] `calibration-matrix.md` 那一行（**≤ 1 行 ~250 字元**，敘述 → `calibration-log.md`）
  - ✅ `greenfield-feature` 從 `n/a (0 pt)` → **1 pt**；完整敘述含「有沒有藍本」對照表進 log
- [x] Final gate sweep: `format:check` · `lint` · `type-check` · `test` · `build` · `run_all` 9/9
      + **gate 射程聲明**（哪些只在 CI 成立）
  - ✅ format / lint / type clean · api **484 / 40 suites** · web **95 / 10 files** ·
    build `✓ Compiled successfully in 39.3s` · `run_all` **9/9**
  - ✅ **射程聲明已寫入** progress.md Day 4 與 CH-042：gitleaks / semgrep 本機未安裝（🚧 CI）；
    `prisma/seed.ts` 不被任何本機 gate 讀（`AD-SeedFileUngated-1`），手動補驗
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      ~~`BACKLOG.md`（CLOSE `AD-FrontendMissingIdRedirects-1`）~~
  - ⛔ **Day-0 已改寫**：該 AD **更正而非關閉**（它描述的缺陷不存在）——
    關閉一條從來不存在的缺陷等於在 BACKLOG 留一條假的關閉紀錄。本 phase **關閉 0 條 AD**
  - ✅ `CLAUDE.md` 只動 2 行 · `MEMORY.md` +1 指標 · `memory/project_w22_risks_vertical_slice.md` ·
    `BACKLOG.md` 新增 6 / 更新 1 + W22 pointer row（detector 報 164→170，照抄）
  - ✅ **額外**：`RISK_REGISTER.md` —— R4 敞口性質改變（從「缺席」變成「被否認」）+ 新增 **E5**
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
  - ✅ **總計 0（修正後）**。⛔ **修正前是 8，那個數字比 0 重要** ——
    三個是 AP-3 的教科書形態（fixture 裝成真 / 標籤誤導 / 控件看起來有效果而實際沒有）
- [ ] ⭐ **夾帶審計 #7 的 `AD-27` 與 `AD-30`**（ADR-0011 那行 · ADR-0007 的 Azure China 指令）
      —— 使用者核可才做；⛔ **根因是「closeout 檢查表沒有 ADR 那一格」**，那才是要修的東西
  - 🚧 **未做 —— 未取得使用者核可**（本次 closeout 的指示未包含此項）。
    解封條件：使用者核可夾帶，或另開一片處理審計 #7 的 ADR 層 8 條
- [x] **⏱ 寫入本日耗時到 progress.md** —— Day 4 **≈ 25 min**（09:31 → closeout commit）
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
