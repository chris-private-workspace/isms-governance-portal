# Phase W11 Progress

> 每日條目。per-task 時間紀錄住在這裡（checklist 不放估算）。

## Day 0 — 2026-08-14 — Plan-vs-Repo Verify

**Base**: `main` HEAD `f171049`（PR #54 + #55 皆 MERGED，`gh pr view` 逐一驗證）
**Branch**: `feature/W11-soa`（起草時從 `5a676f9`，#55 merge 後 rebase 到 `f171049`）

### Prong 1 — Path verify ✅

plan §4 的 11 個目標逐一確認：3 個 NEW 全部不存在、4 個 EDIT 全部存在。
`CH-028` 未被佔用（最大號 `CH-027-backlog-count-derivation`）。

### Prong 3 — Schema verify ✅

`StatementOfApplicability` / `statements_of_applicability` / `SoaImplementationStatus`
在 `schema.prisma` **零命中**。migration head = `20260813153153_version_label_key_scoped`，
下一個時間戳未被佔用。

### Prong 2 — Content verify（drift findings）

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | ⭐ **`Framework`（大寫）在 `02a` 全檔零命中** —— 不只不在 §0 索引，整份規格**從未定義它是什麼**；只有 `framework_id` 這個欄位名暗示它存在 | 強化裁決 B：要建 `Framework` 得先**發明**它的欄位，那是規格工作不是實作工作 | ✅ 支持 plan |
| **D2** | ⛔ **plan §3.3 的藍本選錯** —— 說「抄 `asset.repository.ts` 的形狀」，而 asset 是**雙表** repository（`AGRP` + `AST` 兩個 prefix 常數） | SoA 是單表 → 改抄 `control.repository.ts` / `issue.repository.ts` | 🟡 小調整 |
| **D3** | ⛔ **prefix 枚舉的第一版不完整**：pattern 寫死常數名 `REF_CODE_PREFIX`，得 **10** 個；改用 `PREFIX = '...'` 得 **14** 個（漏了 `AGRP` `AST` `RMRP` `RMRV`）| 結論不變（`SOA` 無衝突），但**第一版的結論建立在不完整的枚舉上** | 🟡 方法修正 |
| **D4** | **15 個 model 有 `refCode`，只有 14 個 prefix 常數** —— 差額是 `OrgEntity`（scoping spine，ref_code 非 `issueRefCode` 發的）| SoA 走 `issueRefCode` 正常路徑，不是 OrgEntity 那種例外 | ✅ |
| **D5** | W10 的唯一鍵是 `(report_id, **org_entity_id**, version_label)` —— entity 在**中間**，因為前面有 parent id | SoA 無 parent → `org_entity_id` 在**首位**（`multi-tenant-data.md:50`：scope 是每個查詢的第一個 predicate）| ✅ |
| **D6** | policy 形狀確認：GRANT 明列 + `_read`（`FOR SELECT USING`）· `_insert`（`FOR INSERT WITH CHECK`）· `_update`（`FOR UPDATE` **USING + WITH CHECK 都要**），全部用 `app_entity_scope()` | plan §3.2 照抄此形狀 | ✅ |
| **D7** | `Policy.version` 是**單一** int（`schema.prisma:256`）—— `02a` 列的 `version` 與 §1.1 樂觀鎖合併 | plan §3.1 的先例成立 | ✅ |

### 🚩 D8 — 我在 Day 0 之內用不完整的證據下結論**兩次**

1. **prefix 枚舉**（D3）—— 第一次寫死常數名，得 10 個就宣布「`SOA` 無衝突」。
   結論碰巧是對的，**方法是錯的**。
2. **「W10 的表沒有 ref_code」** —— 在 `rm-report.repository.ts` grep `refCode:` 零命中，
   於是推論那兩張表沒有 ref_code。**錯的**：它們都有（`schema.prisma:1533` / `:1609`），
   repository 也確實呼叫 `issueRefCode`（`:132` / `:186`）——
   我的 pattern 要求 `refCode:` 而原始碼寫的是 shorthand `refCode,`。

兩次都是 **`verification-discipline.md` §證據層變體的「零命中但搜錯範圍」**，
而抓到它們的是**交叉檢查**（14 個 prefix vs 15 個帶 refCode 的 model 對不上），不是紀律。

⇒ 這與 CH-027 的 E3/E8 是**同一個形狀，隔一天再現**：
**用一個窄 pattern 的命中數，去回答一個需要讀內容才能回答的問題。**
⛔ 值得記成 AD —— 已在同一週內第 3 次（CH-027 E3 · CH-027 E8 · 本次 D8）。

