# Phase W22 Progress

**Phase**: W22 — risks 端到端垂直切片（前端接真 API，本機 drive-through）
**Plan**: [plan.md](./plan.md)
**Branch**: `feature/W22-risks-slice`

---

## Day 0 — 2026-08-18 — Plan-vs-Repo Verify

**對照基準**：`main` HEAD **`e17464e`**（PR #85 rebase-merge 後）。
⚠️ 本片的 recon 做在 PR #84 merge 之前，SHA 已兩度被 rebase 改寫；
**錨點重指了，事實仍全部重驗** —— 而重驗的結果證明這個堅持是對的（見 D-307）。

### Baselines（六項逐項實跑）

| Gate | 結果 |
|---|---|
| `npm run test -w apps/api` | **480 passed / 40 suites** ✅ 與 plan 宣稱相符 |
| `npm run test -w apps/web` | **88 passed / 9 files** ✅ 與 plan 宣稱相符 |
| `npm run lint -w apps/api -w apps/web` | clean |
| `npm run type-check -w apps/api -w apps/web` | clean |
| `npm run format:check -w apps/api -w apps/web` | clean |
| `npm run build -w apps/api -w apps/web` | clean —— `/risks` 與 `/risks/[id]` 皆 `ƒ (Dynamic)` |
| `python scripts/lint/run_all.py` | **9/9**（於 `e17464e`） |

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-307** ⭐⭐ | plan §3.4 宣稱「不存在的 id 回 307 導回列表」。實際：`apps/web` **無 middleware**；307 來自 `apps/web/src/app/(app)/layout.tsx:50` 的 `if (!persona) redirect('/login')` —— **未登入**閘門，對 `(app)` 底下每條路由一律觸發，**與 id 無關**。`/nonexistent-page` 正確回 404 是因為它在 group 外。已登入 + 不存在的 id 的真實行為是 `[id]/page.tsx:218-228` 一張**行內 not-found 卡**（200，i18n key `riskDetail.notFound.*` 中英皆備，W19 交付） | **AC-6 與 AC-8 打在一個不存在的缺陷上**。`AD-FrontendMissingIdRedirects-1` 的 BACKLOG:251 敘述錯了兩處：不是導回列表（是 `/login`），也不是因為 id 不存在（是未登入）⇒ 該 AD **更正敘述，不關閉**。AC-6 改寫為「兩種 404 不可分辨」→ plan R8 | 🔴 改 plan |
| **D-detail-hybrid** ⭐⭐ | plan §4 把詳情頁當成「換一個資料源」。實際它吃**五個** fixture 來源：`risks`(8 處) · `controls`(10) · `issues`(8) · `entityPosture`(2) · `@/data/extended/riskDetail` 的 **13 個具名匯出**（稽核軌跡／簽核／階段／決策／複審日／工作底稿） | 只換 `risks` ⇒ 表頭真、其餘假。⛔ 而 `DemoBadge` 的 docstring 明寫它存在的理由是「sample data presented as real」—— 接上後它會**反過來**宣稱整頁是樣本而表頭是真的，**同一條誠實規則的反向違反**。⇒ 新增 DemoBadge「部分真實」變體（plan §4 第 10 列）→ plan R7 | 🔴 改 plan |
| **D-migration-lag** | `isms_dev` 25 個 migration 中 `20260817033944_event_and_posture_snapshot` **未套用** | `AD-DevDbChecksumDrift-1` **第 6 次**。Day 1 開工前 `prisma migrate deploy`。⚠️ 第 6 次已遠超強度階梯「≥3 次改結構性解法」的門檻 —— 結構性解法另記 backlog → plan R9 | 🟡 小調整 |
| **D-verify-cmd** | checklist Prong 3 的 Verify 寫 `npm run prisma:migrate`，而該 script = **`prisma migrate dev`** —— 它**套用**遷移且偵測 drift 時要求 reset dev DB；本項 DoD 只要 status | **一個 Verify 指令比它要驗的東西危險**，是 checklist 自己的缺陷。Day 0 改跑唯讀 `npx prisma migrate status`，checklist 已更正 → plan R10 | 🟡 小調整 |
| **D-baselines** | 見上表六項 | 基線已記錄，全部與 plan 宣稱相符 | ✅ |

### 確認無誤（沒有漂移的部分 —— 同樣是 Day-0 的產出）

