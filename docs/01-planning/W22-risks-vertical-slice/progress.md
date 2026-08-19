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

---

## Day 3 — 2026-08-19 — Drive-through (US-5)

### 3.1 Clean restart ✅

啟動**之前** 0 個 node 程序、3200 與 3210 皆空 —— 所以「新程序是唯一擁有者」是
**由構造保證的，不是事後推論的**。這比「殺完再起再檢查」更強，也比 Risk Class C
要求的門檻高一階。

| 服務 | PID | wiring 生效的證據（不是「它有回應」）|
|---|---|---|
| API | **51952** | `[RouterExplorer] Mapped {/risks/:id, GET} route` —— **新端點活在這個程序裡** · `[DevPrincipal] DEV PRINCIPAL ACTIVE — EVERY entity-scoped endpoint is scoped by a hard-coded assignment (SG1), not by any credential.` · `[NestApplication] Nest application successfully started` |
| web | **51720** | `▲ Next.js 16.3.0 (Turbopack)` · `- Local: http://localhost:3200` · `✓ Ready in 7.8s` |

Ground truth（drive-through 的對照基準）：`SG1 = 9` · `HK1 = 3`（直接查 DB）。

### ⭐ D-307：從「讀 code 推論」升級為「對真伺服器量到」

Day 0 是靠讀 `layout.tsx:50` 判定 W21 的 307 歸因錯誤。今天有真伺服器，於是把它量了：

| 路徑（**未帶 session**）| 狀態 |
|---|---|
| `/risks` —— **列表頁，根本沒有 id** | **307** |
| `/risks/<存在且在範疇內的 id>` | **307** |
| `/risks/<不存在的 id>` | 307 |
| `/risks/<跨實體的 id>` | 307 |
| `/nonexistent-page` | 404 |

> ⭐ **第一行是決定性的**：列表路由**沒有 id 可言**，所以那個 307 不可能是
> 「詳情路由對找不到的 id 做導向」。第二行獨立再證一次：id 確實存在也是 307。
> ⇒ `AD-FrontendMissingIdRedirects-1` 的更正現在有**量測**支撐，不只有程式碼閱讀。

帶 session 之後（`POST /api/demo-session` → `{"ok":true}`）：

| 路徑（**帶 session**）| 狀態 |
|---|---|
| `/risks` | 200 |
| `/risks/<在範疇內>` · `/risks/<不存在>` · `/risks/<跨實體>` | **三者皆 200** |

⇒ **HTTP 層對這三者毫無區分** —— AC-6 是純 UI 層的性質（Day-0 改寫的判斷成立），
而 `AD-Real404Status-1`（不存在的 id 回 200）同步被證實。

### curl 到得了哪、到不了哪（誠實界線）

`GET /risks` 的 SSR HTML（33,343 bytes，帶 session）：

| 字串 | 在 HTML 裡？ |
|---|---|
| `Loading the risk register` · `data-source-state` · `PART REAL` | ✅ 在 —— loading 狀態與 partial badge 有 SSR |
| `RISK-SG1-` · `data-no-source` | ❌ **不在** —— 資料在 client 端 fetch |
| `Unpatched externally-facing`（fixture 第一列）| ❌ 不在 —— AC-5 在 HTML 層的旁證 |

> 順帶：SSR 出的是**英文**字串（`Loading the risk register` / `PART REAL`），
> 符合 guardrail 9 的預設 `en`（CH-040），語言在 client 端才切換 —— **不是缺陷**。

⛔ **這就是 curl 的極限，而它到不了 drive-through。** 列數比對、點擊進詳情、
逐控件走查、persona 切換 —— 全部只存在於 client render 之後。

### 🚧 3.2 Drive-through —— 阻塞於器具，不是於程式

`verification-discipline.md` 列的三種器具（真瀏覽器 / Playwright / 人）**手上一個都沒有**：

| 器具 | 狀態 |
|---|---|
| Chrome MCP 擴充 | ❌ `Browser extension is not connected` |
| Playwright / Puppeteer | ❌ 不在 `package.json`、`node_modules/.bin` 也沒有二進位 |
| 人 | ⏳ 需要使用者 |

