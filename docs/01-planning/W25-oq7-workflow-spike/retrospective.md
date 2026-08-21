# Phase W25 — Retrospective

**Phase**: W25 — OQ-7 spike：精簡狀態機的邊界在哪
**Period**: 2026-08-21 ~ 2026-08-21（單日）
**Plan**: [plan.md](./plan.md)
**PR**: **MERGED (PR #98, `c527319`)** —— 首推 CI `gates` 轉紅（int 5 failed），修法見 `progress.md` §4；重推後 **6/6 綠**
**Change record**: `docs/03-implementation/changes/CH-047-policy-lifecycle-transition.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 轉換表 + 守衛，非法轉換被拒（含中性化證據）| ✅ 完成 —— 三次中性化**預測全部逐格命中** |
| US-2 | 轉換的稽核涵蓋，逐欄斷言 | ✅ 完成 —— **本 repo 第一次實走 update 的稽核路徑** |
| US-3 | 「精簡 vs BPM」五條判準的逐條裁決 | 🚧 **部分** —— 見下 |
| US-4 | 兩個候選的量測表，五個維度 | ✅ 完成 —— 五維度全部有數字，含一個明寫「無訊號」 |
| US-5 | drive-through 截圖 + observed-vs-intended | ✅ 完成 —— 九步全中 |
| US-6 | ADR-0002 + design note + OQ-7 拍板 + D004 重新評估 | ✅ 完成 |

**未完成項目**：

- **US-3 只有一條流程的證據**。plan **§3.3 承諾「逐條對照本片兩條 Wave 1 流程檢驗」**，
  而 **§3.x 把 issue→action 排除在本片之外** —— **plan 自己矛盾**。
  已照 §3.x 執行，且每一條判準都標明 issue→action 為「未驗」，**不假裝驗過兩條**。
  → `AD-PlanInternalContradiction-1`
- **判準 4（使用者能否執行期自訂流程）完全未驗** —— 它是產品問題不是工程問題。
  → **`decision-form.md` OQ-9**（新開，已指名 stakeholder）

---

## Q2 — Calibration（工時校準）

- **Scope class**: `spike`（**第 7 個**資料點）
- **Agent-delegated**: `no`（plan 時宣告，實際也是 no —— 零次派工）
- **Bottom-up est**: **20.5 hr**（Day-0 Go/no-go 時由 18.5 修訂）
- **Committed (calibrated)**: **13.3 hr**（mult 0.65）
- **Actual**: **≈ 2.64 hr**
  - 量法：前一片的 post-merge commit `664fcdc` **09:01:29** → Day-4 最終 gate sweep **11:40:08**。
    ⚠️ **不含 commit / PR / merge**（那些還沒發生）⇒ 真實總量會再高一點點。
  - ⚠️ 這是**牆鐘時間上界**（含所有間隙），不是分項加總 —— progress.md 未逐項記時。
    真正的工作時間 ≤ 2.64 hr，所以下面的 ratio 是**保守（偏高）**的。
- **Ratio**: 2.64 / 13.3 = **0.199**
- **Band 判定**: **UNDER**（< 0.7），且**遠低於**下限

**發生了什麼**：

⛔ **plan §7 登記的可證偽預測沒有命中，而且是往下沒中。**
預測寫的是「actual 落在 **2.9–5.3 hr** ⇒ ratio 0.22–0.40」，實測 **2.64 hr ⇒ 0.199**。
⚠️ **差距很小（2.64 vs 下限 2.9），但方向是明確的** —— 而且 actual 是**上界**，
真值只會更低、離區間更遠。

`actual / bottom-up` = 2.64 / 20.5 = **0.129** ——
這是 `AD-BottomUpEstimateInflated-1` 的**第 4 個資料點**，而且趨勢在**惡化**：

| Phase | actual / bottom-up |
|---|---|
| W22 | 0.26 |
| W23 | 0.25 |
| W24 | 0.141 |
| **W25** | **0.129** |

**不是雜訊，是系統性的。** 四個點單調下降，跨越 spike 與非 spike class。
⇒ **該修的是估算方法，不是乘數。** 把乘數從 0.65 調到 0.13 只會讓下一片的 bottom-up
繼續虛胖，然後在第 5 個點再調一次。
⭐ **本片還多提供一個反證**：plan §7 那個預測正是「用前三個比例外推」得到的，
而它**往下沒中** ⇒ 連外推都不可靠，因為那三個比例自己還在下降。

**行動**: **KEEP 0.65**（乘數不動），並把 AD 從「候選」升級為**已驗證**。
理由：這個 class 的乘數若跟著 ratio 走，就變成在追一個**被污染的分子** ——
問題出在 bottom-up 的產生方式（逐任務估時對 AI 輔助開發沒有校準基礎），不在乘數。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] |R − 1.0| = 0.82 > 30% ⇒ AD 已記入 `BACKLOG.md`

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**9**（Prong 1: 0 / Prong 2: **9**（D1-D9）/ Prong 3: 0）
  - ⚠️ D6-D9 是**裁決後補做**的 —— 我第一次交 Day 0 時 `D-audit-on-transition` **沒達到自己的 DoD**
    （那格寫「實測一次，不採信推論」，我交的是讀 code）。回頭補做才挖出這四條。
- Day-0 成本：約 **35 min**（含補做）
- **預防的返工**：~**3-4 hr**
- **ROI**: ~**6×**

**最有價值的那個 drift**：**D1**（`Policy.status` 在 API 層有 0 條寫入路徑）。

plan §3.1 原本寫「守衛接在 `D-status-writers` 找出的**共同下游**」——
**那個東西不存在**。若沒查，Day 1 會花時間找一個不存在的接點，
然後很可能把守衛接在 repository（`core-model`）上，而 `MATRIX['core-model']` **不允許 import `workflow`**
⇒ 在第一次 lint 撞牆，並且**很可能被誤讀成「範疇劃錯」而去改 `eslint.config.mjs`**。

**第二有價值的是 D6**（整棵樹零個 domain update）：它把 US-2 從「複驗既有涵蓋」
變成「**這條路徑的第一次實走**」，直接改變了那條 deliverable 的份量。

---

## Q4 — 做得好的（保持）

- **中性化的預測寫在執行之前，六次全部逐格命中**（N1/N2/N3 + E1/E2 的修正預測）。
  ⭐ 而 **E1 的原預測是錯的** —— 我在執行前想到更好的預測，**另記一條、原預測保留不刪**。
  那個保留讓「我當時在想什麼」可考。
- **替換實驗**把「與稽核鉤子的接合成本」從論述變成量測：
  改一行 import 跑完整套件（unit 512/42 + int 280/22 全綠）。
  ⭐ 副產品是 **ADR-0002 的 Rollback 成本不是估的** —— 那條路真的走過。
- **窮舉等價測試**（36 組有序配對）四行換 36 個斷言，
  把「我是不是把生命週期抄錯了其中一份」從後面每一個數字裡移除。
- **三條結構性限制釘成測試而不是寫進文件**（`before` 恆 NULL · resource_id 不同 · 滾升不能轉換）。
  文件會過期，紅燈不會。

### ⚠️ 一個沒做好的（不列 AD，但要記下來）

**Day 0-3 一次 commit 都沒有。** `task-workflow.md` §Step 3 要求「頻繁 commit
（一個邏輯單元一個 commit）」，§Prohibited 也列了「沒有對應 checklist 條目的 commit」——
我做的是反過來的極端：**四天份的工作全部堆在 Day 4 一次落地**。

**代價**：(a) 中途任何一次工具崩潰都會失去全部；(b) reviewer 拿到的是一坨而非可逐步閱讀的序列；
(c) calibration 的分子只能靠牆鐘反推（`AD-CalibrationNoTimeRecord-1` 的第 4 次）。

**這次的緩解**：closeout 時拆成**兩個邏輯 commit**（code / docs）而不是一坨 ——
但那是補救不是遵守。⚠️ 本片只有 2.6 hr，代價還小；同樣的習慣放在一個真正跨四天的 phase 上會很痛。

### ⛔ 第二個沒做好的 —— 而它是本片**最有價值**的一條

**push 後 CI `gates` 轉紅**：int **5 failed**，五條全在本片新增的 `workflow.int.spec.ts`。
根因、重現、修法、雙環境驗證全記在 `progress.md` §4.1-4.7。一句話：
**測試的呼叫者身分來自環境變數 `DEV_PRINCIPAL_ENTITIES`，CI 是 `HK1`、我的機器是 fallback 的 `SG1`**
（CI 跑 `cp .env.example .env`，而 `.env.example:42` 就是 `HK1`）。

**這條為什麼比前一條重要**：三層驗證我**全做了而且都是真的** ——
gate 全綠、drive-through 開了真 UI + 真後端 + 真 DB 走完九步。
但**三層都跑在同一台機器、同一份 `.env` 上**，所以三層共用同一個隱含前提，
於是這個缺陷**同時穿過全部三層**。

> `verification-discipline.md` 的三層是「**驗證得多深**」的軸。
> 這次證明還有第二個軸：「**在幾個環境裡驗過**」。深度再深，也補不上只有一個環境這件事。
> ⇒ `AD-VerificationEnvironmentIsAnAxis-1`

⚠️ **並且這不是新知識**：`risk.int.spec.ts:434-448` 早就處理過同一件事，
連註解都寫明了為什麼要 set 與 restore。**Day 0 的 Prong 2 沒有去找「同類測試的既有先例」** ——
它查的是 plan 對現有 code 的斷言，而這條屬於「別人已經解過的問題」，落在它的射程外。

⭐ **一個該記的正面事實**：修的是**測試的前提**，不是產品碼 ——
`byId` 對範疇外的列回 404 完全正確（約束 8）。CI 抓到的是我的測試說謊，不是平台會壞。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | **0** | 候選 B 是唯一的旁支，**已於 Day 4 刪除**（連 `xstate` 相依一起） |
| AP-2 Cross-directory scattering | **0** | 轉換邏輯全在 `workflow/`；守衛套用點在 `modules/` 是矩陣要求的 |
| AP-3 Potemkin | **0**（新增的）| drive-through PASS。⚠️ **但揭露了一個既有的**：`/policies` 無轉換控件 → BACKLOG |
| AP-4 PoC accumulation | **0** | 候選 B 有明確 hypothesis + deadline（Day 4）+ 決策（刪除）。**不合併 = 刪除**，已執行 |
| AP-5 Speculative abstraction | **0** | ⛔ 刻意**沒有**建涵蓋兩個候選的抽象層（plan §3.x 明列，且那正是 D004 要防的起點）|
| AP-6 Mock vs real divergence | **0** | drive-through 用真 DB；`DevPrincipal` 啟動警告正常發出，回應帶 `_devPrincipal` 標記 |
| AP-7 命名 / orphan claim | **0**（新增的）| `transition.guard.ts` 的「guard」取 statechart 語義，header 明寫與 Nest `CanActivate` 的歧義（實測全 repo 零個 `CanActivate`）。⚠️ **揭露兩個既有的** → BACKLOG |
| **總計** | **0** | |

**Lint**: `run_all.py` **11/11** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-BottomUpEstimateInflated-1` | 第 4 個資料點，`actual/bottom-up` 0.26→0.25→0.141→**0.129** 單調下降 | **停止逐任務估時**。改為「對照最近 3 個同 class phase 的 actual 直接給區間」，bottom-up 只留作範圍檢查不進乘數 | **已驗證（4/3）→ 可回流模板** |
| `AD-PlanInternalContradiction-1` | plan §3.3 承諾驗兩條流程、§3.x 排除第二條 —— **同一份 plan 自相矛盾**，Day 2 才發現 | Day-0 Prong 增加一條：**plan 內部一致性檢查**（§Acceptance 承諾的射程 vs §Out-of-Scope 排除的東西） | 候選 |
| `AD-ProxyMetricInPlanItself-1` | plan §3.4 指定用 `wc -l` 量「定義行數」，而它量到的是註解密度（191 vs 105 → 真實 46 vs ≈47） | plan 寫量測維度時，**量法必須自帶「這個代理指標會在什麼情況下說謊」** | 候選 |
| `AD-RulerGranularity-1` | `loc-api-prod`/`loc-api-test` 一天內轉紅 **4 次**，**沒有一次需要判斷** | `loc-*` 改為「僅在 phase closeout 比對」或改記數量級。⭐ **M5 錨點不要動** —— 它同樣破 **4** 次（0→2→3→2）但**每次都逼出一次重判**，且其中**兩次抓到判定敘述已失真**（「端點未建」在端點通了之後、「OQ-7 未拍板」在拍板之後）。那是它在做事 | 候選 |
| `AD-SuiteGreenNotSuiteGreen-1` | 新 int 套件單獨跑 11/11 綠，完整跑弄紅**別人的 3 條**；而這個坑逐字寫在 `jest.int.config.js:51-55`（W03 踩過） | 「單獨跑綠」不可作為套件綠的證據 —— **寫入 `verification-discipline.md` §證據層變體**的形態表 | 候選 |
| `AD-VerificationEnvironmentIsAnAxis-1` 🟡 | gate + curl + drive-through **三層全做且全真**，缺陷仍同時穿過三層 —— 因為三層都在同一台機器、同一份 `.env` 上（CI `HK1` vs 本機 `SG1`）| `verification-discipline.md` 增列**第二個軸**：驗證深度之外還有「驗過幾個環境」。最小可執行形式 = **user-facing 收尾前先讓 CI 跑過一次**，不要把 push 排在所有文件都寫完之後 | 候選（**P1**）|
| `AD-Day0NoPrecedentSearch-1` | 修法的先例（`risk.int.spec.ts:434-448`）**早就存在且有註解**，Day 0 三-prong 沒有去找它 —— prong 2 查的是 plan 的斷言，「別人解過沒有」在射程外 | Day-0 加一條 sub-prong：**寫新測試前，grep 同類測試對同一個 ambient 依賴的既有處理**。⚠️ 不是加第四個 prong，是 prong 2 的一句話 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **UI 無轉換入口** —— 轉換能力已驗證但使用者用不到 → `AD-PolicyTransitionNoUiEntry-1`（P1）
- **判準 4 未驗** → `decision-form.md` **OQ-9**（已指名 stakeholder）
- **稽核的三條結構性限制** → ADR-0003 的輸入（`before` 恆 NULL · resource_id 不同 · 滾升不能轉換）
- **issue→action 生命週期** → M5 後續切片
- `shell.inert` 共用文案對 `New policy` 而言理由不實 → `AD-SharedInertProseInaccurate-1`
- `audit-coverage.int.spec.ts:20-24` 註解說「parallel workers」，config 是 `maxWorkers: 1` → orphan claim
- `prisma/seed.ts:434` 繞過 repository 直寫 status → 已知缺口

**這個 phase 關掉的**：

- **OQ-7** ✅ CLOSED → ADR-0002 已採納
- **D004 重新評估完成** ✅ —— 維持 defer，但**解封條件改寫**（原條件不可證偽）
- `AD-BottomUpEstimateInflated-1` ✅ 升級為**已驗證**（4 個資料點）

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— 見下方 §ADR / Risk 複查
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] ⭐ **已採納的 ADR 已複查** —— 見下方 §ADR / Risk 複查
- [x] ⭐ **`PR-pending` 標記已翻** —— `gh pr view 98` 回 `MERGED` / `2026-08-21T05:25:54Z`，
      **驗證後才翻**（不採信宣稱）。5 處，逐處讀過
