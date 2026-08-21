# CH-048: The policy register grows the control that moves a policy

**Date**: 2026-08-21
**Phase**: W26
**Scope**: `ui`（`apps/web`）+ `modules`（`policy.controller.ts` 的 `allowed`）
**Components**: —
**PR**: **MERGED (#100, `1743be8`)** ＋ closeout **MERGED (#101, `a5c6117`)** —— ⚠️ #100 交付功能與 drive-through，**不含**本記錄

---

## Problem

W25 建了 `PATCH /policies/:id/status`，端到端驗證通過，稽核有寫入。
**而 `/policies` 上沒有任何控件會呼叫它。**

量化：W26 Day 0 讀完設計交付物的兩份 fragment，
`approve|publish|submit|retire|workflow|transition` 在其中命中 **1 次** ——
`10-policy-detail.html:28`，一個唯讀的中繼資料列。
**整份交付物沒有任何一個控件會推進政策狀態。**

⇒ 一個「已驗證但無法到達」的能力，就是 AP-3 Potemkin。
`PROGRESS-METRICS.md:157` 為此帶著一句必須照抄的射程：
**「能力在、無入口」**，不可寫成「使用者可以推進政策狀態」。

---

## Root Cause

**不是「還沒做」。** 根因是**兩份權威文件描述的是不同的東西，而沒有人注意到中間有洞**：

| 來源 | 它把 policy 模型成什麼 |
|---|---|
| `design_handoff/fragments/screens/09-policies.html` · `10-policy-detail.html` | **受控文件** —— 下載它、開啟它、讀它的版本歷史 |
| `02a-data-model-spec.md:358-372` | **七條邊的生命週期** |

兩者都對，交付物只是**從來沒有畫第二個**。而 CLAUDE.md 約束 6 的預設處置是
「不對齊就 STOP and ask」—— 那條規則預設的是「交付物**簡化**了領域邏輯」，
這裡卻是「交付物**完全沒說**」。**沒有可對齊的對象，就沒有東西會觸發那個 stop。**

`15-design-alignment.md` 自己也是證據：在本片之前，`policy` 一詞在該檔出現**恰好一次**，
而且是 §6 的一個導覽項。

---

## Solution

**建這個控件，並把它記成已核可的偏離而不是即興發揮**（`15-design-alignment.md` §4.1，
產品負責人 2026-08-21 核可）。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `docs/02-architecture/15-design-alignment.md` §4.1 | 新增 | 完整裁決：量測、ruling、**命名射程**、兩條既有規則的處置。§7 加一行指標 |
| `apps/api/src/modules/policy/policy.controller.ts:123-125` | 修改 | `withAllowed()` —— 套在 `list()` / `byId()` / **`transition()`** 三處 |
| `apps/web/src/lib/api/client.ts` | 修改 | `patch<T>` + `ApiRefusedError` |
| `apps/web/src/lib/api/client.test.ts` | 新增 | 7 條，本 repo 第一個直接測 fetch 層的檔 |
| `apps/web/src/lib/api/policies.ts` | 修改 | `transitionPolicy` + `PolicyRow.allowed`（**必填**） |
| `apps/web/src/app/(app)/policies/page.tsx` | 修改 | `ACTION` 對照表、動詞按鈕欄、`pending`、三種失敗 banner |
| `apps/web/src/i18n/registers.{en,zh-Hant}.json` | 修改 | 16 key × 2 locale |
| `apps/api/src/workflow/transitions.ts` | **UNTOUCHED** | ADR-0002 的核心。`allowed` 是**導出值**不是第二份真相 |

### Load-bearing 細節（看起來是小事，拿掉就會壞）

1. **`transition()` 的回應也帶 `allowed`。** plan 沒寫，AC-5 蘊含。
   少了它，畫面會在狀態已經正確的情況下**繼續提供舊狀態的動作** —— 而且看起來完全正常。
2. **成功時整列由回應取代**，不是 patch 一個 `status` 欄位。理由同上。
3. **`pending` 存 row id 不是 boolean** ⇒「只鎖那一列」是型別的結果，不是額外邏輯。
4. **busy 時 `data-hov` 要撤掉**，不只是 `disabled` —— W19 量到 disabled 按鈕照樣匹配
   `[data-hov]:hover`，當時加的守衛沒涵蓋這個形狀。
5. **`allowed` 必填非選填。** `retired` 的 `[]` 是「後面沒有了」這個**主張**，
   與「欄位不存在」不是同一件事，型別上不可讓它退化成後者。
6. **動詞對照表寫字面量不用模板拼裝。** `('policies.action.' + to)` 需要
   `as TranslationKey` 才能編譯，**而那個 cast 正是唯一會抓到錯 key 的檢查**。

### 命名射程（`15:116`）

`02a` §4 只標了**七條邊中的一條**（`:365` "changes requested"）。
⇒ 六個動詞裡**只有一個是程序用語的轉寫**，其餘五個是**目標狀態名**的轉寫。
這個區別寫在 `ACTION` 的註解裡而不只在設計文件裡 —— 讀 code 的人不會去翻 `15`。

---

## Verification

**Gate**（本機）: format/lint/type web+api **0** · api unit **511 / 41**（baseline 507 → **+4**）·
api int **280 / 22** · web **120 / 12**（baseline 104 → **+16**）· build clean · `run_all` **11/11**

**CI**（PR #100）: **6 / 6 pass**。逐 step 查證涵蓋 Format / Lint / Negative gates / Type /
Tests / Build / **Integration tests**。⛔ **不涵蓋 drive-through** —— CI 沒有瀏覽器。

**新增測試**: `client.test.ts` 7 條 · `policies.test.tsx` +9 條。
⭐ **負面測試靠中性化證明它們在測東西**，兩次預測寫在執行之前、兩次逐條命中：

| | 中性化 | 預測 | 實測 |
|---|---|---|---|
| N1 | `advance()` 忽略 `to`，永遠送 `allowed[0]` | 1 紅 | ✅ 1 failed / 119，逐字命中 |
| N2 | 成功時只更新 `status` | 1 紅 | ✅ 1 failed / 119，逐字命中 |

N1 是必要的：**其餘每一條測試都點第一顆按鈕**，忽略參數的實作會讓它們全部照樣綠。

**Drive-through**: 真 UI + 真 API + 真 Postgres。
主路徑 `POL-SG1-900002` `draft` →(Submit for review)→ `Under review` →(Approve)→ `Approved`；
徽章、動詞、meta 行同步更新。三條失敗路徑各走一次，呈現互不相同。
⭐ **「不重整」是量到的**：點第一顆按鈕前種了一個 window marker（頁面若重整它會消失），
五次互動後仍存活。
截圖：`docs/01-planning/W26-policy-transition-ui/artifacts/day3-0{1,2,3}-*.png`

**Verdict**: ✅ **PASS**，射程如下 ——
本次證明的是「**任何**打開這個畫面的人都能推進政策狀態」，
**不是**「有權限的人能推進」。沒有權限閘（M4，`AD-RbacUnenforced-1`），
畫面上以 `policies.actions.noRoleCheck` 明說這件事。

### Drive-through 抓到而 gate 沒抓到的

1. ⛔ **`audit_log.before` 為 NULL**（`actor_id` 亦然）。稽核記了「它變成 in_review」，
   **沒記「原本是什麼」** ⇒「誰、從哪個狀態核准的」今天**兩個都答不出來**。
   ⭐ **這不是疏漏，而且比疏漏重要**：`ADR-0003:118` 明文寫著
   「`before` is always NULL and `after` is the REQUESTED payload」——
   `runScoped` 把**未啟動的** promise 交給 `$transaction`，所以稽核列不能依賴寫入結果；
   唯一能取到真實前後值的 `INSERT ... SELECT` 正是 `eslint.config.mjs:75-77` 禁止
   `audit-trail` 範疇做的事。**這是一個已知、已記錄、有理由的取捨。**
   ⇒ 真正的發現是 **`ADR-0003:154` 的可證偽條件 FC3**：
   「Any requirement needs the true prior state in `before`」，現況欄寫著
   **`Not required by any built feature`（2026-08-14）** —— **本片可能就是那個 feature。**
   ⛔ **不自行宣告 FC3 觸發**：ADR 說觸發時的動作是「把稽核寫入移進 per-table trigger」，
   那是重大架構變更，宣告等於替使用者承諾它。→ 表面化為 `AD-Adr0003Fc3Triggered-1`。
2. ⚠️ **`New policy` 在截圖上看起來完全可按**，DOM 是 `disabled / 0.5 / not-allowed`。
   同一個視覺陷阱在本 repo 第 **2** 次（W25 Day 3 是反方向）。

### 文案逐條唸 —— 16 條裡 **2 條是假的**，而每一項 gate 都是綠的

- `transition.unreachable` 原文「Nothing was changed.」**不成立** ——
  網路錯誤可能發生在請求送達之後。⭐ 同一句話對 `refused` / `gone` **是真的**
  （guard 在 write 之前、compare-and-set 落空都沒寫入）⇒ **必須逐條唸，不能整批判斷**。
- **按鈕本身暗示了權限**。檔頭寫了「不是權限過濾的」，但**檔頭使用者看不到**。
  ⇒ 新增畫面上的 `policies.actions.noRoleCheck`。

---

## Impact

- **Breaking change**: no（`PolicyRow.allowed` 必填只影響本 repo 內的測試 fixture）
- **Migration**: no —— **零 DB 變更**，`allowed` 是導出值不是欄位
- **Config**: 無新增環境變數
- **重啟需求**: 無 startup-only wiring
- **Rollback**: revert PR #100。`transitions.ts` 未被動過，所以 revert 不影響 W25 的能力

---

## 相關

- **關掉的待辦**: `AD-PolicyTransitionNoUiEntry-1`
- **同類前例**: `CH-047`（W25 建了這條端點）· `CH-044`（W24 建了 `/policies` 的讀取路徑與
  `client.ts` 的抽取）—— 本片是那兩片的匯合點
- **產生的待辦** → `docs/01-planning/BACKLOG.md`（`AD-AuditTransitionMissingBefore-1` 等 4 條）
