# Phase W20 — Checklist (responsive layout down to 768px)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `756d503`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`
> ⚠️ 本片的 plan 有**異常大量**的既有事實斷言（91 個 px 上限、94 個 grid、6 個未裝住的表格），
> 全部來自一次 agent 盤點。**agent 的回報一律視為未經驗證** —— 逐項重跑。

- [ ] **Prong 1 — path verify**：`useBreakpoint.ts` / `.test.ts` 不存在；`AppShell.tsx` 與 29 個
      `page.tsx` 存在；`CH-040` 未被佔用（`ls docs/03-implementation/changes/ | sort -V | tail -1`）
- [ ] **Prong 2 — content verify**（drift → progress.md）：
  - [ ] **D-className-zero** — `className` 全域計數是否仍為 **0**
        → 非 0 則 §3.0「不遷移 class」的前提改變，Go/no-go 重評
  - [ ] **D-cap-count** — 重數內容區塊的 px 上限（宣稱 **91**）
        → 差異 > 10% 則修 §4 與 §7
  - [ ] **D-grid-count** — 重數 `gridTemplateColumns`（宣稱 **94**）與 `auto-fit`/`auto-fill`（宣稱 **0**）
  - [ ] **D-uncontained-tables** — 逐一開 `admin:1248` · `admin:1461` · `admin:1958` ·
        `controls/[id]:593` · `risks/[id]:1282` · `:1388`，確認外層確實只有 `overflow:'hidden'`
  - [ ] **D-media-zero** — `@media` 在 `apps/web/src` 是否仍為 **0**
  - [ ] **D-collapse-state** — `AppShell.tsx:232/260` 的 `collapsed` state 與切換鈕仍在且可用
- [ ] **Prong 2.5 — child component tree**：29 個 page 之外，`AiDrawer.tsx`（392px overlay）
      與 `DemoBadge.tsx` 是否也帶版面約束（plan 假設兩者 UNTOUCHED —— **這是假設不是量測**）
- [ ] **Prong 3 — schema verify**：**N/A** —— 本片零 DB 變更
- [ ] **D-topbar-floor** — ⭐ **實測** topbar 的真正溢出點（靜態只能證明必然，不能給數字）：
      在瀏覽器逐步縮寬，記錄 `body.scrollWidth > innerWidth` 的第一個寬度
      → 該數字決定 §3.1 `narrow` 斷點是否要調
- [ ] **D-baselines** — web test 9 檔 / 88 · lint exit 0 · type exit 0 · build 31 條路由 ·
      `run_all` 9/9（**實跑，不抄 W19 的數字**）
- [ ] **Catalog drift** — progress.md Day-0 表格
- [ ] **Go/no-go** — 範圍變動 ≤20% 繼續 / 20-50% 修訂 §5 §7 並回報 / >50% 中止重寫

### 0.2 D1 拍板（⛔ 未拍板不得開始 US-2）

- [ ] **D1 — 寬螢幕下內容 `maxWidth` 的處置**：(a) 置中 或 (b) 放寬
  - DoD: 使用者明確選定，記入 progress.md Day 0 並回填 plan §3.3
  - ⚠️ 這是**使用者原始抱怨**（「固定的高和寬度」）的直接對應項；選錯 = 本片不解決他看到的問題

### 0.3 Branch

- [ ] `git checkout -b feature/W20-responsive-layout`（從 `main` `756d503`）

---

## Day 1 — Shell：斷點機制 + 側欄 + topbar (US-1)

### 1.1 `useBreakpoint` hook

- [ ] **`apps/web/src/lib/useBreakpoint.ts`** —— `matchMedia` 驅動，回傳 `'wide'|'mid'|'narrow'`
  - DoD: 首幀**固定回 `'wide'`**（SSR 無 `window`），掛載後才反映真實寬度；訂閱與清理成對
  - Verify: `npm run type-check -w apps/web`
- [ ] **`useBreakpoint.test.ts` —— 含 SSR 首幀的負面測試**
  - DoD: 斷言首幀為 `'wide'` **即使** `matchMedia` 已回報 narrow；
        ⛔ 拿掉 SSR 保護後該測試**必須轉紅**（實跑一次確認，不是宣稱）
  - Verify: `npm run test -w apps/web`

### 1.2 側欄自動收合

- [ ] **窄螢幕自動收合，且手動切換優先**
  - DoD: `mid`/`narrow` 預設收合；**使用者手動切換後，改變視窗寬度不覆蓋該選擇**
  - Verify: 測試斷言兩個方向；drive-through Day 3 逐項點過
- [ ] **負面測試：手動切換不得變成死控件**
  - DoD: 拿掉「手動優先」邏輯後，該測試轉紅（W19 的 25 個死控件教訓）
  - Verify: `npm run test -w apps/web`

### 1.3 Topbar 窄螢幕收納

- [ ] **`narrow` 下 topbar 不溢出**
  - DoD: 768px 時 `body.scrollWidth <= innerWidth`；搜尋框 `min(230px, 100%)`
  - Verify: 瀏覽器實測，非 CSS 推論