| 宣稱 | 實測 |
|---|---|
| `apps/web/src/lib/api/` 不存在 · `apps/api/prisma/seed.ts` 不存在 | ✅ 兩者皆不存在；`prisma/` 只有 `migrations/` + `schema.prisma` |
| 八個 EDIT 目標存在 | ✅ 九個路徑（含三個 UNTOUCHED）全部存在 |
| `CH-042` 未被佔用 | ✅ `changes/` 最大號 `CH-041`；`bugs/` 目錄空；全 repo 只有 W22 pre-doc 自己提到 CH-042 |
| `risk.controller.ts` 只有 `@Get()` | ✅ `:77 @Controller('risks')` · `:91 @Get()` · `:97 @Post()`，無 `@Get(':id')` |
| `policy.controller.ts:89-102` 是 list-then-find | ✅ 逐行相符：`:89 @Get(':id')` · `:90 async byId` · `:98 NotFoundException`，且註解已寫明「回 403 等於得先知道那列存在」 |
| 全 repo 零 seed 檔 | ✅ `find` 零命中，`package.json` 無 `prisma:seed` |
| `Threat` / `Vulnerability` 零 controller | ✅ **比預期更強**：`modules/` 13 個目錄**連 threat / vulnerability 目錄都沒有** ⇒ §9「寫入路徑不是取捨是前提不存在」成立 |
| `data/risks.ts` UNTOUCHED（其餘畫面仍用） | ✅ 實測 **6 個**畫面 import 它（dashboard · controls/[id] · issues/[id] · risks/new · risks · risks/[id]） |

### Prong 覆蓋

- **Prong 1（path）**：9 個路徑 + 1 個編號可用性 → **0 個漂移**
- **Prong 2（content）**：6 個宣稱 → **2 個漂移**（`D-307` 全錯 · `D-fixture-import` 半中，帶出 `D-detail-hybrid`）
- **Prong 2.5（child tree）**：4 個元件掃描 → 兩頁的直接子元件（`DemoBadge` · `icons` · `shell-state`）零 risk fixture；`shell-state.ts:37` 只是 **type** import。⚠️ 但 shell 層 `AppShell.tsx:103` 吃 `@/data/opcos` —— **那就是 D1「切換 persona 不改變 API 回傳」會在畫面上長出來的地方**，checklist 2.2 的具名 `[ ]` 有了確切標的
- **Prong 3（schema）**：N/A（零 schema 變更），但 migration head 查了 → **1 個漂移**

### 決策拍板（使用者 2026-08-18）

| # | 決定 | 依據 |
|---|------|------|
| **D3**（Day-0 新增）| 詳情頁**表頭接真 API，其餘四個 fixture 來源留著**，DemoBadge 加「部分真實」變體 | 另兩個選項各有硬傷：只做列表頁 ⇒ `GET /risks/:id` 沒有消費者 = **AP-1 side-track**；整頁接真 ⇒ 需先建 `riskDetail` 13 個匯出背後的資料表，等於把 W22 變成三四個模組的工程 |
| **D4**（Day-0 新增）| AC-6 改寫為**「兩種 404 不可分辨」**；`AD-FrontendMissingIdRedirects-1` **更正敘述而非關閉** | 約束 8 要求的是不可分辨，那是 UI 層性質，與 HTTP status 無關。真 404 status 另記 backlog —— 兩頁都是 `'use client'`，那不是原本以為的一行替換 |

### Go / No-Go

**範圍變動**: **~20-25%**（8 條 AC 中 2 條改寫；9 個 file change 中 1 個性質改變 + 1 個新增）
→ 落在 **20-50% 帶** ⇒ 依 `task-workflow.md` 修訂 plan §3.4 / §4 / §5 / §7 / §8 並回報使用者
→ **使用者裁決後 GO**，繼續 Day 1。

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 0（建分支 15:24:45 → 完成 plan/checklist/progress 修訂）| **≈ 20 min** |
| 對照 plan §7 的 Day-0 估算 | 0.5 hr（30 min）⇒ ratio **≈ 0.67** |

> baseline 的六個 gate 以背景平行跑，與 grep 驗證重疊 —— 序列執行會更長。

---

## Day 1 — 2026-08-18 — 端點與 seed (US-2, US-3)

### 1.1 `GET /risks/:id`

`prisma migrate deploy` 先補上 Day-0 抓到的落後 migration → `Database schema is up to date!`（25/25）。

`@Get(':id')` 逐字複製 `policy.controller.ts:89-102` 的形狀，**含那段註解的理由**
（「回 403 得先知道那列存在 —— 那意味著要查到範疇外去」）。O(n) 的代價寫成
**有可觀察到期條件**的註解，不是「以後再優化」：單一 entity 的風險數超過一個畫面能顯示的量時，
它就不再是人會翻的清單而是一個查詢，屆時正解是 repository 裡的 scoped `findFirst`。

