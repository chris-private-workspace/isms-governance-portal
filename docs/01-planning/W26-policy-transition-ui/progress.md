# Phase W26 Progress

## 2026-08-21 — Day 0：Plan-vs-Repo Verify（三-prong）

### Prong 1 — path verify：**20 / 20 如預期**

| 期望 | 數量 | 結果 |
|---|---|---|
| NEW（應不存在）| 4 | `progress.md` · `retrospective.md` · `client.test.ts` · `CH-048-*.md` —— **全部 ABSENT** ✅ |
| EDIT / UNTOUCHED（應存在）| 16 | **全部 EXIST** ✅ |

`CH-048` 未被佔用（`changes/` 最大號為 `CH-047`）。

### Prong 2 — content verify：**8 條，其中 3 條改變 plan**

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | `client.ts` 全檔 export **恰好三個**：`ScopedResponse<T>`（interface）· `ApiUnavailableError`（class）· `get<T>`（**唯一的函式**，`:76`）。**零個寫入動詞** | plan §7 的 greenfield 判定**成立** —— calibration class 維持 `greenfield-feature` **0.55**，§7 不改 | ✅ 確認 |
| **D2** ⭐ | `transitions.ts` **已經 export 了 plan 打算現寫的東西**：`allowedTargets(from)`（`:97-99`）· `canTransition`（`:92`）· `POLICY_TRANSITION_EDGES`（`:86`，**導出而非手寫**）· `isTerminal`（`:102`）| plan §3.2 寫「值 = `POLICY_TRANSITIONS[row.status]`」—— 正典呼叫是 **`allowedTargets(row.status)`**。⇒ API 工作**變少**，且用既有函式而非重新導出 | 🟢 縮小範圍 |
| **D3** ⭐⭐ | `transitions.ts:70` 記錄 **02a:365 把 `in_review → draft` 這條邊命名為 "changes requested"**。而 plan §3.4 我自己發明了「Return to draft / 退回草稿」 | ⛔ **違反已確認參數 #9**（工作流**照來源文件**，不得自行發明）。動詞應為 **"Request changes" / 要求修改** | 🔴 需改 plan |
| **D4** ⭐⭐ | `shell.inert` 的射程遠大於 plan 所述：**24 個 call site 跨 13 個檔**（plan 只提到 `risks/[id]`）。字串逐字是「This port has **no backend** that can perform it」 | ⛔ **本片會讓它在 `/policies` 上當場自相矛盾** —— `New policy` 將與**可用的動詞按鈕並列**，同一畫面宣稱「沒有後端」。這不再是 under-report，是**本片造成的**矛盾 | 🔴 需使用者裁決（plan §3.x 明文排除動它）|
| **D5** | `policies/page.tsx:425-432` 的註解逐字寫「**there is no action here to disable**」，而本片正是要在該列加動作 | AP-7 orphan claim —— 本片造成。註解也算 code，必須一起改 | 🟡 小調整 |
| **D6** | i18n parity 的原始碼掃描 regex 是 `/\bt\(\s*[A-Za-z0-9_.]+\s*,\s*'([^']+)'\s*\)/g`（`i18n.test.ts:143`）—— **只匹配單引號字面量** | plan §8 R8 成立：動詞 key 用模板拼裝會**空過** parity ⇒ 必須用字面量對照表 | ✅ 確認 |
| **D7** | dev DB 有 **12 筆 live policy，六個狀態全部有代表**（`in_review` 3 · `published` 3 · `approved` 2 · `under_revision` 2 · `draft` 1 · **`retired` 1**），其中 10 筆是 `DEMO SEED` | ⭐ drive-through 能走**完整的按鈕矩陣**，含 AC-4 的「`retired` 列零個按鈕」 | ✅ 確認 |
| **D8** | `<tr>` (`page.tsx:433`) 只有 `borderBottom` 樣式，**無 `onClick`、無父層 handler** | 新按鈕可在不可點的列裡單獨接收點擊，無事件衝突 | ✅ 確認 |

