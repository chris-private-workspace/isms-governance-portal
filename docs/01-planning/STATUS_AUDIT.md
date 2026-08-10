---
artifact: status-audit-living
status: active
last_audit: 2026-08-10   # audit #3 (W04 closeout, base a2b1906)
---

# 全項目狀態審計（Status Audit）

**Purpose**: 跨來源的**點時間快照** —— 對照所有追蹤文件，揪出它們**彼此之間**的漂移。

**Category**: Planning / Living document
**Created**: 2026-08-07
**Last Modified**: 2026-08-10（audit #3）
**Status**: Active

> **Modification History**
> - 2026-08-10: Add audit #3 (W04) + AD-12–14 — two of three drifts are in the tracking docs themselves
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

## 2. 最新快照 — 2026-08-10（#3，W04 收尾後）

**基準**：branch `main` · `a2b1906` · 工作樹 **clean**
**當前 active phase / change / bug = 0** —— W01 `closed_partial`、W02/W03/W04 `closed`，無 active
**本次 PR**：#34（`5bb0c9f`）· #35（`a2b1906`）**皆經 `gh pr view` 驗證為 MERGED**，非採信回報
（`state` + `mergeCommit` + `mergedBy` + 六個 check `conclusion` 逐項取得）

### 涵蓋聲明

**掃了**（§1 全部 8 個來源）：`BACKLOG.md`（**python 逐行解析 §Open**，非命中數）· `ROADMAP.md` ·
`DEFERRED_REGISTER.md` · `RISK_REGISTER.md` · `docs/14-adr/` 全部 `**Status**:` ·
三軌 pre-doc（跑 `check_status_markers.py` → **9 pre-doc，E1/E2/E3/E4 clean**）·
`docs/` 全部非終態 `status:` · `decision-form.md`。
補充：`git log -1 -- <每份登記冊>`（判**真實最後修改**而非自稱的 Last Reviewed）·
`git status` · `TODO(`/`FIXME`/`HACK(` 掃 `**/*.{ts,tsx,js,mjs,py,sql}`（**0 命中**）·
`security-scan.yml` job 清單 · `git ls-files apps/web/src/i18n/` · `gh repo view` merge 設定 ·
`git ls-remote --heads origin`。

**沒掃到 / 不在範圍**：`docs/02-architecture/` 19 份設計文件的內文一致性（非追蹤來源）·
`reference/` 與 `docs/reference/`（刻意不在版控）· **M0 DoD 第 5 項的 TLS/憑證與管理埠
本次同樣未取得實據**（**連續三次審計未取得** —— 見 §2.10）· branch protection API 設定值
（本次未重查；但 PR #34/#35 實測 `BLOCKED → CLEAN` 轉換正常，六個 required check 皆回報）。

⚠️ **本次審計自身又一次踩到 `AD-GrepAssertion-1`**：用 `grep -c "🔴 P0"` 統計優先度得到 **0**，
而實際是 **5** —— emoji 在該 pipeline 下不匹配。**我只因為 0 與已知狀態矛盾才發現**。
改用 python 逐列解析後得到可信計數。
⭐ **這是連續第二次審計在自己身上重現同一條 AD**（上次是 PowerShell `-match` 大小寫不敏感）。
**審計報告若用錯的計數方法，讀的人沒有辦法發現** —— 所以本次的分級計數改為程式解析，不用 grep。

| 層級 | 數量 | 一句話 |
|---|---|---|
| 🔴 上線硬關卡 | **5** | **本次無變動**。4 條與設計交付物移植有關（阻斷 M8）+ `AD-NegativeGate-1`（**刻意保持開啟**的持續紀律）|
| 🟠 已規劃、未執行 | **34** | P1（+3）；⚠️ 三條全部來自 W04，見 §2.7 |
| 🟡 已設計、主動暫緩 | **2** | 本次無變動；解封條件皆未成立 |
| ⚫ 卡使用者 / 卡外部 | **2** | `AD-DAST-1` · `AD-IaCEvidence-1` —— **本次重驗仍成立**（`security-scan.yml` 四個 job，無 DAST）|
| 🟢 持續技術債 | **17** | 本次無變動 |
| ⚪ 已實證 defer | **5** | D001–D005，**本次無解封條件成立者**（D005 的判準見 §2.6）|
| ⚠️ 漂移發現 | **3** | AD-12 ~ AD-14，見 §2.7。⭐ **其中兩條在追蹤文件自己身上** |

