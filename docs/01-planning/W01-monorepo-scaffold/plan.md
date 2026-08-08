---
status: closed_partial   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W01 Plan — Monorepo scaffold that turns the dormant gates on

**Summary**: 建立 ADR-0001 定案的 monorepo 骨架（`apps/api` NestJS · `apps/web` Next.js ·
`packages/types`），把八個範疇的邊界從 review 慣例變成 lint 失敗，補上 i18n L0 與安全標頭，
並交出兩個 Dockerfile。交付的當下，CI 五個 guard 步驟與 security-scan 三個 job **自動從 skip 轉為真跑** ——
這是本 phase 唯一真正關掉的 gap。M0 DoD 只會**部分**關閉：DAST 與 IaC 掃描無標的（`AD-DAST-1` /
`AD-IaCEvidence-1`），TLS/憑證/管理埠屬部署期而 infra 尚未佈建。`apps/web` 有可見畫面 →
**drive-through MANDATORY**。本 repo 內無藍本 → **需要 design note**。

**Status**: **closed_partial**（2026-08-08 收尾）—— US-1/2/4/5/6 完成，**US-3 部分**：
三個掃描 job 已真掃，但兩個 Dockerfile 從未被 build 過（`AD-ImageBuild-1`）；
安全標頭的自動化斷言未寫（checklist `2.3` 🚧）。M0 DoD 六項中 3 關閉 / 2 部分 / 1 無標的。
retrospective: [retrospective.md](./retrospective.md)
（原核可紀錄：laitim2001 於 2026-08-08 核可；範圍以兩題確認：僅 M0 骨架 · web 最小殼層）

**Branch**: `feature/W01-monorepo-scaffold`
**Base**: `main` HEAD `dc0c880`（PR #17 —— `AD-IaCEvidence-1` 入 BACKLOG）
**Slice**: standalone —— 推進 `AD-SecScan-1`、關掉 `AD-Placeholder-1` 在 `scope-boundaries.md` 的實例；
M0 六項 DoD 中的第 3、6 項與第 5 項的應用層部分
**Scope decisions**: (a) 僅 M0 骨架，不碰資料模型 / RLS / 頁面移植 (b) `apps/web` 是最小殼層，
**不**複製設計交付物 CSS (c) 八個範疇建目錄 + lint 分區，**不**建空 NestJS module（見 §3.4）
(d) 本機 PostgreSQL 走 Docker Compose，`prisma/schema.prisma` 零 model
(e) i18n 只做 **L0**（單一 zh-Hant 字典 + key 一致性測試），不建第二份字典

---

## 0. Background

### The gap（`AD-SecScan-1` · `AD-CIRequired-1` · `AD-Placeholder-1`）

- `ci.yml` 有五個步驟（format / lint / type-check / test / build）被 `[ ! -f package.json ]` 守著，
  **從專案第一個 PR 起就沒執行過**。
- `security-scan.yml` 四個 job 只有 `secret-scan` 真跑；`dependency-scan` / `static-analysis` 缺
  `package.json`，`container-scan` 缺 Dockerfile。
- CLAUDE.md §範疇 八個目錄全部標「⚠️ 骨架尚未建立」；ADR-0001 指定的 `eslint-plugin-boundaries`
  尚未存在，跨範疇 import 目前**沒有任何東西會擋**。
- `scope-boundaries.md` 的範疇表與 import 矩陣仍是模板佔位符 —— eslint 設定要實作的那張矩陣不存在。

### Why it matters（缺失的能力）

