# Phase W21 — Checklist (deploy the web demonstration to Azure Container Apps)

[Plan](./plan.md)

> ⚡ **使用者 2026-08-18 追加約束**：「**要盡快能夠在 azure 上看到基本的效果**」。
> ⇒ Day 1 的順序是**先拿到一個能打開的網址**，再回頭固化成腳本與 CI。
> 這不是跳過 US-2 / US-3，是把它們排在**證明通路可行之後** —— 先做能跑的薄切片。

---

## Day 0 — Plan-vs-Repo Verify + Azure 權限實測 + 決策拍板

### 0.1 三-prong Day-0 verify（對照 `main` HEAD `65b29f2`）

- [x] **Prong 1 — path verify**：`infra/` 不存在；`apps/web/Dockerfile` 存在；
      `.github/workflows/` 恰有 3 個檔且無部署步驟
- [x] **Prong 2 — content verify**（drift → progress.md）：
  - [x] **D-no-deploy** — 全 `.github/` 搜尋部署關鍵字，確認**只命中註解文字**
  - [x] **D-api-refuses** — `policy.module.ts:35` 於模組建構時呼叫 guard（決定「不部署 API」的前提）
  - [x] **D-web-api-dep** — `apps/web` 對 API 的依賴仍**只有** `app/page.tsx:45`
  - [x] **D-web-port** — 容器監聽埠仍是 **3200**
  - [x] **D-demo-guard** — `DEMO_AUTH=enabled` 仍是唯一逃生門
- [x] **Prong 3 — schema verify**：**N/A** —— 本片零 DB
- [x] **Catalog drift** — progress.md Day-0 表格
- [x] **Go/no-go** — 範圍變動 ≤20% 繼續 / 20-50% 修訂 §5 §7 並回報 / >50% 中止重寫

### 0.2 ⭐ Azure 權限實測（**plan §8 R1 —— 失敗即停下來問，不猜測**）

- [x] **SP 能建 resource group**
  - DoD: 在目標 subscription 建一個測試 RG 再刪掉，兩個動作都成功
  - Verify: `az group create` → `az group show` → `az group delete`，逐個看 exit code
- [x] **目標 region 可用且無 policy 阻擋**
  - DoD: southeastasia 建得起來；若被 policy 擋，**錯誤訊息會指名該 policy** → 記入 progress
- [x] **配額與 SKU**
  - DoD: ACR **Basic** 足夠（單一 image、無異地複寫）；ACA environment 可建

### 0.3 決策拍板（plan §3.6）

- [x] **D1 — subscription / region**：**`RCI3_AI_Landing` / southeastasia**
  - 理由：ADR-0010 已採納且明確（RCI3 Singapore）。偏離已採納 ADR 需要理由，目前沒有
- [x] **D2 — internal vs external ingress**：**external**
  - 理由：使用者 2026-08-18「要盡快能夠在 azure 上看到基本的效果」。
        internal 環境的私有 IP 會讓「看到效果」取決於他當下在不在公司網路內
- [x] **D3 — 資源建立方式**：**先手動跑通 → 再固化成 `provision.sh`**
  - ⚠️ 與 `CH-010:51`「本專案不寫 IaC」的衝突**仍需記錄** → CH-041（Day 4）
- [x] **D4 — CI 身分**：**推遲到 Day 2**
  - 理由：Day 1 的手動部署用本機已登入的 SP，不需要 CI 身分。
        OIDC vs admin credential 的取捨在真的要寫 workflow 時才有標的

---

## Day 1 — 拿到一個能打開的網址（US-1）

### 1.1 建立資源

- [x] **Resource group**
  - DoD: 專屬 RG，名稱能看出是這個專案的，不與既有 AI-Landing 資源混淆
- [x] **ACR（Basic，`adminUserEnabled: false`）**
  - DoD: ⛔ **不沿用既有那個 `adminUserEnabled: true` 的預設** —— M0 DoD #5 的「不得沿用平台預設值」
  - Verify: `az acr show --query adminUserEnabled` → **false**
- [x] **ACA environment（external）**
  - DoD: 有公開可達的 ingress；`internal` 為 false 或未設 VNet
  - Verify: `az containerapp env show --query properties.vnetConfiguration`

### 1.2 建置並推送 image

- [x] **本機 `docker build` web image 並 push 到新 ACR**
  - DoD: tag 含 commit SHA，**不用 `latest`** —— 「部署了哪一版」必須可回答
  - Verify: `az acr repository show-tags`

### 1.3 部署並取得網址

- [x] **建立 Container App，`DEMO_AUTH=enabled`，ingress external、target port 3200**
  - DoD: `allowInsecure: false`
  - Verify: `az containerapp show --query properties.configuration.ingress`
- [x] ⭐ **對真實網址跑 `smoke-probe.mjs`**
  - DoD: PASS，含全部 chunk 可取得
  - Verify: `node scripts/smoke-probe.mjs web https://<fqdn>` → PASS
  - ⛔ **`az containerapp create` 成功不算部署成功** —— plan §8 R4（revision 機制讓兩者是兩件事）
