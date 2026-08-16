# CH-035: 記錄保存與法務扣留 —— 一張全域表 + 一張 entity-scoped 表

**Date**: 2026-08-16
**Phase**: W17
**Scope**: `core-model`（schema / migration / seed / int spec）+ `multi-tenant-data.md` 豁免舉證
+ `check_entity_index.py` 一條 ALIAS
**Components**: —
**PR**: PR-pending

---

## Problem

`05:63` 說保存期限散落在風險管理與供應商管理兩份公司程序裡，因此保存是
**平台級能力，不是各模組的事後補丁**；`05:69` 說 legal hold 是 **first-class concept** ——
它**不管保存期限**一律中止處置，只有被授權角色能施加與解除，本身要被稽核。

而兩者今天都無處可存：`grep -c '^model RetentionPolicy\|^model LegalHold' schema.prisma` 為 **0**，
`02a:50` 早已把它們登記為 Wave 1，`check_entity_index` 報 **30 / 36**。

沒有 `retention_policy`，「這類紀錄該留多久、到期怎麼處置」只存在於兩份 PDF 程序裡；
沒有 `legal_holds`，「這批紀錄因訴訟／稽核不得處置」**無處可表達**。

---

## Root Cause

不是「忘了建」，是**規格給的比看起來少**。

`02a:314` 列了 6 個欄位並給出 `trigger` / `disposition` 的**值域**，
而 `05:73-80` 的表**只有三欄**：Record class · Retention · Basis。
⭐ `02a:314` 自己就說明了這件事 —— 它寫的是
「The six confirmed **classes and periods** are in `05`」，**不是** "the six confirmed rows"。

⇒ 一半的工作是**辨認哪些欄位有來源、哪些沒有**，而不是打字。

---

## Solution

兩張表、3 個 enum、1 支手寫 migration、13 條整合測試。
**零端點、零 repository、零 controller** —— 消費者在 M6b（處置排程）。
⇒ **30 / 36 → 32 / 36**。

### 四個 load-bearing 細節

**1. `retention_policies` 全域，`GRANT SELECT` only。**
它**擴充**了 `multi-tenant-data.md:57-65` 的豁免清單，所以 `:81` 要求舉證而非預設。
論證寫在三處（該檔 + migration banner + PR 描述，依 `:82`）：
`05:73-80` 六列**全部是集團級義務** —— 「Security incident records / 3 years after closure /
ISO 27001 A.5.28」是一條標準條款加集團紀錄政策，不是 SG OpCo 1 對自己事件的意見。
範疇化它會存下 13 份逐位元組相同的列，並**默默回答一個沒人問的問題**：
「HK1 可以把自己的保存期限縮成 1 年嗎？」
⭐ 舉證**併入既有列**而非新增列 —— `git diff --numstat` 回 **`1 1`**，該檔行數不變，
100+ 個 `file:line` 錨點仍指得準（`AD-MdAnchorLineShift-1`）。

**2. ⛔ 不建多型守衛，而這是本片最重要的一個「不做」。**
`02a:318` 讓 scope 多型於 record / class / entity，W14 的
`assert_polymorphic_parent_in_scope()` 看似現成 —— **讀了它才發現結構上不可用**：
`polymorphic_parent_guard/migration.sql:47` 把 id 欄 **cast 成 uuid**，而 mapping walk
在 `:52-59` ⇒ **cast 早於分支**；`class` 的目標是紀錄類別（`'Security incident records'`），
會拋 `22P02` 而非契約承諾的 `23503`。`record` 泛指 31 張業務表，寫不出 mapping。
⇒ 只涵蓋 `entity` 分支的 trigger 會是**綠燈、有斷言、對兩個需要檢查的分支全盲** ——
`AD-VacuousScopeTest-1` 的形狀。缺口明說並登記為 `AD-LegalHoldScopeRefUnguarded-1`。
欄位名也從 `scope_id` 改為 **`scope_ref`**（W11 拒絕 `framework_id` 的同一把尺：
`_id` 承諾一個 uuid 與一條 FK，這欄兩者皆無）。

