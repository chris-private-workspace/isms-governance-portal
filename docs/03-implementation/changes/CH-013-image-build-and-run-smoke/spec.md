---
status: approved   # proposed | approved | active | done | cancelled —— 機器可讀的唯一權威
affects_components: []
---

# CH-013 — 讓 CI 真的 build 這兩個 image，並且啟動它們

**Date**: 2026-08-09
**Phase**: 無 —— 獨立 Change（W01 已 `closed_partial`）
**Scope**: 工具鏈（CI workflow + container）— **NO migration** · **NO 新依賴** · **不動 apps/ 原始碼**
**Status**: 已核准（laitim2001 於 2026-08-09 核可；三個範圍決策同日拍板）
**PR**: —

---

## Problem

`apps/api/Dockerfile` 與 `apps/web/Dockerfile` 於 W01 出貨，**沒有任何自動化會 build 它們**。
CI 的 `Build` 步驟跑的是 `npm run build`（`ci.yml:194`），那是 tsc / `next build` ——
它證明 TypeScript 編得過，**不證明多階段 COPY 的路徑對、runtime 層有它需要的檔案、
或 entry point 存在**。容器掃描 job 依設計只掃 base image 不 build（`security-scan.yml:286-291`）。

**這不是理論風險。W01 已經修過兩個只有 build 才會暴露的缺陷**，而兩個都是**碰巧**
跑了一次 build 才發現的：

| 缺陷 | 症狀 | 錨點 |
|---|---|---|
| `-slim` base 缺 OpenSSL | Prisma 偵測不到 libssl 版本 → 抓錯 engine | `apps/api/Dockerfile:50-53`（註解原話：*Caught by running the build, not by reading the Dockerfile*）|
| `USER` 未明寫 | trivy config + semgrep 同時報 | `apps/api/Dockerfile:96-100` |

而**「build 成功但產物起不到」在 W01 也真的發生過**：`apps/api/package.json` 的 `start`
指向 `dist/main.js`，nest 實際 emit 的是 `dist/bootstrap/main.js`。gate 全綠，修在 `08ddc0f`。
那次是本機 drive-through 抓到的 —— 容器裡沒有人在開車。

### 這一項擋著三個 AD

| AD | 目前狀態 | 本 CH 的作用 |
|---|---|---|
| `AD-ImageBuild-1` 🟡 | 開啟 —— Dockerfile 正確性要到**部署當天**才驗證 | **關閉**（它自己列的兩個解法之一：加 build-only job，不推送）|
| `AD-NegativeGate-1` 🔴 | 3/5 覆蓋（CH-012 交付） | 推進到 **4/5** —— 剩餘兩項之一正是「build 產物真的能啟動（要 CI 內起 DB）」|
| `AD-SecScan-1` 🟡 | 部分關閉 | 推進 —— 其完全關閉條件是「DAST 有 job **且** 有地方會 build 這兩個 Dockerfile」，本 CH 關掉後者 |

---

## Root Cause

**為什麼當初的設計會留下這個洞**，而不是「還沒做」：

1. **取捨被明寫，但那個「另行決定」從未被做出。** `security-scan.yml:290-291` 原話：
   > **已知缺口**：build 過程 `apt-get install` 進去的套件不會被覆蓋。
   > 要補就要真 build —— **屬另行決定**，不可以靜靜當已覆蓋。

   這句話誠實地標了缺口，也誠實地把決定推遲了。問題是**沒有任何東西會提醒那個決定該做**
   —— 它只存在於一段註解裡，直到 W01 retrospective 把它寫成 AD 才重新浮現。

2. **本機 build 被公司 proxy 的容器內 TLS 攔截擋住**（容器內沒有公司 CA），
   所以唯一能跑 build 的地方是 CI，而 CI 沒有人去接。開發者能跑的驗證與
   CI 該跑的驗證之間出現了一個沒人負責的縫。

