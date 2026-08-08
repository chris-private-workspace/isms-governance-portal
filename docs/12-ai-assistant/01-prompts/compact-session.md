# ISMS — Compact Summary Prompt（每個 session `/compact` 之前用）

> **用法**：直接 copy「複製貼上區」這一節到 Claude Code 對話框送出即可。下方「設計說明」是給維護者看的背景，**不需要每次貼**。
>
> **適用範圍**：Wave 1 backbone（M0–M9）期間任何 ISMS-related session —— 含 Phase 軌 `W{NN}`、Change 軌 `CH-NNN`、Bug 軌 `BUG-NNN`。非本專案工作（ad-hoc explore / 一次性 docs）用通用 800 字 compact 即可。

---

## ✂️ 複製貼上區（直接送出，毋須修改）

```
/compact

## ISMS Compact 格式（≤1500 字，繁體中文）

### 0. 座標
Phase `W{NN}-{slug}` / Day N（或「無 active phase —— 獨立 CH-NNN / BUG-NNN」）
Branch / working tree（clean / dirty）/ 開著的 PR 數

### 1. 本次主要任務（一句話）

### 2. 已完成（按三軌流程順序）
- 走了哪一軌（Phase / Change / Bug / trivial）+ pre-doc 路徑（plan+checklist / spec / report）
- 檔案變更：新增 / 修改 / 刪除，**每個標明歸屬哪個範疇**（core-model / entity-scope /
  identity / workflow / audit-trail / api / modules / ui）
- 文件：progress / retrospective / checklist 勾了幾項 / BACKLOG 同步 / decision-form 同步
- **Gate 逐項寫實際輸出，不是「都過了」**：
  run_all N/6 · actionlint · detector tests · gitleaks（若跑過）
  ⚠️ monorepo 骨架未建立前，lint / type-check / test / build 是 **skip 不是 pass** —— 寫成 skip
- Commits：hash + subject（每個對應 1 個 checklist 項 — R2）

### 3. ISMS 紀律 9 項自檢（每項 ✅/⚠️/❌/N/A）
1. R1 pre-doc gate（分類 → 文件 → 才 code）
2. Entity-scoped 隔離（guardrail 4 / 約束 8 — RLS 優先於應用層；查無資料回 404 不回 403）
3. 稽核軌跡無旁路（guardrail 5 — 每個狀態變更都寫 append-only 日誌）
4. 設計保真度（約束 6 — CSS 是複製不是重寫；不對齊就 STOP and ask）
5. 範疇歸屬明確（約束 1 — 每個檔案歸屬 1 個範疇，無跨範疇散落）
6. Drive-through（約束 3 / R8 — gate 綠 ≠ 人能用；沒開過車就寫「gate-only verified」）
7. 文檔成長跟隨 runtime（禁止預寫規劃文件；design note 是 extract 不是 pre-write）
8. ADR 未拍板不替使用者選技術（表面化，不默默選）
9. 不捏造工具結果（真的看到 function result 才能說「已完成 / 已驗證」）

### 4. 進行中 / 阻塞 / 🚧 延後項
（不可刪未勾選的 `[ ]`，必須標 🚧 + 理由 + 解封條件 — R6）

### 5. 關鍵決策 / OQ 變更
- 設計決策（非架構級，不需 ADR）
- **未驗證的假設要保留「未驗證」標記** —— 標「設計意圖、尚未跑過」的東西不可寫成「已決定 / 已實作」
- OQ 拍板 → decision-form.md + 對應 progress 條目同步（R4）
- 架構級決定 → docs/14-adr/NNNN-*.md（R5）；ADR 必含**可證偽條件**
- Plan / spec deviation → 對應 changelog（R3）
- 推翻自己先前提案的要寫理由 —— 否則下個 session 會再提一次

### 6. Commit ↔ checklist 對應
| Hash | Subject | 勾了哪一項 |
|---|---|---|

### 7. 下一步
- Next session 第一件事
- 本 phase / CH 剩幾項未勾
- 下一個的狀態（**rolling：當前收尾才寫，禁止預寫**）
- Open items —— **只給指標與計數，不複製內容**：
  BACKLOG.md（N 個 AD / P0 幾個）· decision-form.md（開放 N 項）· STATUS_AUDIT.md（上次審計日）
- 即將觸發的硬 gate —— **解封 ≠ 完成**：M0 DoD 六項還差哪幾項（07-wave1-build-plan.md 建置序列表）

### 8. Rolling Planning 紀律自檢
☐ 沒預寫多個未來 phase 資料夾（只當前 active + 下一個 draft）
☐ 沒跳過 pre-doc 直接 code（R1）
☐ 沒刪除未勾選 `[ ]`（只 `→[x]` 或 🚧 + 理由）
☐ 沒在 retrospective 寫具體未來 phase task
☐ 收尾翻了 `status:` frontmatter（R9 — 只 commit code 不算收尾）
☐ 架構級決定有 ADR（R5）

### 9. 風險 / Register 變更
- RISK_REGISTER.md 新增 / 狀態變更（🟢 mitigated / 🟡 partial / 🔴 active / ⚫ accepted）
- BACKLOG 的 P0 有變動嗎
- 「同一形狀第 N 次發生」→ 依 .claude/rules/README.md 強度階梯，≥3 次應改結構性解法

### 10. 紅旗（若有，第一句就寫）
guardrail / 約束違反的苗頭 · 設計交付物偏離未記錄 · Wave 2/3 功能滲入 Wave 1 ·
未經 ADR 的架構變更 · **重開已拍板的 ADR-0001/0006/0007 或 CLAUDE.md §已確認參數 15 項** ·
「本機綠但 CI 未驗」
```