**解封條件**：使用者連上 Chrome 擴充由我驅動，或使用者自己走查並回報觀察。

⛔ **本片因此明確標記為未完成，不是「大致可用」。**
`.claude/rules/verification-discipline.md`：gate 綠只證明零件對，curl 通過只證明 API 會回應，
**兩者都不證明人能真的用**。W22 的 AC-7 是 MANDATORY drive-through，**它尚未發生**。
本階段的正確描述是 **curl-level verified**，不是 verified。

### 本日耗時（進行中）

| 項目 | 實際 |
|---|---|
| Day 3（clean restart + HTTP 層量測）| **≈ 15 min**，drive-through 未計 |

---

## Day 3（續）— 2026-08-19 — Drive-through 實際執行

器具解封：**Playwright MCP** 連上（Chrome 擴充始終未連）。以下全部是**真瀏覽器 + 真後端 + 真 PostgreSQL**。

### 第二次 clean restart —— 抓到一個孤兒

重啟 web 時 `EADDRINUSE :::3200`。**harness 回報那個背景任務已被 kill，而進程還活著** ——
PID 51720 啟動於 **00:41**，已經跑了 8.5 小時，仍在服務 3200。
這正是 Risk Class C 的加強版：**「任務死了」與「進程死了」是兩件事**。
用 PID / PPID / StartTime 三欄逐一確認那三個程序都是我自己啟的（cmdline 相符）才殺，
殺完確認 port 釋放，再起新的。

wiring 證據取自**新程序**：
`[RouterExplorer] Mapped {/risks/:id, GET} route`（API PID 36332，09:11）·
`[DevPrincipal] DEV PRINCIPAL ACTIVE — ...(SG1)...` · web `✓ Ready in 2.3s`。

### Observed vs Intended

| # | 步驟 | 預期 | 實際 | 判定 |
|---|------|------|------|------|
| 1 | 登入 → `/risks` | 列數 == `GET /risks` 的 9，**不是 fixture 的 10** | **9 列**，ref code 為 `RISK-SG1-900001..4` + `000001..5`；`9 results` | ✅ **AC-4** |
| 2 | NoSource 標記 | 每列 4 個無來源欄位 | **41 個** = `9 × 4` + 5（W05 殘留無 category） | ✅ |
| 3 | 篩選器 | Entity / Status 不渲染（無選項） | 只剩 Category / Residual；`<select>` 計數 0 | ✅ 死控件未出現 |
| 4 | Category 篩選 | 選項來自真實資料且真的過濾 | 選項 = seed 的三個分類；選 `Access control` → **9 → 2 列**，兩列皆該分類，計數同步 | ✅ |
| 5 | 點列進詳情 | 導到同一筆 | `/risks/0000ee00-…-03` → `RISK-SG1-900003`，標題相符 | ✅ |
| 6 | 不存在 vs 跨實體 id | 渲染**完全相同** | 遮蔽 id 後 **digest `f82fe766` / 長度 1679 兩者逐位元相同** | ✅ **AC-6** |
| 7 | 停掉 API 後重載 | 明確錯誤，**不回退 fixture** | `data-source-state="error"`、0 列、**5 個 fixture 標題零洩漏**、無任何風險編號 | ✅ **AC-5** |
| 8 | 切換 scope 選擇器 | D1 的落差在畫面上說得出來 | ⛔ **見下方 D-scope-label** | ❌→✅ 修正後 |

### ⛔ Drive-through 抓到 8 個缺陷，gate 全綠時它們全都在

**這一節是本 phase 最重要的產出。** 每一個都通過了 lint / type-check / 484+95 測試 / build / run_all 9/9。

