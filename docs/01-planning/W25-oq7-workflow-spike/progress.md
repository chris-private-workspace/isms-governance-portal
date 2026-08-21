# Phase W25 Progress

## 2026-08-21 — Day 0：Plan-vs-Repo Verify（三-prong）

**基準**：`main` HEAD `664fcdc` · branch `feature/W25-oq7-workflow-spike` 已開

### Prong 1 — path verify：**12 / 12 如預期**

5 個 NEW 檔皆不存在 · 4 個 EDIT 檔皆存在 · 3 個 UNTOUCHED 皆存在。
`apps/api/src/workflow/` 確認**只有 `.gitkeep`**。CH 最大號 **CH-046** ⇒ 本片用 **CH-047**
（Day 4 需再掃一次所有分支，PROCESS §2.2）。

### Prong 2 — content verify：**兩條良性、兩條改變本片形狀**

| ID | Finding | Implication |
|---|---|---|
| **D1** ⛔⭐ | **`Policy.status` 在 API 層有 0 條寫入路徑** —— `POST /policies` 只接 `orgEntityId` / `title` / `extensions`（`policy.controller.ts:104-118`），**沒有任何 `@Put` / `@Patch`**。全 `apps/api` 唯一的 status 寫入者是 `prisma/seed.ts:434`（其餘命中全在 `dist/`，build 產物）| plan §3.1「守衛接在 `D-status-writers` 找出的共同下游」**前提不成立** —— 沒有下游可接。⇒ 本片必須**自己建出第一條轉換路徑**（新表面，不是編輯既有的）。⚠️ 同時 **R3（守衛可繞過）在 API 層消解**：沒有其他寫入路徑可繞 —— 但 `seed.ts` 仍是一條，它繞過一切 |
| **D2** ⛔⭐⭐ | **稽核軌跡結構上記不到 `from`** —— `audit.recorder.ts:20-31` 自述：`runScoped` 交給 `$transaction` 的是**未啟動的 promise 陣列**，所以每個欄位必須在 domain write **之前**算得出來 ⇒ **`before` 恆為 NULL**、`after` 是**請求的 payload** 而非實際存入的列。能拿到真正 before/after 的 `INSERT ... SELECT` **被 `eslint.config.mjs:75-77` 明文禁止**於該範疇 | **AC-2 寫的「含 from / to / actor」拿不到 `from`。** ⇒ AC-2 必須修訂。⭐ 補救方向已驗：`resolveResource` = `where.id ?? data.id ?? data.refCode`（`:252-257`）⇒ **update 時 `resource_id` 有值** ⇒ `from` 可由「同一 `resource_id` 的**前一筆**稽核列的 `after.status`」**回推**。⇒ 修訂後的 AC-2 = 「單列記 `to` + actor；`from` 由鏈回推且**該回推有整合測試**」 |
| **D3** ✅ | **`/policies` 的 status 真的來自 API** —— `lib/api/policies.ts:43-44` 檔頭明寫「`status` DOES arrive, but in the API's own vocabulary: six lifecycle states from 02a:300-312, where the fixture had three. The mapping is in the page.」 | **AC-6 drive-through 有真實觀察面**，維持不變 |
| **D4** ✅ | **enum 與狀態圖逐值對應** —— `PolicyStatus` 6 值 ↔ `02a:360-371` 6 節點一一對應；**7 條實邊**（含 `in_review → draft` 回邊）；`retired` 為終態；`under_revision` 只有一條出邊回 `in_review` | 轉換表內容已確定，§3.1 不變 |

> ⛔ **D4 自我更正（2026-08-21）**：原寫「**8** 條實邊」是錯的，實際是 **7**。
> `02a:360-372` 共 9 行箭頭，其中 `[*] --> Draft`（`:362`）與 `Retired --> [*]`（`:370`）是
> **pseudostate**（初始／終結標記），不是狀態間轉換。7 條 = `Draft→InReview` · `InReview→Approved` ·
> `InReview→Draft` · `Approved→Published` · `Published→UnderRevision` · `UnderRevision→InReview` ·
> `Published→Retired`。⚠️ 這是本專案第 7 個手寫計數器出錯（`AD-12` / `AD-18` / `AD-23` / ROADMAP P0 /
> §Open 總數 / `AD-61` / 本條）—— 而它差點被寫進轉換表的測試裡當成「預期 8 條」的斷言。
| **D5** ⚠️ | **policy repository 住在 `core-model/` 不在 `modules/`** —— `core-model/policy.repository.ts`；且 `modules/policy/` **完全沒有 `status` 的引用** | plan §4 item 6 的路徑要更正。⚠️ 這正是 `task-workflow.md` §Risk Class D（plan 引用檔案路徑靠猜）的形狀 |

### Prong 2.5 — child component tree：**N/A**（本片零前端變更）

### Prong 3 — schema verify

`PolicyStatus` 6 值 · `Policy.status @default(draft)`（`schema.prisma:336`）·
**確認本片不需要 migration**（狀態值已正確，§4 的 UNTOUCHED 成立）。

### D-baselines

於 `feature/W25-oq7-workflow-spike` 分支頭實測（**全部寫檔再 Read，不用 `| tail`**）：

| Gate | 值 | 備註 |
|---|---|---|
| `npm run lint -w apps/api -w apps/web` | **EXIT 0** | |
| `npm run type-check -w apps/api -w apps/web` | **EXIT 0** | |
| `npm run format:check -w apps/api -w apps/web` | **EXIT 0** | clean |
| `python scripts/lint/run_all.py` | **11 / 11** | CH-046 後為 11 |
| lint detector tests | **122**（6 檔 · 0 fail）| 逐檔跑，同 CI 的迴圈；`unittest discover` 不可用（`scripts/` 刻意非 package，`ci.yml:102-104`）|
| api unit | **484 / 40 suites** | |
| api integration | **269 / 21 suites** | |
| web | **104 / 11 files** | |
| `npm run build` | **EXIT 0** | api（`nest build`）+ web（Next 16.3.0，25 靜態頁）|

⭐ 三個測試數與 **W24 收尾值完全相同** —— 與 `git log 662d658..HEAD -- apps/` 為空一致
（自 W24 以來的三片 CH-045 / 審計 #10 / CH-046 **零產品碼變更**）。
⇒ 本片任何測試數變動都可歸因於本片，baseline 乾淨。

### Go / no-go：**20-50% ⇒ 修訂 §Acceptance + §Workload 並與使用者再確認**

**判準**：D1 與 D2 各自改變一條驗收條件與一個檔案的性質，但**本片的核心工作不變**
（轉換表 + 守衛 + 兩個候選 + 五維度量測 + ADR + design note）。

- 不變：US-1 · US-3 · US-4 · US-5 · US-6 · §3.3 五條邊界判準 · §3.4 五個維度 · Day 2-4 全部
- 改變：**AC-2**（`from` 改為由鏈回推）· **§4 item 6**（EDIT 既有守衛點 → NEW 轉換端點）· **R3 的射程**
- 新增：轉換端點本身（新表面）

⇒ 不是 ≤20%（動到驗收），也不是 >50%（沒有推翻 phase 的目的）。**依規則回到使用者確認。**

#### ✅ 裁決（2026-08-21，使用者選 **(A)**）

否決的選項是 **(B) 先停下來處理稽核層** —— 理由：D2 那個限制**已被前人量過並明文寫成 ADR-0003 的輸入**
（`audit.recorder.ts:23`），本片正好給它第一個真實使用場景；帶實據去修 ADR-0003 比憑推論改稽核層穩。

plan 已修訂三處：

| 處 | 舊 | 新 |
|---|---|---|
| **AC-2** | 「含 from / to / actor 逐欄斷言」 | 單列斷言 `resource_id` / `after.status` / actor；**`from` 由同一 `resource_id` 前一筆稽核列回推，且該回推要有整合測試**；明寫反面要求（不可只斷言 `to` 卻讀成兩者都驗）|
| **§4 item 6** | `modules/policy/*` EDIT（接守衛，檔案待定）| 拆成 **6 / 6b / 6c**：`policy.controller.ts` **建出第一條轉換端點**（D1）· `core-model/policy.repository.ts`（D5 路徑更正）· `policy.int.spec.ts` 掛回推測試 |
| **§7** | bottom-up 18.5 → committed 12.0 | bottom-up **20.5** → committed **13.3**（+1.5 新表面 · +0.5 回推測試）；預測區間隨之 2.9–5.3 hr |

