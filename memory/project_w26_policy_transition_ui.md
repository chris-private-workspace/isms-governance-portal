# W26 — 政策狀態推進的 UI 入口

**Closed**: 2026-08-21 · **Change record**: `CH-048`
**PR**: **MERGED (#100, `1743be8`)** ＋ closeout **#101**
⚠️ **兩個 PR，而且不是計畫的** —— #100 在我報告 CI 綠之後被 merge（`09:32:05Z`，merge 的是 Day 3
的 `8a405b0`，squash 成 `1743be8`），遠端分支隨之自動刪除。⇒ Day 4 的 closeout **不在 #100 裡**。
⭐ 發現它的方式值得記：我以為自己在「push 到 PR #100」，而 `git push` 回的是 **`* [new branch]`** ——
一個已 push 過的分支不該這樣回答。**是那個異常的字串觸發查證，不是任何 gate。**
**Retro**: `docs/01-planning/W26-policy-transition-ui/retrospective.md`（權威）

---

## 一句話

W25 建了 `PATCH /policies/:id/status` 並驗過，而 `/policies` 上沒有任何控件會呼叫它。
本片建出那個控件，關掉 `AD-PolicyTransitionNoUiEntry-1`。

## 根因不是「還沒做」

設計交付物把 policy 模型成**受控文件**（下載、開啟、讀版本歷史），
`02a` §4 模型成**七條邊的生命週期**。兩者都對，交付物**從未畫第二個**。

⇒ **約束 6 的「不對齊就 STOP and ask」結構上不會觸發** ——
它預設的是「交付物**簡化**了領域邏輯」，這裡是「交付物**完全沒說**」。
沒有可對齊的對象，就沒有東西會觸發那個 stop。

裁決寫在 `15-design-alignment.md` **§4.1**（plan 猜的是 §7 —— §4「the procedures win」
才是 CLAUDE.md 指向的那節；§7 是 *Actions arising*）。

## 命名射程 —— 六個動詞只有一個有來源

`02a` §4 的 stateDiagram 只標了**七條邊中的一條**（`:365` `InReview --> Draft: changes requested`）。
⇒ 只有 `Request changes` 是程序用語的轉寫，其餘五個是**目標狀態名**的轉寫
（`Approved` → "Approve"）。這是對已確認參數 #9 的**弱主張**，
寫進 `ACTION` 的 code 註解而不只寫在設計文件裡 —— 讀 code 的人不會去翻 `15`。

## 本片最重要的產出：一份已採納 ADR 的可證偽條件過期了

`ADR-0003:154` **FC3**：「Any requirement needs the true prior state in `before`」，
現況欄 **`Not required by any built feature`（2026-08-14）**。

drive-through 後實查兩列：`before` = NULL、`actor_id` = NULL
⇒ **「誰、從哪個狀態核准的」兩個都答不出來**，而那是 approval flow 的兩個核心欄位。

⚠️ **`before` 為 NULL 不是 bug** —— `ADR-0003:118` 明文記錄它：`runScoped` 把**未啟動的**
promise 交給 `$transaction`，稽核列不能依賴寫入結果；唯一能取真實前後值的
`INSERT ... SELECT` 正是 `eslint.config.mjs:75-77` 禁止 `audit-trail` 做的事。

⛔ **刻意不自行宣告 FC3 觸發** —— ADR 說觸發時要「把稽核寫入移進 per-table trigger」，
那是重大架構變更。→ `AD-Adr0003Fc3Triggered-1`，待使用者裁定。

⭐ **抓到它的是 closeout 檢查表那一格手動複查，沒有任何機制會問起。**

## 文案逐條唸 16 條，2 條是假的 —— 而每項 gate 都綠

1. `transition.unreachable` 的「Nothing was changed」**不成立**：網路錯誤可能發生在請求
   **送達之後**。⭐ 同一句話對 `refused` / `gone` **是真的**（guard 在 write 之前、
   compare-and-set 落空都沒寫入）⇒ **必須逐條唸，不能整批判斷**。
   drive-through 時親眼看到修正後的版本 —— 若沒改，那格會印出假話而沒有 gate 會紅。
2. **按鈕本身暗示權限**。檔頭寫了「不是權限過濾的」，但**檔頭使用者看不到**
   ⇒ 新增畫面上的 `policies.actions.noRoleCheck`。

## 兩個 AP-7，都是「新增正確的 code 讓舊的真話變成假話」

| | 原文 | 怎麼變假 |
|---|---|---|
| D4 | `shell.inert`：「This port has **no backend** that can perform it」| `/policies` 從今天起有可寫入的後端 |
| D5 | 列註解：「there is no action here to disable」| 這一列現在有動作 |

⇒ 沒有任何 lint 會叫（註解與文案不參與型別檢查）。D4 只給 `/policies` 新 key，
**其餘 23 個 call site 不動**（它們說的仍是真話）。

## Drive-through 的方法（可複用）

- **「不重整」是量到的**：點第一顆按鈕前種 `window.__driveThrough.marker`，
  頁面若重整它會消失。五次互動後仍存活。
- **422 / 404 用 fetch 攔截只改請求、不碰回應** ⇒ 走真正的點擊路徑，
  回應是伺服器自己的判斷，**不是 mock**。unreachable 則真的 `Stop-Process`。
- ⚠️ **不要用截圖判斷 disabled**：`New policy` 在截圖上是飽和藍、看起來完全可按，
  DOM 是 `disabled / opacity 0.5 / not-allowed`。**同一視覺陷阱第 2 次**（W25 Day 3 反方向）。

## 中性化四次，預測全部寫在執行之前，四次逐條命中

Day 1 兩次（`transition()` 回舊狀態的 `allowed` · `withAllowed` 直接 return row）
Day 2 兩次（`advance()` 忽略 `to` · 成功時只更新 `status`）

⭐ **N1（忽略 `to`）不可省**：其餘每一條測試都點**第一顆**按鈕
⇒ 忽略參數的實作會讓它們**全部照樣綠**。

## ⛔⭐ 同一天三次同形：自製代理判斷去回答一個有專用工具的問題

| # | 我做了什麼 | 為什麼錯 | 專用工具 |
|---|---|---|---|
| 1 | 用 `Select-String -Pattern "●\|Tests:"` 接 int 輸出 | 把 `Expected/Received` 全丟了 ⇒ 只知道**哪三條**紅、不知道**為什麼** | 不過濾（`Tee-Object`）—— **成功的輸出可以過濾，失敗的不可以** |
| 2 | 用 `git diff HEAD..<branch>` 非空判定「不可刪」 | **它必然非空** —— 那 19 insertions 是被我改掉的**舊版本文字**（`CLAUDE.md` 裡舊的 `PR-pending`）。一個檔案被修改過，雙向 diff 本來就都非空 | **patch-id 比對** `git cherry`（實測 10 個 `-`、獨有 patch **0** ⇒ 才是安全的證據） |
| 3 | 自寫 CI 等待迴圈，條件是「輸出裡沒有 `pending`」 | 剛 push 後 check 未註冊時 `gh` 回 **`no checks reported`** —— 沒有 `pending` ⇒ 迴圈宣告 settle 並 **exit 0**。**把「零個 check」讀成「全部通過」** | `gh pr checks --watch`（它自己知道什麼叫 settle） |

⭐ **第 2 個特別難自己抓到**：它誤報的方向是**「不安全」**，
而**沒有人會回頭挑戰一個說「不安全」的檢查**。

⚠️ **第 3 個的規則我讀過** —— Monitor 的工具說明逐字寫著 *silence is not success* 與
「若這個 process 現在崩潰，我的 filter 會吐出東西嗎」。**讀過仍然犯。**
⇒ 這三條的價值不在「知道這個道理」，在於**動手前先問一句：這件事有沒有專用工具**。

## Calibration

`greenfield-feature` **0.55 → 0.45 re-point**（第 2 點 ratio **0.29 UNDER**，判準字面觸發）。

⛔ **論證刻意不依賴那個數字**：W22 是當日逐筆量測、W26 是事後由 commit 反推，
**不同量法**（`AD-CalibrationT0PlacementShift-1` 禁止跨量法算移動平均）。
改用區間：推估 actual 是**下限** ⇒ 即使翻倍到 5.5 hr，ratio 也只有 0.59，**仍 < 0.7**。

⚠️ 而「事後反推」本身是 **`AD-CalibrationNoTimeRecord-1` 的第 4 次**，
且比前三次更值得記：**W22 已經發明並驗證了解法**（checklist 每個 Day 一個具名計時 `[ ]`），
W26 復發的根因是**那個解法沒有進 frozen template**，只活在 W22 那一份實例裡。
⇒ 與 `AD-65` 同形：**已知的正確方法沒有被套用到第二個場合**。

⚠️ `actual/bottom-up` 五點 0.26 → 0.25 → 0.141 → 0.129 → **0.162**
⇒ **「四點單調下降」這個描述從今天起不成立**（`AD-BottomUpEstimateInflated-1` 升級時引用過它）。
該 AD 的論證不依賴單調性，但引用的證據描述失效了要記。

## 環境層的意外量測

**int 在 CI 快 9.5 倍**：280 條同一份 code，本機 **228.9 s** vs CI **24.057 s**。
`AD-IntSuiteNonDeterministic-1` 那三條偶發全是競爭類（8 個並發 writer、40 個競爭 ref code）
⇒ 慢 9.5 倍的機器競爭窗口大得多，**本機才是溫床**。
⚠️ 一個資料點不是結論；且反向的錯一樣要避免 —— **慢環境暴露的競爭條件是真的競爭條件**。

## Gate

本機 format/lint/type web+api **0** · api unit **511/41**（+4）· api int **280/22** ·
web **104 → 120**（+16 測試 / +1 檔）· build clean · `run_all` **11/11**
CI **6/6**，逐 step 查證涵蓋 Integration tests；**不涵蓋 drive-through**（CI 沒有瀏覽器）。

## 關 / 開

**關**：`AD-PolicyTransitionNoUiEntry-1` ✅
**開 6**：`AD-Adr0003Fc3Triggered-1` 🟡 · `AD-Adr0002VsDesignDoc-1` 🟡 ·
`AD-ProgressMetricsProseStale-1` · `AD-RoadmapStalePriorityCells-1`（同形第 3 次）·
`AD-RefusalChipsLowContrast-1` · `AD-FaviconMissing-1`
BACKLOG **211 → 216**（P0 **5** 不變 / P1 111 / P2 100）