#### 七條邊 —— **由表導出，不手數**

`POLICY_TRANSITIONS`（`transitions.ts:68-76`）逐鍵展開：

```
draft          → in_review                    (1)
in_review      → approved, draft              (2, 3)
approved       → published                    (4)
published      → under_revision, retired      (5, 6)
under_revision → in_review                    (7)
retired        → []                           (0)
```

**= 7 條。** ⛔ W25 Day 0 曾把同一張圖數成 8 條（把兩個 pseudostate 算了進去）——
這次由 `POLICY_TRANSITION_EDGES` 的定義導出，沒有手寫計數器。

**六個動詞覆蓋七條邊**的宣稱成立：`→in_review` 有兩個來源（`draft` 與 `under_revision`），共用同一個動詞。

### Prong 2.5 — child component tree：**乾淨**

`policies/page.tsx` 的 import 只有 6 條，其中元件 **3 個**：`DemoBadge` · `IconSearch` · `NoSource`。
其餘是 `useShell`（shell 狀態）· `TranslationKey`（型別）· `listPolicies`/`PolicyRow`（api）· `tok`/`Rating`（lib）。

⭐ **沒有狀態徽章元件** —— 確認徽章是 inline JSX（`:479-500`），所以 plan §3.4 的「就地更新徽章」寫法成立。
三個被 import 的元件都不在寫入路徑上 ⇒ **無子元件年代漂移**。

### Prong 3 — schema verify：**N/A**

本片零 DB 變更。`allowed` 是 `POLICY_TRANSITIONS` 的**導出值**，不是欄位、不是新表、無 migration。

### D-baselines（逐項實跑，不採信 plan 抄來的數字）

| Gate | 值 |
|---|---|
| `run_all.py` | **11 / 11**，exit 0 |
| web test | **104 passed / 11 files**，exit 0 |
| api unit | **507 / 41**（於同一份 code tree 實測；`main` 自那次起只多了 docs commit）|
| api int | **280 / 22**（兩個環境各驗一次 —— 本機預設與 `DEV_PRINCIPAL_ENTITIES=HK1`）|
| format · lint · type | **0 · 0 · 0** |
| build | EXIT 0 |

### Go / no-go：**≤ 20% ⇒ 繼續 Day 1**（但 D4 需使用者裁決）

- **D2 縮小範圍**（`allowedTargets()` 已存在，不必重寫導出邏輯）
- **D3 是一行命名修正** + 對應的兩個 i18n 值
- **D5 是一段註解**
- **D4 是唯一可能移動範圍的** —— 而它**與 plan §3.x 的明文排除衝突**，所以不自行決定

⛔ 依 `day0-plan-verify.md` §記錄 drift findings 的鐵律：
**不默默改 plan §Technical Spec** —— D3 / D4 / D5 加進 §Risks，保留「原本計畫什麼 vs 現實逼你改成什麼」的軌跡。

---

## 2026-08-21 — Day 1：設計權威 + API 的 `allowed`

### 1.0 D4 已裁決：**最小修**

使用者選定：只給 `/policies` 的 `New policy` 一個自己的 key，**不動其餘 23 個 call site**。
⇒ plan §3.x 的「❌ 拆 `shell.inert` key」**部分推翻**，理由是**本片製造了那個矛盾** ——
你只修自己弄壞的那一處。存量 23 處仍歸 `AD-SharedInertProseInaccurate-1`。記入 plan §8 R12。

### 1.1 設計偏離已寫入 `15-design-alignment.md`

⭐ **plan 猜錯了放置位置。** plan §3.1 說寫進「§7 加一列」，但讀過該文件後：
**§4「Where the design simplifies domain logic — the procedures win」才是 CLAUDE.md 指向的那一節**
（「保真度的例外由 `15-design-alignment.md` 單一來源管理」）。§7 是 *Actions arising*，是待辦清單。