**Day-0 追加實測（在修訂 §4 之前查，避免又一次 Risk Class D）**：

- `eslint.config.mjs:80-81` —— `MATRIX.modules` 已含 `workflow`、`MATRIX.workflow` 已含 `core-model` / `audit-trail`
  ⇒ 本片新增的跨範疇 import 邊**全部合法**，boundaries 政策**不需改**。已加為 §4 的 UNTOUCHED 行。
  （若沒查：Day 1 會在第一次 `npm run lint` 撞牆，並且很可能被誤讀成「範疇劃錯」而去改 config。）
- `policy.controller.ts` / `core-model/policy.repository.ts` / `modules/policy/policy.int.spec.ts` **三個路徑逐一 Glob 確認存在**。

### ⛔ Prong 2 續 — 裁決後補做 `D-audit-on-transition` 的實測，又挖出三條

**為什麼是「補做」**：該項的 DoD 白紙黑字寫「**實測一次，不採信『enum 在 AUDITED_MODELS 裡』的推論**」，
而我 Day-0 交出的 D2 是**讀 code** 得到的。勾之前重讀 DoD 才發現自己沒達到它。⇒ 這三條是那次補做的產出。

| ID | Finding（今天 HEAD 實測） | Implication |
|---|---|---|
| **D6** ⛔⭐⭐ | **整棵產品樹零個 domain `update`** —— `Grep '\.(update\|updateMany\|upsert\|delete\|deleteMany)\('` 於 `apps/api/src` 排除 `*.spec.ts`，**只有 4 個命中且全非 domain 寫入**：`chain.ts:213,242-244`（Node crypto `.update()`）· `ref-code.ts:97`（內部計數器 upsert）。與 `audit-coverage.int.spec.ts:26-32` 自述的 W13 Day-0 發現一致，**且在一週後仍成立** | ⭐ **W25 的轉換端點會是整個 repo 的第一條 `update`。** ⇒ 既有稽核覆蓋測試（15 個模型各一條）**每一條都是 `create`**；update 是「by construction 被 `WRITE_OPERATIONS` 涵蓋」的**宣稱**，沒有任何東西走過。⇒ US-2 的價值遠高於 plan 預期：它是那條路徑的**第一次實走**，不是複驗 |
| **D7** ⛔ | **`actorId` 寫死 `null`** —— `audit.recorder.ts:146`，且 `:176-177` 明寫理由（「placeholder 等於用謊言回答『誰做的』」）。兩個既有整合測試把它**釘住**（`audit-coverage.int.spec.ts:203` · `audit.int.spec.ts:124`）。M4 identity 尚未存在（`scope_ts_count('identity') == 0`）| **AC-2 剛修訂的版本仍要求 `actor`，而今天拿不到。** 可得的是 `actorScope`（`:147` = `context.entityIds.join(',')`，「呼叫者當時被授權觸及的範圍」），那是**範圍不是身分**。⇒ AC-2 需要**第三次**修訂 —— 見下方 §待裁決 |
| **D8** ⛔⭐ | **create 與 update 的 `resourceId` 不是同一種識別子** —— `resolveResource` = `where.id ?? data.id ?? data.refCode`（`:252-257`，檔頭 `:246-250` 自述「create 時為 refCode，因為 Prisma 在此之後才配 id」）⇒ **create 列記 `refCode`，update 列記 UUID `id`** | ⛔ **`WHERE resource_id = X` 取不到一份 policy 的完整歷史** —— 它被切成兩個 key。⇒ AC-2 的「`from` 由前一筆回推」**在 create→第一次轉換的交界斷掉**。可行的替代：只在**轉換列之間**回推，初始狀態取 schema 預設 `draft`（`schema.prisma:336`）而非讀 create 列。⚠️ 這條本身是 guardrail 5（「稽核人員必須能信任它」）的實質缺口，**是 ADR-0003 的第四個輸入**，不在本片修 |

⭐ **D6+D8 合起來解釋了為什麼這三條到今天才被看見**：稽核的 update 路徑從來沒有人走過，
所以「一份紀錄的歷史怎麼查」這個問題**還沒有被問過**。本片是第一個問它的人。

---

## 2026-08-21 — Day 1：候選 A（自建 data-driven 轉換表）

### 1.1 轉換表與守衛 — 已建

| 檔案 | 內容 |
|---|---|
| `apps/api/src/workflow/transitions.ts` | 表 + 三個純函式。**窮舉 `Record<PolicyStatus, readonly PolicyStatus[]>`** —— schema 加第七個狀態時**編譯失敗**，而不是靜默多出一個沒有宣告出邊的狀態 |
| `apps/api/src/workflow/transition.guard.ts` | `assertTransition()` + `IllegalTransitionError`（帶 `from` / `to` / **`allowed` 集合**）|
| `apps/api/src/workflow/transition.guard.spec.ts` | 17 tests，三組（合法邊 / 具名非法邊 / 結構不變式）|

**兩個設計決定，理由記在檔頭**：

1. **檔名 `transition.guard.ts` 保留**（plan §4 原名）。「guard」取 **statechart 語義**（轉換上的布林條件），
   不是 NestJS 的 `CanActivate`。實測全 repo **零個 `.guard.ts`、零個 `CanActivate`** ⇒ 今天不撞。
   但兩個語義在此生態共用副檔名，所以 header 明寫這個歧義（AP-7：命名與行為必須一致）。
2. **不寫任何邊數**在 code 裡 —— 計數一律從表導出（`POLICY_TRANSITION_EDGES`）。
   直接理由是本片 Day 0 自己把 7 數成 8（見上方 D4 自我更正）。

**首跑**：`npm run test -w apps/api -- transition.guard` ⇒ **17 passed / EXIT 0**。

### 1.2 ⭐ 中性化（N-test）—— **預測寫在執行之前**

> 17 綠只證明「零件對」。下面三個中性化證明的是「**這些測試真的有偵測力，且偵測到的是對的那幾條**」。

| N | 中性化 | 預測 RED | 預測 GREEN | 預測總數 |
|---|---|---|---|---|
| **N1** | `assertTransition` 拿掉 `throw`（變 no-op）| **5** —— 4 條具名非法邊 + 「錯誤要列出合法替代」 | 12（7 合法邊 + 5 結構）| 17 |
| **N2** | 表中刪掉 `published → under_revision` | **1** —— 只有「每個狀態都從 draft 可達」 | 15 | **16**（⚠️ 見下）|
| **N3** | 表中加入偽邊 `retired → ['published']` | **2** —— 「恰好一個終態」+「拒絕 retired → published」 | 16 | 18 |

⭐ **N2 的預測本身是一個關於測試設計的主張**：第 1 組用 `it.each(POLICY_TRANSITION_EDGES)`，
**邊是從表導出的** ⇒ 刪掉一條邊時那條測試**不會轉紅，它會直接消失**（總數 17→16）。
⇒ 第 1 組對「漏抄一條邊」**完全沒有偵測力**，能抓到的只有第 3 組的可達性。
**若 N2 實測出現 2 條 RED 或總數仍為 17，就是我對自己測試的理解錯了，要回頭改測試而不是改預測。**

#### 實測結果 —— **三次中性化，三次逐格命中**

| N | 預測 | 實測 | 轉紅的是誰 | ✓ |
|---|---|---|---|---|
| **N1** | 5 RED / 12 GREEN / 17 | **5 failed / 12 passed / 17** | 4 條具名非法邊 + 「錯誤要列出合法替代」 | ✅ |
| **N2** | 1 RED / 15 GREEN / **16** | **1 failed / 15 passed / 16** | `reaches every state from the initial one`（唯一一條）| ✅ |
| **N3** | 2 RED / 16 GREEN / 18 | **2 failed / 16 passed / 18** | `refuses retired -> published` + `has exactly one terminal state` | ✅ |

**還原後**：17 passed · lint **0** · type-check **0**（三個中性化全部以 Edit 施加並逐一還原，
非 `sed` —— W24 的教訓：sed mutation 沒落地而測試回 OK，差點被讀成「測試沒有偵測力」）。

