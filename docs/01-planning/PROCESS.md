# PROCESS — 三軌工作流

**Purpose**: 本專案的 **workflow source of truth**。任何工作開始之前必須先跑分類。
**Category**: Development Process
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

> **與 `.claude/rules/task-workflow.md` 的分工**：那份是 always-loaded，內含 **Phase 軌**
> 的逐日執行細節（5 步流程 / Day-0 三-prong / closeout / before-commit）。
> **本檔負責「這是哪一軌」與 Change / Bug 兩軌的 lifecycle**，不重複 Phase 軌的細節。

---

## 0. 為什麼需要這個

| 痛點 | 解法 |
|---|---|
| AI 收到一句話就衝去改 20 個檔，沒有 plan | **Pre-implementation gate（R1）** —— 沒有對應文件不准寫 code |
| 無法區分 phase work / change / bug → 一律當 ad-hoc 做 | 3 條明確的軌 + AI 自動分類 |
| Change / bug fix 沒有流程，容易漏驗證與追溯 | 每軌各自的 pre-doc + checklist + progress |
| 「這個 bug 之前修過嗎」沒人答得出 | 每個 bug 一個資料夾，永久留存 |

---

## 1. 任務分類（AI Routing）

### 1.1 決策樹

```
incoming task
    │
    ├─► 符合 active phase plan 的 deliverable？            → Phase 軌
    │
    ├─► 改現有功能的行為（非 bug）？
    │      AND scope < 3 天？
    │      AND 有明確 acceptance criteria？                → Change 軌
    │
    ├─► 修不正確 / 壞掉 / regressed 的行為？               → Bug-fix 軌
    │
    └─► trivial（typo / 單行 / < 30 分鐘）？               → 直接 commit，免文件
```

### 1.2 分類線索

| 使用者說法 | 可能是 |
|---|---|
| 「實作 F<n>」/ 符合 active phase | Phase |
| 「改 X 的行為」/「加 Y 選項」/「支援 Z」 | Change |
| 「X 不 work」/「壞了」/「fail」/「regression」/「錯了」 | Bug-fix |
| 「修 typo」/「rename 變數」/「更新註解」 | Trivial |

### 1.3 分類協定

收到非明顯 trivial 的任務：

1. **分類**（§1.2）
2. **向使用者提出**：「我判斷這是 [Phase / Change / Bug-fix]，建議走 X 軌，
   即先準備 [plan.md / spec.md / report.md]。OK？」
3. **等使用者 confirm**（或 override 分類）
4. **開對應文件**（§1.4）
5. **才開始寫 code**

> ⚠️ **不要在分類上耗費儀式感**。分類是一句話的事；卡住的話預設走比較重的那一軌，
> 之後降級比事後補文件容易。

### 1.4 Pre-Implementation Guard（R1）

> **沒有對應文件不可以開始寫 code。**

| 軌 | 必有 pre-doc | 缺了怎麼辦 |
|---|---|---|
| **Phase** | `plan.md` + `checklist.md` | STOP，請使用者確認 phase kickoff |
| **Change** | `spec.md`（scope + acceptance，**使用者 approved**）| STOP，提出 draft spec，等 approve |
| **Bug-fix** | `report.md`（symptom + repro + severity 已確認）| STOP，提出 draft report，等 confirm |
| **Trivial** | 無 | 直接 commit |

---

## 2. Phase 軌

### 2.1 資料夾

`docs/01-planning/W{NN}-{phase-name-kebab}/`

```
docs/01-planning/W07-user-auth/  <!-- path-check: ignore -->
├── plan.md            ← scope contract（status=active 後 locked，deviation 進 changelog）
├── checklist.md       ← 從 plan 導出的原子勾選項（每天勾）
├── progress.md        ← 每日 Day-N 條目 + Day-0 drift findings + drive-through 紀錄
├── retrospective.md   ← 收尾：Q1-Q7 + calibration ratio + carryover
└── artifacts/         ← 截圖、量測輸出、drift 報告
```

模板：`_templates/phase/`（**FROZEN 錨點** —— 對照那個檔案，不是上一個 phase）。

### 2.2 🔴 `{NN}` 是共享命名空間 —— 挑號之前必須掃所有分支

`{NN}` 沒有 allocator。平行 session 各自在獨立 worktree，`git status` 看不到對方
**尚未 merge** 的分支。**只看 `main` 或本地目錄列表一定會撞號。**

```bash
git fetch --all
git branch -r | while read b; do git ls-tree --name-only "$b" docs/01-planning/ 2>/dev/null; done \
  | grep -oE 'W[0-9]{2,}' | sort -u | tail -5
```

