# W22 — risks 垂直切片（兩個各自完整的一半第一次見面）

**Phase**: W22 · **Closed**: 2026-08-19 · **PR**: PR-pending · **Status**: `closed`
**權威來源**: [`W22-risks-vertical-slice/retrospective.md`](../docs/01-planning/W22-risks-vertical-slice/retrospective.md)
**Change record**: [`CH-042`](../docs/03-implementation/changes/CH-042-risks-read-path-meets-the-api.md)

---

## 一句話

`apps/web` 對自家 API 的呼叫從 1 個（W01 的 `/health` probe）變成**第一個產品畫面** ——
而本片真正的收穫是 **drive-through 抓到的 8 個缺陷，它們全部在 gate 全綠時存在**。

---

## ⭐⭐ 核心一：fixture 文案在畫面接上真資料的那一刻變成偽造的治理證物

打開一筆**真實**風險的詳情頁，畫面顯示：

- `PREPARED BY .` 後面跟著「signed」· `APPROVED BY M. Tan · Regional Governance` 帶日期
- **6 筆帶 SHA-256 hash 的稽核軌跡**
- `append-only` · `SHA-256 chained` · `Tamper-evident`
- 頁首橫幅 `Record locked · tamper-evident ledger active`
- `Ratified by the Information Security Committee` · `Treatment: Reduce` · `Next review: 30 Sep 2026`

**全部不存在。** 它們是 W19 的 fixture 字串，而**這個專案今天十九張表一張都沒有稽核軌跡**。

⛔ **關鍵在時序**：整頁都是樣本時它們無害。敞口在「表頭變成真實資料」的那一刻打開，
而**那次改動的 diff 裡一個字都沒碰到那些區塊**。⇒ 任何 diff-based 的 review 結構上看不見它。

⛔ **這不是「沒有守衛」，是守衛方向反了**：`DemoBadge` 的 docstring 明寫存在理由是
「sample data presented as real」。混血畫面讓它宣稱**整頁是樣本**而表頭是真的 ——
**同一條誠實規則的反向違反，而它沒有名字，所以沒有人在找它。**

**處置**：`signOff` / `trail` / `cycles` 清空，整合性宣稱不再渲染，**而區塊標題保留** ——
「平台有簽核鏈」是真的，「這筆風險有這些簽名」不是。

⇒ `AD-FixtureProseBecomesForgedEvidence-1` 🟡 —— **同樣的文案還活在其餘 28 個畫面上**，
每接一頁重演一次。RISK_REGISTER **E5**。

---

## ⭐⭐ 核心二：只換文字不換 affordance 等於沒修

第一版修正把綠色盾牌徽章裡的 `Tamper-evident` **文字**換掉，**盾牌留著**。
**綠色盾牌不管寫什麼都讀作認證通過。**

⚠️ 而它在 diff 上看起來是完整的修復（一行字串替換），在測試上也是綠的。

---

## ⭐⭐ 核心三：改宣稱而不改資料的控件，比死控件更危險

切到 `RSG` 後 meta 行變成「**9 risks · RSG**」而列**一列沒變**。

W19 的 25 個死控件是**點了沒反應**；這個是**點了會看起來生效**。
根因是 D1 的必然結果：實體範疇來自伺服器（`DEV_PRINCIPAL_ENTITIES`），
前端傳 entity 會**直接違反約束 8 鐵律 3**（實體身分只能來自憑證／session）。

**處置**：meta 行改為 `server-set scope` + 說明行明說「選擇器不會過濾這張清單」。
⛔ 那是**標示不是修好** → `AD-ScopeSelectorInertOnLiveScreens-1`（M4 真認證前每接一頁都要標）。

---

## ⭐⭐ 核心四：中性化預測「哪些會維持綠」，買到的是壞消息

中性化把 `RiskController` 的範疇強制成 `['SG1','HK1']`。**5/5 與預測相符**
（20 / 21 轉紅；19 / 22 / 21 條單元測試維持綠），預測寫在執行之前。

⭐ 真正買到東西的是**那格「維持綠」的預測**：

> **21 條單元測試在範疇完全失效的情況下全部維持綠。**

它們注入假 repository，所以「跨實體讀被拒絕」**沒有任何單元測試看得見**。
⇒ 整合測試是約束 8 **唯一**的機械守衛，**而它不在 required status checks 裡**。
若哪天因為「太慢」被移出，**dashboard 上的數字幾乎不動**（484 → 476）。

⇒ `AD-UnitTestsBlindToScope-1` 🟡。若只預測「哪些會轉紅」，這件事不會浮出來。

同一個形狀當天第二次：Day 2 把兩頁從 fixture 整個換成 API，
期間跑三次 web 測試，**每次都是 88 passed** —— 沒有一條既有測試碰到改動的東西。

---

## ⭐⭐ 核心五：Day-0 證偽了本片存在的理由之一

plan §3.4 整節 + AC-6 + AC-8 都建立在「不存在的 id 回 307 導回列表」上（W21 實測）。

**實際**：`apps/web` 沒有 middleware。307 來自 `(app)/layout.tsx:50` 的
`if (!persona) redirect('/login')` —— **未登入**閘門，對 `(app)` 底下每條路由一律觸發。

⭐ Day 3 有真伺服器後從推論升級為量測，**決定性的一行是 `/risks` 列表路由（根本沒有 id）
同樣回 307** —— 列表沒有 id 可言，那個 307 不可能是「對找不到的 id 做導向」。

