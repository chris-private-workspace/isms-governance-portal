# W12 — Audit trail hash chain (M3 spike → ADR-0003)

**Closed**: 2026-08-14 · **PR**: **#58 MERGED**（`ea58fdb`，rebase）· **Retro**:
`docs/01-planning/W12-m3-audit-trail-spike/retrospective.md` ·
**CH**: `docs/03-implementation/changes/CH-029-w12-audit-trail.md` ·
**Design note**: `docs/02-architecture/design-notes/W12-audit-trail.md`

---

## 交付

`audit_log`（append-only、per-entity hash chain、`BEFORE INSERT` trigger 在 DB 內算）+
`contracts/audit-hook.ts`（反轉的攔截點）+ `verifyChain` / `verifyAnchoredChain` +
兩個可切換的鏈策略 + 1 個接上的模組 + 1 個**手寫** migration。**21 / 35 實體**。
**ADR-0003 採納，OQ-4 關閉**（開放 5 天，`14-adr/README.md` 尚待撰寫 4 → 3）。

## ⭐⭐ 決定不是靠成本，而那件事只有量了才知道

| 條件 | A（DB trigger）| B（應用層錨定）| 判讀 |
|---|---|---|---|
| 序列寫入 overhead p50 | +2.636 / +2.442 ms | +1.840 / **+2.874** ms | ⛔ **順序在兩次執行間翻轉，差距落在 control drift 內 ⇒ 分不出來** |
| **併發（8 寫入者 / 1 實體）** | +41.638 / +26.117 | +25.577 / +16.413 | **A/B = 1.63 / 1.59**，可重現 |
| 驗證 walk（10k）| 278.9 / 249.1 ms | 235.2 / 249.4 ms | ⛔ **B/A 0.84–1.20 ⇒ 沒有訊號** |

**A 貴 1.6 倍而仍然選 A。** 分勝負的是（a）**斷點定位** —— 同一個竄改 A 指到**那一列**、
B 只指到**那一段**（寫成測試不是形容詞）；（b）**誰算 hash** —— trigger 對每一筆 INSERT 生效，
應用層弄不錯也跳不過，而 B 的 hash 是應用層說了算，那裡的 bug 會產生**在錯誤內容上完美驗證通過**的鏈。

⛔ **plan 列為兩大維度之一的「驗證成本」量到不區分** —— 10k 時共用的 fetch（714-753ms）
壓過 walk（249-279ms）。那**本身就是結果**，而且它移除了 B 被預期的優勢，也是 C 被否決的理由
（C 唯一的好處就在那個維度 ⇒ AP-5）。

⭐ **併發量測不在 plan 裡**，是實作時發現的：A 的成本是 per-entity advisory lock，
而**單執行緒 benchmark 結構上量不到它** —— 沒有爭用的鎖幾乎不要錢。決定就是在那個維度上做出來的。

## ⭐⭐⭐ N3 —— `AD-BorrowedRefusal-1` 問了 7 次，這次終於有答案

W10 宣稱是 policy 在擋、W11 宣稱是 `WITH CHECK` 在擋，**兩次都是宣稱**。
這次只補回 UPDATE GRANT（逐層放行，判準因此可滿足），測試回報 `Received: "NO ERROR"`。

⛔ **沒有把那句話當成答案** —— 「沒報錯」與「沒改到列」的差別，是「還有第二層」
與「只剩一層的安全事故」。直接數：可見 **7 列**（所以 0 列不是因為看不到）· `UPDATE 0` ·
**0 列被改** · `operation` 未變。

⇒ **兩層都擋，只有一層會說話**：GRANT 給 `42501` 的明確錯誤，缺席的 policy 給安靜的零列。
⚠️ 承重推論：有人下 `GRANT ALL ON ALL TABLES` 時 append-only **仍然成立但變啞** ——
一道還站著卻不再出聲的防線，是最難察覺它已成為唯一一道的那種。

## 🚩 三個「綠燈其實什麼都沒證明」

1. **N2 揭出四個範疇測試裡的第 1 個在稽核全關時仍全綠** —— 空陣列上 `every()` 真、`some()` 假
   ⇒「看不到別人的列」與「一列都沒有」是同一個觀察。補非空前提並**重跑 N2**（W10 / W11
   各漏過這一步）：**7 紅 → 10 紅**。→ `AD-VacuousScopeTest-1`