⇒ 實際做法是**兩處**，各司其職：

| 位置 | 放什麼 |
|---|---|
| **§4.1**（新增子節）| 完整裁決：量測結果、ruling、命名射程、兩條既有規則的裁定 |
| **§7 第 11 列** | 一行 `✅ Decided` 指標，照該表 row 1/3/4/10 已有的形狀 |

⛔ **既有行零變更** —— 只加。文件自身慣例是「章節前言 + 編號子節」（§3 / §5 皆然），§4.1 照此。

#### ⭐ 一個 Day 0 沒抓到、寫的時候才發現的射程收窄

D3 說「動詞要照來源文件」。但實際讀 `02a:358-372` 後：

**那張 mermaid 圖只標了一條邊** —— `InReview --> Draft: changes requested`（`02a:365`）。
其餘**六條邊全部無標籤**。

⇒ D3 的射程比它自己說的**窄**：只有一個動詞是「轉寫」，其餘五個**來源文件根本沒給名字**，
它們是**目標狀態名的轉寫**（`Approved` → "Approve"）而不是憑空發明。

這個區別已寫進 §4.1，並附一句：**若公司程序日後為這些轉換命名，以它的用語取代**。
不寫這一句的話，下一個讀的人會以為六個動詞都有來源背書。

### 1.2 API 附加 `allowed`

- `withAllowed()` 私有 helper，值取自**既有的** `allowedTargets()`（Day-0 D2 —— 不重寫導出邏輯）
- 套用於 **`list()` · `byId()` · `transition()`** 三處

⭐ **`transition()` 那一處是 plan §3.2 沒寫、但 AC-5 蘊含的**：
plan 只說 `list()` 與 `byId()`。可是 AC-5 要求「以回應的 `data` 就地取代該列」——
若轉換回應不帶新的 `allowed`，畫面會在狀態已經正確的情況下**繼續提供舊狀態的動作**，
而且看起來完全正常。已補，並寫成一條測試。

#### 中性化 —— **預測寫在執行之前，兩次都精確命中**

| | 動作 | 預測 | 實測 |
|---|---|---|---|
| **N1** | `transition()` 改回傳 `withAllowed(current)`（**舊**狀態）| 恰好 **1 紅**，且是 `⭐ a transition answers with the NEW state edges` | ✅ **1 failed / 16 passed**，`●` 逐字為該條 |
| **N2** | `withAllowed` 直接 `return row` | **4 紅**（四條新測試全滅）| ✅ **4 failed / 13 passed**，四條逐字命中 |

⭐ N1 的價值：它證明那條測試**真的在測「新舊之分」**而不只是「有沒有 `allowed` 欄位」。
⛔ 我先只看到「1 紅」就想收工 —— 但**「1 紅」不等於「紅的是那一條」**，所以回頭抓了 `●` 的逐字名稱。

---

# Phase W26 Progress — 2026-08-21（Day 2）

## Today's Accomplishments

**Day 2 全部完成**：前端寫入半邊 + 動詞按鈕 + i18n + D4/D5 兩個 Day-0 發現的順手修正。

### 2.1 `client.ts` — 本 app 的第一個寫入動詞

| 加了什麼 | 為什麼是這個形狀 |
|---|---|
| `ApiRefusedError` | 寫入有第三種失敗：伺服器**看懂了、做得到、而拒絕**。把它併進 `ApiUnavailableError` 等於把一個治理決定歸檔成故障，畫面於是對著一個蓄意的拒絕說「請確認 API 是否在執行」 |
| `patch<T>` | 422→refusal · 404→`null` · 其餘非 ok→outage · 網路失敗→outage |

