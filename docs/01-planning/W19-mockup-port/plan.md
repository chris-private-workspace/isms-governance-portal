---
status: draft   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W19 Plan — Port the design handoff into apps/web

**Summary**: 把 `design_handoff_isms_grc_platform` 的 30 個畫面（3 shell + 27 screens）移植進
`apps/web`，依 playbook 的兩層法 —— 三支 CSS 逐字複製、fragment 的 inline style 原封不動搬進 TSX。
同時落地 demo persona 登入（**不是**認證）、清理 fixture 的三處憲章違反、並把 mockup fidelity
detector 從 SKIP 接成會叫的守衛。關掉 `AD-CssToken-1` / `AD-Mockup-3` / `AD-Port-BFSI`，
部分關掉 `AD-Mockup-2`。**Drive-through MANDATORY**（全部是 user-facing）。
非 spike（playbook 已是既有方法論）⇒ 不產 design note。

**Status**: Draft（待使用者核可；2026-08-17 起草。使用者已裁決：30 個畫面全做 · persona 選擇器 ·
Azure demo 走 rcitest 訂閱 → 切為 W20 · 時程 7 天以上）

**Branch**: `feature/W19-mockup-port`
**Base**: `main` HEAD `cd8e22b`（W18 post-merge 標籤翻新，PR #78）
**Slice**: standalone —— Wave 1 第一片前端工作；M8 的前置，但**不等於 M8**（M8 需要真 API）
**Scope decisions**: (a) inline style 原封不動搬，**不歸納成 class**（playbook §4.3 明文 + §9 首條 anti-pattern）
(b) 不裝 Tailwind —— 交付物零依賴，裝了反而要自建 hex→`@theme` 橋接
(c) 資料全部 fixture 且**每頁標 DEMO**，不接 API（`packages/types` 只有 `HealthResponse`）
(d) login 是 persona 選擇器 + httpOnly cookie，**不收密碼**（ADR-0007「no local credential store」）
(e) 文案抽進 i18n 雙字典，`zh-Hant` 為預設（guardrail 9 高於交付物英文原文）

---

## 0. Background

### The gap（`AD-CssToken-1` · `AD-Mockup-3` · `AD-Port-BFSI`；部分 `AD-Mockup-2`）

`apps/web` 今天只有 **1 個頁面**（`src/app/page.tsx`，W01 的骨架驗證頁）。

高保真設計交付物在 repo 裡躺了 10 天（2026-08-07 匯入），**零消費**。
27 個 screen fragment、273 行 CSS、23 支 fixture 沒有任何一行進過生產程式碼。

同時三條已登記的 AD 擋在移植前面，而且**沒有任何 gate 會在移植時叫**：
`.mockup-fidelity.json` 不存在 ⇒ `check_mockup_fidelity.py` 現在回 **SKIP**。

### Why it matters（缺失的能力）

平台今天**沒有任何人類可以看的東西**。34/36 個實體、27 支 migration、265 條整合測試，
全部只能透過 `psql` 或 jest 輸出觀察。旗艦賣點是「跨實體滾升儀表板」，而那張儀表板
從未被渲染過一次。

