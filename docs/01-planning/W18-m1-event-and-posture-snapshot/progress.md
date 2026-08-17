# Phase W18 Progress

**Phase**: W18 — M1 slice 13: `Event` + `posture_snapshot`

---

## Day 0 — 2026-08-17

### ⏱️ Calibration T0

**T0 = `2026-08-17T02:47:33Z`**（local 10:47:33）

⭐ **蓋在讀第一個檔案之前** —— 這是 W17 retrospective 指定的改進。
W16 的 T0 蓋在動 plan 之前、W17 蓋在動 checklist 之前，兩次都讓**起草段落在量測窗口之外**，
所以 W17 的 `actual ~2.5 hr` 是**下限**、`ratio 0.78` 是偏低的估計。

本片的窗口從**規格都還沒讀**的這一刻開始，所以分子第一次涵蓋整段工作。

⚠️ 量法宣告（`AD-CalibrationNoTimeRecord-1` 要求）：
逐段量測，每個 commit 的 author date 為段界，T0 至首個 commit 為第一段。
間隙 > 30 min 的視為中斷，在此逐條列出並說明是否計入。

### 起草前的既知狀態

- `main` = `fd6472a`，工作樹 clean，只有 `main` 一個分支
- `run_all` **9/9**（`sha-anchors` 自 CH-036 起為常設 gate）
- 實體索引 **32 / 36** —— 本片目標 **34 / 36**
- M1 其餘 4 張表中，`AccessRequest` / `AccessReviewCampaign` **不在本片**：
  `02a:325` 的 `org_entity_id` nullable 與約束 8 鐵律 1 直接衝突，需使用者裁決（slice 14）

---

### Plan 核可

使用者於 2026-08-17 核可 plan（`status: draft` → `active`），指示「可以開始執行 W18」。
分支 `feature/W18-event-and-posture-snapshot` 自 `main` `fd6472a` 開出。

---

## Day 0 — Drift Findings

