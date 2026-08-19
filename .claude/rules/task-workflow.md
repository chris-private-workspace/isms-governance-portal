# Task Workflow Rules

**Purpose**: 任務分類 gate + Phase 軌的執行紀律；讓每一次改動都能從「意圖」追到「出貨」。

**Category**: Development Process
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

---

## Step 0: 先分類，再動手（R1 gate）

**這一步在任何 code 之前。** 完整決策樹與 Change / Bug 兩軌的 lifecycle 在
[`docs/01-planning/PROCESS.md`](../../docs/01-planning/PROCESS.md)；本檔只負責 **Phase 軌**的執行細節。

### Step 0.0 節流閘：這件事現在該做嗎？

**分類軌別之前，先答一個更前面的問題。** 下方決策樹回答「屬於哪一軌」，
但它**預設了這件事現在要做** —— 而多數失控就發生在這個沒被問出口的預設上。

| 工作來源 | 動作 |
|---|---|
| **被指派的** —— 使用者要求／active phase 的 deliverable | 往下走決策樹 |
| **順路發現的** —— 做 A 時看到 B 壞了／缺了／可以更好 | **記進 `BACKLOG.md`，繼續當前工作** |

⛔ **順路發現的東西，預設不當場做。** 當場處理只有三個例外：

1. **阻塞** —— 不修就做不完當前工作
2. **安全或資料完整性** —— guardrail 1 / 4 / 5 類
3. **使用者明確要求現在處理**

**配額**：每個 phase 最多帶 **1 個**治理／工具類 CH；超過的排隊。

> **這不是要你變被動。** 發現問題仍然要說 —— 差別在「說 + 記錄」而不是「說 + 立刻動手」。
> **什麼時候處理是使用者的排序權**，不是助手的。

#### 為什麼要寫成硬規則（2026-08-10 量到的代價）

專案第 4 天的實況：**產品程式碼 911 行 · 工具／gate 3,287 行 · 文件 20,909 行**。
16 個 CH 裡 **5 個 CI/工具 · 2 個流程文件 · 0 個產品功能**。

更關鍵的是它**自我增殖**：那天一個 session 關掉 1 條 AD、新增 3 條，BACKLOG 48 → 50。
**治理工作的產出是更多治理工作，這個迴圈沒有自然終點** —— 因為它永遠有正當理由，
而且做起來比業務邏輯容易。

同期三份未拍板的 ADR 各擋著一個里程碑（0005→M1 · 0003→M3 · 0002→M5），
而「**ADR-0005 擋著 M1**」直到第 4 天填 `ROADMAP.md` 才被發現 ——
三天來沒有人知道下一步的第一個路障在哪。

> **Rolling planning 只綁在 Phase 軌上。** CLAUDE.md 的滾動自檢六條全是 phase 導向，
> **沒有一條管 CH 的產生速率** —— 工作於是從沒被節流的那個閘門湧出來。本節就是那道閘。

```
任務進來
  ├─ 符合 active phase plan 的 deliverable？  → Phase 軌   → 繼續讀本檔
  ├─ 改現有行為 或 既定設計（非 bug）< 3 天？ → Change 軌  → PROCESS.md §3
  ├─ 修壞掉 / 不正確的行為？                  → Bug 軌     → PROCESS.md §4
  ├─ 純稽核 / 分析？ 產出就是一份 ADR？       → 不走軌 —— 寫報告 / 寫 ADR 即可
  └─ trivial（typo / 單行 / < 30 分鐘）？     → 直接 commit，免文件
```

**既定設計** = 已 approve 且約束後續工作的（設計文件 / **已採納**的 ADR / 規格）；起草中的不算。

**分類後向使用者確認軌別**，再開對應的 pre-doc。

| 軌 | pre-doc（沒有它不准寫 code）|
|---|---|
| Phase | `plan.md` + `checklist.md` |
| Change | `spec.md`（使用者 approved）|
| Bug | `report.md`（severity + repro 已確認）|
| 不走軌 | 無 —— 報告 / ADR **本身就是產出**，再包一層 spec 只是把同一段歷史寫兩遍 |

> 卡在分類上的話，**預設走比較重的那一軌** —— 事後降級比事後補文件容易。

---

## Overview（Phase 軌）

**Golden Rule**:

