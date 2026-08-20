# CH-046 — Progress

## 2026-08-20 — 單日完成（recon → spec → 核准 → 實作 → 中性化 → 收尾）

### Recon（寫 spec 之前）

⛔ **recon 的第一個產出是推翻我自己前一則訊息的兩個數字**，兩個都是同一種錯 ——
**憑記憶數，沒有量**：

| 我報的 | 真值 | 錯因 |
|---|---|---|
| 前端接線 **2 / 29** | **3 / 29** | 漏掉 `(app)/risks/[id]`（W22 垂直切片接的）|
| 範疇有 code **5 / 8** | **6 / 8** | 拿 **5 個 api 範疇**去比**含 `ui` 的分母 8** —— 分子分母來自不同集合 |

⇒ 這兩個就是本專案第 **6、7** 個手寫計數器，也是本片存在的直接理由。

第三個發現改變了設計：**「接線」有兩個合理定義**。
`login/page.tsx` 打 `/api/demo-session`、`app/page.tsx` 打 `/health` —— 兩者都是 HTTP，
但都不是領域資料。⇒ 答案可以是 **3** 也可以是 **5**。
**工具因此輸出三個數字與定義，不輸出一個。**

### 使用者裁決（2026-08-20）

- **不輸出整體完成度百分比** —— 五把尺各自的比值照印（有分母有定義），單一總分不印
- spec 照原樣核准執行

### 實作

| 檔案 | 狀態 |
|---|---|
| `docs/01-planning/PROGRESS-METRICS.md` | 新增 —— 五把尺宣告 + 12 列里程碑 + 錨點 |
| `scripts/lint/check_progress_metrics.py` | 新增 —— 導出 + 比對 + 錨點求值 + 無條件 self-test |
| `scripts/lint/tests/test_progress_metrics.py` | 新增 —— **27 tests** |
| `scripts/lint/run_all.py` | 註冊 `progress-metrics`（**10 → 11**）|
| `docs/01-planning/README.md` | 索引 1 行 |

**實體計數引用 `check_entity_index`**（importlib by path），不複製它的實體定義 —— AP-2。

**錨點 6 verified / 6 manual。** 六個 `manual` 各有理由（見文件 §2），
**沒有替它們發明錨點** —— 一個什麼都不代表的綠勾比沒有更糟。

### ⭐ 四次中性化 —— 預測寫在執行之前

| # | 中性化 | 預測 | 實際 |
|---|---|---|---|
| N1 | 宣告 `data-model` → `35 / 36` | exit 1，恰好 1 條，指名該把尺；M1 錨點仍成立故不同時報 | ✅ **完全命中** |
| N2 | M4 錨點 → `== 1` | exit 1，恰好 1 條，`M4 anchor broke` + `re-judge M4` | ⛔ **預測錯 —— 見下** |
| N3 | 拿掉 `DISCLAIMER` 內容 | `run_all` 仍綠；unittest 恰好 1 個轉紅 | ✅ 命中（**但我執行錯兩次**）|
| N4 | 全部還原 | `run_all` 11/11 · 27 tests OK | ✅ 命中 |

#### ⛔ N2：預測錯了，而它抓到一個真缺陷

detector **正確偵測到**漂移（exit 1、`1 mismatch(es)`），但**印訊息時 crash** ——
失敗訊息會插入文件裡的判定文字（`🔴 未開始`），而本機 console 是 cp1252。

⇒ **偵測成功，崩在「說出偵測到什麼」那一步** —— 本機看起來與沒偵測到無法區分。
這是 `AD-ShaDetectorConsoleEncoding-1` 第 **5** 次現身，**而這次的形狀最壞**：
本 detector 的輸出全是英文，所以它看起來完全不需要那個修法。

修法 `_force_utf8_stdout()`，函式 docstring 明記「**由中性化 N2 發現，不是設計時想到的**」。
⚠️ 該 AD 的射程已在 BACKLOG 放寬一次：不只「印中文的腳本」，是**任何會引用文件內容的腳本**
—— 而那幾乎是全部的 detector。**專案級修法仍未做。**

#### ⛔ N3：我連續執行錯兩次，兩次都留著

1. **第一次**：`sed`/heredoc 的 mutation 根本沒套用上，unittest 回 `OK` ——
   我差一點把它讀成「測試沒偵測力」。⇒ 依 `AD-NegativeTestNeedsPositiveControl-1`
   補了**陽性對照**（先證明 mutation 落地），才發現這件事。
