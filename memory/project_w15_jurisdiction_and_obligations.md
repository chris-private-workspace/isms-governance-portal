# W15 — 管轄區骨幹，以及一個「每次都一樣所以沒人問」的東西

**Phase**: W15 — M1 slice 10: the jurisdiction spine and the obligation library
**Period**: 2026-08-16（單日）
**PR**: #67（**MERGED** 2026-08-16 07:45:01Z，`d01d505` —— rebase merge，11 個 SHA 全改寫）
**Retrospective**: `docs/01-planning/W15-m1-jurisdiction-and-obligations/retrospective.md`
**Change record**: `docs/03-implementation/changes/CH-033-w15-jurisdiction-and-obligations.md`

---

## 一句話

`Jurisdiction` / `Regulation` / `Obligation` 三張**全域**參考表 + `residency_policy` enum +
`OrgEntity.jurisdiction_id` ⇒ **25 / 35 實體**。**零端點、零 repository、零 controller** ——
這一片交付的全部價值是一個**約束面**。⚪ 純資料層，**gate-only verified**。

---

## ⭐⭐ 最重要的一件事：Day 0 的 D7 —— GRANT 從來沒被問過

plan 有**五個明確標示的決策點**（D1–D5），而 **GRANT 不在其中任何一個**。
原因很簡單：前九片的表全部是 entity-scoped，GRANT 每次都長一樣，所以從來不是一個問題。

D7 量到先例是 **`SELECT` only**，造成兩個後果：

1. **正面** —— D3（三張表不進 `AUDITED_MODELS`）的論證從「今天沒有寫者」升級為
   「**寫者被資料庫擋著**」。從一個關於現況的觀察，變成一個關於構造的保證。
2. ⭐ **關鍵** —— **AC-5 的 FK 測試不能走應用層**。app 角色沒有 INSERT 權限，
   PostgreSQL 會在**評估任何約束之前**先以 42501 拒絕
   ⇒ 照 plan 原樣用 app 角色寫，兩條 FK 測試會**全綠而什麼都沒測到**。
   這是 `AD-VacuousScopeTest-1` 最難察覺的那一種：**綠燈、有斷言、斷言還通過**。

> **一個每次都一樣所以不必問的東西，在第一次不一樣的時候不會舉手。**

---

## ⭐ 恆真檢查在被寫進 checklist 的當下就被抓到

checklist 1.1 原文是「觀察漂移守衛**仍綠**」—— 而
「守衛正確忽略無寫入路徑的 model」與「守衛從不看新 model」**產生一模一樣的觀察**。

拆成 1.1a / 1.1b：後者暫時加一個 `jurisdiction.repository.ts` stub 逼出 **1 紅**，
訊息含 `"Jurisdiction"` 且落在 **`unaudited`** 側（不是 `unreachable`）。
附帶量到：**stub 無人 import 卻仍被偵測** ⇒ 守衛讀的是**文字**不是 build graph。

---

## ⭐⭐ N1 的直覺預測「2 紅」在寫下之前被 grep 推翻

直覺是：移除 FK 後測試 6 紅，**而且** `rls-direct` 的 `toBe(5)` 會看到多出來的第 6 列 `org_entities`。

事實 B：`rls-direct` 排第 **17**、`jurisdiction` 排第 **18**，**前者先跑完**
⇒ 那一列在它眼裡不存在 ⇒ **1 紅不是 2 紅**。實測逐位命中 `224 passed / 1 failed`。

> **多一個紅看起來像是中性化更成功，沒有人會回頭質疑一個比預期更紅的結果。**

⚠️ 事實 B 自帶誠實標註：它依賴 `--listTests` 順序 = 執行順序，**那是假設不是量測**。

**N2** 則承諾了「紅的**形狀**」而不只是條數 —— 事先逐條指定機制（測試 1 = 錯的值 /
測試 2 = 例外 42704 / 測試 3 = catalog 兩欄各變一個），實測 `222 / 3 failed` **三種形狀逐項命中**。

---

## Calibration —— 第 8 點，而 plan 的預測**方向**錯了

`pattern-reuse-feature` · bottom-up 3.6 hr → committed **1.8 hr** (mult 0.50) →
actual **2.223 hr** · **ratio 1.235 → OVER**

