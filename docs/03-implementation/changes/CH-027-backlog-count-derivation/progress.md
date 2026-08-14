---
status: approved
---

# CH-027 — Progress

> 執行日誌。每個工作段一個條目；完成摘要寫在最後。

## 2026-08-14 — Pre-doc gate

- `spec.md` 起草（`proposed`）-> laitim2001 核可 scope + acceptance -> `approved`
- `checklist.md` 從 spec §Verification 導出（15 項）
- 分支：`chore/ch-027-backlog-count-derivation`

## 2026-08-14 — 項目 0：格式枚舉

> ⚠️ **這一段的存在理由**：`lint-detector-authoring.md` §先枚舉真實格式 ——
> 憑印象的作者寫了 2 種格式，repo 裡有 4 種，而漏掉的那批藏著 2 個真陽性。
> **「detector 綠了，但它綠是因為它看不見。」**

掃描對象：`docs/01-planning/BACKLOG.md`（全檔 279 行）。方法：Grep `-o` 逐項抽取後交叉比對。

### E1 — §Open 的邊界，以及區段內不只有 AD 表

`## §Open Carryover ADs`（`:82`）到 `## §Shipped Phases Pointer Index`（`:199`）。

⛔ 區段內還有一張**優先度判準表**（`:180`–`:187`），它的 4 列以 `| 🔴 P0 |` / `| 🟡 P1 |` /
`| 🟢 P2 |` / `| ⚪ P3 |` **開頭** —— 光靠區段過濾會把其中 3 列算進計數。
⇒ 必須再以「第一欄是 AD ID」二次過濾。

> 這 3 列就是 `BACKLOG.md:117` 記載的「判準表的 3 個示例」。⚠️ **但那條記載的歸因不精確** ——
> 它們不是 AD 列，而是判準表的**優先度列**；`^\| AD-` 從來抓不到它們，抓到它們的是數 emoji 的那一側。

### E2 — AD 資料列

**91 列，`:88`–`:178` 連續無間斷**，第一欄格式完全統一（`| AD-<name> |`）。
全檔沒有任何 `^| AD-` 出現在 §Open 之外（§Shipped / §Pending / §Known Issues 皆無）。

### E3 — ⛔ 優先度儲存格有 **3 種**寫法，不是 1 種

| 寫法 | 列數 | 出處 |
|---|---|---|
| `🔴 P0` / `🟡 P1` / `🟢 P2`（標準）| **88** | 大多數 |
| `🔴 **P0 候選**` | **2** | `:130` `AD-NegativeGate-1` · `:174` `AD-UniqueKeyOracle-1` |
| `🟡 **P1**（升級）` | **1** | `:159` `AD-StaleRecordRef-1` |

88 + 3 = **91** ✅

**發現方法**：以嚴格 pattern `\| (🔴\|🟡\|🟢) P[0-3] \|` 抽取只得 **88** 列，而 AD 列有 **91** ——
**差額本身就是異格式清單**（`:130` / `:159` / `:174`）。
⚠️ `BACKLOG.md:117` 只記了其中 1 個（`AD-NegativeGate-1`）；`:174` 是 W10 新增的，記載未更新。

### E4 — ⛔ 備註欄也含優先度 emoji（所以「數 emoji」必然多算）

- `:101` `AD-Port-BFSI` 備註欄有 `（原 🟡 P1）`，該列真正的優先度是 **🟢 P2**
- `:131` `AD-GrepAssertion-1` 備註欄有 `grep -c "🔴 P0"`，該列真正的優先度是 **🟡 P1**

⇒ 加上 E1 的判準表 3 列，「數 emoji」會得 **96** 而非 91。

### E5 — ⛔ 儲存格內有**裸 `|`**，所以 `split('|')[4]` 會靜默錯位

