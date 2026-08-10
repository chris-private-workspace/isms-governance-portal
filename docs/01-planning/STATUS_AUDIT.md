---
artifact: status-audit-living
status: active
last_audit: 2026-08-10
---

# 全項目狀態審計（Status Audit）

**Purpose**: 跨來源的**點時間快照** —— 對照所有追蹤文件，揪出它們**彼此之間**的漂移。

**Category**: Planning / Living document
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
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

## 2. 最新快照 — 2026-08-10

**基準**：branch `main` · `568589d` · 工作樹 **dirty**（4 個修改 + 3 個未追蹤，
均為使用者進行中的 CH-010 Azure 資源申請工作，**未納入本次判定**）
**當前 active phase / change / bug = 0** —— W01 `closed_partial`、W02 `closed`，無 active

### 涵蓋聲明

**掃了**（§1 全部 8 個來源）：`BACKLOG.md` · `ROADMAP.md` · `DEFERRED_REGISTER.md` ·
`RISK_REGISTER.md` · `docs/14-adr/` 全部 `**Status**:` · 三軌 pre-doc（跑
`check_status_markers.py`，非手砌 grep）· `docs/` 全部非終態 `status:` · `decision-form.md`。
補充：`git log -8` · `git status` · `git ls-files` 核對 · `apps/**/src/**` 的
`TODO(`/`FIXME`/`HACK(` · branch protection API。

**沒掃到 / 不在範圍**：`docs/02-architecture/` 19 份設計文件的內文一致性（非追蹤來源）·
`reference/` 與 `docs/reference/`（刻意不在版控）· 使用者未 commit 的 CH-010 改動內容 ·
M0 DoD 第 5 項的「management-port exposure」（本次未取得實據，見 §2.10）。

| 層級 | 數量 | 一句話 |
|---|---|---|
| 🔴 上線硬關卡 | **5** | **4 條**與設計交付物移植有關（阻斷 M8 旗艦儀表板）+ `AD-NegativeGate-1`（P0 候選，**刻意保持開啟**的持續紀律，不是待辦）|
| 🟠 已規劃、未執行 | **29** | P1；其中 3 條是 M1 第一步的前置（見 §2.9）|
| 🟡 已設計、主動暫緩 | **3** | `AD-TrivyFullImage-1` · `AD-CacheControl-1` · `AD-EslintSettingsClaim-1` —— 三者都有明確的解封條件 |
| ⚫ 卡使用者 / 卡外部 | **2** | `AD-DAST-1`（需 VNet 內 runner）· `AD-IaCEvidence-1`（義務已移交 infra team）|
| 🟢 持續技術債 | **14** | P2 |
| ⚪ 已實證 defer | **0** | `DEFERRED_REGISTER.md` **從未被使用**（見 AD-3）→ 同日已填 5 條，見 §2.7 處置紀錄 |
| ⚠️ 漂移發現 | **6** | AD-1 ~ AD-6，見 §2.7 |

> 上表數字來自 `BACKLOG.md` §Open Carryover ADs 的 48 列（P0 5 / P1 29 / P2 14）。
> **逐項細節一律回該檔看** —— 本檔不複製（§5）。

### 2.1 🔴 上線硬關卡

**4 條**（`AD-Mockup-2` · `AD-Mockup-3` · `AD-RiskForm-1` · `AD-Incident-1`）共同點：
**都不是程式問題，是設計交付物與已確認參數的落差**（13 OpCo 結構、風險表單方法論、
事件表單 restricted block）。它們阻斷 M8，**不阻斷 M1**。排序已進
[`ROADMAP.md`](./ROADMAP.md) §押後。

**第 5 條是 `AD-NegativeGate-1`**（🔴 P0 候選）—— 它與設計交付物無關，也不是一件會被做完的事，
而是每個 phase 都在消費的紀律（5/5 個實例已交付負面案例），**刻意保持開啟**。

### 2.2 🟠 已規劃、未執行

29 條 P1。**其中 3 條是 M1 動工前必須先處理的**，見 §2.9。

### 2.3 🟡 已設計 / 已批准，主動暫緩

三者都寫了解封條件，且條件目前**尚未成立** —— 這一類是健康的。

