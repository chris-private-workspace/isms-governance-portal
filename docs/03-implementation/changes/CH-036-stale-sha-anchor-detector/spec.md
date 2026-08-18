---
status: done   # proposed | approved | active | done | cancelled —— 機器可讀的唯一權威
affects_components: []
---

# CH-036 — Stale SHA anchor detector（ROADMAP 主線第 9 列的執行）

**Date**: 2026-08-16
**Phase**: W17 post-merge（獨立 CH，不屬於任何 active phase）
**Scope**: `scripts/lint/` — 新 detector + 自我測試 + `run_all` 註冊 · `ci.yml` checkout ·
**既有壞錨點修正**（**NO migration / NO 新依賴 / NO 產品程式碼**）
**Status**: 已完成 —— AC-1 ~ AC-9 全數達成。**AC-8 於 CI run `31988000079` 實測解封**
（`refs in use: origin/main, HEAD`）；⚠️ 第一輪 CI 雖然全綠但**證明不了它**，見 progress §AC-8
**PR**: **MERGED** (PR #75, `6c63a2d`)

> ⛔ **這不是新提案。** 它執行的是 [`ROADMAP.md:87`](../../../01-planning/ROADMAP.md) 主線**第 9 列**
> （⬜，無前置條件），關掉 `AD-DesignNoteAnchor-1`（**8 次**）與 `AD-RebaseStaleShaRef-1`（**2 次**）
> 共同指向的那個交付物。**另立門戶會是 AP-2。**

---

## Problem

文件裡引用的 commit SHA 在 rebase merge 之後失效，而**沒有任何東西會發現**。

**量測（2026-08-16，`origin/main` = `ab60513`，已 gc + 清 reflog 故本機狀態誠實）**：

掃 `docs/` · `memory/` · `CLAUDE.md` · `MEMORY.md` 的 `.md`，pattern `\b[0-9a-f]{7,40}\b`：

| 類 | 定義 | 出現次數 | 唯一 token |
|---|---|---|---|
| 1 — 有效 | 可解析 + 在 main 歷史上 | 491 | 95 |
| **2 — 壞錨點** | **不可解析** | **120** | **53** |
| 3 — 可解析但不在 main | tag `archive/*` 保留的歷史 | 3 | 1 |
| 4 — 誤報 | 根本不是 SHA | 95 | 38 |

**壞錨點不是理論問題，它已經吃掉了證據**：

- `CH-034:75` —— 「五次中性化實測（預測**寫在執行之前**並鎖在 commit `020fe11`）」 <!-- sha-check: ignore -->
- `W16/retrospective.md:83` —— 「中性化的預測寫下來並先 commit（`020fe11`）。**事後所有「我早就知道」都無法自證**」 <!-- sha-check: ignore -->
  ⇒ 這句話自己失去了自證能力
- `CALIBRATION-LOG.md:99` · `W15/retrospective.md:47` · `W15/progress.md:723` ·
  `memory/project_w15_*.md:69` —— 「`d6d2d38 12:27:12` → `7c8c8d5 14:40:35`」 <!-- sha-check: ignore -->
  ⇒ **calibration 的量測窗口兩端都不可解析，那個數字無法重算**
- `W01/retrospective.md:52` + `CALIBRATION-LOG.md:384` —— W01 的 3h27m 工時論證，
  兩個 SHA 自 2026-08-08 起就死了（`BACKLOG.md:253` 早已記錄）

---

## Root Cause

**不是「還沒做」，是「做過一次而那一次的守衛在它要抓的 bug 上是綠的」。**

W05 commit `a5d86ad`（2026-08-11）標題即結論：**「the guard I proposed passes on the bug it was for」**。
當時提議 `git cat-file -e`，跑在**已知有 bug 的文字**上，三個 stale SHA 全數回 OK ——
因為那時 merge 後不刪 feature 分支，物件仍可達。修正結論寫在 `BACKLOG.md:253`：

> **「This SHA exists」與「this SHA is in main's history」是兩個不同的問題。**

之後兩次（W07 / W08）都是**排序性再延**（`W07/plan.md:289-293` 使用者 2026-08-12 裁決 ·
`W08/plan.md:375`），理由是治理配額節流，**不是沒價值**。第一次再延「slice 3 處理」自己活成了 stale
（commit `5189cf3`：「W06 was slice 3, and neither the detector nor W01's two dead SHAs were touched」）。

上游成因是**我們自己開的開關**（commit `77fb5fb`）：`required_linear_history = true` ⇒ 一律 rebase merge
⇒ SHA 全改寫。那份記錄明說**不提議改設定**（ISMS 平台的直線歷史對稽核更好講），
並指定「若出現第 9、10 次，該重新檢視的是**設定**而不是又一版錨點規則」。

---

## Solution

### 範圍決策 —— 使用者 2026-08-16 裁決兩項

| 決策 | 選項 | 裁決 |
|---|---|---|
| **CI checkout** | 加 `fetch-depth: 0` / detector 自行 fetch / 不進 CI | ⭐ **加 `fetch-depth: 0`** |
| **既有壞錨點** | 不修 / 一併修 / 只修最傷的 | ⭐ **一併修那 ~40 處** |

⚠️ **第二項推翻了本 spec 起草時的推薦**（原推薦「不修，先 warning 跑 1-2 phase」）。
接受，但它**改變執行順序**：必須先讓 detector 跑出清單、**人工複核 2a/2b 判準無誤**，
才動那 40 處 —— 否則判準有誤就會改錯地方，而且要改回來。見 checklist 的 gate。

⭐ **連帶效果：detector 從 warning 升為 fail**（見 AC-7）。

**做**：detector + 自我測試 + `run_all` 註冊 + `ci.yml` checkout + 修既有壞錨點。

### 逐項變更

**1. `scripts/lint/check_sha_anchors.py`**（新）——
掃指定樹的 `.md`，找出**失效的 commit SHA 引用**。

**2. `scripts/lint/run_all.py`**（改，1 列）—— 加進 `DETECTORS`（`:52-71`）。
不加就永遠不會跑。

**3. `scripts/lint/tests/test_sha_anchors.py`**（新）——
`unittest`（非 pytest —— `test_backlog_counts.py:9-11` 記載 pip 在公司 proxy 後拿到 0 bytes）。
CI 自動發現（`ci.yml:100` 的 glob 迴圈），**不需改 CI 的測試步驟**。

**4. `.github/workflows/ci.yml`**（改，`gates` job 的 checkout）—— 見 D1。

### ⭐ 關鍵設計細節

#### D1 —— 判準：「在 `origin/main` **或當前 HEAD** 上」，不是只有 `origin/main`

⛔ **只寫 `origin/main` 會讓每個 closeout PR 自己紅。** closeout 文件寫在 merge **之前**，
那時「鎖在 commit X」的 X 本來就還不在 main 上。這是 `AD-26` 記過的結構性時序問題。

⭐ 加上「或當前 HEAD」正好解決，且**不重現偽陰性**：

| 環境 | HEAD 是 | 對當前 PR 的 SHA | 對舊 phase 的壞錨點 |
|---|---|---|---|
| PR CI（fresh checkout）| PR 分支 | ✅ 可達 —— 正確放行 | ❌ 不可達 —— **正確抓到** |
| post-merge 本機（HEAD = main）| main | — | ❌ 不可達 —— **正確抓到** |
| phase 進行中本機 | feature 分支 | ✅ 可達 —— 正確放行 | ❌ 不可達 —— 正確抓到 |

偽陰性的來源是**本地殘留分支**（已於 2026-08-16 刪除 + gc），不是 HEAD。

#### D2 —— pattern 必須是 `{7}|{40}`，不能是 `{7,40}`

實測：`{7,40}` 有 **95 個誤報**；`{7}|{40}` 只剩 **1 個**，且壞錨點**零損失**。

本 repo 所有真 SHA 引用都是 git 預設的 7 位縮寫（唯一 40 位：`W08/checklist.md:48`），
而 38 個誤報 token 沒有一個是 7 位 —— 日期 8 位（`20260807`）· CI run ID 11 位（`31299823765`）·
migration 時間戳 14 位（`20260812131655`）· checksum/hash 前綴 8 位（`ac8d1b35…`）·
UUID 分段 8/12 位 · HSTS `31536000` · X status ID 19 位。

⚠️ **這條規則的脆弱點必須寫進 detector 註解**：它依賴「git 縮寫剛好 7 位」。
repo 物件成長會讓 git 自動升到 8 位，屆時 8 位的日期與 checksum 前綴會全部湧進來。
⇒ detector 的 docstring 要記下這個假設與屆時該怎麼辦。

#### D3 ⭐⭐ —— 最大的工程難點是分辨「壞錨點」與「已登記的死值」

120 處類 2 裡約 **80 處是刻意記錄的死值**（該行本身在說「這個 SHA 被改寫成 Y」），
只有約 **40 處**是仍把它當**當前證據**在用。這正是 `ROADMAP.md:87` 早就寫下的約束：

> **detector 必須分辨「引用」與「提及」** —— 單純數 SHA 出現次數會把正確的說明判成漂移

⚠️ **`X → Y` 記號在本 repo 是重載的** —— 既是 rebase 映射，也是 calibration 量測窗口起訖。
反例：`W15/retrospective.md:85` 的「Day-0 成本 17.03 min（`d6d2d38` → `b7fddaf`）」 <!-- sha-check: ignore -->
兩端都不在 main 上，長得像修復記錄，**實際是真壞錨點**。

⭐ **可靠判準（本 CH 採用）**：
- 左側不在 main **且右側在 main** ⇒ 修復記錄，放行
- **兩側都不在 main ⇒ 一定是壞錨點**，告警
- 該行含 `改寫` / `死值` / `不在 main` / `rebase` / `repoint` / `已失效` 等關鍵字 ⇒ 放行（實測命中 58 處）

#### D4 —— CI 的 `gates` job 是 `fetch-depth: 1`，`origin/main` 不可解析

`ci.yml:41` 是**裸 checkout**，整個 `.github/` 沒有任何 `git fetch` 步驟
（唯一的 `fetch-depth: 0` 在 `security-scan.yml:76`，gitleaks 專用，帶完整理由註解）。

⇒ 不動 CI 的話，detector 在 CI 上要嘛全紅、要嘛自我 SKIP。
**自我 SKIP 是最危險的選項** —— 它讓 detector 在 CI 上永遠綠 = `AD-NegativeGate-1`。

⭐ **使用者裁決：給 `gates` job 加 `fetch-depth: 0`**（有 gitleaks 的先例，repo pack 僅 9.88 MiB，代價可忽略）。

⚠️ **這一項必須在 CI 上實測，不能用推導交差**：`actions/checkout@v4` 在 `pull_request` 事件下
是否建立 `refs/remotes/origin/main`，我手上只有依已知行為的推導。
⇒ checklist 會有一項專門驗證它，**若 `origin/main` 在 CI 上不存在，改為 detector 自行 `git fetch origin main`**。

⭐ **而這個連結從來沒有被寫下來過**：專案早就知道 `fetch-depth: 0` 這個手段，
但「gates 是 depth 1」× 「判準需要 `origin/main`」這兩件事在 docs 裡**零命中**。

#### D5 —— 無條件 self-test（雙向），不藏在旗標後面

沿用 `check_entity_index.py:229` / `check_backlog_counts.py:303` 的慣例：
每次真實掃描**之前**先跑 `self_test()`。理由（`check_entity_index.py:194-199`）：
pattern 走味的 detector 回報零違規並 exit 0，**讀起來與成功一模一樣**（`AD-NegativeGate-1`）。
且必須**雙向**（`check_backlog_counts.py:250-256`）：baseline 要過、破壞版要被抓，
否則「壞掉的 meta-verification 長得跟通過的一模一樣」。

### 明確不做的

| 不做 | 理由 | 去向 |
|---|---|---|
| **改錨點慣例為 author date + subject** | `ROADMAP.md:87` 的收斂結論（「SHA 只是索引」）。那是**文件慣例變更**，影響 132 個檔 | 記入 §相關，獨立提案 |
| **抓未填的 `<sha>` 佔位符** | `W07/plan.md:58,92` · `W07/checklist.md:9` 留著從未填入的錨點 —— 比錨點死掉更糟，但**掃 hex 結構上看不見它** | 新 AD（需另一條規則）|
| **改 `required_linear_history`** | `77fb5fb` 已三方權衡並明說不改；第 9/10 次才重新檢視設定 | — |
| **排除 fence / 要求 backtick / 排除純數字** | 三條都實測無效或有害：fence 排除損失 3 個有效檢查換 0 誤報消除；誤報幾乎都被 backtick 包著；**5 個 7 位純數字是真 commit** | — |

---

## Acceptance

- **AC-1** `scripts/lint/check_sha_anchors.py` 存在，`find_violations(repo_root)` 是純函式，
  回傳 `NamedTuple`（**非 dataclass** —— `lint-detector-authoring.md:120-121` 的 importlib 相容性）
- **AC-2** 對**真實 repo** 跑，結果與本 spec 的量測**逐項對得上**：
  類 2 = 120 處 / 53 token · 類 4 殘留 = 1 · 類 3 = 3 處（tag 豁免）
  ⇒ 對不上表示 pattern 或分類邏輯與量測不一致，**必須查清楚而不是調數字**
- **AC-3** D3 的 2a/2b 區分實測有效：告警數 ≈ 40（而非 120），
  且**逐條列出**被判為 2a（放行）的清單供人工複核
- **AC-4** `self_test()` 無條件執行且**雙向**：baseline 通過 + 破壞版被抓，任一不成立即 exit 1
- **AC-5** `scripts/lint/tests/test_sha_anchors.py` 含
  `lint-detector-authoring.md:218` 的**兩個必備測試**（註解裡的假陽性 · docstring 裡的假陽性）
  + 對真實檔案跑的 `test_live_repo`（`test_backlog_counts.py:69-72` 的慣例）
- **AC-6** 註冊進 `run_all.py` 的 `DETECTORS`，`run_all` 從 8/8 → **9/9**
- **AC-7** ⭐⭐ **fail 模式（有違規即 exit 1）—— 這偏離 `lint-detector-authoring.md:228`，理由記在此**：
  該條要求新 detector 先 warning 跑 1-2 個 phase「觀察誤判率」。
  本 CH 因使用者裁決一併修完既有壞錨點，⇒ (a) 誤判率在 AC-3 的**逐條人工複核**中被觀察，
  那比 warning 期更強（warning 期沒有人會逐條讀）；(b) 修完後現況為零，設 fail 不擋任何人；
  (c) 同一份規範 `:232-233` 說「長期被繞過的 detector 比沒有還糟，它訓練人忽略 lint 輸出」——
  一支永遠 warning 的 detector 正是那個形狀。
  ⚠️ **若 AC-3 的複核發現判準有誤**，退回 warning 並記 AD
- **AC-8** ⭐ **CI 實測**：在真 CI 上證明 `origin/main` 可解析，
  **貼出 CI log 行**而非推導（`actions/checkout@v4` 在 `pull_request` 下的行為我手上只有推導）
- **AC-9** ⭐ **既有壞錨點修正**（使用者裁決）：AC-3 複核通過後，把 ~40 處 2b 逐處重指到
  post-rebase SHA。⛔ **修完後 detector 對 `docs/` · `memory/` · 根層 `.md` 回報零違規** ——
  這是本 CH 唯一能證明「真的修完」的斷言。
  ⚠️ 查對應新 SHA 的方法：**commit subject + author date 比對**
  （`git log --format='%h %ad %s'`）—— gc 已跑，舊物件不存在，不能靠 `git show`

---

## Verification

### Gate

`python scripts/lint/run_all.py` **9/9** · `python scripts/lint/tests/test_sha_anchors.py` N tests OK ·
既有 8 個 detector 逐位不變 · 無 npm 變更（零產品程式碼）

### 新增測試

`scripts/lint/tests/test_sha_anchors.py` —— 至少涵蓋：
真壞錨點被抓 · 有效 SHA 放行 · **註解假陽性** · **docstring 假陽性** ·
日期/run ID/timestamp/checksum 四類長度誤報各一 · `X → Y` 修復記錄放行 ·
**兩側都死的量測窗口被抓**（D3 的重載反例）· tag 保留的 `31f76e2` 放行 · 對真實 repo 跑

### Drive-through

**Verdict**: ⚪ **N/A（純 lint 工具 —— gate-only verified）**
⛔ 非省略：零端點、零 UI。但 **AC-8 的 CI 實測是這一層的等價物** ——
detector 在本機綠而在 CI 上跑不起來，是這個 CH 最可能的失敗方式。

---

## Impact

- **Breaking change**: no
- **Migration required**: no
- **Config change**: ⭐ `ci.yml` 的 `gates` job 加 `fetch-depth: 0`（**改 CI/CD —— 使用者已裁決授權**）
- **重啟需求**: 無
- **Rollback**: 刪 detector 檔 + 從 `DETECTORS` 移除該列 + 還原 checkout 設定。
  ⚠️ AC-9 的文件修正**不隨 rollback 還原** —— 那些是獨立正確的修正

---

## 相關

- **執行的 ROADMAP 項**: 主線**第 9 列**（`ROADMAP.md:87`，⬜ → ✅）
- **關掉的 AD**: `AD-DesignNoteAnchor-1`（P2，8 次）的 detector 部分 ·
  `AD-RebaseStaleShaRef-1`（P1，2 次）的候選解法 (b)
- **不關掉的**: `AD-MdAnchorLineShift-1`（上游成因，規則已出貨）
- **產生的待辦**（→ `BACKLOG.md`）: 未填 `<sha>` 佔位符（`W07/plan.md:58,92` · `W07/checklist.md:9`）·
  7 位縮寫假設失效時的處置 · 錨點慣例是否改為 author date + subject
- **前人記錄**: `a5d86ad`（守衛在它要抓的 bug 上是綠的）· `77fb5fb`（linear history 三方權衡）·
  `5189cf3`（再延自己活成 stale）
