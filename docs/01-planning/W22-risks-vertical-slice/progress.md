# Phase W22 Progress

**Phase**: W22 — risks 端到端垂直切片（前端接真 API，本機 drive-through）
**Plan**: [plan.md](./plan.md)
**Branch**: `feature/W22-risks-slice`

---

## Day 0 — 2026-08-18 — Plan-vs-Repo Verify

**對照基準**：`main` HEAD **`e17464e`**（PR #85 rebase-merge 後）。
⚠️ 本片的 recon 做在 PR #84 merge 之前，SHA 已兩度被 rebase 改寫；
**錨點重指了，事實仍全部重驗** —— 而重驗的結果證明這個堅持是對的（見 D-307）。

### Baselines（六項逐項實跑）

| Gate | 結果 |
|---|---|
| `npm run test -w apps/api` | **480 passed / 40 suites** ✅ 與 plan 宣稱相符 |
| `npm run test -w apps/web` | **88 passed / 9 files** ✅ 與 plan 宣稱相符 |
| `npm run lint -w apps/api -w apps/web` | clean |
| `npm run type-check -w apps/api -w apps/web` | clean |
| `npm run format:check -w apps/api -w apps/web` | clean |
| `npm run build -w apps/api -w apps/web` | clean —— `/risks` 與 `/risks/[id]` 皆 `ƒ (Dynamic)` |
| `python scripts/lint/run_all.py` | **9/9**（於 `e17464e`） |

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-307** ⭐⭐ | plan §3.4 宣稱「不存在的 id 回 307 導回列表」。實際：`apps/web` **無 middleware**；307 來自 `apps/web/src/app/(app)/layout.tsx:50` 的 `if (!persona) redirect('/login')` —— **未登入**閘門，對 `(app)` 底下每條路由一律觸發，**與 id 無關**。`/nonexistent-page` 正確回 404 是因為它在 group 外。已登入 + 不存在的 id 的真實行為是 `[id]/page.tsx:218-228` 一張**行內 not-found 卡**（200，i18n key `riskDetail.notFound.*` 中英皆備，W19 交付） | **AC-6 與 AC-8 打在一個不存在的缺陷上**。`AD-FrontendMissingIdRedirects-1` 的 BACKLOG:251 敘述錯了兩處：不是導回列表（是 `/login`），也不是因為 id 不存在（是未登入）⇒ 該 AD **更正敘述，不關閉**。AC-6 改寫為「兩種 404 不可分辨」→ plan R8 | 🔴 改 plan |
| **D-detail-hybrid** ⭐⭐ | plan §4 把詳情頁當成「換一個資料源」。實際它吃**五個** fixture 來源：`risks`(8 處) · `controls`(10) · `issues`(8) · `entityPosture`(2) · `@/data/extended/riskDetail` 的 **13 個具名匯出**（稽核軌跡／簽核／階段／決策／複審日／工作底稿） | 只換 `risks` ⇒ 表頭真、其餘假。⛔ 而 `DemoBadge` 的 docstring 明寫它存在的理由是「sample data presented as real」—— 接上後它會**反過來**宣稱整頁是樣本而表頭是真的，**同一條誠實規則的反向違反**。⇒ 新增 DemoBadge「部分真實」變體（plan §4 第 10 列）→ plan R7 | 🔴 改 plan |
| **D-migration-lag** | `isms_dev` 25 個 migration 中 `20260817033944_event_and_posture_snapshot` **未套用** | `AD-DevDbChecksumDrift-1` **第 6 次**。Day 1 開工前 `prisma migrate deploy`。⚠️ 第 6 次已遠超強度階梯「≥3 次改結構性解法」的門檻 —— 結構性解法另記 backlog → plan R9 | 🟡 小調整 |
| **D-verify-cmd** | checklist Prong 3 的 Verify 寫 `npm run prisma:migrate`，而該 script = **`prisma migrate dev`** —— 它**套用**遷移且偵測 drift 時要求 reset dev DB；本項 DoD 只要 status | **一個 Verify 指令比它要驗的東西危險**，是 checklist 自己的缺陷。Day 0 改跑唯讀 `npx prisma migrate status`，checklist 已更正 → plan R10 | 🟡 小調整 |
| **D-baselines** | 見上表六項 | 基線已記錄，全部與 plan 宣稱相符 | ✅ |

