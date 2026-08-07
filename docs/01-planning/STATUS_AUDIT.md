---
artifact: status-audit-living
status: active
last_audit: <YYYY-MM-DD — 尚未執行第一次審計>
---

# 全項目狀態審計（Status Audit）

**Purpose**: 跨來源的**點時間快照** —— 對照所有追蹤文件，揪出它們**彼此之間**的漂移。

**Category**: Planning / Living document
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

> **一句話定位**：這份**不是第二個 backlog**。
> 使用者問「現在全項目最新狀況是什麼」→ 跑 `/status-audit` → 在 §2 加一個新快照 → 舊快照落 §3。

---

## 0. 為什麼需要跨來源（這是本檔存在的全部理由）

專案成熟之後會有**四到五份各自維護的追蹤文件**。每一份都是**單一視角**，
而且**看不見自己的 stale**：

| 失效模式 | 真實案例 |
|---|---|
| Backlog 看不見自己 stale | 同一個項目在同一份檔案的**兩個分區狀態相反**，兩處都有人維護過 |
| 風險登記停更沒人察覺 | 停更兩個月，期間每個 phase 都正常收尾 |
| Deferred 的解封條件過期 | 條件寫「等 X 可用」，X 早就可用了，但沒有人回頭翻 |
| 寫死日期的觸發條件過期 | re-escalation 死線過了 14 天，沒有任何東西會叫 |
| 三件套 `status` 收尾時漏翻 | 一次回填 21 個檔；期間盤點把已修好的 bug 判成「真 pending」 |

**只讀其中一份去回答「現在怎樣」必然不準。**
而這種對照**不能塞進任何一份被對照的文件裡** —— 那樣它就變成被對照對象的一部分。

---

## 1. 權威來源清單（掃描時缺一不可）

> **執行層在 `/status-audit` command**（實際 grep 寫法 / 交叉比對七問 / 輸出模板 / 常見誤判）。
> **本節只定義「哪幾份是權威來源」** —— 這是 repo 知識，沒有 AI 也讀得懂。
>
> **來源清單有變 → 改本節，同時改 command；程序細節有變 → 只改 command。**

| # | 來源 | 取什麼 |
|---|---|---|
| 1 | [`BACKLOG.md`](./BACKLOG.md) | 全部待辦 + 狀態 + 分區；**留意同一 ID 在不同分區狀態是否一致** |
| 2 | [`ROADMAP.md`](./ROADMAP.md) | 執行順序層有沒有收齊新項；已完成的有沒有標回去 |
| 3 | [`DEFERRED_REGISTER.md`](./DEFERRED_REGISTER.md) | 恢復條件 + **最後更新日期**（判停更）|
| 4 | [`RISK_REGISTER.md`](./RISK_REGISTER.md) | Active 風險 + **寫死的觸發條件有沒有過期未執行** |
| 5 | [`../14-adr/`](../14-adr/README.md) 全部 `**Status**:` | 有沒有 `Proposed` 未拍板；編號有沒有無解釋的空缺 |
| 6 | 三軌 pre-doc 的 `status:`（phase `plan.md` · Change `spec.md` · Bug `report.md`）| 哪些工作仍未收尾（**跑 `python scripts/lint/check_status_markers.py`** —— 它三軌都掃）|
| 7 | `docs/` 全部**非終態** `status:` | 補漏:**單檔 1-page 記錄不在腳本範圍內**，兄弟檔亦只在有欄位時才被比對 |
| 8 | [`../decision-form.md`](../decision-form.md) | Open question 的 Resolved / Open 比數 |

**補充掃描（揪真空白）**：`git status --short` + `git log --oneline -8` ·
code 內的 `TODO(` / `FIXME` / `HACK(` · 各 track 自己的 `TRACKER.md` ·
`git ls-files` 核對「文件裡被引用的檔」是否真的存在。

---

## 2. 最新快照 — <YYYY-MM-DD>

