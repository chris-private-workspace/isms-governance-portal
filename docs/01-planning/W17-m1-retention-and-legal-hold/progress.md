# Phase W17 Progress

**Plan**: [plan.md](./plan.md) · **Checklist**: [checklist.md](./checklist.md)
**T0 (UTC)**: `2026-08-16T13:24:10Z` —— 蓋在動 checklist **之前**
（`AD-CalibrationNoTimeRecord-1` 的最小改進，W16 retro 指定）。
⚠️ **plan 起草段發生在 T0 之前 ⇒ 那一段仍是估算**，如實標註。

---

# Day 0 — 2026-08-16

## Prong 1 — Path verify

14 個路徑逐一測。**4 NEW 全部 absent ✅ · 5 EDIT 全部 present ✅ · UNTOUCHED 3 項中 1 項失敗**。
`CH-035` 未被佔用（現有最大 `CH-034`）· `migrations/` 無 retention|hold 目錄（0）。

## Prong 2 / 3 — Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | plan §4 把 `AUDITED_MODELS` 的家寫成 `apps/api/src/audit-trail/audited-models.ts` —— **該檔不存在**。真實位置是 `audit.module.ts`（`audit-coverage.int.spec.ts:68` 從那裡 import） | UNTOUCHED 那一列指向一個不存在的檔 ⇒ 「不碰它」是空話。`task-workflow.md` §Risk Class D 的原形：plan 引用檔案路徑靠猜 | 🟡 改 plan §4 |
| **D2** | plan §3.z 與 checklist 1.x 寫 `npm run lint:negative -w apps/api` —— 該 script **不在** `apps/api/package.json`，它是 **root** script（`assert-boundary-gate.mjs && assert-no-scope-bypass.mjs`） | ⛔ **我自己的 baseline 掃描就用了錯的形式** ⇒ 那一行的 `EXIT` 無意義。⭐ 正是 W16 記下的「`EXIT=1` 有兩義」：**跑了不通過** vs **指令不存在**，而我這次踩的是第二種 | 🟡 改 plan + checklist + 重跑該項 |
| **D3** | plan §3.z / §8 說全域表的約束測試走「superuser 連線」。實際 W15 用的是 `asOwner()` + **`DATABASE_URL_MIGRATE`**（`jurisdiction.int.spec.ts:63-67`），那是 **migration owner 角色**不是 superuser | 名詞錯會讓下一個人去找 superuser 憑證。機制不變、名稱要改 | 🟡 改 plan 用語 |
| **D4** ⭐⭐ | `Grep 'FORCE ROW LEVEL SECURITY'`（單空格）在全 migrations 只回 **3** 個命中，而 W16 宣稱為 5 張表加了 FORCE。**差點據此發出「16 張表有 DR3 缺口」的 P0 警報** —— 實情是 W16 寫成 `FORCE  ROW LEVEL SECURITY`（**兩個空格**對齊）。寬容 pattern 實測：**ENABLE 24 / FORCE 24 / 缺口 0** | ⭐ **`AD-NarrowPatternWideClaim-1` 再現，而這次的代價方向是反的**：前幾次是窄 pattern 讓我**漏看問題**，這次是窄 pattern 差點讓我**對一個做對了的東西發警報**。⇒ 零命中與低命中**都**要先問「它如果存在會長什麼樣」 | 🟢 無需改動；記錄 |
| **D5** | 全樹 `*.spec.ts` 掃 `ON DELETE` / `onDelete` / `confdeltype` → **2 個命中，兩個都是註解**（`audit-coverage.int.spec.ts:417` · `rm-report.int.spec.ts:97`） | plan §3.2 的宣稱（本 repo 無任何測試斷言 `ON DELETE`）**仍成立** ⇒ 顯式 `onDelete` 的唯一守門仍是 `migrate diff` | 🟢 宣稱成立 |
| **D6** | 漂移守衛（`audit-coverage.int.spec.ts:515-546`）掃 `core-model/*.ts`（排除 `.spec.`）的 `client.<delegate>.<WRITE_OPS>(`，雙向斷言為空，並有 `reachable.size > 10` 的非空守衛 | W17 兩張表**零 repository** ⇒ 不進 `reachable` ⇒ 守衛保持綠。**這是讀了程式碼確認的，不是假設**。連帶：本片新增的 `.int.spec.ts` 落在 `.spec.` 排除規則內，不會汙染掃描 | 🟢 無阻塞 |
| **D7** ⭐ | `AD-UniqueKeyOracle-1` 的 W16 記錄是 `@@unique` **10** / 單欄 `@unique` **22** / `CREATE UNIQUE INDEX` **34**，且量法有寫下來。**在 W16 的 base commit `157921f` 上重跑，我得到 14 / 21** —— 且若照它寫的第 2 條 pattern（未排除 `@@`）應得 **35** 而非 22。**三個數字沒有一個能重現** | ⛔ W16 的**結論**（逐處讀出的 Category A–D 表、「今天零個可達 oracle」）**站得住** —— 那是讀出來的不是數出來的。但它的**計數不可重現** ⇒「計數有沒有如預期成長」對 W17 **不是可用的檢查**。⭐ 教訓：**量法寫下來還不夠，要寫到能重現** | 🟡 新 AD 候選 |
| **D8** | 本片規劃的 13 個識別字逐一量長度，最長 **35**（`retention_policies_record_class_key`），`NAMEDATALEN` 63 | 無需任何 `map:`。W11 / W16 的截斷風險在本片不存在 | 🟢 無風險 |
| **D9** | `AD-DevDbChecksumDrift-1` **第 6 次，數字更精確**：`prisma migrate status` 報 **6 支未套用**（`soa` · `audit_log` · `attestation` · `polymorphic_parent_guard` · `jurisdiction_and_obligations` · `isms_profile`）⇒ `isms_dev` 是 **17 / 23**，最後套用的是 `20260813153153_version_label_key_scoped`（W10 era）。⚠️ W16 記的是 17 / 22 —— 分母 +1 是 W16 自己那支，**分子未動**，兩者一致 | 開發用 DB 落後 6 支且**連續六個 phase 沒人修**。本片仍不修（節流閘：順路發現、不阻塞、非安全），但**不再用它當任何基準** | 🟡 記錄，量法改走 D10 |
| **D10** ⭐⭐ | **W15 / W16 稱為「Prong 3 欄位級 diff」的那個工具，量的不是它宣稱的東西**。三種形式實測：**(A)** `--from-migrations`（真正的 schema↔migrations 檢查）⛔ **跑不起來** —— Prisma 7 要求 `datasource.shadowDatabaseUrl`，而 `prisma.config.ts` 沒設；**(B)** `--from-config-datasource`（預設打 `isms_dev`）→ EXIT 2，但輸出**被 6 支未套用的 migration 淹沒**，分不出「schema 漂移」與「DB 落後」；**(C)** 我第一次覆寫 `DATABASE_URL` 想改指 `isms_test` —— **無效**，因為 `prisma.config.ts:53,61` **優先用 `DATABASE_URL_MIGRATE`**（C 的輸出是 B 的超集，兩者其實同一次量測）| ⭐ **新的可跑量法（D）**：覆寫 **`DATABASE_URL_MIGRATE`** 指向 `isms_test` —— 該庫由 `int-global-setup.js:564-578` 的 `DROP + CREATE + prisma migrate deploy` **從 migration 檔**建成（**非**從 `schema.prisma` push ⇒ 非循環）。實測分離出**恰好 2 條**真實漂移：`audit_log.prev_hash`/`row_hash` 的 default 表示法不同 · `statements_of_applicability` 的 index rename（⭐ **逐字重現 W16 的 DR12** —— W11 的 67 字元名被 `NAMEDATALEN` 截成 63）| 🟡 **改 checklist 1.2 的 Verify** |
| **D11** | 我用 `ls prisma/migrations -d prisma/migrations/*/ \| wc -l` 得到 **24**，而 `prisma migrate status` 說 **23**（Glob 也是 23）| 我的指令把父目錄一起數進去了。**自己的量測錯誤，記在這裡而不是靜靜改掉** —— 與 D4 / D7 同一族：便宜的代理指標回答需要精確計數的問題 | 🟢 已更正為 23 |

