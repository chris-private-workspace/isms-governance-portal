# 09 — 跨範疇契約 Single-Source Registry

**Purpose**: 所有**跨範疇共用**的型別 / 介面 / 事件的唯一登記處。

**Category / Scope**: Architecture / cross-cutting
**Created**: 2026-08-07
**Last Modified**: 2026-08-14
**Status**: Active

> **Modification History**
> - 2026-08-14: Register the first three contracts (W12) — the audit hook inversion
> - 2026-08-07: Initial creation from template

---

## 為什麼這份文件從第一天就要存在

跨範疇共用的東西如果**平行定義**在多個地方，它們會**分歧**。

```
❌ 同一個概念定義兩次
   api/schemas.py:      class OrderStatus(Enum): PENDING, PAID, SHIPPED
   domain/order.py:     class OrderStatus(Enum): PENDING, PAID, SHIPPED, REFUNDED
                                                                        ↑ 三個月後加的
```

建立當下它們一模一樣，所以沒人覺得有問題。分歧的那一天，
bug 出現在**兩者的邊界上** —— 而且兩邊各自看起來都對，極難 debug。

**這份文件是防線**：任何跨範疇的東西，**先在這裡登記，再寫程式碼**。

---

## 鐵律

1. **跨範疇型別只能定義在共用契約層**（`_contracts/` 或等價位置）
2. **每個契約在此表登記一次**，含 owner 範疇
3. **新增契約 = 同時更新此表**（PR 檢查項）
4. **修改契約的簽名 = 標為 breaking，列出所有 consumer**

---

## 契約登記表

<!-- 每個跨範疇的型別 / 介面 / 事件一行。 -->

| # | 契約 | 類型 | Owner 範疇 | 定義位置 | Consumers | 狀態 |
|---|------|------|-----------|---------|-----------|------|
| 1 | `AuditHook` —— `intercept(writer, write, context): unknown \| null` | 介面 | `api` | `apps/api/src/contracts/audit-hook.ts:76` | `entity-scope`（呼叫）· `audit-trail`（實作）· `bootstrap`（接線）| Active |
| 2 | `AuditLogWriter` · `AuditWrite` · `AuditContext` | 型別 | `api` | 同上 `:54` · `:61` · `:71` | 同上 | Active |
| 3 | `AUDIT_HOOK` | DI token（symbol）| `api` | 同上 `:99` | 同上 | Active |

> **這三個是本 repo 第一批真正的跨範疇契約，而它們存在的原因是機械強制的**（W12 / ADR-0003）：
> `eslint.config.mjs:74` 禁止 `entity-scope → audit-trail`、`:78` 禁止 `audit-trail → core-model`，
> **兩個方向都不通** ⇒ 只能反轉到雙方都可 import 的 `api`。
>
> ⚠️ **`api` 在矩陣中是葉節點（`api -> ['api']`），所以這個檔零 import** ——
> 連一個 Prisma 型別都不能命名。`AuditLogWriter` 因此是**結構型別**（W03 的 `AD-ScopedClientDI-1`，
> 套用到隔壁一個範疇）。
>
> ⛔ **`intercept` 的回傳型別是 `unknown` 而且那是承重的**：runtime 上它是尚未啟動的
> `PrismaPromise`，標成 `Promise` 會失去整個設計倚賴的性質 —— `Promise` 已經開始跑了。
> 改這個簽名前先讀 `docs/02-architecture/design-notes/W12-audit-trail.md` §3。

**類型說明**：

| 類型 | 意思 | 變更風險 |
|------|------|---------|
| **型別**（dataclass / struct / enum）| 資料形狀 | 中 —— 加欄位通常安全，改 / 刪不安全 |
| **介面**（ABC / interface / protocol）| 行為約定 | 高 —— 所有實作都要跟著改 |
| **事件**（訊息 / SSE / queue payload）| 跨程序約定 | **最高** —— 生產者與消費者可能不同版本 |

---

## 事件契約的額外要求

事件跨越程序邊界（可能還跨越版本），要求比型別嚴格：

| 要求 | 說明 |
|------|------|
| **版本欄位** | 每個事件帶 `version`，消費者能判斷是否支援 |
| **只加不改** | 加欄位可以；改欄位語義 = 開新版本 |
| **外層結構固定** | envelope（`{type, data}`）的形狀不可變 |
| **消費者容錯** | 未知欄位要忽略，不是報錯 |

> ⚠️ **codegen 的陷阱**：從生產者型別產生消費者型別時，
> 要捕捉**結構形狀（envelope 巢狀）**而不只是欄位名。
> 真實案例：codegen 產出扁平的 `{type, ...fields}`，
> 但實際線上格式是巢狀的 `{type, data:{...}}` —— 這個錯誤重複發生了 4 次。

---

## 變更流程

### 加新契約

1. 在此表加一行
2. 在共用契約層定義
3. PR 描述註明「新增跨範疇契約」

### 改既有契約

1. **列出所有 consumer**（Grep 確認，不要靠記憶）
2. 判斷是否 breaking：
   - 加選填欄位 → 非 breaking
   - 加必填欄位 / 改型別 / 改語義 / 刪欄位 → **breaking**
3. Breaking → 考慮開新版本並存，而非原地改
4. 更新此表的 Consumers 欄

### 廢棄契約

1. 標 `Deprecated`，寫明替代品 + 移除時間點
2. 確認所有 consumer 都遷移完成
3. 才能真的刪

---

## 常見違規

| 違規 | 怎麼發現 | 修正 |
|------|---------|------|
| 平行定義 | Grep 同名的 class / type | 移到契約層，其餘 import |
| 契約層 import 了別的範疇 | 契約層應該是**葉節點** | 反轉依賴 |
| 改了契約沒更新此表 | PR review / lint | 補登記 |
| 事件加了必填欄位 | 舊消費者爆炸 | 開新版本 |

---

## 相關

- `docs/rules-on-demand/scope-boundaries.md` — 範疇邊界與 import 規則
- `docs/02-architecture/01-architecture.md` — 分層架構
- `.claude/rules/anti-patterns-checklist.md` AP-2 — 跨目錄散落
