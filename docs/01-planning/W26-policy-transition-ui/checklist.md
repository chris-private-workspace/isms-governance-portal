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

- [x] **`docs/02-architecture/15-design-alignment.md` §7 加一列**
      → ⭐ **實際做在兩處，而且主體不在 §7**：plan 猜錯了位置。
      **§4.1**（新增子節，完整裁決）+ **§7 第 11 列**（一行 `✅ Decided` 指標）。
      §4「the procedures win」才是 CLAUDE.md 指向的那一節；§7 是 *Actions arising*（待辦清單）
  - DoD: 內容含五項 —— 偏離什麼 · 為何交付物答不出（引用兩份 fragment 的 `file:line`）· 選了什麼形狀 · 誰核可 · 何時 → ✅ 五項齊備
  - DoD: ⭐ 明確寫出**它與 `:103`（缺動詞不渲染）的關係** —— 今天 RBAC 未強制，所以那條規則無對應物
        → ✅ 且**明寫「deliberately not faked」**；一併裁定 §6 `:165`（狀態絕不只靠顏色 —— 動詞是文字，構造上滿足）
  - DoD: ⛔ 不改 `15` 既有的任何一行 —— 只加 → ✅ 零既有行變更
  - DoD: ⭐ **新增的射程收窄**（Day 1 才發現）：`02a` §4 **只標了一條邊**（`:365` "changes requested"），
        其餘六條無標籤 ⇒ 只有一個動詞是轉寫，另五個是**目標狀態名**的轉寫。§4.1 已寫明，
        並附「若公司程序日後為這些轉換命名，以它的用語取代」
  - Verify: 讀回該節；`python scripts/lint/check_path_references.py`

### 1.2 API 附加 `allowed`

- [x] **`policy.controller.ts` 的 `list()` / `byId()` 每列附加 `allowed`**
  - DoD: 值 = `POLICY_TRANSITIONS[row.status]`，**由表導出不是第二份真相**
        → ✅ 用**既有的** `allowedTargets()`（Day-0 D2），不重寫導出邏輯
  - DoD: `transitions.ts` **零變更**（plan §4 標 UNTOUCHED —— 那是 ADR-0002 的核心）→ ✅
  - DoD: `retired` 回 `[]` 而非 undefined / 缺欄位 → ✅ 有專屬測試斷言 `toHaveProperty` + `toEqual([])`
  - DoD: ⭐ **plan 沒寫但 AC-5 蘊含的第三處**：`transition()` 的回應也必須帶**新**狀態的 `allowed` ——
        否則畫面會在狀態已正確的情況下繼續提供**舊**狀態的動作，且看起來完全正常 → ✅ 已補
  - Verify: `npm run test -w apps/api`
- [x] **`policy.controller.spec.ts` 測試** → **+4 條**（507 → **511**）
  - DoD: ⭐ 期望值**由表導出比對，不硬編碼** —— 硬編碼會在表改動時一起改而測不出漂移 → ✅ 全部經 `allowedTargets()` 比對
  - DoD: 含 `retired` 的空陣列案例 → ✅
  - DoD: ⛔ **反恆真守衛**：`POLICY_STATUSES` 若為空，迴圈跑零次而 `toHaveLength(0)` 照樣通過 ⇒
        已補 `expect(POLICY_STATUSES.length).toBeGreaterThan(0)`（同 `i18n.test.ts:149`）
  - DoD: ⭐ **中性化，預測寫在執行之前，兩次逐條命中** ——
        N1（回傳舊狀態的 `allowed`）⇒ 預測 1 紅、實測 **1 failed/16 passed** 且 `●` 逐字為該條；
        N2（`withAllowed` 直接 return row）⇒ 預測 4 紅、實測 **4 failed/13 passed** 四條逐字命中
  - Verify: `npm run test -w apps/api`

### 1.x partial gate

- [x] `npm run lint -w apps/api` · `npm run type-check -w apps/api` · `npm run test -w apps/api`
      → format **0** · lint **0** · type **0** · api unit **511 / 41**（baseline 507 → **+4**）
- [x] ⭐ **api int 未回歸** —— 加欄位到回應形狀可能弄紅對形狀做斷言的 int 測試
      → ✅ **280 / 22 維持**，exit 0（Day 1 收尾 253.5 s · Day 2 複跑 228.9 s）。
      ⭐ 沒有任何 int 測試對 policy 回應做**窮舉形狀**斷言 ⇒ 加欄位不弄紅它們
  - DoD: **280 / 22 維持**（baseline）；若有紅，先判斷是「測試在測形狀」還是「本片弄壞了行為」
  - Verify: `npm run test:int -w apps/api`

