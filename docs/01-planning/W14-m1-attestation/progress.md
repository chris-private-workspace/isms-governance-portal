# Phase W14 Progress

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## Day 0 — 2026-08-15 · Plan-vs-Repo Verify

**Base**: `main` HEAD `9ae6166`（PR #62 merged —— ⛔ plan §Base 寫的是 `91bd789`，
在 plan 起草**之後** #62 才 merge，所以實際基準往前了一個 commit。記在這裡而不是回頭改 plan。）

### Prong 1 — path verify ✅

| 類別 | 預期 | 實際 |
|---|---|---|
| NEW（7）| 全部不存在 | ✅ 7/7 absent（含 `<ts>_attestation` migration）|
| EDIT（5）| 全部存在 | ✅ 5/5 exists |
| `CH-031` | 未被佔用 | ✅ 最大號是 `CH-030` |

### Prong 3 — schema verify ✅

- `attestations` 不在 `schema.prisma` 的 22 個 model 中 ✅
- `Policy.requires_attestation` 不存在 —— `schema.prisma:246` 只有一行註解指向 M6 ✅
- `EvidenceLinkedType` 恰好一個值（`:563-567`）✅
- migration 鏈一致 —— ⚠️ **證據是 int suite 的 `[int] isms_test rebuilt, migrated and seeded`**，
  不是 `_prisma_migrations` 查詢。**第一次嘗試查詢用錯了 role**（`role "postgres" does not exist`），
  沒有補查而是改用一個更強的既有證據：整條鏈重建成功。**記下來是因為兩者不等價** ——
  int 用的是 `isms_test`，dev DB 的 head 未被本次驗證。

### D-baselines ✅ —— 全部逐位對上 plan §Ground truth

| Gate | plan 宣稱 | 實測 |
|---|---|---|
| api unit | 451 / 38 | ✅ **451 / 38** |
| api int | 203 / 16 | ✅ **203 / 16** |
| web | 10 / 1 | ✅ **10 / 1** |
| coverage | 92.27 / 91.66 / 98.95 / 93.64 | ✅ **逐位相符** |
| lint · type-check | 0 · 0 | ✅ 0 · 0 |
| build api / web | 0 / 0 | ✅ 0 / 0 |
| `lint:negative` | PASS | ✅ PASS —— 57 掃描 / 0 bypass / 3 allowlisted / skipped 54 test + 2 fixture |
| `run_all` | 8 / 8 | ✅ 8 / 8 |
| `check_entity_index` | 21 / 35 | ✅ 21 / 35 |

⚠️ **`lint:negative` 是 root script 不是 workspace script** —— 第一次用 `-w apps/api` 跑，
得到 `Missing script`。plan / checklist 都沒指明這件事。

---

## Drift findings

> 格式：`D{N}` · Finding · Implication。⛔ **不默默改 plan §3 / §5 原文** ——
> finding 進 plan §8 Risks，保留「原本計畫什麼 vs 現實逼你改成什麼」的軌跡。

### D1 — `assert_parent_in_scope` 的呼叫端恰好 2 個 ✅，**但參數是建 trigger 時固定的**

`migration.sql:227` `('controls','control_id')` · `:236` `('control_tests','linked_id')`。
預測 2、實際 2 ⇒ plan §3.3「單一 trigger 內分支」不會波及第三處。

⛔ **但 plan 漏掉一件事**：函式讀的是 `TG_ARGV[0]` / `TG_ARGV[1]`（`:181-182`），
那是 **`CREATE TRIGGER` 時寫死的字面值**，不是 runtime 值。
所以「依 `NEW.linked_type` 決定查哪張表」**不能**靠換 `TG_ARGV` 達成 ——
映射必須存在於函式本體內，而函式今天是**通用的**（`control_tests` 上那個 trigger 也在用它，
而 `control_tests` 沒有 `linked_type` 欄位）。

⇒ **Day 1 要在三個做法中選一個並實測**，plan §3.3 只寫了方向沒寫機制。

### D2 — W13 漂移守衛是真的 ✅，checklist 1.1 可行

`audit-coverage.int.spec.ts:486-517`：`readdirSync(core-model)` → regex
`client\.(\w+)\.(?:${WRITE_OPS})\(` → 首字母大寫還原 delegate 名 → 與 `AUDITED_MODELS`
**雙向**比對（`unaudited` 與 `unreachable` 都要是空陣列）。

⇒ 新增 `attestation.repository.ts` 且其中呼叫 `client.attestation.create(`，
`unaudited` 會含 `"Attestation"` 而轉紅。**它不是硬編碼清單，checklist 1.1 的順序有意義。**

### D3 — `Policy` 加欄位不影響 RLS ✅

`policies` 的 policy 是 `FOR ALL USING(...) WITH CHECK(...)`，運算式只引用 `org_entity_id`
（`20260809171812_entity_scope_fail_closed`）。加一個 bool 欄位不需重寫。

