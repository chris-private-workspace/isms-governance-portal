# Phase W19 Progress — Port the design handoff into apps/web

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## 2026-08-17 — Day 0（Plan-vs-Repo Verify）

### Today's Accomplishments

- Prong 1 path verify · CH 編號 grep · detector before-state · baselines（api unit + web）
- Prong 2 量測委派兩個 agent 平行執行；Prong 2.5 fragment 全文自讀（判斷工作不委派）
- **Day-0 抓到 8 條 drift，其中 3 條足以改變範圍** —— 詳見下表

### Drift findings

| ID | Finding | Implication |
|----|---------|-------------|
| **D1** | **`01-auth` fragment 有 7 個狀態，不是 1 個畫面** —— LOGIN（3 個變體 A/B/C）· REGISTER · FORGOT · RESET · MFA · SSO（`fragments/shell/01-auth-full-screen-no-shell.html:11,57,79,110,138,155,173,198`）| ⭐⭐ **plan 的「30 個畫面」是低估**。光這一檔就是 9 個畫面狀態。且 3 個 login 變體是**設計者提供的三選一**，需要裁決選哪個 —— 全做是誤解交付物意圖 |
| **D2** | **plan §9「註冊畫面不在本片 30 個畫面內」是錯的** —— REGISTER 就在 fragment 01 的 `:110-135` | `AD-Auth-1`（🟡 P1）整條落在本片範圍內，不能排除。它的三個問題全部要處理 |
| **D3** | **註冊畫面有 Password / Confirm password 欄位**（`:126-127`）；另有 FORGOT / RESET 兩個本地密碼流程 | ⭐ 與 **ADR-0007「no local credential store」直接衝突**。使用者已裁決 persona 選擇器 ⇒ 這三個狀態需要明確處置決策，不能照搬（照搬 = 做出一個看起來像認證但不是的東西 = AP-3） |
| **D4** | **`data.js`（旗艦儀表板資料源）必須重寫而非修補** —— 6 列全部金融監理框架（MAS/FSA/APRA/HKMA/BNM/PBoC）、含 Japan 與 China、且六實體名單與 `opcos.js` 的 14 家**自相矛盾** | ⭐⭐ 這是 `AD-Mockup-2` 的實體。plan §3.x 原寫「不動儀表板資料結構」，但**不重建就無法渲染 13 家 OpCo** ⇒ 該項移出 Out-of-Scope |
| **D5** | **plan 完全漏了中國** —— `entity:'China'` 共 8 處跨 5 檔（`controls.js:6,13` · `data.js:9` · `issues.js:4,9` · `notifications.js:5` · `risks.js:6,11`），另 `01-auth:124` 下拉一處 | 已確認參數 #4 是「印度與中國**均**排除」。plan §3.3 只寫了印度 ⇒ 清理範圍加一倍 |
| **D6** | **BFSI 計數 plan 高估又低估** —— plan 寫 7 檔 14 處；真命中 **6 檔 13 處**（2 個是子字串假陽性：`Stre**aml**ine NX`、`**SAML** 2.0`），但**真實汙染是 18 行**，因為關鍵字清單漏了 **MAS / APRA / HKMA / BNM / PBoC** 五個監理機關縮寫 | ⭐ 這是 `AD-NarrowPatternWideClaim-1` 的形狀：**窄 pattern 得出的數字被當成全貌**。AC-4 的 grep 清單必須補上這五個 |
| **D7** | **plan「markup 乾淨」是錯的** —— `01-auth:124` 下拉同時含 Japan 與 China | 判定了 plan（4 檔）vs `AD-Mockup-3`（5 檔）的分歧：**AD 是對的**（4 in `data/` + 1 in `fragments/`）。⇒ 清理不能只掃 `data/` |
| **D8** | **i18n key 數 plan 寫 16，實測 15** | baseline 修正。另量到一條**型別安全不對稱**：`DICTIONARIES` 型別只讓 zh-Hant 約束 `TranslationKey`，`en.json` **不受型別檢查** —— 掉一個英文 key 編譯照過，只有 runtime parity 測試會抓。字典從 15 長到全站規模後，那條測試是唯一守衛 |
| **D9** | ⭐⭐ **plan 的三個 fragment 指標全部是「行數」不是「出現次數」** —— inline style ~2,000 → 真實 **2,651**（+32.6%）· `{{` 1,099 → **1,777**（+61.7%）· sc 標籤 331 → **299**（−9.7%，**高估**）| **不是估錯，是量錯單位**。證據是三個數字被逐位還原：`{{` = html 行數 1,095 + README 4 = 1,099；sc = 329 + README 2 = 331。⇒ §7 bottom-up 必須上調。⚠️ 這是 `AD-NarrowPatternWideClaim-1` 的**鄰居而非同類** —— 那條是「窄 pattern 寬結論」，這條是「對的 pattern、錯的單位」。共同結構仍是**用便宜的代理指標回答需要精確量測的問題** |
| **D10** | ⭐⭐ **`class=` 在 fragments 命中也是 0** —— 不只 `grc-`。30 檔**完全沒有 class 屬性** ⇒ 77 個 CSS class（56 `grc-*` + 21 base）**全部是孤兒**。`components.css:6-8` 自承那是「same values, named」| 這**升級**了 scope decision (a) 的論據：先前只知道 fragments 不用 `grc-`，現在知道它們**不用任何 class**。⇒ playbook §4.2 的「組件消費 mockup class 名」在 fragments 側**沒有任何現成對應可抄**；2,651 → 77 的映射得自己建立，而建立它就是**翻譯** ⇒ 更強地支持「inline style 原封不動搬」 |
| **D11** | ⭐ **零 `aria-` 屬性，但 `components.css` 有三條選擇器依賴它** —— `.grc-table tbody tr[aria-selected="true"]:48` · `.grc-chip[aria-pressed="true"]:69` · `.grc-nav__item[aria-current="page"]:118` | 兩件事同時成立：那三條 CSS **永遠不會生效**，且這是實打實的 a11y 缺口。fragments 目前靠 inline style 直接寫死選取／按下／當前頁的顏色。⇒ 移植時**必須主動補 aria 屬性**（這是 plan 完全沒有的工作項） |
| **D12** | **token 掛載點是 `[data-grc]` 屬性選擇器，不是 `:root`**（`tokens.css:4,7` 檔頭寫明用法 `<div data-grc data-theme="light">`）；深色主題在 `:67-96` 覆寫 26 個變數 | 直接決定 Next.js 的掛載層級 —— 掛錯地方會導致**整份 token 靜默失效**（頁面不報錯、顏色全部 fallback）。⚠️ 這與 `AD-CssToken-1` 是同一種失效模式：**無效 CSS 不會叫** |

