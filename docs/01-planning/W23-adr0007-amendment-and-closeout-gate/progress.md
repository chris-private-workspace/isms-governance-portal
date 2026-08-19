# Phase W23 Progress

**Phase**: W23 — 裁決本地密碼衝突 + 給 closeout 補上它缺的那一格
**Plan**: [plan.md](./plan.md)
**Branch**: `feature/W23-adr-and-closeout-gate`

---

## Day 0 — 2026-08-19 — Plan-vs-Repo Verify

**對照基準**：`main` HEAD **`c2f823c`**（PR #88 status audit #8 merge 後）。

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-adr-breakglass** ⭐⭐ | **plan 把衝突寫成「ADR 禁止本地密碼 vs stakeholder 要它」，而 ADR-0007 其實*要求* break-glass** —— `:67` 的比較表有一整列 `2 break-glass, P1 to Group CISO \| required \| required \| **no — Entra emergency access accounts**`；`:103` 寫 break-glass（引 `05:49`）**remain platform features … Entity Zero controls**；而 `05:57` 明訂「**Break-glass accounts** — emergency access, heavily restricted, alarmed and fully audited on use」 | **衝突比 plan 記的窄，也比它記的尖銳**。ADR-0007 沒有禁止 break-glass —— 它**指派 break-glass 給 Entra emergency access accounts**，而那條路徑**仍然需要 Entra 連得上**。⇒ ADR-0015 要論證的**不是**「該不該有 break-glass」（已經有了），而是「**break-glass 可不可以是本地的、能在 Entra 掛掉時仍然可用**」。⇒ 改 plan §0 Root cause + §3.1 + §8 | 🔴 改 plan |
| **D-05-conditional** ⭐ | 如預期**且比預期更強**：`05:7` 原文是「The platform does not store passwords itself **where an IdP can be used**」；`0007:102` 引用時寫成「`05:7`'s "the platform does not store passwords" holds: no local credential store」 | **截斷改變了語義** —— 原文是條件句（「在 IdP 用得上的地方」），ADR 把它讀成無條件禁令。⇒ ADR-0015 引用 `05:7` 時**必須帶著條件**，這也是 D-adr-breakglass 的法源 | 🟡 小調整 |
| **D-adr-fc** ⭐ | 如預期**且比預期更強**：可證偽條件有 **3 條不是 2 條**。FC1 寫 `14 OpCos`（真值 **13**）· FC2 以 Azure China instance 為條件（**不存在 ⇒ 永遠不會 fire**）· **FC3「If group IT standardises on a different IdP」** —— 這一條**是健康的**（可觀察、真的會 fire）| `AD-43` 只點名了 FC1 / FC2，**漏了 FC3 是好的那一條**。⇒ ADR-0015 **保留 FC3**，修 FC1 的數字，刪 FC2 並說明為何 | 🟡 小調整 |
| **D-closeout-cells** | 如預期，**但抓法差點出錯**：`grep -ci "ADR"` 對四個檔回報 3 / 5 / 0 / 0，看起來像「兩處已經有了」。⛔ **逐字讀 Self-Check 區塊後，四個都沒有那兩格** —— `phase-closeout.md` 的 ADR 命中全在 §2「要不要**寫**一份 ADR」，那是**另一個問題**（本片要的是「有沒有讓**既有已採納**的 ADR 變得不準確」）| 命中數不是證據。⭐ 順帶找到**前例**：`retrospective.md.tpl` 的 `RISK_REGISTER` 那一格是審計 #3 用同樣手法加的 ⇒ 形狀已被證明。⚠️ **但四份清單今天已經不是彼此的鏡像**（`task-workflow.md` 沒有 `RISK_REGISTER` 也沒有 `status:` 格）⇒ plan §3.4 的「四處措辭一致」只能指**新增的那兩格**逐字相同，不是整份清單收斂 | 🟡 小調整 |
| **D-rules-budget** | `check_rules_hygiene.py:98` 的 `task-workflow.md` 預算 = **32,000 bytes**，現值 **25,435** ⇒ headroom **6,565** | 兩行綽綽有餘。**plan R5 未觸發** | ✅ |

### 確認無誤（沒有漂移的部分 —— 同樣是 Day-0 的產出）

| 宣稱 | 實測 |
|---|---|
| `docs/14-adr/0015-*.md` 不存在 · ADR 最大號 `0014` | ✅ |
| `CH-043` 未被佔用 | ✅ `changes/` 最大號 `CH-042` |
| 九個 EDIT 目標全部存在 | ✅ |
| `0007:102` 寫著 `no local credential store` | ✅ 逐字相符 |
| **登入頁零 `input[type=password]`** | ✅ —— ⚠️ `grep -c` 回報 **1**，逐行讀後確認那是 `:23` 的**註解**（描述被移除的五個），**實際 input 為 0**。⛔ 又一次「命中數不是證據」，本次靠讀原文解掉 |
| `my-profile/page.tsx:423` 的「變更密碼」是 disabled | ✅ 註解 `'Change password' is KEPT by an explicit 2026-08-17` + `disabled` prop |
| `my-profile.test.tsx:54-56` 斷言 `input[type="password"]` 長度 0 | ✅ |
| `0007:21,90,135,145` 的 Azure China 現在式敘述（`AD-30`）| ✅ 四處全中；⚠️ **`:145` 額外引著 ADR-0006，而 0006 自己已被 ADR-0010 取代** |
| `check_status_markers.py` 的 E4 豁免 | ✅ 「E4 fires only when the sibling **HAS** a status field. Missing sibling frontmatter is deliberately **NOT** an error」⇒ E5 不得破壞它 |

### ⛔⭐⭐ Baselines 量到一件比漂移更嚴重的事：合併跑的測試會**只跑一部分而回報綠**

量 baseline 時跑 `npm run test -w apps/api -w apps/web`，web 那半回報：

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

而 baseline 是 **10 files / 95 tests**。⛔ **它沒有紅，它「通過」了。**

三次獨立量測：

