# Phase W06 Progress

**Phase**: W06 — M1 slice 3: the control library and the asset write path
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W06-m1-control-and-asset-endpoints`

---

## Day 0 — 2026-08-11 — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-precedent** ⭐⭐⭐ | **不對稱的 `USING` / `WITH CHECK` 已經存在，而我在 plan 裡寫它「首次」出現。** `extension_fields`（W03，`20260810134319_governed_extensions/migration.sql:80-83`）就是：`USING (org_entity_id IS NULL OR = ANY(scope))` · `WITH CHECK (org_entity_id = ANY(scope))`，且 `:73-79` 的理由**幾乎逐字就是 `Control` 的問題**（「group-wide 的宣告每個實體都可用，但**沒有哪個 OpCo 可以代表其他人宣告它**」）。⚠️ 而 W05 自己的 migration `:350-352` 還寫著「extension catalog differs precisely because it HAS a global half」—— **線索一直在，我沒讀** | ⭐ **改變 phase 的分類**：D1 不是「發明一個新 RLS 形狀」而是「**判斷 W03 的形狀適不適用於一張業務表**」。→ plan §1/§7 的「改判 spike」條件**大概率不成立**，class 維持 `pattern-reuse-feature` 0.50。同時 **D1 的選項 B 有先例了**（NULL sentinel），不再是無中生有 —— 但 `extension_fields` 是 **catalog** 不是業務表，鐵律 1 的豁免理由**未必可移轉**，這正是 D1 要裁決的 | 🔴 **重寫 plan §8 的兩列風險** |
| **D-frequency** ⛔⛔ | **`02a:124` 定義了 `Control frequency` 的完整值域**：`continuous · daily · weekly · monthly · quarterly · annual · event-driven`。plan §0 寫的是「⛔ **全 repo 未定義**（零命中）」 | ⭐ **D2 直接消失**，不需要拍板，照抄 `02a` | 🔴 **plan 斷言錯誤** |
| **D-nature** ⛔ | **`02a:123` 定義了 `Control nature`**：`manual · automated · hybrid`。plan 寫的是「值域**只在** `09:54`（設計交付物）」 | ⭐ **D3 直接消失**。`09:54` 只是重述 `02a`，不是唯一來源 → 沒有權威衝突要裁決 | 🔴 **plan 斷言錯誤** |
| **D-groupscope** | `02a:217` / `02a:**413**`（plan 寫 412，**差一行**）之外另有兩處：**`02-core-data-model.md:26` 把 `org_entity_id` 明列在 `Control` 的欄位清單裡**；`00-project-charter.md:59` 把「group-shared/inherited control library」列為**「不一致的作法」這個痛點的解法之一** | D1 的選項空間被壓縮：**B（nullable）與 `02:26` 的欄位清單衝突**；**C（延後）砍掉憲章列為價值主張的能力**。⛔ **但仍不代選** —— 呈報後由使用者拍板 | 🟡 記錄 → plan §8 |
| **D-w05shape** | W05 retro §US-6 追加的兩條條款，錨點**逐條解析成功**：複合 FK `assets_asset_group_id_org_entity_id_fkey`（`20260811024841_*/migration.sql:214`）· 繞開發號的直接寫入測試（`risk.int.spec.ts:288` "11b. the risks policy refuses a cross-entity write on its own, without the counter"） | ✅ 兩條條款**可作為本 phase 的施工依據**，US-6 的裁決有可靠起點 | ✅ 確認 |
| **D-refprefix** | `02a:**91**`（plan 引用 `:89`，**差兩行**）—— `ref_code` 只說「prefix by type + entity」，**`Control` 沒有指定縮寫** | 比照 `Policy` 自宣告，**不建 prefix 登記表**（W04 裁決）。⚠️ 順帶發現 **`risk.repository.ts:64` 的註解引用 `02a:89`，實際是 `:91`** —— live code 裡的行錨偏移，屬 `AD-DesignNoteAnchor-1` 家族。**不當場修**（節流閘），closeout 時記入該 AD | 🟢 記錄 |
| **D-claudemd** | `CLAUDE.md` = **29,804 / 30,000**，headroom **196**。預算由 `scripts/lint/check_rules_hygiene.py` 機械強制 | 確認 `AD-ClaudeMdBudget-1` 觸發條件成立。US-1 的目標（headroom ≥ 1,500）需移出約 **1,300+ bytes** | ✅ 確認 |
| **D-devdb** ⭐ | `isms_dev` **6 目錄 / 6 列 / 全 applied，且六個 sha256 逐一相符** | `AD-MigrationChecksum-1` 的對策連續第二個 phase 生效，起點乾淨 | ✅ 確認 |
| **D-control-absent** | `Control` 在 `schema.prisma` 與 `prisma/migrations/**` **零命中** | 確認是新建不是重建 | ✅ 確認 |
| **D-baselines** | lint **0** · type **0** · format **0** · unit **138**（15 suites）· int **54**（4 suites）· web **10** · build **0** · `run_all` **6/6** · `lint:negative` PASS（**22 檔 0 bypass 3 allowlisted**）· `CLAUDE.md` 29,804 | **與 plan §0 記載完全相符**，W05 closeout 之後無漂移 | ✅ |

### Prong 覆蓋

- **Prong 1（path）**: 10 個路徑（NEW 4 · EDIT 6）+ `CH-021` 佔用（**grep 全 repo 的引用，不是 `ls` 目錄**）
  + ADR 編號（`0014` 可用；`0002/0003/0008/0009` 仍是無檔案的預留主題），**0 個漂移**
- **Prong 2（content）**: 6 個 plan 宣稱驗證，**3 個實質推翻（`D-precedent` · `D-frequency` · `D-nature`）
  + 2 個引用行號錯誤（`D-groupscope` 差 1 行 · `D-refprefix` 差 2 行）**
- **Prong 2.5（child tree）**: **N/A** —— 無前端工作
- **Prong 3（schema）**: `Control` 零命中 · migration head + checksum 六項相符 ·
  `asset_groups`/`assets` 的 policy 與複合 FK 實際形狀已讀，**0 個漂移**

> ⭐ **Prong 2 連續第四個 phase 是唯一有實質產出的 prong**（W03 / W04 / W05 / W06）。
> 而本次它推翻的**全部三項都是我自己在 plan 裡寫的**，不是 repo 漂移。

### ⛔⛔ 三次錯誤是同一種，而且比 W05 那兩次更嚴重

W05 Day-0 犯過兩次「零命中但搜錯地方」。**本次的形狀更糟：我對從未搜過的東西寫下了「零命中」。**

`02a:116-129` 是**一張連續的值域表**。我的 recon pattern 是
`preventive|detective|corrective|control type|control nature|framework_refs|applies_to_scope|effectiveness`
—— 它命中 `:122`（type）與 `:125`（effectiveness），**pattern 裡根本沒有 `frequency`**。
我看到相鄰四列裡的兩列，就對另外兩列下了「未定義」的結論，而**那張表就在同一個畫面上**。

`D-precedent` 是同一個病的第三種形態：我讀了 W05 的 RLS policy，
**卻沒讀它正下方那句指名 `extension_fields` 有 global half 的註解**。

> **共同結構：讀「命中的行」而不是「它們所在的區塊」。**
> grep 給的是行，而結論需要的是上下文。→ 這條要進 closeout 的 AD。

### Go / No-Go

**範圍變動**: **~12%，且方向是縮小** → **繼續 Day 1**

- **減少**：D2 / D3 消失（兩個決定變成照抄），Day 1 少一個工作項
- **不變**：deliverables 完全不變（`Control` + 3 端點 + CLAUDE.md 瘦身）
- **改變的是理由不是內容**：D1 從「發明新形狀」降級為「判斷既有形狀是否可移轉」

依 `day0-plan-verify.md` 鐵律，**不改 plan §3 Technical Spec 的選項原文**（保留「當時考慮過什麼」），
改動加進 **§8 Risks**。

### 時間

依 `AD-CalibrationMetric-2` 的**新定義**（本 phase 是它的第一次實際套用）：
`actual` = **branch 上第一個 commit** → closeout commit 的牆鐘跨度，`git log` 機械導出，
**且明記 plan/checklist 起草不在窗口內，故為下界**。Day 4 retro Q2 填入。

### Remaining for Next Day

- **Day 1**：US-1 `CLAUDE.md` 瘦身（**開工前先做**）→ D1 量測與呈報
- ⛔ **D1 的量測重心已改變**：不再是「能不能做出不對稱的 policy」（W03 已證明可以），
  而是「**`extension_fields` 的豁免理由能不能移轉到一張業務表**」——
  前者是 PostgreSQL 的問題，後者是 guardrail 的問題
- ~~D2 `frequency` 值域~~ · ~~D3 `nature` 權威~~ —— **Day-0 已解決，照抄 `02a:123-124`**

---

## Day 1 — 2026-08-11 — CLAUDE.md 瘦身 + 拍板 `applies_to_scope` (US-1, US-2)

### 1.a US-1 —— `CLAUDE.md` 瘦身：**196 → 1,527 bytes headroom**

⭐ **先量每一節的實際 byte 數，不靠印象挑**（`LC_ALL=C awk` —— 預設 locale 數的是字元，
CJK 一字 3 bytes，會低估 35%）：

| 節 | bytes | 處置 |
|---|---|---|
| 核心約束（必守）| 4,423 | ⛔ **不動**（判準）|
| 🛑 不可協商的 guardrails | 3,039 | ⛔ **不動**（原文）|
| **Documentation Layout** | 2,952 | ✅ **移出兩張表** → 2,952 → ~750 |
| 已確認參數 15 列 | 2,519 | ⛔ **不動**（防再議清單，表本身就是價值）|
| **Code Standards** | 1,968 | ✅ **移出 on-demand trigger 表** |
| 其餘 11 節 | — | 不動 |

**兩刀都是「刪重複 + 留指標」，不是壓縮形容詞**（`AD-ClaudeMdBudget-1` 明文要求結構性瘦身）：

| 移出什麼 | 落點（**逐一讀過才動手**）|
|---|---|
| on-demand 規則的 13 列 trigger 表 | ⭐ [`.claude/rules/README.md`](../../../.claude/rules/README.md) —— **它本身也是 always-loaded**，所以那張表**一直都在 context 裡**。在 CLAUDE.md 再抄一次是**兩份 always-loaded 檔案裡的同一張表** = 每個 session 付兩次錢、零行為差異 |
| 「三軌的產出物」表 | `PROCESS.md` §3.3「產出 —— 兩種形式」/ §4.3 |
| 「設計與決策的三種文件」表 | `14-adr/README.md:16,57`（含「Design note **必須有實作 + file:line**」）+ `02-architecture/README.md:74-85`（含「**extract 不是 pre-write**」）|
| 14 層目錄表 | **保留** —— 它含 `02a` §0「建表前先看實體索引」等導航指令，不是純索引 |

⭐ **這一刀的性質值得記**：**on-demand trigger 表的移出是零成本的** ——
內容沒有離開 always-loaded 的範圍，只是不再被存兩份。
另外兩張表的內容則有**其他權威來源**，而我**逐一 grep 讀過確認它們真的在**，
不是假設「應該有」。**移出 ≠ 刪除**這條 DoD 是這樣滿足的。

#### ⚠️ 兩個自我攔截

1. **我抄了「14 條」這個數字而沒有數。** 取代文字第一版寫「on-demand 14 條」——
   `Glob docs/rules-on-demand/*.md` 實測 **16 個檔**。
   兩者都對但講的是不同的集合：`.claude/rules/README.md` 的「14 條」是**常態**那批，
   另有 **2 條件式附加包**（`multi-tenant-data` · `llm-agent-antipatterns`）。
   改為 **「16 個檔（14 常態 + 2 條件式）」** —— 可被 `Glob` 一行驗證。
   ⚠️ 諷刺的是我在替代文字裡把 `multi-tenant-data`（條件式那批）列為「最常觸發」之一。
2. ⛔ **驗「guardrail 沒被動到」的第一版指令沒有真的驗到** ——
   `grep ... | head -5 || echo "零命中"`：**pipeline 的退出碼是 `head` 的**，
   所以 `||` 永遠不會觸發，那句「零命中 ✅」印不出來也不代表什麼。
   這正是 `AD-GrepAssertion-1` 的形狀，**在同一天的同一個 session 裡又一次**。
   重驗方式：先寫檔再 `grep -q` 判斷，**退出碼不經 pipe**。

#### DoD 驗證

- `wc -c CLAUDE.md` = **28,473** → headroom **1,527 ≥ 1,500** ✅
  （⚠️ 中途量到 **1,478**，差 22 bytes。**沒有四捨五入當作達成**，再收一句才過）
- `git diff -U0` 的**四個 hunk 全部落在 373-431 行**（那兩個表所在的區段）；
  對 guardrail 9 條與核心約束 8 條的標題與判準行做 `grep -q` → **零命中** ✅
- `python scripts/lint/run_all.py` → **6/6**（含 rules-hygiene）✅

### 1.b ⛔ D1 —— `applies_to_scope` 的範疇語義：**量測完成，待使用者拍板**

> ⛔ **本節不含建議選項。** 三個形狀的實測行為與各自「表達不出來的東西」列在下面，
> **選擇權在使用者**（CLAUDE.md §禁止反模式：ADR 未拍板前不替使用者選技術）。

**量測方式**（不靠記憶引用文件 —— checklist 1.2 明文要求）：
throwaway 資料庫 `w06_d1_probe`（`CREATE DATABASE` → 探測 → `DROP DATABASE`，
**`isms_dev` / `isms_test` 全程未被觸碰**，事後 `pg_database` 逐列確認兩者仍在）。
PostgreSQL **18**，以 `isms_app_user`（非 owner、非 superuser）連線，
`app_entity_scope()` 逐字複製自 `20260809171812_*/migration.sql:27-48`。
**16 個案例，每個各自 `BEGIN`/`ROLLBACK`**，互不污染。
證據：[`artifacts/d1-rls-probe.sql`](./artifacts/d1-rls-probe.sql) ·
[`artifacts/d1-rls-probe.out`](./artifacts/d1-rls-probe.out)（原檔 `cp` 進來，未經我轉錄）。
⚠️ 這兩個檔**不在 plan §4 清單上** —— Day 4 對照時視為「量測要求隱含的證據檔」，非範圍蔓延。

呼叫者一律是 **HK1**；`group` 列的擁有者一律是 **SG1**。

| # | 動作（HK1 對 SG1 的 group 列，除非另註）| **A**：`FOR ALL`，`USING` 寬 / `WITH CHECK` 窄 | **B**：`extension_fields` 逐字（NULL = group）| **A′**：四條 per-command policy |
|---|---|---|---|---|
| 1 | SELECT | ✅ 看得到（2 列）| ✅ 看得到（2 列）| ✅ 看得到（2 列）|
| 2 | UPDATE 別人的 group 列（只改 title）| ⛔ **42501** | ⛔ **42501** | ⛔ **0 rows** |
| 3 | DELETE 別人的 group 列 | ⚠️⚠️ **DELETE 1 —— 成功** | ⚠️⚠️ **DELETE 1 —— 成功** | ⛔ **0 rows** |
| 4 | INSERT 一列**新的** group 列（自己持有）| ⚠️ **INSERT 1 —— 成功** | ⛔ **42501** | ⛔ **42501** |
| 5 | 把自己的 local 列**升格**成 group | ⚠️ **UPDATE 1 —— 成功** | ⛔ **42501** | ⛔ **42501** |
| 6 | **奪取**：把別人的 group 列改成自己持有 + 降格 | ⚠️⚠️ **UPDATE 1 —— 成功** | ⚠️⚠️ **UPDATE 1 —— 成功** | ⛔ **0 rows** |
| 7 | UPDATE 一列**看不見**的別人的 local 列 | **0 rows**（無錯誤）| — | — |
| 8 | 負向對照：改自己的列 / 插自己的列 | — | — | ✅ **UPDATE 1 / INSERT 1** |

#### 四個發現（全部有 `artifacts/d1-rls-probe.out` 的行可指）

1. ⭐⭐ **`DELETE` 沒有 `WITH CHECK`。** 不對稱 policy 的**寫入側防護對 `DELETE` 完全不存在** ——
   `DELETE` 只看 `USING`，而 `USING` 正是被放寬的那一半。A 與 B **同樣中彈**（`:52` / `:91`）。
   ⚠️ **今天沒爆是因為 GRANT，不是因為 RLS**：本 repo **沒有任何一張表**把 `DELETE` 授予 `isms_app`
   （`20260811024841_*:324-326` 三張表皆 `SELECT, INSERT, UPDATE`；`extension_fields` 的
   `:64-65` 更明文寫了理由 —— 但它寫的理由是 guardrail 3 的「退役是欄位不是刪除」，
   **沒有人知道它同時是在堵這個洞**）。誰哪天加了 `GRANT DELETE`，policy 一個字都不用改，洞就開了。
2. ⭐⭐ **A 的 group 標記是「寫入者自己控制的欄位值」，B 的是 NULL。** 這是兩者唯一的實質差別，
   而它決定了案例 4 / 5：`WITH CHECK (org_entity_id = ANY(...))` 對 A 而言**完全不管
   `applies_to_scope` 是什麼**，所以任何 OpCo 都能**單方面對全集團發佈一條 control**（案例 4），
   或把自己既有的一條**升格**（案例 5）。B 擋得住，機制是 **`NULL = ANY(...)` 求值為 NULL、
   `WITH CHECK` 視同 false** —— 不是誰特別設計的，是三值邏輯的副作用。
3. ⭐⭐⭐ **A 與 B **都**擋不住「奪取」**（案例 6）：HK1 把 group 列改成自己持有並降格為 entity-local，
   `USING` 放行（它還是 group / 還是 NULL）、`WITH CHECK` 放行（新的持有者是我），**兩層都合法**。
   結果是**一家 OpCo 可以把一條全集團共用的 control 從其他 12 家眼前靜默移走**。
   ⚠️ 這個洞**現在就存在於 `extension_fields`**（B 是它的逐字複製）—— 依節流閘**不當場修**，
   記進 BACKLOG 由使用者排序。
4. ⭐ **要同時堵住 3 / 4 / 5 / 6，單一 `FOR ALL` policy 做不到。** 因為 `UPDATE`/`DELETE`
   的**選列**用的就是那個被放寬的 `USING`。A′ 的做法是拆成四條 per-command policy
   （`SELECT` 寬；`INSERT`/`UPDATE`/`DELETE` 各自窄），實測**四個洞全關、負向對照仍然通過**
   （案例 8）。代價：**沒有任何實體能透過應用程式建立 group control** ——
   與 `extension_fields:77-79` 的既有姿態一致（「group-wide rows are seeded by migration
   or by an admin path that does not exist yet」）。

#### 一個原本擔心、實測**不成立**的疑慮

案例 2 回 **42501**、案例 7 回 **0 rows** —— 看起來像是「錯誤碼洩漏了這一列存在」的 oracle
（約束 8：查無資料一律回 404，不區分）。**實測後不成立**：`WITH CHECK` 只在通過 `USING` 的列上求值，
而通過 `USING` = **你本來就讀得到它**。42501 只會出現在你已經能 SELECT 的列上，**沒有洩漏任何新東西**。
⭐ 但 A′ 的失敗形態是 **0 rows**（案例 2 / 3 / 6），**天然對齊 404 語義**；A / B 是 42501，
需要 repository 層自己翻譯。這是實作成本上的差別，不是安全性上的。

#### ⚠️ 三個「我自己先前寫錯」的更正

| 先前寫的 | 實測 / 實讀 | 更正 |
|---|---|---|
| Day-0：「`02:26` 把 `org_entity_id` 明列在 `Control` 欄位清單 → **選項 B 與它衝突**」 | `02:26` 原文只是把 `org_entity_id` **列為欄位**，並且同一列的描述**自己就寫著** "may be **group-shared** or entity-local" | ⛔ **推論過頭**。列出欄位 ≠ 要求 `NOT NULL`；B 保留該欄位、只是可空。B 真正衝突的是 **CLAUDE.md 約束 8 鐵律 1**（業務表必有 `entity_id NOT NULL`），**不是 `02:26`**。同一個「證據不支持結論」形狀 |
| plan §3.1：「A 讓 `USING`/`WITH CHECK` **首次**不對稱」 | Day-0 已推翻（`extension_fields` W03 就是）| 已記錄 |
| plan §3.1 表格：A 的代價 =「讀得到但**不一定**寫得到」 | 實測：A 的代價**不是**「不一定寫得到」，而是**寫得太多**（案例 3/4/5/6 四個都成功）| plan 的措辭把風險寫反了方向 |

#### ⭐⭐ 一個 plan 完全沒看到的東西：`subtree` 三個值裡有一個**目前無法表達**

`02a:217` 給 `applies_to_scope` 三個值：**this entity only / subtree / group-shared**。
上面 16 個案例只量了 **entity 與 group** —— 因為 `subtree` 根本不在同一個機制上：

`entity-scope.resolver.ts:120-142` 的 scope 只**向下**展開（roots + descendants，
`path` 前綴比對），**永遠不包含祖先**。所以「這條 control 適用於我這一層以下」這件事，
在**讀取者**那一側是看不到的 —— 子 OpCo 的 scope 裡沒有它父實體的 id。
要讓 `subtree` 成立，policy 內必須反過來做**祖先查找**（`org_entity_id` 是我 scope 中某個實體的祖先），
而那正是 `resolver.ts:9-13` 引用 `02a:146` **刻意避開**的東西（policy 內的遞迴 CTE 會 per-row 執行）。

> **`02a:217` 的三個值不是同一個機制的三個變體。**
> `entity` = 今天的形狀 · `group` = 一條 policy 分支（上表已量完）·
> `subtree` = **一次階層查找，本 repo 至今零先例**。
> ⛔ 這件事**擴大了 D1 的問題本身**，所以一併呈報，不由我裁掉。

#### 三個選項各自「表達不出來的東西」（checklist 1.2 DoD）

| | 表達不出來的東西 | 反方論據（**支持**這個選項的那一面）|
|---|---|---|
| **A** | 「group control 只能由集團層建立」—— 案例 4/5 實測任何 OpCo 都能自建與升格。除非升級成 A′ | 唯一保留 `applies_to_scope` **欄位本身**的選項，因此是唯一**日後可以長出 `subtree` 分支**的形狀；且不動鐵律 1 |
| **B** | ①「這條 control 屬於誰」—— NULL 的列**沒有持有者**，稽核軌跡（M3）將無法回答「誰該對它負責」；②`subtree` 永遠無法表達（只有兩態）| 案例 4/5 **免費**擋掉，機制是三值邏輯不是我們的紀律；且**已經在 production 跑了一個 phase**（`extension_fields`），是唯一有實跡的形狀 |
| **C**（延後）| `02a:413`「group-shared control 可連結任何實體的 risk」整條規則無處落腳；`00:59` 把 **group-shared/inherited control library** 列為 Wave 1 對「不一致的作法」的回應 —— 延後等於這一格今天交不出來 | 唯一不需要現在就答對的選項。⚠️ 但 W04 說過「改 RLS 錨點等於改 32 張表的語義」，下一片要付這個代價 |

#### 補充事實（供裁決參考，非論點）

- **鐵律 1 沒有機械強制**：`scripts/lint/` 六個 detector 中，`grep` `org_entity_id` / `NOT NULL`
  **零命中**。所以選 B 不會有任何 gate 變紅 —— 它只會違反一條**寫下來的** guardrail。
  （這件事本身是 BACKLOG 候選，不在本 phase 處理。）
- **A′ 的四條 policy 是新形狀**（本 repo 目前每張表都是單一 `FOR ALL`）。
  若使用者選 A′ → 依 plan §1 / §7 的預設條件，**本 phase 需改判 spike**（class `spike` 0.65）
  並補 design note。選 A（單一 `FOR ALL`）或 B 則維持 `pattern-reuse-feature` 0.50。

#### ⏳ 狀態

- [x] 量測與論證完成（16 案例 + 證據檔）
- [ ] ⛔ **待使用者拍板** —— 本節**刻意不含建議**
