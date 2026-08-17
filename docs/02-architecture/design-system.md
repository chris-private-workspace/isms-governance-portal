# Design System — Primitive Index 與 Drift 事件簿

**Purpose**: W19 移植所建立的共用 primitive（住在哪 / 規則是什麼 / 陷阱在哪），以及本 phase 實際踩到的保真度漂移與現有守衛。

**Category / Scope**: Frontend / Phase W19
**Created**: 2026-08-17
**Last Modified**: 2026-08-17
**Status**: Active

> **Modification History**
> - 2026-08-17: Initial creation (Phase W19) — 取代 bootstrap 骨架，內容全部為實測

---

## 這份文件回答什麼

**「下一片前端要用的東西住在哪、規則是什麼、以及哪些坑已經有人踩過了。」**

[`mockup-to-production-frontend-playbook.md`](../06-reference/mockup-to-production-frontend-playbook.md) §7.5
的理由只有一句：**開發者查文件，不去 `styles.css` 重新推導 —— 每次重新推導 = 再 drift 一次。**

它**不**回答「我們搬過來的畫面跟設計一致嗎」。那是
[`page-inventory.md`](./page-inventory.md) 的職責（27 列逐畫面對照 + 每一處偏離的依據）。
本檔談 **primitive** 與漂移的**類別**，那張表不在這裡重抄。

---

## ⚠️ 量測聲明

本檔所有數字都是 **2026-08-17 實測**，不是引用。有 `file:line` 的就是逐行核對過的。

**三個必須明說的弱點**：

1. **視覺像素級比對沒有做。** 全部是代碼層量測（與 `page-inventory.md` 同一個限制）。
2. **本檔會 stale。** 帶日期的數字（尤其 §1 與 §6）在下一片動 `styles/` 或 fragments 時**必須重量**。
   沒有日期的量測不可信。
3. **不用 commit SHA 當錨點。** branch protection 開 `linear history`，rebase-merge 會改寫本分支
   每一個 SHA —— `scripts/lint/check_sha_anchors.py` 就是為這件事寫的。
   §5 的修復欄改用 **commit 標題**，那是唯一 rebase 後還活著的識別。

> ⚠️ **`AppShell.tsx` 的引用刻意不帶行號**（檔頭區塊除外）。撰寫本檔期間該檔正被另一個
> session 修改（1,229 → 1,238 行），先寫下的行號在同一次工作階段內就已經失效。
> **會動的檔用符號名當錨點，不用行號** —— 這正是本檔 §5 在講的同一個形狀，只是這次的受害者是本檔自己。

---

## 0. Layer map（本專案實況）

| Layer | 本專案 | 說明 |
|---|---|---|
| **1 Canonical** | `docs/06-reference/design_handoff_isms_grc_platform/styles/` —— `tokens.css` 96 行 · `base.css` 54 行 · `components.css` 123 行 | 交付物。**只讀** |
| **2 Adopted** | `apps/web/src/styles/` 三支同名檔 | **逐字複製**（以 `cp` 機械複製，非 Read+Write）。⛔ 絕不就地編輯 |
| **3 App-authored** | `apps/web/src/app/globals.css` | 本 app **唯一自撰**的 CSS：7 個字型 + 3 個樣式 `@import` · `html,body` · **10 條 `data-hov` rule** |
| **4 型別鏡像** | **不存在，且刻意不建** | 骨架模板假設有 `theming/tokens.ts`。本專案組件直接寫 `var(--token)` 字串，中間**沒有一層可以漂移** —— 建了才是 AP-5 |

**色彩空間**：**HEX**（`styles/tokens.css:24` 是 `--primary: #2A5BD7`）。**不做轉換。**
⚠️ `oklch(var(--token))` 在這裡會產生**無效 CSS 且靜默失效** —— 頁面照渲染，顏色是錯的（`AD-CssToken-1`）。

**機械守衛**：`python scripts/lint/check_mockup_fidelity.py`（`run_all.py` 9 項中的第 5 項），
設定在 [`.mockup-fidelity.json`](../../.mockup-fidelity.json)。三項檢查見 §5.1。

---

## 1. ⭐ `components.css` 的 class 沒有任何消費者 —— 兩邊都沒有

**這是本檔最重要的一節，寫在這裡就是為了讓下一片不必再發現一次。**

### 1.1 量測（2026-08-17）

| 問題 | 量測方式 | 結果 |
|---|---|---|
| 30 個 fragment 用了幾個 class？ | `grep -ro 'class=' fragments/` | **0** |
| 移植後的組件用了幾個 `className`？ | `grep -r 'className' apps/web/src`（全樹，不限副檔名）| **0** |
| `components.css` 定義幾個 class？ | 去重 `.grc-*` 選擇器 | **56** |
| `base.css` 定義幾個 class？ | 去重 class 選擇器（扣掉 Google Fonts URL 造成的 `.com` / `.css` / `.googleapis` 三個假陽性）| **21** |

