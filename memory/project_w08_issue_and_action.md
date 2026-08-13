# W08 — M1 slice 5: the criterion finally had two answers

**Phase**: W08 · **Period**: 2026-08-12 ~ 2026-08-13（Day 0–4，**跨午夜但無睡眠間隔**）· **Status**: **`closed`** —— MERGED PR #47（rebase，main head `74d8d56`）
**Authority**: `docs/01-planning/W08-m1-issue-and-action/retrospective.md`（完整 retro）
**Change record**: `docs/03-implementation/changes/CH-023-w08-issue-and-action.md`
**Design note**: **無** —— feature continuation 不是 spike；D1 的分流結果**同行追加**到 W07 的 design note
**ADR**: **無** —— 判準已存在（W07 D1），本 phase 只是第一次遇到它的另一側

---

## 交付了什麼

`Issue` + `Action`（CAPA）兩張表、4 個 enum、一個 migration、兩組 create-only 端點、
41 個新 unit 測試、20 個新 int 測試 → **14 / 36 實體**。

加上 Day 0 的 `scripts/lint/check_entity_index.py`（`run_all` 6/6 → **7/7**），
關掉 `AD-EntityCountDerivation-1` 與 `AD-EntityIndexIncomplete-1`。

---

## ⭐⭐ 判準第一次有了第二個答案

W07 的 design note D1 把 trigger 定位成「父表**結構上**給不起複合錨點時才用的東西」，
理由是 `controls` 為了 M7 的 `Risk ↔ Control` 連結表**明文拒絕** `@@unique([id, org_entity_id])`。

**在此之前，每個遇到的父表都給不起。一個永遠導出同一個答案的判準還不算判準。**

`issues` 沒有那個約束 —— 它不參與任何 M:N 連結，`Action` 是它唯一的子表。所以它給得起錨點，
`actions → issues` 走**複合 FK**（D1 選項 B）。三個子表、三次到達、兩種機制：

| phase | 子表 → 父表 | 機制 |
|---|---|---|
| W05 | `assets` → `asset_groups` | 複合 FK |
| W07 | `control_tests` → `controls` | BEFORE trigger（父表拒絕錨點）|
| **W08** | `actions` → `issues` | **複合 FK**（父表給得起）|

不變的是那條不變式：**「別人的 issue」與「不存在的 issue」必須產生同一個錯誤**。
所以 `ScopedActionClient` 三次都不含父表 delegate。

**N1 是結論**：移掉 `actions_issue_id_org_entity_id_fkey`，跨實體引用**插入成功**
（`Received promise resolved instead of rejected`），恰好 **3 個測試轉紅、其餘 8 個不受影響**。

⭐ **順帶量到一個選 B 的好處，而它是 Day 2 只能推論、Day 3 才被證明的**：
測試 6 走「先合法寫入、再 UPDATE 改指向」，而我**從未為 UPDATE 寫過任何 SQL** ——
它卻隨 FK 一起失效。**複合 FK 免費涵蓋 UPDATE**，而 W07 的 trigger 必須明寫
`BEFORE INSERT OR UPDATE` 才擋得住（W07 Day 1 M6）。少一件會被忘記的事。

---

## ⭐ `AD-BorrowedRefusal-1` 第 4 次 —— 這次在寫測試時就被設計掉

前三次都是**元驗證事後**抓到的：W05 借 ref_code counter、W06 借 `RETURNING` 的 SELECT policy、
W07 借 BEFORE trigger。三次的代勞者**全不相同**，所以規則不能列舉它們。

W08 的第四個候選是**複合 FK 自己**。「INSERT policy 自己會擋」那個測試的顯而易見寫法是
`issueId: SG1_ISSUE` 配 `orgEntityId: HK1` —— 而那會靠 key 的 23503 通過，
`actions_insert` **從未被評估**。

實際寫法把 `(issueId, orgEntityId)` 寫成**匹配的一對**（`HK1_ISSUE` + `HK1`），key 滿足、
只剩 RLS 能擋。三個 bypass 齊備：無 `issueRefCode`（counter）· `createMany`（`RETURNING`）·
**父子配對匹配**（複合 FK）。N3 證明只有那一個測試轉紅。

**判準沒變** —— 唯一可靠的仍是「中性化該 policy 後有測試轉紅」。變的是它被用在**設計**測試時。

---

## ⭐ 第一個 body 帶 enum 的端點，和它的新失敗模式

前面每一片的 request body 只有 uuid / timestamp / 自由文字。給錯值會在**外鍵**上失敗，
而外鍵的 SQLSTATE 是 `scope-refusal.ts` 認得的 → 變 404。

**enum 不是。** Prisma 在任何 SQLSTATE 產生**之前**就拒絕未知 variant，錯誤裡沒有這個 app
認得的碼 → 掉進 `throw error` → **500**。`{"severity":"urgent"}` 是一個 typo，
而沒有守衛時它被回報成伺服器故障。

合法值由 `Object.values(IssueSource)` **導出**：`02a:229` 列五個 source，三個因目標表不存在
而未建。抄一份字面清單會在 `audit` 進 schema 那天繼續拒絕它，**而沒有任何測試會失敗**。

---

## ⛔ 本 phase 犯的錯（三次，全部自己發現）

