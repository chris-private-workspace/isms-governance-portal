---
description: 功能變更流程 — 判斷規模 → 查既有決策 → 實作 → CHANGE 紀錄 → 同步文件
argument-hint: [變更描述]
---

# Change — 功能變更流程

完整資訊流見 `docs/INFORMATION-FLOW.md` §情境 B。

## 1. 先判斷規模

| 規模 | 判準 | 走哪條 |
|------|------|-------|
| **大** | 動到多個範疇 / 需要新設計決策 / > 1 天 | **`/phase-start`**（完整流程）|
| **中** | 單一範疇 / 有明確方案 / 半天到一天 | 本流程 |
| **小** | 改幾行 / 無設計決策 / < 1 小時 | CHANGE 紀錄 + commit |

**判準一句話**：**三個月後的你需要能追溯這個決定嗎？** 需要 → 往上一級。

## 2. 讀什麼

| # | 對象 | 為什麼 |
|---|------|-------|
| 1 | **既有 CH / BUG 資料夾**（Grep `docs/03-implementation/`）| 這裡之前改過嗎？為什麼變成現在這樣？ |
| 2 | 相關的核心設計文件（`docs/02-architecture/NN-*.md`）| 這次改動會不會違反已定的設計 |
| 3 | 相關 **ADR**（`docs/14-adr/`）| 會不會推翻已定案的決策 |
| 4 | 相關 design note | 這個領域已驗證過什麼 |
| 5 | 要改的程式碼 + **它的測試** | 現有行為的真相 |

⚠️ **若這次變更會推翻某個 ADR** → 不要默默改。寫一份**新 ADR** 取代舊的
（舊的 Status 改成「已被 ADR-NNN 取代」），這樣判斷的演化才留得下來。

## 3. 建之前先 Grep

```bash
grep -rn "class .*<Concept>\|def .*<concept>" <src_root>
```

「假設不存在就新建」是重複實作的頭號來源。

## 4. 實作 + 測試

- [ ] 新行為的測試
- [ ] **負面測試**：關掉這個功能會壞什麼？（答不出來 = AP-3 Potemkin）
- [ ] 既有測試全通過

## 5. Drive-through（user-facing 時 MANDATORY）

`/drivethrough`

**Gate 全綠不等於人能用。** 逐控件走查：可點 / 有效果 / 標籤真實 / 結果渲染。

## 6. 寫 CHANGE 紀錄

```bash
ls docs/03-implementation/changes/ | sort -V | tail -1   # 查最大號
```

兩種形式，**依「過程本身有沒有價值」選**（判準見 `docs/01-planning/PROCESS.md` §3.3）：

| 形式 | 何時 | 產出 | 模板 |
|------|------|------|------|
| **單檔 1-page**（預設）| 當天收得掉；phase Day 4 收尾的記錄 | `changes/CH-NNN-<slug>.md` | `_templates/record.md.tpl` |
| **資料夾** | 跨天追蹤 / 需獨立 pre-doc gate | `changes/CH-NNN-<slug>/`（spec + checklist + progress）| `_templates/change/` |

骨幹相同：`Problem / Root Cause / Solution / Verification / Impact`。

**這份文件的核心價值在 §Solution 的決策理由** —— 三個月後有人問
「為什麼不用 X」，答案要在這裡。

**別漏的兩節**：

- **§關鍵設計細節** —— 那些「看起來是小事、其實會壞事」的地方
- **§Drive-through 抓到而 gate 沒抓到的** —— 若有，這是最有教育價值的部分

## 7. ⭐ 同步文件（最常被漏的一步）

改了行為，**對應的文件也要改**：

- [ ] 相關的 design note / 核心設計文件段落
- [ ] 若改了跨範疇契約 → `docs/02-architecture/cross-scope-interfaces.md` 登記表
- [ ] 被改檔案的 Modification History（1 行）
- [ ] 若產生 / 關掉 AD → `docs/01-planning/BACKLOG.md`
- [ ] **資料夾形式**：`spec.md` frontmatter `status:` → `done`，`affects_components:` 填好（R9）
      —— 只 commit code 不算收尾。驗：`python scripts/lint/check_status_markers.py`

> **改了行為卻沒改文件 = 文件開始說謊。** 那比沒有文件更糟 ——
> 因為下一個人會相信它。

$ARGUMENTS
