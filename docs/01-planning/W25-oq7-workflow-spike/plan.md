---
status: closed   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W25 Plan — OQ-7 spike: where a lean state machine stops being lean

**Summary**: 用一個薄切片回答 OQ-7（workflow engine 自建 vs 嵌入），產出 **ADR-0002** +
**design note**。只做 **Policy 一條生命週期**，兩個候選方案**各自真的實作一次再量測**（W12/OQ-4 前例），
不做紙上比較。⭐ 這一片真正的交付物是**「精簡」與「BPM」之間那條線的可證偽判準** ——
沒有那條線，D004 永遠無法重新評估，而狀態機會逐步長成它被禁止成為的東西。
需要 **drive-through**（`/policies` 已接 API，狀態值渲染在畫面上）· 需要 **design note**（spike phase）。

**Status**: **closed**（2026-08-21 —— 六個 US 交付，US-3 為部分：plan §3.3 與 §3.x 互相矛盾，
證據基礎實際是一條流程，見 retrospective Q1。核准紀錄：使用者 2026-08-21 核准執行；
方向同日由使用者自四個選項中選定 M5；OQ-7 同日由使用者拍板選候選 A）

**Branch**: `feature/W25-oq7-workflow-spike`
**Base**: `main` HEAD `664fcdc`（CH-046 post-merge —— E5 抓到未翻的標記）
**Slice**: standalone spike。解 **OQ-7**（`decision-form.md:19`）⇒ 解封 **M5**，並讓 **D004** 首次可被重新評估
**Scope decisions**: (a) **spike 不是實作** —— 產出是決策文件，不是生產用 workflow engine ·
(b) **只做 Policy 一條** —— 四條生命週期已規格化，本片碰一條 · (c) **兩個候選各建一次再量** ——
不接受紙上比較（`AD-ProxyMetricAsAnswer-1` 家族）· (d) **不建 SLA / escalation** ——
本片只回答「選中的形狀撐不撐得住它們」

---

## 0. Background

### The gap（OQ-7 未拍板 ⇒ M5 無法開始）

`apps/api/src/workflow/` 至今**只有 `.gitkeep`**（八個範疇裡兩個 0 檔之一）。

而狀態**早就存在**：`02a` 用 mermaid 規格化了 **4 條**生命週期，schema 有 **9 個 `*Status` enum**、
**6 個 model** 帶 status 欄位。⇒ 缺的不是狀態，是**轉換的強制力**。

schema 自己把這件事寫在註解裡：**「the enum is real, the TRANSITIONS are not enforced by
anything until M5. Any value may be written over any other.」**

### Why it matters（缺失的能力）

今天任何呼叫端可以把 `published` 直接寫成 `draft`，或跳過 `in_review` 從 `draft` 直上 `approved` ——
**沒有任何東西會拒絕**。一個治理平台的政策核准流程若能被繞過，它自己就是 guardrail 1 說的風險來源。

更遠的後果：**D004（重量級 BPM）的解封條件是「OQ-7 拍板後」** ——
OQ-7 不動，那條 defer 就永遠停在原地，而「精簡狀態機」沒有邊界定義時**只會單向長大**。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `664fcdc`）| Anchor |
|-------|--------------------------------------------|--------|
| workflow 範疇 | 只有 `.gitkeep`，零實作 | `apps/api/src/workflow/` |
| 既有狀態機 | 全 repo 零實作 —— 唯一命中是一句**註解**（SoA 簽核常是委員會）| `apps/api/src/core-model/soa.repository.ts:80` |
| 狀態值 | `PolicyStatus` 6 個值，註明「02a:300-312, verbatim」| `apps/api/prisma/schema.prisma:373-383` |
| 轉換強制力 | ⛔ **零** —— schema 自述「not enforced by anything until M5」 | `apps/api/prisma/schema.prisma:507-509` |
| 規格 | Policy / Risk / Issue / ControlTest **4 條**已用 stateDiagram 規格化 | `docs/02-architecture/02a-data-model-spec.md:371,386,401,414` |
| Wave 1 射程 | 「policy approval flow **和** issue→action flow，含 SLA timers 與 escalation」| `docs/02-architecture/05-platform-foundation-services.md:16` |
| 決策 | OQ-7 `⚠️ 需先 spike`，2026-08-07 起未動 | `docs/decision-form.md:19` |

