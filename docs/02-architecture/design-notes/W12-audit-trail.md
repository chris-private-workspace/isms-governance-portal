# W12 Design Note — a hash chain the application cannot compute, and the layer that refuses without saying so

**Purpose**: Spike-extract design note from Phase W12；記錄 **append-only 稽核軌跡**的已驗證 runtime
invariant —— 鏈算在哪一層、攔截點怎麼在邊界矩陣下成立、append-only 的兩層各自**怎麼**拒絕 ——
供 M3 後續把其餘 10 個模組接上時逐條複製。

**Category / Scope**: Architecture / Phase W12（M3 spike，ADR-0003）
**Created**: 2026-08-14
**Last Modified**: 2026-08-14
**Verified ratio**: 31 / 33 ≈ **94%**（兩條標為推導，見 §2.6 與 §4）
**Status**: Active

> **Modification History**
> - 2026-08-14: Initial creation (Phase W12) — extracted from the shipped slice

> ⚠️ **這份 note 是 extract 不是 pre-write。** 每一條不變式都對應已合併的實作與可重現的驗證指令；
> 沒有實作支撐的東西一律放在 §4「延後、未驗證」，不放進主段落。

---

## 0. Spike Summary

W12 要回答的不是「稽核表長什麼樣」，是 **OQ-4 的三個選項差在哪裡，而且要用量的**。
`14-adr/README.md:106` 延後它的理由很具體 —— **判準是寫入吞吐量，零 code 時量不出來** ——
而那個條件早已不成立（19 張表、172 個 int 測試、真 PostgreSQL），**沒有任何東西在等它失效**。

**Phase scope**: US-1 表 · US-2 兩個 chain 策略 + verify · US-3 量測 · US-4 攔截點 ·
US-5 中性化元驗證 · US-6 closeout。
**驗證期間**：2026-08-14（Day 0-4 同日）。
**Calibration**：bottom-up 6.0 hr → committed 3.9 hr（`spike` 0.65，第 6 個資料點）→
**actual 4.00 hr**（`ef7dea6` 14:33:25 → `544f052` 18:33:23，author date）⇒ ratio **1.025 IN**
—— ⭐ 本欄第一個 IN-band 點。⛔ 依 `AD-EstimateAsMeasurement-1`，actual 在 closeout commit
落地**之後**才量，故 closeout 是兩個 commit。完整敘述見
[retrospective.md](../../01-planning/W12-m3-audit-trail-spike/retrospective.md) Q2。
**測試增量**：unit 376 → **451**（+75：`chain.spec` 25 · `verify.spec` 17 ·
`audit.recorder.spec` 27 · `scoped-prisma.provider.spec` 5 → 11）· int 172 → **187**
（+15：`audit.int.spec` 12 · `bench.int.spec` 3）· **4 組中性化**各驗一次，N2 補測後重驗一次。
**Drive-through**: ⚪ **N/A —— 純後端，gate-only verified。**

四個原本不打算問、卻被答掉的問題：

1. **A 與 B 的寫入成本差多少？** —— 序列下**量不出來**（順序在兩次執行間翻轉），
   併發下 **1.63 / 1.59**（§1 D1）。
2. **驗證成本差多少？** —— ⛔ **沒有訊號**（0.84–1.20），而 plan 把它列為兩大維度之一（§1 D1）。
3. ⭐ **append-only 的兩層，哪一層在擋？** —— **兩層都擋，只有一層會說話**（§2.2）。
4. **hash 覆蓋時戳，那 JavaScript 讀得回來嗎？** —— (6) 讀不回來，**verify 會變成永遠在響的警報**（§2.9）。

---

## 1. Decision Matrix

### D1 —— 鏈算在哪一層（OQ-4）