> 上表數字由 **python 逐列解析** `BACKLOG.md` §Open Carryover ADs 得出：**56 列**，
> **P0 5 / P1 34 / P2 17，未分類 0**。列數與實際未關閉數**相符**（AD-7 修好後維持至今）。
> **逐項細節一律回該檔看** —— 本檔不複製（§5）。
>
> ⭐ **計數連續性已驗**：`bf3133e` 56 列（其中 3 列標 CLOSED 未移出 → 實際 53）→ AD-7 處置 53
> → 距離分析 +`AD-UserEntitySpec-1` = 54 → W04 +3 −1 = **56**。**逐一 `git show` 核對，非推算。**

### 2.1 🔴 上線硬關卡

**本次無變動。** 4 條（`AD-Mockup-2` · `AD-Mockup-3` · `AD-RiskForm-1` · `AD-Incident-1`）
阻斷 M8，**不阻斷 M1**；排序已在 [`ROADMAP.md`](./ROADMAP.md) §押後。

**第 5 條 `AD-NegativeGate-1`** —— W04 交付了**第 7 個實例**，且**計數這次同步了**（AD-8 的
結構性處置生效：計數只寫在 `BACKLOG.md` 一處）。
⭐ **但 W04 的那一個與前六個不同類**：它是**第一個「常駐負面案例無效」的實例** ——
`isms_test` 與 `isms_dev` 建庫方式不同，**兩個環境各自的負面案例都會過，因為它們各自在
自己的環境裡是對的**。CH-012 的結構性解法對「環境不對等」沒有作用 → `AD-DbBuildPathParity-1`。

### 2.2 🟠 已規劃、未執行

34 條 P1（+3，**全部來自 W04**）：`AD-DbBuildPathParity-1` · `AD-MigrationChecksum-1` ·
`AD-AllowlistCountClaim-1`。⭐ 三條都不是「還沒做的功能」，而是**驗證方法的缺口** ——
兩條關於「綠燈的涵蓋範圍」，一條關於「文件宣稱與實測不符」。

### 2.3 🟡 已設計 / 已批准，主動暫緩

2 條，**本次無變動**。解封條件皆未成立。

### 2.4 ⚫ 卡使用者 / 卡外部

`AD-DAST-1` · `AD-IaCEvidence-1`。**本次重驗仍成立**：`security-scan.yml` 四個 job 為
`secret-scan` / `dependency-scan` / `static-analysis` / `container-scan`，**無 DAST job**；
`.github/workflows/` 最後修改是 `b20f3f1`（W03），**W04 未動 CI**。
**兩者都影響 M0 DoD，且都不是本專案單方面能關掉的。**

### 2.5 🟢 持續技術債

17 條 P2，**本次無變動**。

### 2.6 ⚪ 已實證 defer / 範疇邊界外

**5 條**（D001–D005）。`DEFERRED_REGISTER.md` 真實最後修改 `c6a0bba`（2026-08-10 11:16，CH-015/016）
—— **W03 與 W04 兩個 phase 未複查，但本次逐條檢驗後未發現解封條件已成立者**：

- **D005（`strict: true`）** 的解封條件之一是「單人但**開始同時開兩個以上 PR**」。
  ⚠️ 本次特別檢驗：#34 於 15:05Z merged，#35 於其後才建立 —— **序列非並行，未觸發**。
- **D002（雙層強制）** 的判準「今天只有一張業務表」現在**字面上已不成立**（5 張表），
  但其**實質**判準是「第二層能否被證明抓到第一層抓不到的東西」，而隔離軸仍只有 RLS 一層可證。
  **不推翻 D002**，但那句字面描述已過期 → 併入 AD-12 一併處理。

### 2.7 ⚠️ 漂移發現（AD-N）

> **上次審計的 AD-7 ~ AD-11 全部已處置**（2026-08-10 同日）。
> ⭐ **AD-8 的結構性處置本次已被驗證有效**：W04 交付第 7 個負面 gate 時，
> 計數**只需要改一個地方**，而它確實被改了。**這是本專案第一次靠結構而非記性避免了漂移。**

⭐ **本次三條漂移的共同點：兩條在「追蹤文件自己」身上。**
上次是「剛做完的收尾沒推到底」，這次更難察覺 —— **負責揪出別人 stale 的文件，自己帶著錯的實據**。

