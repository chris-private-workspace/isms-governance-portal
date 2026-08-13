# Phase W10 Progress — RM report as an immutable versioned snapshot

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## Day 0 — 2026-08-13 — Plan-vs-Repo Verify

### Today's Accomplishments

- PR #51 merged 驗證（`gh pr view 51` → `MERGED`, `d6300ce`, 06:59:39Z, `laitim2001`）
- main 同步 `6446099..d6300ce`；本機 `chore/w09-status-flip` 刪除
- 分支 `feature/W10-rm-report-snapshot` 開於 `d6300ce`
- 三-prong verify 完成，**6 條 drift finding**（其中 1 條把一個核心假設從推論變成量測）

### Drift findings

| ID | Finding | Implication |
|----|---------|-------------|
| **D1** | plan §3.0/§4 寫「EDIT `ref-code.ts` +2 前綴」，但 `ref-code.ts` **沒有前綴登記表**，而且 `:65-69` 的 docstring **明文拒絕**建一個（「Rather than invent a registry here and make it look authoritative, each repository names its own prefix and the ambiguity stays visible」）。實際前綴是各 repository 的 module 常數：`ACTN` `AGRP` `AST` `ASIN` `ASRP` `ASTM` `CTST` `CTRL` `EVID` `ISSU` `POL` `RISK` | `ref-code.ts` 改為 **UNTOUCHED**；新前綴宣告在新的 repository 檔內。→ plan §8 新增一列 |
| **D2** | plan §4 列了 **2 個** repository 檔。repo 裡兩種先例都有：`asset.repository.ts` 用 `GROUP_*`/`ASSET_*` 常數在**一個檔**處理 AssetGroup+Asset；W08 的 issue/action 是**兩個檔** | 發版是**跨兩張表的單一交易**（insert 版本 → repoint 父表）。拆兩個檔會讓其中一個伸手進另一個的表，或把交易推給 controller。→ 採 `asset.repository.ts` 先例，**一個檔**。plan §4 減 2 個 NEW 檔 |
| **D3** ⭐ | **D-circular-fk 由推論變成量測**。Prisma 7 `validate` 接受把父表自己的 `id` 當 FK 欄位之一；`migrate diff` 產出的 DDL 正確（兩條 FK 都在兩張 `CREATE TABLE` 之後才 `ALTER TABLE ADD CONSTRAINT`）；**runtime probe 四項全中**：`current_version_id IS NULL` 的報告插得進去（MATCH SIMPLE），第一版插得進去，promote 成功，**報告 2 指向報告 1 的版本被 23503 拒絕**（DETAIL 顯示它在檢查 `(current_version_id, id)` 這一對） | plan §0 的 C 方案**照設計可建**，§8 前兩列風險關閉。probe 全程在 `BEGIN`/`ROLLBACK` 內，dev DB 無殘留 |
| **D4** | 全部 migration 的 GRANT **都是表級**，無 column-level 先例。另外 `threats` / `vulnerabilities` / `org_entities` / `users` 是 `GRANT SELECT` only | `SELECT, INSERT`（無 UPDATE）是**新的組合但不是新的形狀** —— 「少給一個動詞」已有先例。C 方案不需引入新 GRANT 機制 ✅ |
| **D5** | `@@unique([a, b])` 確實產生真的唯一索引，命名 `<table>_<cols>_key`（實例：`asset_groups_id_org_entity_id_key`；probe 產出 `rm_report_versions_id_report_id_key`） | 複合 FK 需要的唯一索引由 schema 宣告即得，migration 不必手寫 ✅ |
| **D6** | policy 命名慣例是 `<table>_read` / `<table>_insert` / `<table>_update`，每張表三條（`20260812211801_issue_and_action:124-146`） | `rm_report_versions` 只建 `_read` / `_insert` **兩條**，`_update` 的缺席會在 migration 裡一眼看得出來 ✅ |

**Detector 名稱解析**：`check_entity_index.py:180` 用 `{model, table, ALIASES.get(model)}` 比對索引。
`RiskManagementReport` / `RMReportVersion` 在 `02a:40` 就是這兩個名字 → **不需要加 ALIAS**。

