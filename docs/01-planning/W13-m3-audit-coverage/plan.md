---
status: closed   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W13 Plan — Connect the audit trail to every reachable write path

**Summary**: W12 交付了機制，覆蓋是 **1 / 21**。本 phase 把 `AUDITED_MODELS` 從 1 個名字擴到
**全部 14 個經 repository 寫入的領域模型**，並為每一個提供「它真的被稽核」的測試。
關掉 **`AD-AuditCoverageOneTable-1`（🔴 P0）**，讓 `07` §Security gate 從**可達但未達**變成**達成**。
⛔ **先做 `AD-VacuousScopeTest-1` 的回頭檢查** —— 接完再查，會得到 15 張表的範疇測試而不知道
其中幾項只在空集合上為真。⚪ 無 user-facing surface ⇒ **gate-only verified，不做 drive-through**。
**非 spike（複用 W12 已驗證的機制）⇒ 不產出 design note。**

**Status**: Closed（2026-08-15 —— 五個 US 全數交付；兩項 🚧 已標並附解封條件，見 retrospective Q1。
laitim2001 於 2026-08-14 選定方向「走 4c」並**核可本檔**。
軌別為 Phase 軌 —— 它是 `ROADMAP` 主線第 4c 項、對應一條 🔴 P0 的 AD，且跨多天有多個 deliverable，
不是 < 3 天的 Change）

**Branch**: `feature/W13-audit-coverage`
**Base**: `main` HEAD **`fa37d6b`**（審計 #5，PR #60 於 2026-08-14T14:37Z merged）
⭐ 起草時 #60 還開著，plan 預寫了兩種情況；Day 0 取到的是**已 merge** 的那一種，
故 base 由 `91dd1cb` 前移一個 commit。⚠️ **§0 的 code 錨點是在 `91dd1cb` 上讀的**，
而 `fa37d6b` 只動 `STATUS_AUDIT.md` / `BACKLOG.md`（`git diff --stat` 確認），
故錨點不受影響 —— 但仍由 §checklist 0.1 逐一重驗。
**Slice**: M3 arc slice **2 / N** —— W12 是機制，本片是覆蓋。關 `AD-AuditCoverageOneTable-1`
**Scope decisions**: (a) **14 個模型不是 20** —— 5 個沒有 repository 寫入路徑（recon 導出，Day 0 複驗）
(b) `RefCodeCounter` **刻意不接**，理由見 §3.2 (c) 空集合回頭檢查排在**擴表之前**
(d) **不新建機制** —— 本片是接線與證明，任何需要改 `audit.recorder.ts` 行為的發現都記 AD 不當場做

---

## 0. Background

### The gap（`AD-AuditCoverageOneTable-1` 🔴 P0）

- `audit.module.ts:38` 的 `AUDITED_MODELS` 是 `new Set(['StatementOfApplicability'])` —— **一個名字**。
- 其餘 14 個有寫入路徑的領域模型**寫入時不留任何稽核列**，而機制與攔截點都已就位。
- `07` §Security gate 寫「no milestone is done until **every state change is audited**」
  ⇒ 今天 **M1 的 DoD 仍未達成**，而擋住它的不再是「沒有機制」而是「沒有接上」。

### Why it matters（缺失的能力）

W12 的 `RISK_REGISTER` R4 更新寫得很清楚：**機制在、覆蓋不在**。今天稽核員能問「誰改了這份 SoA」
並得到答案，但同一個問題對 `Issue.status = risk_accepted`（一次正式的風險接受）、
對 `RMReportVersion`（不可變的受控交付物）、對 `Evidence`（存在目的就是證據等級主張）
**仍然一個字都答不出來**。