⇒ **77 個 class 全部是孤兒。** 這是 Day-0 **D10**，本檔重測一次確認仍然成立。

而 `apps/web/src/app/globals.css:55` **仍然 import 它** —— 那 77 個 class 會進 bundle，
但沒有任何元素套用得到。

### 1.2 它自己就講了為什麼

`components.css:6-8`：

> The HTML design reference uses inline styles (a constraint of the prototyping tool).
> These classes are the same values, named — use them, or map them onto your codebase's
> existing component library.

⇒ 它是設計者**平行推導**出來的替代路徑，**不是 fragment 的來源**。

### 1.3 ⚠️ 而且「same values, named」這句話不成立

導覽項逐項比對（`AppShell.tsx:33-36` 記錄了這個發現，本檔逐行複驗）：

| | fragment 實際渲染 | `.grc-nav__item`（`components.css:115-116`）|
|---|---|---|
| padding | `8px 11px` | `0 12px` |
| border-radius | `0 7px 7px 0` | `8px` |
| font-size | `13px` | `12.5px` |
| gap | `11px` | `10px` |
| height | 由 padding 決定 | `34px` |

⇒ **佈局值一律取 fragment**，因為那是設計實際渲染出來的東西。

### 1.4 但它不是全無用處 —— 有兩個值只有它寫下來

fragment 在這兩處留 `{{ hole }}`，全交付物只有 `components.css` 寫出了值：

| 值 | 唯一出處 | 消費點 |
|---|---|---|
| 收合軌寬 `64px` | `components.css:113`（`.grc-nav--collapsed`）| `AppShell.tsx` 的 `const navW = collapsed ? '64px' : '232px'` |
| 導覽 active 樣式 | `components.css:118`（`.grc-nav__item[aria-current="page"]`）| `AppShell.tsx` 導覽項的 active 三元式（就地註解標了 `components.css:118`）|

⭐ 第二筆順帶關掉一個 a11y 缺口：Day-0 **D11** 量到 fragments **零 `aria-` 屬性**，
而 `components.css` 有 3 條選擇器依賴它們 ⇒ 那 3 條在交付物裡**永遠不會生效**。
移植時主動補 `aria-current={active ? 'page' : undefined}`。

### 1.5 給下一片的三條結論

1. ⛔ **不要去 `components.css` 找 class 來用**，也不要以為它是 fragment 的來源。要值就查本檔或直接讀 fragment。
2. ✅ 交付物的 `components/*.md`（7 份）**仍然有用** —— 它們寫的**幾何**是真的
   （如 `components/status.md:37` 的 StatusPill：22px 高 / `0 10px` padding / radius 6px / 11px-700），
   只是**它們描述的 class 機制在這裡沒有對應**。讀幾何，別讀 class 名。
3. ❓ **是否拿掉 `globals.css:55` 那行 import 留給下一片決定**（77 個 class 是純 dead CSS）。
   拿掉之前必須先確認：§1.4 那兩個值已內聯進 `AppShell.tsx`（**已確認**），且沒有第三個未發現的用途。
   ⚠️ 拿掉之後 `.mockup-fidelity.json` 的 `_comment_scope` 那段也要跟著改。

---

## 2. Primitive index

⚠️ **本索引依模組編，不依 class 編** —— 理由就是 §1：這個專案裡沒有 class 可以編。

| # | Primitive | 住在哪 | 一句話 |
|---|---|---|---|
| P1 | **五條 port 規則** | `apps/web/src/components/shell/AppShell.tsx:13-27` | 27 個畫面照抄的移植規則，不重新推導 |
| P2 | **Design token** | `apps/web/src/styles/tokens.css`（58 個 custom property）| 掛在 `[data-grc][data-theme]`，**不是 `:root`** |
| P3 | **`tok()` 狀態色** | `apps/web/src/lib/tok.ts` | 全產品所有評級 → 4 組 token 的**唯一**入口 |
| P4 | **`posture.ts` 門檻** | `apps/web/src/lib/posture.ts` | 數值 → RAG 字母的唯一入口；5 組門檻 |
| P5 | **`data-hov` hover** | `apps/web/src/app/globals.css:95-104` | 10 條 rule，涵蓋 fragment 全部 116 處 |
| P6 | **i18n** | `apps/web/src/i18n/` | 9 對字典 + `tr()`；key 一律字面 |
| P7 | **`<DemoBadge/>`** | `apps/web/src/components/DemoBadge.tsx` | 27/27 畫面的第一個子元素 |
| P8 | **Fixture** | `apps/web/src/data/`（23 支）+ `data/extended/`（24 支）| 交付物 `data/*.js` 的 1:1 對應 + 從 `dc.html` 轉錄的補集 |
| P9 | **`useShell()`** | `apps/web/src/components/shell/shell-state.ts` | 畫面讀 scope / period / locale 的唯一通道 |
| P10 | **Icon** | `apps/web/src/components/icons.tsx`（37 個匯出）| 組件只擁有 path + viewBox |

