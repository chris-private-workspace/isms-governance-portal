# ROADMAP — 執行順序層

**Purpose**: 回答「**先做哪個？要等什麼？**」。**不**回答「有什麼工作」—— 那是 `BACKLOG.md`。

**Category**: Planning
**Created**: 2026-08-07
**Last Modified**: 2026-08-15
**Status**: Active

> **Modification History**
> - 2026-08-15: Close the only dated deadline (CH-032) — the deadline table is now empty
> - 2026-08-15: Add item 4d and name the unranked P0s (audit #6 AD-21) — two had no home here
> - 2026-08-15: Advance item 4 to M1 slice 9 (W14) — 22/35, the drift guard's first live catch
> - 2026-08-14: Add items 4b (OQ-4 → ADR-0003, W12) and 4c — audit coverage is 1/21, and blocks M1
> - 2026-08-13: Advance item 4 to M1 slice 7 (W10) — 19/35, a unique index measured as an oracle
> - 2026-08-13: Advance item 4 to M1 slice 6 (W09) — 17/35, denominator −1 by user ruling
> - 2026-08-13: Advance item 4 to M1 slice 5 (W08) — 14/36, the criterion finally split
> - 2026-08-12: Advance item 4 to M1 slice 4 (W07); add item 9 — the anchor detector, deferred ONTO this list
> - 2026-08-12: Advance item 4 to M1 slice 3 (Phase W06) — 8/35 entities, ADR-0014, clause 2 refuted
> - 2026-08-11: Advance item 4 to M1 slice 2 (Phase W05) — 7/35 entities, invariants adjudicated
> - 2026-08-10: Drop the duplicated negative-gate count — single source is BACKLOG (audit AD-8)
> - 2026-08-10: Phase 無 —— 首次填入排序項（CH-016）；啟用門檻已達成，見下方 §為什麼現在啟用
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

---

## 職責分工（不要搞混，也不要在本檔複製 BACKLOG 內容）

| 文件 | 回答什麼問題 | 內容 |
|---|---|---|
| [`BACKLOG.md`](./BACKLOG.md) | **有什麼工作？做到哪？** | 單一來源（PROCESS R7）—— 分類 · 狀態 · 完整細節 · 實據 |
| **本檔** | **先做哪個？要等什麼？** | **只有順序 + 前置條件**，每項一行，細節一律 link 回 BACKLOG |

**為什麼要分開**：BACKLOG 有分區和狀態，但**沒有順序** —— 讀完仍然不知道下一步做哪個。
**為什麼不合併**：BACKLOG 會越來越長，在裡面排序會讓兩種資訊互相淹沒。
**為什麼不複製細節**：複製 = 造出第二份要同步的清單 → **必然 stale**。
這跟 `STATUS_AUDIT.md` §5 是同一條鐵律。

> ⚠️ **只有在 BACKLOG 已經長到「讀完不知道下一步」的時候才需要本檔。**
> 專案早期（待辦 < 10 項）**不要**開這一層 —— 多一份要同步的文件就是多一個漂移面。

### 為什麼 2026-08-10 才啟用

首次跨來源審計（[`STATUS_AUDIT.md`](./STATUS_AUDIT.md) §2.7 **AD-2**）量到：本檔自建立起
**零排序項**，而它自己設的門檻已經成立 —— `BACKLOG.md` §Open 有 **48 條**。

更關鍵的是 **AD-5** 揭露的失效模式：`AD-CIRequired-1` 的解封條件（「W01 骨架建立後設」）
**成立了兩次而無人察覺**，因為它只寫在 BACKLOG 的備註欄裡，而備註欄沒有人會逐條回頭掃。
同一種病在 `AD-ImageDigest-1` / `AD-ImageBuild-1` 已經出現過 —— **這是第 3 次**。

所以本檔的職責比模板寫的更具體一點：**有解封條件、有前置依賴、有死線的項目，
必須出現在一份會被讀的清單上**，而不只是 48 條備註裡的一句話。

---

## 怎麼用

1. **開 session 想知道做什麼** → 由上而下找第一個 `▶` 或 `⬜`，那個就是下一項
2. **想知道該項細節** → 跟「細節」欄的連結去 BACKLOG / phase folder，**不要只讀本檔就開工**
3. **完成一項** → 本檔標 `✅` **同時**更新 BACKLOG 對應行
   —— 收尾時要回頭改**兩處**，只改一處就是下一次審計的漂移發現
4. **識別到新工作** → **先進 BACKLOG**（R7），再決定插入本檔哪個位置

**標記**：`✅` 完成 · `▶` 進行中 · `⬜` 未開始 · `⏸` 等外部 · `⏰` 有死線

---

## 主線（依序）

<!-- 每項一行。超過一行代表細節該回 BACKLOG。 -->

| # | 項目 | 標記 | 前置條件 | 細節 |
|---|---|---|---|---|
| 1 | `AD-CacheControl-1` —— 定義「什麼算 sensitive」的 `Cache-Control` 預設 | ✅ | — | W03（2026-08-10）—— 判準是「entity-scoped 嗎」不是「敏感嗎」→ 全域無例外清單 |
| 2 | `AD-SecDoDAutomation-1` —— `16` 的 28 點**分類** | ✅ | — | [分類報告](../09-analysis/secure-dev-dod-automation-classification-20260810.md)（2026-08-10）|
| 2b | `AD-SecDoDAutomation-1` —— **B 類三點**（#17 seed 資料無 checksum-valid 卡號 · #10 瀏覽器儲存禁令 · #25 危險 sink）| ⬜ | 第 2 項（已完成）| 同上 §建議的實作順序 |
| 2c | **拍板：Entra ID 之後，`16` #11–15 的密碼／憑證責任邊界** | ⬜ | — | 同上 §需要拍板的 —— **可能值得一份 ADR** |
| 3 | **OQ-6 spike → ADR-0005** —— 受治理擴充欄位的儲存機制 | ✅ | — | W03（2026-08-10）—— [`ADR-0005`](../14-adr/0005-governed-extension-storage.md)；兩層獨立性已元驗證 |
| 4 | **M1 — Data foundation** | ▶ | **slice 13 / N 已交付**（W18，2026-08-17，**MERGED PR #77**，`d370f8c`）—— `02a:233` 的 `Event` 六欄骨架 + `02a:465-473` 的 `posture_snapshot` 七欄（**旗艦滾升儀表板的唯一資料來源**）⇒ **34 / 36 實體**（分母不變）。⛔ 零端點零 repository，消費者在 **M6**（事件表單）與 **M8**（快照排程 job）。⭐⭐ **本片的核心是一個區分而不是兩張表**：兩者最後都是 RLS `ENABLE`+`FORCE` + 2 policy + `SELECT, INSERT` 無 UPDATE，**而理由不可互換** —— `posture_snapshots` 是 **append-only BY SPECIFICATION**（`02a:475` 明文「do not retro-edit them」，**無解封條件**，未來加 `GRANT UPDATE` 是牴觸規格不是補完它）、`events` 是 **append-only BY INABILITY**（推進狀態需要 `status`，而它有兩份互斥 lifecycle，**M6 解封**）⇒ int 測試 7 與 13 斷言**同一個 42501** 而各自寫明是哪一種；一個叫「the table is immutable」的測試會在這個區分消失後**繼續通過**。⭐⭐ **Day-0 D1 推翻了 plan 自己的理由，而那是本片最有價值的產出**：草稿寫「`status` 不在 `02a:233` 的欄位清單上」，但 `02a:157` 明說 §3 **只列 entity-specific 欄位**、base fields（含 `status`）一律適用 ⇒ 那個理由**對任何 base field 都成立**，因此不是理由。⛔ **它與其他十條 drift 不同類**：其餘是「plan 說 X 而實際是 Y」（事實漂移，Day 1 第一個 grep 就會抓到），這條是**論證漂移** —— 它會安靜通過所有 gate、寫進 migration banner、然後被下一片當範本。抓到它的不是 grep，是**一個 agent 在回答另一個問題時順帶引用了 `02a:157`**。⭐ **D3 換掉了先例**：`posture_snapshots` 的 base-field 信封抄 `AuditLog`（`schema:2063-2072`）不是 `Attestation` —— 批次寫入（13 OpCo × 9 metric = 每期 117 列）、以矩陣讀取、且 **`retired_at` 在 append-only 表上就是 redaction 機制**；`02a:465-473` 的七欄清單**獨立地**同意。⚠️ `extensions` 的省略標為 **JUDGEMENT 而非 MECHANICAL** —— 借用 `retention_policies` 的「`validate_extensions()` 讀 `NEW.org_entity_id` 而它沒有」會是 `AD-BorrowedRefusal-1`，因為**本表有** `org_entity_id`。⭐ **中性化 5 條 5 中，含紅的形狀**：N3 預測測試 7 以 **resolve 而非 raise** 轉紅，實測 `resolved instead of rejected` + `rowCount: 0` ⇒ banner 裡「兩層失敗方式不同」的宣稱**首次由本片自己的表證明**而非引用 W10/W16；N4 拿掉唯一鍵的 `org_entity_id` ⇒ **`globalSetup` 死在 23505 並指名該 constraint**（seed 的兩列刻意共用 `(2026-Q3, total_risks)` 而分屬 SG1/HK1，**fixture 本身就是斷言**）⇒ `AD-UniqueKeyOracle-1` 第 4 個資料點、第 2 個正面的。⭐⭐ **N1 是對 W17 的對照實驗**：同一個中性化（刪 INSERT policy），W17 得 **0 轉紅**（247 全綠）、W18 得 **1**，唯一差別是本片有「範疇內 INSERT 成功」那個測試 ⇒ `AD-VacuousScopeTest-1` 的修法**首次被實測確認有效**而非被推論。⚠️ **五條全中不全是好消息** —— 它說模型準確，不說練習有收穫；W17 的 N4 預測失敗產出的價值更高 ⇒ 下一片應提高中性化難度。calibration **0.545 UNDER**（第 11 點，⭐ **本 class 第一個「乾淨的 UNDER」** —— T0 首次蓋在**讀第一個檔案之前**故分子完整；⛔ W17 留的判準寫 0.7-0.85 而本點更低 ⇒ 字面不觸發，且 ratio 對分子的方向與直覺相反 ⇒ 舊 UNDER 有一部分是量測 artifact → `AD-CalibrationT0PlacementShift-1`）。⛔ **M1 的 DoD 仍未達成** —— 其餘 2 張表（`AccessRequest` / `AccessReviewCampaign`）是 slice 14，且 🔴 **建它之前必須裁決** `02a:325` 的 `org_entity_id` nullable 與約束 8 鐵律 1 的衝突 ‖ **前一片**（W17，2026-08-16，**MERGED PR #73**，`cf7cf07`）—— `05` §Records retention 的兩張表：`retention_policies`（**全域**）+ `legal_holds`（entity-scoped）⇒ **32 / 36 實體**（分母不變 —— 兩者早在 `02a:50` 索引上）。⛔ 零端點零 repository，消費者在 **M6b**。⭐⭐ **本片最有價值的產出是一個「不做」**：`02a:318` 讓 scope 多型於 record / class / entity，而 W14 的 `assert_polymorphic_parent_in_scope()` **結構上不可用** —— `polymorphic_parent_guard/migration.sql:47` 把 id 欄 `::uuid` cast，而 mapping walk 在 `:52-59`，⇒ **cast 早於分支**；`class` 的目標是紀錄類別不是 uuid，`record` 泛指 31 張表寫不出 mapping。**只涵蓋 `entity` 分支的 trigger 會是綠燈、有斷言、對兩個需要檢查的分支全盲** = `AD-VacuousScopeTest-1` ⇒ 明說不建並登記 `AD-LegalHoldScopeRefUnguarded-1`。⭐⭐ **中性化 N4 預測零轉紅、實測零轉紅，而那是壞消息**：刪掉 INSERT policy 全套 247 條全綠，因為**缺席的 policy 對 INSERT 是拒絕**（ADR-0014），與正確 policy 拒絕跨實體列**觀察不出差別** —— 而 12 條測試裡沒有一條做「範疇內 INSERT 應該成功」⇒ 那張表可以安靜地對 app 角色變成唯讀。補測試 13 後 N4a 恰好 1 紅。⭐ **N1 是 W16 DR3 的直接證明**：拿掉 `FORCE` 恰好 1 紅、246 條未動 —— 沒有那條斷言，缺口完全不可觀察。⭐ **`.rejects` 沒有 SQLSTATE 近乎恆真**：首跑 3 紅全是 `42P08`（`$1` 同時當 uuid 與 text，parse 階段就死），三個 INSERT 從未走到它們宣稱測的東西；寫成裸 `.rejects` 會三條全綠而什麼都沒測到。⭐⭐ **Day-0 D10 換掉一個量錯東西的儀器**：W15/W16 的「Prong 3 欄位級 diff」中，`--from-migrations` 在本 repo **跑不起來**（缺 `shadowDatabaseUrl`），`--from-config-datasource` 打的是落後 6 支的 `isms_dev` ⇒ 量的是**落後**不是**漂移**；新量法覆寫 `DATABASE_URL_MIGRATE`（不是 `DATABASE_URL`）指向 `isms_test` 分離出恰好 2 條既有漂移、本片零新增。⭐ **D4 差點造出一個假 P0**：`grep 'FORCE ROW LEVEL SECURITY'` 全樹回 3 個命中（W16 用**兩個空格**對齊），照那數字推是「16 張表 owner 繞過全部 policy」；寬容 pattern 實測 ENABLE 24 / FORCE 24 / 缺口 0。⭐ **D13 關掉六個 phase 的繞開**：`migrate deploy` 一次把 `isms_dev` 補到 24/24 —— `AD-DevDbChecksumDrift-1` 五次記錄都寫「`migrate dev` 被擋」而沒有人問「那 `deploy` 呢」。calibration **0.78 IN**（第 10 點，**首個分子被量測而非反推**）‖ **前一片**（W16，2026-08-16，**MERGED PR #71**，`0086ba5`）—— `13` §Data model 的四張表 **+ 第五張 `ISMSProfileVersion`**（使用者裁定；`02a:18` 允許「adding an entity means adding a row here **in the same change**」）⇒ **30 / 36 實體**（分子 +5、**分母 +1**）。⛔ 零端點零 repository，消費者在 **M6c**。⭐⭐ **本片最有價值的產出是 Day-0 的 DR3：plan 只寫了 `ENABLE ROW LEVEL SECURITY` 而漏了 `FORCE`** —— 沒有 FORCE，migration 的 owner 角色**繞過全部 policy**，而 int suite 連的是 app 角色 ⇒ **沒有任何現有測試會發現**。guardrail 4 的直接缺口配上一個結構上看不見它的測試套件，正是 `AD-EntityScopeNoDriftGuard-1` 說的那件事。⭐ **DR12 是第二有價值的**：Prisma 會導出 69 字元的索引名而 `NAMEDATALEN` 是 **63**，PostgreSQL **靜默截斷** —— W11 已經踩過（`statements_of_applicability` 的名字被吃掉 `key`，schema 與 DB 從此不一致且 `migrate diff` 至今仍報），本片本來會是第三例；抓到它的是 Prong 3 的**欄位級** diff。⭐⭐ **`AD-UniqueKeyOracle-1` 第 3 個資料點，且是第一個「正面」的** —— 前兩次都是發現 oracle 並移除；本片在**建表之前**套判準（ROADMAP 4d 的落點），並以 **N2b** 證明拿掉 `org_entity_id` 後 oracle 就會出現（SG1 送一筆只關於自己的 insert，卻因 HK1 持有 2099 而被拒 ⇒ 可一年一猜列舉）。⭐⭐ **`AD-DevDbChecksumDrift-1` 第 5 次，且五個 phase 來首次拿到真實數字**：`isms_dev` 只套了 **17 / 22** 支、head 自 W10 未動 —— 前四次都用 int suite 的重建訊息代替，而那訊息**結構上看不見 checksum 漂移**。⭐ **N3a 把 W10 留下的預測變成事實**：只放行 `GRANT UPDATE`、policy 留空 ⇒ **不報錯而 `rowCount = 0`**，缺席的 policy 自己撐得住（W10 的 migration 註解至今仍寫「should be rather than is」）。⛔ **五次中性化三次預測不正確，三次都是把條數估低**；且 N1 與 N3b 是**相反的失敗模式** —— 前者多出的 12 紅是我自己並行跑 int suite 造成的汙染、後者多出的 2 紅是覆蓋真的比預期好，**分辨方法只有「每一條紅是否都能由該改動解釋」**。⭐ **AC-2 這次真的做了**（W15 `closed_partial` 的唯一理由）：94 個欄位、兩條獨立路徑交叉檢查、12 條缺席證明**先以陽性對照證明儀器有效**、15 個裁決各指向一個可重跑的證據。calibration **0.84 IN**（第 9 點；W15 的 1.235 OVER 之後方向反轉 —— 教訓被吸收進**估算**而非乘數）。⛔ **M1 的 DoD 仍未達成** —— 其餘 6 張表是 slice 12..N ‖ **前一片**（W15，2026-08-16，**MERGED PR #67**，`d01d505`）—— `02a:161`/`:198`/`:200` 的 `Jurisdiction` / `Regulation` / `Obligation` 三張表 + `residency_policy` enum + `OrgEntity.jurisdiction_id`（nullable），**25 / 35 實體**。⛔ **零端點、零 repository、零 controller** —— 這一片交付的全部價值是一個**約束面**（4 FK + 1 UNIQUE + 3 GRANT + 1 enum + 欄位形狀），消費者在 M6。三張表**全域**（無 `org_entity_id`、無 RLS），複製 W05 `threats`/`vulnerabilities` 的形狀；`obligations` 是唯一**擴充**既有豁免清單的一張，依 `multi-tenant-data.md:81` 三處舉證（該檔本身 + migration banner + **PR 描述**）。⭐⭐ **本片最有價值的產出是 Day 0 的 D7，而它的價值在於它不在任何一個決策點裡**：plan 有 D1–D5 五個明確標示的決策點，**GRANT 不在其中** —— 因為前九片的表全是 entity-scoped，GRANT 每次都一樣。D7 量到先例是 `SELECT` only ⇒ (a) D3「不進 `AUDITED_MODELS`」的論證從「今天沒有寫者」升級為「**寫者被資料庫擋著**」；(b) ⭐ **AC-5 的 FK 測試不能走應用層** —— app 角色沒有 INSERT 權限，PG 會在**評估任何約束之前**以 42501 拒絕 ⇒ 照 plan 原樣寫，兩條 FK 測試會**全綠而什麼都沒測到**（`AD-VacuousScopeTest-1` 最難察覺的那一種：綠燈、有斷言、斷言還通過）。⇒ **一個每次都一樣所以不必問的東西，在第一次不一樣的時候不會舉手。** ⭐ **恆真檢查在被寫進 checklist 的當下就被抓到**：1.1 原文「觀察漂移守衛**仍綠**」是恆真的（「守衛正確忽略無寫入路徑的 model」與「守衛從不看新 model」**產生一模一樣的觀察**）⇒ 拆 1.1a/1.1b，後者用暫時 stub 逼出 1 紅並指名 `Jurisdiction`；附帶量到 **stub 無人 import 卻仍被偵測** ⇒ 守衛讀的是**文字**不是 build graph。⭐⭐ **N1 的直覺預測「2 紅」在寫下之前被 grep 推翻** —— `rls-direct`（第 17）跑在 `jurisdiction`（第 18）**之前**，看不到多出來的第 6 列 ⇒ 正解 1 紅：**「多一個紅看起來像是中性化更成功，沒有人會回頭質疑一個比預期更紅的結果。」**（⚠️ 該事實自帶標註：依賴 `--listTests` 順序 = 執行順序，**那是假設不是量測**）。N2 承諾的是「紅的**形狀**」而非條數，三種形狀逐項命中。⛔ **calibration 1.235 OVER，而 plan §7 預測的方向是 UNDER** —— 它預告「更偏複製 ⇒ ratio 明顯低於 band、可能該分 `schema-only` class」，實測反向：**零端點讓實作便宜（64.4 min）卻讓驗證變貴（65.9 min）**，因為沒有應用層可驅動，唯一能證明它的只有整合測試與中性化。⇒ 假設的 `schema-only` class 若存在，乘數該**比 0.50 高**。⛔⛔ 且**資料品質要打折**：progress.md **零時間記錄** + plan §7 **未宣告量法** ⇒ 分子事後由 author date 反推，**1.235 是下限**（`AD-CalibrationNoTimeRecord-1`）。⚠️ **`closed_partial` 的理由只有一個**：**AC-2 從未被驗證** —— 「欄位逐個對上 `02a`」的比對沒被執行也沒被寫下來，**今天加一個欄位或拿掉一個欄位，全部 gate 都不會紅**。⭐ **R4 這次沒有變大，而那是 W02 以來第一次** —— `GRANT SELECT` only 讓「無寫入路徑可稽核」成為**構造保證**而非「還沒接」；覆蓋導出值 **16 / 25**（分母 +3 分子不變**是正確的**）。⛔ **M1 的 DoD 仍未達成** —— 其餘 10 張表是 slice 11..N ‖ **前一片**（W14，2026-08-15，**MERGED PR #63**，`e9ab83a`）—— `02a:235` 的 `Attestation` + 2 個端點，**22 / 35 實體**。⭐ 本片同時是 **W13 漂移守衛的第一次實戰**：在建表但**未接**稽核的狀態下**恰好 1 紅**，訊息自己指名 `Attestation`（落在 `unaudited` 側），而 15 條逐模型覆蓋測試**一條未動** ⇒ 偵測**獨立於**它們，R4 的失效模式在第 22 張表上被機械攔下。⭐⭐ **本片最有價值的產出是 Day 0 的 D5**：`controls_read` 含 `applies_to_scope = 'group' OR …`，group-shared control 對**任何**實體合法可讀（`02a:434` 明說）⇒ 若拿 group control 當中性化標的，測試**修法前後都會通過** —— `AD-VacuousScopeTest-1` 的形狀，而 W13 才剛補過 4 處。實測把兩側都釘死：拆掉守衛後測試 8（entity-local control）轉紅、⭐ **測試 7（group control）仍綠** ⇒ **只寫測試 7 會得到一條什麼都不證明的測試**。⭐ `assert_parent_in_scope()` **結構上擴充不了** —— 它讀 `TG_ARGV`，那是 `CREATE TRIGGER` 時寫死的字面值，而分支必須**逐列**發生 ⇒ 新建 variadic 的 `assert_polymorphic_parent_in_scope()`，舊函式**一行未動**（三個 phase 依賴它，零回歸面）；⛔ **非 AP-5** —— 當下就有兩個呼叫端，且兩份映射不重疊。⛔ **`status` 不建**：`02a` §4 與 `:417` 兩份 lifecycle 清單**都沒有 Attestation** ⇒ 沒有值域來源（W07 移除 `ControlTest.result` 的鏡像：那裡是終態已承載，這裡是沒有終態）。**RLS 只 2 條**、連 `GRANT UPDATE` 都無（`rm_report_versions` 先例：更正=新列，撤回=`retired_at`）。⛔ **N3b 預測錯了，而錯得比預測有用**：Prisma 的 **generated client 在 runtime 也驗證 enum 值** ⇒ 不是「schema 與 DB 兩份真相」而是**三份**（`schema.prisma` / generated client / DB catalog），中間那份會擋 —— `ALTER TYPE ADD VALUE` 的 migration **必須**配 `prisma generate`，否則「DB 接受、應用層拒絕」的分歧只在部署時現形。🚧 **US-3（`Policy.requires_attestation`）移出本片 → M6**（使用者裁定）—— 它今天沒有讀者也沒有寫者，`AD-PolicyAttestationFlag-1`。⛔ **M1 的 DoD 仍未達成** —— 其餘 13 張表是 slice 10..N ‖ **前一片**（W11，2026-08-14，**MERGED PR #56**，`dcc680f`）—— `02a:215` 的 `StatementOfApplicability`（ISO 27001 **強制產出**）+ 2 個端點，**20 / 35 實體**。⭐ 規格開頭是 `framework_id` 而 **`Framework` 在整份 `02a` 全檔零命中** —— 建 FK 等於先發明一個實體 ⇒ 沿用 W06 對 `Control.framework_refs` 的字串裁決，且**欄位名不叫 `framework_id`**。⭐⭐ **`AD-UniqueKeyOracle-1` 第 2 個資料點**：拿掉 `org_entity_id` 後撞別實體的 clause → 23505、撞沒人的 → **成功**（沒有 parent FK 可掉下去）⇒ 判準可移轉，但「兩個不同 SQLSTATE」的描述太窄，正解是「兩個**可分辨的結果**」。🚩 **本片最重要的產出是一次自我推翻**：N4 零轉紅 → 補測試 → **重跑仍零轉紅** → 逐條放行量到擋住跨實體搬移的是 **SELECT policy**（新列會被它檢查），我 Day 1 寫在 migration 的因果是錯的 → `AD-PolicyClaimUnmeasured-1`（含複驗 `controls` 同一句）。`AD-BorrowedRefusal-1` **第 6 次且判準首次不可滿足**（兩條 policy 運算式相同）。⭐ 反面：**N2 是本專案第一次讓 INSERT `WITH CHECK` 真的轉紅**。⛔ **M1 的 DoD 仍未達成** —— 其餘 15 張表是 slice 9..N ‖ **前一片**（W10，2026-08-13，**MERGED PR #52**，`afa667a`）—— `02a` §3.1 的版本化快照兩張表 + 四個端點，**19 / 35 實體**。⭐⭐ 規格同時給了 `current_version_id`（父表）與 `state`（子表）兩種「哪一版現行」的說法，而它們**互斥** —— 翻 `state` 就是編輯一列 `02a:260` 說永不編輯的資料。只建父表指標，換到版本表**一條 `FOR UPDATE` policy 都沒有**（ADR-0014 缺席即最嚴格），「至多一個現行版」變成**構造上為真**而非靠索引。⛔⭐ **本片最重要的產出是一個被量出來的漏洞**：`@@unique([reportId, versionLabel])` 兩個值都來自 request body，而**唯一索引不受 RLS 管且早於複合 FK 觸發** —— 實測「撞別實體的標籤 → 23505 / 不撞 → 23503」，可一次一猜列舉別人的版本史。修法是把 `org_entity_id` 放進鍵（對合法列完全冗餘）→ `AD-UniqueKeyOracle-1`（P0 候選，值得一條 detector）。⭐ promote 移進 DB 的 `AFTER INSERT` trigger，因為 `runScoped` 讓每個 operation 各自成一個交易；副作用是介面**更窄**。🚩 元驗證 **6/6**，N1a 證明缺席的 policy 自己撐得住、N4 零轉紅暴露 INSERT policy 零覆蓋（`AD-BorrowedRefusal-1` 第 5 次），而補的測試第一版被 `RETURNING` 遮蔽 —— **一條已記錄的陷阱再次被踩，抓到它的是重跑中性化**。⛔ **M1 的 DoD 仍未達成** —— 其餘 16 張表是 slice 8..N ‖ **前一片**（W09，2026-08-13，**MERGED PR #50**，`6446099`）—— `05` §Shared assessment engine 的三張表 + 六個端點，**17 / 35 實體**（分子 +3、**分母 −1**：使用者裁決 `Assessment (RCSA)` 是用例不是表，`02a:34` 改註記不刪列，分母由 `check_entity_index.py` 導出）。⭐ `05:39` 明文要求這個引擎「build **once** rather than three times」，而 W07 的 `ControlTest` 已經開始了它警告的那件事。⭐⭐ **`template_version` 逼出一個三選一**：呼叫端傳（是宣稱不是快照）· 開父表 delegate（為一個整數拆掉三個 phase 的 oracle 防線）· **DB 在 `BEFORE INSERT` 填**（選它，介面維持窄且欄位真的是規格說的意思）。而那個 trigger 差一點自己開 oracle —— `COALESCE(...,0)` 不 RAISE 才讓兩種不可達都收斂到 23503。⭐ **`evidence` 首次回頭補複合錨點**：前三次父子表都同 phase 出生，「父表給得起但還沒有」從未被問過。⭐ **本 schema 第一個跨欄位約束**（SoD CHECK，四方向實測，UPDATE 免費涵蓋）。🚩 元驗證 **6/6 方向全中**，含兩個反直覺預測。⛔ **M1 的 DoD 仍未達成** —— 其餘 18 張表是 slice 7..N ‖ **前一片**（W08，2026-08-13，**MERGED PR #47**，`74d8d56`）—— `Issue` + `Action`（CAPA）+ 兩組端點，**14 / 36 實體**（`check_entity_index.py` 機械導出）。⭐⭐ **W07 的 D1 判準第一次導出「另一個」答案** —— 它說 trigger 是父表**結構上**給不起錨點時才用的，而在此之前每個父表都給不起；`issues` 沒有 M7 連結表的約束，所以 `actions` 走**複合 FK**。**N1 是結論**：移掉那把鑰匙，跨實體引用**插入成功**，恰好 3 個測試轉紅、其餘 8 個不受影響。順帶量到 **FK 免費涵蓋 UPDATE**。⭐ `AD-BorrowedRefusal-1` **第 4 次在寫測試時就被設計掉**（前三次都是事後抓到）。⛔ **M1 的 DoD 仍未達成** —— 其餘 22 張表是 slice 6..N ‖ **前一片**（W07，2026-08-12，**MERGED PR #44**，`19bc4f7`）—— `ControlTest` + `Evidence` + 兩組端點，**12 / 36 實體**（W08 起真的機械導出：`check_entity_index.py`，`run_all` 7/7 —— ⚠️ **分母也是手寫的**，實為 36 非 35，差在 foundation services 節）。⭐ 第一次遇到**複合 FK 結構上不可用**的子表（`controls` 明文拒絕錨點；`evidence.linked_id` 多型無 FK）。量測答案：**RI 檢查繞過 RLS**，「指向看不到的父列」INSERT **成功** —— 與「不存在 → 23503」合起來是**存在性 oracle**，發生在資料庫層。機制由量測導出：`BEFORE INSERT OR UPDATE` + `SECURITY INVOKER` trigger，⭐⭐ **關掉 oracle 的是執行順序不是 trigger 本身**。元驗證 **8/8 全紅**（N2/N4 修法前為 **0** → `AD-BorrowedRefusal-1` 第 3 次，**結構性解法門檻成立**）。⛔ **M1 的 DoD 仍未達成** —— 其餘 23 張表是 slice 5..N；⛔ `AD-RiskBand-1` 仍必須在 M8 之前拍板 ‖ **前一片**（W06，**MERGED PR #41**，`3a3606b`）—— `Control` + 三個寫入端點 + **ADR-0014**（範疇可以是**列**的屬性；三條 per-command policy，無 `FOR DELETE`）。⭐ **W05 兩條新條款的裁決：條款 1 夠用 / 條款 2 需再加** —— 「繞開發號的直接寫入測試」被實測推翻：Prisma `create()` 的 `RETURNING` 讓 SELECT policy 先擋，所以它測的是**讀**的 policy。新版條款要求該寫入**不得產生 `RETURNING`**，且驗收是「中性化 `WITH CHECK` 後它會紅」。**W04 七不變式第二次負載：可複製 6 / 需補充 1**（權限檢查在 RLS 之前）。⚠️ **M1 的 DoD 仍未達成** —— 35 個實體裡建了 **8** 個，其餘 27 張表是 slice 4..N；⛔ **`AD-RiskBand-1` 必須在 M8 之前拍板**（儀表板數的是分帶不是分數）| [`07:32`](../02-architecture/07-wave1-build-plan.md) · [W06 retro §US-6](./W06-m1-control-and-asset-endpoints/retrospective.md) · [W06 design note](../02-architecture/design-notes/W06-row-level-scope.md) |
| 4b | **OQ-4 spike → ADR-0003** —— 稽核軌跡的 hash chain 落點 | ✅ | — | W12（2026-08-14，**MERGED PR #58**，`ea58fdb`）—— [`ADR-0003`](../14-adr/0003-audit-trail-hash-chain.md)：**A（逐列鏈，`BEFORE INSERT` trigger 在 DB 內算）+ 應用層攔截點**，經 `contracts/audit-hook.ts` 反轉（邊界矩陣**兩個方向都禁止**直接呼叫）。⭐⭐ **決定不是靠成本** —— 序列下 A 與 B **量不出差別**（兩次順序翻轉、差距落在 control drift 內），併發下 A 是 B 的 **1.63 / 1.59** 倍**而仍然選 A**：分勝負的是斷點定位（A 指到那一列、B 只指到那一段，已寫成測試）與誰算 hash。⛔ **plan 列為兩大維度之一的「驗證成本」量到沒有訊號**（B/A 0.84–1.20，10k 時共用 fetch 壓過 walk）—— 那反而移除了 B 被預期的優勢，也是 C（混合）被否決的理由。⭐ **本條的存在本身是一條教訓**：`14-adr/README.md:106` 的延後理由**可檢查而且早就不成立**，卻沒有任何東西在看 → `AD-DeferralUnwatched-1` |
| 4c | **接上每一條可達寫入路徑的稽核** —— ⛔ **不是「其餘 20 張」** —— W13 Day 0 枚舉推翻了這個數字 | ✅ | — | W13（2026-08-15，**MERGED PR #61**，`91bd789`）—— `AUDITED_MODELS` **1 → 15**。⛔ **20 是錯的**：21 張業務表扣掉已接的 1、**5 個今天沒有 repository 寫入路徑的**（`OrgEntity`/`User`/`ExtensionField`/`Threat`/`Vulnerability`，加進清單等於加一個不會被觸發的名字 = AP-3）、以及**刻意不接的 `RefCodeCounter`** ⇒ 待接 **14**。⭐ 本片最重要的產出是一條**漂移守衛**：從 `core-model` 原始碼導出寫入面並與清單雙向比對 ⇒ 「下一張表忘了接」會讓測試紅，而不是安靜地擴大敞口 —— **R4 十個 phase 的失效模式自此有機械守門**。⭐⭐ **plan 的做法在寫第一條測試之前被實驗推翻**（module-local 圖裡稽核是關的，`before=9 after=9`）。⭐ **N2 驗收核心完全命中**：只移除 `Issue` → 恰好 2 紅、其餘 14 條未動。⛔ **覆蓋率要連著限定讀** —— 全 codebase 零個 `client.*.update`/`.delete`，15 個寫入全是 create ⇒ 「15 / 21」是「每個有寫入路徑的模型其 create 被稽核」而非「所有狀態變更類型」（`AD-AuditWriteOpsUntested-1`）。⚠️ 原備註保留於下 —— 它記的是本項存在的理由：⛔ **`AD-AuditCoverageOneTable-1`（🔴 P0）—— 它擋著 M1 的 DoD**：`07` §Security gate 寫「no milestone is done until **every state change is audited**」，覆蓋 **1 / 21** ⇒ M1 從「不可達」變成「**可達但未達**」。⚠️ **不是純機械工作** —— 每張表都要確認三個已知限制對它可接受：`before` 永遠 NULL、`after` 是**請求的 payload** 不是儲存後的列、`resource_id` 對 create 不可得（靠 `ref_code` 頂替，那是慣例不是保證）。⛔ **本列存在的理由**：R4 的敞口逐 phase 擴大了 10 個 phase 而**沒有任何 gate 會叫**，把同一個形狀留在備註欄就是讓它再發生一次（`AD-5`）| [`BACKLOG.md`](./BACKLOG.md) |
| 4d | ⭐ **`AD-UniqueKeyOracle-1`（🔴 P0）—— 唯一鍵當存在性 oracle 的判準 + 回頭檢查** | ✅ | — | **W16 Day 0 執行**（2026-08-16）。⭐ **本列自己的警語成立了**：它寫「進了 ROADMAP 不等於它會被做；必須在下一個 phase 的 `checklist.md` 上有一個 `[ ]`」—— W16 checklist 的 Day-0 有一格具名的 `[ ]`（`D-oracle-criterion`），已勾。⚠️ **執行時判準被我自己寫窄了一次**：checklist 原文只說掃「每一個 `@@unique`」，而單欄 `@unique` 與 migration 裡的 `CREATE UNIQUE INDEX`（含 partial）**同樣是唯一索引**。改為三條獨立路徑後實掃 **10 + 22 + 34**。**結論：今天零個可達的 oracle**，但安全性來自 `GRANT SELECT` 與「沒有 repository」，**不是**來自鍵的設計 —— Category D 有 6 個形狀上是 oracle 的既有鍵（`org_entities(code)` · `users(oidc_subject)` · `threats(name)` · `vulnerabilities(name)` · `jurisdictions(code)` · `extension_fields_global_key`），**M6 補 repository 的那一片它們會同時變成可達**，與 `AD-W15ConstraintSurfaceUntested-1` 的解封條件同一天。⛔ **AD 本身不關閉** —— 它是每張新表都要重跑的**判準**，不是一件會做完的事；依本檔 §刻意不進排序的 P0 的判準，它之後屬於那一節而非順位。原備註保留於下 —— | ⛔ **本列由審計 #6 的 `AD-21` 補上** —— 在此之前它是一條 🔴 P0 而**在本檔沒有任何落點**，只出現在第 4 項的 W10 歷史敘述裡被稱為「P0 候選」。⚠️ 它已經**不是候選**：`BACKLOG.md` §Open 記為 P0，且有 **2 個實測資料點**（W10 `rm_report_versions`：撞別實體的標籤 → 23505 / 不撞 → 23503；W11 SoA：撞別實體 → 23505 / 撞沒人的 → **成功**）⇒ 判準已收斂為「**兩個可分辨的結果**」而非「兩個不同 SQLSTATE」。⭐ **為什麼落在 Day 0 而不是獨立 phase**：唯一索引**不受 RLS 管且早於複合 FK 觸發**，所以每一張帶「呼叫端可選的唯一 tuple」的新表都會複製同一個形狀 —— **在建之前定判準比建完再回頭檢查便宜**，而 slice 10 還有 13 張表要建。⛔⭐ **本列自己帶著一條已證實的限制**：`AD-CountBeforeLastEdit-1` 量到「**ROADMAP 的列不是 checklist 的列**」—— `check_backlog_counts.py` 排在 W09 / W10 的本表列上，**兩次 closeout 都沒有東西發現它沒被做**，直到改為獨立 CH 才交付。⇒ **本列進了 ROADMAP 不等於它會被做**；它必須在下一個 phase 的 `checklist.md` 上有一個 `[ ]`，否則本列只是第三次重演同一個失效 | [`BACKLOG.md`](./BACKLOG.md) · W10 / W11 retro |
| 5 | `AD-ScopedClientDI-1` —— 範疇化 client 如何抵達 `core-model` | ✅ | — | W03（2026-08-10）—— ⚠️ **結論與原提議不同**：token 不建（零消費者），型別是 `core-model` 自宣告的結構型別，實例走方法參數 |
| 6 | `AD-ScopeConcurrency-1` —— 並行範疇汙染的常駐測試 | ✅ | — | W03（2026-08-10）—— 40 次**交錯**查詢，逐列斷言 |
| 7 | `AD-SecDoDAutomation-1` **實作** | ⬜ | 第 2 項的分類結果 —— 跳過分類會建出對人工項目無效的假 gate | [`BACKLOG.md`](./BACKLOG.md) |
| 8 | **拍板：編號引用的「預留 vs 失效」判準** —— `AD-StaleRecordRef-1` 的 detector 前置 | ⬜ | — | [`BACKLOG.md`](./BACKLOG.md) —— 前向引用預留編號是**合法的**（`AD-ChNumber-1`），detector 不能單純要求「解析得到」|
| 9 | **`AD-DesignNoteAnchor-1` 的 detector** —— `file:line` 內容比對 + `git merge-base --is-ancestor <sha> main` | 🟡 | — | ⭐⭐ **2026-08-16 CH-036 交付了一半，而這一格刻意不寫 ✅** —— 本列標題有兩個交付物：`--is-ancestor` 的 SHA 檢查**已出貨**（`check_sha_anchors.py`，`run_all` 9/9，47 處既有壞錨點全部重指，`ci.yml` gates 改 `fetch-depth: 0`）；**`file:line` 內容比對仍不存在** —— detector 掃的是 hex token，對「檔案還在但那一行已經不是它宣稱的東西」完全看不見，而那正是本 AD 三種形態裡的**第 1 種**、也是它 W05 開立時的原始症狀。標成 ✅ 會讓剩下那一半消失在一份沒有人會回頭讀的已完成列裡 —— 那就是本列自己記錄的失效形狀又演一次。⭐ 出貨過程推翻了本列標題的一個字：判準不是 `--is-ancestor <sha> **main**` 而是 **`origin/main` 或當前 HEAD** —— 只問 main 會讓每個 closeout PR 自己紅（closeout 文件寫在 merge 之前）。⛔ 而 W05 提過的 `cat-file -e` 當天就被實測推翻（在它要抓的 bug 上是綠的）。原備註保留於下 —— ⭐ **本列存在的理由就是這條 AD 自己的失效形狀**：上一次的再延寫成「slice 3 處理」放在 BACKLOG **備註欄**，而 W06 就是 slice 3，收尾時沒有人回頭看（`AD-5`：有解封條件的項目必須出現在一份**會被讀**的清單上）。使用者 2026-08-12 **明確再延**，這次落在主線上。**現成驗收命中**：`02a:413` 被 ADR-0014（3 處）· `schema.prisma:894` · W06 design note `:64` 引用，實際內容在 `:415`；另有 W01 兩個**不在 `main` 上**的 SHA。⚠️ W07 已交付**上游的**便宜解法（`AD-MdAnchorLineShift-1`：被錨定的文件編輯不得改變行數），但它管不了刻意的結構性改寫 → detector 仍需要。⭐ **W07 post-merge 量到一條設計約束**：PR #44 又是 rebase merge，五個 SHA 全被改寫、14 處引用已改指 main 側；但 closeout 文件裡**刻意保留了 3 處已死的 SHA**，因為那幾句話的內容就是「這些 SHA 不在 main 上了」。**detector 必須分辨「引用」與「提及」** —— 單純數 SHA 出現次數會把正確的說明判成漂移。⭐ 另一條：**author date 不受 rebase 影響**（逐一比對過），所以依賴 commit 時間戳的 calibration 推導不需要跟著改。⭐⭐ **W10 提供了本條最尖銳的一個實例**：PR #52（又是 rebase merge）改寫的 SHA 裡，有一個的**唯一作用就是可查證性** —— closeout 引用 `8179319` 來證明「六個中性化的預期方向寫在執行之前」。SHA 一改寫，那句證據就指向一個 main 上不存在的物件，**而所有 gate 仍然全綠**。已改指 `8a9cce6` 並補上 author date（07:54:16Z，兩側相同）。⇒ detector 的價值判準因此更清楚：它要抓的不是「SHA 過期」，是**「一句話的證明力靜默消失」**。⛔⭐ **CH-027（PR #54）提供了最強的一個實例：那份 progress 先寫下這個教訓，然後自己踩了它** —— 它引用 `56822e4` 證明六個中性化的預測寫在執行之前，rebase 改寫成 `7c8d46f` 後該引用在 main 上指向不存在的物件，**而 PR 描述與 commit message 裡的舊值已發布、永遠改不了**。⇒ 這條 AD 的必要性不再需要論證：**「記得回頭改」在一份剛寫完「記得回頭改」的文件上失效了**。⭐ 連帶第 2 次量到 **author date 逐秒不變**（`09:31:41+08:00`），穩定錨點是它而不是 SHA。⛔⭐ **W14（PR #63）是連續第 6 次 rebase merge，九個 SHA 全改寫、重指 27 處 / 7 個檔** —— 其中 `c10be0c → 50ea93a`（「預測寫在執行之前」）在文件裡有 **7 處引用**，是九個裡最多的，因為它的**全部價值就是可查證性**。⭐⭐ **而 W14 給了這條 AD 一個它一直缺的正面論據**：author date **第 4 次**確認逐秒不變（9/9，含 subject），而本 phase 的 calibration **完全由 author date 導出** ⇒ **數字撐過了 rebase，即使 SHA 沒有**。⇒ detector 的設計結論收斂：**凡是需要跨 merge 存活的引用，錨點應該是 author date + subject，SHA 只是索引**；SHA 引用仍要重指，但那是為了可點擊，不是為了證明力。⚠️ 連帶第 6 次確認「PR 描述與 commit message 裡的舊值已發布、永遠改不了」—— PR #63 的內文引用了 `c10be0c`，該值現在指向 main 上不存在的物件，**且我刻意不編輯它**（編輯已發布的 PR 內文會讓「當時寫了什麼」也不可考） |
| 10 | **`AD-CountBeforeLastEdit-1` 的機械導出** —— `BACKLOG.md` §Open 的總數與三個優先度計數改由腳本重算並比對，不符即 fail | ✅ | **CH-027**（2026-08-14）—— ⛔ **原寫「排 W09 Day 0（不另開 CH）」，而那個落點失效了兩次**（W09、W10 各一次）。使用者 2026-08-14 改判獨立 CH。**理由留在這裡而不是靜靜改掉**：先例 `check_entity_index.py` 之所以成功，是因為它**是 W08 的 deliverable、進了 W08 的 checklist**，有一個 `[ ]` 盯著；本條在 W09 / W10 只存在於**本表的一列**，而 **ROADMAP 的列不是 checklist 的列** —— 沒有任何會被逐項勾選的清單提到它，兩次 closeout 都沒有東西發現它沒被做（`AD-5` 再現）。⇒ **「複製成功的先例」複製到的必須是那個先例真正生效的機制，不是它的表面形狀** | ⭐ **完全複製已成功的先例**：`AD-EntityCountDerivation-1` / `AD-EntityIndexIncomplete-1` 是同一個形狀（手寫計數器），排進 W08 Day 0 由 `check_entity_index.py` 一次關掉，**沒有吃掉 `CH-017` 的治理配額**。⚠️ **今天只做了一半** —— 數字改成「先跑指令再抄」，但沒有任何東西會在不符時 fail，而本條的證據就是「靠紀律重跑」會在最警覺時失效（W08 closeout 認真做了兩種數法對照，然後又加了一條而沒重數）|

> **W02 已經提前交付了 M2 的核心**（RLS 在資料庫層強制範疇，ADR-0004）。
> M2 剩下的是組織階層與管轄區標記，不在上表 —— 它跟著 M1 的實體一起長。

---

## ⏰ 有死線的（不受「押後」影響）

<!-- 押後一條主線是合理的，但死線不會等人。任何有外部時間限制的項目放這裡，
     即使它在主線上排得很後面。 -->

| 死線 | 項目 | 不做的後果 | 細節 |
|---|---|---|---|
| ~~**2026-09-07**~~ | ~~`AD-TrivyExempt-1`~~ ✅ **已關閉 2026-08-15（CH-032）** —— runtime base 移到 `nodejs22-debian13`，六條 `libssl3` 豁免的標的不再存在於出貨映像中（trivy 實測 **0** HIGH/CRITICAL，豁免清單為空） | ~~到期即所有 PR 停止可 merge~~ | [`CH-032`](../03-implementation/changes/CH-032-trivy-base-image-refresh.md) |

> ⭐ **本表現在是空的，而這是本專案第一次沒有任何有日期的死線。**
> ⛔ **不要刪掉上面那一列** —— 「表是空的」與「從來沒有東西進過這張表」在三個月後看起來一模一樣。
>
> ⚠️ **CH-032 留下一條給下一個寫豁免的人的教訓**（完整敘述在 `.trivyignore.yaml` 的 header）：
> 一個解除條件是「**等上游重建**」的豁免**自己沒有退路**。debian12 線在到期前七天仍未重建，
> 而到期當天唯一會發生的事，是整個 repo 停止可 merge。
> ⇒ **再寫這種豁免時，要配一條不需要上游配合的出路。**

---

## ⏸ 等外部（不佔主線順位）

| 項目 | 等什麼 | 誰能解 | 細節 |
|---|---|---|---|
| `AD-DAST-1` | 一條能碰到 staging 的路徑 —— GitHub 託管 runner 在公網，接不到只存在私有 VNet 的 staging | infra team（RIT）提供 VNet 內 self-hosted runner，**或**使用者拍板等價路徑 | [`BACKLOG.md`](./BACKLOG.md) |
| `AD-IaCEvidence-1` | infra team 的 IaC 掃描證據（本專案沒有 IaC 可掃，義務已換手未消失）| RIT —— PAR 第 7 點已索取 | [`BACKLOG.md`](./BACKLOG.md) |

> 這兩條**都影響 M0 DoD**，且**都不是本專案單方面能關掉的**。
> ⛔ M0 收尾時不得逕行打勾或標 N/A —— 要嘛引用對方的證據，要嘛明記「由內部第三方營運」。

---

## 押後到某個里程碑之後

<!-- 明確押後的東西寫在這裡，而不是從清單上消失。
     「消失」跟「刻意押後」在三個月後看起來一模一樣。 -->

| 項目 | 押到何時 | 為什麼可以等 |
|---|---|---|
| `AD-Mockup-2` · `AD-Mockup-3`（🔴 P0）| **M8 移植前** | 兩者阻斷的是旗艦儀表板的資料結構（以國家為鍵，容不下 13 OpCo），**不阻斷 M1–M7**。在沒有 runtime 的情況下討論 UI 落差，違反「文檔成長跟隨已驗證的 runtime」|
| `AD-RiskForm-1`（🔴 P0）| **M7 前** | 風險表單實作的是另一套方法論 —— 要在 Risk register 真的開始建時才有標的可對 |
| `AD-Incident-1`（🔴 P0）| **Wave 2** | 已確認參數 #5：Wave 1 不提前拉合規／事件模組。缺的 restricted block 連同它的 CISO/HR 權限隔離一起走 |

### 刻意不進排序的 P0（**逐條列名，不寫數字**）

> ⛔ **本節原文是「第 5 條 P0 刻意不在本表」** —— 那是一個手寫計數器，
> 而審計 #6（`AD-21`）量到真值是 **7**，且**另有兩條 P0 在本表四張表上完全沒有落點**。
> ⇒ 依審計建議改為**逐條列名**：不寫數字的清單漂不動，寫數字的清單每次 P0 增減都會錯一次
> （這是本專案第 4 個被發現的手寫計數器 —— 前三個：實體數 `AD-12` · 稽核表數 `AD-18` / `AD-23`）。
>
> **判準**：一條 P0 若**不是一件會做完的事**，它就不該有順位 —— 排進順序會製造
> 「做完就關掉」的錯覺。⚠️ 但它**必須列名在這裡**，否則「不在表上」與「被漏掉」看起來一模一樣。

| P0 | 為什麼不排順序 |
|---|---|
| `AD-NegativeGate-1` | 每個 phase 都在消費的**紀律**，不是待辦。⚠️ **實例計數不寫在這裡** —— 唯一權威是 [`BACKLOG.md`](./BACKLOG.md) 的該列（審計 `AD-8`：同一個手動計數器寫在三處，W03 交付第 6 個時三處都沒跟上）|
| `AD-NarrowPatternWideClaim-1` | 同上形狀 —— **「拿窄 pattern 的命中數回答需要讀內容的問題」是一個每次都可能再犯的動作**，不是一件會做完的事。⭐ 審計 #6 自己就再犯了一次（臨時解析器用固定欄位索引，撞上 §Open 的裸 pipe），**而那個坑就寫在它正在解析的那份檔案裡** ⇒ 這條的正確位置是紀律不是順位 |

> 其餘 P0（`AD-Mockup-2` · `AD-Mockup-3` · `AD-RiskForm-1` · `AD-Incident-1`）在 §押後表；
> `AD-UniqueKeyOracle-1` 在主線第 **4d** 項。**§Open 的每一條 P0 都應該能在本檔找到落點** ——
> 找不到的那一條，就是下一次審計的 `AD-21`。