⚠️ 而 R4 的失效模式是**逐 phase 擴大而沒有 gate 會叫** —— 每建一張新表就讓分母加一。
本片不做，下一片建表就讓它更貴。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `91dd1cb`）| Anchor |
|-------|--------------------------------------------|--------|
| 允許清單 | `AUDITED_MODELS = new Set(['StatementOfApplicability'])`，**1 個名字**；docstring 明寫「connecting them is the next phase and it is a **wiring change, not a redesign**」| `audit.module.ts:38` · `audit.recorder.ts:118-124` |
| 攔截條件 | `model === undefined` → 不稽核（raw query）· 不在允許清單 → 不稽核 · 非寫入 operation → 不稽核。**三個 early return，改的是第二個** | `audit.recorder.ts:136-138` |
| ⭐ 可達的寫入面 | **16 個 delegate** 經 repository 寫入（recon 枚舉 `client.<delegate>.(create\|update\|upsert)`），其中 `statementOfApplicability` 已接、`refCodeCounter` 是基礎設施 ⇒ **待接 14 個** | `core-model/*.repository.ts` · `ref-code.ts:97` |
| ⛔ 不可達的 | `OrgEntity` · `User` · `ExtensionField` · `Threat` · `Vulnerability` **今天沒有 repository 寫入路徑** ⇒ 加進清單等於加一個不會被觸發的名字（AP-3 的形狀）| 同上，反向枚舉 |
| ⚠️ 每次 create 都會寫的 | `ref-code.ts:97` 的 `client.refCodeCounter.upsert` 在**每一個** `runScoped` create 內執行 | `ref-code.ts:97` |
| 空集合假性通過 | W12 的 N2 量到四個範疇測試的第 1 個在稽核全關時仍全綠（空陣列上 `every` 真 / `some` 假）；**其餘 9 個 int spec 未逐一檢查** | `BACKLOG` `AD-VacuousScopeTest-1` |
| 已知限制（三條，每張表都要確認可接受）| `before` 永遠 SQL NULL · `after` 是**請求的 payload** 不是儲存後的列 · `resource_id` 對 create 不可得（靠 `ref_code` 頂替）| ADR-0003 §Consequences |

→ 本片的改動**核心只有一行**（允許清單），而**工作量在證明** ——
14 個模型各要一個「它真的產生稽核列」的斷言，加上一次不能省的空集合回頭檢查。
⛔ **這正是最容易變成 Potemkin 的形狀**：清單加了名字，看起來覆蓋了，而沒有任何測試會在它被移除時轉紅。

### The design（backend-only：1 個常數 + 14 個斷言 + 1 次回頭檢查）

```
EDIT  audit-trail/audit.module.ts        AUDITED_MODELS: 1 → 14 個名字（+ 來源說明）
EDIT  audit-trail/audit.int.spec.ts      跨模型的覆蓋斷言（清單 vs 實際寫入面）
EDIT  modules/*/**.int.spec.ts (×11)     每個模組加「這個寫入留下恰好一列稽核」
EDIT  modules/*/**.int.spec.ts (×?)      ⭐ 空集合回頭檢查：範疇測試補非空前提
NEW   docs/03-implementation/changes/CH-030-w13-audit-coverage.md
```

**為何不改 `audit.recorder.ts`**：W12 已量過它對 `StatementOfApplicability` 成立，
而三個 early return 與模型名無關。**如果某個模型需要 recorder 改行為，那是一個發現不是一個任務**
—— 記 AD，不當場改（§3.x）。

### Ground truth（recon head-start —— 於 `main` HEAD `91dd1cb` 讀過的 code）

- `audit.recorder.ts:131-195` — `intercept` 全文；三個 early return 與 `after` 的 key 省略
- `audit.module.ts:38-45` — `@Global` module，`AUDITED_MODELS` 由建構子注入（W12 為了中性化而如此）
- `scoped-prisma.provider.ts:111` — 稽核列 push 進同一個 `$transaction` 陣列
- `core-model/*.repository.ts` — 16 個 `client.<delegate>.create|update|upsert` 呼叫點
- `audit.int.spec.ts:112` — 「writes exactly one audit row for one domain write」的既有形狀
- W12 `CH-029` §Impact — 三條已知限制的權威敘述

