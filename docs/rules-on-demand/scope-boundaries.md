# 範疇邊界規則（Scope Boundaries）

**Purpose**: 定義程式碼的範疇歸屬、跨範疇 import 規則、共用型別的單一來源。

**Category / Scope**: Architecture / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-08
**Status**: Active

> **Modification History**
> - 2026-08-08: Fill scope table + import matrix for this project (W01) — was template placeholders

**Trigger（什麼時候 Read）**: 新建檔案 / 跨範疇 import / 不確定某段代碼歸哪個範疇。

---

## 核心原則

### 原則 1：單一範疇歸屬

**任何檔案必須明確歸屬於恰好一個範疇。**

無法歸屬 = 設計有問題。這時候的正確反應是**停下來釐清**，不是硬塞進最像的那個目錄。

### 原則 2：範疇內聚

同一範疇的代碼集中在**單一目錄**。散落到 2 個以上目錄 = AP-2（Cross-Directory Scattering）。

### 原則 3：跨範疇只走公開契約

範疇 A 要用範疇 B 的東西，只能透過 B 的**公開介面**或**共用契約層**。
禁止 import 對方的私有實作。

---

## 本專案的範疇定義

> 權威來源是 `CLAUDE.md` §範疇（Scopes）。本表是它的可執行形式 ——
> `eslint.config.mjs` 的 `boundaries` 分區逐一實作這張表與下方的矩陣。
> **兩者不一致時以 `CLAUDE.md` 為準，並修正這裡與 eslint 設定。**

| # | 範疇 | 目錄 | 職責 |
|---|------|------|------|
| 1 | `core-model` | `apps/api/src/core-model/` | 實體圖：risk / control / obligation / policy / process / asset / entity / event / issue / evidence。canonical core + governed extensions |
| 2 | `entity-scope` | `apps/api/src/entity-scope/` | 組織階層、entity scoping / RLS、管轄區標記 |
| 3 | `identity` | `apps/api/src/identity/` | 認證（SSO/MFA）、entity-scoped 授權、三道防線分離、SoD |
| 4 | `workflow` | `apps/api/src/workflow/` | 可設定狀態機、簽核、SLA、升級 |
| 5 | `audit-trail` | `apps/api/src/audit-trail/` | Append-only、防篡改、證據等級日誌 |
| 6 | `api` | `apps/api/src/contracts/` · `packages/types/` | API-first 契約層；連接器框架（後續 wave 填充）|
| 7 | `modules` | `apps/api/src/modules/` | Wave 1 兩個證明模組：Policy Management、Risk + Control registers |
| 8 | `ui` | `apps/web/` | 角色式 UI、滾升儀表板；消費設計交付物的 tokens 與 class 名 |

### 範疇歸屬決策樹

```
這段代碼在做什麼？
├── 定義或持久化核心實體（risk / control / policy / asset / …）→ core-model
├── 決定「誰看得到哪個實體的資料」（階層 / RLS / 滾升子樹）→ entity-scope
├── 決定「你是誰、你能做什麼」（登入 / 角色 / SoD）→ identity
├── 推進一份文件或請求的狀態（簽核 / SLA / 升級）→ workflow
├── 記錄「發生過什麼」且不可竄改 → audit-trail
├── 跨範疇共用的型別 / DTO / API 契約 → api（contracts + packages/types）
├── 某個業務模組專屬的畫面邏輯與端點（Policy / Risk）→ modules
├── 使用者介面 → ui
└── 以上皆非 → 停下來，先釐清這是什麼（新增範疇的門檻見本檔最後一節）
```

---

## 共用型別的單一來源

跨範疇使用的 dataclass / interface / enum / event schema **必須**定義在共用契約層，
**絕不**在多處平行定義。

以 `RiskStatus` 這個列舉為例（`Risk` 實體 M1 才建立，此處只談歸屬）：

| | 定義在哪 | 後果 |
|---|---|---|
| ❌ | `core-model` 一份、`modules` 再一份 | 建立當下兩邊一模一樣，所以沒有人會發現 |
| ✅ | **只在 `packages/types`**，`core-model` / `modules` / `ui` 一律 import | 三個範疇認同一份定義，`ui` 也不例外 |

`packages/types` 的匯入名是 `@isms/types`（見 `packages/types/package.json` 的 `exports`）。

**為什麼**：平行定義在建立當下看起來一模一樣，但會**分歧**。
分歧的那一天，bug 會出現在兩者的邊界上，而且極難 debug（兩邊各自看起來都對）。

> 若專案有跨範疇契約登記表（如 `docs/02-architecture/cross-scope-interfaces.md`），
> **新增契約時必須同時登記**。