> 三-prong 程序見 `docs/rules-on-demand/day0-plan-verify.md`。
> ⛔ 鐵律：**不默改 plan §Technical Spec** —— 需要改的寫進 §Risks，保留審計軌跡。

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | ⭐ **plan §3.x 對 `Event.status` 的第一個理由是錯的。** plan 寫「不在 `02a:233` 的欄位清單上」—— 但 `02a:157` 明文 *"Only entity-specific fields are shown; every entity also carries the §1.1 base fields"*，而 `status` 是 §1.1 base field（`02a:93`）。§3 的每一行**都只列 entity-specific 欄位**，所以「不在那一行上」對任何 base field 都成立，不構成理由 | 省略 `status` 的理由收斂成**單一條且等級是 JUDGEMENT**：`02a:417` 給 Event **5 態**（Reported → Triaged → Investigating → Resolved → Closed），`11:45-58` 的 mermaid 給 **8 個具名狀態**，共通只有 4 個，**從未裁決**。⚠️ 與 `Attestation` 的 `status` 省略（`schema.prisma:2228-2235`）同族但**理由相反**：那裡是「§4 沒給它 lifecycle」，這裡是「§4 給了，而另一份權威給了不相容的另一份」 | 🔴 **改 plan §Risks**（已加） |
| **D2** | `events` 的 base-field 信封 = `attestations` + `legal_holds` 的**同一個信封**，逐欄相同：`id` · `ref_code` · `org_entity_id` · `created_by` · `updated_by` · `version` · `extensions` · `created_at` · `updated_at` · `retired_at`。三者共同省略 `status` · `owner_user_id` · `is_active` | §3.1 欄位數定案 = 6 domain + `org_entity_id` + 9 個 base 欄位。`owner_user_id` 省略理由沿用 `schema.prisma:303-305`（M4 之前無指派路徑）；`is_active` 沿用 `:306-308`（**零張表實作**，`AD-IsActiveNeverBuilt-1`）| ✅ 無變動 |
| **D3** | ⭐⭐ **`posture_snapshots` 不帶 `ref_code` / `version` / `updated_at` / `updated_by` / `retired_at` / `extensions`，而先例是 `AuditLog` 不是 `Attestation`。** `schema.prisma:2063-2065`：*"Audit rows are read as a chain, never cited individually, and a ref_code counter is one more write on the hottest path"*；`:2067-2072`：*"⛔ A `retired_at` on an append-only trail IS A REDACTION MECHANISM"* | 三個理由**逐條命中快照**：排程 job 批次寫入（13 OpCo × 9 metric = 每期 117 列，全部在同一個 job 裡）· 讀的是矩陣從不個別引用 · `02a:475` 明文 append-only ⇒ `retired_at` 會是 redaction。⭐ **`02a:465-473` 的 7 欄清單與這個推論獨立地同意** —— 兩條路徑得到同一個答案 | ✅ 強化理由 |
| **D4** | `PostureSnapshot` **需要** ALIAS；`Event` **不需要**。`check_entity_index.py:187` 是三元組交集 `{model, table, ALIASES.get(model)}` ∩ `indexed`，**無 snake_case 轉換、無單複數規則、無 case folding**（`:22-27` 明說「no rule connecting them」）| `PostureSnapshot`/`posture_snapshots` 皆 ≠ `posture_snapshot`（`02a:42` 的字面）⇒ 不加 ALIAS 則 detector **FAIL**。與 W17 `RetentionPolicy` 同構，照抄 `:87-93` 的註解形狀。`Event` 的 model 名直接命中 `02a:38` 的 `Event` | ✅ plan §4 已列 |
| **D5** | audit guard 從 **`core-model/*.ts` 的 `client.X.<write>(` 呼叫點**導出寫入面（`audit-coverage.int.spec.ts:516-531`），**不是**從 Prisma DMMF。零 repository 的 model 不進 `delegates` ⇒ 三個斷言（`:543-545`）全部通過 | 兩表**不進** `AUDITED_MODELS`，且這不是豁免是結構結果。既有先例 **10 個**（W15 三表 · W16 五表 · W17 兩表）零 repository 且 guard 綠。⭐ 理由要寫成 **42501 grant 測試**而非清單條目 —— `retention-and-hold.int.spec.ts:119-122` 與 `jurisdiction.int.spec.ts:197-201` 的形狀 | ✅ 無變動 |
| **D6** | `08` 的 RAG 字面**自相分歧**：`:35` 表頭是 `Green / Amber / Red`，`:45` 的規則散文是 `red / amber / green`。`02a:472` 只說 "derived band at capture time"，**沒有給值域** | ⇒ 規格**沒有**權威字面，改由專案慣例決定：`schema.prisma` 的 **33 個 enum 全部小寫 snake_case，零例外** ⇒ `enum PostureRag { green amber red }` | ✅ 已定案 |
| **D7** | ⚠️ **`EventSeverity` 的字面需要一個判斷。** `11:37-39` 的字面是 **`S1` / `S2` / `S3`**（大寫），而 33/33 個既有 enum 全小寫 —— 且 **`CiaType { c i a ci }`（`schema.prisma:473`）是把大寫縮寫小寫化的直接先例**（CIA → c/i/a），`AssetCategory.physical_and_virtual` 是第二個 | 🟡 **我的決定，標為可推翻**：採 **`{ s1 s2 s3 }`** + `@@map("event_severity")`。理由：使用者裁決的實質是**三級值域**（S1/S2/S3 三個等級與其 SLA），不是字面大小寫；資料層小寫、UI 顯示由 i18n 層負責（guardrail 9）。⛔ 已在本輪回報中向使用者明確標出，可即時推翻 | 🟡 **待使用者確認**（不阻塞）|
| **D8** | `AD-UniqueKeyOracle-1` 判準（`BACKLOG.md:268` 原文）：**「這個 tuple 是呼叫端給的嗎 —— 是 → `org_entity_id` 必須在鍵裡」**。⭐ 該條同時記載失敗模式的描述被 W11 修正過：**正確判準是「兩個可分辨的結果」，成功也算一個**，不是「兩個不同的 SQLSTATE」 | `(org_entity_id, period, metric_key)`：`period` 與 `metric_key` **都來自呼叫端**（排程 job 傳入）⇒ 判準觸發 ⇒ `org_entity_id` 必須在鍵裡 ⇒ **本片的鍵設計正確**。⭐ 這是該條的**第 4 個資料點、第 2 個正面的**。⛔ 中性化 N4 因此要改設計：不是「刪 unique」，而是**「把 `org_entity_id` 從鍵裡拿掉」**，證明 oracle 出現（W16 N2b 先例）| 🟡 **改 N4 設計** |
| **D9** | `apps/api/package.json:19` 的 `prisma:migrate` = **`prisma migrate dev`** —— 正是 `AD-DevDbChecksumDrift-1` 擋住的那個子指令。W17 Day 1 用 **`migrate deploy`** 一次把 `isms_dev` 從 17/23 補到 24/24 | checklist 1.2 的 Verify 指令**不能照抄 plan** —— 改用 `npx prisma migrate deploy`。migration **手寫**（自 W11 起的常態）。⚠️ 這是該 AD 的第 7 次相關接觸，但**不是第 7 次繞開** —— W17 已證明 `deploy` 可用 | 🟡 **改 Verify 指令** |
| **D10** | `apps/api/package.json` **無 `prisma:format` script**（只有 `prisma:generate` / `prisma:migrate`）| checklist 1.1 的 Verify 改用 `npx prisma format` / `npx prisma validate` | 🟢 小調整 |
| **D11** | 🟡 **順路發現（不當場修）**：`audit.module.ts:48-57` 的註解說 *"grep -c '^model' → **23**"* 且 *"⛔ FIVE MODELS ARE ABSENT: OrgEntity, User, ExtensionField, Threat, Vulnerability"* —— 實際今天是 **33 models、17 個無寫入路徑**。AP-7 orphan claim 形狀 | ⛔ **不當場修**（Step 0.0 節流閘：順路發現 → 記 BACKLOG）。⚠️ 本片加 2 個 model 會讓它更陳舊（33 → 35）⇒ closeout 時記進 BACKLOG 為新 AD | 🟢 記 BACKLOG |
| **D-baselines** | api unit **480 / 40 suites** ✅ · branches **91.77** ✅ · funcs **98.98** ✅ · lines **93.57** ✅（三者自 `coverage/clover.xml:4` 逐位算出：`725/790` · `195/197` · `1149/1228`）· `run_all` **9 / 9** ✅ · `check_entity_index` **32 / 36** ✅ | ⚠️ **stmts 92.14 未被本次證實** —— 我用 `tail -30` 跑 unit，把 coverage 的 `All files` 行截掉了（`AD-PartialGateReportedAsFull-1` 的形狀），clover 沒有直接對應 jest `statements` 的欄位。**如實記為未驗證**，Day 4 final sweep 取完整輸出。api int **248 / 20 suites** ✅（`[int] isms_test rebuilt, migrated and seeded`，192.8 s）| 🟡 **1 項未驗** |

