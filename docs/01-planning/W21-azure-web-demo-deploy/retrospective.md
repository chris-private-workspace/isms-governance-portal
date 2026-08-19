# Phase W21 — Retrospective

**Phase**: W21 — deploy the web demonstration to Azure Container Apps
**Period**: 2026-08-18 ~ 2026-08-18
**Plan**: [plan.md](./plan.md)
**PR**: #84 — **MERGED** 2026-08-18T07:08:46Z（rebase-merge，tip `700ef62`；`gh pr view` 驗證 `state=MERGED`）
<!-- 2026-08-19（W22 post-merge）補翻：本行在 W21 closeout 當下標的是 PR-pending，而**整個 W22 期間沒有任何東西發現它是假的** → AD-StalePrPendingNoDetector-1 -->

**Change record**: [`CH-041`](../../03-implementation/changes/CH-041-project-writes-its-own-iac.md)

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 公開可存取的網址，29 路由全部可用 | ✅ 完成 |
| US-2 | `deploy-web.yml`，一次真實觸發驗證過 | ⛔ **未開始** |
| US-3 | `provision.sh` + `README.md`，冪等性實測過 | 🚧 部分 |
| US-4 | DEMO 標示在真環境確認 + `DEMO_AUTH` 負面測試 | ✅ 完成 |

| AC | 狀態 |
|----|------|
| AC-1 HTTPS 200 + smoke probe PASS | ✅ |
| AC-2 逐頁可達 / 無 console error / DEMO 標示 | ✅ **29 / 29 可達，DEMO 標示 28 / 29**（`/` 是 W01 骨架驗證頁，有自己的聲明）|
| AC-3 push 觸發部署，Actions log 含 probe PASS | ⛔ **未達成** |
| AC-4 `provision.sh` 第二次為 no-op | 🚧 **半綠** —— no-op 半邊實跑 `created 0 / existing 4`；乾淨-RG 半邊**無法驗證** |
| AC-5 ACR `adminUserEnabled: false` · ingress `allowInsecure: false` | ✅ 且**每次重跑都重新斷言** |
| AC-6 未設 `DEMO_AUTH` 時登入被拒 | ✅ **Day 4 實跑**：200 → **500 無 cookie** → 復原 200 |

**未完成項目**：

- **US-2 / AC-3（CI 自動部署）** —— ⛔ **阻塞在憑證，不是阻塞在工作量**。
  `az ad app create` 回 `Insufficient privileges`：建 app registration 需要目錄權限，
  本身分沒有 ⇒ OIDC 路線需要 RIT。剩兩條路都需要使用者提供憑證。
  ⭐ **刻意不先寫 workflow 檔** —— 一條永遠不會執行的 pipeline 就是 AP-3。
  → `AD-CiDeployIdentityMissing-1`，使用者 2026-08-18 裁定**另開一片**
- **AC-4 的乾淨-RG 半邊** —— Day-0 `D-rg-map` 量到 southeastasia 只有一個可寫 RG
  ⇒ `provision.sh` 的 **create 分支從未被執行過**（Day 1 是逐條手打 `az`，腳本是事後固化）
  → `AD-ProvisionCreatePathUnexercised-1`

⇒ **phase 狀態 `closed_partial`**。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `integration-with-external`（**第 1 個資料點**）
- **Agent-delegated**: `no`（plan 宣告值，實際亦為 no）
- **Bottom-up est**: 11 hr（資源 2 · CI 3 · 安全 1 · drive-through 3 · closeout 2）
- **Committed (calibrated)**: 7.7 hr（mult 0.70）
- **Actual**: **~4.45 hr** —— Day 0–3 ~3.15 hr（**由 commit author date 反推**，
  `a401215` 08:54:13 → `7da314f` 12:03:08）+ Day 4 ~1.3 hr（**唯一真的量到的一段**）
- **Ratio**: 4.45 / 7.7 = **0.58**
- **Band 判定**: **UNDER**（< 0.7）

**發生了什麼**：

⛔ **0.58 這個數字不該被用來調乘數，理由有兩個，而第二個比第一個重要。**

1. **分子是反推的下限。** 五段時間裡四段來自 commit author date ——
   `AD-CalibrationNoTimeRecord-1` **第 3 次**。plan §7 寫了「這次改在每個 Day 收尾當下記」，
   然後照樣沒做到。**寫在 plan 裡的提醒，對「當下要不要停下來記一筆」這個決定沒有作用力**
   —— 這已經是第 2 次以同一種方式失效（W15 也是）。