guardrail 7 要求 CI 內含 SCA / SAST / 容器掃描。三者現在都是 **skip 不是 clean** ——
綠燈不代表通過，代表沒檢查。而 CLAUDE.md 約束 1（單一範疇歸屬）目前只靠自律：
第一個跨範疇 import 寫下去不會有人知道，等到 M3 稽核攔截點要放進 Prisma extension 時，
依賴圖已經纏死了。**這兩件事的成本都隨時間單調上升，而且都被骨架擋著。**

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `dc0c880`）| Anchor |
|-------|--------------------------------------------|--------|
| Repo 根目錄 | 無 `package.json`、無 `apps/`、無 `.env.example` | repo root listing |
| CI 五個 guard | `if [ ! -f package.json ]; then … exit 0; fi` ×5 —— 骨架一出現自動生效 | `.github/workflows/ci.yml:112-151` |
| SCA / SAST | 兩個 job 存在但無 `package.json` 可掃 | `.github/workflows/security-scan.yml:132,184` |
| 容器掃描 | job 存在但無 Dockerfile | `.github/workflows/security-scan.yml:207` |
| 範疇邊界 | ADR-0001 指定 module + `eslint-plugin-boundaries` 機械強制 | `docs/14-adr/0001-backend-framework.md:69-71` |
| 範疇矩陣 | **仍是模板佔位符** —— `<範疇名>` / `<目錄>`，矩陣是 api-domain-infra 範例 | `docs/rules-on-demand/scope-boundaries.md:35-41,83-91` |
| i18n 層級 | L0 = 抽字串，**唯一有時效性的一層**，不需框架 | `docs/rules-on-demand/i18n-glossary.md:29-32` |
| 語言集 | 仍是開放 AD —— L0 不需要它，L1 才需要 | `BACKLOG.md` `AD-DesignAlign-2` |
| Phase 目錄 | `docs/01-planning/W01-example/` 只有 `.gitkeep`，是模板殘留 | dir listing |

→ 骨架是唯一的解鎖點：`package.json` 一落地，五個 CI 步驟與兩個 security job 同時醒來；
Dockerfile 一落地，第三個 job 醒來。**這也是風險**（§8 R-1）—— 八個 gate 會在同一個 PR 一起首航。

### The design（`M0 骨架：workspace + 8 範疇分區 + Prisma 連線 + i18n L0 + 兩個 Dockerfile`）

```
package.json                      npm workspaces: apps/*, packages/*
├─ apps/api        NestJS 10 + Prisma 7  ── src/{core-model,entity-scope,identity,
│                                             workflow,audit-trail,contracts,modules}/
│                  health controller → prisma.$queryRaw`SELECT 1`
├─ apps/web        Next.js  ── 一頁殼層：i18n 切換 + 顯示 api /health 結果
├─ packages/types  跨範疇契約層（葉節點，誰都能 import，它 import 不了任何人）
└─ docker/         api.Dockerfile · web.Dockerfile · compose.yml(postgres)

eslint.config.mjs  boundaries：8 個 zone + 允許矩陣（實作 scope-boundaries.md 的表）
```

不建空的 NestJS module：空 module 沒有「關掉它會壞什麼」的答案，正是 AP-3 的定義。
邊界靠 **lint 分區 + 負面測試**成立，不靠佔位的 class（詳見 §3.4）。

### Ground truth（recon head-start —— 於 `main` HEAD `dc0c880` 讀過的 code）

- `docs/14-adr/0001-backend-framework.md:58` — 形狀固定為 `apps/api` · `apps/web` · `packages/types`
- `docs/14-adr/0001-backend-framework.md:112` — 每個 DB 存取走 Prisma client extension；
  `$queryRaw` / migration / Studio 會繞過，**CI 必須機械偵測**（本 phase 只記錄，M2 才實作）
- `docs/14-adr/0011-compute-platform.md:103` — `apps/api` 與 `apps/web` 各需一個 Dockerfile（M0）
- `docs/02-architecture/07-wave1-build-plan.md:50` — M0 要自動化的項目清單（安全標頭、cookie 屬性、
  seed-data 檢查等）
- `docs/rules-on-demand/i18n-glossary.md:41` — `GLOSSARY.md` 與字典檔同住，**不放 `docs/`**
- `.github/workflows/ci.yml:120` — 「絕不加 `--silent`」已寫在 CI 註解裡

**Baselines（`CH-009` / PR #17 closeout）**: run_all **6/6** · CI `gates` SUCCESS ·
lint / type-check / test / build **skip（非 pass）** · coverage n/a（無 code）。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-boundaries-matrix** — `scope-boundaries.md:35-41,83-91` 是否仍為佔位符 → 若是，§3.4 的
  矩陣填寫是本 phase 前置而非附帶
