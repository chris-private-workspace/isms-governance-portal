---
status: done
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

> ⚠️ **本節的行號是枚舉當下（`56822e4` 之前）的值。** 本 CH 的收尾在 BACKLOG 開頭增了 9 行，
> §Open 表格因此整體下移 —— 這正是 `AD-MdAnchorLineShift-1` 講的形狀，由本 CH 自己觸發。
> **穩定的識別符是 AD 名稱**，下方各處都同時寫了；行號只用來重現當時的量測，不要拿去導航。

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

### 中性化結果 —— 5/6 命中，1 個推翻了我自己

執行於 **`7c8d46f`**，預測與該 commit 同批。每個 case 跑完立即 `git checkout --` 還原，
控制組與最終還原各驗一次（皆 `OK red=0`）。

> ⛔ **這個 SHA 被 rebase merge 改寫過（原 `56822e4`），而本 CH 自己剛寫過這個形狀。**
> PR #54 的描述與 `a75e02e` 的 commit message 都引用了舊值，它們**在 main 上指向不存在的物件**
> —— 與 W10 `74f0774`（標題就是 "repoint a SHA the rebase killed"）同一件事，隔一個 CH 再犯。
> ⭐ **穩定的錨點是 author date：`2026-08-14T09:31:41+08:00`，改寫前後逐秒相同**
> （commit date 變成 rebase 時刻 `09:48:34`）。本 repo 第二次量到 rebase 不動 author date。
> ⇒ 「預測寫在執行之前」這句話的證明力，靠的是 author date，不是 SHA。

| N | 預測 | 實測 | 判定 |
|---|---|---|---|
| N1 | 9 紅，⭐ `test_live_backlog_passes` **不**紅 | **9 紅**，live 不在清單 | ✅ 完全命中 |
| N2 | 11 紅，因「2 parsable cells」而非計數不符 | **11 紅**，訊息正是該形狀 | ✅ |
| N3 | **1 紅** —— 那個測試是唯一守衛 | **1 紅** | ✅ |
| N4a | **0 紅**（預測零轉紅）| **0 紅** | ✅ 命中，且暴露一個缺口 |
| N4b | 2 紅（duplicate + missing）| **1 紅**（只有 duplicate）| ⛔ **預測錯誤** |
| N5 | 10 紅 | **10 紅** | ✅ |

#### ⛔ N4b：錯的是預測，不是 detector

中性化寫的是 `!= 1` → `< 1`，而**那只放寬了「≥2」那一半** —— 零個匹配時 `< 1` 仍為真，
所以 missing 那一半從未被打開。1 紅是正確行為。

⇒ 依 `AD-MetaVerificationBug-1`「轉紅方向不符預期時**先懷疑元驗證本身**」，
懷疑的結果是：**這個中性化沒有做到它宣稱的事**。補 **N4c**（`!= 1` → `> 1`，真正打開零個那一半）
→ **1 紅（errors=1）**，唯一轉紅的是 `test_missing_declaration_marker_is_detected` ✅
兩半各有專屬守衛，各自被證明。

#### ⭐ N4a 零轉紅的正確歸因（差一點記成「缺一個測試」）

放寬 marker（拿掉「現為」）**沒有任何測試轉紅**。第一直覺是「缺測試」，但那個歸因是錯的：

「現為」擋的**不是**錯誤計數 —— 那由「恰好匹配一次」擋著（N4b/N4c 已各自證明）。
它擋的是**誤報**：一個用當前形狀書寫的**歷史**數字會成為第二個宣告，
使一份完全正確的 BACKLOG 被判 FAIL。而**今天的檔案沒有那種行**，所以現有測試全部碰不到它。

補 `test_a_history_line_carrying_the_full_shape_is_still_excluded`（在 fixture 的歷史行補上
`—— P0 3 / P1 4 / P2 2` 尾段，斷言仍 PASS）→ **N4a 重跑轉紅 1，且唯一轉紅的就是它** ✅

### 收束

- 測試 **12 -> 13**，全綠（0.006s）· `run_all` **8/8** · 工作樹只餘測試檔改動（detector 已還原）
- 六個中性化方向覆蓋：區段邊界 · 整格匹配 · 不可解析即 FAIL · marker 唯一性（兩半）· 欄位定位

