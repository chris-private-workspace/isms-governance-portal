# 開發資訊流 — 讀什麼 / 產生什麼 / 更新什麼

**Purpose**: 五種開發情境（Phase / Change / Bug / 發版 / 交接）各自的完整資訊流。
這是整套流程的**中心地圖** —— 不確定「現在該讀哪個檔、該產生什麼」時，來這裡。

**Category / Scope**: Development Process / 導航
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

---

## 為什麼需要這份文件

規則檔告訴你**規則是什麼**；模板告訴你**格式長怎樣**。
但一個新加入的人（或新 session 的 AI）真正卡住的問題是：

> 「我現在要做 X，**我該讀哪些檔？做完要留下什麼？哪些地方要更新？**」

這份文件回答那個問題。

---

## 全景圖

```
┌─────────────────────────────────────────────────────────────────┐
│  常駐層（每個 session 自動載入 — 不用主動讀）                      │
│  CLAUDE.md · .claude/rules/{task-workflow, verification-       │
│  discipline, file-header-convention, anti-patterns}.md           │
└─────────────────────────────────────────────────────────────────┘
                              │
              先分類（PROCESS.md §1）—— 沒有 pre-doc 不准寫 code
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ Phase 軌 │          │Change 軌 │          │ Bug 軌   │
   │  W{NN}  │          │ CH-NNN  │          │ BUG-NNN │
   │   (A)   │          │   (B)   │          │   (C)   │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
   pre-doc:             pre-doc:             pre-doc:
   plan+checklist       spec（approved）      report（triaged）
        │                    │                    │
        ▼                    ▼                    ▼
   完整 5 步流程         輕量流程             診斷優先流程
   plan→checklist       spec→checklist       重現→根因→修
   →Day0→code→          →code→drive-        →回歸測試（修前
   drive-through        through→closeout    fail、修後 pass）
   →closeout
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
              ┌──────────────────────────────┐
              │  追蹤層（永遠要更新的）        │
              │  progress · MEMORY ·          │
              │  BACKLOG · RISK_REGISTER ·    │
              │  導航檔                        │
              └──────────────┬───────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        ▼                                         ▼
   ┌─────────┐                              ┌─────────┐
   │ 發版     │                              │ 交接     │
   │ RELEASE │                              │ HANDOFF │
   │   (D)   │                              │   (E)   │
   └────┬────┘                              └────┬────┘
        ▼                                        ▼
   版號→pre-flight                          蒐集事實→交接文件
   →tag→部署→驗證                           →口頭走一遍→驗收
   →公告→觀察窗口                            （或 onboarding）
```

---

## 情境 A：Phase 軌（新功能 / SPIKE）

### A-1. 讀什麼（依序）

| # | 檔案 | 為什麼讀 | 必讀？ |
|---|------|---------|-------|
| 1 | `CLAUDE.md` §Core Vision + §核心約束 | 對齊方向與硬約束 | 自動載入 |
| 2 | `MEMORY.md` | 跨 session 累積的教訓 | ✅ |
| 3 | `docs/01-planning/BACKLOG.md` | 有哪些待辦 / 這次要關哪個 | ✅ |
| 4 | `docs/architecture.md` + `docs/02-architecture/README.md` | 主 spec + 設計文件索引 | ✅ |
| 5 | 相關的**核心設計文件**（`docs/02-architecture/NN-*.md`）| 這個領域已經定了什麼 | ✅ |
| 6 | 相關的**design note**（`docs/02-architecture/design-notes/`）| 前人 spike 驗證過什麼、什麼還沒驗證 | 有相關才讀 |
| 7 | `docs/14-adr/`（ADR）| 有沒有已定案、不該推翻的決策 | 有相關才讀 |
| 8 | `docs/01-planning/CALIBRATION-MATRIX.md` | 這類 scope 的工時乘數 | ✅（起草 §7 需要）|
| 9 | `docs/01-planning/_templates/phase/plan.md.tpl` ⭐ | **frozen 錨點** —— 不是抄上一個 phase | ✅ |
| 10 | `docs/rules-on-demand/day0-plan-verify.md` | Day 0 完整程序 | ✅（Day 0）|
| 11 | **既有程式碼（Grep）** | 建之前先查 —— 它可能已經存在 | ✅ |

> 第 11 項不是可選的。「假設不存在就新建」是重複實作的頭號來源。

### A-2. 產生什麼

