---
status: draft   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W{NN} Plan — <short scope phrase, ≤ ~12 words, NO embedded summary>

> **FROZEN canonical phase-plan template.** 這是每個新 phase plan 要對照的 **絕對錨點** ——
> **不是**「最近一個 phase 的 plan」。
>
> **Why frozen**（80+ phase 漂移審計）：原規則「模仿最近完成的 phase」是**相對錨點** ——
> 每個 phase 抄前一個，微小漂移逐次累積。實測軌跡：自由格式 → 乾淨章節結構 →
> 600 字元的流水句 H1 + 一堵散文牆。**任何相鄰兩個看起來都「一致」**，累積結果面目全非。
> 凍結成絕對錨點才能止住這個棘輪效應。
>
> **這個模板強制的 2 條可讀性規則**：
> 1. **H1 是一行短句** —— 一個 scope 片語，不是一段話。完整描述放 **Summary** 區塊
> 2. **§0 Background 用小標題 + 換行**，不是一堵散文牆
>
> **模仿本檔的 STRUCTURE**（§0-9 + metadata 區塊）。phase 之間的差異用 **CONTENT** 表達
> （更多 stories / files / risks），**絕不用 STRUCTURE**（不加不改章節、不改 Day 數）。
> **複製時刪掉這整個 blockquote，但保留最上面的 frontmatter。**
>
> **frontmatter `status:` 是這個 phase 死活的唯一權威**（PROCESS R9）——
> 收尾時翻它，`python scripts/lint/check_status_markers.py` 會檢查。
> 下面那行 `**Status**:` 是**給人看的核准軌跡**（誰、何時、決策脈絡），
> 可以保留，但**粗粒度狀態必須與 frontmatter 一致**，否則 E2 會紅。

**Summary**: <2-5 句。這個 phase 交付什麼 · 關掉哪個 gap / AD · 關鍵範圍決策 ·
是否需要 drive-through（任何 user-facing surface 都要）· 是否需要 design note（僅 spike phase）。>

**Status**: <Draft / Approved-to-execute / Closed>（<誰核可 + 何時 + 決策軌跡>）
<!-- 收尾時這行與 frontmatter 一起翻。人看軌跡，機器看 frontmatter。 -->

**Branch**: `feature/W{NN}-<scope>`
**Base**: `main` HEAD `<sha>`（<那個 commit 是什麼>）
**Slice**: <關掉哪個 AD / 在哪個 arc 的第幾片（standalone 或 slice N/M）>
**Scope decisions**: <(a) … (b) … (c) — 關鍵設計選擇，用緊湊的字母清單>

---

## 0. Background

### The gap（<被關掉的 AD / carryover>）

<2-4 句或短 bullet：今天什麼壞了 / 缺了。**換行，不是一堵牆**。>

### Why it matters（缺失的能力）

<2-4 句：這個 gap 對使用者 / 維運的影響。>

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `<sha>`）| Anchor |
|-------|--------------------------------------------|--------|
| <什麼> | <現實> | `file:line` |

→ <1-2 句：從上表推導出「修正必須做什麼」。>

### The design（<一行形狀，例如「FE-only: 1 個型別欄位 + 1 個 store capture + tests」>）

```
# pseudo-code / 檔案層級的變更草圖
```

<選填：1 短段說明為何選這個設計而非替代方案。>

### Ground truth（recon head-start —— 於 `main` HEAD `<sha>` 讀過的 code）

- `file:line` — <plan 依賴的事實>

**Baselines（<前一個 phase> closeout）**: test <N> · lint <N> · type <N> · build <status> · coverage <N>%
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-<name>** — <要 grep / 驗證什麼> → <影響 / 移動哪一條 §Risks>

## 1. Phase Goal

<一段話：可測量的目標 + 它如何被證明（gates + 若 user-facing 則含 MANDATORY drive-through）。
註明是否產出 design note / ADR。>

## 2. User Stories

- **US-1**（<theme>）: 作為 <role>，我希望 <capability>，以便 <benefit>。
- **US-2**（<theme>）: …
- …（user-facing 時，通常倒數第二個 US = drive-through MANDATORY；最後一個 US = closeout。）

## 3. Technical Specifications

### 3.0 Architecture（<檔案變更形狀>）

```
# 檔案清單，依 EDIT / NEW / REGEN / UNTOUCHED 分組，每個一行用途說明
```

### 3.1 <area>（US-N）— `<file>`

<bullets：精確的改動 + 它模仿的既有錨點。>

### 3.x 明確不做的事

<誘人但這次不做的項目，讓 reviewer 知道你考慮過。>

### 3.y Validation（US-1..US-N）

Gates: <列出你的 gate：lint <N> · test <N> · build clean · run_all <N>/<N>>。
加上 §3.x 的 drive-through（user-facing 則 MANDATORY）。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `<path>` | NEW / EDIT / REGEN |
| — | `<你以為會改但不改的 path>` | **UNTOUCHED** |

## 5. Acceptance Criteria

1. <可測量、可測試的判準>
N. **Drive-through PASS（MANDATORY，真 UI + 真後端 + 真服務）** — <可觀察的結果>；
   截圖 + observed-vs-intended 記入 progress.md。（**不是** gate-only。）
   [僅當純後端 / 純 infra 且無人透過 UI 驅動時可省略]
N+1. <待辦> CLOSED；calibration 已記錄；導航檔 + BACKLOG 已更新。

## 6. Deliverables

- [ ] US-1 <deliverable>
- [ ] …（每個 US 一項）

## 7. Workload Calibration

- Scope class **`<class>` <mult>**（<理由；**Read 並引用 `docs/01-planning/CALIBRATION-MATRIX.md`**；
  註明是否為 NEW class / 第幾個資料點>）。
- **Agent-delegated: <yes / no / partial / TBD-Day-1-decision>**（<理由>）。
  `agent_factor` <值> → <三段式 / 四段式>。
- Bottom-up est ~X hr（<逐任務拆解>）→ class-calibrated commit ~Y hr (mult Z)
  [→ agent-adjusted ~Y' hr (agent_factor)]。Day-4 retro Q2 驗證。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| <risk> | <mitigation；適用時引用 `task-workflow.md` §Common Risk Classes A-E> |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- <項目> — <它去哪裡>
