# Mockup → Production Frontend Playbook

> **如何把一份 zero-build 的瀏覽器原型（mockup）轉成生產前端，而不累積視覺 drift。**

**Purpose**: 消滅「做完用眼睛比對、發現不對、再重做」的迴圈。
**Category / Scope**: Reference — 方法論 playbook
**Status**: Active
**適用**: 任何「有一份手寫 HTML/CSS/JS 原型，要在生產 bundler + TypeScript + utility-CSS toolchain 上重現」的專案
**不適用**: 純 backend / API / schema 變動；無 mockup 對應的工作

> **Modification History**
> - 2026-08-07: Initial creation — 由兩個獨立專案的實戰經驗提煉

---

## 0. 這份文件解決什麼問題

典型徵狀（出現以下任何一條，本 playbook 適用）：

- 真正達到 mockup parity 的頁面只佔少數，多數靠少量「逐行重建」的頁面撐住
- 同一個頁面被做了 3-4 次，大量重做
- 每個 phase 只能交付約一頁，epic 估時長到不切實際
- 「做完之後用眼睛比對，發現不對，再重做」
- 顏色靠眼睛湊（尤其 `oklch → HSL` 之類的色彩空間轉換）
- 需求方、規範文件（CLAUDE.md / CONTRIBUTING）、實際做法三方對不齊

**核心論點**：這些徵狀的根因**不是執行不力，是消費方法錯了** ——
團隊在「翻譯」mockup，而翻譯必然 drift。本 playbook 給出一個把翻譯鏈刪掉的方法。

> **證據強度**：這套方法在**兩個獨立專案**上各自被驗證過。兩邊都是先用翻譯法做了
> 多個 phase、累積出 fundamental drift，才切換到本方法後一次性重建成功。
> 這不是提案，是被實戰否定過又被實戰確認過的結論。

---

## 1. 一頁總結（TL;DR）

1. **Zero-build mockup 不是一個整體，是兩層**：視覺層（`styles.css`）和組件邏輯層（`*.jsx` / `*.html`）。兩層的「可複製性」**相反**。
2. **視覺層可以無損複製** → **逐字複製，永不翻譯**。整檔複製進生產 repo，組件直接消費 mockup 的 class 名。
3. **邏輯層無法複製**（zero-build：UMD / babel-standalone / window globals 無法被生產 bundler import）→ **只重寫邏輯**（資料來源、模組系統、type），**不碰視覺**。
4. **「翻譯 CSS」是所有 drift 的根因**。改成「複製 CSS」後，drift 注入點從數十個變成**零** —— 因為一次檔案複製有 0 個注入點。
5. **色彩空間轉換（`oklch → HSL`）是 unforced error**。現代瀏覽器原生支援 oklch；保留 mockup 的原始色彩空間。
6. **drift 還是會發生**（設計師改 mockup、新人不熟、re-sync 漏步）。靠 §7 的 6 個治理機制收住。

> **單一最大槓桿**：停止翻譯 CSS，改成複製 CSS。其餘所有機制都是輔助。

---

## 2. 問題定義 — Zero-build mockup vs 生產 toolchain

設計原型常被**刻意**做成「零 build、瀏覽器直開」，因為那讓設計師可以快速迭代、無需 toolchain。典型構造：

```html
<!-- mockup 的 index.html — 刻意 zero-build -->
<link rel="stylesheet" href="styles.css">                                    <!-- 單一手寫 CSS -->
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>  <!-- React UMD CDN -->
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>     <!-- 瀏覽器內 babel -->
<script type="text/babel" src="page-dashboard.jsx"></script>                 <!-- 未編譯 JSX -->
```

特徵：UMD CDN + babel-standalone、`window` 全域變數串接組件、單一手寫 `styles.css`、無 bundler。

**這個構造在技術上無法被生產 toolchain 直接 `import`。** 這是真實限制，不是藉口。

❌ **錯誤推論**：「既然不能直接 import，就只能整份翻譯重寫。」