### Baselines（**實測，非引用** —— 全部與 W09 closeout 記錄相符）

| Gate | 實測 |
|---|---|
| api unit | **315 / 31 suites** |
| api int | **145 / 11 suites** |
| web | **10 / 1** |
| lint | **0 / 0**（api + web）|
| type-check | clean ×2 |
| build | clean ×2 |
| `run_all.py` | **7 / 7** |
| `check_entity_index` | **17 / 35** |

### Go / No-Go

範圍變動：16 個 file-list 條目中 **2 個**改變（D1 → `ref-code.ts` 轉 UNTOUCHED；
D2 → 減 1 個 repository 檔 + 1 個 spec 檔）= **~12.5%**，**≤ 20% → 繼續 Day 1**，
兩條 finding 記入 plan §8 Risks，§4 同步標註 drift ID 而**不刪除原列**。

### Remaining for Next Day

- Day 1：schema 兩張 model + migration（policy 兩條不是三條）+ 前綴常數

### Notes

- ⭐ **D3 是本次 Day 0 的全部價值**：C 方案有兩個「應該可以」的假設（Prisma 表達得出來、
  MATCH SIMPLE 讓 NULL 指標通過）。兩者都便宜到可以量，而任一為假都會讓整個方案在 Day 1 崩掉。
  ⛔ 這正是 W09 retro 說「實測而非引用」的那件事，只是這次做在假設**還沒寫進 code** 之前。

---

## Day 1 — 2026-08-13 — Schema 與 migration

### Today's Accomplishments

- `schema.prisma` +2 model（20 models），`OrgEntity` / `User` 兩處反向關係
- `20260813071857_rm_report_snapshot` 建立並套用
- **實測而非相信註解** —— 三個查詢確認本片的核心主張：

| 量測 | 結果 |
|---|---|
| `pg_policies` where tablename like `rm\_%` | **5 條**：`rm_reports` 3（SELECT/INSERT/UPDATE）· `rm_report_versions` **2**（SELECT/INSERT）—— **無 UPDATE** |
| `pg_class.relforcerowsecurity` | `t` / `t`（兩張表皆 FORCE） |
| `role_table_grants` for `isms_app` | `rm_report_versions` 僅 SELECT + INSERT；兩張表皆無 DELETE |
| `check_entity_index` | **17 → 19 / 35**（Day-0 預測「不需加 ALIAS」成立） |

### Notes

- ⭐ **migration 註解記下一件 Day 0 沒問到的事**：兩條複合 FK **合起來**才給出實體保證。
  子表 FK 強迫版本的 `org_entity_id` 等於報告的；父表 FK 強迫指標指向**本報告的**版本。
  兩者相乘，「指向別實體的版本」不需要第三條約束就不可達。
  而且它**關掉**而非打開一個 oracle：W07 量到 RI 檢查繞過 RLS，所以呼叫端**可以**用猜的 UUID
  去試這條 FK —— 但「別份報告的版本」與「根本不存在」都回同一個 23503，因為 `report_id`
  被釘在呼叫端自己的列上。⭐ 與 W09 `COALESCE` 同形：守衛不可以變成那個告訴你答案的東西。
- ⚠️ **順路發現，未當場處理**（節流閘）：`schema.prisma` 的 Modification History **停在 W07** ——
  W08 / W09 兩片都沒更新，且 `Purpose` 的「13 models」在我動手前就已經是 18。
  我只修正了**我這次改動讓它變得更錯的部分**（count → 20 · Scope → W10 · 加 W10 那一行），
  缺的 W08 / W09 兩行**記進 BACKLOG，不自行回填** —— 兩片連續漏同一件事是值得記錄的 pattern，
  不是值得靜靜補掉的瑕疵。
- ⛔ **本人違反 tool-discipline**：用 `cat >> ... <<'SQL'` heredoc 附加 migration 的手寫段，
  正確工具是 **Edit**。這是 W09 已記錄過的同一個違規（當時是用 heredoc 寫 schema）。
  內容經 Read 覆驗無誤，但**規則的重點是「有專用工具就用專用工具」，不是「結果對不對」**。
  → 同一形狀第 2 次，記入 retro。