### 2.4 ⚫ 卡使用者 / 卡外部

`AD-DAST-1`（GitHub 託管 runner 接不到私有 VNet 內的 staging）·
`AD-IaCEvidence-1`（本專案沒有 IaC 可掃，義務在 infra team）。
**兩者都影響 M0 DoD，且都不是本專案單方面能關掉的**。

### 2.5 🟢 持續技術債

14 條 P2。無新增。

### 2.6 ⚪ 已實證 defer / 範疇邊界外

**0 條** —— 但這不代表沒有 defer，而是 `DEFERRED_REGISTER.md` 從未被使用（AD-3）。
實際上被 defer 的東西（如 ADR-0005、pooler 情境、選項 C 雙層強制）散在 BACKLOG 與各 ADR 內文。

### 2.7 ⚠️ 漂移發現（AD-N）

| AD | 漂移 | 實據 | 建議 |
|---|---|---|---|
| **AD-1** | `decision-form.md` **同一份文件內矛盾**：§開放中下方仍寫「剩下**五項**的『誰能決定』仍未指定」並把 **OQ-3** 列為待 spike，但 OQ-3 已拍板並移入 §已拍板 | `decision-form.md:24-25`（「剩下五項」「OQ-3 / 4 / 6 / 7 需要 W01 spike」）vs `:40`（OQ-3 已拍板 2026-08-09 → ADR-0004）。實際開放 **4** 項 | 改為「剩下四項」並移除 OQ-3。⚠️ 該檔目前有使用者未 commit 的改動 |
| **AD-2** | `ROADMAP.md` **自建立起從未加入任何排序項**，而它自己設的開啟條件已經成立 | `ROADMAP.md:7` `Last Modified: 2026-08-07`；全檔 81 行皆為模板說明，零排序項。其 `:30` 寫「只有在 BACKLOG 長到『讀完不知道下一步』時才需要本檔」—— BACKLOG §Open 現有 **48** 條 | 二選一：**填它**（48 條已遠超「讀完不知道下一步」的門檻），或**明記本專案不用這一層**並從 §1 來源清單移除 |
| **AD-3** | `RISK_REGISTER.md` 與 `DEFERRED_REGISTER.md` **仍是 bootstrap 模板，零條目**，但 `STATUS_AUDIT.md` §1 把兩者列為必掃權威來源 | `RISK_REGISTER.md:14` 仍是 `\| R1 \| \| 高/中/低 \| ...` 佔位列；`DEFERRED_REGISTER.md:15` 仍是 `\| D001 \| \| YYYY-MM-DD \| ...` 佔位列。同期 BACKLOG 累積 48 條 | ⭐ **RISK_REGISTER 對本專案不是可選的** —— guardrail 2 要求平台以資產身分登記在自己系統內、用自己的能力證明自身合規。一個 ISMS 平台自己沒有風險登記冊，是 Entity Zero 的直接缺口 |
| **AD-4** | **`16` 的 28 點 secure-development DoD 沒有任何自動化檢查**，而 M0 DoD 明文要求 | `07:31` 要求 "plus the **automated** secure-development DoD checks (`16`)"；grep `scripts/` + `.github/` 對 `16-secure-development-dod` / `28-point` / `28 點` **零命中** | **這個缺口目前沒有任何 AD 在追蹤** —— `AD-SecScan-1` 只涵蓋 SCA/SAST/容器掃描。需新開一條 |
| **AD-5** | `AD-CIRequired-1` 的**解封條件已成立但未執行** —— 六個 check 全綠卻擋不住任何東西 | branch protection API：`required_status_checks: undefined`（`required_pull_request_reviews: 0` · `enforce_admins: true` · `linear: true`）。該 AD 備註寫「W01 M0 骨架建立後設」，W01 已於 2026-08-08 交付；W02 又讓 `gates` 含 20 個整合測試、`image-smoke` 含實際探測 | **現在是設它的時機**：`gates` 與 `image-smoke` 兩個 job 都已證明有實質內容（W02 元驗證：policy 中性化 → 14/20 紅）|
| **AD-6** | `CH-010` 被**前向引用 4 處**達 2 天，檔案今日才建立且**仍未進版控** | `git ls-files --error-unmatch docs/03-implementation/changes/CH-010-azure-resource-request.md` → **NOT TRACKED**；引用處 `ADR-0010:175` · `ADR-0011:16,157,158` · `CH-009/spec.md:165` | 低嚴重度，**正在解決中**（使用者進行中的工作）。但注意 `check_path_references.py` **抓不到這一類** —— 未追蹤檔在磁碟上存在，detector 看不出差別 |