2. ⭐ **分母涵蓋了沒做的東西。** bottom-up 的 11 hr 裡有 **3 hr 是 CI**，而 CI 一行沒寫。
   拿掉它：committed = 8 × 0.70 = **5.6 hr** ⇒ ratio = 4.45 / 5.6 = **0.79，落在 band 內**。

⇒ **「UNDER」是範圍縮減的假象，不是速度的訊號。** 而這個形狀值得記下來：
`closed_partial` 的 phase 若照公式算 ratio，會**系統性地看起來很快** ——
因為分子跟著縮，分母不跟。

**行動**: **等更多資料點**。本點以 **CONTAMINATED / 僅供參考**登記，
`integration-with-external` 的 0.70 **不動**。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] |R − 1.0| > 30% → AD 已記入 `BACKLOG.md`（`AD-PartialPhaseRatioArtifact-1`）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**5**（Prong 1: **0** / Prong 2: **0** / **權限實測（0.2）: 5**）
- Day-0 成本：~32 min
- **預防的返工**：~2.5 hr
- **ROI**: ~**4.7×**

⭐⭐ **本片最該記住的一件事：三-prong grep 的產出是零，五條 drift 全部來自 0.2 的權限實測。**

Prong 1 / Prong 2 的十項全部「如預期」—— 那不是失敗，是它們在**這一類 phase** 上本來就
沒有東西可抓：本片**產品程式碼零變更**，plan 對 repo 的斷言因此幾乎不可能漂移。
真正的變異來源在 repo 外面（Azure 的權限、配額、網路、CLI 行為），
而抓到它的是 plan §8 R1 排的那個**空 RG 建了再刪**的實測。

⇒ **Day-0 的 prong 組合應該跟著 scope class 走**：`integration-with-external` 的第一個 prong
不是 grep，是**對外部系統做一次會失敗的最小實驗**。

**最有價值的那個 drift**：**`D-acr-unreachable`** ——
不是因為它最嚴重（`D-perm-scope` 更嚴重），而是因為**它自帶對照組**。
新建的 `acrismsgovdemo` 與**既有的** `acrrci3ailanding1` 同樣 `curl` 回 `000`；
沒有那個對照組，正確的診斷（這台機器的網路）會變成錯誤的診斷（我把 ACR 建錯了），
而後者會導致刪掉並重建一個完全正常的資源。

⚠️ **一個必須誠實記下的程序偏差**：plan §8 R1 寫「**失敗即停下來問，不猜測**」。
Day 0 的權限實測**確實失敗了**（且失敗內容與使用者的宣稱相反），
而工作以「挑唯一可寫的 RG」繼續下去。結果是對的，但**紀錄裡看不出這一步有沒有回頭問過**。
→ `AD-StopAndAskNotEvidenced-1`

---

## Q4 — 做得好的（保持）

- ⭐ **每次診斷「遠端壞了」之前，先換一個不經過同一個本機元件的觀測管道。**
  本片四次用上它：`az acr build` 的 `charmap` ERROR（換 `az acr task list-runs`）·
  真實網址 `fetch failed`（換 `curl -k`）· `/controls/NOPE-9999` 回 200
  （換 `MSYS_NO_PATHCONV=1`）· Day 4 的 404 假陰性（換陽性對照）。
- ⭐ **負面測試帶陽性對照 + 帶對照組。** 移除 `DEMO_AUTH` 的同時確認 `/` 與 `/login` 仍 200
  —— 沒有它，500 可以是「守衛擋住了」也可以是「容器沒起來」。
- ⭐ **安全設定寫成「每次重跑都重新斷言」而不是「create 時設一次」。**
  M0 DoD #5 要的是「現在是對的」，不是「曾經設對」。