2. **第二次**：regex `DISCLAIMER = \([^)]*\)` 停在 disclaimer 內含的
   `(07-wave1-build-plan.md)` 的第一個 `)` ⇒ **把檔案改成語法錯誤**。
   unittest 回 `Ran 1 test / errors=1` —— 那是**模組載入失敗**，不是「27 個裡壞了 1 個」。
   我一度把它當成有效結果。

⇒ 第三次改用 **Edit 工具**做 mutation（有專用工具就用專用工具），
並在執行前斷言 **`ast.parse()` 語法合法 + disclaimer 確實消失**，才得到有效結果：
**恰好 1 個測試轉紅**，正是 `test_render_carries_the_scope_disclaimer`。

⭐ **教訓**：一個「通過」的負面測試有三種可能 —— 守衛有效、mutation 沒落地、
或 mutation 把受測物弄壞成另一種失敗。**只有陽性對照能分辨它們。**

### Gate

`run_all` **11 / 11** exit 0 · `check_progress_metrics --self-test` PASS（兩個方向）·
`test_progress_metrics` **27 tests OK**

⚠️ **app 的 lint / format / type / test / build 沒跑，刻意的**：六個變更檔全在
`scripts/` 與 `docs/` 底下，**沒有一個落在任何 app gate 的掃描範圍**
⇒ 跑了會綠，但那個綠與本片無關（`AD-LocalGateSetIncomplete-1`：「gate 全綠」要自帶射程）。

### Drive-through

🚧 **N/A —— 非 user-facing**，本記錄一律寫 **gate-only verified**，不暗示可用性。
真實驗收在**下一次審計**：`/status-audit` §2.0 是否改為引用 `PROGRESS-METRICS.md`
而不是臨時重算。

### ⛔⭐ PR #96 CI 紅 —— 一把尺量的是我的工作環境，不是這個 repo

**本機 `run_all` 11/11 綠，CI `gates` 紅。** 失敗訊息精確（detector 這部分寫對了）：

```
ruler `loc-generated`: document declares '96617', repo derives '0'
```

**根因**：`apps/api/src/generated/` 是 Prisma client。`.gitignore:96` 排除它、
`git ls-files` **0 個 tracked 檔** ⇒ 它在本機是 `prisma generate` 之後才存在的，
在乾淨的 CI checkout 上**根本不存在**。

⇒ 那把尺量的不是「進度」，是「**我跑過 build 沒有**」。

**修法**：移除該把尺的**比對**，保留它的**輸出**（它是排除 9.6 萬行的理由），
並在輸出中區分兩種情況 —— `absent -- not built in this checkout` vs
`96617 lines here, build artefact, not compared`。⚠️ 印一個裸的 `0` 會讀成
「沒有 generated code」，那是與「這裡沒 build」不同的宣稱。

**寫成規則**（detector 內 `RULER_RULE` 區塊 + 文件 §1.0）：

> **一把尺必須是版控內容的屬性，不是工作環境的屬性。**
> 加新尺之前先問：一個乾淨的 `git clone`、不跑任何 build，導得出同一個值嗎？
> 導不出 ⇒ **印它，不要比對它。**

⭐ **兩條回歸測試**釘住它：`loc_generated` 為 0 或 96617 都不得產生 problem；
輸出必須說出是哪一種情況。

⚠️ **這是 `AD-LocalGateSetIncomplete-1` 的一個新變體**：既有的那條講的是
「本機 gate 集合 ≠ CI gate 集合」（某些 job 只在 CI 跑）。**本次差異不在 gate 集合** ——
兩邊跑的是同一支 detector、同一個 `run_all` —— **差在環境狀態**。
⇒ 同一支 gate 在兩個環境給出不同答案，而那正是它該偵測的東西之外的東西。

⛔ **我沒有只憑本機綠就宣稱修好**：修完後用 `git worktree` 建乾淨 checkout
（無 `generated/`）重現 CI 條件再驗一次，結果記於下方。

### 完成摘要

五把尺 + 12 列里程碑錨點上線，`run_all` 由 10 → **11** 個 detector。
「進度到哪了」從**每次臨時算**變成**一份會被 CI 強制為真的文件**。

⛔ **它解不掉的**：里程碑判定仍是人的（工具只驗前提）· 六個里程碑是 `manual`（零偵測力）·
五把尺全是代理指標 · 分母只有 Wave 1。四點都明寫在文件開頭與 spec §射程限制。
