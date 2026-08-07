# <NN>-<topic> Design Note (Phase W{NN} extract)

> **Extract，不是 pre-write。** 這份文件從**已完成、已驗證**的實作中抽取，
> 不是實作前的規劃文件。8-Point Quality Gate 見 `docs/rules-on-demand/spike-design-note-gate.md`。
> 目標 **verified ratio ≥ 95%** —— 每個技術 claim 都有 `file:line` + 可重現的驗證方式。
> 複製時刪掉這個 blockquote。

**Purpose**: Spike-extract design note from Phase W{NN}；記錄 <topic> 已驗證的 runtime invariant
**Created**: YYYY-MM-DD (Phase W{NN} Day 4 closeout)
**Phase source**: XX.Y
**Verified ratio**: <N>/<M> ≈ <P>%
**Status**: Active / Superseded by <doc>

---

## 0. Spike Summary

- **Phase scope**: <user stories>
- **驗證期間**: YYYY-MM-DD ~ YYYY-MM-DD
- **Calibration**: bottom-up X hr / committed Y hr / actual Z hr / ratio R
- **驗證增量**: +N unit tests · +M integration · drive-through <PASS/N/A>

---

## 1. Decision Matrix

<為什麼選這個做法。**必須有比較表 + 否決理由**。>

| Option | <準則 1> | <準則 2> | <準則 3> | Decision |
|--------|---------|---------|---------|----------|
| **A（選定）** | | | | ✅ 選定 —— <具體理由> |
| B | | | | ❌ 否決 —— <具體理由> |
| C | | | | ❌ 否決 —— <具體理由> |

> ❌ 禁止「因為它是 best practice」這種理由。要寫**在我們的處境下**為什麼是它。

---

## 2. Verified Invariants

<每個已驗證的不變式一節。這是本文件的主體。>

### 2.1 <Invariant name>

- **Implementation**: `<file>:<line-range>`
- **Behavior**: <1-2 句：它保證什麼>
- **Verification**: `<可重現的指令>`
- **Test fixture**: `<路徑>`
- **Failure mode**: <這個不變式被打破時會發生什麼 —— 怎麼察覺>

### 2.2 <Invariant name>

<同上>

---

## 3. Cross-Scope Contracts（若有新契約）

<新增的跨範疇介面。**必須同時登記到契約單一來源**，不可在此平行定義。>

| Contract | Owner scope | 登記於 | Signature |
|----------|------------|--------|-----------|
| `<name>` | `<scope>` | `<契約表 §X>` | `<簽名>` |

---

## 4. Open Invariants（延後，**未驗證**）

> ⚠️ 這一節的存在是誠實的關鍵。把未驗證的東西寫進 §2 偽裝成已驗證，
> 是 design note 最常見的失敗模式。

- [ ] **<項目>** — <為什麼延後 / 什麼條件下才需要處理>
- [ ] **<項目>** — <…>

---

## 5. Rollback / Fallback

- **若此設計後續證明錯**：revert <哪些檔案> + <DB 欄位 / config>
- **估計回滾成本**: ~<N> hr
- **既有的 fallback 機制**: <有 / 無 —— 若有，指出在哪>
- **可證偽條件**: <什麼觀察結果會推翻這個設計？>

---

## 6. References

- Phase plan: `<path>`
- Phase retrospective: `<path>`
- Change record: `<path>`
- 相關規則: `<path>`

---

## Modification History

- YYYY-MM-DD: Initial extract from Phase W{NN} closeout (Day 4)
