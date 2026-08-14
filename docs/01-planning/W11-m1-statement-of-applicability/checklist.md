# Phase W11 — Checklist (Statement of Applicability)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `f171049`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 11 個目標逐一確認（NEW 檔不存在 / EDIT 檔存在）；
      `CH-028` 編號未被佔用
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -1`
  - → 3 NEW 皆不存在 · 4 EDIT 皆存在 · 最大號 `CH-027` ✅
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-index** — `02a` §0 的 SoA 那一列仍為 Wave 1「Mandatory」；`Framework` 仍**不在任何一節**
    - → ⭐ **比預期更強**：`Framework`（大寫）在 `02a` **全檔零命中** —— 規格從未定義過它
  - [x] **D-refcode** — 既有 repository 的 `prefix:` 實際值枚舉，確認 `SOA` 無衝突
        ⚠️ **枚舉不得憑印象**（CH-027 的 E3 教訓：嚴格 pattern 只中 88/91，差額才是真相）
    - → ⛔ **第一版枚舉不完整**（寫死常數名得 10 個，實為 **14** 個）—— 教訓當天再現，見 D3/D8。
      `SOA` 無衝突（結論不變，但重做過）
  - [x] **D-policy** — 讀最近一個 migration 的 3 條 per-command policy 當前寫法
    - → GRANT 明列 + `_read` / `_insert` / `_update`；`FOR UPDATE` 的 `USING` 與 `WITH CHECK` **兩個都要**
  - [x] **D-unique** — 讀 W10 `20260813153153_version_label_key_scoped` 的唯一鍵欄位順序
    - → `(report_id, org_entity_id, version_label)`；SoA 無 parent ⇒ entity 在**首位**
  - [x] **D-version** — 確認 `Policy.version` 是單一 int（`02a` 列的 `version` 與 §1.1 合併的先例）
- [x] **Prong 2.5 — child component tree**：**N/A**（無前端）
- [x] **Prong 3 — schema verify**：`statements_of_applicability` 不存在；migration head 與
      `schema.prisma` 一致；`enum SoaImplementationStatus` 不存在
  - → 三者皆零命中；head = `20260813153153_version_label_key_scoped`
- [x] **D-baselines** — api unit **351/33** · api int **160/12** · web **10/1** ·
      coverage **92.01/90.81/97.4/93.44** · `run_all` **8/8** · `check_entity_index` **19/35** ·
      lint 0 · type 0 · build clean ×2
  - → **九項全部實測且與 plan 宣稱相符（0 drift）**。⚠️ build 的第一次驗證用了管線後的 `$?`
    （量到的是 `tail` 的 exit code）→ 重跑取得 `REAL_BUILD_EXIT=0`，見 D9
- [x] **Catalog drift** — progress.md Day-0 表格（**D1..D9**）
- [x] **Go/no-go** — **範圍變動 0% → GO**；plan §3 未改，drift 全部進 §Risks

### 0.2 Branch

- [x] `git checkout -b feature/W11-soa`（從 `main` `5a676f9`）
  - → 已於 pre-doc 階段建立，plan + checklist 在此分支上

---

## Day 1 — Schema · migration · isolation (US-1, US-2)

### 1.1 Model + enum

- [x] **`schema.prisma`：`model StatementOfApplicability` + `enum SoaImplementationStatus`**
  - DoD: 欄位對齊 `02a:215`；**四個 deviation 各有 docstring**（D1 `framework` 非 FK ·
    D2 無 `control_id` · D3 唯一鍵含 entity · D4 enum 值自宣告且**刻意不含 `not_applicable`**）；
    `version` 單一 int（不是兩個）；`approvedBy` 是 `String?` 非 FK
  - Verify: `npx prisma validate` + `npm run type-check -w apps/api`
  - → `The schema is valid 🚀`；欄位名用 **`framework` 而非 `framework_id`**（名字不該宣稱不存在的邊）；
    順帶要在 `OrgEntity` / `User` 各補一條 back-relation（Prisma 要求雙向）

### 1.2 Migration

- [ ] **`migrations/<ts>_soa/migration.sql`**
  - DoD: `CREATE TABLE` + 複合 FK + GRANT 明列 + **3 條 per-command policy**（無 `FOR DELETE`）+
    **`@@unique([orgEntityId, framework, clauseRef])`**
  - Verify: `npm run prisma:migrate -w apps/api` 後 `\d statements_of_applicability`
  - ⚠️ **用 Edit 工具寫 migration，不用 heredoc** —— W09 / W10 / CH-027 三次同形違反
  - → ✅ 用 **Write 工具**（新檔）寫，無 heredoc。⛔ **Verify 指令跑不了** ——
    `migrate dev` 被 W10 留下的 checksum 漂移擋住（progress §B1）。改由 **int suite 驗證**
    （它 DROP+CREATE 後 `migrate deploy`，遇到的是空的 `_prisma_migrations`）：**160 / 12 全綠**
  - → **D10：不建複合 FK 也不建 `(id, org_entity_id)` 錨點** —— SoA 不是任何表的子表，
    沒有可複合的對象；今天零消費者的錨點是 AP-5（plan §3.2 的描述不精確，**原文保留**）

### 1.3 Repository

- [x] **`core-model/soa.repository.ts` + spec**
  - DoD: `list` / `create`（`asset.repository.ts` 的形狀）；`ref_code` 前綴 `SOA` 且 docstring
    註明自宣告（W04 D3 ruling）；23505 走 `DuplicateKeyError`
  - Verify: `npm run test -w apps/api -- soa.repository`
  - → **9 / 9 通過**。藍本改用 `issue.repository.ts`（Day-0 D2：`asset` 是雙表）。
    ⭐ 23505 的安全性**依 `scope-refusal.ts:183` 的條件逐條確認**（鍵含 `org_entity_id` ⇒ scoped
    ⇒ 可 surface），而不是假設 W10 的結論自動適用

### 1.x partial gate

- [x] lint 0 · type 0（**只跑這兩項就只能說這兩項** —— W10 Day 3 曾以 4 項冒充 9 項）
  - → 實跑七項並**逐項取 exit code**（不共用管線後的 `$?`）：format **0**（⛔ **修正前是 1**）·
    lint 0 · type 0 · unit **360 / 34** · int **160 / 12** · `run_all` **8/8** ·
    `check_entity_index` **20 / 35**
  - → ⛔ **`format:check` 當場紅了** —— 正是 W10 Day 3 漏掉的那一項。
    這次因為逐項取 exit code 而在**當天**發現，不是 Day 4
  - → ⛔ build 與 coverage **本日未跑**，故本段不宣稱它們的狀態（留 Day 2 full gate）

---

## Day 2 — Endpoints (US-3)

### 2.1 Module + controller

- [x] **`modules/soa/` 四檔 + `app.module.ts` 註冊**
  - DoD: **2 個端點**（`GET /soa` · `POST /soa`）；⛔ 無 GET-by-id（無先例，不開新形狀）
  - Verify: `npm run test -w apps/api -- soa.controller`
  - → **16 / 16 通過**。藍本 `issue.controller.ts`（單表形狀）。⭐ **兩件事是新的**：
    (a) `applicable` 是**第一個必填的非字串** —— 各 controller 開頭那個 `typeof !== 'string'`
    迴圈會把 `false` 擋掉，而 `false` 正是「判定不適用」那一半，所以它自己一條檢查；
    (b) **409 不併入 404 家族**（W10 之後第 2 個）
  - → ⛔ **coverage 抓到一個真實缺口**：`justification` / `approvedBy` / `ownerUserId` 三個
    連續的同型三元運算式，**present 分支全部沒被執行過**（controller branch 85.71%）。
    補一條測試後 **92.85%**，全域 branch 由 90.56 → **91.01（高於 baseline 90.81）**

### 2.2 整合 + 範疇測試

- [x] **`soa.int.spec.ts`：4 個範疇測試**
  - DoD: 跨實體讀拒 / 跨實體寫拒**且資料未變** / RLS 層獨立成立 / **唯一鍵不洩漏存在性**
  - Verify: `npm run test:int -w apps/api -- soa`
  - → **11 / 11 通過**（test 5 讀 · 6 寫且未變 · 7 INSERT policy 獨立 · 10 唯一鍵不洩漏；
    另 8 刪除被 privilege 擋 · 9 roll-up 子樹）
  - → ⚠️ **不 seed 任何 SoA 列** —— 每個 isolation 斷言所需的兩側都由該測試自己建。
    ⛔ **clause_ref 必須全程唯一**：`retired_at` 不在唯一鍵裡，退休不釋放鍵
  - → ⚠️ test 10 目前只證明「兩者相同」，**不證明是唯一鍵造成的** —— 那要 Day 3 的 N3

### 2.3 `02a` deviation 註記

- [x] **`02a:215` 加 D1 / D2 / D4 的 recorded deviation**
  - DoD: 形式沿用 `:219` / `:225` / `:260`（既有三個 deviation 的寫法）
  - Verify: 讀回該段，確認三個 deviation 各自說明「規格說什麼 / 建了什麼 / 為什麼」
  - → ⭐ **選 inline（`:225` / `:227` 的形式）而非 blockquote（`:219` / `:260`）**，
    理由是 **AP-7 orphan claim**：blockquote 會讓 `02a` 之後每一行位移，而 repo 內有大量
    `02a:NNN` 引用。實測 **514 → 514 行、`1 insertion(+) 1 deletion(-)`**，零位移零失效引用
  - → 三個 deviation 各自引了它所沿用的先例（`:217` `Control.framework_refs` ·
    `:225` `ControlTest.result` · `:260` `RMReportVersion.state`）

### 2.x Full gate

- [x] lint 0 · format check ×2 · type 0 · build clean ×2 · api unit · api int · web ·
      coverage 不低於 baseline · `run_all` 8/8 · `check_entity_index` **20/35** · `lint:negative`
  - ⛔ **九項全跑才能說「gate 全綠」**
  - → **十一項全跑，逐項取 exit code**（不共用管線後的 `$?`）：format **0** · lint **0** ·
    type **0** · build **0** · `lint:negative` **0** · api unit **376 / 35** · api int **171 / 13** ·
    web **10 / 1** · `run_all` **8/8** · `check_entity_index` **20 / 35** · coverage exit 0
  - → ⚠️ **coverage 有兩項低於 baseline，不宣稱「不低於」**：
    stmts **92.01 → 91.83**（−0.18）· lines **93.44 → 93.29**（−0.15）；
    branches **90.81 → 91.01**（+0.20）· funcs **97.4 → 97.5**（+0.10）。
    機械成因：`soa.module.ts` 覆蓋率 **0%**（第 17-27 行），而**既有 10 個 `*.module.ts` 全部是 0%**
    —— DI wiring 只被 int suite 走過，而 int 跑在另一個 jest config。每加一個模組資料夾都會稀釋一次，
    前 7 個 slice 皆然。門檻 80/70/80/80 全部通過（`test:cov` exit 0）

---

## Day 3 — 整合驗證（純後端 ⇒ 無 drive-through）(US-4)

_(本 phase 無 user-facing surface。報告一律寫 **gate-only verified**，絕不暗示可用性。)_

### 3.1 中性化預測（⛔ 寫下並 **commit** 之後才執行）

- [x] **四個中性化的預期方向寫進 progress.md 並 commit**
  - DoD: N1 SELECT policy · N2 INSERT `WITH CHECK` · N3 唯一鍵中的 `org_entity_id` ·
    N4 複合 FK —— 每個寫明**預期哪些測試轉紅、哪些不動**
  - ⚠️ **N2 預期可能零轉紅**（`AD-BorrowedRefusal-1` 已 5 次）—— 預測要寫出來，不是事後解釋
  - → 預測表已寫進 progress §3.1 並**先 commit**。基準 `soa.int.spec.ts` **11 passed**
  - → ⛔ **N4 改標的**：plan 寫「複合 FK」，但 D10 已確認本表**沒有**複合 FK。改指
    `..._update` 的 `WITH CHECK` 半邊 —— 那是本表唯一沒被任何測試量過的 guard。plan §3.y 原文保留
  - → ⚠️ **N2 這次預期「會」轉紅**（測試 7 是照 `AD-BorrowedRefusal-1` 的教訓寫的）；
    改成 **N4 預期零轉紅**。預測寫在前面，不是事後解釋

### 3.2 執行 + 逐項對照

- [x] **四個中性化各自執行、還原、記錄**
  - DoD: 每個 case 跑完立即還原並驗證還原成功；控制組與最終還原各驗一次
  - ⛔ **零轉紅先查再下結論**；**方向不符預期時先懷疑元驗證本身**（`AD-MetaVerificationBug-1`）
  - Verify: 結果表逐列對照預測表
  - → 控制組 **11 passed**；每次 `git checkout apps/api/prisma/migrations/` 後確認該目錄為空
  - → 原定四項 **4 / 4 方向全中**：N1（5 · 9 紅）· N2（7 紅、6 綠）· N3（10 紅）· N4（零轉紅）
  - → ⛔ **追加的 N4d / N4c 兩項預測全錯（0 / 2）** —— 而錯的那兩個逼出了隔離實驗
  - → 🚩 **真相：擋住跨實體搬移的是 SELECT policy，不是 `_update` 的 `WITH CHECK`**。
    逐條放行到 `_read` 才放行成功（`UPDATE 1`）。migration 第 117-120 行的因果**已更正**。
    ⚠️ 改的是**尚未被任何 DB 套用**的 migration —— 先查過 `isms_dev` 的 `_prisma_migrations` 才動
  - → 補 **測試 12**（raw UPDATE、無 `RETURNING`）：它釘住**行為**，且**刻意不宣稱是哪一層做的**

### 3.3 D3 的實測（`AD-UniqueKeyOracle-1` 第 2 個資料點）

- [x] **量測唯一鍵是否為 existence oracle**
  - DoD: N3 狀態下，撞別實體的 `(framework, clause_ref)` 與不撞的**回不同 SQLSTATE**；
    修補後兩者收斂。⭐ **這是量測不是宣稱**
  - Verify: int 測試逐一斷言 SQLSTATE
  - → **量到了**：撞 HK1 持有的 clause → `DuplicateKeyError`（**23505**）；撞沒人持有的 → **成功**。
    鍵含 `org_entity_id` 時**兩者都成功**
  - → ⭐ 判準**可移轉到沒有 parent 的表**，但**失敗模式不同**：W10 是 23505 vs 23503
    （兩個都是錯誤）；這裡是 **23505 vs 成功** —— 沒有 FK 可掉下去，oracle **更響亮**

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-028-w11-soa.md`**（Problem / Root Cause / Solution /
      Verification / Impact —— 含四個 deviation 的理由 + **gate-only verified** 聲明）

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 5 個資料點**；
      ⚠️ **必須自報量法** —— 本 phase 宣告為**含 Day 0**（`AD-CalibrationDay0InOrOut-1`））
  - → ratio **1.13 IN** —— ⭐ **本欄第一個 IN-band 點**，也是第一個事先宣告量法的點。
    ⛔ 但暴露量法**第三個**模糊處：起草在首個 commit 之前，不在窗口內 ⇒「含 Day 0」有兩種讀法