→ 修正必須：**（1）** 讓非法轉換被拒絕且可稽核 · **（2）** 產出「精簡 vs BPM」的可證偽判準 ·
**（3）** 用實作而非論述比較 build vs embed。**(2) 是本片的核心交付物**，(1)(3) 是取得它的手段。

### The design（thin slice: 一條生命週期 × 兩個候選實作 × 一組判準）

```
# 候選 A —— build（自建，data-driven）
apps/api/src/workflow/transitions.ts       # 轉換表：資料，不是 code
apps/api/src/workflow/transition.guard.ts  # 純 predicate（record + actor）→ allow / reject
apps/api/src/workflow/workflow.module.ts

# 候選 B —— embed（嵌入 statechart 函式庫）
#   同一條流程，改用函式庫定義 machine，量同一組指標

# 兩者共用的驗收面（不重複實作）
apps/api/src/modules/policy/*              # 呼叫端：轉換必須經過守衛
# 第三個選項 BPM engine：D004 已 defer，本片只在 ADR 紙上評估並引用該 defer
```

⭐ **為何兩個都建而不是選一個建**：`OQ-4`（稽核 hash chain）的 ADR 品質來自**兩個都實作再量**，
且量出來的結果**推翻了 Day-0 的推論**（驗證成本這個維度量到沒有訊號）。
紙上比較會讓「感覺比較乾淨」變成決策依據。

⛔ **兩個都建之後只留一個**（AP-5）—— 不做涵蓋兩者的抽象層，那正是 D004 要防的膨脹起點。

### Ground truth（recon head-start —— 於 `main` HEAD `664fcdc` 讀過的 code）

- `apps/api/prisma/schema.prisma:373-383` — `PolicyStatus` = `draft` `in_review` `approved` `published` `under_revision` `retired`
- `docs/02-architecture/02a-data-model-spec.md:360-371` — Policy 的合法轉換圖（含 `InReview → Draft: changes requested` 這條回邊）
- `apps/api/src/audit-trail/audit.module.ts:82-98` — `AUDITED_MODELS` **含 `'Policy'`** ⇒ 轉換**理應**已被稽核鉤子涵蓋，**Day 0 必須實測而非假設**
- `apps/web/src/app/(app)/policies/page.tsx` — 狀態值渲染在已接 API 的畫面上 ⇒ drive-through 有真實觀察面
- `docs/02-architecture/06-tech-stack-and-decisions.md:32` — ADR-0002 一列：「Lean configurable state machine; avoid heavyweight BPM in Wave 1」
- `docs/01-planning/DEFERRED_REGISTER.md:19` — D004 解封條件 = **OQ-7 拍板後**

**Baselines（W24 closeout；`git log 662d658..HEAD -- apps/` 為空 ⇒ 產品碼未動，數字仍有效）**:
api test **484 / 40 suites** · api int **269 / 21** · web test **104 / 11 files** ·
lint **0** · type **0** · build clean · `run_all` **11/11**（CH-046 由 10 → 11）· lint 測試 **122**
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-audit-on-transition** — grep + 實測：改一次 `Policy.status` 是否真的落一筆稽核？
  `AUDITED_MODELS` 含 `Policy` 是**欄位級**還是**列級**涵蓋？ → 影響 §Risks R2
- **D-status-writers** — grep 目前有哪些路徑會寫 `Policy.status`（seed？repository？）→ 影響 §3.1 守衛的擺放點
- **D-web-status-source** — `/policies` 的狀態值來自 API 還是 fixture？（W24 只接了列表）→ 影響 §5 AC-6 drive-through 可觀察性

## 1. Phase Goal

**拍板 OQ-7，並讓「精簡狀態機」第一次有可證偽的邊界定義。** 交付 **ADR-0002**（含可證偽條件）
與 **design note**（8-point gate，verified ratio ≥ 95%），兩者都從一個**真的跑起來**的
Policy 生命週期薄切片 extract 而來，而不是預寫。