| # | 缺陷 | 為什麼 gate 看不見 |
|---|---|---|
| **D-residual-contradiction** ⭐⭐ | **兩個畫面對同一筆風險說法矛盾** —— 列表顯示 Residual `4 Low`，詳情顯示 `12 Medium`。詳情的 `residual = risk.imp * risk.lik` 算的是 **inherent**；我換了資料源沒動這條算式 | 兩個數字各自都是合法的 number，型別正確、測試沒有跨畫面斷言 |
| **D-forged-evidence** ⭐⭐⭐ | 詳情頁對一筆**真實**風險渲染：簽核鏈 `PREPARED BY .` + 「signed」、`APPROVED BY M. Tan · Regional Governance` 帶日期、**6 筆帶 SHA-256 hash 的稽核軌跡**、`append-only`、`SHA-256 chained`、`Tamper-evident`、`Record locked · tamper-evident ledger active`、`Ratified by the Information Security Committee`、`Treatment: Reduce`、`Next review: 30 Sep 2026` | 全部是 fixture 字串。**guardrail 2 / 5 的違反不是型別問題** |
| **D-badge-lies** | partial badge 在**列表頁**顯示「風險表頭是真實資料，以下的關聯控制、稽核軌跡、簽核…仍是樣本」—— 列表頁沒有表頭也沒有稽核軌跡 | 一份文案兩頁共用，測試只斷言 variant 屬性 |
| **D-scope-label** ⭐⭐ | 切到 `RSG` 後 meta 行變成「**9 risks · RSG**」而列一列沒變 —— **選擇器改的是宣稱，不是資料**。比死控件更糟：它看起來生效了 | 沒有任何測試比對「標籤宣稱的範疇」與「資料實際的範疇」 |
| **D-empty-flag-box** | 實體欄位留一個空的灰色旗標方框在破折號前，像圖片壞掉 | 純視覺 |
| **D-iso-timestamp** | 詳情頁顯示 `updated 2026-08-18T07:57:11.690Z`（含毫秒），列表頁顯示 `today` | 兩者都是合法字串 |
| **D-marker-in-prose** | 描述句變成「Weaknesses in the joiner-mover-leaver process in the **No source in the API yet** entity allow…」 | 插值成功，型別正確 |
| **D-green-shield-pill** | 我把 `Tamper-evident` 的**文字**換掉，但保留了綠色盾牌徽章 —— **綠色盾牌不管寫什麼都讀作認證通過** | 換字串是一行 diff，看起來已修好 |

> ⭐ 最後一條值得單獨記住：**只換文字不換 affordance 等於沒修**。

### 修正與再驗證

八個全部修掉並在真瀏覽器上覆驗：

- residual 改用 `score_after`（自己的 generated column），並**同步修列表頁**：拿掉
  `scoreAfter ?? scoreBefore` 的回退 —— 那個回退把 inherent 的 20 放進標題寫著 Residual 的欄位。
  副作用可見：頂端計數從 `2 CRITICAL` 變成 **`0 CRITICAL`**，因為那兩筆從未複評
- 偽造證物：`signOff` / `trail` / `cycles` 全部清空，整合性宣稱與 `Treatment` / `Next review` /
  `Ratified by` 一併不再渲染。**保留區塊標題** —— 「平台有簽核鏈」是真的，
  「這筆風險有這些簽名」不是
- badge 文案改為通用，各頁自帶具體說明行
- meta 行的 scope 改為 `server-set scope`，說明行加一句「選擇器不會過濾這張清單」

覆驗結果：`forgedStillPresent: []` · 0 筆軌跡 · 0 個 hash · 0 個 signed ·
分數卡 inherent `4×3` / residual `2×2` / target `4×3` · 描述換成 API 真實內容 ·
切到 `RHK` 後 meta 仍是 `server-set scope`、列不變、無 HK1 洩漏。

### 截圖

