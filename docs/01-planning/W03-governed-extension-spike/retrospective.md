# Phase W03 — Retrospective

**Phase**: W03 — Governed extension storage, proven against RLS
**Period**: 2026-08-10 ~ 2026-08-10（Day 0–4，單日）
**Plan**: [plan.md](./plan.md)
**PR**: PR-pending
**Change record**: `docs/03-implementation/changes/CH-018-w03-governed-extensions.md`
**Design note**: `docs/02-architecture/design-notes/W03-governed-extensions.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | OQ-6 拍板 → **ADR-0005**（JSONB + catalog，應用層 + trigger 雙層，4 條可證偽條件）| ✅ 完成 |
| US-2 | `core-model` 的第一個範疇化 client 消費者（`PolicyRepository`）+ 結構型別 | ✅ 完成 |
| US-3 | 第一個業務端點 `GET/POST /policies` + 全域 `Cache-Control` 政策 | ✅ 完成 |
| US-4 | 約束 8 四項範疇測試 + 並行汙染常駐測試 | ✅ 完成 |
| US-5 | closeout（本檔 + CH-018 + design note + calibration + 導航檔）| ✅ 完成 |

**額外交付（不在 plan §4）**：

- `core-model/scope-refusal.ts` + spec · repository/controller/int spec 的對應修改 ——
  **Day 3 的 API 級驗證找出的、US-3 交付物自身的缺陷**（跨實體寫入回 500）。
  屬於把 US-3 做完，不是新範圍。deviation 已記於 progress.md「Day 3（續）」。
- `test/int-global-setup.js` 的 catalog seed —— 全域欄位無法經 scoped client 建立，
  這是設計不是缺陷，但它使 seed 必須走 owner 連線。

**未完成項目**：

- checklist **2.1 DI token** 🚧 —— **刻意不做**。今天建它是零消費者的 DI token（AP-5 + AP-3），
  而 `AD-ScopedClientDI-1` 自己就寫著「⛔ 現在建 = 零消費者的 DI token」。
  **解封條件：M4 有真的憑證來源**。未刪未勾項。

---

## Q2 — Calibration（工時校準）⭐ 本 phase 最重要的一條

- **Scope class**: `spike`（第 2 個資料點）
- **Agent-delegated**: `no`（plan 宣告值）
- **Bottom-up est**: 19 hr
- **Committed (calibrated)**: 12.5 hr（mult 0.65）
- **Actual**: **~4.3 hr** —— 牆鐘跨度，branch base `5bbc252` 11:40 → closeout ~16:00
- **Ratio**: 4.3 / 12.5 = **0.34**
- **Band 判定**: **UNDER**（< 0.7）

### 發生了什麼：兩個資料點量的不是同一個東西 ⭐

plan §7 承諾「本 phase 逐日計時，補上 W02 缺的乾淨資料點」（`AD-TimeTracking-2`）。
**做不到，而且原因不是忘記** —— Day 0 progress 已記：工作由 AI session 執行，
逐項工時**只能回推、不能量測**。

與其第三次記「這次也沒計時」，本次改為正面處理。把三個 phase 的**牆鐘跨度**
（`git log` 機械導出）與**登記的 actual** 並排：

| Phase | Class | 牆鐘跨度（commit 首→尾）| 登記的 actual | 一致？ |
|---|---|---|---|---|
| W01 | `greenfield-scaffold` | 08-08 16:30 → 20:57 = **4h27m** | ~5.0 hr | ✅ 同一個量（W01 本來就是回推的）|
| W02 | `spike` | 08-09 16:03 → 08-10 00:13 = **8h10m** | **~12.1 hr** | ❌ **actual > 牆鐘窗口** |
| W03 | `spike` | 08-10 11:40 → ~16:00 = **~4h20m** | ~4.3 hr | ✅ |

**W02 那一列是算術上不可能的。** 逐項加總 12.1 hr 大於工作實際發生的 8h10m 窗口 ——
循序執行的工作不可能如此。所以那 12.1 **不是量測，是「這件事若由人手做要多久」的估計**。

→ **`actual` 這一欄一直在混裝兩種量**：W01/W03 是牆鐘，W02 是人力工時估計。
乘數的輸入從來沒有一致過，所以它**不可能收斂** —— 這解釋了為什麼三個 phase 下來
仍然「等更多資料點」。

用一致的牆鐘定義重算：**W01 0.35 · W02 0.75 · W03 0.34**。三個裡兩個 UNDER band，
且那兩個非常接近（0.34 / 0.35）。這比原本 0.35 / 1.10 的雜訊圖像清楚得多。

### 這不是要求調乘數

**行動：不 re-point。** 理由有二：

1. 用新定義重算的 W02（0.75）是**我事後換算的**，不是當時量的。拿換算值當資料點，
   等於用一個推導填掉一個缺口 —— 那正是本節在批評的事。
2. 真正該先解決的是**定義**，不是數值。定義沒定就調乘數，只會讓下一輪繼續振盪。

**行動**: **等更多資料點，但先定義 `actual`** → `AD-CalibrationMetric-1`（P1）。
提議的定義：**branch base commit → closeout commit 的牆鐘跨度**，因為它
(a) 由 `git log` 機械導出、(b) 含間隙成本、(c) **不依賴 AI 有一個鐘**。
代價要明說：牆鐘含閒置（W02 的 8h10m 中有 20:35→23:52 的 CI 修復間隔），
會系統性高估專注工時 —— 但一個**一致的高估**可以被乘數吸收，混裝的兩種量不行。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] |R − 1.0| = 66% > 30% → `AD-CalibrationMetric-1` 已記入 `BACKLOG.md`

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**9**（Prong 1: 0 未如預期 / Prong 2: 6 / Prong 3: 3）
- Day-0 成本：~40 min（含五案例 probe）
- **預防的返工**：~4 hr
- **ROI**: ~6×

**最有價值的那個 drift**：**`D-jsonb-rls`**。

它直接回答了 `06:35` 留白的 "validation approach" —— 而那正是 ADR-0005 的承重問題。
若沒有它，ADR 只能寫「RLS 保護擴充欄位」這種**聽起來對、實際錯**的句子，
而錯的方向是安靜的：寫得進去、讀得出來、測試全綠。

但更值得記的是**它的推論部分錯了**：Day 0 由「`WITH CHECK` 看不到 JSONB」推論出
「catalog 驗證是唯一一道防線」，Day 1 發現 **trigger 看得到 JSONB** —— 同一個資料庫層，
不同的機制。**量測是對的，從量測跨出去的那一步是錯的。**
原文保留於 progress.md 並標註，維持審計軌跡。

> 這是 `AD-Day0Scope-1`（W02）的近親但不同：那條講「量測範圍太窄」，
> 這條講「量測正確但推論超出了它支持的範圍」。

---

## Q4 — 做得好的（保持）

- **元驗證做了兩個方向，而不是一個。** 只弄壞 trigger 只能證明「trigger 有用」；
  也弄壞 validator 才量到「**validator 死掉時資料庫仍在擋**」。
  第二個方向才是 ADR-0005「兩層形狀」的證據 —— 而它只多花了一次 int 測試的時間。
- **修之前先量。** 跨實體寫入回 500 的直覺修法（42501 → 404）會親手造出 404 vs 500 的
  oracle，**如果**不存在的實體 id 走的是 FK violation。實測 `42501 × 4 / 23503 × 0`
  之後才動手，並把那個排序釘成常駐測試。**一個修正引入漏洞的典型形狀，被一次量測擋掉。**
- **判準寫成文字，而不是只加一個 header。** `AD-CacheControl-1` 的產出不是
  `Cache-Control: no-store, private` 這一行，是 `security.ts:53-78` 那段說明
  「為什麼沒有例外清單」的文字 —— 例外清單過時的方向是洩漏。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 三個端點從 `main.ts` → `AppModule` → `PolicyModule` 可追蹤；Day 3 startup log 實際觀測到路由 mapped |
| AP-2 Cross-directory scattering | 0 | `core-model` / `modules` 分工由 boundaries lint 機械強制 |
| AP-3 Potemkin | **0，且是量出來的** | 元驗證兩次「弄壞 → 紅 → 還原 → 綠」；Day 3 API 級驗證 11 案例。⚠️ **無 UI 故 drive-through N/A**，收尾一律標 API-level verified |
| AP-4 PoC accumulation | N/A | 無 `experimental/` |
| AP-5 Speculative abstraction | **0（主動避免 1 次）** | checklist 2.1 的 DI token **刻意不建** —— 零消費者的 token 正是本條 |
| AP-6 Mock vs real divergence | 0 | 兩層讀同一份 catalog rows，不硬編欄位清單；dev-principal 三個入口皆擋 + boot 警告 + 回應標記 |
| AP-7 命名 / orphan claim | 0 | 無版本後綴。⚠️ `scope-boundaries.md:120-128` 曾是 orphan claim（自稱未驗證的設計意圖），**本次 closeout 已用量到的形狀取代** |
| **總計** | **0** | |

**Lint**: `run_all.py` **6/6** ✅ · `lint:negative` PASS（17 檔 0 bypass）

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-CalibrationMetric-1` | **`actual` 欄混裝兩種量** —— W02 登記 12.1 hr 大於其牆鐘窗口 8h10m，算術上不可能是量測 | 定義 `actual` = branch base → closeout 的牆鐘跨度（`git log` 機械導出）；重算 W01/W02 並標註哪些是換算值 | 候選 |
| `AD-DevDbDrift-1` | **`isms_dev` 落後兩天而沒有任何東西察覺** —— int 測試每次重建 `isms_test`，所以「int 全綠」不涵蓋「開發者的資料庫可用」 | 啟動時比對 `_prisma_migrations` 的 head 與 `prisma/migrations/` 最新目錄，落後即 **warn**（不是 fail —— 那會擋住正在寫 migration 的人）| 候選 |
| `AD-ExtensionQueryCost-1` | ADR-0005 可證偽條件 #1（trigger 每寫入 > 5ms）**未量** | 資料量成長後量；今天 2 列量不出東西 | 候選 |
| `AD-GrepAssertion-1`（既有）| ⭐ **本 phase 又犯 3 次**，其中一次把 type-check 失敗讀成通過 | 見 Q7 —— 已達強度階梯第 4 級 | **升級** |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- checklist 2.1 DI token 🚧 → **M4**（憑證來源存在後）
- design note §4 的 5 條 Open Invariant → 各自的解封條件已寫明，未混進 §2 偽裝成已驗證
- ⭐ **`AD-GrepAssertion-1` 的強度升級** —— 本 phase 3 次（總計 ≥ 10 次），
  且**發生在同一個 session 內**。依 `.claude/rules/README.md` 的強度階梯，
  「同一個 session 內被違反」是第 4 級的判準（`UserPromptSubmit` hook 每回合注入），
  因為那是「中途忘了」而不是「不知道」——**在規則檔裡再寫一次沒有用**。
  ⚠️ 但 hook 每回合都要付 context 成本，且 CH-017 才剛裝了一個。
  **不當場實作** —— 記入 BACKLOG 由使用者排序（節流閘 Step 0.0）。

