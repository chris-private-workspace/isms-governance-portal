---
artifact: status-audit-living
status: active
last_audit: 2026-08-14
---

# 全項目狀態審計（Status Audit）

**Purpose**: 跨來源的**點時間快照** —— 對照所有追蹤文件，揪出它們**彼此之間**的漂移。

**Category**: Planning / Living document
**Created**: 2026-08-07
**Last Modified**: 2026-08-14
**Status**: Active

> **Modification History**
> - 2026-08-14: Audit #5 (post-W12) — AD-17–20; two of the four were made hours earlier by closeout
> - 2026-08-13: Recover the 2026-08-10 (#3) audit that never merged; renumber post-W07 to #4
> - 2026-08-12: Audit #3 (post-W07) — AD-12–16; the entity counter was wrong in every source
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

## 2. 最新快照 — 2026-08-14（**#5**，W12 收尾後）

**基準**：branch `main` · `91dd1cb` · 工作樹 **clean** · **開著的 PR = 0** · 本機分支 **1**（`main`）
**當前 active phase / change / bug = 0** —— `check_status_markers.py` 掃 **18 個 pre-doc**，
`E1/E2/E3/E4 clean`
**本次 PR**：#58（`ea58fdb`）· #59（`91dd1cb`）**皆經 `gh pr view` 驗證為 MERGED**，非採信回報

### 涵蓋聲明

**掃了**（§1 全部 8 個來源）：`BACKLOG.md`（**detector 逐列解析** §Open，非命中數）· `ROADMAP.md`
（逐列比對 ⬜ 項與 §Open 的引用完整性）· `DEFERRED_REGISTER.md`（D001–D005 逐條）·
`RISK_REGISTER.md`（R1–R8 + `Last Reviewed`）· `docs/14-adr/` 全部 `**Status**:` ·
三軌 pre-doc（跑腳本）· `docs/` 全部非終態 `status:` · `decision-form.md`（逐列）。
補充：`git status` / `git log` / `gh pr list --state open`（**0**）·
`schema.prisma` 全部 `^model`（**22**）· **逐個 migration 的 `CREATE TABLE` 加總**（交叉驗證）·
`check_entity_index.py` · `check_backlog_counts.py` · `check_status_markers.py` ·
`apps/**` 與 `scripts/**` 的 `TODO(`/`FIXME`/`HACK(`（**0 命中**）·
**`asset.int.spec.ts` 與 `security.spec.ts` 的測試標題逐條讀**（不是數命中）。

**沒掃到 / 不在範圍**：`docs/02-architecture/` 19 份設計文件的內文一致性（非追蹤來源）·
`reference/` 與 `docs/reference/`（刻意不在版控）· **M0 DoD 第 5 項的 TLS/憑證與管理埠
連續四次審計未取得實據** · branch protection API（本次未重查；PR #58/#59 實測擋與放皆正常）·
**其餘 9 個 int spec 是否也有 `AD-VacuousScopeTest-1` 的空集合問題**（W12 只查了 `audit_log` 一張）。

| 層級 | 數量 | 一句話 |
|---|---|---|
| 🔴 上線硬關卡 | **8** | 4 條設計交付物移植（阻斷 M8）+ `AD-NegativeGate-1`（**刻意保持開啟**）+ `AD-UniqueKeyOracle-1` + **`AD-AuditCoverageOneTable-1`（W12 新增，擋 M1 DoD）** + `AD-RiskForm-1` 等 |
| 🟠 已規劃、未執行 | **56** | P1（+13，自審計 #4 的 43）—— W08–W12 五個 phase 的產物 |
| 🟢 持續技術債 | **36** | P2（+15）|
| ⚫ 卡使用者 / 卡外部 | **2** | `AD-DAST-1` · `AD-IaCEvidence-1` —— **本次未重驗 `security-scan.yml`**（見上方涵蓋聲明），沿用審計 #4 的結論 |
| ⚪ 已實證 defer | **5** | D001–D005；**D002 已於 2026-08-12 恢復**，其餘四條條件**本次逐條複查皆未成立** |
| ⚠️ 漂移發現 | **4** | AD-17 ~ AD-20，見 §2.7。⭐ **其中兩條是我在 W12 closeout 親手造成的** |

> 上表數字由 **`check_backlog_counts.py` 導出**（`run_all` 8 個 detector 之一）：
> **100 列**（P0 **8** / P1 **56** / P2 **36**），宣告值與 §Open 逐列解析相符。
> ⭐ **這是第一次審計不必手數 BACKLOG** —— `CH-027` 的 detector 在此生效。
> **逐項細節一律回該檔看** —— 本檔不複製（§5）。

### 2.1 資料模型：**21 / 35** —— 這次分子是機械導出的

`schema.prisma` 有 **22 個 model**；`check_entity_index.py` 回報 **21 / 35**，
排除 `RefCodeCounter`（**刻意**，detector 自己印出 `excluded (deliberate)`）。
⭐ 審計 #4 的 AD-12 / AD-13（「分子在每份文件都錯」「索引自稱完整但不完整」）
**已由該 detector 關閉，本次複驗未再漂移**。

⛔ **但同一個病換了一個計數器復發** —— `RISK_REGISTER` R4 的「幾張表無稽核」是**另一個**
手寫累加器，它寫 **18**，而逐個 migration 的 `CREATE TABLE` 加總是 **21**
（2·**1**·2·**5**·1·2·2·3·2·1；缺 W03 的 `extension_fields`、W05 記 +3 而實際 5 張）。
W12 closeout 導分母時當場推翻並更正，`AD-RiskTableCountManual-1` 🟢 P2 → 🟡 P1。
⚠️ **那個錯的數字在被更正之前已經傳染到三份文件，其中兩份至今未改** —— 見 AD-18。

### 2.2 ADR

**10 份已採納**（0001 · **0003** · 0004 · 0005 · 0007 · 0010 · 0011 · 0012 · 0013 · 0014）·
**1 份已被取代**（0006 → 0010）· **無 `提案中` 未拍板**。
編號空缺 **0002 / 0008 / 0009** —— `CLAUDE.md` 與 `14-adr/README.md` 皆記為
「待 spike / 待 Wave 3」，**是有解釋的空缺，不是漂移**。三處計數（本檔 · `CLAUDE.md` ×2 ·
`14-adr/README.md`）本次**逐處讀過，一致**。

⭐ **ADR-0003 由 W12 spike 實測後拍板**，是本 repo 第 3 個「先量再寫 ADR」的先例（0004 / 0005 / 0003）。
⚠️ 它的可證偽條件 FC1 / FC2 **需要一個被它否決的實作留在 repo** → `AD-StrategyBSunset-1`（有期限）。

### 2.3 開放決策

`decision-form.md` **開放 2 項**（OQ-7 workflow → ADR-0002 · OQ-8 AI agent → ADR-0008/0009）·
**已拍板 6 項**（OQ-4 於 2026-08-14 由 W12 拍板）。

⛔ **與 `BACKLOG.md` §Pending Decisions 不一致**：該表仍寫「其餘 **3** 項開放決策（OQ-4/7/8）」
—— 見 **AD-17**。⚠️ 這是審計 #2 的 **AD-10 同一個形狀復發**（同一個條件寫在兩處，只改了一處）。

⚠️ 兩項的「誰能決定」欄**仍全是 ⚠️ 未指定**，自 2026-08-07 起十個 phase 未變。

### 2.4 ⏰ 死線

`AD-TrivyExempt-1` **2026-09-07 —— 剩 24 天**。`容器映像 — trivy` 是 required check，
到期時**所有 PR 停止可 merge**。本次無其他寫死日期的觸發條件，亦無已過期未執行者。

⚠️ **新增一個沒有日期的期限**：`AD-StrategyBSunset-1` 的解封條件是「**Wave 1 結束前**」——
那不是一個日期，而 Wave 1 的結束沒有定義在任何地方。⇒ 它有 `AD-DeferralUnwatched-1` 的形狀。

### 2.5 真空白（未規劃亦未設計）

| 缺口 | 狀態變化 |
|---|---|
| **`16` 28 點的自動化 —— 實作** | **未變**。ROADMAP 第 2b / 7 項仍 ⬜。連續 **10 個 phase** |
| **`16` #11–15 的責任邊界拍板** | **未變** —— ROADMAP 第 2c 項仍 ⬜ |
| **Bug 軌從未被使用** | **未變**。`docs/03-implementation/bugs/` 仍只有 `.gitkeep`。**29 個 CH 與 12 個 phase 之後仍為 0** —— 判準至今未被實測 |
| **UI drive-through** | **未變，零次**。W01–W12 全部無 user-facing surface。⚠️ 這**不是違規**（Wave 1 至今沒有 UI），但它是 M8 之前最大的未知數，且**已連續十二個 phase**。⛔ 每一份 phase 報告都寫了 `gate-only verified`，紀律成立 —— 但**約束 3 至今零次被執行過** |

### 2.6 M0 DoD 六項（`07:31`）—— **連續十個 phase 未變動**

**3 關閉 / 2 部分 / 1 無標的**。⚠️ **本次未取得新實據**（`security-scan.yml` 未重掃 —— 見涵蓋聲明），
沿用審計 #4 的結論。判讀不變：**M0 永遠不會靠本專案自己關掉**（#3 無標的、#2 的 DAST 需 infra team）。

⭐ **但 M1 的 gate 狀態本次有變**：`07` §Security gate（「no milestone is done until
**every state change is audited**」）在 W12 之前讓 **M1 的 DoD 結構上不可達** ——
沒有稽核軌跡，建幾張表都沒用。W12 交付機制後它變成 **可達但未達**（覆蓋 1 / 21）。
⇒ 這是十個 phase 以來第一次有里程碑 gate 改變狀態，而**它不是 M0 的**。

### 2.6b W01 / W05 的 `closed_partial` —— 一個對、一個 stale

⭐ **兩個方向都驗了**（§4 硬紀律二），結果分歧，兩個都寫下來：

| Phase | 判定 | 實據 |
|---|---|---|
| **W01** | ✅ **`closed_partial` 是對的** | checklist `:122` 的原始 🚧（本機 docker build）已由 CH-013 解除，但 `:127` **另一項仍未達成**：「DoD 第三項 **base image 釘 digest** —— 現在釘的是 tag」。⛔ **我原本假設它 stale（CH-012 關了 2.3），假設是錯的** —— 同一節裡關掉的是安全標頭那半 |
| **W05** | ⛔ **`closed_partial` 已 stale** | 解封條件是「slice 3 建 `POST /assets` 時同一個 PR 補齊 `AssetGroup`/`Asset` 的四項範疇測試」。**條件已滿足**：`asset.int.spec.ts` 有測試 2（跨實體讀）· 3/6（跨實體寫拒且未落地）· **3b/6b（policy 自己擋，發號器已繞開）** · 7（RLS 獨立於 repository）· 8（滾升只見授權子樹）。W05 checklist `:185` 自己也標了 `🚧→✅ 已於 W06 解封並完成` —— 而 **`plan.md` 的 frontmatter 與內文兩處都沒跟著翻** → **AD-19** |

⛔ **`check_status_markers` 對 W05 是綠的，而它是對的** —— E2 比對的是 frontmatter 與內文**彼此**
是否一致，兩者都寫 `closed_partial`，所以一致。**detector 抓得到不一致，抓不到「一致地過時」。**

### 2.7 ⚠️ 漂移發現（AD-17 ~ AD-20）

> ⚠️ **編號續審計 #4 的 AD-16 之後**，與 §3.1 記的 `#3`/`#4` 衝突無關（那次衝突止於 AD-16）。

**審計 #4 的 AD-12 ~ AD-16 處置複驗**：AD-12 / AD-13 **已由 `check_entity_index.py` 結構性關閉**
（本次 21/35 為 detector 導出，四個月來第一次不必手數）· AD-14 **D002 已恢復** ·
AD-15 無需處置 · ⛔ **AD-16 的兩處未動仍未動**（`design-notes/W02:32` 已修，
`ADR-0004:57` 依慣例不改內文，仍等 ROADMAP 第 9 列的 detector）。

⭐ **本次四條的共同形狀**：審計 #4 是「計數器沒有機械推導」（3/5），本次是
**「條件成立了而沒有人回頭翻」（2/4）＋「我自己在 closeout 造成的」（2/4）**。
⚠️ 值得單獨說的是後者 —— **兩條都是 W12 的 closeout 產生的，而 W12 的 closeout 才過了幾小時**。

| AD | 漂移 | 實據 | 建議 |
|---|---|---|---|
| **AD-17** | **`BACKLOG.md` §Pending Decisions 仍寫「其餘 3 項開放決策（OQ-4/7/8）」，而 OQ-4 已於同一天拍板** —— 同一份文件的另一處（§Shipped 的 W12 列）已寫明「ADR-0003 由實測拍板、OQ-4 關閉」⇒ **同一份檔案內兩處狀態相反** | `BACKLOG.md:278` = 「其餘 **3** 項開放決策（OQ-4/7/8）… OQ-4 需 M3 的稽核軌跡落點」vs `decision-form.md` 已拍板表含 OQ-4（2026-08-14）· `14-adr/README.md` 尚待撰寫 4 → 3 · `BACKLOG.md` §Shipped W12 列 | ⚠️ **這正是審計 #2 的 AD-10 形狀復發**（同一個條件寫在兩處、只改一處）。⛔ 修法不是只改數字 —— `BACKLOG` 那一格本來就在**複製** `decision-form.md` 的內容，違反 §5。應改為只留指標（「開放決策見 `decision-form.md`」）不寫數字 |
| **AD-18** | ⭐⭐ **同一個錯的表數留在兩份活文件裡，而它已經被更正過一次** —— W12 closeout 導出 R4 分母時發現手寫計數 18 是錯的（真值 21）並更正了五處，**但那次更正是針對「1 / N」這個片語，不是針對那個數字** ⇒ 背景敘述句裡的同一個錯誤未被掃到 | `CH-029:13` = 「**nineteen** business tables, 172 integration tests」· `design-notes/W12-audit-trail.md:25` = 「**19 張表**、172 個 int 測試」。⭐ 對照組：**同一天寫的 `ADR-0003:14` 是「twenty tables」（正確）**、`W12 plan:62` 是「20 張表」（正確）⇒ 不是全錯，是**兩份文件錯** | ⚠️ **正確值是 20**（W12 之前的業務表數），不是 19 也不是 21。⛔ **本審計不代改**（§5）。⭐ 這條的教訓比修正本身有價值：**一次更正的掃描範圍必須以「錯的值」為 pattern，不是以「它出現的句型」為 pattern** —— 我當時 grep 的是覆蓋率片語，所以背景句逃掉了 |
| **AD-19** | **W05 的 `status: closed_partial` 在解封條件滿足之後跨了六個 phase 沒有翻** —— 條件是「slice 3 補齊 `AssetGroup`/`Asset` 的四項範疇測試」，W06 就是 slice 3 且**確實補了** | `asset.int.spec.ts` 測試 2 / 3 / 3b / 6 / 6b / 7 / 8 存在（**逐條讀標題確認，非命中數** —— 該檔對 `約束 8` 這個字串 **0 命中**，我第一次因此誤判為缺口）· 該檔由 `8eb8897`（W06）加入 · W05 `checklist:185` 已標 `🚧→✅ 已於 W06 解封並完成` · 而 `W05 plan.md:2` 仍 `closed_partial`、`:14` 仍寫「US-4 部分」 | ⛔ **`check_status_markers` 對此是綠的且它沒有錯** —— E1/E2 比對的是 frontmatter 與內文彼此一致，兩處都寫 `closed_partial`。**detector 能抓「不一致」，抓不到「一致地過時」**。⇒ 候選守衛：checklist 內若不存在任何 `- [ ] 🚧`，而 plan 是 `closed_partial`，即 fail |
| **AD-20** | **`BACKLOG.md` 的 `Last Modified` 是 2026-08-13，而它在 2026-08-14 被 W12 closeout 大幅改過**（新增 5 條 AD、升級 1 條、更新 6 條、新增 §Shipped 一列）| `BACKLOG.md:7` = `**Last Modified**: 2026-08-13` vs `git log -1 --format=%ad -- docs/01-planning/BACKLOG.md` 落在 2026-08-14。對照組：同一次 closeout 改的 `RISK_REGISTER.md` 與 `ROADMAP.md` **都更新了日期**，`BACKLOG.md` 沒有 | 🟢 低嚴重度但**指向一個真的缺口**：三份 living 文件裡只有兩份有人記得改日期，而**沒有任何東西在看** —— 那正是 `AD-RegisterUpkeep-1` 描述的（`Last Reviewed` 落後 N 個 phase 即 fail 的 detector 仍未建）|

> **另記一條未達漂移門檻但值得追的**：`DEFERRED_REGISTER.md` 的 `Last Reviewed` 是 **2026-08-12**，
> 其後 **W08 / W09 / W10 / W11 / W12 五個 phase** 收尾皆未複查。⚠️ 本次逐條看過
> **D001 / D003 / D004 / D005 的恢復條件皆未成立**（D004 等 OQ-7、D005 等第二個 committer
> 或並行 PR —— 本日兩個 PR 是**序列**不是並行），所以**沒有造成錯誤結論**，
> 不列為漂移。但它是 AD-14 的同一個形狀第 2 次，且 `AD-RegisterUpkeep-1` 已預言。

### 2.7b 審計 #4 的 AD-12 ~ AD-16 原始表 —— **刻意留在 §2 而不壓進 §3**

> §3 的規則是「舊快照精簡成 3-5 行，**不要保留全文**」，本節是**有記錄的例外**：
> `BACKLOG.md` 有**兩處**引用 `STATUS_AUDIT.md §2.7` 指名 AD-12 / AD-14
> （檔頭的審計指標 · `AD-DualLayerHighRisk-1` 的來源欄），壓縮或搬走會讓那兩個引用懸空。
> ⭐ **製造一個懸空引用來遵守一條排版規則，正是本檔存在要防的那件事。**
> 解封條件：那兩處引用改為指向 §3 的歷史列之後，本節可壓縮。
>
> 以下**原文一字未改**（§4 硬紀律二）。

> ⛔ **這五個編號與審計 #3（2026-08-10）的 AD-12/12b/13/14 重疊，且指的是不同的事。**
> 需要區分時寫 `AD-12@#4` / `AD-12@#3`。對照表在 §3.1。

> **審計 #2 的 AD-7 ~ AD-11 全部已處置**（2026-08-10 同日）。本次逐一複驗**未再漂移**：
> §Open 列數與實際數相符 · 負面 gate 計數仍集中在 `BACKLOG.md` 一處 ·
> R3 剩餘缺口仍只列 `AD-PoolerScope-1` · Pending Decisions 仍是 3 項 ·
> `CLAUDE.md` 已無 0006 誤列。**AD-8 的「改結構而非改數字」處置經四個 phase 驗證有效。**

⭐ **本次五條的共同形狀與上次不同。** 審計 #2 的五條全部是「剛做完的收尾沒推到底」；
本次有 **三條是「計數器沒有機械推導」**（AD-12 · AD-13 · AD-15），
而且其中兩條**橫跨多個 phase 沒有人察覺**。

> ### ✅ 處置 — AD-14 已於 2026-08-12 同日拍板（使用者）
>
> **下表 AD-14 的「發現」與「建議」欄刻意保留原文**（§4 硬紀律二）。
>
> **裁決**：D002 / OQ-3 選項 C 的恢復條件是「**證據表出現**」，**不是** M3 里程碑。
> W07 建了 `evidence` → **條件成立，D002 恢復**。
>
> | 落點 | 動作 |
> |---|---|
> | `DEFERRED_REGISTER.md` D002 | 標 `已恢復 → BACKLOG`（**不刪列**，規則 3）+ 錨點 `:197` → `:212`（AD-16 同時關閉）|
> | `DEFERRED_REGISTER.md` frontmatter | `Last Reviewed` 2026-08-10 → **2026-08-12**，四條未成立者已逐條看過 |
> | `BACKLOG.md` | 新增 `AD-DualLayerHighRisk-1`（🟡 P1）|
> | `decision-form.md` OQ-3 | 選項 C 那句同步標解封 —— **兩處寫同一個條件正是 AD-10 的病**，這次同時改 |
>
> ⛔ **只做登記，不開工**：ADR-0004 否決 C 的實質理由是「一個不可證偽的防護層就是 AP-3」，
> 所以第一步是**定義第二層要抓什麼 RLS 抓不到的東西**，不是直接寫程式。
>
> ### ✅ 處置 — AD-12（部分）與 AD-16（部分），2026-08-12 同日（使用者裁決）
>
> | AD | 做了什麼 | **刻意沒做什麼** |
> |---|---|---|
> | **AD-12** | 兩個**活的導航面**改為機械真值 **12/35**：`CLAUDE.md` Current-Phase 格 · `ROADMAP.md` 主線第 4 列。⚠️ 只改 `CLAUDE.md`（原本的請求範圍）會讓兩個活面互相矛盾 —— **那正是本條的病**，故一起改 | ⛔ **導出機制未建**（今天的 12/35 仍是人算的，只是算對了）· `CH-022:190` 的 8→10/35 **未改**（已 merge 的歷史快照）→ `AD-EntityCountDerivation-1`，**排 slice 5 Day 0** |
> | **AD-13** | 無 | 全部 → `AD-EntityIndexIncomplete-1`，**排 slice 5 Day 0**（與上一條同一個 detector）|
> | **AD-16** | `design-notes/W02-entity-scope-rls.md:32` 的錨點 `:197` → `:212`，並補上「條件已解封」的指標（**活參考該準**）| ⛔ **`ADR-0004:57` 未動** —— 已採納的 ADR 不回頭改內文（`AD-OpensslClaim-1` 先例），**留給 ROADMAP 第 9 列的 detector 當驗收命中** |
>
> **AD-15 無需處置** —— 錯的是審計 #2 的報告，本次已改用 `git ls-files` / `git ls-tree` 導出。

| AD | 漂移 | 實據 | 建議 |
|---|---|---|---|
| **AD-12** | ⭐⭐ **Wave 1 實體計數在每一份文件都是錯的，而且各處互相矛盾**。機械真值 **12 / 35**（11 共用核心 + 1 基礎服務）。⛔ **我在 W07 closeout 親手把錯的數字寫進了 `CH-022` 與 `CLAUDE.md`** | `schema.prisma` `^model` = **13**；扣掉不在索引上的 `RefCodeCounter` = 12 落在索引內。vs `CH-022:190`「8 → **10** / 35」· `CLAUDE.md` Current Phase「**10**/35」。⚠️ **W06 當時兩份文件就已互相矛盾**：`git show 3a3606b:CLAUDE.md` = 「**8**/35 實體；其餘 27 張表」而同一個 commit 的 `CH-021:189` = 「累計 8 → **9** / 35」 | ⭐ **不要只改數字** —— 那正是審計 #2 的 AD-8 已經證明無效的做法（同一個手動計數器寫在多處必然再漂）。應改為**由 `schema.prisma` ∩ `02a` §0 機械導出**，或**只在一處維護**其餘 link。⚠️ 這個數字出現在 CLAUDE.md 的 always-loaded 格子裡，錯的版本每個 session 都在被讀 |
| **AD-13** | **`RefCodeCounter` 存在於 schema 但不在 `02a` §0 索引上**，而該索引開宗明義寫「**Every entity in the platform** … Nothing is buildable that is not on this list; **adding an entity means adding a row here in the same change**」 | `schema.prisma` 有 `model RefCodeCounter`（建於 W04，`7251670`）；`02a` 全文對 `RefCode` 只命中 `:91` / `:105` / `:287` / `:313` 四處**欄位說明**，§0 三張索引表**零命中** | 補一列，或明確記錄它是「基礎設施表非領域實體、刻意不入索引」。⚠️ **兩者都可以，但必須擇一寫下** —— 現狀是索引宣稱自己完整而事實上不完整，這讓 AD-12 的分子永遠算不準 |
| **AD-14** | **`DEFERRED_REGISTER.md` 停更四個 phase，而其中一條的恢復條件已字面成立**。D002（ADR-0004 選項 C 雙層強制）寫恢復條件為「**稽核 / 證據 / 事件表出現時**（M3）」—— **W07 建了 `evidence`** | `DEFERRED_REGISTER.md:6` `Last Reviewed: 2026-08-10`，其後 W04/W05/W06/W07 四個 phase 收尾皆未複查（對比 `RISK_REGISTER.md` 本次已更新為 2026-08-12）。`schema.prisma` `model Evidence` 存在。同一條件亦寫在 `decision-form.md:45`（OQ-3 選項 C「延後至 M3（稽核/證據表出現時才有標的）」）| ⚠️ **判定需要人**：字面條件成立（證據表存在），但括號的「（M3）」指向的是里程碑而非單一張表，而 M3 未到。**這正是 §0 列的「Deferred 解封條件過期」失效模式** —— 兩份文件寫同一個條件、四個 phase 沒人回頭翻。⛔ 審計不代為判定 |
| **AD-15** | **審計 #2 自己的報告帶了一個錯的計數** —— §2.10 第 6 項寫 i18n「**7 檔**」，而它自己的基準 `bf3133e` 當下就是 **5 檔** | `git ls-tree -r --name-only bf3133e -- apps/web/src/i18n/` = **5**；`git log --diff-filter=D -- apps/web/src/i18n/` = **零刪除紀錄**，故「曾有 7 檔後來刪了 2 個」被排除 | ⚠️ **本檔 §4 硬紀律三要求「輸出必須帶實據」，而這一格沒有** —— 一份審計報告若自己的計數是錯的，讀的人沒有辦法發現。本次已改為 `git ls-files` 導出。**這是 `AD-GrepAssertion-1` 在審計自身的第二次再現**（審計 #2 也記過一次，見該節 ⚠️ 自我修正） |
| **AD-16** | **`multi-tenant-data.md:197` 這個錨點指向錯的內容，而且被引用了 3 次** —— 三處都說該行「指名高風險表三類（稽核／證據／事件）」，實際那一行講的是滾升風險 | `:197` = 「具體風險：滾升現在只是一個少了 `WHERE entity_id` 的查詢」；三類的實際位置是 **`:212`**（「高風險表（稽核軌跡 / 證據 / 事件）\| **兩者都用**」），偏 **15 行**。三處引用：`DEFERRED_REGISTER.md` D002 · `design-notes/W02-entity-scope-rls.md:32` · **`14-adr/0004-entity-scoping-enforcement.md:57`** | ⛔ **本列的原始版本只寫了 D002 一處，那是我掃描範圍過窄** —— 從 D002 的引用查起，沒有全 repo 反查同一個錨點。**這正是本檔 §4 硬紀律三警告的形狀，發生在審計自己身上**（與 AD-15 同一族）。**已修 1 處**（D002，因為 AD-14 的處置正在改寫那一列，留著已知錯誤等於明知而傳播）；**W02 design note 與 ADR-0004 兩處未動**。⚠️ ADR **已採納**，本專案慣例不回頭改其內文（`AD-OpensslClaim-1` / `AD-EslintSettingsClaim-1` 先例）—— 需要一次決定：註記 vs 不動。⭐ 三處合起來是 ROADMAP 第 9 列 detector 的**現成驗收命中**（連同 `02a:413` 與 W01 的兩個失效 SHA）|

### 2.8 優先序建議

⭐ **這次的候選不是兩個而是一個，而且它是新出現的** —— `ROADMAP` 第 **4c** 項
（`AD-AuditCoverageOneTable-1`，W12 新增，🔴 P0）。

| 候選 | 論據 | 反論據 |
|---|---|---|
| **A. 接上其餘 20 張表的稽核**（`ROADMAP` 4c）| ⭐ **它是唯一一個擋著里程碑 DoD 的 P0**：`07` §Security gate 現在是「可達但未達」，而在 W12 之前它是「不可達」—— **十個 phase 以來第一次有 gate 可以被本專案自己推動**。機制與攔截點都在，`AUDITED_MODELS` 是一行 | ⚠️ **不是純機械工作**：每張表都要確認三個已知限制可接受（`before` 永遠 NULL · `after` 是請求的 payload · `resource_id` 對 create 不可得）。且 R4 只會從 1/21 走向 21/21，中間每一步都仍是「部分」 |
| **B. M1 slice 9..N**（`ROADMAP` 第 4 項，▶）| 21 / 35 已建，其餘 14 個沒有已知的未解機制問題 —— 是複製不是探索 | ⛔ **每建一張表就讓 A 的分母變大一次**，而 R4 的歷史正是「敞口逐 phase 擴大而沒有 gate 會叫」。先做 B 等於重演那個模式 |
| **C. `16` B 類三點 + N 類拍板**（2b/2c）| 直接動 M0 DoD 的分子 | ⚠️ 治理／工具工作，吃 `CH-017` 每 phase 1 個的配額；且 M0 另外兩項不是本專案能關的 |

**建議 A，而且理由與前四次審計都不同**：前四次的建議都是「繼續建表」，因為沒有任何 gate 會因為
不建而變差。**這次相反** —— B 會主動讓 A 變貴，而 A 是十個 phase 以來第一個本專案能自己推動的
里程碑 gate。

⚠️ **附帶條件**：A 開工前先處理 `AD-VacuousScopeTest-1` 的回頭檢查（其餘 9 個 int spec
是否也有空集合假性通過）。⭐ 那個檢查**必須在接更多表之前做** —— 接完再查，
你會有 21 張表的四項範疇測試而不知道其中幾項是空集合上的真。

**⏰ 唯一有日期的死線**：`AD-TrivyExempt-1` **2026-09-07（剩 24 天）**。

### 2.9 一個值得單獨說的觀察

**本次四條漂移裡有兩條（AD-18 · AD-20）是我在幾小時前的 W12 closeout 親手造成的**，
而 AD-18 更尖銳：**那個錯誤在同一次 closeout 裡已經被發現並更正過一次**，
只是更正的掃描範圍是「覆蓋率片語」而不是「那個錯的數字」。

> **一次更正的 pattern 必須是「錯的值」，不是「它出現的句型」。**

⚠️ 這與審計 #4 的觀察是同一族的下一層。#4 說「數字在但沒有來源」；
本次說 **「來源修好了，而傳染出去的副本沒有被同一次動作覆蓋」**。
⭐ 兩者都不會有任何 gate 叫，而**兩者都是在寫文件時發生的，不是在寫 code 時**
—— W12 的 retrospective 自己記了這一點（前三天四次「先懷疑儀器」都做到，closeout 掉線）。

---

## 3. 歷史快照

<!-- 舊快照精簡成 3-5 行放這裡，保 audit trail。不要保留全文。 -->

| 日期 | 基準 sha | 當時 active | 漂移數 | 一句話 |
|---|---|---|---|---|
| 2026-08-14 (#5) | `91dd1cb` | 0 | 4 | W12 收尾後。100 條 open AD（P0 8 / P1 56 / P2 36，detector 導出）；⭐ **本次四條有兩條是「條件成立了但沒有人回頭翻」**（W05 的 `closed_partial` 早在 W06 解封、`DEFERRED_REGISTER` 停更跨五個 phase），另兩條是**我自己在 W12 closeout 造成的**（同一個錯的表數留在兩份活文件、BACKLOG header 日期沒跟上）。⭐⭐ **兩個「疑似漂移」被實據推翻**：W01 的 `closed_partial` 是**對的**（digest 釘定仍未做），`asset.int.spec.ts` 的四項範疇測試**存在**（我第一次用的 pattern 太窄）。M0 仍 3/2/1 未動（連續**十個** phase）|
| 2026-08-12 (#4) | `d7733b5` | 0 | 5 | W07 收尾後。69 條 open AD；⭐ **三條漂移是「計數器沒有機械推導」**（實體數在每份文件都錯且互相矛盾、`RefCodeCounter` 不在自稱完整的索引上、審計 #2 自己的 i18n 計數是錯的）；`DEFERRED_REGISTER` 停更四個 phase 且 D002 的恢復條件字面已成立；M0 仍 3/2/1 未動（連續五個 phase）。⚠️ **原標 `#3`，2026-08-13 改號** —— 見 §3.1 |
| 2026-08-10 (#3) | `a2b1906` | 0 | 3 | W04 收尾後。56 條 open AD（P0 5 / P1 34 / P2 17）；⭐ **三條漂移有兩條在追蹤文件自己身上** —— `RISK_REGISTER` 整個 W04 未被複查（**而 phase closeout 流程從來沒有要求過**），本檔自己的 i18n「7 檔」實據從第一次審計起就是錯的；M0 仍 3/2/1 未動。⛔ **這份報告從未進 main**，2026-08-13 才自 `docs/status-audit-20260810-3`（`31f76e2`）撿回 —— 見 §3.1 |
| 2026-08-10 (#2) | `bf3133e` | 0 | 5 | W03 收尾後。53 條 open AD；**五條漂移全部由 W03 自己的 closeout 造成**（關閉的 AD 未移出 §Open、負面 gate 計數 5→6 未同步、R3 引用已關閉的 AD）；M0 仍 3/2/1 未動 |
| 2026-08-10 (#1) | `568589d` | 0 | 6 | 首次審計。48 條 open AD；三份追蹤文件（ROADMAP / RISK / DEFERRED）**從未被使用**；M0 停在 3/2/1 未動 |

### 3.1 撿回 — 2026-08-10（#3）審計，以及它造成的編號衝突

**做了什麼**：2026-08-13 依使用者裁決（`AD-LostAudit20260810-1`）把該次審計**登記進歷史表**，
並把後來的 2026-08-12 那次由 `#3` 改號為 `#4`。**兩份報告的內文都不改**。

**為什麼是改後面那次而不是前面那次**：`#3` 這個標籤已經被 W05 的三份**已收尾**紀錄
指向 2026-08-10 那次（`W05 checklist:321` 的 `AD-12b（審計 #3）` · `plan:356` · `progress:40`
與 `:202` 的「審計 #3 記的 P1 34 / P2 17」—— 那組數字正是本次撿回的報告寫的）。
改前面那次會讓四處已封存的引用同時失效；改後面那次只需動三行**活文件**
（`BACKLOG.md` ×2 · `DEFERRED_REGISTER.md` ×1），且讓 W05 的引用**從懸空變成可解析**。
⚠️ 代價：`W08 plan.md:25` 的「審計 #3 的收尾 commit」自此指向 #4 —— **已收尾紀錄，刻意不改**
（`CH-022:190` 先例）。

> ⛔ **AD 編號無法用同樣方式修好。** 兩次審計**都從 AD-12 編起**，
> 而 `AD-12`/`AD-13`/`AD-14` 在兩邊是**完全不同的三件事**。
> 兩邊都已被引用（#4 的 AD-12–16 在 `BACKLOG.md:13`；#3 的 AD-12b 在 W05 checklist），
> **重編任何一邊都會弄斷另一邊**。故：**保留兩套編號，用審計序號消歧**，
> 下一次審計自 **AD-17** 起編（見 §6 第 5 條）。

| 審計 #3（2026-08-10）的發現 | 今日狀態 | 實據 |
|---|---|---|
| **AD-12@#3** — `RISK_REGISTER` 在 W04 closeout 完全未複查；R4 仍寫「W02 已建**兩張表**」而實際 5 張 | 🟡 **一半已解** —— 數字早已跟上（R4 今日為 **12 張**，`Last Reviewed: 2026-08-13`），但**它建議的結構性修法沒做**：R4 的表數仍是手寫計數器 | `RISK_REGISTER.md:6` · R4 列逐 phase 手寫累加「W02 兩張 → W04 +2 → … → W08 +2」→ 新開 `AD-RiskTableCountManual-1` |
| **AD-12b@#3** — 上一條是結構性的：Phase 軌 closeout **從來沒有要求過**複查 `RISK_REGISTER`；三個收尾面零命中 | ✅ **已關閉** —— W05 照它的建議加了一列 | `retrospective.md.tpl:120` 「⭐ **`RISK_REGISTER.md` 已複查**」；`W05 checklist:321` 記為 `AD-12b（審計 #3）` |
| **AD-13@#3** — 本檔 §2.10 的 i18n「7 檔」實據是錯的，**從第一次審計起就錯** | ✅ **已關閉（重複發現）** —— 審計 #4 以 `AD-15` 獨立再發現一次並改用 `git ls-files` 導出 | 本檔 §2.7 `AD-15`；兩次的結論與實據一致 |
| **AD-14@#3** — 該次審計用 `grep -c "🔴 P0"` 得 **0**（實際 5），emoji 在該 pipeline 下不匹配 | 🟡 **升級** —— 這是 `AD-GrepAssertion-1` 在**審計自身**的第 **2** 次，使審計 #4 的 `AD-15` 成為第 **3** 次 | 審計 #4 的 `AD-15` 自稱「第二次再現」，是**在不知道本次存在的情況下**寫的 → 依 `.claude/rules/README.md` 強度階梯 ≥3 次應改結構性解法 |

⭐ **根因不在編號程序，在「這份工作從未被 merge」。** 審計 #4 讀 main 上的 `STATUS_AUDIT.md`，
看到最後一筆是 #2 / AD-7–11，於是從 #3 / AD-12 接下去 —— **它的推論完全正確，錯的是它的輸入**。

⚠️ **同一次分支清理找回了兩樣東西，成因相同**：本次審計，以及
`AD-RebaseMergeBranchCheck-1`（寫於 W03，在未 merge 的分支上躺了五個 phase）。
**沒有被 merge 的分支不會有任何東西提醒你它存在** —— 而這兩件都是「用來防止漏看的東西」本身被漏看。
**這是本專案第二次證明「清理分支是一種稽核」。**

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
5. ⛔ **推上去並 merge —— 沒有 merge 的審計等於沒發生過。**
   序號與 `AD-N` 都是**接續 main 上的最後一筆**往下編的，所以一份停在本機分支的審計
   不只是「還沒發表」，它會讓**下一次審計把同一組號碼再發一次**。
   2026-08-10 的 #3 就是這樣消失的（§3.1）。
   Merge 之後跑一次 `git cherry main <branch>` 確認 0 個未合併 patch，再刪分支。
6. **編 `AD-N` 之前先讀 §3 歷史表取「歷來最大號」**，不要讀「上一份快照的最大號」——
   兩者在正常情況下相同，而它們**不同的那一次**，正是有東西沒被 merge 的那一次。

> **漂移編號用 `AD-N`（Audit Drift），只增不重用。**
> 刻意避開 backlog / deferred / risk 既有的命名空間 ——
> 來源專案有過同一個編號被用兩次，而且因為已被多處引用而不敢重編。
>
> ⚠️ **2026-08-13：上面這句話在本專案應驗了。** `AD-12`–`AD-14` 被發了兩次，
> 兩套都已被引用，因此**兩套都不敢重編** —— 現況是靠審計序號消歧（§3.1）。
> **這條警語從第一天就寫在這裡，而它沒能防止它自己描述的事。**
> 會防住的是第 5 條，因為那一條有動作、不是提醒。