✅ **正確推論**：「不能 import 的**只有邏輯層**。視覺層是純 CSS，生產端再 load 一個 `.css` 完全合法 —— 它可以、而且應該被無損複製。」

---

## 3. Drift 的根因 — 你在翻譯 CSS

「整份翻譯重寫」的翻譯鏈長這樣，**每一個箭頭都是一個 drift 注入點**：

```
mockup styles.css                          翻譯動作                 drift 注入
──────────────────────────────────────────────────────────────────────────────
.btn { padding: 0 14px; height: 32px }  →  utility「h-8 px-3.5」 →  px-3.5=14px? 還是 px-4? 湊
oklch(0.65 0.18 25)                     →  「hsl(14 90% 58%)」   →  跨色彩空間轉換，用眼湊
.card { box-shadow: 0 1px 2px … }       →  預設 shadow-sm        →  陰影參數不同，近似
border-radius: 10px                     →  rounded-lg (8px)      →  就近取整
font-feature-settings: "cv11"           →  （通常直接掉了）       →  靜默遺失
```

**關鍵事實**：手工把一個 CSS 宣告翻譯成 utility class **必然 lossy**。
每個 spacing / radius / shadow / typography 數值都在「找最接近的 utility」時被就近取整。
`oklch → HSL` 更糟 —— 那是跨色彩空間轉換，沒有人能用眼睛湊準。

把上表乘以「N 條路由 × 每頁數十個元素」，你得到的就是：
**每頁手工、每 phase 一頁、做完發現不對再重做**。這不是執行問題，是**方法問題**。

> **推論**：要消滅 drift，不是「翻譯得更仔細」，而是**刪掉翻譯這個動作**。

---

## 4. 核心解法 — 把 mockup 拆成兩層

### 4.1 兩層的可複製性相反

| Mockup 的層 | 典型檔案 | 能否無損複製？ | 為什麼 | 正確處理 |
|---|---|---|---|---|
| **視覺層 / CSS** | `styles.css` | ✅ **可以** | CSS 是純文字宣告。生產端在 utility-CSS preflight 之後再 load 一個 `.css` 完全合法，瀏覽器照常 cascade。 | **逐字複製，永不翻譯** |
| **組件邏輯層** | `*.jsx` / inline `<script>` | ❌ **不可以** | `window` 全域、babel-standalone、UMD 模組無法被生產 bundler 解析。 | **重寫成生產模組** |

這條接縫就是答案。「複製即用」對了一半（CSS），「重寫」也對了一半（邏輯）。
**把每個動作套在正確的層上。**

### 4.2 視覺層 — 逐字複製（4-layer sync protocol）

把 mockup 的 `styles.css` **整檔機械複製**進生產 repo，作為 sibling stylesheet，
在 utility-CSS preflight **之後** load。生產組件**直接消費 mockup 的 class 名**
（`.btn` / `.card` / `.nav-item`…），不重新拼成 utility。

```
┌──────────────────────────────────────────────────────────┐
│ Layer 1（canonical）   <mockup>/styles.css                │
│   設計師唯一改這裡。                                       │
└────────┬─────────────────────────────────────────────────┘
         │ verbatim copy（逐字複製，連順序、註解都保留）
         ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 2（生產採用）    <frontend>/styles-mockup.css        │
│   機械複製，除頂部 utility-CSS directive 外零修改。        │
│   ⚠ 絕不直接編輯此檔 —— 它不是 source of truth。          │
└────────┬─────────────────────────────────────────────────┘
         │ extract :root CSS vars only
         ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 3（utility 橋接）<frontend>/globals.css              │
│   :root 色彩 token，config 包成 oklch(var(--token))        │
│   供 utility class 消費。                                  │
└────────┬─────────────────────────────────────────────────┘
         │ mirror color tokens only（不含 radius / font）
         ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 4（型別鏡像）    <frontend>/theming/tokens.ts        │
│   colorsLight / colorsDark 物件供 build config 用。        │
└──────────────────────────────────────────────────────────┘
```

