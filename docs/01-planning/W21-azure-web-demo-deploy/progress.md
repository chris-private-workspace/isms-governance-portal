# Phase W21 Progress

---

## 2026-08-18 — Day 0（Plan-vs-Repo Verify + Azure 權限實測）

### Baselines（實跑）

| Gate | 結果 |
|---|---|
| `python scripts/lint/run_all.py` | **9/9** |
| `main` HEAD | `65b29f2`（PR #82 rebase-merge 後） |
| 既有 workflow 數 | **3**（`ci` · `image-smoke` · `security-scan`），部署步驟 **0** |

### Drift findings

| ID | Finding | Implication |
|---|---|---|
| **D-perm-scope** ⭐⭐ | **SP 不能建 resource group**。兩個訂閱都實測 `az group create` → `AuthorizationFailed`（缺 `Microsoft.Resources/subscriptions/resourcegroups/write`）。權限是 **RG scope 的 Contributor**（`actions: ["*"]` + 標準 Contributor `notActions`），不是 subscription scope | ⛔ **與使用者「這 login 有權限去建所需的資源和環境」的宣稱不符** —— 能建**資源**，不能建**容器**。⇒ 資源必須放進既有 RG |
| **D-rg-map** | 可寫且在 southeastasia 的 RG **只有一個**：`RG-RCI3AI-RAPO-N8N`。其餘：`-PDT` 唯讀 · `testing` 在 eastus2 · `RG-RCI3AILanding-Common`（既有 ACR/ACA 所在）**無存取** | ADR-0010 要求 southeastasia ⇒ **沒有第二個選擇**。代價：ISMS 的資源與 N8N 專案共處一個 RG |
| **D-acr-unreachable** ⭐⭐ | **本機連不到任何 `*.azurecr.io`** —— 新建的 `acrismsgovdemo` 與**既有的** `acrrci3ailanding1` 都 `curl` 回 `000`，且無 proxy 環境變數 | ⇒ **不是我建的 registry 有問題**，是這台機器的網路。對照組（既有 registry 同樣不可達）是關鍵 —— 沒有它，會誤診成「ACR 建錯了」。⇒ 本機 `docker push` 這條路**結構上不通**，改用 `az acr build`（雲端建置，走 management plane） |
| **D-az-packer-glob** ⭐ | **`az acr build` 的打包器不套用 `**/` 語法** —— `.dockerignore:12` 有 `**/.next/`，而第一次執行**因讀取 `apps/web/.next/dev/lock` 而失敗**；第二次卡在上傳超過 10 分鐘（`apps/web/node_modules` 只被 `**/node_modules/` 涵蓋） | ⇒ 同一份 `.dockerignore`，**docker 與 az 讀出不同結果**。修法：補上不帶 `**/` 的明確路徑（`apps/*/node_modules/` 等），docker 視為重複排除、az 才生效 |
| **D-identity-mismatch** | `az account show` 顯示 `type: servicePrincipal` / `user.name: a19dfe76-…`，但對 `RCI3_AI_Landing` 的錯誤訊息回報的 client 是 **`Chris.Lai@rapo.com.hk`**（object id `f11e0f64-…`），對 `rcitest` 才回報 SP（object id `9709e23d-…`） | 兩個訂閱以**不同身分**解析同一個 az session。目前不阻塞，但 Day 2 設定 CI 身分時必須知道**是誰在授權** |

### 決策拍板（plan §3.6）

| # | 決定 | 依據 |
|---|---|---|
| **D1** | `RCI3_AI_Landing` / **southeastasia** / RG `RG-RCI3AI-RAPO-N8N` | ADR-0010 已採納。⚠️ RG 由 D-rg-map 決定，**不是選的，是唯一可行的** |
| **D2** | **external ingress** | 使用者「要盡快能夠在 azure 上看到基本的效果」。既有環境是 internal（`10.160.58.58`），會讓「看得到」取決於當下在不在公司網路 |
| **D3** | 先手動跑通 → 再固化 `provision.sh` | 薄切片優先；與 `CH-010:51` 的衝突記入 CH-041（Day 4） |
| **D4** | 推遲至 Day 2 | Day 1 用本機 az session，沒有 CI 身分的標的 |

### 已建立的資源

| 資源 | 名稱 | 設定 | 驗證 |
|---|---|---|---|
| ACR | `acrismsgovdemo` | **Basic** · **`adminUserEnabled: false`** · southeastasia | `az acr create` 回傳 `admin: false` |
| ACA env | `cae-isms-gov-demo` | **`internal: null`** · staticIp **`20.205.245.17`**（公開位址） · southeastasia | `az containerapp env create` 回傳 `state: Succeeded` |

⭐ **ACR 的 admin 關閉是刻意的** —— 既有的 `ACRRci3AILanding1` 是 `adminUserEnabled: true`。
M0 DoD 第 5 項要求「不得沿用平台預設值」，而 admin user 正是那種預設。
代價已知：Day 2 的 CI 身分不能走 admin credential 那條懶路。

### Notes

- ⚠️ **停掉了本機 dev server**（PID 51676 / 48668）—— `apps/web/.next/dev/lock` 擋住打包。
  Day 3 的 drive-through 對**真實網址**執行，不需要它
- `apps/web/.next` 與 `apps/api/dist` 已清除（建置產物，可重建）

### Remaining for Next Day

- Day 1 剩餘：image 推送完成 → 建 Container App → **對真實網址跑 `smoke-probe.mjs`** → 交付網址