- 單元測試 `risk.controller.spec.ts`：**17 → 21 passed**（新增 4 個 `it()`）
  —— api 總數 **480 → 484**。⚠️ 我一開始在這裡寫「新增 5」，是把「改了既有那條
  `marks every response as dev-principal scoped` 加一句 byId 斷言」誤算成一條新測試；
  總數差額 +4 才是實數。
- 整合測試 `risk.int.spec.ts`：**265 → 269 passed**（新增 19-22 四條）

### ⛔ 中性化預測（**寫於執行之前**）

**中性化方式**：把 `RiskController.client()` 的範疇強制成 `['SG1','HK1']`
（模擬「範疇沒有收窄」），其餘不動。

| 測試 | 預測 | 理由 |
|---|---|---|
| 19（範疇內回該列）| 🟢 **維持綠** | 更寬的範疇仍包含 SG1 那列 |
| 20（跨實體 → 404）| 🔴 **轉紅** | SG1 principal 現在看得到 HK1 的列 ⇒ 回 200 而非拋 404 |
| 21（兩者不可分辨）| 🔴 **轉紅** | 跨實體那次不再是 Error，`.message.replace` 這一行會炸 |
| 22（RLS 以主鍵拒絕）| 🟢 **維持綠** | 它用 `clientFor(['SG1'])` 直接問，**根本不經過 controller** |
| 單元測試 21 條 | 🟢 **維持綠** | 注入的是假 repo，不碰真範疇 |

**預測結果：2 紅（20, 21）· 2 綠（19, 22）。**
⭐ 「22 維持綠」是這個預測裡最重要的一格 —— 若它跟著轉紅，代表 20 與 22 測的是同一層，
那第四條範疇測試就是重複而不是獨立佐證。

### 中性化實測結果 —— **5/5 與預測相符**

```
Tests: 2 failed, 22 passed, 24 total
  ● risk module (integration) › byId › 20. refuses an id that exists in another entity — 404, not 403
  ● risk module (integration) › byId › 21. an id that never existed is refused identically — no existence oracle
```

| 測試 | 預測 | 實際 |
|---|---|---|
| 19 | 🟢 | 🟢 |
| 20 | 🔴 | 🔴 |
| 21 | 🔴 | 🔴 |
| 22 | 🟢 | 🟢 |
| 單元 21 條 | 🟢 | 🟢（**21 passed**，中性化狀態下實跑）|

還原後 `git diff --stat` 只剩 byId 的 33 行，無中性化殘留。

> ⭐⭐ **最後一格是這次中性化真正買到的東西，而它不是好消息**：
> **21 條單元測試在範疇完全失效的情況下全部維持綠。** 它們注入假 repo，
> 所以「跨實體讀被拒絕」這件事**沒有任何單元測試看得見** —— 那 5 條新的 byId 單元測試
> 測的是 controller 對 `find()` 結果的處置，不是範疇。
> ⇒ 若哪天整合測試因為「太慢」被移出 CI 的必要 gate，**約束 8 就會失去它唯一的機械守衛，
> 而 dashboard 上的測試數字幾乎不會動**（480 → 476）。這正是 `AD-VacuousScopeTest-1` 家族的形狀：
> 綠燈的覆蓋率不等於被覆蓋的風險。

### 1.2 Dev seed

**`apps/api/prisma/seed.ts`** — 冪等 upsert，固定 id，跨兩個 entity。
`npm run prisma:seed`（新 script，用 Node 22 原生 strip-types + `--env-file`，**不新增依賴**）。

| AC | 證據 |
|---|---|
| **AC-2 冪等** | 連跑兩次，`select count(*) from risks` **12 → 12**（第一次由 5 變 12，第二次不動） |
| **AC-3 跨兩實體** | seed 自己回報資料庫的實況（不是回報自己送出的東西）：`SG1: 9` · `HK1: 3`。且它在 `counts.length < 2` 時**主動拋錯** —— 單邊 fixture 是這條 AC 存在的唯一理由 |
| **guardrail 7** | 零人名、零 email、零帳號／卡號形狀的數字；`owner_user_id` / `created_by` 全部留 NULL —— 在這裡編一個人就是編造 PII |

