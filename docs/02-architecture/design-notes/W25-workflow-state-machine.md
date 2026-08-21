# W25-workflow-state-machine Design Note (Phase W25 extract)

**Purpose**: 從 OQ-7 spike 的**已完成實作**中抽取：一條 Wave 1 生命週期在這個平台上要怎麼寫才守得住。
**Category / Scope**: Design note / Phase W25 (M5 slice 1)
**Created**: 2026-08-21
**Last Modified**: 2026-08-21
**Status**: Active

> **Modification History**
> - 2026-08-21: Initial extract (Phase W25) — 從實作抽取，非預寫

---

## 0. Spike Summary

| | |
|---|---|
| **Phase scope** | Policy 生命週期一條流程（`02a-data-model-spec.md:362-370` 的 7 條實邊），兩個候選實作 |
| **驗證期間** | 2026-08-21（單日）|
| **Calibration** | bottom-up ~20.5 hr → committed ~13.3 hr（`spike` 0.65）· actual 見 `retrospective.md` Q2 |
| **測試增量** | api unit **484 → 507**（+23）· api int **269 → 280**（+11）|
| **決策產出** | ADR-0002（已採納）· OQ-7 CLOSED · D004 維持 defer · **新 OQ-9** |

⛔ **本 note 涵蓋的是 policy 一條流程。** issue→action（Wave 1 第二條）**未做**，
每一條不變式的射程都限於 policy，見 §4。

---

## 1. Decision Matrix

| 維度 | A 自建宣告式轉換表 | B 嵌入 XState 5.32.5 | C 外部 BPM engine |
|---|---|---|---|
| 定義行數（非註解）| **46** | **≈47**（32 + 向 A 借的 15）| 未量測 |
| schema↔實作綁定 | **型別系統，雙向** | **零連結** | 未量測 |
| 錯誤訊息取得成本 | 查表 O(1) | 反推 O(states) | 未量測 |
| 與稽核鉤子接合 | — | **零額外接線** | 未量測 |
| 相依 | 0 | +1（0 遞移 · 0 advisory · MIT）| 部署面積 |

**選 A。** 唯一分出高下的是綁定那一列；其餘打平或接近雜訊。
**否決 B** 不是因為它差，是因為它在量到的維度上**沒有買到東西**卻付了綁定的代價。
**否決 C**：沒有任何一條 Wave 1 流程需要它獨有的能力（D004 維持 defer）。

**行數的 Verification**（`wc -l` 會說謊 —— 它量到註解密度）：
逐檔剝除 block comment / 行註解 / 空行後計數。
候選 A = `workflow/transitions.ts`(24) + `workflow/transition.guard.ts`(22) = **46**；
候選 B = 32，**但它 `import` 了 A 的 `IllegalTransitionError`（14 code 行）與 `POLICY_STATUSES`（1 行）**
⇒ 獨立存在需 **≈47**。`wc -l` 版本是 191 vs 105（「B 少 45%」）—— **那是假象**。

完整量測與反例：`docs/01-planning/W25-oq7-workflow-spike/progress.md` §2.6-2.9 · 決策：`docs/14-adr/0002-workflow-engine.md`

---

## 2. Verified Invariants

### 2.1 US-1：轉換表由 Prisma enum **窮舉綁定**，schema 漂移是編譯錯誤

- **Implementation**: `apps/api/src/workflow/transitions.ts:68`
  （`Readonly<Record<PolicyStatus, readonly PolicyStatus[]>>`）
- **Behavior**: 少一個 enum 值 → 缺鍵；多一個表外的值 → 不合型別。兩個方向都在 `tsc` 擋下。
- **Verification**（實測過，兩個方向）:
  - 刪 `transitions.ts:74` 的 `retired: []` → `npm run type-check -w apps/api`
    ⇒ `error TS2741: Property 'retired' is missing`
  - 在 `published` 加一個 enum 沒有的目標 → ⇒ `error TS2322: Type '"superseded"' is not assignable to type 'PolicyStatus'`
- **Test fixture**: `apps/api/src/workflow/transition.guard.spec.ts` —— runtime 版本的同一個斷言
  （`Object.values(PolicyStatus)` 與 `POLICY_STATUSES` 比對）

### 2.2 US-1：守衛是**無 I/O 的純 predicate**，且證據是機械的