| 跑法 | 結果 |
|---|---|
| `npm run test -w apps/api -w apps/web`（第 1 次）| api 484 ✅ · web **1 file / 5 tests** ⛔ |
| `npm run test -w apps/web`（單獨）| **10 files / 95 tests** ✅ 與 baseline 相符 |
| `npm run test -w apps/api -w apps/web`（第 2 次）| api 484 ✅ · web **10 files / 95 tests** ✅ |

⇒ **間歇，未重現**。⛔ **不宣稱機制** —— 我不知道 vitest 為何只收了一個檔。

**但形狀本身不需要機制就能判斷它有多糟**：

- W22 記的 `AD-UndiagnosedWebTestFailure-1` 是「**2 個檔失敗**」—— 那會**紅**，人看得見
- 今天量到的是「**只跑 1 個檔**」—— 那會**綠**，而且 `1 passed (1)` 讀起來像通過
- ⇒ **同一個底層問題的兩個面，而綠的那一面危險得多**

⚠️ **這使一個過去的宣稱失去確定性**：任何一次以**合併跑**取得的「web 95 passed」，
事後都無法排除它其實只跑了一部分 —— 除非當時的輸出保留了 `Test Files N` 那一行。
⇒ **本片之後的 gate sweep，web 一律單獨跑**，或至少同時記下 `Test Files` 的檔數。

### Prong 覆蓋

- **Prong 1（path）**：11 個路徑 + 2 個編號可用性 → **0 個漂移**
- **Prong 2（content）**：9 個宣稱 → **1 個實質漂移**（`D-adr-breakglass`）+ **3 個「比預期更強」**
  （`D-05-conditional` · `D-adr-fc` · `D-closeout-cells`）
- **Prong 2.5（child tree）**：**N/A** —— 非前端頁面 phase
- **Prong 3（schema）**：**N/A** —— 零 schema 變更、零 migration

### Go / No-Go

**範圍變動**: **~10-15%** —— `D-adr-breakglass` 改的是 **ADR-0015 要論證什麼**，
而 §4 File Change List、8 條 AC 的結構、§7 workload **全部不變**。
→ 落在 **≤ 20% 帶** ⇒ 依 `task-workflow.md` **繼續 Day 1**，把 finding 記入 plan §Risks
（⛔ **不默默改 §Technical Spec** —— 保留「原本計畫什麼 vs 現實逼你改成什麼」的審計軌跡）。

### Baselines（逐項實測，全部與 plan 宣稱相符）

| Gate | 結果 |
|---|---|
| `npm run test -w apps/api` | **484 passed / 40 suites** ✅ |
| `npm run test -w apps/web`（**單獨跑**）| **95 passed / 10 files** ✅ |
| `lint`（api + web）| clean |
| `type-check`（api + web）| clean |
| `format:check`（api + web）| clean —— `All matched files use Prettier code style!` ×2 |
| `build`（api + web）| clean —— `✓ Generating static pages (25/25)` |
| `run_all` | **9/9** |
| `check_entity_index` | **34 / 36** |
| `check_backlog_counts` | OK（**173** —— P0 6 / P1 92 / P2 75）|
| `check_status_markers` | OK（**30 個 pre-doc**，E1–E4 clean）|

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 0（`11:27:55` 建分支 → 完成 drift 記錄與 plan §Risks 修訂）| **≈ 15 min** |
| 對照 plan §7 的 Day-0 估算 | 0.5 hr（30 min）⇒ ratio **≈ 0.50** |

> ⚠️ 其中約 5 分鐘花在追那個測試 runner 的異常（跑了三次）—— 那不在 Day-0 的估算裡，
> 而它是本日**最有價值**的產出。

---

## Day 1 — 2026-08-19 — ADR-0015

### 交付

| # | 檔案 | 動作 | 實測 |
|---|---|---|---|
| 1 | `docs/14-adr/0015-identity-provider-and-local-break-glass.md` | NEW | 284 行 |
| 2 | `docs/14-adr/0007-identity-provider.md` | EDIT | **`1 file changed, 1 insertion(+), 1 deletion(-)`** |
| 3 | `docs/14-adr/README.md` | EDIT | 索引 +1 行 · 0007 Status 1 行 |

### Day-0 的發現如何改變了 ADR 的形狀

`D-adr-breakglass` 說「衝突不是該不該有 break-glass，而是它可不可以是本地的」。
起草時它產生了三個 plan 沒有預期的結構：

| # | 結果 | 若照原 plan 寫會怎樣 |
|---|---|---|
| **選項變 4 個** | 加入 **A = Entra emergency access accounts**（`0007:67` 實際選的） | D1 的三個選項裡沒有現行狀態 ⇒ **這份 ADR 會沒有東西可以取代** |
| ⭐ **舊 ADR 的自我矛盾成為 §Context 的主軸** | `0007:67`（break-glass = Entra 功能）與 `0007:103`（break-glass **remain platform features**）**不能同時為真** | 只會寫成「修訂一個過時敘述」，讀不出它是**兩個規範互相打架** |
| **`04:62` 被用在與 0007 相反的方向** | 0007 用它否決 Keycloak；本 ADR 用它支持本地 break-glass ⇒ **必須自己指出這件事** | 讀者會發現同一行被兩用而沒有人說明 ⇒ 看起來像各取所需 |

⭐ **起草時新找到的第三個依據**（Day-0 沒預測）：交付物的 `sessionPolicy.js` 在**同一條政策**裡
同時寫著 *local passwords disabled* **與** *two break-glass accounts*（`15:248-249`）——
⇒ **來源文件自己就把兩者當成不同的東西**。這使「否決 C（一般本地登入）」不必只靠 `05:7`。

### 逐項 gate（Day 1.1 的 6 個 DoD）

