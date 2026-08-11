# Phase W05 Progress

**Phase**: W05 — M1 slice 2: the asset-based risk chain
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W05-m1-asset-risk-chain`

---

## Day 0 — 2026-08-11 — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-ratingband** ⭐⭐ | **`rating_*` 不是 `score_*` 的別名，是另一個概念，而我在 plan 裡把它當成命名漂移。** `score_before`/`score_after` 是 **1–25 整數**（`02a:194-195`）；`rating_inherent`/`rating_residual` 是**分帶**（`02a:405` "computed from the configured matrix"，`03:90` / `08:25` 皆寫 `∈ {High, Critical}`）。⚠️ **旗艦儀表板數的是分帶不是分數**（`02a:414` · `08:25`）| ⛔ **但本 phase 仍不建 `rating_*`**，三個獨立理由：(a) `02a` §3 的 Risk 欄位規格**只列 `score_*`**，沒有 `rating_*` 欄位；(b) **`02a:405` 與 `:429` 互相矛盾** —— 405 說它是 derived、429 說「risk owner **enters** it，系統*可以*建議」；(c) `02a:429` 本身就是**開放決策 #5，明訂 "Confirm before M7"`。→ 建了就是替一個未拍板的決定選邊 | 🟡 記錄 → plan §8 加一列風險 |
| **D-riskscales** ⭐ | **`risk_scales` 只存在於 `multi-tenant-data.md:65`，`02a` 與任何設計文件從未提過它。** 全 repo 除該行與 W05 自己的 pre-doc 外**零命中** | ⭐ **這讓 D2-C 的理由比原本更強**：今天建它不只是零消費者（AP-5），還得**自行發明它的欄位** —— 直接違反已確認參數 #9「不得自行發明欄位」。D2 拍板為 C 是對的，但**理由要換成這一條** | ✅ 強化既有裁決 |
| **D-tablename** | `multi-tenant-data.md:**63**`（plan 寫 `:61`，**行號本身漂移**）寫 `threat_library` / `vulnerability_library`；`02a:30` 的 §0 索引寫 `Threat` · `Vulnerability` | D4 已拍板依 `02a` → `threats` / `vulnerabilities`。**同時更正 `:63`**。⚠️ 順帶記：plan 引用的兩個行號（`:61` `:62`）**都不準**，實際是 `:63` `:65` —— Risk Class D 的形狀（plan 引用路徑靠猜），這次是行號 | 🟢 修正引用 |
| **D-entityindex** | 五個實體**全部已在 `02a` §0 索引表上**：`Risk`（`:29`）· `Threat`·`Vulnerability`（`:30`）· `AssetGroup`·`Asset`（`:31`）| ✅ **§0 不需修改**，plan §3.0 的判斷成立。⚠️ **第一次 grep 回報 0 命中是我 pattern 錯了** —— §0 把成對實體寫在**同一格**（`` `Threat` · `Vulnerability` ``），而我用 `^\| \`X\` \|` 要求獨佔首格。**零命中先證明搜對地方**（`feedback_evidence_must_support_claim`） | ✅ 確認 |
| **D-w04shape** | W04 design note §2/§3 的**八個 `file:line` 錨點逐條解析** —— 全部命中預期內容（`User:115` · `RefCodeCounter:147` · `ref-code:97` upsert · `policy.repository:104` validate · `:117` issueRefCode · `int.spec:117` 案例 2b · `:241` 40 並發 · `scoped-client.types:78`）| ✅ **藍本未漂移**，可作為本 phase 的複製來源。US-6 的裁決有可靠起點 | ✅ 確認 |
| **D-orphanclaim** | `schema.prisma:164-166` 的 W04 docstring 寫著 "Risk carries four FKs to tables **this phase does not build** (Asset, Threat, Vulnerability)" | 本 phase 建完就是 orphan claim（AP-7）。**Day 2 改 `Policy` docstring 時必須同時更新** —— 與 W04 的 `D-userfk-comment` 完全同形狀 | 🟢 Day 2 待辦 |
| **D-devdb** ⭐ | `isms_dev` **5 目錄 / 5 列 / 全 applied**，且**五個 sha256 checksum 逐一相符** | ⭐ **`AD-MigrationChecksum-1` 的直接對策生效**：W04 只驗 `applied=true` 而在 Day 2 撞到 checksum 不符；本次把比對升級為「內容一致」，起點乾淨 | ✅ 確認 |
| **D-adrnum** | ADR 目錄有 `0001/0004/0005/0006/0007/0010/0011/0012`；`ADR-0013` 全 repo 零命中（W05 pre-doc 除外） | ADR-**0013** 可用。⚠️ `0002/0003/0008/0009` 是**有主題的預留**，不可填（`AD-ChNumber-1`） | ✅ 確認 |
| **D-baselines** | lint **0** · type **0** · format **0** · unit **86** · int **34** · web **10** · build **0** · `run_all` **6/6** · `lint:negative` PASS（**18 檔 0 bypass 3 allowlisted**）· coverage **94.11 / 90.42 / 92.45 / 94.76** | **與 plan §0 記載完全相符**，W04 closeout 之後無漂移 | ✅ |

