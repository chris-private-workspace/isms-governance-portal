# Page Inventory — 移植保真度對照表

**Purpose**: 27 個畫面 + shell 的 fragment ↔ `page.tsx` 並排比對結果，以及每一處與設計交付物的偏離。

**Category / Scope**: Frontend / Phase W19
**Created**: 2026-08-17
**Last Modified**: 2026-08-17
**Status**: Active

> **Modification History**
> - 2026-08-17: Initial creation (Phase W19) — Day 3 並排比對

---

## 這份文件回答什麼

**「我們搬過來的畫面，和設計交付物一致嗎？哪裡不一致、為什麼？」**

它不回答「畫面能不能用」—— 那是 Day 3 drive-through 的職責，記在
[`W19-mockup-port/progress.md`](../01-planning/W19-mockup-port/progress.md)。
**兩者都做過才算完成**：drive-through 抓到 25 個死控件而保真度比對一個都看不到；
保真度比對抓到的偏離，drive-through 同樣看不到。

---

## ⚠️ 覆蓋聲明（這份稽核掃了什麼、沒掃到什麼）

**掃了**：
- 27 個 screen fragment（`fragments/screens/`）逐一對上 `apps/web/src/app/(app)/**/page.tsx`
- **每個 fragment 的每一段可見文字**，逐字比對合併後的 en 字典（9 份 `*.en.json`）
- fragment 的 `<sc-if>` / `<sc-for>` / `<svg>` / `style-hover` / `hint-placeholder-count` **元素計數**
  （移除註解後才數 —— 一段提到 `<sc-if>` 的註解不是一個 `<sc-if>`）

**沒掃到，必須明說**：
- **視覺像素級比對沒有做。** 本次是**代碼層**比對。inline style 數值是否逐字相同由
  `check_mockup_fidelity.py` 機械保證，但「渲染出來長得一樣嗎」需要截圖 diff，未做。
- **zh-Hant 譯文的品質沒有稽核。** 只驗了 key 對稱與 en 存有原文。
- **shell fragment（`02-app-shell`）與 `30-ai-drawer` 未納入本表** —— 前者是 W19 第一個移植物、
  規則來源本身；後者是抽屜元件不是畫面。

**方法的已知弱點**：文字比對用「逐字存在於 en 字典」為判準，
所以**住在 fixture 裡的字串會被誤報為缺漏**（控制項名稱、實體名、量表縮寫都是資料不是文案，
歸屬正確）。本次 44 筆疑似缺漏**全部逐一追查**，見下節 —— 沒有一筆是真的漏抄。

---

## 結果總表

`scIf` / `scFor` / `svgF` / `hovF` = fragment 側元素數（可靠）。
`txt` = 該 fragment 的可見字串數；`miss` = 未逐字出現在 en 字典者（**全部已追查**）。