### 已驗證為真（plan 宣稱成立，無 drift）

- `opcos.js` **14 家 · `RIN` 在第 16 行 · 刪後 13 家 / 11 管轄區** —— 四項逐一相符
- `data/` **23 支 · 329 行 · 零 import**（第 24 個 `.js` 是 `design/support.js`，在 `data/` 外）
- `fragments/` 的 BFSI **確實乾淨**（7 個 raw 命中全是 `SAML`/`OIDC`/`base**lin**e` 假陽性）
- `DPDP` / `PIPL` 全樹 **零命中**
- i18n parity 機制**雙向斷言**且有反向測試守著（CH-012），另有 `t(x,'key')` 字面掃描 + `referenced.size > 0` 防恆真
- **fragment 檔數與行數**：shell 3 / 505 · screens 27 / 3,272 · 合計 **30 / 3,777** —— 逐檔核對相符
- **三支 CSS 行數**：96 / 54 / 123 —— 逐項相符
- **`grc-` 在 fragments 命中 = 0** —— scope decision (a) 的核心依據成立（且 D10 讓它更強）
- **145 個 icon 全部自足 inline SVG** —— `<img>` / `.svg` / `<use>` / `xlink:href` / `icon-font` / `url(` **全部零命中**
  ⇒ **無資產管線需求**。（唯一無 SVG 的檔是 `29-switch-entity-role.html`）
