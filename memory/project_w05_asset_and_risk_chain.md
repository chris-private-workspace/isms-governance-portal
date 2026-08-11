# W05 — M1 slice 2: the asset-based risk chain

**Phase**: W05 · **Period**: 2026-08-11（Day 0–4，單日）· **Status**: **`closed_partial`** ——
MERGED PR #36（rebase，main head `700f5d6`，14:56 +0800），六個 required check 全 SUCCESS。
⚠️ `closed_partial` 而非 `closed`：AC-4 的 `AssetGroup`/`Asset` 四項範疇測試未達成
（兩張表無端點，硬造測試專用寫入路徑違反約束 2）→ **slice 3 的 `POST /assets` 同一個 PR 補齊**
**Authority**: `docs/01-planning/W05-m1-asset-and-risk-chain/retrospective.md`（完整 retro）
**Change record**: `docs/03-implementation/changes/CH-020-w05-asset-and-risk-chain.md`
**ADR**: `docs/14-adr/0013-risk-scoring-and-calibration.md`（已採納，4 條可證偽條件）

---

## 交付了什麼

已確認參數 **#7**（`LKH × MAX(FIN,BOP,LRY,REP,SIS)`，≥16 需處理）與 **#8**（資產基礎評估）
從散文變成 runtime：

- **5 張表**：`asset_groups` · `assets` · `risks`（entity-scoped，RLS + FORCE）·
  `threats` · `vulnerabilities`（全域庫，**引用** `multi-tenant-data.md` 既有清單而非新增例外）
- **4 個 generated column** + 4 個 CHECK：`score_before` / `score_after` /
  `acceptance_status` / `in_it_risk_register` —— 呼叫者**物理上寫不了**
- `POST /risks` · `GET /risks`；`risk.repository.ts` 是**第二個範疇化 client 消費者**
- 累計實體 **2 → 7 / 35**（M1 DoD 仍未達成，其餘 28 張表是 slice 3..N）

**Gate**: unit 138（+52）· int 54（+20）· web 10 · lint/type/format 0 · build 0 ·
`run_all` 6/6 · `lint:negative` PASS（22 檔 0 bypass 3 allowlisted，**allowlist 未增加**）·
coverage 94.13 / 92.17 / 94.36 / 95.03（四項全高於 baseline）

⚪ **無 UI → 一律 API-level verified**。W01–W05 累計 **零 UI drive-through**。

---

## ⭐ 四個值得記的東西

### 1. 一個看起來更好、量完才知道要否決的選項

generated column **不能引用另一個 generated column**，公式因此重複 8 處。
包成 `IMMUTABLE` 函式可以塌縮成 1 處 —— 純粹的可讀性勝利。

> ⛔ `CREATE OR REPLACE FUNCTION` 在有相依 generated column 時**成功、不重算、不警告**。
> 同一組輸入 `(4,2,5,1,3,1)`，**舊列讀 20、新列讀 16**，沒有任何東西標示哪列是哪個。
> **公式出現在 8 處是可讀性代價；一欄兩世代是合規事故。**

改 inline expression 要 `ALTER COLUMN ... SET EXPRESSION`（**會重寫全表並重算每一列**），沒有對應漏洞。

### 2. `CASE ... ELSE 'acceptable'` 會讓平台捏造一個治理主張

`NULL >= 16` 是 NULL，落進 `ELSE` → 一筆**尚未做控制後評估**的風險被記成 `acceptable`。
`02a:343-353` 保證那些列必然存在（Identified / AssessedBefore / Treated 都沒有 after 分數）。
→ 四個 derived 欄位一律 NULL-propagating。**guardrail 1 的直接應用。**

同一形狀第二次：`GREATEST` **忽略 NULL**，只填 2 個 impact 仍算出看似合理的分數 →
all-or-none CHECK 是 D1 成立的**必要條件不是加分項**。
證據在錯誤訊息裡：拒絕列的 `DETAIL` 顯示 derived 已算出 **8**。

### 3. FK 檢查繞過 RLS

單欄 FK 可以**成功**指向一列你看不見的資料（Day 2 U1 實測）。
→ entity-scoped 表之間的 FK **一律複合** `(fk, org_entity_id)`。
順帶：複合 FK 對「不存在的 id」與「看不見的 id」給**一字不差的同一句錯誤** → 天然 oracle-safe。

### 4. ⭐⭐ 元驗證找到真缺口 —— 新表的 RLS 被上游代勞

三張表的 RLS 全部中性化成 `USING(true)` 後，「跨實體寫入被拒」的測試**仍然是綠的**。
原因：`repo.create()` **先**經過 `issueRefCode`，拒絕它的是 **W04 的** `ref_code_counters` policy。

> 那個測試證明的是 **counter** 會拒絕，不是 `risks` 會拒絕。
> **`risks` 自己的 `WITH CHECK` 零覆蓋 —— 拿掉它，每一項 gate 仍然全綠。**

**處置是修不是記**：新增 int 11b（繞開 repository、不帶 `ref_code`、直接寫），
**在 RLS 仍中性化的狀態下重跑 → 11b 轉紅**。缺口關上**且證明關上了**。
→ W04「發號路徑成了別人保證的一部分」**同形狀第 2 次** → `AD-BorrowedRefusal-1`。

---

