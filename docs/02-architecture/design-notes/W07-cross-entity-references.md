# W07 Design Note — guarding a child reference when the parent refuses a composite anchor

**Purpose**: Spike-extract design note from Phase W07；記錄**子表跨實體引用**在複合 FK 不可用時
由哪一層擋住的已驗證 runtime invariant，供 M1 slice 5..N 與**每一張引用別表的子表**複製。

**Category / Scope**: Architecture / Phase W07（M1 slice 4）
**Created**: 2026-08-12
**Last Modified**: 2026-08-12
**Status**: Active

> **Modification History**
> - 2026-08-12: Initial creation (Phase W07) — extracted from the shipped slice

> ⚠️ **這份 note 是 extract 不是 pre-write。** 每一條不變式都對應已合併的實作與可重現的驗證指令；
> 沒有實作支撐的東西一律放在 §4「延後、未驗證」，不放進主段落。

---

## 0. Spike Summary

W05 / W06 用 `(parent_id, org_entity_id)` **複合 FK** 關掉跨實體引用。W07 是本 repo
**第一次遇到這招用不上的子表**：

- `ControlTest → Control` —— `controls` **刻意不建** `@@unique([id, org_entity_id])`
  （`apps/api/prisma/schema.prisma:808-812`，M7 的連結表兩側 entity 本來就會不同）
- `Evidence → *` —— `linked_type` + `linked_id` 是多型的，**連 FK 都沒有**

所以本 phase 的問題不是「第 12、13 張表」，是**當父表拒絕錨點時，誰來擋**。
先量再設計：Day 1 三個問題各跑一次，機制由量測結果導出而非由 best practice 導出。

**驗證期間**：2026-08-12（Day 0-3 同日）。**Calibration**：bottom-up 19.75 hr →
committed 12.8 hr (`spike` 0.65) → **actual ~3.8 hr**（逐任務分鐘數見
[`progress.md`](../../01-planning/W07-m1-control-test-and-evidence/progress.md)）。
**測試增量**：unit 192 → **235**（+43）· int 104 → **105**，另 **8 組中性化**各驗一次。

三個原本沒打算問的問題被答了：

1. **RI（外鍵）檢查會不會繞過 RLS？** —— **會**，而且成功本身就是一個 oracle（§2.1）。
2. **裝一個 trigger 是關掉 oracle，還是只換個錯誤碼？** —— 取決於**執行順序**，不是取決於 trigger（§2.2）。
3. ⭐ **新表自己的 `WITH CHECK` 有沒有被測到？** —— 第一版**沒有**，trigger 先擋了（§2.7）。

---

## 1. Decision Matrix

### D1 —— `ControlTest.control_id` 的跨實體引用由哪一層擋

實測於 PostgreSQL 18、`isms_test`、以 `isms_app_user`（**非 owner 非 superuser**，
且 `rolbypassrls = false`）連線。呼叫者 HK1；`a50` = SG1 的 entity-local control（HK1 **讀不到**）、
`a51` = SG1 擁有的 group control（HK1 讀得到）、`a52` = HK1 自己的。
逐項輸出見 [`progress.md` §Day 1](../../01-planning/W07-m1-control-test-and-evidence/progress.md)。

| 動作 | **A** 單純 FK（RLS 已開）| **B** 複合 FK | **C** repository 先讀父列 | **D** BEFORE trigger ⭐ 選這個 |
|---|---|---|---|---|
| 指向別人的**私有** control | ⚠️ **成功**（M1）| — 結構上不可用 | ⛔ 可擋 | ⛔ 23503 |
| 指向**不存在**的 id | ⛔ 23503（M2c）| — | ⛔ 可擋 | ⛔ 23503 |
| **上面兩者可分辨？** | ⚠️ **可以 —— 這就是 oracle** | — | ⚠️ 取決於實作紀律 | ✅ **不可分辨** |
| 指向 **group** control（合法）| ✅ 成功 | — | ✅ | ✅ 成功（M4b / M7）|
| UPDATE 重新指向不可讀父列 | ⚠️ **成功** | — | ⚠️ 多半漏掉 | ⛔ 23503（M6）|
| 繞過 repository 直接寫 SQL | ⚠️ 無防護 | — | ⚠️ **無防護** | ⛔ 仍然擋 |