3. **`npm run build` 與 `docker build` 的差異沒有被明說**，所以「Build 步驟是綠的」
   讀起來像是「產物沒問題」。這正是 `AD-NegativeGate-1` 的共同結構：
   **外層 EXIT=0 讀起來像通過**。

---

## Solution

### 範圍決策（使用者 2026-08-09 拍板）

| 決定 | 選了 | 放棄了 |
|---|---|---|
| 接線位置 | **獨立 workflow `image-smoke.yml`** | 併進 `ci.yml` 當平行 job（我的原建議）。使用者選獨立 —— build 失敗不混進 CI 的訊號 |
| 涵蓋範圍 | **api + web 兩個 image 都 build、run、探測** | 只做 api（會讓 `AD-ImageBuild-1` 只關一半） |
| trivy 完整 image 掃描 | **不做** | 見 §明確不做的 |

> 📌 **獨立 workflow 的代價，明寫而非事後發現**：`AD-CIRequired-1`（CI 尚未設為
> required status check）的待辦清單因此**多一項** —— 日後設 required check 時要設兩個
> workflow 而不是一個。已寫進 §Impact。

### Day-0 changelog（R3 —— 實測推翻的假設保留原文，不回頭改寫）

| # | 原本寫的 | 實測 | 對範圍的影響 |
|---|---|---|---|
| D-1 | §關鍵設計細節第 1 點擔心「DB 連不上 → 容器起不來」 | **bootstrap 存活**，`/health` 回 `{"status":"up","db":"down"}` | 擔憂不成立，**但 DB 仍必須起** —— 理由換成「元驗證 3 需要區分 `db:"up"` 與 `db:"down"`，否則 openssl 缺失與沒有 DB 產生相同輸出」 |
| D-2 | §關鍵設計細節說「探測要斷言內容不只狀態碼」 | 更嚴重 —— 拿掉 `.next/static` 後 `GET /` **連位元組數都相同**（5824），文案照樣在 | web 探測必須**兩段**，第二段 URL 從 HTML 抽取（chunk 名 hash 化） |
| D-3 | `AD-ImageBuild-1` 稱兩個 image 都被 proxy 擋 | **web image 本機 build EXIT=0**；api 擋在 `prisma generate` 下載 engine binary | 元驗證 1/2 在本機做，**只有元驗證 3 必須在 CI** |
| D-5 | §逐項變更第 2 點「探測邏輯形狀待 Day 0 決定」 | 決定：**Node 腳本** | 判準由 D-3 直接回答 —— web 元驗證可在本機重複執行 |

> **D-6 是唯一無法在本機關閉的未知**：api image 在 CI 能否 build 成功。
> runner 無公司 proxy，**預期**可達 `binaries.prisma.sh` —— 但那是預期不是實測。
> 若 CI 也失敗，本 CH 範圍要重新評估（改 Dockerfile 避免 build 期下載 engine 是另一個決定）。

### 逐項變更

**1. `.github/workflows/image-smoke.yml`（新）** — 對兩個 Dockerfile 各做 build → run → probe。

為什麼是**新 workflow 而不是新 job**：使用者拍板。附帶好處是它可以有自己的
`timeout-minutes` 與觸發條件，不必遷就 `gates` job 的形狀。

⚠️ **必須在檔頭重述 `ci.yml:3-10` 的「不用 paths filter」設計決策** ——
那個決策的理由（docs-only PR 不觸發 → required check 從未回報 → PR 卡在 BLOCKED）
對新 workflow 一樣成立，而它現在只寫在 `ci.yml` 的檔頭。
不重述的話，下一個人會很合理地想「build image 的 workflow 當然要加 paths filter」。

**2. 探測邏輯** — 形狀待 Day 0 決定（inline shell vs `scripts/*.mjs`）。

