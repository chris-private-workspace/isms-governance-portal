# Phase W26 — Checklist (政策狀態推進的 UI 入口)

[Plan](./plan.md)

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `0f09f27`）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：plan §4 的 16 個路徑逐個確認（NEW 檔不存在；EDIT 檔存在）
      → **20/20 如預期**；`client.test.ts` **確為 ABSENT**（NEW 正確）
  - DoD: ⚠️ 特別確認 `apps/web/src/lib/api/client.test.ts` **是否已存在** —— plan 標 NEW，若已存在則改 EDIT
  - DoD: `CH-048` 編號未被佔用 → ✅ 最大號為 `CH-047`
  - Verify: `ls docs/03-implementation/changes/ | sort -V | tail -1`
- [x] **Prong 2 — content verify**（drift → progress.md）：**8 條，3 條改變 plan**
  - [x] **D-client-single-verb** — `client.ts` 是否仍只 export `get<T>`
        → ✅ **成立**：全檔 export 恰好三個（`ScopedResponse` · `ApiUnavailableError` · `get<T>`），
        `get` 是唯一的函式 ⇒ **greenfield 0.55 維持，§7 不改**
    - DoD: ⭐ **本片的 greenfield 判定與 calibration class 0.55 全繫於此**；若已有寫入動詞 ⇒ 回到 `pattern-reuse-feature` 並修訂 §7
    - Verify: `grep -n "export .*function" apps/web/src/lib/api/client.ts`
  - [x] **D-edge-list** — 從 `transitions.ts` **導出**七條邊，逐條對上 plan §3.4 的六個動詞
        → ✅ **7 條**（由 `POLICY_TRANSITIONS` 逐鍵展開，非手數）；六動詞覆蓋七邊成立
        → ⭐ **D2**：`allowedTargets()` / `canTransition()` / `isTerminal()` / `POLICY_TRANSITION_EDGES` **都已存在** ⇒ API 工作變少
        → ⛔ **D3**：`:70` 記錄 02a:365 把 `in_review→draft` 命名為 **"changes requested"**，而我發明了「Return to draft」⇒ 違反已確認參數 #9
    - DoD: ⛔ **不手數** —— W25 Day 0 就把七條數成八條（把兩個 pseudostate 算了進去）。要由表導出
    - DoD: 確認「六個動詞覆蓋七條邊」這個宣稱為真（`→in_review` 有兩個來源共用一個動詞）
    - Verify: 讀 `apps/api/src/workflow/transitions.ts:68-76` 原文並列出 `from → to` 全集
  - [x] **D-422-shape** — 422 body 的四個欄位名逐字確認 → ✅ `{message, from, to, allowed}`（`policy.controller.ts:161-166`）
    - DoD: `{message, from, to, allowed}` —— 前端錯誤型別要照抄欄位名，猜錯會靜默拿到 undefined
    - Verify: 讀 `apps/api/src/modules/policy/policy.controller.ts:161-166`
  - [x] **D-seed-states** — demo 8 筆的狀態分佈
        → ✅ **12 筆 live，六狀態全覆蓋**（in_review 3 · published 3 · approved 2 · under_revision 2 · draft 1 · **retired 1**），10 筆 DEMO SEED
        → ⭐ drive-through 能走**完整按鈕矩陣**，含 AC-4 的「retired 零按鈕」
    - DoD: `seed.ts` 直接寫 status（`AD-SeedBypassesRepository-1`）⇒ 記錄哪些列停在守衛產生不出的狀態
    - Verify: 對真 dev DB 查 `SELECT status, count(*) FROM policies GROUP BY status`
  - [x] **D-inert-key** — `New policy` 用的 `shell.inert` 是共用 key
        → ⛔ **D4，比 plan 說的嚴重**：**24 個 call site 跨 13 個檔**（plan 只提 `risks/[id]`）
        → ⛔ 字串逐字是「This port has **no backend** that can perform it」⇒ **本片會讓它在 `/policies` 上當場自相矛盾**
        → 🚧 **待使用者裁決** —— plan §3.x 明文排除動它，不自行推翻
    - DoD: 確認共用範圍（`AD-SharedInertProseInaccurate-1` 說它也用在 `risks/[id]`）⇒ 本片新按鈕**不得**沿用
    - Verify: `grep -rn "shell.inert" apps/web/src`
  - [x] **D-row-not-clickable** — 列仍不可點且測試仍鎖著
        → ✅ `<tr>:433` 只有 `borderBottom`，**無 handler、無父層會吃事件**
        → 🟡 **D5**：`:425-432` 的註解寫「there is no action here to disable」，**本片會讓它變成 orphan claim**（AP-7）
    - DoD: 新按鈕要在不可點的列裡單獨接收點擊 ⇒ 確認沒有父層 handler 會吃掉事件
    - Verify: 讀 `policies/page.tsx:433` + `policies.test.tsx:150-161`
  - [x] **D-i18n-scan-regex** — parity 的原始碼掃描只匹配字面量 key
        → ✅ regex 為 `/\bt\(\s*[A-Za-z0-9_.]+\s*,\s*'([^']+)'\s*\)/g`（`i18n.test.ts:143`）——
        **只匹配單引號字面量** ⇒ 模板拼裝會空過 ⇒ 用字面量對照表（plan §8 R8 成立）
    - DoD: 確認 `i18n.test.ts:143` 的 regex 形狀 ⇒ 決定動詞 key 用字面量對照表而非模板拼裝（plan §8 R8）
    - Verify: 讀 `apps/web/src/i18n/i18n.test.ts:139-153`
