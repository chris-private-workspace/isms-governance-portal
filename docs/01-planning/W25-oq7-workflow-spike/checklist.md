# Phase W25 — Checklist (OQ-7 spike: where a lean state machine stops being lean)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `664fcdc`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 12 個目標逐一確認 —— NEW 檔不存在
      （`workflow/` 只有 `.gitkeep`；`docs/14-adr/0002-*.md` 不存在；
      `design-notes/W25-*.md` 不存在）· EDIT 檔存在 · UNTOUCHED 三項確認不需動
  - DoD: 12 個逐一標記「如預期 / 不如預期」，不如預期的進 progress.md
  - Verify: `ls apps/api/src/workflow/ docs/14-adr/ docs/02-architecture/design-notes/`
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-audit-on-transition** ⭐ —— `AUDITED_MODELS` 含 `'Policy'` 是**列級**還是**欄位級**涵蓋？
        改一次 `Policy.status` 是否真的落一筆稽核、且記得下 from / to？
    - DoD: **實測一次**（起 DB + 改一列 + 查稽核表），不採信「enum 在 AUDITED_MODELS 裡」的推論
    - Verify: `npm run test -w apps/api -- audit` + 直接查 `audit_log`
    - ⛔ **實測結果（D6）：這個問題今天無法用「改一列」回答 —— 因為整棵產品樹沒有任何 domain `update`。**
      量法：`Grep '\.(update|updateMany|upsert|delete|deleteMany)\('` 於 `apps/api/src` 排除 `*.spec.ts`
      ⇒ 4 個命中全非 domain 寫入。既有 15 個模型的稽核覆蓋測試**每一條都是 `create`**
      （`audit-coverage.int.spec.ts:26-32` 自述）。⇒ **「update 有被稽核」是 allowlist 的宣稱，從未被走過。**
      ⇒ 真正的實測移到 **1.3**（本片建出第一條 update 後），那是它唯一能被執行的地方
  - [x] **D-status-writers** ⭐ —— 枚舉今天所有會寫 `Policy.status` 的路徑
    - DoD: 逐條列名（seed / repository / controller / migration）；守衛的擺放點由此決定
    - Verify: `Grep pattern: "status" path: apps/api/src glob: **/*policy*`
    - **結果（D1）**：API 層 **0** 條（`policy.controller.ts:104-118` 只有 `POST`，無 `@Put`/`@Patch`）；
      唯一寫入者是 `prisma/seed.ts:434`。⇒ 沒有「共同下游」可接 —— 見 1.1 第三格的修訂
  - [x] **D-web-status-source** —— `/policies` 的狀態值來自 API 還是 fixture？
    - DoD: 決定 drive-through 有沒有真實觀察面；若是 fixture 則 AC-6 的形狀要改
    - Verify: `Read apps/web/src/lib/api/policies.ts` + `(app)/policies/page.tsx`
    - **結果（D3）**：來自 API（`lib/api/policies.ts:43-44`）⇒ AC-6 有真實觀察面，形狀不變
  - [x] **D-transition-spec** —— `02a:360-371` 的 stateDiagram 與 `PolicyStatus` enum **逐值比對**
    - DoD: 6 個 enum 值與圖上節點一一對應；圖上的邊逐條抄成轉換表的預期內容
    - Verify: 逐字讀兩處，不用 grep 命中數
    - **結果（D4，含一次自我更正）**：6 值一一對應（`schema.prisma:374-379`）；
      實邊 **7** 條不是 8 —— `[*] --> Draft` 與 `Retired --> [*]` 是 pseudostate。
      ⚠️ 權威來源的真實路徑是 `02a-data-model-spec.md:362-370`（plan 寫的 `02a:360-371` 含 fence 行）
- [x] **Prong 2.5 — child component tree** — **N/A**（本片零前端變更）
- [x] **Prong 3 — schema verify**：`PolicyStatus` 6 個值 · `Policy.status` 欄位型別與預設
      · **確認本片不需要 migration**
  - DoD: 若發現需要 migration ⇒ 範圍變動 > 20%，回 §Go/no-go
  - Verify: `grep -n -A12 "enum PolicyStatus" apps/api/prisma/schema.prisma`
  - **結果**：6 值確認 · `@default(draft)`（`schema.prisma:336`）· **不需 migration**