**選 D 的具體理由**：唯一同時 (a) 關掉存在性 oracle、(b) 不誤擋 ADR-0014 的 group 擴寬、
(c) 在 UPDATE 路徑成立、(d) 繞過應用層仍然有效的形狀。

**否決其他選項的理由**：

- **A（單純 FK）** —— M1 實測 INSERT **成功**：RI 檢查不受 RLS 約束。與 M2c 的 `23503` 合起來，
  呼叫者能分辨「存在但不是你的」與「不存在」。**這正是 約束 8 要求回 404 而非 403 的那個洩漏**，
  只是發生在資料庫層，任何 controller 都改不掉。
- **B（複合 FK）** —— **結構上不可用**，不是「比較差」。`controls` 明文拒絕
  `@@unique([id, org_entity_id])`（`schema.prisma:808-812`），因為 M7 的
  `Risk ↔ Control` 連結表要讓 group control 連到**任何**實體的 risk。
- **C（repository 先讀父列）** —— 違反 約束 8 鐵律 2（優先資料庫層），且它的失效模式
  **正是 W05/W06 反覆量到的那個**：有人繞過 repository 直接寫。⚠️ 更根本的是，
  一個讀得到父表的 repository **有能力**分辨兩種失敗 —— 那個 oracle 會變成「不建議寫」
  而不是「寫不出來」（§2.5 是它的反面）。

### D2 —— `RAISE` 用哪個 SQLSTATE

首版寫 `42501`，Day 2 改判 `23503`，**改完重新量一次**而不是假設結論不變。

| | `42501` insufficient_privilege | `23503` foreign_key_violation ⭐ |
|---|---|---|
| repository 映射到 | `ScopeRefusedError` | `UnknownReferenceError` |
| 使用者看到 | 「org entity … not found」 | 「control or tester not found」 |
| **歸因正確嗎** | ⛔ **不對** —— 錯的是 `control_id`，不是 entity | ✅ 對 |
| 洩漏 id 嗎 | 否 | 否（`UnknownReferenceError` **只帶欄位名**）|
| oracle 是否重開 | — | ✅ **否**，重新量測確認（§2.3）|
| Prisma 會不會改寫訊息 | 不會（無對應）| **會** → "Foreign key constraint violated" |

**選 `23503` 的理由**：`42501` 是 RLS 對「**列自身**越界」用的碼，重用它會讓一個
entity 正確、control 不可達的請求被告知**它的 entity 有問題**。
`scope-refusal.ts` 的 `UnknownReferenceError` docstring 描述的正是這個情境
（"either because no such record exists, or because it belongs to another entity"）。

**代價明說**：Prisma 認得 `23503` 並改寫訊息，**丟掉 trigger 自己的文字**；
`42501` 它沒有對應所以原樣透出。所以「斷言 PostgreSQL 原始訊息」這招**只對 RLS 有效** ——
`control-test.int.spec.ts:190-195` 記錄了這個不對稱。兩個碼都完整到達 repository，
因為 `scope-refusal.ts` 讀的是 SQLSTATE 不是文字。

---

## 2. Verified Invariants

### 2.1 US-1 — **RI 檢查不受 RLS 約束，而成功本身就是一個 oracle**

**不變式**：外鍵驗證看得到**呼叫者看不到的列**。一張只靠單純 FK 保護的子表，
其 INSERT 的**成功／失敗**就足以回答「這個 id 存在嗎」。

**為什麼**：PostgreSQL 的 RI 檢查以系統身分執行參照查詢，不套用呼叫者的 policy。