### P1 — 五條 port 規則（`AppShell.tsx:13-27`，逐字引用）

> 1. inline `style=""` -> `style={{}}` with the values **UNCHANGED**. Not one number is re-derived.
>    This is the whole point of the playbook's copy-don't-translate rule.
> 2. `style-hover=""` -> `data-hov=""`, resolved by 10 rules in `globals.css`. Mechanism changes
>    because inline style cannot express `:hover` in any technology; the declarations themselves
>    are character-identical.
> 3. `<sc-if>`/`<sc-for>` -> `{cond && ...}` / `{list.map(...)}`.
> 4. `hint-*` attributes dropped (`fragments/README.md:18`), but their placeholder counts were read
>    first — they say how many rows the designer intended each list to show.
> 5. Copy goes through `t()`, never inline. en holds the fragment's original wording so fidelity
>    stays checkable; zh-Hant is the default per guardrail 9.

⭐ **規則 5 的第二個作用**：因為 en 保存 fragment 原文，「fragment 的每一段可見文字是否逐字存在於 en 字典」
就成為一條**可機械執行的漏抄檢查**。`page-inventory.md` 的 719 個字串比對就是靠它。

### P2 — Design token

- 掛載點是 **`[data-grc]` 屬性選擇器**（`tokens.css:4,7`），不是 `:root`。掛錯層級 = 整份 token
  **靜默失效**（頁面不報錯，顏色全部 fallback）。實裝在 `layout.tsx` 的 `<html>`。
- 深色主題在 `tokens.css:67` 覆寫。`AppShell.tsx` 用一個 `useEffect` 寫
  `document.documentElement.dataset.theme` —— **少了這段，主題鈕會換 icon 但什麼都不變色**：
  token 掛在 `<html>`，而 `AppShell` 是它的子孫，state 碰不到。⭐ 這是本 phase 自己造出來又修掉的一個
  Potemkin，形狀是「有 handler、handler 有作用（換了 icon）、但那個作用不是使用者以為的那件事」。
- 分組：surfaces / lines / text / brand / nav rail / **RAG** / elevation（`--shadow`，全系統唯一陰影）/
  density（`--row-py`）/ type / radius / spacing。
- ⚠️ **字型**：`--sans` 鏈含 `'IBM Plex Sans JP'`，但**刻意不載入 JP 字面** ——
  繁中在拉丁字面無覆蓋，會落到 JP 並以日式漢字字形渲染（骨／直／戶）。理由寫在 `globals.css:24-32`。
  這是**有記錄的偏離**，不是遺漏。

### P3 — `tok()`：狀態色的唯一入口

`lib/tok.ts` 是 `components/status.md:11-18` 的逐字移植。四態 `G / A / R / N`，各回 `{bg, ink, dot}`，
**每個值都是 CSS custom property，沒有一個是字面色值** —— 這正是 fixture 能帶顏色而不觸發
hardcoded-colour 檢查的原因，也讓深色主題免費成立。

⛔ **領域映射不寫在這裡。** 「Effective → G」是控制項領域的事實，屬於呼叫點。
七個領域的完整對照表在 `components/status.md:23-31`（risk level / control status / incident severity /
audit grade / SLA / certification / task）。

### P4 — `posture.ts`：數值 → 字母

三個函式：`riskBand`（殘餘分數）· `band` / `bandDesc`（越高越好 / 越低越好）· `regionPosture`（滾升）。

**每個界線的出處分兩類，而這個區分是本檔的重點之一**：

| 界線 | 出處 | 性質 |
|---|---|---|
| 風險 `>= 16` 需處理 | **CLAUDE.md 已確認參數 #7**（憲章）| 程序權威 |
| `THRESHOLD` 五組全部 | **設計交付物 `dc.html:5088-5092`** 的 `thresholds` 集合 | 無程序可依 ⇒ 交付物即唯一來源（參數 #11）|
| `regionPosture` 用中位數 | **兩者都沒有** | ⚠️ 明文記為 open question，不是已定案 |

⭐ 第三類的誠實標示是有價值的：交付物對六個實體直接寫死 `'A'`，所以**沒有設計答案可抄**。
中位數是選來「一句話能解釋、且單一實體無法定義整區」，`posture.ts:107-113` 明說它不是治理級規則。

### P5 — `data-hov`：唯一的機制變更

**量測（2026-08-17，30 個 fragment）**：`style-hover` 出現 **116 次，只有 10 種唯一值**，
前三種佔 **109** 次（`--surface-3` 75 · `--surface-2` 19 · `--nav-surface` 15）。

> ⚠️ 原始 `grep -r` 會回 **117** —— 多出來的一筆是 `fragments/README.md` 裡的說明佔位
> `style-hover="…"`。**一段講 `style-hover` 的說明不是一個 `style-hover`。**
> 這與 `page-inventory.md` 先移除註解再數元素是同一條紀律。

10 條 rule 全部在 `globals.css:95-104`，**每條宣告逐字照抄它取代的那個 attribute**。

