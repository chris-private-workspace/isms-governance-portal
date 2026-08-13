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
