# Phase W15 — Retrospective

**Phase**: W15 — M1 slice 10: the jurisdiction spine and the obligation library
**Period**: 2026-08-16 ~ 2026-08-16（單日，Day 0–3 連續；Day 4 同日收尾）
**Plan**: [plan.md](./plan.md)
**PR**: #67（**MERGED** 2026-08-16 07:45:01Z，`d01d505` —— **rebase merge，11 個 SHA 全改寫**，見 Q7）
**Change record**: `docs/03-implementation/changes/CH-033-w15-jurisdiction-and-obligations.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `Jurisdiction` 表 + 11 個管轄區 seed + `OrgEntity.jurisdiction_id` | ✅ 完成 |
| US-2 | `Regulation` / `Obligation` 表與依賴鏈（Wave 2 只需填充） | ✅ 完成 |
| US-3 | `obligations` 無 `org_entity_id` 的**書面舉證** | ✅ 完成（`multi-tenant-data.md:64` + migration banner + **PR #67 描述**）|
| US-4 | 全域可讀性與 FK 完整性**各有一個會紅的測試** | ✅ 完成（7 個 `it()`，N1/N2 實測其中 4 條會紅）|
| US-5 | calibration / BACKLOG / 導航檔已更新 | ✅ 本次 closeout 完成 |

**實體數**：22 → **25 / 35**（`check_entity_index.py` 機械導出，非手數）。

**AC 11 條的達標情況**：9 條 ✅ · **AC-2 ⚠️ 未可驗證** · AC-11 於本次 closeout 補齊。

⛔ **AC-2 是這一片唯一沒有真正達標的驗收條件**，而它的失敗形狀值得寫下來：
plan 要求「欄位逐個對上 `02a:161` / `:198` / `:200`，且不含 D2 列出的四個 base 欄位」——
**那個逐欄位比對從來沒有被執行、也沒有被寫下來**，只有「三張表存在」被測試 3 的
`relname` 斷言涵蓋。⇒ 加一個 `status TEXT`、加回 `ref_code`、或拿掉 `notes`，
**int 225/18、type-check 0、`check_entity_index` 25/35 全部不動**。
記為 `AD-W15ConstraintSurfaceUntested-1`（P1）。

**未完成項目**：無未交付的 deliverable。品質缺口見 Q6 / Q7。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 8 個資料點**）
- **Agent-delegated**: `no`（plan 事先宣告；`agent_factor` 1.0 → 三段式）
- **Bottom-up est**: 3.6 hr（Day 0 verify 0.6 · schema+migration 1.0 · seed 0.4 · int spec 0.8 · 兩次中性化 0.4 · closeout 0.4）
- **Committed (calibrated)**: **1.8 hr**（mult 0.50）
- **Actual (Day 0–3)**: **133.38 min = 2.223 hr**
- **Ratio**: 2.223 / 1.8 = **1.235**
- **Band 判定**: **OVER**（> 1.2）

**量法**（⚠️ 見下方第一條「發生了什麼」—— 這個量法是**事後選的**）：
由 commit author date 逐段相加，`fd77e50 12:27:12` → `4fc44d8 14:40:35`。
六個間隙：17.03 / 17.35 / 29.98 / 44.05 / 3.12 / 21.85 min，**最大 44.05，無一超過 60 min**
⇒ 逐段法與窗口法**同值 133.38 min**（與 W14 相同的結果，第 2 個資料點）。

**發生了什麼**：

1. ⛔ **plan §7 沒有事先宣告量法** —— 這是 `AD-CalibrationDay0InOrOut-1` 要求的事，W14 做到了、W15 漏了。
   後果不是數字錯，是**我在知道答案之後才選量法**，那正是該 AD 想防止的事。本次選了 W14 宣告過的那一個，
   但那是我的補救，不是本片的紀律。
2. ⛔⭐ **progress.md 全檔沒有任何時間記錄** —— `min|hr|分鐘|actual|elapsed` 全部零命中。
   `task-workflow.md` §Step 5 明寫「per-day 估算住在 progress.md」，本片**一天都沒記**。
   ⇒ 分子只能從 git author date 反推，而那**排除了 `fd77e50` 之前的 plan 起草時間**。
   **1.235 因此是下限，不是測量值。**
3. ⭐⭐ **plan §7 的預測方向錯了，而且是自信地錯**。原文預告：本片比前七點更偏「複製」（零端點、
   零 repository、零 controller，形狀有逐欄位可抄的藍本 `Threat`）⇒ **「若 ratio 明顯低於 band，
   那是 class 判斷過寬的訊號」**，並建議可能該分出一個更窄的 `schema-only` class。
   **實測往反方向出 band。** 若只比對 Day 0–3 對應的那部分承諾（(3.6−0.4)×0.50 = 1.6 hr），
   ratio 是 **1.389**，偏離更大。

**是雜訊還是訊號**：**訊號，但不是 plan 預期的那個訊號。** 「零端點零 repository」確實讓
**實作**便宜（schema + migration + seed 三段合計 64.4 min），但它同時讓**驗證變貴** ——
一片沒有應用層的東西，唯一能證明它的只有整合測試與中性化實驗，而那兩段
（`abbc699` 前的 44.05 min + `4fc44d8` 前的 21.85 min）合計 65.9 min，**比實作還多**。
⇒ 假設的 `schema-only` class 若真的存在，它的乘數應該**比 0.50 高**，不是低。
plan 把「產品程式碼少」讀成「工作少」，那是把**代理指標**當成了工作量本身。

**行動**: **KEEP 0.50**。單點不調乘數（連續 3 個 phase 才動），且本點的分子是下限、
量法事後選，**資料品質必須打折**。⇒ 記一條 AD 要求下一個 phase **在 plan 就宣告量法並每日記時**。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] `|R − 1.0| = 23.5% < 30%` ⇒ 依模板不強制記 AD；但**量法與記時的兩個缺口另記 AD**（見 Q6）

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量**：**8**（D1–D8；Prong 1: D1 / Prong 2: D2·D4·D5·D6·D7 / Prong 3: D3·D8）
- **Day-0 成本**：**17.03 min**（`fd77e50` → `942ba19`）
- **預防的返工**：~1.5 hr
- **ROI**: **~5×**

**最有價值的那個 drift：D7 —— 而它的價值在於它不在任何一個決策點裡。**

plan 有五個明確標示的決策點（D1–D5），**GRANT 不在其中任何一個** ——
因為前九片的表全部是 entity-scoped，GRANT 每次都一樣，所以從來沒有人問過它。
D7 量到先例是 **`SELECT` only**，這造成兩個後果：

1. **正面**：D3（三張表不進 `AUDITED_MODELS`）的論證從「今天沒有寫者」升級為
   「**寫者被資料庫擋著**」—— 從一個關於現況的觀察，變成一個關於構造的保證。
2. ⭐ **關鍵**：AC-5 的 FK 測試**不能走應用層**。若照 plan 原樣用 app 角色寫，
   PostgreSQL 會在**評估任何約束之前**先以 42501 拒絕 ⇒ 兩條 FK 測試會**全綠而什麼都沒測到**。
   這正是 `AD-VacuousScopeTest-1` 的形狀，而且是最難察覺的那一種：**綠燈、有斷言、斷言還通過**。

⇒ 一句話：**「一個每次都一樣所以不必問的東西，在第一次不一樣的時候不會舉手。」**

---

## Q4 — 做得好的（保持）

- ⭐ **在恆真檢查被寫進 checklist 的當下就抓到它**。checklist 1.1 原文是「觀察漂移守衛**仍綠**」——
  而「守衛正確忽略無寫入路徑的 model」與「守衛從不看新 model」**產生一模一樣的觀察**。
  拆成 1.1a / 1.1b，1.1b 用暫時的 repository stub 逼出 1 紅並指名 `Jurisdiction`。
  **這是 `AD-VacuousScopeTest-1` 出現在 checklist 自己身上，而且在執行前就被攔下。**
- ⭐ **中性化預測承諾的是「紅的形狀」而不只是「紅的條數」**。N2 事先逐條指定機制
  （測試 1 = 錯的值 · 測試 2 = 例外 42704 · 測試 3 = catalog 兩個欄位各變一個），三種形狀逐項命中。
  條數對得上很容易，形狀對得上才排除了「因為別的原因紅」。
- ⭐⭐ **一個直覺在寫下之前被 grep 攔下**。N1 的直覺預測是「2 紅」（多的那個是
  `rls-direct` 的 `toBe(5)` 會看到多出來的第 6 列 `org_entities`）。事實 B：`rls-direct` 排第 17、
  `jurisdiction` 排第 18，**前者先跑完** ⇒ 正解是 1 紅。progress.md 對這件事的評語值得留著：
  **「多一個紅看起來像是中性化更成功，沒有人會回頭質疑一個比預期更紅的結果。」**
  ⚠️ 它自帶誠實標註：事實 B 依賴 `--listTests` 順序 = 執行順序，**那是假設不是量測**。
- **id 區段與哨兵值使用前先驗零命中**（`NOWHERE = ffffffff-…` · seed 的 `01xx` 段）——
  W14 因 `ab0` 撞號損失 7 個測試，這次沒有重演。
- **測試 1/2 斷言排序後的 code 清單而非 `count = 11`**，且清單**手寫自 `15:41` 而非從 seed 陣列導出**
  —— fixture 不能同時當被告與證人。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | **1** ⚠️ | 三張表**沒有 repository 也沒有 endpoint**，從主入點追不到。這是 plan §3.1 D3 的刻意設計（消費者在 M6），唯一的活邊是 `org_entities` 的 FK。**記錄為已知偏離而非零違規** |
| AP-2 Cross-directory scattering | 0 | Day 0 D1 全樹 grep `jurisdiction` 零命中 |
| AP-3 Potemkin | 0 | 拿掉三張表會斷 `org_entities` FK 並讓測試 1–7 轉紅；N1/N2 **兩次實測命中**。⚠️ 但見 Q6 `AD-W15ConstraintSurfaceUntested-1` —— 約束面有一半沒有這種保護 |
| AP-4 PoC accumulation | N/A | 非 PoC |
| AP-5 Speculative abstraction | 0 | ⭐ 7 個 `cross_border_*` / `deployment_region` 欄位**刻意不建**（ADR-0010 移除了在範圍內的驅動力，建了才是 AP-5）|
| AP-6 Mock vs real divergence | N/A | 無 mock |
| AP-7 命名 / orphan claim | **2** ⚠️ | `schema.prisma:2` 宣稱 22 models（實際 26）· `audit.module.ts:50` 印出自己的推導指令卻與它不符（說 23，實際 26），`:53` 的「FIVE MODELS ARE ABSENT」應為八個。**本片加了 3 張表，讓第一條變得更錯** → `AD-SchemaHeaderStale-1` |
| **總計** | **4** | 三類，全部已登記且**刻意不在本片修** |

**Lint**: `run_all.py` **8/8** ✅ · api unit **480/40** · api int **225/18** · web **10/1** ·
coverage **92.14 / 91.77 / 98.98 / 93.56**（逐位不變，事先預測並命中）· `check_entity_index` **25/35**

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-RegulationVersionCollision-1` | `Regulation.version`（法規版次，如 `2012 Rev.3`）與 base 的樂觀鎖 `version` 撞名，只留後者 = **丟掉前者的語意**。⛔ `Policy` 已付過同一筆代價而**無人記錄** | 同形狀第 2 次 ⇒ 立規則：base 欄位與規格欄位撞名時，**規格語意不得靜默消失**，要嘛改名要嘛明記代價 | 候選（1/3）|
| `AD-CalibrationNoTimeRecord-1` | progress.md **一天都沒記時**，且 plan §7 **未宣告量法** ⇒ ratio 只能事後從 commit 反推，且量法在知道答案後才選 | plan §7 必須宣告量法（`AD-CalibrationDay0InOrOut-1` 已要求，本片漏了）**且** progress.md 每日至少一行實際耗時 | 候選（1/3）|
| `AD-W15ConstraintSurfaceUntested-1` | 本片全部價值是約束面，**一半沒有測試會因它消失而變紅** | catalog 斷言（privilege 集合**恰好相等**）取代逐 verb `rejects` | 已登記 P1 |
| `AD-EntityScopeNoDriftGuard-1` | 稽核維度加表忘接會自動紅，**實體範疇維度不會** | 抄稽核維度的守衛形狀 | 已登記 P1 |
| `AD-W15InvariantInCommentOnly-1` | 去正規化欄位無複合 FK、參考表無自然鍵唯一約束 | 套用本 repo 既有的 7 處複合鍵 pattern | 已登記 P2 |

