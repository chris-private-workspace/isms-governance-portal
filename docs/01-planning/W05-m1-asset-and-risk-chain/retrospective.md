# Phase W05 — Retrospective

**Phase**: W05 — M1 slice 2: the asset-based risk chain
**Period**: 2026-08-11 ~ 2026-08-11（Day 0–4，單日）
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**PR**: ⏳ **PENDING** —— 五個 commit 在 `feature/W05-m1-asset-risk-chain`，**未 push、CI 未驗**
**Change record**: `docs/03-implementation/changes/CH-020-w05-asset-and-risk-chain.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 五張表 + migration（3 entity-scoped + 2 全域庫）+ 6 enum | ✅ 完成 |
| US-2 | D1–D4 拍板 + **量測逼出的 D5–D8** → **ADR-0013 已採納**，4 條可證偽條件 | ✅ 完成 |
| US-3 | 評分嚴格等於 `LKH × MAX(五 impact)`，且**公式錯誤會被測試抓到** | ✅ 完成（形式依 D5 改變，實質未縮減 —— 見下）|
| US-4 | 約束 8 四項對 `Risk` 成立 | 🚧 **部分** —— `AssetGroup` / `Asset` 兩張表未逐條測 |
| US-5 | 元驗證 **4 組** + 常駐負面案例；⭐ 找到一個真缺口並關上 | ✅ 完成 |
| US-6 | CH-020 + 七個不變式逐條裁決 + closeout | ✅ 完成 |

**未完成項目**：

- **`AssetGroup` / `Asset` 各自的四項範疇測試**（checklist 2.4）—— 🚧 **未做，理由不是時間**。
  四項裡的「跨實體寫拒」需要一個**會寫它們的呼叫者**，而本 phase 的端點只有 `/risks`；
  今天唯一的寫入路徑是 seed（走 owner 連線，RLS 不適用）。
  **硬造一個測試專用寫入路徑正是主流量驗證原則（約束 2）禁止的東西。**
  **解封條件：slice 3 建 `POST /assets` / `POST /asset-groups` 時，同一個 PR 補齊。**
  今天已成立的部分：RLS + FORCE 已在 `pg_class` 逐列驗證；複合 FK 使跨實體連結不可表達（int 12/13）。
  checklist 標 🚧 **未刪**。
- **`risk-score.ts` 的公式錯誤測試**（checklist 1.3）—— 🚧 標記於 Day 1、**由 Day 2 承擔並已完成**。
  D1-A 之下公式住在 generated column，在 TS 副本上測公式等於認證一個沒有呼叫者的函式。
  整合測試打在公式**真正住的地方**（`pg_get_expr` 逐欄斷言 + 邊界值），比原計畫更強。**該列仍未刪。**

**⚠️ 兩個 plan §4 的交付漏做，是 Day 4 的 `git diff` 抓到的，不是我記得的**：

| 漏的 | 狀態 |
|---|---|
| `docs/rules-on-demand/multi-tenant-data.md:63` 表名更正 | Day 1 D4 明寫「**同時**更正」，Day 2 沒做。**Day 4 補上** |
| `docs/02-architecture/02a-data-model-spec.md` 的 D1/D2 裁決註記 | plan §4 #14 列了，Day 2 沒做。**Day 4 補上**（§2 加一段指向 ADR-0013）|

> ⭐ **這兩項的共同形狀**：它們都被寫在**決定的句子裡**（「D4 = X，同時更正 Y」），
> 而不是 checklist 的一個 `- [ ]` 項。**決定句裡的附帶動作沒有勾選框，所以沒有東西會發現它沒做。**
> → `AD-DecisionSideEffect-1`

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 1 個資料點**）
- **Agent-delegated**: `no`（plan §7 預先宣告；`agent_factor` 1.0 → 三段式）
- **Bottom-up est**: 14 hr
- **Committed (calibrated)**: 7.0 hr（mult 0.50）
- **Actual**: ⚠️ **兩個數字，因為預先宣告的定義在本 phase 破了** —— 見下
- **Band 判定**: **UNDER**（用修正定義，0.69 —— 差 0.006 就落在 band 內）/ **OVER ×2**（用字面定義）

### ⛔ 預先宣告的定義在這裡失效，而失效方式是可預測的

plan §7 宣告 `actual` = **branch base → closeout commit 的牆鐘跨度**（W04 同定義）。字面套用：

| 量 | 值 |
|---|---|
| base `a2b1906` | 2026-08-10 **23:11:12** |
| closeout commit `f9195da` | 2026-08-11 **14:23:25** |
| **字面 actual** | **15.20 hr** → ratio **2.17**（OVER band 兩倍以上）|
| 其中**跨夜間隙**（base → 本 phase 第一個 commit `785be55` 09:31:41）| **10h20m** |
| **扣除間隙後** | **4.86 hr** → ratio **0.69**（**UNDER band**，差 0.006）|

> ⚠️ **這張表的數字是 closeout commit 落地後從 `git log` 回讀的，不是估的。**
> 我先寫了 `~14:30 / 5.0 hr / 0.71`，而真實時間戳是 `14:23:25` → **0.69，band 從 IN 翻成 UNDER**。
> 差別小到看起來可以四捨五入掉，**但它跨過了一條判定線** —— 所以照 W04 `5bb0c9f` 的先例
> 單獨開一個 commit 修正，而不是留著一個「大約對」的數字。

> **`a2b1906` 是 W04 的 closeout commit，不是 W05 的起工時刻。**
> 這個定義量的其實是「距離**上一個 phase 收尾**多久」——
> phase 背靠背在同一個晚上時（W04 就是），它是個好代理指標；跨過一夜就不是了。
> **它不是量錯，是它從一開始就內含一個沒被寫出來的前提。**

⚠️ **修正值 4.86 hr 是下界**：plan 與 checklist 的起草發生在第一個 commit **之前**，
時點**不可機械導出**。我不會替它補一個估計 —— 那正是 `AD-CalibrationMetric-1` 當初在批評的事。

⚠️ **同一個定義套回 W04 會改變一個已登記的資料點**（`6b2e364` 18:33:10 → `5bb0c9f` 22:26:27
= 3.89 hr，ratio **0.66** 而非登記的 0.81）。**我沒有改它** ——
回頭重算一個已登記的點是決定不是整理，屬於 `AD-CalibrationMetric-2` 要回答的事。

**行動**: **KEEP 0.50，且本點標記為「定義受污染」**。
⚠️ UNDER band **不觸發調降** —— matrix 的鐵律是「單次離群值忽略，需要 3-phase 移動證據」，
而這裡連「一個可用的點」都還不是。 ——
`pattern-reuse-feature` 現在有 1 個資料點，但在定義修好之前它**不能與未來的點併入同一個窗口**。
這正是 W04 那則的教訓（三個 `spike` 點只有 1 個同單位）**在另一個 class 上重演**。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] `|R - 1.0|` 兩種讀法分別為 **117%** 與 **31%** —— **兩者皆 > 30% → 依模板必須記 AD**
      （`AD-CalibrationMetric-2`，已入 BACKLOG）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**8**（Prong 1: **0** / Prong 2: **2 實質 + 1 引用錯誤** / Prong 2.5: N/A /
  Prong 3: **0 + 1 orphan claim**；另 `D-devdb` / `D-adrnum` / `D-baselines` 三項確認無漂移）
- Day-0 成本：~35 min
- **預防的返工**：~3 hr
- **ROI**: ~**5×**

**最有價值的那個 drift**：⭐⭐ **`D-ratingband`** —— 它抓到的不是 repo 的漂移，
**是我自己在 plan 裡寫錯的一個概念**。我把 `rating_inherent` / `rating_residual` 當成
`score_before` / `score_after` 的舊名，實際上它們是**兩個不同的東西**：
分數是 1–25 整數，**分帶**才是儀表板聚合的東西（`02a:414` · `03:90` · `08:25`）。

> 若沒抓到，W05 會交付一組**旗艦儀表板讀不到的欄位**，而每一項 gate 都會是綠的。

⭐ **Prong 2 連續第三個 phase 是唯一有實質產出的 prong**（W03 / W04 / W05）。
而它三次的產出**性質不同**：W03 是規則有你不知道的要求、W04 是規則對這個動作另有舉證義務、
W05 是**plan 自己寫錯了**。第三種只有「逐條 grep plan 的每個事實斷言」會抓到。

### ⚠️ 本次 Day-0 我自己犯了兩個「證據不支持結論」的錯

兩次都是**零命中，兩次都是搜錯地方**：(a) `grep -c "🔴 P0"` 的 pattern、
(b) `D-entityindex` 要求實體獨佔表格首格，而 `02a` §0 把成對實體寫在**同一格**。
**零命中的正確反應是先問「它如果存在會長什麼樣」**，不是下結論。

---

## Q4 — 做得好的（保持）

- ⭐⭐ **量測逼出了兩個 plan 沒列過的選項，其中一個看起來更好而必須被否決。**
  `IMMUTABLE` 函式版把公式從 8 處塌縮成 1 處 —— 純粹的可讀性勝利。
  否決它的理由是**量出來的不是想出來的**：`CREATE OR REPLACE FUNCTION` 在有相依 generated column
  時**成功、不重算、不警告**，同一組輸入舊列讀 20 新列讀 16。
  **公式出現在 8 處是可讀性代價；一欄兩世代是合規事故。**
- ⭐⭐ **元驗證找到一個真缺口，並在同一天關上且證明關上了。**
  RLS 全中性化後「跨實體寫拒」測試仍綠 —— 因為拒絕它的是 W04 的 counter，不是 `risks`。
  處置不是記錄而是**新增 int 11b 繞開發號直接寫，在仍中性化的狀態下重跑看它轉紅**。
  **「補了測試」與「補的測試真的守著那個缺口」是兩回事，後者要在弄壞的狀態下重跑才知道。**
- ⭐ **先量 FK 再設計 schema。** Day 2 開工前先問「FK 檢查會不會繞過 RLS」——
  答案是**會**，於是三張表之間的 FK 全部改成複合。
  **這是先量再設計，不是先設計再驗證**；反過來做的話它會活到某個人猜中一個 UUID 為止。
- ⭐ **三次「證據不支持結論」的自我攔截，而擋住它們的都是機制不是仔細**：
  (a) FK 探測的非法 hex → 是**那一格刻意寫了 expect 值的 sanity 檢查**拆穿的；
  (b) 走查腳本的陳舊回應 → 修法是 **每案帶 nonce**，不是「小心一點」；
  (c) template1 ACL 誤判 → **讀 AD 全文**才發現 `=U` 就是那條繼承。
- **不碰不是我開的進程。** port 3200 那組啟動於 2026-08-08 → 全程未碰（與 W04 同一判斷）。
- **不 reset `isms_dev`。** 破壞性 DB 操作需使用者當下的明確文字 ——
  改在 throwaway 庫上**精確重現** reset 路徑，得到同一份證據而零風險。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | `risk-score.ts` / `risk.repository.ts` 皆可從 `POST /risks` 追蹤到。⚠️ 見下方「最接近的一次」|
| AP-2 Cross-directory scattering | 0 | 全部落在 `core-model/` + `modules/risk/`；`entity-scope/**` UNTOUCHED |
| AP-3 Potemkin | 0 | ⚠️ 見下方兩個「最接近的一次」|
| AP-4 PoC accumulation | N/A | 無 PoC。18+ 個探測全在 throwaway DB 上跑完即 `DROP DATABASE` |
| AP-5 Speculative abstraction | 0 | ⭐ **主動避免兩個** —— 不建 `risk_scales`（D2）、不建 `rating_*`。⭐ 且 `ScopedExtensionCatalogClient` **等到第二個消費者出現才抽** |
| AP-6 Mock vs real divergence | **1**（繼承，未新增）| `isms_test`（`CREATE DATABASE`）vs `isms_dev`（`DROP SCHEMA`）兩條建庫路徑仍不對等 —— `AD-DbBuildPathParity-1` 本 phase **驗了它但沒修根因** |
| AP-7 命名 / orphan claim | 0 引入 · **3 發現全修** | 見下 |
| **總計** | **1** | |

**AP-1 / AP-3 最接近的三次**：

1. **`TREATMENT_THRESHOLD` 在請求路徑上零消費者** —— 只有測試讀它。
   判定**不是** AP-1，因為 `risk-score.ts:85-88` **明文寫著**「Nothing in the request path reads it」
   並說明它存在的理由（讓整合測試斷言 15/16 邊界時用具名常數而非 magic number）。
2. **`Risk.status` 的轉換沒有被任何東西擋住**，`Risk.treatment` 是欄位不是關聯 ——
   與 W04 的 `Policy.status` 同一形狀，同樣在 enum docstring（`schema.prisma:391`）明文宣告。
3. **`created_by` / `updated_by` 永遠是 NULL** —— 沿用 W04 的裁決（填佔位使用者會讓 M3 的稽核問題用謊話被回答）。

> ⚠️ **這三個判定全部依賴那幾段註解繼續存在。** 刪掉它們，三者立刻變成 Potemkin。
> 這是 W04 已經記過一次的依賴，本 phase 讓它從 2 個變成 5 個 —— **它正在累積**。

**AP-7 發現並修掉的 3 個**（全部是**本 phase 自己造成的**，不是順路發現）：
(a) `schema.prisma` 的 W04 docstring「Risk carries FKs to tables **this phase does not build**」——
建完就是假話，Day 2 同一個 commit 內改掉；
(b) startup 警告寫「**/policies** is scoped by a hard-coded assignment」——
`/risks` 也是，我的改動讓那句話變成**比事實窄的宣稱**，Day 3 改為 "EVERY entity-scoped endpoint"
並寫明**不列端點名單**的理由（會過期的清單比模糊說法更糟）；
(c) **W04 design note 的 `file:line` 錨點被我的改動移位** —— Day 4 重新校準（見 Q6 `AD-DesignNoteAnchor-1`）。

