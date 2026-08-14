# Phase W13 Progress

**Phase**: W13 — Connect the audit trail to every reachable write path
**Plan**: [plan.md](./plan.md)
**Branch**: `feature/W13-audit-coverage`（base `fa37d6b`）

---

## Day 0 — 2026-08-14 — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-reach** | 兩條獨立路徑收斂。正向：`client.<delegate>.<op>` 全掃得 **16 個寫入 delegate**（15 個 `create` + `refCodeCounter.upsert`）。反向：`schema.prisma` **22 個 `^model`** 減去正向的 16 ⇒ 6 個無寫入（`AuditLog` · `ExtensionField` · `OrgEntity` · `Threat` · `User` · `Vulnerability`）。16 − soa（已接）− refCodeCounter（不接）= **14** | plan §3.1 的 14 個名字**逐字確認**，規模不變 | ✅ 確認無誤 |
| **D-reach-b** | ⭐ 正向枚舉抓到**第 17 個** delegate：`audit.recorder.ts:157` 的 `writer.auditLog.create`。`scoped-prisma.provider.ts:127` 把 `writer` 綁在**未擴充**的 client 上 ⇒ 不重入 hook | `AuditLog` 不需要進清單也不需要被排除 —— **構造上不可達**。CH-030 要寫明，否則下一個人會以為它被漏掉 | ✅ |
| **D-write-ops** | ⛔ **全 codebase 零個 `client.*.update`、零個 `.delete`** —— 15 個領域寫入全是 `create`。`control.int.spec.ts:144` / `rm-report.int.spec.ts:162` 等 update 測試走 **raw SQL**，驗的是 RLS 層 | ⭐ ADR-0003 限制 1（`before` 永遠 NULL）**在只有 create 的世界裡無害** —— create 本來就沒有 before。但這讓「覆蓋」一詞有歧義：接上 15 個模型 ≠ 稽核了所有狀態變更類型。**CH-030 必須把這句話寫清楚** | 🟡 縮小 D-limits 的工作，但擴大 closeout 的措辭責任 |
| **D-vacuous** | 逐一讀完 **13 個 int spec** 的範疇測試（~30 個）。缺非空前提者 **4 個**：`entity-scope.int.spec.ts:155`（roll-up，`every`+`some` 無前提）· `entity-scope.int.spec.ts:168`（無 roll-up 看不到，缺對造前提，**弱形態**）· `asset.int.spec.ts:282` test 7（RLS，`toHaveLength(0)`×2）· `risk.int.spec.ts:353` test 14（RLS，同形狀） | **4 ≤ 5 的 go/no-go 門檻** ⇒ 不觸發範圍變動。Day 1 的工作量在 plan §3.3 預期內 | ✅ GO |
| **D-vacuous-b** | ⭐ 其餘 ~26 個**本來就對**，而且**修過的地方都留了註解**（`audit.int.spec.ts:206-211` · `entity-scope.int.spec.ts:80-81` · `rm-report.int.spec.ts:249-251` · `soa.int.spec.ts:159-161` · `issue.int.spec.ts:122-124`） | `AD-VacuousScopeTest-1` 的真相是「**還沒掃完**」而不是「沒有做法」—— 修法已在 repo 內成形，Day 1 是把它推到剩下 4 處 | ✅ |
| **D-vacuous-c** | ⛔ **我一度誤讀了這條 AD**。W12 retro:173 的原文說的是 **`audit_log` 自己**的四個範疇測試，而 `audit.int.spec.ts:212-213` 顯示 **W12 已經修好它了**。若照我記憶中的版本做，Day 1 會去修一個已經是對的東西 | 讀原文，不讀自己的摘要 | ✅ 已更正 |
| **D-refcode** | 15 個 `issueRefCode(` 呼叫點與 15 個領域 `create` **一一對應**（`policy.repository.ts:117` 等），全部在 create 之前 | §3.2「每個 create 都跑一次 counter upsert」的**讀 code 部分**成立。量的部分仍歸 Day 3 N3 | ✅ |
| **D-refcode-b** | ⛔⭐ `refCodeCounter.upsert` 的 args 是 `{where, create, update}` —— **沒有 `data` key**。`audit.recorder.ts:141` 的 `asRecord(args?.['data'])` 因此得 `null`，`resolveEntity` 拿不到 `orgEntityId`，退回 context；**多實體 scope（滾升）下直接 throw `UnattributableWriteError`** | ⭐ §3.2 的「刻意不接」理由**比 plan 寫的更硬** —— 不只是訊噪比，是**接上會讓滾升角色的每個 create 失敗**。⚠️ **N3 的預期方向要改寫**：不是「2 列」，是「單實體 scope 得 2 列 / 多實體 scope 拋錯」 | 🟡 改 plan §3.2 + Day 3 N3 預測 |
| **D-limits** | 14 個目標模型（+ soa）**全部**有 `refCode` **且**有 `orgEntityId` —— 機械導出自 `schema.prisma`。無寫入路徑的 5 個之中，`ExtensionField` / `OrgEntity` 有讀取路徑，`Threat` / `User` / `Vulnerability` 完全未被引用 | ADR-0003 三條限制**逐一可接受**，**沒有模型需要留在清單外** ⇒ 不觸發「`closed_partial` 好過偷偷改機制」那條分支 | ✅ |
| **D-roadmap** | 「其餘 **20** 張表」出現在 **3 處**：`ROADMAP.md:78`（4c 標題）· `BACKLOG.md:115`（AD 備註）· `STATUS_AUDIT.md:271`（候選 A）。正確值 **14** —— 20 是「21 − 已接的 1」，漏扣 5 個無寫入路徑 + 1 個刻意不接 | Day 4 更正 `ROADMAP` 與 `BACKLOG`（**活文件**）。⛔ `STATUS_AUDIT.md:271` **不改** —— 它是 2026-08-14 的歷史快照，改它等於竄改當時的認知 | 🟡 Day 4 |
| **D-baselines** | api unit **451 / 38** · api int **187 / 15** · web **10 / 1** · coverage **92.27 / 91.66 / 98.95 / 93.64** · `run_all` **8/8** · `check_entity_index` **21 / 35** · format ×2 = 0 · lint = 0 · type-check = 0 · build ×2 = 0 · `lint:negative` PASS（`57 file(s) scanned, 0 bypasses`） | **逐位對上 plan §Ground truth**，無一項漂移 | ✅ |

