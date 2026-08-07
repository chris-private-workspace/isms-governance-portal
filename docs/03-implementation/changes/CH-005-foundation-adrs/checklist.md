# CH-005 — Checklist

> 從 [`spec.md`](./spec.md) §Verification / Acceptance Criteria 導出。
> 🔴 **只能 `[ ]` -> `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

## 實作 — ADR 撰寫

- [x] **ADR-0001 — Backend language & framework**
  - DoD: `docs/14-adr/ADR-0001-backend-framework.md`；決定 = NestJS 10 + Prisma 7 + `@prisma/adapter-pg`，monorepo `apps/api` + `apps/web` + `packages/types`；§Options 含 Django / NestJS / Next.js-as-backend 三案；否決 Next.js 的理由引 `05:33` API-first 與三個下游消費者
  - Verify: 人工讀 —— 四個必備區塊 + 第五區塊 §Security & compliance impact 齊備

- [x] **ADR-0006 — Deployment & residency topology**
  - DoD: `docs/14-adr/ADR-0006-deployment-and-residency-topology.md`；決定 = per-region on Azure，China region 走 Azure China (21Vianet)，`cross_border_max_tier` 保守預設；§Consequences 明記「旗艦矩陣覆蓋 13/14 OpCo」並要求向 stakeholder 表面化（`03:137`）
  - Verify: 人工讀 —— 三個法律答案共用同一拓撲的論證有引 `03:133`

- [x] **ADR-0007 — Identity provider**
  - DoD: `docs/14-adr/ADR-0007-identity-provider.md`；決定 = Microsoft Entra ID；§Consequences 明載推翻設計交付物 Okta 的偏離與依據
  - Verify: 人工讀 —— 偏離有寫，未默默套用

- [x] **A2 — 每份 ADR §Options ≥ 2**
  - DoD: 三份都有至少兩個真實選項（`0000-TEMPLATE.md:38`：只有一個代表這不是決策）
  - Verify: `rg -c '^\| \*\*[A-Z]\*\*' docs/14-adr/000[167]*.md` → **4 / 3 / 3**
  - ⚠️ 原指令有兩處錯：檔名無 `ADR-` 前綴（見 `14-adr/README.md` §索引下的慣例註）、且字元類 `[A-C]` 漏掉 ADR-0001 的第 4 個選項 D

- [x] **A3 — 每份 ADR §可證偽條件非空**
  - DoD: 各自寫出「什麼觀察結果會推翻這個決定」，不是空話
  - Verify: 人工讀 —— ADR-0001 的必須涵蓋「Prisma extension 若無法同時滿足 guardrail 4 + 5」

## 索引與追蹤同步

- [x] **A4 — `docs/14-adr/README.md`**
  - DoD: §索引 加三行；§尚待撰寫 移除 0001 / 0006 / 0007 三列
  - Verify: `python scripts/lint/run_all.py`

- [x] **A5 — `docs/decision-form.md`（R4）**
  - DoD: OQ-1 / OQ-2 / OQ-5 從 §開放中 移到 §已拍板，帶 ADR 編號與拍板日
  - Verify: 開放中剩 5 列（OQ-3 / 4 / 6 / 7 / 8）

- [x] **A7 — `15-design-alignment.md` 記錄 Okta → Entra ID 偏離**
  - DoD: 加一行，形式比照該檔既有的已核可偏離
  - Verify: 人工讀

## 導航檔更新

- [x] **A6 — `CLAUDE.md` 四處**
  - DoD: ①§Project Status Tech Stack 欄 ②§Scopes 八個 `⚠️ 待 ADR-0001` 目錄欄 ③§Development Commands ④§Services/Ports
  - Verify: `grep -c '待 ADR-0001' CLAUDE.md` → 0
  - 🔴 只改導航層，**不得寫入 phase 歷史紀錄**（`task-workflow.md` §Closeout Minimal Touch）

- [x] **BACKLOG 同步（R7）**
  - DoD: spec §相關 的三條待辦進 §Open Carryover ADs
  - Verify: 人工讀

## 驗收

- [x] **A8 — `python scripts/lint/run_all.py` → 5/5**
  - Verify: `python scripts/lint/run_all.py`

- [x] **`python scripts/lint/check_status_markers.py`（R9）**
  - DoD: CH-005 是本專案第一份資料夾三件套 pre-doc —— 這個 detector 首次有東西可掃，必須通過
  - Verify: `python scripts/lint/check_status_markers.py`

## Drive-through

- [x] **N/A — 無 user-facing surface**
  - 報告一律寫「gate-only verified」，不可暗示可用性（`verification-discipline.md` §適用範圍）

## 收尾

- [x] `progress.md` 寫完成摘要，`spec.md` frontmatter `status:` → `done`（R9）
- [x] BACKLOG 同步（R7）
- [x] 架構級決定有 ADR（R5）—— 本 CH 的產出即是
