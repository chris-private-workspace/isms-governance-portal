# Phase W24 Progress

**Phase**: W24 — Unclaim the platform, wire policies, guard the prose
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W24-policies-prose-guard`

---

## Day 0 — 2026-08-19 — Plan-vs-Repo Verify

**T0**: `2026-08-19T07:44:24Z`（15:44:25 CST）—— 蓋在**執行開始**、讀第一個執行期檔案之前，
與 W18 同量法。⚠️ recon + plan 起草發生在 T0 **之前**，不計入本片分子
（那是 `AD-CalibrationT0PlacementShift-1` 的已知窗口問題，本片沿用 W18 的放置以維持可比性）。

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | ⭐⭐ **`AD-UndiagnosedWebTestFailure-1` 的機制找到了，而且是一行 config**。`vitest.config.mts:74` 的 `poolOptions: { forks: { maxForks: 4 } }` **被 vitest 4 移除**（每次執行第 4 行都印 `DEPRECATED test.poolOptions was removed in Vitest 4`）⇒ W19 寫在 `:64-73` 的限流**從未生效過**。實測同一負載下：`npm run test` → `Test Files 1 (1)` · `Errors 9` · exit **1**；`npx vitest run --maxWorkers=4` → **`Test Files 10 (10)` · `Tests 95 (95)`** · exit **0** | plan §8 R5 的緩解（把檔數當斷言）擋得住症狀，擋不住根因。修法是 `maxWorkers: 4`，**不在 plan 的 File Change List** ⇒ 範圍 +1 檔 | 🔴 需改 plan |
| **D2** | ⭐ **`/dashboard:1059` 的 Top residual risks 用 fixture id 連到已接 API 的 `/risks/[id]`**：fixture id 是 `RSK-1042`，API 要的是 uuid `0000ee00-…` ⇒ 每一個連結**必定打到 404 畫面**。`risks/page.tsx:555` 用的是 `r.routeId`（W22 引入以解決這件事），dashboard 沒跟上 | plan §9 把它寫成「同一資料一真一假」，實為**點了就壞**。W22 的接線遺留，不是本片造成 | 🔴 BACKLOG（本片不修，§Step 0.0 無例外適用） |
| **D3** | ⭐⭐ **`/policies/[id]` 接 API 後只剩 3 個真欄位**。10 個區塊逐一對照：標題 / refCode / status ✅ · `meta`(category·owner) ⛔ · `side.document`(檔名·格式·大小·頁數) ⛔ · `side.publication`(published·uploaded·nextReview·attestation) ⛔ · `side.versions`(3 列版本歷史) ⛔ · `side.toc` + 文件預覽(4 頁，**9 份 fixture policy 共用同一份內容**) ⛔ · `attByEntity`(13 列) ⛔ · `linkedControls` ⛔（controls 未接）· download/print/zoom/pager 操作在 fixture 文件上 ⛔。對照 W22：`risks/[id]` 接完留下 **9** 個真欄位 | plan §8 R1 的門檻寫成「欄位比例」，而真正的問題是**這一頁的後端還沒到**。⇒ **需使用者裁決**（見下方 §待裁決） | 🔴 需使用者裁決 |
| **D4** | `/policies` 列表頁 8 個渲染欄位中 **4 個**無 API 來源（`category` / `owner` / `nextReview` / `att`），1 個部分（`version` `v4.1` vs Int `1`）。**恰好一半，plan §8 R1 的「> 一半」字面不觸發**。⚠️ 但 R1 沒預料到：`page.tsx:113` 的 **category 篩選器整個依賴無來源欄位** ⇒ 接完會空掉 | 控件死亡 ≠ 欄位留白。R1 的判準要補一句 | 🟡 小調整 |
| **D5** | ⭐⭐ **`/controls/[id]` 仍在做 `/risks/[id]` 已被明令禁止的事**：`:305-318` 綠掛鎖 + `Record locked · tamper-evident ledger active`（`deep.en.json:175`，與 risks 移除的 `:3` 是同一組 key）· `:976-1050` 三個簽名含 `M. Tan · Regional Governance`（15 May 2026）· `:1088-1135` `Tamper-evident` + `append-only · SHA-256 chained` + 5 列 hash · `:730` 3 份 sha 證據 | 屬**存量層**，使用者已裁決不動。⭐ 但它是本片守衛必要性的**最強證據**：同一形狀、同兩條 guardrail，W22 只修了一邊，而**沒有任何東西會提醒另一邊** | ✅ 確認無誤（進盤點） |
| **D6** | **`data/notifications.ts` 是死檔** —— 全樹零 import；topbar 通知抽屜用的是 `AppShell.tsx:204-226` 的**區域常數**，內容與 fixture **完全不同**。而該檔檔頭寫著「Screens consuming it must render the demo marker」，那個 consuming screen 不存在 | AP-1（旁支代碼）+ AP-7（註解引用不存在的消費者）。貢獻 0 條到盤點 | 🟡 BACKLOG |
| **D7** | **`AppShell.tsx:553` 硬編碼 `rating: 'A'`**，而 `lib/posture.ts:115` 的 `regionPosture()` 正為此存在且 `dashboard:121` 有用。手算 13 個 OpCo posture 的中位數**今天剛好也是 A** ⇒ 畫面上看不出來 | 「同一治理宣稱兩個來源」的漂移風險，非今日錯誤 | 🟡 BACKLOG |
| **D8** | 🔴 **guardrail 9 的實質違反（不是措辭）**：`riskProg.doc.classificationValue` EN = `"Restricted"` / ZH = `「機密」`。**這是兩個不同分級** —— 本 repo 自己的詞彙表把兩者分開（`details.zh-Hant.json:230,231` 限閱 vs 機密；`forms.zh-Hant.json:155,156` 同）。繁中版把風險管理程序這份受控文件標成了**比英文高一級**的分級 | 治理宣稱本身的偏離。`GLOSSARY.md`（106 行）**未登記**這組術語 ⇒ 是新發現 | 🔴 BACKLOG |
| **D9** | `deep.zh-Hant.json:6` 錯字：「這個畫面上沒有任何**捷造**的東西」應為「**捏造**」。對應英文 `deep.en.json:6` = "Nothing on this screen is invented." | 小，但那句正是**平台對自己資料誠信的宣稱** | 🟡 BACKLOG |
| **D10** | 盤點補掃：`/risk-programme` **8 → 29 條**（+21：版本鏈 5 · 文件管制 5 · 送審文件組 4 · 登錄冊列 4 · 表頭 3）· **shell 每頁 +4 條**（綠光暈圓點 · 範疇選單 14 顆 posture 點 · APAC 硬編碼 `'A'` · 通知抽屜 6 列）· `/controls/[id]` +5 群 · `/isms-profiles` +3 | 盤點總數自 156 上修；US-5 用補掃後的數字 | ✅ |
| **D11** | **`tok('G')` 確認是綠** —— `tok.ts:46-48` → `--rag-g` = `#1E8A5C`（light）/ `#3FB07C`（dark），`tokens.css:36,90`。default 分支落到灰 `#7C8794`，不會誤染綠 | 草稿全部「綠燈=是」判定**成立，不需推翻** | ✅ |
| **D12** | **D-white-tick 成立**：`audit-issues/[ref]/page.tsx:716-717` 外框有 `a.done ?` 條件，但 `:723-734` 的 `stroke="#fff"` 勾**無條件渲染** ⇒ 未完成步驟 = 透明底 + 白勾 | 「只換文字不換 affordance」的**鏡像版本**：affordance 的狀態邏輯只做了一半 | 🟡 BACKLOG（plan §9 已預留） |
| **D13** | **Prong 1 / 2.5 / 3 零 drift**：6 個 NEW 檔全不存在、11 個 EDIT 檔全存在、3 個父目錄齊備、`CH-044` 未被佔用；`policies/` 底下只有兩個 `page.tsx`（零子元件檔、零 local 元件宣告）；`prisma migrate status` = `Database schema is up to date!`（25 migrations） | plan 的路徑與 schema 假設全部成立 | ✅ |
| **D14** | 盤點合併覆蓋核對：兩輪 agent 合計讀完 `data/` 23 檔 + `data/extended/` 24 檔 + 27 個 `page.tsx` + shell 全樹 + 9 份 `en` + 9 份 `zh-Hant`。**兩輪都漏的只有 2 檔**，我親自補讀：`permMatrix.ts`（11 列角色權限矩陣，依收斂規則排除 ⇒ **0 條**，且**有被消費**於 `admin/page.tsx:450`）· `adminSections.ts`（11 個導覽區塊定義 ⇒ **0 條**） | 覆蓋完整 | ✅ |
| **D15** | ⚠️ **我自己踩了 `AD-UndiagnosedWebTestFailure-1` 的解封條件**：它明寫「下次保留完整輸出」，而我第一次跑用了 `\| tail -20`，把那 9 個 error 的內容連同 exit code 一起丟掉 —— Bash 回報 `exited with code 0` 而 npm 實為 `code 1`。**與 `AD-ShaDetectorConsoleEncoding-1` 同形，這是第 2 次** | 量測方式吃掉紅燈。⇒ 「它沒有紅」這個描述要更正：**vitest 有紅（exit 1），是管線把紅吃掉了** | 🔴 修正 AD 描述 |
| **D16** | plan 起草時把 baseline 的 build 寫成 `✓ 25/25`，**那是錯的** —— 實測 **31 routes**（29 page + `/_not-found` + `/api/demo-session`）。25 是我從 W23 摘要抄來的數字，數的不是同一個東西（W21 的「29 routes」數的是 page route） | `AD-ProxyMetricAsAnswer-1` 的形狀：**拿一個數字回答另一個問題**。plan §0 已更正並保留原值 | 🟡 已修 |
| **D-baselines** | api test **484 / 40 suites** · api int **269 / 21 suites** · web **95 / 10 files**（⚠️ 需 `--maxWorkers=4`；`npm run test` 現況 `1 (1)` + **exit 1**）· lint **0** · type **0** · build `✓ Compiled successfully` / **31 routes** · `run_all` **9/9**（31 pre-doc，E1-E5 clean，E5 landed-gate ACTIVE） | 基線完整；web 那一格**帶條件**，Day 1 US-3b 修掉該條件 | ✅ |

