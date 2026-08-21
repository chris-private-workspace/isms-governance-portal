# ADR-0002: Wave 1 lifecycles are a declared transition table in application code, not a workflow engine

**Date**: 2026-08-21
**Status**: **已採納**
**Deciders**: 使用者（2026-08-21，W25 spike 量測結果呈報後拍板）
**Phase**: W25

---

## Context

`07-wave1-build-plan.md:36` 把 M5 定義為「drives the policy approval flow」，而 OQ-7
（「精簡狀態機到什麼程度就不夠了」）**擋著 M5 開始**。這份 ADR 之前是 9 份基礎 ADR 裡
唯一標記「待 spike」的 —— 因為它不能靠讀文件回答。

W25 是那個 spike：**兩個候選都真的建出來**，跑同一條 Policy 生命週期
（`02a-data-model-spec.md:362-370` 的 7 條實邊），量同一組指標。

約束：單人開發 · Wave 1 只有兩條流程（policy、issue→action）· 平台自身受 ISO 27001
約束（guardrail 1）· 稽核軌跡不可被繞過（guardrail 5）· 實體範疇隔離優先在資料庫層（約束 8）。

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A 自建宣告式轉換表** | 表由 Prisma enum 窮舉綁定 ⇒ schema 漂移是**編譯錯誤**；零相依；守衛是無 I/O 的純函式 | 沒有階層 / 平行 / 視覺化工具；每個新能力都要自己寫 | 46 code 行 |
| **B 嵌入 statechart 函式庫**（XState 5.32.5）| 真正的 statechart 語義；未來需要階層 / 平行時已經在手上 | `states` 與 enum **零型別連結**；`allowedTargets` 是 O(states) 反推；模型是事件驅動而領域 API 是目標驅動 | ≈47 code 行 + 1 套件 |
| **C 外部 BPM engine** | 完整流程能力、可視化編輯 | 部署面積、稽核軌跡要跨系統接、與約束 8 的資料庫層隔離衝突 | 未量測 —— **`DEFERRED_REGISTER` D004 已 defer**，本片只在紙上評估 |

> 選項 B 刻意選 XState 而非 1KB 的 FSM 函式庫：五條邊界判準說我們**不需要**階層 / 平行 /
> 執行期動態子流程，而 XState 正好全都有。**候選必須是「某條判準破掉時你真的會去拿的東西」**，
> 否則比較出來的只是語法差異。

---

## Decision

**選 A。**

因為在**我們的**處境下，唯一把兩個候選分出高下的維度是
**「資料庫 schema 與流程定義有沒有被綁在一起」**，而 A 由型別系統免費提供、B 沒有。
其餘四個維度全部打平或差距接近雜訊。

實測（`W25-oq7-workflow-spike/progress.md` §2.8-2.9）：

| 維度 | A | B | 分出高下？ |
|---|---|---|---|
| 定義行數 | 46 | ≈47 | ❌ 打平 |
| **加/刪一個狀態時誰擋下** | **型別系統，雙向** | **零連結（E2 type-check 完全通過）** | ⭐ **A** |
| 錯誤訊息品質 | 查表 | O(states) 反推 | A 略勝 |
| 與稽核鉤子的接合 | — | 零額外接線 | ❌ **無訊號** |
| 相依成本 | 0 | +1 套件（0 遞移 · 0 advisory · MIT）| A 略勝（近雜訊）|

⭐ **「無訊號」本身是結論**：W25 Day 1 發現的兩個限制（稽核 `before` 恆 NULL、
create 與 update 的 `resource_id` 不同）**不是狀態機造成的** ——
它們來自 `runScoped` 的交易模型與 `resolveEntity` 的歸因規則，**換誰來都一樣**。
⇒ 換引擎買不到任何東西。

### 否決其他選項的理由

