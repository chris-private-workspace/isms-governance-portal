# Phase W22 — Retrospective

**Phase**: W22 — risks 端到端垂直切片（前端接真 API，本機 drive-through）
**Period**: 2026-08-18 ~ 2026-08-19
**Plan**: [plan.md](./plan.md)
**PR**: PR-pending
**Change record**: `docs/03-implementation/changes/CH-042-risks-read-path-meets-the-api.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `/risks` 列表資料來自 API | ✅ 完成 —— 真瀏覽器 **9 列**（fixture 是 10 筆）|
| US-2 | `/risks/:id` 詳情資料來自 API（含新端點）| ✅ 完成 |
| US-3 | 冪等的 dev seed，跨兩個 entity | ✅ 完成 —— 連跑兩次 **12 → 12**；SG1 9 / HK1 3 |
| US-4 | 不存在的 id 回 404 | ✅ 完成（**改寫後**）—— API 層兩種拒絕不可分辨；⛔ 前端層是 200 + 同一張卡 |
| US-5 | drive-through PASS + 截圖 | ✅ 完成 —— 6 張，**抓到 8 個缺陷** |
| US-6 | `CH-042` + retrospective + calibration | ✅ 完成 |

**未完成項目**：無。八條 AC 全部成立。

**兩個 🚧 的現況**：

- ✅ **gitleaks / semgrep 對新檔**（plan R3）—— **已於 PR #86 的 CI 解封**。
  ⛔ 解封條件不是「job 綠」而是「讀出來的覆蓋」：gitleaks `264 commits / 16.87 MB / no leaks found`
  （無 path filter，`fetch-depth: 0`）；semgrep 的 `324 files` 是聚合數**不回答 seed.ts 在不在裡面**，
  改成把排除集合列完 —— **ts 232−1=231 · python 15−3=12 · 總計 331−7=324**，
  三個算術與 CI log 獨立收斂，7 個被跳過的逐檔列名且全在 `test/`。
  ⚠️ guardrail 7 的實質仍是由人工逐行讀來的（零人名 / 零 email / 零卡號形狀數字，owner 欄全 NULL）——
  **掃描器抓密鑰，不抓「編造的人名」**，這兩件事不可互相代替
- 🚧 **`prisma/seed.ts` 不被任何本機 gate 讀**（`AD-SeedFileUngated-1`）——
  本次以獨立 `tsc --noEmit` + `prettier --write` 手動補驗。
  ⭐ **射程已精確化**：該檔的處境是「**零正確性 gate + 有安全掃描**」，不是「完全沒有 gate」

⛔ **US-4 的字面目標被 Day-0 證偽而非達成**：原文要求「不存在的 id 回 404 頁面」。
`apps/web` 沒有 middleware，那個 307 是未登入閘門。真 404 status 記為 `AD-Real404Status-1`。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `greenfield-feature`（**第 1 個資料點** —— 該列此前是 `n/a (0 pt)`，
  因為 W20 在 Day 1 中止）
- **Agent-delegated**: `no`（plan 時宣告）—— 實際 0% 委派，與宣告相符
- **Bottom-up est**: 12.5 hr
- **Committed (calibrated)**: 6.9 hr（mult 0.55）
- **Actual**: **3.18 hr**（Day 0 ≈20 min · Day 1 ≈35 min · Day 2 ≈36 min ·
  Day 3 ≈75 min · Day 4 ≈25 min）
- **Ratio**: 3.18 / 6.9 = **0.46**
- **Band 判定**: **UNDER**（< 0.7）

**發生了什麼**：

⭐ **這是本專案第一個四段全部在當日收尾當下量到的分子。** 前三次
（`AD-CalibrationNoTimeRecord-1`）都是事後由 commit author date 反推，而反推得到的是下限。
差別不在「這次比較用心」，在於**提醒的位置**：W22 把它從 plan §7 的散文（第 2 級，已被實測否證兩次）
移到 **checklist 每個 Day 收尾一個具名的 `[ ]`**。會被勾的東西才會被做。

⚠️ **但真正該注意的不是 ratio，是 `actual / bottom-up` = 0.26** ——
遠低於 `CALIBRATION-MATRIX.md` 明訂的 0.4 下限，而那份文件對這個情況的判決很明確：
**「低於 0.4 代表你的 bottom-up 估算方式有系統性問題，該修的是估算不是乘數」**。
W07 出現過同樣的訊號（0.17）。⇒ **乘數不動**，要修的是拆解方式。

具體的高估點看得出來：bottom-up 給 seed **2 hr**、fetch 層與兩頁 **3 hr**，
而 Day 1 全部（端點 + 4 個單元測試 + 4 個整合測試 + 中性化 + seed）合計 35 min，
Day 2 全部 36 min。**有藍本的東西被當成沒有藍本估。**
唯一估得準的是 drive-through：估 2 hr、實際 75 min —— 因為它**沒有藍本可抄，只能真的做**。

**行動**: **KEEP 0.55** —— 單點不 re-point（3-phase 移動窗口）。
第 2 個資料點若同樣 < 0.7，**改的是 bottom-up 拆解方式，不是乘數**。

- [x] 已回填 `CALIBRATION-MATRIX.md`（1 行）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] |R − 1.0| > 30% → AD 已記入 BACKLOG（`AD-CalibrationNoTimeRecord-1` 更新為「第 3 級首次奏效」）

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量**：**4**（Prong 1: 0 / Prong 2: 2 / Prong 2.5: 0 / Prong 3: 1 / 另 1 條是 checklist 自身缺陷）
- **Day-0 成本**：**≈ 20 min**
- **預防的返工**：**~3-4 hr**
- **ROI**: **~10×**

**最有價值的那個 drift**：**`D-307`** —— 而它的價值不在省下的時間，在**它證偽的是本片存在的理由之一**。

plan §3.4 整節、AC-6、AC-8 都建立在「不存在的 id 回 307 導回列表」上。
Day 0 一 grep 就發現 `apps/web` **根本沒有 middleware**：那個 307 來自
`(app)/layout.tsx:50` 的 `if (!persona) redirect('/login')` —— **未登入**閘門，
對 `(app)` 底下每一條路由一律觸發。

沒抓到的話會發生什麼**不是**「多花時間」，是**做出一個修好了不存在的缺陷的 phase**，
然後在 BACKLOG 上把 `AD-FrontendMissingIdRedirects-1` 標成 CLOSED —— 一條假的關閉紀錄。

⭐ Day 3 有了真伺服器之後把它**從推論升級為量測**，而決定性的一行是
**`/risks` 列表路由（根本沒有 id）同樣回 307**。列表沒有 id 可言，所以那個 307
不可能是「詳情路由對找不到的 id 做導向」。

⚠️ **`D-detail-hybrid` 的 ROI 其實更高但更難歸因**：它揭露詳情頁吃**五個** fixture 來源。
若沒抓到，Day 2 會照 plan 只換一個資料源，得到一頁 UUID 濾不出任何 fixture 的空白畫面。
⛔ **但它沒有預見最重的那一項** —— 它數對了來源數量，卻把那些區塊當成**中性裝飾**。
「稽核軌跡是治理證物」這件事，Day 0 和 Day 2 兩次裁決都沒看出來，是 drive-through 才看出來的。

---

## Q4 — 做得好的（保持）

- **⭐ 先取 payload，不從 schema 推。** Day 2 一開始就把 API 跑起來 curl 真實回應。
  從 model 推會得到「欄位名稱不同」；**從 payload 看才會發現「五個欄位根本沒有來源」**。
- **⭐ 中性化的預測寫在執行之前，而且預測了「哪些會維持綠」。** 5/5 相符，
  但真正買到東西的是那格「單元測試維持綠」的預測 —— 它把一個**壞消息**變成可陳述的：
  約束 8 的機械守衛只有整合測試一層。若只預測「哪些會轉紅」，這件事不會浮出來。
- **⭐ seed 自己在 `counts.length < 2` 時拋錯。** AC-3（跨兩個 entity）因此有機械承載，
  不是「記得看一眼輸出」。⚠️ 同理 `NODE_ENV=production` 直接拒絕執行。
- **AC-5 用真的 `Stop-Process` 掉 API 驗，不是 mock 一個 rejection。**
- **AC-6 比對遮蔽 id 之後的 `innerHTML`**（digest `f82fe766` / 1679 字元逐位元相同），
  而不是斷言「兩者都顯示某種 not-found」—— 後者抓不到未來新增的分支。
- **主動更正自己的測試數**（Day 1 寫「新增 5」，實為 +4：把改寫既有測試誤算成新增）。
- **未診斷的就寫未診斷。** 2 個 web 測試檔失敗一次未重現，記成
  「觀察到、未重現、未診斷」，不寫成 flake 也不寫成沒發生。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | **0** | ⭐ 這條是 Day-0 `D3` 裁決的**依據**：只做列表頁會讓 `GET /risks/:id` 沒有消費者 = side-track |
| AP-2 Cross-directory scattering | **0** | `NoSource` 兩頁共用，刻意不各寫一份 |
| AP-3 Potemkin | **0**（修正後）| ⛔ **修正前是 8** —— 見下方 |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | **0** | 刻意不引資料抓取函式庫；型別**刻意不放 `packages/types`**（只有一邊 import 的契約項目是平行定義 → `AD-RiskContractUndeclared-1`）|
| AP-6 Mock vs real divergence | **0** | AC-5 有具名負面測試（fixture 第一列的標題必須不在 DOM 裡）；`DemoBadge` 加 `partial` 變體 |
| AP-7 命名 / orphan claim | **0** | 無版本後綴 |
| **總計** | **0**（修正後）| |

**Lint**: `run_all.py` **9/9** ✅

⛔ **AP-3 那一格的 0 是修正後的值，而修正前是 8，這件事比 0 重要。**
八個缺陷全部通過 lint / type-check / **484 + 95 測試** / build / `run_all` 9/9。
其中三個是 AP-3 的教科書形態：

- **fixture 假資料裝成真**（簽核鏈、稽核軌跡、`Tamper-evident`）
- **標籤誤導**（partial badge 在列表頁說「以下的稽核軌跡…」，而列表頁沒有稽核軌跡）
- **控件看起來有效果而實際沒有**（scope 選擇器改的是宣稱不是資料）

⚠️ 第三個**比 W19 那 25 個死控件更危險**：死控件點了沒反應，這個點了會看起來生效。

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-FixtureProseBecomesForgedEvidence-1` 🟡 | W19 的 fixture 文案（簽核鏈 / SHA-256 軌跡 / `Tamper-evident`）在畫面接上真資料的那一刻變成偽造的治理證物；**同樣的文案還活在其餘 28 個畫面上** | 每一片「接 API」的 phase，checklist 必須有一個具名 `[ ]`：**列出該頁所有對「這一筆記錄」做出的陳述，逐條問「API 送得出來嗎」** | 候選 |
| `AD-UnitTestsBlindToScope-1` 🟡 | 21 條單元測試在範疇完全失效時全綠；整合測試是約束 8 唯一的機械守衛，而它不在 required checks 裡 | `test:int` 進 required status checks，或補一條「整合測試缺席時會紅」的守衛 | 候選 |
| `AD-CrossScreenContradictionNoGuard-1` 🟡 | 兩畫面對同一筆風險說 4 Low vs 12 Medium；測試的斷言範圍從不跨畫面 | 第 3 個畫面消費 `risks` 時補跨畫面斷言，或把衍生值收斂到單一 formatter | 候選 |
| `AD-ScopeSelectorInertOnLiveScreens-1` 🟡 | 全域 scope 選擇器對已接 API 的畫面無效而看起來有效 | M4 真認證前，每接一頁都要在該頁標示 | 候選 |
| `AD-RiskByIdLinearScan-1` 🟢 | `GET /risks/:id` 是 O(n) | 解封條件：列表本身開始分頁 | 候選 |
| `AD-UndiagnosedWebTestFailure-1` 🟢 | 合併跑測試時 2 個 web 檔失敗一次，未重現未診斷 | 下次合併跑保留完整輸出 | 候選 |
| `AD-CalibrationNoTimeRecord-1` 🟡 | —— | **更新**：第 3 級（checklist 具名 `[ ]`）首次奏效 ⇒ 第 4 級機械強制**暫緩**；再兩個 phase 做到就關閉並寫進 frozen 模板 | 驗證中(1/3) |

