# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **這是 always-loaded 檔案** —— 每個 session 自動進 context。它是**導航 + 原則**，不是檔案庫。
> 任何「某個 phase 做了什麼」的紀錄都不屬於這裡（見 `.claude/rules/task-workflow.md` §Phase Closeout）。
> Size budget 由 `scripts/lint/check_rules_hygiene.py` 機械強制（**30,000 bytes** ——
> 本專案已自模板的 24,000 上調，理由見該檔 §PROJECT DEVIATION）。

---

## ⚠️ 每次 session 必讀順序

1. **本檔案**（CLAUDE.md）— 高層導航 + 不可再議的專案參數 + 9 條 guardrails
2. **`.claude/rules/`** 5 條 always-loaded 規則（已自動在 context 中，不需另外 Read）
3. **[`docs/01-planning/PROCESS.md`](./docs/01-planning/PROCESS.md)** ⭐ — **三軌工作流**：動手前先分類
4. **[`docs/INFORMATION-FLOW.md`](./docs/INFORMATION-FLOW.md)** ⭐ — **開發時讀什麼 / 產生什麼 / 更新什麼**
5. **[`docs/02-architecture/00-project-charter.md`](./docs/02-architecture/00-project-charter.md)** — 專案憲章
6. **`MEMORY.md`** — 記憶索引（跨 session 累積的教訓與專案狀態）

> **權威排序**：`docs/02-architecture/` 設計文件 > 本 CLAUDE.md > `.claude/rules/` > 既有代碼。
> 衝突時以上位者為準。**唯一例外**：下方 §不可協商的 guardrails 高於一切 ——
> 設計文件若與 guardrail 衝突，是設計文件要改。

### 🔴 動手之前：先分類任務

**沒有對應的 pre-doc，不可以開始寫 code**（PROCESS R1）。

```
任務進來
  ├─ 符合 active phase plan 的 deliverable？  → Phase 軌  docs/01-planning/W{NN}-*/
  ├─ 改現有行為 或 既定設計（非 bug）< 3 天？ → Change 軌 docs/03-implementation/changes/CH-NNN-*
  ├─ 修壞掉 / 不正確的行為？                  → Bug 軌    docs/03-implementation/bugs/BUG-NNN-*
  ├─ 純稽核 / 分析？ 產出就是一份 ADR？       → 不走軌 —— 直接寫報告 / 寫 ADR
  └─ trivial（typo / 單行 / < 30 分鐘）？     → 直接 commit
```

**既定設計** = 已 approve 且約束後續工作的（設計文件 / **已採納**的 ADR / 規格）；起草中的不算。

判斷完**先向使用者確認軌別**，再開對應文件（plan+checklist / spec / report），才動 code。
完整決策樹、lifecycle、binding rules R1-R9：[`docs/01-planning/PROCESS.md`](./docs/01-planning/PROCESS.md)。

---

## Core Vision & Design Philosophy

### Mission

為集團的區域 IT 辦公室建立**內部自建的 APAC ISMS 治理平台**（ISO/IEC 27001 + 27017），
服務 11 個管轄區的 13 家 OpCo。旗艦能力是**跨實體滾升儀表板** ——
讓區域 ISO 一眼看見所有 OpCo 的 ISMS 現況，而不是每季用 Excel 收集。

不是通用 GRC 套件。**ISMS 是組織主軸**，平台數位化公司**既有的表單與程序**，不是另造一套模型。

### Design Principles

1. **Foundation-first** — 共用骨幹先於功能模組。自建 GRC 最常見的死法，是一堆各自定義
   「風險」「控制」「負責人」的表單模組。
2. **Canonical core, governed local extensions** — 在地差異走受治理的擴充，不走分叉。
3. **Entity-scoped by default** — 每筆記錄都有所屬實體，存取預設依此過濾；滾升是加法。
4. **Evidence-grade by construction** — 稽核軌跡是寫入路徑的一部分，不是事後加的功能。
5. **Deployment-portable** — 雲端／地端／主權隔離都要能跑；ADR-0010 選了單一區域，但不得焊死在 Azure 上。
6. **Build to the procedure, not the mockup** — 交付物對 UI 有權威性，領域邏輯以公司程序為準。

