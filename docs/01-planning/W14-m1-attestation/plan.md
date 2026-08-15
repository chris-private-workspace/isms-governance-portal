---
status: closed_partial   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W14 Plan — Attestation, and the second polymorphic link

**Summary**: 建 `Attestation`（`02a:235`），並關掉**兩處寫在程式碼裡的等待點** ——
`EvidenceLinkedType` 的第二個值與 `Policy.requires_attestation`。
核心不是建表，是 **`evidence_linked_in_scope` trigger 今天硬編碼查 `control_tests`**：
加一個 enum 值而不改 trigger，會讓 attestation 證據被 fail-closed 拒絕。
⭐ 本片同時是 **W13 漂移守衛的第一次實戰** —— 新表若沒接稽核，那條測試必須自己轉紅。
⚪ 純後端，**無 user-facing surface ⇒ 不做 drive-through，且不得暗示可用性**。
非 spike（複用 W07 pattern）⇒ **不產 design note**。

**Status**: **closed_partial**（2026-08-15）—— 六個 US 交付五個，**US-3 移出 → M6**
（`AD-PolicyAttestationFlag-1`）。✅ **PR #63 MERGED** 2026-08-15（`e9ab83a`）。
原始核可紀錄保留：**Approved-to-execute**（laitim2001，2026-08-15 —— 範圍先由使用者在三個候選中
裁定為「`Attestation` 單張」，plan 起草後核可開始 Day 0）

**Branch**: `feature/W14-attestation`
**Base**: `main` HEAD `91bd789`（W13 closeout 的最後一個 commit，PR #61 rebase merge）
**Slice**: M1 slice 9 / N —— 21 → **22 / 35** 實體；同時推進 **M6（Policy）DoD 的一半**
**Scope decisions**: (a) 一張新表，**不建** `Jurisdiction` / `Event`；(b) `result` 建、`status`
**不建**（§3.2 論證）；(c) trigger 改為**依 `linked_type` 分支**而非新增第二個 trigger；
(d) 端點只做 **create + list**，不做 update（今天全 codebase 零個 `client.*.update`）

---

## 0. Background

### The gap（`EvidenceLinkedType` 一個值 · `Policy.requires_attestation` 缺席）

- `02a:227` 說 `Evidence.linked_type` 是 polymorphic「test / attestation / assessment」，
  W07 **只建了 `control_test` 一個值**，理由是後兩者的表不存在。
- `02a:202` 給 `Policy` 一個 `requires_attestation` (bool)。`schema.prisma:246` 只有一行註解
  說它屬於「the Policy module itself (M6)」—— **欄位沒建**。
- `02a:235` 的 `Attestation` 規格完整，但表不存在。

⇒ 三處各自都是「有記錄的等待」，而它們**等的是同一張表**。

### Why it matters（缺失的能力）

政策發布之後**沒有任何地方能記錄誰簽了**。`Policy` 的生命週期（`02a:§4` 第一張圖）走到
`Published` 就沒有下一步，而 `07` 的 M6 DoD 寫的是「Policy lifecycle **+ attestation**」。
⇒ M6 今天**結構上不可達**，不是還沒做。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `91bd789`）| Anchor |
|-------|--------------------------------------------|--------|
| enum | `EvidenceLinkedType` 只有 `control_test`，註解說明為何等 | `schema.prisma:557-567` |
| 關聯 | `linked_id` **刻意無 Prisma relation** —— 建了就會 emit 真 FK 到 `control_tests`，而那把 FK「would reject every attestation id」 | `schema.prisma:1107-1112` |
| **trigger** | ⭐ `evidence_linked_in_scope` **硬編碼** `assert_parent_in_scope('control_tests','linked_id')`；migration 自己寫明「a future attestation id would not be found in control_tests and **would be refused**」 | `migration.sql:229-236` |
| Policy | `requires_attestation` **不在 schema**，只有一行註解指向 M6 | `schema.prisma:246` |
| lifecycle | §4 給了 Policy / Risk / Issue / ControlTest 狀態機，`417` 另列 Action / Assessment / Event —— ⭐ **獨缺 Attestation** | `02a:358-417` |
| 稽核 | `AUDITED_MODELS` 15 個，W13 的漂移守衛從 `core-model` 原始碼導出寫入面雙向比對 | `audit.module.ts` · `audit-coverage.int.spec.ts` |

