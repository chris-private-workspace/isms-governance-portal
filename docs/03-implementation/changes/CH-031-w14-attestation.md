# CH-031: Attestation, and the second branch of the polymorphic parent guard

**Date**: 2026-08-15
**Phase**: W14
**Scope**: core-model（+ modules / audit-trail / prisma）
**Components**: —
**PR**: #63（**MERGED** 2026-08-15，`e9ab83a` —— rebase merge，九個 SHA 全被改寫）

---

## Problem

`02a:235` 定義了 `Attestation`（M1 slice 9）—— 「某人在某刻對某個 policy 或 control 簽了名」。
它是 M1 最後一張未建的表，而且它一次撞上三個**已知會出事**的形狀：

1. **第二個多型欄位。** `evidence.linked_id` 是本 schema 第一個沒有 FK 的父參照，W07 為它建了
   `assert_parent_in_scope()` 這道守衛。`attestations.subject_id` 是第二個，而
   `evidence.repository.ts:26` 早就寫下了它自己的到期條件：
   *"When attestation or assessment arrive, this becomes an input **in the same change that gives
   the trigger its second branch**, and not before."*

2. **W13 的漂移守衛從未被實戰檢驗。** `audit-coverage.int.spec.ts` 宣稱「新的寫入面沒接稽核就會紅」，
   但 W13 交付它的時候並沒有新的表可以觸發它。**一條沒被觸發過的守衛與 Potemkin 不可分辨**。

3. **量到過兩次的存在性 oracle。** 沒有 FK 的欄位，若「撞到別實體的 id」與「不存在的 id」
   回不同的錯誤，攻擊者就能拿它當 id 探測器。W07（M3/M3b）與 W10 各量到過一次。

---

## Root Cause

多型欄位在本 schema 是**設計選擇**而非疏漏（`02a:227` 明說 `linked_id` 不建 FK），
但那個選擇把「參照完整性」從資料庫的宣告式保證，換成了一個**每次新增分支都要有人記得寫**的
程序性保證。W07 已經預見這件事並留下了到期條件，問題是**沒有任何機械檢查會在到期時提醒**。

而 `assert_parent_in_scope()` 本身**無法**被擴充成多型：它讀 `TG_ARGV[0]` / `TG_ARGV[1]`
（`20260810...migration.sql:181-182`），那是 **`CREATE TRIGGER` 時寫死的字面值**，不是 runtime 值。
「依 `NEW.linked_type` 決定查哪張表」這個分支必須**逐列**發生，換參數換不出來 —— 這是 Day 0 的 **D1**，
plan §3.3 只寫了方向沒寫機制。

---

## Solution

| 檔案 | 類型 | 說明 |
|------|------|------|
| `prisma/migrations/20260815083338_attestation/migration.sql` | 新增 | `attestations` 表 + RLS **2 條**（`INSERT`/`SELECT`），⛔ 連 `GRANT UPDATE` 都沒有 |
| `prisma/migrations/20260815090746_polymorphic_parent_guard/migration.sql` | 新增 | `assert_polymorphic_parent_in_scope()`；`attestations` 與 `evidence` 兩個 trigger；`ALTER TYPE evidence_linked_type ADD VALUE 'attestation'` |
| `prisma/schema.prisma` | 修改 | `Attestation` model · `AttestationSubjectType` · `EvidenceLinkedType` 第二個值 |
| `core-model/attestation.repository.ts`(+`.spec`) | 新增 | create / list，走 `runScoped` |
| `core-model/scoped-client.types.ts` | 修改 | `ScopedAttestationClient` —— ⛔ **刻意不暴露 `policy` / `control`** |
| `core-model/evidence.repository.ts`(+`.spec`) | 修改 | `linkedType` 硬編碼 → 輸入（W07 契約到期） |
| `modules/attestation/{controller,module,int.spec,controller.spec}.ts` | 新增 | create + list 端點；查無資料 **404 不回 403** |
| `modules/evidence/{controller,controller.spec,int.spec}.ts` | 修改 | 契約反轉，**舊測試標題原文保留在 docstring 裡** |
| `audit-trail/audit.module.ts` | 修改 | `AUDITED_MODELS` **15 → 16** |
| `audit-trail/audit-coverage.int.spec.ts` | 修改 | +1 條 Attestation 覆蓋測試 |
| `test/int-global-setup.js` | 修改 | seed 兩筆 attestation + counter |

### 三個 load-bearing 的決定

**(1) 新建 polymorphic 變體函式，舊函式一行未動。**
候選 (a)「加第三個 `TG_ARGV` 傳型別欄位名」被**量測**否決而不是被品味否決：本 schema 現在有
**兩個**多型欄位，而它們的映射**不重疊** —— `evidence.linked_id` 是
`control_test→control_tests` / `attestation→attestations`，`attestations.subject_id` 是
`policy→policies` / `control→controls`。第三個參數最終要承載整份映射，那時它已經是另一個函式穿舊名字。
⛔ **不是 AP-5**：新函式**當下就有兩個呼叫端**，與 W07 給 `assert_parent_in_scope` 收參數的理由相同。
舊函式仍服務 `control_tests_control_in_scope` ⇒ 三個 phase 依賴的守衛**零回歸面**。

**(2) 不建 `status`。** `02a` §4 給了 Policy / Risk / Issue / ControlTest 狀態機，`:417` 另列
Action / Assessment / Event —— **Attestation 兩處皆無** ⇒ 沒有值域來源。這是 W07 移除
`ControlTest.result` 的**鏡像**：那裡是「§4 終態已承載它」，這裡是「**沒有終態，所以 `result` 是唯一承載者**」。

