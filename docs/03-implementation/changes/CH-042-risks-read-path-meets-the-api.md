# CH-042: `risks` 的讀取路徑第一次接上真 API —— 而畫面正在為真實資料簽名

**Date**: 2026-08-19
**Phase**: W22
**Scope**: `modules`（`GET /risks/:id`）· `core-model`（dev seed）· `ui`（兩頁 + fetch 層）
**Components**: —
**PR**: **MERGED** (PR #86, `33efd4f`) —— 2026-08-19T02:28:36Z，經 `gh pr view` 驗證

---

## Problem

**這個專案有兩個各自完整、而從未見過面的一半。**

W19 交付 30 個畫面、全部餵 fixture。W05–W18 交付 34 張表與對應端點、全部 gate-only verified。
`apps/web` 對 API 的**唯一**呼叫是 W01 的骨架驗證頁（`apps/web/src/app/page.tsx:45`，打 `/health`）。

量化的後果，Day 2 一接上就全部冒出來：

- 列表頁 12 個欄位中 **5 個** API 完全沒有來源（entity code · controls · status · owner · role）
- UI 的實體詞彙是 13 個 OpCo 碼（`RSG` `RHK` …），DB 是 5 個節點（`SG1` `HK1` …）—— **零交集**
- 詳情頁的 `status` 有四個值（Open / Treatment / Monitored / Accepted），API 的 enum 是 `identified`
  —— **不同詞彙，不是改名**

而最重的一項在 Day 3 才浮出來：接上真資料之後，那一頁對一筆**真實**風險渲染了
**6 筆帶 SHA-256 hash 的稽核軌跡、兩個具名簽核人、`append-only` / `Tamper-evident` /
`Record locked` 的整合性宣稱**。全部是 W19 的 fixture 字串。
整頁都是樣本時它們無害；**表頭變成真實資料的那一刻，它們變成偽造的治理證物**（guardrail 2 / 5）。

---

## Root Cause

**不是「還沒做」。根因是每一層的 gate 都把自己那一半當成全世界。**

| 層 | 它的測試注入什麼 | 因此看不見什麼 | 錨點 |
|---|---|---|---|
| api 單元 | 假 repository | 實體範疇（**21 條全部在範疇失效時維持綠**）| `risk.controller.spec.ts` |
| api 整合 | 真 DB + 真 RLS | 前端怎麼解讀回應 | `risk.int.spec.ts` |
| web | fixture 常數 | API 到底送不送得出這個欄位 | `apps/web/src/data/risks.ts` |

⇒ **「兩層各自正確，而它們對彼此的假設不同」這一類缺陷，結構上沒有任何守衛。**
Day 2 把兩頁從 fixture 整個換成 API，期間跑了三次 web 測試，**每次都是 88 passed** ——
沒有一條既有測試碰到我改的東西。

偽造證物那一項還多一層根因：**`DemoBadge` 的存在理由是防止「樣本被當成真的」，
而混血畫面把它反過來用了** —— 它宣稱整頁是樣本，而表頭已經是真的。
同一條誠實規則的**反向**違反，而它沒有名字，所以沒有人在找它。

---

## Solution

| 檔案 | 類型 | 說明 |
|------|------|------|
| `apps/api/src/modules/risk/risk.controller.ts:89-122` | 修改 | `@Get(':id')` —— **逐字複製** `policy.controller.ts:89-102` 的 list-then-find，含註解理由 |
| `apps/api/prisma/seed.ts` | 新增 | 冪等 dev seed，固定 `9xxxxx` ref code 保留段，跨 SG1 / HK1 |
| `apps/api/package.json` | 修改 | `prisma:seed`（Node 22 原生 strip-types，**零新依賴**）|
| `apps/web/src/lib/api/risks.ts` | 新增 | `listRisks` / `getRisk` / `RiskRow` / `ApiUnavailableError` |
| `apps/web/src/components/NoSource.tsx` | 新增 | 無來源欄位的統一渲染（兩頁共用，避免 AP-2）|
| `apps/web/src/components/DemoBadge.tsx` | 修改 | `partial` 變體 |
| `apps/web/src/lib/ago.ts` | 新增 | 用 `Intl.RelativeTimeFormat` 把真時戳格式化成設計要的相對寫法 |
| `risks/page.tsx` · `risks/[id]/page.tsx` | 修改 | 資料源；loading / error / not-found / unassessed 四狀態 |
| i18n × 6 檔 | 修改 | 16 個 key，`en` / `zh-Hant` 等價 |

**三個拿掉就會壞的細節**：

1. **`byId` 走 `list()` 再 `.find()` 是範疇安全的來源，不是偷懶。** scoped client 從來沒回傳那一列，
   所以「不存在」與「不在你的範疇內」在這裡**結構上**不可分辨。另寫 `findUnique` 會需要先查到
   那一列才能決定要不要拒絕 —— 那正是約束 8 禁止的形狀。代價（O(n)）記為 `AD-RiskByIdLinearScan-1`，
   **解封條件是可觀察的**，不是「以後記得優化」。
2. **seed 以 owner 身分連線（`DATABASE_URL_MIGRATE`）。** 跨實體寫入正是 RLS 該拒絕的，
   走 scoped client 的 seed **結構上只能種單邊** —— 而單邊 fixture 會讓「範疇過濾有效」與
   「範疇過濾不存在」在畫面上完全相同。它因此也拒絕在 `NODE_ENV=production` 下執行。
3. **殘餘分數用 `score_after`，兩頁都拿掉 `scoreAfter ?? scoreBefore` 的回退。**
   那個回退把 inherent 的 20 放進標題寫著 Residual 的欄位。副作用可見：
   頂端計數從 `2 CRITICAL` 變成 **`0 CRITICAL`** —— 那兩筆從未複評。

**偽造證物的處置**：`signOff` / `trail` / `cycles` 清空，`Treatment` / `Next review` /
`Ratified by` 與所有整合性宣稱不再渲染，**而區塊標題保留** ——
「平台有簽核鏈」是真的，「這筆風險有這些簽名」不是。

---

## Verification

**Gate**: type-check clean · `run_all` **9/9** · api test **484 passed / 40 suites**（baseline 480 → **+4**）·
api int **269 passed / 21 suites**（265 → **+4**）· web test **95 passed / 10 files**（88 → **+7**）·
lint / format clean · build `✓ Compiled successfully`

**CI（PR #86，6/6 綠）**: gates 2m45s · 映像 build + 啟動探測 1m37s · SCA 15s · SAST 42s ·
gitleaks 17s · trivy 24s

> ⚠️ **gate 射程聲明**：gitleaks 與 semgrep **本機未安裝**，只在 CI 存在。
> 且 `apps/api/prisma/seed.ts` 不被 type-check / lint / format 任何一個讀到
> （`AD-SeedFileUngated-1`），本次以獨立 `tsc --noEmit` + `prettier --write` 手動補驗。
>
> ⛔ **「掃描器綠了」不等於「它讀過那個檔」，所以覆蓋是列出來的不是推論的**：
> gitleaks `264 commits / 16.87 MB / no leaks found`（`--source .` 無 path filter，`fetch-depth: 0`）；
> semgrep 的 `324 files` 是聚合數，改用排除集合的完整列舉 ——
> **ts `232−1=231` · python `15−3=12` · 總計 `331−7=324`**，三者皆與 CI log 相符，
> 7 個被跳過的逐檔列名且全在 `test/` ⇒ `seed.ts` 在 semgrep 掃的 231 個 ts 檔內。
> ⚠️ 副產物：**SAST 完全不看測試目錄** → `AD-SemgrepSkipsTestDirs-1`。

**新增測試**:

- `risk.int.spec.ts` 19–22 —— 四個範疇測試。**中性化 5/5 與預測相符**（預測寫在執行之前）：
  拿掉範疇收窄後 20 / 21 轉紅，19 / 22 / 21 條單元測試維持綠。
  ⭐ 最後一格是壞消息：**單元測試在範疇完全失效時全數維持綠**。
- `risks.test.tsx` —— 7 條，全部針對「會長得像正常畫面的失敗」。
  **負面測試**：斷言 fixture 第一列的標題（`Unpatched externally-facing systems`）**不在 DOM 裡**
  —— 若有人補回 `catch { return risks }`，畫面會完美，而只有這條會紅。

**Drive-through**（真 Chrome + 真 NestJS + 真 PostgreSQL，Playwright MCP 驅動）:

| 觀察 | 結果 |
|---|---|
| 列數 == `GET /risks` 的 9（**不是** fixture 的 10）| ✅ AC-4 |
| 不存在的 id vs 跨實體的 id | 遮蔽 id 後 **digest `f82fe766` / 1679 字元，逐位元相同** ✅ AC-6 |
| **真的 `Stop-Process` 掉 API** 後重載 | `data-source-state="error"`、0 列、**5 個 fixture 標題零洩漏** ✅ AC-5 |
| 逐控件 | Category 篩選 9 → 2 列；空選項的篩選器不渲染；scope 選擇器改為 `server-set scope` |

⛔ **抓到 8 個缺陷，全部在 lint / type-check / 484+95 測試 / build / `run_all` 9/9 全綠時存在。**
截圖 6 張於 `docs/01-planning/W22-risks-vertical-slice/artifacts/`，含**修正前**的偽造證物那張。

**Verdict**: ✅ **PASS**

---

## Impact

- **Breaking change**: no —— `data/risks.ts` 一行未動，其餘 5 個畫面照舊
- **Migration**: no（零 schema 變更）
- **Config**: 無新增變數。`prisma:seed` 讀既有的 `DATABASE_URL_MIGRATE`
- **重啟需求**: ⚠️ **是** —— 新路由在 Nest 啟動時註冊；驗證前必須乾淨重啟並擷取
  `[RouterExplorer] Mapped {/risks/:id, GET} route`
- **Rollback**: `git revert` 四個 commit（~5 min）。seed 的資料留在 dev DB，
  以 `9xxxxx` ref code 可辨識

---

## 相關

- **更正的待辦**: `AD-FrontendMissingIdRedirects-1` —— ⛔ **不是關閉**：它描述的缺陷不存在
  （307 來自未登入閘門），約束 8 的真實性質改由 AC-6 承接
- **同類前例**: `CH-038`（W19 mockup port）—— 本記錄修的是那一片留下的 fixture 文案，
  在它遇到真實資料之後。⇒ **結構性解法**：其餘 28 個畫面接 API 時，
  「fixture 文案是否構成對真實資料的陳述」必須是一個具名檢查項，見 `AD-FixtureProseBecomesForgedEvidence-1`
- **產生的待辦** → `docs/01-planning/BACKLOG.md`