<!-- 每次審計覆寫本節；舊快照精簡後移到 §3。 -->

**基準**：branch `<name>` · `<sha>` · 工作樹 <clean / dirty>
**當前 active phase / change / bug = <N>**

| 層級 | 數量 | 一句話 |
|---|---|---|
| 🔴 上線硬關卡 | | |
| 🟠 已規劃、未執行 | | |
| 🟡 已設計、主動暫緩 | | |
| ⚫ 卡使用者 / 卡外部 | | |
| 🟢 持續技術債 | | |
| ⚪ 已實證 defer | | |
| ⚠️ 漂移發現 | | |

### 2.1 🔴 上線硬關卡
### 2.2 🟠 已規劃、未執行
### 2.3 🟡 已設計 / 已批准，主動暫緩
### 2.4 ⚫ 卡使用者 / 卡外部
### 2.5 🟢 持續技術債
### 2.6 ⚪ 已實證 defer / 範疇邊界外
### 2.7 ⚠️ 漂移發現（AD-N）

<!-- 每項必須帶實據：commit sha / 檔案行號 / git ls-files 輸出。
     寫「似乎 stale」等於沒寫。 -->

| AD | 漂移 | 實據 | 建議 |
|---|---|---|---|
| | | | |

### 2.8 真空白（未規劃亦未設計）
### 2.9 優先序建議
### 2.10 硬 gate 狀態

---

## 3. 歷史快照

<!-- 舊快照精簡成 3-5 行放這裡，保 audit trail。不要保留全文。 -->

| 日期 | 基準 sha | 當時 active | 漂移數 | 一句話 |
|---|---|---|---|---|
| | | | | |

---

## 4. 三條硬紀律（全部由踩過的坑得出）

### 一、不可以靠目錄結構或狀態欄位推斷，一律查 `git log` 實據

來源專案曾在一天之內因此錯三次：把早已修好的 bug 判成 pending（`git log` 一查就見修復 commit）·
把早已做過的工作判成從未執行（只搜了 `docs/`，東西在 `infrastructure/`）·
把「沒有資料夾」當成「沒做過」。

**同一種病：靠結構推斷，不查實據。** 每個「未做」的判斷落筆前，先問「我查過 commit 沒有？」

### 二、兩個方向都要驗

「文件說已完成」不等於完成；「文件說待辦」也不等於未做。**漂移是雙向的。**

### 三、輸出必須帶實據

commit sha / `file:line` / 工具輸出。**沒有實據的發現不要寫進來** ——
一份摻了猜測的審計報告，會讓後續每個人都要重新驗一次，比沒有更糟。

---

## 5. 不可以做的事

**❌ 不可以在本檔複製 BACKLOG / REGISTER 的逐項細節。**
一複製就變成第二份要同步的清單，等於親手種下下一次漂移。
本檔只保留：roll-up 統計 / **跨來源矛盾** / 優先序建議 / 指向來源的連結。

**❌ 不可以順手修漂移**（除非使用者要求）。
審計的職責是揪出來並記下；修是另一件事，有自己的範疇與風險。

**❌ 不可以用本檔取代 session start protocol。**
那個是開工前載入 active phase context；這個是按需的全景審計。兩件不同的事。

---

## 6. 收尾動作

1. 更新 frontmatter `last_audit`
2. **在 `BACKLOG.md` 加一行**指向本次 §2.7（PROCESS R7：新識別的 pending 必須進 BACKLOG）
   —— **加一行，不要逐條複製漂移細節**，否則就是在製造下一次漂移
3. 更新 `BACKLOG.md` 的最後更新日期
4. Commit：`docs(planning): status audit <日期>`

> **漂移編號用 `AD-N`（Audit Drift），只增不重用。**
> 刻意避開 backlog / deferred / risk 既有的命名空間 ——
> 來源專案有過同一個編號被用兩次，而且因為已被多處引用而不敢重編。