### Prong 覆蓋

- **Prong 1（path）**: 10 個路徑（NEW 5 · EDIT 5）+ `CH-020` 佔用（**grep 全 repo 的引用，不是 `ls`**）
  + ADR 編號，**0 個漂移**
- **Prong 2（content）**: 5 個 plan 宣稱驗證，**2 個實質發現（`D-ratingband` · `D-riskscales`）
  + 1 個引用錯誤（`D-tablename` 行號）**
- **Prong 2.5（child tree）**: **N/A** —— 無前端工作
- **Prong 3（schema）**: 五個實體在 `prisma/` **僅命中 W04 的註解**（無 model）· migration head + checksum，
  **0 個漂移 + 1 個待處理的 orphan claim**

> ⭐ **Prong 2 連續第三個 phase 是唯一有實質產出的 prong**（W03 / W04 / W05）。
> 而本次它抓到的是**我自己在 plan 裡寫錯的一個概念** —— `rating_*` 被我當成 `score_*` 的舊名。
> 若沒抓到，W05 會交付一組儀表板讀不到的欄位，而**每一項 gate 都會是綠的**。
>
> ⚠️ **本次 Day-0 我自己犯了兩個「證據不支持結論」的錯**，都在第一次嘗試時：
> (a) `grep -c "🔴 P0"`（審計 #3）與 (b) `D-entityindex` 的成對格 pattern —— **兩次都是零命中，
> 兩次都是搜錯地方**。零命中的正確反應是先問「它如果存在會長什麼樣」。

### Go / No-Go

**範圍變動**: **~5%** → **繼續 Day 1**

`D-ratingband` 與 `D-riskscales` 都**不改變交付內容**，而是**強化既有裁決的理由**並新增一條 §8 風險。
`D-tablename` 只是修正引用行號。依 `day0-plan-verify.md` 鐵律，**不改 plan §3 Technical Spec**，
改動加進 **§8 Risks**。

### 時間

依 `AD-CalibrationMetric-1` 的定義（W04 起實施）：`actual` = branch base `a2b1906`
→ closeout commit 的牆鐘跨度，`git log` 機械導出。Day 4 retro Q2 填入。

### Remaining for Next Day

- Day 1 全部（⛔ **第一件事是 Prisma generated column 的 drift 探測** —— D1-A 的成立條件）
- ⛔ **Day 1 必須做但不在原 checklist 上的一件事**：`plan.md` §8 加入 `D-ratingband` 的風險列
  （儀表板讀分帶、本 phase 只交付分數）→ ✅ **Day 0 收尾時已加**（`plan.md:325`）

---

## Day 1 — 2026-08-11 — 拍板評分與校準的落點 (US-2, US-3)

### 1.a ⛔ D1-A 的成立條件 —— Prisma × generated column（13 個探測）