### 🚩 D9 — 同一形狀第三次，但這次在寫進文件之前就攔下了

第一輪 build 驗證寫成 `npm run build ... | grep ... | tail -6; echo "BUILD_EXIT=$?"`，
拿到 `BUILD_EXIT=0` —— **而那個 `$?` 是 `tail` 的 exit code，不是 npm 的**。
管線裡最後一個命令幾乎永遠成功，所以那個數字**無論 build 成功與否都會是 0**。

⇒ 重跑為 `npm run build ... > <log>; echo "EXIT=$?"`（不經管線）得 **`REAL_BUILD_EXIT=0`**，
build 確實乾淨。結論相同，**但第一次的證據不支持它**。

⭐ 與 D8 的差別值得記下來：D8 的兩次是**事後靠交叉檢查**抓到的，
這一次是**在把數字寫進 progress 之前**自己攔下的。同一形狀第 3 次，第一次被前置攔截。

### D-baselines ✅ 全部與 plan §0 的宣稱相符（0 drift）

| Gate | 實測 | plan 宣稱 |
|---|---|---|
| api unit | **351 / 33 suites** | 351 / 33 ✅ |
| api int | **160 / 12 suites** | 160 / 12 ✅ |
| web | **10 / 1** | 10 / 1 ✅ |
| coverage | **92.01 / 90.81 / 97.4 / 93.44** | 同 ✅ |
| lint | **0** | 0 ✅ |
| type-check | clean ×2 | clean ✅ |
| build | clean ×2（`REAL_BUILD_EXIT=0`，見 D9）| clean ✅ |
| `run_all` | **8 / 8** | 8/8 ✅ |
| `check_entity_index` | **19 / 35** | 19/35 ✅ |

環境：PostgreSQL `isms-postgres-dev` up 4 days (healthy)，int 可跑。

### Go / No-Go — ✅ **GO**

**範圍變動 0%**。九個 drift 裡沒有一個動到工作量：

- D1 / D5 / D6 / D7 **支持** plan 的既有決定（其中 D1 讓選項 A 的代價比 plan 寫的更高）
- D2 只換參考對象（`asset` → `issue`），同樣是一個單表 repository
- D3 / D4 是枚舉方法的修正，**結論不變**
- D8 / D9 是我自己的驗證紀律問題，已寫成 §Risks 的硬約束

⇒ 繼續 Day 1。plan §3 **未修改**（drift 全部進 §Risks，保留「計畫 vs 現實」的軌跡）。

---

## Day 1 — 2026-08-14 — Schema · migration · repository

交付：`schema.prisma`（model + enum + 兩個 back-relation）· `20260814023210_soa/migration.sql` ·
`soa.repository.ts` + spec（9 個測試）· `scoped-client.types.ts` +1 介面。

### ⛔ B1 — `prisma migrate dev` 被一個既有的 checksum 漂移擋住（不是本 phase 造成的）

```
The migration `20260813071857_rm_report_snapshot` was modified after it was applied.
We need to reset the "public" schema at "localhost:5433"
```

那是真的：W10 在該 migration **套用之後**就地更正了它的註解（一段被 int 測試推翻的因果宣稱）。
Prisma 因此要求 reset 開發資料庫 —— **為了一段註解丟掉整個 dev DB**。

⇒ **不 reset**。三條路各自的結果：

| 路 | 結果 |
|---|---|
| `migrate dev --create-only` | ⛔ 被 checksum 擋住 |
| `migrate diff --from-schema/--to-schema` | ⛔ **Prisma 7 下靜默輸出空的** —— exit 0、無 stderr、SQL 檔 0 bytes，**而兩個 schema 明確不同**（SoA 命中數 0 vs 3）。⚠️ 若當時把「空輸出 + exit 0」讀成「沒有差異」，就會得到一個完全錯誤的結論 |
| **手寫 migration** ✅ | 用 W10 的 migration 當格式藍本；**UTC 時間戳**（`AD-MigrationTimestampTz-1`：手建用本地時間會排到已套用的 migration 之前）|

⭐ **驗證機制是現成的**：int suite 每次 **DROP + CREATE** 自己的資料庫再跑 `migrate deploy`，
所以它遇到的是**空的 `_prisma_migrations`**，沒有 checksum 可比 —— 本機 dev DB 的漂移影響不到它。
實測：`[int] isms_test rebuilt, migrated and seeded` + **160 / 12 全綠**，
代表 `CREATE TYPE` / `CREATE TABLE` / GRANT / RLS / 3 條 policy 全部真的被套用了。

