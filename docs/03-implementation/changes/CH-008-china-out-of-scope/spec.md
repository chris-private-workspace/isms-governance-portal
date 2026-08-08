---
status: done
affects_components: []
---

# CH-008 — 中國移出範圍：拓撲收斂為單一區域

**Date**: 2026-08-08
**Phase**: 無（獨立 Change）
**Scope**: docs only — 無 code / 無 migration / 無新依賴
**Status**: 已完成（使用者 2026-08-08 核准 §Problem + 範圍 + Acceptance）
**PR**: #12

---

## Problem

使用者決定將中國移出平台範圍（2026-08-08）。這觸動兩層權威：

| 層 | 現況原文 |
|---|---|
| `CLAUDE.md` 已確認參數 **#4**（15 項防再議清單）| 「印度排除、**中國納入 → PIPL 落地是硬需求**，第一天分區部署」 |
| **ADR-0006**（已採納）| Context 建立在「China is in scope (已確認參數 4), so PIPL localisation is a day-one requirement」 |

不處理的三個具體後果：

1. ADR-0006 仍宣稱要 Azure China 部署 → **資源申請單會是錯的**，M0 的 IaC 會照錯的拓撲建
2. `15:11` 仍寫 14 OpCo / 12 管轄區 → M8 儀表板 fixture 與 obligation library 都會照錯的數字建
3. CH-001 的 `cross_border_max_tier` 機制失去唯一使用案例 → 照建就是 **AP-5 Speculative Abstraction**

**量化**：覆蓋 grep（見 §Verification）在 34 個檔案找到 173 處命中 ——
判定後 **18 檔需改 + 1 份新 ADR**，5 檔保留、7 檔為歷史、4 檔為誤報。逐檔判定表在 `progress.md`。
旁證：`15:28` 的 RCN 是 14 家中**唯一**連公司代碼與法人名都未確認的（原文標著 *(code and legal name to confirm)*）。

---

## Root Cause

**不是「當初設計錯了」。** ADR-0006 在中國在範圍內的前提下是正確決定，其核心論證
（`03:133` 三種法律答案共用同一拓撲）至今仍成立。

根因是**前提本身變了**，而 `14-adr/README.md:110` 早就寫明這種情況的處理原則：

> 舊決策當時是對的（基於當時的資訊）。保留它讓後人看到**判斷是怎麼演化的**。

所以這不是修正錯誤，是記錄前提變更 —— 這直接決定了做法：**寫新 ADR 取代，不改舊 ADR**
（`14-adr/README.md:102-108`）。

---

## Solution

### 範圍決策（使用者拍板 2026-08-08）

**選了**：

- 中國**移出範圍**（非延後）
- 中國 OpCo **不上平台** —— 不建 entity、不輸入資料
- 部署收斂為**單一區域 × 3 環境**（dev / staging / prod），單一 tenant
- prod 獨立 subscription；dev + staging 共用
- prod RTO 4 小時 / RPO 15 分鐘；dev / staging 不開 HA

**放棄了**：分區部署能力。**代價明說** —— 若越南／印尼日後收緊，那時是重架構不是設定變更。
`03:148` 原本承諾「同一機制、不需要新 ADR」，該承諾隨中國一起失效。

**本 CH 只做範圍變更本身。** Azure 資源清單 → CH-009；計算形態 → ADR-0011。

### 逐項變更

**1. 新增 ADR-0010**（`docs/14-adr/0010-single-region-deployment-topology.md`）—— 單一區域部署於
Azure、3 環境；§相關寫 `取代: ADR-0006`。含五個必備區塊與可證偽條件。

**2. ADR-0006 Status 一行**（`docs/14-adr/0006-*.md`）—— `已採納` → `已被 ADR-0010 取代`。
**內文一個字都不改**，理由見 §關鍵設計細節。

