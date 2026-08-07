# BACKLOG — 待辦 / 未決事項單一來源

**Purpose**: 所有 carryover AD、pending 決策、下個 phase 候選的**唯一權威清單**。

**Created**: 2026-08-07
**Last Modified**: 2026-08-07
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
| AD-Residency-1 | 比較矩陣須對**所有**實體統一讀 `posture_snapshot`，否則中國（月快照）與其他 OpCo（即時）混用不同 as-at 時間，是誤導性視圖 | CH-001 | 🟡 P1 | M8 前確認；`02a` §7 已記 |
| AD-DesignAlign-5 | `15` §7 #5：**OS portfolio** 模組尚未規格化；Risk programme 的**實體已定義**（`02a` §3.1）但**螢幕未規格化** | `15` | 🟡 P1 | `02a` §0 已列為「未規格化，不得建置」 |
| AD-DesignAlign-2 | `15` §7 #2：確認語言集與日本地位 —— i18n 從 M0 就要在位 | `15` | 🟡 P1 | |
| AD-DesignAlign-7 | `15` §7 #7：確認 ISMS profile 的 certifier-comment / company-reply 欄位是否保留 | `15` | 🟢 P2 | |
| AD-Mockup-2 | **`data.js` 不可原樣移植** —— 旗艦儀表板以**國家**為鍵，結構上無法容納 14 OpCo（新加坡 2 家、香港 2 家）。約束 6 的 STOP-and-ask | CH-002 | 🔴 P0 | 阻斷 M8 |
| AD-Mockup-3 | OpCo fixture 需重建：`opcos.js` 有 `RIN` 印度、缺 `RCN` 中國，與 `15` §1 完全相反；`Japan` 在 5 個檔案被當成營運實體 | CH-002 | 🔴 P0 | 移植前必做 |
| AD-Model-Gaps | `02a` 待決欄位級缺口：business unit 是階層節點還是自由文字、治理機構（ISC/ITSC）能否作為核准者、報告排程、通知規則、Policy 的檔案 metadata / TOC / 版本陣列、OrgEntity 的 OpCo function 欄位 | CH-002 | 🟡 P1 | 全數列在 `02a` §0.1 與 §0「未規格化」表 |
| AD-RiskForm-1 | **風險表單實作的是另一套方法論**，不是欄位不足：僅 7 欄、**完全沒有 before/after 結構**、缺整條 asset→threat→vulnerability→CIA 鏈、`Owner` 是自由文字非 user 參照 | CH-004 | 🔴 P0 | `15` §4 已更新 |
| AD-Incident-1 | **事件表單完全沒有 `11` 要求的 restricted block**（violating acts / motives / disciplinary action / president view）—— 連同它的 CISO/HR 權限隔離與存取稽核一併缺席 | CH-004 | 🔴 P0 | 隱私控制，`11` §Access control 明訂 |
| AD-Nav-1 | **Wave 3 的 AI agent 是導航第一項**（自成 Intelligence 組，在旗艦儀表板之上）。Wave 1–2 會出現顯眼的死連結或空群組 | CH-004 | 🟡 P1 | 產品定位決策，尚未有人做過 |
| AD-Switcher-1 | 實體/角色切換器把兩個正交軸壓成 7 個預組合的扁平清單（含國旗）。`15` §5.1 要求 entity scope 疊在 role 之上 | CH-004 | 🟡 P1 | 14 OpCo × 6 角色無法用扁平清單 |
| AD-Auth-1 | 註冊畫面帶著 pre-`15` 詞彙：Entity 是 6 個國家（含 Japan）、Requested role 是 `Risk Owner / Control Owner / Auditor (read-only) / Regional Governance`——**都不是已確認的六角色** | CH-004 | 🟡 P1 | 是 `AccessRequest` 的自助入口，非裝飾 |
| AD-Nav-2 | 導航計數徽章（Assessments `5`、Incidents `2`）未在任何規格中定義：算什麼、誰的範疇、多久刷新 | CH-004 | 🟢 P2 | |
| AD-Port-BFSI | 移植時須剝除金融業殘留：AML/CTF/制裁/對帳內容與 `juris` 的審慎監理機關。**CH-004 已確認僅存在於 `data/*.js` 與 standalone prototype——markup 乾淨**，所以這是資料 fixture 工作，不是全庫掃描 | CH-002 | 🟢 P2 | 成本已下修（原 🟡 P1）|
| AD-RuleBoundary-1 | **ADR 撰寫時機與「文檔成長跟隨 runtime」的交界未定義**：`14-adr/README.md:31` 說 ADR 可無實作先寫，CLAUDE.md §禁止反模式禁止預寫規劃文件，仲裁答案只在 `memory/feedback_doc_growth_follows_runtime.md:45`（非 always-loaded）| —（ADR 規劃討論）| 🟢 P2 | 第 1 次違反，依 `.claude/rules/README.md` 強度階梯**不升級為規則**；再發生 1 次則在 `14-adr/README.md` 補判準行 |
| AD-CssToken-1 | **`mockup-fidelity.md:38` 紅線 7 在本專案是錯的**：它規定一律 `oklch(var(--token))`，但交付物 token 是 HEX（`styles/tokens.css:24` `--primary: #2A5BD7`）。`oklch(#2A5BD7)` 是無效 CSS 且**靜默失效**。同一缺陷在 playbook §4.2 Layer 3 | CH-005 | 🟡 P1 | ⚠️ **W01 前端第一頁之前必修**（一行）。CLAUDE.md 約束 6「不做色彩空間轉換」在本專案亦不適用 —— 那是模板帶來的通用警語 |
| AD-DocIndex-1 | **`docs/02-architecture/README.md` §核心設計文件 仍是未填模板**：列的 `00-vision.md` / `01-architecture.md` / `02-tech-stack-decisions.md` 全部不存在，實際是 `00-project-charter.md` 等 27 份。**五個 detector 全部抓不到** —— 那些幻影檔名是純表格文字不是連結 | CH-005 | 🟢 P2 | 使用者反映「文件很多不知從何看起」的直接成因 |
| AD-Decider-1 | **`03` §Questions for Legal 的四個問題仍無接觸途徑**：ADR-0006 已用最保守預設繞過（拓撲不受影響），但 `cross_border_max_tier` 因此鎖在最嚴 → 旗艦比較矩陣覆蓋 **13/14 OpCo** | CH-005 | 🟡 P1 | 放寬是設定變更非重架構。已向 **Regional ISO / Group CISO** 表面化（`03:137` 要求）記於 ADR-0006 §Consequences |

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