判準與 CH-012 的 `assert-boundary-gate.mjs` 相同：**跨平台需求**。若探測只在 CI 的
ubuntu runner 跑，inline shell 可接受；若要能在開發機重現（受 proxy 限制，很可能不行），
則需要 Node 腳本。Day 0 P4 決定，理由寫進 checklist。

**3. `docs/01-planning/BACKLOG.md`** — 三個 AD 的狀態同步（見上表）+ 新增 trivy 完整 image 的 AD。

### ⭐ 關鍵設計細節

這一節列的是**待 Day 0 驗證的承重假設**。標 ⚠️ 者若不成立，範圍要回頭改而不是硬闖。

- **⚠️ API 容器沒有 `DATABASE_URL` 會在建構期 throw** —— `prisma.service.ts:43-48` 明寫
  「Fail loudly at construction」。所以 smoke test **必須**提供 DB 連線字串。
  **但更關鍵的未知是 `onModuleInit` 的 `$connect()`**（`prisma.service.ts:52-54`）：
  連不上時 Nest 的 bootstrap 會不會直接失敗？若會，就必須在 CI 內起真的 PostgreSQL；
  若不會，可以用一個指向不存在 DB 的字串跑更便宜的 smoke。**Day 0 P2 實測，不要推理。**

- **⚠️ `docker/compose.yml` 綁 `127.0.0.1:5433`**（`compose.yml:29`）。CI 內若 api 跑在容器裡、
  DB 也跑在容器裡，`127.0.0.1` 在容器內指的是容器自己。網路形狀（共用 network / `--network host`
  / GitHub Actions `services:`）**Day 0 P3 實測**。
  ⛔ 不得為了讓它通而改 `compose.yml` 的 bind 位址 —— 那個 `127.0.0.1` 是刻意的
  （`compose.yml:12-13`：不讓開發機在共享網路上公開一個資料庫），為 CI 放寬它
  等於把安全預設值改成方便值。要另起 CI 專用的網路設定。

- **⚠️ distroless runtime 沒有 shell、沒有 curl、沒有 wget**（`apps/api/Dockerfile:27-32`）。
  所以：**不能**用 shell 形式的 `HEALTHCHECK`，**不能** `docker exec … curl`。
  探測只能從 host 打 published port。這也表示 `docker run` 之後需要一個等待迴圈，
  不能靠 Docker 的 health status。

- **⭐ 探測必須斷言內容，不能只看 HTTP 狀態碼。** 這是 CH-012 直接學到的教訓
  （只斷言 exit code 不夠 —— 語法錯也會 exit 1）。`/health` 回 200 但 body 是錯的、
  或 web 回 200 但少了 `.next/static` 導致無樣式，都必須被抓到。
  具體斷言內容 Day 0 P5 從真實回應決定，**不從記憶寫**。

- **⭐ 這個 gate 自己也要被弄壞過一次。** `AD-NegativeGate-1` 的整個命題是
  「宣稱會擋住某件事的機制，必須附一個會被它擋住的常駐負面案例」。
  一個從沒紅過的 smoke test 就是下一個 Potemkin。元驗證方式見 §Verification。

- **web 容器是否需要 API 才能啟動** —— 未知。W01 的頁面會顯示 API 與 DB 兩個狀態值，
  但那是 client-side fetch 還是 server-side render 決定了 web 容器能不能獨立起來。
  Day 0 P6 驗證。若需要，兩個容器要一起起。

### 明確不做的

| 不做 | 去向 |
|---|---|
| **trivy 掃完整 image**（不只 base）| 新 AD。第一次掃完整 image 會涵蓋應用層 `node_modules` 與 `apt-get` 裝進去的套件，很可能噴出一批現存 findings —— 那需要 `security-scan.yml:13-37` 明訂的分流窗口五步，混進本 CH 會讓它收不掉 |
| **push image 到 registry / ACR** | ADR-0011 的部署工作，不是 smoke test |
| **DAST** | `AD-DAST-1`（且被私有 VNet 擋著，需要 self-hosted runner） |
| **digest pinning** | W01 已記的 follow-up（`apps/api/Dockerfile:37-40`） |
| **多平台 build（arm64）** | 無需求。ADR-0011 的 Container Apps 跑 amd64 |
| **把 smoke 設成 required status check** | `AD-CIRequired-1` —— 那是一次性設定全部 required check 的事，且要先觀察幾個 PR 週期 |

