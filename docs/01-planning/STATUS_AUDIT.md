---
artifact: status-audit-living
status: active
last_audit: 2026-08-10
---

# 全項目狀態審計（Status Audit）

**Purpose**: 跨來源的**點時間快照** —— 對照所有追蹤文件，揪出它們**彼此之間**的漂移。

**Category**: Planning / Living document
**Created**: 2026-08-07
**Last Modified**: 2026-08-10
**Status**: Active

> **Modification History**
> - 2026-08-10: Add audit #2 + AD-7–11 disposition — five drifts closed same day
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

> **一句話定位**：這份**不是第二個 backlog**。
> 使用者問「現在全項目最新狀況是什麼」→ 跑 `/status-audit` → 在 §2 加一個新快照 → 舊快照落 §3。

---

## 0. 為什麼需要跨來源（這是本檔存在的全部理由）

專案成熟之後會有**四到五份各自維護的追蹤文件**。每一份都是**單一視角**，
而且**看不見自己的 stale**：

| 失效模式 | 真實案例 |
|---|---|
| Backlog 看不見自己 stale | 同一個項目在同一份檔案的**兩個分區狀態相反**，兩處都有人維護過 |
| 風險登記停更沒人察覺 | 停更兩個月，期間每個 phase 都正常收尾 |
| Deferred 的解封條件過期 | 條件寫「等 X 可用」，X 早就可用了，但沒有人回頭翻 |
| 寫死日期的觸發條件過期 | re-escalation 死線過了 14 天，沒有任何東西會叫 |
| 三件套 `status` 收尾時漏翻 | 一次回填 21 個檔；期間盤點把已修好的 bug 判成「真 pending」 |

**只讀其中一份去回答「現在怎樣」必然不準。**
而這種對照**不能塞進任何一份被對照的文件裡** —— 那樣它就變成被對照對象的一部分。

---

## 1. 權威來源清單（掃描時缺一不可）

> **執行層在 `/status-audit` command**（實際 grep 寫法 / 交叉比對七問 / 輸出模板 / 常見誤判）。
> **本節只定義「哪幾份是權威來源」** —— 這是 repo 知識，沒有 AI 也讀得懂。
>
> **來源清單有變 → 改本節，同時改 command；程序細節有變 → 只改 command。**

| # | 來源 | 取什麼 |
|---|---|---|
| 1 | [`BACKLOG.md`](./BACKLOG.md) | 全部待辦 + 狀態 + 分區；**留意同一 ID 在不同分區狀態是否一致** |
| 2 | [`ROADMAP.md`](./ROADMAP.md) | 執行順序層有沒有收齊新項；已完成的有沒有標回去 |
| 3 | [`DEFERRED_REGISTER.md`](./DEFERRED_REGISTER.md) | 恢復條件 + **最後更新日期**（判停更）|
| 4 | [`RISK_REGISTER.md`](./RISK_REGISTER.md) | Active 風險 + **寫死的觸發條件有沒有過期未執行** |
| 5 | [`../14-adr/`](../14-adr/README.md) 全部 `**Status**:` | 有沒有 `Proposed` 未拍板；編號有沒有無解釋的空缺 |
| 6 | 三軌 pre-doc 的 `status:`（phase `plan.md` · Change `spec.md` · Bug `report.md`）| 哪些工作仍未收尾（**跑 `python scripts/lint/check_status_markers.py`** —— 它三軌都掃）|
| 7 | `docs/` 全部**非終態** `status:` | 補漏:**單檔 1-page 記錄不在腳本範圍內**，兄弟檔亦只在有欄位時才被比對 |
| 8 | [`../decision-form.md`](../decision-form.md) | Open question 的 Resolved / Open 比數 |

**補充掃描（揪真空白）**：`git status --short` + `git log --oneline -8` ·
code 內的 `TODO(` / `FIXME` / `HACK(` · 各 track 自己的 `TRACKER.md` ·
`git ls-files` 核對「文件裡被引用的檔」是否真的存在。

---

## 2. 最新快照 — 2026-08-10（#2，W03 收尾後）

**基準**：branch `main` · `bf3133e` · 工作樹 **clean**
**當前 active phase / change / bug = 0** —— W01 `closed_partial`、W02 `closed`、W03 `closed`，無 active
**本次 PR**：#31（`b20f3f1`）· #32（`bf3133e`）**皆經 `gh pr view` 驗證為 MERGED**，非採信回報

### 涵蓋聲明