⭐ **刻意不與 `get()` 共用**。兩者重疊約 5 行 fetch boilerplate，差別在關鍵處：
**422 在寫入路徑有意義、在讀取路徑沒有**。合併之後只會多出一個「為了讓合併成立而存在」的
method 分支 —— 那是共用本身製造的複雜度，不是被消除的複雜度。
（同理不動 `get()` 的 422 行為：那會波及 `risks.ts` 與既有測試，是本片沒有預期的爆炸半徑。）

⭐ **`client.test.ts` 的第七條是讓前六條有意義的那一條**。前六條驗證的全是狀態碼映射，
而 mock 不管被問什麼都照答 ⇒ **`patch` 改送 GET 且不帶 body，前六條全部照樣綠**。
`sends a PATCH carrying the body as JSON` 是唯一把這個檔綁回它自己名字的斷言。

### 2.2 / 2.3 頁面、型別與字典

- `PolicyRow.allowed` **必填非選填** —— `retired` 的 `[]` 是「後面沒有了」這個**主張**，
  與「這個欄位不存在」不是同一件事，型別上不可讓它退化成後者
- 動詞按鈕放**最後一欄**（新 key `policies.col.actions`）。⭐ 刻意不插在 status 欄旁：
  既有測試用 `td:nth-child(5)` 取狀態徽章，插在中間會**靜靜地讓那條斷言改測別的東西**
- `pending` 存的是 **row id 不是 boolean** ⇒「送出中只鎖那一列」是型別的結果，不是額外邏輯
- 成功時**整列由回應取代**，不是 patch 一個 `status` 欄位

### ⭐ 兩個 Day-0 發現的順手修正（D4 / D5）—— 都是「本片讓一句既有的真話變成假話」

| | 原文 | 本片讓它怎麼變假 | 修法 |
|---|---|---|---|
| **D4** | `shell.inert`：「This port has **no backend** that can perform it」 | `/policies` 從今天起**有**可寫入的後端 —— 同一頁上這句話與下面的按鈕自相矛盾 | 新 key `policies.new.inert`：缺的是**路由**不是**伺服器**。**其餘 23 個 call site 不動**（它們說的仍是真話） |
| **D5** | `page.tsx` 列註解：「there is no action here to disable」 | 這一列現在**有**動作，就在最後一格 | 收窄成「**列級導覽**動作仍不存在，所以 `<tr>` 沒有 cursor 也沒有 hover，而它裡面的按鈕有」 |

⭐ 這兩條的共同形狀：**AP-7 的 orphan claim 不是靠改壞舊 code 產生的，是靠新增正確的 code 產生的。**
沒有任何 lint 會紅 —— 註解與文案不參與型別檢查。

## §2.y 治理陳述檢查 —— **16 條逐條唸，2 條沒通過**

⛔ **兩條都是 gate 全綠、測試全綠，而陳述本身是假的。**

1. **`transition.unreachable` 原文「Nothing was changed.」** —— 假。網路錯誤可能發生在請求
   **送達之後**（伺服器已寫入、回應遺失），5xx 同理。
   ⇒ 改成「無法從這裡判斷變更是否送達，請重新載入確認伺服器上的實際狀態」。
   ⭐ 相較之下 `refused` 與 `gone` 說「沒有變更」**是真的** ——
   guard 在 write 之前（`policy.controller.ts:161-166`），compare-and-set 落空也沒寫入。
   **同一句話在三個分支裡有兩個真一個假**，這正是為什麼要逐條唸而不是整批判斷。

2. **按鈕本身暗示了權限** —— 檔頭確實寫了「不是權限過濾的」，但**檔頭使用者看不到**，
   而被誤導的正是使用者：一排治理動詞按每一條 UI 慣例都讀成「你被允許做這些」。
   ⇒ 新增 `policies.actions.noRoleCheck` **渲染在畫面上**。
   與 §4.1:121「deliberately not faked」一致 —— 不假裝有閘，也不假裝沒有這件事。

## ⭐ 訂正 plan §8 R8 的理由（結論不變，理由是錯的）