| AD | 漂移 | 實據 | 建議 |
|---|---|---|---|
| **AD-12** | ⭐⭐ **`RISK_REGISTER.md` 在 W04 closeout 完全未被複查，而該檔自己的 Purpose 寫著「**每次 phase 收尾要複查**」。** 其 **R4 的事實陳述已落後兩個 phase**：仍寫「W02 已建**兩張表**並寫入」，實際已有 5 張（W03 +`extension_fields`、W04 +`users`/`ref_code_counters`），且 W04 新增了一條**無稽核的發號寫入路徑**。⚠️ **W04 的 retrospective Q7 自己寫了「R4 敞口再擴大一格」—— 然後沒有回頭改那個登記冊** | `git log -1 -- docs/01-planning/RISK_REGISTER.md` → `10ebb6b 2026-08-10 17:38:17`，**正是 W04 的 branch base**（`65ce121` 同一時間戳）→ W04 全程未觸碰。`RISK_REGISTER.md:23` 仍為「W02 已建兩張表並寫入」vs `schema.prisma` 現有 5 個 model。W04 retro Q7 的原文：「本 phase 新增的寫入路徑**同樣沒有稽核**，`RISK_REGISTER` R4 敞口再擴大一格」| **改結構，不只改文字**（比照 AD-8）：R4 的表格數不該手寫 —— 改為「**所有已建業務表**」並 link `schema.prisma`。**且見 AD-12b** |
| **AD-12b** | ⭐⭐ **上一條是結構性的，不是疏忽**：Phase 軌的 closeout 流程**從來沒有要求複查 `RISK_REGISTER`**。`task-workflow.md` §Phase Closeout、`.claude/commands/phase-closeout.md`、`retrospective.md.tpl` §Closeout Self-Check **三者對它零命中**。唯一一處要求在 **Bug 軌** | `grep -rn "RISK_REGISTER\|風險登記"` 於上述三檔 + `PROCESS.md` → **唯一命中 `PROCESS.md:295`**，而該行是 Bug 軌 postmortem 的步驟 10（「若是新的風險型態」）| ⭐ **這與審計 #1 的 AD-5 同形狀**：條件寫在沒有任何清單會執行的地方。建議在 retrospective 模板的 Closeout Self-Check 加一列，**否則 W05 會第三次發生** |
| **AD-13** | ⭐ **本檔（`STATUS_AUDIT.md`）自己的實據是錯的** —— §2.10 第 6 項寫 i18n scaffolding「`apps/web/src/i18n/`（**7 檔**…）」，實際**一直是 5 檔**，從 W01 建立至今從未有過 7 個 | `git ls-files apps/web/src/i18n/` → **5** 檔（`GLOSSARY.md` `en.json` `i18n.test.ts` `index.ts` `zh-Hant.json`）。`git log --name-status` 顯示 `2d92e8a`（W01）一次 `A` 五個檔、`2a4160f`（CH-012）一次 `M`，**沒有任何刪除** → 不是變少，是**當初就數錯** | 改為 5。⚠️ **這條的意義大於數字**：M0 DoD 第 6 項判 ✅ 的依據就是這個數字，而它**兩次審計都沒被重新驗證** —— 一份錯的實據被引用了兩次就會變成事實 |
| **AD-14** | **本次審計用 `grep -c "🔴 P0"` 取得優先度計數 → 回 `0`，實際 5** | 同一份檔案 `grep -c "P0"` → 7（5 個 AD 列 + 1 個圖例 + 1 個 §Shipped 引用）。emoji 在該 pipeline 下不匹配 | 已於本次改用 python 逐列解析。⭐ **記在這裡是因為它是 `AD-GrepAssertion-1` 連續第二次在審計自身重現** —— 依 `.claude/rules/README.md` 強度階梯，同一形狀 ≥3 次應改結構性解法。**建議：審計的分級計數固定用腳本，不用 grep** |

### 2.8 真空白（未規劃亦未設計）

| 缺口 | 為什麼算真空白 |
|---|---|
| **`16` 28 點的自動化 —— 實作** | **本次無變動**。分類已完成（2026-08-10），**B 類三點的實作仍是 0**。M0 DoD 明文要求 |
| **`16` #11–15 的責任邊界** | **本次無變動**。N 類五點需要一次拍板 |
| **Bug 軌從未被使用** | `docs/03-implementation/bugs/` **仍為空**。19 個 CH 與 4 個 phase 之後仍為 0。⚠️ **W04 的 schema GRANT 缺失是一個真實缺陷**（每個端點 500），走 Phase 軌 —— 同一 phase 內、自己交付物的缺陷，**那是正確的**，但判準至今仍未被實測過 |
| **UI drive-through** | W01–W04 **零次**。`apps/web` 在 W04 **完全未被觸碰**。約束 3 對 user-facing 功能強制，而 Wave 1 至今沒有 user-facing 功能 —— **這是事實陳述，不是違規**，但它是 M8 之前最大的未知數，且**已連續四個 phase** |
| **已 merge 分支未清理** | `gh repo view` → `deleteBranchOnMerge=false`；`git ls-remote --heads origin` → **13 個遠端分支**，其中 **12 個是已 merge 的舊分支**（本機 10 個）。⚠️ 不是缺陷，但**沒有任何來源在追蹤它**，而 rebase merge 使 `git branch --merged` **偵測不到**（SHA 已改寫）→ 它不會自己浮現 |

### 2.9 優先序建議