### Development Philosophy

- 商業平台（ServiceNow / Archer / MetricStream / OpenPages / LogicGate）是**標竿與參考架構**，永遠不是相依。
- 先做能跑的薄切片再抽象；不預先設計未被驗證的彈性。
- **文檔成長跟隨已驗證的 runtime** —— 禁止因 gap analysis 就預寫一批規劃文件。
- 使用者出構想與領域判斷，AI 助手執行協調與實作。

---

## Project Status

| Attribute | Value |
|-----------|-------|
| **Stage** | Wave 1 backbone — 建立共用骨幹，並用 Policy + Risk/Control 兩個最小模組端到端證明它 |
| **Current Phase** | **W12 MERGED**（PR #58, `ea58fdb`）`closed` — M3 spike：`audit_log` + 應用層攔截點 + `verifyChain`，**ADR-0003 拍板**（OQ-4 關閉）。⭐ 決定**不靠成本** —— 序列下 A/B 量不出差別，併發下 A 貴 1.6 倍**仍選 A**：分勝負的是斷點定位與誰算 hash。⛔ **覆蓋 1/21 —— 機制在、覆蓋不在**（R4 🟡 partial）。元驗證 **4/4**。**21/35 實體**（機械導出）|
| **History** | See [`MEMORY.md`](./MEMORY.md) + 各 phase 的 `retrospective.md` |  <!-- doc-links: ignore — MEMORY.md 由 bootstrap 複製到專案根 -->
| **Pending / Next** | See [`docs/01-planning/BACKLOG.md`](./docs/01-planning/BACKLOG.md)（**有什麼**）· [`ROADMAP.md`](./docs/01-planning/ROADMAP.md)（**先做哪個**）|
| **跨來源狀態** | See [`docs/01-planning/STATUS_AUDIT.md`](./docs/01-planning/STATUS_AUDIT.md) —— 問「現在全項目怎樣」時跑 `/status-audit`，**不要只讀 BACKLOG** |
| **Open questions** | See [`docs/decision-form.md`](./docs/decision-form.md) |
| **Tech Stack** | **NestJS 11 + Prisma 7 · PostgreSQL 18 · Next.js 16 · Entra ID · Azure Container Apps（單一區域 × 3 環境）** —— ADR-0001 / **0003** / 0004 / 0005 / 0007 / 0010–0014 已採納（**0010 取代 0006**）。ADR-0001 決定的是**框架不是版本**；W01 實裝當前主版本（ADR 內文未改）。**Tailwind 尚未安裝** —— 隨設計交付物 port 一併進來。ADR-0002 待 spike，0008/0009 待 Wave 3，見 [`docs/14-adr/README.md`](./docs/14-adr/README.md) |
| **Main Branch** | `main` |
| **Branch Protection** | PR required · **review_count=0**（單人開發 —— 沒有 reviewer）· no force-push · no deletions · linear history · enforce_admins。 補償機制：PR 開著睡一晚，隔天用 reviewer 的心態重讀一次。 |

> **Current Phase 這一格只能有一行。** 不要累積 `Prev Phase` 列 ——
> 那是導致導航檔膨脹的頭號原因。細節單一來源在 `W{NN}-*/retrospective.md` + `memory/`。

---

## 已確認參數（未經明確指示不得再議）

詳細理由在 [`docs/02-architecture/00-project-charter.md`](./docs/02-architecture/00-project-charter.md)；
本表是 always-loaded 的**防再議清單**。

「`NN`」= `docs/02-architecture/NN-*.md`。