R8 說「用字面量對照表，因為 `i18n.test.ts:143` 的掃描只看得見字面量」。

實際讀 `:143`：`/\bt\(\s*[A-Za-z0-9_.]+\s*,\s*'([^']+)'\s*\)/g` ——
它匹配的是 **`t(locale, 'key')` 這個呼叫形狀**，不是任意字面量。
⇒ 對照表裡的 `'policies.action.approve'` **同樣掃不到**。
既有的 `STATUS` 六個狀態 key 也一直掃不到，而**那從來沒讓任何東西變紅**。

真正擋住錯 key 的是 **TypeScript**：`TranslationKey = keyof typeof zhHant`，寫錯即編譯失敗；
模板拼裝要 `as TranslationKey`，而**那個 cast 正是會抓到它的檢查**。

⇒ **照做，理由換掉。** 這是「證據要真的支持結論」的直接應用 ——
R8 拿一個**看起來有機械守衛**的理由，去支持一個其實由型別系統支持的結論。

## 中性化（Day 2）—— 預測寫在執行之前，兩次逐條命中

| | 動作 | 預測 | 實測 |
|---|---|---|---|
| **N1** | `advance()` 忽略 `to`，永遠送 `policy.allowed[0]` | 恰好 **1 紅**：`sends the target its own button names` | ✅ **1 failed / 119 passed**，`×` 逐字為該條 |
| **N2** | 成功時只更新 `status`，不取代整列 | 恰好 **1 紅**：`swaps the badge AND the verbs` | ✅ **1 failed / 119 passed**，`×` 逐字為該條 |

⭐ **N1 的必要性**：其餘每一條測試都點**第一顆**按鈕 ⇒ 忽略參數的實作會讓它們**全部照樣綠**。
沒有這條，「按鈕送出它自己宣告的目標」從未被驗證過。
⭐ **N2 危險在它只壞一半**：徽章更新正確，只有動詞停在**上一個狀態**的清單 ——
而那些動詞一秒之前確實是對的，畫面看起來完全正常。

## Gate（**本機**，2026-08-21）

format web/api **0** · lint web/api **0** · type web/api **0** ·
api unit **511 / 41** · api int **280 / 22** exit 0（228.9 s）·
web **120 / 12**（baseline 104 / 11 ⇒ **+16 測試 / +1 檔**）·
build web **clean**（29 route）· build api **clean** · `run_all` **11/11**

⛔ **全部是本機。CI 未跑** —— Day 3 §3.3 的存在理由（`AD-VerificationEnvironmentIsAnAxis-1`）。

### int 這次全綠，但 `AD-IntSuiteNonDeterministic-1` **不解封**

280/22 exit 0，且**這次用 `Tee-Object` 完整保留輸出**（Day 1 用窄 pattern 過濾掉了
`Expected/Received`，那是 `AD-FilteredAwayFailureEvidence-1`）。
⚠️ 全綠時 Jest 本來就只印 4 行 summary ⇒ **這次的完整輸出裡沒有失敗證據可看**。
解封條件仍是原文：**下次它再紅時完整保留輸出**再判。方法已就位，事件還沒發生。

## Remaining for Next Day

**Day 3 drive-through**（真 UI + 真後端 + 真服務）。
⚠️ 預期流程**必須寫在觀察之前**，且 §3.2 明訂不可用截圖判斷 disabled 狀態（W25 誤判過一顆）。

## Notes

- ⭐ **不派 subagent，理由是形狀不是規模**：Day 2 是一條垂直切片，
  `ApiRefusedError` 的欄位名直接決定 `page.tsx` 怎麼呈現 422。拆給兩個 agent 會各自**猜**這個介面。
  i18n 那 8 個 key 看起來最像可並行的獨立單元，卻**最不該外包** ——
  動詞命名的權威是 `15:116` 的射程收窄，轉述那段脈絡的成本已超過自己寫，
  而 `feedback-delegation-conflict-reporting` 記著的正是「agent 安靜地消化掉衝突」這個失敗模式。
  該 fan-out 的是**成品的多角度 review**（彼此獨立、不需猜介面）。

