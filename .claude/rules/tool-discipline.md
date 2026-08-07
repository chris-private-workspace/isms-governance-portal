# 工具使用紀律

**Purpose**: 有專用工具就用專用工具 —— 禁止用 shell 代替 Read / Grep / Glob 讀檔與搜尋。

**Category**: Development Process / Tooling
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

> **為什麼是 always-loaded**：這條規則沒有「觸發時刻」—— **每一次工具呼叫都是觸發時刻**。
> 放進 on-demand 等於不存在。

---

## 三條禁止

| ❌ 禁止 | ✅ 改用 |
|---|---|
| 用 shell 跑 `cat` / `head` / `tail` / `grep` / `find` / `sed` / `awk` **讀檔或搜尋** | **Read / Grep / Glob** |
| 用 `echo` 拼裝輸出、`{ }` group 重定向、多命令混合重定向**寫檔** | **單一命令直接重定向**（`cmd > file`），再用 **Read** 讀回來 |
| 靠 shell 的即時 stdout **判斷結果** | **寫檔之後用 Read 讀** |

**shell 的正當用途**：沒有專用工具可替代的操作 —— `git`、套件管理器、建置工具、其他 CLI。
輸出到檔案時**只用單一命令直接重定向，絕不混 `echo`**。

**禁的是「有替代卻用 shell」，不是「用 shell」本身。**

---

## 為什麼這是硬規則（兩個真實代價）

**一、輸出污染差點進了 commit。**
大量 `echo` 拼裝 + group 重定向產生的檔案內容出現重複段落、亂碼、以及把說明文字
寫進了資料區。因為判斷是靠 shell 的即時 stdout（已經被同一輪污染），
**當下看起來是成功的**。是後來用 Read 打開才發現。

**二、shell 讀檔不會進入工具層的檔案狀態追蹤。**
用 `cat` 看過的檔，在工具層仍算「沒讀過」。後續的 Edit 會因此失敗，
或者更糟 —— 比對到錯的位置。這個成本每次都在付，只是通常不明顯。

---

## 額外好處（不是理由，但值得知道）

- Grep 走的是 ripgrep，對大 repo 快得多，而且**尊重 `.gitignore`**
- 結果會帶行號與檔案連結，人可以直接點開
- 跨平台 —— 同一段指令在 Windows / macOS / Linux 行為一致
  （shell 的 `grep` / `sed` 在 Windows 上根本不保證存在）

---

## 自我檢查

準備打一段 shell 指令之前，問一句：

> **這件事有沒有專用工具？**

有 → 用那個。沒有 → shell，而且**只用單一命令直接重定向**。
