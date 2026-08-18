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

---

## 2026-08-18 — Day 1（Shell：斷點機制 + 側欄 + topbar）

### Today's Accomplishments

| 任務 | 實際 | 產出 |
|---|---|---|
| 1.1 `useBreakpoint` | ~35 min | hook + **10 個測試** |
| 1.2 側欄自動收合 | ~40 min | `AppShell` 3 行語義改動 + **7 個測試** |
| 1.3 topbar 收納 | ~55 min | 期間精簡下拉 + 角色補進選單 + 搜尋地板 + **6 個測試** |

Gate：format **0** · lint **0** · type-check **0** · test **12 檔 / 111**（基線 88，+23）
· build **31 條路由**（與基線相同）

### 三個 plan 處方在實作時被推翻（R3 —— 記錄而非默默改）

| # | plan 原文 | 為什麼不成立 | 實際做法 |
|---|---|---|---|
| 1 | 搜尋框 `min(230px, 100%)` | ⛔ **數學上是 no-op** —— `100%` 相對於 flex 容器，768px 下容器約 732px，`min(230, 732)` 仍是 230 | 依斷點降地板 230 → **120px** |
| 2 | 期間控制「收進既有的使用者選單」 | 期間是**範疇控制不是使用者設定**，埋進去等於讓它找不到 —— 那是把可達性換成技術上可達 | 就地換成**精簡下拉**，五個選項全在裡面 |
| 3 | 「隱藏名稱／角色文字塊」 | ⭐⭐ 使用者選單有 name + email 但**沒有角色** ⇒ 照做會讓角色在 1440px 以下**完全不可達**（AP-3） | **先把角色補進下拉，再隱藏** |

第 3 點是本日最重要的發現：**它不是實作細節，是 plan 的驗收條件寫得太寬**。
AC-3 只說「被收納項仍可達」，而我在寫 plan 時**假設**了名稱與角色都已在下拉裡 —— 沒有查。

### 中性化：兩次預測，兩次命中（預測寫在執行之前）

| 中性化 | 預測 | 實測 | 關鍵觀察 |
|---|---|---|---|
| `useBreakpoint` 改成 render 期讀 `matchMedia` | 2 紅 | **2 紅** ✓ | ⭐ 其餘 **8 條全綠** —— 只斷言「最終值」的測試對 hydration 不一致完全盲目 |
| `collapsed` 改成純由斷點導出 | 3 紅 / 4 綠 | **3 紅 / 4 綠** ✓ | ⭐ 4 條 band 測試維持綠 —— 只測自動收合會對「切換鈕變死控件」全盲 |
| 拿掉下拉裡的角色 | 1 紅 | **1 紅** ✓ | ⭐ 只有**一條**測試會叫，畫面看起來完全正常（topbar 更乾淨、選單打得開、name/email 都在） |

### 我自己踩的三個錯（全部由工具輸出抓到，非事後回想）

1. **`type exit=0` 是假的** —— `npm run type-check \| tail -1; echo $?` 取的是 `tail` 的狀態。
   真實 exit 是 **1**（`as Persona` 的型別錯）。⇒ **管線後的 `$?` 不能當該指令的結果**
2. **`as Persona` 硬轉** —— 我捏的 persona 漏了 `email` / `initials`。cast 把「沒對上真實形狀」
   偽裝成通過 ⇒ 改用真的 `PERSONAS[0]`，型別日後加欄位時測試不會靜默漂移
3. **`npm run format` 不存在** —— 本專案只有 `format:check`。⚠️ **記憶裡就有這一條**
   （上次是 agent 回報衝突才擋下），這次自己撞上 ⇒ 用 `npx prettier --write` 直接跑

### 順帶觀察（記錄不修 —— 節流閘）

- **使用者選單觸發鈕沒有可及名稱**（無 `title`、無 `aria-label`，只有縮寫文字）。
  交付物自己的 a11y 慣例有明文要求，這是既有缺口非本片造成 → 待記 BACKLOG
- 新增 i18n key `topbar.period.heading`（zh-Hant「期間」/ en「Period」）—— 精簡下拉需要標題

### Remaining for Next Day

- Day 2：21 個內容 `maxWidth` 放寬（D1(b)，散文類另議）· 固定欄數 grid 重排
  · 6 個表格 **`minWidth` + 捲動容器**（Day 0 的 D-table-fix-insufficient）