| 階段 | 產出 | 位置 |
|------|------|------|
| 規劃 | `plan.md` | `docs/01-planning/W{NN}-{slug}/` |
| 規劃 | `checklist.md` | `docs/01-planning/W{NN}-{slug}/` |
| Day 0 | drift findings 表 | `docs/01-planning/W{NN}-{slug}/progress.md` |
| 每日 | progress 條目 | 同上 |
| Drive-through | 截圖 + observed-vs-intended | `docs/01-planning/W{NN}-{slug}/artifacts/` |
| 收尾 | `retrospective.md` | `docs/01-planning/W{NN}-{slug}/` |
| 收尾（**spike 才要**）| `NN-<topic>-design.md` | `docs/02-architecture/design-notes/` |
| 收尾（**重大決策才要**）| `NNNN-<slug>.md` | `docs/14-adr/` |
| 收尾 | `project_wNN_<topic>.md` | `memory/` |

**什麼時候要 design note vs ADR vs 都不要**：

| 情況 | 產出 |
|------|------|
| Spike（新領域 / 無藍本 / 驗證了新的不變式）| **Design note**（含 file:line + 可重現驗證，verified ratio ≥ 95%）|
| 做了一個會約束未來的**決策**（選型 / 架構取向 / 放棄某條路）| **ADR**（輕量：背景 / 選項 / 決定 / 後果）|
| 兩者都是（spike 過程中做了重大決策）| Design note 的 §1 Decision Matrix 就夠了，**不用另開 ADR** |
| Feature continuation（複用既有 pattern、無新決策）| **都不要**（progress + retrospective 就夠）|

### A-3. 更新什麼

| 檔案 | 改什麼 | 上限 |
|------|-------|------|
| `checklist.md` | `[ ]` → `[x]` | **永不刪除未勾選項** |
| `CLAUDE.md` | Current Phase + Last Updated | **各 1 行** |
| `MEMORY.md` | 加 1 條品質指標 | **~300 字元** |
| `docs/01-planning/BACKLOG.md` | 關掉的 AD 移到 Shipped；新 AD 加到 Open | — |
| `docs/01-planning/CALIBRATION-MATRIX.md` | 你的 scope class 那一行 | **≤ 250 字元** |
| `docs/01-planning/CALIBRATION-LOG.md` | 完整敘述 | 不限 |
| `docs/02-architecture/README.md` | 若新增 design note → 加 1 行索引 | 1 行 |
| `docs/14-adr/README.md` | 若新增 ADR → 加 1 行索引 | 1 行 |
| `docs/09-analysis/INDEX.md` | 若新增狀態快照 → 加 1 行索引 | 1 行 |

---

## 情境 B：Change 軌（改現有行為）

既有功能的行為 / 範圍 / 介面改變。

### B-1. 先判斷規模

| 規模 | 判準 | 走哪條 |
|------|------|-------|
| **大** | 動到多個範疇 / 需要新設計決策 / > 1 天 | **走情境 A 的完整流程** |
| **中** | 單一範疇 / 有明確方案 / 半天到一天 | 簡化流程（見下）|
| **小 / trivial** | 改幾行 / 無設計決策 / < 30 分鐘 | 直接 commit，免文件（PROCESS §1.1）|

> 判準一句話：**三個月後的你需要能追溯這個決定嗎？** 需要 → 往上一級。

### B-2. 讀什麼

| # | 檔案 | 為什麼 |
|---|------|-------|
| 0 | `docs/01-planning/PROCESS.md` §3 | 確認這真的是 Change 而不是 Phase / Bug |
| 1 | **既有 CH / BUG 資料夾**（Grep `docs/03-implementation/`）| 這個地方之前改過嗎？為什麼變成現在這樣？ |
| 2 | 相關的核心設計文件 | 這次改動會不會違反已定的設計 |
| 3 | 相關 ADR | 會不會推翻已定案的決策（要推翻就得寫新 ADR 取代舊的）|
| 4 | 要改的程式碼 + **它的測試** | 現有行為的真相 |
| 5 | `verification-discipline.md`（自動載入）| user-facing 就要 drive-through |

### B-3. 產生什麼

- **輕量（預設）**：`changes/CH-NNN-<slug>.md` 單檔 —— §Problem 要先寫、且 scope 要 approved
  才能寫 code（R1）；其餘 4 段（Root Cause / Solution / Verification / Impact）邊做邊填
- **完整（跨天 / 需獨立 gate）**：`changes/CH-NNN-<slug>/spec.md`（approved 後 locked）
  + 同資料夾的 `checklist.md`（從 spec §3 acceptance 導出）+ `progress.md`
- 測試（新行為 + **負面測試**）
- user-facing → drive-through 證據（截圖 + observed-vs-intended）

> **重構**（行為不變）用 `spec-refactor.md.tpl` —— 它額外要求量化改善 + 行為不變的證明。

