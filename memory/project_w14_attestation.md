# W14 — Attestation，以及一條「只寫它就什麼都不證明」的測試

**Phase**: W14 — Attestation, and the second polymorphic link
**Period**: 2026-08-15（單日）
**PR**: #63（**MERGED** 2026-08-15，`e9ab83a`）
**Retrospective**: `docs/01-planning/W14-m1-attestation/retrospective.md`
**Change record**: `docs/03-implementation/changes/CH-031-w14-attestation.md`

---

## 一句話

`02a:235` 的 `Attestation` + 2 個端點 ⇒ **22 / 35 實體**；`evidence` 的多型守衛得到第二個分支；
`AUDITED_MODELS` 15 → 16。⚪ 純後端，**gate-only verified**。

---

## ⭐⭐ 最重要的一件事：Day 0 的 D5 擋下了一條恆真的測試

`controls_read` 的 policy 是：

```sql
FOR SELECT USING ("applies_to_scope" = 'group' OR "org_entity_id" = ANY (app_entity_scope()))
```

而 `assert_parent_in_scope()` 做的正是 `SELECT EXISTS (... FROM controls WHERE id = $1)`，**靠 RLS 過濾**。
⇒ 一個 `applies_to_scope = 'group'` 的 control 對**任何**實體都 reachable。
**這不是 bug** —— `02a:434` 明說 group-shared control「may link to any entity's risks」（ADR-0014）。

⛔ **但它讓 plan §5 acceptance 3 在 `subject_type = control` 且該 control 是 group-shared 時為假。**
若中性化 N1 拿一個 group control 當標的，它**修法前後都會成功** ——
`AD-VacuousScopeTest-1` 的形狀，而 W13 才剛掃 13 個 spec 補過 4 處。

**實測把兩側都釘死了**：拆掉 trigger 後測試 8（entity-local control）**紅**、
⭐ 測試 7（group control）**仍綠**。
⇒ **只寫測試 7 會得到一條什麼都不證明的測試；只寫測試 8 則證不出那條放寬是刻意的。**

⭐ **這條是因為 checklist 明確列了 `D-subject-both-built` 才被問出來的** ——
那一項正是為了 `AD-Day0ReadNotApplied-1`（W13：Day 0 讀過卻沒套用）而加的。

---

## ⭐ W13 漂移守衛的第一次實戰 —— 它是真的

**順序是這條檢查唯一的價值來源**：先建表 + repository、**不碰** `AUDITED_MODELS`、跑 int suite。

```
● audit coverage (integration) › the allowlist still matches the write surface
    + Array [ +   "Attestation", ]        ← expect(unaudited).toEqual([])
Tests: 1 failed, 202 passed, 203 total
```

| 觀察 | 意義 |
|---|---|
| **恰好 1 紅** | 15 條逐模型覆蓋測試**一條未動** ⇒ 偵測**獨立於**它們 |
| 訊息**自己指名** | 從 `core-model` 原始碼導出，不是比對硬編碼清單 |
| 落在 `unaudited` | 雙向比對的**正確那一側** |

⛔ 先改再跑得到的是綠色，而綠色**不能區分**「守衛有效」與「守衛從不看新表」。

---

## 中性化：3 個完全命中，1 個一半

預測 commit `50ea93a` 在執行之前。N1 **3**（測試 5·6·8）✅ · N2 **恰好 2** ✅（驗收核心）·
N3a type-check **1 錯**、連行號命中 ✅ · **N3b ⛔ 錯** · N4 **5**（含跨 suite 那條）✅。

### ⛔ N3b 的錯比預測本身有用

我推論「`schema.prisma` 的 enum 只是 TS 型別 ⇒ int suite 全綠」。
**實際上 Prisma 的 generated client 在 runtime 也驗證 enum 值。**

⇒ 不是兩份真相，是**三份**：`schema.prisma` · **generated client** · DB catalog，而中間那份會擋。
**`ALTER TYPE … ADD VALUE` 的 migration 必須配 `prisma generate`** ——
否則「DB 接受、應用層拒絕」的分歧**只在部署時現形**（本機 int 的 global setup 每次重建，結構上看不見）。
→ `AD-PrismaEnumThreeTruths-1`