---

## Day 2 — 前端寫入半邊 + 動詞按鈕 (US-3, US-4, US-5, US-6)

### 2.1 `client.ts` 的寫入動詞與錯誤型別

- [x] **`patch<T>(path, body)`**
      → ✅ **刻意不與 `get()` 共用** —— 兩者重疊約 5 行 fetch boilerplate，
      差在關鍵處：422 在寫入路徑有意義、在讀取路徑沒有。合併只會產生一個
      「為了讓合併成立而存在」的 method 分支。理由寫在函式註解裡
  - DoD: 本樹第一個打 NestJS 的寫入動詞
  - DoD: ⛔ **不引入任何 data library** —— `client.ts:16-17` 已就此表態，本片不推翻 → ✅ 零新依賴
  - Verify: `npm run test -w apps/web`
- [x] **`ApiRefusedError` 承載 422 的 `{from, to, allowed}`**
  - DoD: 與既有 `ApiUnavailableError` **並存而非取代** → ✅ 兩個 class 並存，`get()` 行為零變更
  - DoD: 欄位名照抄後端（Day 0 `D-422-shape` 已確認），**不猜** → ✅ 逐字 `{message, from, to, allowed}`
  - DoD: ⭐ **每個欄位都 narrow 不 trust** —— 猜錯的欄位名不會失敗，會靜靜讀到 `undefined`，
        畫面於是渲染「一個沒有提供替代方案的拒絕」。`allowed` 解析不到 ⇒ `[]`，且呼叫端
        必須把空讀成「伺服器沒有指名」而不是印一份空清單
  - Verify: `npm run test -w apps/web`
- [x] **三條映射各有測試**：422 → `ApiRefusedError` · 404 → `null` · 其餘非 ok → throw
      → ✅ `client.test.ts`（**NEW**，7 條）：happy · 422 逐欄位 · 404→null · 500 · 網路失敗 ·
      **422 body 不是 JSON 仍是 refusal** · **真的送 PATCH**
  - DoD: ⭐ 這是 plan §8 R2 的緩解 —— 本片建的形狀會被之後每個寫入畫面沿用，**不能只測 happy path**
  - DoD: ⭐ **最後一條讓前六條有意義** —— 前六條在 `patch` 改送 GET 且不帶 body 時**全部照樣通過**
        （mock 不管被問什麼都照答）。`sends a PATCH` 是唯一把這個檔綁回它自己名字的斷言
  - Verify: `npm run test -w apps/web`

### 2.2 `policies.ts` 與頁面

- [x] **`transitionPolicy(id, to)` + `PolicyRow.allowed` 欄位**
      → ✅ `allowed` 是**必填非選填**：API 三個回應處都附，`retired` 帶 `[]` ——
      空陣列是「後面沒有了」這個**主張**，與缺欄位不是同一件事，不可退化成它
  - DoD: `PolicyRow` 的檔頭仍寫著「本 app 對線路的看法，不是契約」—— 保留那句，本片不建契約層 → ✅ 零變更
  - Verify: `npm run type-check -w apps/web`
- [x] **`page.tsx` 每列依 `allowed` 渲染動詞按鈕**
      → ✅ 新增**最後一欄**（`policies.col.actions`）。⭐ 刻意加在最後而不是插進 status 欄旁：
      既有測試以 `td:nth-child(5)` 取狀態徽章，插在中間會靜靜地讓那條斷言改測別的東西
  - DoD: `retired` 的列渲染**零個按鈕**（不是 disabled 按鈕 —— plan §8 R3）
        → ✅ 測試斷言該列 `querySelectorAll('button')` **長度為 0**（不是「沒有 enabled 的」）
  - DoD: 按鈕**不得**沿用 `shell.inert`（Day 0 `D-inert-key`）→ ✅ 按鈕根本沒有 inert 文案；
        `New policy` 改用**新的** `policies.new.inert`（D4 最小修，見下）
  - Verify: `npm run test -w apps/web`
- [x] **第四個頁面狀態 `pending`**
      → ✅ `pending` 存的是 **row id 不是 boolean**，所以「送出中」天生只鎖那一列
  - DoD: 送出中的那一列停用它自己的按鈕；其他列不受影響 → ✅ 兩者都有斷言
  - DoD: ⭐ **`data-hov` 要跟著撤掉不只是 disabled** —— W19 量到 disabled 按鈕照樣匹配
        `[data-hov]:hover`，當時加的守衛沒有涵蓋這個形狀 → ✅ 有專屬斷言
  - Verify: `npm run test -w apps/web`