**這個 phase 關掉的**：

- `AD-CacheControl-1` ✅ CLOSED —— 判準寫成文字，全域無例外清單
- `AD-ScopedClientDI-1` ✅ CLOSED —— 三段拆法只有後兩段成立，token 刻意不建（理由已記）
- `AD-ScopeConcurrency-1` ✅ CLOSED —— 40 次交錯的常駐整合測試取代 W02 的 scratchpad
- `decision-form.md` **OQ-6** ✅ CLOSED → ADR-0005（開放項 4 → 3）

---

## Q8 — Addendum：本 retro 寫完之後，CI 推翻了其中兩句 ⭐

本檔第一版於 PR #31 開出之前寫成。CI 隨後紅了兩個 check，而它們各推翻了上面的一句話。
**原文保留不改**，修正記在這裡 —— 差距本身就是紀錄。

| 上面寫了什麼 | CI 量到什麼 |
|---|---|
| Q4「做得好的」列了測試污染的修法 | **只成立一半** —— 軟刪除擋不住沒有 `retiredAt` 過濾的查詢，而 jest 的檔案順序本機與 CI 不同（暖快取依時間 / 冷快取依大小）。**同一個 commit，本機綠、CI 紅** |
| Q5 AP-3「0，且是量出來的」 | 仍然成立，但**涵蓋範圍比我寫的窄** —— 78 unit + 32 int 全跑在 `NODE_ENV=test`，Day 3 clean restart 跑在 `development`。**沒有任何一項碰過 production 路徑**，而那是部署唯一會走的那條 |

