# CH-036 — Progress

**Date**: 2026-08-16（單日）
**Branch**: `change/CH-036-sha-anchor-detector`（自 `main` `ab60513`）

---

## 完成摘要

`check_sha_anchors.py` 進 `run_all`（8/8 → **9/9**），17 條測試，**47 處**既有壞錨點全部重指，
`ci.yml` 的 `gates` job 改 `fetch-depth: 0`。ROADMAP 主線第 9 列 ⬜ → 🟡（**不是 ✅**，見下）。

---

## ⭐⭐ 兩個直覺被實測推翻，而其中一個是我自己的

**一、W05 的 `cat-file -e` 早就被推翻過，我在 W17 「重新發現」了同一句話。**
Day 0 的盤點挖出 commit `a5d86ad`（2026-08-11），標題就是結論：
"the guard I proposed passes on the bug it was for"。當時分支不刪、物件仍可達
⇒ 守衛在它要抓的缺陷上是綠的。正解是「**這個 SHA 在 main 的歷史上嗎**」而不是「它存在嗎」。
⇒ 本 CH 不是新提案，是 ROADMAP 第 9 列（三次再延）的執行。

**二、我第一版的豁免規則第一次跑就吞掉 16 個真引用。**
原設計是「行內含 `YYYY-MM-DD` / `<sha>` ⇒ 整行豁免」。實測 `placeholder: 17`，
而獨立量測說殘留誤報只有 **1** 個 ⇒ 立刻查。
`BACKLOG.md:253`/`:287` 與 `ROADMAP.md:87` 是**數百字元的單行** ——
行首一個佔位符豁免了行尾數百字元外的真 SHA。

> `check_entity_index.py:63-76` 早就寫過這句：**A LIST OF NAMES, never a pattern**
> —— a pattern would also swallow the next real entity someone forgets to index.

改具名 allowlist（全 repo 只需 **1** 條）。⚠️ 值得記的是**誤放行碰巧沒造成漏報**：
改完後 `STALE 67 → 67 不變`（預測命中），那 16 個全落在含 dead-value marker 的行上。
⇒ **兩條路徑得到同一個答案，而其中一條的推理是錯的**。沒查就會帶著它出貨。

---

## AC-2 —— 兩個獨立實作逐項一致

| | 獨立量測（ripgrep + 逐 token git 查詢）| detector |
|---|---|---|
| 總命中（排除本 CH 自己的文件）| 615 | **615** |
| 不可解析唯一 token | 53 + 1 + 1 = **55** | **55** |
| 不可解析出現次數 | 120 + 3 + 1 = **124** | **124** |

⚠️ 中途一次假差異：我拿 Grep 的 `count` 模式去比命中數，但它回的是**匹配行數**
（631/461 = 1.37，與獨立量測的 709/517 = 1.37 完全同比例）。
⇒ 同一個坑獨立量測自己也警告過。**比 token 集合，不要比行數。**

---

## AC-3 —— 逐條複核 67 條，判準經三輪收斂

| 輪 | 改了什麼 | STALE |
|---|---|---|
| 1 | 初版（pattern 豁免）| 67 |
| 2 | 具名 allowlist 取代 pattern | 67（不變 —— 見上） |
| 3 | **表格形式的舊/新映射**：同行右側有活 SHA ⇒ 修復記錄 | 54 |
| 4 | pragma（文件在**講**壞錨點時）| **47** |

**第 3 輪的預測是 56，實測 54 —— 多放行 2 條**。逐條查：多出的是
`W11/progress.md:460-461` 的兩欄映射表，我當時只掃到 W14 和 W12 的表格，漏看 W11 也有一個。
⇒ **每一條放行都能由該規則解釋**，是覆蓋更好不是誤放行（W17 N3/N5 的同一把尺）。

⚠️ `→` 在本 repo **是重載的** —— 既是 rebase 映射，也是 calibration 的量測窗口起訖。
判準因此是「左死**且右活**」；`W15/retrospective.md:85` 兩端皆死，長得像修復記錄而**是真壞錨點**。

