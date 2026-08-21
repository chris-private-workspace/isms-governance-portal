# 14-adr — Architecture Decision Records 索引

**Purpose**: 會約束未來的決策記錄。**輕量** —— 每份目標 1 頁。

**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

---

## 什麼時候寫 ADR

| 情況 | 產出 |
|------|------|
| 做了一個**選 A 不選 B** 的決定，且它會約束未來 | ✅ **ADR** |
| Spike 驗證了一批不變式（含 `file:line`）| **Design note**（不是 ADR）|
| Spike 過程中做的決策 | 寫在 design note 的 §Decision Matrix，**不用另開 ADR** |
| 選型：資料庫 / 佇列 / 框架 / 雲供應商 | ✅ ADR |
| 架構取向：單體 vs 服務 / 同步 vs 事件驅動 | ✅ ADR |
| **放棄**某條路（決定不做某事）| ✅ ADR —— 這類最容易被遺忘，也最容易被反覆重提 |
| 「這個變數叫什麼名字」 | ❌ 不用 |
| 一次性的實作選擇，不影響其他地方 | ❌ 不用（寫在 CHANGE record 就好）|

**判準一句話**：**六個月後有人問「為什麼不用 X」，你希望有份文件能回答嗎？**

### ⭐ 什麼時候**可以無實作先寫**（`AD-RuleBoundary-1` 的仲裁）

下方 §ADR vs Design Note 說「ADR 可以在沒有實作的情況下寫」，而 CLAUDE.md §禁止反模式
禁止「先寫一批新規劃文件再實作」。兩者的交界是：

> **只有存在 forcing function 時**，ADR 才可以無實作先寫。

forcing function 的三種形狀（**必要條件，不是充分條件**）：

| 形狀 | 例 |
|---|---|
| 里程碑 DoD 明文要求 | `07:31` 的 M0 要求 ADR-0001 與部署拓撲拍板 |
| 外部動作需要這個答案 | Azure 資源申請單要知道計算平台 → ADR-0011 |
| 這個決定正在阻斷別的工作 | ADR-0006 阻斷 M1 建表 |

**沒有 forcing function 的 ADR 就是預寫規劃文件**，違反 CLAUDE.md §禁止反模式。
⚠️ 反向也要防：**不要為了正當化預寫而製造 forcing function**。
判準是「這件事**已經**在等這個答案」，不是「將來會等」。

> **為什麼需要這條**：`CH-005` 起草時原提案一次寫 6 份 ADR，其中 3 份沒有任何東西在等它們。
> 仲裁答案當時只存在於 `memory/feedback_doc_growth_follows_runtime.md`（非 always-loaded），
> 所以同一個混淆在 `CH-009` 又發作一次。第 2 次 → 依 `.claude/rules/README.md` 強度階梯升級為明文。

---

## ADR vs Design Note vs CHANGE

```
ADR            一個決策。可以在沒有實作的情況下寫。
               「我們選 PostgreSQL 不選 MongoDB，因為…」

Design note    一次 spike 的知識抽取。必須有實作 + file:line + 可重現驗證。
               「Phase 5.3 驗證了 OAuth PKCE flow 的 4 個不變式，實作在…」

CHANGE record  一次變更的紀錄。做了什麼、為什麼這樣做、怎麼驗證的。
               「CHANGE-042：加了 rate limiting，選 token bucket 因為…」
```

三者不互斥。一個 phase 可能同時產生 ADR（選型）+ design note（驗證）+ CHANGE（實作紀錄）。
但**大部分 phase 只需要 CHANGE record**。

---

## 索引

<!-- 新增 ADR 時加 1 行。Status 變更時（採納 → 被取代）也要更新這裡。 -->

| # | 決策 | Date | Status |
|---|------|------|--------|
| [0001](./0001-backend-framework.md) | 後端 = NestJS 10 + Prisma 7，與 Next.js 前端同一個 monorepo | 2026-08-07 | **已採納** |
| [0002](./0002-workflow-engine.md) | Wave 1 生命週期 = **宣告式轉換表 + 純 predicate 守衛**，不是 workflow engine（**W25 spike 兩個候選都實作後拍板；分出高下的是 schema↔實作的型別綁定，不是行數 —— 「與稽核鉤子的接合」量到零訊號**）⚠️ 有效性繫於 `decision-form.md` **OQ-9** | 2026-08-21 | **已採納** |
| [0003](./0003-audit-trail-hash-chain.md) | 稽核軌跡 = 逐列 hash chain，由 `BEFORE INSERT` trigger 在資料庫內計算；攔截點是應用層 hook（**W12 spike 實測後拍板；驗證成本維度量到沒有訊號**）| 2026-08-14 | **已採納** |
| [0004](./0004-entity-scoping-enforcement.md) | Entity scoping = PostgreSQL RLS，由 Prisma client extension 驅動（**W02 spike 實測後拍板；裁決 0001 §可證偽條件 #1 未觸發**）| 2026-08-09 | **已採納** |
| [0006](./0006-deployment-and-residency-topology.md) | 分區部署於 Azure，中國區走 Azure China（21Vianet） | 2026-08-07 | **已被 [0010](./0010-single-region-deployment-topology.md) 取代** |
| [0007](./0007-identity-provider.md) | Microsoft Entra ID，取代交付物指定的 Okta | 2026-08-07 | **已被 [0015](./0015-identity-provider-and-local-break-glass.md) 取代** |
| [0010](./0010-single-region-deployment-topology.md) | 單一區域部署於 Azure，單一 tenant 內 3 個環境（**取代 0006**） | 2026-08-08 | **已採納** |
| [0011](./0011-compute-platform.md) | 計算平台 = **Azure Container Apps**（api internal ingress / web external，共用一個 ACR）| 2026-08-08 | **已採納** |
| [0005](./0005-governed-extension-storage.md) | 在地擴充 = JSONB 欄位 + catalog 表 + trigger 強制（**W03 spike 實測後拍板**）| 2026-08-10 | **已採納** |
| [0012](./0012-user-scope-semantics.md) | `users` 是全域表；實體範疇住在 role assignment 而非人身上 | 2026-08-10 | **已採納** |
| [0013](./0013-risk-scoring-and-calibration.md) | 風險分數由**資料庫** generated column 算；閾值 16 是集團常數，`risk_scales` **今天不建** | 2026-08-11 | **已採納** |