- **Implementation**: `apps/api/src/workflow/transition.guard.ts:78`（`assertTransition`）
- **Behavior**: `(from, to) => void | throw`。不碰請求、容器、資料庫。
- **Verification**: 它的測試檔在 **unit** 設定（`jest.config`），**不在** `jest.int.config.js`。
  `npm run test -w apps/api -- transition.guard` **在資料庫關閉時照樣通過** ⇒ 無 I/O 是被執行證明的，不是被宣稱的。
- **Test fixture**: `apps/api/src/workflow/transition.guard.spec.ts`（17 tests）

### 2.3 US-1：拒絕訊息帶**合法替代集合**，不只是「你錯了」

- **Implementation**: `apps/api/src/workflow/transition.guard.ts:54`（`IllegalTransitionError` 帶 `from`/`to`/`allowed`）
- **Behavior**: `refusing in_review -> published: legal transitions from in_review are approved, draft`
- **Verification**: `npm run test -w apps/api -- transition.guard`
  的 `names the legal alternatives in the error, not just the refusal`；
  drive-through 實測 HTTP 422 body 含 `allowed: ["approved","draft"]`

### 2.4 ⭐ US-1：合法性檢查與**並行控制是兩層**，後者必須在寫入的 statement 裡

- **Implementation**: `apps/api/src/core-model/policy.repository.ts:153`
  —— `where: { id, status: expected, retiredAt: null }`（compare-and-set）
- **Why it must be**: `runScoped` 一次呼叫 = **一個** `$transaction`
  （`apps/api/src/entity-scope/scoped-prisma.provider.ts:97-113`）⇒
  read-then-write 是**兩個**交易，中間有 TOCTOU 窗，而稽核列會宣稱一次「從某個它已經離開的狀態」出發的轉換。
- **⛔ 必須用 `update` 不是 `updateMany`**：後者匹配不到時回 `{count:0}` 而交易**照樣 COMMIT**
  ⇒ 留下一筆宣稱轉換發生了的稽核列（稽核 entry 在寫入**之前**就進了同一個交易，且讀不到寫入結果）。
- **Verification**: `npm run test -w apps/api -- policy.repository`
  的 `puts the observed status in the WHERE clause, not in a prior check`
  —— **斷言的是位置不是結果**，把 `expected` 移到上面的 `if` 會讓它轉紅
- **Test fixture**: `apps/api/src/core-model/policy.repository.spec.ts`

### 2.5 US-1：守衛套在 `modules` 層，因為 `core-model` **不被允許**知道生命週期

- **Implementation**: `apps/api/src/modules/policy/policy.controller.ts:143-144`（`@Patch(':id/status')`）
- **Constraint**: `eslint.config.mjs:80-81` —— `MATRIX.modules` 含 `workflow`，
  而 `MATRIX['core-model']` **只有** `['api','core-model']`。
- **Behavior**: controller 讀現值 → 套守衛 → compare-and-set。repository 只負責寫，不知道哪些邊存在。
- **Verification**: `npm run lint -w apps/api`（boundaries 政策預設 disallow，違規會指名兩個範疇）

### 2.6 US-2：轉換的稽核涵蓋 —— **本 repo 第一次實走 update 路徑**

- **Context**: W25 Day 0 實測全樹**零個 domain `update`**
  （`Grep '\.(update|updateMany|upsert|delete|deleteMany)\(' apps/api/src --glob '!*.spec.ts'` ⇒ 4 命中全非 domain 寫入）。
  既有 15 個模型的稽核覆蓋測試**每一條都是 `create`**（`apps/api/src/audit-trail/audit-coverage.int.spec.ts:26-32` 自述）。
- **Behavior**: 一次合法轉換 → 恰好一筆 `Policy.update` 稽核列，`after` = 請求 payload。
  非法轉換 → **零筆**（守衛在寫入前擋下）。
- **Verification**: `npm run test:int -w apps/api -- workflow`；
  drive-through 另在 **dev 資料庫**直查：3 次成功轉換 ⇒ 恰好 3 筆，2 次 422 ⇒ 0 筆
- **Test fixture**: `apps/api/src/workflow/workflow.int.spec.ts`（11 tests，含約束 8 的四個範疇測試）

### 2.7 ⭐ US-2：防篡改鏈在 update 路徑上**成立**（guardrail 5）

- **Verification**（真 dev DB，非測試）:
  ```
  docker exec isms-postgres-dev psql -U isms_dev -d isms_dev -X -c \
    "SET app.entity_scope = '<SG1 uuid>'; \
     SELECT id, prev_hash = COALESCE(lag(row_hash) OVER (ORDER BY id), prev_hash) AS chained, \
            octet_length(row_hash) AS hash_bytes FROM audit_log ORDER BY id;"
  ```
