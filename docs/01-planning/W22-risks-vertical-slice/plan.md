---
status: draft   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W22 Plan — wire the risks screens to the real API

**Summary**: 讓 `risks` 的**讀取路徑**端到端接起來 —— 列表與詳情頁停止讀 `@/data/risks` fixture，
改打真的 API。⛔ **不含寫入路徑**（`/risks/new`）：`POST /risks` 要求 `threatId` 與
`vulnerabilityId`，而**這兩個實體今天沒有任何端點**，做表單會先變成建三個端點。
關鍵範圍決策：(a) 只做讀取 (b) 補 `GET /risks/:id`（今天不存在）(c) 補 dev seed（資料庫是空的）
(d) 把不存在的 id 從 307 改成 404。**Drive-through MANDATORY 且只在本機** ——
`apps/api` 在 production 起不來，這一片到不了示範網址。非 spike，**不產出 design note**。

**Status**: **Approved-to-execute**（使用者 2026-08-18 —— 核可「讀取路徑 only」的範圍，
並拍板 §3.6 的 D1（伺服器端 env）與 D2（seed 進版控））。

**Branch**: `feature/W22-risks-slice`
**Base**: `main` HEAD **`700ef62`**（PR #84 已於 2026-08-18T07:08:46Z **rebase-merge**，
`gh pr view` 驗證為 MERGED）—— W21 closeout + 審計 #7。
⚠️ **本片 §0 的 recon 做在 merge 之前**，SHA 已隨 rebase 改寫（第 12 次），錨點已重指；
**Day 0 仍須逐條重驗內容** —— 重指的是指標，不是事實。
**Slice**: standalone —— 本專案**第一次讓前端與後端在產品畫面上相遇**。
關閉 `AD-FrontendMissingIdRedirects-1`。
**Scope decisions**: (a) 讀取路徑 only (b) `risks` 單一模組 (c) 本機 drive-through
(d) dev seed 進版控且明確標示為示範資料

---

## 0. Background

### The gap（`AD-FrontendMissingIdRedirects-1` + 一個從未被檢驗的介面）

W19 交付 30 個畫面、全部餵 fixture。W05–W18 交付 34 張表與對應端點、全部 gate-only verified。
**兩邊各自完整，而它們從來沒有在任何一個產品畫面上碰過面。**

`apps/web` 對 API 的**唯一**呼叫是 W01 的骨架驗證頁（`app/page.tsx:45`，打 `/health`）。

### Why it matters（缺失的能力）

1. **兩端對同一個概念的理解不一致，今天零機制在看** —— 範疇過濾、「找不到」回什麼、
   錯誤碼、欄位命名。gate 抓零件、中性化抓「我想到要問的」、drive-through 抓「我沒想到要問的」，
   而**「兩層各自正確但對彼此的假設不同」是第四類**，前三者結構上都看不見
2. **`AD-FrontendMissingIdRedirects-1` 在接上 API 的那一刻從無害變成違規** ——
   今天詳情頁對不存在的 id 回 307 導回列表（fixture，無害）；接上真 API 之後，
   307 與 200 的差別就洩漏了「這個 id 存在但不屬於你」（約束 8 明訂查無資料一律 404）
3. **30 個畫面的可信度上限** —— 只要資料是 fixture，任何「畫面對不對」的討論都無法收斂

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（recon 於 `700ef62`）| Anchor |
|-------|--------------------------------------------|--------|
| 前端資料源 | 列表頁 import fixture 模組，**零 API 呼叫** | `apps/web/src/app/(app)/risks/page.tsx:56` |
| 前端唯一的 API 呼叫 | 只有骨架頁的 `/health` probe | `apps/web/src/app/page.tsx:45` |
| 後端詳情端點 | ⛔ **`risks` 只有 `@Get()` 列表，沒有 `@Get(':id')`** | `apps/api/src/modules/risk/risk.controller.ts:91` |
| 現成藍本 | `policy` **有** `@Get(':id')`，且註解已寫明「absent 與 out-of-scope 不可分辨」的理由 | `apps/api/src/modules/policy/policy.controller.ts:89-102` |
| 資料庫內容 | ⛔ **全 repo 零個 seed 檔**（`apps/api/prisma/**` glob 無命中）⇒ dev DB 是空的 | Glob 無命中 |
| 寫入路徑的前提 | `POST /risks` 要求 `threatId` / `vulnerabilityId` 為必填字串 | `apps/api/src/modules/risk/risk.controller.ts:99-104` |
| 而那兩個實體 | **沒有任何 controller** —— 全 `@Get(` 清單裡零命中 | `apps/api/src/modules/**` |
| 為何到不了雲端 | production 下模組建構時 throw | `policy.module.ts:35` · `dev-principal.ts:74-76` |

