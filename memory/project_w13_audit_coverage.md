# W13 — Audit coverage: 1 → 15, and the experiment that stopped a Potemkin

**Phase**: W13 — Connect the audit trail to every reachable write path
**Period**: 2026-08-14 ~ 2026-08-15
**PR**: #61（pending）
**Retrospective**: `docs/01-planning/W13-m3-audit-coverage/retrospective.md`
**Change record**: `docs/03-implementation/changes/CH-030-w13-audit-coverage.md`

---

## 一句話

W12 交付機制、覆蓋 1/21；W13 把覆蓋接到 **15/21**，並用**一條漂移守衛**讓 R4 十個 phase 的
失效模式（敞口逐 phase 擴大而沒有 gate 會叫）第一次有機械守門。

---

## ⭐ 最重要的一件事：plan 的做法在寫第一條測試之前被實驗推翻

plan §3.0 要把 14 條覆蓋測試放進 11 個模組的 int spec。Day 2 動手前先量了一次：

| 圖 | 同一個 `AssetGroup` create |
|---|---|
| `Test.createTestingModule({imports:[AssetModule]})` | **`before=9 after=9`** |
| `Test.createTestingModule({imports:[AppModule]})` | `before → before+1` |

`AuditModule` 是 `@Global`，但 global provider **只在被拉進圖裡才生效**；
`ScopedPrismaFactory` 對 hook 是 `@Optional`（`scoped-prisma.provider.ts:151-165` 解釋為何必須如此）。

⇒ 原做法會產出 11 條**永遠紅**的測試，或寫成 `≥ 0` 而**成為這個 phase 正要消滅的 Potemkin**。
⇒ 改為新建 `audit-trail/audit-coverage.int.spec.ts`（composes AppModule）。

⛔ **而那段 docstring 我在 Day 0 就讀過了** —— D-reach 時為了確認攔截邊界而讀的。
**讀過 ≠ 用上** → `AD-Day0ReadNotApplied-1`。

⚠️ 實驗 B 的第一版**失敗，而失敗的是實驗自己**（`await import()` 在 jest CJS 下拋
`--experimental-vm-modules`）。當時若下結論「AppModule 圖也不寫」，會做出完全相反的設計。
→ `AD-MetaVerificationBug-1` **第 4 個資料點**。

---

## 中性化：2 個完全命中，2 個方向對而數字少算

| N | 做什麼 | 預期 | 實際 |
|---|---|---|---|
| N1 | 清空清單 | 26 紅 | **27** |
| **N2** | **只移除 `Issue`** | **恰好 2** | **恰好 2** ✅ |
| N3 | 補回 `RefCodeCounter` | 2 紅 | **5** |
| N4 | 拿掉前提 + 保持 V3 中性化 | 0 紅 | **0** ✅ |

⭐ **N2 是驗收核心**：移除一個名字 → 恰好該模型 + 漂移守衛轉紅、**其餘 14 條未動**。
⇒ 覆蓋是**逐模型成立**的，不是一句宣稱穿了十五個名字。

⛔ **N1 / N3 的少算是同一個根因**：我列的是「預期會受影響的檔案」而不是
「**誰 import `AUDITED_MODELS`**」（答案 **4 個**，我列了 2 個）→ `AD-NeutralisationConsumerGrep-1`。
⚠️ 而 Day 0 的覆蓋聲明**明確寫了「未掃 `bench.int.spec.ts`」** —— 盲點記下來了，
兩天後正好造成失誤，而**沒有任何東西讓我回頭看它** → `AD-CoverageStatementNoTrigger-1`。

---

## `RefCodeCounter` 不接：三條理由**全部是量出來的**

1. 一次 create 產生 **2 列**，第二列 `resource_id` / `after` **皆 null**（upsert 無 `data` key）
2. **多實體 scope 下 throw** —— `UnattributableWriteError: ... the scope names 2 entities`
   ⇒ 滾升角色的每個 create 都會失敗
3. ⭐ **失敗的寫入會留下稽核列** —— `issueRefCode` 在自己的交易裡先跑
   （`policy.repository.ts:107` 從 W03 就寫明「two statements, not one transaction」）
   ⇒ **稽核軌跡會記錄一件沒有發生的事**

⇒ 第 3 條**不在原本的推理裡**，是 N3 的第 5 個紅測試撞出來的。對稽核員而言比缺一列更糟。

---

## ⛔ 覆蓋率的限定，必須連著數字一起讀

全 codebase **零個 `client.*.update`、零個 `.delete`** —— 15 個領域寫入**全是 create**
（update 測試走 raw SQL 驗 RLS，而 raw query 無 model ⇒ 不被稽核，ADR-0003 已命名的洞）。

⇒ 「15 / 21」的正確讀法：**每個有寫入路徑的模型，它的 create 都留下稽核列。**
**不是**「所有狀態變更類型都被稽核」。→ `AD-AuditWriteOpsUntested-1`（有明確解封條件）

分母機械導出：`grep -c '^model' schema.prisma` = 22，減 `AuditLog` = **21**；
15 audited + 1 刻意不接（`RefCodeCounter`）+ 5 無寫入路徑 = 21 ✅

---

## 空集合回頭檢查（`AD-VacuousScopeTest-1` 通則）

掃 **13 個 int spec / ~30 個範疇測試**：缺非空前提 **4**、本來就對 **~26**。

⭐ **我一度記錯這條 AD 的標的** —— 以為是 modules 的範疇測試，原文說的是 `audit_log` 自己的
四個測試，而 **W12 已經修好它了**（`audit.int.spec.ts:212`）。照記憶做會去修一個已經對的東西。

⭐ 做法早就寫在 repo 裡：`int-global-setup.js:132`（W05 寫的）——
「One-sided fixtures are how an isolation suite passes while proving nothing」。
⇒ 這條 AD 的真相是「**掃描沒做完**」，不是「沒有做法」。

⚠️ 四處的前提來源**不同**：3 處讀回 seed，`risk` 一處**必須自建**（seed 沒有 `risks`）。
若假設「seed 兩邊都有」，那一處會補成另一個恆真的斷言。

---

## 關掉的 / 產生的

**關閉**：`AD-AuditCoverageOneTable-1`（🔴 P0）· `AD-VacuousScopeTest-1`（通則）

**新增 5 條**：`AD-Day0ReadNotApplied-1` · `AD-NeutralisationConsumerGrep-1` ·
`AD-AuditWriteOpsUntested-1` · `AD-CoverageStatementNoTrigger-1` · `AD-AssessmentTitleMismatch-1`

**BACKLOG**：100 → **103**（P0 **8 → 7**）

---

## Gate（十一項，各自 exit code）

format ×2 **0/0** · lint **0** · type **0** · build ×2 **0/0** · `lint:negative` **PASS** ·
api unit **451/38** · **api int 203/16**（187 → **+16**）· web **10/1** ·
coverage **92.27 / 91.66 / 98.95 / 93.64**（逐位同 baseline）· `run_all` **8/8** ·
`check_entity_index` **21/35**（未變 —— 本片不建表）

⚪ **gate-only verified** —— 本 phase 無 user-facing surface，**連續第 13 個 phase 零 drive-through**。
