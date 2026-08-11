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
  建完五張表就是 orphan claim → **同一個 commit 內更新**（Day-0 `D-orphanclaim`）→ ✅ Day 2 已改

---

## Day 2 — 2026-08-11 — 五張表與端點 (US-1, US-4)

### 2.a ⛔ 開工前先量的一件事：FK 檢查會不會繞過 RLS

`risks` 有三個 FK，其中 `asset_id` 指向另一張 **entity-scoped** 表。
如果 FK 檢查繞過 RLS，一個 SG1 的 principal 就能把風險掛到猜中的 HK1 資產上。
**這是先量再設計，不是先設計再驗證。**

| # | 探測 | 結果 |
|---|------|------|
| **U0** | sanity —— SG1 看得見幾列 parent | 1（**上一輪這格是 0**，見下方紅字）|
| **U1** ⛔ | 單欄 FK 參照看不見的列 | **成功建立** —— FK 檢查確實繞過 RLS |
| **U2a** ✅ | 複合 FK `(parent_id, org_entity_id)` 同樣嘗試 | **拒絕** |
| **U2b** ✅ | 同實體的合法連結 | 照常成立（`INSERT 0 1`）|
| **U3** ⭐ | 不存在的 id vs 看不見的 id | **一字不差的同一句錯誤** —— 複合 FK 同時是 oracle-safe |

> ⛔ **第一次跑的 U0/U1/U2 全部無效，而它們看起來是通過的。**
> 我在 fixture 裡用了 `...0000h0` 當 UUID —— `h` 不是合法 hex，HK1 那列**從來沒被插入**。
> 於是 U1 回報「0 列跨實體連結」，長得跟「FK 拒絕了」一模一樣。
> **是 U0 這個 sanity 格顯示 `0`（應為 1）才拆穿的。**
> → 這是 `feedback_evidence_must_support_claim` 的教科書案例，
> 而擋住它的不是仔細，是**那一格刻意寫了 expect 值的 sanity 檢查**。

**⇒ 三張 entity-scoped 表之間的 FK 一律複合。** 這是 約束 8 要求的，不是加分項。
`assets → asset_groups` 與 `risks → assets` 各帶 `org_entity_id`；
`risks → threats/vulnerabilities` 維持單欄（全域庫沒有實體軸）。

### 2.b 交付：五張表 + migration

`20260811024841_asset_and_risk_chain/` —— Prisma 產出 195 行，**手寫再加 ~130 行**
（generated columns · CHECK · GRANT · RLS · extension triggers）。

**三個由 `02a` 機械導出、不是我選的結果**：

| 結果 | 導出自 |
|---|---|
| `status` **只有 `risks` 有** | `02a` §1.1 定義 status 為「per the entity's state machine (§4)」，而 §4 只有 **Policy / Risk / Issue / ControlTest** 四條。替 Asset 發明一條就是參數 #9 |
| `extensions` **只有三張 entity-scoped 表有** | `validate_extensions()` 在 `:112` `:116` `:140` 無條件引用 `NEW.org_entity_id`。掛到全域表是 runtime error —— **被迫，不是偏好** |
| `threats`/`vulnerabilities` **無 `ref_code`** | 發號走 entity-scoped 的 counter，全域表沒有實體可發。與 W04 的 `users` 殊途同歸 |

**兩個 02a 列名但未定義值域的欄位**（D8）：`Asset.value` / `Asset.criticality` **不建**，
schema docstring 列出它們是刻意缺席並寫明為何不能借用 `02a:116` 的 5 點量表
（那是 risk **impact** 的描述子，不是資產價值）→ `AD-AssetScales-1`。

**一個 02a 重複命名的欄位**：`asset_owner_user_id`（`02a:208`）**不另建欄** ——
§1.1 已有 `owner_user_id`「Accountable owner」，兩欄一義是模組自行發明共用定義（guardrail 3）。
`custodian_user_id` **有**建，因為保管人是另一個人做另一件事。

### 2.c ⭐ R5 那條硬性順序，實際跑過一次