---

## 允許 / 禁止的 import 矩陣

源自 `CLAUDE.md` §分層的關鍵不變式：**上層可依賴下層，下層絕不 import 上層**。
表格讀法：**列 import 欄**。

| 從 ↓ 到 → | api | core-model | entity-scope | audit-trail | identity | workflow | modules | ui |
|---|---|---|---|---|---|---|---|---|
| **api** | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **core-model** | ✅ | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **entity-scope** | ✅ | ✅ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| **audit-trail** | ✅ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ |
| **identity** | ✅ | ✅ | ✅ | ❌ | — | ❌ | ❌ | ❌ |
| **workflow** | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ | ❌ |
| **modules** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ |
| **ui** | ✅(僅型別) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — |

**關鍵不變式**：

- `api`（`contracts/` + `packages/types/`）是**葉節點** —— 誰都能 import 它，它 import 不了任何人。
  跨範疇共用的型別只能住在這裡（見上方 §共用型別的單一來源）。
- `core-model` **只依賴契約層** —— 實體圖不該知道誰在讀它、誰在稽核它。
- `audit-trail` **連 `core-model` 都不 import**。刻意的：稽核軌跡若依賴領域結構，
  每加一個實體就要改稽核程式；它只認契約層的通用形狀。這也讓 guardrail 5 的「無旁路」
  不會隨領域演進而破洞。
- `ui` 只經 **HTTP + 契約層型別**接觸後端，**不得** import `apps/api/src/**` 的任何實作。
- 反向依賴（低層 import 高層）一律禁止；`modules/` 之間**也不得互相 import** ——
  模組要協作就下沉到共用範疇或走契約層。

### ⚠️ 一個尚未被驗證的設計意圖

`core-model` 不能 import `entity-scope`（上表 ❌），但依 guardrail 4 每個資料存取都必須被
entity scope 包住。解法是**經 DI 注入而非 import**：範疇化後的 Prisma client 由
`entity-scope` 提供，其**型別**住在契約層，`core-model` 只認型別、拿不到未範疇化的 client。

**這是設計意圖，尚未跑過。** ADR-0004 的 W01/W02 spike 負責驗證它 ——
它同時是 ADR-0001 §可證偽條件 #1 的承重假設。驗證失敗則本節與上表都要重寫。

---

## 建新東西之前：先 Grep

> 這是 AP-2 最常見的來源：**假設某個東西不存在，就直接新建了一個。**

建立任何新的 service / helper / util / 型別之前：

```bash
# 1. 這個概念是否已經存在？
grep -rn "class .*<ConceptName>\|def .*<concept_name>" <src_root>

# 2. 這個功能是否已經有人做了？
grep -rn "<關鍵動詞>" <src_root> --include="*.<ext>"

# 3. 這個型別是否已經在契約層定義了？
ls <contracts_dir>/
```

找到既有的 → 用它 / 擴充它。**沒找到才建新的。**

---

## 常見違規與修正

| 違規 | 症狀 | 修正 |
|------|------|------|
| **範疇雜湊** | `tools/` 目錄裡有一堆不是 tool 的東西 | 把非 tool 邏輯移到它真正的範疇 |
| **重複實作** | 兩個目錄各有一份幾乎一樣的 retry 邏輯 | 抽到共用層，刪掉其中一份 |
| **私有 import** | `from domain._internal.helpers import x` | 改用 domain 的公開介面，或把 helper 提升成公開的 |
| **反向依賴** | `core-model/` import 了 `modules/` 的東西 | 反轉依賴：把需要的型別下沉到 `packages/types` |
| **契約平行定義** | 同一個 enum 在 3 個地方 | 移到 `packages/types`，其他地方 import |
| **繞過 entity scope** | `core-model/` 直接 import `entity-scope/` 的實作，或自己 new 一個未範疇化的 Prisma client | 只認契約層的型別，client 由 DI 注入（見 §import 矩陣的設計意圖）|

---

## 新增範疇的門檻

不要輕易新增範疇。新範疇必須滿足：

1. **有明確的職責邊界**（能用一句話說清楚它管什麼、不管什麼）
2. **至少有 3 個檔案**會歸屬於它（少於 3 個就先放既有範疇）
3. **在 import 矩陣裡有明確的位置**（誰能 import 它、它能 import 誰）
4. **更新** CLAUDE.md §Scopes 表 + 本檔 + `git-workflow.md` §Scopes

範疇數量膨脹會讓「這段代碼歸哪」變成每次都要思考的問題 —— 那就失去了範疇的意義。