**(3) RLS 只有 2 條，連 `GRANT UPDATE` 都沒有。** 依 `rm_report_versions` 先例（W10）：
attestation 是「某人在某刻簽了」的記錄，事後編輯不是更正事實而是**替換證據**。
更正 = 新的一列，撤回 = `retired_at`。ADR-0014 的判準是「缺席即最嚴格」。
⚠️ **這個決定有一個可見的下游代價**：覆蓋測試無法 teardown（其餘 15 條做的 retire 在這裡會
`permission denied`）。那是決定在運作，不是測試的缺口。

---

## Verification

**Gate**（十一項各自 exit code）: `format:check` api/web **0/0** · `lint` **0** · `type-check` **0** ·
`build` api/web **0/0** · `lint:negative` **PASS**（60 掃描 / 0 bypass）· api unit **480/40**
（baseline 451/38，**+29/+2**）· **api int 218/17**（baseline 203/16，**+15/+1**）· web **10/1** ·
coverage **92.14 / 91.77 / 98.98 / 93.56** · `run_all` **8/8** · `check_entity_index` ⭐ **22/35**

**新增測試**: `attestation.int.spec.ts`（14）+ `attestation.repository.spec.ts` /
`attestation.controller.spec.ts`（29 unit）+ `audit-coverage` +1。

**負面測試 —— 四個中性化，預期方向先 commit（`50ea93a`）再執行**：

| N | 中性化 | 預期 | 實際 |
|---|---|---|---|
| N1 | `DROP TRIGGER attestations_subject_in_scope` | 3（測試 5·6·8）| ✅ **3**，且 ⭐ 測試 7 **仍綠** |
| N2 | `AUDITED_MODELS` 移除 `'Attestation'` | **恰好 2** | ✅ **恰好 2** |
| N3a | schema enum 移除 → type-check | 1 錯 | ✅ 1 錯，連檔案行號命中 |
| N3b | 同上 → int suite | 全綠 | ⛔ **1 紅 —— 預測錯** |
| N4 | 移除 seed 的兩筆 attestation | 5 | ✅ **5**，含跨 suite 那條 |

⭐ **N1 的價值在於沒有變紅的那一條**：拆掉守衛之後測試 7（group control 跨實體）**仍綠**，
這從另一側證明它的接受來自 `controls_read` 的 `applies_to_scope = 'group'` 放寬（ADR-0014 / `02a:434`），
不是來自守衛缺席。**只寫測試 7 會得到一條修法前後都通過、什麼都不證明的測試**（`AD-VacuousScopeTest-1` 的形狀）。

⭐ **N2 是本片的驗收核心**：W13 的漂移守衛在**建表但未接稽核**的狀態下**恰好 1 紅**，
訊息自己指名 `Attestation`（`unaudited` 側），而 15 條逐模型覆蓋測試**一條未動**
⇒ 守衛的偵測**獨立於**它們。R4 十個 phase 的失效模式在第 22 張表上被機械攔下。

**⛔ N3b 的錯比預測本身有用**：我推論 `schema.prisma` 的 enum 只是 TS 型別，runtime 會把字串直接交給 DB。
**實際上 Prisma 的 generated client 在 runtime 也驗證 enum 值。**
⇒ 不是兩份真相，是**三份**：`schema.prisma` · **generated client** · DB catalog，而中間那份會擋。
**實務後果**：`ALTER TYPE ... ADD VALUE` 的 migration **必須**配 `prisma generate`，
否則會出現「DB 接受、應用層拒絕」的分歧，而那只在部署時現形。

**Drive-through**: ⚪ **N/A** —— 純後端，無 user-facing surface。

**Verdict**: ⚪ **gate-only verified** —— ⛔ 不得暗示可用性。

---

## Impact

- **Breaking change**: **yes（內部契約）** —— `evidence` create 的 `linkedType` 從「被忽略」變成
  「必填且驗證」。無外部消費者（`apps/web` 未接 evidence），但**三個測試因此反轉**，原文保留於 docstring。
- **Migration**: **yes**，兩個，**皆手寫 UTC 時間戳**（`AD-MigrationTimestampTz-1`）——
  `20260815083338_attestation` · `20260815090746_polymorphic_parent_guard`。
  ⚠️ **不可逆的那一半**：`ALTER TYPE ... ADD VALUE` 在 PostgreSQL 無法直接撤銷。
  ⚠️ 第二個 migration **DROP 並重建** `evidence_linked_in_scope`（兩個 BEFORE trigger 依名稱排序執行，
  那是沒人會記得的隱性相依）。
- **Config**: 無新增環境變數。
- **重啟需求**: 無 startup-only wiring。⛔ **但有 codegen 需求** —— 見 N3b：套用 migration 後
  **必須** `prisma generate`。
- **Rollback**: revert 程式碼 + `DROP TABLE attestations` + `DROP FUNCTION
  assert_polymorphic_parent_in_scope` + 把 `evidence_linked_in_scope` 指回
  `assert_parent_in_scope('control_tests','linked_id')`。~15 min。
  ⚠️ enum 值留在原地（見上），無害但不對稱。

---

## 相關

- **關掉的待辦**: 無 —— 本片是 plan 的 deliverable，不是在關 AD。
- **產生的待辦**: `AD-PolicyAttestationFlag-1`（`Policy.requires_attestation` 移出本片 → M6）
  → `docs/01-planning/BACKLOG.md`
- **同類前例**: CH-030（W13 建的漂移守衛，本片是它的第一次實戰）·
  W07 的 `assert_parent_in_scope`（本片的直接藍本，且它為本片預先寫下了到期條件）·
  W10 的 `rm_report_versions`（2 條 RLS 的先例）