| 步驟 | 結果 |
|---|---|
| 1. 寫 migration SQL → `migrate dev` | 6 列 `_prisma_migrations` 全 applied，5 張表在 |
| 2. `SELECT pg_get_expr(adbin, adrelid) WHERE attgenerated='s'` | `score_before` 正規化為 `(lkh_before * GREATEST(...))` —— **與 `scoreExpression('before')` 逐字相同** |
| 3. ⚠️ `acceptance_status` 是**多行 CASE** | 含換行，不能靠猜怎麼塞進 `dbgenerated("...")` → **問 Prisma 自己**（`db pull --print` 到 scratch 檔）→ 它把換行逸出成 `\n` |
| 4. 貼進 `schema.prisma`（**逐字複製，不重寫**）| 四個欄位 |
| 5. ⭐ **`migrate diff --from-migrations --to-schema --exit-code`** | **exit 0 / "This is an empty migration."** —— R5 的逐字比對陷阱機械證明不成立 |

⚠️ **`db pull` 只跑在 scratchpad 的副本上**，真的 `schema.prisma` 一次都沒被它碰過
（R3 量過：它會吃掉 `//` header）。

### 2.d 對真 DB 寫入並讀回（checklist 2.1 第二項）

| 案例 | `score_before` | `score_after` | `acceptance_status` | `in_it_risk_register` |
|---|---|---|---|---|
| 未評分（Identified）| NULL | NULL | **NULL** | **NULL** |
| 只有 inherent 4×MAX(2,5,1,3,1) | **20** | NULL | requires_treatment | NULL |
| 治理後降到 9 | 20 | **9** | **acceptable** ← 自動翻轉 | f |
| 殘餘恰好 16 | 25 | **16** | requires_treatment | **t** |
| 殘餘恰好 15 | 25 | **15** | acceptable | **f** |

**五個拒絕案例**，⭐ **其中兩個的錯誤訊息本身就是證據**：

| # | 嘗試 | 拒絕者 | 訊息裡的證據 |
|---|---|---|---|
| W1 | 部分填寫 before 組 | `risks_before_all_or_none` | ⭐ `DETAIL` 顯示失敗列的 score 已算出 **8** —— `GREATEST` 忽略 NULL 算了 4×2。**CHECK 是唯一堵住 P2 的東西** |
| W2 | `lkh_before = 7` | `risks_before_band` | ⭐ `DETAIL` 顯示已算出 **35** —— 超出 `02a:119` 的 1–25。**band CHECK 才是讓值域成真的東西，不是裝飾** |
| W3 | 呼叫者自帶 `score_before` | PostgreSQL | `cannot insert a non-DEFAULT value into column "score_before"` |
| W4 | HK1 的風險掛 SG1 的資產 | `risks_asset_id_org_entity_id_fkey` | 複合 FK |
| W5 | `UPDATE` 清空半組 | `risks_before_all_or_none` | 更新路徑同樣受保護 |
| W6 | `UPDATE lkh_after 3→5` | —— | derived **自動重算** 9 → 15 |

探測列已清除（`ref_code` 未經 counter 發號，留著會撞號 —— W04 migration header 警告的那個 bug）。

### 2.e ⭐ 拒絕點確實移動了（Day 3 checklist 3.2 預告的那件事）

W03 量到 RLS 的 `WITH CHECK` 先於 FK 求值，所以 `org_entity_id` 的
「不存在」與「不是你的」都塌縮成 42501。**但那是 row 自己的實體。**

`asset_id` 不同：**風險自己的實體在範疇內，RLS 通過**，然後複合 FK 以 **23503** 拒絕。
→ `scope-refusal.ts` 加了第二個偵測器。⚠️ **假設只有一個碼會讓這條路徑變成 500。**

兩個偵測器**互不重疊**有專門的測試 —— 若任一個同時匹配兩個碼，
catch block 的先後順序就會靜默決定呼叫者看到哪個錯誤。

### 2.f 交付清單

| 檔案 | 範疇 | 說明 |
|---|---|---|
| `prisma/schema.prisma` | core-model | +5 model +6 enum；`Policy` docstring 的 orphan claim 已改 |
| `prisma/migrations/20260811024841_*/migration.sql` | core-model | 表 + 4 個 generated column + 4 個 CHECK + RLS + GRANT + 3 個 trigger |
| `core-model/risk.repository.ts` + `.spec.ts` | core-model | **第二個範疇化 client 消費者**（W04 失去的那個證明機會）|
| `core-model/scoped-client.types.ts` | core-model | `ScopedRiskClient`；⭐ **catalog 那半抽出來** —— 第二個消費者出現才抽，這正是 AP-5 的解法 |
| `core-model/scope-refusal.ts` + `.spec.ts` | core-model | 23503 那一半 |
| `modules/risk/{controller,module,int.spec,controller.spec}.ts` | modules | `POST /risks` · `GET /risks` |
| `bootstrap/app.module.ts` | bootstrap | 掛 `RiskModule` |
| `test/int-global-setup.js` | 測試基礎建設 | 資產鏈 seed，**兩個實體各一份** |

