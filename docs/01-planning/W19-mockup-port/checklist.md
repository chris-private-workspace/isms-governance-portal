# Phase W19 — Checklist (Port the design handoff into apps/web)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `cd8e22b`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 47 個目標存在/不存在如預期
      （NEW 檔不存在；EDIT 檔存在）；`.mockup-fidelity.json` 確認不存在；
      `CH-NNN` 編號未被佔用 —— **grep 全 repo 的 `CH-\d+` 引用，不是 `ls` 目錄**
      （`AD-ChNumber-1`：被前向引用預留的編號在目錄裡看不見）
      → **最大引用 CH-037 ⇒ W19 用 CH-038**（目錄與全 repo grep 一致，無前向預留）
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-frag-count** — fragment 實際檔數與行數 vs plan 的 30 / 3,777 → **完全相符**
  - [x] **D-inline-style** — `style="` 實際處數 vs plan 的 ~2,000 → **2,651（+32.6%）→ D9**
  - [x] **D-grc-zero** — 重驗 `grc-` 在 `fragments/**` 命中為 **0** → **成立，且 `class=` 也是 0 → D10**
  - [x] **D-japan-spread** — Japan 當營運實體的實際檔數 → **5 檔（`AD-Mockup-3` 對）→ D7**
  - [x] **D-css-lines** — 三支 CSS 行數（plan 用 96/54/123）→ **完全相符**
  - [x] **D-bfsi-spread** — BFSI 殘留實際檔數/處數 → **真實 18 行 / 6 檔，含 5 個漏掉的縮寫 → D6**
  - [x] **D-opco-count** — `opcos.js` 確為 14 家且 `RIN` 在第 16 行 → **四項逐一相符**
  - [x] **D-i18n-keys** — 現有字典 key 數（plan 用 16）→ **15 → D8**
- [x] **Prong 2.5 — child component tree**：讀 ≥ 3 個 fragment 全文（非只 grep），
      確認樣板構造（`{{ }}` / `<sc-if>` / `<sc-for>` / `style-hover`）的實際形狀與翻譯規則
      → 讀了 `04-risks-list`（全文）· `03-dashboard`（表格段+卡片段）· `01-auth`（狀態列舉+REGISTER 全段）
      → **抓到 D1（auth 7 狀態）· D2（REGISTER 在範圍內）· D3（密碼欄位）**，全部是 grep 抓不到的
- [x] **Prong 3 — schema verify**：**N/A**（本片零 DB 變更；plan §4 已標 `schema.prisma` UNTOUCHED）
- [x] **D-baselines** — api int **265/21** · api unit **480/40** · web **10/1** ·
      run_all **9/9** · entity-index **34/36** —— 全部逐項相符，無一需更正
- [x] **D-detector-skip** — 執行 `python scripts/lint/check_mockup_fidelity.py`，
      確認今天輸出是 SKIP（這是 US-1 負面測試的 before 狀態）
      → **SKIP 確認**，且 `run_all` 把它記為 `[PASS]` ⇒ 9/9 綠而該守衛什麼都沒做
- [x] **Catalog drift** — progress.md Day-0 表格 → **12 條（D1-D12）**
- [x] **Go/no-go** — 範圍變動 ≤20% 繼續 / 20-50% 修訂 §5+§7 並回報 / >50% 中止重寫
      → **+25~30% ⇒ GO**，plan §0/§3.3/§3.4/§3.x/§5/§7/§8/§9 已修訂，使用者已裁決 auth 三項

### 0.2 Branch

- [x] `git checkout -b feature/W19-mockup-port`（從 `main` `cd8e22b`）

---

## Day 1 — 設計系統 + App shell (US-1, US-2)

### 1.1 三支 CSS verbatim copy

- [x] **`apps/web/src/styles/{tokens,base,components}.css`**
  - DoD: 與 Layer 1 逐字相同（含註解與順序），唯一差異是 `base.css` 的字型 `@import`
  - Verify: `diff` 三對檔案，差異只有已聲明那一處
        → **三支全部 `IDENTICAL`**（複製後立即 diff），之後才改 `base.css:6` 一行
  - ⚠️ 複製**用 Read + Write 工具，不用 Python `write_text`**（`AD-WriteTextCRLF-1`：
        它在 Windows 靜默把 LF 轉 CRLF，而 `.gitattributes` 要求 `eol=lf`）
        → **實際改用 `cp`**：Read+Write 會讓內容經過我的手 = **一個 drift 注入點**，
        而 playbook §4.2 要求複製是**機械動作（0 個注入點）**。`cp` 同時也不動 line ending

### 1.2 Self-host 字型 + globals.css