| # | 參數 | 定案 | 權威 |
|---|------|------|------|
| 1 | 建置模式 | **內部自建**。商業平台僅為標竿／參考架構，絕非相依 | `00` D1 |
| 2 | 租戶模型 | 多實體、多管轄、單一集團。**不是對外多租戶 SaaS** —— 組織階層 + 實體範疇存取 | `00` D2 · `03` |
| 3 | 排序 | **Foundation-first**。分類法第一天就要容納 IT 資產／供應商／資料流 | `00` D4 |
| 4 | 管轄區 | NE + SE Asia + Oceania；**印度與中國均排除** → **13 OpCo / 11 管轄區**，無硬性在地化要求 → 單一區域（ADR-0010）| `00` D6 |
| 5 | 主驅動力 | 內部治理與可視性；**滾升儀表板是旗艦**，Wave 1 不提前拉合規／事件模組 | `00` D7 |
| 6 | 目標使用者 | 完整三道防線 + 管理層；內部稽核延 Wave 2；**第一線 UX 要輕**（RCSA）| `00` D8 |
| 7 | 風險評分 | `Likelihood(1–5) × MAX(FIN,BOP,LRY,REP,SIS)` = 1–25；控制前後各評；**≥16 需處理**，殘餘 ≥16 進 IT Risk Register；per-entity 校準只能改設定 | `02a` |
| 8 | 評估方法 | **資產基礎**（資產群組→資產→威脅→弱點→CIA）。Asset/Threat/Vulnerability 三庫是 **Wave 1**。SoA 為必要產出 | `02a` |
| 9 | 表單來源 | 數位化**公司既有範本**；設計表單／工作流**照來源文件**，不得自行發明欄位 | `11`–`13` |
| 10 | 產品定位 | **APAC ISMS Governance Platform**（27001 + 27017），非通用 GRC 套件 | `00` D11 |
| 11 | 設計交付物 | 對 **UI 有權威性**；領域邏輯**以程序為準不以 mockup 為準**（風險表單單一 impact 值） | `15` |
| 12 | 範圍規模 | **13 OpCo / 11 管轄區**；日本是 HQ 非 OpCo；忽略交付物中的印度／DPDP 樣本 | `15` §1 |
| 13 | 權限模型 | **六角色 × 十一模組**，在**導航／路由／動作**三層強制 + 實體範疇疊加，**伺服器端**，**含 agent 檢索** | `15` |
| 14 | 自建路徑 | build-vs-buy 曾建議不要自建；stakeholder **知情下確認**。其風險現為設計約束 | `00` D10 |
| 15 | Wave 2 | frameworks-first + 範圍紀律 + AI 輔助變更解析；內容訂閱**延後**（建介面不填充）；稽核輕量；控制測試手動 + 證據 | `10` |

---

## 🛑 不可協商的 guardrails

**這些是硬約束。若一項請求會違反其中任何一條，停下來提出，不要逕行執行。**

1. **平台本身不得成為風險來源。** 這是一套安全／風險系統，必須是典範。每個設計與程式決策都要能
   通過這套平台自己要強制的控制項的檢驗。有疑慮時選更安全、更可稽核的那個選項（`04`）。
2. **自我治理（"Entity Zero"）。** 平台以資產身分登記在它自己的系統內，受自己的政策、控制、
   風險評估與稽核軌跡約束，並且要能用自己的能力證明自身合規（ISO 27001、SOC 2）。
3. **核心資料模型是神聖的。** 維持*canonical core + governed local extensions*。每筆記錄有穩定唯一 ID、
   所屬組織實體（供範疇化與滾升）、完整版本歷史、軟刪除，且納入稽核軌跡。
   **不得讓個別模組自行發明共用實體（risk / control / obligation / issue / owner）的私有定義**（`02`）。
4. **一切都是 entity-scoped。** 資料存取預設依組織實體過濾（**優先用資料庫層 row-level security，
   不能只靠應用層檢查**）。區域滾升是疊加在其上的加法。
5. **不可篡改、證據等級的稽核軌跡。** 所有狀態變更寫入 append-only、防篡改的日誌。
   稽核人員必須能信任它；平台必須能證明自己日誌的完整性。
6. **最小權限與職責分離。** Entity-scoped RBAC（必要處加屬性規則）。
   用權限強制三道防線分離與稽核獨立性。