**掃了**（§1 全部 8 個來源）：`BACKLOG.md`（逐行解析 §Open，非命中數）· `ROADMAP.md` ·
`DEFERRED_REGISTER.md` · `RISK_REGISTER.md` · `docs/14-adr/` 全部 `**Status**:` + `Glob` 核對檔案存在 ·
三軌 pre-doc（跑 `check_status_markers.py`）· `docs/` 全部非終態 `status:` · `decision-form.md`。
補充：`git log`（W01/W02/W03 全部 commit 時間戳）· `git status` · `apps/**` 的
`TODO(`/`FIXME`/`HACK(`（**0 命中**）· `security-scan.yml` job 清單 · `apps/web/src/i18n/` 存在性。

**沒掃到 / 不在範圍**：`docs/02-architecture/` 19 份設計文件的內文一致性（非追蹤來源）·
`reference/` 與 `docs/reference/`（刻意不在版控）· **M0 DoD 第 5 項的 TLS/憑證與管理埠
本次同樣未取得實據**（與上次審計相同，見 §2.10）· branch protection API（本次未重查，
上次審計後由 `CH-015` 設定且 PR #31/#32 實測擋與放皆正常）。

⚠️ **一個計數方法的自我修正**：第一次用 `-match 'CLOSED'` 統計得到 5 條，逐處讀後發現
**2 條是假陽性**（PowerShell `-match` 大小寫不敏感，撞到別處的 `status: closed`）。
改用大小寫敏感比對後為 3 條。**這是 `AD-GrepAssertion-1` 在本次審計自身的再現** ——
記在這裡是因為審計報告若用錯的計數方法，讀的人沒有辦法發現。

| 層級 | 數量 | 一句話 |
|---|---|---|
| 🔴 上線硬關卡 | **5** | **4 條**與設計交付物移植有關（阻斷 M8 旗艦儀表板）+ `AD-NegativeGate-1`（P0 候選，**刻意保持開啟**的持續紀律，不是待辦）|
| 🟠 已規劃、未執行 | **31** | P1（+2）；⚠️ **M1 的三條前置已於 W03 全數關閉**，見 §2.9 |
| 🟡 已設計、主動暫緩 | **2** | `AD-TrivyFullImage-1` · `AD-EslintSettingsClaim-1`（`AD-CacheControl-1` 已由 W03 關閉）|
| ⚫ 卡使用者 / 卡外部 | **2** | `AD-DAST-1`（需 VNet 內 runner）· `AD-IaCEvidence-1`（義務已移交 infra team）—— **兩者本次重驗仍成立** |
| 🟢 持續技術債 | **17** | P2（+3）|
| ⚪ 已實證 defer | **5** | `DEFERRED_REGISTER.md` D001–D005，上次審計後由 `CH-016` 首次填入 |
| ⚠️ 漂移發現 | **5** | AD-7 ~ AD-11，見 §2.7。**五條全部由 W03 自己的 closeout 造成**。✅ **同日全數修正**（使用者要求）|

> 上表數字來自 `BACKLOG.md` §Open Carryover ADs：審計當下 **56 列**，其中 **3 列已標 ✅ CLOSED
> 但未移出**（見 AD-7）→ **實際未關閉 53 條**（P0 5 / P1 31 / P2 17）。
> **AD-7 處置後 §Open 為 53 列，列數與實際數首次相符。**
> **逐項細節一律回該檔看** —— 本檔不複製（§5）。

### 2.1 🔴 上線硬關卡

**4 條**（`AD-Mockup-2` · `AD-Mockup-3` · `AD-RiskForm-1` · `AD-Incident-1`）共同點：
**都不是程式問題，是設計交付物與已確認參數的落差**（13 OpCo 結構、風險表單方法論、
事件表單 restricted block）。它們阻斷 M8，**不阻斷 M1**。排序已進
[`ROADMAP.md`](./ROADMAP.md) §押後。**本次無變動。**

**第 5 條是 `AD-NegativeGate-1`**（🔴 P0 候選）—— 不是一件會被做完的事，
而是每個 phase 都在消費的紀律，**刻意保持開啟**。
⚠️ **W03 交付了第 6 個實例**（production 拒絕啟動的負面 gate），三處計數未同步 → **AD-8**
（✅ 已處置：計數集中到 `BACKLOG.md` 一處，另兩處改為 link）。

### 2.2 🟠 已規劃、未執行

