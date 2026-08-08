# Monorepo Scaffold Design Note (Phase W01 extract)

**Purpose**: Spike-extract design note from Phase W01；記錄骨架層已驗證的 runtime invariant
**Created**: 2026-08-08 (Phase W01 Day 4 closeout)
**Phase source**: W01 — `docs/01-planning/W01-monorepo-scaffold/`
**Verified ratio**: 21/22 ≈ 95%
**Status**: Active

---

## 0. Spike Summary

- **Phase scope**: US-1 workspace 可建可測 · US-2 範疇邊界機械強制 · US-3 i18n L0 ·
  US-4 安全標頭與容器化 · US-5 drive-through
- **驗證期間**: 2026-08-08（單日）
- **Calibration**: bottom-up 24 hr / committed 14.4 hr (mult 0.60) / actual ~5 hr / ratio ~0.35 —
  **UNDER band，第 1 個資料點**，依 3-phase 規則不調整乘數（見 retrospective Q2）
- **驗證增量**: +8 unit tests（api 8 · web 8，baseline 0）· drive-through **PASS**（6 張截圖）

> **為什麼這個 phase 需要 design note**：本 repo 內沒有任何既有基礎設施可抄，
> 八個範疇的邊界、掃描管線、容器 runtime 全是第一次落地。M1 起的每個 phase 都會踩在這上面。

---

## 1. Decision Matrix

### 1.1 範疇邊界要用什麼強制

| Option | 誰會發現違規 | 何時發現 | Decision |
|--------|------------|---------|----------|
| **A. `eslint-plugin-boundaries` policies（選定）** | CI | commit 前 | ✅ 選定 —— 唯一在**寫下違規的當下**就失敗的做法；錯誤訊息指名兩個範疇與規則名 |
| B. Code review 慣例 | 人 | review 時（或永遠不會）| ❌ 否決 —— 單人開發沒有 reviewer（`CLAUDE.md` §Branch Protection `review_count=0`），等於沒有 |
| C. 目錄結構 + 文件約定 | 沒有人 | — | ❌ 否決 —— `scope-boundaries.md` 的矩陣若沒有執行者，就只是一張圖 |
| D. 拆成獨立 npm package（物理隔離）| tsc | build 時 | ❌ 否決 —— 八個 package 的版本管理成本，換一個 lint 規則就能得到的東西（AP-5）|

⚠️ **選 A 的代價已經付過一次**：設定寫對之前，它連續六次「設定有效、lint 全綠、零強制力」
（見 §2.1 failure mode）。**能設定的東西就能設定成沒有作用**，這正是它需要負面測試的原因。

### 1.2 Runtime base image

| Option | HIGH/CRITICAL | 內含 npm | Decision |
|--------|--------------|---------|----------|
| **A. `gcr.io/distroless/nodejs22-debian12:nonroot`（選定）** | **6**（全 `libssl3`）| 否 | ✅ 選定 —— 45 → 6 是移除**整類**問題（34 條來自 npm 自身），而 production runtime 不需要 npm |
| B. `node:22.21.0-bookworm-slim` | 45 | 是 | ❌ 否決 —— 逐條豁免 45 條等於把豁免清單變成噪音，沒有人會再讀它 |
| C. alpine | 較少 | 是 | ❌ 否決 —— musl 與 Prisma 引擎的組合是已知摩擦源；本 phase 已為 OpenSSL 缺失除錯過一輪 |
| D. 調高 trivy severity 門檻 | 0（假的）| 是 | ❌ 否決 —— 會連**還沒出現**的 advisory 一起放過。門檻不是處置手段 |

### 1.3 空 NestJS module 要不要建

| Option | AP-3 檢測問題「關掉會壞什麼」 | Decision |
|--------|---------------------------|----------|
| **A. 只放 `.gitkeep`（選定）** | 不適用 —— 沒有宣稱任何行為 | ✅ 選定 —— 目錄表達歸屬，`eslint.config.mjs:54` 的 zone 定義才是強制力來源 |
| B. 每個範疇一個空 module | **答不出來** | ❌ 否決 —— 空 module 是 AP-3 的教科書形狀：結構在、接口完整、無邏輯 |

---

## 2. Verified Invariants

### 2.1 跨範疇 import 在 lint 階段失敗，且訊息指名範疇

