# Phase W01 — Retrospective

**Phase**: W01 — Monorepo scaffold that turns the dormant gates on
**Period**: 2026-08-08 ~ 2026-08-08（單日）
**Plan**: [plan.md](./plan.md)
**PR**: #18（**MERGED** `ce72564`，2026-08-08 rebase merge —— 線性歷史保留，無 merge commit）
**Change record**: `docs/03-implementation/changes/CH-011-w01-monorepo-scaffold.md`
**Design note**: `docs/02-architecture/design-notes/W01-monorepo-scaffold.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | npm workspace 骨架，五個 CI 指令都存在且可跑 | ✅ 完成 |
| US-2 | `eslint.config.mjs` 八分區 + 已填寫的 `scope-boundaries.md` + 負面測試證據 | ✅ 完成 |
| US-3 | 兩個 Dockerfile；SCA / SAST / 容器掃描三個 job 真的執行 | 🚧 **部分** —— 三個 job 已真掃；**兩個 Dockerfile 從未被 build 過**（`AD-ImageBuild-1`）|
| US-4 | i18n L0 + `GLOSSARY.md` + key 一致性測試接進 `npm run test` | ✅ 完成（交出兩份字典，plan deviation 見下）|
| US-5 | drive-through PASS（含 `db: down` 的負面驗證）| ✅ 完成 —— 6 張截圖 + 五列 observed-vs-intended |
| US-6 | design note + retrospective + calibration 回填 | ✅ 完成 |

**驗收 9 項**：1-8 全數達成；第 9 項於本次 closeout 完成。

**未完成項目**：

- **US-3 的 build 驗證** → `AD-ImageBuild-1`（🟡 P1）。解封條件：CI 或部署環境跑一次 build
- **安全標頭的自動化斷言**（checklist `2.3`，全程標 🚧 未勾）→ 手動 curl 實測已做，
  但**手動實測與自動化斷言不可互相替代**。`16` 的逐條對照亦未做 → 下個 phase 或獨立 CH
- **`apps/web` 覆蓋率門檻** → `AD-WebCoverage-1`

**Plan deviation（R3）**：plan §3.3 寫「只有一份字典」，實作交出 `zh-Hant` + `en`。
理由：單一字典下 plan §5 的第 5、7 兩項驗收**無法誠實滿足**（沒有第二語言可切；
key 一致性測試斷言不了任何事）。英文已在 `07:20` 的語言集內。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `greenfield-scaffold`（**第 1 個資料點**，本 phase 新建的 class）
- **Agent-delegated**: `no`（plan 時宣告；實際亦為單人直接執行）→ `agent_factor` 1.0，三段式
- **Bottom-up est**: 24 hr
- **Committed (calibrated)**: 14.4 hr（mult 0.60）
- **Actual**: **~5 hr** —— ⚠️ **量測基礎不足**，見下方
- **Ratio**: 5 / 14.4 ≈ **0.35**
- **Band 判定**: **UNDER**（< 0.7）

**發生了什麼**：

⚠️ **先講量測問題**：`progress.md` **沒有逐任務工時紀錄** —— `task-workflow.md` Step 5 要求
「Task X.Y — actual Z min」，本 phase 從頭到尾沒寫。`~5 hr` 是從 commit 時間戳回推的
（首個 commit `1b2c18c` 16:30 → Day 3 收尾 `ada8fc7` 19:57 = **3h27m**，
加上第一個 commit 之前的 plan/checklist 起草與 Day-0 verify，再加 Day 4 收尾）。
**這是估算不是量測**，資料點品質因此打折。

即便如此，0.35 遠低於 band 下緣。兩個候選解釋，本 phase 無法區分：

1. **bottom-up 的 24 hr 是「人手寫」的尺度**，而實際執行方式是 AI 輔助 —— 若如此，
   `greenfield-scaffold` 的乘數應該遠低於 0.60，可能 0.35-0.45
2. **本 phase 的 scope 恰好高度模板化** —— 骨架大量沿用姊妹專案 `unified-operation-platform`
   的已知形狀，探索成本比一般 greenfield 低

**行動**: **等更多資料點**。依 `CALIBRATION-MATRIX.md` §何時調整乘數，
**單次離群值忽略，需要 3-phase 移動證據**。第 1 個資料點就調乘數會讓它在兩極間振盪。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md`
- [x] `|R - 1.0| > 30%` → AD 已記入 BACKLOG（`AD-TimeTracking-1`）

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量**: 6（Prong 1: 0 —— 路徑全符 / Prong 2: 6 / Prong 2.5 · 3: N/A）
- **Day-0 成本**: ~20 min
- **預防的返工**: ~2-3 hr
- **ROI**: ~7×

