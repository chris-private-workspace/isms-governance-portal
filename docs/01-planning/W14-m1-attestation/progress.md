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

### 1.x partial gate ✅ (Day 1)

| Gate | 結果 |
|---|---|
| `type-check` api | **0** |
| `lint` api | **0** |
| `check_entity_index` | ⭐ **22 / 35**（機械導出；`models in schema.prisma: 23`）|
| api int | ⚠️ **202 / 1 failed** —— **預期中**，就是 1.1 那條。Day 2 修 |

---

## Day 2 — 2026-08-15 · Trigger 分支 + endpoints + 稽核

### ⭐ 2.0 先量：無守衛的多型欄位接受什麼

Day 1 刻意把 parent guard 留在 migration 外，就是為了這次測量。整份
`attestation.int.spec.ts` 先寫成**最終狀態**再跑，於是失敗訊息本身就是量測值：

```
● 6. the trigger supplies the integrity the missing foreign key would have
    Received promise resolved instead of rejected
    Resolved to value: { subjectId: "00000000-0000-0000-0000-0000dead0000",
                         refCode: "ATT-HK1-000005", ... }
● 8. an ENTITY-local control of another entity is refused
    Resolved to value: { subjectId: "...000000000a50", refCode: "ATT-HK1-000007", ... }

Tests: 3 failed, 11 passed, 14 total
```

⇒ **W07 的 M3 / M3b 在第二張多型表上原樣重現**：一個不存在的 id 落地了，
另一個實體的 entity-local control 也落地了。

⭐⭐ **而測試 7（group control 跨實體）在這一輪就是綠的** —— 加了 trigger 之後**仍然綠**。
這是 D5 的價值被實測釘住的地方：**若只寫測試 7 而沒有測試 8，我會得到一條修法前後
都通過、什麼都不證明的測試**。測試 8 紅→綠，它才是真正在測 trigger 的那條。

### 2.1 D1 定案：新建 polymorphic 變體函式（選項 b）

三個候選在 plan §Risks，判準由測量導出：**需要的不是一個多型守衛而是兩個，且映射不重疊**。

| 多型欄位 | 映射 |
|---|---|
| `evidence.linked_id` | `control_test → control_tests` · `attestation → attestations` |
| `attestations.subject_id` | `policy → policies` · `control → controls` |

⇒ 選項 (a)「第三個 `TG_ARGV`」撐不住兩份映射 —— 它最終仍要把整份映射塞進參數，
那時它已經是另一個函式穿著舊名字。

**做法**：`assert_polymorphic_parent_in_scope()`，`TG_ARGV = (type_col, id_col, 然後 (值, 表) 對)`。
既有的 `assert_parent_in_scope()` **一行未動**，仍服務 `control_tests_control_in_scope`
⇒ 三個 phase 依賴的守衛零回歸面。

⛔ **這不是 AP-5**：新函式**當下就有兩個呼叫端**，與 W07 給 `assert_parent_in_scope` 收參數
的理由完全相同（W07 retro §AP-5：「收參數是因為當下就有兩個呼叫點，不是為了未來」）。

⭐ **fail-closed 被保留且升級**：未映射的型別值 **RAISE 23503**，不是 fall through。
W07 說 fail-closed 是「the right default until that branch is written」——
現在第二個分支寫好了，那個預設仍在：enum 加值而沒有加映射對，會被大聲拒絕。

### 2.2 契約反轉 —— W07 為本片預先寫好的驗收條件

`evidence.repository.ts:26` 原文：*"When attestation or assessment arrive, this becomes an
input **in the same change that gives the trigger its second branch**, and not before."*

⇒ 本片同時做了三件事，因為它們是同一件事：enum 加 `attestation` · trigger 得到第二個分支 ·
`linkedType` 從硬編碼變成輸入。

**三個釘住舊契約的測試因此反轉**（⛔ 全部保留原文，不刪）：