- [x] **Prong 2.5 — child component tree**（前端頁面 phase ⇒ **必做**）
      → ✅ **乾淨**：只 import 3 個元件（`DemoBadge` · `IconSearch` · `NoSource`），**皆不在寫入路徑上**；
      **無狀態徽章元件** ⇒ 確認徽章是 inline JSX（`:479-500`），plan §3.4 的「就地更新徽章」成立
  - DoD: `policies/page.tsx` 是單一 557 行元件還是有子元件？狀態徽章是 inline JSX 還是可複用元件？
  - DoD: ⭐ 若徽章其實已抽成元件，plan §3.4 的「就地更新徽章」寫法要改
  - Verify: 讀 `policies/page.tsx` 的元件邊界 + `grep -rn "from './" apps/web/src/app/(app)/policies/`
- [x] **Prong 3 — schema verify**：**N/A** —— 本片零 DB 變更（`allowed` 是導出值，非欄位）
- [x] **D-baselines** — api unit **507/41** · api int **280/22** · web **104/11** · lint **0** · type **0** · format **0** · build clean · `run_all` **11/11**
      → 實跑確認：`run_all` **11/11** exit 0 · web **104/11** exit 0；api 數字於同一份 code tree 實測（其後只多 docs commit）
  - Verify: 逐項實跑，**不採信 plan 抄來的數字**
- [x] **Catalog drift** — progress.md Day-0 表格（8 條 D1-D8）
- [x] **Go/no-go** — 範圍變動 ≤ 20% 繼續 / 20-50% 修訂 §Acceptance + §Workload 並再確認 / > 50% 中止
      → **≤ 20% ⇒ 繼續 Day 1**。D2 縮小範圍 · D3 一行命名 · D5 一段註解 ·
      🚧 **D4 待裁決**（不阻塞 Day 1 —— 它影響的是 Day 2 的 `page.tsx`）

### 0.2 Branch

- [x] `git checkout -b feature/W26-policy-transition-ui`（從 `main` `0f09f27`）

---

## Day 1 — 設計權威 + API 的 `allowed` (US-1, US-2)

### 1.1 已核可的設計偏離