⚠️ **dev DB 的 checksum 漂移仍未解決** —— 它會擋住任何人下一次跑 `migrate dev`。順帶發現，記 BACKLOG。

### D10 — plan §3.2 說的「複合 FK」在這張表上沒有對象

plan §3.2 寫「`CREATE TABLE` + 複合 FK 到 `org_entities`」，而複合 FK 的用途是**強迫子表的
`org_entity_id` 等於父表的** —— assets/asset_groups · actions/issues · rm_report_versions/rm_reports。

**SoA 不是任何表的子表**：它只引用 `org_entities` 與 `users`，兩者都是單欄 FK。
⇒ 不建複合 FK，也**不建 `@@unique([id, orgEntityId])` 錨點**（那是給未來子表用的，今天零消費者 = AP-5）。
理由寫進 migration 註解。⚠️ plan §3.2 原文不改（同 D2 的處理）。
⭐ W09 的 `evidence` 是先例：錨點晚一個 phase 補上是一個小 migration，不是重新設計。

### ⛔ B2 — `format:check` 紅了，而這正是 W10 Day 3 漏掉的那一項

Day 1.x 的 partial gate 跑出 `FORMAT_EXIT=1`（三個新檔不符 prettier）。

⭐ **抓到它的是「逐項取 exit code」**：每個 gate 各自 `> log 2>&1; echo "EXIT=$?"`，
不經管線、不共用一個 `$?`。W10 Day 3 報「gate 全綠」時只跑了 9 項中的 4 項，
而 `format:check` 當時已經是紅的，直到 Day 4 才發現。
本次 Day-0 的 D9（`BUILD_EXIT` 讀到 `tail` 的 exit code）是同一個機制的第三次，
這一條 gate 是**照著那個教訓寫的**，當天就收到回報。

### Gate（Day 1.x，逐項實測）

| Gate | 結果 |
|---|---|
| `format:check` | **0**（修正後；修正前 1）|
| `lint` | **0** |
| `type-check` | **0** |
| api unit | **360 / 34 suites**（baseline 351 / 33 → **+9 / +1**，正好是新增的 spec）|
| api int | **160 / 12**（無回歸；SoA 的 int 測試在 Day 2）|
| `run_all` | **8 / 8** |
| `check_entity_index` | **20 / 35**（19 → 20）|

⛔ **這七項是實際跑過的全部** —— build 與 coverage 留到 Day 2 的 full gate，
本段不宣稱它們的狀態。

---

## Day 2 — 2026-08-14 — Endpoints

交付：`modules/soa/` 四檔（controller · controller.spec · int.spec · module）· `app.module.ts` +1 ·
`02a:215` 的三段 recorded deviation。**19 → 20 / 35** 實體（Day 1 已達成，Day 2 維持）。

### ⭐ B3 — `applicable` 是第一個「必填但不是字串」的欄位

各 controller 開頭都是同一個迴圈：`for (const key of [...]) if (typeof body[key] !== 'string') 400`。
`applicable` 進不了那個迴圈，而**任何「falsy 當缺值」形狀的檢查都會接受每一個 inclusion、
拒絕每一個 exclusion** —— 偏偏「判定不適用 + 理由」才是稽核員真正會追問的那一半。

⇒ 它自己一條 `typeof !== 'boolean'`。測試同時釘住兩側：`false` 要能通過並以 `false` 送達，
而 `'false'` / `0` / `null` 要被拒。⚠️ **只刪 key 的那條測試證不到這件事** ——
刪 key 的情況下 `undefined !== 'boolean'` 本來就會擋，兩種寫法都會綠。

### ⭐ B4 — coverage 抓到一個型別檢查抓不到的缺口

`soa.controller.ts` 的 branch 覆蓋率是 **85.71%**，未覆蓋處是 139 / 140 / 142 三行：

```
justification: typeof body.justification === 'string' ? body.justification : undefined,
approvedBy:    typeof body.approvedBy    === 'string' ? body.approvedBy    : undefined,
ownerUserId:   typeof body.ownerUserId   === 'string' ? body.ownerUserId   : undefined,
```

三個連續、同型、同為 `string | undefined` 的三元運算式 —— **兩個對調型別檢查完全看不出來**，
而我原本的 spec 每一條都把這三個欄位送成**缺席**，所以三個 present 分支一次都沒執行過。
「justification 被靜靜存進 approved_by」會是一筆指名錯誤對象的稽核紀錄。

