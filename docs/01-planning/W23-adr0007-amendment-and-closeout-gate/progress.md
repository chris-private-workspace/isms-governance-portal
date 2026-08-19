# Phase W23 Progress

**Phase**: W23 — 裁決本地密碼衝突 + 給 closeout 補上它缺的那一格
**Plan**: [plan.md](./plan.md)
**Branch**: `feature/W23-adr-and-closeout-gate`

---

## Day 0 — 2026-08-19 — Plan-vs-Repo Verify

**對照基準**：`main` HEAD **`c2f823c`**（PR #88 status audit #8 merge 後）。

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-adr-breakglass** ⭐⭐ | **plan 把衝突寫成「ADR 禁止本地密碼 vs stakeholder 要它」，而 ADR-0007 其實*要求* break-glass** —— `:67` 的比較表有一整列 `2 break-glass, P1 to Group CISO \| required \| required \| **no — Entra emergency access accounts**`；`:103` 寫 break-glass（引 `05:49`）**remain platform features … Entity Zero controls**；而 `05:57` 明訂「**Break-glass accounts** — emergency access, heavily restricted, alarmed and fully audited on use」 | **衝突比 plan 記的窄，也比它記的尖銳**。ADR-0007 沒有禁止 break-glass —— 它**指派 break-glass 給 Entra emergency access accounts**，而那條路徑**仍然需要 Entra 連得上**。⇒ ADR-0015 要論證的**不是**「該不該有 break-glass」（已經有了），而是「**break-glass 可不可以是本地的、能在 Entra 掛掉時仍然可用**」。⇒ 改 plan §0 Root cause + §3.1 + §8 | 🔴 改 plan |
| **D-05-conditional** ⭐ | 如預期**且比預期更強**：`05:7` 原文是「The platform does not store passwords itself **where an IdP can be used**」；`0007:102` 引用時寫成「`05:7`'s "the platform does not store passwords" holds: no local credential store」 | **截斷改變了語義** —— 原文是條件句（「在 IdP 用得上的地方」），ADR 把它讀成無條件禁令。⇒ ADR-0015 引用 `05:7` 時**必須帶著條件**，這也是 D-adr-breakglass 的法源 | 🟡 小調整 |
| **D-adr-fc** ⭐ | 如預期**且比預期更強**：可證偽條件有 **3 條不是 2 條**。FC1 寫 `14 OpCos`（真值 **13**）· FC2 以 Azure China instance 為條件（**不存在 ⇒ 永遠不會 fire**）· **FC3「If group IT standardises on a different IdP」** —— 這一條**是健康的**（可觀察、真的會 fire）| `AD-43` 只點名了 FC1 / FC2，**漏了 FC3 是好的那一條**。⇒ ADR-0015 **保留 FC3**，修 FC1 的數字，刪 FC2 並說明為何 | 🟡 小調整 |
| **D-closeout-cells** | 如預期，**但抓法差點出錯**：`grep -ci "ADR"` 對四個檔回報 3 / 5 / 0 / 0，看起來像「兩處已經有了」。⛔ **逐字讀 Self-Check 區塊後，四個都沒有那兩格** —— `phase-closeout.md` 的 ADR 命中全在 §2「要不要**寫**一份 ADR」，那是**另一個問題**（本片要的是「有沒有讓**既有已採納**的 ADR 變得不準確」）| 命中數不是證據。⭐ 順帶找到**前例**：`retrospective.md.tpl` 的 `RISK_REGISTER` 那一格是審計 #3 用同樣手法加的 ⇒ 形狀已被證明。⚠️ **但四份清單今天已經不是彼此的鏡像**（`task-workflow.md` 沒有 `RISK_REGISTER` 也沒有 `status:` 格）⇒ plan §3.4 的「四處措辭一致」只能指**新增的那兩格**逐字相同，不是整份清單收斂 | 🟡 小調整 |
| **D-rules-budget** | `check_rules_hygiene.py:98` 的 `task-workflow.md` 預算 = **32,000 bytes**，現值 **25,435** ⇒ headroom **6,565** | 兩行綽綽有餘。**plan R5 未觸發** | ✅ |

### 確認無誤（沒有漂移的部分 —— 同樣是 Day-0 的產出）