**順路發現，記入 BACKLOG 不當場處理**（`CH-017` 節流閘）：
`assessment.int.spec.ts:346` 的標題寫「cross-entity READ returns nothing, **on all three tables**」，
而 body 只斷言 `templates` 與 `instances` **兩張**，`responses` 未測。命名與行為不符（AP-7 的形狀），
但它不阻塞本片。

### Prong 覆蓋

- **Prong 1（path）**: 14 個路徑驗證（13 個 EDIT 檔存在 + `CH-030` 未被佔用 —— 最大號是 **CH-029**，含 6 個資料夾形式），**0 漂移**。⭐ 附帶確認 `modules/**/*.int.spec.ts` 恰好 **11 個**，plan §4 沒有漏掉模組
- **Prong 2（content）**: 9 個宣稱驗證，**3 個漂移**（D-write-ops · D-refcode-b · D-roadmap），2 個新增事實（D-reach-b · D-vacuous-b），1 次自我更正（D-vacuous-c）
- **Prong 2.5（child tree）**: **N/A** —— 無前端
- **Prong 3（schema）**: **N/A 且已驗證** —— `git diff --stat main..HEAD -- apps/api/prisma/` 輸出為空；全分支 diff 只有 2 個 planning 檔

**⚠️ 覆蓋聲明**（`AD-NarrowPatternWideClaim-1`）：
D-vacuous 掃的是 **13 個 `*.int.spec.ts`**（11 modules + `entity-scope` + `audit-trail`）。
**未掃 `bench.int.spec.ts`** —— 它是 benchmark，沒有範疇斷言。unit spec（`*.spec.ts`）亦未掃，
它們不碰 RLS。D-reach 的正向枚舉排除了 `*.spec.ts`，因為測試檔的直寫是刻意繞過 repository 的。