**3. 導航與索引層**（4 檔）—— `CLAUDE.md`（Tech Stack / 已確認參數 #4 / guardrail 8 例子 /
`entity-scope` 職責 / 約束 7 理由 / Services 拓撲註 / Environment Setup）· 根 `README.md` ·
`docs/architecture.md` · `docs/14-adr/README.md`。

**4. 設計文件層**（10 檔）—— `00` D6 · `01` §Design principles · `02a` §Jurisdiction +
§posture_snapshot（**加註記不刪**）· `03` §Jurisdiction + §Cross-border（**加標頭不刪**）·
`06` §Open decisions · `07` §Foundation hard requirements + **M0 DoD** · `10` obligation 例子 ·
`14` §Sovereignty · `15` §1 · `16`:78。

**5. 規則層**（1 檔）—— `docs/rules-on-demand/multi-tenant-data.md` §資料落地與滾升的張力。

**6. 追蹤層**（2 檔）—— `decision-form.md` OQ-1 重指向 ADR-0010 · `BACKLOG.md`
（關 `AD-Decider-1`、改 `AD-Residency-1` / `AD-Mockup-3`、新增 `AD-Constraint7-1`）。

### ⭐ 關鍵設計細節

- **不改 ADR-0006 內文，只動 Status 一行。** 拿掉這個紀律，六個月後沒人知道當初為什麼決定分區部署，
  也就無從判斷這次移除是不是搞錯了。驗收條件 A2 用 `git diff` 機械檢查這一點。
- **CH-001 的分析保留，機制不建。** 這兩件事必須分開：分析（`03` 的欄位分級表、`02a` 的
  `cross_border_*` 欄位定義）是資產，**機制**（DB 層強制、replication）沒有消費者。
  混為一談的結果不是丟掉有價值的分析，就是建一個 AP-5。
- **`Jurisdiction` 實體仍要建。** 它承載 obligation library 的管轄區標記（`10` frameworks-first），
  與跨境無關。若因這次變更順手拿掉，M2 會缺一個核心實體。
- **ADR-0001 不重開。** `0001:38` 的三個 API 消費者少一個（跨區滾升），但主論據
  （收斂 vs 加第四個 stack）不受影響，另外兩個消費者仍在。**ADR-0010 §Consequences 必須記下
  這條論據已失效** —— 否則後人讀 ADR-0001 會以為它還在。
- **對 stakeholder 的訊息要更正。** ADR-0006 §Consequences 記錄了已向 Regional ISO / Group CISO
  說明 13/14 覆蓋且「reversible by configuration」。**數字沒變，性質變了。**
- **`Deployment-portable` 是設計原則不是中國的產物。** `CLAUDE.md:59` / `01:53` 的可攜性原則
  其理由句提到 APAC 落地要求。**保留原則，只改理由句** —— 憲章 `00` 的地端／主權部署選項獨立於中國存在。

### 明確不做的

| 不做 | 去向 |
|---|---|
| Azure 資源清單 | **CH-009** |
| 計算形態（App Service vs Container Apps）| **ADR-0011**（CH-009 的前置）|
| 約束 7 的完整理由改寫 | `AD-Constraint7-1`。本 CH 只修正**事實錯誤**（「中國在範圍內」），不重寫論證 —— 那需要 Wave 3 的 runtime |
| 移除 `posture_snapshot` | **不動** —— 仍是 `08` 旗艦儀表板的資料來源，只是不再跨境 |
| i18n 語言集（简体中文）| 併入既有 `AD-DesignAlign-2` |
| 歷史記錄（CH-001/003/005、`09-analysis/*`）| **不動** —— 變更記錄與稽核報告是當時的快照，改了就毀掉可追溯性 |

---

## Verification

### Gate

`run_all` 6/6 · actionlint · detector tests 8 · CI 綠

### 新增測試

無 —— 純文件變更，無 code。負面驗證改用機械檢查：

- `check_doc_links` —— ADR-0010 的相對連結全部解析
- `check_path_references` —— 導航檔內的 repo 相對路徑仍成立
- `check_status_markers` —— 本 CH 的 frontmatter status 流轉

