# Phase W01 Progress — Monorepo scaffold

[Plan](./plan.md) · [Checklist](./checklist.md)

---

# Day 0 — 2026-08-08

## Today's Accomplishments

- Branch `feature/W01-monorepo-scaffold` 自 `main` `dc0c880` 建立
- 三-prong Day-0 verify 全部執行（Prong 1 · Prong 2 六個 D-item · Prong 2.5 N/A · Prong 3 N/A）

## Drift findings

| D-ID | Finding | Implication |
|------|---------|-------------|
| **D-boundaries-matrix** | `scope-boundaries.md` 仍有 **11 處**佔位符（`<範疇名>` / `<目錄>` / `<職責>` / `_contracts` 範例矩陣） | ✅ 如 plan §0 所述。填矩陣是 Day 1 第一項，非附帶 |
| **D-ciguard** | `ci.yml` 中 `! -f package.json` 共 **6 處** —— 5 個是真的 guard 步驟（`:114 :123 :130 :138 :146`），第 6 處在檔頭註解 `:16` | 計數與 plan §0 的「五個 guard 步驟」一致。無影響，記錄以免日後誤讀 grep 數字 |
| **D-scanjobs** | `security-scan.yml` 四個 job 名稱與 plan 一致（`:65 secret-scan` · `:132 dependency-scan` · `:184 static-analysis` · `:207 container-scan`） | 無漂移 |
| **D-envexample** | `.env.example` 確認**不存在**，而 `CLAUDE.md:344` 寫「複製 `.env.example` 到 `.env`」 | ✅ 如 plan §4 #3 所述，本 phase 新增 |
| **D-nest-prisma-ver** | ⚠️ **真實漂移** —— npm registry 現況：`@nestjs/core` **11.1.28**（ADR-0001 寫 **NestJS 10**）· `prisma` / `@prisma/client` **7.9.1**（ADR-0001 寫 Prisma 7 ✅ 相符）· `next` **16.3.0**（ADR-0001 §Context 的 estate 表記姊妹專案為 Next.js 15） | **→ plan §8 新增 R-8**。ADR-0001 的決定是**框架**不是版本，但 `CLAUDE.md` §Tech Stack 與 ADR 標題都字面寫著 NestJS 10。依 `CLAUDE.md` §禁止反模式「不默默替使用者選技術」，**已向使用者表面化，等回覆**。不改 ADR 內文（`14-adr/README.md` §取代舊 ADR 的流程）|
| **D-ports** | 3200 / 3210 / 5433 三個埠皆 **free**（`Get-NetTCPConnection -State Listen`） | 依 plan 使用，無需改號 |
| **D-toolchain** | Node **v22.21.0** · npm **10.9.4** · Docker **29.5.3** 皆就緒 | 無阻斷 |

## D-baselines（於 `main` `dc0c880`）

```
run_all                       6/6 passed
  rules-hygiene · doc-links · path-references · status-markers(4 pre-doc, E1-E4 clean)
  mockup-fidelity(SKIP) · workflow-placeholders(4 known unfilled)
CI "gates"                    SUCCESS（PR #17）
lint / type-check / test / build   ⚠️ SKIP —— 非 pass。骨架未建立，5 個步驟印 skip notice
security-scan                 secret-scan 真跑；其餘 3 個 job 無標的
coverage                      n/a（repo 內零行 TypeScript）
```

## Go / no-go

**GO** —— 範圍變動遠低於 20%。唯一實質發現 `D-nest-prisma-ver` 不改變任何交付物、
檔案清單或驗收判準，只影響 `package.json` 裡的一個版本號。已加為 plan §8 R-8。

## Remaining for Next Day

- Day 1.1 `scope-boundaries.md` 範疇表 + import 矩陣（**不依賴版本決定，可先做**）
- Day 1.2 起需要 `D-nest-prisma-ver` 的回覆才能定 `package.json`

---

# Day 1 — 2026-08-08

## Today's Accomplishments

- **1.1 完成** —— `scope-boundaries.md` §範疇定義（8 列）+ §範疇歸屬決策樹 + §import 矩陣（8×8）
  由模板佔位符填為本專案內容。順帶把 §共用型別 的 Python/`_contracts` 範例與 §常見違規表
  改成本專案的真實範疇名 —— 否則同一份文件會同時存在兩套範疇詞彙。
  - Verify: Grep `<範疇名>|<目錄>|<職責>|_contracts` → **0 命中**（DoD 要求）· run_all **6/6**
  - Diff: `68 33 docs/rules-on-demand/scope-boundaries.md`