| 畫面 | fragment 行 | page 行 | scIf | scFor | svgF | hovF | txt | miss |
|---|---|---|---|---|---|---|---|---|
| `dashboard` | 199 | 1286 | 3 | 9 | 3 | 4 | 30 | 4 |
| `risks` | 82 | 617 | 5 | 4 | 3 | 3 | 14 | 0 |
| `risks/new` | 84 | 576 | 1 | 5 | 1 | 2 | 16 | 0 |
| `risks/[id]` | 278 | 1946 | 9 | 15 | 13 | 1 | 37 | 0 |
| `controls` | 51 | 531 | 1 | 1 | 1 | 4 | 13 | 0 |
| `controls/[id]` | 176 | 1309 | 5 | 8 | 9 | 1 | 28 | 0 |
| `policies` | 50 | 467 | 1 | 1 | 1 | 3 | 12 | 0 |
| `policies/[id]` | 188 | 1376 | 5 | 8 | 11 | 9 | 19 | 0 |
| `issues` | 53 | 499 | 1 | 1 | 1 | 4 | 13 | 0 |
| `issues/[id]` | 73 | 557 | 4 | 2 | 4 | 1 | 12 | 0 |
| `assessments` | 121 | 813 | 4 | 2 | 4 | 8 | 37 | 8 |
| `admin` | 344 | 2077 | 13 | 20 | 3 | 4 | 80 | 5 |
| `ai-assistant` | 137 | 908 | 6 | 7 | 4 | 4 | 25 | 9 |
| `incidents` | 59 | 379 | 1 | 1 | 1 | 1 | 19 | 1 |
| `incidents/new` | 126 | 1072 | 3 | 4 | 3 | 2 | 35 | 11 |
| `incidents/[ref]` | 153 | 954 | 5 | 4 | 1 | 2 | 43 | 0 |
| `risk-programme` | 235 | 1280 | 6 | 14 | 5 | 1 | 69 | 5 |
| `suppliers` | 44 | 371 | 1 | 1 | 1 | 1 | 20 | 0 |
| `suppliers/[ref]` | 71 | 477 | 1 | 3 | 3 | 1 | 18 | 0 |
| `suppliers/new` | 48 | 501 | 1 | 4 | 1 | 2 | 21 | 0 |
| `isms-profiles` | 276 | 1772 | 36 | 8 | 9 | 5 | 48 | 0 |
| `os-portfolio` | 104 | 777 | 2 | 4 | 3 | 1 | 27 | 1 |
| `audit-issues` | 51 | 464 | 1 | 2 | 1 | 1 | 20 | 0 |
| `audit-issues/[ref]` | 161 | 997 | 7 | 5 | 4 | 4 | 31 | 0 |
| `my-profile` | 67 | 497 | 1 | 3 | 2 | 3 | 16 | 0 |
| `preferences` | 40 | 423 | 2 | 3 | 1 | 1 | 13 | 0 |
| `switch-entity-role` | 28 | 176 | 1 | 1 | 0 | 1 | 3 | 0 |

**合計**（27 個畫面加總）：fragment **3,299 行** → page **23,102 行**（**×7.0**）·
可見字串 **719** · 疑似缺漏 **44**（追查後**真實缺漏 0**）。

> ⚠️ **`hovF`（fragment 的 `style-hover` 數）與 page 的 `data-hov` 數現在刻意不相等。**
> Day 3 把 24 個變成停用的按鈕上的 `data-hov` 全部移除了 ——
> `[data-hov]:hover` 在 disabled 元素上照樣觸發，留著會抵消停用的視覺訊號。
> 這是**行為正確性壓過樣式保真度**的一處，逐一記在 progress.md Day 3。

---

## 44 筆疑似缺漏的逐筆判定

| # | 類別 | 筆數 | 判定 |
|---|---|---|---|
| 1 | **刻意算出而非照抄**（交付物的樣本範圍 vs 憲章的真實範圍）| 8 | ✅ 已記錄的偏離（D16）|
| 2 | **必填星號獨立渲染** | 11 | ✅ 誤報，且比 fragment **多了 a11y** |
| 3 | **供應商設定刻意留空** | 9 | ✅ 已記錄的偏離（約束 7 + ADR-0002 未拍板）|
| 4 | **完整句子帶 placeholder，被我的擷取器切斷** | 7 | ✅ 誤報 |
| 5 | **住在 fixture 而非字典**（資料不是文案）| 8 | ✅ 歸屬正確 |
| 6 | **`Regulator / jurisdiction` → `Jurisdiction`** | 1 | ✅ 已記錄的偏離 |

**真實漏抄：0。**

### 類別 1 —— 交付物的樣本範圍與憲章不符，一律算出真值

| fragment 寫 | 我們渲染 | 依據 |
|---|---|---|
| `6 jurisdictions`（dashboard）| **11**，由 `entityPosture` 算出 | 參數 #4 / #12 |
| `10 controls tested`（dashboard）| 由 `controls` 算出 | D16 |
| `6 active entities across 6 jurisdictions`（admin）| **13 / 11** | 參數 #4 |
| `43 users`（admin，而其迴圈 `hint=8`）| **8**，由 `ADMIN_USERS.length` 算出 | ⭐ **交付物自己就對不上** |
| `7 categories` · `6 connected`（admin）| 算出（恰好相同）| 算出才會**持續**相同 |
| `across 14 APAC OpCos`（incidents）| **13** | 參數 #12 |
| `across 14 operating companies`（os-portfolio）| **13** | 參數 #12 |

