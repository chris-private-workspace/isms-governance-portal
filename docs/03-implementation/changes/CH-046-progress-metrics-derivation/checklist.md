# CH-046 — Checklist

> 從 [`spec.md`](./spec.md) §Solution + §Verification 導出。
> 🔴 **只能 `[ ]` -> `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

## 實作

- [x] **`docs/01-planning/PROGRESS-METRICS.md`** —— living 文件
  - DoD: 含 (a) 五把尺的**宣告值** (b) M0–M9 + M6b/M6c 判定表 (c) 每列的**機器可驗錨點**
        (d) 標題與內文明寫**分母是 Wave 1** (e) 代理指標的射程聲明
  - DoD: ⛔ **不含任何整體完成度百分比**（使用者 2026-08-20 裁決）
  - Verify: `python scripts/lint/check_progress_metrics.py`

- [x] **`scripts/lint/check_progress_metrics.py`** —— detector
  - DoD: 導出五把尺 + 驗證里程碑錨點 + 與文件宣告比對；不符 **fail 不 skip**
  - DoD: ⛔ **自己不持有任何期望值**（`check_backlog_counts.py:17-19` 的契約）
  - DoD: 含**無條件 self-test**（兩個方向），跑在真實掃描之前
  - DoD: 輸出結尾固定印射程聲明（代理指標 / 分母是 Wave 1）
  - Verify: `python scripts/lint/check_progress_metrics.py --self-test`

- [x] **實體計數引用 `check_entity_index`，不複製**（AP-2）
  - DoD: 不出現第二份「哪些 model 算 Wave 1 實體」的定義
  - Verify: `grep -n "entity_index\|import" scripts/lint/check_progress_metrics.py`

- [x] **`scripts/lint/run_all.py`** 註冊 `progress-metrics`
  - DoD: `run_all` 由 **10 → 11**
  - Verify: `python scripts/lint/run_all.py`

- [x] **`docs/01-planning/README.md`** 索引加 1 行
  - DoD: 一行，指向 `PROGRESS-METRICS.md`，不複製內容
  - Verify: `python scripts/lint/check_doc_links.py`

## 測試

- [x] **`scripts/lint/tests/test_progress_metrics.py`**
  - DoD: 涵蓋五把尺各自的導出邏輯 + 錨點驗證 + 文件解析
  - Verify: `python -m unittest scripts.lint.tests.test_progress_metrics -v`

- [x] ⛔ **負面測試（驗收不是附加）—— 每次預期寫在執行之前**
  - ⛔ **N2 的預測錯了，且抓到一個真缺陷**（cp1252，`AD-ShaDetectorConsoleEncoding-1` 第 5 次）
  - ⛔ **N3 我連續執行錯兩次**（mutation 沒落地 / mutation 造成語法錯）—— 靠陽性對照才分辨出來
  - DoD: (1) 宣告值 `34 / 36` → `35 / 36` ⇒ 轉紅**且訊息指名哪一把尺**
  - DoD: (2) M4 錨點 `identity == 0` → `== 1` ⇒ 轉紅**且訊息指名 M4**
  - DoD: (3) 移除輸出結尾的射程聲明 ⇒ 轉紅
  - DoD: (4) ⭐ **合法狀態不可被擋** —— 文件與 code 一致時**維持綠**
  - Verify: 四次中性化逐一執行，結果記入 `progress.md`

## 驗收（對應 spec §Verification）

- [x] **五把尺的實測值與 2026-08-20 recon 相符**
  - DoD: 資料模型 34/36 · 稽核覆蓋 16/34 · 接線 3/2/24 · 範疇 5/8 · LOC 排除 `generated/`
  - Verify: `python scripts/lint/check_progress_metrics.py`

- [x] ⭐ **「接線」輸出三個數字與定義，不是一個數字**
  - DoD: domain / other-http / static 三類分開印
  - Verify: 讀輸出

- [x] **M0 與 M8 的錨點欄位明寫 `manual`，不假裝有**
  - DoD: 兩者不被工具宣稱為已驗證；輸出區分 `verified` 與 `manual` 兩個計數
  - Verify: 讀輸出

- [x] **`run_all` 11/11 且 exit 0**
  - Verify: `python scripts/lint/run_all.py`

## Drive-through（user-facing 才需要，PROCESS R8）

- [ ] 🚧 **N/A —— 非 user-facing**
  - 理由: 本片是 lint detector + 規劃文件，沒有使用者會透過 UI 驅動的路徑
  - ⇒ 記錄一律寫「**gate-only verified**」，不得暗示可用性（`verification-discipline.md` §適用範圍）
  - 真實驗收在**下一次審計**：`/status-audit` §2.0 改為引用本文件而非臨時重算

## 收尾

- [x] `progress.md` 寫完成摘要，`spec.md` status -> `done`
- [x] BACKLOG 同步（R7）—— 新產生的待辦 + 計數宣告
  - ⭐ 依 **CH-045** 規矩先查有無現成 AD：`AD-ShaDetectorConsoleEncoding-1` **已在追**
    ⇒ **在那一列補一筆並放寬射程**，未開新列 ⇒ §Open 計數**不變（197）**
- [x] 架構級決定有 ADR（R5）—— **確認不需要**：本片不約束未來架構，只量測現況
- [x] PR merge 後翻 `PR-pending`，並以 `gh pr view <N> --json state,mergedAt` **驗證**
  - `gh pr view 96` 回 `state: MERGED` · `mergedAt: 2026-08-20T14:19:05Z` · `16128e5`
  - ⭐ **E5 在翻之前先抓到它**（`run_all` 10/11，指名 `spec.md:12`）——
    這是 `AD-62` 的差別被演示成可觀察的：`CH-045` 那種獨立單檔 E5 結構上看不見，
    本片這種資料夾 + `status:` frontmatter 抓得到
