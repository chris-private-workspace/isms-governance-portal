# Phase W16 — Retrospective

**Phase**: W16 — ISMS profile: five entity-scoped tables, no endpoints
**Period**: 2026-08-16（單日）
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: PR-pending
**Change record**: `docs/03-implementation/changes/CH-034-w16-isms-profile.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|---|---|---|
| US-1 | 5 model + 4 enum 進 `schema.prisma`；migration 套用；`prisma generate` 已跑 | ✅ 完成 |
| US-2 | 14 條 RLS policy（ENABLE **+ FORCE**）+ 4 條複合 FK + 三層 GRANT，各有會轉紅的測試 | ✅ 完成 |
| US-3 | `ApprovedOffering` 承載「哪家實體獲准賣什麼」；seed 有跨實體樣本 | ✅ 完成 |
| US-4 | `ISMSProfileVersion` + 父表指標；不可變性經 N3a/N3b 兩層分別實測；`02a:60` 已加名 | ✅ 完成 |
| US-5 | 15 個裁決寫進 `13` §Implementation record + migration banner + schema docstring | ✅ 完成 |
| US-6 | `CH-034` + retrospective + calibration + 導航檔 | ✅ 完成 |

**實體數 25 / 35 → 30 / 36**（分子 +5、分母 +1）。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 9 個資料點**）
- **Agent-delegated**: `no`（plan 時宣告）
- **Bottom-up est**: 8.3 hr
- **Committed (calibrated)**: **4.15 hr**（mult 0.50）
- **Actual**: **~3.5 hr**（≈ 210 min）
- **Ratio**: 3.5 / 4.15 = **0.84**
- **Band 判定**: **IN**（0.7–1.2）

**逐段**：Day 0 起草 ~95 min（**估算**）· Day 0 三-prong **14.6**（量測）·
Day 1 **21.4**（量測）· Day 2 **39.4**（commit 導出）· Day 3 **10.1**（commit 導出）·
Day 4 **~30**（commit 導出）。

⛔ **量法宣告有做到，兩條獨立路徑沒有完全做到 —— 如實記錄。**
plan §7 事先宣告了三態（「含 Day 0，且含起草」），這一半達成了，比 W15 好。
但「分子取 progress.md 逐任務記錄、author date 只作交叉檢查」**只在 Day 0–1 成立**；
**Day 2–4 兩條路徑同源**（都來自 commit 時間戳）。
⇒ `AD-CalibrationNoTimeRecord-1` 在本片是**部分清償**，不是完全清償。
兩條路徑「相差 2% 以內」這句話因此**沒有它看起來的份量**。

**發生了什麼**：IN band，且是本 class 第 2 個 IN 點（W12 的 spike 那個不算同 class）。
W15 的 1.235 OVER 之後回到 0.84，**方向反轉**。可能的成因是本片的 bottom-up
（8.3 hr）本身估得比 W15（3.6 hr）保守得多 —— 我在 §7 明寫了「表數是 W15 的 1.67 倍
且 entity-scoped」，於是把驗證面算進去了。⇒ **W15 的教訓被吸收進估算，而不是被吸收進乘數。**

**行動**: **KEEP 0.50** —— 單點不調（matrix §何時調整需 3-phase 移動證據），且本點在 band 內。

- [x] 已回填 `calibration-matrix.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `calibration-log.md`
- [x] `|R - 1.0|` = 16% < 30% ⇒ 不需額外 AD

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**12**（Prong 1: **0** / Prong 1b: **1** / Prong 2: **9** / Prong 3: **2**）
- Day-0 三-prong 成本：**14.6 min**
- **預防的返工**：~**2.5 hr**，且其中一項不是工時問題而是合規問題
- **ROI**: ~**10×**

**最有價值的那個 drift**：**DR3 —— plan 漏了 `FORCE ROW LEVEL SECURITY`。**

它的價值不在於修起來多貴（一行），而在於**沒有任何東西會發現它**：
int suite 連的是 app 角色，不是 owner，所以五張表的範疇測試會**全綠**，
而 migration 的 owner 角色能把每一列讀穿。這是 guardrail 4 的直接缺口
配上一個**結構上看不見它的測試套件** —— `AD-EntityScopeNoDriftGuard-1` 說的正是這件事，
而本片差一點成為它的第一個實例。

**次高**：**DR12 —— 索引名 69 字元 vs `NAMEDATALEN` 63**。
W11 已經踩過同一個坑（`statements_of_applicability` 的名字被靜默截斷，schema 與 DB 從此不一致），
本片本來會是第三例。抓到它的是 Prong 3 的**欄位級** diff，不是任何 gate。