### 確認無誤（沒有漂移的部分 —— 同樣是 Day-0 的產出）

| 宣稱 | 實測 |
|---|---|
| `apps/web/src/lib/api/` 不存在 · `apps/api/prisma/seed.ts` 不存在 | ✅ 兩者皆不存在；`prisma/` 只有 `migrations/` + `schema.prisma` |
| 八個 EDIT 目標存在 | ✅ 九個路徑（含三個 UNTOUCHED）全部存在 |
| `CH-042` 未被佔用 | ✅ `changes/` 最大號 `CH-041`；`bugs/` 目錄空；全 repo 只有 W22 pre-doc 自己提到 CH-042 |
| `risk.controller.ts` 只有 `@Get()` | ✅ `:77 @Controller('risks')` · `:91 @Get()` · `:97 @Post()`，無 `@Get(':id')` |
| `policy.controller.ts:89-102` 是 list-then-find | ✅ 逐行相符：`:89 @Get(':id')` · `:90 async byId` · `:98 NotFoundException`，且註解已寫明「回 403 等於得先知道那列存在」 |
| 全 repo 零 seed 檔 | ✅ `find` 零命中，`package.json` 無 `prisma:seed` |
| `Threat` / `Vulnerability` 零 controller | ✅ **比預期更強**：`modules/` 13 個目錄**連 threat / vulnerability 目錄都沒有** ⇒ §9「寫入路徑不是取捨是前提不存在」成立 |
| `data/risks.ts` UNTOUCHED（其餘畫面仍用） | ✅ 實測 **6 個**畫面 import 它（dashboard · controls/[id] · issues/[id] · risks/new · risks · risks/[id]） |

### Prong 覆蓋

- **Prong 1（path）**：9 個路徑 + 1 個編號可用性 → **0 個漂移**
- **Prong 2（content）**：6 個宣稱 → **2 個漂移**（`D-307` 全錯 · `D-fixture-import` 半中，帶出 `D-detail-hybrid`）
- **Prong 2.5（child tree）**：4 個元件掃描 → 兩頁的直接子元件（`DemoBadge` · `icons` · `shell-state`）零 risk fixture；`shell-state.ts:37` 只是 **type** import。⚠️ 但 shell 層 `AppShell.tsx:103` 吃 `@/data/opcos` —— **那就是 D1「切換 persona 不改變 API 回傳」會在畫面上長出來的地方**，checklist 2.2 的具名 `[ ]` 有了確切標的
- **Prong 3（schema）**：N/A（零 schema 變更），但 migration head 查了 → **1 個漂移**

### 決策拍板（使用者 2026-08-18）

| # | 決定 | 依據 |
|---|------|------|
| **D3**（Day-0 新增）| 詳情頁**表頭接真 API，其餘四個 fixture 來源留著**，DemoBadge 加「部分真實」變體 | 另兩個選項各有硬傷：只做列表頁 ⇒ `GET /risks/:id` 沒有消費者 = **AP-1 side-track**；整頁接真 ⇒ 需先建 `riskDetail` 13 個匯出背後的資料表，等於把 W22 變成三四個模組的工程 |
| **D4**（Day-0 新增）| AC-6 改寫為**「兩種 404 不可分辨」**；`AD-FrontendMissingIdRedirects-1` **更正敘述而非關閉** | 約束 8 要求的是不可分辨，那是 UI 層性質，與 HTTP status 無關。真 404 status 另記 backlog —— 兩頁都是 `'use client'`，那不是原本以為的一行替換 |

### Go / No-Go

**範圍變動**: **~20-25%**（8 條 AC 中 2 條改寫；9 個 file change 中 1 個性質改變 + 1 個新增）
→ 落在 **20-50% 帶** ⇒ 依 `task-workflow.md` 修訂 plan §3.4 / §4 / §5 / §7 / §8 並回報使用者
→ **使用者裁決後 GO**，繼續 Day 1。

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 0（建分支 15:24:45 → 完成 plan/checklist/progress 修訂）| **≈ 20 min** |
| 對照 plan §7 的 Day-0 估算 | 0.5 hr（30 min）⇒ ratio **≈ 0.67** |

> baseline 的六個 gate 以背景平行跑，與 grep 驗證重疊 —— 序列執行會更長。
