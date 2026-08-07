# Restructure Repointing — 重構完成 ≠ 檔案搬完

**Purpose**: 大規模搬遷 / 改名 / 目錄重組之後，確保「會被當成現行指引讀」的每一個指標都重新指對。

**Category**: Development Process / Refactoring
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

**Trigger（什麼時候讀這份）**：目錄重組 / 大量 `git mv` / 改資料夾命名慣例 / 合併兩棵文件樹 /
砍掉一整個頂層目錄 / 換 monorepo 結構。**動手之前讀，不是收尾才讀。**

---

## 核心命題

> **搬檔案是簡單的一半。**
> 會弄壞專案的是另一半 —— **那些告訴下一個 session「東西該寫到哪」的指標。**

一次結構重構可以完美通過所有「內容保全」檢查 —— 沒有任何檔案遺失、雜湊全數對得上、
lint 全綠 —— 同時留下一堆指向已刪除目錄的**指令**。

因為：

> **一條過時的指令，不是一個遺失的檔案。**
> 所以任何內容檢查都看不到它。

---

## 為什麼這條規則存在（真實案例）

某專案把 `docs/` 重組成 14 層、把平行的第二棵文件樹整棵併入、把 sprint 的四份文件共置。
規模：2969 檔異動、2880 個 git rename。

**驗證全綠**：內容雜湊 multiset diff 為空（3010 檔）、git 追蹤集合零差、
架構 lint 12/12、backend 模組匯入 10/10。當時的結論是「完成」。

使用者接著問了一句：

> 「那現在本項目的開發流程是否會知道所有文件都是到 /docs 底下去檢查, 建立或更新？
> 不要因為同步了這個文件架構, 反而把自己本身的開發流程攪混亂了」

一查，全都還在：

| 指標 | 狀況 | 後果 |
|---|---|---|
| **always-loaded 規則**（每個 session 進 context）| 「Change Record 表」仍指示把 bug 紀錄寫進一個已被刪除的目錄；「目錄結構圖」仍畫著剛剛才被合併掉的兩棵樹 | AI 每天照著它做 |
| **FROZEN 模板** | checklist 模板連結 `./sprint-XX-Y-plan.md`（共置後應為 `./plan.md`）| 每個新任務都複製它 |
| **BACKLOG**（open items 單一來源）| 10 個相對連結全斷 | 選任務時查不到脈絡 |
| **session-start prompt** | 開場探勘指令 `ls <舊路徑>/phase-*` 現在回空 | **靜默失效** —— 沒有錯誤訊息，只是什麼都沒列出來 |
| **AI 協作指引** | 設定區還寫著 `CLAUDEDOCS_PATH: "claudedocs/"` | 照做會**重建整棵已刪除的目錄** |
| **腳本** | `default=` 改了，旁邊的 `help=` 字串漏改 | 使用者讀到錯的預設值 |

**沒有一項是連結**。全部是**指令**：表格裡的 inline code、程式碼區塊裡的 shell 指令、
`.py` 裡的字串常數。這正是既有的 broken-link lint **刻意不看**的區域
（它抹掉 fence 與 inline code，才不會把「文件中的範例」誤報成壞連結）。

---

## 三層驗證：內容保全只是第一層

| 層級 | 證明的事 | 工具 |
|---|---|---|
| **內容層** | 檔案沒丟 | 雜湊 multiset diff · 追蹤集合 diff · 檔案計數 |
| **連結層** | 宣告式連結解析得到 | `scripts/lint/check_doc_links.py` |
| **指標層** ⭐ | **指令指向的地方真的存在** | `scripts/lint/check_path_references.py` + 人工判讀 |

前兩層是機械的。**第三層需要判斷** —— 因為要分辨「該修的準則」與「不該動的歷史」。

> 與 `.claude/rules/verification-discipline.md` 是同一個命題的兩個層：
> 那份講 **runtime 層**（gate 綠 ≠ 人能用），這份講 **文件層**（內容在 ≠ 流程通）。

---

## 指標檔清單（restructure 之後逐一審）