**Baselines（W12 closeout）**: api unit **451 / 38** · api int **187 / 15** · web **10 / 1** ·
coverage **92.27 / 91.66 / 98.95 / 93.64** · `run_all` **8/8** · `check_entity_index` **21 / 35** ·
lint 0 · type 0 · build clean ×2。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-reach** — ⭐ 逐一驗證「14 個可達 / 5 個不可達」的枚舉，**用第二條獨立路徑交叉檢查**
  （`AD-NarrowPatternWideClaim-1`）→ 影響 §3.1 與 §4 的規模
- **D-vacuous** — 逐一讀 **全部** int spec 的範疇測試，數出有幾個缺非空前提 → 影響 §3.3 的規模
- **D-refcode** — `ref-code.ts:97` 的 upsert 是否真的每次 create 都跑（讀 code 不夠，要量）→ 影響 §3.2
- **D-limits** — ADR-0003 三條已知限制對 14 個模型**逐一**判定可否接受 → 影響 §3.1 與 §9
- **D-roadmap** — ⛔ `ROADMAP` 4c 寫「其餘 **20** 張表」，recon 說 14。**那是我在 W12 closeout 寫的**
  → 若 Day 0 確認，`ROADMAP` 與 `BACKLOG` 的措辭要一起改

## 1. Phase Goal

把稽核覆蓋從 **1 / 21** 推到**全部有寫入路徑的領域模型**，並讓每一個都有一個
**移除它就會轉紅**的測試 —— 覆蓋率不是宣稱的而是被證明的。
證明方式：gates 全綠 + **每個模型一條覆蓋斷言** + **中性化元驗證**（清空允許清單 / 移除單一名字）
+ **`AD-VacuousScopeTest-1` 的回頭檢查結果表**（查了幾個、幾個有問題、補了幾個）。
**無 user-facing surface ⇒ 報告一律 gate-only verified。**
**非 spike ⇒ 不產出 design note；無架構級決定 ⇒ 不產出 ADR**（若 Day 1 發現需要，STOP and ask）。

## 2. User Stories

- **US-1**（look-back）: 作為維護者，我希望知道**現有的範疇測試有幾個是空集合上的真**，
  以便我不是在一個假的基準上擴大覆蓋。
- **US-2**（coverage）: 作為稽核員，我希望**每一個有寫入路徑的領域模型**的狀態變更都留下稽核列，
  以便「誰在什麼時候把什麼改成什麼」對整個平台可答而不只對 SoA。
- **US-3**（proof）: 作為未來的維護者，我希望每個模型的覆蓋**各自有一個會轉紅的測試**，
  以便允許清單被誤刪一個名字時有人會知道。
- **US-4**（meta-verification）: 作為未來的維護者，我希望知道關掉覆蓋會壞哪些測試。
- **US-5**（closeout）: 作為下一個 session，我希望 `AD-AuditCoverageOneTable-1` 已關、
  R4 已更新為真實覆蓋率、導航檔已更新。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