→ ⇒ 讀取路徑要補**一個端點**（有藍本）＋**一份 seed**（無藍本，但整合測試的 fixture 插入程序
是形狀參考：`apps/api/test/int-global-setup.js`）；**寫入路徑要先補兩個模組**，因此不在本片。

### The design（BE: 1 個端點 · DB: 1 份 seed · FE: 1 個 fetch 層 + 2 頁改資料源）

```
NEW   apps/api/src/modules/risk/risk.controller.ts   @Get(':id')  ← 抄 policy.controller.ts:89
NEW   apps/api/prisma/seed.ts                        dev-only，明確標示 DEMO，冪等
NEW   apps/web/src/lib/api/risks.ts                  fetch 層：list / byId，型別在一處
EDIT  apps/web/src/app/(app)/risks/page.tsx          資料源 fixture → API
EDIT  apps/web/src/app/(app)/risks/[id]/page.tsx     表頭資料源 fixture → API（Day-0 修訂：其餘四個 fixture 來源留著）
UNTOUCHED apps/web/src/data/risks.ts                 其餘 29 個畫面仍在用它
```

**為何不直接刪掉 fixture 模組**：它同時餵著儀表板與其他畫面。本片只換 `risks` 兩頁的資料源，
**fixture 檔本身一行不動** —— 那讓「這兩頁換了、其餘沒換」在 diff 上一眼可見。

### Ground truth（recon head-start —— 於 `700ef62` 讀過的 code）

- `risk.controller.ts:91-95` — `list()` 回 `{ data, ...DEV_PRINCIPAL_MARKER }`
- `policy.controller.ts:89-102` — `byId` 先 `list()` 再 `.find()`；**刻意不另寫 query**，
  因為範疇安全來自「scoped client 從來沒回傳那一列」
- `risk.controller.ts:130-147` — 422 帶 `key` 供表單標欄位；`ScopeRefusedError` 與
  `UnknownReferenceError` **兩種拒絕收斂成同一個 404**
- `dev-principal.ts:100,109` — `DEV_PRINCIPAL_ENTITIES` / `DEV_PRINCIPAL_ROLLUP`（W21 已補進 `.env.example`）
- `apps/api/test/int-global-setup.js:163-230` — 既有的 fixture 插入形狀（**測試資料，不是 seed**）

**Baselines（W21 closeout）**: api test **480** · web test **88** · lint clean · type clean ·
build clean · `run_all` **9/9**。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

<!-- Day 0 填入 D{N} 條目 -->

## 1. Phase Goal

**在本機讓一個人打開 `/risks`，看到的是資料庫裡的列，點進詳情看到的是同一列，
而輸入一個不存在的 id 得到 404。** 證明方式：Day 3 對真 UI + 真 API + 真 PostgreSQL
走完主路徑，並**逐控件確認**。⛔ **本片不產出 design note**（非 spike，複用既有 pattern）。

## 2. User Stories