實測於 PostgreSQL 18.4（`postgres:18-alpine`，本機 Docker on Windows）、`isms_test`、
以 `isms_app_user` 連線（**非 owner 非 superuser**，`rolbypassrls = false`）。
每組 `n = 200`，走**真實 endpoint 路徑**（`POST /soa` 的 repository 路徑）而非孤立 INSERT，
**兩次獨立執行**。逐項輸出見
[`progress.md` §Day 2](../../01-planning/W12-m3-audit-trail-spike/progress.md)。

| 準則 | **A** 逐列鏈（DB trigger）⭐ 選這個 | **B** 週期錨定（應用層） | **C** 混合 |
|---|---|---|---|
| hash 算在哪 | **PL/pgSQL**，`migration.sql:301` | **V8**，`chain.ts:212` | 兩邊 |
| 序列寫入 overhead p50 | +2.636 / +2.442 ms | +1.840 / **+2.874** ms | ≈ A |
| **併發（8 寫入者 / 1 實體）p50** | +41.638 / +26.117 ms | +25.577 / +16.413 ms | ≈ A |
| **A/B 比值（併發）** | — | — | — |
| 驗證 walk（10k 列）| 278.9 / 249.1 ms | 235.2 / 249.4 ms | 介於兩者 |
| **斷點定位** | ✅ **指到那一列** | ⚠️ **只指到那一段** | ✅ 同 A |
| 誰能弄錯 hash | ⛔ **應用層弄不錯也跳不過** | ⚠️ 應用層說了算 | 兩者皆有 |
| 時鐘 | 一個（DB）| ⚠️ 每個 API 實例一個 | 兩個 |
| 實作狀態 | ✅ 已實作 | ✅ 已實作 | ⛔ **未實作** |

**併發下 A/B = 1.63（run 1）/ 1.59（run 2）**，control drift 0.536 / 1.103 —— 遠小於 overhead，
所以這個比值可讀。

**選 A 的具體理由 —— ⛔ 不是成本**：

1. **序列下兩者分不出來。** 兩次執行的大小順序**翻轉**，差距落在 control drift 內
   ⇒「A 比較貴」在無爭用條件下**不成立**。
2. **併發下 A 確實貴 1.6 倍，而我們仍然選它。** 貴的是 `pg_advisory_xact_lock`
   （`migration.sql:282`），而它換到的是下面兩項。
3. ⭐ **斷點定位。** 同一個竄改：A 指出**那一列**（`verify.spec.ts:125`），
   B 只能指出**那一段**（`verify.spec.ts:230`、`chain.spec.ts:267`，**寫成測試而不是形容詞**）。
   對一份稽核員會讀的日誌，「這一百列裡有一列被改過」是實質更弱的陳述。
4. **A 從 TypeScript 弄不錯。** trigger 對這張表的**每一筆** INSERT 生效，包含 B 的路徑會下的那些。
   B 的 hash 是應用層算出來的 —— 那裡的 bug 會產生一條**在錯誤內容上完美驗證通過**的鏈。
5. **成本的大頭不是策略。** 併發下 B 相對對照組已多 16-26 ms，A 與 B 只差 10-16 ms
   ⇒ 先決定「要不要稽核」，再決定「用哪個鏈」。

**否決其他選項的理由**：

- **B** —— 否決在第 3 與第 4 點，**不是在成本**。它的成本優勢真實但有界，
  換來的是更弱的竄改定位與一條「信任應用層算對」的 hash。
  在一張存在目的就是「可被信任」的表上，這個交換方向是錯的。
- **C** —— ⛔ **未實作，由 A 與 B 推導**（ADR-0003 明寫這是推導）。它的寫入成本 ≈ A（它就是 A 加錨），
  唯一好處在驗證成本，而**驗證成本被量到不區分** ⇒ 多一套機制換一個在數字上看不見的好處 = AP-5。

⛔ **這是跨層比較**（PL/pgSQL vs V8），兩個數字不同質，不得相減後當成單一量。
上表支持的是差異的**形狀**，不是它們之間的算術。

### D2 —— 攔截點放哪（US-4）

