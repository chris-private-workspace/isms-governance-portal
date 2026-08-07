# 檔案 Header 與修改紀錄規範

**Purpose**: 統一新建檔案的 metadata header，強制記錄修改歷史（newest-first），確保上手快速與修改可溯。

**Category**: Development Process / Standards
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

---

## 為什麼需要此規範

| 痛點 | 解法 |
|------|------|
| AI 助手接手不知檔案目的 → 重複探查浪費 context | File header 一秒鎖定範疇與用途 |
| 代碼散落跨範疇難追溯 | Category 標籤強制歸屬 |
| 「結構在但無內容」的 Potemkin | Description + Key Components 強制說明真實用途 |
| git blame 解決不了「為何這樣設計」 | Section header 的 Why + Alternative considered |
| 修改累積無歷史 → 三個月後沒人知道為什麼 | Modification History 記錄行為變更 |

---

## 新檔 Header 範本

### 程式碼檔案（通用結構）

不論語言，header 都包含這些欄位（用該語言的註解語法）：

```
File: <path from repo root>
Purpose: <一句話：這個檔案做什麼>
Category: <範疇 / 分層歸屬（見 CLAUDE.md §Scopes）>
Scope: <Phase XX / Phase W{NN}>
Owner: <負責範疇 / 參考文件>

Description:
    <2-6 行：實際邏輯流程。不是重述 Purpose，是說明「怎麼做」。>

Key Components:
    - <ClassName>: <職責>
    - <function_name>: <職責>

Created: YYYY-MM-DD (Phase W{NN})
Last Modified: YYYY-MM-DD

Modification History (newest-first):
    - YYYY-MM-DD: <verb> <what> (Phase W{NN}) — <one-line reason>

Related:
    - <design doc §section>
    - <相關契約 / 介面定義>
```

**Python 範例**：

```python
"""
File: src/orders/pricing.py
Purpose: Order pricing engine; applies discount rules and tax in a fixed precedence.
Category: Domain / Orders
Scope: Phase 3 / Phase 3.2

Description:
    Resolves the final price in 3 stages: (1) base line-item sum,
    (2) discount rules applied in priority order (first match wins),
    (3) tax computed on the post-discount subtotal.
    Rounding happens ONCE at the end to avoid accumulated drift.

Key Components:
    - PricingEngine: main entry; `price(order) -> PricedOrder`
    - DiscountRule: ABC; concrete rules live in `rules/`
    - RoundingPolicy: enum controlling banker's vs half-up

Created: 2026-01-15 (Phase 3.2)
Last Modified: 2026-02-03

Modification History (newest-first):
    - 2026-02-03: Fix tax applied pre-discount (Phase 3.5) — FIX-014
    - 2026-01-15: Initial creation (Phase 3.2)

Related:
    - docs/02-architecture/03-pricing-spec.md §2 Discount precedence  <!-- path-check: ignore -->
"""
```

**TypeScript 範例**：

```typescript
/**
 * File: src/features/orders/OrderSummary.tsx
 * Purpose: Renders the priced order breakdown with per-line discount attribution.
 * Category: Frontend / Orders
 * Scope: Phase 3 / Phase 3.4
 *
 * Description:
 *   Consumes PricedOrder from the pricing API and renders 3 sections:
 *   line items, discount attribution, tax + total.
 *   Discount attribution is the non-obvious part — a single rule can
 *   affect multiple lines, so we group by rule id, not by line.
 *
 * Key Components:
 *   - <OrderSummary>: main container
 *   - useDiscountAttribution: groups discounts by rule for display
 *
 * Created: 2026-01-20 (Phase 3.4)
 * Last Modified: 2026-01-20
 *
 * Modification History:
 *   - 2026-01-20: Initial creation (Phase 3.4)
 */
```

**Markdown 設計文件**：

```markdown
# Document Title

**Purpose**: One-line description of what this document covers.
**Category / Scope**: Category / Phase XX / Phase YY
**Created**: YYYY-MM-DD
**Last Modified**: YYYY-MM-DD
**Status**: Draft / Active / Deprecated

> **Modification History**
> - YYYY-MM-DD: <change> (Phase W{NN})
```

---

## Section Header 規範（檔案內重要區塊）

每個重要 class / 大型 function / 邏輯區塊開頭加**短註解**說明 **WHY**（不是 WHAT）：

```python
# === PricingEngine: single-pass pricing with deferred rounding ===
# Why: the previous per-stage rounding accumulated up to 3 cents of drift
# on 20+ line orders (FIX-011). Rounding once at the end fixes it.
# Alternative considered:
#   - Decimal everywhere — rejected: the tax vendor's API takes floats anyway
#   - Round per line — rejected: that IS the bug we're fixing
# Reference: docs/02-architecture/03-pricing-spec.md §4 Rounding  <!-- path-check: ignore -->
class PricingEngine:
    ...
```