- [x] **`@fontsource` + `apps/web/src/app/globals.css`**（原寫 `public/fonts/*.woff2`）
  - DoD: IBM Plex 本機化；`globals.css` import 三支 CSS + 字型；頁面渲染時**零外部網路請求**
  - Verify: `grep -r "fonts.googleapis.com" apps/web/src` → 0 命中
        → **build 產物實測**：`@font-face` 只宣告 `IBM Plex Sans` / `IBM Plex Mono`，
        39 個 woff2 隨 bundle 出貨
  - ⭐ **改用 `@fontsource` 而非 `next/font/google`**：tokens.css 寫死**家族真名**
        （`--sans: 'IBM Plex Sans'`），而 `next/font/google` 產生雜湊家族名
        ⇒ 那個字面名會**解析不到並靜默 fallback**。`@fontsource` 註冊真名 ⇒ tokens.css **零修改**
  - ⭐ **刻意不載入 IBM Plex Sans JP**：它是日文字型，繁中會落到它並以**日式字形**渲染
        （guardrail 9 的 UI 語言是繁中）⇒ 讓繁中落到 `system-ui`。已聲明於 `globals.css` 檔頭

### 1.3 Detector config + 負面測試 ⭐

- [x] **`.mockup-fidelity.json`**
  - DoD: `canonical_css` 指 `tokens.css`；config 註解寫明「三支只守一支」的缺口
  - Verify: `python scripts/lint/check_mockup_fidelity.py` → 從 SKIP 轉為 **OK**
        → `run_all` **9/9，且第 5 項內容由 SKIP 變 OK**（數字沒變，組成變了）
  - ⚠️ **`allowed_header_diff_lines` 設 0 而非 3**：tokens.css 零差異，任何差異都是 drift。
        字型那行的差異在 `base.css`（本檢查**讀不到**的檔）⇒ 調大 allowance 只會把這個檔弄瞎
  - ⚠️ `hardcoded_color_patterns` **改為抓裸 hex + 八值豁免清單**（預設 pattern 針對 Tailwind
        arbitrary value，本專案無 Tailwind 且組件逐字帶 inline style）。豁免的是交付物**自己**
        逸出 token 系統的值：`#fff`×86 + `#FFFFFF`×1（彩底白字）+ **另一套灰階** 6 種×18 處
        （`#111827` `#E4E7EC` `#98A2B3` `#8A94A6` `#344054` `#667085`）—— 逐值列舉讓豁免夠窄，
        **新出現的寫死色值仍會紅**
- [x] **負面測試：故意改壞 Layer 2 一行 → detector 必須紅**
  - DoD: 記下實際錯誤訊息與它指名的檔案；改回後複驗綠
  - Verify: 紅→綠兩次輸出都貼進 progress.md
  - ⚠️ 沒紅過的守衛不算守衛（`AD-NegativeGate-1`）
        → **三條全部命中預測**（預測寫在執行之前）：
        **N1** 改 `--primary` 一個字元 → `[css-drift]` **2 differing lines**、allowance 0、EXIT=1；
        **N2** 加未豁免的 `#123456` → `[hardcoded-color] layout.tsx:45` 指名行號、EXIT=1；
        **N3** 換成已豁免的 `#fff` → **綠**。⭐ N2+N3 成對才證明**豁免是窄的**而非把檢查關掉

### 1.4 修正紅線 7（關 `AD-CssToken-1`）

- [x] **`docs/rules-on-demand/mockup-fidelity.md:38`**
  - DoD: `oklch(var(--token))` → `var(--token)`；加一行說明本專案 token 是 hex
  - Verify: `grep -n "oklch" docs/rules-on-demand/mockup-fidelity.md` 只剩說明性提及
- [x] ⭐ **第二個藏身處**（N2 當場暴露，plan 未列）—— `check_mockup_fidelity.py` 的**違規訊息本身**
      寫著 `<- use oklch(var(--token))`
  - DoD: 訊息改為 `var(--token)`；module docstring 加註「wrapper 形式取決於 token 存什麼」
  - ⚠️ 這一處比 md 更危險：它在**你違規的當下**告訴你怎麼改，照做就寫出無效 CSS

### 1.5 App shell（US-2）