- [x] **成功後就地更新該列（狀態 + 徽章 + `allowed`）**
      → ✅ **整列由回應取代**，不是 patch 一個 `status` 欄位
  - DoD: ⭐ **不需重整** —— W25 checklist 3.2 的同一句 DoD 當時明寫未達成（無控件即無此路徑），本片是它第一次可驗
        → ✅ 且斷言 `listPolicies` **只被呼叫一次**（沒有偷偷 refetch）
  - Verify: 測試斷言更新後的 `allowed` 也換了，不只 status → ✅ **N2 中性化證明它在測**（見 §2.z）
- [x] **三種失敗可辨**
      → ✅ 三個互斥的 `data-transition-state`：`refused` / `gone` / `unreachable`
  - DoD: 422 **要把 `allowed` 顯示出來**（那正是後端附上它的用意）
        → ✅ 每個替代狀態渲染成一個帶 `data-refusal-alternative` 的 chip；
        `allowed` 為空時改印一句「伺服器沒有指名」而非一排空 chip
  - DoD: 404 說「不存在或不在你的範疇內」
        → ⛔ **本格的原文不夠**：`transitionStatus()` 的 404 是**三義**不是兩義 ——
        第三個是「這列已經不在剛剛讀到的狀態」（compare-and-set 落空）。文案改成三義並排，
        且**不主張其中任何一個**；測試名字就叫「不宣稱『沒有這筆政策』」
  - DoD: 連不上沿用既有不可用狀態 → ✅ 沿用中性 surface（與 `policies.source.error.*` 同形），
        **不發明警示色** —— 被拒絕是伺服器正常運作，紅色會讀成故障
  - Verify: `npm run test -w apps/web`

### 2.3 i18n（US-6）

- [x] **6 個動詞 key × 2 locale** → ✅ 實際落地 **16 個 key × 2 locale**
      （6 動詞 + `col.actions` + `new.inert` + `transition.*` 5 條 + `actions.noRoleCheck`）
  - DoD: `en` 與 `zh-Hant` 皆存在且非空 → ✅ parity test 三項全過
  - DoD: ⭐ 用**字面量對照表**（`Record<PolicyStatus, TranslationKey>`）而非模板拼裝 —— plan §8 R8：`i18n.test.ts:143` 的掃描只看得見字面量，拼裝的 key 會**空過**
        → ✅ 照做，⛔ **但 plan §8 R8 給的理由是錯的，訂正在此**：`:143` 的 regex 是
        `/\bt\(\s*[A-Za-z0-9_.]+\s*,\s*'([^']+)'\s*\)/g` —— 它匹配的是 **`t(locale, 'key')` 這個呼叫形狀**，
        不是任意字面量。對照表裡的 `'policies.action.approve'` **同樣掃不到**（既有的 `STATUS`
        六個狀態 key 也一直掃不到，而那從來沒讓任何東西變紅）。
        真正擋住錯 key 的是 **TypeScript** —— `TranslationKey = keyof typeof zhHant`，
        寫錯即編譯失敗；模板拼裝要 `as TranslationKey`，而**那個 cast 正是會抓到它的檢查**。
        ⇒ 結論不變（用字面量對照表），**理由換掉**。這是「證據要真的支持結論」的直接應用
  - DoD: ⭐ **六個動詞只有一個有來源** —— `15:116` 的射程收窄寫進 `ACTION` 的註解，
        不只寫在設計文件裡（讀 code 的人不會去翻 `15`）
  - Verify: `npm run test -w apps/web`（`i18n.test.ts` 三項）

### 2.y 治理陳述檢查（本片新增使用者可見陳述 ⇒ 適用）