**量測**（HK1 連線，三個 control 的可見性先驗為 **0 / 1 / 1**）：

| # | 動作 | 結果 |
|---|---|---|
| M1 | `control_id` = `a50`（存在，HK1 **完全看不到**）| ⛔ **INSERT 成功** |
| M2c | `control_id` = 不存在的 id | 拒絕 **23503** |
| M3b | **無 FK** 時 `linked_id` = 純垃圾 | **成功** —— 毫無防護 |

**實作**：`apps/api/prisma/migrations/20260812055744_control_test_and_evidence/migration.sql:150-162`
（量測結果連同結論寫在 migration 裡，不只寫在 progress）。

**Failure mode**：把 trigger 拿掉、只留 FK → 上表第一列恢復成功，
而**任何只斷言「跨實體讀不到」的測試仍然全綠**。

**Verification**: `npm run test:int -w apps/api`
→ `control-test.int.spec.ts:166`（6. 不存在的與不可讀的**逐字同錯誤**）· `:143`（5. 拒絕且沒有列落地）。

**Test fixture**: `apps/api/test/int-global-setup.js` `SEED.controls` —— W06 已種好的三筆
（SG1 local / SG1 擁有的 group / HK1 local），本 phase **不必新建**。

---

### 2.2 ⭐⭐ US-1 — **關掉 oracle 的是「執行順序」，不是「有 trigger」**

**這是本 phase 最重要的一條。**

**不變式**：`BEFORE` trigger 跑在**約束檢查之前**，所以不存在的 id **也走** `NOT EXISTS` 分支，
與不可讀的 id 拿到**同一個** `23503`；FK 根本沒機會開火。
若順序相反，就會變成「不存在 → 23503 / 存在但不可讀 → 別的碼」——
**oracle 原封不動地活下來，而外觀上像修好了**。

**實作**：`migration.sql:176`（`assert_parent_in_scope()`）· `:178`（`SECURITY INVOKER`）·
`:195-213`（`NOT EXISTS` → `RAISE … ERRCODE '23503'`）· `:225` / `:234`（兩個 `BEFORE INSERT OR UPDATE` trigger）。

**`SECURITY INVOKER` 是承重的**：查詢在**呼叫者的** policy 之下執行，所以
「呼叫者讀不到的父列」對這個檢查而言就等於不存在。`DEFINER` 會以 schema owner 身分看到一切，
把守衛變成橡皮圖章。前例與實測：`20260810134319_governed_extensions/migration.sql:89-92`
（W03 已實測 trigger 的 catalog 讀取受 RLS 過濾，並明寫 `DEFINER` 是 escalation surface）。

**Verification**: `control-test.int.spec.ts:166` —— 兩種原因的 `message` **逐字比對相等**，
不是「都被拒絕」。API 層同一件事：`POST /control-tests` 指向他人私有 control 與指向不存在的 id，
**status 與 body 完全相同**（progress.md Day 3 §API-level 表）。

**中性化證明**：移除 `control_tests` 的 trigger → **3 個測試轉紅**（N5）；
移除 `evidence` 的 → **2 個轉紅**（N6）。

---

### 2.3 US-2 — SQLSTATE 換了之後**重新量**，而不是假設結論還成立

**不變式**：改變一個守衛的錯誤碼**可能**改變它的可分辨性，因為錯誤碼決定了呼叫者拿到哪一句話。
所以「只是改個常數」不是跳過重新量測的理由。

**實作**：`migration.sql:196-213` 的區塊註解記錄了完整理由；
`control-test.repository.ts:149`（`ScopeRefusedError`）vs `:156`（`UnknownReferenceError`）
是兩個訊號分流的落點；`evidence.repository.ts:134` / `:141` 同形。

**結果**：兩個訊號現在各說各的 —— **父列不可達** → `23503` →「control or tester not found」；
**列自身越界** → `42501` →「org entity … not found」。**歸因正確，而兩者都是 404、都不洩漏存在性。**