```
Plan → Checklist → Day-0 Verify → Code → Update Checklist → Progress → Closeout
```

跳過任何一步的代價都是**可追溯性**。三個月後你會想知道「當初計畫了什麼 vs 實際出貨了什麼」，
而唯一能回答這個問題的是 checklist 上那些**沒有被刪掉的 `[ ]`**。

**四份檔案共置在 `docs/01-planning/W{NN}-{slug}/`** —— plan / checklist / progress / retrospective
生命週期完全同步，分開放只會製造每日摩擦。

---

## Mandatory 5-Step Workflow

### Step 1: Create Plan File

**寫任何 code 之前**，建立 `docs/01-planning/W{NN}-{slug}/plan.md`。

**Required Sections**（見 frozen template）:

- **Summary** — 2-5 句：這個 phase 交付什麼、關掉哪個 gap、關鍵範圍決策、是否需要 drive-through
- **§0 Background** — gap / 為何重要 / root cause（含 `file:line` 錨點）/ 設計 / ground truth
- **§1 Phase Goal** — 一段話：可測量的目標 + 如何被證明
- **§2 User Stories** — 「作為 X，我希望 Y，以便 Z」
- **§3 Technical Specifications** — 設計決策 + 明確列出**不做**什麼
- **§4 File Change List** — 每個要新增/修改的檔案（含「你以為會改但不改」的，標 UNTOUCHED）
- **§5 Acceptance Criteria** — 可測量、可測試的 done 定義
- **§6 Deliverables** — `- [ ]` 對應每個 US
- **§7 Workload Calibration** — 見下方 §Workload Calibration
- **§8 Dependencies & Risks** — 什麼會擋住？緩解方案？
- **§9 Out of Scope** — 誘人但這次不做的，讓 reviewer 知道你考慮過

**Reference Template（FROZEN）**：`docs/01-planning/_templates/phase/plan.md.tpl`

⚠️ **這是絕對錨點，不是「參考最近一個 phase 的 plan」。**

**Why frozen**（80+ phase 漂移審計）：原規則「模仿最近完成的 phase」是**相對錨點** ——
每個 phase 抄前一個，微小漂移逐次累積成巨大偏移（自由格式 → 乾淨章節 → 600 字元流水句 H1 + 散文牆）。
**任何相鄰兩個看起來都「一致」**，但累積結果面目全非。凍結成絕對錨點才能止住棘輪。

**格式一致性鐵律**：phase 之間的差異用 **content** 表達（更多 stories / files / risks），
**絕不用 structure**（不加不改章節、不改 Day 數）。

---

### Step 2: Create Checklist File

Plan 核可後**立即**建立 `docs/01-planning/W{NN}-{slug}/checklist.md`。

**Format**:

```markdown
## Day N — Task Group

### N.M Task Description
- [ ] **Specific deliverable**
  - DoD: Measurable definition of done
  - Verify: `<command>`
```

**Key Rules**:

- 用 `- [ ]` 格式；每個 task 是單一邏輯單元（超過 1 個 commit 的量就要拆）
- 每項都要 **DoD**（怎麼算完成）+ **Verify**（用什麼指令證明）
- 對應到 plan 的 acceptance criteria
- **不要放時間估算** —— 不寫 `(Estimated X hours)` / `(Y min)`
  - Phase 層級的 calibration 在 plan §7；每日實際值在 progress.md
  - **Why**: Day 層級的估算變異度遠高於 phase 層級。逐日目標製造假精確，
    且 Day N 落後時引發不必要的焦慮。只有 phase 聚合值撐得過 3-phase 移動窗口

**Reference Template（FROZEN）**：`docs/01-planning/_templates/phase/checklist.md.tpl`

---

### Step 2.5: Day-0 Plan-vs-Repo Verify ⭐ 最高 ROI

**強制**：在 plan/checklist 起草完、Day 1 寫 code 之前執行。

從記憶 + 上下文起草的 plan **必然會偏離真實 repo**，因為：

- Class 名字在 phase 之間被改過
- 表名在別的 PR 裡動過
- 測試 fixture 路徑因 conftest 重構而位移
- Service / method 簽名在無關的 PR 裡演化了
- **內容漂移**：檔案存在，但它的**內容**跟 plan 的宣稱不一樣