- **Observed**: 4 筆全部 `chained = t`，`hash_bytes = 32`。
  （`schema.prisma` 的 `row_hash` 註解：**0 長度代表 trigger 沒跑** ⇒ 32 代表它跑了。）

---

## 3. Cross-Scope Contracts

**一個新的跨範疇邊，已在既有矩陣內，無需修改政策**：

| From | To | 用途 | 授權處 |
|---|---|---|---|
| `modules` | `workflow` | controller 套用轉換守衛 | `eslint.config.mjs:81`（已含）|

**一個介面加寬**（`core-model` 內部，非跨範疇）：
`apps/api/src/core-model/scoped-client.types.ts:112` —— `ScopedPolicyClient` 新增
`update(args: Prisma.PolicyUpdateArgs)`，**是該檔案的第一個 `update` delegate**。
理由寫在該處：W10 與 W14 兩次需要 update 都改用資料庫 trigger 迴避，
而**生命週期轉換無法迴避** —— 把狀態機推進 SQL 正是 OQ-7 要權衡的選項之一，不能靠省略決定。

---

## 4. Open Invariants（延後、未驗證）

- [ ] **issue→action 生命週期** —— Wave 1 第二條流程，plan §3.x 排除。
      ⚠️ 本 note 的每一條不變式**只在 policy 上驗證過**。
- [ ] ⛔ **per-OpCo 的簽核流程** —— 五條邊界判準的第 4 條，**完全未驗**。
      它是產品問題不是工程問題 ⇒ `decision-form.md` **OQ-9**。
      **若答案是「需要」，ADR-0002 必須重開。**
- [ ] **SLA timer / 升級** —— `05-platform-foundation-services.md:16` 說在 Wave 1 射程。
      一個與主流程並行倒數的 SLA **實質上是平行區域** ⇒ 會推翻判準 2。
- [ ] **稽核的 `before` 側** —— `apps/api/src/audit-trail/audit.recorder.ts:153` 恆 NULL（結構性，非未實作）。
      `from` 目前**由同一 `resource_id` 前一筆稽核列回推**。⇒ ADR-0003 的輸入。
- [ ] **create 與 update 的 `resource_id` 不同** —— `audit.recorder.ts:252`
      （`where.id ?? data.id ?? data.refCode`）⇒ create 記 refCode、update 記 UUID，
      **單一 key 取不到一份 policy 的完整歷史**。⇒ ADR-0003 的輸入。
- [ ] **滾升 scope 不能轉換** —— `audit.recorder.ts:229-244` 在 payload 無 `orgEntityId`
      且 scope 多實體時拒絕寫入。fail-closed 是對的，但**沒有人刻意選過**。
- [ ] **actor** —— `audit.recorder.ts:146` 寫死 `actorId: null`（M4 identity 未建）。
      ⇒ 「誰核准了這份政策」今天記不下來，而那正是 approval flow 的核心欄位。
- [ ] ⛔ **UI 入口** —— `/policies` 上**沒有任何控件**會呼叫 `PATCH`。
      轉換能力已 drive-through 驗證，**但使用者今天無法從介面推進狀態**。

---

## 5. Rollback / Fallback

- **若此設計錯了（需要 statechart 引擎）**：`npm install --save-exact -w apps/api xstate@5.32.5`，
  改寫 `workflow/transitions.ts` + `transition.guard.ts`，
  並把 `policy.controller.ts` 的**一行 import** 指過去。
- **估計成本**：**< 1 天** —— 不是估的：W25 Day 2 **真的做過這個替換**，
  跑完整套件 unit 512/42 + int 280/22 全綠，只改一行 import。
- **fallback 機制已存在嗎**：是。`assertTransition(from, to) => void` 是兩個候選共用的簽名，
  它不變，換實作就一直是一行 import 的事。

---

## 6. References

- **決策**: [`docs/14-adr/0002-workflow-engine.md`](../../14-adr/0002-workflow-engine.md)
- **生命週期權威**: `docs/02-architecture/02a-data-model-spec.md` §4（`:362-370`）
- **量測與反例**: `docs/01-planning/W25-oq7-workflow-spike/progress.md`
- **稽核機制**: [`docs/14-adr/0003-audit-trail-hash-chain.md`](../../14-adr/0003-audit-trail-hash-chain.md)
- **範疇邊界**: `eslint.config.mjs` · `docs/rules-on-demand/scope-boundaries.md`