### 矩陣裡三個需要說明的 ❌

| 決定 | 理由 |
|---|---|
| `audit-trail` **連 `core-model` 都不 import** | 稽核若依賴領域結構，每加一個實體就要改稽核程式。只認契約層的通用形狀，guardrail 5 的「無旁路」才不會隨領域演進破洞 |
| `core-model` 不能 import `entity-scope` | 下層不 import 上層。但 guardrail 4 要求每個存取都被 scope 包住 → 解法是 **DI 注入而非 import**：範疇化的 Prisma client 由 `entity-scope` 提供，型別住契約層，`core-model` 拿不到未範疇化的 client |
| `modules/` 之間互不 import | 兩個模組要協作就下沉到共用範疇或走契約層，否則 Policy 與 Risk 會長成一團 |

⚠️ 第二列**是設計意圖，尚未跑過** —— 已在該檔明確標示，由 ADR-0004 的 spike 驗證。
它同時是 ADR-0001 §可證偽條件 #1 的承重假設。

## ⭐ 最重要的發現 —— boundaries 設定曾經是一個完美的 Potemkin

`eslint.config.mjs` 有一段時間**語法正確、外掛載入、lint 全綠、而且什麼都沒擋**。
一個刻意寫下的違規 import（`audit-trail → core-model`）連續 **6 次**被判定為合法：

| # | 症狀 | 真因 |
|---|---|---|
| 1 | 零錯誤 | `mode: 'full'` 已於 v7 廢棄 |
| 2 | 零錯誤 | 規則已改名 `element-types` → `dependencies`，舊名靜默無作用 |
| 3 | 零錯誤 | `rules` 已改名 `policies`，且選擇器改為物件式 |
| 4 | 零錯誤 | external 依賴的選擇器形狀錯誤（`dependency.type` 應為 `module.origin`）|
| 5 | 零錯誤 | **`settings` 掛在有 `files` 的設定區塊上** —— CI 用 `-w apps/api` 執行時 cwd 是 workspace，該區塊不匹配，`boundaries/elements` 因此是空的 |
| 6 | 零錯誤 | **缺 `eslint-import-resolver-typescript`** —— 無副檔名的 import 解析不到檔案，每個依賴都是 unknown |

第 5、6 兩項最惡劣：`boundaries/no-unknown-files` **通過**（檔案分類正確），
只有 `boundaries/no-unknown` 會紅（依賴分類失敗）。也就是說**部分診斷指標是綠的**。

最終證據（US-2 的唯一有效證明）：

```
apps/api/src/audit-trail/__boundary-probe.ts
  3:31  error  There is no policy allowing dependencies from elements of type
               "audit-trail" to elements of type "core-model"  boundaries/dependencies
✖ 1 problem (1 error, 0 warnings)        EXIT=1
```

移除探針後 EXIT=0。**這正是 `verification-discipline.md` 說的：靜態檢查抓不到
「有 handler 但 handler 是空的」。** 若沒有這個負面測試，W01 會交出一個號稱
機械強制範疇邊界、實際上零強制力的設定，而且往後每個 phase 的 gate 都會是綠的。

## 其他環境層發現

| 發現 | 處置 |
|---|---|
| **公司 proxy MITM TLS** —— `prisma generate` 下載引擎時 `self-signed certificate in certificate chain` | 用 `NODE_OPTIONS=--use-system-ca`（Node 22 內建，信任 Windows 憑證存放區）。**絕不用 `NODE_TLS_REJECT_UNAUTHORIZED=0`** —— 那是關掉驗證，不是解決問題。與 ADR-0011 §Consequences 記錄的姊妹專案 proxy 問題同源 |
| **`npm install` 首次就報 2 個 high** —— `@nestjs/swagger@11.4.6` 依賴 `js-yaml@5.2.1`（GHSA-pm4m-ph32-ghv5，DoS） | 加 scoped `overrides` 釘 `js-yaml@5.2.3`，**不降 swagger 版本**。重建 lockfile 後 `found 0 vulnerabilities`。⭐ 這是 `AD-SecScan-1` 講的那個盲區的第一個實證：骨架之前這個漏洞存在但無人看得見 |
| **TypeScript 7 裝不起來** | 硬性 peer：`typescript-eslint` 要求 `<6.1.0`、`ts-jest` 要求 `<7`。取 **6.0.3**。這不是偏好，是相容性 |
| **Prisma 7 移除 datasource `url`**（P1012） | 新增 `apps/api/prisma.config.ts`；連線字串給 CLI，執行期走 driver adapter。**副產品是好事**：M2 起應用程式角色與 migration 角色本來就該分開，否則應用程式以 owner 連線會直接繞過 RLS |
| **Prisma 7 不再自動載入 `.env`** | `prisma.config.ts` 與 `app.module.ts` 都明確解析 monorepo 根的 `.env`（cwd 可能是 root 或 workspace）|
| **Next 16 `outputFileTracingRoot`** —— `URL.pathname` 在 Windows 產生 `/C:/…`，Rust 端 canonicalize 失敗 (os error 123) | 改用 `fileURLToPath` |
| **prettier 找不到根 `.prettierignore`** —— 從 workspace 執行時只找 cwd | 兩個 workspace 的 `format:check` 加 `--ignore-path ../../.prettierignore` |