---

## 2026-08-18 — Day 2（未執行既定內容 —— phase 被裁定回退）

### 發生了什麼

Day 1 的成果推上瀏覽器給使用者看之後，被**連續三次否決**，第三次點出了原因：

| # | 使用者的話 | 我當時的反應 |
|---|---|---|
| 1 | 「不行」 | 以為是 D1(b) 放寬的視覺結果不好 → 改提「版面重新組織（斷點）」 |
| 2 | 選了「版面重新組織」，看到結果後仍否決 | 以為斷點數不夠 |
| 3 | 「現在也只是固定的大小, 你是否先參考 mockup 的大小吧」 | ⭐ 前提錯了，不是參數錯了 |

**根因**：本片從第一句話就假設任務是「**發明**交付物沒有的響應式行為」。使用者要的是
「**參考**交付物的尺寸」。這兩件事在 plan 的每一節都長得很像，所以 Day 0 的三-prong verify
（它驗的是「plan 對 repo 的斷言是否屬實」）**完全不會發現**——
斷言全部屬實，錯的是斷言之上的目的。

### 為了回答「和 mockup 一樣是什麼意思」而查到的三件事

1. **交付物的 standalone HTML 跑不起 30 個畫面** —— `__dcRegistry` 只有 **1 個**項目（封面頁）。
   30 個畫面只存在於帶 `{{ }}` 模板語法的 fragment，不能直接開來比對
2. **dashboard 已經和 mockup 一樣** —— 逐項比對 grid 宣告（`1.5fr 1fr 1fr` / `repeat(5,1fr)` /
   `repeat(6,1fr)`）與 `max-width`（兩邊皆 0）**完全相同**
3. ⭐ **交付物自我矛盾** —— `README.md` 的 application shell 規格圖寫「main content,
   **max-width 1400px**, padding 24px」，`base.css:48` 也有這條規則，
   但 **`class="page"` 在交付物 fragment 與 app 皆出現 0 次** ⇒ 這條規格**兩邊都從未實作**

第 3 點是關鍵：在它被解決之前，「和 mockup 一樣」沒有可驗證的定義 —— README 說一套、
fragment 做另一套。

### 回退執行

- `git checkout 756d503 -- apps/web` + `git rm` 四個 W20 新增檔
- ⚠️ **陷阱**：`git checkout <sha> -- <path>` **不會刪除該 commit 不存在的檔**。
  第一次還原看起來完整，實際留下 4 個新增檔 —— 是比對**檔案清單**（不只內容）才發現的
- 驗證：`git diff --stat 756d503 -- apps/web` 空 + 檔案清單 diff 空 ⇒ 與 W19 逐位元組相同
- Commit `215add3`

### Gate（回退後實跑）

format **exit 0** · lint **exit 0** · type-check **exit 0** · test **9 檔 / 88**
（自 111 退回 W19 基線，符合移除 3 個 suite 的預期）· build **31 條路由** · `run_all` **9/9**

### Drive-through（回退後）

乾淨重啟 3200（舊 server 是前一日 20:43 起的孤兒 worker，Risk Class C），
以區域資訊安全主管身分登入，1440px 走 login / dashboard / risks / ai-assistant / risks-new
五個畫面 —— 渲染與 W19 相同。

⚠️ **順帶發現（dev-only，記錄不修）**：用 `127.0.0.1:3200` 開會拿到 **403**，三個 JS chunk
載不進來；`localhost:3200` 正常。Next.js 16 的 dev origin 檢查擋掉帶
`Origin: http://127.0.0.1:3200` 的請求。`curl` 不帶 Origin 所以看起來 200 ——
**這正是「用代理指標回答需要讀內容的問題」的形狀**，帶 header 重跑才看到 403。
⇒ 之後的 drive-through 一律用 `localhost`。

### Notes

- 本片的**執行品質沒有問題**（兩次中性化預測命中、抓到一個會靜默消失的角色）。
  失效的是它服務的目的 —— 這是我第一次遇到「gate 全綠、drive-through 也做了、
  但**方向**是錯的」的形狀
- Day 0 的三-prong 驗的是 plan 對 repo 的斷言，**驗不到 plan 的目的是否是使用者要的**。
  這個缺口不是 Day-0 程序的瑕疵，而是它的設計邊界