### Prong 覆蓋

- **Prong 1（path）**: 20 個路徑驗證（6 NEW + 11 EDIT + 3 父目錄）+ CH 編號，**0 個漂移**
- **Prong 2（content）**: 7 個宣稱驗證（D-policy-fields · D-record-claim-set · D-fetch-direct ·
  D-seed-policy · D-white-tick · D-dashboard-fixture-risks · D-inventory-gaps），
  **6 個漂移**（D1-D4 · D6 · D12）
- **Prong 2.5（child tree）**: `policies/` 全樹掃描 —— 2 個檔、0 個子元件、0 個 local 元件宣告
- **Prong 3（schema）**: `Policy` 13 欄 + `PolicyStatus` 6 值 + migration head，**0 個漂移**

### D-fetch-direct 結果（集合 A 的導出方式驗證）

| 表面 | 呼叫 | 對守衛設計的意義 |
|---|---|---|
| `app/login/page.tsx:203` | `fetch('/api/demo-session')` | login **今天就是混血畫面**（plan §0 已記） |
| `app/page.tsx:45` | `fetch(${API_URL}/health)` | W01 scaffold，不渲染記錄 |
| `components/shell/AppShell.tsx:247` | `fetch('/api/demo-session', DELETE)` | ⭐ **shell 自己就符合「集合 A」的定義** ⇒ plan §3.4 的掃描面設計**由這條獨立確認**，不是我硬加的 |

