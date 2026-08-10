# W03 — Governed extension storage, proven against RLS

**Phase**: W03（`docs/01-planning/W03-governed-extension-spike/`）
**Period**: 2026-08-10（Day 0–4，單日）
**Status**: closed
**權威來源**: [retrospective.md](../docs/01-planning/W03-governed-extension-spike/retrospective.md) ·
[design note](../docs/02-architecture/design-notes/W03-governed-extensions.md) ·
[CH-018](../docs/03-implementation/changes/CH-018-w03-governed-extensions.md)

---

## 一句話

拍板 ADR-0005（JSONB + entity-scoped catalog，**應用層 + DB trigger 雙層**），
並用它建出平台的第一個業務端點 —— 同時是第一次有 runtime 觀測。

---

## 四個值得跨 phase 記住的東西

### 1. ⭐ 元驗證要做**兩個方向**，第二個才有資訊量

| 弄壞什麼 | 結果 |
|---|---|
| trigger 中性化 | int **3 failed** —— 正是那三個繞過 validator 的測試 |
| **validator 中性化** | unit 8 failed · int **只有 2 failed** |

第二列的意思是：**validator 完全死掉時，那三個「database refuses」仍然通過**。
→ 應用層完全失效時資料完整性仍成立 —— ADR-0005「兩層形狀」是**量到的**不是推論的。

只弄壞第一個，只能證明「trigger 有用」；也弄壞第二個，才證明「兩層獨立」。
ADR-0004 當初否決選項 C 的理由正是「無法證明它擋得住任何東西的第二層與註解無異」。

### 2. ⭐ 修之前先量 —— 一個修正差點造出它要防的漏洞

Drive-through 發現跨實體寫入回 **500**（RLS 正確拒絕，但 controller 沒翻譯）。
直覺修法「42501 → 404」有個沒被問的前提：**不存在的實體 id 會不會走到 FK violation
（23503）而得到不同答案？** 會的話，這個修正就親手造出 404 vs 500 的 oracle。

實測：**`42501` × 4 · `23503` × 0** —— **Postgres 在 FK 約束之前評估 RLS `WITH CHECK`**。
不存在的實體 id 根本走不到那個會洩漏它不存在的約束。

→ 寫入路徑上「不存在」與「不是你的」不可區分，**是資料庫保證的**，
不是應用層記得要回一樣的答案。已釘成 `policy.int.spec.ts` 案例 **2b**（升版翻轉即紅）。

### 3. ⭐ Gate 綠的範圍比讀者以為的窄 —— 兩個資料庫只有一個會自我修復

Day 3 clean restart 才發現 `isms_dev` **從未套用 W03 的 migration**，落後兩天。
int 測試每次**重建** `isms_test`，所以整個 Day 2-3「int 全綠」
**不涵蓋「開發者的資料庫可用」**。→ `AD-DevDbDrift-1`

這是 `AD-NegativeGate-1` 的變體：不是設定靜默失效，是**綠燈的涵蓋範圍被誤讀**。

### 4. ⭐ Calibration 的 `actual` 欄一直在混裝兩種量

| Phase | 牆鐘跨度（`git log`）| 登記的 actual | 一致？|
|---|---|---|---|
| W01 | 4h27m | ~5.0 hr | ✅ |
| W02 | **8h10m** | **~12.1 hr** | ❌ **算術上不可能** |
| W03 | ~4h20m | ~4.3 hr | ✅ |

逐項加總大於工作實際發生的窗口 → 那不是量測，是「若由人手做要多久」的估計。
**乘數的輸入從未一致，所以它不可能收斂** —— 問題不在資料點的數量，在單位。

用一致定義重算：W01 **0.35** · W02 **0.75** · W03 **0.34**。→ `AD-CalibrationMetric-1`

### 5. ⭐⭐ 產物從來沒有以「部署時的組態」被執行過 —— PR #31 的 CI 才發現

`映像 build + 啟動探測` 第一輪紅：**API 在 `NODE_ENV=production` 下拒絕啟動**。

```
DevPrincipalInProductionError: dev-principal was reached with NODE_ENV=production.
Entity scope must come from a credential (CLAUDE.md 約束 8 鐵律 3)
```

`Dockerfile:94` 設 production → `PolicyModule.onModuleInit()` → 拋錯 → 程序死。

**守衛是對的**（唯一的範疇來源是寫死的 SG1，讓它在 production 服務就是隔離事故）。
錯的是**沒有任何別的東西可能發現這件事**：78 unit + 32 int 跑在 `NODE_ENV=test`，
Day 3 的 clean restart 跑在 `development`。**沒有一項碰過 production 唯一會走的那條路徑。**

→ 拍板：gate 改成正反兩面都驗（development 必須服務 / production 必須拒絕**且理由正確**），
成為 `AD-NegativeGate-1` 的**第 6 個負面 gate**，且幾乎免費 —— 行為本來就在。

**同一輪還紅了另一個**：Day 3 記的測試污染修法只成立一半 ——
軟刪除擋不住沒有 `retiredAt` 過濾的查詢，而 **jest 的檔案順序本機與 CI 不同**
（暖快取依時間 / 冷快取依大小）。**同一個 commit，本機綠、CI 紅。** → `AD-JestFileOrder-1`

> 兩個缺陷的共同點：**都在 Day-0 三-prong 的射程外** ——
> 一個需要跨 suite 的執行順序，一個需要部署時的環境變數。
> Day-0 驗的是「plan 對 repo 的斷言」，這兩者都不是。

---

## 拍板 / 關閉

- **ADR-0005 採納** —— JSONB + catalog，雙層驗證，4 條可證偽條件（本 phase 未觸發任一條）
- **OQ-6 關閉** → decision-form 開放 **4 → 3**
- `AD-CacheControl-1` ✅ —— 判準是「**entity-scoped 嗎**」不是「敏感嗎」→ 全域 `no-store, private`，
  **無例外清單**（清單過時的方向是洩漏）
- `AD-ScopedClientDI-1` ✅ —— ⚠️ **結論與原提議不同**：DI token **不建**（零消費者 = AP-5），
  型別是 `core-model` 自宣告的**結構型別**（契約層是葉節點，裝不下 generated Prisma 型別），
  實例走**方法參數**由 `modules` 傳入。`scope-boundaries.md` 已用量到的形狀取代原設計意圖
- `AD-ScopeConcurrency-1` ✅ —— 40 次**交錯**查詢的常駐測試，逐列斷言
- **M1 前置已清空**

---

## 未做 / 刻意不做

- **DI token** 🚧 —— 解封條件 **M4**（真的憑證來源）。checklist 2.1 未刪未勾
- **JSONB GIN 索引** —— YAGNI；解封條件是 M1 出現真實跨記錄查詢需求
- **`AD-GrepAssertion-1` 升第 4 級**（hook 注入）—— 本 phase 又犯 3 次且**同一 session 內**，
  已達判準，但 hook 每回合付 context 成本且 CH-017 才剛裝一個 → **交由使用者排序**（節流閘）

---

## 誠實標記

**API-level verified against a clean process** —— 真進程 + 真 PostgreSQL + 真 RLS，11 案例。
**不是「可用」**：沒有 UI，沒有人透過 UI 用過它。W01/W02/W03 至今**零 UI drive-through**。
