# CH-013 — Checklist

> 從 [`spec.md`](./spec.md) 導出。
> 🔴 **只能 `[ ]` → `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

## Day 0 — Verify（寫 code 之前）

- [x] **P0 ⭐ 本機 docker build 到底能不能跑** —— 🟡 **api 不能、web 能**（D-3）
  - DoD: 失敗點精確定位在 `apps/api/Dockerfile:62` 的 `npm ci` → postinstall
        `prisma generate` → 下載 `binaries.prisma.sh` 的 engine →
        `self-signed certificate in certificate chain`。**擋住的不是 npm registry**
  - ⭐ `docker build -f apps/web/Dockerfile .` → **EXIT=0**（它不跑 `prisma generate`）
        → 元驗證 1/2 在本機做，**只有元驗證 3 必須在 CI**
  - ⛔ **不繞過** `NODE_TLS_REJECT_UNAUTHORIZED=0` / 把公司 CA 塞進 Dockerfile ——
        在安全平台的 production image build 裡關掉憑證驗證是 guardrail 1 的直接違反
- [x] **P1 路徑驗證**：13 處錨點逐一核對 —— ✅ **零 drift**
  - Verify: `apps/api/Dockerfile:27-32,37-40,50-53,54-56,96-100` · `apps/web/Dockerfile:48` ·
        `security-scan.yml:286-291` · `ci.yml:3-10,194` · `compose.yml:12-13,29` ·
        `prisma.service.ts:43-48,52-54`
- [x] **P2 內容驗證 — API 容器在 DB 連不上時會不會啟動失敗** ⚠️ **承重假設 → 推翻**（D-1）
  - DoD: 實測 12 秒後 process **仍在監聽**，`/health` 回 `{"status":"up","db":"down"}`
  - ⭐ 但 DB **仍必須起**，理由換成：元驗證 3 的失敗形狀也是 `db:"down"`，
        不起 DB 的話兩者輸出完全相同、gate 抓不到。**探測必須斷言 `db:"up"`**
- [x] **P3 內容驗證 — CI 內的網路形狀** —— ✅ **紅線未觸及**（D-4）
  - DoD: `--network docker_default` + 服務名 `postgres:5432` 實測可達
        （`pg_isready` exit=0 · `psql -tAc 'SELECT 1'` → `1` exit=0）。
        `5433` 只是 host 的 published port，**不需要改 `compose.yml:29` 的 bind**
  - ⚠️ network 名由 compose 從**目錄名**衍生 → CI 必須明確指定 `docker compose -p <name>`
- [x] **P4 決定 — 探測邏輯的形狀** —— **Node 腳本**（D-5）
  - DoD: 判準「是否需要能在開發機重現」由 P0 直接回答 —— web 元驗證可在本機做，
        腳本讓它可重複。docker build/run 留在 workflow 的 shell，腳本只負責**探測**
- [x] **P5 內容驗證 — 探測斷言的內容** —— 從真實回應抄出（D-2）
  - DoD: `/health` DB 通 → `{"status":"up","db":"up"}` HTTP 200
        `application/json; charset=utf-8`；DB 不通 → `{"status":"up","db":"down"}`
  - ⭐⭐ **web 的斷言形狀被實驗推翻**：拿掉 `.next/static` 後 `GET /` 回 200 且
        **位元組數與健康版本完全相同（5824）**、zh-Hant 文案照樣在，只有
        `_next/static/chunks/*.js` 回 404 → **必須兩段探測，第二段 URL 從 HTML 抽取**
        （chunk 名 hash 化，每次 build 變）
- [x] **P6 內容驗證 — web 容器能否獨立啟動** —— ✅ **能**（實測，非只讀 code）
  - DoD: `page.tsx:28` 是 `'use client'`、fetch 在 `useEffect`（`:42-55`）→ client-side；
        且真的跑了容器：無 API 的情況下 `GET /` 回 **HTTP 200 / 5824 bytes**
- [x] Drift findings → `progress.md`（D-1 ~ D-6）；範圍變動 **≪20% → GO**，
      D-1/D-2/D-3/D-5 依 R3 記入 spec §Day-0 changelog

## 實作

- [x] **`.github/workflows/image-smoke.yml`**（新）
  - DoD: 對兩個 Dockerfile 各做 build → run → probe；檔頭**重述** `ci.yml:3-10` 的
        「不用 paths filter」設計決策及其理由 —— 並補了一層本 workflow 專屬的理由：
        **image 正確性不只取決於 Dockerfile**（改 `start` / `next.config` / lockfile
        都能弄壞 image 而不碰 Dockerfile，W01 的 `08ddc0f` 正是這一類）
  - DoD: 「找不到 Dockerfile 就跳過」的守衛**刻意不寫** —— 那正是 W01 綠著掃 0 個目標的
        trivy job（`security-scan.yml:248-252`）。改為缺席即 `::error::` 並 exit 1
  - Verify: ⏳ `actionlint` 由 CI 的 Workflow lint 步驟執行（本機未安裝）
- [x] **探測邏輯**（Day 0 P4 決定：Node 腳本）→ `scripts/smoke-probe.mjs`
  - DoD: 斷言**內容**而非只有狀態碼 —— web 兩段式（頁面文案 + 從 HTML 抽出的每個
        `_next/static` asset）、api 要求 `db:"up"`
  - DoD: 期望文案**從 `zh-Hant.json` 讀**而非硬編碼 —— 否則改文案會變成假陽性
  - DoD: **零 chunk = FAIL**，不是 pass。regex 若因 Next 改版失效，
        「沒東西可檢查」當成「沒問題」正是本 CH 要消滅的靜默綠
  - Verify: `node scripts/smoke-probe.mjs --self-test` → 3 cases PASS
- [ ] **修 `apps/api/Dockerfile:62` —— 加 `--ignore-scripts`**（範圍擴大，使用者 2026-08-09 拍板）
  - 由來: `image-smoke` 首航即抓到。postinstall 的 `prisma generate` 跑在
        `prisma/schema.prisma` 被 COPY 進去（`:66`）**之前** → `schema.prisma: file not found`
  - ⭐ W01 **已知道這件事只修了一半**：header `:33-35` 明寫 prod-deps 需要
        `--ignore-scripts`，`:80` 也確實加了 —— build 階段漏了。header 註解一併更正，
        否則下一個人會照原文以為 build 階段不需要
  - DoD: 本機失敗點從 `:62` **前進到 `:70`**（那裡才真的下載 engine，撞公司 proxy）——
        **失敗形狀改變**是修法生效的證據；完整驗證只能靠 CI
  - Verify: ⏳ CI 的 `Build api image` 步驟通過
- [ ] **`docs/01-planning/BACKLOG.md` 同步**
  - DoD: `AD-ImageBuild-1` 關閉 · `AD-NegativeGate-1` 更新為 4/5（**不關閉**）·
        `AD-SecScan-1` 更新剩餘缺口只剩 DAST · **新增** trivy 完整 image 掃描的 AD
  - DoD: `AD-CIRequired-1` 補註「現在有兩個 workflow 要設 required」

## 測試

- [x] **探測腳本的單元測試** —— 做了，形式是**內建 `--self-test`**（3 個 case）
  - DoD: 只測 `extractChunkPaths` —— 這個檔唯一的解析邏輯，也是唯一會**靜默**失效的部分
        （regex 停止匹配 → 零命中）。HTTP 路徑由元驗證覆蓋，不重複造 mock
  - 📌 **為什麼不放進 `apps/api` 或 `apps/web` 的 runner**：這個腳本不屬於任何 workspace，
        把它的測試塞進 `apps/web` 會製造一個 `apps/web` → `scripts/` 的相依，方向是錯的。
        `--self-test` 在 CI 是一行、不需新 runner，且排在 build 之前（最便宜的失敗）
  - Verify: `node scripts/smoke-probe.mjs --self-test` → `PASS — 3 cases`
        · `npm run test -w apps/api -w apps/web` → 20 / 10 passed（baseline 不變）

## 驗收（對應 spec §Verification）

- [x] **兩個 image 在 CI 真的 build 成功**（run `31299823765`）
  - Verify: log 兩行 —— `naming to docker.io/library/isms-api:smoke done` ·
        `naming to docker.io/library/isms-web:smoke done`。**不是看 job 綠燈**
  - ⭐ **api image 第一次被任何東西 build 成功**，同時關掉 D-6：
        runner 上 `binaries.prisma.sh` 可達，本機那個 TLS 攔截確實只是公司 proxy
- [x] **兩個容器真的啟動，且探測斷言內容通過**
  - Verify: log 印出實際回應而不只是「PASS」——
        `[smoke:api] PASS ... -> {"status":"up","db":"up"}` ·
        `[smoke:web] PASS ... all 7 referenced assets`（逐一列出 7 個路徑）·
        `容器日誌` 步驟印出 `[Nest] Nest application successfully started`
- [x] **元驗證 1 — `CMD` 指向不存在的檔** → build 綠、**run 紅** ｜ 📍**本機**（web image，D-3）
  - 實測: `BUILD EXIT=0` · 容器 `Exited (1)` · 探測 `EXIT=1`
        `timed out after 90s ... Last seen: TypeError: fetch failed (ECONNREFUSED)`
  - ⭐ **這一項讓探測腳本改好了一處**：原本只印 `TypeError: fetch failed`（Node 的 fetch
        把真正原因藏在 `error.cause`）。已改為附上 `ECONNREFUSED` / `ECONNRESET` ——
        兩者指向完全不同的問題
  - DoD: 還原後確認轉綠 ✅（健康 image 探測 `EXIT=0`，7 個 asset 全過）
- [x] **元驗證 2 — 拿掉 `apps/web/Dockerfile:48` 的 `.next/static` COPY** → build 綠、run 綠、**探測紅**
      ｜ 📍**本機**（D-3）
  - 實測: `BUILD EXIT=0` · `CONTAINER: Up` · 探測 `EXIT=1` 並指名
        `/_next/static/chunks/3l04zcqx63h3y.js -> HTTP 404`
  - DoD: 還原後確認轉綠 ✅。**這一項是本 CH 最有價值的** —— 三層裡有兩層是綠的，
        只有最後一層叫。Day-0 量到兩者的 `GET /` **位元組數完全相同**（5824）
- [x] **元驗證 3 — 拿掉 openssl 安裝** → ❌ **gate 抓不到這一類**（誠實記錄，非跳過）
      ｜ 📍CI（PR #23，已關閉並刪分支；run `31300101058`）
  - **結論**：CI log 出現 `Dockerfile:55-58` 註解引用的一字不差的警告
        （`Prisma failed to detect the libssl/openssl version ... Defaulting to "openssl-1.1.x"`），
        **但後續全部成功**：`✔ Generated Prisma Client (v7.9.1)` · build 綠 ·
        `[smoke:api] PASS {"status":"up","db":"up"}`。缺 openssl 只產生警告，不產生可觀測故障
  - ⚠️ **第一次嘗試無效，是我的方法錯誤**：只拿掉 `openssl` 套件名而保留 `ca-certificates` ——
        後者在 Debian 上 **Depends on openssl**，apt 又把它裝回來了
        （log: `Setting up openssl (3.0.20-1~deb12u2)`）。那次的綠代表**變因根本沒動**。
        我用「改了設定」當作「效果改變」的證據，沒看實際安裝結果。
        正確控制組是拿掉整個 `RUN`（也才是 `-slim` 的 pre-W01 真實狀態）
  - 📌 **衍生**：`Dockerfile:55-58` 的「then the wrong engine」是從警告推出的**推論**不是觀測。
        依 `AD-EslintSettingsClaim-1` 先例**不改那段註解**（單次觀測、不知 W01 當時全貌），
        改為記 AD。保留 openssl 安裝仍然正確 —— 消除警告、不靠「預設剛好能用」
- [x] **元驗證 4 — api 側的替代負面案例：DB 不可達時 `db:"up"` 斷言必須紅** ｜ 📍本機
  - DoD: 對象是**探測腳本的斷言**而非 Dockerfile，所以本機可驗
  - 實測: API 回 **HTTP 200** `{"status":"up","db":"down"}`（只看狀態碼的探測會放行）
        → 探測 `EXIT=1`，`Last seen: db was "down"`
  - ⭐ 這一項守著 api 探測裡**唯一超越「port 有回應」的部分**。若有人把斷言改成只檢查
        `status`，probe 仍會綠 —— 那就是靜默失效
- [x] **CI 時間實測並回填 spec §Impact**
  - 實測: `映像 build + 啟動探測` **1m56s**（首次成功）· 對照 `gates` 1m5s。
        獨立 workflow 天然平行，**未延長現有關鍵路徑**

## Drive-through（user-facing 才需要，PROCESS R8）

- [ ] ⚪ **N/A —— CI 基礎設施**，結論一律寫 `gate-only verified`
  - ⚠️ 本 CH 交付的東西**本身**是把 drive-through 的一部分自動化，
        但那不等於本 CH 自己被 drive-through 過。兩件事不可混為一談

## 收尾

- [ ] `progress.md` 寫完成摘要，`spec.md` frontmatter `status:` → `done`
- [ ] BACKLOG 同步（R7）—— 見上方實作段的兩項 DoD
- [ ] **W01 `checklist.md` 的 🚧 Dockerfile build 驗證標為關閉並指向本 CH**
  - ⚠️ 只能標記，**不可刪除該未勾項**（PROCESS R6）
- [ ] 架構級決定有 ADR（R5）—— 預期**無**（既有機制的接線，不跨分層、不選型）。
      若 Day 0 發現需要選 CI 平台能力（如 self-hosted runner）則重新評估
- [ ] Commit → PR push + merge（**需使用者確認** —— 改 CI/CD）
  - DoD: `gh` 驗證而非宣稱 —— `state=MERGED` + tip hash