### D-record-claim-set 結果（US-4 規則 1 的標的量）

`/policies/[id]` 的 13 條中，**指得到 API 欄位的只有 1 條**（status pill → `status` enum，且詞彙需對映）。
⇒ plan §8 **R2 的風險（零標的）不成立**，反向成立：標的極充足。

### Go / No-Go

**範圍變動**: ~15%（+1 檔 vitest config；US-3 的形狀待裁決）→ **繼續，但 D3 需使用者裁決後才動 US-3**

### 使用者裁決（Day-0 結束時提交）

1. **D1 vitest 根因** → **修（一行）**。範圍 +1 檔，成為 US-3b。
2. **D3 `/policies/[id]`** → **只接列表頁**。詳情頁保持整頁 fixture，解封條件寫進 plan §9。

---

## Day 1 — 2026-08-19 — 平台自宣稱 + seed + vitest 根因 (US-1, US-2, US-3b)

### Today's Accomplishments

- **1.1** Read `i18n-glossary.md` — ⭐ 它的 §最重要的一條當場生效兩次（見下方 Discoveries）
- **1.2 US-1 平台自宣稱** — `auth.claim1` / `claim3` / `shell.env.meta` × 2 語言 + 2 個 affordance
- **1.3 US-3b vitest 根因** — `poolOptions` → `maxWorkers: 4`，`:64-73` 註解改寫不刪除
- **1.4 US-2 dev seed** — `POLICIES` 8 筆（4 SG1 / 4 HK1），六個 lifecycle 狀態，1 筆軟刪除
- **Day 0 + Day 1 wall-clock：46 min**（T0 `07:44:24Z` → `08:30:41Z`）
  ⚠️ 含大量**背景等待**（兩輪盤點 agent、5 次測試套件），非純工作時間 ——
  `AD-CalibrationIdleWindow-1` 的已知問題。B1 對這兩天估 6 hr（ratio **0.13**）、
  B2 估 2.1 hr（ratio **0.37**）⇒ **B2 明顯更接近，但兩者都高估**

### Issues / Discoveries

- ⭐⭐ **三條 claim 不是同一類，而我 plan 裡把它們當成一批處理是錯的**。逐條驗證後：
  `claim1`（SOC 2 + ISO 27001 certified）**假** · `claim2`（tamper-evident append-only
  audit trail）**真** —— `audit-trail/chain.ts` + `verify.ts` + migration
  `20260814065711_audit_log` + `AUDITED_MODELS` 15 個模型 · `claim3`（Enterprise SSO &
  enforced MFA）**假** —— `apps/api/src/identity/` **只有 `.gitkeep`**，且
  `demo-session/route.ts:9` 自己寫著 *"There is no password, no token, no credential of
  any kind"*。⇒ **只改假的兩條，真的那條不動**。這正是 §2.2 那個具名檢查項該有的做法：
  逐條問「這句話今天是真的嗎」，不是整批處理
- ⭐ **`SOC 2` 有 15 處合法用途** —— `controlDetail.ts` / `riskDetail.ts` 的
  `fw: 'SOC 2', ref: 'CC6.1'` 是**框架條款參照**，一個 GRC 平台當然會引用它們。
  ⇒ **守衛規則 2 不能用 `SOC 2` 當 pattern**，要錨定認證等級（`SOC 2 Type II`）而非框架名。
  這條直接寫進 Day 2 的 detector 設計
- ⭐ **同一個「做一半的誠實化」出現第二次**：`shell.env.name` = 「示範環境 · SG-1」
  **已經是誠實的**，而它正下方的 `shell.env.meta` 不是。與 `/login`（footer 誠實、
  claim 不誠實）完全同形。W19 在兩個地方各修了一半
- **GLOSSARY §最重要的一條當場生效**：「Demonstration」在 repo 有**兩種**既有譯法
  （`auth.footer`「示範版本」/ `shell.env.name`「示範環境」）⇒ 我**沒有**自己挑一個，
  改用避開該詞的寫法（「種子資料 · 非正式環境」，沿用 `auth.footer` 的「非正式環境」）
- **`IconTick` 是三條 claim 共用的**（`.map()` 內）⇒ 要讓 `claim1` 單獨用不同符號必須改
  markup = 偏離 port（約束 6）。改 `stroke` 一行達成同樣目的，且改完三條都為真時，
  綠勾本來就不該替它們背書
- ⛔ **我自己抓到一個 seed 設計錯誤**：`approved` 原本只出現在**軟刪除**那筆上 ⇒
  它永遠不會渲染，「六個 status 全覆蓋」在畫面層其實只有 5 個。補第 8 筆（`POL-HK1-900004`）。
  ⭐ 是那個 DoD 逼我去數，而我第一次數錯
- ⛔ **我寫的 seed 斷言第一次跑就抓到東西，而抓到的是斷言自己的缺陷**：第一版用
  `polCounts` reduce（數全 DB 的 policies）⇒ 在有既有資料的 dev DB 上回報 9 而非 7 並 throw。
  改為只數 seeded ids。**斷言太寬會在任何非空 DB 上誤報**
- ⭐ **dev DB 有 2 筆手動測試資料**（`POL-SG1-000001` "First after reset" · `000002` "Second"），
  它們順帶**第一次實證了 seed 檔頭宣稱的保留段機制**：counter 走 `000001`/`000002`、
  seed 走 `900001`+，**零碰撞**。W22 只種 risks，policy counter 那時沒被用過