量法：commit author date 逐段相加（`fd77e50` → `4fc44d8`），六個間隙 17.03 / 17.35 / 29.98 /
44.05 / 3.12 / 21.85 min，**最大 44.05、無一超過 60** ⇒ 與窗口法**同值 133.38 min**（第 2 個資料點）。

⛔ plan §7 預告：本片更偏「複製」（零端點零 repository，藍本 `Threat` 可逐欄位抄）
⇒ **「若 ratio 明顯低於 band，那是 class 判斷過寬的訊號」**，並建議分出更窄的 `schema-only` class。
**實測往反方向出 band。**

根因值得記住：**零端點讓實作便宜，卻讓驗證變貴。**
schema + migration + seed 三段合計 **64.4 min**；
而沒有應用層可驅動，唯一能證明它的只有整合測試與兩次中性化 —— 合計 **65.9 min，比實作還多**。
⇒ 假設的 `schema-only` class 若真存在，乘數應該**比 0.50 高**。
plan 把「產品程式碼少」讀成「工作少」，那是把代理指標當成工作量本身。

⛔⛔ **progress.md 全檔零時間記錄**（`min|hr|分鐘|actual` 全部零命中），且 plan §7 **沒宣告量法**
⇒ 分子只能事後從 commit 反推、量法在知道答案之後才選，且**排除了 plan 起草時間**
⇒ **1.235 是下限，不是測量值** → `AD-CalibrationNoTimeRecord-1`。

---

## Carryover

- `AD-W15ConstraintSurfaceUntested-1`（🟡 P1）—— ⭐ **約束面有一半沒有任何測試會因它消失而變紅**：
  第四條 FK 零測試 · `GRANT SELECT` 只證明了三張表中的一張 · 測試 7 只覆蓋三個 write verb 中的 INSERT ·
  AC-2 欄位形狀無可執行檢查 · 測試 4/5/7 從未被中性化證明。
  ⛔ **M6 補 repository 與端點的那一片必須同時補**，屆時有應用層路徑可繞過它們
- `AD-EntityScopeNoDriftGuard-1`（🟡 P1）—— 稽核維度加表忘接會**自動紅並指名**，實體範疇維度**什麼都不會發生**
- `AD-W15InvariantInCommentOnly-1`（🟢 P2）—— 去正規化欄位無複合 FK；參考表無自然鍵唯一約束
- `AD-RegulationVersionCollision-1` —— 法規版次（`2012 Rev.3`）與樂觀鎖 `version` 撞名，**第 2 次**（`Policy` 是第 1 次且無人記錄）
- `AD-CalibrationNoTimeRecord-1` —— 見上
- `AD-DevDbChecksumDrift-1` **第 4 次繞開**（plan §8 事先要求在 retro 明寫：Prong 3 的證據是
  int suite 的重建訊息，**不是 `_prisma_migrations` 查詢** ⇒ `isms_dev` 的 head 本次未被驗證）
- `AD-JestFileOrder-1` 新重現配方 —— 還原後第 1 次跑 `223 / 2 failed`（兩個 suite），
  零改動連跑三次全綠。⛔ **失敗身分在產生的當下就被過濾器丟掉**（`Select-String` 只留計數行）
  ⇒ **「過濾器決定了我事後能問的問題」**。結論句：**每次中性化的「其餘 N 條不動」都比它看起來弱一個等級。**

**Keywords**: 全域參考表無 RLS 靠 GRANT 承擔 · GRANT SELECT only 讓「無寫入路徑可稽核」成為 DB 保證 ·
42501 先於約束評估 ⇒ app 角色寫的 FK 測試恆綠 · Day 0 D7 不在任何決策點裡 ·
checklist 自己就是恆真檢查（1.1a/1.1b）· 漂移守衛讀文字不讀 build graph ·
jest 檔案順序讓「2 紅」變 1 紅 · 中性化承諾形狀而非條數 · ratio 1.235 OVER 而 plan 預測 UNDER ·
零端點讓實作便宜但驗證變貴 · AD-W15ConstraintSurfaceUntested-1 · AD-EntityScopeNoDriftGuard-1