31 條 P1（+2：`AD-CalibrationMetric-1` · `AD-JestFileOrder-1`）。
⭐ **上次審計列的「M1 動工前必關 3 條」已由 W03 全數關閉** —— 見 §2.9。

### 2.3 🟡 已設計 / 已批准，主動暫緩

2 條（`AD-CacheControl-1` 已由 W03 關閉並移出本類）。兩者的解封條件目前**尚未成立**。

### 2.4 ⚫ 卡使用者 / 卡外部

`AD-DAST-1`（GitHub 託管 runner 接不到私有 VNet 內的 staging）·
`AD-IaCEvidence-1`（本專案沒有 IaC 可掃，義務在 infra team）。
**本次重驗兩者仍成立**：`security-scan.yml` 四個 job 為 `secret-scan` / `dependency-scan` /
`static-analysis` / `container-scan`，**無 DAST job**。
**兩者都影響 M0 DoD，且都不是本專案單方面能關掉的**。

### 2.5 🟢 持續技術債

17 條 P2（+3：`AD-DevDbDrift-1` · `AD-ExtensionQueryCost-1` · `AD-ChecklistTickDrift-1` ·
`AD-RebaseMergeBranchCheck-1`，另有一條由 P1 改列）。

### 2.6 ⚪ 已實證 defer / 範疇邊界外

**5 條**（D001–D005），上次審計的 AD-3 處置後由 `CH-016` 首次填入。
`DEFERRED_REGISTER.md` `Last Reviewed: 2026-08-10` —— **本次未發現解封條件已成立者**。
⚠️ 但 **D002（ADR-0004 選項 C 雙層強制）的判準值得複查**：它寫「今天只有一張業務表，
第二層無法被證明」，而 W03 已經**證明了另一個領域的兩層獨立性**（catalog validator + trigger，
元驗證量到 validator 死掉時 trigger 仍在擋）。這不推翻 D002（隔離軸與擴充治理是兩件事），
但那個「無法被證明」的論據現在有了一個反例形狀可以參照。

### 2.7 ⚠️ 漂移發現（AD-N）

> **上次審計的 AD-1 ~ AD-6 全部已處置**（2026-08-10 同日，使用者拍板）——
> 處置去向見 `CH-015` · `CH-016` · `AD-SecDoDAutomation-1` · `AD-StaleRecordRef-1`。
> 其中 **AD-6 的原判斷被 CH-016 的量測推翻**，完整證據保存在
> [`BACKLOG.md`](./BACKLOG.md) 的 `AD-StaleRecordRef-1` 一列與
> [`CH-016`](../03-implementation/changes/CH-016-activate-tracking-registers.md)。

⭐ **本次五條漂移的共同來源：W03 自己的 closeout。** 不是舊文件腐爛，是**剛做完的收尾
沒有把所有狀態面推到底** —— 這比停更兩個月的登記冊更難察覺，因為每一份文件看起來都「剛更新過」。

> ### ✅ 處置 — 2026-08-10 同日（使用者要求）
>
> **下表的「發現」欄刻意保留原文**（audit trail：發現了什麼 vs 現在是什麼是兩件事，見 §4 硬紀律二）。
>
> | AD | 處置 | 落在哪 |
> |---|---|---|
> | AD-7 | 三列 CLOSED 移出 §Open + 補 W03 的 §Shipped 列 | `BACKLOG.md` §Open（**56 → 53 列**，與實際數首次相符）· §Shipped（`CH-018` 從 0 次引用變成有列）|
> | AD-8 | **改結構而非改數字** —— 計數集中到 `AD-NegativeGate-1` 一處，其餘兩處改為 link 並註明為何不複製 | `BACKLOG.md`（加 W03 第 6 個 + 唯一權威聲明）· `RISK_REGISTER.md` R5 · `ROADMAP.md` §押後 |
> | AD-9 | R3 剩餘缺口改為只剩 `AD-PoolerScope-1`；緩解欄補上 W03 的並行常駐測試 | `RISK_REGISTER.md` R3 |
> | AD-10 | 「其餘 5 項」→ 3 項，並就地標明 OQ-3 / OQ-6 各自的拍板日與 ADR | `BACKLOG.md` §Pending Decisions |
> | AD-11 | Documentation Layout 格移除 0006，改標「已被 0010 取代」 | `CLAUDE.md`（淨減 byte，headroom 原僅 303）|
>
> ⭐ **AD-8 的處置刻意不只是「把 5 改成 6」** —— 那會讓同一個手動計數器繼續存在於三處，
> 下一個 phase 交付第 7 個時必然再漂一次。**同一個數字寫在三個地方，本身就是缺陷。**
> 這與 AD-10 是同一個病（`decision-form.md` 與 `BACKLOG.md` 各寫一次「五項」），
> 而 AD-10 已經是它的**第二次**再現（上次審計的 AD-1 只修了其中一處）。

