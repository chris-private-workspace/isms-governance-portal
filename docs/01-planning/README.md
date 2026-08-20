# 01-planning — 規劃中樞

**Purpose**: 所有規劃、流程、待辦追蹤、風險登記的家。**日常最高頻的一層。**
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

---

## 住客

| 檔案 / 資料夾 | 作用 |
|---|---|
| [`PROCESS.md`](./PROCESS.md) | ⭐ **三軌工作流 source of truth**（Phase / Change / Bug + binding rules R1-R9）|
| [`BACKLOG.md`](./BACKLOG.md) | 中央待辦 dashboard —— 想知道「**有什麼**可以做」的第一站 |
| [`ROADMAP.md`](./ROADMAP.md) | 執行順序層 —— 想知道「**先做哪個**」的第一站（每項一行，細節一律 link 回 BACKLOG）|
| [`STATUS_AUDIT.md`](./STATUS_AUDIT.md) | 跨來源審計快照 —— 揪出上述文件**彼此之間**的漂移（`/status-audit` 重跑）|
| [`PROGRESS-METRICS.md`](./PROGRESS-METRICS.md) | 想知道「**進度到哪了**」的第一站 —— Wave 1 的五把尺 + 里程碑錨點，由 `check_progress_metrics.py` 強制與 repo 一致。⛔ **刻意不給整體百分比** |
| [`DEFERRED_REGISTER.md`](./DEFERRED_REGISTER.md) | 反覆 / 結構性的「暫時不做」決定 + **恢復條件** |
| [`RISK_REGISTER.md`](./RISK_REGISTER.md) | Living 風險登記 |
| [`CALIBRATION-MATRIX.md`](./CALIBRATION-MATRIX.md) | 工時乘數決策表（起草 plan §Workload 時查）|
| [`CALIBRATION-LOG.md`](./CALIBRATION-LOG.md) | 完整校準敘述（matrix 只放結論）|
| `_templates/` | **三軌模板**（`phase/` · `change/` · `bugfix/`）+ `record.md.tpl`（Change/Bug 共用的單檔 1-page 形式）|
| `_TEMPLATE-product-brief.md` | 產品簡報模板 |
| `product-brief.md` | 做什麼 / 為誰 / 成功長怎樣 / **明確不做** |
| `brainstorming/` | 發想過程（心智圖、競品掃描…）—— 原始素材，不需整齊 |
| `W{NN}-{slug}/` | **每個 phase 一個資料夾**（plan / checklist / progress / retrospective / artifacts）|

---

## Phase 資料夾

```
docs/01-planning/W07-user-auth/  <!-- path-check: ignore -->
├── plan.md            <- scope contract（status=active 後 locked）
├── checklist.md       <- 從 plan 導出的原子勾選項
├── progress.md        <- 每日 Day-N + Day-0 drift findings + drive-through 紀錄
├── retrospective.md   <- 收尾 Q1-Q7 + calibration ratio + carryover
└── artifacts/         <- 截圖、量測輸出、drift 報告
```

**四份檔案的分工**：

| 檔案 | 何時寫 | 內容 |
|---|---|---|
| `plan.md` | Kickoff | scope / user stories / file change list / acceptance / workload / risks / out-of-scope |
| `checklist.md` | Kickoff（從 plan 導出）| 原子項 + DoD + verify 指令。**只能 `[ ]`→`[x]`，不能刪**（R6）|
| `progress.md` | **每天傍晚** | 做了什麼、花多久、什麼卡住、drive-through 走查表 |
| `retrospective.md` | Phase 結束 | Q1-Q7、calibration ratio、carryover |

⚠️ `progress.md` **不能「等 phase 結束再補」** —— 細節屆時已遺失，
而 calibration 需要的正是那些細節。

### 為什麼四份放在同一個資料夾

早期版本把 plan/checklist 放規劃區、progress/retrospective 放另一棵樹。
**那個切分每天都在製造摩擦** —— 一次 phase 的工作要在兩處之間跳，
而它們的生命週期完全同步。共置之後，「這個 phase 的一切」是一個 `ls`。

### 挑 `{NN}` 之前必須掃所有分支

平行 session 在獨立 worktree，只看 `main` 會撞號。程序見 [`PROCESS.md`](./PROCESS.md) §2.2。

---

## 慣例

- **Phase 資料夾 rolling JIT**：每個 phase kickoff 才建，**不要一次建一堆未來的**
- 命名 `W{NN}-{kebab}`；`{NN}` 全專案單調遞增，一旦 commit 就視為 claim
- 收尾後資料夾**留著**做 audit trail（`progress.md` 標 status=closed）
- Artifacts（截圖 / 量測 / drift 報告）放 `W{NN}-*/artifacts/`，**不要**放進 `03-implementation/`

---

## 相關

| 想找 | 去哪 |
|---|---|
| Phase 軌的逐日執行細節 | [`.claude/rules/task-workflow.md`](../../.claude/rules/task-workflow.md)（always-loaded）|
| Change / Bug 實例 | [`../03-implementation/README.md`](../03-implementation/README.md) |
| 設計權威（核心設計文件）| [`../02-architecture/README.md`](../02-architecture/README.md) |
| 架構決定 | [`../14-adr/README.md`](../14-adr/README.md) |
| 完整資訊流 | [`../INFORMATION-FLOW.md`](../INFORMATION-FLOW.md) |
