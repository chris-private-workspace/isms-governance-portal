# CH-013 — Progress

**Status**: draft
**Spec**: [`spec.md`](./spec.md) · **Checklist**: [`checklist.md`](./checklist.md)

---

## 2026-08-09

### 做了什麼
- 分類為 Change 軌；編號依 `AD-ChNumber-1` 的判準（grep 全 repo 的 `CH-\d+` 引用，
  不是 `ls` 目錄）確認為 **CH-013** —— 最大實體是 CH-012，CH-010 仍是四處前向引用的預留號
- 三個範圍決策由使用者拍板（獨立 workflow · api+web 都 run · trivy 完整 image 不做）
- spec + checklist 起草完成，**待核可**

- Day 0 七項 verify 全部執行完畢 —— **P1 零 drift，P0/P2/P5 各推翻一個 spec 假設**

### 意外 / 卡住
- **P2 推翻了 spec 的第一個承重假設**（見 D-1）—— DB 不通時 API 照常啟動
- **P5 的探測形狀實驗推翻了「探 `/` 就夠」**（見 D-2）—— 這是本次最有價值的發現
- api image **本機 build 不了**（D-3），元驗證 3 只能在 CI 做

### 明天
- 實作：`image-smoke.yml` + `scripts/` 的探測腳本（形狀已由 D-5 定案）

### Drift findings

#### D-1 ⭐ API 在資料庫不可達時**不會**啟動失敗（推翻 spec §關鍵設計細節第 1 點）

**Finding**：以 `postgresql://nobody:nobody@127.0.0.1:59999/nowhere` 跑
`node apps/api/dist/bootstrap/main.js`，12 秒後 process **仍在監聽**，
`GET /health` 回 `{"status":"up","db":"down"}`。
`prisma.service.ts:52-54` 的 `$connect()` 失敗**沒有**讓 Nest bootstrap 中止。

**Implication**：spec 原本擔心「必須起 DB 否則容器起不來」—— 該擔憂不成立。
⭐ **但 DB 仍然必須起，理由換了一個**：元驗證 3（拿掉 openssl）的預期失敗形狀是
資料庫探測失敗，也就是 `db:"down"`。若 smoke 不起 DB，健康狀態下**本來就是**
`db:"down"` —— 兩種情況產生**完全相同的輸出**，gate 抓不到。
**所以探測必須斷言 `db:"up"`，而那需要一個真的資料庫。**

#### D-2 ⭐⭐ 拿掉 `.next/static` 之後，`GET /` 的回應與健康版本**位元組數完全相同**

**Finding**（實測，非推論）：以 scratchpad 內的變體 Dockerfile build 一個只少了
`apps/web/Dockerfile:48` 那一行 COPY 的 image：

| | 健康 image | 少了 `.next/static` |
|---|---|---|
| `docker build` | EXIT=0 | **EXIT=0** |
| 容器啟動 | Up | **Up** |
| `GET /` | 200 / **5824** bytes | 200 / **5824** bytes |
| HTML 含 zh-Hant 文案 | ✅ | **✅ 照樣有** |
| `_next/static/chunks/*.js` | 200 / 16797 | **404** |

**Implication**：只探 `/` 並斷言 HTML 內容**完全抓不到**這一類缺陷 —— 連長度都一樣。
web 探測必須是兩段：(1) `GET /` 斷言文案，(2) **從回應 HTML 抽取** chunk 路徑再抓一次。
chunk 檔名是 hash 化的（`3l04zcqx63h3y.js`），**每次 build 都變，不可寫死**。

#### D-3 `AD-ImageBuild-1` 的失敗點精確定位；且 **web image 本機 build 得起來**

**Finding**：`docker build -f apps/api/Dockerfile .` 失敗在 `Dockerfile:62` 的
`npm ci` → postinstall `prisma generate` → 下載
`https://binaries.prisma.sh/.../schema-engine.sha256` →
`self-signed certificate in certificate chain`。
**擋住的不是 npm registry**（套件已裝完才跑到 postinstall），是 Prisma engine binary 的下載。
而 `docker build -f apps/web/Dockerfile .` **EXIT=0** —— 它不跑 `prisma generate`。

**Implication**：
- 元驗證 1 / 2（web）可在**本機**做，元驗證 3（api openssl）**只能在 CI** 做
- ⛔ **不繞過**：`NODE_TLS_REJECT_UNAUTHORIZED=0` 或把公司 CA 塞進 Dockerfile 都能讓它過，
  但那是在一套安全平台的 production image build 裡關掉憑證驗證 —— guardrail 1 的直接違反
- `AD-ImageBuild-1` 的描述可據此精確化

#### D-4 跨容器連 DB 的解法不需要碰 `compose.yml` 的 bind 位址

**Finding**：`docker run --rm --network docker_default postgres:18-alpine` 實測 ——
`pg_isready -h postgres` → `postgres:5432 - accepting connections` exit=0；
`psql -h postgres -tAc 'SELECT 1'` → `1` exit=0。容器名 `isms-postgres-dev` 同樣可解析。

**Implication**：容器內走 `postgres:5432`（服務名 + **容器內部** port），
`5433` 只是 host 的 published port。spec 的紅線（不得放寬 `compose.yml:29` 的
`127.0.0.1`）**未被觸及**。
⚠️ 但 network 名 `docker_default` 是 compose 從**目錄名**衍生的 —— CI 必須
明確指定 project name（`docker compose -p <name>`），不可依賴目錄名。