### Prong 2 — 逐字確認通過的（無 drift）

| 檢查 | 結果 |
|---|---|
| `02a:50` | `retention_policy` · `LegalHold` 同列，Wave **1**，described in `05` §Records retention ✅ |
| `02a:314-316` | 6 個欄位名逐字相符 plan §3.1 ✅ |
| `02a:318-321` | 8 個欄位名逐字相符 plan §3.2 ✅ |
| `02a:314-315` | 值域 `creation/closure/supersession` · `retain/archive/purge` 逐字相符 ✅ |
| `05:73-80` | **恰好 6 列**（Security incident 3y · RM Report & SoA 3y/version · ISMS profile versions 3y/version · Audit issues & evidence **6y** · External party Contract term+2y · Platform audit log **7y immutable**）✅ |
| `polymorphic_parent_guard:46-59` ⭐ | `parent_id := (…)::uuid` 在 **line 47**，mapping walk 在 **52-59** ⇒ **cast 確實早於 walk**。plan §3.3 的 D3 論證成立 ✅ |
| `jurisdiction_and_obligations:11-50,145-149` | 全域表無 RLS / 無 policy / `GRANT SELECT` only ✅ |
| `multi-tenant-data.md:57-65` | 豁免清單 5 列，`retention_policy` **不在上面** ⇒ 必須走 `:81` 舉證 ✅ |
| `schema.prisma` | `^model ` = **31** · `^enum ` = **30**，header 自稱 31（自我可重現）✅ |
| `RetentionPolicy` / `LegalHold` | 全 schema **零命中** ✅ |

### Oracle sweep（覆蓋聲明 —— 掃了什麼 / 什麼方法 / 什麼沒掃到）

**方法**（寫到能重現，這是 D7 的直接回應）：

