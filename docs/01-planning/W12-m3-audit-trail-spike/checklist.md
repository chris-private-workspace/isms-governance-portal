# Phase W12 — Checklist (Audit-trail hash chain spike → ADR-0003)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `1c5a6ac`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 14 個目標逐一確認（NEW 檔不存在 / EDIT 檔存在）；
      `CH-029` 編號未被佔用；`docs/02-architecture/design-notes/` 存在
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -1`
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-fields** — `multi-tenant-data.md` §稽核軌跡 的欄位**逐欄**對照 `05:21` 的六項
        Content 要求（actor / action / target / before-after / timestamp / source context），
        缺哪一項要指名
        ⚠️ **不得用命中數代替逐欄讀**（`AD-NarrowPatternWideClaim-1`，本週第 4 次）
  - [x] **D-txn** — ⭐ 讀 `scoped-prisma.provider.ts` 的交易邊界，回答：
        「讀 `prev_hash` 與寫新列**能不能**在同一個交易內」。**這一格決定選項 A/C 可不可行**
  - [x] **D-intercept** — 讀 ADR-0004 §Consequences 的實際措辭，確認「攔截點與 entity-scope
        共用」是**它說的**還是 `decision-form.md:25` 的轉述
  - [x] **D-index** — `02a` §0 的 `audit_log` 那一列仍為 Wave 1 且註記未變；
        `AuditLog` / `audit_log` 在 `schema.prisma` 零命中
  - [x] **D-throughput** — 取得**接稽核之前**的單次寫入基準（沒有它就沒有「變慢多少」）
  - [x] **D-appendonly** — 讀 W10 的 `rm_report_versions` migration：append-only 當時被量到
        是 **GRANT** 在擋不是 policy。確認今天那個結論的措辭，本 phase 的 N3 要重量一次
- [x] **Prong 2.5 — child component tree**：**N/A**（無前端）
- [x] **Prong 3 — schema verify**：`audit_log` 不存在；migration head 與 `schema.prisma` 一致；
      ⛔ 確認 dev DB checksum 漂移（`AD-DevDbChecksumDrift-1`）**是否仍在** ——
      仍在則 migration 手寫，並記下 `_prisma_migrations` 的查詢結果
- [x] **D-baselines** — api unit **376 / 35** · api int **172 / 13** · web **10 / 1** ·
      coverage **91.83 / 91.01 / 97.5 / 93.29** · `run_all` **8/8** ·
      `check_entity_index` **20 / 35** · lint 0 · type 0 · build clean ×2
  - ⛔ **逐項取 exit code**（各自 `> log 2>&1; echo $?`），不共用管線後的 `$?`（W11 D9）
- [x] **Catalog drift** — progress.md Day-0 表格（`D1..Dn`）
- [x] **Go/no-go** — 範圍變動 % → 繼續 / 修訂 / 中止
  - ⛔ **D-txn 若答「不能同交易」** → §3.2 的選項 A/C 要改形狀（W10 的 DB trigger 退路），
    那是 20-50% 範圍變動 ⇒ **修訂 plan 並跟使用者再確認**，不要默默改

### 0.2 Branch

- [x] `git checkout -b feature/W12-audit-trail`（從 `main` `1c5a6ac`）

---

## Day 1 — Table · chain · verify (US-1, US-2)

### 1.1 Model + migration

- [x] **`schema.prisma`：`model AuditLog`** + **`migrations/<ts>_audit_log/migration.sql`**
  - DoD: `entity_id NOT NULL`；`actor_id` **假名且 docstring 註明永不存個資**（`02a:311`）；
    ⛔ **GRANT 只有 SELECT + INSERT**，且**不建 `FOR UPDATE` / `FOR DELETE` policy**；
    per-command policy 只有 read + insert 兩條
  - Verify: `npx prisma validate` + int suite（它 DROP+CREATE 後 `migrate deploy`）
  - ⚠️ **用 Write/Edit 工具寫 migration，不用 heredoc**（W09/W10/CH-027 三次同形違反）
  - ✅ **實測**：`prisma validate` 0 · scratch DB `migrate deploy` 0 · int suite **172 / 13, exit 0**
    （不變）· 22 models（header 的計數已同步更正，並補回 W11 漏掉的 MHist 行）
  - ⚠️ 欄名是 `org_entity_id` 不是 rule 檔草稿的 `entity_id`（`schema.prisma:61-64`，W02 D-fieldname 已裁決）
  - ⚠️ 追加兩項非讀得出來的要求 → progress **D12**：`GRANT USAGE ON SEQUENCE`（本 repo 第一次需要）
    · 兩個 hash 欄需要 DB 預設值，否則 Prisma 型別會把鏈推進每個模組的呼叫點

### 1.2 兩個 chain 策略（⚠️ Day-0 D3 後由三個縮為兩個，使用者核可）

- [x] **A = migration 內的 `AFTER INSERT` trigger（PL/pgSQL）· B = `chain.ts` 應用層錨定**
  - DoD: 兩者各有「竄改一列 → verify 指出**第一個**斷點」的測試；共用同一個 hash 定義
  - Verify: `npm run test -w apps/api -- chain`
  - ✅ **25 / 25 passed**。⭐ 「共用同一個 hash 定義」**不是宣稱而是量到的**：
    期望值是從 postgres `audit_log_canonical()` 直接取出的 hex 向量（payload 756 字元 + 3 個 hash），
    TS 逐位元組相符。⚠️ 向量用**機械方式**切行 —— 第一版手抄掉了 2 個 byte
  - ⚠️ **A 的 DB 端竄改測試在 Day 2 的 int spec**（本檔是純函式層）；今天量到的是 A 的鏈在
    真 DB 上成立（progress §A 的實測表），兩者不可互相代替
  - ⛔ **起手先確認 `pgcrypto` 可用** —— A 是本 repo 第一段做 hash 的 PL/pgSQL，
    寫完才發現沒有 digest 函式的代價是重寫
    - ✅ **已做，答案推翻了問題**：PG18 核心就有 `pg_catalog.sha256`（對照 NIST 向量驗過），
      **不裝 pgcrypto** → progress **D8**
  - ⭐ **C 不實作** —— 由 A、B 的數字推導；ADR 中必須寫明那是**推導不是量測**
  - ⛔ **上面寫的 `AFTER INSERT` 是錯的，原文保留不刪**：AFTER 不能改 `NEW`，存 hash 就要
    `UPDATE`，而這張表刻意沒有 UPDATE 權限 ⇒ **實際落在 `BEFORE INSERT`** → progress **D11**
  - ✅ **A 已實作並實測**（scratch DB）：per-entity 鏈成立（HK1 不接 SG1）· 獨立重算 hash 相符 ·
    UPDATE / DELETE 皆 42501。⛔ **42501 是 GRANT 擋的，不得據此宣稱缺席的 policy 也成立** —— 那是 N3

### 1.3 verify-integrity routine

- [x] **`audit-trail/verify.ts` + spec**
  - DoD: 回報**第一個**斷點的位置，不是布林值；空鏈與單列鏈各有測試
  - Verify: `npm run test -w apps/api -- verify`
  - ✅ **17 / 17 passed**。回報 `{index, id, kind, detail}`，`kind` 四種可分辨：
    `content`（改了沒重算）· `link`（改了且重算，後繼揭發）· `unchained`（根本沒被 hash 覆蓋）·
    `foreign`（拼了兩個實體的列 —— 不報成竄改，否則會派人去找不存在的攻擊）
  - ✅ 空鏈 intact / 單列鏈 / 50 列鏈 / 多處損壞取**最早** / 刪列 / 換位 各有測試
  - ⭐ **B 的限制被寫成測試而不是形容詞**：同一個竄改，A 指出**那一列**，B 只能指出**那一段**

### 1.x partial gate

- [x] format ×2 · lint · type-check · api unit —— **逐項取 exit code，只報跑過的**
  - ✅ format 0 · lint 0 · type-check 0 · api unit **418 / 37**（baseline 376 / 35；
    +42 = chain 25 + verify 17，逐項對得上）
  - ⚠️ 未跑：build · `lint:negative` · api int · web · coverage · `run_all` · `check_entity_index`
    —— **這是 partial gate，不得寫成「gate 全綠」**（`AD-PartialGateReportedAsFull-1` 已 3 次）

---

## Day 2 — Interception · scope tests · measurement (US-3, US-4)

### 2.1 攔截點 + 接上 1 個模組

- [x] **`contracts/audit-hook.ts`（介面）+ `scoped-prisma.provider.ts`（依賴它）+
      `audit.module.ts` + `app.module.ts`（接線）**
  - DoD: 接上 **1 個模組**（`soa`）；該模組的寫入**繞不過**；
    ⛔ **`npm run lint` 必須綠** —— 那是邊界矩陣的機械證明（Day-0 D1）
  - Verify: `npm run test:int -w apps/api -- audit` + `npm run lint`
  - ⛔ **不改 `eslint.config.mjs` 的 MATRIX** —— 它守著 CH-012 的常駐負面案例
  - ✅ **lint 0，MATRIX 未動**。⭐ 更強的證據：`lint:negative` **PASS** 且明文印出
    「rejected `audit-trail -> core-model`, as it must」⇒ 偵測器**仍在偵測**，
    依賴反轉是滿足矩陣而非繞過它
  - ✅ **稽核列與領域寫入同交易**（`$transaction` 陣列第 3 個元素）——
    int 測試「領域寫入失敗時不留稽核列」證明了原子性
  - ⚠️ **hook 是 `@Optional` 注入 = fail-open**，原因寫在 `ScopedPrismaFactory` 建構子：
    要求注入會弄壞 11 個與稽核無關的 int suite。**補償**：`audit.int.spec.ts` 由
    **`AppModule`** 組圖（不是 `SoaModule`）⇒ 拿掉 `app.module.ts` 那一行（N2）會**轉紅**
  - ⚠️ raw query（`model === undefined`）**不被稽核** —— 已命名的洞，不是疏漏

### 2.2 範疇測試 + 竄改偵測

- [x] **`audit.int.spec.ts`：4 個範疇測試 + 竄改偵測**
  - DoD: 跨實體讀拒 / 跨實體寫拒且資料未變 / RLS 層獨立成立 /
    **append-only 由誰擋要指名**（GRANT vs policy —— W10 在這裡量到過反直覺結果）
  - Verify: `npm run test:int -w apps/api -- audit`
  - ✅ **11 / 11 passed**。四項逐一：跨實體讀只看到自己的列 · 跨實體寫被拒**且逐列確認資料未變** ·
    raw `pg` 連線（無 Nest 無 Prisma）獨立成立 · append-only **量到 42501 = GRANT**
  - ⛔ **42501 是 `permission denied for table`，即 GRANT，而且是先擋的那一層。**
    測試註解明寫**不得**據此宣稱「缺席的 policy 也成立」—— GRANT 擋在前面時那層觀察不到。N3 才是量它的地方
  - ✅ 竄改偵測用 **owner 連線**（app role 根本改不動 —— 那本身就是第一個結果）：
    改 `operation` → 指名該列 `kind=content`；改 `after` payload → 同樣指名；**還原後回到 intact**

### 2.3 量測

- [x] **`bench.int.spec.ts`：A vs B × 寫入 / 驗證成本 + 對照組**
  - DoD: p50 / p95 寫入延遲（真實 endpoint 路徑，**非孤立 INSERT**）；
    驗證耗時（鏈長 1k / 10k）；**對照組 = 未接稽核的同一路徑**（D-throughput 的基準）
  - ⛔ **這是跨層比較**（PL/pgSQL vs TypeScript）—— 結果表要標明，不得假裝兩個數字同質
  - Verify: 結果表寫進 progress.md
  - ⚠️ **預期方向先寫下來再跑**（同 W10 / W11 的中性化紀律）
  - ✅ **預測先 commit（`5956711`）再跑**。判定 **2 ✅ · 2 ⛔ · 1 ⚠️** —— 見 progress §五個預測
  - ⭐ **對照組是同一個 repository、同一張表、同一組 policy**，只差 hook 不在 DI 圖裡
    （`SoaModule` 單獨組圖）—— 不是另一條「看起來像」的路徑
  - 🚩 **第一版量出「稽核讓寫入變快」** ⇒ 順序偏差大於效應。改成**交錯**並加兩個儀器檢查：
    (1) 斷言對照組寫入後 `audit_log` 列數**不變**、稽核組**+1**；(2) 印出兩個 phase 的 **control drift**
  - ⭐ **追加了 plan 沒要求的併發量測**，因為 A 的核心成本是 per-entity 鎖，
    而**單執行緒 benchmark 結構上量不到它**。8 寫入者同一實體：**A/B = 1.63 / 1.59（兩次可重現）**
  - ⛔ 序列組**分不出 A 與 B**（兩次順序翻轉、差距 ≈ control drift）—— 已如實記錄，未當成結論用

### 2.x Full gate

- [x] format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit · api int ·
      web · coverage（**branch / funcs 不低於 baseline**）· `run_all` 8/8 ·
      `check_entity_index` **21 / 35**
  - ⛔ **十一項全跑才能說「gate 全綠」**
  - ✅ **十一項逐項取 exit code**：format 0 · lint 0 · type 0 · build 0 · `lint:negative` **PASS** ·
    api unit **451 / 38** · api int **187 / 15** · web **10 / 1** ·
    coverage **92.27 / 91.66 / 98.95 / 93.64** · `run_all` **8 / 8** · `check_entity_index` **21 / 35**
  - ⭐ **coverage 四項全部高於 baseline**（91.83 / 91.01 / 97.5 / 93.29），funcs **+1.45** ——
    這是連續多個 phase 以來第一次四項全升
  - 🚩 **但它一開始是紅的，而那個紅揭出一個真正的洞**：`audit.recorder.ts` funcs 88.88%，
    未覆蓋的是 **`app-chain` 分支** ⇒ **策略 B 的寫入路徑從未被任何測試斷言過正確性**。
    bench 量的是時間，時間不在乎寫入者是壞的。⇒ 補了 unit（含 round-trip 重算）+ int
    （寫入 → 讀回 → 用**儲存後**的列重算 hash，穿過 jsonb 正規化與時戳捨入）
  - 🚩 第二個紅：`scoped-prisma.provider.ts` funcs 62.5% —— 舊 double 把 `$extends` 整個 stub 掉，
    所以「Prisma 給的 model / operation 有沒有真的傳到 recorder」**從來沒被問過**。
    加了會真正呼叫 handler 的 capturing double

---

## Day 3 — 整合驗證（純後端 ⇒ 無 drive-through）(US-5)

_(本 phase 無 user-facing surface。報告一律寫 **gate-only verified**，絕不暗示可用性。)_

### 3.1 中性化預測（⛔ 寫下並 **commit** 之後才執行）

- [x] **四個中性化的預期方向寫進 progress.md 並 commit**
  - DoD: N1 `prev_hash` 串接 · N2 攔截點 · N3 append-only（補 UPDATE GRANT）· N4 SELECT policy
    —— 每個寫明**預期哪些測試轉紅、哪些不動**
  - ⚠️ **中性化 = 放行，不是刪除**（W11 在 N4 用了刪除，量到的是 no-op 而非 guard）
  - ✅ commit **`aec77f2`**，逐條指名測試標題。四個都是**放行**：N1 trigger 仍在只是不連結 ·
    N2 註解掉 module import · N3 **補回** GRANT · N4 policy 仍在但 `USING (true)`

### 3.2 執行 + 逐項對照

- [x] **四個中性化各自執行、還原、記錄**
  - DoD: 每次跑完立即還原並驗證（`git diff` 濾掉註解行後為空）；控制組與最終還原各驗一次
  - ⛔ **零轉紅先查再下結論**；⛔ **方向不符預期時先懷疑元驗證本身**（`AD-MetaVerificationBug-1`）
  - ⛔ **補完測試後必須重跑該中性化**（W10 與 W11 各在這裡漏過一次）
  - ✅ **4/4 方向正確**。控制組 187/15、每次還原後 `git status --short` = **0 dirty**、
    最終還原再驗 **187 / 15 全綠**
  - ⭐ **N3 的答案**：`Received: "NO ERROR"`。⛔ **但「沒報錯」≠「沒改到列」** ——
    直接量：可見 7 列、**`UPDATE 0`**、0 列被改、值未變 ⇒
    **GRANT 給 42501 明確錯誤，缺席的 policy 給安靜的 0 列。兩層都擋，只有一層會說話**
  - 🚩 **N2 揭出四個範疇測試裡的第 1 個在稽核全關時仍全綠**（空陣列上 `every` 真 / `some` 假）
    ⇒ 補**非空前提** ⇒ **重跑 N2：7 紅 → 10 紅**。剩下 2 個通過的是**應該**通過的
    （走 client 直寫 / 走 raw 連線，本來就與攔截點無關）
  - ⚠️ **N4 機制對但我掛錯測試** —— 測試檔的**執行順序**決定第二個實體的列何時存在。
    機制已量測（SG1 scope 看到兩個實體），但 `foreign` 這個斷點種類是**推導不是量測**，照實標

### 3.3 ADR-0003 的可證偽條件（⛔ 這是 ADR 能否採納的門檻）

- [x] **從量測導出可證偽條件，寫進 ADR**
  - DoD: 條件是**可觀測、可重跑**的（例：「若寫入 p95 超過 X ms，本決定作廢」），
    不是「若需求改變」這種永遠不會被觸發的句子
  - Verify: `14-adr/README.md` 的 forcing-function 判準逐條對照
  - ✅ **ADR-0003 已採納**，五條可證偽條件全部可觀測可重跑：
    **FC1** A/B 併發 overhead 比 > 2×（今天 1.63 / 1.59，`bench.int.spec.ts` 是儀器）·
    **FC2** 單一實體鏈驗證 > 60 s（今天 10k ≈ 1.0 s，線性 ⇒ ~600k 列）·
    **FC3** 需要真實 `before` 舊值（應用層攔截給不出來 ⇒ 改每表 trigger）·
    **FC4** ⭐ 多實體 scope 且 payload 無 `orgEntityId`（**由構造保證會觸發** ——
    `UnattributableWriteError`，M8 第一個滾升寫入就會炸）·
    **FC5** `chain.spec.ts` 的 postgres 向量失配（共用 hash 定義破了）
  - ⚠️ **FC1 / FC2 需要 B 留在 repo** ⇒ ADR 明寫那是**當下的用途**不是「將來可能有用」，
    並附解封條件：**Wave 1 結束前未重量就刪掉 B 並把條件改寫成絕對值**（AP-1 的處置）
  - ✅ `decision-form.md` OQ-4 → 已拍板區 · `14-adr/README.md` 索引 + 尚待撰寫 4 → **3**

### 3.x Full gate（⛔ 逐項複製 Day 2 §2.x 的清單 —— 中性化本身會改 code）

- [x] format ×2 · lint 0 · type 0 · build clean ×2 · `lint:negative` · api unit · api int ·
      web · coverage · `run_all` 8/8 · `check_entity_index` 21/35
  - ⛔ **`AD-PartialGateReportedAsFull-1` 已 3 次，全部是 `format:check`，全部因為
    Day 3 改了 code 而 gate 停在 Day 2**
  - ✅ **十一項重跑，逐項 exit code**：format **0** · lint **0** · type **0** · build **0** ·
    `lint:negative` **PASS** · api unit **451 / 38** · api int **187 / 15** · web **10 / 1** ·
    coverage **92.27 / 91.66 / 98.95 / 93.64** · `run_all` **8 / 8** · `check_entity_index` **21 / 35**
  - ⭐ 數字與 Day 2 **完全相同** —— 那本身就是四次中性化**全部還原乾淨**的證據

---

## Day 4 — closeout

### 4.1 Change record + design note

- [x] **`docs/03-implementation/changes/CH-029-w12-audit-trail.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含量測表 + **gate-only verified** 聲明）
  - ✅ 五個「改之前先重讀」的決定 + 量測表 + 四個中性化表；**Verdict ⚪ N/A（純後端）**