證明方式：非法轉換被拒絕的**負面測試**（`draft → approved` 必須紅）· 每次合法轉換**落一筆稽核**
· 跨實體轉換被拒且資料未變 · 兩個候選的量測表 · **drive-through**：真瀏覽器上把一份 policy
從 `draft` 推到 `published`，畫面狀態跟著變。

## 2. User Stories

- **US-1**（強制力）: 作為 ISO 管理者，我希望非法的政策狀態轉換被拒絕，以便核准流程不能被繞過。
- **US-2**（稽核）: 作為稽核人員，我希望每一次狀態轉換都在 append-only 日誌裡留下誰/何時/從什麼到什麼，以便核准鏈可被查證。
- **US-3**（邊界）⭐: 作為維護者，我希望有一組**可證偽的判準**分辨「精簡狀態機」與「BPM」，以便下一個人加功能時知道界線在哪，而不是憑感覺。
- **US-4**（決策）: 作為架構決策者，我希望 build 與 embed 各被實作並量測過，以便 ADR-0002 的結論有實據而非偏好。
- **US-5**（drive-through）: 作為使用者，我希望在真畫面上看到政策走完 `draft → published`，以便確認這不只是通過測試。
- **US-6**（closeout）: 作為維護者，我希望 ADR-0002 + design note + OQ-7 拍板 + D004 重新評估同時落地，以便這條決策鏈不再有懸空的一端。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   apps/api/src/workflow/transitions.ts          # 候選 A：轉換表（資料）
NEW   apps/api/src/workflow/transition.guard.ts     # 候選 A：純 predicate
NEW   apps/api/src/workflow/workflow.module.ts      # 範疇入口
NEW   apps/api/src/workflow/*.spec.ts               # 單元 + 負面測試
NEW   apps/api/src/workflow/*.int.spec.ts           # 稽核 + 實體範疇的整合測試
NEW   docs/02-architecture/design-notes/W25-workflow-state-machine.md
NEW   docs/14-adr/0002-workflow-engine.md
EDIT  apps/api/src/modules/policy/*                 # 轉換必須經過守衛（呼叫端）
EDIT  docs/decision-form.md                         # OQ-7 開放 → 已拍板
EDIT  docs/01-planning/DEFERRED_REGISTER.md         # D004 重新評估（解封條件已成立）
EDIT  docs/14-adr/README.md                         # 索引 1 行
UNTOUCHED  apps/api/prisma/schema.prisma            # ⭐ 狀態值已正確，本片不改 schema
UNTOUCHED  apps/web/**                              # ⭐ 讀路徑 W24 已接；本片不碰前端
UNTOUCHED  apps/api/src/audit-trail/**              # ⭐ 稽核鉤子已存在，本片只驗證它涵蓋轉換
```

### 3.1 轉換強制力（US-1）— `workflow/transitions.ts` + `transition.guard.ts`

- 轉換表**逐字對應** `02a:360-371` 的 stateDiagram，含 `in_review → draft`（changes requested）回邊
- 守衛是**純 predicate**：`(from, to, actor, record) → allow | reject`，不做 I/O
- ⭐ **擺放點由 Day-0 `D-status-writers` 決定** —— 若有多條寫入路徑，守衛必須在**它們共同的下游**，
  否則就是一個可繞過的守衛（W19 的 25 個死控件是同一形狀）
- 錨點模仿：`entity-scope/entity-scope.resolver.ts` 的純函式 + 註解密度

### 3.2 稽核涵蓋（US-2）— 驗證而非新建

- ⛔ **不新建稽核機制**。`AUDITED_MODELS` 已含 `Policy`，本片的工作是**證明**轉換被涵蓋
- 若 Day-0 `D-audit-on-transition` 顯示**未**涵蓋 ⇒ 那是一個發現，記入 §Risks 並在 progress.md 展開

### 3.3 邊界判準（US-3）⭐ — ADR-0002 的核心

產出一組**可證偽**的判準，逐條對照本片兩條 Wave 1 流程檢驗。候選判準（spike 中確認或推翻）：

- 轉換是**設定（資料）**，不是 code
- **無** parallel / fork-join 執行
- **無** 執行期動態產生子流程
- 使用者**不能**在執行期自訂流程定義
- guard 是**純 predicate**，不是可執行 script

⇒ 任何一條被本片的實作推翻，就是一個必須寫進 ADR 的發現。

### 3.4 候選比較（US-4）— 兩個都建，量同一組指標

| 維度 | 怎麼量 |
|---|---|
| 定義同一條流程所需的行數 | `wc -l`，兩邊都排除測試 |
| 加一個狀態的成本 | 實際加一個，量改動行數與檔案數 |
| 非法轉換的錯誤訊息品質 | 是否指名 from / to / 為何拒絕 |
| 與稽核鉤子的接合 | 是否需要額外接線 |
| 相依成本 | 新增套件數 + SCA 面積 |

⛔ **不量「感覺乾淨」**。⚠️ 若某個維度**量不出訊號**，那本身是結論（OQ-4 的教訓）。

### 3.x 明確不做的事

- ❌ **SLA timers / escalation** —— `05:16` 說它們在 Wave 1 射程，但那是 **M5 本身**不是 spike。
  本片只回答「選中的形狀撐不撐得住它們」，答案寫進 design note §4 Open Invariants
- ❌ **issue→action flow** —— Wave 1 的第二條流程，M5 本身做
- ❌ **Risk / ControlTest 生命週期** —— 已規格化但不在本片
- ❌ **前端狀態轉換 UI** —— 本片的 drive-through 用既有讀路徑觀察，不建控件
- ❌ **涵蓋兩個候選的抽象層** —— AP-5，且它正是 D004 要防的膨脹起點

### 3.y Validation（US-1..US-6）

Gates: lint **0** · type **0** · api test **≥ 484**（新增本片測試）· api int **≥ 269** ·
web test **104**（不變 —— 前端未動）· build clean · `run_all` **11/11**。
加上 §5 的 **drive-through（MANDATORY）**。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/src/workflow/transitions.ts` | NEW |
| 2 | `apps/api/src/workflow/transition.guard.ts` | NEW |
| 3 | `apps/api/src/workflow/workflow.module.ts` | NEW |
| 4 | `apps/api/src/workflow/transition.guard.spec.ts` | NEW |
| 5 | `apps/api/src/workflow/workflow.int.spec.ts` | NEW |
| 6 | `apps/api/src/modules/policy/policy.controller.ts` | EDIT — **建出第一條轉換端點**。⛔ Day-0 **D1**：API 層現有 **0** 條 `Policy.status` 寫入路徑（`:104-118` 只有 `POST`，無 `@Put`/`@Patch`）⇒ 本片是**新表面**，不是替既有路徑接守衛 |
| 6b | `apps/api/src/core-model/policy.repository.ts` | EDIT — 狀態寫入方法。⚠️ Day-0 **D5**：repository 住在 `core-model/` 而非原 plan 猜的 `modules/`（`task-workflow.md` §Risk Class D 的形狀）|
| 6c | `apps/api/src/modules/policy/policy.int.spec.ts` | EDIT — AC-2 的 `from` 回推整合測試掛這裡（既有檔，非新建）|
| 7 | `docs/14-adr/0002-workflow-engine.md` | NEW |
| 8 | `docs/02-architecture/design-notes/W25-workflow-state-machine.md` | NEW |
| 9 | `docs/14-adr/README.md` | EDIT（索引 1 行）|
| 10 | `docs/decision-form.md` | EDIT（OQ-7 → 已拍板）|
| 11 | `docs/01-planning/DEFERRED_REGISTER.md` | EDIT（D004 重新評估）|
| 12 | `docs/01-planning/PROGRESS-METRICS.md` | EDIT（M5 判定 + 錨點 —— `scope_ts_count('workflow') == 0` **必然會破**）|
| — | `apps/api/prisma/schema.prisma` | **UNTOUCHED** —— 狀態值已對，本片不改 schema |
| — | `apps/web/**` | **UNTOUCHED** —— 前端零變更 |
| — | `apps/api/src/audit-trail/**` | **UNTOUCHED** —— 只驗證既有鉤子。⛔ `before` 恆為 NULL 是 `audit.recorder.ts:20-31` 的**結構性**限制（ADR-0003 的輸入），**本片不修**，見 AC-2 |
| — | `eslint.config.mjs` | **UNTOUCHED** —— Day-0 實測 `MATRIX.modules` 已含 `workflow`、`MATRIX.workflow` 已含 `core-model` / `audit-trail`（`:80-81`）⇒ 本片新增的 import 邊全部合法，boundaries 政策不需改 |

## 5. Acceptance Criteria

1. **AC-1** 非法轉換被拒絕：`draft → approved`、`published → draft`、`retired → *` 各有一條**負面測試**，
   中性化守衛後**恰好**那幾條轉紅（預測寫在執行之前）。
2. **AC-2**（Day-0 **D2** 修訂）每次合法轉換落一筆稽核，**單列**逐欄斷言 `resource_id` / `after.status`（= `to`）/ actor；
   **`from` 不在單列裡** —— 由同一 `resource_id` 的**前一筆**稽核列的 `after.status` 回推，
   且**該回推本身要有整合測試**（斷言一條 ≥ 2 次轉換的鏈能還原出正確的 `from` 序列）。
   ⛔ `before` 恆為 NULL 是 `audit.recorder.ts:20-31` 的結構性限制（`runScoped` 交給 `$transaction` 的是未啟動的
   promise 陣列 ⇒ 每個欄位必須在 domain write **之前**算得出來；能取真 before/after 的 `INSERT ... SELECT`
   被 `eslint.config.mjs:75-77` 明文禁止於該範疇）。**那是 ADR-0003 的輸入，不在本片修** ——
   本片的產出是它的第一個真實使用場景，Day 4 據此複查 ADR-0003。
   ⚠️ **反面要求**：不可寫一個只斷言 `to` 的測試然後讀成「from/to 都驗了」——
   那是 `AD-ProxyMetricAsAnswer-1` 的形狀，且會通過所有 gate。
3. **AC-3** 跨實體轉換**被拒且資料未變**，且 RLS 層獨立成立（約束 8 的四個範疇測試）。
4. **AC-4** 兩個候選各自跑得起同一條流程，§3.4 五個維度**都有數字**；量不出訊號的維度明寫。
5. **AC-5** ADR-0002 含**可證偽條件**，且 §3.3 的五條判準逐條標記「確認 / 推翻 / 未驗」。
6. **AC-6 Drive-through PASS（MANDATORY，真 UI + 真後端 + 真 DB）** —— 在 `/policies` 上觀察一份
   policy 從 `draft` 推到 `published` 的狀態變化，並嘗試一次非法轉換確認被拒；
   截圖 + observed-vs-intended 記入 progress.md。（**不是** gate-only。）
7. **AC-7** OQ-7 CLOSED（`decision-form.md` 移到已拍板）· D004 **重新評估並記錄結果**（維持 defer 或解封）·
   design note 通過 8-point gate（verified ratio ≥ 95%）· calibration 已記錄 · 導航檔 + BACKLOG 已更新。

## 6. Deliverables

- [ ] US-1 轉換表 + 守衛，非法轉換被拒（含中性化證據）
- [ ] US-2 轉換的稽核涵蓋，逐欄斷言（或：涵蓋缺口的發現記錄）
- [ ] US-3 「精簡 vs BPM」五條判準的逐條裁決
- [ ] US-4 兩個候選的量測表，五個維度
- [ ] US-5 drive-through 截圖 + observed-vs-intended
- [ ] US-6 ADR-0002 + design note + OQ-7 拍板 + D004 重新評估

## 7. Workload Calibration

- Scope class **`spike` 0.65**（`CALIBRATION-MATRIX.md:58,70` —— 6 個資料點，跨 0.30~1.03，
  `KEEP`；本片是**第 7 個**資料點。理由符合該 class 定義：新領域、無藍本、探索成本無法事先拆解）。
- **Agent-delegated: `no`**（spike 的交付物是**決策**，而 agent 回報的「全綠」不能替代判斷；
  且 §3.4 的比較需要同一個人對兩個實作有第一手感受）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est **~20.5 hr**（Day 0 verify 1.5 · 候選 A 5 · 候選 B 4 · 比較+drive-through 3 · closeout 5
  · **+2.0 Day-0 修訂新增**：轉換端點是新表面而非既有路徑接線 **+1.5**（D1）· `from` 回推的整合測試 **+0.5**（D2））
  → class-calibrated commit **~13.3 hr**（mult 0.65）。Day-4 retro Q2 驗證。
  ⚠️ 原值 18.5 → 12.0 於 Day-0 Go/no-go（20-50% 範圍變動）修訂，使用者 2026-08-21 核可 **(A)**。

⚠️ **本欄同時登記一個可證偽的預測**：近三片的 `actual / bottom-up` 是
W22 **0.26** · W23 **0.25** · W24 **0.141**（`AD-BottomUpEstimateInflated-1`：該修的是估算方法不是乘數）。
若該趨勢成立，本片 actual 會落在 **~2.9–5.3 hr**（0.141~0.26 × 20.5），遠低於 committed 13.3 ⇒ ratio 約 **0.22–0.40 UNDER**。
**若 Day-4 實測落在這個區間，那就是第 4 個資料點，估算方法必須改而不是繼續調乘數。**

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **R1 ⭐ 範圍蔓延成 BPM** —— 這正是本片要防的東西，而它會在本片內發生 | §3.x 明列五項不做的。⛔ **每加一個能力先問「§3.3 哪一條判準允許它」** —— 答不出來就是越線 |
| **R2 稽核可能未涵蓋轉換** —— `AUDITED_MODELS` 含 `Policy` 是**假設**不是實測 | Day-0 `D-audit-on-transition` **實測一次**。若未涵蓋，那是發現不是失敗，記入 progress + §Risks |
| **R3 守衛可繞過** —— 若有多條寫 `status` 的路徑而守衛只擋一條 | Day-0 `D-status-writers` 枚舉全部寫入路徑；守衛放在共同下游。**中性化驗證：繞過路徑必須也紅** |
| **R4 兩個候選的比較退化成偏好** | §3.4 五個維度**都要有數字**；量不出訊號的維度明寫「無訊號」（OQ-4 前例）|
| **R5 design note 變成 pre-write** | `spike-design-note-gate.md` §核心紀律：**extract 不是 pre-write**。Day 4 才寫，且每個 claim 帶 `file:line` |
| **R6 陳舊 dev server 掩蓋 wiring** —— 守衛接在 module 層，只在啟動時生效（Risk Class C）| drive-through 前**乾淨重啟**並擷取 startup log；驗證「活著的服務程序」不是「port 擁有者 PID」|
| **R7 `PROGRESS-METRICS.md` 的 M5 錨點必然會破** —— `scope_ts_count('workflow') == 0` 在第一個檔落地時就紅 | ⭐ **這是設計要的行為**（CH-046 的整個重點）。Day 1 第一個 commit 就要**重新判定 M5 並同時更新兩格**，不是只改數字 |
| **R8 ADR 缺可證偽條件** —— 18 條 ADR 漂移的根因家族 | `14-adr/README.md` 的 forcing-function 判準；AC-5 明列 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **SLA timers / escalation** — M5 本身（`05:16` 的 Wave 1 射程）
- **issue→action flow** — M5 本身，Wave 1 的第二條流程
- **Risk / ControlTest / 其餘 6 個 `*Status` 的生命週期** — 各自的模組片
- **前端狀態轉換控件** — 需要 M4（誰有權轉換）先落地
- **BPM engine 評估的實作面** — D004 已 defer；本片只在 ADR 紙上評估並引用該 defer
- **`AD-58` / M4 前置** — 卡外部，與本片無依賴關係
