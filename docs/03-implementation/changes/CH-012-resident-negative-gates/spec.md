---
status: done     # proposed | approved | active | done | cancelled —— 機器可讀的唯一權威
affects_components: []
---

# CH-012 — 讓三個 gate 帶著自己的負面案例

**Date**: 2026-08-08
**Phase**: 無 —— 獨立 Change（W01 已 `closed_partial`）
**Scope**: 工具鏈（eslint / vitest / jest）+ `bootstrap` — backend + FE 測試層（**NO migration** · **NO 新依賴**）
**Status**: 已完成（laitim2001 於 2026-08-09 核可；Day-0 的 D-3 範圍問題同日拍板為「不做，記 AD」）
**PR**: 待開

---

## Problem

W01 交付了一批「宣稱會擋住某件事」的機制。其中 **5 個在同一個 phase 內被發現是靜默失效的**：

| # | 什麼是綠的 | 實際上 |
|---|---|---|
| 1 | `npm run lint` | boundaries 規則零強制力（**六種**設定失效方式，全部表現為綠）|
| 2 | `security-scan` 四 job success | 三個掃了 0 個目標 |
| 3 | `npm run build` 成功 | 產物 require 不到 Prisma client |
| 4 | helmet 設定 `xPoweredBy: false` | `X-Powered-By: Express` 照樣回 |
| 5 | CI Tests 步驟 success | 跑 `test` 不是 `test:cov`，覆蓋率 45% 一路綠 |

五個全部已修。**但沒有任何一個是被機制自己抓到的** —— 全部靠人手動戳。
W01 的 drive-through 對 #1 與 i18n 做過一次性負面驗證，證據留在 progress.md，
**而那是一次性的**：明天有人改壞 `eslint.config.mjs` 的 `settings` 位置，
lint 依然全綠，沒有東西會叫。

量化：目前 repo 內有 **1 個** gate 帶著常駐負面案例（`check_workflow_placeholders.py`，
由 `scripts/lint/tests/test_workflow_placeholders.py` 覆蓋，CI 每次跑，`Ran 8 tests OK`）。
其餘 gate **0 個**。

### 順帶：已經找到一個真實缺口

起草本 spec 時比對 `16-secure-development-dod.md` 與 W01 Day 3 的實測標頭，
發現 **API 沒有回 `Permissions-Policy`**：

- `16:21` 要求 `X-Content-Type-Options` / `Referrer-Policy` / **`Permissions-Policy`** / `X-Frame-Options` **全部存在**
- Day 3 實測 `curl -i http://127.0.0.1:3210/health` 的標頭清單裡**沒有 `Permissions-Policy`**
- `apps/web/next.config.ts` 有設，`apps/api` 的 helmet 設定沒有

它從 W01 第一天就缺，而 W01 的手動 curl 走查沒抓到 —— **因為人是去確認「有沒有我設的那幾條」，
不是去確認「`16` 要求的每一條在不在」**。這正是需要逐條斷言而非人眼掃描的理由。

---

## Root Cause

**不是「還沒寫測試」。**

根因是這五個機制屬於同一個類別：**設定型強制力**。你寫一段設定，宣告某件事應該被檢查。
它們的共同性質是 —— **設定損壞時不會報錯，而是安靜地什麼都不做**，
而外層的 `EXIT=0` 讀起來與「檢查通過」完全一樣。

對比 `scripts/lint/` 的 Python detector：它們是**程序型**強制力，寫錯通常會 traceback。
即使如此，`lint-detector-authoring.md:199` 仍然要求「detector 自己也是 code」並附測試 ——
**專案已經對程序型強制力承認了這個義務，卻沒有把它延伸到設定型強制力上**。

`ci.yml:97-107` 的迴圈已經自動納入 `scripts/lint/tests/test_*.py`，
所以 Python 那半邊的機制是完整的。缺的是 JS/TS 這半邊。

---

## Solution

### 範圍決策（使用者 2026-08-08 拍板）

**做三個確定性的**，不做另外兩個：