- [ ] **`docs/02-architecture/15-design-alignment.md` §7 加一列**
  - DoD: 內容含五項 —— 偏離什麼 · 為何交付物答不出（引用兩份 fragment 的 `file:line`）· 選了什麼形狀 · 誰核可 · 何時
  - DoD: ⭐ 明確寫出**它與 `:103`（缺動詞不渲染）的關係** —— 今天 RBAC 未強制，所以那條規則無對應物
  - DoD: ⛔ 不改 `15` 既有的任何一行 —— 只加
  - Verify: 讀回該節；`python scripts/lint/check_path_references.py`

### 1.2 API 附加 `allowed`

- [ ] **`policy.controller.ts` 的 `list()` / `byId()` 每列附加 `allowed`**
  - DoD: 值 = `POLICY_TRANSITIONS[row.status]`，**由表導出不是第二份真相**
  - DoD: `transitions.ts` **零變更**（plan §4 標 UNTOUCHED —— 那是 ADR-0002 的核心）
  - DoD: `retired` 回 `[]` 而非 undefined / 缺欄位
  - Verify: `npm run test -w apps/api`
- [ ] **`policy.controller.spec.ts` 測試**
  - DoD: ⭐ 期望值**由表導出比對，不硬編碼** —— 硬編碼會在表改動時一起改而測不出漂移
  - DoD: 含 `retired` 的空陣列案例
  - Verify: `npm run test -w apps/api`

### 1.x partial gate

- [ ] `npm run lint -w apps/api` · `npm run type-check -w apps/api` · `npm run test -w apps/api`

---

## Day 2 — 前端寫入半邊 + 動詞按鈕 (US-3, US-4, US-5, US-6)

### 2.1 `client.ts` 的寫入動詞與錯誤型別

- [ ] **`patch<T>(path, body)`**
  - DoD: 本樹第一個打 NestJS 的寫入動詞
  - DoD: ⛔ **不引入任何 data library** —— `client.ts:16-17` 已就此表態，本片不推翻
  - Verify: `npm run test -w apps/web`
- [ ] **`ApiRefusedError` 承載 422 的 `{from, to, allowed}`**
  - DoD: 與既有 `ApiUnavailableError` **並存而非取代**
  - DoD: 欄位名照抄後端（Day 0 `D-422-shape` 已確認），**不猜**
  - Verify: `npm run test -w apps/web`
- [ ] **三條映射各有測試**：422 → `ApiRefusedError` · 404 → `null` · 其餘非 ok → throw
  - DoD: ⭐ 這是 plan §8 R2 的緩解 —— 本片建的形狀會被之後每個寫入畫面沿用，**不能只測 happy path**
  - Verify: `npm run test -w apps/web`

### 2.2 `policies.ts` 與頁面

- [ ] **`transitionPolicy(id, to)` + `PolicyRow.allowed` 欄位**
  - DoD: `PolicyRow` 的檔頭仍寫著「本 app 對線路的看法，不是契約」—— 保留那句，本片不建契約層
  - Verify: `npm run type-check -w apps/web`
- [ ] **`page.tsx` 每列依 `allowed` 渲染動詞按鈕**
  - DoD: `retired` 的列渲染**零個按鈕**（不是 disabled 按鈕 —— plan §8 R3）
  - DoD: 按鈕**不得**沿用 `shell.inert`（Day 0 `D-inert-key`）
  - Verify: `npm run test -w apps/web`
- [ ] **第四個頁面狀態 `pending`**
  - DoD: 送出中的那一列停用它自己的按鈕；其他列不受影響
  - Verify: `npm run test -w apps/web`
- [ ] **成功後就地更新該列（狀態 + 徽章 + `allowed`）**
  - DoD: ⭐ **不需重整** —— W25 checklist 3.2 的同一句 DoD 當時明寫未達成（無控件即無此路徑），本片是它第一次可驗
  - Verify: 測試斷言更新後的 `allowed` 也換了，不只 status
- [ ] **三種失敗可辨**
  - DoD: 422 **要把 `allowed` 顯示出來**（那正是後端附上它的用意）；404 說「不存在或不在你的範疇內」；連不上沿用既有不可用狀態
  - Verify: `npm run test -w apps/web`

### 2.3 i18n（US-6）