> **問題**：Prisma 無法在 `schema.prisma` 表達 `GENERATED ALWAYS AS ... STORED`。
> 那個欄位只能寫在 migration SQL 裡 —— 而 W02–W04 手寫進 migration 的 RLS / trigger / GRANT
> **不是欄位**，所以 Prisma 從不抱怨。這次是**欄位**，性質不同。
>
> 探測全部在**隔離的 throwaway DB**（`isms_w05_probe` / `isms_w05_probe_shadow` /
> `isms_w05_probe2`）上跑，**不碰 `isms_dev`**，跑完即 `DROP DATABASE`。
> 這是 `AD-DbBuildPathParity-1` 的反面應用：**探測不該汙染被驗證的庫**。

#### 第一組：Prisma 的 diff 引擎看不看得見它

| # | 探測 | 結果 |
|---|------|------|
| **R1** | `diff(活庫, schema 宣告為 plain `Int?`)` | ❌ **非空** —— 吐 `ALTER TABLE "probe_risks" ALTER COLUMN "score_before" DROP DEFAULT;`（它把 generation expression 讀成一個 DEFAULT）|
| **R2** ⭐ | 把 R1 吐的那句 SQL 真的執行 | ✅ **硬錯誤**：`column "score_before" of relation "probe_risks" is a generated column` + `HINT: Use ... DROP EXPRESSION instead`。**不是靜默剝離** |
| **R3** ⭐ | `prisma db pull` 對 generated column 的描述 | Prisma **自己**寫成 `@default(dbgenerated("(lkh × GREATEST(...))"))` |
| **R4** | `diff(活庫, R3 的 `dbgenerated` 逐字文字)` | ✅ **空**（`--exit-code` = 0）|
| **R5** ⛔ | `diff(活庫, `dbgenerated` **少一對外層括號**)` | ❌ **非空** —— 吐 `SET DEFAULT ...`。**expression 是逐字比對，不是語意比對** |
| **R6** ⭐ | `diff(**`--from-migrations` shadow DB**, R3 的文字)` | ✅ **空** —— 這是 `migrate dev` **實際走的路徑**，與活庫路徑一致 |
| **R7** | 手寫的 `CHECK` constraint 在四次 diff 中 | ✅ **完全不出現** —— Prisma 不管 check constraint（`db pull` 明說 "not supported by Prisma Client"）|

**R6 的意義**：R1–R5 走的是 `--from-config-datasource`（活庫），那只是**代理指標**。
`migrate dev` 真正做的是「用 migration **檔案**建 shadow DB → introspect → 比對 datamodel」。
兩條路徑分別量過且一致，才算答完（`feedback_evidence_must_support_claim`）。

**⇒ D1-A 成立**，但附帶一條**強制實作形狀**：

> ⛔ `schema.prisma` 的該欄位必須寫成 `Int? @default(dbgenerated("<expr>"))`，
> 且 `<expr>` **必須逐字等於 PostgreSQL 正規化後的形式**。
> **取得方式**：`SELECT pg_get_expr(adbin, adrelid) FROM pg_attrdef ...` ——
> 實測它與 `prisma db pull` 吐的字串**逐字相同**。
> ⚠️ **不要用 `prisma db pull` 取** —— 它會覆寫整個 `schema.prisma`，
> 本專案那 30 行 file header 與大量 `///` docstring 會被吃掉（`///` 保留、`//` 不保留，已實測）。

**R1/R2 合起來的失效模式**：若 `dbgenerated` 寫錯或漏寫，下一個 phase 的
`migrate dev` 會把一句**必然執行失敗**的 SQL 寫進**新的** migration。
吵而不是靜默 —— 但它**每次 migration 都復發**，且下一個 session 不會知道為什麼。

#### 第二組：derived 欄位彼此相依（原 plan 未預見）

`02a:196` 的 `acceptance_status` 與 `in_it_risk_register` 都 derived，而且都依賴 `score_*`。