**Verification**: `control-test.controller.spec.ts:176`（兩種 refusal 同為 `NotFoundException`）
· API 層見 progress.md Day 3。

---

### 2.4 US-3 — 多型引用沒有 FK，於是 trigger **同時扮演缺席的 FK**，且對未知型別 **fail closed**

**不變式**：`evidence.linked_id` 沒有、也不會有外鍵（`02a:227` 是多型的）。
那個 trigger 因此做**兩件事**：它是缺席的參照完整性，**也是**範疇守衛。

**為什麼重要**：M3b 量到無 FK 時**純垃圾 id 也會落地**。所以這裡拿掉 trigger 不只是
「範疇防護消失」，是**連「指向真實存在的東西」都沒有人管**。

**實作**：`migration.sql:229-236`（含註解說明兩個職責）。
`linked_type` **只有 `control_test` 一個值**，且 trigger 對它不認得的型別
**查不到 → 拒絕**，是正確的預設。

**Verification**: `evidence.int.spec.ts:159`（6. trigger 補上缺席的 FK —— 垃圾 id 被拒）
· `:132`（5. 別人的 test 與不存在的 id **不可分辨**）· `:101`（2. `linked_type` 只設不收）。

**中性化證明**：N6 —— 移除 `evidence` 的 trigger → **2 個測試轉紅**。

---

### 2.5 US-2 / US-3 — **不給父表 delegate**，是讓 oracle **寫不出來**而不只是「不建議」

**不變式**：能先讀父表的 repository 就有能力分辨「不存在」與「不是你的」。
型別上不給它那個 delegate，那段程式碼就 compile 不過。

**實作**：`scoped-client.types.ts:158`（`ScopedControlTestClient`，**沒有** `control`）·
`:176`（`ScopedEvidenceClient`，**沒有** `controlTest`）。
runtime 是同一個 Prisma client 物件，差別**只在型別**。

⚠️ **與 W06 §2.6 的差異值得讀**：那裡 oracle 之所以寫不出來，是因為**複合 FK**
對「不存在」與「不是你的」給同一個錯誤；這裡沒有那把 FK，
collapsing 由 §2.2 的 BEFORE trigger 完成。**同一個保證，不同機制，同一個結論。**

**Verification**: `npm run type-check -w apps/api`（把 `control` delegate 加進該介面即 compile error）。

---

### 2.6 US-4 — `USING` 與 `WITH CHECK` **作用在不同的列**，所以單一 `FOR ALL` 擋不住奪取

**不變式**：`UPDATE` 的 `USING` 看**舊列**、`WITH CHECK` 看**新列**。
當 `USING` 為了讓 group 列可讀而放寬時，一次 `UPDATE` 就能把 group 列改成自己持有 ——
**兩側都通過**，而該列從其他 12 家眼前消失。

**這不是理論**：`extension_fields` 從 W03 起就帶著這個洞（`AD-GroupRowTheft-1`）。

**先看到紅**（修補前，實際輸出）：

```
expect(result.count).toBe(0)  →  Received: 1
SG1 成功把 org_entity_id IS NULL 的 group 宣告改成自己名下
```

**實作**：`20260812063000_extension_fields_per_command/migration.sql:32`（`_read`，維持寬）
· `:44`（`_insert`，窄）· `:51-54`（`_update`，**兩側同一條件**）。
⛔ **DELETE 不補 policy** —— 缺少 GRANT 已經擋住，且權限檢查在 RLS 之前（W06 test 10）；
補一條窄的 `FOR DELETE` 會讓這張表**變鬆**（W06 §2.2）。

**Verification**: `policy.int.spec.ts:248`（"no entity can pull a group-wide extension field into itself"）。

**中性化證明**：N8 —— `extension_fields_update` 的 `USING` 還原成修補前形狀 → **1 個測試轉紅**。

---

### 2.7 ⭐⭐ US-5 — **trigger 跑在該列自身的 `WITH CHECK` 之前**（`AD-BorrowedRefusal-1` 第 3 次）

