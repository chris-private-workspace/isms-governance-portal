---
status: closed_partial   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W20 Plan — responsive layout down to 768px

**Summary**: 讓 W19 落地的 30 個畫面在 **768px–2560px** 之間都能用。交付物**零 `@media` 斷點**且明訂
「designed for ≥1280px」，所以本片是**已核可的設計偏離**（使用者 2026-08-17 裁決），登記於
`15-design-alignment.md`。關鍵範圍決策：(a) 支援下限 **768px**，不做手機直式；(b) 驅動機制**混合** ——
能純 CSS 就純 CSS，只有側欄自動收合與 topbar 收納走 `matchMedia`；(c) **不做** class 遷移。
**Drive-through 為 MANDATORY**（純 UI phase）。非 spike，**不產出 design note**。

**Status**: **closed_partial**（2026-08-18）—— Day 0 與 Day 1 執行完畢並全綠，使用者三度否決視覺結果後裁定**完全回退**（`6f2c712`）。Day 2/3/4 未執行。
⚠️ **本 plan 的前提已被推翻**：它假設任務是「補上交付物沒有的響應式行為」，而使用者要的是「和 mockup 一樣」。§3 的技術方案不可作為未來依據，§0 記錄的既有事實與 `retrospective.md` 的三個交付物發現才是本片的殘值。

**Branch**: `feature/W20-responsive-layout`
**Base**: `main` HEAD `756d503`（PR #81 —— ROADMAP 9b 排程 rebase 設定重審）
**Slice**: standalone —— 關掉 `AD-Mockup-Responsive-1`（本片開立），非任何 arc 的一片
**Scope decisions**: (a) 下限 768px，不做手機 (b) 混合驅動：CSS 優先、`matchMedia` 只用 2 處
(c) 不遷移 className (d) 寬螢幕的處置見 **D1**，是本片唯一需要使用者拍板的視覺決策

---

## 0. Background

### The gap（`AD-Mockup-Responsive-1`）

使用者在 3200 上觀察到「不是全屏響應式，而是固定的高和寬度」。實測確認**兩個相反方向的問題**：

- **寬螢幕**：表單／詳情頁的內容被 px 上限夾住（560–1000px）且**靠左不置中**，右側留大片空白
- **窄螢幕**：全站 **0 個 `@media`**，1280px 已溢出 28px、1024px 溢出 284px，且無任何重排

### Why it matters（缺失的能力）

這是一套給 11 個管轄區、13 家 OpCo 的區域治理平台，使用者含管理層與第一線 RCSA 填寫者。
筆記型電腦（1366×768 仍常見）與橫向平板在這種稽核／填表情境下是真實載具，
而目前在 1280px 以下**只會出現水平捲軸**，不會重排。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `756d503`）| Anchor |
|-------|--------------------------------------------|--------|
| 斷點 | 全 `apps/web/src` **0 個 `@media`**；交付物本身也只有 1 個且是 `@media print` | `support.js:119` |
| CSS class | **全 `apps/web/src` 有 0 個 `className`** —— `base.css` / `components.css` 的 class **全部無消費者** | grep count = 0 |
| 內容上限 | **91 個** px 上限散在 inline style；最寬 `minWidth: 1160px` | `risk-programme:885` |
| Grid | **94 個** `gridTemplateColumns`，**0 個** `auto-fit`/`auto-fill`；21 個共用欄位常數 | `admin:302` 等 |
| Topbar | 10 個子項、**無 `flexWrap`、無 `overflow`**；唯一讓步的是 `flex:1` 間隔，其後 `minWidth:230px` 是硬地板 | `AppShell.tsx:481` · `:639` · `:641` |
| 側欄 | 收合機制**已實作且能用**（React state，64px/232px），只差自動觸發 | `AppShell.tsx:232` · `:260` |
| 表格 | 13 個 `<table>`，**6 個沒有捲動容器** —— 被 `overflow:hidden` 直接裁掉，無捲軸 | `admin:1248` · `:1461` · `:1958` · `controls/[id]:593` · `risks/[id]:1282` · `:1388` |

→ 版面全在 inline style ⇒ **加 `@media` 到 CSS 不會有任何效果**。修正必須 (1) 就地把 px 上限改成流動運算式，
(2) 只在真正需要「知道現在多寬」的兩處引入 `matchMedia`，(3) 補上缺席的捲動容器。

### The design（CSS-first：91 處就地改運算式 + 2 處 `matchMedia` + 6 個捲動容器）

```
apps/web/src/lib/useBreakpoint.ts      NEW  matchMedia hook; SSR 安全（首次回傳 'wide'）
apps/web/src/components/shell/
  AppShell.tsx                         EDIT 側欄自動收合 + topbar 窄螢幕收納
29 個 page.tsx                          EDIT px 上限 → min()/clamp()；固定欄數 grid → 可重排
  （其中 6 個另補 overflowX 捲動容器）
apps/web/src/styles/*.css              UNTOUCHED —— 逐字複製不得改（約束 6）
```