### 第二列是本 phase 真正的教訓

`映像 build + 啟動探測` 揭露：**API 在 `NODE_ENV=production` 下拒絕啟動**
（`Dockerfile:94` → `PolicyModule.onModuleInit()` → `DevPrincipalInProductionError`）。

守衛是對的 —— 今天唯一的範疇來源是寫死的 SG1，讓它在 production 起來就是部署一個
資料隔離事故。但這意味著**一個 required check 會永遠紅到 M4**，那比沒有 check 更糟。

使用者拍板：**改 gate，正反兩面都驗** —— development 下必須起得來（保住 CH-013 的證明），
production 下必須拒絕且理由正確。這是 `AD-NegativeGate-1` 的**第 6 個負面 gate**，
而且幾乎免費：行為本來就在，只是從沒有人在部署組態下執行過產物。

### 對 Q3「Day-0 投報率」的補充

Day-0 三-prong 驗的是 **plan 對 repo 的斷言**。這兩個缺陷都不在那個射程內：
一個需要**跨 suite 的執行順序**才會出現，一個需要**部署時的環境變數**才會出現。
→ 兩者都只有 CI 抓得到，這正是 required check 存在的理由。

**新增 AD**：`AD-JestFileOrder-1`（見 BACKLOG）

---

## Design Note 8-Point Self-Check