**不變式**：一個「跨實體寫入被拒」的測試，若該寫入**同時**觸發了 trigger，
證明的是 **trigger 拒絕了它**，**不是**這張表自己的 INSERT policy 拒絕了它。
那條 policy 的覆蓋率是 **0**，而測試是綠的。

**怎麼發現的**：兩個「釘 INSERT policy」的測試第一版都是綠的。
把它們的意圖倒過來問一次 ——「如果我把 `WITH CHECK` 改成 `true`，這個測試會紅嗎？」—— 答案是不會。

**修法**：讓 trigger **通過**（父列取當前範疇讀得到的），`WITH CHECK` 才是唯一還能拒絕的東西；
且該寫入**不得產生 `RETURNING`**（W05 條款 2 的修正版，`createMany`）。

**實作**：`control-test.int.spec.ts:228`（10.）· `evidence.int.spec.ts:206`（9.）——
兩者的測試名稱都明寫 "with no RETURNING to hide behind"。

**中性化證明**：N2（`control_tests_insert` `WITH CHECK` → `true`）**RED ×1** ·
N4（`evidence_insert` 同）**RED ×1**。修法之前這兩格都是 **0**。

⚠️ **同一形狀第 3 次**（W05 = ref-code counter 代勞 · W06 = `RETURNING` 遮蔽 · W07 = trigger 先擋）。
依 `.claude/rules/README.md` 的強度階梯，**第 3 次應改結構性解法** → `AD-BorrowedRefusal-2`（§4）。

---

### 2.8 US-1 — carryover 驗收：`risks` 的 11b 現在**真的**釘住它宣稱的東西

**不變式**：W06 交給 slice 4 的條款是「該寫入不得產生 `RETURNING`，
且**驗收方式不是它綠，是把該表的 `WITH CHECK` 中性化後它會紅**」。

**實作**：`risk.int.spec.ts:302`（11b，改用 `createMany`）。

**中性化證明**：N7 —— `risks` 的 `WITH CHECK` → `true` → **RED ×1**。

⛔ **N7 第一次跑是「STAYED GREEN」，而那是量測錯誤不是發現**：錨點字串
`WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));` 在那個 migration 裡出現**三次**
（`asset_groups` / `assets` / `risks`），`String.replace` 換掉第一個 ——
**中性化到的是 `asset_groups`**。改用完整 policy 區塊當唯一錨點後重跑才是 RED。
**「零轉紅先查是不是假象」這條規則在本 phase 救回一個錯誤結論。**

---

## 3. Cross-Scope Contracts

| 契約 | 供給方 | 消費方 | 形狀 |
|---|---|---|---|
| `ScopedControlTestClient` | `entity-scope`（結構相符，非 import）| `core-model` | `scoped-client.types.ts:158` |
| `ScopedEvidenceClient` | 同上 | 同上 | `:176` —— ⛔ **不可加入 `controlTest`**，見 §2.5 |

⚠️ 沒有新的跨範疇**登記表**條目 —— 兩個介面沿用 W03 建立的「core-model 宣告它需要的形狀」
技術（`scoped-client.types.ts:12-29` 記錄該技術的由來與它**不是** DI token 的理由），
不是新的契約類型。

---

## 4. Open Invariants（延後，**未驗證**）

⛔ 以下**沒有**在本 phase 被驗證，不得當作已知成立：

- **`assert_parent_in_scope()` 的每寫入成本未量** —— `EXECUTE format(...)` 每列一次動態查詢。
  今天 `controls` 3 列、`control_tests` 個位數，`EXPLAIN` 量不出東西。
  與 `AD-ExtensionQueryCost-1` / `AD-ScopeFnCost-1` 同一類，M1 有真實資料量時一併處理。