**為何不遷移 className**：交付物的 class 只有**組件層**（button / card / pill），**沒有版面層** ——
`.page` / `.grid-kpi` 這兩個唯一沾到版面的都是死規則，且它們的值（1400px / 4 欄）
正是本片要改的東西。遷移等於重寫 W19 剛落地的 30 個畫面，換來一組本來就不夠用的 class。

### Ground truth（recon head-start —— 於 `main` HEAD `756d503` 讀過的 code）

- `AppShell.tsx:260` — `navW = collapsed ? '64px' : '232px'`，收合是 React state 不是 class
- `AppShell.tsx:480` — 主欄有 `minWidth: 0`（可正確收縮）；**topbar 子項沒有**
- `check_mockup_fidelity.py` — 只驗逐字複製 / 無硬編碼顏色 / hover 可解析，**不驗有無消費者**
- 交付物 `README.md:445` — 「designed for ≥1280px. Tables scroll horizontally inside their card」
- 交付物 `fragments/screens/05-risk-form.html:14` — `max-width:1000px` 是交付物原文，移植忠實

**Baselines（W19 closeout）**: web test **9 檔 / 88** · lint exit 0 · type exit 0 · build **31 條路由** ·
api unit 480/40 · api int 265/21 · `run_all` **9/9**。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-className-zero** — 重跑 `className` 全域計數 → 若非 0，§3.0「不遷移」的前提改變
- **D-cap-count** — 重數 91 個 px 上限 → 差異 > 10% 則 §7 估算與 §4 清單要修
- **D-uncontained-tables** — 重驗 6 個無捲動容器的表格 → 影響 US-4 範圍
- **D-topbar-floor** — 實測 topbar 真正的溢出點（靜態只能證明必然，不能給數字）→ 決定斷點值

## 1. Phase Goal

在 **768 / 1024 / 1280 / 1920 / 2560** 五個寬度下，30 個畫面**無水平溢出、無被裁掉且無捲軸的內容、
無重疊**，且寬螢幕不再出現大片死白。證明方式：gates 全綠 **＋ MANDATORY drive-through**
（真 UI、五個寬度、逐頁記錄 observed-vs-intended）。⛔ 本片是 feature continuation 而非 spike，
**不產出 design note**；但**必須**在 `15-design-alignment.md` 登記已核可偏離。

## 2. User Stories

- **US-1**（shell）: 作為在 1366×768 筆電上工作的 ISO，我希望側欄在窄螢幕自動收成圖示列、
  topbar 不溢出，以便我不必左右捲動就能操作。
- **US-2**（content width）: 作為在 24 吋螢幕上審閱的區域 ISO，我希望內容用得到螢幕寬度，
  以便不再有一半畫面是空白。
- **US-3**（reflow）: 作為在橫向平板上填 RCSA 的第一線人員，我希望多欄 grid 在窄螢幕降欄而非壓扁，
  以便欄位仍然讀得懂。
- **US-4**（data escape hatch）: 作為看寬表格的任何角色，我希望表格在卡片內水平捲動，
  以便窄螢幕下不會有內容被靜默裁掉。
- **US-5**（drive-through MANDATORY）: 作為驗收者，我希望五個寬度 × 30 個畫面被真的開過，
  以便「響應式」不是從 CSS 推論出來的。