| DoD | 實測輸出 |
|---|---|
| §Decision 回答 D1 | ✅ 4 選項 + 逐項否決理由；四個管控寫成可執行句 |
| 可證偽條件真的會 fire | ✅ **5 條**，每條帶 `*Fires when*:`。⛔ 舊 FC2 刪除並寫下墓誌銘 |
| 重述 0007 正確部分 | ✅ 獨立一節 6 條（plan R3） |
| `AD-30`：零 Azure China 現在式 | ✅ `grep "Azure China"` → **2 處，皆否定式**（`:213` does not have and will not build · `:280` AD 名稱）；`identity plane` 3 處皆 `gone` / `does not exist` / 與中國無關 |
| `AD-43`：OpCo = 13 | ✅ 3 處全 13；`grep "14 OpCo\|fourteen"` → **零** |
| `05:7` 條件子句 | ✅ 2 處帶條件；⭐ **該條件子句就是本 ADR 的法源** |
| `run_all.py` | ✅ **9/9** |

### ⚠️ 範圍裁決（未擅自處理 —— 等使用者）

**4 處活的規範文件仍指向已被取代的 ADR-0007。** 0006→0010 的**前例是有 repoint 的**
（`06-tech-stack:36` = `~~ADR-0006~~ → **ADR-0010**` · `03:47` · `15:39` · `decision-form:32` 的 ⚠️ 註）。

| # | 位置 | 現況 | 誰造成的 |
|---|---|---|---|
| 1 | `page-inventory.md:152` | 指向 `AD-LocalPasswordFallback-1`「需修訂 ADR」 | ⭐ **本片造成** —— 本片正在關掉那條 AD |
| 2 | `decision-form.md:46` | OQ-5 的「關閉者」欄指向 `0007` | 本片造成（關閉者換人） |
| 3 | `15-design-alignment.md:125,250,255` | 偏離記錄指向 `0007` | 本片造成（偏離內容多了一項） |
| 4 | `06-tech-stack-and-decisions.md:38` | `ADR-0007 \| Identity provider \| Self-hosted (Keycloak) vs. managed IdP` | ⛔ **本片之前就錯了** —— 該列寫得像**尚未決定**（無 ✅ Settled 標記），而 0007 已採納 8 個月 |

⛔ **plan §4 沒有列這四個檔** ⇒ 依 §Step 0.0 節流閘與 plan R6（每 phase 1 個治理項配額）
**不當場做**。第 4 項尤其：它是**既有漂移**，不是本片產生的。

### ✅ 裁決與執行（使用者 2026-08-19）—— 本片造成的當場修，既有漂移記 AD

⛔⭐ **而我的清單是錯的 —— 實際是 5 處不是 3 處。** 修完前三個之後跑全樹 grep，又跑出兩個：

| 漏掉的 | 為什麼漏 |
|---|---|
| `docs/architecture.md:110`（`\| Identity provider \| ✅ Entra ID \| **ADR-0007** \|`）| ⛔ **我把它依角色分類成「薄轉址層」就跳過了，沒有讀它**。它其實有一張**帶 ✅ 標記的活決策表** |
| `.env.example:36`（`Until Entra ID lands (ADR-0001 / ADR-0007)`）| 它在 37 檔命中清單裡，我判成「code-adjacent，非規範文件」而未讀 |

⇒ **這是 `AD-ProxyMetricAsAnswer-1` 的形狀，本 session 第 1 次**：
用**檔案的角色**（一個便宜的代理指標）回答「它裡面寫了什麼」（一個需要讀內容的問題）。
⚠️ 諷刺的是我在同一段裡才剛引用過 Day-0 的兩次同型錯誤。
⇒ 教訓寫進 plan **R12**：**取代型 ADR 的 §4 必須含一次全樹引用掃描，不是靠回憶列檔**。

**最終處置**：

| 檔案 | 改法 |
|---|---|
| `page-inventory.md:152` | `~~ADR-0007~~ → ADR-0015`；⭐ 並改寫成**已確立**（0015 禁止自助憑證管理 ⇒ 移除的密碼欄位與 FORGOT/RESET **沒有未來行為可以接回**） |
| `decision-form.md:46` | 去向 → `0015`（取代 `0007`）；決定欄註明**供應商未變、補的是 break-glass 缺口** |
| `15-design-alignment.md:125` | 指標 → 0015 |
| `15-design-alignment.md` §8.6 | ⭐ 加 `AMENDED 2026-08-19` 標題 + **拆出 break-glass 獨立一列**：對交付物**仍是 ❌ none**（2 個 break-glass + P1 都保留），變的是**實作位置**。並引交付物自己同時寫著 *local passwords disabled* 與 *two break-glass accounts* |
| `architecture.md:110` | 決策表該列 → `ADR-0015（取代 0007）`，選了什麼欄加「+ 平台本地 break-glass」 |
| `.env.example:36` | `ADR-0007` → `ADR-0015`（1 個編號） |

**記 AD 2 條**（`check_backlog_counts` 報 total 173→**175** / P1 93→**94** / P2 74→**75**，照抄）：

- `AD-DecisionTableSaysUndecided-1` 🟡 —— ⭐ **既有漂移，射程比原本大**：不只 `06-tech-stack:38`，
  `architecture.md:106,107,108` 把 **ADR-0003 / 0004 / 0005** 三列全寫 `⚠️ 未定`，
  而三者都已由 spike 採納 ⇒ **兩個真相來源不一致，較常被讀到的那個是錯的**。
  ⚠️ **本片新增的 closeout ADR 格防不了它** —— 那一格問「本 phase 有沒有讓某份 ADR 變不準確」，
  **答不出既有的存量**
- `AD-ProfileChangePasswordNoFuture-1` 🟢 —— plan §3.6 推論 2。按鈕檔頭寫「等 ADR 修訂」，
  修訂已完成且答案是**否** ⇒ 解封時**按鈕與檔頭要同時改**（只改一邊都會留下另一種 orphan）

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 1（Day-0 commit `11:42:09` → gate 9/9 `11:58:37`）| **≈ 16 min** |
| 對照 plan §7 的 Day-1 bottom-up（ADR 起草 2 hr + 0007/README 0.5 hr）| 2.5 hr ⇒ ratio **≈ 0.11** |

> ⛔ **這個數字不可直接拿去校準。** 三個污染源，全部寫出來：
> (a) **權威文件的閱讀成本有一部分付在 Day 0**（`0007` / `05` / README 當時已讀過）；
> (b) 本日中間**發生一次 context compact**，wall-clock 含其開銷但那不是產出時間；
> (c) `docs / audit / template` class 今天只有這 1 個資料點。
> ⇒ Day 4 回填 matrix 時**以 phase 聚合值為準**，逐日 ratio 只當敘述。

