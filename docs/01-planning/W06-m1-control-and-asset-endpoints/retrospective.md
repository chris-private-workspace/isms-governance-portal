# Phase W06 — Retrospective

**Phase**: W06 — M1 slice 3：控制庫與資產寫入路徑
**Period**: 2026-08-11 ~ 2026-08-12
**Plan**: [plan.md](./plan.md)
**PR**: **MERGED** #41（rebase，main head `3a3606b`，2026-08-12 02:57 UTC）—— 六個 required check 全 SUCCESS
**Change record**: `docs/03-implementation/changes/CH-021-w06-control-and-asset-endpoints.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `CLAUDE.md` 結構性瘦身 —— headroom **196 → 1,521** | ✅ 完成 |
| US-2 | **D1 拍板 + ADR-0014**（含 4 條可證偽條件）· D2/D3 拍板 | ✅ 完成 |
| US-3 | `Control` 表 + `/controls`，`type`/`nature`/`frequency`/`effectiveness` 逐字對照 `02a` | ✅ 完成 |
| US-4 | `/assets` · `/asset-groups` + 約束 8 四項對三張表成立 | ✅ 完成 |
| US-5 | API-level 驗證 + **元驗證 6 組** | ✅ 完成（⭐ **找到真缺口並修好**）|
| US-6 | W05 兩條條款逐條裁決 + W04 七不變式第二次負載 | ✅ 完成（見下）|

**未完成項目**：無。

⚠️ **AC-5 的措辭要據實說明**（plan §5 第 5 條寫「三種拒絕（RLS / 複合 FK / 不存在）body **逐字相同**」）：

- **成立的**：同一個欄位的「存在但不是你的」與「根本不存在」→ **逐字相同**
  （`asset group not found`，走查 A8/A9 與 int 5 各驗一次）。這是 oracle 防護真正要的東西。
- **不成立、而且不應該成立的**：RLS 拒絕給的是 `org entity <id> not found`，
  與 FK 拒絕的 `asset group not found` **不同**。⭐ 但那是**不同欄位**的錯誤 ——
  呼叫者本來就知道自己送了哪個欄位，分辨它們**不洩漏任何存在性資訊**，
  而合併成同一句反而讓 400 級的使用者錯誤更難修。W03/W04/W05 都是這個形狀。
- **裁決**：AC-5 依「同欄位配對逐字相同」的讀法**達成**；**plan 的字面措辭不精確**，
  下個 phase 起寫成「**每一組『存在但不是你的』／『不存在』配對逐字相同**」。
**超出 plan 的**：`artifacts/` 四個證據檔（量測要求隱含）· BACKLOG 三條新 AD ·
**本 phase 由 `pattern-reuse-feature` 改判 `spike`** → 多產出一份 design note。

### ⭐ US-6 —— W05 追加兩條條款的裁決（**本 phase 對 slice 4 最有價值的產出**）

| 條款 | 裁決 | 理由 |
|---|---|---|
| **1. 跨實體 FK 一律複合** | ✅ **夠用** | W05 建了它但無法讓它開火；W06 給了它負載，`asset.int:171` 證明**兩種原因逐字同錯誤**、中性化退化成單欄 FK **2 個測試轉紅** |
| **2. 每張表一個「繞開發號」的直接寫入測試** | ⛔ **需再加，而且是被實測推翻的** | 它宣稱釘住 `WITH CHECK`，**實際上沒有**。中性化 `WITH CHECK` → **一個都沒紅**。根因：Prisma `create()` 一定發 `RETURNING`，PostgreSQL 把 SELECT policy 套在回傳列上 → 測到的是**讀的 policy 藏住了列** |

**條款 2 的修正文字**（供 slice 4 起沿用）：

> 每張表一個繞開發號的直接寫入測試，**且該寫入不得產生 `RETURNING`**
> （Prisma 用 `createMany`，不是 `create`）。
> **驗收方式不是它綠，是把該表的 `WITH CHECK` 中性化後它會紅。**

⚠️ 這條條款**本身就是為了防 `AD-BorrowedRefusal-1` 而在 W05 追加的** ——
我 Day 2 照它做了三個測試，三個都沒做到它宣稱的事。
**一條規則能被完整遵守卻仍然無效，這是本 phase 學到最貴的一件事。**

### W04 七不變式 —— 第二次負載

| # | 不變式 | W05 裁決 | W06（第二次負載）|
|---|---|---|---|
| 2.1 | counter 是 entity-scoped（不像 `users` 全域）| 可複製 | ✅ 再次成立 —— 跨實體建 control 的拒絕就落在這裡 |
| 2.2 | 序號由 DB 在一個語句內配發 | 可複製 | ✅ |
| 2.3 | 驗證 → 發號 → 插入 | 可複製 | ✅ 兩個 repository 的單元測試各釘住順序 |
| 2.4 | **拒絕點會移動，oracle 防護要在新位置重建** | 可複製 | ✅ **第三次證實** —— control 落在 counter(42501)、asset 落在複合 FK(23503)，兩個都量到 |
| 2.5 | `ref_code` 永不由呼叫者提供 | 可複製 | ✅ |
| 2.6 | 回填與 counter 是同一個變更 | 不適用 | ✅ **這次適用了** —— seed 的 `control` counter 由種入的列**推導**而非寫死 |
| 2.7 | schema 層的權限 | 可複製 | ⚠️ **成立但需補一句** |

⭐ **2.7 的補充（W06 新知）**：**權限檢查在 RLS 之前**。
`isms_app` 沒有 `DELETE` 授權時，`deleteMany` 得到的是 `permission denied for table`，
**語句根本到不了 policy 層**。W04 的 2.7 只說「權限是 schema 層的」，沒說**它會先擋**——
而這個順序決定了一個測試證明的是哪一層。

**結論：可複製 6 / 需補充 1 / 不適用 0**（W05 是 6/0/1）。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `spike`（**第 4 個資料點**；⚠️ 起手宣告為 `pattern-reuse-feature`，Day 1 改判）
- **Agent-delegated**: `no`（plan 時宣告，實際亦無委派）→ 三段式
- **Bottom-up est**: **13 hr**
- **Committed (calibrated)**: ~6.5 hr (mult 0.50) → **改判後 ~8.5 hr (mult 0.65)**
- **Actual**: ⛔ **無法可靠量測** —— 見下
- **Ratio**: ⛔ **不產出**
- **Band 判定**: ⛔ **不判**

### ⛔ 為什麼不產出 ratio（這是 `AD-CalibrationMetric-2` 的第一次實際套用，而它失敗了）

`AD-CalibrationMetric-2` 把 `actual` 的定義改成 **branch 第一個 commit → closeout commit**，
用來修掉 W05 「base 是前一個 phase 的 closeout」的污染。**本 phase 是它的第一次套用。**

逐字套用得到：`cc74455` 2026-08-11 16:55 → closeout commit 2026-08-12 ≈ **17.8 hr**，
對承諾的 8.5 hr → ratio **≈ 2.09**。

**這個數字沒有意義，而且是同一種污染**：中間跨了一夜（17:27 → 09:47，約 16.3 小時無活動）。
新定義只移除了「上一個 phase 的 closeout 當 base」，**完全沒有處理閒置區間**。

commit 時間戳能看到的**只有 session 內相鄰 commit 的間隔**：
Day 0-1 段 **31.7 min**（16:55:16 → 17:26:55）· Day 2-3 段 **24 min**（09:47:28 → 10:11:26）。
兩者都嚴重低估，因為**每個 session 第一個 commit 之前的工作全部看不見** ——
Day 2 的 schema + migration + 兩個 repository + 兩個 controller + 6 個測試檔
全部落在 `c60d0ee` 與 `8eb8897` 之間那段「無 commit」的區間裡。

⭐ **真正的根因不是量尺壞了，是我沒用量尺。**
`task-workflow.md` §Step 5 明文要求 progress.md 每日記錄逐任務實際工時
（「per-day 估算住在這裡」）。**W06 的 progress.md 一次都沒有記。**
所以我手上沒有資料，**而我不會用推估的數字填進去** —— 那會污染這個 class 的第 4 個點。

**行動**: **KEEP 0.65，本點記為「無有效 actual」**。
⚠️ **不得與未來的點併入 3-phase 窗口** —— 與 `pattern-reuse-feature` 那個受污染點同樣處理。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md`
- [x] AD 已記入 BACKLOG（`AD-CalibrationNoActual-1`）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**7**（Prong 1: **0** / Prong 2: **6** / Prong 3: **1**，另 `D-devdb` 檢查為乾淨）
- Day-0 成本：~30 min
- **預防的返工**：~**3-4 hr**
- **ROI**: ~**7×**