直接後果：`AD-Mockup-2`（儀表板以國家為鍵，容不下 13 OpCo）這類**結構性**問題，
到今天為止只能在紙上討論 —— 沒有 runtime 就無法證實或反駁。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `cd8e22b`）| Anchor |
|-------|--------------------------------------------|--------|
| 前端頁面 | 只有 1 個 route（`/`），無 middleware、無 route handler | `apps/web/src/app/page.tsx` |
| 設計 token | 全 hex，**無 oklch** ⇒ 紅線 7 的 `oklch(var(--token))` 會產生無效 CSS 且靜默失效 | `styles/tokens.css:24` `--primary: #2A5BD7` |
| fragment 樣式 | **`class=` 命中 0**（不只 `grc-`）；改用 inline style **2,651 處**（Day-0 D9/D10 實測） | `fragments/screens/*.html` |
| `components.css` | 56 個 `grc-*` + base.css 21 個 = **77 個 class 全部是孤兒**；檔頭自承是「same values, named」 | `styles/components.css:5-8` |
| a11y | fragments **零 `aria-`**，但 CSS 有三條選擇器依賴它 ⇒ 那三條**永遠不生效** + a11y 缺口 | `components.css:48,69,118`（D11）|
| token 掛載 | 掛在 **`[data-grc]` 屬性選擇器**，不是 `:root`；深色主題覆寫 26 個變數 | `tokens.css:4,7,67-96`（D12）|
| auth fragment | **7 個狀態**（LOGIN×3 變體 · REGISTER · FORGOT · RESET · MFA · SSO），非單一畫面 | `01-auth:11,57,79,110,138,155,173,198`（D1）|
| fidelity 守衛 | 無 config ⇒ **SKIP**，`run_all` 仍 9/9 綠 | `scripts/lint/check_mockup_fidelity.py:242-245` |
| OpCo fixture | **14 家**含 `RIN` 印度；刪該列 → 13 家 / 11 國，精確吻合參數 #4/#12 | `data/opcos.js:16` |
| 儀表板 fixture | 以**國家**為鍵，且首列 `Japan` 帶 `juris:'Japan (FSA)'`（日本金融廳） | `data/data.js:5` |
| BFSI 殘留 | AML / sanction / 對帳橫跨 **7 檔 14 處**（markup 乾淨，只在 `data/`） | `data/{catalogue,controls,notifications,issues,policies,risks,sessionPolicy}.js` |
| 認證 | `identity/` 只有 0-byte `.gitkeep`；entity scope 來自硬編碼 dev-principal | `apps/api/src/modules/policy/dev-principal.ts` |
| 測試環境 | `environment: 'node'`、`include` 不含 `.tsx` ⇒ **今天跑不了組件測試** | `apps/web/vitest.config.mts` |
| 外部字型 | `@import` 拉 Google Fonts ⇒ 與 CSP / guardrail 7 衝突 | `styles/base.css:6` |

→ 移植不是「複製檔案」。要先**建立守衛**（detector config）、**修正一條錯的紅線**
（`AD-CssToken-1`）、**清理 fixture**（三處憲章違反），才輪到 3,777 行 HTML 的機械翻譯。

### The design（兩層法：CSS 複製 · 邏輯重寫 · inline style 原封不動）

```
Layer 1 canonical   docs/06-reference/.../styles/{tokens,base,components}.css   ← 設計師唯一改這裡
        │ verbatim copy（連註解、順序都保留）
        ▼
Layer 2 adopted     apps/web/src/styles/{tokens,base,components}.css
        │ import
        ▼
        apps/web/src/app/globals.css   ← 唯一新寫的 CSS（三個 @import + self-host 字型 @font-face）

fragment (.html)  ──機械翻譯──▶  page.tsx
  {{ value }}          →  {fixture.value}          （1,099 處）
  <sc-if> / <sc-for>   →  {cond && …} / {arr.map}  （331 處）
  style="..."          →  style={{...}}            ← 原封不動，數值一個都不動
  onClick="{{ h }}"    →  onClick={handler} 或 undefined
  文案               →  t(locale, 'key')          ← en=原文, zh-Hant=譯文
```

**為何不歸納成 class**：把 2,000 處 inline style 收斂成 class 是 playbook §3 定義的
**翻譯動作** —— 每個 spacing / radius / shadow 都在「找最接近的既有 class」時被就近取整。
playbook §9 anti-pattern 目錄首條正是這件事。§4.3 明文：
「所有 mockup CSS class 名 **+ inline `style={{…}}`** 原封不動保留」。

### Ground truth（recon head-start —— 於 `main` HEAD `cd8e22b` 讀過的 code）

- `next.config.ts:50` — `output: 'standalone'` **已設**（W20 的容器部署不必再動）
- `next.config.ts:27-34` — 6 個 security header 已設，**無 CSP**
- `eslint.config.mjs:66,82` — `apps/web/**` 全歸 `ui`；`ui: ['api','ui']` ⇒ port 進來的組件互相 import 合法，
  但**不得** import `core-model` / `modules` 型別
- `apps/web/src/i18n/index.ts` — L0 `t(locale,key)` 已在位，16 個 key，雙字典 parity 有測試守著
- `apps/web/Dockerfile` — distroless production image 已可用
- `bootstrap/security.ts:136-139` — CORS 已 `credentials: true` + 具名 origin ⇒ cookie session 可直接用
- `fragments/README.md:18` — `hint-*` 屬性明示 **drop**
- `components/README.md` — 6 階段 build order；原文註記「list 畫面約佔產品 80%」

