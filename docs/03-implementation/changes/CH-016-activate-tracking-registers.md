# CH-016: Three tracking documents that were never used

**Date**: 2026-08-10
**Phase**: 無 —— 獨立 CH（`STATUS_AUDIT.md` 2026-08-10 §2.7 AD-2 / AD-3 的處置）
**Scope**: Planning / 治理文件
**Components**: —
**PR**: **MERGED** (PR #29, `c6a0bba`) —— 2026-08-10（與 CH-015 同一個 PR）

---

## Problem

`STATUS_AUDIT.md` §1 把 `ROADMAP.md` · `RISK_REGISTER.md` · `DEFERRED_REGISTER.md`
列為**必掃的權威來源**。首次跨來源審計（2026-08-10）量到三份**全部是 bootstrap 模板，零條目**：

| 檔案 | 實據 |
|---|---|
| `ROADMAP.md` | 全檔 81 行皆為模板說明，主線表兩列皆空 |
| `RISK_REGISTER.md:14` | 仍是 `\| R1 \| \| 高/中/低 \| ...` 佔位列 |
| `DEFERRED_REGISTER.md:15` | 仍是 `\| D001 \| \| YYYY-MM-DD \| ...` 佔位列 |

同一期間 `BACKLOG.md` §Open 累積到 **48 條**，兩個 phase 與 15 個 CH 全部正常收尾。
**沒有任何一次收尾察覺到這三份是空的。**

---

## Root Cause

不是「忘了填」。三份的啟用條件都被寫成**敘述**而不是可檢查的條件：

- `ROADMAP.md:27`（原行號）：「只有在 BACKLOG 長到『讀完不知道下一步』時才需要本檔」
  —— 沒有人在量那個門檻
- `RISK_REGISTER` / `DEFERRED_REGISTER`：bootstrap 給了模板，但**沒有給「第一次什麼時候填」的觸發點**

⭐ **這與 `CH-015` 的根因完全同構**：`AD-CIRequired-1` 的解封條件也是敘述
（「W01 骨架建立後設」），也是成立後無人察覺。四份文件、同一個病 ——
**條件寫在一個沒有人會回頭掃的地方**。加上 `AD-ImageDigest-1` / `AD-ImageBuild-1`，
這是第 4、5 次。

---

## Solution

**三份都填，不廢任何一份。** 選擇的理由逐份不同：

| 檔案 | 決定 | 為什麼 |
|------|------|--------|
| `ROADMAP.md` | 填**薄**的一層（主線 7 項 + 死線 1 + 等外部 2 + 押後 3）| 48 條 AD 沒有任何順序。但**不排序全部 48 條** —— 那會變成第二份要同步的清單，正是它自己警告的事 |
| `RISK_REGISTER.md` | 填 8 條活躍 + 3 條已實現 | 見下方「兩個非顯而易見的決定」 |
| `DEFERRED_REGISTER.md` | 填 5 條結構性 defer | 每條都是**會被重新提出**的那種；D001（in-country 能力）是典型 |

**兩個非顯而易見的決定**：

1. ⭐ **`RISK_REGISTER` 同時承擔兩種風險。** 模板的用途是**專案交付風險**
   （`:31`「跨 phase 的長期風險住這裡」）。但 guardrail 2（Entity Zero）要求的是
   **平台自身**作為資產的 ISMS 風險 —— 而那個承載體（Risk Register 模組）要到 M4/M5 才存在。
   在此之前 guardrail 2 在整個 Wave 1 都是空的。
   **解法**：本表現在同時裝兩種，平台自身的四條（R3 · R4 · R5 · R7）標記為遷移候選。
   Risk Register 模組上線時把它們遷進平台自己的系統 —— **那次遷移本身就是 Entity Zero 的第一次證明**，
   而且用的是真實資料，不是種子資料（guardrail 7 禁止產生假的示範資料，這正好繞開它）。

2. **`ROADMAP` 的職責比模板寫的更具體一點**：有解封條件、有前置依賴、有死線的項目，
   必須出現在一份**會被讀的**清單上。這是針對上述根因的結構性回應，不只是「填表」。

**填 ROADMAP 時量到兩件原本沒人知道的事**：

- **M1 的 DoD 明文含 "governed-extension mechanism working"**（`07:32`）——
  那就是 **ADR-0005 / OQ-6，尚未拍板**。M1 因此有一個先前未被標示的前置依賴
- ⚠️ **`CH-015` 製造了一個新的死線後果**：`AD-TrivyExempt-1` 的 `libssl3` 六條豁免
  2026-09-07 到期，而 `容器映像 — trivy` 從 2026-08-10 起是 **required check** ——
  到期不再只是「CI 有個叉」，而是**所有 PR 停止可 merge**

---

## Verification

**Gate**: `python scripts/lint/run_all.py` —— 見下方實際輸出

**新增測試**: 無 —— 純文件變更，無可執行邏輯

**Drive-through**: ⚪ **N/A —— 無 user-facing surface**

**Verdict**: ⚪ **gate-only verified**。⚠️ 誠實標記：**這三份文件的價值只有在被持續維護時才成立**，
而本次只證明了「內容寫進去了」。真正的驗證是下一次 closeout 有沒有同時改三處 ——
那要到下個 phase 才知道。

---

## Impact

- **Breaking change**: **yes（對收尾流程）** —— closeout 從「改 BACKLOG 一處」變成
  「BACKLOG + ROADMAP 兩處，並複查 RISK_REGISTER」。⚠️ 只改一處就是下一次審計的漂移發現
- **Migration**: no
- **Config**: no
- **重啟需求**: no
- **Rollback**: 還原三個檔案。但真正的成本是回到「有三份被列為權威來源卻是空的」的狀態

---

## 相關

- **關掉的待辦**: `STATUS_AUDIT.md` §2.7 **AD-2** ✅ · **AD-3** ✅
- **同類前例**: `CH-015`（`AD-CIRequired-1`）· `AD-ImageDigest-1` · `AD-ImageBuild-1` ——
  **同一個根因第 4、5 次**：解封條件寫在沒有人會回頭看的地方。
  結構性解法即本 CH 的 `ROADMAP.md`（有條件的項目必須進一份會被讀的清單）
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：`AD-RegisterUpkeep-1`
  （三份 living 文件的維護沒有任何機械檢查 —— 停更兩個月不會有東西叫）
- **上游**: `STATUS_AUDIT.md` 2026-08-10 §2.7 · CLAUDE.md guardrail 2（Entity Zero）