---

## Day 2 — 2026-08-19 — E5 + closeout 的兩格

### ⭐ 本日最有價值的一件事：枚舉先於 pattern，而它立刻付錢

`lint-detector-authoring.md:67` 要求寫 detector **之前**先把 repo 裡該 pattern 的所有實際寫法撈出來
肉眼分類。那份規則自己記錄的踩坑，正好就是**這個 detector 的前一版**（4 種格式只配到 2 種）。

照做的結果，兩件憑印象一定會做錯的事：

| 發現 | 若憑印象寫會怎樣 |
|---|---|
| ⭐ **第 5 種格式 `PR 待開`**（`docs/14-adr/0005:147`）| **漏掉一個真陽性** —— 它是本日三個之一，而中文標記不在任何人的預設清單裡 |
| ⭐ **散文比真標記多約 10 倍**，且全部在反引號內 | detector 會在 BACKLOG / STATUS_AUDIT / 本片的 plan / 那份規則自己身上狂噴 ⇒ 上線第一天就被關掉 |

而反引號這條界線**是慣例不是保證**，所以沒有單靠它：**遮蔽三類**（fenced block / HTML comment /
inline code）+ **掃描範圍限縮到 artifact 檔**（排除 `_templates`、`__fixtures__`）。
HTML comment 那一類不是假想的 —— `W21-*/retrospective.md` 的補翻註記就在 comment 裡寫了**裸的**
`PR-pending`，而那個檔**已經被正確修好了**。沒有這層遮蔽，E5 上線第一件事就是誤報一個修對的檔。

### E5 的設計：授權來源三段解析，解不出來就跳過

| 段 | 來源 | 對應的真實形狀 |
|---|---|---|
| 1 | 檔案**所在的 artifact 資料夾** | `W21-*/retrospective.md` —— `AD-46` 的原案 |
| 2 | **同一行**的 phase id | `BACKLOG` / `MEMORY.md` 的 pointer row |
| 3 | **檔頭** `**Phase**: W21` | 單檔 CH 記錄（`CH-041`）|
| — | 都解不出來 | ⛔ **跳過，不猜** |

⛔ **E5 不對 `PR-pending` 本身開火** —— closeout 當下它本來就該在（closeout 文件寫在 merge **之前**，
`git-workflow.md:222`）。開火的是**矛盾**。這正是 plan R4，也是 `self_test()` 必須跑第二個方向的理由。

### 實測：E5 在真 repo 上抓到 3 個，人工枚舉再抓到 2 個

| # | 位置 | 標記 | 真相（`gh pr list` 查證，不靠記憶）| 誰抓到的 |
|---|---|---|---|---|
| 1 | `CH-005-foundation-adrs/spec.md:12` | `#TBD` | **PR #6 `58d39ec`**（2026-08-07 merged）| **E5** |
| 2 | `CH-041-project-writes-its-own-iac.md:7` | `#TBD` | **PR #84 `700ef62`**（2026-08-18）| **E5** |
| 3 | `docs/14-adr/0005-*.md:147` | `PR 待開` | **PR #31 `b20f3f1`**（2026-08-10）| **E5** ⭐ 第 5 種格式 |
| 4 | `CH-006-repair-ci-gates.md:7` | `#TBD` | **PR #7 `f4054f2`**（2026-08-07）| ⛔ **人工枚舉** |
| 5 | `CH-007-placeholder-detector.md:7` | `#TBD` | **PR #9 `a7f5fd6`**（2026-08-07）| ⛔ **人工枚舉** |

⇒ 五個全部翻成 `MERGED (PR #N, <sha>)`，E5 由紅轉綠（`REAL EXIT=1` → `REAL EXIT=0`）。

⚠️ **第 4、5 項暴露 E5 的結構性盲區**：它們的檔頭寫 `**Phase**: 無 —— 獨立 CH`，三段解析全部落空。
量了射程：**35 個單檔記錄裡有 13 個（37%）**是這個形狀。
⇒ `AD-E5BlindToStandaloneCh-1` 🟡，並**用測試把盲區釘住**
（`test_unresolvable_authority_is_skipped_not_guessed`），讓它不會無聲漂移成「以為守到了」。

### ⛔ 我自己寫的 bug，以及它為什麼看起來像別的東西

第一次跑 self_test 得到：`E5 did NOT flag the stale fixture. Either PENDING_PATTERNS went stale or
the fixture was 'cleaned up'.`

**那個訊息把人指向 pattern，而真因是 scope**：`E5_SKIP_PARTS` 比對的是**絕對路徑**的 parts，
而 fixture root 自己就住在 `__fixtures__` 底下 ⇒ **整棵 fixture 樹被自己的排除規則吃掉**。
已改成比對**相對路徑**，並留下具名回歸測試 `test_fixture_scan_is_not_swallowed_by_its_own_skip_list`。

⚠️ 附帶一次同型錯誤：我第一次量 exit code 時管線末端是 `head`，拿到的是 `head` 的 `0`。
這在 `AD-ShaDetectorConsoleEncoding-1` 記過。之後改為重定向到檔案再讀 `$?`。

### 四個落點：措辭一致改用機械驗證

| 落點 | 位置 |
|---|---|
| `.claude/rules/task-workflow.md` §Closeout Self-Check | Matrix row 之後 |
| `.claude/commands/phase-closeout.md` §Closeout Self-Check | `status:` 那格之後 |
| `_templates/phase/retrospective.md.tpl` §Closeout Self-Check | `status:` 那格之後 |
| `_templates/phase/checklist.md.tpl` §4.2 | ⚠️ **`PR-pending` 格排在 `Commit → PR` 之後** |

⭐ 最後一列是刻意的：翻標記在 merge 之後才做得到。**AC-5 約束措辭不約束位置**（plan R11）。

**驗證方式從「逐處對讀」換成可重跑的指令** —— 對兩格各取 md5：