| 檔案 | 原標題 | 現在 |
|---|---|---|
| `evidence.repository.spec.ts` | `sets linkedType itself and ignores anything a caller sends for it` | 改為 passes through，**原文引在 docstring 裡** |
| `evidence.controller.spec.ts` | `has no route from the body to linkedType` | 改為 routes it，且加測「不認識的值是 400」 |
| `evidence.int.spec.ts` | `linked_type is set here, never accepted` | 改為 ACCEPTED，並斷言第二個值解析到**另一張表** |

⚠️ 這不是「測試壞了要修」，是**契約按它自己寫下的條件到期了**，測試跟著反轉。

### ⛔ 2.3 我自己造成的一個 bug，形狀值得記

加 seed attestation 時我先用了 `...ab0` / `...ab1`，發現與 `SG1_INSTANCE` 撞號後，跑了一段
全域 replace 把三個檔案的 `ab0/ab1` 換成 `ac0/ac1`。

**`int-global-setup.js` 裡 `ab0` 出現兩次** —— 一次是我新加的 attestation，
**另一次是 assessment_instances 的 seed**。兩個都被換掉了。

結果：`assessment.int.spec.ts` **7 個測試紅**，訊息是 `SG1_INSTANCE` 找不到。

⭐ **形狀**：`AD-NarrowPatternWideClaim-1` 的近親 —— 我用一個**窄的意圖**（改我剛加的那兩行）
配上一個**寬的操作**（全檔 replace），中間沒有任何一步確認範圍。
⚠️ 而它**被 int suite 抓到了**，不是被我抓到的。修法是逐處定位（`ASIN-` ref code 是判別依據）。

### 2.4 稽核 + coverage

- `AUDITED_MODELS` **15 → 16**，Day 1 觀察到的那一條紅**恰好因此轉綠**
- 覆蓋測試 +1（⚠️ **無 teardown** —— 這張表沒有 UPDATE grant，其餘 15 條做的 retire
  在這裡會 `permission denied`。那是 Day 1 決定在運作，不是本測試的缺口）
- ⛔ **coverage 一度掉到 87.33 / 85.56 / 95.93 / 88.59**（baseline 92.27 / …）——
  因為 `attestation.repository.ts` 與 `attestation.controller.ts` **沒有 unit spec**，
  而其他每個模組都有。這正是 `AD-ModuleCoverageDilution-1` 的形狀。
  ⇒ 補兩份 unit spec（29 個測試），回到 **92.14 / 91.77 / 98.98 / 93.56**。
  ⚠️ plan §4 列了 `attestation.repository.spec.ts` 但**漏了 controller.spec** —— 記在這裡。

### 2.x Full gate ✅ —— 十一項，各自 exit code 分開取

| Gate | 結果 | baseline |
|---|---|---|
| `format:check` api / web | **0 / 0** | ⚠️ 第一次 api 是 1；`grep "^\[warn\]"` **零命中**（prettier 的 ANSI 色碼），exit code 才是真相 —— `AD-GrepAssertion-1` 現場 |
| `lint` · `type-check` | **0 · 0** | 0 · 0 |
| `build` api / web | **0 / 0** | 0 / 0 |
| `lint:negative` | **PASS** — 60 掃描 / 0 bypass / skipped 57 test | 57 掃描 / skipped 54 |
| api unit | ⭐ **480 / 40** | 451 / 38（**+29 / +2**）|
| **api int** | ⭐ **218 / 17** | 203 / 16（**+15 / +1**）|
| web | **10 / 1** | 10 / 1 |
| coverage | **92.14 / 91.77 / 98.98 / 93.56** | 92.27 / 91.66 / 98.95 / 93.64（兩高兩低）|
| `run_all` | **8 / 8** | 8 / 8 |
| `check_entity_index` | ⭐ **22 / 35** | 21 / 35 |

⚪ **Verdict: gate-only verified** —— 純後端，無 user-facing surface，**不得暗示可用性**。

## Remaining for Day 3