#### 處置紀錄（2026-08-10 同日，使用者拍板全部六條）

> **上表刻意保留審計當下的原樣** —— 它記的是「發現了什麼」。本段記「後來怎麼了」。

| AD | 處置 | 去向 |
|---|---|---|
| **AD-1** | ✅ 已修 | `decision-form.md` 改為四項、移除 OQ-3、修正 spike 歸屬（W02 非 W01）。⚠️ **順帶發現第四個錯誤**：該段引用的 ADR-0006 已被 ADR-0010 取代，四個法律問題的現況**未經複查**，已於原處標記 |
| **AD-2** | ✅ 已填 | [`ROADMAP.md`](./ROADMAP.md) 首次填入排序項（主線 7 + 死線 1 + 等外部 2 + 押後 3）· `CH-016` |
| **AD-3** | ✅ 已填 | [`RISK_REGISTER.md`](./RISK_REGISTER.md) 8 活躍 + 3 已實現（四條標記為 Entity Zero 遷移候選）· [`DEFERRED_REGISTER.md`](./DEFERRED_REGISTER.md) 5 條 · `CH-016` |
| **AD-4** | 🟡 部分 | 缺口已登記為 `AD-SecDoDAutomation-1`（BACKLOG）並進 ROADMAP 主線第 2 項。**28 點的分類與實作尚未做** |
| **AD-5** | ✅ 已設 | 六個 check 設為 required（`strict: false`）· `CH-015`。⚠️ **擋人的能力尚未被觀測** —— 負面驗證待下一個 PR |
| **AD-6** | 🔴 **原判斷被推翻** | CH-010 已於 `c11e64e` 進版控。但「detector 分不出未追蹤檔」這個歸因**是錯的** —— 見下方 |

##### ⚠️ AD-6 的原判斷被推翻（CH-016 處置時量到）

原判斷寫「`check_path_references.py` 抓不到這一類 —— 未追蹤檔在磁碟上存在，detector 看不出差別」。
**那是用一個沒有驗證過的機制假設，去解釋一個真實的症狀。** 實測：

| 量到什麼 | 結果 |
|---|---|
| 9 處 `CH-010` 引用的**形式** | **只有 1 處是 markdown 連結**（`0010:187`）；其餘 8 處是 inline code `` `CH-010` `` |
| 那 1 處連結為何沒紅 | 它是 2026-08-10 **與檔案同時**加上的 —— `check_doc_links.py`（`rglob("*.md")` 掃全部 md）從沒機會開火 |
| 8 處 inline code 為何沒紅 | **它們不是路徑，是編號**。`check_path_references.py` 只認「以真實頂層目錄開頭」的 token |

**真正的缺口是「跨記錄的編號引用無人看管」—— 而它已經登記過了**（`AD-StaleRecordRef-1`，CH-010 時登記）。
AD-6 是它的**同型再現**，該 AD 的升級條件（「同型再現 1 次即升級為 detector」）因此成立，已升 🟡 P1。

**原提案的解法（給 detector 加 git-tracked 檢查）也被推翻**：量測顯示本次工作自己就有
3 個未追蹤檔且全部被引用 —— 在 commit 之前，「新增檔案 + 引用它」是**正常工作流程**。
那個檢查會對每次 commit 開火，成為噪音源而非 gate。

**未實作，且刻意不實作** —— `AD-ChNumber-1` 明訂**前向引用預留編號是合法的**（CH-010 正是如此），
所以 detector 需要一個「預留 vs 失效」的判準，而那是一個**需要拍板的設計決定**，不是照著寫就好。

**三個新發現**（處置過程中量到，不在原審計）：

