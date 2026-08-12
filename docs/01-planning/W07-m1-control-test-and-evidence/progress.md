# Phase W07 Progress

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## Day 0 — 2026-08-12（plan-vs-repo verify）

### Today's Accomplishments

- Plan + checklist 起草（frozen template，非抄 W06）
- 使用者裁決 2 項：Scope decision (b) `result` 不建 · (e) US-4 留在本 phase
- 三-prong Day-0 verify 全跑完
- Baselines 實測

### Day 0 — Drift Findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | `app.module.ts` **不在** plan §4 #17 寫的 `apps/api/src/app.module.ts`；實際位置 `apps/api/src/bootstrap/app.module.ts`，六個 module 掛在 `:44-49` | plan §4 的路徑要用實際的；`task-workflow.md` §Risk Class D（plan 引用路徑靠猜）第 N 次 | 🟡 小調整 |
| **D2** | ⛔ **`D-force` 是假警報，而假警報是我自己製造的** —— 第一次用 `grep "FORCE ROW LEVEL"`（單空格）得到 3/7，實際 W05/W06 的 migration 為對齊寫成 `FORCE  ROW LEVEL`（**兩空格**）。容忍空白重查：**ENABLE 7 筆 / FORCE 7 筆，7 張表全部都有** | plan §3.x 的「FORCE RLS 全表補齊」一項作廢；新表照樣加 `FORCE`。⚠️ **這是 `feedback_evidence_must_support_claim` 的再犯** —— 用字面 grep 這個便宜代理去回答需要讀內容的問題，並且**已經當成事實對使用者講過一次** | ✅ 設計不變 / ⚠️ 紀律 |
| **D3** | `schema.prisma:448` 的「`ControlTest` does not exist until M7」建表後即 orphan claim（AP-7）。⚠️ 但 `:482` 與 `:761` 的「§4 defines lifecycles for Policy, Risk, Issue and **ControlTest** only」**不會**變 orphan —— 本 phase 給 `ControlTest` `status` 正是**依據**那句話 | 只改 `:448` 一處；**不要順手改另外兩處**（改了才是製造 orphan） | 🟡 小調整 |
| **D4** | `AssetGroup:515` / `Asset:574` 有 `@@unique([id, orgEntityId])`；`Control:754` 明文拒絕；`assets` 的複合 FK 在 `20260811024841_asset_and_risk_chain/migration.sql:214` | plan §0 的核心前提（複合 FK 這招在 `ControlTest → Control` 用不上）**成立** | ✅ 確認 |
| **D5** | ⭐ `governed_extensions/migration.sql:89-91` 記錄 **W03 已實測**：`SECURITY INVOKER` trigger 的 catalog 讀取**受 catalog 自己的 RLS 約束**，且仍看得到 global + own 列；並明寫 `DEFINER` 是 escalation surface、不得拿來「修」可見性問題 | M3 的候選機制在本 codebase **有實測前例**，spike 風險下降。⚠️ **但 M1 仍未被任何既有量測回答** —— RI（外鍵）檢查是否繞過 RLS 是另一個問題，trigger 的前例答不了它 | ✅ 降風險 |
| **D6** | `02a` §0 索引把 `Jurisdiction` / `posture_snapshot` 的 Note 寫成「**Built** without …」，而 migrations 全樹對兩個關鍵字**零命中**，且 `02a:175` 自己寫 `Jurisdiction` **is built in M2** | 索引把「規格未含某些欄位」寫成了「表已建」，會誤導後續 slice 排程。Day 4 一併更正（plan §4 #21） | 🟡 小調整 |
| **D-baselines** | lint **0**（api+web）· type-check **clean**（api+web）· test **19 suites / 192 tests passed** · coverage **statements 93.36 / branches 92.47 / functions 95.74**（門檻 80/70/80/80）· build **clean** · `run_all` **6/6** | closeout 時對比用 | ✅ |

### Go / No-Go

- D1 是路徑更正、D3/D6 是文件更正、D2 移除一個原本就在 §Out of Scope 的項目、D5 降風險
- **範圍變動 < 20% → GO**，繼續 Day 1
- 依規則**不回頭改 plan §Technical Spec**；上述 verdict 留在本檔，plan 的 §STALE placeholder 保留原文
  以維持「原本以為什麼 vs 現實是什麼」的審計軌跡

### Blockers

- 🚧 **checklist §0.2（開分支）待 PR #43 落地** —— #43 動的是 `BACKLOG.md:109`，W07 Day 4 也要改
  `BACKLOG.md`。現在從 `bb63baf` 開分支會讓兩者在同一個檔案相撞，正是 `AD-DesignNoteAnchor-1`
  第三形態的形狀。**解封條件**：#43 merged（CI 已全綠 + `mergeState=CLEAN`，等使用者按）

### 逐任務實際工時（`AD-CalibrationNoActual-1` 的執行面）

⚠️ **Day 0 沒有可靠的逐任務計時** —— 本檔的分鐘數紀錄**自 Day 1 起**用可觀察的時間戳記錄，
不回頭編 Day 0 的數字。Day 0 結束時間戳：**2026-08-12 12:27 +0800**（Day 1 的第一筆以此為起點）。

### Notes

- D2 的教訓值得帶到 Day 1 的量測：**量測結果一律讀輸出，不從 pattern 命中數推論**。
  W06 的 N4 空跑（anchor 中性化前後逐字相同）與今天的兩空格 grep 是同一個根因的兩種外觀。

---

## Day 1 — 2026-08-12（量測：RI 檢查與 RLS 的關係）

### 逐任務實際工時