- ⛔⭐ **我自己的量測騙了我一次，而我當場抓到**：我先前寫「`.env` 設
  `DEV_PRINCIPAL_ENTITIES=HK1`」—— **`.env` 根本沒有這個變數**（39 行，該字串零命中）。
  那兩行來自 **`.env.example`**，因為我下的指令是 `grep .env || grep .env.example`，
  `.env` 無命中就 fallback 了，而我把 fallback 的輸出當成 `.env` 的內容。
  起疑點是 `sed -n '40,43p' .env` 沒有輸出。**`AD-ProxyMetricAsAnswer-1` 家族又一次**
  （這次是自己抓到的）。⇒ 真相：**範疇是預設的 `SG1`**（`dev-principal.ts:100` 的
  `?? ['SG1']`），API 啟動 log 也明說 `DEV PRINCIPAL ACTIVE … (SG1)`。**沒有 bug**
- ⇒ **seed 的分布因此重排**：六個 status 原本散在兩個實體，看起來平衡，
  但**其中三個只有改 env var 才看得到**。改成**六個全在 SG1**（預設範疇），
  HK1 留 4 筆做範疇對照。11 筆 / 10 live，SG1 live 8 筆涵蓋六個 status（psql 逐項確認）

### Remaining for Next Day

- **Day 2 開始前要問使用者**：`approved` / `under_revision` / `retired` 三個狀態的繁中譯法
  —— `GLOSSARY.md` **未收錄**，依 §最重要的一條不可自己挑。既有三個是
  「已發布」/「審查中」/「草稿」
- `STATUS` 對映要從 3 個擴到 6 個（`page.tsx:63-67`）。⭐ **只有 `published` 該是綠** ——
  那是唯一「這份政策現在有效」的狀態；`approved`（已核准待發布）給綠就是本片守衛要防的東西

### Notes (Day 1)

- **Day 1 gate**: lint **0** · format **clean ×2** · type **0** ·
  web **`Test Files 10 (10)` / `Tests 95 (95)`**（**無旗標**，零 Errors，零 DEPRECATED）
  · seed 連跑兩次**逐字相同**（冪等）· seed.ts 獨立 `prettier` + `tsc --noEmit` 皆 0
  （`AD-SeedFileUngated-1`：它不被 workspace type-check 覆蓋）
- vitest 修復前後同機對照：`Duration 82.65s` → **`40.64s`**，`environment 160.85s` → `82.90s`

---

## Day 2 — 2026-08-19 — 讀取路徑 + 守衛 + 盤點 (US-3, US-4, US-5)

### ⭐ §2.2 具名檢查項 —— `/policies` 上每一條對「這一筆記錄」的陳述

> `AD-FixtureProseBecomesForgedEvidence-1` 的解封條件原文。**逐條問「API 送得出來嗎」**，
> 不是整批處理 —— Day 1 的 `claim2` 已經證明整批處理會把真的一起改掉。

| # | 陳述 | API 送得出來嗎 | 處置 |
|---|---|---|---|
| 1 | 每列 Status pill（值 + 顏色） | ✅ `status`，但**六值 vs fixture 的三值** | **留** —— 對映擴到六個，⭐ **只有 `published` 是綠**：`approved` 是「委員會說了 yes 而文件尚未生效」，綠色會讀成「這份政策正在運作」 |
| 2 | 每列 Next review 日期 | ⛔ 無此欄位 | **`NoSource`** —— 複審日是對某筆記錄的治理承諾 |
| 3 | 每列 Attestation % + 色條 | ⛔ 無欄位、無端點（`Attestation` 表 W14 建、零 read path） | **`NoSource`，整塊含色條** —— 0% 寬的色條仍是色條，空的進度軌讀作「已量到 0%」 |
| 4 | 每列 Category | ⛔ 無此欄位 | **`NoSource`**；篩選器經 `LIVE_FILTERS` **自動消失**（抄 `risks/page.tsx:228`） |
| 5 | 每列 Owner | ⛔ 恆 `null` —— **guardrail 7**（seed 檔頭：發明一個人就是發明 PII） | **`NoSource`** |
| 6 | 每列 Version `v4.1` | ⚠️ API 送 Int `3`；schema 無 minor version | **留**，顯示 Int。`.1` 是 mockup 發明的 |
| 7 | meta 行 `… · group-wide` | ⛔ **假** —— 實際範疇是 SG1 | **改** → `{scope}` = `server-set scope`（抄 risks 的 `scope.serverSide`） |
| 8 | 列可點 → `/policies/[id]` | ⛔ 詳情頁仍讀 fixture（id 是 `POL-301` 形狀，列表給 uuid） | **移除連結** + `policies.detailNotWired` 說明。使用者裁決 |
| 9 | 檔頭宣稱「**THE ONE SCREEN THAT IS NOT ENTITY-SCOPED**」 | ⛔ **假** —— `policies` 有 `org_entity_id NOT NULL` + RLS | **改寫檔頭** |

**第二問（Day-0 D2 補上的）—— 誰連結進這一頁？**
`/policies/[id]` 的**唯一**入口是 `policies/page.tsx:325`（同片處理）⇒ 本片不會複製
dashboard→risks 的斷鏈。⭐ 但這一問正是它抓到第 8 條的原因，**要寫進模板**。

### Today's Accomplishments

- **2.1** `lib/api/policies.ts` + ⭐ **`lib/api/client.ts`（計畫外）** —— `risks.ts` 把 fetch /
  信封 / 錯誤型別放在自己檔內因為它是唯一呼叫者；policies 是第二個，複製一份就是 AP-2。
  抽出後 risks 的 10 檔 95 測試**零變動通過**