Day 0 的 D1 量到 plan 原本寫的位置**在機械上被禁止**：`eslint.config.mjs:74` 讓
`entity-scope` 不能 import `audit-trail`，`:78` 讓 `audit-trail` 不能 import `core-model`
（generated Prisma client 歸類在那）。**兩個方向都不通。**

| 選項 | 可行？ | 判定 |
|---|---|---|
| **A** `entity-scope` 直接呼叫 `audit-trail` | ⛔ 矩陣禁止 | ❌ —— ADR-0004 `:85`/`:120`/`:132` 讀起來像這個，但它做不到 |
| **B** 改 MATRIX | ⚠️ 技術上可以 | ❌ —— 會弄壞 `CH-012` 的常駐負面案例（`__fixtures__/cross-scope-import.ts`，其 docstring 第一行是「DO NOT "FIX" THIS FILE」）|
| **C** 經 `api` 契約層反轉 ⭐ | ✅ 雙方都可 import `api` | ✅ **選定** —— `contracts/audit-hook.ts`，**零 import**（`api` 在矩陣中是葉節點）|

**選 C 的具體理由**：ADR-0004 的宣稱**仍然成立** —— 攔截確實發生在同一個 client extension 內
（`scoped-prisma.provider.ts:139`），只是經過一層契約。⚠️ 而 ADR-0004 **沒有提到需要這一層**，
只讀它的人會去寫直接呼叫然後被機械拒絕 ⇒ ADR-0003 §Consequences 明文補上這件事。

### D3 —— `occurred_at` 的精度

| 選項 | 後果 | 判定 |
|---|---|---|
| `TIMESTAMPTZ(6)`（與全 schema 一致）| ⛔ JS `Date` 只有毫秒 ⇒ **每一列**重算都不符 ⇒ verify 是永遠在響的警報 | ❌ |
| 把時戳**排除在 hash 之外** | 時戳可被任意改寫而鏈仍然完好 —— 稽核軌跡的時間就不再是證據 | ❌ |
| **`TIMESTAMPTZ(3)`** ⭐ | 兩邊寫入都落在毫秒邊界，`Date` 雙向 round-trip 無損 | ✅ **選定** |

⚠️ 代價已知並接受：**兩列稽核可能共用同一個時戳**。順序來自 `BIGSERIAL`、身分來自 hash，
沒有任何東西依賴時戳唯一。實測 (3) 是**四捨五入**不是截斷（`.476952 → .477000`、`.476152 → .476000`）。

---

## 2. Verified Invariants

### 2.1 鏈是 per-entity 的，而那是 `SECURITY INVOKER` 的直接後果

- **Implementation**: `migration.sql:274-320`（trigger 函式 + trigger）；本 repo
  `SECURITY DEFINER` **零命中**，八處 trigger 全部 `SECURITY INVOKER`（理由見
  `20260809171812:25`「scope 必須是呼叫端的」）
- **Behavior**: trigger 讀「上一列」的那個 SELECT **被 `audit_log` 自己的 SELECT policy 過濾**
  ⇒ 每個實體各有一條從 genesis 起算的鏈，不是一條全域鏈
- **Verification**: `npm run test:int -w apps/api -- audit` →
  `keeps a separate chain per entity, both starting at genesis`
- **Test fixture**: `audit.int.spec.ts:183`
- **Failure mode**: 若改成 `SECURITY DEFINER`，某個實體的日誌會**依賴它不得讀取的列** ——
  那是 guardrail 4 的洞，而且它會安靜地成立

### 2.2 ⭐ append-only 擋兩層，只有一層會說話

- **Implementation**: `migration.sql:125`（`GRANT SELECT, INSERT` —— 無 UPDATE / DELETE）+
  `:146-152`（只有 `FOR SELECT` 與 `FOR INSERT` 兩條 policy，**缺席的兩條才是重點**，ADR-0014）
- **Behavior**: 兩層都拒絕，**可觀測行為不同** —— GRANT 給 `42501`，缺席的 policy 給
  安靜的 `UPDATE 0`
