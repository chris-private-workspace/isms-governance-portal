# Phase W{NN} — Checklist (<short scope phrase — 一行，不是一段>)

> **FROZEN canonical phase-checklist template.** 每個新 checklist 對照的**絕對錨點** ——
> **不是**最近一個 phase 的 checklist。漂移理由見 `plan.md.tpl`。
>
> **Rules**：
> 1. 標題行**短** —— 完整描述住在 plan 的 **Summary**，不在這裡重複
> 2. Day 0-4 結構（5 天）
> 3. 每個任務：**粗體 deliverable + DoD + Verify 指令**
> 4. **不放時間估算**（`(Estimated X hr)` / `(Y min)` 一律禁止）——
>    每日實際值進 progress.md；phase 聚合校準在 plan §7
> 5. **只能 `[ ]`→`[x]`；永不刪除未勾選項**（要標就標 `🚧 阻塞: <reason>`）
>
> 範圍差異用 **CONTENT** 表達（某個 Day 裡更多 checkbox），**絕不用 STRUCTURE**（不加 Day 5）。
> **複製時刪掉這整個 blockquote。**

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `<sha>`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [ ] **Prong 1 — path verify**：所有編輯目標存在如預期（NEW 檔不存在；EDIT 檔存在）；
      `CH-NNN` 編號未被佔用（`ls docs/03-implementation/changes/ | sort -V | tail -1`）
- [ ] **Prong 2 — content verify**（drift → progress.md）：
  - [ ] **D-<name>** — <grep / read 驗證某個 plan 宣稱>
- [ ] **Prong 2.5 — child component tree**（僅前端頁面 phase；否則 N/A）
- [ ] **Prong 3 — schema verify**：<grep 新表 / migration / 欄位 —— 無 DB 則 N/A>
- [ ] **D-baselines** — test <N> · lint <N> · type <N> · build <status> · coverage <N>%
- [ ] **Catalog drift** — progress.md Day-0 表格
- [ ] **Go/no-go** — <範圍變動 % → 繼續 / 修訂 / 中止>

### 0.2 Branch

- [ ] `git checkout -b feature/W{NN}-<scope>`（從 `main` `<sha>`）

---

## Day 1 — <theme> (US-…)

### 1.1 <task>

- [ ] **<deliverable>**
  - DoD: <可測量的完成定義>
  - Verify: `<指令>`

### 1.x <partial gate>

- [ ] <與今日工作相關的 lint / build / typecheck>

---

## Day 2 — <theme> (US-…)

### 2.1 <task>

- [ ] **<deliverable>**
  - DoD: <…>
  - Verify: `<指令>`

### 2.x Full gate

- [ ] <列出你的 gate：lint <N> · test <N> · build clean · run_all <N>/<N>>

---

## Day 3 — Drive-through (US-…) — 真 UI + 真後端 + 真服務

_(任何 user-facing surface 都 MANDATORY；純後端 / 純 infra phase 改成對應的整合驗證，
並**明確寫「gate-only verified」** —— 絕不暗示可用性。)_

### 3.1 Clean restart

- [ ] <殺掉陳舊的 dev server / 孤兒 worker；確認新程序是該 port 的唯一擁有者 + startup log；
      或 FE-only → 重建前端，後端不動>（見 `task-workflow.md` §Risk Class C）

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [ ] <用真實服務觸發功能的主路徑>
- [ ] **逐控件走查**：可點 / 有效果 / 標籤真實 / 結果真的渲染
- [ ] 截圖 + observed-vs-intended → progress.md Day 3

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-NNN-<slug>.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含 drive-through PASS + 關掉的 AD）
      [+ design note if spike —— 8-point gate]

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`<class>` <mult>，第 N 個資料點；
      ratio 出 band 就標記 re-point）
- [ ] `calibration-matrix.md` 那一行 —— 填這個骨架，**≤ 1 行 ~250 字元**
      （lint 上限 400；完整敘述 → `calibration-log.md`）：
      `| \`<class>\` | <mult> | <mean> | KEEP/re-point (<phase> ratio ~<Y> IN/OVER band; <一子句>; if 2nd >1.20 → <Z>; → calibration-log) |`
- [ ] Final gate sweep: <列出你的 gate：lint <N> · test <N> · build clean · run_all <N>/<N>>
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（CLOSE 掉該項）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
