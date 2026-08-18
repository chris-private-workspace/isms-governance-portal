# CH-040: UI 預設語言改為英文，而 guardrail 9 才是真正要改的那一行

**Date**: 2026-08-18
**Phase**: 無 active phase（W20 已 `closed_partial`）
**Scope**: `ui` —— `apps/web/src/i18n` · `apps/web/src/app` · `apps/web/src/components/shell`
**Components**: `DEFAULT_LOCALE` · `AppShell` · root layout · `login`
**PR**: **MERGED** (PR #82, `fafa996` + `65b29f2`)

---

## Problem

使用者要求：**login 頁預設顯示英文，登入之後也預設英文**。

現況是預設 `zh-Hant` —— login 頁透過 `DEFAULT_LOCALE` 解析全部文案，
`AppShell` 的 locale state 硬編碼 `'zh-Hant'`，root layout 的 `<html lang>` 也是。

⛔ **這直接牴觸 CLAUDE.md guardrail 9**：

> 9. **語言。** 程式碼／註解／技術文件用**英文**；任何終端使用者可見文字與 UI copy 用**繁體中文**。

guardrail 是不可協商的硬約束，所以**先停下來問**，而不是逕行改 code。

---

## Root Cause

guardrail 9 的第二個子句與**本專案的實際使用者組成**不符。

平台服務 **11 個管轄區的 13 家 OpCo**（已確認參數 #4 / #12）。其中以繁體中文為主要工作語言的
只有**台灣與香港**；新加坡、馬來西亞、泰國、韓國、澳洲、紐西蘭、越南、印尼、菲律賓
在集團內的共通語言是**英文**。⇒ 「UI copy 用繁體中文」讓**多數管轄區的使用者**看到非母語介面。

這條 guardrail 高度疑似是專案模板（`claude-code-dev-template v2.6.1`）的遺留值，
而非本專案針對自己的使用者做過的決定 —— 它從未在 `00-project-charter.md` 的 15 項已確認參數
裡出現過對應項。

---

## Solution

使用者 2026-08-18 裁定：**改 guardrail 9**，讓規則與實作一致。

### 1. CLAUDE.md guardrail 9 改寫

從「UI copy 用繁體中文」改為「**使用者可見文字必須雙語，預設 `en`**」。
⭐ **雙語要求本身沒有放鬆** —— `en` 與 `zh-Hant` 字典 key 完全等價，由 parity test 機械強制。
改的是**預設值**，不是**涵蓋範圍**。

### 2. 程式碼（3 行）

| 檔案 | 改動 |
|---|---|
| `i18n/index.ts` | `DEFAULT_LOCALE: Locale = 'zh-Hant'` → `'en'` |
| `components/shell/AppShell.tsx` | `useState<Locale>('zh-Hant')` → `useState<Locale>(DEFAULT_LOCALE)` |
| `app/layout.tsx` | `<html lang="zh-Hant">` → `lang="en"` |

`login/page.tsx` **不必改** —— 它已經透過 `DEFAULT_LOCALE` 解析，自動跟著變。
⚠️ `AppShell` 原本硬編碼字面值而非引用常數，是既有的不一致；順手改成引用常數，
否則「預設語言」會有兩個真相。

### 3. 註解（4 處，否則是 AP-7 orphan claim）

`i18n/index.ts:20` · `layout.tsx:18` · `login/page.tsx:72` · `AppShell.tsx:26`
四處都寫著「zh-Hant is the default per guardrail 9」。guardrail 改了而註解不改，
就是引用已被移除的東西 —— `anti-patterns-checklist.md` AP-7 明列。

---

## 關鍵設計細節

### ⭐ 一個測試會因為改常數而失去測試對象（不是失敗，是變成無意義）

`i18n.test.ts` 的 fallback 測試原本這樣寫：

```js
const partial = { ...DICTIONARIES.en };
delete partial['health.state.up'];
DICTIONARIES.en = partial;
expect(t('en', 'health.state.up')).toBe(DICTIONARIES[DEFAULT_LOCALE]['health.state.up']);
```

它測的是「某個語言缺 key 時，`t()` 回退到**預設語言**而不是洩漏 key 名」。
`t()` 的實作是 `DICTIONARIES[locale][key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key`。

**當被刪 key 的語言就是預設語言時，這個測試沒有東西可測** ——
兩次查表查的是同一本字典，都是 `undefined`，`t()` 落到第三段回傳 key 名，
而斷言的右手邊也是 `undefined`。

⇒ 這次它會**紅**（`'health.state.up'` !== `undefined`），所以會被抓到。
但它紅的原因不是「fallback 壞了」，而是「這個測試不再指向任何行為」。

**修法不是把 `en` 換成 `zh-Hant`** —— 那只是把同一顆地雷埋到下一次改預設語言的時候。
改成從 `LOCALES` 算出一個**非預設**的語言：

```js
const other = LOCALES.find((l) => l !== DEFAULT_LOCALE)!;
```

⇒ 測試對 `DEFAULT_LOCALE` 的值免疫。這是這次真正的結構性產出。

### parity test 的 reference set 也綁在 DEFAULT_LOCALE 上

`parityViolations()` 用 `Object.keys(dicts[DEFAULT_LOCALE])` 當比對基準。
改預設語言 = 換了比對方向。因為兩本字典 key 等價，**理論上**仍該全綠 ——
但這是需要實跑證明的，不是可以推論的（`verification-discipline.md` §證據層）。

### `TranslationKey` 型別來源**不改**

`TranslationKey` 由 `zh-Hant.json` 導出（`index.ts:96`）。
**型別來源與預設語言是兩件不同的事**：前者決定「哪些 key 存在」，後者決定「先顯示哪本字典」。
本次只改後者。註解要把這件事講清楚，否則下次有人會以為兩者必須一致。

---

## Verification

| 層 | 結果 |
|---|---|
| format / lint / type-check | **exit 0** |
| test | **9 檔 / 88** |
| build | **31 條路由** |
| `run_all.py` | **9/9** |
| **Drive-through** ⭐ | **做了 —— 而且抓到兩個 gate 完全看不見的問題**（見下） |

### 中性化：測試對預設語言真的免疫（不是宣稱）

把 `DEFAULT_LOCALE` 暫時改回 `'zh-Hant'` 再跑一次 —— **9 檔 / 88 全綠**，
與 `'en'` 的結果逐項相同。⇒ 三個測試（1 個 fallback + 2 個 parity 元測試）
現在確實對預設語言的值免疫，這是實測不是推論。

⚠️ **修之前它們不是免疫的**：第一次跑出 **2 紅**，兩個都是 parity 元測試
硬編碼 `locale: 'en'` 作為預期違規者。reference locale 換人，違規方向就翻轉，
它們報的是 `zh-Hant` 違規。⇒ CH-040 起草時把「parity test 理論上仍全綠」
標成**需要實跑確認**是對的 —— 推論會給出錯誤的答案。

### ⭐⭐ Drive-through 抓到的兩處：gate 全綠而畫面在說謊

`/preferences` 的語言卡片：

| 位置 | 改之前顯示 | 問題 |
|---|---|---|
| 繁中卡片副標 | 「**Default** · Hong Kong · Taiwan」 | 預設已是英文，這是**誤導性標籤** |
| 英文卡片副標 | 「Available」 | 它才是預設，卻標成「可選用」 |
| 說明段落 | 「a reload returns to **Traditional Chinese**」 | reload 現在回到英文，**這句話是錯的** |

三處都是字典裡的**文案**，把「繁中是預設」這個事實硬寫進了字串。
⇒ key 存在、parity 過、type-check 過、88 個測試全過、build 過 ——
**每一項 gate 都不可能發現畫面在陳述一件不再為真的事**。

這是 `verification-discipline.md` 明列的「寫死或誤導的標籤」，
與 W19 那 25 個死控件同形：**守衛齊全，而它們量的東西與這個錯誤正交**。

修法：`prefs.lang.zhHant.sub` 拿掉「Default／預設」、`prefs.lang.en.sub` 改為
「Default／預設」、`prefs.language.note` 的回退語言改成英文（兩本字典各一處）。

### ⛔ 第四個硬編碼點，本機 gate 抓不到（CI 才紅）

PR #82 的 `映像 build + 啟動探測` **FAIL**：

```
[smoke:web] FAIL — http://127.0.0.1:3200/ answered 200 but the page
does not contain the zh-Hant title.
  Expected (from apps/web/src/i18n/zh-Hant.json): APAC ISMS 治理平台
```

`scripts/smoke-probe.mjs` 是第四個把預設語言寫死的地方，而我在上面只修了三個。

⭐ **它的檔頭第 30 行早就寫著防禦措施**：

> Expected copy is read from the zh-Hant dictionary rather than hard-coded,
> so rewording the UI does not turn this into a false red.

**那個防禦是真的，但只做了一半** —— 它避免了「改文案」的脆弱，卻**寫死了讀哪一本字典**。
同一個錯誤形狀，往上一層。

修法與前三處一致：從 `i18n/index.ts` 抽出 `DEFAULT_LOCALE` 決定讀哪本字典，
抽不到就**明確 fail**（不 fallback 猜測）。

⛔ **刻意沒採用的兩個做法**：
- 把 `zh-Hant.json` 換成 `en.json` —— 只是把同一顆地雷埋到下次
- 兩本字典任一命中就算過 —— 那會**摧毀這支探測存在的鑑別力**：服務錯語言就會通過

中性化驗證：把 `DEFAULT_LOCALE` 改回 `'zh-Hant'`，probe 立刻期待「APAC ISMS 治理平台」；
改回 `'en'` 期待「APAC ISMS Governance Platform」。**derived 是實測的**。
`--self-test` 3 個案例仍 PASS。

### ⚠️ 我說「gate 全綠」時，那句話的射程比它聽起來小

上面 §Verification 那張表是**本機能跑的 gate**。`image-smoke.yml` 需要 `docker build`
兩個 image 再起容器，**只在 CI 跑** —— 所以「format / lint / type-check / test / build /
run_all 全綠」是真的，而它**不涵蓋這一項**。

⇒ 同形狀第 2 次（第 1 次是 `lint --silent` 本機全綠、CI 30 秒爆 28 個錯，
記在 `task-workflow.md` §Before Commit Checklist item 2）。
→ `AD-LocalGateSetIncomplete-1`

### Drive-through 走過的路徑

`localhost:3200`（⚠️ 不是 `127.0.0.1` —— Next.js 16 的 dev origin 檢查會回 403）

1. `/login` —— 全英文 ✅
2. 以 Regional ISO 登入 → `/dashboard` —— 全英文，topbar 徽章顯示 `EN` ✅
3. topbar 語言選單 → 繁體中文 —— 全站切回繁中 ✅（**切換器仍是活的**）
4. `document.documentElement.lang` —— `"en"` ✅
5. `/preferences` —— 修正後兩本字典的語言卡片文案都正確，
   且點卡片真的會切換（**preferences 的語言卡片不是死控件**）✅

---

## Impact

- **使用者可見**：login 與登入後的預設語言變英文。切換器不動，繁中一鍵可回
- **不影響**：key 集合、parity 強制、切換器行為
- **字典內容有動**：`/preferences` 三處文案（drive-through 抓到的誤導標籤）
- **規則層**：CLAUDE.md guardrail 9 改寫 —— 這是本次真正的變更，程式碼只有 3 行

### ⚠️ 一個既有缺陷，方向對調但沒有變好也沒有變壞

`<html lang>` 是 server-rendered 的靜態值，而語言切換器是 client-side ——
所以**切換語言之後 `lang` 屬性不會跟著變**。

- 改之前：預設 zh-Hant + `lang="zh-Hant"` 一致；切到 en 後 `lang` 仍是 `zh-Hant`（錯）
- 改之後：預設 en + `lang="en"` 一致；切到繁中後 `lang` 仍是 `en`（錯）

**預設狀態兩邊都對，切換後兩邊都錯** —— 本次沒有改變這個性質。
螢幕閱讀器會用錯發音規則。真正的修法是 L1 per-locale routing
（`layout.tsx` 的註解已標明），不在本次範圍 → 記入 BACKLOG。
