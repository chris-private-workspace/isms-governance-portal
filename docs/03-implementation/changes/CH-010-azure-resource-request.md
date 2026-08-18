# CH-010: the Azure resource request, and the two parameters it settles

**Date**: 2026-08-10
**Phase**: 無 —— 獨立 CH
**Scope**: `infra` / `docs` —— Azure 資源申請單（PAR）+ ADR-0010 / 0011 的參數回填（**NO 產品 code / NO migration**）
**Components**: —
**PR**: #27 · #28（表單欄位還原）

> **範圍由使用者 approve（2026-08-10）**：先填申請單，再回填 ADR-0010 的區域欄位並開本紀錄。

---

## Problem

兩份**已採納**的 ADR 各把一個參數延到「資源申請單」，而那份申請單一直不存在：

| 延後的參數 | 出處 | 原文 |
|---|---|---|
| 用哪一個區域 | `ADR-0010:73`（**回填前**；原文現保存於同檔的日期註解）| "region choice deferred to `CH-009` with the resource request" |
| 用哪一套 IaC | `ADR-0011:115` | "ARM/Bicep … versus Terraform is deferred to `CH-010`" |

同時 M0 DoD 第 5 項（`07:31` TLS／憑證／管理埠**明確設定**）在 W01 retrospective 只能標「部分」，
理由是「屬部署期，infra 尚未佈建」。在環境存在之前它無法推進，而環境需要一份走 1–2 週、
終點是 GM 核准的 PAR。

⚠️ **`ADR-0010:73` 指向的是 `CH-009`，而 CH-009 已被改派給 track-classification fix。**
同一份 ADR 的 §相關（`0010:176`）早就留了一則日期註解說明這次改派 —— 但 73 行沒有一起改。
一個過期指標，就活在本該抓到它的那則更正旁邊。

---

## Root Cause

**延後本身是對的，沒有關掉才是問題。** 區域選擇不是拓撲決策；在不知道 RCI 有哪些資料中心之前
就先挑一個，那是用猜測冒充決定。ADR-0010 把它延後是誠實的。

但**「延到某份記錄」只有在那份記錄存在時才會關閉**。從 2026-08-08 到今天，兩份 ADR 指向 CH-010、
`AD-ChNumber-1` 為它保留編號 —— 這個編號承載了四處前向引用，卻解析到空無一物。
`check_path_references.py` 驗證的是**路徑**，跨記錄的**編號引用**不在任何 detector 的射程內
（`AD-StaleRecordRef-1`）。

---

## Solution

### ① 兩個參數的答案

| 參數 | 答案 | 依據 |
|---|---|---|
| 區域 | **RCI3 — Azure Singapore Datacenter** | 使用者拍板 2026-08-10 |
| IaC 工具 | **兩個都不選 —— 本專案不寫 IaC** | infra team 建立並營運全部 Azure 資源（2026-08-08 確認）。ADR-0011 問「ARM/Bicep 還是 Terraform」，誠實的答案是**這裡沒有東西可選** |

⚠️ **區域選擇有一個被提出、但未被採納的反面論據，記在這裡以免日後重提**：
起草時建議 RCI1（Azure Hong Kong），理由是 RAPO（填本表單 Section 2 的區域 IT）在香港，
且公司既有生產估算 RAPO-ITPM / RAPO-SCM 的 publish hostname 是 `waws-prod-hk1-*`，
即既有 estate 在 HK —— 亦即 ADR-0001 / 0011 一貫用的「estate convergence」論證指向 HK。
使用者選 RCI3（新加坡）。**這是使用者的決定，不是疏漏**；記下來是為了讓六個月後問
「為什麼不是香港」的人有答案，而不是重跑一次分析。

