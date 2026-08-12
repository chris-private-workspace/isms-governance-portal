# W06 — M1 slice 3: the control library, and the test that measured the wrong half

**Phase**: W06 · **Period**: 2026-08-11 ~ 2026-08-12（Day 0–4）· **Status**: **`closed`** —— MERGED PR #41（rebase，main head `3a3606b`）
**Authority**: `docs/01-planning/W06-m1-control-and-asset-endpoints/retrospective.md`（完整 retro）
**Change record**: `docs/03-implementation/changes/CH-021-w06-control-and-asset-endpoints.md`
**ADR**: `docs/14-adr/0014-row-level-entity-scope-and-per-command-policies.md`（已採納，4 條可證偽條件）
**Design note**: `docs/02-architecture/design-notes/W06-row-level-scope.md`

---

## 交付了什麼

`Control` 是本 repo **第一張範疇屬於「列」而非「表」的表**（`02a:217` 的 `applies_to_scope`）。
其餘每張表都是 scoped 或 global，`Control` 兩者皆非。

- **`controls`** + 5 個 enum + **三條 per-command policy**：
  `SELECT` 寬（含 group 分支）· `INSERT`/`UPDATE` 窄且**拒 `group` 值** · **無 `FOR DELETE`**
- **三個寫入端點**：`/controls` · `/assets` · `/asset-groups`
  —— 後兩者是 **W05 checklist 2.4 🚧 的解封事件**
- `CLAUDE.md` 結構性瘦身：headroom **196 → 1,521**（關 `AD-ClaudeMdBudget-1`）

---

## D1：三個形狀，實測後只有一個活著

throwaway 庫、PostgreSQL 18、16 個案例。呼叫者 HK1，group 列的擁有者 SG1：

| 動作 | A 單一 `FOR ALL` | B nullable（`extension_fields` 逐字）| **A′ per-command** |
|---|---|---|---|
| 讀別人的 group 列 | ✅ | ✅ | ✅ |
| **刪它** | ⚠️ 成功 | ⚠️ 成功 | ⛔ 0 rows |
| **自建** group 列 | ⚠️ 成功 | ⛔ 42501 | ⛔ 42501 |
| **升格**自己的列 | ⚠️ 成功 | ⛔ 42501 | ⛔ 42501 |
| **奪取** | ⚠️ 成功 | ⚠️ 成功 | ⛔ 0 rows |

**三個決定性的量測**：

1. **`DELETE` 沒有 `WITH CHECK`** —— 只看 `USING`，而那正是為了讀而放寬的一半。
   今天沒爆是因為**沒有一張表授予 `DELETE`**，不是因為 RLS。
2. **A 與 B 都擋不住奪取** —— `USING` 放行（還是 group）、`WITH CHECK` 放行（新持有者是我）。
   ⚠️ 這個洞**現在就存在於 `extension_fields`** → `AD-GroupRowTheft-1`。
3. **缺席的 per-command policy 是全拒，比窄 policy 更嚴格** ——
   **故意授予 `DELETE`** 後量到：無 `FOR DELETE` policy 時連自己的列都刪不掉（0 rows）。
   所以 `controls` **不寫**第四條，而且它讓這張表不再依賴 GRANT 姿態被維持。

⛔ **B 的豁免不可移轉**：`extension_fields` 是 catalog，沒有持有者要記錄；control 有。
NULL 持有的 control 回答不了「誰對它負責」—— 那正是 M3 稽核軌跡存在的目的。

---

## ⭐ 元驗證找到的真缺口（本 phase 最貴的一課）

中性化 `assets` / `asset_groups` 的 `WITH CHECK` → **整個 suite 78/78 全綠**。

根因**直接量到**，不是推論 —— `WITH CHECK (true)` 下同一句 INSERT：

| 形式 | 結果 |
|---|---|
| 帶 `RETURNING`（Prisma `create()` 一定會發）| **拒絕** `new row violates row-level security policy` |
| 拿掉 `RETURNING` | **`INSERT 0 1`，列真的落地** —— HK1 持有，由 SG1 範疇的連線寫入 |