- [x] **`docs/02-architecture/design-notes/W12-audit-trail.md`** —— ⛔ **spike 強制**，
      對照 `docs/rules-on-demand/spike-design-note-gate.md` 的 **8-point gate** 逐項自查
      （必須有實作 + `file:line` + 可重現驗證；**extract 不是 pre-write**）
  - ✅ 8-point 自查表在 retro；**verified ratio 31/33 ≈ 94% 🟡**
  - ⛔ **低於 95% 而我不用「刪掉那兩條」湊門檻** —— 兩條是真實知識（N4 下的斷點種類 ·
    Azure extension 機制），刪了會讓 note 更乾淨而讓讀者更少知道一件事 ⇒ **標為推導並保留**
  - ✅ 8-point #8：3 個新契約已登記到 `02-architecture/cross-scope-interfaces.md`（#1-#3）——
    ⭐ 那張表在此之前**還是模板的 `<Name>` 佔位列**，本 phase 是它第一次有內容
- [x] **`docs/14-adr/0003-audit-trail-hash-chain.md`** 採納 + `decision-form.md` OQ-4 → 已拍板
  - ✅ Day 3 完成；⛔ Day 4 **更正了它兩處的覆蓋率分母**（1/19 → **1/21**，見 4.2 的 R4 段）

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`spike` 0.65，**第 6 個資料點**；
      ⚠️ 自報量法 = **含 Day 0，窗口為 branch 首個 commit → closeout commit**）
  - ⛔ **actual 等 closeout commit 真的存在之後再算** —— 不得用預估收尾時間
    （`AD-EstimateAsMeasurement-1` 已被記 2 次，第 2 次就是算錯了 band 判定）
  - ✅ Q1-Q7 + 8-point 自查 + closeout self-check 全部寫完；**Q2 的 actual / ratio / band
    三格刻意留白**並寫明理由 ⇒ 這是該 AD 提議的修法**第一次被執行**