### ② 申請單本身

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/06-reference/02-azure-resource-request-form/PAR-APAC-ISMS-Governance-Platform-2026-08-09.docx` | 新增 | 填好的 Section 1。空白母本**未動** —— 它是版控中的模版 |
| `docs/06-reference/02-azure-resource-request-form/PAR-fill-notes.md` | 新增 | 每格填答的來源對照 + 6 條假設 + 預期 RIT 會質疑的 5 點 |
| `docs/14-adr/0010-single-region-deployment-topology.md:73` | 修改 | 區域回填 + 修掉指向 CH-009 的過期指標 |
| `docs/14-adr/0011-compute-platform.md:115` | 修改 | IaC 問題的答案指回本紀錄 |
| `docs/decision-form.md` OQ-1 | 修改 | 補上區域 |
| `docs/01-planning/BACKLOG.md` | 修改 | `AD-IaCEvidence-1` 來源改為 CH-010；新增 `AD-StaleRecordRef-1` |

### ③ 申請單需要、但兩份 ADR 沒規定的東西

ADR 定的是形狀（單一區域 × 3 環境、ACA、api internal ingress、共用一個 ACR），
**不是規格**。下列是為了填表而導出的，全部標為估算，最終由 RIT 在 Section 2 定案：
容器與資料庫 SKU、儲存容量、Application Gateway + WAF、managed identity、VNet 子網與 private DNS。

**2026-08-10 修訂（使用者要求）**：目標敘述改為**八個治理範疇**（ISMS profile · ISMS AI agent ·
policy and standards · incident reporting · OS portfolio · supplier management · risk management ·
audit issues）；時程改為四個 task（8 月底前上線 → Phase 2-4 於 9/10/11 月）；資源表刪掉沒有要申請的
列（Event Grid / AKS / Azure DevOps）。⚠️ 連帶一個實質變更：**Azure OpenAI 由「不需要」改為要申請**
——「ISMS AI agent」是八個範疇之一。這不牴觸約束 7（模型透過中性 adapter 取用，是設定不是架構），
但 **ADR-0008 / 0009 仍未拍板**，所以表單明寫這是**要容量不是選設計**，且 token 數是無流量支撐的估算。

導出時有兩個**不是估算**的硬條件，因此在表單裡各講了不只一次：

1. **資料庫必須是 PostgreSQL** —— RLS 是實體隔離機制，ADR-0010 之後它是唯一屏障（`0010` §g4）
2. **企業憑證 + 企業網域，不得用 Azure 預設** —— `04:93`「Defaults are the risk」，
   佐證是公司自己 45 條掃描發現裡沒有一條是注入或 RCE

### ④ 刻意不做的

| 不做 | 理由 |
|---|---|
| 替使用者填人數 | Administrator / Internal 兩格是業務輸入，猜一個數字會被 RIT 拿去估 SKU |
| 送出申請單 | 對外動作，需使用者確認 |
| 把 RKR / RID 靜靜歸為 External | 表單規則與本專案範圍衝突，**在三處明寫矛盾並請 RIT 裁決**，而不是選一邊假裝沒事 |
| 關閉 `AD-IaCEvidence-1` | 本 CH 記錄了**答案**，但**證據仍未取得** —— 見 §相關 |

---

## Verification

**Gate**: `run_all` **6/6** · 無產品 code，故無 build / test / typecheck

**申請單的結構驗證**（讀回存檔後的 `.docx`，不是宣稱）：

| 檢查 | 結果 |
|---|---|
| 核取方塊 | **27 個**，`w14:checked val="1"` **與** 字元 ☐→☒ 兩者皆改。原為 33，使用者 2026-08-10 手動改掉 6 個（整合 Yes→No · VPN client 與 S2S VPN 兩處清掉 · Password 兩處清掉）。**逐格比對確認是刻意變更，不是遺失** |
| 表單 placeholder | 6 處由「串接」修正為「取代」（第一版真的產生過 `EmailN/A`）|
| 結構化子表格 | 5 張全部填入：VM 規格 · Other Resources · 起停排程 · 來源→目的→協定→埠 · Timeline |
| 架構圖 | 已內嵌，`word/media/image5.png` 與原檔位元組相同 |
| 空白母本 | md5 未變、`git diff` 無輸出 |

**Drive-through**: ⚪ N/A —— 文件與對外申請單。
⚠️ **且該 `.docx` 未在 Word 中開啟過** —— 分頁與表格跨頁的版面**未驗證**，送出前需人工開啟一次。

**Verdict**: ⚪ N/A（docs-only —— **gate-only verified**，版面未驗）

---

## Impact

- **Breaking change**: no · **Migration**: no · **Config**: none · **重啟需求**: none
- **對外動作**: 送出 PAR 是**難以回復**的外部動作（進 RIT 流程，終點 GM 核准）。
  送出前必須人工補完紅色欄位並複核。本 CH **不含送出**。
- ⚠️ **送出前必須先解決一個表單內部矛盾**：「Integration with existing system?」現為 **No**，
  但下方「If yes」區塊仍完整描述 Entra ID 整合，包含 **RIT 要建的三個 App Registration**。
  兩種讀法都說得通，但表單不能一邊說沒有整合、一邊要求 App Registration。
  不處理的風險是身分整合在 RIT 規劃中隱形，而沒有那三個 App Registration，M4 無法開始
  （`ADR-0007` · `07:35`）。詳見 `PAR-fill-notes.md` §4b。
- **Rollback**: 撤回或重送修訂版；repo 端回滾＝revert 本 CH 的 6 個檔案變更

---

## 相關

- **回填**: `ADR-0010` §Operational parameters（區域）· `ADR-0011` §這個決定約束了什麼（IaC 工具）
- **消耗**: `AD-ChNumber-1` 記錄的 CH-010 保留號 —— 四處前向引用現在解析得到了
- **未關閉**: `AD-IaCEvidence-1` —— 本 CH 記錄答案，但**證據未取得**；申請單第 7 點向 RIT 索取
  掃描輸出或書面確認。取得前 M0 DoD 第 3 項**不得打勾或標 N/A**
- **推進**: `AD-DAST-1` —— 申請單第 8 點請 RIT 給 VNet 內的 DAST 路徑（self-hosted runner 或代跑）
- **產生的待辦**: `AD-StaleRecordRef-1` → `docs/01-planning/BACKLOG.md`
- **下游**: M0 DoD 第 5 項（TLS／憑證／管理埠）在環境佈建後才能收
- ⛔ **被取代（2026-08-18, W21）**: 上表「**IaC 工具 —— 兩個都不選，本專案不寫 IaC**」那一格
  **已不成立**。使用者手上的身分自己建得起 ACR / ACA / Container App，本專案於是有了
  `infra/azure/provision.sh`。**那一格的文字刻意不改** —— 它記錄的是 2026-08-08 為真的東西。
  後繼記錄：[`CH-041`](./CH-041-project-writes-its-own-iac.md)
