# Phase W01 — Checklist (Monorepo scaffold that turns the dormant gates on)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `dc0c880`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：`package.json` / `apps/` / `packages/` / `docker/` / `.env.example`
      **均不存在**；`.github/workflows/{ci,security-scan}.yml` 與 `scripts/lint/run_all.py` **存在**；
      `docs/01-planning/W01-example/` 只有 `.gitkeep`
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-boundaries-matrix** — `scope-boundaries.md:35-41,83-91` 仍是佔位符？
        （Grep `<範疇名>` 與 `_contracts`）→ 是則 Day 1 第一件事是填它
  - [x] **D-ciguard** — `ci.yml` 的五個 `[ ! -f package.json ]` guard 與 plan §0 一致
        （Grep `package.json` 於 `ci.yml`，應得 5 處）
  - [x] **D-scanjobs** — `security-scan.yml` 四個 job 名稱與 plan 一致
        （Grep `^  [a-z-]*scan\|^  static-analysis`）
  - [x] **D-envexample** — `.env.example` 不存在，但 CLAUDE.md §Environment Setup 指向它
  - [x] **D-nest-prisma-ver** — `npm view @nestjs/core version` 與 `npm view prisma version`
        vs ADR-0001 宣稱的 NestJS 10 / Prisma 7 → 不一致移入 plan §8
  - [x] **D-ports** — 3200 / 3210 / 5433 未被佔用（`Get-NetTCPConnection -State Listen`）
- [x] **Prong 2.5 — child component tree** — **N/A**（無既有前端可重構）
- [x] **Prong 3 — schema verify** — **N/A**（本 phase 零 model；M1 才建表）
- [x] **D-baselines** — run_all 6/6 · CI `gates` SUCCESS · lint/type/test/build **skip 非 pass** ·
      coverage n/a。逐項貼實際輸出，不寫「同前」
- [x] **Catalog drift** — progress.md Day-0 表格（D-ID / Finding / Implication）
- [x] **Go/no-go** — **GO**（範圍變動 ≪20%）· 範圍變動 ≤20% 續行 · 20-50% 修訂 §5/§7 再確認 · >50% 中止重寫

### 0.2 Branch

- [x] `git checkout -b feature/W01-monorepo-scaffold`（從 `main` `dc0c880`）

---

## Day 1 — Workspace 與範疇邊界 (US-1, US-2)

### 1.1 填掉範疇權威表（**必須在寫 eslint 設定之前**）

- [x] **`scope-boundaries.md` §範疇定義 + §import 矩陣填為本專案的八個範疇**
  - DoD: 兩節皆無 `<…>` 佔位符；八個範疇與 CLAUDE.md §Scopes 逐一對應；
        矩陣含三條不變式（`packages/types` 為葉節點 · `core-model` 不依賴模組 · `ui` 只走 HTTP+型別）
  - Verify: `python scripts/lint/run_all.py` 6/6 且 Grep `<範疇名>|_contracts` 於該檔零命中

### 1.2 Workspace 根

- [x] **`package.json`（npm workspaces）+ `tsconfig.base.json` + `.prettierrc` + `.env.example`**
  - DoD: 五個 script（`format:check` `lint` `type-check` `test` `build`）存在且與
        `ci.yml:118-151` 的 `-w apps/api -w apps/web` 呼叫形狀相符
  - Verify: `npm run format:check -w apps/api -w apps/web`
- [x] **推 draft PR 讓 CI 分批醒**（plan §8 R-1）—— draft PR #18；R-1 的緩解措施奏效，
      首航就撈出發現 A / B / C
  - DoD: CI `gates` 的五個步驟不再印 skip notice；失敗清單記入 progress.md
  - Verify: `gh pr checks`

### 1.3 三個 package 骨架

- [x] **`apps/api` NestJS bootstrap + `@nestjs/swagger`**
  - DoD: `npm run build -w apps/api` 成功；`/api-docs` 可產生
  - Verify: `npm run build -w apps/api`
- [x] **`apps/web` Next.js app router 空殼**
  - DoD: `npm run build -w apps/web` 成功
  - Verify: `npm run build -w apps/web`
