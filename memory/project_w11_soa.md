# W11 — Statement of Applicability (M1 slice 8)

**Closed**: 2026-08-14 · **PR**: pending · **Retro**:
`docs/01-planning/W11-m1-statement-of-applicability/retrospective.md` ·
**CH**: `docs/03-implementation/changes/CH-028-w11-soa.md`

---

## 交付

`StatementOfApplicability` + `SoaImplementationStatus` + 2 個端點 + 1 個**手寫** migration。
**20 / 35 實體**。ISO 27001 的強制產出，`02a` §0 索引上少數標「Mandatory」的實體之一。

## ⭐ Day 0 量到比預期更強的事實

plan 只打算確認 `Framework` **不在 §0 索引上**。實際 grep 出來的是：
**它在整份 `02a` 全檔零命中** —— 規格從未說過 Framework 會包含什麼。

⇒ 「一併建 `Framework`」的代價從「多兩張表」變成「**要先發明一個實體**」，
那是規格工作不是實作工作。裁決因此不是取捨而是唯一可行解（沿用 W06 對
`Control.framework_refs` 的字串裁決），且**欄位名不叫 `framework_id`** ——
名字不該宣稱一條不存在的邊。

## ⭐⭐ `AD-UniqueKeyOracle-1` 第 2 個資料點：判準可移轉，但描述太窄

`(org_entity_id, framework, clause_ref)` 從第一版就含 entity。N3 拿掉它之後：

| SG1 的探測 | 結果 |
|---|---|
| 撞 **HK1 持有**的 clause | **23505** |
| 撞**沒人持有**的 clause | **成功** |

W10 是 **23505 vs 23503**（兩個都是錯誤）。本表**沒有 parent FK 可以掉下去**，
所以對比是「錯誤 vs 成功」—— oracle **更響亮，也更容易被誤讀成正常行為**。

⇒ detector 的判準不能寫「兩個不同的 SQLSTATE」，要寫「**兩個可分辨的結果**」。

## 🚩 最重要的產出是一次自我推翻（`AD-PolicyClaimUnmeasured-1`）

Day 1 我在 migration 註解寫：「只有 `USING` 的話，呼叫端可以把自己的列搬進別的實體」。

N4 中性化 `_update` 的 `WITH CHECK` → **零轉紅**（如預測）。
補跨實體 UPDATE 測試（raw、無 `RETURNING`，照 `AD-ReturningMasksCheck-1` 寫）
→ **重跑 N4 仍然零轉紅**。

⛔ **沒有把綠讀成有效。** 假說「Postgres 對省略的 `WITH CHECK` 用 `USING` 回填」
導出兩個追加預測，**兩個都錯**（明確寫 `WITH CHECK (true)` 仍被拒；整條 policy 放行仍被拒）。

改用**逐條放行**隔離（直接 `ALTER POLICY`，一次只動一條）：

```
_update WITH CHECK -> true                  仍拒
_update USING -> true, WITH CHECK 拿掉      仍拒
+ _insert WITH CHECK -> true                仍拒
+ _read USING -> true                       UPDATE 1  ← 列真的離開了
```

**擋住它的是 SELECT policy** —— PostgreSQL 拿 UPDATE 的**新列**去對它檢查，
錯誤訊息本身就寫著 `new row violates row-level security policy`。本表無 trigger。

⇒ 註解已更正。`WITH CHECK` **保留**，理由具體：讀的一半一旦寬於寫的一半它就不再冗餘，
而 **`controls` 已經處於那個狀態**（group-shared 列）—— W06 那句一模一樣的註解
**可能對 controls 是對的**，但沒有人量過 → AD。

## `AD-BorrowedRefusal-1` 第 6 次 —— **首次出現判準不可滿足**

本條的判準一直是「中性化該 policy 後有測試轉紅」。而這次兩條 policy 的**運算式相同**，
所以**沒有任何測試能區分它們**。⇒ 正確做法是把「這半邊今天不承重」寫進註解，
而不是宣稱它承重。

⭐ 反面資料點：同 phase 的 **N2 是本專案第一次讓 INSERT `WITH CHECK` 真的轉紅** ——
測試 7 是照本條教訓**預先**寫的（繞開發號器 + 不產生 `RETURNING`）。

## 三個當天被抓到的小東西

1. **coverage 是訊號不是門檻** —— controller branch 85.71%，未覆蓋的是三個連續、同型、
   同為 `string | undefined` 的三元運算式，**兩個對調 tsc 完全沉默**。補測試 → 92.85%。
2. **`02a` 的 deviation 選 inline 不選 blockquote** —— blockquote 會位移之後每一行，
   而 repo 內散布 `02a:NNN` 引用。實測 **514 → 514 行**。
3. **改已套用 migration 的註解之前先查 `_prisma_migrations`** —— W10 沒查，造成 dev DB
   checksum 漂移（`prisma migrate dev` 對任何人都被擋住，本 phase 只能手寫 migration）。
   ⚠️ `migrate diff` 在 Prisma 7 下 **exit 0 而輸出 0 bytes**，而兩個 schema 明確不同 ——
   讀成「沒有差異」會完全錯，且這正是 `AD-SchemaMigrationDrift-1` 提議的現成解法。

## Calibration

`pattern-reuse-feature` 第 5 點，ratio **1.13 IN** —— **本欄第一個 IN-band 點**，
也是第一個**事先宣告量法**的點（含 Day 0）。⚠️ 但它暴露量法的第三個模糊處：
起草發生在第一個 commit **之前**，不在窗口內 ⇒「含 Day 0」有兩種讀法。
⛔ 符合「同一種量法」的點數是 **1**，離 3-phase 證據還很遠 → KEEP 0.50。