- [x] `python scripts/lint/run_all.py` 全綠

---

## Design Note 8-Point Self-Check

| # | Point | 狀態 | 備註 |
|---|-------|------|------|
| 1 | Section header 對應 US | ✅ | §2 的七節全部以 `US-1` / `US-2` 開頭 |
| 2 | 每個 claim 有 `file:line` | ✅ | 16/16；行號在寫入前**逐一 grep 取得**，非憑記憶 |
| 3 | Decision matrix | ✅ | §1 三欄（A / B / C）+ 選它的理由 + **逐項否決理由** |
| 4 | Verification command | ✅ | 每個 invariant 一條可重現指令；§2.7 是真 DB 的 psql |
| 5 | Test fixture ref | ✅ | 四個 spec 檔逐一指名 |
| 6 | Open invariant 分界 | ✅ | §4 列 **8 項**，含「UI 無入口」與三條稽核結構限制 |
| 7 | Rollback 路徑 | ✅ | ⭐ **成本不是估的** —— Day 2 真的做過那個替換 |
| 8 | Cross-ref single-source | ✅ | §3 —— 新的跨範疇邊已在既有矩陣內（`eslint.config.mjs:81`），未平行定義 |

**Verified ratio**: **16/16 = 100%** ✅

⚠️ **分母寫清楚，否則 100% 沒有意義**：分母是 §1-§3 的技術 claim。
§4 的 8 項**不計入** —— 它們是依 8-point gate 第 6 點**明確宣告為未驗**的，
把它們算進分子是造假，算進分母則是懲罰誠實的分界。

