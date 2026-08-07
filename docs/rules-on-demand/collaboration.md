# 多人協作 — Review / 交接 / Onboarding

**Purpose**: Code review 協定、任務交接、新人上手、分工邊界，以及 AI 輔助團隊的特有問題。

**Category / Scope**: Development Process / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

**Trigger（什麼時候 Read）**: 要 review 別人的 PR / 要把工作交接出去 / 有新人加入 / 兩個人的工作開始互相踩到。

> ⚠️ **來源標示**：本檔**多數內容是設計提案，不是已驗證抽取**。
> 來源專案是單人開發（`review_count=0`），沒有多人協作的實踐基礎。
> 這裡的規則是從模板已驗證的紀律（single-source / 可追溯 / drive-through / 反 Potemkin）
> 推導出來的。**請在你的團隊實際跑 2-3 個 phase 後依實情修正本檔。**
>
> 唯一有實踐基礎的部分：§Onboarding 的閱讀路徑（抽自來源專案的 onboarding prompt）。

---

## 先決定：你的團隊需要多少 review

| 團隊 | Review 政策 | 理由 |
|------|------------|------|
| **1 人** | `review_count=0` + CI required | 沒有 reviewer。強制 self-review checklist + CI 當守門 |
| **2-3 人** | 1 個 approve | 夠抓大問題，不會變成瓶頸 |
| **4+ 人 / 有合規要求** | 1-2 approve + CODEOWNERS | 關鍵範疇要對應的人看 |

**單人專案不要假裝有 review** —— 那只會讓你養成 rubber-stamp 自己 PR 的習慣。
改成：**PR 開著、睡一晚、隔天用 reviewer 的心態重讀一次**。時間差比人數更能製造距離感。

---

## Code Review 協定

### Reviewer 該看什麼（依重要性排序）

1. **這個改動真的解決了它宣稱的問題嗎** —— 讀 PR 描述的 Problem，再看 diff
2. **有沒有 Potemkin** —— 控件有 handler 嗎？資料是真的嗎？結果會渲染嗎？
   （PR 的 drive-through 證據呢？）
3. **測試有沒有測到重點** —— 特別是**負面測試**（關掉會壞什麼）
4. **範疇邊界** —— 有沒有跨範疇亂 import、有沒有平行定義契約
5. **可追溯性** —— 有對應的 checklist 條目 / change record 嗎？

### Reviewer 不該做的

- ❌ **重寫別人的實作方式** —— 除非它真的錯了。「我會這樣寫」不是 review comment
- ❌ **爭論已經有規則的事** —— 格式 / 命名 / import 順序交給 lint，不要用人力 review
- ❌ **無限擴大範圍** —— 「順便把這個也改一下」→ 開新 issue，不要塞進這個 PR
- ❌ **只留 nit 不表態** —— 明確說 approve / request changes，不要讓 PR 懸著

### Comment 的形式

分級標示，讓作者知道哪些必須處理：

```
🔴 blocking  — 必須改，否則不能 merge
🟡 consider  — 建議改，作者可以說明理由後保留
🟢 nit       — 純偏好，作者可忽略
❓ question  — 我不確定，請說明
```

**沒有標示的 comment 預設是 🟡**。

### 回應時效

訂一個團隊共識並寫在這裡（建議：**1 個工作日內首次回應**）。

超過時效的 PR 會發生兩件壞事：作者 context 已經忘光了、分支開始腐化。

### 作者的責任

開 PR 前**自己先 review 一遍 diff**。你會發現：debug print、註解掉的程式碼、
不小心 commit 的檔案、跟這次無關的改動。

**這些不該由 reviewer 幫你抓。**

---

## 任務交接（Handoff）

**什麼時候需要**：請假 / 換手 / 中途調度 / phase 沒做完換人接。

### 交接文件

模板：`docs/12-ai-assistant/_TEMPLATE-handoff.md`
位置：`docs/01-planning/W{NN}-{slug}/handoff-YYYYMMDD.md`

**核心判準**：

> 一個**完全沒有你這段記憶**的人，讀完能不能直接接著做？

### 交接必須包含

| 項目 | 為什麼 |
|------|-------|
| **當前狀態** | 做到哪、哪些 checklist 已勾 |
| **下一步** | 具體到可以直接動手（不是「繼續做 X」）|
| **未 commit 的工作** | 在哪個分支、有沒有 stash、能不能直接跑 |
| **環境狀態** ⭐ | 有沒有 migration 沒套用、有沒有暫時性的 hack、dev server 要怎麼起 |
| **走過的死路** ⭐ | 我試過 A 和 B 都不行，原因是… |
| **待決事項** | 需要誰拍板 |
| **踩到的坑** | 那些「不寫下來對方一定會再踩一次」的 |

**「走過的死路」是交接文件最有價值也最常被省略的部分。**
沒有它，接手的人會把你花了兩天排除的選項再試一次。

### 交接不只是寫文件

- [ ] 寫交接文件
- [ ] **把未 commit 的工作 commit 或 stash 並說明**（不要留在工作區）
- [ ] 更新 checklist（已完成的勾起來、被擋的標 `🚧 阻塞`）
- [ ] **口頭/訊息走一遍**（15 分鐘，讓對方問問題）—— 文件補不上「為什麼」的直覺
- [ ] 交接後 3 天內保持可聯絡

---

## 新人 Onboarding