- [x] **`apps/web/src/app/(app)/layout.tsx` + `components/shell/AppShell.tsx`**
      （fragment `02-app-shell.html`，222 行）
  - DoD: 左 rail 232px + topbar 56px + scope/period + 搜尋 + 通知 + 語言 + 主題 + avatar；
        inline style 原封不動；文案走 `t()`
  - Verify: 代碼層並排比對 fragment vs layout.tsx，逐行確認
  - ⭐ **本檔建立了 27 個畫面共用的 5 條 port 規則**（寫在檔頭）——
        inline style 值不動 · `style-hover`→`data-hov` · sc 標籤→JSX · `hint-*` 剝除前先讀出示意筆數 ·
        文案一律 `t()`
  - ⭐ **fragment 留洞時的取值來源已定案**：active 樣式與 collapsed 寬度取 `components.css:118/113`
        （fragment 是 `{{ }}` 洞，那裡是唯一寫下來的地方）；**佈局值取 fragment**
        —— 兩者實測不一致（fragment `padding:8px 11px`/`radius 0 7px 7px 0`/`13px`
        vs class `height:34px`/`padding:0 12px`/`radius 8px`/`12.5px`），而 fragment 才是設計實際渲染的
  - ⭐ **補上 `aria-current="page"`**（Day-0 D11）—— 同時關掉 a11y 缺口，
        並讓 `components.css:118` **第一次有可能生效**
  - 🚧 **尚無消費者** —— `(app)` 群組只有 layout 沒有 page，build 實測路由仍是 `/` + `/_not-found`。
        解封：Day 2.2 的第一頁（dashboard）

- [x] **`apps/web/src/components/icons.tsx`**（shell 的 25 個 inline SVG）
  - DoD: path 逐字；只做 JSX 語法強制的轉換（`stroke-width`→`strokeWidth`）
  - ⭐ 抽象邊界：組件只擁有 **path 資料 + viewBox**，尺寸/描邊/顏色留在呼叫點
        —— 同一個盾牌在品牌區是 17px/`#fff`/1.9、在導覽是 18px/`currentColor`/1.7，
        把差異折進組件預設值等於**靜默抹平 mockup 刻意的區別**
- [x] **`apps/web/src/lib/tok.ts`** —— `components/status.md:11-18` 的四態色彩規則，逐字
- [x] **`apps/web/src/data/opcos.ts`** —— 13 家（刪 `RIN`，不補 `RCN`）。⚠️ 這是 Day 2.1 的提前項

### 1.6 vitest 改 jsdom

- [x] **`apps/web/vitest.config.mts` + `package.json`**
  - DoD: `environment: 'jsdom'`；`include` 含 `.test.tsx`；裝 jsdom / @testing-library/react
  - Verify: `npm run test -w apps/web` → 現有 **10 條全過**（不得回歸）+ 新組件測試可跑
        → 10/10 未回歸。⚠️ **組件測試尚未撰寫** ⇒ jsdom + testing-library 的**能力未經驗證**，
        只證明了「沒弄壞現有的」。解封：Day 2 第一個組件測試
  - ⚠️ 首次執行曾失敗一次（60.07 s，`environment 0ms`，測試未跑）。清 `.vite` cache 冷啟動
        **無法重現**（8.3 s 通過），連續三次綠 ⇒ 記錄但不阻塞；CI 若出現同症狀，這是線索

### 1.x partial gate

- [x] `npm run lint -w apps/web` · `npm run type-check -w apps/web` · `python scripts/lint/run_all.py`
      → format **0** · lint **0** · type **0** · test **0** · build **0** · run_all **9/9**
      （⚠️ plan 寫 10/10 是**我算錯了** —— `run_all` 的分母一直是 9，
      `check_mockup_fidelity` 本來就在那 9 個裡面，只是先前回 SKIP）

---

## Day 2 — 27 個畫面 + fixture + 登入 (US-3, US-4, US-5)

### 2.1 Fixture 移植 + 三處憲章清理（US-4）⭐ 先做，畫面依賴它

- [ ] **`apps/web/src/data/*.ts`**（23 支）—— **五處清理**（Day-0 修訂，原列三處）
  - DoD: (1) `opcos` 刪 `RIN` → **13 家 / 11 管轄區**，不補 `RCN`；
        (2) **中國移除**（8 處跨 5 檔 + auth 下拉 1 處 —— Day-0 D5，原 plan 漏列）；
        (3) Japan 不作為營運實體（**5 檔**，含 `01-auth:124`）；
        (4) BFSI 殘留清零（**真實 18 行 / 6 檔**）；
        (5) ⭐ **`data.js` 從 `opcos.js` 重建為 13 列**（非修補 —— Day-0 D4）
  - Verify: `grep -riE "india|RIN|china|AML|CTF|sanction|reconcil|prudential|FSA|MAS|APRA|HKMA|BNM|PBoC|Basel|KYC" apps/web/src/` → **0 命中**
        ⚠️ 命中後**逐處讀上下文**排除子字串假陽性（Day-0 實測 `Streamline NX` / `SAML 2.0` 會誤命中 `AML`）
  - Verify: OpCo 列數 = **13**、distinct country = **11**、`data` 列數 = **13**

