# 規則索引 — always-loaded vs on-demand

**Purpose**: 開發規則總覽 + 分層載入指南。

**Last Updated**: 2026-08-07
**Status**: Active

> **找「現在該做什麼」而不是「規則是什麼」？**
> → [`docs/INFORMATION-FLOW.md`](../../docs/INFORMATION-FLOW.md) ——
> 按情境（新功能 / 變更 / 修復 / **發版** / **交接**）列出讀什麼、產生什麼、更新什麼。
>
> **找模板？** → [`docs/README.md`](../../docs/README.md)

---

## 載入策略（Hybrid）

Claude Code 會把 `CLAUDE.md` + `.claude/rules/*.md` **自動載入每個 session**。
這是最貴的 context 資源，必須有紀律。

| 位置 | 行為 | 用途 |
|------|------|------|
| **`.claude/rules/*.md`**（5 條 + 本 README）| ✅ 每個 session 自動載入 | 高頻 critical 規則 |
| **`docs/rules-on-demand/*.md`**（14 條 + 條件式附加包）| ⏸️ 預設不載入，需 AI 主動 `Read` | 情境式規則 |
| **`docs/01-planning/*.md`**（matrix / log）| ⏸️ 起草 plan / closeout 時 Read | 跨 phase 數據表 |

### ⚠️ 為什麼 on-demand 規則必須放在 `.claude/rules/` 外面

**`.claude/rules/` 底下的每一份 `.md`（含子目錄）都會被載入為 project memory。**
開一層子目錄**不會**阻止這件事 —— 這是最常見的誤解。

真實踩坑：某專案第一版把 on-demand 規則放在 `.claude/rules/on-demand/`，  <!-- path-check: ignore -->
語義上是 on-demand，實際上仍被自動載入（每 session 多吃 ~39KB，完全違反設計意圖）。
移到 `docs/rules-on-demand/` 之後才真正生效。

### 但 `.claude/` 底下不是全部都這樣

| 目錄 | 進 context 的部分 |
|---|---|
| `rules/` | ⚠️ **全文**，每個 session |
| `commands/` | 只有名稱；body 到 `/` 呼叫才載入 |
| `agents/` | 只有名稱 + 描述；到派工才載入 |
| `skills/` | 只有 `name` + `description`；到 invoke 才載入 |

所以後三個目錄可以放長文，**只有 `rules/` 有 byte 預算擋著**
（`check_rules_hygiene.py`）。

例外是 **skill 的 `description`** —— 它是每個 session 都在付錢的那一行，
要精簡。它同時是 skill 的**路由表**（見 [`.claude/skills/README.md`](../skills/README.md)），
所以精簡不等於抽象：寫使用者真的會講的句子，但不要寫成一段。

### 機械式守門

`scripts/lint/check_rules_hygiene.py` 為每個 always-loaded 檔案設 **byte 預算**，超標即 fail。

**Why**：光有「請保持精簡」的勸世文沒有用。真實案例：某個表格**兩度**重新膨脹到佔檔案 47%，
因為每個 phase closeout 都把前一個臃腫的格子當範本抄，而**沒有任何東西會 fail**。

---

## 🔴 Always-Loaded（5 條，永遠在 context）

| 檔案 | 用途 | 為何 always |
|------|------|------------|
| [`task-workflow.md`](./task-workflow.md) | **任務分類 gate** + Phase 軌 5 步流程 + Day-0 摘要 + calibration + closeout | 每個任務動手前必依 |
| [`verification-discipline.md`](./verification-discipline.md) | Drive-through 三層驗證 + 反 Potemkin + **證據紀律** | 每個 user-facing 功能收尾必依；漏掉就是紙上談兵 |
| [`file-header-convention.md`](./file-header-convention.md) | File header + MHist 1-line max | 每次建檔 / 改檔都要對 |
| [`anti-patterns-checklist.md`](./anti-patterns-checklist.md) | PR 自檢清單 | 每個 PR merge 前必通 |
| [`tool-discipline.md`](./tool-discipline.md) | 有專用工具就用專用工具（Read / Grep / Glob）| **每一次工具呼叫都是觸發時刻** —— 放 on-demand 等於不存在 |