**Lint**: `run_all.py` **6/6** ✅

---

## ⭐ US-6 — W04 七個不變式的可複製性裁決

> **這是本 phase 對 slice 3 最有價值的產出。** W04 的 design note 宣稱七個不變式可被複製，
> 而那個宣稱**從未被任何東西測試過**。本 phase 是它的第一個負載。
> **判準**：`可複製` = 原樣抄過來且成立；`需調整` = **不能原樣抄**；`不適用` = 本 phase 沒有它的場景。

| # | W04 不變式 | 裁決 | 一句理由 |
|---|-----------|------|---------|
| **2.1** | 全域 vs entity-scoped 的判準：「**這張表上的一次寫入，跨實體時是不是一件該被拒絕的事**」| ✅ **可複製**（+1 條必須新增）| 一次裁決五張表，而且 W05 是第一個**引用既有清單**而非擴充規則的 phase。⚠️ **但它只覆蓋「這張表上的寫入」** —— U1 量到 **FK 檢查繞過 RLS**，跨實體連結可以由**隔壁那張表**的一次寫入攜帶 → 必須加一條：entity-scoped 表之間的 FK **一律複合** |
| **2.2** | 序號由資料庫在**一個語句**內配發 | ✅ **可複製，零修改**（+1 條必須新增）| `issueRefCode` 原樣重用，prefix 自宣告，`RISK-SG1-000001` 一次就對。⚠️ **但複製它會靜默地讓新表的 RLS 零覆蓋** —— 拒絕發生在 counter，`risks` 自己的 `WITH CHECK` 從未被任何測試打到 → 必須加：每張新表要有一個**繞開發號**的直接寫入測試 |
| **2.3** | 發號在插入之前，驗證在發號之前 | ✅ **可複製** | `risk.repository.ts:126-144` 同一順序。⭐ 而且它**多承載了一件 W04 沒有的事**：分數驗證排在最前，因為它最便宜且最可能錯 —— 排序理由本身可延伸 |
| **2.4** | 拒絕點會移動，而 oracle 防護必須在新位置重新成立 | ✅ **可複製 —— 且這條最該從「事實」升級為「程序」** | 拒絕點**第三次**移動：W03 policy insert（42501）→ W04 counter upsert（42501）→ W05 **複合 FK（23503）**。checklist 3.2 **預先登記了「記下它這次落在哪」**，那是對的做法。**它不是一個結論，是一個每個 phase 都要重問的問題** |
| **2.5** | `ref_code` 永不由呼叫者提供（⚠️ 靠**型別**而非測試守住）| ✅ **可複製，且 W05 給了一個更強的版本** | `CreateRiskInput` 同樣沒有 `refCode`。⭐ `score_*` 是**同一形狀的強化版**：型別沒有那個欄位**且**資料庫硬錯誤（`cannot insert a non-DEFAULT value`）。W04 標記的弱點（刪掉型別欄位不會有測試轉紅）**在分數上不存在** |
| **2.6** | 回填與 counter 是同一個變更，不是兩個 | ⚪ **不適用** | 五張全新的表，沒有既有列可回填；counter 從 0 起算就是正確起點。⚠️ **它仍然是活的** —— 任何日後對既有表加 `NOT NULL` 欄位的 migration 會重新需要它 |
| **2.7** | schema 層的權限，以及它為什麼能藏這麼久 | ✅ **可複製，且本 phase 第一次真的在 reset 路徑上驗過** | GRANT 寫進 migration；Day 3 在 throwaway 庫上**精確重現** `DROP SCHEMA public CASCADE` → `migrate deploy`，五張表權限逐張確認。⭐ 順帶量到那條 AD **提議的守衛放在它提議的位置會無效** |