⭐ **US-6 的第二、三個資料點**：`ScopedRiskClient` **不暴露** `asset` delegate ——
能先讀 asset 表的 repository 就有能力分辨「不存在」與「不是你的」。
**不給那個 delegate，是讓它寫不出來而不是被勸阻。**

### 2.g Gate（Day 2 full —— 逐項實際輸出）

| Gate | 結果 | baseline |
|---|---|---|
| `lint`（api+web）| ✅ **0** | 0 |
| `type-check`（api+web）| ✅ **0** | 0 |
| `format:check`（api+web）| ✅ **0** | 0 |
| `test`（unit）| ✅ **15 suites / 138 tests** | 86 → **+52** |
| `test:int` | ✅ **4 suites / 53 tests** | 34 → **+19** |
| `test`（web）| ✅ **10** | 10 |
| `build`（api+web）| ✅ **0** | 0 |
| `run_all.py` | ✅ **6/6** | 6/6 |
| `lint:negative` | ✅ PASS —— **22 檔 0 bypass 3 allowlisted** | 18 檔 3 allowlisted → **allowlist 未增加** ✅ |
| coverage | ✅ **94.13 / 92.17 / 94.36 / 95.03** | 94.11 / 90.42 / 92.45 / 94.76 —— **四項全部高於 baseline** |

⚠️ **coverage 第一次量是 91.06 / 87.15 / 91.54 / 91.61 —— 低於 baseline。**
沒有當作「門檻過了就算」帶過。缺口在 `risk.repository.ts` 的 catch block 與
`isUnknownReference`（整合測試有跑到，但 coverage run 不含它們）。
補的三組測試**不是為了數字**：整合測試證明**資料庫產生那個 SQLSTATE**，
單元測試證明**這一層把它對映到哪個 domain error** —— 兩個不同的主張。
`risk.repository.ts` / `scope-refusal.ts` 現在 **100%**。
`*.module.ts` 的 0% 是既有模式（`policy.module.ts` 同樣 0%），**不是本 phase 新增的洞**。

### Remaining for Next Day

- **Day 3**：clean restart（⚠️ 殺進程前確認是不是我開的）+ API-level 驗證 + 元驗證（US-5）
- ⛔ **Day 3 的元驗證至少三組**：評分公式 MAX→SUM · 三張表的 RLS · derived 一致性機制。
  **弄壞後沒有東西紅 = 缺口不是通過**
- ⚠️ **Day 3 必須在 reset 過的 `isms_dev` 上驗 GRANT**（`AD-DbBuildPathParity-1`：
  CI 的庫從 template1 繼承權限，CI 綠**不涵蓋** GRANT 缺陷）

---

## Day 3 — 2026-08-11 — API-level 驗證與元驗證 (US-5)

⚪ **無 user-facing surface → drive-through 不適用。以下一律是 API-level verified，
不暗示可用性。W01–W05 的零 UI drive-through 記錄不變。**

### 3.a Clean restart —— 兩件事要分開

| 進程 | 判斷 | 處置 |
|---|---|---|
| PID **36748 / 11688** —— `next dev -p 3200`，**啟動於 2026-08-08 20:54** | 追 PPID 鏈到 `npm run dev -w apps/web`，**不是我開的**（三天前）| ⛔ **不碰**（規則 §4；W04 遇到同一個也正確地沒碰）|
| PID **42204 / 28336** —— `prisma migrate dev`，啟動於 **今天 10:50** | 追得到我自己的背景任務 `bjnvcgot3` | ✅ 清掉 |
| Port **3210** | 無人監聽 | 乾淨起 |

⭐ **那個 hang 住的 `migrate dev` 不是無害的殘留 —— 它握著 `isms_dev` 的 advisory lock**，
而它最後一句 query 是 `SELECT COUNT(*) FROM "public"."risks" WHERE "score_before" I...`。

> **它卡在互動式提示上。** 當時 migration 已套用，但 `schema.prisma` **還沒補上四個
> `dbgenerated` 鏡像** —— Prisma 看到 drift、開始數列數準備問「要不要繼續」，而 stdin 是空的。
> **這正是 Day-1 R1 預測的失效模式，在真 repo 裡真的發生了一次。**
>
> → **操作結論**：那個窗口（migration 已套用、鏡像未補）**不要用 `migrate dev`**。
> `migrate deploy` 不互動、不做 drift 提示。Day 2 的順序表要加這一句。