### Prong 1 — Path verify

| 目標 | 期望 | 實際 |
|---|---|---|
| `migrations/<ts>_event_and_posture_snapshot/` | 不存在 | ✅ 24 個 migration，無此名 |
| `core-model/event-and-posture.int.spec.ts` | 不存在 | ✅ core-model 下 42 檔，無此名 |
| `CH-037` | 未被佔用 | ✅ 最大號 `CH-036`（資料夾形式）|
| `schema.prisma` · `test/int-global-setup.js` · `check_entity_index.py` | 存在 | ✅ 三者皆在 |

### Prong 3 — Schema verify

`Grep "model Event|PostureSnapshot|posture_snapshot|event_id|eventId"` 於 `apps/api` ⇒ **零命中**。
⇒ 兩表確實從未建過，且**沒有任何既有表帶反向 FK 欄位**（plan §0 的宣稱成立）。

### Go / No-Go

**GO。** 範圍變動 **≈ 0%** —— 11 條 drift 沒有一條改變交付物清單：
D1 / D3 / D8 是**論證強化或修正**（同樣的欄位、更硬的理由）、D4 / D9 / D10 是**指令與一行 ALIAS**、
D11 是記錄項。唯一待確認的 D7 是一個 enum 的大小寫，**不阻塞 Day 1**。