「會被當成現行指引讀」的集合。搬完之後每一類都要過一遍：

- [ ] **always-loaded 規則**（`.claude/rules/*.md`）—— 最高優先，每個 session 都進 context
- [ ] **on-demand 規則**（`docs/rules-on-demand/*.md`）
- [ ] **FROZEN 模板**（`_templates/**`）—— 每個新任務都複製它，錯誤會**自我複製**
- [ ] **流程文件**（`PROCESS.md` / `INFORMATION-FLOW.md` / 各層 `README.md`）
- [ ] **BACKLOG / 待辦單一來源**
- [ ] **session prompt / AI 協作指引**（含「開場探勘指令」—— 失效時是靜默的）
- [ ] **腳本**：`default=` **和**旁邊的 `help=` 字串、寫死的輸出路徑、CI workflow 的 path filter
- [ ] **跨 session 記憶 / 筆記**（若有）—— 準則類的那些
- [ ] **`.gitignore` 的路徑規則** —— 見下方地雷

---

## 驗證方法：存在性檢查 > grep 舊名

**grep 舊目錄名只找得到你想得到的形式。** 你會 grep `old-dir/`，但漏掉
`old_dir`、`../old-dir`、拆成兩行的、寫在 YAML key 裡的。

改成反過來做：**把指標檔裡出現的每一個路徑抽出來，逐一檢查它是否存在。**

```bash
python scripts/lint/check_path_references.py          # 預設只掃指標檔集合
python scripts/lint/check_path_references.py --all    # 全 repo
```

**預期會有誤報，那不是 bug**：範例路徑、別的 repo 的路徑、條件式安裝的檔、
計畫中還沒建的檔。**逐一讀過**，確認是刻意的就加 pragma：

```markdown
見 `docs/03-implementation/bugs/FIX-123-example.md`  <!-- path-check: ignore -->
```

```python
OUT = "docs/09-analysis/report.md"  # path-check: ignore
```

> 用 pragma 標記，**不要**放寬檢查條件去迎合誤報 —— 放寬一次，下次真問題就漏掉了。
> pragma 是可 grep、可審計的明確宣告。

---

## 修復方法：反查 basename，但**只信唯一解**

搬過家的檔案，斷鏈修法不是刪連結，是**找到它去了哪**：

1. 掃全樹建 `basename → [路徑]` 索引（**包含 `archived/`** —— 有些連結刻意指向封存）
2. 對每個斷鏈取 target 的 basename 查表
3. **只有唯一命中才自動改寫**，其餘一律進人工清單

### 為什麼多候選一律不碰

真實 dry-run 提出過這兩個「修正」：

```
CONTRIBUTING.md:  LICENSE -> ./reference/agent-framework/LICENSE   (候選 17)
06-phase-roadmap: ./phase-49-foundation/README.md -> ./README.md   (候選 359)
```

第一個會把專案的授權宣告指向一份**第三方鏡像的授權檔**；第二個把 phase 索引指向 repo 根 README。
「共同前綴最長」這類啟發式在候選多的時候產出的是**看起來合理的垃圾** ——
而它會被 lint 判定為綠。

> **門檻設 `len(candidates) == 1`。** 模糊的交給人，不要交給啟發式。

### 一個真實的誤判，值得記住

某次清理把 162 個斷鏈中的一批判定為「**索引列了從未產出的檔案**」，據此把整個 lint 排除在 gate 外。

後來反查 basename 才發現：那 48 個檔案**全部存在**，只是被搬進了另一個子目錄，
而索引沒更新。**「目標不存在」不等於「檔案不存在」** ——
中間差的就是「拿檔名去樹裡搜一遍」這個動作。

> 這跟「沒有檔案遺失 ⇒ 重構完成」是同一個形狀的錯誤：
> **用一個容易取得的證據，回答了一個它回答不了的問題。**

---

## 分流原則：準則類修，歷史紀錄類不動

這是**判斷**，不是機械替換。同樣寫著舊路徑的兩個檔案，處置相反：

