# CH-006: Repair ci.yml so the one working gate actually runs, and take the first security-scan baseline

**Date**: 2026-08-07
**Phase**: 無 —— 獨立 CH
**Scope**: `ci` — GitHub Actions workflow（**NO code / NO migration / NO 新依賴**）
**Components**: —
**PR**: #TBD

> **範圍已由使用者 approve（2026-08-07）** —— §Problem + §Solution 的做/不做清單。
> R1 gate 通過後才動 workflow。

---

## Problem

CI has failed on **every run since the project's first PR** — 12 runs, 11 failures. The only
success was a `dynamic` event unrelated to the gate job.

```
failure  pull_request  feature/CH-005-foundation-adrs   ← 現在
failure  push          main
failure  pull_request  change/CH-004-screen-fragment-audit
failure  push          main
failure  pull_request  change/CH-003-entity-index-and-p0-model-decisions
… (same pattern down to)
failure  pull_request  chore/adopt-dev-template          ← 第一個 PR
```

Nothing stopped any of it. `required_status_checks` on `main` is **`null`**, so CH-001 through
CH-004 all merged with the gate red.

Three consequences, in ascending order of severity:

1. **`python scripts/lint/run_all.py` has never executed in CI.** It sits at step 5 of `ci.yml`,
   behind four steps that abort the job. It is this repository's *only* working mechanical
   check — the five detectors that guard rule-file bloat, doc links, path references, status
   markers and mockup fidelity. It has only ever run locally.
2. **`security-scan.yml` has never executed at all** (run history empty). Its `secret-scan` job is
   language-agnostic and works the moment it is triggered, so **gitleaks has never scanned this
   repository's history**. Guardrail 7's "原始碼中無密鑰" is currently an unverified assertion.
3. **M0's definition of done (`07:31`) requires working CI** with SCA/SAST/DAST/secret-scanning
   plus the automated secure-development DoD checks. That item is not merely undone — it is
   **broken while appearing to exist**, which is worse: the workflow file's presence reads as
   coverage.

---

## Root Cause

Not "the placeholders were never filled" — that is the symptom. Two distinct causes:

**1. `ci.yml` interpolates unfilled placeholders directly into `run:`.**

```yaml
# .github/workflows/ci.yml:33
- name: Format check
  run: <format check 指令>
```

Bash receives `<format check 指令>` as a command and dies with
`syntax error near unexpected token 'newline'`. Five steps do this (`:33`, `:38`, `:42`, `:46`,
`:55`).

**`security-scan.yml` does not have this defect** — it guards every placeholder:

```yaml
# .github/workflows/security-scan.yml:143
case "$SCA_CMD" in
  '' | '<'*) echo "SCA 指令未設定 — …" ;;   # ← unfilled falls through harmlessly
  *) sh -c "$SCA_CMD" ;;
esac
```

Its header (`:3-4`) states the intent explicitly: "沒填就會印提示並略過，不會讓你的第一次 CI
就炸掉". **The same care was not applied to `ci.yml`.** One template file was hardened against
being unfilled and its sibling was not.

**2. Step ordering put the only functioning check last.** Even had the job used
`continue-on-error`, `run_all.py` at step 5 means the project's real gate is gated behind
placeholders for a stack that does not exist yet.

---

## Solution

### 範圍決策（需 approve）

**做**：

| # | 變更 | 為什麼這樣做而不是另一種 |
|---|---|---|
| 1 | **`run_all.py` 移到第一步** | 唯一有效的 gate 應該最先跑，且不依賴任何尚未存在的東西 |
| 2 | **未填步驟改用「存在性 guard + 真實指令」**，不是佔位符也不是註解掉 | 見下方 ⭐ |
| 3 | **手動觸發 `security-scan` 一次**（`workflow_dispatch`），取得 gitleaks 全歷史基線 | 這是 guardrail 7 的第一次實際驗證；也是它自己檔頭 `:19` 規定的接上次序第 1 步 |

