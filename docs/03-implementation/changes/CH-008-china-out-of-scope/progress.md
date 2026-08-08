# CH-008 — Progress

**Status**: done
**Spec**: [`spec.md`](./spec.md) · **Checklist**: [`checklist.md`](./checklist.md)

---

## 2026-08-08

### 做了什麼

- 覆蓋 grep + 逐檔判定（見下表）—— 約 25 分鐘
- 新增 ADR-0010；ADR-0006 Status 一行 —— 約 30 分鐘
- 18 個既有檔案逐處修改 —— 約 70 分鐘
- BACKLOG / decision-form 同步 —— 約 10 分鐘

### 意外 / 卡住

- **D1**：spec 起草時估「9 處」，實測需改 **18 個既有檔 + 1 份新 ADR**。已記入 spec §Changelog。
- **D2**：`CLAUDE.md:245` 約束 7 的理由句含事實錯誤（「中國在範圍內」），不是單純的待更新。
  已改為修正事實 + 標記論證待重寫，完整重寫留 `AD-Constraint7-1`。
- **D3（非預期發現）**：`docs/architecture.md` §3 範疇表 8 列全寫「⚠️ 待 ADR-0001」、
  §5 決策表全寫「未定」—— **CH-005 收尾時漏更新**。覆蓋 grep 順帶抓到。
  已一併補齊（目錄來源是 `CLAUDE.md` §Scopes）。

---

## 覆蓋判定 ⭐（Acceptance A5）

**方法**：`Grep -i "China|中國|PIPL|RCN|21Vianet|DSL|CSL|跨境|cross-border|cross_border|residency|落地"`，
範圍 `**/*.md` 全 repo。**結果 173 處命中 / 34 個檔案**，逐檔判定如下。

**沒掃到什麼**：非 `.md` 檔（本 repo 目前無 code）· `reference/` 與 `docs/reference/`（刻意不在版控中）。

### ✅ 已修改（18 檔）

| 檔案 | 命中 | 改了什麼 |
|---|---|---|
| `CLAUDE.md` | 9 | Design principle 5 理由 · Tech Stack · 已確認參數 #4 · guardrail 8 · `entity-scope` 職責 · 約束 7 事實 · Services 拓撲 · Environment Setup |
| `README.md` | 2 | 13 OpCo / 11 管轄區 · §Jurisdictions · §Status 的 ADR 狀態（**既存 stale**）|
| `docs/architecture.md` | 3 | §3 範疇表（D3）· §4 跨區聚合 · §5 決策表（D3）|
| `docs/decision-form.md` | 1 | OQ-1 重新拍板，指向 ADR-0010 |
| `docs/14-adr/README.md` | 2 | 索引 0006 → 已取代、新增 0010 / 0011 · ADR-0009 列加警語 |
| `docs/14-adr/0006-*.md` | 26 | **只改 Status 一行**；其餘 25 處內文原封不動（A2）|
| `docs/01-planning/BACKLOG.md` | 5 | `AD-Decider-1`→`AD-Constraint7-1` · `AD-Residency-1` 重述 · `AD-Mockup-3` 改 13 家 · §Pending 中國列消滅 + 加 ADR-0011 · §Shipped 加 CH-008 |
| `02-architecture/00-project-charter.md` | 2 | D6 · §Success criteria |
| `02-architecture/01-architecture-overview.md` | 3 | §Design principles · §Deployment topology |
| `02-architecture/02a-data-model-spec.md` | 16 | §0 索引 2 列 · §3 `Jurisdiction` **NOT BUILT banner** · §7 replication **NOT BUILT banner** · `metric_key` 治理理由改寫 · dashboard freshness 驅動力改寫 |
| `02-architecture/03-multi-entity-and-jurisdiction.md` | 25 | §Jurisdiction 改寫 · §Cross-border 加**保留為參考** banner；分級表內文全部保留 |
| `02-architecture/06-tech-stack-and-decisions.md` | 4 | §Open decisions 表（0006→0010、加 0011）· §blocking 註 |
| `02-architecture/07-wave1-build-plan.md` | 6 | §Foundation hard requirements · **M0 DoD** · M2 DoD · §Testing · §Suggested approach |
| `02-architecture/10-wave2-*.md` | 1 | obligation 例子移除 CN PIPL |
| `02-architecture/14-ai-agent.md` | 4 | §Sovereignty 加**前提withdrawn** banner · 選項比較表 · 建議段 · 範例查詢 |
| `02-architecture/15-design-alignment.md` | 10 | §1 全段（13 OpCo / 11 管轄區、RCN 移除、語言集）· §7 #1/#8/#9 · §8.1 |
| `02-architecture/16-secure-development-dod.md` | 1 | 指向 ADR-0011，並把「繼承 App Service 預設值」重述為**支持** App Service 的論據 |
| `docs/rules-on-demand/multi-tenant-data.md` | 3 | §資料落地與滾升的張力 → §單一部署讓繞過更容易寫 |