→ 修正必須做四件事，**而第三件是唯一有失敗風險的**：建表 · 加 enum 值 ·
**把 trigger 從「查一張表」改成「依 `linked_type` 決定查哪張表」** · 補 `Policy` 欄位。

### The design（BE-only：1 張新表 + 1 個 trigger 分支 + 1 個 Policy 欄位 + endpoints）

```
attestations                      NEW  — 02a:235 的六個欄位 + §1.1 base fields
  subject_type enum(policy|control)    ← 兩個父表都已建 ⇒ 與 evidence 不同，這裡兩支都可查
  subject_id   uuid, NO FK             ← 沿用 evidence 的判斷（schema.prisma:1107-1112）
  user_id, attested_at, result

assert_parent_in_scope()          EDIT — 目前 signature 是 (table, column)；
                                         改為可依呼叫端傳入的欄位值分派，或新增一個
                                         polymorphic 變體。Day 1 量測後定案（§3.2）

EvidenceLinkedType                EDIT — + attestation（第二個值）
Policy.requires_attestation       NEW  — bool, default false
AUDITED_MODELS                    EDIT — 15 → 16（⭐ 不做的話 W13 守衛會紅）
```

**為何不新增第二個 trigger**：兩個 `BEFORE INSERT` trigger 在同一張表上的執行順序由**名稱字母序**
決定，那是一個沒有人會記得的隱含相依。單一 trigger 內分支，分派邏輯與資料在同一處。
⚠️ **此為設計意圖，Day 1 實測後才算定案**（`AD-PolicyClaimUnmeasured-1` 的教訓：
W11 寫在 migration 裡的因果，複驗後是錯的）。

### Ground truth（recon head-start —— 於 `main` HEAD `91bd789` 讀過的 code）

- `schema.prisma:557-567` — `EvidenceLinkedType` 一個值，註解寫「Adding a value later is
  one line here, **one branch in the trigger**, and a test」⇒ 本 plan 的做法是它預告的那個
- `schema.prisma:1107-1112` — `linked_id` 無 relation 的完整理由
- `migration.sql:229-236` — trigger 硬編碼 + fail-closed 的自述
- `migration.sql:219-224` — `assert_parent_in_scope()` 是 `SECURITY INVOKER`，
  且 `OR UPDATE` 是實測過的（W07 Day 1 M6：沒有它可以先插合法列再改指）
- `02a:235` — Attestation 六個欄位
- `02a:417` — 其他 lifecycle 清單，**不含 Attestation**
- `02a:438` —「every create/update/retire … writes to the append-only audit trail — **no exceptions**」

**Baselines（W13 closeout）**: api unit **451 / 38** · api int **203 / 16** · web **10 / 1** ·
coverage **92.27 / 91.66 / 98.95 / 93.64** · run_all **8 / 8** · entity-index **21 / 35** ·
lint / type-check / build 全 0。Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-trigger-signature** — grep `assert_parent_in_scope` 全部呼叫端，確認改 signature 會影響
  幾個 trigger（預期 2：`control_tests_control_in_scope` · `evidence_linked_in_scope`）
  → 若 > 2，§3.2 的「單一 trigger 分支」要重新評估
- **D-audit-guard** — 確認 W13 漂移守衛**真的會**因新表轉紅（這是它的第一次實戰；
  若不會紅，那條守衛本身就是 Potemkin）→ 移動 §Risks
- **D-policy-column** — 確認 `Policy` 加欄位不需要動 RLS policy（W02 建的表）
- **D-issue-source-stale** — `schema.prisma:573` 註解說「`Assessment` is not built」，
  而 W09 建了 —— **本片不修**（不在範圍），但要確認它不會誤導本片的判斷

## 1. Phase Goal

