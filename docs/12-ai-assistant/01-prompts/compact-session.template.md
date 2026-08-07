# ISMS Compact — Compact Summary Prompt（每個 session `/compact` 之前用）

> **用法**：直接 copy「✂️ 複製貼上區」整段送出即可。下方「設計說明」是給維護者看的背景，**不需要每次貼**。
>
> **適用範圍**：APAC ISMS Governance Platform 的任何 session —— Wave 1 backbone（M0–M9）、
> 三軌工作（Phase `W{NN}` / Change `CH-NNN` / Bug `BUG-NNN`）、以及架構決策討論。
> 非本專案工作（ad-hoc 探索 / 一次性文件）用通用 compact 即可。

---

## ✂️ 複製貼上區（直接送出，毋須修改）

```
/compact

## ISMS Compact 格式（≤1600 字，繁體中文）

### ⛔ 0. 絕對不可壓縮的四類

摘要天然會把「精確區分」壓成「概括」。下列每一項若被壓成右欄的樣子，下個 session 會做出錯誤決定：

| 必須保留 | 被壓壞會變成 | 後果 |
|---|---|---|
| 已拍板不可再議 —— ADR-0001/0006/0007 + CLAUDE.md §已確認參數 15 項 | 「技術棧待定」 | 重跑一輪選型；那 15 項的存在目的就是防再議 |
| **skip ≠ clean** —— job success 不代表它做了事 | 「掃描通過」 | 產生錯誤的安全感（真實案例：security-scan 四個 job 全 success，只有 gitleaks 真的跑） |
| **未驗證的假設要帶標記** —— 標「設計意圖，未跑過」的東西 | 「已決定/已實作」 | 假設失效時沒人知道要回頭（例：ADR-0001 押在 Prisma extension 同時滿足 guardrail 4+5，由 ADR-0004 驗證） |
| **解封 ≠ 完成** —— 阻斷解除不等於里程碑達成 | 「M0 完成」 | 跳過未做的 DoD 項目 |

### 1. 座標
Phase `W{NN}-{slug}` / Day N（或「無 active phase —— 獨立 CH-NNN / BUG-NNN」）
Branch / working tree（clean / dirty）/ 開著的 PR 數

### 2. 本次主要任務（一句話）

### 3. 已完成（按三軌流程順序）
- 走了哪一軌 + pre-doc 路徑（plan+checklist / spec / report）
- 檔案變更：新增 / 修改 / 刪除，**每個標明歸屬哪個範疇**（core-model / entity-scope /
  identity / workflow / audit-trail / api / modules / ui）
- 文件：progress / retrospective / checklist 勾了幾項 / BACKLOG 同步 / decision-form 同步
- **Gate 逐項實際輸出，不是「都過了」**：
  `run_all` N/6 · actionlint · detector tests · gitleaks（若跑過）
  ⚠️ monorepo 骨架未建立前，lint / type-check / test / build 是 **skip 不是 pass**
- Commits：hash + subject（每個對應 1 個 checklist 項 — R2）

### 4. 紀律 10 項自檢（每項 ✅/⚠️/❌/N/A）
1. R1 pre-doc gate（分類 → 文件 → 才 code）
2. **Entity-scoped 隔離**（guardrail 4 / 約束 8 — RLS 優先於應用層；查無資料回 404 不回 403）
3. **稽核軌跡無旁路**（guardrail 5 — 每個狀態變更都寫 append-only 日誌）
4. **設計保真度**（約束 6 — CSS 是複製不是重寫；不對齊就 STOP and ask）
5. 範疇歸屬明確（約束 1 — 每個檔案歸屬 1 個範疇，無跨範疇散落）
6. **Drive-through**（約束 3 / R8 — gate 綠 ≠ 人能用；沒開過車就寫「gate-only verified」）
7. **文檔成長跟隨 runtime**（禁止預寫規劃文件；design note 是 extract 不是 pre-write）
8. 導航檔 minimal touch（phase 紀錄**不進** CLAUDE.md / MEMORY.md）
9. **ADR 未拍板不替使用者選技術**（表面化，不默默選）
10. 不捏造工具結果（只有真的看到 function result 才能說「已完成 / 已驗證」）

### 5. 進行中 / 阻塞 / 🚧 延後項
（不可刪未勾選的 `[ ]`，必須標 🚧 + 理由 + 解封條件 — R6）

### 6. 關鍵決策 / OQ 變更
- 設計決策（非架構級，不需 ADR）
- OQ 拍板 → decision-form.md + 對應 progress 條目同步（R4）
- 架構級決定 → `docs/14-adr/NNNN-*.md`（R5）；ADR 必含**可證偽條件**
- Plan / spec deviation → 對應 changelog（R3）
- **推翻自己先前提案的要寫理由** —— 否則下個 session 會再提一次

### 7. Commit ↔ checklist 對應
| Hash | Subject | 勾了哪一項 |
|---|---|---|

### 8. 下一步
- Next session 第一件事
- 本 phase / CH 剩幾項未勾
- 下一個的狀態（**rolling：當前收尾才寫，禁止預寫**）
- Open items —— **只給指標與計數，不複製內容**：
  `BACKLOG.md`（N 個 AD / P0 幾個）· `decision-form.md`（開放 N 項）· `STATUS_AUDIT.md`（上次審計日）
- 即將觸發的硬 gate：M0 DoD 六項還差哪幾項（`07:31`）

### 9. Rolling Planning 紀律自檢
☐ 沒預寫多個未來 phase 資料夾（只當前 active + 下一個 draft）
☐ 沒跳過 pre-doc 直接 code（R1）
☐ 沒刪除未勾選 `[ ]`（只 `→[x]` 或 🚧 + 理由）
☐ 沒在 retrospective 寫具體未來 phase task
☐ 收尾翻了 `status:` frontmatter（R9 — 只 commit code 不算收尾）
☐ 架構級決定有 ADR（R5）

### 10. 風險 / Register 變更
- RISK_REGISTER.md 有新增 / 狀態變更嗎
- BACKLOG 的 P0 有變動嗎（目前 4 個）
- 有沒有「同一形狀第 N 次發生」→ 依 `.claude/rules/README.md` 強度階梯，≥3 次應改結構性解法

### 11. 紅旗（若有，第一句就寫）
任何 guardrail / 約束違反的苗頭、設計交付物偏離未記錄、Wave 2/3 功能滲入 Wave 1、
未經 ADR 的架構變更、或「本機綠但 CI 未驗」→ 寫在最前面再解釋
```

