# Verification Discipline — Drive-Through Acceptance

**Purpose**: 區分「零件對」「API 會回應」「人能真的用」三層驗證；杜絕 Potemkin Feature。

**Category**: Development Process / Quality
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

---

## 核心命題

> **開發不能只看字面上的數據。**
> Gate 全綠（type check / unit test / lint / build）只證明「**零件對**」。
> curl / probe 通過只證明「**API 會回應**」。
> **兩者都不證明「人能真的用」。**

任何 user-facing 功能在標 done 之前，必須有人**實際開著真 UI + 真後端 + 真服務走完流程**，
並比對「實際發生 vs 預期流程」。

---

## 「驗證」有三層，gate 只覆蓋前兩層

| 層級 | 證明的事 | 工具 | 覆蓋率 |
|------|---------|------|-------|
| **Gate 層** | 零件正確 | type check / unit test / lint / build / format | 高，但只到零件 |
| **Curl/Probe 層** | API 會回應 | curl / httpx / e2e against API | 中，證明接線 |
| **Drive-Through 層** ⭐ | **整台車能開、體驗符合預期** | 真 UI（瀏覽器 / Playwright / 人）+ 真後端 + 真服務 | 這才是使用者實際遇到的 |

「主流量驗證原則」要求的是**第 3 層**。
**「能」驗證 ≠「已」驅動驗證。**

---

## 為什麼這條規則存在（真實案例）

某個專案的主聊天流程上，**同時**存在下列 5 個問題：

1. 「新增 session」按鈕**沒有 `onClick`** —— 死控件
2. Session 列表是**寫死的 fixture 假資料**
3. 模型徽章顯示**硬編碼的模型名**，與實際使用的模型無關
4. Agent 的回答**根本沒有渲染**到畫面上
5. 業務工具全部跑在 mock 模式，**沒有任何地方標示**

**這 5 個問題全部通過了每一項 gate。** type check 過、unit test 過、lint 過、build 過、
API e2e 過。當時的 PR 描述寫著「~80-85% working」—— 那個數字是從 curl 驗證推導出來的，
PR 自己還註記了「UI 驅動未做」。

這正是陷阱：**用第 2 層的證據，寫第 3 層的結論。**

更值得注意的是，其中 2 個問題在被正式記錄為「已知 Potemkin」之後，**又過了約 20 個 phase 都原封不動** ——
因為每個 phase 的 gate 都是綠的，沒有任何機制會讓它們冒出來。

---

## Drive-Through DoD（每個 user-facing 功能）

1. **開真 UI**（dev server）+ **真後端** + **真服務**（非 echo / 非 mock），走完該功能主路徑
2. **逐控件確認**：
   - 可點嗎？（有 handler 嗎）
   - 有效果嗎？（點了真的發生事情嗎）
   - 標籤真實嗎？（不是硬編碼 / 不是誤導）
   - 結果真的渲染嗎？（後端回了，畫面上看得到嗎）
3. **截圖 + 「實際發生 vs 預期流程」對照**記入 progress.md / change record
4. **發現 Potemkin 就修到能用才算 done**
5. 強制 gate：`.claude/rules/task-workflow.md` §Before Commit Checklist item 7

---

## 禁止項（紙上談兵的來源）

- ❌ **gate 過了就標「verified / ~X% working」**
  → drive-through 沒做，一律寫「**未驗證 (gate-only)**」
- ❌ **用 curl / probe 通過當「功能能用」**
- ❌ **死控件**（無 handler）
- ❌ **fixture 假資料裝成真資料**
- ❌ **寫死或誤導的標籤**
- ❌ **後端回了但結果不渲染**
- ❌ **後端沒接就用假資料但不標示**
  → 要嘛明確標 `DEMO` / `MOCK`，要嘛留白，**不可假裝真**

---

## Mock 的誠實原則

用 mock / fixture 本身沒問題 —— **不標示才有問題**。

| 情境 | 正確做法 |
|------|---------|
| 後端還沒好，前端先做 | 照設計實作視覺，資料用 fixture，但**明確標 DEMO** |
| 開發模式跑 mock 服務 | 啟動時 `logger.warning` 宣告 + 每筆 mock 結果帶 `"_mock": true` 標記 |
| 測試用假資料 | 測試環境內無所謂，但**不能洩漏到 production 路徑** |

**Mock 標記的實作要點**：標記本身也要被 drive-through 驗證。
真實案例：有專案加了 mock 標記、寫了測試、測試也通過了 ——
但 drive-through 發現**對某一整類工具完全沒生效**（該類回傳裸陣列，
標記邏輯只處理 dict）。**那個「通過的測試」認證了這個跳過。**