- [ ] **6 個動詞 key × 2 locale**
  - DoD: `en` 與 `zh-Hant` 皆存在且非空
  - DoD: ⭐ 用**字面量對照表**（`Record<PolicyStatus, TranslationKey>`）而非模板拼裝 —— plan §8 R8：`i18n.test.ts:143` 的掃描只看得見字面量，拼裝的 key 會**空過**
  - Verify: `npm run test -w apps/web`（`i18n.test.ts` 三項）

### 2.y 治理陳述檢查（本片新增使用者可見陳述 ⇒ 適用）

- [ ] **列出本片新增的每一條使用者可見陳述，逐條問「它說的是真的嗎」**
  - DoD: 逐條裁決 —— 動詞標籤是否名實相符（按 `Approve` 真的會核准？）· 失敗訊息是否誤導 · **有沒有任何 affordance 暗示了權限檢查**（今天沒有）
  - DoD: ⛔ 特別檢查：按鈕**不得**看起來像「只有你有權限才會出現」—— 今天它對所有人出現
  - Verify: `python scripts/lint/check_fixture_prose.py`（⚠️ 它只看標了 `@record-claim` 的 export，看不見 JSX / i18n 裡的硬編碼陳述 —— 那一半就是這一格）

### 2.x Full gate

- [ ] format **0** · lint **0** · type **0** · api unit **≥ 507** · api int **280/22** · web **≥ 104** · build clean · `run_all` **11/11**

---

## Day 3 — Drive-through (US-7) — 真 UI + 真後端 + 真服務

### 3.1 Clean restart

- [ ] **殺掉 3200 / 3210 上所有陳舊程序，確認新程序是唯一擁有者**
  - DoD: 含**孤兒 spawn worker**（父程序已死但仍因 SO_REUSEADDR 服務該 port）—— 見 `task-workflow.md` §Risk Class C
  - DoD: 擷取 startup log 證明新路由已掛載
  - Verify: `docs/rules-on-demand/local-runtime-ops.md` 的程序 + `/preflight`

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [ ] **預期流程寫在觀察之前**
  - DoD: ⭐ 先寫下「我預期會看到什麼」再開瀏覽器 —— 事後寫等於用結果反推預期
- [ ] **主路徑：至少推進兩步，徽章跟著變**
  - DoD: **不重整**就更新（AC-5）；⭐ 驗法是**製造變化再觀察**，不是看截圖推論
  - DoD: 刻意挑一筆 **seed 資料**推進（Day 0 `D-seed-states` 的發現）
- [ ] **三條失敗路徑各走一次**
  - DoD: 422（送一個非法目標 —— 需要繞過按鈕，用 devtools 或直接改請求）· 404（不存在的 id）· 連不上（殺掉 API）
  - DoD: 三者的畫面呈現**確實不同**
- [ ] **逐控件走查**：可點 / 有效果 / 標籤真實 / 結果真的渲染
  - DoD: ⚠️ **不要用截圖判斷 disabled 狀態** —— W25 Day 3 在截圖上把 50% 透明的藍看成可用的藍，誤判了一顆。要查 computed style / DOM
- [ ] **真 DB 直查**：稽核列數與 `prev_hash` 鏈
  - DoD: 成功轉換各留一筆 `Policy.update`；失敗的**零筆**；`prev_hash` 逐列等於前一列 `row_hash`
- [ ] 截圖 + observed-vs-intended → progress.md Day 3
- [ ] ⭐ **本次 drive-through 的射程**（收尾報告必須照抄）
  - DoD: 明寫**沒有權限閘**（`AD-RbacUnenforced-1`）—— 不可讀成「有權限的人才能推進」

### 3.3 ⭐ 提早讓 CI 跑一次（`AD-VerificationEnvironmentIsAnAxis-1`）