- **US-1**（read path）: 作為區域 ISO，我希望 `/risks` 顯示的是資料庫裡的風險，以便我看到的數字是真的。
- **US-2**（read path）: 作為區域 ISO，我希望點進一筆風險能看到它的詳情，以便我不必回頭看試算表。
- **US-3**（seed）: 作為開發者，我希望本機有一份**明確標示為示範**的資料，以便切片有東西可顯示。
- **US-4**（約束 8）: 作為平台擁有者，我希望不存在的 id 回 **404 而不是導回列表**，以便回應不洩漏 id 是否存在。
- **US-5**（drive-through, **MANDATORY**）: 作為開發者，我希望有人真的開著瀏覽器走完這條路徑。
- **US-6**（closeout）: 作為維護者，我希望這一片的取捨被記錄下來。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW       apps/api/src/modules/risk/risk.controller.ts  → 加 @Get(':id')（同檔 EDIT）
NEW       apps/api/prisma/seed.ts                       → dev seed，冪等，DEMO 標示
NEW       apps/web/src/lib/api/risks.ts                 → fetch 層 + 型別
EDIT      apps/web/src/app/(app)/risks/page.tsx         → 資料源
EDIT      apps/web/src/app/(app)/risks/[id]/page.tsx    → 資料源 + 404
EDIT      apps/api/src/modules/risk/risk.controller.spec.ts  → byId 的單元測試
EDIT      apps/api/src/modules/risk/risk.int.spec.ts    → byId 的四個範疇測試
EDIT      package.json (apps/api)                       → `prisma:seed` script
UNTOUCHED apps/web/src/data/risks.ts                    → 其餘畫面仍消費它
UNTOUCHED apps/api/src/core-model/risk.repository.ts    → 不加新 query（見 3.1）
```

### 3.1 `GET /risks/:id`（US-2）— `risk.controller.ts`

**逐字複製 `policy.controller.ts:89-102` 的形狀**，包含它的註解理由：
先 `list()` 再 `.find()`，**不寫新的 repository query**。

⭐ **這不是偷懶，是範疇安全的來源** —— scoped client 從來沒回傳那一列，
所以「不存在」與「不在你的範疇內」在這裡**結構上不可分辨**。
另寫一條 `findUnique` 會需要先查到那一列才能判斷要不要拒絕，那就是約束 8 禁止的形狀。

⚠️ 代價寫出來：O(n)。今天 n 很小，**而這是一個會過期的判斷** —— 記入 §8。

### 3.2 Dev seed（US-3）— `apps/api/prisma/seed.ts`

- **冪等**：以固定 id `upsert`，重跑不產生第二份
- **明確標示**：每筆的 `title` / `description` 帶 `[DEMO]` 前綴，`ref_code` 用可辨識的序列
- ⛔ **guardrail 7 硬約束**：不得產生 checksum 有效的卡號或任何看起來像真人的個資。
  人名一律用 `Demo Owner N`，email 用 `demo-N@example.invalid`（保留網域，永遠不可解析）
- **範疇**：至少**兩個** `org_entity`，且**兩邊都要有風險** —— 否則範疇過濾在 drive-through 中
  「有生效」與「沒生效」看起來一模一樣（`AD-VacuousScopeTest-1` 的 UI 版）

### 3.3 前端 fetch 層（US-1, US-2）— `apps/web/src/lib/api/risks.ts`

- 型別**一處定義**，兩頁共用
- ⚠️ **不引入資料抓取函式庫** —— 一個 `fetch` 包裝就夠，第二個消費者出現時再談抽象（AP-5）
- 三個狀態都要有可見的 UI：loading / error / empty。
  ⛔ **error 不可以靜靜回退到 fixture** —— 那是 AP-6，且它會讓後端掛掉時畫面看起來正常

### 3.4 404 而不是 307（US-4）— `risks/[id]/page.tsx`

> ⛔ **Day-0 修訂 2026-08-18 —— 本節的前提已被證偽。原文保留在下方不刪，因為
> 「原本相信什麼」與「現實是什麼」的差距本身是這個 phase 最有價值的產出。**
>
> **原文**：「今天不存在的 id 回 307 導回列表。改為 `notFound()`。」
>
> **實際**：`apps/web` **沒有 middleware**。W21 Day 3 量到的 307 來自
> `apps/web/src/app/(app)/layout.tsx:50` 的 `if (!persona) redirect('/login')` ——
> 那是**未登入**閘門，對 `(app)` 底下每一條路由一律觸發，**與 id 存不存在無關**。
> `/nonexistent-page` 之所以正確回 404，是因為它在 `(app)` group 之外。
> 已登入 + 不存在的 id 的真實行為是 `[id]/page.tsx:218-228` 一張**行內 not-found 卡**
> （200，i18n key `riskDetail.notFound.*` 中英皆備，W19 交付）。
>
> **改成什麼**（使用者 2026-08-18 裁決）：約束 8 要求的是**不可分辨**，那是 UI 層的性質，
> 與 HTTP status 無關。保留 W19 那張卡，改為驗證「不存在的 id」與「跨實體的 id」
> 渲染**完全相同**的畫面。真 404 status（`not-found.tsx` boundary）另記 backlog，
> 不在本片 —— 兩頁都是 `'use client'`，那不是原本以為的一行替換。

⭐ 這條**必須與 3.1 同片**：接上真 API 而不改它，等於**親手做出**約束 8 禁止的洩漏。

### 3.5 明確不做的事

- ❌ **`/risks/new` 的寫入路徑** —— 見 §9，前提是兩個不存在的模組
- ❌ **其餘 28 個畫面** —— 本片只換 `risks` 兩頁
- ❌ **部署** —— `apps/api` 在 production 起不來（M4 解封）
- ❌ **認證** —— 沿用 W19 的 demo persona cookie；真認證是 M4
- ❌ **不碰 `risk.repository.ts`** —— 不加 query（3.1 的理由）

### 3.6 ✅ 兩個決策點 —— 已於 2026-08-18 拍板

| # | 決策 | 定案 | 依據 |
|---|------|------|------|
| **D1** | **demo persona 如何變成 API 的範疇** | ✅ **(a) 伺服器端 env 決定** —— persona 只影響 UI，API 的範疇來自 `DEV_PRINCIPAL_ENTITIES` | 使用者 2026-08-18。(b)「前端把 entity 傳給 API」**直接違反約束 8 鐵律 3**（實體身分只能來自憑證／session）。⚠️ **代價必須在 UI 上標示**：切換 persona **不會**改變 API 回傳 —— 不標示就是 W19 那 25 個死控件的形狀（控件在、看起來有效果、實際沒有）⇒ checklist 2.2 有一個具名的 `[ ]` |
| **D2** | **seed 進不進版控** | ✅ **(a) 進版控** | 與 W21 `provision.sh` 同一個理由：一串貼在聊天記錄裡的指令回答不了「這個環境是怎麼來的」。⚠️ 代價已知：seed 檔從此是 guardrail 7 的掃描面 ⇒ checklist 1.2 有一個具名的 `[ ]` |

### 3.7 Validation（US-1..US-6）

Gates: lint clean · api test ≥ 480 + 新增 · web test ≥ 88 + 新增 · type clean · build clean ·
`run_all` 9/9。
加上 §3.4 的 **drive-through（MANDATORY）**：真 Next.js dev server + 真 NestJS + 真 PostgreSQL。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/src/modules/risk/risk.controller.ts` | EDIT — 加 `@Get(':id')` |
| 2 | `apps/api/src/modules/risk/risk.controller.spec.ts` | EDIT — byId 單元測試 |
| 3 | `apps/api/src/modules/risk/risk.int.spec.ts` | EDIT — byId 的四個範疇測試 |
| 4 | `apps/api/prisma/seed.ts` | NEW — 冪等 dev seed |
| 5 | `apps/api/package.json` | EDIT — `prisma:seed` script |
| 6 | `apps/web/src/lib/api/risks.ts` | NEW — fetch 層 + 型別 |
| 7 | `apps/web/src/app/(app)/risks/page.tsx` | EDIT — 資料源 |
| 8 | `apps/web/src/app/(app)/risks/[id]/page.tsx` | EDIT — **只換 risk 表頭的資料源**（Day-0 修訂，見 §3.4 / R7）|
| 10 | `apps/web/src/components/DemoBadge.tsx` | EDIT — 加「部分真實」變體（Day-0 新增，見 R7）|
| 9 | `docs/03-implementation/changes/CH-042-*.md` | NEW — 變更記錄 |
| — | `apps/web/src/data/risks.ts` | **UNTOUCHED** — 其餘 5 個畫面仍消費它（Day-0 實測：6 個畫面 import 它）|
| — | `apps/web/src/data/extended/riskDetail.ts` · `controls.ts` · `issues.ts` | **UNTOUCHED** — 詳情頁的另外四個 fixture 來源，本片不碰（Day-0 D-detail-hybrid）|
| — | `apps/api/src/core-model/risk.repository.ts` | **UNTOUCHED** — 不加 query（§3.1）|
| — | `apps/api/prisma/schema.prisma` | **UNTOUCHED** — 零 schema 變更 |
| — | `infra/`、`.github/workflows/` | **UNTOUCHED** — 本片不碰部署 |

