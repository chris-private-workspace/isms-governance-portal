# W07 — M1 slice 4: the guard a foreign key could not be

**Phase**: W07 · **Period**: 2026-08-12（Day 0–4，**同日**）· **Status**: **`closed`** —— MERGED PR #44（rebase，main head `19bc4f7`）
**Authority**: `docs/01-planning/W07-m1-control-test-and-evidence/retrospective.md`（完整 retro）
**Change record**: `docs/03-implementation/changes/CH-022-w07-control-test-and-evidence.md`
**Design note**: `docs/02-architecture/design-notes/W07-cross-entity-references.md`
**ADR**: **無** —— 量測**排除**其他選項後剩下唯一可行解，不是「選 A 不選 B」的取捨

---

## 交付了什麼

`ControlTest` + `Evidence` + `/control-tests` · `/evidence`（**10 / 35 實體**），
外加關掉一個**活著的**隔離缺陷（`extension_fields` 的 group 列奪取）。

但這一片的內容不是「第 12、13 張表」，是**第一次遇到複合 FK 結構上用不上的子表**：

- `controls` **明文拒絕** `@@unique([id, org_entity_id])`（`schema.prisma:808-812`）——
  M7 的 `Risk ↔ Control` 連結表要讓 group control 連到**任何**實體的 risk，兩側 entity 本就不同
- `evidence.linked_id` 是多型的，**連 FK 都沒有**

---

## ⭐ 三個量出來的東西（不是推論的）

**一、RI（外鍵）檢查繞過 RLS。**
HK1 對一個它**完全看不到**（可見列數 0）的 SG1 私有 control 建測試記錄 → **INSERT 成功**。
而指向**不存在**的 id → `23503`。**兩者合起來就是存在性 oracle** ——
呼叫者能分辨「存在但不是你的」與「不存在」，正是 約束 8 要求回 404 而非 403 的那個洩漏，
**發生在資料庫層，任何 controller 都改不掉**。無 FK 時更糟：純垃圾 id 也照樣落地。

**二、⭐⭐ 關掉 oracle 的是「執行順序」，不是「有 trigger」。**
`BEFORE` trigger 跑在約束檢查**之前**，所以不存在的 id **也走** `NOT EXISTS` 分支，
與不可讀的拿到**同一個** `23503`，FK 沒機會開火。
**順序相反的話 oracle 會原封不動地活下來，而外觀上像修好了。**
→ 這一項不量就會漏，而它是整份 design note 的核心。

**三、SQLSTATE 是歸因問題不是風格問題。**
首版 raise `42501`（RLS 對「列自身越界」用的碼）→ repository 會回「org entity not found」，
**但錯的是 `control_id`**。改成 `23503` → `UnknownReferenceError`（只帶欄位名不帶 id），
且**改完重新量一次** M5 確認 oracle 仍關閉。
代價：Prisma 認得 `23503` 並**改寫訊息**、丟掉 trigger 的文字；`42501` 它沒對應所以原樣透出。

---

## 🚩 元驗證 8/8 全紅，而其中兩格修法前是 0

`AD-BorrowedRefusal-1` **第 3 次，強度階梯門檻正式成立**。
兩個「釘 INSERT policy」的測試第一版**都是綠的** —— 綠的原因是 **trigger 先擋**，
那張表自己的 `WITH CHECK` **從未被評估**。

⛔ **三次的代勞者各不相同**：W05 = ref-code counter · W06 = `RETURNING` 的 SELECT policy ·
W07 = BEFORE trigger。**所以規則不能列舉代勞者** ——
唯一可靠的判準是**中性化該 policy 之後有測試轉紅**。

中性化改的是 **migration** 不是活資料庫（int suite 每次都重建 `isms_test`，
改資料庫會在任何測試跑之前被洗掉，然後整輪回綠而什麼都沒證明）。

---

## ⛔ 本 phase 犯的錯（四次都是同一族，全部自己發現）

`feedback_evidence_must_support_claim` **四次**：

1. `grep "FORCE ROW LEVEL"` 單空格 → 3/7 誤讀為缺失（實為 **7/7**，兩空格對齊），
   **且已當成事實對使用者講過一次**