- [x] **列出本片新增的每一條使用者可見陳述，逐條問「它說的是真的嗎」**
      → **16 條逐條裁決；14 條通過，2 條沒通過並已改**
  - DoD: 逐條裁決 —— 動詞標籤是否名實相符（按 `Approve` 真的會核准？）
        → ✅ **構造上成立**：按鈕的 `data-transition-to`、`ACTION` 的鍵、送出的 `to`
        **是同一個值**。名與實由同一個來源產生，不是兩處各寫一次
  - DoD: 失敗訊息是否誤導
        → ⛔ **`transition.unreachable` 沒通過**：原文寫「Nothing was changed.」，
        而網路錯誤可能發生在請求**送達之後**（伺服器已寫入、回應遺失），5xx 亦然。
        ⇒ 改成「無法從這裡判斷變更是否送達，請重新載入確認伺服器上的實際狀態」。
        ⭐ 這一條是 gate 全綠、測試全綠、而**陳述本身是假的** —— 只有逐條唸過才會發現
  - DoD: **有沒有任何 affordance 暗示了權限檢查**（今天沒有）
  - DoD: ⛔ 特別檢查：按鈕**不得**看起來像「只有你有權限才會出現」—— 今天它對所有人出現
        → ⛔ **沒通過，已補**：檔頭確實寫了「不是權限過濾的」，但**檔頭使用者看不到**，
        而被誤導的正是使用者 —— 一排治理動詞按每一條 UI 慣例都讀成「你被允許做這些」。
        ⇒ 新增 `policies.actions.noRoleCheck` **渲染在畫面上**（非註解），
        與 §4.1:121「deliberately not faked」一致：不假裝有閘，也不假裝沒有這件事
  - Verify: `python scripts/lint/check_fixture_prose.py`（⚠️ 它只看標了 `@record-claim` 的 export，看不見 JSX / i18n 裡的硬編碼陳述 —— 那一半就是這一格）
        → ✅ `run_all` 內 `fixture-prose` PASS（8 API surface × 13 record-claim；125 檔）

### 2.z ⭐ 中性化（預測寫在執行之前，兩次逐條命中）

- [x] **N1** —— `advance()` 忽略 `to` 參數，永遠送 `policy.allowed[0]`
      → 預測 **1 紅**（`sends the target its own button names`），實測 **1 failed / 119 passed**，`×` 逐字為該條
  - DoD: ⭐ 這條中性化存在的理由：**其餘每一條測試都點第一顆按鈕**，所以忽略參數的實作
        會讓它們**全部照樣綠**。沒有這條，「按鈕送出它自己宣告的目標」從未被驗證過
- [x] **N2** —— 成功時只更新 `status`，不用回應取代整列
      → 預測 **1 紅**（`swaps the badge AND the verbs`），實測 **1 failed / 119 passed**，`×` 逐字為該條
  - DoD: ⭐ 徽章那半仍會過 —— 這正是它危險的地方：畫面看起來完全正確，
        只有動詞停留在**上一個狀態**的清單，而它們一秒之前確實是對的

### 2.x Full gate

- [x] format **0** · lint **0** · type **0** · api unit **≥ 507** · api int **280/22** · web **≥ 104** · build clean · `run_all` **11/11**
      → 實測（2026-08-21，**本機**）：format web/api **0** · lint web/api **0** · type web/api **0** ·
      api unit **511 / 41** · api int **280 / 22** exit 0（228.9 s）· web **120 / 12**（baseline 104 / 11 ⇒ **+16**）·
      build web **clean**（29 route）· build api **clean** · `run_all` **11/11**
  - DoD: ⛔ **「全綠」要連「在哪裡綠」一起講** —— 以上全部是**本機**。CI 未跑，見 Day 3 §3.3

---

## Day 3 — Drive-through (US-7) — 真 UI + 真後端 + 真服務

### 3.1 Clean restart

- [x] **殺掉 3200 / 3210 上所有陳舊程序，確認新程序是唯一擁有者**
      → ⭐ **這次沒有要殺的**：preflight 量到 3200 / 3210 **都 free**，
      唯四的 node 進程全部是 Playwright MCP（我自己的工具伺服器，不屬本專案）⇒ 一個都不動。
      如實記錄 —— Risk Class C 要的是「驗證活著的服務進程」，不是「一定要殺點什麼」
  - DoD: 含**孤兒 spawn worker**（父程序已死但仍因 SO_REUSEADDR 服務該 port）—— 見 `task-workflow.md` §Risk Class C
        → ✅ 逐一列出 PID / PPID / StartTime / CmdLine 比對，無孤兒
  - DoD: 擷取 startup log 證明新路由已掛載
        → ✅ `[RouterExplorer] Mapped {/policies/:id/status, PATCH} route`
  - DoD: ⚠️ **我差點把「慢」讀成「壞」** —— 編譯 17:41 報 `Found 0 errors`，
        我查 3210 是 not listening 就寫下「編譯完成 ≠ 應用啟動」。字面正確，但語氣當成故障徵兆；
        實際上應用 **18:23** 才開始 `NestFactory`，中間 42 秒一直在啟動。
        **讀完 `local-runtime-ops.md` §1 之後仍然差一點犯**
  - Verify: `docs/rules-on-demand/local-runtime-ops.md` 的程序 + `/preflight`