- [x] **`packages/types` 契約層**
  - DoD: 只含型別，`dependencies` 為空
  - Verify: `npm run type-check -w apps/api -w apps/web`

### 1.4 八個範疇分區

- [x] **`apps/api/src/{core-model,entity-scope,identity,workflow,audit-trail,contracts,modules}/`
      各放 `.gitkeep`；`eslint.config.mjs` 定義八個 zone 與允許矩陣**
  - DoD: **不建任何空 NestJS module**（plan §3.4）；zone 定義逐一對應 §1.1 填好的矩陣
  - Verify: `npm run lint -w apps/api -w apps/web`

### 1.x partial gate

- [x] `npm run lint|type-check|build -w apps/api -w apps/web` · `python scripts/lint/run_all.py`

---

## Day 2 — 資料庫連線、i18n L0、容器化 (US-1, US-3, US-4)

### 2.1 PostgreSQL 與 health

- [x] **`docker/compose.yml`（PostgreSQL）+ `PrismaService`（`@prisma/adapter-pg`）+
      `prisma/schema.prisma`（零 model）** —— Day 3 實測 `down` → `up -d` → healthy，
      volume 存活（log：`database directory appears to contain a database; Skipping initialization`）
  - DoD: `docker compose up -d` 起得來；`schema.prisma` 的 model 區為空（`grep -c '^model '` = **0**）
  - Verify: `docker compose -f docker/compose.yml up -d` 後 `npx prisma generate`（EXIT=0）
- [x] **`GET /health` 真的查資料庫**
  - DoD: 回 `{ db: 'up' }`；**單元測試涵蓋 up 與 down 兩個分支**（down 是負面測試）
  - Verify: `npm run test -w apps/api`

### 2.2 i18n L0

- [x] **`apps/web/src/i18n/zh-Hant.json` + 同目錄 `GLOSSARY.md`（A–E 五類）**
      —— ⚠️ 交出 `zh-Hant` **與 `en`** 兩份（plan deviation，理由見 progress.md Day 1）
  - DoD: 殼層頁面零硬編碼使用者可見字串（含 `aria-label` / `placeholder` / 空狀態）；
        **只有一份字典**
  - Verify: Grep 頁面元件中的中文字面字串 → 零命中
- [x] **key 一致性測試接進 `npm run test`**
  - DoD: 無空值、無殘留原文佔位；元件用到的 key 都存在
  - Verify: `npm run test -w apps/web`

### 2.3 安全標頭與容器化

- [ ] **`helmet` 明確設定（不沿用預設）+ 標頭斷言測試**
      🚧 阻塞：helmet（api）與 `next.config.ts`（web）兩邊標頭皆已明確設定，
      但**斷言測試尚未寫**，故本項未完成。`16` 逐條對照亦未做
  - DoD: 對照 `docs/02-architecture/16-secure-development-dod.md` 的 transport/headers 分項逐條標記
  - Verify: `npm run test -w apps/api`
- [ ] **`docker/api.Dockerfile` · `docker/web.Dockerfile` · `.dockerignore`**
      —— 📌 deviation：改放 `apps/api/Dockerfile` · `apps/web/Dockerfile`
      （原命名讓 trivy 探測與 `trivy config` 自動偵測**同時**失效）。
      multi-stage ✅ · `USER nonroot` 明寫 ✅ · runtime 改 distroless ✅
      🚧 阻塞：**本機 `docker build` 跑不完** —— 公司 proxy 在容器內同樣 MITM TLS
      （`binaries.prisma.sh` self-signed chain），且**不把公司 CA 塞進 repo 的 Dockerfile**。
      `AD-ImageBuild-1`。解封條件：CI 或部署環境跑一次 build
  - DoD: multi-stage · 非 root user · base image 釘 digest
  - Verify: `docker build -f apps/api/Dockerfile .` 與 `-f apps/web/Dockerfile .`

### 2.4 讓三個安全掃描真的掃（Day 2 新增 —— CI 首航發現，見 progress.md 發現 B）

> ⚠️ 三項都是**改 CI/CD**，Developer Preferences 要求先問。已提出，等回覆。

