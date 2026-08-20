# Progress Metrics — Wave 1 的五把尺

**Purpose**: 回答「**進度到哪了**」，用五把有分母、有定義的尺，而不是一個百分比。
**Category**: Planning / Living document
**Created**: 2026-08-20 (CH-046)
**Last Modified**: 2026-08-20
**Status**: Active

> **Modification History**
> - 2026-08-20: Initial creation (CH-046) — 五把尺 + 里程碑錨點

---

## 0. 這份文件怎麼用（先讀這一段，否則會誤用它）

⛔ **分母是 Wave 1**（[`07-wave1-build-plan.md`](../02-architecture/07-wave1-build-plan.md)）。
Wave 2（合規與義務）、事件模組、供應商模組、AI agent、稽核／issues **不在射程內** ——
它們各有設計文件，不在 M0–M9 這十二個里程碑裡。
⇒ **「M0–M9 完成 X%」不等於「產品完成 X%」。**

⛔ **本檔不給整體完成度百分比**（使用者 2026-08-20 裁決）。理由不是保守 ——
同一個 repo 同一天，資料模型 **94%**、前端接上領域資料 **10%**。
任何單一數字都會讓讀的人得到錯的印象，而錯的那個印象**看起來很有說服力**。

⛔ **五把尺全部是代理指標。** 行數不是完成度，檔數不是功能。
`AD-ProxyMetricAsAnswer-1` 是本專案的 🔴 P0 家族，這份文件本身也在它的射程內。

✅ **本檔的數字不會過期** —— `scripts/lint/check_progress_metrics.py` 每次 `run_all`
都從 repo 重新導出並與下方宣告比對，不符即 fail。
**它自己不持有任何期望值**（`check_backlog_counts.py:17-19` 的契約）。

---

## 1. 五把尺（宣告值 —— 由 detector 比對）

<!-- progress-metrics:declared -->

| 尺 | 宣告值 |
|---|---|
| `data-model` | 34 / 36 |
| `audit-coverage` | 16 / 34 |
| `pages-domain` | 3 |
| `pages-other-http` | 2 |
| `pages-static` | 24 |
| `scopes-with-code` | 6 / 8 |
| `rls-enable-force` | 27 / 27 |
| `loc-api-prod` | 7765 |
| `loc-api-test` | 14663 |

<!-- /progress-metrics:declared -->

### 每一把尺在量什麼

| 尺 | 定義 | 導出方式 |
|---|---|---|
| **`data-model`** | 已建的 Wave 1 實體 / 索引上的實體 | **引用** `check_entity_index.py`，不複製它的實體定義（AP-2）|
| **`audit-coverage`** | 被稽核的 model 數 / 已建實體數 | `AUDITED_MODELS` set 大小（`audit.module.ts:82`）|
| **`pages-*`** | `apps/web/src/app/**/page.tsx` 分三類 | ⭐ 見下方 §1.1 —— **這裡有兩個合理定義** |
| **`scopes-with-code`** | 八個範疇中有非測試 `.ts` 的個數 | 七個在 `apps/api/src/`，第八個 `ui` 是整個 `apps/web` |
| **`rls-enable-force`** | migration 裡 `ENABLE` / `FORCE` 的出現次數 | 兩者相等且 gap 0 是 guardrail 4 的可觀察形式 |
| **`loc-*`** | 手寫行數，**排除 `src/generated/`** | `generated/` 是 Prisma client，把它算進去等於把 ~9.6 萬行不是人寫的東西記成產出 |

### 1.0 ⛔ 一把尺必須是**版控內容**的屬性，不是**工作環境**的屬性

本檔第一版多了一把 `loc-generated`（`src/generated/` 的行數）。
**本機 `run_all` 11/11 綠，CI 紅** —— 因為 `.gitignore:96` 排除該目錄，
它在本機是 `prisma generate` 之後才存在的，在乾淨的 CI checkout 上**根本不存在**（0 行）。

⇒ 那不是「進度」，是「我跑過 build 沒有」。**已移除該把尺**；
generated 的行數仍**印在輸出裡**（它是排除 9.6 萬行的理由），但**不被比對**。

> **加新尺之前先問**：一個乾淨的 `git clone`、不跑任何 build，導得出同一個值嗎？
> 導不出 ⇒ **印它，不要比對它。**

### 1.1 ⭐ 「接線」為什麼是三個數字不是一個

實測 2026-08-20：

| 類別 | 頁數 | 是誰 |
|---|---|---|
| 接上**領域** API（`@/lib/api/*`）| **3** | `(app)/policies` · `(app)/risks` · `(app)/risks/[id]` |
| 其他 HTTP（**不是**領域資料）| **2** | `/` → `/health` 探測 · `login` → `/api/demo-session` |
| 純 fixture / 靜態 | **24** | W19 port 進來的其餘畫面 |

⇒ 「接線幾頁」可以答 **3** 也可以答 **5**，看你問的是哪一個。

⛔ **這一格是本檔存在的原因之一**：`CH-046` 的緣起是我報了「**2 / 29**」而真值是 3 ——
漏掉 `(app)/risks/[id]`，因為我憑對 phase 的記憶數，沒有量。
判準與 `AD-LocalGateSetIncomplete-1` 同形：**「gate 全綠」要自帶射程，指標也一樣。**

### 1.2 ⚠️ 兩個範疇是 0，那不是四捨五入掉的

`identity` **0 個非測試 `.ts`** · `workflow` **0 個**。
這兩個是 **M4** 與 **M5** 的落點 —— 見下表。

