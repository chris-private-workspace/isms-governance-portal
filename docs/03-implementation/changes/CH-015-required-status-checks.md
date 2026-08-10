# CH-015: Six green checks that finally block something

**Date**: 2026-08-10
**Phase**: 無 —— 獨立 CH（`STATUS_AUDIT.md` 2026-08-10 §2.7 AD-5 的處置）
**Scope**: CI / branch protection（shared infra —— **不在版控**）
**Components**: —
**PR**: #29

---

## Problem

**六個 CI check 全綠，但擋不住任何東西。** `main` 的 branch protection 從建立起就沒有
`required_status_checks` —— 不是設成 `null`，是**整個 key 缺席**：

```
GET /repos/:owner/:repo/branches/main/protection
→ required_pull_request_reviews / enforce_admins / required_linear_history / ... 皆在
→ required_status_checks: (key 不存在)
```

`07:31` 的 M0 DoD 要求 CI 為 required。在此之前，任何一個 PR 都能在 `gates` 紅著的狀態下
merge —— 六個 job 的全部價值僅止於「有人會去看那個叉」。

---

## Root Cause

**不是忘了設。** `AD-CIRequired-1`（CH-006 登記）明確寫下了當時的判斷：
「現在設 = 用沒有實質內容的 gate 擋住所有 PR」—— 那個判斷在 2026-08-08 之前是對的。

根因是**解封條件被寫成敘述，而不是可檢查的條件**：備註寫「W01 M0 骨架建立後設」，
但沒有任何機制會在 W01 交付時把它叫起來。條件實際上成立了兩次而無人察覺 ——
W01 於 2026-08-08 交付骨架，W02 於 2026-08-09 讓 `gates` 含 20 個整合測試、
`image-smoke` 含實際啟動探測 —— 直到 2026-08-10 首次跨來源審計才被發現。

這與 `AD-ImageDigest-1` / `AD-ImageBuild-1` 是**同一種病**：知道問題、寫下來、
寫在沒有人會回頭看的地方。

---

## Solution

六個 check 全部設為 required，`strict: false`。**這是 API 操作，不是檔案變更** ——
branch protection 不存在於版控中。

| 檔案 | 類型 | 說明 |
|------|------|------|
| GitHub branch protection（`main`）| 修改 | 新增 `required_status_checks`，六個 context |
| `docs/01-planning/BACKLOG.md` | 修改 | `AD-CIRequired-1` 關閉 · 新增 `AD-CheckNameCoupling-1` |

**`strict: false` 的理由**：`strict` 要求 PR 分支必須先含最新 `main` 才能 merge。
它防的是**並行 PR 的 semantic conflict**（兩個 PR 各自綠、合起來壞）。本專案單人序列化開發，
同時開兩個 PR 近乎不存在，而代價是每次 `main` 動了就要 rebase。
⚠️ **多人協作開始時應重新評估** —— 那時 `strict: false` 會從合理變成疏漏。

**Load-bearing 細節，拿掉就會壞**：

- **`PATCH .../protection/required_status_checks` 在 checks 從未啟用時回 404**
  （`Required status checks not enabled`）。唯一路徑是 `PUT .../protection`，而它**覆蓋整組設定** ——
  必須先 GET 出全部欄位逐字回送，漏一個就是靜默關掉一項保護
- **`restrictions` 必須顯式送 `null`**，省略會被拒
- ⭐ **六個 context 有五個是中文，含 em dash 與全形括號**（`憑證外洩 — gitleaks（全歷史）`）。
  比對是逐字的 —— **workflow 裡的 `job.name:` 從此是 branch protection 的一部分**，
  改一個字，所有 PR 會卡在等一個永遠不會出現的 context，且錯誤訊息不會說明原因
- **context 名稱取自實際跑過的 check run**（PR #26 head `128c510`），不是從 yml 的 `name:` 推論 ——
  `AD-GrepAssertion-1` 的形狀

---

## Verification

**前置**（Risk Class E）：三個 workflow **均無 paths filter**，只有 `branches: [main]`；
`security-scan.yml:50-51` 甚至有明文註解禁止設。docs-only PR 因此仍會回報六個 context，
不會卡在永不回報的 required check 上。

**設定後獨立 GET 回讀**（不採信 PUT 自己的回應）:

| 驗證 | 結果 |
|---|---|
| 六個 context 逐字 | ✅ 全部命中，`strict=false` |
| 其他 14 個欄位 vs PUT 前快照 | ✅ 全部一致 —— 覆蓋式 PUT 未意外改動任何一項 |

**負面驗證**: ✅ **已觀測**（PR #29，設定後的第一個 PR）—— 依 `AD-NegativeGate-1`，
任何宣稱會擋東西的機制都需要一個真的被它擋住的案例：

| 時點 | 六個 check | `mergeStateStatus` |
|---|---|---|
| PR 開啟當下 | IN_PROGRESS / QUEUED | **`BLOCKED`** ← 擋住了 |
| 六個全綠後 | 全 `pass` | **`CLEAN`** ← 放行了 |

兩個時點的 `mergeable` **都是 `MERGEABLE`**（無檔案衝突）—— 所以 `BLOCKED` 只可能來自
required checks。設定之前這個 PR 會是 `CLEAN`：`required_approving_review_count` 是 0，
沒有別的東西擋得住。

⚠️ **仍未觀測的**：一個 **failed**（而非 pending）的 check 會不會擋。GitHub 的 required check
語義是「必須 `success`」，pending 與 failure 走同一條判斷，但**沒有刻意製造失敗來證實**。

**Verdict**: ✅ **PASS** —— 設定值逐項核對 + **擋與放兩個方向都被觀測**。

---

## Impact

- **Breaking change**: **yes（對開發流程）** —— 從現在起 `main` 的每個 PR 必須六個 check 全綠才能 merge。
  `enforce_admins: true` 表示這對 repo 擁有者同樣生效
- **Migration**: no
- **Config**: no 環境變數。⚠️ **但 branch protection 本身不在版控** ——
  它的漂移沒有任何 detector 看得見（本次就是靠人工審計才發現）
- **重啟需求**: no
- **Rollback**: `PUT .../protection` 重送同一份 payload 但拿掉 `required_status_checks`，
  或 `DELETE .../protection/required_status_checks`。~2 分鐘

---

## 相關

- **關掉的待辦**: `AD-CIRequired-1` ✅（CH-006 登記，解封條件成立兩次未被察覺）
- **同類前例**: `AD-ImageDigest-1` · `AD-ImageBuild-1` —— 同為「解封條件寫在沒人回頭看的地方」。
  **第 3 次**，因此結構性解法是 `ROADMAP.md` 的順序層（CH-016 一併交付）：
  有解封條件的項目要出現在一份**會被讀的**順序清單上，而不只是 BACKLOG 的備註欄
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-CheckNameCoupling-1`
  （job `name:` 與 required context 的逐字耦合，無任何 detector 在看）
- **上游**: `STATUS_AUDIT.md` 2026-08-10 §2.7 AD-5 · `07:31` M0 DoD