- [x] **把網址交給使用者**

### 1.x partial gate

- [ ] 資源清單截圖 / `az` 輸出 → progress.md；**逐任務記時間**（plan §7 的 ⚠️）

---

## Day 2 — CI 自動部署 (US-2)

> 🚧 **全部阻塞 —— CI 沒有可用的 Azure 身分**（2026-08-18）。
> **OIDC 路線實測不通**：`az ad app create` 回 `Insufficient privileges to complete the
> operation`，建 app registration 需要目錄權限，本身分沒有 ⇒ 那是 RIT 才能做的。
> 剩下兩條路都**需要使用者提供**：(a) 現有 SP 的 client secret（`az login` 完成後本機讀不到）
> 或 (b) 請 RIT 建一個 CI 專用的 SP／federated credential。
> **解封條件**：拿到其中一組憑證。
> ⛔ **刻意不先寫 workflow 檔** —— 一條永遠不會執行的 pipeline 就是 AP-3，
> 問「關掉它會壞什麼」答不出來。

### 2.1 部署身分（D4 在此拍板）

- [ ] **OIDC federated credential**（優先）或 **ACR credential**（退路，須明記為讓步）
  - DoD: GitHub Actions 能登入 Azure 且**原始碼與 workflow 檔中無密鑰**（guardrail 7）

### 2.2 `deploy-web.yml`

- [ ] **build → push ACR → `az containerapp update` → smoke probe**
  - DoD: 最後一步對**真實網址**執行，非 localhost
- [ ] ⭐ **斷言在服務的 revision 就是這次推的 image**
  - DoD: 比對 revision 的 image tag 與本次 commit SHA（plan §8 R4）
- [ ] **真實觸發一次**
  - DoD: 改一個字串 → push → Actions 綠 → 網址上的內容改變 → 改回來
  - ⛔ workflow 存在不算數，**要看到它真的跑過並改變了線上內容**

### 2.x Full gate

- [ ] `format:check` · `lint` · `type-check` · `test` · `build` · `run_all` · actionlint

---

## Day 3 — Drive-through：真實網址，30 個畫面 (US-1, US-4)

### 3.1 逐頁走查

- [x] **30 個畫面逐頁**：可達 / 無 console error / DEMO 標示存在
- [x] **安全標頭對真實網址複驗**（不是假設它會跟著容器走）
- [x] **HTTPS 強制**：`http://` 應被導向或拒絕

### 3.2 負面測試

> 🚧 **待使用者同意**（2026-08-18）—— 需要移除 Container App 的環境變數並產生新 revision，
> 會讓剛確認可用的示範網址中斷約 1–2 分鐘。
> ⭐ **價值比原本設想高**：全域搜尋顯示 `DEMO_AUTH` 與 `assertDemoAuthAllowed`
> **只出現在 `demo-session.ts` 自己**，零測試覆蓋 ⇒ 這個守衛從未被證明會擋任何東西
> （`AD-DemoAuthGuardUntested-1`）。

- [ ] ⭐ **未設 `DEMO_AUTH=enabled` 時登入必須失敗**
  - DoD: 暫時移除該環境變數 → 示範登入被拒 → 復原
  - ⛔ 這是本片的反 Potemkin 項：那個守衛從來沒有在真環境被行使過

### 3.3 證據

- [x] 截圖 + observed-vs-intended → progress.md

---

## Day 4 — closeout

### 4.1 固化與記錄

- [ ] **`infra/azure/provision.sh`**（冪等）+ **`infra/azure/README.md`**
  - DoD: 在乾淨 RG 上重跑產生等價資源；第二次執行為 no-op
- [ ] **`CH-041`** —— 分工變更記錄：`CH-010:51`「本專案不寫 IaC」已不成立
  - DoD: 同時處理 `AD-IaCEvidence-1` 的狀態（它的前提是「沒有 IaC 可掃」）
- [ ] **`.env.example`** 補 5 個變數

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`integration-with-external` 0.70，**第 1 個資料點**）
- [ ] `calibration-matrix.md` 那一行（**≤ 1 行 ~250 字元**，敘述 → `calibration-log.md`）
- [ ] Final gate sweep + **gate 射程聲明**（`AD-LocalGateSetIncomplete-1`：哪些只在 Azure 上成立）
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile
- [ ] BACKLOG 同步（新 AD + 關閉的）
- [ ] Anti-pattern 自檢（retro Q5）
- [ ] ⭐⭐ **ROADMAP 9b —— `required_linear_history` 重審**
  - ⛔ **已被漏掉 3 次**（W17 第 9 次 · W18 第 10 次 · W20 本要接手而被回退）
- [ ] **M0 DoD #5 狀態更新** —— TLS／憑證／管理埠終於有標的了，記錄它現在是什麼狀態
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