**Baselines（W18 closeout）**: api int 265/21 · api unit 480/40 · web 10/1 ·
coverage 92.14/91.77/98.98/93.56 · run_all 9/9 · lint/type/build 兩 workspace EXIT=0。
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-frag-count** — grep 確認 fragment 實際檔數與行數（plan 用 30 / 3,777，來自 recon）
- **D-inline-style** — 量測 `style="` 實際處數（plan 用 ~2,000）→ 影響 §7 估算
- **D-grc-zero** — 重驗 `grc-` 在 fragments 命中確實為 0（這是 (a) 決策的唯一依據）
- **D-japan-spread** — Japan 當營運實體的實際檔數（`AD-Mockup-3` 稱 5 檔，recon 量到 4 檔 7 處）
- **D-detector-config** — 確認 `.mockup-fidelity.json` 不存在且 detector 現況為 SKIP
- **D-css-lines** — 三支 CSS 行數（96/54/123）與 detector 的 `canonical_css` 單檔限制如何調和

## 1. Phase Goal

在 `apps/web` 交付 30 個可導覽的畫面，視覺**逐行對應** mockup fragment，
資料為明確標示的 DEMO fixture，登入為 persona 選擇器。
證明方式：(a) `diff` 三支 CSS 只剩已聲明差異；(b) 代碼層並排比對每個 fragment vs page.tsx
（playbook §7.3 —— 這是保真度的真 gate，自動化 gate 不能代替）；
(c) **MANDATORY drive-through** 真瀏覽器走完 30 個畫面，逐控件確認；
(d) `run_all` 含**已啟用**的 `check_mockup_fidelity`。不產 design note（非 spike）、不產 ADR。

## 2. User Stories

- **US-1**（設計系統）: 作為前端開發者，我希望三支 canonical CSS 逐字複製進 `apps/web` 且有機械守衛，
  以便任何人改動 Layer 2 時 CI 會叫，而不是靠 review 發現。
- **US-2**（app shell）: 作為區域 ISO，我希望看到左導覽 rail + topbar + scope/period 切換，
  以便在 13 家 OpCo 之間移動而不迷失所在位置。
- **US-3**（27 個畫面）: 作為高管，我希望瀏覽儀表板、風險、控制、政策、事件等全部畫面，
  以便理解這個平台交付後長什麼樣。
- **US-4**（fixture 誠實化）: 作為專案負責人，我希望展示資料符合憲章（13 OpCo / 無印度 /
  日本非 OpCo / 無金融業殘留）且每頁標 DEMO，以便展示不會在會議上被指出事實錯誤。
- **US-5**（demo 登入）: 作為展示者，我希望選一個 persona 進入系統，
  以便呈現角色×實體切換這個賣點，**而不引入任何憑證儲存**。
- **US-6**（drive-through）: 作為使用者，我希望每個控件都是真的（可點 / 有效果 / 標籤真實 / 結果渲染），
  以便不會在會議上點到死按鈕。**MANDATORY。**