### D4 — `schema.prisma:573` 的過時註解不影響本片 ✅

它談的是 `IssueSource` 缺哪些值，與 attestation 無關。**本片不修**（plan §9 已指向 BACKLOG）。

### D5 ⛔⭐ — group-shared control 跨實體**合法可讀**，這推翻了 acceptance 3 與 N1 的測試設計

```sql
CREATE POLICY "controls_read" ON "controls"
  FOR SELECT USING ("applies_to_scope" = 'group' OR "org_entity_id" = ANY (app_entity_scope()));
```

而 `assert_parent_in_scope()` 做的正是 `SELECT EXISTS (SELECT 1 FROM controls WHERE id = $1)`，
**靠 RLS 過濾**。⇒ 一個 `applies_to_scope = 'group'` 的 control，對**任何**實體都 reachable。

**這不是 bug** —— `02a:434` 明說 group-shared control「may link to any entity's risks」。

⛔ **但它讓 plan §5 acceptance 3（「跨實體 attestation 被拒」）在 `subject_type = control`
且該 control 是 group-shared 時為假**。若中性化 N1 拿一個 group control 當標的，
它在**修法前後都會成功**，於是 N1 變成一個什麼都不證明的測試 ——
**正是 `AD-VacuousScopeTest-1` 的形狀**，而 W13 才剛補過 4 處同形缺陷。

⇒ N1 必須用 **`subject_type = policy`**（`policies` 是單一 `FOR ALL`，無 group 逃生口），
或用一個 `applies_to_scope <> 'group'` 的 control，**並在測試名稱裡寫明這個限定**。

### D6 ⛔ — SQLSTATE 是 `23503`，不是 42501

`migration.sql:196-213` 明寫選 `23503` 而非 `42501` 的理由（42501 是 RLS 對**列本身**
出範疇時раise 的，重用它會報錯欄位）。而且**有一整個 migration
（`20260812164500_correct_parent_guard_comment`）只為了修正 COMMENT 說錯這件事** ——
函式本體當天改了、它下面一行的 COMMENT 沒改，於是資料庫目錄裡住著一句錯的宣稱。

⇒ 本片的整合測試斷言必須用 **`23503`**。plan 全篇沒有寫出這個碼。

### D7 ⚠️ — trigger 改動必須走**新** migration

`AD-MigrationChecksum-1`（W04 Day 2 實測）：Prisma 存每個 migration 的 checksum，
改寫已套用的檔案會讓之後每次 `migrate dev` 拒跑。plan §4 第 2 項本來就是 NEW migration，
方向一致 —— 但 §3.3 的措辭（「`migration.sql` 改 trigger」）讀起來像在改既有檔案。

### D8 ⛔ — checklist 1.2 的「四條 per-command policy…無 `FOR DELETE`」是自相矛盾

實測全部表的 policy 形狀：

| 形狀 | 表 |
|---|---|
| `INSERT / SELECT / UPDATE`（3 條）| controls · control_tests · evidence · issues · actions · assessment 三表 · rm_reports · statements_of_applicability |
| `INSERT / SELECT`（2 條）| **`rm_report_versions`** · audit_log |
| `ALL`（W02/W05 舊形狀）| policies · risks · assets · asset_groups |

ADR-0014 之後的慣例是 **3 條**，四條就必然含 DELETE。

⭐ **而 `rm_report_versions` 的先例更貼近本片**：W10 沒建 UPDATE policy，因為版本快照不可編輯，
而 ADR-0014 的判準是「缺席即最嚴格」。plan §3.x 已明說**不做 update 端點**
⇒ 建一條沒有任何路徑會走的 UPDATE policy，就是一個「關掉也不會壞任何東西」的設定（AP-3 邊緣）。

⇒ Day 1 傾向 **2 條（`INSERT` / `SELECT`）**，理由複製 W10 的判斷，並寫進 migration 註解。

---

## Go / No-Go

| 面向 | 判定 |
|---|---|
| 核心交付物 | **不變** —— 表 · enum 值 · trigger 分支 · `Policy` 欄位 · 稽核接上 |
| 受影響 | 測試設計（D5）· policy 條數（D8）· trigger 實作機制（D1）· 斷言用的錯誤碼（D6）|
| 範圍變動 | 估 **~15%** —— 全部落在「怎麼做」而非「做什麼」 |
| **判定** | ✅ **GO** —— 繼續 Day 1，D1 / D5 / D8 進 plan §8 Risks |

⚠️ **D5 是本次 Day 0 唯一一條「不抓到就會產出無效測試」的發現**。它與 W13 的
`AD-Day0ReadNotApplied-1` 是同一個對照組：W13 在 Day 0 **讀過**關鍵 docstring 卻沒套用到做法上，
靠 Day 2 一次對照實驗才抓到。這次 D5 是**因為 checklist 明確列了
`D-subject-both-built` 這一項才被問出來的** —— 那條檢查項正是為了那條 AD 加的。