### B-4. 更新什麼

- 被改功能的**文件**（design note / 核心設計文件的對應段落）
  → ⚠️ 這一步最常被漏。**改了行為卻沒改文件 = 文件開始說謊**
- 相關檔案的 **Modification History**（1 行）
- `docs/01-planning/BACKLOG.md`（若這次改動關掉或產生了待辦）

---

## 情境 C：Bug 軌（修不正確的行為）

### C-1. 讀什麼（診斷優先）

| # | 檔案 | 為什麼 |
|---|------|-------|
| 1 | **既有 BUG 資料夾**（Grep `docs/03-implementation/bugs/`）| ⭐ **這個 bug 修過嗎？** 同一個 bug 反覆出現代表根因沒解決 |
| 2 | 症狀相關的程式碼 | — |
| 3 | 該處的**測試** | 為什麼現有測試沒抓到？（這常常比 bug 本身重要）|
| 4 | 相關的 design note / 設計文件 | 這裡的行為原本設計成什麼樣？ |
| 5 | `git log` / `git blame` 該處 | 什麼時候變成這樣的、當時為了什麼 |

### C-2. 產生什麼

- **輕量（Sev3/4 預設）**：`bugs/BUG-NNN-<slug>.md` 單檔 —— §Problem（症狀 + repro）要先寫、
  severity 要先確認才能開修（R1）
- **完整（Sev1/2 / 調查跨天）**：`bugs/BUG-NNN-<slug>/report.md`（triage 後 locked）
  + 同資料夾的 `checklist.md` + `progress.md`（含**排除掉的假設** —— 那是第二有價值的部分）
- **回歸測試**：修之前 fail、修之後 pass，**兩個方向都要實際跑過**
- Sev1 / Sev2 → `postmortem.md`（**必寫**）
- user-facing → drive-through 證據

### C-3. Bug 紀錄要回答的關鍵問題

一般的 bug 紀錄只寫「壞了什麼、怎麼修的」。這套流程要求多回答兩個：

1. **為什麼現有測試沒抓到？** → 指向測試策略的漏洞
2. **怎麼防止再發生？**（短期 + 長期）→ 可能產生新的 lint / 測試 / 規則

> 只修 bug 不回答這兩個問題，同一類 bug 會反覆出現。

### C-4. 更新什麼

- 相關檔案的 Modification History
- 若根因指向流程漏洞 → 記一條待辦到 `docs/01-planning/BACKLOG.md`
- 若揭露新的風險型態 → `docs/01-planning/RISK_REGISTER.md`
- 若加了新的預防機制（lint / 測試模式）→ 更新對應規則檔

---

## 情境 D：發版（RELEASE）

> 完整規則：`docs/rules-on-demand/release-process.md` · 指令：`/release`

### D-1. 讀什麼

| # | 對象 | 為什麼 |
|---|------|-------|
| 1 | `CHANGELOG.md` §Unreleased | 這一版有什麼 → 決定版號 |
| 2 | `git log <上個 tag>..HEAD` | 對照 CHANGELOG 有沒有漏 |
| 3 | `gh pr list --state open` | 有沒有該進這版卻還開著的 |
| 4 | `docs/rules-on-demand/release-process.md` | checklist + rollback 準備 |
| 5 | 相關 ADR | 這版有沒有推翻某個已定案的決策（要在 notes 說明）|

### D-2. 產生什麼

| 產出 | 位置 |
|------|------|
| CHANGELOG 的版本區塊（`[Unreleased]` → `[X.Y.Z]`）| `CHANGELOG.md` |
| Annotated tag `vX.Y.Z` | git |
| Release notes | GitHub Release / `docs/releases/vX.Y.Z.md` |  <!-- path-check: ignore -->
| 部署後的驗證紀錄 | release notes §驗證 |

### D-3. 更新什麼

- [ ] `CHANGELOG.md` —— 開一個新的空 `[Unreleased]`
- [ ] 對外文件的版本標示（README / API doc）
- [ ] 若有 breaking change → 通知下游
- [ ] 若這版揭露了流程漏洞 → 記到 `docs/01-planning/BACKLOG.md`

### D-4. 版號判準

**有沒有人會因為升級而壞掉，而且他什麼都沒做錯？**

最常被誤判的三個：**加必填欄位** = MAJOR · **改預設值** = MAJOR ·
**事件 schema 加必填欄位** = MAJOR（舊消費者會爆）。

### D-5. 兩個最容易被跳過的

