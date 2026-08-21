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
