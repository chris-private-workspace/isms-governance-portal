# Phase W11 — Retrospective

**Phase**: W11 — Statement of Applicability (M1 slice 8)
**Period**: 2026-08-14 ~ 2026-08-14
**Plan**: [plan.md](./plan.md)
**PR**: #56 MERGED（`dcc680f`）
**Change record**: `docs/03-implementation/changes/CH-028-w11-soa.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `StatementOfApplicability` model + enum + migration，欄位對齊 `02a:215`，四個 deviation 有記錄 | ✅ 完成 |
| US-2 | 3 條 per-command policy + 唯一鍵含 `org_entity_id` | ✅ 完成（⚠️ **複合 FK 未建 —— D10**：本表不是任何表的子表，沒有可複合的對象）|
| US-3 | `GET /soa` · `POST /soa` + repository | ✅ 完成 |
| US-4 | 四個中性化，預期先 commit，結果逐項對照 | ✅ 完成（**4/4 方向全中**；另有兩個追加預測 **0/2**）|
| US-5 | CH-028 + BACKLOG + ROADMAP + 導航檔 + calibration 回填 | ✅ 完成 |

**未完成項目**：無。**plan §3.2 寫的「複合 FK」被 Day 1 判定為無標的**（D10），
plan 原文保留，理由記在 progress —— 不是縮減範圍，是規格描述不精確。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 5 個資料點**）
- **Agent-delegated**: no（plan 宣告，實際成立 —— 全程自己直接做）
- **Bottom-up est**: 3.0 hr
- **Committed (calibrated)**: 1.5 hr（mult 0.50）
- **Actual**: **~1.85 hr**（`e74efd0` 10:21:12 → `dcc680f` 12:12:26，**含 Day 0**；
  author date，rebase 後兩側逐秒相同）
- **Ratio**: 1.854 / 1.5 = **1.236**
- **Band 判定**: ⛔ **OVER**（> 1.2），**但只超出 0.036**

⛔ **這個數字修正過一次，而修正改變了結論。** merge 前我寫的是「1.13 **IN** —— 本欄第一個
IN-band 點」，那是用**估的**收尾時間（「~12:00」）算的。merge 後拿 author date 逐秒重算：
`e74efd0` 10:21:12 → `dcc680f` 12:12:26 = **111.23 min = 1.854 hr** ⇒ **1.236，OVER**。

⚠️ 這正是 `AD-EstimateAsMeasurement-1`（W07 記錄的「把推估當量測」）**再次發生** ——
而且發生在一份專門講「證據要支持結論」的 retrospective 裡。抓到它的是 rebase 後**必須**
回頭改 SHA 引用這件事，也就是說：**若這次不是 rebase merge，錯的數字會留在 main 上**。

**發生了什麼**：超出 0.036，是 band 邊緣而非系統性低估。`actual / bottom-up = 0.618`，
遠高於本表 0.4 下限 ⇒ **估算方法本身沒問題**（對照 W07 的 0.17 與 `AD-BottomUpBlueprint-1`）。
真正吃掉時間的是 Day 3：四個中性化跑完之後**又追加了兩個**，加上逐條放行的隔離實驗 ——
而那段時間的產出不是程式碼，是**推翻我自己寫的一段因果**。plan §7 的 bottom-up
把「中性化」估成 0.5 hr，沒有「中性化失敗後的追查」這一項。

**行動**: **KEEP 0.50** —— 單次離群值依規則**忽略**，需連續 3 個 phase `> 1.2` 才調乘數。

⚠️ **量法的第三個模糊處，本次才浮現**：宣告的窗口是「branch 第一個 commit → closeout commit」，
而 **plan / checklist 的起草發生在第一個 commit 之前**，不在窗口內。
Day 0 的**驗證**在窗口內，Day 0 的**起草**不在 → 記進 `AD-CalibrationDay0InOrOut-1`。

⚠️ **品質打折**：actual 由 commit 時間戳回推，非逐項計時（同 W01 那一列的保留）。

**行動**: **KEEP** 0.50 —— 等更多同量法的資料點。

- [x] 已回填 `calibration-matrix.md`（≤ 1 行）
- [x] 完整敘述已寫入 `calibration-log.md`
- [x] |R − 1.0| = **24%** < 30% → 不需要因此記 AD（但量法模糊處與**推估當量測的再犯**另記）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**9**（Prong 1: 0 / Prong 2: 7（D1-D7）/ Prong 3: 0；另 D8-D9 是方法問題）
- Day-0 成本：~22 min（`e74efd0` 之前）
- **預防的返工**：~0.5 hr
- **ROI**: ~1.4×

**最有價值的那個 drift**：**D1** —— `Framework` 在 `02a` **全檔零命中**。
plan 原本只打算確認它「不在 §0 索引上」；量出來的是更強的事實：**整份規格從未定義它是什麼**。
這把「選項 A（一併建 Framework）」的代價從「多兩張表」提升到「要先發明一個實體」，
而那是規格工作不是實作工作。⇒ D1 的裁決不再是取捨而是唯一可行解。

⚠️ **Day 0 的第二個產出是負面的**：D8 記下我在 Day 0 之內**用不完整的證據下結論兩次**，
兩次都靠交叉檢查而非紀律抓到。D9 是同形第三次，但**第一次在寫進文件之前被前置攔截**。

---

## Q4 — 做得好的（保持）

- **逐項取 exit code**（每個 gate 各自 `> log; echo $?`，不共用管線後的 `$?`）——
  Day 1 因此**當天**抓到 `format:check` 紅燈，而 W10 同一條 gate 拖到 Day 4
- **測試 7 是照既有教訓預先寫的**（繞開發號器 + 不產生 `RETURNING`），
  結果讓 **N2 成為本專案第一次讓 INSERT policy 真的轉紅**的中性化
- **零轉紅時沒有把綠讀成有效** —— N4 → 補測試 → 重跑仍綠 → **停下來查**，
  而不是宣告修好了。查出來的東西推翻了我自己寫的 migration 註解
- **coverage 數字被當成訊號而不是門檻** —— branch 85.71% 指出三個同型三元運算式的
  present 分支從未執行，那是型別檢查看不見的缺口
- **改 `02a` 前先想行號位移**：選 inline 形式，實測 514 → 514 行

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 兩個端點都在 `app.module.ts` 註冊，從主入點可達 |
| AP-2 Cross-directory scattering | 0 | `core-model` 一個 repository、`modules/soa` 四檔，無散落 |
| AP-3 Potemkin | 0 | 12 個 int 測試皆為負面測試形式（關掉什麼會壞，已用四次中性化實測）|
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | ⭐ **主動避免一次**：`(id, org_entity_id)` 錨點零消費者，不建（D10）|
| AP-6 Mock vs real divergence | 0 | int 測試全部打真 PostgreSQL；unit 的 mock 只驗 repository 送什麼 |
| AP-7 命名 / orphan claim | **1** | ⛔ **migration 第 117-120 行的因果宣稱是錯的**（Day 1 寫、Day 3 量出來、已更正）|
| **總計** | **1** | |

**AP-7 那一條值得細看**：它不是命名問題，是**註解宣稱了一個沒有量過的因果**。
抓到它的**不是 review 也不是 lint**，是「中性化零轉紅 → 補測試 → 仍然零轉紅 → 去查」。
⚠️ 同一句話 W06 也寫在 `controls` 的 migration 裡 —— **那裡可能是對的**（讀寬於寫），
但今天沒有人量過 → 記 AD。

**Lint**: `run_all.py` **8/8** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-PolicyClaimUnmeasured-1` | migration 註解寫「拿掉 X 就會 Y」而從未量過；W11 量出因果相反。同一句話在 `controls` 的 migration 裡也有 | policy 註解裡任何「拿掉這半邊會怎樣」的宣稱，**必須有一個中性化實測**或明確標「未量測」。並複驗 `controls` 的同一句 | 候選 |
| `AD-NarrowPatternWideClaim-1` | 「用一個窄 pattern 的命中數，回答一個需要讀內容才能回答的問題」同週第 4 次（CH-027 E3 · E8 · W11 D8 兩次）| 非零命中逐處讀；零命中先反問「它若存在會長什麼樣」。⭐ 已達結構性門檻，考慮升級為 always-loaded 或 hook | 候選（**≥3 次**）|
| `AD-DevDbChecksumDrift-1` | W10 就地改已套用 migration 的註解 → `prisma migrate dev` 對**任何人**都被擋住 | 修 dev DB 漂移；⛔ 並記下**改已套用 migration 的註解是有代價的**（本 phase 因此每次改前先查 `_prisma_migrations`）| 候選 |
| `AD-ModuleFileZeroCoverage-1` | 每新增一個 `*.module.ts` 就稀釋一次全域 stmts/lines（11 個檔全部 0%），而 plan 的驗收寫「不低於 baseline」 | 要嘛把 `*.module.ts` 排除在 unit coverage 之外，要嘛把驗收改成「branch / funcs 不低於 baseline」 | 候選 |