| 檔案 | 內容 |
|---|---|
| `artifacts/W22-drivethrough-01-risks-list.png` | 首次走查的列表（含空旗標框、舊 badge 文案）|
| `artifacts/W22-drivethrough-02-risk-detail.png` | ⛔ **偽造證物的證據**：簽核鏈、hash、tamper-evident |
| `artifacts/W22-drivethrough-03-detail-fixed.png` | residual / badge / 簽核鏈修正後 |
| `artifacts/W22-drivethrough-04-detail-no-forged-evidence.png` | 完整頁，零偽造宣稱 |
| `artifacts/W22-drivethrough-05-api-down-no-fallback.png` | **API 真的停掉**時的畫面 |
| `artifacts/W22-drivethrough-06-list-final.png` | 最終列表 |

### ⚠️ 一個未診斷的觀察

合併跑 `npm run test -w apps/api -w apps/web` 時出現過一次 **2 個 web 測試檔失敗**，
當時我正同時驅動瀏覽器。之後單獨跑與再次合併跑**都是 95/95 全綠，未重現**。
⛔ **我沒有診斷出是哪兩個**（輸出已捲走），所以這裡記成
**「觀察到、未重現、未診斷」**，不寫成 flake 也不寫成沒發生。下次合併跑時要留意。

### Final gate（Day 3 修正後）

| Gate | 結果 |
|---|---|
| `format:check`（api + web）| clean（⚠️ **第三次**因就地編輯先紅，`--write` 後綠）|
| `lint` · `type-check`（api + web）| clean |
| `test -w apps/api` | **484 passed** |
| `test -w apps/web` | **95 passed** |
| `run_all` | **9/9** |

### Drive-through Verdict

✅ **PASS** —— 8 個缺陷在真 UI 上被發現、修正、並在真 UI 上覆驗。
**AC-4 / AC-5 / AC-6 三條在真瀏覽器上成立**（不是 curl，不是測試替身）。

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 3（clean restart × 2 · HTTP 層量測 · drive-through · 8 個修正 · 覆驗）| **≈ 75 min** |

---

## Day 4 — 2026-08-19 — Closeout

### 交付

| 產出 | 內容 |
|---|---|
| `CH-042-risks-read-path-meets-the-api.md` | 單檔 1-page（phase 收尾的形式 —— 過程已在四件套裡）。⭐ Root Cause 寫的是**每一層的 gate 都把自己那一半當成全世界**（三層各自注入什麼 / 因此看不見什麼），不是「還沒做」|
| `retrospective.md` | Q1-Q7。⛔ Q5 的 AP-3 是 **0（修正後），而修正前是 8** —— 那個數字比 0 重要 |
| `CALIBRATION-MATRIX.md` | `greenfield-feature` 從 `n/a (0 pt)` → **1 pt**，KEEP 0.55 |
| `CALIBRATION-LOG.md` §1 | 新增 `greenfield-feature` 節 —— 含**逐項「有沒有藍本」對照表** |
| `BACKLOG.md` | 新增 **6** 條、更新 1 條、關閉 **0** 條；W22 pointer row |
| `RISK_REGISTER.md` | **R4 敞口性質改變** + 新增 **E5** |
| `MEMORY.md` + `memory/project_w22_risks_vertical_slice.md` | 指標 + 細節 |
| `CLAUDE.md` | **只動 2 行**（Current Phase + Last Updated）|

### ⛔ AD 關閉數 = 0，而這是刻意的

`AD-FrontendMissingIdRedirects-1` **更正而非關閉** —— 它描述的缺陷不存在（Day-0 `D-307`），
沒有東西可修。**關閉一條從來不存在的缺陷，等於在 BACKLOG 上留一條假的關閉紀錄。**

### Final gate sweep（Day 4 實跑）

| Gate | 結果 |
|---|---|
| `format:check`（api + web）| clean —— ⭐ **本次沒有先紅**（Day 1/2/3 各因 python 就地編輯紅過一次；Day 4 的檔案全部由 Write / Edit 產生）|
| `lint`（api + web）| clean |
| `type-check`（api + web）| clean |
| `test -w apps/api` | **484 passed / 40 suites** |
| `test -w apps/web` | **95 passed / 10 files** |
| `build`（api + web）| `✓ Compiled successfully in 39.3s`，25 個靜態頁 |
| `run_all` | **9/9** |