關鍵字是 **verbatim copy** —— Layer 2 是「複製」不是「詮釋」。複製是機械動作，有 0 個 drift 注入點。

#### Mockup 變更時的 re-sync 程序

**Token 變更（色彩 / radius / font / layout var）**

1. 在 Layer 1 `styles.css` 的 `:root`（或 `.dark`）block 改
2. **整檔** re-copy 到 Layer 2（保留生產檔頂部的 directive）
3. 若色彩 token 變了 → 更新 Layer 3 的裸值
4. 若色彩 token 變了 → 更新 Layer 4 的對應字串
5. 跑 verify gates（§7.4）
6. 測 dark mode toggle
7. 若這是 **drift 修復**（非計畫內變更）→ **同一個 commit** 內在 drift incident log 加一行
8. Commit：`style(tokens): <what> — sync styles.css → styles-mockup.css + globals.css + tokens.ts`

**Class 定義變更（新 primitive / 改 hover 等）**

1. 在 Layer 1 改 class 定義 → 2. re-copy 到 Layer 2 → 3. Layer 3/4 **無需改**（那兩層只帶 token，不帶 class 定義）
4. 若新增 class → 在 `docs/02-architecture/design-system.md` 的 primitive index 加一行
5. 若是 drift 修復 → drift incident log 加一行
6. Commit：`style(<class>): <what> — sync styles.css → styles-mockup.css`

#### ⚠️ 「整檔 re-copy」會有**已聲明的例外** —— 而那份例外清單本身會 stale

上面的 re-sync 程序寫「**整檔** re-copy」。照字面做，在一種常見情況下**會破壞單一事實來源**：

當 Layer 3（utility 橋接）已經擁有某一批 token，Layer 2 就會**刻意不帶**那批 token
（否則同一個 token 有兩個定義）。這時 Layer 1 與 Layer 2 之間存在一段
**合法而且必要**的差異 —— 整檔 copy 會把它抹掉。

**真實數字**：某專案量測時兩檔差 **79 行**，全部是刻意的
（一段檔頭註解 + 整個被刻意剔走的色彩 token 區塊）。
而該專案文件裡的「預期差異」清單當時只寫著「utility directive + 換行差異」。

> **兩個推論**：
> 1. **「預期差異」清單是衍生資料，會 stale** —— 它跟 §7.6 的稽核報告是同一類東西。
>    每次量測完要回頭更新它，並寫上量測日期。**沒有日期的預期差異清單不可信。**
> 2. **新 token 有兩個家，選哪個取決於 token 本身** ——
>    被 utility 消費的 palette token 走 Layer 3/4；只被 mockup class 用到的 status token
>    留在 Layer 1→2 而**不進** Layer 3/4。照你的 token 屬於哪一類跟隨先例，
>    **不要假設 re-sync 的第 3-4 步對每個 token 都適用**。

**機械守衛怎麼配合**：`check_mockup_fidelity.py` 只有一個純數字 allowance 時，
你唯一的做法是把它調成 79 —— 那等於**靜靜容許任何 79 行真 drift**。
改用 `ignore_diff_patterns` **逐條聲明**哪些行可以不同，
allowance 對其餘一切維持很緊，而被排除的行數會被印出來（讓豁免看得見，不會變成隱形許可）。

#### 絕對不要做

- ❌ 直接編輯 Layer 2 當 source of truth —— 下次 re-sync 你的改動會被覆蓋
- ❌ 在組件裡寫死色值 —— 一律走 `oklch(var(--token))`
- ❌ 在 Layer 3/4 加 token 而**不先**加進 Layer 1 —— 那破壞 canonical-source 鏈
- ❌ 為了「生產端方便消費」去改 mockup canonical —— mockup 是設計意圖，生產跟隨

### 4.3 組件邏輯層 — 只重寫邏輯，不碰視覺

邏輯層必須重寫（zero-build 構造無法被生產 toolchain import）。
但重寫**只針對邏輯**，視覺（class 名、inline style）原封不動 copy。