**PostgreSQL 把 SELECT policy 套用在要回傳的那一列上。** 所以三個「繞開發號」測試
（含 **W05 條款 2** 的形狀、以及它複製的 W05 int 11b）證明的是
**讀的 policy 藏住了那一列**，從來不是寫的 policy 拒絕了它。

⚠️ **不是現存外洩** —— `WITH CHECK` 是對的；壞掉的是**測試察覺它壞掉的能力**。
**修法**：`createMany` 不發 `RETURNING`。**驗收不是它綠，是中性化後它會紅**（0 紅 → 2 紅）。

> **一條規則能被完整遵守卻仍然無效。** 條款 2 正是為了防 `AD-BorrowedRefusal-1` 而在 W05 追加的，
> Day 2 照它做了三個測試，三個都沒做到它宣稱的事。

⚠️ 一個前置事件讓這個發現成立：另一組中性化因 anchor 重複而**靜默空跑**卻印出漂亮的綠色。
正因為看到了它，**「零轉紅」才沒有被照單全收** —— 重跑時改成跑完直接查 `pg_policies`。

---

## US-6 裁決

**W05 兩條條款**：條款 1（跨實體 FK 一律複合）**夠用** —— W06 給了它負載，中性化退化成單欄 FK
2 個測試轉紅。條款 2 **需再加**（見上），新版文字在 retro §US-6。

**W04 七不變式（第二次負載）**：**可複製 6 / 需補充 1 / 不適用 0**。
補充的是 2.7：**權限檢查在 RLS 之前** —— `deleteMany` 得到的是 `permission denied`，
語句根本到不了 policy 層。這個順序決定了一個測試證明的是哪一層。

---

## 量測與 gate

- unit **192 / 19 suites**（baseline 138/15）· int **81 / 6**（baseline 54/4）· web 10 · build 0
- coverage **93.35 / 92.47 / 95.74 / 94.56**。⚠️ 第一次量四項全低於 baseline，**未當作過關**：
  先證明 branch 的退步**不是計數假象**（排除 `*.module.ts` 數字一模一樣），再補 6 個**帶主張**的測試
  → branch 與 funcs 超過 baseline；stmts/lines 的差額**已量測歸因**（排除 module 檔為 98.96/99.10）
- **API-level verified**（真進程 + 真 PostgreSQL + 真 RLS）。⚪ 無 UI → **drive-through 不適用**，
  W01–W06 的零 UI drive-through 記錄不變
- ⭐ 最乾淨的一格證據：以 `DEV_PRINCIPAL_ENTITIES=HK1` 重啟後，
  `GET /controls` **看得到 SG1 的 group 列、看不到 SG1 的 local**，
  而同一個進程的 `GET /asset-groups` **只給 HK1 自己的** —— 兩種 policy 形狀並排，行為不同

---

## ⛔ Calibration：無有效 actual

`spike` 0.65 的第 4 個資料點，**但沒有 ratio**。逐字套用 `AD-CalibrationMetric-2`
（branch 第一個 commit → closeout commit）得到 ≈2.09，而中間**跨了一夜約 16.3 小時**。
新定義只修掉了「上一個 phase 的 closeout 當 base」，**沒有處理閒置區間**，第一次套用就被擊中。

⭐ **根因不是量尺壞了，是我沒用量尺** —— `task-workflow.md` §Step 5 要求 progress.md
逐日記逐任務工時，W06 一次都沒記。⚠️ **W04 的 calibration-log 已預告過這件事**。
→ `AD-CalibrationNoActual-1`：**先修執行不要再改定義**。

---

## Carryover

- `risks` 的 int 11b 仍是舊形狀 → `AD-ReturningMasksCheck-1`
- `applies_to_scope = subtree` **未建且今天建不了** —— scope 只向下展開，永不含祖先
- **group control 沒有 runtime 編寫路徑** —— `00:59` 承諾的 library，這一片交付的是讀與共用
- 稽核軌跡：`RISK_REGISTER` R4 敞口 **7 → 8 張表**，且三條路徑**同時變成真的可達**