> **就是這樣 —— 上面代碼塊整段 copy 後送出即可。** 下面都是背景說明，不需要每次貼。

---

## 為何比通用 compact 多 6 項

通用 800 字 compact 不檢查本專案紀律。Wave 1 backbone 期間，下列違反屬**直接 PR revert / phase 重做級**問題，必須每次 compact 強制驗證：

1. **座標 + 軌別**（§0 / §2）—— 三軌工作流的 pre-doc gate（R1）依賴它；不知道走哪一軌就無從檢查
2. **Guardrail 合規**（§3 #2-4）—— entity 隔離失敗**不是一般 bug，是合規事故**；稽核旁路同級
3. **範疇歸屬**（§3 #5）—— 跨範疇散落是 AP-2，也是「模組自行發明 risk / control 私有定義」的入口
4. **Drive-through**（§3 #6）—— gate 綠 ≠ 人能用；本專案整個平台都是治理功能，Potemkin 風險是常態
5. **Rolling 紀律**（§3 #7 / §8）—— 防 AI 在 compact 中順手「規劃未來 phase」或預寫規劃文件
6. **紅旗 surface**（§10）—— 已拍板參數被重新打開 = 白跑一輪選型

## 四類最容易被壓縮壓壞的區分

摘要天然會把「精確區分」壓成「概括」。下列四項若被壓成右欄的樣子，下個 session 會做出錯誤決定 —— 所以它們**分別釘在格式的不同欄位裡**，不另開章節：

| 必須保留 | 被壓壞會變成 | 釘在哪一欄 |
|---|---|---|
| 已拍板不可再議 —— ADR-0001/0006/0007 + `CLAUDE.md` §已確認參數 15 項 | 「技術棧待定」 | §10 紅旗 |
| **skip ≠ clean** —— job `success` 不代表它做了事 | 「掃描通過」 | §2 gate 行 |
| **未驗證的假設要帶標記** | 「已決定 / 已實作」 | §5 關鍵決策 |
| **解封 ≠ 完成** —— 阻斷解除不等於里程碑達成 | 「M0 完成」 | §7 硬 gate 行 |

第 2 項有真實案例：`security-scan.yml` 四個 job 全 `success`，但只有 gitleaks 真的執行 —— SCA / SAST 是 skip。
第 3 項的當前實例：ADR-0001 押在「一個 Prisma client extension 同時滿足 guardrail 4 + 5」，
那是**設計意圖，尚未跑過**，由 ADR-0004 在 W01 spike 驗證。

---

## 何時用 ISMS compact、何時用通用 compact