設計上三個非顯而易見的決定，都寫進檔頭：**(1)** 以 owner 連線（`DATABASE_URL_MIGRATE`）——
跨實體寫入正是 RLS 該拒絕的，走 scoped client 的 seed 結構上只能種單邊；
**(2)** ref code 用固定的 `9xxxxx` 保留段 —— 冪等需要穩定的 unique key，而 `issueRefCode()`
每次呼叫都配下一號，用它建的 seed 每跑一次就長出一整套新資料；
**(3)** `NODE_ENV=production` 直接拋錯。

### Day 1 的兩個意外

| ID | Finding | Implication |
|----|---------|-------------|
| **D-devdb-not-empty** | plan §3.2 / R5 的前提是「dev 資料庫是空的」。實際上有 **W05 curl 煙霧測試的殘留**：5 筆 risk，**全部同名**（`Credential stuffing against the payments API`），**全部在 SG1** | 前提不對，**但結論更成立**。先接前端不會得到「成功顯示 0 筆」的假通過，會得到「成功顯示 5 筆一模一樣的垃圾」—— 一個更難察覺的假通過。而全部集中在單一 entity 意味著**「範疇過濾有效」與「範疇過濾不存在」在畫面上仍然完全相同**，正是 AC-3 要擋的東西。⛔ **這 5 筆刻意不動** —— 它們是別人的 dev 資料，soft-delete 也是狀態變更；Day 3 drive-through 會照實顯示，屆時再由使用者決定 |
| **D-seed-ungated** | `apps/api/prisma/seed.ts` **不被任何 gate 讀**：`tsconfig.json:16` 只 include `src/**/*.ts`，`lint` 是 `eslint src`，`format:check` 是 `"src/**/*.ts"` | 一個沒有任何 gate 讀過的檔案，卻是本片交付物之一。本次以**手動**補上（`prettier --write` + 獨立 `tsc --noEmit --ignoreConfig` 皆通過），並記進 BACKLOG。⛔ **不當場擴大 gate 設定** —— 那會動到 build 的 tsconfig（seed 會被編進 `dist/`），超出 plan §4 第 5 列「加一個 script」的範圍 |

### 1.x partial gate

| Gate | 結果 |
|---|---|
| `npm run lint -w apps/api` | clean |
| `npm run type-check -w apps/api` | clean |
| `npm run format:check -w apps/api` | clean —— ⚠️ **第一次紅**：python 就地編輯的三個檔不符 prettier，`--write` 修正後才綠 |
| `npm run test -w apps/api` | **484 passed / 40 suites** |
| `npm run test:int -w apps/api` | **269 passed / 21 suites** |

---

## Day 2 — 2026-08-18 — 前端接上去 (US-1, US-4)

### 先取 payload，不從 schema 推

Day 2 一開始就先把 API 跑起來 curl 真實回應，而不是從 `schema.prisma` 推斷欄位。
那個決定買到了下面整節 —— **從 model 推會得到「欄位名稱不同」，從 payload 看才會發現「五個欄位根本沒有來源」。**

| 探測 | 結果 |
|---|---|
| `GET /risks` | **9 列**（SG1 範疇；seed 4 + W05 殘留 5）。HK1 的 3 列**被正確濾掉** —— 範疇過濾在真實 HTTP 上看得見 |
| `GET /risks/:id` 範疇內 | **200** |
| `GET /risks/:id` 跨實體 | **404** |
| `GET /risks/:id` 不存在 | **404**，body 與跨實體**除了 id 以外逐字相同** ⇒ **AC-1 在真實 HTTP 上成立** |

### Day 2 的三個發現

| ID | Finding | Implication |
|----|---------|-------------|
| **D-entity-vocab** ⭐⭐ | UI 的 `@/data/opcos` 是 **13 個 OpCo**（`RSG` `RHK` `RKR` …），DB 的 `org_entities` 是 **5 個測試節點**（`APAC` `SG` `HK` `SG1` `HK1`）。**零交集**。且 `GET /risks` 回的是 `org_entity_id` **UUID**，全 repo 無端點可換成 code | 實體欄位、旗標查找、詳情頁的 `controls.filter(c => c.entity === risk.entity)` 全部落空 → `AD-EntityVocabularyMismatch-1` 🟡 P1。**兩層各自都通過自己的 gate，而這是它們第一次在同一個畫面上見面** |
| **D-five-unsourced** ⭐ | 列表頁 12 個欄位中 **5 個 API 完全沒有來源**：entity code · controls 數 · status（API 是 `identified`，畫面是 Open/Treatment/Monitored/Accepted —— **不同詞彙不是改名**）· owner · role | 使用者裁決：**能填的填真的，填不了的明講**。⇒ `NoSource` 元件 + partial DemoBadge 逐個點名 |
| **D-imp-recoverable** ⭐ | 設計的單一 `imp` 值**可以從 API 精確反推**：`scoreBefore / lkhBefore = MAX(FIN,BOP,LRY,REP,SIS)`。實測 `RISK-SG1-900003`：`12 / 3 = 4`，而 seed 的 before 是 `{fin:1, bop:4, lry:2, rep:3, sis:1}` → MAX = 4 ✅ | **不是近似，是恆等式** —— 正好是 `15-design-alignment.md` 記錄的那條偏離的另一面。⇒ 熱圖整塊可用真實資料渲染，不需要 fixture |

