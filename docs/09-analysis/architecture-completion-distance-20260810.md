# 距離 `02-architecture` 規劃完成還有多遠 — 分析報告

> 🕐 **這是 2026-08-10 的快照**（`main` = `bf3133e`，W03 已 merge）。系統會變；引用前先確認仍然成立。

**觸發**: 使用者問「要準備好這個專案、完成 `docs/02-architecture` 內所規劃的內容，還差多少距離」。
**範圍**: 對照 `02-architecture` 的建置計畫（`07`）、實體索引（`02a` §0）、基礎服務（`05`）、
設計交付物螢幕數，與 `apps/` 的**實際 runtime**。
⛔ **不含**：19 份設計文件彼此的內文一致性（`STATUS_AUDIT.md` §涵蓋聲明同樣列為未掃）。
**方法**: 讀 `schema.prisma` 全文 · `find` 列 `apps/**` 全部原始檔 · 逐行解析 `02a` §0 三張索引表 ·
`ls` 設計交付物 `fragments/`。**不用檔案數或行數回答需要讀內容的問題**（`AD-GrepAssertion-1`）。

## 結論（先講）

**Wave 1 的 12 個里程碑，完成 1 個「部分」+ 1 個「大部分」，其餘 10 個未動。**
資料模型建了 **3 / 35** 個 Wave 1 實體；使用者介面建了 **0 / 30** 個螢幕；
八個範疇目錄有 **4 個仍然完全空**（`identity` · `workflow` · `audit-trail` · `contracts`）。

但**數量不是主要障礙，序列才是**。三件比百分比更重要的事：

1. **M1 在建置序列上不可能乾淨完成** —— `02a` §1.1 的 13 個 base field 裡有 4 個
   （`owner_user_id` / `created_by` / `updated_by` / `status`）依賴 M4 與 M5，而兩者排在 M1 **之後**。
   已建的 `Policy` 表正是這樣：header 自己列出五類刻意留空的欄位。**這不是疏漏，是計畫順序的必然結果。**
2. **M4 今天沒有可建的規格** —— `User` / `Role` / `Permission` 只在 `02:37` 有一列概念，
   **不在 `02a` §0 的「complete index」裡**，而該節明訂「不在清單上的不可建」。
3. **M3 與 M5 各被一個未拍板的 ADR 擋著**（0003 稽核鏈 · 0002 workflow engine），兩者都需要 spike。
   **M1 沒有路障是真的，但那是唯一沒有路障的里程碑。**

## 證據

### C1 — 里程碑（`07` §Build sequence 的 12 項）

| # | 里程碑 | 狀態 | 實據 |
|---|---|---|---|
| M0 | Repo / pipeline / 部署形狀 | 🟠 **部分** | 3 關閉 / 2 部分 / 1 無標的，連續三個 phase 未動。⚠️ 其中 DAST 與 IaC **不是本專案單方面能關的** |
| M1 | Data foundation | 🔴 **3 / 35 實體** | `schema.prisma:66,107,159` = `OrgEntity` · `Policy` · `ExtensionField`。governed-extension 機制 ✅（ADR-0005 已元驗證）|
| M2 | Entity & jurisdiction | 🟢 **大部分** | W02 提前交付 RLS + `FORCE` + `WITH CHECK` + `app_entity_scope()`；32 個整合測試。**剩**：組織階層只有表沒有資料、`Jurisdiction` 表不存在 |
| M3 | Audit trail | 🔴 **0** | `apps/api/src/audit-trail/` 只有 `.gitkeep` + 一個 boundaries 負面測試 fixture。ADR-0003 未拍板（OQ-4 開放）|
| M4 | Identity & RBAC | 🔴 **0，且無規格** | `identity/` 只有 `.gitkeep`。臨時替代品是 `dev-principal.ts`，**它在 `NODE_ENV=production` 下拋錯** |
| M5 | Workflow engine | 🔴 **0** | `workflow/` 只有 `.gitkeep`。ADR-0002 未拍板（OQ-7 開放，需 spike）|
| M6 | 證明模組：Policy | 🔴 **~5%** | 表存在但 `category` / `effective_date` / `review_due` / `body_ref` / `requires_attestation` 全缺（`schema.prisma:104-105` 自陳）|
| M6b | 資產盤點 + 威脅/弱點庫 | 🔴 **0** | `AssetGroup` · `Asset` · `Threat` · `Vulnerability` 四表皆不存在 |
| M6c | APAC ISMS profile | 🔴 **0** | `ISMSProfile` · `ISMSSite` · `ISMSContact` · `ApprovedOffering` 皆不存在 |
| M7 | 證明模組：Risk + Control | 🔴 **0** | 另有 🔴 P0 `AD-RiskForm-1`（設計交付物實作的是另一套方法論）|
| M8 | 滾升儀表板（**旗艦**）| 🔴 **0** | 另有 🔴 P0 ×2（`AD-Mockup-2` / `-3`：以國家為鍵，容不下 13 OpCo）|
| M9 | Entity Zero | 🔴 **0** | 過渡承載體是 `RISK_REGISTER.md` 的四條遷移標記 |

**強度：已驗證**（每一列都有 `file:line` 或目錄實據）。

### C2 — 資料模型：Wave 1 需要 35 個實體，建了 3 個

| 來源 | 規劃 | 已建 |
|---|---|---|
| `02a` §0 共用核心 | 23 | **3**（`OrgEntity` · `Policy` · `extension_field_catalog`）|
| `02a` §0 基礎服務（`05`）| 8 | 0 |
| `13` ISMS profile 模組（Wave 1）| 4 | 0 |
| **Wave 1 小計** | **35** | **3** |
| Wave 2 模組實體（`11` · `12` · `17`）| 8 | 0 |

