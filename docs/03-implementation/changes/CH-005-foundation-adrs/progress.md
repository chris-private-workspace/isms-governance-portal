# CH-005 — Progress

**Status**: done
**Spec**: [`spec.md`](./spec.md) · **Checklist**: [`checklist.md`](./checklist.md)

---

## 2026-08-07

### 做了什麼

- 盤點 `docs/02-architecture/` 全部 27 份檔案 + `14-adr/` + `decision-form.md` + `BACKLOG.md`，
  確認「架構設計完整、技術選型刻意留白」的雙層結構
- 確認 **ADR-0006 不需要 Legal 輸入即可拍板** —— CH-001 已把 residency 從管轄區屬性改成欄位級規則，
  `03:133` 的三種法律答案落在同一個拓撲上，差別只在 allowlist 設定值
- 掃描三個既有專案（`gh api`），取得實際技術棧 —— 見下方 §意外
- 使用者拍板三項：後端 NestJS + Prisma · 雲 Azure · CH 範圍三份 ADR
- 建立 CH-005 三件套

### 意外 / 卡住

**1. 原本建議「一次拍 6 份 ADR」，違反 rolling discipline —— 已修正為 3 份。**
使用者提問「開發流程是否滾動式」時查證才發現。根因是兩條規則的交界未定義：
`14-adr/README.md:31`「ADR 可無實作先寫」vs CLAUDE.md「禁止預寫規劃文件」，
仲裁答案只在 `memory/feedback_doc_growth_follows_runtime.md:45`（非 always-loaded）。
→ 已記為 `AD-RuleBoundary-1`（BACKLOG），依強度階梯**不升級為規則**（第 1 次違反）。

**2. 原本斷言「Prisma 的 RLS 支援弱，要用 NestJS 就得換 Drizzle/Kysely」—— 判斷過於武斷。**
看到既有專案（Prisma 6 / Prisma 7 + `@prisma/adapter-pg`）之後重新檢視：
`$transaction` + `set_config(…, true)` 可行，包成 client extension 後還同時成為
guardrail 5 要的單一寫入攔截點。**歸因錯誤** —— 我用一個 ORM 的限制去否定整個語言生態。

**3. 三個既有專案的技術棧，四層已統一、一層未統一。**

| | repo1 ai-enterprise-knowledge | repo2 unified-operation-platform | repo3 ai-document-extraction |
|---|---|---|---|
| 形狀 | `backend/` + `frontend/` | **monorepo** `apps/api` + `apps/web` | Next.js 全端 |
| 後端 | FastAPI (Py 3.12) | **NestJS 10** + swagger | Next.js route handlers |
| ORM | psycopg3（無 ORM） | Prisma 6 | Prisma 7 + `adapter-pg` |
| 前端 | Next.js + Tailwind + shadcn | `apps/web` | Next.js 15 + Tailwind + shadcn |
| IdP | Entra ID | Entra ID | next-auth v5 |
| 雲 | Azure | Azure | Azure |

→ 已統一：**Next.js+Tailwind+shadcn · PostgreSQL · Entra ID · Azure**。未統一：僅後端框架。
這使 ADR-0001 從抽象取捨收窄成「要不要收斂到既有的那一個」。

**4. 兩個五個 detector 都抓不到的缺陷**（→ BACKLOG，非本 CH 範圍）：

- `mockup-fidelity.md:38` 紅線 7 要求 `oklch(var(--token))`，但本專案 token 是 HEX
  (`styles/tokens.css:24`)。`oklch(#2A5BD7)` 是無效 CSS 且**靜默失效**
- `docs/02-architecture/README.md` §核心設計文件 仍是未填模板，列的檔名全部不存在。
  `check_doc_links` / `check_path_references` 都過 —— 因為那些是純表格文字，不是連結

**5. `CLAUDE.md` 開頭宣告的 byte 預算是錯的 —— 24,000，detector 實際是 30,000。**
發現於同步後的驗證：檔案 28,570 bytes「超標 19%」但 `rules-hygiene` 仍 PASS。查
`check_rules_hygiene.py:83-97` 才看到本專案專屬的 §PROJECT DEVIATION 註記（2026-08-07 上調，
理由是 9 條 guardrails + 15 項參數屬穩定領域約束，且繁體中文 UTF-8 佔 3 bytes/字元）。
已修 CLAUDE.md 那一行。**這是第五個「導航檔說一套、機械檢查做另一套」的發現。**

### 收尾（同日完成）

- 三份 ADR 撰寫完成（0001 → 0006 → 0007，依相依順序）
- 五項同步全部完成（A4 索引 · A5 OQ 遷移 · A6 CLAUDE.md 四處 · A7 偏離記錄 · BACKLOG）

---

## 完成摘要（收尾時填）

**實際 vs spec**：範圍未偏離。**兩處超出 spec 所寫的**，兩者都是 spec 起草時未知的：
(a) A6 實際動了 `CLAUDE.md` **六**處而非四處 —— 多了 §Documentation Layout 的 `14-adr` 行
（原寫「9 份全部未寫」，不改就是導航檔說謊）與檔頭的 byte 預算數字；
(b) checklist 的 A2 verify 指令自身有兩個錯（檔名前綴、字元類漏 D），已在 checklist 內就地更正。

**Acceptance 逐條**：

| # | 條件 | 結果 | 證據 |
|---|---|---|---|
| A1 | 三份 ADR + 第五區塊 | **PASS** | `0001` 125 行 · `0006` 111 行 · `0007` 111 行；三份皆有 §Security & compliance impact |
| A2 | §Options ≥ 2 | **PASS** | `rg -c '^\| \*\*[A-Z]\*\*'` → **4 / 3 / 3** |
| A3 | §可證偽條件非空 | **PASS** | 三份皆 `heading=1`；編號條目 3 / 5 / 3（0006 含 §Decision 的 2 點） |
| A4 | `14-adr/README.md` 索引 | **PASS** | 索引 3 列；§尚待撰寫 由 9 列降為 **6** 列 |
| A5 | `decision-form.md` OQ 遷移 | **PASS** | 開放中 **5** 列（OQ-3/4/6/7/8）· 已拍板 **3** 列 |
| A6 | `CLAUDE.md` 四處 | **PASS（實際 6 處）** | 殘留佔位檢查 `待 ADR-0001\|<lint 指令>\|<test 指令>\|全部未寫` → **0 命中** |
| A7 | Okta→Entra ID 偏離記錄 | **PASS** | `15` §8.6 RESOLVED 區塊 ×1 + §5.4 更新 |
| A8 | `run_all` 5/5 | **PASS** | `run_all: 5/5 passed`, EXIT=0（末次執行含全部同步） |

**Drive-through**：N/A（純文件）— 報告寫 **gate-only verified**

**留下的 carryover**（→ BACKLOG）：

- `AD-CssToken-1` 🟡 P1 — `mockup-fidelity.md:38` 的 oklch 紅線在本專案是錯的，**W01 前端第一頁前必修**
- `AD-DocIndex-1` 🟢 P2 — `02-architecture/README.md` 索引仍是未填模板
- `AD-Decider-1` 🟡 P1 — Legal 四問無接觸途徑；旗艦矩陣鎖在 13/14 OpCo
- ⚠️ **`CLAUDE.md` headroom 只剩 1,340 bytes（95.5%）** —— 下一次同等規模的導航更新就會撞牆。
  依 `check_rules_hygiene.py:94` 的指示，屆時**正確作法是把內容移到 on-demand，不是再調高預算**