- 四個中性化，**預期方向逐測試先 commit 再執行**
- ⛔ **先 grep `AUDITED_MODELS` / `assert_polymorphic_parent_in_scope` 的消費者再預測** ——
  W13 的 N1/N3 少算就是因為列了「我以為會受影響的 suite」（`AD-NeutralisationConsumerGrep-1`）

---

## Day 3 — 2026-08-15 · 中性化驗證

### 3.1 Clean restart

⚪ **無長駐程序可殺** —— 本 phase 純後端，沒有 dev server 在 3210 上跑。
int suite 的 global setup **每次 DROP + CREATE + migrate + seed**（`[int] isms_test rebuilt,
migrated and seeded`），所以 Risk Class C 描述的「陳舊程序掩蓋 wiring 修正」在這裡結構上不成立。
⛔ **記下來而不是打勾略過** —— checklist 這一項對前端 / 長駐服務 phase 仍然必要。

### 3.2 ⭐ 先 grep 消費者，再寫預測，再執行

`AD-NeutralisationConsumerGrep-1`（W13 的 N1/N3 少算，因為列的是「我以為會受影響的 suite」）。
本次先 grep，而 **grep 推翻了兩個直覺**：

| 符號 | 我以為 | grep 實況 |
|---|---|---|
| `AUDITED_MODELS` | 只有 `audit-coverage` | **四個檔**：`audit.module` · `audit-coverage` · `audit.int` · ⭐ **`bench.int`** —— 正是 W13 漏掉的那個。但 `bench:117` 與 `audit.int:283` 都只是把**整個集合**交給 `AuditLogRecorder`，不檢查任何名稱 ⇒ 移除單一名稱不影響它們 |
| `linkedType` | 程式碼消費者一票 | `attestation.repository.ts:27,68` · `attestation.repository.spec.ts:12` · `attestation.controller.ts:13` **全部是註解**。⛔ 命中數不是證據 —— 要逐處讀 |

### 預測（⛔ 本節先 commit，再執行）

| N | 中性化 | 預期紅 | 逐測試 |
|---|---|---|---|
| **N1** | `DROP TRIGGER attestations_subject_in_scope` | **3** | `attestation.int` 5（跨實體 policy + absent 不可分辨）· 6（integrity）· 8（entity-local control）。⭐ **7 必須仍綠** —— group control 的接受不來自 trigger 的缺席，而來自 `controls_read` 的放寬 |
| **N2** | `AUDITED_MODELS` 移除 `'Attestation'` | **2** | `audit-coverage`「Attestation」覆蓋 + 「the allowlist still matches the write surface」漂移守衛。其餘 15 條覆蓋測試與 `bench` / `audit.int` **不動** |
| **N3** | `schema.prisma` 的 `EvidenceLinkedType` 移除 `attestation` + regenerate | **type-check 1 錯** | `evidence.repository.spec.ts` 的 `{ ...INPUT, linkedType: 'attestation' }`。⚠️ **int suite 預期仍全綠** —— DB 的 enum 由已套用的 migration 建立，改 schema 不改 DB ⇒ 這一條暴露的是「schema.prisma 與 DB 是兩份真相」 |
| **N4** | 移除 seed 的兩筆 attestation | **5** | `attestation.int` 9（非空前提）· 12（delete 前提）· 13（update 前提）· 14（roll-up 前提）+ ⭐ **`evidence.int` 2** —— 它用 `SG1_ATT` 當 evidence 的 `linkedId`，seed 一走那個 id 就不可達 |

⚠️ **N4 的 checklist 措辭是錯的**（「拿掉非空前提 → 該測試仍紅」）——
拿掉前提只會讓斷言變弱，不會讓它紅。有意義的方向是**移除前提所依賴的資料**：
若測試因此紅，前提就不是裝飾。原措辭保留於 checklist，此處記錄修正。

### 3.3 執行結果 —— 逐項對照（預測 commit `50ea93a`）