⭐ **N2 證實了那個關於測試設計的主張**：總數 17→**16**，導出的 `it.each` 案例**消失而非轉紅**。
⇒ 「合法邊全過」這一組對**漏抄一條邊**零偵測力。唯一擋住它的是第 3 組的可達性斷言。
**這條結論可以直接用在 Day 2 的候選 B**：若函式庫版本的測試也是「枚舉 machine 定義的邊」，
它會有同一個盲點 —— 那是五維度裡「錯誤訊息品質 / 與稽核鉤子接合」之外的第六個觀察點。

### 1.4 ⭐ CH-046 第一次真實生效 —— 它抓到的比預期多

昨天做的 detector，今天第一次遇到「錨點真的破了」。**一次報 4 條**：

```
- ruler `scopes-with-code`: document declares '6 / 8', repo derives '7 / 8'
- ruler `loc-api-prod`:     document declares '7765',  repo derives '7954'
- ruler `loc-api-test`:     document declares '14663', repo derives '14787'
- M5 anchor broke: scope_ts_count('workflow') is 2, anchor says 0.
  The verdict '🔴 未開始' was based on it -- re-judge M5 and update both cells.
```

⭐ **值得記的不是「它動了」，是它**逼出了一次判定而不是一次數字更新**。**
訊息本身寫著「the verdict was based on it — re-judge」，所以我沒有把 `== 0` 改成 `== 2` 就走人：

| | 舊 | 新 |
|---|---|---|
| M5 判定 | 🔴 未開始 | **🟡 部分**（轉換表 + 守衛在；端點未建、OQ-7 未拍板）|
| M5 錨點 | `scope_ts_count('workflow') == 0` | `scope_ts_count('workflow') == 2` |
| §3 判讀 | 「身分層與流程層**一行未寫**（M4 / M5）」 | 「身分層仍一行未寫（M4），流程層今天落下第一塊（M5）」 |

**外加一條 §3 的新註記**（因為 🟡 最容易被讀成「快好了」）：落地的是**純狀態機**，
而 `07:36` 的 M5 定義是「drives the policy approval flow」，還缺端點 / 簽核 / SLA / 升級。
⛔ 且今天量到 **M4 直接卡住 M5 的驗收**：`actorId` 寫死 null ⇒
**「誰核准了這份政策」記不下來**，那正是 approval flow 的核心欄位。

⚠️ **CH-046 的持續成本也第一次被付了**：`loc-*` 兩把尺純粹因為我今天寫了 code 就漂移。
那是設計時就知道要付的（spec §Impact「這是刻意付的成本」），但**第一次付的時候才知道它每天都會來**。
若 Day 4 發現它每個 commit 都紅，那就是一條要記的 AD（尺的粒度太細），不是把它調鬆。

**`run_all` 由 FAIL 回到 11/11。**

### 1.1（續）+ 1.3 — 轉換端點與稽核／範疇測試

#### 動手前補驗的五件事（每一件都會改變寫法，沒驗就會寫錯）

| # | 問題 | 實測 | 若沒驗會怎樣 |
|---|---|---|---|
| 1 | `modules → workflow` 合法嗎？ | ✅ `eslint.config.mjs:81` | 第一次 lint 撞牆，可能誤改 boundaries 政策 |
| 2 | `policies` 表有 UPDATE 的 **grant 與 RLS policy** 嗎？ | ✅ `GRANT SELECT, INSERT, UPDATE`（`20260809075152:90`）+ `FOR ALL` USING/WITH CHECK（`20260809171812:58-61`）| 端點寫完才在 runtime 發現資料庫拒絕 |
| 3 | Prisma 的 `update.where` 收非唯一欄位嗎？ | ✅ `PolicyWhereUniqueInput` 含 `status` filter（`index.d.ts:54248-54257`）| 只能 read-then-write，帶著 TOCTOU 窗 |
| 4 | `runScoped` 的交易粒度？ | ⚠️ **一次呼叫 = 一個 `$transaction`**（`:97-113`）| read-then-write 是**兩個**交易，中間狀態可被改掉 |
| 5 | `ScopedPolicyClient` 有 `update` 嗎？ | ❌ **全檔零個 `update` delegate** | 以為加一行就好；實際是**這個檔案的第一個** |

⭐ **第 4 + 3 合起來決定了整個設計**：守衛在應用層、寫入必須原子 ⇒
**compare-and-set**：把觀察到的狀態放進 `where`，讓 PostgreSQL 在寫入的那一刻裁決。

```ts
client.policy.update({ where: { id, status: expected, retiredAt: null }, data: { status: next } })
```

⛔ **為什麼是 `update` 不是 `updateMany`**（差點寫錯的地方）：`updateMany` 匹配不到時回
`{count: 0}` 而交易**照樣 COMMIT** ⇒ 會留下一筆「宣稱轉換發生了」的稽核列 ——
因為 `runScoped` 在寫入**之前**就把稽核 entry 放進同一個交易，而且讀不到寫入結果。
`update` 會拋，交易回滾，稽核列跟著消失（`audit.int.spec.ts:143` 已經釘住這個性質）。

#### 範疇歸屬（約束 1）

| 檔案 | 範疇 | 動作 |
|---|---|---|
| `workflow/transitions.ts` · `transition.guard.ts` · 兩個 spec | `workflow` | NEW |
| `core-model/policy.repository.ts` | `core-model` | EDIT — `byId()` + `transitionStatus()` |
| `core-model/scoped-client.types.ts` | `core-model` | EDIT — **全檔第一個 `update` delegate** |
| `core-model/scope-refusal.ts` | `core-model` | EDIT — `isRecordNotFound()`（P2025，全檔第一個非 SQLSTATE 碼）|
| `modules/policy/policy.controller.ts` | `modules` | EDIT — `PATCH /policies/:id/status` |

⛔ **守衛套用在 controller 不在 repository**，而且不是偷懶：`MATRIX['core-model'] = ['api','core-model']`
⇒ **core-model 不能 import workflow**。repository 若知道生命週期，狀態機就有了第二個定義處。

#### ⛔ 又一條：D9 —— 滾升 scope 根本不能做轉換

`resolveEntity`（`audit.recorder.ts:229-244`）：payload 沒有 `orgEntityId` 且 scope 有多個實體時
**拒絕寫入**（"the audit row would guess"）。轉換的 payload 只有 `{status}` ⇒ **必然觸發**。

⭐ **這條分支在今天之前不可能被走到** —— 每個 `create` 的 payload 都帶 `orgEntityId`。
**第一個 update 才讓它可達。** fail-closed 是對的（憲章說滾升是跨實體**讀取**），
但**沒有人刻意選過這個行為**，所以釘成測試而不是寫進文件。

#### 測試結果

| 套件 | 結果 |
|---|---|
| `transition.guard.spec.ts` | 17 passed |
| `policy.repository.spec.ts` | **15 passed**（+6：compare-and-set 的 `where` 內容 · P2025→null · 範疇轉譯 · 故障照拋 · `byId` ×2）|
| `workflow.int.spec.ts` | **11 passed**（AC-2 逐欄 + `from` 回推 + 三條釘住的限制 + AC-1 + 四個範疇測試）|

⚠️ **整合測試第一次跑是紅的（2 條）**，而錯的是**我的預期不是 code**：
`operation` 是 `Policy.update` 不是 `policy.update` —— recorder 用的是 Prisma **model 名**
（PascalCase，`audit.recorder.ts:148`），不是 delegate 名。修測試。

⭐ **`policy.repository.spec.ts` 那條「觀察到的狀態必須在 `where` 裡」是整個設計的承載斷言**：
若有人把 `expected` 從 `where` 移到上面的 `if`，行為看起來一樣、測試名稱也還讀得通，
但操作就不再原子了。所以它斷言的是**位置**，不只是結果。

#### ⛔ 我的新套件單獨綠，合起來把別人弄紅了 —— 而這個坑是被明文記載過的

`npm run test:int -w apps/api -- workflow` ⇒ **11/11 綠**。
`npm run test:int -w apps/api`（完整）⇒ **3 failed / 277 passed / 280**，
紅的**沒有一條是我的**：