- [ ] **`apps/web/src/components/DemoBadge.tsx`**
  - DoD: 視覺上不可忽略；每個消費 fixture 的畫面都掛
  - Verify: Day 3 drive-through 逐頁目視（**不是**靠測試 —— mock 標記本身要被 drive-through 驗證）

### 2.2 27 個 screen page.tsx（US-3）— **agent 平行**

- [ ] **27 個 `page.tsx` + 共用 primitive**
  - DoD: 每頁 inline style 原封不動、`<sc-if>`/`<sc-for>` 正確轉譯、
        SVG icon 直接搬、`hint-*` drop、文案走 `t()`（en=原文 / zh-Hant=譯文）、
        無對應行為的控件**不掛 handler 也不做成看似可點**
  - Verify: **每頁**代碼層並排比對 fragment vs page.tsx → 結果進 `page-inventory.md`
  - ⚠️ agent 回報的「完成」不採信 —— 並排比對我自己做（plan §8 第一條 risk）

### 2.3 Persona 登入（US-5）

- [ ] **`login/page.tsx` + `api/demo-session/route.ts` + `lib/demo-session.ts`**
  - DoD: 無密碼欄位；httpOnly+Secure+SameSite cookie；`NODE_ENV=production` 啟動即 throw；
        entity scope 只從 cookie 取不從請求參數取
  - Verify: `grep -rE "localStorage|sessionStorage" apps/web/src` → **0 命中**
  - Verify: 檢查 `Set-Cookie` 標頭實際含三個屬性

- [ ] **auth 四個狀態**（Day-0 D1 修訂 —— 原以為是 1 個畫面，實為 7 個狀態）
  - DoD: LOGIN **變體 A · split** · REGISTER（修正三處）· MFA · SSO 四者 port 完成；
        **FORGOT / RESET 不 port**，理由寫進 `page-inventory.md` 與 CH-038
  - Verify: `grep -rE "type=\"password\"" apps/web/src` → **0 命中**（ADR-0007）
  - Verify: REGISTER 的 Entity 選項 = 13 家 OpCo、Role 選項 = 已確認六角色 ⇒ 關 `AD-Auth-1`

### 2.4 i18n 字典

- [ ] **`zh-Hant.json` + `en.json`**
  - DoD: 兩份 key 集完全鏡像；zh-Hant 為預設 locale
  - Verify: 現有 parity 測試通過（它會抓 key 集不一致）

### 2.x Full gate

- [ ] web lint · type-check · build · test（10 條不得回歸）·
      api 全套不得回歸（int 265/21 · unit 480/40）· `run_all` **9/9**

---

## Day 3 — Drive-through (US-6) — 真 UI + 真後端

### 3.1 Clean restart

- [ ] 殺掉 3200 上所有陳舊 Next 程序（含 reload 子程序 —— 它的 cmdline 可能沒有 server 名字），
      確認新程序是該 port 的**唯一擁有者**，擷取 startup log（`task-workflow.md` §Risk Class C）

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [ ] **走完 30 個畫面**（3 shell + 27 screens），每頁逐控件確認：
      可點嗎 / 有效果嗎 / 標籤真實嗎 / 結果真的渲染嗎
- [ ] **Persona 登入主路徑**：選 persona → 進 shell → 切換實體/角色 → 登出
- [ ] **DEMO 標記逐頁目視確認**（AC-5）
- [ ] **13 OpCo / 11 管轄區在儀表板上目視確認**，且畫面上**看不到** India / Japan-as-OpCo / BFSI 字樣
- [ ] 截圖 + observed-vs-intended 對照 → progress.md Day 3
- [ ] 發現的 Potemkin **當場修到能用**才算 done

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-NNN-w19-mockup-port.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 drive-through PASS +
      關掉的 `AD-CssToken-1` / `AD-Mockup-3` / `AD-Port-BFSI`）
      + §關鍵設計細節 + §Drive-through 抓到而 gate 沒抓到的
- [ ] **`docs/02-architecture/page-inventory.md`** —— 30 條路由的 parity 狀態
- [ ] **`docs/02-architecture/design-system.md`** —— primitive index + drift incident log
      + 記下「`components.css` 未被 fragment 使用」這個事實與量測日期
      （避免下一片重新推導 —— playbook §7.5）

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`mockup-port` 0.55 × agent 0.45，**第 1 個資料點**；
      ratio 出 band 就標記 re-point）
- [ ] `calibration-matrix.md` 新增一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `calibration-log.md`）
- [ ] Final gate sweep: web lint/type/build/test · api int 265/21 · api unit 480/40 · `run_all` **9/9**
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（CLOSE 三條 AD + `AD-Mockup-2` 改為「已渲染，結構問題仍開」）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
- [ ] `plan.md` frontmatter `status:` → `closed`，內文 `**Status**` 一起翻（R9）
