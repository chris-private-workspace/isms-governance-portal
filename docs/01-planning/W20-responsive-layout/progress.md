# Phase W20 Progress

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## 2026-08-17 — Day 0（Plan-vs-Repo Verify）

### Baselines（實跑，未抄 W19 的數字）

| Gate | 結果 |
|---|---|
| `npm run lint -w apps/web` | **exit 0** |
| `npm run type-check -w apps/web` | **exit 0** |
| `npm run test -w apps/web` | **9 檔 / 88 通過** |
| `python scripts/lint/run_all.py` | **9/9** |

### Drift findings

| ID | Finding | Implication |
|---|---|---|
| **D-page-count** | plan §3.0/§4 寫「29 個 `page.tsx` EDIT」**外加** `app/page.tsx` UNTOUCHED ⇒ 隱含 30 個。**實際總共 29 個**（27 個 `(app)/` + 1 `login/` + 1 `app/page.tsx`）⇒ **要 EDIT 的是 28 個** | plan 的**內部矛盾**，非 repo 漂移。§4 的列號 `4–32` 要改成 `4–31`。→ §Risks 無新增 |
| **D-grid-count** | plan 宣稱 `gridTemplateColumns` **94**，實測 **95**（差 1 —— agent 的計數只含 page 檔，我的含 `*.test.tsx`）| 不影響設計，但證明 agent 的數字**不可直接採信**。已改用實測值 |
| **D-cap-taxonomy** ⭐⭐ | plan 的「**91 個 px 上限**」把**天花板與地板混為一談**。實測：`maxWidth` **40** 個（天花板）· `minWidth` **54** 個（地板，資料表列寬）。**D1(b) 只涉及那 40 個。** ⛔ 而其中 **19 個放寬後會更糟**（見下方分類） | **US-2 的驗收標準要重寫** —— 從「91 處」改為「21 處放寬 + 19 處明列不動並附理由」。這是本片**最重要的 Day-0 發現** |
| **D-table-fix-insufficient** ⭐ | 6 個「未裝住」的表格全是 `width:'100%'` 且**無 `minWidth`** ⇒ 它們不是撐開後被裁，是**被壓縮**。單加 `overflowX:'auto'` **不會產生捲軸**（沒有東西比容器寬）| US-4 的修法不完整。正解是**同時**給 `minWidth`（比照已裝住的同類表格 520–1020px）**與**捲動容器。→ §Risks 新增 |
| **D-className-zero** | 重驗仍為 **0** | §3.0「不遷移 class」的前提成立 |
| **D-media-zero** | `@media` 在 `apps/web/src` 仍為 **0** | 前提成立 |
| **D-collapse-state** | `AppShell.tsx:232` / `:260` / `:452` 的 state 與切換鈕確認存在且可用 | US-1 的「只差自動觸發」成立 |

### D-cap-taxonomy 的完整分類（40 個 `maxWidth`）

**⛔ 不放寬（19）—— 放寬會讓畫面更糟，逐類附理由：**

| 類別 | 數 | 位置 | 為何不動 |
|---|---|---|---|
| 登入頁 | 8 | `login:247,278,346,510,540,579,770,889` | 這是**置中的全螢幕認證版面**，四個狀態各有窄卡片。2560px 寬的登入表單不是「用滿螢幕」，是壞掉 |
| 查無資料的守衛卡 | 7 | `audit-issues/[ref]:212` · `controls/[id]:197` · `incidents/[ref]:200` · `issues/[id]:153` · `policies/[id]:246` · `risks/[id]:223` · `suppliers/[ref]:136` | 一句「找不到」的錯誤訊息拉成 2400px 寬，比 560px 更難讀 |
| 文件檢視器 | 3 | `policies/[id]:992,996,1034` | 它在**模擬一張列印文件頁**（帶 `zoom`）。放寬會直接摧毀「這是一頁文件」的隱喻 |
| 進度條軌道 | 1 | `assessments:295` | 6px 高的進度條，`150px` 是刻意的視覺長度，不是版面上限 |

**✅ 放寬（21）—— 使用者抱怨的實際來源：**

| 類別 | 數 | 代表位置 | 現值 |
|---|---|---|---|
| 表單 | 5 | `risks/new:214,499,559` · `suppliers/new:240,484` | 1000 / 940px |
| 頁面說明散文 | 5 | `audit-issues:202` · `isms-profiles:468` · `os-portfolio:248` · `suppliers:168` · `risk-programme:314` | 680–700px |
| 單欄頁 | 2 | `preferences:157` · `switch-entity-role:105` | 620 / 760px |
| 詳情頁內容區塊 | 9 | `controls/[id]:332` · `risks/[id]:437` · `issues/[id]:208` · `incidents/[ref]:368,870` · `audit-issues/[ref]:418` · `policies/[id]:585` · `assessments:484` · `ai-assistant:174` | 560–760px |

⚠️ **散文類（5）的處置需要判斷**：全部移除上限後，2560px 下的說明文字會是一行 2300px，
那是不可讀的。**擬採：散文類放寬到約 90ch（~1100px）而非移除**，其餘 16 個移除上限。
**此為明確標示的假設** —— Day 3 的 2560px 那一輪必須逐頁看行長，不符就回報使用者。

### Go / no-go

範圍**沒有變大，變得更精確**：US-2 從「91 處」收斂為「21 處放寬 + 19 處明列不動」，
US-4 的修法從「加捲動容器」修正為「加 `minWidth` + 捲動容器」。
變動幅度 **< 20%** ⇒ **繼續 Day 1**，上述兩點回填 plan §3.3 / §3.5 與 §5 的 AC。

### Remaining for Next Day

- Day 1：`useBreakpoint` hook（含 SSR 首幀負面測試）→ 側欄自動收合（含「手動優先」負面測試）
  → topbar 收納（含「被收納項仍可達」）