挑 **最大號 + 1**。號一旦 commit 就視為 claim，不可重用。

> **實戰教訓（來源專案，同一天出現兩個 W36）**：後開的那個只看了 `main`，
> 看不到前一個還在未 merge 的分支上。兩個都收尾了才發現。
> **沒有改名** —— 因為 commit message / merge commit / PR 標題全部寫死了「W36」，
> 改資料夾只會讓 history 和 tree 永久對不上：用一個外觀問題換一個修不好的矛盾。
> **引用時一律帶後綴**（`W36-opco-budget-gate` vs `W36-n8n-intake-adapter`）。

### 2.3 Lifecycle

逐日執行細節（5 步流程 / Day-0 三-prong / Workload calibration / closeout policy /
before-commit checklist）在 **`.claude/rules/task-workflow.md`**（always-loaded）。此處只給骨架：

```
前一個 phase retro 簽掉
   → 🔴 git fetch --all 掃所有分支挑未用的 {NN}（§2.2）
   → mkdir W{NN}-{slug}/ + cp _templates/phase/* （去掉 .tpl）
   → 填 plan.md（scope + 前一個 retro 的 carry-over）
   → 從 plan 導出 checklist.md
   → Day-0 plan-vs-repo 三-prong 驗證，drift findings 寫進 progress.md
   → 每日：實作 → commit + 勾 checklist → 更新 progress Day-N
   → 收尾：全部勾完或明確 defer（理由寫 progress）→ retrospective.md
   → 架構級決定 → 寫 ADR（R5）→ BACKLOG 同步（R7）
```

---

## 3. Change 軌

### 3.1 什麼時候用

| 用 Change | **不要**用（改走別軌）|
|---|---|
| 改現有功能的行為 | 全新功能 → Phase |
| Scope < 3 天 | 跨週 → Phase |
| 行為本來是對的，現在要改 | 行為本來就錯 → Bug-fix |
| **重構**（行為不變，改結構）| 使用者看得到差異 → 那是行為變更，仍是 Change 但要標明 |

### 3.2 資料夾 / 編號

`docs/03-implementation/changes/CH-{NNN}-{kebab}/` —— `CH-001`、`CH-002`…
3 位數，**全專案單調遞增**（不 per-phase 重來）。建立前先查最大號：

```bash
ls docs/03-implementation/changes/ | sort -V | tail -1
```

### 3.3 產出 —— 兩種形式，依「過程有沒有價值」選

**輕量（預設）** —— 單檔 1-page 記錄：

```
CH-{NNN}-{kebab}.md      ← Problem / Root Cause / Solution / Verification / Impact
```

模板：`../01-planning/_templates/record.md.tpl`。目標 40-70 行。
**phase 在 Day 4 收尾產出的變更記錄一律用這個** —— 過程已經記在 phase 四件套裡，
再開一個資料夾只會把同一段歷史寫兩遍。

**完整（需要獨立追蹤時）** —— 資料夾三件套：

```
CH-{NNN}-{kebab}/
├── spec.md         ← what / why / scope / acceptance（approve 後 locked）
├── checklist.md    ← 原子實作項
└── progress.md     ← 執行日誌 + 完成摘要
```

模板：`../01-planning/_templates/change/`。
**判準**：需要跨天追蹤、需要獨立的 pre-doc gate、或決策過程本身值得留 → 用資料夾。
**只有結論有價值 → 用單檔。** 選錯的成本是不對稱的：單檔寫到 150 行時再升級成資料夾很容易，
但為了一個當天收掉的改動開三個檔，那三個檔往後每次 grep 都要付成本。

**若這是重構**（行為不變）→ 用 `spec-refactor.md.tpl`：它多要求
**量化改善了什麼** + **行為不變的證明** + **防復發守門**。

### 3.4 Lifecycle

```
1. AI 分類 → Change → 提出 spec.md draft（status: proposed）
2. 使用者 approve scope + acceptance → status: approved   ← R1 gate 在這裡
3. mkdir + cp templates + 填 spec
4. 從 spec §3 acceptance 導出 checklist
5. 實作，每日更新 progress + 勾 checklist
6. 收尾：acceptance 全勾、寫完成摘要、status: done
```

---

## 4. Bug-fix 軌

### 4.1 什麼時候用

| 用 Bug-fix | **不要**用 |
|---|---|
| 行為本來對（per spec）但現在錯了 | 行為一直都錯 / spec 有缺口 → Change |
| Fix < 3 天 | 跨週重構 → Phase |
| 可重現（或 trace 可偵測） | 模糊的「感覺很慢」沒有 metric → 先 triage |

### 4.2 資料夾 / 編號

