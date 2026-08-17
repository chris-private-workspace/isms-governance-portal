# CH-038: W19 — 27 個畫面的移植，以及只有開車才看得見的那一層

**Date**: 2026-08-17
**Phase**: W19（mockup port）
**Scope**: `ui`（+ `identity`：persona 登入與 demo session；+ 非範疇：`scripts/lint`、`test`）
**Components**: —
**PR**: ⏳ **PENDING** —— push 需使用者確認（outward-facing）

---

## Problem

專案有一份高保真設計交付物（30 個 fragment、3 份 CSS、一份 800 KB 的原型邏輯類別），
以及一個只有 W01 骨架驗證頁的 `apps/web`。**沒有任何產品畫面存在。**

同時 `AppShell.tsx:185` 之類的導航項與列點擊已經指向一批不存在的路由 ——
換句話說，缺的不只是畫面，是**主流量上一整排斷掉的目的地**。

---

## Root Cause

不是「還沒做」而已。移植這件事有三個**互相看不見**的失敗面，而專案只有前兩個的守衛：

| 層 | 問的問題 | 既有守衛 |
|---|---|---|
| 零件 | 型別對嗎？能建嗎？ | type-check / lint / build / test |
| 保真度 | 跟設計一致嗎？ | ⚠️ 只有 inline style 逐字複製 |
| **行為** | **人能真的用嗎？** | ❌ **沒有** |

第三層的空缺不是理論問題 —— 本片的核心發現就是它造成的（見 §Verification）。

---

## Solution

### 建了什麼

- **27 個 `page.tsx`** + `login` + `api/demo-session` —— build 路由表實測 **31 條**
- **設計系統層**：`lib/tok.ts`（RAG 字母 → 色彩 token）· `lib/posture.ts`（門檻單一來源）·
  `globals.css` 的 **10 條 `data-hov`** · `DemoBadge`
- **shell**：`AppShell.tsx`（13 個導航項 / 5 群）+ `shell-state.ts`（scope / period / locale 的唯一來源）
- **fixture**：21 個機械複製（diff 21/21 IDENTICAL 後才清理）+ `entityPosture`（算出而非複製）
  + **14 個 `data/extended/*.ts`**（交付物 `data/` 未匯出、只存在於 `dc.html` 的集合）
- **i18n**：9 對字典、**每批一份**在 `index.ts` 合併（並行寫入的正確性考量，不是組織偏好）
- **機械守衛**：`check_mockup_fidelity.py` 新增 `check_hover_rules`

### ⭐ 這個 CH 的核心：三層驗證各自抓到了**對方看不見**的東西

這不是修辭。三層各自的產出完全不重疊：

| 層 | 抓到什麼 | 另外兩層會不會抓到 |
|---|---|---|
| Gate | 6 個 ShellState stub 缺 `setLocale` | 保真度不會、drive-through 不會 |
| **Drive-through** | **25 個死控件 / 15 個畫面** | ❌ 兩者都不會 |
| **並排比對** | 供應商設定被指名、8 處計數該算不該抄 | ❌ 兩者都不會 |

⇒ **「gate 全綠」在這個 phase 的證據力，比它看起來低得多。**

### Load-bearing 的細節（拿掉就會壞，但看起來像小事）

1. **`data-hov` 的值必須落在 `globals.css` 已定義的 10 個之內。**
   不在其中的值會渲染、會過型別、會過 lint、會 build，**然後什麼都不做**。
   而且它在並排比對下看起來是對的（`data-hov="surface-3"` 呼應 fragment 的 `var(--surface-3)`，
   而規則名叫 `s3`）。前兩個畫面就這樣出了 7 個，**其中 4 個在那個被指定給其餘 26 頁抄的檔案裡**。
2. **i18n key 必須是字面。** 樣板字串組出來的 key 會過型別、會渲染，
   而 `i18n.test.ts` check 3 掃的是**原始碼字面** ⇒ 掃不到 = 不設防。
3. **`[data-hov]:hover` 在 `disabled` 元素上照樣觸發。** 所以把按鈕改成停用時，
   hover 屬性**必須一併移除**，否則視覺上仍然「活著」。
4. **entity 只能來自 `useShell()`**（後面是 session cookie），永遠不從 URL 參數。
   查無資料回 404 不回 403。
5. **計數一律由 fixture 算出。** 交付物自己就對不上 —— `14-admin:237` 寫 43 users 而其迴圈 `hint=8`。

---

## Verification

### Gate

`format:check` clean · `lint` EXIT=0 · `type-check` EXIT=0 ·
`build` **✓ 31 條路由 / 27 畫面** · `test` **8 檔 / 76 通過** · `run_all` **9/9**

### ⭐ Drive-through（真 UI + 真後端）—— **PASS，但它先抓到了一批東西**

