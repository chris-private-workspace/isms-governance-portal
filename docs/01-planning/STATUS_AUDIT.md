---
artifact: status-audit-living
status: active
last_audit: 2026-08-19
---

# 全項目狀態審計（Status Audit）

**Purpose**: 跨來源的**點時間快照** —— 對照所有追蹤文件，揪出它們**彼此之間**的漂移。

**Category**: Planning / Living document
**Created**: 2026-08-07
**Last Modified**: 2026-08-19
**Status**: Active

> **Modification History**
> - 2026-08-19: Audit #8 (post-W22) — AD-45–49; four of the five are older drifts one phase worse
> - 2026-08-18: Audit #7 (post-W15..W21) — AD-27–44; eight sit in the ADR layer, which no closeout checks
> - 2026-08-15: Audit #6 (post-W13+W14) — AD-21–26; four contradict their own row or paragraph
> - 2026-08-14: Audit #5 (post-W12) — AD-17–20; two of the four were made hours earlier by closeout
> - 2026-08-13: Recover the 2026-08-10 (#3) audit that never merged; renumber post-W07 to #4
> - 2026-08-12: Audit #3 (post-W07) — AD-12–16; the entity counter was wrong in every source
> - 2026-08-10: Add audit #2 + AD-7–11 disposition — five drifts closed same day
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

## 2. 最新快照 — 2026-08-19（**#8**，W22 收尾後）

**基準**：`main` · **`a3259fc`** · **開著的 PR = 0** · 工作樹 clean（`git status --short` 零行）
**當前 active phase / change / bug = 0** —— `check_status_markers.py` 掃 **29 個 pre-doc**，
`E1/E2/E3/E4 clean`；22 個 `plan.md` 全部 `closed`（17）或 `closed_partial`（5）；`run_all` **9 / 9**

✅ **基準回到 `main` 上** —— 審計 #7 是歷來唯一一次以未 merge 的分支為基準（它自己記了這件事）。
本次 W22 的兩個 PR（**#86** 本體 · **#87** post-merge）皆已 `gh pr view` 驗證 `state=MERGED`。

⛔ **本次只跨一個 phase（W22）** —— 是 #6 以來最小的落差，也是這份 living 文件第一次**沒有落後**。
⚠️ 但那不是紀律改善，是**使用者主動問了**：仍然沒有任何東西會在它落後時叫（#7 的第一個發現原封不動）。

### 涵蓋聲明

**掃了**（§1 全部 8 個來源，本次**未委派 agent**，全部自己讀）：
`BACKLOG.md`（detector 導出 + §Open 逐列 priority cell 解析）· `ROADMAP.md`（四張表 + 落點 grep）·
`DEFERRED_REGISTER.md`（D001–D005 + Last Reviewed）· `RISK_REGISTER.md`（header + 逐列日期欄）·
`docs/14-adr/` 全部 `**Status**:` + README 的預留說明 · 三軌 pre-doc（跑腳本）·
`docs/` 全部非終態 `status:` · `decision-form.md`（開放 + 已拍板兩表）。
補充：`git status --short`（**0 行**）· `git log` · `gh pr view 86/87 --json state,mergedAt` ·
`check_entity_index.py`（**34 / 36**）· `check_backlog_counts.py`（**173**）· `check_sha_anchors.py`（**OK**）·
`run_all.py`（**9/9**）· `AUDITED_MODELS` 逐名讀出（**16**）· `^model`（**35**）·
全 repo `TODO(`/`FIXME`/`HACK(`（**0 命中於受版控檔** —— 命中全部落在 `apps/web/.next/` 建置產物，非追蹤）。

**沒掃到 / 不在範圍**：`docs/02-architecture/` 19 份設計文件內文一致性 · `reference/`（刻意不在版控）·
branch protection API（本次未重查）· ⚠️ **`BACKLOG.md` 審計歷史前言未全文讀**（同 #7 的限制）·
⚠️ **審計 #7 的 AD-27 ~ AD-44 本次未逐條重驗原文** —— 只確認它們**仍在 §2.7 且無處置紀錄**，
所以「仍未處置」是**狀態陳述**不是內容複驗。

| 層級 | 數量 | 一句話 |
|---|---|---|
| 🔴 上線硬關卡 | **6** | 未變（`AD-RiskForm-1` · `AD-Incident-1` · `AD-NegativeGate-1` 候選 · `AD-UniqueKeyOracle-1` 候選 · `AD-NarrowPatternWideClaim-1` 候選 · `AD-LocalPasswordFallback-1`）。⛔ **`AD-LocalPasswordFallback-1` 在 ROADMAP 上仍零落點** —— **AD-34 未處置** |
| 🟠 已規劃、未執行 | **92** | P1（+8，自 #7 的 84）—— 全部來自 W22 |
| 🟢 持續技術債 | **75** | P2（+5）|
| ⚫ 卡使用者 / 卡外部 | **1.5** | 未變（`AD-DAST-1` 全卡外部 · `AD-IaCEvidence-1` 一半卡外部）|
| ⚪ 已實證 defer | **5** | D001–D005。⚠️ **本次逐條複查解封條件，四條皆未成立**（D005 的「同時開兩個以上 PR」—— #86 / #87 是**序列**不是並行）|
| ⚠️ 漂移發現 | **5 新 + 18 舊** | **AD-45 ~ AD-49**（見 §2.7-#8）；**AD-27 ~ AD-44 全部仍未處置** |

> 上表數字由 **`check_backlog_counts.py` 導出**：**173 列**（P0 **6** / P1 **92** / P2 **75**）。
> ⚠️ **本次審計自己踩了一次「證據不支持結論」**：我先用 `'🔴 P0' in line` 逐行數，得到 **4**，
> 與 detector 的 **6** 不符。差異不是漂移 —— detector 的 docstring 明寫 priority cell 有**三種寫法**
> （`🔴 P0` / `🔴 **P0 候選**` / `🟡 **P1**（升級）`），**我的 pattern 太窄漏掉三條**（另一條是命中散文）。
> ⇒ `AD-NarrowPatternWideClaim-1`（🔴 P0 候選）**在本次審計中又發生一次**，抓到它的是**兩個獨立來源不一致**。

### 2.7-#8 ⚠️ 本次漂移發現（AD-45 ~ AD-49）

> 編號續 §2.7 的 AD-44。⛔ **共同形狀：五條裡有四條是「已被指名的漂移，又過了一個 phase」** ——
> 本次幾乎沒有新種類，只有**同一批舊病的計數器往前跳**。那本身就是最重要的發現。

| AD | 漂移 | 實據 |
|----|------|------|
| **AD-45** ⭐⭐ | **審計 #7 的 18 條跨了一整個 phase，零處置** —— 而 W22 的 checklist **明文排了其中兩條**（`AD-27` / `AD-30`），最後以 🚧 收尾 | `BACKLOG.md:13-16` 仍寫「⏳ 未處置」· `W22-*/checklist.md` 4.2 該項為 `[ ]` + 🚧「未取得使用者核可」。⛔ **根因是 #7 自己指名的那一個**：**phase closeout 的檢查表沒有一格是 ADR** —— 被指名之後又過了一個完整的 phase，**那一格仍然沒有被加**。⇒ 「指名根因」與「修掉根因」之間沒有任何機制 |
| **AD-46** ⭐⭐ | **merge 標記的假宣稱跨了一整個 phase** —— W21 的 PR **#84 於 2026-08-18T07:08:46Z 就 merged**，而四處標記全部沒翻 | `BACKLOG` W21 pointer row · `W21-*/retrospective.md:6`（寫著 `#TBD`）· `memory/project_w21_azure_web_demo.md:3` · `MEMORY.md:89`。⛔ **`check_status_markers.py` 不掃 `PR-pending`** ⇒ `run_all` 一路 9/9 蓋著四個假宣稱。⚠️ **代價已發生**：`CLAUDE.md` Current-Phase 格（每個 session 開場都讀）曾寫著「W21（PR #84 **開著**）」，而那個 PR 已 merged 十小時。✅ **已於 2026-08-19 post-merge 處置**（`a3259fc`）→ `AD-StalePrPendingNoDetector-1` |
| **AD-47** ⭐ | **AD-32 第 4 次，而這一次是本 session 自己做的** —— W22 closeout 改寫了 `RISK_REGISTER` 的 **R4** 並新增 **E5**（日期欄寫 2026-08-19），**而 header `Last Reviewed` 仍停在 `2026-08-16（W17 closeout）`** | `RISK_REGISTER.md:5` vs 同檔 R4 列的 `2026-08-19` 註記。⇒ 「**改列不改 header**」在 W18 / W19 / W21 各一次，**W22 第四次** —— 三次由 agent、一次由我，**同一個形狀對誰都一樣**。⛔ 本次依 §5 不代修 |
| **AD-48** | **AD-36 惡化一格** —— ROADMAP 仍然沒有任何一列對應前端 / 部署 / 垂直切片 | `grep -c "W19\|W20\|W21\|W22" ROADMAP.md` = **1**（只有第 9b 列的 W21 散文）。⛔ **W22 是本專案第一個消費自家 API 的產品畫面**，而排序層對它零記載。⇒ 今天讀 ROADMAP 問「先做哪個」，仍然答不出任何跟瀏覽器有關的事。**AD-39**（ROADMAP header 比內文舊）亦未處置 |
| **AD-49** | **AD-33 惡化** —— `DEFERRED_REGISTER` 內容自 2026-08-12 未動，**跨 10 個 phase**（#7 時是 9 個）| `DEFERRED_REGISTER.md:6` `Last Reviewed: 2026-08-12`。⚠️ **本次逐條去找解封條件指名的東西**：D001（無在範圍管轄區要求）· D003（Wave 2 不填充）· D004（Wave 1 邊界未破）· D005（**#86 / #87 是序列開 PR，不是並行**）**皆未成立** ⇒ 內容不需要改，**但「有沒有人看過」與「需不需要改」是兩件事**，而只有後者有紀錄 |

### 2.8-#8 優先序建議

⛔ **審計不代為決定，下列是排序候選不是指令。**

| # | 候選 | 為什麼是它 |
|---|---|---|
| 1 | **`AD-LocalPasswordFallback-1`（🔴 P0）—— ADR-0007 修訂** | 唯一一條**架構級且已卡兩個 phase**的 P0；載體必須是 ADR（R5）。⚠️ 它與 `ROADMAP` 第 2c 列（「Entra ID 之後的密碼／憑證責任邊界，**可能值得一份 ADR**」）**是同一個決定，而兩份文件互不引用** —— 那本身是 AD-34 的延伸 |
| 2 | **`AD-FixtureProseBecomesForgedEvidence-1`（🟡 P1）** | W22 證明了它**不是理論**：同樣的 fixture 文案還在其餘 28 個畫面上，**每接一頁就是一次 guardrail 2 / 5 違反**。它是「接下一個畫面」的前置，不是獨立工作 |
| 3 | **closeout 檢查表補一格 ADR + 一格 `PR-pending`** | 一次修掉 **AD-45**（18 條的根因）與 **AD-46**。⚠️ 治理工具，受 §Step 0.0 每 phase 1 個 CH 的配額約束 —— **所以它要跟一個產品 phase 一起排，不是自己占一片** |
| 4 | **審計 #7 的 18 條分批處置** | 已跨兩個 phase；ADR 層那 8 條會讓 **M4 規劃時讀到錯誤指令**（`AD-30`：`0007:90` 仍指示建兩套身分平面）|

### 2.9-#8 一個觀察 —— **這次審計自己貢獻了一條漂移，也自己抓到一次窄 pattern**

**AD-47 是本 session 做出來的**（改了 RISK_REGISTER 的列、沒改 header）。
**AD-46 也是本 session 抓到並修掉的**（W21 的四處假 pending）。
而 §涵蓋聲明裡那個 `4 vs 6` 的 P0 計數分歧，是 **`AD-NarrowPatternWideClaim-1` 的又一次實例**，
抓到它的**不是我更小心，是兩個獨立來源給了不同的數字**。

⇒ 三件事指向同一句話：**單一視角看不見自己的錯，不論那個視角是文件還是人。**
這正是本檔 §0 的論證，而本次它以三種形態同時發生在同一個 session 裡。

<details><summary>審計 #7（2026-08-18，W15 ~ W21）—— 原文保留，AD-27 ~ AD-44 全部仍未處置</summary>

**基準**：branch `feature/W21-azure-deploy` · `3b55acb` · **開著的 PR = 1**（**#84**，六個 check 全綠、
未 merge）· 本機分支 **4** · 遠端分支 **5**
**當前 active phase / change / bug = 0** —— `check_status_markers.py` 掃 **28 個 pre-doc**，
`E1/E2/E3/E4 clean`；`run_all` **9 / 9**
⛔ **本次跨七個 phase**（W15 · W16 · W17 · W18 · W19 · W20 · W21）——
**這是本檔歷來最大的一次落差**，前六次最多跨兩個。落差本身就是第一個發現：
`STATUS_AUDIT.md` 是一份 living 文件，而**沒有任何東西會在它落後時叫**。

⚠️ **基準不在 `main` 上，這是歷來第一次。** 前六次都以 merge 後的 `main` 為基準；
本次 W21 的 closeout 仍在 PR #84 上。⇒ 本快照描述的是**即將成為 `main` 的狀態**，
而 §6 第 5 條說得很清楚：**沒有 merge 的審計等於沒發生過**。本份必須連同 #84 一起進 `main`。

✅ **工作樹 clean，且每個本機分支都已推上去** —— `git status --porcelain --untracked-files=all`
零行；四個本機分支的 `origin/<branch>..<branch>` 皆為空。
⇒ **`AD-UnpushedWorkInvisible-1` 的形狀本次未再現**（審計 #6 有一個活體實例）。

### 涵蓋聲明

⚠️ **本次的掃描以四個平行 subagent 執行**（來源分組：BACKLOG+ROADMAP · 三個登記冊 ·
ADR 全套 · pre-doc/repo/code-debt），我保留跨來源比對與判讀。
⛔ **agent 的回報一律當作未經驗證** —— 下表每一條進入 §2.7 的發現，**我都自己重讀過那一處原文**。
實測代價：**agent A 有一條是錯的**（宣稱 `CLAUDE.md` 仍寫 `Current Phase = W20`；
實際 `CLAUDE.md:79` 已是 W21 —— 它讀到的是本 session 更新前的狀態）。**該條未採用。**

**掃了**（§1 全部 8 個來源）：`BACKLOG.md`（detector 導出 + 160 列的 ID／優先度全表）·
`ROADMAP.md`（**156 行逐行**，四張表 + §刻意不進排序的 P0）· `DEFERRED_REGISTER.md`（D001–D005
逐條，且**每條的解封條件都去找它指名的那個東西**）· `RISK_REGISTER.md`（R1–R8 + header + 逐列日期欄）·
`docs/14-adr/` **13 個檔全文**（12 ADR + README + template）· 三軌 pre-doc（跑腳本）·
`docs/` 全部非終態 `status:` · `decision-form.md`（開放表 + 已拍板表 + **表下敘述段逐句**）。
補充：`git status --untracked-files=all`（**0 行**）· `git log` · `gh pr list --state open`（**1**：#84）·
`gh pr checks 84`（**6 綠**）· **PR #84 的 CI log 逐行讀 semgrep 的 language 表** ·
`check_entity_index.py`（**34 / 36**）· `check_backlog_counts.py` · `check_status_markers.py` ·
`run_all.py`（**9/9**，我自己跑的）· **`AUDITED_MODELS` 逐個名字讀出**（**16**）·
`^model` 計數（**35**）· 全 repo `TODO(`/`FIXME`/`HACK(`（**0 命中**，且附**對照 grep 證明搜對地方**：
同一組 glob 對 `export|def |function |SELECT|steps:` 命中 **293 檔**）·
`changes/` 目錄列舉（**CH-001..041 無空缺**）· `bugs/`（仍只有 `.gitkeep`）·
⭐ **Azure ingress 實況**（`customDomains: null` · `certificate list` → `[]`）。

**沒掃到 / 不在範圍**：`docs/02-architecture/` 19 份設計文件的內文一致性（非追蹤來源）·
`reference/` 與 `docs/reference/`（刻意不在版控）· branch protection API（本次未重查）·
W15–W21 七個 phase 的 int spec 未逐條讀測試標題 ·
⚠️ **`BACKLOG.md:86–218`（審計歷史前言）未全文讀**，只用 pattern 掃過
（`AD-*` / `ROADMAP` / `W20` / `🔴 P0`）—— **一條只活在那段散文裡、且不含上述任一 pattern 的矛盾，本次會漏掉**。

| 層級 | 數量 | 一句話 |
|---|---|---|
| 🔴 上線硬關卡 | **6** | **−1**（7 → 6）：`AD-Mockup-3` 由 W19 關閉 · `AD-Mockup-2` **降為 P1** · 新增 `AD-LocalPasswordFallback-1`。⛔ **而那條新的在 `ROADMAP` 上零落點** —— 見 **AD-34**，`AD-21` 的失效模式換一個成員再演一次 |
| 🟠 已規劃、未執行 | **84** | P1（+23，自審計 #6 的 61）—— 七個 phase 的產物 |
| 🟢 持續技術債 | **70** | P2（+30）|
| ⚫ 卡使用者 / 卡外部 | **1.5** | `AD-DAST-1` 仍全卡外部；⭐ **`AD-IaCEvidence-1` 今天裂成兩半** —— RIT 那半仍卡外部，**我們自己的 IaC 那半不再是外部阻塞**（見 §2.6）|
| ⚪ 已實證 defer | **5** | D001–D005；D002 已於 2026-08-12 恢復，其餘四條**本次逐條去找它指名的東西**，皆未成立。⭐ 但 D002 的**論據悄悄變成三倍強**，見 §2.3 |
| ⚠️ 漂移發現 | **18** | **AD-27 ~ AD-44**，見 §2.7。⭐ **共同形狀：ADR 層完全沒有跟上 W15–W21** —— 沒有任何 ADR 檔在 2026-08-14 之後被改過，而這七個 phase 蓋了 12 張表、一支 IaC 腳本與一個公開網址 |

> 上表數字由 **`check_backlog_counts.py` 導出**：**160 列**（P0 **6** / P1 **84** / P2 **70**），
> 宣告值與 §Open 逐列解析相符。**逐項細節一律回該檔看** —— 本檔不複製（§5）。
>
> ⚠️ **P0 的「6」有一個定義分歧藏在裡面**：`BACKLOG` 把 `AD-NegativeGate-1` ·
> `AD-UniqueKeyOracle-1` · `AD-NarrowPatternWideClaim-1` 三條標為 **`🔴 P0 候選`**，
> 而 `ROADMAP:82` 明文寫「**它已經不是候選**」。**兩份文件對數字一致、對「P0 是什麼意思」不一致。**
> detector 數的是 emoji，所以它對這個分歧結構性沉默 → **AD-35** 的同族。

</details>

---

> ⚠️ **以下 §2.1 ~ §2.9 是審計 #7 的段落，本次（#8）逐段判定為「續用」而非重寫。**
> **哪些本次真的重跑過**：§2.1 的兩個數字（`check_entity_index.py` → **34 / 36** ·
> `AUDITED_MODELS` 逐名 → **16**，`^model` → **35**）· §2.3 的開放決策（**OQ-7 / OQ-8**）·
> §2.6b 的 `closed_partial` 名單（**仍是 5 個** —— W22 是 `closed`）。**這三處實測未變。**
> **哪些沒有重跑**：§2.2（ADR 層）· §2.4（死線）· §2.5（真空白）· §2.6（M0 DoD）· §2.7（AD-27~44）
> —— W22 未動 ADR / 部署 / schema，⇒ **推定未變，但那是推定不是量測**。
> ⛔ 唯一已知的變化是 **M0 DoD 第 2 項多了一個量到的洞**：SAST **完全不掃 `test/` / `tests/`**
> （`AD-SemgrepSkipsTestDirs-1`），其中 `int-global-setup.js` 以 **schema owner 連真資料庫**。
> 判定仍是「部分」，但**理由多了一條**。

### 2.1 資料模型：**34 / 36**（機械導出）· 稽核覆蓋 **16 / 34**

`check_entity_index.py` 回報 **34 / 36**；`schema.prisma` 的 `^model` = **35**。
⭐ **審計 #4 的 AD-12 / AD-13 連續第 4 次複驗未再漂移** —— 那條 detector 的結構性關閉撐過了七個 phase。

稽核覆蓋兩邊都是當場導出：`AUDITED_MODELS` **逐個名字讀出 = 16** · 分母 = 35 − 1（`AuditLog` 自身）
= **34**。⭐ **`RISK_REGISTER` R4 這次是對的** —— 審計 #6 的 `AD-23` 處置（不寫死分數、改寫兩條可重跑的
導出指令）**經七個 phase 驗證有效**，那是本檔目前最健康的一列。

⛔ **而同一組數字在 `ADR-0003` 上錯了一個數量級** —— `0003:127-128` 仍寫
「`AUDITED_MODELS` holds **exactly one** name … coverage is **1 of 21**」。見 **AD-28**。
⚠️ **偏差的方向是「讀起來比實際安全」的反面** —— 它把一個已達 16/34 的守衛描述成 1/21，
所以不會誤導人放心，**會誤導人低估已經蓋住的範圍而重做**。

### 2.1b W15–W21 交付了什麼（本檔不複製細節，只給導航）

| Phase | 一句話 | 權威 |
|---|---|---|
| W15–W18 | M1 slice 10–13，實體 20 → **34 / 36**；零端點零 repository | 各 `retrospective.md` |
| **W19** | ⭐ **前端首次落地** —— 30 個畫面，drive-through 抓到 **25 個死控件**（通過每一項 gate）| `CH-038` |
| **W20** | ⛔ **全片回退**，淨產出 0 行 —— gate 全綠、開過車、AP 全 0，而做的不是使用者要的東西 | `W20/retrospective.md` |
| **W21** | ⭐ **首次部署** —— 29 路由對真實網址走查；`DEMO_AUTH` 守衛首次被證明會擋 | `CH-041` · `infra/azure/README.md` |

⭐ **W19 是「約束 3（drive-through）連續 14 個 phase 零次」這條紀錄的終結點**
（審計 #6 §2.9 把它列為結構性事實）。**而它第一次執行就抓到 25 個死控件** ——
那正是審計 #6 預測的：中性化實驗只能在你已經想到要問的地方進行，drive-through 抓的是你沒想到要問的。

### 2.2 ADR —— ⭐⭐ **本次最大的一塊，而它的形狀是「整層沒有跟上」**

**11 份已採納** · **1 份已被取代**（0006 → 0010）· **無 `提案中` 未拍板** ·
編號空缺 **0002 / 0008 / 0009** 三條**全部有解釋**（`README.md:106-110`）。
0006 ↔ 0010 的取代**雙向完整**，照 `README.md:140-144` 的流程走。以上**零漂移**。

⛔⭐ **而沒有任何一個 ADR 檔在 2026-08-14 之後被修改過。**
最新的 `**Date**` 是 ADR-0003 的 2026-08-14。**整套 ADR 早於 W15–W21 全部七個 phase**，
而那七個 phase 蓋了 12 張表、一支進版控的 IaC 腳本、與一個公開可達的網址。

本次 18 條漂移裡 **8 條落在 ADR 層**（AD-27 · 28 · 29 · 30 · 40 · 42 · 43 · 44）。
⇒ **這不是八個各自獨立的疏忽，是一個結構事實**：phase closeout 的檢查表涵蓋
`CLAUDE.md` / `MEMORY.md` / `BACKLOG` / `ROADMAP` / `RISK_REGISTER` / calibration ——
**沒有一格是 ADR**。`retrospective.md.tpl:120` 有「⭐ `RISK_REGISTER.md` 已複查」那一列，
是審計 #3 的 `AD-12b@#3` 加上去的；**ADR 從來沒有拿到等價的那一列**。

⚠️ 最尖銳的一條是 **AD-27**：`CH-041`（今天寫的）在自己的表格裡**列出** `ADR-0011:119`
是受影響處，**然後沒有修它**。一次修復動作列出了自己的漏網。

### 2.3 開放決策

`decision-form.md` **開放 2 項** · **已拍板 6 項**。兩項的「誰能決定」欄**仍全是 ⚠️ 未指定**，
自 2026-08-07 起**二十個 phase 未變**。⭐ 審計 #6 的 `AD-17` / `AD-22`（那個「3」）
**已於 2026-08-16 處置且未再漂移** —— 處置方式是**改結構不是改數字**（該格不再寫數字也不列 OQ 編號），
與審計 #2 `AD-8` 同一招，連續驗證有效。

⛔ **而本次在同一份文件抓到兩條新的，形狀比上次更難看**：

- **AD-31** —— `decision-form.md:31-34` 說 `03` §Questions for Legal 的四個法律問題
  「中國移出範圍後這四個問題是否仍成立…**均未經複查**」，而**同一句話裡連結的**
  `ADR-0010:115-116`（**已採納**）寫著「The four questions for Legal at `03:152` are **moot**.
  … `AD-Decider-1` closes.」⇒ **它引用了那份文件，然後宣稱那份文件裡的事沒有發生。**
- **AD-41** —— OQ-8 的「為什麼現在要決定」欄寫「ADR-0009 與 **OQ-1 耦合** —— 推論地點是主權控制。
  若 OQ-1 選了分區，agent 也必須能分區」，而 **OQ-1 早在 2026-08-08 改為單一區域**，
  就記在**同一份文件下方四列**（`:44`）。**沒有分區可讓 agent 跟隨了。**

⭐ 這兩條與審計 #6 的 `AD-22` 是**同一族的第四層**：一份文件同時是某事實的權威來源、
又對同一事實記錯 —— 而這次它甚至**把正確答案的連結放在錯誤陳述的同一句裡**。

### 2.4 ⏰ 死線：**零** —— 而這是本專案第一次

`AD-TrivyExempt-1`（2026-09-07）**已由 CH-032 於 2026-08-15 關閉** —— runtime base 移到
`nodejs22-debian13`，六條 `libssl3` 豁免的標的不再存在，`.trivyignore.yaml` 現為
`vulnerabilities: []`（**檔案刻意保留** —— trivy 對缺檔的 `--ignorefile` 會 FATAL，
CH-032 在 PR #66 實測過：兩個 image 在 13 秒內 FATAL，**掃描根本沒跑而 job 是紅的**）。

⭐ `ROADMAP.md:103` 已同步（該列以刪除線保留，並明寫「**不要刪掉上面那一列** ——
『表是空的』與『從來沒有東西進過這張表』在三個月後看起來一模一樣」）。**本節零漂移。**

⚠️ **`AD-StrategyBSunset-1` 的「Wave 1 結束前」仍不是一個日期**，Wave 1 的結束仍未定義在任何地方。
**審計 #5 記過、#6 記過、本次是第三次未變** —— 而 `ADR-0003:161-162` 對它下了一個
「若未於 Wave 1 結束前重測就刪掉策略 B」的指令，**沒有任何機械承載**。

### 2.5 真空白（未規劃亦未設計）

| 缺口 | 狀態變化 |
|---|---|
| **`16` 28 點的自動化 —— 實作** | **未變**。ROADMAP 第 2b / 7 項仍 ⬜。連續 **19 個 phase**。實測佐證：`scripts/lint/` 的 10 個 detector 無一對應這三點；`security-scan.yml:239` 只跑 registry 規則集；`.github/` 內 `localStorage`/`sessionStorage` 規則**零命中** |
| **`16` #11–15 的責任邊界拍板** | **未變** —— ROADMAP 第 2c 項仍 ⬜。⚠️ 而 W19 開了 `AD-LocalPasswordFallback-1`（🔴 P0，stakeholder 要保留本地密碼登入 vs ADR-0007 已採納），**那條與本項相鄰但不等價**，且它在 ROADMAP 上零落點（**AD-34**）|
| **Bug 軌從未被使用** | **未變**。`bugs/` 仍只有 `.gitkeep`。**41 個 CH 與 21 個 phase 之後仍為 0** —— 而這期間發生過 W19 的 25 個死控件與 W20 的全片回退，**兩者都走了別的軌**。⇒ 這已經不是「還沒用到」，是**判準在實務中沒有被選中過**，值得一次處置決定而不是繼續記為零 |
| **UI drive-through** | ✅⭐ **紀錄終結** —— W19 執行了本專案第一次（30 個畫面），W21 執行了第一次**對真實網址**的（29 路由）。⛔ **而第一次就抓到 25 個死控件**，它們通過了每一項 gate 含 W19 自己新加的 hover 守衛 ⇒ 審計 #6 §2.9 的預測**被實測證實**|
| **⭐ 新：ADR 不在任何 closeout 檢查表上** | **本次新識別**。七個 phase 零 ADR 更新，8 條漂移落在該層 —— 見 §2.2 |

### 2.6 M0 DoD 六項（`07:31`）—— ⭐⭐ **第 3 項的性質變了：它不再是外部阻塞**

**判讀：3 關閉 / 2 部分 / 1 待裁決。** 上一次是 3 / 2 / **1 無標的** ——
變的那一項是第 3 項（IaC skeleton scanned）。

| # | 項目 | 判定 | 本次變化 |
|---|---|---|---|
| 1 | ADR-0001 settled | ✅ | 未變 |
| 2 | CI 含 SCA / SAST / DAST / secret-scanning + `16` 自動化 | ⛔ 部分 | 未變 —— **DAST 仍卡外部**（`AD-DAST-1`）· `16` 自動化連續 19 個 phase 未做 |
| 3 | **IaC skeleton scanned** | ⚠️ **待裁決** | ⭐⭐ **從「結構上無標的」變成「有標的且已量測」** —— 見下 |
| 4 | 部署拓撲（ADR-0010）+ 計算平台（ADR-0011） | ✅ | 未變 |
| 5 | TLS/cert · 安全標頭 · 管理埠**明確設定** | 🟡 部分 | ⭐ 三個子項裡兩個**在真環境**確認，**憑證那個仍是平台預設** —— 見下 |
| 6 | i18n scaffolding | ✅ | 未變（CH-040 把預設語言改為 en）|

#### 第 3 項 —— 需要你裁決一次

`CH-041` 讓 `CH-010:51`「本專案不寫 IaC」不成立：`infra/azure/provision.sh` 進了版控。
PR #84 的 CI log 量到 semgrep **`bash 4 rules / 1 file`、0 findings**，而 `provision.sh`
是四個掃描目錄下**唯一**的 `.sh` ⇒ **那一個檔就是它，覆蓋是真的。**

⛔ **而「掃了」與「DoD 說的那種掃了」不是同一件事**，這需要人來判：

- 支持打勾：我們有 IaC skeleton，它被掃了，0 findings
- 反對打勾：**4 條規則**（TypeScript 有 164、Python 有 243）；且 `trivy config` ——
  這個專案真正的 IaC 掃描器 —— **讀不懂 shell**（它支援 Terraform / CFN / K8s / Helm / ARM / Dockerfile）。
  一支 `az` shell 腳本是不是 `04:73` 所指的 IaC，是一個定義問題不是量測問題

⇒ **審計不代為判定。** 但可以確定的是：**這一半不再是 RIT 的事**（`AD-IaCScanCoverageUnmeasured-1`
的量測部分今天已完成 ⇒ 該 AD 可降級為「厚度是否足夠」的問題）。

#### 第 5 項 —— ⛔ **本 session 自我更正的一條**

W21 的 retrospective 第一版寫「✅ 關閉，三項都是明確選的」。**那是過度宣稱。**

| 子項 | 實據 | 判定 |
|---|---|---|
| **security headers** | 六條**對真實網址複驗**（W21 Day 3），無 `x-powered-by` / `server` | ✅ 明確設定 |
| **management-port** | `main.ts:59` `API_HOST ?? '127.0.0.1'` · 容器 target port 3200 單一暴露 | ✅ 明確設定 |
| **TLS 政策** | `allowInsecure: false` · HSTS `max-age=31536000; includeSubDomains` | ✅ 明確設定 |
| **憑證** | 實測 `customDomains: **null**` · `az containerapp env certificate list` → **`[]`** | ⛔ **平台預設** |

⇒ 憑證是 Azure 為 `*.azurecontainerapps.io` 自動簽的，**我們沒有做過任何選擇** ——
而「never platform defaults」正是本條的原文。
⚠️ **「沒選」在這裡不是懈怠**：預設網域上結構性地沒有第二個選項（要自帶憑證得先有自訂網域）
⇒ **R7 的形狀**，不是紀律的形狀 → `AD-AcaManagedCertIsPlatformDefault-1`。

⭐⭐ **而 `ADR-0011:110-111` 早就寫了「Custom domain + certificate is **mandatory**（`04:93`）…
**it must be built**」** —— 那條義務**沒有被建**，而 ADR 自己不知道。這一條由 agent 掃出、我複驗過。

<!-- 以下為審計 #6 的第 5 項拆解，保留作為「連續四次『未取得實據』其實涵蓋兩件不同的事」的原始論證 -->

<details><summary>審計 #6（2026-08-15）對第 5 項的拆解 —— 原文保留</summary>

第 5 項原文是三個子項綁在一格：「TLS/cert, security headers and management-port exposure
configured explicitly (**never platform defaults**)」。審計 #4 / #5 連續把整格記為「未取得實據」。
**本次逐處讀了程式碼**：

| 子項 | 實據 | 判定 |
|---|---|---|
| **security headers** | `apps/api/src/bootstrap/security.ts:103-123` 明確設定 helmet（`hsts: { maxAge: 31_536_000, includeSubDomains: true }`）+ **Permissions-Policy**（helmet 沒有的那一個）· `apps/web/next.config.ts:33` 同值 HSTS · CH-012 的常駐負面測試 `security.spec.ts:65-91` 逐條對照 `16` | ✅ **已明確設定，且有會叫的守衛** |
| **management-port exposure** | `main.ts:58-60` `port = API_PORT ?? 3210`、**`host = API_HOST ?? '127.0.0.1'`**（不是 `0.0.0.0`）· `Dockerfile:97,111` 單一 `EXPOSE 3210` | ✅ **已明確設定**（預設值是收斂的那一個，非平台預設）|
| **TLS / cert** | ⛔ **本 repo 內結構上零標的** —— 沒有 IaC（義務已移交 infra team，`AD-IaCEvidence-1`），ACA ingress 的 TLS 終結不在版控中 | ⛔ **仍無實據，而原因與 #3 相同** |

⇒ ⭐ **「未取得實據」這句話連續四次涵蓋了兩件性質完全不同的事**：兩個**已經做完並且有負面測試守著**的子項，
和一個**本專案結構上無法取得證據**的子項。把它們綁在一格，讓前兩者連續四次被算進「還沒查」。
⚠️ **判讀仍不變**（第 5 項作為整體仍是「部分」），但**理由從「沒人去查」變成「有一個子項不是本專案能關的」**
—— 那是 R7 的形狀，不是懈怠的形狀。

**M0 永遠不會靠本專案自己關掉**這個結論**維持不變**（#3 無標的、#2 的 DAST 需 infra team、
現在再加上 #5 的 TLS 子項）。

</details>

⇒ ⭐ **審計 #6 那個結論，本次有一半被推翻**：#3 已經**不是**「本專案結構上無法取得證據」——
今天它是我們自己的工作。**M0 仍不會靠本專案單方面關掉**（#2 的 DAST + #5 的憑證仍卡外部形狀），
**但阻塞面從三處縮到兩處。**

### 2.6b 五個 `closed_partial` —— 四個是對的，一個 detector 結構上看不見

| Phase | 判定 | 實據 |
|---|---|---|
| **W01** | ✅ 仍然是對的 | `AD-ImageDigest-1` 仍在 §Open（base image 釘的是 tag 不是 digest）|
| **W14** | ✅ 對的 | `checklist` 1.3 刻意維持 `🚧`，解封條件與 `AD-PolicyAttestationFlag-1` 都寫下來了 |
| **W15** | ✅ 對的 | 理由只有一個且明寫：**AC-2 從未被驗證** |
| **W20** | ✅ 對的 | 全片回退，淨產出 0 行 |
| **W21** | ✅ **新的，且理由具體** | **US-2 / AC-3 一行未寫**（CI 沒有 Azure 身分）+ AC-4 的乾淨-RG 半邊無法驗證 |

⭐ **審計 #6 的 `AD-19`（W05 一致地過時）已於 2026-08-16 處置** —— frontmatter 改 `closed`，
原措辭以刪除線保留並補上逐條解封實據。**本次複驗未再漂移。**

⛔ **而那條缺口本身仍未關**：`check_status_markers` 的 E1/E2 比對的是 frontmatter 與內文
**彼此**是否一致 —— **抓得到不一致，抓不到「一致地過時」**。
審計 #5 提的候選守衛（plan 是 `closed_partial` 而 checklist 內不存在任何未勾的 `[ ]` 即 fail）
**仍未建**，而它現在有 **5 個資料點**可以驗收，其中 W20 / W21 兩個是新的正面樣本。

### 2.7 ⚠️ 漂移發現（AD-27 ~ AD-44）

> ⚠️ **編號續審計 #6 的 AD-26 之後**（依 §6 第 6 條，取 §3 歷史表的最大號而非上一份快照的）。
> ⛔ **每一條都經我自己重讀原文**，agent 的回報不直接採用（見 §2 涵蓋聲明）。

**⭐ 本批的共同形狀：ADR 層完全沒有跟上 W15–W21。** 18 條裡 **8 條**落在 ADR
（AD-27 · 28 · 29 · 30 · 40 · 42 · 43 · 44），而根因是一個**結構缺口**而非八次疏忽：
**phase closeout 的檢查表沒有一格是 ADR**（`RISK_REGISTER` 有那一格，是審計 #3 的 `AD-12b@#3` 加的）。

| AD | 漂移 | 實據 |
|---|---|---|
| **AD-27** ⭐⭐ | **`ADR-0011:117-119` 仍寫「this project authors **no IaC** and has **nothing of its own to scan**」，而 `CH-041` 今天讓它變成假的 —— 且 CH-041 自己的表格**列出了這一行**當受影響處，然後沒有修它** | `ADR-0011:117-119` 原文 vs `CH-041:21` 的受影響清單含 `ADR-0011:119`。⇒ **一次修復動作列出了自己的漏網**；`CH-010` 拿到了前向指標，ADR-0011 兩者皆無 |
| **AD-28** ⭐ | **`ADR-0003` 對稽核覆蓋的敘述錯了一個數量級** —— 寫「`AUDITED_MODELS` holds **exactly one** name … coverage is **1 of 21**」 | `0003:127-128` vs 當場導出 **16 / 34**（`audit.module.ts:82-99` 逐名讀出 16 · `^model` 35 減 `AuditLog`）。⚠️ 該 ADR 自己交代「R4 must be read as *first mitigation*」—— 而那句忠告現在建立在一個過期一個數量級的數字上 |
| **AD-29** ⭐ | **`ADR-0003` FC4 的「現況」欄寫「Cannot happen — no roll-up endpoint exists until M8」，而 roll-up principal 今天就用得到，且拒絕已被逐字量到** | `0003:155` vs `dev-principal.ts:109` `rollUp: process.env.DEV_PRINCIPAL_ROLLUP === 'true'`（`.env.example` 今天也補上了）· `audit.module.ts:66-70` 記錄 `UnattributableWriteError … the scope names 2 entities`。**條件如設計般開火了（好消息），而 ADR 是它自己這件事最不準確的紀錄** |
| **AD-30** ⭐⭐ | **`ADR-0001` 與 `ADR-0007` 仍以現在式談 Azure China，而它十天前就隨 ADR-0010 移出範圍** —— 附帶損害的取代是**單向的**：0010 知道，兩個被取代的子句不知道 | `0007:90-92`「**Two identity planes** … **M4 must define** how the six roles are provisioned in each」· `0007:21` · `0007:135` · `0001:38` · `0001:149`。ADR-0010 把這筆帳記在**自己**身上（`0010:125-133`），⇒ 只有讀 0010 的人知道。**M4 規劃時讀到 `0007:90` 會得到一條建造兩套身分平面的指令**  ⭐ **✅ CLOSED 2026-08-19（W23）—— 只關掉 `ADR-0007` 那半**：0007 已被 **ADR-0015** 取代（`14-adr/README.md:143` 的取代流程：舊檔**只改 Status 一行**，內文原封保留），而 0015 全檔零 Azure China 現在式敘述、明寫 two identity planes `gone, not inherited`。⚠️ **`ADR-0001` 那半仍未處置** —— 那是另一份 ADR，見 plan §9 |
| **AD-31** ⭐⭐ | **`decision-form.md` 宣稱四個法律問題「均未經複查」，而它在同一句話裡連結的 `ADR-0010`（已採納）寫著那四個問題 moot、`AD-Decider-1` closes** | `decision-form.md:31-34` vs `ADR-0010:115-116` vs `BACKLOG.md:472`（「✅ 已消滅」）。⇒ 審計 #6 `AD-22` 的第四層：**這次它把正確答案的連結放在錯誤陳述的同一句裡** |
| **AD-32** ⭐ | **`RISK_REGISTER` 的 header 對自己的列做了一個假陳述** —— `:9` 寫「R1/R2/**R5/R6/R7**/R8 仍停在 2026-08-10」，而 R5/R6 是 2026-08-17、R7 是 2026-08-18 | `:5` `Last Reviewed: 2026-08-16（W17 closeout）` vs `git show -U0`：W18 `4cdefc0`、W19 `0d3e7f0`、W21 `3b55acb` **三次都只改列不改 header**。⛔ **最後那一次是我今天做的** —— 本條的最新一個資料點由本 session 貢獻 |
| **AD-33** ⭐ | **`DEFERRED_REGISTER` 內容自 2026-08-12 未動，跨 9 個 phase** —— 而 `AD-RegisterUpkeep-1` 預測的正是這件事，守衛從未建 | `DEFERRED_REGISTER.md:6` `Last Reviewed: 2026-08-12（審計 #4）`；`git log` 最後一次內容變更 2026-08-12（08-13 那次是審計改號）。⇒ 審計 #5 / #6 兩次都沒碰它 |
| **AD-34** ⭐⭐ | **一條 🔴 P0 在 ROADMAP 四張表上零落點** —— `AD-LocalPasswordFallback-1`（W19 開立，stakeholder 要保留本地密碼登入 vs **已採納**的 ADR-0007） | `ROADMAP.md` 全檔對該 ID **0 命中**（我自己 grep 過）· `BACKLOG.md:390` 🔴 P0。⇒ **`AD-21` 的失效模式換一個成員再演一次**，而 `ROADMAP:154-155` 自己就寫著「找不到落點的那一條，就是下一次審計的 AD-21」 |
| **AD-35** | **ROADMAP 的 P0 名單反方向也 stale** —— `AD-Mockup-3` **已由 W19 關閉**卻仍列 🔴 P0；`AD-Mockup-2` **已降 P1** 卻仍列 🔴 P0 | `ROADMAP:134` · `:153` vs `BACKLOG:459`（W19 關閉 `AD-Mockup-3`，§Open 已無此列）· `BACKLOG:270` 優先度欄 `🟡 P1`。**兩個方向的 stale 住在同一列** |
| **AD-36** ⭐⭐ | **ROADMAP 沒有任何一列對應前端或部署工作流** —— W19（30 畫面）· W20（回退）· W21（部署）在全檔只以**散文**出現在第 9b 列 | `ROADMAP` 主線 10 個編號項全是 M1 資料層 + 治理 detector；第 4 列 slice 歷史正確地停在 W18。⛔ `AD-Mockup-Responsive-1`（**使用者自己提的需求**）全檔 **0 命中**。⇒ **今天讀 ROADMAP 問「先做哪個」，答不出任何跟瀏覽器有關的事** |
| **AD-37** | **BACKLOG 內部三處「一半說 A、另一半說 B」** | (a) `AD-DesignNoteAnchor-1`：`:338` 說 9b「⬜ 已排定」vs `:461` 說已裁決（ROADMAP 標 ✅）· (b) `AD-IaCEvidence-1`：`:326` 說「本專案沒有 IaC 可掃」vs `:461` 說 `CH-010:51` 已不成立 · (c) ⭐ **檔頭 `:13-15` 說審計 #6 的六條「⏳ 未處置」，而 `:474` 自己記著其中兩條的處置**（審計 #5 `AD-17` / #6 `AD-22`，2026-08-15），`ROADMAP:12` 亦記著 `AD-21` 的處置 ⇒ **本檔 §2.7b 複驗六條皆已處置**。⚠️ **本次刻意不修**（§5：審計只揪不修）|
| **AD-38** | **W20 在 §Shipped Phases Pointer Index 上完全沒有列**，而該節規則是「每個完成的 phase 一行」 | `BACKLOG:423-462` 逐列：W01–W15 · W18 · W19 · W21 有列，**W20 沒有**；而 W20 在同檔 `:53`/`:58`/`:241` 等處出現 ⇒ 不是不知道它，是**獨獨漏在索引上** |
| **AD-39** | **ROADMAP 的 header 比自己的內文舊三天三個 phase** | `:7` `Last Modified: 2026-08-15`、MHist 最新一條同日；而 `:88` 帶著 `**W21（2026-08-18）—— 裁決**`。⇒ 與 **AD-32** 同形，發生在另一份追蹤文件上 |
| **AD-40** ⭐ | **ADR-0008/0009 的「Wave 3」延後標籤已部分失效，而沒有東西在看** —— `CH-010` 已因「ISMS AI agent」把 **Azure OpenAI 由「不需要」改為要申請** | `CH-010:80-82`（並自己註明「**ADR-0008 / 0009 仍未拍板**」）vs `14-adr/README.md:109-110` 只寫 `Wave 3`。⇒ README 自己的 forcing-function 判準第一條就是「**外部動作需要這個答案**」，而資源申請單就是外部動作 = `AD-DeferralUnwatched-1` 的形狀 |
| **AD-41** | **OQ-8 的「為什麼現在要決定」前提已死** —— 寫「ADR-0009 與 **OQ-1 耦合**，若 OQ-1 選了分區，agent 也必須能分區」，而 OQ-1 早已改為單一區域 | `decision-form.md:20` vs **同檔 `:44`**（2026-08-08 單一區域 × 3 環境）。⇒ 又一條「矛盾兩半住在同一份文件裡」 |
| **AD-42** | **`ADR-0010:91` 把「scanned IaC」當成保留下來的性質** —— 寫這句時是**空真**（沒有 IaC），今天是一個**可檢查的合規宣稱** | `0010:90-92` vs `CH-041:96-99`（落地當天實測零掃描器覆蓋）。⚠️ 今天已量到 `bash 4 rules / 1 file`，所以宣稱**現在成立**了 —— 但那是巧合不是該 ADR 的功勞，且 4 條規則的厚度未被論證 |
| **AD-43** | **`ADR-0007` 的可證偽條件一條不可能觸發、一條數字過期** | FC2（`0007:112-113`）以「Azure China instance 無法同步 role 定義」為條件 —— **那個 instance 不存在**，條件永遠不會 fire；FC1（`0007:107-108`）寫 `14 OpCos`，真值 **13**（`0010:106` · CLAUDE.md 已確認參數 4/12） ⭐ **✅ CLOSED 2026-08-19（W23）**：ADR-0015 的可證偽條件重寫為 **5 條，每條帶 `*Fires when*:`**。FC1 數字修 14→**13**；FC2（Azure China）**刪除並留下理由**；⭐ **原 FC3「group IT 改用別的 IdP」原封保留** —— `AD-43` 漏點名它，而它是 0007 唯一還會 fire 的一條，全部重寫會把唯一健康的那條一起丟掉 |
| **AD-44** | **`14-adr/README.md` 的索引衛生** —— (a) header `Last Modified: 2026-08-07` 而索引含 2026-08-14 採納的 ADR-0003，**且全檔無 Modification History**（違反 `file-header-convention.md`）·(b) `:100-101` 說 0003 已採納而 `:117` 仍稱它是「有主題的**預留**」·(c) `:85` 一個空行把索引裂成兩張表，**最新的 ADR-0014 掉在表外** ·(d) 索引未依編號排序（0005 排在 0011 後） | 逐項 `file:line` 如左 |

<!-- 以下為審計 #6 的原始漂移表，保留 —— BACKLOG 檔頭與 `AD-DualLayerHighRisk-1` 的來源欄都引用「§2.7」 -->

### 2.7b 審計 #6 的 AD-21 ~ AD-26 —— **原文保留**

> ⚠️ 六條的處置狀態：**AD-21 於 2026-08-15 同日處置** ·
> **其餘五條於 2026-08-16 隨 W15 的第一個 commit 夾帶**（兩份裁決見下方引用區塊）。
> **本次（#7）逐條複驗：六條皆未再漂移。**

**審計 #5 的 AD-17 ~ AD-20 處置複驗** —— ⛔ **四條裡只有一條被處置**：

| AD | 現況 | 實據 |
|---|---|---|
| **AD-17** | 🟡 **一半處置** | `14-adr/README.md:103` 已改為「剩餘 3 份」✅；`BACKLOG.md:300` 仍寫「其餘 **3** 項開放決策（OQ-4/7/8）」❌。⚠️ 而它的**第三處**本次才被發現（AD-22）|
| **AD-18** | ❌ **未處置** | `CH-029-w12-audit-trail.md:13` = "**nineteen** business tables" · `design-notes/W12-audit-trail.md:25` = 「**19** 張表」。正確值是 20。⚠️ **跨 W13 / W14 兩個 phase 未動** |
| **AD-19** | ❌ **未處置** | W05 `plan.md:2` 仍 `closed_partial`（見 §2.6b）|
| **AD-20** | ✅ **已處置** | `BACKLOG.md:6` `Last Modified: 2026-08-15`，與 `git log -1 --format=%ad` 的 2026-08-15 相符。⚠️ **但是被 W14 closeout 順手改對的，不是被誰回頭修的** —— `AD-RegisterUpkeep-1` 的 detector 仍未建 |

⭐ **本次六條的共同形狀**：審計 #5 是「條件成立了而沒有人回頭翻」＋「closeout 自己造成的」；
本次是 **「一個手寫的摘要值，與它自己那一列／那一份文件的內文相矛盾」（4 / 6）**。
⚠️ 值得單獨說的是：這四條**全部不需要跨文件比對就能看見** —— 矛盾的兩半住在同一列或同一段裡，
而它們仍然活了下來。

> ### ✅ 處置 — AD-21 已於 2026-08-15 同日處置（使用者裁決）
>
> **下表 AD-21 的「漂移」與「建議」欄刻意保留原文**（§4 硬紀律二）。
>
> **裁決**：六條裡**只修 AD-21**，其餘五條夾帶進下一個 phase 的第一個 commit。
> 理由是 AD-21 是唯一一條**會讓下一次判斷出錯**的（兩條 P0 不在任何排序面上，
> 其中一條是已量出來的資料層 oracle）；其餘是純文字更正，便宜到會誘使人把它當成「有進度」。
>
> | 落點 | 動作 |
> |---|---|
> | `ROADMAP.md` §刻意不進排序的 P0 | 「第 5 條 P0」這個**手寫計數器整句移除**，改為**逐條列名的表** —— `AD-NegativeGate-1` + `AD-NarrowPatternWideClaim-1`，各帶「為什麼不排順序」。⭐ **不寫數字**：不寫數字的清單漂不動 |
> | `ROADMAP.md` 主線 **新增 4d** | `AD-UniqueKeyOracle-1`，前置條件 = **下一個 M1 slice 的 Day 0**（在建新表之前）。理由寫進該列：唯一索引不受 RLS 管且早於複合 FK，slice 10 還有 13 張表會複製同一形狀 |
> | 同上，該列自帶限制 | ⛔ **本列明寫「進了 ROADMAP 不等於它會被做」** —— `AD-CountBeforeLastEdit-1` 已量到「ROADMAP 的列不是 checklist 的列」（`check_backlog_counts.py` 在 W09 / W10 各漏一次）。⇒ 它必須在下一個 phase 的 `checklist.md` 上有一個 `[ ]` |
>
> ⛔ **刻意沒做的**：**detector 未建**。審計建議的「比對 §Open 的 P0 集合與 ROADMAP 的收容集合」
> 今天仍是靠人讀 —— 今天的落點是對的，只是不是機械保證的。
> ⇒ 這與 `AD-12` 的處置形狀相同（「兩個活面改對了，導出機制未建」），
> 並且它應該併進 **ROADMAP 第 9 列**那條 detector 的範圍，而不是再開一條。

> ### ✅ 處置 — 其餘六條於 2026-08-16 隨 W15 的第一個 commit 夾帶（使用者裁決）
>
> **下表六條的「漂移」與「建議」欄刻意保留原文**（§4 硬紀律二）。
>
> | AD | 落點 | 動作 |
> |---|---|---|
> | **AD-17** | `BACKLOG.md` §Pending Decisions | ⭐ **改結構不是改數字**：整格不再寫數字也不列 OQ 編號，只留指向 `decision-form.md` 的指標。原文在**複製**該檔內容（違反 §5），而副本必然晚一步 —— 審計 #2 的 `AD-8` 已證明「只改數字」無效 |
> | **AD-22** | `decision-form.md:22` | 「剩下三項」→「上表兩項」，並把**教訓寫在句子裡**：一份文件可以同時是某事實的權威來源、又對同一事實記錯 |
> | **AD-18** | `design-notes/W12-audit-trail.md:25` | 19 → **20**，並在原地留註解記下「一次更正的 pattern 必須是**錯的值**，不是它出現的句型」。⛔ **`CH-029:13` 刻意不改** —— 已 merge 的 change record 是歷史快照，本專案不回頭改其內文（`CH-022:190` 先例）；design note 是**活參考**所以改（審計 #4 `AD-16` 處置的同一個分野）|
> | **AD-19** | `W05/plan.md` frontmatter + 內文 | `closed_partial` → **`closed`**。原措辭以刪除線**保留不覆寫**，並補上逐條解封實據（`asset.int.spec.ts` 測試 2/3/3b/6/6b/7/8，由 `8eb8897` 加入）。⚠️ `check_status_markers` 仍綠且仍沒錯 —— **detector 抓不到「一致地過時」**，缺口未關 |
> | **AD-23** | `RISK_REGISTER` R4 狀態欄 | ⭐ **不再寫死分數**，改為寫出兩條可重跑的導出指令（分子 = `AUDITED_MODELS` 字串數 · 分母 = `check_entity_index.py` 的 `models in schema.prisma` 減 1）。2026-08-15 導出值 **16 / 22** 標明是「量級參考，不是待維護的值」 |
> | **AD-25** | `RISK_REGISTER.md:5` | 拆成 (a) W13 (b) W14 兩次複查，並**明寫 R1/R2/R5/R6/R7/R8 仍停在 2026-08-10**（跨十個 phase）—— 本檔不假裝那六條被看過 |
> | **AD-26** | `BACKLOG.md` §Shipped W13 列 | 補上 `MERGED (PR #61, 91bd789)` |
>
> ### ⛔⭐ 而 AD-26 在被寫下來的同一天就再發生了一次，是我造成的
>
> 我在 2026-08-15 為 `CH-032` 寫 §Shipped 那一列時，**同樣漏掉了 `MERGED (PR #66, sha)`** ——
> 而 §Shipped 的其他 CH 列（例如 `CH-027`）全都有。**成因與 W13 那次完全相同：
> 寫那一列的時候 PR 還沒 merge。**
>
> ⇒ 這把 AD-26 從「一次疏忽」升級成**結構性的時序問題**：
> **§Shipped 的列在 closeout 時寫，而 merge 永遠發生在 closeout 之後。**
> 於是那一格在被寫下的當下**必然**是不完整的，而補完它需要一次沒有任何東西會提醒的回頭。
> ⛔ **修法因此不是「記得回頭補」** —— 那正是它已經失敗的地方（W13 有 post-merge 重指的 PR #62，
> 那次回頭也沒補這一格，因為重指找的是「舊 SHA → 新 SHA」，而**這一格根本沒有 SHA 可被替換**）。
> ⇒ 候選守衛：§Shipped 的每一列若含 `PR #N` 就必須同時含一個**在 main 上解析得到**的 SHA。
> 併進 **ROADMAP 第 9 列**那條 detector 的範圍（它已經在做 `git merge-base --is-ancestor` 的檢查）。
> 兩處已於 2026-08-16 補齊（`91bd789` / `52a74ac`），⚠️ **但機制仍未建**。

| AD | 漂移 | 實據 | 建議 |
|---|---|---|---|
| **AD-21** | ⭐⭐ **有 2 條 🔴 P0 在 `ROADMAP` 的四張表上完全沒有落點，而 `ROADMAP` 存在的全部理由就是收容這種項目** —— `AD-UniqueKeyOracle-1`（W10 量出的 existence oracle，違反約束 8 的「查無資料一律 404」）只在 item 4 的**歷史敘述文字**裡被提及為「P0 候選」；`AD-NarrowPatternWideClaim-1` **全檔零命中**。⛔ 而 `ROADMAP:126` 寫「**第 5 條 P0** 刻意不在本表」—— 那是一個**手寫計數器**，真值是 **7** | `ROADMAP.md` 對三個 P0 ID 的全檔命中：`AD-UniqueKeyOracle-1` **只在 `:77`**（item 4 的 W10 段落內文，非任何表列）· `AD-NegativeGate-1` 在 `:126`（有明確解釋為何不列）· `AD-NarrowPatternWideClaim-1` **0 命中**。四張表逐列讀過：主線 10 項 · 死線 1 項 · 等外部 2 項 · 押後 3 項 = **收容 6 條 AD**，而 P0 有 7 條 | ⛔ **這正中 `ROADMAP.md:45-50` 自己記錄的失效模式**：「有解封條件、有前置依賴、有死線的項目，必須出現在一份**會被讀**的清單上，而不只是 N 條備註裡的一句話」（`AD-5`）。⚠️ **修法不是加兩列就好** —— 「第 5 條 P0」是第三個被發現的手寫計數器（前兩個：實體數 AD-12、表數 AD-18/AD-23）。應改為**不寫數字**，只寫「不在本表的 P0 及其理由」，或由 detector 比對 §Open 的 P0 集合與 ROADMAP 的收容集合 |
| **AD-22** | **`decision-form.md:22` 的「剩下三項」與同一份文件的表格（2 列）相矛盾，而同一段的下兩行自己寫著 OQ-4 已拍板** —— 這是 AD-17 的**第三處**，審計 #5 沒掃到 | `decision-form.md:19-20` = OQ-7 / OQ-8 兩列 · `:22` =「⚠️ **剩下三項**的「誰能決定」仍未指定」· `:24` =「**OQ-4 於 2026-08-14 由 W12 spike 拍板**」—— **三句話在同一個畫面內** | ⚠️ 與 AD-17 是同一次修正的兩半，應**同時**改。⛔ **教訓在掃描範圍**：AD-17 的實據欄列了 `decision-form.md` 作為**對照組**（「它已拍板」），於是它被當成了正確的一方 —— 而錯的是它的**敘述段**不是它的表格。⇒ **一份文件可以同時是某個事實的權威來源、又對同一個事實記錯**；引用它當對照組時要讀完整份，不是只讀被引用的那一格 |
| **AD-23** | ⭐ **`RISK_REGISTER` R4 的狀態欄與同一列的內文互相矛盾** —— 狀態欄寫「覆蓋 1 / 21 → **15 / 21**」，而同一列的內文寫「**W14 是這條緩解的第一次實戰驗證**：新增**第 16 個**模型時…」「**16 個**寫入仍全是 create」。機械真值是 **16 / 22** | `RISK_REGISTER.md:23`（同一列的「緩解」欄 vs「狀態」欄）· `AUDITED_MODELS` 逐個名字讀出 = **16** · `check_entity_index.py` 印出 `models in schema.prisma: 23`，減 `AuditLog` = **22** | ⚠️ **`AD-RiskTableCountManual-1` 的第 2 次實地擊中**（第 1 次是 W12 closeout 把 18 更正為 21）。⛔ **修法不是再改一次數字** —— 該 AD 自己已經寫了正解：讓該列**引用 `check_entity_index.py` 的輸出**，而不是逐 phase 手寫累加。⭐ 本次它升級了一件事：這一次分子**和分母都動了**（W14 同時加了一張表和一個稽核名字），所以「只改分子」也會錯 |
| **AD-24** | **`DEFERRED_REGISTER.md` 的 `Last Reviewed` 停在 2026-08-12，而審計 #5 在 2026-08-14 明明逐條複查過** —— 那次複查的結論寫在 `STATUS_AUDIT.md` §2.7 的註腳裡，**但沒有回填到被複查的文件上** ⇒ 從該文件本身看，它停更**跨 W08–W14 七個 phase** | `DEFERRED_REGISTER.md:6` = `Last Reviewed: 2026-08-12（審計 #4 …）` vs `git log -1 --format=%ad` = **2026-08-13**（檔案在該日被改過）vs 審計 #5 的 §2.7 註腳「本次逐條看過 D001 / D003 / D004 / D005 的恢復條件皆未成立」（2026-08-14）| ⭐ **這條的形狀比 AD-14 更尖銳**：AD-14 是「沒有人複查」，本條是「**複查了、結論是對的、而複查這件事本身沒有留下痕跡**」。⇒ 下一次審計（就是本次）除非讀 `STATUS_AUDIT` 的內文，否則會把它判成停更七個 phase 而重做一次。⛔ **修法是把「回填 `Last Reviewed`」寫進 `/status-audit` 的收尾動作**（現在收尾只要求回填本檔自己的 `last_audit`），不是提醒自己記得 |
| **AD-25** | **`RISK_REGISTER.md:5` 的 `Last Reviewed` 把 2026-08-15 的複查歸給「W13 closeout」，而 W14 closeout 也改了 R3 / R4 兩列** —— 兩個 phase 在**同一天**收尾，所以日期是對的、**歸屬是錯的**，而任何日期檢查都發現不了 | `RISK_REGISTER.md:5` = 「2026-08-15（**W13** closeout —— R4 覆蓋 1/21 → 15/21…其餘七條逐條看過無變化）」vs R3 欄內文含「⚠️ **W14 複查**：敞口形狀有一項需要寫下來」· R4 欄內文含「⭐ **W14 是這條緩解的第一次實戰驗證**」· W14 的 `progress.md:484` 明列 closeout 產出含「`RISK_REGISTER.md`（**R3 / R4** 兩列）」 | 🟢 低嚴重度，但**形狀值得記**：這是 AD-20 的變體 —— 那次是「日期沒跟上」，這次是「**日期對了而歸屬錯了**」。⚠️ 連帶一個真的缺口：header 說「其餘七條逐條看過無變化」是 **W13** 的陳述，而 W14 只複查了 R3 / R4；**R1 / R2 / R5 / R6 / R7 / R8 的「最後複查」欄仍是 2026-08-10**，跨 **W05–W14 十個 phase** |
| **AD-26** | **`BACKLOG.md` §Shipped 的 W13 列缺 MERGED 標記與 merge SHA，而同表其餘 14 列全都有** —— 寫的是「PR #61，`closed`」，而 PR #61 已於 2026-08-15T07:22:07Z merge 為 `91bd789` | `BACKLOG.md:285` = 「— PR #61，`closed`」vs `:286`（W14）= 「— **MERGED (PR #63, `e9ab83a`)**」vs `gh pr view 61` = `MERGED 2026-08-15T07:22:07Z 91bd789`。**同表 15 列逐列比對，只有這一列缺** | 🟢 低嚴重度但**成因值得記**：W13 closeout 寫這一列時 PR #61 **還沒 merge**，所以寫了當時為真的措辭；而 W13 有 post-merge 重指（PR #62 改了 11 個 SHA），**那次回頭卻沒有補這一格** —— 因為重指的 pattern 是「舊 SHA → 新 SHA」，而這一格**根本沒有 SHA 可以被替換**。⭐ **一次「重指」掃不到一個從未存在的引用** —— 這是 `AD-DesignNoteAnchor-1` 的補集，同一個 detector 應該一併看 |

### 2.7c 審計 #4 的 AD-12 ~ AD-16 原始表 —— **刻意留在 §2 而不壓進 §3**

> §3 的規則是「舊快照精簡成 3-5 行，**不要保留全文**」，本節是**有記錄的例外**：
> `BACKLOG.md` 有**兩處**引用 `STATUS_AUDIT.md §2.7` 指名 AD-12 / AD-14
> （檔頭的審計指標 · `AD-DualLayerHighRisk-1` 的來源欄），壓縮或搬走會讓那兩個引用懸空。
> ⭐ **製造一個懸空引用來遵守一條排版規則，正是本檔存在要防的那件事。**
> 解封條件：那兩處引用改為指向 §3 的歷史列之後，本節可壓縮。
>
> 以下**原文一字未改**（§4 硬紀律二）。

> ⛔ **這五個編號與審計 #3（2026-08-10）的 AD-12/12b/13/14 重疊，且指的是不同的事。**
> 需要區分時寫 `AD-12@#4` / `AD-12@#3`。對照表在 §3.1。

> **審計 #2 的 AD-7 ~ AD-11 全部已處置**（2026-08-10 同日）。本次逐一複驗**未再漂移**：
> §Open 列數與實際數相符 · 負面 gate 計數仍集中在 `BACKLOG.md` 一處 ·
> R3 剩餘缺口仍只列 `AD-PoolerScope-1` · Pending Decisions 仍是 3 項 ·
> `CLAUDE.md` 已無 0006 誤列。**AD-8 的「改結構而非改數字」處置經四個 phase 驗證有效。**

⭐ **本次五條的共同形狀與上次不同。** 審計 #2 的五條全部是「剛做完的收尾沒推到底」；
本次有 **三條是「計數器沒有機械推導」**（AD-12 · AD-13 · AD-15），
而且其中兩條**橫跨多個 phase 沒有人察覺**。

> ### ✅ 處置 — AD-14 已於 2026-08-12 同日拍板（使用者）
>
> **下表 AD-14 的「發現」與「建議」欄刻意保留原文**（§4 硬紀律二）。
>
> **裁決**：D002 / OQ-3 選項 C 的恢復條件是「**證據表出現**」，**不是** M3 里程碑。
> W07 建了 `evidence` → **條件成立，D002 恢復**。
>
> | 落點 | 動作 |
> |---|---|
> | `DEFERRED_REGISTER.md` D002 | 標 `已恢復 → BACKLOG`（**不刪列**，規則 3）+ 錨點 `:197` → `:212`（AD-16 同時關閉）|
> | `DEFERRED_REGISTER.md` frontmatter | `Last Reviewed` 2026-08-10 → **2026-08-12**，四條未成立者已逐條看過 |
> | `BACKLOG.md` | 新增 `AD-DualLayerHighRisk-1`（🟡 P1）|
> | `decision-form.md` OQ-3 | 選項 C 那句同步標解封 —— **兩處寫同一個條件正是 AD-10 的病**，這次同時改 |
>
> ⛔ **只做登記，不開工**：ADR-0004 否決 C 的實質理由是「一個不可證偽的防護層就是 AP-3」，
> 所以第一步是**定義第二層要抓什麼 RLS 抓不到的東西**，不是直接寫程式。
>
> ### ✅ 處置 — AD-12（部分）與 AD-16（部分），2026-08-12 同日（使用者裁決）
>
> | AD | 做了什麼 | **刻意沒做什麼** |
> |---|---|---|
> | **AD-12** | 兩個**活的導航面**改為機械真值 **12/35**：`CLAUDE.md` Current-Phase 格 · `ROADMAP.md` 主線第 4 列。⚠️ 只改 `CLAUDE.md`（原本的請求範圍）會讓兩個活面互相矛盾 —— **那正是本條的病**，故一起改 | ⛔ **導出機制未建**（今天的 12/35 仍是人算的，只是算對了）· `CH-022:190` 的 8→10/35 **未改**（已 merge 的歷史快照）→ `AD-EntityCountDerivation-1`，**排 slice 5 Day 0** |
> | **AD-13** | 無 | 全部 → `AD-EntityIndexIncomplete-1`，**排 slice 5 Day 0**（與上一條同一個 detector）|
> | **AD-16** | `design-notes/W02-entity-scope-rls.md:32` 的錨點 `:197` → `:212`，並補上「條件已解封」的指標（**活參考該準**）| ⛔ **`ADR-0004:57` 未動** —— 已採納的 ADR 不回頭改內文（`AD-OpensslClaim-1` 先例），**留給 ROADMAP 第 9 列的 detector 當驗收命中** |
>
> **AD-15 無需處置** —— 錯的是審計 #2 的報告，本次已改用 `git ls-files` / `git ls-tree` 導出。

| AD | 漂移 | 實據 | 建議 |
|---|---|---|---|
| **AD-12** | ⭐⭐ **Wave 1 實體計數在每一份文件都是錯的，而且各處互相矛盾**。機械真值 **12 / 35**（11 共用核心 + 1 基礎服務）。⛔ **我在 W07 closeout 親手把錯的數字寫進了 `CH-022` 與 `CLAUDE.md`** | `schema.prisma` `^model` = **13**；扣掉不在索引上的 `RefCodeCounter` = 12 落在索引內。vs `CH-022:190`「8 → **10** / 35」· `CLAUDE.md` Current Phase「**10**/35」。⚠️ **W06 當時兩份文件就已互相矛盾**：`git show 3a3606b:CLAUDE.md` = 「**8**/35 實體；其餘 27 張表」而同一個 commit 的 `CH-021:189` = 「累計 8 → **9** / 35」 | ⭐ **不要只改數字** —— 那正是審計 #2 的 AD-8 已經證明無效的做法（同一個手動計數器寫在多處必然再漂）。應改為**由 `schema.prisma` ∩ `02a` §0 機械導出**，或**只在一處維護**其餘 link。⚠️ 這個數字出現在 CLAUDE.md 的 always-loaded 格子裡，錯的版本每個 session 都在被讀 |
| **AD-13** | **`RefCodeCounter` 存在於 schema 但不在 `02a` §0 索引上**，而該索引開宗明義寫「**Every entity in the platform** … Nothing is buildable that is not on this list; **adding an entity means adding a row here in the same change**」 | `schema.prisma` 有 `model RefCodeCounter`（建於 W04，`7251670`）；`02a` 全文對 `RefCode` 只命中 `:91` / `:105` / `:287` / `:313` 四處**欄位說明**，§0 三張索引表**零命中** | 補一列，或明確記錄它是「基礎設施表非領域實體、刻意不入索引」。⚠️ **兩者都可以，但必須擇一寫下** —— 現狀是索引宣稱自己完整而事實上不完整，這讓 AD-12 的分子永遠算不準 |
| **AD-14** | **`DEFERRED_REGISTER.md` 停更四個 phase，而其中一條的恢復條件已字面成立**。D002（ADR-0004 選項 C 雙層強制）寫恢復條件為「**稽核 / 證據 / 事件表出現時**（M3）」—— **W07 建了 `evidence`** | `DEFERRED_REGISTER.md:6` `Last Reviewed: 2026-08-10`，其後 W04/W05/W06/W07 四個 phase 收尾皆未複查（對比 `RISK_REGISTER.md` 本次已更新為 2026-08-12）。`schema.prisma` `model Evidence` 存在。同一條件亦寫在 `decision-form.md:45`（OQ-3 選項 C「延後至 M3（稽核/證據表出現時才有標的）」）| ⚠️ **判定需要人**：字面條件成立（證據表存在），但括號的「（M3）」指向的是里程碑而非單一張表，而 M3 未到。**這正是 §0 列的「Deferred 解封條件過期」失效模式** —— 兩份文件寫同一個條件、四個 phase 沒人回頭翻。⛔ 審計不代為判定 |
| **AD-15** | **審計 #2 自己的報告帶了一個錯的計數** —— §2.10 第 6 項寫 i18n「**7 檔**」，而它自己的基準 `bf3133e` 當下就是 **5 檔** | `git ls-tree -r --name-only bf3133e -- apps/web/src/i18n/` = **5**；`git log --diff-filter=D -- apps/web/src/i18n/` = **零刪除紀錄**，故「曾有 7 檔後來刪了 2 個」被排除 | ⚠️ **本檔 §4 硬紀律三要求「輸出必須帶實據」，而這一格沒有** —— 一份審計報告若自己的計數是錯的，讀的人沒有辦法發現。本次已改為 `git ls-files` 導出。**這是 `AD-GrepAssertion-1` 在審計自身的第二次再現**（審計 #2 也記過一次，見該節 ⚠️ 自我修正） |
| **AD-16** | **`multi-tenant-data.md:197` 這個錨點指向錯的內容，而且被引用了 3 次** —— 三處都說該行「指名高風險表三類（稽核／證據／事件）」，實際那一行講的是滾升風險 | `:197` = 「具體風險：滾升現在只是一個少了 `WHERE entity_id` 的查詢」；三類的實際位置是 **`:212`**（「高風險表（稽核軌跡 / 證據 / 事件）\| **兩者都用**」），偏 **15 行**。三處引用：`DEFERRED_REGISTER.md` D002 · `design-notes/W02-entity-scope-rls.md:32` · **`14-adr/0004-entity-scoping-enforcement.md:57`** | ⛔ **本列的原始版本只寫了 D002 一處，那是我掃描範圍過窄** —— 從 D002 的引用查起，沒有全 repo 反查同一個錨點。**這正是本檔 §4 硬紀律三警告的形狀，發生在審計自己身上**（與 AD-15 同一族）。**已修 1 處**（D002，因為 AD-14 的處置正在改寫那一列，留著已知錯誤等於明知而傳播）；**W02 design note 與 ADR-0004 兩處未動**。⚠️ ADR **已採納**，本專案慣例不回頭改其內文（`AD-OpensslClaim-1` / `AD-EslintSettingsClaim-1` 先例）—— 需要一次決定：註記 vs 不動。⭐ 三處合起來是 ROADMAP 第 9 列 detector 的**現成驗收命中**（連同 `02a:413` 與 W01 的兩個失效 SHA）|

### 2.8 優先序建議

⛔ **這是建議，不是決定。方向的排序權在使用者**（PROCESS R1：沒有 approved 的 pre-doc 不可寫 code）。

⭐ **本次與前六次都不同的地方**：**沒有死線了**（第一次），而且**沒有任何一條漂移會讓下一次判斷出錯**
（審計 #6 的 `AD-21` 是那種，本次 `AD-34` 雖同形但影響面小得多）。
⇒ **本次的排序不受任何一條漂移挾持** —— 這是本專案第一次可以純粹依價值排序。

⛔⭐ **而有一個事實必須先講，因為它直接決定使用者已表明的下一步是否可行**：

> **端到端垂直切片今天無法部署。**
> `apps/api` 在 `NODE_ENV=production` 下**結構上起不來** ——
> `policy.module.ts:35` 於**模組建構時**呼叫 `assertDevPrincipalAllowed()`，
> 而 `dev-principal.ts:74-76` 在 production 即 throw。解封點是 **M4（Entra ID）**，
> 而 M4 的前提是 **RIT 建三個 App Registration**（`ADR-0007` · `CH-010` 第 4 點）。
>
> ⇒ 垂直切片可以在**本機**被 drive-through，**但它到不了那個示範網址**。
> 那不是反對做它，是「做完之後 stakeholder 仍然只看得到 fixture」這件事要事先知道。

| 候選 | 論據 | 反論據 |
|---|---|---|
| **A. 端到端垂直切片（`risks`）** —— 使用者已表明 | ⭐ **這是唯一能關掉「30 個畫面全部餵 fixture」這個結構事實的選項**。W19 的 drive-through 抓到 25 個死控件，而那是在**沒有後端**的情況下 —— 接上真 API 會暴露的是另一類（範疇過濾、404 vs 307、錯誤路徑）。`risks` 的兩端最完整：後端有表 + 端點 + RLS + 稽核，前端有列表 + 詳情 + 新增 | ⛔ **只能在本機驗**（見上）· ⚠️ `AD-FrontendMissingIdRedirects-1` 說明白了：接上 API 的那一刻，「307 導回列表」從無害 UX 變成**約束 8 的違反**（洩漏 id 存在與否）—— 那必須同片修掉，不是後續 |
| **B. ADR 層的追認** | 本批 **8 / 18** 條漂移在這裡，且根因是**一個結構缺口**（closeout 檢查表沒有 ADR 那一格），一次補完 + 加那一格就關掉整族。⭐ 其中 `AD-30` 有實質風險：**M4 規劃會讀到一條建造兩套身分平面的指令** | ⚠️ 治理工作，吃 `CH-017` 每 phase 1 個的配額 · 多數是文字更正，便宜到會誘使人當成「有進度」 |
| **C. CI 部署身分（US-2）** | 解掉 W21 唯一的未交付項；讓部署不依賴任何一台特定機器 | ⛔ **卡外部或卡使用者** —— 需要 RIT 建 federated credential，或使用者提供 SP secret。**不是工作量問題，等不到就是等不到** |
| **D. `AD-LocalPasswordFallback-1`（🔴 P0）** | stakeholder 要本地密碼登入 vs **已採納**的 ADR-0007。⭐ **載體必須是 ADR-0007 的修訂**，而在它被裁決之前，任何登入頁的實作都可能白做 | ⚠️ 需要使用者與 stakeholder 的決定，不是執行工作 |

**建議：A 為主，B 夾帶，D 在 A 開工前先問一句。**

- **A 是對的選擇，理由不是「該做了」而是「它會抓到別的東西抓不到的」** ——
  本專案已經量過三次同一件事：gate 抓零件、中性化抓你想到要問的、**drive-through 抓你沒想到要問的**。
  接上真後端會產生第四類：**兩端對同一個概念的理解不一致**（範疇、找不到、錯誤碼），
  而那一類今天**沒有任何機制在看**。
- **B 夾帶**：`AD-27`（ADR-0011 那行）與 `AD-30`（Azure China）值得在 A 的第一個 commit 一起修；
  其餘六條可排下一片。**真正要做的是加那一格 closeout 檢查表**，不是修八處文字。
- **D 先問**：如果 stakeholder 堅持本地密碼，那 `risks` 切片的登入路徑會建在一個將被推翻的前提上。
  **成本是問一句話，不問的成本是可能重做。**
- ⛔ **不建議現在做 C** —— 它卡在別人身上，而且**沒有它 A 一樣能做完**。

<details><summary>審計 #6（2026-08-15）的優先序建議 —— 原文保留</summary>

⭐ **本次與前五次都不同的地方**：前五次的候選都是「下一個能推進的東西」——
建表、接稽核、關 M0 的分子。**本次清單的第一項不是「能推進什麼」，是「什麼會停下來」。**

| 候選 | 論據 | 反論據 |
|---|---|---|
| **A. `AD-TrivyExempt-1`（⏰ 2026-09-07，剩 23 天）** | ⛔ **唯一有硬性日期的項目，而到期的後果不是「CI 有個叉」，是所有 PR 停止可 merge**（`容器映像 — trivy` 自 CH-015 起是 required check）。⚠️ **它到期時，A 以外的每一個選項都會同時被擋住** —— 包括正在進行中的任何 phase 的收尾 PR。⭐ 而且它**不需要決策**：二選一（重拉已重建的 base → 刪 `.trivyignore.yaml`；或逐條重新分流），兩條路都不需要拍板新架構 | ⚠️ 23 天不是 3 天，現在做等於提前用掉一個治理配額（`CH-017` 每 phase 1 個）。**但它不會變便宜，只會變急** |
| **B. M1 slice 10**（`ROADMAP` 第 4 項，▶）| **22 / 35 已建**，剩 13 張且沒有已知的未解機制問題 —— 是複製不是探索。`pattern-reuse-feature` 的乘數 0.50 已有 7 個資料點且穩定（W14 ratio 1.13，IN）。⭐ **W13 的漂移守衛已經實戰過一次**，所以「下一張表忘了接稽核」現在會被機械攔下 | ⛔ **連續第 15 個 phase 沒有 drive-through，而那已經不是紀律問題** —— 見 §2.9。每多一片後端，「能跑」與「能用」之間**未被檢驗**的距離就再拉長一格 |
| **C. 開始 UI** | 技術上現在可以 —— 後端已有 22 張表與對應端點。⭐ **這是唯一能讓約束 3（drive-through）第一次被執行的選項**，而它在 14 個 phase 裡從未被執行過 | ⛔ **三件 pre-work 擋著**：`AD-Mockup-2` / `AD-Mockup-3`（**兩個 🔴 P0**，儀表板 fixture 以**國家**為鍵，結構上裝不下 13 家 OpCo —— 新加坡 2 家、香港 2 家）· **Tailwind 尚未安裝** · `apps/web` 僅 13 檔。⚠️ 且兩個 Mockup P0 **需要使用者確認 fixture 重建方式**，不是純執行工作 |
| **D. 處置漂移（AD-17 ~ AD-26）** | **10 條裡有 5 條未處置**，其中 AD-17 / AD-18 / AD-19 已跨兩個 phase。⭐ **AD-21 是本批唯一一條「會讓下一次判斷出錯」的** —— 兩條 P0 不在任何排序面上，包括一條真實的安全缺口（`AD-UniqueKeyOracle-1`，違反約束 8 的「查無資料一律 404」）| ⚠️ 治理工作，吃 `CH-017` 的配額；且**其中 4 條是純文字更正**（AD-18 / AD-22 / AD-25 / AD-26），做起來便宜到會誘使人把它當成「有進度」 |
| **E. `AD-UniqueKeyOracle-1`（🔴 P0）單獨處理** | 它是**已量出來的資料層漏洞**，不是推論：撞別實體的唯一鍵 → 23505、不撞 → 23503，可一次一猜列舉別人的版本史。W10 / W11 兩個資料點，判準已收斂為「兩個**可分辨的結果**」 | ⚠️ 修法（把 `org_entity_id` 放進唯一鍵）W10 當時已做在 `rm_report_versions` 上；剩下的是**其餘表的回頭檢查 + 一條 detector**，而 detector 需要先定義判準 |

**建議順序：A → 然後由使用者在 B / C 之間選。**

- **A 先做的理由不是重要性，是不可逆性** —— 其餘每一個選項都可以晚三週做，A 不行，
  而 A 到期會讓其餘每一個選項的**收尾**都做不完。
- **B vs C 是真正的排序決定，我不代選。** 兩邊的代價不同類：
  B 的代價是**風險累積**（未被檢驗的距離再拉長），C 的代價是**前置成本 + 兩個需要拍板的 P0**。
- **D 建議夾帶** —— 其中 4 條是純文字更正，可併進任一選項的第一個 commit；
  **只有 AD-21 值得單獨處理**，因為它改的是 ROADMAP 的收容機制而不是一個數字。
- **E 建議進 B 的 Day 0** —— 若選 B，slice 10 的每張新表都會複製同一個唯一鍵形狀，
  **在建之前定判準比建完再回頭檢查便宜**。

**⏰ 唯一有日期的死線**：`AD-TrivyExempt-1` **2026-09-07（剩 23 天）**。

</details>

### 2.9 一個值得單獨說的觀察 —— **這一次是關於審計自己**

<details><summary>審計 #6 的 §2.9（矛盾兩半住在同一段裡）—— 原文保留</summary>

**本次六條漂移裡有四條（AD-21 · AD-22 · AD-23 · AD-25）的矛盾兩半住在同一列或同一段裡。**
不需要跨文件比對，不需要 git log，逐句讀完那一段就會看見 —— 而它們仍然活了下來。

> **跨來源審計的價值不全在「跨」。** 本次最大的收穫來自**逐句讀完一份文件**，
> 而不是比對兩份文件。

⚠️ 最尖銳的一個是 **AD-22**：`decision-form.md` 在審計 #5 裡是**對照組** ——
AD-17 的實據欄引用它來證明「OQ-4 已拍板」。它作為那個事實的權威來源是對的，
**而它自己的敘述段對同一個事實記錯了**。

> **一份文件可以同時是某個事實的權威來源、又對同一個事實記錯。**
> 引用它當對照組時要讀完整份，不是只讀被引用的那一格。

⭐ 這與審計 #4「數字在但沒有來源」、審計 #5「來源修好了而副本沒被同一次動作覆蓋」構成同一族的第三層：
**這次來源和副本都在同一份文件裡，而修正只碰了其中一半。**

---

⚠️ **另一個不屬於漂移、但本次量到而必須寫下來的**：

**UI drive-through 連續十四個 phase 零次，這已經不是「未知數」而是一個結構性事實。**
`verification-discipline.md` 把 drive-through 立為 AP-3 的**唯一有效偵測機制**，
而本專案至今**沒有任何一次執行過它**。每一份 phase 報告都誠實地寫了 `gate-only verified`，
**紀律是成立的** —— 缺的不是紀律，是**標的**。

⛔ 這件事的後果是可以說清楚的：今天 repo 裡有 22 張表、對應的端點、480 個 unit 測試與 218 個 int 測試，
而**其中沒有任何一行被人透過 UI 驅動過**。W14 的 D5 已經給了一個預告 ——
一條 group-shared control 的測試在**修法前後都會通過**，那個形狀（`AD-VacuousScopeTest-1`）
在後端是靠中性化實驗抓到的，而**中性化實驗只能在你已經想到要問的地方進行**。
drive-through 抓的正是**你沒想到要問的那些**。

⇒ 這不構成「必須現在做 UI」的論證（`AD-Mockup-2` / `AD-Mockup-3` 兩個 P0 真的擋著），
但它應該進入 §2.8 的 B vs C 排序，**作為 B 的代價而不是 C 的好處**。

</details>

⭐ **審計 #6 那段預測在 W19 兌現了**：它寫「drive-through 抓的正是你沒想到要問的那些」，
而 W19 第一次執行 drive-through 就抓到 **25 個死控件**，且它們**通過了每一項 gate**，
含 W19 自己那一片新加的 hover 守衛。**預測與實測都在，這一條可以收了。**

---

#### 本次真正值得單獨說的：**審計自己落後了七個 phase，而沒有任何東西會叫**

前六次審計最多跨兩個 phase。本次跨七個，而觸發它的不是任何機制 —— 是**使用者開口問**。

⛔ **這與本批 18 條漂移裡至少 4 條是同一個病**（`AD-32` `AD-33` `AD-39` 以及 ADR 那整族）：
**一份 living 文件的「最後更新」欄，沒有任何東西在對照它與最近一次 closeout 的日期。**
`AD-RegisterUpkeep-1` 早就寫下了正解 ——
> `可行守衛：detector 比對 Last Reviewed: 與最近一次 phase closeout 的日期`

**那條守衛從 W08 提出至今未建，而本次它自己被同一個病咬了一口。**

⚠️ **而這裡有一個誠實的區分要做**，否則會做出一條沒用的 detector：

| 文件 | 落後是不是問題？ |
|---|---|
| `RISK_REGISTER` · `DEFERRED_REGISTER` · `ROADMAP` header | ✅ **是** —— 它們宣稱自己被複查過，而沒有 |
| `STATUS_AUDIT` 自己 | ⚠️ **不一定** —— 跨來源審計**本來就是按需的**，`/status-audit` 的定位就是「使用者問的時候跑」。**問題不是它落後，是它落後時沒有人知道它落後** |

⇒ 兩者要的守衛不同：前者是「**你說你看過了，證明給我看**」，
後者是「**下一次有人問全項目狀態時，先告訴他這份快照有多舊**」。
把它們寫成同一條 detector，會得到一條對第二種情形永遠在響的警報。

---

⭐ **第二件事：本次是第一次把掃描委派出去，而它產生了一個可量測的結論。**

四個 subagent 分四個來源組平行掃，我保留跨來源比對。**代價與收穫都具體**：

- **收穫**：18 條漂移，其中 8 條在 ADR 層 —— 那一層前六次審計都只做「狀態值 + 編號空缺」的淺掃，
  **從來沒有人逐條讀可證偽條件並問「它觸發了嗎」**。`AD-29`（FC4 已被行使）只有這樣才抓得到。
- **代價**：**agent 的回報有一條是錯的**（宣稱 `CLAUDE.md` 仍寫 W20，實際已是 W21 —— 它讀到的是
  本 session 更新前的狀態）。⛔ 若照單全收，這份審計會憑空發明一條不存在的漂移。
- ⇒ **判準因此明確**：委派可以擴大**掃描**的射程，**不能代替判讀**。
  每一條進入 §2.7 的發現，都必須由審計者自己重讀那一處原文 —— 這次做了，而且**擋下了一條**。

## 3. 歷史快照

<!-- 舊快照精簡成 3-5 行放這裡，保 audit trail。不要保留全文。 -->

| 日期 | 基準 sha | 當時 active | 漂移數 | 一句話 |
|---|---|---|---|---|
| 2026-08-18 (#7) | `3b55acb` | 0 | **18** | **W15–W21 收尾後 —— 歷來最大落差（跨七個 phase，前六次最多兩個），且觸發它的不是任何機制而是使用者開口問。** 160 條 open AD（P0 **6** ← 7：`AD-Mockup-3` 由 W19 關閉、`AD-Mockup-2` 降 P1、新增 `AD-LocalPasswordFallback-1`）。⭐⭐ **18 條裡 8 條在 ADR 層，而根因是一個結構缺口不是八次疏忽** —— 沒有任何 ADR 檔在 2026-08-14 之後被改過，因為 **phase closeout 的檢查表沒有一格是 ADR**（`RISK_REGISTER` 有那一格，是審計 #3 加的）。最尖銳的三條：`AD-27`（`CH-041` 在自己的表格裡列出 `ADR-0011:119` 是受影響處然後沒修它 —— **一次修復動作列出了自己的漏網**）· `AD-30`（`ADR-0007:90-92` 仍是一條「M4 必須建造兩套身分平面」的現在式指令，而 Azure China 十天前就移出範圍）· `AD-31`（`decision-form` 宣稱四個法律問題未經複查，**而它在同一句話裡連結的 ADR-0010 寫著它們 moot**）。⭐ **死線歸零，本專案第一次**（`AD-TrivyExempt-1` 由 CH-032 拆掉）。⭐ **UI drive-through 連續 14 個 phase 零次的紀錄由 W19 終結，且第一次執行就抓到 25 個死控件**。⭐ **本次首度把掃描委派給四個平行 agent** —— 擴大了射程（ADR 層的可證偽條件前六次從未逐條讀過），**而其中一條回報是錯的**（宣稱 CLAUDE.md 仍寫 W20）⇒ **委派可以擴大掃描，不能代替判讀**。⛔ 基準**不在 `main` 上**（歷來第一次）—— W21 的 closeout 仍在 PR #84 |
| 2026-08-15 (#6) | `c403522` | 0 | 6 | W13 + W14 收尾後（**首次一次審計跨兩個 phase**）。108 條 open AD（P0 **7** ← 8，`AD-AuditCoverageOneTable-1` 由 W13 關閉 —— **十個 phase 以來第一條被關掉的 P0**）。⭐ **本次六條有四條的矛盾兩半住在同一列或同一段裡**（ROADMAP 的「第 5 條 P0」而真值 7 且兩條 P0 無落點 · `decision-form` 表格 2 列而敘述寫「三項」· R4 狀態欄 15/21 而同列內文寫「第 16 個」· `RISK_REGISTER` header 歸給 W13 而 W14 也改過）—— **跨來源審計的價值不全在「跨」**。⭐⭐ **M0 DoD 第 5 項首度取得實據**：三個子項裡兩個早已做完且有負面測試守著，只有 TLS 是本專案結構上無標的 ⇒ 連續四次的「未取得實據」涵蓋了兩件性質不同的事。⛔ **審計 #5 的四條只處置了一條**（AD-20，而且是被 closeout 順手改對的）|
| 2026-08-14 (#5) | `91dd1cb` | 0 | 4 | W12 收尾後。100 條 open AD（P0 8 / P1 56 / P2 36，detector 導出）；⭐ **本次四條有兩條是「條件成立了但沒有人回頭翻」**（W05 的 `closed_partial` 早在 W06 解封、`DEFERRED_REGISTER` 停更跨五個 phase），另兩條是**我自己在 W12 closeout 造成的**（同一個錯的表數留在兩份活文件、BACKLOG header 日期沒跟上）。⭐⭐ **兩個「疑似漂移」被實據推翻**：W01 的 `closed_partial` 是**對的**（digest 釘定仍未做），`asset.int.spec.ts` 的四項範疇測試**存在**（我第一次用的 pattern 太窄）。M0 仍 3/2/1 未動（連續**十個** phase）|
| 2026-08-12 (#4) | `d7733b5` | 0 | 5 | W07 收尾後。69 條 open AD；⭐ **三條漂移是「計數器沒有機械推導」**（實體數在每份文件都錯且互相矛盾、`RefCodeCounter` 不在自稱完整的索引上、審計 #2 自己的 i18n 計數是錯的）；`DEFERRED_REGISTER` 停更四個 phase 且 D002 的恢復條件字面已成立；M0 仍 3/2/1 未動（連續五個 phase）。⚠️ **原標 `#3`，2026-08-13 改號** —— 見 §3.1 |
| 2026-08-10 (#3) | `a2b1906` | 0 | 3 | W04 收尾後。56 條 open AD（P0 5 / P1 34 / P2 17）；⭐ **三條漂移有兩條在追蹤文件自己身上** —— `RISK_REGISTER` 整個 W04 未被複查（**而 phase closeout 流程從來沒有要求過**），本檔自己的 i18n「7 檔」實據從第一次審計起就是錯的；M0 仍 3/2/1 未動。⛔ **這份報告從未進 main**，2026-08-13 才自 `docs/status-audit-20260810-3`（`31f76e2`）撿回 —— 見 §3.1 |
| 2026-08-10 (#2) | `bf3133e` | 0 | 5 | W03 收尾後。53 條 open AD；**五條漂移全部由 W03 自己的 closeout 造成**（關閉的 AD 未移出 §Open、負面 gate 計數 5→6 未同步、R3 引用已關閉的 AD）；M0 仍 3/2/1 未動 |
| 2026-08-10 (#1) | `568589d` | 0 | 6 | 首次審計。48 條 open AD；三份追蹤文件（ROADMAP / RISK / DEFERRED）**從未被使用**；M0 停在 3/2/1 未動 |

### 3.1 撿回 — 2026-08-10（#3）審計，以及它造成的編號衝突

**做了什麼**：2026-08-13 依使用者裁決（`AD-LostAudit20260810-1`）把該次審計**登記進歷史表**，
並把後來的 2026-08-12 那次由 `#3` 改號為 `#4`。**兩份報告的內文都不改**。

**為什麼是改後面那次而不是前面那次**：`#3` 這個標籤已經被 W05 的三份**已收尾**紀錄
指向 2026-08-10 那次（`W05 checklist:321` 的 `AD-12b（審計 #3）` · `plan:356` · `progress:40`
與 `:202` 的「審計 #3 記的 P1 34 / P2 17」—— 那組數字正是本次撿回的報告寫的）。
改前面那次會讓四處已封存的引用同時失效；改後面那次只需動三行**活文件**
（`BACKLOG.md` ×2 · `DEFERRED_REGISTER.md` ×1），且讓 W05 的引用**從懸空變成可解析**。
⚠️ 代價：`W08 plan.md:25` 的「審計 #3 的收尾 commit」自此指向 #4 —— **已收尾紀錄，刻意不改**
（`CH-022:190` 先例）。

> ⛔ **AD 編號無法用同樣方式修好。** 兩次審計**都從 AD-12 編起**，
> 而 `AD-12`/`AD-13`/`AD-14` 在兩邊是**完全不同的三件事**。
> 兩邊都已被引用（#4 的 AD-12–16 在 `BACKLOG.md:13`；#3 的 AD-12b 在 W05 checklist），
> **重編任何一邊都會弄斷另一邊**。故：**保留兩套編號，用審計序號消歧**，
> 下一次審計自 **AD-17** 起編（見 §6 第 5 條）。

| 審計 #3（2026-08-10）的發現 | 今日狀態 | 實據 |
|---|---|---|
| **AD-12@#3** — `RISK_REGISTER` 在 W04 closeout 完全未複查；R4 仍寫「W02 已建**兩張表**」而實際 5 張 | 🟡 **一半已解** —— 數字早已跟上（R4 今日為 **12 張**，`Last Reviewed: 2026-08-13`），但**它建議的結構性修法沒做**：R4 的表數仍是手寫計數器 | `RISK_REGISTER.md:6` · R4 列逐 phase 手寫累加「W02 兩張 → W04 +2 → … → W08 +2」→ 新開 `AD-RiskTableCountManual-1` |
| **AD-12b@#3** — 上一條是結構性的：Phase 軌 closeout **從來沒有要求過**複查 `RISK_REGISTER`；三個收尾面零命中 | ✅ **已關閉** —— W05 照它的建議加了一列 | `retrospective.md.tpl:120` 「⭐ **`RISK_REGISTER.md` 已複查**」；`W05 checklist:321` 記為 `AD-12b（審計 #3）` |
| **AD-13@#3** — 本檔 §2.10 的 i18n「7 檔」實據是錯的，**從第一次審計起就錯** | ✅ **已關閉（重複發現）** —— 審計 #4 以 `AD-15` 獨立再發現一次並改用 `git ls-files` 導出 | 本檔 §2.7 `AD-15`；兩次的結論與實據一致 |
| **AD-14@#3** — 該次審計用 `grep -c "🔴 P0"` 得 **0**（實際 5），emoji 在該 pipeline 下不匹配 | 🟡 **升級** —— 這是 `AD-GrepAssertion-1` 在**審計自身**的第 **2** 次，使審計 #4 的 `AD-15` 成為第 **3** 次 | 審計 #4 的 `AD-15` 自稱「第二次再現」，是**在不知道本次存在的情況下**寫的 → 依 `.claude/rules/README.md` 強度階梯 ≥3 次應改結構性解法 |

⭐ **根因不在編號程序，在「這份工作從未被 merge」。** 審計 #4 讀 main 上的 `STATUS_AUDIT.md`，
看到最後一筆是 #2 / AD-7–11，於是從 #3 / AD-12 接下去 —— **它的推論完全正確，錯的是它的輸入**。

⚠️ **同一次分支清理找回了兩樣東西，成因相同**：本次審計，以及
`AD-RebaseMergeBranchCheck-1`（寫於 W03，在未 merge 的分支上躺了五個 phase）。
**沒有被 merge 的分支不會有任何東西提醒你它存在** —— 而這兩件都是「用來防止漏看的東西」本身被漏看。
**這是本專案第二次證明「清理分支是一種稽核」。**

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
5. ⛔ **推上去並 merge —— 沒有 merge 的審計等於沒發生過。**
   序號與 `AD-N` 都是**接續 main 上的最後一筆**往下編的，所以一份停在本機分支的審計
   不只是「還沒發表」，它會讓**下一次審計把同一組號碼再發一次**。
   2026-08-10 的 #3 就是這樣消失的（§3.1）。
   Merge 之後跑一次 `git cherry main <branch>` 確認 0 個未合併 patch，再刪分支。
6. **編 `AD-N` 之前先讀 §3 歷史表取「歷來最大號」**，不要讀「上一份快照的最大號」——
   兩者在正常情況下相同，而它們**不同的那一次**，正是有東西沒被 merge 的那一次。

> **漂移編號用 `AD-N`（Audit Drift），只增不重用。**
> 刻意避開 backlog / deferred / risk 既有的命名空間 ——
> 來源專案有過同一個編號被用兩次，而且因為已被多處引用而不敢重編。
>
> ⚠️ **2026-08-13：上面這句話在本專案應驗了。** `AD-12`–`AD-14` 被發了兩次，
> 兩套都已被引用，因此**兩套都不敢重編** —— 現況是靠審計序號消歧（§3.1）。
> **這條警語從第一天就寫在這裡，而它沒能防止它自己描述的事。**
> 會防住的是第 5 條，因為那一條有動作、不是提醒。