> ⚠️ **gate 射程聲明**：gitleaks 與 semgrep **本機未安裝，只在 CI 存在**。
> 且 `apps/api/prisma/seed.ts` **不被 type-check / lint / format 任何一個讀到**
> （`AD-SeedFileUngated-1`），本次以獨立 `tsc --noEmit` + `prettier --write` 手動補驗。
> ✅ **兩個掃描器已於 PR #86 的 CI 解封 —— 見下節。**

### ✅ PR #86 CI —— 6/6 綠，而「綠」不是解封條件，「讀出來的覆蓋」才是

| Check | 結果 |
|---|---|
| gates | pass 2m45s |
| 映像 build + 啟動探測 | pass 1m37s |
| 依賴漏洞 — SCA | pass 15s |
| 靜態安全 — SAST（semgrep）| pass 42s |
| 憑證外洩 — gitleaks（全歷史）| pass 17s |
| 容器映像 — trivy | pass 24s |

**gitleaks —— 決定性**：`264 commits scanned` · `scanned ~16871221 bytes (16.87 MB) in 8.01s` ·
**`no leaks found`**。指令是 `gitleaks detect --source . --config .gitleaks.toml`，
**無 path filter**，checkout `fetch-depth: 0` ⇒ W22 那四個 code commit 在歷史裡。

**semgrep —— 需要多做一步**。`Ran 465 rules on 324 files: 0 findings` ⛔ **不回答
「`seed.ts` 在不在那 324 個裡面」** —— 那是拿聚合數回答一個要讀內容才能回答的問題
（`feedback_evidence_must_support_claim` 的「命中數當證據」形態）。

改成**把排除集合列完**，三個算術獨立收斂：

| 維度 | 追蹤檔數（targets `apps packages scripts infra`，排除 `**/generated/**`）| 在 `test/` `tests/` 內 | 差 | CI log 報的 |
|---|---|---|---|---|
| ts | 232 | 1 | **231** | **231** ✅ |
| python | 15 | 3 | **12** | **12** ✅ |
| 總計 | 331 | 7 | **324** | **324** ✅ |

被跳過的 7 個逐檔列名：`apps/api/test/int-db.js` · `int-env.js` · `int-global-setup.js` ·
`apps/web/test/server-only.stub.ts` · `scripts/lint/tests/test_{backlog_counts,sha_anchors,workflow_placeholders}.py`。

⇒ `apps/api/prisma/seed.ts` 是 `.ts`、在 `apps/` 底下、不在測試目錄 ⇒
**它在 semgrep 掃的那 231 個 ts 檔裡面**。plan R3 的兩個 🚧 **解封**。

### ⚠️ 順帶量到的：SAST 完全不看測試目錄

本 repo **沒有 `.semgrepignore`**，用的是 semgrep 內建預設，而那份預設排除 `test/` 與 `tests/`。

⛔ **`int-global-setup.js` 不是一般測試檔** —— 它以 **schema owner 身分連真資料庫**
並插入跨實體 fixture，是本 repo 權限最高的執行路徑之一，而它**零 SAST 覆蓋**。

⇒ `AD-SemgrepSkipsTestDirs-1` 🟡 P1。⛔ **不當場修**（節流閘：順路發現、不阻塞、非安全事故），
且它是治理工具，受每 phase 1 個 CH 的配額約束。

### ⛔ 第二輪 CI：一個 docs-only commit 弄紅了 `映像 build + 啟動探測`

`6263e2f` 只動 `docs/` 與 `memory/`，而 `映像 build + 啟動探測` **fail 1m6s**（第一輪 pass 1m37s）。

**先排除「是我改壞的」——用構造，不用推測**：image build 輸入
（`apps` `packages` `docker` `Dockerfile*` `package.json` `package-lock.json` `smoke-probe.mjs` `.github`）
變更 **0 個檔**，且 `.dockerignore:31-32` 本來就把 `docs` 與 `memory` 排除在 build context 外
⇒ **受測產物與通過那輪逐位元相同**。

**失敗的形狀**：