### 覆蓋聲明 ⭐

**方法**：`Grep -i "China|中國|PIPL|RCN|21Vianet|DSL|CSL|跨境|cross-border|cross_border|residency|落地"`
掃全 repo `*.md`。

**結果**：**173 處命中 / 34 個檔案**。逐檔判定三類 —— 該改 / 保留為歷史 / 誤報。
完整判定表在 [`progress.md`](./progress.md) §覆蓋判定。

**沒掃到什麼**：非 `.md` 檔（目前無 code）· `reference/` 與 `docs/reference/`（刻意不在版控中）。

### Drive-through

⚪ **N/A（純文件 —— gate-only verified）**

### ⚠️ 覆蓋 grep 抓到而 spec 起草時沒抓到的

**spec 起草時估 9 處，實際 21 個檔案需改。** 見 §Changelog D1。
若沒有這道覆蓋聲明，`07:31` 的 **M0 DoD**（仍寫著「per-region deployment topology decided
(ADR-0006) so China/PIPL residency is honoured」）會留在原地 —— 那是一條硬 gate，
W01 開始時會照它驗收。

---

## Impact

- **Breaking change**: no（無 code）
- **Migration required**: no
- **Config change**: 無
- **重啟需求**: 無
- **Rollback**: revert PR。⚠️ **但 stakeholder 溝通不可 rollback** —— 若已向 ISO / CISO 更正過訊息，
  revert 只回復文件，不回復那段對話。

---

## Acceptance

| # | 條件 |
|---|---|
| A1 | ADR-0010 存在，含**五個**必備區塊（Context / Options / Decision / Consequences + 可證偽條件 / **Security & compliance impact**，`06:70`）|
| A2 | ADR-0006 Status = `已被 ADR-0010 取代`，且該檔 `git diff` **只有一行** |
| A3 | `CLAUDE.md` 已確認參數 #4 與 `00` D6 一致 |
| A4 | `15` §1 = **13 OpCo / 11 管轄區**，RCN 列移除 |
| A5 | 覆蓋 grep 完成，每一處有判定，判定表在 `progress.md` |
| A6 | `run_all` 6/6 + CI 綠 |
| A7 | BACKLOG（R7）/ decision-form（R4）同步 |

---

## Changelog

| # | 偏離 | 影響 |
|---|---|---|
| **D1** | spec 起草時估「9 處文件」，覆蓋 grep 實測**需改 18 檔 + 1 份新 ADR** | 範圍決策不變（仍是 docs only、仍只做範圍變更本身），但工作量約 2×。新增的主要是設計文件層：`02a` · `01` · `10` · `14` · `16` · `multi-tenant-data.md`，以及 `07:31` 的 **M0 DoD**（硬 gate，漏改代價最大）|
| **D3** | 覆蓋 grep 順帶發現 **`docs/architecture.md` §3 + §5 是 CH-005 的遺漏** —— 範疇表 8 列全寫「待 ADR-0001」、決策表全寫「未定」，但那三份 ADR 早已採納 | 一併補齊。這不在原範圍內，但只改一半會留下自相矛盾的表。詳見 `progress.md` |
| **D2** | spec §明確不做的 原寫「約束 7 理由改寫 → Wave 3」。實際發現 `CLAUDE.md:245` 的理由句含**事實錯誤**（「中國在範圍內」），留著等於在 always-loaded 檔裡放一句假話 | 改為：本 CH 修正事實、保留約束、把**論證重寫**留給 `AD-Constraint7-1` |

---

## 相關

- **關掉的 AD**: `AD-Decider-1`
- **產生的待辦**（→ `docs/01-planning/BACKLOG.md`）: `AD-Constraint7-1`（約束 7 論證待重寫）·
  `AD-Residency-1` 重新評估 · `AD-Mockup-3` 內容更新
- **取代**: ADR-0006 → 由 ADR-0010
- **後續**: `CH-009`（Azure 資源清單）· `ADR-0011`（計算形態）