⇒ 補一條測試 → controller branch **92.85%**，全域 branch **90.56 → 91.01（高於 baseline）**。
⭐ 這條缺口是 **coverage 數字本身**指出來的，不是我讀 code 讀出來的。

### ⭐ B5 — deviation 寫成 inline 而不是 blockquote，是為了不製造 AP-7

`02a` 既有兩種 deviation 形式：blockquote（`:219` `:260`）與 inline（`:225` `:227`）。
blockquote 讀起來比較清楚，**但它會把 `02a` 之後的每一行往下推** ——
而 repo 內散布著大量 `02a:NNN` 形式的引用（schema docstring / repository / BACKLOG / ROADMAP /
RISK_REGISTER）。位移之後那些行號**全部指向錯的行，而且沒有任何 gate 會發現**
（`AD-MdAnchorLineShift-1` 就是這個形狀，W11 checklist 的 Day 4 也預先警告過）。

⇒ 選 inline，附加在第 215 行**本身**。實測 **514 → 514 行**、`1 insertion(+) 1 deletion(-)`，
零位移、零失效引用。三段 deviation 各自引了所沿用的先例（`:217` / `:225` / `:260`）。

### 範疇測試（`soa.int.spec.ts`，11 / 11）

| # | 斷言 | 約束 8 的哪一條 |
|---|---|---|
| 5 | 跨實體讀回不到對方的列（兩側都有列，否則「看不到」與「沒有」同義）| 跨實體讀拒 |
| 6 | 跨實體寫被 `ScopeRefusedError` 拒，且 HK1 的列數不變 | 跨實體寫拒**且資料未變** |
| 7 | raw INSERT（無 `RETURNING`、繞開發號器）仍被 RLS 拒 | RLS 層**獨立**成立 |
| 10 | 撞別實體持有的 clause 與撞沒人持有的 clause **同樣成功** | 唯一鍵不洩漏存在性 |

⚠️ **test 10 今天只證明「兩者相同」，不證明「是唯一鍵讓它們相同」** —— 那是 Day 3 的 N3。
本段不把它寫成已證實。

### Gate（Day 2 full gate，逐項實測、逐項取 exit code）

| Gate | 結果 |
|---|---|
| `format:check` ×2 | **0** |
| `lint` ×2 | **0** |
| `type-check` ×2 | **0** |
| `build` ×2 | **0** |
| `lint:negative` | **0** |
| api unit | **376 / 35 suites**（Day 1 為 360 / 34）|
| api int | **171 / 13 suites**（Day 1 為 160 / 12）|
| web | **10 / 1** |
| `run_all` | **8 / 8** |
| `check_entity_index` | **20 / 35** |
| coverage | exit **0**（門檻 80/70/80/80）|

⚠️ **coverage 有兩項低於 baseline，不寫成「不低於 baseline」**：
stmts **92.01 → 91.83**（−0.18）· lines **93.44 → 93.29**（−0.15）;
branches **90.81 → 91.01**（+0.20）· funcs **97.4 → 97.5**（+0.10）。

機械成因查明：`soa.module.ts` 覆蓋率 **0%**，而**既有 10 個 `*.module.ts` 全部也是 0%**
（action / assessment / asset / control / control-test / evidence / issue / policy / risk / rm-report）——
DI wiring 只有 int suite 會走，而 int 跑在另一個 jest config，不計入這份報告。
⇒ **每新增一個模組資料夾就稀釋一次 stmts/lines**，前 7 個 slice 都發生過。
這不是本 phase 的退步，但 plan §5 第 7 條寫的是「不低於 baseline」，所以照實記，不改口徑。

---

## Day 3 — 2026-08-14 — 元驗證

### 3.1 預期方向（**寫於執行任何一項中性化之前**，本節與其 commit 早於下方實測）

中性化一律改 **migration 來源**（`AD-NeutraliseRebuiltState-1`）—— int setup 每次重建資料庫，
改 live DB 的手術不算數。基準：`soa.int.spec.ts` **11 passed**。

⚠️ **中性化 = 放行，不是刪除。** SELECT policy 若整個刪掉，RLS + FORCE 之下變成全拒，
**每個測試都會紅但全都是為了錯的理由**。要量的是「這條 guard 承重嗎」，所以改成恆真。

