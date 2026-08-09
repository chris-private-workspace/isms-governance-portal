# BACKLOG — 待辦 / 未決事項單一來源

**Purpose**: 所有 carryover AD、pending 決策、下個 phase 候選的**唯一權威清單**。

**Created**: 2026-08-07
**Last Modified**: 2026-08-08
**Status**: Active

> ⚠️ **這是待辦事項的單一來源。**
> 待辦**不可以**出現在 `CLAUDE.md` 的表格格、`MEMORY.md` 條目、或散落在各個 retrospective 裡。
> 那正是導航檔膨脹的路徑。

> **本檔回答「有什麼工作」，不回答「先做哪個」。**
> 待辦多到「讀完仍不知道下一步」時，才開 [`ROADMAP.md`](./ROADMAP.md) 那一層
> （**只放順序 + 前置條件，細節一律 link 回這裡**）。早期不要開 —— 多一份就多一個漂移面。
> 兩份都存在時，**收尾要同時改兩處**。

---

## 怎麼用

| 動作 | 何時 | 做什麼 |
|------|------|--------|
| **新增** | phase retrospective Q6/Q7 | 把新 AD 加到 §Open Carryover ADs |
| **關閉** | phase closeout | 把該 AD 從 §Open 移除 + 在 §Shipped Pointer Index 加 1 行 |
| **選取** | 開新 phase 前 | 從 §Open 挑一個當下個 phase 的目標 |
| **審計** | 每 5-10 個 phase | 掃一次 §Open —— 有沒有東西早就做完卻沒關掉？ |

---

## §Open Carryover ADs

<!-- 格式：一個 AD 一行。超過 2 行代表細節該進 retrospective 而非這裡。 -->