- [x] **D-baselines** — api test 484 / 40 suites · api int 269 / 21 · web 104 / 11 ·
      lint 0 · type 0 · build clean · `run_all` 11/11 · lint 測試 122
  - Verify: 各自跑一次，**寫檔再讀**（不用 `| tail`，`AD-GrepAssertion-1`）
  - **全部實測相符**，三個測試數與 W24 收尾值相同 ⇒ baseline 乾淨（progress.md 有表）
- [x] **Catalog drift** — progress.md Day-0 表格
- [x] **Go/no-go** — 範圍變動 ≤20% 繼續 / 20-50% 修訂 §Acceptance + §Workload 並再確認 / >50% 中止
  - **判為 20-50%** ⇒ 修訂 AC-2 / §4 item 6 / §7；**使用者 2026-08-21 核可 (A)**，plan 三處已改

### 0.2 Branch

- [x] `git checkout -b feature/W25-oq7-workflow-spike`（從 `main` `664fcdc`）

---

## Day 1 — 候選 A：自建 data-driven 轉換表 (US-1, US-2)

### 1.1 轉換表與守衛

- [x] **`apps/api/src/workflow/transitions.ts`** —— 轉換表逐字對應 `02a:360-371`
  - DoD: 含 `in_review → draft`（changes requested）回邊；**資料不是 code**
  - Verify: `npm run type-check -w apps/api`
  - **實測 type-check EXIT 0**。表為窮舉 `Record<PolicyStatus, readonly PolicyStatus[]>`
    ⇒ schema 加第七個狀態時**編譯失敗**。回邊 `in_review → draft` 在表內（`02a:365`）
- [x] **`apps/api/src/workflow/transition.guard.ts`** —— 純 predicate，無 I/O
  - DoD: `(from, to, actor, record) → allow | reject`；拒絕訊息**指名 from / to / 理由**
  - Verify: `npm run test -w apps/api -- transition.guard`
  - **實測 17 passed / EXIT 0**。⚠️ **簽名偏離 DoD**：實作是 `(from, to)`，**沒有 `actor` 與 `record`**
    —— `actor` 今天不存在（**D7**：`audit.recorder.ts:146` 寫死 `actorId: null`，M4 未建），
    而 `record` 會把 I/O 拖進「純 predicate」。授權與稽核由轉換端點組合，不折進這個 predicate
- [x] **守衛接在 `D-status-writers` 找出的共同下游**
  - DoD: ⛔ **每一條寫入路徑都經過它** —— 只擋一條的守衛是可繞過的守衛
  - Verify: 逐條路徑寫一個測試
  - 🚧→✅ **前提不成立，本格已改寫**（Day-0 **D1**）：API 層**沒有**既有寫入路徑，所以沒有「共同下游」。
    改為：**本片建出的轉換端點是唯一的 API 寫入路徑**，DoD 改為「端點外無第二條 API 路徑可改 status」。
  - **實測（grep，排除 `*.spec.ts`）**：`client.policy.update` 全樹**只有 1 處**
    （`core-model/policy.repository.ts:152`）· `transitionStatus` **只有 1 個呼叫者**
    （`modules/policy/policy.controller.ts:171`）⇒ **API 層無旁路**。
    型別層再加一道：`ScopedPolicyClient` 是唯一暴露 `policy.update` 的介面，widening 它是可見的編輯。
  - ⚠️ `prisma/seed.ts:434` 仍繞過一切（不走 repository）—— **已知缺口，非本片修**，Day 4 進 BACKLOG

### 1.2 ⭐ 負面測試（驗收不是附加 —— 預測寫在執行之前）

- [x] **非法轉換被拒**：`draft → approved` · `published → draft` · `retired → published`
  - DoD: 三條各一個測試；**中性化守衛後恰好那三條轉紅**，其餘一條未動
  - DoD: 預測（哪幾條紅、其餘幾條不動）**寫在執行之前**，實際值並列記入 progress.md
  - Verify: 中性化 → 跑測試 → 還原 → 跑測試
  - **三條各一個測試，另加「拒絕 no-op 自環」與「錯誤要列出合法替代」**。
    **三次中性化（N1 守衛 no-op / N2 刪一條邊 / N3 加偽邊）預測全部逐格命中**，表在 progress.md。
    ⭐ N2 揭露：導出的 `it.each` 對「漏抄一條邊」**零偵測力**（案例消失而非轉紅，總數 17→16）
