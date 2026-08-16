# W16 — 五張表，和一個沒有任何測試看得見的開關

**Phase**: W16 — M1 slice 11: the APAC ISMS profile
**Period**: 2026-08-16（單日）
**PR**: #71（MERGED 2026-08-16，`0086ba5`）
**Retrospective**: `docs/01-planning/W16-m1-isms-profile/retrospective.md`
**Change record**: `docs/03-implementation/changes/CH-034-w16-isms-profile.md`

---

## 一句話

`ISMSProfile` / `ISMSSite` / `ISMSContact` / `ApprovedOffering` **+ `ISMSProfileVersion`**
（使用者裁定，依 `02a:18` 同 change 上索引）⇒ **25/35 → 30/36**（分母 +1）。
14 條 RLS policy · 4 條複合 FK · 2 條唯一鍵 · 1 條 CHECK · 三層 GRANT。
**零端點零 repository**，消費者在 M6c。⚪ **gate-only verified**。

---

## ⭐⭐ 最重要的一件事：DR3 —— 一個沒有任何測試看得見的開關

plan §3.3 寫「五張表各自 `ENABLE ROW LEVEL SECURITY`」，**漏了 `FORCE`**。

沒有 `FORCE`，**表的 owner（= migration 執行的角色）繞過全部 policy**。
而 int suite 連的是 app 角色 —— 所以五張表的範疇測試會**全綠**，
guardrail 4 的缺口就這樣出貨。

抓到它的是 Day-0 對 `attestation/migration.sql:83-84` 的逐字閱讀，
不是測試、不是 lint、不是 review。

> **一層屏障有一個開關，而沒有任何東西在看它有沒有被打開。**

⇒ int spec 測試 3 現在斷言 `relforcerowsecurity`，但**只釘住這五張表** ——
`AD-EntityScopeNoDriftGuard-1` 要的是對「未來所有表」成立的守衛，那個仍不存在。

---

## ⭐ DR12 —— PostgreSQL 把索引名吃掉，而 schema 從此不一致

`NAMEDATALEN` 是 **63**，超過的識別字被**靜默截斷**。
W11 寫了 67 字元的 `statements_of_applicability_..._clause_ref_key`，
DB 存成 63 字元（`key` 沒了），而 Prisma 期望它自己的截斷法 `..._clause__key`
⇒ **`migrate diff` 至今仍在報這個 rename**。

我的版本表唯一鍵導出名是 **69** 字元 —— 本片本來會是第三例。
抓到它的是 Prong 3 的**欄位級** diff（`--exit-code` 回 2），不是任何 gate。

---

## ⭐⭐ 三個 AD 在本片有了它們一直缺的東西

| AD | 之前 | 本片 |
|---|---|---|
| `AD-UniqueKeyOracle-1` | 兩個資料點，**都是發現 oracle 並移除** | **第一個「正面」的**：在建表**之前**套判準（ROADMAP 4d 的落點），並用 **N2b** 證明拿掉 `org_entity_id` 後 oracle 會出現 |
| `AD-DevDbChecksumDrift-1` | 四次繞開，**四次都用 int suite 的重建訊息當 Prong 3 證據** | **第一個真實數字**：`isms_dev` 只套了 **17 / 22**，head 自 W10 未動。而 int suite 每次 DROP+CREATE ⇒ 那訊息**結構上看不見 checksum 漂移** |
| `AD-W15ConstraintSurfaceUntested-1` | 明列 W15 缺一個 `toEqual` 的 GRANT catalog 斷言 | 有了，**而且 N3a 實測它真的會叫** |

---

## ⭐ N3a：把 W10 的預測變成事實

`rm_report_snapshot/migration.sql:155-158` 至今仍寫著
「**"should be" rather than "is", deliberately** … nothing has yet reached this layer to find out」——
但 W10 的 N1a 其實已經量過（Day-0 DR6 查證），而本片在**一張新表**上再次量到：

- **無 `GRANT UPDATE`** → **42501**（權限檢查早於 policy）
- **有 `GRANT` 而 policy 缺席** → **不報錯、`rowCount = 0`**

⇒ 兩層**失敗方式不同**，所以可以分開測。測試 9 因此**刻意只叫「app 角色無法 UPDATE」**，
不叫「表是不可變的」——後者會在 policy 半邊悄悄消失時仍然通過。

---

## ⛔ 中性化：五次，三次預測不正確，而錯的方式各不相同

