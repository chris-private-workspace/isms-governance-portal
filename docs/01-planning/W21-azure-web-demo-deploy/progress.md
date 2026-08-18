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

---

## 2026-08-18 — Day 1（建置與部署）

### 拉取憑證：ACR token，不是 admin user 也不是 managed identity

Day 0 把 ACR 的 admin 關掉之後，Container App 要用什麼身分拉 image 成了真問題。
三條路，前兩條都不通：

| 路徑 | 結果 |
|---|---|
| **admin credential** | ⛔ 已刻意關閉（M0 DoD #5「不得沿用平台預設值」） |
| **system-assigned managed identity + AcrPull** | ⛔ **權限上不可能** —— 指派 role 需要 `Microsoft.Authorization/*/Write`，而那**正是 Contributor 的 `notActions` 第一條**（Day 0 D-perm-scope 量到的） |
| **ACR token + scope map** | ✅ 採用 —— data-plane 認證，**不經過 RBAC role assignment** |

建立 `isms-web-pull`，綁內建 scope map `_repositories_pull`。

⭐ **這比 admin user 好，不只是「能動」**：範圍限定為 pull、可獨立撤銷、
且它是**明確設定的**而非平台開好放在那裡的預設帳號 —— 那正是 M0 DoD #5 要求的形狀。
password 存在 repo 之外的 scratchpad，只作為 Container App 的 registry credential
（存在 Azure 端，不進版控）。

### ⚠️ 一個看起來像失敗而其實不是的錯誤

`az acr build` 的串流 log 在 Step 11（`npm run build -w apps/web`）噴出：

```
ERROR: The command failed with an unexpected error. Here is the traceback:
ERROR: 'charmap' codec can't encode character '▲' in position 74
```

`▲` 是 **▲**，Next.js 建置輸出的符號。**這是本機 az CLI 在 Windows cp1252 console
印 log 時崩潰**，不是雲端 build 失敗 —— 同一時間 `az acr task list-runs` 回報 `Running`。

⇒ **本機工具的故障被呈現成遠端工作的失敗**。與 W20 的
「`127.0.0.1` 拿到 403 而 curl 看到 200」同形：**觀測工具本身壞了，而輸出讀起來像被觀測對象壞了**。
判準一樣：**找一個獨立的觀測管道**（這裡是 run status，那裡是帶 Origin header 的 curl）。

⇒ 之後對 az CLI 一律加 `PYTHONIOENCODING=utf-8`。

### 部署結果

| 項目 | 值 |
|---|---|
| **網址** | `https://ca-isms-web-demo.wonderfulsmoke-9097eb48.southeastasia.azurecontainerapps.io` |
| Container App | `ca-isms-web-demo` · min 1 / max 2 · 0.5 CPU / 1.0 GiB |
| Image | `acrismsgovdemo.azurecr.io/isms-web:115ec78`（digest `sha256:4e17a871…`）—— ⚠️ **這個 tag 是 ACR 裡的真實成品名稱，刻意不重指**：該 SHA 已被 PR #84 的 rebase 改寫成 `adccff7`，但 registry 裡的映像仍叫 `115ec78`，改文件會讓它指向一個不存在的 tag |
| ingress | **external: true** · **allowInsecure: false**（AC-5 達成）|
| 環境變數 | `DEMO_AUTH=enabled`（Dockerfile 已內建 `NODE_ENV=production`）|

⭐ **image tag 用 commit SHA 而非只有 `latest`** —— 「線上跑的是哪一版」必須答得出來。

### 驗證（checklist 1.3 —— `az containerapp create` 成功**不算**部署成功）

```
[smoke:web] PASS — https://ca-isms-web-demo…azurecontainerapps.io/
            serves the en page and all 9 referenced assets.
```

| 路徑 | 回應 | 判讀 |
|---|---|---|
| `/` | 200 | W01 骨架頁 |
| `/login` | 200 + 含 `Regional ISO` / `Platform admin` / `Welcome back` | **`DEMO_AUTH=enabled` 生效** |
| `/dashboard` · `/risks` · `/ai-assistant` | 307 | 未登入導向 `/login`，**正確行為** |

