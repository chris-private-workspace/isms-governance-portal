# Spike Design Note — 8-Point Quality Gate

**Purpose**: spike phase 的 Day 4 closeout 產出 design note 時的品質門檻。

**Category / Scope**: Documentation / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

**Trigger（什麼時候 Read）**: spike phase 的 Day 4 closeout。

---

## 先判斷：這個 phase 需要 design note 嗎

| Phase 類型 | 判準 | 需要 design note？ |
|------------|------|-------------------|
| **Spike** | 探索新領域 / 新技術 / 新 gap，沒有既有 pattern 可抄 | ✅ **必須** |
| **Feature continuation** | 擴充已驗證範疇、複用既有 pattern | ❌ 不需要（progress + retro 就夠）|
| **Bug fix** | 修既有功能 | ❌ 不需要（change record 就夠）|
| **Refactor** | 重構但行為不變 | ❌ 不需要（除非改變了架構決策）|

**判準一句話**：這個 phase 之後，**別人（或三個月後的你）要做類似的事時，
會需要知道我們在這裡學到了什麼嗎？**

---

## 核心紀律：Extract，不是 Pre-Write

Design note **從已完成的實作中抽取**，**不是**實作前預寫的規劃文件。

**為什麼**（真實教訓）：某專案在 22 個 phase 對 21 份規劃文件的 1:1 比例下，
出現普遍的 **紙面 85% vs runtime 40%** 落差 —— 文件寫的東西大部分沒真的跑起來。
根因就是文件先於實作。

**正確順序**：

```
thin vertical spike（做一個真的能跑的薄切片）
   ↓
retrospective（記下實際學到什麼）
   ↓
extract design note（從已驗證的東西抽取）
```

**禁止**：因為 gap analysis 的結果，就先寫一批新規劃文件。

---

## 8-Point Quality Gate

每份 design note 提交時，author 自查 + reviewer 逐點驗證：

- [ ] **1. Section header 對應 spike 的 user story**
  - ❌ 泛用標題：「認證設計」「快取概觀」
  - ✅ 具體：「US-2: OAuth PKCE flow as wired in Phase 5.3」

- [ ] **2. 每個技術 claim 都有 `file:line`**
  - ❌「我們用 RS256」/「token 經 JWKS 驗證」
  - ✅「`JWTManager.encode()` at `src/auth/jwt.py:42-58`」

- [ ] **3. Decision rationale 含比較矩陣**
  - ❌「我們選 X 因為它是 best practice」
  - ✅ 3-4 欄比較表 + 選它的**具體理由** + **否決其他選項的理由**

- [ ] **4. Verification command（可重現）**
  - ✅ `pytest tests/integration/auth/test_oauth_flow.py::test_real_callback`
  - ✅ 或具體的手動重現步驟（指令 + 預期輸出）

- [ ] **5. Test fixture reference**
  - ✅ 連到實際的測試資料 / mock setup 檔
  - ✅ 若是會產生費用的真實服務測試，標明成本估算

- [ ] **6. Open invariant 明確分界**
  - ✅「**本 spike 已驗證**：A, B, C」
  - ✅「**延後、未驗證**：D, E, F」
  - ❌ 把未驗證的東西寫進主段落偽裝成已驗證

- [ ] **7. Rollback / fallback 路徑**
  - ✅「若此設計後續證明錯：revert `auth.py` 的 routes + DB 欄位 `external_id`；估 1-2 天」
  - ✅ 說明 fallback 機制是否已存在
  - ❌ 假設「不會錯」

- [ ] **8. Cross-reference 到單一來源**
  - ✅ 任何新的跨範疇契約必須在契約登記表登記
  - ❌ 在 design note 裡平行定義契約（違反 single-source）

---

## Verified Ratio

Design note 的品質可以用一個比例量化：

```
verified ratio = (有 file:line + verification command 的 claim 數) / (總 claim 數)
```

| Ratio | 判定 |
|-------|------|
| ≥ 95% | ✅ 合格 |
| 70-95% | 🟡 補齊未錨定的 claim 再提交 |
| < 70% | ❌ 這不是 design note，這是願望清單 |

---

## 反面範例（禁用風格）

```markdown
## OAuth Authentication Flow
We use the provider as primary IdP.
Tokens are signed with RS256 and validated against the JWKS endpoint.
RBAC permissions follow the schema below: [200 行 pseudo-code]
```

**為何禁**：0 個 `file:line` / 0 個 verification / 0 個 decision matrix / 0 個已驗證-延後分界。
Verified ratio ≈ 0%。這段文字**看起來**像設計文件，但它無法被驗證、無法被反駁，
三個月後沒有人知道它有多少是真的。

---

## 推薦結構

模板：`docs/02-architecture/_TEMPLATE-design-note.md`

```markdown
# <NN>-<topic> Design Note (Phase W{NN} extract)

## 0. Spike Summary
- Phase scope / 驗證期間 / calibration（est vs actual）/ 測試增量

## 1. Decision Matrix
[3-4 欄比較表 + 選定理由 + 否決理由]

## 2. Verified Invariants（每個一節）
### 2.1 <Invariant name>
- Implementation: `file:line`
- Behavior: 1-2 句
- Verification: `<可重現指令>`
- Test fixture: `<路徑>`

## 3. Cross-Scope Contracts（若有新契約）

## 4. Open Invariants（延後、未驗證）
- [ ] <項目>：<延後原因>

## 5. Rollback / Fallback
- 若此設計錯了：revert <什麼>；估 <多久>

## 6. References
```

---

## Retrospective 自查格式

Day 4 retrospective 必須記錄 8-point 自查結果：

```markdown
### Design Note 8-Point Self-Check

| # | Point | 狀態 | 備註 |
|---|-------|------|------|
| 1 | Section header 對應 US | ✅ | |
| 2 | 每個 claim 有 file:line | ✅ | 23/23 claims 已錨定 |
| 3 | Decision matrix | ✅ | §1 四欄比較 |
| 4 | Verification command | ✅ | |
| 5 | Test fixture ref | 🟡 | 2 個 invariant 只有手動步驟 |
| 6 | Open invariant 分界 | ✅ | §4 列 3 項延後 |
| 7 | Rollback 路徑 | ✅ | |
| 8 | Cross-ref single-source | N/A | 本 spike 無新契約 |

**Verified ratio**: 23/24 ≈ 96% ✅
```