- [ ] **Day 3 結束就 push，不要等文件全部寫完**
  - DoD: ⛔ W25 的教訓：三層驗證全做且全真，缺陷仍同時穿過三層 —— 因為三層都在同一台機器同一份 `.env` 上。**CI 是本 repo 今天唯一的第二個環境**
  - DoD: 若 CI 紅，**先在本機重現該環境**再修（W25 用 `DEV_PRINCIPAL_ENTITIES=HK1` 重現）
  - Verify: `gh pr checks <N>`（push 前需使用者核可）

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-048-policy-transition-ui.md`**
  - DoD: Problem / Root Cause / Solution / Verification / Impact
  - DoD: §Verification 含 **drive-through PASS + 它的射程**（無權限閘）
  - DoD: 關掉的 AD：`AD-PolicyTransitionNoUiEntry-1`

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`greenfield-feature` 0.55，**第 2 個**資料點；ratio 出 band 就標記 re-point）
  - DoD: ⭐ **兩個預測都要驗**：(a) 三段式 committed ~9.35 hr · (b) plan §7 的區間預測 **1.6–3.2 hr**
  - DoD: ⛔ **中或不中都照實記** —— W25 登記的預測往下沒中，而那本身是資訊
  - DoD: matrix 該行寫著「若第 2 點同 < 0.7 → 0.45 且同時重估 bottom-up 方法」⇒ 判準字面觸發就照做
- [ ] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `CALIBRATION-LOG.md`）
- [ ] Final gate sweep: format **0** · lint **0** · type **0** · api unit **≥ 507** · api int **280/22** · web **≥ 104** · build clean · `run_all` **11/11**
  - DoD: ⛔ **「全綠」要連「在哪裡綠」一起講**（W25 的教訓）—— 本機綠不是 CI 綠的證據
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile · `BACKLOG.md`
  - DoD: CLOSE `AD-PolicyTransitionNoUiEntry-1`（移出 §Open，§Shipped Pointer Index 加一行）
  - DoD: 新增本輪順路發現（見下格）
  - DoD: 計數由 `check_backlog_counts.py` **導出後照抄**，⛔ 不手數也不 grep
- [ ] ⭐ **本輪待記的順路發現**（W25→W26 之間查到、尚未落表）
  - [ ] `AD-Adr0002VsDesignDoc-1` — ⛔ `05-platform-foundation-services.md:15`「configuration, not code」vs `0002:79`「編譯期，無執行期設定路徑」；**設計文件權威高於 ADR**；ADR-0002 全檔只引用 `05:16` 從未 engage `:15`
  - [ ] `AD-ProgressMetricsProseStale-1` — `PROGRESS-METRICS.md:119` 與 `:144` 互相矛盾（「已拍板/已通」vs「未建/未拍板」）；W25 只修了表格列沒修散文
  - [ ] `AD-RoadmapStalePriorityCells-1` — `ROADMAP.md:134,153` 仍把 `AD-Mockup-2`（實為 P1）與 `AD-Mockup-3`（已關閉）標為 🔴 P0；審計已第 3 次
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
  - DoD: ⭐ AP-3 特別看：按鈕有沒有變成「有 handler 但沒效果」；AP-6 看失敗路徑的呈現有沒有靠 mock 撐著
- [ ] ⭐ **已採納的 ADR 已複查** —— 本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？
  - DoD: ⚠️ **這一格的方向是單向的，W25 已證明它漏得掉** —— 它問「本片是否讓既有 ADR 失準」，**不問**「本片新產的東西是否違反更高權威的文件」。⇒ 本片**額外**問第二個方向
  - DoD: 特別複查 ADR-0002（本片建立其上）與 ADR-0003（稽核，本片新增 update 呼叫）
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
- [ ] ⭐ **`PR-pending` 標記已翻** —— merge 後翻標記，並以
      `gh pr view <N> --json state,mergedAt` **驗證**，不採信「已 merge」的宣稱
  - DoD: ⛔ **先跑 `python scripts/lint/check_status_markers.py` 拿清單，再動手翻** ——
        不要先翻再驗。`AD-MarkerCountUnderReported-1`：連兩個 phase 手數都少算一個，兩次都是 E5 抓到的