⭐ **依「值」命名而不依「用途」命名**（`globals.css:85-88`）：
`data-hov="s3"` 在任何地方都是 surface-3。語意化命名（`data-hov="row"`）**是一個設計決策**，
而這裡要的是**任何人一步就能對回 fragment 的機械對應**。

⭐ **用 attribute 而不用 class**：fragments 零 `class=`（§1），引入 class 會模糊
「複製自 mockup」與「我們自己寫的」的界線。

⚠️ **停用的元素必須把 `data-hov` 拿掉** —— `[data-hov]:hover` 在 disabled 元素上照樣觸發，
留著會抵消停用的視覺訊號。這是 Day 3 的實作結論，也是 `page-inventory.md:85-88` 記的
「fragment 的 `style-hover` 數與 page 的 `data-hov` 數刻意不相等」的原因。

### P6 — i18n

- **9 對字典**（shell / registers / forms / details / settings / deep / auth / admin / profiles），
  在 `i18n/index.ts:72-94` 合併。
  ⭐ **分檔是並行寫入的正確性，不是組織偏好**（`index.ts:58-70`）：27 個畫面數人平行寫，
  共用一對 JSON 必然互相覆蓋，而**遺失的合併看起來像少一個 key、不像衝突**。
- **`tr()` 是畫面唯一入口**，型別是 `(key: TranslationKey) => string`（`shell-state.ts:43`），
  `TranslationKey` 由 zh-Hant 字典推導（`index.ts:97`）⇒ **不存在的 key 是編譯錯誤**。
- ⛔ **key 一律字面，禁止樣板字串組。** 需要 runtime 查表時走
  `Record<string, TranslationKey>` 常數表（全 app 現有 13 處，如 `os-portfolio/page.tsx:104`）。
  理由見 §5 事件 4。
- **術語**：`apps/web/src/i18n/GLOSSARY.md:45` —— `control` = **控制項**（禁用 控制／管制）。

### P7 — `<DemoBadge/>`

27 / 27 個 `(app)` 畫面的第一個子元素，琥珀色、有邊框、在頁面標題**之上**。

⭐ **刻意不低調**（`DemoBadge.tsx:14-18`）：灰色小字符合規則的字面而違背它的目的 ——
這是治理平台，**一張脫離上下文的截圖不得能被當成真實的 ISMS 現況**。

### P8 — Fixture

| 層 | 數量 | 來源 |
|---|---|---|
| `data/*.ts` | **23** | 交付物 `data/*.js` 也是 **23** 支。22 支同名 1:1；`data.js` 是唯一改名的那支 → `entityPosture.ts`（從 `opcos.ts` map 出來，所以 13 不是寫死的） |
| `data/extended/*.ts` | **24** | fragment 消費但 `data/` 裡不存在的集合，從 `design/*.dc.html` **轉錄並標註行號**，不是發明 |

⚠️ `.prettierignore` 排除 `apps/web/src/data/` —— prettier 會把每列 fixture 從一行炸成 ~13 行，
那會摧毀「每一列都能與交付物 1:1 diff」這個性質。**不是風格偏好，是可稽核性。**

### P9 — `useShell()`

`ShellState` 是畫面能讀的全部：`locale` · `tr` / `trf` · `scopeCode` / `scopeLabel` / `entity` ·
`setScope` · `setLocale` · `periodLabel`。

⭐ **它存在的理由是反 Potemkin**（`shell-state.ts:13-18`）：topbar 的 scope 選擇器與期間控制被渲染成
可互動的；**如果改了到不了畫面，它們就是看起來會動的死控件**。`useShell()` 在 shell 外會 **throw**
而不是回預設值 —— 讓接線錯誤變大聲而不是無聲。

### P10 — Icon

37 個匯出，全部是交付物的 inline SVG 逐字搬。Day-0 量到 30 個 fragment 共 145 個 `<svg>`，
`<img>` / sprite / icon font / `url()` **全部零命中** ⇒ **無資產管線需求**。

⭐ **抽象線的位置**：組件只擁有 **path data + viewBox**；尺寸 / 描邊 / 顏色**留在呼叫點**。
同一個盾牌在品牌區是 17px/`#fff`/1.9、在導覽軌是 18px/`currentColor`/1.7 ——
折進組件預設值會**靜默抹平 mockup 刻意的差異**。

⚠️ 有兩個 icon 帶著「假重疊」的挖空（mockup 為了對齊導覽軌做的），**只有在導覽軌上才對**。
別拿去淺色表面重用。詳見 `icons.tsx` 檔頭。

---

## 3. Interaction states

| 狀態 | 慣例 | 出處 |
|---|---|---|
| **hover** | `data-hov="<10 個允許值之一>"` | §P5 |
| **active（導覽）** | `aria-current="page"` + `components.css:118` 的三個宣告 | §1.4 |
| **disabled** | `disabled` + `cursor: not-allowed` + `opacity .5` + `title={tr('shell.inert')}` + **移除 `data-hov`** | §5 事件 3 |
| **selected / pressed** | `aria-pressed`（如 `preferences/page.tsx:186`）| Day-0 D11 的 a11y 補強 |
| **demo / fixture** | `<DemoBadge/>`，每頁第一個子元素 | §P7 |

