# Phase W02 — Retrospective

**Phase**: W02 — entity-scoping spike: prove RLS holds under Prisma
**Period**: 2026-08-09 ~ 2026-08-09
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: PR-pending
**Change record**: `docs/03-implementation/changes/CH-014-w02-entity-scope-rls.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `OrgEntity` + `Policy` 最小切片，`org_entity_id NOT NULL` + FK + 複合索引 | ✅ 完成 |
| US-2 | RLS policy + `FORCE` + DB 角色分離，同一個 migration | ✅ 完成 |
| US-3 | Client extension（tx-local `set_config`），範疇來自 branded type 而非參數 | ✅ 完成 |
| US-4 | 授權子樹解析 + 滾升測試（單元 3 + 整合 3）| ✅ 完成 |
| US-5 | fail-closed + 可區分「空結果」與「未設 scope」的測試 | ✅ 完成（**範圍比預期大**，見 Q3）|
| US-6 | 旁路 detector + CI 接線 + 元驗證 | ✅ 完成 |
| US-7 | design note + ADR-0004 + change record + closeout | ✅ 完成 |

**未完成項目**：

- **`core-model` 經 DI 取得範疇化 client** —— checklist 2.2 的子項，🚧 標記保留。
  `core-model` 目前無 repository，建零消費者的 DI token 是 AP-5 + AP-3。
  → `AD-ScopedClientDI-1`，M1 第一個 repository 觸發
- **並行汙染的常駐迴歸測試** —— Day 2 一次性量測 120 次交錯讀 0 錯，但**沒有測試守著**。
  → `AD-ScopeConcurrency-1`

---

## Q2 — Calibration（工時校準）

- **Scope class**: `spike`（**第 1 個資料點**）
- **Agent-delegated**: `no`（plan §7 宣告值，實際亦未委派）
- **Bottom-up est**: 17 hr（Day-0 後修訂值）
- **Committed (calibrated)**: 11 hr（mult 0.65）
- **Actual**: ~12.1 hr —— Day 1-3 逐項加總 **8.9 hr** + Day 0 **~2.0 hr（未逐項記錄，估入）**
  + Day 4 **~1.2 hr**
- **Ratio**: 12.1 / 11 = **1.10**
- **Band 判定**: **IN (0.7-1.2)**

**發生了什麼**：ratio 在 band 內，但這個數字**品質有瑕疵**，要標明而不是拿來當乾淨資料點。

`AD-TimeTracking-1` 要求「本 phase 每日 progress 條目強制寫 `Task X.Y — actual Z min`」。
Day 1-3 做到了，**Day 0 沒有** —— 它是全 phase 工作量第二大的一天（三-prong verify + 兩次
獨立 database 的 `FORCE RLS` 實測），卻只有敘述沒有數字。2.0 hr 是回推的。

另外逐項加總**不含**間隙成本（讀文件、跑 gate、commit、寫 progress），所以真實值偏高而非偏低。

**行動**: **KEEP 0.65** —— 單一資料點不足以調整（matrix 明文：單次離群值忽略，需 3-phase 移動證據），
且這個點本身有品質瑕疵。等第 2、3 個 `spike` phase。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `calibration-log.md` §1
- [x] 若 |R - 1.0| > 30%：不適用（|1.10 - 1.0| = 10%）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**10**（Prong 1: 1 / Prong 2: 5 / Prong 3: 4）
- Day-0 成本：~120 min（**未逐項記錄，回推值**）
- **預防的返工**：~6-8 hr
- **ROI**: ~3-4×

**最有價值的那個 drift**：**D-superuser**。`POSTGRES_USER: isms_dev` 是
`rolsuper=t, rolbypassrls=t`，而 `prisma.service.ts:43` 當時就用它連線。
若沒抓到，整個 phase 會寫出完美的 policy、跑出全綠的測試，而**隔離一項都不成立** ——
Day 2 的第一輪探測正是這個劇本的預演（`.env` 未同步，十二項全綠、RLS 全程未生效）。
它同時擴大了範圍（compose / `.env.example` / `image-smoke.yml` 三處）。

**⚠️ 但 Day-0 也給了一個錯誤結論，而且是承重的那一項。**

**D-failclosed** 判定「fail-closed 由 PostgreSQL 免費提供，extension 不必實作，兩層獨立成立」，
並據此**減了 0.5 hr**。Day 2 量到那句話只在「從未被 scope 過的連線」上成立 ——
`set_config` 之後 GUC 變成「已定義為空字串」，`current_setting` 不再 raise，
查詢**靜默回 0 列**。production 的 pooled 連線從第二個請求起全部如此。

Day-0 的量測沒有錯，**它量的案例太窄**：只測了 virgin 連線，沒測「用過之後」。
這是 ROI 的另一面 —— Day-0 便宜，但它產出的結論會被當成已驗證的地基，
**一個範圍過窄的 Day-0 結論比沒有結論更危險**。

---

## Q4 — 做得好的（保持）

- **寫承重程式碼之前先量測，而且量測腳本自己斷言前提。** 第一輪探測十二項全綠卻證明不了任何事
  （superuser 連線）。若我當時直接寫 provider 加測試，測試會全綠。加上 premise check 之後，
  同一類錯誤不可能再無聲通過
- **每一個宣稱會擋住某件事的機制都被弄壞過一次**：RLS policy → `USING(true)` 14/20 紅 ·
  detector 加真旁路 → 指到行號 · detector 自己的 pattern 中性化 → self-test 在掃描前就停
- **把 self-test 做成不可跳過**（不在旗標後面）。這是同一個形狀第三次（CH-012 / CH-013 / 本次），
  所以這次改的是結構而不是再寫一次紀律
- **驗「404 不是 403」時沒有假裝驗了 HTTP**。本 phase 無 endpoint，所以驗它的來源
  （範疇外與不存在無法區分），並明寫狀態碼映射隨 endpoint 延後
- **乾淨重啟前先比對 `dist` mtime 與進程啟動時間**，抓到一個舊 4 小時 10 分的進程

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | `entity-scope` 全部經 `EntityScopeModule` 掛進 `AppModule`；startup log 可見 |
| AP-2 Cross-directory scattering | 0 | 範疇集中；建立前 Grep 過（`scope-boundaries.md` 矩陣未破）|
| AP-3 Potemkin | 0 | ⚪ **無 UI → 無 drive-through**，改以整合測試 + 三次元驗證覆蓋。**結論一律 gate-only verified** |
| AP-4 PoC accumulation | N/A | 無 PoC；探測腳本全在 scratchpad，未進 repo |
| AP-5 Speculative abstraction | 0 | **刻意不建**零消費者的 DI token 與 assignment source（見 Q1 未完成項）|
| AP-6 Mock vs real divergence | 0 | 整合測試用真 PostgreSQL；`PrincipalAssignment` 的 doc comment 明寫「今天唯一建構者是測試」且**刻意不接 HTTP** |
| AP-7 命名 / orphan claim | 0 | `PrismaService` 改名義為「連線 + 探針」並改了 header；`prisma.service.ts:19-22` 的舊承諾已改寫為實測結果 |
| **總計** | **0** | |

**Lint**: `run_all.py` 6/6 ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-Day0Scope-1` | Day-0 的 **D-failclosed** 結論範圍過窄（只測 virgin 連線），被當成已驗證地基並據此減工時 | `day0-plan-verify.md` 增一條：Day-0 對**狀態性行為**的量測必須含「第二次呼叫 / 用過之後」的案例 | 候選 |
| `AD-TimeTracking-2` | `AD-TimeTracking-1` 只被遵守了 3/4 天；Day 0 無數字 | Day-0 的 progress 條目也要有時間表格，與 Day 1-3 同格式 | 候選 |
| `AD-ScopeConcurrency-1` | 並行汙染是唯一不會拋錯的失敗模式，卻無常駐測試 | 整合測試加一項交錯 scoped 讀 | 候選 |
| `AD-ScopedClientDI-1` | 「`core-model` 經 DI 取得」無消費者可驗 | M1 第一個 repository 時建 token（`api`）+ 型別（`core-model`） | 候選 |
| `AD-PoolerScope-1` | pooler 下 tx-local `set_config` 未驗；OQ-3 選項 B 的前提在此 | 引入 pooler 前必須先驗，否則 ADR-0004 可證偽條件 #1 觸發 | 候選 |
| `AD-ScopeFnCost-1` | `app_entity_scope()` 每列成本未 `EXPLAIN` 量測 | 資料量成長後量測 | 候選 |
| `AD-EnvDrift-1` | 改了 `.env.example` 不等於改了 `.env`；本次讓整輪探測以 superuser 跑 | 啟動時斷言連線角色非 superuser（非只在測試裡） | 候選 |
| `AD-AdRegistry-1` | plan 裡命名的 AD（`AD-RLS-Unverified`）**從未進 BACKLOG**，closeout 時無處可關；起草 change record 時又順手發明了 `AD-CleanDbMigrate-1` | plan §0 引用任何 `AD-*` 時，Day-0 Prong 1 順便驗它在 `BACKLOG.md` 存在；不存在就當場註冊或改用敘述 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `core-model` 的 DI 消費者 → `AD-ScopedClientDI-1`（M1）
- 並行汙染的常駐測試 → `AD-ScopeConcurrency-1`
- **ci.yml 三個新步驟從未在 runner 上跑過** → PR CI 即是驗證
- **`image-smoke.yml` 的 Day 1 角色改動同樣未經 CI** → 同上