| # | 探測 | 結果 |
|---|------|------|
| **S1** ⛔ | generated column 引用**另一個** generated column | ❌ `cannot use generated column "score_after" in column generation expression` / `DETAIL: A generated column cannot reference another generated column` |
| **S2** | 改成**重複整段公式**而非引用 `score_after` | ✅ 可建；15 → `f`、20 → `t` |
| **S3** | **enum 型別**的 generated column（`acceptance_status`）| ✅ 可建 |
| **S4** ⭐⭐ | 來源欄位**全 NULL**（`02a:348` 生命週期保證會出現）時的 derived 值 | ⚠️ `score` → NULL · `in_it_risk_register` → **NULL**（不是 `false`）· `acceptance_status` → **`acceptable`** ⛔ |
| **S5** | NULL-propagating 修法（`CASE WHEN lkh IS NULL THEN NULL WHEN ... END`）| ✅ 未評分列三個 derived 全 NULL；15→acceptable/f · **16→requires_treatment/t** · 20→requires_treatment/t |
| **S6** | all-or-none `CHECK` 對 **after** 組 | ✅ 全空接受 · 全填接受 · **部分填寫拒絕**（`DETAIL` 顯示 `..., 8)` —— **generated column 先算完才輪到 CHECK**，這正證明 P2 的洞是真的，CHECK 才是堵住它的東西）|

> ⭐⭐ **S4 是本日最有價值的發現，而且它是一個我本來會出貨的錯誤。**
> `CASE WHEN score >= 16 THEN 'requires_treatment' ELSE 'acceptable' END` 是最自然的寫法，
> 而 `NULL >= 16` 是 NULL，**落進 ELSE** —— 於是一筆**尚未做控制後評估**的風險
> 會被記成 **`acceptable`**。那不是預設值，那是一個**平台自己捏造的治理主張**。
>
> 同一形狀第二次出現：Day 0 的 **P2**（`GREATEST` 忽略 NULL → 只填 2 個 impact 仍算出 20）
> 也是「部分填寫的列產生看似合理的錯值」。
> **兩次都是 derived 欄位在生命週期中途被問到時說謊。**
> → 三張表的 derived 欄位一律採 **S5 的 NULL-propagating 形式** + **S6 的 all-or-none CHECK**，
> 兩者都要有負面測試（US-5）。

### 1.b D1–D4 拍板（使用者 2026-08-11，於 plan §3.1 核可）

| # | 裁決 | 理由（Day-1 量測後的版本）|
|---|------|------|
| **D1** | **A —— generated column + all-or-none CHECK** | 呼叫者**物理上寫不了**分數（Day-0 P3 硬錯誤）；M8 滾升要能 `ORDER BY score`。**前置條件已於 R1–R7 證明可滿足** |
| **D2** | **C —— 常數 + ADR-0013 記錄落點** | 參數 #7 約束的是**機制不是時程**。⭐ Day-0 `D-riskscales` 把理由從「零消費者 AP-5」升級為「**建它就得自行發明欄位**」（違反參數 #9）|
| **D3** | **A —— `enum(7)`** | 無效狀態（全 false）**不可能表達**；今天沒有查詢需要按單一 CIA 成分過濾（YAGNI）。**S3 證明 enum 也能當 generated column 的型別**，未來不封路 |
| **D4** | **`threats` / `vulnerabilities`（依 `02a`）** | CLAUDE.md 權威排序：**設計文件 > 規則檔**。同時更正 `multi-tenant-data.md:63` 的鏡誤名稱 —— 那份規則檔是**下位**，不是第二個真相來源 |

⚠️ **D2 的一個未解副作用**（Day-1 量測後才浮現）：閾值 16 若是 D1-A 的 generated column，
它就**焊死在 migration SQL 裡**，改閾值要 migration。這與 D2-C「常數」一致（都不可設定），
但兩者的**解封成本不同** —— TS 常數改一行，generated column 改要 migration + 回填。
→ 寫進 **ADR-0013 的代價欄**，不要讓它變成第 20 張表才被發現的隱性假設。

### 1.c ⭐ 一個 plan 與我都沒考慮過的選項，量完才知道要否決

S1 說 generated column 不能引用另一個 generated column，於是公式必須**重複四次**
（`score_before` · `score_after` · `acceptance_status` · `in_it_risk_register`），
再加 `schema.prisma` 的四個 `dbgenerated` 鏡像 = **8 處**。
那個代價大到值得問：**能不能把公式包成一個 `IMMUTABLE` SQL 函式，讓四個欄位引用同一份？**

