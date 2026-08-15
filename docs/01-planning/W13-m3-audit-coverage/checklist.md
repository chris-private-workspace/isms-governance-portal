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
        ✅ 4 處（commit `d8a74b6`）。⚠️ **前提來源不同**：3 處讀回 seed、`risk` 一處**必須自建**
        （seed 沒有 `risks`）—— 若假設 seed 兩邊都有，那一處會補成另一個恆真斷言
  - Verify: `npm run test:int -w apps/api` ✅ **187 / 15**
  - ⛔ **補完之後必須在「資料被清空」的狀態下驗一次它會紅** ——
    否則補的可能是另一個永遠為真的斷言（W12 的 N2 就是這樣被抓到的）
    ✅ **V1–V4 執行完畢，4/4 方向全中**（`4 failed / 183 passed`，紅的恰好是那四個）；
    還原後 `git status` 空 + 重跑 187/15。預測先 commit（`874309f`）再執行

### 1.x partial gate

- [x] format ×2 · lint · type-check · api int —— **逐項取 exit code，只報跑過的**
  - ✅ format `apps/api` **0** · format `apps/web` **0** · lint **0** · type-check **0** · api int **187 / 15**
  - ⛔ 未跑的項目要明確列出，**不得寫成「gate 全綠」**（`AD-PartialGateReportedAsFull-1` 已 3 次）
    ⚠️ **本日未跑**：api unit · web test · build ×2 · `lint:negative` · coverage · `run_all`
    ⇒ **這不是「gate 全綠」，是 partial gate**。完整清單在 Day 2 §2.x

---

## Day 2 — 覆蓋 + 每個模型的守衛（US-2, US-3）

### 2.1 允許清單

- [x] **`audit.module.ts`：`AUDITED_MODELS` 1 → 15 個名字**
  - DoD: 名字由 **Day 0 的 D-reach 枚舉導出**，不是手抄；**枚舉方法寫在常數旁邊**
        ✅ 兩條路徑的 grep 指令逐字寫在 docstring 裡，下一個人可以重跑而不是相信這 15 個字串
  - Verify: `npm run test:int -w apps/api -- audit` ✅ **203 / 16**
  - ⛔ **不加沒有寫入路徑的名字** —— 一個永遠不會被觸發的清單項是 AP-3，且會讓覆蓋率看起來更好
    ✅ 5 個未加，理由寫在常數旁；漂移守衛的 `unreachable` 斷言會在有人加了不可達的名字時轉紅
  - ⛔ **`RefCodeCounter` 不接**，理由寫在清單旁（plan §3.2），**不是靜靜跳過**
    ✅ 且理由已由 Day-0 `D-refcode-b` 升級：不只訊噪比，**多實體 scope 下會 throw**

### 2.2 每個模型一條覆蓋測試

- [x] **11 個模組的 int spec 各加「這個寫入留下恰好一列稽核」**
  - ⛔ **做法變更（R3，plan §4 DEVIATION）**：11 個模組 spec **未被修改**。實測顯示它們的
    module-local 圖裡沒有 audit hook（`before=9 after=9`），在那裡斷言等於 AP-3。
    改為新建 **`audit-trail/audit-coverage.int.spec.ts`**（composes AppModule），**15 條**覆蓋測試
  - DoD: 斷言**恰好一列**（不是 ≥ 1），且該列的 `resource_type` 等於該模型名
        ✅ 且「恰好一列」是**依本次 `refCode` 查**得出的，不是 count delta（兩個 AppModule suite 會 race）
  - Verify: `npm run test:int -w apps/api` ✅ **203 / 16**
  - ⚠️ **`AssessmentResponse` 順帶量一次成本**（`AD-ResponseRefCodeCost-1`：40 題 = 40 次發號，
    現在再加 40 列稽核）—— **量並記錄，本片不最佳化**
    🚧 **本日未量** —— 覆蓋測試只寫 1 筆 response，量不到 40 題的批次成本。
    解封：Day 3 N3 量 `RefCodeCounter` 時一併做（同一個「每次 create 的附加成本」問題）

### 2.3 跨模型的覆蓋斷言

- [x] **`audit.int.spec.ts`：清單 vs 實際寫入面的一致性測試**
  - ⚠️ **落在 `audit-coverage.int.spec.ts`** 而非 `audit.int.spec.ts`（同一個 DEVIATION：
    後者的主題是機制 —— chain / verify / 約束 8；覆蓋與漂移是另一件事）
  - DoD: 若有人新增了 repository 寫入路徑而沒有加進清單，**這個測試要紅**
        ✅ 掃 `core-model/*.ts` 導出 delegate → model 名 → 三方向斷言（未稽核 / 不可達 / 相等）
        + 一條非空前提（`size > 10`），否則掃不到東西時它自己就是空集合上的真
  - Verify: `npm run test:int -w apps/api -- audit` ✅
  - ⛔ 這是本片唯一能防止「下一張表又忘了接」的機制 —— 沒有它，R4 的失效模式會原封不動回來

