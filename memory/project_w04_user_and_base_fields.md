# W04 — M1 slice 1: the shape every table copies

**Phase**: W04（`docs/01-planning/W04-m1-user-and-base-fields/`）
**Period**: 2026-08-10（Day 0–4，單日）
**Status**: closed
**權威來源**: [retrospective.md](../docs/01-planning/W04-m1-user-and-base-fields/retrospective.md) ·
[design note](../docs/02-architecture/design-notes/W04-user-and-base-fields.md) ·
[CH-019](../docs/03-implementation/changes/CH-019-w04-user-and-base-fields.md)

---

## 一句話

拍板 ADR-0012（`users` **全域，無 `org_entity_id`**），據以建出最小 `User` 並把 `Policy`
補到「今天可建的上限」—— 交付的是**形狀**不是數量，M1 其餘 32 張表複製它。

---

## 六個值得跨 phase 記住的東西

### 1. ⭐⭐ 先拍板語義，再決定要建什麼 —— 順序省掉一個零消費者元件

plan 列了 `user.repository.ts`（理由：「第二個範疇化 client 消費者」）。
ADR-0012 寫完後那個理由**消失**了：`users` 全域無 RLS，它屬於 `entity-scope.resolver.ts`
讀 `org_entities` 那一類；而今天沒有任何東西要讀 user（無端點、無 UI）。

→ **零消費者 = AP-5 + AP-3**，砍掉（checklist 2.2 標 🚧 未刪，解封條件 M4）。

⚠️ 若照原 plan 先建 repository 再寫 ADR，會得到一個**有測試、有覆蓋率、通過每一項 gate
的零消費者元件** —— 而每一項 gate 都會是綠的。
**與 W03 的 `AD-ScopedClientDI-1` 同一形狀：兩次都是「ADR 拍板改變了某個元件的存在理由」，
不是「估錯工作量」。**

### 2. ⭐ 決定寫成「規則的分類不完整」，不是「這張表是例外」

`multi-tenant-data.md` 原本只有兩類（業務資料→範疇化 / 參考資料→全域，五類列舉），
而那五類**全部沒有個資**。`users` 兩者皆非。

→ 處置是把 **identity 立為第三類**，不是在參考資料清單加第六列。
**加一列是記一個例外；改分類是讓下一個人自己就能判斷。**
同一節導出可執行的查詢規則：**join `users` 只能加欄位，永遠不能加列**。

`03:31` 是關鍵那一行：user 的 scope 來自 **role assignment**；`03:23` 列舉
"every domain record"（risk/control/policy/asset）時**不含 `User`**。

### 3. ⭐⭐ 兩張同一天建的表，一張刻意無 RLS、一張刻意有

判準不是「新表要不要 RLS」，而是「**這張表上的一次寫入，跨實體時是不是一件該被拒絕的事**」：

| 表 | RLS | 為什麼 |
|---|---|---|
| `users` | ❌ | 記錄一個人的存在，不是跨實體行為 |
| `ref_code_counters` | ✅ | **替別的實體發號正是 RLS 存在要拒絕的跨實體寫入** |

於是「可以寫 HK1 的 policy 嗎」與「可以發 HK1 的號嗎」由**同一條 policy** 回答 —— 一個機制不是兩個。

### 4. ⭐⭐ 元驗證產出**新知識**：一個機制的失效改變了另一個 phase 的保證

中性化 `ref_code_counters` 的 RLS → int **2 failed**，而**那不是同一件事的兩個症狀**：

1. SG1 成功發出 `PRB-HK1-000001`（能替別人發號 —— 預期中的直接證據）
2. **W03 寫的 oracle 防護測試 2b** —— 因**錯誤型別改變**而紅
   （`ScopeRefusedError` → `PrismaClientKnownRequestError`）

> counter 的 RLS 失效讓「不存在」與「不是你的」**重新變得可區分**。
> **W04 的發號路徑成了 W03 那個保證的一部分，而寫的時候沒有任何東西記錄這件事。**

同樣值得記：拒絕點已從 policy insert **移到 counter upsert**（發號在前），
而 API 實測顯示兩者回應除 id 外**逐字相同** —— **同一個保證，在新位置重新成立**。

### 5. ⭐⭐ 兩條建庫路徑產生的權限不同，而只有一條被測試過

Day 3 首次 API 探測就 **500**：`permission denied for schema public`（42501）。