**三-prong grep pass**（+ 情境性 sub-prong）：

| Prong | 驗證什麼 | 何時必做 |
|-------|---------|---------|
| **1 — Path Verify** | plan 提到的每個路徑，存在/不存在是否如預期 | 永遠 |
| **2 — Content Verify** | plan 對現有 code 的每個事實斷言，grep 該符號確認 | 永遠 |
| **2.5 — Child Tree Depth** | 前端頁面重構時，深入子元件樹 grep（entry 元件對了不代表子元件對）| 前端頁面 phase |
| **3 — Schema Verify** | DB 欄位級別比對（型別 / nullable / FK / migration head）| 動 DB 時 |

> **完整程序 + drift-class grep 對照表 + ROI 證據**：
> **Read [`docs/rules-on-demand/day0-plan-verify.md`](../../docs/rules-on-demand/day0-plan-verify.md) 於每個 Day 0。**

#### 記錄 drift findings

在 `progress.md` Day 0 條目下的 "Drift findings" 標題：

- 格式：`D{N}` ID + Finding + Implication
- 交叉引用到 plan §Risks
- **不要默默改 plan §Technical Spec** —— 把 finding 加到 §Risks。
  這保留了「原本計畫什麼 vs 現實逼你改成什麼」的審計軌跡

#### Go / No-Go 判準

| 範圍變動 | 行動 |
|---------|------|
| ≤ 20% | 繼續 Day 1，風險記入 §Risks |
| 20-50% | 修訂 plan §Acceptance + §Workload，跟使用者再確認 |
| > 50% | **中止 phase**，用現實基線重寫 plan |

---

### Step 3: Implement Code

**只有在 plan + checklist + Day-0 verify 都完成後才開始。**

1. 檢視 plan + checklist
2. 開分支：`git checkout -b feature/W{NN}-<scope>`
3. 對著 checklist deliverable 逐項實作
4. 頻繁 commit（一個邏輯單元一個 commit）

**禁止**：plan/checklist 未核可就開寫；沒有 checklist 條目的 commit；範圍蔓延卻不更新 plan。

---

### Step 4: Update Checklist During Implementation

**每日流程**：

- 早上：檢視今天的 checklist tasks
- 完成時：`[ ]` → `[x]`（**只能改，永不刪**）
- 被擋住：在該項下加 `🚧 阻塞：<reason>`，繼續做別的或升級處理
- 傍晚：commit checklist 更新

**神聖鐵律**：

- ❌ **永不刪除**沒做完的 `[ ]` 項
- ❌ **永不用刪行來隱藏**範圍縮減
- ✅ **永遠標記**：做完 `[x]`，沒做 `[ ]`（或正式放棄並註明）

**Why**: 可追溯性。retrospective 時我們要看到「計畫了什麼 vs 出貨了什麼」的差距。
刪掉未勾選項 = 銷毀證據。

---

### Step 5: Progress & Documentation

**每日（傍晚）**：更新 `docs/01-planning/W{NN}-{slug}/progress.md`

```markdown
# Phase W{NN} Progress — YYYY-MM-DD

## Today's Accomplishments
- Task X.Y — actual Z min (est ~W min, delta ±N%)
- Issue: blockers, discoveries

## Remaining for Next Day
- Task X.Z (pre-work done)

## Notes
- Learning / decision / risk
```

**Per-day 估算住在這裡** —— checklist 不放時間，progress.md 是每日/每任務時間追蹤的唯一家。
這裡的估算是**非約束性的個人紀錄**，用於校準下個 phase 的 bottom-up 估算，不 gate 任何東西。

**Phase 結束**：建立 `retrospective.md`（Q1-Q7 + 估算準確度）。
模板：`docs/01-planning/_templates/phase/retrospective.md.tpl`

---

### Step 5.5: Spike Phase Design Note

**When to apply**：phase 是 **spike**（探索新領域 / 新技術 / 新 gap fill）
→ Day 4 closeout **必須額外產出 1 份 design note**（從真實實作中 extract）。

**When NOT to apply**：phase 是 **feature continuation**（擴充已驗證的範疇、複用既有 pattern）
→ **不需要** design note，只要 progress.md + retrospective.md。

