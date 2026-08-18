# Phase W22 — Checklist (wire the risks screens to the real API)

[Plan](./plan.md)

> ⛔ **本片的順序有一處不可調換**：seed（Day 1）必須在 fetch 層（Day 2）之前。
> 先接前端會得到一個「成功顯示 0 筆」的假通過（plan §8 R5）。

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `<PR #84 merge 後的 sha>`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`
> ⛔ **本片的 recon 做在 PR #84 merge 之前的分支上，SHA 已被 rebase 改寫**
> （`f3511c8` → **`700ef62`**，author date `2026-08-18T14:47:10+08:00` 逐秒不變）——
> 錨點已重指，但**內容仍須全部重驗**：重指的是指標，不是事實。

- [ ] **Prong 1 — path verify**：`apps/web/src/lib/api/` 不存在 · `apps/api/prisma/seed.ts` 不存在 ·
      八個 EDIT 目標全部存在 · **`CH-042` 未被佔用**
  - Verify: `Glob apps/api/prisma/**` + 列 `docs/03-implementation/changes/` 取最大號
- [ ] **Prong 2 — content verify**（drift → progress.md）:
  - [ ] **D-no-byid** — `risk.controller.ts` 確認**只有** `@Get()`，無 `@Get(':id')`
  - [ ] **D-policy-shape** — `policy.controller.ts:89-102` 的 `byId` 仍是 list-then-find
  - [ ] **D-fixture-import** — `risks/page.tsx` 仍 import `@/data/risks`；**並確認詳情頁的 import**
  - [ ] **D-no-seed** — 全 repo 仍零個 seed 檔
  - [ ] **D-threat-vuln-endpoints** — `Threat` / `Vulnerability` 仍**零 controller**（§9 的前提）
  - [ ] **D-307** — 詳情頁對不存在的 id 仍是 307 而非 404
- [ ] **Prong 2.5 — child component tree** —— ⭐ **本片必做**：
      `risks/page.tsx` 與 `[id]/page.tsx` **的子元件**是否也直接 import fixture？
      （entry 元件改對了不代表子元件跟著改 —— W20 的教訓）
  - Verify: 從兩頁的 import 逐層往下 grep `@/data/`
- [ ] **Prong 3 — schema verify**：**N/A** —— 本片零 schema 變更。
      ⚠️ **但要確認 `isms_dev` 的 migration head 是最新的**（`AD-DevDbChecksumDrift-1` 已 5 次）
  - Verify: `npm run prisma:migrate -w apps/api` 的 status 輸出
- [ ] **D-baselines** — api test 480 · web test 88 · lint clean · type clean · build clean · `run_all` 9/9
- [ ] **Catalog drift** — progress.md Day-0 表格
- [ ] **Go/no-go** — ≤20% 繼續 / 20-50% 修訂 §5 §7 並回報 / >50% 中止重寫
- [ ] **D1 / D2 拍板已取得**（plan §3.6）—— ⛔ D1 未定不可寫 fetch 層
- [ ] **⏱ 寫入本日耗時到 progress.md**

### 0.2 Branch

- [ ] `git checkout -b feature/W22-risks-slice`（從 merge 後的 `main`）

---

## Day 1 — 端點與 seed (US-2, US-3)

### 1.1 `GET /risks/:id`

- [ ] **`@Get(':id')` —— 逐字複製 `policy.controller.ts:89-102` 的形狀（含註解理由）**
  - DoD: 範疇內 200；**不存在**與**跨實體**都回 404 且回應體不可分辨
  - Verify: `npm run test -w apps/api`
- [ ] **四個範疇測試**（`risk.int.spec.ts`）
  - DoD: 跨實體讀拒絕 / 不存在拒絕 / **兩者回應相同** / RLS 層獨立成立
  - ⛔ **必做中性化**：拿掉範疇過濾，斷言**哪幾條轉紅**；預測寫在執行之前
  - Verify: `npm run test:int -w apps/api`

### 1.2 Dev seed

- [ ] **`apps/api/prisma/seed.ts`（冪等，固定 id `upsert`）**
  - DoD: 連跑兩次，列數不變
  - Verify: `npm run prisma:seed -w apps/api` ×2 → `SELECT count(*)` 比對
- [ ] ⭐ **跨兩個 `org_entity`，且兩邊都有風險**
  - DoD: ⛔ 否則範疇過濾「有生效」與「沒生效」在 drive-through 中看起來一模一樣
  - Verify: 逐 entity 計數，兩者皆 > 0
- [ ] **guardrail 7 檢查**：無 checksum 有效卡號、無真實個資、email 用 `.invalid`
  - Verify: 人工讀一遍 + `python scripts/lint/run_all.py`

### 1.x partial gate

- [ ] `lint` · `type-check` · `test -w apps/api`
- [ ] **⏱ 寫入本日耗時到 progress.md**

---

## Day 2 — 前端接上去 (US-1, US-4)

### 2.1 fetch 層

- [ ] **`apps/web/src/lib/api/risks.ts` —— `list` / `byId` + 型別一處定義**
  - DoD: 無新增相依（不引資料抓取函式庫 —— AP-5）
  - Verify: `npm run type-check -w apps/web`

### 2.2 兩頁換資料源

- [ ] **`risks/page.tsx` 資料源 fixture → API**
  - DoD: loading / error / empty **三個狀態都有可見 UI**
  - ⛔ **error 不可回退到 fixture**（AP-6：後端掛掉時畫面看起來正常）
  - Verify: `npm run test -w apps/web` + 手動停掉 API 觀察
- [ ] **`risks/[id]/page.tsx` 資料源 + `notFound()`**
  - DoD: 不存在的 id 得到 **404 頁面**，不是 307
  - Verify: 新增 web 測試斷言 404 路徑
- [ ] ⭐ **D1 的落差在 UI 上被標示**（若採選項 a）
  - DoD: 切換 persona **不改變** API 回傳這件事，畫面上說得出來
  - ⛔ 不標示就是 W19 那 25 個死控件的形狀

### 2.x Full gate

- [ ] `format:check` · `lint` · `type-check` · `test`（api + web）· `build` · `run_all` 9/9
- [ ] **⏱ 寫入本日耗時到 progress.md**

---

## Day 3 — Drive-through (US-5) — 真 UI + 真後端 + 真 PostgreSQL

### 3.1 Clean restart

- [ ] **殺掉陳舊的 dev server 與孤兒 worker；確認新程序是 3200 / 3210 的唯一擁有者**
  - DoD: 擷取**兩個服務的 startup log**（seed 只在啟動時載入 —— Risk Class C）
  - Verify: `/preflight` → `/restart`
- [ ] **確認瀏覽器用 `localhost` 不是 `127.0.0.1`**（W20：dev origin 檢查會回 403）

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [ ] **`/risks` 列表顯示的列數 == `GET /risks` 回傳的列數**（**不是** fixture 的列數）
- [ ] **點一筆進詳情，看到的是同一列**
- [ ] **`/risks/<不存在的 id>` → 404 頁面**
- [ ] **停掉 API → 列表顯示明確錯誤，不回退 fixture**
- [ ] **逐控件走查**：可點 / 有效果 / 標籤真實 / 結果真的渲染
- [ ] ⭐ **切換 persona，記錄實際發生什麼** —— 與 D1 的預期比對
- [ ] 截圖 + **observed-vs-intended 對照** → progress.md Day 3
- [ ] **⏱ 寫入本日耗時到 progress.md**

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-042-<slug>.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含 drive-through PASS）
- [ ] **開一條 AD 記錄 `byId` 的 O(n)**，解封條件寫成**可觀察的**（單一 entity 的風險數超過
      一個畫面能顯示的量），⛔ 不是「以後記得優化」

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`greenfield-feature` 0.55，**第 1 個真資料點**）
- [ ] `calibration-matrix.md` 那一行（**≤ 1 行 ~250 字元**，敘述 → `calibration-log.md`）
- [ ] Final gate sweep: `format:check` · `lint` · `type-check` · `test` · `build` · `run_all` 9/9
      + **gate 射程聲明**（哪些只在 CI 成立）
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（CLOSE `AD-FrontendMissingIdRedirects-1`）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] ⭐ **夾帶審計 #7 的 `AD-27` 與 `AD-30`**（ADR-0011 那行 · ADR-0007 的 Azure China 指令）
      —— 使用者核可才做；⛔ **根因是「closeout 檢查表沒有 ADR 那一格」**，那才是要修的東西
- [ ] **⏱ 寫入本日耗時到 progress.md**
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
