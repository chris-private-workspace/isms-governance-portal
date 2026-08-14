---
status: approved   # proposed | approved | active | done | cancelled —— 機器可讀的唯一權威
affects_components: []
---

# CH-027 — 讓 BACKLOG 的計數自己會叫

**Date**: 2026-08-13
**Phase**: 無 —— 獨立 Change（W10 已 `closed` 並 merged；W11 尚未開）
**Scope**: 工具鏈（`scripts/lint`）+ planning 文件 — **NO migration** · **NO 新依賴** · 不動 `apps/`
**Status**: 進行中（laitim2001 於 2026-08-14 核可 scope + acceptance；裁決「改獨立 CH」於 2026-08-13）
**PR**: TBD

---

## Problem

`AD-CountBeforeLastEdit-1`：**計數做在最後一次編輯之前，所以它必然是錯的。**

兩個實例，都已發生：

| # | 發生 | 後果 |
|---|---|---|
| 1 | W08 closeout 數 §Open 條數時**認真做了兩種數法對照**（得 75 與 77，並查明差額），然後**才加了第 6 條**而沒有重數 | 真值 **76**；**75** 進了 BACKLOG 開頭、W08 checklist、commit `74d8d56`、PR #47 描述 |
| 2 | 同一天，說明段落寫出了被計數的字面樣式 | 那段說明**自己被計進去 3 次**，總和多 3 而看起來像數錯 |

修法早已選定 —— 使用者 2026-08-13 裁決「**保留總數 + 機械導出**」（不選「乾脆不寫總數」）。
但**只完成了一半**：BACKLOG 開頭的數字改成「先跑指令再抄」，而**「抄」這個動作沒有被任何東西驗證**。

**今天的敞口**：BACKLOG:23 宣告 **91 條 —— P0 6 / P1 52 / P2 33**。這四個數字全是手抄的，
§Open 有 **117 列** 區間（`:82`–`:198`）沒有任何機械對照，而下一次 closeout 就會再動它們一次。

---

## Root Cause

**不是「忘了數」，是「數完又改了」。** 這比 `AD-EntityCountDerivation-1`（已關）更難察覺，
因為**過程看起來是嚴謹的**：有兩種數法、有差額分析、有寫下方法。

⭐ **而真正該記錄的是第二層根因：這條 AD 的落點已經失效兩次。**

`ROADMAP.md:81` 第 10 列寫著「**排 W09 Day 0**（不另開 CH）」，理由是複製 `check_entity_index.py`
的成功先例、不吃 `CH-017` 的每 phase 1 個治理配額。W09 沒做，W10 也沒做。

先例之所以成功，是因為 `check_entity_index.py` **是 W08 的 deliverable，進了 W08 的 checklist**，
所以有一個 `[ ]` 在盯著它。本條在 W09 / W10 **只存在於 ROADMAP 的一列**，
而 **ROADMAP 的列不是 checklist 的列** —— 沒有任何一份會被逐項勾選的清單提到它，
於是兩次 closeout 都沒有東西發現它沒被做。

> 這正是 `AD-5`（有解封條件的項目必須出現在一份**會被讀**的清單上）的又一個實例，
> 也是使用者 2026-08-13 改判「獨立 CH」的理由 —— **第三次排同樣的落點，大概率是同樣的結果**。
> 本 CH 因此推翻 `AD-CountBeforeLastEdit-1` 條目的「⚠️ 不要為此單開 CH」與 `ROADMAP` 第 10 列
> 的「不另開 CH」，兩處都在本 CH 收尾時更新，**理由寫在原處**而不是靜靜改掉。

---

## Solution

### 範圍決策（使用者 2026-08-13 裁決）

- **選了**：獨立 CH（本檔），佔用本輪的 1 個治理配額
- **放棄了**：第三次排進下一個 phase 的 Day 0
- **維持**：保留總數並機械導出（使用者先前裁決的 (a)），**不**改為「不寫總數」的 (b)

