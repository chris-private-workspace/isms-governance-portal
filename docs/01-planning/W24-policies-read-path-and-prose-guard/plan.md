---
status: active   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W24 Plan — Unclaim the platform, wire policies, guard the prose

**Summary**: 四件事，依此順序。**(1)** 拿掉平台對**自己**的偽造認證宣稱 —— `/login` 的三條
claim 與 shell 的 `"v2.4 · SOC 2 Type II"`（**25 個畫面**，且已隨 W21 上了公開 URL）。
**(2)** 把 `/policies` **列表頁**從 fixture 接上真 API。**(3)** 為
`AD-FixtureProseBecomesForgedEvidence-1` 建立**機械承載**，錨定兩個**封閉集合**
（已接 API 的表面 **+ shell** × 標記過的 record-claim export），**不枚舉文案關鍵字**
（開放集合，W23 因此漏掉 44%）。**(4)** 修掉 Day-0 診斷出的 vitest 根因（`AD-UndiagnosedWebTestFailure-1`）。
其餘 25 頁的存量文案**不動、只盤點**（使用者 2026-08-19 裁決）。
⛔ **`/policies/[id]` 本片不接**（Day-0 D3 + 使用者裁決）—— 它接完 API 只剩 **3** 個真欄位
（對照 W22 的 `risks/[id]` 留下 9 個），10 個區塊裡 9 個無來源。那不是誠實的代價，
是**後端還沒有這一頁需要的東西**。
User-facing ⇒ **drive-through MANDATORY**（兩個表面：`/login` · `/policies`，外加 shell 迴歸抽查）。
非 spike ⇒ 不產 design note。

**Status**: Approved-to-execute（使用者 2026-08-19 核可）。範圍由使用者五次裁決收斂：
「接 /policies + 守衛」·「27 頁存量不動只盤點」·「`/login` + shell 納入且**排在 policies 之前**」·
「盤點缺口全部補掃」·**Day-0 後**：「vitest 根因修（一行）」·「**只接列表頁**」。

**Branch**: `feature/W24-policies-prose-guard`
**Base**: `main` HEAD `5e517c5`（W23 post-merge —— E5 landed gate 抓到自己的 closeout）
**Slice**: 關掉 `AD-FixtureProseBecomesForgedEvidence-1` 的**機械層** + 一條**同形但不同類**的新發現
（宣稱對象是平台自己，非某筆記錄）· vertical slice 2/N（W22 risks 是 slice 1）
**Scope decisions**: (a) 平台自宣稱**先修** —— 它已公開部署且屬 guardrail 1/2 ·
(b) 標的是 `/policies` **列表頁**（Day-0 D3：詳情頁的後端未備）·
(c) 25 頁存量**不改 code**，產出清單 · (d) 守衛判定「值位置使用 record-claim export」而非「文案含某些字」·
(e) 守衛的掃描面**含 shell 元件** —— 槓桿最高的一條不在任何 `page.tsx` 裡，
且 Day-0 D-fetch-direct 獨立確認 `AppShell.tsx:247` 自己就在呼叫 `fetch()` ·
(f) dev seed 今天**零筆 policy**，必須擴充否則列表接上是空的 ·
(g) **vitest 根因當片修**（Day-0 D1）—— 它阻塞本片的 gate 斷言，且是一行

---

## 0. Background

### The gap（`AD-FixtureProseBecomesForgedEvidence-1` 🟡 P1 + 一條盤點時浮出的新發現）

**已登記的那一半**：

- W19 交付 30 個畫面、全部餵 fixture，其中包含**治理語彙**：具名簽核人與日期、帶 SHA-256 hash
  的稽核軌跡、`append-only` / `Tamper-evident` / `Record locked` 的完整性宣稱。
- W22 接上真 API 後，drive-through 發現那些文案正**為一筆真實風險簽名**。處置是**手工的** ——
  三個區域性空陣列 + 15 行說明註解，只在那一頁。
- 盤點量到存量是 **156 條 / 27 頁**（5 頁為 0）。`/policies/[id]` **13 條**，全 app 第二多。

**盤點時浮出的新發現（同形，但類別不同）**：

- ⛔ 上述全部是「對**某一筆記錄**的陳述」。而 `/login` 的三條 claim 與 shell 的
  `"v2.4 · SOC 2 Type II"` 陳述的對象是**平台自己**。平台是 Entity Zero（guardrail 2），
  它一張證書都沒有 —— 這是一條**關於自身的偽造合規宣稱**。
- 它**不在** AD 原本的射程裡，而它比 AD 描述的存量**更急**：`/login` 已經在打真 API
  （`fetch('/api/demo-session')`），shell 那一條出現在 **25 個畫面**上，而 W21 已把 29 條路由
  推上 Azure 的公開 URL。
- ⚠️ **為 W19 說句公道話**：同一段 code 的註解顯示它**想過這件事** —— fragment 原本的
  `"Production SG-1 · v2.4"` 被改掉了，理由寫著「a line claiming otherwise is exactly the kind
  of detail a screenshot carries out of context」，且 `auth.footer` 確實寫著
  `Demonstration build · not a production environment`。**意識在，範圍畫窄了**：
  footer 修了，它上面三行沒修。

### Why it matters（缺失的能力）

