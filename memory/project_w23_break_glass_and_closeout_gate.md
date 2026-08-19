# W23 — break-glass 從未被禁止，與 closeout 缺的那一格

**Phase**: W23 — 裁決本地密碼衝突 + 給 closeout 補上它缺的那一格
**Period**: 2026-08-19（單日）
**Status**: `closed`
**PR**: **MERGED** (PR #89, `bca8373`) —— 2026-08-19T06:26:58Z，經 `gh pr view` 驗證
**Retrospective**: `docs/01-planning/W23-adr0007-amendment-and-closeout-gate/retrospective.md`
**Change record**: `docs/03-implementation/changes/CH-043-break-glass-adr-and-the-closeout-cell-that-was-missing.md`

---

## 這個 phase 的一句話

**兩個都有效而不能同時為真的東西，需要的不是實作而是一個決定** ——
外加一個會在下次漏掉時叫出來的機械守衛。

## 核心發現：ADR-0007 自己前後矛盾

| 位置 | 它說什麼 |
|---|---|
| `0007:67` | break-glass → **Entra emergency access accounts** |
| `0007:103` | break-glass「remain **platform features**, not Entra features」 |
| `0007:136` | 「Entra logs are **not evidence-grade** for this platform's chain」 |

⇒ 問題**不是**「該不該有 break-glass」（`05:57` 一直要求，交付物指定 2 個），
而是「**它可不可以是本地的**」。Entra emergency account 繞得過條件式存取，
**繞不過 Entra 本身不可用** —— 而那正是它存在的場景。

第三個根因在轉述：`05:7` 原文是**條件句**（`where an IdP can be used`），
`0007:102` 轉述時**把條件拿掉**，變成無條件禁令。那個條件子句就是 ADR-0015 的法源。

## ADR-0015 的四個管控（缺一就是換名字的一般登入）

1. **MFA 不依賴壞掉的系統** —— ⛔ 禁止 email OTP（群組信箱由 Entra 撐 = 循環依賴）
2. **託管發放，零自助** —— 無註冊 / 無改密碼 / **永不設密碼重設流程**；不得進 seed
3. **稽核先於放行，fail-closed** —— 與發 session 同一交易；寫不進去就**拒絕登入**；attempt 也記錄
4. **≤60 min 用後即焚** —— 用過一次即作廢，須託管人重新發放

⭐ **同一行 `04:62` 被 0007 用來否決 Keycloak、被 0015 用來支持本地 break-glass** ——
差別是**流量不是類別**（100% vs 0%），而這件事自己寫在 ADR 裡而不是留給讀者發現。

## ⭐⭐ 最重要的技術發現：`run_all` 9/9 不是「gate 有效」的證據

Day 3 對新加的 E5 做 5 個變異，**3 個是真實迴歸**：

| 變異 | detector 說什麼 | `run_all` |
|---|---|---|
| 刪掉一種 marker 格式（**當天真的抓到過一個**）| `OK ... E5 clean` | **9/9** |
| 授權解不出來時改用**猜**的 | `OK ... E5 clean` | **9/9** |
| **E5 算完但不被 `find_violations` 收集** | `OK ... E5 clean` | **9/9** |

⛔ Day 2 修掉 5 個真陽性之後，`test_live_repo_is_clean` 對其中 2 個變異**完全失明** ——
**一個 gate 的偵測力會隨它守的缺陷被修好而歸零**。守住射程的是**具名單元測試**，
每個變異各只有 **1 個**會紅，而刪掉那 3 個測試**不會有任何 gate 反對**。

## ⛔ 兩個我自己犯的錯，都被本片自己的流程抓到

**1. 我枚舉了開放集合。** Day 2 照規則「先枚舉再寫 pattern」，並在 progress 裡寫「它立刻付錢」——
真的付了（抓到第 5 種格式 `PR 待開`）。但我枚舉的是「**我想得到的拼法**」。
Day 4 偶然撞到 `#86（pending）`，重做才發現還漏 **3 種格式 + 1 個搜錯範圍**（`memory/` 沒掃）
⇒ **上線時對 9 個活的 stale marker 漏 4 個（44%）**。
⭐ **正解：marker 欄位（`^\*\*PR\*\*:`）是封閉且可 grep 的；它的值不是。錨定封閉集合，分類它的值。**

**2. 我是自己這個 gate 的第一個使用者，而它擋住了我。** 模擬 closeout（翻 `status: closed`）時
E5 對 `CH-043` 與 `plan.md` 開火，其中 `plan.md:280` **正是 R4 本身的文字**。
根因是流程順序：closeout **先翻 status、後開 PR**，所以那段窗口裡「closed + pending」兩者都對。
⇒ 加 **landed gate**：E5 只裁決**已落在 `origin/main` 上**的 closeout。
⚠️ **plan R4 預言過這個缺陷而我照樣做出來** —— 因為負面案例測的是「pre-doc 還 active」，
真實誤擋情境是「**已 closed 但還沒 merge**」。**方向對了，狀態錯了。**

## Calibration

`docs / audit / template` **第 1 個資料點**：bottom-up 6.5 hr → committed 2.6 hr（0.40）
→ actual **≈1.6 hr**，ratio **0.62 UNDER**。⛔ 分子含**計畫外工作**（上述兩個發現），扣掉約 **0.51**。

⭐ 真訊號在另一欄：`actual/bottom-up` = **0.25**，與 W22 的 **0.26** 連成兩點，
而 matrix 表頭自己寫著「低於 0.4 代表**估算方式**有系統性問題」。
兩個 class 不同、性質不同 ⇒ 不是 class 特性 → `AD-BottomUpEstimateInflated-1`。

## 關閉 / 新增

**關閉 4**：`AD-LocalPasswordFallback-1` 🔴 **P0（本專案第一個被關掉的 P0，卡兩個 phase）** ·
`AD-StalePrPendingNoDetector-1` · `AD-30` · `AD-43`（後兩者住 `STATUS_AUDIT.md`）

**新增 6**：`AD-GateGreenDecaysAfterFix-1` 🟡 · `AD-BottomUpEstimateInflated-1` 🟡 ·
`AD-E5BlindToStandaloneCh-1` 🟡 · `AD-DecisionTableSaysUndecided-1` 🟡 ·
`AD-GateMessagePointsAtWrongCause-1` 🟢 · `AD-ProfileChangePasswordNoFuture-1` 🟢

**BACKLOG**: 173 → **177**（P0 **6 → 5**）

## Gate

format / lint / type clean ×2 · api **484 / 40 suites** ·
web `Test Files 10 (10)` / `Tests 95 (95)` · build `✓ 25/25` ·
⚠️ **final gate 的第一次 web 跑重現了 `Test Files 1 passed (1)`（單獨跑！）** —— 推翻了 Day-0 的「合併跑才會」歸因；連跑 5 次得 1 部分 / 4 完整。⇒ 有效緩解是**把檔數當斷言**（必須看到 `Test Files 10`），不是「單獨跑」 ·
`run_all` **9/9** · detector 測試 **4 檔 63 tests** · `check_status_markers` **2.6 s**

⛔ **`gate-only verified`** —— 零 user-facing surface，沒有車可以開。
取代 drive-through 的是 9 個情境的負面驗證，**預測先 commit**（`ac9c20c`）再執行，7/9 逐項相符。

## 檔案變更

| 類別 | 檔案 |
|---|---|
| NEW | `docs/14-adr/0015-identity-provider-and-local-break-glass.md` · `CH-043-*.md` · `scripts/lint/tests/test_status_markers.py` · `scripts/lint/__fixtures__/stale-pr-pending/`（5 檔）· 本 phase 四件套 |
| EDIT（ADR 取代連帶）| `0007`（**只改 Status 一行**）· `14-adr/README.md` · `page-inventory.md` · `decision-form.md` · `15-design-alignment.md` · `architecture.md` · `.env.example` |
| EDIT（治理）| `check_status_markers.py`（+E5 +landed gate）· 四個 closeout 落點 |
| EDIT（10 個 stale marker）| `CH-005/006/007/016/017/032/041/042` · `0005-governed-extension-storage.md` · `memory/project_w13_*.md` |
| UNTOUCHED | `apps/**` —— 產品 code 零變更 |
