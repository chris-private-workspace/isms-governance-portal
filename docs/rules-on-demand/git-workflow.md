# Git Workflow Rules

**Purpose**: 統一 commit / branch / PR 慣例，讓每個變更都能追溯回 phase 與範疇。

**Category / Scope**: Version Control / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

**Trigger（什麼時候 Read）**: 寫 commit message / 開新 branch / 開 PR。

---

## Commit Message Format

```
<type>(<scope>, [W{NN}]): <description>

[optional body — 為什麼這樣改，不是改了什麼]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Types

| Type | Use For |
|------|---------|
| `feat` | 新功能或能力 |
| `fix` | 修 bug |
| `docs` | 只動文件（無 code）|
| `refactor` | 重構（無新功能、無修 bug）|
| `test` | 只動測試 |
| `chore` | Build / CI / 依賴 / 工具 |
| `perf` | 效能改善 |

### Scopes

<!-- ⚠️ 依專案的範疇定義填寫。與 CLAUDE.md §Scopes + scope-boundaries.md 保持一致。 -->

| Scope | 對應 |
|-------|------|
| `<scope>` | <說明> |

**跨切面 / 基礎設施 scope**（通用，建議保留）：

| Scope | Use For |
|-------|---------|
| `docs` | 規劃文件、設計、參考資料 |
| `ci` | CI/CD pipeline |
| `infra` | Docker / K8s / 部署 |
| `rules` | `.claude/rules/` 或 `docs/rules-on-demand/` 的改動 |
| `deps` | 依賴升級 |
| `W{NN}` | 不屬於上述任何 scope 的 phase 專屬變更 |

### 範例

```
feat(domain, W03): implement discount rule precedence engine
fix(api, W03): tax applied pre-discount on multi-line orders
docs(planning, W03): add pricing spec with rounding decision matrix
refactor(infra, W04): extract retry policy into shared module
test(domain, W03): add 20 fixture cases for discount precedence
chore(rules): promote day0-plan-verify from proposal to validated rule
chore(ci): drop paths filter so docs-only PRs report required checks
```

**Body 寫什麼**：寫**為什麼**。改了什麼 `git diff` 已經說了。

```
fix(api, W03): tax applied pre-discount on multi-line orders

The spec (§4) requires tax on the post-discount subtotal, but the
engine computed tax per-line before discount resolution. On orders
with a 20%+ order-level discount this over-charged by the discount
fraction of the tax.

Added test_tax_after_order_discount covering the 3 discount tiers.
See docs/03-implementation/bugs/FIX-014-tax-ordering.md  <!-- path-check: ignore -->

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Branch Naming

```
feature/<scope>-<short-description>
feature/W{NN}-<scope>
fix/<scope>-<short-description>
refactor/<scope>-<short-description>
chore/<what>
```

**Rules**：
- 用 commit message 的 scope
- 小寫、dash 分隔
- ≤ 60 字元
- 從 `main` 開分支
- Merge 後刪除（保持 repo 乾淨）

---

## Before You Commit — Mandatory Checklist

### 1. Phase Workflow

- [ ] Phase plan 存在
- [ ] Phase checklist 存在
- [ ] Checklist 條目已 `[ ]` → `[x]`（或標 `🚧 阻塞`）
- [ ] File header 已更新（`file-header-convention.md`）

### 2. Code Quality

```bash
<lint 指令>
<type check 指令；無型別系統則填 echo 'n/a'>
```

⚠️ **不要用 `--silent` 之類的旗標** —— 它會連錯誤一起吞掉。
要乾淨輸出就 `2>&1 | tail -20`。

**失敗 → 不要 commit**。修好再來。

### 3. Tests

```bash
<test 指令>
```

- ✅ 新代碼覆蓋率 ≥ 80%
- ✅ 既有測試必須通過
- ✅ **不准 skip 測試**（壞了就修或刪，不要標 skip 蒙混）

### 4. Anti-Patterns Check

見 `.claude/rules/anti-patterns-checklist.md` 全部 7 項。

### 5. Drive-Through（user-facing 功能）

見 `.claude/rules/verification-discipline.md`。
**Gate 全綠不等於功能能用。**

### 6. No Secrets / Binaries / Generated Files

```bash
git status
# 必須 NOT contain:
#  - .env（用 .env.example）
#  - *.pem, *.key, credentials
#  - build/, dist/, node_modules/, __pycache__/
#  - 大型 binary（> 50 MB → Git LFS）
```

---

## Pull Request Workflow

### PR Title

