# 02-architecture — 架構真理

**Purpose**: 持久的架構真理層 + 核心設計文件的編號索引。
**這一層改動慢、影響大**，受 CLAUDE.md §核心約束保護。
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> 主 spec（一頁式的 WHAT + WHY）在 [`../architecture.md`](../architecture.md)，**不在這一層**。
> 這一層放 catalog、逐領域設計文件、design note、audit。

---

## 兩類設計文件，兩種寫法

| 類型 | 編號 | 什麼時候寫 | 特性 |
|---|---|---|---|
| **核心設計文件** | `00-` 起 | 專案初期 / 重大架構階段 | 穩定、少變、描述**應該長怎樣** |
| **Design note** | **接續核心編號往上** | **每個 spike 的收尾** | 遞增、只增不改、描述**實際驗證了什麼** |

> **Design note 接續核心文件編號是刻意的**：核心文件 `00-NN`，之後每個 spike extract
> 從 `NN+1` 開始。這讓「這個領域的知識」有**單一線性索引**，而不是兩套各自從 1 開始的編號。
>
> 真實規模參考：來源專案是 `00-17`（18 份核心）+ `18-64`（47 份 design note，每個 spike 一份）。

---

## 核心設計文件

<!-- 依你的專案填寫。下表是**建議的起手清單** —— 不需要一次寫完，
     每份都應該在真的需要時才寫（見 memory/feedback_doc_growth_follows_runtime.md）。 -->

| # | 文件 | 用途 | 狀態 |
|---|---|---|---|
| 00 | `00-vision.md` | 專案願景 / 核心理念 / 成功判準 | 待寫 |
| 01 | `01-architecture.md` | 分層架構 + 範疇定義 + 依賴規則 | 待寫 |
| 02 | `02-tech-stack-decisions.md` | 關鍵技術選型 + 理由 | 待寫 |
| 03 | `03-data-model.md` | 資料模型 / DB schema | 待寫 |
| 04 | `04-api-design.md` | 對外介面設計 | 待寫 |
| 05 | `05-test-strategy.md` | 測試分層 + 覆蓋策略 | 待寫 |
| 06 | `06-security.md` | 威脅模型 / 合規要求 | 待寫 |
| 07 | `07-deployment.md` | 部署 / CI-CD / DR（細節在 `../13-deployment/`）| 待寫 |
| 08 | `08-glossary.md` | 術語表 | 待寫 |
| 09 | [`cross-scope-interfaces.md`](./cross-scope-interfaces.md) | **跨範疇契約 single-source registry** | 就緒 |
| 10 | `10-roadmap.md` | Phase 路線圖 | 待寫 |

> **`cross-scope-interfaces.md` 特別重要**：所有跨範疇共用的型別 / 介面 / 事件
> 必須**只在這裡登記一次**。平行定義是分歧的起點。

### 什麼時候該寫核心設計文件

| 情況 | 該寫嗎 |
|---|---|
| 一個決策會約束後續多個 phase | 寫（或至少寫 ADR）|
| 多人需要對同一件事有共識 | 寫 |
| 「我覺得之後可能會需要」 | **不寫** —— 這是預寫反模式 |
| 某個領域已經做過 spike 且驗證過 | 從 design note 提煉上來 |

---

## 其他住客

| 檔案 | 作用 |
|---|---|
| `COMPONENT_CATALOG.md` | 所有 component 一覽（id / 職責 / 依賴 / 技術 / 狀態）—— change/bug 標 `affects` 的權威來源 |
| [`design-system.md`](./design-system.md) | 前端設計系統 + primitive index + **drift incident log** |
| [`page-inventory.md`](./page-inventory.md) | 27 個畫面的 fragment ↔ `page.tsx` **保真度對照**與每一處偏離的依據（W19）|
| `design-notes/` | Spike extract（見下）|
| `gate-check/` | 「架構階段完成」的檢查點 checklist（選用）|
| `audit-*.md` | 對 spec 的 audit（實際 vs 宣稱）|
| `_TEMPLATE-design-doc.md` / `_TEMPLATE-design-note.md` / `_TEMPLATE-audit.md` | 模板 |

---

## Design Notes（spike extract）

位置：[`design-notes/`](./design-notes/)

| # | 文件 | Phase | 主題 | Verified ratio |
|---|---|---|---|---|
| 1 | [`W25-workflow-state-machine.md`](./design-notes/W25-workflow-state-machine.md) | W25 | Wave 1 生命週期的形狀：宣告式轉換表 + 純 predicate 守衛 + **compare-and-set** 並行控制 | **16/16 = 100%**（分母 = §1-§3 的技術 claim；§4 的 8 項是**宣告為未驗**的，依 8-point gate 第 6 點不計入）|

> ⛔ **這張表在 2026-08-21 之前是空的，而 `design-notes/` 裡已經有 7 份**
> （W01 / W02 / W03 / W04 / W06 / W07 / W12）。⇒ **索引宣稱在索引，實際什麼都沒索引。**
> W25 只補了自己那一行（closeout 義務），存量 7 份的回填記為 `AD-DesignNoteIndexEmpty-1`。

**寫作規則**：[`../rules-on-demand/spike-design-note-gate.md`](../rules-on-demand/spike-design-note-gate.md)（8-Point Quality Gate）
**模板**：[`_TEMPLATE-design-note.md`](./_TEMPLATE-design-note.md)

**核心紀律**：design note 是 **extract 不是 pre-write** ——
從**已完成、已驗證**的實作中抽取，目標 verified ratio ≥ 95%
（每個技術 claim 都有 `file:line` + 可重現的驗證方式）。

---

## 慣例

- 架構改動一定先經 ADR（[`../14-adr/`](../14-adr/README.md)）才落到這一層
- 新增 design note → **在上表加 1 行**（沒索引 = 沒人找得到）
- 某份文件被取代 → 標 `Superseded by <doc>`，**不要直接刪**
- Component design note **rolling JIT**：第一次重度改動該 component 時才寫