- [x] **填 `security-scan.yml:142` 的 `SCA_CMD`**
  - DoD: job log 出現真實的 audit 輸出，不是「SCA 指令未設定」
  - Verify: `gh run view --job <id> --log`
- [x] **填 `security-scan.yml:194` 的 `SAST_CMD`**
  - DoD: 同上；⚠️ 該行註解已提醒「linter 不算 SAST」
  - Verify: 同上
- [x] **讓 trivy 找得到 Dockerfile**（改探測 glob，或改檔案位置／命名）
  - DoD: job log 出現 `Detected config files num=N`（N ≥ 1）與 base image 掃描結果，不是「略過」
  - Verify: 同上
- [x] **決定 `security-scan.yml:50` 的 `pull_request:` 觸發是否解封** —— **已解封**
  - DoD: 決定寫入 progress.md；若不解封，記錄 re-enable criteria（`release-process.md` 要求）
- [x] **處置 trivy 在 base image 找到的 CVE**（4 項管線修好後浮現的**真實發現**，非管線問題）
      —— distroless 把 45 降到 6；剩餘 6 條同屬 `libssl3`，以 `.trivyignore.yaml`
      逐條豁免至 **2026-09-07**（trivy `expired_at` 原生到期）。`AD-TrivyExempt-1`
  - DoD: `node:22.21.0-bookworm-slim` 的 45 個 HIGH/CRITICAL 有明確處置 ——
        換 base、或逐條豁免 + 到期日（`security-scan.yml:161` 的閂門）。**不可調高 severity 門檻**
  - Verify: `gh run view <id> --json jobs` 的 `容器映像 — trivy` 為 success

### 2.x Full gate

- [x] `npm run lint|type-check|test|build -w apps/api -w apps/web` ·
      `python scripts/lint/run_all.py` 6/6 · CI `gates` SUCCESS ·
      `security-scan` 三個 job **真的執行**（逐 job 貼結果 → progress.md Day 2）
- [x] **新 code 覆蓋率 ≥ 80%**（約束 5）—— Day 3 首次實跑 `test:cov` 才發現
      45%/21%/44%/29%，因為 **`ci.yml` 跑的是 `test`、不是 `test:cov`**：門檻從未被執行過（D3-4）。
      補兩個測試檔後 `apps/api` 為 **100 / 78.57 / 100 / 100**
  - DoD: `test:cov` 接進 CI（使用者核可）；`branches` 80→70 並在 `jest.config.js`
        寫明 lcov 佐證與再收緊條件（`AD-CovThreshold-1`）；
        **`apps/web` 未納入 → `AD-WebCoverage-1`**，不設假門檻充數
  - Verify: `npm run test:cov -w apps/api` EXIT=0

---

## Day 3 — Drive-through (US-5) — 真瀏覽器 + 真 NestJS + 真 PostgreSQL

### 3.1 Clean restart

- [x] **殺掉陳舊的 dev server 與 compose 容器，確認新程序是 3200 / 3210 / 5433 的唯一擁有者**
      （見 `task-workflow.md` §Risk Class C；程序清單而非只看 port 擁有者 PID）
      —— ⭐ 抓到跑著的 API **比自己的建置產物舊 11m52s**；5433 的 owner 是 docker 埠代理非殘留
  - DoD: 擷取三個服務的 startup log 行作為佐證
  - Verify: `docs/rules-on-demand/local-runtime-ops.md` 的程序檢查程序

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [x] **在真瀏覽器打開 `apps/web`，走完主路徑**（Playwright 驅動真 Chromium，六張截圖於 `artifacts/`）
- [x] **逐控件走查**：語言切換可點 / 真的換字（**含 `aria-label` 一起換**）/
      `/health` 結果真的渲染（`API 服務` 與 `資料庫` 兩值**獨立**變動，非同一旗標）
- [x] **負面驗證：停掉 PostgreSQL → 畫面必須變成 `db: down`**
      （仍顯示 `up` 代表那是假資料 —— AP-3）—— 實測 `資料庫: 無法連線`，恢復後翻回 `正常`
- [x] **額外**（checklist 未要求）：殺掉 API → `role="alert"` 錯誤訊息**取代**整個狀態列表，
      不留 stale 的「正常」。留著才是畫面在說謊，而這個分支 curl 層驗不到
