# Day-0 Plan-vs-Repo Verify — 完整程序

**Purpose**: 三-prong plan-vs-repo grep 驗證的完整程序 —— prong 步驟、drift-class grep 對照表、判準。
Trigger + 摘要在 `.claude/rules/task-workflow.md` §Step 2.5（always-loaded）；本檔在每個 Day 0 被 Read。

**Category / Scope**: Development Process / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

**Trigger（什麼時候 Read）**: 每個 phase 的 Day 0 —— plan/checklist 起草後、Day 1 code 開始前。

**回寫位置**: drift findings → `progress.md` Day 0 條目。

---

## 為什麼這是投報率最高的一條規則

從記憶 + 對話上下文起草的 plan **必然偏離真實 repo**。不是因為粗心，而是因為：

- Class 名字在 phase 之間被改過
- 表名 / 欄位在別的 PR 裡動過
- 測試 fixture 路徑因為 conftest 重構而位移
- Service / method 簽名在無關的 PR 裡演化了
- **內容漂移**：檔案存在，但它的**內容**跟 plan 的宣稱不一樣 —— 這是路徑驗證抓不到的

實測 ROI 區間：**4-8×** 到 **20-60×**。最戲劇性的一次：Day-0 內容 grep 發現
「需要完整設計 + 接線（10-12 hr）」的假設是錯的 —— ABC 早就實作了、也被主流程呼叫了，
只有一個屬性是死的。範圍當場縮到「純接線 5-6 hr」。

**路徑驗證單獨做是不夠的** —— 所有被引用的檔案都存在，內容落差要靠 Prong 2 才抓得到。

---

## Prong 1 — Path Verify

plan §File Change List / §Technical Spec 提到的**每個檔案路徑** → `Glob` 或 `ls` 確認
存在 / 不存在是否如預期。

| 檢查對象 | 期望 |
|---------|------|
| 新檔（要建立的）| Glob 回傳 0 筆 |
| 既有檔（要修改的）| Glob 回傳 1 筆 |
| DB models / migrations | 對應目錄裡真的有 |
| 測試 fixture 路徑 | `conftest` / fixture 檔真的在那 |
| Import / re-export | plan 若宣稱某符號被公開匯出，確認 package init |
| 公開介面方法 | 讀實際的 ABC / interface 檔確認簽名 |
| **測試基礎設施** | pytest marker / fixture / e2e spec 若被 plan 引用，**也要 Glob 驗證** |

> **測試基礎設施那條特別重要**：曾有一個幽靈測試檔 + 幽靈 marker 在 **3 份 plan 之間傳播**，
> 直到某次 Prong-1 掃描才發現它們**從來沒存在過**。plan 引用了它，下一份 plan 抄了這個引用，
> 沒有人去 Glob 過。

---

## Prong 2 — Content Verify ⭐

plan 對現有程式碼的**每個事實斷言** → **Grep** 那個符號 / pattern 在真實原始碼裡。

**路徑驗證不足以取代這一步**：檔案存在，但它的 body 可能已經跟 plan 的宣稱分歧了。

### Drift class 對照表

