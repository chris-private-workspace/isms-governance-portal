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
- 開 branch `feature/W19-mockup-port` ✅（`358f8e2` —— rebase merge 改寫過，原記錄的 `bf2a2dd` 已不存在）
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

### Day 1 後半 — App shell（1.5 / 1.6 完成）

**建立了 27 個畫面共用的 port 規則**，寫在 `AppShell.tsx` 檔頭。下一片照抄，不重新推導。

| 決策 | 內容 | 為何不是「翻譯」 |
|---|---|---|
| `style-hover` → `data-hov` | 全站量到 **116 處僅 10 種唯一值**（前三種佔 94%），在 `globals.css` 定義 10 條 rule | inline style 在**任何**技術下都表達不了 `:hover` ⇒ 機制**必須**換。但每條宣告是**逐字**照抄，沒有任何數值被重新推導。playbook §3 禁的是 `padding: 0 14px` → `px-3.5` 那種**值的重新詮釋** |
| 用 attribute 而非 class | `data-hov="s3"`（依**值**命名，不依用途） | fragments 零 `class=`（D10）⇒ 引入 class 會模糊「複製自 mockup」與「我們自己寫的」的界線。依值命名讓對照是一步可查的機械動作；依用途命名（`data-hov="row"`）則是設計決策 |
| icon 抽象邊界 | 組件只擁有 **path + viewBox**，尺寸/描邊/顏色留在呼叫點 | 同一個盾牌在品牌區是 17px/`#fff`/1.9、在導覽是 18px/`currentColor`/1.7 —— 折進組件預設值會**靜默抹平 mockup 刻意的差異** |

### ⭐ fragment 留洞時，值從哪裡來（本片定案）

`{{ nav.dashboard.c }}` 這類洞在 fragment 裡沒有值。定案：

- **active 樣式 + collapsed 寬度** → 取 `components.css:118` / `:113`（**唯一**寫下來的地方）
- **佈局值** → 取 **fragment**，因為兩者實測**不一致**：
  fragment `padding:8px 11px` / `radius 0 7px 7px 0` / `13px` / `gap 11px`
  vs class `height:34px` / `padding:0 12px` / `radius 8px` / `12.5px` / `gap 10px`
  ⇒ 這再次證實 `components.css` 是**平行推導**而非 fragment 的來源（D10 的延伸證據），
  而 fragment 才是設計實際渲染出來的東西。

### 我自己造出來又修掉的一個 Potemkin

主題切換按鈕原本會換 icon、**但什麼都不會變色** —— 因為 token 掛在 `<html>` 的
`[data-grc][data-theme]`（D12），而 `AppShell` 是它的子孫，state 碰不到。
補 `useEffect` 寫 `document.documentElement.dataset.theme` 才真的生效。
⇒ **這正是 drive-through 專門在抓的形狀**：有 handler、handler 有作用（換了 icon）、
但那個作用不是使用者以為的那件事。

### Gate（Day 1 收尾實測）

`format=0 · lint=0 · type=0 · test=0 · build=0 · run_all=9/9 · mockup-fidelity=OK`

⚠️ **plan 的 `run_all` 10/10 是我算錯的** —— 分母一直是 **9**，
`check_mockup_fidelity` 本來就在那 9 個裡，只是先前回 SKIP。已修正 plan §3.y / §5 AC-2 與 checklist 兩處。

### 🚧 誠實的狀態：shell 尚無消費者

build 實測路由仍是 `/` + `/_not-found` —— `(app)` 群組**只有 layout 沒有 page**。
這是 Day 1 / Day 2 的分界所致（Day 1 = 設計系統 + shell，Day 2 = 畫面），不是遺漏，
但在 Day 2 第一頁落地之前，**shell 是一段主流量到不了的程式碼**。解封條件寫在 checklist 1.5。

同理 **jsdom 的能力尚未被驗證** —— 現有 10 條測試在 jsdom 下不回歸，只證明「沒弄壞既有的」，
不證明「組件測試跑得起來」。解封條件寫在 checklist 1.6。

### Remaining for Next Day

- **Day 2.1** `data.ts` 從 `opcos.ts` 重建（13 列）+ 其餘 22 支 fixture + 五處憲章清理
- **Day 2.2** 27 個畫面 —— **第一頁 dashboard 我自己做**（它同時解封 shell 與 jsdom 兩個 🚧），
  之後的畫面平行委派，**但並排比對逐頁自己做**（那是保真度 gate 本身，不可委派）
- **Day 2.3** persona 登入 + auth 四狀態
- ⚠️ **`data-grc` 掛載點的負面驗證**（拿掉屬性確認顏色真的垮）留到 Day 3 drive-through ——
  它需要真瀏覽器，而本機的瀏覽器擴充目前未連線

---

## 2026-08-17 — Day 2（fixture 移植 + 第一頁）

### Today's Accomplishments

**2.1 完成**（fixture + 五處清理）· **2.2 第一頁 dashboard 完成**（其餘 26 頁未開始）·
**Day 1 的兩個 🚧 雙雙解封**。

- 21 支 fixture 以 **`cp` 機械複製** `.js` → `.ts`，複製後逐檔 `diff` **21/21 IDENTICAL**，
  之後才套清理編輯。型別不手寫，用 `(typeof x)[number]` 推導 ⇒ **資料本體零手打**。
- `entityPosture.ts` 是唯一**不能複製**的一支，改為**從 `opcos.ts` map 出來**。
  13 這個數字因此不是寫死的，而是 `opcos.length` 的結果。
- `/dashboard` 落地：build 實測路由 `/` · `/_not-found` · **`/dashboard`**。

### ⭐ D13 —— checklist 自己的 Verify 指令是不可能通過的

checklist 2.1 的 Verify 用 `grep -riE "india|RIN|china|..."`。`RIN` **沒有 word boundary**。

| 實測 | 結果 |
|---|---|
| checklist 原樣的 pattern | **72 命中** |
| 加 `\b` 後 | **6 命中，全部在註解裡**（`opcos.ts` 檔頭在解釋為什麼那一列被刪） |
| 只看資料行（排除註解行） | **0** |