7. **Secure SDLC。** 原始碼中無密鑰。CI 內含相依、靜態、動態掃描（SCA/SAST/DAST）。產出 SBOM。
   簽署建置產物。IaC 也要掃描。
   **每個 story 必須通過 [`docs/02-architecture/16-secure-development-dod.md`](./docs/02-architecture/16-secure-development-dod.md)
   的 28 點 secure-development DoD**（源自公司自身的 Qualys/Rapid7 掃描結果）。
   修復要**對照 `reference/Secure-Dev-DoD-Checklist.xlsx` 的 findings register 驗證，而非宣稱**。
   兩條最容易不小心違反的：**絕不把憑證、token 或個資放進 localStorage/sessionStorage**；
   **絕不產生含 checksum 有效卡號或真實個資的種子／示範資料**。
   TLS 憑證、安全標頭、管理埠**不得沿用平台預設值** —— 要明確設定。
8. **隱私 by design。** 資料最小化與目的限制是**架構層關注點，不是事後補丁**。
   ⚠️ **在地化能力不建** —— 中國移出後無在範圍內的管轄區要求它（ADR-0010），建了就是 AP-5。
9. **語言。** 程式碼／註解／技術文件用**英文**；任何終端使用者可見文字與 UI copy 用**繁體中文**。

> ⚠️ `reference/` 與 `docs/reference/`（公司程序、掃描衍生指引、授權 ISO 標準）  <!-- path-check: ignore — 刻意不在版控中；CI checkout 後不存在 -->
> **刻意排除於版控之外**，只存在本機磁碟。不要把它們加回 git。

---

## Architecture & Scope Boundaries

### 分層

由上而下 7 層：`Presentation → Application/Modules → Workflow & Rules →` **`CORE DATA MODEL`** `→
Integration → Data & Analytics → Infrastructure`，security-by-design 橫切每一層。

**關鍵不變式**：上層可依賴下層，**下層絕不 import 上層**；核心資料模型層不依賴任何模組；
稽核與 entity-scoping 是橫切關注點，不是某層的私有功能。

> 完整分層圖與各層職責：[`docs/02-architecture/01-architecture-overview.md`](./docs/02-architecture/01-architecture-overview.md)
> —— 本節只留指標，不複製圖。

### 範疇（Scopes）

任何程式碼必須明確歸屬於下列範疇之一。**禁止跨範疇雜湊**。

| # | 範疇 | 目錄 | 職責 |
|---|------|------|------|
| 1 | `core-model` | `apps/api/src/core-model/` | 實體圖：risk / control / obligation / policy / process / asset / entity / event / issue / evidence。canonical core + governed extensions |
| 2 | `entity-scope` | `apps/api/src/entity-scope/` | 組織階層、entity scoping / RLS、管轄區標記 |
| 3 | `identity` | `apps/api/src/identity/` | 認證（SSO/MFA）、entity-scoped 授權、三道防線分離、SoD |
| 4 | `workflow` | `apps/api/src/workflow/` | 可設定狀態機、簽核、SLA、升級 |
| 5 | `audit-trail` | `apps/api/src/audit-trail/` | Append-only、防篡改、證據等級日誌 |
| 6 | `api` | `apps/api/src/contracts/` · `packages/types/` | API-first 契約層；連接器框架（後續 wave 填充）|
| 7 | `modules` | `apps/api/src/modules/` | Wave 1 兩個證明模組：Policy Management、Risk + Control registers |
| 8 | `ui` | `apps/web/` | 角色式 UI、滾升儀表板；消費設計交付物的 tokens 與 class 名 |

> 目錄由 **ADR-0001**（NestJS monorepo）導出：每個範疇 = 一個 NestJS module，
> 邊界由 `eslint-plugin-boundaries` **機械強制**而非 review 慣例 ——
> `eslint.config.mjs` 的 policies 預設 disallow，違規時 lint 失敗並指名兩個範疇。
> ⚠️ **八個目錄目前只有 `.gitkeep`，刻意不建空 module**（空 module 對「關掉會壞什麼」答不出來 = AP-3）。
> 跨範疇 import 規則：`docs/rules-on-demand/scope-boundaries.md`（需要時 Read）。