**標準 workflow，每頁**：

1. 開 mockup 的 `page-*.jsx`（原型組件 source）
2. 開生產目標 `page.tsx`
3. **並排，逐行機械翻譯**：
   - `window.MOCK_XXX` 全域存取 → typed API client
   - babel JSX → ES module（`import { useState } from 'react'`）
   - mockup 自訂的 popover / dropdown → 生產的 a11y primitive **外殼** + **內層 mockup JSX 結構原樣保留**
   - **所有 mockup CSS class 名 + inline `style={{…}}` 原封不動保留**
   - icon → 機械對應（見下）
4. 跑 verify gates
5. 用眼比對 —— 但這是**最後的信任閘**，不是發現機制（§7.3）

**機械翻譯規則**（只有真正必須翻譯的才翻譯，且機械、可重現）：

- **Icon 對應靠 SVG 路徑形狀，不靠語意猜測**
  - ❌ 語意猜測：Dashboard 圖示 `IcHome`（房屋形）→ 猜成 `LayoutDashboard`（四宮格）—— 視覺不符
  - ✅ 路徑配對：`IcHome` → `Home`（房屋輪廓相符）
- **資料來源**：`window` 全域 → typed client；`MOCK_DATA` → 真實 fetch
- **互動也要對齊**：mockup 是單擊 toggle 就不要包成三態 dropdown；
  mockup 沒有的控制項就不要「順手加」。**互動行為 drift 也是保真度 drift。**

---

## 5. 與 utility-CSS / component library 共存

採用本方法**不需要放棄** Tailwind / shadcn 之類的工具。重新界定它們的角色：

| 工具 | 用途 | **不要**用來 |
|---|---|---|
| **複製進來的 mockup CSS** | 視覺系統的 baseline —— 所有 primitive 外觀 | — |
| **utility class** | 一次性 layout 微調、responsive breakpoint | 重建視覺系統 / 翻譯 mockup class |
| **a11y component primitive** | 需要 focus trap / ARIA 的地方（Dialog / DropdownMenu） | 取代 mockup 的視覺 —— 它們的 thin default 會丟失 mockup 的 rich content |

**CSS specificity 注意**：`styles-mockup.css` 在 utility CSS **之後** load。
相同 specificity 下宣告順序贏 —— 所以 mockup `.btn { display: inline-flex }` 會蓋過 utility 的 `md:hidden`。
當 utility **必須**贏時，用 important variant：

```tsx
<button className="btn btn-icon md:!hidden">              {/* 只在 mobile 顯示 */}
<button className="btn btn-icon !hidden md:!inline-flex"> {/* 只在 desktop 顯示 */}
```

`!` 放在 variant prefix 之後、utility 名之前。
**不要為此翻轉 import 順序** —— 那會讓 utility base reset 蓋過 mockup body 樣式。

---

## 6. 不要做色彩空間轉換

如果 mockup 用 oklch 而團隊在轉 HSL —— **停止。這個轉換不需要發生。**

- 現代瀏覽器原生支援 `oklch()`
- utility CSS 在 custom property 上完全支援：裸值（`L C H`）放 `:root`，config 包成 `oklch(var(--token))`
- component library 預設主題用 HSL 只是**預設**，可以整碗換成 oklch token

`oklch → HSL` 是跨色彩空間轉換，沒有人能用眼睛湊準 —— 它是一個**自找的（unforced）有損步驟**。

```css
/* globals.css :root — 保留 oklch，裸 L C H 值 */
--accent: 0.65 0.18 25;
--background: 1 0 0;
/* 組件透過 oklch(var(--accent)) 消費，build config 同樣包裝 */
```

> 同理適用於任何色彩空間（lab / lch / display-p3）。原則：**mockup 用什麼，生產就用什麼。**

---

## 7. Drift 治理 — 當 drift 還是發生時