---

## §Pending Decisions（需要人來拍板的）

<!-- 不是「要做什麼」而是「要選哪個」的事項。 -->

| 決策 | 選項 | 卡在哪 | 誰決定 |
|------|------|-------|--------|
| **中國跨境資料層級**（→ ADR-0006）| T1 可出境 / 只有 `posture_rag` / 完全不可 | **M0、M1 全部** —— 拓撲決定資料庫在哪 | ⚠️ Legal / DPO；問題已備妥於 `03` §Questions for Legal |
| 其餘 7 項開放決策 | 見 [`../decision-form.md`](../decision-form.md) | 各範疇 | ⚠️ **全部未指定決策者** —— 這本身是第一個要解的問題 |

---

## §Known Issues / Accepted Debt

<!-- 已知但**有意識決定不修**的東西。寫下來是為了不要重複發現它。 -->

| Issue | 為何不修 | 什麼條件下要重新考慮 |
|-------|---------|-------------------|
| `15` §7 的 action 清單會 stale —— #4 在 `05` 早已完成卻仍標 High，CH-003 才發現 | 追蹤清單本來就會漂移；重點是**定期跨來源比對**而非要求它永遠準確 | 每 5–10 個 phase 跑一次 `/status-audit`。若同類 stale 再出現 2 次以上，代表 closeout 沒有回填 `15`，那要改流程不是改清單 |
| 資料模型分散在 `02a` 與 `11`/`12`/`13`/`17` 五份文件 | **有意識選擇**（CH-003）：共用實體集中以符合 guardrail 3，模組實體貼近來源表單。全收進 `02a` 會讓它膨脹到 25KB+ 且模組文件殘缺 | 若 `02a` §0 索引開始與實際不同步 2 次以上 —— 那代表索引沒有機械強制，該寫成 lint detector |

> **這一節很重要。** 沒有它的話，同一個問題會被反覆「發現」，
> 每次都花時間分析一遍才想起來「喔對這個我們決定不修」。