### Go / No-Go

**範圍變動**: ~**5%** → **繼續 Day 1**

三條 go/no-go 判準逐一結算：

| 判準 | 門檻 | 實測 | 結果 |
|---|---|---|---|
| D-vacuous 個數 | > 5 ⇒ 修訂 plan | **4** | ✅ 繼續 |
| D-limits 有模型不可接受 | 任一個 ⇒ 修訂 | **0** | ✅ 繼續 |
| D-reach 兩路徑不一致 | 不一致 ⇒ 先查方法 | **一致（14）** | ✅ 繼續 |

⚠️ 兩處 plan 要在 Day 1 開始前微調（**不是重寫，寫進 §Risks 保留審計軌跡**）：
D-refcode-b 讓 §3.2 的理由更硬且改變 N3 的預期方向；D-write-ops 讓 §3.y 的
「覆蓋」一詞需要在 CH-030 附一句限定。

---

## Day 1 — 2026-08-14 — 空集合回頭檢查（US-1）

### 1.1 逐檔結果表（掃描於 Day 0，此處是完整版 —— Day 0 只列了命中的）

**掃了 13 個 `*.int.spec.ts`，~30 個範疇測試。缺非空前提 4 個，本來就對 ~26 個。**

| 檔案 | 範疇測試 | 判定 |
|---|---|---|
| `entity-scope.int.spec.ts` | `:83` 自己的實體 · `:92` 404-not-403 · `:107` 跨實體寫 · `:125` 搬移 · `:139` 正向 · `:162` 全區滾升 · `:189` no-records vs no-scope | ✅ 7 個本來就對 |
| `entity-scope.int.spec.ts` | **`:155` 滾升子樹** · **`:168` 無滾升看不到** | ⛔ **2 個缺** |
| `audit.int.spec.ts` | `:199` 約束8(1) · `:219` (2) · `:240` (3) · `:258` (4) | ✅ 4 個對（**(1) 由 W12 修好，`:212-213`**）|
| `asset.int.spec.ts` | `:113` 跨實體讀 · `:289` 滾升 | ✅ 2 個對 |
| `asset.int.spec.ts` | **`:282` test 7 RLS** | ⛔ **1 個缺** |
| `risk.int.spec.ts` | `:248` 跨實體讀 · `:362` 滾升 | ✅ 2 個對 |
| `risk.int.spec.ts` | **`:353` test 14 RLS** | ⛔ **1 個缺** |
| `policy.int.spec.ts` | `:88` 跨實體讀 · `:139` 滾升 · `:316` 併發（`:331` 有 `toBeGreaterThan(0)`）| ✅ 3 個對 |
| `control.int.spec.ts` | `:123` 群組共享讀 · `:135` RLS（`toEqual([SG1_GROUP])`）· `:340` 滾升 | ✅ 3 個對 |
| `control-test.int.spec.ts` | `:206` 跨實體讀 · `:275` 滾升 | ✅ 2 個對 |
| `evidence.int.spec.ts` | `:182` 跨實體讀 · `:245` 滾升 | ✅ 2 個對 |
| `issue.int.spec.ts` | `:118` 跨實體讀 · `:188` 滾升 | ✅ 2 個對 |
| `action.int.spec.ts` | `:186` 跨實體讀 · `:245` 滾升 | ✅ 2 個對 |
| `assessment.int.spec.ts` | `:346` 跨實體讀 · `:421` 滾升 | ✅ 2 個對（⚠️ `:346` 標題說 3 張表只測 2 張 → BACKLOG）|
| `rm-report.int.spec.ts` | `:239` 跨實體讀（**`toHaveLength(1)` 對造**）· `:256` RLS（自建 fixture）· `:269` 滾升 | ✅ 3 個對 |
| `soa.int.spec.ts` | `:153` 跨實體讀 · `:227` 滾升 | ✅ 2 個對 |
| `bench.int.spec.ts` | — | ⚪ **未掃**（benchmark，無範疇斷言）|