### ⚪ 保留（不改，5 檔）

| 檔案 | 命中 | 為什麼不改 |
|---|---|---|
| `docs/14-adr/0001-backend-framework.md` | 1 | **已採納 ADR，不改內文**（`14-adr/README.md:104`）。其第三個 API 消費者失效，記在 ADR-0010 §Consequences |
| `docs/14-adr/0007-identity-provider.md` | 6 | 同上。兩個 identity plane 收斂為一，記在 ADR-0010 |
| `02-architecture/02-core-data-model.md` | 1 | `Jurisdiction` 實體定義含 `residency_policy` —— **實體仍要建**（obligation library 需要），只有 `cross_border_*` 欄位不建 |
| `02-architecture/04-security-by-design.md` | 1 | 「storage/processing **can** be pinned per jurisdiction where required」是**能力陳述非要求**，無殘留要求時自動滿足 |
| `02-architecture/07-*.md` §Security gate | (計入上方) | 「residency constraints are honoured」同上，通用措辭 |

### 🗄 保留為歷史（7 檔）

`CH-001-cross-border-field-classification.md` (12) · `CH-003-*.md` (2) ·
`CH-005-foundation-adrs/{spec,checklist,progress}.md` (15) ·
`09-analysis/mockup-data-vs-spec-audit-20260807.md` (6) ·
`09-analysis/screen-fragment-audit-20260807.md` (1) · `09-analysis/INDEX.md` (1)

**變更記錄與稽核報告是當時的快照，改了就毀掉可追溯性。**
唯一例外處理：`mockup-data-vs-spec-audit` 建議的「`RIN` → `RCN` 代換」已作廢，
但**不改該報告** —— 作廢註記寫在 `15` §8.1（現行規格），這樣讀規格的人會看到，
讀報告的人也還看得到當時的判斷。

### ⚪ 誤報（4 檔）

| 檔案 | 為什麼是誤報 |
|---|---|
| `docs/rules-on-demand/testing.md` | **`DSL` = domain-specific language**，不是中國《数据安全法》 |
| `memory/feedback_never_fabricate_tool_results.md` | 「落地」= 生效 |
| `.claude/rules/task-workflow.md` | 「落地」= 生效 |
| `02-architecture/COMPONENT_CATALOG.md` | 「落地」= code 落地 |

**34 = 18 + 5 + 7 + 4。** 每一檔都有判定。

---

## 完成摘要

**實際 vs spec**：三項偏離（D1 檔案數 9→19、D2 約束 7 處理方式、D3 順帶修 `architecture.md`），
D1/D2 在 spec §Changelog，D3 記在本檔。範圍決策本身未變。

**Acceptance 逐條**：

| # | 條件 | 結果 | 證據 |
|---|---|---|---|
| A1 | ADR-0010 五區塊齊全 | PASS | Context / Options(3) / Decision / Consequences+可證偽(3) / Security & compliance impact(6 guardrails) |
| A2 | ADR-0006 只改 Status 一行 | PASS | `git diff --numstat` = `1 1` |
| A3 | `CLAUDE.md` #4 與 `00` D6 一致 | PASS | 兩處皆「13 OpCo / 11 管轄區、印度與中國均排除」 |
| A4 | `15` §1 = 13 OpCo / 11 管轄區 | PASS | RCN 列移除，改為刪除註記 |
| A5 | 覆蓋 grep 判定表 | PASS | 上方 34 檔全部有判定 |
| A6 | `run_all` 6/6 + CI 綠 | PASS | 見下 |
| A7 | BACKLOG / decision-form 同步 | PASS | R7 / R4 |

**Drive-through**：⚪ N/A —— 純文件變更，無 user-facing 行為。**gate-only verified**。

**留下的 carryover**（→ BACKLOG）：

- `AD-Constraint7-1` 🟡 P1 —— 約束 7 論證待重寫（Wave 3 前）
- `AD-Residency-1` 🟡 P1 —— 驅動力已換，結論仍成立，M8 前確認
- `AD-Mockup-3` 🔴 P0 —— fixture 改 13 家，`RIN`→`RCN` 建議作廢
- **ADR-0011**（計算平台）與 **CH-009**（Azure 資源清單）—— 下一步