### 2.x Full gate

- [x] format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit · api int ·
      web · coverage（**branch / funcs 不低於 baseline**）· `run_all` 8/8 ·
      `check_entity_index` **21 / 35**
  - ✅ **十一項全跑**：format **0/0** · lint **0** · type **0** · build **0/0** ·
    `lint:negative` **PASS**（`skipped 54 test`）· unit **451/38** · **int 203/16** · web **10/1** ·
    coverage **92.27 / 91.66 / 98.95 / 93.64**（逐位同 baseline）· `run_all` **8/8** ·
    `check_entity_index` **21/35**
  - ⛔ **十一項全跑才能說「gate 全綠」**
  - ⚠️ `check_entity_index` **不應變動** —— 本片不建表。變了就是有東西不對 ✅ **未變動**

---

## Day 3 — 中性化元驗證（純後端 ⇒ 無 drive-through）(US-4)

_(本 phase 無 user-facing surface。報告一律寫 **gate-only verified**，絕不暗示可用性。)_

### 3.1 中性化預測（⛔ 寫下並 **commit** 之後才執行）

- [x] **四個中性化的預期方向寫進 progress.md 並 commit**
  - DoD: N1 清空清單 · N2 **只移除 `Issue` 一個名字** · N3 補回 `RefCodeCounter` ·
    N4 拿掉某個 Day 1 補的非空前提 —— 每個寫明**預期哪些測試轉紅、哪些不動**
    ✅ commit `54a509a`，**逐測試**預測（不是總數）
  - ⚠️ **中性化 = 放行，不是刪除** ✅ N1 註解掉清單內容、N2 只移一個名字、N3 加一個名字
  - ⚠️ **預測「哪個測試會紅」之前先看該 spec 的執行順序**（W12 的 N4 在這裡掛錯了測試）
    ✅ 先數了 `audit.int.spec` 12 個 / `audit-coverage` 16 個並逐條標理由
    ⛔ **但仍漏了一個 suite** —— 我只列「會受影響的兩個」，沒 grep 誰 import `AUDITED_MODELS`
    （實為 **4 個**檔案，含 `bench.int.spec.ts`）→ N1 / N3 各因此少算

### 3.2 執行 + 逐項對照

- [x] **四個中性化各自執行、還原、記錄**
  - DoD: 每次跑完立即還原並驗證（`git status --short` 為空）；控制組與最終還原各驗一次
        ✅ 四次還原各驗一次 + 最終控制組 **203 / 16 全綠**
  - ⛔ **零轉紅先查再下結論**；⛔ **方向不符預期時先懷疑元驗證本身**（`AD-MetaVerificationBug-1`，
    W12 已驗到 3/3 可回流）
    ✅ **第 4 個資料點**（Day 2 的實驗 B：`await import()` 在 jest CJS 下失敗，
    誤讀會導出完全相反的設計）
  - ⛔ **補完測試後必須重跑該中性化**（W10 / W11 各漏過一次，W12 做對了）—— N/A，本片無補測試環節
  - ⭐ **N2 是本片的驗收核心**：預期**恰好** `issue` 模組的覆蓋測試轉紅、其餘 14 個不動。
    若是「全部紅」或「全部綠」，代表覆蓋不是逐模型成立的
    ✅ **恰好 2 紅**（`Issue` 覆蓋 + 漂移守衛，後者紅是設計上正確）· 201 綠 · 其餘 14 條**未動**
  - **結果**：N1 27 紅（預期 26）· **N2 恰好 2** ✅ · N3 5 紅（預期 2，量測 3/3 全中）· N4 0 紅 ✅

### 3.3 `RefCodeCounter` 的實測（N3）

- [x] **量到接上它的實際後果**
  - DoD: 一次領域 create 之後的 `audit_log` 列數（預期 2 而非 1）+ counter 那列的 `after` 內容
        ✅ **2 列**；counter 那列 `{"t":"RefCodeCounter","id":null,"after":null}`
        ✅ 多實體 scope **實測 throw** `UnattributableWriteError`（逐字記在 progress.md）
  - Verify: 結果寫進 progress.md ✅
  - ⛔ **plan §3.2 的判定必須由這個數字支持，不是由推測支持**
    ✅ 判定不變，理由由 2 條變 **3 條**，且 ⭐ **第 3 條是實測撞出來的**：
    `issueRefCode` 在自己的交易裡先跑，所以**失敗的寫入會留下一列稽核** ——
    稽核軌跡會記錄一件沒發生的事。三條全部寫進 `audit.module.ts` 常數旁

### 3.x Full gate（⛔ 逐項複製 Day 2 §2.x 的清單 —— 中性化本身會改 code）