⭐ 頁面標題是 `APAC ISMS Governance Platform`（英文）⇒ **CH-040 的預設語言在真環境生效**。

### ⚠️ 本機看不到它，而應用程式沒有問題 —— 第三次同形

`smoke-probe` 第一次對真實網址跑出 **FAIL**：`TypeError: fetch failed (SELF_SIGNED_CERT_IN_CHAIN)`，
`curl` 回 `000`。

**而 `curl -k` 回 200，耗時 0.29 秒。**

⇒ 這台機器有 **TLS 攔截 proxy**（企業防火牆做 SSL inspection，自簽 CA 不被 Node/curl 的憑證庫信任）。
它同時解釋了 Day 0 的 `*.azurecr.io` 全部不可達。

**這是本次第三個「工具壞了而輸出讀起來像被觀測對象壞了」的實例**：

| # | 症狀 | 真相 | 揭穿它的獨立管道 |
|---|---|---|---|
| 1 | `127.0.0.1:3200` 回 403（W20） | Next.js dev origin 檢查 | 帶 `Origin` header 的 curl |
| 2 | `az acr build` 噴 `charmap codec` ERROR | 本機 log 串流崩潰 | `az acr task list-runs` 的 status |
| 3 | 真實網址 `fetch failed` / `curl 000` | 企業 TLS 攔截 | **`curl -k`** |

⇒ 判準收斂成一句：**在宣告「遠端壞了」之前，先換一個不經過同一個本機元件的觀測管道。**

⚠️ `NODE_TLS_REJECT_UNAUTHORIZED=0` **只用於本機這一次診斷** —— 不進任何檔案、不進 CI、不進腳本。
Day 2 的 CI 在 GitHub runner 上執行，沒有這個 proxy，probe 會走正常憑證驗證。

### Remaining for Next Day

- Day 2：CI 自動部署（D4 —— 身分方式在此拍板）
- Day 3：真實網址的 30 畫面 drive-through（⚠️ 瀏覽器需處理同一個憑證攔截）

---

## 2026-08-18 — Day 3（真實網址 drive-through）

### 路由覆蓋：29 / 29

以 `regional-iso` 身分登入（`POST /api/demo-session` 取得 `isms_demo_persona` cookie），
逐頁抓取真實網址。

| 類別 | 數量 | 結果 |
|---|---|---|
| 靜態路由 | **22** | 全部 **200**，內容 36–81 KB，H1 皆為英文 |
| 動態詳情路由 | **7** | 全部 **200**，H1 是真實實體名稱而非 placeholder |

動態路由抽樣：`RSK-1042`（Unpatched externally-facing systems）· `POL-301`（Information
Security Policy）· `ISS-5490` · `AF-2026-014` · `INC-2026-0148` · `EPR-024`（Fortalis Security
Advisory）· `CTL-2201`（MFA on all administrator accounts）。

⭐ **DEMO 標示在 28 / 29 頁存在**。唯一沒有的是 `/`，而那是 W01 骨架驗證頁 ——
它有自己的聲明（"This page verifies the W01 scaffold. It is not a product screen."），
不是遺漏。

### ⚠️ 一個零命中差點被誤讀

從 `/risks` `/controls` `/policies` `/issues` 的 HTML **抓不到任何 `href="/risks/…"` 形式的連結**。

⛔ 若就此結論「詳情頁沒有入口」，那會是錯的 —— grep 抓不到是因為那些列表用
**`onClick={() => router.push(...)}`**（`risks/page.tsx:452` · `controls/page.tsx:374`），
不是 `<a href>`。它們有真的 handler。

⇒ `verification-discipline.md` §證據層的「零命中要先證明搜對了地方」在這裡真的擋下一次誤判。

### 安全標頭（M0 DoD #5 —— 20 個 phase 以來第一次有標的）

`next.config.ts:27` 定義 6 條，真實網址**全部到達**：

```
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: no-referrer
cross-origin-opener-policy: same-origin
permissions-policy: camera=(), microphone=(), geolocation=()
strict-transport-security: max-age=31536000; includeSubDomains
```

