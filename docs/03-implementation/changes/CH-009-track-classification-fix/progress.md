# CH-009 — Progress

**Status**: done
**Spec**: [`spec.md`](./spec.md) · **Checklist**: [`checklist.md`](./checklist.md)

---

## 2026-08-08

### 做了什麼

- `PROCESS.md` §1.1 / §1.2 / §3.1 / §4.1 —— 約 40 分鐘
- `CLAUDE.md` + `task-webflow` 對齊 + byte 壓縮 —— 約 30 分鐘
- `14-adr/README.md` forcing-function 判準（關 `AD-RuleBoundary-1`）—— 約 20 分鐘
- A6 負面驗證（CH-001～008 重跑）—— 約 15 分鐘

### 意外 / 卡住

- **D1（見 spec §Changelog）**：A6 的負面驗證抓到**第三個缺口** —— `CH-007` 在新判準下仍落不進去。
  補了「新增內部工具 < 3 天 → Change」那一列。**這就是 A6 存在的理由**：
  如果只驗「我修的兩個缺口有沒有修好」，這一項永遠不會被發現。
- **A4 一開始是 FAIL（+191 bytes）。** 逐句壓掉 CH-008 一小時前加的冗詞後變成 −94。
  過程中發現 guardrail 8 有一句與首句重複、Tech Stack 那格把 ADR-0011 的去向寫成 `CH-009`（實際是 CH-010）。

---

## A6 負面驗證 ⭐ —— CH-001～008 重跑新判準

**方法**：拿改完的 §1.1 判準，逐個問「這個 CH 在**今天的**判準下會落到哪」。
**通過條件**：每一個都要有明確去處。落不進去的代表判準仍不完整。

| CH | 實際做了什麼 | 新判準下的落點 | 與當初一致？ |
|---|---|---|---|
| CH-001 | 改 `03`（加跨境分級）+ `02a`（加 `cross_border_*`）—— 兩者都是已 approve 的設計文件 | **Change**（改既定設計）| ✅ 一致 |
| CH-002 | 24 個資料檔對照規格 → `09-analysis/` 報告，**沒改任何規格** | **不走軌** → 寫報告 + commit | ❌ 當初誤走 Change |
| CH-003 | 改 `02a`（§0 索引 + 三項模型決策）+ `17` | **Change**（改既定設計）| ✅ 一致 |
| CH-004 | 30 個 screen fragment 對照規格 → 報告 | **不走軌** | ❌ 當初誤走 Change |
| CH-005 | 產出 = ADR-0001 / 0006 / 0007 | **不走軌** → 直接寫 ADR | ❌ 當初誤走 Change |
| CH-006 | 修 `ci.yml`（CI 從第一個 PR 起就沒綠過 = 行為一直都錯）| **Change**（§3.1 已與 §4.1 對齊）| ✅ 一致 |
| CH-007 | 新增 lint detector + 改 `ci.yml` + 修 3 個 shellcheck | **Change**（新增內部工具 < 3 天）| ⚠️ 靠 **D1 新增的判準**才落得進去 |
| CH-008 | 改 ADR-0006 前提 + 參數 #4 + 18 檔設計文件 | **Change**（改既定設計）| ✅ 一致 |

**結果：8/8 有明確去處。** 其中 3 個（CH-002/004/005）在新判準下**不該走軌**，
1 個（CH-007）靠 D1 補的判準才落得進去。

> ⚠️ **不回溯改這三個。** 變更記錄是歷史 —— 與 `CH-008` 對 `09-analysis/` 稽核報告
> 採取的原則相同。它們留在 register 裡，本表就是它們的註腳。

### 判準的形狀（改完之後）

```
改現有行為 / 既定設計  → Change      改的是已 approve 且約束後續工作的東西
新增內部工具 < 3 天    → Change      使用者看不到 = 工具（D1）
修「本來對、現在錯」   → Bug         有「為什麼測試沒抓到」可問
「一直都錯 / spec 缺口」→ Change      沒有 regression 可言，是缺口
純稽核 / 分析          → 不走軌      報告本身就是產出
產出就是一份 ADR       → 不走軌      ADR 本身就是產出
全新產品功能           → Phase
trivial                → 直接 commit
```

---

## 完成摘要

**實際 vs spec**：一項偏離（D1，A6 抓出的第三個缺口），已在 spec §Changelog。範圍決策未變。

**Acceptance 逐條**：

| # | 條件 | 結果 | 證據 |
|---|---|---|---|
| A1 | §1.1 含「既定設計」+ 兩條逃生路徑 | PASS | 決策樹 6 個分支 + 界線 blockquote |
| A2 | `:146` / `:206` 不再矛盾 | PASS | §3.1 兩列改為「本來對現在錯 → Bug」「一直都錯 → Change」，與 §4.1 一致 |
| A3 | 三處措辭一致 | PASS | `PROCESS.md` §1.1 · `CLAUDE.md` · `task-workflow.md` 皆為「改現有行為 或 既定設計」+「不走軌」列 |
| A4 | `CLAUDE.md` ≤ 29,062 bytes | PASS | **28,968**（−94）。headroom 1,032 |
| A5 | `14-adr/README.md` forcing-function 判準 | PASS | 三種形狀 + 反向防護（不得製造 forcing function）|
| A6 | CH-001～008 全部有明確去處 | PASS | 上表 8/8；過程抓出 D1 |
| A7 | `AD-RuleBoundary-1` 關閉、BACKLOG 同步 | PASS | 換成 `AD-ClaudeMdBudget-1` |

**Drive-through**：⚪ N/A —— 純文件變更，無 user-facing 行為。**gate-only verified**。

**留下的 carryover**（→ BACKLOG）：

- `AD-ClaudeMdBudget-1` 🟡 P1 —— CLAUDE.md 貼著上限運行，headroom < 500 時要結構性瘦身，
  不能再靠壓縮形容詞
- **下一件工作是新判準的第一個真實使用者**：`ADR-0011`（計算平台）依 `14-adr/README.md` 的
  forcing-function 判準 —— Azure 資源申請單在等它，**forcing function 成立**，可以無實作先寫。
  `CH-010`（Azure 資源清單）則是 Change（改既定設計 —— `11-env-resources-detail/`）。
