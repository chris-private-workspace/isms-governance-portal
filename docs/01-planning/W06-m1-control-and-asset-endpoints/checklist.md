# Phase W06 — Checklist (M1 slice 3: the control library and the asset write path)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `eabb437`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 NEW 檔皆不存在、EDIT 檔皆存在；
      `CH-021` 未被佔用（**grep 全 repo 的 `CH-\d+` 引用，不是 `ls` 目錄** —— `AD-ChNumber-1`）；
      下一個可用 ADR 編號以 `Glob docs/14-adr/*` 確認（**`0002/0003/0008/0009` 是有主題的預留，不可填**）
      → **NEW 4 檔皆不存在 · EDIT 6 檔皆存在 · 0 漂移**；`CH-021` 僅出現在 W06 自己的 pre-doc；
      ADR **0014** 可用（`0002/0003/0008/0009` 目錄裡**無檔案**，仍是預留主題）
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] ⛔ **D-groupscope** — `02a:412` 之外，全 repo 是否還有別處規定 group-shared control 的
        可見性 / 可寫性？**這決定 D1 的選項空間**，不可拖到 Day 2
        → 另有**兩處**：`02-core-data-model.md:26` 把 `org_entity_id` **明列在 `Control` 欄位清單**
        （→ 選項 B 與它衝突）· `00-project-charter.md:59` 把 group-shared control library 列為
        **痛點的解法之一**（→ 選項 C 砍掉憲章的價值主張）。⚠️ plan 引用的 `02a:412` 實際是 **`:413`**
  - [x] **D-frequency** — `Control.frequency` 的值域。⚠️ **零命中要先證明搜對地方**
        （W05 Day-0 在這件事上失手兩次）—— 先寫下「它如果存在會長什麼樣」再搜
        → ⛔⛔ **plan 斷言錯誤**：`02a:124` 定義了完整值域
        （`continuous·daily·weekly·monthly·quarterly·annual·event-driven`）→ **D2 消失**。
        錯因：recon 的 pattern **根本沒有 `frequency`**，我把沒搜過的東西寫成「零命中」
  - [x] **D-nature** — `nature` 的值域是否只在 `09:54`。若是，`09` 是**畫面**文件而非資料模型 →
        D3 需裁決它算不算 `02a` 的合法補充
        → ⛔ **plan 斷言錯誤**：`02a:123` = `manual·automated·hybrid`。`09:54` 只是重述 →
        **沒有權威衝突，D3 消失**
  - [x] **D-w05shape** — W05 retro §US-6 的**兩條新條款**逐條確認仍成立
        （複合 FK 已建 / 繞開發號的寫入測試形狀 = int 11b）—— 本 phase 是它們的第一個負載
        → **兩個錨點皆解析成功**：`migration.sql:214` 的 `assets_asset_group_id_org_entity_id_fkey` ·
        `risk.int.spec.ts:288` 的 11b
  - [x] **D-claudemd** — 量 `CLAUDE.md` 實際 byte 數與 `check_rules_hygiene.py` 的預算來源，
        並**列出候選的移出段落**（不是動手，是先看清楚）
        → **29,804 / 30,000，headroom 196**。US-1 需移出 **1,300+ bytes**
  - [x] **D-refprefix** — `Control` 的 `ref_code` prefix：`02a` 有沒有定？
        （`Risk` 是 `02a:89` 自己寫死的唯一一個；`Policy` 是自宣告）
        → `02a:**91**`（plan 引用 `:89`，**差兩行**）只說「prefix by type + entity」，
        **`Control` 未指定** → 自宣告，不建登記表。
        ⚠️ 順帶發現 **`risk.repository.ts:64` 的註解也引用 `02a:89`** —— live code 的行錨偏移，
        **不當場修**（節流閘），closeout 記入 `AD-DesignNoteAnchor-1`
  - [x] ⭐⭐⭐ **D-precedent（不在原 checklist 上，Prong 2 順著讀出來的）** —— 不對稱的
        `USING`/`WITH CHECK` **已經存在於 `extension_fields`**（`20260810134319_*/migration.sql:80-83`），
        理由（`:73-79`）幾乎逐字就是 `Control` 的問題。**改變 D1 的性質與 phase 的分類**（見 plan §8）