| N | 中性化的東西 | 預期轉紅 | 預期**不動** | 理由 |
|---|---|---|---|---|
| **N1** | `statements_of_applicability_read` 的 `USING` → `(true)` | **測試 5**（跨實體讀）· **測試 9**（roll-up 子樹）| 其餘 9 個 | `repo.list()` 的 WHERE 只有 `retiredAt: null` —— entity 過濾**完全**由 RLS 做。放行後 HK1 的 list 會含 SG1 的列，SG 的 roll-up 會含 HK1 的列 |
| **N2** | `statements_of_applicability_insert` 的 `WITH CHECK` → `(true)` | **測試 7**，且**兩個斷言都紅**（raw INSERT 會成功，`landed` 由 0 變 1）| ⚠️ **測試 6 仍綠** —— 它走 `repo.create`，先呼叫 `issueRefCode`，而 counter 是 entity-scoped，**在到達本表之前就被拒** | ⭐ `AD-BorrowedRefusal-1` 的檢查點。測試 7 是**照著那個教訓寫的**（繞開發號器 + 無 `RETURNING`），所以這次預期它**會**轉紅 —— 若沒有，代表還有第三個東西在擋，**先查是什麼再下結論** |
| **N3** | 唯一鍵去掉 `org_entity_id` → `("framework", "clause_ref")` | **測試 10** —— `collides` 變 `DuplicateKeyError`（23505）而 `doesNot` 仍成功，兩者**不再相同** | 測試 11（自己實體的重複仍是 23505）| ⭐ **D3 的實測** = `AD-UniqueKeyOracle-1` 的第 2 個資料點 |
| **N4**（⛔ **已改標的**）| `statements_of_applicability_update` 移除 `WITH CHECK` 半邊，保留 `USING` | ⚠️ **預期零轉紅** | **全部 11 個仍綠** | 本表**沒有任何測試**會把一列的 `org_entity_id` 改成別的實體 |

#### ⛔ N4 為什麼換了標的（plan §3.y 原文保留不改）

plan §3.y 的 N4 是「移除**複合 FK**」，而 Day 1 的 **D10** 已經確認**本表沒有複合 FK** ——
SoA 不是任何表的子表，沒有可複合的對象。原意是「跨實體的 `org_entity_id` 是否被拒」。

在一張沒有 parent 的表上，回答那個問題的活著的 guard 只有兩個 `WITH CHECK`：
INSERT 的那個由 **N2** 涵蓋；**UPDATE 的那個今天一個測試都沒有**。
⇒ N4 改指 UPDATE 的 `WITH CHECK`。這比宣告 N/A 更貼近原意，也剛好指向唯一沒被量過的地方。

### 3.1b 追加預測（**寫於 N4b 之後、N4c / N4d 之前**）

N4 的補救測試（測試 12）寫完後**重跑 N4 仍然 12/12 全綠**。在下任何結論之前先記一件事：
**我的中性化本身可能是個 no-op。**

§3.1 第一段是我自己寫的：「**中性化 = 放行，不是刪除**」。我把它套用在 N1（`USING (true)`），
**卻在 N4 用了刪除**。而 PostgreSQL 對 `FOR UPDATE` policy 的規則是 ——
`WITH CHECK` 省略時，**用 `USING` 回填**。若屬實，N4b 根本沒有拿掉任何東西。

⇒ 兩個追加實驗，把「回填」與「別的東西在擋」分開：

| N | 中性化的東西 | 預期 | 它排除什麼 |
|---|---|---|---|
| **N4d** | `WITH CHECK` **改成 `(true)`**（保留 scoped `USING`）—— 這才是「放行」形式的中性化 | **測試 12 紅**（UPDATE 成功，列離開 SG1）| 若仍綠 → `WITH CHECK` 那一格根本不是擋住它的東西，要另找 |
| **N4c** | `USING` 改成 `(true)` **且不寫 `WITH CHECK`** | **測試 12 紅** | 若紅 ⇒ 省略的 `WITH CHECK` 確實是由 `USING` 回填的（N4b 是 no-op 的直接證據）|

⛔ **若 N4d 與 N4c 都仍然全綠**，那就不是回填，而是有第三個東西在擋 raw UPDATE
（GRANT？trigger？）—— 屆時**先查出是什麼再寫結論**，不得把「測試綠」讀成「guard 有效」。

⚠️ 這件事同時意味著 migration 第 117-120 行那段註解**可能是錯的**：
它說「只有 `USING` 的話，呼叫端可以把自己的列搬進別的實體」。若回填屬實，那句話不成立。
而 W06 的 controls migration「記錄了相同的配對」—— 同一句話可能在那裡也是錯的。

