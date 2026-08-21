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