| 任務 | 起 | 訖 | 實際 |
|---|---|---|---|
| 分支 §0.2（含 upstream footgun 修正）+ 讀既有接線（`int-global-setup.js` / `int-db.js` / `app_entity_scope`）| 12:27 | ~12:31 | **~4 min** |
| Round 1 腳本（M1-M4）撰寫 + 兩次 module 解析修正 + 執行 | ~12:31 | ~12:35 | **~4 min** |
| Round 2 腳本（M5-M8）撰寫 + 執行 | ~12:35 | 12:37 | **~2 min** |
| **Day 1 量測小計** | 12:27 | 12:37 | **~10 min** |

> bottom-up 對「量測」估的是 **2.0 hr**，實際 ~10 min。原因不是估錯難度，是**估算沒把
> 「量測床已經存在」算進去** —— `int-global-setup.js` 可以直接 `require()` 呼叫，
> 三個 fixture control（SG1 local / SG1-owned group / HK1 local）W06 已經種好。
> 這一項留給 Day 4 retro Q2 歸因，**不當場調乘數**（單點不調，需 3-phase 證據）。

### 量測結果（真 PostgreSQL `isms_test`，app role `isms_app_user`，非 superuser 且 `rolbypassrls=false`）

**實驗對照組** —— HK1 範疇下對三個 control 的可見性：
`a50` SG1 entity-local → **0 列**（看不到）· `a51` SG1 擁有的 group → 1 列 · `a52` HK1 own → 1 列。

| # | 問題 | 結果 |
|---|---|---|
| **M1** | 無 trigger 時，HK1 寫一列 `control_id` = `a50`（**存在但 HK1 完全看不到**）| ⛔ **INSERT 成功** —— **RI（外鍵）檢查繞過 RLS** |
| **M2** | 同上但指向 `a51`（group，可見）| 成功（依 `02a:415` 這是合法的）|
| **M2b** | 指向自己的 `a52` | 成功 |
| **M2c** | 指向**完全不存在**的 id | 拒絕 `23503` |
| **M3** | **無 FK**（Evidence 形狀），`linked_id` = `a50` | 成功 —— 沒有任何東西反對 |
| **M3b** | 無 FK，`linked_id` = 純垃圾 | **也成功** —— 連「指向真實存在的東西」都沒人管 |

⭐ **M1 + M2c 合起來就是一個 oracle**：指向別人的私有列 → 成功；指向不存在的 id → `23503`。
呼叫者因此能分辨「存在但不是你的」與「不存在」——
**正是 約束 8 要求查無資料回 404 而非 403 的那個洩漏，只是發生在資料庫層而不是 HTTP 層。**

### 候選機制的量測（`BEFORE INSERT OR UPDATE` + `SECURITY INVOKER` trigger，`NOT EXISTS → RAISE 42501`）

| # | 問題 | 結果 |
|---|---|---|
| **M4a** | 裝上 trigger 後重跑 M1 | 拒絕 `42501` ✅ |
| **M4b** | 裝上 trigger 後重跑 M2（group）| 仍然成功 ✅ —— **合法路徑未被誤擋** |
| **M5** | ⭐⭐ **trigger 是關掉 oracle，還是只換個編號？** | **關掉了** —— 「存在但不可見」與「不存在」**都回 `42501`**，兩者不可分辨 |
| **M6** | UPDATE 路徑：把自己的列重新指向不可見的父列 | 拒絕 `42501` ✅（`BEFORE INSERT **OR UPDATE**` 是必要的）|
| **M7** | 合法路徑（own / group）在 trigger 開著時 | 兩者皆成功 ✅ |
| **M8** | **中性化**：`DISABLE TRIGGER` 後重跑 M5a | **轉為成功** ✅ —— 證明**擋住它的確實是 trigger**，不是別的東西 |

**M5 為什麼是關鍵**：BEFORE trigger **先於** FK 檢查執行，所以不存在的 id 也走 `NOT EXISTS` 分支、
同樣拿到 `42501`，`23503` 根本沒機會發生。如果順序相反，就會變成「不存在 → 23503 /
存在但不可見 → 42501」——**oracle 會原封不動地活下來，而外觀上像修好了**。這一項不量就會漏。

**M8 為什麼要跑**：W06 的 N4 空跑教訓 —— 沒有中性化過的「擋阻機制」不算被驗證過。
這次把中性化直接寫進量測腳本，而不是留到 Day 3。

### 由結果導出的機制選擇

- **`ControlTest.control_id` → `controls`**：複合 FK 不可用（`Control:754` 明文拒絕），
  單純 FK **不足**（M1）→ **`BEFORE INSERT OR UPDATE` SECURITY INVOKER trigger**，
  條件 `NOT EXISTS (SELECT 1 FROM controls WHERE id = NEW.control_id)`，`RAISE ... ERRCODE '42501'`。
  前例：`governed_extensions/migration.sql:89-91`（W03 已實測 trigger 讀取受 RLS 過濾）。
- **`Evidence.linked_id`**：沒有 FK，所以 trigger **同時扮演缺席的 FK**（M3b：垃圾 id 也會被擋）。
  因 `linked_type` 只有 `control_test` 一個值（Scope decision (a)），trigger 檢查 `control_tests`。
- ⚠️ **不需要**新的 ADR —— 這不是「選 A 不選 B」的取捨，是量測排除了其他選項後剩下的唯一可行解。
  它會約束後續 27 張表，所以歸屬 **design note**（本 phase 已預定產出）而非 ADR。

### Notes

- 量測腳本**不進 repo**（plan §3.1）—— 進 repo 的是它導出的 policy / trigger 與測試。
  兩個腳本留在 scratchpad：`w07-m1-measure.js`（M1-M4）· `w07-m5-oracle.js`（M5-M8）。
- `isms_test` 被兩次 `globalSetup()` 重建；那是它每次跑測試都會發生的事，非額外副作用。
