# Memory Seed — 種子記憶

這個目錄包含 **11 條跨專案通用的行為教訓** + 一份 `MEMORY.md` 索引骨架。

---

## Claude Code 的記憶怎麼運作

Claude Code 的持久記憶住在：

```
~/.claude/projects/<project-path-slug>/memory/
```

`<project-path-slug>` 是專案絕對路徑轉成的 slug
（路徑分隔符換成 `-`，例如 `C--Users-<you>-projects-my-app` 或 `-home-<you>-projects-my-app`）
—— 因此模板**無法**直接寫進去。

## 兩種擺法

### 方案 A：專案內版控（推薦）

把 memory 檔案放在**專案內**的 `memory/` 目錄 + 根目錄 `MEMORY.md`：

```
my-project/
├── MEMORY.md           # 索引（可在 CLAUDE.md 裡引用）
└── memory/
    ├── feedback_*.md   # 11 條種子 + 你自己的
    └── project_*.md    # 每個 phase 一份 subfile
```

**優點**：進 git、可 review、換機器不會丟、團隊共享。
**代價**：Claude Code 不會自動載入，要在 `CLAUDE.md` 裡指向它
（模板的 CLAUDE.md 已經做了這件事）。

### 方案 B：同步到 Claude Code 的記憶目錄

若你想讓 Claude Code 自動管理，把檔案複製過去：

```bash
# 找出你的專案 slug
ls ~/.claude/projects/

# 複製
cp -r memory/* ~/.claude/projects/<your-slug>/memory/
cp MEMORY.md ~/.claude/projects/<your-slug>/memory/
```

**優點**：Claude Code 原生的記憶機制（自動 recall）。
**代價**：不在 git 裡，換機器要重新同步。

### 建議

**兩個都做**：專案內版控為真相來源，需要時同步一份到 Claude Code 的記憶目錄。

---

## 這 11 條種子是什麼

| 檔案 | 一句話 |
|------|--------|
| `feedback_never_fabricate_tool_results.md` | ⭐ 沒看到 function_results 就不能說「已完成」 |
| `feedback_evidence_must_support_claim.md` | ⭐ 工具輸出是真的，推論仍可能錯 —— grep 命中**數**不是證據 |
| `feedback_drive_through_over_paper_metrics.md` | ⭐ Gate 全綠不等於人能用 |
| `feedback_navigator_files_are_pointers_not_archive.md` | ⭐ CLAUDE.md 曾從 30KB 長到 77KB |
| `feedback_day0_must_grep_plan_assumptions.md` | ⭐ 檔案存在 ≠ 內容如你所想（ROI 4-60×）|
| `feedback_tool_result_is_not_turn_boundary.md` | 別在對齊範圍內每個工具都停下來問 |
| `feedback_never_delete_unchecked_items.md` | Checklist 只能勾選，不能刪 |
| `feedback_verify_pr_merged_via_tool_not_claim.md` | 「已 merge」要用 gh 驗證 |
| `feedback_doc_growth_follows_runtime.md` | 禁止預寫規劃文件 |
| `feedback_check_existing_before_building.md` | 建之前先 Grep |
| `feedback_stay_anchored_no_auto_drift.md` | 任務完成是停止點 |

⭐ = 最高價值，建議優先讀完。

---

## 加你自己的

新教訓的門檻：**在專案裡真實發生過，而且你希望它不要再發生**。

格式：

```markdown
---
name: <kebab-case-slug>
description: "<一句話，用於 recall 時判斷相關性>"
metadata:
  type: feedback | project | user | reference
---

# <標題>

**規則**：<具體、可執行的規則>

## 真實案例
<發生了什麼 —— 具體，有數字更好>

## 根因
<為什麼會發生 —— 這比症狀重要>

## 怎麼做
<可執行的步驟>
```

**經過 2-3 個 phase 驗證有效的教訓，可以回流到模板**（見模板的 `GETTING-STARTED.md` §7）。
