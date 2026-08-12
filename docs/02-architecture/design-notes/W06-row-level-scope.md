# W06 Design Note — row-level entity scope, and what a "bypass" test was actually testing

**Purpose**: Spike-extract design note from Phase W06；記錄**逐列範疇**（ADR-0014）與
元驗證揭露的 `RETURNING` 遮蔽效應的已驗證 runtime invariant，供 M1 slice 4..N 與
**每一張未來有共用列的表**複製。

**Category / Scope**: Architecture / Phase W06（M1 slice 3）
**Created**: 2026-08-12
**Last Modified**: 2026-08-12
**Status**: Active

> **Modification History**
> - 2026-08-12: Initial creation (Phase W06) — extracted from the shipped slice

> ⚠️ **這份 note 是 extract 不是 pre-write。** 每一條不變式都對應已合併的實作與可重現的驗證指令；
> 沒有實作支撐的東西一律放在 §4「延後、未驗證」，不放進主段落。

---

## 0. Spike Summary

W06 起手時歸類為 `pattern-reuse-feature`（0.50）—— 判斷是「`Control` 只是第 6 張表」。
**Day 1 的量測推翻了這個歸類**：D1 拍板的形狀（A′，per-command policies）是本 repo
**第一個非單一 `FOR ALL` 的 policy**，plan §1/§7 早就寫好的改判條件因此成立
→ 改判 `spike` 0.65 並補這份 note。

三個問題被真的答了，兩個是我原本沒打算問的：

1. **逐列範疇要什麼形狀？** —— 單一 `FOR ALL` **做不到**「大家讀得到、只有持有者寫得到」。
2. **不寫 policy 比寫一條窄的更嚴格嗎？** —— **是**，而且差別是「全拒」與「窄範圍內允許」。
3. ⭐ **「繞開發號的直接寫入」測試到底在測什麼？** —— **不是它宣稱的那個東西**（§2.4）。

---

## 1. Decision Matrix

### D1 —— `applies_to_scope` 的範疇語義（→ **ADR-0014**）

實測於 PostgreSQL 18、throwaway 庫、以 `isms_app_user`（非 owner 非 superuser）連線，
16 個案例各自 `BEGIN`/`ROLLBACK`。呼叫者 HK1，group 列的擁有者 SG1。
原始輸出：[`d1-rls-probe.out`](../../01-planning/W06-m1-control-and-asset-endpoints/artifacts/d1-rls-probe.out)。

| 動作 | **A** 單一 `FOR ALL`<br>（`org_entity_id NOT NULL` + 欄位標記）| **B** nullable，NULL = group<br>（`extension_fields` 逐字）| **A′** per-command ⭐ 選這個 |
|---|---|---|---|
| 讀別人的 group 列 | ✅ | ✅ | ✅ |
| 改它（只改 title）| ⛔ 42501 | ⛔ 42501 | ⛔ 0 rows |
| **刪它** | ⚠️ **成功** | ⚠️ **成功** | ⛔ 0 rows |
| **自建**一列 group | ⚠️ **成功** | ⛔ 42501 | ⛔ 42501 |
| **升格**自己的列 | ⚠️ **成功** | ⛔ 42501 | ⛔ 42501 |
| **奪取** | ⚠️ **成功** | ⚠️ **成功** | ⛔ 0 rows |
| 負向對照：改／插自己的列 | — | — | ✅ 通過 |

**選 A′ 的具體理由**：唯一把四個實測的洞全關掉、且負向對照仍然通過的形狀。

**否決其他選項的理由**：

- **A** —— 四個洞，其中兩個（自建 / 升格）讓任何單一 OpCo 能代表全部 13 家發言。
  選它等於「schema 宣稱在強制群組邊界，實際上靠慣例」。
- **B** —— 在**業務表**上打破約束 8 鐵律 1，而 `extension_fields` 的豁免**不可移轉**：
  catalog 沒有持有者要記錄，control 有。NULL 持有的 control 回答不了「誰對它負責」——
  那正是 M3 稽核軌跡存在的目的。且它把範疇永久壓成兩態，`subtree` 從此無法表達。
  ⚠️ **它並非沒有優點**：自建與升格是**免費**擋掉的（三值邏輯的副作用，不是我們的紀律），
  而且是唯一有 production 里程的形狀。它輸在持有者與鐵律 1，不是輸在 RLS。