- [x] **繞過路徑也被擋**（對應 R3）
  - DoD: 若 `D-status-writers` 找到 >1 條路徑，每條都有一個「繞過嘗試」測試
  - Verify: `npm run test -w apps/api -- workflow`
  - 🚧→✅ **DoD 的觸發條件未成立**：`D-status-writers` 在 API 層找到 **0** 條（不是 >1 條）。
    改為斷言「唯一入口」+ **三條真正的繞過嘗試各一個測試**（都在 `workflow.int.spec.ts`）：
    ① 跨實體 scope 直接呼叫 repository ⇒ null 且**資料未變 + 零稽核列**
    ② **raw SQL 連線**（無任何應用層）以 HK1 scope UPDATE SG1 的列 ⇒ `rowCount 0`
    ③ 滾升 scope 呼叫 repository ⇒ **拋出**（見 1.3 的 D9）
  - ⚠️ ②是關鍵：它證明 RLS **獨立於應用層成立** —— 把 repository 整個刪掉這條仍然守得住

### 1.3 稽核與實體範疇（US-2；約束 8 四個範疇測試）

- [x] **合法轉換落一筆稽核，逐欄斷言 from / to / actor**
  - DoD: 若 `D-audit-on-transition` 顯示未涵蓋 ⇒ **記為發現**，本格改為「缺口已記錄」
  - Verify: `npm run test:int -w apps/api -- workflow`
  - **實測：涵蓋成立**（這是全 repo 第一次真的走過 update 的稽核路徑，見 D6）。
    逐欄斷言 `operation: 'Policy.update'` · `resourceType` · `resourceId` · `orgEntityId` ·
    `accessAllowed` · **`actorId: null`（明確斷言不是略過）** · `actorScope` · `after.status`
  - **AC-2 的 `from`**：另一條測試做 **3 段轉換**並從鏈回推出
    `[draft→in_review, in_review→approved, approved→published]`，逐對比對
  - ⛔ **三條結構性限制釘成測試**（紅了代表限制被解除，不是測試壞了）：
    `before` 恆 SQL NULL（D2）· create 列與轉換列**不同 resourceId**（D8）· 滾升不能轉換（D9）
- [x] **四個範疇測試**：跨實體讀拒絕 / 跨實體轉換拒絕**且資料未變** / RLS 層獨立成立 /
      滾升角色只看到授權子樹
  - Verify: `npm run test:int -w apps/api -- workflow`
  - **四條全過**。第四條的實測結果**與 plan 預期不同**：滾升角色**讀得到但不能轉換** ——
    `resolveEntity`（`audit.recorder.ts:229-244`）在 payload 無 `orgEntityId` 且 scope 多實體時
    **拒絕寫入**（「the audit row would guess」）。轉換 payload 只有 `{status}` ⇒ 必然觸發。
    ⭐ **這條分支在今天之前不可能被觸發** —— 每個 create 的 payload 都帶 `orgEntityId`。
    fail-closed 是對的（憲章說滾升是跨實體**讀取**），但**沒有人刻意選過它**，所以釘成測試

### 1.4 ⭐ `PROGRESS-METRICS.md` 的 M5 錨點會在今天破（對應 R7）

- [x] **第一個 `.ts` 落地後，重新判定 M5 並同時更新兩格**
  - DoD: ⛔ **不是只改錨點的數字** —— 錨點破代表判定的前提變了，先重判 🔴/🟡/🟢 再改
  - DoD: 這是 CH-046 設計要的行為，記入 progress.md 當作它第一次真實生效
  - Verify: `python scripts/lint/check_progress_metrics.py`
  - **CH-046 第一次真實生效，且抓到的比預期多**：detector 一次報 **4 條**不符 ——
    M5 錨點破（`workflow` 2 ≠ 0）+ `scopes-with-code` 6→7 + `loc-api-prod` 7765→7954 +
    `loc-api-test` 14663→14787。訊息原文要求「re-judge M5 and update both cells」。
  - **重判結果**：M5 🔴 未開始 → **🟡 部分**（轉換表 + 守衛在，端點未建、OQ-7 未拍板），
    錨點改 `scope_ts_count('workflow') == 2`。另修 §3 判讀兩處已失真的散文
    （「流程層一行未寫」不再成立），並加註「🟡 不要讀成快好了」+ M4 卡住 M5 驗收的實據。
  - **`run_all` 由 FAIL 回到 11/11。**