72 命中裡最大宗是 **`string` ×11** —— s-t-**rin**-g。其餘：`print`/`printing`/`printers`/`Print` ×6、
`monitoring` ×2、`Preparing` / `expiring` / `offering` / `engineering`、
`Streamline`（含 **aml**）、`SAML`、`mass`（含 **mas**）。

⛔ **這條 Verify 永遠不會回 0** ——
在一家印表機公司的程式碼裡搜 `RIN`，等於搜「印」。
如果我照著跑並相信它，只有兩種結局：**誤判失敗**，或**為了讓它綠而放寬檢查**。
Day-0 D-bfsi-spread 當時抓到 5 個漏掉的縮寫，但沒有人檢查 pattern **本身**是否可判。

⇒ 升為 **`AD-GrepBoundary-1`**：憲章類 verify 的 pattern 必須自帶「已排除的假陽性」清單，
否則零命中與滿命中一樣沒有資訊。已改寫 checklist 2.1 的兩條 Verify。

### 五處清理（實際範圍）

| # | 項目 | 實際 |
|---|---|---|
| 1 | `opcos` 13 家 | Day 1 已完成 |
| 2 | 中國移除 | `risks` / `controls` / `issues` / `notifications` 的 `entity` 值 |
| 3 | Japan 不作為營運實體 | 同上 |
| 4 | BFSI 清零 | **10 處**：risks 3 標題 · controls 3 名稱 · issues 3 標題 · policies 1 列 |
| 5 | `data.js` 重建 | → `entityPosture.ts`，13 列 |

**替換表**（一次定案，全域套用）：`Japan→RKR (K. Sato→H. Park)` ·
`China→RTW (L. Wang→Y. Chen)` · `Hong Kong→RHK` · `Malaysia→RMY` · `Singapore→RSG` · `Australia→RAU`。
⭐ 後四者的 owner **本來就等於 `opcos.ts` 的 `iso`** —— 換句話說交付物自己已經在用這個對應，
只是在 4/6 的情況下對、2/6 的情況下指向範圍外的實體。

⭐ **`entity` 由國名改為 OpCo code 不是我發明的**：`auditIssues` / `incidents` / `suppliers` /
`osServices` 四支**本來就用 `opco:'RSG'`**。改的是另外三支落後的，讓 fixture **內部一致**。

### ⭐ D14 —— 交付物有兩套彼此矛盾的「實體」模型

fragment 盤點（30 檔全文）證實：

| 模型 | 來源 | 使用的畫面 |
|---|---|---|
| **6 個國家** + 金融監理機關（`Singapore (MAS)`…）| `data.js` | 03 · 05 · 10 · 13 · 14 · 27 |
| **14 家 OpCo** | `opcos.js` | 17 · 23 · 24 |

兩者從未被調和。`16-incidents-list:22` 寫「across 14 APAC OpCos」，
而同一份交付物的 `14-admin:208` 寫「6 active entities across 6 jurisdictions」。

⇒ 這讓 `AD-Mockup-2` 從「印度那一列」升級為**結構問題**：不是刪一列的事，
是**兩套模型要收斂成一套**。`entityPosture.ts` 就是那個收斂點。

### ⭐ D15 —— BFSI 殘留全在 data，fragment 只有一行

30 個 fragment 裡 **AML / CTF / KYC / sanctions / reconciliation / Basel 與六個金融監理機關
的真實命中數 = 0**。唯一一處是 `14-admin.html:212` 的欄位標題 **`Regulator / jurisdiction`**。

原因是 fragment 只透過 `{{ hole }}` 取值，BFSI 詞彙全部住在 `data/*.js`。
⇒ 我清理 data 層是對的層；fragment 層 Day 2.2 只需改那一個標題。

### ⭐ D16 —— 交付物自己的 prose 計數已經對不上它自己的資料

| 位置 | 寫的 | 實際 |
|---|---|---|
| `14-admin:237` | 43 users | 該迴圈 `hint=8` |
| `14-admin:294` | 6 connected | `hint=8` |
| `30-ai-drawer:18` | grounded on 7 sources | `knowledgeSources` 8 列 |
| `02-app-shell:44` | Issues badge `5` | `issues` 10 列（未結 9）|

⇒ **政策定案：畫面上的計數一律由資料算出，不從 fragment 抄字面。**
dashboard 三處已照辦（`6 jurisdictions`→11 · `6 entities`→13 · 硬編碼的 `Watch`/`A` → 由 13 列推導）。
AppShell 的 `5` 是 Day 1 照抄的，現在有證據它是錯的 ⇒ 記入 `AD-Nav-2`。

### ⭐ jsdom 的能力驗證：Day 1 標的 🚧 是對的，而且**不足的地方有三層**

Day 1「10/10 未回歸」只證明沒弄壞既有的。實際寫下第一個 `.test.tsx` 之後，連續撞到三道：

1. **JSX 根本沒被轉譯** —— tsconfig 是 `jsx: preserve`（Next 要原始語法），
   vitest 拿到未轉譯的 JSX 直接 parse 失敗。
   ⚠️ 我先試 `esbuild: { jsx: 'automatic' }` —— **被接受、無警告、完全沒作用**，
   同一個錯誤原樣再來一次。改裝 `@vitejs/plugin-react` 才成立。
   （一個「被讀取但被忽略」的設定比沒有更糟，已寫進 config 檔頭。）
2. **`@/` alias 在 vitest 不存在** —— 它宣告在 tsconfig，type-check 與 Next 都讀，vitest 不讀。
   既有 10 條測試全用相對路徑 ⇒ 從來沒人要求 vitest 解析過它。
3. **testing-library 的 afterEach cleanup 沒註冊**（`globals: false`）⇒
   第二個 `it` 看到兩份 DOM，症狀是「found multiple elements」。
   ⚠️ 這個最陰險：它**怪到斷言頭上**，而顯而易見的修法（改用 `getAllBy`）會讓套件變綠，
   同時讓每條測試都跑在累積的 DOM 上。改用 setup file 真正卸載。

