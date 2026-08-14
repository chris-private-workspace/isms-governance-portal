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