### 1.x Partial gate

- [x] lint 0 · type 0 · api test 通過 · `run_all` 11/11
  - **Day 1 收尾實測**：lint（api+web）**0** · type-check（api+web）**0** · format:check **0** ·
    api unit **507 / 41 suites**（baseline 484/40 → **+23 / +1**）·
    api int **280 / 22 suites**（baseline 269/21 → **+11 / +1**）· `run_all` **11/11**
  - ⚠️ format:check 第一次跑是**紅的**（`transition.guard.spec.ts` 未依 prettier），已 `--write` 修正。
    記下來是因為它證明 partial gate 不能只跑 lint/type/test —— 少跑一項就會漏
  - ⛔ **完整 int 套件第一次跑是紅的（3 條，全在別人的套件）** —— 我的 `createPolicy()` 留下 10 筆
    存活 SG1 policy，而 `policy.int.spec.ts:91,141` 與 `entity-scope.int.spec.ts:151` 斷言的是
    **整份清單**。這正是 `jest.int.config.js:51-55` 逐字記載的 W03 陷阱
    （「serial execution decides the order; it does not undo the write」）。
    已加 `teardown` + `afterAll` 逐筆 retire ⇒ 22/22 全綠。
    ⭐ 教訓不是「要清理」，是**「單獨跑綠」不是套件綠的證據**

---

## Day 2 — 候選 B：嵌入 statechart 函式庫 + 五維度量測 (US-3, US-4)

### 2.1 候選 B 實作同一條流程

- [x] **用函式庫定義同一條 Policy 生命週期**
  - DoD: 跑得起同一組 Day-1 的測試（非法轉換仍被拒）
  - Verify: `npm run test -w apps/api -- workflow`
  - **選 XState 5.32.5**（四個候選的 `npm view` 實測資料在 progress.md §2.1）。
    選它的理由是**可證偽性**：§3.3 說我們不需要階層 / parallel / 動態子流程，而 XState 全都有
    ⇒ 拿 robot3（1KB FSM）比等於候選 A 換語法，測不到邊界
  - ⭐ **DoD 用比它更強的方式達成**：不只「跑得起同一組測試」，而是
    ① 新增 36 組有序配對的**窮舉等價測試**（5 tests 全過）
    ② **把 controller 的 import 換到候選 B 跑完整套件** ⇒ unit **512/42** + int **280/22** 全綠，
       只改一行 import ⇒ **接合成本 = 0 額外接線，是量出來的不是講出來的**
- [x] **相依成本記錄**：新增套件數 · SCA 面積 · 授權
  - Verify: `npm ls --depth=0 -w apps/api` + `python scripts/lint/check_sca_allowlist.py`
  - **+1 套件（零遞移相依）· 0 個新 advisory · MIT · SCA gate 綠**
    （`OK (no unaccepted vulnerabilities, 1 accepted and in date)`）
  - ⚠️ `npm install` 報的 3 條 high 全是**既有**的 `prisma → @prisma/config → deepmerge-ts`
    （devDependency），**與 xstate 無關** —— 逐條查過 `npm audit --json` 的 `via` 鏈才敢這樣寫

### 2.2 ⭐ 五維度量測（plan §3.4）