> **8-Point Quality Gate + retro 自查格式**：
> **Read [`docs/rules-on-demand/spike-design-note-gate.md`](../../docs/rules-on-demand/spike-design-note-gate.md) 於 spike phase 的 Day 4。**
> 模板：`docs/02-architecture/_TEMPLATE-design-note.md`

---

## Workload Calibration

Plan §7 **必須**用三段式：

> Bottom-up est ~X hr → calibrated commit ~Y hr (multiplier Z)

- **X** = 各任務 bottom-up 估算總和（原始，未校準）
- **Z** = 校準乘數，範圍 [0.4, 1.0]；未分類 scope 預設 **0.55**（mid-band）
- **Y** = X × Z = 你實際承諾的數字

**Why**: bottom-up 估算對 AI 輔助開發**系統性高估約 2 倍**。沒有校準，
phase 承諾會虛胖，「省下來」的時數掩蓋真實速度。

### 何時調整乘數

| 條件 | 行動 |
|------|------|
| 連續 3 個 phase `actual / committed > 1.2` | 調高乘數（低估中）|
| 連續 3 個 phase `actual / committed < 0.7` | 調低乘數（緩衝過多）|
| 單次離群值 | **忽略** —— 需要 3-phase 移動證據 |

### Day 4 retrospective Q2 必須驗證乘數

- 計算 `actual_total_hr / committed_total_hr`
- 記錄與期望值 `≈ 1.0` 的差距
- 若 `|delta| > 30%` → 記一條 AD，下個 plan 重新檢視乘數

### Scope class 乘數表

不同 scope class 的乘數不同（機械式重構 vs greenfield spike 差異巨大）。

> **查表 + 回填**：`docs/01-planning/CALIBRATION-MATRIX.md`
> - **起草 plan 時 Read** —— §7 的三/四段式需要 scope class 的乘數
> - **Day 4 closeout 時回填** —— 你的 class 那一行（≤ 1 行 ~250 字元；完整敘述進 `calibration-log.md`）
>
> Hygiene 由 `scripts/lint/check_rules_hygiene.py` 機械強制（行超過 400 字元即 fail）。

### Agent 委派時的四段式

當 phase 預期主要由 subagent 執行（≥ 80% 的 Day 1 工作），用四段式：

> Bottom-up ~X → class-calibrated ~Y (mult Z) → agent-adjusted ~Y' (agent_factor)

Plan §7 **必須**明確寫出 `Agent-delegated:` 欄位：

| 值 | 判準 | agent_factor |
|---|------|-------------|
| `yes` | ≥ 80% Day 1 工作經 agent | 見 matrix 的 sub-class |
| `partial` | 20-79% | 0.75（線性內插）|
| `no` | < 20%（自己直接做）| 1.0（用三段式）|
| `TBD-Day-1-decision` | 取決於 Day 0 發現 | Day 1 開始前必須定案 |

**Why 要在 plan 時就宣告**：不預先宣告的話，calibration class 會在 retro 時被回溯歸類，
造成資料點汙染。預宣告同時逼你在起草時就想清楚執行方式。

---

## Phase Closeout: 導航檔更新政策 ⭐

**Trigger**：retrospective.md 寫完後、開下個 phase plan 之前。

5 步 workflow 產出的是**執行紀錄**；這一節管的是**導航檔**（CLAUDE.md / MEMORY.md）——
讓它們保持精簡，**永遠不要把 phase 紀錄存檔進去**。

### 核心原則：單一來源

| 檔案 | 角色 | 該放什麼 |
|------|------|---------|
| **CLAUDE.md** | 導航 / 原則 / 規則 | 永恆性陳述（mission / 架構 / 約束 / 規則）；指向權威來源的導航；當前 phase 里程碑（**1 行**）|
| **MEMORY.md** | 品質指標索引 | 每個主題 1 條：subfile 連結 + 1 句主題 + 關鍵字 |
| **memory subfile** | 每 phase 細節 | 完整 retro 重點 / calibration / carryover / 檔案變更表 |
| **retrospective.md** | 權威完整 retro | phase 層級的真相來源 |
| **plan §7** | Calibration 來源 | 該 scope class 的乘數 / ratio |
| **01-planning/BACKLOG.md** | 待辦 / 未決 | 下個 phase 候選 / carryover 項 |
| **Git log + PR** | commit 層級真相 | 權威 |