---

⛔ **N4 的預期是「不動」，而那不是好消息。** migration 第 117-120 行寫著
「只有 `USING` 的話，呼叫端可以把自己擁有的一列搬進別的實體的範疇」——
若 N4 真的零轉紅，那句話就是一個**沒有任何測試在證明的宣稱**，
與 W05 / W09 / W10 量到的是同一個形狀。屆時要補的是一個**跨實體 UPDATE** 測試，
不是把 N4 改成別的東西。⚠️ 補完之後**必須再跑一次 N4**（W10 的教訓：第一版補的測試
用了 `create()`，`RETURNING` 讓 SELECT policy 代答，重跑才發現它仍然全綠）。

### 3.2 實測 vs 預期 —— 原定四項 **4 / 4 方向全中**，追加兩項 **0 / 2**

中性化一律改 migration 來源；每次跑完整 int setup（資料庫重建）。控制組 **11 passed**。

| N | 預期 | 實測 | 相符 |
|---|---|---|---|
| **N1** | 測試 5 · 9 紅，其餘 9 綠 | **正是這兩個**（2 failed, 9 passed）| ✅ |
| **N2** | 測試 7 紅（兩個斷言）· 測試 6 **仍綠** | 測試 7 紅 —— `Resolved to value: 1`，raw INSERT **真的寫進 1 列**；測試 6 綠 | ✅ |
| **N3** | 測試 10 紅 —— `collides` 變 `DuplicateKeyError`，`doesNot` 仍成功 | **正是如此**：`Received constructor: DuplicateKeyError extends Error` | ✅ |
| **N4** | **零轉紅** | **11 / 11 全綠** | ✅ |
| **N4d**（追加）| 測試 12 紅 | ⛔ **12 / 12 全綠** | ❌ |
| **N4c**（追加）| 測試 12 紅 | ⛔ **12 / 12 全綠** | ❌ |

⭐ **原定的四個預測全中；由假說推出的兩個追加預測全錯 —— 而錯的那兩個才是有價值的。**
它們逼出下面的隔離實驗，而隔離實驗推翻了我寫在 migration 註解裡的因果。

### 3.3 D3 實測 —— `AD-UniqueKeyOracle-1` 的第 2 個資料點 ⭐

把 `org_entity_id` 從唯一鍵拿掉之後，SG1 的呼叫端：

| 探測 | 結果 |
|---|---|
| 撞 **HK1 持有**的 `(ISO 27001, A.5.9)` | **`DuplicateKeyError`（23505）** |
| 撞**沒人持有**的 `(ISO 27001, A.5.9999)` | **成功** |

兩個**可分辨**的結果 ⇒ SG1 可以一條一條列舉 HK1 的 SoA，而它連 HK1 的**一列都讀不到**。
鍵含 `org_entity_id` 時兩者都成功 —— 測試 10 斷言的正是這個「相同」。

⭐ **判準確認可移轉到沒有 parent 的表**，但**失敗模式不同**：W10 是 23505 vs 23503
（兩個都是錯誤，可分辨）；這裡是 **23505 vs 成功** —— 沒有 FK 可以掉下去，
所以 oracle **更響亮**，因為「成功」毫無歧義。

### 🚩 3.4 N4 追出來的真相：擋住跨實體搬移的**不是** `WITH CHECK`

N4 零轉紅 → 補測試 12（raw UPDATE、無 `RETURNING`，照 `AD-ReturningMasksCheck-1` 寫）
→ **重跑 N4 仍然全綠**。此時停下來，不把「綠」讀成「guard 有效」。

第一個假說是 **PostgreSQL 對 `FOR UPDATE` 省略的 `WITH CHECK` 會用 `USING` 回填**
（即 N4 是 no-op）。⛔ **假說錯了** —— N4d 把 `WITH CHECK` 明確改成 `(true)`，仍然被拒。

⇒ 改用**逐條放行**的隔離（直接對 `isms_test` 下 `ALTER POLICY`，一次只動一條）：

| 放行到哪裡 | 跨實體 UPDATE |
|---|---|
| `_update` 的 `WITH CHECK` → `true` | ⛔ 仍被拒 |
| `_update` 整條放行（`USING (true)`，無 `WITH CHECK`）| ⛔ 仍被拒（= N4c）|
| 再加 `_insert` 的 `WITH CHECK` → `true` | ⛔ 仍被拒 |
| **再加 `_read` 的 `USING` → `true`** | ✅ **`UPDATE 1`** —— 列真的離開了 SG1 |

