# CH-006: Repair ci.yml so the one working gate actually runs, and take the first security-scan baseline

**Date**: 2026-08-07
**Phase**: 無 —— 獨立 CH
**Scope**: `ci` — GitHub Actions workflow（**NO code / NO migration / NO 新依賴**）
**Components**: —
**PR**: MERGED (PR #7, f4054f2)

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
| `.github/workflows/ci.yml` | 修改 | 重排步驟（`run_all` 第一）；五個 `run:` 改為存在性 guard + 真實指令 |
| `.github/workflows/security-scan.yml` | **不改** | 已正確處理未填狀態；只手動觸發一次 |
| `CLAUDE.md:145` | 修改 | 加 `path-check: ignore` pragma —— 見下方 §實作中發現 ① |
| `.github/workflows/ci.yml` | 修改 | `run_all.py` 加 `--verbose` —— 見下方 §實作中發現 ② |

### 實作中發現（R3 —— 範圍內的兩處增補）

**① `path-references` 在 CI 失敗，本機永遠不會失敗。** 修好 `ci.yml` 之後 `run_all.py`
第一次在 CI 執行，結果是 **4/5** 而非本機的 5/5：

```
path-references: 1 stale reference(s):
  CLAUDE.md:145 -> docs/reference/
```

`CLAUDE.md:145` 引用 `docs/reference/`，而該目錄**刻意排除於版控之外**（那一行的內容講的
正是這件事）。本機磁碟上存在 → `Path.exists()` 為真 → PASS；CI checkout 後不存在 → FAIL。

**這是環境差異，與本 CH 的變更無關** —— 它是既存問題第一次被看見，而它之所以到今天才被
看見，正是因為 CI 從來沒跑到那一步。修法用 detector 自己建議的 pragma，語義完全吻合
（`intentional? add 'path-check: ignore'` —— 它確實是 intentional）。

> 本機重現方式：`Rename-Item docs\reference reference__ci_sim` → 跑 detector → 還原。
> 不重現就無法確認根因，只能猜。

**② `run_all.py` 在失敗時丟掉最有用的資訊。** `run_all.py:80` 只保留每個 detector 輸出的
**最後一行**，而 `check_path_references.py:218` 的最後一行是提示語，真正的違規清單在
`:217`。所以 CI 只顯示 `[FAIL] path-references:   (intentional? add …)` —— **沒有路徑**。

定位這一個路徑花了數個步驟。加 `--verbose` 到 workflow 即可，**不必改 `run_all.py`**
（範圍更小的解法）。若同一問題再出現，正確的結構性修法是讓 `run_all.py` 在失敗時
自動印完整輸出 —— 記入 BACKLOG 而非現在做。

---

## Verification

**Gate**: `run_all` **5/5** — **在 CI 執行**（run 31187401929），本專案史上第一次。
無 code / build / test（尚無技術棧）。

**新增測試**: 無測試檔，但 guard 做了**雙向**驗證（負面測試即「關掉會壞什麼」）：

- `package.json` 不存在 → 印 `::notice::` 且 **exit 0**（本機 bash + CI 各驗一次）
- `package.json` 存在 → 進入 npm 指令（本機用臨時 `package.json` 驗證）

**Drive-through**: ⚪ N/A（CI 設定 —— **gate-only verified**）

**Verdict**: ✅ PASS

### 驗收條件逐條

| # | 條件 | 結果 | 證據 |
|---|---|---|---|
| A1 | `gates` 綠 + log 顯示 `run_all.py` 執行並輸出 `5/5 passed` | **PASS** | `gates pass 9s`；log 含 `run_all: 5/5 passed` 與五個 detector 的逐條 `[PASS]` |
| A2 | 未填步驟印 notice 且 exit 0 | **PASS** | 五步全部 `##[notice]monorepo scaffold absent — skipped until W01 M0 (ADR-0001)`，job 通過 |
| A3 | security-scan 觸發；gitleaks 結果入檔 | **PASS** | 見下 |
| A4 | 至少一次 `success` | **PASS** | `mergeState=CLEAN` |

### ⭐ A3 的結果必須精確表述

四個 job 全部 `success`，**但那是誤導性的表面訊號 —— 只有一個真的做了事**：

| Job | 結論 | 實際發生 |
|---|---|---|
| 憑證外洩 — gitleaks | success | ✅ **真的掃了**：`INF 9 commits scanned.` / `INF no leaks found` |
| 依賴漏洞 — SCA | success | ⏸️ **skip**：`SCA 指令未設定` |
| 靜態安全 — SAST | success | ⏸️ **skip**：`SAST 指令未設定` |
| 容器映像 — trivy | success | ⏸️ **skip**：`沒有 Dockerfile — 略過容器掃描` |

**可以宣稱的**：全 git 歷史（9 個 commit）無外洩憑證 —— guardrail 7 的「原始碼中無密鑰」
首次獲得機械驗證，不再只是宣稱。

**不可以宣稱的**：依賴漏洞、靜態安全、容器映像**未經檢查**。三者是 skip，不是 clean。
`07:31` 的 M0 DoD 要求它們全部有效，仍未達成。

### ⚠️ CI 抓到而本機沒抓到的

**`path-references` 在 CI 是 4/5，本機永遠 5/5** —— 見 §Solution 的實作中發現 ①。
這是本 CH 存在價值的直接證據：修好 CI 的第一件事，就是揭露一個本機不可能發現的問題。

---

## Impact

- **Breaking change**: no
- **Migration**: no
- **Config**: none
- **重啟需求**: —
- **Rollback**: revert the PR；CI 回到全紅狀態（不會更差）
- **行為變化**: 從今天起 `main` 與每個 PR 都會執行五個架構 detector。
  之前它們只在有人記得跑本機指令時才生效

---

## 相關

- **同類前例**: 無 —— 但這是 BACKLOG 上第 **6** 個「模板規則與專案現實不符」發現，
  前五個為 `AD-RuleBoundary-1` · `AD-CssToken-1` · `AD-DocIndex-1` · ADR 檔名慣例 ·
  `CLAUDE.md` byte 預算。**第 6 次同型 → 依 `.claude/rules/README.md` 強度階梯應考慮結構性解法**
  （例如一個掃全 repo 未填模板佔位符的 detector），而不是逐個修
- **產生的待辦** → `docs/01-planning/BACKLOG.md`
  ⚠️ **刻意延後到 PR #6 merge 之後才寫入 BACKLOG**：#6 已經改了 BACKLOG 的同一段落，
  在本 PR 也改會製造 rebase 衝突與一次不必要的 force-push。待辦在此完整記錄，不會遺失。

  1. **W01 M0 收尾時把 CI 設成 required status check**（`07:31` 的 M0 DoD）—— 現在設會用一個
     沒有實質內容的 gate 擋住所有 PR
  2. **依 `security-scan.yml:19-25` 的五步次序推進 SCA / SAST**（W01 M0 之後，需 `package.json`）
  3. **`run_all.py` 失敗時只印最後一行** —— 目前用 workflow 的 `--verbose` 繞過。若同型問題再現，
     結構性修法是讓 `run_all.py:80` 在 `returncode != 0` 時保留完整輸出
  4. **`actions/checkout@v4` 用 Node 20，已被 GitHub 標記 deprecated** 並強制跑在 Node 24
     （本次 4 個 security-scan job 皆有此 annotation）。現在只是警告，移除時會直接壞掉
- **上游**: 發現於 CH-005 的 PR #6 CI 失敗
- **同型計數**: 本 CH 是「模板佔位符 / 通用假設未與本專案對齊」的**第 6 次**。
  建議的結構性解法（掃全 repo 未填佔位符的 detector）不在本 CH 範圍，需另開