| # | 探測 | 結果 |
|---|------|------|
| **T1** | generated column 呼叫 user-defined `IMMUTABLE` 函式 | ✅ 可以。公式塌縮成 **1 處** |
| **T2** ⭐ | 函式加 `RETURNS NULL ON NULL INPUT`（STRICT）後餵部分填寫 | ✅ `(4,2,NULL,NULL,NULL,NULL)` → **NULL**，不是 8。**直接堵住 P2 的洞**，且不依賴 CHECK |
| **T3** ⛔⛔ | 在有 generated column 相依的情況下 `CREATE OR REPLACE FUNCTION` | ⛔ **成功**。PostgreSQL 既不擋、也不重算、也不警告 |
| **T4** ⛔⛔ | T3 之後的資料狀態 | ⛔ **同一組輸入 `(4,2,5,1,3,1)`，舊列讀 20、新列讀 16**。一張表裡並存兩個世代的公式，**沒有任何東西標示哪列是哪個** |
| **T5** | `pg_get_expr` 對函式形式的正規化文字 | `score_before` **無**外層括號、`in_register` **有** —— 再次證明**必須逐欄讀實際文字，不能推**（R5 的同一課） |

> ⛔ **T3/T4 是否決 D 的全部理由，而且它是量出來的不是想出來的。**
> `CREATE OR REPLACE FUNCTION` 在 migration 裡看起來就是一句例行維護，
> 而它會**靜默地**把一張合規表分裂成兩個公式世代 ——
> 那正是 D1-A 存在的目的（derived 不可能與來源分歧）被從側門推翻。
> inline 形式沒有對應漏洞：改 inline expression 要走
> `ALTER COLUMN ... SET EXPRESSION`，**會重寫整張表並重算每一列**。
>
> ⭐ **公式出現在 8 處是可讀性代價；一個欄位裡有兩個世代的公式是合規事故。**
> 選 inline，並用機械手段補可讀性：`risk-score.ts` 匯出正規化文字，
> 整合測試對每一欄的 `pg_get_expr` 斷言。

### 1.d D5 / D6 —— 量測逼出的兩個新決定（使用者 2026-08-11 拍板）

plan §3.1 只列了 D1–D4。下面兩個是**實作 D1-A 時才浮現**的，不在原 plan 上。

| # | 問題 | 裁決 | 理由 |
|---|------|------|------|
| **D5** | D1-A 拍板後，`risk-score.ts` 的純函式還有什麼角色？ | **B —— 不做 TS 算術** | 實測 W05 主流量**沒有一處**需要在 TS 算這個乘積（寫入 DB 算、讀取 DB 回、排序篩選都是 SQL）。重算一次 = AP-6 + AP-1。改放**驗證 + 閾值常數 + 公式正規化文字**，三樣都有真實消費者 |
| **D6** | 未評分風險的 derived 欄位應該說什麼？ | **A —— 三態，NULL = 尚未評估** | S4 量到最自然的 `CASE ... ELSE 'acceptable'` 會**捏造治理主張**。`02a:343-353` 保證 Identified / AssessedBefore / Treated 三個狀態都沒有 after 分數 → 那些列必然存在。guardrail 1 的直接應用 |

⚠️ **D5 是 plan §3.3 的記錄型偏離**（R3）：§3.3 字面寫「純函式
`score(lkh,{...}) => lkh * max(...)`」，實作交付的是 `validateScoreSet()`。
**US-3 的實質未縮減** —— 「會抓到公式錯誤的測試」改由 Day 2 的整合測試承擔，
且它打在公式**真正住的地方**（generated column），比 TS 副本更強。
已加進 plan §8。

### 1.e 交付 (US-3)

| 檔案 | 內容 |
|---|---|
| `apps/api/src/core-model/risk-score.ts` | **刻意不含算術**。`validateScoreSet()`（1–5 值域 + all-or-none，錯誤帶欄位名）· `RiskScoreValidationError` · `TREATMENT_THRESHOLD` · `scoreExpression(phase)` |
| `apps/api/src/core-model/risk-score.spec.ts` | **21 個案例**，負面為主 |