- [x] **Prong 2.5 — child component tree** — **N/A**（無前端工作）
- [x] **Prong 3 — schema verify**：
  - [x] `Control` 在 `schema.prisma` 與 `prisma/migrations/**` **零命中**（確認是新建不是重建）；
        若命中，確認那是不是 W05 留下的 orphan claim（`Risk.treatment` 的註解）
        → **零命中**，是新建
  - [x] ⭐ **D-devdb** — `isms_dev` 的 `_prisma_migrations` **head 比對 + checksum 比對**
        （`AD-MigrationChecksum-1`；W05 已證明升級後的檢查有效）
        → **6 目錄 / 6 列 / 全 applied，且六個 sha256 逐一相符** —— 起點乾淨
  - [x] `asset_groups` / `assets` 的 RLS policy 與複合 FK **實際形狀**逐列確認
        （本 phase 要驗它們**會拒絕**，先確認要驗的東西長什麼樣）
        → 兩者 policy 皆 `USING = WITH CHECK = org_entity_id = ANY(app_entity_scope())`（**對稱**）；
        複合 FK 在 `migration.sql:214`
- [x] **D-baselines** — 逐項跑並記實際輸出（**不經 pipe，看退出碼** —— `AD-GrepAssertion-1`）：
      unit 138 · int 54 · web 10 · lint 0 · type 0 · format 0 · build 0 · `run_all` 6/6 ·
      `lint:negative` PASS（22 檔 0 bypass 3 allowlisted）· coverage 94.13/92.17/94.36/95.03
      → **全部相符**（逐項獨立取退出碼，不經 pipe）；`CLAUDE.md` 29,804
- [x] **Catalog drift** — progress.md Day-0 表格（`D-<name>` + Finding + Implication，交叉引用 plan §8）
- [x] **Go/no-go** — 範圍變動 ≤20% 繼續 / 20-50% 修訂並再確認 / >50% 中止重寫
      → **~12% 且方向是縮小** → **繼續 Day 1**。deliverables 不變；D2/D3 消失；
      D1 從「發明新形狀」降級為「判斷既有形狀可否移轉」

### 0.2 Branch

- [x] `git checkout -b feature/W06-m1-control-and-asset-endpoints`（從 `main` `eabb437`）

---

## Day 1 — CLAUDE.md 瘦身 + 拍板 `applies_to_scope` (US-1, US-2)

### 1.1 ⛔ US-1 — `CLAUDE.md` 結構性瘦身（**開工前先做**）

- [x] **把非導航內容移出，留指標**
  - DoD: headroom **≥ 1,500 bytes**；⛔ **移出 ≠ 刪除** —— 每一段都有落點與指向它的一行
  - Verify: `wc -c CLAUDE.md` + `python scripts/lint/run_all.py`（rules-hygiene 綠）
  - ⚠️ `check_path_references.py` **驗路徑存在，不驗內容還在** —— 移出後要自己讀一次落點檔
  - → **28,473 bytes，headroom 196 → 1,527** ✅（中途量到 1,478 差 22 bytes，
    **未四捨五入當作達成**）。`run_all` 6/6
  - → 兩刀皆為**刪重複 + 留指標**：(a) on-demand 的 13 列 trigger 表 —— 落點
    `.claude/rules/README.md` **本身也是 always-loaded**，等於同一張表被存兩份，移出**零行為成本**；
    (b) 「三軌產出物」→ `PROCESS.md` §3.3/§4.3 ·「三種文件」→ `14-adr/README.md:16,57` +
    `02-architecture/README.md:74-85`。**三個落點都逐一 grep 讀過確認內容真的在**
  - → ⚠️ **14 層目錄表刻意保留** —— 它含「建表前先看 `02a` §0 實體索引」等導航指令，不是純索引