**更新的既有 AD**（詳見 BACKLOG）：
`AD-SchemaMigrationDrift-1`（**首個真實實例，已修，並成為其 detector 的現成測試向量**）·
`AD-PrismaEnumThreeTruths-1`（**其未解問題被實測回答 ⇒ 兩個候選解法砍掉一個**）·
`AD-TestNameWiderThanProof-1`（**3/3，應升級為結構性解法**）· `AD-SchemaHeaderStale-1`（第 3 次且射程更寬）·
`AD-JestFileOrder-1`（新重現配方）· `AD-DevDbChecksumDrift-1`（**第 4 次繞開**）·
`AD-TextEditStructuralScope-1`（覆蓋範圍被實測收窄）· `AD-16`（第 4/5/6 個實例）

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **M1 剩 10 張表**（25 / 35）→ slice 11..N
- **約束面的五個測試缺口** → `AD-W15ConstraintSurfaceUntested-1`（P1）——
  ⛔ **M6 補上 repository 與端點的那一片必須同時補**，因為屆時有應用層路徑可以繞過它們
- **實體範疇維度的漂移守衛** → `AD-EntityScopeNoDriftGuard-1`（P1）
- **`AD-DevDbChecksumDrift-1` 第 4 次繞開** —— plan §8 事先要求在 retro 明寫，**照做**：
  Prong 3 的證據是 int suite 的 `[int] isms_test rebuilt…`，**不是 `_prisma_migrations` 查詢**
  ⇒ **`isms_dev` 的 head 本次未被驗證**。「每次繞開都很便宜」正是它活到第四次的原因