## 📌 Plan deviation（依 R3 記錄）

**plan §3.3 寫「只有一份字典」，實作交出 `zh-Hant` + `en` 兩份。** 理由：

1. 以一份字典而言，**plan §5 的第 5 項與第 7 項都無法誠實滿足** ——
   「切語言真的換字」沒有第二種語言可切；「key 一致性測試」在單一字典上斷言不了任何事。
   換句話說 plan 本身寫了兩條無法驗證的驗收條件。
2. 英文**不在** `AD-DesignAlign-2` 的爭議範圍內 —— `07:20` 已把 English 列入語言集，
   未定的是 ja / ko / SEA 與日本的地位。
3. 成本近乎為零，且 `i18n-glossary.md:65` 的機器守門因此變成真的守門。

zh-Hant 仍是預設（guardrail 9）。**不建第三份字典。**

## Gate 實際輸出（本機）

```
npm run format:check -w apps/api -w apps/web   All matched files use Prettier code style!
npm run lint       -w apps/api -w apps/web     EXIT=0（且已用負面測試證明會擋）
npm run type-check -w apps/api -w apps/web     EXIT=0
npm run test       -w apps/api -w apps/web     api 3 passed · web 8 passed
npm run build      -w apps/api -w apps/web     api ✓ · web ✓ Compiled successfully in 45s
python scripts/lint/run_all.py                 6/6 passed
npm audit                                      found 0 vulnerabilities
```

## ⭐⭐ CI 首航的兩個發現（draft PR #18 —— R-1 緩解措施奏效）

### 發現 A —— 我自己犯了「截尾輸出吞掉失敗」

CI 的 `Architecture lints` 紅，本機我卻回報 6/6。真相：我用 `Select-Object -Last 3`
看輸出，而 `run_all: 5/6 passed` 與 `[FAIL] path-references` 兩行**就在被截掉的位置**。
本機一直是紅的，我沒看到。

失敗內容：`scope-boundaries.md` §共用型別的六個**假設性示例路徑**（`risk.ts` 等，M1 才會有）
被判為 stale。已改寫為以範疇名表達的表格，不再出現不存在的路徑，也不需要 6 個 pragma。

> 這正是 `tool-discipline.md` 的兩個真實代價之一，也是 `verification-discipline.md`
> §證據層變體的「撞上限當搜完」。**往後檢視 gate 一律 grep `run_all:|\[FAIL\]`，不用 tail。**

### 發現 B ⭐⭐ —— `security-scan` 四個 job 全部 success，而其中三個什麼都沒掃

手動 `workflow_dispatch` 觸發（`pull_request:` 觸發在 `security-scan.yml:50` **是被註解掉的**，
所以 PR 本身根本不會跑它）。四個 job 全綠，逐一查 log 後：

| Job | 結果 | 真正發生的事 |
|---|---|---|
| `secret-scan` gitleaks | ✅ **真的掃了** | 全歷史，無命中 |
| `dependency-scan` SCA | 🟥 **綠但空轉** | `SCA_CMD` 仍是 `<…>` 佔位符 → 印提示、exit 0 |
| `static-analysis` SAST | 🟥 **綠但空轉** | `SAST_CMD` 同上 |
| `container-scan` trivy | 🟥 **綠但空轉** | 探測邏輯是 `for f in ./Dockerfile ./*/Dockerfile`，**只認檔名恰為 `Dockerfile`**。本 phase 交出的是 `docker/api.Dockerfile` / `docker/web.Dockerfile` → `have_dockerfile=0` → trivy 沒安裝 → 後續步驟印「略過」 |

**三個各自不同的原因，產生同一種綠燈。**