⭐ **~26 個本來就對，而且修過的地方都留了註解** —— `AD-VacuousScopeTest-1` 的真相是
「**掃描沒做完**」而不是「沒有做法」。做法早在 **W05 的 seed 註解**（`int-global-setup.js:132-134`）
就寫下了：「One-sided fixtures are how an isolation suite passes while proving nothing」。

### 1.2 補非空前提（4 處，commit `70db22e`）

| 位置 | 前提來源 | 做法 |
|---|---|---|
| `entity-scope.int.spec.ts:155` | seed（`policies` 兩邊都有）| 讀回 `SG1_POLICY` 在滾升結果中、`HK1_POLICY` 在 HK1 scope 中 |
| `entity-scope.int.spec.ts:168` | seed | 先用**滾升**讀回 `SG1_POLICY`，證明「不滾升看不到」是拒絕不是空表 |
| `asset.int.spec.ts:282` | seed（`assetGroups` / `assets` 兩邊都有）| 用 HK1 scope 讀回 `length > 0` |
| `risk.int.spec.ts:353` | ⛔ **無** —— seed 沒有 `risks` | **自己建一筆 HK1 risk** |

⛔ **這四處的前提來源不同，是 Day 0 讀 seed 才知道的** —— 若假設「seed 兩邊都有」，
risk 那一處會補成一個仍然恆真的斷言。

### 1.3 中性化：讓對造集合為空，證明補的東西會紅

**⛔ 預期寫在執行之前**（此段先 commit，再跑）：

| # | 中性化 | 預期 |
|---|---|---|
| V1 | `:155` 的 `clientFor(['HK1'])` → `clientFor(['SG'])`（SG 自己無 policy）| 該測試轉紅 |
| V2 | `:168` 的 `clientFor(['SG'], true)` → `clientFor(['SG'])`（不滾升 ⇒ 空）| 該測試轉紅 |
| V3 | `asset:282` 前提兩行的 `orgEntityId: HK1` → `FICTIONAL` | test 7 轉紅 |
| V4 | `risk:353` 前提行的 `orgEntityId: HK1` → 不存在的 UUID | test 14 轉紅 |

**整體預期**：**187 → 4 failed / 183 passed**，且紅的**恰好**是上述四個。

**執行結果（預測 commit `c17c9b5` 之後跑）—— ⭐ 4/4 方向全中，逐字相符**：

```
Test Suites: 3 failed, 12 passed, 15 total
Tests:       4 failed, 183 passed, 187 total

  ● risk module (integration) › 14. RLS holds at the client, independently of the repository
  ● asset module (integration) › 7. RLS holds at the client, independently of the repository
  ● entity scoping (integration) › rolls up the authorised subtree and stops at the sibling branch
  ● entity scoping (integration) › a country grant without roll-up sees nothing below it
```

| # | 預期 | 實際 | 判定 |
|---|---|---|---|
| V1 | `:155` 轉紅 | 轉紅 | ✅ |
| V2 | `:168` 轉紅 | 轉紅 | ✅ |
| V3 | `asset` test 7 轉紅 | 轉紅 | ✅ |
| V4 | `risk` test 14 轉紅 | 轉紅 | ✅ |
| — | 其餘 183 不動 | 183 passed | ✅ |

**還原驗證**：`git checkout --` 三個檔 → `git status --short` **輸出為空** →
重跑 `test:int` **187 / 15 全綠**。控制組與還原各驗一次。

⇒ **這四個斷言現在有鑑別力**：對造集合真的為空時它們會紅，而不是恆真。