```
(1) Select-String -Path apps/api/prisma/schema.prisma -Pattern '@@unique'            → 18 行
(2) Select-String -Path apps/api/prisma/schema.prisma -Pattern '(?<!@)@unique'       → 26 行
(3) Select-String -Path apps/api/prisma/migrations/*/migration.sql -Pattern 'CREATE UNIQUE INDEX' → 43 行
(3b) 同上再加 '.*WHERE'（partial）                                                    → 0 行
```

⚠️ **這是行數不是出現次數** —— 逐行一個的情況下兩者相同，但沒有驗證過。
（`AD-TextEditStructuralScope-1` 記過同一個混淆：Grep 回報行數而我當成出現次數。）

**判準套用到本片自己的鍵**（直接讀，不靠計數）：

| 鍵 | 呼叫端可選？ | 可達？ | 裁決 |
|---|---|---|---|
| `retention_policies_pkey`（`id` UUID）| ❌ 伺服器生成 | — | ✅ 安全（AD 明文豁免 A）|
| `retention_policies_record_class_key`（`record_class`）| ✅ 是 | ⛔ **今天不可達** —— `GRANT SELECT` only，app 角色無 INSERT | ⚠️ **安全性來自 GRANT，不來自鍵的設計** —— 必須寫進 migration banner |
| `legal_holds_pkey`（`id` UUID）| ❌ 伺服器生成 | — | ✅ 安全 |
| `legal_holds` 無其他唯一鍵 | — | — | ✅ 無 oracle 面 |

**沒掃到的**：⛔ partial unique index 的**運算式**未讀（本次 0 條故無標的，但方法未驗證）。
⛔ 未驗證「呼叫端真的能給這些欄位」—— 本片零 repository 故無呼叫端可讀，
該檢查要等 M6b。

## Baselines —— 與 plan §0 **逐位相符**

| Gate | 結果 | vs plan §0 |
|---|---|---|
| `format:check` api/web | EXIT=0 | ✅ |
| `lint` api/web | EXIT=0 | ✅ |
| `type-check` api/web | EXIT=0 | ✅ |
| `build` api/web | EXIT=0 | ✅ |
| `lint:negative`（**root form**）| EXIT=0 —— boundaries PASS · no-scope-bypass PASS（60 檔掃描 / 0 bypass / 3 allowlisted / 跳過 59 test + 2 fixture）| ✅ |
| api unit `test:cov` | **480 / 40**，coverage **92.14 / 91.77 / 98.98 / 93.56** | ✅ 逐位 |
| api int `test:int` | **235 / 19** | ✅ |
| web `test` | **10 / 1** | ✅ |
| `run_all` | **8 / 8** | ✅ |
| `check_entity_index` | **30 / 36**（schema 31 models）| ✅ |

⛔ **D2 的證據逐字留存** —— 錯的形式跑出來是：

```
$ npm run lint:negative -w apps/api
npm error To see a list of scripts, run: npm run --workspace=@isms/api@0.0.0
EXIT=1
```

⇒ 那個 `EXIT=1` 是**指令不存在**，不是「跑了不通過」。若不看輸出只看 exit code，
它與一個真正失敗的 gate **長得一模一樣**。

## Go / No-Go — ✅ **GO**

**11 條 drift，零條動到 §Technical Spec 的設計。** 分類：

- **文件層 3 條**（D1 / D2 / D3）—— plan 的路徑與用語錯誤，已就地修正並在此留痕
- **方法層 5 條**（D4 / D7 / D9 / D10 / D11）—— 量法本身有問題，其中
  **D10 產出一個比 W15 / W16 更可信的新工具**
- **確認 plan 宣稱成立 3 條**（D5 / D6 / D8）

範圍變動 **< 10%**（僅 checklist 1.2 的 Verify 指令改寫）⇒ **繼續 Day 1**。
⛔ 依規則，drift 不默默改 §Technical Spec —— D10 已加進 plan §8 Risks。

---

# Day 1 — 2026-08-16

## 交付

`schema.prisma` +2 model +3 enum（header **31 → 33**，`grep -c '^model '` 自我可重現；
enum 30 → 33）· migration `20260816135016_retention_and_legal_hold`（UTC 目錄名）·
`multi-tenant-data.md` 豁免舉證 · `check_entity_index.py` 一條 ALIAS。

**`check_entity_index`: 30 / 36 → 32 / 36** ⇒ **AC-1 達成**。