- [x] **五個維度都有數字**：定義行數 · 加一個狀態的成本 · 錯誤訊息品質 · 與稽核鉤子的接合 · 相依成本
  - DoD: ⛔ 量不出訊號的維度**明寫「無訊號」** —— 那本身是結論（OQ-4 前例）
  - DoD: 「加一個狀態的成本」用**實際加一個**來量，不用估的
  - Verify: 量測輸出寫檔 → progress.md 表格
  - **五維度表在 progress.md §2.9。** 判定：維度 2 **A 明顯勝** · 維度 3、5 **A 略勝** ·
    維度 1、4 **打平**
  - ⛔ **維度 4 明寫「無訊號」**，且那本身是結論：Day 1 的 D8 / D9 **不是狀態機造成的**
    （來自 `runScoped` 的交易模型與 `resolveEntity` 的歸因規則）⇒ **換誰來都一樣**
  - ⚠️ **維度 1 的量法本身有問題，已修正並記錄**：plan 指定的 `wc -l` 量到的是註解密度
    （191 vs 105 ⇒「B 少 45%」），實際扣掉 B 向 A 借的 15 行後是 **46 vs ≈47 打平**。
    這是 `AD-ProxyMetricAsAnswer-1` 的形狀，Day 4 進 retro
  - **維度 2 用兩個子實驗量**（E1 加一個 / E2 刪一個），各自**預測寫在執行之前**；
    ⚠️ E1 的**原**預測錯了（我預測「打平各 2 行」，實際兩邊都 type-check 失敗），
    修正後的預測在執行前另記，原預測**保留不刪**

### 2.3 ⭐ 五條邊界判準逐條裁決（US-3 —— 本片的核心交付物）

- [x] **對照兩個實作，逐條標記「確認 / 推翻 / 未驗」**
  - DoD: 五條 = 轉換是資料 / 無 fork-join / 無動態子流程 / 使用者不能執行期自訂 / guard 是純 predicate
  - DoD: ⛔ **任何一條被推翻都是必須寫進 ADR 的發現**，不可靜靜刪掉
  - Verify: 逐條在 progress.md 留下實據（`file:line` 或量測輸出）
  - **逐條裁決表在 progress.md §2.11。結果：3 條要改寫或補充，1 條完全未驗。**
    ① 判準 1「轉換是資料」**確認但不可證偽** —— 量到的「資料」是編譯期字面值不是執行期設定，
       兩者對判準 4 而言天差地別 ⇒ 附上改寫建議
    ② 判準 2「無 parallel」**確認，但已知會被 SLA 重新檢驗** —— `05:16` 把 SLA/升級放在 Wave 1
       射程，而**與主流程並行倒數的 SLA 實質就是平行區域**
    ③ 判準 3 確認，但強度弱（「沒遇到」≠「排除了」），照實標
    ④ ⛔ 判準 4「使用者不能執行期自訂流程」**完全未驗，且是五條裡風險最高的**。
       它不是 code 問題是**產品問題**（13 OpCo 要不要各自的簽核流程）⇒ **進 `decision-form.md`**。
       ⚠️ 若答案是「需要」，**兩個候選都不夠**
    ⑤ 判準 5「guard 是純 predicate」**確認且證據是機械的**（守衛測試在 unit 設定檔裡、
       不在 int 設定檔 ⇒ 跑得起來就證明無 I/O），**但要補一半**：並行控制在資料庫的
       compare-and-set 裡，**不在也不可能在 predicate 裡** —— 不補這句，下一個人會寫出
       看起來對但有 TOCTOU 窗的實作，而它會通過所有測試
  - ⛔ **plan §3.3 與 §3.x 互相矛盾**（§3.3 承諾「對照兩條 Wave 1 流程」，§3.x 把 issue→action
    排除在本片外）⇒ **證據基礎實際是一條流程**。已照 §3.x 執行，且**每一條判準都標明
    issue→action 為「未驗」**，不假裝驗過兩條。Day 4 進 retro（plan 起草缺陷，非執行偏離）

### 2.y 治理陳述檢查 — **N/A**（本片零前端變更，不是「把畫面接上 API」的 phase）

### 2.x Full gate

- [x] lint 0 · type 0 · api test ≥484 · api int ≥269 · web 104（不變）· build clean · `run_all` 11/11
  - **實測**：lint **0** · type **0** · format **0** · api unit **512 / 42** · api int **280 / 22** ·
    web **104 / 11** · build **EXIT 0** · `run_all` **11/11**
  - ⚠️ `run_all` 先紅：`progress-metrics` 3 條不符（M5 錨點 2→3 因候選 B 落地 + 兩把 loc 尺）。
    照 CH-046 的規矩**重判而非只改數字** —— 而重判抓到原判定的敘述已失真
    （寫「端點未建」，但端點 Day 1 就通了）。M5 維持 🟡，敘述改為
    「轉換端點已通；SLA / 簽核 / 升級未做，OQ-7 未拍板」，錨點改 3
  - ⭐ **今天三次轉紅的性質不同，資料夠下結論了**：M5 錨點 3 次**每次都逼出一次判斷** ⇒
    照設計運作，**不要調鬆**；`loc-*` 3 次**沒有一次需要判斷** ⇒ 粒度太細，Day 4 記 AD