即使方法正確，drift 仍會發生。**實戰記錄：某個 phase 出貨的頁面有 4 處 fundamental drift
（TopBar 結構 / Sidebar IA / 主內容形狀 / Typography），而且通過了全部自動化 gate。**
它能收住，靠以下 6 個機制。

### 7.1 把設計保真度設為硬約束

保真度必須是一條**硬約束**，跟「不可改架構」「不可換 vendor」同層級，觸發即 **STOP**。

如果保真度只是隱性期望，「做完了但不對」永遠不會觸發硬停 ——
它只會默默進下一個 phase，drift 累積。

> 落位：CLAUDE.md §核心約束加一條；detail 指向本 playbook。

### 7.2 Fundamental drift → 重建，不要 patch

**這條直接對應「同一頁做 3-4 次」的重做迴圈。**

重做迴圈的本質是：用**同一套會 drift 的翻譯方法**，patch 完發現還是不對，再 patch，再 redo
—— 每次 redo 都用爛方法再注入一次 drift。

| 偏差程度 | 動作 |
|---|---|
| **局部小偏差** | inline 修 |
| **根本性形狀不對**（top bar / sidebar / 內容 layout 多項 mismatch） | 判定「**方法**錯了」→ **先換方法，再一次性重建** |

差別不在「重建 vs patch」，在於**重建之前先把方法換掉**。
如果重做時還用舊方法，第 4 次跟第 1 次一樣 drift。

重建時**保留**架構層（routing / API client / auth flow / backend / shell pattern），
**只重建** presentation 層。

### 7.3 驗證在代碼層做，不是用眼

> 「為什麼需要用眼去檢查？你不是應該直接在代碼文件的層面去檢查和把它們弄到一致的嗎？」

驗證 = 開 mockup `page-*.jsx` 跟生產 `page.tsx` **並排，逐行機械比對**。
用眼只是**最後的信任閘**（已對齊，確認一下），不是**發現機制**（靠眼睛找 drift）。

靠眼睛找 drift 必然漏掉 subtle 的 typography metrics / spacing 取整 / pseudo-state。
而且「用眼發現不對」這件事本身就太晚 —— 等你看到，cumulative drift 已經深。

CSS 層的驗證可以**完全程式化**：

```bash
diff <mockup>/styles.css <frontend>/styles-mockup.css
# 預期差異：只有頂部 directive 幾行 + 行尾 CRLF/LF。
# 其餘任何差異 = drift，立即查哪邊對（通常 mockup 對）。
```

「CSS 對不對」從一個用眼的主觀判斷，變成一個確定性的 `diff`。

#### 截圖與 computed-style 量測 —— 方法

上面的 `diff` 只證明 **CSS 檔**一致，**不證明兩邊 render 出來一樣** ——
同一份 CSS 掛在不同的 DOM 結構下長得可以完全不同。要比對 render 結果，
需要兩張真實瀏覽器截圖 + 對代表元素做 computed-style 量測。

**擷取方式：用 static file server，不要用 `file://`**

zero-build mockup 通常靠 CDN 載入 UMD runtime + 瀏覽器端 JSX 轉譯。
在 `file://` 下這些 CDN script 會因 CORS / SRI 失敗 —— 結果是一張**全黑或全白的 PNG**，
而且**不會拋錯**。你會以為截圖成功了，拿一張空圖去比對。

```bash
# Terminal 1 —— serve mockup 目錄（任何 static server 都行）
cd <mockup 目錄> && python -m http.server 8080

# Terminal 2 —— 對 http://localhost:8080 跑瀏覽器自動化截圖
#   viewport 固定（例如 1440×900）；兩邊必須同尺寸，否則比對沒有意義
```

**多頁 sweep 的技巧**：mockup 若是 hash routing 的 SPA，用 `window.location.hash` 切頁，
**不要**每頁重新 `goto`。第一次載入要等 CDN 轉譯（數秒），之後 hash 切換只要數百毫秒 ——
一次 `goto` + N 次 hash nav 比 N 次 `goto` 快一個數量級。

