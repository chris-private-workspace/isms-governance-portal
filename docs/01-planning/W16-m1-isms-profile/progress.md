# Phase W16 Progress

**Phase**: W16 — ISMS profile: five entity-scoped tables, no endpoints
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W16-isms-profile`（從 `main` `157921f` 開出，`git rev-parse HEAD` 逐位相符）

> ⭐ **量法已於 plan §7 事先宣告**（`AD-CalibrationNoTimeRecord-1` / `AD-CalibrationDay0InOrOut-1`
> 的三態要求）：**「含 Day 0，且含 plan / checklist 起草」**。分子取本檔的逐任務時間記錄，
> commit author date 只作為第二條交叉檢查路徑。

---

## Day 0 — 2026-08-16 — Plan-vs-Repo Verify

**Day 0 窗口起點**：plan 第一次存檔前的起草開始
**三-prong 開始**：`2026-08-16T09:39:56Z`（`date -u`，與建 branch 同一個指令）

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **DR1** | checklist Prong 1b 寫「本 plan 引用 **16** 條 AD」；`Grep -o` 逐個抽出後去重為 **20** 條 | 手寫計數器，`AD-CountBeforeLastEdit-1` 的同形。**20 條全部在 `BACKLOG.md` 有列**（逐條命中行號），所以結論不變、只有數字錯 | 🟡 改 checklist 的數字 |
| **DR2** ⭐ | checklist 的 `D-oracle-criterion` 寫「對 `schema.prisma` **每一個 `@@unique`**」—— **判準被我自己寫窄了**。單欄 `@unique` 與 migration 裡的 `CREATE UNIQUE INDEX`（含 partial）**同樣是唯一索引、同樣受 `AD-UniqueKeyOracle-1` 管** | `AD-NarrowPatternWideClaim-1` 的形狀，而且是在**執行判準的那一格**上發生。掃描面由 10 個 `@@unique` 擴大為 **10 + 22 個單欄 `@unique` + 34 個 `CREATE UNIQUE INDEX`（含 2 個 partial）** | 🟡 改 checklist 判準措辭 |
| **DR3** ⭐ | plan §3.3 寫「五張表各自 `ENABLE ROW LEVEL SECURITY`」—— **漏了 `FORCE`**。既有每一張表都是 `ENABLE` + `FORCE` 成對，理由寫在 `attestation/migration.sql:83-84`：「without FORCE the table **OWNER bypasses the policies**, and the owner is the role migrations run as」 | 🔴 只寫 ENABLE 會讓 migration owner 完全繞過 policy，而**測試不一定會發現**（int suite 的 app 連線本來就不是 owner）。這是 guardrail 4 的直接缺口 | 🔴 改 plan §3.3 |
| **DR4** | `D-grant-precedent` 量測完成（**沒有假設**）。三層：`SELECT, INSERT, UPDATE`（12 張可變表）· `SELECT, INSERT`（`rm_report_versions:121` · `attestations:78` · `audit_log:125` 三張 append-only）· `SELECT` only（`threats` / `vulnerabilities` / `jurisdictions` / `regulations` / `obligations` / `org_entities:88` / `users:119`）。**全 repo 零個 `GRANT DELETE`** | ✅ 確認 plan D14：版本表走 `SELECT, INSERT`，與 `rm_report_versions` / `attestations` 逐字同形。四張可變表走 `SELECT, INSERT, UPDATE` —— ⚠️ **理由於 DR10 更換**：原引 `13:33`「OpCo admin can edit」，但它與 `permMatrix.js:11` 矛盾 ⇒ 改為「照既有 12 張 entity-scoped 可變表的一致形狀」| ✅ |
| **DR5** | `D-rls-shape` 量測完成：可變表 **3 條** per-command policy（`_read` FOR SELECT USING · `_insert` FOR INSERT WITH CHECK · `_update` FOR UPDATE USING+WITH CHECK），append-only 表 **2 條**（無 `_update`）。運算式一律 `"org_entity_id" = ANY (app_entity_scope())`。**全 repo 零條 `FOR DELETE` policy** | ⇒ W16 需 **3×4 + 2 = 14 條 policy**。plan §3.3 只寫「條數依 Day-0 決定」，現在有數字了；§7 的 bottom-up 對 migration 估 1.6 hr **未含 14 條 policy 的具體量** | 🟡 §7 風險已知，不改承諾（單點不調） |
| **DR6** ⭐ | `rm_report_snapshot/migration.sql:155-158` 的註解仍寫「**"should be" rather than "is", deliberately: … nothing has yet reached this layer to find out. Day 3's N1a grants UPDATE and leaves this absence in place**」—— 但 **N1a 已經跑過而且量到了**：`W10 checklist:139` `[x]`、`W10 progress.md:161` 記錄「raw UPDATE **不報錯但零筆被改**」，`:168-169` 明寫「缺席的 policy 自己撐得住」 | 順路發現的 orphan claim（`AD-SchemaHeaderStale-1` 家族：註解引用一個**已經被關掉**的未決問題）。⛔ **依 Step 0.0 記進 BACKLOG，不當場修** —— 非阻塞、非安全。⭐ 但它對本片是**好消息**：版本表不可變性的 policy 半邊是**量出來的**，不是預測 | 🟡 → BACKLOG |
| **DR7** ⭐⭐ | **`AD-DevDbChecksumDrift-1` 第一次拿到真實數字（五個 phase 以來）**：`isms_dev` 的 `_prisma_migrations` 只有 **17** 筆，head 是 `20260813153153_version_label_key_scoped`（finished 2026-08-13 07:32）；磁碟上有 **22** 個 migration 目錄 ⇒ **落後 5 支**（`soa` · `audit_log` · `attestation` · `polymorphic_parent_guard` · `jurisdiction_and_obligations`）。W12 Day 0 量到的 head 是同一支 —— **兩個 phase 過去，dev DB 一格沒動** | 🔴 直接後果：**`prisma migrate diff` 不得拿 `isms_dev` 當基準**（它落後 5 支，diff 會把五個 phase 的成果報成「待套用」）。改用 `--from-empty --to-schema`（W15 的做法）或以每次重建的 `isms_test` 為準。⭐ 這正是該 AD 從 W11 起要求而四次都沒拿到的證據 | ✅ 已測得，本片第 5 次繞開 |
| **DR8** | `audit-coverage.int.spec.ts:517` 掃 `core-model` 時**排除 `.spec.` 檔**；`:535` 有 `reachable.size > 10` 的反恆真檢查；`:538` 的 `unaudited` 只在 model 出現在 `reachable`（= 有非 spec 檔呼叫 Prisma delegate 寫入）時才成立 | ✅ 確認 plan §3.x：零 repository 的 model 不會讓守衛轉紅。⚠️ 且**本片的 int spec 放在 `core-model/` 也不會誤觸發**（被 `.spec.` 排除）—— checklist 1.1b 的 stub **必須是非 spec 檔**才逼得出紅 | ✅ |
| **DR9** 🔴 | **`AD-UniqueKeyOracle-1` 全面掃描結果**（ROADMAP 4d 的落點）：見下方 §Oracle sweep。結論 —— **今天零個可達的 oracle**，但安全性來自 **GRANT 與「沒有 repository」**，不是來自鍵的設計 | ⇒ 本片兩條新鍵都含 `org_entity_id`，**由設計安全**而非由 GRANT 安全。⚠️ M6 補 repository 那一片，Category D 的既有鍵會同時變成可達 —— 與 `AD-W15ConstraintSurfaceUntested-1` 的解封條件同一天 | ✅ 判準已套用並記錄 |
| **DR10** ⭐ | **`13:33` 與 `permMatrix.js:11` 對「誰能編輯 ISMS profile」正面矛盾** —— `15:101` 定的六角色順序是 `Platform admin · Regional ISO · OpCo admin · Control owner · OpCo OS · Auditor`，據此 `permMatrix.js:11` 的 `['F','E','R','—','R','R']` 讀作 **OpCo admin = Read**；而 `13:33` 明寫「OpCo administrator … **and can edit**」。兩者只在 Platform admin（full）與 OpCo OS（read-only）上一致，且 `permMatrix` 另給 Regional ISO **E**dit 而 `13:33` 完全沒提這個角色 | ⚠️ **不擋本片**：`GRANT` 是資料庫層**能力**，角色限制住在應用層（M6c），而 `Role`/`Permission` 實體本來就被 `02a:71` 擋到 **M4**。但它是 plan D-grant 決策理由（「`13:33` 明說 OpCo admin can edit」）的一個裂縫 ⇒ 該理由改為**「照既有 entity-scoped 可變表的一致形狀」**，不再單獨引用 `13:33` | 🟡 → BACKLOG（M6c 前必須裁決）|
| **DR11** ⭐ | **`Attestation:2226-2236` 帶著一條 plan 沒引用的判準：欄位該用 enum 還是 String，取決於「有沒有外部來源固定這個字彙」** —— 逐字：「inventing a closed list here would be inventing a field (已確認參數 #9)… The difference that decides it: **ISO 27001 fixes the SoA status vocabulary externally**, so W11 was recording a known list rather than authoring one.」收尾句：「**Narrowing it later is one migration; un-inventing a vocabulary the business never agreed to is a conversation.**」 | ✅ **套用結果支持 plan 的四個 enum**：`OfferingBusinessLine` / `OfferingType` / `OfferingApprovalStatus` 的值由 **`13:43` 逐字給出**、`CertificationState` 由 **`13:27` 逐字給出** ⇒ 四者都是**記錄**而非**發明**。⚠️ 且**支持 `ISMSContact.role` 維持 String** —— `13:41` 的「(ISMS lead / certificate recipient)」是括號舉例不是受控字彙，依收尾句取保守側 | ✅ 判準已套用 |
| **DR12** ⭐⭐ | **Prong 3 欄位級比對抓到兩處既有的 schema↔DB 漂移**（`migrate diff --from-config-datasource`（指向剛重建的 `isms_test`）`--to-schema`，`--exit-code` 回 **2 = 非空**）：**(a)** `statements_of_applicability` 的唯一索引名 —— W11 的 `migration.sql:69` 寫了 **67 字元**的 `..._org_entity_id_framework_clause_ref_key`，而 PostgreSQL 的 `NAMEDATALEN` 上限是 **63** ⇒ 實際存成 `..._clause_ref_`（`key` 被靜默吃掉，`pg_indexes` 逐字確認 length=**63**），Prisma 期望的卻是它自己的截斷法 `..._clause__key` ⇒ **永久名稱漂移**；**(b)** `audit_log.prev_hash`/`row_hash` 的預設值表示法（`Bytes([])` vs `'\x'::bytea`）—— Prisma round-trip 的表示差異，功能等價 | 🔴 **直接打在本片身上**：我的 `isms_profile_versions_org_entity_id_isms_profile_id_version_label_key` 是 **69 字元** ⇒ **不明確給 `map:` 就會變成同一個坑的第三例**。⇒ checklist 1.2 / 1.3 加一條：**所有新索引／約束名逐個算長度，> 63 就明確命名**，且 schema 的 `map:` 與 migration 的字面值必須一字不差。⚠️ (a)(b) 兩者都是**既有**漂移、非本片造成 ⇒ 依 Step 0.0 記 BACKLOG（`AD-SchemaMigrationDrift-1` 的第 2、3 個具體實例，第 1 個是 W15 的 `onDelete`）| 🔴 加 checklist 項 + → BACKLOG |
| **D-baselines** | 見下方 §Baselines | 基線已記錄 | ⏳ |

### Oracle sweep（DR9 的完整覆蓋聲明 —— 掃了什麼 / 什麼方法 / 什麼沒掃到）

**方法**：三條獨立路徑，不是一條 pattern ——
(1) `Grep '@@unique'` on `schema.prisma` → **10** 條；
(2) `Grep '@unique'` on `schema.prisma` → **22** 條單欄；
(3) `Grep 'CREATE UNIQUE INDEX'` on `migrations/` → **34** 條（含 2 條 partial，Prisma 表達不了故手寫）。
(3) 是 (1)+(2) 的超集加上 partial index —— **兩條路徑交叉檢查**，非零命中逐處讀。

| 類別 | 內容 | 判準結果 |
|---|---|---|
| **A — `id` 錨定的複合鍵** | `asset_groups` / `assets` / `evidence` / `issues` / `assessment_templates` / `assessment_instances` / `rm_reports` 的 `(id, org_entity_id)`；`rm_report_versions(id, report_id)` | ✅ 安全 —— `id` 伺服器生成，呼叫端無從選（AD 明文豁免）|
| **B — `ref_code`** | 14 張表的 `ref_code` 單欄唯一 | ✅ 安全 —— 伺服器發號（AD 明文豁免）|
| **C — 含 `org_entity_id` 的呼叫端鍵** | `rm_report_versions(report_id, org_entity_id, version_label)`（W10 修法）· `statements_of_applicability(org_entity_id, framework, clause_ref)`（W11 修法）· `extension_fields_entity_key(entity_type, key, org_entity_id)` | ✅ 安全 —— 判準要求的形狀 |
| **D — 呼叫端可給、不含 `org_entity_id`** | `org_entities(code)` · `users(oidc_subject)` · `threats(name)` · `vulnerabilities(name)` · `jurisdictions(code)` · `extension_fields_global_key(entity_type, key) WHERE org_entity_id IS NULL` | ⚠️ **形狀上是 oracle，今天不可達**：前五者 `GRANT SELECT` only（42501 先於約束評估 —— W15 D7 的同一機制）；第六者只涵蓋 `org_entity_id IS NULL` 的**全域**列，而全域列對所有人可見 ⇒ 撞名不洩漏任何實體範疇資訊。⛔ 另 `org_entities` / `users` / `extension_fields` 三者在 W13 已列為「無 repository 寫入路徑」|

**沒掃到的**：⛔ **PRIMARY KEY 未納入本次掃描**（全部是單欄 `id` UUID，伺服器生成 ⇒ 落在豁免 A，
但這是**推論不是逐條讀過**）。⛔ 本掃描只看**索引定義**，未驗證「呼叫端真的能給這些欄位」——
那需要讀每個 DTO，而本片零端點、零 DTO，所以今天無法也不必驗。

### Prong 覆蓋

- **Prong 1（path）**: 10 個路徑 + 5 個 model 名 + `CH-034` 前向引用 → **0 漂移**
- **Prong 1b（AD registry）**: 20 條 AD 逐條對 `BACKLOG.md` → **20/20 命中**，1 個計數漂移（DR1）
- **Prong 2（content）**: 9 個 D-項 → **3 個改 plan/checklist 的漂移**（DR2 / DR3 / DR5）+ 1 個順路發現（DR6）
- **Prong 2.5（child tree）**: **N/A** —— 零前端
- **Prong 3（schema）**: `_prisma_migrations` **直接查詢**（不是 int suite 訊息）→ **DR7，本 AD 五個 phase 來第一個真實數字**

> ⚠️ **ID 命名**：Day-0 漂移用 **`DR{n}`**，plan §3.1 的裁決用 **`D{n}`**。
> 兩套原本都叫 `D{n}` —— W15 的記憶檔已經因此難讀（「Day 0 的 D7」vs「D1–D5 決策點」），
> 而本片是 15 個裁決 × 9 個漂移，衝突會更嚴重。趁只有 6 處引用時改掉。

### Baselines（十三項各自取 exit code —— `AD-PartialGateReportedAsFull-1`）

| # | Gate | 結果 | vs W15 closeout |
|---|------|------|----------------|
| 1 | `format:check` api | EXIT=0 | ✅ |
| 2 | `format:check` web | EXIT=0 | ✅ |
| 3 | `lint` api+web | EXIT=0 | ✅ |
| 4 | `type-check` api+web | EXIT=0 | ✅ |
| 5 | `build` api | EXIT=0 | ✅ |
| 6 | `build` web | EXIT=0 | ✅ |
| 7 | `lint:negative` | EXIT=0 | ✅ |
| 8 | api unit | **480 passed / 40 suites** | ✅ 逐位相符 |
| 9 | **api int** | **225 passed / 18 suites**（127.8 s）| ✅ 逐位相符 |
| 10 | web unit | **10 passed / 1 file** | ✅ 逐位相符 |
| 11 | coverage | **92.14 / 91.77 / 98.98 / 93.56** | ✅ 逐位相符 |
| 12 | `run_all.py` | **8 / 8** | ✅ |
| 13 | `check_entity_index` | **25 / 35** | ✅ |

⚠️ **1.1a 不在此處打勾** —— 本次 int 是**整體** 225 全綠，我**沒有**單獨擷取
`allowlist still matches the write surface` 那一條的輸出。checklist 1.1a 的 DoD 要求
「記下綠的條數」，Day 1 加表**之前**單獨跑一次才算數。
（`AD-PartialGateReportedAsFull-1` 的形狀：整體綠不等於我觀察了那一條。）

### 時間記錄

| 區段 | 起 | 迄 | 實際 | 量法 |
|---|---|---|---|---|
| plan + checklist 起草（含使用者三次裁定往返）| — | — | **~95 min** | ⚠️ **估算**，非量測 —— 起草在第一次 `date -u` 之前，無時間戳。基準是本 session 的工具序列長度 |
| 三-prong verify（含 branch + 13 項 baseline）| `09:39:56Z` | `09:54:32Z` | **14.6 min** | ✅ **量測** —— `date -u` 兩次 |
| **Day 0 合計** | | | **~110 min** | 混合 |

⛔ **誠實標註**：起草那一段是估算。plan §7 宣告的量法是「含起草」，
而**起草開始時我沒有蓋時間戳** —— 這是 `AD-CalibrationNoTimeRecord-1` 警告的同一個坑，
只是這次它只吃掉一段而不是全部。**Day 1 起每個任務前後各蓋一次 `date -u`**。

### Go / No-Go

**範圍變動**: **< 10%** → ✅ **繼續 Day 1**

理由逐條：
- **無** acceptance criteria 變動（§5 十三條原樣成立）
- **無** File Change List 變動（§4 十四列原樣成立）
- **無** 新增／移除實體或欄位 —— 五張表、10 個 agreed-field 欄位、4 個 enum 全部不變
- 三個改 plan 的漂移（DR3 / DR4 / DR5）都是**把「待決定」換成「已量測」**，
  以及補上一行 `FORCE` —— 方向是收斂不是擴張
- DR6 / DR10 是**兩條新 AD**（順路發現），依 Step 0.0 記錄不當場做
- 唯一對工作量的實質影響：DR5 把 policy 數釘在 **14 條**，而 §7 的 migration 估時
  （1.6 hr）是在不知道這個數字時給的 ⇒ **已記入 §8 Risks，不調承諾**（單點不調，
  matrix §何時調整需 3 點移動證據）

Day 0 commit：`af48f5a`（author date `2026-08-16T17:59:33+08:00`）

---

## Day 1 — 2026-08-16 — Schema + migration

### Today's Accomplishments

| Task | 起 | 迄 | 實際 | 備註 |
|---|---|---|---|---|
| 1.1a + 1.1b（漂移守衛非恆真證明）| `09:59:33Z` | `10:08:07Z` | **8.6 min** | 含兩次錯誤的 verify 指令，見下 |

### Issues / Discoveries

**D1-1 ⭐ checklist 1.1a 的 Verify 指令在綠燈時證明不了任何事。**
原文是 `npm run test:int … | grep -A3 "allowlist still matches"`。jest 的預設 reporter
**只印失敗與摘要**，通過的測試名不會出現在輸出裡 ⇒ 全綠時該 grep **必然零命中**，
而零命中看起來跟「測試不存在」一模一樣。實測輸出檔大小 **15 bytes**（只有我自己 echo 的分隔線）。
⇒ 改用 `npx jest --config jest.int.config.js -t "<測試名>" --verbose`，它會逐條印出名稱與狀態。
**這與 `AD-VacuousScopeTest-1` 同族，只是發生在驗證指令而不是測試本身**：
一條在成功時不產出證據的驗證指令，跟沒有驗證是同一回事。

**D1-2 ⭐ `ISMSProfile` 的 Prisma delegate 是 `iSMSProfile`。**
守衛 `:531` 只把首字母轉大寫（註解自己舉例 `rMReportVersion -> RMReportVersion`），
既有 `rm-report.repository.ts:161,192` 逐字證實 `client.rMReportVersion`。
⛔ **model 名不能為此改成 `IsmsProfile`** —— `check_entity_index.py` 要對上 `02a:60` 的字面 `ISMSProfile`。
⇒ M6c 寫 repository 時 delegate 就是 `client.iSMSProfile`，先記下來。

**D1-3 守衛完全不碰 Prisma client 或 schema**（`:516-531` 逐行讀）：
`readdirSync(core-model)` → 排除 `.spec.` → regex `client\.(\w+)\.(WRITE_OPS)\(` → 首字母轉大寫。
⇒ 1.1b **不需要等 model 存在**就能做，且這比 W15 的做法（先建 model 再加 stub）更能隔離變因。

### 1.1a — 加表之前的基線（測量，非推論）

```
npx jest --config jest.int.config.js -t "allowlist still matches the write surface" --verbose
→ Test Suites: 17 skipped, 1 passed, 1 of 18 total
   Tests:       224 skipped, 1 passed, 225 total
```
⇒ 該測試**存在、名稱唯一、通過**。

### 1.1b — 中性化：預測寫在執行之前

**預測**（執行前寫下）：守衛在 `expect(unaudited).toEqual([])` 失敗，received `["ISMSProfile"]`；
`unreachable` 與 `shouldBeAudited` 兩條斷言**到不了**；audit-coverage 內其餘 14 條逐模型守衛
**一條不動** ⇒ **恰好 1 紅**。

**實測**：

| 預測 | 實際 | 命中 |
|---|---|---|
| 失敗點 `expect(unaudited).toEqual([])` | `audit-coverage.int.spec.ts:543:23` | ✅ |
| received `["ISMSProfile"]` | `+ Array [ + "ISMSProfile", + ]` | ✅ |
| 落在 `unaudited` 側而非 `unreachable` | 是（`:543` 而非 `:544`）| ✅ |
| 恰好 1 紅 | `Tests: 1 failed, 224 skipped, 225 total` | ✅ |

⭐ **附帶再次量到**：stub **無人 import、且刻意不 type-check**（`ISMSProfile` 當時還不在
Prisma client 裡），仍被偵測 ⇒ 守衛讀的是**文字**不是 build graph（W15 同一結論，
本次在「model 根本不存在」的更強條件下重現）。

⛔ stub 已於驗證後**立即刪除**，`git status --porcelain` 空、`core-model/` 無 `isms-*` 檔。

### 1.2 – 1.4 — schema · migration · 文件

| Task | 起 | 迄 | 實際 |
|---|---|---|---|
| 1.2 schema（5 model / 4 enum / 10 欄位 / header）| `10:08:07Z` | `10:14:14Z` | **6.1 min** |
| 1.3 migration（手寫 + generate + 套用 + 驗證）| `10:14:14Z` | `10:19:30Z` | **5.3 min** |
| 1.4 `02a` 索引 + `13` 實作記錄 | `10:16:33Z` | `10:20:00Z` | **3.5 min**（與 1.3 的套用等待重疊）|
| 1.x partial gate | `10:20:00Z` | `10:20:54Z` | **0.9 min** |
| **Day 1 合計** | `09:59:33Z` | `10:20:54Z` | **21.4 min**（量測）|

### 我自己的兩個疏漏（在 gate 之前被 diff 抓到，不是被 gate 抓到）

**D1-5 🔴 `isms_profiles.owner_user_id` 的 `onDelete` 我寫成隱式。**
產生的 DDL 是 `ON DELETE SET NULL` —— 因為 Prisma 對 **optional** relation 的預設是 `SetNull`，
而這正是 W15 補 `OrgEntity.jurisdiction` 時記錄的那條教訓，且我自己的 checklist DoD 就寫著
「`onDelete` **全部顯式**」。⇒ 已補為顯式 `SetNull`，並把**範圍講清楚**：
只有 **optional** relation 需要顯式（required 的 Prisma 預設 `Restrict` 本來就與 migration 一致），
那才是 W15 教訓的準確邊界。
⚠️ **抓到它的是 `migrate diff` 的輸出，不是任何 gate** —— 本 repo 沒有任何測試斷言 ON DELETE。

**D1-6 ⭐ `ISMSContact.user` 用 `Restrict` 而非 `SetNull`，理由是機械性的。**
`SetNull` 會把 `user_id` 清空，而該列的 `name` 可能也是 NULL ⇒ 撞上我同一支 migration 加的
`CHECK (user_id IS NOT NULL OR name IS NOT NULL)`。刪除仍會失敗，但錯誤會顯示成
「一張沒人在動的表上的約束違反」。`Restrict` 把同一條規則寫在讀得到的地方。

### D1-4 ⚠️ 這個 schema 有兩種時間慣例，而宣稱「對齊」的那句註解已經不成立

`RMReportVersion:1817-1818` 寫「Timestamptz, matching Issue.dueDate and
ControlTest.scheduledFor. **A second temporal convention for one column would be the
invention, not the alignment.**」—— 但 `Risk.reviewDue`（W05）與 `Regulation.effectiveDate`（W15）
**都是 `@db.Date`**。⇒ 兩種慣例並存。本片的六個日期欄位取 `@db.Date`：憑證的發證／到期是
**日曆事實**，帶時區的瞬間是這份資料沒有的精度。理由寫進 schema docstring，**不改那句舊註解**
（不是我的，且它記錄的是當時的判斷）→ BACKLOG。

### 1.2 – 1.4 驗證（逐條，皆為實測輸出）

| DoD | 證據 |
|---|---|
| 五個 model 合法 | `prisma validate` → `The schema at prisma\schema.prisma is valid 🚀` |
| 10 個 agreed-field 欄位 | grep 得 11 行，**逐處讀**後確認第 11 行是 enum 的 `@@map("certification_state")` ⇒ 欄位**恰好 10** |
| 🔴 `posture` 不存在 | 全 schema 3 個命中，**全部在註解**（MHist + RECORDED DEVIATION 段）⇒ 欄位 **0** |
| 🔴 索引名 ≤ 63（DR12）| 實際 DB `pg_indexes`：最長 **50**；`length>=63` 的筆數 **0**。`map:` 把 69 壓到 50 |
| header 數字可重現 | header 說 `31 models`；`grep -c '^model'` 給 **31** ⇒ 相符 |
| 四個 enum 三份真相 | DB catalog ✅ · `schema.prisma` ✅ · generated client 含 `'proposed'`/`'suspended'`/`'withdrawn'` ✅ |
| RLS ENABLE **+ FORCE**（DR3）| `pg_class`：五張表全部 `rls=true force=true` |
| policy 條數（DR5 預測 14）| `pg_policies`：3+3+3+3+**2** = **14**，版本表恰為 `[INSERT,SELECT]` |
| GRANT 三層（DR4）| `role_table_grants`：四張 `{INSERT,SELECT,UPDATE}`、版本表 `{INSERT,SELECT}` |
| CHECK | `isms_contacts_identifies_someone :: CHECK ((user_id IS NOT NULL) OR (name IS NOT NULL))` |
| 四條複合 FK | `pg_constraint` 逐條列出四個 `%_isms_profile_id_org_entity_id_fkey` |
| ⭐ **不得新增漂移** | `migrate diff` 殘留**恰好是 Day-0 的兩處既有項**（`audit_log` bytea · SoA 索引名），**五張新表一處未出現** |
| migration 套用 | int suite **225 passed / 18 suites**（與基線逐位相同，零回歸）|
| `check_entity_index` | **30 / 36**（分子 +5、分母 +1）|
| 1.x partial gate | `format:check` api **0** · `lint` api **0** · `type-check` api **0** · `prisma validate` **0** |

⛔ **Prisma 產生的 delta 含兩處不屬於本片的變更**（`audit_log` 的 bytea 預設、SoA 索引改名）——
依 Step 0.0 **未放進本片的 migration**。它們是 DR12，去向是 BACKLOG。

### Remaining for Next Day

- Day 2：seed（五張表跨兩實體）· int spec（9 組測試）· 三次中性化（N1 / N2 / N3a / N3b）

---

## Day 2 — 2026-08-16 — Seed + integration spec + 中性化

### 2.2 int spec — 一次量測，一個修正

10 條測試，**第一次跑 9 綠 1 紅**。紅的是測試 10（GRANT catalog 斷言），
而失敗原因與 GRANT 無關：`information_schema` 把這些欄位暴露為 **`sql_identifier` domain**，
node-pg 沒有對應的 parser ⇒ `array_agg` 回來的是字串 `'{INSERT,SELECT,UPDATE}'` 而不是陣列，
`toEqual` 因此在一組**其實正確**的權限上失敗。修法是兩個投影欄位都加 `::text`。

⭐ 值得記下來的是**這個錯誤的方向**：它讓一條正確的斷言變紅，而不是讓一條錯誤的斷言變綠。
測試 3 沒事，因為 `pg_policies.cmd` 本來就是 `text`。

⚠️ 另外預先移除了一個**跨機器的脆弱點**：測試 3 / 10 原本依賴 SQL 的 `ORDER BY 1`，
而 `isms_profile_versions` 與 `isms_profiles` 的先後**依 collation 而反**
（C locale 下 `_`(0x5F) < `s`(0x73)；en_US.UTF-8 在主層級忽略標點 ⇒ 順序相反）。
改為在 JS 端排序後比對，與 collation 無關。

### 2.3 中性化 —— 四個預測，寫在執行之前

⛔ **原 N2 是恆真的，在寫下來的當下被發現。** 原案是「拿掉版本表唯一鍵裡的 `org_entity_id`」，
但複合 FK `(isms_profile_id, org_entity_id) → isms_profiles(id, org_entity_id)` **已經強迫
`isms_profile_id` 決定 `org_entity_id`** ⇒ `(isms_profile_id, version_label)` 本來就按實體隔離，
拿掉不會產生 oracle。跑它會得到「零轉紅」，而**零轉紅看起來像是中性化沒做對，
而不是這個實驗問錯了問題**。
（這與 `AD-UniqueKeyOracle-1` 對 W10 的描述一致：該欄對合法列**完全冗餘**。）
⇒ 真正承重的是**父表**的鍵，N2 改打那裡。

| # | 動作 | 預期紅的**形狀**（機制 + 檔案 + 條數）|
|---|---|---|
| **N1** | `isms_sites` 的複合 FK 換成單欄 FK → `isms_profiles(id)` | **恰好 1 紅：測試 4**。形狀 = 「預期 rejects 卻 resolved」——(SG1, HK1_PROFILE) 在單欄 FK 下合法 ⇒ INSERT 成功。⚠️ **測試 5 必須維持綠**（`NOWHERE` 仍不是任何 profile ⇒ 23503）；若測試 5 也紅，代表我拆掉的不只是複合性 |
| **N2** | `isms_profiles` 的 `@@unique([orgEntityId, profileYear])` → `@@unique([profileYear])` | **恰好 1 紅：測試 6**。形狀 = 在 **(a) 那一筆**（SG1 取 2099）拋 **23505**，而該筆原本預期**成功** ⇒ 失敗訊息是未預期的 rejection，不是斷言不符。⭐ 這就是 oracle 本身：SG1 因此能一年一猜列舉 HK1 有哪些年度 |
| **N3a** | 只加 `GRANT UPDATE ON isms_profile_versions`，**policy 仍缺席** | **恰好 1 紅：測試 9**。形狀 = 「預期 rejects 卻 resolved」，**且 `rowCount = 0`**（不報錯、零筆被改）。這是 W10 N1a 在**另一張表**上的移轉檢查 |
| **N3b** | N3a **再加上** `isms_profile_versions_update` policy | 仍是**測試 9 紅**、同樣 resolved，**但 `rowCount = 1` 且該列真的被改寫** ⇒ 兩層都拿掉才失去不可變性 ⇒ **兩層都承重** |

**共通預期**：四次實驗中，其餘 9 條測試與其他 18 個 suite **一條不動**。

**執行順序**（`--listTests`，`AD-JestFileOrder-1`）：本檔排 **#17**，
`rls-direct` #18、`jurisdiction` #19。⚠️ **這是列舉順序，不必然等於執行順序** ——
W15 已標註過同一件事。但本片四個實驗只牽動**同一檔內**的測試，而**檔內順序是宣告順序、
是確定的**，所以這個不確定性不影響預測。⛔ 執行時**保留失敗身分**，不要只留計數行。

**基線（中性化之前）**：int **235 passed / 19 suites**（基線 225/18，+10 測試 +1 suite —— 恰為本片新增）。