- **事件屬性全部 React camelCase**：`onClick` 137 · `onInput` 19 · `onKeyDown` 2 · `onChange` 2 · `onFocus` 1 = 161；
  小寫 `onclick=` **零命中** ⇒ fragments 本來就預設 React 事件模型
- **`hint-*` 與 sc 標籤嚴格 1:1**（各 299），逐檔比對成立 ⇒ 可整批剝除；
  ⚠️ 但它記錄了每個迴圈的**示意筆數**（`hint-placeholder-count="4"`），**剝除前先抽出來**對建 fixture 有用
- **`base.css:6` 的 Google Fonts `@import` 是 `styles/` 全目錄唯一的外部引用**
  （`@import|url\(|https?://` 三 pattern 掃描，tokens.css 與 components.css 完全無外部依賴）

### Baselines（實測，非引用）

| Gate | 實測 | plan 宣稱 | 相符 |
|---|---|---|---|
| `run_all.py` | **9/9 passed** | 9/9 | ✅ |
| `check_mockup_fidelity` | **SKIP**（無 config）—— run_all 記為 `[PASS]` | SKIP | ✅ |
| api unit (`test:cov`) | **480 passed / 40 suites**（98.0 s） | 480/40 | ✅ |
| api int (`test:int`) | **265 passed / 21 suites**（151.2 s；`isms_test` 重建+遷移+seed，app role least-privilege） | 265/21 | ✅ |
| web (`vitest run`) | **10 passed / 1 file**（2.53 s） | 10/1 | ✅ |
| `check_entity_index` | **34 / 36** | 34/36 | ✅ |
| CH 最大引用 | **CH-037**（全 repo grep，非 `ls`）⇒ W19 用 **CH-038** | — | — |

### Notes

- ⚠️ **我自己踩了一個工具陷阱並更正**：一次 `cd` 進交付物目錄後，Bash 的工作目錄**跨呼叫持續**，
  導致後續 `apps/` 相對路徑全部找不到，我一度誤判「agent 回報的路徑是錯的」。
  實際上 agent 是對的。⇒ 教訓：Bash 一律用絕對路徑或每次重新 `cd`；
  **Glob 的 `path` 參數同樣受影響**。
- ⚠️ `Grep` 的 `head_limit: 0` **不是「無限制」而是回 0 筆**；`\d` 在此實作不匹配，要用 `[0-9]`。
  兩次零命中都是我的用法錯，不是專案事實 —— 依 `verification-discipline.md`
  「零命中要先證明搜對了地方」才沒把它寫進 drift 表。
- **`tok()` 色彩規則已找到**（`components/status.md:11-18`）：四個 RAG 態各自 `var(--rag-*)`，
  **全部走 CSS var 不是 hex** ⇒ fixture 帶的樣式值天然滿足 detector 的 hardcoded-colour 檢查。
- **儀表板轉換層可推導**：`data.js` 一列 → `{flag,name,local,ovBg/ovDot/ovInk/ovLabel,risks,cells[6],metrics[5]}`，
  顏色來自 `tok()`、delta 來自 `prev`。**不需要挖 5,355 行的 prototype**（playbook §4.3 的正常重寫範圍）。
- **儀表板 layout 容得下 13 列**：表格 `overflow-x:auto` + `min-width:840px`，**無高度上限**
  ⇒ `AD-Mockup-2` 的「結構上無法容納」指的是**資料鍵語義**（國家 vs OpCo，SG/HK 各 2 家會擠成一列），
  不是版面容量。重建 fixture 不必動 layout。

### Go / no-go 判定

**範圍變動估 +25~30%** ⇒ 落在 **20-50% 檔：修訂 plan §Acceptance + §Workload，跟使用者再確認**。