---

## Q4 — 做得好的（保持）

1. ⭐ **中性化的預測寫下來並先 commit**（`020fe11`）。事後所有「我早就知道」都無法自證，
   而一個 SHA 可以。W15 建立了這個做法，本片照做並加碼到五次實驗。
2. ⭐⭐ **零命中先證明儀器有效**。AC-2 的 12 條缺席證明前，先跑一組陽性對照
   （4 個已知存在的欄位被查詢指名、`posture` 缺席）。一條查不到任何東西的查詢回報的零**不是證據**。
3. ⭐ **兩條獨立路徑數同一個東西**：欄位總數由 `information_schema`（94）與
   `CREATE TABLE` 區塊（94）分別得出且逐表相符。
4. **裁決寫在讀得到的地方**：三處刻意的缺席同時寫進 migration banner、schema docstring
   與 `13` 的實作記錄表 —— 而不是只寫在一份沒有人會重讀的 plan 裡。
5. **`toEqual` 而非 `toContain` 的 catalog 斷言**（`AD-W15ConstraintSurfaceUntested-1`
   明列的修法）—— N3a 實測它真的會叫。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|---|---|---|
| AP-1 Side-track | 0 | 五張表全部從 `02a` §0 索引可追溯；無 `experimental/` |
| AP-2 Cross-directory scattering | 0 | 唯一的 code 改動在 `core-model` + `prisma/`；int spec 依零端點先例放 `core-model` |
| AP-3 Potemkin | **1** | ⛔ **如實記，不粉飾**（plan §8 事先要求）：`ISMSProfileVersion` **今天零消費者**。⚠️ 精確的說法是：**五張表都零消費者**（消費者在 M6c），差別在其餘四張早已在 `02a` §0 索引上（=已被核可為可建），第五張是本 change 才加上去的。使用者在知情下裁定建它 |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | `13:45` 的三組延伸**明確不建**，理由是該段自己寫的「Model those only if actually needed」 |
| AP-6 Mock vs real divergence | 0 | 無 mock；int suite 跑真 PostgreSQL |
| AP-7 命名 / orphan claim | 0 | 本片自己的檔案 0 個。⚠️ **既有的兩個記錄而不修**（Step 0.0）：`schema.prisma` 的 `Scope:` 行漏了 W13-W15、`rm_report_snapshot/migration.sql:155-158` 的「should be rather than is」已被 W10 N1a 量測推翻 |
| **總計** | **1** | |

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|---|---|---|---|
| `AD-IsActiveNeverBuilt-1` | `02a:100` 把 `is_active` 列為 §1.1 base field，而**全 schema 零張表有它**（`information_schema` 實測 0），從 W02 至今 26 張表沒有一張實作 | 二選一：從 §1.1 移除，或補一個 generated column。⛔ 現況是一份**有成員無實作**的基準清單，而每一片都在「照 §1.1 抄」 | 候選 |
| `AD-IsmsProfileSpecGaps-1` | `13` 有三處今天無解、M6c 前必須裁決：(a) `iso_officer_name` 與 `ISMSContact(role='ISMS lead')` 是**同一個人的兩份紀錄**，兩者都建了；(b) `13:33` 說 OpCo admin **can edit** 而 `permMatrix.js:11` 給 **Read**，且 permMatrix 另給 Regional ISO Edit；(c) `status` / `region_code` / `posture` 三欄被本片拒絕，M6c 若需要要有裁決而非默默補 | 這三件都不是資料層能解的 —— 它們要 UI 與角色模型存在才有標的。⚠️ 連帶：本片 AP-3 的那 1 次也在這裡解封（版本表有消費者的那一天）| 候選 |
| `AD-SchemaTemporalConventionSplit-1` | **同一個 schema 有兩種時間慣例**，而宣稱「對齊」的那句註解已經不成立：`RMReportVersion:1817` 寫「Timestamptz, matching Issue.dueDate and ControlTest.scheduledFor. A second temporal convention for one column would be the invention」，但 `Risk.reviewDue`（W05）與 `Regulation.effectiveDate`（W15）**都是 `@db.Date`** | 定一條可執行的判準（例如「來自來源文件的日曆日期用 `Date`，系統事件用 `Timestamptz`」）並修那句註解。⛔ 不要靠每次重新判斷 —— 本片就是第 3 個要重新判斷的人 | 候選 |
| `AD-IntSuiteNoMutex-1` | **兩個 int suite 並行會互相摧毀**：`int-global-setup.js` 無條件 DROP + CREATE `isms_test`，而症狀出現在**別人的測試**上（本片實測 13 紅 / 4 suites，含 `soa`、`policy`、`entity scoping`，以及 `PrismaClientConstructorValidationError`） | setup 取一把 advisory lock，或以 PID / worker id 分資料庫名。⚠️ 今天沒有任何東西阻止它，而錯誤訊息**完全不指向真正的原因** | 候選 |
| `AD-NeutralisationCountUnderPredicted-1` | **五次中性化，三次預測不正確，三次都是把紅的條數估低**（N2a 0 vs 1、N3a 2 vs 1、N3b 3 vs 1）。⭐ 且 N2a 揭露一個更根本的東西：**seed 本身是一條對 schema 的斷言，而沒有任何東西把它標成斷言** —— 縮小父表唯一鍵時 fixture 先炸，得到的是 setup crash 而不是具名失敗 | (a) 預測**承諾形狀與位置，對條數給區間**：一個好的測試套件本來就會讓一個改動觸發多條斷言；(b) ⭐ **「比預期更紅」本身不帶資訊，帶資訊的是紅的位置** —— N1 那次多出的 12 紅是汙染、N3b 那次多出的 2 紅是覆蓋，分辨方法是「每一條紅是否都能由該改動解釋」 | 候選 |