| 格 | md5（4 個檔全同）|
|---|---|
| ADR 格 | `b164af498534` |
| `PR-pending` 格 | `4e3fa0fcfa5a` |

「對讀」正是 `AD-ProxyMetricAsAnswer-1` 會出事的地方。

**byte 預算**：`task-workflow.md` **25,435 → 25,954 / 32,000**（headroom **6,046**）⇒ plan R5 未觸發。

### Gate（逐項實測輸出）

| Gate | 結果 |
|---|---|
| `format:check`（api + web）| `All matched files use Prettier code style!` ×2 |
| `lint` / `type-check`（api + web）| clean ×2 / clean ×2 |
| `test -w apps/api` | **484 passed / 40 suites** |
| `test -w apps/web`（**單獨跑**）| **`Test Files 10 passed (10)` · `Tests 95 passed (95)`** |
| `build` | `✓ Compiled successfully in 36.5s` · `✓ Generating static pages (25/25)` |
| `run_all` | **9/9** |
| detector 測試（CI 的跑法）| **4 檔**：13 + 18 + **19** + 8 = **58 tests** OK |
| `check_status_markers` 單跑耗時 | **2.6 s**（`lint-detector-authoring.md:82` 的門檻）|

⚠️ **`path-references` 中途紅了 27 條** —— 全部是測試裡的**合成路徑**（`W50-x` / `CH-900-z` 等，
本來就不該存在）。依 repo 既有慣例（`test_sha_anchors.py:58`）逐行加 `# path-check: ignore — synthetic`。
⛔ **沒有放寬 detector** —— 放寬會讓真的 stale 路徑也一起溜過去。

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 2（Day-1 commit `12:07:28` → full gate 綠 `12:31:14`）| **≈ 24 min** |
| 對照 plan §7 的 Day-2 bottom-up（E5+fixture+測試 1.5 hr + 四落點 0.5 hr）| 2.0 hr ⇒ ratio **≈ 0.20** |

> ⚠️ 同 Day 1 的但書：**單日 ratio 不可直接校準**。本日另有一個 Day 1 沒有的偏差來源 ——
> **E5 有藍本**（E1–E4 就在同一個檔裡），而 bottom-up 是按「寫一個新 detector」估的。
> 這正是 W22 retro 抓到的形狀：**有藍本的東西被當成沒藍本估**。Day 4 一併寫進 calibration-log。

---

## Day 3 — 2026-08-19 — 負面驗證（⛔ 不是 drive-through）

_本片零 user-facing 變更，無真 UI 可開 ⇒ 報告一律「**gate-only verified**」。
取代 drive-through 的是下方的負面驗證（`AD-NegativeGate-1` 的形狀）。_

### 3.1 乾淨狀態

- `git status --short` → **空**（clean）· HEAD **`6e1cf28`**
- fixture 5 個檔全在
- ⚠️ Risk Class C **N/A** —— 本片零 runtime 變更。
  （本日稍早兩個 **W22 drive-through 留下的**背景程序被停掉：Next.js dev server + API server。
  與本片無關，且本片所有 gate 都是離線的。）

### ⛔⭐ 預測（**寫在執行之前，並先 commit**）

> **為什麼要先 commit**：`AD-ProxyMetricAsAnswer-1` 與 W19/W22 的教訓都是「事後宣稱預測」無法查證。
> 這一節的 commit 時間戳早於下一節的執行，git 可以證明，我的說法不必被採信。

**受測物**：`scripts/lint/check_status_markers.py` E5 + `tests/test_status_markers.py`（**19 tests**）
+ fixture 樹。基準：全綠（`run_all` 9/9 · E5 tests 19 OK · `check_status_markers` EXIT 0）。

⭐ **「預測維持綠」的格子和「預測轉紅」的格子一樣重要** —— W19/W22 都證明前者才是買到東西的地方：
一個對什麼都開火的 detector 同樣能通過「它會紅」的測試。

| # | 情境（要做什麼） | 預測：`check_status_markers` 直跑 | 預測：19 個測試裡**具體哪些**紅 |
|---|---|---|---|
| **S1** | 不動任何東西（基準複現）| 🟢 EXIT 0，`E1/E2/E3/E4/E5 clean` | **全 19 綠** |
| **S2** | 刪掉整個 fixture 目錄 | 🔴 `SystemExit`：`E5 self-test fixture missing` | `test_self_test_runs_both_directions` · `test_instrument` · `test_fixture_scan_is_not_swallowed_by_its_own_skip_list` · `test_live_repo_is_clean` · `test_detector_does_not_fire_on_documents_about_the_defect` 紅（後兩者因呼叫 `_assert_instrument_works`）|
| **S3** | 「修好」W99 fixture（marker 翻成 MERGED）| 🔴 `SystemExit`：`E5 did NOT flag the stale fixture` | 同 S2 那 5 個 |
| **S4** | 把 W98（負面對照）的 plan 改成 `closed` | 🔴 `SystemExit`：`E5 flagged a LEGITIMATE pending marker` | 同上 5 個 —— ⚠️ 但**訊息會誤導**：真因是 fixture 被改壞，不是 E5 誤擋 |
| **M1** | **變異**：判斷條件反向（`!= "closed"`）| 🔴 `SystemExit`（W98 被擋）| 上述 5 個 + `test_pending_marker_on_an_open_artifact_is_accepted` + `test_pending_marker_on_a_closed_artifact_fires` + `test_authority_*` ×2 + `test_templates_are_excluded` + `test_find_violations_includes_E5` |
| **M2** | **變異**：拿掉遮蔽（`mask_non_prose` 直接回傳原文）| 🔴 真 repo 噴出大量命中（**談論本缺陷的散文**）| `test_prose_in_backticks_does_not_fire` · `test_html_comment_does_not_fire` · `test_fenced_block_does_not_fire` · `test_detector_does_not_fire_on_documents_about_the_defect` · `test_live_repo_is_clean` |
| **M3** | **變異**：刪掉 `PR 待開` 這條 pattern | ⚠️ **預測 🟢 EXIT 0（仍然綠）** —— 因為那 5 個真陽性今天已經修好了 | **只有** `test_every_enumerated_marker_format_matches` 紅 |
| **M4** | **變異**：授權解不出來時**當成 closed**（猜）| ⚠️ **預測 🟢 或小量紅 —— 信心較低**，因為 CH-006/007 已修好；若仍有未知的裸 marker 就會紅 | `test_unresolvable_authority_is_skipped_not_guessed` 紅 |
| **M5** | **變異**：`find_violations` 不再收 E5 | ⚠️ **預測 🟢 EXIT 0（完全看不出來）** —— E5 目前零違規，收不收結果一樣 | **只有** `test_find_violations_includes_E5` 紅 |