### 逐項變更

**1. `scripts/lint/check_backlog_counts.py`**（新）— 讀 BACKLOG 的兩邊並比對：
宣告側是開頭那一個 marker 的四個數字，真值側是 §Open 區段內逐列解析的結果。
不符即 exit 1，訊息同時印出兩邊的值與差額。
**為什麼不是「跑指令再抄」的加強版**（例如 pre-commit hook 提醒）：提醒仍然依賴人執行後續動作，
而本條的全部證據就是「紀律在最警覺的時候失效」。

**2. `scripts/lint/tests/test_backlog_counts.py`**（新）— 單元測試，
含**兩個方向**：正確的 fixture 必須 PASS、被改壞一個數字的 fixture 必須 FAIL。

**3. `scripts/lint/__fixtures__/backlog-count-drift/`**（新）— 負面 fixture，
形狀沿用 `__fixtures__/entity-index-drift/`。

**4. `scripts/lint/run_all.py`** — 註冊，`DETECTORS` **7 → 8**。

**5. `docs/01-planning/BACKLOG.md`** — 關閉 `AD-CountBeforeLastEdit-1`（移出 §Open、
在 §Shipped Pointer Index 加 1 行）；開頭的數法說明改為指向 detector。

**6. `docs/01-planning/ROADMAP.md`** — 第 10 列標 ✅ 並記錄落點改判的理由。

### ⭐ 關鍵設計細節

- **宣告行的定位是本 CH 最大的陷阱。** BACKLOG 開頭那一段是**歷史敘述**，
  裡面有「其前 86 條」「其前 80 條」「達 48 條」等大量同形數字。抓錯任何一個，
  detector 就會在一份完全正確的文件上 fail。
  → 只認一個明確的 marker，且**必須恰好匹配一次**：**0 次或 ≥2 次都是 FAIL**，不是靜默跳過。

- **無法解析的優先度儲存格必須 FAIL，不可跳過。** `AD-CountBeforeLastEdit-1` 的原始記載提到
  `AD-NegativeGate-1` 用過異格式的優先度標記。「跳過看不懂的」就是 `lint-detector-authoring.md`
  明載的**「detector 綠了，但它綠是因為它看不見」**。
  → ⛔ **實測推翻了那份記載的完整性**：異格式有 **3 列**不是 1 列（progress §E3）。

- **只解析 §Open 區段**（`## §Open Carryover ADs` 到下一個 `## `）。
  §Shipped Pointer Index 也含 AD 名稱，全檔 grep 會把它們算進去 —— 那正是實例 2 的形狀。

- **優先度逐列解析，不 grep。** 2026-08-13 實測：用 grep 數優先度標記回 `0 / 0 / 0`
  （真值 5 / 48 / 26），emoji 在該 pipeline 下不匹配 ——
  `AD-GrepAssertion-1` **在計數這件事上的第 3 次**。

- **detector 自身不得持有任何預期數字。** 比對的兩邊都必須從 BACKLOG 讀出來。
  寫死任何一邊，就是把手寫計數器搬進 Python（`AD-RiskTableCountManual-1` 的形狀）。

- **實作第一步是枚舉真實格式，不是寫 pattern。** `lint-detector-authoring.md`
  §先枚舉真實格式：某 detector 作者憑印象寫了兩種格式，而 repo 裡有四種，
  漏掉的那批藏著 2 個真陽性。本 CH 的 Day-0 等價物就是把 §Open 的 117 列全部掃過分類。

### 明確不做的