**最有價值的那個 drift**: **`D-nest-prisma-ver`** —— registry 現況 `@nestjs/core` **11.1.28**，
而 ADR-0001 與 `CLAUDE.md` §Tech Stack 字面寫 NestJS 10。

它的價值不在於省下裝錯版本的時間，而在於**它是一個必須由使用者拍板的決定，卻長得像一個技術細節**。
若 Day-0 沒有把外部 registry 納入 Prong 2，我會直接照 ADR 裝 10（或直接裝 latest），
兩種都是「替使用者默默選技術」。實際做法是表面化給使用者 → 選「當前主版本」→ 記為 plan §8 R-8。

> `day0-plan-verify.md` 的 Prong 2 定義是「plan 對**現有 code** 的事實斷言」。
> 本次把它擴及**外部 registry**，是有效的擴充 → `AD-Day0Registry-1`。

---

## Q4 — 做得好的（保持）

- **R-1 的緩解措施真的奏效** —— plan 預判「八個 gate 同時首航會一次爆數十個錯」，
  對策是 Day 1 先推 draft PR 讓 gate 分批醒。首航就撈出發現 A / B / C 三個問題，
  而且是在只有 `package.json` 的狀態下撈到的，診斷成本遠低於全部寫完才第一次跑 CI
- **每個「修好了」都用改變後的失敗形狀證明** —— 不是宣稱修好。例：`npm run start` 修正後
  仍然失敗，但從 `Cannot find module` 變成 `EADDRINUSE`，**那個變化才是證據**
- **殺進程前做歸屬判斷** —— Day 3 依 `local-runtime-ops.md` §4 逐一判定，
  結果撈到「跑著的 API 比自己的 dist 舊 11m52s」。若照慣性直接對它 drive-through，
  驗到的是 Day 2 中段的程式碼，**而畫面上不會有任何地方告訴你**
- **把不可行動的 finding 當成 bug 修** —— semgrep 掃到設計交付物的 vendored bundle
  （312 檔 / 19 blocking）時，改的是掃描範圍而不是加一堆豁免。
  **不可行動的 finding 會訓練人忽略報告**

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 所有程式碼皆可從 `main.ts` / Next 路由 / CI 進入點追蹤 |
| AP-2 Cross-directory scattering | 0 | 八範疇由 `eslint.config.mjs` 機械強制，非慣例 |
| AP-3 Potemkin | **5 → 0** | ⭐ 見下方專節 —— 五個全部在本 phase 內被找到並修掉 |
| AP-4 PoC accumulation | N/A | 無 `experimental/` |
| AP-5 Speculative abstraction | 0 | 刻意**不建**空 NestJS module（plan §3.4）；八個目錄只放 `.gitkeep` |
| AP-6 Mock vs real divergence | 0 | 無 mock —— health 打真 PostgreSQL，`compose.yml` 用與 production 相同的引擎 |
| AP-7 命名 / orphan claim | 0 | 無版本後綴。`ci.yml` 引用的 `AD-WebCoverage-1` 已同步建立，非 orphan |
| **總計** | **0**（收尾時）| 過程中出現 5 個 AP-3，全部關閉 |

**Lint**: `run_all.py` **6/6** ✅

### ⭐ 「綠燈但什麼都沒做」出現 5 次 —— 這需要結構性解法，不是第 6 次修補

| # | 什麼是綠的 | 實際上什麼都沒發生 |
|---|---|---|
| 1 | `npm run lint` 全綠 | boundaries 規則零強制力（六種設定失效方式，全部表現為綠）|
| 2 | `security-scan` 四 job success | 其中三個掃了 0 個目標（佔位符 / glob 不匹配）|
| 3 | `npm run build` 成功 | 產物 require 不到 Prisma client，起不來 |
| 4 | helmet 設定 `xPoweredBy:false` | `X-Powered-By: Express` 照樣回 |
| 5 | CI Tests 步驟 success | 跑的是 `test` 不是 `test:cov`，覆蓋率 45% 一路綠 |

**共同結構**：這五個全都是「**設定型**強制力」—— 你寫一段設定，宣告某件事應該被檢查。
設定損壞時它不會報錯，**它會安靜地什麼都不做**，而外層的 EXIT=0 讀起來像通過。

依 `.claude/rules/README.md` 的強度階梯，同一形狀 ≥3 次應改結構性解法。提議：

> **每一個宣稱會「擋住某件事」的機制，必須附一個會被它擋住的負面案例，
> 且該負面案例本身要在 CI 裡被執行。**