| # | Point | 狀態 | 備註 |
|---|-------|------|------|
| 1 | Section header 對應 US | ✅ | §2.1–2.8 每節標 US 編號 |
| 2 | 每個 claim 有 `file:line` | ✅ | 26/27 已錨定 |
| 3 | Decision matrix | ✅ | §1 四欄比較 + **否決理由具體** + **選定方案的代價明說** |
| 4 | Verification command | ✅ | 每個 invariant 一條可重現指令 |
| 5 | Test fixture ref | 🟡 | §2.1 的 probe **未進版控**（一次性量測）—— 其常駐替身是 §2.2，已標明 |
| 6 | Open invariant 分界 | ✅ | §4 列 5 項，各有解封條件 |
| 7 | Rollback 路徑 | ✅ | §5 含**不對稱性**警告（資料回不去）+ ADR 的 4 條可證偽條件 |
| 8 | Cross-ref single-source | ✅ | §3 兩個契約 + 說明為何**不**住在契約層；`scope-boundaries.md` 已同步 |

**Verified ratio**: 26/27 ≈ **96%** ✅

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（沒有加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（不是打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔 + progress.md
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（不在 CLAUDE.md 表格格）
- [x] Calibration ratio 回填 matrix（不在 CLAUDE.md / MEMORY.md 散文裡）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] `plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）
- [x] `python scripts/lint/run_all.py` 全綠（含 rules hygiene + status markers）