- **US-6**（closeout）: 作為下一個 session，我希望偏離、calibration 與 **ROADMAP 9b** 都已落位。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW       apps/web/src/lib/useBreakpoint.ts          matchMedia hook（唯一的 JS 驅動點）
NEW       apps/web/src/lib/useBreakpoint.test.ts     含 SSR 首幀行為的負面測試
EDIT      apps/web/src/components/shell/AppShell.tsx US-1（側欄 + topbar）
EDIT      29 × apps/web/src/app/**/page.tsx          US-2 / US-3 / US-4
EDIT      docs/02-architecture/15-design-alignment.md 已核可偏離登記
EDIT      docs/02-architecture/design-system.md      斷點表（新增一節）
UNTOUCHED apps/web/src/styles/{tokens,base,components}.css  逐字複製，約束 6 禁止修改
UNTOUCHED apps/web/src/app/page.tsx                  W01 scaffold，非移植範圍
```

**三個已裁定的範圍決策**（使用者 2026-08-17）：
| # | 決策 | 裁定 |
|---|---|---|
| S1 | 支援下限 | **768px**（平板以上；不做手機直式）|
| S2 | 側欄窄螢幕行為 | **自動收成 64px 圖示列**（複用既有 state，不做抽屜）|
| S3 | 驅動機制 | **混合** —— CSS 優先，`matchMedia` 只用於 S2 與 topbar |

### 3.1 斷點（US-1..US-3）— 新增，交付物沒有

| Token | 範圍 | 行為 |
|---|---|---|
| `wide` | ≥1440px | 現狀 |
| `mid` | 1024–1439px | 側欄自動收合；6/8 欄 KPI → 4 欄 |
| `narrow` | 768–1023px | 上述 + 2 欄表單 → 1 欄；`1fr 320px` 詳情 → 堆疊；topbar 收納 |
| （<768px）| — | **不支援** —— 允許水平捲動，不視為缺陷（S1）|

### 3.2 Shell（US-1）— `AppShell.tsx`

- 側欄：`collapsed` state 增加自動來源 —— `useBreakpoint() !== 'wide'` 時預設收合，
  **但使用者手動切換後以手動為準**（否則切換鈕在窄螢幕變成死控件 = AP-3）
- Topbar：`narrow` 時隱藏「期間分段控制」（5 個按鈕）與使用者名稱／角色文字塊，
  搜尋框 `minWidth: 230px` → `min(230px, 100%)`；⛔ **隱藏的項目必須仍可達**（收進既有的使用者選單），
  否則是用「藏起來」偽裝成「修好了」

### 3.3 內容寬度（US-2）— 91 處

- **資料類 `minWidth`**（表格／grid 列，520–1160px）：**保留** —— 它們是地板不是天花板，
  由 US-4 的捲動容器負責逃生
- **內容類 `maxWidth`**（表單／散文／卡片，360–1000px）：改 `min(Npx, 100%)` 讓窄螢幕不溢出
- ⭐ **D1 —— ✅ 已拍板 2026-08-17：(b) 放寬**（使用者裁定，推翻了我建議的 (a) 置中）。
  ⇒ 內容類 `maxWidth` **移除**，讓內容用滿可用寬度；窄螢幕的安全由 `min()` / 斷點負責，
  不由固定天花板負責。
  ⚠️ **已知代價，寫在這裡不是為了翻案而是為了 Day 3 要盯**：在 2560px 上，
  單欄表單與散文區塊的行長會遠超可讀範圍（交付物那些 360–1000px 值原本就是行長考量）。
  ⇒ **drive-through 的 2560px 那一輪必須逐頁看行長**，若某幾頁明顯不可讀，
  以「該頁另訂上限」回報給使用者，**不得自行改回置中** —— 那會是推翻已拍板的決定。

### 3.4 Grid 重排（US-3）— 94 處中的固定欄數子集

`repeat(6,1fr)`（`dashboard:386`）· `repeat(8,minmax(0,1fr))`（`incidents/[ref]:443`）·
`repeat(5,…)` · `repeat(4,…)` · `1fr 1fr` 表單列 · `minmax(0,1fr) 320px` 詳情側欄（7 處）。
⛔ **不用 `auto-fit`** —— 它會讓欄數隨內容跳動，破壞欄位對齊；改為依斷點給定欄數。

### 3.5 表格逃生（US-4）— 6 處

`admin:1248` · `admin:1461` · `admin:1958` · `controls/[id]:593` · `risks/[id]:1282` · `:1388`
外層卡片 `overflow:'hidden'` → 表格外包一層 `overflowX:'auto'`。
⚠️ **不是把卡片改成 `auto`** —— 卡片的 `hidden` 是為了圓角裁切，改它會破壞視覺。

### 3.x 明確不做的事

- **不遷移 className / 不動三支 CSS**（約束 6：逐字複製）
- **不做手機直式**（<768px）
- **不用 `auto-fit`/`auto-fill`**
- **不重新設計 13×8 的實體比較矩陣** —— 它在 768px 下走水平捲動，不換呈現方式
- **不修 `check_mockup_fidelity` 的「不驗消費者」缺口** —— 記進 BACKLOG，非本片

### 3.y Validation（US-1..US-6）

Gates: `format:check` · `lint` · `type-check` · `test`（web，≥ 88 + 新 hook 測試）· `build`（31 條路由）
· `python scripts/lint/run_all.py` **9/9**。
**＋ §3 的 drive-through（MANDATORY）** —— 五個寬度 × 30 個畫面。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/web/src/lib/useBreakpoint.ts` | NEW |
| 2 | `apps/web/src/lib/useBreakpoint.test.ts` | NEW |
| 3 | `apps/web/src/components/shell/AppShell.tsx` | EDIT |
| 4–32 | `apps/web/src/app/**/page.tsx`（29 個）| EDIT |
| 33 | `docs/02-architecture/15-design-alignment.md` | EDIT（已核可偏離）|
| 34 | `docs/02-architecture/design-system.md` | EDIT（斷點表）|
| 35 | `docs/03-implementation/changes/CH-040-w20-responsive-layout.md` | NEW |
| — | `apps/web/src/styles/{tokens,base,components}.css` | **UNTOUCHED**（約束 6）|
| — | `apps/web/src/app/page.tsx` | **UNTOUCHED**（W01 scaffold）|
| — | `apps/web/src/components/shell/AiDrawer.tsx` | **UNTOUCHED**（392px overlay，不佔版面軌道）|