### 3.b `AD-DbBuildPathParity-1` —— 這次真的驗了那條路徑

⚠️ **我差點得出相反結論。** 第一次量 `template1` 的 `public` schema ACL 看到
`pg_database_owner=UC | =U/pg_database_owner`，一度判讀為「沒給 `isms_app` 任何東西」。
**讀了 AD 全文才發現 `=U` 就是那條繼承來的 `GRANT USAGE TO PUBLIC`** —— AD 的前提**成立**。
→ 這是「證據不支持結論」的第三次自我攔截：**先讀原文再下判斷，不要靠對機制的印象。**

⛔ **不 reset `isms_dev`** —— 破壞性操作需要使用者當下的明確文字。
改在 throwaway 庫上**精確重現 reset 路徑**（`DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`），
得到同一份證據而零風險。

| 步驟 | 結果 |
|---|---|
| reset 前 | `public` ACL = `pg_database_owner=UC \| =U/pg_database_owner` |
| reset 後 | ACL = **`(null)`**，`has_schema_privilege('isms_app','public','USAGE')` = **`f`** ← W04 Day 3 撞到 500 的那個狀態 |
| `migrate deploy` 後 | USAGE **`t`** · CREATE **`f`**（只給 USAGE，符合設計）|
| 五張新表的權限 | `asset_groups`/`assets`/`risks` = SELECT+INSERT+UPDATE **無 DELETE** · `threats`/`vulnerabilities` = **SELECT only** · `_prisma_migrations` = 無 |

⭐ **本 phase 的 GRANT 在 reset 路徑上直接量過，不是從 CI 綠推論的。**

⭐ **同時量到 AD 提議的守衛放錯位置**：它建議「int 套件加一個以 app role 斷言
`has_schema_privilege` 的前提檢查」—— 但 `isms_test` 走的是 `CREATE DATABASE` 路徑，
**那條斷言會靠繼承來的權限輕鬆通過**。那正是這條 AD 自己在講的病。→ 回填進 BACKLOG。

### 3.c API-level 走查（真進程 + 真 PostgreSQL + 真 RLS）

Startup log 證明接線生效：`RiskModule dependencies initialized` ·
`Mapped {/risks, GET}` · `Mapped {/risks, POST}` · PID 7364 是 3210 的唯一擁有者。

| # | 案例 | HTTP | observed | intended |
|---|---|---|---|---|
| A1 | 建立（inherent 4×MAX(2,5,1,3,1)）| 201 | `score_before=20` · `ref=RISK-SG1-000001` | 20 **不是 48**（SUM 會給 48）✅ |
| A2 | 讀回 | 200 | `n=1` · `score=20` · `_devPrincipal=True` | ✅ |
| A3 | 呼叫者自帶 `scoreBefore:1` | 201 | `score_before=20` | 送出的 1 到不了任何地方 ✅ |
| A4 | 殘餘恰好 16 | 201 | `score_after=16` · `requires_treatment` · `reg=True` | ✅ |
| A5 | 殘餘恰好 15 | 201 | `score_after=15` · `acceptable` · `reg=False` | ✅ |
| A6 | 未評分 | 201 | **四個 derived 全 null** | 未評估的風險不是 acceptable ✅ |
| A7 | 跨實體寫（row 自己出範疇）| **404** | `org entity ... not found` | RLS 拒絕，**不是 403** ✅ |
| A8 | row 在範疇內、**資產**不在 | **404** | `asset, threat or vulnerability not found` | 複合 FK 拒絕 ✅ |
| A9 | 資產**根本不存在** | **404** | 與 A8 **body 逐字相同** | 無 existence oracle ✅ |
| A13 | **威脅**不存在 | **404** | 與 A8 **body 逐字相同** | 不洩漏是三個裡的哪一個 ✅ |
| A10 | 部分填寫分數組 | **422** | `missing: bop_before, lry_before, rep_before, sis_before` | 不是 500 ✅ |
| A11 | `lkh_before = 7` | **422** | `key: lkh_before` | ✅ |
| A12 | `ciaType = 'x'` | **400** | 列出七個合法值 | ✅ |
| — | 走查後的 `GET /risks` | 200 | `rows=5` · 只有 SG1 · **被拒案例 0 筆落地** | ✅ |