⛔ **沒有 loading 慣例，因為沒有非同步資料源。** 27 個畫面全部渲染 fixture。
接上真 API 的那一片要新增這一列 —— **不要現在先建**（AP-5）。

---

## 4. 這一片沒有引入的東西（避免下一片重找）

- **Tailwind 尚未安裝**，`className` 全 app **0** 處。組件直接寫 inline `style={{}}`。
- **沒有 component library**，沒有 `theming/tokens.ts` 型別鏡像（§0 Layer 4）。
- **沒有 CSS module / styled-components**；本 app 自撰的 CSS 只有 `globals.css` 一支。

---

## 5. ⭐ Drift incident log

**格式偏離**：模板骨架的「修復 commit」欄改為 **commit 標題** —— 理由見 §⚠️量測聲明第 3 點。

> 這張表的用途不是問責，是**看出 pattern**。本 phase 五筆裡有四筆是同一個形狀：
> **拿一個便宜的代理指標（命中數 / 型別過 / gate 綠 / 交付物的散文），去回答一個需要讀內容才能回答的問題。**

### 事件 1 — `data-hov` 靜默失效（機制層）

| | |
|---|---|
| **什麼漂移** | `data-hov="surface-3"` 而 `globals.css` 定義的是 `s3`。**一個沒有對應 rule 的值會渲染、會過型別、會過 lint、會 build，然後什麼都不做。** |
| **怎麼發現** | 不是 gate 抓到的 —— 是一個平行的 subagent 在照抄範本時回報衝突。⚠️ 我第一次複驗時用 `grep -oE 'data-hov="[^"]+"'` 掃 CSS，只找到 2 個「已定義」值，因為 **CSS 選擇器用單引號** `[data-hov='s3']` ⇒ 差點得出「只定義了 2 個」的錯誤結論。逐字讀檔才拿到真正的 10 個。 |
| **代價** | **7 處 shipped**（dashboard 4 · login 3）。⛔ **最糟的是位置**：其中 4 個在 `dashboard/page.tsx` —— 那正是其餘 26 個畫面被指定去抄的範本。而範本作者自己違反了自己寫給 agent 的規則第 2 條，四個 agent 全部遵守了。 |
| **為什麼 diff 看不出來** | fragment 寫 `var(--surface-3)`，所以 `data-hov="surface-3"` 在逐字比對時**完全合理**。只有比對「值 vs 規則集合」才看得出來。 |
| **現在誰守著** | ✅ **`check_hover_rules`**（`scripts/lint/check_mockup_fidelity.py:233-276`）。掃所有 `component_globs` 的 `data-hov` 值，比對 `hover_css` 實際定義的規則集合，無對應即 fail 並印 `file:line` + 合法值清單。**有負面測試**（`AD-NegativeGate-1`）：故意改一個值 → `[hover-no-op] …:791` + EXIT=1；改回 → OK。 |
| **守衛的已知邊界** | 只掃 `*.tsx`（`component_globs`）；`globals.css` 註解裡的 `data-hov="row"` 不在射程內（正確）。但**它分不出註解與真標記** —— 若有人在 `.tsx` 註解裡寫一個不存在的值，會是假陽性。目前全 app 74 個原始命中中，2 個是註解（`globals.css:86` 與 `AppShell.tsx:18`），實際標記 **72 個，全部解析成功**。 |
| **修復 commit** | `feat(ui, W19): 20 screens, the persona login, and a rule I wrote then broke myself` |

### 事件 2 — 門檻轉錄漂移，而「invented」這句話把它藏住了（值層）