## Day-1 findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D12** | `schema.prisma` header 寫「**TWO tables are exempt** … **Nothing else is exempt**；adding a third requires justification」。⛔ **W15 加了三張全域參考表（`jurisdictions`/`regulations`/`obligations`）而沒動這句話** ⇒ 它在 W15 落地當天就已經不true | 這句話**本身**是那條規則的守門員，而它比它守的東西先失效。改寫為三類（定義範疇 / identity / 全域參考資料）並逐張列名，明說「kind 3 是一份**清單**不是一張**許可證**」 | 🟡 已修正並記錄它曾經錯過 |
| **D13** ⭐ | `AD-DevDbChecksumDrift-1` 六個 phase 的落後，**被一個沒人跑過的指令關掉了**：`npx prisma migrate deploy` 一次把 `isms_dev` 從 **17 / 23** 補到 **24 / 24**（含本片這支），零錯誤 | ⭐⭐ 該 AD 的敘述一直是「`prisma migrate dev` 自 W10 起被擋」，而**六次繞開都沒有人試過 `deploy`**。兩者不同：`dev` 會做 drift 偵測 + shadow DB，`deploy` 只套用。⇒ 這條 AD 的**真正射程比它宣稱的窄**：被擋的是 `migrate dev` 的**額外功能**，不是套用 migration 本身 | 🟢 順帶關閉；AD 敘述需修正 |
| **D14** | `check_entity_index` 對 `RetentionPolicy` 報 FAIL —— model 名 `RetentionPolicy`、表名 `retention_policies`、而 `02a:50` 寫 `retention_policy`（單數） | 三個名字都不同，正是 `ALIASES` 存在的情境（`ExtensionField` 先例）。⛔ **不改 `02a`**（權威排序：設計文件 > 代碼，讓文件遷就表名是反方向），⛔ **不把表改成單數**（其餘 24 張全是複數）⇒ 加一條有理由的 ALIAS | 🟢 已加 |

## 關鍵設計決定（寫進 migration banner 與 schema docstring）

| # | 決定 | 依據 |
|---|---|---|
| 1 | `retention_policies` **無 `org_entity_id`、無 RLS、`GRANT SELECT` only** | `05:73-80` 六列全是集團級義務；`multi-tenant-data.md:81` 舉證已寫入三處（該檔 + banner + PR 描述）|
| 2 | ⭐ **不建多型守衛 trigger** | `polymorphic_parent_guard:47` 的 `::uuid` cast 早於 `:52-59` 的 mapping walk，而 `class` 的目標不是 uuid（會拋 22P02 而非 23503）；`record` 泛指 31 張表無從 mapping。**只涵蓋 `entity` 分支的 trigger 比沒有更糟** —— 綠燈、有斷言、對兩個需要檢查的分支全盲 |
| 3 | 欄位名 **`scope_ref` 而非 `02a:318` 的 `scope_id`** | W11 對 `framework_id` 的裁決再套用一次：`_id` 後綴承諾一個 uuid 與一條 FK，而這欄兩者皆無 |
| 4 | `record_class` **TEXT 不是 FK** | 六類裡 3 類指向 Wave 2 / 未建實體（`Event`·`17`·`12`）|
| 5 | `duration` **TEXT 不是 interval** | 六個值不是同一種量（相對事件／相對版本／相對外部合約／帶拒絕處置旗標）|
| 6 | **不建 `status`** | `applied_at` / `released_at` 已承載終態。⚠️ 與 W14/W07 的差別：那兩次是**沒有值域來源**，這次是**終態已被承載** ⇒ 建它是冗餘不是發明 |
| 7 | **無 `FOR UPDATE` policy、無 `GRANT UPDATE`** | 解除 hold 就是一次 UPDATE，而 `05:69` 限定「僅授權角色」；`Role` 是 M4 實體（`02a:71`）⇒ **今天「解除」不可表達**。扣住 grant 是把這件事寫進 schema，而不是出貨一條無限制的解除路徑再說限制是未來工作 |
| 8 | `applied_by` / `released_by` 兩條 FK **皆 `Restrict`** | 與 `ISMSProfile.owner` 的 `SetNull` **刻意不同**：誰下的 hold、誰解的，正是這張表要產出的證據；人離職就把它 null 掉等於銷毀稽核要問的那個事實 |

## Verify

| 檢查 | 結果 |
|---|---|
| `prisma validate` | **valid** ✅ |
| `grep -c '^model '` | **33**（header 宣稱 33，自我可重現）· `^enum ` **33** ✅ |
| ⭐ **D10 漂移檢查** | `migrate diff` → **恰好還是 Day-0 那 2 條既有漂移**（`audit_log` byte default · `soa` index rename），**零條新增** ⇒ 手寫 migration 與 `schema.prisma` 在欄位／型別／nullable／索引／FK／enum 上完全一致 ✅ |
| `migrate deploy` | 24 / 24 套用成功（本片這支語法正確且乾淨套用）✅ |
| **AC-6** 行數不變 | `git diff --numstat` → **`1  1`**（增 1 刪 1）✅ |
| `format:check` · `lint` · `type-check` · `build` · `lint:negative` | 全部 **EXIT=0** ✅ |
| `run_all` | **8 / 8**，`check_entity_index` **32 / 36** ✅ |
| 識別字長度 | 最長 `legal_holds_org_entity_id_retired_at_idx` = **40** ≤ 63 ✅ |

---

# Day 2 — 2026-08-16

## D15 ⭐ —— 寫 seed 時才發現規格只給三欄

`02a:314` 列了 6 個欄位並給出 `trigger` / `disposition` 的**值域**，
而 `05:73-80` 的表只有 **三欄**：Record class · Retention · Basis。

⭐ **`02a:314` 自己就說明了這件事**，而我 Day 0 逐字讀過卻沒讀出來 ——
它寫的是「The six confirmed **classes and periods** are in `05`」，
**不是**「the six confirmed rows」。class 與 period，正好就是那三欄。