⚠️ **plan §1(a) 與驗收條件 3 的前提因此被推翻**：骨架落地**不會**讓這三個 job 自動變成真的掃描。
`package.json` 只解除了「沒有東西可掃」，還要 (a) 填 `SCA_CMD` / `SAST_CMD`，
(b) 讓 trivy 找得到 Dockerfile。兩者都是**改 CI**，依 Developer Preferences 須先問。

`check_workflow_placeholders.py` 報的「4 known unfilled」正是這幾個 —— repo 早就知道，
但那個偵測器只保證「沒有**新增**未填項」，不保證已知的會被填。

### 發現 C —— `ci.yml` 缺 Node 安裝，五個 guard 步驟醒來即撞牆

第二次 CI（`7ab19d2`）：`Architecture lints` / `actionlint` / detector tests 全過，
**`Format check` 首次真的執行** —— 然後 `sh: 1: prettier: not found`（exit 127）。

`ci.yml` 有 `actions/setup-python@v5`，但**沒有 `actions/setup-node`，也沒有 `npm ci`**。
五個 guarded 步驟的存在性 guard 只檢查 `package.json` 在不在，沒有人負責裝相依。
骨架之前這永遠不會暴露，因為那五步從來沒跑過。

→ 這是 `ci.yml` 的既存缺口，**不是本 phase 引入的**，但被本 phase 揭露。
修它是改 CI，須先問。**在它修好之前，Lint / Type check / Tests / Build 四步都是 skipped，
不是 pass** —— PR #18 的 CI 仍然是紅的，且應該保持紅。

## ✅ 四項 CI 修正的結果（`6431b43`）—— gate 從此不再是假綠

| Workflow | 結果 | 證據 |
|---|---|---|
| **CI** | ✅ **success** | 五個 Node 步驟**首次全部真的執行**：Install / Format check / Lint / Type check / Tests / Build 全 success，無一 skipped |
| `secret-scan` | ✅ success | 全歷史 gitleaks，無命中 |
| `dependency-scan` SCA | ✅ **success（真掃）** | `npm audit --audit-level=low` |
| `static-analysis` SAST | ✅ **success（真掃）** | semgrep：`Ran 462 rules on 47 files: 0 findings` |
| `container-scan` trivy | 🔴 **failure（真掃，且找到東西）** | 見下 |

⭐ SAST 的兩次數字對比說明了為什麼「掃到東西」不等於「掃對東西」：
第一次 `Scanning 312 files` / **19 blocking**，其中含
`docs/06-reference/design_handoff_*` 的 vendored JS bundle —— 那是外部交付物，
約束 6 規定逐字複製不得修改，**掃到了也不能改**。改為只掃 `apps packages scripts`
後是 `47 files / 0 findings`。**不可行動的 finding 會訓練人忽略整份報告。**

### 🔴 trivy 的真實發現 —— base image `node:22.21.0-bookworm-slim`

| 層 | 數量 | 例 |
|---|---|---|
| Debian OS | **11（HIGH 9 / CRITICAL 2）** | `gpgv` CVE-2025-68973（**已有修正版** 2.2.40-1.1+deb12u2）· `libgnutls30` CVE-2026-33845 CRITICAL |
| Node 映像內建的 npm 相依 | **34（HIGH 31 / CRITICAL 3）** | `tar` CVE-2026-59873 CRITICAL（gzip bomb DoS）· `brace-expansion` CVE-2026-13149 |

⚠️ 第二類**不是我們的相依** —— 是 Node 官方映像裡 npm 自帶的 `node_modules`。
`--ignore-unfixed` 已開啟，所以這 45 條**都有上游修正版可用**。

**這是 guardrail 1 的直球題**：一套安全平台不得自身成為風險來源。
處置方式是決策，不是修 bug，已列為 checklist 2.4 的新增項，**未勾選**。

## ⭐⭐⭐ 產出物驗證：build 綠、CI 綠、**而程式跑不起來**

決定改 distroless 之前先看了一眼 `dist`，結果撞到本 phase 最嚴重的一個：

```
dist/core-model/prisma.service.js   require("../generated/prisma")
dist/generated                      ← 不存在
```

Prisma client 是 `.js`，`tsc` 不會搬（api 沒開 `allowJs`）。**`npm run build` EXIT=0、
CI 全綠、測試全過，而產出的 artifact 一啟動就會炸。** 順帶發現
`health.service.spec.js` 被編進 production build。

修法：`nest-cli.json` 的 `assets` 把 `src/generated/**` 複製進 dist；
新增 `tsconfig.build.json` 排除 `*.spec.ts` 與 `generated/`。