- **2.2** 上方裁決表（9 條）
- **2.3** 列表頁接線 + `policies.test.tsx`（**8 條測試**）
- i18n **15 個新 key × 2 語言**，含六個 status 的譯法（使用者裁決：已核准 / 修訂中 / 已退役）

### Issues / Discoveries

- ⛔⭐⭐ **W19 的檔頭有一個被資料庫直接推翻的判斷**：它寫「THE ONE SCREEN THAT IS NOT
  ENTITY-SCOPED」，理由是 fragment 的副標寫著 `group-wide` 且 fixture 沒有 entity 欄位。
  但 `policies` 表**有 `org_entity_id NOT NULL` + RLS**（`schema.prisma:329`），
  `GET /policies` 只回範疇內的列。⇒ **設計交付物與資料模型在這一點上不一致，而 port 照
  fragment 走了**。依 CLAUDE.md 約束 6 的例外（領域邏輯以程序為準不以 mockup 為準），
  資料模型勝出。檔頭已改寫並保留原判斷 + 理由
- ⭐ **`risks.source.empty.title` / `.body` 是死 key** —— W22 定義了它們，而 `risks/page.tsx`
  只有一個 `view.length === 0` 分支，兩種空（範疇內零筆 / 篩選器篩掉）共用同一段文案。
  ⇒ policies **不複製這個錯誤**：`rows.length === 0` 與否走不同文案，並帶
  `data-source-state="empty"` / `"filtered"`。**死 key 是「區分寫進了字典卻沒寫進分支」的產物**
- ⛔ **我的測試斷言錯了兩次，而兩次都不是 code 的問題**：(1)
  `queryByText('policies.filter.category')` 匹配到了**表頭 `<th>`**（篩選器與表頭共用譯文）；
  (2) 改成 `getAllByText` 後換成「狀態」找到多個。正解是**用計數當斷言**
  （1 = 只有表頭 ⇒ 篩選器已消失；2 = 表頭 + 篩選器），那同時證明兩件事。
  ⚠️ 第一次的紅**看起來像 code 沒生效**，而 code 一直是對的

### Notes (Day 2)

- Day 2 gate（US-3 完成時）: web **`Test Files 11 (11)` / `Tests 103 (103)`**（95 → +8）

### ⛔ US-4 負面驗證 —— 預測（寫在執行之前）

> `AD-NegativeGate-1` 的紀律。`run_all` 全綠**不是**守衛有效的證據
> （`AD-GateGreenDecaysAfterFix-1`：W23 量到 3 個真實迴歸下 `run_all` 仍 9/9）。

**基線**（已實測）：`fixture-prose: OK (8 API surface(s) x 13 record-claim export(s);
124 file(s) checked for platform self-claims)` · exit **0** · self-test **9 assertions OK**

| # | 中性化 | 預測 |
|---|---|---|
| **N1** | `risks/[id]/page.tsx:511` 的 `const signOff: ReturnType<typeof riskSignOff> = [];` 改成 `const signOff = riskSignOff({ owner: 'x', role: 'y' });`（型別位置 → 值位置） | **恰好 1 個 rule1 violation**，訊息指名 **`riskSignOff`** 與 **`apps/web/src/app/(app)/risks/[id]/page.tsx`**，且來源檔標為 `data/extended/riskDetail.ts`。⚠️ 其餘 12 個 export **不得**同時報 |
| **N2** | `i18n/en.json` 的 `shell.env.meta` 放回 `"v2.4 · SOC 2 Type II"` | **恰好 1 個 rule2 violation**，指名 `apps/web/src/i18n/en.json`。⚠️ **不是 2 個** —— `AppShell.tsx` 只有 key，字串在字典裡 |
| **N3** | 把 `check_fixture_prose.py` 從 `run_all.py` 的 `DETECTORS` 拿掉 | `run_all` 回到 **9/9** 而**不是** 10/10 ⇒ 證明分母會動、守衛不是裝飾 |
| **N4** | `.fixture-prose.json` 的 `self_claims` 清空 | **rule2 完全靜音**（0 violation），rule1 不受影響 ⇒ 證明兩條規則獨立，且 config 真的被讀 |

⚠️ **N1 的預測有一個我不確定的地方**：`riskSignOff` 這個 identifier 在該檔出現在
import 區塊、型別位置與（中性化後的）值位置三處。若 `strip_non_rendering()` 的
import 移除不完整，會**多報**而非漏報。**多報也算預測失敗** —— 條數必須恰好 1。

### ✅ US-4 負面驗證 —— 結果（四個中性化，四個命中）

| # | 預測 | 實測 | 判定 |
|---|---|---|---|
| **N1** | 恰好 1 個 rule1，指名 `riskSignOff` + 該檔 + 來源 `riskDetail.ts`；其餘 12 個不得同時報 | `fixture-prose: 1 violation(s)` · `[rule1] apps/web/src/app/(app)/risks/[id]/page.tsx` · ``renders `riskSignOff` (a @record-claim fixture from apps/web/src/data/extended/riskDetail.ts)`` · exit **1** | ✅ **全中**（含我標為不確定的條數） |
| **N2** | 恰好 1 個 rule2，指名 `en.json`；**不是 2 個**（AppShell 只有 key） | `1 violation(s)` · `[rule2] apps/web/src/i18n/en.json` · exit **1** | ✅ **全中** |
| **N3** | `run_all` 分母從 10 變 9 | baseline **`10/10`** → 拿掉註冊 **`9/9`** → 還原 **`10/10`** | ✅ |
| **N4** | 清空 `self_claims` ⇒ rule2 完全靜音、rule1 不受影響 | 即使把 `SOC 2 Type II` 放回 `en.json`：`OK (8 API surface(s) x 13 record-claim export(s))` · exit **0** | ✅ 兩條規則獨立，config 真的被讀 |

