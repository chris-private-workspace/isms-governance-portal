# CH-012 — Progress

**Status**: draft
**Spec**: [`spec.md`](./spec.md) · **Checklist**: [`checklist.md`](./checklist.md)

---

## 2026-08-08

### 做了什麼

- 起草 spec + checklist（pre-doc）—— **尚未寫任何 code**（PROCESS R1）
- 分類確認：**Change 軌**（改既定設計、非 bug、< 3 天；已有可用藍本故非 spike）
- 範圍確認：三個確定性的 gate，刻意不做掃描輸出斷言與 build smoke

### 起草期間的 recon 發現（不是實作，是為了不憑空寫 spec）

- ⭐ **已有藍本**：`scripts/lint/tests/test_workflow_placeholders.py` 就是
  「造 known-bad 輸入 → 斷言 detector 會叫」，且 `ci.yml:97-107` 的迴圈**自動納入新測試檔**。
  這讓本 CH 從 spike 降級為 pattern-reuse → **不需要 design note**
- ⚠️ **`eslint.config.mjs:142-147` 對 `*.spec.ts` / `*.test.ts` 關掉了 `boundaries/dependencies`**。
  fixture 若用這兩種副檔名命名，會安靜地永遠通過 —— **那就是我們正在修的病的複刻**
- 🔴 **找到一個真實缺口**：`16:21` 要求 `Permissions-Policy` 存在，
  而 W01 Day 3 實測的 API 標頭裡**沒有它**（`next.config.ts:31` 有設，helmet 那邊沒有）。
  W01 的手動 curl 走查沒抓到，因為人是在確認「有沒有我設的那幾條」，
  不是「`16` 要求的每一條在不在」

### Day 0 verify —— 六項全跑，探針已移除

> 兩個探針檔（`__fixtures__/cross-scope-import.ts` · `bootstrap/day0-probe.spec.ts`）
> 建立→實測→**刪除**，工作樹回到 baseline（`lint EXIT=0` · `Tests: 8 passed`）。

| Prong | 結果 |
|---|---|
| **P1 路徑** | 🟡 兩處行號 drift（見下 D-1 / D-2）。三處引用結構皆如預期 |
| **P2 `--ignore-pattern`** | ✅ **承重假設成立** |
| **P2b 單檔 zone 分類** | ✅ 兩種 cwd 皆正確 |
| **P2c `listen(0)` + `fetch`** | ✅ **不需要 supertest** |
| **P3 `16` 逐條抄出** | 🟡 抄出後發現 spec 的斷言表少了一項（見 D-3）|
| **Catalog / Go-no-go** | ✅ 本節即 catalog；**GO**（範圍變動 ≪20%）|

#### P2 —— spec §Solution 第 2 項的承重假設，成立

```
A) npx eslint src                                      → EXIT=1
   2:31 error There is no policy allowing dependencies from elements of type
        "audit-trail" to elements of type "core-model"   boundaries/dependencies
B) npx eslint src --ignore-pattern "**/__fixtures__/**" → EXIT=0
```

fixture 在原地不動，生產 lint 綠、負面斷言紅。**不需要 `--no-ignore`**（那會連
`node_modules` 一起解禁）。

#### P2b —— 單檔呼叫，兩種 cwd 都印出規則名

從 workspace（`apps/api`）與從 repo 根各跑一次，兩者都是
`boundaries/dependencies` 而**不是** `no-unknown`。原因可解釋：
`boundaries/root-path` 用 `import.meta.dirname`（絕對路徑），不受 cwd 影響 ——
這正是 W01 修掉的第五種失效方式。

#### P2c —— 不需要 supertest

在**真的 jest 環境**裡跑（不是旁邊的腳本猜）：

```
PROBE getUrl()            => http://127.0.0.1:65229      ← 拿得到實際埠，IPv4，乾淨
PROBE status              => 200                          ← Node 全域 fetch 可用
PROBE x-frame-options     => DENY                         ← 標頭讀得到
PROBE x-powered-by        => null                         ← disable 有效
PROBE permissions-policy  => null                         ← ⭐ 見下
```