- [x] **確認 9 條 guardrails 與 8 條核心約束的「原文」未被壓縮成摘要**
  - DoD: 這兩節是**不可協商**的，瘦身只能動它們的**細節說明**不能動判準本身
  - Verify: diff 逐段人工過目，並在 progress.md 記錄「移出了什麼 / 留下了什麼」
  - → `git diff -U0` 的**四個 hunk 全部落在 373-431 行**；對兩節的標題與判準行 `grep -q` **零命中** ✅
  - → ⛔ **第一版驗證指令沒有真的驗到**：`grep … | head -5 || echo "零命中"` ——
    **pipeline 退出碼是 `head` 的**，`||` 永不觸發。`AD-GrepAssertion-1` 同一天同一 session 再現。
    改為先寫檔再 `grep -q`，**退出碼不經 pipe**

### 1.2 ⛔ D1 — `applies_to_scope` 的範疇語義（**助手不得代選**）

- [x] **量測與論證 D1 三個選項**（plan §3.1），產出可引用的證據而非偏好
  - DoD: 三個選項各有一段「它會讓什麼表達不出來」；
    ⭐ **實測** PostgreSQL RLS 的 `USING` 與 `WITH CHECK` 不對稱時的實際行為
    （讀得到但寫不得，錯誤碼是什麼？跟 42501 一樣嗎？）—— **不要靠記憶引用文件**
  - Verify: 論證寫進 progress.md Day 1，**含反方論據**
  - ⚠️ 探測在 **throwaway DB** 上跑，跑完 `DROP DATABASE`（W05 的作法，不汙染 `isms_dev`）
  - → **16 案例 × 3 形狀**，PostgreSQL 18，`w06_d1_probe` 建了又 `DROP`（`isms_dev`/`isms_test` 事後逐列確認仍在）。
    證據 `artifacts/d1-rls-probe.{sql,out}`（`cp` 原檔，未轉錄）
  - → ⭐ **錯誤碼是 42501**（`new row violates row-level security policy`），與發號拒絕**同碼**；
    但 A′ 的失敗形態是 **0 rows** 不是錯誤
  - → ⭐⭐ **四個實測的洞**：`DELETE` 沒有 `WITH CHECK`（A/B 皆可跨實體刪 group 列，
    **今天靠 GRANT 沒授 DELETE 才沒爆，不是靠 RLS**）· A 可**自建** group 列 · A 可**升格**自己的列 ·
    **A 與 B 都擋不住「奪取」**（把 group 列改成自己持有並降格）
  - → ⭐⭐⭐ **plan 沒看到的**：`applies_to_scope` 的第三個值 **`subtree` 目前無法表達** ——
    `entity-scope.resolver.ts:120-142` 的 scope 只向下展開，永不含祖先
  - → ⚠️ **更正 Day-0 的一條推論**：`02:26` 只是列出欄位，**不等於**要求 `NOT NULL`；
    B 真正衝突的是**約束 8 鐵律 1**，不是 `02:26`
- [x] **向使用者呈報 D1 並取得拍板**
  - DoD: 使用者明確選定；⛔ **助手不得代選**（CLAUDE.md §禁止反模式）
  - Verify: 拍板記錄在 progress.md，含日期與理由
  - → **A′（四條 per-command policy）** + **`subtree` 不建**（2026-08-11，progress.md §1.c）。
    四個選項各附實測後果與 SQL 預覽呈報，**我未給推薦**
  - → ⭐ **兩個 plan 早就寫好的條件被觸發**：改判 **spike 0.65**（commit ~6.5 → ~8.5 hr、
    Day 4 補 design note）+ **ADR-0014**