| N | 預期 | 實際 | |
|---|---|---|---|
| **N1** DROP `attestations_subject_in_scope` | 3（測試 5·6·8）| **3** —— 5 · 6 · 8 | ✅ **逐條命中**。⭐ **測試 7 不在紅名單** ⇒ group control 的接受確實來自 `controls_read` 的放寬，不是 trigger 缺席 |
| **N2** `AUDITED_MODELS` 移除 `'Attestation'` | **恰好 2** | **恰好 2** —— `Attestation` 覆蓋 + 漂移守衛 | ✅ **驗收核心命中**。`bench.int` / `audit.int` 一條未動，證實 grep 的判讀（它們只把整個集合交給 recorder）|
| **N3a** schema enum 移除 + regenerate → type-check | 1 錯，在 `evidence.repository.spec.ts` | **1 錯**，`evidence.repository.spec.ts(94,43)` `Type '"attestation"' is not assignable to type '"control_test"'` | ✅ 連檔案與行都命中 |
| **N3b** 同上 → int suite | **全綠**（DB enum 未變）| ⛔ **1 紅** —— `evidence.int` 測試 2 | ❌ **預測錯了** |
| **N4** 移除 seed 的兩筆 attestation | 5 | **5** —— attestation 9·12·13·14 + `evidence.int` 2 | ✅ 逐條命中，含跨 suite 的那一條 |

**3 個完全命中 + 1 個一半命中。**

### ⛔ N3b 為什麼錯，以及為什麼這個錯比預測有用

我推論「`schema.prisma` 的 enum 只是 TypeScript 型別，runtime 會把字串直接交給 DB，
而 DB 的 enum 由已套用的 migration 建立 ⇒ int 仍全綠」。

**實際上 Prisma 的 generated client 在 runtime 也驗證 enum 值。**

⇒ 不是「schema 與 DB 兩份真相」，是**三份**：`schema.prisma` · **generated client** · DB catalog。
而中間那份會擋。⭐ 這對本專案有實際後果：`ALTER TYPE ... ADD VALUE` 的 migration
**必須**配 `prisma generate`，否則 DB 接受而應用層拒絕 —— 一個只在部署時出現的分歧。

⚠️ 記在這裡而不是把預測改成對的。預測是 `50ea93a` 的內容，已經發布。

### ⛔ 3.x 我在 Day 3 又犯了一次同形錯誤

N4 第一次執行時，我用 `t.index('  ],', i)` 找 `attestations` 陣列的結尾 ——
它匹配到了**第一筆資料的** `    ],`（四空格縮排包含兩空格模式），於是切在陣列中間，
`int-global-setup.js` 變成語法錯誤（`SyntaxError: Unexpected token ','`）。

⭐ **與 Day 2 的 ab0/ab1 全域替換是同一個形狀，同一天第二次**：
**用一個便宜的字串操作，去做一件需要理解結構的工作**。
修法都一樣 —— 錨定到結構邊界（這次是 `\n  ],\n`，Day 2 是 `ASIN-` ref code），
並加一條 `assert` 確認切出來的東西是預期的（`seg.count('ATT-') == 2`）。

⚠️ 兩次都**不是被我發現的**：Day 2 是 int suite 報 7 紅，Day 3 是 node 拒絕載入。

### 3.4 還原驗證 ✅

- `git status` **空**
- api int **218 / 17**（回到 Day 2 的數字）
- type-check **0 錯**

---

## Day 4 — 2026-08-15 · Closeout

### ⛔ 4.0 先修一個我自己造成的 stale（AP-7）

Day 2 把 `AUDITED_MODELS` 15 → 16 時，`audit.module.ts` 的 docstring **沒跟著改**。
⚠️ 而那段 docstring 的第一句正是 **`⭐ DERIVED, NOT TRANSCRIBED — rerun the derivation`** ——
它叫讀者重跑導出，我改了清單卻沒重跑它。

**重跑之後的真值**（不是推算的）：

```
forward   client.<delegate>.(create|update|upsert)  排除 *.spec.ts  →  17 delegates
reverse   grep -c '^model' prisma/schema.prisma      →  23 models
          23 − 17 = 6 無寫入路徑 = 5 個 absent + AuditLog   ✅ 與 docstring 的敘述自洽
```