| 變動來源 | 量 |
|---|---|
| 畫面數 | `01-auth` 7 狀態 → 使用者裁決後做 **4 個**（LOGIN 變體 A · REGISTER · MFA · SSO），淨 **+3** |
| 工作量指標 | inline style **+32.6%** · 值洞 **+61.7%** · 控制流 −9.7%（D9）|
| fixture | 約 **2 倍**（`data.js` 重建 + 中國 8 處 + auth dropdown + BFSI 真實 18 行）|
| 新增工作項 | **補 aria 屬性**（D11）—— plan 原本完全沒有這一項 |

**決定：GO**（繼續 Day 1）。理由：所有變動都是**量**的增加，沒有一項改變方法或推翻核心設計決策；
反而 D10 讓 scope decision (a) 的論據變得更強。

**使用者裁決（2026-08-17，Day 0）**：
1. **登入變體選 A · split** —— 依據是 fragment 內只有 `loginVarA` 的 `hint-placeholder-val` 是 `true`
2. **FORGOT / RESET 不 port**，記錄為 ADR-0007 偏離（走 `15-design-alignment.md` 的既有例外機制，
   **不是** playbook 禁止的「刪 mockup 有的東西」）
3. **REGISTER 照 port 並修正三處**：移除密碼欄位 · Entity 換 13 家 OpCo · Role 換已確認六角色
   ⇒ 直接關掉 `AD-Auth-1`

### Remaining for Next Day

- plan 修訂（§3.3 / §3.4 / §3.x / §5 AC-4 / §7 / §8 / §9）+ checklist 對應調整 ✅
- 開 branch `feature/W19-mockup-port` ✅（`bf2a2dd`）
- Day 1：三支 CSS verbatim copy → self-host 字型 → detector config + **負面測試** → 紅線 7 修正 → app shell

---

## 2026-08-17 — Day 1（設計系統落地）

### Today's Accomplishments

**1.1-1.4 完成**（1.5 app shell / 1.6 vitest-jsdom 未做）。

- 三支 CSS 以 **`cp` 機械複製** —— 不用 Read+Write。理由：後者讓內容經過我的手，
  那**就是一個 drift 注入點**，而 playbook §4.2 的整個論證是「複製有 0 個注入點」。
  複製後立即 `diff` 三對：**全部 `IDENTICAL`**。
- `base.css:6` 的 Google Fonts `@import` 改為一行註解（唯一的聲明差異）。
- `globals.css` 新建 —— 本 app **唯一自撰的 CSS**，其餘全是 Layer 2 複製品。
- `layout.tsx` 掛 `data-grc` + `data-theme="light"` 於 `<html>`，移除 W01 的 inline style
  （改由 base.css 的 `body` 規則接管），並更新那段已成 orphan claim 的 header
  （原文寫「tokens.css 與 components.css **NOT copied here**」）。

### 兩個原 plan 未預見的決策

| # | 決策 | 理由 |
|---|---|---|
| 1 | **`@fontsource` 而非 `next/font/google`** | tokens.css 寫死**家族真名**（`--sans: 'IBM Plex Sans'`）。`next/font/google` 產生雜湊家族名（`__IBM_Plex_Sans_xxx`）⇒ 那個字面名**解析不到**，靜默 fallback 到 system-ui，**頁面不報錯只是字型全錯**。`@fontsource` 註冊真名 ⇒ **tokens.css 零修改**。⚠️ 與 D12 同一種失效模式 |
| 2 | **不載入 IBM Plex Sans JP** | `--sans` 鏈是 `'IBM Plex Sans', 'IBM Plex Sans JP', system-ui`。繁中在拉丁字面無覆蓋 ⇒ 會落到 **JP 字型並以日式漢字字形渲染**（骨／直／戶 這類字母語者一眼可辨），而 guardrail 9 規定 UI 是繁中 ⇒ 略過 JP 讓繁中落到 `system-ui`。**這是有理由的偏離不是遺漏**，已寫進 `globals.css` 檔頭 |

