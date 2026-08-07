# Open Questions — 待拍板登記

**Purpose**: 尚未拍板、但會影響實作的問題。**拍板之後移出這裡 → 進 ADR。**
**Created**: 2026-08-07
**Status**: Active

> **為什麼需要這張表**：AI 在模糊處會自己選一個然後往下做。
> 把「還沒決定」顯性化，是讓那個自作主張變成一次明確的 STOP。

---

## 開放中

選項欄位的內容取自 [`02-architecture/06-tech-stack-and-decisions.md`](./02-architecture/06-tech-stack-and-decisions.md)，
未逕行擴充。標 ⚠️ 者為尚未有明確候選方案、需要先做 spike 的。

| # | 問題 | 為什麼要現在決定 | 選項 | 卡住誰 | **誰能決定** | 提出日 |
|---|---|---|---|---|---|---|
| OQ-1 | **部署與資料落地拓撲**（→ ADR-0006）| **M0 阻斷項。** 中國在範圍內，PIPL 要求境內處理與儲存。這決定資料庫在哪、滾升怎麼跨區、環境變數怎麼分。**選錯要重做整個資料層** | A: 全分區部署（每區獨立 stack）/ B: 單一部署 + 中國區獨立 / C: 分區 + 只跨區同步聚合值 | 所有實作 —— **在此拍板前不要實作跨區滾升** | ⚠️ 未指定 | 2026-08-07 |
| OQ-2 | **後端語言與框架**（→ ADR-0001）| 目錄結構、範疇對應的實體目錄、lint/test/build 指令全部懸空。`CLAUDE.md` §Development Commands 現在是空的 | A: 內建 auth/permissions/history 的框架（如 Django）/ B: 端到端 TypeScript | 所有實作 | ⚠️ 未指定 | 2026-08-07 |
| OQ-3 | **Entity-scoping 強制方式**（→ ADR-0004）| guardrail 4 要求「優先資料庫層強制」。若用 connection pooler 就無法 per-request `SET LOCAL`，必須降級為應用層 —— 那個降級要被記錄而非默默發生 | A: PostgreSQL RLS（每請求獨立連線）/ B: 應用層強制過濾（pooler 環境）/ C: 兩者並用（高風險表）| `core-model`、`entity-scope` 兩個範疇 | ⚠️ 未指定 | 2026-08-07 |
| OQ-4 | **稽核軌跡 hash-chain 設計**（→ ADR-0003）| guardrail 5 要求平台能證明自己日誌的完整性。逐列鏈與週期性錨定的寫入成本與驗證成本差異很大，決定後改動代價高 | A: 逐列 hash chain / B: 週期性錨定 / C: 混合 | `audit-trail` 範疇 | ⚠️ 未指定 | 2026-08-07 |
| OQ-5 | **Identity provider**（→ ADR-0007）| 六角色 × 實體範疇的映射方式取決於 IdP 能力（群組、claim、SCIM）| A: 自建（Keycloak）/ B: 託管 IdP | `identity` 範疇 | ⚠️ 未指定 | 2026-08-07 |
| OQ-6 | **受治理擴充欄位儲存**（→ ADR-0005）| guardrail 3 的「canonical core + governed local extensions」需要一個具體機制，否則各 OpCo 會各自加欄位 | A: JSONB + 中央 field catalog / B: EAV / C: 每實體側表 | `core-model` 範疇 | ⚠️ 未指定 | 2026-08-07 |
| OQ-7 | **Workflow engine：自建 vs 嵌入**（→ ADR-0002）| 已確認參數：Wave 1 不做重量級 BPM。但「精簡可設定狀態機」的邊界要定義，否則會逐步長成 BPM | ⚠️ 需先 spike | `workflow` 範疇 | ⚠️ 未指定 | 2026-08-07 |
| OQ-8 | **AI agent 架構 + 處理地點**（→ ADR-0008 / 0009）| Wave 3，但 **ADR-0009 與 OQ-1 耦合** —— 推論地點是主權控制。若 OQ-1 選了分區，agent 也必須能分區 | A: 自建檢索 / B: Copilot Studio 整合 / C: 分區混合 | Wave 3；但約束 7（provider 中立）現在就要遵守 | ⚠️ 未指定 | 2026-08-07 |

> ⚠️ **八項的「誰能決定」全部未指定。** 依本檔規則，這是第一個要解的問題 ——
> 在指定決策者之前，這張表不會有任何一列被移到「已拍板」。

> **「誰能決定」是必填。** 沒有指名對象的開放問題不會被回答 —— 它只會一直在表上，
> 而每個看到它的人都以為別人會處理。若答案是「不知道誰能決定」，
> 那第一個要解的問題就是那個。

## 已拍板（保留 3 個月後移除）

| # | 問題 | 決定 | 拍板日 | 去向 |
|---|---|---|---|---|
| OQ-0 | | | YYYY-MM-DD | `ADR-NNN` |

---

## 規則

1. **問題要寫成「A 還是 B」**，不是「要考慮 X」—— 後者無法拍板
2. 「為什麼要現在決定」欄位是必填：**如果不決定也做得下去，那它不該在這張表**
   （它屬於 BACKLOG 或 DEFERRED_REGISTER）
3. 拍板 → 寫 ADR（R5）→ 同步更新受影響的 spec + 對應 `progress.md`（R4）
4. AI 遇到本表中的開放問題 → **STOP and ask**，不要自己選一個
