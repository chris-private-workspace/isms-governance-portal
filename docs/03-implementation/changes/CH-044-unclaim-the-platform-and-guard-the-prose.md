# CH-044: 平台停止宣稱它沒有的認證，policies 列表接上 API，fixture 文案有了機械承載

**Date**: 2026-08-20
**Phase**: W24
**Scope**: `ui`（`/login` · shell · `/policies` 列表 · fetch 層）· `core-model`（dev seed）· 治理工具（`scripts/lint`）
**Components**: —
**PR**: PR-pending —— push 是 outward-facing，待使用者確認

---

## Problem

三件事，同一個形狀。

1. ⛔ **平台對自己宣稱兩項它沒有的認證**。`/login` 的 `auth.claim1` = `SOC 2 Type II certified`、
   `claim3` = `ISO/IEC 27001 certified`；shell 的 `env.meta` = `v2.4 · SOC 2 Type II`，
   渲染在 **25 個畫面**上。三者**都已隨 W21 上了公開 URL**。
   違反 guardrail 1（平台本身不得成為風險來源）與 guardrail 2（Entity Zero）。
2. **`/policies` 整頁讀 fixture**。W19 的文案在畫面接上真資料的那一刻變成偽造治理證物 ——
   W22 已在 `risks/[id]` 量到一次（簽核鏈 + 6 筆帶 SHA-256 hash 的稽核軌跡，全是字串）。
3. **`AD-FixtureProseBecomesForgedEvidence-1` 當時只有「記得檢查」**，沒有任何機械承載。

盤點量到的存量：**27 個畫面、約 180 條**對「某一筆記錄」做出的治理陳述
（`docs/09-analysis/fixture-prose-inventory-20260819.md`；⚠️ 總數是約數，逐頁小節才是可用單位）。

---

## Root Cause

⭐ **不是「還沒做」。**

`auth.claim1/claim3` 與 `shell.env.meta` 是 W19 從設計交付物**逐字 port** 進來的行銷文案
（約束 6 要求視覺原封不動，文案跟著一起過來）。**在整頁都是樣本時它們無害** ——
沒有讀者會把樣本畫面的徽章當成認證。

真正的洞是：**沒有任何機制會在「這一頁接上真資料」的那一刻，重新問一次那些文案是否還成立**。
狀態轉換發生在**畫面層**，而文案住在 **i18n / JSX**，兩者之間沒有連結。
W22 靠一個人開瀏覽器發現了它 —— 那不可重複。

同一形狀在本片又出現第三個實例，這次是本片自己造的：`policies/page.tsx:136-139` 把
`view`（篩選後）與 `underReview`（全集）算出來的兩個數字印在同一句話裡。

---

