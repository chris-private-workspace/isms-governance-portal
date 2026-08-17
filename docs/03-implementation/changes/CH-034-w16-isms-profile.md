# CH-034: APAC ISMS profile —— 五張 entity-scoped 表

**Date**: 2026-08-16
**Phase**: W16
**Scope**: `core-model`（schema / migration / seed / int spec）+ `02a` §0 索引 + `13` 實作記錄
**Components**: —
**PR**: #71

---

## Problem

`13-isms-profile-module.md` 說這個模組「is **load-bearing for other modules**」（`13:7`）——
一個實體的認證範圍，決定了它的風險評估、控制測試與稽核**該涵蓋什麼**。
而 W11 已經建好的 SoA 規格寫著「per entity, **within its certification scope**」（`13:63`），
那個範圍今天**無處可讀**：`grep -c '^model ISMS' schema.prisma` 為 0。

第二個缺口是 `13:65` 自己指名的：「which OP/OS products and services each entity may sell
— a governance question the region **currently cannot answer in one place**」。

`02a:60` 早就把四個實體登記為 Wave 1，`check_entity_index` 報 **25 / 35**。

---

## Root Cause

不是「忘了建」，是**規格不夠建**。`13` 全檔 **70 行**，§Data model 只有四行，
而那四行只給欄位**名稱** —— 沒有型別、沒有 nullable、沒有唯一約束、沒有 on delete。
且它與 `02a` / CLAUDE.md guardrail / 設計交付物在 **15 處**不一致，
其中三處是正面衝突（子表缺 `org_entity_id`、`status` 無值域來源、`posture` 撞導出值規則）。

⇒ 本片一半的工作是**裁決**，不是打字。

---

## Solution

五張表（四張 + 使用者裁定加入的 `ISMSProfileVersion`）、4 個 enum、14 條 RLS policy、
4 條複合 FK、2 條唯一鍵、1 條 CHECK、三層 GRANT。**零端點、零 repository、零 controller** ——
消費者在 M6c。`02a:60` 同步加入第五個實體名（`02a:18` 要求同一個 change）
⇒ **25 / 35 → 30 / 36**。

**四個 load-bearing 細節**：

1. **子表帶 `org_entity_id` 且走複合 FK**。`13:39/41/43` 只給 `isms_profile_id`，
   而 CLAUDE.md 約束 8 鐵律 1 要求子表也要（「冗餘是故意的」）。
   兩條獨立單欄 FK 會讓子列「宣稱 A 而指向 B」且兩條約束都不違反 ——
   `AD-W15InvariantInCommentOnly-1` 記的正是這個形狀。**N1 實測證明了它**。
2. **`ENABLE` **加** `FORCE` ROW LEVEL SECURITY**。plan 原文只寫 `ENABLE`，Day-0 DR3 抓到。
   沒有 `FORCE`，migration 的 owner 角色**繞過全部 policy**，而 int suite 連的是 app 角色
   ⇒ **沒有任何現有測試會發現**。
3. **版本表無 `FOR UPDATE` policy、無 `GRANT UPDATE`** —— 不可變性是構造性的。
   兩層**失敗方式不同**（無 GRANT → 42501；有 GRANT 無 policy → 不報錯且 rowCount 0），
   所以可以分開測，N3a / N3b 各測一層。
4. **一個索引名明確 `map:`**。Prisma 會導出 69 字元的名字而 `NAMEDATALEN` 是 **63**，
   PostgreSQL 會**靜默截斷**。W11 已經踩過（Day-0 DR12），本片是第三例的候選 —— 沒有發生。

**三處刻意的缺席**，理由寫進 migration banner、schema docstring 與 `13` 的實作記錄表：
`posture`（`02a:437` 導出值不儲存）· `status`（`02a` §4 無此實體的 lifecycle）·
版本 `state`（superseded 由父表 `current_version_id` 導出）。

---

## Verification

**Gate（十三項各自取 exit code）**：`format:check` api/web · `lint` · `type-check` ·
`build` api/web · `lint:negative` · api unit **480/40** · **api int 235/19**
（baseline 225/18 → **+10 tests / +1 suite**）· web **10/1** ·
coverage **92.14 / 91.77 / 98.98 / 93.56**（**逐位不變** —— 本片新增零個進 unit coverage 的檔）·
`run_all` **8/8** · `check_entity_index` **30/36**。**全部 EXIT=0，且在最後一次改動之後重跑。**