---

## 核心約束（必守）

> 下列 8 條是**工程紀律**約束，與上方 9 條 guardrails 並存。
> guardrails 談的是「這個平台必須是什麼」，本節談的是「怎麼做才不會做壞」。衝突時 guardrails 優先。

### 約束 1：單一範疇歸屬原則

任何代碼必須明確歸屬於上表某一個範疇。無法歸屬 = 設計有問題，先釐清再寫。

### 約束 2：主流量驗證原則

任何功能必須能在**真實主流量**中驗證（使用者實際會走的路徑，不是測試專用入口）。
**禁止 Potemkin Feature** —— 結構在、接口完整、但沒有實際邏輯。

### 約束 3：Drive-Through 才算 Done ⭐⭐⭐

Gate 全綠只證明「零件對」；curl 通過只證明「API 會回應」。**兩者都不證明「人能真的用」**。

任何 user-facing 功能標 done 前，必須實際開真 UI + 真後端走完主路徑。
詳見 `.claude/rules/verification-discipline.md`（always-loaded）。

### 約束 4：Anti-Pattern 檢查原則

每個 PR 必須通過 `.claude/rules/anti-patterns-checklist.md` 全部檢查項。

### 約束 5：測試優先原則

- 單元測試覆蓋率 ≥ 80%
- 整合測試覆蓋率 ≥ 60%
- 端到端閉環測試 ≥ 1 個關鍵案例

### 約束 6：設計保真度 ⭐⭐⭐

**本專案有高保真設計交付物，本條生效。**

實作與 mockup 任一項不對齊（layout / spacing / typography / color / interaction / responsive / a11y）
→ **STOP and ask**，絕不自行 approximate。

- **CSS 是「複製」不是「重寫」** —— 交付物的 `styles/*.css` 逐字複製進生產 repo，組件消費它的 class 名
- **不做色彩空間轉換**（`oklch → HSL` 之類）—— 那是自找的有損步驟
- **只重寫組件邏輯層**（資料來源 / 模組系統 / type），視覺原封不動

交付物位置：[`docs/06-reference/design_handoff_isms_grc_platform/`](./docs/06-reference/design_handoff_isms_grc_platform/README.md)
方法論：[`docs/06-reference/mockup-to-production-frontend-playbook.md`](./docs/06-reference/mockup-to-production-frontend-playbook.md)
紅線與 DoD：`docs/rules-on-demand/mockup-fidelity.md`（寫第一頁前 Read）

> ⚠️ **保真度的例外由 `15-design-alignment.md` 單一來源管理** ——
> 設計簡化了領域邏輯處（如風險表單的單一 impact 值），**以程序為準**。
> 那不是「自行 approximate」，那是有記錄的、已核可的偏離。其餘一律 STOP and ask。

### 約束 7：LLM Provider Neutrality ⭐⭐⭐

- ❌ 核心邏輯目錄禁止直接 import 任何 LLM SDK
- ❌ 工具定義禁止用某個 provider 的原生 schema
- ✅ 全透過 adapter 層的 `ChatClient` 抽象 + 中性 `ToolSpec` / `Message`
- ✅ CI lint 強制檢查
- **驗收**：30 分鐘換 provider 不改業務代碼

> ⚠️ **理由待重寫**：原論證的前提（中國在範圍內）已隨 **ADR-0010** 消失。**約束保留**
> （供應商鎖定 / 成本 / 可用性是獨立理由），但別再引用「合規機制」框架。見 `AD-Constraint7-1`。

詳見 `docs/rules-on-demand/llm-agent-antipatterns.md`。

### 約束 8：實體範疇資料隔離 ⭐⭐⭐

> **本專案不是對外多租戶 SaaS**（已確認參數 #2），但**隔離機制完全相同** ——
> 只是隔離軸從 `tenant` 換成 `entity`。本條是 guardrail 4 的可執行形式。

三條鐵律，**無例外**：