**最有價值的那個 drift**：⭐ **`D-precedent`** —— 它不在原 checklist 上，是 Prong 2 順著讀出來的。
發現**不對稱的 `USING`/`WITH CHECK` 已經存在於 `extension_fields`**（W03），
於是 D1 從「發明一個新形狀」降級為「判斷既有形狀能不能移轉到業務表」。
**它改變的是問題本身，不只是答案** —— 沒有它，Day 1 會花在重新發明一個 W03 已經有的東西上。

次高：`D-frequency` 與 `D-nature` **直接消滅了兩個待拍板決定**（`02a:123-124` 早有值域）。
⚠️ 錯因值得記：recon 的 pattern **根本沒有 `frequency`**，我把「沒搜過」寫成「零命中」。

---

## Q4 — 做得好的（保持）

- **拍板後仍然繼續量。** A′ 的預覽帶四條 policy；落地前多問一句「本 repo 不授予 `DELETE`，
  那條 policy 碰得到嗎」→ 第二次 throwaway 量測 → **三條比四條更嚴格**。
  ⭐ **使用者選定的東西不等於不能再收緊**（在同一個決定之內）。
- **失敗的測試被當成資訊而不是障礙。** `deleteMany` 的 `count 0` 斷言失敗 →
  發現權限檢查在 RLS 之前 → **改的是測試的宣稱，不是把斷言調鬆**。