**強度：已驗證** —— 逐行解析 `02a` §0 三張表 + `schema.prisma` 全文。

### C3 — ⭐ `User` 不在「完整索引」裡，而 M1 的每張表都要指向它

`02a` §0 自稱 "**Every** entity in the platform" 且 "Nothing is buildable that is not on this list"，
但 `User` / `Role` / `Permission` 只出現在：

- `02a:92` —— base field `owner_user_id | UUID FK → User`（**引用，不是定義**）
- `02:37` —— 一列 `` `User` `Role` `Permission` | Identity & access (see `05`) | — ``（**指向 `05`**）
- `05` §Identity —— 描述認證委派 OIDC 與授權模型，**沒有欄位級規格**

**三處互相指向，沒有一處定義欄位。** 後果不是「少一張表」，而是 **M4 今天不可開工**
（照 §0 的規則，它不在清單上）**且 M1 的每張表都會缺 3 個 base field**。

**強度：已驗證**（`grep 'User'` 於 `02a` 僅 1 命中，即 `:92`）。→ 已登記 `AD-UserEntitySpec-1`

### C4 — 前端：30 個螢幕，實作 0 個，且沒有任何速度資料點

`design_handoff_isms_grc_platform/fragments/` = **27 screens + 3 shell**。
`apps/web/src/` 全部內容為 `layout.tsx` · `page.tsx` · `i18n/index.ts` · `i18n.test.ts` —— **四個檔**。

⚠️ **W01/W02/W03 累計 UI drive-through 0 次**（`STATUS_AUDIT.md` §2.8）。
這使前端成為唯一**完全沒有本專案自身速度資料**的部分，而旗艦（M8）正在其中。

**強度：已驗證**。

### C5 — 範疇填充：8 個裡 4 個空

| 範疇 | 檔數 | 狀態 |
|---|---|---|
| `core-model` · `entity-scope` | 9 · 9 | ✅ 有實質實作 |
| `modules` | 7 | ✅ 僅 `policy` 一個模組 |
| `identity` · `workflow` · `contracts` | 1 · 1 · 1 | 🔴 **只有 `.gitkeep`** |
| `audit-trail` | 2 | 🔴 `.gitkeep` + 一個 boundaries 測試 fixture，**無實作** |

產品程式碼（排除測試 / generated / fixtures）**1,596 行**。

**強度：已驗證**。

## 距離的量級 —— 以及為什麼不給小時數

**可靠的量**：9.5 個里程碑未完成 · 32 個 Wave 1 實體未建 · 30 個螢幕未建 · 4 個空範疇 ·
2 個未拍板 ADR 各擋一個里程碑。

**不給小時數的理由**（這是判斷，不是迴避）：

1. **`actual` 的定義本身還沒拍板** —— `AD-CalibrationMetric-1` 量到三個 phase 的登記值混裝了
   「牆鐘」與「若由人手做要多久」兩種量（W02 的 12.1 hr **大於**它自己的 8h10m 窗口，算術上不可能）。
   **用一個定義未定的量去外推 9 個里程碑，是假精確。**
2. **前三個 phase 買的是機制不是實體** —— 17 小時牆鐘產出 3 個實體，但其中絕大部分是
   RLS、governed extension、CI gate 的**一次性成本**。第 4 到第 35 個實體不需要再拍板 ADR-0004/0005，
   所以線性外推（32 × 5.6 hr ≈ 180 hr）**幾乎確定高估**，但高估多少無從得知。
3. **最大的一塊沒有任何資料點** —— 30 個螢幕、0 次 UI drive-through。

**能說的**：以里程碑為單位、每個里程碑 1–3 個 phase、每個 phase 4–8 小時牆鐘（W01–W03 實測區間），
Wave 1 剩餘工作約 **15–25 個 phase** 的量級。⚠️ **這個區間不含前端**，因為前端沒有基準。

## 未驗證 / 未查的

- **19 份設計文件彼此的內文一致性** —— 不在本次範圍（與 `STATUS_AUDIT.md` 相同的排除）
- **Wave 2 / Wave 3 的完整規模** —— 只數了實體（8 個 module-local）。`10` 的 obligation 模組與
  `14` 的 AI agent 各自的螢幕與服務數**未展開**
- **每個實體的欄位數** —— 只數實體，未逐一數欄位。故「35 個實體」是**個數不是工作量**
- **`02a` §0「Not yet specified」五個概念的規格成本** —— 它們明訂不得建置，成本無從估

## 可證偽條件

- 若 `02a` §0 之外存在一份定義 `User` 欄位的文件 → **C3 錯**，M4 的阻塞判斷要撤回
- 若某個里程碑實測 < 1 個 phase → 「1–3 個 phase」的量級假設偏保守，區間要下修
- 若第 4–10 個實體的實測速度顯著快於 W02/W03 → 印證「機制是一次性成本」，區間下修

## 後續

- 待辦 → `../01-planning/BACKLOG.md`：`AD-UserEntitySpec-1`（C3）
- 排序 → `../01-planning/ROADMAP.md`：M3 / M5 各需一個 ADR spike，**應在 M1 期間並行表面化**
- 本報告**不產生新的規劃文件** —— 依 CLAUDE.md §禁止反模式，
  「先寫一批新規劃文件再實作」是明文禁止的；文檔成長跟隨已驗證的 runtime