- [x] `calibration-matrix.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400）
  - ✅ 隨 actual 一起於**第二個 closeout commit** 回填（matrix + `CALIBRATION-LOG.md` + retro Q2
    + design note §0 四處一次寫齊）
- [x] Final gate sweep（十一項全跑，逐項寫實際數字）
  - ✅ format ×2 **0 / 0** · lint **0** · type **0** · build **0** · `lint:negative` **PASS** ·
    api unit **451 / 38** · api int **187 / 15** · web **10 / 1** ·
    coverage **92.27 / 91.66 / 98.95 / 93.64** · `run_all` **8 / 8** · `check_entity_index` **21 / 35**
  - 🚩 **`run_all` 第一次是 7/8** —— `check_status_markers` [FAIL E2]：frontmatter 已翻 `closed`
    而**內文的 Status 那一行仍是 `Approved-to-execute`**。⭐ 那正是 R9 的機械形式，**我兩處只改了一處**
  - ⚠️ **本機全綠，CI 未驗**（分支未 push）
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated + **Tech Stack 那格的 ADR 清單**（0003 已採納）·
      `MEMORY.md` pointer + subfile · `BACKLOG.md`（新增 AD + §Shipped 加 1 行）·
      `ROADMAP.md` · `RISK_REGISTER.md`
  - ⛔ **R4 的措辭**：本 phase 交付的是**機制**，18 張表裡只接了 1 張 ——
    **不得寫成「已解決」**，要寫「首次有 mitigation，覆蓋 1 / 19」
  - ⛔⭐ **上面那行的「18」與「1 / 19」是錯的，原文保留不刪** —— 為了寫 R4 而**機械導出**分母時
    當場推翻：`schema.prisma` 22 個 `^model` 減 `audit_log` 自己 = **21**，逐個 migration 的
    `CREATE TABLE` 加總交叉驗證相符（2·**1**·2·**5**·1·2·2·3·2·1）。R4 的手寫鏈**跳過 W03 的
    `extension_fields`**、且 **W05 記 +3 而實際建了 5 張**。⚠️ 而錯的 19 **已經寫進 CH-029 /
    design note / ADR-0003 三份文件**才被抓到，五處全部更正 → `AD-RiskTableCountManual-1`
    首次實地擊中，P2 → **P1**
  - ✅ R4 **「開放」→ 🟡 部分緩解**，措辭「**首次有 mitigation，覆蓋 1 / 21**」+ ⛔ 不得讀成已解決
  - ⛔ **BACKLOG 計數在最後一次編輯之後跑** `python scripts/lint/check_backlog_counts.py`
  - ✅ **detector 說 OK**：100 條 / P0 **8** / P1 **56** / P2 **36**（宣告值與 §Open 逐列解析相符）
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
      ⚠️ 含 **AP-1**：A 與 B 之中被 ADR 否決的那一個，留在 repo 裡是不是 side-track？
      判準是 **ADR 有沒有引用它的量測數字**；若沒有，它應該被刪而不是留著
  - ✅ **3 項**：AP-1 **1（已處置**：ADR 確實引用 B 的數字當 FC1/FC2 基準線，且附 Wave 1 期限
    → `AD-StrategyBSunset-1`）· AP-3 **1 找到 1 修好 0 出貨**（策略 B 的正確性從未被斷言）·
    AP-7 **1 刻意保留**（`AFTER INSERT` 原文不刪，更正寫在相鄰處）。其餘 4 項為 0 / N/A
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh pr view` 驗證後翻 `status:` 標籤
  - ⚠️ **rebase merge 會改寫 SHA** —— 引用「預測寫在前面」的 commit 要改指 main 側並補
    **author date**（W11 量到它逐秒不變，第 3 個資料點）