- [x] **若判為架構級 → 寫 ADR-0014 承載「範疇是表級還是列級」**
  - DoD: ADR 含**可證偽條件**；明寫它約束哪些**未來**實體（任何有共用列的表）
  - Verify: `Read` 該 ADR，確認 `**Status**: 已採納` 且理由不是「因為方便」
  - ⚠️ **若 D1 的答案需要一個新的 RLS 形狀 → 本 phase 改判 spike**，
    calibration class 改 `spike` 0.65 並補 design note（plan §1 / §7 已寫明後果）
  - → **`docs/14-adr/0014-row-level-entity-scope-and-per-command-policies.md`**，
    `**Status**: 已採納`，4 條可證偽條件（最可能觸發的是「有人要在 runtime 建 group control」，
    **不早於 M4**）+ Rollback + README 索引已加列
  - → **判準是逐條核對 `14-adr/README.md:14` 的表**（「選 A 不選 B 且會約束未來」），
    不是「感覺很重要」。⚠️ `:33` 的 forcing-function 門檻只管**無實作先寫**的 ADR，本案實作在 Day 2
  - → ✅ **改判 spike 已同步落到 plan §1 / §7**（class 0.65、commit ~6.5 → ~8.5 hr、Day 4 補 design note）

### 1.3 D2 / D3 拍板

- [x] **D2 `frequency` 值域** · **D3 `nature` 的權威來源**
  - DoD: 各一句決定 + 一句理由；**預設立場是不建未定義值域的欄位**（`AD-AssetScales-1` 先例）
  - Verify: 兩個決定寫進 progress.md Day 1
  - → **D2 照抄 `02a:124`**（7 值）· **D3 照抄 `02a:123`**（3 值），`09:54` 為重述非獨立權威。
    ⚠️ `AD-AssetScales-1` 的先例**不適用** —— 它管的是「規格沒定義」，而這兩個規格都定義了

### 1.x partial gate

- [x] `python scripts/lint/run_all.py` → 6/6（**含 rules-hygiene，因為 1.1 動了 CLAUDE.md**）
  - ⚪ 其餘 gate 今日不跑 —— Day 2 full gate 才要求。**不寫「都過了」**
  - → **6/6**：rules-hygiene OK（8 budgeted files）· doc-links OK · path-references OK ·
    status-markers OK（11 pre-doc，E1-E4 clean）· mockup-fidelity **SKIP**（無 `.mockup-fidelity.json`）·
    workflow-placeholders OK。⚪ lint / type / test / build **今日未跑**，不是 pass 是 **未跑**

---

## Day 2 — `Control` 表 + 三個端點 (US-3, US-4)

### 2.1 `Control` 表 + migration

- [x] **`schema.prisma` 加 1 model + 3 enum；migration 含表 + RLS + GRANT（形狀依 D1）**
  - DoD: `type` / `effectiveness` 的 enum 值**逐字等於** `02a:122` / `02a:125`；
    ⭐ `effectiveness` 的 docstring **明寫 `not_tested` 不是佔位值**而是規格化的誠實答案
    （否則它是 AP-3）
  - Verify: `npm run prisma:migrate -w apps/api`；`\d+ controls` 確認 RLS 狀態符合 D1
  - ⚠️ **若 D1 = A**：`USING` 與 `WITH CHECK` 首次不對稱 → migration 註解要寫明**為何**不對稱
  - → `20260811093148_control_library`。**5 個 enum 不是 3 個**（plan 說 3：type/nature/
    applies_to_scope；實際還要 `frequency` 與 `effectiveness`，兩者都是 `02a` 已定義的值域）
  - → 對真 DB 回讀：`pg_policies` **3 列**（read/insert/update，**無 DELETE**）·
    `relrowsecurity`/`relforcerowsecurity` = `t`/`t` · `isms_app` grants = **INSERT, SELECT, UPDATE** ·
    `migrate status` = up to date
  - → ⚠️ 手寫段落在 `--create-only` 之後、套用**之前**完成（反過來會動到 checksum）
- [x] **`ref_code` prefix 依 Day-0 `D-refprefix` 的發現處理**
  - DoD: `02a` 有定就用它；沒定就自宣告，**不建 prefix 登記表**（W04 裁決）
  - → `CTRL` 自宣告於 `control.repository.ts`，**未建登記表**；int 測試 1 釘住 `^CTRL-SG1-\d{6}$`

### 2.2 `control.repository.ts` + `asset.repository.ts`