⭐ **N1 的型別位置對照是這一組裡最重要的一個**：中性化**之前**，`/risks/[id]` 已經在
三個型別位置具名這些 export（`ReturnType<typeof riskSignOff>` 等），而守衛**保持沉默**。
若規則寫成「提到就報」，它會通過 N1、出貨，然後對 W22 唯一做對的那一頁天天開火。

### ⛔ 執行負面驗證時我犯的兩個錯（都被 gate 抓到）

1. **`git checkout -- run_all.py` 把未 commit 的註冊一起丟了** ⇒ N3 第一次跑出空輸出。
   記憶 `project-shared-working-tree` 說的「逐路徑 stage、不 stash」是同一個形狀的警告，
   而我用了它的近親。**改用檔案備份 + Edit 還原。**
2. **`path-references` 抓到我的 detector 檔頭引用了還不存在的檔**
   （`docs/09-analysis/fixture-prose-inventory-20260819.md`，那是 US-5 的產出）⇒
   baseline 一度是 **9/10**，我差點在不乾淨的 baseline 上做 N3。**先修 baseline 再驗證。**

### Today's Accomplishments（Day 2 續）

- **2.4 US-4** `check_fixture_prose.py`（two rules, closed sets）+ `.fixture-prose.json`
  + 註冊進 `run_all`（**9 → 10**）+ **13 個 export 標記**（8 檔，13 insertions，**0 deletions**）
  + **四個負面驗證全中**
- **2.5 US-5** `docs/09-analysis/fixture-prose-inventory-20260819.md` —— 27 頁（含 0 條的）·
  affordance 收斂規則明文 · 跨頁槓桿表 · `/policies/[id]` 的 9 個無來源區塊 · 覆蓋聲明

### Issues / Discoveries（Day 2 續）

- ⭐⭐ **守衛的第一次真實執行抓到的是它自己的缺陷** —— 它報了 2 個 rule2 違規，
  而兩個都是**說明該宣稱為何剛被移除**的註解。一條分不出「這個平台通過 SOC 2 Type II」
  與「我們刪掉了那句話」的規則，會讓**正確的修法變得無法記錄**。
  ⇒ 加 `strip_comments()`，並把它寫成 9 個 self-test 斷言中的 2 個
- ⚠️ **盤點的總數是約數，不是精算** —— 「一群 hash 列」算 1 條還是 5 條沒有統一定義。
  文件裡明說了這一點：**逐頁小節才是可用的單位，總數不是**。
  ⛔ 這是刻意不製造一個會被引用的假精確數字（`AD-ProxyMetricAsAnswer-1` 家族）

---

## Day 3 — 2026-08-20 — Drive-through (US-6) — 真 UI + 真後端 + 真 DB

工具：Playwright MCP（獨立瀏覽器實例）。上一次 session 用 claude-in-chrome 導航被使用者拒絕，
改用不碰使用者自有 Chrome 的實例。

### 3.1 Clean restart —— 我對程序狀態的第一個判斷是錯的

盤點時看到 API listener（`46148`）的 parent 是 `2628`，而 nest CLI 是 `39876`，
我當場判定為「Risk Class C 的孤兒 worker 形狀」。**查了才知道 `2628` 是 nest CLI 自己
spawn 的 `cmd.exe` wrapper 且活著** —— 那正是 `local-runtime-ops.md` §4 第一行寫的
「一個服務兩個進程」。⭐ 兩條 supervisor 鏈的祖先都是 `bash.exe`（上個 session 的 background
shell），所以**使用者上次 kill 掉的是 task 追蹤，不是程序** —— 兩個 server 一直活著。

| 項 | 值 |
|---|---|
| 殺掉 | 9 個 PID（api 5 + web 4），playwright MCP 4 個與 codex 1 個**不動** |
| 重啟後 | `3200` pid `21032`（09:56:43）· `3210` pid `57180`（09:58:27）—— 各 **1 個** listener |
| 晚於全部 commit | 是（最後 commit `2ce0d55` 是 2026-08-19 17:19:02） |
| startup log | `DevPrincipal` WARN（SG1 硬編碼）· `Nest application successfully started` · `listening on http://127.0.0.1:3210` · `/policies` GET/`:id`/POST 三條路由 mapped |

⚠️ **`[::1]:3210` 連線被拒是預期行為**，不是故障 —— API 綁 `127.0.0.1`，Windows 的 `localhost`
偶爾先解析到 IPv6。我的第一輪等待迴圈因此在 180 秒後回報「API 未起來」，而它其實在 09:59:21
就起來了。**三種 loopback 形式各測一次**才分辨得出來。

### ⛔ Drive-through 抓到的缺陷（gate 全綠，測試全過）

`/policies` meta 行的兩個數字**用了不同母體**：

| 篩選 | 列數 | meta 行 | 畫面上實際 under review |
|---|---|---|---|
| Published | 1 | `1 policies · **1 under review**` | **0** |
| Draft | 3 | `3 policies · **1 under review**` | **0** |
| All statuses | 8 | `8 policies · 1 under review` | 1 |

根因 `policies/page.tsx:136-139` —— `view` 是篩選後、`underReview` 從 `rows`（全集）算，
而 `:242-245` 把兩者印在同一句話裡。**在 Published 篩選下，畫面宣稱有 1 筆審查中而一筆都看不到**
—— 對讀者不可見的記錄做出的計數陳述，正是本 phase 存在的理由。