⇒ 三者都不是「寫錯測試」，是**能力從未被行使過**。這正是 🚧 該標的理由。

### ⭐ 我自己造出一個 i18n 假綠，又修掉

KPI 文案原本寫成 ``tr(`dash.kpi.${k.key}.label` as '...')``。
`i18n.test.ts` 的 check 3 **掃原始碼找 key 字面**——一個 runtime 組出來的 key
型別過、渲染正常、而掃描器看不見。6 個 KPI 有 **5 個是不設防的**，測試照樣 10/10 綠。

⇒ 全部改回字面 key（`labelKey` / `subKey` / `footKey`）。
**這是 27 個畫面的 port 規則**：key 一律字面，不用樣板字串組。

### Gate（實測）

| Gate | 結果 |
|---|---|
| `format:check -w apps/web` | **All matched files use Prettier code style** |
| `lint -w apps/web` | EXIT=0 |
| `type-check -w apps/web` | **0** errors |
| `build -w apps/web` | ✓ Compiled · 路由 `/` · `/_not-found` · **`/dashboard`** |
| `test -w apps/web` | **22 passed (2 files)** —— 10 既有 + **12 新組件測試** |
| `run_all.py` | **9/9** |
| `check_mockup_fidelity` | **OK** |

⚠️ **`.prettierignore` 新增 `apps/web/src/data/`** —— prettier 會把每列 fixture 從一行炸成 ~13 行，
那會摧毀「每一列都能與交付物 1:1 diff」這個性質，而那正是複製這件事的**全部價值**。
不是風格偏好，是可稽核性。

### 🚧 → 解封

| Day 1 的 🚧 | 現況 |
|---|---|
| shell 尚無消費者 | **解封** —— build 實測 `/dashboard` 存在 |
| jsdom 能力未驗證 | **解封** —— 12 條組件測試通過（代價：三道修正，見上） |
| `data-grc` 負面驗證 | **仍未做** —— 需真瀏覽器，Day 3 |

### Remaining for Next Day

- **26 個畫面** —— ⚠️ 見下方紅旗，範圍與 plan 假設不同
- **Day 2.3** persona 登入 + auth 四狀態（含 `01-auth:124` 那個寫死的 Japan/China 下拉）
- **Day 2.2 附帶**：`14-admin.html:212` 的 `Regulator / jurisdiction` 標題

### 🔴 範圍發現：27 個畫面不是同一種工作

fragment 盤點顯示，有一批畫面消費的集合**在 `data/*.js` 裡根本不存在**：

| 畫面 | 行數 | 缺的集合 |
|---|---|---|
| `14-admin` | 343 | `adminUsers` `adminRoles` `taxonomy` `integrations` `systemAudit` `recentExports` `thresholds` `adminSections`（8）|
| `06-risk-detail` | 277 | `auditTrail` `signOff` `obligations` `assets` `assessmentHistory` `controlTests`（6+）|
| `23-apac-isms-profiles` | 275 | `ismsProfileData` —— **交付物 README 明言未抽出**，只存在原始 `.dc.html` |
| `19-risk-programme` | 234 | RM 報告工作表 `rp.rows`（CIA 評分結構，無對應檔）|
| `08-control-detail` | 175 | `frameworks` `testHistory` `evidence` `obligations` `signOff` `auditTrail`（6）|
| `26-audit-issue-detail` | 160 | `actions` `evidence` `history`（3）|
| `18-incident-detail` | 152 | `rca` `work` `corr` `prev`（4）|

這 7 頁 = **1,616 行 / 全部 3,777 行的 43%**，而它們不是「照抄 fragment」，
是「**先發明一份 fixture，再照抄 fragment**」。plan §7 的工時是以「port」估的。

**這是要使用者裁決的事，不是我自行吸收的事。** 三個選項與建議寫在今天的回覆裡。
→ **使用者裁決：全做，補齊 fixture**（期間選擇器維持現狀 + 明確標示）。

---

## 2026-08-17 — Day 2（續：19 個畫面平行委派 + auth）

### 委派結構

4 個 agent，各 3-8 個畫面，**各自擁有一份字典**（`registers` / `forms` / `details` / `settings`）。
字典分檔不是組織偏好，是**並行寫入的正確性**：共用一對 JSON 必然互相覆蓋，
而遺失的合併**看起來像少一個 key、不像衝突**。

實測進度：build 路由表 **20 個畫面 + `/login` + `/api/demo-session`**。

### 🔴 三個 agent 各自獨立標記同一件事：我的 prompt 給錯術語

我在四份 prompt 裡都寫「Control = 控制措施」。`GLOSSARY.md:45` 訂的是 **控制項**，
並明文「不要用 控制、管制」；已上線的 `nav.controls` 就是 控制項。
⇒ **同一個詞在同一個畫面上兩種譯法**（nav 寫 控制項，內容寫 控制措施）。

- **43 個值已修**（6 份字典），殘留 0
- 保留不動三處：`已控制`（Contained 是另一個詞）· `風險與控制自我評估`（RCSA 慣用展開）·
  `網路存取控制`（那是一項控制的**名稱**）

⭐ 值得記的是**它們的行為**：三個 agent 都**照我的指示做、同時把衝突升級**，
而沒有一個默默選一邊。`GLOSSARY.md:20` 要求的就是這個。
⚠️ 但也要看清楚：**它們是照著我給的錯誤指示做的** —— 委派把我的錯誤放大了 3 倍，
唯一擋住它的是「回報衝突」這條要求，不是 agent 自己會發現。

### 🔴 D17 —— 我的 worked example 上有 7 個 hover 靜默失效

`registers` agent 回報 `dashboard/page.tsx` 用了 `data-hov="surface-3"` / `"surface-2"` /
`"scorecard-row"`，而 `globals.css` 定義的是 `s3` / `s2` / `bs-s2`。