### Remaining for Next Day

- Day 2：repository（**一個檔**，D2）+ 五個端點 + 整合測試

---

## Day 2 — 2026-08-13 — Repository、端點、整合測試

### Today's Accomplishments

- `rm-report.repository.ts`（一個檔兩張表）+ spec · `modules/rm-report/` 四檔 · `app.module.ts` 註冊
- 兩個**追加的 migration**，兩個都不在 plan 裡，兩個都由量測逼出來
- Gate 全綠：unit **351/33**（315/31）· int **159/12**（145/11）· web 10/1 ·
  coverage 92.01/90.81/97.4/93.44 · `run_all` 7/7 · entity-index **19/35** · `lint:negative` PASS(49)

### Drift findings（承 Day 0 的 D1-D6）

| ID | Finding | Implication |
|----|---------|-------------|
| **D7** ⭐ | plan §3.3 寫「發版 = insert 版本 + repoint 父表，**同一交易**」。**架構上做不到**：`runScoped`（`scoped-prisma.provider.ts:83`）把每個 operation 各自包進自己的 transaction，因為 `set_config` 必須 transaction-local。W04 已裁決過唯一的應用層修法不可用（`policy.repository.ts:111`：穿 `$transaction` 會加寬每個 repository 的介面）。⚠️ 而這次的代價不是裝飾性的 —— 插入成功、promote 失敗的版本**永遠無法補救**，因為唯一標籤會拒絕重試 | 走 W09 `template_version` 的同一條路：**DB 在 `AFTER INSERT` trigger 裡 promote**（`20260813152548_promote_on_issue`）。副作用是介面**更窄**了 —— `ScopedRmReportVersionClient` 連 `rmReport.update` 都不需要。代價明記：發版永遠使該版成為現行版，回填歷史版本必須依時序 |
| **D8** | plan §3.3 列了 5 個端點含 `GET /rm-reports/:id`。**全 repo 12 個 controller 沒有任何 GET-by-id 先例** | 交付 **4 個**（list + create × 2 表），照既有風格。CLAUDE.md「配合既有風格即使你會做不同」|
| **D9** | plan §3.3 說版本列表回傳導出的 `isCurrent` | **做不到，而且不該做**：`isCurrent` 是**報告**的事實（`currentVersionId`），而版本 repository 拿不到父表 delegate。導出一份放在指標旁邊，正是 `02a:257` 的 `state` 被砍掉的那個第二表述 |
| **D10** ⛔⭐ | **唯一索引是一個 existence oracle**。`@@unique([reportId, versionLabel])` 的兩個值都來自 request body，而唯一索引**不受 RLS 管**（W07 對 RI 檢查量到的同一性質）且**比複合 FK 先觸發**。實測：A 寫入 B 的報告用 B **已有的**標籤 → **23505**（DETAIL 印出 B 的 report id 與標籤）；用 B **沒有的**標籤 → **23503**。差異就是 oracle | `20260813153153_version_label_key_scoped` 把 `org_entity_id` 放進唯一鍵。**重測**：兩者現在都是 23503；對照組（B 對自己的報告用重複標籤）仍正確回 23505。唯一性未被削弱 —— 複合 FK 已強迫版本的 `org_entity_id` 等於報告的 |
| **D11** ⛔⭐ | **我寫在 migration 註解裡的因果是錯的**。原文說 GRANT 是縱深、缺席的 policy 是「執行的那一半」。int 測試 6 附了預測（「UPDATE 命中 0 列，不報錯」）→ **失敗**，實際是 **42501 permission denied**：權限在任何 policy 之前檢查，所以**今天擋住寫入的是 GRANT** | 註解已更正為量到的順序。「缺席的 policy 自己撐得住」現在寫成**預測**，由 Day 3 的 **N1a**（只加 GRANT UPDATE）驗證。→ `AD-BorrowedRefusal-1` **第 5 次**，本次由一個帶預測的失敗測試抓到 |

### Notes