---

## 2. 里程碑判定（人寫）+ 錨點（機器驗）

> ⛔ **detector 不判定 🟢/🟡/🔴。** 「M6 算不算完成」取決於詳情頁算不算 ——
> 那是判斷，寫進 Python 就是把判斷偽裝成量測（AP-3）。
>
> 每一列帶一個**錨點**：當初據以判定的那個機器可驗事實。
> detector 只驗**錨點**，不驗**判定**。有人往 `identity/` 加了第一個檔 ⇒ 錨點破 ⇒
> **紅燈，強制人重新判定 M4**，而不是讓這張表安靜地爛掉。
>
> ⚠️ **錨點不便宜的里程碑一律寫 `manual`，不硬編一個**。
> 替它們發明錨點比沒有更糟 —— 那是一個什麼都不代表的綠勾。

<!-- progress-metrics:milestones -->

| 里程碑 | 判定 | 錨點 |
|---|---|---|
| M0 | ⚠️ 部分（3 關 / 2 部分 / 1 待裁決）| `manual` |
| M1 | 🟢 完成 | `data_model_built() == 34` |
| M2 | 🟢 完成 | `rls_gap() == 0` |
| M3 | 🟡 部分（覆蓋 16 / 34）| `audited_models() == 16` |
| M4 | 🔴 未開始 | `scope_ts_count('identity') == 0` |
| M5 | 🔴 未開始 | `scope_ts_count('workflow') == 0` |
| M6 | 🟡 部分（列表已接，詳情未接）| `page_class('(app)/policies/[id]') == 'static'` |
| M6b | 🟢 完成 | `manual` |
| M6c | 🟢 完成 | `manual` |
| M7 | 🟡 部分（後端在，表單方法論未對齊）| `manual` |
| M8 | 🔴 未開始（**旗艦**）| `manual` |
| M9 | 🔴 未開始 | `manual` |

<!-- /progress-metrics:milestones -->

**6 verified / 6 manual。** 六個 `manual` 各有理由，不是偷懶：

| 里程碑 | 為什麼沒有機器錨點 |
|---|---|
| **M0** | DoD 六項，其中兩項**卡外部**（DAST 需 VNet 內 runner · ACA 憑證是平台預設），一項待你裁決（shell 腳本算不算 IaC）。沒有一個 repo 內的事實能代表它 |
| **M6b** / **M6c** | 已完成且穩定；錨點會是「某個 module 目錄存在」，那種錨點永遠成立 ⇒ 零偵測力 |
| **M7** | 判定的依據是 `AD-RiskForm-1` —— **表單實作的是另一套方法論**。那是領域判斷，不是可數的東西 |
| **M8** | 旗艦未開始，前置是 `AD-Mockup-2`（🔴 P0，`data.js` 以國家為鍵容不下 13 OpCo）。**「還沒開始」沒有可觀察的正向事實** |
| **M9** | 同上 —— `RISK_REGISTER` R8：Entity Zero 在 Wave 1 沒有承載體 |

---

## 3. 判讀（2026-08-20）

**一句話**：**資料層與隔離層做完了（M1 / M2 / M3 骨幹），身分層與流程層一行未寫（M4 / M5），
旗艦儀表板尚未開始（M8）。**

⚠️ 若一定要一個粗略比例：里程碑計數 **4 完成 / 4 部分 / 4 未開始**
（嚴格 33%，部分給半分 50%）。⛔ **但那個數字偏樂觀**，三個理由：

1. **M8 是旗艦而它是 0%。** 憲章寫明滾升儀表板是平台存在的理由。把它算成 1/12，
   等於把它跟 M6c（一個實體擴充）當成同一份量。
2. **M4 / M5 不是旁邊還缺兩塊，它們在下面。** `07:36` 明寫 M5「drives the policy approval flow」
   ⇒ M6 的「部分」有一半卡在 M5。已確認參數 #13 的**六角色 × 十一模組**權限模型伺服器端零實作。
   ⚠️ `entity-scope.resolver.ts` 確實是角色感知的，但那是「看得到哪些實體」，不是「能做哪些動作」。
3. **UI 是殼** —— 29 頁、3 頁接上領域資料。

**反方向的一個理由**：已完成的那半剛好是**事後補會非常貴**的那半 ——
RLS（`ENABLE 27 / FORCE 27`，含負面測試）、hash-chain 稽核軌跡、canonical core 34/36，
正是 guardrail 3 / 4 / 5 要求必須內建而非後加的。

⇒ 判讀是：**大約在一半，但剩下的那一半比較貴。**

---

## 4. 怎麼更新

數字變了 ⇒ `run_all` 會紅並**指名是哪一把尺**。照它說的改本檔 §1 的宣告值。

里程碑錨點破了 ⇒ **不要只改錨點的數字**。錨點破代表**判定的前提變了**，
要先重新判定那一列的 🟢/🟡/🔴，再把兩格一起更新。

⚠️ **這份文件的維護成本是刻意的** —— 它就是「文件不會過期」這件事的機制本身。

> **相關**：[`STATUS_AUDIT.md`](./STATUS_AUDIT.md)（跨來源漂移，**不同的問題**）·
> [`BACKLOG.md`](./BACKLOG.md)（有什麼工作）· [`ROADMAP.md`](./ROADMAP.md)（先做哪個）·
> [`CH-046`](../03-implementation/changes/CH-046-progress-metrics-derivation/spec.md)（本檔的設計理由）