- **B（XState）** — 不是因為它差，是因為**它在本片量到的所有維度上都沒有買到東西**，
  卻要付一個具體代價：`states` 是自由字串，與 `PolicyStatus` 無型別關係。
  實測 E2（從機器裡刪掉 `retired` 狀態）⇒ **`tsc` 完全沉默**，只有手寫的 runtime 測試抓到。
  ⚠️ E1（加一個 enum 沒有的狀態）看似也被擋下，但擋下它的是 spike 中**手寫的
  `PolicyEvent = TO_${Uppercase<PolicyStatus>}`**，不是 XState —— 改用慣用的業務動詞
  命名事件（`SUBMIT`/`APPROVE`）後那個連結**完全消失**。
- **C（BPM engine）** — 沒有任何一條 Wave 1 流程需要它能提供而 A 不能提供的東西
  （見下方五條判準）。在需求出現之前引入 = AP-5。**D004 維持 defer**，解封條件改寫見該登記冊。

---

## Consequences

### 我們接受了什麼

- 沒有流程視覺化工具、沒有現成的階層 / 平行 / 補償語義。要就自己寫。
- 流程定義是**編譯期**的 —— 改一條邊需要一次部署，沒有執行期設定路徑。
- 每加一條 Wave 1 流程（issue→action、風險生命週期）都要重複同一個模式；
  第二條出現時才是判斷該不該抽象的時機，**不是現在**（AP-5）。

### 這個決定約束了什麼

1. **轉換的合法性必須是純 predicate**（無 I/O），住在 `workflow` 範疇。
2. ⛔ **並行控制不是 guard 的一部分，也不可能是** —— 它必須與寫入同一個 statement
   （compare-and-set，把觀察到的狀態放進 `where`）。
   `runScoped` 一次呼叫 = 一個交易，read-then-write 是兩個交易，中間有 TOCTOU 窗。
   **不遵守這條會得到一個看起來對、且會通過所有測試的實作。**
3. 轉換表必須以**窮舉 `Record<PrismaEnum, …>`** 形式綁定 schema —— 那正是選 A 的理由，
   換成 pair list 就把這個好處丟掉了。
4. `core-model` 不得知道生命週期（矩陣不允許它 import `workflow`）。守衛套在 `modules` 層。

### 可證偽條件 ⭐

**下列任何一項被觀察到，這份 ADR 必須重開：**

1. ⛔ **任何一個 OpCo 需要與集團標準不同的政策簽核流程**
   （= 五條判準的第 4 條被推翻）。本 spike **完全沒有驗證這一條** ——
   它是產品問題不是工程問題，已列入 `decision-form.md` 待 stakeholder 回答。
   **若答案是「需要」，A 與 B 都不夠**，要重新評估含 C 在內的全部選項。
2. ⛔ **SLA timer 或升級進入實作**（`05-platform-foundation-services.md:16` 說它們在 Wave 1 射程）。
   一個與主流程並行倒數的 SLA **實質上就是一個平行區域** ⇒ 判準 2 被推翻。
3. 出現**第三條**需要相同模式的 Wave 1 流程，且三份轉換表出現實質重複
   ⇒ 該抽象了（但那是重構，不必然推翻本 ADR）。
4. 流程定義需要在**執行期**變更（來自 DB / 設定檔 / API）⇒ 判準 1 的前提消失。

### Rollback

- **怎麼回滾**：`npm install --save-exact -w apps/api xstate@5.32.5`，
  把 `workflow/transitions.ts` + `transition.guard.ts` 換成 statechart 定義，
  並把 `policy.controller.ts` 的**一行 import** 指過去。
- **估計成本**：**< 1 天**，而且這不是估的 —— W25 Day 2 **真的做過這個替換**並跑完整套件
  （unit 512/42 + int 280/22 全綠，只改一行 import）。
- **回滾窗口**：無硬期限。守衛的簽名 `(from, to) => void` 是兩個候選共用的介面，
  只要它不變，換實作就一直是一行 import 的事。

---

## 相關

- **相關 design note**: `docs/02-architecture/design-notes/W25-workflow-state-machine.md`
- **實作**: W25 · `CH-047` · `apps/api/src/workflow/`
- **關掉的 open question**: `docs/decision-form.md` OQ-7
- **維持 defer**: `docs/01-planning/DEFERRED_REGISTER.md` D004（BPM engine）
- **未回答且會推翻本 ADR 的問題**: `decision-form.md` OQ-9（per-OpCo 簽核流程）