⭐ **為什麼所有 gate 都是綠的**：`policies.test.tsx:52-55` 的 shell mock 把 `trf` 的插值變數
丟掉（`void vars; return t(...)`），所以 meta 行在測試裡永遠是**未插值的模板字串**，
那一行的任何數字錯誤在這個檔案裡**結構上不可觀測**。這是 **AP-6**（mock 簡化掉關鍵行為），
不是「測試沒寫到」。修法是讓 mock 用真的 `tf()`，缺口才會露出來。

修正（本日 2 個檔）：`page.tsx:139` 改從 `view` 算 + `policies.test.tsx` mock 忠實插值 +
1 個新測試。⚠️ 新測試第一版**紅**：我用 `getAllByText(...)[1]` 取 filter button，
但 filter 區塊在 `<table>` **之前**，`[1]` 是 `<th>`，沒有 button 祖先。
改成「取有 button 祖先的那一個」——不綁 DOM 順序。

### 3.2 逐項結果（observed vs intended）

| 檢查 | Intended | Observed | 判定 |
|---|---|---|---|
| `/login` 三條 claim | 零認證宣稱 | `Built to ISO/IEC 27001 & 27017` · `Tamper-evident, append-only audit trail` · `Entity-scoped access, enforced in the database` | ✅ |
| `/login` footer | 有標示 | `Demonstration build · not a production environment` | ✅ |
| ⭐ 綠勾 affordance | 換成中性 | 三個勾 computed stroke 全為 `rgb(124,135,148)` = `--rag-n`；`--rag-g`(`#1e8a5c`) 一次未出現 | ✅ |
| persona 按鈕有效果 | 非死控件 | POST `/api/demo-session` → 200 → `/dashboard` | ✅ |
| `/policies` 列數 | == API 筆數 | **8 == 8**，逐筆 refCode 對上，六個 status 全覆蓋 | ✅ |
| 負面測試 | fixture 不得出現 | `Information Security Policy` 不在 DOM | ✅ |
| 四個無來源欄 | 標記而非空白 | 32 個 `data-no-source`（8 列 × 4） | ✅ |
| `DemoBadge` | `partial` 非 `fixture` | `PART REAL` | ✅ |
| category 篩選器 | 移除或有來源 | 已移除，只剩 `Status` | ✅ |
| `New policy` | 非死控件 | `disabled` + `cursor:not-allowed` + `opacity:.5` + title 說明理由 | ✅ |
| `Status` 篩選器 | 有效果 | 7 選項；Draft→3 列 / Published→1 列 / All→8 列，皆命中預測 | ✅ |
| 列不可點 | 無 affordance | `cursor:auto`、無 onclick、**0 連結 0 按鈕** | ✅ |
| ⭐ scope selector | 「只改 label，不改列」 | 切到 `Ricoh Hong Kong Ltd` → **8 列一列未動**，仍全 `POL-SG1-*` | ✅ 註記為真 |
| shell 迴歸 ×2 | 沒壞 | `/controls`（14 nav · 10 header btn · 10 列）·`/isms-profiles`（**shell chrome 內 0 個 RAG 綠元素**） | ✅ |
| `/policies/[id]` | shell 沒壞 | `POL-301` 正常渲染，`DEMO` badge 在，env dot 中性 | ✅ |
| ⭐ 停掉 API | 錯誤狀態，零 fixture | `data-source-state="error"` · 0 列 · `Information Security Policy` / `POL-301/318/330` **皆不在 DOM** · 「Nothing is shown rather than sample data in its place」 | ✅ |
| API 恢復 | 回到正常 | 8 列 · meta 正確 · 32 個 no-source cell | ✅ |

證據：`artifacts/day3-01-login.png` · `day3-02-policies-list.png` · `day3-03-policies-api-down.png`

### Issues / Discoveries (Day 3)

- ⛔ **本日最重要的一條**：一個「所有 gate 綠 + 8 個測試全過」的畫面，
  在真 UI 上**點第二下**（套用篩選）就露出不成立的陳述。
  `verification-discipline.md` 的三層模型在這裡是逐字成立的 —— 零件對、API 會回應，
  而人一操作就看到假話。
- ⭐ **`AD-UndiagnosedWebTestFailure-1` 可以 CLOSE，但本日量到了一個不同根因的新問題**。
  同一天、同一份 code、兩種負載：

  | 負載 | 結果 |
  |---|---|
  | 高（2 個 dev server + Playwright 瀏覽器 + codex 同時跑） | **7/11 檔**，4 個 worker 啟動 timeout，exit 1 |
  | 乾淨（兩個 dev server 都停掉） | **`Test Files 11 (11)` · `Tests 104 (104)` · exit 0** |

  ⇒ Day 1 的 `poolOptions` → `maxWorkers: 4` 修正**是有效的**（原 AD 的根因已關）。
  高負載下的 worker timeout 是**另一件事**，要開新 AD 而不是把舊的留著不關。
  ⚠️ 我在拿到乾淨負載數據前寫過「該 AD 可能不得 CLOSE」——那是拿一次高負載的執行結果
  去回答一個關於根因的問題，`AD-ProxyMetricAsAnswer-1` 的形狀。**兩種負載各跑一次才分辨得出來。**