- **Verification**: `npm run test:int -w apps/api -- audit` → `約束 8 (4)`；
  中性化 N3（補回 UPDATE GRANT）的逐項量測寫在 `migration.sql:104-124`
- **Test fixture**: `audit.int.spec.ts:258`
- **Failure mode**: ⚠️ 有人下 `GRANT ALL ON ALL TABLES` 時 append-only **仍然成立但變啞** ——
  一道還站著卻不再出聲的防線，是最難察覺它已是唯一一道的那種

> ⛔ **這個答案得來不易**：W10 宣稱是 policy 在擋、W11 宣稱是 `WITH CHECK` 在擋，**兩次都錯**
> （`AD-BorrowedRefusal-1` 的第 5、6 次）。第 7 次之所以答對，是因為沒有把
> `Received: "NO ERROR"` 當成答案 —— **「沒報錯」不等於「沒改到列」** ——
> 而是直接數：可見 **7 列**、`UPDATE 0`、**0 列被改**、`operation` 未變。

### 2.3 稽核列與領域寫入同生共死

- **Implementation**: `scoped-prisma.provider.ts:91-113` —— audit thunk 的回傳值在 `:111`
  被 push 進同一個 `$transaction` 陣列
- **Behavior**: 兩者一起 commit，或都不 commit
- **Verification**: `npm run test:int -w apps/api -- audit` →
  `leaves no audit row behind when the domain write fails`（唯一鍵衝突 ⇒ 稽核列沒有留下）
- **Test fixture**: `audit.int.spec.ts:143`
- **Failure mode**: 若 hook 內 `await`，稽核列會落在**自己的交易**裡，兩者之間當機就會遺失 ——
  這正是 `05:24`「a write path that no domain write can bypass」禁止的事。
  介面上寫著 `⛔ MUST NOT AWAIT`（`contracts/audit-hook.ts:81-85`），理由同一句

### 2.4 歸不到單一實體的寫入不會發生

- **Implementation**: `audit.recorder.ts:99`（`UnattributableWriteError`）；由 `:131`
  的 `intercept` 在建交易**之前**擲出
- **Behavior**: scope 涵蓋多個實體、而 payload 沒有 `orgEntityId` 時，寫入被拒 ——
  **不是**寫進某個猜測的實體
- **Verification**: `npm run test -w apps/api -- audit.recorder`
- **Test fixture**: `audit.recorder.spec.ts`
- **Failure mode**: ⭐ 這是 ADR-0003 的 **FC4**，而它**由構造保證會觸發** ——
  M8 的第一個滾升寫入就會炸。這是本 phase 唯一一條不需要有人記得去量的可證偽條件

### 2.5 一個 hash 定義，兩個實作，逐位元組相同

- **Implementation**: `migration.sql:167`（`audit_log_field`）+ `:197`（`audit_log_canonical`）
  ↔ `chain.ts:102`（`field`）+ `:189`（`canonicalPayload`）
- **Behavior**: TypeScript 重現 PL/pgSQL 產生的 bytes，包含 jsonb 的 key 排序（先比長度再比位元組）、
  跳脫規則、控制字元、數字呈現，以及 NULL 與空字串的區分
- **Verification**: `npm run test -w apps/api -- chain` —— ⭐ **期望值不是我寫的，是從 postgres
  取出來的**：payload hex **756 字元** + 3 個 hash 向量
- **Test fixture**: `chain.spec.ts:179-240`
- **Failure mode**: ADR-0003 的 **FC5**。這組向量失配 ⇒ 共用定義破了（jsonb 呈現 / `sha256` /
  時戳格式其中之一動了）⇒ **資料庫外面沒有任何東西驗得了 A 的鏈**

> ⭐ 這裡的第一版是**紅的，而那次失敗比通過有價值**：三個 hash 向量**都過**、payload 卻不符。
> hash 相符即 bytes 相符 ⇒ 錯的必然是**我手抄的字面值**。改用機械切行後全綠。

### 2.6 verify 報的是第一個斷點的位置，而且四種斷點可分辨

