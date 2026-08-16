# W17 — 一支現成的守衛，和一個零轉紅的好消息裡的壞消息

**Phase**: W17 — M1 slice 12: records retention and legal hold
**Period**: 2026-08-16（單日，UTC 13:24 起）
**PR**: MERGED (PR #73, `cf7cf07`)
**Retrospective**: `docs/01-planning/W17-m1-retention-and-legal-hold/retrospective.md`
**Change record**: `docs/03-implementation/changes/CH-035-w17-retention-and-legal-hold.md`

---

## 一句話

`retention_policies`（**全域**，第三張擴充豁免清單的表）+ `legal_holds`（entity-scoped，
RLS `ENABLE`+`FORCE`，2 policy，無 UPDATE）⇒ **30 / 36 → 32 / 36**。
**零端點零 repository**，消費者在 M6b。13 條整合測試、6 次中性化。⚪ **gate-only verified**。

---

## ⭐⭐ 最重要的產出是一個「不做」

`02a:318` 讓 `legal_holds` 的 scope 多型於 record / class / entity，
而 W14 已經交付了 `assert_polymorphic_parent_in_scope()` —— 盤點的 agent 說「不必重新發明」，
plan 也照這個假設寫。**讀了那支函式才發現它結構上不可用**：

- `polymorphic_parent_guard/migration.sql:47` 把 id 欄 **`::uuid` cast**，而 mapping walk 在 `:52-59`
  ⇒ **cast 早於分支**。`class` 的目標是紀錄類別（`'Security incident records'`），不是 uuid。
- `record` 泛指**任何**業務表（今天 31 張），而該函式要求每個 type value 對應**一張具名的表**。
- 只有 `entity` 對應得上。

> **只涵蓋 `entity` 分支的 trigger 會是綠燈、有斷言、對兩個真正需要檢查的分支全盲。**

⇒ 明說不建、寫進 banner 與 docstring、登記 `AD-LegalHoldScopeRefUnguarded-1`。
欄位名也從 `scope_id` 改為 `scope_ref`（W11 拒絕 `framework_id` 的同一把尺）。

---

## ⭐⭐ N4 零轉紅 —— 預測中了，而那是壞消息

刪掉 `legal_holds_insert` policy ⇒ **247 條全綠**。

缺席的 policy 對 INSERT 是**拒絕**（ADR-0014），與正確 policy 拒絕測試 8 的跨實體列
**觀察不出差別**。而 12 條測試裡**沒有一條做「範疇內 INSERT 應該成功」**。

⇒ 測試 8 釘住的是「policy **不比它該有的更寬**」，**沒有任何東西釘住它存在** ——
那張表可以安靜地對 app 角色變成唯讀。補測試 13（`BEGIN`/`ROLLBACK`，
避免 committed 的列讓測試 7 依賴檔案順序），**N4a 驗證恰好 1 紅**。

> **零轉紅不一定是實驗做錯了，也可能是實驗做對了而覆蓋有洞。**

---

## ⭐ `.rejects` 沒有 SQLSTATE 近乎恆真

int spec 首跑 3 紅，全是 `42P08`（ambiguous parameter）：測試 8 / 10 / 11 把 `$1`
同時當 `org_entity_id`（uuid）與 `scope_ref`（text）⇒ **在 parse 階段就死了**，
三個 INSERT **從未走到** RLS 的 `WITH CHECK`、CHECK 約束、FK。

抓到它的是本 repo「斷言 SQLSTATE、從不斷言訊息字串」的慣例（`AD-GrepAssertion-1`）。
**寫成裸的 `.rejects`，三條會全部通過而三條都什麼也沒測到。**
⇒ 一條為了「別依賴訊息字串」而立的規則，實際擋下的是**另一種**失效：測試打錯地方。

---

## ⭐ 三次同一族：裸文字回答需要結構的問題

| ID | 形態 | 代價方向 |
|---|---|---|
| **D4** | `grep 'FORCE ROW LEVEL SECURITY'` 回 3 個命中（W16 用**兩個空格**對齊），照那個數字推出「**16 張表 owner 繞過全部 policy**」 | ⚠️ 差點造出**假 P0**（前幾次都是讓我漏看問題）|
| **D7** | `AD-UniqueKeyOracle-1` 記的 10/22/34 在其 base commit 上**三個都不可重現**（實測 14/21）| 結論站得住（**讀**出來的），計數不是證據 |
| **D17** | 我自己的守衛 `assert "FOR UPDATE" not in text` 命中 migration 註解裡「**NO** `FOR UPDATE` policy」那句 | ✅ fail-closed ⇒ 誤報而非假結果 |

> **寫得越好的程式碼，越會在註解裡提到它刻意不做的事** ——
> 所以「grep 不到就是沒有」在有註解的檔案上系統性不可靠。
> 而 **量法寫下來還不夠，要寫到能重現**。

---

## ⭐⭐ D10 —— 換掉一個量錯東西的儀器

W15 / W16 稱為「Prong 3 欄位級 diff」的工具：`--from-migrations`（真檢查）
**在本 repo 跑不起來**（`prisma.config.ts` 未設 `shadowDatabaseUrl`），
而 `--from-config-datasource` 打的是**落後 6 支**的 `isms_dev`
⇒ 輸出主要在量**落後**不是量**漂移**。

新量法：覆寫 **`DATABASE_URL_MIGRATE`**（⚠️ 不是 `DATABASE_URL` —— `prisma.config.ts:53`
優先用前者，我第一次就覆寫錯了）指向 `isms_test`（由 `migrate deploy` **從 migration 檔**建成
⇒ 非循環）。分離出**恰好 2 條**既有漂移，本片**零新增**。

**D13**：`npx prisma migrate deploy` 把 `isms_dev` 從 **17 / 23** 一次補到 **24 / 24** ——
`AD-DevDbChecksumDrift-1` 六個 phase 的繞開，**沒有人試過這個子指令**。
⇒ 該 AD 的射程比它的標題窄；**繞開的敘述會固化**。

---

## D15 —— 規格只給三欄，而我 Day 0 讀過那句話

`02a:314` 列 6 欄並給 `trigger` / `disposition` 的值域，而 `05:73-80` **只有三欄**。
⭐ `02a:314` 自己寫著「the six confirmed **classes and periods**」—— class 與 period，
正好就是那三欄。Day 1 建成 NOT NULL 會**逼 seed 發明四個值**（六列裡只有兩列的 trigger
能從期限文字推出，而推出來仍是我在授權）⇒ 改 nullable。

⛔ **Day 0 的 `D-fields-r` 勾了 ✅「6 個欄位名逐字相符」而那是真的** ——
沒有比對的是「**每個欄位有沒有值的來源**」。⇒ `AD-SpecFieldValueSourceUnverified-1`。

---

## 中性化：6 次，3 中 2 低估，而兩次低估是同一個盲點

N1（拿掉 `FORCE`）**恰好 1 紅、246 條未動** ⇒ **W16 DR3 的直接證明**：
所有範疇測試連 app 角色，`FORCE` 只治理 owner，沒有那條斷言就完全不可觀察。

N3 / N5 各預測 1 紅、實測 2 紅，多出來的**都是測試 12** —— 一條用 `toEqual` 斷言
**整個 grant 集合**的 catalog 測試。⇒ 教訓不是「條數估高一點」，是**認出哪些測試是維度級的**。
⚠️ 判準仍成立：**每一條多出來的紅都能由該改動解釋** ⇒ 覆蓋，不是 W16 N1 那種汙染。

---

## Calibration —— 0.78 IN，第一個分子被量到的點

`pattern-reuse-feature` · bottom-up **6.4 hr** → committed **3.2 hr** (mult 0.50) →
actual **~2.5 hr** · ratio **0.78**（第 10 點）· **KEEP**

⭐ T0 蓋在動 checklist 之前 ⇒ Day 0–3 是**逐段量測**（5 段，最大間隙 40.9 min，無需排除），
不是 commit 反推。⛔ **仍打折**：plan 起草段在 T0 之前**完全沒被量到**
⇒ **2.5 hr 是下限、0.78 是偏低的估計**。下一片的改進更明確：**蓋在讀第一個檔案之前**。

---

## Carryover

- `AD-LegalHoldScopeRefUnguarded-1` 🟡 · `AD-SpecFieldValueSourceUnverified-1` 🟡 ·
  `AD-RetentionDurationUnstructured-1` 🟢 · `AD-CatalogAssertionPredictionBlindSpot-1` 🟢 ·
  `AD-GuardMatchesItsOwnDisclaimer-1` 🟢
- `AD-DevDbChecksumDrift-1` —— 降級為記錄（射程比標題窄）
- **AP-3 如實記 1 次**：兩張表今天零消費者（M6b 解封）
- ⛔ **M1 DoD 仍未達成** —— 其餘 **4** 張表；
  🔴 `AccessRequest.org_entity_id` nullable **無裁決文件**，且本 repo 有**帶前科**的錯誤預設答案
  （`extension_fields` 的 `org_entity_id IS NULL` 曾產生 `AD-GroupRowTheft-1`）⇒ 建它前 STOP and ask

**Keywords**: 現成的守衛結構上不可用（`::uuid` cast 早於 mapping walk）·
只涵蓋一個分支的守衛比沒有更糟 · N4 零轉紅是覆蓋有洞不是實驗失敗 ·
缺席 policy 與正確 policy 對 INSERT 觀察不出差別 · `.rejects` 無 SQLSTATE 近乎恆真 ·
窄 pattern 差點造出假 P0 · 量法要寫到能重現 · Prong 3 舊工具量的是落後不是漂移 ·
`migrate deploy` 關掉六個 phase 的繞開 · Day-0 證明欄位名對但證明不了欄位填得出來 ·
守衛命中了說明它不存在的註解