1. **部署後的 drive-through** —— 「部署成功」跟「gate 全綠」一樣，**不證明能用**
2. **Rollback 計畫要在部署前準備好** —— 尤其是「什麼指標超過什麼值就回滾」，
   要**事先訂好**，不要在事發時辯論

### D-6. Hotfix 的兩個必做

從 production tag 開分支修完之後：

- **把修正 merge 回主分支**（否則下一版 regress —— hotfix 最常見的失誤）
- **補 FIX 紀錄**，含「為什麼 staging 沒抓到」

---

## 情境 E：交接與協作（HANDOFF / COLLABORATION）

> 完整規則：`docs/rules-on-demand/collaboration.md` · 指令：`/handoff`

### E-1. 任務交接

**判準**：一個**完全沒有你這段記憶**的人，讀完能不能直接接著做？

| 讀什麼 | 產生什麼 | 更新什麼 |
|-------|---------|---------|
| `git log` / `git status` / `git stash list`（**蒐集事實，不憑印象**）· checklist · progress | `handoff-YYYYMMDD.md`（模板 `handoff-template.md`）→ `docs/01-planning/W{NN}-{slug}/` | checklist（勾的勾、擋的標 `🚧`）· 未 commit 的工作要 commit/stash |

**八個區塊中最重要的兩個**：

- **§下一步** —— 具體到可以直接動手（含檔案路徑 / 指令），不是「繼續做 X」
- **§走過的死路** ⭐ —— 沒有它，接手的人會把你花兩天排除的選項再試一次

**交接不只是寫文件**：口頭走一遍（~15 分鐘）+ 之後 3 天保持可聯絡。

### E-2. 新人 Onboarding

模板：`onboarding-checklist-template.md`

| 階段 | 成功判準 |
|------|---------|
| **Day 1** | **在本機跑起來並看到它運作** —— 不是讀完文件 |
| **Day 2-3** | 走完一次完整流程（小改動 + change record + PR）|
| **Week 2** | 讀 ADR（知道哪些路已決定不走）+ 當一次 reviewer + 領一個 slice |

**Day 2-3 最有效的一件事**：讀最近 3 個 CHANGE record ——
設計文件說「應該長怎樣」，CHANGE record 說「實際怎麼決定的」。

### E-3. Code Review

| Reviewer 該看（依重要性）| Reviewer 不該做 |
|------------------------|----------------|
| 1. 真的解決了它宣稱的問題嗎 | ❌ 重寫別人的實作方式 |
| 2. 有沒有 Potemkin（drive-through 證據呢）| ❌ 爭論已經有 lint 管的事 |
| 3. 測試有沒有測到重點（**負面測試**）| ❌ 無限擴大範圍 |
| 4. 範疇邊界 / 契約平行定義 | ❌ 只留 nit 不表態 |
| 5. 可追溯性（checklist / change record）| |

Comment 分級：`🔴 blocking` / `🟡 consider` / `🟢 nit` / `❓ question`。

### E-4. ⭐ AI 輔助團隊的五個特有問題

| 問題 | 對策 |
|------|------|
| **一致性漂移加速**（每人的 AI 各自產生變體）| 規則檔進 git 共用 · 契約 single-source · frozen template |
| **PR 體積膨脹**（AI 產出快 → 大 PR → rubber stamp）| 訂 PR 上限（建議 400 行 diff），超過就拆 |
| **「AI 說可以」不是理由** | **你送的 PR，你要能解釋每一行** |
| **驗證宣稱膨脹**（寫了「已驗證」但沒跑）| PR 要貼**實際輸出**不是打勾；drive-through 附截圖 |
| **記憶不共享**（A 的 AI 學到的 B 不知道）| `memory/` 進 git；新教訓在 PR 裡 review |

---

## 追蹤層速查（五種情境共通）

```
三軌實例     docs/01-planning/W{NN}-{slug}/         Phase：plan+checklist+progress+retro+artifacts
             docs/03-implementation/changes/CH-NNN-*   Change：單檔 1-page，或資料夾 spec+checklist+progress
             docs/03-implementation/bugs/BUG-NNN-*     Bug：單檔 1-page，或資料夾 report+checklist+progress(+postmortem)

設計決策     docs/architecture.md                   主 spec（WHAT + WHY）
             docs/02-architecture/NN-*.md           核心設計文件（穩定、少變）
             docs/02-architecture/design-notes/     spike extract（遞增，每個 spike 一份）
             docs/14-adr/NNNN-*.md                  決策記錄（輕量，遞增）

待辦         docs/01-planning/BACKLOG.md            ← 單一來源（「有什麼」）
執行順序     docs/01-planning/ROADMAP.md            ← 「先做哪個」，只放順序，細節 link 回 BACKLOG
已決定不做   docs/01-planning/DEFERRED_REGISTER.md  ← 含恢復條件
風險         docs/01-planning/RISK_REGISTER.md
未拍板       docs/decision-form.md                  ← AI 遇到就 STOP and ask

跨來源審計   docs/01-planning/STATUS_AUDIT.md       ← 上面幾份「彼此之間」的漂移；跑 /status-audit

校準數據     docs/01-planning/CALIBRATION-{MATRIX,LOG}.md

記憶         MEMORY.md（索引）+ memory/（subfile）

導航         CLAUDE.md  ← 只放指標，永不存檔
```

