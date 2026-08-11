---
status: active   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W06 Plan — M1 slice 3: the control library and the asset write path

**Summary**: 建 `Control`（M7 的前置）與**資產鏈的三個寫入端點**，並用後者補齊 W05 明文承諾但當時
無法交付的四項範疇測試。⭐ **`Control` 帶來一個本 repo 沒有先例的問題**：`applies_to_scope`
（`02a:217`）讓**範疇成為每一列的屬性**而不是每張表的屬性 —— 現有的 RLS 形狀答不了它。
**關鍵範圍決策**：**不建** `SoA` / `ControlTest` / `Risk↔Control` 連結（slice 4 / M7）。
⚪ **無 UI** → drive-through 不適用，一律標 **API-level verified**。
❓ **design note 視 D1 的裁決而定** —— 若 `applies_to_scope` 需要新的 RLS 形狀，那是新知識（見 §1）。

**Status**: **Approved-to-execute**（使用者核可 2026-08-11；範圍由使用者從四個選項中裁決 ——
`Control` + 資產鏈端點，`SoA`/`ControlTest` 延到 slice 4；CLAUDE.md 瘦身併入本 phase）。
✅ **D1 已於 2026-08-11 Day 1 由使用者拍板：形狀 A′（四條 per-command policy）**，
且 **`subtree` 不建**（enum 只有 `entity` + `group`）。**§3.1 的三個選項原文不覆寫** ——
它們是當時的選項空間，實測結果與裁決在 [progress.md](./progress.md) §1.b。
⭐ **後果（§1 / §7 早已寫明的條件被觸發）**：A′ 是本 repo **第一個非單一 `FOR ALL` 的 policy 形狀**
→ **本 phase 改判 spike**（class `spike` **0.65**，Day 4 補 design note）+ **ADR-0014**。
⚠️ **Day-0 推翻了本 plan 的三項斷言** —— **D2 / D3 已消失**（`02a:123-124` 定義了值域），
且不對稱 RLS **有 W03 的先例**（`extension_fields`）。§3.1 的選項原文**刻意不覆寫**；
Day-0 的處置全部加在 §8。完整紀錄見 [progress.md](./progress.md) Day 0。

**Branch**: `feature/W06-m1-control-and-asset-endpoints`
**Base**: `main` HEAD `eabb437`（W05 closeout，#36/#37/#38/#39/#40 全數 merged）
**Slice**: M1 slice **3 / N** —— 建 1 個實體（累計 8 / 35）+ 3 個端點；**不關 M1**（DoD 需全部核心實體）
**Scope decisions**: (a) `Control` 一張表，**不含** `SoA` / `ControlTest` / `Risk↔Control`
(b) **含三個寫入端點**（`/controls` · `/assets` · `/asset-groups`）—— 前者證明 `Control` 的範疇語義，
後兩者是 W05 🚧 的解封事件
(c) **CLAUDE.md 結構性瘦身併入本 phase 且開工前先做**（使用者裁決；吃掉本 phase 的 1 個治理配額）
(d) 認證仍是 `dev-principal`，M4 才換

---

## 0. Background

### The gap（W05 的 🚧 carryover + M7 的前置鏈）

三件事今天同時卡著：

- **`AssetGroup` / `Asset` 的四項範疇測試不存在。** W05 建了表與 RLS，但**兩張表沒有端點** ——
  「跨實體寫拒」需要一個會寫它們的呼叫者，而硬造測試專用寫入路徑違反約束 2。
- **`Control` 不存在**，所以 `Risk.treatment` 是一個**沒有標的的欄位**，
  M7 的 `Risk ↔ Control` 與 M8 的 control coverage 指標都沒有地基。
- **`CLAUDE.md` headroom 剩 196 bytes**（29,804 / 30,000），
  而 `check_rules_hygiene.py` 是 **CI 硬 gate** —— 下一次 closeout 光改一行就可能紅。

### Why it matters（缺失的能力）

**第一項是合規等級的，不是待辦等級的。** 約束 8 把實體隔離失敗定義為合規事故；
`asset_groups` / `assets` 今天只有**靜態證據**（`pg_class` 顯示 policy 存在），
**沒有行為證據**（沒有任何測試看過它拒絕一次跨實體寫入）。
W05 的元驗證剛剛證明過這種缺口的形狀：**RLS 全中性化而測試仍綠**。