**3. RLS `ENABLE` **加** `FORCE`，且這次寫在 plan 裡而不是等 Day 0 抓。**
W16 的 DR3 是「plan 只寫 ENABLE」，本片把那個教訓吸收進 §3.2。
**N1 實測證明了它的必要性**：拿掉 `FORCE`，**恰好一條測試轉紅**（測試 6），
其餘 **246 條一條未動** —— 因為所有範疇測試連的是 app 角色，而 `FORCE` 只治理 owner。

**4. 無 `FOR UPDATE` policy、無 `GRANT UPDATE`。**
解除 hold 就是一次 UPDATE，而 `05:69` 限定「僅授權角色」；`Role` 是 M4 實體（`02a:71`）
⇒ **今天「解除」不可表達**。扣住 grant 是把這件事寫進 schema，
而不是出貨一條無限制的解除路徑再宣稱限制是未來工作。

### 三處刻意的缺席與一處刻意的 nullable

| 項目 | 決定 | 強度 |
|---|---|---|
| `retention_policies.extensions` | 不建 —— `validate_extensions()` 無條件讀 `NEW.org_entity_id` ⇒ 掛上去是 runtime error | **機械** |
| `retention_policies.ref_code` | 不建 —— 發號按實體，這裡沒有實體 | **結構** |
| `legal_holds.status` · `retention_policies.status` | 不建 —— `applied_at`/`released_at` 與 `retired_at` 已承載終態 | 判斷 |
| `trigger` / `disposition` | **建欄位但 nullable** —— 無 per-row 來源，NOT NULL 會逼 seed 發明四個值 | 判斷 |

---

## Verification

**Gate（十一項各自取 exit code，且在最後一次改動之後重跑）**：
`format:check` api/web · `lint` api/web · `type-check` api/web · `build` api/web ·
`lint:negative`（**root script** —— Day-0 D2 修正）· api unit **480 / 40** ·
**api int 248 / 20**（baseline 235 / 19 ⇒ **+13 tests / +1 suite**）· web **10 / 1** ·
coverage **92.14 / 91.77 / 98.98 / 93.56**（**逐位不變** —— 本片新增零個進 unit coverage 的檔）·
`run_all` **8 / 8** · `check_entity_index` **32 / 36**。

**新增測試**: `retention-and-hold.int.spec.ts` —— **13 條**。
負面測試以 SQLSTATE 斷言（23503 / 23505 / 23514 / 42501 / 22P02），**從不斷言訊息字串**。
⚠️ **42501 在三條測試裡代表三件不同的事**（完全無 grant / 無 UPDATE grant / grant 存在但 RLS 拒絕），
所以每條測試都寫明它斷言的是哪一層。

**六次中性化實測**（預測**寫在執行之前**並鎖在 commit `57d13c6`）：

| 實驗 | 預測 | 實測 |
|---|---|---|
| **N1** 拿掉 `FORCE` | 1 紅：測試 6 | **1 紅**，`forced: true → false`，246 未動 |
| **N2** 刪 released-pair CHECK | 1 紅：測試 10 | **1 紅**，resolved 而非 rejected，`rowCount: 1` |
| **N3** `GRANT UPDATE`，policy 缺席 | 1 紅：測試 9，`rowCount 0` | **2 紅**：測試 9（`rowCount: 0` ✅）+ 測試 12 |
| **N4** 刪 `legal_holds_insert` policy | **0 紅** | **0 紅 —— 而這是壞消息** |
| **N5** `GRANT INSERT` on retention | 1 紅：測試 3 | **2 紅**：測試 3（`rowCount: 1` ✅）+ 測試 12 |
| **N4a** 補測試 13 後重跑 N4 | 1 紅：測試 13 | **1 紅**，其餘 247 未動 |

**兩次低估是同一個盲點**：N3 / N5 改的都是 GRANT，而測試 12 用 `toEqual` 斷言**整個** grant 集合。
每一條多出來的紅**都能由該改動解釋** ⇒ 是覆蓋不是汙染。

六次全程**逐次序列**，還原後 `git diff --numstat` 對 migration 與 seed **皆為 0 行**。

**AC-2 逐欄位對照**：**28 個欄位**（11 + 17），兩條獨立路徑逐表相符
（`information_schema` / `CREATE TABLE` 區塊 —— ⭐ 後者**從 `git show HEAD:` 讀而非工作區**，
因為中性化正在改工作區的 migration）。10 條缺席證明，
且**先以陽性對照證明查詢儀器有效**才採信它的零。15 個裁決全部指向可重跑的證據。