⭐ **本次 Day-0 的最高價值產出是 D1 與 D3** —— 兩者都不是「plan 漏了什麼」，
而是「plan 給的理由撐不住／不夠硬」。D1 若沒抓到，`Event.status` 的省略會用一個
**對任何 base field 都成立**的假理由寫進 migration banner，成為下一個 phase 抄襲的模板。

---

## Day 1 — 2026-08-17 — schema + migration + seed + int spec

### 交付

| 檔案 | 動作 | 內容 |
|---|---|---|
| `apps/api/prisma/schema.prisma` | EDIT | 3 enum + 2 model + `OrgEntity` 兩個反向關聯 |
| `apps/api/prisma/migrations/20260817033944_event_and_posture_snapshot/migration.sql` | NEW | 3 enum · 2 表 · 3 index · 2 FK · RLS ENABLE+FORCE ×2 · **4 條 policy** · 2 GRANT · 2 COMMENT |
| `apps/api/test/int-global-setup.js` | EDIT | seed 3 events + 5 posture snapshots + 2 個計數守衛 |
| `apps/api/src/core-model/event-and-posture.int.spec.ts` | NEW | **17 個測試** |
| `scripts/lint/check_entity_index.py` | EDIT | +1 ALIAS（`PostureSnapshot` → `posture_snapshot`）|
| `docs/02-architecture/02a-data-model-spec.md` | EDIT | ⚠️ **偏離 plan §4 的 UNTOUCHED**，見 D13 |

### 新的 drift / 發現

| ID | Finding | 處置 |
|----|---------|------|
| **D12** | ⚠️ **`prisma format` 順帶重排了 11 行既有內容** —— `StatementOfApplicability:2011` · `Attestation:2285-2286` · `ISMSProfile` 的四個 `@db.Date` 欄位對齊，加 4 個空行。全部**與本片無關** | **保留，不還原**。那是 formatter 的**確定性輸出**（任何人跑同一指令都得到它），不是品味編輯 —— 還原它等於維持一個已知的不一致狀態，並讓下一個 phase 再撞一次（`AD-DevDbChecksumDrift-1` 那種「每次繞開都很便宜」的形狀）。⇒ 新 AD：**schema 沒有 format gate**，提議把 `prisma format --check` 加進 lint（另開 CH，本片不做 —— 節流閘）|
| **D13** | ⭐ **plan §4 把 `02a` 標成 UNTOUCHED，那個標記過度了。** 它對「不需新增索引列」是對的，對「列的內容」是錯的：`02a:42` 的 note 寫著 *"the table is not built yet"*，本片建了它之後那句話就是 **AP-7 orphan claim** | 改該列的**事實陳述**（已建 / 未建），不動設計內容；residency 五欄未建的資訊保留。⚠️ 這是對 plan §4 的偏離，記在此處而非默默做掉 |
| **D14** | ⚠️ **`loss_amount` 有第二個獨立的不可用理由，plan 只記了一個。** plan 記「今天永遠 NULL」（AP-3）；Day 1 讀 `02a:233` 時發現**沒有幣別欄位**，而 13 OpCo 跨 11 管轄區不共用幣別 ⇒ **就算 M6 開始寫入，那個數字仍然無法解讀** | 兩個理由都寫進 schema docstring 與 migration banner。新 AD `AD-LossAmountNoCurrency-1`。⛔ **不自行補 currency 欄位** —— `02a` 沒有它，補了就是自行發明欄位（已確認參數 #9）|
| **D15** | 🔴 **我的第一版測試 3 預測錯了排序** —— 它用 `ORDER BY ref_code` 並預測 `s2,s1,s3`，資料庫回 `s3,s2,s1`（`EVT-HK1` 字典序在 `EVT-SG1` 之前）| 改成 **JS sort + 集合斷言**。⭐ 真正的教訓不是預測錯，是**這個斷言本來就不該依賴 SQL 排序**：W17 test 1 的註解已記過 collation 決定標點怎麼排，而測試要證明的是「三個值都可達」——那是集合。**第一次跑就抓到，這是測試在做它該做的事** |

### Gate（逐項實際輸出，非「都過了」）