**一、⭐⭐ N6 是一個壞掉的元驗證，而它的壞法長得跟成功一模一樣。**
把 detector fixture 的孤兒 model 改名成 `Policy2` + table `policies`，以為它就不再是孤兒 ——
**那兩個名字也不在索引上**（索引寫的是 `Policy`），所以它仍是孤兒、`run_all` 照樣 7/7、
**EXIT=0**。抓到它的唯一原因是**我預期它會紅而它沒紅**，然後去查了。
若當初把 N6 寫成「預期綠」，這個壞掉的元驗證會被記成通過 → `AD-MetaVerificationBug-1`。

**二、對 poll 失敗給了一個未經驗證的解釋，並寫進了回覆。**
90 秒 readiness poll 說 API 沒起來，6 秒後手動查是 200。我當場提出「Windows 先解析 IPv6」——
實測 `localhost` 與 `127.0.0.1` **兩個都通**。根因記為**未確定**，不編一個聽起來合理的原因。

**三、plan 裡寫了一句沒查過的斷言。** 「`RefCodeCounter` 沒有 `org_entity_id`」——
它**有**，而且 `schema.prisma:174` 的 docstring 正在強調那是刻意的。排除的決定不受影響
（使用者裁決的是「排除」），但那個錯理由本來會被寫進 detector 的 `EXCLUDED` 註解**當判準**。

> 三者同一族：**工具的否定回報不是事實的否定**（EXIT=0 ≠ 通過 · Glob 找不到 ≠ 不存在 ·
> poll 說沒起來 ≠ 沒起來），而**未經量測的解釋比沒有解釋更貴**。

---

## Calibration —— 兩個定義差 3.6 倍，而差額全是等待使用者

| 定義 | 值 | Ratio | Band |
|---|---|---|---|
| 拍板的窗口（`AD-CalibrationMetric-2`）| **3.97 hr** | **0.84** | **IN** |
| 逐段兩端錨點加總 | **~1.1 hr** | **0.23** | **UNDER** |

差額 **169 min（71%）** 是四次等待使用者回覆的間隔，且它**可以獨立機械算出**
（每個 Day 的起始時間戳 − 前一個 commit）。238 − 169 = 69，與逐段量測的 66 對得上 ——
**兩個方法交叉驗證成功，問題不在量測而在定義** → `AD-CalibrationIdleGap-1`。

⚠️ **那個 IN 是巧合** —— 169 分鐘恰好把 0.23 抬進 band，掩蓋了真實的估算問題。

⭐⭐ **本 phase 照 `AD-BottomUpBlueprint-1` 的提議改了估法，而它沒有收斂**：
逐項標【有藍本】並按「寫差異」估，`actual/bottom-up` = **0.116**，比 W07 的 0.17 **還低**，
四段全在 9-12 倍之間**無離群值**。**所以「拆得更細」不是答案** —— 每項都用同一個錯誤的
單位成本。新提議：標三級藍本度 × 該級的**實測**單位成本（目前只有第三級：**≈ 8 min/項**）。

---

## 關掉 / 產生

**關掉**：`AD-EntityCountDerivation-1`（detector 取代人算，且它一跑就推翻分母 —— **36 不是 35**）·
`AD-EntityIndexIncomplete-1`（`RefCodeCounter` 明記排除，`EXCLUDED` 由 N0 守著）·
`BACKLOG` §Known Issues 的「索引不同步 2 次以上就該寫成 detector」（條件成立且已交付）。

**新增**：`AD-IssueBareEnum-1`（**M7 前必須拍板** —— `Failed → raises Issue` 現在只能單向走）·
`AD-MetaVerificationBug-1` · `AD-CalibrationIdleGap-1` · `AD-MigrationTimestampTz-1` ·
`AD-ModuleCoverageDilution-1` · `AD-TestNameWiderThanProof-1`。

**升級**：`AD-BorrowedRefusal-1`（第 4 次，**首次事前設計掉**）·
`AD-BottomUpBlueprint-1`（提議被執行且失敗，附替代方案）。

---

## 兩個順帶的結構性事實

**一、detector 一跑就推翻了它要守的數字。** `12 / 35` 的**兩半都是人算的** ——
分子曾是 8/9/10/12，分母的 foreign-services 節被記成 8 而實際是 9。機械答案：**36**。

**二、名字在三個地方都不一樣。** model `ExtensionField` / table `extension_fields` /
索引 `extension_field_catalog`，**沒有規則可導**。一個逐字比對的 detector 會在同一次執行裡
產生**一個假孤兒 + 一個假缺口**，而兩者看起來都像真的 —— 修法會是去改一份被 **304 處**
`file:line` 錨定的文件。Day-0 的 `D-namemap` 單獨就值回整個 Day 0。

---

**Keywords**: 複合 FK vs trigger 的分流判準 · D1 第一次分流 · FK 免費涵蓋 UPDATE ·
第一個 enum body 端點 · 未知 variant = 500 · Object.values 導出不抄寫 ·
check_entity_index detector · 分母 36 不是 35 · ExtensionField 三名不一致 ·
AD-BorrowedRefusal-1 第 4 次事前設計掉 · AD-MetaVerificationBug-1 · AD-CalibrationIdleGap-1 ·
AD-IssueBareEnum-1 · pattern-reuse-feature 0.84/0.23