| [0014](./0014-row-level-entity-scope-and-per-command-policies.md) | 逐列範疇的表用 **per-command policy**（`SELECT` 寬 / `INSERT`·`UPDATE` 窄 / **無 `FOR DELETE`**），不用單一不對稱 `FOR ALL`；`subtree` **不建** | 2026-08-11 | **已採納** |
| [0015](./0015-identity-provider-and-local-break-glass.md) | Entra ID 續任 IdP，**外加一條不呼叫 Entra 的本地 break-glass 路徑**（四個管控：本地 MFA / 託管發放 / 稽核先於放行 / 時效單次）（**取代 0007**）| 2026-08-19 | **已採納** |

**Status 值**：提案中 / **已採納** / 已被 ADR-NNN 取代 / 已廢棄

> **檔名慣例：`NNNN-<slug>.md`（4 位數，無 `ADR-` 前綴）** —— 以既有的
> `0000-TEMPLATE.md` 為準，與 `06-tech-stack-and-decisions.md:50` 和
> `docs/INFORMATION-FLOW.md` 的編號規則表一致。

---

## 尚待撰寫（Wave 1 阻斷項）

原本 9 份是專案啟動時識別出來的開放決策。**0001 / 0006 / 0007 已於 2026-08-07（`CH-005`）採納**，
移到上方索引（0006 已於 2026-08-08 被 0010 取代，0011 於同日採納；
**0004 已於 2026-08-09 由 W02 spike 採納**，**0005 已於 2026-08-10 由 W03 spike 採納**，
**0003 已於 2026-08-14 由 W12 spike 採納** —— 它被延後的理由是「判準是寫入吞吐量，零 code 時量不出來」，
而那個條件**早已不成立、卻沒有任何 gate 會提醒**；
**0002 已於 2026-08-21 由 W25 spike 採納** —— 它被延後的理由是「精簡狀態機的邊界未定義」，
而 W25 的產出正是那條邊界的**五條可證偽判準**）；
下表是**剩餘 2 份**。
清單原本在舊的 `docs/adr/` 位置，套用開發流程模版重組時併入本索引。  <!-- path-check: ignore — 歷史位置，已不存在 -->

| # | 決策 | 阻斷什麼 | 何時可寫 |
|---|------|---------|---------|
| ADR-0008 | AI agent：自建檢索 vs. Copilot Studio 整合 vs. 分區混合 | Wave 3 | Wave 3 |
| ADR-0009 | AI 處理地點與模型無關推論介面 | Wave 3 | Wave 3 —— ⚠️ 主權論據隨中國移出而失效（ADR-0010），**約束 7 的理由待重寫**（`AD-Constraint7-1`）|

> **決策在這裡出現一份標記為「已採納」的 ADR 之前，都不算定案。**
> 剩下 3 份刻意不現在寫：**ADR 是決策記錄，不是規劃文件** ——
> 沒有 runtime 就寫不出可證偽條件（見 `memory/feedback_doc_growth_follows_runtime.md`）。
>
> ⚠️ **0012 / 0013 不在原本那 9 份裡。** 它們是 W04 / W05 執行中浮現的決定 ——
> 編號往後接，不佔用 `0002/0003/0008/0009` 這四個**有主題的預留**（`AD-ChNumber-1`）。

---

## 模板

`docs/14-adr/0000-TEMPLATE.md`

必備的 4 個區塊：

1. **Context** — 為什麼現在要決定
2. **Options** — 至少 2 個（只有 1 個代表這不是決策）
3. **Decision** — 選什麼 + **在我們的處境下**為什麼（禁止「因為是 best practice」）
4. **Consequences** — 接受了什麼代價 + **可證偽條件** ⭐

> **可證偽條件**是最容易被跳過、也最重要的一節：
> **什麼觀察結果會推翻這個決定？**
> 沒有這一節的 ADR 是不可反駁的信仰宣言，不是工程決策。

---

## 取代舊 ADR 的流程

決策改變時**不要修改舊 ADR** —— 寫一份新的：

1. 新 ADR 的 §相關寫 `取代: ADR-NNN`
2. 舊 ADR 的 Status 改成 `已被 ADR-MMM 取代`（**只改 Status 那一行**）
3. 本索引兩行都更新

**為什麼不直接改**：舊決策當時是對的（基於當時的資訊）。
保留它讓後人看到**判斷是怎麼演化的** —— 那比只看到最終答案有價值得多。