**三個預測本身就是結論**（若成立）：

1. **M3 / M5 說明「真 repo 全綠」這個 gate 在缺陷修好之後就失去偵測力** ——
   ⇒ 守住射程的是**具名的單元測試**，不是 live-repo 那一條。
2. **M5 是 Potemkin 的教科書形狀**：檢查跑了、但沒有被收集，而**任何 end-to-end 觀察都看不出來**。
3. **S4 的錯誤訊息會指錯方向**（跟我 Day 2 自己踩的 scope-vs-pattern 是同一類）⇒ 值得記一條 AD。

**復原方式**：每個情境跑完 `git checkout -- <path>` 還原，並以 `git status --short` **確認空**才進下一個。

> 預測 commit：**`ac9c20c`**（`13:31:04`）。執行在其後。

### 執行結果：預測 vs 實際

| # | 預測 detector | 實際 detector | 預測紅 | 實際紅 | 判定 |
|---|---|---|---|---|---|
| **S1** | 🟢 EXIT 0 | 🟢 EXIT 0 `E1/E2/E3/E4/E5 clean` | 0 | 0 | ✅ |
| **S2** | 🔴 `fixture missing` | 🔴 逐字相符 | 5 | **5** | ✅ **逐項相符** |
| **S3** | 🔴 `did NOT flag the stale fixture` | 🔴 逐字相符 | 5 | **5** | ✅ **逐項相符** |
| **S4** | 🔴 `flagged a LEGITIMATE pending marker` | 🔴 相符 | 5 | **4** | ❌ **我多預測 1 個** |
| **M1** | 🔴 | 🔴 `did NOT flag the stale fixture` | 11 | **9** | ❌ **我多預測 2 個** |
| **M2** | 🔴 真 repo 大量命中 | 🔴 **9 個誤報** | 5 | **5** | ✅ **逐項相符** |
| **M3** | 🟢 **仍然綠** | 🟢 EXIT 0 | 1 | **1** | ✅ |
| **M4** | 🟢 或小量紅（低信心）| 🟢 EXIT 0 | 1 | **1** | ✅ |
| **M5** | 🟢 **完全看不出來** | 🟢 EXIT 0 | 1 | **1** | ✅ |

**9 個情境，7 個逐項相符，2 個我預測錯 —— 兩次都是同一個方向。**

### ⛔ 我預測錯的兩格，以及它們告訴我什麼

| 情境 | 我以為會紅、實際維持綠的測試 | 真正的原因 |
|---|---|---|
| S4 · M1 | `test_fixture_scan_is_not_swallowed_by_its_own_skip_list` | 它斷言的是 `stale_pending(FIXTURE)` **非空**。W98 開始命中之後**更非空** ⇒ 綠得理直氣壯 |
| M1 | `test_templates_are_excluded` | `_templates` 的排除發生在**判斷條件之前** ⇒ 把條件反向根本影響不到它 |

⇒ **兩次都是「這個測試比我以為的窄」**，而不是測試失效。
⭐ 有價值的地方在於：**我對自己寫的測試射程的印象，兩次都比實測寬** ——
如果不做這個對照，我會在 retro 裡寫「19 個測試覆蓋了 E5」，而那是一句沒被量過的話。

### ⭐⭐ 本日最重要的結果：三個真實迴歸下，detector 全部回報 **OK**

| 變異 | 這是什麼等級的迴歸 | `check_status_markers` 說什麼 | `run_all` |
|---|---|---|---|
| **M3** 刪掉 `PR 待開` pattern | 射程直接少一種格式（**今天真的抓到過一個**）| `OK (30 pre-doc(s), E1/E2/E3/E4/E5 clean)` | **9/9** |
| **M4** 授權解不出來時用猜的 | 從「不猜」退化成「猜」—— 違反它自己的設計原則 | `OK ... E5 clean` | **9/9** |
| **M5** E5 算了但沒被收集 | **檢查跑了、結果被丟掉** | `OK ... E5 clean` | **9/9** |

⛔ **`run_all` 9/9 不是「E5 有效」的證據。** 三個都讓它維持 9/9，其中 M5 是教科書等級的 Potemkin：
函式跑了、結論沒有進入聚合，而**任何 end-to-end 觀察都看不出來**。

⇒ **真正守住射程的是具名的單元測試**，各自只有 **1 個**測試會紅（M3 / M4 / M5 各一）。
⚠️ 而那 3 個測試，如果哪天有人覺得「這測試看起來很囉唆」而刪掉，**不會有任何 gate 反對**。

**這也回答了「為什麼 live-repo 那條斷言不夠」**：Day 2 修好 5 個真陽性之後，
`test_live_repo_is_clean` 對 M3 / M4 完全無感 —— **一個 gate 的偵測力會隨著它守的缺陷被修好而歸零**。

### M2 的 9 個誤報 —— 遮蔽層擋掉的具體是什麼

| 檔案 | 它其實在說什麼 |
|---|---|
| `W21-*/retrospective.md:7` | ⭐ **HTML comment 裡的裸標記，而那個檔已經修對了** —— 正是我預測的那一個 |
| `W04` · `W14` · `W16` · `W17` · `W19` 的 checklist | 「**N 處 `PR-pending` 已翻**」—— **記錄自己做對了的檔，會被判成做錯** |
| `BACKLOG.md:470` · `STATUS_AUDIT.md:125` | 本缺陷的 AD 條目與審計條目 |
| `CH-036-*/checklist.md:124` | 另一個 detector 的 closeout 步驟描述 |

