# 範疇邊界規則（Scope Boundaries）

**Purpose**: 定義程式碼的範疇歸屬、跨範疇 import 規則、共用型別的單一來源。

**Category / Scope**: Architecture / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

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

<!-- ⚠️ 這一節必須依你的專案填寫。以下是範例格式。 -->

| # | 範疇 | 目錄 | 職責 |
|---|------|------|------|
| 1 | <範疇名> | `<目錄>` | <職責> |

> ⚠️ 這張表必須填 —— 範疇定義是「單一範疇歸屬原則」的基礎。

### 範疇歸屬決策樹

```
這段代碼在做什麼？
├── 處理外部輸入 / 輸出 HTTP → api
├── 表達業務規則（與框架無關）→ domain
├── 跟外部系統說話（DB / 佇列 / 第三方 API）→ infrastructure
├── 跨範疇共用的型別 / 介面 → _contracts
├── 使用者介面 → frontend
└── 以上皆非 → 停下來，先釐清這是什麼
```

---

## 共用型別的單一來源

跨範疇使用的 dataclass / interface / enum / event schema **必須**定義在共用契約層，
**絕不**在多處平行定義。

```
❌ 錯誤 —— 同一個概念定義兩次
   api/schemas.py:      class OrderStatus(Enum): ...
   domain/order.py:     class OrderStatus(Enum): ...   # 遲早會分歧

✅ 正確 —— 單一來源
   _contracts/order.py: class OrderStatus(Enum): ...
   api/schemas.py:      from _contracts.order import OrderStatus
   domain/order.py:     from _contracts.order import OrderStatus
```

**為什麼**：平行定義在建立當下看起來一模一樣，但會**分歧**。
分歧的那一天，bug 會出現在兩者的邊界上，而且極難 debug（兩邊各自看起來都對）。

> 若專案有跨範疇契約登記表（如 `docs/02-architecture/cross-scope-interfaces.md`），
> **新增契約時必須同時登記**。

---

## 允許 / 禁止的 import 矩陣

<!-- 依專案填寫。範例： -->

| 從 ↓ 到 → | api | domain | infra | _contracts | frontend |
|-----------|-----|--------|-------|-----------|----------|
| **api** | — | ✅ | ✅ | ✅ | ❌ |
| **domain** | ❌ | — | ❌ | ✅ | ❌ |
| **infra** | ❌ | ❌ | — | ✅ | ❌ |
| **_contracts** | ❌ | ❌ | ❌ | — | ❌ |
| **frontend** | ✅(HTTP) | ❌ | ❌ | ✅(型別) | — |

**關鍵不變式**：
- `domain` **不依賴任何東西**（除了 `_contracts`）—— 業務規則不該知道 DB 或 HTTP 存在
- `_contracts` **不依賴任何東西** —— 它是葉節點，所有人都能 import 它
- 反向依賴（低層 import 高層）一律禁止

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
| **反向依賴** | `domain/` import 了 `api/` 的東西 | 反轉依賴：把需要的型別下沉到 `_contracts` |
| **契約平行定義** | 同一個 enum 在 3 個地方 | 移到 `_contracts`，其他地方 import |

---

## 新增範疇的門檻

不要輕易新增範疇。新範疇必須滿足：

1. **有明確的職責邊界**（能用一句話說清楚它管什麼、不管什麼）
2. **至少有 3 個檔案**會歸屬於它（少於 3 個就先放既有範疇）
3. **在 import 矩陣裡有明確的位置**（誰能 import 它、它能 import 誰）
4. **更新** CLAUDE.md §Scopes 表 + 本檔 + `git-workflow.md` §Scopes

範疇數量膨脹會讓「這段代碼歸哪」變成每次都要思考的問題 —— 那就失去了範疇的意義。