| 紅在哪 | 斷言 | 為什麼紅 |
|---|---|---|
| `modules/policy/policy.int.spec.ts:91` | SG1 的 policy 清單長度 == 1 | 收到 **11** |
| `modules/policy/policy.int.spec.ts:141` | 滾升子樹 == `[SG1]` | 收到 11 個 SG1 |
| `entity-scope/entity-scope.int.spec.ts:151` | 存活標題 == `['SG1 access control policy']` | 多出我的 10 筆 |

**根因**：我的 `createPolicy()` 建了 10 筆 SG1 policy 而**沒有清掉**，
那三條斷言的是**整份清單**，不是自己那一筆。

⛔ **而這件事寫在 `jest.int.config.js:51-55`，逐字**：

> W03 showed this is necessary but not sufficient. `policy.int.spec.ts` is the first suite that
> WRITES, and its first run failed a test in `entity-scope.int.spec.ts` by leaving a row behind.
> Serial execution decides the order; it does not undo the write.
> **A writing suite must retire its own rows in afterAll.**

⇒ **W03 踩過、寫進 config、我在 W25 一模一樣再踩一次。** `maxWorkers: 1` 是序列不是隔離。
修法就是它指定的那個：`teardown` 陣列 + `afterAll` 逐筆 retire（`audit-coverage.int.spec.ts` 的既有形狀）。

⭐ **這條的教訓不是「要記得清理」** —— 是**「單獨跑綠」不是套件綠的證據**。
我在報告裡寫過「`workflow.int.spec.ts` 11/11」，那句話**當時是真的**，
而它同時**掩蓋了三條紅**。這與 `verification-discipline.md` §證據層變體同形：
真的工具輸出 + 錯的推論射程。**跑一個檔的結果不能拿來替整套背書。**

#### 順手發現（不當場修，Day 4 進 BACKLOG）

`audit-coverage.int.spec.ts:20-24` 的註解寫「jest runs suites in parallel workers against one
database」，而 `jest.int.config.js:56` 是 **`maxWorkers: 1`**（序列）。
兩者矛盾 —— 那條註解是 orphan claim（AP-7）。它推薦的做法（by-ref-code 查而非 count delta）
仍然正確，但**理由寫錯了**。

#### Day 1 收尾 gate（全部實測）

| Gate | Baseline（W24 收尾）| Day 1 | Δ |
|---|---|---|---|
| lint（api + web）| 0 | **0** | — |
| type-check（api + web）| 0 | **0** | — |
| format:check | clean | **clean** | —（過程中紅過一次，已修）|
| api unit | 484 / 40 | **507 / 41** | **+23 / +1** |
| api int | 269 / 21 | **280 / 22** | **+11 / +1** |
| web test | 104 / 11 | **104 / 11** | — （前端零變更，如 plan §4）|
| build（api + web）| EXIT 0 | **EXIT 0** | — |
| `run_all` | 11/11 | **11/11** | — |

新增測試 **34 條**（unit 23 + int 11），全部對應 US-1 / US-2 與約束 8 的四個範疇測試。

#### Day 1 的四條發現，依「本片能不能修」分類

| ID | 發現 | 本片處置 |
|---|---|---|
| **D6** | 整棵樹零個 domain update ⇒ 稽核的 update 路徑從未被走過 | ✅ **本片走了它**，US-2 因此是首次實走而非複驗 |
| **D7** | `actorId` 寫死 null（M4 未建）| ✅ 照既有先例**明確斷言 null**，不假裝有 actor |
| **D8** | create 列與 update 列 `resourceId` 不同 ⇒ 單一 key 取不到完整歷史 | ⛔ 不修（`audit-trail/**` 凍結）；**釘成測試** + ADR-0003 輸入 |
| **D9** ⭐ | 滾升 scope **不能轉換**（`resolveEntity` 拒絕猜實體）| ⛔ 不修（fail-closed 是對的）；**釘成測試** —— 但沒有人刻意選過這個行為 |

⚠️ **D8 與 D9 是 Day 3 ADR-0002 的直接輸入**：兩者都不是狀態機的問題，
而是「精簡狀態機**接上這個平台的稽核與範疇機制**時」冒出來的。
⇒ §3.3 的第五條判準（「與稽核鉤子的接合成本」）**已經有真實數據了**，不必等 Day 2。

---

## 2026-08-21 — Day 2：候選 B（嵌入 statechart 函式庫）

### 2.1 選哪一個函式庫 —— 四個候選的實測資料

`npm view` 實查（非憑記憶），四個都是零 runtime 相依：

| 套件 | 版本 | 授權 | 選它 / 不選它 |
|---|---|---|---|
| **xstate** | **5.32.5** | MIT | ✅ **選它** —— 它**測得到邊界** |
| robot3 | 1.2.0 | BSD-2-Clause | ❌ ~1KB FSM ⇒ 等於候選 A 換語法，什麼都測不到 |
| @xstate/fsm | 2.1.0 | MIT | ❌ v4 時代產物，已被 v5 取代。**拿被取代的套件當 ADR 輸入是壞資料** |
| javascript-state-machine | 3.1.0 | MIT | ❌ 已非活躍選項 |

⭐ **選 XState 的理由是可證偽性**：§3.3 那五條判準說我們**不需要**階層 / parallel /
執行期動態子流程，而 XState 正好全都有。**候選 B 必須是「某條判準破掉時你真的會去拿的那個東西」**，
否則比較出來的只是語法。

### 2.2 相依成本（plan §3.4 維度 5）—— 實測

| 指標 | 值 | 怎麼量的 |
|---|---|---|
| 新增套件數 | **+1** | `npm install` 回報 `added 1 package` ⇒ **零遞移相依** |
| 新增 advisory | **0** | 那 3 條 high 全是既有的 `prisma → @prisma/config → deepmerge-ts`（devDependency）|
| SCA gate | **綠** | `check_sca_allowlist.py` ⇒ `OK (no unaccepted vulnerabilities, 1 accepted and in date)` |
| 授權 | MIT | 與既有相依相容 |

⚠️ **順手發現（不當場修，Day 4 進 BACKLOG）**：那 3 條既有 high advisory 只被 **1 條** allowlist
條目接受且在期內 —— 所以 gate 是綠的。但它們是 stack-exhaustion（DoS）且在**建置期** CLI，
不在出貨 runtime。**記錄它是為了不讓「SCA 綠」被讀成「零已知漏洞」。**

### 2.3 ⚠️ 第一個發現：模型不對盤，而且不是 XState 的錯

**statechart 是事件驅動**（送 `APPROVE`，機器決定落在哪）；
**本平台的領域 API 是目標驅動**（`PATCH .../status` 帶著要去的狀態，因為表單就是那樣送的）。

橋接需要「每條邊一個事件名」。兩條路都量過：

| 做法 | 代價 |
|---|---|
| 事件名由目標機械導出（`TO_${TARGET}`）| ✅ 採用 —— 不需要第二張表 |
| 事件名用業務動詞（SUBMIT / APPROVE / REQUEST_CHANGES）| ❌ 讀起來好，但需要 **(from, to) → event 對照表** —— **那張表就是候選 A 本身** |

⭐ 也就是說：**要讓 XState 服務一個目標驅動的 API，你得先有候選 A 那張表**，或是放棄語義化的事件名。

### 2.4 等價性先證明，才有資格比較

`candidate-b-xstate.spec.ts` 第一條測試把 **6 × 6 = 36 組有序配對**全部拿去問兩個候選，
斷言零分歧。**5 tests 全過。**

⇒ 這條把「我是不是抄錯了其中一份」從後面每一個數字裡移除掉了。
四行測試換 36 個斷言，是本片 CP 值最高的一條。

### 2.5 接合成本 —— 用**替換實驗**量，不用嘴巴講

`assertTransitionB` 與候選 A **同簽名、同錯誤類別**（刻意複用 `IllegalTransitionError`，
好讓量到的是「函式庫給不給你 from / to / alternatives」而不是「誰的 Error 子類別寫得好」）。

⇒ 把 `policy.controller.ts` 的 import 換到候選 B，跑**完整** unit + int 套件。

⛔ **預測（寫在執行之前）**：

- **全綠，零檔案改動**（除了那一行 import）。理由：簽名與錯誤內容相同。
- 唯一可能的差異是 `allowed` 的**順序** —— 候選 A 保留 `02a` 的邊序（`['approved','draft']`），
  候選 B 是 `POLICY_STATUSES.filter` 所以走 enum 序（`['draft','approved']`）。
  但 `workflow.int.spec.ts` 斷言的那條是 `draft → approved`，`allowed` 只有**一個**元素，
  順序無關 ⇒ **不會紅**。