| | |
|---|---|
| **什麼漂移** | `lib/posture.ts` 的五組 `THRESHOLD`。設計交付物在 `dc.html:5088-5092` **五組全部寫明**：Control coverage `≥90 / 80–89 / <80` · RCSA completion `≥90 / **75–89** / <75` · Overdue tests `≤2 / 3–5 / ≥6` · Open critical issues `0 / 1 / ≥2` · High/critical risks `**≤5 / 6–9 / ≥10**`。`posture.ts` **三組吻合、兩組漂移** —— RCSA completion 的 amber 界線 75 寫成 **70**；high/critical risks 寫成 **4 / 7**。 |
| **⭐ 根因不是抄錯，是那句宣稱** | header 原本寫「這五組是憑空發明的、本 repo 無程序陳述它們」。**一個被宣告為發明的值，沒有任何東西可以被拿去比對。** 三組吻合正好證明當初就是抄這份 —— 所以這是**轉錄漂移，不是刻意偏離**。 |
| **怎麼發現** | 只有在 `/admin` 畫面把**設計的門檻表**與 `posture.ts` **並排渲染**時才浮出來。沒有任何 gate 會問這個問題。 |
| **代價** | **9 個畫面**（含旗艦儀表板）有兩個指標**照著沒有人選過的數字**分帶。修正前 `{4,7}` 會讓「5 件高風險」顯示琥珀、「8–9 件」顯示紅。 |
| **裁決 / 修復** | 使用者裁決**對齊交付物**（參數 #11：無程序可依時交付物是唯一來源）。`completion.watch` 70→75 · `highRisks` `{4,7}`→`{5,9}` · header 改寫成誠實描述。五組逐組複驗 **MATCH ×5**。 |
| **視覺確認** | Day 3 drive-through 在 `/admin` 的 RAG 門檻表逐格對上 `dc.html:5088`；儀表板矩陣同步。**這是修正生效的視覺證據，不是推論。** |
| **現在誰守著** | ⛔ **沒有。** 「宣稱來源」與「真實來源」不一致這一整類，目前無機械守衛。緩解只有兩條慣例：(a) 所有借自交付物的值必須標 `dc.html:NNNN`；(b) `/admin` 的門檻表**必須讀 `posture.ts` 而不是自帶第二份拷貝** —— 那個並排渲染正是這次唯一的偵測機制。 |
| **修復 commit** | `feat(ui, W19): the last three screens, and a drift the admin screen exposed` |

> ⚠️ **殘留**：`posture.ts:88-90` 的 `THRESHOLD` docstring 仍寫著「Invented — see the file header」，
> 而 header 已改成相反的說明。那是一句 orphan claim（AP-7）。本文件不改 code；**登記在此待修**。

### 事件 3 — 25 個死控件，通過了每一項 gate（行為層）

| | |
|---|---|
| **什麼漂移** | **15 個畫面上的按鈕沒有 `onClick`、沒有 `disabled`、`cursor: pointer`、`opacity: 1`**，其中 **4 個還帶 `data-hov`，滑鼠移過去會亮**。看起來完全是活的，按下去什麼都不發生。 |
| **怎麼發現** | **只有 Day 3 開真瀏覽器才發現。** 它們通過了 `format` · `lint` · `type-check` · `build` · **76 個測試** · **`run_all` 9/9**（含本 phase 自己新加的 `check_hover_rules`）。**沒有任何一項機械檢查看得到它們。** |
| **代價** | 首輪 sweep 25 個按鈕；⚠️ 該 sweep 自己有兩個射程漏洞（**D23**，由 agent 找出）：只掃 `<button>`（漏掉帶 `cursor:pointer` 的 `<span>`）、只掃預設分頁（漏掉非預設分頁後面的控件）。補掃第一版又誤報一大批（把可點 `<tr>` 的子 `<td>` 全算進去，因為只排除 `<a>`/`<button>` 祖先而沒排除**任何帶 onClick 的祖先**）。 |
| **⭐ 修復規則（下一片照用）** | **先問「這個控件能不能真的做到」，做不到才停用。** 最終處置：**接上 2** · **停用 24 鈕 + 2 span** · **移除假的可點外觀 3 列**。⭐ 語言卡是唯一「能力早就存在、只是沒接上」的一個 —— `AppShell.tsx` 的 `useState<Locale>` 一直提供 `setLocale`，topbar 的語言選單也一直在用，只是 `ShellState` 沒把它暴露出去。加上去之後卡片**真的會切換語言**（`preferences/page.tsx:103,185,186`）。 |
| **⚠️ 停用的第二步** | **`[data-hov]:hover` 在 disabled 元素上照樣觸發** ⇒ 停用時**必須連 `data-hov` 一起移除**，否則亮起的 hover 會抵消停用的視覺訊號。這是 `page-inventory.md` 的 `hovF` 欄與 page 側 `data-hov` 數刻意不相等的原因。 |
| **⛔ 反向的一筆** | `/ai-assistant` 對話歷程是**保真度與反 Potemkin 正面衝突**的一處：fragment 自己就給了 `cursor:pointer` + `style-hover` 而**沒有 `onClick`**，且它的資料是 `{title, meta}`、**沒有訊息內容** ⇒「接上」永遠不可能誠實達成。判 guardrail 優先，移除 pointer 與 hover。 |
| **驗證** | 自己開車複驗 15 條路由：24 個停用鈕 + 2 個 inert span **零違規**（每個都是 `cursor: not-allowed`、`data-hov` 為 **null**、`title` 正確解析）；補掃後 **27 條路由全部 `deadButtons: []`**。獨立佐證：`shell.inert` 這個 key 目前正好出現在 **15 個畫面檔**。 |
| **現在誰守著** | ⛔ **沒有機械守衛，而且大概不該有** —— 這是 `verification-discipline.md` 明講「drive-through 是 AP-3 唯一有效偵測機制」的那一類。守衛是**流程**：user-facing 功能標 done 前必須開車。 |
| **修復 commit** | `fix(ui, W19): 25 dead controls that every gate had passed` |

### 事件 4 — i18n key 用樣板字串組出來（型別層）

