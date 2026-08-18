---
status: closed_partial   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W21 Plan — deploy the web demonstration to Azure Container Apps

**Summary**: 把 `apps/web` 的 30 個畫面部署到 Azure Container Apps，成為一個**可被 stakeholder
真的打開**的示範環境。⛔ **不含 `apps/api`** —— 它在 `NODE_ENV=production` 下**結構上無法啟動**
（`policy.module.ts:35` 於模組建構時呼叫 `assertDevPrincipalAllowed()`，解封點是 M4 / ADR-0007）。
關鍵範圍決策：(a) 只部署 web；(b) 資源**新建**而非重用既有的 AI-Landing 環境；
(c) `DEMO_AUTH=enabled` 明確標示為示範部署。**Drive-through 為 MANDATORY**（整片就是為了讓人能開）。
非 spike，**不產出 design note**。

**Status**: **`closed_partial`**（2026-08-18）—— US-1 / US-4 交付；**US-2（CI 自動部署）未開始**，
阻塞在「CI 沒有可用的 Azure 身分」，使用者裁定另開一片；US-3 半綠（冪等已驗、乾淨-RG 未驗）。
詳見 [retrospective.md](./retrospective.md)。
D1–D4 已於 Day 0 拍板（progress.md §決策拍板）。

**Branch**: `feature/W21-azure-deploy`
**Base**: `main` HEAD `65b29f2`（CH-040 smoke probe 修正 —— PR #82 rebase-merge 後的 HEAD）
**Slice**: standalone —— **推進 M0 DoD 第 5 項**（TLS／憑證／管理埠明確設定，
自 W01 起因「infra 尚未佈建」而卡在「部分」）。不關閉任何既有 AD。
**Scope decisions**: (a) web only，api 等 M4 (b) 新建資源，不併入 `acaen-rci3-ai-landing`
(c) `DEMO_AUTH=enabled` (d) 部署管道用 GitHub Actions，不手動 `az containerapp update`

---

## 0. Background

### The gap（推進 M0 DoD #5；使用者 2026-08-18 指示）

專案有 30 個已落地的畫面（W19），而**沒有任何人能在自己的瀏覽器打開它們** ——
它只跑在開發者本機的 3200 埠。使用者 2026-08-18 指示開始部署。

### Why it matters（缺失的能力）

1. **stakeholder 無法檢視** —— 每一次 UI 討論都要開發者在場示範
2. **M0 DoD 第 5 項卡了 20 個 phase** —— 「TLS 憑證、安全標頭、管理埠不得沿用平台預設值」
   在沒有部署環境時**結構上沒有標的**（`W01/retrospective.md:176-187`）
3. **容器化的價值從未被兌現** —— `apps/web/Dockerfile` 自 2026-08-08 起存在且被
   `image-smoke.yml` 保護，但那個 image 從來沒有離開過 CI runner

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

- `.github/workflows/` **三個 workflow 零部署步驟** —— 不是被停用，是從來沒寫過。
  全目錄搜尋 `azure/login|acr|containerapp|docker push|ghcr|deploy` 的**唯一命中是 4 行註解文字**
- `apps/api/src/modules/policy/dev-principal.ts:74-76` —— `NODE_ENV=production` 即 throw；
  `policy.module.ts:35` 在**模組建構時**呼叫它 ⇒ API 不是「起得來但拒絕請求」，是**起不來**
- `apps/web/src/lib/demo-session.ts:59-67` —— 同樣的守衛，但**有明確逃生門**
  （`DEMO_AUTH=enabled`），註解寫明「to run a demonstration deployment **deliberately**」
- `apps/web/src/app/page.tsx:45` —— web 對 API 的**唯一**依賴（`/` 骨架頁的 health 卡片）。
  `(app)/` 底下 30 個畫面**零 API 呼叫**

### The design（新建 3 個 Azure 資源 + 1 個 CI workflow + 1 份部署記錄）

RG → ACR → ACA environment → Container App，由**進版控的 `az` 腳本**建立（見 D3），
之後由 GitHub Actions 建置並推送 image。**產品程式碼零變更**。

### Ground truth（recon head-start —— 於 `main` HEAD `65b29f2` 讀過的 code）

