# Phase W17 — Retrospective

**Phase**: W17 — M1 slice 12: records retention and legal hold
**Period**: 2026-08-16（單日，UTC 13:24 → 16:xx；本地時間跨午夜到 08-17）
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: PR-pending
**Change record**: `docs/03-implementation/changes/CH-035-w17-retention-and-legal-hold.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `retention_policies` 表 + 3 enum + 六列 seed（逐字取自 `05:73-80`）| ✅ 完成 |
| US-2 | `legal_holds` 表 + CHECK + 兩條 users FK（顯式 `onDelete`）| ✅ 完成 |
| US-3 | RLS `ENABLE` + `FORCE` + 2 policy + GRANT 兩層，並有斷言證明 | ✅ 完成 |
| US-4 | `multi-tenant-data.md` 豁免舉證（行數不變）+ migration banner + PR 描述三處 | ✅ 完成（PR 描述待開 PR）|
| US-5 | CH-035 · retrospective · calibration · 四個 AD · 導航檔 | ✅ 完成 |

**未完成項目**：無。**三項與 plan 不同，全部在 Day 4 用
`git diff --name-status 5c42384..HEAD` 對照 §4 抓到**（`AD-DecisionSideEffect-1` 建議的固定動作，
成本 < 1 min，本片第一次照做就有產出）：

1. **測試數** plan 估 ~8、實際 **13** —— 多出的 5 條是 grant catalog、RLS+FORCE catalog、
   未範疇 session 讀取、retention 的 RLS-off catalog，以及 **N4 逼出來的測試 13**。
   ⇒ 最後一條**不是估算失誤，是方法產生的工作**。
2. ⛔ **`02a-data-model-spec.md` 列為 EDIT 而實際未改** —— `02a:50` 的索引列**早就存在**，
   兩個實體從 Wave 1 起就在上面。W16 需要改 `02a` 是因為它**新增了一個實體**
   （`ISMSProfileVersion`），本片沒有。⇒ plan §4 那一列是我**從 W16 的形狀抄過來**的，
   而 `02a:18` 的規則本片不適用。
3. ➕ **`scripts/lint/check_entity_index.py` 未在 plan §4 而實際改了** —— D14：
   三個名字都不同（model `RetentionPolicy` / 表 `retention_policies` / 索引 `retention_policy`）
   ⇒ 加一條有理由的 `ALIAS`。⛔ 不改 `02a`（權威排序：設計文件 > 代碼），
   也不把表名改成單數（其餘 24 張全是複數）。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 10 個資料點**）
- **Agent-delegated**: **no**（plan 時宣告；Day-0 盤點由 agent 做但已獨立複驗，< 20%）
- **Bottom-up est**: **6.4 hr**
- **Committed (calibrated)**: **3.2 hr**（mult 0.50）
- **Actual**: **~2.5 hr**（Day 0–3 量測 **121.0 min** + Day 4 closeout ~30 min）
- **Ratio**: 2.5 / 3.2 = **0.78**
- **Band 判定**: **IN**（0.7–1.2）

**發生了什麼**：ratio 在 band 內偏低端，方向與 W16（0.84）一致。
兩張表比 W16 的五張少，但**多一種形狀**（全域 + entity-scoped 各一），
而 §7 事先把「零端點讓驗證變貴」算進了 bottom-up ⇒ 沒有重演 W15 的 OVER。

⭐ **本片的 calibration 資料品質是這個 class 至今最好的一筆**：
`AD-CalibrationNoTimeRecord-1` 要求的最小改進（**動 plan 之前先蓋 `date -u`**）
**做到了一半** —— T0 蓋在動 checklist 之前（`2026-08-16T13:24:10Z`），
所以 Day 0–3 的分子是**逐段量測**（5 段，最大間隙 40.9 min，**無 > 60 min 需排除**），
不是從 commit 反推的下限。
⛔ **仍要打折的一半**：**plan 起草段發生在 T0 之前，未被量到**，
且 Day 4 的 ~30 min 是估算。⇒ **2.5 hr 是下限**，真值更高，ratio 因此是**上限偏低**的估計。

**行動**: **KEEP**（0.50）。第 10 點，連續兩點 IN（W16 0.84 / W17 0.78），
單點不調且兩點同向不足以觸發調整（規則要求 3-phase 移動證據）。
⚠️ 但**方向要記著**：若第 11 點再落 0.7–0.85，三點連續偏低端就該考慮 re-point 到 0.45。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] |R − 1.0| = 0.22 < 30% ⇒ 不需另記 AD

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量：11**（Prong 1: **1** / Prong 2: **7** / Prong 3: **3**）
- **Day-0 成本**：~18 min（T0 → 首個 commit `05c2156`，含 baselines 背景執行）
- **預防的返工**：~**1.5–2 hr**
- **ROI**: ~**5–7×**

**估算依據**（逐條，不是總體印象）：

| Drift | 若沒抓到會怎樣 | 省下的 |
|---|---|---|
| **D2** `lint:negative` 是 root script | 整個 phase 的每次 gate 都在跑一個不存在的指令，`EXIT=1` 被當成「gate 失敗」追一輪，或更糟 —— 被當成雜訊忽略 | ~30 min + 一個假的紅 |
| **D10** Prong 3 工具量錯東西 | 每次驗證都拿一個被 6 支未套用 migration 淹沒的輸出當「漂移檢查」，**本片的零新增漂移根本證明不了** | ~40 min + AC 失去意義 |
| **D3** owner 連線的正確名字 | 照 plan 寫「superuser」會去找不存在的憑證 | ~15 min |
| **D1** `audited-models.ts` | UNTOUCHED 指向不存在的檔 = 空話，closeout 時才會發現 | ~10 min |

**最有價值的那個 drift**：⭐⭐ **D4，而它的價值在於它是一個「差點成立的假警報」**。
`grep 'FORCE ROW LEVEL SECURITY'` 全樹回 **3** 個命中，而 W16 宣稱為 5 張表加了 FORCE。
照那個數字推，結論是「**16 張表 owner 繞過全部 policy**」—— 一條 P0，而且是**看起來完全合理**的 P0。
實情是 W16 用**兩個空格**對齊。寬容 pattern 給 **ENABLE 24 / FORCE 24 / 缺口 0**。

⇒ 這個專案的窄 pattern 之前咬過幾次，**都是讓我漏看問題**；這次差點讓我**憑空造一個**，
而造出來的那個會消耗一整個 phase 去「修」一個不存在的缺口。
**零命中與低命中一樣，都要先問「它如果存在會長什麼樣」。**

---

## Q4 — 做得好的（保持）

- **W16 的教訓被吸收進 plan 而不是 Day 0**：§3.2 直接寫 `ENABLE` 加 `FORCE`，
  Day 0 只需**對既有 migration 逐字複核寫法**（且明寫「不從本 plan 抄 —— plan 是我寫的，
  它不是證據」）。W15 的 calibration 教訓同樣進了 §7 的 bottom-up。
- **中性化預測鎖進 commit `57d13c6` 才開始跑**，且**逐次序列執行** ——
  N3–N5 那批啟動前**輪詢等前一批印出 `ALL DONE`**，因為 W16 的 12 條假紅就是並行造成的。
- **AC-2 的路徑 2 從 `git show HEAD:` 讀而非工作區** —— 中性化正在改工作區的 migration，
  拿一個正在被改動的檔案當基準，那條路徑就不獨立了。
- **缺席證明先跑陽性對照**（找到 3 個存在的欄位）才採信它的零。
- **N4 零轉紅時沒有當成「實驗沒做對」而收工** —— 追下去發現真缺口並補測試 13，
  再用 N4a 證明缺口關閉。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 兩張表都在主 schema + 主 migration 序列；無 `experimental/`、無並行版本 |
| AP-2 Cross-directory scattering | 0 | code 全在 `core-model` + `prisma/`；建表前 grep 過（零命中） |
| AP-3 Potemkin | **1** | ⛔ **如實記**：兩張表今天**零消費者**（無 repository / 無端點），消費者在 M6b。這是 slice 的既定形狀（M1 建資料層、M6 建應用層），非本片新增的偏離 —— 但它符合 AP-3 的定義，不藏在 N/A 底下 |
| AP-4 PoC accumulation | N/A | 非 PoC |
| AP-5 Speculative abstraction | 0 | 無 adapter / interface / base class。⭐ **`scope_type` 的三個值不是預留** —— 它們來自 `02a:318`，且 seed 三列各用一個 |
| AP-6 Mock vs real divergence | N/A | 無 mock（int suite 打真 PostgreSQL） |
| AP-7 命名 / orphan claim | 0 | 無版本後綴。⭐ **修正了一條既有的 orphan claim**：`schema.prisma` header 寫「TWO tables are exempt … Nothing else is exempt」，而 W15 加了三張全域表沒動它 —— **守著規則的那句話比它守的規則先過期**（D12） |
| **總計** | **1** | |

**Lint**: `run_all.py` **8/8** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-LegalHoldScopeRefUnguarded-1` | `legal_holds.scope_ref` 無參照完整性 —— W14 的多型守衛結構上不可用（`::uuid` cast 早於 mapping walk，而 `class` 不是 uuid；`record` 泛指 31 張表） | 不建只涵蓋 `entity` 分支的假守衛。解封於 M6b 第一個要解析 hold 的消費者，屆時 `scope_type` 的值域才有真實需求可依 | 候選 |
| `AD-SpecFieldValueSourceUnverified-1` | Day-0 的 content verify 勾了「6 個欄位名逐字相符」而那是真的 —— **沒有比對的是「每個欄位有沒有值的來源」**。`trigger`/`disposition` 直到寫 seed 才被逼問出無來源（D15） | Day-0 Prong 2 對**新表**加一列：逐欄回答「這欄的值從哪來？」。名字層的 verify 答不了「這欄填得出來嗎」 | 候選 |
| `AD-CatalogAssertionPredictionBlindSpot-1` | 中性化預測兩次低估，**同一個盲點**：N3 / N5 改的都是 GRANT，而測試 12 用 `toEqual` 斷言整個 grant 集合 ⇒ 它對該維度的**任何**改動都反應 | 預測 grant / policy 類中性化時，**catalog 型斷言預設算進紅的條數**。教訓不是「條數估高一點」，是「認出哪些測試是**維度級**的」 | 候選 |
| `AD-GuardMatchesItsOwnDisclaimer-1` | 我為中性化寫的守衛 `assert "FOR UPDATE" not in text` **fire 了且是誤判** —— 命中的是 migration 註解裡「NO `FOR UPDATE` policy」那句。**那個片語出現在檔案裡正是因為那個東西不存在**（D17） | 任何對 SQL / 程式碼做「某構造不存在」的斷言，**必須先剝除註解**。與 D4 / D7 同族：裸文字回答需要結構的問題 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `AD-LegalHoldScopeRefUnguarded-1` 🟡 → M6b 解封
- `AD-RetentionDurationUnstructured-1` 🟢 → M6b 解封（`duration` / `trigger` / `disposition` 皆無來源）
- `AD-SpecFieldValueSourceUnverified-1` 🟡 · `AD-CatalogAssertionPredictionBlindSpot-1` 🟢 ·
  `AD-GuardMatchesItsOwnDisclaimer-1` 🟢