且**沒有** `x-powered-by`（`poweredByHeader: false` 生效）、**沒有** `server` header。
ingress `allowInsecure: false`。

⚠️ **我自己差點做出錯誤結論**：第一次的 grep pattern 漏了 `cross-origin`，
輸出只有 5 條，而我當下的讀法是「6 條裡少了一條」。**是重抓完整 headers 才發現漏的是我的 pattern。**
—— 與上面那個零命中同一天、同一種錯誤：**用一個不完整的觀測去下完整的結論**。

⚠️ **沒有 CSP** —— 但那是 `SECURITY_HEADERS` 本來就沒有，不是部署掉的。既有缺口 → BACKLOG。

### Revision 斷言（plan §8 R4）

| 項目 | 值 |
|---|---|
| revision | `ca-isms-web-demo--ggicxpu` · **Healthy** · traffic **100%** |
| image | `acrismsgovdemo.azurecr.io/isms-web:115ec78` —— **同上，rebase 改寫後刻意不重指**（真實 tag）|
| env | `DEMO_AUTH=enabled`（確認在容器內，不是只寫在指令裡） |

⇒ **在服務的 image 就是這次推的那個** —— 不是靠 `az containerapp create` 的 exit code 推論。

### 不存在的資源

| 路徑 | 回應 |
|---|---|
| `/nonexistent-page` | **404** ✅ |
| `/controls/NOPE-9999` · `/risks/RSK-0000` | **307**（導回列表） |

前端 fixture 沒有範疇洩漏風險，導回列表是合理 UX。
⚠️ **但 API 接上之後這個行為必須改** —— 那時「找不到」與「不在你的範疇內」的區別有安全意義
（CLAUDE.md 約束 8：查無資料一律回 404，回 403 等於確認 ID 猜對了）→ BACKLOG。

⚠️ **一次工具導致的假結果**：第一次測 `/controls/NOPE-9999` 回 **200** ——
那是 Git Bash 的 MSYS 路徑轉換把 URL 改成了 `C:/…/Git/controls/NOPE-9999`。
加 `MSYS_NO_PATHCONV=1` 重測才得到真值。**本日第三個工具說謊的實例。**

### 🚧 未完成：`DEMO_AUTH` 的真環境負面測試

checklist 3.2 要求「未設 `DEMO_AUTH=enabled` 時登入必須失敗」。

⛔ **尚未執行** —— 它需要移除 Container App 的環境變數並產生新 revision，
會讓使用者剛確認可用的示範環境**短暫中斷**。等使用者同意再做。

⭐ **而這個測試的價值比原本設想的高**：全域搜尋顯示 `DEMO_AUTH` 與 `assertDemoAuthAllowed`
**只出現在 `demo-session.ts` 自己** —— **零測試覆蓋**。
那個守衛從來沒有被證明會擋任何東西，既沒有單元測試，也沒有在任何環境被行使過。
⇒ 與 W19 那 25 個死控件同形：**守衛存在、條件成立、沒有人驗證過它真的會擋。**
→ `AD-DemoAuthGuardUntested-1`

### Notes

- `demo-session.ts:29` 的檔頭寫「The **W20** demo deployment therefore has to set that
  variable on purpose」—— W19 當時預期部署會發生在 W20。W20 被回退，實際發生在 W21。
  輕微的過期引用，不影響行為

---

## 2026-08-18 — Day 4（`DEMO_AUTH` 負面測試 + closeout）

### ✅ AC-6 —— `DEMO_AUTH` 守衛在真環境被行使過了

使用者 2026-08-18 同意承受 1–2 分鐘中斷。三段式執行，**每一段都對真實網址**：

| 段 | 動作 | revision | `POST /api/demo-session` | 判讀 |
|---|---|---|---|---|
| **陽性對照** | 現狀 | `ca-isms-web-demo--ggicxpu` | **200** + `Set-Cookie: isms_demo_persona=regional-iso; … Secure; HttpOnly; SameSite=lax` | 儀器有效 |
| **中性化** | `az containerapp update --remove-env-vars DEMO_AUTH` | `ca-isms-web-demo--0000001`（traffic **100%**） | **500**，**無 `Set-Cookie`**，body 空 | ⭐ **守衛開火** | <!-- sha-check: ignore — Azure revision 後綴，不是 git SHA -->
| **復原** | `--set-env-vars DEMO_AUTH=enabled` | `ca-isms-web-demo--0000002`（traffic **100%**） | **200** + `Set-Cookie` | 已復原 | <!-- sha-check: ignore — 同上 -->