- **Implementation**: `eslint.config.mjs:54`（九個 zone）· `:85-92`（policies）· `:137`（規則掛載）
- **Behavior**: `boundaries/dependencies` 預設 `disallow`，只有矩陣列出的方向被允許。
  三個刻意的 ❌：`audit-trail` 不 import `core-model`、`core-model` 不 import `entity-scope`、
  `modules` 互不 import。
- **Verification**（可重現）:
  ```bash
  printf "import { PrismaService } from '../core-model/prisma.service';\nexport const x = PrismaService;\n" \
    > apps/api/src/audit-trail/TEMP.ts
  npm run lint -w apps/api   # 預期 EXIT=1
  rm apps/api/src/audit-trail/TEMP.ts && npm run lint -w apps/api   # 預期 EXIT=0
  ```
  實測輸出：
  ```
  4:31  error  There is no policy allowing dependencies from elements of type
               "audit-trail" to elements of type "core-model"   boundaries/dependencies
  ```
- **Test fixture**: 無常駐 fixture —— 這是**破壞式**驗證，證據留在
  `docs/01-planning/W01-monorepo-scaffold/progress.md` Day 3 §3.3
- **Failure mode** ⭐: 設定損壞時**它不會報錯，它會安靜地什麼都不做**。本 phase 踩到六種：
  `mode:'full'` 廢棄、規則舊名 `element-types` 靜默無作用、`rules` 改為 `policies`、
  external 選擇器 `dependency.type`→`module.origin`、`settings` 掛在有 `files` 的區塊
  （CI 用 `-w apps/api` 時 cwd 是 workspace，區塊不匹配 → elements 為空）、
  缺 `eslint-import-resolver-typescript`。**六種全部表現為「lint 全綠」。**

### 2.2 `GET /health` 的 `db` 值來自即時查詢，不是啟動旗標

- **Implementation**: `apps/api/src/health/health.service.ts:35`（`SELECT 1`）· `:36`/`:41`（兩個回傳分支）
- **Behavior**: 每次請求發一次真查詢，不快取。API 自身維持 `up` 而 `db` 獨立翻轉 ——
  **兩個值分別代表兩件事**，不是同一個布林的兩種說法。
- **Verification**:
  ```bash
  curl -s http://127.0.0.1:3210/health          # {"status":"up","db":"up"}
  docker stop isms-postgres-dev
  curl -s http://127.0.0.1:3210/health          # {"status":"up","db":"down"}
  docker start isms-postgres-dev && sleep 8
  curl -s http://127.0.0.1:3210/health          # {"status":"up","db":"up"}
  ```
- **Test fixture**: `apps/api/src/health/health.service.spec.ts`（三例，含**不快取**的往返）·
  `apps/api/src/health/health.controller.spec.ts`（controller 不得替換成自己的樂觀 payload）
- **Failure mode**: 若改為啟動時探測一次並快取，三個測試中的第三個會失敗；
  drive-through 則會看到停掉資料庫後畫面仍顯示 `正常`。

### 2.3 畫面上的資料庫狀態確實來自 API（drive-through）

- **Implementation**: `apps/web/src/app/page.tsx:45`（`fetch` + `cache: 'no-store'`）· `:91-93`（渲染）
- **Behavior**: 三個渲染分支 —— 正常 / 資料庫無法連線 / **API 不可達**。
  第三個分支用 `role="alert"` **取代**整個狀態列表，不留上一次的成功值。
- **Verification**: 真瀏覽器走查，證據 6 張：
  `docs/01-planning/W01-monorepo-scaffold/artifacts/drive-through-0{1..6}-*.png`
- **Test fixture**: 無自動化元件測試（見 §4 開放項 · `AD-WebCoverage-1`）
- **Failure mode**: 若值是硬編碼常數，停掉 PostgreSQL 後畫面不會變 ——
  這是 AP-3 在前端唯一可靠的檢測方式。

### 2.4 使用者可見字串全部走字典，且缺漏會讓測試失敗

- **Implementation**: `apps/web/src/i18n/index.ts:60`（`t()`）· `:43`（key 型別由 `zh-Hant` 推導）
- **Behavior**: 元件持 key、字典持文案。切語言時**含 `aria-label` 一起換**。
- **Verification**:
  ```bash
  # 從 en.json 刪掉任一 key
  npm run test -w apps/web   # 預期 EXIT=1，且訊息指名該 key
  ```
  實測：`× en carries exactly the reference key set` / `- "health.state.down"`