⭐ **擋住它的是 SELECT policy** —— PostgreSQL 會拿 UPDATE 的**新列**去對它檢查，
錯誤訊息本身就說了：`new row violates row-level security policy`。
（順帶排除：本表 `pg_trigger` 為 **0 rows**，沒有 trigger 參與。）

⇒ **migration 第 117-120 行原本寫的因果是錯的**，已更正為量到的順序。
⚠️ 該表 `_update` 的 `WITH CHECK` 與 `_read` 的 `USING` 是**同一個運算式**，
所以它今天**確實冗餘**，而且**沒有任何測試能區分它們** —— `AD-BorrowedRefusal-1` 第 6 次。

**但它保留**，理由不是保險而是具體的：當讀的那一半**寬於**寫的那一半時它就不再冗餘。
`controls` **已經處於那個狀態**（group-shared 列可被不該擁有它的實體讀到），
所以 W06 那句一模一樣的註解**可能對 controls 是對的、只有在這裡是錯的**。
⛔ **那是另一次量測，不是從這次推論出來的** → 記 BACKLOG。

### 3.5 改動已套用 migration 的註解 —— 這次先驗證了

W10 就地改註解造成 dev DB checksum 漂移（B1），而我這次也改了註解。差別是**先查**：
`isms_dev` 的 `_prisma_migrations` 最新是 `20260813153153_version_label_key_scoped`，
**`20260814023210_soa` 不在裡面**（`migrate dev` 被 B1 擋住，從未套用）。
int DB 每次重建、`_prisma_migrations` 為空。⇒ 今天改它零漂移。

⚠️ **這個安全窗口會關閉** —— B1 一旦修好、SoA 一被套用到 dev DB，同樣的編輯就會製造第二次漂移。

⭐ 還原的驗證用的是**機械判準**而不是肉眼：`git diff` 濾掉所有 `--` 開頭的行之後**輸出為空**
⇒ 沒有任何一條 SQL 述句被改動，四次中性化全部還原乾淨。

### ⛔ 3.6 `format:check` 又紅了，而且是**同一條 gate、同一個位置**

Day-3 的中性化過程中改了 `soa.int.spec.ts`（`create` helper 加 `track` 參數 + 測試 12），
**改完沒有重跑 format** —— Day 2 的 full gate 是在那之前跑的。

⚠️ **這是同一形狀第 3 次**：W10 Day 3 漏掉它、拖到 Day 4 才發現；W11 Day 1 抓到一次；
本次又發生。三次的共同結構是**「Day 2/3 之間改 int spec，而 full gate 停在改動之前」**，
不是「忘記跑 lint」。⇒ closeout 記 AD：**中性化結束後必須重跑 full gate，因為中性化本身會改 code**。

### Gate（Day 3 收尾，逐項實測、逐項取 exit code）

| Gate | 結果 |
|---|---|
| `format:check` ×2 | **0**（⛔ 修正前 **1**）|
| `lint` ×2 | **0** |
| `type-check` ×2 | **0** |
| `build` ×2 | **0** |
| `lint:negative` | **0** |
| api unit | **376 / 35 suites** |
| api int | **172 / 13 suites**（Day 2 為 171 / 12 —— +1 = 測試 12）|
| web | **10 / 1** |
| `run_all` | **8 / 8** |
| `check_entity_index` | **20 / 35** |
| coverage | **91.83 / 91.01 / 97.5 / 93.29**（與 Day 2 相同；測試 12 是 int，不計入）|

⛔ **gate-only verified** —— 無 UI，未做 drive-through，本 phase 不得宣稱可用性。

---

## Day 4 — 2026-08-14 — Closeout

交付：`CH-028` · `retrospective.md` · calibration（matrix + log）· `BACKLOG` · `ROADMAP` ·
`RISK_REGISTER` · `CLAUDE.md` · `MEMORY.md` + subfile · plan `status: closed`。

### ⭐ 兩個 detector 各抓到一件事，而它們抓的是不同種類的東西

1. **`check_backlog_counts.py`（CH-027 交付）** —— 我沒有手數。編輯完 §Open 之後跑它，
   它印出 `total=91 但表格有 95（delta +4）· P0 +1 · P1 +2 · P2 +1`，四個數字**照抄**。
   ⭐ 這是它第 2 次在真實情境擋住東西（第 1 次是 CH-027 自己那天）。