| 路徑 | 做什麼 | `public` 的 ACL |
|---|---|---|
| `int-global-setup.js`（isms_test）| `CREATE DATABASE` → 從 **template1 複製** | 帶內建 `GRANT USAGE TO PUBLIC` → **免費繼承** |
| `prisma migrate reset`（isms_dev）| **不 drop database** —— `DROP SCHEMA` + `CREATE SCHEMA` | **ACL 為 null** |

**這個權限從來沒有被本 repo 的任何東西授予過**，W02/W03/W04 的每個表層級 GRANT
都疊在一個沒有 migration 陳述過的假設上。→ `AD-DbBuildPathParity-1`

⭐ **這是 `AD-NegativeGate-1` 家族的第 7 個，也是第一個「常駐負面案例無效」的**：
兩個環境各自的負面案例都會過，因為它們**各自在自己的環境裡是對的**。
（第一個邊界是 `AD-OpensslClaim-1`：有些缺陷不造成可觀測故障。）

### 6. ⚠️ 我自己的一個錯誤結論 —— 證據是真的，射程不夠

`migrate reset` 後查 `information_schema.role_table_grants` 就寫下「GRANT 與 RLS **全部完好**」。
那是**表層級**證據，被用來回答涵蓋 **schema 層級**的問題。
→ `feedback_evidence_must_support_claim` 的形狀，**在同一個 phase 內就被自己的 500 打臉**。

同類的一次：Day-0 的 `D-devdb` 驗了三個 migration `applied=true` 判定「起點乾淨」，
Day 2 撞到 **checksum 不符**。**驗了「有沒有套用」，沒驗「套用的是不是同一份內容」**
→ `AD-MigrationChecksum-1`。

---

## 拍板 / 關閉

- **ADR-0012 採納** —— `users` 全域無 `org_entity_id`；4 條可證偽條件，
  最可能開火的是「一個實體的管理員不得知道其他實體有哪些使用者存在」，**且它在 M4 開火**
- `AD-UserEntitySpec-1` ✅ —— ⚠️ **只關 `User` 半邊**。`Role`/`Permission` 進 `02a` §0
  "Not yet specified" 分區並綁 M4（從「無一處定義」變成「明確列為不得建置」）
- **D2** `is_active` **不存**（用 `retired_at IS NULL`，避免第二個可分歧的真相）
- **D3** counter 表**不用 sequence**（sequence 需 per (type,entity) 動態 DDL 在請求路徑上）
- **D4** `status` 建 enum **不建轉換強制**（M5）—— docstring 明寫「轉換今天沒有被任何東西擋住」
- `multi-tenant-data.md` 鐵律 1 **擴充 identity 為第三類**（規則檔本身被本 phase 改寫）

---

## 未做 / 刻意不做

- **`user.repository.ts`** 🚧 —— 解封 **M4**。checklist 2.2 未刪未勾
- **`Role` / `Permission`** —— M4，零消費者
- **`is_active`** —— 不建（derived flag）
- **`status` 的轉換強制** —— M5
- ⚠️ **稽核軌跡** —— M3。本 phase 新增的寫入路徑**同樣沒有稽核**，R4 敞口再擴大一格。
  `created_by`/`updated_by` **永遠是 NULL**，因為填佔位使用者會讓 M3 的稽核問題**用謊話被回答**
- **`ref_code` 的 prefix 縮寫從未被規格化**（`02a:89` 用 `RISK`，交付物 `03:110` 用 `RSK`）
  → 由各 repository 自宣告，**歧義刻意保持可見**而非發明一份登記表

---

## Calibration

`spike` 第 3 個資料點：bottom-up 9 / committed 5.9 (mult 0.65) / **actual 4.79 hr 牆鐘 / ratio 0.81 IN band**。

⭐ **價值不在數字**：這是第一個**在 plan 起草時就先宣告量測定義、再照著量**的點
（W02 是人力工時估計、W03 是事後回推）。
**有效樣本數其實是 1，第一次真正的 3-phase 窗口要到 W06。** 行動 KEEP 0.65。

---

## 誠實標記

**API-level verified against a clean process** —— 真進程 + 真 PostgreSQL + 真 RLS，
11 案例 + 2 組元驗證。
**不是「可用」**：沒有 UI，沒有人透過 UI 用過它。W01–W04 至今**零 UI drive-through**。