- **jest 順序相依的重現配方** → `AD-JestFileOrder-1`。還原後第 1 次跑 `223/2 failed`、
  零改動連跑三次全綠，⛔ **失敗身分在產生的當下就被過濾器丟掉**（`AD-GrepAssertion-1`）。
  ⇒ 結論句：**「每次中性化的『其餘 N 條不動』都比它看起來弱一個等級。」**
  守衛升級：`--randomize` 從「防 CI 差異」改為「防每次中性化之後的第一次驗收」

**這個 phase 關掉的**：無 AD 關閉。

⭐⭐ **`AD-26` 的時序問題在本次 closeout 進行到一半時真的發生了，而且是最乾淨的一個實例。**

事件順序（全部可查證）：closeout 文件寫完時 PR #67 是 **OPEN**，於是 CLAUDE.md / ROADMAP /
plan / MEMORY / 本檔**五處都寫了「PR #67 OPEN，未 merge」**，並且刻意不預先寫 MERGED —— 那是對的做法。
**然後 PR 在 `2026-08-16T07:45:01Z` 被 merge 了**，而那五處在幾分鐘內全部變成錯的。

⇒ **`AD-26` 說的不是「有人會忘記回頭改」，是「closeout 這份文件按構造會在寫完之後失效」。**
兩者的修法完全不同：前者要提醒，後者要**讓 merge 這件事去更新文件，而不是讓文件預測 merge**。