| 類型 | 例子 | 處置 | 為什麼 |
|---|---|---|---|
| **準則 / 指引** | 規則檔 · 模板 · session prompt · BACKLOG · 索引 | ✅ **修** | 它描述「現在該怎麼做」，錯了會誤導 |
| **歷史紀錄** | 已收尾的 checklist / retrospective / 帶日期的分析快照 / 過往的執行筆記 | ❌ **不動** | 它記錄「當時做了什麼」，改掉等於**竄改紀錄** |

前述案例：6 個準則檔修正，56 個歷史紀錄刻意保留原路徑。

同一條原則也適用於**識別碼**：

> 若舊識別碼（phase 編號 / 任務 ID）已被寫死在大量 commit message、PR 標題、
> 分支名裡 —— **不要重編號**。用一個外觀問題換一個修不好的矛盾是虧的。
> 上述案例中 1230 個 commit 有 550 個（45%）寫死了 sprint 識別碼，所以識別碼一個沒改。

---

## 地雷

### 1. `git mv` 搬不動未追蹤的檔案

`git mv` 只認 index。未追蹤 / 被忽略的檔案會被留在原地。
用 `shutil.move` / `mv` 搬**整個目錄**（tracked + untracked + ignored 一起走），
再 `git add -A` 讓 git 自行偵測 rename。

**搬完把「重構前就未追蹤」的檔案從 index 還原回未追蹤** ——
不能因為一次結構重構，就把使用者未完成的工作偷偷變成追蹤。

### 2. `.gitignore` 用 `/dir/` 會讓 negation 靜默失效

```gitignore
# ❌ 尾斜線：git 根本不會進入該目錄，下面那行 negation 完全無效
/docs/10-development-log/
!/docs/10-development-log/README.md

# ✅ 排除「內容」而非「目錄本身」
/docs/10-development-log/*
!/docs/10-development-log/README.md
```

搬完用 `git check-ignore -v <path>` **雙向驗證**：該忽略的仍被忽略、該例外的沒被忽略。

### 3. 只暫存你真的想動的東西

`git add <dir>` 會把該目錄下**未追蹤的檔案一併掃進來**（實際案例：一次
`git add reference/` 掃進 1907 個未追蹤檔）。重構期間用 `git add -u`（只暫存已追蹤檔的變更）。

但 `git add -u` **也會暫存使用者原本 pending 的其他改動** ——
commit 前用 `git diff --cached --name-only` **數一遍**，把不屬於這次的
`git restore --staged <path>` 移出去。

同理，要把分支指標移回遠端狀態時用 `git branch -f main origin/main`（只移指標），
**不要**用 `git reset --hard`（會一併還原使用者未提交的工作）。

> 這三條是同一個根因：**對「只想動 A」用了「會動到 A 以外」的指令。**

### 4. 有 runtime 路徑依賴的腳本

註解裡的舊路徑無害；**寫入路徑**會讓輸出靜默跑到錯的地方，
甚至**重建你剛剛刪掉的目錄**。搬完 grep 一遍所有腳本的輸出路徑。

---

## DoD（重構收尾前）

1. [ ] **內容層**：搬移前後的內容雜湊 multiset diff 為空；git 追蹤集合 diff 可解釋
2. [ ] **連結層**：`check_doc_links.py` 綠
3. [ ] **指標層**：`check_path_references.py` 綠（誤報已逐一判讀並加 pragma）
4. [ ] **指標檔清單**逐項過一遍（見上方 checklist）
5. [ ] **`git check-ignore` 雙向驗證**（若動到被忽略的目錄）
6. [ ] **腳本輸出路徑**已確認（`default=` 與 `help=` 都要）
7. [ ] **分流已判斷**：哪些是準則（修）、哪些是歷史（不動），寫進重構紀錄
8. [ ] **重構紀錄**寫明：刻意不做什麼 + 為什麼（尤其是不重編號的決定）

---

## 一句話

> **「內容保住 + gate 全綠」是地板，不是終點。**
> 重構完成的定義是：**下一個 session 照著文件做，不會走到不存在的地方。**
