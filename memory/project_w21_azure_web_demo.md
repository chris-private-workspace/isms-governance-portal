# W21 — Azure web demo（一個真的能打開的網址）

**Phase**: W21 · **Closed**: 2026-08-18 · **PR**: PR-pending · **Status**: `closed_partial`
**權威來源**: [`W21-azure-web-demo-deploy/retrospective.md`](../docs/01-planning/W21-azure-web-demo-deploy/retrospective.md)
**Change record**: [`CH-041`](../docs/03-implementation/changes/CH-041-project-writes-its-own-iac.md)
**資源與重建**: [`infra/azure/README.md`](../infra/azure/README.md)

---

## 一句話

`apps/web` 上了 Azure Container Apps，**29 / 29 路由對真實網址走查通過** ——
而本片真正的收穫是**四次「工具說謊」**與一個**負面測試差點假通過**。

---

## ⭐⭐ 核心一：在宣告「遠端壞了」之前，先換一個不經過同一個本機元件的觀測管道

四個實例，同一天，同一個形狀：

| # | 症狀 | 真相 | 揭穿它的獨立管道 |
|---|---|---|---|
| 1 | `az acr build` 噴 `charmap codec can't encode '▲'` | **本機 az CLI 在 cp1252 console 印 log 時崩潰**，雲端 build 正在跑 | `az acr task list-runs` 的 status |
| 2 | 真實網址 `fetch failed` / `curl` 回 `000` | **企業 TLS 攔截**（SSL inspection，自簽 CA 不在信任庫）| `curl -k` → 200，0.29 秒 |
| 3 | `/controls/NOPE-9999` 回 **200** | Git Bash 的 **MSYS 路徑轉換**把 URL 改寫成 `C:/…/Git/controls/NOPE-9999` | `MSYS_NO_PATHCONV=1` |
| 4 | 負面測試的陽性對照回 **404** | **我自己的 JSON 跳脫壞掉** —— PowerShell 把 `\"` 原樣傳給 curl ⇒ body 非法 ⇒ `.catch(()=>null)` ⇒ 404 | 先跑陽性對照 |

⭐ 第 2 個同時解釋了 Day 0 的「本機連不到任何 `*.azurecr.io`」——
而**當時抓對診斷的是對照組**：既有的 `acrrci3ailanding1` **同樣**不可達。
沒有那個對照組，「這台機器的網路有問題」會變成「我把 ACR 建錯了」，然後刪掉重建一個正常的資源。

⛔ **第 4 個與前三個不同類，而且更危險**：前三個是**外部工具**騙我，
第 4 個是**自己的指令**騙我 ⇒ 「換一個獨立觀測管道」對它**無效**（管道沒問題，**輸入**有問題）。
且它產生的是「**負面測試通過**」—— 最不會被回頭質疑的一種結果。
→ **負面測試必須先跑陽性對照**（`AD-NegativeTestNeedsPositiveControl-1`）

---

## ⭐⭐ 核心二：三-prong grep 產出 0 條，五條 drift 全來自「建一個空 RG 再刪掉」

Prong 1 十項如預期、Prong 2 五項如預期、Prong 3 N/A。**不是 prong 失效** ——
本片**產品程式碼零變更**，plan 對 repo 的斷言幾乎不可能漂移；變異來源在 repo **外面**。

抓到全部五條的是 plan §8 R1 排的**權限實測**：

- **`D-perm-scope`** ⭐⭐ —— **推翻了使用者的宣稱**。權限是 **RG scope 的 Contributor**，
  不是 subscription scope ⇒ 能建**資源**，不能建**容器**
- **`D-rg-map`** —— southeastasia 只有**一個**可寫 RG，且它是 N8N 專案的 ⇒ ISMS 寄居其中
- **`D-acr-unreachable`** ⭐ —— 見上，**自帶對照組**
- **`D-az-packer-glob`** —— 同一份 `.dockerignore`，**docker 與 az 讀出不同結果**
  （`az acr build` 不套用 `**/`）
- **`D-identity-mismatch`** —— 兩個訂閱以**不同身分**解析同一個 az session

→ `AD-Day0ProngsMismatchScopeClass-1`：Day-0 的 prong 組合應該跟著 scope class 走；
`integration-with-external` 的第一個 prong 是**一次會失敗的最小實驗**，不是 grep。

---

## M0 DoD 的兩格同時動了

- **#5（TLS／憑證／管理埠不得沿用預設）🟡 仍是「部分」** —— 卡了 **20 個 phase** 是因為
  「沒有部署環境時結構上沒有標的」，現在有標的了，而**只有兩個子項真的是明確選的**：
  **ACR admin 關閉**（既有那個是**開的**）· **scoped pull token**
  （不是 admin credential；managed identity **權限上不可能** —— 指派 AcrPull 需要
  `Microsoft.Authorization/*/Write`，那正是 Contributor 的 `notActions` 第一條）·
  **`allowInsecure: false`** + HSTS。六條安全標頭**對真實網址複驗**，無 `x-powered-by` / `server`。
  ⛔⭐ **而憑證那個子項是平台預設，那正是本條原文禁止的東西** —— 實測 `customDomains: null`、
  environment `certificate list` 回 `[]` ⇒ Azure 為它自己的網域自動簽，我們沒做過任何選擇。
  ⚠️ 「沒選」在這裡不是懈怠：預設網域上結構性地沒有第二個選項（要自帶憑證得先有自訂網域）
  ⇒ **R7 的形狀** → `AD-AcaManagedCertIsPlatformDefault-1`。⚠️ **仍缺 CSP**
  - ⛔ **本檔第一版寫「✅ 關閉，三項都是明確選的」** —— 同日 status audit #7 自我更正。
    教訓：**「我們設定了 TLS 政策」與「我們選了憑證」是兩件事，而 DoD 原文管的是後者。**