| AD ID | 症狀 / 缺口 | 來源 phase | 優先度 | 備註 |
|-------|------------|------------|--------|------|
| AD-Residency-1 | 比較矩陣須對**所有**實體統一讀 `posture_snapshot`。**驅動力已換**（CH-008）：原因不再是中國月快照 vs 即時，而是「部分格子即時算、部分讀快照」本身就在比較不同時刻 | CH-001 → 重述 CH-008 | 🟡 P1 | M8 前確認；`02a` §7 已更新 |
| AD-DesignAlign-5 | `15` §7 #5：**OS portfolio** 模組尚未規格化；Risk programme 的**實體已定義**（`02a` §3.1）但**螢幕未規格化** | `15` | 🟡 P1 | `02a` §0 已列為「未規格化，不得建置」 |
| AD-DesignAlign-2 | `15` §7 #2：確認語言集與日本地位 —— i18n 從 M0 就要在位 | `15` | 🟡 P1 | |
| AD-DesignAlign-7 | `15` §7 #7：確認 ISMS profile 的 certifier-comment / company-reply 欄位是否保留 | `15` | 🟢 P2 | |
| AD-Mockup-2 | **`data.js` 不可原樣移植** —— 旗艦儀表板以**國家**為鍵，結構上無法容納 13 OpCo（新加坡 2 家、香港 2 家）。約束 6 的 STOP-and-ask | CH-002 | 🔴 P0 | 阻斷 M8 |
| AD-Mockup-3 | OpCo fixture 需重建為 **13 家**（CH-008 後）：`opcos.js` 的 `RIN` 印度要刪，**且不補 `RCN`**；`Japan` 在 5 個檔案被當成營運實體 | CH-002 → 更新 CH-008 | 🔴 P0 | 移植前必做。⚠️ 原稽核建議的「`RIN`→`RCN` 代換」已作廢，改為直接刪列 |
| AD-Model-Gaps | `02a` 待決欄位級缺口：business unit 是階層節點還是自由文字、治理機構（ISC/ITSC）能否作為核准者、報告排程、通知規則、Policy 的檔案 metadata / TOC / 版本陣列、OrgEntity 的 OpCo function 欄位 | CH-002 | 🟡 P1 | 全數列在 `02a` §0.1 與 §0「未規格化」表 |
| AD-RiskForm-1 | **風險表單實作的是另一套方法論**，不是欄位不足：僅 7 欄、**完全沒有 before/after 結構**、缺整條 asset→threat→vulnerability→CIA 鏈、`Owner` 是自由文字非 user 參照 | CH-004 | 🔴 P0 | `15` §4 已更新 |
| AD-Incident-1 | **事件表單完全沒有 `11` 要求的 restricted block**（violating acts / motives / disciplinary action / president view）—— 連同它的 CISO/HR 權限隔離與存取稽核一併缺席 | CH-004 | 🔴 P0 | 隱私控制，`11` §Access control 明訂 |
| AD-Nav-1 | **Wave 3 的 AI agent 是導航第一項**（自成 Intelligence 組，在旗艦儀表板之上）。Wave 1–2 會出現顯眼的死連結或空群組 | CH-004 | 🟡 P1 | 產品定位決策，尚未有人做過 |
| AD-Switcher-1 | 實體/角色切換器把兩個正交軸壓成 7 個預組合的扁平清單（含國旗）。`15` §5.1 要求 entity scope 疊在 role 之上 | CH-004 | 🟡 P1 | 13 OpCo × 6 角色無法用扁平清單 |
| AD-Auth-1 | 註冊畫面帶著 pre-`15` 詞彙：Entity 是 6 個國家（含 Japan）、Requested role 是 `Risk Owner / Control Owner / Auditor (read-only) / Regional Governance`——**都不是已確認的六角色** | CH-004 | 🟡 P1 | 是 `AccessRequest` 的自助入口，非裝飾 |
| AD-Nav-2 | 導航計數徽章（Assessments `5`、Incidents `2`）未在任何規格中定義：算什麼、誰的範疇、多久刷新 | CH-004 | 🟢 P2 | |
| AD-Port-BFSI | 移植時須剝除金融業殘留：AML/CTF/制裁/對帳內容與 `juris` 的審慎監理機關。**CH-004 已確認僅存在於 `data/*.js` 與 standalone prototype——markup 乾淨**，所以這是資料 fixture 工作，不是全庫掃描 | CH-002 | 🟢 P2 | 成本已下修（原 🟡 P1）|
| AD-ClaudeMdBudget-1 | **`CLAUDE.md` 長期貼著 byte 上限運行** —— 28,968 / 30,000（96.6%），headroom 1,032。CH-008 一次就吃掉 492 bytes，CH-009 靠逐句壓縮才還回去。下一次實質新增會撞牆 | CH-009 | 🟡 P1 | 觸發條件：headroom < 500 bytes 時做一次結構性瘦身（把非導航內容移進 `docs/`），不要再靠壓縮形容詞 |
| AD-CssToken-1 | **`mockup-fidelity.md:38` 紅線 7 在本專案是錯的**：它規定一律 `oklch(var(--token))`，但交付物 token 是 HEX（`styles/tokens.css:24` `--primary: #2A5BD7`）。`oklch(#2A5BD7)` 是無效 CSS 且**靜默失效**。同一缺陷在 playbook §4.2 Layer 3 | CH-005 | 🟡 P1 | ⚠️ **W01 前端第一頁之前必修**（一行）。CLAUDE.md 約束 6「不做色彩空間轉換」在本專案亦不適用 —— 那是模板帶來的通用警語 |
| AD-DocIndex-1 | **`docs/02-architecture/README.md` §核心設計文件 仍是未填模板**：列的 `00-vision.md` / `01-architecture.md` / `02-tech-stack-decisions.md` 全部不存在，實際是 `00-project-charter.md` 等 27 份。**五個 detector 全部抓不到** —— 那些幻影檔名是純表格文字不是連結 | CH-005 | 🟢 P2 | 使用者反映「文件很多不知從何看起」的直接成因 |
| AD-Constraint7-1 | **CLAUDE.md 約束 7（LLM provider neutrality）的理由已失效** —— 原論證是「中國在範圍內，推論可能須境內發生 → 主權槓桿」，前提隨 ADR-0010 消失。約束保留（供應商鎖定／成本／可用性），但「合規機制」框架不可再引用 | CH-008 | 🟡 P1 | Wave 3 之前重寫。`14`、`14-adr/README.md` ADR-0009 列已標同一警語 |
| AD-CIRequired-1 | **CI 尚未設為 required status check** —— `required_status_checks` 仍是 `null`，所以綠燈不擋任何東西。`07:31` 的 M0 DoD 要求它 | CH-006 | 🟡 P1 | W01 M0 骨架建立後設。現在設 = 用沒有實質內容的 gate 擋住所有 PR。📌 **CH-013 起要設的是兩個 workflow**（`ci.yml` 的 `gates` + `image-smoke.yml` 的 smoke job），不是一個 —— 獨立 workflow 是使用者拍板的取捨，代價記在此 |
| AD-DAST-1 | **DAST 從來就不存在** —— `security-scan.yml` 四個 job 是 `secret-scan` / `dependency-scan` / `static-analysis` / `container-scan`，沒有 DAST；但 `04:71` 與 `07:50` 都要求它。⚠️ **私有 VNet 讓它更難補**：infra team 已確認一定接公司 private VNet，而 GitHub 託管 runner 在公網上，接不到只存在私有網路的 staging | Azure 資源盤點 2026-08-08 | 🟡 P1 | 與 `AD-SecScan-1` 同源但**不同缺口**（那三個是有 job 但 skip，這個是根本沒 job）。補法需 VNet 內 self-hosted runner 或等價路徑 —— **M0 規劃 CI 時一併決定**，部署後才發現代價高得多 |
| AD-SecScan-1 | ~~SCA / SAST / 容器掃描是 skip 不是 clean~~ → **W01 部分關閉**：三者現在真的執行（SCA `npm audit --audit-level=low` · SAST `Ran 462 rules on 47 files: 0 findings` · trivy `Detected config files num=2`）。~~⚠️ 剩餘缺口：Dockerfile 從未被 build 過~~ → **CH-013 關閉該項**（`image-smoke.yml` 每個 PR build 兩個 image）。⚠️ **剩餘缺口只剩 DAST 無 job** | CH-006 → W01 → CH-013 | 🟡 P1 | **仍不可視為關閉** —— guardrail 7 要求 SCA/SAST/DAST 三者，DAST 見 `AD-DAST-1`。完全關閉條件現在**只剩 DAST 有 job** |
| AD-HelmetSilentOption-1 | ⭐ **傳一個不存在的 helmet 選項不會報錯，會靜默關掉一個預設開啟的保護**。CH-012 實測：`helmet()` → `X-Powered-By` 不存在；**`helmet({xPoweredBy:false})` → `X-Powered-By: Express`**（`xPoweredBy` 不是 helmet 的選項名，它的是 `hidePoweredBy`）。W01 出貨的就是中間那個 | CH-012 | 🟡 P1 | 這是 `AD-NegativeGate-1` 形狀的**函式庫層版本**，比自己寫的設定更難察覺 —— 連「選項名不存在」都不會被告知。`security.spec.ts` 現在會對這個錯誤失敗。通則：**任何以物件傳選項的安全中介層，都要有一條在 wire 上驗證的斷言**，不能只讀設定 |
| AD-EslintSettingsClaim-1 | **`eslint.config.mjs:110-114` 的註解在 ESLint 10 下重現不出來** —— 該註解稱「`settings` 掛在有 `files` 的區塊會使 `boundaries/elements` 為空」，CH-012 實測加上 `files: ['apps/**/*.ts']` 後，從 repo 根與從 workspace cwd **兩種呼叫規則都照樣生效** | CH-012 | 🟢 P2 | ⚠️ **刻意不改那段註解** —— 只知道「試的那個形狀不會失效」，不知道「W01 當時是哪個形狀」。改掉等於用猜測取代紀錄。解法：下次動 eslint 設定時順手重現一次，確認後再改寫或刪除 |
| AD-CacheControl-1 | **`apps/api` 完全沒有設 `Cache-Control`**，而 `16:22` 要求「敏感頁面與 **API 回應**使用 `no-store, private`；敏感內容不得 `public` 或 `max-age > 86400`」。CH-012 Day-0 P3 逐條抄 `16` 時發現（起草時的斷言表漏了這一項）| CH-012 Day 0 | 🟡 P1 | **刻意延後**（2026-08-09 拍板）：`/health` 不是敏感端點，今天嚴格說沒違反；而「什麼算 sensitive」是政策決定，比補一個 header 大。⛔ **M1 建第一個業務端點時必須先答** —— 預設值一旦錯過，就要逐個端點回頭補 |
| AD-NegativeGate-1 | ⭐ **「設定型強制力靜默失效」W01 一個 phase 內出現 5 次** —— boundaries 規則六種設定失效方式全部表現為 lint 全綠 · 三個掃描 job success 卻掃 0 個目標 · build 成功但產物起不到 · helmet `xPoweredBy:false` 對 Express 無效 · CI 跑 `test` 不是 `test:cov` 導致 45% 覆蓋率一路綠。共同結構：**設定損壞時不會報錯，而是安靜地什麼都不做**，外層 EXIT=0 讀起來像通過 | W01 | 🔴 **P0 候選** | 依 `.claude/rules/README.md` 強度階梯，同形狀 ≥3 次應改結構性解法。提議：**每個宣稱會「擋住某件事」的機制，必須附一個會被它擋住的常駐負面案例，且該案例在 CI 裡被執行**。**CH-012 交付 3 個**（boundaries fixture + `lint:negative` · i18n parity 雙向 · 安全標頭逐條）。**CH-013 交付第 4 個**：build 產物真的能啟動（`image-smoke.yml` + `scripts/smoke-probe.mjs`，4 項元驗證）。**W02 交付第 5 個**：RLS 真的在擋（policy 中性化為 `USING(true)` → 20 個整合測試紅 14）+ 旁路 detector（`scripts/assert-no-scope-bypass.mjs`，兩種弄壞法各驗一次）。**剩餘 1 個仍無覆蓋**：掃描 job 真的掃到 N>0（要 parse job log，工具升版即壞）。**本條不關閉** ⚠️ CH-013 順帶量到這條規則的**邊界**：元驗證 3（拿掉 openssl）證明有些缺陷**不造成可觀測故障**，負面案例對它們無效 —— 見 `AD-OpensslClaim-1`。⭐ **W02 改了結構而非再寫一次紀律**：detector 的 self-test **不在旗標後面**，每次執行都跑 —— 同形狀第 3 次不應該再靠「記得跑」 |
| AD-GrepAssertion-1 | ⭐ **拿一段為人類排版的文字去做機器判斷，本 phase 壞了 2 次** —— (a) `grep -c "^\[warn\]"` 因 prettier 的 ANSI 色碼永不匹配，**0 命中被讀成 format clean 並寫進 commit message 與 PR 描述**；(b) `image-smoke.yml` grep `super=f bypassrls=f`，但 `\|\|` 串接布林得到 `true`/`false` → 對一個正確的受限角色誤擋（PR #25 run `31321090681`）。**(b) 從未以 workflow 裡的形式被跑過，也從來沒有負面案例** | W02 Day 4 | 🟡 P1 | 修法已套用於 (b)：判斷移進 SQL（`count(*) ... AND NOT rolsuper`），本機驗兩個方向（受限→1 過 · superuser→0 擋）。通則：**斷言用退出碼或結構化資料（`--json` / SQL 述詞），不 grep 格式化輸出**；若非 grep 不可，必須有一個「應該被抓到」的負面案例證明 pattern 會匹配 |
| AD-ScopeConcurrency-1 | ⭐ **並行範疇汙染是唯一不會拋錯的失敗模式，而它沒有常駐測試** —— W02 Day 2 一次性量到 120 次交錯 scoped 讀（pool max 1 與 10）0 錯，但那是 scratchpad 腳本。其餘每一種隔離失敗都表現為 `42501`/`42704`，只有這一種表現為「A 的請求看到 B 的列」 | W02 | 🟡 P1 | 整合測試加一項：兩個不同範疇的 client 交錯查詢 N 次，斷言每次只回自己的列。**這是 W02 design note §4 自評最弱的一項** |
| AD-ScopedClientDI-1 | **「`core-model` 經 DI 取得範疇化 client」仍未被證明** —— `scope-boundaries.md:126` 說 ADR-0004 的 spike 負責驗它，但 W02 沒有消費者可驗：`core-model` 目前無 repository。順帶量到一件事：`scope-boundaries.md:124` 說型別住契約層，**那做不到**（契約層是葉節點，不能 import generated Prisma 型別）| W02 | 🟡 P1 | 可行拆法：**token 在 `api`、型別在 `core-model`、實例由 `entity-scope` 提供**。M1 第一個 repository 是觸發點。⛔ 現在建 = 零消費者的 DI token = AP-5 + AP-3 |
| AD-PoolerScope-1 | **pooler（PgBouncer / pgcat）下 tx-local `set_config` 的行為未驗** —— transaction pooling 模式可能讓範疇跨請求外洩或消失。ADR-0004 §可證偽條件 #1 就是這一條 | W02 | 🟡 P1 | ⛔ **引入任何 pooler 之前必須先驗**。若不成立，`decision-form.md` OQ-3 的選項 B（應用層過濾）是已記錄的降級路徑，**降級必須被記錄而非默默發生** |
| AD-ScopeFnCost-1 | **`app_entity_scope()` 的每列成本未量測** —— 標 `STABLE` 應讓 planner 每 statement 求值一次，但沒跑過 `EXPLAIN`。RLS policy 裡的函式若真的每列呼叫，滾升查詢會隨資料量惡化 | W02 | 🟢 P2 | 資料量成長後用 `EXPLAIN (ANALYZE, BUFFERS)` 量測。今天 2 列，量不出東西 |
| AD-Day0Scope-1 | ⭐ **Day-0 對「狀態性行為」的量測範圍過窄，而結論被當成已驗證地基** —— `D-failclosed` 只測了 virgin 連線就判定「fail-closed 由 PostgreSQL 免費提供」，並據此**減了 0.5 hr**。Day 2 量到：連線被 scope 過一次之後，`current_setting` 不再 raise，查詢**靜默回 0 列** | W02 | 🟡 P1 | 提議 `day0-plan-verify.md` Prong 2 增一條：對**有狀態的**行為（GUC / session / cache / 連線）量測時，必須含「第二次呼叫 / 用過之後」的案例。一次性案例的結論只能標 first-call only |
| AD-EnvDrift-1 | ⭐ **改了 `.env.example` 不等於改了 `.env`** —— W02 Day 1 更新了範例檔，Day 2 的探測仍以 W01 的 superuser URL 連線，**十二項全綠而 RLS 全程未生效**，並在過程中把一列 fixture 搬到了別的實體 | W02 | 🟡 P1 | 測試層已有守衛（`int-global-setup.js` 斷言角色）。缺的是**應用程式啟動時**也斷言連線角色非 superuser —— 那是 production 唯一會被察覺的時機 |
| AD-AdRegistry-1 | **plan 裡命名的 AD 沒有進 BACKLOG，closeout 時無處可關** —— W02 plan §0 / §5 AC-9 引用 `AD-RLS-Unverified`，grep 全 repo 只命中 W02 自己的文件。起草 change record 時又順手發明了 `AD-CleanDbMigrate-1` | W02 | 🟢 P2 | Day-0 Prong 1 順便驗 plan 引用的每個 `AD-*` 在 `BACKLOG.md` 存在；不存在就當場註冊，或改用敘述而不是編號。**編號會製造「已登記」的錯覺** |
| AD-TimeTracking-2 | **`AD-TimeTracking-1` 只被遵守了 3/4 天** —— W02 Day 1-3 有逐項工時，**Day 0 沒有**，而它是工作量第二大的一天。第 1 個 `spike` 資料點因此仍是部分回推 | W02 | 🟢 P2 | Day-0 的 progress 條目也要有時間表格，與 Day 1-3 同格式。否則 calibration 每個 class 的第一個資料點都會帶同一個瑕疵 |
| AD-TimeTracking-1 | **`progress.md` 全程零工時紀錄** —— `task-workflow.md` Step 5 要求逐任務「actual Z min」。W01 的 calibration 第 1 個資料點只能由 commit 時間戳回推，`|R-1.0|` 達 65% 卻無法判斷是雜訊還是訊號 | W01 | 🟡 P1 | 每日 progress 條目強制寫 `Task X.Y — actual Z min (est ~W min)`。沒有它，calibration matrix 收集的是估算的估算 |
| AD-Day0Registry-1 | **Day-0 Prong 2 的定義只涵蓋「plan 對現有 code 的斷言」**，而 W01 最有價值的 drift（`D-nest-prisma-ver`：registry 現況 NestJS 11.1.28 vs ADR 寫的 10）來自**外部 registry** | W01 | 🟢 P2 | 已在 W01 實際擴充並奏效（1/3 驗證）。連續驗證 3 個 phase 後，把「plan 引用的外部套件版本」明列進 `day0-plan-verify.md` Prong 2 |
| AD-ChNumber-1 | **「建立前先查最大號」用 `ls` 目錄會撞號** —— W01 checklist 寫「目前最大為 CH-009」，但 `CH-010` 已被四處**前向引用**預留給 Azure 資源清單（`ADR-0010:175` · `ADR-0011:16,157,158` · `CH-009/spec.md:165` · 本檔 `AD-IaCEvidence-1`）。本 phase 改用 CH-011 | W01 | 🟢 P2 | 判準改為 **grep 全 repo 的 `CH-\d+` 引用**，不是 `ls` 目錄 —— 被預留但尚未建立的編號在目錄裡看不見 |
| AD-ImageDigest-1 | **base image 釘的是 tag 不是 digest** —— `apps/api/Dockerfile:41-44` 自稱「it is a **recorded** follow-up」，但 CH-013 grep 全 `docs/` 後確認**它從未被記錄到任何清單**，只存在於那段註解裡。W01 checklist 的 DoD「base image 釘 digest」也因此一直未達成 | W01 → CH-013 發現 | 🟡 P1 | 與 `AD-ImageBuild-1` 同一種病：知道問題、寫下來、寫在沒有人會回頭看的地方。digest pinning 才真正防 tag mutation；`AD-TrivyExempt-1` 到期重拉 base 時是自然的落點 |
| AD-OpensslClaim-1 | **`apps/api/Dockerfile:55-58` 的「then the wrong engine」是推論不是觀測** —— CH-013 元驗證 3 拿掉整個 `RUN` 實測（CI run `31300101058`）：警告確實出現（一字不差），但 `✔ Generated Prisma Client (v7.9.1)`、build 綠、`{"status":"up","db":"up"}`。缺 openssl 在此組態下**只有警告，無可觀測故障** | CH-013 | 🟢 P2 | ⚠️ **刻意不改那段註解**（`AD-EslintSettingsClaim-1` 先例：單次觀測、不知 W01 當時全貌）。**保留 openssl 安裝仍然正確** —— 消除警告、不靠「預設剛好能用」。順帶：`image-smoke` **抓不到這一類**，因為它不造成故障 |
| AD-TrivyFullImage-1 | **trivy 仍只掃 base image，不掃 build 出來的完整 image** —— `security-scan.yml:286-291` 明寫此取捨與缺口（`apt-get install` 進去的套件不被覆蓋）。CH-013 現在**會 build 出兩個 image**，餵給 trivy 的路徑首次存在 | CH-013 | 🟡 P1 | 使用者 2026-08-09 拍板**本次不做**：第一次掃完整 image 會涵蓋應用層 `node_modules`，很可能噴出一批現存 findings，需要 `security-scan.yml:13-37` 明訂的分流窗口五步 —— 混進 CH-013 會讓它收不掉 |
| AD-TrivyExempt-1 | **`libssl3` 六條豁免於 2026-09-07 到期** —— distroless base 的 OpenSSL（CVE-2026-31789 CRITICAL 等）。Debian 已出 `3.0.19-1~deb12u2`，distroless 尚未重建 | W01 | 🟡 P1 | 到期即自動變紅（trivy `expired_at`，無需有人記得）。到期時：重拉 base 重掃 → 已重建就刪掉 `.trivyignore.yaml`；未重建則**逐條重新分流**，不可靜靜延期 |
| AD-IaCEvidence-1 | **IaC 掃描義務已移交 infra team —— 本專案沒有 IaC 可掃**。infra 建立全部 Azure 資源（2026-08-08 確認）。`07:31` M0 DoD「IaC skeleton scanned」與 `04:73`「apply 前掃描」雙雙失去標的。**義務未消失，只是換手** | CH-010 前置 | 🟡 P1 | ⛔ M0 收尾**不得**逕行打勾或標 N/A —— 二選一：引用 infra 掃描證據，或明記「由內部第三方營運」。同時擴大 Entity Zero 證據缺口（5→9 項）。ADR-0011「IaC tool deferred to CH-010」的答案＝本專案不選 |
| AD-WebCoverage-1 | **`apps/web` 的覆蓋率不受任何門檻約束** —— W01 Day 3 把 `test:cov` 接進 CI 時只涵蓋 `apps/api`（vitest 需另裝 `@vitest/coverage-v8`，且 `page.tsx` 尚無元件測試，今天開啟只會逼出一個「低到能過」的門檻）。約束 5 的 ≥80% 目前只對後端成立 | W01 | 🟡 P1 | 與其設一個假門檻不如記在這裡。解法：裝 `@vitest/coverage-v8` + jsdom/testing-library，替 `page.tsx` 補元件測試（三個渲染分支已在 Day 3 手動驗過，正好是測試的規格），再把 web 納入 CI 的 `test:cov` |
| AD-CovThreshold-1 | **`apps/api` 的 branches 門檻由 80 降為 70**（`jest.config.js`）—— `emitDecoratorMetadata` 每個被裝飾的建構子／回傳型別都會 emit 一個測試到不了的三元分支（lcov 佐證 `BRDA:31,0,1,0`），真實上限 78.57%。**不是放寬品質要求，是移除一個沒有正確做法能通過的 gate** | W01 | 🟢 P2 | statements / functions / lines 維持 80（現況皆 100%）。再收緊條件寫在 `jest.config.js` 的區塊註解裡：Nest DI 不再需要 reflect-metadata，或該類分支變成可排除時 |
| AD-LintOutput-1 | **`run_all.py:80` 失敗時只保留 detector 輸出的最後一行**，而那通常是提示語不是違規清單 —— CI 失敗訊息無法診斷 | CH-006 | 🟢 P2 | 目前用 workflow 的 `--verbose` 繞過。同型再現 → 改成 `returncode != 0` 時保留完整輸出 |
| AD-Placeholder-1 | ⭐ **「模板佔位符未與本專案對齊」已發生 6 次**（`AD-RuleBoundary-1` / `AD-CssToken-1` / `AD-DocIndex-1` / ADR 檔名 / `CLAUDE.md` byte 預算 / `ci.yml`）| CH-006 | 🟡 P1 | **CH-007 只關掉第 6 類**（actionlint + 棘輪 detector）。⚠️ 原提案的「掃全 repo 佔位符」**已證實不可行** —— 512 命中約 500 個是合法慣例語彙（`W{NN}` / `NNN` / `<slug>`），會噴在自己的規則文件上。其餘四類需語義理解，`lint-detector-authoring.md:22` 明訂寫不出可靠 detector。**W01 關掉第 7 個實例**（`scope-boundaries.md` 的範疇表與 import 矩陣，Day-0 `D-boundaries-matrix` 發現）✅。**本條仍保持開啟** |
| AD-ActionsNode-1 | `actions/checkout@v4` 用 Node 20，GitHub 已標 deprecated 並強制跑在 Node 24（4 個 security-scan job 皆有此 annotation） | CH-006 | 🟢 P2 | 現在只是警告；GitHub 移除 Node 20 支援時會直接壞掉 |