---

## 三個設計決定，各自有先例

| 決定 | 理由 |
|---|---|
| **`status` 不建** | `02a` §4 與 `:417` 兩份 lifecycle 清單**都沒有 Attestation** ⇒ 無值域來源。W07 移除 `ControlTest.result` 的**鏡像**（那裡是終態已承載，這裡是沒有終態） |
| **`result` 用 String** | 本 schema 兩先例分歧（`Evidence.kind` 自由文字 / `SoA.implementation_status` enum），**分野是值域有沒有外部來源**。ISO 27001 固定了 SoA 的；attestation 的沒有 |
| **RLS 只 2 條** | `rm_report_versions`（W10）先例：更正 = 新列，撤回 = `retired_at`。⛔ 連 `GRANT UPDATE` 都沒有 —— **缺席比窄的 policy 更嚴格**（ADR-0014） |

**新建 variadic 的 `assert_polymorphic_parent_in_scope()`，舊函式一行未動。**
擴充舊函式**結構上不可行**：它讀 `TG_ARGV`，那是 `CREATE TRIGGER` 時的字面值，而分支必須**逐列**發生。
⛔ **非 AP-5** —— 當下就有兩個呼叫端，且兩份映射不重疊。

---

## ⛔ 我自己犯的錯：同一天，同一個形狀，兩次

**用一個便宜的字串操作，去做一件需要理解結構的工作。**

- **Day 2**：`ab0/ab1` → `ac0/ac1` 用全檔 replace，而 `ab0` 在 `int-global-setup.js` **出現兩次**
  （另一次是 `assessment_instances`）⇒ `assessment.int.spec.ts` **7 紅**
- **Day 3**：`t.index('  ],')` 匹配到**第一筆資料的** `    ],` ⇒ 切出語法錯誤的檔案

⚠️ **兩次都不是我發現的** —— 一次是 int suite 報紅，一次是 node 拒絕載入。
修法都是錨定結構邊界 + `assert` 切出來的東西符合預期計數。→ `AD-TextEditStructuralScope-1`

---

## 關掉的 / 產生的

**關閉**：無 —— 本片是 plan 的 deliverable，不是在關 AD。

**新增 3 條**：`AD-PolicyAttestationFlag-1`（Day 1，🟢）· `AD-PrismaEnumThreeTruths-1`（🟡）·
`AD-TextEditStructuralScope-1`（🟡）

**🚧 移出**：US-3 `Policy.requires_attestation` → **M6**（使用者裁定）——
今天**沒有讀者也沒有寫者**，關掉不會壞任何東西。checklist 1.3 **維持未勾**。

---

## Calibration ⭐ 一個只證明了一半的實測

plan §7 **事先**宣告採「逐段相加並排除 > 60 min 間隙」（`AD-CalibrationWindowCrossSession-1` 的候選規則）。
Day 0–3 六個間隙**最大 34.87 min** ⇒ 兩種算法**同給 100.88 min**，逐位相同。

⛔ **這只證明新量法不擾動舊量法答對的那一類，不證明它修好了 W13 失效的那一類。**
本 phase 沒有跨 session 間隙 ⇒ 失效模式**未被重現，也就未被驗證修復**。該 AD **不關閉**。

---

## Gate（十三項，各自 exit code 分開取，全部 **0**）

format api/web · lint · type-check · build api/web · `lint:negative`（60 掃描 / 0 bypass）·
api unit **480 / 40 suites** · **api int 218 / 17** · web **10 / 1** ·
coverage **92.14 / 91.77 / 98.98 / 93.56** · `run_all` **8/8** · `check_entity_index` **22 / 35**

⚠️ gate script 用了 `tail -25`，把 coverage 的 `All files` 摘要行切掉 ——
退出碼取自 `PIPESTATUS[0]` 所以判定沒錯，但**數字得重跑一次才拿到**（`AD-GrepAssertion-1` 的鄰居）。

⚪ **Verdict: gate-only verified** —— 純後端，⛔ 不得暗示可用性。連續第 **15** 個 phase 零 drive-through
（結構性：尚無 UI 可開）。