- **Implementation**: `verify.ts:66`（`BreakKind`）· `:110`（`verifyChain`，策略 A）·
  `:171`（`verifyAnchoredChain`，策略 B）
- **Behavior**: 回 `{index, id, kind, detail}` 而非布林值。四種：`content`（改了沒重算）·
  `link`（改了且重算 —— 由後繼揭發）· `unchained`（從未被 hash 覆蓋）·
  `foreign`（拼了兩個實體的列 —— **不報成竄改**，否則會派人去查不存在的攻擊）
- **Verification**: `npm run test -w apps/api -- verify` —— 空鏈 / 單列 / 長鏈 / 多處損壞取最早 /
  刪列 / 換位 各有測試
- **Test fixture**: `verify.spec.ts:100-199`（A）· `:201-262`（B）
- **Failure mode**: 回布林值的 verify 對稽核員無用 —— 「這份日誌壞了」不能拿去做任何事
- ⚠️ **`foreign` 在單元層已驗證（`verify.spec.ts:162`），但在 N4 的 runtime 中未被觀察到**
  —— 失敗輸出只印 `intact: false`。N4 下的斷點種類是從 `verifyChain` 的檢查順序**推導**的。
  **推導不是量測，照實標。**

### 2.7 已接上的模組繞不過攔截點

- **Implementation**: `audit.module.ts:38`（`AUDITED_MODELS`，目前 **1 個名字**）·
  `app.module.ts:63`（`AuditModule`，`@Global`）· `scoped-prisma.provider.ts:139`（呼叫點）
- **Behavior**: 該模組經 `runScoped` 的每一次寫入都產生**恰好一列**稽核列
- **Verification**: 中性化 **N2**（`app.module.ts` 移除 `AuditModule`）⇒ int **10 紅**
- **Test fixture**: `audit.int.spec.ts:112`（`writes exactly one audit row for one domain write`）
- **Failure mode**: ⚠️ **`ScopedPrismaFactory` 走 `@Optional` 注入，那是一個 fail-open**
  （`scoped-prisma.provider.ts:168`）—— 要求注入會弄壞 11 個與稽核無關的 int suite。
  **補償是測試組圖的位置**：`audit.int.spec.ts` 組的是 `AppModule` 不是 `SoaModule`，
  所以拿掉那一行會轉紅 —— **已實際拿掉驗證過**，不是推論

> 🚩 **N2 同時揭出一件要修的事**：四個範疇測試裡的**第 1 個**，在稽核完全關閉時仍然全綠 ——
> 空陣列上 `every()` 為真、`some()` 為假，所以「HK1 看不到 SG1 的列」與「一列都沒有」
> 是同一個觀察。補上**非空前提**後**重跑 N2**（W10 / W11 各漏過這一步）：**7 紅 → 10 紅**。
> 剩下 2 個仍綠的是**應該**綠的（走 client 直寫 / 走 raw 連線，本來就與攔截點無關）。

### 2.8 jsonb 有兩種「空」，而 CHECK 讓其中一種不可能存在

- **Implementation**: `migration.sql:75-78`（兩條 CHECK constraint）+ recorder **省略 key**
  而不是寫 `null`
- **Behavior**: `before` / `after` 只可能是 SQL NULL 或一個真正的 JSON 物件，
  不可能是 JSON `null` 這個值
- **Verification**: constraint **獨立驗過**（直接 INSERT `'null'::jsonb` →
  `violates check constraint`），不是靠「測試綠了所以它應該有效」
- **Test fixture**: `audit.int.spec.ts:173`（鏈完好即代表每一列的 `field()` 都對得上）
- **Failure mode**: ⛔ **Prisma 對 SQL NULL 與 JSON null 都回 JavaScript `null`**
  ⇒ 驗證器**在結構上無法區分**，鏈會從第 1 列就開始對不上。
  這不是「TS 少處理一個 case」—— 補判斷解不了，只能讓那個狀態不可表示