| Drift class | Plan 的宣稱長這樣 | Grep 驗證方式 |
|-------------|------------------|--------------|
| **宣稱死了但其實活著（或反之）** | 「X 是死狀態」/「Y 屬性沒人用」 | grep 該屬性 → 數 call site vs assignment（≥1 assign / 0 call = 確認死）|
| **宣稱有但其實沒 import** | 「Z 有公開匯出」/「consumer 用了 A」 | grep import 語句 → 確認真有 import site |
| **宣稱的名字已經被改過** | 「B 改名成 C」/「D 繼承 E」 | grep 新舊兩個名字 + 繼承宣告 |
| **宣稱存在的介面其實不存在** | 「擴充 ABC F」/「加一個 G enum case」 | grep `class F` / `class G` → 確認**真的存在**才能規劃擴充 |
| **單位 / 型別錯誤** | 「用 backoff_seconds」/「存成 float」 | grep 欄位宣告 + 讀前後 1-3 行 → 確認單位 / 型別 |
| **靜默超出 baseline 約束** | 「重構已完成」/「+N 個測試」/「bundle 沒變大」 | 用 `git diff` 數增量，對照 lint 裡寫死的 baseline 常數。**委派給 agent 的重構特別容易中** —— agent 通常把視覺/程式碼改對了，卻**靜默超出**被 baseline 約束的指標 |
| **陳舊的 docstring / 註解** | docstring 說「X 用 Y」/「TODO 下個 phase 移除 Z」 | 找 docstring / 註解區塊，再交叉 grep 它引用的符號。**註解也算 code**（Karpathy §3）—— 引用已移除的東西就是誤導人的 orphan claim |
| **儲存路徑猜錯** | 「設定存在 `X.config` 欄位」/「有一張 `<Resource>Override` 表」 | grep 實際的儲存架構（專用表 vs JSONB on 既有表 vs 檔案）**在 plan 定案寫入結構之前** |
| **正典 service 不存在** | 「擴充 `XService.set_override()`」 | grep `class .*XService` + setter 方法。**兩個方向都有用**：存在 → 用正典路徑（審計鏈自動）；不存在 → 直接寫 + 手動審計 |
| **巢狀結構猜錯** | 「存成 `{a, b, c}`」/「設定項是型別化物件」 | plan 若斷言某個 blob（JSON / dict）的**巢狀形狀**，**讀實際的 model body** —— 不要從 key 名字推論 |
| **codegen 只抄了欄位沒抄外層** | 「從 Python 型別產生 TS 型別」 | 從既有 producer 產生 consumer 型別時，捕捉**結構形狀（envelope 巢狀）**，不只欄位名。先讀 producer / serializer 的 body |
| **宣稱來自衍生文件而非來源檔** | 「稽核報告說 X 是 Y」/「盤點表列了 N 個」 | 衍生文件（稽核報告 / parity verdict / 盤點表）是**人手抄**的，錯誤會一路往前傳且沒人挑戰。**grep 來源檔本身**對照該聲明；有出入 → 衍生文件錯，更新它。前端見 `mockup-fidelity.md` §AuditDocSync |
| **要「填滿每一個 X」但 X 沒有生產者** | 「包住每一個 span」/「填滿全部 N 個 tab」 | 對「填滿/包住/instrument 每一個 X」型的範圍，grep **每一個 X 是否真的有活的生產者 / call site**。沒有的話那個槽位就是 AP-3 Potemkin |

---

## Prong 2.5 — Child Component Tree Depth（前端頁面 phase）

**適用**：前端頁面重構，且 **entry 元件**與它 import 的**子元件**可能帶有**不同年代**的樣式 / 結構。

Prong 2 只掃 entry 元件那一個檔案；這個 sub-prong 把 grep 深度延伸到子元件樹。

**為什麼重要**：真實案例 —— entry 元件已遷移到新的設計系統原語（shell 層看起來對了），
但它 import 的 4 個子元件仍保留 3 個不同 phase 年代的舊 pattern。
Day-0 只查了 entry 元件 → 子元件的漂移到 Day 1 寫 code 才浮現 → phase 中途範圍爆炸。

**做法（depth-2 掃描）**：

1. **列出子元件樹**：grep entry 檔的 import 語句 → 得到子元件路徑清單
2. **逐個子檔跑 anti-pattern grep**：把 plan 相關的 pattern grep 跑在**每一個**子元件上
   - 舊設計系統的 token 殘留
   - 缺少 escape 註解的 inline style
   - 多餘的 wrapper / padding artifact
   - 結構性分歧（tab shell vs 單體結構）

**遞迴深度**：通常 N=2（entry → 直接子元件）。只有巢狀 feature-area import 才到 N=3。

**成本 / 效益**：每頁 5-10 分鐘；抓到的是「Day 1 才發現的範圍爆炸」（每次 1-5 hr）。

