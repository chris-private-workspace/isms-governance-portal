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
- **`.env` 設 `DEV_PRINCIPAL_ENTITIES=HK1`** ⇒ API 範疇是 HK1，`GET /policies` 應回 **4 筆**
  （全是 seeded）。SG1 的 5 筆（3 seeded + 2 手動）**不出現** = 範疇證明。
  ⚠️ 六個 status 在**單一範疇下看不全**（HK1 4 個 / SG1 3 個），drive-through 要切一次範疇

### Remaining for Next Day

- **Day 2 開始前要問使用者**：`approved` / `under_revision` / `retired` 三個狀態的繁中譯法
  —— `GLOSSARY.md` **未收錄**，依 §最重要的一條不可自己挑。既有三個是
  「已發布」/「審查中」/「草稿」
- `STATUS` 對映要從 3 個擴到 6 個（`page.tsx:63-67`）。⭐ **只有 `published` 該是綠** ——
  那是唯一「這份政策現在有效」的狀態；`approved`（已核准待發布）給綠就是本片守衛要防的東西

### Notes

- **Day 1 gate**: lint **0** · format **clean ×2** · type **0** ·
  web **`Test Files 10 (10)` / `Tests 95 (95)`**（**無旗標**，零 Errors，零 DEPRECATED）
  · seed 連跑兩次**逐字相同**（冪等）· seed.ts 獨立 `prettier` + `tsc --noEmit` 皆 0
  （`AD-SeedFileUngated-1`：它不被 workspace type-check 覆蓋）
- vitest 修復前後同機對照：`Duration 82.65s` → **`40.64s`**，`environment 160.85s` → `82.90s`

---