---

## Verification

### Gate

<Day 4 填實際數字，含 baseline 對照>

`type-check` — · `run_all` —/6 · api test — passed（baseline 20）· web test — passed（baseline 10）· build clean

### 新增測試

<Day 4 填>

⚠️ 本 CH 的「測試」主要是 CI workflow 本身，不是 jest/vitest 案例。
若 Day 0 決定用 Node 腳本做探測，該腳本要有自己的單元測試（CH-012 的 `assert-boundary-gate.mjs`
沒有 —— 那是本次可以做得比上次好的地方，但**不強制**，視腳本複雜度決定，理由寫進 checklist）。

### 元驗證 ⭐ 這是本 CH 唯一有效的證明

三個獨立的「弄壞它看它紅」，每個對應一類真實失效：

| # | 弄壞什麼 | 預期 | 對應真實缺陷 |
|---|---|---|---|
| 1 | 把 `apps/api/Dockerfile` 的 `CMD` 指向不存在的檔 | build 綠、**run 紅** | W01 的 `start` 指錯 entry（`08ddc0f`）|
| 2 | 拿掉 `apps/web/Dockerfile:48` 的 `.next/static` COPY | build 綠、run 綠、**探測紅** | 「頁面開得起來但沒樣式」這一類 |
| 3 | 拿掉 `apps/api/Dockerfile:54-56` 的 openssl 安裝 | **build 或 run 紅** | W01 已修過的真實缺陷，用它驗 gate 抓不抓得到 |

**每一個都必須還原並確認轉綠。** 沒做過這三項，本 CH 不得標 done。

### Drive-through（user-facing 時 MANDATORY）

**Verdict**: ⚪ N/A —— CI 基礎設施，結論一律寫 **gate-only verified**。

> 📌 值得註記的是：**本 CH 交付的東西本身，就是把 drive-through 的一部分自動化**。
> 它做的正是「開真產物、走主路徑、看它真的活著」，只是駕駛員是 CI 不是人。
> 但這**不表示**本 CH 自己被 drive-through 過 —— 那兩件事不可混為一談。

### ⚠️ Drive-through 抓到而 gate 沒抓到的

<Day 4 填。沒有的話寫「無 —— gate 與元驗證結論一致」。>

---

## Impact

- **Breaking change**: no
- **Migration required**: no
- **Config change**: 無新增環境變數進 `.env.example`。CI 內的 DB 連線字串是 workflow-local 的
  測試值，**不得**成為專案設定的一部分
- **重啟需求**: N/A
- **CI 時間**: 新 workflow 預估 3-6 分鐘（Day 0 P1 實測後回填）。**與 `gates` 平行，
  不延長現有關鍵路徑**
- **`AD-CIRequired-1` 的清單 +1** —— 日後設 required status check 時要設兩個 workflow
- **Rollback**: 刪掉 `image-smoke.yml` 單一檔案，~2 分鐘。無其他檔案依賴它

---

## 相關

- **關掉的 AD**: `AD-ImageBuild-1`
- **推進的 AD**: `AD-NegativeGate-1`（3/5 → 4/5，**不關閉**）· `AD-SecScan-1`（部分）
- **產生的待辦**（→ `docs/01-planning/BACKLOG.md`）: trivy 完整 image 掃描 + 其分流窗口
- **Design note**: 無 —— 本 CH 不是 spike（既有機制的接線，非新領域探索）
- **Phase**: 無 active phase。W01 `closed_partial` 的 🚧 Dockerfile build 驗證由本 CH 關閉