- ⛔ **M1 的 DoD 仍未達成** —— 其餘 **4** 張表；
  🔴 `AccessRequest.org_entity_id` nullable **無裁決文件**，且本 repo 有一個**帶前科**的錯誤預設答案
  （`extension_fields` 的 `org_entity_id IS NULL` 曾產生 `AD-GroupRowTheft-1`）—— 建它前必須 STOP and ask

**這個 phase 關掉的**：

- `AD-DevDbChecksumDrift-1` ✅ **實質關閉** —— `isms_dev` 由 **17 / 23 → 24 / 24**，
  且關閉它的是 `migrate deploy` 這個**六次繞開都沒有人試過**的指令。
  ⚠️ 不是「修好了 `migrate dev`」——該 AD 的敘述需修正為「被擋的是 `migrate dev` 的額外功能，
  不是套用 migration 本身」

**無 design note**（feature continuation —— 複用 W15 全域表與 W16 entity-scoped 兩種已驗證 pattern，
無新領域、無新不變式）。**無 ADR**（無會約束未來的架構級決定；D3 的「不建多型守衛」是
實作決定並已登記為 AD）。

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [x] Calibration ratio 回填 matrix（**不在** CLAUDE.md / MEMORY.md 散文裡）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ `RISK_REGISTER.md` 已複查 —— R3 / R4 更新（見該檔）
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