---

## 📋 On-Demand（需要時主動 Read；下表即清單，條數依 profile / 附加包增減）

> **AI 規則**：碰到下列 Trigger 時，**先 Read 對應規則檔再開始 code**。

| 檔案 | Trigger |
|------|---------|
| [`day0-plan-verify.md`](../../docs/rules-on-demand/day0-plan-verify.md) | 每個 phase 的 Day 0（三-prong 完整程序 + drift-class grep 表）|
| [`scope-boundaries.md`](../../docs/rules-on-demand/scope-boundaries.md) | 新建檔案 / 跨範疇 import / 不確定代碼歸哪個範疇 |
| [`mockup-fidelity.md`](../../docs/rules-on-demand/mockup-fidelity.md) | ⭐ 前端頁面 / mockup port / 改設計系統（**寫第一頁前必讀**）|
| [`git-workflow.md`](../../docs/rules-on-demand/git-workflow.md) | 寫 commit message / 開新 branch / 開 PR |
| [`code-quality.md`](../../docs/rules-on-demand/code-quality.md) | 修 lint / type check 報錯 / 跨平台問題 |
| [`testing.md`](../../docs/rules-on-demand/testing.md) | 寫測試 / 測試隔離問題 / coverage 規劃 |
| [`observability.md`](../../docs/rules-on-demand/observability.md) | 新增埋點 / 動 trace context / 加 metric / 定 SLO / 「線上出事但看不出為什麼」|
| [`spike-design-note-gate.md`](../../docs/rules-on-demand/spike-design-note-gate.md) | spike phase 的 Day 4 closeout（8-point gate）|
| [`lint-detector-authoring.md`](../../docs/rules-on-demand/lint-detector-authoring.md) | 寫 / 維護 / debug 自訂 lint detector |
| [`restructure-repointing.md`](../../docs/rules-on-demand/restructure-repointing.md) | ⭐ 目錄重組 / 大量 `git mv` / 改命名慣例 / 合併文件樹（**動手前讀**）|
| [`release-process.md`](../../docs/rules-on-demand/release-process.md) | 發版 / hotfix / 設定部署 / **停用某個 pipeline**（要寫 re-enable criteria）|
| [`collaboration.md`](../../docs/rules-on-demand/collaboration.md) | Review 別人的 PR / 交接工作 / 新人加入 / 分工開始衝突 |
| [`local-runtime-ops.md`](../../docs/rules-on-demand/local-runtime-ops.md) | 重啟服務 / 服務起不來 / 端點連不上 / **殺進程之前** / 跑會改動狀態的操作之前 / **重灌前的備份演練** |
| [`i18n-glossary.md`](../../docs/rules-on-demand/i18n-glossary.md) | 新增 / 改 user-facing 文案 · 加語言 · 改術語譯法 · **規劃多語言（L0 越早做越便宜）**|

> **Calibration 查表**（非 rule、是 live 數據）：起草 plan §7 / Day 4 closeout 時
> Read [`docs/01-planning/CALIBRATION-MATRIX.md`](../../docs/01-planning/CALIBRATION-MATRIX.md)。

### 條件式附加包（bootstrap 選了才會存在）

| 檔案 | 啟用方式 | Trigger |
|------|---------|---------|
| `docs/rules-on-demand/llm-agent-antipatterns.md`  <!-- path-check: ignore --> | `--llm-project` | 動 LLM 呼叫 / 新增 adapter / agent loop（**CLAUDE.md 約束 7**）|
| `docs/rules-on-demand/multi-tenant-data.md`  <!-- path-check: ignore --> | `--multi-tenant` | 建表 / 寫 query / 新 endpoint / 碰 PII（**tenant 隔離三鐵律**）|