---

## Day 3 — Drive-through (US-5) — 真 UI + 真後端 + 真 DB

### 3.1 Clean restart

- [x] **殺掉陳舊 dev server / 孤兒 worker，確認新程序是 3200 / 3210 的唯一擁有者**
  - DoD: 守衛接在 module 層 = startup-only wiring（Risk Class C）；
        驗證「活著的服務程序」不是「port 擁有者 PID」
  - DoD: 擷取證明 wiring 生效的 startup log 行
  - Verify: `docs/rules-on-demand/local-runtime-ops.md` 的程序
  - **Preflight：3200 / 3210 都是空的 ⇒ 零個要殺。** 逐一列出所有 node 進程確認 ——
    在跑的是 Playwright MCP 與另一個 `codex.js -s read-only`，**不是我的，留著**（規則 §4）
  - ⭐ **wiring 實據**：本次啟動的 log 有
    `LOG [RouterExplorer] Mapped {/policies/:id/status, PATCH} route` —— 讀到的，不是假設
  - api pid **42408**（3210）· web pid **10224**（3200）· DB `Up 21 hours (healthy)` ·
    `WARN [DevPrincipal] DEV PRINCIPAL ACTIVE ... (SG1)` 正常發出

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [x] **在 `/policies` 上把一份 policy 從 `draft` 推到 `published`**
  - DoD: 每一步畫面上的狀態**真的跟著變**（不是重整後才變、不是 fixture）
  - **`POL-SG1-000002` 由 Draft → Published，畫面上看得見**（截圖在 `artifacts/`）
  - ⛔ **DoD 有一句沒達成，明寫**：「**不是重整後才變**」**不成立** —— 狀態是**重新整理之後**才變的。
    因為 plan §3.x 排除了建控件，頁面上沒有東西會呼叫 `PATCH`，也就沒有即時更新的路徑。
    ⇒ **這一句在本片的範圍內不可能達成**，不是漏做
  - ✅ **但那句 DoD 真正要防的東西（fixture 假資料）驗到了，而且比它要求的更強**：見 3.4 的計數器實驗
- [x] **嘗試一次非法轉換，確認被拒且畫面誠實**
  - DoD: 錯誤訊息可讀；⛔ 不可靜默失敗（那是 W19 死控件的形狀）
  - **兩次非法轉換各得 HTTP 422**，body 逐字列出 `from` / `to` / `allowed`：
    `in_review → published` ⇒ `allowed: ["approved","draft"]` ·
    `published → draft` ⇒ `allowed: ["under_revision","retired"]`
  - ⛔ **「畫面誠實」這半條無法驗** —— 沒有控件就沒有畫面回饋。射程見 progress.md §3.6
- [x] **逐控件走查**：可點 / 有效果 / 標籤真實 / 結果真的渲染
  - `Status ▼` 可點 · `New policy` **誠實停用**（`disabled` + `not-allowed` + `opacity 0.5` + 解釋用 tooltip）
  - ⚠️ **我先在截圖上把它誤判為死控件**，查 DOM 後推翻自己。**截圖不能用來推論 disabled 狀態**
  - ⛔ **真發現**：`shell.inert`（`i18n/en.json:26`）是共用字串，說「沒有後端能做這件事」，
    但 `POST /policies` 從 W03 就存在 —— 這顆停用的真正原因是**沒有表單**。
    共用文案在部分用途上變成不實陳述（W24 那一族，方向相反）⇒ **Day 4 進 BACKLOG**