> **A7 與 A8 的訊息不同，而那不是 oracle**：A7 說「你指名的實體找不到」，
> A8 說「你指名的三個參照之一找不到」。**兩句都沒回答「它存不存在」**，
> 而 A8/A9/A13 三者之間逐字相同才是關鍵那一條。

#### ⛔ 第一版走查腳本無效，而且它印出來像通過的

PowerShell 的 hashtable `+` 在鍵重複時 **throw**，於是 A7/A8/A9/A12 的 `Post` **根本沒執行**，
`$r` 保留上一輪的值，腳本把**陳舊的回應**當成本案例的結果印出來 —— 三筆都是同一個
`RISK-SG1-000005`。**更糟的是它印了 `A8 == A9 ? True`** ——
那行讀起來正是 oracle 安全性檢查通過，實際上在比較同一個陳舊值的兩份拷貝。

**修法是結構性的不是「小心一點」**：改成 clone-and-overwrite（重複鍵是正常路徑而非錯誤），
並讓**每個案例的 title 帶自己的 nonce** —— 陳舊回應會直接顯示在輸出裡。

### 3.d ⭐ 元驗證（US-5 —— `AD-NegativeGate-1` 第 8 個實例）

每個「宣稱會擋住某件事」的機制各中性化一次，跑整合套件，記幾個轉紅，還原。

| # | 中性化什麼 | 紅 | 哪些 |
|---|---|---|---|
| **M1** | 評分公式 `GREATEST` → `+`（MAX→SUM）| **4** | 1 公式 · 2 自帶分數 · 4 acceptance · 6 表達式文字釘樁 |
| **M2** | 三張表的 RLS → `USING(true) WITH CHECK(true)` | **3 → 補測試後 4** | 10 跨實體讀 · 14 RLS 獨立 · 15 滾升子樹（**+ 新增的 11b**）|
| **M3** | all-or-none CHECK → `CHECK (true)` | **1** | 8（**繞過應用層直接寫**的那個）|
| **M4** | 複合 FK → 單欄 FK（量測前的形狀）| **2** | 12 跨實體資產 · 13 無 oracle |

⭐⭐ **M2 找到一個真的缺口，這正是元驗證存在的理由。**

RLS 全部中性化後，**測試 11「跨實體寫入被拒」竟然還是綠的**。
原因：`repo.create()` **先**經過 `issueRefCode`，而 `ref_code_counters` 的 RLS 是 W04 的、我沒動。
→ **測試 11 證明的是 counter 會拒絕，不是 `risks` 會拒絕。**
`risks` 自己的 `WITH CHECK` **完全沒有覆蓋** —— 拿掉它，每一項 gate 仍然全綠。

> 這是 W04 那個發現的復發：**「發號路徑成了別人保證的一部分」**。
> 同一形狀第 2 次。

**處置（不是記錄，是修）**：新增 int 測試 **11b** —— 繞開 repository、不帶 ref_code、
直接 `client.risk.create()` 寫一筆 HK1 的列，唯一能拒絕它的只有 `risks` 自己的 policy。
**在 M2 仍然中性化的狀態下重跑，11b 轉紅** → 缺口關上**且證明關上了**（M2 從 3 紅變 4 紅）。

**還原驗證**：`git checkout` 後與中性化前的副本 **逐位元組相同**，
且 `isms_dev` 的 `_prisma_migrations.checksum` 與檔案 SHA256 **仍相符**（`0ae3cd1e…`）。

### 3.e 順帶修的一個 orphan claim

Startup 警告寫的是「**/policies** is scoped by a hard-coded assignment」——
`/risks` 也是，所以那句話因為我的改動變成**比事實窄的宣稱**。
改為「EVERY entity-scoped endpoint」並在註解寫明**不列端點名單**的理由：
會過期的清單比模糊的說法更糟，因為讀者會把遺漏當成資訊。

### 3.f Gate（Day 3 —— 逐項實際輸出）

| Gate | 結果 |
|---|---|
| `test:int` | ✅ **4 suites / 54 tests**（+1 = 11b）|
| `test`（unit）| ✅ **15 suites / 138 tests** |
| `lint` · `type-check` · `format:check` | ✅ **0 / 0 / 0** |
| `run_all.py` | ✅ **6/6** |
| migration checksum vs 檔案 SHA256 | ✅ **相符** —— 四次中性化未留下痕跡 |

### Remaining for Next Day