- **C（延後）** —— `02a:413` 整條規則無處落腳，且砍掉 `00:59` 的 Wave 1 承諾之一。

### D2 / D3 —— 兩個值域

**照抄 `02a:124`（`frequency`，7 值）與 `02a:123`（`nature`，3 值）。**
`09:54` 重述 `nature` 的三個值，視為**重述非獨立權威**（它是畫面 brief）。
⚠️ `AD-AssetScales-1`（不建未定義值域的欄位）的先例**不適用** —— 那條管的是「規格沒定義」，
而這兩個規格都定義了。

---

## 2. Verified Invariants

### 2.1 US-3 — 單一 `FOR ALL` policy 表達不了「讀寬寫窄」

**不變式**：當一張表的**讀**範疇比**寫**範疇寬時，policy **必須**依命令拆開。

**為什麼**：`UPDATE` 與 `DELETE` 的**選列**用的就是那個為了讀而放寬的 `USING`。
放寬讀 = 同時放寬了寫的作用範圍，而 `WITH CHECK` 只約束**結果列**、管不到**選了哪些列**。

**實作**：`apps/api/prisma/migrations/20260811093148_control_library/migration.sql:118`
（`controls_read`，寬）· `:126`（`controls_insert`，窄）· `:130`（`controls_update`，窄）。

**Failure mode**：把三條合回一條 `FOR ALL` → 跨實體**奪取**與**刪除**恢復成功，
而任何只斷言「讀得到 group 列」的測試仍然全綠。

**Verification**：`npm run test:int -w apps/api`
→ `control.int.spec.ts:198`（奪取，`count 0`）· `:123`（讀得到）· `:135`（RLS 在 client 層獨立成立）。

**Test fixture**：`apps/api/test/int-global-setup.js` `SEED.controls` —— 三筆，
**第三筆是 `applies_to_scope=group` 且由 OWNER 連線種入**（應用程式寫不了它，見 2.3）。

---

### 2.2 US-3 — **缺席的 per-command policy 是全拒，比窄 policy 更嚴格**

**不變式**：RLS 開啟後，**沒有對應 policy 的命令一律拒絕所有列**，包含呼叫者自己的列。

**為什麼重要**：直覺會想「四條 policy 才完整」。實測相反 ——
**缺席 = 全拒；窄 policy = 窄範圍內允許**。所以 `controls` **不寫** `FOR DELETE`。
額外好處：這張表因此**不依賴 GRANT 姿態被維持**（`AD-GroupRowTheft-1` 記的正是
「今天沒爆是因為 GRANT 不是因為 RLS」）。

**量測條件（關鍵）**：**故意授予 `DELETE`** 才量得到 policy 層 —— 否則權限檢查先擋，
看到的是 `permission denied` 而不是 RLS。
原始輸出：[`d1-rls-probe2-default-deny.out`](../../01-planning/W06-m1-control-and-asset-endpoints/artifacts/d1-rls-probe2-default-deny.out)
N1（刪自己的列 → `DELETE 0`）· N2（刪別人的 → `DELETE 0`）· N3/N4（`SELECT`/`UPDATE` 不受影響）。

**實作**：`migration.sql:135`（明文寫「不要補第四條，那會**放鬆**這張表」）· `:106`（不授予 `DELETE`）。

**Failure mode**：有人「補齊」一條窄的 `FOR DELETE` 並加上 `GRANT DELETE`
→ 自己的列變成可刪，且與 guardrail 3（退役是欄位不是刪除）衝突。

**Verification**：`control.int.spec.ts:241` / `:252`
⚠️ **這兩個測試只證明 GRANT 層拒絕，不是 RLS** —— 見 §4 的分界說明。

---

### 2.3 US-3 — group 標記的**可偽造性**決定了要不要在 `WITH CHECK` 裡防它

**不變式**：當 group 身分是**寫入者可控的欄位值**時，`WITH CHECK` 必須**明文拒絕該值**；
當它是 NULL 時，三值邏輯已經免費擋住。

**實作**：`migration.sql:126` / `:130` 的 `AND "applies_to_scope" <> 'group'` —— 兩處都有。