| 機制 | 做？ | 理由 |
|---|---|---|
| 1 eslint boundaries | ✅ | 快、確定性、不依賴外部服務 |
| 2 i18n parity | ✅ | 同上；且型別檢查抓不到缺 key，parity 測試是唯一閂門 |
| 4 安全標頭 | ✅ | 同上；**順帶關掉 W01 checklist 2.3 的 🚧** |
| 3 掃描輸出斷言 | ❌ | 要 parse job log，**掃描工具升版就壞** —— 一個脆弱的 gate 本身就是下一個 AD |
| 5 build+run smoke | ❌ | 需在 CI 內起 PostgreSQL 並跑 dist 產物，成本另一個量級 → 續留 `AD-ImageBuild-1` |

`AD-NegativeGate-1` **不會因本 CH 關閉**，只會從「5 個機制 0 個覆蓋」變成「5 個機制 3 個覆蓋」。

### 逐項變更

**1. boundaries fixture + 斷言腳本**（`apps/api/src/audit-trail/__fixtures__/cross-scope-import.ts`）

一個**真的違反矩陣**的檔案，常駐在 repo 內。`audit-trail` → `core-model` 是矩陣裡三個
刻意 ❌ 之一（`eslint.config.mjs:75-78` 寫了理由）。

為什麼放在 `src/audit-trail/` 底下而不是別處：`boundaries/elements` 用**路徑**分類
（`eslint.config.mjs:62` `el('audit-trail', ['apps/api/src/audit-trail/**'])`）。
放在 `src` 外面它就不屬於任何 zone，規則對它無話可說 —— **fixture 必須真的住在那個範疇裡**。

⚠️ 命名**不可**用 `.spec.ts` / `.test.ts` —— `eslint.config.mjs:142-147` 對這兩種副檔名
**關掉了** `boundaries/dependencies`（測試替身合法地伸手拿內部）。用 `.spec.ts` 命名的 fixture
會安靜地永遠通過，那就是我們正在修的那個病的複刻。

**2. 生產 lint 排除 fixture，負面斷言明確指向它**（`apps/api/package.json`）

```
lint         → eslint src --ignore-pattern "**/__fixtures__/**"
lint:negative→ 對 fixture 跑 eslint，斷言 exit≠0 且輸出含 boundaries/dependencies
```

不用 `eslint --no-ignore` 繞過 config 的 `ignores` —— 那會連 `node_modules` 一起解禁，
且行為依賴 flat config 的實作細節。用 `--ignore-pattern` 讓**生產指令**自己避開，
語義清楚且不動全域設定。

**3. i18n parity 的自我驗證**（`apps/web/src/i18n/i18n.test.ts`）

把目前 inline 的比對抽成測試檔內的 `parityViolations(dicts)`，然後**兩個方向都斷言**：

- 真實字典 → 回傳 `[]`
- 刻意抽掉一個 key 的字典副本 → **回傳那個 key**

⚠️ 函式留在測試檔內，**不新建 `src/i18n/parity.ts`** —— 一個只有測試會 import 的
production 檔就是 AP-1（旁支代碼）。

**4. 安全設定抽成可測單元**（新增 `apps/api/src/bootstrap/security.ts`）

把 `main.ts:42-68` 的三段（`disable('x-powered-by')` / helmet / CORS）搬進
`applySecurity(app)`，`main.ts` 改為呼叫它。**行為不變**，只是從 composition root 的
內聯區塊變成一個具名、可被測試取用的單元。

**5. 標頭逐條斷言**（新增 `apps/api/src/bootstrap/security.spec.ts`）

對照 `16` 的 transport/headers 分項逐條斷言，**清單來自 `16` 不是來自現有實作** ——
反過來寫就只是把現況重述一遍，永遠不會失敗：

| `16` # | 斷言 |
|---|---|
| 2 | `Strict-Transport-Security` 存在且 `max-age ≥ 31536000` |
| 18 | `X-Powered-By` **不存在**（W01 的 #4 就是這條）· `Server` 不存在 |
| 20 | `Content-Security-Policy` 存在且含 `frame-ancestors`（我們用 `'none'`，比 `16` 要求的 `'self'` 嚴格 —— 記在測試註解裡）|
| 21 | `X-Content-Type-Options: nosniff` · `Referrer-Policy` · **`Permissions-Policy`** · `X-Frame-Options` 四者皆存在 |
| — | CORS 回單一具名 origin，**不是 `*`、不反射請求來源** |