| 場景 | 用哪個 |
|---|---|
| Wave 1 phase（`W{NN}`）working session | **ISMS compact**（本檔上方代碼塊）|
| Phase 收尾 retro day | ISMS compact + 額外貼該 phase 的 `retrospective.md` |
| Change 軌（`CH-NNN`）session | ISMS compact + 強調 §5（為什麼這樣設計）|
| Bug 軌（`BUG-NNN`）session | ISMS compact + 強調 §5 + 「為什麼測試沒抓到」 |
| 碰資料存取 / 前端頁面的 session | ISMS compact + 強調 §3 #2 / #4 |
| 非本專案工作（ad-hoc explore / 學習 task）| 通用 800 字 compact |
| 緊急 token 壓力（context > 90%）| 通用 800 字 compact（省 700 字，但記下 ISMS 紀律未驗證）|

---

## 比較：通用 compact vs ISMS compact

| 項目 | 通用 compact（800 字）| ISMS compact（本檔）|
|---|---|---|
| 字數 | 800 字 | 1500 字 |
| 座標 + 三軌軌別 | ❌ | ✅ §0 + §2 |
| 範疇歸屬（8 範疇）| ❌ | ✅ §2 + §3 #5 |
| Entity-scoped 隔離抽查 | ❌ | ✅ §3 #2 |
| 稽核軌跡無旁路 | ❌ | ✅ §3 #3 |
| 設計保真度 | ❌ | ✅ §3 #4 |
| Drive-through | ❌ 隱含 | ✅ §3 #6 |
| Gate 逐項實際輸出（skip ≠ pass）| ❌ | ✅ §2 |
| 🚧 延後項追蹤 | ❌ 隱含 | ✅ §4 + R6 提醒 |
| Commit ↔ checklist 對應 | ❌ | ✅ §6（R2）|
| Rolling planning 紀律 | ❌ | ✅ §7 + §8 |
| OQ + ADR + changelog 同步 | ❌ | ✅ §5（R3 + R4 + R5）|
| Risk / BACKLOG 變更 | ❌ | ✅ §9 |
| 紅旗 surface | ❌ | ✅ §10 |

---

## §3 紀律 9 項對應 source

| # | Item | 權威 source |
|---|---|---|
| 1 | R1 pre-doc gate | [`PROCESS.md`](../../01-planning/PROCESS.md) §R1 + [`task-workflow.md`](../../../.claude/rules/task-workflow.md) §Step 0 |
| 2 | Entity-scoped 隔離 | [`CLAUDE.md`](../../../CLAUDE.md) guardrail 4 / 約束 8 + [`multi-tenant-data.md`](../../rules-on-demand/multi-tenant-data.md) |
| 3 | 稽核軌跡無旁路 | [`CLAUDE.md`](../../../CLAUDE.md) guardrail 5 + [`02-core-data-model.md`](../../02-architecture/02-core-data-model.md) |
| 4 | 設計保真度 | [`CLAUDE.md`](../../../CLAUDE.md) 約束 6 + [`mockup-fidelity.md`](../../rules-on-demand/mockup-fidelity.md) |
| 5 | 範疇歸屬 | [`CLAUDE.md`](../../../CLAUDE.md) §Scopes / 約束 1 + [`scope-boundaries.md`](../../rules-on-demand/scope-boundaries.md) |
| 6 | Drive-through | [`verification-discipline.md`](../../../.claude/rules/verification-discipline.md) |
| 7 | 文檔成長跟隨 runtime | [`CLAUDE.md`](../../../CLAUDE.md) §禁止反模式 + [`spike-design-note-gate.md`](../../rules-on-demand/spike-design-note-gate.md) |
| 8 | ADR 未拍板不代選 | [`14-adr/README.md`](../../14-adr/README.md) |
| 9 | 不捏造工具結果 | [`CLAUDE.md`](../../../CLAUDE.md) §Behavior Rules + [`verification-discipline.md`](../../../.claude/rules/verification-discipline.md) §給 AI 助手的具體要求 |

---

## §8 Rolling Planning 紀律對應 R1–R9

per [`PROCESS.md`](../../01-planning/PROCESS.md) §Binding rules：

