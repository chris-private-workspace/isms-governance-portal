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

## 🚧 尚未驗證（不可標為完成）

- **CI 未跑** —— 五個 guard 步驟與三個 security-scan job 是否真的從 skip 轉為執行，
  必須看 GitHub Actions 的實際輸出，本機全綠不算數
- **`docker build` 未跑**、**`docker compose up` 未跑**
- **Drive-through 未做** —— Day 3。目前一切為 **gate-only verified**
- 1.2 的 draft PR 未推（push 需使用者確認）

## Notes

- Day-0 的 ROI 又一次由**版本**這一類漂移貢獻 —— plan 是照 ADR 寫的，而 ADR 是三天前寫的。
  `day0-plan-verify.md` 的 Prong 2 把「plan 對現有事實的斷言」擴及外部 registry 是對的。