| Gate | 結果 |
|---|---|
| `npx prisma validate` | ✅ `The schema at apps\api\prisma\schema.prisma is valid 🚀` |
| `format:check -w apps/api` | ✅ `All matched files use Prettier code style!` |
| `lint -w apps/api` | ✅ EXIT=0 |
| `type-check -w apps/api` | ✅ EXIT=0 |
| `build -w apps/api` | ✅ EXIT=0 |
| `lint -w apps/web` · `type-check -w apps/web` | ✅ EXIT=0 · EXIT=0 |
| `test -w apps/web` | ✅ **10 passed / 1 file** |
| `test:cov -w apps/api` | ✅ **480 passed / 40 suites** · coverage **92.14 / 91.77 / 98.98 / 93.56** —— ⭐ **四項逐位等於 baseline**，且 **Day-0 標為未驗的 stmts 92.14 在此補齊**（這次用落檔 + Grep 取 `All files`，不再用 `tail` 截斷）。⚠️ 小修正：Day-0 我從 clover 算出 lines 93.57，jest 報 **93.56**（捨入差）—— 以 jest 為準 |
| `lint:negative`（root） | ✅ `boundaries/dependencies rejected audit-trail -> core-model` · `60 file(s) scanned, 0 bypasses` |
| `run_all.py` | ✅ **9 / 9** |
| `check_entity_index.py` | ✅ **34 / 36**（models 33 → 35）—— **AC-1 達成** |
| `test:int -w apps/api` | ✅ **265 passed / 21 suites**（248 baseline + **17 新**），227.4 s。⚠️ 第一輪是 **264 / 265** —— 測試 3 依 D15 修正後重跑 |

---

## Day 3 — 2026-08-17 — 中性化預測（⛔ 寫在執行之前，本段先 commit）

⚠️ **這一段的 commit 必須早於任何中性化的執行。** 事後寫的預測不是預測 ——
它只證明我能解釋已經發生的事。以下五條在**一次也還沒跑**的狀態下寫成。

基線：**265 passed / 21 suites**。每次只改一處，跑完整 int suite，然後復原。

| # | 改動 | 預測轉紅 | 預測的紅**長什麼樣** |
|---|------|---------|---------------------|
| **N1** | 刪 `events_insert` policy | **恰 1 個**：測試 6 | 有 `GRANT INSERT` 但無 policy ⇒ PostgreSQL 拋 `new row violates row-level security policy`（**42501**）。測試 6 的 query 直接 reject，`expect(rowCount).toBe(1)` 走不到。⭐ **測試 5 必須仍綠** —— 缺席的 policy 也會拒絕跨實體寫入，兩者觀察不出差別。**那正是 W17 的 N4 零轉紅的原因，本片補了測試 6 才有這一格** |
| **N2** | 刪 `posture_snapshots` 的 `FORCE`（保留 `ENABLE`）| **恰 1 個**：測試 8 | `relforcerowsecurity` 由 `true` 變 `false` ⇒ `toEqual({rls:true, forced:true})` 失敗。⚠️ 測試 10 / 14 用 owner 連線且**不會**因此轉紅 —— 它們今天能讀到兩個實體，代表該角色本來就繞過 RLS（superuser／BYPASSRLS），所以 FORCE 對它們無作用。**這個預測若錯，錯的是我對那條連線的理解，不是測試** |
| **N3** | 加回 `GRANT UPDATE ON events` | **恰 2 個**：測試 7、測試 17 | 測試 17 是 `toEqual(['INSERT','SELECT'])` ⇒ 直接不符。測試 7 更有意思：有 GRANT 但**沒有 `FOR UPDATE` policy** ⇒ 依 W10 N1a / W16 N3a 的實測，UPDATE **不拋錯**、影響 0 列 ⇒ 期待 reject 的斷言收到 resolve ⇒ 紅。⭐ 這一條同時是「兩層失敗方式不同」那個論證的實驗 |
| **N4** | 把 `org_entity_id` 從 posture 唯一鍵拿掉（改為 `(period, metric_key)`）| ⛔ **不是測試紅 —— 是 setup 崩潰，21 suites 全滅** | seed 的 rows 1 & 4 都是 `(2026-Q3, total_risks)`，只差實體 ⇒ 第二筆 INSERT 撞 **23505**，`globalSetup` 拋錯 ⇒ 整個 suite 起不來。⚠️ **這個形狀已預先寫在 seed 的註解裡**（W16 N2a：crash 讀起來像「中性化做錯了」而不是「中性化成功了」）|
| **N5** | 刪 `events_read` policy | **恰 2 個**：測試 2、測試 4 | 兩者都是 app-role 的 SELECT ⇒ 回 0 列。測試 2 的 `toEqual([...兩個 ref code])` 收到 `[]`；測試 4 的 `toHaveLength(1)` 收到 0。⚠️ 測試 3 用 owner ⇒ 綠；測試 5 / 6 是 INSERT 無 RETURNING ⇒ 綠；測試 7 被 grant 層先擋 ⇒ 綠 |