- **R1**：pre-implementation 文件必須存在（plan / spec / report）—— 否則 STOP
- **R2**：每日 commit 對應 `progress.md` 的 Day-N 條目（`docs(planning):` 類 housekeeping 例外）
- **R3**：plan / spec / report 的 deviation 必須先寫進對應 changelog
- **R4**：Open question 拍板 → 同步更新決策文件 **AND** progress 條目
- **R5**：架構級決定（觸發核心約束的）→ 必寫 ADR
- **R6**：不可刪除未勾選的 `[ ]` —— 只能 `[ ]` → `[x]` 或標 🚧 + 理由
- **R7**：pending / next-candidate 的識別與進度變動 → 同步 `BACKLOG.md`
- **R8**：user-facing 功能標 done 前必須做過 drive-through
- **R9**：收尾必須翻 `status:` frontmatter —— **只 commit code 不算收尾**

---

## §10 紅旗信號（ISMS-specific watch list）

任何 compact 偵測到以下任一信號，**第一句就寫紅旗**：

- **「順手把合規 / 事件 / 供應商模組做埋」** → Wave 2/3 功能滲入 Wave 1（已確認參數 #5）
- **「這個模組自己定義一份 risk / control / owner 就好」** → guardrail 3 違反，核心資料模型被繞過
- **「先在應用層 filter `entity_id`，RLS 之後再補」** → guardrail 4 / 約束 8 違反
- **「查不到就回 403」** → 等於確認 ID 猜對了（約束 8）
- **「這條寫入先不進稽核日誌」** → guardrail 5 違反
- **「把 mockup 的 CSS 翻成 Tailwind utility / 轉色彩空間」** → 約束 6 紅線
- **「憑證 / token / 個資放 localStorage」、「種子資料用真實個資或有效卡號」** → guardrail 7 兩條最易誤觸
- **「換 LLM provider 要改業務代碼」** → 約束 7 違反；本專案這是**主權槓桿**不是潔癖
- **「重新評估後端框架 / 雲 / IdP」** → ADR-0001 / 0006 / 0007 已採納，重開需要新證據不是新偏好
- **「先寫一批規劃文件再實作」** → 文檔成長必須跟隨已驗證 runtime
- **「把 phase 紀錄寫進 CLAUDE.md / MEMORY.md」** → 導航檔膨脹頭號原因；CLAUDE.md 已用 95%+ byte 預算
- **「本機綠 / gate 綠 = 能用」** → 約束 3；沒開過車就只能寫「gate-only verified」
- **「`git reset --hard` / `git push --force` / `--no-verify` 未經授權」** → Developer Preferences 違反

---

## 維護

- 與 [`session-start.template.md`](./session-start.template.md) 配套使用（一個 session 開頭、一個 session 結尾）
- **本檔是「實際」，`compact-session.template.md` 是「模版」** —— 模版保持通用不動，
  本檔才隨專案演進（見 [`12-ai-assistant/README.md`](../README.md)）
- `CLAUDE.md` 大改（9 guardrails / 8 約束 / 8 範疇 / 15 項已確認參數）時，§3 + §10 對應更新
- `PROCESS.md` 大改（加軌別 / 改 R1–R9）時，§3 #1 + §8 對應更新
- **`run_all.py` 加 detector 時，§2 的 `N/6` 分母要一起改** —— 這是本檔唯一的機械耦合
- M0 完成、monorepo 骨架就緒後，§2 的「skip 不是 pass」警語改為實際 gate 名稱
- Phase 切換（W01 → W02 → …）時不需改本檔（內容是 Wave 1 通用），**除非** §7 出現新的硬 gate
- Wave 1 完成後退役 → 改用 Wave 2 對應 compact

---

**Last Updated**：2026-08-08（初版）
**Maintainer**：使用者 + AI 助手共同維護
**File location**：`docs/12-ai-assistant/01-prompts/compact-session.md`
**Companion**：`session-start.md`（每個新 session 開頭用；目前仍是 `.template` 未填）

---

## Update history

| Date | 軌別 / Phase | Updates |
|---|---|---|
| 2026-08-08 | 無 active phase（docs housekeeping）| 初版。格式取自 sibling 專案 `02-compact-session.md`（用法／適用範圍 → ✂️複製貼上區 → 設計說明），內容全部換成本專案的：三軌 · 8 範疇 · 9 guardrails · R1–R9 · Wave 1 邊界。四類壓縮失真釘進 §2 / §5 / §7 / §10 既有欄位，不另開章節 |