### 然後真的把它開起來（backend drive-through）

```
docker compose up -d  →  isms-postgres-dev  Up (healthy)
node dist/bootstrap/main.js
  [Nest] LOG [NestApplication] Nest application successfully started
  [isms-api] listening on http://127.0.0.1:3210 (api-docs at /api-docs)

curl /health                     {"status":"up","db":"up"}
docker stop isms-postgres-dev →  {"status":"up","db":"down"}     ← 負面驗證通過
docker start（等 healthy）    →  {"status":"up","db":"up"}
```

**這證明 `/health` 不是硬編碼** —— AP-3 的判準在 runtime 成立，不只在測試裡。

### 標頭逐條實測，抓到一個

```
Content-Security-Policy · Strict-Transport-Security · X-Content-Type-Options
X-Frame-Options: DENY · Referrer-Policy · Cross-Origin-{Opener,Resource}-Policy   ✅
X-Powered-By: Express                                                            🔴 還在
```

helmet 的 `xPoweredBy: false` **沒有生效**。改在 adapter 層
`app.getHttpAdapter().getInstance().disable('x-powered-by')`，重測後消失。
版本揭露正是 `16` 那 45 條 findings 的來源類別之一 ——
**這是讀回應標頭抓到的，不是讀設定檔抓到的。**

## 🔴 容器 build 在本機無法驗證（環境限制，非程式問題）

改 distroless 後 `docker build` 撞到兩件事：

| 問題 | 性質 | 處置 |
|---|---|---|
| `bookworm-slim` 缺 OpenSSL → Prisma 抓錯引擎 | **真實缺陷，各環境皆然** | build stage 加 `openssl ca-certificates` |
| `self-signed certificate in certificate chain`（`binaries.prisma.sh`）| **本機環境限制** —— 公司 proxy 在**容器內**同樣 MITM TLS，容器沒有公司 CA | 不把 CA 塞進 repo 的 Dockerfile。GitHub runner 無此 proxy |

⚠️ **由此浮現一個真實缺口：目前沒有任何地方會 build 這兩個映像。**
CI 的 trivy job 依設計只掃 base image、不 build（`security-scan.yml:253` 明寫此取捨）。
所以 Dockerfile 的正確性到部署當天才會被驗證。**已列為待記錄的 AD。**

### trivy 範圍調整（放寬，明寫）

base image 取值由「所有 `FROM` 的 `sort -u`」改為「**最後一個 `FROM`**」——
即實際出貨的 runtime base。建置映像不會被部署，其 OS CVE 不在 production 攻擊面上，
而建置期供應鏈已由 SCA + lockfile 覆蓋。**這是放寬範圍，所以寫在該行旁邊，
不藏在 severity 門檻裡。**

## ✅ Day 2 收束：兩個 workflow 全綠，而且是**真的掃過**

```
CI            success   Install / Format / Lint / Type check / Tests / Build 全部執行
security-scan success   四個 job 全 success
  secret-scan  gitleaks 全歷史
  SCA          npm audit --audit-level=low
  SAST         semgrep：Ran 462 rules on 47 files: 0 findings
  trivy        找到 2 個 Dockerfile · Detected config files num=2
               豁免清單連同到期日逐條印在 log
```

⭐ **綠燈的證據不是「success」三個字**，是上面那幾個數字：
`num=2` 證明設定檔真的被解析（workflow 自己的註解說「那個數字才是真相」），
`47 files / 462 rules` 證明 SAST 掃的是我們的 code，
`找到 2 個 Dockerfile` 證明探測不再是空轉。

### distroless 的成效與代價

| | 前 | 後 |
|---|---|---|
| runtime base HIGH/CRITICAL | **45**（Debian 11 + npm 自帶 34）| **6**（全部在 `libssl3`）|

剩餘 6 條以 `.trivyignore.yaml` 逐條豁免至 **2026-09-07**，用 trivy 原生的
`expired_at` —— **到期會自己變紅，不需要有人記得**。CVE-2026-31789 那條另記了
CVSS 沒說的事：溢位需要 32 位元系統，而 ADR-0011 把我們放在 amd64 Container Apps。
**是有理由的延後，不是忽略。** 門檻沒有調高（調高會連還沒出現的一起放過）。

## 🚧 尚未驗證（不可標為完成）

- **CI 未跑** —— 五個 guard 步驟與三個 security-scan job 是否真的從 skip 轉為執行，
  必須看 GitHub Actions 的實際輸出，本機全綠不算數