**優先度判準**：

| 級別 | 判準 |
|------|------|
| 🔴 P0 | 正在傷害使用者 / 阻擋其他工作 / 是已知的 Potemkin |
| 🟡 P1 | 有明確價值，但可以等 |
| 🟢 P2 | 想做，沒有明確觸發條件 |
| ⚪ P3 | 記著，可能永遠不做（誠實一點，不要假裝會做）|

> **定期誠實化**：P3 的東西放超過 10 個 phase 還沒動 → 刪掉它。
> 一份沒人相信的待辦清單比沒有清單更糟。

---

## §Shipped Phases Pointer Index

<!-- 每個完成的 phase 一行。完整敘述在 memory subfile + retrospective。 -->
<!-- 這裡**只放指標**，不放 file:line / 測試數 / drive-through 細節。 -->

| Phase | Date | 一句話 | Detail |
|--------|------|--------|--------|
| — | 2026-08-07 | CH-001：跨境欄位分級，residency 邊界改為設定 | `docs/03-implementation/changes/CH-001-cross-border-field-classification.md` |
| — | 2026-08-07 | CH-002：24 個設計交付物資料檔對照規格審計（關閉 `AD-Mockup-1`）| `docs/09-analysis/mockup-data-vs-spec-audit-20260807.md` |
| — | 2026-08-07 | CH-003：`02a` §0 實體索引 + 三項 P0 模型決策（關閉 `AD-DesignAlign-3/4`、`AD-Mockup-4`、`AD-Model-Vendor`、`AD-Model-AuditIssue`）| `docs/03-implementation/changes/CH-003-entity-index-and-p0-model-decisions.md` |
| — | 2026-08-07 | CH-004：30 個 screen fragment 對照規格審計（純發現）| `docs/09-analysis/screen-fragment-audit-20260807.md` |
| — | 2026-08-07 | CH-005：三份基礎 ADR 拍板（0001 NestJS+Prisma · 0006 Azure 分區 · 0007 Entra ID）—— **解封 M0**；關閉 OQ-1/2/5 | `docs/03-implementation/changes/CH-005-foundation-adrs/` |
| — | 2026-08-07 | CH-006：修好 `ci.yml`（自第一個 PR 起 11/12 次 run 失敗）—— **CI 首次綠燈**，`run_all` 首次在 CI 執行，gitleaks 首次掃描全歷史 | `docs/03-implementation/changes/CH-006-repair-ci-gates.md` |
| — | 2026-08-07 | CH-007：actionlint（pin+SHA）+ 未填佔位符棘輪 detector；修 3 個既有 shellcheck 問題。**原「掃全 repo 佔位符」提案經枚舉後推翻** | `docs/03-implementation/changes/CH-007-placeholder-detector.md` |
| — | 2026-08-08 | CH-008：**中國移出範圍**，拓撲收斂為單一區域 × 3 環境（ADR-0010 取代 0006）。覆蓋 grep 掃 34 檔／173 處，改 18 檔；順帶發現 CH-005 漏更新 `docs/architecture.md` §3+§5 | `docs/03-implementation/changes/CH-008-china-out-of-scope/` |
| — | 2026-08-09 | **CH-012**：三個 gate 各帶一個常駐負面案例（boundaries fixture + `lint:negative` · i18n parity 雙向 · 安全標頭逐條對照 `16`）—— MERGED (PR #20, `2a4160f`)。**每個都用「弄壞它看它紅」驗過**；順帶抓到 `Permissions-Policy` 缺席與 `helmet({xPoweredBy:false})` 靜默失效。關 W01 checklist 2.3 | `docs/03-implementation/changes/CH-012-resident-negative-gates/` |
| — | 2026-08-09 | **CH-013**：`image-smoke.yml` + `smoke-probe.mjs` —— 兩個 Dockerfile 首次被 build 並啟動探測。**首航即抓到一個真實缺陷**（build 階段在 schema 存在前跑 `prisma generate`），該缺陷通過了全部既有 gate。關 `AD-ImageBuild-1`；`AD-NegativeGate-1` 3→4/5 | `docs/03-implementation/changes/CH-013-image-build-and-run-smoke/` |
| — | 2026-08-08 | CH-009：修三軌分類在 pre-code 階段的失效 —— Change 判準加「既定設計」+ 兩條「不走軌」路徑；**修好 `PROCESS.md` §3.1 與 §4.1 對同一輸入的相反路由**；關 `AD-RuleBoundary-1`（ADR forcing-function 判準入 `14-adr/README.md`）| `docs/03-implementation/changes/CH-009-track-classification-fix/` |
| **W01** | 2026-08-08 | **Monorepo scaffold** — MERGED (PR #18, `ce72564`)，`closed_partial`。八個休眠 gate 從「回報 SUCCESS 但什麼都沒檢查」變成真的會叫；**同形狀「綠燈但空轉」一個 phase 內 5 次** → `AD-NegativeGate-1`。M0 DoD：3 關閉／2 部分／1 無標的 | `docs/01-planning/W01-monorepo-scaffold/retrospective.md` · `docs/03-implementation/changes/CH-011-w01-monorepo-scaffold.md` |
| **W02** | 2026-08-09 | **Entity-scoping RLS spike** — PR-pending，`closed`。第一張業務表與它的隔離同一個 migration；**約束 8 四個範疇測試在應用層與資料庫層各自成立**（20 個整合測試，8 個完全不經應用層）。**推翻 Day-0 一項承重結論**：fail-closed 只在從未被 scope 過的連線上免費 → 補 `app_entity_scope()`。**裁決 ADR-0001 §可證偽條件 #1 未觸發** → ADR-0004 拍板，關 OQ-3 | `docs/01-planning/W02-entity-scope-rls-spike/retrospective.md` · `docs/03-implementation/changes/CH-014-w02-entity-scope-rls.md` · `docs/02-architecture/design-notes/W02-entity-scope-rls.md` |

---

## §Pending Decisions（需要人來拍板的）

<!-- 不是「要做什麼」而是「要選哪個」的事項。 -->

| 決策 | 選項 | 卡在哪 | 誰決定 |
|------|------|-------|--------|
| ~~**中國跨境資料層級**~~ | — | ✅ **已消滅** —— 中國於 2026-08-08 移出範圍（`CH-008`），沒有中國邊界，`03` §Questions for Legal 的四個問題作廢。`AD-Decider-1` 一併關閉 | — |
| ~~**計算平台**~~ | — | ✅ **已拍板 2026-08-08 — Azure Container Apps**（[ADR-0011](../14-adr/0011-compute-platform.md)）。決定性證據是 `unified-operation-platform` 已在 ACA 上跑同一個 stack；「App Service 預設值已知」的論據在起草時**被自己推翻**（ACA 的 `*.azurecontainerapps.io` 同樣是平台預設）| — |
| 其餘 **5** 項開放決策（OQ-3/4/6/7/8）| 見 [`../decision-form.md`](../decision-form.md) | 各範疇 | 卡的是**證據不是決策者** —— OQ-3/4/6 需 W01 spike 的實測，OQ-7 需 spike，OQ-8 屬 Wave 3 |

---

## §Known Issues / Accepted Debt

<!-- 已知但**有意識決定不修**的東西。寫下來是為了不要重複發現它。 -->

| Issue | 為何不修 | 什麼條件下要重新考慮 |
|-------|---------|-------------------|
| `15` §7 的 action 清單會 stale —— #4 在 `05` 早已完成卻仍標 High，CH-003 才發現 | 追蹤清單本來就會漂移；重點是**定期跨來源比對**而非要求它永遠準確 | 每 5–10 個 phase 跑一次 `/status-audit`。若同類 stale 再出現 2 次以上，代表 closeout 沒有回填 `15`，那要改流程不是改清單 |
| 資料模型分散在 `02a` 與 `11`/`12`/`13`/`17` 五份文件 | **有意識選擇**（CH-003）：共用實體集中以符合 guardrail 3，模組實體貼近來源表單。全收進 `02a` 會讓它膨脹到 25KB+ 且模組文件殘缺 | 若 `02a` §0 索引開始與實際不同步 2 次以上 —— 那代表索引沒有機械強制，該寫成 lint detector |

> **這一節很重要。** 沒有它的話，同一個問題會被反覆「發現」，
> 每次都花時間分析一遍才想起來「喔對這個我們決定不修」。