⇒ 沒有遮蔽層，E5 上線第一天就會對 **9 個無辜的檔**開火，其中 6 個是「做對了並記錄下來」的檔。
**那樣的 detector 會在一週內被關掉**，而這正是 `lint-detector-authoring.md:232` 警告的結局。

### 本日修掉的一個缺陷（由本日的負面驗證找到）

S4 的錯誤訊息**指向錯的原因**：它寫「E5 flagged a LEGITIMATE pending marker」，
把讀者導向「E5 壞了」，而真因是**fixture 被改壞**。這與我 Day 2 自己踩的
scope-vs-pattern 誤導訊息**是同一類**（第 2 次）。

已改成明列兩個原因並指出**先查便宜的那個**（fixture 的 `git diff`）。
⚠️ 第一版改寫又寫錯了一次 —— 我寫「CHECK THE SECOND ONE FIRST」但便宜的是 **(a)** 且列在第一，
自己讀了一遍才發現，已修正。

### 最終狀態

| 檢查 | 結果 |
|---|---|
| `check_status_markers.py` | EXIT **0** — `OK (30 pre-doc(s), E1/E2/E3/E4/E5 clean)` |
| E5 測試 | EXIT **0** — **19 tests OK** |
| `run_all.py` | EXIT **0** — **9/9** |
| 工作樹 | 每個變異後 `git checkout` 還原並確認 **0 dirty**；最終只有訊息改寫那一個檔 |

⛔ **本片仍然是 `gate-only verified`** —— 零 user-facing surface，沒有車可以開。
負面驗證證明的是**這個守衛會擋住它宣稱會擋的東西**，不是「功能可用」。

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 3（預測 commit `13:31:04` → 最終狀態綠）| **≈ 12 min** |
| 對照 plan §7 的 Day-3 bottom-up（負面驗證 0.5 hr）| 0.5 hr ⇒ ratio **≈ 0.40** |

---

## Day 4 — 2026-08-19 — closeout

### 交付

`CH-043` · `retrospective.md` · calibration（matrix 1 行 + log 完整敘述）·
`RISK_REGISTER`（E2 延伸 + **新增 E6**）· `STATUS_AUDIT`（`AD-30` / `AD-43` CLOSED）·
`BACKLOG`（關 2 · 新增 1 · shipped pointer +1）· `CLAUDE.md` **2 行** ·
`MEMORY.md` 指標 + subfile · `plan.md` `status:` + 內文標記翻 `closed`

### ⛔⭐⭐ 兩件計畫外的事，而它們是本日最有價值的產出

**這兩件都不是靠 gate 發現的，是靠「把本片自己的產物拿來用」發現的。**

#### 1. 我 Day 2 的枚舉是窄的 —— 我枚舉了開放集合

讀 `CH-042` 只是為了抄格式，卻看到第 7 行 `**PR**: #86（pending）` ——
**第 6 種 marker 格式**，而 PR #86 早已 merged。重做一次正確的枚舉
（`grep '^\*\*PR\*\*[:：]'`，把**欄位**撈出來逐行讀）之後：

| 漏掉的 | 為什麼 Day 2 沒抓到 |
|---|---|
| `#86（pending）`（`CH-042`）| 我的枚舉 grep 是**我想得到的拼法清單** |
| 裸 `待開`（`CH-016` / `CH-017`）| 我的 pattern 要求 `PR` 緊鄰 `待開`，而這裡是 `**PR**: 待開` |
| `#<TBD>`（`CH-032`）| `#TBD\b` 配不到 `#<TBD>` |
| `#61（pending）`（`memory/project_w13_*.md`）| ⛔ **搜錯範圍** —— 我只掃了 `docs/` |

⇒ **E5 上線時對 9 個活的 stale marker 漏了 4 個（44%）。**

⛔ **正解**：marker **欄位**（`^\*\*PR\*\*:`）是**封閉且可 grep** 的；它的**值**不是。
已改為「**錨定欄位 + 分類值**」+ 2 個新測試（新格式全中 / 5 種已解析值不得誤報）。
加寬後 E5 立刻自己抓到 3 個（含 `memory/` 那個**我人工也漏掉的**）。

⚠️ 諷刺：我在 Day 2 的 commit message 裡引用 `AD-NarrowPatternWideClaim-1` 說明自己做對了什麼，
而我當時正在犯它，只是升了一層。→ 已把這個實例寫回該 AD。

#### 2. 我是自己這個 gate 的第一個使用者，而它擋住了我

模擬 closeout（翻 `status: closed`）→ **E5 對 `CH-043` 與 `plan.md` 開火**，
其中 `plan.md:280` 那一行**正是 R4 本身的文字**（「合法的 `PR-pending` 不可被擋」，唯一沒加反引號的一處）。
**detector 對警告它不該開火的那句話開火了。**

根因是流程順序：closeout **先翻 status、後開 PR**（`phase-closeout` §4.5 在 §7 之前）
⇒ 從 closeout commit 到 post-merge commit 之間，「closed + pending」**兩者都對**。
**這個 PR 自己的 CI 會紅。**

⇒ 加 **landed gate**：`_closed_on_origin_main()` —— E5 只裁決**已經落在 `origin/main` 上**的 closeout。

⚠️ **plan R4 預言過這個缺陷，而我照樣做出來了** —— 因為負面案例（`W98-fixture-active`）
測的是「pre-doc 還 **active**」，真實誤擋情境是「pre-doc 已 **closed 但還沒 merge**」。
**方向對了，狀態錯了。**

**做這個修正時又踩了兩個坑，都留了具名測試 / 註解**：

| 坑 | 症狀 |
|---|---|
| `subprocess` 預設 cp1252 解碼 | 撞到 pre-doc 的中文就丟 `UnicodeDecodeError`，而它在 reader thread 裡，**幾層之外才以 `stdout is None` 浮出來**。同族：`AD-ShaDetectorConsoleEncoding-1` |
| landed 檢查放在 index 建立處 | 對**每一個** closed pre-doc 查 git ⇒ detector **2.6 s → 8.2 s**。改成只對**真的命中的 owner** 查 + memoise ⇒ 回到 **2.6 s** |

