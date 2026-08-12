# Phase W08 — Retrospective

**Phase**: W08 — Issue + Action，與 W07 判準第一次導出另一個答案
**Period**: 2026-08-12 ~ 2026-08-13
**Plan**: [plan.md](./plan.md)
**PR**: #47（pending）
**Change record**: `docs/03-implementation/changes/CH-023-w08-issue-and-action.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `check_entity_index.py` + 負面 fixture + `run_all` 6/6 → **7/7** + `RefCodeCounter` 明記排除 | ✅ 完成 |
| US-2 | `Issue` 表 + `/issues` 端點 + 四個範疇測試（int 9 個） | ✅ 完成 |
| US-3 | `Action` 表 + `/actions` 端點 + 四個範疇測試 + 複合 FK 引用防護（int 11 個） | ✅ 完成 |
| US-4 | D1 分流驗收 —— N1 移掉複合 FK，**3 紅 8 綠** | ✅ 完成 |
| US-5 | 元驗證 N1-N6 逐機制中性化紀錄 | ✅ 完成 |
| US-6 | `CH-023` + retrospective + calibration + 導航檔 | ✅ 完成 |

**未完成項目**：無。checklist 無未勾 `[ ]`。

**plan §4 對照**（`git diff --name-status edb5853..HEAD`）：**28 個目標全部命中，零計畫外檔案**。
UNTOUCHED 五項（`entity-scope.resolver.ts` · `modules/control-test/` · `evidence/` ·
既有 10 個 migration · `docs/14-adr/` · `.github/workflows/`）**全部未動**。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（第 **2** 個資料點；⚠️ 第 1 個 W05 **定義受污染**，
  見 `AD-CalibrationMetric-2` —— 兩點不構成 3-phase 窗口）
- **Agent-delegated**: `no`（plan 時宣告，實際亦然）
- **Bottom-up est**: 9.5 hr
- **Committed (calibrated)**: 4.75 hr（mult 0.50）
- **Actual**: ⚠️ **兩個定義給出差 3.6 倍的答案，兩個都列**

| 定義 | 值 | Ratio | Band |
|---|---|---|---|
| **拍板的窗口**（`AD-CalibrationMetric-2`：branch 第一個 commit → closeout commit）| `20:17:02 → ~00:15` ≈ **3.97 hr** | **0.84** | **IN** |
| **逐段兩端錨點加總**（`AD-EstimateAsMeasurement-1` 要求的形式）| **~66 min ≈ 1.1 hr** | **0.23** | **UNDER** |

**發生了什麼**：差額 **169 分鐘全部是等待使用者回覆的間隔**，而它可以被獨立算出來 ——
每個 Day 的起始時間戳減去前一個 commit 的時間戳：55 + 78 + 28 + 8 = 169 min。
窗口 238 min − 169 = **69 min**，與逐段量測的 **66 min** 對得上（差 3 min 是 commit 本身）。
**兩個方法交叉驗證成功**，所以問題不在量測而在定義。

`AD-CalibrationMetric-1` 刻意讓窗口「含間隙成本」，論證是「一個一致的高估可被乘數吸收」。
那個論證預設間隙是**工作的一部分**（思考、CI 等待、除錯）。本 phase 的間隙 71% 是
**使用者不在**，而那不是這個 phase 的成本 —— 它是「這個 phase 被切成四次對話」的成本。

⚠️ **官方 ratio 取拍板的定義 0.84（IN band）**，但那個 IN 是**巧合** ——
169 分鐘的等待恰好把 0.23 抬進了 band。用它會掩蓋真實的估算問題，所以兩個都記。

**行動**: **KEEP 0.50**（第 2 個點且定義有爭議，不動乘數）+ 新 AD `AD-CalibrationIdleGap-1`

- [x] 已回填 `calibration-matrix.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `calibration-log.md`
- [x] |R − 1.0| > 30%（逐段定義下）→ AD 已記入 `BACKLOG.md`（`AD-BottomUpBlueprint-1` 更新）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**12**（Prong 1: 0 / Prong 2: 8 / Prong 3: 3 / baselines: 1）
- Day-0 成本：verify 段 **~est（起點無錨點，不進 calibration）** · detector 段 **8 min**
- **預防的返工**：~2-3 hr
- **ROI**: 無法精確計算（成本的一半沒有有效量測），但下面那條 drift 單獨就值回票價

**最有價值的那個 drift**：**D-namemap**。

model `ExtensionField` / table `extension_fields` / 索引 `extension_field_catalog` ——
**三個名字，彼此沒有規則可導**。一個逐字比對的 detector 會在**同一次執行裡**產生兩個錯誤發現：
把 `ExtensionField` 報成孤兒（假的），同時把 `extension_field_catalog` 報成「索引上有但沒建」
（也是假的）。⛔ **而那兩個假發現看起來完全像真的** —— 我會去「修」它們，而修法會是把
`02a` §0 改名，那是一份被 **304 處** `file:line` 錨定的文件。

**第二名**：**D-refcounter** —— 我在 plan 裡寫「`RefCodeCounter` 沒有 `org_entity_id`」，
而 `schema.prisma:174` 的 docstring 正在強調相反的事（"Entity-scoped **ON PURPOSE**"）。
排除的**決定**不受影響（使用者裁決的是「排除」不是「因為沒有 org_entity_id 而排除」），
但那個錯理由本來會被寫進 detector 的 `EXCLUDED` 註解**當成判準**。