## 5. Acceptance Criteria

1. **AC-1** `GET /risks/:id` 對範疇內的 id 回 200 + 該列；對**不存在**與**跨實體**的 id
   **都回 404**，且兩者的回應體不可分辨
2. **AC-2** `npm run prisma:seed` 第二次執行不產生第二份資料（冪等，實跑兩次比對列數）
3. **AC-3** seed 產生的資料**跨至少兩個 org_entity**，且每個 entity 都有風險
4. **AC-4** `/risks` 顯示的列數與 `GET /risks` 回傳的列數相同（**不是** fixture 的列數）
5. **AC-5** 後端關掉時 `/risks` 顯示**明確的錯誤狀態**，**不回退到 fixture**
6. **AC-6**（**Day-0 改寫**，原文見 §3.4 引述）`/risks/<不存在的 id>` 與
   `/risks/<存在但跨實體的 id>` 渲染**完全相同**的畫面 —— 逐像素同一張 not-found 卡，
   同一段文案，不因後者實際存在而有任何差異。⛔ **兩者都要實測**，只測前者證明不了不可分辨
7. **AC-7 Drive-through PASS（MANDATORY，真 UI + 真後端 + 真 PostgreSQL）** ——
   逐控件走查列表與詳情；截圖 + observed-vs-intended 記入 progress.md。（**不是** gate-only。）