#### 一個我自己植入又拆掉的恆真陷阱

第一版的 `attaches the legal next states to every listed row` 寫成：

```ts
expect(listed.data).toHaveLength(POLICY_STATUSES.length);
for (const row of listed.data) { expect(row.allowed).toEqual(allowedTargets(row.status)); }
```

**若 `POLICY_STATUSES` 為空**，迴圈跑零次、`toHaveLength(0)` 也成立 ⇒ **整條測試恆真**。
已補 `expect(POLICY_STATUSES.length).toBeGreaterThan(0)` —— 與 `i18n.test.ts:149` 同一招。

### 1.x Day 1 partial gate

format **0** · lint **0** · type **0** · api unit **511 / 41**（baseline 507 → **+4**）

### 1.y ⛔ int 完整跑紅了 3 條，重跑全綠 —— 以及我弄丟的證據

加 `allowed` 之後第一次跑完整 int：**3 failed / 277 passed**，散在兩個套件。

| 執行 | 結果 |
|---|---|
| 完整 int（第一次）| **3 failed / 277 passed** |
| `bench.int` 單獨（**同一份 code**）| **3 passed**（263 s）|
| `policy.int` 單獨（**同一份 code**）| **15 passed** |
| 完整 int（重跑，**同一份 code**）| **280 / 280，exit 0**（253.5 s）|

⇒ 同一份 code 完整跑一次紅一次綠 ⇒ **不是本片弄壞的**。單獨跑全綠也**排除了形狀類斷言**
（若加欄位破壞回應形狀，單獨跑一樣會紅）。

#### ⛔ 我把診斷所需的證據自己過濾掉了

第一次跑時輸出接的是 `Select-String -Pattern "●|Tests:|Test Suites:"` ——
那條 pattern **只留測試名稱，把 `Expected/Received` 全丟了**。
於是我手上只有「哪三條紅」，沒有「為什麼紅」，只能靠重跑來回答本來一次就能回答的問題。

⇒ **失敗輸出不要用窄 pattern 過濾。** 這與 `AD-NarrowPatternWideClaim-1` 同族，
但形狀不同：那條是「用窄 pattern 下寬結論」，這條是**用窄 pattern 銷毀證據**。
⇒ `AD-FilteredAwayFailureEvidence-1`

#### 關於原因，我只能講到這裡

讀 `bench.int.spec.ts` 的斷言：**沒有一條是時間門檻** ——
全是 `auditRowCount()` 差值（`:212,217`）· `triggerExists()` 真假（`:220,230,237,314,322,330`）·
`n` 計數（`:267,351,352`）· `toHaveLength`（`:377`）· `intact === true`（`:382,406`）。
所以「benchmark 太慢」這個直覺是**錯的**。

三條紅的共同形狀是**共用 DB 上的並發**：bench 會在 try/finally 裡**暫時拔掉 DB trigger** 再還原，
並跑 8 個並發 writer；第三條是 `issues forty contending reference codes with no collision`。

⚠️ **但這是假說不是結論** —— 我沒看到斷言訊息（見上）。⇒ `AD-IntSuiteNonDeterministic-1`，
解封條件寫成可觀察的：**下次它再紅時，完整保留輸出**再判。

#### 一個順帶被推翻的認知

先前兩次完整 int 是 **121 s / 167 s**，而 `bench.int` 單獨就要 **263 s**，
我當時據此推論「那兩次不可能跑完 bench」。這次完整跑 **253.5 s** ——
與 bench 單獨同量級 ⇒ **121/167 那兩次才是異常值**，我的推論方向是反的。
⚠️ 記下來是因為：那個推論**聽起來很合理**，而它建立在「兩個數字不相容」這種看似硬的證據上。