- **image tag 用 commit SHA 不用 `latest`** —— 「線上跑的是哪一版」隨時答得出來。
- **`CH-010:51` 的文字刻意不改**，改用後繼記錄 + 雙向連結 —— 保住「當初依據什麼決定」。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | `infra/` 由 `README.md` 的重建流程引用，非旁支 |
| AP-2 Cross-directory scattering | 0 | 部署相關全部在 `infra/azure/` |
| AP-3 Potemkin | **1** | ⛔ **`provision.sh` 的 create 分支從未被執行過** —— 冪等分支與兩個 `die` 斷言有實跑，create 分支沒有。「關掉它會壞什麼」對 create 分支**答不出來**。⚠️ 環境限制（只有一個可寫 RG），非取捨 → `AD-ProvisionCreatePathUnexercised-1` |
| AP-4 PoC accumulation | N/A | |
| AP-5 Speculative abstraction | 0 | 腳本的 9 個 env 覆寫點是**今天就在用**的（不同 RG / 不同 tag），非為未來預留 |
| AP-6 Mock vs real divergence | N/A | 本片零 mock —— 全部對真 Azure |
| AP-7 命名 / orphan claim | **1** | **繼承的，非本片造成**：`demoAuthAllowed()`（`demo-session.ts:70`）docstring 寫 "For layouts"，而全 `apps/web` **零呼叫端**。⭐ **是本片的 drive-through 抓到的**，且它要填的正是本片量到的缺口 → `AD-DemoAuthUiUnguarded-1` |
| **總計** | **2** | 1 個本片產生（AP-3，環境限制）· 1 個繼承（AP-7，W19） |

**Lint**: 見 §gate 射程聲明。

### ⛔ gate 射程聲明（`AD-LocalGateSetIncomplete-1` 要求）

| Gate | 在哪裡跑得到 | 本片狀態 |
|---|---|---|
| `format:check` · `lint` · `type-check` · `test` · `build` | 本機 + CI | ✅ 本機實跑 |
| `python scripts/lint/run_all.py` | 本機 + CI | ✅ 本機實跑 |
| `image-smoke.yml`（docker build + 探測）| ⛔ **只在 CI** | 未在本機驗證 |
| `security-scan.yml` 的 gitleaks / semgrep / trivy | ⛔ **只在 CI** | 未在本機驗證 |
| **semgrep 對 `infra/` 的覆蓋** | ⛔ **只在 CI，且本機無 semgrep** | ⚠️ **加了目標 ≠ 產生覆蓋** —— 答案在 PR 的 CI log |
| `provision.sh` 的 create 分支 | ⛔ **只在一個不存在的乾淨 RG** | ❌ **從未執行** |
| `DEMO_AUTH` 負面測試 | ⛔ **只在真 Azure**（需要中斷示範環境）| ✅ **Day 4 實跑** |