`docs/03-implementation/bugs/BUG-{NNN}-{kebab}/` —— 3 位數，全專案單調遞增。

### 4.3 產出 —— 同 §3.3 的兩種形式

**輕量（Sev3/Sev4 預設）** —— 單檔 1-page 記錄：

```
BUG-{NNN}-{kebab}.md     ← Problem / Root Cause / Solution / Verification / Impact
```

模板：`../01-planning/_templates/record.md.tpl`（與 Change 軌共用同一份）。

**完整（Sev1/Sev2，或調查跨天）** —— 資料夾：

```
BUG-{NNN}-{kebab}/
├── report.md        ← symptom + repro + impact + severity（triage 後 locked）
├── checklist.md     ← 調查 + 修復 + regression test + 驗證
├── progress.md      ← 時間線 + 收尾摘要
└── postmortem.md    ← 選用 —— Sev1/Sev2 **必寫**
```

> Sev1/Sev2 用資料夾不是形式主義：事故的**時間線**（什麼時候發現、什麼時候誤判、
> 什麼時候找到根因）本身就是要留的東西，塞不進 1-page 的 §Root Cause。

### 4.4 Severity

| Severity | 定義 | Postmortem？ |
|---|---|---|
| **Sev1** | Production 中斷 / 資料遺失 / 安全事件 | ✅ 必寫 |
| **Sev2** | 主要功能壞掉 / 嚴重使用者影響 | ✅ 必寫 |
| **Sev3** | 次要功能降級 / 特定情境 | 🟡 反覆發生就寫 |
| **Sev4** | 外觀 / edge case / 低影響 | ⏸️ 選用 |

### 4.5 Lifecycle

```
1. AI 分類 → Bug-fix → 提出 report.md draft
2. 使用者 confirm repro + impact + severity → status: triaged   ← R1 gate
3. mkdir + cp templates + 填 report
4. 導出 checklist（調查 + 修復 + regression + 驗證）
5. 本地重現 → investigating
6. 找到根因 → fixing
7. 修復 + regression test（**修之前 fail、修之後 pass**）→ verifying
8. 在環境中驗證 → done
9. Sev1/Sev2 或反覆發生 → 寫 postmortem
10. 若是新的風險型態 → 更新 RISK_REGISTER.md
```

> **修 bug 前先 Grep `docs/03-implementation/bugs/`** —— 這個 bug 修過嗎？
> 同一個 bug 修第三次的時候，該做的不是再修一次，是解決**根因**。

---

## 5. Binding Rules（流程級硬規則）

| ID | 規則 | 違反時 |
|---|---|---|
| **R1** | Pre-implementation 文件必須存在（plan / spec / report）| **STOP**，請使用者開對應 kickoff |
| **R2** | 每日 commit 對應 `progress.md` 的 Day-N 條目（`docs(planning):` 類 housekeeping 例外）| Reviewer 拒 merge |
| **R3** | plan / spec / report 的 deviation 必須先寫進對應 changelog | 不可 silent drift |
| **R4** | Open question 拍板 → 同步更新對應決策文件 **AND** progress 條目 | 兩處都要反映 |
| **R5** | 架構級決定（觸發 CLAUDE.md 核心約束的）→ 必寫 ADR | Block 收尾 |
| **R6** | **不可刪除未勾選的 `[ ]` 項** —— 只能 `[ ]` → `[x]` 或標 🚧 + 理由 | 隱藏 scope 削減，retro 失去診斷能力 |
| **R7** | Pending / next-candidate 的識別與進度變動 → 同步 `BACKLOG.md` | 不可 silent drift |
| **R8** | User-facing 功能標 done 前必須做過 **drive-through**（真 UI + 真後端）| 見 `.claude/rules/verification-discipline.md` |
| **R9** | **收尾必須翻 `status:` frontmatter** —— phase 以 `plan.md` 的 frontmatter 為唯一權威；Change / Bug 同理翻自己的 pre-doc。**只 commit code 不算收尾** | 追蹤文件開始顯示**假 pending**，盤點必然出錯 |