### ⛔⭐⭐ 第三件事：final gate 推翻了我 Day-0 的另一個歸因

final sweep 的 web 測試第一次跑就回報 **`Test Files 1 passed (1)` / `Tests 5 passed (5)`** ——
**而那是單獨跑**。Day 0 我判定「**合併跑**才會只跑一部分」，並據此把緩解訂為「web 一律單獨跑」。
**那個緩解擋不住任何東西。**

連跑 5 次：**1 次部分 / 4 次完整**。且**部分跑執行的永遠是
`src/app/api/demo-session/demo-session.test.ts`（恰好 5 個 test，字母序第一個檔）**
⇒ 症狀是「**跑完第一個檔就停，並回報 passed**」。⛔ **仍不宣稱機制。**

⇒ **唯一與機制無關的緩解：把檔數當斷言** —— 每次都必須看到 `Test Files 10`。
`AD-UndiagnosedWebTestFailure-1` 已更正（含被推翻的歸因）。

### Final gate

| Gate | 結果 |
|---|---|
| `format:check` / `lint` / `type-check`（api + web）| clean ×2 / 0 / 0 |
| `test -w apps/api` | **484 passed / 40 suites** |
| `test -w apps/web` | ⚠️ 首跑 **1/5**（見上）→ 最終確認 **`Test Files 10 (10)` / `Tests 95 (95)`** |
| `build` | `✓ Compiled successfully` · `Generating static pages … (25/25)` |
| `run_all` | **9/9** |
| detector 測試（CI 的跑法）| **4 檔** 13 + 18 + **24** + 8 = **63 tests** |
| `check_status_markers` 耗時 | **2.6 s**（landed gate 加入後一度 8.2 s，已修）|

**gate 射程聲明**：本地跑不到 —— gitleaks · semgrep · trivy · SBOM · 映像 build 與啟動探測（只在 CI）。
**新的 CI 依賴**：E5 的 landed gate 需要 `origin/main` 可解析（`fetch-depth: 0`，
`check_sha_anchors` 已經有同樣要求）。

### 本日耗時

| 項目 | 實際 |
|---|---|
| Day 4（Day-3 commit `13:36:53` → final gate 綠）| **≈ 60 min** |
| 對照 plan §7 的 Day-4 bottom-up（closeout 1 hr）| 1.0 hr ⇒ ratio **≈ 1.00** |

> ⚠️ **這個 1.00 是巧合，不是準確度。** 其中**超過一半**是上述三件計畫外的工作。
> 純 closeout 約 **25 min**（ratio ≈ 0.42，與其他 Day 一致）。
> ⇒ **phase 聚合 ratio 0.62 因此偏高** —— 已寫進 retrospective Q2 與 calibration-log。

---

## Post-merge — 2026-08-19 — ⭐ 守衛在自己身上完成了一次完整循環

**PR #89 MERGED** `2026-08-19T06:26:58Z`，merge commit **`bca8373`**（rebase merge，**SHA 第 16 次改寫**）。
以 `gh pr view 89 --json state,mergedAt,mergeCommit` 驗證，不採信狀態欄。

### ⭐⭐ E5 在 closeout 落地的那一刻自己叫了 —— 8 處

`git pull` 之後 W23 的 pre-doc 已在 `origin/main` 上 ⇒ landed gate 解除 ⇒ **E5 立刻轉紅**：

| # | 位置 | 性質 |
|---|---|---|
| 1-5 | `retrospective.md:6` · `CH-043:7` · `memory/project_w23_*.md:6` · `MEMORY.md:95` · **`CLAUDE.md:79`** | ✅ **真標記** |
| 6-8 | `plan.md:279` · `progress.md:496` · `retrospective.md:153` | ⚠️ **散文誤報** |

⭐ **第 5 個是 `CLAUDE.md:79`** —— 也就是 `AD-46` 當初真正造成傷害的那一格
（W22 期間它對每個 session 宣告「W21（PR #84 開著）」，而那個 PR 已經 merged 十小時）。
**這一次它被機械抓到了，而不是靠一次跨來源審計。**

### ⚠️ 3 個散文誤報 —— 一個我 Day 4 識別出來卻沒有做完的修正

Day 4 我寫下：「landed gate 讓 W23 在 merge 前被跳過，**但 merge 之後 E5 會對
`plan.md:280` 的散文永遠開火**，所以 D2 仍需要加反引號。」
**然後我沒有去加。** 它就照著我自己寫的預測發生了。

⇒ 已補上反引號（與 repo 全域慣例一致 —— 其餘每一處散文提及都是 `` `PR-pending` ``）。
⛔ **沒有放寬 detector** —— 放寬會讓真標記一起溜過去。

### 處置

| 類別 | 動作 |
|---|---|
| **5 個真標記** | → `**MERGED** (PR #89, \`bca8373\`) —— 2026-08-19T06:26:58Z，經 \`gh pr view\` 驗證` |
| **3 個散文** | 加反引號 |
| **7 個 stale SHA anchor**（第 16 次改寫）| `d5affd6` → **`6e1cf28`** · `c67a38a` → **`ac9c20c`** |

### 驗證

| 檢查 | 結果 |
|---|---|
| `check_status_markers` | **OK** —— `E1/E2/E3/E4/E5 clean; E5 landed-gate ACTIVE` |
| `check_sha_anchors` | **OK** —— every documented SHA resolves |
| `run_all` | **9/9** |
| **CI（PR #89，6/6 綠）** | ⭐ log 逐字確認 **`E5 landed-gate ACTIVE`**（不是 INERT）· detector 測試 **4 檔 64 tests** · web **`Test Files 10 passed (10)`** |

> ⭐ **CI 那一行是本片最後一個買到的東西**：`fetch-depth: 0` 我事前查過 workflow 確認有設，
> 但「查過設定」與「它真的生效了」是兩件事 —— 現在是 log 印出來的，不是我推論的。
