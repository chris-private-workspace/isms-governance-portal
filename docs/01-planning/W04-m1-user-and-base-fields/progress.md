# Phase W04 Progress

**Phase**: W04 — M1 slice 1: the shape every table copies
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W04-m1-user-base-fields`

---

## Day 0 — 2026-08-10 — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | ⭐ **`users` 不在合法全域表清單上。** `multi-tenant-data.md:57-67` 列出五類（`org_entities` · `frameworks`/`framework_controls` · `threat_library`/`vulnerability_library` · `jurisdictions`/`regulations` · `risk_scales`），`:67` 明訂「這五類以外要新增全域表，**必須在 PR 描述中舉證**」，`:374` 的 checklist 重述同一要求 | D1 選 A（全域）需要**三件事**而非 plan §3.1 寫的一件：(a) ADR 承載理由 · (b) **PR 描述舉證**（plan 未提，這是規則指定的位置）· (c) **更新那張清單本身**，否則下次讀清單的人會判 `users` 為違規 | 🟡 小調整 → plan §8 加一行 |
| **D2** | ⭐ **旁路 detector 的 allowlist 是「檔案層級」不是「表層級」。** `assert-no-scope-bypass.mjs:76-85` 的 `ALLOW` 映射的是「哪個**檔案**可以用 `$queryRaw` / `.connection` / `new PrismaClient`」，**沒有全域表的概念**。先例：`entity-scope.resolver.ts` 讀 `org_entities`（無 RLS 的全域表）被 allowlist 為 `unscoped-connection` | `users` 若無 RLS，`user.repository.ts` 要嘛**進 ALLOW**（detector docstring `:21-22` 明寫「每加一筆就是保證不成立的又一個地方」），要嘛**用範疇化 client 查一張沒有 RLS 的表**。⛔ Day 1 D1 拍板時必須連這個一起決定，否則 Day 2 才會撞到 | 🟡 需在 Day 1 一併決定 |
| **D3** | **`assert-no-scope-bypass.mjs:20` docstring 說 "The allowlist is **four** entries"，實測輸出 `3 allowlisted`**（`ALLOW` 有 3 個 Map 條目、6 個 file-rule 配對 —— 都不是 4） | orphan claim（AP-7）。⛔ **不逕行改** —— 依 `AD-EslintSettingsClaim-1` 與 `AD-OpensslClaim-1` 的先例：只知道「今天是 3」，不知道「W02 當時是幾個」，改掉等於用猜測取代紀錄 → 記 BACKLOG | 🟢 記錄，不當場修 |
| **D4** | `schema.prisma:101` 註解寫 `` `owner_user_id` — needs a User table (M4) `` | 本 phase 建了 `User` 之後這句就是 orphan claim。Day 2 補欄位時**必須同時更新該註解區塊**（plan §3.3 已涵蓋，此處是提醒） | ✅ 已在 plan 內 |
| **D-user-spec** | Grep `\bUser\b` 於 `docs/02-architecture/*.md` → **僅 3 命中**：`02a:92`（base field FK 引用）· `02:37`（一列概念，指向 `05`）· `09:13`（表格標題 "User \| What they do here"，**與實體無關**） | **plan 的整個前提成立** —— `User` 確實沒有欄位規格 | ✅ 確認 |
| **D-basefields** | `02a:86-98` 的 13 個 base field 逐欄比對 `schema.prisma:107-137` 的 `Policy` → 缺 **6 個**（`ref_code` · `status` · `owner_user_id` · `created_by` · `updated_by` · `is_active`） | plan §3.3 的「6 降到 ≤1」數字正確 | ✅ 確認 |
| **D-statusenum** | `02a:300-312` Policy 狀態機 **6 態已規格化**（Draft → InReview → Approved → Published → UnderRevision → Retired） | D4（建 enum + 欄位、不建轉換強制）可行 | ✅ 確認 |
| **D-devdb** | `isms_dev` 的 `_prisma_migrations` 三列全部 `applied=true`，與 `prisma/migrations/` 的三個目錄**完全一致** | ⭐ **W03 的 `AD-DevDbDrift-1` 漂移已修復，本 phase 起點乾淨**。這正是把它拉到 Day 0 的理由 —— W03 是 Day 3 才發現 | ✅ 確認 |
| **D-adrnum** | ADR 目錄有 `0001/0004/0005/0006/0007/0010/0011`；**`0002/0003/0008/0009` 預留未建**（CLAUDE.md：待 spike / 待 Wave 3）；`ADR-001[2-9]` 全 repo **零命中** | D1 的 ADR 用 **0012**。⚠️ 不可填空缺編號 —— 那四個是有主題的預留（`AD-ChNumber-1`） | ✅ 確認 |
| **D-baselines** | lint **0** · type-check **0** · format **0** · unit **api 78 / web 10** · int **32** · build **0** · `run_all` **6/6** · `lint:negative` PASS（**17 檔掃描, 0 bypass, 3 allowlisted**） | 基線已記錄；與 W03 closeout 完全一致 | ✅ |

### Prong 覆蓋

- **Prong 1（path）**: 10 個路徑驗證（NEW 2 · EDIT 4 · design-note 1 · ADR 目錄 · CH 編號 · migration 目錄），**0 個漂移**
- **Prong 2（content）**: 4 個 plan 宣稱驗證（D-user-spec · D-globaltable · D-basefields · D-statusenum），**2 個漂移（D1 · D2）+ 1 個 orphan claim（D3）**
- **Prong 2.5（child tree）**: **N/A** —— 無前端工作
- **Prong 3（schema）**: 3 個驗證（`users` 零命中 · migration head 比對 · migration 目錄清單），**0 個漂移**

> ⭐ **Prong 2 又一次是唯一有產出的 prong。** 三個發現全部來自「讀規則與 detector 的**原文**」，
> 而不是路徑存不存在 —— 這與 `day0-plan-verify.md` 說的「路徑驗證單獨做是不夠的」一致。
> 特別是 **D2**：它不在任何 plan 宣稱的射程內，是讀 D1 判準時**順著讀到 detector 實作**才發現的。

### Go / No-Go

**範圍變動**: **~10%** → **繼續 Day 1**

D1 與 D2 都是**新增的約束**而非範圍變動：D1 多兩個交付動作（PR 描述舉證 + 更新清單），
D2 把一個 Day 2 才會撞到的決定提前到 Day 1。兩者都不改變 plan 的形狀。
依 `day0-plan-verify.md` 鐵律，**不改 plan §3 Technical Spec**，改動加進 **§8 Risks**。

### 時間

⚠️ Day 0 未逐項計時（`AD-TimeTracking-2` 的同一個缺口）。
本 phase 依 `AD-CalibrationMetric-1` 的提議改用**牆鐘跨度**：
branch base `65ce121` → closeout commit，`git log` 機械導出。Day 4 retro Q2 填入。

---

## Day 1 — YYYY-MM-DD — 拍板 `User` 的形狀

<待填>

---

## Day 2 — YYYY-MM-DD — 建表與補欄位

<待填>

---

## Day 3 — YYYY-MM-DD — API-level 驗證

_(⚪ 本 phase **無 user-facing surface** → drive-through 不適用。
一律標 **API-level verified**，不暗示可用性。)_

<待填>

---

## Day 4 — YYYY-MM-DD — Closeout

<待填>