- [x] **第三、四個範疇化 client 消費者**
  - DoD: **不持有裸 client**；範疇化實例走方法參數；沿用 W05 的順序
    （validate → catalog → `issueRefCode` → insert → translate）
  - Verify: `npm run lint -w apps/api`（boundaries）+ `npm run lint:negative`（**allowlist 不得增加**）
  - ⚠️ **`ScopedAssetClient` 要不要暴露 `assetGroup` delegate？** 比照 W05 對 `asset` 的裁決
    （能先讀父表的 repository 就有能力分辨「不存在」與「不是你的」）—— 想清楚再給
  - → **裁決：不暴露。** ⭐ 但不是靠「兩個 repository」達成 —— **同一個檔案的兩個方法收不同形狀的
    client**（`createGroup` 拿得到 `assetGroup`，`create` 拿不到）。runtime 同一物件，差別在型別
  - → lint **0** · `lint:negative` **PASS 28 檔 0 bypass 3 allowlisted**（**allowlist 未增加** ✅）
  - → 單元測試釘住順序：`catalog:<type>` → `issueRefCode` → `insert`（兩個 repository 各一）

### 2.3 端點 `/controls` · `/assets` · `/asset-groups`

- [x] **比照 risk 模組：範疇只來自憑證、404 不是 403、`Cache-Control` 全域生效**
  - DoD: controller 的參數清單**沒有任何 request 來源的實體 id**（約束 8 鐵律 3）
  - Verify: `npm run test -w apps/api`；斷言 resolver **實際收到的參數**
  - ⚠️ **拒絕點這次會落在哪？** `assets → asset_groups` 是複合 FK（23503），
    而發號在前（42501）—— **兩個都要有測試，且訊息逐字相同**
  - → 三個資源各有「resolver 收到的是 principal 不是 body」的斷言（`JSON.stringify(seen)`
    不含實體 id）。⚪ `Cache-Control` 是 W03 的全域 interceptor，本 phase **未改也未重測**
  - → **兩個拒絕點都有測試**：`asset.int` 4（複合 FK 拒別人的 group）+ 5（不存在的 group
    **逐字相同的訊息**）+ 6（自己實體外 → 42501）。unit 側斷言兩者**同一個 404 分支**
  - → ⭐ 補了一個 plan 沒要求的：**無法辨識的錯誤原樣拋出**（全部映成 404 會讓範疇 404 失去意義）

### 2.4 ⭐ 範疇測試（US-4）—— **W05 checklist 2.4 的 🚧 在這裡關閉**

- [x] **約束 8 四項對 `AssetGroup` / `Asset` / `Control` 三張表成立**
  - DoD: 跨實體讀拒 / 跨實體寫拒**且重讀確認資料未變** / RLS 層獨立成立 / 滾升只看授權子樹
  - Verify: `npm run test:int -w apps/api`；⚠️ 斷言**順序無關**（`AD-JestFileOrder-1`）
  - → **int 78 / 6 suites 全綠**（baseline 54 / 4）。四項各自對位：
    讀 `asset.int` 2 · `control.int` 4-5 ｜ 寫 `asset.int` 3/6 · `control.int` 12（皆重讀確認未變）
    ｜ RLS 獨立 `asset.int` 7 · `control.int` 5 ｜ 滾升 `asset.int` 8 · `control.int` 13
  - → 斷言用 `toContain` / `Set.has`，**不依賴順序**
  - → ⚠️ **`Control` 的「讀」故意不是隔離** —— group 列跨實體可讀。所以測試同時斷言
    「看得到 group」**且**「看不到對方的 local」；只寫前者等於沒測到 policy 在分辨
- [x] ⭐ **【W05 條款 2】每張表各有一個「繞開發號」的直接寫入測試**
  - DoD: 繞開 repository、不帶 `ref_code`、直接 `client.<table>.create()` 寫一筆別人的列
  - Verify: ⛔ **必須在對應 RLS 中性化的狀態下重跑並看到它轉紅** ——
    否則它證明的可能又是 counter 在拒絕（`AD-BorrowedRefusal-1` 同形狀第 3 次）
  - → 三個都有：`control.int` **12b** · `asset.int` **3b** · `asset.int` **6b**
  - → ⏳ **中性化重跑留在 Day 3.3 元驗證**（本項的 Verify 尚未執行完 —— 現在只證明它們是綠的，
    **還沒證明它們會紅**）