- **若實測出現紅**，那就是「接合成本 > 0」的直接證據，比任何論述都硬。

### 2.6 ⭐ 維度 1（行數）—— 第一眼的數字是錯的，而錯的方式很典型

plan §3.4 指定用 `wc -l`。照做，然後發現**它量到的是我的註解密度不是實作**：

| 量法 | 候選 A | 候選 B | 表面結論 |
|---|---|---|---|
| **`wc -l`（plan 指定）** | **191** | **105** | 「B 少 45%」 |
| 非註解非空行 | **46** | **32** | 「B 少 30%」 |
| **非註解非空行，扣掉 B 向 A 借的** | **46** | **≈ 47** | ⭐ **打平** |

**B 借了什麼**（實測，不是估）：`IllegalTransitionError` **14 個 code 行** +
`POLICY_STATUSES` 1 行。若候選 A 被刪，B 得自己長出這 15 行 ⇒ **32 + 15 ≈ 47**。

⛔ **這正是 `AD-ProxyMetricAsAnswer-1` 的形狀，而且是我自己差點踩的**：
`wc -l` 是一個便宜的代理指標，用來回答一個需要讀內容才能回答的問題。
若我照 plan 字面報「191 vs 105」，ADR-0002 會拿到一個**方向正確但幅度誇大 45 倍以上**的輸入
（真實差距是 1 行，不是 86 行）。

⇒ **plan §3.4 維度 1 的量法本身要修正**，這是本片對 plan 的一條回饋，Day 4 寫進 retro。

### 2.7 接合成本實測（unit 部分）

替換在身上時：type-check **0** · api unit **512 / 42 全過**（507 + 候選 B 的 5 條）。
**零檔案改動，除了那一行 import。** 整合套件結果見下。

### 2.8 維度 2（加一個狀態的成本）—— 兩個子實驗，預測寫在執行之前

plan §3.4 只說「實際加一個，量改動行數與檔案數」。照做，但**那只量到一半** ——
真正會決定維護成本的不是「要改幾行」，是「**改漏了誰會告訴你、什麼時候告訴你**」。
所以拆成兩個。

#### E1 — 加一個狀態要改幾行、幾個檔

假想狀態 `superseded`：`published → superseded`，終態。
**兩邊都還需要 Prisma enum + migration**，那是共用成本，所以只比**差額**。

⛔ **原預測**：**打平，各 2 行 / 1 檔**。
- A：`published` 陣列加 `'superseded'` + 新增 `superseded: []` 一鍵
- B：`published.on` 加 `TO_SUPERSEDED: 'superseded'` + 新增 `superseded: { type: 'final' }`

⛔ **執行前修正的預測**（E2 跑完後想到的，仍在 E1 執行之前寫下 —— 原預測保留不刪）：
**原預測漏了 enum 連結這件事**，而 E2 剛好證明兩邊在這點上不同。

| | 修正後預測 | 理由 |
|---|---|---|
| **A** | **type-check 失敗**，2 個錯 | `superseded` 既不是合法的 `Record` 鍵，`'superseded'` 也不是合法的 `PolicyStatus` 值 ⇒ **必須先改 schema** |
| **B** | ⚠️ **不確定** —— 可能通過，也可能因 `TO_SUPERSEDED` 不在 `PolicyEvent` 聯集裡而失敗 | 若失敗，擋下它的是**我推導的事件型別**，不是 XState 對 enum 的認識 |

⇒ 若修正後的預測成立，「加一個狀態的成本」的真正答案不是行數，是**順序被不被強制**：
A 強迫你先改 schema 再改 code；B 讓你先改 code，而資料庫存不下那個值。

#### 實測結果

| 實驗 | 候選 A | 候選 B |
|---|---|---|
| **E1 加 `superseded`** | ⛔ **type-check 失敗** —— `'superseded' is not assignable to type 'PolicyStatus'`（**1 個錯，我預測 2 個 —— 方向對數量錯**）| ⛔ **type-check 失敗** —— 但錯在 `'TO_SUPERSEDED' does not exist in ... PolicyEvent`。⚠️ **新增的 `superseded: { type: 'final' }` 狀態本身零個錯**；且 5 條測試**照樣全過** |
| **E2 刪 `retired`** | ⛔ **type-check 失敗** —— `Property 'retired' is missing ... in type 'Readonly<Record<PolicyStatus, …>>'` | ✅ **type-check 通過（TY=0）** —— 編譯器一句話都沒說。只有 runtime 的 3 條測試抓到 |
| 純行數（原 plan 的問法）| 2 行 / 1 檔 | 2 行 / 1 檔 —— **打平，而這是無關緊要的那一半** |

#### ⭐ 這兩個實驗真正說的事

**候選 A 由型別系統綁在 Prisma enum 上；候選 B 沒有。**

- E2 是乾淨的：A 擋下、B 完全沒感覺。
- E1 看起來兩邊都擋下了，**但擋下 B 的是 `PolicyEvent`，那是我自己推導的型別**
  （`TO_${Uppercase<PolicyStatus>}`），不是 XState 對 enum 的認識。

⛔ **而那個型別是一個設計選擇，不是必然**。若照 §2.3 說的用**業務動詞**命名事件
（`SUBMIT` / `APPROVE` / `REQUEST_CHANGES` —— 更好讀，也更像 statechart 的慣用法），
`PolicyEvent` 與 `PolicyStatus` 就**沒有任何關係**，E1 與 E2 **兩個方向都不會有人擋**。

⚠️ **而且 36 組等價測試也不會抓到 E1** —— `allowedTargetsB` 是拿 `POLICY_STATUSES` 過濾的，
多出來的狀態對它是隱形的。實測：E1-B 型別錯的同時，5 條測試**全綠**。

⇒ **維度 2 的答案不是「幾行」，是「schema 與實作有沒有被綁在一起，以及那個綁定是誰提供的」。**
候選 A：型別系統，免費，雙向。候選 B：我手寫的一個型別別名，單向，而且與慣用寫法衝突。

### 2.9 ⭐ 五維度量測表（US-4）—— 全部有數字

| # | 維度 | 候選 A（自建表）| 候選 B（XState 5.32.5）| 判定 |
|---|---|---|---|---|
| 1 | **定義行數** | 46 code 行 | **≈47** code 行（32 + 向 A 借的 15）| **打平**（`wc -l` 的 191 vs 105 是假象，見 §2.6）|
| 2 | **加一個狀態的成本** | 2 行 / 1 檔 · **型別系統雙向擋下** | 2 行 / 1 檔 · **只有單向擋下，且靠我手寫的型別** | ⭐ **A 明顯勝** |
| 3 | **錯誤訊息品質** | 直接讀表得到 alternatives | **O(states) 反推** —— statechart 依「什麼事件進來」組織，不依「能去哪」| **A 略勝**（訊息內容相同，取得成本不同）|
| 4 | **與稽核鉤子的接合** | — | **零額外接線**（替換實測：512 unit + 280 int 全綠，只改一行 import）| **打平** |
| 5 | **相依成本** | 0 套件 | +1 套件（0 遞移）· 0 advisory · MIT · SCA gate 綠 | **A 略勝**（B 的成本低到接近雜訊）|

⛔ **維度 4 量出訊號為零，而那本身是結論**（plan §3.4 明寫「若某個維度量不出訊號，那本身是結論」）：
**兩個候選在接合成本上無差異**，因為 Day 1 發現的 D8 / D9 **不是狀態機造成的** ——
它們來自 `runScoped` 的交易模型與 `resolveEntity` 的歸因規則，**換誰來都一樣**。

⇒ **決定 OQ-7 的不是「函式庫好不好」，是「這條流程需不需要函式庫提供的那些東西」。**
而那正是 §3.3 五條判準要回答的。

### 2.10 ⛔ 先講一個 plan 自己的矛盾（影響 US-3 的證據基礎）

plan **§3.3** 寫：「產出一組可證偽的判準，**逐條對照本片兩條 Wave 1 流程檢驗**」。
plan **§3.x** 寫：「❌ **issue→action flow** —— Wave 1 的第二條流程，**M5 本身做**」。