第二項擋的是里程碑鏈：`08:26` 的 control coverage（「% of risks with ≥1 linked control」）
與 `03:92` 的 `control_coverage_effective` 都以 `Control` 為來源。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `eabb437`）| Anchor |
|-------|--------------------------------------------|--------|
| 已建實體 | 10 個 model —— W05 加了 5 個；`Control` **零命中** | `schema.prisma:413-664` |
| 端點 | 只有 `/policies` 與 `/risks`；**沒有任何端點寫 asset** | `app.module.ts` |
| W05 的 🚧 | 「解封：slice 3 建 `POST /assets` 時同一個 PR 補齊」 | `W05-*/checklist.md:185-191` |
| ⭐ `Control` 的範疇 | **`applies_to_scope` = this entity only / subtree / **group-shared** | `02a:217` |
| ⭐ 而它的後果被明文寫出 | 「a **group-shared** control **may link to any entity's risks**」 | `02a:412` |
| `type` / `effectiveness` 值域 | **已定義** —— `preventive·detective·corrective` / `not_tested·effective·partially_effective·ineffective` | `02a:122` · `02a:125` |
| `nature` 值域 | **只在設計交付物裡** —— `manual/automated/hybrid` | `09:54` |
| `frequency` 值域 | ⛔ **全 repo 未定義** | （零命中 —— Day-0 Prong 2 複驗）|
| `effectiveness` 的來源 | 「reflects the latest completed `ControlTest`」—— **本 phase 不建 ControlTest** | `02a:416` |
| 可複製的形狀 | W04 七不變式 **可複製 6 / 不適用 1 / 需調整 0** + W05 追加兩條 | `W05-*/retrospective.md` §US-6 |
| CLAUDE.md 預算 | **29,804 / 30,000**，headroom **196** | `AD-ClaudeMdBudget-1` |

→ 資產端點是**純粹的形狀複製**（W05 的藍本已被裁決可複製）；
**`Control` 不是** —— `applies_to_scope` 讓範疇成為**每一列的屬性**，
而本 repo 至今每一張表的範疇都是**表級**的（scoped 或 global，二選一）。
現有的 `USING (org_entity_id = ANY(app_entity_scope()))` 形狀**表達不出** group-shared。

### The design（backend-only：1 個新 model + 1 個 migration + 3 個端點 + CLAUDE.md 瘦身）

```
EDIT  CLAUDE.md + docs/…                # 先做：非導航內容移出，留指標（買回 headroom）
NEW   core-model/control.repository.ts  # 第三個範疇化 client 消費者
NEW   core-model/asset.repository.ts    # AssetGroup + Asset 的寫入路徑（W05 🚧 的解封）
NEW   modules/control/                  # POST/GET /controls
NEW   modules/asset/                    # POST/GET /assets · POST/GET /asset-groups
NEW   prisma/migrations/<ts>_control_library/
        - Control  (entity-scoped + ⛔ applies_to_scope 的處置依 D1)
EDIT  prisma/schema.prisma              # +1 model +3 enum（type / nature / applies_to_scope）
```

**為何資產端點與 `Control` 同一片**：兩者都需要「第三個 repository」的形狀，
且資產端點是 W05 **明文承諾**的解封事件。拆開會讓那個承諾再延一片，
而它擋的是一條合規等級的驗證缺口。

### Ground truth（recon head-start —— 於 `main` HEAD `eabb437` 讀過的 code）

- `02a:217` — `Control` 九個欄位；`applies_to_scope` 三個值
- `02a:412` — group-shared control **may link to any entity's risks**（本 phase 最重要的一句）
- `02a:404` — `Risk ↔ Control` M:N，「a **treated** risk should have ≥1 control」，
  **enforced at the Treated transition**（M5 workflow）→ 連結表不是本 phase 的
- `02a:125` — `effectiveness` 的 enum **含 `not_tested`** —— 沒有 ControlTest 時的誠實答案已被規格化
- `risk.repository.ts:126-144` — validate → catalog → issue ref_code → insert → translate 的順序
- `scoped-client.types.ts:82-100` — `ScopedRiskClient` **不暴露** `asset` delegate 的理由
- `W05-*/retrospective.md` §US-6 — 兩條新條款：**表之間 FK 一律複合** ·
  **每張新表要有繞開發號的直接寫入測試**