| 宣稱 | 實測 |
|---|---|
| `docs/14-adr/0015-*.md` 不存在 · ADR 最大號 `0014` | ✅ |
| `CH-043` 未被佔用 | ✅ `changes/` 最大號 `CH-042` |
| 九個 EDIT 目標全部存在 | ✅ |
| `0007:102` 寫著 `no local credential store` | ✅ 逐字相符 |
| **登入頁零 `input[type=password]`** | ✅ —— ⚠️ `grep -c` 回報 **1**，逐行讀後確認那是 `:23` 的**註解**（描述被移除的五個），**實際 input 為 0**。⛔ 又一次「命中數不是證據」，本次靠讀原文解掉 |
| `my-profile/page.tsx:423` 的「變更密碼」是 disabled | ✅ 註解 `'Change password' is KEPT by an explicit 2026-08-17` + `disabled` prop |
| `my-profile.test.tsx:54-56` 斷言 `input[type="password"]` 長度 0 | ✅ |
| `0007:21,90,135,145` 的 Azure China 現在式敘述（`AD-30`）| ✅ 四處全中；⚠️ **`:145` 額外引著 ADR-0006，而 0006 自己已被 ADR-0010 取代** |
| `check_status_markers.py` 的 E4 豁免 | ✅ 「E4 fires only when the sibling **HAS** a status field. Missing sibling frontmatter is deliberately **NOT** an error」⇒ E5 不得破壞它 |

### ⛔⭐⭐ Baselines 量到一件比漂移更嚴重的事：合併跑的測試會**只跑一部分而回報綠**

量 baseline 時跑 `npm run test -w apps/api -w apps/web`，web 那半回報：

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

而 baseline 是 **10 files / 95 tests**。⛔ **它沒有紅，它「通過」了。**

三次獨立量測：

| 跑法 | 結果 |
|---|---|
| `npm run test -w apps/api -w apps/web`（第 1 次）| api 484 ✅ · web **1 file / 5 tests** ⛔ |
| `npm run test -w apps/web`（單獨）| **10 files / 95 tests** ✅ 與 baseline 相符 |
| `npm run test -w apps/api -w apps/web`（第 2 次）| api 484 ✅ · web **10 files / 95 tests** ✅ |

⇒ **間歇，未重現**。⛔ **不宣稱機制** —— 我不知道 vitest 為何只收了一個檔。

**但形狀本身不需要機制就能判斷它有多糟**：

- W22 記的 `AD-UndiagnosedWebTestFailure-1` 是「**2 個檔失敗**」—— 那會**紅**，人看得見
- 今天量到的是「**只跑 1 個檔**」—— 那會**綠**，而且 `1 passed (1)` 讀起來像通過
- ⇒ **同一個底層問題的兩個面，而綠的那一面危險得多**

⚠️ **這使一個過去的宣稱失去確定性**：任何一次以**合併跑**取得的「web 95 passed」，
事後都無法排除它其實只跑了一部分 —— 除非當時的輸出保留了 `Test Files N` 那一行。
⇒ **本片之後的 gate sweep，web 一律單獨跑**，或至少同時記下 `Test Files` 的檔數。

### Prong 覆蓋

- **Prong 1（path）**：11 個路徑 + 2 個編號可用性 → **0 個漂移**
- **Prong 2（content）**：9 個宣稱 → **1 個實質漂移**（`D-adr-breakglass`）+ **3 個「比預期更強」**
  （`D-05-conditional` · `D-adr-fc` · `D-closeout-cells`）
- **Prong 2.5（child tree）**：**N/A** —— 非前端頁面 phase
- **Prong 3（schema）**：**N/A** —— 零 schema 變更、零 migration

### Go / No-Go

**範圍變動**: **~10-15%** —— `D-adr-breakglass` 改的是 **ADR-0015 要論證什麼**，
而 §4 File Change List、8 條 AC 的結構、§7 workload **全部不變**。
→ 落在 **≤ 20% 帶** ⇒ 依 `task-workflow.md` **繼續 Day 1**，把 finding 記入 plan §Risks
（⛔ **不默默改 §Technical Spec** —— 保留「原本計畫什麼 vs 現實逼你改成什麼」的審計軌跡）。

### Baselines（逐項實測，全部與 plan 宣稱相符）

| Gate | 結果 |
|---|---|
| `npm run test -w apps/api` | **484 passed / 40 suites** ✅ |
| `npm run test -w apps/web`（**單獨跑**）| **95 passed / 10 files** ✅ |
| `lint`（api + web）| clean |
| `type-check`（api + web）| clean |
| `format:check`（api + web）| clean —— `All matched files use Prettier code style!` ×2 |
| `build`（api + web）| clean —— `✓ Generating static pages (25/25)` |
| `run_all` | **9/9** |
| `check_entity_index` | **34 / 36** |
| `check_backlog_counts` | OK（**173** —— P0 6 / P1 92 / P2 75）|
| `check_status_markers` | OK（**30 個 pre-doc**，E1–E4 clean）|

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 0（`11:27:55` 建分支 → 完成 drift 記錄與 plan §Risks 修訂）| **≈ 15 min** |
| 對照 plan §7 的 Day-0 估算 | 0.5 hr（30 min）⇒ ratio **≈ 0.50** |

> ⚠️ 其中約 5 分鐘花在追那個測試 runner 的異常（跑了三次）—— 那不在 Day-0 的估算裡，
> 而它是本日**最有價值**的產出。