⇒ `trigger` / `disposition` / `review_cadence` **沒有 per-row 來源**。
把前兩者建成 `NOT NULL`（Day 1 的原樣）會**逼 seed 發明四個值**：
六列裡只有兩列的 trigger 能從期限文字推出來（「3 years **after closure**」→ closure），
另外四列推不出來 —— **而推出來那兩個仍然是我在授權**，違反已確認參數 #9。

**處置**：`trigger` / `disposition` 改為 **nullable**，欄位保留（`02a:314` 指名它們，
M6b 的處置排程要讀）。migration 就地修正（**尚未 merge**），`isms_dev` 上先回退該支再重套。
seed 的 INSERT **不列出這三欄**，而不是傳 NULL —— 讓語句只說來源說的話。

⚠️ 這條的形狀值得記：**Day 0 的 D-fields-r 我勾了 ✅「6 個欄位名逐字比對相符」**，
而那是真的 —— 欄位**名**確實相符。**沒有比對的是「每個欄位有沒有值的來源」**，
那要等到寫 seed 才會被逼問出來。⇒ Day-0 的 content verify 對「名字對不對」有效，
對「**這個欄位填得出來嗎**」無效。

## 中性化預測（**寫在執行之前**，鎖進本 commit）

⭐ 依 `AD-NeutralisationCountUnderPredicted-1`（W16 三次全把條數估低）：
**承諾形狀與位置，條數給區間**。

| # | 動作 | 預期紅的**形狀**（機制 + 位置） | 條數 |
|---|---|---|---|
| **N1** | `legal_holds` 拿掉 `FORCE ROW LEVEL SECURITY`（保留 `ENABLE`） | **測試 6** 轉紅，形狀 = `forced: false` vs 期望 `true`。⚠️ **測試 7-9 必須維持綠** —— 它們連的是 app 角色（非 owner），FORCE 對它們沒有可觀察效果。⭐ **這正是 W16 DR3 的證明**：拿掉 FORCE，**除了那一條刻意寫的斷言以外，沒有任何測試會動** | **1** |
| **N2** | `legal_holds_released_pair_check` 刪除 | **測試 10** 轉紅，形狀 = 「預期 rejects 卻 resolved」（那一列真的插進去了）。⚠️ 其餘全綠 —— seed 三列都滿足該 CHECK，刪掉它不影響 setup | **1** |
| **N3** | `GRANT UPDATE ON legal_holds TO isms_app`（policy 仍缺席） | **測試 9** 轉紅，形狀 = 「預期 rejects 卻 resolved」，**且 `rowCount = 0`**（不報錯、零筆被改）—— W10 N1a / W16 N3a 在第三張表上的移轉檢查 | **1** |
| **N4** | `legal_holds_insert` policy 刪除 | **測試 8** 轉紅，形狀 = 從 42501 變成**成功插入**？⛔ **不，預測是仍然 42501** —— 缺席的 policy 對 INSERT 是**拒絕**（ADR-0014：缺席即最嚴格），所以測試 8 **維持綠**而**測試 7 可能受影響**（若 SELECT policy 也被牽動）。⚠️ **本實驗的預期是「零轉紅」**，用來證明測試 8 測的是 policy 的**存在**還是它的**內容** | **0–1** |
| **N5** | `retention_policies` 加 `GRANT INSERT` | **測試 3** 轉紅，形狀 = 從 42501 變成**成功插入**（無 RLS 可擋）。⭐ 順帶證明「安全性來自 GRANT 不來自鍵」：**測試 4 維持綠**（唯一鍵仍在），但那條唯一鍵**此刻就變成可達的 oracle** | **1** |

**總預測：4–5 條紅**，分佈在 5 個實驗。
⛔ 若某個實驗紅的**位置**與上表不符，先懷疑量法而不是慶祝覆蓋更好
（W16：N1 多出的 12 紅是我並行跑 int suite 造成的**汙染**）。

## D16 ⭐⭐ —— 三條測試「紅得對」，但它們差一點集體空轉

首跑 **3 紅**，三條全部是 `42P08`（*ambiguous parameter*）：測試 8 / 10 / 11 都把
`$1` 同時當 `org_entity_id`（UUID）與 `scope_ref`（TEXT），PostgreSQL 推不出單一型別，
**在 parse 階段就拒絕**了語句。

⇒ 那三個 INSERT **從來沒有走到**它們宣稱在測的東西：
測試 8 沒碰到 RLS 的 `WITH CHECK`、測試 10 沒碰到 CHECK 約束、測試 11 沒碰到 FK。

⭐⭐ **關鍵在於它們為什麼被抓到**：本 repo 的慣例是**斷言 SQLSTATE，從不斷言訊息字串**
（`AD-GrepAssertion-1`）。若當初寫成 `.rejects` 而不帶 code —— 那是一個看起來完全合理的寫法 ——
**三條會全部通過，而三條都什麼也沒測到**。

> `.rejects` 本身是一條恆真斷言。**讓它變成真斷言的是 SQLSTATE。**

⇒ 一條為了「別依賴訊息字串」而立的規則，實際擋下的是**另一種**失效：測試打錯地方。
修法：三處改用**各自獨立的 placeholder**（同值也要分開傳），並把測量結果寫進測試 8 的註解。