| 事實 | 出處 |
|---|---|
| `apps/web/Dockerfile` 2-stage、distroless、`USER nonroot`、`CMD ["apps/web/server.js"]` | `apps/web/Dockerfile:23,42,59` |
| build context 是 **repo root**，`.dockerignore` 只有 root 一份 | `apps/api/Dockerfile:7-8` |
| `output: 'standalone'` + `outputFileTracingRoot` | `apps/web/next.config.ts:50,53` |
| web 容器監聽 **3200** | `.github/workflows/image-smoke.yml:224` |
| `smoke-probe.mjs` 可對任意 base URL 執行 | `scripts/smoke-probe.mjs` usage |
| SP 可見 8 個 subscription；`RCI3_AI_Landing` 有 southeastasia 的 ACR + ACA env | 2026-08-18 `az` 實測 |
| 既有 `acaen-rci3-ai-landing` 是 **`internal: true`**（staticIp `10.160.58.58`，VNet 內） | 2026-08-18 `az` 實測 |
| `ACRRci3AILanding1` **`adminUserEnabled: true`**、Premium、southeastasia | 2026-08-18 `az` 實測 |

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

<!-- Day 0 填入 D{N} 條目 -->

---

## 1. Phase Goal

**使用者原話（2026-08-18）**：「現在可以開始執行部署」·「不是要你重用上面的資源，而是應該重新建，
因為這個環境下，這 login 是權限去建所需的資源和環境的」。

⭐ **逐字引用是 `AD-PlanPremiseUnverified-1` 要求的**（W20 的整片作廢就是因為 plan 的目的
與使用者要的不同，而三-prong verify 對此結構性沉默）。

目標：**一個非開發者能用瀏覽器打開、看到 30 個畫面、且畫面上明確標示這是示範資料的網址。**
證明方式：Day 3 由真實網址（非 localhost）走完 30 個畫面的 drive-through。

---

## 2. User Stories

- **US-1** 作為區域 ISO，我希望能用一個網址打開 ISMS 平台，以便在會議中直接檢視畫面而不需要開發者在場
- **US-2** 作為開發者，我希望 push 到 `main` 後部署自動發生，以便部署不依賴任何一台特定機器
- **US-3** 作為稽核者，我希望部署環境的資源建立方式是**可重現且進版控的**，以便回答「這個環境是怎麼來的」
- **US-4** 作為平台擁有者，我希望示範環境**不可能被誤認為正式環境**，以便 fixture 資料不會被當成真實 ISMS 現況