- **`docker build` 未跑**、**`docker compose up` 未跑**
- **Drive-through 未做** —— Day 3。目前一切為 **gate-only verified**
- 1.2 的 draft PR 未推（push 需使用者確認）

## Notes

- Day-0 的 ROI 又一次由**版本**這一類漂移貢獻 —— plan 是照 ADR 寫的，而 ADR 是三天前寫的。
  `day0-plan-verify.md` 的 Prong 2 把「plan 對現有事實的斷言」擴及外部 registry 是對的。

---

# Day 3 — 2026-08-08

## Today's Accomplishments

- 3.1 clean restart（整個 stack）· 3.2 前端 drive-through（六張截圖）· 3.3 兩個負面測試
- 修掉 drive-through 挖出的 **D3-1**（`npm run start` 指向不存在的檔）
- **Day 2 的「🚧 尚未驗證」清單，除 `docker build` 外全部關閉**

## 3.1 Clean restart —— Risk Class C 的教科書案例

殺進程之前先做歸屬判斷（`local-runtime-ops.md` §4），結果比預期有價值：

| 進程 | 判定 | 依據 |
|---|---|---|
| `node dist/bootstrap/main.js` PID 52084 | **陳舊，殺** | 啟動 18:03:02，而 `dist/bootstrap/main.js` 的 mtime 是 **18:14:54** |
| `@playwright/mcp` × 2 · `statusline.mjs` | **留** | 不是本專案的服務 |
| `ekp-postgres` · `ekp-langfuse` 等容器 | **留** | 別的專案 |
| `com.docker.backend.exe`（5433 的 owner）| **不是殘留** | 那是 docker 的埠代理，真正的服務在容器裡 |

⭐ **跑著的 API 比它自己的建置產物舊了 11 分 52 秒。** 若直接對它 drive-through，
驗到的是 Day 2 中段的程式碼 —— 而畫面不會有任何地方告訴你這件事。
`task-workflow.md` Risk Class C 說的「陳舊 dev server 掩蓋 wiring 修正」就是這個，
而**這次它是靠 mtime 比對抓到的，不是靠 port 擁有者 PID**。

三個服務的 startup log（DoD 要求的佐證）：

```
postgres  2026-08-08 11:27:23.660 UTC [1] LOG:  database system is ready to accept connections
          （PostgreSQL 18.4 · "database directory appears to contain a database; Skipping initialization"
            —— volume 存活過 down/up，資料沒被清掉）
api       [Nest] 45772  19:28:15  [NestApplication] Nest application successfully started
          [isms-api] listening on http://127.0.0.1:3210 (api-docs at /api-docs)
web       ▲ Next.js 16.3.0 (Turbopack) · Local: http://localhost:3200 · ✓ Ready in 1093ms
```

## 3.2 Drive-through —— observed vs intended

**這是本 phase 第一次有人真的開車。** 六張截圖在 `artifacts/`。

| # | 預期 | 實際觀察 | 判定 |
|---|---|---|---|
| 1 | 預設 zh-Hant 渲染 | `APAC ISMS 治理平台` / `11 個管轄區的 13 家 OpCo` / `此頁為 W01 骨架驗證頁，非產品畫面。` | ✅ 數字是修正後的 13/11；且**誠實標示非產品畫面** |
| 2 | 切 en **真的換字** | 每一條都換，**包含 `aria-label`**（`combobox "顯示語言"` → `combobox "Language"`）| ✅ 不是重繪同一份字典 |
| 3 | `db` 來自 API 而非常數 | 停 PostgreSQL → 點重新檢查 → `資料庫: 無法連線`，而 `API 服務` 仍 `正常` | ✅ 兩個值**獨立**變動，不是同一個旗標 |
| 4 | 恢復後翻回 | 起 PostgreSQL → `資料庫: 正常` | ✅ 不是黏住的 |
| 5 | API 掛掉的分支 | 殺 API → `role="alert"`：`無法取得狀態，請確認 API 服務是否啟動。` | ✅ **整個狀態列表被換掉**，不是留著上一次的「正常」 |

第 5 項是額外做的，checklist 沒要求。理由：留著 stale 的「正常」是**畫面在說謊**，
比顯示錯誤更糟，而這個分支在 curl 層永遠驗不到。

語言切換時 down 狀態**被保留**（沒有重新 fetch）—— 正確：切語言是換字典，不是換世界。
語言選項本身維持 endonym（「繁體中文」/「English」）是 i18n 慣例，不是漏譯。