8. **AC-8** `AD-FrontendMissingIdRedirects-1` 的 **BACKLOG 敘述已更正**（⚠️ **不是 CLOSED** ——
   它描述的缺陷不存在，其「實測 307」是誤讀了未登入閘門，見 §3.4）；calibration 已記錄；
   導航檔 + BACKLOG 已更新

## 6. Deliverables

- [ ] US-1 —— `/risks` 列表資料來自 API
- [ ] US-2 —— `/risks/:id` 詳情資料來自 API（含新端點）
- [ ] US-3 —— 冪等的 dev seed，跨兩個 entity
- [ ] US-4 —— 不存在的 id 回 404
- [ ] US-5 —— drive-through PASS + 截圖
- [ ] US-6 —— `CH-042` + retrospective + calibration

## 7. Workload Calibration

- Scope class **`greenfield-feature` 0.55**（`CALIBRATION-MATRIX.md` 的起手值）。
  ⭐ **本片是這個 class 的第 1 個真資料點** —— 該列現為 `n/a (0 pt)`，因為 W20 在 Day 1 中止、
  部分工時 ÷ 完整承諾不可比。⛔ **刻意不用 `pattern-reuse-feature` 0.50**：後端那一半確實是複製
  （`policy.controller.ts:89` 逐字），**而前端那一半沒有藍本** —— 本 repo 從來沒有一個產品畫面
  呼叫過 API，seed 也是第一份。變異來源在後者。
- **Agent-delegated: `no`**（< 20%）—— 本片的價值**就是**注意到兩層對彼此的假設不一致，
  而那正是不該委派的判讀。（W21 實測：agent 擴大掃描射程有效，代判讀會出錯。）
- Bottom-up est ~12 hr（Day-0 0.5 · 端點+測試 1.5 · seed 2 · fetch 層與兩頁 3 ·
  404 與測試 1 · drive-through 2 · closeout 2）→ **calibrated commit ~6.6 hr (mult 0.55)**。
  Day-4 retro Q2 驗證。
- ⚠️ **Day-0 修訂 → bottom-up ~12.5 hr → committed ~6.9 hr**。淨 +0.5：
  `notFound()` 那一項從「一行替換」變成「驗證兩種情況不可分辨」（工作量相近，性質不同，**-0**），
  新增 DemoBadge「部分真實」變體 + 詳情頁混血誠實性走查（**+0.5**）。
  ⛔ **Day-0 實際耗時記在 progress.md，不在這裡** —— 這一格是承諾，不是實績。
- ⚠️ **逐任務時間記到 progress.md，每個 Day 收尾當下記** ——
  `AD-CalibrationNoTimeRecord-1` 已第 3 次，且已升級為機械強制的候選。
  ⛔ **在 plan 裡寫提醒這條路已被實測否證兩次**，所以本片改為在 **checklist 每個 Day 收尾
  各放一個具名的 `[ ]`**，而不是只寫在這裡。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **R1 — `byId` 走 `list()` 是 O(n)，會過期** | 今天 n 小且範疇安全來自它。**寫進 CH-042 並開一條 AD**，解封條件是「單一 entity 的風險數超過一個畫面能顯示的量」——⛔ 不是「以後記得優化」 |
