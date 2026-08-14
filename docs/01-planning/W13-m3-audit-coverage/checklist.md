# Phase W13 — Checklist (Audit coverage: 1 → every reachable write path)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD **`fa37d6b`** —— PR #60 已 merge，取其後）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 14 個目標逐一確認（13 個 EDIT 檔存在 / 1 個 NEW 不存在）；
      `CH-030` 編號未被佔用 ✅ **0 漂移**（最大號 CH-029，含 6 個資料夾形式；modules int spec 恰好 11 個）
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -1`
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] ⭐ **D-reach** — 「14 個可達 / 5 個不可達」**用第二條獨立路徑交叉檢查**
        （正向：枚舉 `client.<delegate>.(create|update|upsert)`；反向：`^model` 全集減去正向結果）。
        ⛔ **兩條路徑不一致就先查方法，不要挑一個相信**（`AD-NarrowPatternWideClaim-1`，W12 再現 3 次）
  - [x] ⭐ **D-vacuous** — **逐一讀**每個 int spec 的範疇測試，數出缺非空前提的個數 ✅ **4 個（≤ 5）**
        ⛔ **不 grep 命中數** —— `asset.int.spec.ts` 對 `約束 8` 是 **0 命中而測試存在**（審計 #5 §2.6b）
        ⛔ **若超過 5 個 → 範圍變動 20-50% ⇒ 修訂 plan 並跟使用者再確認**，不要默默吸收
  - [x] **D-refcode** — `ref-code.ts:97` 的 upsert 是否**真的每次 create 都跑**（量，不是讀 code）
        ✅ 讀 code 成立（15 呼叫點 ↔ 15 create）；⛔ **量的部分仍歸 Day 3 N3，此處未量**
        ⭐ 附帶 `D-refcode-b`：upsert 的 args 無 `data` key ⇒ 多實體 scope 下會 throw（→ plan §Risks）
  - [x] **D-limits** — ADR-0003 三條已知限制（`before` NULL · `after` 是請求 payload ·
        `resource_id` create 不可得）對 14 個模型**逐一**判定可否接受；不可接受的**指名**
        ✅ **0 個不可接受** —— 14 個全部有 `refCode` + `orgEntityId`；且全 codebase 只有 create ⇒ 限制 1 無害
  - [x] **D-roadmap** — `ROADMAP` 4c 與 `BACKLOG` 的 `AD-AuditCoverageOneTable-1` 都寫「其餘 **20** 張表」，
        而 recon 說 14。⭐ **那是我在 W12 closeout 寫的** —— 確認後兩處措辭一起改
        ✅ **成立，實為 3 處**（`ROADMAP:78` · `BACKLOG:115` · `STATUS_AUDIT:271`）；前兩者 Day 4 改，
        ⛔ 後者是歷史快照**不改**
- [x] **Prong 2.5 — child component tree**：**N/A**（無前端）
- [x] **Prong 3 — schema verify**：**本片無 schema / migration 變更** ——
      確認 `git diff --stat main..HEAD -- apps/api/prisma/` 全程為空即為通過 ✅ 輸出為空
- [x] **D-baselines** — api unit **451 / 38** · api int **187 / 15** · web **10 / 1** ·
      coverage **92.27 / 91.66 / 98.95 / 93.64** · `run_all` **8/8** ·
      `check_entity_index` **21 / 35** · lint 0 · type 0 · build clean ×2
  - ⛔ **逐項取 exit code**（各自 `> log 2>&1; echo $?`），不共用管線後的 `$?`
- [x] **Catalog drift** — progress.md Day-0 表格（`D1..Dn`）✅ 11 條 + 1 條順路發現記入 BACKLOG 待辦
- [x] **Go/no-go** — 範圍變動 % → 繼續 / 修訂 / 中止 ✅ **~5% ⇒ 繼續 Day 1**
  - ⛔ **D-vacuous > 5 個** 或 **D-limits 有模型不可接受** ⇒ 20-50% ⇒ **修訂並再確認**
    （實測 4 / 0，兩條門檻皆未觸發）

### 0.2 Branch

- [x] `git checkout -b feature/W13-audit-coverage`（從當時的 `main`）—— base `fa37d6b`（PR #60 已 merge）

---

## Day 1 — 空集合回頭檢查（US-1）

> ⛔ **這一天排在擴表之前是刻意的。** 接完再查，會得到 15 張表的範疇測試而不知道
> 其中幾項只在空集合上為真（`AD-VacuousScopeTest-1`）。

### 1.1 逐一讀 + 分類

- [x] **每個 int spec 的範疇測試逐一讀過並分類**
  - DoD: 產出結果表 —— **查了幾個 / 幾個缺非空前提 / 幾個本來就對**，逐檔指名
        ✅ **13 個 spec / ~30 個範疇測試 → 4 缺、~26 本來就對**（逐檔表在 progress.md §1.1）
  - Verify: 結果表寫進 progress.md ✅
  - ⛔ **不用命中數代替逐檔讀**（`asset.int.spec.ts` 是現成的反例）
    ✅ 逐一讀 body；grep 只用來定位斷言形狀。⭐ 反而抓到我**記錯了這條 AD 的標的**

### 1.2 補非空前提

- [x] **缺的逐一補上**
  - DoD: 每個補上的斷言要先斷言「對造實體確實有 N > 0 列」再斷言「本實體看不到它們」
        ✅ 4 處（commit `70db22e`）。⚠️ **前提來源不同**：3 處讀回 seed、`risk` 一處**必須自建**
        （seed 沒有 `risks`）—— 若假設 seed 兩邊都有，那一處會補成另一個恆真斷言
  - Verify: `npm run test:int -w apps/api` ✅ **187 / 15**
  - ⛔ **補完之後必須在「資料被清空」的狀態下驗一次它會紅** ——
    否則補的可能是另一個永遠為真的斷言（W12 的 N2 就是這樣被抓到的）
    ✅ **V1–V4 執行完畢，4/4 方向全中**（`4 failed / 183 passed`，紅的恰好是那四個）；
    還原後 `git status` 空 + 重跑 187/15。預測先 commit（`c17c9b5`）再執行

### 1.x partial gate

- [x] format ×2 · lint · type-check · api int —— **逐項取 exit code，只報跑過的**
  - ✅ format `apps/api` **0** · format `apps/web` **0** · lint **0** · type-check **0** · api int **187 / 15**
  - ⛔ 未跑的項目要明確列出，**不得寫成「gate 全綠」**（`AD-PartialGateReportedAsFull-1` 已 3 次）
    ⚠️ **本日未跑**：api unit · web test · build ×2 · `lint:negative` · coverage · `run_all`
    ⇒ **這不是「gate 全綠」，是 partial gate**。完整清單在 Day 2 §2.x

---

## Day 2 — 覆蓋 + 每個模型的守衛（US-2, US-3）

### 2.1 允許清單

- [ ] **`audit.module.ts`：`AUDITED_MODELS` 1 → 15 個名字**
  - DoD: 名字由 **Day 0 的 D-reach 枚舉導出**，不是手抄；**枚舉方法寫在常數旁邊**
  - Verify: `npm run test:int -w apps/api -- audit`
  - ⛔ **不加沒有寫入路徑的名字** —— 一個永遠不會被觸發的清單項是 AP-3，且會讓覆蓋率看起來更好
  - ⛔ **`RefCodeCounter` 不接**，理由寫在清單旁（plan §3.2），**不是靜靜跳過**

### 2.2 每個模型一條覆蓋測試

- [ ] **11 個模組的 int spec 各加「這個寫入留下恰好一列稽核」**
  - DoD: 斷言**恰好一列**（不是 ≥ 1），且該列的 `resource_type` 等於該模型名
  - Verify: `npm run test:int -w apps/api`
  - ⚠️ **`AssessmentResponse` 順帶量一次成本**（`AD-ResponseRefCodeCost-1`：40 題 = 40 次發號，
    現在再加 40 列稽核）—— **量並記錄，本片不最佳化**

### 2.3 跨模型的覆蓋斷言

- [ ] **`audit.int.spec.ts`：清單 vs 實際寫入面的一致性測試**
  - DoD: 若有人新增了 repository 寫入路徑而沒有加進清單，**這個測試要紅**
  - Verify: `npm run test:int -w apps/api -- audit`
  - ⛔ 這是本片唯一能防止「下一張表又忘了接」的機制 —— 沒有它，R4 的失效模式會原封不動回來

### 2.x Full gate

- [ ] format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit · api int ·
      web · coverage（**branch / funcs 不低於 baseline**）· `run_all` 8/8 ·
      `check_entity_index` **21 / 35**
  - ⛔ **十一項全跑才能說「gate 全綠」**
  - ⚠️ `check_entity_index` **不應變動** —— 本片不建表。變了就是有東西不對

---

## Day 3 — 中性化元驗證（純後端 ⇒ 無 drive-through）(US-4)

_(本 phase 無 user-facing surface。報告一律寫 **gate-only verified**，絕不暗示可用性。)_

### 3.1 中性化預測（⛔ 寫下並 **commit** 之後才執行）

- [ ] **四個中性化的預期方向寫進 progress.md 並 commit**
  - DoD: N1 清空清單 · N2 **只移除 `Issue` 一個名字** · N3 補回 `RefCodeCounter` ·
    N4 拿掉某個 Day 1 補的非空前提 —— 每個寫明**預期哪些測試轉紅、哪些不動**
  - ⚠️ **中性化 = 放行，不是刪除**
  - ⚠️ **預測「哪個測試會紅」之前先看該 spec 的執行順序**（W12 的 N4 在這裡掛錯了測試）

### 3.2 執行 + 逐項對照

- [ ] **四個中性化各自執行、還原、記錄**
  - DoD: 每次跑完立即還原並驗證（`git status --short` 為空）；控制組與最終還原各驗一次
  - ⛔ **零轉紅先查再下結論**；⛔ **方向不符預期時先懷疑元驗證本身**（`AD-MetaVerificationBug-1`，
    W12 已驗到 3/3 可回流）
  - ⛔ **補完測試後必須重跑該中性化**（W10 / W11 各漏過一次，W12 做對了）
  - ⭐ **N2 是本片的驗收核心**：預期**恰好** `issue` 模組的覆蓋測試轉紅、其餘 14 個不動。
    若是「全部紅」或「全部綠」，代表覆蓋不是逐模型成立的

### 3.3 `RefCodeCounter` 的實測（N3）

- [ ] **量到接上它的實際後果**
  - DoD: 一次領域 create 之後的 `audit_log` 列數（預期 2 而非 1）+ counter 那列的 `after` 內容
  - Verify: 結果寫進 progress.md
  - ⛔ **plan §3.2 的判定必須由這個數字支持，不是由推測支持**

### 3.x Full gate（⛔ 逐項複製 Day 2 §2.x 的清單 —— 中性化本身會改 code）

- [ ] format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit · api int ·
      web · coverage · `run_all` 8/8 · `check_entity_index` 21/35

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-030-w13-audit-coverage.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含覆蓋率表 + 中性化表 + **gate-only verified** 聲明）
  - ⛔ **非 spike ⇒ 不產出 design note**（機制由 W12 的 note 承載，本片是複用）
  - ⛔ **無架構級決定 ⇒ 不產出 ADR**。若 Day 1-3 出現需要 ADR 的決定 → **STOP and ask**

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 6 個資料點**；
      ⚠️ 自報量法 = **含 Day 0，窗口為 branch 首個 commit → closeout commit**）
  - ⛔ **actual 等 closeout commit 真的存在之後再算** —— W12 首次執行該修法，本片是**第 2 次**
  - ⭐ **同時驗證兩個估法**：舊 bottom-up 4.5 hr vs 新法「有藍本改差異 5 項 × ≈8 min ≈ 40 min
    + 無藍本 1 項」（`AD-BottomUpBlueprint-1` 的第 2 個對照點）
- [ ] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）
- [ ] Final gate sweep（十一項全跑，逐項寫實際數字）
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（**CLOSE `AD-AuditCoverageOneTable-1`** + §Shipped 加 1 行）·
      `ROADMAP.md`（4c → ✅）· `RISK_REGISTER.md`
  - ⛔ **R4 的新數字必須機械導出**（`AUDITED_MODELS.size` vs `^model` 數），
    導出方法寫進 CH-030 —— `AD-RiskTableCountManual-1` 剛在 W12 被實地擊中
  - ⛔ **R4 措辭**：接上 15 / 21 不等於「已解決」——
    5 個模型沒有寫入路徑、`RefCodeCounter` 刻意不接、raw query 仍是洞，**逐項寫出來**
  - ⛔ **BACKLOG 計數在最後一次編輯之後跑** `python scripts/lint/check_backlog_counts.py`
  - ⚠️ **Day 0 的順路發現要落地**：`assessment.int.spec.ts:346` 標題說「on all three tables」
    而 body 只測 2 張（`responses` 未測）—— 新增一條 AD，**本片不修**（`CH-017` 配額）
  - ⚠️ **D-roadmap 若成立**：`ROADMAP` 4c 與 BACKLOG 的「其餘 20 張表」措辭一併更正
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      ⚠️ 含 **AP-3**：允許清單加了名字算不算 Potemkin？**判準是 N2 有沒有讓恰好一個模組轉紅**
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view` 驗證後翻 `status:` 標籤
  - ⚠️ **rebase merge 會改寫 SHA** —— 引用「預測寫在前面」的 commit 要改指 main 側。
    ⭐ **掃描範圍是全 repo 不是 `docs/`**（W12 有一處引用在 `bench.int.spec.ts` 的 header）