- **Test fixture**: `apps/web/src/i18n/i18n.test.ts`（key 一致性 / 空值 / 元件引用的 key 存在）
- **Failure mode** ⭐: **型別檢查抓不到這個** —— `TranslationKey` 只從 `zh-Hant` 推導，
  其他語系的型別是 `Record<string, string>`。parity 測試是唯一的閂門。

### 2.5 安全標頭是明確設定的，不是繼承預設

- **Implementation**: `apps/api/src/bootstrap/main.ts:42`（明確 `disable('x-powered-by')`）·
  `:46`（helmet 逐項設定）· `apps/web/next.config.ts`（`SECURITY_HEADERS` 常數 + `headers()`）
- **Behavior**: 兩個服務各自設定自己的回應標頭；CORS 指名單一 origin 而非反射請求來源。
- **Verification**:
  ```bash
  curl -s -i http://127.0.0.1:3210/health | head -20
  ```
  實測到位：CSP · HSTS · `X-Frame-Options: DENY` · `Referrer-Policy: no-referrer` ·
  `X-Content-Type-Options: nosniff` · `Access-Control-Allow-Origin: http://localhost:3200`（非 `*`）·
  **`X-Powered-By` 不存在**
- **Test fixture**: **無** —— 見 §4，這是本 phase 已知的自動化缺口
- **Failure mode** ⭐: helmet 的 `xPoweredBy: false` **對 Express 無效**，必須直接對 adapter
  下 `disable`。實測前它一直在回應裡。

### 2.6 建置產物真的能啟動

- **Implementation**: `apps/api/nest-cli.json`（`entryFile: bootstrap/main` ·
  `assets` 複製 `generated/**/*` 進 dist）· `apps/api/tsconfig.build.json`（排除 `*.spec.ts`）·
  `apps/api/package.json` `start` 指向 `dist/bootstrap/main.js`
- **Behavior**: `dist/generated/prisma` 隨 build 產生；spec 檔不進 production build。
- **Verification**:
  ```bash
  npm run build -w apps/api && ls apps/api/dist/generated/prisma/client.js
  npm run start -w apps/api    # 應到 "Nest application successfully started"
  ```
- **Test fixture**: 無（build 產物層，非單元測試範疇）
- **Failure mode** ⭐⭐: 這一項**壞過兩次而 gate 全綠**——
  (a) `dist/generated` 不存在 → require 失敗；(b) `start` 指向 `dist/main.js`（不存在的路徑）。
  `npm run build` 只證明編譯成功，**不證明產物能執行**。

### 2.7 CI 的掃描與門檻真的執行

- **Implementation**: `.github/workflows/security-scan.yml`（SCA `npm audit --audit-level=low` ·
  SAST semgrep 掃 `apps packages scripts` · trivy 以 `find` 探測 Dockerfile · gitleaks 全歷史）·
  `.github/workflows/ci.yml` Tests 步驟（`test:cov`，非 `test`）
- **Behavior**: 每個掃描都印出可對數的數量，而不是只印 `success`。
- **Verification**: `gh run view <id> --log`，實測數字：
  ```
  SAST     Ran 462 rules on 47 files: 0 findings
  trivy    Detected config files num=2
  coverage All files  100 | 78.57 | 100 | 100   (threshold gate EXIT=0)
  ```
- **Test fixture**: `scripts/lint/check_workflow_placeholders.py`（棘輪：目前 0 known unfilled）
- **Failure mode** ⭐⭐⭐: **四個 job 曾全部 success 而其中三個什麼都沒掃**——
  `SCA_CMD`/`SAST_CMD` 是 `<…>` 佔位符、trivy 的 glob 一個 Dockerfile 都沒配到。
  覆蓋率同型：門檻寫在兩個地方，而 CI 跑的是 `test` 不是 `test:cov`，45% 一路綠到 Day 3。
  **這個形狀本 phase 出現 5 次**（見 retrospective Q5）。

---

## 3. Cross-Scope Contracts

| Contract | Owner scope | 登記於 | Signature |
|----------|------------|--------|-----------|
| `DependencyState` | `api`（`packages/types`）| `packages/types/src/index.ts:30` | `'up' \| 'down'` |
| `HealthResponse` | `api`（`packages/types`）| `packages/types/src/index.ts:39-42` | `{ readonly status: DependencyState; readonly db: DependencyState }` |

`packages/types` 是**型別葉節點**：`dependencies` 為空，兩個 app 都可 import，它不 import 任何人。
這條不變式由 `eslint.config.mjs` 的 policies 表達，非僅慣例。

---

## 4. Open Invariants（延後，**未驗證**）