## 2026-08-14 — 項目 10-14：收尾

### ⭐ Detector 第一次真實使用，就擋住了一次

收尾要動 BACKLOG（關 1 條、新增 1 條、改寫數法說明）。**所有編輯做完之後**才跑 detector：

```
backlog-counts: 2 violation(s):
  :23: header declares P1=52 but the §Open table has 51 (delta -1)
  :23: header declares P2=33 but the §Open table has 34 (delta +1)
```

**這不是 fixture，是真實的漂移**，而且形狀正是 `AD-CountBeforeLastEdit-1` 描述的那一種 ——
一出一進、總數不變，**手數最容易看漏的就是這種**（總數對了就以為沒事）。
BACKLOG 開頭那一行現在是照 detector 的輸出改的，不是照我數的。

⇒ `AD-NegativeGate-1` 要求的「被它擋住的案例」，本 CH 交付當天就有一個真實的。

### Gate（最終）

`run_all` **8/8** · detector 測試 **13/13**（0.006s）· 中性化 6 個方向、控制組與還原各驗一次
⛔ **gate-only verified** —— 純工具鏈無 UI，不得讀成任何關於可用性的陳述。

### Anti-pattern 自檢

| AP | 判定 | 依據 |
|---|---|---|
| AP-1 side-track | ✅ | 註冊進 `run_all`，CI 每次跑；不是旁支 |
| AP-2 跨目錄散落 | ✅ | 全部在 `scripts/lint/` |
| AP-3 Potemkin | ✅ | **關掉會壞什麼有六個量到的答案**（N1..N5），外加一次真實攔截 |
| AP-4 PoC 堆積 | N/A | 不是 PoC |
| AP-5 預留抽象 | ✅ | `derive_counts()` 的抽出有當前使用案例（測試要斷言真值）|
| AP-6 mock vs real | N/A | 無 mock；fixture 在檔頭明寫自己是 fixture |
| AP-7 orphan claim | ⛔ **1 個，已修** | 見下方紅旗 3 |

### 🚩 本 CH 我自己的錯誤（全部自己發現，全部已修）

1. ⛔ **tool-discipline 同形違反第 3 次**（W09、W10 各一次）—— 用 heredoc + Python 一次改 9 處
   checklist，那該是 9 次 `Edit`。**規則不是不知道，是做到一半忘了**。
2. ⛔ **N4b 的預測是錯的** —— 我宣稱它打開「取第一個」，實際只打開了「≥2」那一半。
   依 `AD-MetaVerificationBug-1` 先懷疑元驗證本身，結果正是元驗證沒做到它宣稱的事。補 N4c。
3. ⛔ **AP-7 orphan claim，而且是我自己製造的** —— spec 三處引用 `BACKLOG.md:117`，
   然後我在收尾把那一列移走了。⚠️ 更廣的一層：收尾在 BACKLOG 開頭**增了 9 行**，
   §Open 表格整體下移，**progress 全部的行號引用一起失效** ——
   `AD-MdAnchorLineShift-1` 由本 CH 自己觸發。已改用 AD 名稱當識別符 + 加警語。
4. ⛔ **E8：差點把未驗證的方法寫進 detector** —— 「取每列第一個 emoji」人工數得四個數字全中，
   而那個方法從未在三個異格式列上被驗證。抓到它的是差額比對（88 vs 91），不是那個「全中」。
5. ⛔ **改 BACKLOG 那一列時只替換到優先度欄**，留下兩個備註欄（6 欄）—— Read 回檢時當場發現。
   ⚠️ 值得注意的是 **detector 不會抓到這個**（它只找優先度儲存格，多一個備註欄不影響）。

### 順帶發現（已記 BACKLOG，不當場修）

`AD-TemplateStatusValue-1` 🟢 P2 —— `_templates/change/spec.md.tpl:26` 建議的四個中文狀態值裡，
「提案中」「已核准」**不在** `check_status_markers.py` 的 `OPEN_STATES` 內，照抄會觸發 E2。