**這個 phase 關掉的**：

- `decision-form.md` **OQ-3** ✅ 拍板 → ADR-0004（這一項有正式登記，關得掉）
- **`AD-NegativeGate-1` 4/5 → 5/5** —— 本次同一形狀第 3 次，已改為結構性解法（self-test 不可跳過）
- **ADR-0001 §可證偽條件 #1 裁決：未觸發** ✅
- **W01 Day 1 記的紅旗「`prisma migrate deploy` 從未在乾淨資料庫上跑過」** ✅ ——
  整合測試每次重建資料庫，自此每次都跑在乾淨的上面

⚠️ **`AD-RLS-Unverified` 關不掉，因為它從來沒被開啟。**
plan §0 與 §5 AC-9 都用了這個 ID，但 grep 全 repo 只在 W02 自己的文件裡命中 ——
**它從未進過 `BACKLOG.md`**。同樣地，我在起草 change record 時順手寫了
`AD-CleanDbMigrate-1`，那也是當下發明的編號。

兩者都是同一個形狀：**在 plan 裡命名一個 AD，感覺像登記過了，實際上沒有。**
→ `AD-AdRegistry-1`（見 Q6）

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [x] Calibration ratio 回填 matrix（**不在** CLAUDE.md / MEMORY.md 散文裡）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