### D3-1 ⭐ 第 5 次「綠燈但跑不起來」

`apps/api/package.json` 的 `start` 是 `node dist/main.js`，但 `nest-cli.json` 的
`entryFile` 是 `bootstrap/main` → 產出在 `dist/bootstrap/main.js`。
**`npm run start -w apps/api` 從第一天起就是壞的。**

沒有任何 gate 會碰到它：`build` 用 `nest build`、drive-through 我用的是
`node dist/bootstrap/main.js`（Day 2 為了繞開 Day 2 的另一個產出物 bug 而直接寫的路徑）。
修正後驗證：Nest 一路啟動到 `successfully started`，只因 3210 被佔而 `EADDRINUSE`
—— **修正前會是 `Cannot find module`，現在是埠衝突，代表路徑已經對了**。

> 同一個形狀本 phase 累計 **5 次**（boundaries 設定 / 三個掃描 job / build 產出物 /
> `X-Powered-By` / 本項）。依 `.claude/rules/README.md` 的強度階梯 ≥3 次要**結構性解法**，
> 留給 retrospective Q5。

### D3-2 `next dev` 會自己寫 `AGENTS.md` 與 `CLAUDE.md` 進 repo

Next 16 的 `generate-agent-files.js` 在 `apps/web/` 生成了 `AGENTS.md`（678 B）
與 `CLAUDE.md`（一行 `@AGENTS.md`），並在檔案裡明說「移除只會再生成一次」。
**根目錄的 `CLAUDE.md` 未被動**（28972 B / 15:46 原樣）—— 這是第一件確認的事。

本專案對 always-loaded context 有機械式 byte 預算（`check_rules_hygiene.py`），
而框架自己往 repo 塞一份 agent 指令檔，是**沒有人決定過的新 always-loaded 面**。
兩個做法都成立（commit 掉 / `agentRules: false` 關掉）→ **待使用者決定，不默默選**。

### D3-3 favicon 404

每次載入 console 都有一條 `GET /favicon.ico 404`。**刻意不修**：補 icon 等於在骨架
階段自行發明品牌視覺，違反約束 6。留給設計交付物 port 的那個 phase 一併處理。
記在這裡是為了下次看到 console 錯誤時知道它已被判讀過 —— 未被判讀的雜訊會訓練人忽略 console。

## 3.3 負面測試 —— 規則要能真的擋，才叫規則

**邊界**（US-2 唯一有效的證明）：在 `audit-trail/` 放一個 import `core-model` 的檔案：

```
apps/api/src/audit-trail/TEMP-boundary-violation.ts
  4:31  error  There is no policy allowing dependencies from elements of type
               "audit-trail" to elements of type "core-model"   boundaries/dependencies
✖ 1 problem (1 error, 0 warnings)          EXIT=1
```

刪檔後 `EXIT=0`。錯誤訊息**指名了兩個範疇與規則名** —— Day 1 那個「設定有效、lint 全綠、
零強制力」的版本不會印出這一行。

**i18n**：從 `en.json` 刪掉 `health.state.down`：

```
× en carries exactly the reference key set
AssertionError: expected [ …(13) ] to deeply equal [ …(14) ]
-   "health.state.down",
Tests  1 failed | 7 passed (8)             EXIT=1
```

還原後 `8 passed (8)`。⭐ 值得記：**型別檢查抓不到這個** —— `TranslationKey` 是從
`zh-Hant` 推導的，`en` 的型別是 `Record<string, string>`。parity 測試是唯一的閂門，
這正是 `i18n-glossary.md:65` 說它是「整份規則裡唯一有強制力的部分」的原因。

### D3-4 ⭐⭐ 覆蓋率門檻從來沒有被執行過 —— 第 6 次「綠燈但什麼都沒查」

要勾 checklist `2.x` 的「新 code 覆蓋率 ≥ 80%」時才第一次跑 `test:cov`：

```
statements 45% · branches 21.42% · lines 43.75% · functions 28.57%   ← 全部低於 80
health.controller.ts  0% ·  health.module.ts  0%
```

**`ci.yml:163` 跑的是 `npm run test`，不是 `test:cov`。** 約束 5 的 80% 門檻寫在
`jest.config.js` 裡、寫在 CLAUDE.md 裡，而**沒有任何地方會執行它**。

補了兩個測試檔（皆為真的能失敗的測試，不是為了衝數字）：