- ⭐ **D10 與 D11 都是「我自己的守衛不是我以為的那個」**，而兩者都在 code 寫完之前／當下被抓到，
  靠的是同一個習慣：**動手前先寫下預期，然後去量**。D10 的預期是「唯一索引應該安全」——
  量了才發現不是；D11 的預期寫進了測試本身 —— 失敗才是有價值的那個結果。
- ⚠️ int spec 的 teardown **無法 retire 版本列**（`retiredAt` 是 UPDATE，而沒有 policy 允許）。
  這不是測試檔的疏漏，是這張表的特性從測試骨架看得見。套件每次重建資料庫，所以可存活。
- ⛔ **無 drive-through**（無 UI）→ 全程 **gate-only verified**，不得暗示可用性。

### Remaining for Next Day

- Day 3：元驗證。N1 因 D11 拆成 **N1a**（只加 GRANT）與 **N1b**（加 GRANT + policy）；
  新增 **N5**（還原唯一鍵為 `(report_id, version_label)`，預期測試 12 轉紅）

---

## Day 3 — 2026-08-13 — 元驗證

### 3.1 預期方向（**寫於執行任何一項中性化之前**，本節與其 commit 早於下方實測）

中性化一律改 **migration 來源**（`AD-NeutraliseRebuiltState-1`）—— int setup 每次重建資料庫，
改 live DB 的手術不算數。基準：`rm-report.int.spec.ts` **14 passed**。

| N | 中性化的東西 | 預期轉紅 | 預期**不動** | 理由 |
|---|---|---|---|---|
| **N1a** | 只加 `GRANT UPDATE ON rm_report_versions`，**保持沒有 `_update` policy** | **測試 6** —— 它斷言錯誤訊息含 `42501`；權限放行後 raw UPDATE 會命中 0 列而**成功**，斷言失敗 | ⚠️ **測試 5 仍綠** —— 它只斷言 `rejects.toThrow()`，而 RLS 濾掉該列時 Prisma 會丟 P2025。**它分不出兩層**。兩個「未變」斷言也仍綠（policy 還在擋） | 若測試 6 轉紅而 rows 仍未變 → **缺席的 policy 自己撐得住**，D11 的預測成立 |
| **N1b** | N1a **再加上** `rm_report_versions_update` policy | **測試 5 + 測試 6 皆紅**，且兩者的「未變」斷言**也**紅（列真的被改掉） | — | 兩層都拿掉才失去不可變性 → 兩層都是承重的 |
| **N2** | 移除 `rm_reports_current_version_id_id_fkey` | **測試 7** —— 指標指向別份報告的版本會成功 | 測試 3 / 4（promote 仍由 trigger 做） | 複合指標鍵是唯一擋住它的東西 |
| **N3** | 移除 `rm_report_versions_report_id_org_entity_id_fkey` | **測試 8 · 12 · 13** —— 三者都靠 23503 | 測試 5 / 6 / 7 / 14 | 沒有這把鍵，跨實體與不存在的 report_id 都插得進去 |
| **N4** | 移除 `rm_report_versions_insert` policy 的 `WITH CHECK` | ⚠️ **預期零轉紅** | **全部 14 個仍綠** | ⭐ `AD-BorrowedRefusal-1` 的檢查點，**事先預測**：repository 先呼叫 `issueRefCode`，而 counter 是 entity-scoped，所以跨實體的 `orgEntityId` 在到達本表之前就被 counter 的 policy 拒絕。若真的零轉紅，代表本表的 INSERT policy **今天沒有任何測試在證明它** |
| **N5** | 唯一鍵還原成 `(report_id, version_label)` | **測試 12** —— 撞標籤會變成 `DuplicateKeyError`，不撞的仍是 `UnknownReferenceError`，兩者不再相同 | 測試 14（自己的報告重複標籤仍是 23505） | D10 的 oracle 回歸測試 |

⛔ **N4 的預期是「不動」，而那不是好消息**。它若成立，本 phase 就交付了一條**沒有任何測試
在證明**的 policy —— 這正是 W05 量到「新表的 RLS 被上游 counter 代勞而零覆蓋」的同一個形狀，
第 5 次。屆時要補的是一個**繞過 `issueRefCode`** 的直接寫入測試，不是把 N4 改成別的東西。