⭐ **形狀不是新設計的，是接上 `extension-validator.ts`**：那裡的分工
（DB trigger 是權威、應用層是早一步的結構化錯誤 + 明說 AP-6 由「中性化後第二層仍成立」擋著）
與本檔對 generated column / CHECK 的分工**逐條同構**。
→ **US-6 的第一個資料點：W04/W03 的形狀確實可複製。**

### 1.f 順路發現並修正的漂移

| 發現 | 處置 |
|---|---|
| ⛔ **`docs/14-adr/README.md` 索引漏了 ADR-0005 與 0012**（兩份皆已採納）| ✅ **當場補**（正在編輯同一張表，加 0013 而留兩個洞 = 讓我自己的編輯背書一份不完整的索引）|
| ⛔ **同檔「尚待撰寫」仍列著已採納的 ADR-0005**，且三個計數互相矛盾（散文 5 份 / 註記 6 份 / 表格 5 列）| ✅ **當場修**為 **4 份**（0002/0003/0008/0009），並加註 0012/0013 不佔用那四個有主題的預留 |
| `BACKLOG.md` §Open 計數 | 實測 **58**（P0 **5** · P1 **35** · P2 **18**）。⚠️ 審計 #3 記的 P1 34 / P2 17 **各差一** —— 既有計數漂移，非本次造成，未追 |

> 兩條 ADR 索引漂移**不開 CH**：它們是我正在編輯的那張表本身的事實錯誤，
> 屬「阻塞當前工作」例外（節流閘 §Step 0.0），且合計 4 行。

### 1.g Gate（Day 1 partial —— 逐項實際輸出）

| Gate | 結果 |
|---|---|
| `npm run test -w apps/api` | ✅ **13 suites / 107 tests passed**（baseline 86 → **+21**）|
| `npm run lint -w apps/api` | ✅ exit **0** |
| `npm run type-check -w apps/api` | ✅ exit **0** |
| `npm run format:check -w apps/api` | ✅ exit 0（⚠️ 第一次 **fail** —— `risk-score.spec.ts` 兩個物件字面值需換行；`prettier --write` 後綠）|
| `python scripts/lint/run_all.py` | ✅ **6/6 passed** |

⚪ `test:int` / `web` / `build` / `lint:negative` **本日未跑** —— Day 2 full gate 才要求。
**不寫「都過了」**。

### 1.h ⛔ Day 2 開場必須先答的一件事

`02a:196` 只給了**一個** `acceptance_status`，卻沒說它算的是哪一組分數：

- 若算 **before** → 一筆 before=20 / after=9 的風險，做完控制後仍永遠讀「requires treatment」
- 若算 **after** → 它與 `in_it_risk_register` 變成**同一個述詞**，兩個欄位完全冗餘
- 若算 `COALESCE(score_after, score_before)` → 兩個欄位各有意義，且對應 `02a:141` 的兩句話
  （「≥16 需建立控制」講 inherent、「殘餘仍 ≥16 進登記冊」講 residual）

第三種讀法最說得通，**但它是推論不是 spec 陳述**。⛔ **不自行選**，Day 2 開場呈報。

### Remaining for Next Day

- **Day 2 全部**（五張表 + migration + repository + 端點 + 範疇測試）
- ⛔ **開工前先答 §1.h 的 `acceptance_status` 基準分數問題**
- ⛔ **Day 2 的 migration 程序有一條硬性順序**（由 R3/R5 導出）：
  先寫 migration SQL → apply → **`SELECT pg_get_expr(adbin, adrelid)` 逐欄取正規化文字**
  → 手工貼進 `schema.prisma` 的 `@default(dbgenerated("..."))`
  → **`prisma migrate diff --exit-code` 必須回 0** 才算完。
  ⚠️ **絕不用 `prisma db pull` 取那段文字** —— 它會覆寫整個 schema 檔並吃掉 `//` header
- `schema.prisma:164-166` 的 W04 docstring（"tables this phase does not build"）
  建完五張表就是 orphan claim → **同一個 commit 內更新**（Day-0 `D-orphanclaim`）