**修正後：247 / 20 全綠**（基線 235 / 19 ⇒ **+12 tests / +1 suite**）。

---

# Day 3 — 2026-08-16

## AC-2 逐欄位對照 —— 兩條獨立路徑

| 路徑 | 方法 | `retention_policies` | `legal_holds` | 合計 |
|---|---|---|---|---|
| **1** | `information_schema.columns`（查 `isms_dev`）| **11** | **17** | **28** |
| **2** | `CREATE TABLE` 區塊逐行計數（**從 `git show HEAD:` 讀，不從工作區**）| **11** | **17** | **28** |

⭐ **路徑 2 刻意讀 git HEAD 而非工作區檔案** —— 中性化實驗此刻正在改工作區的 migration，
拿一個**正在被改動的檔案**當基準會讓這條路徑失去獨立性。

**逐表相符**，且欄位的 nullable 逐欄與設計一致：
`retention_policies` 的 `trigger` / `disposition` / `review_cadence` / `retired_at` 為 `YES`，其餘 `NO`；
`legal_holds` 的 `released_by` / `released_at` / `created_by` / `updated_by` / `retired_at` 為 `YES`，其餘 `NO`。

### 缺席證明 —— **先跑陽性對照**

⛔ 一個回傳零列的查詢，可能代表「那些欄位不存在」，也可能代表「我的查詢寫壞了」。
先證明儀器有效：

```
陽性對照 → 查三個「應該存在」的欄位，回傳 3 列：
  legal_holds.applied_by · legal_holds.scope_ref · retention_policies.record_class
```

儀器確認有效後，同一支查詢對下列 **10 個欄位回傳空集合**：

| 表 | 欄位 | 為什麼不建 | 強度 |
|---|---|---|---|
| `retention_policies` | `org_entity_id` | 全域表（`multi-tenant-data.md:65` 舉證）| 裁決 |
| `retention_policies` | `extensions` | `validate_extensions()` 無條件讀 `NEW.org_entity_id` ⇒ 掛上去是 runtime error | **機械** |
| `retention_policies` | `ref_code` | 發號按實體，這裡沒有實體可發 | **結構** |
| `retention_policies` | `status` | `02a` §4 無此實體的 lifecycle；`retired_at` 已承載唯一終態 | 判斷 |
| `retention_policies` | `owner_user_id` · `created_by` · `updated_by` | 全域參考資料無擁有者（W15 三張表先例）| 裁決 |
| `legal_holds` | `status` | `applied_at` / `released_at` 已承載終態 | 判斷 |
| `legal_holds` | `scope_id` | 改名為 `scope_ref`（W11 對 `framework_id` 的裁決）| 裁決 |
| `legal_holds` | `owner_user_id` | `applied_by` 就是責任人，再加一個擁有者是重複 | 裁決 |

## 15 個裁決，各指向一個可重跑的證據

⛔ **零條「已裁決但無證據」。**

| # | 裁決 | 可重跑的證據 |
|---|---|---|
| 1 | `retention_policies` 全域 | 缺席證明（`org_entity_id`）+ **測試 5**（`rls=false, policies=0`）|
| 2 | 舉證併入既有列、行數不變 | `git diff --numstat docs/rules-on-demand/multi-tenant-data.md` → **`1 1`** |
| 3 | 不建多型守衛 | `polymorphic_parent_guard/migration.sql:47`（cast）vs `:52-59`（walk）—— 逐行可讀 |
| 4 | `scope_ref` 而非 `scope_id` | 缺席證明（`legal_holds.scope_id`）+ 陽性對照（`scope_ref` 存在）|
| 5 | `record_class` TEXT 不是 FK | `information_schema` 型別為 `text`；`pg_constraint` 上無 FK |
| 6 | `duration` TEXT 不是 interval | `05:73-80` 六個值異質（**測試 1** 的 `CLASSES` 外部清單）|
| 7 | `trigger` / `disposition` nullable | `information_schema.is_nullable` = **YES**（D15）|
| 8 | `legal_holds` 不建 `status` | 缺席證明 |
| 9 | 無 `FOR UPDATE` policy、無 `GRANT UPDATE` | **測試 12**（`toEqual ['INSERT','SELECT']`）+ **測試 9**（42501）+ **N3** |
| 10 | 兩條 users FK 皆 `Restrict` | `migrate diff` 對 `onDelete` **零漂移** |
| 11 | RLS `ENABLE` **加** `FORCE` | **測試 6**（`relforcerowsecurity`）+ **N1** |
| 12 | `record_class` 唯一但今天不可達 | **測試 3**（42501，無 grant）+ **測試 4**（23505，owner）+ **N5** |
| 13 | released pair CHECK | **測試 10**（23514）+ **N2** |
| 14 | `legal_holds` entity-scoped | **測試 7**（只讀到自己兩列）+ **測試 8**（跨實體寫被拒）+ **N4** |
| 15 | seed 六列取自 `05:73-80` | **測試 1** 對照 `CLASSES` —— 該清單**另外抄寫自 `05`，不從 seed 讀回** |

## 識別字長度複驗（AC-7）