> 這一節的閱讀路徑抽自來源專案的實踐。

### Day 1 — 能跑起來

- [ ] 讀 `CLAUDE.md` §Core Vision（**這個專案在做什麼、為什麼**）
- [ ] 讀 `docs/INFORMATION-FLOW.md`（**開發時讀什麼、產生什麼、更新什麼**）
- [ ] 環境設置：跟著 README / setup 文件把專案跑起來
- [ ] 跑一次完整 gate：`<lint 指令>` / `<test 指令>` / `python scripts/lint/run_all.py`
- [ ] **實際開起來用一次**（drive-through 的第一次體驗）

**Day 1 的成功判準**：能在本機跑起來並看到它運作。**不是**讀完所有文件。

### Day 2-3 — 理解結構

- [ ] 讀 `docs/01-planning/README.md` + 2-3 份最相關的核心設計文件
- [ ] 讀 `.claude/rules/`（4 條 always-loaded）
- [ ] 讀 `MEMORY.md` 的 §Principles（跨專案教訓）
- [ ] 挑 3 個最近的 CHANGE record 讀 —— **這比讀設計文件更快理解這個團隊怎麼想事情**
- [ ] 做一個**小改動**並走完完整流程（`/fix` 或 `/change`）

### Week 2 — 進入節奏

- [ ] 讀 `docs/14-adr/`（ADR）—— 知道哪些路是已經決定不走的
- [ ] 參與一次 code review（當 reviewer）
- [ ] 領一個完整的 phase slice

### Onboarding 的反模式

- ❌ **叫新人先讀完所有文件** —— 沒有上下文的閱讀留不下東西
- ❌ **第一個任務給大的** —— 第一個任務的目的是**走通流程**，不是產出
- ❌ **沒人負責** —— 指定一個 buddy，前兩週的問題都可以問他

---

## 分工邊界（避免互相踩到）

### 按範疇分，不按檔案分

```
✅ 「A 負責 domain + api 的訂單相關」
❌ 「A 改 order.py，B 改 pricing.py」  ← 需求一變就重疊
```

範疇邊界（`scope-boundaries.md`）同時也是**分工邊界**。這是它的第二個用途。

### 一定會共用的東西

契約層（`_contracts/`）、共用 util、設定檔 —— 這些必然多人會動。

**協定**：

- 改契約層前**先講**（在 channel 說一聲，或先開 issue）
- 契約變更的 PR 要 **@ 所有受影響範疇的人**
- 契約層的 PR 優先 review（它會擋住別人）

### 長命分支是衝突的來源

- 分支活過 3 天就開始危險
- **每天 rebase / merge 主分支**
- 大功能拆成多個可獨立 merge 的 slice（這也是 phase 切片的紀律）

---

## ⭐ AI 輔助團隊的特有問題

> 多人各自使用 AI 助手時，會出現單人開發不會遇到的問題。
> 這一節是這套模板最需要被實踐檢驗的部分。

### 問題 1：一致性漂移加速

每個人的 AI 依據**自己 session 的上下文**產生程式碼。同一個模式在三個人手上會長出三個變體，
而且每個看起來都合理。

**對策**：

- **規則檔是共用的真相** —— `.claude/rules/` 進 git，所有人共用同一份
- **契約層強制 single-source**（`09-cross-scope-interfaces.md`）
- **frozen template** 讓文件格式不漂移
- Code review 特別注意：**這個新寫的 helper 是不是已經有了？**（AI 很容易重造）

### 問題 2：PR 體積膨脹

AI 產出快，PR 容易變得又大又雜。大 PR 沒人能真的 review，於是變成 rubber stamp。

**對策**：

- **PR 上限**：訂一個團隊共識（建議 **400 行 diff**，不含生成檔 / lock 檔）
- 超過就拆。拆不了 → 在 PR 描述說明為什麼，並標出**哪幾個檔案是重點**
- Phase checklist 的「一個 task = 一個邏輯單元」本來就是為了這個

### 問題 3：「AI 說可以」不是理由

Review 時遇到「為什麼這樣寫？」→「AI 產生的」**不是有效回答**。

**協定**：**你送出的 PR，你要能解釋每一行。** 不能解釋的就不要送。

### 問題 4：驗證宣稱膨脹

AI 很容易寫出「已驗證」「測試通過」而實際上沒跑過
（見 `memory/feedback_never_fabricate_tool_results.md`）。

**對策**：

- PR 描述的 gate 結果要**貼實際輸出**，不是打勾
- Drive-through 要**附截圖**
- Reviewer 有權要求重跑並貼結果

### 問題 5：記憶不共享

每個人的 AI 記憶是本機的。A 的 AI 學到的教訓，B 的 AI 不知道。

**對策**：

- **`memory/` 進 git** —— 團隊共享的教訓寫成 `feedback_*.md` 並 commit
- Phase retrospective 的 AD 是團隊層級的，不是個人的
- 新教訓在 PR 裡 review（它會影響所有人的 AI 行為，值得被看過）

---

## 相關

- `docs/rules-on-demand/git-workflow.md` —— PR 流程 / commit 格式
- `docs/rules-on-demand/scope-boundaries.md` —— 範疇邊界（同時是分工邊界）
- `docs/12-ai-assistant/_TEMPLATE-handoff.md`
- `docs/05-usage/_TEMPLATE-onboarding-checklist.md`
- `docs/INFORMATION-FLOW.md` §情境 E