2. 元驗證 N7 的錨點在該 migration 出現**三次**，`replace` 換掉第一個 ——
   **中性化到 `asset_groups` 卻報告 `risks`「STAYED GREEN」**
3. ⭐ `tail -N` 讀**多 workspace** 的 npm 輸出 → api 紅、web 綠，只看到後者
   → **Day 2 的 `format:check` / `type-check` 兩個 gate 宣稱是假的**
   （4 個真問題：2 Prettier + 2 **TS2353**，⚠️ **jest 不做型別檢查**所以 235 個綠測試抓不到）
4. ⭐⭐ **最危險的一次**：Day 3 工時表把**向前推估**寫成量測 —— 宣稱 82 min、
   宣稱結束於 16:05，而 Day 4 起手 `date` 是 **15:41**（一個還沒發生的時刻）。
   commit 時間戳給出真值 **31 min**。前三次錯的是**觀察**，這次錯的是**產出給下游的資料**。

⭐ **第 5 個是驗證器自己**：我寫的錨點驗證腳本第一版用 basename 解析，
把兩個 migration 錨點比對到了**另一個 migration**，印出看起來正常的內容並報 `0 unresolved`。
**一個會產生自信錯誤輸出的驗證器，比沒有驗證器更糟。**

---

## Calibration —— 第一次乾淨，而它指向估算不是乘數

`spike` 第 5 個資料點（同單位第 2 個有效點）。同日無跨夜，
`AD-CalibrationMetric-2` 的定義**首次沒有被污染**。

bottom-up **19.75 hr** → committed **12.8 hr** (0.65) → actual **3.87 hr** → ratio **0.30 UNDER**。

⛔ 但 `actual / bottom-up` = **0.20**，遠低於 CALIBRATION-MATRIX 明訂的 **0.4 下限**，
而該表自己寫著「低於 0.4 代表 bottom-up 估算方式有系統性問題，**該修的是估算不是乘數**」。
歸因：bottom-up 假設**從零建**，實際**藍本複用率極高**（repository / controller / module /
int spec 的形狀由 W03-W06 定死，寫的是差異不是全部；量測床 W06 已備好，
「量測 2.0 hr」實際 **10 min**）。**乘數 KEEP 0.65** —— W04 (0.81 IN) 與 W07 (0.27 UNDER)
兩點**方向相反**，不構成 3-phase 證據。

---

## 關掉 / 產生

**關掉**：`AD-GroupRowTheft-1`（**先看到紅**才修：`count` 期望 0 實得 1）·
`AD-ReturningMasksCheck-1`（`risks` 11b 改 `createMany`，N7 中性化下確認轉紅）·
`AD-CalibrationNoActual-1`（⚠️ 部分 —— 它暴露了自己的盲點：**記錄 ≠ 量測**）

**新增**：`AD-EstimateAsMeasurement-1`（區段兩端都要有可觀察錨點）·
`AD-BottomUpBlueprint-1`（bottom-up 逐項標「有藍本 / 無藍本」）·
`AD-MdAnchorLineShift-1`（**被錨定的文件，編輯不得改變行數**）

**升級**：`AD-BorrowedRefusal-1`（第 3 次）· `AD-GrepAssertion-1`（多 workspace 新形狀）

---

## 一個順帶的結構性收穫

`02a` 的偏離註記原本寫成多行，插入 8 行就讓 **~30 個 `02a:NNN` 錨點**
（`schema.prisma` 12 處 · 6 個原始碼檔 · ADR-0013/0014 · W06 design note · BACKLOG）全部偏 +13。
**改寫成同一行追加**後：`git diff --numstat` **4/4** · 總行數 **495 = 495** ·
第 413 行 HEAD 與工作區**逐字相同**（三項都驗過）。

> **這比 detector 便宜得多** —— detector 只能在偏移**之後**告警，
> 「不改變行數」讓偏移**不發生**。但它管不了刻意的結構性改寫，所以 detector 仍在 ROADMAP 第 9 列。

**Keywords**: RI check bypasses RLS · existence oracle · BEFORE trigger ordering ·
SECURITY INVOKER · assert_parent_in_scope · 23503 vs 42501 · polymorphic linked_id ·
borrowed refusal 3rd · tail -N hides multi-workspace failure · estimate-as-measurement ·
markdown anchor line shift · control_tests · evidence