⇒ `AD-FrontendMissingIdRedirects-1` **更正而非關閉**（關閉它等於留一條假的關閉紀錄）。
AC-6 改寫為「不存在的 id 與跨實體的 id 渲染**完全相同**」，
以遮蔽 id 後的 **digest `f82fe766` / 1679 字元逐位元相同**證成。

⚠️ **教訓比更正本身重要**：一個從**外部黑箱探測**得到的 status code，
被寫成了對**內部行為**的斷言，中間隔著一個從未被檢查的前提 —— **探測者是不是已登入**。

---

## 其餘四個 drive-through 缺陷

| 缺陷 | 為什麼 gate 看不見 |
|---|---|
| **兩畫面對同一筆風險說法矛盾**（列表 `4 Low` vs 詳情 `12 Medium`）—— 詳情用控制**前**的因子算殘餘 | 兩個數字各自都是合法 number，**測試的斷言範圍從不跨畫面** → `AD-CrossScreenContradictionNoGuard-1` |
| partial badge 在**列表頁**說「以下的稽核軌跡、簽核…仍是樣本」—— 列表頁沒有那些東西 | 一份文案兩頁共用，測試只斷言 variant 屬性 |
| 描述句插值成「…in the **No source in the API yet** entity allow…」 | 插值成功，型別正確 |
| 詳情顯示 `2026-08-18T07:57:11.690Z`（含毫秒），列表顯示 `today` | 兩者都是合法字串 → `apps/web/src/lib/ago.ts` |

⚠️ 修矛盾時連帶拿掉列表的 `scoreAfter ?? scoreBefore` 回退 —— 那個回退把 inherent 的 20
放進標題寫著 Residual 的欄位。**副作用在畫面上可見**：頂端計數 `2 CRITICAL` → **`0 CRITICAL`**。

---

## 三個設計決定（拿掉就會壞）

1. **`byId` 走 `list()` 再 `.find()` 是範疇安全的來源，不是偷懶。** scoped client 從來沒回傳那一列，
   所以兩種拒絕**結構上**不可分辨。`findUnique` 需要先查到那一列才能決定拒不拒絕 = 約束 8 禁止的形狀。
   代價 O(n) → `AD-RiskByIdLinearScan-1`，**解封條件可觀察**（列表本身開始分頁）。
2. **seed 以 owner 連線（`DATABASE_URL_MIGRATE`）。** 跨實體寫入正是 RLS 該拒絕的，
   走 scoped client 的 seed **結構上只能種單邊** —— 而單邊 fixture 讓「範疇過濾有效」與
   「範疇過濾不存在」在畫面上完全相同。它因此也拒絕在 `NODE_ENV=production` 執行。
3. **ref code 用固定的 `9xxxxx` 保留段。** 冪等需要穩定的 unique key，
   而 `issueRefCode()` 每次呼叫配下一號 —— 用它建的 seed 每跑一次長出一整套新資料。

⭐ **seed 自己在 `counts.length < 2` 時拋錯** —— AC-3 有機械承載，不是「記得看輸出」。

---

## Calibration

`greenfield-feature` **第 1 個資料點**：bottom-up 12.5 → committed 6.9 (mult 0.55) →
actual **3.18 hr** ⇒ ratio **0.46 UNDER**。**KEEP 0.55**（單點不 re-point）。

⭐ **本專案第一個分子完全由當日量測構成的 ratio。** `AD-CalibrationNoTimeRecord-1` 已三次，
三次都是事後由 commit author date 反推。W22 把提醒從 plan §7 的散文（第 2 級，**已被否證兩次**）
移到 **checklist 每個 Day 收尾一個具名的 `[]`** ⇒ 四天四筆全部做到。
**差別不在態度，在於提醒放在會被勾的清單上而不是會被讀一次的散文裡。**

⚠️ **真正的訊號在 `actual / bottom-up` = 0.26**，遠低於 0.4 下限 ⇒
matrix 的判決是「**該修的是估算不是乘數**」。高估點有共同形狀：**有藍本的東西被當成沒有藍本估**。
唯一估得準的是 drive-through（估 2 hr / 實 75 min）—— **唯一真的沒有藍本的那一項**。

---

## 🚧 未解封 / 未做

- **gitleaks / semgrep 對新檔**（plan R3）—— 本機未安裝。解封條件：**本片 PR 的 CI run**
- **`prisma/seed.ts` 不被任何本機 gate 讀** → `AD-SeedFileUngated-1`
  （本次以獨立 `tsc --noEmit` + `prettier --write` 手動補驗）
- **審計 #7 的 `AD-27` / `AD-30`（ADR 層）** —— plan §9 建議夾帶，**未取得使用者核可，未做**
- **2 個 web 測試檔失敗一次，未重現、未診斷**（不知道是哪兩個）→ `AD-UndiagnosedWebTestFailure-1`

## ⚠️ 一個程序層的觀察

重啟 web 時 `EADDRINUSE :::3200`：**harness 回報那個背景任務已被 kill，而進程還活著** ——
PID 51720 已跑 8.5 小時仍在服務 3200。Risk Class C 加強版：
**「任務死了」與「進程死了」是兩件事。** 用 PID / PPID / StartTime 三欄確認才殺。