- [x] 已記入 `docs/01-planning/BACKLOG.md`（detector 報 total 164→170 / P1 85→89 / P2 73→75）

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **其餘 28 個畫面的 fixture 文案** → `AD-FixtureProseBecomesForgedEvidence-1`
  （⭐ **這是本片影響半徑最大的一條** —— 它今天無害，而它每接一頁就重演一次）
- ✅ **gitleaks / semgrep 對新檔** → **已解封**（PR #86 CI）
- **SAST 完全不看 `test/` / `tests/`** → `AD-SemgrepSkipsTestDirs-1`（⭐ 這一條是**讀 CI log 讀出來的**，
  不在 plan 的任何預期裡；`int-global-setup.js` 以 schema owner 連真資料庫而零 SAST 覆蓋）
- **`prisma/seed.ts` 不被 gate 讀** → `AD-SeedFileUngated-1`
- **真 404 status** → `AD-Real404Status-1`（兩頁都是 `'use client'`，不是一行替換）
- **UI 與 DB 的實體詞彙零交集** → `AD-EntityVocabularyMismatch-1`
- **`isms_dev` migration 落後的結構性解法** → `AD-DevDbChecksumDrift-1`（**第 6 次**，
  候選解：`run_all` 加一個 detector 比對 migration 檔數與 `_prisma_migrations` 列數）