## 5. Acceptance Criteria

1. 五個寬度（768/1024/1280/1920/2560）下，30 個畫面 `document.body.scrollWidth <= innerWidth`
2. `narrow` / `mid` 下側欄自動收合，且**手動切換仍然有效**（負面測試：切換後改變視窗寬度不覆蓋手動選擇）
3. topbar 在 768px 不溢出，且被收納的項目**仍可達**（不是消失）
4. 6 個原本被裁切的表格在 768px 下可水平捲動（逐個實測捲動距離 > 0）
5. 三支 CSS **byte-identical**（`check_mockup_fidelity` 綠）
6. **Drive-through PASS（MANDATORY，真 UI）** —— 五個寬度 × 30 畫面，截圖 +
   observed-vs-intended 記入 progress.md。（**不是** gate-only。）
7. `AD-Mockup-Responsive-1` CLOSED；偏離已登記；calibration 已記錄；導航檔 + BACKLOG 已更新；
   **ROADMAP 9b 已在本片 checklist 上有具名項並被處置**

## 6. Deliverables

- [ ] US-1 側欄自動收合 + topbar 窄螢幕收納（含可達性）
- [ ] US-2 91 個 px 上限處置完成（依 D1 的裁定）
- [ ] US-3 固定欄數 grid 依斷點重排
- [ ] US-4 6 個表格補上捲動容器
- [ ] US-5 五寬度 × 30 畫面 drive-through，證據入 progress.md
- [ ] US-6 偏離登記 + calibration + ROADMAP 9b 處置 + closeout

## 7. Workload Calibration

- Scope class **`greenfield-feature` 0.55**（Read `CALIBRATION-MATRIX.md`：該 class 建議起手 0.55
  「新功能、有既有基礎設施」）。⛔ **刻意不用 `mockup-port` 0.55** —— 雖然乘數相同，
  但那個 class 的前提是「有藍本可逐字抄」，而**交付物零斷點、響應式行為完全沒有藍本**。
  兩者記成同一個 class 會汙染 `mockup-port` 只有 1 個資料點的樣本。**本片是該 class 的新資料點。**
- **Agent-delegated: `partial`**（91 個 px 上限與 grid 重排是機械性、可平行；
  shell 的兩處 `matchMedia` 與全部 drive-through 自己做）。`agent_factor` **0.75**。
- Bottom-up est ~14 hr（shell 3 · caps 4 · grids 3 · tables 1 · drive-through 2 · closeout 1）
  → class-calibrated ~7.7 hr (mult 0.55) → **agent-adjusted ~5.8 hr (0.75)**。Day-4 retro Q2 驗證。
- ⚠️ **本片必須逐任務記時間到 progress.md** —— W15 的 `AD-CalibrationNoTimeRecord-1`
  就是因為零時間記錄而讓 ratio 只能算下限。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **D1 未拍板就開工** —— 置中 vs 放寬決定 91 處的改法 | **核可 plan 時必須明確選一個**；未選則 Day 1 不動 US-2 |
| `matchMedia` 的 SSR/hydration 不一致 | hook 首幀固定回 `'wide'`，掛載後才調整；**寫負面測試**斷言首幀值 |
| 「收納」變成「藏起來」= AP-3 | AC-3 要求被收納項**仍可達**；drive-through 逐項點過 |
| 91 處機械改動出錯（`AD-TextEditStructuralScope-1`）| 每批改動後 assert 計數；不用全檔 replace |
| 側欄自動收合讓手動切換變死控件 | AC-2 的負面測試專門測這個（W19 的 25 個死控件教訓）|
| Risk Class C：陳舊 dev server 掩蓋修正 | drive-through 前乾淨重啟 3200 並擷取 startup log |
| 30 個畫面 × 5 寬度 = 150 次觀察，容易草率 | checklist 逐頁一格；⛔ **不接受抽樣**，抽樣就寫明抽了哪些 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **手機直式（<768px）** — 使用者裁定不做 → 若日後需要，新 AD
- **className 遷移 / CSS 版面層** — → `AD-DeadStylesheetClasses-1`（本片開立）
- **`check_mockup_fidelity` 不驗消費者的缺口** — → `AD-FidelityGuardNoConsumer-1`（本片開立）
- **實體比較矩陣的窄螢幕重新設計** — 走捲動；真要換呈現方式是設計工作 → 新 AD
- **API 串接** — W19 起就未做，與本片無關