| 不做 | 去向 |
|---|---|
| `RISK_REGISTER.md` R4「幾張表無稽核」的手寫計數器 | `AD-RiskTableCountManual-1`（同族、不同檔）—— 納入即是範圍蔓延 |
| 檢查**表格本身完整**（有人加了 AD 卻沒寫進表格）| ⛔ **本 detector 抓不到，這是範圍界線** —— 它證明的是「宣告與表格一致」，不是「表格與現實一致」。必須寫進 detector docstring，否則它會被當成更寬的保證 |
| 移除總數改用「見指令」 | 使用者已裁決選 (a)，不重開 |
| 把 detector 設成 warning 跑 1-2 個 phase | 誤判風險集中在 marker 定位，而那是**確定性**的（匹配次數不是 1 就 FAIL），沒有需要觀察的模糊地帶 |

---

## Verification

### Gate

`run_all` **7/7 → 8/8** · detector 單元測試 · `check_rules_hygiene` 不受影響（不動 `.claude/rules/`）
· **不跑** api/web 的 lint/type/test/build（本 CH 不動 `apps/`，跑了也只是重複 W10 的結果）

### 新增測試

- `scripts/lint/tests/test_backlog_counts.py`：
  - **正面**：真實的 `BACKLOG.md` 目前必須 PASS（若不 PASS，代表今天的數字就是錯的 —— 那是有價值的發現，不是測試 bug）
  - **負面（關掉會壞什麼）**：fixture 的總數改 1 → FAIL；某列優先度改成無法解析的字樣 → FAIL；marker 出現兩次 → FAIL；marker 不存在 → FAIL
  - **假陽性回歸**：歷史敘述中的「其前 N 條」不得被當成宣告值

### ⭐ 元驗證（依 `AD-MetaVerificationBug-1`）

負面 fixture 自己也需要一個「它在測對東西」的判準 —— W08 的 N6 第一版改名成兩個**同樣不在索引上**
的名字，於是它仍然是孤兒、`run_all` 照樣 7/7、**EXIT=0**，而那個壞掉的元驗證長得跟成功一模一樣。

本 CH 的判準：**每個負面 fixture 都要先在未被改壞的版本上跑一次並得到 PASS**，
再改壞得到 FAIL。只有 FAIL 的那一半不算數。

### Drive-through

⚪ **N/A —— 純工具鏈，gate-only verified。** 本 CH 無 user-facing 介面，
不得被讀成任何關於可用性的陳述。

⭐ **本 detector 的第一次真實驗證機會是下一個 phase 的 closeout** —— 那時 BACKLOG 會被編輯、
數字會變，而這正是 `AD-CountBeforeLastEdit-1` 兩次發生的時刻。

---

## Impact

- **Breaking change**: no
- **Migration required**: no
- **Config change**: 無
- **重啟需求**: 無
- **Rollback**: 從 `run_all.py` 的 `DETECTORS` 移除一列即可（其餘檔案不影響任何既有流程）

---

## 相關

- **關掉的 AD**: `AD-CountBeforeLastEdit-1` —— 已移出 §Open，現於 §Shipped Phases Pointer Index
- **新增的 AD**: `AD-TemplateStatusValue-1`（🟢 P2 —— 下方順帶發現）
- **更新的**: `ROADMAP` 第 10 列（落點改判，理由留在原處）· `BACKLOG` 開頭的數法說明與計數
- ⚠️ **本檔起草時引用的 `BACKLOG.md:117` 是那條 AD 當時的位置**；本 CH 把它移走了，
  行號引用已全部改為 AD 名稱（AP-7：註解引用已移除的東西就是誤導人的 orphan claim）
- **先例**: `scripts/lint/check_entity_index.py`（W08，關掉 `AD-EntityCountDerivation-1` /
  `AD-EntityIndexIncomplete-1` 兩條同族手寫計數器）
- **規則**: `docs/rules-on-demand/lint-detector-authoring.md`
- **順帶發現（不當場修）**: `_templates/change/spec.md.tpl:26` 建議的 body 狀態值「提案中」
  **不在** `check_status_markers.py` 的 `OPEN_STATES` 集合內 → 依模板照抄會觸發 E2。記 BACKLOG。