實建的識別字逐一量：最長 `legal_holds_org_entity_id_retired_at_idx` = **40**，
`NAMEDATALEN` 63 ⇒ **零截斷**。W11 / W16 的靜默截斷風險在本片不存在。

## D17 ⭐ —— 我為中性化寫的守衛，自己踩了同一個坑

中性化用腳本套用（`neutralise.py`），每一步都帶斷言 —— 這是 `AD-TextEditStructuralScope-1` 的
要求：**便宜的字串操作做結構工作，必須錨定結構邊界並斷言結果**。

N3 的守衛是 `assert "FOR UPDATE" not in text`（「必須先確認沒有 UPDATE policy，
否則這個實驗不代表任何事」）。**它 fire 了，而且是誤判** ——
命中的是 migration **註解裡**那句：

```
-- ⛔ NO `FOR UPDATE` policy and NO `GRANT UPDATE`, which is the same
```

⇒ **那個片語出現在檔案裡，正是因為那個東西不存在。**

⭐ 這與 Day-0 的 **D4**（`FORCE` 單空格 pattern）、**D7**（oracle 計數不可重現）是同一族：
**拿裸文字回答一個需要結構的問題**。差別在這次的代價方向是好的 ——
守衛 **fail-closed**，寧可停下來也不繼續，所以我得到的是一個誤報而不是一個假結果。

修法：`sql_only()` 先剝除註解行再比對。⇒ **守衛本身也需要被中性化檢查**，
而這次是它自己撞出來的。

## 中性化實測 —— 預測 vs 實測

⚠️ 全部**逐次序列執行**（一次一個 int suite）。W16 的 N1 因為我並行跑兩個 suite
而多出 12 條假紅（互相 `DROP isms_test`）—— 本片的排程有一道**輪詢前一批 `ALL DONE`**
的閘門，且每次還原後驗 `git diff` 為空。

| # | 動作 | 預測 | 實測 | 判定 |
|---|---|---|---|---|
| **N1** | 拿掉 `FORCE`（保留 `ENABLE`）| **1 紅：測試 6**，形狀 = `forced: false` vs 期望 `true`；測試 7-9 **維持綠** | **1 紅：測試 6**，`- "forced": true` / `+ "forced": false`。**246 passed** ⇒ 其餘一條未動 | ✅ **位置 / 形狀 / 條數全中** |
| **N2** | 刪 `legal_holds_released_pair_check` | **1 紅：測試 10**，形狀 = 「預期 rejects 卻 resolved」（那一列真的插進去）| **1 紅：測試 10**，`Received promise resolved instead of rejected`，且 `"command": "INSERT", "rowCount": 1` | ✅ **全中** |
| **N3** | `GRANT UPDATE ON legal_holds`，policy 仍缺席 | **1 紅：測試 9**，形狀 = resolved 且 **`rowCount = 0`**（不報錯、零筆被改）| **2 紅**：測試 9 —— resolved，**`rowCount: 0`** ✅ 形狀逐字命中；**外加測試 12**（grant 集合多出 `"UPDATE"`）| ⚠️ **形狀中、條數低估 1** |
| **N4** | 刪 `legal_holds_insert` policy（grant 保留）| **0 紅**（缺席的 policy 對 INSERT 是拒絕，ADR-0014）| **0 紅 —— 247 全綠** | ✅ 中，**而這是壞消息**（見下）|
| **N5** | `GRANT INSERT ON retention_policies` | **1 紅：測試 3**，形狀 = 42501 → 插入成功 | **2 紅**：測試 3 —— resolved，**`rowCount: 1`** ✅ 形狀逐字命中；**外加測試 12**（多出 `"INSERT"`）| ⚠️ **形狀中、條數低估 1** |
| **N4a** | 補測試 13 之後重跑 N4 | **1 紅：測試 13** | **1 紅：測試 13**，其餘 **247 條未動** | ✅ **全中** |

### 兩次低估是**同一個盲點**，不是兩次獨立失誤

N3 與 N5 多出來的那一條**都是測試 12** —— 我自己寫的 grant catalog 斷言，用 `toEqual`
逐項比對，所以**任何** grant 變動都會讓它紅。而 N3 / N5 改的正是 grant。

⇒ `AD-NeutralisationCountUnderPredicted-1` 再現（W16 三次、本片兩次），
但兩次多出來的紅**都能由該改動解釋** —— 符合「**帶資訊的是紅的位置**」那條判準，
不是 W16 N1 那種汙染。⭐ **真正的教訓不是「條數要估高一點」，是
「一條斷言整個 catalog 的測試，會對每一個改動它所在維度的實驗都反應」** ——
下次預測 grant / policy 類中性化時，catalog 測試應該**預設算進去**。

### ⭐⭐ N4 零轉紅：預測中了，而它揭露一個真缺口

刪掉 `legal_holds_insert` policy ⇒ **247 條全綠**。

原因：**缺席的 policy 對 INSERT 是拒絕**（ADR-0014，缺席即最嚴格），
與正確的 policy 拒絕測試 8 的跨實體列**觀察不出差別**。而我的 12 條測試裡
**沒有任何一條做「範疇內 INSERT 應該成功」**（測試 8 是被拒的跨實體寫入，
測試 10 / 11 走 owner 連線）。