### 3.2 Drive-through（MANDATORY — 不是 gate-only）

- [x] **預期流程寫在觀察之前**
      → ✅ 六狀態的按鈕預期表 + 主路徑兩步 + 三條失敗，全部寫在開瀏覽器**之前**（progress.md Day 3）
  - DoD: ⭐ 先寫下「我預期會看到什麼」再開瀏覽器 —— 事後寫等於用結果反推預期
- [x] **主路徑：至少推進兩步，徽章跟著變**
      → ✅ `POL-SG1-900002`：`Draft` →（Submit for review）→ `Under review` →（Approve）→ `Approved`；
      動詞同步換成 `[Publish]`；未觸碰的列完全不變；meta 行跟著更新
  - DoD: **不重整**就更新（AC-5）；⭐ 驗法是**製造變化再觀察**，不是看截圖推論
        → ✅ **量到的不是推論的**：點任何按鈕前先種 `window.__driveThrough.marker`，
        頁面若重整它會消失。全程 5 次互動後 marker **仍存活**
  - DoD: 刻意挑一筆 **seed 資料**推進（Day 0 `D-seed-states` 的發現）→ ✅ `DEMO SEED — Remote working security baseline`
- [x] **三條失敗路徑各走一次** → ✅ `refused` / `gone` / `unreachable` 三個互斥的 `data-transition-state`
  - DoD: 422（送一個非法目標 —— 需要繞過按鈕，用 devtools 或直接改請求）· 404（不存在的 id）· 連不上（殺掉 API）
        → ✅ 422/404 用 fetch 攔截**只改請求、不碰回應** ⇒ 走真正的點擊路徑，回應是伺服器自己的判斷，**不是 mock**；
        unreachable 是**真的 `Stop-Process` 殺掉 API**
  - DoD: 三者的畫面呈現**確實不同** → ✅ 422 帶 chips（Approved / Draft）· 404 三義並陳且清掉上一次的 chips ·
        unreachable 說「不知道是否送達」
  - DoD: ⭐ **§2.y 的修正在這裡被實際看到** —— 若沒做那次逐條唸，unreachable 今天會印
        「Nothing was changed.」，而畫面看起來完全正常、**沒有任何 gate 會紅**
- [x] **逐控件走查**：可點 / 有效果 / 標籤真實 / 結果真的渲染
  - DoD: ⚠️ **不要用截圖判斷 disabled 狀態** —— W25 Day 3 在截圖上把 50% 透明的藍看成可用的藍，誤判了一顆。要查 computed style / DOM
        → ⛔ **這條今天再次生效，方向相反**：`New policy` 在截圖上看起來是飽和藍、完全可按；
        查 DOM 為 `disabled: true · opacity "0.5" · cursor "not-allowed" · data-hov null`，
        title 是 **D4 的新文案**。**截圖錯、DOM 對** ⇒ 同一個視覺陷阱第 **2** 次
- [x] **真 DB 直查**：稽核列數與 `prev_hash` 鏈
  - DoD: 成功轉換各留一筆 `Policy.update`；失敗的**零筆**；`prev_hash` 逐列等於前一列 `row_hash`
        → ✅ 30 分鐘內**恰好 2 筆**，三次失敗**零筆**；hash 鏈 id 2-6 全部 `t`，
        id 1 為 `f` 因為它是**鏈頭**（`lag` 為 NULL，`prev_hash` 是全零 genesis）—— **不可讀成斷鏈**
  - [x] ⛔ **drive-through 抓到而 gate 沒抓到的**：`audit_log.before` **為 NULL** ⇒
        稽核記了「變成 in_review」但**沒記「原本是什麼」**；`actor_id` 同樣 NULL。
        「誰、從哪個狀態核准的」今天**兩個都答不出來**，而那是 approval flow 的核心欄位。
        ⇒ **不當場修**（W25 的產出、範疇是 `audit-trail` 不是 `ui`、不阻塞本片），
        但**本片使它從今天起開始累積真實資料** ⇒ 表面化給使用者排序（Day 4.2 落表）
- [x] 截圖 + observed-vs-intended → progress.md Day 3
      → ✅ `artifacts/day3-01-after-two-steps.png`（全頁）· `day3-02-refused-422.png` · `day3-03-unreachable.png`