- **D-envexample** — `.env.example` 是否真的不存在但 CLAUDE.md 仍指向它 → §4 新增
- **D-ports** — 3200 / 3210 / 5433 是否被姊妹專案佔用 → 佔用則改號並記入 progress.md
- **D-nest-prisma-ver** — NestJS 10 / Prisma 7 的當前可安裝版本與 ADR-0001 宣稱是否一致 → 不一致移入 §8

## 1. Phase Goal

交出 ADR-0001 定案的 monorepo 骨架，使得（a）CI 的五個 guard 步驟與 security-scan 的
SCA / SAST / 容器掃描三個 job **從 skip 轉為真跑且全綠**，（b）跨範疇 import **會讓 lint 失敗**
並以一次真實的違規實驗證明，（c）i18n L0 就位且缺 key 會讓測試紅，（d）`apps/web` 一頁殼層能在
瀏覽器打開、切語言、顯示 `apps/api` 回傳的 DB 健康狀態。證明方式：完整 gate ＋
**MANDATORY drive-through**（真瀏覽器 + 真 NestJS + 真 PostgreSQL）。本 phase **產出 design note**
（本 repo 無藍本），**不產出 ADR**。

## 2. User Stories

- **US-1**（工程基礎）: 作為單一開發者，我希望有一個 npm workspace 骨架，以便 ADR-0001 的三個
  package 有真實的建置、型別檢查與測試指令。
- **US-2**（範疇紀律）: 作為架構守門人，我希望跨範疇 import 會讓 lint 失敗，以便 CLAUDE.md 約束 1
  不再只靠自律。
- **US-3**（安全基準線）: 作為 ISMS 平台的擁有者，我希望 SCA / SAST / 容器掃描真的執行，
  以便 guardrail 7 從「有 job」變成「有結果」。
- **US-4**（可維護的文案）: 作為未來要加語言的人，我希望文案從第一天就不寫死在元件裡，
  以便 L1 只是加一份字典而不是重寫所有頁面。
- **US-5**（可用性）: 作為使用者，我希望打開網頁能看到畫面、切得動語言、看得到後端是活的，
  以便骨架不是紙上談兵。**→ drive-through MANDATORY**
- **US-6**（收尾）: 作為下一個 phase 的自己，我希望有 design note 記下真正被驗證的不變式，
  以便 M1 不必重新發現。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW  package.json · package-lock.json · tsconfig.base.json · eslint.config.mjs
     .prettierrc · .env.example · .dockerignore