⇒ **「gate 全綠」在本片是「本機 gate 全綠」。** 三項只在 CI 成立、一項在任何地方都未成立。

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-CiDeployIdentityMissing-1` | CI 沒有 Azure 身分 ⇒ US-2 整段阻塞 | 向 RIT 索取 federated credential，或使用者提供 SP secret（後者須明記為 guardrail 7 的讓步）| 候選（**卡外部**）|
| `AD-ProvisionCreatePathUnexercised-1` | `provision.sh` 的 create 分支零執行 | 取得第二個可寫 RG 後重跑；在此之前腳本的 README 必須明說這一半未驗 | 候選 |
| `AD-IaCScanCoverageUnmeasured-1` | semgrep 目標加了 `infra` 而**覆蓋未量測** | PR 的 CI log 讀 semgrep 的 `Scanned` 行；若 bash 未被覆蓋，改用 shellcheck | 候選 |
| `AD-DemoAuthUiUnguarded-1` | 守衛擋住後端，`/login` 仍渲染六個會 500 的按鈕；`demoAuthAllowed()` 零呼叫端 | layout 消費 `demoAuthAllowed()`，或刪掉這個 orphan export —— **二選一，不能都不做** | 候選 |
| `AD-NegativeTestNeedsPositiveControl-1` | 負面測試的第一次「通過」其實是我自己的 JSON 跳脫壞掉 | `verification-discipline.md` 加一句：**負面測試必須先跑陽性對照**，否則分不清「守衛擋住了」與「請求沒走到守衛」| 候選 |
| `AD-PartialPhaseRatioArtifact-1` | `closed_partial` 的 phase 照公式算 ratio 會系統性偏低（分子縮、分母不縮）| retro Q2 對 `closed_partial` 一律同時算**兩個** ratio：全範圍 + 已交付範圍 | 候選 |
| `AD-StopAndAskNotEvidenced-1` | plan §8 R1 寫「失敗即停下來問」，Day 0 實測確實失敗，而紀錄裡看不出有沒有問過 | 「stop and ask」類的風險緩解必須在 progress.md 留一行：問了什麼、得到什麼答案 | 候選 |
| `AD-Day0ProngsMismatchScopeClass-1` | 三-prong grep 對 `integration-with-external` 產出 0 條，五條 drift 全來自權限實測 | Day-0 的 prong 組合跟著 scope class 走；外部整合類的第一個 prong 是**一次會失敗的最小實驗**，不是 grep | 候選 |
| `AD-CalibrationNoTimeRecord-1` | **第 3 次** —— plan §7 寫了提醒然後照樣沒記 | ⛔ 升級：提醒無效已證實 2 次。改為**機械承載** —— checklist 每個 Day 收尾加一個具名的 `[ ]`「寫入當日耗時」| **升級**（已在 BACKLOG）|

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **US-2 / AC-3（CI 自動部署）** → `AD-CiDeployIdentityMissing-1`，**另開一片**（使用者裁定）
- **AC-4 乾淨-RG 半邊** → `AD-ProvisionCreatePathUnexercised-1`
- **semgrep 對 `infra/` 的實際覆蓋** → `AD-IaCScanCoverageUnmeasured-1`（**PR CI log 讀得到，別忘**）
- **`demoAuthAllowed()` 的去留** → `AD-DemoAuthUiUnguarded-1`

**這個 phase 關掉的**：

- `AD-DemoAuthGuardUntested-1` ✅ **CLOSED** —— 守衛在真環境被行使過了（Day 4）
- **ROADMAP 9b**（`required_linear_history` 重審）✅ **CLOSED** ——
  使用者 2026-08-18 裁定**維持 rebase**。理由不是慣性：**一條直線比 DAG 容易對稽核人員證明
  「什麼時候發生了什麼」**，而這是一套 ISMS 平台。代價（11 次 SHA 重指）已知且接受；
  錨點改用 **author date + subject**（W14 已量到它逐秒不變），SHA 只當索引

**這個 phase 改變狀態的**：

- **M0 DoD #5**（TLS／憑證／管理埠不得沿用預設）—— 從「⛔ 20 個 phase 無標的」變成
  **🟡 有標的，兩個子項明確設定、憑證那個子項仍是平台給的**。
  ⛔ **本節第一版寫「✅ 三項都是明確選的」，那是過度宣稱，同日於 status audit #7 自我更正**：
  - ✅ **明確設定的**：`allowInsecure: false`（拒絕明文）· HSTS `max-age=31536000; includeSubDomains`
    **對真實網址複驗**（連同其餘五條標頭）· ACR `adminUserEnabled: false`（既有那個是**開的**）·
    scoped pull token（不是 admin credential，也不是權限上不可能的 managed identity）
  - ⛔ **憑證是平台預設，而那正是本條原文禁止的東西**：實測 `customDomains: null`、
    environment 上 `certificate list` 回 **`[]`** ⇒ TLS 憑證是 Azure 為
    `*.azurecontainerapps.io` 自動簽的，**我們沒有做過任何選擇**
  - ⚠️ **而「沒選」在這裡不等於「懈怠」**：預設網域上結構性地沒有第二個選項，
    要自帶憑證得先有自訂網域。⇒ 這一半是 **R7 的形狀**（不是本專案單方面能關的），
    不是紀律問題。**判讀因此仍是「部分」，不是「關閉」** → `AD-AcaManagedCertIsPlatformDefault-1`
  - **仍缺 CSP**（`AD-NoCspHeader-1`）
- **M0 DoD #3**（IaC skeleton scanned）—— 從「⛔ 結構上無標的」變成
  **「有標的，覆蓋未量測」**。⛔ 仍不得打勾，但**不再是外部阻塞**：這一半是我們自己的工作
- `AD-IaCEvidence-1` —— **不關閉，分裂成兩半**（詳見 `CH-041` §相關）

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ `RISK_REGISTER.md` 已複查 —— **R7 敞口變小**（IaC 半邊從「卡外部」變成「我們自己的工作」）
- [x] `plan.md` frontmatter `status:` 已翻成 `closed_partial`，內文標記一致（R9）
- [x] `python scripts/lint/run_all.py` 全綠