- [x] ⭐ **本次 drive-through 的射程**（收尾報告必須照抄）
  - DoD: 明寫**沒有權限閘**（`AD-RbacUnenforced-1`）—— 不可讀成「有權限的人才能推進」
        → ✅ **射程**：本次證明的是「**任何**開啟這個畫面的人都能推進政策狀態」，
        **不是**「有權限的人能推進」。今天沒有權限閘，`policies.actions.noRoleCheck` 在畫面上說明了這件事。
        另**兩項未證明**：稽核缺 `before` 與 `actor_id`（見上格）

### 3.3 ⭐ 提早讓 CI 跑一次（`AD-VerificationEnvironmentIsAnAxis-1`）

- [x] **Day 3 結束就 push，不要等文件全部寫完**
      → ✅ 使用者核可後 push，**PR #100** 已開（Day 4 的 CH-048 / retrospective / BACKLOG 尚未寫，這是刻意的）
  - DoD: ⛔ W25 的教訓：三層驗證全做且全真，缺陷仍同時穿過三層 —— 因為三層都在同一台機器同一份 `.env` 上。**CI 是本 repo 今天唯一的第二個環境**
  - [x] **CI 結果** → ✅ **6 / 6 pass**（gates 2m38s · SCA · trivy · gitleaks 全歷史 · 映像 build + 啟動探測 · SAST）
        - DoD: ⚠️ **int 套件非決定性**（`AD-IntSuiteNonDeterministic-1`）⇒ CI 若在 int 紅，
          第一件事是判斷它是否為那三條已知的（bench × 2 + policy ref code），**不要當成本片弄壞了東西**
          → **未觸發**：CI int **280 passed / 22 suites**
        - DoD: ⛔ **「CI 綠」要自帶射程，不能因為 job 叫 `gates` 就認定它涵蓋什麼** ——
          逐 step 查證：Format / Lint / Negative gates / Type check / Tests / Build /
          **Integration tests**（step 17）皆 success。**不涵蓋 drive-through**（CI 沒有瀏覽器）
        - DoD: ⭐ **意外的量測：CI int 24.057 s vs 本機 228.9 s —— 同樣 280 條、同一份 code，差 9.5 倍。**
          ⇒ 本機的並發時序與 CI 完全不同，**本機才是那三條偶發失敗的溫床**（競爭窗口大得多）。
          ⚠️ 這是**一個資料點不是結論**；且反過來的錯同樣要避免 ——
          慢環境暴露的競爭條件**是真的競爭條件**，不能因為 CI 綠就當它不存在
        - DoD: ⭐ `AD-VerificationEnvironmentIsAnAxis-1` 這次**沒有**抓到本機漏掉的缺陷（W25 有）。
          但它仍然回本了，只是方向不同：**它給了 int 時長的對照**，讓那三條偶發有了新的解釋方向
  - Verify: `gh pr checks <N>`（push 前需使用者核可）

---

## Day 4 — closeout

### 4.1 Change record

- [x] **`docs/03-implementation/changes/CH-048-policy-transition-ui.md`**（單檔 1-page 形式）
  - DoD: Problem / Root Cause / Solution / Verification / Impact → ✅ 五節齊備
  - DoD: §Verification 含 **drive-through PASS + 它的射程**（無權限閘）→ ✅
  - DoD: 關掉的 AD：`AD-PolicyTransitionNoUiEntry-1` → ✅
  - DoD: ⭐ **Root Cause 寫的是「為什麼當初的設計會留下這個洞」不是「還沒做」** ——
        交付物把 policy 模型成**受控文件**、`02a` 模型成**七邊生命週期**，兩者都對而交付物從未畫第二個
        ⇒ **沒有可對齊的對象，約束 6 的 STOP 結構上不會觸發**

### 4.2 Closeout

