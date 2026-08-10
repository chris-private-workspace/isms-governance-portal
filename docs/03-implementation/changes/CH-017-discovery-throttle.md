# CH-017: A throttle on work the assistant finds by itself

**Date**: 2026-08-10
**Phase**: 無 —— 獨立 CH（使用者於 2026-08-10 觀察後要求）
**Scope**: 開發流程規則（`.claude/rules/` + hook）
**Components**: —
**PR**: 待開

---

## Problem

使用者的觀察：「一直在開發中途拆出分支是不合理的……正常應該收進 backlog 之類，
讓我去決定什麼時間 review 和處理」。

量測結果比印象更難看 —— 專案第 4 天：

| | 行數 |
|---|---|
| **產品程式碼**（版控中，排除測試） | **911** |
| 工具／gate 程式碼（`scripts/` + `.github/`）| **3,287** |
| `docs/` markdown | **20,909** |

比例 **1 : 3.6 : 23**。那 911 行裡**零個業務模組** —— 只有 scaffold、entity-scope、
prisma service、health、web 首頁。

16 個 CH 的分佈：**CI/工具 5 · 流程文件 2 · 設計分析前置 4 · phase 記錄 2 ·
ADR/範圍/行政 3 · 產品功能 0**。

同期三份未拍板的 ADR 各擋著一個里程碑（0005→M1 · 0003→M3 · 0002→M5），
而 **「ADR-0005 擋著 M1」直到第 4 天填 `ROADMAP.md` 才被發現** ——
三天來沒有人知道下一步的第一個路障在哪。

---

## Root Cause

**不是流程沒被遵守，是流程只在一半的地方有煞車。**

Rolling planning 的紀律**只綁在 Phase 軌上**。CLAUDE.md 的滾動自檢六條全是 phase 導向
（「沒預寫多個未來 phase 資料夾」「沒在 retrospective 寫具體未來 phase task」……），
**沒有一條管 CH 的產生速率**。

而治理與工具工作天然都是「非 phase」的 —— 於是它們全部從 Change 軌湧出來。
Phase 被節流了，工作就從沒被節流的閘門走。

⭐ 更深一層：**`Step 0` 的決策樹回答「屬於哪一軌」，但它預設了「這件事現在要做」。**
那個預設從來沒有被問出口，而多數失控就發生在那裡。

**它還會自我增殖**：2026-08-10 的一個 session 關掉 1 條 AD、新增 3 條，BACKLOG 48 → 50。
治理工作的產出是更多治理工作 —— 因為它永遠有正當理由，而且比業務邏輯容易做。

---

## Solution

| 檔案 | 類型 | 說明 |
|------|------|------|
| `.claude/rules/task-workflow.md` | 修改 | 新增 **§Step 0.0 節流閘**（在決策樹**之前**）|
| `.claude/settings.json` | 修改 | `UserPromptSubmit` hook 擴充一個子句 |

**規則本體**：順路發現的東西，**預設記進 `BACKLOG.md` 並繼續當前工作**。
當場處理只有三個例外 —— 阻塞當前工作 / 安全或資料完整性 / 使用者明確要求。
外加配額：**每個 phase 最多帶 1 個治理或工具類 CH**。

**為什麼同時上 hook（而不只是寫進規則）**：
`.claude/rules/README.md` 的強度階梯把 **級 4（每回合 hook 注入）** 的判準定為
「**在同一個 session 內**被違反 —— 那是『中途忘了』，不是『不知道』」。
2026-08-10 的 session 內連續岔出三次（CH-015 → CH-016 → 分析報告），**判準成立**。
規則檔在 session 開頭讀過，長對話走到一半注意力已被別的東西佔滿 ——
**在規則檔裡再寫幾次也沒用**，這是該階梯明文的結論。

**Load-bearing 細節**：

- 規則加在 `task-workflow.md` **而非 CLAUDE.md**，是 byte 預算逼出來的：
  CLAUDE.md 29,690/30,000（餘裕 **310 bytes**，`AD-ClaudeMdBudget-1`），
  `task-workflow.md` 23,367/32,000（餘裕 8,633）
- hook **保持一句話** —— 每回合都付 context 成本（`README.md` 明文）
- 規則含一句「**這不是要你變被動**」：發現問題仍要說，差別在「說 + 記錄」而非「說 + 立刻動手」。
  沒有這句，本規則會與 CLAUDE.md §Developer Preferences 的 *Proactive Assistance* 直接衝突

---

## Verification

**Gate**: `check_rules_hygiene.py` **OK** —— `task-workflow.md` 25,435 / 32,000（餘裕 6,565）·
`settings.json` 通過 `json.load()` 合法性檢查 · `run_all` 6/6

**新增測試**: 無 —— 規則與 hook 設定，無可執行邏輯

**Drive-through**: ⚪ N/A —— 無 user-facing surface

**Verdict**: ⚪ **gate-only verified**。⚠️ **誠實標記：本次只證明了「規則寫進去了、預算沒爆、
JSON 合法」。規則是否真的節流，要到下一個 phase 結束、數 CH 的產生數才知道。**
`AD-NegativeGate-1` 的判準（宣稱會擋東西的機制要有被它擋住的案例）在此**尚未滿足** ——
它的自然驗證點是下一次我提議「順手修一下 X」而被擋回 BACKLOG。

---

## Impact

- **Breaking change**: **yes（對助手行為）** —— 順路發現的問題預設不再當場處理
- **Migration**: no
- **Config**: `.claude/settings.json` 的 hook 字串變更。⚠️ **hook 變更要新 session 才生效**
- **重啟需求**: **是** —— `UserPromptSubmit` hook 在 session 啟動時載入
- **Rollback**: 還原兩個檔案。~2 分鐘

---

## 相關

- **關掉的待辦**: 無既有 AD —— 這是使用者觀察直接產生的
- **同類前例**: 無。這是本專案第一條**針對助手工作選擇**（而非工作品質）的規則 ——
  既有規則全部在管「做得對不對」，這條管「該不該現在做」
- **第一次適用**：本 CH 自己。它是**使用者明確要求**（例外 3），所以合規；
  而 `CH-015` / `CH-016` 若在新規則下重來，AD-5 仍會做（解封條件早成立且保護後續所有工作），
  **AD-2 / AD-3 / AD-4 分類會被擋回 BACKLOG**
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-ThrottleEfficacy-1`
  （規則有效性未經驗證，下個 phase 收尾時數 CH 產生數）
- **上游**: 使用者 2026-08-10 的觀察 · `.claude/rules/README.md` §約束強度階梯