| 項目 | 結果 |
|---|---|
| 28 條路由逐一載入 | **console error 全部 0** |
| Persona 登入主路徑 | ✅ 選 persona → dashboard → 切換實體 → 登出 |
| **負面測試** | ⭐ 無 session 直接開 `/dashboard` → **被擋回 `/login`**、cookie 清空 |
| DEMO 標記 | `(app)` **27/27** 頁量 bounding box 確認**實際可見** |
| 13 OpCo / 11 管轄區 | ✅ 且全 app grep **BFSI 0 命中**、無 India 列、無 Japan-as-OpCo |
| guardrail 7 | `localStorage` **0 鍵** · `sessionStorage` **0 鍵** · 唯一 cookie **httpOnly** 且值非 token |

### 🔴 Drive-through 抓到而 gate 沒抓到的

**25 個按鈕，15 個畫面：無 `onClick`、無 `disabled`、`cursor: pointer`、`opacity: 1`，
其中 4 個帶 `data-hov` 會在滑鼠移過時亮起來。**

它們通過了 format · lint · type-check · build · 76 個測試 · `run_all` 9/9 ——
**包含本片自己新加的 hover 守衛**。沒有任何機械檢查看得到它們。

處置（依「先問能不能真的做到」的順序）：

| 處置 | 數量 |
|---|---|
| **接上，變成真的能用** | 2（`/preferences` 語言卡）|
| 停用 + 說明 title + **移除 hover** | 24 鈕 + 2 span |
| 移除假的可點外觀 | 3 列（`/ai-assistant`）|

⭐ 語言卡是唯一「能力早就存在、只是沒暴露」的一個 —— `AppShell:231` 一直有 `setLocale`，
topbar 也一直在用，只是不在 `ShellState` 上。這與 `setScope` 當初存在的理由完全相同。

**複驗**：15 條路由實測**零違規**；補掃 27 條路由 **`deadButtons: []`**（含分頁展開狀態）。

### 並排保真度比對（代碼層）

fragment **3,299 行** → page **23,102 行**（×7.0）· 可見字串 **719** ·
疑似缺漏 **44** → **逐筆追查後真實漏抄 0**。詳見 [`page-inventory.md`](../../02-architecture/page-inventory.md)。

**Verdict**: ✅ **PASS（drive-through + 代碼層保真度）**。
⚠️ **視覺像素 diff 未做** —— 明列於 page-inventory 的覆蓋聲明。

---

## Impact

### 關掉的 AD

| AD | 依據 |
|---|---|
| `AD-CssToken-1` | `mockup-fidelity.md:38` 的紅線 7 在本專案是錯的 —— 交付物無 Tailwind、inline style 逐字複製才是正解。已在 `.mockup-fidelity.json` 以 narrow exemption list 落地 |
| `AD-Mockup-3` | OpCo fixture 重建為 **13 家**，India 列**刪除**（不補 `RCN`），Japan 不再是營運實體 |
| `AD-Port-BFSI` | 全 app grep **BFSI 0 命中** |
| `AD-Auth-1` | login 移除密碼欄位（ADR-0007）· Entity 換 13 OpCo · Role 換六角色 |

### 未關、且狀態要改的

- **`AD-Mockup-2`** → 改為「**已渲染，結構問題仍開**」：儀表板不再以國家為鍵
  （`entityPosture` 由 `opcos.map()` 算出，容得下新加坡 2 家、香港 2 家），
  但**跨實體滾升的正確聚合規則仍是未決問題**（`posture.ts` 的 `regionPosture` 取中位數，
  該檔自己標明那是「可一句話解釋」而非治理級規則）

### 新開的 AD（5 條）

| AD | P | 一句話 |
|---|---|---|
| `AD-LocalPasswordFallback-1` | 🔴 P0 | stakeholder 要保留本地密碼登入，**與已採納的 ADR-0007 衝突** ⇒ 需 ADR 修訂 |
| `AD-RbacUnenforced-1` | 🟡 P1 | 27 畫面零角色強制，而 `14-admin:7` 自己標了該強制的地方 |
| `AD-FixtureEnumUntranslated-1` | 🟢 P2 | 英文列舉值嵌進中文句子（guardrail 9）|
| `AD-ShellMinWidth-1` | 🟢 P2 | shell 固有最小寬 1308px vs 交付物宣告的 ≥1280px |
| `AD-NewRouteAsymmetry-1` | 🟢 P2 | 三個同款「新增」鈕，一活兩停用 |

### 對後續的約束

- **`page-inventory.md` 與 `design-system.md` 是下一片前端工作的起點** ——
  primitive index 與 drift log 存在的目的就是不要重新推導
- **`posture.ts` 是所有門檻的單一來源**。本片修正了它的兩組轉錄漂移並改寫了不實的 header 宣稱
- **M8（旗艦儀表板）的 UI 層已可展示**，但**資料仍全是 fixture** —— 接 API 是另一片

---

## 相關

- [`W19-mockup-port/`](../../01-planning/W19-mockup-port/plan.md) —— plan / checklist / progress / retrospective
- [`page-inventory.md`](../../02-architecture/page-inventory.md) —— 27 畫面的保真度對照與偏離依據
- [`design-system.md`](../../02-architecture/design-system.md) —— primitive index + drift incident log
- [`15-design-alignment.md`](../../02-architecture/15-design-alignment.md) —— 保真度例外的單一權威來源