- [x] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）
- [x] Final gate sweep（九項全跑，逐項寫實際數字）→ progress §Day 4
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（新增 AD + §Shipped 加 1 行）· `ROADMAP.md` 第 4 列推進 ·
      `RISK_REGISTER.md`（**R4 17 → 18 張表無稽核**）
  - ⛔ **BACKLOG 計數在最後一次編輯之後跑** `python scripts/lint/check_backlog_counts.py`
    （CH-027 交付；它已經抓到過一次真實漂移）
  - → **95 條（P0 7 / P1 53 / P2 35）** —— ⭐ 四個數字**全部由 detector 印出**
    （它報 total +4 / P0 +1 / P1 +2 / P2 +1），我沒有手數。新增 4 · 更新 5 · 關閉 0
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      ⚠️ 含 **AP-7 orphan claim**：本 phase 若動 `02a` 行數，檢查誰引用了那些行號
  - → **AP-7 違規 1 條**：migration 第 117-120 行宣稱了一個沒量過的因果（Day 3 已更正）。
    ⭐ `02a` 行數**未動**（514 → 514），所以沒有任何行號引用失效
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view` 驗證後翻 `status:` 標籤
  - ⚠️ **rebase merge 會改寫 SHA** —— 若 closeout 引用了「預測寫在前面」的 commit，
    改指 main 側並補 **author date**（CH-027 量到它逐秒不變）
  - 🚧 **阻塞於使用者確認** —— push 是 outward-facing，依 Developer Preferences 必問。
    ⚠️ 本 phase 的 closeout 引用了 `0e4b1c6`（預測寫在執行之前的證據），rebase merge 後要改指