### 詳情頁：裁決在字面上執行不了

Day 0 裁決是「表頭接真 API，其餘留 fixture」。Day 2 發現**「其餘留 fixture」做不到**：
那些區塊全部靠 `risk.entity`（OpCo 碼）當 key，而 API 給的是 UUID ⇒ 濾成空的。
更根本的是 `risks.find(r => r.id === id)` 用 UUID 去找 fixture **必然落空**，整頁只會顯示 not-found 卡。

⇒ 使用者 2026-08-18 二次裁決：**照列表頁同一套，用 `NoSource` 標記**。
⛔ **空清單不可接受** —— 空的「關聯控制」讀起來是「這筆風險沒有控制」，那是對一筆**真實**風險的假陳述。

### 交付

| 檔案 | 內容 |
|---|---|
| `apps/web/src/lib/api/risks.ts` | NEW —— `listRisks` / `getRisk` + `RiskRow` + `ApiUnavailableError`。**零新依賴**（沿用 `app/page.tsx:45` 的 fetch pattern）。⚠️ 型別**刻意不放 `packages/types`** → `AD-RiskContractUndeclared-1` |
| `apps/web/src/components/NoSource.tsx` | NEW —— 兩頁共用，避免 AP-2 |
| `apps/web/src/components/DemoBadge.tsx` | EDIT —— 加 `partial` 變體 |
| `risks/page.tsx` · `risks/[id]/page.tsx` | EDIT —— 資料源、loading / error / not-found / unassessed 四狀態 |
| `risks.test.tsx` | NEW —— 7 條 |
| i18n × 6 檔 | 新增 16 個 key（en / zh-Hant 等價，parity test 通過）|

**三個非顯而易見的決定**：
**(1)** 拿掉了頂欄 scope 對列表的過濾 —— 範疇現在來自伺服器（D1），再濾一次是**演戲**，
只能移除伺服器已經決定要送的列；代價（切換 persona 不改變這些列）**寫在畫面上**而不是留給人發現。
**(2)** 選項為空的篩選器**整個不渲染** —— 只會說「全部」的下拉是死控件，W19 出過 25 個。
**(3)** 未評估的風險**停在表頭** —— 每個區塊都要除以或分帶那些數字，讓 0 傳下去會畫出一個
從來沒人量過的熱圖格子。

### 2.x Full gate

| Gate | 結果 |
|---|---|
| `format:check`（api + web）| clean —— ⚠️ **第二次踩同一個坑**：python 就地編輯後 4 個檔不符 prettier |
| `lint`（api + web）| clean |
| `type-check`（api + web）| clean |
| `test -w apps/api` | **484 passed** |
| `test -w apps/web` | **95 passed**（88 → 95，新增 7）|
| `build`（api + web）| clean —— `✓ Compiled successfully`，25 個靜態頁 |
| `run_all` | **9/9** |
| gitleaks · semgrep（plan R3）| 🚧 **本機未安裝**，只在 CI 有 ⇒ 解封條件：本片 PR 的 CI run |

> ⭐⭐ **這一天最該記住的一件事**：我把兩個產品畫面從 fixture 整個換成 API，
> 期間跑了三次 `npm run test -w apps/web`，**每次都是 88 passed**。
> **沒有任何一個既有測試碰到我改的東西。** 這與 Day 1 那個「21 條單元測試看不見範疇失效」
> 是同一個形狀，而且是同一天的第二次 —— 綠燈的數量與被覆蓋的風險無關。
> 新增的 7 條測試全部針對「會長得像正常畫面的失敗」：fixture 回退、兩種 404 可分辨、
> 無來源欄位變空白。

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 2（20:52 → 21:28）| **≈ 36 min** |

> ⚠️ Day 1 commit 是 16:20，Day 2 開工是 20:52 —— 中間 4.5 小時是等待，不是工時。