**不做**（各有明確理由，不是省事）：

| 不做 | 理由 |
|---|---|
| 把 CI 設成 required status check | `07:31` 的 M0 DoD 要求它，但現在設 = 用一個沒有實質內容的 gate 擋住所有 PR。**W01 M0 骨架建立後才設** |
| 開啟 `security-scan.yml` 的 `pull_request:` 觸發 | 該檔 `:19-25` 明訂五步接上次序，且 `:29-34` 說明分流窗口期間**只有** `schedule + workflow_dispatch` 是對的做法。跳步會製造長期紅或假綠 |
| 填入 `SCA_CMD` / `SAST_CMD` | 需要 `package.json`（W01 M0）。它們現在**略過而非失敗**，沒有損害 |
| 修 `AD-CssToken-1`（oklch 紅線） | 不同範疇，且 trigger 是「寫第一頁前」 |

### ⭐ 關鍵設計細節：為什麼用存在性 guard，不用佔位符

ADR-0001 已經定案指令形狀，所以現在就寫得出真指令。差別在觸發條件：

```yaml
- name: Lint
  run: |
    if [ ! -f package.json ]; then
      echo "::notice::monorepo scaffold absent — skipped until W01 M0"
      exit 0
    fi
    npm run lint -w apps/api -w apps/web
```

**這樣寫，W01 M0 建立骨架的那一刻 CI 自動開始檢查，不需要有人記得回來改這個檔。**

用佔位符（即使加了 guard）或註解掉步驟，都會留下一個「等骨架好了要回來填」的待辦，而**沒有任何東西會叫**。那正是本專案這兩天反覆踩到的同一個形狀 —— 已累積 5 個同類發現在 BACKLOG。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `.github/workflows/ci.yml:22-55` | 修改 | 重排步驟；五個 `run:` 改為存在性 guard + 真實指令 |
| `.github/workflows/security-scan.yml` | **不改** | 已正確處理未填狀態；只手動觸發一次 |

---

## Verification

<!-- 待實作後填 -->

**Gate**: —
**新增測試**: —
**Drive-through**: ⚪ N/A（CI 設定 —— **gate-only verified**）
**Verdict**: —

**驗收條件（approve 時確認）**：

| # | 條件 |
|---|---|
| A1 | PR 上 `gates` job **綠**，且 log 顯示 `run_all.py` 實際執行並輸出 `5/5 passed` |
| A2 | 未填步驟印出 `::notice::… skipped until W01 M0`，**exit 0 而非 fail** |
| A3 | `security-scan` 手動觸發完成；gitleaks 結果（乾淨 or 命中清單）記入本檔 §Verification |
| A4 | `gh run list --limit 3` 顯示至少一次 `success` |

---

## Impact

<!-- 待實作後填 -->

- **Breaking change**: no
- **Migration**: no
- **Config**: none
- **重啟需求**: —
- **Rollback**: revert the PR；CI 回到目前的全紅狀態（不會更差）

---

## 相關

- **同類前例**: 無 —— 但這是 BACKLOG 上第 **6** 個「模板規則與專案現實不符」發現，
  前五個為 `AD-RuleBoundary-1` · `AD-CssToken-1` · `AD-DocIndex-1` · ADR 檔名慣例 ·
  `CLAUDE.md` byte 預算。**第 6 次同型 → 依 `.claude/rules/README.md` 強度階梯應考慮結構性解法**
  （例如一個掃全 repo 未填模板佔位符的 detector），而不是逐個修
- **產生的待辦** → `docs/01-planning/BACKLOG.md`:
  - W01 M0 收尾時把 CI 設成 required status check（`07:31`）
  - W01 M0 之後依 `security-scan.yml:19-25` 的五步次序推進 SCA/SAST
- **上游**: 發現於 CH-005 的 PR #6 CI 失敗