| | |
|---|---|
| **什麼漂移** | KPI 文案原本寫成 `` tr(`dash.kpi.${k.key}.label` as '…') ``。**一個 runtime 組出來的 key 會過型別（那個 `as` cast 正是把守衛拿掉的東西）、會正常渲染**，而 `i18n.test.ts` check 3 **掃原始碼找 key 字面**（`i18n.test.ts:130`）⇒ 掃描器看不見它。 |
| **代價** | 6 個 KPI 的鍵不設防，測試照樣全綠。progress.md 記為「6 個有 5 個不設防」。 |
| **修復規則** | **key 一律字面**（`labelKey` / `subKey` / `footKey`）。runtime 查表走 `Record<string, TranslationKey>` 常數表。**這是 27 個畫面的 port 規則。** |
| **現在誰守著** | ⚠️ **主要是型別，不是那條測試。** `ShellState.tr: (key: TranslationKey) => string`（`shell-state.ts:43`）讓不存在的 key 變成編譯錯誤 —— 只要沒有 `as` cast。⭐ **`i18n.test.ts` check 3 幾乎守不到畫面層**：它的 regex 只匹配 `t(x, '字面')` 兩參數形式，而 27 個畫面全部呼叫**單參數的 `tr('…')`**。**實測 2026-08-17：check 3 看得見 13 個 key（全部來自 W01 scaffold 的 `app.*` / `health.*`），畫面層另有 718 個 key 它一個都看不到。** |
| **⇒ 下一片必須知道** | 不要把「i18n 有測試守著」當成畫面層也被守著。目前畫面層的守衛是 **type + 「不准用樣板字串」這條規則**；`check 3` 的射程是 scaffold。要真的擴大射程，得讓它也認得 `tr('…')`。 |
| **修復 commit** | 在 `feat(ui, W19): the fixtures, the first screen, and a verify command that could never pass` 之前於工作區修掉 ⇒ **git 歷史上第一版就已經是字面 key**（`dashboard/page.tsx:137` 那行註解就是這次的產物）。因此「5 / 6」這個數字**無法從 git 複驗**，僅存於 progress.md。 |

### 事件 5 — 計數照抄而非算出（資料層）

| | |
|---|---|
| **什麼漂移** | 交付物**自己的散文計數已經對不上它自己的資料**。最清楚的一筆：`fragments/screens/14-admin.html:237` 寫 **「43 users」**，而同一區塊的迴圈是 `:247` 的 `<sc-for list="{{ adminUsers }}" … hint-placeholder-count="8">` ⇒ **43 寫在一個 8 列的清單上面**。同類還有 `6 connected`（hint=8）、`grounded on 7 sources`（`knowledgeSources` 8 列）、Issues badge `5`（`issues` 10 列、未結 9）。 |
| **怎麼發現** | Day 2 建 fixture 時逐檔對照 fragment 的 `hint-placeholder-count`（規則 4 要求剝除前先讀出來）。 |
| **代價** | 若照抄，畫面上會出現一個**與它正下方的清單自相矛盾**的數字 —— 在治理平台上那是可稽核性問題，不是文案問題。 |
| **修復規則** | ⭐ **畫面上的計數一律由資料算出，不從 fragment 抄字面。** 這條同時吸收了憲章範圍差異（交付物的樣本是 6 實體 / 6 管轄區 / 14 OpCo，憲章是 **13 OpCo / 11 管轄區**）—— 算出來才會**持續**正確。逐筆對照表在 [`page-inventory.md`](./page-inventory.md) §類別 1。 |
| **現在誰守著** | ⛔ **沒有。** 計數類無機械守衛。緩解是慣例：`entityPosture.ts` 從 `opcos.ts` map 出來，所以 13 是 `opcos.length` 的結果而不是字面量；其餘畫面同理。 |
| **修復 commit** | `feat(ui, W19): the fixtures, the first screen, and a verify command that could never pass` |

---

## 5.1 現有守衛總表（`check_mockup_fidelity.py`）

| 檢查 | 抓什麼 | 本專案設定 |
|---|---|---|
| `check_verbatim_copy` | Layer 1↔2 不同步 | 只守 **`tokens.css`**，`allowed_header_diff_lines: 0` |
| `check_hardcoded_colors` | 組件裡的字面色值 | 自訂 pattern 抓**裸 hex**（無 Tailwind），豁免交付物自己在 token 系統外用的 **8 個值** |
| `check_hover_rules` | `data-hov` 無對應 rule | 事件 1 的產物 |

⚠️ **`.mockup-fidelity.json` 的 `_comment_scope` 已自承一個 KNOWN GAP**：`canonical_css` 只吃**一條**路徑，
而交付物有**三支** stylesheet ⇒ **`base.css` 與 `components.css` 沒有機械守衛**，
它們的守衛是 `page-inventory.md` 記錄的代碼層並排比對。
⛔ **不要把這個檢查跑綠讀成「三支 stylesheet 都完好」。** 已登記為 BACKLOG 的 AD。

---