- [x] **稽核軌跡在轉換後真的多了一筆**（真 DB 查一次，不看測試）
  - `docker exec ... psql -U isms_dev -d isms_dev` 直查：**恰好 3 筆 `Policy.update`**，
    `after.status` 依序 in_review / approved / published；**兩次 422 一筆都沒留**
  - `before` 與 `actor_id` **皆 NULL**（D2 / D7 在 dev stack 上同樣成立，不只在測試裡）
  - ⭐ **額外驗 guardrail 5**：`row_hash` 32 bytes（0 長度代表 trigger 沒跑）；
    逐列比對 `prev_hash` = 前一列 `row_hash` ⇒ **4 筆全 `chained = t`**。
    **本 repo 第一次在 UPDATE 路徑上驗證防篡改鏈**
- [x] 截圖 + observed-vs-intended → progress.md Day 3
  - `artifacts/day3-policies-after-transition.png` · 對照表在 progress.md §3.3（**九步全中**）
  - ⚠️ 截圖原本落在 repo 根目錄且**未被 gitignore**，已移進 `artifacts/`（`.playwright-mcp/` 本身有被忽略）

---

## Day 4 — closeout

### 4.1 Change record + ADR + design note

- [x] **`docs/03-implementation/changes/CH-047-policy-lifecycle-transition.md`**（Day 4 重查最大號確認 CH-046 ⇒ **CH-047**；單檔形式，PROCESS：phase 產出一律單檔；
      Problem / Root Cause / Solution / Verification / Impact —— 含 drive-through PASS）
- [x] ⭐ **`docs/14-adr/0002-workflow-engine.md`** —— 含**可證偽條件**（AC-5）· **已採納**（使用者 2026-08-21 拍板選候選 A）· 四條可證偽條件，第一條即 OQ-9 · §Options 三欄含 C（BPM，引 D004）· 索引已加 1 行且「尚待撰寫」剩 2 份
  - DoD: §Decision 有兩個候選的量測表；五條邊界判準逐條裁決
  - DoD: ⛔ **可證偽條件**必須寫成「若觀察到 X 則本 ADR 應被重開」
- [x] ⭐ **`docs/02-architecture/design-notes/W25-workflow-state-machine.md`** —— 8-point 自查表在 retro，**verified ratio 16/16 = 100% 且分母寫明**（§4 的 8 項未驗項不計入）
  - DoD: 8-point gate，**verified ratio ≥ 95%**；每個 claim 帶 `file:line`
  - DoD: ⛔ **extract 不是 pre-write** —— Day 4 才寫（`spike-design-note-gate.md` §核心紀律）
  - Verify: retro 的 8-point 自查表
- [x] **`docs/decision-form.md`** —— OQ-7 已移到 §已拍板並帶 ADR 連結；**新開 OQ-9**（判準 4，已指名 stakeholder）。⚠️ 一併修掉表下方因此失真的散文（「上表兩項的誰能決定仍未指定」「剩下的 OQ-7 要等 spike」）—— 那段自己就在警告 `AD-22` 那種矛盾
- [x] ⭐ **`docs/01-planning/DEFERRED_REGISTER.md`** —— D004 的解封條件（「OQ-7 拍板後」）**已成立**，重新評估結果：**維持 defer**，⭐ 且**解封條件改寫** —— 原條件「撐不住 M5 負載」**不可證偽**（沒有人定義過「撐不住」），改為三條可觀察的。`Last Reviewed` 由停更 9 天更新至 2026-08-21
  - DoD: 明確記錄重新評估的**結果**（維持 defer 或解封），不是只更新日期
  - DoD: 順帶更新 `Last Reviewed`（它自 2026-08-12 未動，`AD-33`/`AD-49`/`AD-55` 第 4 次）

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`spike` 0.65，**第 7 個**資料點；
      ratio 出 band 就標記 re-point）
  - DoD: ⭐ 對照 plan §7 登記的預測（actual 落在 2.6–4.8 hr ⇒ ratio 0.22–0.40）——
        **命中與否都要寫**，那是 `AD-BottomUpEstimateInflated-1` 的第 4 個資料點