### 負面測試（三條，預測寫在執行之前，**3/3 命中**）

| # | 中性化 | 預測 | 實測 |
|---|---|---|---|
| **N1** | `--primary: #2A5BD7` → `#2A5BD8` | 1 個 `css-drift`，**2 differing lines**（一減一加），allowance 0 | ✅ 逐項相符，且訊息把兩行印出來；EXIT=1 |
| **N2** | 組件加未豁免的 `#123456` | 1 個 `hardcoded-color`，**指名檔案與行號** | ✅ `[hardcoded-color] apps/web/src/app/layout.tsx:45`；EXIT=1 |
| **N3** | 換成**已豁免**的 `#fff` | **零 violation** | ✅ 綠；EXIT=0 |

⭐ **N2 與 N3 必須成對讀**：單看 N2 只證明「檢查會紅」，單看 N3 只證明「這個值不紅」——
**兩者合起來**才證明豁免清單是**窄的**，而不是把整個檢查關掉。
（這正是 `AD-VacuousScopeTest-1` 要防的形狀：一條綠燈、有斷言、卻什麼都沒守。）

### ⭐ N2 當場暴露了 `AD-CssToken-1` 的第二個藏身處

違規訊息本身寫著 `<- use oklch(var(--token))` —— 而本專案 token 是 hex，照做會產生
**無效 CSS 且靜默失效**。它硬編碼在 `check_mockup_fidelity.py` 裡。

⛔ **這一處比那份 md 更危險**：md 是「規則文件」，要人主動去讀；而這句話是在**你違規的當下**
跳出來告訴你怎麼修。plan §3.1 只寫了改 md ⇒ 只修一處會留下一個**會主動教人犯錯**的 gate。
兩處都已修（訊息 + module docstring）。

### Gate（實測）

| Gate | 結果 |
|---|---|
| `run_all.py` | **9/9** —— ⭐ 第 5 項由 `SKIP` 變 `OK`（**數字沒變，組成變了**）|
| `check_mockup_fidelity` | **OK (verbatim copy intact, no hardcoded colours)** |
| web lint / type-check | EXIT=0 / EXIT=0 |
| web test | **10 passed / 1 file**（不得回歸 —— 未回歸）|
| web build | **EXIT=0**，Next 16.3.0 Turbopack，3/3 static pages |

### Bundle 實證（build 綠 ≠ CSS 有進去，所以逐項查了）

| 檢查 | 結果 |
|---|---|
| `--primary` | `--primary:#2a5bd7` ✅（⚠️ 首次 grep 報 MISSING 是**我的大小寫錯**，minify 轉了小寫）|
| CSS custom properties | **43 個** |
| dark theme | `data-theme=dark]` + dark-only 值 `#151a22` ✅（minify 移除了引號）|
| `@font-face` 實際宣告 | **只有** `IBM Plex Sans` / `IBM Plex Mono` ✅ —— **JP 未載入**，符合決策 2 |
| `IBM Plex Sans JP` 字串 | 僅出現在 `--sans` 的 **fallback 鏈**裡 ✅（tokens.css 逐字複製的內容，本該在）|
| woff2 出貨 | **39 個** |
| bundle 大小 | 24,398 bytes |

⚠️ **兩次差點下錯結論，都是我的檢查方法不精確**：(a) `#2A5BD7` 大小寫；
(b) 把 fallback 鏈裡的字串當成「JP 字型被載入了」。⇒ 兩者都靠**換一種問法重查**才分辨出來，
而不是靠第一次 grep 的數字。

### Remaining for Next Day

- 1.5 App shell（`02-app-shell.html` 222 行 —— 全 repo 最密：33 個 `style-hover` / 30 SVG / 31 onClick）
- 1.6 vitest 改 jsdom + 組件測試
- ⚠️ **`data-grc` 掛載點的負面驗證**（拿掉屬性確認顏色真的垮）留到 Day 3 drive-through ——
  它需要真瀏覽器，而本機的瀏覽器擴充目前未連線
