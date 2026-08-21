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
| OQ-9 | ⛔ **OpCo 需不需要各自的政策簽核流程？** | **W25 spike 量到的最高風險缺口** —— ADR-0002 的五條邊界判準裡，第 4 條（使用者不能在執行期自訂流程定義）**完全未驗**。它不是工程問題：既有的受治理擴充（ADR-0005）涵蓋**欄位**不涵蓋**流程**。⚠️ 若答案是「需要」，**自建表與 statechart 函式庫都不夠**，ADR-0002 必須重開並重新評估含 BPM engine 在內的全部選項 | A: 全集團單一流程（= ADR-0002 現況）/ B: canonical 流程 + 受治理的 per-OpCo 變體 / C: 各 OpCo 自訂 | M5 的後續切片；**ADR-0002 的有效性** | ⚠️ **需 stakeholder（區域 ISO / 各 OpCo）** —— 不是工程能回答的 | 2026-08-21 |
| OQ-8 | **AI agent 架構 + 處理地點**（→ ADR-0008 / 0009）| Wave 3，但 **ADR-0009 與 OQ-1 耦合** —— 推論地點是主權控制。若 OQ-1 選了分區，agent 也必須能分區 | A: 自建檢索 / B: Copilot Studio 整合 / C: 分區混合 | Wave 3；但約束 7（provider 中立）現在就要遵守 | ⚠️ 未指定 | 2026-08-07 |