| 實驗 | 預測 | 實測 |
|---|---|---|
| N1 複合 FK → 單欄 | 1 紅 | **1 紅**，`rowCount 1` —— 那一列真的插進去了 |
| N2a 父表鍵拿掉 `org_entity_id` | 1 紅 | **0 —— setup 就死**，seed 自己違反縮小的鍵 |
| N2b N2 + seed 年度錯開 | 1 紅 | **1 紅**，失敗在 (a) 那一筆 |
| N3a 只加 `GRANT UPDATE` | checklist 2 / 預測表 1 | **2 紅**（兩份文件互相矛盾，checklist 對）|
| N3b N3a + policy | 1 紅 | **3 紅**，全部是正確告警 |

**三次都是把條數估低。** ⇒ 承諾**形狀與位置**，對**條數給區間**。

⭐⭐ **N1 與 N3b 是相反的失敗模式，而症狀一樣**：兩次都「比預期更紅」——
N1 那次多出的 **12** 紅是**汙染**（我自己並行跑了兩個 int suite，它們互相 DROP `isms_test`），
N3b 那次多出的 **2** 紅是**訊號**（覆蓋比我以為的好）。

> **「比預期更紅」本身不帶資訊，帶資訊的是紅的位置。**
> N1 那次 `soa` 為什麼會紅**解釋不了** —— 那就是該去懷疑量法的訊號。

---

## AC-2：W15 被判 `closed_partial` 的那件事，這次做了

**94 個欄位**，兩條獨立路徑（`information_schema` 94 / `CREATE TABLE` 區塊 94，逐表相符）。
12 條「不建」欄位有缺席證明，且**先跑陽性對照證明查詢儀器有效**才採信它的零。
15 個裁決全部指向一個可重跑的證據，零條「已裁決但無證據」。

三個附帶量測：
- **`is_active`（`02a:100` 的 §1.1 base field）在全 schema 零張表存在** —— 從 W02 至今沒被實作過
- **`status` 恰好在 6 張表上**，正是 `02a` §4 有 lifecycle 的那六個 ⇒ D5 的推理與現況一致
- `owner_user_id` 只在 24 張 entity-scoped 表的 10 張 ⇒ 選擇性的，非普遍

---

## Calibration —— 0.84 IN，而教訓落在估算不是乘數

`pattern-reuse-feature` · bottom-up **8.3 hr** → committed **4.15 hr** (mult 0.50) →
actual **~3.5 hr** · ratio **0.84 IN**（第 9 點）

W15 是 1.235 OVER，根因是「零端點讓實作便宜卻讓驗證變貴」。
W16 的 §7 **事先寫進了那個修正**（明寫「表數 1.67 倍且 entity-scoped」），
bottom-up 因此從 3.6 拉到 8.3。⇒ **教訓被吸收進估算，而不是被吸收進乘數。**
若當初因 W15 一點就調高乘數，本片會變成 UNDER —— 這正是「單點不調」要保護的東西。

⛔ **資料品質仍要打折**：量法事先宣告了（W15 沒做到），但「兩條獨立路徑」
**只在 Day 0–1 成立**，Day 2–4 同源；且起草段（~95 min，佔 45%）是**估算不是量測**。
⇒ 下一片的最小改進：**動 plan 之前先蓋一次 `date -u`**，成本一行。

---

## Carryover

- `AD-IsmsProfileSpecGaps-1` 🟡 —— `iso_officer_name` vs `ISMSContact(role='ISMS lead')` 是同一人的兩份紀錄 ·
  `13:33` 說 OpCo admin can edit 而 `permMatrix.js:11` 給 Read · `status`/`region_code`/`posture` 三欄的拒絕要 M6c 覆核。
  ⭐ **本片 AP-3 的那 1 次也在這裡解封**（版本表今天零消費者）
- `AD-IntSuiteNoMutex-1` 🟡 · `AD-NeutralisationCountUnderPredicted-1` 🟡 ·
  `AD-IsActiveNeverBuilt-1` 🟢 · `AD-SchemaTemporalConventionSplit-1` 🟢
- ⛔ **M1 的 DoD 仍未達成** —— 其餘 **6** 張表；🔴 `AccessRequest.org_entity_id` nullable 無裁決文件，建它前必須 STOP and ask

**Keywords**: FORCE ROW LEVEL SECURITY 漏寫而測試結構上看不見 · NAMEDATALEN 63 靜默截斷索引名 ·
AD-UniqueKeyOracle-1 首次正面驗證 · isms_dev 落後 5 支 migration 的第一個真數 ·
缺席的 policy 自己撐得住（rowCount 0 vs 42501）· 比預期更紅可能是汙染也可能是覆蓋 ·
seed 是一條沒被標成斷言的斷言 · 位元組預算不能用字元數量量 · AC-2 逐欄位對照 94 欄