⚠️ **一個已預見的干擾，寫在前面**：V4 若改成「拿掉那筆 `create`」則**不會轉紅** ——
同檔 `:248` test 10 已經建過 HK1 risk，jest 檔案內循序執行。所以 V4 改的是**查詢目標**
而不是移除寫入。⭐ 這也順帶說明我補的 `create` 在**當前執行順序下是冗餘的** ——
保留它是因為測試不該依賴另一個測試先跑（`AD-JestFileOrder-1`）。

---

## Day 2 — 2026-08-14 — 覆蓋 + 每個模型的守衛（US-2, US-3）

### ⛔ 2.0 plan §4 的做法行不通，而這是**量出來的**不是推論出來的

寫第一條覆蓋測試之前先問了一句：**11 個模組 spec 的圖裡有 audit hook 嗎？**

| 實驗 | 圖 | 同一個 `AssetGroup` create | 結果 |
|---|---|---|---|
| **A** | `Test.createTestingModule({imports:[AssetModule]})` | `before=9 after=9` | ⛔ **不寫稽核列** |
| **B** | `Test.createTestingModule({imports:[AppModule]})` | `before → before+1` | ✅ **寫一列** |

**機制**：`AuditModule` 是 `@Global`，但 global provider **只在被拉進圖裡才生效**；
`ScopedPrismaFactory` 對 hook 是 `@Optional`（`scoped-prisma.provider.ts:151-165` 解釋了為何必須如此）。
`AssetModule` 的 imports 只有 `EntityScopeModule`。

⇒ 原做法會讓那 11 條測試**要嘛永遠紅、要嘛寫成 `≥ 0` 而正是 AP-3**。
⇒ **改為新建 `audit-coverage.int.spec.ts`（composes AppModule）** —— plan §4 DEVIATION 已記錄。

⚠️ **Day 0 沒抓到這條**。我在 Day 0 讀過那段 docstring（它就在 `scoped-prisma.provider.ts` 裡，
D-reach 時讀的），但沒有把它連到 plan §3.0 的做法上。**讀過 ≠ 用上**。

⭐ **實驗 B 的第一版失敗，而失敗的是實驗自己** —— `await import()` 在 jest CJS 下拋
`A dynamic import callback was invoked without --experimental-vm-modules`。
若當時就下結論「AppModule 圖也不寫」，會得到完全相反的設計。
⇒ `AD-MetaVerificationBug-1` **第 4 個資料點**，判準「方向不符預期時先懷疑元驗證本身」再次成立。

### 2.1 允許清單 1 → 15（`audit.module.ts`）

15 個名字 + **枚舉方法寫在常數旁**（正向 grep + 反向 `^model` 差集，兩條路徑各給一行指令）。
⛔ 兩個排除都**顯式寫下理由**，不靜默跳過：

- **5 個無寫入路徑的模型不加**（`OrgEntity` / `User` / `ExtensionField` / `Threat` / `Vulnerability`）
- **`RefCodeCounter` 不加** —— 理由升級為 Day-0 的 `D-refcode-b`（多實體 scope 下會 throw）
- **`AuditLog` 不需排除** —— 走未擴充 client，構造上不重入

### 2.2 + 2.3 十五條覆蓋測試 + 一條漂移守衛

**⛔ 斷言形狀是「依本次寫入的 `refCode` 查，恰好一列」，不是 count delta。**
兩個 suite 現在都 composes AppModule，jest 平行 worker 共用一個 DB ⇒ `before/after` 是 race。
`refCode` 每次寫入唯一 ⇒「恰好一列」是關於**這一次寫入**的主張。

**漂移守衛**（`the allowlist still matches the write surface`）：
掃 `core-model/*.ts` 導出 `client.<delegate>.<write>` 的 delegate 集合 → 轉 model 名 →
與 `AUDITED_MODELS ∪ {RefCodeCounter}` 比對，三個方向各一條斷言
（**未稽核的**、**清單裡不可達的**、**兩者相等**）+ 一條非空前提（`size > 10`）。