2. **`check_status_markers.py`** —— 我把 plan 的 frontmatter 翻成 `closed`，
   **內文的 `Status: Approved-to-execute` 忘了跟上**，它報 `E2 ... coarse: closed vs open`。
   ⛔ **這正是 R9 說的「只 commit code 不算收尾」的機械形式** —— 兩個地方各自是對的，
   而它們互相矛盾；沒有這條檢查，plan 會以「已核可執行」的樣子留在 main 上。

⇒ 差別值得記：第 1 條抓的是**我不該用手做的事**，第 2 條抓的是**我做了一半的事**。

### Anti-pattern 自檢（retro Q5 的來源）

**AP-7 違規 1 條** —— migration 第 117-120 行宣稱了一個從未量過的因果。
不是命名問題，是**註解宣稱了它沒有證據的東西**。抓到它的不是 review 也不是 lint，
是「中性化零轉紅 → 補測試 → 仍零轉紅 → 去查」。

⭐ **`02a` 行數未動（514 → 514）**，所以本 phase 沒有製造任何失效的行號引用 ——
這是 Day 2 選 inline 形式的直接回報。

### Gate（Day 4 最終掃描，逐項取 exit code）

| Gate | 結果 |
|---|---|
| `format:check` ×2 | **0** |
| `lint` ×2 | **0** |
| `type-check` ×2 | **0** |
| `build` ×2 | **0** |
| `lint:negative` | **0** |
| api unit | **376 / 35 suites**（baseline 351 / 33 → **+25 / +2**）|
| api int | **172 / 13 suites**（baseline 160 / 12 → **+12 / +1**）|
| web | **10 / 1**（無變化）|
| coverage | **91.83 / 91.01 / 97.5 / 93.29** |
| `run_all` | **8 / 8**（⛔ 修正 status marker 前是 **7/8**）|
| `check_entity_index` | **20 / 35** |
| `check_backlog_counts` | **OK** —— 95 條（P0 7 / P1 53 / P2 35）|

⚠️ coverage 的 stmts / lines 仍低於 baseline **0.18 / 0.15** —— 成因與處置見 Day 2 §Gate
與 `AD-ModuleFileZeroCoverage-1`，**不改口徑**。

⛔ **gate-only verified** —— 全 phase 無 UI，未做任何 drive-through。

### Merge 與 post-merge 修補（2026-08-14）

**MERGED PR #56，`dcc680f`**，05:24:17Z by laitim2001 —— ⛔ **經 `gh pr view` 驗證才寫**
（上一次使用者說「PR merged」時 #55 實為 OPEN）。CI 六項全過，且**逐項核對 `gates` 的 log**
而非採信摘要：`run_all` 8/8 · entity-index 20/35 · unit 376/35 · int 172/13 ·
coverage 91.83/91.01/97.5/93.29 —— **與本機完全一致**。

rebase merge **改寫全部 7 個 SHA**。已改指 main 側的兩處**引用**（不是提及）：

| 原 | main 側 | 那句話靠它證明什麼 |
|---|---|---|
| `0e4b1c6` | **`e969ed7`** | 四個預測寫在執行之前（CH-028）|
| `52465f0` | **`e74efd0`** | calibration 窗口的起點 |

⭐ **author date 逐秒不變**：`2026-08-14T11:10:53+08:00` 兩側相同 ——
CH-027 之後的**第 3 個資料點**。穩定錨點是 author date 不是 SHA。

### ⛔ 改 SHA 引用時，順手發現 calibration 的 band 判定是錯的

拿 author date 逐秒重算 actual：`e74efd0` 10:21:12 → `dcc680f` 12:12:26 = **111.23 min
= 1.854 hr** ⇒ ratio **1.236**，**OVER band**。

而我 merge 前寫的是 **1.13 IN**，並在四份文件裡稱它是「本欄第一個 IN-band 點」——
那個 1.13 用的是**估的**收尾時間（原文寫「closeout commit ~12:00」）。差 12 分鐘，
**跨過 1.2 的邊界**。⇒ `AD-EstimateAsMeasurement-1`（W07 記錄）**再犯**。

⭐ **抓到它的機制值得記下來：是 rebase merge 本身。** 七個 SHA 全被改寫，我因此**必須**
回頭改每一處引用，重算才發現。若這次是 squash 或 merge commit，
**錯的數字會留在 main 上，而所有 gate 都是綠的**。

已更正五處：`retrospective.md` §Q2 · `CALIBRATION-MATRIX.md` · `CALIBRATION-LOG.md` ·
`MEMORY.md` · `memory/project_w11_soa.md`。