⚠️ **我第一次驗證時差點自己得出錯誤結論** —— 用 `grep -oE 'data-hov="[^"]+"'` 掃 CSS，
只找到 2 個「已定義」值，因為 CSS 選擇器用的是**單引號** `[data-hov='s3']`。
pattern 不匹配被讀成「沒定義」。改用逐字讀檔才拿到真正的 10 個。
**這正是「證據不支持結論」的第 6 次**：pattern 沒命中 ≠ 東西不存在。

真實情況：定義 10 個，使用中有 3 個值無規則 ⇒ **7 處 hover 什麼都不會發生**
（dashboard 4 · login 3）。全部已修。

⛔ **最糟的部分是位置**：那是 27 個畫面被指定去抄的範本。
而我寫給 agent 的規則第 2 條就是「用 globals.css **已有的**值」——
**我自己沒遵守我自己寫的規則**，四個 agent 全部遵守了。

### ⭐ 這一次做了結構性解法而不只是修 7 處

`check_mockup_fidelity.py` 新增 **`check_hover_rules`**：
掃所有組件的 `data-hov` 值，比對 `globals.css` 實際定義的規則集合，
無對應規則即 fail 並印出 `file:line` + 合法值清單。

**負面測試（`AD-NegativeGate-1`）**：故意把一個值改成 `surface-2` →
`[hover-no-op] apps/web/src/app/(app)/dashboard/page.tsx:791` + EXIT=1；改回 → OK + EXIT=0。

> 為什麼這個守衛值得存在：這種失效**在 diff 上看起來是對的**。
> fragment 寫 `var(--surface-3)`，所以 `data-hov="surface-3"` 逐字比對時完全合理 ——
> 只有比對「值 vs 規則集合」才看得出來。

### ⭐ D18 —— vitest 的 fork 失敗不是雜訊，是負載

Day 1 記錄過一次「60.07s、`environment 0ms`、無法重現」。今天**同一個簽名再次出現**。

通過的那一次露出了原因：**`environment 224.82s` / 8 個檔** —— 每個測試檔各起一次 jsdom，
每次約 28 秒，同時啟動這麼多是 Windows 拒絕的原因。

`poolOptions.forks.maxForks = 4` 之後：

| | 前 | 後 |
|---|---|---|
| 總時間 | 42.24s | **20.45s** |
| environment | 224.82s | **66.81s** |

⭐ **爭用本身就是成本** —— 限制並行不只是穩定，而是快了一倍。
真正的解法是讓 jsdom 變成 per-file opt-in（純邏輯測試不該付 DOM 的錢），記入 closeout。

### agent 回報中值得保留的判斷

| 來源 | 內容 |
|---|---|
| `details` | 交付物的 logic class **不是遺失的**，它嵌在 `design/*.dc.html` 裡。所謂「缺的集合」全部在那 ⇒ 它**轉錄並標註 `dc.html:NNNN`**，而不是發明，並**明確拒絕**我要它寫「invented」的指示，因為那句話會是假的 |
| `forms` | 風險表單的**單一 impact 值**是 `15-design-alignment.md:180` 的 open item #6，仍未關。它照 fragment port 並記錄偏離，**沒有即興發明五維 UI** |
| `forms` | 風險分級：prototype 是 `>=15`，憲章參數 #7 是 **>=16**。它用了憲章 ⇒ 3×5=15 在原型讀「High」在這裡讀「Medium」，**看起來會像 bug** |
| `forms` | `22-supplier-form.html` **完全沒有 entity 欄位**，而 `suppliers.ts` 每一列都有 `opco` ⇒ 從這張表建的記錄沒有所屬實體，違反 guardrail 4。它**沒有自行加欄位**（參數 #9 禁止），標為缺口 |
| `settings` | 偏好設定**沒有任何一項會持久化**。它在畫面上說出來，並寫了 `Storage.prototype.setItem` 的間諜測試 —— 一個承諾換成一道機器守衛 |
| `registers` | 交付物自己的 prose 計數已對不上自己的資料（43 users vs 8 列等），全部改為算出來 |

### Gate（實測，合併後）

| Gate | 結果 |
|---|---|
| `format:check -w apps/web` | All matched files use Prettier code style |
| `lint -w apps/web` | EXIT=0 |
| `type-check -w apps/web` | **0** errors |
| `build -w apps/web` | ✓ Compiled · **22 條路由**（20 畫面 + `/login` + `/api/demo-session`）|
| `test -w apps/web` | **8 檔 / 76 測試通過** |
| `run_all.py` | **9/9**（`mockup-fidelity` 訊息現在多一句 `hovers resolve`）|

### Remaining

- **7 個重畫面** —— 使用者已裁決全做，需先補 `data/extended/` fixture
- **Day 3 drive-through** —— 目前全部畫面都是 **gate-only verified**，一個都沒開過車

---

## 🛑 2026-08-17 — Day 2 中斷交接（使用者要關機／斷網）

**中斷點：24 / 27 個畫面完成，工作區乾淨且全綠。**

### 發生了什麼

三個 agent 在做最後 7 個重畫面，跑到第 19 分鐘時使用者告知要關機。
⇒ **主動 `TaskStop` 三個 agent**，而不是讓它們被斷電砍在寫檔中途。

它們的最後一句話正好標出進度：全部剛做完 fixture、**正要開始寫主頁面**。
實際盤點後比預期好得多 —— **4 個頁面已完整寫完**（33–73 KB），只有格式化沒跑到。

### 停下來時的實測狀態

| Gate | 結果 |
|---|---|
| `type-check` | **0** errors |
| `lint` | EXIT=0 |
| `format:check` | 修掉 4 個新頁面後 **All matched files use Prettier code style** |
| `build` | ✓ Compiled · **28 條路由 / 24 個畫面** |
| `test` | **8 檔 / 76 測試通過** |
| `check_mockup_fidelity` | **OK** —— ⭐ 含 `hovers resolve`，代表新的 4 頁**沒有** hover 靜默失效。守衛在 agent 產出上生效了 |

### ✅ 已完成（24 個畫面）