交付 `Attestation` 一張表、其 create + list 端點、以及**三處連帶修正**（enum 值 / trigger 分支 /
`Policy.requires_attestation`），使 `22 / 35` 實體由 `check_entity_index.py` 機械導出，
且 `Evidence` 第一次能指向非 `control_test` 的父。以 gate 全綠 + **四個中性化**證明：
移除 trigger 分支 → 跨實體 attestation 證據可插入；移除 `AUDITED_MODELS` 條目 → 恰好 2 紅；
移除 enum 值 → 型別錯誤；空的允許清單 → 全紅。
⚪ **純後端，不做 drive-through**。非 spike ⇒ **不產 design note**，**不產 ADR**（無架構級決定）。

## 2. User Stories

- **US-1**（schema）: 作為資料模型維護者，我希望 `Attestation` 依 `02a:235` 建成且
  `result` / `status` 的取捨有記錄，以便下一個讀 schema 的人不必重新推導。
- **US-2**（integrity）: 作為稽核人員，我希望 attestation 證據**能**被連結而跨實體的**不能**，
  以便 polymorphic 連結不會變成 W10 量到的那種 oracle。
- **US-3**（policy）: 作為政策擁有者，我希望能標記一份政策是否需要簽核，以便 M6 的
  lifecycle 有下一步可走。
  🚧 **Day 1 移出本片，使用者裁定 2026-08-15**（原文保留不刪）—— 該欄位今天沒有讀者也沒有
  寫者，是 AP-3。詳見 §9 與 checklist 1.3。
- **US-4**（audit）: 作為合規負責人，我希望新表的寫入**自動**進稽核軌跡，
  以便 `02a:438` 的「no exceptions」在第 22 張表上仍然成立。
- **US-5**（負面驗證）: 作為 reviewer，我希望四個中性化的**預期方向先 commit 再執行**，
  以便「測試會紅」不是宣稱而是紀錄。
