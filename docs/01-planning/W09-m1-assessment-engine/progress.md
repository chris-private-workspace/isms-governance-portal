# Phase W09 Progress

**Phase**: W09 — shared assessment engine (M1 slice 6)
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W09-assessment-engine`

---

## Day 0 — 2026-08-13 — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | plan §4 把 root module 寫成 `apps/api/src/app.module.ts`；實際是 **`apps/api/src/bootstrap/app.module.ts`** | 純路徑更正。**Risk Class D**（plan 引用路徑靠猜）第 N 次 —— 該 risk class 的建議是「引設計文件章節，不引猜測的 `.py`/`.ts` 路徑」，本次違反的是同一條 | 🟡 小調整 |
| **D2** ⭐⭐ | **`evidence` 沒有複合錨點。** 全 schema 只有 3 個 model 有 `@@unique([id, orgEntityId])`：`AssetGroup` · `Asset`（`294b375` W05）· `Issue`（`9206d80` W08）—— 而**三個都是與自己的子表在同一個 phase 出生的**。W09 是**本專案第一次由子表引用前一個 phase 建好的表** | W07/W08 的 **D1 判準第三次適用，而這次它導出第三種情況**：判準說 trigger 只用在父表**結構上**給不起錨點時（`controls` 是 group-shared，子表 entity 合法地不同）。`evidence` **沒有 `appliesToScope`**，是單純 entity-scoped → **它給得起**。故 `responses.evidence_id` 走**複合 FK**，而這要求 W09 的 migration **ALTER `evidence` 加上錨點** —— 本專案第一次回頭改前一個 phase 的表 | 🟡 小調整（migration +1 個 additive index）→ 移入 §Risks R1 |
| **D3** | `AssessmentTemplate` 的範疇形狀在**任何文件都沒有寫**：`02a:52`（索引列）· `02a:326`（欄位清單）· `05:42`（引擎說明）三處全部沒有提到範疇 | 確認 plan §8 R2 成立。依 plan 走**最保守的 entity-scoped**，理由寫進 CH-024。⛔ 不自行發明第四種範疇形狀 | ✅ 確認無誤 |
| **D4** | `question_id` 在**全 repo 只出現一次**（`02a:333`），沒有任何地方定義它的型別或來源 | 確認 plan scope decision (b)：JSONB 內部鍵、非 FK。缺口記成 AD | ✅ 確認無誤 |
| **D5** | `Assessment (RCSA)` 的索引列在 **`02a:34`（Shared core）**，而引擎三張在 **`02a:52`（Foundation services）** —— 重複**跨兩個區段** | 分母的更正不是「總數減一」而是**共用核心 23 → 22**，foundation services 9 不變。`check_entity_index.py` 逐區段解析，所以註記那一列會同時改變區段小計與總計 | 🟡 小調整（US-6 的做法更精確） |
| **D6** | `02a:227` 的 `Evidence.linked_type` 是「polymorphic to test / attestation / **assessment**」—— 規格**同時**有 `AssessmentResponse.evidence_id → evidence` 與 `evidence.linked_id → assessment` 兩個方向 | 兩者粒度不同（response 對單題證據 vs evidence 對整份評估），**不是矛盾**。但只有前者會被強制（`linked_id` 依 W07 的記錄偏離刻意無 FK）→ 記入 CH-024，不改設計 | ✅ 確認無誤 |
| **D7** | `model User` 無 `orgEntityId`（ADR-0012） | 確認 plan §3.2：`assignee_user_id` / `reviewer_user_id` 走**單欄 FK**，複合 FK 在此不適用 | ✅ 確認無誤 |
| **D8** | `lint:negative` 是 **root** 的 script（`node scripts/assert-boundary-gate.mjs && node scripts/assert-no-scope-bypass.mjs`），不在 `apps/api` | ⚠️ 我第一次用 `-w apps/api` 跑，得到 `Missing script` 並差點當成 gate 不存在 —— **與 W08 完全相同的踩法**（工具的否定回報被當成事實的否定）。正確叫法：`npm run lint:negative`（無 `-w`） | 🟡 小調整（checklist 的 Verify 不加 `-w`） |
| **D-baselines** | **逐項實測**（⛔ 未引用 plan 抄來的 W08 數字）：lint **0 error 0 warning** · format clean ×2 · type-check clean ×2 · build clean ×2 · web test **10** · api unit **276 / 27 suites** · api int **125 / 10 suites** · coverage **92.07 / 91.9 / 96.63 / 93.62** · `run_all` **7/7** · `lint:negative` **PASS**（41 檔 0 bypass 3 allowlisted）| 基線已記錄。⭐ 十項**全部與 W08 closeout 記錄的數字相符** —— 抄來的數字這次是對的，但它是被驗證過才被採信的 | ✅ |

### Prong 覆蓋

- **Prong 1（path）**: 11 個路徑驗證（7 NEW 皆不存在 ✓ · 4 EDIT 其中 3 存在），**1 個漂移**（D1）。
  `CH-024` 未被佔用（最後是 `CH-023-w08-issue-and-action.md`）✓
- **Prong 2（content）**: 7 個宣稱驗證，**2 個漂移**（D2 · D5），4 個確認無誤（D3 D4 D6 D7），1 個工具用法更正（D8）
- **Prong 2.5（child tree）**: **N/A** —— 本 phase 無前端變更
- **Prong 3（schema）**: 三個 model 確認不存在（grep 命中 **0**）✓ ·
  最後一個 migration 目錄 `20260812211801_issue_and_action`；
  ⭐ **改用 `prisma migrate dev --create-only` 生成目錄名**（機器產生 UTC 戳），
  這正是 `AD-MigrationTimestampTz-1` 提的兩個修法之一 —— 本 phase 順便把慣例定下來

### Go / No-Go

**範圍變動**: ~**8%**（D1 路徑更正 + D2 在既有 migration 內多一個 additive index + D5 讓 US-6 的做法更精確；
無新檔案、無新機制、AC 不變）→ **繼續 Day 1**。

⭐ **D2 是本 phase 目前最有價值的發現**，而且它**不是缺陷**：判準運作正常，只是第一次遇到
「父表給得起錨點，但它還沒有」這個情況。前三次的父子表都同 phase 出生，所以問題從未出現過。

---

## Day 1 — 2026-08-13 — Schema + isolation + SoD

### Today's Accomplishments

- **1.1 三個 enum + 三個 model** —— `pg_enum` 實測三者與 `02a` 逐字相符；
  `migrate deploy` 成功；`check_entity_index.py` **14 → 17 / 36**（機械導出，非手數）
- **1.2 FK** —— `pg_get_constraintdef` 實測：**3 個複合 FK**
  （`instances→templates` · `responses→instances` · `responses→evidence`）
  + 3 個 user 單欄 FK + 3 個 org_entity 單欄 FK。`evidence` 的錨點由本 migration 補上（D2）
- **1.3 SoD CHECK** —— **四個方向實測全部符合預期**（見下）
- **1.4 RLS** —— `pg_class` 實測三張表皆 `rls=true force=true`，各 3 條 per-command policy，無 DELETE
- **1.5 trigger** —— `pg_trigger`（排除 internal）三張表各 1 個
- **1.x** type-check clean

### SoD 的四個方向（US-3 的核心驗證）

| Case | 預期 | 實測 |
|---|---|---|
| A `reviewer = assignee` | FAIL | ✅ `violates check constraint "assessment_instances_sod"` |
| B `reviewer` NULL | 成功 | ✅ |
| C `assignee` NULL、`reviewer` 有值 | 成功 | ✅（`x <> NULL` 為 NULL，CHECK 放行）|
| D UPDATE 改成相等 | FAIL | ✅ |

⭐ **Case D 沒有寫任何東西去支援它** —— CHECK 自動涵蓋 UPDATE，與 W08 量到
「複合 FK 免費涵蓋 UPDATE，而 W07 的 trigger 必須明寫 `OR UPDATE`」是同一個形狀。
**宣告式約束涵蓋所有寫入路徑；命令式守衛只涵蓋你列出的那些。**

### Issues / Discoveries

| ID | 發現 | 處置 |
|----|------|------|
| **D9** ⛔⭐ | **「`Assessment` 不建表」的裁決有一個當時沒有人看見的代價** —— 引擎的 `subject_type` 由 `02a:326` 與 `05:43` 兩處獨立指定為 `risk/control/vendor/entity`，而 `02a:223` 給 `Assessment (RCSA)` 的是 `risk/control/**process**/entity`。裁決是**基於欄位重疊**做的（`assessor_user_id` vs `assignee_user_id` 等），**沒有人比對過 enum**。結果：`process` 沒有落點，**一個對流程做的 RCSA —— `02a:223` 明文設想的東西 —— 今天無法表達** | ⛔ **不自行合併兩份規格**（已確認參數 #9）。照兩處都同意的四個值建，把缺口寫進 `AssessmentSubjectType` 的 docstring 並開 AD。⚠️ **需要使用者知道**：這是他的裁決的後果，不是實作選擇 |
| **D10** | **`prisma migrate dev --create-only` 在非互動環境不能用**（`Prisma Migrate has detected that the environment is non-interactive`），而它正是 `AD-MigrationTimestampTz-1` 提的修法 (b) | → 該 AD 只剩修法 (a)：**手建一律用 UTC**。本 migration 目錄 `20260813032048` 即 UTC，且晚於 `20260812211801`。SQL 本體由 `prisma migrate diff` 生成（機器產生），只有目錄名是手寫的 |
| **D11** | Prisma 7 把 `migrate diff` 的旗標改名：`--from-schema-datasource` **已移除**，改為 `--from-config-datasource`；`--to-schema-datamodel` → `--to-schema` | 已改用新旗標。⚠️ 值得記進 migration 的操作說明 —— 下一個 slice 會再用一次 |
| **D12** | **`version` 在全 repo 沒有任何地方遞增** —— 9 個 repository 沒有一個寫 `version`。所以 `template_version` 今天永遠 snapshot `1` | ⚠️ **這是 AP-3 的邊緣**：欄位在、複製邏輯會是真的，但**產生第 2 版的路徑不存在**。處置：Day 2 的測試**直接把某個 template 的 version 設成 2 並斷言 instance 記錄到 2** —— 讓機制可證偽，即使 production 路徑還不存在。缺口開 AD |
| **D13** | `AssessmentResponse` 照 §1.1 帶了 `ref_code`，而 §1.1 沒有給任何豁免。代價：一份 40 題的提交要走 **40 次** `ref_code_counters`，而 W04 讓它成為 per-entity 的序列化點 | 照規格建，**Day 2 量它**再決定。⛔ 不自行發明豁免 —— `User` 的豁免是**有文件、逐欄位說明理由**的（`02a:286-292`），那是先例的形狀 |
| **D14** | 我用 shell heredoc 追加 schema 內容，**違反自己的 tool-discipline**（寫檔不得用 shell 重定向）。bash 還因引號解析失敗，exit 2 | 改用 Edit 工具重做。⚠️ 規則在 always-loaded context 裡，我仍然違反了 —— 這是「中途漂移」而非「不知道」 |

### Remaining for Next Day

- Day 2：三個 repository + spec · `scoped-client.types.ts` +3 介面 · controller + module ·
  int spec（含 D12 的 version-2 測試與 D13 的 ref_code 成本量測）

---

## Day 2 — 2026-08-13 — Repositories + endpoints + integration

### Today's Accomplishments

- **三個 repository + spec**（9 + 9 + 7 = 25 個單元測試）
- **`scoped-client.types.ts` +3 介面** —— 三個都扣住父表 delegate
- **controller（6 端點）+ module + spec**（13 個測試）
- **`assessment.int.spec.ts` —— 20 個測試**，含四項範疇測試 ×3 表
- ⭐ **超出 plan：第二個 migration**（見下）
- **Full gate**：lint 0/0 · web 10 · api unit **314/31** · api int **145/11** ·
  type-check ×2 · build ×2 · coverage **92.07/90.67/97.14/93.49** · `run_all` 7/7 ·
  `lint:negative` PASS · `check_entity_index` **17 / 36**

### ⭐ 今天最重要的一件事：一個設計衝突，以及它的解法

`02a:330` 要求 `template_version` 是**指派當下的快照**。要複製它就得讀模板 ——
但 W05 起每個 scoped client 都刻意**不給父表 delegate**，理由逐字寫在三個介面上：
「不給 delegate 才叫寫不出來，而不只是不建議」。

三個選項，兩個是壞的：

| 選項 | 為什麼不行 |
|---|---|
| 呼叫端自己傳 `templateVersion` | 那不是快照，是**宣稱**。D12 已標它是 AP-3 邊緣，這樣只會更糟 |
| 給 instance client 開 `assessmentTemplate` delegate | 為了取一個整數，把三個 phase 建立的 oracle 防線拆掉 |
| **DB 在 `BEFORE INSERT` 填它** | ✅ 介面維持窄的，且欄位真的是規格說的那個意思 |

⭐ **而這個 trigger 差一點自己開一個 oracle。** 如果模板不可達時 `RAISE`，
「別人的模板」與「不存在的模板」就會得到**不同的錯誤** —— 正是 W07 量到的那個陷阱
（該次的結論是「關掉 oracle 的是執行順序不是 trigger 本身」）。
解法是 `COALESCE(..., 0)` **不 RAISE**：讓後面的複合 FK 用 23503 拒絕兩者。

⚠️ 還有一層：`BEFORE` trigger 也跑在 `NOT NULL` **之前**，所以留 NULL 會先得到 23502，
oracle 換條路又回來了。0 是刻意選的 —— `version` 預設 1 且只增，沒有模板會是 0。

**四項實測**：呼叫端謊報 99 → 存 1 · 模板升 2 → 存 2 · 不可達 → 23503 · UPDATE 不重取。
D12 因此關閉：機制是**可證偽的**，即使 production 還沒有產生第 2 版的路徑。

### Issues / Discoveries

| ID | 發現 | 處置 |
|----|------|------|
| **D15** | plan §4 把 int spec 寫成 `apps/api/test/assessment.int.spec.ts`；實際慣例是 `src/modules/<x>/<x>.int.spec.ts`（10 個既有檔全部如此）| **Risk Class D 第二次**（同一個 phase 內）。⚠️ 兩次都是「plan 引用路徑靠猜」，而 Day 0 Prong 1 只驗了 plan 列的路徑**存不存在**，沒驗**慣例對不對** —— 前者答「檔案不在」，後者才答「你要放的地方是錯的」 |
| **D16** ⭐⭐ | **測試 12（跨實體證據被拒）第一版是用一個不存在的 id 通過的** —— 我把 `a60`/`a61`（control_test 的 id）當成 evidence 的 id，實際是 `a70`/`a71`。拒絕的是「不存在」不是「跨實體」 | ✅ **被測試 13 抓到**（「可以引用自己實體的證據」）—— 那個正向控制組正是為此存在。⭐ **這是 `AD-BorrowedRefusal-1` 的形狀第 5 次，而這次是被結構抓到的**：拒絕測試旁邊放一個共用同一機制的正向測試，錯的 fixture 就無所遁形。⚠️ 若當初只寫拒絕測試，它會綠著騙過整個 phase |
| **D17** | 覆蓋率 branch **91.9 → 90.67**（−1.23），lines 93.62 → 93.49（−0.13），funcs 96.63 → **97.14**（+0.51）| 門檻 80/70/80/80，四項遠高於。⚠️ 但 branch 掉 1.23 **大於** `AD-ModuleCoverageDilution-1` 從一個 module 檔能解釋的量 —— 多出來的是 controller 的三組驗證分支（三個端點各自的 required/optional 檢查）。Day 4 記入該 AD 當第二個資料點 |
| **D18** | `assessment_response` 的 counter **刻意不 seed**，讓 `issueRefCode` 的 upsert 走「該類型第一次發號」那條路 | 沿用 W05 對 `risk` 的同一個決定。⚠️ 這條路徑否則永遠不會在測試裡跑到 |

### D13 的成本量測（ref_code 每答一題一次）

⚠️ **本 phase 未量到真實數字** —— 端點是一次一筆，沒有批次提交路徑，所以「40 題 40 次」
是**從程式碼推導**而非實測。⛔ 不寫成已量測。真正要量需要一個批次端點，那是 slice 7+ 的事。
已寫進 `assessment-response.repository.ts` 的 header 與 spec 的測試名。

### Remaining for Next Day

- Day 3：元驗證（N1-N6），**預期方向必須在跑之前寫下**（`AD-MetaVerificationBug-1`）

---

## Day 3 — 2026-08-13 — Meta-verification

### ⛔ 預期方向 —— 寫於執行任何 N 之前

> `AD-MetaVerificationBug-1`：**元驗證本身會有 bug，而它的 bug 長得跟成功一樣。**
> W08 抓到它的唯一原因是「預期它會紅而它沒紅」。所以預期先寫下，包含**預期不受影響的**。
> 基準：api int **145 / 11 suites**（assessment suite 20 個）。

| N | 中性化什麼 | **預期轉紅** | **預期不動** | 為什麼 |
|---|---|---|---|---|
| **N1** | DROP `assessment_responses_evidence_id_org_entity_id_fkey` | **12**（跨實體證據改為被接受）| 13 · 其餘 18 個 | 只有那把 key 在擋跨實體證據 |
| **N2** | `assessment_templates_insert` → `WITH CHECK (true)` | **15** | ⭐ **16 預期仍綠** | 16 走 repository，`issueRefCode` 先動 `ref_code_counters`，**counter 的 policy 會代為拒絕**（W05 條款 2 / `AD-BorrowedRefusal-1`）。15 用 `createMany` 繞開它，所以只有 15 真的釘住這條 policy |
| **N4** | DROP `assessment_instances_sod` CHECK | **9** | 9b · 其餘 | 唯一釘住 SoD 的是測試 9 |
| — | 同上 | ⭐ **9c 預期「錯誤地」仍綠** | — | 9c 斷言錯誤**不是** `ScopeRefusedError`/`UnknownReferenceError`。CHECK 移掉後 create 成功、`.catch()` 回傳的是**一列資料**，而一列資料本來就不是那兩個 class → 綠。**這是 `AD-TestNameWiderThanProof-1` 的實例，我預期它會被抓到** |
| **N5** | DROP `assessment_instances_template_id_org_entity_id_fkey` | **8 · 10 · 11** | 其餘 17 個 | 8 是 oracle 測試（兩者都不再拋錯）、10 是跨實體模板、11 是 UPDATE 重指 |
| **N6** | detector fixture 的孤兒 `ShadowLedger` 改名為 `Risk` + `@@map("risks")` | **`--self-test` FAIL** | — | ⭐ 名字**真的在** `02a` §0 索引上，所以它不再是孤兒 → 自測「fixture orphan detected」不成立。⛔ W08 第一版用了 `Policy2`/`policies`（**不在**索引上），於是它仍是孤兒、自測照樣 PASS，**壞掉的元驗證長得跟成功一樣** |

⚠️ **判讀規則**（寫在前面，避免事後合理化）：
方向相符 → 記錄。**方向不符 → 先懷疑元驗證本身，不要先改產品碼。**

### 實測結果

| N | 預期轉紅 | **實測** | 相符？ |
|---|---|---|---|
| **N1** | 12 | **12**（1 紅 19 綠）| ✅ |
| **N2** | 15，且 **16 仍綠** | **15**（1 紅 19 綠），16 綠 | ✅ **含那個反直覺的預測** |
| **N4** | 9，且 **9c 錯誤地仍綠** | **9**（1 紅 19 綠），9c 綠 | ✅ 缺陷如預期被抓到 |
| **N4′** | 修好 9c 後 9 + 9c | **9 + 9c**（2 紅 18 綠）| ✅ |
| **N5** | 8 · 10 · 11 | **8 · 10 · 11**（3 紅 17 綠）| ✅ |
| **N6** | `--self-test` FAIL、`run_all` 6/7 | **FAIL**、**6/7** | ✅ |

**復原驗證**：兩個 migration 與備份**逐位元組相同**（`diff -q`）· fixture `git diff` **空**·
int **145/11 全綠** · `run_all` **7/7** · unit **38/4 全綠**。

### ⛔ 第一次 N1 是無效的，而它看起來像成功

第一次我用 `psql` 對 `isms_test` 直接 `DROP CONSTRAINT`，然後跑 int suite → **20/20 全綠**。

那不是「守衛是多餘的」，是**中性化根本沒生效** —— int 的 global setup 每次都
`isms_test rebuilt, migrated and seeded`，我的 ALTER 在測試開始前就被重建覆蓋掉了。

⭐ **抓到它的唯一原因是預期方向寫在前面。** 若沒有先寫「預期 1 紅」，
20/20 全綠會被讀成「這個守衛沒有被任何測試依賴」，
而正確的結論是「**這次量測什麼都沒量到**」。這正是 `AD-MetaVerificationBug-1`
描述的形狀 —— **壞掉的元驗證長得跟成功一模一樣**（本 phase 第 1 次，累計第 2 次）。

**結構性教訓**：中性化必須改**來源**（migration SQL），不是改**狀態**（資料庫）。
凡是每次執行都會重建的東西，對它做的手術都不算數。

### 兩個修正

| ID | 發現 | 處置 |
|----|------|------|
| **D19** ⭐ | **測試 9c 的名稱寬於它證明的東西** —— 原本只有兩個 `.not.toBeInstanceOf`，SoD CHECK 移掉後 create **成功**、`.catch()` 回傳的是一列資料，而一列資料本來就不是那兩個錯誤 class → **綠**。名字說「refusal 不是 404 形狀」，而當時根本沒有 refusal | ✅ 加上 `expect(error).toBeInstanceOf(SegregationOfDutiesError)` 當錨點，**當場在 N4 中性化狀態下驗證它會紅**。⭐ 這是 `AD-TestNameWiderThanProof-1` **第一次被元驗證主動抓到**（W08 那次是靠讀測試名發現的）|
| **D20** | 我在 N6 用了 `python ... \| tail -4; echo $?`，拿到的是 `tail` 的退出碼 **0** 而非 python 的 | ⚠️ `AD-GrepAssertion-1` 的形狀，**在我剛寫完「不要用 tail」的 phase 裡**。沒有造成錯誤結論（`run_all` 的 6/7 是不含糊的訊號），但它證明該條 AD 升到第 4 級（hook）的判準又多一個實例 |

### 今日總結

**六個中性化，六個方向全部與事前預測相符**，其中兩個是反直覺的預測
（N2 的 16 仍綠 · N4 的 9c 仍綠）並且都成立。⭐ **`AD-BorrowedRefusal-1` 第一次被事先預測**
—— 前四次都是事後發現「這個綠燈其實是別人擋的」。

### Remaining for Next Day

- Day 4：CH-024 · `02a` §0 索引更正（US-6，分母 36 → 35）· retrospective · calibration ·
  導航檔 + BACKLOG · final gate sweep