**computed-style 量測**：截圖是給人看的，**量測才是 gate**。

```js
getComputedStyle(el)         // fontSize / lineHeight / padding / gap / borderRadius / color
el.getBoundingClientRect()   // 版面尺寸
```

逐項對比兩邊的**同一個代表元素**，差異用**數字**表達，不是「看起來差不多」。
這才是 `mockup-fidelity.md` §DoD 第 4 條要的東西。

**何時跑**：drift audit / re-point phase 的 Day 0（取 baseline）與 pre-merge（留證據）；
mockup 來源更新後重跑，取得新 baseline。

**不要用這些**：

- ❌ `file://` + 瀏覽器自動化 —— CDN 失敗，得到黑圖，而且是**靜默**失敗
- ❌ 先把 JSX 轉譯成靜態 HTML —— 多一個 build step，且轉出來的已經不是 mockup 本身
- ❌ 線上截圖服務 —— 慢、要網路、而且**無法**做 computed-style 量測

### 7.4 自動化守衛

針對**特定 drift class** 設程式化守衛，放進 CI / pre-commit：

| 守衛 | 抓什麼 | 期望 |
|---|---|---|
| `diff` styles 檔 | Layer 1↔2 不同步 | 只剩已知的 directive 差異 |
| grep 寫死色值 | 組件裡的 inline arbitrary 色值（`[oklch(…)]` / `[#…]`） | **0 命中** |
| type / lint gate | 編譯與風格 | exit 0 |

本模板附 `scripts/lint/check_mockup_fidelity.py` 實作前兩項。

> ⚠️ **但記住**：這些 gate **不 measure 視覺保真度**。上述 4 處 fundamental drift
> **全部通過了自動化 gate**。自動化 gate 抓的是「有沒有人違反機制」，不是「視覺對不對」。
> 視覺保真度的 gate 是 §7.3 的代碼層並排比對 —— **不可以用自動化 gate 代替它**。

### 7.5 設計系統文件化一次

把設計系統（primitive 清單、layout pattern、composite pattern、色彩語意、interaction state 慣例）
寫成一份 **dev API reference**：`docs/02-architecture/design-system.md`。

開發者**查文件**，不去 `styles.css` 重新推導。**每次重新推導 = 再 drift 一次。**

### 7.6 Drift incident log + anti-pattern 目錄

**Drift incident log** —— 每次 drift 修復在表格加一行（住在 `design-system.md`）：

| 日期 | Drift 內容 | 哪邊對 | 修復 commit |
|---|---|---|---|
| YYYY-MM-DD | `--popover` dark mode `0.20` vs `0.22` | mockup 對 | `a385180` |

**Anti-pattern 目錄** —— 把重複踩的坑寫成具名 anti-pattern（§9），
每個 frontend phase kickoff 對著它做 pre-flight 檢查。
Drift 從「每次重新踩」變成「踩過一次就進目錄」。

---

## 8. 既有專案的遷移 checklist

把本 playbook 套進一個**已經在翻譯**的專案，按影響力排序：

- [ ] **1. 停止翻譯 CSS。** 逐字複製 `styles.css` 進生產 repo，在 utility preflight 之後 load；組件改用 mockup class 名
- [ ] **2. 停止色彩空間轉換。** 裸值放 `:root`，utility 用 `oklch(var(--token))` 消費
- [ ] **3. 重新界定規範文件的「重寫」scope。** 明文寫清：「重寫」只套用在**組件邏輯層**；CSS 是「複製」不是「重寫」
- [ ] **4. 建立 4-layer sync protocol** 與 re-sync 程序（§4.2）
- [ ] **5. 加 CI 守衛**：`diff` + 寫死色值 grep（§7.4）
- [ ] **6. 把保真度設為硬約束**（§7.1）
- [ ] **7. 訂「fundamental drift → 換方法後重建」規則**（§7.2）
- [ ] **8. 驗證移到代碼層**：mockup `.jsx` 與生產 `.tsx` 並排逐行（§7.3）
- [ ] **9. 建設計系統文件 + drift incident log + anti-pattern 目錄**（§7.5 / §7.6）
- [ ] **10. 建 page inventory** —— 每條路由的 parity 帳本
      （`docs/02-architecture/_TEMPLATE-page-inventory.md`）。
      移植橫跨多個 phase 時，「還剩多少 / 哪幾條是舊翻譯法產物」不能靠記憶