### CLAUDE.md — Minimal Touch

**允許** ✅：

- 更新 `Current Phase` 那一格 —— **1 行**
- 更新 `Last Updated` footer —— **1 行**
- 里程碑達成時更新 `Phase` / `Roadmap` 格
- 真的變了才動 `Tech Stack` / `Architecture` / `Branch Protection`
- 新增**永恆性**的原則 / 規則章節

**禁止** ❌：

- 加 `Latest Phase` / `Prev Phase` / `Prev-Prev Phase` 這種塞滿 retro 細節的列
- 把 carryover AD / calibration ratio / commit SHA / PR 編號 / 測試數 / bundle 大小塞進表格格
- 在 footer 加多段歷史區塊
- 在檔尾加 `[歷史紀錄保留於下]` 存檔區塊
- 把待辦清單 inline 進表格格

**真實反例**：某專案的 CLAUDE.md 從 30KB 長到 **77KB**，其中約 58KB 是重複的 phase 紀錄
（表格 × 6 個 phase + footer 多段歷史 + 存檔區塊 + 20 條待辦清單）。
每個 session 開場就燒掉 9-12% 的 context window 在重複內容上。

**根因**：(1) closeout 時把完整 retro 倒進「索引」條目；(2) 表格格累積歷史但沒有存檔切點；
(3) **沒有 lint 強制**；(4)「捨不得刪」—— 每個舊 phase 列都覺得「還有用」。

### MEMORY.md — Quality Pointer

**允許** ✅ —— 加 1 條這種形狀（~250-300 字元）：

```markdown
- [project_wNN_<topic>.md](memory/project_wNN_<topic>.md) — Phase W{NN} closed YYYY-MM-DD; <1 句做了什麼>; <1 個短語：獨特之處或異常>.
  Keywords: <未來檢索用的 feature/AD/class/異常名稱>
```

**禁止** ❌：把 retro Q1-Q7 內容倒進來；列 calibration 數字 / commit SHA / PR 編號 / 測試數；
單條超過 500 字元（~300 是舒適上限）。

**品質判準**：這條指標能不能讓未來的你（或 AI）用關鍵字找到這個 phase？

| 品質 | 範例 |
|------|------|
| ✅ 好關鍵字 | feature 名 / AD ID / class 名 / 異常 pattern（`bimodal`、`silent CSS no-op`）|
| ❌ 壞關鍵字 | 泛詞（"frontend"、"refactor"）/ 只有日期 / 只有 phase id / 沒有上下文的數字 |

### Closeout Self-Check（commit 前）

- [ ] **CLAUDE.md 變更**：只有導航 / 原則 / 規則層級？（沒有加 phase 歷史紀錄）
- [ ] **MEMORY.md 新條目**：~250-300 字元的品質指標？（不是打包的 retro 摘要）
- [ ] **Phase 細節保存**：memory subfile + retrospective.md 有完整內容？
- [ ] **Carryover / 待辦**：記在 `01-planning/BACKLOG.md` 或下個 plan §Carryover？（不在 CLAUDE.md）
- [ ] **Calibration ratio**：回填到 `calibration-matrix.md`？（不在 CLAUDE.md / MEMORY.md 散文裡）
- [ ] **Matrix row 精簡**：新增/更新的行 ≤ 1 行 ~250 字元（lint 上限 400）？完整敘述進 calibration-log
- [ ] ⭐ **已採納的 ADR 已複查** —— 本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？
      有就在本片修，或開一條 AD。⚠️ 沒有這一格，審計 #7 指名的 18 條漂移沒有任何東西會問起
- [ ] ⭐ **`PR-pending` 標記已翻** —— merge 後翻標記，並以
      `gh pr view <N> --json state,mergedAt` **驗證**，不採信「已 merge」的宣稱。
      機械守衛：`check_status_markers.py` **E5**（它擋的是**矛盾**，不是標記本身）

---

## Common Risk Classes

起草 plan §Risks 時掃過這份目錄；適用就把 symptom + workaround 抄進你的 plan。
遇到 2 個以上 phase 撞同一個根因時，在這裡加一條新的。

### Risk Class A: 測試間的模組級 Singleton 汙染

**Symptom**：整合測試共用 module-level singleton（service factory / policy cache / metrics registry）
→ 第二個 fixture 拿到上一個 event loop 的 cached instance → 連鎖失敗。