⭐ **M1 已開工**（W04 = slice 1/N），`ROADMAP` 第 4 項標 `▶`。
**本次審計的核心結論不是「下一步做什麼」，而是「下一步之前先補一個結構」。**

| 候選 | 論據 | 反論據 |
|---|---|---|
| **A. M1 slice 2 —— 複製 W04 量到的形狀**（`ROADMAP` 第 4 項）| W04 的 design note §2 有**七個已驗證不變式**，其存在的全部理由就是讓 slice 2 複製而非重新設計。**35 個實體建了 2 個**，這是唯一會讓產品程式碼長大的選項 | 需要先從 `02a` §0 挑出「已規格化、可建」的實體並排除「未規格化、不得建置」的 |
| **B. AD-12b 的結構修補**（closeout 加一列）| **成本極低**（模板加一行），而它防的是**已經連續發生兩次**的漏更新。⚠️ 且 `CH-017` 節流閘每 phase 只給 1 個治理配額 —— 這一條便宜到值得用掉它 | 它是治理工作，不長產品程式碼 |
| **C. `16` B 類三點 + N 類拍板** | 直接動 M0 DoD 分子 | ⚠️ M0 另外兩項不是本專案能單方面關的，做完 M0 仍關不掉；且會用掉治理配額 |

**建議：B 併入 A 的 closeout，不單獨開 CH。** AD-12b 的修補是**改一份模板加一列**，
把它做成獨立 CH 會消耗節流閘配額，而它本質上是「W05 的 closeout 要多做一件事」。
**主線走 A。**

**不建議現在動**：5 條 P0（阻斷 M8，而 M1 是資料模型）· `16` 自動化（見上）。

**⏰ 唯一有死線的**：`AD-TrivyExempt-1` **2026-09-07**（**28 天後**）—— `容器映像 — trivy` 是
required check，到期時**所有 PR 停止可 merge**。本次重驗它仍是 required 且仍為綠。

### 2.10 硬 gate 狀態 — M0 DoD 六項（`07:31`）

| # | 要求 | 狀態 | 實據 |
|---|---|---|---|
| 1 | ADR-0001 settled | ✅ | `14-adr/0001-backend-framework.md:4` **已採納**。本次全掃：**8 份 ADR 全為已採納或已被取代，0 份 Proposed** |
| 2 | CI 含 SCA/SAST/DAST/secret-scan **+ `16` 自動化檢查** | 🟠 **部分** | **本次重驗**：`security-scan.yml` 四個 job，**無 DAST**（`AD-DAST-1`）；`16` 自動化仍 0 實作。`.github/workflows/` 最後修改 `b20f3f1`（W03）—— **W04 未動 CI** |
| 3 | IaC skeleton scanned | ⚫ **無標的** | `AD-IaCEvidence-1` —— ⛔ **不得逕行打勾或標 N/A** |
| 4 | 部署拓撲（0010）+ 計算平台（0011） | ✅ | 兩份 `**Status**: **已採納**` |
| 5 | TLS/憑證 · 安全標頭 · 管理埠明確設定 | 🟠 **部分** | 安全標頭 ✅（W03 擴充）；**TLS/憑證部署期未做**；**管理埠連續三次審計未取得實據** |
| 6 | i18n scaffolding | ✅ | `git ls-files apps/web/src/i18n/` → **5 檔**（含 `i18n.test.ts` 雙向 parity gate）。⚠️ **前兩次審計寫 7 檔是錯的** → AD-13 |

**M0 = 3 關閉 / 2 部分 / 1 無標的** —— **連續四個 phase 未變動**（W01 → W02 → W03 → W04）。

> ⚠️ 停滯原因與前次相同且**未改變**：剩下 3 項裡第 3 項無標的、第 2 項的 DAST 需 infra team
> 提供 VNet 內 runner。本專案能單方面推進的只有第 2 項的 `16` 自動化與第 5 項的 TLS/管理埠。
> **「M0 未關閉」不應被讀成「M0 停滯」** —— 但 **M0 永遠不會靠本專案自己關掉**。

---

## 3. 歷史快照

<!-- 舊快照精簡成 3-5 行放這裡，保 audit trail。不要保留全文。 -->

| 日期 | 基準 sha | 當時 active | 漂移數 | 一句話 |
|---|---|---|---|---|
| 2026-08-10 (#3) | `a2b1906` | 0 | 3 | W04 收尾後。56 條 open AD（P0 5 / P1 34 / P2 17）；⭐ **三條漂移有兩條在追蹤文件自己身上** —— `RISK_REGISTER` 整個 W04 未被複查（且 closeout 流程從來沒要求過），本檔自己的 i18n「7 檔」實據**從一開始就是錯的**；M0 仍 3/2/1，**連續四個 phase 未動** |
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