**WHAT 寫在 code 裡，WHY 寫在註解裡。** 重述程式碼在做什麼的註解是雜訊。

---

## Modification History 詳細規範

### 格式：**1 行上限**

```
Modification History (newest-first):
    - YYYY-MM-DD: <verb> <what> (Phase W{NN}) — <one-line reason>
```

**字元預算**：每條含縮排必須 ≤ 100 字元。
實際可用約 100 減去縮排 ≈ 90 字元。
超過就：拆成多個 commit、或把細節移到 commit message body / change record、
或把 reason 濃縮成 scope 關鍵字。

**寫作模板**（第一次就寫進預算，不要寫完再修）：

| 形狀 | 範例 | 字元 |
|------|------|------|
| `DATE: Phase X.Y — <verb> <scope>` | `2026-02-03: Phase 3.5 — full implementation` | ~50 |
| `DATE: Phase X.Y — <verb> <scope> (closes AD-Foo)` | `2026-02-03: Phase 3.5 — extract rounding (closes AD-Price-2)` | ~75 |

**反模式**：

- ❌ **一條塞 4 個子句** → 拆成 2 條，或細節移到 change record
- ❌ **冗長名詞片語** → 用動詞：`extend` 勝過 `extension of`；`add` 勝過 `addition of`
- ❌ **嵌入 > 30 字元的路徑** → 用 scope 關鍵字（`pricing rounding`）取代完整路徑

**經驗法則**：若第一版要靠 lint 才發現超長，你的 reason 就寫太囉唆了。
目標 **60-80 字元**（含前綴）。

### 動詞選擇

| 動詞 | 用途 |
|-----|------|
| `Add` | 新增功能 / 方法 |
| `Fix` | 修復 bug |
| `Refactor` | 重構但行為不變 |
| `Update` | 增強現有功能 |
| `Remove` | 刪除功能 / 死代碼 |
| `Deprecate` | 標記過期但保留相容 |
| `Align` | 對齊規範 / 契約 |

### 三層級對應（何時記錄）

| 改動類型 | 記錄？ | 範例 |
|---------|-------|------|
| **Trivial** | ❌ 否 | typo / 格式 / 變數重命名 |
| **Behavioral** | ✅ 是 | 修 bug / 新功能 / 重構邏輯 |
| **Structural** | ✅ 是 | 拆檔 / 範疇遷移 / 介面變更 |

---

## 禁止事項

### ❌ 1：行內歷史註解

```python
# ❌ 禁止
x = compute()  # 2026-02-01 changed from old_compute()

# ✅ 正確 —— Modification History 記錄；git blame 已有詳細
x = compute()
```

### ❌ 2：保留 dead code 註解

```python
# ❌ 禁止
# old version:
# def old_method():
#     return x + y

# ✅ 正確 —— 直接刪；git 有完整歷史
```

### ❌ 3：模糊 commit message

```
❌  git commit -m "update"  /  "fix"  /  "changes"
✅  git commit -m "fix(pricing): tax applied pre-discount on multi-line orders"
```

### ❌ 4：跳過 change record

bug / feature 變更必須有對應的 `docs/03-implementation/FIX-XXX` / `CHANGE-XXX`。

### ❌ 5：MHist 多行 / 子項 / 引用標記

```
❌ 禁止 —— 多段 reason
- 2026-02-03: Fix tax ordering (Phase 3.5)
    This change moves tax computation after discounts because the
    spec §4 requires post-discount basis. Tested via test_tax_order.py.

❌ 禁止 —— 子項清單
- 2026-02-03: Refactor pricing (Phase 3.5)
    - Split into engine + rules
    - Added RoundingPolicy

✅ 正確 —— 單行
- 2026-02-03: Fix tax applied pre-discount (Phase 3.5) — FIX-014
```

**Why**：多行 MHist (a) 在成熟檔案裡觸發行長 lint，(b) 重複 commit message body
（`git log` 已保存），(c) 破壞「5 秒掃過 5 條」的 newest-first 掃描性。
豐富細節屬於 commit message body / change record。

---

## 例外情況

| 情境 | 處理 |
|------|------|
| **生成檔案**（migration / proto / codegen）| 可省略手寫 header，保留工具的生成標記 |
| **第三方 vendor 檔** | 不修改其 header；保留原樣 |
| **空的 package init 檔** | 可省略 |
| **測試檔** | 可用簡化版（File / Purpose / Category / Created / Modified）|

---

## 檢查清單（Code Review）

- [ ] 新檔有標準 header（Purpose / Category / Created）？
- [ ] Category 對應專案的範疇定義？
- [ ] Key Components 反映真實用途（不是空殼）？
- [ ] Modification History newest-first 且每條 1 行？
- [ ] 修改現有檔時更新了 Last Modified？
- [ ] Behavioral / Structural 變更有 MHist 記錄？
- [ ] 重要區塊有 Why + Alternative considered？
- [ ] 註解 / docstring 沒有引用已移除的東西？