### 類別 3 —— `ai-assistant` 的供應商設定：交付物指名了廠商，我們不抄

fragment 把 host / agent 寫成 `Microsoft Copilot Studio` / `RicohAPAC-ISMS-Agent`，
並宣稱 `Embedded + Teams` · `Citations required` · `90 days · audited`。

⇒ 全部渲染為 **「尚未設定」**，並附註
「本平台尚未選定模型供應商，此畫面也不會呼叫任何模型。上述項目在該決策記錄前維持空白。」

**兩個理由，都不是風格偏好**：
1. **約束 7（LLM provider neutrality）** —— UI 層寫死廠商名是綁定的一種形式
2. **ADR-0002 未拍板** —— CLAUDE.md 禁止項：「在 ADR 未拍板前替使用者選技術，**表面化它們，不要默默選**」

⭐ 而 `Citations required` / `90 days · audited` 是**依據與留存的合規宣稱**。
在什麼都沒接上的情況下渲染它們，等於在治理平台上給出不實保證 —— 那比少一段文案嚴重得多。

---

## 其餘已記錄的偏離（不在上述 44 筆內，因為它們不是文字層）

| 畫面 | 偏離 | 依據 |
|---|---|---|
| 全部 9 個消費 `posture.ts` 的畫面 | RCSA amber 界線 **75**、高風險 **≤5 / 6–9 / ≥10** | ⭐ 修正 W19 自己的轉錄漂移，對回 `dc.html:5088`（Day 2 D22）|
| `dashboard` | 標題與麵包屑跟著 scope 走 | fragment 寫死 `APAC Region`，**是我們加的鑽取製造了新狀態**（D25）|
| `dashboard` | 最高殘餘風險列連到 `/risks/{id}` | `dc.html:5166` 的 `onOpen` 明確帶 id（D24）|
| `ai-assistant` | 對話歷程列**移除** `cursor:pointer` 與 hover | fragment 自己給了可點外觀卻沒有 onClick，且資料無內容 ⇒ 永遠不可能誠實接上 |
| 15 個畫面 | 24 鈕 + 2 span 改為停用 | 需要本 port 沒有的後端；fragment 畫的是全不透明 |
| `preferences` | 語言卡**接上** `setLocale` | 能力早已存在（topbar 在用），只是沒暴露在 `ShellState` |
| `risks/new` 等表單 | 單一 impact 值 | ⚠️ `15-design-alignment.md:180` open item #6，**未自行發明五維 UI** |
| `suppliers/new` | **無 entity 欄位** | ⚠️ 違反 guardrail 4，但**未自行加欄位**（參數 #9 禁止發明欄位）—— 標為缺口 |
| `admin` | 六個憲章角色取代 fragment 的 4 個自創角色 | 參數 #13 |
| `admin` / `entityPosture` | 移除銀行監理機關配對 | 參數 #4（管轄區已定案）|
| shell | `生產環境 · SG-1` → `示範環境 · SG-1` | 示範版不得在畫面上宣稱 Production |
| login | 移除密碼欄位，改 persona 選擇器 | **ADR-0007** ⚠️ 見 `AD-LocalPasswordFallback-1`（P0，stakeholder 要求保留本地密碼流程，需修訂 ADR）|

---

## Related

- [`W19-mockup-port/progress.md`](../01-planning/W19-mockup-port/progress.md) — Day 3 drive-through（行為層）
- [`15-design-alignment.md`](./15-design-alignment.md) — 保真度例外的**單一權威來源**
- [`mockup-to-production-frontend-playbook.md`](../06-reference/mockup-to-production-frontend-playbook.md) — 方法論
- `scripts/lint/check_mockup_fidelity.py` — inline style 逐字複製 + `data-hov` 可解析的機械守衛