---

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
新增  infra/azure/provision.sh          —— 建 RG + ACR + ACA env + Container App（冪等）
新增  infra/azure/README.md             —— 這些資源是什麼、怎麼重建、誰擁有
新增  .github/workflows/deploy-web.yml  —— build → push ACR → update Container App
修改  .env.example                      —— 補 5 個已在程式碼中被讀取的變數
不動  apps/web/**                       —— 產品程式碼零變更
不動  apps/api/**                       —— 本片不部署 API
```

### 3.1 資源建立（US-3）— `infra/azure/provision.sh`

一支**冪等**的 `az` 腳本：每個 `create` 前先 `show`，存在就跳過。
理由：部署環境要能回答「它是怎麼來的」，而一串貼在聊天記錄裡的指令回答不了。

⚠️ **這與 `CH-010:51`「本專案不寫 IaC」直接衝突** —— 見 **D3**。

### 3.2 CI 部署（US-2）— `.github/workflows/deploy-web.yml`

`push` 到 `main` 且 `apps/web/**` 有變動時觸發：
`azure/login` → `docker build -f apps/web/Dockerfile` → push ACR → `az containerapp update`
→ **`node scripts/smoke-probe.mjs web <真實網址>`**。

⭐ 最後一步是本片的反 Potemkin 機制：部署成功 ≠ 能用，而這支 probe 已經證明過它能抓到
「HTTP 200 但 chunk 404」這種靜態斷言看不見的失敗。

### 3.3 示範標示（US-4）

`DEMO_AUTH=enabled` 作為 Container App 的環境變數。W19 已有 `DemoBadge`
與每頁的 fixture 標示，**本片不新增 UI**，只確認它們在真環境仍然出現（Day 3 drive-through）。

### 3.4 安全設定（M0 DoD #5）

- ACR **關閉 admin user**（新建的資源不沿用既有那個 `adminUserEnabled: true` 的預設）
- Container App ingress 走 **HTTPS only**，`allowInsecure: false`
- 安全標頭已在 `apps/web` 側設定，Day 3 對真實網址複驗（不是假設它會跟著走）

### 3.5 明確不做的事

- ❌ **不部署 `apps/api`** —— 它在 production 下起不來，且 30 個畫面不需要它
- ❌ **不建 PostgreSQL** —— 沒有 API 就沒有消費者
- ❌ **不接 Key Vault / Managed Identity** —— 沒有需要保護的執行期密鑰（無 DB、無 API）
- ❌ **不做 migration 機制** —— 前提是 API
- ❌ **不接 OpenTelemetry / App Insights** —— 另一片，且沒有 API 時可觀測性的價值有限
- ❌ **不碰既有的 `acaen-rci3-ai-landing` / `ACRRci3AILanding1`** —— 使用者明確指示新建

### 3.6 ⛔ 需要使用者拍板的 4 個決策點

| # | 決策 | 選項 | 我的建議 |
|---|---|---|---|
| **D1** | **subscription 與 region** | (a) `RCI3_AI_Landing` / **southeastasia** —— 符合 ADR-0010「RCI3 Singapore」 · (b) `rcitest` / **eastasia** —— SP 目前的預設訂閱，但**與已採納的 ADR-0010 衝突** | **(a)** —— 偏離已採納 ADR 需要理由，而目前沒有 |
| **D2** | **ACA environment internal 還是 external** | (a) **external** —— 有公開網址，任何人可開 · (b) **internal** —— 私有 IP，只有公司網路可達（既有那個環境就是這樣） | **需要你回答「誰要看」** —— 若 stakeholder 在公司網路內，(b) 更安全且符合 `AD-DAST-1` 描述的既有網路形狀；若要外部可達則 (a)。⚠️ **這改變交付物本身**，不是實作細節 |
| **D3** | **資源建立方式與 CH-010 的衝突** | (a) 進版控的 `az` 腳本 —— 可重現、可稽核，但**它就是 IaC**，而 `CH-010:51` 記錄「本專案不寫 IaC，infra team 建立並營運全部 Azure 資源」 · (b) 手動 `az` 指令，只寫 runbook 文件 | **(a) + 更新 CH-010** —— 分工事實已經改變（你自己有權限建），文件要跟上，否則 `AD-IaCEvidence-1` 的前提也一起失效 |
| **D4** | **CI 推 image 的身分** | (a) **OIDC federated credential**（GitHub → Entra）—— 無長期密鑰，符合 guardrail 7 · (b) ACR admin credential 存 GitHub Secrets —— 能動，但那是長期密鑰 | **(a)** —— 但它需要在 Entra 建 app registration + federated credential。**若你沒有該權限，退到 (b) 並在 plan 明記為已知讓步**，不默默用 |

### 3.7 Validation（US-1..US-4）

| US | 怎麼證明 |
|---|---|
| US-1 | Day 3 由**真實網址**走完 30 個畫面（非 localhost） |
| US-2 | 一次真實的 `push` → Actions 綠 → 網址上的內容改變（**改一個字串驗證，再改回**） |
| US-3 | 在**乾淨的 RG** 上重跑 `provision.sh` 產生等價資源；第二次執行為 no-op（冪等） |
| US-4 | Day 3 逐頁確認 DEMO 標示存在；且**未設 `DEMO_AUTH` 時登入必須失敗**（負面測試） |

---

## 4. File Change List

| 檔案 | 動作 | 說明 |
|---|---|---|
| `infra/azure/provision.sh` | 新增 | 冪等的資源建立腳本 |
| `infra/azure/README.md` | 新增 | 資源清單 · 重建方式 · 擁有者 · **與 CH-010 分工變更的關係** |
| `.github/workflows/deploy-web.yml` | 新增 | build → push → deploy → smoke probe |
| `.env.example` | 修改 | 補 `API_HOST` `WEB_ORIGIN` `DEV_PRINCIPAL_ENTITIES` `DEV_PRINCIPAL_ROLLUP` `DEMO_AUTH` |
| `docs/03-implementation/changes/CH-041-*.md` | 新增 | 分工變更記錄（依 D3 決定） |
| `docs/02-architecture/07-wave1-build-plan.md` | **UNTOUCHED** | M0 DoD 是規格，狀態不住在那裡 |
| `apps/web/**` · `apps/api/**` | **UNTOUCHED** | 產品程式碼零變更 |

---

## 5. Acceptance Criteria

- **AC-1** 一個 HTTPS 網址回應 200，且 `smoke-probe.mjs` 對它 PASS（含所有 chunk 可取得）
- **AC-2** 該網址上 30 個畫面逐頁可達、無 console error、DEMO 標示存在
- **AC-3** `push` 到 `main` 觸發部署並成功，Actions log 含 smoke probe 的 PASS 行
- **AC-4** `provision.sh` 第二次執行為 no-op，且輸出說明哪些資源已存在
- **AC-5** ACR 的 `adminUserEnabled` 為 **false**；Container App ingress `allowInsecure` 為 **false**
- **AC-6** 未設 `DEMO_AUTH=enabled` 時，示範登入**被拒絕**（負面測試，實跑一次）

---

## 6. Deliverables

- [ ] US-1 —— 可公開（或公司內）存取的網址，30 個畫面可用
- [ ] US-2 —— `deploy-web.yml`，一次真實觸發驗證過
- [ ] US-3 —— `provision.sh` + `README.md`，冪等性實測過
- [ ] US-4 —— DEMO 標示在真環境確認 + `DEMO_AUTH` 負面測試

---

## 7. Workload Calibration

- Scope class **`integration-with-external` 0.70**（`CALIBRATION-MATRIX.md` 建議起手值：
  「接第三方 / 新服務，外部依賴是變異度主要來源」）。⛔ **刻意不用 `greenfield-feature` 0.55** ——
  本片的變異來源不是寫 code（產品程式碼零變更），而是**Azure 的權限、配額、網路與 CLI 行為**，
  那正是 `integration-with-external` 描述的形狀。**本片是該 class 的第 1 個資料點。**
- **Agent-delegated: `no`**（< 20%）—— 部署動作有副作用且難以逆轉，不委派。用三段式。
- Bottom-up est ~11 hr（資源建立 2 · CI workflow 3 · 安全設定 1 · drive-through 3 · closeout 2）
  → **calibrated commit ~7.7 hr (mult 0.70)**。Day-4 retro Q2 驗證。
- ⚠️ **逐任務記時間到 progress.md** —— `AD-CalibrationNoTimeRecord-1` 已經是第 2 次，
  而 W20 的 plan §7 寫了同一句提醒然後照樣沒做到。**這次改在每個 Day 收尾當下記，不在 Day 4 回想。**

---

## 8. Dependencies & Risks

| # | 風險 | 緩解 |
|---|---|---|
| R1 | **SP 的建立權限未經實測** —— 使用者說有，但 role assignment 查詢未執行 | Day 0 第一件事就是實測（建一個空 RG 再刪），**失敗即停下來問**，不猜測 |
| R2 | **配額 / 政策限制** —— 企業訂閱常有 policy 擋住特定 SKU 或 region | Day 0 實測時一併確認；`az` 的錯誤訊息會指名 policy |
| R3 | **D2 若選 internal，「stakeholder 能打開」的定義改變** | D2 是拍板項，不是 Day 1 才發現的意外 |
| R4 | **Risk Class C（陳舊程序）的雲端版本** —— ACA 的 revision 機制讓「部署成功」與「新版本在服務」是兩件事 | 部署後**斷言 revision 名稱與 image tag**，不只看 `az containerapp update` 的 exit code |
| R5 | **`AD-LocalGateSetIncomplete-1` 再犯** —— 部署類工作幾乎全部無法在本機驗證 | 本片的 gate 聲明必須寫明「哪些只在 Azure 上成立」 |
| R6 | ⭐ **成本** —— ACA 可 scale to zero，但 ACR Premium 與 ACA environment 有固定費用 | Day 0 確認 SKU 選擇；ACR 用 **Basic** 就夠（單一 image、無異地複寫） |

---

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **`apps/api` 的部署** → 前提是 M4（Entra ID），而 M4 前提是 RIT 建的三個 App Registration
- **PostgreSQL 佈建與 migration pipeline** → 隨 API 一起
- **staging / prod 環境** → ADR-0010 說 3 個環境，本片只建 1 個；其餘等這個跑順
- **Key Vault / Managed Identity** → 沒有執行期密鑰要保護
- **可觀測性接線** → `AD-` 待開，且沒有 API 時價值有限
- **DAST** → `AD-DAST-1`，且它的阻塞（私有 VNet）與 D2 的答案直接相關
- **ROADMAP 9b（`required_linear_history` 重審）** → ⚠️ **不是 out of scope，是 Day 4 的必做項** ——
  它已經被漏掉 **3 次**（W17 第 9 次 · W18 第 10 次 · W20 本要接手而被回退），列在 checklist §4.2
