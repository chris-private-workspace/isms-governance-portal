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
| OQ-4 | **稽核軌跡 hash-chain 設計**（→ ADR-0003）| guardrail 5 要求平台能證明自己日誌的完整性。逐列鏈與週期性錨定的寫入成本與驗證成本差異很大，決定後改動代價高 | A: 逐列 hash chain / B: 週期性錨定 / C: 混合 | `audit-trail` 範疇 | ⚠️ 未指定 | 2026-08-07 |
| OQ-7 | **Workflow engine：自建 vs 嵌入**（→ ADR-0002）| 已確認參數：Wave 1 不做重量級 BPM。但「精簡可設定狀態機」的邊界要定義，否則會逐步長成 BPM | ⚠️ 需先 spike | `workflow` 範疇 | ⚠️ 未指定 | 2026-08-07 |
| OQ-8 | **AI agent 架構 + 處理地點**（→ ADR-0008 / 0009）| Wave 3，但 **ADR-0009 與 OQ-1 耦合** —— 推論地點是主權控制。若 OQ-1 選了分區，agent 也必須能分區 | A: 自建檢索 / B: Copilot Studio 整合 / C: 分區混合 | Wave 3；但約束 7（provider 中立）現在就要遵守 | ⚠️ 未指定 | 2026-08-07 |

> ⚠️ **剩下三項的「誰能決定」仍未指定。** 2026-08-07 使用者拍板了技術類三項（OQ-1 / 2 / 5，
> 見下方已拍板），**OQ-3 於 2026-08-09 由 W02 spike 拍板**、**OQ-6 於 2026-08-10 由 W03 spike 拍板**；
> 剩下的 OQ-4 / 7 同樣要等 spike 的實測結果 —— OQ-4 的落點是 M3 稽核軌跡
> （[`0004`](./14-adr/0004-entity-scoping-enforcement.md) §Consequences：攔截點與 entity-scope 共用），
> OQ-8 屬 Wave 3。
> 這幾項卡的是**證據**不是決策者。真正仍缺決策者的是 `03` §Questions for Legal 的四個法律問題
> （當時由 ADR-0006 以最保守預設繞過 —— ⚠️ **該 ADR 已被 [`0010`](./14-adr/0010-single-region-deployment-topology.md) 取代**，
> 中國移出範圍後這四個問題是否仍成立、以及原本「Legal 回覆只會放寬設定」的論證是否還站得住，
> **均未經複查**）。

> **「誰能決定」是必填。** 沒有指名對象的開放問題不會被回答 —— 它只會一直在表上，
> 而每個看到它的人都以為別人會處理。若答案是「不知道誰能決定」，
> 那第一個要解的問題就是那個。

## 已拍板（保留 3 個月後移除）

| # | 問題 | 決定 | 拍板日 | 去向 |
|---|---|---|---|---|
| OQ-1 | 部署拓撲 | ~~分區部署於 Azure；中國區走 Azure China~~ → **重新拍板 2026-08-08**：中國移出範圍，改為**單一區域 × 3 環境**（dev/staging/prod），prod 獨立 subscription。**區域 2026-08-10 定案：RCI3 — Azure Singapore** | 2026-08-08 · 區域 2026-08-10 | [`0010`](./14-adr/0010-single-region-deployment-topology.md)（取代 [`0006`](./14-adr/0006-deployment-and-residency-topology.md)）· 區域見 [`CH-010`](./03-implementation/changes/CH-010-azure-resource-request.md) |
| OQ-2 | 後端語言與框架 | **NestJS 10 + Prisma 7**，與 Next.js 前端同一 monorepo | 2026-08-07 | [`0001`](./14-adr/0001-backend-framework.md) |
| OQ-5 | Identity provider | **Microsoft Entra ID**（OIDC），取代交付物指定的 Okta / SAML | 2026-08-07 | [`0007`](./14-adr/0007-identity-provider.md) |
| OQ-6 | 受治理擴充欄位儲存 | **選項 A：JSONB 欄位 + 中央 field catalog**，驗證採**應用層 + DB trigger 雙層**。W03 spike 實測翻轉了 Day-0 的推論：`CHECK` constraint **不能**查 catalog（`cannot use subquery in check constraint`），但 **trigger 可以** —— 擴充治理因此取得與 entity scoping 相同的兩層形狀。catalog 用 nullable `org_entity_id`（NULL = 全域），實測「全域 key 通過 / 自己的 key 通過 / **別人的 key 被擋**」。B（EAV）依形狀否決、C（每實體側表）因 canonical core 會失效而否決 | 2026-08-10 | [`0005`](./14-adr/0005-governed-extension-storage.md) · design note `02-architecture/design-notes/W03-governed-extensions.md`（W03 Day 4 交付）|
| OQ-3 | Entity-scoping 強制方式 | **選項 A：PostgreSQL RLS + Prisma client extension**（每個 operation 包進設 `app.entity_scope` 的 transaction）。W02 spike 實測後拍板 —— 選項 B 保留為**已記錄的降級路徑**（引入 pooler 時），選項 C **延後至 M3**（稽核/證據表出現時才有標的）| 2026-08-09 | [`0004`](./14-adr/0004-entity-scoping-enforcement.md) · design note `02-architecture/design-notes/W02-entity-scope-rls.md` |

---

## 規則

1. **問題要寫成「A 還是 B」**，不是「要考慮 X」—— 後者無法拍板
2. 「為什麼要現在決定」欄位是必填：**如果不決定也做得下去，那它不該在這張表**
   （它屬於 BACKLOG 或 DEFERRED_REGISTER）
3. 拍板 → 寫 ADR（R5）→ 同步更新受影響的 spec + 對應 `progress.md`（R4）
4. AI 遇到本表中的開放問題 → **STOP and ask**，不要自己選一個
