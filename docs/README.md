# `docs/` — 文件分層總索引

**Purpose**: 專案的文件中樞。14 層各司其職，用 `NN-` 前綴讓目錄按「生命週期 / 查閱頻率」排序。
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **一句話判準**：這份內容是**規則**（→ `.claude/rules/` 或 `rules-on-demand/`）、
> **設計決策**（→ `02-architecture/` 或 `14-adr/`）、**執行紀錄**（→ `01-planning/W*` 或 `03-implementation/`）、
> 還是**待辦**（→ `01-planning/BACKLOG.md`）？

---

## 根層（singleton spec）

| 檔案 | 作用 |
|---|---|
| [`architecture.md`](./architecture.md) | ⭐ **主 spec**（WHAT + WHY）—— CLAUDE.md / catalog / phase plan 都引用它 |
| [`setup.md`](./setup.md) | 本地開發環境 setup |
| [`decision-form.md`](./decision-form.md) | Open questions 登記（未拍板的問題；拍板後 → ADR）|
| [`INFORMATION-FLOW.md`](./INFORMATION-FLOW.md) | ⭐ **開發資訊流地圖** —— 讀什麼 / 產生什麼 / 更新什麼 |

---

## 14 層

| 層 | 作用 | 主要住客 |
|---|---|---|
| **[01-planning](./01-planning/)** | 規劃中樞（**日常最高頻**）| `PROCESS.md` · `BACKLOG.md` · `ROADMAP.md` · `STATUS_AUDIT.md` · registers · calibration · `_templates/` · phase folder `W{NN}-*/` |
| **[02-architecture](./02-architecture/)** | 架構真理 | 核心設計文件 `NN-*.md` · `COMPONENT_CATALOG.md` · `design-system.md` · `design-notes/` · audit |
| **[03-implementation](./03-implementation/)** | 改動 & 修復實例 | `changes/CH-NNN-*/` · `bugs/BUG-NNN-*/` · 實作 memo |
| **[04-review](./04-review/)** | 審查記錄 | code / security / architecture review 產出 |
| **[05-usage](./05-usage/)** | 內部使用文檔 | 開發者 how-to · onboarding |
| **[06-reference](./06-reference/)** | 參考素材 | ⭐ mockup→production playbook · sample · 樣板 workflow |
| **[07-skills](./07-skills/)** | 專案專屬 AI skill 說明 | 反模式自檢 checklist 等 |
| **[08-user-guide](./08-user-guide/)** | 終端使用者手冊（**對外**）| 操作 / 配置 / troubleshooting |
| **[09-analysis](./09-analysis/)** | 深度分析報告 | 一次性調查 / research（**含日期，是快照**）|
| **[10-development-log](./10-development-log/)** | 開發日誌（選用）| `01-daily/` · `02-weekly/` |
| **[11-env-resources-detail](./11-env-resources-detail/)** | 環境資源細節 | 資源清單（**不含 secret**）|
| **[12-ai-assistant](./12-ai-assistant/)** | AI 協作素材 | session-start / compact prompt · handoff 模板 |
| **[13-deployment](./13-deployment/)** | 部署 | topology · runbook · release notes |
| **[14-adr](./14-adr/)** | 架構決定記錄 | `README.md` index + `NNNN-*.md` |
| [rules-on-demand](./rules-on-demand/) | 觸發式規則（**不編號** —— 它不是生命週期產物，是查閱型規則）| 見 [`.claude/rules/README.md`](../.claude/rules/README.md) |

> **不需要一開始 14 層都填滿。** 空層留 `README.md` 說明「這層放什麼」就好，有需要才入住。

---

## 模板落位

模板**不集中在一個抽屜**，而是住在它產出物該去的那一層 —— 找模板 = 找那層。

| 類型 | 位置 |
|---|---|
| **三軌模板**（phase / change / bugfix，會 copy 很多次）| `01-planning/_templates/{phase,change,bugfix}/*.md.tpl` |
| 產品簡報 | `01-planning/_TEMPLATE-product-brief.md` |
| Design doc / design note | `02-architecture/_TEMPLATE-design-doc.md` · `_TEMPLATE-design-note.md` |
| 路由 parity 帳本（有 mockup 的專案）| `02-architecture/_TEMPLATE-page-inventory.md` |
| 實作 memo | `03-implementation/_TEMPLATE-memo.md` |
| Review / how-to / skill / user-guide / analysis / research / resources / runbook | 各層 `_TEMPLATE-*.md` |
| Handoff / onboarding | `12-ai-assistant/_TEMPLATE-handoff.md` · `05-usage/_TEMPLATE-onboarding-checklist.md` |
| Release notes | `13-deployment/_TEMPLATE-release-notes.md` |
| ADR | `14-adr/0000-TEMPLATE.md` |

> ⭐ **`_templates/phase/{plan,checklist}.md.tpl` 是 FROZEN 錨點** —— 對照的是**那個檔案**，
> 不是上一個 phase 的 plan。「模仿最近一次」是相對錨點，會造成逐次累積的格式漂移
> （實測：80+ phase 後，任何相鄰兩個都「一致」，但頭尾面目全非）。

---

## 導航捷徑

| 想知道 | 去哪 |
|---|---|
| 現在有什麼可以做 | [`01-planning/BACKLOG.md`](./01-planning/BACKLOG.md) |
| **先做哪個** | [`01-planning/ROADMAP.md`](./01-planning/ROADMAP.md) |
| **全項目現在到底怎樣**（跨來源）| [`01-planning/STATUS_AUDIT.md`](./01-planning/STATUS_AUDIT.md) —— 跑 `/status-audit`，**不要只讀 BACKLOG** |
| 這個任務該走什麼流程 | [`01-planning/PROCESS.md`](./01-planning/PROCESS.md) |
| 開發時要讀什麼 / 產生什麼 | [`INFORMATION-FLOW.md`](./INFORMATION-FLOW.md) |
| 系統長什麼樣 | [`architecture.md`](./architecture.md) |
| 為什麼當初這樣決定 | [`14-adr/README.md`](./14-adr/README.md) |
| 這個 bug 之前修過嗎 | [`03-implementation/README.md`](./03-implementation/README.md) |
| 前端要照 mockup 做 | [`06-reference/mockup-to-production-frontend-playbook.md`](./06-reference/mockup-to-production-frontend-playbook.md) |

---

## 快照類文件的紀律

`09-analysis/` 最容易變成垃圾場。規則：

1. **每份新增必須在 [`09-analysis/INDEX.md`](./09-analysis/INDEX.md) 加 1 行**（沒索引 = 沒人找得到 = 白寫）
2. **檔名含日期** —— `<topic>-YYYYMMDD.md`，天然按時間排序
3. **一個批次的多份分析放子目錄**，不要平鋪
4. **快照會過期** —— 開頭寫明「這是 YYYY-MM-DD 的快照」，避免半年後被當成現況

---

## 不該放進 `docs/` 的

- ❌ **可執行的東西** → `scripts/`
- ❌ **會被程式讀取的設定** → 專案的 config 位置
- ❌ **secret / 憑證** → `.env` / vault（`11-env-resources-detail/` 只寫「資源叫什麼、在哪」）
- ❌ **跨 session 記憶** → `memory/`（那是協作過程，不是 codebase 的一部分）

> **為什麼要分這麼細**：因為導航檔會膨脹。真實案例：CLAUDE.md 從 30KB 長到 77KB，
> 其中約 58KB 是本該放在這些分層裡的東西。