- [ ] ⭐ **被收納的項目仍可達（不是藏起來）**
  - DoD: 期間選擇與使用者名稱/角色在 `narrow` 下仍能透過既有使用者選單到達；
        ⛔ 「看不到就算修好」是 AP-3
  - Verify: drive-through 逐項點開

### 1.x partial gate

- [ ] `npm run lint -w apps/web` · `type-check` · `test`

---

## Day 2 — 內容寬度 + grid 重排 + 表格逃生 (US-2, US-3, US-4)

### 2.1 內容 `maxWidth` 處置（依 D1）

- [ ] **內容類 `maxWidth` 全數處置**（表單／散文／卡片；**不動**資料類 `minWidth`）
  - DoD: 依 D1 的裁定套用；每批改動後 **assert 計數**符合預期
        （`AD-TextEditStructuralScope-1`：不得用全檔 replace）
  - Verify: 改動前後各數一次；差值 = 預期改動數
- [ ] **CSS 三支未被修改**
  - DoD: byte-identical
  - Verify: `python scripts/lint/check_mockup_fidelity.py`

### 2.2 固定欄數 grid 重排

- [ ] **`repeat(N,…)` 與 `1fr 320px` 依斷點降欄**
  - DoD: `dashboard:386`(6欄) · `incidents/[ref]:443`(8欄) · 7 處 `minmax(0,1fr) 320px` ·
        表單 `1fr 1fr` —— 在 `narrow` 下降欄或堆疊；⛔ **不得用 `auto-fit`**（欄數會隨內容跳動）
  - Verify: 五個寬度下逐頁量 `gridTemplateColumns` 的實際計算值

### 2.3 表格逃生（6 處）

- [ ] **6 個未裝住的表格補上 `overflowX:'auto'` 包層**
  - DoD: 卡片的 `overflow:'hidden'` **不動**（它負責圓角裁切）；在表格外加一層
  - Verify: 768px 下逐個實測 `scrollWidth > clientWidth` 且可捲動距離 > 0

### 2.x Full gate

- [ ] `format:check` · `lint` · `type-check` · `test`（≥88 + 新增）· `build`（31 條路由）
      · `python scripts/lint/run_all.py` 9/9

---

## Day 3 — Drive-through (US-5) — 真 UI，五個寬度

### 3.1 Clean restart

- [ ] **乾淨重啟 3200 並擷取 startup log**
  - DoD: 確認新程序是該 port 唯一擁有者（`task-workflow.md` §Risk Class C：
        陳舊 dev server 會讓修正看起來沒生效）
  - Verify: startup log 行 + `curl` 回應

### 3.2 五寬度 × 30 畫面（MANDATORY — 不是 gate-only）

- [ ] **768px** —— 30 個畫面逐頁：無水平溢出 / 無被裁切且無捲軸的內容 / 無重疊
- [ ] **1024px** —— 同上
- [ ] **1280px** —— 同上（⭐ 這是交付物自己宣稱的下限，W19 時溢出 28px）
- [ ] **1920px** —— 同上 + D1 的視覺結果符合裁定
- [ ] **2560px** —— 同上
- [ ] **逐控件走查**：側欄切換鈕 / topbar 收納後的入口 / 6 個表格的捲動
      —— 可點 / 有效果 / 標籤真實 / 結果真的渲染
- [ ] 截圖 + observed-vs-intended → progress.md Day 3
  - ⛔ **不接受抽樣**。若真的抽樣，**必須寫明抽了哪 N 個、為什麼、沒抽的風險**

---

## Day 4 — closeout

### 4.1 Change record + 偏離登記

- [ ] **`docs/03-implementation/changes/CH-040-w20-responsive-layout.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 drive-through PASS
      + 關掉的 AD + **§Drive-through 抓到而 gate 沒抓到的**）
- [ ] ⭐ **`15-design-alignment.md` 登記已核可偏離**
  - DoD: 比照 CH-005 的格式，寫明「交付物零斷點、明訂 ≥1280px」「使用者 2026-08-17 裁決」
        「這是 recorded deviation 不是 approximation」
- [ ] **`design-system.md` 新增斷點表**

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`greenfield-feature` 0.55，**新資料點**；
      ratio 出 band 就標記 re-point）
- [ ] `calibration-matrix.md` 那一行（**≤ 1 行 ~250 字元**，完整敘述 → `calibration-log.md`）
- [ ] Final gate sweep: `format:check` · `lint` · `type-check` · `test` · `build` · `run_all` 9/9
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（CLOSE `AD-Mockup-Responsive-1`；新增 `AD-DeadStylesheetClasses-1` ·
      `AD-FidelityGuardNoConsumer-1`）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] ⭐⭐ **ROADMAP 9b —— `required_linear_history` 重審**
  - DoD: 這一項在本片有具名的 `[ ]`，**因為它已經被漏掉兩次**（第 9 次 W17、第 10 次 W18
        都跨過了它自己設的重審門檻而沒觸發）。處置擇一並記錄：
        (a) 執行重審並產出決定 · (b) 明確再延並寫下延到哪 · ⛔ **不得靜默跳過**
  - Verify: `docs/01-planning/ROADMAP.md` 9b 列狀態已更新
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