**兩句話互相矛盾。** §3.3 承諾拿兩條流程檢驗，§3.x 把第二條排除在本片之外。

⇒ **US-3 的證據基礎實際上是一條流程，不是兩條。** 我照 §3.x 執行（只做 policy），
但**不會把結論寫成好像驗過兩條**。每一條判準都會標明「在 policy 上確認 / 推翻 / 未驗」，
第二條流程一律標 **未驗**。
⚠️ 這條矛盾 Day 4 寫進 retro —— 它是 plan 起草時的缺陷，不是執行時的偏離。

### 2.11 ⭐⭐ 五條邊界判準逐條裁決（US-3 —— 本片的核心交付物）

**證據基礎：policy 生命週期一條流程。issue→action 一律標「未驗」（§2.10）。**

#### 判準 1 —— 轉換是**設定（資料）**，不是 code

**policy：✅ 確認。** 兩個候選都是物件字面值，沒有任何一條轉換寫成 `if`。

⚠️ **但這條判準以現在的寫法不可證偽，要重寫。** 實測到的「資料」是
**編譯期寫在 `.ts` 裡的字面值**，不是「執行期可改的設定」。沒有部署就改不了任何一條邊。
兩者都叫「資料」，但對判準 4 而言是天差地別。

⇒ **建議改寫為**：「轉換是**編譯期宣告的資料**，且**沒有任何執行期來源**（DB / 設定檔 / API）
可以改變它。」這樣它才有被推翻的方法。

#### 判準 2 —— **無** parallel / fork-join 執行

**policy：✅ 確認。** 7 條邊、任一時刻恰好一個作用中狀態
（`resolveState({ value })` 只收單一值即為證據；可達性測試涵蓋全部 6 個狀態）。

⚠️ **但它正被一個 plan 自己排除掉的需求威脅著。** `05:16` 把 **SLA timer 與升級**放在 Wave 1
射程內，而 plan §3.x 把它排除於本片之外。**一個與主流程並行倒數的 SLA，實質上就是一個平行區域。**

⇒ **這條判準的有效期只到 SLA 進來為止。** 那不是「未驗」，是「**已知會被重新檢驗**」。

#### 判準 3 —— **無**執行期動態產生子流程

**policy：✅ 確認**，但要誠實標明強度：`02a §4` 沒有用到，**不等於證明了不需要**。
這是「沒遇到」不是「排除了」。

#### 判準 4 —— 使用者**不能**在執行期自訂流程定義

**⛔ 未驗 —— 而且這是五條裡風險最高的一條。**

本片**完全沒有測到它**，因為它不是 code 問題，是**產品問題**：
13 個 OpCo 會不會需要各自不同的政策簽核流程？

已知的相鄰事實（不足以回答，但界定了問題）：
- 已確認參數 #2 是「canonical core + **governed local extensions**」
- 既有的受治理擴充機制（**ADR-0005**）涵蓋的是**欄位**，**不是流程**
- 已確認參數 #9 要求「數位化公司**既有**範本」，而既有範本是不是全 OpCo 一致 —— 未知

⇒ **這條要進 `decision-form.md` 問 stakeholder，不能由 spike 自己裁決。**
⚠️ 若答案是「需要」，**兩個候選都不夠** —— 那正是 OQ-7 真正的分水嶺，而它今天沒有答案。

#### 判準 5 —— guard 是**純 predicate**，不是可執行 script

**policy：✅ 確認**，且證據是機械的：候選 A 的守衛測試在 **unit** 設定檔裡
（`jest.config`，無資料庫），不在 `jest.int.config.js`。**它跑得起來就證明它沒有 I/O。**

⚠️ **但 Day 1 在這條上撞出一道裂縫，必須補進判準**：
**完整的強制力不在單一個 predicate 裡。** 合法性（哪些邊存在）是純函式沒錯，
但**並行控制**（這一列現在還在不在那個狀態）在**資料庫**裡 —— compare-and-set 的 `where` 子句。

⇒ **建議補充**：「guard 是純 predicate；**並行控制不是 guard 的一部分，且不可能是** ——
它必須與寫入同一個 statement。」
⛔ 這條若不補，下一個人會試著把「檢查目前狀態」寫進 predicate，
然後得到一個**看起來對、但有 TOCTOU 窗**的實作。而它會通過所有測試。

#### 裁決總表

| # | 判準 | policy | issue→action | 狀態 |
|---|---|---|---|---|
| 1 | 轉換是資料不是 code | ✅ 確認 | 未驗 | ⚠️ **需重寫才可證偽** |
| 2 | 無 parallel / fork-join | ✅ 確認 | 未驗 | ⚠️ **已知會被 SLA 重新檢驗** |
| 3 | 無執行期動態子流程 | ✅ 確認（弱：沒遇到）| 未驗 | 維持 |
| 4 | 使用者不能執行期自訂流程 | ⛔ **未驗** | 未驗 | ⛔ **進 decision-form，最高風險** |
| 5 | guard 是純 predicate | ✅ 確認（機械證據）| 未驗 | ⚠️ **需補充並行控制那一半** |

**五條裡有 3 條要改寫或補充，1 條完全未驗。** 這不是壞消息 ——
plan §3.3 要的就是「任何一條被本片的實作推翻，就是一個必須寫進 ADR 的發現」。
**今天產出了 4 個這樣的發現。**

### 2.12 Day 2 收尾 gate

| Gate | 結果 |
|---|---|
| lint（api + web）| **0** |
| type-check（api + web）| **0** |
| format:check（api + web）| **0** |
| api unit | **512 / 42**（Day 1 收尾 507/41 → +5/+1，正是候選 B 的 spec）|
| api int | **280 / 22**（不變 —— 候選 B 沒有新增整合測試）|
| web test | **104 / 11**（不變）|
| build（api + web）| **EXIT 0** |
| `run_all` | **11 / 11**（先紅後修，見下）|

### 2.13 ⭐ CH-046 今天第三次轉紅 —— 而這次的資料足以下結論了

今天 `progress-metrics` 紅了三次。**但三次的性質不一樣，而這個區別才是重點**：

| 尺 | 今天破幾次 | 每次都需要人做判斷嗎 | 判定 |
|---|---|---|---|
| **M5 錨點**（`scope_ts_count('workflow')`）| 3 | ✅ **是** —— 0→2（第一塊 code 落地）· 2→3（候選 B 落地）· 每次都逼出一次重判 | ✅ **照設計運作** |
| **`loc-api-prod` / `loc-api-test`** | 3 | ❌ **否** —— 三次都只是「我寫了 code」，沒有一次需要任何判斷 | ⚠️ **粒度太細，Day 4 記 AD** |

⭐ **M5 錨點的「吵」是它在做事**：它只在有人動 `workflow/` 時吵，而那**正是**該重新檢視 M5 的時刻。
今天第三次破時，它逼我發現原判定的敘述已經不準了 ——
寫的是「端點未建」，而端點 Day 1 就通了。**光改數字就會把那句錯的敘述留在文件裡。**

⇒ **不要因為「它一直紅」就把兩者一起調鬆。** 該調的是 `loc-*`
（它們回答的是「這個 repo 有多大」，那個問題不需要每個 commit 問一次），
**M5 錨點要原封不動**。

⚠️ 候選 B 若在 Day 4 被刪，`workflow` 會回到 2，錨點會**第四次**破 —— 那次同樣是對的，
因為刪掉候選 B 正是 OQ-7 拍板的時刻。

---

## 2026-08-21 — Day 3：Drive-through（AC-6，MANDATORY）

### 3.0 ⛔ 先界定這次 drive-through **能證明什麼、不能證明什麼**

plan §3.x 明寫「❌ **前端狀態轉換 UI** —— 本片的 drive-through 用既有讀路徑觀察，不建控件」。

⇒ **`/policies` 頁面上沒有任何控件會呼叫 `PATCH /policies/:id/status`。**

| | 這次能證明 | 這次**不能**證明 |
|---|---|---|
| 讀路徑 | ✅ 真 UI 顯示的 status 來自真 API 來自真 DB，且**轉換後會變** | — |
| 寫路徑 | ✅ 端點在真 stack 上真的會改資料、真的落稽核列 | ⛔ **人能不能操作** —— 沒有控件 |