1. 所有業務 table 必有 `entity_id NOT NULL`（子表也要，冗餘是故意的）
2. 所有 query 必須以 `entity_id` 過濾 —— **優先用資料庫層 RLS，不能只靠應用層**
3. 所有 endpoint 必須注入 `current_entity_scope`，且實體身分**只能**來自憑證／session，
   **不能來自請求參數**

查無資料一律回 **404**，不區分「不存在」與「不在你的範疇內」—— 回 403 等於確認 ID 猜對了。

**與租戶隔離的差異**：區域滾升是**合法的跨實體讀取**。滾升路徑必須
（a）走明確的、經授權的 scope 擴張，（b）自身也被稽核，（c）絕不變成繞過過濾的後門。

- **驗收**：每個業務 endpoint 有 4 個範疇測試 ——
  跨實體讀拒絕 / 跨實體寫拒絕且資料未變 / RLS 層獨立成立 / 滾升角色只看到其授權子樹

詳見 `docs/rules-on-demand/multi-tenant-data.md`。
**隔離失敗不是一般 bug，是合規事故。**

---

## 🚫 工具使用紀律

**有專用工具就用專用工具**（Read / Grep / Glob，不要用 shell 的 `cat` / `grep` 讀檔搜尋；
不要用 `echo` 拼裝 + group 重定向寫檔）。與上列約束同級。

> 三條禁止 + 兩個真實代價：[`.claude/rules/tool-discipline.md`](./.claude/rules/tool-discipline.md)
> （always-loaded，本節不重複）。

---

## 「Check Existing Before Building」

建任何新 infra 前，**權威排序**：

1. **`docs/02-architecture/`** 設計文件（最高權威）
2. **當前 phase plan / checklist** — 當前迭代的決定
3. **既有代碼**（先 Grep，不要假設不存在）

### ⛔ 禁止反模式

- ❌ **假設某個東西不存在就直接新建** —— 先 Grep。重複實作是 AP-3 的主要來源
- ❌ **「先寫一批新規劃文件再實作」** —— 新領域必須先 **thin spike → retrospective → extract design note**。
  文檔成長跟隨已驗證的 runtime（見 `memory/feedback_doc_growth_follows_runtime.md`）
- ❌ **為了「未來可能用到」建抽象層** —— YAGNI（AP-5）
- ❌ **在 ADR 未拍板前替使用者選技術** —— 9 份基礎 ADR 全部未定。**表面化它們，不要默默選**
- ❌ **治理 / 合規類擴充沒先講清楚「對使用者今天的好處」就開工** ——
  這在本專案特別危險：**整個平台都是治理功能**，所以「做得很齊但沒人用」的風險是常態而非例外。
  動 code 前先說明：**今天誰因此受益**、**哪些要等未來條件才付得出價值**

---

## Development Commands

```bash
# 骨架已於 W01 交付，下列指令現在都能跑。

# Lint / Format
npm run lint -w apps/api -w apps/web
npm run format:check -w apps/api -w apps/web

# Type check
npm run type-check -w apps/api -w apps/web

# Test（api 用 jest、web 用 vitest —— 各跑各自生態的預設，不把一個 runner 塞進兩邊）
npm run test -w apps/api -w apps/web
npm run test:cov -w apps/api          # 覆蓋率門檻；CI 跑的是這個，不是 test

# Build
npm run build -w apps/api -w apps/web

# 本機 PostgreSQL
docker compose -f docker/compose.yml up -d

# DB migration（Prisma）
npm run prisma:migrate -w apps/api

# 專案架構 lint（規則 hygiene + 自訂 detector）—— 這個現在就能跑
python scripts/lint/run_all.py
```

### Services / Ports

| Service | Port |
|---------|------|
| `apps/web`（Next.js）| **3200** |
| `apps/api`（NestJS）| **3210** —— `/health` · `/api-docs` |
| PostgreSQL（`docker/compose.yml`）| **5433** —— 綁 `127.0.0.1`，非 5432（避開本機既有 PostgreSQL）|

> 拓撲已定（**ADR-0010**，取代 0006）：全球 Azure **單一區域 × 3 環境**（dev/staging/prod），
> **prod 獨立 subscription**，RTO 4h / RPO 15min。