- [x] **若 D1 = A：釘住 `USING` 與 `WITH CHECK` 的不對稱**
  - DoD: group-shared control **讀得到**但跨實體**寫不得**，兩個方向各一個案例
  - ⚠️ **只測一個方向會讓另一半靜默失效** —— 那正是 W05 M2 找到的缺口形狀
  - → D1 拍板為 **A′**，所以要釘的不只兩個方向而是 **Day 1 量到的四個洞各一個**：
    `control.int` 7（自建）· 8（升格）· 9（**奪取**）· 10-11（刪除）
  - → ⛔ **10/11 只證明 GRANT 層拒絕，不是 RLS** —— 第一版斷言 `count 0` 失敗於
    `permission denied`（權限檢查在 RLS 之前）。**未把「policy 拒絕」寫在說「grant 拒絕」的證據上**；
    RLS 半邊由 Day 1 `d1-rls-probe2-default-deny.out` N1/N2 承載。詳見 progress.md §2.b

### 2.x Full gate

- [x] lint 0 · type-check 0 · format 0 · unit ≥138 · int ≥54 · web 10 · build 0 ·
      `run_all` 6/6 · `lint:negative` PASS —— **逐項記實際輸出，不寫「都過了」**
  - → lint（api+web）**0** · type-check（api+web）**0** · format:check（api+web）**0** ·
    unit **192 / 19 suites** · int **78 / 6 suites** · web **10 / 1 file** · build（api+web）**0** ·
    `run_all` **6/6** · `lint:negative` **PASS 28 檔 0 bypass 3 allowlisted**
- [x] coverage 不低於 baseline（94.13 / 92.17 / 94.36 / 95.03）
  - ⚠️ **低於就不要當作「門檻過了」帶過**（W05 的教訓：第一次量低於 baseline，補的測試要有主張）
  - → 第一次量 **91.65 / 88.88 / 92.55 / 92.88 —— 四項全低於 baseline**，未當作過關
  - → 補 6 個**帶主張**的測試後 **93.35 / 92.47 / 95.74 / 94.56**：
    **branch 92.47 > 92.17 ✅ · funcs 95.74 > 94.36 ✅ · stmts 與 lines 仍低**
  - → ⭐ branch 的退步先被證明**不是計數假象**（排除 `*.module.ts` 後數字一模一樣），才去補
  - → ⚠️ stmts/lines 的差額**已量測歸因**：排除 `*.module.ts` 為 **98.96 / 99.10**。
    四個 module 檔在 unit config 下皆 0%（只被 int 載入），新增兩個把平均拉低。
    ⛔ **不補「實例化 module」的測試** —— 那是測 NestJS 的 decorator

---

## Day 3 — API-level 驗證 (US-5) — 真進程 + 真 PostgreSQL + 真 RLS

_(⚪ **無 user-facing surface** → drive-through 不適用。一律標 **API-level verified**，
**絕不暗示可用性**。W01–W06 的零 UI drive-through 記錄不變。)_

### 3.1 Clean restart

- [ ] **殺掉陳舊 dev server / 孤兒 worker，確認新程序是該 port 唯一擁有者**
  - DoD: 驗「活著的服務程序」不是「port 擁有者 PID」（Risk Class C 加強版）
  - Verify: 擷取證明 wiring 生效的 startup log 行（兩個新 module 載入 + 路由 mapped）
  - ⚠️ **殺之前確認那是不是我開的** —— port 3200 那組 W04/W05 兩次都正確地沒碰
  - ⚠️ **migration 已套用但 `schema.prisma` 未同步的窗口用 `migrate deploy` 不用 `migrate dev`**
    （W05 Day 3 實際被 `migrate dev` 的互動提示卡住並握著 advisory lock）

### 3.2 API-level 驗證