⇒ **這是本片唯一能防止「下一張表又忘了接」的東西** —— 沒有它，R4 的失效模式會原封不動回來。

### 2.x Full gate（十一項全跑）

| Gate | 結果 |
|---|---|
| `format:check` apps/api | **0**（⚠️ 第一次 **1** —— 新檔一行超長，prettier --write 後過）|
| `format:check` apps/web | **0** |
| `lint` | **0** |
| `type-check` | **0** |
| `build` apps/api / apps/web | **0** / **0** |
| `lint:negative` | **PASS** —— `rejected audit-trail -> core-model, as it must` · `skipped 54 test`（53 → 54）|
| api unit | **451 / 38**（不變）|
| **api int** | **203 / 16** —— **+16**（15 覆蓋 + 1 守衛），既有 187 全數不動 |
| web test | **10 / 1**（不變）|
| coverage | **92.27 / 91.66 / 98.95 / 93.64** —— **與 baseline 逐位相同**（新增的是 int spec，不計入 unit coverage）|
| `run_all` | **8 / 8** |
| `check_entity_index` | **21 / 35** ✅ **未變動** —— 本片不建表，變了就是有東西不對 |

---

## Day 3 — 2026-08-14 — 中性化元驗證（純後端 ⇒ 無 drive-through）(US-4)

_(本 phase 無 user-facing surface。以下一律 **gate-only verified**，絕不暗示可用性。)_

### 3.1 四個中性化的預期方向 —— ⛔ 本節先 commit，再執行

**兩個 suite 會受影響，先把它們的測試數釘住**：
`audit.int.spec.ts` **12 個** · `audit-coverage.int.spec.ts` **16 個**（15 覆蓋 + 1 漂移守衛）。
其餘 11 個模組 spec + `entity-scope` 走 module-local 圖，**Day 2 已量到它們沒有 hook**
⇒ 四個中性化都**不應**動到它們。基線 **203 / 16**。

⚠️ **逐測試預測，不是總數預測**（W12 的 N4 在這裡掛錯過測試）。

#### N1 — `AUDITED_MODELS` 清空

| Suite | 預期紅 | 逐項理由 |
|---|---|---|
| `audit-coverage` | **16 / 16** | 15 條覆蓋查不到列（`toHaveLength(1)` → 0）；漂移守衛的 `unaudited` 變成 15 個 |
| `audit.int.spec` | **10 / 12** | 1 `writes exactly one` · 2 `records nothing`（`before > 0` 失守）· 3 `leaves no row`（同）· 4 `chains`（`rowsChecked > 1`）· 5 `separate chain`（`hk[0]!` undefined）· 6 `約束 8 (1)`（`sg.length > 0`）· 8 `約束 8 (3)`（`DISTINCT` 回 `[]`）· 10 `strategy B`（`at(-1)!` undefined）· 11 + 12 tamper（同）|
| | **綠 2** | 7 `約束 8 (2)` —— 它的鑑別力來自 `rejects.toThrow()`（RLS 擋），與有沒有列無關 · 9 `約束 8 (4)` —— 42501 是 GRANT 的答案 |
| 其餘 13 suite | **0** | module-local 圖，本來就沒有 hook |

**N1 總預期：26 紅 / 177 綠**
⭐ 其中 `audit.int.spec` 的 **10** 應與 **W12 N2 補完非空前提後的 10 紅一致** —— 若不是 10，兩次之間有東西變了。

#### N2 — 只移除 `Issue` 一個名字 ⭐ **本片的驗收核心**

| 預期紅 | 理由 |
|---|---|
| `audit-coverage › Issue` | 唯一寫 `Issue` 的覆蓋測試 |
| `audit-coverage › the allowlist still matches the write surface` | `unaudited = ['Issue']` —— ⭐ **這條紅是設計上正確的**，它的職責就是抓「可達但沒接」|