> **就是這樣 —— 上面代碼塊整段 copy 後送出即可。** 以下都是背景說明，不需要每次貼。

---

## 為何比通用 compact 多這幾項

通用 compact 不檢查本專案特有的紀律。這是一套**管理安全與風險的平台**，
guardrail 1 要求它自己必須是典範，所以下列違反屬**直接 revert / 重做級**：

| # | 項目 | 為什麼非查不可 |
|---|---|---|
| §0 | 四類不可壓縮 | 這四類是本專案實際踩過的壓縮失真，每一類都導致過錯誤判斷 |
| §4 #2 | Entity-scoped 隔離 | **隔離失敗不是一般 bug，是合規事故**（CLAUDE.md 約束 8）|
| §4 #3 | 稽核軌跡無旁路 | 稽核人員必須能信任它；有旁路等於整條鏈失效（guardrail 5）|
| §4 #4 | 設計保真度 | 有高保真交付物，翻譯 CSS 成 utility 必然 drift（約束 6）|
| §4 #6 | Drive-through | gate 全綠只證明零件對。真實案例：5 個 Potemkin 通過每一項 gate |
| §4 #7 | 文檔跟隨 runtime | 來源專案 22 phase 產 21 份規劃文件，最後量出 runtime 對齊度 **40%** |
| §9 | Rolling planning | 防 AI 在 compact 中順手「規劃未來 phase」 |
| §11 | 紅旗 | Wave 邊界與 guardrail 的滲入要在第一句浮現 |

---

## §4 紀律 10 項對應的權威 source

| # | 項目 | 權威 |
|---|---|---|
| 1 | R1 pre-doc gate | [`PROCESS.md`](../../01-planning/PROCESS.md) §1.4 · `.claude/rules/task-workflow.md` |
| 2 | Entity-scoped 隔離 | `CLAUDE.md` guardrail 4 + 約束 8 · `docs/rules-on-demand/multi-tenant-data.md` |
| 3 | 稽核軌跡 | `CLAUDE.md` guardrail 5 · [`05-platform-foundation-services.md`](../../02-architecture/05-platform-foundation-services.md) |
| 4 | 設計保真度 | `CLAUDE.md` 約束 6 · `docs/rules-on-demand/mockup-fidelity.md` · [`15-design-alignment.md`](../../02-architecture/15-design-alignment.md) |
| 5 | 範疇歸屬 | `CLAUDE.md` §Scopes + 約束 1 · `docs/rules-on-demand/scope-boundaries.md` |
| 6 | Drive-through | `.claude/rules/verification-discipline.md` · `CLAUDE.md` 約束 3 |
| 7 | 文檔跟隨 runtime | `memory/feedback_doc_growth_follows_runtime.md` · `CLAUDE.md` §禁止反模式 |
| 8 | 導航檔 minimal touch | `.claude/rules/task-workflow.md` §Phase Closeout |
| 9 | ADR 紀律 | [`docs/14-adr/README.md`](../../14-adr/README.md) · [`decision-form.md`](../../decision-form.md) |
| 10 | 不捏造結果 | `CLAUDE.md` §Behavior Rules · `.claude/rules/verification-discipline.md` §證據層變體 |

---

## §11 紅旗信號（本專案 watch list）

偵測到以下任一，**第一句就寫紅旗**：

**資料與稽核**
- 「query 沒過濾 `entity_id`」/「只靠應用層檢查就好」→ guardrail 4 違反
- 「查無資料回 403」→ 等於確認 ID 猜對了（約束 8）
- 「這個寫入先不記 audit log」→ guardrail 5 違反
- 「跨區直接查資料庫」→ ADR-0006 的拓撲要求跨區走 API

