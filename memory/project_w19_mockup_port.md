# W19 — Mockup port（30 / 30 個畫面）

**Phase**: W19 · **Closed**: 2026-08-17 · **PR**: PR-pending（push 待使用者確認）
**權威來源**: [`W19-mockup-port/retrospective.md`](../docs/01-planning/W19-mockup-port/retrospective.md)
**Change record**: `docs/03-implementation/changes/CH-038-w19-mockup-port.md`

---

## 一句話

把設計交付物的 **30 個畫面**移植進 `apps/web`，而這一片真正的產出是一個**方法上的結論**：
**三層驗證各自抓到了另外兩層看不見的東西**。

---

## ⭐⭐ 核心：全綠可以是一個假的零

| 層 | 抓到什麼 | 另外兩層會不會抓到 |
|---|---|---|
| Gate | 6 個 ShellState stub 缺 `setLocale` | ❌ |
| **保真度並排比對** | 供應商設定被指名 · 8 處計數該算不該抄 | ❌ |
| **Drive-through** | **25 個死控件 / 15 個畫面** | ❌ |

那 25 個按鈕：**無 `onClick`、未 `disabled`、`cursor: pointer`、`opacity: 1`，其中 4 個帶
`data-hov` 會在滑鼠移過時亮起來**。它們通過了 format · lint · type-check · build ·
76 個測試 · `run_all` **9/9** —— **包含本片自己幾天前才新加的 hover 守衛**。

⇒ 若本片停在 gate 全綠，AP 自檢表會是全 0，**而那個 0 是假的**。

---

## 修死控件時值得記住的三件事（依「最容易忘記」排序）

1. **先問「能不能真的做到」再談停用。** `/preferences` 的語言卡是死的，
   但**能力早就存在** —— `AppShell:231` 一直有 `setLocale`、topbar 也一直在用，
   只是沒暴露在 `ShellState` 上。接上之後整個 shell 真的會切語言。
   ⇒ 2 個因此變成真的能用，而不是被一律停用掉。
2. **`[data-hov]:hover` 在 `disabled` 元素上照樣觸發。**
   所以改成停用時 hover 屬性**必須一併移除**，否則視覺上仍然「活著」，等於抵消停用。
3. **掃描範圍決定你看得到什麼。** 我的第一次 sweep 只掃 `<button>` 且只掃每頁的
   **預設分頁** ⇒ 漏掉 `<span>` 型的可點外觀，以及**非預設分頁後面的控件**。
   兩個漏洞都是 agent 找出來的，不是我。

---

## ⭐ 管理畫面意外揭出的轉錄漂移

`/admin` 把設計的門檻表與 `posture.ts` 並排渲染，兩組對不上。
追到 `dc.html:5088-5092` 才發現交付物**五組全都寫明了**，而 `posture.ts`
**三組吻合、兩組抄錯**（RCSA amber 界線 75→70；高風險 `≤5/6–9/≥10`→`4/7`）。

**真正藏住它的是一句註解**：該檔 header 宣稱那些門檻是「invented、repo 裡沒有程序規定」。
**一個被宣告成憑空發明的值，沒有人會拿去跟任何來源比對。**
9 個畫面（含旗艦儀表板）就這樣用著沒人選過的數字在分級。

⚠️ 修完 header 之後，`THRESHOLD` 的 **inline docstring 還留著同一句假話**，
closeout 時才被 agent 指出來 —— 同一個 orphan claim 要在**兩個地方**修。

---

## Calibration（第 1 個 `mockup-port` 資料點）

- 承諾 **17 hr**（69 × 0.55 × agent_factor 0.45）→ actual **6.9–8.0 hr** → ratio **0.40–0.47 UNDER**
- **actual 是區間不是單值**：無逐日工時（由 commit 時間戳量），且窗口內有一段關機中斷
  而**其中確有 agent 在跑** ⇒ 既不能整段計入也不能整段排除。**兩端都記比挑一個精確的誠實。**
- **假設**：`agent_factor` 描述「一個 agent 比人快多少」，
  而本片實際是**三個 agent 同時做三件互不相干的事** ⇒ 壓縮 wall-clock 的是**平行度**。
- **不 re-point。** 預先判準已寫入 `CALIBRATION-LOG.md`。

---

## Carryover（完整清單在 BACKLOG）

- 🔴 **P0 `AD-LocalPasswordFallback-1`** —— stakeholder 要保留本地密碼登入，
  與**已採納的 ADR-0007 衝突** ⇒ 走 **ADR 修訂**，不得在任何一片默默實作。
  修訂要先答「break-glass 還是一般登入」（guardrail 2：平台受自己的控制項約束）。
- 🟡 `AD-RbacUnenforced-1`（27 畫面零角色強制）· `AD-ProxyMetricAsAnswer-1`（同 session 7 次）·
  `AD-I18nScannerCoverage-1`（**一個被廣泛引用的守衛射程只有 2%**）
- 🟢 5 條（列舉值未翻譯 · 1308px 最小寬 · 新增鈕不對稱 · 孤兒 CSS · drawer 重複實作 · int flake）

**關掉**：`AD-CssToken-1` · `AD-Mockup-3` · `AD-Port-BFSI` · `AD-Auth-1`；
`AD-Mockup-2` **P0→P1**（已渲染，仍開的是滾升的聚合規則 —— 那需要程序輸入，不是程式碼）。

---

## 給下一片前端工作的起點

**不要重新推導** —— `docs/02-architecture/page-inventory.md`（27 畫面的保真度對照與每一處偏離的依據）
與 `design-system.md`（primitive index + drift incident log）存在的目的就是這個。