## Remaining for Day 1

- 三個 trigger 做法擇一（D1）—— 先量再選
- ⭐ **先建表 + repository、不改 `AUDITED_MODELS`、跑 int suite 觀察守衛轉紅**（checklist 1.1）
- policy 條數依 D8 定為 2 條，理由寫進 migration 註解

---

## Day 1 — 2026-08-15 · Schema + migration

### ⭐ 1.1 W13 漂移守衛的第一次實戰 —— **它是真的**

在**完全沒有碰 `AUDITED_MODELS`** 的狀態下建了 `attestations` 表 + `attestation.repository.ts`，
跑 int suite。原文：

```
● audit coverage (integration) › the allowlist still matches the write surface

    expect(received).toEqual(expected) // deep equality
    - Array []
    + Array [
    +   "Attestation",
    + ]

    at audit-coverage.int.spec.ts:514:23   ← expect(unaudited).toEqual([])

Test Suites: 1 failed, 15 passed, 16 total
Tests:       1 failed, 202 passed, 203 total
```

| 觀察 | 意義 |
|---|---|
| **恰好 1 紅** | 15 條逐模型覆蓋測試**一條都沒動** ⇒ 守衛的偵測**獨立於**它們，不是同一個宣稱穿十六件衣服 |
| 訊息**自己指名 `Attestation`** | 它是從 `core-model` 原始碼導出的，不是比對一份硬編碼清單 |
| 落在 `unaudited` 而非 `unreachable` | 雙向比對的**正確那一側** —— 新寫入面存在而清單沒跟上 |

⇒ **W13 的成果不是紙上的。** R4 十個 phase 的失效模式（「下一張表忘了接而沒有任何 gate 會叫」）
在第 22 張表上被機械攔下。

⛔ **順序是這條檢查唯一的價值來源** —— 先改 `AUDITED_MODELS` 再跑，得到的是綠色，
而綠色**不能區分**「守衛有效」與「守衛從不看新表」。

### 1.2 Schema + migration ✅

- `AttestationSubjectType`（`policy` / `control`）—— ⛔ **不複用** `AssessmentSubjectType`
  （`:1276`，risk/control/process/entity）：兩者只在 `control` 重疊，共用會把 `policy` 開放給
  assessment、把 `risk` 開放給 attestation
- `Attestation` model —— `02a:235` 六欄 + §1.1 base fields；`subject_id` **無 FK**
- migration **手寫、UTC 時間戳** `20260815083338`（`AD-MigrationTimestampTz-1`；且 dev DB 仍有
  W10 留下的 checksum 衝突使 `--create-only` 跑不起來，與 W11 當時相同）

**三個設計決定，各自有先例支撐：**

| 決定 | 理由 |
|---|---|
| **`status` 不建** | §4 給了 Policy/Risk/Issue/ControlTest 狀態機，`:417` 另列 Action/Assessment/Event —— **Attestation 兩處皆無** ⇒ 沒有值域來源。W07 移除 `ControlTest.result` 是因為 §4 終態已承載它；這裡是鏡像：**沒有終態，所以 `result` 是唯一承載者** |
| **`result` 用 String 不用 enum** | ⚠️ **本 schema 的兩個先例在此分歧**：`Evidence.kind` 是 String（「inventing a closed list would be inventing a field」），`SoA.implementation_status` 是自宣告 enum（W04 D3 ruling）。**分野是 ISO 27001 從外部固定了 SoA 的值域** —— W11 記錄的是既有清單，不是創作一份。attestation 的結果沒有任何外部來源固定 ⇒ 從 `Evidence.kind`。收窄是一次 migration，取消一個業務從未同意的詞彙表是一場對話 |
| **RLS 只有 2 條**（D8）| 依 `rm_report_versions` 先例：attestation 是「某人在某刻簽了」的記錄，事後編輯不是更正事實而是**替換證據**（`02a:260` 對版本列、guardrail 5 對稽核軌跡的同一個論證）。更正 = 新的一列，撤回 = `retired_at`。⛔ **連 `GRANT UPDATE` 都沒有** —— 缺席比窄的 policy 更嚴格（ADR-0014）|

⛔ **本 migration 刻意不含 parent guard trigger** —— 那是 Day 2。分開是為了讓
「沒有 trigger 時多型欄位接受什麼」可以**被量到**（W07 Day 1 的 M3/M3b 就是這樣得到的），
而不是變成一句宣稱。

### 1.x partial gate ✅

| Gate | 結果 |
|---|---|
| `type-check` api | **0** |
| `lint` api | **0** |
| `check_entity_index` | ⭐ **22 / 35**（機械導出；`models in schema.prisma: 23`）|
| api int | ⚠️ **202 / 1 failed** —— **預期中**，就是 1.1 那條。Day 2 修 |