**更新（不新開）的 5 條**：

- `AD-UniqueKeyOracle-1` —— 第 2 個資料點，**判準確認可移轉到沒有 parent 的表**，失敗模式更響亮
- `AD-BorrowedRefusal-1` —— **第 6 次**，且代勞者是第五種（SELECT policy 對 UPDATE 新列的檢查）
- `AD-CalibrationDay0InOrOut-1` —— 量法的**第三個**模糊處（起草在首個 commit 之前）
- `AD-PartialGateReportedAsFull-1` —— **第 3 次**，但成因不同：Day 2 的 full gate 是對的，
  **Day 3 的中性化又改了 code**。提議的修法（Day 3 逐項複製 Day 2 的 gate 清單）不變 ⇒ 不另開 AD
- `AD-SchemaMigrationDrift-1` —— ⛔ **它提議的現成解法可能無效**：`migrate diff` 在 Prisma 7
  下 exit 0 而輸出 0 bytes，**而兩個 schema 明確不同**

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **M1 slice 9..N** —— 其餘 15 張表 → ROADMAP 第 4 項
- `Framework` / `FrameworkControl` —— 需先改 `02a` §0 索引 + 一次 `Control` 遷移 → BACKLOG
- `control_id` 關聯缺口 → `AD-Model-Gaps`
- **`controls` 的 `WITH CHECK` 複驗** → `AD-PolicyClaimUnmeasured-1`
- **dev DB checksum 漂移** → `AD-DevDbChecksumDrift-1`

**這個 phase 關掉的**：

- 無完全關閉的 AD。`AD-UniqueKeyOracle-1` 取得**第 2 個資料點**且**判準確認可移轉**，
  但 detector 未寫 → **維持開放**

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ `RISK_REGISTER.md` 已複查 —— **R4 17 → 18 張表**，其餘七條逐條看過無變化
- [x] `plan.md` frontmatter `status:` 已翻成 `closed`
- [x] `python scripts/lint/run_all.py` 全綠