**連帶量到的三件事**：

1. ⭐ **rebase merge，11 個 SHA 全部改寫** —— `AD-DesignNoteAnchor-1` 的**第 7 次**。
   `e02eb57 → 1bc4d60` · `9efb5f5 → d01d505`，main tip = `d01d505`。
2. ⭐⭐ **author date 逐秒不變，第 7 次確認** —— `15:37:53` / `15:38:06` 兩側完全相同。
   ⇒ 本片 Q2 的 calibration **完全由 author date 導出**，所以**那個數字撐過了 rebase，即使 SHA 沒有**。
   這再次支持該 AD 收斂的結論：**需要跨 merge 存活的引用，錨點應該是 author date + subject，SHA 只是索引**。
3. ⛔ **遠端分支在 merge 時被刪除，而 closeout 的 push 把它重建了** ——
   `git push` 回報 `* [new branch]`，那是**唯一**的異常訊號（`gh pr view` 才確認 MERGED）。
   ⇒ closeout commit 改走 `feature/W15-closeout`（自新 main 切出 + cherry-pick），**不 force-push**。

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航層級（Current Phase 1 行 + Last Updated 1 行）
- [x] `MEMORY.md` 新條目是品質指標，細節在 subfile
- [x] Phase 細節完整保存在 `memory/project_w15_jurisdiction_and_obligations.md` + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix（敘述在 log）
- [x] Matrix 那一行 ≤ 1 行
- [x] ⭐ `RISK_REGISTER.md` 已複查 —— **R4 這次沒有變大，而那是 W02 以來第一次**（見該檔）
- [x] `plan.md` frontmatter `status:` → `closed_partial`，內文標記一致（R9）
- [x] `python scripts/lint/run_all.py` 全綠
- [x] Checklist 沒有被刪掉的 `[ ]` 項 —— ⚠️ **Day 0 / Day 1 共 21 項是在本次 closeout 補勾的**，
      依據是 progress.md 的執行證據（數字、原文輸出、commit SHA），**不是我重新執行了它們**