**後果（產品層，必須說出口）**：**沒有任何實體能透過應用程式建立 group-shared control。**
group 列由 migration 或尚不存在的 admin 路徑種入 —— 與 `extension_fields:77-79` 的既有姿態一致。
`00:59` 承諾 group-shared control library，**這一片交付的是讀與共用，不是編寫**。

**應用層對應**：`apps/api/src/core-model/control.repository.ts:152` —— `CreateControlInput`
沒有 `appliesToScope` 也沒有 `effectiveness`。**只有一個合法值的欄位不是欄位。**

**Verification**：`control.int.spec.ts:160`（自建 → 42501）· `:198`（升格 → 拒絕）。

---

### 2.4 ⭐⭐ US-5 — **`RETURNING` 讓 SELECT policy 遮蔽 `WITH CHECK`**

**這是本 phase 最重要的一條，而且它推翻了一條我們自己在 W05 立的規則。**

**不變式**：一個「繞開發號、直接寫入別人實體」的測試，**若經由 Prisma 的 `create()`**，
證明的是**讀的 policy 藏住了那一列**，**不是**寫的 policy 拒絕了它。

**量測**（`WITH CHECK (true)` 之下，對 `assets` 發同一句 INSERT）：

| 形式 | 結果 |
|---|---|
| `INSERT … RETURNING ref_code` | `ERROR: new row violates row-level security policy` |
| **同一句，拿掉 `RETURNING`** | **`INSERT 0 1`** —— 列真的落地，`org_entity_id` 是 HK1，由 SG1 範疇的連線寫入 |

**根因**：Prisma 的 `create()` 一定發 `RETURNING`，而 PostgreSQL 會把 **SELECT policy**
套用在要回傳的那一列上。

**怎麼發現的**：元驗證把 `assets` 與 `asset_groups` 的 `WITH CHECK` 中性化成 `true`，
**整個 suite 仍然 78/78 全綠**。⚠️ 在此之前另一組中性化因為 anchor 重複而**靜默空跑**
卻印出漂亮的綠色，所以這次的「零轉紅」**沒有被照單全收** ——
重跑時直接查 `isms_test` 的 `pg_policies` 確認編輯真的進了資料庫，才開始找根因。

**修法**：`createMany` 不發 `RETURNING`。
`control.int.spec.ts:318`（12c）· `asset.int.spec.ts:269`（6c，`asset_groups`/`assets` 各一）。

**驗收（不是加完就算）**：重跑同樣兩個中性化 →
`controls_insert` 由 **1 紅變 2 紅**、資產鏈由 **0 紅變 2 紅**。

**Failure mode**：`WITH CHECK` 被移除或改錯 → 跨實體的列靜默落地，而**每一項 gate 全綠**。

⚠️ **不是現存外洩** —— 今天的 `WITH CHECK` 是對的。壞掉的是**測試察覺它壞掉的能力**。

⚠️ **`risks` 的 int 11b 有同一個缺陷，本 phase 未修**（不在範圍）→ `AD-ReturningMasksCheck-1`。

---

### 2.5 US-4 — 複合 FK **會拒絕**，且對「不存在」與「不是你的」給逐字相同的錯誤

W05 建了這條 FK 卻沒有寫入路徑可以讓它開火；W06 是它的第一個負載。

**實作**：`apps/api/src/core-model/asset.repository.ts:181` —— 23503 → `UnknownReferenceError('asset group')`，
**只帶欄位名，不帶 id，也不帶是哪一種原因**。

**Verification**：`asset.int.spec.ts:171`（兩種原因的 `message` **逐字相同**）·
API-level：走查 A8/A9 皆 `404 asset group not found`。

**中性化證明**：複合 FK 退化成單欄 FK → `asset.int` 4 與 5 **轉紅**。

---

### 2.6 US-4 — 同一個檔案的兩個方法收**不同形狀**的 client，是 oracle 的型別級防線

**不變式**：能先讀父表的 repository，就有能力分辨「不存在」與「不是你的」。
**不給它那個 delegate**，是讓這件事**寫不出來**而不只是「不建議」。

**實作**：`scoped-client.types.ts:116`（`ScopedAssetGroupClient`，有 `assetGroup`）·
`:134`（`ScopedAssetClient`，**沒有**）→ `asset.repository.ts:103` vs `:147`。
runtime 是同一個物件，差別只在型別。

