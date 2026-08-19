# Phase W{NN} — Retrospective

> **這是 phase 層級的權威真相來源。**
> 位置：`docs/01-planning/W{NN}-{slug}/retrospective.md`
> `MEMORY.md` 只放指向這裡的 1 行指標；細節**不要**複製到導航檔。
> 複製時刪掉這個 blockquote。

**Phase**: W{NN} — <short scope>
**Period**: YYYY-MM-DD ~ YYYY-MM-DD
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: #N（<MERGED sha> / PR-pending）
**Change record**: `docs/03-implementation/<type>/<ID>-<slug>.md`

---

## Q1 — 交付了什麼？

<對照 plan §6 Deliverables 逐項確認。>

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | <what> | ✅ 完成 |
| US-2 | <what> | ✅ 完成 |
| US-3 | <what> | 🚧 部分（<原因>）|

**未完成項目**：<明確列出，並說明去向 —— carryover 到哪個 AD / 下個 phase>

---

## Q2 — Calibration（工時校準）

- **Scope class**: `<class>`（第 N 個資料點）
- **Agent-delegated**: yes / no / partial（plan 時宣告的值）
- **Bottom-up est**: X hr
- **Committed (calibrated)**: Y hr（mult Z [× agent_factor F]）
- **Actual**: A hr（來自 progress.md 逐日加總）
- **Ratio**: A / Y = **R**
- **Band 判定**: IN (0.7-1.2) / OVER (>1.2) / UNDER (<0.7)

**發生了什麼**（若 ratio 出 band，這段必填）：
<2-4 句：哪個環節超出/低於預期。是一次性雜訊，還是這個 class 的系統性特徵？>

**行動**: KEEP / re-point to `<new mult>` / 等更多資料點

- [ ] 已回填 `calibration-matrix.md`（≤ 1 行 ~250 字元）
- [ ] 完整敘述已寫入 `calibration-log.md` §1
- [ ] 若 |R - 1.0| > 30%：AD 已記入 `docs/01-planning/BACKLOG.md`

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：<N>（Prong 1: <a> / Prong 2: <b> / Prong 3: <c>）
- Day-0 成本：<N> min
- **預防的返工**：~<N> hr（估算依據：<哪個 drift 若沒抓到會導致什麼>）
- **ROI**: ~<N>×

**最有價值的那個 drift**：<D-N，說明它為什麼重要>

---

## Q4 — 做得好的（保持）

- <具體行為，不是「溝通順暢」這種空話>

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | |
| AP-2 Cross-directory scattering | 0 | |
| AP-3 Potemkin | 0 | drive-through PASS |
| AP-4 PoC accumulation | N/A | |
| AP-5 Speculative abstraction | 0 | |
| AP-6 Mock vs real divergence | 0 | |
| AP-7 命名 / orphan claim | 0 | |
| **總計** | **0** | |

**Lint**: `run_all.py` <N>/<N> ✅

---

## Q6 — 下次要改的（Action / Decision items）

> 這一節產出的 **AD** 是模板進化的燃料。
> 每條 AD 要有：症狀、根因假設、提議的規則變更、驗證方式。
> **不要直接改規則檔** —— 先在專案內驗證 2-3 個 phase。

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-<topic>-<n>` | <發生了什麼> | <提議的規則 / 流程變更> | 候選 / 驗證中(1/3) / 已驗證 → 可回流模板 |

- [ ] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- <未完成的 deliverable> → <去哪>
- <發現但這次不修的問題> → <AD ID>

**這個 phase 關掉的**：

- <AD ID> ✅ CLOSED

---

## Closeout Self-Check

- [ ] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [ ] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [ ] Phase 細節完整保存在 memory subfile + 本檔
- [ ] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [ ] Calibration ratio 回填 matrix（**不在** CLAUDE.md / MEMORY.md 散文裡）
- [ ] Matrix 那一行 ≤ 1 行 ~250 字元
- [ ] ⭐ **`RISK_REGISTER.md` 已複查** —— 本 phase 有沒有讓某條活躍風險的敞口變大或變小？
      有就更新該列 + 複查日期；沒有也要**看過**（🟢 mitigated / 🟡 partial / 🔴 active / ⚫ accepted）。
      ⚠️ 它不像 BACKLOG 有每日觸發，**沒有這一列就沒有任何東西會讓人回頭翻它**
- [ ] **`plan.md` frontmatter `status:` 已翻成 `closed` / `closed_partial`，內文標記一致（R9）**
- [ ] ⭐ **已採納的 ADR 已複查** —— 本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？
      有就在本片修，或開一條 AD。⚠️ 沒有這一格，審計 #7 指名的 18 條漂移沒有任何東西會問起
- [ ] ⭐ **`PR-pending` 標記已翻** —— merge 後翻標記，並以
      `gh pr view <N> --json state,mergedAt` **驗證**，不採信「已 merge」的宣稱。
      機械守衛：`check_status_markers.py` **E5**（它擋的是**矛盾**，不是標記本身）
- [ ] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