> 教訓：**測試通過不代表功能生效**。這正是為什麼 drive-through 不可被取代。

---

## 適用範圍

| 類型 | 是否適用 |
|------|---------|
| 前端頁面 | ✅ 必做 |
| 使用者透過 UI 觸發的 API | ✅ 必做 |
| 串流 / 即時更新流程 | ✅ 必做 |
| CLI 工具（人會直接跑）| ✅ 必做 |
| 純後端 / 純 infra（沒有人會透過 UI 驅動）| ⚠️ 豁免，**但報告必須寫「gate-only verified」**，不可暗示可用性 |

---

## 同一命題的文件層變體

本檔講的是 **runtime 層**：gate 綠 ≠ 人能用。

**同一個錯誤形狀會在文件層重演**：一次目錄重構可以通過所有「內容保全」檢查
（沒有檔案遺失、雜湊全對、lint 全綠），同時留下一堆指向已刪除目錄的**指令** ——
因為**一條過時的指令不是一個遺失的檔案**，任何內容檢查都看不到它。

> 內容保住 ≠ 流程走得通。

大搬遷 / 改名 / 目錄重組時讀 [`docs/rules-on-demand/restructure-repointing.md`](../../docs/rules-on-demand/restructure-repointing.md)
（指標檔清單 + 存在性檢查方法 + 準則/歷史分流原則）。
機械檢查：`python scripts/lint/check_path_references.py`。

---

## 同一命題的證據層變體：證據要真的支持結論

前兩節講的是「**驗證做得不夠深**」。第三種變體是「**驗證做了，但推論是錯的**」——
工具輸出全部是真的，結論仍然錯。這種最難自己察覺，也最容易通過 review：
讀的人看到有 grep、有數字，就當已經查過了。

| 形態 | 長什麼樣 | 為什麼錯 |
|---|---|---|
| **命中數當證據** | 用一條混合 pattern 的命中數推論「全部都做對了」 | 數字只證明有東西匹配，不證明匹配到的是對的東西 |
| **檔名當內容** | 看到 `backup.yml` 就結論「有備份機制」 | 檔名是標籤，不是實作 |
| **單一檔當全樹** | 只讀主設定檔就判「未做」，實際做在被 include 的檔裡 | 分層設定要追到底 |
| **由類別推論內容** | 「這是 trace endpoint」→「所以它含使用者輸入」 | 沒讀 schema 就從名字推語義 |
| **零命中但搜錯範圍** | 「零個前端呼叫者」—— 但那個值由後端合成，本來就不會在前端原始碼出現 | 零命中要先證明**搜對了地方** |
| **撞上限當搜完** | 輸出被截斷就當全貌 | 撞上限 = 還沒搜完 |

**操作守則**：非零命中要**逐處讀**；零命中先反問「它如果存在會長什麼樣、在哪」；
找受影響的檔用引用關係搜或**直接跑全套**，不要用檔名 glob 猜；
**稽核類交付物要自帶覆蓋聲明**（掃了什麼 / 什麼方法 / 什麼沒掃到）。

> 共通結構：**拿一個便宜的代理指標（數量 / 檔名 / 類別 / 目錄結構），
> 去回答一個需要讀內容才能回答的問題。** 問題越大越想用，而那正是它最不可靠的時候。

案例與完整形態表：`memory/feedback_evidence_must_support_claim.md`。

---

## 與 Anti-Pattern Checklist 的關係

Drive-through 是 **AP-3 Potemkin Feature** 的**唯一有效偵測機制**。

靜態檢查（lint / type check）能抓到很多東西，但抓不到：
- 「這個按鈕有 handler，但 handler 是空的」
- 「這個資料有渲染邏輯，但資料源是 fixture」
- 「這個標籤是變數，但那個變數永遠是同一個常數」

這三種都要**開車**才會發現。

---

## 給 AI 助手的具體要求

當你要在回覆或文件中寫下「已驗證」「可用」「~X% working」時，先自問：

1. 我**實際看到** function result 了嗎？（不是推測、不是「應該會」）
2. 我做的是哪一層驗證？gate？curl？還是真的開車？
3. 如果只做了前兩層 —— 我寫的是「gate-only verified」還是「verified」？
4. 我手上那份工具輸出，**真的支持**我要寫的那句話嗎？還是我在用代理指標（數量 / 檔名 / 類別）
   回答一個需要讀內容才能回答的問題？

**如果你沒開過車，就不要說車能開。**

相關記憶：`memory/feedback_drive_through_over_paper_metrics.md`、
`memory/feedback_never_fabricate_tool_results.md`、
`memory/feedback_evidence_must_support_claim.md`
