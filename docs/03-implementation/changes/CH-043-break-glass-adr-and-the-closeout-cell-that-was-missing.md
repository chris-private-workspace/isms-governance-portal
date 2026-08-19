# CH-043: break-glass 從來沒有被禁止 —— 它被指派給了那個會壞掉的東西

**Date**: 2026-08-19
**Phase**: W23
**Scope**: `docs/14-adr`（ADR-0015 取代 0007）· 治理工具（`scripts/lint` E5）· 流程模板（四個 closeout 落點）
**Components**: —
**PR**: **MERGED** (PR #89, `bca8373`) —— 2026-08-19T06:26:58Z，經 `gh pr view` 驗證

---

## Problem

**兩件互不相干的事，共通點是「兩個有效的東西互相矛盾，而沒有任何機制會說出來」。**

**(A)** 2026-08-17 W19 drive-through 就 `/my-profile` 的「變更密碼」提出矛盾時，
使用者裁決**本地帳號流程應保留，作為本機開發與備用路徑**。而**已採納**的 ADR-0007
說平台不存密碼、登入頁不得有密碼欄位。兩個都有效，而它們不能同時為真
（`AD-LocalPasswordFallback-1`，🔴 P0，已卡兩個 phase）。它擋著 M4：`0007:90` 今天仍指示
「**M4 must define** how the six roles are provisioned in each [identity plane]」，
而規劃 M4 的人讀到它會照做。

**(B)** 審計 #7 指名 **18 條漂移**的根因是「phase closeout 的檢查表沒有一格是 ADR」。
**又過了一整個 phase（W22），那一格仍然沒有被加**（`AD-45`）。同時 `AD-46` 顯示 `PR-pending`
也沒有任何機械守衛：W21 的 PR **#84 於 2026-08-18T07:08:46Z 就 merged**，而四處 merge 標記
**全部沒翻，整個 W22 期間沒有任何東西發現**，`run_all` 一路 **9/9**。
代價已經付過一次：W22 的 `CLAUDE.md` Current-Phase 格寫著「W21（PR #84 開著）」——
一個已經 merged 十小時的 PR，被**每個 session 都會讀到的那一格**宣告為開著。

---

## Root Cause

**(A) 不是「還沒決定」，是 ADR-0007 自己前後矛盾，而它把一個緊急控制項指派給了會壞掉的東西。**

| 位置 | 它說什麼 |
|---|---|
| `0007:67` | `2 break-glass, P1 to Group CISO` → `no [deviation] — **Entra emergency access accounts**` |
| `0007:103` | break-glass「remain **platform features**, not Entra features —— Entity Zero controls that must be evidenced **from within the product**」 |

**這兩句不能同時為真**，而同一份檔的 `:136` 還寫著「Entra logs are not evidence-grade
**for this platform's** chain」。Entra emergency account 繞得過條件式存取，**繞不過 Entra 本身不可用**。

⇒ 真正的問題**不是**「該不該有 break-glass」（`05:57` 一直要求，交付物指定 2 個），
而是「**它可不可以是本地的、能在 Entra 掛掉時仍然可用**」。

第三個根因在轉述：`05:7` 原文是**條件句** ——「The platform does not store passwords itself
**where an IdP can be used**」——而 `0007:102` 轉述時**把條件拿掉了**，變成無條件禁令。
Entra 掛掉時「IdP 用得上」為假，該句因此不構成禁令。

**(B) 「指名根因」與「修掉根因」之間沒有任何機制。** 清單文字擋不住「收尾時漏一步」——
`AD-46` 已經證明；而 `check_status_markers.py` 的 E1–E4 只讀 pre-doc 自己的 `status:`，
`PR-pending` 完全在它的射程外。

---

## Solution

### (A) ADR-0015 取代 ADR-0007

**決定**：Entra ID 續任每一次一般 session 的 IdP；**另外**實作一條**完全不呼叫 Entra**
的平台本地 break-glass 路徑。

依據三條，全部在 repo 內：

- `04:64`「**no single points of failure in the critical path**」—— 現行設計下 Entra 正是那個 SPOF
- `05:7` 的條件子句（見上）
- ⭐ 交付物自己就把兩者當成不同的東西：`sessionPolicy.js` 在**同一條政策**裡同時寫著
  *local passwords disabled* 與 *two break-glass accounts*（`15:248-249`）

**四個管控**（缺一就只是把「一般本地登入」換個名字）：

1. **MFA 且不依賴壞掉的系統** —— 本地驗證的 TOTP / FIDO2。⛔ **禁止 email OTP**（群組信箱由
   Entra 撐著，那是循環依賴）
2. **託管發放，零自助** —— 由具名託管人離線保管；無註冊、無改密碼、**永不設密碼重設流程**；
   ⚠️ 不得出現在任何 seed / fixture / demo（guardrail 7）
3. **稽核先於放行，fail-closed** —— 寫入平台自己的 append-only hash chain 與**發 session 同一交易**；
   寫不進去就**拒絕登入**；**attempt 也記錄與告警**，不只 success
4. **時效且用後即焚** —— session ≤ 60 min、無 refresh；用過一次即作廢，須由託管人重新發放

**否決 A（Entra emergency accounts —— `0007:67` 實際選的）**：它在它自己存在的場景裡失效。

⭐ **同一行被兩用，自己指出來**：`0007:78-80` 用 `04:62` 否決 Keycloak，本 ADR 用同一行支持本地
break-glass。差別是**流量不是類別** —— Keycloak 承擔 100% 登入，break-glass 承擔 0%。
代價也寫出來了：零流量意味著**從不被演練**，所以 FC-3 把演練訂成 M4 done 的前提。

**順帶關掉住在 0007 裡的兩條債**：Azure China 現在式敘述（`AD-30`）· 死掉的可證偽條件（`AD-43`）。
⭐ **FC3「group IT 改用別的 IdP」原封保留** —— `AD-43` 漏點名它，而它是 0007 唯一還會 fire 的一條。

`0007` **只改 Status 一行**（實測 `1 file changed, 1 insertion(+), 1 deletion(-)`）；
它的 `:67` vs `:103` 自我矛盾**刻意留著**——本檔解決它，改寫舊檔等於抹除「它需要被解決」的證據。

### (B) E5 + 四個 closeout 落點

**E5**：某檔的 merge 標記仍是 pending，而**擁有它的 artifact 已經 closed** → FAIL。
⛔ **不對 `PR-pending` 本身開火** —— closeout 當下它本來就該在（closeout 文件寫在 merge 之前，
`git-workflow.md:222`）。開火的是**矛盾**。

授權來源三段解析（**所在資料夾 → 同行 phase id → 檔頭 `**Phase**:`**），
**三段都解不出來就跳過，不猜**。

**兩格**加在四個落點，措辭**逐字相同**（md5 `b164af498534` / `4e3fa0fcfa5a` ×4）。

---

## Verification

⛔ **本片為 `gate-only verified`** —— 零 user-facing surface，沒有車可以開。
取代 drive-through 的是**負面驗證**。

**Gate**: format / lint / type-check clean ×2 · api **484 passed / 40 suites** ·
web **單獨跑** `Test Files 10 (10)` / `Tests 95 (95)` · build `✓ 25/25` ·
`run_all` **9/9** · detector 測試 **4 檔**（13 + 18 + **21** + 8）。

### 負面驗證：9 個情境，預測**先 commit**（`ac9c20c`, 13:31:04）再執行

| 情境 | 預測 | 實際 | 判定 |
|---|---|---|---|
| S2 刪掉 fixture 目錄 | 🔴 `fixture missing`，5 個測試紅 | 逐字相符，**5** | ✅ |
| S3 把 fixture「修好」 | 🔴 `did NOT flag`，5 個測試紅 | 逐字相符，**5** | ✅ |
| S4 改壞負面對照組 | 🔴，5 個測試紅 | 🔴，**4** | ❌ 多預測 1 |
| M1 判斷條件反向 | 🔴，11 個測試紅 | 🔴，**9** | ❌ 多預測 2 |
| M2 拿掉遮蔽 | 🔴 真 repo 大量誤報 | 🔴 **9 個**，具名列出 | ✅ |
| M3 刪掉一種 marker 格式 | 🟢 **仍然綠** | 🟢 `OK ... E5 clean` | ✅ |
| M4 授權用猜的 | 🟢 | 🟢 `OK ... E5 clean` | ✅ |
| M5 E5 算了但不被收集 | 🟢 **完全看不出來** | 🟢 `OK ... E5 clean` | ✅ |

**7 / 9 逐項相符。**

⛔⭐⭐ **M3 / M4 / M5 是三個真實迴歸，而 `check_status_markers` 全部回報
`OK (30 pre-doc(s), E1/E2/E3/E4/E5 clean)`、`run_all` 全部 9/9。**
⇒ **`run_all` 9/9 不是「某個檢查有效」的證據。** 守住射程的是**具名單元測試**，
每個變異各只有 **1 個**會紅。→ `AD-GateGreenDecaysAfterFix-1`

**我預測錯的 2 格方向一致** —— `test_fixture_scan_*`（斷言非空，多命中只會更非空）與
`test_templates_are_excluded`（排除發生在判斷條件之前）。
**兩次都是「這個測試比我以為的窄」**；不做這個對照，retro 會寫成
「19 個測試覆蓋了 E5」——一句沒被量過的話。

### E5 找到並修掉的真 stale marker：**共 10 個**

| 位置 | 標記 | 真相（`gh pr list` 查證）| 誰抓到 |
|---|---|---|---|
| `CH-005/spec.md:12` | `#TBD` | #6 `58d39ec` | **E5** |
| `CH-041:7` | `#TBD` | #84 `700ef62` | **E5** |
| `docs/14-adr/0005-*.md:147` | `PR 待開` | #31 `b20f3f1` | **E5** |
| `CH-006:7` · `CH-007:7` | `#TBD` | #7 `f4054f2` · #9 `a7f5fd6` | 人工枚舉 |
| `CH-032:7` | `#<TBD>` | #66 `52a74ac` | **E5（加寬後）** |
| `CH-042:7` | `#86（pending）` | #86 `33efd4f` | **E5（加寬後）** |
| `memory/project_w13_*.md:5` | `#61（pending）` | #61 `91bd789` | **E5（加寬後）** |
| `CH-016:7` · `CH-017:7` | 裸 `待開` | #29 `c6a0bba` · #30 `5bbc252` | 人工枚舉 |

⚠️ **其中 4 個是 Day 4 才發現的，而它們暴露了 Day 2 的枚舉本身是窄的** ——
我枚舉的是「我想得到的拼法」（**開放集合**），正解是錨定 **marker 欄位**
（`^\*\*PR\*\*:`，**封閉集合**）再分類它的值。E5 已改為此設計 + 2 個新測試。
記入 `AD-NarrowPatternWideClaim-1`（**同一形狀升了一層**）。

---

## Impact

**關閉**：`AD-LocalPasswordFallback-1`（🔴 P0，卡兩個 phase）· `AD-30` · `AD-43` ·
`AD-StalePrPendingNoDetector-1`

**新增**：`AD-DecisionTableSaysUndecided-1` 🟡 · `AD-ProfileChangePasswordNoFuture-1` 🟢 ·
`AD-E5BlindToStandaloneCh-1` 🟡 · `AD-GateGreenDecaysAfterFix-1` 🟡 ·
`AD-GateMessagePointsAtWrongCause-1` 🟢

**解除阻塞**：**M4** 現在有一個明確的前提可以規劃 —— 它要建**兩條**路徑，
而 break-glass 的驗收含一次**不碰 Entra 的演練**（FC-3）。

**約束**：登入頁**不得**長出一般密碼欄位；break-glass 是**另一條專屬路由**，
rate-limited 且**在 attempt 時**告警；**本平台任何一個 wave 都沒有密碼重設流程**。

⚠️ **`/my-profile` 的「變更密碼」按鈕在本 ADR 之後仍然是錯的** ——
它的檔頭寫著「等 ADR 修訂」，修訂完成而答案是**否**。今天無害（disabled + 測試釘著 0 個密碼欄位），
⇒ `AD-ProfileChangePasswordNoFuture-1`，**本片刻意不改**（plan §4 宣告 `apps/**` UNTOUCHED）。

**指標 repointing**：ADR 取代連帶讓 6 處活的文件變 stale，已修（`page-inventory:152` ·
`decision-form:46` · `15-design-alignment:125` + §8.6 · `architecture.md:110` · `.env.example:36`）。
⚠️ **我第一次的清單漏了 2 個** —— 把 `architecture.md` 依**角色**分類成「薄轉址層」而沒有讀它。
既有漂移（`06-tech-stack:38` + `architecture.md:106-108` 把已採納的 ADR 顯示成未定）
記為 `AD-DecisionTableSaysUndecided-1`，未當場修。
