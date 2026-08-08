# CH-011: Monorepo scaffold — 把八個休眠的 gate 變成真的會叫

**Date**: 2026-08-08
**Phase**: W01
**Scope**: 全部八個範疇的目錄骨架 · `api`（契約層）· `ui` · 工具鏈 · CI/CD
**Components**: —
**PR**: #18

> ⚠️ 編號用 **CH-011 而非 CH-010** —— checklist 4.1 寫「目前最大為 CH-009」只看了既有檔案，
> 但 `CH-010` 已被四處前向引用預留給 Azure 資源清單
> （`ADR-0010:175` · `ADR-0011:16,157,158` · `CH-009/spec.md:165` · `BACKLOG.md:60`）。

---

## Problem

`main` 上有 `ci.yml`（五個步驟）與 `security-scan.yml`（四個 job），全部長期回報 SUCCESS。
它們什麼都沒做，因為 monorepo 骨架不存在 —— 每個步驟開頭都有
`[ ! -f package.json ] && exit 0` 的 guard。八個範疇的邊界只存在於 `CLAUDE.md` 的表格裡。

量化：`package.json` 落地前，`gates` job 的 5 個步驟印 skip notice；`security-scan` 的
SCA / SAST / 容器三個 job 各自「成功」地掃了 0 個目標。

---

## Root Cause

**不是「還沒做」—— 是 guard 的設計讓「沒有標的」與「掃過且乾淨」在輸出上看起來一樣。**

`ci.yml` 的 guard 印 `::notice::` 後 `exit 0`；`security-scan.yml:142,194` 的
`SCA_CMD` / `SAST_CMD` 是模板留下的 `<…>` 佔位符，執行時展開為空指令仍回 0；
trivy 的探測 glob `./Dockerfile ./*/Dockerfile` 在任何 Dockerfile 都不在那兩層時**靜默匹配零個檔案**。

三者共同的形狀：**綠燈的語意是「這一步沒有失敗」，而讀的人理解成「這一步通過了檢查」。**

---

## Solution

| 檔案 | 類型 | 說明 |
|------|------|------|
| `package.json` · `tsconfig.base.json` · `eslint.config.mjs` · `.prettierrc` · `.env.example` | 新增 | npm workspaces 根；五個 script 與 `ci.yml` 的呼叫形狀對齊 |
| `apps/api/src/{core-model,entity-scope,identity,workflow,audit-trail,contracts,modules}/` | 新增 | 各放 `.gitkeep`。**刻意不建空 NestJS module** —— 空 module 對「關掉會壞什麼」答不出來（AP-3）|
| `eslint.config.mjs:54,85-92,137` | 新增 | 九個 zone + policies；`boundaries/dependencies` 預設 disallow |
| `apps/api/src/{bootstrap,health,core-model}/**` | 新增 | composition root · `GET /health` 真查資料庫 · `PrismaService` |
| `apps/web/src/{app,i18n}/**` | 新增 | 最小殼層 + i18n L0（`zh-Hant` + `en`）|
| `packages/types/src/index.ts` | 新增 | 型別葉節點，`dependencies` 為空 |
| `apps/{api,web}/Dockerfile` · `docker/compose.yml` · `.trivyignore.yaml` | 新增 | distroless runtime · 本機 PostgreSQL 18 |
| `.github/workflows/{ci,security-scan}.yml` | 修改 | 填掉佔位符；trivy 改 `find` 探測；Tests 步驟改 `test:cov` |

**Load-bearing 細節（拿掉就會壞，但看起來像小事）**：

- `eslint.config.mjs:116` 的 `settings` **必須是全域區塊**。掛在有 `files` 的區塊時，
  CI 以 `-w apps/api` 執行使 cwd 變成 workspace，區塊不匹配 → elements 為空 → 規則靜默失效
- `nest-cli.json` 的 `assets` 複製 `generated/**/*` —— 少了它，build 成功但產物 require 不到 Prisma client
- `main.ts:42` 直接對 Express adapter `disable('x-powered-by')` —— helmet 的 `xPoweredBy:false` **無效**
- `prisma.config.ts` 只在有值時宣告 datasource —— generate 不需要連線字串，migrate 才需要

---

## Verification

**Gate**: type-check EXIT=0 · lint EXIT=0 · format EXIT=0 · build EXIT=0 ·
`run_all` **6/6** · test **16 passed**（api 8 + web 8；baseline **0** → **+16**）·
CI `gates` SUCCESS（14 步全 success，無一 skipped）· `security-scan` SUCCESS（四 job）

掃描的實際數字（不是「success」三個字）：
`SAST Ran 462 rules on 47 files: 0 findings` · `trivy Detected config files num=2` ·
`coverage All files 100 | 78.57 | 100 | 100` · distroless 把 base image 的 HIGH/CRITICAL 由 **45 → 6**

**新增測試**:
- `health.service.spec.ts` —— **負面測試**：探測拋錯時必須回 `db:'down'` 且 API 維持 `up`；第三例證明不快取
- `health.controller.spec.ts` —— controller 不得用自己的樂觀 payload 取代 service 的答案
- `prisma.service.spec.ts` —— `DATABASE_URL` 缺席時**在建構時** throw
- `i18n.test.ts` —— key 一致性 / 空值 / 元件引用的 key 存在。⭐ 型別檢查抓不到缺 key

**Drive-through**（MANDATORY）: 真 Chromium + 真 NestJS + 真 PostgreSQL。
切語言 → 每條字串（含 `aria-label`）都換；停 PostgreSQL → `資料庫: 無法連線` 而 `API 服務` 仍 `正常`；
起回來 → 翻回 `正常`；殺 API → `role="alert"` **取代**整個狀態列表。
截圖：`docs/01-planning/W01-monorepo-scaffold/artifacts/drive-through-0{1..6}-*.png`

**Verdict**: ✅ PASS

---

## Impact

- **Breaking change**: no（`main` 上尚無執行中的服務）
- **Migration**: no（`schema.prisma` 零 model）
- **Config**: `.env.example` 新增 8 個變數；埠 3200（web）/ 3210（api）/ 5433（PostgreSQL）
- **重啟需求**: `apps/api` 是 startup-only wiring —— 改 helmet / DI / env 載入後**必須重啟程序**，
  對舊程序驗證會看到修正前的行為（W01 Day 3 實際踩到：跑著的 API 比 dist 舊 11m52s）
- **Rollback**: revert PR #18；無資料庫狀態需回復。估 ~15 min

---

## 相關

- **推進的待辦**: `AD-SecScan-1`（三個掃描 job 由空轉變為真掃 —— **部分**關閉，DAST 仍缺）
- **關掉的待辦**: `AD-Placeholder-1` 在 `scope-boundaries.md` 的實例 ✅
- **同類前例**: `CH-006`（修 CI gate）· `CH-007`（佔位符 detector）。
  ⚠️ **這是同一形狀第 3 次以上** —— 結構性解法見 retrospective Q5，不是第 N 次逐一修補
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：
  `AD-ImageBuild-1` · `AD-TrivyExempt-1` · `AD-WebCoverage-1` · `AD-CovThreshold-1`
- **Design note**: `docs/02-architecture/design-notes/W01-monorepo-scaffold.md`