⭐ **探針獨立確認了起草時發現的缺口**：起草時是靠比對 W01 Day 3 的 curl 輸出推斷
`Permissions-Policy` 缺席；這次是用**測試將來實際會用的同一個機制**再驗一次，結論一致。
`16:21` 要求它存在，helmet 不提供它。

### Drift findings

| ID | Finding | Implication |
|---|---|---|
| **D-1** | spec 引用 `eslint.config.mjs:55` 為 `el('audit-trail', ...)`，**實際 62** | 純引用錯誤，不影響設計。修 spec |
| **D-2** | spec 引用 `eslint.config.mjs:78-81` 為 audit-trail 的理由註解，**實際 75-78** | 同上 |
| **D-3** ⭐ | P3 抄出 `16` 後發現 **第 22 項**（`Cache-Control: no-store, private` 於敏感頁面與 API 回應）**不在 spec 的斷言表內** | 範圍問題，非引用錯誤 —— **需要決定**，見下 |

> D-1 / D-2 正是 `task-workflow.md` **Risk Class D**（plan 引用檔案路徑靠猜）的形狀。
> 這次是行號而非路徑，成本很低（各 1 分鐘），但它證明 Prong 1 對**行號**同樣有效。
> 已依 R3 記在這裡，**不默默改 spec 的 §Technical Spec**。

### D-3 需要拍板（未自行決定）

`16:22`：「Sensitive pages and API responses use `Cache-Control: no-store, private`；
nothing sensitive is `public` or carries `max-age` > 86400」。

現況：`apps/api` **完全沒有設 `Cache-Control`**。

兩難之處在「sensitive」的判定：`/health` 不是敏感端點，所以今天嚴格說沒有違反第 22 項；
但 M1 之後的每一個業務端點都會是。可選：

1. **本 CH 不做，記 AD** —— 斷言表維持 `16` 的 2/18/20/21 四項。
   理由：現在沒有敏感端點，加了就是對著不存在的風險寫斷言
2. **本 CH 一併做** —— 現在就設 `Cache-Control: no-store, private` 為預設並斷言。
   理由：M0 的義務是「把能自動化的編碼進 CI」（`16:85`），而預設值一旦錯過就要逐個端點補

**我的建議是 1**，但這是範圍決定不是技術判斷 → 待使用者拍板。

### 意外 / 卡住

- 無阻塞。三個承重假設全部成立，**spec 的技術路線不需要改**

### 明天

- 依 D-3 的決定調整 spec 斷言表 → 修 D-1 / D-2 的行號 → 進入實作

---

## 2026-08-09

### 做了什麼

三個 gate 全部落地，**每一個都通過元驗證**（故意弄壞 → 負面案例必須紅 → 還原 → 轉綠）。

| Gate | 實作 | 弄壞的方式 | 結果 |
|---|---|---|---|
| boundaries | `__fixtures__/cross-scope-import.ts` + `scripts/assert-boundary-gate.mjs` | `boundaries/elements: []` | lint / type-check / test **全綠**，只有 `lint:negative` EXIT=1 |
| i18n parity | `parityViolations()` 抽進測試檔，兩個方向都斷言 | 從 `en.json` 刪 `health.refresh` | 4 個測試同時紅並指名該 key |
| 安全標頭 | `bootstrap/security.ts` + `security.spec.ts` | 重現 `helmet({xPoweredBy:false})` | `● does not disclose x-powered-by` / `Received: "Express"` |

boundaries 那一列是本 CH 的核心證據：**其他每一個 gate 都看不見那個失效。**

### ⭐⭐ 最重要的發現 —— 我先講錯了一次，量測推翻了它

修好標頭斷言後我先斷言「`disable('x-powered-by')` 那行是冗餘的」，理由是實測
`helmet()` 自己就會移除該標頭。**那個實驗問錯了問題** —— W01 的設定不是 `helmet()`，
是 `helmet({ xPoweredBy: false, ... })`。三種設定實測：

```
helmet()                          → X-Powered-By 不存在
helmet({ xPoweredBy: false })     → X-Powered-By: Express     ← 拼錯的選項名
helmet({ noSniff, frameguard })   → X-Powered-By 不存在
```

> **傳一個不存在的 helmet 選項不會報錯，它會靜默關掉一個預設開啟的保護。**