**6. 補上缺的 `Permissions-Policy`**（`apps/api/src/bootstrap/security.ts`）

第 5 項的斷言會讓 `16:21` 立刻紅。補 helmet 的 `permittedCrossDomainPolicies` 之外的
`Permissions-Policy`（helmet 不提供，需自訂 middleware 或設定 header），
值對齊 `next.config.ts:31` 已用的 `camera=(), microphone=(), geolocation=()`。

### ⭐ 關鍵設計細節

- **fixture 必須被 build 與 type-check 排除，但不被 format 排除。**
  `tsconfig.build.json` 要加排除（否則進 production dist）；
  prettier 仍應涵蓋它（它是 repo 內的 code，格式漂移沒有理由）。
- **`lint:negative` 必須斷言「輸出含規則名」，不是只斷言 exit≠0。**
  任何語法錯誤也會讓 eslint exit 1 —— 只看 exit code 的斷言，會在 fixture
  因為別的原因壞掉時**繼續通過**，而 boundaries 規則早已失效。
- **標頭測試用 `app.listen(0)` + Node 內建 `fetch`，不裝 supertest。**
  `@nestjs/testing` 已在相依內；Node 22 有全域 fetch。多一個相依要多一份 SCA 面，
  而它買到的只是語法糖。
- **`applySecurity` 的抽取不得順手改行為。** 這是重構，任何標頭值的變動都必須是
  第 6 項那條明確的補齊，而不是搬家時的副作用。
- **`Permissions-Policy` 的 middleware 不 import express 型別**（實作時的 D-6）。
  `@types/express` 未安裝，而本 CH 的 scope 寫明 NO 新依賴 —— 為了一個 `setHeader`
  引入一份還要與 `@nestjs/platform-express` 對齊版本的相依並不划算。改用結構化型別
  `HeaderWritable`，**它只描述實際用到的那一個方法**，讀者也因此知道這段 middleware
  碰了什麼、沒碰什麼。

### 明確不做的

- **掃描輸出斷言**（機制 3）→ 續留 `AD-NegativeGate-1`
- **build + run smoke test**（機制 5）→ 續留 `AD-ImageBuild-1` / `AD-NegativeGate-1`
- **`16:22` 的 `Cache-Control: no-store, private`**（Day-0 D-3，使用者 2026-08-09 拍板不做）——
  `apps/api` 目前完全沒設 `Cache-Control`。不納入本 CH 的理由：**現在沒有敏感端點**，
  `/health` 不是，所以今天嚴格說沒有違反第 22 項；而「什麼算 sensitive」是一個政策決定，
  比補一個 header 大得多。對著不存在的風險寫斷言，等於再造一個沒有標的的 gate。
  → `AD-CacheControl-1`，**M1 建第一個業務端點時必須先答**
- **把 `lint:negative` 抽象成「通用負面 gate 框架」** —— 目前只有 3 個案例、3 種不同的
  執行方式（eslint CLI / vitest / jest）。第二個相同形狀出現前不抽象（AP-5）
- **`apps/web` 的覆蓋率門檻** → `AD-WebCoverage-1`，與本 CH 無關

---

## Verification

### Gate

`format` 0 · `lint` 0 · **`lint:negative` 0** · `type-check` 0 · `build` 0 ·
`run_all` **6/6** · test **30 passed**（api 20 + web 10；baseline 16 → **+14**）·
coverage `All files 100 | 78.57 | 100 | 100`

### 新增測試

- `apps/api/src/bootstrap/security.spec.ts`（9 個）：逐條對照 `16` 的第 2 / 18 / 20 / 21 項；
  **負面性質**在於清單抄自 `16` 而非現有實作 —— 反過來寫只會重述現況、永遠不會失敗
- `apps/web/src/i18n/i18n.test.ts`（+2 個）：parity 檢查**兩個方向**都斷言
  （缺 key / 多 key），因為只斷言「通過」的檢查與「不可能失敗」的檢查無法區分
- `apps/api/src/audit-trail/__fixtures__/cross-scope-import.ts` + `scripts/assert-boundary-gate.mjs`：
  不是測試而是 lint 層的常駐負面案例