`:145` `AD-TimeTracking-1` 的症狀欄含 `` `|R-1.0|` ``。markdown 不因反引號而豁免分隔，
該列 split 後**多出兩格**，第 4 格是 `` ` 達 65% 卻無法判斷是雜訊還是訊號 `` 而**不是**優先度。

⇒ **不可用固定欄位索引**（左數或右數都不安全 —— 備註欄同樣可能出現裸 `|`）。
採用的方法：切格後找出**整格內容匹配優先度形狀**的儲存格，並要求**恰好一個**；
0 個或 ≥2 個都 FAIL。E4 的兩個備註欄因為不是「整格」而自然不匹配。

### E6 — 宣告 marker 的唯一性

`:23` 的 `**現為 91 條 —— P0 6 / P1 52 / P2 33**`。

- 只用「現為」錨定 → **3 個命中**（`:23` · `:115` · `:130`，後兩者是 AD 內文用語）
- 用完整形狀 `現為 N 條 —— P0 a / P1 b / P2 c` → **恰好 1 個命中** ✅
- 同段落的歷史數字（`達 48 條`:22 · `其前 86 條`:30 · `其前 80 條`:35 · `其前 79 條`:37,:40）
  皆不含 `P0 a / P1 b / P2 c` 尾段，**不會被誤抓** ✅

### E7 — 「P0 候選」的語義：沿用，不發明

宣告值 `P0 6` = 4 個標準 `🔴 P0` + **2 個 `🔴 **P0 候選**`**。
⇒ 既有解讀把「候選」算進 P0。detector **沿用**此解讀並在 docstring 註明它是沿用而非發明；
若要改，那是使用者的裁決，不是 detector 的預設。

### E8 — 🚩 我自己差點踩進去的坑（本段是本次枚舉最值錢的產出）

先以「**取每列第一個 emoji**」人工數，得 **P0 6 / P1 52 / P2 33** ——
**四個數字全部等於宣告值**，看起來完全成功。

⛔ 但那個方法對 E3 的三個異格式列**從未被驗證**，它們碰巧也把 emoji 放在第一位；
而 E5 證明只要症狀欄出現一個 emoji（今天沒有，也沒有任何東西擋著），它就會靜默給出錯的答案。

**一個未經驗證的方法，因為恰好對上了正確答案而看起來像被驗證過。**
這正是 `AD-MetaVerificationBug-1` 的形狀 —— 壞掉的驗證長得跟成功一模一樣。
⇒ 若不是先做 E3 的嚴格 pattern 交叉比對（88 vs 91），這個坑會直接被寫進 detector。

### 對 spec 的影響

無 —— spec §關鍵設計細節的四條全部成立且被實測加強。**新增兩條**（E5 裸 `|`、E4 備註欄 emoji），
兩者都寫進 detector 的解析策略；spec 不改（依 Day-0 慣例，發現記在此處而非回頭改 pre-doc）。

**Go**：範圍變動 0%，繼續項目 1。

## 2026-08-14 — 項目 1-4：detector · fixture · 註冊 · 測試

- `check_backlog_counts.py`（解析策略逐條對應 E1/E3/E4/E5/E6）
- `__fixtures__/backlog-count-drift/backlog-baseline.md`（**三個陷阱各含一份**）
- `run_all.py` `DETECTORS` **7 -> 8**
- `tests/test_backlog_counts.py` **12 個**（unittest —— CH-007 量到 proxy 後 `pip install` 抓到 0 byte 的 wheel）

**實測**：`run_all` **8/8** · detector 測試 **12/12**（0.014s）· self-test OK · 真實 BACKLOG PASS

### ⭐ 「PASS」不是證據：先證明解析器真的在數

真實檔案 PASS 只證明兩側一致 —— 若解析器兩側都沒讀到，也會一致。
於是在**記憶體中**（不落磁碟）改壞宣告側，逼錯誤訊息把真值引述回來：

```
header declares total=90 but the §Open table has 91 (delta +1)
header declares P0=5   but the §Open table has 6
header declares P1=51  but the §Open table has 52
header declares P2=32  but the §Open table has 33
```

再逐列印出寫法分佈：**plain=88 + bold=3 = 91**，且 bold 三列正是 `:130` / `:159` / `:174` ——
**與 E3 用完全不同的方法（grep 差額）得到的清單逐一相同**。兩條獨立路徑同一答案。

### 中性化預測（⛔ 寫於執行之前，與本段一併 commit）

> 依 `AD-MetaVerificationBug-1`：中性化的預期方向必須在跑之前寫下來，
> 否則「零轉紅」會被事後合理化成通過。12/12 全綠**不代表它們在測對東西**。

| N | 中性化什麼 | 預測轉紅 | 預測不動 |
|---|---|---|---|
| **N1** | `open_section()` 回傳整份文件（等於不做區段過濾）| **9** —— 所有依賴 baseline 的 | ⭐ **`test_live_backlog_passes` 不紅** —— 真實檔案在 §Open 之外**沒有** `\| AD-` 列，這個陷阱今天**只有 fixture 涵蓋得到** |
| **N2** | 優先度改為在整列中 search（而非要求整格匹配）| **11** —— baseline 因 `AD-Fixture-Plain` 出現「2 parsable cells」而紅（**不是**因為計數不符）；live 因 `:101`/`:131` 同樣紅 | `test_all_three_live_spellings` |
| **N3** | 無法解析的儲存格改為 `continue`（skip 而非 FAIL）| **1** —— 只有 `test_unparsable_priority_cell_is_detected_not_skipped` | 其餘 11 全綠 —— 若成立，代表那一個測試是該防護的**唯一**守衛 |
| **N4a** | marker 放寬為不含「現為」二字 | **0**（預測零轉紅）—— 若成立即暴露：「現為」這個限制**沒有任何測試在守**（`AD-BorrowedRefusal-1` 形狀）| 全部 12 |
| **N4b** | 「恰好一次」放寬為「取第一個」| **2** —— `test_duplicate_...` 與 `test_missing_...` | 其餘 10 |
| **N5** | 改用固定欄位索引 `cells[3]` | **10** —— baseline 與 live 都因 `:145` 形狀的裸 `\|` 錯位而紅 | `test_all_three_live_spellings` · `test_priority_named_inside_a_notes_cell` |

（結果待填）
