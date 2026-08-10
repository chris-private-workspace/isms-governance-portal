# Phase W04 — Retrospective

**Phase**: W04 — M1 slice 1: the shape every table copies
**Period**: 2026-08-10 ~ 2026-08-10（Day 0–4，單日）
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: **MERGED** #34（`5bb0c9f`，2026-08-10 23:05 +0800）—— **六個 required check 全 SUCCESS**
**Change record**: `docs/03-implementation/changes/CH-019-w04-user-and-base-fields.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `User` 欄位規格進 `02a` §3.2 + §0 索引列（`02a:48` · `:260-270`）| ✅ 完成 |
| US-2 | D1 拍板 → **ADR-0012 已採納**，4 條可證偽條件 | ✅ 完成 |
| US-3 | `users` 表 + migration + **記錄在案的 RLS 豁免** | ✅ 完成 |
| US-4 | `Policy` base fields 6 → **1**（僅 `is_active`，D2 判定不存）+ `ref-code.ts` | ✅ 完成 |
| US-5 | 元驗證 2 組（發號原子性 · counter RLS）+ 常駐負面案例 | ✅ 完成 |
| US-6 | design note + CH-019 + closeout | ✅ 完成 |

**未完成項目**：

- **`user.repository.ts`**（checklist 2.2）—— 🚧 **Day 1 範圍縮減，使用者核可**。
  ADR-0012 拍板 `users` 為全域無 RLS 表後，它的存在理由（「第二個範疇化 client 消費者」）消失，
  且今天零消費者 = AP-5 + AP-3。**解封條件：M4**。plan §4 標 DROPPED、checklist 標 🚧，
  **兩行都沒刪**。

**範圍外但值得記**：`AD-UserEntitySpec-1` 只被關掉 **`User` 半邊**。
`Role` / `Permission` 已進 `02a` §0 的 "Not yet specified" 分區並綁 M4 ——
從「三處互相指向、無一處定義」變成「明確列為未規格化，因此不得建置」。
**這是它們該有的狀態，不是遺漏。**

---

## Q2 — Calibration（工時校準）

- **Scope class**: `spike`（**第 3 個資料點**）
- **Agent-delegated**: `no`（plan §7 預先宣告；`agent_factor` 1.0 → 三段式）
- **Bottom-up est**: 9 hr
- **Committed (calibrated)**: 5.9 hr（mult 0.65）
- **Actual**: **4.79 hr** —— 牆鐘跨度，`git log` 機械導出：
  base `65ce121`（2026-08-10 17:38:17）→ closeout commit
- **Ratio**: 4.79 / 5.9 = **0.81**
- **Band 判定**: **IN**（0.7–1.2）

**發生了什麼**：ratio 在 band 內，但**這個資料點的價值不在數字而在定義**。

`AD-CalibrationMetric-1` 量到前三個 phase 的 `actual` 欄一直在混裝兩種量
（W02 登記 12.1 hr，而它的牆鐘窗口只有 8h10m —— **算術上不可能是量測**）。
本 phase 是**第一個在 plan 起草時就先宣告量測定義、再去量的**：
`actual` = branch base commit → closeout commit 的牆鐘跨度。

⚠️ **因此 `spike` class 現在有 3 個資料點但只有 1 個可用於趨勢**：
W02 的 1.10 是不同的量，W03 的 0.34 雖是牆鐘但當時是**回溯導出**的。
**3-phase 移動窗口至少還要兩個 phase 才會第一次成立。**

**行動**: **KEEP 0.65** —— 單點在 band 內，依 matrix 的鐵律「單次離群值忽略，需要 3-phase 移動證據」，
更何況這裡連離群都不是。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] `|R - 1.0|` = 19% < 30% → **不需**新增 AD

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**3**（Prong 1: **0** / Prong 2: **2 + 1 orphan claim** / Prong 3: **0**）
- Day-0 成本：~30 min
- **預防的返工**：~1.5 hr
- **ROI**: ~**3×**

**最有價值的那個 drift**：**`D-globaltable`** —— 它不是「路徑錯了」而是
「**規則對這個動作有你不知道的要求**」：`multi-tenant-data.md:67` / `:374` 明訂新增全域表
**必須在 PR 描述中舉證**，而 plan §3.1 只寫了「需要一份 ADR」。
它把交付動作從 1 個變成 3 個（ADR + PR 舉證 + **更新那張清單本身**），
而第三項最重要 —— 不更新清單的話，下一個讀清單的人會判 `users` 為違規。

⭐ **Prong 2 又一次是唯一有產出的 prong**（W03 相同）。三個發現全部來自**讀規則與 detector 的原文**，
而不是路徑存不存在。特別是 `D-detector-scope`：它不在任何 plan 宣稱的射程內，
是讀全域表判準時**順著讀到 detector 實作**才發現的。

### ⚠️ 但本 phase 的 Day-0 也失手了一次，而且是我自己設計的那個檢查

`D-devdb` 驗了 `isms_dev` 的 `_prisma_migrations` 三列**全部 `applied=true`**，判定「起點乾淨」。
Day 2 `prisma migrate dev` 拒絕生成 —— 第一個 migration 的 **checksum 不符**。

> **我驗了「有沒有套用」，沒驗「套用的是不是同一份內容」。**

這正是 `AD-DevDbDrift-1`（W03 的教訓）被拉到 Day 0 的那個檢查 ——
**拉對了時間點，但檢查本身不夠深**。→ `AD-MigrationChecksum-1`。

**ROI 因此比 W03 低**：W03 的 Day-0 推翻了一項承重結論，本次只加了約束、
而且其中一項（`D-detector-scope`）因為 `user.repository.ts` 被砍而**從未實現**。

---

## Q4 — 做得好的（保持）

- ⭐ **先拍板語義，再決定要建什麼。** ADR-0012 寫完才發現 plan 列的 `user.repository.ts`
  不需要存在。反過來做的話，會得到一個**有測試、有覆蓋率、通過每一項 gate 的零消費者元件**。
  這是本 phase 最有價值的一次返工避免，而它的成本是零 —— 只是把順序排對。
- ⭐ **元驗證挖出了 code 沒說的東西。** 中性化 counter 的 RLS → 2 個測試紅，
  而**那不是同一件事的兩個症狀**：第二個是 W03 寫的 oracle 防護測試，因**錯誤型別改變**而紅。
  → W04 的發號路徑成了 W03 那個保證的一部分。**這是元驗證產出新知識而非確認已知的一次。**
- **不照 Prisma 的話做，先診斷。** `migrate dev` 要求 reset（會 drop `isms_dev`）時，
  先查了四件事（CRLF？哪一個不符？檔案被改過嗎？schema 對嗎？）才動手，
  因此**知道根因是 W02 的先生成後手改流程**，而不是「Prisma 又鬧脾氣」。
- **用退出碼判斷 gate，不讀 tail 的輸出。** Day 2 的 `format:check` 失敗，
  而 `tail` 顯示的是 web 的成功訊息 —— 是 `PIPESTATUS[0]` 揭露的。
  這正是 `AD-GrepAssertion-1` 的形狀，這次守住了。
- **不碰不是我開的進程。** port 3200 有一個 8/8 啟動的 web dev server → 不碰
  （本 phase `apps/web` UNTOUCHED）。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | `ref-code.ts` 從 `POST /policies` 可追蹤到（`policy.repository.ts:117`）|
| AP-2 Cross-directory scattering | 0 | 全部落在 `core-model/`；`entity-scope/**` UNTOUCHED |
| AP-3 Potemkin | 0 | ⚠️ 見下方「最接近的一次」|
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | ⭐ **主動避免了一個** —— `user.repository.ts` 砍掉 |
| AP-6 Mock vs real divergence | **1** | ⭐ 見下 |
| AP-7 命名 / orphan claim | 0 引入 · **2 發現** | 見下 |
| **總計** | **1** | |

**AP-6 的那一個（本 phase 最誠實的一格）**：`isms_test` 與 `isms_dev` 用**不同方式建起來**
（`CREATE DATABASE` 從 template1 複製 vs `DROP SCHEMA` + `CREATE SCHEMA`），
於是 schema 層權限只在其中一條路徑上存在。**bug 在 dev 重現、在 test 完全不重現** ——
這正是 AP-6 的定義形狀，只是方向相反（通常是 dev 不重現、prod 才出現）。
→ `AD-DbBuildPathParity-1`。**修了症狀（新 migration），根因（兩條路徑不對等）仍在。**

**AP-3 最接近的一次**：`Policy.status` 的 enum 建了但**轉換沒有被任何東西擋住**；
`created_by` / `updated_by` 存在但**永遠是 NULL**。
判定**不是** Potemkin，因為兩者都在 docstring 明文宣告
（`schema.prisma:171-175` 的「Do not read its presence as a workflow」·
`policy.repository.ts:129-133` 的「填佔位使用者會讓 M3 的稽核問題用謊話被回答」）。
⚠️ **這個判定依賴那兩段註解繼續存在** —— 刪掉它們，這兩欄就變成 Potemkin。

**AP-7 發現但未引入的 2 個**：
(a) `assert-no-scope-bypass.mjs:20` docstring 說 allowlist 是 **four** entries，實測 **3**
→ ⛔ **不逕行改**（依 `AD-EslintSettingsClaim-1` 先例：只知道今天是 3，不知道 W02 當時是幾個，
改掉等於用猜測取代紀錄）→ `AD-AllowlistCountClaim-1`；
(b) `schema.prisma` header 仍寫著 W01 的 "Deliberately carries **NO models yet**" → **已修**（本 phase 引入前的既有 claim）。

**Lint**: `run_all.py` **6/6** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-DbBuildPathParity-1` | ⭐⭐ 兩條建庫路徑產生的 schema 權限不同，只有一條被測試過；缺 GRANT 時**每個端點 500 而全部 gate 綠** | 讓 CI 也跑一次「reset 過的庫」路徑，或讓 `int-global-setup.js` 主動 `REVOKE` 繼承來的權限使兩條路徑對等 | 候選 |
| `AD-MigrationChecksum-1` | `applied=true` 不代表「套用的是同一份內容」；Day-0 的 `D-devdb` 檢查因此漏掉 checksum 漂移 | `AD-DevDbDrift-1` 的 Day-0 檢查加一項 checksum 比對，而不只是 head 比對 | 候選 |
| `AD-AllowlistCountClaim-1` | detector docstring 的數字與實測不符（four vs 3）| 讓 detector **自己輸出**條目數，docstring 不重述可變數字 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

### ⭐ 同一形狀的第 7 次：綠燈涵蓋範圍比讀者以為的窄

`AD-NegativeGate-1` 家族本 phase 再 +1（`AD-DbBuildPathParity-1`）。累計形態：

| # | Phase | 綠燈掩蓋了什麼 |
|---|-------|--------------|
| 1–5 | W01 | 六種 boundaries 設定失效 · 三個掃描 job 空轉 |
| 6 | W03（CH-013）| 產物從未以部署時的組態被執行過 |
| **7** | **W04** | **測試環境與開發環境的建庫方式不同，只有一條被測試** |

依 `.claude/rules/README.md` 的強度階梯，**同一形狀 ≥3 次應改結構性解法而非再寫一次紀律**。
本專案已用過的結構性解法是「每個 gate 帶一個常駐負面案例」（CH-012）——
⚠️ 但本次證明**那個解法對「兩個環境不對等」無效**：兩邊各自的負面案例都會過，
因為它們各自在自己的環境裡是對的。→ 這是 `AD-DbBuildPathParity-1` 該回答的問題。

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `user.repository.ts`（checklist 2.2 🚧）→ **M4**
- `Role` / `Permission` 欄位規格 → **M4**（已在 `02a` §0 "Not yet specified" 分區）
- 誰可以列舉 `users`（ADR-0012 可證偽條件 #1）→ **M4**，RLS 答不了
- ⚠️ **稽核軌跡** → **M3**。本 phase 新增的寫入路徑**同樣沒有稽核**，`RISK_REGISTER` R4 敞口再擴大一格
- `ref_code` 的 prefix 縮寫從未被規格化 → design note §4，目前由各 repository 自宣告
- 三條新 AD（見 Q6）→ BACKLOG §Open

**這個 phase 關掉的**：

- `AD-UserEntitySpec-1` ✅ **CLOSED**（`User` 半邊；`Role`/`Permission` 改由 `02a` §0 + M4 承載）

### Design Note 8-Point Self-Check

| # | Point | 狀態 | 備註 |
|---|-------|------|------|
| 1 | Section header 對應 US | ✅ | §2.1–2.7 每節前綴 US 編號 |
| 2 | 每個 claim 有 `file:line` | ✅ | 22/23 已錨定 |
| 3 | Decision matrix | ✅ | §1 四欄比較 + **否決理由逐項** |
| 4 | Verification command | ✅ | 每節一條可重現指令 |
| 5 | Test fixture ref | 🟡 | **§2.7 沒有 fixture**，且**原因本身就是結論**（CI 的建庫路徑量不到它）|
| 6 | Open invariant 分界 | ✅ | §4 列 6 項延後，含「未量」與「未決」分開 |
| 7 | Rollback 路徑 | ✅ | §5，含**不對稱性**（`ref_code` 重跑回填不保證同號）|
| 8 | Cross-ref single-source | ✅ | §3 兩個契約登記於 `scoped-client.types.ts` |

**Verified ratio**: 22/23 ≈ **96%** ✅

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