⛔ **所以本片的收尾報告一律寫「轉換能力已 drive-through 驗證，但無 UI 入口」**，
**不可寫成「使用者可以推進政策狀態」**。那會是 `verification-discipline.md` §禁止項的
「用第 2 層的證據寫第 3 層的結論」。

⚠️ 這不是本片的缺陷（plan 排除了建控件），但**它是 M5 的一個 Potemkin 缺口**，
Day 4 必須以自己的名字進 BACKLOG，不能只躺在 plan §3.x 裡。

### 3.1 預期流程（**寫在觀察之前**）

| # | 動作 | 預期 |
|---|---|---|
| 1 | 開 `http://localhost:3200/policies` | 列表渲染，每列有 status 徽章；值來自 API（六個生命週期狀態的詞彙）|
| 2 | 記下某一列的 refCode 與 status | 種子資料的 policy 應為 `draft` |
| 3 | `PATCH /policies/{id}/status {"to":"in_review"}` | **200**，回傳的 `data.status` 為 `in_review`，且帶 `_devPrincipal` 標記 |
| 4 | **重新整理 `/policies`** | ⭐ **同一列的徽章變成 in_review** —— 這是本次 drive-through 的核心觀察 |
| 5 | `PATCH .../status {"to":"published"}`（從 `in_review`）| **422**，body 含 `from` / `to` / `allowed: ['approved','draft']` |
| 6 | 續推 `in_review → approved → published` | 各 200 |
| 7 | 重新整理 `/policies` | 徽章為 `published` |
| 8 | 真 DB 直查 `audit_log` | ⭐ **該 policy id 下恰好 3 筆 `Policy.update`**，`after.status` 依序 in_review / approved / published，`before` 全為 NULL，`actor_id` 全為 NULL |
| 9 | `PATCH .../status {"to":"draft"}`（從 `published`）| **422**，`allowed: ['under_revision','retired']` |

⛔ **第 8 步刻意用真 DB 直查而不是看測試** —— checklist 1.3 的 DoD 就是這樣要求的：
測試用的是 `isms_test`，dev 跑的是另一個資料庫，**整合測試綠不代表 dev stack 上這條路徑通**。

### 3.2 Clean restart（規則 `local-runtime-ops.md`）

- **Preflight**：3200 / 3210 **都是空的** ⇒ **不需要殺任何東西**。
  在跑的 node 進程是 Playwright MCP 與另一個 `codex.js -s read-only` ——
  **不是我的，留著**（規則 §4：撞到陌生進程不要當殘留清掉）。
- DB `isms-postgres-dev` **Up 21 hours (healthy)**。
- 起 api（pid 42408，`http://127.0.0.1:3210`）+ web（pid 10224，`http://localhost:3200`）。
- ⭐ **wiring 實據**（Risk Class C 要求的那一行）：
  `LOG [RouterExplorer] Mapped {/policies/:id/status, PATCH} route`
  —— 從**本次啟動的 log** 讀到，不是假設。
- `WARN [DevPrincipal] DEV PRINCIPAL ACTIVE — ... (SG1), not by any credential` 正常發出。

### 3.3 Observed vs Intended

| # | 預期 | 實際 | ✓ |
|---|---|---|---|
| 1 | `/policies` 列表渲染，status 來自 API | 8 筆，含「PART REAL」橫幅與逐欄「No source in the API yet」 | ✅ |
| 2 | 挑一筆 `draft` | `POL-SG1-000002 "Second"` = Draft（挑非 DEMO SEED 的，避免動種子資料）| ✅ |
| 3 | `→ in_review` 得 200 | **HTTP 200**，`data.status = in_review`，帶 `_devPrincipal` | ✅ |
| 4 | 重新整理後徽章改變 | **`POL-SG1-000002` 由 Draft → Published**（見 artifacts 截圖）| ✅ |
| 5 | `in_review → published` 得 422 + `allowed` | **HTTP 422** · `allowed: ["approved","draft"]` · message 逐字列出 | ✅ |
| 6 | 續推 `→ approved → published` | 各 **200** | ✅ |
| 7 | 徽章為 published | ✅ | ✅ |
| 8 | 真 DB 恰好 3 筆 `Policy.update` | **恰好 3 筆**，`after.status` 依序 in_review / approved / published | ✅ |
| 9 | `published → draft` 得 422 | **HTTP 422** · `allowed: ["under_revision","retired"]` | ✅ |

**九步全中。** 真 DB 的稽核列另外確認了三件事：

- **兩次 422 一筆稽核都沒留** ⇒ 守衛在寫入之前擋下，「什麼都沒發生」是真的什麼都沒發生
- `before` 與 `actor_id` **皆 NULL** ⇒ D2 / D7 在 dev stack 上同樣成立（不只在測試裡）
- `row_hash` **32 bytes** ⇒ 鏈的 trigger 有跑（schema 註解：0 長度代表 trigger 沒跑）

⭐ **額外驗了 guardrail 5 的核心主張**：逐列比對 `prev_hash` 與前一列的 `row_hash`，
**4 筆全部 `chained = t`**，第 1 筆自 genesis 起。
**這是本 repo 第一次在 UPDATE 路徑上驗證防篡改鏈，它守住了。**

### 3.4 ⭐ 一個不在預期清單裡、靠「製造變化」才問得出來的檢查

列表標題有一行 **「8 policies · 1 under review · server-set scope」**。
**那個「1」是算出來的，還是寫死的？** 讀 code 可以推測，但那是推測。

做法：把第二筆 draft（`POL-SG1-000001`）推到 `in_review`，重新整理。
**結果：變成「8 policies · 2 under review」。** ⇒ **導出的，不是 fixture。**

⇒ 這是 drive-through 才問得出來的那類問題（AP-3：「標籤是變數，但那個變數永遠是同一個常數」）。

### 3.5 逐控件走查 —— 我看錯了一顆，直接記下來

截圖裡 `New policy` 看起來是**滿版藍的主要按鈕**，我一度判為「看起來可點但其實停用」的死控件。
**實測推翻了我自己**：

```
label: "New policy"  disabled: true  cursor: not-allowed  opacity: 0.5
title: "This action writes to a server. This port has no backend that can perform it,
        so it renders disabled — a button that looks live and does nothing is worse."
```

⇒ 它是**誠實停用**的，還帶著解釋用的 tooltip。我是在截圖上把「50% 透明的藍」看成了「可用的藍」。
**教訓：截圖是給人看的證據，不是給人推論 disabled 狀態的依據。** 要問狀態就去問 DOM。

⛔ **但那句 tooltip 帶出一個真的發現**：`shell.inert`（`i18n/en.json:26`）是**共用字串**，
套在所有 inert 按鈕上。它說「**沒有後端能做這件事**」——
而 `POST /policies` **從 W03 就存在且可用**。
這顆按鈕停用的真正原因是**沒有表單**，不是沒有後端。

⇒ **共用文案在部分用途上變成不實陳述** —— W24 那一族的形狀（只是方向相反：這次是低報不是高報）。
**Day 4 進 BACKLOG，不當場改**（Step 0.0：順路發現的東西不當場做）。

其餘控件：`Status ▼` 可點（`cursor: pointer`、未 disabled）；
列不可展開 —— 而頁面**自己說了**「Rows do not open. The detail screen still reads sample data,
and sending a real policy to a sample document would be worse than not offering the link at all.」
⇒ 誠實標示，非死控件。

### 3.6 ⛔ 本次 drive-through 的射程（收尾報告必須照抄）

> **轉換能力已 drive-through 驗證（真 UI + 真後端 + 真 DB），但 `/policies` 上沒有任何控件會呼叫它。**
> **使用者今天無法從介面推進政策狀態。**

這是 plan §3.x 明文排除的（不建控件），**不是本片的缺陷** ——
但它是 **M5 的一個 Potemkin 缺口**，Day 4 必須以自己的名字進 BACKLOG，
不能只躺在 plan §3.x 裡當作「已知」。

### 3.7 dev 資料庫的殘留狀態（給下一個 session）

drive-through 改了 `isms_dev` 的兩列，**不會自己回復**：

