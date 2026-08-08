# CH-008 — Checklist

> 從 [`spec.md`](./spec.md) §Acceptance 導出。
> 🔴 **只能 `[ ]` -> `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

## 實作

### ADR 層

- [x] **新增 ADR-0010（單一區域部署拓撲）**
  - DoD: 五個必備區塊齊全；§相關寫 `取代: ADR-0006`；§Consequences 記下 ADR-0001 第三個 API 消費者已失效；記下 stakeholder 訊息需更正
  - Verify: `python scripts/lint/run_all.py`（doc-links 解析連結）
- [x] **ADR-0006 Status 一行**
  - DoD: `已採納` → `已被 ADR-0010 取代`；內文未動
  - Verify: `git diff --stat` 對該檔顯示 1 insertion / 1 deletion
- [x] **`14-adr/README.md` 索引 + §尚待撰寫表**
  - DoD: 0006 Status 更新；0010 加列；ADR-0009 那列的「資料落地」阻斷描述修正
  - Verify: Read

### 導航層

- [x] **`CLAUDE.md`** — Tech Stack · 已確認參數 #4 · guardrail 8 例子 · `entity-scope` 職責 · 約束 7 事實 · Services 拓撲註 · Environment Setup
  - DoD: 7 處全改；**byte 預算未超**（上限 30,000）
  - Verify: `python scripts/lint/check_rules_hygiene.py`
- [x] **根 `README.md`** — §Status 的 ADR-0006 阻斷句 · §Jurisdictions 列
  - DoD: 中國移出；ADR-0006 不再描述為 M0 阻斷（已被取代）
- [x] **`docs/architecture.md`** — `entity-scope` 職責 · §跨區聚合 · §ADR 表
  - DoD: 三處；順帶修 §ADR 表把 0006「未定」改為已取代（既存 stale）

### 設計文件層

- [x] **`00-project-charter.md`** D6 + §Assumptions
- [x] **`01-architecture-overview.md`** §Design principles（**保留可攜性原則，只改理由句**）
- [x] **`02a-data-model-spec.md`** §Jurisdiction + §posture_snapshot replication — **加註記不刪**
  - DoD: `cross_border_*` 欄位定義保留；明標「無現行使用案例，Wave 1 不建強制機制」
- [x] **`03-multi-entity-and-jurisdiction.md`** §Jurisdiction + §Cross-border — **加標頭不刪**
  - DoD: `:45` 改 13 OpCo / 11 管轄區；`:47` 中國段移除；§Cross-border 整節加保留標頭
- [x] **`06-tech-stack-and-decisions.md`** §Open decisions ADR-0006 列 + §ADR-0006 blocking 註
- [x] **`07-wave1-build-plan.md`** §Foundation hard requirements + **M0 DoD** + §Suggested approach
  - DoD: ⭐ M0 DoD 的 per-region 子句改掉 —— 這是硬 gate，漏改代價最大
- [x] **`10-wave2-compliance-and-obligations.md`** obligation 例子移除 CN PIPL
- [x] **`14-ai-agent.md`** §Sovereignty — 加註記（Wave 3，事實已變）
- [x] **`15-design-alignment.md`** §1（14→13 OpCo、12→11 管轄區、移除 RCN 列與 PIPL 段）+ §7 action 表 + §8
- [x] **`16-secure-development-dod.md`** `:78` 的 China residency 句

### 規則層

- [x] **`docs/rules-on-demand/multi-tenant-data.md`** §資料落地與滾升的張力

### 追蹤層

- [x] **`decision-form.md`** OQ-1 重指向 ADR-0010
- [x] **`BACKLOG.md`** — 關 `AD-Decider-1` · 改 `AD-Residency-1` / `AD-Mockup-3` · 新增 `AD-Constraint7-1` · §Pending Decisions 的中國列 · §Shipped 加 CH-008

## 測試

- [x] **無新增測試（純文件）**
  - DoD: 以覆蓋聲明取代；判定表進 `progress.md`
  - Verify: `python scripts/lint/run_all.py`

## 驗收（對應 spec §Acceptance）

- [x] **A1** ADR-0010 五區塊齊全
- [x] **A2** ADR-0006 只改 Status 一行 — Verify: `git diff` 該檔 = 1 行
- [x] **A3** `CLAUDE.md` #4 與 `00` D6 一致
- [x] **A4** `15` §1 = 13 OpCo / 11 管轄區
- [x] **A5** 覆蓋 grep 判定表完成（34 檔全部有判定）
- [x] **A6** `run_all` 6/6 + CI 綠
- [x] **A7** BACKLOG / decision-form 同步

## Drive-through

- [x] **N/A —— 純文件變更，無 user-facing 行為**（PROCESS R8 豁免；報告寫 gate-only verified）

## 收尾

- [x] `progress.md` 寫完成摘要，`spec.md` status -> `done`
- [x] BACKLOG 同步（R7）
- [x] 架構級決定有 ADR（R5）—— ADR-0010
