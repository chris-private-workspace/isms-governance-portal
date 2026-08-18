# Phase W20 — Retrospective

**Phase**: W20 — responsive layout down to 768px
**Period**: 2026-08-17 ~ 2026-08-18
**Plan**: [plan.md](./plan.md)
**PR**: **MERGED** (PR #82, `215add3`) —— 與 CH-040 同一個 PR
**Change record**: 無 —— 回退後沒有行為變更可記錄
**Status**: **closed_partial** —— Day 0 / Day 1 完成，Day 2/3/4 未執行，**Day 1 成果已全數回退**（`215add3`）

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|---|---|---|
| US-1 | `useBreakpoint` hook（SSR 首幀保護 + 10 測試） | ✅ 完成 → ⛔ **已回退** |
| US-1 | 側欄自動收合 + 手動優先（7 測試） | ✅ 完成 → ⛔ **已回退** |
| US-1 | Topbar 窄螢幕收納 + 角色可達（6 測試） | ✅ 完成 → ⛔ **已回退** |
| US-2 | 21 個內容 `maxWidth` 放寬 | ❌ 未執行 |
| US-3 | 固定欄數 grid 依斷點降欄 | ❌ 未執行 |
| US-4 | 6 個表格 `minWidth` + 捲動容器 | ❌ 未執行 |
| US-5 | 五寬度 × 30 畫面 drive-through | ❌ 未執行 |

**淨產出：程式碼 0 行。** repo 的 `apps/web` 與 phase 開始前（`756d503`）逐位元組相同。

**非程式碼的殘值**（這才是本片留下的東西）：

1. Day-0 對交付物與 repo 的**量測**（40 個 `maxWidth` 的完整分類、6 個表格的真實失效模式）
2. 三個關於設計交付物的發現（見 Q3）
3. 一個新的失敗形狀：**gate 全綠 + drive-through 有做 + 方向錯誤**

---

## Q2 — Calibration（工時校準）

- **Scope class**: `greenfield-feature` 0.55（本應是該 class 的新資料點）
- **Agent-delegated**: `partial`（plan 宣告值），`agent_factor` 0.75
- **Bottom-up est**: 14 hr
- **Committed (calibrated)**: 5.8 hr（14 × 0.55 × 0.75）
- **Actual**: **無法計算** —— 見下
- **Ratio**: **N/A**
- **Band 判定**: **不適用**（phase 未完成，且時間記錄不完整）

**發生了什麼**：

兩個原因讓這個資料點不可用。第一，phase 只執行到 Day 1 就被裁定回退，把部分工時除以完整
承諾是拿不同的東西相比。第二 —— 也是更該記的 —— **`AD-CalibrationNoTimeRecord-1` 又犯了一次**。
plan §7 自己寫著「⚠️ 本片必須逐任務記時間到 progress.md」，而實際上**只有 Day 1 的三個任務有時間**
（~35 / ~40 / ~55 min），Day 0 的三-prong verify 與 Day 2 的回退＋closeout **完全沒有記錄**。

這是同一形狀第 **2** 次（W15 一次、本片一次）。依 `.claude/rules/README.md` 的強度階梯，
第 2 次符合「升級為 on-demand 規則 + 明確 Trigger」的條件，但**還不到**結構性解法的門檻（3 次）。
提議見 Q6 `AD-CalibrationNoTimeRecord-1`（狀態改為「驗證中 2/3」）。

**行動**: 本片**不產生資料點** —— 不回填 `greenfield-feature` 的 ratio，只在
`calibration-matrix.md` 記一行「W20 aborted，無資料點」，避免污染只有少數樣本的 class。

- [x] 已回填 `calibration-matrix.md`（記為無資料點）
- [x] 完整敘述已寫入 `calibration-log.md` §1
- [x] |R - 1.0| > 30% 的 AD 判定：N/A（無 R）

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量**：7（Prong 1: 1 / Prong 2: 6 / Prong 3: N/A —— 零 DB 變更）
- **Day-0 成本**：未記錄（見 Q2）
- **預防的返工**：~2-3 hr

兩個 drift 各自預防了一次實質返工：

- **D-cap-taxonomy** ⭐⭐ —— plan 的「91 個 px 上限」把**天花板（`maxWidth` 40 個）與地板
  （`minWidth` 54 個）混為一談**。若沒抓到，US-2 會去「放寬」54 個資料表的列寬地板，
  那會讓表格更糟而不是更好。而且其中 19 個 `maxWidth` 放寬後也會更糟（散文行長）
- **D-table-fix-insufficient** ⭐ —— 6 個表格不是「撐開後被裁」而是「被壓縮」，
  單加 `overflowX:'auto'` **不會產生捲軸**（沒有東西比容器寬）。這個修法會通過所有 gate 並且
  **什麼也沒修好** —— 典型的 silent no-op

**但 Day-0 有一個它照設計就看不到的盲區**，這是本片最重要的一課：

> 三-prong verify 驗的是「**plan 對 repo 的斷言是否屬實**」。本片的斷言**全部屬實**。
> 錯的是**斷言之上的目的** —— plan 假設任務是「發明交付物沒有的響應式」，
> 使用者要的是「參考交付物的尺寸」。**Day-0 不驗目的，所以它對這種錯完全沉默。**

### 為了回答「和 mockup 一樣是什麼意思」而查到的三件事

1. **交付物的 standalone HTML 跑不起 30 個畫面** —— `__dcRegistry` 只有 1 個項目（封面頁）。
   30 個畫面只存在於帶 `{{ }}` 模板語法的 fragment
2. **dashboard 已經和 mockup 一樣** —— grid 宣告與 `max-width`（兩邊皆 0）逐項相同
3. ⭐ **交付物自我矛盾** —— `README.md` 規格圖寫「main content, **max-width 1400px**」，
   `base.css:48` 有該規則，但 **`class="page"` 在交付物 fragment 與 app 皆出現 0 次**

第 3 點的後果超出本片：**在它被解決之前，「和 mockup 一樣」沒有可驗證的定義。**

---

## Q4 — 做得好的（保持）

- **中性化預測寫在執行之前，兩次都命中**。1.2 預測「3 紅 4 綠」實測完全一致；
  1.3 預測「1 紅」實測 1 紅。預先寫下預測讓「測試真的在測那件事」變成可證偽的
- **1.3 抓到一個會靜默消失的角色** —— 照 plan 隱藏 topbar 文字塊，使用者角色在 1440px 以下
  將**完全不可達**（使用者選單有 name + email 但沒有角色）。先補進下拉再隱藏。
  這是「看不到就算修好」（AP-3）在版面工作上的具體形態
- **三個 plan 處方在實作時被推翻，全部記錄而非默默改**（R3）。其中「搜尋框 `min(230px,100%)`」
  在數學上是 no-op，`100%` 相對於 flex 容器
- **回退驗證比對了檔案清單，不只內容**。`git checkout <sha> -- <path>` 不刪除該 commit
  不存在的檔，只比內容會得到「回退完成」的假結論

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 已回退，repo 無殘留 |
| AP-2 Cross-directory scattering | 0 | 全在 `ui` 範疇 |
| AP-3 Potemkin | 0 | 1.3 主動修掉一個潛在死路（角色不可達） |
| AP-4 PoC accumulation | N/A | |
| AP-5 Speculative abstraction | 0 | |
| AP-6 Mock vs real divergence | 0 | |
| AP-7 命名 / orphan claim | 0 | |
| **總計** | **0** | |

**Lint**: `run_all.py` **9/9** ✅

> ⚠️ **這張表全 0，而 phase 仍然失敗了。** 反模式清單量的是「做出來的東西有沒有壞形狀」，
> 量不到「做的是不是該做的東西」。這與 Q3 的 Day-0 盲區是同一件事的兩面。

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-PlanPremiseUnverified-1` ⭐⭐ | plan 對 repo 的斷言全部屬實、gate 全綠、drive-through 有做，**方向仍然錯**。三度被否決才發現前提從第一句就錯了 | plan §1 Phase Goal 必須引用**使用者原話**（逐字），並在 Day 0 增加一個成本極低的 prong 0：**把 phase 目的用一句話複述給使用者確認**，再開始寫 code | 候選 |
| `AD-HandoffSelfContradiction-1` ⭐ | 交付物 README 規定 main content `max-width 1400px`，其 30 個 fragment 從未使用 `class="page"` ⇒ 規格與實作互相矛盾 | 任何以「和 mockup 一樣」為驗收標準的 phase，**開工前必須先裁定以哪一邊為準**，並登記於 `15-design-alignment.md` | 候選 |
| `AD-DeadStylesheetClasses-1` | `apps/web/src` 全域 `className` = **0** ⇒ 逐字複製進來的 `base.css` / `components.css` 的 class **全是死碼**。約束 6 前半句（CSS 逐字複製）達成，後半句（組件消費它的 class 名）**全站未達成** | 決定要不要遷移。**不遷移也可以，但要明文記錄**，否則每次讀約束 6 都會以為已經做到 | 候選 |
| `AD-FidelityGuardNoConsumer-1` | `check_mockup_fidelity` 綠，因為它只驗「CSS 有沒有被改」，**不驗有沒有消費者**。守衛在、條件成立、沒有人在看 | 若 `AD-DeadStylesheetClasses-1` 裁定要遷移，則守衛加一條「class 消費數 > 0」 | 候選（依賴上一條） |
| `AD-CalibrationNoTimeRecord-1` | plan §7 自己寫了「必須逐任務記時間」，實際只有 Day 1 有 —— **同形狀第 2 次** | 升級為 on-demand 規則 + Trigger「每個 Day 收尾」。第 3 次才考慮機械強制 | 驗證中 (2/3) |
| `AD-Mockup-Responsive-1` | 本片原本要關掉它 —— **未關**，且它的問題陳述本身需要重寫（見 `AD-HandoffSelfContradiction-1`） | 重開，狀態退回 Open | 重開 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

---

## Q7 — Carryover

**帶到下個 phase 的**：

- ⭐⭐ **ROADMAP 9b —— `required_linear_history` 重審** → **必須進下一片的 checklist**。
  這個項目**已經被漏掉兩次**（W17 = 第 9 次、W18 = 第 10 次，兩次 retro 都沒記序數），
  W20 本來要接手，結果 W20 自己被回退 ⇒ 這是它第三次沒有著落
- 使用者的原始需求（響應式 / 版面尺寸）**仍未被滿足** → `AD-Mockup-Responsive-1`（重開）
- 使用者選單觸發鈕沒有可及名稱（無 `title` / `aria-label`）→ BACKLOG，既有缺口非本片造成
- 一個 dev-only 陷阱：`127.0.0.1:3200` 會被 Next.js 16 的 dev origin 檢查回 403，
  `localhost:3200` 正常 ⇒ **之後的 drive-through 一律用 `localhost`**

**這個 phase 關掉的**：

- 無。`AD-Mockup-Responsive-1` 原訂由本片關閉，**未關**

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則層級（Current Phase + Last Updated 兩行）
- [x] `MEMORY.md` 新條目是 ~300 字元的品質指標
- [x] 細節單一來源在 subfile + 本檔
- [x] Carryover 在 `01-planning/BACKLOG.md`
- [x] `plan.md` frontmatter `status: closed_partial`，內文標記一致（R9）
- [x] `run_all.py` 全綠
- [x] Checklist 沒有被刪掉的 `[ ]` 項（7 勾 / 40 未勾，未勾者全部標 🚧 + 理由 + 解封條件）