**新增測試**: `isms-profile.int.spec.ts` —— **10 條**，每條對應一條會消失的約束。
負面測試以 SQLSTATE 斷言（23503 / 23505 / 23514 / 42501），**從不斷言訊息字串**。

**五次中性化實測**（預測**寫在執行之前**並鎖在 commit `21eaf03`）：

| 實驗 | 預測 | 實測 |
|---|---|---|
| **N1** 複合 FK → 單欄 FK | 1 紅（測試 4）| **1 紅**，且 `rowCount 1` —— 那一列真的插進去了 |
| **N2a** 父表鍵拿掉 `org_entity_id` | 1 紅（測試 6）| **0 —— setup 就死**，seed 自己違反縮小的鍵 |
| **N2b** N2 + seed 年度錯開 | 1 紅（測試 6）| **1 紅**，失敗在 (a) 那一筆 —— oracle 現形 |
| **N3a** 只加 `GRANT UPDATE` | 2 紅 | **2 紅**，測試 9 為 `rowCount 0`（不報錯、零筆被改）|
| **N3b** N3a + `_update` policy | 1 紅 | **3 紅**，測試 9 為 `rowCount 1`（列真的被改寫）|

還原後 `git diff --stat` 對 migration 與 seed **為空**，int 回到 **235/19** 全綠。

**AC-2 逐欄位對照**：**94 個欄位**，兩條獨立路徑交叉檢查（`information_schema` 94 /
`CREATE TABLE` 區塊 94，逐表相符）。12 條「不建」欄位有缺席證明，
且**先以陽性對照證明查詢儀器有效**才採信它的零。15 個裁決全部指向可重跑的證據。

**Drive-through**: 零端點、零 UI、零 CLI，無人可驅動的路徑。

**Verdict**: ⚪ **N/A（純資料層 —— gate-only verified）**。
⛔ 這不是省略：本片沒有任何可駕駛的東西，所以「人能不能真的用」今天問不出來，也不得暗示答案。

---

## §Drive-through 抓到而 gate 沒抓到的

**N/A — gate-only verified，零 user-facing surface。**

⚠️ 但本片有一個**同形狀的替代品值得記**：`migrate diff` 抓到兩件 gate 抓不到的事 ——
`isms_profiles.owner_user_id` 的 `onDelete` 被我寫成隱式（Prisma 對 optional relation 預設
`SetNull`，與 migration 的 `Restrict` 慣例分歧），以及兩處既有的 schema↔DB 漂移。
**本 repo 沒有任何測試斷言 ON DELETE**，所以這一層的「開車」是 `migrate diff`，不是測試。

---

## Impact

- **實體數 25 / 35 → 30 / 36**（分子 +5、分母 +1，第五個實體依 `02a:18` 同步上索引）
- **關閉 `AD-DesignAlign-7`** —— 使用者裁定保留 certifier-comment / company-reply 三欄
- **`AD-UniqueKeyOracle-1` 首次被正面驗證** —— 前兩個資料點（W10 / W11）都是「發現 oracle 並移除」，
  本片是**在建表之前套判準**，且用 N2b 證明拿掉它 oracle 就會出現
- **`AD-DevDbChecksumDrift-1` 首次拿到真實數字** —— `isms_dev` 落後 5 支（17 / 22），
  head 自 W10 未動。五個 phase 以來前四次都用 int suite 的重建訊息代替
- **R4 敞口**：五張新表**零寫入路徑**（無 repository），故不進 `AUDITED_MODELS`；
  漂移守衛以 stub 逼紅證明過非恆真
- ⛔ **M1 的 DoD 仍未達成** —— 其餘 6 張表是 slice 12..N

---

## 相關

- Plan / checklist / progress / retrospective：`docs/01-planning/W16-m1-isms-profile/`
- 規格與實作記錄：`docs/02-architecture/13-isms-profile-module.md` §Implementation record — W16
- 實體索引：`docs/02-architecture/02a-data-model-spec.md` §0
