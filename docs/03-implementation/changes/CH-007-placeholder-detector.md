# CH-007: actionlint for the executable half, a ratchet for the "not finished yet" half

**Date**: 2026-08-07
**Phase**: 無 —— 獨立 CH
**Scope**: `ci` — workflow lint + `scripts/lint/` detector（**NO 產品 code / NO migration**）
**Components**: —
**PR**: MERGED (PR #9, a7f5fd6)

> **範圍已由使用者 approve（2026-08-07）**，且與本檔最初的 draft **不同** ——
> draft 提的是自寫的窄 detector；調查後改為 **actionlint 為主 + 棘輪 detector 為輔 +
> 修 3 個既有 shellcheck 問題**。改變的理由記在 §Solution ⓪，原始調查保留在 §Root Cause
> 下方，因為那是「為什麼廣義版不成立」的證據。

---

## Problem

`AD-Placeholder-1`：「模板佔位符 / 通用假設未與本專案現實對齊」已發生 **6 次**，六次都**沒有任何
detector 會抓**，六次都只在有人真的去做那件事時才浮現。

| # | 發現 | 浮現於 | 潛伏時間 |
|---|---|---|---|
| 1 | ADR 撰寫時機與「文檔跟隨 runtime」無仲裁規則 | 使用者提問流程是否滾動 | 專案第 1 天起 |
| 2 | `mockup-fidelity.md:38` 要求 `oklch(var(--token))`，但交付物 token 是 HEX | 討論 shadcn 時查證 | 同上 |
| 3 | `02-architecture/README.md` 索引列的檔名全部不存在 | 盤點架構文件時 | 同上 |
| 4 | ADR 檔名慣例四處不一致 | 寫第一份 ADR 時 | 同上 |
| 5 | `CLAUDE.md` 宣告 24,000 byte 預算，detector 實際 30,000 | CH-005 驗證時 | 同上 |
| 6 | `ci.yml` 未填佔位符直接執行 → **CI 全紅 12 次 run** | CH-006 | **12 次 run** |

依 `.claude/rules/README.md` 的強度階梯，同型 ≥3 次應改結構性解法。

---

## Root Cause

**「模板套用後未與專案對齊」不是一種缺陷，是六種。** 把它們歸為一類是我在 CH-006 §相關 下的
判斷，而那個判斷經不起枚舉。

實際的共通點只有「文件裡的一個宣稱，與機器可查證的現實不符」—— 而**宣稱的形式各不相同**，
所以沒有單一 pattern 抓得到全部。

---

## Solution

### ⚠️ 先講調查結果：原本的提案不成立

依 `lint-detector-authoring.md:67`（「先枚舉真實格式，不可以憑印象」）做了寬鬆掃描，
六種 pattern、全 repo、`.md/.py/.yml/.json/.toml/.sh/.ts/.js`：

```
512 hits    A-template-file 197 · F-other 156 · B-rules-doc 135 · C-record 11 · D-script 9 · E-workflow 4
pattern     angle-cjk 277 · brace-NN 94 · angle-latin 62 · xxx-stub 39 · date-stub 38 · todo 2
```

**約 500 個是合法的。** `W{NN}` · `NNN` · `<slug>` · `<topic>` · `YYYY-MM-DD` 不是未填佔位符，
它們是本專案表達「此處放一個編號」的**慣例語彙**，遍布 `CLAUDE.md`、`INFORMATION-FLOW.md`、
`.claude/commands/`、全部 `_TEMPLATE*`。

一個「掃佔位符」的 detector 會：

- 噴出約 500 個誤報 → 直接撞上 `lint-detector-authoring.md:63` 的判準（跑在自己的規則文件上會噴）
- 誤報 `security-scan.yml` 的 4 個佔位符 —— 而那些**有 case guard，是刻意設計**（該檔 `:3-4` 明說）
- 依 `:16`「一個 detector 是永久的維護負擔」，這種誤報率的 detector **比沒有更糟**

### 精確的判準（零誤報，但範圍很窄）

真正的缺陷不是「有佔位符」，是「**佔位符出現在會被執行的位置**」。這在語法層面可判定：

| 情況 | 判定 |
|---|---|
| `run: <format check 指令>` —— `run:` 的**值整個是**佔位符 | ❌ **違規**（CH-006 的 bug）|
| `run: \|` 多行，內含 `SCA_CMD='<…>'` + guard | ✅ 合法（security-scan.yml）|
| `.md` 裡的 `<slug>` / `W{NN}` | ✅ 合法（慣例語彙）|

判準一句話：**掃 `.github/workflows/*.yml` 的 `run:` / `uses:` / `if:` 純量值，
去除空白後以 `<` 開頭即違規。** 目前 repo 上跑會是 0 違規（CH-006 已修好）——
這是**迴歸網，不是發現器**，與 `security-scan.yml:181` 對 SAST 的定位相同。

### 誠實的覆蓋率：6 次中的 1–2 次

| # | 這個 detector 抓得到嗎 | 說明 |
|---|---|---|
| 6 `ci.yml` | ✅ | 正是它的目標 |
| 3 `README.md` 索引檔名不存在 | 🟡 **可能不需要新 detector** —— 見下方 ⭐ |
| 1 ADR 時機仲裁 | ❌ | 語義問題，無法機械判定 |
| 2 oklch vs HEX | ❌ | 需要理解「規則文件對交付物格式的宣稱」，高度專案特定 |
| 4 ADR 檔名慣例 | ❌ | 四處自然語言描述，非結構化 |
| 5 byte 預算數字 | ❌ | 需要解析散文中的數字並對照 Python 常數 |

**不要假裝這個 detector 解決了 `AD-Placeholder-1`。** 它關掉第 6 類，其餘四類仍然只能靠
人在做那件事時發現 —— 那是這條 AD 應該保持開啟的理由。

### ⭐ 第 3 類可能根本不用寫 detector

`check_path_references.py` 已經會抓不存在的路徑，它漏掉 `02-architecture/README.md`
的原因是那些檔名是**裸檔名**（`00-vision.md`），沒有目錄前綴 → `head not in prefixes` → 跳過
（`check_path_references.py:182`）。

**把 README 索引改寫成帶路徑的形式，既有 detector 就會抓到它。** 這比新增偵測邏輯便宜得多，
也符合「不要為了未來可能用到建抽象」。建議併入 `AD-DocIndex-1` 處理，不放在本 CH。

### ⓪ 為什麼最終方案不是 draft 提的自寫 detector

`lint-detector-authoring.md:16` 要求先問「這個 detector 非自己寫不可嗎」。實測回答了：

用 docker 跑 `rhysd/actionlint` 對一個注入 CH-006 bug 的 probe：

```
probe.yml:9:9  SC1072:error  Fix any mentioned problems and try again
  run: <format check 指令>                          ← 抓到
（guarded 佔位符 SCA_CMD='<…>' + case guard）        ← 未報，零誤報
```

**actionlint 完全覆蓋 draft 原本要自寫的東西，而且更廣**（過時 action、context 表達式、
matrix 設定、全套 shellcheck）。自寫版只覆蓋我們**已經踩過**的那一種。

但它同時對既有 repo 報了 3 個問題，這改變了導入次序（見 ①）。

### ① 修 3 個既有 shellcheck 問題（**範圍變更，使用者 approve**）

`security-scan.yml` 的容器掃描 job：

| 位置 | 規則 | 問題 |
|---|---|---|
| `:217` | SC2035 info | `ls Dockerfile */Dockerfile` —— dash 開頭的檔名會被當選項 |
| `:245` | SC2035 info | 同上 |
| `:245` | **SC2045 error** | `for df in $(ls …)` —— 含空白的檔名會裂開 |

CH-006 明寫「`security-scan.yml` 不改」，本 CH 推翻它。理由：**不修就導不進 actionlint**，
而直接帶著 3 個既有問題導入會讓 CI 立刻紅 —— 那正是該檔 `:13-25` 警告過的情境
（「第一次跑一定會噴出一批現存問題…會立刻擋住所有 PR」）。修法是標準的 glob 迭代。

### ② actionlint 進 `ci.yml`（釘版本 + SHA 校驗）

`v1.7.12`，官方 release 二進位而非第三方 action —— 照 `security-scan.yml` 對 gitleaks/trivy
的既有前例：**每個 action 都是一條供應鏈路徑**，而在安全流程裡下載並執行未驗簽的二進位
等於自己開一條缺口（guardrail 7）。

⭐ **額外加了一道 shellcheck 存在性檢查**：ubuntu-latest 預裝它，但若哪天不再預裝，
actionlint 會**靜靜跳過 shell 檢查** —— 而那正是 CH-006 那個 bug 所在的層。
一個靜靜縮小覆蓋範圍的 linter 比沒有 linter 更危險，所以明確驗證後才跑。

### ③ 棘輪 detector（本專案特有，與 actionlint 不重疊）

actionlint **正確地不報** guarded 佔位符 —— 那是合法 shell。但合法不等於完成：
`security-scan.yml:203` 自己寫過「不閘很快就變成不存在」，而 SCA / SAST 目前正是這個狀態
（`AD-SecScan-1`）。

`check_workflow_placeholders.py` 用一份 **allow-list + 每項的預期出現次數**：

| 情況 | 判定 |
|---|---|
| 佔位符不在 ALLOWED | ❌ 新增了未填項 |
| 次數高於 baseline | ❌ 棘輪只能往下轉 |
| **ALLOWED 有但已找不到** | ❌ **已填好 —— 同一個 PR 必須把 baseline 降下來** |

第三條是棘輪的牙齒：沒有它，baseline 會停留在願望而非事實。目前 baseline = **4**
（`security-scan.yml` 的 2×環境設置 + SCA_CMD + SAST_CMD），每一項都寫了**為什麼還沒填**
與**什麼解封它**。

### 逐項變更

| 檔案 | 類型 | 說明 |
|------|------|------|
| `.github/workflows/security-scan.yml` | 修改 | 兩處 `ls` → glob 迭代（SC2035 ×2 / SC2045 ×1）|
| `.github/workflows/ci.yml` | 修改 | actionlint 安裝（pin + SHA）+ Workflow lint step + detector 測試 step |
| `scripts/lint/check_workflow_placeholders.py` | 新增 | 棘輪 detector，依 `lint-detector-authoring.md:99` 骨架 |
| `scripts/lint/tests/test_workflow_placeholders.py` | 新增 | 8 個 unittest（標準庫 —— **pip 被 corp-proxy 擋**，見檔內說明）|
| `scripts/lint/run_all.py` | 修改 | 註冊為第 6 個 detector |

### 明確不做的

| 不做 | 理由 |
|---|---|
| 廣義「掃全 repo 佔位符」 | ~500 誤報，見 §Root Cause |
| 抓第 1/2/4/5 類 | 需語義理解或高度專案特定，`lint-detector-authoring.md:22` 明訂寫不出可靠 detector |
| 改 `02-architecture/README.md` | 併入 `AD-DocIndex-1`（既有 detector 改一下寫法就抓得到，比新增邏輯便宜）|
| 先以 warning 跑 1-2 phase | `lint-detector-authoring.md:228` 的標準導入次序。**跳過它是有意識的**：兩者對當前 repo 都是 0 違規，warning 期沒有資料可觀察。誤報一出現就降級 |
| 填 `SCA_CMD` / `SAST_CMD` | 需 `package.json`（W01 M0）。棘輪的存在就是為了讓這件事不被遺忘 |

---

## Verification

**Gate**: `run_all` **6/6**（模擬 CI 環境跑，`docs/reference` 移開）· 8/8 unittest ·
actionlint exit 0 · 無產品 code 故無 build/test

### 逐條

| # | 條件 | 結果 | 證據 |
|---|---|---|---|
| A1 | 兩者對當前 repo 皆 0 違規 | **PASS** | `workflow-placeholders: OK (4 known unfilled, none new)` · actionlint exit 0 |
| A2 | 注回 CH-006 的 bug → 抓到 | **PASS** | actionlint 報 `SC1072:error` / `SC1073:error` 於 `run: <format check 指令>` |
| A2' | 注入新佔位符 → 抓到且行號正確 | **PASS** | detector 報 `ci.yml:150: new unfilled placeholder '<部署指令>'` |
| A3 | 4 個 guarded 佔位符不誤報 | **PASS** | actionlint 對 `SCA_CMD='<…>'` 未報；detector 認得它們在 baseline 內 |
| A4 | 執行時間 | **PASS** | 8 個測試 0.196s；`run_all` 全套數秒 |
| A5 | `run_all` 顯示 6 個 detector | **PASS** | `run_all: 6/6 passed` |

### 新增測試

`scripts/lint/tests/test_workflow_placeholders.py` —— **8 個**，含
`lint-detector-authoring.md:218` 要求的**兩類誤報迴歸**：

- **誤報**：baseline 內的佔位符不報 · pragma 抑制生效（shell 重定向的逃生門）·
  `.github/workflows/` 以外的檔案不掃
- **真陽性**：新佔位符 · 次數增加（棘輪不得往上）· **已填好卻沒降 baseline** ·
  次數減少但 baseline 未更新
- **迴歸**：`test_real_repo_is_clean` —— 出貨的 baseline 必須與出貨的 workflow 相符

### ⭐ 工具在導入的當下就抓到了新引入的 bug

`ci.yml` 的 Workflow lint step，我的註解第一行寫成 `# shellcheck 由 ubuntu-latest 預裝…`。
**`# shellcheck …` 是 shellcheck 自己的 directive 語法**（如 `disable=SC2086`），它嘗試把
後面的中文解析成 directive，回報 `SC1072:error` / `SC1073:error`。

```
ci.yml:81:9  SC1072:error  Expected '=' after directive key
```

這個 bug 是**在 actionlint 加進來的同一次驗證裡**被抓到的，而不是等到某次 CI 紅了 12 次。
與 CH-006 的形狀完全相同（註解/字串被當成可執行內容），差別只在這次有東西會叫。
已在該處留下 inline 警告，避免下一個人重蹈。

### ⚠️ 另一個自己踩到的坑（已修）

detector 第一版沒有 stdout 的 UTF-8 reconfigure。它的違規訊息**逐字引用佔位符文字**，
而本 repo 的佔位符全是繁體中文 —— 在 Windows console（cp950）上會 `UnicodeEncodeError`
crash，且是**印出一個看起來像結果的部分計數之後**才 crash。
`check_path_references.py:67` 早就踩過同一個坑並留了 guard，照抄。

**Drive-through**: ⚪ N/A（CI 設定與 lint 工具 —— **gate-only verified**）

**Verdict**: ✅ PASS

---

## Impact

- **Breaking change**: no · **Migration**: no · **Config**: none
- **行為變化**: 每個 PR 與 push 現在多兩道檢查 —— workflow 自身的 lint，與未填佔位符的棘輪
- **Rollback**: 從 `DETECTORS` 移除一行 + 刪兩個檔 + 移除 `ci.yml` 的兩個 step

---

## 相關

- **部分關閉**: `AD-Placeholder-1`（只關第 6 類；**AD 保持開啟**，理由見 §覆蓋率）
- **轉交**: 第 3 類 → `AD-DocIndex-1`
- **上游**: CH-006 §相關 的結構性解法建議
