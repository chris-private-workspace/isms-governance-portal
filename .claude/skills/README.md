# `.claude/skills/` — 讓 AI 自己找到規程

**Purpose**: skill 與 command 的分工判準，以及為什麼兩者都需要。
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

---

## 為什麼要有 skill（command 不夠）

一個 `/status-audit` command 只有在**使用者記得打那個指令**的時候才會生效。

但使用者不會打指令，他會說：

> 「現在專案到底怎樣了？」 · 「還有什麼沒做？」 · 「幫我盤點一下」

這時 AI 會直接去讀 `BACKLOG.md` 然後回答 —— 而那個答案**必然不準**
（backlog 看不見自己的 stale，這正是 `/status-audit` 存在的理由）。
規程明明寫好了、指令明明也建好了，**但它在該生效的那一刻沒有被觸發。**

Skill 補的就是這一段：它的 `description` 是**自然語言路由表**，
列出使用者真的會講的那些句子。AI 在每個 session 都看得到這張路由表，
使用者一講到其中任何一句就會自動走規程 —— 不需要記得任何指令。

> 這是「規則要有東西會叫，才算規則」的**觸發面**版本：
> 前者管的是違反時有沒有東西變紅，這裡管的是**該用的時候有沒有東西被叫起來**。

---

## 判準：這件事該做 skill 還是 command

| | Skill | Command |
|---|---|---|
| **觸發方式** | AI 依 `description` 自行判斷 | 使用者打 `/<名稱>` |
| **適合** | 使用者會用**自然語言**問到的事 | 使用者會**明確要求**的動作 |
| **例子** | 狀態盤點、反模式自檢、「這個之前修過嗎」 | 開 phase、收尾、重啟服務、發版、交接 |
| **判準一句話** | 「使用者不會知道要叫它，但該做」 | 「使用者知道自己要幹嘛」 |

兩者**不互斥**：同一個規程可以兩邊都有入口。本模板的 `status-audit`
就是這樣 —— command 給明確要求的人，skill 給只會問「現在怎樣」的人。

---

## 加一個 skill 的規矩

1. `.claude/skills/<name>/SKILL.md`，frontmatter 必須有 `name` + `description`
2. **`description` 是路由表，不是摘要** —— 寫使用者**真的會講的句子**，
   而不是這個 skill 在做什麼的抽象描述。寫得抽象 = 不會被觸發 = 白做
3. `description` 裡明確寫上**否定觸發條件**（「即使他們沒有講『審計』兩個字」），
   否則 AI 傾向只在字面命中時才 invoke
4. **body 保持薄** —— 規程全文放在它原本該住的地方（command / on-demand 規則），
   skill body 只放「為何不能省」+ 指向全文。兩邊都寫全文 = 兩份要同步的東西
5. 在下面這張表加一行

## 本專案的 skill

| Skill | 什麼時候會自動觸發 |
|---|---|
| [`status-audit`](./status-audit/SKILL.md) | 使用者問「現在怎樣 / 還有什麼沒做 / 盤點一下 / 進度到哪」 |

---

## ⚠️ skill / command / agent **不是** always-loaded

`.claude/rules/*.md` 每個 session 全文載入，所以有 byte 預算擋著
（`check_rules_hygiene.py`）。

`skills/` `commands/` `agents/` **不同** —— 只有索引層進 context
（skill 是 `name` + `description`，command 是名稱），body 要到實際 invoke 才載入。
所以這三個目錄可以放長文，**但 skill 的 `description` 要精簡**，
它是唯一每個 session 都在付錢的部分。