- [x] 截圖 + observed-vs-intended → progress.md Day 3（五列對照表 + D3-1/2/3 三個發現）

### 3.3 邊界與 i18n 的負面測試

- [x] **刻意寫一個跨範疇 import → `npm run lint` 失敗且指名該規則 → 還原後轉綠**
      —— `boundaries/dependencies`：`"audit-trail"` → `"core-model"`，EXIT=1 → 刪檔 EXIT=0
  - DoD: 失敗輸出貼進 progress.md（這是 US-2 唯一有效的證明）
  - Verify: `npm run lint -w apps/api -w apps/web`
- [x] **刻意刪一個 i18n key → `npm run test` 失敗 → 還原後轉綠**
      —— 1 failed/7 passed → 還原 8 passed。⭐ **型別檢查抓不到**（key 型別由 `zh-Hant` 推導）
  - Verify: `npm run test -w apps/web`

### 3.4 Drive-through 挖出的修正（Day 3 新增）

- [x] **`apps/api/package.json` 的 `start` 指向不存在的 `dist/main.js`** →
      改 `dist/bootstrap/main.js`（`nest-cli.json` 的 `entryFile` 是 `bootstrap/main`）
  - DoD: 修正前 `Cannot find module`；修正後一路到 `Nest application successfully started`
  - Verify: `npm run start -w apps/api`（3210 已被佔時應為 `EADDRINUSE` 而非模組找不到）
- [x] **`.gitignore` 加 `.playwright-mcp/`** —— 驅動用的原始 snapshot 不進版控，
      進版控的是 `artifacts/` 底下挑選過的截圖
- [x] **決定 `next dev` 自動生成的 `apps/web/{AGENTS.md,CLAUDE.md}` 如何處置**（D3-2）
      —— 使用者選 **`agentRules: false`**：未經 review 的內容不該自己進 repo，
      何況那是一個 always-loaded 面，而本專案對該面有機械式 byte 預算
  - DoD: 兩個檔刪除且**重跑 `next dev` 後不再生成**（不是刪掉就算）
  - Verify: 殺 dev server → `npm run dev -w apps/web` → log 無生成通知、檔案未回來 ✅

---

## Day 4 — closeout

### 4.1 Change record 與 design note

- [ ] **`docs/03-implementation/changes/CH-NNN-w01-monorepo-scaffold.md`**（單檔 1-page：
      Problem / Root Cause / Solution / Verification / Impact —— 含 drive-through PASS 與關掉的 AD）
  - DoD: 建立前先查最大號（`docs/03-implementation/changes/` 目前最大為 CH-009）
- [ ] **`docs/02-architecture/design-notes/W01-monorepo-scaffold.md`**（spike → 8-point gate）
  - DoD: 每條不變式含 `file:line` 與可重現的驗證指令；
        依 `docs/rules-on-demand/spike-design-note-gate.md` 自查
- [ ] **M0 DoD 六項逐項標註**（`07:31`）—— 已關 / 部分 / **未關 + 解封條件**。
      ⛔ 第 4 項 IaC 掃描**不得**打勾或標 N/A（`AD-IaCEvidence-1`）；DAST 同理（`AD-DAST-1`）

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`greenfield-scaffold` 0.60，第 1 個資料點；
      ratio 出 band 就標記 re-point）
- [ ] `CALIBRATION-MATRIX.md` —— 新增一行並**刪掉兩行 `<example>` 範例列**，
      **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `CALIBRATION-LOG.md`）
- [ ] Final gate sweep: `npm run lint|type-check|test|build -w apps/api -w apps/web` ·
      `python scripts/lint/run_all.py` 6/6 · CI `gates` + `security-scan` 全綠
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated + §Scopes 移除「骨架尚未建立」+
      §Services/Ports 填埠號 · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（`AD-SecScan-1` 更新為部分關閉；`AD-Placeholder-1` 的
      `scope-boundaries.md` 實例 CLOSE）
- [ ] `docs/01-planning/W01-example/.gitkeep` 刪除（模板殘留）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數。**AP-3 特別注意**：
      八個範疇目錄是否留下了無邏輯的空殼
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻 `status:` frontmatter