### ⭐ 元驗證（本 CH 唯一有效的證明）

三個 gate 各故意弄壞一次，確認負面案例真的會紅：

| Gate | 弄壞的方式 | 結果 |
|---|---|---|
| boundaries | `boundaries/elements: []` | `lint` / `type-check` / `test` **全綠**，只有 `lint:negative` EXIT=1 |
| i18n | 從 `en.json` 刪 `health.refresh` | 4 個測試同時紅並指名該 key |
| 標頭 | 重現 `helmet({xPoweredBy:false})` | `● does not disclose x-powered-by` / `Received: "Express"` |

第一列是重點：**其他每一個 gate 都看不見那個失效。**

⚠️ checklist 原本寫的重現方式（把 `settings` 搬回有 `files` 的區塊）**在 ESLint 10 下無效** ——
規則照樣生效。改用 `elements: []`。原因未查明 → `AD-EslintSettingsClaim-1`，
**不默默改 `eslint.config.mjs:110-114` 那段註解**。

### Drive-through

⚪ **N/A —— 純測試基礎設施，無使用者可見變更**，因此結論一律寫 **gate-only verified**。

⚠️ **唯一的例外是第 6 項**（補 `Permissions-Policy`）：那是真的改了 HTTP 回應。
它的驗證是對真 runtime 跑 `curl -i` 確認標頭出現，**不是只看測試變綠** ——
W01 的 #4（`X-Powered-By`）證明過：測試斷言與真實回應可以不一致。

### ⚠️ 元驗證抓到而一般 gate 沒抓到的

⭐ **`helmet({ xPoweredBy: false })` 會靜默關掉一個預設開啟的保護。** 實測：

```
helmet()                        → X-Powered-By 不存在
helmet({ xPoweredBy: false })   → X-Powered-By: Express
helmet({ noSniff, frameguard }) → X-Powered-By 不存在
```

`xPoweredBy` 不是 helmet 的選項名（它的是 `hidePoweredBy`），而傳一個不存在的選項
**不會報錯**。這是 `AD-NegativeGate-1` 那個形狀的**函式庫層版本**，比自己寫的設定更難察覺 ——
連「這個選項名不存在」都不會被告知。W01 出貨的正是中間那個。

原 `main.ts` 的註解寫「Helmet's option did NOT remove it」，字面為真但**把原因說錯了**，
而錯的那個原因會誘使下一個人再把 `xPoweredBy: false` 加回去。已改寫為三行實測結果。
→ `AD-HelmetSilentOption-1`

**次要**：`__fixtures__` 洩漏進 production build（`dist/audit-trail/__fixtures__`），
且被算進覆蓋率把總計由 100 拉到 95.23。兩者皆已排除。

---

## Impact

- **Breaking change**: no
- **Migration required**: no
- **Config change**: 無新增環境變數。`Permissions-Policy` 的值硬編在 `security.ts`，
  與 `next.config.ts:31` 一致（兩處值必須相同 —— 若日後分歧，那是新的 AD）
- **重啟需求**: ✅ **是** —— `applySecurity` 是 startup-only wiring。
  對既有 dev server 驗證會看到修正前的標頭（W01 Risk Class C 實例）
- **Rollback**: revert PR。`security.ts` 的抽取可單獨 revert 回 `main.ts` 內聯。估 ~20 min

---

## 相關

- **推進的 AD**: `AD-NegativeGate-1`（5 個機制 → 3 個覆蓋，**不關閉**）
- **關掉的**: W01 `checklist.md` 2.3 的 🚧（helmet 標頭斷言測試 + `16` 逐條對照）
- **產生的待辦** → `docs/01-planning/BACKLOG.md`：
  `AD-HelmetSilentOption-1`（🟡 P1）· `AD-EslintSettingsClaim-1`（🟢 P2）· `AD-CacheControl-1`（🟡 P1）
- **既有藍本**: `scripts/lint/tests/test_workflow_placeholders.py` ·
  `ci.yml:97-107`（迴圈自動納入新測試檔）
- **Design note**: 無 —— pattern-reuse 非 spike（`spike-design-note-gate.md` §先判斷）
- **來源 phase**: `docs/01-planning/W01-monorepo-scaffold/retrospective.md` Q5 / Q6
