---
description: Phase 收尾 — change record + retrospective + calibration 回填 + 導航檔更新
---

# Phase Closeout

**目標**：把這個 phase 的知識固化到正確的地方，且**不讓導航檔膨脹**。

## 1. Change Record

先查現有最大號（編號單調遞增），選對模板：

| 這個 phase 做的是 | 模板 | 產出 |
|------------------|------|------|
| 加功能 / 改行為 | `docs/01-planning/_templates/change/spec.md.tpl` | `03-implementation/changes/CH-NNN-*/` |
| 修 bug | `docs/01-planning/_templates/bugfix/report.md.tpl` | `03-implementation/bugs/BUG-NNN-*/` |
| 重構（行為不變）| `docs/01-planning/_templates/change/spec-refactor.md.tpl` | `03-implementation/changes/CH-NNN-*/`（refactor 變體） |

**各自不能省的區塊**：

- **CHANGE** — §關鍵設計細節 + §Drive-through 抓到而 gate 沒抓到的
- **FIX** — §為什麼現有測試沒抓到 + §預防措施（短期 + 長期）
- **REFACTOR** — §量化改善 + §防止復發（加了什麼機械守門）

## 2. Design Note / ADR（條件性）

| 這個 phase | 產出 |
|------------|------|
| **Spike**（新領域 / 無藍本 / 驗證了新不變式）| **Design note** → `docs/02-architecture/design-notes/NN-<topic>-design.md`；Read `docs/rules-on-demand/spike-design-note-gate.md` 走 8-Point Gate，verified ratio ≥ 95%；在 `docs/01-planning/README.md` 加 1 行索引 |
| 做了**會約束未來的決定** | **ADR** → `docs/14-adr/ADR-NNN-*.md`（含**可證偽條件**）；在 `docs/14-adr/README.md` 加 1 行 |
| Spike 中做的決策 | 寫在 design note §1 Decision Matrix，**不用另開 ADR** |
| Feature continuation（複用既有 pattern）| **都不要** |

## 3. Retrospective

`docs/01-planning/W{NN}-{slug}/retrospective.md`

模板：`docs/01-planning/_templates/phase/retrospective.md.tpl`（Q1-Q7）

**Q2 Calibration 必須算出 ratio**：

```
actual / committed = R
band: IN (0.7-1.2) / OVER (>1.2) / UNDER (<0.7)
```

**Q3 要量化 Day-0 的 ROI**（drift 數 / 成本 / 預防的返工）。

## 4. Calibration 回填

**兩個地方，內容不同**：

| 檔案 | 放什麼 |
|------|--------|
| `docs/01-planning/CALIBRATION-MATRIX.md` | **≤ 1 行 ~250 字元**：verdict + ratio/band + rollback trigger + 指標 |
| `docs/01-planning/CALIBRATION-LOG.md` §1 | **完整敘述**：發生了什麼、是雜訊還是訊號、行動 |

⚠️ 完整敘述寫進 matrix 格子 = 這張表遲早膨脹到不能用（真實發生過兩次）。

## 4.5 翻 `status:` frontmatter（R9）

`docs/01-planning/W{NN}-{slug}/plan.md` 的 frontmatter `status:` → `closed`
（gate 只部分達標就用 `closed_partial`）。**內文那行 `**Status**` 一起翻。**

同一個 phase 順帶產出的 CH / BUG **資料夾**形式，也要翻它自己的 pre-doc
（`spec.md` / `report.md`）。單檔 1-page 記錄沒有這個欄位，不用管。

```bash
python scripts/lint/check_status_markers.py
```

> **為什麼要在這裡而不是靠自覺**：「只 commit code 就當收尾」會讓追蹤文件顯示
> **假 pending**，之後每次盤點都要靠 `git log` 逐個反查才知道真相。
> 這一步是 R9 的執行點，上面那個腳本是它的守門員。

## 5. Final Gate Sweep

```bash
<format 指令>
<lint 指令>
<type check 指令；無型別系統則填 echo 'n/a'>
<test 指令>
python scripts/lint/run_all.py
```

**全部要綠**（含 rules hygiene —— 它會擋住膨脹的規則檔）。

## 6. 導航檔更新（Minimal Touch）

### CLAUDE.md — **只能改 2 行**

- `Current Phase` 那一格（1 行）
- `Last Updated` footer（1 行）
- 里程碑達成才動 `Phase` / `Roadmap`

❌ **禁止**：加 `Prev Phase` 列、把 retro 細節 / commit SHA / 測試數塞進表格格、
在 footer 加歷史段落、在檔尾加存檔區塊。

### MEMORY.md — 加 1 條品質指標（~250-300 字元）

```markdown
- [memory/project_wNN_<topic>.md](memory/project_wNN_<topic>.md) — Phase W{NN} closed YYYY-MM-DD; <1 句做了什麼>; <1 個短語：獨特之處>.
  Keywords: <未來檢索用的名稱>
```

### memory subfile — 細節住這裡

`memory/project_wNN_<topic>.md`：完整 retro 重點 / calibration / carryover / 檔案變更表。

### BACKLOG.md

- 關掉的 AD → 從 §Open 移除，在 §Shipped Pointer Index 加 1 行
- 新的 AD（來自 retro Q6）→ 加到 §Open

## 7. Commit → PR

```
<type>(<scope>, W{NN}): <description>
```

⏳ **push 前必須問使用者**（push 是 outward-facing 動作）。

Merge 後：用 `gh pr view <N> --json state,mergedAt` **驗證**真的 merged 了，
再把 `PR-pending` 標籤翻成 `MERGED (PR #N, <sha>)`。
**不要相信「已 merge」的宣稱** —— 那可能是一個仍然 BLOCKED 的 PR。

## Closeout Self-Check

- [ ] CLAUDE.md 只有導航 / 原則層級變更
- [ ] MEMORY.md 是 ~300 字元指標，不是打包摘要
- [ ] 細節單一來源在 subfile + retrospective
- [ ] Carryover 在 `01-planning/BACKLOG.md`，不在 CLAUDE.md
- [ ] Matrix 行 ≤ 250 字元；敘述在 log
- [ ] **`plan.md` frontmatter `status:` 已翻，內文標記一致（R9）**
- [ ] `run_all.py` 全綠（含 `check_status_markers`）
- [ ] Checklist 沒有被刪掉的 `[ ]` 項