#### D-5 P4 決定：探測用 Node 腳本，不用 inline shell

**理由**（判準是 checklist 寫的「是否需要能在開發機重現」，由 D-3 直接回答）：
1. web 的元驗證可在本機做（D-3），腳本讓那件事可重複 —— 我這次是用 PowerShell 手工做的
2. 探測有真實複雜度：等待迴圈、從 HTML 抽 hash 化路徑、內容斷言。inline shell 難讀難測
3. 跨平台（開發機 Windows / CI ubuntu）—— 與 CH-012 的 `assert-boundary-gate.mjs` 同一理由
4. 可以有自己的單元測試

docker build / run 本身留在 workflow 的 shell —— 那天然是 CI 的工作。腳本只負責**探測**。

#### D-6 剩餘未知：api image 在 CI 能否 build 成功 —— **無法在本機關閉**

GitHub Actions runner 沒有公司 proxy，預期 `binaries.prisma.sh` 可達。
**但那是預期不是實測**，第一次 push 才知道。若 CI 也失敗，本 CH 的範圍要重新評估
（可能需要改 Dockerfile 以避免 build 期下載 engine，那是另一個決定）。

---

### Go / No-Go

**範圍變動 ≪ 20% → GO。** 交付物沒有增減；變的是探測的具體形狀（更明確）、
DB 的存在理由（D-1）、以及元驗證的執行地點分工（D-3）。
D-1 改變了 spec 的一個承重假設，依 R3 記入 spec §範圍決策 changelog，不默默改。

---

## 2026-08-09（實作）

### 做了什麼

- `scripts/smoke-probe.mjs`（新）· `.github/workflows/image-smoke.yml`（新）
- 兩項元驗證在本機跑完（第三項只能在 CI，D-3）

| 元驗證 | build | run | probe | 訊息 |
|---|---|---|---|---|
| 1 `CMD` 指錯 entry | 🟢 EXIT=0 | 🔴 `Exited (1)` | 🔴 EXIT=1 | `timed out ... (ECONNREFUSED)` |
| 2 拿掉 `.next/static` | 🟢 EXIT=0 | 🟢 `Up` | 🔴 EXIT=1 | 指名 `/_next/static/chunks/3l04zcqx63h3y.js -> HTTP 404` |
| 3 拿掉 openssl | ⏳ 只能在 CI | | | |

元驗證 2 是本 CH 存在的理由的直接證據：**三層裡有兩層是綠的**。

### 意外 / 卡住

- **元驗證 1 讓腳本改好了一處**：Node 的 `fetch` 對所有傳輸層失敗都報同一句
  `TypeError: fetch failed`，真正的原因藏在 `error.cause`。
  `ECONNREFUSED`（沒有東西在監聽）與 `ECONNRESET`（中途死掉）指向完全不同的問題 ——
  已改為附上 cause code，並用 `SMOKE_TIMEOUT_MS=5000` 重驗過訊息內容
- **`SMOKE_TIMEOUT_MS` 是為了元驗證加的，不是 speculative**：跑刻意壞掉的 image 時，
  等滿 90 秒是純浪費，而元驗證要跑很多次。**當下就有使用案例**，不是 AP-5
- **自我修正**：`extractChunkPaths` 原本寫了 `export`，但沒有任何東西 import 它
  （self-test 在同檔內）。那是為未來預留的 export → 拿掉

### 這次刻意沒做的兩件事

1. **不繞過 TLS 攔截**去讓本機 api build 通過。`NODE_TLS_REJECT_UNAUTHORIZED=0`
   或把公司 CA 塞進 Dockerfile 都可行，但那是在安全平台的 production image build 裡
   關掉憑證驗證 —— guardrail 1 的直接違反。改為接受「元驗證 3 只能在 CI」
2. **不加「找不到 Dockerfile 就跳過」的守衛**。那個形狀正是 W01 綠著掃 0 個目標的
   trivy job（`security-scan.yml:248-252`）。受測對象消失時本 workflow 必須紅

### Gate（本機）

```
self-test PASS(3) · format:check 0 · prettier(新檔) 0 · lint 0
lint:negative PASS · type-check 0 · api 20 passed · web 10 passed
build 0 · run_all 6/6
```

測試數與 baseline 相同 —— 本 CH 沒有新增 jest/vitest 案例，
腳本的測試是內建的 `--self-test`（理由見 checklist §測試）。

### 明天

- push → CI：關掉 **D-6**（api image 在 CI 能否 build）+ 跑**元驗證 3**

---

## 完成摘要（收尾時填）

**實際 vs spec**：

**Acceptance 逐條**：

| # | 條件 | 結果 | 證據 |
|---|---|---|---|
| A1 | 兩個 image 在 CI 真的 build 成功 | | |
| A2 | 兩個容器真的啟動且探測斷言內容通過 | | |
| A3 | 元驗證 1 —— `CMD` 指錯 → run 紅 | | |
| A4 | 元驗證 2 —— 拿掉 `.next/static` → 探測紅 | | |
| A5 | 元驗證 3 —— 拿掉 openssl → build 或 run 紅 | | |
| A6 | CI 時間未延長現有關鍵路徑 | | |

**Drive-through**：N/A（CI 基礎設施）—— 結論寫 **gate-only verified**

**留下的 carryover**：
