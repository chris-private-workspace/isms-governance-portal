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
| AD-DesignAlign-3 | `15` §7 #3：接受完整版 audit-issues 模組（推翻 W2-2 輕量決定）—— **會改資料模型** | `15` | 🔴 P0 | 必須先於 M1 |
| AD-DesignAlign-4 | `15` §7 #4：access management + legal hold 加進 `05` —— **會改基礎服務範圍** | `15` | 🔴 P0 | 必須先於 M1 |
| AD-DesignAlign-5 | `15` §7 #5：Risk programme 與 OS portfolio 加進模組計畫 | `15` | 🟡 P1 | |
| AD-DesignAlign-2 | `15` §7 #2：確認語言集與日本地位 —— i18n 從 M0 就要在位 | `15` | 🟡 P1 | |
| AD-DesignAlign-7 | `15` §7 #7：確認 ISMS profile 的 certifier-comment / company-reply 欄位是否保留 | `15` | 🟢 P2 | |
| AD-Mockup-2 | **`data.js` 不可原樣移植** —— 旗艦儀表板以**國家**為鍵，結構上無法容納 14 OpCo（新加坡 2 家、香港 2 家）。約束 6 的 STOP-and-ask | CH-002 | 🔴 P0 | 阻斷 M8 |
| AD-Mockup-3 | OpCo fixture 需重建：`opcos.js` 有 `RIN` 印度、缺 `RCN` 中國，與 `15` §1 完全相反；`Japan` 在 5 個檔案被當成營運實體 | CH-002 | 🔴 P0 | 移植前必做 |
| AD-Mockup-4 | 三種不相容的風險表示法並存（`risks.js` 的 `{imp,lik,inh}`、`riskRegister.js` 的純 `score`、`osServices.js` 的 RAG）。需決定 RM Report 註冊表與即時登記冊的關係 | CH-002 | 🔴 P0 | `15` §3.1 相關 |
| AD-Model-Vendor | `02a` §3 **完全沒有 Vendor / ExternalParty 實體**，但 `07` 已宣稱「defined in the model now」。`suppliers.js` 有 16 個欄位可依據 | CH-002 | 🔴 P0 | 與 `07` 的敘述矛盾 |
| AD-Model-AuditIssue | `auditIssues` enum 需放寬：grade 加 `Observation`、src 加 `Customer audit`、status 加 `Overdue`/`Accepted`、`clause` 需支援 **ISO 主文條款且可多值** | CH-002 | 🟡 P1 | 與 AD-DesignAlign-3 同批處理 |
| AD-Model-Gaps | `02a` 缺：business unit 是階層節點還是自由文字、治理機構（ISC/ITSC）核准者、報告排程、通知規則、Policy 的檔案 metadata / TOC / 版本陣列 | CH-002 | 🟡 P1 | 逐項決定，不要照抄樣本 |
| AD-Port-BFSI | 移植時須剝除金融業殘留：AML/CTF/制裁/對帳內容與 `juris` 的審慎監理機關。集中在 **Wave 1 的證明模組**檔案裡 | CH-002 | 🟡 P1 | `00` D3：technology & services |

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
| | | |

> **這一節很重要。** 沒有它的話，同一個問題會被反覆「發現」，
> 每次都花時間分析一遍才想起來「喔對這個我們決定不修」。