> 沒啟用的包**不會**出現在你的專案裡 —— 上面兩行若指向不存在的檔，那是預期行為。
> 事後要補：重跑 bootstrap 加上對應旗標 + `--merge`。

---

## 任務情境快查

### 任何任務進來
- ✅ Always: `task-workflow.md` §Step 0（分類 → 選軌 → 開 pre-doc）
- 📋 Read: `docs/01-planning/PROCESS.md`（Change / Bug 兩軌的 lifecycle）

### 開始一個 phase
- ✅ Always: `task-workflow.md`
- 📋 Read: `day0-plan-verify.md` + `calibration-matrix.md` + `scope-boundaries.md`

### 寫新檔案
- ✅ Always: `file-header-convention.md`
- 📋 Read: `scope-boundaries.md`

### 前端頁面 / mockup port
- 📋 Read: `mockup-fidelity.md` → 再依它指向 `06-reference/mockup-to-production-frontend-playbook.md`

### 完成 user-facing 功能
- ✅ Always: `verification-discipline.md`（**開車，不是只看 gate**）

### Code review / PR 自檢
- ✅ Always: `anti-patterns-checklist.md`
- 📋 Read: `git-workflow.md`

### 修 CI / lint / 型別錯誤
- 📋 Read: `code-quality.md`

### 寫測試
- 📋 Read: `testing.md`

### 要發版 / hotfix
- 📋 Read: `release-process.md`（版號判準 + checklist + rollback 準備）
- ✅ Always: `verification-discipline.md`（**部署成功 ≠ 能用**）

### Review 別人的 PR / 交接 / 新人加入
- 📋 Read: `collaboration.md`（含 **AI 輔助團隊的 5 個特有問題**）

### 重啟服務 / 服務起不來 / 要殺進程
- 📋 Read: `local-runtime-ops.md`（**慢 ≠ hang**；殺之前先確認那是誰的進程）
- 執行介面：`/preflight` → `/restart`

### 想知道「全項目現在到底怎樣」
- 執行介面：`/status-audit`（**不要只讀 BACKLOG 就回答** —— 它看不見自己的 stale）

---

## 維護

- Rule 改動 = 開發習慣改動 → PR 標題加 `chore(rules)`
- 新 rule 必須走標準 phase 流程（plan + checklist）
- 舊 rule 淘汰時走 archive，不直接刪除（保留 git history）
- **分流調整**：某條 on-demand rule 若連續 3 個 phase 都被 Read → 提案 promote 到 always-loaded（反之亦然）
- **新增規則的門檻**：必須有 **2 次以上真實踩坑證據**。憑空想像的規則只會增加 context 成本

### 規則的約束強度階梯（升級 / 降級）

強度跟著**被違反的頻率**走，不是一次定死：

| 級 | 形式 | 升到這級的條件 |
|---|---|---|
| 1 | on-demand 檔裡的建議 | 起點 |
| 2 | on-demand 規則 + 明確 Trigger | 違反過 **2 次** 且有明確觸發情境 |
| 3 | always-loaded 硬約束（觸發即 STOP and ask）| 違反過 **3 次以上**，或使用者明確框定為「必須遵守」 |
| 4 | **`UserPromptSubmit` hook 每回合注入** | 在**同一個 session 內**被違反 —— 那是「中途忘了」，不是「不知道」 |

第 4 級是唯一對「中途漂移」有效的手段：CLAUDE.md 在開頭讀過，長對話走到一半已被別的東西佔滿注意力，
**在 CLAUDE.md 裡再寫幾次也沒用**。範例接線見 `.claude/settings.json`。
**保持一句話** —— 每回合都要付 context 成本。

**降級同樣要做**：連續 5-10 個 phase 沒被違反 → 降回上一級。
只升不降，最後就是一份沒人真的在遵守的長清單。

---

## Modification History

- 2026-08-07: Initial creation from claude-code-dev-template v2.6.1