### Environment Setup

複製 `.env.example` 到 `.env` —— 完整變數清單即該檔內容，不在此重複。

> **非顯而易見**：**prod 在不同的 subscription**（ADR-0010），其密鑰與端點**不是** staging 的
> 超集 —— 不要用同一份 `.env` 加開關來湊。

---

## Code Standards

規則採 **Hybrid 載入**（控制 session context 用量）：

**🔴 Always-loaded（5 條 critical，自動進每個 session）**

| Rule | Scope |
|------|-------|
| `.claude/rules/task-workflow.md` | 任務分類 gate + Phase 軌 5 步流程 + Day-0 摘要 + closeout policy |
| `.claude/rules/verification-discipline.md` | Drive-through 三層驗證 + 反 Potemkin + 證據紀律 |
| `.claude/rules/file-header-convention.md` | File header + Modification History 1-line max |
| `.claude/rules/anti-patterns-checklist.md` | PR 自檢清單 |
| `.claude/rules/tool-discipline.md` | 有專用工具就用專用工具 |

**📋 On-demand（需要時主動 `Read docs/rules-on-demand/X.md`）**  <!-- path-check: ignore -->
—— **16 個檔（14 常態 + 2 條件式附加包）**，逐條 trigger 表在
[`.claude/rules/README.md`](./.claude/rules/README.md) —— **它也是 always-loaded，
那張表已在 context 裡，抄第二次是純浪費**。最常觸發：`day0-plan-verify`（每個 Day 0）·
`multi-tenant-data`（⭐ 碰資料存取）· `mockup-fidelity`（⭐ 寫第一頁前）·
`i18n-glossary`（⭐ 使用者可見文字）。

> ⚠️ **on-demand 規則絕不能放進 `.claude/`** —— Claude Code 遞迴掃描整棵 `.claude/` 樹並全部載入。

---

## Documentation Layout

`docs/` 分 14 層 + 根層 singleton。**完整索引與放置鐵律：[`docs/README.md`](./docs/README.md)。**

| 目錄 | 角色 |
|------|------|
| [`docs/02-architecture/`](./docs/02-architecture/README.md) | ⭐ **本專案的 19 份核心設計文件 `00`–`17` 住在這裡**（憲章、資料模型、安全、建置計畫、各模組規格）。**建表前先看 `02a` §0 的實體索引** —— 資料模型分散在 `02a` 與各模組文件，索引是唯一完整的清單 |
| [`docs/01-planning/`](./docs/01-planning/README.md) | PROCESS · BACKLOG · ROADMAP · registers · calibration · `_templates/` · phase folder `W{NN}-*/` |
| [`docs/03-implementation/`](./docs/03-implementation/README.md) | `changes/CH-NNN-*` · `bugs/BUG-NNN-*` |
| [`docs/06-reference/`](./docs/06-reference/README.md) | ⭐ 設計交付物 `design_handoff_isms_grc_platform/` + mockup→production playbook |
| [`docs/14-adr/`](./docs/14-adr/README.md) | ⭐ 架構決定記錄 —— **0001 / 0003 / 0004 / 0005 / 0007 / 0010–0014 已採納（0006 已被 0010 取代）；0002 待 spike，0008 / 0009 待 Wave 3** |
| [`docs/INFORMATION-FLOW.md`](./docs/INFORMATION-FLOW.md) | ⭐ 開發資訊流地圖 |
| `MEMORY.md` + `memory/` | 跨 session 記憶（index + subfile）|

> **`docs/architecture.md`（模版主 spec）在本專案是薄轉址層** ——
> 真正的架構真理在 `docs/02-architecture/01-architecture-overview.md` 與 `02-core-data-model.md`。

**三軌的產出物**（Phase → `plan`+`checklist` · Change → `spec` · Bug → `report`；
單檔 1-page vs 資料夾三件套的判準）：
[`PROCESS.md`](./docs/01-planning/PROCESS.md) §3.3 / §4.3 是唯一權威。

