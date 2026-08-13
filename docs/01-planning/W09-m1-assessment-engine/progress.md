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