- **Day 4 closeout**：CH-020 · US-6 七個不變式裁決 · retrospective · calibration ·
  `CALIBRATION-MATRIX` 一行 · 導航檔 · `AD-12b` 模板加一列 · anti-pattern 自檢
- ⚠️ **RISK_REGISTER R4 必須更新** —— 本 phase 新增**三條無稽核的寫入路徑**
- 📌 `isms_dev` 留下走查建立的 5 筆風險（`RISK-SG1-000001..000005`），
  **ref_code 皆由 counter 正常發號**，無撞號風險，刻意保留作為 dev 資料
- 📌 BACKLOG 待回填：`AD-DbBuildPathParity-1` 的兩個新事實（reset 路徑已驗 / 提議的守衛位置無效）
  → ✅ Day 3 收尾時已回填（`BACKLOG.md` 該列 §W05 Day 3 兩件事）

---

## Day 4 — 2026-08-11 — Closeout

### 4.a ⛔ 第一件事就抓到兩個漏做的交付

closeout 的第一步不是寫 retro，是 **`git diff --name-status a2b1906..HEAD` 對照 plan §4**。
**這一步不在原 checklist 上**，成本 < 1 min，而它立刻有產出：

| plan §4 列的 | 狀態 |
|---|---|
| `docs/rules-on-demand/multi-tenant-data.md:63` 表名更正 | ⛔ **沒做** —— Day 1 的 D4 拍板句寫著「**同時**更正」|
| `docs/02-architecture/02a-data-model-spec.md` 的 D1/D2 裁決註記 | ⛔ **沒做** —— plan §4 #14 明列 |

> ⭐ **兩者的共同形狀**：它們都被寫在**決定的句子裡**（「D4 = X，**同時**更正 Y」），
> 而不是 checklist 的一個 `- [ ]` 項。**決定句裡的附帶動作沒有勾選框，所以沒有東西會發現它沒做。**
> 我 Day 1 寫下那句話時是真的打算做，Day 2 寫 migration 時它已經不在任何我會看的清單上。
> → `AD-DecisionSideEffect-1`（含提議：拍板帶附帶動作時當場加 `- [ ]`；closeout 固定跑這個 diff）

**兩者 Day 4 補上**：前者改為 `threats` / `vulnerabilities` 並註明那是**下位文件的鏡誤**；
後者在 `02a` §2 評分模型後加一段「Where this lives, as built」指向 ADR-0013，
含三件下一個讀者需要知道的事（generated column · all-or-none · 未評估讀 NULL 不是 acceptable）。

### 4.b ⭐ 順帶量到：我的改動讓 W04 design note 的行錨全部偏了

Day-0 的 `D-w04shape` 驗過「八個 `file:line` 錨點全部解析成功」。
**我在 `schema.prisma` 加了 5 個 model 之後，其中四組各偏 3–8 行**：

| W04 design note 寫的 | 實際 |
|---|---|
| `schema.prisma:99-134`（`User`）| `:102-142` |
| `schema.prisma:136-162`（`RefCodeCounter`）| `:144-170` |
| `schema.prisma:188-194`（`ref_code`）· `:171-175`（`status`）| `:196-202` · `:179-183` |
| `scoped-client.types.ts:78-84` · `:60` · `:73-77` | `:110-117` · `:63` · `:102-109` |

`check_path_references.py` **驗路徑存在，不驗那一行是不是宣稱的東西**，所以沒有東西會叫。

**分流原則（本次建立，寫進 `AD-DesignNoteAnchor-1`）**：

- **design note 是活參考**（`Status: Active`，明寫供 slice 2..N 複製）→ **造成偏移的 phase 負責重新校準**
- **change record 是歷史快照** → **不追**。追了就是無界工作，而且它本來就是「當時的樣子」

→ W04 design note 已校準（§2.1 / §2.5 / §3 / §4 + MHist 一行）。
順帶在 §3 加了一句：`ScopedRiskClient` **用掉了**那個契約 —— W04 拆出 `ScopedRefCodeClient`
時的預測（「發號器會被每一個業務 repository 使用」）**兌現了**。

### 4.c US-6 —— 七個不變式的裁決（本 phase 對 slice 3 最有價值的產出）

**可複製 6 · 不適用 1 · 需調整 0** → **不改判 spike，不補 design note**。逐條見
[retrospective §US-6](./retrospective.md)。