**設計與決策的三種文件**（design doc / design note / ADR —— 何時寫、誰必須有實作、
⚠️ **design note 是 extract 不是 pre-write**）：
[`14-adr/README.md`](./docs/14-adr/README.md)（含 ADR 的 forcing-function 判準）
+ [`02-architecture/README.md`](./docs/02-architecture/README.md) §Design Notes。

---

> **單人開發。** `docs/rules-on-demand/collaboration.md` 仍值得讀 ——
> 其中的**交接**（也適用於 AI session 之間）與 **AI 輔助的一致性漂移**對單人專案同樣成立。

---

## Developer Preferences

### Communication

- **Language**: 繁體中文
- **Documentation**: 技術文件英文；使用者可見文字繁體中文（guardrail 9）
- **Detail**: 詳細解釋並附理由
- **Confirmation on Destructive Only**: `git push` / `git reset --hard` / `git push --force` /
  刪 production code / 改 shared infra / 改 CI/CD / 發外部訊息前必問。
  **NOT destructive**：Write / Edit / Read 在已對齊 scope 內、Glob / Grep / read-only 命令、
  建立 plan §File Change List 內預期的新檔。

### Code Style

- **Comments**: 程式碼註解用英文
- **Git Commit**: 功能完成才 commit
- **Testing**: 新功能必須附單元測試

### Behavior Rules

- **Proactive Assistance**: 主動參與開發
- **Ask Before Acting on STRATEGY**: 範圍模糊 / 多個有效方法 / 使用者意圖不明 / 新 phase 方向時必先問
- **Deep Error Analysis**: 找根因，不貼膏藥
- **Never Delete Tests / Docs / Checklist Items**: 只能 `[ ]` → `[x]`，**不能刪除未勾選項**
- **Never Fabricate Results**: 只有真的看到 tool 執行結果才能說「已完成 / 已提交 / 已驗證」

---

## Coding Guidelines

> 減少常見 LLM coding 錯誤的行為守則。Source: [Andrej Karpathy](https://x.com/karpathy/status/2015883857489522876)

### 1. Think Before Coding
- 明說假設；不確定就問
- 多種解讀並陳，不要私下選一個
- 有更簡單方案就說；該 push back 就 push back

### 2. Simplicity First
- 最少代碼解決問題
- 不寫沒被問的功能 / 不為單次使用造抽象 / 不加未要求的「彈性」
- 200 行能變 50 行就重寫

### 3. Surgical Changes
- 只動必要的；不順手「改善」相鄰代碼
- 不重構沒壞的東西；配合既有風格即使你會做不同
- 看到無關的 dead code 就提一下，**不刪**
- **註解 / docstring 也算 code** —— 引用已被移除的東西時就是誤導人的 orphan claim

### 4. Goal-Driven Execution
- 任務轉成可驗證目標：「Add validation」→「寫無效輸入測試 → 通過」
- 多步任務先給簡短 plan：每步 + verify

---

## CRITICAL: Task Execution Workflow

> **強制流程。三軌共用同一個骨架：先分類 → 先文件 → 才寫 code。**

```
分類任務 → 開 pre-doc（等 approve）→ Day-0 Verify → Code → 勾 Checklist → Progress → Closeout
```

**禁止**：跳過分類直接 code；沒有 approved 的 pre-doc 就開工；**刪除未勾選的 `[ ]` 項**。

> **兩份權威，分工不重疊**：
> - [`docs/01-planning/PROCESS.md`](./docs/01-planning/PROCESS.md) —— **哪一軌** + Change/Bug lifecycle + R1-R9
> - [`.claude/rules/task-workflow.md`](./.claude/rules/task-workflow.md) —— always-loaded，**Phase 軌怎麼跑**

---

## File Header Convention

> **權威來源**：[`.claude/rules/file-header-convention.md`](./.claude/rules/file-header-convention.md) ——
> always-loaded，內含 header 範本 / 三層級修改對應 / Modification History 1-line 預算 / 禁止項。

---

**Last Updated**: 2026-08-14（W12 closeout）
**Project Start**: 2026-08-07
**Template Version**: 2.6.1 (claude-code-dev-template)