- **review transition 與 SoD** —— `02a:416` 明寫 `reviewer_user_id ≠ tester_user_id`
  enforced in the review transition，而**本 phase 的端點是 create-only**，沒有 transition。
  `status` / `performed_at` / `reviewer_user_id` / `conclusion` 因此**都不收呼叫者輸入**。
- **`Control.effectiveness` 的派生** —— `02a:418` 說它 reflects the latest completed `ControlTest`，
  但沒有任何測試會轉到終態，派生**沒有觸發點**。
- **`Evidence` 的另外兩個 `linked_type`** —— `attestation` / `assessment` 兩張表都不存在。
  trigger 對它們**fail closed**（§2.4），那是正確的預設，但**該分支從未被走過**。
- **`hash` 只是必填，沒有任何東西驗證它** —— 沒有演算法約定、沒有重算比對、
  沒有人證明那串字元對應 `uri_or_blob_ref` 的內容。**證據等級的完整性錨點目前是一個字串欄位。**
- **稽核軌跡** —— 本 phase 再新增**兩條無稽核的寫入路徑**（M3 / ADR-0003 / `RISK_REGISTER` R4）。
- **RLS 的 `DELETE` 全拒仍不可觀察** —— 沿用 W06 §4 的分界：`isms_app` 沒有 `DELETE` 授權，
  `control-test.int.spec.ts:262` / `evidence.int.spec.ts:236` 斷言的是 **GRANT 層**。

---

## 5. Rollback / Fallback

| 要退什麼 | 怎麼退 | 估計成本 |
|---|---|---|
| **`assert_parent_in_scope()` trigger** | ⛔ **不要退** —— 退了就回到 §2.1 的 oracle，且 `evidence` 連 FK 都沒有 | — |
| **`23503` 改回 `42501`** | 改 `RAISE` 的 `ERRCODE` + repository 的分支 | ~1 hr，**但必須重跑 §2.2 的可分辨性量測** |
| **兩張表整個** | migration 反向；`bootstrap/app.module.ts` 移除兩個 module | ~0.5 天 |
| **`extension_fields` per-command 拆分** | ⛔ **不要退** —— 它關的是一個**活著的**隔離缺陷（§2.6）| — |

**回滾窗口**：實務上在**第三張引用別表的子表複製這個形狀之前**。
每多一張表，成本線性上升 —— 那正是現在把它定下來的理由。

**Fallback 是否已存在**：**部分**。複合 FK 形狀在 `assets → asset_groups` 上仍在運行，
但它對 `ControlTest → Control` **結構上不可用**（D1 選項 B），所以這裡沒有「退回既有機制」可走 ——
退掉 trigger 等於退掉防護本身。

---

## 6. References

- **Change record**: [`CH-022`](../../03-implementation/changes/CH-022-w07-control-test-and-evidence.md)
- **Phase 四件套**: [`W07-m1-control-test-and-evidence/`](../../01-planning/W07-m1-control-test-and-evidence/plan.md)
- **前一片的 note**: [`W06-row-level-scope.md`](./W06-row-level-scope.md)
  —— §2.4（`RETURNING` 遮蔽）是本 phase §2.7 的前一次，§2.6 是 §2.5 的前一次
- **ADR**: [`0014`](../../14-adr/0014-row-level-entity-scope-and-per-command-policies.md)
  —— per-command policy 形狀；本 phase 兩張表**不做** group widening（測試結果屬單一實體）
- **規格**: `02a:225`（ControlTest 欄位 + W07 記錄的偏離）· `02a:227`（Evidence 同）·
  `02a:385-396`（五態 lifecycle）· `02a:415-418`（範疇 / SoD / 派生三條規則）
- **無新 ADR**：本 phase 的機制不是「選 A 不選 B」的取捨，是量測**排除其他選項後剩下的唯一可行解**
  （D1 的 B 結構上不可用、C 違反鐵律 2）。它約束後續的子表，所以歸屬 design note 而非 ADR ——
  判準見 [`14-adr/README.md`](../../14-adr/README.md) 的 forcing-function 表
