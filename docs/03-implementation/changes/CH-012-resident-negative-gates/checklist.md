# CH-012 — Checklist

> 從 [`spec.md`](./spec.md) 導出。
> 🔴 **只能 `[ ]` → `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

## Day 0 — Verify（寫 code 之前）

- [x] **P1 路徑驗證**：`eslint.config.mjs` 的 `ELEMENTS` / `ignores` / spec override 三處行號與 spec 一致
      —— 🟡 兩處行號 drift（D-1 `55`→`62`、D-2 `78-81`→`75-78`），結構皆如預期
  - Verify: Grep `el('audit-trail'` · `files: \['\*\*/\*.spec.ts'` 於 `eslint.config.mjs`
- [x] **P2 內容驗證 — `--ignore-pattern` 真的能讓生產 lint 跳過 fixture** —— ✅ **承重假設成立**
  - DoD: `eslint src` EXIT=1 → 加 `--ignore-pattern "**/__fixtures__/**"` 後 **EXIT=0**
  - ⚠️ 這是 spec §Solution 第 2 項的承重假設。**不成立就先 STOP and ask**，不要改用 `--no-ignore` 硬闖
- [x] **P2b 內容驗證 — 對單一檔案跑 eslint 時 zone 分類仍正確** —— ✅ 兩種 cwd 皆印出規則名
  - DoD: 直接 `npx eslint <fixture>` 要印出 `boundaries/dependencies` 而非 `no-unknown`
  - ⚠️ `boundaries/root-path` 用 `import.meta.dirname`；從 repo 根呼叫與從 workspace 呼叫需分別驗
- [x] **P2c 內容驗證 — Node 內建 `fetch` + `app.listen(0)` 能取到實際埠** —— ✅ **不需要 supertest**
  - DoD: `getUrl()` → `http://127.0.0.1:65229`；探針順帶獨立確認 `permissions-policy => null`
- [x] **P3 — `16-secure-development-dod.md` 的 transport/headers 分項逐條抄出**
  - DoD: 斷言清單來自 `16`，**不是**從現有 helmet 設定反推
      —— 抄出後發現 spec 漏了第 22 項（D-3），使用者拍板不做 → `AD-CacheControl-1`
- [x] Drift findings → `progress.md`；範圍變動 >20% 回頭修 spec 並再確認 —— **GO**（≪20%）

## 實作

- [x] **boundaries fixture**（`apps/api/src/audit-trail/__fixtures__/cross-scope-import.ts`）
  - DoD: 檔名**不含** `.spec.` / `.test.`（否則規則被 `eslint.config.mjs:142` 關掉）；
        內容 import `core-model`，帶 header 註解說明它為什麼**必須**保持違規
  - Verify: `npx eslint apps/api/src/audit-trail/__fixtures__/cross-scope-import.ts` → EXIT≠0
- [x] **`lint` 排除 fixture · 新增 `lint:negative`**
      —— 📌 **deviation（R3）**：`lint:negative` 放在 **root `package.json`** 而非 `apps/api`。
      受測對象 `eslint.config.mjs` 與 eslint 本身都在 root；且元驗證顯示
      **腳本從哪個 cwd 呼叫會影響解析結果**，放 root 讓它只有一種答案
  - DoD: `lint` EXIT=0（fixture 在但被跳過）；`lint:negative` 斷言 **exit≠0 且輸出含
        `boundaries/dependencies`** —— 只斷言 exit code 不夠（語法錯也會 exit 1）。
        實作為 Node 腳本非 shell 一行（開發機 Windows / CI ubuntu）
  - Verify: `npm run lint -w apps/api` EXIT=0 · `npm run lint:negative` EXIT=0
- [x] **fixture 排除於 build**（`apps/api/tsconfig.build.json`）
      —— ⚠️ **實測時它真的洩漏了**（`dist/audit-trail/__fixtures__`），排除後 `rm -rf dist` 重建確認
  - DoD: `dist/` 內不含 `__fixtures__`；**prettier 仍涵蓋它**（它是 repo 內的 code）
  - Verify: `npm run build -w apps/api && ls apps/api/dist/audit-trail` → No such file
- [x] **fixture 排除於覆蓋率**（`apps/api/jest.config.js`，Day 1 新增項）
  - DoD: 它設計上永遠不會被執行，算進覆蓋率是雜訊；未排除時總計由 100 掉到 95.23
  - Verify: `npm run test:cov -w apps/api` → `All files 100 | 78.57 | 100 | 100`
- [x] **抽出 `applySecurity(app)`**（新增 `apps/api/src/bootstrap/security.ts`；`main.ts` 改為呼叫）
  - DoD: **純搬移，行為零變動**。三段（`disable('x-powered-by')` / helmet / CORS）逐字搬
        —— 📌 一處非搬移：改用結構化型別 `HeaderWritable` 取代 express 型別（D-6，避免新增 `@types/express`）
  - Verify: `curl -s -i http://127.0.0.1:3210/health` 標頭集合與 W01 Day 3 實測相同 + 多一條 `Permissions-Policy`
- [x] **補 `Permissions-Policy`**（`security.ts`）
  - DoD: 值與 `apps/web/next.config.ts:31` 一致（`camera=(), microphone=(), geolocation=()`）
  - Verify: 真 runtime `curl -i` 實測到 `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] **`ci.yml` 新增獨立的 `Negative gates` 步驟**（使用者 2026-08-09 核可具體改動）
  - DoD: 獨立步驟而非併入 Lint —— 失敗時 job 摘要直接點名它，
        而這個 gate 的整個意義就是「別的都綠的時候只有我會叫」
  - Verify: 帶同樣的 `package.json` 存在性 guard，與周圍五步一致

## 測試

- [x] **`apps/api/src/bootstrap/security.spec.ts`** —— 對照 `16` 逐條斷言（+9 個測試）
  - DoD: 涵蓋 `16` 第 2 / 18 / 20 / 21 項 + CORS 單一具名 origin；
        **`X-Powered-By` 與 `Server` 斷言為「不存在」**（W01 的 #4 就是這條）
  - Verify: `npm run test -w apps/api` → **20 passed**（baseline 8 → **+12**）
- [x] **`apps/web/src/i18n/i18n.test.ts` 加自我驗證**（+2 個測試）
  - DoD: 抽出 `parityViolations(dicts)`（**留在測試檔內**，不新建 production 檔 = AP-1）；
        真實字典回 `[]`；抽掉一個 key 的副本**回傳那個 key**；多一個「多出來的 key」方向
  - Verify: `npm run test -w apps/web` → **10 passed**（baseline 8 → **+2**）

## 驗收

- [x] **三個 gate 各有一個常駐負面案例，且 CI 會跑**
  - Verify: ⏳ 本機三者皆綠；CI 的實際輸出待 push 後以 `gh run view --log` 確認
- [x] **負面案例真的會因為 gate 失效而失敗**（元驗證 —— 這是本 CH 唯一有效的證明）
  - ⚠️ **原本寫的重現方式無效**：把 `settings` 搬回有 `files` 的區塊，在 ESLint 10 下
        **規則照樣生效**（兩種 cwd 皆是）→ `AD-EslintSettingsClaim-1`，**不默默改那段註解**
  - DoD（改用真的會失效的方式）：`boundaries/elements: []` →
        `lint` / `type-check` / `test` **全綠**，只有 `lint:negative` **EXIT=1** 並印出
        eslint 自己的 `Please provide element descriptors` 警告；還原後轉綠
  - 另兩個 gate 同樣做過：刪 `en.json` 的 key → 4 個測試紅並指名該 key；
        重現 `helmet({xPoweredBy:false})` → `● does not disclose x-powered-by / Received: "Express"`
- [x] **`Permissions-Policy` 在真 runtime 出現**（spec §Verification 的唯一例外）
  - Verify: 乾淨重啟後實測 `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Drive-through

- [x] ⚪ **N/A —— 純測試基礎設施**，結論一律寫 `gate-only verified`
  - 例外的 `Permissions-Policy` 已用真 runtime 的 `curl -i` 驗證（上方驗收第 3 項），非只看測試綠

## 收尾

- [x] `progress.md` 寫完成摘要，`spec.md` frontmatter `status:` → `done`
- [x] BACKLOG 同步：`AD-NegativeGate-1` 更新為「5 個機制 → 3 個覆蓋」（**不關閉**）；
      新增 `AD-HelmetSilentOption-1` · `AD-EslintSettingsClaim-1` · `AD-CacheControl-1`
- [x] W01 `checklist.md` 2.3 的 🚧 標為關閉並指向本 CH
- [x] 架構級決定有 ADR（R5）—— **無**。`applySecurity` 的抽取未跨分層：
      `bootstrap` 本來就不是範疇，它仍在同一個 composition root 目錄內
- [ ] Commit → ⏳ PR push + merge: **PENDING USER CONFIRMATION**