**Verification**：`npm run type-check -w apps/api`（合併兩個介面即 compile error）
＋ `asset.repository.spec.ts` 的來源檢查（擋 `(client as any).assetGroup` 這種型別繞過）。

---

## 3. Cross-Scope Contracts

| 契約 | 供給方 | 消費方 | 形狀 |
|---|---|---|---|
| `ScopedControlClient` | `entity-scope`（結構相符，非 import）| `core-model` | `scoped-client.types.ts:103` |
| `ScopedAssetGroupClient` / `ScopedAssetClient` | 同上 | 同上 | `:116` / `:134` —— ⛔ **不可合併**，見 2.6 |

⚠️ 沒有新的跨範疇**登記表**條目 —— 這三個介面沿用 W03 建立的「core-model 宣告它需要的形狀」
技術，不是新契約類型。

---

## 4. Open Invariants（延後，**未驗證**）

⛔ 以下**沒有**在本 phase 被驗證，不得當作已知成立：

- **RLS 的 `DELETE` 全拒在本 repo 的測試套件裡無法觀察** —— `isms_app` 沒有 `DELETE` 授權，
  權限檢查先擋。`control.int.spec.ts:241`/`:252` 斷言的是 **`permission denied`（GRANT 層）**。
  RLS 那一半只由 §2.2 的 throwaway 量測承載，**不在常駐測試中**。
  → 若哪天授予了 `DELETE`，需要一組新測試。
- **`applies_to_scope = 'subtree'`** —— 未建，且今天**無法**建：
  `entity-scope.resolver.ts:120-142` 的 scope 只向下展開（roots + descendants），
  **永不含祖先**。需要 policy 內的祖先查找，而那正是 `02a:146` 的 materialised `path` 要避開的。
- **group control 的 runtime 編寫路徑** —— 不存在（見 2.3）。需要 group 層 principal，M4 之後。
- **稽核軌跡** —— 本 phase 三條寫入路徑**皆無稽核**（M3）。
- **`Risk ↔ Control` 連結** —— M7。⚠️ 它**不能**用複合 FK：`02a:413` 讓 group control
  連結任何實體的 risk，兩個 `org_entity_id` 本來就會不同。`controls` 因此**刻意沒有**
  `@@unique([id, org_entity_id])`。

---

## 5. Rollback / Fallback

| 要退什麼 | 怎麼退 | 估計成本 |
|---|---|---|
| **A′ 三條 policy** | `DROP POLICY` ×3 → 建一條 `FOR ALL`；`applies_to_scope` 留著不讀 | ~0.5 天（`controls` 是唯一使用者時）|
| **整個 `Control`** | migration 反向；`app.module.ts` 移除 `ControlModule` | ~0.5 天 |
| **`createMany` 測試（2.4）** | ⛔ **不要退** —— 退了就回到「測試無法察覺 `WITH CHECK` 被移除」 | — |

**回滾窗口**：實務上在**第二張表複製這個形狀之前**。每多一張表，成本線性上升 ——
那正是現在就把它定下來的理由。

**Fallback 是否已存在**：是 —— 單一 `FOR ALL` 形狀在 `policies` / `risks` / `assets` /
`asset_groups` 上仍在運行，退回去不需要新機制。

---

## 6. References

- **ADR**: [`0014`](../../14-adr/0014-row-level-entity-scope-and-per-command-policies.md)（本 note 的決策層）
- **Change record**: [`CH-021`](../../03-implementation/changes/CH-021-w06-control-and-asset-endpoints.md)
- **Phase 四件套**: [`W06-m1-control-and-asset-endpoints/`](../../01-planning/W06-m1-control-and-asset-endpoints/plan.md)
- **原始量測**: `W06-*/artifacts/d1-rls-probe.{sql,out}` · `d1-rls-probe2-default-deny.{sql,out}`
- **前一片的 note**: [`W04-user-and-base-fields.md`](./W04-user-and-base-fields.md)（七不變式 —— 本 phase 是它的第二次負載）
- **規格**: `02a:217`（`Control` 九欄）· `02a:413`（group control 的連結規則）· `00:59`（Wave 1 承諾）