`dashboard` `risks` `risks/new` **`risks/[id]`** `controls` `policies` `policies/[id]`
`issues` `issues/[id]` `assessments` `ai-assistant` `incidents` `incidents/new`
**`incidents/[ref]`** **`risk-programme`** `suppliers` `suppliers/[ref]` `suppliers/new`
`os-portfolio` `audit-issues` **`audit-issues/[ref]`** `my-profile` `preferences`
`switch-entity-role` + `login` + `api/demo-session`

（**粗體** = 這次中斷前搶救回來的 4 個）

### ⬜ 未完成 —— 下次 session 的第一件事

**只剩 3 個畫面**：

| 畫面 | fragment | 路由 | fixture 狀態 |
|---|---|---|---|
| 控制項詳情 | `08-control-detail.html`（175 行）| `/controls/[id]` | ⭐ **`extended/controlDetail.ts` 已寫好** |
| 系統管理 | `14-admin.html`（343 行，最大）| `/admin` | ⭐ **6 個 extended 檔已寫好**：`adminSections` `adminUsers` `integrations` `permKey` `recentExports` `systemAudit` `taxonomy` |
| ISMS 概況 | `23-apac-isms-profiles.html`（275 行，37 個 sc-if）| `/isms-profiles` | ⭐ **`extended/ismsProfiles.ts` 已寫好** |

⭐⭐ **最重的部分已經做完了** —— 那三個 agent 花掉的 19 分鐘幾乎全在
「從 800 KB 的 `design/*.dc.html` grep + 轉錄集合」，而 **14 個 `data/extended/*.ts` 全部落地**，
字典也幾乎寫滿（`admin` 12 KB · `deep` 17 KB · `profiles` 17 KB，中英兩份都在）。
剩下的是照 fragment 寫 JSX，**不需要再挖 `dc.html`**。

### 重開時怎麼接（照這個順序）

1. `git log --oneline -1` → 應為本次 commit；`git status` 應為 clean
2. 派 1 個 agent 做那 3 個畫面，prompt 直接沿用本檔上面那三份的結構，
   但**必須加一句**：fixture 與字典已存在於 `data/extended/` 與 `i18n/{admin,deep,profiles}.*.json`，
   **先讀再用，不要重寫**
3. ⚠️ **字典所有權**：`admin.*` 給 admin 畫面、`deep.*` 給 controls/[id]、`profiles.*` 給 isms-profiles
   —— 已寫入的 key 不要動，只補缺的
4. 我自己做 27 頁並排比對（保真度 gate 本身，不可委派）
5. Day 3 drive-through

### ⚠️ 重開時已知待處理

- **`GLOSSARY.md` 術語**：`control` = **控制項**。若再派 agent，prompt 裡**不要**再寫 控制措施
- **`data-hov` 只能用 `globals.css` 已定義的 10 個值** —— 現在有機械守衛，但 prompt 仍要講
- **i18n key 一律字面**，不用樣板字串組
- **Day 3 需要真瀏覽器** —— 先前記錄擴充未連線，這是 drive-through 的前置相依
- 3 個未寫的畫面**沒有留下半成品檔案**（目錄都沒開），所以不必清理殘骸

---

## 2026-08-17（續）— Day 2 收尾：27 / 27

接回中斷點。派 3 個 agent 平行寫最後 3 頁，各自擁有一對不重疊的字典檔（`admin` / `deep` / `profiles`），
所以並行寫入不互相踩。**派工前先實測交接聲稱的每一項**（9 個 fixture、3 對字典、3 個 fragment 全部在），
沒有只憑文件相信。

### 完成

| 畫面 | 行數 | 新增字典鍵 | 備註 |
|---|---|---|---|
| `/controls/[id]` | 1,280 | **0** —— 上一輪寫的 108 個鍵全部夠用 | 58 個 `tr()` 呼叫 |
| `/admin` | — | 8（`admin.*` 145→153）| 7 處 disabled，14 個按鈕 |
| `/isms-profiles` | 1,771 | 5 | 36 個 `<sc-if>` 全數 port，編輯模式是真的 |

**build 路由表實測 31 條 = 27 screens + `login` + `/` + `_not-found` + `api/demo-session`。**

⭐ 這 3 頁不是新功能，是**接上既有主流量的斷點** —— `controls/page.tsx:359` 的列點擊、
`AppShell.tsx:179` 與 `:185` 的兩個導航項，在此之前**點下去都是 404**。
這順帶回答了 AP-3 的「關掉會壞什麼」。

### Drift findings（承 Day 0 編號）

**D22 — `posture.ts` 的門檻有兩組與設計交付物不符，而 header 宣稱它們是「invented」。**

管理畫面把設計的門檻表與 `posture.ts` 並排渲染，分歧才浮出來。追到權威來源
`dc.html:5088-5092`（交付物自己的 `thresholds` 集合）後發現：**五組全都寫明了**，
`posture.ts` **三組吻合、兩組漂移** —— RCSA completion amber 界線 75 寫成 70、
High/critical risks `≤5 / 6–9 / ≥10` 寫成 `4 / 7`。

三組吻合代表當初就是抄這份，只是兩組抄錯 —— 所以這是**轉錄漂移，不是刻意偏離**。
`posture.ts` header 那句「No procedure in this repo states what control coverage is 'good'」
把這個漂移藏了起來：既然宣告是憑空發明的，就沒有人會拿它去跟任何來源比對。

- **影響面**：9 個畫面消費 `posture.ts`（含旗艦儀表板）
- **裁決**（使用者）：**對齊設計交付物**（參數 #11 —— 無程序可依時交付物就是唯一來源）
- **已修**：`completion.watch` 70→75 · `highRisks` `{4,7}`→`{5,9}` · header 改寫成誠實描述
- **驗證**：五組逐組比對 → **MATCH ×5**；無測試或代碼寫死舊值

### 兩個記進 BACKLOG 的缺口（使用者裁決：本 phase 不做）