- **一個空跑的中性化救了另一個結論。** N4 因 anchor 重複而靜默空跑卻印出綠色；
  正因為看到了它，**N5 的「零轉紅」才沒有被照單全收** → 改成跑完直接查 `pg_policies`。
- **coverage 低於 baseline 時先歸因再補。** 先證明 branch 的退步**不是計數假象**
  （排除 `*.module.ts` 數字一模一樣），才去補 —— 而且補的 6 個測試**每個都有主張**。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 兩個新 module 皆由 `app.module.ts:44-45` 進入主流量 |
| AP-2 Cross-directory scattering | 0 | control/asset 各自集中；建檔前 Grep 過既有 repository |
| AP-3 Potemkin | **0（1 個被攔下）** | ⭐ A′ 的第四條 `FOR DELETE` policy **在寫下去之前**被判定為「中性化不會有任何測試轉紅」→ 改為不寫。⚪ drive-through 不適用（無 UI）→ **API-level verified** |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | `controls` **刻意不建** `@@unique([id, org_entity_id])` —— M7 的連結表不能用複合 FK |
| AP-6 Mock vs real divergence | 0 | 無 mock；dev-principal 於啟動時警告且每個回應帶 `_devPrincipal` |
| AP-7 命名 / orphan claim | 0 | 無版本後綴；`02a:217` 的偏離**已在該行註記**而非留成 orphan claim |
| **總計** | **0** | |

**Lint**: `run_all.py` **6/6** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-ReturningMasksCheck-1` | 「繞開發號」測試證明的是讀的 policy，不是寫的 | 條款 2 改為「不得產生 `RETURNING`」+ 驗收是「中性化後會紅」；`risks` 的 11b 同缺陷待修 | 候選（1/3）|
| `AD-CalibrationNoActual-1` | `AD-CalibrationMetric-2` 的新定義在第一次套用就被跨夜污染；且 progress.md 未記逐任務工時 | **先修執行不修定義** —— 下個 phase 每日在 progress.md 記錄逐任務實際分鐘數；連續 2 個 phase 有資料後再檢討定義 | 候選（1/3）|
| `AD-GroupRowTheft-1` | `extension_fields` 的不對稱 policy 擋不住奪取，`DELETE` 無寫入側防護 | 拆成 per-command policy（W06 已證可行）| 候選（1/3）|
| `AD-SilentFieldDrop-1` | server-owned 欄位被靜默丟棄，呼叫者無回饋 | 一次性決定策略（忽略 / 400 / `_ignoredFields`），別讓每個新欄位各自決定 | 候選（1/3）|

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `risks` 的 int 11b 仍是舊形狀 → `AD-ReturningMasksCheck-1`
- W05 條款 2 的**文字**要更新（design note + 本 retro 已載新版）→ slice 4 起沿用
- **逐任務工時記錄**必須從下個 phase 的 Day 1 開始做 → `AD-CalibrationNoActual-1`
- `applies_to_scope = subtree` · group control 的 runtime 編寫路徑 · 稽核軌跡 → 見 design note §4

**這個 phase 關掉的**：

- `AD-ClaudeMdBudget-1` ✅ **CLOSED** —— headroom 196 → **1,521**（結構性瘦身，非壓縮形容詞）
- **W05 checklist 2.4 的 🚧** ✅ **解封** —— 四項範疇測試對三張表成立
- `D1` / `D2` / `D3` ✅ 全部拍板

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔 + design note
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration 回填 matrix（**本點記為無有效 actual**，不是編一個數字）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— R4 敞口再擴大三條，已更新
- [x] **`plan.md` frontmatter `status:`** —— ⏳ merge 後才翻（R9：只 commit code 不算收尾）
- [x] `python scripts/lint/run_all.py` 全綠