| refCode | 原狀態 | 現狀態 |
|---|---|---|
| `POL-SG1-000002` "Second" | draft | **published** |
| `POL-SG1-000001` "First after reset" | draft | **in_review** |

⚠️ 兩筆都**不是 DEMO SEED**（是 W03/W04 手動測試留下的），所以沒有動到種子資料。
要回到原狀就重跑 `npm run prisma:seed -w apps/api`，
但**沒有必要** —— 它們現在的狀態正是本次 drive-through 的證據。

~~**dev server 仍在跑**：api pid 42408（3210）· web pid 10224（3200）。~~
⛔ **已停**（2026-08-21，Day 4 post-push）—— 3200 / 3210 實測皆 free。
本節是**寫給下個 session 讀的當前狀態**，不是歷史快照，所以就地更正而非留著。
⚠️ 上方 `isms_dev` 那兩列**沒有**跟著回復 —— 資料庫狀態與程序狀態是兩回事。

#### E2 ⭐ — enum 與實作脫節時，**誰在建置期就攔下來**

這才是分得出高下的那一題。做法：從各自刪掉 `retired`，跑 `type-check`。

⛔ **預測**：

| | 動作 | 預測 | 理由 |
|---|---|---|---|
| **A** | 刪掉 `POLICY_TRANSITIONS` 的 `retired: []` 一鍵 | **type-check 失敗** | `Record<PolicyStatus, …>` 是**窮舉**的，少一鍵就不合型別 |
| **B** | 刪掉 `states.retired` **與**指向它的 `TO_RETIRED` 邊 | **type-check 通過** | XState 的 `states` 是自由字串，**與 `PolicyStatus` 沒有任何型別連結** |

⇒ 若預測成立：**候選 A 在 enum 變動時 fail-closed，候選 B 要靠測試在 runtime 抓。**
而「靠測試抓」的前提是**有人記得寫那條測試** —— 本片寫了（36 組等價測試），
但那是我今天特地寫的，不是函式庫給的。

⚠️ **B 的預測有可能錯**：XState v5 對 target 字串有一定的型別檢查（`TStateSchema`），
刪掉 state 但留著指向它的邊**可能**會型別錯。所以 B 的刪法**連邊一起刪**，
好讓測的是「**與 enum 的連結**」而不是「機器內部自洽」。
**若 B 實測是失敗的，那就是候選 B 的一個加分項，照實記。**

### ⭐ Day-0 ROI

**兩條實測各自擋下一個會在 Day 1 才炸的假設**：

1. 若沒查 **D1**，Day 1 會花時間找「共同下游」——**那個東西不存在**。
2. 若沒查 **D2**，AC-2 會在 Day 1 寫測試時才發現拿不到 `from`，而那時 US-2 已經被當成「做得到」寫進了轉換設計。
   ⛔ 更糟的可能：**寫一個只斷言 `to` 的測試然後把它讀成「from/to 都驗了」** ——
   那是 `AD-ProxyMetricAsAnswer-1` 的形狀，而它會通過所有 gate。

⚠️ **兩條都不是 grep 命中數能回答的** —— D1 要讀 controller 確認沒有 `@Put`/`@Patch`，
D2 要讀 recorder 的檔頭才知道 `before` 恆為 NULL 是**結構性**的而非未實作。

---

## 2026-08-21 — Day 4（續）：push → PR #98 → **CI 紅** → 修 → 綠

### 4.1 ⛔ 「本機綠但 CI 未驗」不是免責聲明，它兌現了

closeout 報告與 PR #98 描述都寫著這面紅旗。它在 push 後 **2 分 14 秒**兌現：

| Check | 結果 |
|---|---|
| 憑證外洩 — gitleaks（全歷史）· 依賴漏洞 — SCA · 容器映像 — trivy · 靜態安全 — SAST | ✅ pass |
| 映像 build + 啟動探測 | ✅ pass 1m56s |
| **`gates`** | ❌ **fail 2m14s** —— int **5 failed / 275 passed** |

五條全在**本片新增的** `workflow.int.spec.ts`，全是同一個錯：
`NotFoundException: policy <uuid> not found` —— 政策剛建好，下一步 `byId` 就找不到它。

### 4.2 根因：測試的呼叫者身分是**環境變數**，而兩邊的環境不同

不是猜的，三段各有直接證據：

| 段 | 證據 | 值 |
|---|---|---|
| CI 有 `.env` | `.github/workflows/ci.yml:235` `[ -f .env ] \|\| cp .env.example .env` | `.env.example:42` = **`HK1`** |
| `.env` 進得了 `process.env` | `app.module.ts:54,58` `ConfigModule.forRoot({ envFilePath: [cwd/.env, cwd/../../.env] })` | jest 的 cwd 是 `apps/api` ⇒ 讀到 repo 根 `.env` |
| 誰在讀它 | `dev-principal.ts:100-110` `entityCodes()` —— **每次呼叫**讀，fallback `['SG1']` | 我的 `.env` **沒有這個變數**（該字串零命中）⇒ 本機 = `SG1` |

⇒ 測試在 **SG1** 建政策，`controller.transition()` 卻以 **HK1** 的身分去看它 ⇒ 404。
**而 404 正是正確行為**（約束 8：查無資料回 404 不回 403）—— 壞的是測試的前提，不是產品碼。

### 4.3 ⭐ 先重現，才動手

沒有直接改。先在本機把 CI 的環境重建出來：

```
$env:DEV_PRINCIPAL_ENTITIES='HK1'; npm run test:int -w apps/api -- src/workflow/workflow.int.spec.ts
⇒ Tests: 5 failed, 6 passed, 11 total   ← 與 CI 同樣的 5 條、同樣的錯
```

⇒ 根因由**重現**確認，不是由推論確認。

### 4.4 修法：照既有先例，不發明新的

`risk.int.spec.ts:434-448` **早就處理過這件事**，連註解都寫明了
（「The scope comes from DEV_PRINCIPAL_ENTITIES … read per call — so setting it here
is how a test says *this caller is SG1*」）。我在 Day 1 沒有找到這個先例。

⇒ 在 `beforeAll` 釘住 `DEV_PRINCIPAL_ENTITIES='SG1'` + `DEV_PRINCIPAL_ROLLUP='false'`，
`afterAll` 還原（`maxWorkers: 1`，洩漏會跟著整輪跑進別人的套件 —— 就是 §1.x 那個坑的同一形狀）。

⚠️ **ROLLUP 也釘，理由是量到的不是假想的**：本檔 scope 4 證明
**滾升 scope 根本不能轉換**，所以環境若帶 `DEV_PRINCIPAL_ROLLUP=true`，
這半邊會以「would guess an entity」轉紅 —— 一個**沒有指出任何真問題**的訊息。

### 4.5 驗證：修法必須在**產生失敗的那個環境**下被證明

| 環境 | int 結果 |
|---|---|
| **`DEV_PRINCIPAL_ENTITIES=HK1`（= CI）** | **280 / 22 全綠**（單檔 11/11） |
| 本機預設（變數不存在 ⇒ `SG1`） | **280 / 22 全綠** |

⇒ 兩個方向都綠，且還原機制沒有污染其他 21 個套件。
format **0** · lint **0** · type-check **0** · api unit **507 / 41**。

### 4.6 這個危害在 repo 裡還剩多少

22 個 `.int.spec.ts` 中**只有 2 個**取得 Controller（`risk` 與 `workflow`），
**兩個現在都釘住了**。⚠️ 第一次的 pattern（`get(.*Controller)`）太窄 ——
`AD-NarrowPatternWideClaim-1` 的形狀 —— 換成 `grep -rl "Controller"` 複驗，**兩者同答案**。

### 4.7 ⭐ 這一片真正的教訓（不是「要跑 CI」）

Day 3 的 drive-through **是對的、也是真的**，它用真 UI + 真後端 + 真 DB 走完了流程。
但它與 int 測試**共用同一個隱含前提**：呼叫者是 SG1。
`verification-discipline.md` 分了三層（gate / curl / drive-through），
**這次失敗穿過了全部三層** —— 因為三層都在同一台機器、同一份 `.env` 上。

> **第四個軸不是「更深的驗證」，是「同一件事在不同環境跑一次」。**
> 而本 repo 目前唯一提供這個軸的東西就是 CI。
> ⇒ `AD-VerificationEnvironmentIsAnAxis-1`