EDIT   apps/api/src/audit-trail/audit.module.ts          AUDITED_MODELS 1 → 14
EDIT   apps/api/src/audit-trail/audit.int.spec.ts        覆蓋斷言（清單 vs 實際寫入面）
EDIT   apps/api/src/modules/{policy,asset,risk,control,   每個模組 +1 覆蓋測試
       control-test,evidence,issue,action,assessment,
       rm-report}/**.int.spec.ts
EDIT   apps/api/src/modules/**/*.int.spec.ts             ⭐ 空集合回頭檢查（範圍待 D-vacuous 定）
NEW    docs/03-implementation/changes/CH-030-*.md        closeout 單檔記錄
UNTOUCHED  apps/api/src/audit-trail/audit.recorder.ts    ⛔ 不改行為
UNTOUCHED  apps/api/prisma/**                            無 schema / migration 變更
UNTOUCHED  apps/web/**                                   無 UI
```

### 3.1 允許清單（US-2）— `audit.module.ts`

- 14 個名字**由 recon 枚舉導出**，不是手抄：`Policy` · `AssetGroup` · `Asset` · `Risk` ·
  `Control` · `ControlTest` · `Evidence` · `Issue` · `Action` · `AssessmentTemplate` ·
  `AssessmentInstance` · `AssessmentResponse` · `RiskManagementReport` · `RMReportVersion`
  （+ 既有的 `StatementOfApplicability` = **15**）
- ⛔ **不加沒有寫入路徑的名字**（`OrgEntity` / `User` / `ExtensionField` / `Threat` /
  `Vulnerability`）—— 一個永遠不會被觸發的允許清單項是 AP-3 的形狀，而且它會讓覆蓋率**看起來**更好
- **常數旁邊要寫下枚舉方法**，讓下一個人能重跑那個導出而不是相信這 15 個字串

### 3.2 `RefCodeCounter` 的處置（US-2）— **刻意不接**

`ref-code.ts:97` 的 `client.refCodeCounter.upsert` 在**每一個** create 內執行。接上它會：

| 後果 | 判定 |
|---|---|
| 每個領域 create 產生**兩列**稽核（領域 1 + counter 1）| ⛔ 稽核軌跡的訊噪比直接砍半 |
| counter 的 `after` payload 是一個遞增整數，**不含任何治理語義** | ⛔ 稽核員讀不出東西 |
| 但它**確實是一次狀態變更**，`07` 的 gate 字面上涵蓋它 | ⚠️ 這是一個真實的張力 |

⇒ **本片不接，並把理由寫進允許清單旁邊**（不是靜靜跳過）。⚠️ 若 Day 0 的 **D-refcode**
量到它的寫入頻率與預期不同，這一格重議。

### 3.3 空集合回頭檢查（US-1）— **排在擴表之前**

- 逐一讀**每一個** int spec 的範疇測試（⛔ **不 grep 命中數** —— W12 的 `asset.int.spec.ts`
  對 `約束 8` 是 0 命中而測試存在，審計 #5 已記）
- 每個「跨實體讀被拒」類測試檢查：**它有沒有先斷言對造實體確實有 N > 0 列**
- 缺的補上，並**在補完之後把該 spec 的斷言在「資料被清空」的狀態下驗一次會紅**
- 產出一張表：**查了幾個 / 幾個有問題 / 補了幾個 / 幾個本來就對**

### 3.x 明確不做的事

| 不做 | 去向 |
|---|---|
| 改 `audit.recorder.ts` 的行為 | 若某個模型需要它改 → **記 AD，STOP and ask** |
| 補 `before` 的真實舊值 | ADR-0003 **FC3** —— 需要每表 trigger，是另一個 phase |
| 稽核 raw query | 已命名的洞，需要語句解析 |
| 稽核滾升讀取 | guardrail 4 要求，但 M8 才有滾升端點 |
| `RefCodeCounter` | §3.2，理由寫在清單旁 |
| 為 5 個無寫入路徑的模型建端點 | 那是 M1 slice 9..N / M4 的工作 |
| 稽核日誌的查詢 API / UI / 匯出 | 報表層，Wave 1 不做 |

### 3.y Validation（US-1..US-4）

Gates: format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` PASS · api unit / int 全綠 ·
coverage 不低於 baseline 的 **branch / funcs**（⚠️ stmts / lines 見 `AD-ModuleFileZeroCoverage-1`）·
`run_all` **8/8** · `check_entity_index` **21 / 35**（本片不建表，此數**不應變動** —— 若變了就是有東西不對）。

**中性化（US-4，預期方向必須寫在執行之前並先 commit）**：

| N | 拿掉什麼 | 用途 |
|---|---|---|
| N1 | 允許清單清空 | 覆蓋是否真的靠它（預期：全部覆蓋測試轉紅） |
| N2 | **只移除一個名字**（挑 `Issue`）| ⭐ 每個模型是否**各自**有守衛 —— 預期**恰好**該模組的測試轉紅，其餘不動 |
| N3 | 補回 `RefCodeCounter` 到清單 | 量 §3.2 的宣稱（每個 create 真的多一列嗎）|
| N4 | 把某個範疇測試的非空前提再拿掉 | 證明 US-1 補的東西真的在守 |

⛔ **無 drive-through** —— 無 UI。報告一律寫 gate-only verified。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/src/audit-trail/audit.module.ts` | EDIT |
| 2 | `apps/api/src/audit-trail/audit.int.spec.ts` | EDIT |
| 3 | `apps/api/src/modules/policy/policy.int.spec.ts` | EDIT |
| 4 | `apps/api/src/modules/asset/asset.int.spec.ts` | EDIT |
| 5 | `apps/api/src/modules/risk/risk.int.spec.ts` | EDIT |
| 6 | `apps/api/src/modules/control/control.int.spec.ts` | EDIT |
| 7 | `apps/api/src/modules/control-test/control-test.int.spec.ts` | EDIT |
| 8 | `apps/api/src/modules/evidence/evidence.int.spec.ts` | EDIT |
| 9 | `apps/api/src/modules/issue/issue.int.spec.ts` | EDIT |
| 10 | `apps/api/src/modules/action/action.int.spec.ts` | EDIT |
| 11 | `apps/api/src/modules/assessment/assessment.int.spec.ts` | EDIT |
| 12 | `apps/api/src/modules/rm-report/rm-report.int.spec.ts` | EDIT |
| 13 | `apps/api/src/modules/soa/soa.int.spec.ts` | EDIT（空集合回頭檢查，覆蓋已有）|
| 14 | `docs/03-implementation/changes/CH-030-w13-audit-coverage.md` | NEW |
| — | `apps/api/src/audit-trail/audit.recorder.ts` | **UNTOUCHED** —— ⛔ 本片不改機制 |
| — | `apps/api/prisma/**` | **UNTOUCHED** —— 無 schema / migration 變更 |
| — | `eslint.config.mjs` 的 MATRIX | **UNTOUCHED** |
| — | `apps/api/src/audit-trail/__fixtures__/` | **UNTOUCHED** —— 「DO NOT FIX THIS FILE」|
| — | `apps/web/**` | **UNTOUCHED** —— 無 UI |

> ⛔ **Day 2 DEVIATION（R3），原表保留不刪 —— 第 3..13 列沒有發生。**
> 上表第 3–13 列（11 個模組 int spec）**未被修改**，改為新建
> `apps/api/src/audit-trail/audit-coverage.int.spec.ts`。
>
> **理由由實測導出，不由推論導出**：`AuditModule` 是 `@Global`，但 global provider 只在
> **被拉進圖裡**才生效，而 `ScopedPrismaFactory` 對 hook 是 `@Optional`。11 個模組 spec 都建
> module-local 圖（`Test.createTestingModule({imports:[AssetModule]})`），其中**沒有 AuditModule**。
> Day 2 用兩組對照量到：同一個 `AssetGroup` create 在 **AppModule 圖下寫一列**、在
> **module-local 圖下 `before=9 after=9`**。
> ⇒ 原做法會讓那 11 條測試要嘛**永遠紅**，要嘛寫成 `≥ 0` 而**正是 AP-3**。
>
> ⚠️ 另一條路（把 11 個 spec 都改成 composes AppModule）被否決：11 個 suite 各建一次完整
> AppModule 圖，成本與風險都遠高於新增一個檔案，且會改動 11 個既有檔案。

## 5. Acceptance Criteria

1. `AUDITED_MODELS` 含**全部有 repository 寫入路徑的領域模型**，且該清單旁記錄了**枚舉方法**
2. **每個模型各有一條覆蓋測試**，且 **N2（只移除一個名字）恰好讓該模組轉紅、其餘不動**
3. **空集合回頭檢查已完成並有結果表**（查了幾個 / 幾個有問題 / 補了幾個），
   且 N4 證明補上的前提真的在守
4. `RefCodeCounter` 的不接理由寫在清單旁；**N3 量到它接上時的實際後果**（不是推測）
5. ⚪ **Drive-through 不適用**（純後端）—— 報告寫 **gate-only verified**
6. Gates 全綠（§3.y）；`check_entity_index` **仍是 21 / 35**
7. `AD-AuditCoverageOneTable-1` **CLOSED**；R4 更新為**真實覆蓋率**（分母機械導出，
   ⛔ 不得再用手寫累加 —— `AD-RiskTableCountManual-1`）；calibration 已回填；導航檔已更新

## 6. Deliverables

- [ ] US-1 空集合回頭檢查 + 結果表 + 補上的非空前提
- [ ] US-2 `AUDITED_MODELS` 擴到全部可達模型 + 枚舉方法 + `RefCodeCounter` 的記錄理由
- [ ] US-3 每個模型一條覆蓋測試
- [ ] US-4 四個中性化，預期方向先 commit，結果逐項對照
- [ ] US-5 `AD-AuditCoverageOneTable-1` CLOSED + CH-030 + R4 + 導航檔 + calibration 回填

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（`CALIBRATION-MATRIX.md` —— 本 phase 是該欄的
  **第 6 個資料點**）。理由：機制由 W12 驗證完畢，本片是**把已驗證的形狀複製 14 次**，
  加上一次沒有藍本的回頭檢查。⚠️ **不是 `mechanical-refactor`** —— 每個模型都要判定
  ADR-0003 的三條限制是否可接受，那需要讀而不只是改。
  ⚠️ **依 `AD-CalibrationDay0InOrOut-1` 明確宣告量法**：**含 Day 0，窗口 = branch 第一個
  commit → closeout commit**（與 W11 / W12 同一定義）。
  ⛔ 依 W11 / W12 的教訓：actual **等 closeout commit 真的存在之後再算**
  （`AD-EstimateAsMeasurement-1`；W12 首次執行該修法，本片是第 2 次）。
- **Agent-delegated: no**（< 20% —— 自己直接做）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est ~**4.5 hr**：空集合回頭檢查 1.2 · 允許清單 + 枚舉說明 0.3 ·
  14 條覆蓋測試 1.5 · `RefCodeCounter` 判定 0.3 · 中性化 0.7 · closeout 0.5
  → **calibrated commit ~2.25 hr（mult 0.50）**。
- ⭐ **同時記下 `AD-BottomUpBlueprint-1` 的新法預測**（W09 驗過一次，誤差 < 10%）：
  逐項標藍本度 —— **無藍本 1 項**（空集合回頭檢查）· **有藍本改差異 5 項**（清單 / 覆蓋測試 /
  refcode / 中性化 / closeout）。以該級實測 **≈ 8 min/項** 計 ⇒ 有藍本部分 **≈ 40 min**，
  無藍本項不套用該單位成本。**Day-4 retro Q2 同時驗證兩個估法**，這是它的第 2 個對照點。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ⛔⭐ **最大的風險是這片會變成 Potemkin** —— 加 14 個字串進清單，覆蓋率數字變好看，而沒有任何測試會在名字被刪時轉紅 | AC-2 把 **N2（只移除一個名字）** 設為驗收條件而非可選項：必須**恰好**該模組轉紅。⚠️ 這是本片唯一能區分「真覆蓋」與「宣稱覆蓋」的證據 |
| **`AD-VacuousScopeTest-1` 的規模未知** —— 可能 1 個也可能 9 個 | Day 0 的 **D-vacuous** 先量。⛔ 若超過 5 個，那本身是一條 AD 而非本片的順手工作 → 範圍變動 20-50% ⇒ **修訂 plan 並跟使用者再確認** |
| **14 個模型裡可能有某個撞到 ADR-0003 的三條限制** | Day 0 的 **D-limits** 逐一判定。⛔ **不當場改 recorder** —— 記 AD 並把該模型留在清單外，`closed_partial` 好過偷偷改機制 |
| ⚠️ **`AssessmentResponse` 可能是量大的寫入面** —— `AD-ResponseRefCodeCost-1` 已記「40 題 = 40 次發號」，接上稽核就是 40 次發號 + 40 列稽核 | 本片**不最佳化**，但要**量一次**並記錄。若成本明顯 → AD，不當場解 |
| `AD-NarrowPatternWideClaim-1`（W12 再現 3 次）| 每一次「枚舉得到 N 個」都要有**第二條獨立路徑**交叉檢查。⭐ 本 plan 起草時已用兩條路徑（正向枚舉 + 反向差集）得到 14 / 5 |
| `AD-PartialGateReportedAsFull-1` | checklist Day 3 §3.x **逐項複製** Day 2 的 gate 清單 |
| **R4 更新又用手寫計數** | ⛔ `AD-RiskTableCountManual-1` 剛在 W12 被實地擊中。R4 的新數字**必須機械導出**（`AUDITED_MODELS.size` vs `^model` 數），並在 CH-030 寫明導出方法 |
| Risk Class C（陳舊 dev server）| 無長駐服務驗證需求；int 測試各自建 testing module |
| ⛔ **dev DB checksum 漂移未修**（`AD-DevDbChecksumDrift-1`）| 本片**無 migration**，故不受影響。⚠️ 但也代表它**又一個 phase 沒被修** |
| ⭐ **Day-0 `D-refcode-b`** —— `refCodeCounter.upsert` 的 args 是 `{where, create, update}`，**沒有 `data` key**；`audit.recorder.ts:141` 因此得 `null`，`resolveEntity` 退回 context，**多實體 scope 下 throw `UnattributableWriteError`** | §3.2 的判定不變但**理由更硬**：接上它不只是訊噪比問題，是**讓滾升角色的每個 create 失敗**。⚠️ **Day 3 N3 的預期方向改寫**為「單實體 scope 得 2 列 / 多實體 scope 拋錯」，並在該處量到才算數 |
| ⭐ **Day-0 `D-write-ops`** —— 全 codebase **零個 `client.*.update` / `.delete`**，15 個領域寫入全是 `create`（update 測試走 raw SQL 驗 RLS）| ADR-0003 限制 1（`before` 永遠 NULL）**在只有 create 的世界裡無害**，D-limits 因此全數通過。⛔ 但這讓「覆蓋」有歧義：**接上 15 個模型 ≠ 稽核了所有狀態變更類型**。CH-030 必須明寫這句限定，否則 R4 會被讀成已解決 |
| ⛔⭐ **Day-2 `D-graph`** —— **module-local 圖不寫稽核列**（實測 `before=9 after=9`；同一寫入在 AppModule 圖下寫一列）| §4 的第 3–13 列（11 個模組 spec）**作廢**，改為新建 `audit-coverage.int.spec.ts`。見 §4 下方的 DEVIATION 段。⚠️ 這條 Day 0 沒抓到 —— 我讀過 `scoped-prisma.provider.ts:151-165` 那段 docstring，但沒把它連到 plan §3.0 的做法上 |
| ⚠️ **兩個 suite 現在都 composes AppModule** ⇒ 稽核表上的 `before/after` 計數是 race（jest 平行 worker、共用一個 DB）| 覆蓋斷言改成**依本次寫入的 `refCode` 查**，「恰好一列」因此是關於**這一次寫入**的主張而非關於整張表 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **`before` 的真實舊值** — ADR-0003 FC3，需要每表 trigger，自己是一個 phase
- **raw query 的稽核** — 需要語句解析
- **滾升讀取的稽核** — M8 才有滾升端點；⭐ FC4 由構造保證會觸發
- **`RefCodeCounter` 的稽核** — §3.2，理由記錄在清單旁
- **5 個無寫入路徑的模型** — 它們的端點是 M1 slice 9..N / M4 的工作
- **`AssessmentResponse` 批次寫入的成本最佳化** — 量到再說（AP-5）
- **`AD-StrategyBSunset-1`** — 策略 B 的刪除有自己的期限（Wave 1 結束前），不在本片
- **`retention_policy` / `LegalHold`** — 另一個 slice（`AD-ImmutableRowRetention-1`）