**Workaround**：per-suite `conftest.py` autouse fixture 呼叫 `reset_*()`。

**Long-term**：重構成 DI 注入、不用 module-level cache。

**Related**：把新的 DB call 加進原本不碰 DB 的 endpoint，會揭露潛伏的隔離漏洞 ——
測試 override 了 auth 但沒 override DB session。症狀：改動前會過的測試，只在 endpoint 加了 query 之後才失敗。

### Risk Class B: 跨平台型別檢查差異

**Symptom**：同一個 import 在 Linux CI 與本機（Windows/macOS）的 type checker 行為不同
（stub 套件有無）。抑制註解在一邊必要、在另一邊變成「無用抑制」錯誤。

**Workaround**：雙 code 抑制（如 mypy 的 `# type: ignore[X, unused-ignore]`）。

**Long-term**：在依賴檔裡 pin stub 套件版本，讓兩邊行為一致。

### Risk Class C: 陳舊的長駐 dev server 掩蓋了 wiring 修正

**Symptom**：只在**程序啟動時**生效的修正（lifespan wiring、env 載入、DI singleton 建構），
對著已經在跑的 dev server 驗證時看起來「沒生效」—— 因為那個程序是在修正落地**之前**啟動的
（或 `--reload` 只重載了模組程式碼，**沒有**重跑 startup）。看起來像 code bug，其實是程序狀態。

**Workaround**：驗證 startup/wiring 行為前**乾淨重啟**：殺掉該 port 上**所有**陳舊程序
（不只 listener —— reload worker 是 spawn 子程序，它的 cmdline 裡可能沒有 server 名字），
確認 port 空出且新程序是唯一擁有者，再驗證，並**擷取證明 wiring 生效的 startup log 行**。

**加強版**：孤兒 spawn worker 可能因 SO_REUSEADDR 仍在服務該 port，
而 `stop` 指令 / `netstat` / 依 PID kill **全部漏掉它**（socket 被歸屬到已死的父程序）。
可靠檢查：列出所有該語言的程序 → 檢視 PID / PPID / StartTime → 強制殺掉任何父程序已死、
或 StartTime 早於本次重啟的 worker。**乾淨重啟必須驗證「活著的服務程序」，不是「port 擁有者 PID」。**

### Risk Class D: Plan 引用檔案路徑靠猜

**Symptom**：plan §Risks 用猜測式路徑引用某個 model（`models/<table_name>.py`），
Day-0 Prong 2 才發現它其實住在別處（依領域內聚分組）。浪費 3-5 分鐘。

**Workaround**：plan 引用 model 時引**設計文件的章節**，不引猜測的 `.py` 路徑。

### Risk Class E: CI 的 paths filter vs required status checks

**Symptom**：docs-only PR 不觸發被 path 過濾的 CI → required context 從未回報 → PR 卡在 BLOCKED。

**Workaround**：拿掉 CI 的 paths filter（讓每個 PR 都跑完整 CI），
或把 required check 設成能正確處理 skip 的 job。

**Trade-off**：docs-only PR 多花 1-2 分鐘 CI 時間 —— 對單人 / 小團隊的 PR 量完全可接受。

---

## Change / Bug 兩軌的落位

Phase 軌以外的工作走另外兩軌。每個實例有**兩種形式**，依「過程本身有沒有價值」選：

| 形式 | 何時 | 產出 | 模板 |
|------|------|------|------|
| **單檔 1-page**（預設）| 當天收得掉；phase Day 4 收尾的記錄 | `<CH\|BUG>-NNN-<slug>.md` —— Problem / Root Cause / Solution / Verification / Impact | `_templates/record.md.tpl` |
| **資料夾** | 跨天追蹤 / 需獨立 pre-doc gate / Sev1-2 | `spec`\|`report` + `checklist` + `progress`（+ `postmortem`）| `_templates/change/` · `_templates/bugfix/` |

兩者都放在 `docs/03-implementation/{changes,bugs}/`。
**phase 產出的變更記錄一律用單檔** —— 過程已經記在 phase 四件套裡，
開資料夾等於把同一段歷史寫兩遍。