- [x] `retrospective.md` Q1-Q7 + calibration（`greenfield-feature` 0.55，**第 2 個**資料點；ratio 出 band 就標記 re-point）
  - DoD: ⭐ **兩個預測都要驗**：(a) 三段式 committed ~9.35 hr · (b) plan §7 的區間預測 **1.6–3.2 hr**
        → (a) actual **~2.75 hr**，ratio **0.29 UNDER**。(b) **命中** ——
        ⛔ **但命中的份量要打折**：那個區間寬 2 倍且近四片 actual 全部落在其中
        ⇒ 它預測的其實是「和最近幾片差不多」。**一個永遠會中的預測不是預測**
        → 新條 `AD-WeakIntervalPrediction-1`（retro Q6）
  - DoD: ⛔ **中或不中都照實記** —— W25 登記的預測往下沒中，而那本身是資訊 → ✅
  - DoD: matrix 該行寫著「若第 2 點同 < 0.7 → 0.45 且同時重估 bottom-up 方法」⇒ 判準字面觸發就照做
        → ✅ **re-point 0.55 → 0.45**。⛔ **但論證刻意不建立在 0.29 上**：
        W22 是當日逐筆量測、W26 是事後由 commit 反推，**不同量法**
        （`AD-CalibrationT0PlacementShift-1` 禁跨量法算移動平均）⇒ 改用區間論證：
        推估 actual 是**下限**，即使翻倍到 5.5 hr，ratio 也只有 **0.59，仍 < 0.7**
        ⇒ 判準**在任何合理量法下都觸發**
  - DoD: ⛔ **而「事後反推」本身是 `AD-CalibrationNoTimeRecord-1` 的第 4 次** ——
        且比前三次更值得記：**W22 已發明並驗證了解法**（checklist 每個 Day 一個具名計時 `[ ]`，四天四筆全中），
        W26 復發的根因是**那個解法沒有進 frozen template**，只活在 W22 那一份實例裡
        ⇒ 與 `AD-65` 同形：**已知的正確方法沒有被套用到第二個場合**
- [x] `CALIBRATION-MATRIX.md` 那一行 —— **≤ 1 行 ~250 字元**（lint 上限 400；完整敘述 → `CALIBRATION-LOG.md`）
      → ✅ matrix 一行 + log 完整敘述（含 re-point 的區間論證與量法差異）
- [x] Final gate sweep: format **0** · lint **0** · type **0** · api unit **≥ 507** · api int **280/22** · web **≥ 104** · build clean · `run_all` **11/11**
      → format **0** · lint **0** · type **0** · api unit **511 / 41** · web **120 / 12** · `run_all` **11/11**
  - DoD: ⛔ **「全綠」要連「在哪裡綠」一起講**（W25 的教訓）—— 本機綠不是 CI 綠的證據
        → **本機**：上列。**CI**（PR #100，Day 3 push 的樹）：**6 / 6**，逐 step 查證含 Integration tests。
        ⛔ **不涵蓋 drive-through**（CI 沒有瀏覽器）。
        ⭐ **api int 與 build 未於 Day 4 重跑**，理由可驗證：`git status` 顯示 Day 4 的 diff
        **全部是 `.md`，零非文件變更** ⇒ Day 2 的 280/22 與 CI 的 280/22 仍是當前 code 的證據
- [x] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile · `BACKLOG.md`
      → ✅ CLAUDE.md **恰好 2 行**（Current Phase + Last Updated）· MEMORY.md 1 條指標 + subfile
  - DoD: CLOSE `AD-PolicyTransitionNoUiEntry-1`（移出 §Open，§Shipped Pointer Index 加一行）→ ✅
  - DoD: 新增本輪順路發現（見下格）→ ✅ 6 條
  - DoD: 計數由 `check_backlog_counts.py` **導出後照抄**，⛔ 不手數也不 grep
        → ✅ 先改表 → 讓 detector fail 並印出真值（`+5 / +1 / +4`）→ 照抄 → 重跑 OK。
        **211 → 216**（P0 **5** 不變 / P1 111 / P2 100）
- [x] ⭐ **本片讓 `PROGRESS-METRICS.md` 的 M5 判定失準了，已修** ——
      `:119` 表格列（「UI 無入口」→「UI 入口已建（W26）」+ **新射程：無權限閘**）
      與 `:157` 區塊一併重寫。⚠️ **`run_all` 對此沉默**，因為 detector 只驗**錨點**不驗**判定**
      （該檔 `:100-104` 自己說的），而 M5 的錨點 `scope_ts_count('workflow') == 2` 未變
  - DoD: ⭐ 順帶修掉 `:141-145` 的摘要句（W25 留下的矛盾，`AD-ProgressMetricsProseStale-1`）——
        判斷理由：本片人已在該段落內，而那是整份文件**最多人讀的一句**。
        ⛔ **AD 不關閉**，因為修掉的是實例不是機制（散文段結構上在 detector 射程外）