⚠️ **判準寫死在 retro 裡，因為這個計數必須能被檢查**：2.1 與 2.2 各帶一條**必須新增的條款**，
我判它們「可複製」而非「需調整」，理由是**本 phase 原樣抄了它們而且它們成立** ——
缺的是清單上**還沒有的東西**，不是清單上寫錯的東西。
**就算用最寬鬆的讀法把那兩條算成「需調整」，也是 2 < 3，門檻在兩種讀法下都沒跨過。**

**給 slice 3 的兩條新條款**：
(1) entity-scoped 表之間的 FK **一律複合**；
(2) 每張新的 entity-scoped 表必須有一個**繞開發號**的直接寫入測試。

### 4.d ⛔ Calibration 的定義在本 phase 破了

plan §7 宣告 `actual` = branch base → closeout commit 牆鐘（W04 同定義）。字面套用：

| 量 | 值 |
|---|---|
| base `a2b1906`（**W04 的 closeout commit**）| 2026-08-10 **23:11:12** |
| closeout commit `f9195da` | 2026-08-11 **14:23:25**（`git log` 回讀，非估計）|
| 字面 actual / ratio | **15.20 hr** / **2.17**（OVER band 兩倍以上）|
| 跨夜間隙（base → 本 phase 第一個 commit `785be55` 09:31:41）| **10h20m** |
| 扣除後 / ratio | **4.86 hr** / **0.69**（**UNDER band**，差 0.006）|

⚠️ **先寫下的估計是 `~14:30 → 0.71 (IN)`。** 真實時間戳給 **0.69 (UNDER)** ——
差別小到看起來可以四捨五入掉，**但它跨過了一條判定線**。
照 W04 `5bb0c9f`（"register the number git reports, not the one I estimated"）的先例，
**單獨開一個 commit 修正，而不是留一個「大約對」的數字。**
⚠️ UNDER **不觸發調降乘數** —— 單點依鐵律忽略，何況本點定義受污染。

> **base 是前一個 phase 的 closeout commit，不是本 phase 的起工時刻。**
> W04 恰好背靠背在同一個晚上，前提成立而沒人看見它。**不是量錯，是定義內含一個沒寫出來的前提。**

⚠️ 修正值是**下界**（plan 起草在第一個 commit 之前，時點不可機械導出，**不補估計**）。
⚠️ 修正定義套回 W04 會讓 0.81 變 **0.66** —— **沒有改它**，重算已登記的點是決定不是整理。
→ `AD-CalibrationMetric-2`；本資料點標記「**定義受污染**」，在拍板前不可與未來的點併窗口。

### 4.e Gate（Day 4 final sweep —— 逐項取退出碼，不經 pipe）

| Gate | 結果 | baseline（W04 closeout）|
|---|---|---|
| `lint`（api+web）| ✅ exit **0** | 0 |
| `type-check`（api+web）| ✅ exit **0** | 0 |
| `format:check`（api+web）| ✅ exit **0** | 0 |
| `test`（unit, api）| ✅ **15 suites / 138 tests** | 86 → **+52** |
| `test:int` | ✅ **4 suites / 54 tests** | 34 → **+20** |
| `test`（web）| ✅ **1 file / 10 tests** | 10 |
| `build`（api+web）| ✅ exit **0** | 0 |
| `run_all.py` | ✅ **6/6 passed** | 6/6 |
| `lint:negative` | ✅ PASS —— **22 檔掃描 0 bypass 3 allowlisted**（另跳過 19 test + 2 fixture）| 18 檔 3 allowlisted → **allowlist 未增加** ✅ |
| `test:cov` | ✅ **94.13 / 92.17 / 94.36 / 95.03** | 94.11 / 90.42 / 92.45 / 94.76 —— **四項全高** |

### 4.f 導航檔與 register

| 檔案 | 動作 |
|---|---|
| `CLAUDE.md` | Current Phase **1 行**取代（不加 Prev Phase 列）· ADR 清單 +0013 兩處 · Last Updated |
| `MEMORY.md` + `memory/project_w05_asset_and_risk_chain.md` | 1 條指標 + subfile |
| `BACKLOG.md` | §Shipped 加 W05 一列 · **6 條新 AD** · `AD-NegativeGate-1` 記第 8 個形狀 · §Open 計數 58 → **64（P0 5 / P1 39 / P2 20，機械計數）** |
| `ROADMAP.md` | 第 4 項 slice 1 → **slice 2**，7/35 實體；另記 `AD-RiskBand-1` 卡 M8 |
| `RISK_REGISTER.md` | **R4 更新** —— 敞口 W02 兩張表 → W04 四張 → **W05 七張，無一有稽核**；並明記「緩解措施本身沒有進展」|
| `_templates/phase/retrospective.md.tpl` | ⭐ **AD-12b**：§Closeout Self-Check 加一列 RISK_REGISTER 複查（含理由：**沒有這一列就沒有東西會讓人回頭翻它**）|
| `CALIBRATION-MATRIX.md` / `-LOG.md` | `pattern-reuse-feature` 首列 + 完整敘述 |