guardrail 1（平台本身不得成為風險來源，它必須是典範）與 guardrail 2（Entity Zero —— 平台受
自己的政策約束，並要能用自己的能力證明自身合規）**直接禁止**平台宣稱它沒有的認證。
guardrail 5（證據等級的稽核軌跡）禁止對真實記錄顯示偽造的核准鏈。

而今天**沒有任何東西看得見這兩者**：`run_all` 的 9 個 detector 沒有一個讀前端文案，
型別檢查與測試各自只看自己那一半（`CH-042` §Root Cause 的三層表）。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `5e517c5`，逐條複驗過）| Anchor |
|-------|--------------------------------------------|--------|
| ⛔ 平台宣稱它通過了 SOC 2 + ISO 27001 | `auth.claim1` = `"SOC 2 Type II · ISO/IEC 27001 certified"`、`claim2` = `"Tamper-evident, append-only audit trail"`，三條各配一個 `<IconTick />` | `i18n/auth.en.json:6-8` · `app/login/page.tsx:311-325` |
| ⛔ 同一條宣稱在 **25 個畫面**上，且**不在任何 `page.tsx` 裡** | `shell.env.meta` = `"v2.4 · SOC 2 Type II"`（en 與 zh-Hant **逐字相同**），旁邊 `:440` 是 `background: 'var(--rag-g)'` 的綠點 | `components/shell/AppShell.tsx:440-448` · `i18n/{en,zh-Hant}.json:25` |
| `/login` 已經在打真 API ⇒ 它今天就是混血畫面 | `fetch('/api/demo-session')`；且 `DemoBadge` 只存在於 `(app)` route group，`/login` 與 `/` 沒有 | `app/login/page.tsx:203` |
| W22 的處置是一次性手工 | 三個區域變數宣告成空陣列 + 15 行註解說明為什麼 | `app/(app)/risks/[id]/page.tsx:510-512` |
| ⛔ 「已接 API 就不 import fixture」**不成立** | 那一頁仍 import 10 個 symbol，其中 3 個只用在**型別位置**（`ReturnType<typeof riskSignOff>`），其餘是設計常數（分類 meta / 階段標籤 / 決策選單） | `.../risks/[id]/page.tsx:77-89` · `:386-387` · `:1052` |
| 沒有任何 detector 看得見這個組合 | 9 個 detector 全部針對文件 / CSS / schema / workflow；零個讀前端的資料來源 | `scripts/lint/run_all.py:53-77` |
| 唯一備妥列表+詳情的下一個模組是 `policy` | 12 個 controller，只有 `policy` 與 `risk` 有 `@Get(':id')` | `apps/api/src/modules/policy/policy.controller.ts:84` |
| dev seed **零筆 policy** | 273 行 seed 只種 risks（4 × SG1 / 3 × HK1）+ 兩個 asset | `apps/api/prisma/seed.ts:37` |
| `Policy` 的三個「人」欄位全 nullable | `ownerUserId` / `createdBy` / `updatedBy` 明文等 M4 | `apps/api/prisma/schema.prisma:338-343` |
| `PolicyStatus` 是六值 lifecycle，轉換到 M5 前不受保護 | `draft` / `in_review` / `approved` / `published` / `under_revision` / `retired` | `apps/api/prisma/schema.prisma:334-336` · `:373-382` |

→ 三件事因此被決定：**(1)** 平台自宣稱先修，因為它已公開且修法極輕；
**(2)** 守衛不能用「有沒有 import fixture」當判準（合法的型別用途與設計常數會誤報）；
**(3)** 守衛的掃描面**必須含 shell** —— 逐頁掃 `page.tsx` 會 100% 漏掉槓桿最高的那一條。

### The design（平台自宣稱 → FE 接線 → 一條錨定封閉集合的 detector；盤點不改 code）

