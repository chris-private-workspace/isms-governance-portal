# BACKLOG — 待辦 / 未決事項單一來源

**Purpose**: 所有 carryover AD、pending 決策、下個 phase 候選的**唯一權威清單**。

**Created**: 2026-08-07
**Last Modified**: 2026-08-10
**Status**: Active

> ⚠️ **這是待辦事項的單一來源。**
> 待辦**不可以**出現在 `CLAUDE.md` 的表格格、`MEMORY.md` 條目、或散落在各個 retrospective 裡。
> 那正是導航檔膨脹的路徑。

> 🔎 **最新跨來源審計：2026-08-10（#2，`bf3133e`）—— 5 條漂移（AD-7 ~ AD-11），
> 全部由 W03 closeout 造成，其中 3 條就在本檔**（見
> [`STATUS_AUDIT.md`](./STATUS_AUDIT.md) §2.7）。**✅ 五條已於 2026-08-10 同日全數修正。**

> **本檔回答「有什麼工作」，不回答「先做哪個」。**
> 順序層 [`ROADMAP.md`](./ROADMAP.md) **已於 2026-08-10 啟用**（CH-016）——
> 啟用當時本檔 §Open 達 48 條，超過「讀完仍不知道下一步」的門檻（**現為 56 條**，2026-08-10 W04 closeout）。
> 它**只放順序 + 前置條件，細節一律 link 回這裡**。
> ⚠️ **兩份都存在，收尾要同時改兩處** —— 只改一處就是下一次審計的漂移發現。

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
| AD-ThrottleEfficacy-1 | **`CH-017` 的節流閘尚未被證明會擋任何東西** —— 規則寫進 `task-workflow.md` §Step 0.0 + hook 已上，但那只證明「寫進去了、預算沒爆、JSON 合法」。依 `AD-NegativeGate-1`，宣稱會擋東西的機制需要一個**被它擋住**的案例 | CH-017 | 🟡 P1 | 驗證點是**下一次助手提議「順手修一下 X」而被擋回 BACKLOG**。⛔ 量法要具體，不要用感覺：**下個 phase 收尾時數該 phase 產生的治理／工具 CH 數**（配額是 1）。⚠️ 這條本身也是治理待辦 —— 若它變成又一輪工具建設，那就是規則失效的證據而非成功 |
| AD-RegisterUpkeep-1 | **三份 living 追蹤文件的維護沒有任何機械檢查** —— `ROADMAP.md` · `RISK_REGISTER.md` · `DEFERRED_REGISTER.md` 於 2026-08-10 首次填入（CH-016）。在此之前它們空了 3 天、跨 2 個 phase 與 15 個 CH，**沒有任何一次收尾察覺**。填完之後同一個失效模式仍然存在：停更兩個月不會有東西叫 | CH-016 | 🟡 P1 | `check_status_markers.py` 掃的是三軌 pre-doc 的 `status:`，不掃這三份。可行守衛：detector 比對 `Last Reviewed:` 與最近一次 phase closeout 的日期，落後 N 個 phase 即 fail。⚠️ **不要做成「檔案有沒有被改過」** —— 那會被一次 typo 修正騙過去 |
| AD-CheckNameCoupling-1 | **workflow 的 `job.name:` 從 2026-08-10 起是 branch protection 的一部分，而沒有任何東西在看** —— 六個 required context 有五個是中文含 em dash 與全形括號（`憑證外洩 — gitleaks（全歷史）`），比對是逐字的。改一個字 → 所有 PR 卡在等一個永遠不出現的 context，**錯誤訊息不會說明原因** | CH-015 | 🟡 P1 | branch protection **不在版控**，所以這種漂移連 detector 都寫不了（本次 AD-5 就是靠人工審計才發現）。可行守衛：`ci.yml` 加一個 job 用 `gh api` 比對「required contexts ⊆ 本次 workflow 實際產生的 check name」——但它自己也得是 required 才有意義，形成先有雞先有蛋。**現階段的實際保護是本條 AD + `CH-015` 的 load-bearing 段落** |
| AD-DAST-1 | **DAST 從來就不存在** —— `security-scan.yml` 四個 job 是 `secret-scan` / `dependency-scan` / `static-analysis` / `container-scan`，沒有 DAST；但 `04:71` 與 `07:50` 都要求它。⚠️ **私有 VNet 讓它更難補**：infra team 已確認一定接公司 private VNet，而 GitHub 託管 runner 在公網上，接不到只存在私有網路的 staging | Azure 資源盤點 2026-08-08 | 🟡 P1 | 與 `AD-SecScan-1` 同源但**不同缺口**（那三個是有 job 但 skip，這個是根本沒 job）。補法需 VNet 內 self-hosted runner 或等價路徑 —— **M0 規劃 CI 時一併決定**，部署後才發現代價高得多 |
| AD-SecScan-1 | ~~SCA / SAST / 容器掃描是 skip 不是 clean~~ → **W01 部分關閉**：三者現在真的執行（SCA `npm audit --audit-level=low` · SAST `Ran 462 rules on 47 files: 0 findings` · trivy `Detected config files num=2`）。~~⚠️ 剩餘缺口：Dockerfile 從未被 build 過~~ → **CH-013 關閉該項**（`image-smoke.yml` 每個 PR build 兩個 image）。⚠️ **剩餘缺口只剩 DAST 無 job** | CH-006 → W01 → CH-013 | 🟡 P1 | **仍不可視為關閉** —— guardrail 7 要求 SCA/SAST/DAST 三者，DAST 見 `AD-DAST-1`。完全關閉條件現在**只剩 DAST 有 job** |
| AD-SecDoDAutomation-1 | **`16` 的 28 點 secure-development DoD 沒有任何自動化檢查** —— `07:31` 的 M0 DoD 明文要求 "plus the **automated** secure-development DoD checks (`16`)"；CLAUDE.md guardrail 7 亦要求「每個 story 必須通過 28 點」。grep `scripts/` + `.github/` 對 `16-secure-development-dod` / `28-point` / `28 點` **零命中** —— 今天完全靠人記得 | STATUS_AUDIT 2026-08-10（AD-4）| 🟡 P1 | ⚠️ **在此之前這個缺口沒有任何 AD 在追蹤**，`AD-SecScan-1` 只涵蓋 SCA/SAST/容器掃描，兩者不重疊。✅ **分類已完成**（2026-08-10）→ [`09-analysis/secure-dev-dod-automation-classification-20260810.md`](../09-analysis/secure-dev-dod-automation-classification-20260810.md)：**A 已覆蓋 4+2 · B 今天可做 3+2 · C 無標的 7 · D 不可機械化 5 · N 需拍板 5**。⛔ **實作未做** —— 下一步是 B 類三點（#17 seed 檢查 · #10 瀏覽器儲存 · #25 危險 sink）。⛔ M0 收尾不得逕行打勾；**N 類五點需要一次責任邊界拍板**（見報告 §需要拍板的）|
| AD-HelmetSilentOption-1 | ⭐ **傳一個不存在的 helmet 選項不會報錯，會靜默關掉一個預設開啟的保護**。CH-012 實測：`helmet()` → `X-Powered-By` 不存在；**`helmet({xPoweredBy:false})` → `X-Powered-By: Express`**（`xPoweredBy` 不是 helmet 的選項名，它的是 `hidePoweredBy`）。W01 出貨的就是中間那個 | CH-012 | 🟡 P1 | 這是 `AD-NegativeGate-1` 形狀的**函式庫層版本**，比自己寫的設定更難察覺 —— 連「選項名不存在」都不會被告知。`security.spec.ts` 現在會對這個錯誤失敗。通則：**任何以物件傳選項的安全中介層，都要有一條在 wire 上驗證的斷言**，不能只讀設定 |
| AD-EslintSettingsClaim-1 | **`eslint.config.mjs:110-114` 的註解在 ESLint 10 下重現不出來** —— 該註解稱「`settings` 掛在有 `files` 的區塊會使 `boundaries/elements` 為空」，CH-012 實測加上 `files: ['apps/**/*.ts']` 後，從 repo 根與從 workspace cwd **兩種呼叫規則都照樣生效** | CH-012 | 🟢 P2 | ⚠️ **刻意不改那段註解** —— 只知道「試的那個形狀不會失效」，不知道「W01 當時是哪個形狀」。改掉等於用猜測取代紀錄。解法：下次動 eslint 設定時順手重現一次，確認後再改寫或刪除 |
| AD-NegativeGate-1 | ⭐ **「設定型強制力靜默失效」W01 一個 phase 內出現 5 次** —— boundaries 規則六種設定失效方式全部表現為 lint 全綠 · 三個掃描 job success 卻掃 0 個目標 · build 成功但產物起不到 · helmet `xPoweredBy:false` 對 Express 無效 · CI 跑 `test` 不是 `test:cov` 導致 45% 覆蓋率一路綠。共同結構：**設定損壞時不會報錯，而是安靜地什麼都不做**，外層 EXIT=0 讀起來像通過 | W01 | 🔴 **P0 候選** | 依 `.claude/rules/README.md` 強度階梯，同形狀 ≥3 次應改結構性解法。提議：**每個宣稱會「擋住某件事」的機制，必須附一個會被它擋住的常駐負面案例，且該案例在 CI 裡被執行**。**CH-012 交付 3 個**（boundaries fixture + `lint:negative` · i18n parity 雙向 · 安全標頭逐條）。**CH-013 交付第 4 個**：build 產物真的能啟動（`image-smoke.yml` + `scripts/smoke-probe.mjs`，4 項元驗證）。**W02 交付第 5 個**：RLS 真的在擋（policy 中性化為 `USING(true)` → 20 個整合測試紅 14）+ 旁路 detector（`scripts/assert-no-scope-bypass.mjs`，兩種弄壞法各驗一次）。**W03 交付第 6 個**：產物在 `NODE_ENV=production` 下**必須拒絕啟動且理由正確**（`image-smoke.yml`，run `31371191341` 輸出 `✅ production 啟動被拒絕（exit 1）`）—— 幾乎免費，**行為本來就在，只是從來沒有人以部署時的組態跑過它**。⭐ **W04 發現第 7 個形狀，但刻意沒有交付對應的常駐案例**：缺 `GRANT USAGE ON SCHEMA public` 時**每個端點回 500 而全部 gate 綠**（Day 3 首次探測），根因是 `isms_test` 從 template1 免費繼承該權限、`isms_dev` 不會 —— **兩個環境各自的負面案例都會過，因為它們各自在自己的環境裡是對的**。這是本條規則的第二個邊界（第一個是 `AD-OpensslClaim-1`）：**常駐負面案例對「兩個環境不對等」無效** → 解法歸 `AD-DbBuildPathParity-1`。**剩餘 1 個仍無覆蓋**：掃描 job 真的掃到 N>0（要 parse job log，工具升版即壞）。**本條不關閉**。⚠️ **本列是實例清單的唯一權威，其餘文件只 link 不複製計數** —— 過去 `RISK_REGISTER`/`ROADMAP` 各寫一次 `5/5`，W03 交付第 6 個時兩處都沒跟上（審計 AD-8）。且該分數形式本身是錯的：**已交付 6 個**與 **W01 五個形狀中仍有 1 個無覆蓋**是兩個獨立的數 ⚠️ CH-013 順帶量到這條規則的**邊界**：元驗證 3（拿掉 openssl）證明有些缺陷**不造成可觀測故障**，負面案例對它們無效 —— 見 `AD-OpensslClaim-1`。⭐ **W02 改了結構而非再寫一次紀律**：detector 的 self-test **不在旗標後面**，每次執行都跑 —— 同形狀第 3 次不應該再靠「記得跑」 |
| AD-GrepAssertion-1 | ⭐⭐ **W03 又犯 3 次，總計 ≥ 10 —— 且三次都在同一個 session 內**（`cmd 2>&1 \| tail -N; echo $?` 抓到的是 `tail` 的退出碼，其中一次把 **type-check 失敗讀成通過**）。依 `.claude/rules/README.md` 強度階梯，「**同一個 session 內**被違反」是**第 4 級**（`UserPromptSubmit` hook 每回合注入）的判準 —— 那是「中途忘了」不是「不知道」，**在規則檔裡再寫一次沒有用**。⚠️ 但 hook 每回合都付 context 成本且 CH-017 才剛裝一個 → **W03 刻意不當場實作**（節流閘 Step 0.0），由使用者排序。↓ 以下為原始條目 ↓ **拿一段為人類排版的文字去做機器判斷，W02 壞了 2 次** —— (a) `grep -c "^\[warn\]"` 因 prettier 的 ANSI 色碼永不匹配，**0 命中被讀成 format clean 並寫進 commit message 與 PR 描述**；(b) `image-smoke.yml` grep `super=f bypassrls=f`，但 `\|\|` 串接布林得到 `true`/`false` → 對一個正確的受限角色誤擋（PR #25 run `31321090681`）。**(b) 從未以 workflow 裡的形式被跑過，也從來沒有負面案例** | W02 Day 4 | 🟡 P1 | 修法已套用於 (b)：判斷移進 SQL（`count(*) ... AND NOT rolsuper`），本機驗兩個方向（受限→1 過 · superuser→0 擋）。通則：**斷言用退出碼或結構化資料（`--json` / SQL 述詞），不 grep 格式化輸出**；若非 grep 不可，必須有一個「應該被抓到」的負面案例證明 pattern 會匹配 |
| AD-CalibrationMetric-1 | ⭐ **`actual` 欄一直在混裝兩種量，所以乘數不可能收斂** —— 三個 phase 的牆鐘跨度 vs 登記值：W01 `4h27m` / ~5.0 hr ✅ · W02 **`8h10m` / ~12.1 hr ❌** · W03 `~4h20m` / ~4.3 hr ✅。**W02 那列算術上不可能** —— 逐項加總大於工作實際發生的窗口，循序執行做不到，故它是「若由人手做要多久」的估計而非量測 | W03 | 🟡 P1 | 用一致的牆鐘定義重算：W01 **0.35** · W02 **0.75** · W03 **0.34** —— 比原本 0.35 / 1.10 清楚得多。提議定義 `actual` = **branch base commit → closeout commit 的牆鐘跨度**：`git log` 機械導出、含間隙成本、**不依賴 AI 有一個鐘**。⚠️ 代價明說：含閒置（W02 有 3h17m 的 CI 修復間隔），系統性高估專注工時 —— 但**一個一致的高估可被乘數吸收，混裝的兩種量不行**。⛔ **拍板後 `AD-TimeTracking-1`/`-2` 應一併結案**：它們要求的資料在目前執行模式下不存在，繼續要求只會每個 phase 記一次「這次也沒做到」 |
| AD-ChecklistTickDrift-1 | **W02 的 Day 4 checklist 整段從未被勾** —— `W02-.../checklist.md:276-283` 八項全是 `[ ]`，但工作**確實做了**（`CALIBRATION-MATRIX.md` 有 spike 那行、`MEMORY.md` 有 W02 指標、`decision-form.md` OQ-3 已拍板、retrospective 存在）。W03 closeout 後同步 main 時順路發現 | W03 → post-merge | 🟢 P2 | ⚠️ **方向與 `AD-StaleRecordRef-1` 相反**：那條是「記錄說做了但其實沒有」，這條是「做了但記錄說沒有」——**後者讓 checklist 失去它唯一的功能**（retro 時比對「計畫了什麼 vs 出貨了什麼」）。`check_status_markers.py` 掃的是 `status:` frontmatter，**不掃勾選狀態**。候選守衛：phase 資料夾 `status: closed` 時，checklist 若仍有 `[ ]` 且沒有 🚧 標記 → fail。⛔ **不要自動勾** —— 勾選是「我驗過這項的 DoD」的宣告，代勾等於偽造證據 |
| AD-JestFileOrder-1 | ⭐ **跨 suite 的資料庫污染是順序相依的，而順序本機與 CI 不同** —— jest 冷快取依檔案大小排序、暖快取依上次執行時間。PR #31：`policy.int.spec.ts`（第一個會**寫入**的 suite）在 CI 先跑，本機後跑 → **同一個 commit 本機綠、CI 紅**。⚠️ 軟刪除的清理**擋不住沒有 `retiredAt` 過濾的查詢**，所以修法在自己的 suite 裡看起來有效 | W03 → PR #31 CI | 🟡 P1 | 真正的缺陷在**斷言**：`toEqual([<單一 title>])` 除了隔離還斷言了「沒有其他 SG1 列」——**fixture 記帳，不是隔離性質**，而測試名稱從沒宣稱過它。已改為斷言測試名稱一直在宣稱的事。**通則：共用可變資料庫的整合測試，斷言必須是順序無關的性質，不是精確列表。** 候選守衛：`--randomize` 常態化跑順序，讓順序相依當場暴露而不是等 CI |
| AD-DbBuildPathParity-1 | ⭐⭐ **兩條建庫路徑產生的 schema 權限不同，而只有一條被測試過** —— `int-global-setup.js` 用 `CREATE DATABASE`（從 template1 複製，`public` schema 帶內建 `GRANT USAGE TO PUBLIC`），`prisma migrate reset` 則是 `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`（**ACL 為 null，只有 owner 有權限**）。W04 Day 3 首次探測即 500：`permission denied for schema public` 42501。**該權限從未被本 repo 的任何東西授予過** —— 它是繼承的，而被測試的恰好是繼承到的那條路徑 | W04 Day 3 | 🟡 P1 | ✅ **已修**（`20260810215500_grant_schema_usage`，`GRANT USAGE` 不給 `CREATE`）。⛔ **但通則未關**：`isms_test` 每次重建都綠，**證明不了 `isms_dev` 或任何非 template 路徑可用** —— 這是 `AD-DevDbDrift-1` / `AD-NegativeGate-1` 的第三個變體（**綠燈的涵蓋範圍比讀者以為的窄**）。候選守衛：int 套件加一個「以 app role 連線斷言 `has_schema_privilege(...,'USAGE')`」的前提檢查，比照現有的 `rolsuper/rolbypassrls` 斷言 —— 那條斷言的存在正是同一個教訓的上一次 |
| AD-MigrationChecksum-1 | ⭐ **`applied=true` 不代表「套用的是同一份內容」** —— W04 Day 2 撞到：`prisma migrate dev` 拒絕生成，因為 `20260809075152_entity_scope_spike` 的 DB checksum（`ac8d1b35…`）與檔案（`a5eea1df…`）不符。根因是 W02 **先 `migrate dev` 套用、再手動編輯**加入 RLS/GRANT/trigger；後兩個 migration 相符，表示流程之後已改。⚠️ **非 CRLF、非 git 改動** —— 兩者都排除過 | W04 Day 2 | 🟡 P1 | ⭐ **這是 `AD-DevDbDrift-1` 的盲點**：那條的 Day-0 檢查驗「有沒有套用」，**沒驗「套用的是不是同一份內容」**，所以它在 W04 Day 0 回報乾淨而問題仍在。提議：把 Day-0 的 `D-devdb` 擴充為**比對 `_prisma_migrations.checksum` 與檔案的 sha256**，不只比對目錄清單。⛔ 處置需**破壞性操作**（`migrate reset`）—— 且 Prisma 有 AI 專用安全閘會擋，**不接受先前的問答作為同意** |
| AD-DevDbDrift-1 | **`isms_dev` 落後兩天而沒有任何東西察覺** —— W03 Day 3 clean restart 時才發現 `20260810134319_governed_extensions` 從未套用到開發者的資料庫。int 測試每次**重建**自己的 `isms_test`，所以整個 Day 2-3「int 全綠」**不涵蓋「開發者的資料庫可用」** | W03 | 🟢 P2 | 兩個資料庫只有其中一個會自我修復，而綠的是那一個。提議：啟動時比對 `_prisma_migrations` 的 head 與 `prisma/migrations/` 最新目錄，落後即 **warn 不是 fail**（fail 會擋住正在寫 migration 的人）。⚠️ 這是 `AD-NegativeGate-1` 的變體：**不是設定靜默失效，是綠燈的範圍比讀者以為的窄** |
| AD-ExtensionQueryCost-1 | **ADR-0005 的可證偽條件 #1（trigger 每寫入成本 > 5ms）未量** —— 今天 `policies` 2 列、catalog 4 列，`EXPLAIN` 量不出東西。同時可證偽條件 #2（跨記錄過濾擴充欄位）也未量，JSONB GIN 索引**刻意未建**（現在建是 YAGNI）| W03 | 🟢 P2 | 與 `AD-ScopeFnCost-1` 同一類（成本類可證偽條件無法在空資料庫上驗），可一併在 M1 有真實資料量時處理。⛔ **不要因為「未量」就先建索引** —— design note §4 已明記解封條件是「M1 有真實查詢需求」|
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
| AD-AllowlistCountClaim-1 | **`scripts/assert-no-scope-bypass.mjs:20` 的 docstring 說 "The allowlist is **four** entries"，實測 `3 allowlisted`** —— `ALLOW` 有 3 個 Map 條目、6 個 file-rule 配對，**沒有一種數法得到 4**。W04 Day-0 跑 `lint:negative` 時發現（輸出 `17 檔, 0 bypass, 3 allowlisted`）| W04 Day 0 | 🟢 P2 | ⛔ **刻意不當場改** —— 與 `AD-EslintSettingsClaim-1` / `AD-OpensslClaim-1` **同一個先例**：只知道「今天是 3」，不知道「W02 當時是幾個」，改掉等於用猜測取代紀錄。⚠️ 這條的特殊之處：**那段 docstring 正在說明「每加一筆就是保證不成立的又一個地方」** —— 一段講 allowlist 紀律的文字，自己的計數是錯的。解法：下次動該 detector 時查 W02 的 commit 確認原始數字，再改寫或刪除 |
| AD-TrivyFullImage-1 | **trivy 仍只掃 base image，不掃 build 出來的完整 image** —— `security-scan.yml:286-291` 明寫此取捨與缺口（`apt-get install` 進去的套件不被覆蓋）。CH-013 現在**會 build 出兩個 image**，餵給 trivy 的路徑首次存在 | CH-013 | 🟡 P1 | 使用者 2026-08-09 拍板**本次不做**：第一次掃完整 image 會涵蓋應用層 `node_modules`，很可能噴出一批現存 findings，需要 `security-scan.yml:13-37` 明訂的分流窗口五步 —— 混進 CH-013 會讓它收不掉 |
| AD-TrivyExempt-1 | **`libssl3` 六條豁免於 2026-09-07 到期** —— distroless base 的 OpenSSL（CVE-2026-31789 CRITICAL 等）。Debian 已出 `3.0.19-1~deb12u2`，distroless 尚未重建 | W01 | 🟡 P1 | 到期即自動變紅（trivy `expired_at`，無需有人記得）。到期時：重拉 base 重掃 → 已重建就刪掉 `.trivyignore.yaml`；未重建則**逐條重新分流**，不可靜靜延期 |
| AD-IaCEvidence-1 | **IaC 掃描義務已移交 infra team —— 本專案沒有 IaC 可掃**。infra 建立全部 Azure 資源（2026-08-08 確認）。`07:31` M0 DoD「IaC skeleton scanned」與 `04:73`「apply 前掃描」雙雙失去標的。**義務未消失，只是換手** | CH-010 | 🟡 P1 | ⛔ M0 收尾**不得**逕行打勾或標 N/A —— 二選一：引用 infra 掃描證據，或明記「由內部第三方營運」。同時擴大 Entity Zero 證據缺口（5→9 項）。ADR-0011「IaC tool deferred to CH-010」的答案＝本專案不選（CH-010 已記錄）。**仍未關閉：答案有了，證據沒有** —— PAR 第 7 點已向 RIT 索取 |
| AD-WebCoverage-1 | **`apps/web` 的覆蓋率不受任何門檻約束** —— W01 Day 3 把 `test:cov` 接進 CI 時只涵蓋 `apps/api`（vitest 需另裝 `@vitest/coverage-v8`，且 `page.tsx` 尚無元件測試，今天開啟只會逼出一個「低到能過」的門檻）。約束 5 的 ≥80% 目前只對後端成立 | W01 | 🟡 P1 | 與其設一個假門檻不如記在這裡。解法：裝 `@vitest/coverage-v8` + jsdom/testing-library，替 `page.tsx` 補元件測試（三個渲染分支已在 Day 3 手動驗過，正好是測試的規格），再把 web 納入 CI 的 `test:cov` |
| AD-CovThreshold-1 | **`apps/api` 的 branches 門檻由 80 降為 70**（`jest.config.js`）—— `emitDecoratorMetadata` 每個被裝飾的建構子／回傳型別都會 emit 一個測試到不了的三元分支（lcov 佐證 `BRDA:31,0,1,0`），真實上限 78.57%。**不是放寬品質要求，是移除一個沒有正確做法能通過的 gate** | W01 | 🟢 P2 | statements / functions / lines 維持 80（現況皆 100%）。再收緊條件寫在 `jest.config.js` 的區塊註解裡：Nest DI 不再需要 reflect-metadata，或該類分支變成可排除時 |
| AD-LintOutput-1 | **`run_all.py:80` 失敗時只保留 detector 輸出的最後一行**，而那通常是提示語不是違規清單 —— CI 失敗訊息無法診斷 | CH-006 | 🟢 P2 | 目前用 workflow 的 `--verbose` 繞過。同型再現 → 改成 `returncode != 0` 時保留完整輸出 |
| AD-Placeholder-1 | ⭐ **「模板佔位符未與本專案對齊」已發生 6 次**（`AD-RuleBoundary-1` / `AD-CssToken-1` / `AD-DocIndex-1` / ADR 檔名 / `CLAUDE.md` byte 預算 / `ci.yml`）| CH-006 | 🟡 P1 | **CH-007 只關掉第 6 類**（actionlint + 棘輪 detector）。⚠️ 原提案的「掃全 repo 佔位符」**已證實不可行** —— 512 命中約 500 個是合法慣例語彙（`W{NN}` / `NNN` / `<slug>`），會噴在自己的規則文件上。其餘四類需語義理解，`lint-detector-authoring.md:22` 明訂寫不出可靠 detector。**W01 關掉第 7 個實例**（`scope-boundaries.md` 的範疇表與 import 矩陣，Day-0 `D-boundaries-matrix` 發現）✅。**本條仍保持開啟** |
| AD-ActionsNode-1 | `actions/checkout@v4` 用 Node 20，GitHub 已標 deprecated 並強制跑在 Node 24（4 個 security-scan job 皆有此 annotation） | CH-006 | 🟢 P2 | 現在只是警告；GitHub 移除 Node 20 支援時會直接壞掉 |
| AD-StaleRecordRef-1 | **跨記錄的「編號引用」沒有任何 detector 在看** —— `ADR-0010:73` 指向 `CH-009`，而 CH-009 早已改派給 track-classification fix；同一份 ADR 的 §相關 在 2026-08-08 記了那次改派，73 行卻沒跟著改。`check_path_references.py` 驗的是**路徑**，`CH-NNN` / `ADR-NNNN` / `AD-Xxx-N` 這類引用不在射程內 | CH-010 → **再現 CH-016** | 🟡 **P1**（升級）| 與 `AD-ChNumber-1` 相鄰但不同：那條講**怎麼選號**，這條講**號被改派後舊引用不會有人叫**。⭐ **升級條件已成立** —— 審計 AD-6 原本被判為「detector 分不出未追蹤檔」，CH-016 量測後**推翻**：9 處 `CH-010` 引用中**只有 1 處是 markdown 連結**（`0010:187`，與檔案同時建立所以 `check_doc_links.py` 從沒機會開火），其餘 8 處是 inline code `` `CH-010` `` —— **那不是路徑，是編號**，兩個 detector 都不在射程內。⛔ **實作前必須先拍板一件事**：`AD-ChNumber-1` 明訂**前向引用預留編號是合法的**（CH-010 正是如此），所以 detector 不能單純要求「編號必須解析得到」—— 需要一個「預留 vs 失效」的判準（候選：前向引用要在 BACKLOG 或 ROADMAP 有對應列）|