⚠️ **`CLAUDE.md` headroom 剩 215 bytes**（29,785 / 30,000）。
`AD-ClaudeMdBudget-1` 的觸發條件（< 500）**已成立**，實測值已回填該 AD ——
**下一個 phase 的 closeout 光是改 Current Phase 一行就可能撞牆**，而那是 CI 會 fail 的硬 gate。

### 4.g 這個 phase 沒有關掉任何 AD

`AD-RiskForm-1`（🔴 P0）從「無標的可對」變成**有標的可對**，但**那不是關閉** ——
對照本身是 M7/M8 的工作。誠實記為未關。

### 4.h Merge（2026-08-11，使用者逐步確認 push → merge）

| 步驟 | 結果 |
|---|---|
| push + `gh pr create` | **PR #36** |
| 開 PR 當下 | `mergeable: MERGEABLE` · `mergeStateStatus: **BLOCKED**`（六個 check pending）|
| CI 完成 | 六個 required check **全 SUCCESS** —— `gates` 1m39s · 映像 build + 啟動探測 1m46s · trivy 28s · SAST 25s · gitleaks 15s · SCA 6s |
| CI 完成後 | `mergeStateStatus: **CLEAN**` —— **擋與放兩個方向都在這個 PR 上觀測到** |
| `gh pr merge 36 --rebase` | `state: **MERGED**` · `mergedAt: 2026-08-11T06:56:01Z` · main head `700f5d6` |

⛔ **`gh pr merge` 沒有輸出任何東西就結束了。** 那不是 merge 成功的證據 ——
另外跑 `gh pr view 36 --json state,mergedAt` 拿到 `MERGED` 才算
（`feedback_verify_pr_merged_via_tool_not_claim`）。

⚠️ **不刪 branch** —— `git ls-remote` 顯示 W02/W04 的 feature branch 都還在，照既有慣例。

⚠️ **rebase 改寫了 SHA**：`f9195da` → `8f08f3f`、`d74d093` → `700f5d6`。
文件內的引用已同步。**calibration 的算術未受影響** ——
`git log --format='%h author=%ad committer=%cd' 8f08f3f` 顯示
author **14:23:25** / committer **14:56:00**，而 §4.d 量的一直是 **author date**。

⚠️ **CI 綠涵蓋的範圍比它看起來窄**：`gates` 的整合測試跑在 `isms_test`（`CREATE DATABASE` 從
template1 複製，**免費繼承** `public` 的 USAGE）→ **這次 CI 綠不涵蓋 GRANT 缺陷**。
本 phase 的 GRANT 是 Day 3 在 throwaway 庫上另外驗的，那份證據**不在這次 CI run 裡**。
同理四個 `dbgenerated` 鏡像的逐字一致性**沒有任何 check 在看**（`AD-SchemaMigrationDrift-1`）。

### 4.i `status:` 翻面 —— `closed_partial` 不是 `closed`

AC-4「約束 8 四項對 `AssetGroup` / `Asset` / `Risk` 成立」**只對 `Risk` 完全成立**。

> ⚠️ **與 W04 砍掉 `user.repository.ts` 不同**：那是 Day 1 核可的範圍縮減（plan §4 標 DROPPED），
> 所以 W04 用 `closed`。這裡是**一條驗收標準沒被滿足** → `closed_partial`。
> 兩者長得像，但「決定不做」與「沒做到」不是同一件事，而 `status:` 是機器可讀的唯一權威。

### Remaining

- **W05 收尾完成。** 下一片是 **M1 slice 3**（`Control` / `SoA` / `ControlTest`），
  且該 PR **必須同時補齊 `AssetGroup` / `Asset` 的四項範疇測試**（本 phase 的 🚧 解封條件）
- ⛔ **`AD-ClaudeMdBudget-1` 觸發條件已成立** —— `CLAUDE.md` headroom 剩 ~200 bytes，
  **下一個 phase 的 closeout 可能光改一行就撞 CI 硬 gate**