> **最短路徑**：第 1 + 第 2 點。逐頁手工翻譯的工作量，**絕大部分花在翻譯 CSS**。
> CSS 改成複製後，逐頁只剩「邏輯接 API」，工作量大幅塌縮，且 drift 注入點歸零。
> 先做這兩點，其餘是治理層、可漸進補。

---

## 9. Anti-pattern 目錄

| Anti-pattern | 為什麼錯 | 正確做法 |
|---|---|---|
| 手工把 mockup CSS 翻譯成 utility class | 每個 spacing / radius / typography 都被就近取整，lossy | 逐字複製 `styles.css`，組件消費 class 名 |
| 色彩空間轉換（`oklch → HSL`）用眼湊 | 跨色彩空間，無法湊準 | 保留原始色彩空間，走 CSS var |
| 語意猜測 icon 對應 | SVG 形狀不同，視覺不符 | 機械 SVG 路徑配對 |
| 用 a11y primitive 的 thin default 取代 mockup rich content | 丟失 mockup 的 rich identity surface | primitive 只做 a11y 外殼，內層保留 mockup JSX |
| 「順手 preserve」一個 mockup 沒有的舊 UI 元素 | mockup 沒有 = 不該存在；preserve 它就是 drift | mockup 沒有的元素 → drop |
| 把「backend 沒有對應」當理由 drop 一個 mockup 視覺元素 | backend 權威只管**資料契約**（欄位形狀），不管視覺元素的存在與否 | 視覺元素照 mockup 渲染；資料用 fixture 但**標示 DEMO** |
| mockup 是單擊 toggle 卻包成三態 dropdown | mockup 沒有的互動 = 互動 drift | 互動行為也要對齊 |
| 規範文件沿用舊 phase 的過時引用 | 過時的檔名 / 函式名 / pattern 污染新實作 | phase kickoff 先對規範文字做 pre-flight grep |
| 把「用眼比對」當**主要**驗證手段 | subtle drift 必漏 | 代碼層並排比對為主，用眼為最後信任閘 |
| 用自動化 gate（type / lint）代替保真度 gate | 那些 gate 不 measure 視覺；drift 照樣通過 | 保真度 gate = 代碼層 mockup-vs-impl 並排比對 |
| 拿**稽核報告**當真相來源去比對 production | 稽核報告是人手抄的衍生資料；手抄錯誤會一路往前傳且沒人挑戰（實例：錯誤傳播 23 個 phase）| 打通到 mockup 來源檔；出入時**改稽核報告**。見 `mockup-fidelity.md` §AuditDocSync |

---

## 10. 與本模板其他部分的接線

| 機制 | 落位 |
|---|---|
| 保真度硬約束 | `CLAUDE.md` §核心約束 |
| 觸發式規則（何時該讀本 playbook） | `docs/rules-on-demand/mockup-fidelity.md` |
| 自動化守衛 | `scripts/lint/check_mockup_fidelity.py`（併入 `run_all.py`） |
| 設計系統 + drift incident log + **維護排程** | `docs/02-architecture/design-system.md` |
| 路由 parity 帳本 | `docs/02-architecture/_TEMPLATE-page-inventory.md` → `page-inventory.md` |
| 「gate 綠 ≠ 能用」的上位原則 | `.claude/rules/verification-discipline.md`（always-loaded） |

> §7.4 的警告與 `verification-discipline.md` 是同一件事的兩個面：
> **自動化 gate 證明零件對，不證明成品對。** 前端的「drive-through」就是 §7.3 的並排比對 + 真瀏覽器走查。