⇒ 測試 8 釘住的是「policy **不比它該有的更寬**」，**而沒有任何東西釘住它存在**。
那張表可以安靜地對 app 角色變成**唯讀**，全套測試不會有反應。
⛔ 依 AC-5（每一條新建的約束都要有一條會因它消失而轉紅的測試），
**`legal_holds_insert` 當時不滿足**。

**補測試 13**：範疇內 INSERT 應成功，包在 `BEGIN` / `ROLLBACK` 裡 ——
committed 的列會讓測試 7（SG1 恰好讀到兩列）變成依賴檔案內執行順序，
那是把一個 policy 斷言換成一個順序斷言。

**N4a 驗證**：基線 **248 / 20** 全綠 → 套用 N4 → **恰好 1 紅：測試 13**，其餘 247 條未動。
⇒ 缺口關閉，且關閉這件事本身有實測證據。

### AC-5 還原驗證

五個實驗 + N4a 共 6 次，每次還原後 `git diff --numstat` 對 **migration 與 seed 皆為 0 行**。
⛔ **全程逐次序列執行**，且 N3–N5 那批在啟動前**輪詢等前一批印出 `ALL DONE`** ——
W16 的 N1 就是因為我並行跑兩個 suite 而多出 12 條假紅（互相 `DROP isms_test`）。

### ⭐⭐ N1 是 W16 DR3 的直接證明

拿掉 `FORCE`，**恰好一條測試轉紅 —— 就是那條刻意為它寫的斷言**，其餘 246 條**一條未動**。

⇒ 若測試 6 不存在，`FORCE` 消失在這個 repo 裡就是**完全不可觀察的**：
所有範疇測試連的是 app 角色，而 `FORCE` 只治理 owner。
**一層屏障有一個開關，而在 W16 之前沒有任何東西在看它有沒有被打開。**

---

# Day 4 — 2026-08-16（closeout）

## `git diff --name-status` 對照 plan §4

⭐ 這一步是 `AD-DecisionSideEffect-1` 建議的固定 closeout 動作（成本 < 1 min），
本片第一次照做就抓到一項偏離。

| plan §4 | 實際 | 判定 |
|---|---|---|
| `schema.prisma` EDIT | ✅ M | 相符 |
| `migrations/<utc>_.../migration.sql` NEW | ✅ A | 相符 |
| `retention-and-hold.int.spec.ts` NEW | ✅ A | 相符 |
| `int-global-setup.js` EDIT | ✅ M | 相符 |
| `multi-tenant-data.md` EDIT | ✅ M（`1 1`，行數不變）| 相符 |
| **`02a-data-model-spec.md` EDIT（§0 索引 `:50` 標記已建）** | ⛔ **未改** | **偏離** |
| — | ➕ `scripts/lint/check_entity_index.py`（**plan 未預期**）| **偏離** |

**兩項偏離都在同一個地方**：`02a:50` 的索引列**早就存在** ——
`retention_policy` 與 `LegalHold` 從 Wave 1 起就在上面。
W16 需要改 `02a` 是因為它**新增了一個實體**（`ISMSProfileVersion`），本片沒有。
⇒ plan §4 那一列是我從 W16 的形狀抄過來的，而 `02a:18` 的規則
（「adding an entity means adding a row **in the same change**」）**本片不適用**。

而它改成需要動 `check_entity_index.py` 的原因是 **D14**：三個名字都不同
（model `RetentionPolicy` / 表 `retention_policies` / 索引 `retention_policy`）
⇒ 加一條有理由的 `ALIAS`。⛔ **不改 `02a`** —— 權威排序是設計文件 > 代碼，
讓文件遷就我的表名是反方向。

## Final gate（十一項，各自取 exit code，在最後一次改動之後重跑）

| Gate | 結果 |
|---|---|
| `format:check` api/web · `lint` · `type-check` · `build` · `lint:negative` | 全部 **EXIT=0** |
| api unit `test:cov` | **480 / 40**，coverage **92.14 / 91.77 / 98.98 / 93.56**（**逐位不變**）|
| api int `test:int` | **248 / 20**（基線 235 / 19 ⇒ **+13 / +1**）|
| web `test` | **10 / 1** |
| `run_all` | **8 / 8** |
| `check_entity_index` | **32 / 36** |
| `check_backlog_counts` | OK（宣告值由 detector 導出：117→**122** / P1 66→**68** / P2 44→**47**）|
| `check_status_markers` | OK（23 pre-doc，E1/E2/E3/E4 clean）|

## 收尾時複驗過的兩個宣稱

我在 `RISK_REGISTER.md` 寫了兩個數字，寫完**當場量了**而不是留著：

- **ENABLE 25 / FORCE 25 / 缺口 0**（寬容 pattern，含本片 `legal_holds`）✅
- **`AUDITED_MODELS` = 16**，分母 32 ⇒ **16 / 32**，分母 +2 分子不變**是正確的** ✅

`CLAUDE.md` **29,469 / 30,000**（餘裕 531，用 **bytes** 量 —— W16 的教訓）。
