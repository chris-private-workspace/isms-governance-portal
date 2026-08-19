# CH-032: 換掉等不到重建的 base image，而不是把到期日往後推

**Date**: 2026-08-15
**Phase**: 無 —— 獨立 CH（W14 已收尾，無 active phase）
**Scope**: CI / 容器映像（`.github/workflows/security-scan.yml` §container-scan 的掃描標的）
**Components**: —
**PR**: **MERGED** (PR #66, `52a74ac`) —— 2026-08-15

> ⚠️ **本檔目前是 pre-doc（R1 gate）** —— §Solution 是**計畫**、§Verification 是**預定驗收**。
> 執行後兩節改為實測值。**使用者 approve §Verification 的驗收條件之後才動 code。**

---

## Problem

`.trivyignore.yaml` 的六條 `libssl3` 豁免 **2026-09-07 到期**（本文件寫成當日起算 **23 天**）。

⛔ **到期的後果不是「CI 有個叉」**：`容器映像 — trivy` 自 `CH-015` 起是 **required check**，
所以豁免一過期，**所有 PR 停止可 merge** —— 包含任何進行中工作的收尾 PR。

該檔 `:33-34` 自己寫了解除程序，且明確禁止其中一條路：

> On expiry: re-pull the base and re-scan. If distroless has rebuilt, delete this whole file.
> If not, the decision is escalated — **do NOT extend the date without re-triaging each entry.**

**照著跑了那個程序**（讀 image 內的 `dpkg` 資料庫，非推論）：

| Base image | OpenSSL 套件 | 版本 |
|---|---|---|
| `gcr.io/distroless/nodejs22-debian12:nonroot`（**目前出貨用的**）| `libssl3` | **3.0.18-1~deb12u2** ← 與 W01 寫下的**逐字相同** |
| `gcr.io/distroless/nodejs22-debian12:latest` | `libssl3` | 3.0.18-1~deb12u2 |
| `gcr.io/distroless/nodejs24-debian12:nonroot` | `libssl3` | 3.0.18-1~deb12u2 |
| **`gcr.io/distroless/nodejs22-debian13:nonroot`** | **`libssl3t64`** | **3.5.6-1~deb13u2** |

⇒ **distroless 的 Debian 12 線一個都沒重建**，七天零進展 ⇒ 「刪整個檔案」這條路**不成立**。
⇒ 剩下的兩條是「換 base」與「逐條重新分流」。**使用者 2026-08-15 裁決：先試換 base**。

---

## Root Cause

**不是「distroless 太慢」。** 根因是**一個豁免的解除條件完全依賴我們控制不了的上游動作**，
而它同時綁著一個硬性到期日與一個 required check —— 於是「上游不動」這個最可能的結果，
會在到期當天把整個 repo 的 merge 能力關掉。

W01 當時的判斷本身是對的（`.trivyignore.yaml:18-21` 明確指認這是「第三種情況」——
Debian 發了修正而 distroless 沒重建，我們這一層無可升級）。**它缺的是 fallback**：
檔案只寫了兩條出路，其中一條需要上游配合、另一條需要人，
而**沒有任何東西會在到期日之前提醒任何人去走第二條**。

⭐ 更深一層，這與 `AD-ImageDigest-1`（base 釘的是 tag 不是 digest）互為表裡：
釘 tag 讓「上游一重建就自動變綠」成為可能，**也讓「上游沒重建」只在到期當天才現形**。
兩個性質相反的結果共用同一個沉默的機制。

---

## Solution（**計畫，待 approve**）

把兩個 Dockerfile 的 **runtime base**（各自的最後一個 `FROM`）從 Debian 12 換到 Debian 13，
讓既有的兩個 required check 回答「這條路通不通」——⛔ **不靠推論，靠量測**。

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/api/Dockerfile:93` | 修改 | `FROM gcr.io/distroless/nodejs22-debian12:nonroot` → `-debian13:nonroot` |
| `apps/web/Dockerfile:41` | 修改 | 同上 |
| `.trivyignore.yaml` | **刪除**（僅在驗收 1 通過時）| 六條豁免的標的（`libssl3` 3.0.x）不再存在於出貨映像中 |

**為什麼是換 base 而不是延期**：延期需要對六條逐條寫出**新的**論證，
而其中五條今天的理由仍然只是「等上游」—— 那不是重新分流，那是把同一句話配一個新日期，
正是該檔禁止的事。⭐ 唯一有版本無關理由的是 `CVE-2026-31789`（32-bit 前提在 amd64 不成立），
**一條**。

**為什麼是 debian13 而不是 nodejs24**：本次只換 OS 層，不動 Node 主版本 ——
兩個變數一起動的話，紅燈無法歸因。

⚠️ **load-bearing 細節**：`security-scan.yml:319` 只取每個 Dockerfile 的**最後一個 `FROM`**
（實際出貨的 runtime base，刻意放寬，明寫在該處）。所以 build stage 維持
`node:22.21.0-bookworm-slim` 不動 —— 它不在掃描範圍內，也不在 production 攻擊面上。

---

## Verification（**預定驗收 —— 這是 R1 gate 的內容，請 approve**）

**Gate（本機，push 前實測 —— 各自 exit code 分開取）**：
`run_all` **0**（8/8）· `type-check` **0** · `lint` **0** · api unit **480 / 40 suites** ·
web **10 / 1** —— ⭐ **與 baseline 逐位相同**，符合「純 Dockerfile 改動不該動到任何本機 gate」的預期。

⚠️ **本機沒跑 api int（218/17）**，明寫而不是含糊帶過：它需要本機 PostgreSQL，
而本次改動不進 jest 的執行路徑（jest 不讀 Dockerfile）。**CI 的 `gates` job 會跑它** ——
驗收條件 3 涵蓋這一項。

**驗收條件**（CI 上的 required check 就是量測工具）:

| # | 條件 | 為什麼它是這條路通不通的判準 |
|---|---|---|
| **1** | `容器映像 — trivy` **PASS**，且 **`.trivyignore.yaml` 已從 repo 刪除** | ⛔ 帶著豁免檔的綠燈不算數 —— 那不能區分「新 base 乾淨」與「舊豁免還在生效」。**必須是刪掉豁免之後的綠** |
| **2** | `映像 build + 啟動探測` **PASS** | 這是 Prisma query engine 的量測。`schema.prisma:51-54` 的 `generator client` **沒有 `binaryTargets`** ⇒ 用 `native`，而 build stage 是 OpenSSL 3.0.x、runtime 換成 3.5.x。⚠️ **我沒有驗過這能不能起，這一項就是那個驗證** |
| **3** | 其餘四個 required check（`gates` · gitleaks · SCA · SAST）**不變** | 換 base 不該影響它們；有變動即為未預期的副作用 |
| **4** | ⛔ **若 1 或 2 紅 → 回滾 base，把實測錯誤訊息記進本檔，改走「逐條重新分流」** | **不修改驗收條件去遷就結果**。紅燈是實據不是失敗 |

**⚠️ 執行前寫下的第二個預測**（⛔ **本節在 push 之前 commit，時間戳可查**）:

`security-scan.yml:325` **無條件**傳 `--ignorefile .trivyignore.yaml`，而該檔將不存在
（同一個 step 的 `:303` 印豁免清單那段**有** `[ -f ]` 保護，掃描那一行沒有）。

> **預測**：trivy **靜默忽略**不存在的 ignorefile ⇒ 掃描正常執行，job 的紅綠由 CVE 決定。
> **若預測錯** ⇒ trivy 會 FATAL，`|| rc=1` 讓 job 紅，而 log 會明說原因。
> ⛔ **那種紅燈不觸發驗收條件 4 的回滾** —— 它不是 base image 的問題，是 workflow 的
> 一個未被觸發過的假設（豁免檔從 W01 起一直存在，所以那一行從未在檔案缺席時跑過）。
> 修法會是給那一行同樣的 `[ -f ]` 保護，並記為新發現。

**⛔ 本 CH 尚未驗證的事，明寫**：那六條 CVE 對 `libssl3t64` 3.5.6 是否仍適用，**我沒有驗過**。
本機 trivy 撞到企業網路的 TLS 攔截（漏洞 DB 下載失敗），而**不用 `--insecure` 繞過** ——
對一個安全掃描工具關掉憑證驗證會違反 guardrail 1。⇒ **驗收條件 1 就是那個未做的驗證**，
由 CI 上沒有攔截的 trivy 執行。

### 執行結果 — 第 1 輪（PR #66，2026-08-15T15:28Z）

⛔ **上面兩個預測的原文一字未改** —— 一個中、一個錯，錯的那個更有價值。

| 預測 | 實際 | |
|---|---|---|
| **(2) Prisma engine 在 OpenSSL 3.5.x 上起得來** | `映像 build + 啟動探測` **PASS**（1m53s）| ✅ **命中**。`native` binary target 在 build stage（OpenSSL 3.0.x）解析、runtime（3.5.x）執行，沒有問題 ⇒ **不需要 `binaryTargets`** |
| **(1) trivy 靜默忽略不存在的 `--ignorefile`** | ⛔ **`FATAL flag error: unable to convert flags to options: ignore file not found: .trivyignore.yaml`** —— 兩個 image 各 FATAL 一次，**13 秒** | ❌ **錯了** |

⭐⭐ **這個錯誤的後果比它的內容重要**：trivy FATAL ⇒ **掃描根本沒有跑**，
於是 `容器映像 — trivy` 的紅燈**與任何 CVE 無關**。
⛔ **那是最壞的一種紅燈** —— 它看起來像掃描器說了話，而掃描器根本沒開口。

⚠️ 依本檔 push 前寫下的裁定，**這不觸發驗收條件 4 的回滾**：它不是 base image 的問題，
而是 `security-scan.yml:325` 一個從 W01 起從未被觸發過的假設 —— 該行**無條件**傳
`--ignorefile`，而同一個 step 的 `:303`（印豁免清單）**有** `[ -f ]` 保護。
豁免檔自 W01 起一直存在，所以那一行**從來沒有在檔案缺席的情況下跑過**。

### 修法（使用者裁決 B，2026-08-15）

**保留 `.trivyignore.yaml`，但豁免清單為明確的空**（`vulnerabilities: []`），
⭐ **`security-scan.yml` 一行未改**。

| 選項 | 為什麼不選 |
|---|---|
| A. 改 workflow，檔案不存在就不傳 `--ignorefile` | ⚠️ 讓 flag 變成有條件的，削弱 `:322-323` 明寫的原意（「被靜音了什麼**不該取決於某個檔案剛好在 cwd**」）。而且**這個修正本身需要一個負面案例才能證明它有效** —— 又一個 `AD-NegativeGate-1` 的形狀 |
| B ✅ | 「今天不豁免任何東西」是**版控中的一句陳述**，而檔案不見了是**沉默**。⭐ 這與 ADR-0014「缺席即最嚴格」是同一個分辨的反向：那裡缺席**更嚴格**所以缺席是對的，這裡缺席讓工具**停止工作**，所以明確的空才是對的 |

⚠️ **驗收條件 1 的字面（「已從 repo 刪除」）因此改判為它的實質**：
掃描結果**不得由任何豁免促成**。`vulnerabilities: []` 完全滿足這一點 ——
六條豁免確實不存在了，而檔案作為記錄留下。**這是有記錄的偏離，不是放寬。**

### ⚠️ 第 3 個預測（**本節在下一次 push 之前 commit**）

> **預測**：trivy 接受 `vulnerabilities: []` 這個明確的空清單，掃描正常執行，
> `容器映像 — trivy` 的紅綠自此**真的由 debian13 base 的 CVE 決定** ——
> 也就是**驗收條件 1 第一次真的被回答**。
> ⛔ **我沒有驗過 trivy 對空清單的 schema 解析** —— 這正是預測 1 出錯的同一類假設，
> 所以這次先寫下來。若它仍 FATAL，修法改為 A，且本檔記為第 2 次同類失誤。

### 執行結果 — 第 2 輪（PR #66，2026-08-15T15:43Z）—— **六個 required check 全 PASS**

**預測 3 ✅ 命中**：trivy 接受 `vulnerabilities: []`，掃描正常執行（**31s** vs 第 1 輪的 13s FATAL）。

⛔ **綠燈不是證據，數字才是** —— 逐處讀了 job log：

```
##[group]目前生效的容器掃描豁免（含到期日）        ← 空的（grep 零輸出）
##[group]./apps/web/Dockerfile -> gcr.io/distroless/nodejs22-debian13:nonroot
│ gcr.io/distroless/nodejs22-debian13:nonroot (debian 13.6) │ debian │ 0 │
##[group]./apps/api/Dockerfile -> gcr.io/distroless/nodejs22-debian13:nonroot
│ gcr.io/distroless/nodejs22-debian13:nonroot (debian 13.6) │ debian │ 0 │
```

三件事各自被看到，而不是從綠燈推出來的：
**(a)** 豁免 group **空的** ⇒ 綠不是任何豁免促成的 ·
**(b)** 兩個 Dockerfile 各**真的掃了一次**（有 Report Summary，18s 掃描時間）·
**(c)** `Vulnerabilities` = **0**（HIGH/CRITICAL + `--ignore-unfixed`）。

⭐ **本 CH 開頭明寫「我沒有驗過」的那一項，現在有答案了**：
那六條 CVE **對 `libssl3t64` 3.5.6 不適用** —— 由 CI 上沒有 TLS 攔截的 trivy 回答，
而不是由我從版本號推論。

| 驗收 | 結果 |
|---|---|
| **1** trivy PASS 且不靠豁免 | ✅ **0 個 HIGH/CRITICAL**，豁免清單為空（⚠️ 字面改判為實質，見上方修法節） |
| **2** 映像 build + 啟動探測 | ✅ **PASS**（1m55s）—— Prisma engine 在 OpenSSL 3.5.x 上起得來 |
| **3** 其餘四個 required check 不變 | ✅ `gates` 2m17s · SCA · gitleaks · SAST **全 pass** |
| **4** 紅則回滾 | ⚪ **未觸發** |

⚠️ **順帶看到但不是新發現**：job log 尾端的
`Node.js 20 is deprecated ... actions/checkout@v4` 是 `AD-ActionsNode-1`，已在 §Open 上。

**Drive-through**: ⚪ N/A —— CI / 容器設定，無 user-facing surface。
**Verdict**: ✅ **PASS** —— 四項驗收全數滿足，**每一項都有 log 實據**，非採信綠燈。
⚪ 純 CI / 容器設定，**gate-only verified**，不暗示任何 user-facing 可用性。

---

## Impact

- **Breaking change**: no（runtime OS 層更換，應用程式介面不變）
- **Migration**: no
- **Config**: 無新增 / 變更的環境變數
- **重啟需求**: 部署層 —— 下次映像 build 生效；本機開發不受影響（本機不用 distroless）
- **Rollback**: 兩行 `FROM` 改回 debian12 + 還原 `.trivyignore.yaml`（git revert 一個 commit）。估時 < 5 分鐘

---

## Out of scope

- **釘 digest**（`AD-ImageDigest-1`，W01 checklist `:127` 的未達成項）—— ⛔ **刻意不在本 CH**：
  換 base 的當下釘 digest 會**同時關掉**「上游重建 ⇒ tag 自動指向新映像 ⇒ 自動變綠」這條路，
  而那條路在本 CH 失敗時是有價值的退路。兩個決定分開做
- **Node 主版本升級**（nodejs24）—— 見 §Solution 的歸因理由
- **build stage 的 base**（`node:22.21.0-bookworm-slim`）—— 不在掃描範圍，且換它會改變編譯環境

---

## 相關

- **關掉的待辦**: `AD-TrivyExempt-1`（僅在驗收 1 + 2 通過時；否則它仍開著且理由更新）
- **同類前例**: `CH-015`（把 trivy 設為 required check —— 本 CH 的緊迫性完全來自那個決定）·
  `CH-013`（映像 build + 啟動探測 —— 本 CH 的驗收條件 2 用的就是它交付的 gate）
- **產生的待辦** → `docs/01-planning/BACKLOG.md`
- **來源**: 跨來源審計 #6（`STATUS_AUDIT.md` §2.4 / §2.8 候選 A），使用者 2026-08-15 裁決