修了三句錯的宣稱（`fifteen strings` → sixteen · `16 delegates` → 17 · `22` → 23），
並順帶修掉 W13 留下的同類 stale（「plan §3.3 connects **ONE** module」/「the other **ten**」/
「**before** ADR-0003 chooses a strategy」—— ADR-0003 已採納、清單已是 16）。
補上 W14 的 MHist 一行。

### 4.x Final gate sweep —— **十三項，各自 exit code 分開取，全部 0**

| # | Gate | exit | 數字 |
|---|---|---|---|
| 01 | `format:check` api | **0** | |
| 02 | `format:check` web | **0** | |
| 03 | `lint` api+web | **0** | |
| 04 | `type-check` api+web | **0** | |
| 05 | `build` api | **0** | |
| 06 | `build` web | **0** | |
| 07 | `lint:negative` | **0** | PASS —— 60 掃描 / 0 bypass / 3 allowlisted / skipped 57 test + 2 fixture |
| 08 | api unit | **0** | **480 / 480**，suites **40 / 40** |
| 09 | **api int** | **0** | **218 / 218**，suites **17 / 17** |
| 10 | web | **0** | **10 / 10**，files 1 / 1 |
| 11 | coverage | **0** | **92.14 / 91.77 / 98.98 / 93.56**（與 Day 2 逐位相同 —— docstring 改動不影響）|
| 12 | `run_all` | **0** | **8 / 8** |
| 13 | `check_entity_index` | **0** | **22 / 35** |

⚠️ **gate script 自己踩了一個小坑**：它用 `tail -25` 收斂輸出，把 jest coverage 的 `All files`
摘要行切掉了（那一行在表格**最前面**）。**判定沒錯** —— 退出碼取自 `PIPESTATUS[0]` 而不是 `tail` 的 ——
但**數字得重跑一次才拿到**。⇒ 這是 `AD-GrepAssertion-1` 的鄰居而非它本身：
那條講「退出碼被 `tail` 吃掉」，這次退出碼是對的，被吃掉的是**證據**。

### 4.x Calibration ⭐ 兩種量法首次實測同值

| 量法 | Day 0–3 |
|---|---|
| 逐段相加（排除 > 60 min）| **100.88 min** |
| 原始窗口法 | **100.88 min** |

六個間隙**最大 34.87 min**，全部低於門檻 ⇒ 逐位相同。Day 4 另計 **28.3 min**（至 retro 寫入，下界）。
合計 **2.15–2.27 hr** / committed 2.0 hr ⇒ ratio **1.08–1.13**，**IN**，兩端同 band。

⛔ **只證明了一半** —— 見 retrospective Q2 與 `calibration-log.md`。
W13 的跨 session 失效模式在本 phase **結構上不可能重現**，故 `AD-CalibrationWindowCrossSession-1` **不關閉**。

### 4.x Closeout 產出

`CH-031` · `retrospective.md` · `memory/project_w14_attestation.md` ·
`MEMORY.md`（**293 字元** ≤ 300）· `CLAUDE.md`（Current Phase + Last Updated 各 1 行）·
`ROADMAP.md`（item 4 → slice 9 + MHist）· `BACKLOG.md`（+2 AD，4 條更新）·
`CALIBRATION-MATRIX.md`（325 字元）· `calibration-log.md` · `RISK_REGISTER.md`（**R3 / R4** 兩列）

---

## Day 4（續）— 2026-08-15 · PR #63 + post-merge

### 4.x PR #63 —— CI 是這個分支第一次被檢驗

使用者確認後 push + `gh pr create`。**六個 required check 全 SUCCESS**
（`gates` · 映像 build + 啟動探測 · gitleaks 全歷史 · SCA · SAST · trivy），
`mergeStateStatus` 由 `BLOCKED` → **`CLEAN`**。

⇒ **「本機全綠但 CI 未驗」那面紅旗結清了** —— 本機十三項與 CI 六項給出一致的答案，
沒有 W13 那種只在 CI 上才現形的落差。