**計數**：可複製 **6** · 不適用 **1** · **需調整 0**。

> ⚠️ **這個計數要能被檢查，所以我把判準寫死了。** 2.1 與 2.2 各帶一條**必須新增的條款**，
> 而我判它們為「可複製」不是「需調整」—— 因為本 phase **原樣抄了它們而且它們成立**；
> 缺的是清單上**還沒有的東西**，不是清單上寫錯的東西。
> 就算用最寬鬆的讀法把這兩條算成「需調整」，也是 **2 < 3** ——
> **checklist 4.1 的改判門檻（≥3 條）在兩種讀法下都沒有跨過。**
> → **維持 feature continuation 判定，不改判 spike，不補 design note。**

**§3 Cross-Scope Contracts 也被用掉了**：`ScopedRefCodeClient` 當初被**拆出來**的理由是
「發號器會被每一個業務 repository 使用」—— W05 的 `ScopedRiskClient` 直接 `extends` 它，
沒有複製一份 policy 專用的形狀。**那個預測兌現了。**

**給 slice 3 的兩條新條款**（要寫進下一份 design note 或直接進 `multi-tenant-data.md`）：

1. **entity-scoped 表之間的 FK 一律複合 `(fk, org_entity_id)`** —— 單欄 FK 可以指向你看不見的列
2. **每張新的 entity-scoped 表必須有一個繞開發號的直接寫入測試** ——
   否則它的 `WITH CHECK` 零覆蓋，而每一項 gate 都會是綠的

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-BorrowedRefusal-1` | ⭐⭐ **同一形狀第 2 次**：新表的跨實體寫入被**別人的** RLS 拒絕（W04 是 counter 借了 W03 的 oracle 防護；W05 是 `risks` 借了 counter 的拒絕），於是新表自己的 `WITH CHECK` 零覆蓋而全部 gate 綠 | 每張新 entity-scoped 表的整合套件**必須**含一個繞開共用前置路徑（發號 / validator）的直接寫入案例。**依強度階梯，第 3 次應改結構性解法**（detector：有 RLS policy 的表要有對應的直接寫入測試）| 候選 |
| `AD-CalibrationMetric-2` | `actual` = branch base → closeout 的定義**內含未寫出的前提**（base 是本 phase 的起工時刻）。跨夜時它把 10h20m 睡眠算成工時，ratio 從 0.74 變 2.22 | 定義改為 **branch 第一個 commit → closeout commit**，並明記「plan 起草不在窗口內，故為下界」。⚠️ **要一併決定既有資料點是否重算**（W04 會從 0.81 變 0.66）—— 那是決定不是整理 | 候選 |
| `AD-DecisionSideEffect-1` | ⭐ 兩個交付漏做，共同形狀是**它們寫在決定的句子裡**（「D4 = X，**同時**更正 Y」）而不是 checklist 的 `- [ ]` 項。**沒有勾選框的動作沒有東西會發現它沒做** | 拍板時若決定帶附帶動作，當場在 checklist 加一個 `- [ ]`；Day 4 closeout 加一步「`git diff --name-status` 對照 plan §4」 | 候選（**本 phase Day 4 已用 `git diff` 手動執行一次並抓到兩個**）|
| `AD-DesignNoteAnchor-1` | design note 的 `file:line` 錨點**隨每個後續 phase 衰減**，而沒有任何機械檢查在看。W05 在 `schema.prisma` 加 5 個 model 就讓 W04 design note 的 4 組錨點各偏 3–8 行 | 分流原則：**design note 是活參考**（`Status: Active`，明寫供 slice 2..N 複製）→ 造成偏移的 phase 負責重新校準；**change record 是歷史快照** → 不追。長期解：`check_path_references.py` 擴充成也驗 `file:line` 的內容 | 候選（**本 phase 已手動校準 W04 design note**）|
| `AD-AssetScales-1` | `02a:208` 列了 `Asset.value` / `Asset.criticality` 但**未定義值域**；不能借用 `02a:116` 的 5 點量表（那是 risk **impact** 的描述子，不是資產價值）| 建這兩欄之前必須先規格化值域，否則就是自行發明欄位（參數 #9）| 候選 |
| `AD-RiskBand-1` | **旗艦儀表板數的是分帶不是分數**（`02a:414` · `03:90` · `08:25`），而 `02a:405`（derived）與 `:429`（owner enters）**互相矛盾**，後者本身是開放決策 #5 | **M8 之前必須有人拍板分帶怎麼來**。W05 刻意不建 `rating_*` —— 建了就是替未拍板的決定選邊 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

### ⭐ 同一形狀的第 8 次：綠燈涵蓋範圍比讀者以為的窄

`AD-NegativeGate-1` 家族本 phase 再 +1。累計形態：

| # | Phase | 綠燈掩蓋了什麼 |
|---|-------|--------------|
| 1–5 | W01 | 六種 boundaries 設定失效 · 三個掃描 job 空轉 |
| 6 | W03（CH-013）| 產物從未以部署時的組態被執行過 |
| 7 | W04 | 測試環境與開發環境的建庫方式不同，只有一條被測試 |
| **8** | **W05** | **新表的 RLS `WITH CHECK` 零覆蓋 —— 拒絕由上游的 counter 代勞** |

⚠️ **第 8 個與第 7 個的差別值得記**：第 7 個是**環境**不對等，第 8 個是**測試打錯了地方**。
CH-012 的結構性解法（每個 gate 帶常駐負面案例）對第 8 個**有效** ——
`risks` 缺的正是那個負面案例。所以本次不需要新的結構性發明，需要的是
**讓「哪個機制被哪個案例守著」變成可機械檢查的**（`AD-BorrowedRefusal-1`）。

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **`AssetGroup` / `Asset` 的四項範疇測試**（checklist 2.4 🚧）→ **slice 3**，同一個 PR
- **`user.repository.ts`**（W04 checklist 2.2 🚧）→ **M4**（本 phase 未觸及，狀態不變）
- **給 slice 3 的兩條新條款**（複合 FK · 繞開發號的寫入測試）→ 見 US-6 節末
- ⚠️ **稽核軌跡** → **M3**。本 phase 新增**三條無稽核的寫入路徑**（`asset_groups` / `assets` / `risks`），
  `RISK_REGISTER` **R4 已更新**
- **`rating_*` 分帶怎麼來** → `AD-RiskBand-1`，**M8 之前必須拍板**
- 六條新 AD（見 Q6）→ BACKLOG §Open

**這個 phase 關掉的**：

- ⚪ **沒有關掉任何 AD。** `AD-RiskForm-1`（🔴 P0）從「無標的可對」變成**有標的可對**，
  但那不是關閉 —— 對照本身是 M7/M8 的工作。**誠實記為未關。**

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [x] Calibration ratio 回填 matrix（**不在** CLAUDE.md / MEMORY.md 散文裡）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— R4「稽核軌跡尚不存在而資料已經在寫」本 phase
      **敞口擴大三條寫入路徑**，已更新該列與複查日期（`AD-12b`，本 phase 同時把這一列加進模板）
- [ ] ⏳ **`plan.md` frontmatter `status:`** —— 仍是 `active`，**依 checklist 4.2 於 merge 經 `gh` 驗證後才翻**（R9）
- [x] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
