---
description: Bug 修復流程 — 查既有紀錄 → 重現 → 根因 → 修 → 回歸 → FIX 紀錄
argument-hint: [bug 描述或症狀]
---

# Fix — Bug 修復流程

完整資訊流見 `docs/INFORMATION-FLOW.md` §情境 C。

## 1. 先查：這個 bug 修過嗎 ⭐

```bash
grep -rl "<關鍵字>" docs/03-implementation/bugs/
```

**這一步不能跳過。** 若找到相關的 FIX 紀錄：

- 讀它的 §根本原因 + §預防措施
- **同一個 bug 修第 2 次以上** = 上次只修了表象
  → 這次的 §預防措施必須給**結構性解法**（lint / 測試模式 / 設計變更），不能只修程式碼

## 2. 讀什麼

| # | 對象 | 為什麼 |
|---|------|-------|
| 1 | 既有 FIX 紀錄 | 上面那一步 |
| 2 | 症狀相關的程式碼 | — |
| 3 | **該處的測試** | ⭐ 為什麼現有測試沒抓到？ |
| 4 | 相關 design note / 設計文件 | 這裡的行為原本設計成什麼樣？ |
| 5 | `git log` / `git blame` 該處 | 什麼時候變成這樣的、當時為了什麼 |

## 3. 重現（先寫失敗的測試）

**先寫一個會失敗的測試，再開始修。**

- 無法重現 → 不要猜著修。先補足資訊（日誌 / 輸入樣本 / 環境差異）
- 間歇性 → 找出觸發條件，寫成測試的前置狀態

若真的無法寫成自動化測試（如 UI 時序問題），**記錄手動重現步驟**並在 drive-through 驗證。

## 4. 根因，不是表象

```
❌ 表象：「金額算錯了」
✅ 根因：「稅在折扣解析之前算，因為 price() 的階段順序照 spec §3 段落順序寫，
         而 §4 才定義正確先後」
```

**同時回答**：為什麼現有測試沒抓到？常見答案：

- 測試只餵理想輸入，沒涵蓋真實輸入分佈
- 測試測的是實作（mock 呼叫次數）而非行為
- 這條路徑根本沒測試
- 測試本身斷言錯了
- 只有 gate 層驗證，沒有 drive-through

## 5. 修 + 驗證

- [ ] 重現測試：修復前 FAIL → 修復後 PASS
- [ ] 回歸測試：既有測試全通過
- [ ] user-facing → **drive-through**（`/drivethrough`）

## 6. 寫 FIX 紀錄

```bash
ls docs/03-implementation/bugs/ | sort -V | tail -1   # 查最大號
```

兩種形式，**依「過程本身有沒有價值」選**（判準見 `docs/01-planning/PROCESS.md` §4.3）：

| 形式 | 何時 | 產出 | 模板 |
|------|------|------|------|
| **單檔 1-page**（Sev3/4 預設）| 當天收得掉 | `bugs/BUG-NNN-<slug>.md` | `_templates/record.md.tpl` |
| **資料夾** | Sev1/Sev2、調查跨天 | `bugs/BUG-NNN-<slug>/`（report + checklist + progress[+ postmortem]）| `_templates/bugfix/` |

骨幹相同：`Problem / Root Cause / Solution / Verification / Impact`。

**兩個不能省的區塊**：

- **§為什麼現有測試沒抓到** → 指向測試策略的漏洞
- **§預防措施**（短期 + 長期）→ 沒有它，這份紀錄只是修好了一次

## 7. 更新

- [ ] 被改檔案的 Modification History（1 行）
- [ ] 若根因指向流程漏洞 → 記一條 AD 到 `docs/01-planning/BACKLOG.md`
- [ ] 若加了新預防機制（lint / 測試模式）→ 更新對應規則檔
- [ ] **資料夾形式**：`report.md` frontmatter `status:` → `done`，`affects_components:` 填好（R9）
      —— 只 commit code 不算收尾。驗：`python scripts/lint/check_status_markers.py`

## 規模判斷

| 規模 | 走法 |
|------|------|
| 小（改幾行、根因明確）| FIX 紀錄 + commit 即可 |
| 中（要改設計 / 影響多處）| 上述完整流程 |
| 大（根因是架構問題）| 開一個 phase（`/phase-start`），這是 refactor 不是 fix |

$ARGUMENTS