- [ ] **對真進程走完三個資源的主路徑**，逐案例記 observed-vs-intended
  - DoD: 至少涵蓋 —— 建立三種資源 · 讀取 · 跨實體 404 · 不存在的 `asset_group_id` ·
    `effectiveness` 預設為 `not_tested` · **若 D1 = A：group-shared control 的讀寫不對稱**
  - Verify: 案例表寫進 progress.md Day 3
  - ⛔ **腳本要每案帶自己的 nonce** —— W05 的第一版走查印出了陳舊回應且**看起來是通過的**
- [ ] **oracle 探測**：不存在的 id 與不屬於你的 id **回同一個答案**
  - DoD: 除 id 外逐字相同（比照 W03 案例 2b / W04 #6 / W05 A8-A9-A13）
  - ⚠️ **拒絕點這次可能又移動了** —— 記下它**這次落在哪**（發號 / 複合 FK / RLS）

### 3.3 元驗證（US-5 —— `AD-NegativeGate-1` 第 9 個實例）

- [ ] **把本 phase 每個「宣稱會擋東西」的機制各中性化一次**
  - DoD: 每次都記「弄壞什麼 → 幾個測試紅 → 還原 → 綠」。
    ⭐ **若某個機制弄壞後沒有東西紅，那就是缺口不是通過**
  - Verify: 表格記入 progress.md Day 3
  - 至少三組：**`Control` 的 RLS**（含 D1 的 group 分支）· **`assets`/`asset_groups` 的 `WITH CHECK`** ·
    **`assets → asset_groups` 的複合 FK**
  - ⛔ **`WITH CHECK` 那一組必須看到「繞開發號」的測試轉紅** ——
    若紅的只有走 repository 的測試，那就是 `AD-BorrowedRefusal-1` 第 3 次

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-021-w06-control-and-asset-endpoints.md`**
      （Problem / Root Cause / Solution / Verification / Impact —— 含 **API-level verified** 標示）
- [ ] ⭐ **US-6：W05 追加的兩條條款逐條裁決「夠用 / 需再加」**
  - DoD: 每條一行 + 一句理由。**這是本 phase 對 slice 4 最有價值的產出**
  - Verify: 寫進 retrospective；⚠️ 同時裁決 **W04 七不變式在第二次負載下是否仍然成立**

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration
  - ⚠️ **`actual` 用 `AD-CalibrationMetric-2` 的新定義**（branch **第一個 commit** → closeout commit），
    並明記 plan 起草不在窗口內故為**下界**。**這是那條 AD 的第一次實際套用**
  - ⚠️ **若 D1 已改判為 spike** → class 改 `spike` 0.65 並在 Q2 說明改判理由
- [ ] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `CALIBRATION-LOG.md`）
- [ ] Final gate sweep: lint 0 · type 0 · format 0 · unit ≥138 · int ≥54 · web 10 · build 0 ·
      `run_all` 6/6 · `lint:negative` PASS
- [ ] ⭐ **`git diff --name-status <base>..HEAD` 對照 plan §4**（`AD-DecisionSideEffect-1`）
  - DoD: 逐項確認 plan §4 列的每個檔案都真的動了，**特別是寫在裁決句子裡的附帶動作**
  - Verify: 差異寫進 progress.md；W05 用這一步抓到兩個漏做的交付
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated（**各 1 行**）· `MEMORY.md` pointer + subfile ·
      `BACKLOG.md` §Shipped 加列 · `ROADMAP.md` 第 4 項進度（**兩處都要改**）
- [ ] ⭐ **關掉的 AD**：`AD-ClaudeMdBudget-1`（US-1 達成）
  - ⚠️ **W05 checklist 2.4 的 🚧 也在本 phase 關閉** —— 回頭把那一列標成已解封並指向本 phase
- [ ] `RISK_REGISTER.md` 複查（**模板新增的那一列**）—— R4 因本 phase 再增三條無稽核寫入路徑而需更新
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻 `status:` frontmatter
  - ⚠️ **文件引用 commit 一律用 merge 後 `main` 上的 SHA**（`AD-DesignNoteAnchor-1`）——
    本 repo 用 rebase merge，branch 側的 SHA 不會在 main 上