- **US-6**（closeout）: 作為下一個 session，我希望 CH / retro / registers / calibration 齊備。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   prisma/migrations/<ts>_attestation/migration.sql   建表 + RLS + trigger 分支 + Policy 欄位
EDIT  prisma/schema.prisma                               Attestation model · enum +1 · Policy +1
NEW   src/core-model/attestation.repository.ts(+spec)    複製 evidence.repository 的形狀
NEW   src/modules/attestation/attestation.controller.ts  create + list
NEW   src/modules/attestation/attestation.module.ts
NEW   src/modules/attestation/attestation.int.spec.ts    4 個範疇測試（含非空前提）
EDIT  src/bootstrap/app.module.ts                        掛載
EDIT  src/audit-trail/audit.module.ts                    AUDITED_MODELS 15 → 16
EDIT  src/audit-trail/audit-coverage.int.spec.ts         +1 條覆蓋測試
EDIT  src/modules/evidence/evidence.int.spec.ts          attestation 連結的正反案例
UNTOUCHED  src/entity-scope/*                            範疇機制不動
UNTOUCHED  src/modules/policy/*                          欄位是 schema 層，controller 不改
```

### 3.1 `Attestation` schema（US-1）— `schema.prisma`

- `02a:235` 六個欄位：`subject_type` + `subject_id`（polymorphic: policy / control）·
  `user_id` · `attested_at` · `result`
- `subject_id` **無 FK**，沿用 `evidence.linked_id` 的判斷（`schema.prisma:1107-1112`）
- **值域自宣告記在 docstring**，依 W04 D3 ruling，不建 registry

### 3.2 ⭐ `result` 建、`status` 不建（US-1）

§1.1 base fields 要求每個 domain entity 有 `status` (enum)，而 §4 **沒有 Attestation 狀態機**，
`417` 行列出的其他 lifecycle 也不含它。

⇒ 與 W07 移除 `ControlTest.result` 的判斷**方向相反而判準相同**：那裡 §4 終態已承載結果，
所以 `result` 是重複；這裡 §4 **沒有條目**，所以 `result` 是唯一承載者，而 `status`
**沒有值域來源** —— 建一個沒有值域的 enum 欄位就是 AP-3。
**這是對 §1.1 的有記錄偏離，不是疏漏。**

### 3.3 ⭐ Trigger 分支（US-2）— `migration.sql`

今天：`assert_parent_in_scope('control_tests', 'linked_id')` 硬編碼一張表。
改為依 `NEW.linked_type` 決定查 `control_tests` 或 `attestations`。

⛔ **必須保留 fail-closed** —— 未知的 `linked_type` 仍要 raise，不可 fall through 成放行。
`migration.sql:231-233` 說 fail-closed 是「the right default」，加分支不得把它變成預設放行。

⚠️ **`OR UPDATE` 不可拿掉**（W07 Day 1 M6 實測：沒有它可以先插合法列再改指向不可達的父）。

### 3.4 `Policy.requires_attestation`（US-3）

`bool NOT NULL DEFAULT false`。⚠️ Day 0 先驗 D-policy-column —— `policies` 是 W02 建的表，
確認加欄位不需要重寫 RLS policy。

### 3.5 稽核（US-4）

`AUDITED_MODELS` 15 → 16。⭐ **預測**：不改的話，W13 的漂移守衛（從 `core-model` 原始碼
導出寫入面雙向比對）會**自己轉紅**。這是它的第一次實戰，Day 1 **先確認它會紅再修**
—— 順序反過來就等於沒驗證過那條守衛。

### 3.x 明確不做的事

- **不建** `Jurisdiction` / `Event` / ISMS Profile 四表 —— 使用者已裁定單張
- **不做** `update` / `delete` 端點 —— 今天全 codebase 零個 `client.*.update`（W13 Day 0 枚舉），
  加了就是沒有消費者的路徑
- **不加** `assessment` 到 `EvidenceLinkedType` —— `AssessmentInstance` 雖已建，但那是**另一個**
  等待點，混進來會讓本片的中性化分不清是哪個分支紅的
- **不修** `schema.prisma:573` 的過時註解（D-issue-source-stale）—— 那是盤點發現的漂移，
  不是本片範圍；記進 BACKLOG
- **不建** attestation 的 UI —— 無 user-facing surface 是本片的**前提**

### 3.y Validation（US-1..US-6）

Gates: format api/web · lint · type-check · build api/web · `lint:negative` ·
api unit（baseline 451/38）· **api int（baseline 203/16，預期 +N）** · web 10/1 ·
coverage 不低於 baseline · `run_all` **8/8** · `check_entity_index` **21 → 22 / 35**。
⚪ **無 drive-through** —— 純後端，報告必須寫「gate-only verified」。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `apps/api/prisma/schema.prisma` | EDIT |
| 2 | `apps/api/prisma/migrations/<ts>_attestation/migration.sql` | NEW |
| 3 | `apps/api/src/core-model/attestation.repository.ts` | NEW |
| 4 | `apps/api/src/core-model/attestation.repository.spec.ts` | NEW |
| 5 | `apps/api/src/modules/attestation/attestation.controller.ts` | NEW |
| 6 | `apps/api/src/modules/attestation/attestation.module.ts` | NEW |
| 7 | `apps/api/src/modules/attestation/attestation.int.spec.ts` | NEW |
| 8 | `apps/api/src/bootstrap/app.module.ts` | EDIT |
| 9 | `apps/api/src/audit-trail/audit.module.ts` | EDIT |
| 10 | `apps/api/src/audit-trail/audit-coverage.int.spec.ts` | EDIT |
| 11 | `apps/api/src/modules/evidence/evidence.int.spec.ts` | EDIT |
| 12 | `docs/03-implementation/changes/CH-031-w14-attestation.md` | NEW |
| — | `apps/api/src/entity-scope/*` | **UNTOUCHED** |
| — | `apps/api/src/modules/policy/policy.controller.ts` | **UNTOUCHED** |
| — | `docs/02-architecture/02a-data-model-spec.md` | **UNTOUCHED**（偏離記在 schema docstring + CH）|

## 5. Acceptance Criteria

1. `check_entity_index.py` 機械導出 **22 / 35**（不是手數）。
2. `EvidenceLinkedType` 有兩個值，且 attestation 證據**能**插入。
3. ⭐ **跨實體** attestation 證據**被拒**，且拒絕發生在**資料庫層**（trigger），
   不是應用層檢查。
   ⚠️ **Day 0 D5 加上一個限定**（原文保留不改）：group-shared control 對任何實體合法可讀，
   所以這條判準只在 `subject_type = policy` 或 `applies_to_scope <> 'group'` 時成立。
   見 §8 的 D5 列。
4. 未知 `linked_type` 仍 **fail-closed**（測試證明，不是宣稱）。
5. ~~`Policy.requires_attestation` 存在且預設 `false`。~~
   🚧 **撤銷（使用者裁定 2026-08-15）** —— 判準改為：**該欄位不存在**，且移出的理由
   （無讀者、無寫者 ⇒ AP-3）記在 CH-031 與 BACKLOG。原文刪除線保留，不移除。
6. **四個中性化的預期方向先 commit 再執行**，逐項對照，數字不符要寫明少算什麼。
7. ⭐ **W13 漂移守衛在 `AUDITED_MODELS` 未更新時確實轉紅**（先觀察到紅，再修）。
8. Gate 全綠；coverage 不低於 baseline；`run_all` 8/8。
9. ⚪ **無 drive-through** —— 純後端，報告寫「gate-only verified」，**不得暗示可用性**。
10. `AD-AuditWriteOpsUntested-1` 等既有 🚧 項**維持未勾且理由不變**（本片不解封）。
11. CH-031 · retrospective · BACKLOG · ROADMAP · CLAUDE.md · MEMORY.md · calibration 已更新。

## 6. Deliverables

- [x] US-1 `Attestation` model + migration，`result`/`status` 取捨記在 docstring
- [x] US-2 trigger 依 `linked_type` 分支，fail-closed 保留，跨實體被拒
- [ ] 🚧 US-3 `Policy.requires_attestation` —— **移出本片 → M6**（使用者裁定 2026-08-15）
      ⛔ **維持未勾** —— 它不是做完了，是被移出了。追蹤：`AD-PolicyAttestationFlag-1`
- [x] US-4 `AUDITED_MODELS` 16 + 覆蓋測試 +1
- [x] US-5 四個中性化，預期先 commit（`50ea93a`）—— 3 個完全命中、**N3b 預測錯**
- [x] US-6 closeout 六件

## 7. Workload Calibration

- Scope class **`pattern-reuse-feature` 0.50**（查 `CALIBRATION-MATRIX.md:54,64` ——
  有藍本可抄：`evidence` 的 polymorphic + trigger 形狀是直接先例。
  **第 7 個資料點**；前 6 點跨 0.23~1.24，W13 為 0.88–0.92 IN band）。
- **Agent-delegated: no**（自己直接做，與 W13 相同）。`agent_factor` 1.0 → **三段式**。
- Bottom-up est ~**4.0 hr**（schema+migration 1.5 · trigger 分支 1.0 · endpoints+tests 1.0 ·
  closeout 0.5）→ class-calibrated commit ~**2.0 hr** (mult 0.50)。Day-4 retro Q2 驗證。
- ⛔ **量法事先宣告**（`AD-CalibrationDay0InOrOut-1`）：**含 Day 0**，
  **逐段相加並排除任何 > 60 min 的 commit 間隙** —— 這是 `AD-CalibrationWindowCrossSession-1`
  在 W13 提出的候選規則，本片是它的**第一次實測**。若 phase 在單一 session 內完成，
  兩種算法應給出相同值；不同就是那條 AD 的資料點。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| ⛔ **PR #62 未 merge 就開 W14** —— 它改了 `CLAUDE.md` Current Phase 與 `ROADMAP` 4c，W14 closeout 會改同樣兩處 ⇒ 衝突 | **先 merge #62 再開分支**。若使用者要並行，W14 從 `chore/w13-post-merge-repoint` 長出 |
| trigger signature 改動影響超出預期（D-trigger-signature）| Day 0 grep 全部呼叫端；> 2 處就改用新增 polymorphic 變體而非改既有 signature |
| **W13 漂移守衛不會紅**（D-audit-guard）⇒ 它自己是 Potemkin | Day 1 **先跑再修**；若不紅，本片範圍改為修那條守衛，並記 AD |
| Risk Class A（模組級 singleton 汙染）| 覆蓋斷言依 `refCode` 查、不用 count delta（W13 已踩過：兩個 AppModule suite 平行跑是 race）|
| Risk Class C（陳舊 dev server 掩蓋 migration）| 驗證前 `prisma migrate reset` + 乾淨重啟；擷取 startup log |
| polymorphic 連結變成存在性 oracle（W07 / W10 都量到過）| 中性化 3 專測此點：「撞別實體的 id」與「不存在的 id」必須**不可分辨** |
| **D1（Day 0）** —— §3.3 只寫了方向沒寫機制：`assert_parent_in_scope` 讀 `TG_ARGV`，那是**建 trigger 時寫死的字面值**，換不掉 | Day 1 在三個做法中**先量再選**：(a) 加第三個 `TG_ARGV` 傳型別欄位名 + 函式內查映射；(b) 新建 polymorphic 變體函式；(c) 呼叫端傳映射表。⛔ 不得沿用 §3.3 的措辭當作已定案 |
| ⛔⭐ **D5（Day 0）** —— `controls_read` 有 `applies_to_scope = 'group' OR …`，**group-shared control 對任何實體都 reachable** ⇒ §5 acceptance 3 與中性化 N1 若拿 group control 當標的，**修法前後都會通過** | N1 必須用 `subject_type = policy`（`policies` 無 group 逃生口）或 `applies_to_scope <> 'group'` 的 control，**並把該限定寫進測試名稱**。⚠️ 這正是 `AD-VacuousScopeTest-1` 的形狀 |
| **D6（Day 0）** —— plan 全篇未寫出錯誤碼；實際是 **`23503`** 不是 42501，且有一整個 migration 只為修正 COMMENT 說錯這件事 | 所有拒絕斷言用 `23503`；⛔ 不可從 W07 的 checklist 抄 —— 那裡兩個值都出現過 |
| **D8（Day 0）** —— checklist 1.2 的「**四條** per-command policy…無 `FOR DELETE`」自相矛盾 | 依 `rm_report_versions` 先例定為 **2 條**（`INSERT` / `SELECT`）：§3.x 已明說不做 update 端點，建一條沒有路徑會走的 UPDATE policy 是 AP-3 邊緣（ADR-0014「缺席即最嚴格」）|

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- ⭐ **`Policy.requires_attestation`** — **M6**（使用者裁定 2026-08-15，Day 1 移出）。
  本片建了 `attestations` 表，但那個 bool **今天沒有讀者也沒有寫者**：attestation 的 create
  不可能讀它（`ScopedAttestationClient` 刻意不暴露 `policy` —— oracle 防線），
  `policy.controller.ts` 是 UNTOUCHED 所以 create 不接受它，M5 workflow 與 UI 都不存在。
  ⇒ 關掉它不會壞任何東西，這正是 W07 拒絕在 `EvidenceLinkedType` 建第二個值時的那把尺。
  **解封條件**：Policy 模組真的要讀它的那一片（M6）。追蹤見 `BACKLOG.md`
- `Jurisdiction` · `Event` · ISMS Profile 四表 — M1 slice 10+
- `EvidenceLinkedType` 的 `assessment` 值 — 獨立 slice（`AssessmentInstance` 已建，等待點成立）
- `schema.prisma:573` 過時註解 — 記進 BACKLOG（盤點 2026-08-15 發現）
- attestation 的 UI / 政策簽核流程 — M5 workflow + UI phase
- `update` / `delete` 稽核 — 仍由 `AD-AuditWriteOpsUntested-1` 承載，解封條件不變