## 6. 目前沒有守衛的 drift class（明列，不假裝有）

| Drift class | 為什麼機械檢查抓不到 | 目前的緩解 |
|---|---|---|
| **宣稱來源 ≠ 真實來源**（事件 2）| 一個宣告為「發明」的值沒有可比對對象 | 慣例：借自交付物的值必須標 `dc.html:NNNN` |
| **死控件 / Potemkin**（事件 3）| 有 handler 但 handler 是空的、有結構但無邏輯 —— 靜態分析看不到 | **drive-through**（`verification-discipline.md`） |
| **計數照抄**（事件 5）| 一個字面數字沒有任何東西說它應該等於什麼 | 慣例：一律算出 |
| **`base.css` / `components.css` 漂移** | `canonical_css` 只吃一條路徑（§5.1）| 代碼層並排比對 |
| **視覺像素差異** | 全部 gate 都不量視覺 | ⛔ 未做（需截圖 diff） |
| **zh-Hant 譯文品質** | parity 測試只驗 key 對稱，不驗譯得對不對 | ⛔ 未稽核 |
| **fixture 英文列舉值滲進中文句子** | 值是資料不是文案，i18n 守衛管不到 | ⛔ 已知缺口，登記在 BACKLOG（跨畫面一起處理） |

---

## 7. Sync protocol

完整程序見 playbook §4.2。本專案的摘要：

**Layer 1 改 → 用 `cp` 整檔複製到 Layer 2 → `diff` 確認 IDENTICAL → 跑 lint → 測暗色主題 → 開車。**

⛔ **絕不直接編輯 Layer 2。**
⭐ **用 `cp` 而不是 Read+Write** —— 後者讓內容經過助手的手，**那就是一個 drift 注入點**，
而逐字複製這件事的全部價值就是「0 個注入點」。

### 7.1 預期差異（**帶量測日期**）

`diff <Layer 1> <Layer 2>` 應該只剩下列項目。**其餘任何差異 = drift。**

| 檔 | 預期差異 | 為什麼合法 |
|---|---|---|
| `tokens.css` | **無**（`allowed_header_diff_lines: 0`）| 逐字複製，零偏離 |
| `base.css` | **1 行** —— 第 6 行的 Google Fonts `@import` 改為註解 | **guardrail 7 / CSP** —— 外部字型引用不進生產。字型改由 `@fontsource` 自帶（`globals.css:45-51`）。這是 `styles/` 全目錄唯一的外部引用 |
| `components.css` | **無** | 逐字複製 |
| 全部 | 行尾 CRLF / LF | checkout 差異；`check_mockup_fidelity.py:150` 已正規化 |

**最後量測**：`2026-08-17` · `tokens.css` 實測差異 **0** 行（`check_mockup_fidelity` OK）·
`base.css` / `components.css` 於 Day 1 複製後 `diff` **IDENTICAL**，`base.css` 的一行註解為之後套用的聲明差異。

> ⚠️ **這張表是衍生資料，會 stale。** 每次量測完回頭更新它並換日期。
> `base.css` 那條差異**目前無機械守衛**（§5.1），所以它比另外兩支更需要人工重量。

---

## 8. 維護

**Cadence**：跟著**下一次動 `styles/` 或 fragments 的 phase** 走，不設獨立日曆排程。

> **為什麼不設季度排程**：本專案是單人開發，且交付物是**一次性的 handoff 而非持續演進的上游**——
> 設一個沒有人會被提醒的到期日，比誠實地寫「下次碰到它的時候重量」更糟。
> 若交付物之後真的開始滾動更新，這一節要改成有 owner 有日期的排程。

**下一片碰到前端時的 checklist**：

- [ ] 跑 `python scripts/lint/run_all.py` → 9/9
- [ ] 重量 §1.1 四個數字（class 是否仍然零消費者），**更新量測日期**
- [ ] 重量 §P5 的 116 / 10（若 fragments 有變動）
- [ ] 回頭更新 §7.1 的預期差異表 + 日期
- [ ] 新 drift 修好後，在 §5 加一列（與修復同一個 commit）
- [ ] user-facing 變更做 drive-through，不是只看 gate

---

## Related

- [`page-inventory.md`](./page-inventory.md) — 27 個畫面的逐頁保真度對照（本檔不重複）
- [`15-design-alignment.md`](./15-design-alignment.md) — 保真度**例外**的單一權威來源
- [`COMPONENT_CATALOG.md`](./COMPONENT_CATALOG.md) — component 清單
- [`../06-reference/mockup-to-production-frontend-playbook.md`](../06-reference/mockup-to-production-frontend-playbook.md) — 方法論全文（§7.5 要求本檔存在）
- [`../rules-on-demand/mockup-fidelity.md`](../rules-on-demand/mockup-fidelity.md) — 紅線與 DoD
- [`../01-planning/W19-mockup-port/progress.md`](../01-planning/W19-mockup-port/progress.md) — 本檔 §5 的一手來源（drift findings `D1`–`D25`）