## US-6 — W04 七個不變式的裁決（本 phase 對 slice 3 最有價值的產出）

**可複製 6 · 不適用 1 · 需調整 0** → 維持 feature continuation，**不改判 spike，不補 design note**
（改判門檻是「需調整 ≥3」，在最寬鬆的讀法下也只有 2）。

| # | 裁決 |
|---|---|
| 2.1 全域 vs entity-scoped 的判準 | ✅ 可複製（+需加：FK 繞過 RLS，表之間的 FK 要複合）|
| 2.2 序號單語句配發 | ✅ 可複製零修改（+需加：每張新表要有繞開發號的直接寫入測試）|
| 2.3 發號在插入前、驗證在發號前 | ✅ 可複製（且多承載一件：分數驗證排最前，最便宜最可能錯）|
| 2.4 拒絕點會移動，oracle 防護要在新位置重新成立 | ✅ 可複製 —— **最該從「事實」升級為「程序」**；已第三次移動 |
| 2.5 `ref_code` 永不由呼叫者提供 | ✅ 可複製，且 `score_*` 是**更強的版本**（DB 硬錯誤，不只型別）|
| 2.6 回填與 counter 同一個變更 | ⚪ 不適用（全新表無列可回填），但仍是活的 |
| 2.7 schema 層權限 | ✅ 可複製，且**第一次真的在 reset 路徑上驗過** |

**拒絕點三次移動**：W03 policy insert（42501）→ W04 counter upsert（42501）→
**W05 複合 FK（23503）**。W05 的 checklist **預先登記了「記下它這次落在哪」**，那是對的做法。

---

## Calibration ⛔ 定義在這裡破了

- `pattern-reuse-feature` **第 1 個資料點，但標記為「定義受污染」**
- bottom-up 14 hr → committed 7.0 hr (mult 0.50) → actual **15.20 hr（字面）/ 4.86 hr（修正）**
- 字面 ratio **2.17（OVER ×2）**、修正 ratio **0.69（UNDER，差 0.006）**
- ⚠️ 數字是 closeout commit 落地後從 `git log` 回讀的；先寫的估計給 0.71 (IN)，
  **真實時間戳把 band 翻成 UNDER** → 照 W04 `5bb0c9f` 先例單獨開 commit 修正
- ⚠️ merge 用 rebase → SHA 改寫（`f9195da` → `8f08f3f`）。**算術未受影響** ——
  rebase 保留 **author date**（14:23:25），改的是 committer date（14:56:00），而這裡量的是 author date

> `actual` = branch base → closeout 的定義裡，**base 是前一個 phase 的 closeout commit**，
> 不是本 phase 的起工時刻。W04 恰好背靠背在同一個晚上，前提成立而沒人看見它；
> W05 跨了一夜，那個前提就把 **10h20m 的睡眠算成工時**。
> **不是量錯，是定義從一開始就內含一個沒被寫出來的前提。** → `AD-CalibrationMetric-2`

⚠️ 修正值是**下界**（plan 起草在第一個 commit 之前，時點不可機械導出）。
⚠️ 修正定義套回 W04 會讓 0.81 變 0.66 —— **沒有改它**，重算已登記的點是決定不是整理。

---

## 三次「證據不支持結論」的自我攔截，全部靠機制不是仔細

1. **FK 探測的 fixture 用了 `...0000h0`** —— `h` 不是合法 hex，HK1 那列從未插入，
   於是「0 列跨實體連結」長得跟「FK 拒絕了」一模一樣。
   **是 U0 那格刻意寫了 expect 值的 sanity 檢查拆穿的。**
2. **API 走查腳本印出來像通過的** —— PowerShell hashtable `+` 遇重複鍵 throw，
   四個案例根本沒執行而 `$r` 保留上一輪值。**它甚至印了 `A8 == A9 ? True`**，
   而那行讀起來正是 oracle 檢查通過。修法是 **每案帶 nonce**，不是「小心一點」。
3. **template1 的 ACL 一度誤判為「沒給 `isms_app` 任何東西」** ——
   **讀 AD 全文**才知道 `=U` 就是那條繼承。

---

## 漏做的兩件事，以及它們的共同形狀

D4 拍板句寫「**同時**更正 `multi-tenant-data.md:63`」、plan §4 列了 `02a` 裁決註記 ——
兩者 Day 2 都沒做，**Day 4 用 `git diff --name-status` 對照 plan §4 才抓到**。

> **它們都寫在「決定的句子裡」，而決定句沒有勾選框。** → `AD-DecisionSideEffect-1`

---

## Carryover

- `AssetGroup` / `Asset` 的四項範疇測試 → **slice 3 的同一個 PR**
  （兩張表沒有端點，硬造測試專用寫入路徑違反約束 2）
- `AD-RiskBand-1` → **M8 之前必須拍板**（儀表板數的是分帶不是分數，而 `02a` 自相矛盾）
- **稽核軌跡** → M3。`RISK_REGISTER` R4 敞口從 W02 兩張表 → W04 四張 → **W05 七張，無一有稽核**
- `AD-ClaudeMdBudget-1` **觸發條件已成立** —— headroom 剩 **215 bytes**

**這個 phase 沒有關掉任何 AD。** `AD-RiskForm-1`（P0）從「無標的可對」變成有標的可對，
但那不是關閉。