| 檔案 | 測什麼 | 為什麼不是同義反覆 |
|---|---|---|
| `health/health.controller.spec.ts` | 用**真的 `HealthModule`** 編譯，只換掉 `PrismaService` | controller 若呼叫 service 後自己回一個樂觀的 payload，只驗 happy path 的測試會全過，而 drive-through 只有在資料庫剛好掛掉時才抓得到 |
| `core-model/prisma.service.spec.ts` | `DATABASE_URL` 缺席時**在建構時 throw** | 那個守衛存在的唯一理由就是「不要讓設定錯誤變成間歇性的 runtime 錯誤」—— 而這只在有人檢查時才成立 |

結果：**statements / functions / lines 各 100%**；branches **78.57%**，差 1.43。

剩下的分支是什麼，用 lcov 查證過而非推測（`BRDA:31,0,1,0` / `BRDA:25,0,1,0`）：

> 全部落在 **decorator metadata 的 emit 產物**上 ——
> `typeof PrismaService !== "undefined" ? PrismaService : Object` 的 `Object` 那一支。
> 它只在型別於裝飾時為 undefined 才會執行，**任何測試都到不了**。

也就是說 babel provider 下這個門檻**寫再多正確的測試都不可能達成**。
一個永遠達不到的 gate，教會每個人忽略 `test:cov` —— 跟 semgrep 掃到設計交付物是同一個病。

試過 `coverageProvider: 'v8'`：總計剛好 **80.00%**、EXIT=0，但 controller 反而變 60%，
**再加一個帶裝飾器的方法就會掉下去**。那是算術上的巧合，不是更好的量測 → **已還原，不採用**。

→ 三個做法都成立，且其中一個要改 CI → **待使用者決定**（見 checklist 2.x）。

## Gate 實際輸出（Day 3 收尾，本機）

```
lint -w apps/api        EXIT=0（違規檔已刪）
test -w apps/web        Test Files 1 passed (1) · Tests 8 passed (8) · EXIT=0
build -w apps/api       EXIT=0 · dist/generated/prisma 已隨 assets 複製（client.js 等在位）
health（真 DB）          {"status":"up","db":"up"} → 停 DB → {"status":"up","db":"down"} → 起 DB → up
標頭（真 runtime）       CSP / HSTS / X-Frame-Options: DENY / Referrer-Policy: no-referrer
                        X-Content-Type-Options: nosniff · **X-Powered-By 不存在**
                        CORS: Access-Control-Allow-Origin: http://localhost:3200（非萬用字元）
```

## 使用者拍板的兩個決定（Day 3 尾）

**D3-2 → 關掉 `agentRules`。** `next.config.ts` 加 `agentRules: false`，刪掉兩個生成檔。
判準是「**未經 review 的內容不該自己進 repo**」：那份 `CLAUDE.md` 會被 Claude Code 當
project memory 載入，屬於 always-loaded 面，而本專案對這個面有機械式 byte 預算
（`check_rules_hygiene.py`）—— 一份會隨 Next 升版自己改寫的指令檔正好在預算之外。
它要警告的事（Next 16 與訓練資料不同）是真的，所以寫進我們自己的檔案，不靠它。

⭐ **驗證方式**：改完設定後**殺掉 dev server 重跑** —— 生成通知從 log 消失、
兩個檔沒有回來。設定改了不等於生效，這是同一條紀律的第 N 次應用。

**D3-4 → `test:cov` 接進 CI，`branches` 80 → 70 並記錄理由。**

| 改動 | 內容 |
|---|---|
| `ci.yml` Tests 步驟 | `npm run test -w apps/api` → **`npm run test:cov -w apps/api`** |
| `jest.config.js` | `branches: 70`，並在區塊註解寫明 lcov 佐證、否決 v8 的理由、再收緊條件 |
| `apps/web` | **維持 `npm run test`** —— vitest 要另裝 `@vitest/coverage-v8`，且 `page.tsx` 無元件測試，今天開啟只會逼出一個「低到能過」的門檻 → `AD-WebCoverage-1` |

**重點不是那 10 個百分點，是那個 gate 過去沒有牙齒** —— 45% 一路綠到 Day 3。
降門檻與不執行門檻，後者嚴重得多。`AD-CovThreshold-1` 記錄了再收緊的條件。

## Remaining for Next Day

- Day 4 closeout 全部（8 項）
- `2.3` 的標頭斷言測試仍 🚧 —— **本次是手動實測，不是自動化斷言**，兩者不可互相替代
- `2.3` Dockerfile 仍 🚧（`AD-ImageBuild-1`）· `docker build` 本機仍無法完成