- **審計 #7 的 `AD-27` / `AD-30`（ADR 層）** → 🚧 **未做** —— plan §9 建議夾帶於本片，
  checklist 4.2 註明「使用者核可才做」，本次未取得核可。
  ⛔ **根因是「closeout 檢查表沒有 ADR 那一格」**，那才是要修的東西

**這個 phase 關掉的**：

- **無 AD 關閉。** ⛔ `AD-FrontendMissingIdRedirects-1` **更正而非關閉** ——
  它描述的缺陷不存在（Day-0 `D-307`），沒有東西可修，關閉它等於留下一條假的關閉紀錄

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**只動 2 行**：Current Phase + Last Updated）
- [x] `MEMORY.md` 新條目是品質指標（不是打包的 retro 摘要）
- [x] Phase 細節完整保存在 `memory/project_w22_risks_vertical_slice.md` + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— **R4 的敞口性質改變了**（從「稽核軌跡缺席」變成
      「畫面宣稱它存在」），已更新該列並新增 **E5**（R4 + R6 的新形狀）
- [x] `plan.md` frontmatter `status: closed`，內文標記一致（R9）
- [x] `python scripts/lint/run_all.py` 全綠
- [x] Checklist 沒有被刪掉的 `[ ]` 項（3.2 那條 404 用刪除線標「Day-0 已改寫」並保留）