- [x] format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit · api int ·
      web · coverage · `run_all` 8/8 · `check_entity_index` 21/35
  - ✅ **十一項全跑**：format **0 / 0** · lint **0** · type **0** · build **0 / 0** ·
    `lint:negative` **PASS** · unit **451 / 38** · **int 203 / 16**（控制組）· web **10 / 1** ·
    coverage **92.27 / 91.66 / 98.95 / 93.64** · `run_all` **8 / 8** · `check_entity_index` **21 / 35**

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-030-w13-audit-coverage.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含覆蓋率表 + 中性化表 + **gate-only verified** 聲明）
  - ✅ 另含 ⛔ **「覆蓋」一詞的限定**（15 個寫入全是 create）+ `RefCodeCounter` 的**三條實測理由**
  - ⛔ **非 spike ⇒ 不產出 design note**（機制由 W12 的 note 承載，本片是複用）✅ 未產出
  - ⛔ **無架構級決定 ⇒ 不產出 ADR**。若 Day 1-3 出現需要 ADR 的決定 → **STOP and ask**
    ✅ 未出現 —— plan §4 的做法變更是**測試放哪裡**，不是架構決定；已依 R3 記錄在 plan §4 DEVIATION

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`pattern-reuse-feature` 0.50，**第 6 個資料點**；
      ✅ **ratio 0.884–0.921 IN**，⛔ 但**自報的窗口法本次失效**（跨夜 729 min 間隙 → 13.67 hr 荒謬值），
      改用兩段量法並把不確定性報成**區間**，兩端同 band → `AD-CalibrationWindowCrossSession-1`
      ⚠️ 自報量法 = **含 Day 0，窗口為 branch 首個 commit → closeout commit**）
  - ⛔ **actual 等 closeout commit 真的存在之後再算** —— W12 首次執行該修法，本片是**第 2 次**
  - ⭐ **同時驗證兩個估法**：舊 bottom-up 4.5 hr vs 新法「有藍本改差異 5 項 × ≈8 min ≈ 40 min
    + 無藍本 1 項」（`AD-BottomUpBlueprint-1` 的第 2 個對照點）
- [x] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）✅ **340 字元**，
      `check_rules_hygiene` OK；完整敘述在 `CALIBRATION-LOG.md` §1
- [x] Final gate sweep（十一項全跑，逐項寫實際數字）
  - ✅ format **0/0** · lint **0** · type **0** · build **0/0** · `lint:negative` **PASS** ·
    unit **451/38** · int **203/16** · web **10/1** · coverage **92.27/91.66/98.95/93.64** ·
    `run_all` **8/8** · `check_entity_index` **21/35** —— 逐項表在 progress.md Day 4
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（**CLOSE `AD-AuditCoverageOneTable-1`** + §Shipped 加 1 行）·
      `ROADMAP.md`（4c → ✅）· `RISK_REGISTER.md`
  - ✅ 全數完成。**額外關閉** `AD-VacuousScopeTest-1`（通則）；新增 **6** 條（含 Day 4 自己發現的
    `AD-MemoryEntryRatchet-1`）⇒ BACKLOG 100 → **104**，P0 **8 → 7**
  - ⛔ **R4 的新數字必須機械導出**（`AUDITED_MODELS.size` vs `^model` 數），
    導出方法寫進 CH-030 —— `AD-RiskTableCountManual-1` 剛在 W12 被實地擊中
  - ⛔ **R4 措辭**：接上 15 / 21 不等於「已解決」——
    5 個模型沒有寫入路徑、`RefCodeCounter` 刻意不接、raw query 仍是洞，**逐項寫出來**
  - ⛔ **BACKLOG 計數在最後一次編輯之後跑** `python scripts/lint/check_backlog_counts.py`
  - ⚠️ **Day 0 的順路發現要落地**：`assessment.int.spec.ts:346` 標題說「on all three tables」
    而 body 只測 2 張（`responses` 未測）—— 新增一條 AD，**本片不修**（`CH-017` 配額）
  - ⚠️ **D-roadmap 若成立**：`ROADMAP` 4c 與 BACKLOG 的「其餘 20 張表」措辭一併更正
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數 ✅ **總計 0**
      ⚠️ 含 **AP-3**：允許清單加了名字算不算 Potemkin？**判準是 N2 有沒有讓恰好一個模組轉紅**
      ✅ **N2 恰好 2 紅（該模型 + 漂移守衛）、其餘 14 條未動** ⇒ AP-3 = **0**。
      ⛔ 若照原 plan 把測試寫進 module-local 圖，這一格會是 **15**
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view` 驗證後翻 `status:` 標籤
  - ⚠️ **rebase merge 會改寫 SHA** —— 引用「預測寫在前面」的 commit 要改指 main 側。
    ⭐ **掃描範圍是全 repo 不是 `docs/`**（W12 有一處引用在 `bench.int.spec.ts` 的 header）