---

## ADR / Risk 複查（逐檔看，不憑印象）

**已採納的 ADR 有沒有被本 phase 弄得不準確？**

| ADR | 複查結果 |
|---|---|
| **0003**（稽核 hash chain）| ⚠️ **本片產生三個新輸入**（`before` 恆 NULL 的後果第一次有真實使用場景 · create/update 的 `resource_id` 不同 · 滾升不能轉換）。**ADR 內文未失準**（它沒宣稱這些事），但這三條要進它的後續評估 → 已寫入 design note §4 與 BACKLOG |
| **0004 / 0014**（entity scoping / per-command policies）| ✅ 仍準確 —— 本片實測 `policies` 表的 `FOR ALL` policy 對 UPDATE 同樣生效（raw 連線 `rowCount 0`）|
| **0005**（受治理擴充）| ✅ 仍準確。⚠️ 但本片揭露它涵蓋**欄位**不涵蓋**流程** —— 那是 OQ-9 的前提，不是 ADR 失準 |
| **0001**（NestJS + Prisma）| ✅ 未觸及 |
| 0010-0013 / 0015 | ✅ 未觸及 |

⛔ **`AD-50` 複查（連兩次沒抓到的那一條）**：`CLAUDE.md` 是否仍把 **0007** 列為「已採納」且未提 **0015**？
→ **見本片 closeout 的 CLAUDE.md 變更**（本次逐字確認，不憑印象）。

**`RISK_REGISTER.md`**：本片是否讓某條活躍風險敞口變大或變小？
→ 逐條看過。**R8（Entity Zero 在 Wave 1 沒有承載體）不變**；
**無任何一條因本片而變** —— 本片新增的是端點與測試，未改變既有風險的暴露面。
複查日期已更新。