| AD | 漂移 | 實據 | 建議 |
|---|---|---|---|
| **AD-7** | **3 條已標 ✅ CLOSED 的 AD 仍留在 `BACKLOG.md` §Open**，而該檔自己的使用規則要求「關閉 → 從 §Open **移除** + 在 §Shipped Pointer Index 加 1 行」。同時 **§Shipped 完全沒有 W03 的列** | `BACKLOG.md:26`（規則）vs `:64`（`AD-CacheControl-1`）· `:67`（`AD-ScopeConcurrency-1`）· `:68`（`AD-ScopedClientDI-1`）三列皆 `✅ **CLOSED**` 仍在 §Open。`CH-018` 在全部表格列中出現 **0 次**，而 W01/W02 各有一列引用 `CH-011`/`CH-014` | 移出三列 + 補 W03 的 §Shipped 列。⚠️ **這使 §Open 的計數對外多報 3 條** —— 任何讀「還剩幾條」的人都會拿到錯的數字 |
| **AD-8** | **`AD-NegativeGate-1` 的實例計數 5/5 停在 W02，而 W03 交付了第 6 個**（production 拒絕啟動的負面 gate）。**三處都沒同步** | `RISK_REGISTER.md:24`「目前 5/5 個實例已交付」· `ROADMAP.md:114`「目前 5/5」· `STATUS_AUDIT.md:105`（本檔上一版）。實據：`image-smoke.yml` 的 `拒絕在 production 啟動（負面案例）` step 已 merge 於 `b20f3f1`，run `31371191341` 輸出 `✅ production 啟動被拒絕（exit 1）` | 三處同步為 6。⭐ **這條 AD 是本專案最重要的持續紀律，而它的計數器是手動的** —— 值得考慮把「實例清單」集中到一處，其餘只 link |
| **AD-9** | **`RISK_REGISTER.md` R3 的「剩餘缺口」仍引用一條已關閉的 AD** —— 並行汙染常駐測試已於 W03 交付 | `RISK_REGISTER.md:22` 寫「剩餘缺口見 `AD-ScopeConcurrency-1`（並行汙染無常駐測試）與 `AD-PoolerScope-1`」；實際 `apps/api/src/modules/policy/policy.int.spec.ts:184-201` 已有 40 次交錯查詢的常駐測試 | R3 的剩餘缺口改為只剩 `AD-PoolerScope-1`。⚠️ **這條的方向特別危險**：風險登記冊把一個**已緩解**的缺口寫成仍然開放，會讓下一次風險複查誤判 R3 的殘餘風險 |
| **AD-10** | **`BACKLOG.md` §Pending Decisions 說「其餘 5 項開放決策（OQ-3/4/6/7/8）」，實際只剩 3 項** —— OQ-3 於 2026-08-09 拍板、OQ-6 於 2026-08-10 拍板 | `BACKLOG.md` §Pending Decisions 第 3 列 vs `decision-form.md:19-21`（開放中僅 OQ-4/7/8）與 `:44-45`（OQ-6/OQ-3 已在 §已拍板）| 改為 3 項並移除 OQ-3/6。⚠️ **這是上次審計 AD-1 的同型再現** —— 當時修的是 `decision-form.md` 自己的「五項」，**沒有人回頭看引用它的 BACKLOG**。同一個數字寫在兩個地方，只修一處 |
| **AD-11** | **`CLAUDE.md` 自己前後矛盾**：Tech Stack 格寫「0010 取代 0006」，但 Documentation Layout 格把 **0006 列為已採納** | `CLAUDE.md:84`（`ADR-0001 / 0004 / 0005 / 0007 / 0010 / 0011 已採納（**0010 取代 0006**）`）vs `:405`（`0001 / 0004 / 0005 / 0006 / 0007 / 0010 / 0011 已採納`）vs `docs/14-adr/0006-*.md:4`（`**已被 ADR-0010 取代**`）| `:405` 移除 0006。**先前存在，非 W03 造成** —— 但 W03 closeout 動過該行（加入 0005）而沒發現，這正是「改一行時不會重讀整格」的成本 |

### 2.8 真空白（未規劃亦未設計）