> ⚠️ 上表兩個 revision 後綴帶 `sha-check: ignore` pragma —— **純數字的七位後綴符合 SHA 的字形**，
> 而它們是 Azure 產生的 revision 名稱，從來不是 git 物件。
> ⇒ 這是 detector 對「長得像 SHA 的東西」的誤判，`check_sha_anchors.py:97-99` 已預期這種情況：
> 能用散文說「它死了」就用散文，說不出來的才用 pragma。**這裡說不出來** —— 它沒有死，它不是 SHA。

`DELETE /api/demo-session`（守衛的另一個呼叫端）在中性化期間同樣 **500**。
復原後 `smoke-probe.mjs` 對真實網址 **PASS**（9 個 chunk 全可取得）。

⭐ **同時跑了一個對照組**：中性化期間 `GET /` 與 `GET /login` **仍是 200**。
沒有它，500 可以是「守衛擋住了」也可以是「容器根本沒起來」——
`az containerapp update` 的 exit code 對這兩者一樣沉默（plan §8 R4 的形狀）。

⭐ **500 的 body 是空的** —— 守衛的錯誤訊息（含「Set DEMO_AUTH=enabled」）**沒有外洩**到回應裡。

### ⚠️ 第四個「工具說謊」，而這次說謊的是我自己

陽性對照的**第一次**執行回 **404**。若我先跑負面測試，那個 404 會被讀成「守衛生效」——
而它其實是 PowerShell 把 `'{\"persona\":…}'` 的反斜線原樣傳給 `curl`，
body 不是合法 JSON ⇒ `route.ts:46` 的 `.catch(() => null)` ⇒ `findPersona(null)` ⇒ 404。
**伺服器完全正常，守衛一次都沒被呼叫到。**

⇒ 前三個實例是**外部工具**騙我；這個是**我自己的指令**騙我，而且它會產生
「**負面測試通過**」這個最不會被回頭質疑的結果。
⇒ 判準補一句：**負面測試必須先跑陽性對照**，否則你分不清「守衛擋住了」與「請求根本沒走到守衛」。

### ⭐ 順帶量到一個 orphan export

`demoAuthAllowed()`（`demo-session.ts:70`）的 docstring 寫 "For layouts"，
而全 `apps/web` 搜尋顯示它**零呼叫端**。

它要填的正是這次量到的缺口：中性化期間 `/login` **仍回 200 並照常渲染六個 persona 按鈕**，
點下去才 500。守衛擋住了後端，前端不知道 —— 而那個「讓前端知道」的函式已經寫好放在那裡沒人用。
→ `AD-DemoAuthGuardUntested-1` 關閉，`AD-DemoAuthUiUnguarded-1` 開立。

### 逐任務時間（`AD-CalibrationNoTimeRecord-1` —— 見 retro Q2 的誠實聲明）

| 區段 | 量法 | 時間 |
|---|---|---|
| Day 0（plan 起草後 → Day-0 完成） | commit author date `afa0f7a` → `adccff7` | ~32 min |
| Day 1（建置 + 部署） | `adccff7` → `167b843` | ~12 min |
| Day 3（29 路由 drive-through） | `167b843` → `2c8c207` | ~14 min |
| checklist 回填 | `2c8c207` → `7da314f` | ~126 min |
| Day 4（負面測試 + closeout） | 本 session 實測 | 見 retro Q2 |

⛔ **這五格裡只有最後一格是量出來的，其餘四格是從 commit author date 反推的下限** ——
與 W15 同一個代用品。`AD-CalibrationNoTimeRecord-1` 因此是**第 3 次**，且 plan §7
寫了「這次改在每個 Day 收尾當下記」然後**照樣沒做到**。詳見 retro Q2。