**何時跳過**：非前端、全新建置（沒有既有樹可審）、單檔頁面。

---

## Prong 3 — Schema Verify（動 DB 時）

**適用**：phase 引入新 DB 表 / migration / ORM model / schema 欄位。

Prong 1 確認檔案存在、Prong 2 確認程式碼 pattern，**兩者都抓不到欄位級別的 schema 漂移**。

| 檢查 | 做法 |
|------|------|
| 新表欄位 | grep model / migration → 列出每個欄位 + 型別 + nullable |
| 跨表 FK | grep FK 宣告 → 確認被引用的 table.column 存在且型別相符 |
| Migration head | 列出 migration 目錄排序 → 確認下一個編號沒被佔用 |
| 租戶隔離 / RLS | 若專案有多租戶規則，grep 該表的 policy |
| 欄位漂移 | 重讀 plan 的欄位清單；逐個 grep model 確認名稱 + 型別 + nullable + default **完全相符** |

### Schema drift class

| Drift class | Plan 的宣稱 | 驗證方式 |
|-------------|------------|---------|
| **宣稱有但沒有的欄位** | 「表 X 有欄位 Y」 | grep 欄位名 → 0 筆 = 漂移 |
| **型別錯誤** | 「欄位 Z 是 VARCHAR(64)」 | grep + 讀該行 → 型別不符 |
| **表被改名** | FK 指向 `table_b` | grep 實際表名 |
| **Migration 編號被佔用** | 「新增 0014_xxx」 | 列目錄 → 0014 已存在 → 用 0015 |
| **實體欄位 vs ORM 別名** | 「raw SQL `UPDATE t SET meta ...`」 | ORM 屬性若是**別名**（`mapped_column("physical_name", ...)`），raw SQL **必須用實體欄位名**。grep 所有帶字串參數的 column 宣告 |

---

## 記錄 drift findings

在 `progress.md` Day 0 條目的 "Drift findings" 標題下：

```markdown
## Day 0 — Drift Findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| D1 | plan 假設 `XService.set_override()` 存在；grep 顯示無此 service | 改用直接寫入 + 手動審計（§Risks 新增一行）| 🔴 需改 plan |
| D2 | `orders.status` 欄位型別是 enum 不是 varchar | migration 寫法要改 | 🟡 小調整 |
| D3 | plan 引用的 `test_helpers.py` 不存在 | 要先建，+30 min | 🟡 小調整 |
| D-baselines | test 142 · lint 0 · build OK | 基線已記錄 | ✅ |
```

**格式**：`D{N}` ID + Finding + Implication

**鐵律**：**不要默默改 plan §Technical Spec** —— 把 finding 加到 **§Risks**。
這保留了「原本計畫什麼 vs 現實逼你改成什麼」的審計軌跡。
默默改寫 plan 等於銷毀證據。

---

## Go / No-Go 判準

| 範圍變動 | 行動 |
|---------|------|
| **≤ 20%** | 繼續 Day 1，風險記入 §Risks |
| **20-50%** | 修訂 plan §Acceptance + §Workload，**跟使用者再確認** |
| **> 50%** | **中止 phase**，用現實基線重寫 plan |

---

## 也記下基線

Day 0 順手記錄當前基線數字，closeout 時才有得比：

```
D-baselines — test <N> · lint <N> · type errors <N> · build <status> · coverage <N>%
```

沒有基線就無法回答「我的改動加了幾個測試 / 有沒有讓 lint 變差」。

---

## 正確 vs 錯誤流程

✅ **正確**：
```
Plan 起草 → Checklist 起草 → Day-0 三-prong grep + drift 記錄 → Day 1 code
```

❌ **錯誤（只做路徑驗證）**：
```
Plan → Prong 1 only → Day 1 code → 寫到一半發現內容落差 → 返工
```

❌ **錯誤（完全跳過）**：
```
Plan → Day 1 code → 發現 plan 假設的東西不存在 → 重寫 plan + checklist + 已 commit 的 code
```