**N2 總預期：恰好 2 紅 / 201 綠**，其餘 14 條覆蓋測試**一條都不能動**。

⛔ **若是「全紅」或「只有 1 紅」都算失敗**：全紅代表覆蓋不是逐模型成立；
只有 1 紅代表漂移守衛沒在守。**這是本片唯一能區分「真覆蓋」與「宣稱覆蓋」的證據。**

#### N3 — 把 `RefCodeCounter` 補回清單（量 plan §3.2 的宣稱）

| 預期紅 | 理由 |
|---|---|
| `audit.int.spec › writes exactly one audit row for one domain write` | 每個 create 現在寫 **2** 列，`before + 1` 失守 |
| `audit-coverage › the allowlist still matches the write surface` | `RefCodeCounter` 同時在 `DELIBERATELY_UNAUDITED` 與 `AUDITED_MODELS` ⇒ 第三條斷言（兩集合相等）失守；`unaudited` / `unreachable` 兩條**仍應為空** |

**N3 總預期：2 紅**。
⚠️ **15 條覆蓋測試預期仍綠** —— 它們依 `refCode` 查，而 counter 那列的 `resourceId` 是 null
（upsert 的 args 是 `{where, create, update}`，`resolveResource` 三個來源都取不到）。

**另外要量三件事（checklist 3.3），不靠推測**：
1. 一次領域 create 之後的 `audit_log` 列數 —— **預期 2**
2. counter 那列的 `after` 內容 —— **預期 SQL NULL**（args 無 `data` key）
3. ⭐ **多實體 scope 下做一次 create** —— **預期 throw `UnattributableWriteError`**
   （Day-0 `D-refcode-b` 的宣稱，至今**只讀過 code 沒量過**）

#### N4 — 證明 Day 1 補的前提**是**唯一讓它紅的東西

⚠️ **Day 1 的 V1–V4 已經證明「前提在 + 集合空 → 紅」。單獨重跑一次沒有新資訊。**
N4 要證明的是反面，所以**兩件事同時做**：

- (a) 保持 V3 的中性化（`asset:282` 的前提查詢指向 `FICTIONAL`，對造集合為空）
- (b) **拿掉**那兩行前提斷言

**N4 預期：該測試轉綠，全域 203 綠 / 0 紅。**
⇒ 若仍紅，代表讓它紅的是別的東西，Day 1 的因果寫錯了。

### 3.2 執行結果 —— 逐項對照（預測 commit `8a0cd04`）

| N | 預期紅 | 實際紅 | 判定 |
|---|---|---|---|
| **N1** 清空清單 | 26 | **27** | ⚠️ **方向對、數字差 1** |
| **N2** 只移除 `Issue` | **恰好 2** | **恰好 2** | ✅ **逐測試相符** |
| **N3** 補回 `RefCodeCounter` | 2 | **5** | ⚠️ **量測全中，紅的測試少算 3** |
| **N4** 拿掉前提 + 保持 V3 | **0** | **0** | ✅ |

#### N1 — 27 紅（預期 26）

`audit-coverage` **16 / 16** ✅ · `audit.int.spec` **10 / 12** ✅ ——
**綠的正是預測的那兩個**（`約束 8 (2)` 靠 `rejects.toThrow()`、`(4)` 靠 42501）。
⭐ 而且 `audit.int.spec` 的 **10 與 W12 N2 補完非空前提後的 10 完全一致**。

⛔ **第 27 個是 `bench.int.spec.ts`**，我沒預測到。它在 `:217` 有
`expect(await auditRowCount()).toBe(beforeAudited + 1)` —— benchmark 自己的健全性檢查，
清單一空就失守。**它紅是正確的。**

