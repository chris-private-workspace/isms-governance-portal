---
description: 跨來源狀態審計 — 掃所有追蹤來源做點時間快照，揪出來源之間的漂移，寫入 docs/01-planning/STATUS_AUDIT.md
---

# 全項目狀態審計

**觸發時機**：使用者問「現在全項目最新狀況」「有什麼 pending」「幫我盤點一下」「進度到哪」
「有什麼已規劃但未執行」「哪些還沒做」，或要求檢視整體進度 / 整理待辦
—— **即使他們沒說「審計」兩個字**。

> 🔴 **不要只讀 `BACKLOG.md` 就回答。** 它看不見自己的 stale，單一來源的答案必然不準。
> 為什麼一定要跨來源：[`docs/01-planning/STATUS_AUDIT.md`](../../docs/01-planning/STATUS_AUDIT.md) §0。

---

## 第一步：掃全部權威來源

**一次發多個 Read / Grep 並行，不要逐個等。** 來源清單（權威定義）在 `STATUS_AUDIT.md` §1。

實用查詢（直接用，不要自己重砌）：

```
# ADR 狀態 —— 有沒有 Proposed 未拍板
Grep  pattern: ^\*\*Status\*\*:.*        path: docs/14-adr        output_mode: content

# 三軌 pre-doc 狀態 —— 跑腳本，不要自己砌 grep（見下方 ⚠️）
python scripts/lint/check_status_markers.py

# Phase 狀態值全表
Grep  pattern: ^status:\s*(\S+)          path: docs/01-planning   glob: **/plan.md   output_mode: content

# 補腳本掃不到的:單檔 1-page 記錄 + 沒有 frontmatter 的兄弟檔
# （不要掃全部 status:，輸出會爆）
Grep  pattern: ^status:\s*(draft|proposed|approved|active|open|in_progress|blocked|partial)   path: docs   output_mode: content

# code 內未追蹤的債
Grep  pattern: TODO\(|FIXME|HACK\(       glob: **/*.{py,ts,tsx,go,rs,java}   output_mode: content
```

> ⚠️ **phase 狀態一定要跑腳本。** 手砌 `grep ^status:` 是一個真實踩過的陷阱：
> 來源專案第一次審計只 grep frontmatter，而當時 **31 / 108 個 `plan.md` 根本沒有那個欄位**，
> 另有 11 個 phase 的**內文**標記寫著 `active` 但早已收尾 ——
> 「哪個 phase 仍 active」的答案同時**漏看 29%** 兼**含 11 個假陽性**。
> **腳本 E1 / E2 一旦紅，本身就是漂移發現，直接記進 §2.7。**

---

## 第二步：交叉比對揪漂移（**這步才是價值所在，不可以跳**）

逐項問：

1. **同一 ID 在同一份文件內狀態一致嗎？**（真實案例：同一項在兩個分區狀態相反）
2. **一份說「待做」的，另一份 / commit 記錄是否顯示已做？** 反之亦然
3. **寫死日期的觸發條件過期了嗎？**（死線過了沒人執行）
4. **登記冊的「最後更新」距今多久？跨了幾個 phase？**
5. **某項的恢復 / 解封條件，是否已被後來的工作繞過了？**
6. **標「W{N}+ 再做」的東西，那個 phase 收尾之後有沒有人跟進？**
7. **編號序列有沒有無解釋的空缺？**

---

## 第三步：寫入 STATUS_AUDIT.md

用 `STATUS_AUDIT.md` §2 的結構覆寫最新快照，舊快照精簡成 3-5 行移到 §3。

**每項漂移必須帶實據**（commit sha / `file:line` / `git ls-files` 輸出）。
**寫「似乎 stale」等於沒寫。**

---

## 三條硬紀律

1. **不可以靠目錄結構或狀態欄位推斷 —— 一律查 `git log` 實據。**
   每個「未做」的判斷落筆前先問：我查過 commit 沒有？
2. **兩個方向都要驗。** 「文件說已完成」不等於完成；「文件說待辦」也不等於未做。
3. **證據必須真的支持結論。** grep 命中**數**不是證據（要逐處讀）；
   零命中要先確認**搜對了地方**；grep 撞上限 = 還沒搜完。
   見 `memory/feedback_evidence_must_support_claim.md`。

---

## 收尾

1. 更新 `STATUS_AUDIT.md` frontmatter `last_audit`
2. **在 `BACKLOG.md` 加一行**指向本次 §2.7（PROCESS R7）—— **一行，不要複製細節**
3. Commit：`docs(planning): status audit <日期>`

---

## 不可以做的事

- ❌ **不可以在 `STATUS_AUDIT.md` 複製 BACKLOG / REGISTER 的逐項細節** —— 那是在製造下一次漂移
- ❌ **不可以順手修漂移**（除非使用者要求）—— 審計負責揪出來，修是另一件事
- ❌ **不可以用本 command 取代 session start** —— 那個是載入 active phase context，這個是全景審計

---

## 常見誤判

| 表面現象 | 真相 | 怎麼驗 |
|---|---|---|
| 某 bug frontmatter 標 `open` | 可能早已修好，只是收尾沒翻 frontmatter | `git log --oneline -- <相關檔>` |
| 「找不到資料夾 = 從未做」 | 可能在 `docs/` 以外（`infrastructure/` / `scripts/` / `.github/`）| 擴大搜尋範圍再判 |
| 文件引用了某檔 = 該檔存在 | 可能只有 `-draft` 版本 | `git ls-files` 核對 |
| CI 某個 job 紅色 | 缺憑證的 deploy job 紅是**預期**，不是 regression | 對照歷史紀錄再判 |