本 phase 已對 boundaries 與 i18n 做到（手動），但那是**一次性的**驗證，
明天有人改壞設定仍然沒有東西會叫。→ `AD-NegativeGate-1`（🔴 P0 候選）。

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-NegativeGate-1` | 「設定型強制力靜默失效」5 次 | 每個 gate 附一個常駐的、CI 會跑的負面案例 | 候選（本 phase 提出）|
| `AD-TimeTracking-1` | `progress.md` 零工時紀錄 → calibration 第 1 個資料點品質打折 | 每日 progress 條目強制寫 `Task X.Y — actual Z min` | 候選 |
| `AD-Day0Registry-1` | Prong 2 定義只涵蓋「現有 code」，而最有價值的 drift 來自外部 registry | `day0-plan-verify.md` Prong 2 明列「plan 引用的外部套件版本」 | 候選（已驗證 1/3）|
| `AD-ChNumber-1` | checklist 寫「最大為 CH-009」，但 CH-010 已被四處前向引用預留 | 「查最大號」改為 grep 全 repo 的引用，不是 `ls` 目錄 | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- 安全標頭的**自動化斷言** + `16` 逐條對照（checklist `2.3` 🚧）→ 下個 phase 或獨立 CH
- Dockerfile 的 build 驗證 → `AD-ImageBuild-1`
- `apps/web` 覆蓋率 → `AD-WebCoverage-1`
- ⚠️ **entity scoping / RLS** —— `PrismaService` 明文標示未範疇化。
  目前零 model 所以無資料可洩，**M1 加第一張表的瞬間即成為 guardrail 4 違反**。ADR-0004 未定
- `libssl3` 六條豁免 **2026-09-07 到期** → `AD-TrivyExempt-1`（到期自動變紅）

**這個 phase 關掉的**：

- `AD-Placeholder-1` 的 `scope-boundaries.md` 實例 ✅ CLOSED
- `AD-SecScan-1` 🚧 **部分關閉** —— 三個掃描 job 由空轉變為真掃；DAST 仍無 job（`AD-DAST-1`）

---

## M0 DoD 逐項標註（`docs/02-architecture/07-wave1-build-plan.md` §Build sequence）

| # | M0 DoD 項目 | 狀態 | 解封條件 |
|---|---|---|---|
| 1 | ADR-0001 settled | ✅ 關閉 | — |
| 2 | CI with SCA / SAST / **DAST** / secret-scanning + `16` 的自動化檢查 | 🚧 **部分** | SCA·SAST·secret ✅ 真跑；**DAST 無 job**（`AD-DAST-1`）；`16` 的自動化檢查未建 |
| 3 | IaC skeleton scanned | ❌ **未關閉** | ⛔ **不得打勾或標 N/A** —— 本專案不寫 IaC（`AD-IaCEvidence-1`）。二選一：引用 infra team 的掃描證據，或明記「由內部第三方營運」 |
| 4 | 部署拓撲（ADR-0010）+ 計算平台（ADR-0011）定案 | ✅ 關閉 | — |
| 5 | TLS/憑證、安全標頭、管理埠**明確設定**（絕不用預設）| 🚧 **部分** | 應用層標頭 ✅（真 runtime 實測）；TLS/憑證/管理埠屬部署期，infra 尚未佈建 |
| 6 | i18n scaffolding in place | ✅ 關閉 | — |

**M0 整體：未關閉。** 六項中 3 項完成、2 項部分、1 項無標的。

---

## Design Note 8-Point Self-Check

| # | Point | 狀態 | 備註 |
|---|-------|------|------|
| 1 | Section header 對應 US | ✅ | §2 七個 invariant 對應 US-1~US-5 |
| 2 | 每個 claim 有 `file:line` | ✅ | 21/22 已錨定 |
| 3 | Decision matrix | ✅ | §1 三個矩陣，每個含否決理由 |
| 4 | Verification command | ✅ | 七個 invariant 各附可重現指令 |
| 5 | Test fixture ref | 🟡 | §2.3（drive-through）與 §2.5（標頭）只有手動步驟 —— **已在文中標明**，非隱瞞 |
| 6 | Open invariant 分界 | ✅ | §4 列 8 項未驗證，含 RLS 這個最重的 |
| 7 | Rollback 路徑 | ✅ | §5 含可證偽條件兩條 |
| 8 | Cross-ref single-source | ✅ | §3 兩個契約指向 `packages/types`，未平行定義 |

**Verified ratio**: 21/22 ≈ **95%** ✅

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標（**不是**打包的 retro 摘要）
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（**不在** CLAUDE.md 表格格）
- [x] Calibration ratio 回填 matrix（**不在** CLAUDE.md / MEMORY.md 散文裡）
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] `plan.md` frontmatter `status:` 已翻成 `closed_partial`，內文標記一致（R9）
- [x] `python scripts/lint/run_all.py` 全綠
