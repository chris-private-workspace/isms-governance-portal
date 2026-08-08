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
| AD-CIRequired-1 | **CI 尚未設為 required status check** —— `required_status_checks` 仍是 `null`，所以綠燈不擋任何東西。`07:31` 的 M0 DoD 要求它 | CH-006 | 🟡 P1 | W01 M0 骨架建立後設。現在設 = 用沒有實質內容的 gate 擋住所有 PR |
| AD-DAST-1 | **DAST 從來就不存在** —— `security-scan.yml` 四個 job 是 `secret-scan` / `dependency-scan` / `static-analysis` / `container-scan`，沒有 DAST；但 `04:71` 與 `07:50` 都要求它。⚠️ **私有 VNet 讓它更難補**：infra team 已確認一定接公司 private VNet，而 GitHub 託管 runner 在公網上，接不到只存在私有網路的 staging | Azure 資源盤點 2026-08-08 | 🟡 P1 | 與 `AD-SecScan-1` 同源但**不同缺口**（那三個是有 job 但 skip，這個是根本沒 job）。補法需 VNet 內 self-hosted runner 或等價路徑 —— **M0 規劃 CI 時一併決定**，部署後才發現代價高得多 |
| AD-SecScan-1 | **SCA / SAST / 容器掃描是 skip 不是 clean** —— 首次 security-scan 只有 gitleaks 真的執行（9 commits, no leaks）。三者未經任何檢查，guardrail 7 尚未滿足 | CH-006 | 🟡 P1 | 需 `package.json`（W01 M0）。**容器掃描分項已被 ADR-0011 推進** —— ACA 要求 Dockerfile，M0 交出後該 job 就可執行。推進時**必須依 `security-scan.yml:19-25` 的五步次序** |
| AD-ImageBuild-1 | **沒有任何地方會 build 這兩個 Dockerfile** —— CI 的 trivy job **依設計只掃 base image、不 build**（`security-scan.yml:253` 明寫此取捨），本機 build 被公司 proxy 的 TLS 攔截擋住（容器內無公司 CA）。Dockerfile 的正確性要到**部署當天**才會被驗證 | W01 | 🟡 P1 | W01 已修過兩個只有 build 才會暴露的缺陷（缺 OpenSSL、`USER` 遺漏）—— 那是**碰巧**跑了一次 build 才發現的。M0 CI 定案時一併決定：加 build-only job（不推送），或接受並寫進部署 runbook 的前置風險 |
| AD-TrivyExempt-1 | **`libssl3` 六條豁免於 2026-09-07 到期** —— distroless base 的 OpenSSL（CVE-2026-31789 CRITICAL 等）。Debian 已出 `3.0.19-1~deb12u2`，distroless 尚未重建 | W01 | 🟡 P1 | 到期即自動變紅（trivy `expired_at`，無需有人記得）。到期時：重拉 base 重掃 → 已重建就刪掉 `.trivyignore.yaml`；未重建則**逐條重新分流**，不可靜靜延期 |
| AD-IaCEvidence-1 | **IaC 掃描義務已移交 infra team —— 本專案沒有 IaC 可掃**。infra 建立全部 Azure 資源（2026-08-08 確認）。`07:31` M0 DoD「IaC skeleton scanned」與 `04:73`「apply 前掃描」雙雙失去標的。**義務未消失，只是換手** | CH-010 前置 | 🟡 P1 | ⛔ M0 收尾**不得**逕行打勾或標 N/A —— 二選一：引用 infra 掃描證據，或明記「由內部第三方營運」。同時擴大 Entity Zero 證據缺口（5→9 項）。ADR-0011「IaC tool deferred to CH-010」的答案＝本專案不選 |
| AD-LintOutput-1 | **`run_all.py:80` 失敗時只保留 detector 輸出的最後一行**，而那通常是提示語不是違規清單 —— CI 失敗訊息無法診斷 | CH-006 | 🟢 P2 | 目前用 workflow 的 `--verbose` 繞過。同型再現 → 改成 `returncode != 0` 時保留完整輸出 |
| AD-Placeholder-1 | ⭐ **「模板佔位符未與本專案對齊」已發生 6 次**（`AD-RuleBoundary-1` / `AD-CssToken-1` / `AD-DocIndex-1` / ADR 檔名 / `CLAUDE.md` byte 預算 / `ci.yml`）| CH-006 | 🟡 P1 | **CH-007 只關掉第 6 類**（actionlint + 棘輪 detector）。⚠️ 原提案的「掃全 repo 佔位符」**已證實不可行** —— 512 命中約 500 個是合法慣例語彙（`W{NN}` / `NNN` / `<slug>`），會噴在自己的規則文件上。其餘四類需語義理解，`lint-detector-authoring.md:22` 明訂寫不出可靠 detector。**本條保持開啟** |
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
| — | 2026-08-08 | CH-009：修三軌分類在 pre-code 階段的失效 —— Change 判準加「既定設計」+ 兩條「不走軌」路徑；**修好 `PROCESS.md` §3.1 與 §4.1 對同一輸入的相反路由**；關 `AD-RuleBoundary-1`（ADR forcing-function 判準入 `14-adr/README.md`）| `docs/03-implementation/changes/CH-009-track-classification-fix/` |

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
