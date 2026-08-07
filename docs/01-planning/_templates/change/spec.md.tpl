---
status: proposed   # proposed | approved | active | done | cancelled —— 機器可讀的唯一權威
affects_components: []   # 影響哪些 component（見 docs/02-architecture/COMPONENT_CATALOG.md）
---

# CH-NNN — <變更簡短描述>

> **用於**：功能新增 / 行為變更。位置 `docs/03-implementation/changes/CH-NNN-<slug>/spec.md`
> 編號單調遞增 —— 先查：`ls docs/03-implementation/changes/ | sort -V | tail -1`
>
> **與 BUG 的差別**：BUG 回答「什麼壞了」，CHANGE 回答「**為什麼這樣設計**」。
> §Solution 裡的**決策理由**是這份文件的核心價值 —— 三個月後有人問「為什麼不用 X」，答案在這。
>
> **這是「完整形式」**（跨天追蹤 / 需獨立 pre-doc gate）。當天收得掉的、
> 或 phase Day 4 收尾產出的記錄，改用單檔 1-page：`../record.md.tpl`。
> 判準見 `docs/01-planning/PROCESS.md` §3.3。骨幹相同，差別只在這份多了逐項決策欄位。
>
> 複製時刪掉這個 blockquote，**但保留最上面的 frontmatter** ——
> `status:` 是這個 CH 死活的唯一權威（PROCESS R9），
> `python scripts/lint/check_status_markers.py` 會檢查。
> 下面那行 `**Status**` 是給人看的核准軌跡，粗粒度必須與 frontmatter 一致。

**Date**: YYYY-MM-DD
**Phase**: W{NN}
**Scope**: <範疇> — <變更形狀，例如「backend + FE（NO migration / NO 新依賴）」>
**Status**: <提案中 / 已核准 / 進行中 / 已完成>（<誰核可 + 何時>）
**PR**: #N

---

## Problem

<這個變更解決什麼。若是關掉某個 AD / 缺口，說明那個缺口的來源與嚴重性。>

<若有量化證據（掃描結果、grep 命中數、審計結論），放這裡 —— 具體數字讓後人知道問題有多大。>

---

## Root Cause

<為什麼會有這個缺口。**不是「還沒做」** —— 而是「為什麼當初的設計會留下這個洞」。>

<含 `file:line` 錨點。>

---

## Solution

### 範圍決策

<若這次的範圍是經過選擇的（尤其是使用者拍板的），寫下來：選了什麼、放棄了什麼。>

### 逐項變更

**1. <變更名>** (`<file>`) — <做了什麼 + **為什麼這樣做而不是另一種做法**>

**2. <變更名>** (`<file>`) — <同上>

### ⭐ 關鍵設計細節

<那些「看起來是小事、其實會壞事」的地方。這一節是這份文件最值錢的部分。>

- **<細節>**：<為什麼它是 load-bearing 的 —— 拿掉會發生什麼>

### 明確不做的

<誘人但這次不做的，以及去向（AD / 下個 slice）。>

---

## Verification

### Gate

<lint / typecheck / test / build 的實際數字，含 baseline 對照>

`<TYPECHECK>` <N> · `run_all` <N>/<N> · test <N> passed（baseline <M> → **+<D>**）· build clean

### 新增測試

- `<test file>`（<N> 個）：<各測什麼 —— 特別標出**負面測試**：關掉會壞什麼>

### Drive-through（user-facing 時 MANDATORY）

<分段記錄，每段一個可觀察的結果：>

- **Leg 1** — <做了什麼> → <觀察到什麼>
- **Leg 2** — <做了什麼> → <觀察到什麼>

**截圖**: `docs/01-planning/W{NN}-{slug}/artifacts/<name>.png`

**Verdict**: ✅ DRIVE-THROUGH PASS / ⚪ N/A（純後端 —— **gate-only verified**）

### ⚠️ Drive-through 抓到而 gate 沒抓到的

<若 drive-through 發現了 gate 全綠卻仍然壞掉的東西，**一定要寫在這裡**。
這是這套流程存在的理由的直接證據，也是最有教育價值的部分。>

<沒有的話寫「無 —— gate 與 drive-through 結論一致」。>

---

## Impact

- **Breaking change**: yes / no
- **Migration required**: yes / no（若 yes：<migration 編號 + 是否可逆>）
- **Config change**: <新增 / 變更的環境變數 + 預設值>
- **重啟需求**: <是否需要重啟才生效 —— startup-only 的 wiring 要特別標>
- **Rollback**: <怎麼回滾 + 估時>

---

## 相關

- **關掉的 AD**: `AD-<Topic>-<N>`
- **產生的待辦**（→ `docs/01-planning/BACKLOG.md`）
- **Design note**: `docs/02-architecture/design-notes/NN-<topic>-design.md`（spike 才有）
- **Phase**: plan / checklist / progress / retrospective 連結