2. **coverage funcs 88.88% 揭出「策略 B 的正確性從未被斷言過」** —— 而我正要拿 B 當成本基準線。
   bench 斷言的是**時間**，時間不在乎寫入者是壞的（永遠寫 32 個零的實作會 benchmark 得很好看）。
   ⭐ 行數 100% 而 funcs 88.88%，**那個差距本身是訊號**。
3. **第一版 benchmark 說「稽核讓寫入變快」** —— 三組依序跑各自建 `TestingModule`，
   暖機偏差 ~4ms 大於效應 ~2ms。改成**交錯** + 兩個內建儀器檢查。→ `AD-BenchOrderBias-1`

## 兩個「寫不出來才知道」的設計約束

- **`AFTER INSERT` 不可行**：AFTER 改不了 `NEW` ⇒ 存 hash 要 `UPDATE` ⇒ 撞 append-only 自己。
  **兩個設計互斥**，落點改 `BEFORE INSERT`。plan / checklist 原文保留不刪。
- **`TIMESTAMPTZ(6)` 會讓 verify 變成永遠在響的警報**：hash 覆蓋時戳，儲存值是微秒而 JS `Date`
  只有毫秒 ⇒ 每一列重算都不符。⛔ **沒有任何 gate 抓得到** —— 鏈在 DB 內部自洽、測試全過。
  改 (3)（全 schema 唯一），實測是四捨五入不是截斷。

## 其他當天被抓到的

- **邊界矩陣兩個方向都禁止直接呼叫** ⇒ `contracts/audit-hook.ts`（**零 import**，`api` 是葉節點）。
  ADR-0004 說了三次「攔截點在同一個 extension 內」而**沒提到需要一層契約**。
- **jsonb 有兩種空，JavaScript 只有一種** —— Prisma 對 SQL NULL 與 JSON `null` 都回 `null`，
  驗證器**結構上分不出**。正解不是補判斷，是 CHECK constraint 讓那個狀態**不可表示**。
- **`GRANT USAGE ON SEQUENCE`** —— 本 repo 第一個需要它的 migration（其餘全是 client 端 UUID）。
- ⛔ **closeout 導出 R4 覆蓋率分母時，推翻了 R4 自己的手寫計數**：手寫 18、真值 **21**
  （缺 W03 的 `extension_fields` 與 W05 的兩個全域庫）。而錯的 19 **已經進了三份文件**才被抓到。
  → `AD-RiskTableCountManual-1` 首次實地擊中，P2 → P1。

## Calibration

`spike` 第 6 點，ratio **1.025 IN** —— ⭐ **本欄第一個 IN-band 點**
（前四點：W02 1.10 不同單位 · W03 0.34 · W04 0.81 · W07 0.30）。
actual **4.00 hr** = `7503f8d` 14:33:25 → `f7a0c03` 18:33:23（author date，含 Day 0）。
⭐ rebase merge 改寫全部 12 個 SHA 而**在 main 側重算值完全不變** —— author date 逐秒相同
（`AD-DesignNoteAnchor-1` 第 3 個資料點：穩定錨點是 author date 不是 SHA）。

⛔ **三格刻意留白到 closeout commit 落地之後才回填** —— `AD-EstimateAsMeasurement-1`
提議的修法第一次被執行（W11 那次錯的正是 band 判定本身，12 分鐘剛好跨過邊界）。
代價：closeout 是**兩個 commit**，第二個只做回填。

⭐ `actual/bottom-up` **0.667**，第一次高於 matrix 的 0.4 下限（W07 0.17 · W08 0.097 · W09 0.25）。
⛔ **但要打折**：plan §7 的 bottom-up 是 **Day-0 之後逐項重算的** ——
那不是「事前估算變準」，是「事後重估比較準」，而後者本來就應該。
⭐ 逐段間隙最大 75.6 min（benchmark）與 56.7 min（closeout），**沒有一段是等使用者**
⇒ 不含 `AD-CalibrationIdleGap-1` 的汙染。