- **#3（IaC skeleton scanned）** —— 從「⛔ 結構上無標的」變成「**有標的且已量測**」。
  `CH-010:51`「本專案不寫 IaC」**不再成立** ⇒ `AD-IaCEvidence-1` **不關閉而是分裂成兩半**：
  RIT 的資源仍等對方證據 / 我們自己的 IaC **今天才存在**。落地當天實測**零掃描器覆蓋**
  （semgrep 只掃 `apps packages scripts`、`trivy config` 讀不懂 shell）⇒ 加 `infra` 進 semgrep，
  **PR #84 的 CI log 量到 `bash 4 rules / 1 file`、0 findings**
  （`provision.sh` 是四個掃描目錄下唯一的 `.sh`）。
  ⚠️ **4 條規則 vs TypeScript 的 164 條** —— 覆蓋是真的，厚度是另一個問題

---

## AC-6：那個守衛終於被行使過了

`assertDemoAuthAllowed` 自 W19 存在、被 W21 部署上線，而**從未被證明會擋任何東西**。

移除 `DEMO_AUTH` ⇒ `POST /api/demo-session` **200 → 500 且無 `Set-Cookie`**（`DELETE` 同），
**而 `/` 與 `/login` 仍 200** ⇒ 對照組排除了「容器根本沒起來」。復原後 smoke probe PASS。
⭐ 500 的 body 是空的 —— 守衛的錯誤訊息沒有外洩。

⛔ **順帶量到一個 orphan export**：`demoAuthAllowed()` 的 docstring 寫 "For layouts"，
**零呼叫端**。它要填的正是實測量到的缺口 —— 守衛擋住後端時，`/login` 仍渲染六個會 500 的按鈕。
→ `AD-DemoAuthUiUnguarded-1`（AP-7，繼承自 W19）

---

## ⛔ 為什麼是 `closed_partial`

- **US-2 / AC-3（CI 自動部署）一行未寫** —— `az ad app create` 回 `Insufficient privileges`，
  GitHub Actions 沒有 Azure 身分。⭐ **刻意不先寫 workflow 檔**：
  一條永遠不會執行的 pipeline 就是 AP-3
- **AC-4 半綠** —— 冪等實跑 `created 0 / existing 4` ✅；「乾淨 RG」半邊**做不到**
  ⇒ `provision.sh` 的 **create 分支從未被執行過**（Day 1 是手打 `az`，腳本是事後固化）

---

## Calibration ⛔ 0.58 UNDER —— 而這個點作廢

`integration-with-external` 第 1 個資料點，**兩個獨立汙染源**：

1. **分子是下限** —— 五段有四段由 commit author date 反推。
   `AD-CalibrationNoTimeRecord-1` **第 3 次**，且 plan §7 寫了「這次改在每個 Day 收尾當下記」
   然後照樣沒做到 ⇒ **「在 plan 裡寫得更用力」已被實測否證兩次**，升級為機械強制
2. ⭐ **分母涵蓋了沒做的東西** —— bottom-up 的 11 hr 有 **3 hr 是 CI**，而 CI 一行未寫。
   換成已交付範圍：8 × 0.70 = 5.6 ⇒ ratio **0.79，落在 band 內**

⇒ **`closed_partial` 的 phase 照公式算 ratio 會系統性地看起來很快**（分子跟著縮，分母不縮）。
→ `AD-PartialPhaseRatioArtifact-1`：一律同時算兩個 ratio，只有「已交付範圍」能進 3-phase 窗口。

---

## ROADMAP 9b 終於被裁決（漏了 3 次）

**維持 `rebase`。** 理由不是慣性，而且它一直沒被寫下來過：
**一條直線比 DAG 容易對稽核人員證明「什麼時候發生了什麼」**，而這是一套 ISMS 平台。
接受 SHA 改寫的代價（已付 11 次），**配套是錨點改用 author date + subject**
（W14 已量到它逐秒不受 rebase 影響），SHA 只當索引。

⚠️ 第 4 次沒有發生的唯一原因是它被寫進 checklist §4.2 的一個具名 `[ ]` ——
**ROADMAP 的列不是 checklist 的列**（第 4d 列的警語再次成立）。

---

## 檔案變更

| 檔案 | 動作 |
|---|---|
| `infra/azure/provision.sh` · `infra/azure/README.md` | 新增 |
| `.github/workflows/security-scan.yml` | 修改 —— semgrep 目標加 `infra`（使用者核可改 CI）|
| `.env.example` | 修改 —— 補 5 個**已有消費者**的變數 |
| `docs/03-implementation/changes/CH-041-*.md` | 新增；`CH-010` 加後繼指標（**原文一字未改**）|
| `apps/web/**` · `apps/api/**` | **UNTOUCHED** —— 產品程式碼零變更 |

---

## Carryover

- `AD-CiDeployIdentityMissing-1` 🟡 —— **另開一片**（使用者裁定）
- `AD-ProvisionCreatePathUnexercised-1` 🟡 —— 解封條件：取得第二個可寫 RG
- `AD-IaCScanCoverageUnmeasured-1` 🟡 —— **關閉條件是讀 PR 的 CI log**，不是完成那個 edit
- `AD-NegativeTestNeedsPositiveControl-1` 🟡 · `AD-DemoAuthUiUnguarded-1` 🟢 ·
  `AD-PartialPhaseRatioArtifact-1` 🟢 · `AD-StopAndAskNotEvidenced-1` 🟢 ·
  `AD-Day0ProngsMismatchScopeClass-1` 🟢
- **關閉**：`AD-DemoAuthGuardUntested-1` ✅ · **ROADMAP 9b** ✅