**判準**（⛔ 三條都要答）：
1. **零轉紅 = 揭露真缺口**，必須補測試（W17 N4 先例），不是「符合預期」
2. **紅得比預測多**，多出來的若不能由該改動解釋 ⇒ 測試之間有隱藏耦合
3. **紅得比預測少**，代表我對機制的理解有誤 ⇒ 查清楚再改測試

### 執行結果 —— **5 / 5 命中，含紅的形狀**

| # | 預測 | 實際 | 判定 |
|---|------|------|------|
| **N1** | 恰 1 紅（測試 6），測試 5 仍綠 | **1 failed, 264 passed** —— 測試 6 | ✅ **完全命中**。⭐ 測試 5 確實仍綠 ⇒ 本片補的正面半**確實**關掉了 W17 N4 揭露的缺口。W17 同一個中性化是 **0 轉紅**，本片是 1 —— 差別只在多了一個測試 |
| **N2** | 恰 1 紅（測試 8）；測試 10 / 14 仍綠 | **1 failed, 264 passed** —— 測試 8 | ✅ **完全命中**，含那個關於機制的次要預測：owner 連線確實繞過 RLS，所以 FORCE 對它無作用 |
| **N3** | 恰 2 紅（測試 7、17）；**測試 7 以 resolve 而非 raise 轉紅** | **2 failed, 263 passed** —— 測試 7、17。測試 7 的訊息：`Received promise resolved instead of rejected` · `"command": "UPDATE", "rowCount": 0` | ✅✅ **最強的一條**。紅的**形狀**也命中：有 GRANT 無 policy ⇒ **不拋錯、影響 0 列**。migration banner 裡「兩層失敗方式不同」的宣稱，現在有本片**自己的**實測，不再只是引用 W10 N1a / W16 N3a |
| **N4** | **setup 崩潰**（非測試紅），23505 | `Got error running globalSetup … duplicate key value violates unique constraint "posture_snapshots_org_entity_id_period_metric_key_key"` | ✅ **完全命中**，錯誤還指名了那個 constraint。⭐ `AD-UniqueKeyOracle-1` 的**第 4 個資料點、第 2 個正面的**，且是第一次由 **seed 本身**充當斷言 |
| **N5** | 恰 2 紅（測試 2、4）| **2 failed, 263 passed** —— 測試 2、4 | ✅ **完全命中**。測試 3（owner）· 5 / 6（INSERT 無 RETURNING）· 7（grant 層先擋）皆如預測維持綠 |

**復原驗證**：`git status --porcelain apps/api` **空** · `git diff --stat apps/api` **空** ·
int suite 重跑 **265 passed / 21 suites** ✅

### 這一輪值得留下的兩件事

1. ⭐ **N1 是對 W17 的直接對照實驗。** 同一個中性化（刪 INSERT policy），W17 得到 **0 轉紅**、
   本片得到 **1**。中間唯一的差別是本片有測試 6（範疇內 INSERT 成功）。
   ⇒ 「補一個正面測試」這個修法**被實測確認有效**，而不是被推論為有效。
2. ⚠️ **五條全中不是好消息的全部。** 全中代表我對這套機制的模型是準的，
   但它同時代表**這一輪沒有學到新東西** —— W17 的 N4 零轉紅（預測失敗）產出的價值
   比本片五條全中更高。⛔ 下一片若再度全中，應**提高中性化的難度**
   （挑我沒有把握的機制，而不是挑我確定會紅的）。