編號全專案單調遞增；建立前先查最大號。
完整 lifecycle 與 gate：[`docs/01-planning/PROCESS.md`](../../docs/01-planning/PROCESS.md) §3 / §4。

> **重構**走 Change 軌的 `spec-refactor.md.tpl` 變體。
> 使用者看得到任何差異 → 那是行為變更，用一般的 `spec.md.tpl`。

---

## Before Commit Checklist

每個 commit 必須通過：

1. **對應 Phase Checklist** —— commit message 對應 task ID；checklist `[ ]` → `[x]` 已更新

2. **Lint + Format** —— `<lint 指令>` + `python scripts/lint/run_all.py`
   - ⚠️ **不要用 `--silent` 之類的旗標跑 lint** —— 它會連同雜訊一起吞掉錯誤輸出。
     真實案例：本機 `lint --silent` 全綠，CI 在 30 秒內爆 28 個錯誤。
     要乾淨輸出就用 `2>&1 | tail -20`（保留錯誤、修掉雜訊）

3. **Tests Passing** —— `<test 指令>`（新代碼 ≥ 80% 覆蓋率）

4. **Anti-Pattern Checklist** —— `.claude/rules/anti-patterns-checklist.md` 全部項目

5. **File Headers Updated** —— `.claude/rules/file-header-convention.md`

6. **委派給 agent 的工作 —— 所有 gate 你自己再跑一次，不要相信 agent 的回報**
   - 委派出去的工作必須跑**完整** gate 集合，不是只跑 lint/build/test
   - 在 agent prompt 裡**釘死**語言 / 慣例（使用者可見文案用什麼語言）
   - **獨立複驗**：把 agent 的「全綠」當作未經驗證，自己重現一次
   - 若 tool 輸出看起來損毀，換一個 reader 重讀再行動

7. **Drive-Through Acceptance** —— user-facing 功能必須**被駕駛過**，不只是通過 gate
   - 見 `.claude/rules/verification-discipline.md`（always-loaded）

---

## Prohibited Actions

- ❌ Force push 到 `main`
- ❌ 沒有對應 checklist 條目的 commit
- ❌ 刪除 checklist 上未勾選的 `[ ]` 項
- ❌ 跳過 progress.md 更新（每日更新）
- ❌ bug / feature 變更沒有 FIX/CHANGE/REFACTOR 紀錄
- ❌ plan + checklist 存在之前就寫 code
- ❌ commit secrets、大型 binary、產生檔
- ❌ 範圍蔓延卻不更新 plan
- ❌ 沒做過 drive-through 就標 user-facing 功能為 done，或報「已驗證 / ~X% 可用」

---

## Phase Naming & Directory Structure

```
docs/01-planning/W{NN}-{slug}/
├── plan.md           ← code 之前必須存在
└── checklist.md      ← code 之前必須存在

docs/01-planning/W{NN}-{slug}/
├── progress.md                   ← phase 期間每日條目
├── retrospective.md              ← phase 結束
└── artifacts/                    ← 證據檔（截圖等）
```

**Branch**：`feature/W{NN}-<scope>`
**Commit**：`<type>(<scope>, W{NN}): <description>`

詳見 `docs/rules-on-demand/git-workflow.md`。

---

## Common Violation Patterns

| Pattern | 為何有害 | 修正 |
|---------|---------|------|
| **跳過 Plan** | 範圍不明 → PR 不清 → 返工 | 永遠 plan → checklist → code |
| **跳過 Checklist** | 無法量測進度；retro 瞎猜 | Checklist 是真相表，強制 |
| **刪除 `[ ]` 項** | 隱藏範圍縮減；retro 無法診斷 | 只能標 `[x]` 或註明 `🚧 阻塞` |
| **事後補 checklist** | 資料品質差 → 估算無用 | 每日、進行中更新 |
| **跳過 progress.md** | 「最後再寫」→ 細節已遺失 | 每日 10 分鐘條目 |
| **沒有 change record** | 沒有審計軌跡；同一個 bug 再犯 | 每次都寫 FIX/CHANGE/REFACTOR |
| **模糊 DoD** | 「實作 X」→ 什麼叫做完？無盡返工 | DoD 必須可測試 + 可量測 |
| **格式漂移** | 每個 plan 章節數/命名/Day 數都不同 → 導航成本 | 對著 **frozen template**，不是上一個 phase |