**Baselines（W05 closeout）**: unit **138** · int **54** · web **10** · lint **0** · type **0** ·
format **0** · build **0** · `run_all` **6/6** · `lint:negative` PASS（22 檔 0 bypass 3 allowlisted）·
coverage **94.13 / 92.17 / 94.36 / 95.03**
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-frequency** — `Control.frequency` 的值域全 repo 零命中 → **零命中要先證明搜對地方**
  （W05 Day-0 在這件事上失手兩次）。若真的未定義 → D2 直接適用 `AD-AssetScales-1` 的先例
- **D-nature** — `nature` 的值域只出現在 `09:54`（設計交付物）。權威排序上 `09` 也在
  `02-architecture/` 內 → 需確認它算不算「設計文件」而非 mockup
- **D-groupscope** — `02a:412` 之外，是否還有別處規定 group-shared control 的可見性？
  **這決定 D1 的選項空間**
- **D-w05shape** — W05 retro §US-6 的兩條新條款逐條確認仍成立（本 phase 是它們的第一個負載）
- **D-claudemd** — 量測 `CLAUDE.md` 實際 headroom 與 `check_rules_hygiene.py` 的預算來源

## 1. Phase Goal

把 `Control` 從 `02a` 的一行規格變成 runtime，**且明確拍板 `applies_to_scope` 的範疇語義**；
同時用三個寫入端點讓 `AssetGroup` / `Asset` 的隔離**從靜態證據變成行為證據**。
可測量目標：`02a` §0 的 Wave 1 shared core 未建數 **-1**；約束 8 四項對 `AssetGroup` / `Asset` /
`Control` 三張表成立（`Risk` 已於 W05 成立）；`CLAUDE.md` headroom **≥ 1,500 bytes**。
證明方式：gates + **API-level 驗證**（真進程 + 真 PostgreSQL + 真 RLS）+ **元驗證**。
⚪ 無 UI → **不做 drive-through**，一律標 API-level verified。
✅ **條件已觸發（2026-08-11）**：D1 拍板為 A′ —— `applies_to_scope` 確實需要一個新的 RLS 形狀
（四條 per-command policy，寫入側 `USING` 收窄），本 repo 至今每張表都是單一 `FOR ALL`。
→ **改判 spike，Day 4 補 design note**（§7 的 class 已同步改為 0.65）。

## 2. User Stories

- **US-1**（budget）: 作為每個 session 的自己，我希望 `CLAUDE.md` 有可用的 headroom，
  以便下一次 closeout 不會被 CI 硬 gate 擋住。
- **US-2**（decision）: 作為架構決策者，我希望 `applies_to_scope` 的範疇語義**被明確拍板並記錄**，
  以便它不會變成第 20 張表才被發現的隱性假設。
- **US-3**（schema）: 作為資料模型維護者，我希望 `Control` 存在且範疇語義正確，
  以便 M7 的 `Risk ↔ Control` 有真實標的而不是註解裡的承諾。
- **US-4**（carryover）: 作為合規負責人，我希望 `AssetGroup` / `Asset` 通過約束 8 四項，
  以便那兩張表的隔離有**行為證據**而不只是 policy 存在的靜態證據。
- **US-5**（validation）: 作為單人開發者，我希望每個宣稱會擋住某件事的機制都有一個**會被它擋住**的
  常駐案例（`AD-NegativeGate-1` 第 9 個實例）。
- **US-6**（closeout）: 作為下一個 session 的自己，我希望知道 W05 追加的兩條條款**是否真的夠用**，
  以便 slice 4 不用再問一次。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