**Drive-through**: 零端點、零 UI、零 CLI，無人可驅動的路徑。

**Verdict**: ⚪ **N/A（純資料層 —— gate-only verified）**。
⛔ 這不是省略：本片沒有任何可駕駛的東西，所以「人能不能真的用」今天問不出來，也不得暗示答案。

---

## §Drive-through 抓到而 gate 沒抓到的

**N/A — gate-only verified，零 user-facing surface。**

⚠️ 但本片有**兩個同形狀的替代品**，兩者都抓到了所有 gate 抓不到的事：

**一、中性化 N4 抓到一個綠燈下的缺口。** 刪掉 `legal_holds_insert` policy ⇒ **247 條全綠**。
缺席的 policy 對 INSERT 是拒絕（ADR-0014），與正確 policy 拒絕測試 8 的跨實體列
**觀察不出差別**；而 13 條測試裡當時**沒有一條做「範疇內 INSERT 應該成功」**。
⇒ 那張表可以安靜地對 app 角色變成唯讀而無人發現。補測試 13 後 N4a 恰好 1 紅。

**二、`migrate diff` 是這一層唯一的「開車」。** 本 repo **沒有任何測試斷言 `ON DELETE`**
（Day-0 D5 複驗：2 個命中都是註解），所以 `applied_by` / `released_by` 兩條 FK 的
`Restrict` 只由 `migrate diff` 守著。⭐ 而 Day-0 D10 發現**那個工具原本量錯了東西** ——
見下方 Impact。

---

## Impact

- **實體數 30 / 36 → 32 / 36**（分母不變 —— 兩個實體早已在 `02a:50` 索引上）
- **`AD-DevDbChecksumDrift-1` 六個 phase 的落後被一個沒人跑過的指令關掉** ——
  `npx prisma migrate deploy` 把 `isms_dev` 從 **17 / 23** 補到 **24 / 24**，零錯誤。
  ⭐ 該 AD 一直寫「`migrate dev` 自 W10 被擋」，而六次繞開**沒有人試過 `deploy`**。
  兩者不同：`dev` 做 drift 偵測 + shadow DB，`deploy` 只套用 ⇒ **這條 AD 的射程比它宣稱的窄**
- ⭐⭐ **Day-0 D10 換掉了一個量錯東西的儀器**：W15 / W16 稱為「Prong 3 欄位級 diff」的工具，
  `--from-migrations`（真檢查）**在本 repo 跑不起來**（`prisma.config.ts` 未設 `shadowDatabaseUrl`），
  而 `--from-config-datasource` 打的是落後 6 支的 `isms_dev` ⇒ 輸出主要在量**落後**不是量**漂移**。
  新量法覆寫 **`DATABASE_URL_MIGRATE`**（不是 `DATABASE_URL` —— `prisma.config.ts:53` 優先用前者）
  指向 `isms_test`（由 `migrate deploy` 從 migration 檔建成 ⇒ 非循環），
  分離出**恰好 2 條**既有漂移，且本片**零新增**
- **R4 敞口**：兩張新表**零寫入路徑**（無 repository），故不進 `AUDITED_MODELS`；
  漂移守衛的行為經**閱讀 `audit-coverage.int.spec.ts:515-546`** 確認而非假設
- ⛔ **M1 的 DoD 仍未達成** —— 其餘 **4** 張表（`Event` · `posture_snapshot` ·
  `AccessRequest` · `AccessReviewCampaign`）是 slice 13..N。
  🔴 其中 `AccessRequest.org_entity_id` 在 `02a:325` 是 **nullable 而無任何裁決文件**，
  且本 repo **已有一個帶前科的錯誤預設答案**（`extension_fields` 的
  `org_entity_id IS NULL` 形狀曾產生 `AD-GroupRowTheft-1`）—— **建它之前必須 STOP and ask**

---

## 相關

- Plan / checklist / progress / retrospective：`docs/01-planning/W17-m1-retention-and-legal-hold/`
- 規格來源：`docs/02-architecture/05-platform-foundation-services.md` §Records retention
- 實體索引：`docs/02-architecture/02a-data-model-spec.md` §0（`:50`）
- 豁免舉證：`docs/rules-on-demand/multi-tenant-data.md` §鐵律 1