> 這一節是本文件最重要的部分。W01 交付的是骨架，**骨架的定義就是大部分承重結構還沒上**。

- [ ] **Entity scoping / RLS 完全未實作** —— `apps/api/src/core-model/prisma.service.ts:12`
  明文標示 `THIS CLIENT IS NOT YET ENTITY-SCOPED`。目前 `schema.prisma` 零 model，所以**無資料可洩**；
  ⚠️ **M1 加第一張表的瞬間，這就成為 guardrail 4 / 約束 8 的違反**。ADR-0004 未定。
- [ ] **`core-model` 經 DI 而非 import 取得範疇化 client** —— **設計意圖，尚未跑過**。
  它同時是 `scope-boundaries.md` 矩陣中「`core-model` 不 import `entity-scope`」那個 ❌ 的承重假設，
  也是 ADR-0001 §可證偽條件 #1。由 ADR-0004 spike 驗證。
- [ ] **兩個 Dockerfile 從未被 build 過** —— trivy 依設計只掃 base image 不 build；
  本機 build 被公司 proxy 的容器內 TLS 攔截擋住。`AD-ImageBuild-1`。
  ⚠️ W01 已修過兩個**只有 build 才會暴露**的缺陷，而那是碰巧跑了一次才發現的。
- [ ] **安全標頭沒有自動化斷言** —— §2.5 是手動 curl 實測。手動實測與自動化斷言不可互相替代：
  前者證明今天對，後者防止明天被改壞。`16` 的逐條對照亦未做。
- [ ] **DAST 無 job** —— `AD-DAST-1`。M0 DoD 第 2 項因此只能部分關閉。
- [ ] **IaC 掃描無標的** —— infra team 建立全部 Azure 資源，本專案不寫 IaC。`AD-IaCEvidence-1`。
  ⛔ M0 收尾不得逕行打勾或標 N/A。
- [ ] **TLS/憑證/管理埠的部署期設定** —— 應用層標頭已做（§2.5），部署層未做（infra 尚未佈建）。
- [ ] **`apps/web` 無覆蓋率門檻** —— `page.tsx` 無元件測試。`AD-WebCoverage-1`。

---

## 5. Rollback / Fallback

- **若此設計後續證明錯**：
  - 範疇邊界（§2.1）—— revert `eslint.config.mjs` + `docs/rules-on-demand/scope-boundaries.md` 的矩陣；
    程式碼本身不需動（沒有任何 runtime 相依於 zone 定義）。估 ~1 hr
  - Runtime base（§1.2）—— 改兩個 Dockerfile 的最後一個 `FROM` + 刪 `.trivyignore.yaml`。估 ~1 hr
  - i18n L0（§2.4）—— **不建議回滾**：`i18n-glossary.md:29` 記錄 L0 是唯一有 deadline 的層，
    文案散落之後回收成本高一個數量級
- **估計回滾成本**: ~2 hr（不含 base image 重掃）
- **既有的 fallback 機制**: 無 —— 這是第一版骨架，沒有可退回的前一版
- **可證偽條件**:
  - 若 ADR-0004 的 spike 顯示 Prisma 無法在不 import `entity-scope` 的前提下取得範疇化 client，
    §2.1 的第二個 ❌ 就是錯的，矩陣要改（而不是繞過 lint）
  - 若 M1 建表後發現每個 module 都需要直接 import `core-model` 的具體型別，
    `modules` 互不 import 的假設仍成立，但 `packages/types` 的葉節點角色要重新檢視

---

## 6. References

- Phase plan: `docs/01-planning/W01-monorepo-scaffold/plan.md`
- Phase progress（每個發現的完整敘述）: `docs/01-planning/W01-monorepo-scaffold/progress.md`
- Phase retrospective: `docs/01-planning/W01-monorepo-scaffold/retrospective.md`
- Change record: `docs/03-implementation/changes/CH-011-w01-monorepo-scaffold.md`
- 範疇矩陣（單一來源）: `docs/rules-on-demand/scope-boundaries.md`
- 相關 ADR: `docs/14-adr/0001-backend-framework.md` ·
  `docs/14-adr/0010-single-region-deployment-topology.md` · `docs/14-adr/0011-compute-platform.md`
- 相關規則: `.claude/rules/verification-discipline.md` · `docs/rules-on-demand/spike-design-note-gate.md`

---

## Modification History

- 2026-08-08: Initial extract from Phase W01 closeout (Day 4)