```
02:11:33.60  docker run（API 容器）
02:11:33.75  docker ps → "Up Less than a second"
02:11:33.76  Probe api 開始
02:11:34.06  ##[error]Process completed with exit code 13
             Warning: Detected unsettled top-level await at smoke-probe.mjs:288
```

⭐ **決定性的是「沒有出現的那一行」**：`retryUntil` 的逾時路徑會印
`[smoke:api] FAIL — timed out after 90s ... Last seen: <reason>`。**它一行都沒印，程序只活了 0.3 秒。**
⇒ 這不是逾時 —— `await check()` 的 promise **從未 settle**，事件迴圈空掉，Node 以 13 退出。

**對照組（re-run，pass 1m38s）推翻了我第一個假設**：

```
02:16:47.39  "Up Less than a second"
02:16:47.40  Probe 開始
02:16:48.55  [smoke:api] PASS — {"status":"up","db":"up"}
```

⇒ 服務**約 1.2 秒**就答得出 `/health` 且 `db:"up"`。所以**不是慢啟動、也不是競態** ——
我原本寫「NestJS 不可能在 0.16 秒的間隔內起完」，那個推論**錯了**，那個間隔是設計如此且正常運作。
真相更窄：**失敗那次連一個 1 秒的重試週期都沒走完**。

⇒ `AD-SmokeProbeHungFetchBypassesDeadline-1` 🟡 P1 —— 根因是
`scripts/smoke-probe.mjs:152` 的 `fetch` **沒有 per-attempt timeout**（無 `AbortSignal.timeout`）。
`retryUntil` 只保護得了「reject 得夠快」的失敗；**一個既不 resolve 也不 reject 的 fetch 繞過整個迴圈**。
⛔ **不編造 undici 為何不 settle** —— 從 log 判斷不出來；可證的只有「90 秒的守衛沒有被執行到」。
⚠️ 歸因誤導本身也是缺陷：它長得像「映像 build 掛了」，而不是「探測沒等到服務」。

### ⭐ 那個未診斷的測試失敗：第 3 次合併跑，仍未重現

Day 4 的 gate sweep 是**合併跑** `npm run test -w apps/api -w apps/web`，
結果 **484 + 95 全綠**。⛔ **這不構成「它不存在」的證據** —— 差別在於這次**沒有同時驅動瀏覽器**，
而 Day 3 那次有。`AD-UndiagnosedWebTestFailure-1` 維持開啟，
解封條件仍是「下次出現時先拿到檔名」。

### 未做（需要使用者裁決）

- 🚧 **審計 #7 的 `AD-27` / `AD-30`（ADR 層）** —— plan §9 建議夾帶於本片第一個 commit，
  checklist 4.2 註明「使用者核可才做」。**本次未取得核可，未做。**
  ⛔ **根因是「closeout 檢查表沒有 ADR 那一格」**，那才是要修的東西 —— 修那個根因
  也還沒做，因為它是治理工具（受 §Step 0.0 每 phase 1 個 CH 的配額約束）

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 4（closeout —— CH-042 · retro · calibration ×2 · BACKLOG · RISK_REGISTER · 導航檔 · final gate）| **≈ 25 min** |

> 量法：T0 = Day 3 commit `c3d5c55`（**09:30:38**）之後的第一個動作 ≈ **09:31**，
> T1 = closeout commit。⚠️ 對照 plan §7 的 closeout 估算 **2 hr** ⇒ ratio ≈ **0.21**。

### Phase 總計

| 項目 | 值 |
|---|---|
| Day 0 + 1 + 2 + 3 + 4 | 20 + 35 + 36 + 75 + 25 min = **3.18 hr** |
| Committed（plan §7）| 6.9 hr（bottom-up 12.5 × mult 0.55）|
| **Ratio** | **0.46** —— **UNDER** band |

⭐ **四天四筆時間全部在當日收尾當下寫下**，本專案第一次。
`AD-CalibrationNoTimeRecord-1` 前三次都是事後由 commit author date 反推。