**優先度判準**：

| 級別 | 判準 |
|------|------|
| 🔴 P0 | 正在傷害使用者 / 阻擋其他工作 / 是已知的 Potemkin |
| 🟡 P1 | 有明確價值，但可以等 |
| 🟢 P2 | 想做，沒有明確觸發條件 |
| ⚪ P3 | 記著，可能永遠不做（誠實一點，不要假裝會做）|

> **定期誠實化**：P3 的東西放超過 10 個 phase 還沒動 → 刪掉它。
> 一份沒人相信的待辦清單比沒有清單更糟。

> 📋 **跨來源審計 2026-08-10（首次）—— 6 個漂移發現（AD-1 ~ AD-6）**：
> [`STATUS_AUDIT.md`](./STATUS_AUDIT.md) §2.7。**細節不複製到這裡**（PROCESS R7 / STATUS_AUDIT §5）。
> AD-4 揭露的 M0 缺口已登記為 `AD-SecDoDAutomation-1`（本表）——
> 審計當下它是六條裡唯一**沒有任何 AD 在追蹤**的一條。

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
| **W02** | 2026-08-09 | **Entity-scoping RLS spike** — MERGED (PR #25, `02dffef`)，`closed`。第一張業務表與它的隔離同一個 migration；**約束 8 四個範疇測試在應用層與資料庫層各自成立**（20 個整合測試，8 個完全不經應用層）。**推翻 Day-0 一項承重結論**：fail-closed 只在從未被 scope 過的連線上免費 → 補 `app_entity_scope()`。**裁決 ADR-0001 §可證偽條件 #1 未觸發** → ADR-0004 拍板，關 OQ-3 | `docs/01-planning/W02-entity-scope-rls-spike/retrospective.md` · `docs/03-implementation/changes/CH-014-w02-entity-scope-rls.md` · `docs/02-architecture/design-notes/W02-entity-scope-rls.md` |
| — | 2026-08-10 | **CH-015**：六個 CI check 設為 required（`strict: false`）—— 在此之前 `required_status_checks` 整個 key 缺席，全綠擋不住任何東西。關 `AD-CIRequired-1`（解封條件成立兩次未被察覺）。✅ **擋與放兩個方向都已觀測**（PR #29：check 未完成 → `BLOCKED`，六綠後 → `CLEAN`，兩時點 `mergeable` 皆為 `MERGEABLE`）| `docs/03-implementation/changes/CH-015-required-status-checks.md` |
| — | 2026-08-10 | **CH-017**：`task-workflow.md` §Step 0.0 節流閘 + hook 擴充 —— **順路發現的問題預設記進 BACKLOG，不當場開 CH**（例外：阻塞／安全／使用者要求），每 phase 最多 1 個治理工具 CH。⭐ 根因：rolling planning **只綁 Phase 軌**，Change 軌無節流。實據：第 4 天產品 911 行 vs 工具 3,287 vs 文件 20,909，16 個 CH 裡 0 個產品功能 | `docs/03-implementation/changes/CH-017-discovery-throttle.md` |
| — | 2026-08-10 | **CH-016**：`ROADMAP` / `RISK_REGISTER` / `DEFERRED_REGISTER` 三份**從未被使用**的權威來源首次填入。關審計 AD-2 / AD-3。⭐ 與 CH-015 **同一個根因第 4、5 次**（解封條件寫在沒人回頭看的地方）；`RISK_REGISTER` 兼作 Entity Zero 的**過渡承載體**，四條標記待 M4/M5 遷入平台自己的系統。順帶量到 **M1 的 DoD 依賴尚未拍板的 ADR-0005**（`07:32`）| `docs/03-implementation/changes/CH-016-activate-tracking-registers.md` |
| **W04** | 2026-08-10 | **M1 slice 1 — the shape every table copies** — ⏳ PR-pending，`closed`。ADR-0012 拍板（`users` **全域無 `org_entity_id`** —— 範疇是 role assignment 的屬性不是人的）+ `Policy` base field 缺口 6→1 + 伺服器端發號。⭐ 改的是 `multi-tenant-data.md` 的**分類本身**（identity 立為第三類），不是在例外清單加一列。⭐ 元驗證產出**新知識**：counter 的 RLS 失效讓 W03 的 oracle 防護**重新變得可區分** —— W04 的發號路徑成了 W03 那個保證的一部分。🚩 Day 3 首次探測即 500（`permission denied for schema public`）而**全部 gate 綠** → 第 7 個負面 gate + `AD-DbBuildPathParity-1`。關 `AD-UserEntitySpec-1`（`User` 半邊；`Role`/`Permission` 改由 `02a` §0 + M4 承載）| `docs/01-planning/W04-m1-user-and-base-fields/retrospective.md` · `docs/03-implementation/changes/CH-019-w04-user-and-base-fields.md` · `docs/02-architecture/design-notes/W04-user-and-base-fields.md` |
| **W03** | 2026-08-10 | **Governed extension spike** — MERGED (PR #31, `b20f3f1`)，`closed`。ADR-0005 拍板（JSONB + entity-scoped catalog，**應用層 + DB trigger 雙層**）+ 平台第一個業務端點。⭐ **元驗證量到兩層是獨立的**：validator 中性化後，三個「database refuses」測試**仍然通過**。關 `AD-CacheControl-1` / `AD-ScopedClientDI-1` / `AD-ScopeConcurrency-1` + OQ-6 → **M1 前置清空**。CI 首航抓到「產物從來沒有以部署時的組態被執行過」→ 第 6 個負面 gate | `docs/01-planning/W03-governed-extension-spike/retrospective.md` · `docs/03-implementation/changes/CH-018-w03-governed-extensions.md` · `docs/02-architecture/design-notes/W03-governed-extensions.md` |

---

## §Pending Decisions（需要人來拍板的）

<!-- 不是「要做什麼」而是「要選哪個」的事項。 -->

| 決策 | 選項 | 卡在哪 | 誰決定 |
|------|------|-------|--------|
| ~~**中國跨境資料層級**~~ | — | ✅ **已消滅** —— 中國於 2026-08-08 移出範圍（`CH-008`），沒有中國邊界，`03` §Questions for Legal 的四個問題作廢。`AD-Decider-1` 一併關閉 | — |
| ~~**計算平台**~~ | — | ✅ **已拍板 2026-08-08 — Azure Container Apps**（[ADR-0011](../14-adr/0011-compute-platform.md)）。決定性證據是 `unified-operation-platform` 已在 ACA 上跑同一個 stack；「App Service 預設值已知」的論據在起草時**被自己推翻**（ACA 的 `*.azurecontainerapps.io` 同樣是平台預設）| — |
| 其餘 **3** 項開放決策（OQ-4/7/8）| 見 [`../decision-form.md`](../decision-form.md) | 各範疇 | 卡的是**證據不是決策者** —— OQ-4 需 M3 的稽核軌跡落點，OQ-7 需 spike，OQ-8 屬 Wave 3。~~OQ-3~~ 已於 2026-08-09 拍板（ADR-0004）· ~~OQ-6~~ 已於 2026-08-10 拍板（ADR-0005）|

---

## §Known Issues / Accepted Debt

<!-- 已知但**有意識決定不修**的東西。寫下來是為了不要重複發現它。 -->

| Issue | 為何不修 | 什麼條件下要重新考慮 |
|-------|---------|-------------------|
| `15` §7 的 action 清單會 stale —— #4 在 `05` 早已完成卻仍標 High，CH-003 才發現 | 追蹤清單本來就會漂移；重點是**定期跨來源比對**而非要求它永遠準確 | 每 5–10 個 phase 跑一次 `/status-audit`。若同類 stale 再出現 2 次以上，代表 closeout 沒有回填 `15`，那要改流程不是改清單 |
| 資料模型分散在 `02a` 與 `11`/`12`/`13`/`17` 五份文件 | **有意識選擇**（CH-003）：共用實體集中以符合 guardrail 3，模組實體貼近來源表單。全收進 `02a` 會讓它膨脹到 25KB+ 且模組文件殘缺 | 若 `02a` §0 索引開始與實際不同步 2 次以上 —— 那代表索引沒有機械強制，該寫成 lint detector |

> **這一節很重要。** 沒有它的話，同一個問題會被反覆「發現」，
> 每次都花時間分析一遍才想起來「喔對這個我們決定不修」。