| 缺口 | 為什麼算真空白 |
|---|---|
| **`16` 28 點的自動化 —— 實作** | 分類已於 2026-08-10 完成（A 4+2 / B 3+2 / C 7 / D 5 / N 5），**B 類三點的實作仍是 0**。M0 DoD 明文要求 |
| **`16` #11–15 的責任邊界** | N 類五點需要一次拍板（Entra ID 之後密碼／憑證由誰負責）—— 沒有拍板就無法判斷它們是「本專案的義務」還是「已換手」|
| **Bug 軌從未被使用** | `docs/03-implementation/bugs/` **仍為空**。18 個 CH 與 3 個 phase 之後仍為 0。⚠️ **W03 的兩個 CI 失敗是真實缺陷**（跨實體寫入回 500 · 測試順序相依），走的是 Phase 軌而非 Bug 軌 —— 那是**正確的**（同一 phase 內、自己交付物的缺陷），但這意味著判準至今仍未被實測過 |
| **UI drive-through** | W01/W02/W03 **零次**。`apps/web` 有 10 個測試與 i18n parity gate，但沒有人開過瀏覽器走完一條主路徑。約束 3 對 user-facing 功能強制，而 Wave 1 至今沒有 user-facing 功能 —— **這是事實陳述，不是違規**，但它是 M8 之前最大的未知數 |

### 2.9 優先序建議

⭐ **上次審計列的「M1 動工前必關 3 條」已全數關閉**（W03，PR #31）——
`AD-CacheControl-1` · `AD-ScopedClientDI-1` · `AD-ScopeConcurrency-1`。
**`ROADMAP.md` 主線第 4 項 M1 的前置欄位現為空。** 這是本次審計最重要的結論：
**下一步沒有路障了。**

### 下一步只有兩個候選，其餘都是次要

| 候選 | 論據 | 反論據 |
|---|---|---|
| **A. M1 — Data foundation**（`ROADMAP` 第 4 項）| 前置已清空；W03 已證明 core entity 的兩個承重機制（entity scoping + governed extension）；`02a` §0 的實體索引是現成的施工圖。**這是唯一會讓「產品程式碼」這一欄長大的選項** | 範圍大，需要先切薄片；`02a` §0 有一批「未規格化，不得建置」的實體要先排除 |
| **B. `16` 28 點的 B 類三點 + N 類拍板**（`ROADMAP` 第 2b/2c 項）| 直接動 M0 DoD 的分子（目前 6 項有 2 部分 1 無標的）；分類報告已經把「今天可做」的三點指出來 | ⚠️ **這是治理／工具工作** —— `CH-017` 的節流閘每 phase 只給 1 個配額，而它會消耗掉。且 M0 DoD 另外兩項（DAST · IaC）**不是本專案能單方面關的**，所以做完 B 類 M0 仍然關不掉 |

**建議 A。** 理由不是 B 不重要，而是**專案至今的產出比例** —— `CH-017` 記錄的第 4 天實據是
產品 911 行 / 工具 3,287 行 / 文件 20,909 行，18 個 CH 裡 0 個產品功能。W03 是第一個
產出業務端點的 phase，**連續做第二個產品 phase 才會改變那個比例**。

**不建議現在動**：5 條 P0 —— 它們阻斷 M8，而 M1 是資料模型。提前處理會在沒有 runtime 的情況下
討論 UI 落差，違反「文檔成長跟隨已驗證的 runtime」。

**⏰ 唯一有死線的**：`AD-TrivyExempt-1` **2026-09-07**（28 天後）—— `容器映像 — trivy` 是
required check，到期時**所有 PR 停止可 merge**。不需要有人記得，但需要有人在那之前處理。

### 2.10 硬 gate 狀態 — M0 DoD 六項（`07:31`）

| # | 要求 | 狀態 | 實據 |
|---|---|---|---|
| 1 | ADR-0001 settled | ✅ | `14-adr/0001-backend-framework.md:4` **已採納** |
| 2 | CI 含 SCA/SAST/DAST/secret-scan **+ `16` 自動化檢查** | 🟠 **部分** | **本次重驗**：`security-scan.yml` 四個 job = `secret-scan` / `dependency-scan` / `static-analysis` / `container-scan`，**無 DAST**（`AD-DAST-1`）；`16` 自動化仍 0 實作（分類已完成，B 類三點未做）|
| 3 | IaC skeleton scanned | ⚫ **無標的** | `AD-IaCEvidence-1` —— ⛔ **不得逕行打勾或標 N/A** |
| 4 | 部署拓撲（0010）+ 計算平台（0011） | ✅ | 兩份 `**Status**: **已採納**` |
| 5 | TLS/憑證 · 安全標頭 · 管理埠明確設定 | 🟠 **部分** | 安全標頭 ✅ 且 **W03 擴充**（`bootstrap/security.ts:53-78,126-131` 全域 `Cache-Control`，PR #31 API 級驗證 11 個回應皆帶）；**TLS/憑證部署期未做**；**管理埠連續兩次審計未取得實據** |
| 6 | i18n scaffolding | ✅ | `apps/web/src/i18n/`（7 檔，含 `i18n.test.ts` 雙向 parity gate）|