EDIT      CLAUDE.md                                         US-1：非導航內容移出
NEW/EDIT  docs/02-architecture/… 或 docs/rules-on-demand/…   US-1：被移出內容的落點
NEW       apps/api/src/core-model/control.repository.ts     + .spec.ts
NEW       apps/api/src/core-model/asset.repository.ts       + .spec.ts
NEW       apps/api/src/modules/control/{controller,module,int.spec,controller.spec}.ts
NEW       apps/api/src/modules/asset/{controller,module,int.spec,controller.spec}.ts
NEW       apps/api/prisma/migrations/<ts>_control_library/migration.sql
EDIT      apps/api/prisma/schema.prisma                     +1 model +3 enum
EDIT      apps/api/src/core-model/scoped-client.types.ts    ScopedControlClient · ScopedAssetClient
EDIT      apps/api/src/bootstrap/app.module.ts              掛兩個 module
EDIT      apps/api/test/int-global-setup.js                 control seed
UNTOUCHED apps/api/src/entity-scope/**                      W02/W03 機制不動
UNTOUCHED apps/api/src/modules/{policy,risk}/**             既有模組不動
UNTOUCHED apps/web/**                                       無 UI 工作
```

### 3.1 ⛔ 需要拍板的決定（**助手不得自行選**）

> W04/W05 的教訓：**先拍板語義，再決定要建什麼。** D1 可能構成 **ADR-0014**。

**D1 ⭐⭐ `applies_to_scope` 的範疇語義 —— 本 phase 唯一真正新的問題**

本 repo 至今每一張表的範疇都是**表級**的：scoped（`org_entity_id NOT NULL` + RLS）
或 global（`users` / `threats` / `vulnerabilities`）。**`Control` 兩者皆非** ——
`02a:217` 讓同一張表裡有些列只屬於一個實體、有些列是全集團共用的。

| | 說明 | 代價 |
|---|---|---|
| **A. `org_entity_id` NOT NULL + RLS 加一條 group 分支** | policy 變成 `USING (applies_to_scope = 'group' OR org_entity_id = ANY(...))`；group-shared 列仍有一個「擁有者」實體 | 讀得到但不一定寫得到，`WITH CHECK` 與 `USING` 首次不對稱 —— **需要一組專門測試釘住那個不對稱** |
| **B. `org_entity_id` nullable，NULL = group-shared** | 語義最直白 | ⚠️ 打破約束 8 鐵律 1（**所有業務 table 必有 `entity_id NOT NULL`**）→ 需要 guardrail 級的舉證 |
| **C. 本 phase 只做 entity-local，`applies_to_scope` 延後** | 最小、最安全；`02a` 的欄位先不建 | ⚠️ 建了一張**與規格不符**的表，且下一片要 migration 改 RLS —— W04 說過「改 RLS 錨點等於改 32 張表的語義」|

⚠️ **我的傾向是 A**，但**不自行選** —— 它讓 RLS 的 `USING` 與 `WITH CHECK` 第一次不對稱，
那是一個會被複製到後續每一張「有共用列」的表上的形狀。**若判為架構級 → ADR-0014。**

**D2 `frequency` 的值域** —— 若 Day-0 確認全 repo 未定義，適用 `AD-AssetScales-1` 的先例
（自行發明值域違反已確認參數 #9）。選項：建欄但值域為自由文字 / **不建該欄** / 先拍板值域。

**D3 `nature` 的權威** —— 值域只出現在 `09:54`（UI design brief）。
`09` 位於 `docs/02-architecture/` 因此是設計文件，但它描述的是**畫面**而非資料模型。
需裁決它算不算 `02a` 的合法補充。

### 3.2 `Control` 的範疇語義（US-3）— 判準沿用 W04/W05

| 表 | 範疇 | 判準（W04 design note §2.1 的那一句）|
|---|---|---|
| `Control` | **依 D1** | 「這張表上的一次寫入，跨實體時是不是一件該被拒絕的事」——
⭐ **答案第一次是「看情況」**，而那正是 D1 要處理的東西 |

### 3.3 資產寫入端點（US-4）— 純粹的形狀複製

- `POST/GET /assets` · `POST/GET /asset-groups`，比照 `risk.controller.ts`
- `asset.repository.ts` 沿用 W05 的順序：validate → catalog → `issueRefCode` → insert → translate
- ⭐ **W05 追加條款的第一個負載**：`assets → asset_groups` 已是複合 FK（W05 建的），
  所以本 phase 要驗的是**那條 FK 真的會拒絕**，而不只是它存在
- ⭐ **第二條條款**：兩張表各要有一個**繞開發號**的直接寫入測試
  （W05 的 int 11b 形狀），否則它們的 `WITH CHECK` 一樣是零覆蓋

### 3.x 明確不做的事

- **`StatementOfApplicability`** —— slice 4。它需要 `framework_id`（`02a:215`），
  而 `Framework` / `FrameworkControl` 兩張表都不存在
- **`ControlTest`** —— slice 4 / M7。`effectiveness` 因此永遠是 `not_tested`，
  ⚠️ **而那是規格化過的誠實答案**（`02a:125`），不是佔位值
- **`Risk ↔ Control` 連結表** —— M7。`02a:404` 明訂它在 **Treated transition** 被強制，
  而狀態機是 M5。今天建連結表 = 零消費者（AP-5）
- **`Framework` / `FrameworkControl`** —— `framework_refs` 本 phase 是**字串陣列**不是 FK
- **稽核軌跡** —— M3。⚠️ 本 phase 再新增**三條**無稽核的寫入路徑，`RISK_REGISTER` R4 敞口再擴大

### 3.y Validation（US-1..US-6）

Gates: lint **0** · type **0** · format **0** · unit **≥ 138** · int **≥ 54** · web **10** ·
build **0** · `run_all` **6/6** · `lint:negative` PASS（**allowlist 不得增加**）· coverage 不低於 baseline。
**API-level 驗證**（真進程 + 真 PostgreSQL + 真 RLS）取代 drive-through —— 無 UI，**明確標示**。
**元驗證**（US-5）：`Control` 的 RLS（含 D1 的 group 分支）· 資產鏈的複合 FK ·
兩張表的 `WITH CHECK` 各中性化一次，確認對應測試轉紅再還原。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `CLAUDE.md` | EDIT —— US-1，**開工前先做** |
| 2 | 被移出內容的落點（Day-0 決定路徑）| NEW / EDIT |
| 3 | `apps/api/prisma/schema.prisma` | EDIT |
| 4 | `apps/api/prisma/migrations/<ts>_control_library/migration.sql` | NEW |
| 5 | `apps/api/src/core-model/control.repository.ts` + `.spec.ts` | NEW |
| 6 | `apps/api/src/core-model/asset.repository.ts` + `.spec.ts` | NEW |
| 7 | `apps/api/src/core-model/scoped-client.types.ts` | EDIT |
| 8 | `apps/api/src/modules/control/` ×4 | NEW |
| 9 | `apps/api/src/modules/asset/` ×4 | NEW |
| 10 | `apps/api/src/bootstrap/app.module.ts` | EDIT |
| 11 | `apps/api/test/int-global-setup.js` | EDIT |
| 12 | `docs/02-architecture/02a-data-model-spec.md` | EDIT —— D1 裁決註記 |
| 13 | `docs/03-implementation/changes/CH-021-w06-*.md` | NEW |
| 14 | `docs/14-adr/0014-*.md` | NEW —— **僅當 D1 判為架構級** |
| — | `apps/api/src/entity-scope/**` | **UNTOUCHED** |
| — | `apps/api/src/modules/{policy,risk}/**` | **UNTOUCHED** |
| — | `apps/web/**` | **UNTOUCHED** |

## 5. Acceptance Criteria

1. `CLAUDE.md` headroom **≥ 1,500 bytes**，且移出的內容**有落點與指標**（不是刪掉）
2. **D1–D3 已拍板並記錄理由**；若 D1 判為架構級 → ADR-0014 含**可證偽條件**
3. `Control` 存在，範疇語義依 D1 落地，`type` / `nature` / `effectiveness` 值域**逐字對照 `02a`**
4. 約束 8 四項對 **`AssetGroup` / `Asset` / `Control`** 成立（跨實體讀拒 / 跨實體寫拒且資料未變 /
   RLS 層獨立成立 / 滾升只看授權子樹）—— ⭐ **W05 checklist 2.4 的 🚧 於本 phase 關閉**
5. 三個端點可用：`ref_code` 由伺服器發、跨實體回 **404 不是 403**、
   三種拒絕（RLS / 複合 FK / 不存在）body **逐字相同**
6. **元驗證 PASS**：每個機制中性化 → 對應測試紅 → 還原 → 綠（`AD-NegativeGate-1` 第 9 個）
7. Gates 全綠（§3.y 逐項），**逐項寫實際輸出，不寫「都過了」**
8. ⚪ **無 drive-through** —— 報告標 **API-level verified**，不暗示可用性
9. **W05 追加的兩條條款逐條裁決「夠用 / 需再加」**，寫進 retrospective（US-6）
10. calibration 已記錄；導航檔 + BACKLOG + ROADMAP 已更新；`AD-ClaudeMdBudget-1` **CLOSED**

## 6. Deliverables

- [ ] US-1 `CLAUDE.md` 瘦身 + 移出內容的落點
- [ ] US-2 D1–D3 拍板 + 理由記錄（ADR-0014 若需要）
- [ ] US-3 `Control` 表 + migration + `/controls` 端點
- [ ] US-4 `/assets` · `/asset-groups` 端點 + 約束 8 四項（**關掉 W05 的 🚧**）
- [ ] US-5 元驗證 + 常駐負面案例
- [ ] US-6 CH-021 + retrospective（含兩條條款的夠用性裁決）+ closeout

## 7. Workload Calibration

- ~~Scope class **`pattern-reuse-feature` 0.50**~~ → ⭐ **改判為 `spike` 0.65**（2026-08-11 Day 1）。
  觸發的是本欄原本就寫好的條件：「若 D1 需要一個新的 RLS 形狀 → 改歸 `spike` 0.65 並記入 retro Q2」。
  D1 拍板為 **A′**，而 A′ 是本 repo **第一個非單一 `FOR ALL`** 的 policy 形狀 → 條件成立。
  ⚠️ **本 phase 的兩半仍不同質**：資產端點是純形狀複製，`Control` 的 `applies_to_scope` 不是 ——
  **改判取的是兩者中較高的那一個**，retro Q2 需說明這個混合對 ratio 的影響（**US-6 的一部分**）。
- **Agent-delegated: no**（範疇語義是 guardrail 級判斷，委派的複驗成本大於節省）。
  `agent_factor` **1.0** → 三段式。
- Bottom-up est **~13 hr**（Day-0 verify 0.5 · CLAUDE.md 瘦身 1.0 · D1–D3 論證 1.5 ·
  schema + migration 1.5 · control repository + 端點 1.5 · 資產端點 ×2 2.0 ·
  範疇測試 ×2 表 1.5 · 元驗證 1.0 · API 走查 1.0 · closeout 1.5）→
  ~~class-calibrated commit ~6.5 hr (mult 0.50)~~ → **~8.5 hr (mult 0.65)**。Day-4 retro Q2 驗證。
  ⚠️ **`actual` 的定義依 `AD-CalibrationMetric-2` 改為 branch 第一個 commit → closeout commit**，
  並明記 plan 起草不在窗口內（故為下界）。**這是那條 AD 的第一次實際套用。**

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ⭐⭐⭐ **【Day-0 `D-precedent`】不對稱的 `USING`/`WITH CHECK` 不是新形狀，我在 §3.1 / §8 寫錯了** | `extension_fields`（W03，`20260810134319_*/migration.sql:80-83`）**已經是**這個形狀，理由（`:73-79`）幾乎逐字就是 `Control` 的問題。⭐ **後果一**：§1/§7 的「需要新 RLS 形狀 → 改判 spike」條件**大概率不成立**，class 維持 `pattern-reuse-feature` 0.50。⭐ **後果二**：D1 的問題從「發明什麼形狀」變成「**`extension_fields` 的鐵律 1 豁免理由，能不能移轉到一張業務表**」—— 它是 **catalog** 不是業務表，這個差別正是 D1 要裁決的東西。**Day 1 的量測重心隨之改變**（見 progress.md Day 0）|
| ⭐ **【Day-0 `D-frequency` / `D-nature`】§0 與 §3.1 對兩個值域的斷言是錯的** | `02a:123` = `manual·automated·hybrid`；`02a:124` = `continuous·daily·weekly·monthly·quarterly·annual·event-driven`。**兩者都已定義** → **D2 / D3 消失**，照抄即可。⚠️ 錯因記錄在 progress.md：recon 的 pattern 命中同一張值域表的第 122、125 列而**漏掉 123、124**，然後我把「沒搜過」寫成「零命中」。**比 W05 那兩次嚴重** —— 那兩次是 pattern 寫錯，這次是根本沒搜 |
| **【Day-0 `D-groupscope`】D1 的選項空間被兩份文件壓縮** | `02-core-data-model.md:26` 把 `org_entity_id` **明列在 `Control` 的欄位清單裡** → 選項 B（nullable）與它衝突；`00-project-charter.md:59` 把 group-shared control library 列為**痛點「不一致的作法」的解法之一** → 選項 C（延後）砍掉憲章的價值主張。⛔ **仍不代選** —— 呈報後由使用者拍板 |
| ⭐⭐ **D1 選錯 → 每一張「有共用列」的表都要重來** | 先拍板再寫 code（W04/W05 的順序教訓）。⚠️ **它同時改變 RLS 的形狀本身**（`USING` 與 `WITH CHECK` 首次不對稱），而 W02 的 `app_entity_scope()` 是所有 policy 的共用基礎 → 若判為架構級就寫 ADR-0014 |
| ⭐ **本 phase 判為 pattern-reuse，但一半可能是 spike** | §1 與 §7 已寫明改判條件與後果。**US-6 就是這個判斷的驗收** |
| **`applies_to_scope` 讓 RLS 的兩個方向不對稱** | 必須有一組測試釘住**讀得到但寫不得**；⚠️ 只測讀或只測寫都會讓另一半靜默失效 —— 那正是 W05 M2 找到的缺口形狀 |
| ⭐ **【W05 條款 2】新表的 `WITH CHECK` 可能又是零覆蓋** | `Control` 走 `issueRefCode`，所以**拒絕會再次落在 counter 上**。**必須有繞開發號的直接寫入測試**（W05 int 11b 的形狀），否則同一個缺口第 3 次 |
| **`effectiveness` 沒有來源**（ControlTest 不建）| `02a:125` 的 enum **含 `not_tested`** → 那是規格化的誠實答案。⚠️ docstring 必須明寫「這不是佔位值」，否則它是 AP-3 |
| **`frequency` / `nature` 值域未定義** | D2/D3 拍板；預設立場是**不建未定義值域的欄位**（`AD-AssetScales-1` 先例） |
| **CLAUDE.md 瘦身動到 always-loaded 內容** | ⚠️ **移出 ≠ 刪除** —— 每一段移出的內容要有落點與指標。`check_path_references.py` 會驗路徑，但**不驗內容還在** |
| **Risk Class C** — 陳舊 dev server 掩蓋 wiring | Day 3 clean restart；驗「活著的服務程序」不是「port 擁有者 PID」。⚠️ port 3200 那組**不是我開的**（W04/W05 兩次都正確地沒碰） |
| **`AD-DbBuildPathParity-1`** — CI 綠不涵蓋 reset 過的庫 | 本 phase 若動 GRANT，**必須在 throwaway 庫上重現 reset 路徑**（W05 已驗證此法可行且零風險）|
| **Risk Class A** — 測試間 fixture 汙染 | control seed 進 `int-global-setup.js`；斷言**順序無關**（`AD-JestFileOrder-1`）|
| **範圍偏大（1 表 + 3 端點 + 瘦身）** | 可縮減點已標明：`/asset-groups` 可延（但那會讓 W05 的 🚧 只關一半 —— **不建議**）|

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **`SoA` · `ControlTest` · `Framework` · `FrameworkControl`** — M1 slice 4
- **`Risk ↔ Control` 連結表** — M7（`02a:404` 明訂在 Treated transition 強制，狀態機是 M5）
- **`Issue` · `Action` · `Evidence`** — 零消費者，等有東西產生 findings
- **稽核軌跡** — M3。⚠️ R4 敞口本 phase 再擴大三條寫入路徑
- **`AD-RiskBand-1` 的分帶拍板** — M8 之前，不在本 phase
- **W01 的兩個失效 SHA**（`e6ddff1` / `6ec4bf9`）— 留給 `AD-DesignNoteAnchor-1` 的 detector
  當第一批驗收命中（使用者 2026-08-11 排序）