- [x] ⭐ **本輪待記的順路發現**（W25→W26 之間查到、尚未落表）→ **3 條全部落表 + 本輪新增 3 條**
  - [x] `AD-Adr0002VsDesignDoc-1` — ⛔ `05-platform-foundation-services.md:15`「configuration, not code」vs `0002:79`「編譯期，無執行期設定路徑」；**設計文件權威高於 ADR**；ADR-0002 全檔只引用 `05:16` 從未 engage `:15`
        → ✅ 落表 🟡 P1。⭐ 落表時發現它與 **ADR-0002 自己的可證偽條件 #4** 是同一件事的兩面 ——
        差別在 FC4 等的是「需求出現」，而這裡是「**一份既有的設計文件早就這樣寫了**」
  - [x] `AD-ProgressMetricsProseStale-1` — `PROGRESS-METRICS.md:119` 與 `:144` 互相矛盾（「已拍板/已通」vs「未建/未拍板」）；W25 只修了表格列沒修散文
        → ✅ 落表 🟢 P2，且**該實例已於本片順帶修掉**（AD 保留為機制）
  - [x] `AD-RoadmapStalePriorityCells-1` — `ROADMAP.md:134,153` 仍把 `AD-Mockup-2`（實為 P1）與 `AD-Mockup-3`（已關閉）標為 🔴 P0；審計已第 3 次
        → ✅ 落表 🟢 P2。⛔ **同形第 3 次 ⇒ 依強度階梯應改結構性解法**（優先度欄改成**引用** BACKLOG 的 ID 而非複寫），不是再修一次那兩格
  - [x] **本輪新增**：`AD-Adr0003Fc3Triggered-1` 🟡（見下）· `AD-RefusalChipsLowContrast-1` · `AD-FaviconMissing-1`
- [x] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → **違規數 0**
  - DoD: ⭐ AP-3 特別看：按鈕有沒有變成「有 handler 但沒效果」；AP-6 看失敗路徑的呈現有沒有靠 mock 撐著
        → **AP-3 0**（drive-through PASS，狀態真的改變、稽核真的落列）·
        **AP-6 0**（422/404 的回應是伺服器自己的判斷，攔截只改請求；unreachable 是真的殺進程）
  - DoD: ⭐ **AP-7 修掉 2 個**（D4 / D5）—— 兩者都是**新增正確的 code 讓舊的真話變成假話**，
        而**沒有任何 lint 會叫**（註解與文案不參與型別檢查）
- [x] ⭐ **已採納的 ADR 已複查** —— 本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？
  - DoD: ⚠️ **這一格的方向是單向的，W25 已證明它漏得掉** —— 它問「本片是否讓既有 ADR 失準」，**不問**「本片新產的東西是否違反更高權威的文件」。⇒ 本片**額外**問第二個方向
        → **方向二清潔**：§4.1 的動詞命名對已確認參數 #9 是**弱主張**，
        已在設計文件與 `ACTION` 的 code 註解**兩處**明寫射程 ⇒ 不違反，
        但也**不可被引用為「照程序命名」**
  - DoD: 特別複查 ADR-0002（本片建立其上）與 ADR-0003（稽核，本片新增 update 呼叫）
        → **ADR-0002**：四條可證偽條件**全部未觸發**（無 OpCo 分流 · 無 SLA/升級 · 無第三條流程 ·
        無執行期變更），且本片**強化**它 —— `allowed` 由 `modules` 層導出，
        證明編譯期表能服務執行期 UI 需求而不需要設定路徑
        → ⛔⭐⭐ **ADR-0003 FC3 的「現況」欄過期，這是本片最重的發現**：
        `:154` 寫「Any requirement needs the true prior state in `before`」，
        現況 **`Not required by any built feature`（2026-08-14）**。
        本片建出 approval flow 的 UI 入口 ⇒「這份政策**從哪個狀態**被核准」成為真實的稽核問題。
        ⚠️ **`before` 為 NULL 不是 bug** —— `:118` 明文記錄它（`runScoped` 把未啟動的 promise
        交給 `$transaction`，稽核列不能依賴寫入結果）。
        ⛔ **刻意不自行宣告 FC3 觸發**：ADR 說觸發時要把稽核寫入移進 per-table trigger，
        那是重大架構變更 ⇒ 表面化為 `AD-Adr0003Fc3Triggered-1`，待使用者裁定。
        ⭐ **抓到它的正是這一格的手動複查，沒有任何機制會問起**
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
- [ ] ⭐ **`PR-pending` 標記已翻** —— merge 後翻標記，並以
      `gh pr view <N> --json state,mergedAt` **驗證**，不採信「已 merge」的宣稱
  - DoD: ⛔ **先跑 `python scripts/lint/check_status_markers.py` 拿清單，再動手翻** ——
        不要先翻再驗。`AD-MarkerCountUnderReported-1`：連兩個 phase 手數都少算一個，兩次都是 E5 抓到的
