---
status: done
---

# CH-027 — Checklist

> 從 [`spec.md`](./spec.md) §Verification 導出。
> 🔴 **只能 `[ ]` -> `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

## 實作

- [x] **0. 格式枚舉**（Day-0 等價物 —— **在寫任何 pattern 之前**）
  - → **E1..E8 見 `progress.md`**。⛔ 枚舉推翻了兩個天真做法：優先度有 **3 種**寫法（不是 1 種）、
    `:145` 儲存格內有**裸 `|`** 使固定欄位索引錯位。🚩 E8：先用「取第一個 emoji」人工數，
    **四個數字全中**卻是未經驗證的方法 —— 差額比對（88 vs 91）才是抓到它的東西
  - DoD: §Open 區段的**每一列**掃過並分類；宣告 marker 的候選寫法全部列出；
    優先度儲存格的**所有實際寫法**（含異格式）列出；`## 怎麼用` 等其他區段中
    以 `| AD-` 開頭的列全部找出
  - Verify: 枚舉結果逐項寫進 `progress.md`，**不得憑印象**（`lint-detector-authoring.md`
    §先枚舉真實格式：憑印象的作者寫了 2 種，repo 裡有 4 種，漏掉的那批藏著 2 個真陽性）

- [x] **1. `scripts/lint/check_backlog_counts.py`**
  - DoD: `find_violations()` 是純函式；宣告側 marker **恰好匹配一次**否則 FAIL；
    真值側只解析 §Open 區段；無法解析的優先度儲存格 **FAIL 不跳過**；
    detector 自身**不持有任何預期數字**；docstring 明寫範圍界線（不證明表格與現實一致）
  - Verify: `python scripts/lint/check_backlog_counts.py`

- [x] **2. 負面 fixture** `scripts/lint/__fixtures__/backlog-count-drift/`
  - DoD: 形狀沿用 `__fixtures__/entity-index-drift/`；含一份**未被改壞**的基準版
  - Verify: 檔案存在且基準版可被 detector 讀取

- [x] **3. 註冊到 `run_all.py`**
  - DoD: `DETECTORS` 7 -> 8；`Modification History` 加 1 行
  - Verify: `python scripts/lint/run_all.py`

## 測試

- [x] **4. `scripts/lint/tests/test_backlog_counts.py`**
  - DoD: 正面 1 + 負面 4 + 假陽性回歸 1
  - Verify: `python scripts/lint/tests/test_backlog_counts.py` —— ⚠️ **unittest 不是 pytest**
    （CH-007 量到 proxy 後 `pip install` 抓到 0 byte 的 wheel）。**13 個**（4 -> 13，見 progress）

## 驗收（對應 spec §Verification）

- [x] **5. 真實 `BACKLOG.md` 目前 PASS**
  - DoD: 若 FAIL，代表今天的數字就是錯的 —— **那是發現不是 bug**，記進 progress 後修數字
  - Verify: `python scripts/lint/check_backlog_counts.py`

- [x] **6. 四個負面方向各自 FAIL**
  - DoD: (a) 總數改 1 (b) 某列優先度改成無法解析 (c) marker 出現兩次 (d) marker 不存在
  - → **六個中性化 N1..N5 全部執行**，5/6 命中；⛔ **N4b 的預測是錯的**（中性化只打開了兩半中的一半）
    → 補 N4c 證明另一半；⭐ N4a 零轉紅暴露真缺口 → 補測試後它成為唯一守衛
  - Verify: `python scripts/lint/tests/test_backlog_counts.py`（unittest）+ 中性化腳本逐項

- [x] **7. ⭐ 元驗證：每個負面 fixture 先在未改壞版本上 PASS**（`AD-MetaVerificationBug-1`）
  - DoD: 只有 FAIL 的那一半不算數 —— W08 的 N6 第一版壞掉時長得跟成功一模一樣
  - Verify: 每個負面測試都有配對的「基準版 PASS」斷言

- [x] **8. 假陽性回歸：歷史敘述的「其前 N 條」不得被當成宣告值**
  - Verify: fixture 含多段歷史數字，detector 仍取到正確的 marker

- [x] **9. `run_all` 8/8**
  - Verify: `python scripts/lint/run_all.py`

## Drive-through（user-facing 才需要，PROCESS R8）

- [ ] ⚪ **N/A —— 純工具鏈，無 user-facing 介面**
  - 收尾報告一律寫 **gate-only verified**，不得暗示可用性
  - ⭐ 本 detector 的第一次真實驗證機會是**下一個 phase 的 closeout**（BACKLOG 被編輯之時）

## 收尾

- [x] **10. `BACKLOG.md`**：關閉 `AD-CountBeforeLastEdit-1`（移出 §Open + §Shipped 加 1 行）；
      開頭數法說明改為指向 detector；新增順帶發現（模板的「提案中」不在 `OPEN_STATES`）
      ⛔ **計數在最後一次編輯之後才做** —— 本 CH 自己就是這條規則的題目
  - → ⭐ **detector 當場擋住一次真實漂移**（P1 −1 / P2 +1，總數不變 —— 手數最看不出來的那種）。
    開頭那一行是照它的輸出改的。**91 條（P0 6 / P1 51 / P2 34）**
- [x] **11. `ROADMAP.md` 第 10 列標 ✅**，並在原處記錄落點改判的理由（不靜靜改掉）
- [x] **12. 檔案 header** 符合 `file-header-convention.md`（新檔 3 個）
  - → fixture 依 §例外用簡化形式（檔頭 HTML 註解說明它是什麼、為什麼每個形狀都在）
- [x] **13. Anti-pattern 自檢** AP-1..AP-7 → **AP-7 有 1 個，已修**（我自己移走 `:117` 卻留著引用；
      連帶發現收尾增行使 progress 全部行號失效 → 改用 AD 名稱，見 progress §紅旗 3）
- [x] **14. `progress.md` 完成摘要**
  - → ⏳ **`spec.md` 的 `status:` 仍是 `approved`，刻意的** —— 依 R9「只 commit code 不算收尾」，
    翻 `done` 與項目 15 的 merge 驗證綁在一起（W10 的做法）
- [x] **15. Commit + PR**（push 是 outward-facing -> 需使用者確認）；
      merge 經 `gh pr view` 驗證後翻 `status:` 標籤
  - → **PR #54 MERGED** `5a676f9`（laitim2001，2026-08-14T01:48:34Z）；六個 check 全 SUCCESS，
    且**查了 CI log 而非假設**：`run_all: 8/8` 含 `backlog-counts`、`Ran 13 tests` 逐項列名
  - → 內容在 main 用 `git cherry`（patch-id）驗過，**不用 ancestry**（`AD-RebaseMergeBranchCheck-1`）
  - → ⛔ **rebase 又殺掉一個「工作就是可查證性」的 SHA**：`56822e4` → `7c8d46f`。
    已改指並補 author date（`09:31:41+08:00`，兩側逐秒相同）。⚠️ PR #54 描述與 `a75e02e`
    的 message 仍引用舊值，**兩者都已發布不可改** —— 這正是 `AD-DesignNoteAnchor-1` 要抓的形狀