## Solution

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/web/src/i18n/auth.{en,zh-Hant}.json` | 修改 | `claim1` → `Built to ISO/IEC 27001 & 27017`；`claim3` → `Entity-scoped access, enforced in the database`。⭐ **`claim2` 不動** —— `Tamper-evident, append-only audit trail` 逐條驗證後**實測為真**（`audit-trail/chain.ts` + migration + 15 個模型） |
| `apps/web/src/i18n/{en,zh-Hant}.json` | 修改 | `shell.env.meta` → `Seeded data · not production`。刻意避開「示範」—— repo 已有兩種譯法，GLOSSARY 禁止自創第三種 |
| `apps/web/src/app/login/page.tsx` · `components/shell/AppShell.tsx` | 修改 | ⭐ **affordance 一併換掉**：`IconTick` stroke 與 shell 綠點 + 綠光暈 `var(--rag-g)` → `var(--rag-n)`。改 stroke 而非 markup 以保持 port 結構完整（約束 6） |
| `apps/web/src/lib/api/client.ts` | **新增** | 計畫外抽出。policies 是第二個呼叫者，複製 fetch/信封/錯誤型別就是 AP-2 |
| `apps/web/src/lib/api/policies.ts` | **新增** | 一個呼叫（非兩個 —— 詳情頁不接）。檔頭逐欄列出 4 個無來源欄位，註明是 `curl` 量的 |
| `apps/web/src/app/(app)/policies/page.tsx` | 修改 | 資料源 + loading/error/empty 三狀態 · 四欄標 `NoSource` · category 篩選器移除 · `DemoBadge` = `partial` · 列不可點 |
| `apps/api/prisma/seed.ts` | 修改 | 8 筆 policies 跨 SG1/HK1，六個 status 在可見列上全覆蓋，1 筆軟刪除。⛔ owner/createdBy/updatedBy **全 NULL** —— guardrail 7（此處發明一個人就是發明個資） |
| `scripts/lint/check_fixture_prose.py` + `tests/test_fixture_prose.py` + `.fixture-prose.json` | **新增** | 兩條規則，config-driven，29 個測試 + 9 個無條件 self-test。註冊進 `run_all`（**9 → 10**） |
| `apps/web/src/data/**`（8 檔） | 修改 | 13 個 `@record-claim` 標記，**13 insertions / 0 deletions**（值不動） |
| `apps/web/vitest.config.mts` | 修改 | `poolOptions` → `maxWorkers: 4`（Day-0 D1 診斷出的 vitest 根因）。**同機對照見下** |
| `docs/01-planning/_templates/phase/checklist.md.tpl` | 修改 | Day-2 加一格具名檢查項 —— 這是那條 AD 的解封條件原文 |

### ⭐ vitest 根因的同機對照（`AD-UndiagnosedWebTestFailure-1` 據此關閉）

| 情境 | 結果 |
|---|---|
| 修正**前** · `npm run test`（無旗標） | **`Test Files 1 (1)`** · exit **1** ⛔ |
| 修正**前** · 手動加 `--maxWorkers=4` | `Test Files 10 (10)` / 95 tests · exit **0** |
| 修正**後** · `npm run test`（無旗標，Day 1） | `Test Files 10 (10)` / 95 tests · exit **0**（`Duration 82.65s → 40.64s`） |
| 修正**後** · `npm run test`（無旗標，Day 4） | `Test Files 11 (11)` / **104 tests** · exit **0** |

⛔ 那條 AD 的危險處是 **`1 passed (1)` 讀起來像通過**。修正把「需要記得加旗標」變成預設行為。
⚠️ **量測本身也踩過一次**：第一次跑用 `| tail -20`，把 9 個 error 連同 exit code 一起吃掉，
Bash 回報 `code 0` 而 npm 實為 `code 1`（`AD-GrepAssertion-1` 家族）。之後一律寫檔再讀。

### 關鍵設計細節（拿掉就會壞）

- ⭐ **守衛錨定封閉集合，不枚舉文案關鍵字**。規則 1 判定「**已接 API 的表面** ×
  **標了 `@record-claim` 的 export** 出現在值位置」。W23 因為枚舉開放集合漏掉 44%。
- ⛔ **型別位置必須放行**。`ReturnType<typeof riskSignOff>` 是 W22 對 `/risks/[id]` 的**正確**
  中性化。若寫成「提到就報」，守衛會對唯一做對的那一頁天天開火，一個 phase 內就被關掉。
  每個放行**同時是一個洞**，所以各測兩面：型別形式靜默、值形式開火。
- **掃描面含 `components/shell/**`** —— 槓桿最高的一條不在任何 `page.tsx` 裡，
  且 Day-0 獨立確認 `AppShell.tsx:247` 自己就在呼叫 `fetch()`。
- **規則 2 是刻意的開放集合例外**，檔頭明寫射程限制。`SOC 2` 不可當 pattern ——
  repo 有 15 處合法的框架條款參照，那是產品在工作。
- ⭐ **守衛第一次真實執行抓到的是它自己的缺陷**：它報的 2 個違規都是**說明該宣稱為何剛被移除**
  的註解。一條分不出「平台通過 SOC 2」與「我們刪掉了那句話」的規則，會讓**正確的修法無法被記錄**。
  ⇒ `strip_comments()`，且 claim 查 stripped body、allowlist 查原始 source（測試抓到的）。

---

## Verification

**Gate**: lint **0** · format **clean ×2** · type **0** · api test **484 / 40 suites** ·
api int **269 / 21** · web **`Test Files 11` / 104 tests**（baseline 95 → **+9**）·
build clean · `run_all` **10/10**（9 → 10）

**新增測試**: `scripts/lint/tests/test_fixture_prose.py`（29 tests，unittest + importlib）·
`apps/web/src/app/(app)/policies/policies.test.tsx`（9 tests）

⛔ **負面驗證是驗收不是附加**（`AD-GateGreenDecaysAfterFix-1`：`run_all` 全綠不是證據）。
四次中性化，**每次的預測寫在執行之前，四次全中**：規則 1 把 record-claim export 放回值位置
⇒ 指定測試轉紅並指名該 export 與該檔；規則 2 把 `"SOC 2 Type II"` 放回 shell ⇒ 轉紅並指名。

### ⭐ Drive-through 抓到而所有 gate 都沒抓到的

真瀏覽器（Playwright MCP）+ 真 API + 真 DB。**證據**（三張，`W24-policies-read-path-and-prose-guard/artifacts/`）：
`day3-01-login.png` · `day3-02-policies-list.png` · `day3-03-policies-api-down.png`

| 抓到的 | gate 為什麼看不見 |
|---|---|
| ⛔ **meta 行的兩個數字用不同母體** —— Published 篩選下印出「1 policies · 1 under review」而畫面上 0 筆 | `policies.test.tsx` 的 shell mock 把 `trf` 的插值變數丟掉（`void vars`），meta 行在測試裡永遠是**未插值的模板字串** ⇒ 那行的任何數字錯誤**結構上不可觀測**。**AP-6**，不是覆蓋率問題 |

其餘逐項 PASS：`/login` 零認證宣稱且三個勾 computed stroke 全 `rgb(124,135,148)` = `--rag-n`
（`--rag-g` `#1e8a5c` 一次未出現）· `/policies` **8 列 == API 8 筆**、六 status 全覆蓋、
軟刪除的 `900004` 不在其中、32 個 `data-no-source`、fixture 零洩漏 ·
scope selector 切到 `Ricoh Hong Kong Ltd` **8 列一列未動**（頁面註記「只改 label」為真）·
**真的 kill 掉 API 5 個 PID**（非 mock 斷線）⇒ `data-source-state="error"` + 零 fixture ·
shell 迴歸 `/controls` + `/isms-profiles`（**shell chrome 內 0 個 RAG 綠元素**）

**Verdict**: ✅ PASS

---

## Impact

- **Breaking change**: no
- **Migration**: no（`Policy` 表 W07 已存在；本片只加 seed 列）
- **Config**: 無新增環境變數。`.fixture-prose.json` 是新的 lint config，隨 repo 走
- **重啟需求**: 無 startup-only wiring 變更
- **Rollback**: `git revert` 四個 commit；seed 的 8 筆用固定 id upsert，重跑舊 seed 即回舊狀態

⚠️ **兩個射程限制，明寫於此以免被當成全覆蓋**：
1. **規則 2 是開放集合，會漏。** 它只認 `.fixture-prose.json` 裡列出的宣稱字串。
2. **未標記的新 export 對規則 1 不可見。** 守衛量的是「有沒有人繞過機制」，不是「文案對不對」。
   ⛔ 它**看不見硬編碼在 i18n / JSX 裡的陳述** —— 那一半由 checklist 模板的具名檢查項承接。

⚠️ **US-1 是有記錄的設計偏離**（W19 先例）：改了設計交付物的文案與 `IconTick` 的 stroke 色。
依 `15-design-alignment.md`，領域邏輯以程序為準不以 mockup 為準 —— 而「平台是否通過 SOC 2」
是事實問題，不是設計問題。

---

## 相關

- **關掉的待辦**: `AD-FixtureProseBecomesForgedEvidence-1`（機械層）· `AD-UndiagnosedWebTestFailure-1`（根因已修 + 兩種負載各驗一次）
- **同類前例**: `CH-042`（W22 risks 垂直切片 —— 本片是 slice 2/N，藍本逐項複用）
- **產生的待辦** → `docs/01-planning/BACKLOG.md`
