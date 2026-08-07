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
| | | | |

**Status 值**：提案中 / **已採納** / 已被 ADR-NNN 取代 / 已廢棄

---

## 尚待撰寫（Wave 1 阻斷項）

這 9 份是專案啟動時就識別出來的開放決策，**尚未有任何一份寫成 ADR**。
清單原本在舊的 `docs/adr/` 位置，套用開發流程模版重組時併入本索引。  <!-- path-check: ignore — 歷史位置，已不存在 -->

命名：`ADR-XXXX-short-title.md`（例：`ADR-0001-backend-framework.md`）。

| # | 決策 | 阻斷什麼 |
|---|------|---------|
| ADR-0001 | Backend language & framework | 全部實作 |
| ADR-0002 | Workflow engine：自建 vs. 嵌入 | 平台基礎服務 |
| ADR-0003 | Audit-trail hash-chain 設計 | guardrail 5（不可篡改稽核軌跡）|
| ADR-0004 | Entity-scoping 強制方式（PostgreSQL RLS 策略）| guardrail 4（一切 entity-scoped）|
| ADR-0005 | 受治理擴充欄位的儲存（JSONB + field catalog）| guardrail 3（核心資料模型）|
| ADR-0006 | 部署與資料落地拓撲 | ⭐ **M0 阻斷項** —— 中國在範圍內，PIPL 在地化是硬性要求 |
| ADR-0007 | Identity provider | 身分與存取層 |
| ADR-0008 | AI agent：自建檢索 vs. Copilot Studio 整合 vs. 分區混合 | Wave 3 |
| ADR-0009 | AI 處理地點與模型無關推論介面（主權控制）| Wave 3 + 資料落地 |

> **決策在這裡出現一份標記為「已採納」的 ADR 之前，都不算定案。**
> 目前 §Project Status 的 Tech Stack 欄位仍是未填狀態，這是刻意的 ——
> 見 `docs/02-architecture/06-tech-stack-and-decisions.md`。

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