⛔ **遺漏的根因是我只列了兩個 suite。** 一個 `grep AUDITED_MODELS` 會回答這件事 ——
事後跑出來是 **4 個檔案**（module + 兩個 int spec + bench）。
⚠️ 諷刺的是 Day 0 的覆蓋聲明**明確寫了「未掃 `bench.int.spec.ts`」** ——
措辭沒錯（它確實沒有範疇斷言），但我沒有回頭問「那它有沒有**別的**依賴」。
⇒ **覆蓋聲明記錄了盲點，卻沒有觸發任何動作。**

#### N2 — 恰好 2 紅 ⭐ **驗收核心，通過**

```
● audit coverage (integration) › Issue
● audit coverage (integration) › the allowlist still matches the write surface
Tests: 2 failed, 201 passed, 203 total
```

**其餘 14 條覆蓋測試一條都沒動。** ⇒ 覆蓋是**逐模型成立**的，不是一塊宣稱。
⛔ 這是本片唯一能區分「真覆蓋」與「宣稱覆蓋」的證據，而它給的是預測的那個形狀。

#### N3 — 三個量測全中，但紅的測試比預測多 3 個

**量測（`AD-EstimateAsMeasurement-1` 要求的那種數字）**：

| 要量的 | 預期 | 實測 |
|---|---|---|
| 一次 create 的稽核列數 | 2 | **2** ✅ |
| counter 那列的 `resource_id` / `after` | null / null | **`{"t":"RefCodeCounter","id":null,"after":null}`** ✅ |
| 多實體 scope 下 create | throw | **`UnattributableWriteError: refusing RefCodeCounter.upsert: no org_entity_id in the payload and the scope names 2 entities, so the audit row would guess`** ✅ |

⇒ **D-refcode-b 從「讀過 code」升級為「量到」**，plan §3.2 的要求達成。

**⭐ 而第五個紅的測試給了一個我沒想到、且比預測更硬的理由**：

`audit trail › leaves no audit row behind when the domain write fails` —— 我預測它綠，
理由是「整個交易 rollback」。**錯了。**
`issueRefCode` 跑在**自己的交易**裡、在領域 insert **之前**
（`policy.repository.ts:107-112` 早就寫明「The counter and the insert are two statements,
**not one transaction**」）⇒ 領域寫入被拒時，counter 的稽核列**已經 commit 了**。

⛔ **接上 `RefCodeCounter` 會讓稽核軌跡記錄一件沒有發生的事。**
對稽核員而言這比缺一列更糟。這條已寫進 `audit.module.ts` 的常數旁，作為第 3 個理由。

未預測到的另外兩個：`bench`（N1 已知的同一原因，我沒回頭套用）與 N3 探針自身
（它的斷言是故意寫成會紅的，用來把實際值印出來）。

#### N4 — 0 紅 ✅

拿掉 `asset:282` 的兩行前提斷言、**同時**保持 V3 的中性化（對造查 `FICTIONAL`）
⇒ **203 全綠**。
⇒ V3 的紅**唯一**來自那兩行前提。Day 1 補的東西確實在守，不是裝飾。

#### 還原驗證

每個 N 跑完立即 `git checkout --` 並確認 `git status --short` 為空；
最終控制組重跑 **203 / 16 全綠**。四次還原 + 一次控制組，各驗一次。

### 3.3 `RefCodeCounter` 的處置 —— 判定不變，理由從 2 條變 3 條

plan §3.2 寫的是「訊噪比 + 無治理語義」。實測後 `audit.module.ts` 的常數旁記的是：
**兩列且第二列全空** · **多實體 scope 會 throw** · ⭐ **失敗的寫入會留下稽核列**。
⇒ 判定（不接）不變，但它現在**由三個實測結果支持**，而不是由一段推理支持。

### Day 0 時數

| 項目 | Actual |
|---|---|
| Prong 1 + D-reach 雙路徑 | ~12 min |
| D-vacuous 逐一讀 13 個 spec | ~26 min |
| D-refcode + D-limits + D-roadmap | ~10 min |
| D-baselines 十一項逐項取 exit code | ~9 min |
| 記錄 | ~8 min |
| **Day 0 total** | **~65 min** |