---

## 編號規則總表

| 類型 | 格式 | 範圍 | 查現有最大號 |
|------|------|------|-------------|
| **Phase** | `W{NN}-{slug}/` | 全專案遞增；🔴 **挑號前 `git fetch --all` 掃所有分支** | `git branch -r \| while read b; do git ls-tree --name-only "$b" docs/01-planning/; done \| grep -oE 'W[0-9]{2,}' \| sort -u \| tail -1` |
| **Change** | `CH-NNN-{slug}`（`.md` 或 `/`）| 全專案遞增 | `ls docs/03-implementation/changes/ \| sort -V \| tail -1` |
| **Bug** | `BUG-NNN-{slug}`（`.md` 或 `/`）| 全專案遞增 | `ls docs/03-implementation/bugs/ \| sort -V \| tail -1` |
| 核心設計文件 | `NN-<topic>.md` | 00 起，穩定不常增 | `ls docs/02-architecture/*.md \| sort -V \| tail -1` |
| Design note | `NN-<topic>-design.md` | **接續核心文件編號往上** | `ls docs/02-architecture/design-notes/ \| sort -V \| tail -1` |
| ADR | `NNNN-<slug>.md`（4 位）| 全域遞增 | `ls docs/14-adr/ \| sort -V \| tail -1` |
| Open question | `OQ-N` | 全域遞增 | Grep `docs/decision-form.md` |
| 分析快照 | `<topic>-YYYYMMDD.md` | 日期 | `docs/09-analysis/INDEX.md` |
| **Release tag** | `vMAJOR.MINOR.PATCH` | semver | `git describe --tags --abbrev=0` |
| **Handoff** | `handoff-YYYYMMDD.md` | 日期 | `ls docs/01-planning/W{NN}-{slug}/` |

> 🔴 **`W{NN}` 是共享命名空間。** 平行 session 在獨立 worktree，只看 `main` 會撞號 ——
> 來源專案真的出過兩個 `W36`，而且**沒有改名**（commit / PR 標題全寫死了，改資料夾
> 只會讓 history 永久對不上）。挑號前掃所有 remote 分支。

> **Design note 接續核心文件編號**是刻意的：核心設計文件 `00-17`，
> 之後每個 spike extract 從 `18` 開始往上。這讓「這個領域的知識」有單一的線性索引，
> 而不是兩套各自從 1 開始的編號。

---

## 常見錯誤

| 錯誤 | 後果 | 正解 |
|------|------|------|
| 改了行為沒改文件 | 文件開始說謊，比沒文件更糟 | 情境 B-4 第一項 |
| 沒查既有 BUG 資料夾就修 | 同一個 bug 修第 3 次 | 情境 C-1 第一項 |
| 建新東西前沒 Grep | 重複實作，兩份會分歧 | 情境 A-1 第 11 項 |
| 待辦寫在 CLAUDE.md | 導航檔膨脹 | 一律 `01-planning/BACKLOG.md` |
| 抄上一個 phase 的 plan | 格式單調漂移 | 對 **frozen template** |
| 只讀 BACKLOG 就回答「現在怎樣」 | 它看不見自己的 stale，答案必然不準 | 跑 `/status-audit` 跨來源對照 |
| 收尾只 commit code，沒翻 `status:` | 追蹤文件開始顯示**假 pending** | PROCESS R9 + `check_status_markers.py` |
| 為了「將來可能用」先寫設計文件 | 紙面 vs runtime 落差 | spike → retro → extract |
| Spike 完沒寫 design note | 知識只留在那個 session 裡 | 情境 A-2 |
| ADR 寫成教科書 | 沒人寫、沒人讀 | ADR 是**輕量**的：1 頁，背景/選項/決定/後果 |
| 跳過分類直接寫 code | 沒有 pre-doc，事後無法追溯 | PROCESS.md §1 分類 → R1 gate |
| 前端翻譯 mockup CSS 成 utility | 每個數值就近取整，必然 drift | `06-reference/mockup-to-production-frontend-playbook.md` |