```
i18n/auth.{en,zh-Hant}.json                 EDIT  —— claim1-3 改成誠實的等價物，非留白
i18n/{en,zh-Hant}.json:25                   EDIT  —— shell.env.meta 同上（⚠️ 今天兩語言逐字相同）
app/login/page.tsx · shell/AppShell.tsx     EDIT  —— 綠勾 / 綠點的 affordance 一併處置

apps/web/src/lib/api/policies.ts            NEW   —— 逐字比照 risks.ts（含「API 送不出什麼」檔頭聲明）
app/(app)/policies/page.tsx                 EDIT  —— 資料源 + loading/error/empty 三狀態
app/(app)/policies/[id]/page.tsx            EDIT  —— 同上 + not-found；13 條 record-claim 依守衛處置
apps/web/src/data/**（record-claim 者）      EDIT  —— 加 `@record-claim` 標記註解，**值不動**

scripts/lint/check_fixture_prose.py         NEW
  集合 A =「接了 API 的表面」:= 有 `from '@/lib/api/…'` 或直接 `fetch(` 的 tsx
              ⭐ 掃描面含 app/**/page.tsx **與 components/shell/**（AppShell 是 25 頁的共用表面）
  集合 B =「record-claim export」:= data/**.ts 裡標了 `@record-claim` 的 export 名
  規則 1 = A 的**值位置**不得出現 B 的成員（型別位置放行）
  規則 2 = 平台自宣稱字串（封閉清單，含 SOC 2 / ISO 27001 / certified）不得出現在
           **沒有 demo 標示**的表面上 —— 這是本片新發現那一類的守衛
  ⚠️ 它量的是「有沒有人繞過機制」，不是「文案是否誠實」—— 照 check_mockup_fidelity.py 的誠實聲明

apps/api/prisma/seed.ts                     EDIT  —— policies 跨 SG1/HK1，覆蓋六個 status
docs/09-analysis/fixture-prose-inventory-*.md  NEW —— 27 頁盤點，**零 code 變更**
```

**為什麼判準是「值位置使用 record-claim export」而不是「文案含某些字」**：後者是**開放集合** ——
`Tamper-evident` / `Ratified by` / `Next review` 只是今天想得到的那幾個，而 W23 剛量到枚舉開放集合
會漏 44%（9 個活 marker 只抓到 5 個）。表面是封閉集合、export 名是封閉集合，交集可以完整枚舉。

⚠️ **規則 2 是一個刻意的例外，理由必須寫在 detector 裡**：平台自宣稱**沒有** export 可標記
（它是硬編碼 i18n），所以那一條只能用字串清單。**它因此是開放集合、會漏**，而這是接受的 ——
它守的是一個**已知的、有限的、且不會自然增生**的清單（認證名稱），不是「所有治理陳述」。

### Ground truth（recon head-start —— 於 `main` HEAD `5e517c5` 讀過的 code）

- `apps/web/src/lib/api/risks.ts` — 完整藍本：`ScopedResponse<T>` 信封、`ApiUnavailableError`、
  404 當答案不當錯誤、**檔頭逐欄列出「API 不送什麼」並註明是對著跑著的伺服器量的**
- `apps/web/src/components/DemoBadge.tsx:49-51` — `variant: 'fixture' | 'partial'`，W22 新增
- `apps/web/src/components/NoSource.tsx` — 無來源欄位的統一渲染（避免 AP-2）
- `apps/api/src/modules/policy/policy.controller.ts:84-101` — `byId` 是 list-then-find，
  註解寫明「absent 與 out-of-scope 結構上不可分辨」（約束 8）
- `scripts/lint/check_mockup_fidelity.py:1-55` — detector 形狀先例：config-driven、pure functions、
  **以及「這個 lint 不量視覺保真度，它量有沒有人繞過機制」的誠實聲明**
- `apps/web` 測試 **10 個檔**（`Test Files 10` 是 `AD-UndiagnosedWebTestFailure-1` 的斷言值）
- `docs/03-implementation/changes/` 最大號 `CH-043` ⇒ 本片是 **CH-044**

**盤點草稿（Day-0 補掃後定稿為 US-5）**：156 條 / 27 頁。每頁計數最高的五頁 ——
`/admin` 14 · `/policies/[id]` 13 · `/controls/[id]` 11 · `/incidents/[ref]` 11 · `/isms-profiles` 11。
跨頁槓桿最高的三處：① `AppShell.tsx:448`（**25 頁**）· ② `deep.en.json` 的
`*.audit.tamperEvident` / `*.audit.chain` / `*.locked`（3 頁 + 兩處盾牌/鎖 SVG）·
③ `auth.en.json:6-8` 三條 claim + 綠勾。

**Baselines（Day-0 實測，2026-08-19）**: api test **484 / 40 suites** · api int **見 progress.md** ·
web **95 / 10 files**（⚠️ 需 `--maxWorkers=4`，見 D1）· lint **0** · type **0** ·
build `✓ Compiled successfully` · **31 routes**（29 page + `/_not-found` + `/api/demo-session`）·
`run_all` **9/9**（31 pre-doc）
⛔ **起草時這一格寫 `✓ 25/25`，那是錯的** —— 從 W23 摘要抄來的數字，數的不是同一個東西
（W21 的「29 routes」數的是 page route）。`AD-ProxyMetricAsAnswer-1` 的形狀：
**拿一個數字回答另一個問題**。本片不新增 route ⇒ 收尾時仍應是 31。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-inventory-gaps** — 盤點草稿自帶的缺口，使用者裁決**全部補掃**：
  (a) `zh-Hant` 字典全部未讀（parity 只保證 key 存在，不保證語意強度相同）·
  (b) `data/extended/` 未讀 10 檔，其中 `riskProgramme.ts` / `rmReport.ts` 是**未經 i18n 的
  程序原文**且在 `/risk-programme` 全文渲染 ⇒ 該頁的 8 條是**下限** ·
  (c) `lib/tok.ts` 未讀 ⇒ **所有「綠燈=是」的判定都依賴 `tok('G')` 是綠這個推斷** ·
  (d) `entityPosture.ts` 只讀 40-99 行 · (e) `AppShell.tsx` 只讀 11 行 · (f) `notifications.ts` 未讀
- **D-affordance-rule** — 盤點採用了一條**收斂規則**（只列「綠色標記的是一筆記錄的治理／合規狀態」，
  排除純風險評級與產品生命週期）。**這條規則必須明文寫進盤點文件**，否則重跑會得到不同數字
- **D-policy-fields** — `/policies` 與 `/policies/[id]` 逐欄對 `Policy` model → 決定 `NoSource` 落點數
- **D-record-claim-set** — 那 13 條裡有幾條**指得到** API 欄位 → 決定 US-4 規則 1 的真實標的
- **D-fetch-direct** — 今天有哪些表面直接 `fetch(`（已知 ≥ 2：`app/page.tsx:45` · `login:203`）
- **D-seed-policy** — `seed.ts` 的 `9xxxxx` 保留段與 `ref_code_counters` 的互動能否沿用
- **D-white-tick** — `audit-issues/[ref]/page.tsx:723-734` 白色勾 SVG 疑似**無條件渲染**
  （未完成步驟畫白底白勾）→ 若成立，記 BACKLOG，**本片不修**（不在授權範圍）
- **D-baselines** — 上表六個數字重新量

## 1. Phase Goal

讓這個平台停止宣稱它沒有的認證，讓 `policies` 的讀取路徑接上真 API，並讓「fixture 文案在畫面接上
真資料時變成偽造證物」這個缺陷**從此有一個會紅的東西**。證明方式 = 全 gate
（lint / type / test / build / `run_all` **10/10**）+ 守衛的**負面驗證**（把守衛拿掉、或把
record-claim export 放回值位置，指定測試轉紅並指名）+ **MANDATORY drive-through**
（三個表面：`/login` · `/policies` · `/policies/[id]`）。
非 spike ⇒ 不產 design note；無架構級新決定 ⇒ 不產 ADR。

## 2. User Stories

- **US-1**（platform self-claim）: 作為看到這個 demo 的人，我希望平台不要宣稱它通過了它沒通過的
  認證，以便一張截圖被帶離脈絡時不會變成一份偽造的合規證明。
- **US-2**（seed）: 作為開發者，我希望 dev seed 種下跨 SG1 / HK1 的 policies，
  以便 policies 畫面能證明範疇過濾**真的在過濾**，而不是碰巧只有一邊。
- **US-3**（read path）: 作為政策擁有者，我希望 `/policies` 顯示的是資料庫裡真實的政策，
  以便我看到的清單就是這個實體實際持有的東西。
  ⛔ **詳情頁不在本 US 內**（Day-0 D3）。
- **US-3b**（vitest 根因）: 作為任何一個跑這個套件的人，我希望 `npm run test -w apps/web`
  真的跑完 10 個檔，以便「95 passed」是一句可信的話而不是一次僥倖。
- **US-4**（guard）: 作為**下一片接 API 的人**，我希望漏掉一個治理陳述時 CI 會紅，
  以便這件事不依賴我記得 —— AD 的原文明說「不是『記得檢查』」。
- **US-5**（inventory）: 作為規劃者，我希望有一份補掃完整、**自帶覆蓋聲明與收斂規則**的
  27 頁清單（**不改 code**），以便每一片接 API 時知道那一頁有哪些帳要清。
- **US-6**（drive-through, **MANDATORY**）: 作為使用者，我希望真的開瀏覽器走完三個表面，
  以便「能用」不是從 gate 推導出來的。
- **US-7**（closeout）: 作為未來的自己，我希望這一片的知識落在正確的單一來源裡。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   apps/web/src/lib/api/policies.ts                     兩個呼叫 + PolicyRow + 檔頭「API 不送什麼」
NEW   scripts/lint/check_fixture_prose.py                  兩條規則，config-driven
NEW   scripts/lint/tests/test_fixture_prose.py             pure-function 單元測試（含負面案例）
NEW   .fixture-prose.json                                  config（掃描面 + 自宣稱清單 + 例外含理由欄）
NEW   docs/09-analysis/fixture-prose-inventory-20260819.md 27 頁盤點，零 code 變更
NEW   apps/web/src/app/(app)/policies/policies.test.tsx    比照 risks.test.tsx
NEW   docs/03-implementation/changes/CH-044-*.md            change record

EDIT  apps/web/src/i18n/auth.{en,zh-Hant}.json             claim1-3
EDIT  apps/web/src/i18n/{en,zh-Hant}.json                  shell.env.meta
EDIT  apps/web/src/app/login/page.tsx                      綠勾 affordance
EDIT  apps/web/src/components/shell/AppShell.tsx           綠點 affordance
EDIT  apps/web/src/app/(app)/policies/page.tsx             資料源 + 三狀態
EDIT  apps/web/src/app/(app)/policies/[id]/page.tsx        資料源 + 四狀態 + record-claim 處置
EDIT  apps/web/src/data/**（僅 record-claim 者）            加標記註解，**值不動**
EDIT  apps/api/prisma/seed.ts                              policies 跨兩實體
EDIT  scripts/lint/run_all.py                              註冊第 10 個 detector
EDIT  docs/01-planning/_templates/phase/checklist.md.tpl   Day-2 加一格具名項（AD 的原文要求）

UNTOUCHED  apps/web/src/app/(app)/risks/**                 W22 已通過 drive-through，本片不回頭改
UNTOUCHED  其餘 24 個 page.tsx                             使用者裁決：不動存量，只盤點
UNTOUCHED  apps/api/src/modules/**                         端點已備妥，本片零 API 邏輯變更
UNTOUCHED  apps/api/prisma/schema.prisma                   零 migration
```

### 3.1 Platform self-claim（US-1）— i18n × 4 檔 + 兩個 affordance

- **改成誠實的等價物，不是留白** —— 一個空欄位讀起來像壞掉，一句誠實的話讀起來像設計。
  W19 已有先例且有記錄：fragment 的 `"Production SG-1 · v2.4"` 被改成 demo 聲明
  （`login/page.tsx:329-331` 的註解就是那次的理由）。
- ⚠️ **寫文案前 Read `docs/rules-on-demand/i18n-glossary.md`**（guardrail 9 trigger）。
  `shell.env.meta` 今天 en 與 zh-Hant **逐字相同**，改的時候要真的給繁中一個譯法。
- ⭐ **affordance 一併處置**（AD 的附帶教訓：只換文字不換 affordance 等於沒修）：
  `login/page.tsx:317` 的 `<IconTick />` × 3 與 `AppShell.tsx:440` 的
  `background: 'var(--rag-g)'` 綠點 —— 綠勾與綠燈不管旁邊寫什麼都讀作「認證通過」。
- ⛔ **不是**約束 6 的違反：這不是「自行 approximate 設計」，是**移除一句不實陳述**，
  而該類處置在本專案已有 W19 的記錄先例。仍要在 CH-044 明記為有記錄的偏離。

### 3.2 Seed（US-2）— `apps/api/prisma/seed.ts`

- 沿用既有冪等形狀與 `9xxxxx` 保留段（`POL-SG1-9000NN`），**以 owner 身分連線**
  （`DATABASE_URL_MIGRATE`）—— 理由已寫在該檔檔頭
- **跨 SG1 / HK1 兩邊**（單邊 fixture 會讓「範疇過濾有效」與「範疇過濾不存在」在畫面上完全相同）
- 覆蓋 `PolicyStatus` 六值，且**至少一筆 `retiredAt` 非 NULL** —— 軟刪除與 `status = retired`
  是兩件事（schema 註解明說），畫面必須能顯示這個區別

### 3.3 Read path（US-3）— `lib/api/policies.ts` + 列表頁

- **逐字比照** `risks.ts`：`ScopedResponse<T>` 信封、404 當答案、`ApiUnavailableError`
- ⭐ 檔頭必須逐欄列出 **API 送不出什麼**，且註明是**對著跑著的伺服器量的**，不是從 schema 推的。
  Day-0 已量到 4 個：`category`（無此欄）· `owner`（**現在填就違反 guardrail 7** ——
  `seed.ts` 檔頭：*"inventing a person here would be inventing PII"*）· `nextReview`（無此欄）·
  `att`（attestation 是獨立表且無端點）
- `DemoBadge` 給 `partial`；⛔ **不得整頁標 `fixture`** —— 那正是 W22 抓到的反向違反
- ⚠️ **category 篩選器（`page.tsx:113`）會空掉** —— 它整個依賴無來源欄位。
  ⛔ 不得留一個永遠沒有選項的篩選器（死控件）；要嘛移除、要嘛改用有來源的維度（`status`）
- ⛔ **`/policies/[id]` 不動**（Day-0 D3）：接完只剩 3 個真欄位，9 個區塊無來源。
  它保持整頁 fixture + `DemoBadge` 預設 `fixture` 變體 —— 那是今天最誠實的狀態

### 3.3b vitest 根因（US-3b）— `apps/web/vitest.config.mts`

- `poolOptions: { forks: { maxForks: 4 } }` → `maxWorkers: 4`（vitest 4 把 pool 選項提為 top-level）
- ⭐ **`:64-73` 那段註解不刪、要改寫** —— W19 的診斷是**對的**（jsdom 啟動風暴），
  失效的只有承載方式。把「這個設定曾經被靜默忽略」寫進去，因為同一檔的 `:55-58`
  已經為另一個實例寫過同一句話（*"a setting that is read and ignored is worse than none"*）
- **驗收是負面的**：改完後 `npm run test -w apps/web` 必須 `Test Files 11`；
  且要保留 Day-0 的實測對照（同負載下 1 檔 vs 10 檔）進 CH-044

### 3.4 Guard（US-4）— `scripts/lint/check_fixture_prose.py`

- **規則 1**：集合 A（有 `from '@/lib/api/…'` 或直接 `fetch(` 的 tsx，**掃描面含
  `app/**/page.tsx` 與 `components/shell/**`**）的**值位置**不得出現集合 B
  （`data/**` 標了 `@record-claim` 的 export 名）。型別位置放行 —— `ReturnType<typeof X>` /
  `typeof X[number]` / `import type` 是 W22 留下的合法形狀
- **規則 2**：平台自宣稱字串（config 裡的封閉清單）不得出現在**沒有 demo 標示**的表面上。
  ⚠️ 這條是刻意的開放集合例外，理由見 §0 The design
- 形狀照 `check_mockup_fidelity.py`：config-driven、pure functions、`--self-test`、
  **以及一段誠實聲明**：它量的是有沒有人繞過機制，不是文案是否誠實
- ⛔ **負面驗證是這一項的驗收，不是附加** —— 依 `AD-GateGreenDecaysAfterFix-1`，
  `run_all` 全綠**不是**守衛有效的證據

### 3.5 Inventory（US-5）— `docs/09-analysis/`

- 27 頁逐頁：`file:line` · 逐字原文 · 類型 · fixture 來源 · **affordance 欄**
- **必須明文寫出 affordance 的收斂規則**（D-affordance-rule）—— 否則重跑會得到不同數字
- 附**覆蓋聲明**（掃了幾個檔 / 什麼方法 / 什麼沒掃到）
- ⛔ **零 code 變更**（使用者 2026-08-19 裁決）

### 3.x 明確不做的事

- **不改其餘 24 頁的記錄層文案**（存量處置留給各自接 API 的片）
- **不接 `/controls/[id]`**（API 沒有 `@Get(':id')`）
- **不做寫入路徑**（`/policies/new` 畫面不存在，且 M4 前無 owner）
- **不動 `/risks` 兩頁**（已通過 drive-through）
- **不修 `D-white-tick`**（若成立，記 BACKLOG —— 不在授權範圍）
- **不解 `AD-EntityVocabularyMismatch-1`**（UI 13 個 OpCo 碼 vs DB 5 個節點，零交集）
- **不建 `packages/types` 的 policy DTO**（與 `AD-RiskContractUndeclared-1` 同一理由）

### 3.y Validation（US-1..US-7）

Gates: lint 0 · format clean ×2 · type 0 · api test ≥ 484 · api int ≥ 269 ·
web test ≥ 95 / **`Test Files` 檔數是斷言**（新增 `policies.test.tsx` ⇒ 期望 **11**）·
build clean · `run_all` **10/10**。加上 §3.4 的**負面驗證**與 §5 的 **drive-through（MANDATORY）**。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/web/src/i18n/auth.{en,zh-Hant}.json` | EDIT（claim1-3） |
| 2 | `apps/web/src/i18n/{en,zh-Hant}.json` | EDIT（`shell.env.meta`） |
| 3 | `apps/web/src/app/login/page.tsx` | EDIT（綠勾 affordance） |
| 4 | `apps/web/src/components/shell/AppShell.tsx` | EDIT（綠點 affordance） |
| 5 | `apps/api/prisma/seed.ts` | EDIT |
| 6 | `apps/web/src/lib/api/policies.ts` | NEW |
| 7 | `apps/web/src/app/(app)/policies/page.tsx` | EDIT |
| 8 | `apps/web/vitest.config.mts` | EDIT（Day-0 D1 —— `poolOptions` → `maxWorkers`） |
| 9 | `apps/web/src/app/(app)/policies/policies.test.tsx` | NEW |
| 10 | `scripts/lint/check_fixture_prose.py` | NEW |
| 11 | `scripts/lint/tests/test_fixture_prose.py` | NEW |
| 12 | `.fixture-prose.json` | NEW |
| 13 | `scripts/lint/run_all.py` | EDIT |
| 14 | `apps/web/src/data/**`（record-claim 者） | EDIT（**僅加標記註解，值不動**） |
| 15 | `docs/09-analysis/fixture-prose-inventory-20260819.md` | NEW |
| 16 | `docs/01-planning/_templates/phase/checklist.md.tpl` | EDIT（Day-2 加一格） |
| 17 | `docs/03-implementation/changes/CH-044-*.md` | NEW |
| 18 | `docs/01-planning/W24-*/{progress,retrospective}.md` | NEW |
| — | `apps/web/src/app/(app)/policies/[id]/page.tsx` | **UNTOUCHED**（Day-0 D3 —— 後端未備，見 §9） |
| — | `apps/api/src/modules/**` | **UNTOUCHED**（端點已備妥） |
| — | `apps/api/prisma/schema.prisma` | **UNTOUCHED**（零 migration） |
| — | `apps/web/src/app/(app)/risks/**` | **UNTOUCHED**（已驗收） |
| — | `apps/web/src/app/(app)/dashboard/page.tsx` | **UNTOUCHED**（Day-0 D2 的斷鏈 → BACKLOG，不當場修） |
| — | 其餘 24 個 `page.tsx` | **UNTOUCHED**（只盤點） |

## 5. Acceptance Criteria

1. **AC-1** `/login` 與所有 25 個帶 shell 的畫面上，**沒有任何未經 demo 標示的認證宣稱**；
   綠勾 / 綠點的 affordance 已一併處置；`en` 與 `zh-Hant` 兩邊都改且**不再逐字相同**。
2. **AC-2** `npm run prisma:seed` 冪等；`GET /policies` 在 SG1 範疇下只回 SG1 的列，
   HK1 的列**不出現**，且該斷言在 seed 只種單邊時**會失敗**。
3. **AC-3** `/policies` 的列數 == `GET /policies` 回的筆數（**不是** fixture 的筆數），
   且**負面測試**斷言 fixture 第一列的標題**不在 DOM 裡**。
4. **AC-4** 真的停掉 API 後重載：可見的錯誤狀態、0 列、**fixture 標題零洩漏**。
5. **AC-5** `/policies` 上每一條對「這一筆政策」的陳述逐條有處置記錄（留 / 不渲染 / `NoSource`），
   留下的每一條都能指到一個 API 欄位；**category 篩選器不得留成永遠空的死控件**。
6. **AC-6** `npm run test -w apps/web`（**不加任何旗標**）回報 **`Test Files 11`** 且 exit 0；
   CH-044 保留 Day-0 的同負載對照（1 檔+exit 1 vs 10 檔+exit 0）。
7. **AC-7** `check_fixture_prose.py` **負面驗證**：規則 1 —— 把一個 record-claim export 放回
   `/policies` 的值位置 ⇒ 指定測試轉紅並**指名該 export 與該檔**；規則 2 —— 把
   `"SOC 2 Type II"` 放回 shell ⇒ 轉紅並指名。兩條都要改回後轉綠。
8. **AC-8** 盤點文件涵蓋 27 頁（**含 0 條的頁**），補掃六個缺口，明文寫出 affordance 收斂規則，
   附覆蓋聲明；**`/policies/[id]` 的 9 個無來源區塊逐一登記**（那是它今天不接的證據）。
9. **AC-9 Drive-through PASS（MANDATORY，真 UI + 真後端 + 真 DB）** —— 兩個表面
   （`/login` · `/policies`）走完主路徑 + shell 迴歸抽查 2 頁，逐控件走查；
   截圖 + observed-vs-intended 記入 progress.md。（**不是** gate-only。）
10. **AC-10** `AD-FixtureProseBecomesForgedEvidence-1` 的**機械層** CLOSED（存量層改寫解封條件並保留）；
    新發現另立一條 AD 並標明處置；calibration 已記錄；導航檔 + BACKLOG 已更新。

## 6. Deliverables

- [ ] US-1 平台自宣稱移除（4 個字串 × 2 語言 + 2 個 affordance）
- [ ] US-2 dev seed 種下跨 SG1 / HK1 的 policies，覆蓋六個 status + 一筆軟刪除
- [ ] US-3 `/policies` 讀真 API，三狀態齊備，逐條處置（**詳情頁不接** —— Day-0 D3）
- [ ] US-3b `vitest.config.mts` 的 `maxWorkers`，`npm run test` 無旗標跑滿 11 檔
- [ ] US-4 `check_fixture_prose.py` 兩條規則 + 單元測試 + **負面驗證實測**
- [ ] US-5 27 頁盤點定稿（補掃 + 收斂規則 + 覆蓋聲明，零 code 變更）
- [ ] US-6 drive-through PASS ×3 表面，截圖 + observed-vs-intended
- [ ] US-7 CH-044 + retrospective + calibration + 導航檔 + BACKLOG

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（Read `docs/01-planning/CALIBRATION-MATRIX.md:53`
  —— **第 12 個資料點**。W22 的 risks 接線是完整藍本：`lib/api/risks.ts` · `NoSource` ·
  `DemoBadge.partial` · `risks.test.tsx` 全部可抄；detector 也有 `check_mockup_fidelity.py` 的形狀。
  ⚠️ 該行判準明寫「**第 12 點同量法再 <0.7 則 re-point 0.45**」⇒ **本片就是那個點**，
  量法必須與 W18 一致：**T0 蓋在讀第一個檔案之前**）。
- **Agent-delegated: `partial`**（盤點補掃派工 —— broad search，中間結果不該進主 context；
  接線、守衛、US-1 **自己做** —— drive-through 不能委派，守衛的負面驗證要我親手拿掉才算數）。
  `agent_factor` **0.75** → 四段式。
- **B1（傳統手工估）Bottom-up ~20.5 hr**（Day-0 + 全部補掃 2.5 · US-1 1.5 · seed 1.5 ·
  **列表頁**接線 3 · vitest 根因 0.5 · 守衛+測試 4.5 · 盤點定稿 2 · drive-through 2 · closeout 3）
  → class-calibrated ~10.25 hr (mult 0.50) → **agent-adjusted ~7.7 hr** (agent_factor 0.75)。
  ⚠️ **Day-0 後下修**（原 22.5）：詳情頁移出 −2、vitest 根因移入 +0.5、drive-through 少一個表面 −0.5。
  **原始值保留於此以免事後看不出範圍變動**。
- ⛔ **本片同時是 `AD-BottomUpEstimateInflated-1` 的第 3 個資料點**：W22 `actual/bottom-up`
  **0.26**、W23 **0.25**，兩個**不同 class** ⇒ 訊號指向 **bottom-up 方法本身**而非某個乘數。
  ⇒ **本片並列記錄第二個 bottom-up**：**B2（AI 步驟估）≈ 7.6 hr**（Day-0 0.7 · US-1 0.5 ·
  seed 0.7 · 列表頁接線 1.2 · vitest 0.2 · 守衛 2 · 盤點 0.8 · drive-through 0.8 · closeout 1.5）。
  Day-4 比較 `actual` 落在 B1 還是 B2 附近 —— **這不花額外時間，但它是唯一能分辨
  「乘數太高」與「估算方法錯了」的做法**。
  ⚠️ **B2 與 calibrated B1（7.7 hr）現在幾乎重合**，所以本片對這條 AD 的**分辨力低** ——
  要等一個 B1/B2 分岔較大的 phase 才有訊號。Day-4 要明說這一點，不得把「兩者都接近 actual」
  當成兩種方法都對。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ~~R1 — policies 兩頁的欄位多數無 API 來源~~ ✅ **Day-0 已裁決** | D-policy-fields 量到列表頁 4/8 無來源（門檻是「>一半」，字面不觸發）、詳情頁只剩 3 個真欄位 ⇒ 使用者裁決**只接列表頁**。⚠️ R1 的判準本身要記一條教訓：它寫成「欄位比例」，而真正的問題是「**這一頁的後端存在嗎**」 |
| ~~R2 — 守衛規則 1 可能零標的~~ ✅ **Day-0 已推翻** | D-record-claim-set 量到 13 條中**只有 1 條**指得到 API 欄位 ⇒ 標的極充足，反向風險不成立 |
| **R10 — category 篩選器會空掉**（Day-0 D4，R1 未預料） | 控件死亡 ≠ 欄位留白。§3.3 明訂：移除，或改用有來源的維度。⛔ 不得留一個永遠沒有選項的篩選器 |
| **R3 — 規則 2 是開放集合，會漏** | **設計上接受**，理由寫在 detector 檔頭：它守的是一份有限且不會自然增生的認證名稱清單。⚠️ 在 CH-044 明寫這個射程，不得讓「守衛存在」被讀成「已完整覆蓋」 |
| **R4 — 新增而未標記的 export 對規則 1 不可見**（設計上的已知洞） | 由 `checklist.md.tpl` 那一格具名項承接（AD 原文要求） |
| ~~R5 — `Test Files` 間歇變成 1，機制不明~~ ✅ **Day-0 診斷完成** | 機制是 jsdom 啟動風暴 + `poolOptions` 被 vitest 4 靜默忽略（D1）。US-3b 修根因。⚠️ 檔數斷言**仍然保留**（11）—— 它現在是驗證修好了沒的儀器，不是緩解措施 |
| **R6 — 陳舊 dev server 掩蓋接線修正**（`task-workflow.md` §Risk Class C） | Day 3 乾淨重啟：殺光 3200 / 3210 上的孤兒 worker，確認新程序是唯一擁有者，擷取 startup log |
| **R7 — 改 shell 會影響 25 個畫面** ⇒ 迴歸面是本片最大的 | `AppShell` 的改動限縮在 `:440-448` 那一塊；Day 3 drive-through 除三個主表面外，**額外抽查 2 個未接 API 的畫面**確認 shell 沒壞 |
| **R8 — i18n key 遺漏 zh-Hant** ⇒ parity test 紅 | 每新增/修改一個 key 同時寫兩檔；`i18n.test.ts` 已有 parity 斷言。⚠️ `shell.env.meta` 今天兩語言逐字相同，改完要真的不同 |
| **R9 — seed 與 `ref_code_counters` 互動** | 沿用 W22 已驗證的 `9xxxxx` 保留段形狀；Day-0 **D-seed-policy** 確認冪等性 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- ⭐ **`/policies/[id]` 接 API** → **等後端**（Day-0 D3）。解封條件是**可觀察的**，不是「以後再說」：
  `Policy` 需要能承載該頁的 9 個無來源區塊中至少「文件本體 + 版本歷史」兩者
  —— 前者今天連欄位都沒有，後者 `version` 只是一個 Int 而非歷史。⇒ 新開一條 AD 記錄
- **其餘 24 頁的記錄層存量文案** → 各自接 API 的片（AD 存量層保留並改寫解封條件）
- ⭐ **`/dashboard:1059` → `/risks/[id]` 的斷鏈**（Day-0 D2）→ BACKLOG。fixture id `RSK-1042`
  對上 API 的 uuid，**每個連結今天都打到 404**。⛔ 本片不修：它是 W22 的接線遺留，
  §Step 0.0 三個例外都不適用（不阻塞本片、非安全、使用者未要求）
- **`D-white-tick`**（`audit-issues/[ref]:723-734` 無條件渲染的白勾）→ **Day-0 已確認成立**，記 BACKLOG
- **`data/notifications.ts` 是死檔**（Day-0 D6，AP-1 + AP-7）→ BACKLOG
- **`AppShell.tsx:553` 硬編碼 `rating:'A'`**（Day-0 D7）→ BACKLOG
- 🔴 **`riskProg.doc.classificationValue` EN `Restricted` / ZH `機密` 是兩個不同分級**（Day-0 D8）
  → BACKLOG。⚠️ 這是 guardrail 9 的**實質**違反，且 `GLOSSARY.md` 未登記該術語
- **`deep.zh-Hant.json:6` 錯字「捷造」→「捏造」**（Day-0 D9）→ BACKLOG
- **三個 `new` 表單的「預先斷言」**（`suppliers/new` 的 checkbox 預設全打勾，含 "Non-disclosure
  agreement"；`assessments` Q1/Q2 預選綠色選項 + Q4 預填完整證言）→ 同形但屬**表單預設值**，
  記 BACKLOG 另處理
- **`/controls/[id]` 接 API** → 需先補 `@Get(':id')`
- **`AD-EntityVocabularyMismatch-1`** → 獨立，影響所有畫面
- **`AD-ScopeSelectorInertOnLiveScreens-1`** → 解封條件是 M4 真認證；本片只在新接的兩頁比照標示
- **`AD-CrossScreenContradictionNoGuard-1`** → 其解封條件是「第 3 個畫面消費 `risks`」，
  ⚠️ 但 `/dashboard:1071-1089` 的 Top residual risks **仍讀 fixture `risks.ts`** 而 `/risks` 已接 API
  ⇒ **同一個資料在兩個畫面上一真一假**，Day-0 要把這條移進 §Risks 或另立 AD
- **`AD-DecisionTableSaysUndecided-1`** → 治理工具，超出 §Step 0.0 每 phase 1 個 CH 的配額