1. **`<sc-if isAdmin>`（`14-admin:7`）完全未強制。** `ShellState` 不帶角色，
   `AppShell:185` 對所有 persona 都顯示 `/admin`。已確認參數 #13 要求六角色在
   導航／路由／動作三層 + **伺服器端**強制。**只在前端隱藏是可繞過的，做了反而像已強制** ——
   比缺口更糟的假象。留給接上真 API 的 phase 一次做對。
2. **fixture 英文列舉值渲染進中文句子**（guardrail 9）。
   `控制項詳情` 會出現「此 preventive 控制項…以 continuous 的頻率運作」。
   既有的 `/controls` 登記表也是直接顯示英文 —— **是系統性做法，不是這次引入的**。
   只補一個畫面會造成同一個值在登記表與詳情頁不一致，所以跨畫面一起處理。

### Gate（我自己跑的，不採信 agent 回報）

`format:check` **All matched files use Prettier code style** · `lint` **exit 0** ·
`type-check` **exit 0** · `test` **8 檔 / 76 通過** · `build` **✓ 31 條路由 / 27 畫面** ·
`run_all` **9 / 9**（含 `mockup-fidelity: hovers resolve`）

逐項複驗 agent 宣稱（全部屬實）：`data-hov` 只用允許的 10 個值 · 0 個樣板字串 i18n key ·
`(app)` **27 / 27** 頁都渲染 `<DemoBadge/>`（逐檔 grep，0 缺）· 0 處 `localStorage`/`sessionStorage` ·
管理畫面 **0 個密碼欄位**（ADR-0007）· entity 一律來自 `useShell()`，無一從 URL 參數讀 ·
`admin` 字典 234/234 雙向零缺、`riskProg.*` 81 鍵未被動到、8 insertions **0 deletions**

### 🔴 我自己犯的錯（第 3、4 次同一形狀）

**兩次都是把原始 grep 命中數當成事實寫進 agent prompt，兩次都由 agent 回報衝突擋下：**

1. 我叫三個 agent 跑 `npm run format -w apps/web` —— **該 script 不存在**（`apps/web` 只有
   `format:check`）。若有 agent 改用 workspace-wide `prettier --write` 補救，會覆寫另外兩個
   agent 正在寫的檔。發現後即時對兩個仍在跑的 agent 發更正，要求 `--write` 只限縮到自己的檔。
2. 我寫「fragment 有 37 個 `<sc-if>`」—— **實際 36**。第 4 行是 fragment 自己的說明註解
   （`Template syntax: {{ value }} holes, <sc-if>, <sc-for>`），被 `grep -c` 算進去了。

同 session 內累計 **8 次**「用便宜的代理指標回答需要讀內容才能回答的問題」。
`.claude/rules/README.md` 的強度階梯門檻是 3 次 ⇒ **早該上結構性解法**。
已對 `data-hov` 做了（`check_hover_rules`）；**計數類尚無守衛**。

⭐ 真正擋住這兩次的不是我的自律，是 prompt 裡那句「**回報衝突而不是自行消化**」——
三個 agent 全部照做。這條要求本身值得升級成派工的預設項。

---

# Phase W19 Progress — 2026-08-17（Day 3）

## Day 3 — Drive-through（真 UI + 真後端）

工具：Playwright MCP。這是本 phase 第一次**實際開車**，先前 27 個畫面全部只是 gate-only。

### 3.1 Clean restart

3200 埠實測 **FREE（無 listener）**，全機唯二 node 進程是使用者剛啟動的 Playwright MCP ——
**沒有陳舊 Next 程序**（Risk Class C 不成立，不需要清）。
`next dev` startup log：`▲ Next.js 16.3.0 (Turbopack)` · **`✓ Ready in 2.6s`** · `http://localhost:3200`。
`DEMO_AUTH` 不需設定 —— `demo-session.ts:60` 在 `NODE_ENV !== 'production'` 時直接放行。

---

## 🔴 Day 3 的核心發現：25 個死控件，全部通過了每一項 gate

**這是本 phase 最重要的一筆，也是 drive-through 存在的全部理由。**

15 個畫面上有 **25 個按鈕**：沒有 `onClick`、沒有 `disabled`、`cursor: pointer`、`opacity: 1`，
其中 4 個還帶 `data-hov` **會在滑鼠移過時亮起來**。它們看起來完全是活的，按下去什麼都不會發生。

它們通過了：`format` · `lint` · `type-check` · `build` · **76 個測試** · **`run_all` 9/9**
（含這個 phase 自己新加的 `check_hover_rules`）。**沒有任何一項機械檢查看得到它們。**

違反的是 checklist DoD 那句「無對應行為的控件不掛 handler **也不做成看似可點**」的後半段，
以及 `verification-discipline.md` 列在第一條的禁止項。

### 修法：先問「能不能真的做到」，做不到才停用

| 處置 | 數量 | 說明 |
|---|---|---|
| **接上，變成真的能用** | 2 | `/preferences` 語言卡 —— 見下 |
| **停用**（`disabled` + `not-allowed` + `opacity .5` + 說明 title，**移除 `data-hov`**）| 24 鈕 + 2 span | 需要本 port 沒有的後端 |
| **移除假的可點外觀** | 3 列 | `/ai-assistant` 對話歷程 —— 見下 |

⭐ **語言卡是唯一「能力早就存在、只是沒接上」的一個。** `AppShell:231` 一直有 `setLocale`，
topbar 的切換器也一直在用 —— 只是 `ShellState` 沒把它暴露出去。加上去之後**卡片真的會切換語言**
（實測：H1「偏好設定」→「Preferences」、整個側邊欄跟著換、`aria-pressed` 正確更新）。
這與 `setScope` 當初存在的理由完全相同，所以不是新設計而是補完既有模式。
順帶修掉 `prefs.language.note` —— 它原本寫「此清單僅顯示目前使用中的語言」，改完就變成假話。