使用者於 **10:51:18Z** merge（`gh pr view` 驗證：`state=MERGED`，`mergedBy=laitim2001`，
`mergeCommit=e9ab83a`）。⛔ **不採信宣稱** —— `feedback_verify_pr_merged_via_tool_not_claim`。

### ⛔ 4.x 又是 rebase merge —— `AD-DesignNoteAnchor-1` **連續第 6 次**

九個 SHA **全部**被改寫，逐一驗證舊 SHA `NOT-ON-MAIN` / 新 SHA `ANCESTOR-OF-MAIN`：

| 舊 | 新 | | 舊 | 新 |
|---|---|---|---|---|
| `7bea684` | `736b1f1` | | `50ea93a`* | ⭐ 見下 |
| `652fb64` | `6701305` | | `3d94133` | `706d94d` |
| `88bf634` | `f0cc0a7` | | `6513f47` | `1628e31` |
| `a928972` | `5d37a77` | | `c35968d` | `e9ab83a` |
| `d65f535` | `9c71f50` | | `c10be0c` | **`50ea93a`** |

⭐ **`c10be0c` → `50ea93a` 是最要緊的一個** —— 它的**全部價值就是可查證性**
（「預測寫在執行之前」）。SHA 一改寫，那句證據就指向 main 上不存在的物件，**而所有 gate 仍然全綠**。
它在文件裡有 **7 處引用**，是九個裡最多的。

**重指 27 處 / 7 個檔**，零殘留（`git ls-files` 全掃 + 逐檔 assert）。

### ⭐ 4.x author date 第 4 次確認逐秒不變 —— 而這次它有直接後果

九個 commit 的 `%aI` 與 subject **全部相同**（9/9）。
⇒ **calibration 的數字全部由 author date 導出，所以數字撐過了 rebase，即使 SHA 沒有。**
穩定錨點是 author date，不是 SHA。

### ⛔ 4.x closeout 當下報的是區間，post-merge 才精確 —— 而下界系統性低估

closeout 時 Day 4 只能量到「最後一個產物寫入」= **28.3 min**（下界），因為 closeout commit 還不存在。
merge 後真值 **34.68 min**（`706d94d` → `e9ab83a`），落在我當時所報區間 **[1.08, 1.13] 的上緣**。

| | closeout 當下 | post-merge |
|---|---|---|
| 逐段相加 / 窗口法 | 100.88 / 100.88（六個間隙）| **135.57 / 135.57**（八個間隙）|
| actual | 2.15–2.27 hr | **2.26 hr** |
| ratio | 1.08–1.13 | **1.13**（IN）|

⇒ 低估 **6.4 min（約 19%）**。W13 的 28.0 min 用同一個慣例，**所以那也是下界不是值**。
⭐ 兩個 phase 的 band 判定都不受影響 ⇒ 修法不是「別用下界」，是「**下界要標成下界**」。

⚠️ 附帶：plan §7 把 closeout 估成 30 min，實測 **34.68** —— **七個點裡最準的一項**（+16%）。
用 W13 的下界對照會讓 30 min 看起來是高估，**方向剛好相反**。

### ⛔ 4.x 重指腳本的 assert 擋下了東西，但擋下的是我的預期值

我寫了 `assert total == 17`（來自先前 Grep 的輸出），實際替換 **27** 處。

**腳本沒錯，我的預期值錯了** —— Grep 回報的是**行數**，我拿它當**出現次數**。
`| 7bea684 → 652fb64 |` 是一行兩個 SHA；`CALIBRATION-LOG.md` 的 9 行裡有 15 個 SHA。

⭐ **這是 `AD-NarrowPatternWideClaim-1` 的微縮版**（拿便宜的代理指標回答需要精確計數的問題），
而抓到它的正是 `AD-TextEditStructuralScope-1` **今天才提議的那條 assert**。
⇒ 該提議在被寫下的同一天就攔下了一次真實錯誤 —— 只是攔的方向與預期不同：
**它保護的不只是操作，也是操作者對操作的理解。**