- 📝 **待記 BACKLOG（本日新發現，皆未當場修）**：
  - API 掛掉時 `PART REAL` badge 仍宣稱「part is live data from the API」，
    而此刻畫面上**一筆 live 資料都沒有** —— 當下不成立的陳述，正是本 phase 關切的形狀。
    修它要讓 `DemoBadge` 支援動態狀態，那是**跨 25 頁的 shell 元件** ⇒ 依 Step 0.0 節流閘不當場動
  - header scope selector 顯示 `Ricoh Hong Kong Ltd` 時，sidebar 同時顯示 `SG-1`（伺服器真實範疇）。
    sidebar 說的是真話且列表註記已明說，但**同一畫面同時顯示兩個範疇**仍值得排期
  - `/policies` 的 `_warning` 引用 **ADR-0007**，而它已被 **ADR-0015 取代**（W23）⇒ orphan claim
  - **新 AD**：web 測試套件在高負載下 4 個 worker 啟動 timeout（見上表）。
    症狀是 `[vitest-pool-runner]: Timeout waiting for worker to respond`，
    ⛔ 危險之處在於**它讓套件少跑 4 個檔卻仍印出綠色的 7 passed** —— 與
    `AD-GateGreenDecaysAfterFix-1` 同一家族：**綠色可以是「沒跑到」而不是「通過」**

### Day 3 gate（乾淨負載）

`lint` **0** · `format:check` **clean** · `type-check` **0** ·
`npm run test -w apps/web` **`Test Files 11 (11)` / `Tests 104 (104)` / exit 0** ·
`python scripts/lint/run_all.py` **10/10**
⚠️ api test / api int / build 仍留到 Day 4 final gate（本日零 API 邏輯變更）

---

## Day 4 — 2026-08-20 — Closeout (US-7)

### Today's Accomplishments

- **4.1** `CH-044-unclaim-the-platform-and-guard-the-prose.md`（單檔 1-page —— phase 產出的
  變更記錄一律用單檔，過程已記在四件套裡）
- **4.2** `retrospective.md` Q1-Q7 · `CALIBRATION-MATRIX` **re-point 0.50 → 0.45** ·
  `CALIBRATION-LOG` W24 條目 · `BACKLOG`（關 2 / 新增 14 / 補 2 條既有 AD 的資料點 /
  §Shipped 加 W24 一行）· `CLAUDE.md`（**只有 2 行**）· `MEMORY.md` 指標 + subfile ·
  `RISK_REGISTER` **E5 改寫** · plan `status: active → closed`

### ⭐ Final gate（全套，含 Day 2 起未重跑的三項）

| Gate | 結果 |
|---|---|
| api test | **484 passed / 40 suites** · exit 0 |
| api int | **269 passed / 21 suites** · exit 0 |
| api build | exit 0 |
| web build | `✓ Compiled successfully in 2.7min` · **31 routes**（與 Day-0 baseline 一致，本片未加路由）· exit 0 |
| web test | `Test Files 11 (11)` / `Tests 104 (104)` · exit 0（Day 3 乾淨負載） |
| `run_all` | **10/10** —— ⭐ `status-markers` 報 `E5 landed-gate ACTIVE`，確認 `status: closed` + `PR-pending` 並存時**不 fire**（因為尚未 push），與 W23 設計的 landed gate 一致 |
| lint / format / type | ⚠️ **引用 Day 3 的實測值**（0 / clean ×2 / 0）—— Day 3 commit 之後**零 code 變更**（`git status` 只有 `.md` 與新 `.png`），所以那是**同一份 code** 的量測，不是推論代替量測。Day 4 的重跑見下 |

### Issues / Discoveries (Day 4)

- ⚠️ **我漏了 checklist §4.1 的一格 DoD**（「保留 vitest 的同機對照」），CH-044 第一版沒有那張表。
  **是回頭逐項核對 checklist 才發現的** —— 這正是 checklist 存在的理由：
  它不是給讀者看的清單，是給作者回頭對的清單。已補四列對照。
- ⚠️ **我一度打算略過 D15 不記 BACKLOG**（理由是 `AD-GrepAssertion-1` 已嚴重超長）。
  但 checklist §4.2 的 DoD **明列 D15**。⇒ 改為加一句到該條目。
  ⛔ 「這條規則已經很長了」不是跳過已核可 DoD 的理由 —— 那是把格式問題當成內容決定。
- ⛔ **`AD-ShaDetectorConsoleEncoding-1` 今天又撞到一次**：一支臨時 closeout 腳本（印 BACKLOG
  中文行以確認刪對了）死在 `cp1252`。⭐ 這證明**登記的影響面太窄** ——
  它不是某支 detector 的缺陷，是**任何印中文的 Python 腳本**在此環境的預設行為。
  已把這個更正寫進該 AD。⚠️ 崩在 `print` 而 write 在其後 ⇒ **檔案未被部分寫入**，
  且我先跑了一次 `git diff` 確認，而不是假設。
- ⚠️⚠️ **Day 4 的 lint 重跑在 15 分鐘後仍未推進，而症狀說明它不是「慢」**：
  eslint 程序活著但 **15 分鐘只累積 1.4s CPU** ⇒ 幾乎全在 I/O 等待
  （build 剛產出大量檔案，磁碟掃描把 I/O 吃滿是最可能的解釋，**未證實**）。
  ⭐ 過程中發現**兩個 eslint 實例並存**：一個是被 harness 以 7 分鐘 timeout 殺掉的前景命令
  留下的（`39424`，11:18:36），另一個是背景任務的（`42392`，11:26:17）。
  前者的輸出已無人接收 ⇒ 殺掉它、保留後者。**⛔ 判斷依據是時間戳與命令生命週期，不是「看起來像殘留」**
  （`local-runtime-ops.md` §4）。
  ⇒ **final gate 的 lint / format / type 明記為「引用 Day 3 實測 + 之後零 code 變更」**，
  ⛔ 不寫成「Day 4 重跑通過」—— 那會是捏造一個我沒看到的結果。
- ⚠️ 另兩次 gate 超時（`run_all` 300s · lint 7 min 前景）同因。依 §1 改為背景執行而非殺掉重跑
  —— **殺掉重啟是負收益**。