### 2.9 鏈必須能從資料庫**外面**驗證，時戳精度因此是設計決定

- **Implementation**: `migration.sql:30`（`TIMESTAMPTZ(3)`，全 schema 唯一非 (6)）+
  `chain.ts:116`（`canonicalTimestamp`，固定輸出六位小數的 UTC）
- **Behavior**: 儲存值落在毫秒邊界 ⇒ JS `Date` 讀回、重算，得到與存的完全相同的 hash
- **Verification**: `npm run test:int -w apps/api -- audit` →
  `strategy B writes a hash that checks out against the row it describes`
  —— 這條**穿過** PostgreSQL 的 jsonb 正規化與 (3) 捨入，不是繞過它們
- **Test fixture**: `audit.int.spec.ts:277`
- **Failure mode**: ⛔ 在 (6) 之下，verify 會是一個**永遠在響的警報**，而稽核員無從分辨真假 ——
  且**沒有任何 gate 抓得到**：A 的鏈在 DB 內部自洽，測試全部會過

### 2.10 依賴反轉是機械強制的，不是慣例

- **Implementation**: `contracts/audit-hook.ts`（**零 import** —— `api` 在矩陣中是葉節點，
  連一個 Prisma 型別都不能命名，所以 writer 是**結構型別**，沿用 `AD-ScopedClientDI-1`）
- **Behavior**: `entity-scope → api` ✅ · `audit-trail → api` ✅ · `bootstrap → 全部` ✅，
  MATRIX 一個字未動
- **Verification**: `npm run lint:negative` —— ⭐ 不只是「lint 綠」（那也可能是偵測器失效），
  它明文印出 `rejected audit-trail -> core-model, as it must`
- **Test fixture**: `apps/api/src/audit-trail/__fixtures__/cross-scope-import.ts`
  （`CH-012` 的常駐負面案例，**本 phase 未動**）
- **Failure mode**: 偵測器失效時 `lint` 仍會綠 —— 所以驗收看的是 `lint:negative` 的 PASS 訊息

---

## 3. Cross-Scope Contracts

**本 spike 新增 1 個跨範疇契約**，已登記於
[`cross-scope-interfaces.md`](../cross-scope-interfaces.md) 契約登記表（#1-#3）。
此處**不平行定義簽名** —— 登記表是單一來源。

| Contract | Owner scope | 登記於 | 摘要 |
|---|---|---|---|
| `AuditHook` | `api` | 登記表 #1 | `entity-scope` 呼叫的介面；`contracts/audit-hook.ts:76` |
| `AuditLogWriter` | `api` | 登記表 #2 | 唯一需要的表方法，**結構型別**；`:54` |
| `AUDIT_HOOK` | `api` | 登記表 #3 | DI token（symbol）；`:99` |

⚠️ **`AuditHook.intercept` 的回傳型別是 `unknown` 而且那是承重的**：runtime 上它是
`PrismaPromise`（尚未啟動），標成 `Promise` 會舒服很多，但會**失去整個設計倚賴的那個性質** ——
`Promise` 已經開始跑了，`PrismaPromise` 還沒有。

---

## 4. Open Invariants（延後，**未驗證**）

- [ ] **真實的 `before` / `after`** —— `before` 永遠 NULL，`after` 是**請求的 payload** 不是儲存後的列。
  應用層攔截給不出來（`scoped-prisma.provider.ts:108-110` 寫著這個天花板）。
  真正的解是**每張領域表一個 trigger**（`OLD`/`NEW` 免費）⇒ ADR-0003 的 **FC3**
- [ ] **`resource_id` 在 create 時不可得** —— Prisma 在此之後才指派 id；由 server 產生的
  `ref_code` 頂替，涵蓋目前所有模組但那是**慣例不是保證**
- [ ] **raw query 不被稽核** —— `$queryRaw` 沒有 model 名，對 hook 不可見。**已命名的洞**，
  關掉它需要語句解析