---

## 委派與獨立複驗

47 處的重指委派給 subagent（有機械化驗收：detector 歸零）。**回報未經採信，三個 gate 我自己重跑**：
detector `EXIT=0` · `run_all` **9/9** · 測試 **17/17**。另抽樣複驗 5 個對應：
author date 逐秒吻合、`gh pr view 26` 的 mergeCommit 為權威來源。

### ⚠️ 委派抓到而我原本會漏掉的一處

agent 誠實回報：`W06/plan.md:323` 原文是「**W01 的兩個失效 SHA**（X / Y）」，
機械重指後「失效」描述的變成兩個**活著的** SHA ⇒ **句子變成假的**。
它遵守了我下的「只改 SHA 不改敘述」而正確地把矛盾交回來。
⇒ 那一行的語意就是「這兩個是死的」，正解是**還原死值 + pragma**，不是重指。

⚠️ 第一次修時 pragma 加錯行（那個 bullet 跨兩行，SHA 在第一行、pragma 加在第二行）——
**pragma 是行級的**，detector 立刻又報了那兩處。

---

## 非計畫內的三件事

**1. `run_all.py` 有一個 Windows-only 的 runner bug（已修，阻塞故當場處理）**
`subprocess.run(..., text=True)` 用 locale 編碼解碼（此處 cp950）。
我的 detector 是第一個印中文的（violation context 引文件原文）⇒ `UnicodeDecodeError`
發生在 `run_one()` 裡，炸的是 **runner 不是 detector**，**其後所有 detector 靜默未跑**。
guardrail 9 要求使用者可見文字用繁中 ⇒ 下一個輸出中文的 detector 照樣會踩。
⛔ **Linux CI 兩種寫法都會過，CI 結構上看不見它**（Risk Class B）。

**2. 我的測試檔被另一支 detector 誤報** —— 合成路徑 `docs/x.md` 被 `check_path_references.py`
當成真引用，用它自己的 pragma 解決。

**3. `AD-W09CalibrationEndpointMismatch-1`** —— 修錨點必須逐個核對 author date，
於是撞到一處 **SHA 有效而它旁邊的時間是錯的**（差 5.6 min，W09 的 actual 建立在該端點上）。
⇒ **「SHA 有效」與「SHA 旁邊的數字有效」是兩個問題**，機械守門只答得了第一個。

---

## ROADMAP 第 9 列標 🟡 而不是 ✅

該列標題有兩個交付物：`--is-ancestor` 的 SHA 檢查（**已出貨**）與 `file:line` **內容比對**（**不存在**）。
detector 掃 hex token，對「檔案還在但那一行已經不是它宣稱的東西」完全看不見 ——
而那是 `AD-DesignNoteAnchor-1` 三種形態裡的第 1 種、也是它 W05 開立時的原始症狀。

> 標成 ✅ 會讓剩下那一半消失在一份沒有人會回頭讀的已完成列裡 ——
> **那正是本列自己記錄的失效形狀再演一次。**

---

## Gate（各自取 exit code，最後一次改動後重跑）

- `python scripts/lint/check_sha_anchors.py` — **OK, EXIT=0**
- `python scripts/lint/run_all.py` — **9/9, EXIT=0**
- `python scripts/lint/tests/test_sha_anchors.py` — **17 tests, OK**
- `python scripts/lint/tests/test_backlog_counts.py` · `test_workflow_placeholders.py` — 既有，未受影響
- `git diff --numstat` — 47 處重指的 21 個檔案**逐檔 add == delete**（行數零淨變動）
- ⚠️ **未跑** npm 的 lint / type-check / test / build —— 本 CH 零 TypeScript 變更

**Drive-through**: ⚪ N/A（純 lint 工具）。⭐ **AC-8 的 CI 實測是這一層的等價物** ——
`fetch-depth: 0` 是否真的讓 `origin/main` 在 PR 的 CI 環境可解析，**本機答不出來**。