- [x] `CALIBRATION-MATRIX.md` 那一行 —— 301 字元（落在既有各列 152-316 的常態內，lint 上限 400）；完整敘述已進 `CALIBRATION-LOG.md` §1 的 `spike` 段
- [x] Final gate sweep: **全綠** —— format **0** · lint **0** · type **0** · api unit **507/41** · api int **280/22** · web **104/11** · build **EXIT 0** · `run_all` **11/11** · lint 測試 **122**（6 檔 0 fail）
  - ⛔ **這一格當時為真，但射程不完整** —— 上列全部跑在**我這台機器、我這份 `.env`** 上。
        push 後 CI `gates` 轉紅：int **5 failed**（`workflow.int.spec.ts`，呼叫者身分 CI 是 `HK1` / 本機是 `SG1`）。
        ⇒ 「全綠」永遠要連**在哪裡綠**一起講。詳見 `progress.md` §4 · `AD-VerificationEnvironmentIsAnAxis-1`
  - [x] **修後在兩個環境各驗一次**：`DEV_PRINCIPAL_ENTITIES=HK1`（= CI）⇒ int **280/22**；
        本機預設 ⇒ int **280/22**。format/lint/type **0**，api unit **507/41**，`run_all` **11/11**
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated + **`AD-50` 修正兩處**（見下格）· `MEMORY.md` pointer + `memory/project_w25_oq7_workflow_spike.md` · `BACKLOG.md` §Open **197→206**（新增 9 條，計數由 `check_backlog_counts.py` 導出後照抄）+ §Shipped Pointer Index 一行
- [x] ⭐ **`PROGRESS-METRICS.md`** —— 最終：M5 **🟡 部分**（OQ-7 已拍板 + 端點已通；**UI 無入口**、SLA/簽核/升級未做、issue→action 未做），錨點回到 `scope_ts_count('workflow') == 2`。⭐ **錨點今天共破 4 次（0→2→3→2），其中兩次抓到判定敘述已失真**（「端點未建」在端點通了之後、「OQ-7 未拍板」在拍板之後）—— 那是它在做事，`loc-*` 才是粒度太細的那個
- [x] Anti-pattern 自檢（retro Q5）：**新增違規 0**。⚠️ 但**揭露三個既有的** → BACKLOG：`/policies` 無轉換控件（AP-3）· `shell.inert` 文案理由不實（AP-7）· `audit-coverage` 註解宣稱平行而 config 是序列（AP-7）
- [x] ⭐ **已採納的 ADR 已複查** —— 本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？
      ⚠️ **逐檔看，不憑印象** —— `AD-50`（CLAUDE.md 仍列 0007 為已採納且無 0015）
      正是這一格連兩次沒抓到的東西，W24 那次是我勾的
  - ⛔ **`AD-50` 這次真的查了，而且它是真的**：`0007-identity-provider.md:4` 自己寫著
    「**已被 ADR-0015 取代**」，而 `CLAUDE.md:84` 與 `:413` **兩處**都仍列 0007 為已採納、
    **都沒提 0015**。⇒ 兩處已修（同時把新採納的 0002 補進去）
  - **逐檔複查結果**（表在 retro §ADR / Risk 複查）：**0003 產生三個新輸入但內文未失準**
    （它沒宣稱那些事）· 0004 / 0014 仍準確（本片實測 `FOR ALL` policy 對 UPDATE 同樣生效）·
    0005 仍準確（但揭露它涵蓋**欄位**不涵蓋**流程** —— 那是 OQ-9 的前提，非 ADR 失準）
  - **`RISK_REGISTER.md` 亦已複查** —— 逐條看過，**無一條因本片而變**；複查日期已更新
- [ ] **Commit** → PR push + open → CI → merge
  - [x] 使用者核可 push（2026-08-21）→ 推送 → **PR #98 開啟**
  - [x] CI 第一輪：5 綠 / **1 紅**（`gates` — int 5 failed）⇒ 修 `workflow.int.spec.ts` 的
        ambient scope 前提（**不是產品碼**），雙環境驗證後重推
  - [ ] 🚧 CI 第二輪綠 —— 重推後待驗，**不採信本機結果推論 CI**（這一格存在的理由就是它被推翻過一次）
  - [ ] 🚧 merge —— 經 `gh pr view 98 --json state,mergedAt` 驗證後才翻狀態標籤
- [ ] ⭐ **`PR-pending` 標記已翻** —— merge 後翻標記，並以
      `gh pr view <N> --json state,mergedAt` **驗證**，不採信「已 merge」的宣稱。
      機械守衛：`check_status_markers.py` **E5**