⭐ **`/ai-assistant` 對話歷程是保真度與反 Potemkin 正面衝突的一處。**
fragment `:127` **自己**就給了 `cursor:pointer` + `style-hover` 而**沒有 onClick` ——
缺陷源自交付物。而交付物的資料是 `{title, meta}`、**沒有訊息內容**，
所以「接上」永遠不可能誠實達成（替 AI 畫面編造對談內容比空著更糟）。
⇒ 判 guardrail 優先，移除 pointer 與 hover，並在程式碼中完整記錄理由與復原條件。
**這正是 `verification-discipline.md` 開頭那個真實案例的形狀**（聊天 session 列表點了沒反應）。

### 驗證修正（我自己開車，不採信 agent 回報）

15 條路由逐一實測：**24 個停用鈕 + 2 個 inert span，零違規** ——
每一個都是 `cursor: not-allowed`、**`data-hov` 為 null**、`title` 正確解析到 `shell.inert`。
補掃後 **27 條路由全部 `deadButtons: []`**（含展開分頁後的狀態）。

---

## Drift findings（承 Day 2）

**D23 — 我的第一次死控件 sweep 有兩個射程漏洞，是 agent 找出來的，不是我。**

我只掃了 `<button>`、且只掃每頁的**預設分頁**。實際漏掉：
（a）`<span>` 帶 `cursor:pointer` 而無 handler（`risks/[id]`、`controls/[id]` 各一組）；
（b）**非預設分頁後面的控件** —— `audit-issues/[ref]` 證據分頁的「開啟」鈕，預設分頁上根本不存在。

⇒ 補掃改成走完整祖先鏈 + 逐分頁點擊。⚠️ 補掃第一版又誤報了一大批（把可點 `<tr>` 的子 `<td>`
全算成死控件，因為我只排除 `<a>`/`<button>` 祖先而沒排除**帶 onClick 的任何祖先**）——
修正後真實命中從「數百」降到 **9 個，全在 `/ai-assistant`**。
**同一個 session 內第 5 次「拿便宜的代理指標回答需要讀內容的問題」。**

**D24 — 儀表板最高殘餘風險列連到清單頁而不是那一筆風險。**
`dc.html:5166` 的 `onOpen` 明確帶 id（`setState({screen:'risks', selectedRisk: r.id})`），
而 port 寫的是 `href="/risks"` —— 不是死控件（真的會導航），但**默默丟掉使用者剛表達的選擇**。
`/risks/[id]` 在 Day 2 才落地，所以這是路由補齊後才浮現的。已修為 `href={`/risks/${r.id}`}`。

**D25 — 儀表板標題不跟著 scope 走。** 鑽取單一實體後，KPI、矩陣、麵包屑的管轄區數全部重算了，
但 H1 仍寫「ISMS 態勢 —— 亞太區」。fragment `:12,:14` **把 `APAC Region` 寫死**，
所以 port 是忠實的 —— 是**我們自己加的鑽取功能**製造了 fragment 從未有過的狀態。
已加 scope 變體（區域狀態的原文一字未動）。⚠️ 第一版用 `entity.name`（法定全名
「Ricoh (Malaysia) Sdn Bhd」），與矩陣列顯示的「Ricoh Malaysia」不一致 ——
改用 `entityPosture` 的短名，因為使用者點的是那一個。

---

## 逐項驗收（checklist §3.2）

| 要求 | 實測結果 |
|---|---|
| 27 畫面 + shell 走過 | ✅ 28 條路由（含 login）逐一載入，**console error 全部 0** |
| Persona 登入主路徑 | ✅ 選 persona → `/dashboard`、topbar 顯示「AK A. Kumar 平台管理員」 |
| 切換實體/角色 | ✅ `switch-entity-role` 選 Ricoh Thailand → topbar 變 `RTH Thailand` |
| 登出 | ✅ cookie `isms_demo_persona` **登出後為空**、導回 `/login` |
| **負面測試（我加的）** | ⭐ **無 session 直接開 `/dashboard` → 被擋回 `/login`** |
| DEMO 標記逐頁目視 | ✅ `(app)` **27 / 27** 頁 `<DemoBadge/>` **實際可見**（量 bounding box 不只查存在）；`login` 用明文「本示範不使用也不接受密碼」 |
| 13 OpCo / 11 管轄區 | ✅ 矩陣 13 列、麵包屑「11 個管轄區」；實際 SG·HK 各 2 家 ⇒ 13 實體 / 11 管轄區 |
| 看不到 India / Japan-as-OpCo / BFSI | ✅ 全 app grep：India/DPDP **只出現在說明為何刪除的檔頭註解**、Japan 無 OpCo 列、**BFSI 0 命中** |
| 截圖 | ✅ 6 張存於 `artifacts/`（login · dashboard · dashboard 鑽取 · admin · admin 使用者 · isms-profiles）|

### 順帶實測的活功能（都不是 Potemkin）

- **儀表板鑽取**：點 Ricoh Malaysia → 六張 KPI 全部重算（84%→74% · 75→8 · 10/13→0/1）、
  整體態勢 A→R、最高殘餘風險只剩該實體兩筆
- **`/isms-profiles` 編輯流程**：編輯 → 16 個欄位出現 → 存成新版本 →
  **v2.1→v2.2 出現在版本歷程與 rail 卡** → toast「前一版本仍保留並標記為已被取代」
- **`/incidents/new` 漸進啟用**：填表前送出鈕 `disabled`，填完 17 欄後解除；
  按下去回「**僅為示範 —— 未送出任何資安事件、未發出任何通知，也未儲存任何資料**」
- **深色主題**：`data-theme` light→dark，背景 `rgb(245,246,248)`→`rgb(12,16,22)`
- **`/ai-assistant` 自我標示**：「示範模式 · 未連接任何模型」

### ⭐ 門檻修正在畫面上得到確認

Day 2 修的 `posture.ts` 兩組門檻，在 `/admin` 的 RAG 門檻表上**逐格等於 `dc.html:5088`**
（RCSA 75–89% · 高風險 ≤5 / 6–9 / ≥10）。儀表板矩陣同步：高/重大欄 ≤5 綠、6–9 琥珀 ——
修正前 `{4,7}` 會讓 5 變琥珀、8/9 變紅。**這是修正生效的視覺證據，不是推論。**

### Runtime 安全姿態（guardrail 7）

`localStorage` **0 鍵** · `sessionStorage` **0 鍵** · 唯一 cookie `isms_demo_persona`
（**httpOnly: true** · SameSite Lax · 值是 `platform-admin` 這個 persona id，
**不是 token、不是憑證、不是個資**）· 管理畫面 **0 個密碼欄位**。

### a11y / responsive

a11y：`aria-current="page"` ×1 · landmark 齊全（nav/main/banner）· 單一 h1 ·
**0 個未標籤的圖示按鈕** · 表格有 `<th>`。

responsive：**1440 / 1366 溢出 0**，1300 溢出 23px，**1280 溢出 43px**（英文 49px，與語言無關）。
交付物 `README.md:445` 宣告 ≥1280px ⇒ 差 28px。使用者裁決：**記錄不修**（→ `AD-ShellMinWidth-1`）。

---

## 使用者裁決

**「變更密碼」保留** —— 我提出它與已採納的 ADR-0007 衝突（認證走 Entra ID、登入頁無密碼欄位），
使用者裁決**本地帳號密碼流程應保留，作為本機開發與備用路徑**。

⚠️ **這是架構級決定，載體必須是 ADR-0007 的修訂而不是任何一次實作**（R5）。
本 phase **不實作** —— 沒有認證後端，密碼欄位疊在沒有後端之上就是這一輪花整輪在移除的 Potemkin。
現況：按鈕保留、停用、檔頭記錄裁決。→ **`AD-LocalPasswordFallback-1`（P0）**，
修訂必須先回答「break-glass 還是一般登入」。

---

## Gate（全部我自己跑的）

`format:check` **All matched files use Prettier code style** · `lint` **exit 0** ·
`type-check` **exit 0** · `test` **8 檔 / 76 通過** · `build` **✓ Compiled / 31 條路由** ·
`run_all` **9 / 9**

⚠️ api 端**零檔案變動**，本次未重跑（Day 4 closeout 會跑全套）。

---

## Day 3（續）— 27 頁並排保真度比對

Day 3 前半是**行為層**（能不能用），這一段是**視覺／文案層**（跟設計一不一致）。
**兩者互相看不到對方的東西** —— drive-through 抓到 25 個死控件而保真度比對一個都不會發現；
保真度比對抓到的偏離，drive-through 同樣看不到。

plan §8 risk 1 明寫**不可委派**（agent 寫的頁面不能由 agent 自己評分），本段全部自己做。

### 方法（以及為什麼不用計數當結論）

今天已經被原始 grep 命中數誤導兩次（SVG 9-vs-8、`sc-if` 37-vs-36），所以比對器做了兩件事：

1. **數元素不數子字串**，而且**先移除註解再數** —— 一段提到 `<sc-if>` 的註解不是一個 `<sc-if>`
2. ⭐ **最強的那一項**：把 fragment 的**每一段可見文字**逐字比對合併後的 en 字典。
   port 規則 5 規定 en 保存 fragment 原文 ⇒ **這條直接測得出有沒有漏抄或改寫**，
   而且它同時是結構完整性檢查：**掉了一整個區塊，該區塊的標題就會出現在缺漏清單上**。

### 結果

fragment **3,299 行** → page **23,102 行**（×7.0）· 可見字串 **719** ·
疑似缺漏 **44** → **逐筆追查後，真實漏抄 0**。

| 類別 | 筆數 | 判定 |
|---|---|---|
| 刻意算出而非照抄（交付物樣本範圍 vs 憲章真值）| 8 | ✅ D16 |
| 必填星號獨立渲染 | 11 | ✅ 誤報，且**比 fragment 多了 `aria-required`** |
| 供應商設定刻意留空 | 9 | ✅ 約束 7 + ADR-0002 未拍板 |
| 完整句子帶 placeholder，被我的擷取器切斷 | 7 | ✅ 誤報 |
| 住在 fixture 而非字典（資料不是文案）| 8 | ✅ 歸屬正確 |
| `Regulator / jurisdiction` → `Jurisdiction` | 1 | ✅ 已記錄 |

⭐ **最值得記的一筆是 `ai-assistant` 那 9 個。** fragment 把 host / agent 寫成
`Microsoft Copilot Studio` / `RicohAPAC-ISMS-Agent`，並宣稱 `Citations required` · `90 days · audited`。
port 全部渲染為「尚未設定」。理由不是風格：**約束 7 禁止綁定 provider、ADR-0002 未拍板**
（CLAUDE.md 禁止項：「在 ADR 未拍板前替使用者選技術」），
而且後兩項是**依據與留存的合規宣稱** —— 什麼都沒接卻渲染它們，
等於在治理平台上給出不實保證。**這比少一段文案嚴重得多，方向也相反：是交付物該改。**

### 🔴 我在這一段又犯了兩次同樣的錯

1. **比對器的 `conds` 欄位嚴重低估**（多行條件式我的 regex 抓不到），
   於是 27 行裡有 22 行被標上 `COND` —— **全部是偵測器假警報**。我沒有拿它當發現。
2. **我在 `page-inventory.md` 裡把加總數字寫錯了** —— 寫 3,190 / 21,891 / ×6.9 / 655，
   實際是 **3,299 / 23,102 / ×7.0 / 719**。那些數字是**我估的不是算的**，
   寫完才回頭跑加總才發現。⚠️ 這正是本 phase 一直在記錄的同一個形狀，只是這次的受害者是我自己的交付物。

⇒ 同 session 累計 **7 次**「拿便宜的代理指標／估值回答需要精算的問題」。
`.claude/rules/README.md` 的強度階梯門檻是 3 次。

### 產出

`docs/02-architecture/page-inventory.md` —— 含**覆蓋聲明**（掃了什麼 / **沒掃到什麼** /
方法的已知弱點）、27 列結果總表、44 筆逐筆判定、以及所有已記錄偏離的依據表。

⚠️ **明說沒掃到的**：視覺像素 diff **未做**（本次是代碼層）· zh-Hant 譯文品質未稽核 ·
shell 與 ai-drawer 未納入。