這是 `AD-NegativeGate-1` 那個形狀的**函式庫層版本**，而且比我們自己寫的設定更難察覺 ——
你連「這個選項名不存在」都不會被告知。

原本 `main.ts` 的註解寫「Helmet's option did NOT remove it」，字面為真但**把原因說錯了**，
而錯的那個原因會誘使下一個人再把 `xPoweredBy: false` 加回去。已改寫成三行實測結果 +
明確的「不要這樣簡化」。那行 adapter `disable` 保留 —— guardrail 7 要求明確設定而非繼承行為。

### Drift / 意外

| ID | Finding | 處置 |
|---|---|---|
| **D-4** | `eslint.config.mjs:110-114` 的註解稱「`settings` 掛在有 `files` 的區塊會使 elements 為空」。**在 ESLint 10 下重現不出來** —— 我加了 `files: ['apps/**/*.ts']`，從 repo 根與從 workspace cwd 兩種呼叫**規則都照樣生效** | ⚠️ **不默默改那段註解**。我只知道「我試的形狀不會失效」，不知道「W01 當時是哪個形狀」。記為 `AD-EslintSettingsClaim-1` |
| **D-5** | `__fixtures__` **洩漏進 production build**（`dist/audit-trail/__fixtures__`）| `tsconfig.build.json` 加 `src/**/__fixtures__/**` 排除，`rm -rf dist` 重建確認 |
| **D-6** | `security.ts` 需要 express 的 `Request`/`Response` 型別，但 `@types/express` 未安裝，而 spec 明訂 **NO 新依賴** | 改用結構化型別 `HeaderWritable`（只描述實際用到的 `setHeader`）。不為一個方法引入一份要跟 `@nestjs/platform-express` 對齊版本的相依 |

### 📌 與 checklist 的偏離（R3）

checklist 寫 `npm run lint:negative -w apps/api`，**實作放在 root**。理由：受測對象
`eslint.config.mjs` 與 eslint 本身都在 root，放 workspace 是錯位。
而且元驗證意外教了一件事 —— **腳本從哪個 cwd 呼叫會影響 eslint 的解析結果**，
放 root 讓這件事只有一種答案。

實作用 Node 腳本而非 shell 一行：開發機是 Windows、CI 是 ubuntu，
`spawnSync(process.execPath, ...)` 不需要 `shell: true`。

腳本內三個斷言，**第二個最重要**：只斷言 `exit≠0` 不夠 ——
fixture 若因語法錯誤而壞掉也會 exit 1，而 boundaries 規則早已死了。
第一個斷言 fixture 存在（被刪掉時 eslint 會因無匹配檔案而非零退出，
天真的 exit code 檢查會**接受**那個情況）。

### 真 runtime 驗證（不是只看測試綠）

W01 的 `X-Powered-By` 證明過測試斷言與真實回應可以不一致，所以乾淨重啟後實測：

```
Permissions-Policy: camera=(), microphone=(), geolocation=()   ← 新增，補上 16:21 的缺口
X-Powered-By                                                    ← 不存在
Access-Control-Allow-Origin: http://localhost:3200              ← 具名，非 *
```

### Gate 實際輸出

```
api   Tests 20 passed / 4 suites   (baseline 8 → +12)
web   Tests 10 passed / 1 file     (baseline 8 → +2)
lint / type-check / format / build  全 EXIT=0
lint:negative  PASS — boundaries/dependencies rejected audit-trail -> core-model
run_all  6/6
```

### 明天

- `ci.yml` 接上 `lint:negative`（**改 CI，需先確認具體改動**）
- BACKLOG 同步 · W01 checklist 2.3 的 🚧 關閉 · spec `status: done`

---

## 完成摘要（收尾時填）

**實際 vs spec**：<待填>

**Acceptance 逐條**：

| # | 條件 | 結果 | 證據 |
|---|---|---|---|
| A1 | 三個 gate 各有常駐負面案例且 CI 會跑 | — | |
| A2 | 負面案例真的會因 gate 失效而失敗（元驗證）| — | |
| A3 | `Permissions-Policy` 在真 runtime 出現 | — | |