| **R2 — demo persona 與 API 範疇的落差（D1）** | 若採 (a)，切換 persona **不會**改變 API 回傳。**必須在 UI 上標示**，否則就是 W19 那 25 個死控件的形狀：控件在、看起來有效果、實際沒有 |
| **R3 — seed 是 guardrail 7 的新掃描面** | 人名 / email / 金額全部用不可解析的示範值；**Day 2 gate 必須包含 gitleaks 與 semgrep 對新檔的結果** |
| **R4 — Risk Class C（陳舊程序）** | 本片同時動 API 與 web，且 seed 只在啟動時載入。Day 3 drive-through 前**乾淨重啟兩個服務**並擷取 startup log；用 `/preflight` + `/restart` |
| **R5 — 空資料庫讓 drive-through 變成空畫面** | seed 是 US-3 且排在 fetch 層之前。⛔ **順序不可調換** —— 先接前端會得到一個「成功顯示 0 筆」的假通過 |
| **R6 — `AD-LocalPasswordFallback-1`（🔴 P0）未裁決** | 本片不碰登入路徑，沿用 demo persona ⇒ **不阻塞**。但若裁決結果是要本地密碼，M4 的登入頁會重做 —— 與本片無關，記在此以免被誤認為前置 |
| **R7 — 詳情頁是混血畫面（Day-0 `D-detail-hybrid`）** | 該頁吃**五個** fixture 來源：`risks`(8 處) · `controls`(10) · `issues`(8) · `entityPosture`(2) · `@/data/extended/riskDetail` 的 **13 個具名匯出**（稽核軌跡／簽核／階段／決策／複審日／工作底稿）。只換 `risks` ⇒ 表頭真、其餘假。⛔ **而 `DemoBadge` 會反過來說謊** —— 它的 docstring 明寫存在理由是「sample data presented as real」，接上後它宣稱整頁是樣本而表頭是真的，**是同一條誠實規則的反向違反**。緩解：DemoBadge 加「部分真實」變體，在該頁指名**哪些區塊**仍是樣本（使用者 2026-08-18 裁決 (a)）|
| **R8 — `AD-FrontendMissingIdRedirects-1` 的證據是誤讀（Day-0 `D-307`）** | BACKLOG:251 的「實測 `/risks/RSK-0000` 回 307 導回列表」錯了兩處：不是導回列表（是 `/login`），也不是因為 id 不存在（是未登入）。⇒ AC-6 改寫、AC-8 從 CLOSE 改為**更正敘述**。⚠️ **這條的教訓比修正本身重要**：一個從**外部黑箱探測**得到的 status code，被寫成了對**內部行為**的斷言，中間隔著一個沒被檢查的前提（探測者已登入）|
| **R9 — `isms_dev` 落後一個 migration（Day-0 `D-migration-lag`）** | `20260817033944_event_and_posture_snapshot` 未套用。`AD-DevDbChecksumDrift-1` **第 6 次** —— 依 `.claude/rules/README.md` 的強度階梯，第 6 次已遠超「改結構性解法」的門檻（≥3）。Day 1 開工前先 `prisma migrate deploy`（**不是 `migrate dev`**，見 R10）；**結構性解法另記 backlog，不在本片** |
| **R10 — checklist Prong 3 的 Verify 指令會改狀態（Day-0 `D-verify-cmd`）** | `npm run prisma:migrate` = `prisma migrate dev`，它**套用**遷移且偵測 drift 時會要求 reset dev DB；而該項 DoD 只要 status。⇒ Day 0 實際改跑唯讀的 `npx prisma migrate status`，checklist 已同步更正。**一個 Verify 指令比它要驗的東西危險，是 checklist 自己的缺陷** |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **`/risks/new` 寫入路徑** → ⛔ **不是取捨，是前提不存在**：`POST /risks` 要求
  `threatId` 與 `vulnerabilityId`（`risk.controller.ts:99`），而 `Threat` / `Vulnerability`
  **今天沒有任何 controller**（全 `@Get(` 清單零命中）。做表單 = 先建兩個模組 → 另開一片
- **其餘 28 個畫面接 API** → 本片證明形狀，之後逐片複製
- **部署這一片** → 前提是 M4（`policy.module.ts:35`）
- **真認證** → M4，等 RIT 建三個 App Registration
- **`AD-NoCspHeader-1`** → 需要一片專門處理（Next.js inline script 需要 nonce）
- **ADR 層的 8 條漂移**（審計 #7）→ 建議夾帶 `AD-27` / `AD-30` 於本片第一個 commit，
  其餘另開；**根因是「closeout 檢查表沒有 ADR 那一格」**，那才是要修的東西