- [ ] **其餘 10 個模組未接** —— `AUDITED_MODELS` 只有 1 個名字。⚠️ **R4 因此只是「首次有 mitigation」，
  覆蓋 1 / 21**，不得讀成已解決。⛔ 分母是機械導出的（`schema.prisma` 22 個 `^model` 減去
  `audit_log` 自己，且逐個 migration 的 `CREATE TABLE` 加總相符）—— **R4 原本手寫的 18 是錯的**
- [ ] **滾升讀取的稽核** —— guardrail 4 明文要求，但 M8 才有滾升端點
- [ ] **`retention_policy` / `LegalHold`** —— 另一個 slice（`AD-ImmutableRowRetention-1`）
- [ ] **選項 C 未實作** —— 由 A、B 推導。ADR-0003 明寫那是推導不是量測
- [ ] **N4 下的 `foreign` 斷點種類未在 runtime 觀察到** —— 見 §2.6，推導自檢查順序
- [ ] **`pg_catalog.sha256` 在 Azure Flexible Server 上未實測** —— D8 選它而不選 pgcrypto 的
  第 1 個理由（少一個 `azure.extensions` 參數）陳述的是**機制不是量測**
- [ ] **量測條件未涵蓋生產形狀** —— 單機 Docker on Windows、一個實體、8 個寫入者、`n=200`。
  ⚠️ **是相對關係的證據，不是生產數字**

---

## 5. Rollback / Fallback

- **若此設計後續證明錯**：`DROP TRIGGER audit_log_chain` + 三個函式；`AuditModule` 的 recorder
  切到 `'app-chain'`（`audit.recorder.ts:76`）；補寫錨列（**未實作**）。
  表本身是**加法的**，不需要動任何既有表。
- **估計回滾成本**: ~1-2 hr（錨列的寫入路徑另計）
- **既有的 fallback 機制**: ⭐ **有 —— 策略 B 是完整實作且有測試的寫入路徑**（`chain.ts` +
  recorder 的 `app-chain` 模式）。⚠️ 但 **A 與 B 混寫的表兩個驗證常式都驗不了**，
  所以切換需要一列 cut-over marker（未建）—— 這本身就是「決定一次而不是兩次」的理由
- **可證偽條件**: 五條，全部可觀測可重跑，見
  [ADR-0003 §可證偽條件](../../14-adr/0003-audit-trail-hash-chain.md)。
  `bench.int.spec.ts` 是 FC1 與 FC2 的儀器。
  ⚠️ **FC1 / FC2 需要被否決的 B 留在 repo** —— ADR 明寫那是**當下的用途**（重量的基準線），
  並附解封條件：⛔ **Wave 1 結束前未重量就刪掉 B 並把兩條條件改寫成絕對值**

---

## 6. References

- Phase plan: [`docs/01-planning/W12-m3-audit-trail-spike/plan.md`](../../01-planning/W12-m3-audit-trail-spike/plan.md)
- Phase progress（量測原始數字 + 20 條 drift finding）: [`progress.md`](../../01-planning/W12-m3-audit-trail-spike/progress.md)
- Phase retrospective: [`retrospective.md`](../../01-planning/W12-m3-audit-trail-spike/retrospective.md)
- Change record: [`CH-029`](../../03-implementation/changes/CH-029-w12-audit-trail.md)
- ADR: [`0003`](../../14-adr/0003-audit-trail-hash-chain.md) —— 決策與可證偽條件；
  [`0004`](../../14-adr/0004-entity-scoping-enforcement.md) —— 本 note §2.10 補上的那層契約；
  [`0014`](../../14-adr/0014-row-level-entity-scope-and-per-command-policies.md) —— §2.2 給了它第一個量測
- 規格: `docs/02-architecture/05-platform-foundation-services.md:18-24`（四條性質）·
  `02a:309-312`（append-only + 假名 actor）
- 相關規則: `docs/rules-on-demand/multi-tenant-data.md` §稽核軌跡 ·
  `docs/rules-on-demand/scope-boundaries.md` §允許 / 禁止的 import 矩陣