> **R9 為什麼需要一個腳本，而不是一句叮嚀**
>
> 來源專案立了 R9，**一天之後**的跨來源審計就發現它**結構上無法執行**：
> **31 / 108** 個 `plan.md` 根本沒有 `status:` 這個欄位（沒有欄位就沒有東西可翻），
> 而且 **13 個 phase 的內文**標記還寫著 `active` / `draft` / `proposed`，全部早已收尾。
> 沒有人察覺，因為**沒有任何東西會叫**。
>
> 更糟的是內文標記當時有**四種互不相容的格式**，沒有一種是範本規定的 frontmatter。
> 第一版檢查器只匹配了其中兩種，而漏掉的那批裡面就藏著 2 個 stale ——
> **寫檢查器之前必須先枚舉真實格式，不可以憑印象。**
>
> **修訂後的 R9**：
> 1. **每一軌的 pre-doc frontmatter 是該軌的唯一權威** ——
>    phase → `plan.md` · Change → `spec.md` · Bug → `report.md`。一律照對應的 `_templates/`
> 2. **內文狀態標記可以保留**（它載著「誰、何時核可」這類 R1 佐證），但**粗粒度必須一致**
> 3. **兄弟檔（`checklist` / `progress` / `retrospective` / `postmortem`）的 frontmatter 屬
>    best-effort** —— 缺了不算違規（判死活實際上只看 pre-doc），但**寫了就必須一致**
> 4. **單檔 1-page 記錄不在 R9 範圍內** —— 那個形式用於當天收得掉的工作，
>    它記的是**結論不是生命週期**。若你發現自己在更新它的狀態，代表它該升級成資料夾三件套
> 5. **靠機器檢查，不靠自律**：`python scripts/lint/check_status_markers.py`
>    （E1 缺欄位 / E2 內外矛盾 / E4 兄弟檔矛盾 → 退出碼 1；E3 久未 commit → 只警告，
>    因為工作可以合法地長期卡在外部阻塞上）
>
> > ⚠️ **R9 自己差點重蹈覆轍。** 本規則寫進模板時，涵蓋文字寫的是「三軌」，
> > 但當時 Change / Bug 的模板**根本沒有 `status:` 欄位**，而檢查器只掃 phase ——
> > 即「三軌之中兩軌結構上不可執行」，跟它自己描述的失效**一模一樣**。
> > 教訓:**一條規則寫「適用於 X」的時候，先去確認 X 身上有沒有那個可以被檢查的東西。**
>
> **教訓：沒有東西會叫的規則等於沒有規則。** 真正的修復不是補幾百行 frontmatter，
> 而是加一個會叫的檢查。

---

## 6. Session Start Protocol

每個 session 開始（讀完 CLAUDE.md 之後）：

```
1. 讀 CLAUDE.md（always-loaded 規則已自動在 context）
2. 辨識使用者的任務
3. 分類任務類型（§1）
   a. Active phase  → 讀 W{NN}/{plan, checklist, progress 最後 3 條} → 下一個未勾項 → 確認 → 執行
   b. Change        → 提出 spec.md → 確認 scope → mkdir CH-NNN → 執行
   c. Bug           → 提出 report.md → 確認 severity + repro → mkdir BUG-NNN → 調查
   d. Trivial       → 直接實作，單一 commit
4. 絕不跳過分類（R1）—— 不清楚就 STOP and ask
```

詳版 onboarding prompt：`docs/12-ai-assistant/01-prompts/session-start.template.md`。

---

## 7. 人類開發者的責任

| 階段 | 人要做什麼 |
|---|---|
| Kickoff（任一軌）| approve `plan.md` / `spec.md` / `report.md` 之前 AI 不 start |
| 每日 | 回答 open question；裁決模糊的分類 |
| 執行中 | approve changelog 裡的重大 deviation |
| 收尾 | review retro / postmortem，確認 ADR 覆蓋，簽掉 |

---

## 8. 反模式（必避免）

| ❌ | ✅ |
|---|---|
| 一次建立所有未來 phase 的資料夾 | **Rolling**：每個 phase kickoff 才建 |
| 實作了但不更新 checklist + progress | 每個 commit 後同步勾 |
| Scope 改了但沒有 changelog | Deviation 必 log（R3）|
| 刪掉沒做完的 `[ ]` 項 | 只能 `[x]` 或 🚧 + 理由（R6）|
| 跳過 Sev1/Sev2 的 postmortem | 至少涵蓋 what worked / didn't / action items |
| 多天工作沒有 plan/spec/report 直接做 | R1 STOP，先 kickoff |
| 架構改動不寫 ADR | R5 必寫 |
| 跳過 §1 分類直接實作 | R1 violation，STOP 重新分類 |
| **因為 gap analysis 就預寫一批規劃文件** | 先 thin spike → retro → extract design note |

---

## 9. 本檔的演化規則

- 加 / 改 binding rule（R1-R9）：**必須使用者明確 approve**
- 加 routing 條目 / 澄清措辭：可自行更新
- 加新的軌（超出 3 條）：重大，必須 approve
- 改資料夾命名慣例：重大，必須 approve
- Commit：`docs(process): update PROCESS — <summary>`

---

**End of PROCESS.md — workflow 的 source of truth。**