NEW  apps/api/**        NestJS bootstrap · health module · prisma service · 7 範疇目錄
NEW  apps/web/**        Next.js app router · 一頁殼層 · i18n 字典 + GLOSSARY.md
NEW  packages/types/**  契約層（葉節點）
NEW  docker/api.Dockerfile · docker/web.Dockerfile · docker/compose.yml
EDIT docs/rules-on-demand/scope-boundaries.md   §範疇定義 + §import 矩陣（填掉佔位符）
EDIT CLAUDE.md          §Scopes 拿掉「⚠️ 骨架尚未建立」· §Services/Ports 填埠號
DEL  docs/01-planning/W01-example/.gitkeep      模板殘留，真實 W01 已存在
UNTOUCHED  .github/workflows/*                  guard 自動生效，不需要改一個字
UNTOUCHED  scripts/lint/*                       架構 lint 與 JS 工具鏈正交
```

### 3.1 Workspace 骨架（US-1）— `package.json` · `tsconfig.base.json`

- npm workspaces：`apps/*` · `packages/*`。指令形狀**必須**與 `ci.yml:118-151` 已寫死的
  `npm run <x> -w apps/api -w apps/web` 一致 —— CI 是既有契約，骨架去對齊它，不是反過來。
- 需要的 script：`format:check` · `lint` · `type-check` · `test` · `build`（五個都被 CI 呼叫）。
- `packages/types` 只放型別，**無 runtime 相依**（`scope-boundaries.md` §共用型別的單一來源）。

### 3.2 apps/api（US-1, US-3）— NestJS 10 + Prisma 7

- Bootstrap + `@nestjs/swagger`（`05:33` API-first；ADR-0001 §Decision 引以為據）。
- `PrismaService` 用 `@prisma/adapter-pg`。`prisma/schema.prisma` **零 model** ——
  M1 才建實體圖，現在建表等於在 ADR-0005 未拍板時替使用者選技術。
- `GET /health` → `prisma.$queryRaw\`SELECT 1\`` → `{ db: 'up' | 'down' }`。
  這是真的打資料庫，不是回硬編碼字串。
- 安全標頭：`helmet` 明確設定（`04:93`「預設值就是風險」；`16` 的 transport/headers 分項）。

### 3.3 apps/web（US-4, US-5）— Next.js 最小殼層

- 一頁：標題 + 語言切換 + `apps/api` `/health` 的即時結果。
- i18n **L0**：`apps/web/src/i18n/zh-Hant.json` + 同目錄 `GLOSSARY.md`（`i18n-glossary.md:41`
  明訂與字典同住）。**只有一份字典** —— 第二份要等 `AD-DesignAlign-2` 拍板語言集，
  現在建等於 AP-5。
- **key 一致性測試**接進 `npm run test`：字典無空值、元件用到的 key 都存在。
  這是 `i18n-glossary.md:65`「整份規則裡唯一有強制力的部分」。
- ⚠️ **不碰** `docs/06-reference/design_handoff_isms_grc_platform/` 的任何檔案。

### 3.4 範疇邊界（US-2）— `eslint.config.mjs` + `scope-boundaries.md`

先填權威表，再寫實作：`scope-boundaries.md` §範疇定義填入 CLAUDE.md §Scopes 的八個範疇，
§import 矩陣填入下列不變式（源自 CLAUDE.md §分層「下層絕不 import 上層」）：

- `packages/types`（契約層）是**葉節點** —— 誰都能 import 它，它 import 不了任何人
- `core-model` 不依賴任何模組；`modules/` 可依賴 `core-model` / `entity-scope` / `audit-trail`
- `ui`（`apps/web`）只能經 HTTP 與型別接觸 `apps/api`，**不得** import 其 src

⚠️ **不建空的 NestJS module。** AP-3 的判準是「關掉它會壞什麼？答不出來就是 Potemkin」——
空 module 的答案是「什麼都不會」。範疇目錄放 `.gitkeep`，邊界由 lint 分區成立；
每個範疇的 module 在它拿到第一段真實 code 時才誕生（M1 起）。

### 3.5 容器化（US-3）— `docker/`

- `api.Dockerfile` / `web.Dockerfile`：multi-stage、非 root user、pin base image digest。
  這三項是 `container-scan` 會檢查的（`security-scan.yml:235` 設定檔掃描 + `:250` 基礎映像掃描）。
- `compose.yml` 只起 PostgreSQL 供本機開發 —— **不是 mock，是同一個引擎**。

### 3.x 明確不做的事

- **不建任何資料表 / migration** —— M1 的工作，且形狀依賴未拍板的 ADR-0005
- **不寫 Prisma client extension（RLS / 稽核攔截）** —— ADR-0004 的 spike，W02
- **不接 Entra ID 登入** —— infra team 尚未建 App Registration，redirect URI 需要已知網域
- **不複製設計交付物 CSS** —— 到 M6 之前沒有消費者
- **不把 CI 設為 required status check** —— `AD-CIRequired-1`；本 phase 讓它先真跑幾次
- **不寫 IaC** —— 已無標的（`AD-IaCEvidence-1`）
- **不補 DAST** —— 無可達目標（`AD-DAST-1`），且與 runner 位置的決定綁在一起

### 3.y Validation（US-1..US-6）

Gates: `run_all` 6/6 · CI `gates` SUCCESS **且五個 guard 步驟真的執行**（不再印 skip notice）·
`security-scan` 的 `dependency-scan` / `static-analysis` / `container-scan` 真的執行 ·
`npm run lint|type-check|test|build -w apps/api -w apps/web` 全綠 · 新 code 覆蓋率 ≥ 80%。
加上 §3.3 的 drive-through（**MANDATORY** —— `apps/web` 是 user-facing）。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `package.json` · `package-lock.json` · `tsconfig.base.json` | NEW |
| 2 | `eslint.config.mjs` · `.prettierrc` · `.dockerignore` | NEW |
| 3 | `.env.example` | NEW（CLAUDE.md §Environment Setup 指向它但它不存在）|
| 4 | `apps/api/**`（含 7 個範疇目錄 `.gitkeep` + health + prisma）| NEW |
| 5 | `apps/web/**`（殼層 + `src/i18n/zh-Hant.json` + `src/i18n/GLOSSARY.md`）| NEW |
| 6 | `packages/types/**` | NEW |
| 7 | `docker/api.Dockerfile` · `docker/web.Dockerfile` · `docker/compose.yml` | NEW |
| 8 | `docs/rules-on-demand/scope-boundaries.md` §範疇定義 + §import 矩陣 | EDIT |
| 9 | `CLAUDE.md` §Scopes 移除「骨架尚未建立」· §Services/Ports 填埠號 | EDIT |
| 10 | `docs/02-architecture/design-notes/W01-monorepo-scaffold.md` | NEW（spike 收尾）|
| 11 | `docs/01-planning/W01-example/.gitkeep` | **DELETE**（模板殘留）|
| — | `.github/workflows/ci.yml` · `security-scan.yml` | **UNTOUCHED** —— guard 自動生效 |
| — | `scripts/lint/**` | **UNTOUCHED** |
| — | `docs/06-reference/design_handoff_isms_grc_platform/**` | **UNTOUCHED**（約束 6）|
| — | `prisma/schema.prisma` 的 model 區 | **UNTOUCHED**（空 —— M1 才建）|

## 5. Acceptance Criteria

1. `npm run lint|type-check|test|build -w apps/api -w apps/web` 四者本機全綠。
2. CI `gates` 的 format / lint / type-check / test / build 五步**不再印 skip notice** 且 SUCCESS。
3. `security-scan` 的 `dependency-scan` / `static-analysis` / `container-scan` 三個 job 真的執行；
   結果逐 job 記入 progress.md（**有 finding 也算通過本項 —— 有結果才是重點**）。
4. **範疇邊界負面測試**：刻意寫一個跨範疇 import → `npm run lint` **失敗**並指名該規則；
   還原後恢復綠。指令輸出貼進 progress.md。
5. **i18n 負面測試**：刻意刪一個 key → `npm run test` **失敗**；還原後恢復綠。
6. `scope-boundaries.md` 的範疇表與 import 矩陣**無佔位符**，且與 `eslint.config.mjs` 的分區逐一對應。
7. **Drive-through PASS（MANDATORY，真瀏覽器 + 真 NestJS + 真 PostgreSQL）** ——
   頁面渲染、語言切換真的換字、`/health` 顯示 `db: up`；**停掉 PostgreSQL 後顯示 `db: down`**
   （否則那是硬編碼）。截圖 + observed-vs-intended 記入 progress.md。
8. Design note 通過 8-point gate（含 `file:line`）。
9. `AD-SecScan-1` 更新為部分關閉；`AD-Placeholder-1` 的 `scope-boundaries.md` 實例 CLOSED；
   M0 DoD 逐項標註（含**未關閉**的第 4 項與 DAST，附解封條件）；calibration 已記錄；
   導航檔 + BACKLOG 已更新。

## 6. Deliverables

- [x] US-1 npm workspace 骨架，五個 CI 指令都存在且可跑
- [x] US-2 `eslint.config.mjs` 八分區 + 已填寫的 `scope-boundaries.md` + 負面測試證據
- [ ] US-3 兩個 Dockerfile；SCA / SAST / 容器掃描三個 job 真的執行
      🚧 **部分**：三個 job 已真掃 ✅；兩個 Dockerfile 存在但**從未被 build 過** ——
      本機 build 被公司 proxy 的容器內 TLS 攔截擋住（`AD-ImageBuild-1`）。
      解封條件：CI 或部署環境跑一次 build
- [x] US-4 i18n L0 + `GLOSSARY.md` + key 一致性測試接進 `npm run test`
- [x] US-5 drive-through PASS（含 `db: down` 的負面驗證）—— 6 張截圖於 `artifacts/`
- [x] US-6 design note + retrospective + calibration 回填

## 7. Workload Calibration

- Scope class **`greenfield-scaffold` 0.60**（**NEW class，第 1 個資料點**。
  Read `docs/01-planning/CALIBRATION-MATRIX.md` —— 該表目前只有兩行範例、零個真實資料點。
  取 `greenfield-feature` 0.55 與 `spike` 0.65 之間：形狀在姊妹專案
  `unified-operation-platform` 已知，但**本 repo 內沒有任何既有基礎設施可抄**）。
- **Agent-delegated: no**（單人直接執行；未獲授權派工）。`agent_factor` 1.0 → 三段式。
- Bottom-up est ~24 hr（Day 0 verify 1 · workspace+三個 package 5 · 範疇分區+矩陣 3 ·
  Prisma+compose+health 3 · i18n L0+測試 3 · 安全標頭+Dockerfile 3 · Day 3 驗證 3 ·
  Day 4 收尾 3）→ class-calibrated commit **~14.4 hr** (mult 0.60)。Day-4 retro Q2 驗證。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **R-1 八個 gate 同時首航** —— `package.json` 一落地，CI 五步 + 兩個 security job 同時醒來，Dockerfile 再醒一個。第一次很可能一次爆出數十個錯 | Day 1 先只加 `package.json` + 最小 script 推一個 draft PR，讓 gate 分批醒；**不要**等全部寫完才第一次跑 CI |
| **R-2 空 module 的 AP-3 誘惑** —— 八個範疇目錄看起來「應該」各放一個 module | §3.4 已明文禁止；驗收第 4 項用負面測試證明邊界成立，不靠 module 存在 |
| **R-3 `scope-boundaries.md` 矩陣是本 phase 前置** —— 沒填就寫不出 eslint 設定 | 排在 Day 1 最前面；填不出來代表範疇定義本身有問題 → STOP and ask |
| **R-4 版本漂移** —— ADR-0001 寫 NestJS 10 / Prisma 7，實際可安裝版本可能已不同 | Day-0 D-nest-prisma-ver 驗證；不一致就記入 progress.md 並在 design note 說明，**不默默改 ADR** |
| **R-5 Risk Class C（陳舊長駐程序）** —— dev server 與 compose 的 postgres 都是長駐；drive-through 前若沿用舊程序，會驗到修正之前的狀態 | Day 3 依 `local-runtime-ops.md` 乾淨重啟；擷取 startup log 佐證（`task-workflow.md` §Risk Class C）|
| **R-6 覆蓋率 ≥ 80% 對骨架不自然** —— 骨架大多是設定，可測的邏輯少 | 測試對準真正有邏輯的三處：health 的 up/down 分支、i18n key 一致性、boundaries 設定的分區解析。設定檔不追覆蓋率 |
| **R-7 埠號與姊妹專案衝突** | Day-0 D-ports 驗證 3200 / 3210 / 5433；衝突則改號並同步 CLAUDE.md。**Day-0 結果：三埠皆 free** |
| **R-8 NestJS 主版本已前進**（Day-0 `D-nest-prisma-ver` 發現）—— registry 現況 `@nestjs/core` 11.1.28，ADR-0001 與 `CLAUDE.md` §Tech Stack 字面寫 NestJS 10；Prisma 7 相符 | ADR-0001 的決定是**框架**不是版本。已向使用者表面化（`CLAUDE.md` §禁止反模式：不默默替使用者選技術）。定案後同步 `CLAUDE.md` §Tech Stack 並在 design note 記錄，**不改 ADR 內文** |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **Prisma client extension（RLS + 稽核攔截）** — W02，ADR-0004 spike；它驗證 ADR-0001 的承重假設
- **核心實體 migration** — M1，且依賴未拍板的 ADR-0005
- **Entra ID 登入** — M4；先決條件在 infra team（App Registration + 網域）
- **DAST job** — `AD-DAST-1`，與 CI runner 位置的決定綁在一起
- **IaC 與其掃描** — `AD-IaCEvidence-1`，已無標的
- **CI 設為 required status check** — `AD-CIRequired-1`，等本骨架的 gate 真跑穩定後
- **設計交付物 CSS 移植** — M6 起，屆時 `mockup-fidelity.md` 的逐頁 DoD 才驗證得了
- **第二份語言字典** — 等 `AD-DesignAlign-2` 拍板語言集