1. **M1 的 DoD 依賴一個尚未拍板的 ADR** —— `07:32` 明文要求 "governed-extension mechanism
   working"，那是 **ADR-0005 / OQ-6**。M1 因此有一個先前未被標示的前置依賴
2. ⚠️ **`CH-015` 讓 `AD-TrivyExempt-1` 的死線後果升級** —— `libssl3` 六條豁免 2026-09-07 到期，
   而 `容器映像 — trivy` 現在是 required check → 到期時**所有 PR 停止可 merge**（不再只是「CI 有個叉」）
3. **`CH-010` 未進 §Shipped Pointer Index** —— 已 commit 但索引沒補。刻意不代勞：
   一句話摘要該由做那件事的人寫

### 2.8 真空白（未規劃亦未設計）

| 缺口 | 為什麼算真空白 |
|---|---|
| **`16` 28 點的自動化** | 見 AD-4 —— M0 DoD 明文要求，但既無實作亦無 AD 追蹤 |
| **平台自身的風險登記** | 見 AD-3 —— guardrail 2（Entity Zero）要求，登記冊是空模板 |
| **Bug 軌從未被使用** | `docs/03-implementation/bugs/` 為空。這**不必然是缺口**（可能真的沒有 bug），但 14 個 CH 與 2 個 phase 之後仍為 0，值得留意判準是否被繞過 |

### 2.9 優先序建議

**M1 動工前必須先關的 3 條**（全部來自 W02，且都會在第一個 repository / 第一個端點就撞上）：

1. **`AD-CacheControl-1`** ⛔ —— 「什麼算 sensitive」是政策決定。預設值一旦錯過，就要逐個端點回頭補
2. **`AD-ScopedClientDI-1`** —— M1 第一個 repository 就是它的觸發點（token 在 `api` / 型別在 `core-model`）
3. **`AD-ScopeConcurrency-1`** —— 並行汙染是唯一不會拋錯的隔離失敗模式，目前無測試守著

**接著（成本低、收益即刻）**：`AD-CIRequired-1`（AD-5，設 required checks）· AD-1（改一行）·
AD-2 與 AD-3 的**取捨決定**（填它還是廢它 —— 兩者都比放著爛好）。

**不建議現在動**：5 條 P0 —— 它們阻斷 M8，而 M1 是資料模型。提前處理會在沒有 runtime 的情況下
討論 UI 落差，違反「文檔成長跟隨已驗證的 runtime」。

### 2.10 硬 gate 狀態 — M0 DoD 六項（`07:31`）

| # | 要求 | 狀態 | 實據 |
|---|---|---|---|
| 1 | ADR-0001 settled | ✅ | `14-adr/0001-backend-framework.md:4` **已採納** |
| 2 | CI 含 SCA/SAST/DAST/secret-scan **+ `16` 自動化檢查** | 🟠 **部分** | SCA/SAST/gitleaks 三者 PR #26 實跑通過；**DAST 0 命中**（`AD-DAST-1`）；**`16` 自動化 0 命中**（AD-4）|
| 3 | IaC skeleton scanned | ⚫ **無標的** | `AD-IaCEvidence-1` —— ⛔ **不得逕行打勾或標 N/A** |
| 4 | 部署拓撲（0010）+ 計算平台（0011） | ✅ | 兩份 `**Status**: **已採納**` |
| 5 | TLS/憑證 · 安全標頭 · 管理埠明確設定 | 🟠 **部分** | 安全標頭 ✅（`bootstrap/security.spec.ts` 逐條斷言，CH-012）；**TLS/憑證部署期未做**；**管理埠本次未取得實據** |
| 6 | i18n scaffolding | ✅ | `apps/web/src/i18n/i18n.test.ts`（CH-012 的雙向 parity gate）|

**M0 = 3 關閉 / 2 部分 / 1 無標的**（與 W01 收尾時的判定相同 —— **W02 沒有改變 M0 的分子**，
它關的是 M1 的前置與 ADR-0004）。

---

## 3. 歷史快照

<!-- 舊快照精簡成 3-5 行放這裡，保 audit trail。不要保留全文。 -->

| 日期 | 基準 sha | 當時 active | 漂移數 | 一句話 |
|---|---|---|---|---|
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