**既有 AD 的狀態變更**：

- ✅ **`AD-DesignAlign-7` 關閉** —— 使用者 2026-08-16 裁定保留三個 certifier / reply 欄
- ⭐ **`AD-UniqueKeyOracle-1` 第 3 個資料點，且是第一個「正面」的** —— 前兩次都是發現 oracle 並移除；
  本片在**建表之前**套判準，並用 N2b 證明拿掉它 oracle 就會出現。ROADMAP 4d 的 `[ ]` 已勾
- ⭐⭐ **`AD-DevDbChecksumDrift-1` 第 5 次，且首次拿到真實數字** —— `isms_dev` 17 / 22，
  head 自 W10 未動。前四次都用 int suite 的重建訊息代替，而該訊息**結構上看不見 checksum 漂移**
- **`AD-SchemaMigrationDrift-1` +2 個具體實例**（DR12：SoA 索引名被截斷、`audit_log` bytea 預設表示法）
- **`AD-PartialGateReportedAsFull-1` 第 4 次，形狀是新的** —— gate 有跑、回報正確，
  而 commit 用 `;` 串接所以不受它 gate。⇒ 修法多一條：gate 與 commit 之間用 `&&`
- **`AD-SchemaHeaderStale-1`** —— `schema.prisma` 的 model count 改為**自我可重現**
  （header 寫出重跑指令）；`Scope:` 行**刻意不補**（連續三片漏同一行是值得記錄的 pattern）

---

## Q7 — Carryover

- `AD-W15ConstraintSurfaceUntested-1` 的解封條件**與本片的 M6c 落點重合** ——
  那一片同時要補 W15 三張表的缺口與本片五張表的 repository
- ⛔ **M1 的 DoD 仍未達成** —— 其餘 **6** 張表是 slice 12..N
  （`Event` · `posture_snapshot` · `retention_policy` · `LegalHold` ·
  `AccessRequest` · `AccessReviewCampaign`）
- 🔴 **`AccessRequest.org_entity_id` 是 nullable（`02a:325`）而無任何裁決文件** ——
  建它之前必須 STOP and ask
- `AD-RatingBand-1`（BACKLOG:224）與 `AD-RiskBand-1`（:231）**仍是同一件事的兩條登記**，
  且對 gate 期限說法互相矛盾（M7 vs M8）—— 建 `posture_snapshot` 前必須先併

---

## Closeout Self-Check

- [x] CLAUDE.md 只有導航 / 原則層級變更（Current-Phase + Last-Updated 各 1 行）
- [x] MEMORY.md 是 ~300 字元指標，不是打包摘要
- [x] 細節單一來源在 subfile + 本檔
- [x] Carryover 在 `01-planning/BACKLOG.md`，不在 CLAUDE.md
- [x] Matrix row ≤ 250 字元；敘述在 log
- [x] `plan.md` frontmatter `status:` 已翻，內文標記一致（R9）
- [x] `run_all.py` 全綠（含 `check_status_markers`）
- [x] Checklist 沒有被刪掉的 `[ ]` 項