```
Phase W{NN}: <one-line scope>
```

### PR Description

用 `.github/PULL_REQUEST_TEMPLATE.md`（會自動帶入）。必填：

- **Summary** — 1-3 句：改了什麼、為什麼
- **Phase linkage** — plan / checklist / progress 的連結
- **Anti-Pattern Checklist** — 7 項逐一勾
- **Test plan** — 怎麼驗證的（**含 drive-through 證據**）
- **CI Gates** — 本機跑過的指令

### Merge 前

- [ ] CI 全綠
- [ ] Anti-pattern checklist 全部 ✅ 或 N/A
- [ ] Drive-through 證據已附（user-facing 功能）

### ⚠️ 「PR 已 merge」必須用工具驗證

**不要相信「已 merge」的宣稱** —— 一份「已 merge」的回報可能是一個仍然 BLOCKED 的 PR。

```bash
gh pr view <N> --json state,mergedAt,mergeStateStatus
```

**在同步 `main` 之前**先確認。這條規則來自真實踩坑。

### Post-Merge Status Flip

closeout 的文件是在 PR merge **之前**寫的 → 它們標的是 `PR-pending`。
`gh` 驗證 merge 之後，把這兩個**當前狀態面**翻成 `MERGED (PR #N, <sha>)`：

1. `CLAUDE.md` 的 `Current Phase` 那一格
2. `docs/01-planning/BACKLOG.md` 開頭的 carryover 區塊

更舊的區塊是歷史快照，不用每次都掃 —— 只有在它們累積到會誤導人的時候才批次修正。

---

## ⚠️ 分支保護**不是**硬牆（開了也會被穿過）

這一條反直覺，而且誤解的代價是「以為有防護」。

GitHub 的 branch protection 預設 **`enforce_admins = false`**。
在這個設定下，repo admin **直接 push 到受保護分支會成功** ——
不是被擋然後報錯，是**真的推上去了**，GitHub 只在事後記一筆
`Bypassed rule violations`。

所以對 admin 來說，分支保護是**流程慣例 + 審計軌跡**，不是技術強制。

| 你以為 | 實際 |
|---|---|
| 開了保護就不會意外直推 main | admin 照樣推得上去 |
| CI 沒過就 merge 不了 | admin 可以 bypass |
| 紅字報錯會攔住我 | 只有事後的一行審計記錄 |

**要真硬牆**：把 `enforce_admins` 設成 true。但先想清楚 ——
單人 repo 這樣設，等於你自己也被擋在外面（緊急修復時沒有逃生門）。

**建議做法**：
- 多人專案 → `enforce_admins = true`，逃生門走「臨時關掉保護」而不是 bypass
- 單人專案 → 維持 false，但**知道它不會攔你** ——
  真正的防線是你自己的習慣，加上 `git branch --show-current`

---

## 單人專案的 PR 流程（不要因為沒人 review 就不開 PR）

沒有第二個人並不代表 PR 沒有價值。它給你三樣東西：

1. **一個可以整批看的 diff** —— 在自己的分支上邊寫邊看，看不到全貌
2. **CI 在 merge 前跑過** —— 直接推 main 的話，紅了已經在 main 上
3. **一條可追溯的線** —— PR 描述是「為什麼」的最後落點

流程：從 `main` 開分支 → 小而乾淨的 PR → 確認 mergeable →
**rebase merge**（保持線性歷史，單人專案沒有合併提交的價值）→ 分支退役。

> 分支退役不是潔癖：留著的已合併分支會讓「還有什麼在進行中」這個問題
> 每次都要多想一秒，累積起來就是導航噪音。

---

## Prohibited Actions

- ❌ **Force push 到 `main`**
- ❌ **Commit secrets** —— `.env` / `*.pem` / API keys → 立即輪替
- ❌ **Commit 大型 binary** —— > 50 MB → Git LFS
- ❌ **Commit 未格式化的 code** —— CI 會擋
- ❌ **刪測試**
- ❌ **範圍蔓延卻不更新 plan**
- ❌ **跳過 phase workflow** —— 每個 commit 都要對應 checklist 條目
- ❌ **跳過 anti-patterns checklist**
- ❌ **push 前不問** —— push 是 outward-facing 動作（見 CLAUDE.md §Developer Preferences）

---

## 一個實用的收尾

commit 之前，**確認你在哪個分支上**：

```bash
git branch --show-current
```

聽起來蠢，但「在 `main` 上直接 commit 了 phase 的工作」是真的會發生的事。