**M0 = 3 關閉 / 2 部分 / 1 無標的** —— **連續三個 phase 未變動**（W01 判定 → W02 → W03）。

> ⚠️ **這個數字停滯不是怠惰，是結構**：剩下的 3 項裡，**第 3 項（IaC）沒有標的、
> 第 2 項的 DAST 需要 infra team 提供 VNet 內 runner** —— 兩者都不是本專案單方面能關的。
> 本專案能單方面推進的只有：第 2 項的 `16` 自動化、第 5 項的 TLS/憑證與管理埠。
> **「M0 未關閉」不應被讀成「M0 停滯」** —— 但它確實意味著 **M0 永遠不會靠本專案自己關掉**。

---

## 3. 歷史快照

<!-- 舊快照精簡成 3-5 行放這裡，保 audit trail。不要保留全文。 -->

| 日期 | 基準 sha | 當時 active | 漂移數 | 一句話 |
|---|---|---|---|---|
| 2026-08-10 (#2) | `bf3133e` | 0 | 5 | W03 收尾後。53 條 open AD；**五條漂移全部由 W03 自己的 closeout 造成**（關閉的 AD 未移出 §Open、負面 gate 計數 5→6 未同步、R3 引用已關閉的 AD）；M0 仍 3/2/1 未動 |
| 2026-08-10 | `568589d` | 0 | 6 | 首次審計。48 條 open AD；三份追蹤文件（ROADMAP / RISK / DEFERRED）**從未被使用**；M0 停在 3/2/1 未動 |

---

## 4. 三條硬紀律（全部由踩過的坑得出）

### 一、不可以靠目錄結構或狀態欄位推斷，一律查 `git log` 實據

來源專案曾在一天之內因此錯三次：把早已修好的 bug 判成 pending（`git log` 一查就見修復 commit）·
把早已做過的工作判成從未執行（只搜了 `docs/`，東西在 `infrastructure/`）·
把「沒有資料夾」當成「沒做過」。

**同一種病：靠結構推斷，不查實據。** 每個「未做」的判斷落筆前，先問「我查過 commit 沒有？」

### 二、兩個方向都要驗

「文件說已完成」不等於完成；「文件說待辦」也不等於未做。**漂移是雙向的。**

### 三、輸出必須帶實據

commit sha / `file:line` / 工具輸出。**沒有實據的發現不要寫進來** ——
一份摻了猜測的審計報告，會讓後續每個人都要重新驗一次，比沒有更糟。

---

## 5. 不可以做的事

**❌ 不可以在本檔複製 BACKLOG / REGISTER 的逐項細節。**
一複製就變成第二份要同步的清單，等於親手種下下一次漂移。
本檔只保留：roll-up 統計 / **跨來源矛盾** / 優先序建議 / 指向來源的連結。

**❌ 不可以順手修漂移**（除非使用者要求）。
審計的職責是揪出來並記下；修是另一件事，有自己的範疇與風險。

**❌ 不可以用本檔取代 session start protocol。**
那個是開工前載入 active phase context；這個是按需的全景審計。兩件不同的事。

---

## 6. 收尾動作

1. 更新 frontmatter `last_audit`
2. **在 `BACKLOG.md` 加一行**指向本次 §2.7（PROCESS R7：新識別的 pending 必須進 BACKLOG）
   —— **加一行，不要逐條複製漂移細節**，否則就是在製造下一次漂移
3. 更新 `BACKLOG.md` 的最後更新日期
4. Commit：`docs(planning): status audit <日期>`

> **漂移編號用 `AD-N`（Audit Drift），只增不重用。**
> 刻意避開 backlog / deferred / risk 既有的命名空間 ——
> 來源專案有過同一個編號被用兩次，而且因為已被多處引用而不敢重編。