---

## Q4 — 做得好的（保持）

- **N1 在 plan 起草時就被指定為核心驗收，而不是 Day 3 才想到要驗。**
  plan §5 AC-6 寫死「移掉它之後該測試轉綠」，所以 Day 1 寫 migration 時就知道那句話會被檢驗。
- **`AD-BorrowedRefusal-1` 第 4 次是在寫測試的時候被設計掉的，不是驗收時抓到的。**
  Day 2 寫 `action.int.spec.ts` 測試 8 時，先問「這次誰可能代勞」，答案是複合 FK，
  於是把 `(issueId, orgEntityId)` 寫成匹配的一對。前三次都是事後才發現。
- **enum 守衛的合法值是 `Object.values()` 導出的，不是抄的。**
  抄一份字面清單會在 `audit` 進 schema 那天繼續拒絕它，**而沒有任何測試會失敗**。
- **每次中性化前印 `anchor found: True`、還原後印 `restored byte-identical: True`。**
  六次編輯／還原後 `isms_dev` 的 checksum 仍然逐字相符。
- **Day 2 明確拒絕宣稱「路由掛上了」** —— `build` EXIT=0 只證明它編得起來。
  那句話留到 Day 3 有 startup log 才寫。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 兩個 module 都掛在 `app.module.ts`，從主入點可追蹤 |
| AP-2 Cross-directory scattering | 0 | `modules/issue/` · `modules/action/` 各自集中；建前 Grep 過 |
| AP-3 Potemkin | 0 | ⚪ 無 UI → **API-level verified** 11 項 + **N1-N6 六次中性化**，零轉紅 0 次 |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | `IssueSource` 只建 2 個有目標表的值；`Action` 不建 `owner_user_id` |
| AP-6 Mock vs real divergence | 0 | dev-principal 三重標示（startup warning + `_devPrincipal` + production throw）|
| AP-7 命名 / orphan claim | 0 | ⚠️ 逐一檢查了三處新註記：`02a:19` 的同行追加 · design note D1 的追加 · schema 兩個 enum docstring —— 全部指向**存在**的東西 |
| **總計** | **0** | |

**Lint**: `run_all.py` **7/7** ✅（本 phase 從 6/6 升級）

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-IssueBareEnum-1` | `Issue` 的兩條入邊（`source` · `risk_accepted`）都只有 enum 沒有 FK，「誰產生了這個 finding」追不回去 | 規格層補欄位（**M7 前必須拍板**）；不在實作層發明 | 候選 |
| `AD-MigrationTimestampTz-1` | Prisma 用 UTC 命名 migration，手建的用本地時間，差 8 小時 → 新的排在已套用的之前 | 定一個時區慣例並寫下來，或一律用 `--create-only` 生成 | 候選 |
| `AD-ModuleCoverageDilution-1` | 每加一個 module 就稀釋一次覆蓋率（`*.module.ts` 全部 0%） | `collectCoverageFrom` 排除它們，**同時說明誰來證明它們對** | 候選 |
| `AD-TestNameWiderThanProof-1` | 兩個 int 測試的名稱宣稱得比它們證明的寬（實際靠 counter 代勞） | 改名或在 docstring 明寫「本測試不釘哪一層擋的」 | 候選 |
| `AD-MetaVerificationBug-1` | ⭐⭐ 元驗證本身會有 bug，而它的 bug 長得跟成功一模一樣（N6 第一版）| **中性化的預期方向必須在跑之前寫下來**；「零轉紅先查」擴充成「**方向不符預期時先懷疑元驗證本身**」 | 驗證中(1/3) |
| `AD-CalibrationIdleGap-1` | 拍板的 actual 定義（branch 第一個 commit → closeout）在 phase 被切成多次對話時，把**等待使用者**算成工時 —— 本 phase 169/238 分鐘（71%）是等待 | 窗口扣掉「Day N 起始時間戳 − 前一個 commit 時間戳」的加總；該值可從 commit 機械導出，不需要 AI 有一個鐘 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `AD-IssueBareEnum-1` —— **M7 之前必須拍板**（`Failed → raises Issue` 現在只能單向走）
- `AD-CalibrationIdleGap-1` —— 下個 phase 收尾時兩種定義都算一次再比對
- `AD-BottomUpBlueprint-1` 的新提議（三級藍本度 × 實測單位成本 ≈ 8 min/項）——
  ⚠️ **下個 phase 先照舊估一次再比對**，樣本只有 W08 一個
- `CH-022:190` 的「8 → 10 / 35」仍然是錯的（已 merge 的歷史快照，刻意不追）
- `STATUS_AUDIT.md` 的 12/35 留給下次審計

**這個 phase 關掉的**：

- `AD-EntityCountDerivation-1` ✅ CLOSED —— detector 取代人算，且它一跑就推翻分母（36 不是 35）
- `AD-EntityIndexIncomplete-1` ✅ CLOSED —— `RefCodeCounter` 明記排除 + `EXCLUDED` 由 N0 守著
- `BACKLOG` §Known Issues 的「索引不同步 2 次以上就該寫成 detector」——
  **條件成立且已交付**

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（Current-Phase 一行 + Last-Updated）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 `memory/project_w08_issue_and_action.md` + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— R4（無稽核寫入路徑）**10 → 12 張表**，
      本 phase 再新增兩條無稽核的寫入路徑
- [x] `plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）
- [x] `python scripts/lint/run_all.py` 全綠（**7/7**）