- **US-7**（closeout）: 作為維護者，我希望 parity 帳本與 drift log 存在，
  以便下一片知道哪些路由已對齊、哪些還沒。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW — 設計系統（US-1）
  apps/web/src/styles/tokens.css          verbatim copy of Layer 1
  apps/web/src/styles/base.css            verbatim copy（@import 那行例外 → 見 3.1）
  apps/web/src/styles/components.css      verbatim copy（複製但不強求消費）
  apps/web/src/app/globals.css            唯一新寫的 CSS：3 個 import + @font-face
  apps/web/public/fonts/*.woff2           self-host IBM Plex（取代 Google Fonts）
  .mockup-fidelity.json                   detector config —— 把 SKIP 變成會叫

NEW — shell + 畫面（US-2, US-3）
  apps/web/src/app/(app)/layout.tsx       app shell（fragment 02）
  apps/web/src/app/(app)/<27 routes>/page.tsx
  apps/web/src/components/**              從 fragment 抽出的共用 primitive
  apps/web/src/components/DemoBadge.tsx   DEMO 標記（US-4 的執行點）

NEW — fixture（US-4）
  apps/web/src/data/*.ts                  23 支 fixture 移植 + 三處清理 + 型別

NEW — demo 登入（US-5）
  apps/web/src/app/login/page.tsx         persona 選擇器（fragment 01 的視覺）
  apps/web/src/app/api/demo-session/route.ts   httpOnly cookie 寫入
  apps/web/src/lib/demo-session.ts        persona 定義 + production 拒絕

EDIT
  apps/web/vitest.config.mts              environment → jsdom；include 加 .tsx
  apps/web/package.json                   + jsdom / @testing-library/react / @vitest/coverage-v8
  apps/web/next.config.ts                 + CSP（字型 self-host 後可收緊）
  apps/web/src/i18n/{zh-Hant,en}.json     大量新 key（en=原文, zh-Hant=譯文）
  apps/web/src/app/page.tsx               改導向 /login 或 /dashboard
  docs/rules-on-demand/mockup-fidelity.md 修紅線 7（`AD-CssToken-1`，一行）

NEW — 帳本
  docs/02-architecture/page-inventory.md  每條路由的 parity 狀態
  docs/02-architecture/design-system.md   primitive index + drift incident log

UNTOUCHED
  apps/api/**                             本片零後端變更
  apps/api/prisma/schema.prisma           不動
  packages/types/**                       不加 DTO（本片不接 API）
```

### 3.1 設計系統（US-1）— `apps/web/src/styles/*`

- 三支檔案**逐字複製**，連註解與順序保留。唯一允許的差異：`base.css:6` 的
  Google Fonts `@import` 改為 self-host（guardrail 7 + CSP）。
  該差異**逐條聲明**進 `.mockup-fidelity.json` 的 `ignore_diff_patterns`，
  **不是**把 `allowed_header_diff_lines` 調大 —— 後者等於靜靜容許同樣行數的真 drift（playbook §4.2）。
- `canonical_css` 欄位只吃一個路徑，而我們有三支。Day 1 決定：以 **`tokens.css`** 為
  detector 標的（token drift 直接改變所有顏色，傷害最大），另兩支的守衛落在
  §5 的並排比對。**這個限制要寫進 config 註解**，不要讓它變成隱形缺口。
- **紅線 7 修正**：`docs/rules-on-demand/mockup-fidelity.md:38` 規定一律 `oklch(var(--token))`，
  但本專案 token 是 hex ⇒ `oklch(#2A5BD7)` 是無效 CSS 且**靜默失效**。
  改為「一律 `var(--token)`，不得寫死色值」。這關掉 `AD-CssToken-1`。

### 3.2 App shell + 27 個畫面（US-2, US-3）— `apps/web/src/app/(app)/**`

- 每個 fragment → 一個 `page.tsx`，**並排逐行翻譯**（playbook §4.3）。
- inline `style="..."` → `style={{...}}`，**數值一個都不動**。
- `<sc-if cond>` → `{cond && (...)}`；`<sc-for item in list>` → `{list.map(...)}`。
- icon 是 inline SVG（Lucide 風格 24×24 stroke）⇒ **直接搬 SVG**，不裝 icon 庫、不做語意猜測對應。
- `hint-*` 屬性 drop（`fragments/README.md:18` 明示）。
- `onClick="{{ handler }}"`：mockup 有的互動要有效果；**沒有對應行為的一律不掛 handler**
  且不渲染成看起來可點的樣子 —— 死控件是 AP-3。
- **文案抽進 i18n**：`en` 填 fragment 原文（保真度可查證），`zh-Hant` 填譯文並為預設 locale。

### 3.3 Fixture 誠實化（US-4）— `apps/web/src/data/*`

**五處**必須在移植時修正，否則展示即違反憲章（Day-0 D4-D7 修訂，原列三處）：

1. `opcos.js:16` 刪 `RIN` 一列 → 13 OpCo / 11 管轄區（參數 #4/#12）。**不補 `RCN`**（`AD-Mockup-3` 明訂）。
2. **中國移除**（Day-0 D5，**原 plan 完全漏列**）—— `entity:'China'` 共 8 處跨 5 檔
   （`controls.js:6,13` · `data.js:9` · `issues.js:4,9` · `notifications.js:5` · `risks.js:6,11`）
   + `01-auth:124` 下拉一處。參數 #4 是「印度與中國**均**排除」。
3. Japan 當營運實體 **5 檔**（4 in `data/` + `01-auth:124`，Day-0 D7 判定 `AD-Mockup-3` 的數字才對）
   → 日本是 HQ 非 OpCo（參數 #12）。
4. **BFSI 殘留真實 18 行跨 6 檔**（Day-0 D6）—— 原列的「7 檔 14 處」既高估（2 個子字串假陽性：
   `Stre**aml**ine NX` · `**SAML** 2.0`）又低估（關鍵字漏了 **MAS / APRA / HKMA / BNM / PBoC**
   五個監理機關縮寫）。
5. ⭐ **`data.js` 重寫而非修補**（Day-0 D4）—— 它是旗艦儀表板的資料源，六列**全部**是金融監理框架，
   且六實體名單與 `opcos.js` 的 14 家自相矛盾。**從 `opcos.js` 的 13 家導出**，
   保留 mockup 的欄位形狀（不自行發明欄位，參數 #9），`juris` 填**管轄區名稱**
   而非編造監理機關（編造監理機關是發明領域內容）。
   ⚠️ layout **不需要動** —— Day-0 量到表格 `overflow-x:auto` + `min-width:840px` 且**無高度上限**，
   6 列變 13 列只是變長。`AD-Mockup-2` 的「結構上無法容納」指的是**資料鍵語義**
   （以國家為鍵 ⇒ SG/HK 各 2 家會擠成一列），不是版面容量。

**每個消費 fixture 的畫面掛 `<DemoBadge>`** —— 未標示的 fixture 就是 Potemkin
（`mockup-fidelity.md` 紅線 6 + `verification-discipline.md` §Mock 的誠實原則）。

### 3.4 Demo 登入（US-5）— `apps/web/src/{app/login,lib/demo-session}`

**Day-0 D1 修訂**：`01-auth` 是 **7 個狀態**不是一個畫面。使用者 2026-08-17 裁決：

| 狀態 | 處置 | 依據 |
|---|---|---|
| LOGIN **變體 A · split** | ✅ port | fragment 內只有 `loginVarA` 的 `hint-placeholder-val` 是 `true` ⇒ 設計者預設 |
| LOGIN 變體 B / C | ❌ 不 port | 三選一，非三個都做 |
| **REGISTER** | ✅ port **並修正三處** | 移除密碼欄位（ADR-0007）· Entity 換 13 OpCo · Role 換已確認六角色 ⇒ **關掉 `AD-Auth-1`** |
| **FORGOT / RESET** | ❌ 不 port | 本地帳密流程；ADR-0007「no local credential store」⇒ 密碼由 Entra 管。**記錄為 ADR 偏離**，走 `15-design-alignment.md` 的既有例外機制 —— **不是** playbook 禁止的「刪 mockup 有的東西」|
| **MFA · SSO** | ✅ port，標 DEMO | ADR-0007 明訂 OIDC + MFA ⇒ 這兩個是**未來真實流程**的視覺，不是裝飾 |

- 視覺照 fragment，但**輸入欄位換成 persona 清單**。
- **不收密碼、不存憑證、不碰 localStorage/sessionStorage**（guardrail 7 明文 + ADR-0007）。
- 選定 persona → `POST /api/demo-session` → **httpOnly + Secure + SameSite=Lax** cookie。
- 複製 `dev-principal.ts` 已驗證的誠實模式：`NODE_ENV=production` 時 **throw**、
  開機 log warning、UI 常駐 DEMO 標記。
- entity scope 由 cookie 內的 persona 決定，**不從 request 參數取**（約束 8 鐵律 3）。

### 3.x 明確不做的事

- **不裝 Tailwind** — 交付物零依賴且無 utility class 可對應；裝了要自建 hex→`@theme` 橋接，
  那是憑空增加一層翻譯（正是 playbook 要刪的東西）。
- **不接任何 API** — `packages/types` 只有 `HealthResponse`；接一個畫面就要先補契約，
  那是 M6 的工作。本片全部 fixture + DEMO 標記。
- **不做 document viewer 的真 PDF 渲染** — README:94 明示 facsimile，production 要接 PDF.js。
  照 mockup 渲染 facsimile，標 DEMO。
- **不接 AI Agent 後端** — canned string 照搬並標 DEMO；碰約束 7 的部分留給 Wave 3。
- ⚠️ **`AD-Mockup-2` 的處置於 Day-0 D4 修訂** — 原寫「不動儀表板資料結構」，但實測發現
  `data.js` 的六列**全部**是金融監理框架且與 `opcos.js` 自相矛盾 ⇒ **不重建就無法渲染 13 家 OpCo**。
  改為：**資料面重建**（以 OpCo code 為鍵，13 列），**視覺面零改動**（layout 容得下）。
  ⇒ 本片把 `AD-Mockup-2` 從「阻斷 M8」降為「資料面已解，滾升聚合語義待 M8 規格裁決」。
- **不部署** — 切為 W20（checklist 硬性 Day 0-4，塞不下）。

### 3.y Validation（US-1..US-7）

Gates: web lint EXIT=0 · web type-check EXIT=0 · web build clean ·
web test（現有 10 條不得回歸 + 新增組件測試）· api 全套不得回歸（265/21 + 480/40）·
`run_all` **9/9**（其中 `check_mockup_fidelity` 由 SKIP 轉為實跑 —— 分母不變，組成改變）。
加上 §3.2 的代碼層並排比對 + **MANDATORY drive-through**（30 個畫面）。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/web/src/styles/tokens.css` | NEW（verbatim copy）|
| 2 | `apps/web/src/styles/base.css` | NEW（verbatim copy，字型行例外）|
| 3 | `apps/web/src/styles/components.css` | NEW（verbatim copy）|
| 4 | `apps/web/src/app/globals.css` | NEW |
| 5 | `apps/web/public/fonts/*.woff2` | NEW（self-host IBM Plex）|
| 6 | `.mockup-fidelity.json` | NEW |
| 7 | `apps/web/src/app/(app)/layout.tsx` | NEW（shell）|
| 8-34 | `apps/web/src/app/(app)/<27 routes>/page.tsx` | NEW |
| 35 | `apps/web/src/components/**` | NEW（共用 primitive + `DemoBadge`）|
| 36 | `apps/web/src/data/*.ts` | NEW（23 支 fixture + 三處清理）|
| 37 | `apps/web/src/app/login/page.tsx` | NEW |
| 38 | `apps/web/src/app/api/demo-session/route.ts` | NEW |
| 39 | `apps/web/src/lib/demo-session.ts` | NEW |
| 40 | `apps/web/vitest.config.mts` | EDIT（jsdom + `.tsx`）|
| 41 | `apps/web/package.json` | EDIT（jsdom / testing-library / coverage-v8）|
| 42 | `apps/web/next.config.ts` | EDIT（CSP）|
| 43 | `apps/web/src/i18n/{zh-Hant,en}.json` | EDIT（大量新 key）|
| 44 | `apps/web/src/app/page.tsx` | EDIT（改導向）|
| 45 | `docs/rules-on-demand/mockup-fidelity.md` | EDIT（紅線 7，一行 —— `AD-CssToken-1`）|
| 46 | `docs/02-architecture/page-inventory.md` | NEW（parity 帳本）|
| 47 | `docs/02-architecture/design-system.md` | NEW（primitive index + drift log）|
| — | `apps/api/**` | **UNTOUCHED** |
| — | `apps/api/prisma/schema.prisma` | **UNTOUCHED** |
| — | `packages/types/**` | **UNTOUCHED**（本片不接 API）|
| — | `docs/06-reference/design_handoff_isms_grc_platform/**` | **UNTOUCHED**（Layer 1 是 canonical，生產不得回改）|

## 5. Acceptance Criteria

1. `diff` 三支 canonical CSS vs `apps/web/src/styles/*` → 只剩 `.mockup-fidelity.json`
   **逐條聲明**的差異（字型 `@import`）；`ignore_diff_patterns` 的排除行數被印出來。
2. `check_mockup_fidelity.py` 從 **SKIP 轉為實跑且 PASS**；`run_all` **9/9**（分母不變 —— 它本來就是那 9 個之一）。
   驗證方式：暫時改壞 Layer 2 一行 → detector 必須紅（**負面測試** —— 沒紅過的守衛不算守衛）。
3. 30 個畫面全部可導覽，每個畫面與其 fragment 完成**代碼層並排比對**，結果記入 `page-inventory.md`。
4. Fixture **五處**清理完成（Day-0 修訂）：OpCo **13 家 / 11 管轄區** · **印度與中國皆 0 命中** ·
   Japan 不作為營運實體 · `data.js` 已從 `opcos.js` 重建為 13 列。
   BFSI 殘留 0 命中 —— grep pattern **必須含 Day-0 補上的五個縮寫**：
   `AML|CTF|sanction|reconcil|prudential|FSA|MAS|APRA|HKMA|BNM|PBoC|Basel|KYC`
   於 `apps/web/src/data/` 與 `apps/web/src/app/`。
   ⚠️ 命中後**逐處讀出上下文**確認非子字串假陽性（Day-0 實測 `Stre**aml**ine NX` 與
   `**SAML** 2.0` 會誤命中 `AML`）—— 數字本身不是證據。
5. 每個消費 fixture 的畫面渲染 DEMO 標記（drive-through 逐頁確認，不是靠測試）。
6. Login 為 persona 選擇器：無密碼欄位、`grep -r "localStorage\|sessionStorage" apps/web/src` **0 命中**、
   cookie 有 `HttpOnly` + `Secure` + `SameSite`、`NODE_ENV=production` 時啟動即拒。
7. 現有 10 條 web 測試不得回歸；api 全套不得回歸（265/21 + 480/40）；
   web 新增組件測試且 `environment: jsdom` 生效。
8. **Drive-through PASS（MANDATORY，真 UI + 真後端）** — 真瀏覽器走完 30 個畫面，
   逐控件確認可點 / 有效果 / 標籤真實 / 結果渲染；截圖 + observed-vs-intended 記入 progress.md。
   （**不是** gate-only。）
9. `AD-CssToken-1` · `AD-Mockup-3` · `AD-Port-BFSI` CLOSED；`AD-Mockup-2` 更新為
   「已渲染，結構問題仍開」；calibration 已記錄；導航檔 + BACKLOG 已更新。

## 6. Deliverables

- [ ] US-1 三支 CSS verbatim copy + `globals.css` + self-host 字型 + detector config（含負面測試）
- [ ] US-2 App shell（左 rail + topbar + scope/period + 語言 + 主題）
- [ ] US-3 27 個 screen page.tsx + 共用 primitive
- [ ] US-4 23 支 fixture 移植 + 三處憲章清理 + `DemoBadge` 全覆蓋
- [ ] US-5 Persona 登入（httpOnly cookie，零憑證儲存，production 拒絕）
- [ ] US-6 Drive-through 30 個畫面 + 截圖 + observed-vs-intended
- [ ] US-7 `page-inventory.md` + `design-system.md` + closeout

## 7. Workload Calibration

- Scope class **`mockup-port` 0.55**（**NEW class，第 1 個資料點**。
  Read `docs/01-planning/CALIBRATION-MATRIX.md`：現有三個 class 都不合 ——
  非 `pattern-reuse-feature`（repo 內無前端藍本可抄）、非 `spike`（playbook 已是既有方法論，
  不需探索）、非 `greenfield-scaffold`（不是建骨架）。取 §常見起手值的
  `greenfield-feature` **0.55** mid-band 作起手。⚠️ 單點不調乘數。）
- **Agent-delegated: `yes`**（27 個 screen 彼此獨立、有明確 spec、無設計取捨 ——
  正是 CLAUDE.md §Subagent delegation policy 第一條。US-1/US-4/US-5 我自己做，
  因為它們含 guardrail 判斷。估 ≥ 80% 的 Day 2 工作經 agent。）
  `agent_factor` **0.45**（sub-class `greenfield-port-style`：agent 依明確 spec 實作、設計已定）
  → 四段式。
- ⚠️ **Day-0 修訂（D9 起）**。原估 55 hr 建立在三個**量錯單位**的指標上（行數當出現次數）。
  實測 inline style **+32.6%**、值洞 **+61.7%**、控制流 −9.7%，另加 aria 補回（D11）與 fixture 加倍。
- Bottom-up est ~**69 hr**（設計系統 4〈+aria 規劃 +`[data-grc]` 掛載點〉· shell 4〈最密：
  33 個 `style-hover` / 30 SVG / 31 onClick〉· 27 screens × ~1.3 = 35 · auth 4 個狀態 4 ·
  fixture 重建與清理 6〈原 3〉· vitest/jsdom + 組件測試 4 · drive-through 7 · closeout 5）
  → class-calibrated ~**38 hr** (mult 0.55)
  → agent-adjusted ~**17 hr** (agent_factor 0.45)。Day-4 retro Q2 驗證。
- ⚠️ **估算信心低**，兩個理由都要記著：(a) NEW class 無歷史；
  (b) matrix §Agent 委派的隱藏成本明列**複驗 / prompt 精修 / 修正**三項不隨 agent 變快，
  而本片的複驗成本異常高 —— 30 個畫面的並排比對**無法委派**（那正是保真度 gate 本身）。
  若 ratio > 1.2 屬預期而非意外。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **並排比對無法委派** —— 保真度 gate 是我自己逐頁讀，agent 只能產出初稿 | 接受。這是 §7 估算信心低的主因；drive-through 分批做，不留到 Day 3 一次爆 |
| **77 個 CSS class 全部是孤兒**（D10 —— fragments 零 `class=`）⇒ 複製 CSS 像是無用功 | 仍複製（Layer 1 canonical 完整性 + 設計師唯一改那裡），但**不強求消費**；在 `design-system.md` 註明此事實與量測日期，避免下一片重新推導。⚠️ 建立 2,651→77 的映射**就是翻譯**，禁止 |
| ⭐ **零 `aria-` 但 CSS 依賴它**（D11）—— 三條選擇器（`:48` selected · `:69` pressed · `:118` current）永遠不生效 | 移植時**主動補 aria 屬性**。這是 plan 原本沒有的工作項，已計入 §7。⚠️ 補了才會讓那三條 CSS 活過來 —— 亦即 **a11y 與視覺保真度在此是同一件事** |
| ⭐ **token 掛在 `[data-grc]` 不是 `:root`**（D12）| Next.js 掛載層級要對。⚠️ 掛錯會**靜默失效**（不報錯、顏色全部 fallback）—— 與 `AD-CssToken-1` 同一種失效模式。Day 1 的驗證方式：故意拿掉 `data-grc` 屬性，確認顏色**真的**垮掉（沒垮 = 根本沒生效）|
| detector `canonical_css` 只吃單檔，我們有三支 | 以 `tokens.css` 為標的並在 config 註解寫明缺口；另兩支靠並排比對。**不假裝三支都被守住** |
| 30 個畫面的 i18n 抽取量大，可能誘發「先寫死英文之後再抽」 | 禁止。抽取在 port 當下做 —— 事後回頭抽是二次翻工，且 parity gate 會在半途一直紅 |
| Fixture 清理漏掉某處 → 會議上被指出事實錯誤 | AC-4 的 grep 是機械判準，不是目視；Japan / 印度 / BFSI 三組 pattern 各自跑一次 |
| Risk Class C（陳舊 dev server 掩蓋修正）| Day 3 drive-through 前**乾淨重啟** Next dev server，確認新程序是 3200 的唯一擁有者 |
| Risk Class B（跨平台差異）| Windows 本機 vs Linux CI：字型檔路徑大小寫、CRLF。`.gitattributes` 已 `eol=lf`；⚠️ `AD-WriteTextCRLF-1` —— 複製 CSS **一律用工具不用 Python `write_text`** |
| 30 頁一次 port 後 coverage 稀釋（`AD-ModuleCoverageDilution-1` 的前端版）| web coverage 目前只涵蓋 `src/i18n/**`（`AD-WebCoverage-1`）。本片**不擴大 coverage 範圍**，但要在 retro 記下它已成為更大的缺口 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **Azure demo 部署** — → **W20**（checklist 硬性 Day 0-4；且部署有獨立的未知：rcitest 訂閱權限、
  ACR、distroless image 內無 prisma CLI 的 migration 路徑）
- **接真 API** — → M6（要先在 `packages/types` 補契約）
- **`AD-Mockup-2` 的儀表板結構重設計** — 需規格裁決；本片先渲染
- **`AD-Nav-1`（Wave 3 AI agent 是導航第一項，會出現顯眼死連結）** — 本片照 mockup 渲染並標 DEMO，
  導航資訊架構的產品決策不在此
- **`AD-Switcher-1`（實體/角色切換器把兩個正交軸壓成扁平清單）** — 照 mockup 渲染；
  13 OpCo × 6 角色的正確 UX 是設計工作
- ⚠️ **`AD-Auth-1` 已移出 Out-of-Scope**（Day-0 D2）—— 原寫「註冊畫面不在本片 30 個畫面內」是**錯的**，
  REGISTER 就在 `01-auth:110-135`。使用者已裁決 port 並修正三處 ⇒ 本片**關掉**這條 AD
- **FORGOT / RESET 兩個本地密碼流程** — 不 port，記為 ADR-0007 偏離（見 §3.4 表）
- **i18n L1**（per-locale routing / `Accept-Language` / `<html lang>` 動態）— L0 夠本片用
- **Entra ID 實際接線** — 卡在 infra team 的 App Registration（ADR-0007）