> ⚠️ **OQ-8 的「誰能決定」仍未指定；OQ-9 已指名 stakeholder（區域 ISO / 各 OpCo）。**
> （⛔ **不要在這句話裡寫數字以外的清單** ——
> 原文寫「剩下**三項**」，而它上方的表格當時只有兩列、它下方兩行自己寫著 OQ-4 已拍板：
> **同一段裡三句話互相矛盾**。審計 #6 `AD-22`，2026-08-15 修正。
> ⭐ 教訓不在數字：審計 #5 引用本檔當**對照組**去證明「OQ-4 已拍板」，於是只讀了被引用的那一格 ——
> **一份文件可以同時是某個事實的權威來源、又對同一個事實記錯。**）
> 2026-08-07 使用者拍板了技術類三項（OQ-1 / 2 / 5，
> 見下方已拍板），**OQ-3 於 2026-08-09 由 W02 spike 拍板**、**OQ-6 於 2026-08-10 由 W03 spike 拍板**、
> **OQ-4 於 2026-08-14 由 W12 spike 拍板**、**OQ-7 於 2026-08-21 由 W25 spike 拍板**；
> OQ-8 屬 Wave 3。
> ⭐ **OQ-9 與上述每一項都不同**：前面那些卡的是**證據**（spike 跑完就有答案），
> OQ-9 卡的是**決策者** —— 再多的量測也回答不了「13 個 OpCo 要不要各自的簽核流程」。
> 這也是 `03` §Questions for Legal 的四個法律問題的形狀
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
| OQ-5 | Identity provider | **Microsoft Entra ID**（OIDC），取代交付物指定的 Okta / SAML。⭐ **供應商決定未變，2026-08-19 補上一個缺口**：break-glass 改為**平台本地路徑**（四個管控：本地 MFA / 託管發放零自助 / 稽核寫入與發 session 同一交易否則拒絕 / ≤60 min 用後即焚）—— 原本指派給 Entra emergency accounts 的做法**在 Entra 不可用時失效**，而那正是它存在的場景 | 2026-08-07 · break-glass 2026-08-19 | [`0015`](./14-adr/0015-identity-provider-and-local-break-glass.md)（取代 [`0007`](./14-adr/0007-identity-provider.md)）|
| OQ-6 | 受治理擴充欄位儲存 | **選項 A：JSONB 欄位 + 中央 field catalog**，驗證採**應用層 + DB trigger 雙層**。W03 spike 實測翻轉了 Day-0 的推論：`CHECK` constraint **不能**查 catalog（`cannot use subquery in check constraint`），但 **trigger 可以** —— 擴充治理因此取得與 entity scoping 相同的兩層形狀。catalog 用 nullable `org_entity_id`（NULL = 全域），實測「全域 key 通過 / 自己的 key 通過 / **別人的 key 被擋**」。B（EAV）依形狀否決、C（每實體側表）因 canonical core 會失效而否決 | 2026-08-10 | [`0005`](./14-adr/0005-governed-extension-storage.md) · design note `02-architecture/design-notes/W03-governed-extensions.md`（W03 Day 4 交付）|
| OQ-4 | 稽核軌跡 hash-chain 設計 | **選項 A：逐列 hash chain，由 `BEFORE INSERT` trigger 在資料庫內計算**；攔截點是應用層 hook，經 `contracts/audit-hook.ts` 反轉依賴。⭐ 決定**不是**靠成本 —— 序列寫入下 A 與 B **量不出差別**（兩次跑順序還翻轉，差距落在 control drift 內）。分出勝負的是併發（8 寫入者同一實體，A 是 B 的 **1.63 / 1.59** 倍，可重現）與**斷點定位**：同一個竄改 A 指到**那一列**、B 只指到**那一段**（已寫成測試）。⛔ **驗證成本這個維度量到沒有訊號**（B/A = 0.84–1.20，且 10k 時共用的 fetch 壓過 walk），這反而移除了 B 原本被預期的優勢。C（混合）**未實作**，由 A、B 推導：唯一好處在驗證成本，而那個維度不區分 ⇒ AP-5 | 2026-08-14 | [`0003`](./14-adr/0003-audit-trail-hash-chain.md) · design note `02-architecture/design-notes/W12-audit-trail.md`（W12 Day 4 交付）|
| OQ-7 | Workflow engine：自建 vs 嵌入 | **選項 A：自建宣告式轉換表 + 純 predicate 守衛**。W25 spike **兩個候選都真的建出來**跑同一條流程。⭐ 決定**不是**靠行數 —— `wc -l` 說「B 少 45%」（191 vs 105）是假象，量到的是註解密度；扣掉 B 向 A 借的 15 行後是 **46 vs ≈47 打平**。**唯一分出高下的是 schema↔實作的綁定**：A 的窮舉 `Record<PolicyStatus,…>` 讓加/刪一個狀態**雙向**都是編譯錯誤；B 的 `states` 是自由字串，實測**刪掉一個狀態 `tsc` 完全沉默**（擋下「加」的是 spike 中手寫的 `PolicyEvent`，不是 XState —— 改用慣用的業務動詞命名後那個連結消失）。⛔ **「與稽核鉤子的接合」量到零訊號**，而那是結論：W25 發現的兩個限制來自 `runScoped` 的交易模型與 `resolveEntity` 的歸因規則，**換引擎買不到任何東西**。⭐ **反悔成本是量出來的**：替換實驗證明改一行 import 就能換過去（unit 512/42 + int 280/22 全綠）。C（BPM engine）依 D004 維持 defer | 2026-08-21 | [`0002`](./14-adr/0002-workflow-engine.md) · design note `02-architecture/design-notes/W25-workflow-state-machine.md`（W25 Day 4 交付）· ⚠️ **有效性繫於 OQ-9** |
| OQ-3 | Entity-scoping 強制方式 | **選項 A：PostgreSQL RLS + Prisma client extension**（每個 operation 包進設 `app.entity_scope` 的 transaction）。W02 spike 實測後拍板 —— 選項 B 保留為**已記錄的降級路徑**（引入 pooler 時），選項 C ~~延後至 M3（稽核/證據表出現時才有標的）~~ → ✅ **解封 2026-08-12**：使用者裁決條件是「**證據表出現**」而非 M3 里程碑，而 W07 建了 `evidence` → `BACKLOG.md` `AD-DualLayerHighRisk-1`（`STATUS_AUDIT.md` §2.7 AD-14）| 2026-08-09 | [`0004`](./14-adr/0004-entity-scoping-enforcement.md) · design note `02-architecture/design-notes/W02-entity-scope-rls.md` |

---

## 規則

1. **問題要寫成「A 還是 B」**，不是「要考慮 X」—— 後者無法拍板
2. 「為什麼要現在決定」欄位是必填：**如果不決定也做得下去，那它不該在這張表**
   （它屬於 BACKLOG 或 DEFERRED_REGISTER）
3. 拍板 → 寫 ADR（R5）→ 同步更新受影響的 spec + 對應 `progress.md`（R4）
4. AI 遇到本表中的開放問題 → **STOP and ask**，不要自己選一個