**設計交付物**
- 「把 mockup CSS 翻成 Tailwind utility」→ 約束 6 紅線（必然就近取整）
- 「這個 widget 後端還沒好，先拿掉」→ 後端權威只管資料契約，不管視覺是否存在
- 「用 shadcn 預設樣式取代 mockup」→ primitive 只作 a11y 外殼

**範圍與序列**
- 「順手把合規 / 事件 / TPRM 模組做埋」→ Wave 2/3 滲入 Wave 1（已確認參數 5）
- 「先寫幾份設計文件再實作」→ 預寫反模式；要先 thin spike → retro → extract
- 「ADR 還沒定，我先選一個往下做」→ 表面化，不默默選

**安全**
- 「token / 個資放 localStorage」→ guardrail 7 明列的兩條最易誤犯之一
- 「種子資料用真實卡號 / 真實個資」→ 同上（既有掃描已找到 24 個 checksum 有效卡號）
- 「TLS 憑證 / 安全標頭 / 管理埠沿用平台預設」→ guardrail 7 明訂不得沿用

**驗證**
- 「gate 全綠所以可以標 done」→ 沒 drive-through 就寫「gate-only verified」
- 「四個 job 都 success」→ **先確認它們是跑了還是 skip**
- 「本機跑過了」→ `docs/reference/` 與 `reference/` 不在版控中，本機與 CI 會不同

---

## 本專案特有的環境陷阱（compact 時值得帶一句）

| 陷阱 | 症狀 | 驗證方式 |
|---|---|---|
| `docs/reference/` · `reference/` **刻意不在版控** | 本機 `run_all` 5/5 而 CI 4/5 | `Rename-Item docs\reference reference__ci_sim` 再跑，之後還原 |
| `CLAUDE.md` byte 預算 | 已用 **95.8%**（30,000 上限）| 下次導航更新前先看剩餘空間；撞牆時**移內容到 on-demand，不是調高預算** |
| monorepo 骨架未建立 | CI 的 lint/test/build 步驟印 `::notice::…skipped until W01 M0` | 那是 skip 不是 pass |
| corp-proxy 擋 `pip install` | wheel 下載成 0 bytes（SHA 對不上）| 測試用標準庫；需要外部工具走 docker 或 CI |

---

## 何時用本檔、何時用通用 compact

| 場景 | 用哪個 |
|---|---|
| Phase 軌 working session | **本檔** |
| Phase 收尾 retro day | 本檔 + 額外貼該 phase 的 retrospective |
| Change 軌（CH-NNN）| 本檔 + 強調 §4 #1（軌別分類）+ §6（決策理由是 CH 的核心價值）|
| Bug 軌（BUG-NNN）| 本檔 + 強調「為什麼測試沒抓到」+「怎麼防止再發生」|
| 架構決策討論 | 本檔 + 強調 §0 第一列（已拍板不可再議）+ §4 #9 |
| 前端頁面移植 | 本檔 + 強調 §4 #4 + §11 設計交付物段 |
| 非本專案工作 | 通用 compact |
| 緊急 token 壓力（context > 90%）| 通用 compact，但**記下本專案紀律未驗證** |

---

## 維護

- 與 [`session-start.template.md`](./session-start.template.md) 配套（一個開頭、一個結尾）
- `CLAUDE.md` 大改（guardrails / 已確認參數 / 核心約束 / §Scopes）→ §4 + §11 對應更新
- `PROCESS.md` 大改（加軌別 / 改 R1-R9）→ §4 #1 + §9 對應更新
- **新 detector 加進 `run_all.py`** → §3 的 `run_all N/6` 分母要改
- **ADR 新增或被取代** → §0 第一列的清單要更新
- M0–M9 里程碑推進 → §8 的硬 gate 那行對應更新
- 三軌切換不需要改本檔（內容是專案通用）

---

**Last Updated**：2026-08-07（初版 —— 依 `ai-enterprise-knowledge-solution-project` 的
`02-compact-session.md` 結構，內容全數換成本專案的 guardrails / 約束 / 三軌 / 範疇 /
Wave 邊界；§0 四類不可壓縮與 §環境陷阱 取自 CH-005~007 期間的實際失真案例）
**Maintainer**：專案擁有者 + AI 助手共同維護
**File location**：`docs/12-ai-assistant/01-prompts/compact-session.template.md`
**Companion**：[`session-start.template.md`](./session-start.template.md)（每個新 session 開頭用）

---

## Update history

| Date | 情境 | Updates |
|---|---|---|
| 2026-08-07 | CH-007 之後 | 初版。原本是 34 行的通用骨架；改為「複製貼上區 + 設計說明」雙層結構。新增 §0 四類不可壓縮（來自 CH-005~007 的真實壓縮失真）、§4 十項紀律自檢並對應權威 source、§11 本專案紅旗 watch list、§環境陷阱表（`docs/reference/` 未追蹤 · CLAUDE.md 95.8% 預算 · 骨架未建的 skip · corp-proxy 擋 pip）|
