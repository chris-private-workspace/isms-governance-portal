# Phase W23 — Checklist (settle the local-password conflict + give closeout its missing cell)

[Plan](./plan.md)

> ⛔ **本片有一個硬阻塞**：§3.6 的 **D1 未拍板不可寫 ADR 內文**（plan R1）。
> 未取得裁決則**只做 (B)**，(A) 留 `[ ]` + 🚧，phase 收為 `closed_partial`。

---

## Day 0 — Plan-vs-Repo Verify（三-prong）+ Branch

### 0.1 三-prong Day-0 verify（對照 `main` HEAD **`c2f823c`**）

> 完整程序：`docs/rules-on-demand/day0-plan-verify.md`

- [x] **Prong 1 — path verify**：`docs/14-adr/0015-*.md` **不存在** ·
      九個 EDIT 目標全部存在 · **`CH-043` 未被佔用** · **ADR `0015` 未被佔用**
  - Verify: `ls docs/14-adr/` + `ls docs/03-implementation/changes/ | sort -V | tail -1`
  - ✅ **四項預測全中**（ADR 最大號 `0014` · changes 最大號 `CH-042`）
- [x] **Prong 2 — content verify**（drift → progress.md）:
  - [x] **D-adr-password** — ✅ 逐字相符：`:102` 寫著 `no local credential store`
  - [x] **D-05-conditional** — ✅ **如預期且更強**：`05:7` =「does not store passwords itself
        **where an IdP can be used**」，而 `:102` 引用時**截斷了條件子句** ⇒ 語義被改變
  - [x] **D-login-no-password** — ✅ **零 input**；⚠️ `grep -c` 回報 **1**，逐行讀後確認是 `:23` 的註解
  - [x] **D-profile-disabled** — ✅ `:423` 註解 + `disabled` prop
  - [x] **D-adr-china** — ✅ 四處全中；⚠️ **`:145` 額外引著 ADR-0006，而 0006 已被 0010 取代**
  - [x] **D-adr-fc** — ✅ **如預期且更強**：可證偽條件有 **3 條不是 2 條**，
        **FC3「group IT 改用別的 IdP」是健康的** ⇒ 保留它（`AD-43` 漏點名）→ plan R10
  - [x] **D-closeout-cells** — ✅ 四個都沒有那兩格；⚠️ **`grep -ci ADR` 回報 3/5/0/0 差點誤判**，
        逐字讀 Self-Check 區塊才確認 ⇒ 命中數不是證據
  - [x] **D-e4-exemption** — ✅ 「E4 fires only when the sibling **HAS** a status field」
  - [x] **D-rules-budget** — ✅ 預算 **32,000** / 現值 **25,435** ⇒ headroom **6,565** ⇒ **R5 未觸發**
  - [x] ⭐ **D-adr-breakglass（未預測，Day-0 新發現）** — ⛔ **ADR-0007 其實*要求* break-glass**
        （`:67` 指派給 Entra emergency access accounts · `:103` 引 `05:49` · `05:57` 明訂該控制）
        ⇒ 衝突比 plan 記的**窄且尖銳** → plan R9
- [x] **Prong 2.5 — child component tree** — **N/A**（非前端頁面 phase）
- [x] **Prong 3 — schema verify** — **N/A**（零 schema 變更、零 migration）
- [x] **D-baselines** — 逐項實跑，全部與 plan 宣稱相符
  - ✅ api **484 / 40 suites** · web **95 / 10 files**（**單獨跑**）· lint / type / format clean ·
    build clean（25/25 靜態頁）· `run_all` **9/9** · entity **34/36** · BACKLOG **173**
  - ⛔⭐⭐ **而合併跑抓到一件比漂移嚴重的事**：`test -w apps/api -w apps/web` 的 web 那半
    回報 **`Test Files 1 passed (1)` / `Tests 5 passed (5)`** —— **它沒有紅，它「通過」了**。
    三次量測（合併 1/5 ⛔ · 單獨 10/95 ✅ · 合併 10/95 ✅）⇒ **間歇、未重現、機制不明**。
    `AD-UndiagnosedWebTestFailure-1` 升級 🟢 P2 → 🟡 P1
- [x] **Catalog drift** — progress.md Day-0 表格（5 條 drift + 1 條 baseline 異常）
- [x] **Go/no-go** — **~10-15%（≤ 20% 帶）** ⇒ **繼續 Day 1**，finding 記入 plan §Risks R9-R11
- [x] ⛔ **D1 裁決已取得**（plan §3.6）—— ✅ **(a) break-glass 應急路徑**（使用者 2026-08-19）
- [x] **⏱ 寫入本日耗時到 progress.md** —— Day 0 **≈ 15 min**（`11:27:55` → 完成，est 30 min，ratio ≈ 0.50）

### 0.2 Branch

- [x] `git checkout -b feature/W23-adr-and-closeout-gate`（從 `main` `c2f823c`）

---

## Day 1 — ADR-0015 (US-1, US-2, US-3)

### 1.1 起草 ADR-0015

- [x] **`docs/14-adr/0015-<slug>.md` —— §Decision 明確回答 D1**
  - DoD: 三個選項逐一列出並說明**為何否決另外兩個**；決定寫成可執行的句子而非傾向
  - Verify: 人工讀 + `python scripts/lint/run_all.py`
  - ✅ `0015-identity-provider-and-local-break-glass.md`（284 行）。**選項寫成 4 個不是 3 個** ——
    Day-0 `D-adr-breakglass` 揭露 ADR-0007 實際選的是 **A（Entra emergency accounts）**，
    那是 D1 的三個選項裡沒有的第四個，且是**現行狀態**，不列出來就沒有東西被取代
  - ⭐ **§Decision 回答的是「break-glass 可不可以是本地的」**（plan R9），不是「該不該有」
  - ⭐ 四個管控寫成**可執行句**：本地 MFA（**禁止 email OTP —— 群組信箱由 Entra 撐**）·
    託管發放零自助 · **稽核寫入與發 session 同一交易，寫不進去就拒絕登入** · ≤60 min + 用後即焚
- [x] ⭐ **可證偽條件：每一條都能指出今天可觀察的觸發路徑**
  - DoD: ⛔ 不得再出現 FC2 那種「以不存在的東西為條件」
  - Verify: 逐條寫出「什麼事情發生時它會 fire」，寫不出來就重寫那一條
  - ✅ **5 條，每條帶一句 `*Fires when*:`**。FC1/FC2 承接自 0007（FC1 數字修 14→13、
    FC2 = 原 FC3 原封保留）· FC3/FC4/FC5 為新增
  - ⭐ **FC3 是本片自己買的保險**：break-glass 演練若不能在不碰 Entra 的情況下完成 ⇒ 這條路是裝飾品。
    ⛔ **演練列為 M4 done 的前提**，否則 FC3 沒有 fire 的場合（`AD-DeferralUnwatched-1` 的形狀）
  - ⭐ **FC5 用平台自己的稽核軌跡偵測「B 漂移成 C」** —— 這正是管控 3 存在的理由
  - ⚠️ **FC4 是知情接受的洞**：同一次事故同時打掉 Entra 與資料庫時，管控 3 讓 break-glass fail-closed
    ⇒ 完全進不去。**寫出來而不是繞過**
- [x] **重述 ADR-0007 的正確部分**（Entra ID 的選擇與理由）
  - DoD: ⛔ 不可寫「其餘同 0007」—— 那讓讀者必須讀一份已被取代的檔（plan R3）
  - ✅ 獨立一節「Restated from ADR-0007」，6 條逐項重寫（vendor / protocol / 交付物政策全保留 /
    Keycloak 仍否決 / SoD 非 IdP 提供 / entity scope 只能來自 session）
- [x] ⭐ **關 `AD-30`**：全檔零 Azure China 現在式敘述
  - Verify: `grep -c "Azure China" docs/14-adr/0015-*.md` → **0**（或僅出現在歷史脈絡段且明標過去式）
  - ✅ **實測 2 處，兩處都是否定式**：`:213`「an Azure China instance that this project
    **does not have and will not build**」（刪掉舊 FC2 的理由）· `:280`（列出本片關閉的 AD 名稱）。
    另 `identity plane` 3 處：`:86` 講 Keycloak（與中國無關）· `:184`「**gone, not inherited**」·
    `:277`「**does not exist**」⇒ 落在 DoD 的「僅歷史脈絡且明標」豁免內
- [x] ⭐ **關 `AD-43`**：OpCo 數為 **13**
  - Verify: `grep -n "OpCo" docs/14-adr/0015-*.md`
  - ✅ 3 處全部 **13**（`:186` 13 OpCos / 11 jurisdictions · `:217` 13 × 6 roles ·
    `:220` 明寫「corrected from 14 to 13」）。`grep "14 OpCo\|fourteen"` → **零**
- [x] **處理 `05:7` 的條件子句** —— ADR-0007 轉述時省略了它
  - DoD: 新 ADR 引用 `05:7` 時**帶著條件**，或明說為何在本專案條件恆成立
  - ✅ 2 處都帶條件（`:43` 引原文全句 + 指出 `0007:102` 把條件拿掉；`:81` 用它當法源）。
    ⭐ **條件子句就是本 ADR 的法源** —— Entra 掛掉時「IdP 用得上」為假，該句不構成禁令

### 1.2 ADR-0007 與索引

- [x] **`0007` 只改 Status 那一行 → `已被 ADR-0015 取代`**
  - DoD: ⛔ **內文一字未改**（`14-adr/README.md:143` 的鐵律）
  - Verify: `git diff docs/14-adr/0007-identity-provider.md` → 只有 1 行
  - ✅ **實測 `1 file changed, 1 insertion(+), 1 deletion(-)`** —— 逐字貼在 progress.md
  - ⭐ **`:67` 與 `:103` 的自我矛盾刻意留著不修** —— 0015 的 §相關 寫明理由：
    修掉舊檔等於抹除「它當初需要被解決」的證據
- [x] **`14-adr/README.md` 索引 +1 行 · 0007 Status 更新**
  - ✅ 兩行都改（0007 Status → 已被 0015 取代；索引尾端 +0015 一行）

### 1.x partial gate

- [x] `python scripts/lint/run_all.py` —— 含 `doc-links` · `path-references` · `rules-hygiene`
  - ✅ **9/9**（doc-links 驗過 0015 → 0007 / 0015 的相互連結；status-markers 仍 30 pre-doc）
- [x] **⏱ 寫入本日耗時到 progress.md**
- [x] **指標 repointing 的範圍裁決** —— ✅ 使用者 2026-08-19：**本片造成的當場修，既有漂移記 AD**
  - ✅ 修 **5 處**（plan §4 的 +1..+5）：`page-inventory.md:152` · `decision-form.md:46` ·
    `15-design-alignment.md:125` + §8.6 偏離表 · `architecture.md:110` · `.env.example:36`
  - ✅ 記 **2 條 AD**：`AD-DecisionTableSaysUndecided-1` 🟡（既有漂移）·
    `AD-ProfileChangePasswordNoFuture-1` 🟢（plan §3.6 推論 2）
  - ⛔ **我的第一次清單漏了 2 個**（`architecture.md:110` · `.env.example:36`）——
    我依 `architecture.md` 的**角色**分類而沒讀它 ⇒ `AD-ProxyMetricAsAnswer-1` 形狀，記入 plan R12
  - Verify: `grep -rn "ADR-0007" docs/02-architecture/ docs/*.md .env.example` →
    剩餘 3 處全部正確（`06-tech-stack:38` 待 AD · `15:250` 是**歷史事實**「Okta 是 0007 的輸入」·
    `15:257` 是本片自己寫的取代鏈敘述）
- [x] **BACKLOG 計數同步** —— detector 報 total 173→**175** / P1 93→**94** / P2 74→**75**，照抄

---

## Day 2 — closeout 的兩格與它的守衛 (US-4)

### 2.1 E5：`PR-pending` 的機械守衛

- [x] **`check_status_markers.py` +E5**
  - DoD: 檢查的是**矛盾**（pre-doc 已 `closed`/`closed_partial` 而標記仍 `PR-pending`/`#TBD`），
        ⛔ **不是「出現 `PR-pending` 就 fail」** —— closeout 當下它本來就該存在
  - Verify: `PYTHONIOENCODING=utf-8 python scripts/lint/check_status_markers.py`
  - ⚠️ **不得破壞 E4 的既有豁免**（`:42`「Missing sibling frontmatter is fine by design」）
  - ✅ 授權來源三段解析（**所在資料夾 → 同行 phase id → 檔頭 `**Phase**:`**），
    解不出來就**跳過不猜**。E4 豁免有專屬回歸測試
  - ⭐ **枚舉先於 pattern**（`lint-detector-authoring.md:67`）立刻付錢：撈出**第 5 種格式
    `PR 待開`**（ADR-0005:147，憑印象絕對寫不出來），且它是三個真陽性之一
  - ⭐ **遮蔽三類**（fenced / HTML comment / inline code）—— repo 裡談論 `PR-pending` 的
    散文比真標記多約 **10 倍**，全在反引號內；W21 retrospective 的補翻註記則是
    **HTML comment 裡的裸標記**，那是真實存在的誤判案例
  - ⛔ **第一版有 bug 且我修了**：`E5_SKIP_PARTS` 比對**絕對路徑**，而 fixture root 自己就在
    `__fixtures__` 底下 ⇒ 整棵 fixture 樹被跳過，self_test 報「沒抓到」。已加回歸測試
- [x] ⭐ **比對集合逐檔列名於測試，不靠一條 regex 的命中數**
  - DoD: plan R8 —— 審計 #8 剛示範過窄 pattern 會漏
  - ✅ `test_live_repo_is_clean` 斷言**集合**；`test_detector_does_not_fire_on_documents_about_the_defect`
    **逐檔列名** 4 個談論本缺陷的檔並先斷言它們存在（避免「檔名打錯 ⇒ 空集合 ⇒ 假綠」）
- [x] **E5 的測試：兩個方向**
  - DoD: (a) 矛盾狀態 → 紅 · (b) **closeout 當下的合法 `PR-pending` → 不可被擋**（plan R4）
  - Verify: `python -m pytest scripts/lint/tests/ -q`（或該 repo 的既有跑法）
  - ✅ **改用 `unittest` 直跑**（repo 既有慣例：proxy 下 `pip install` 拿到 0 byte wheel，
    `CH-007` 量過）。CI 用 glob 迴圈自動納入 ⇒ `3 → 4` 個測試檔，**不必改 CI**
  - ✅ **19 tests OK**（4 個檔合計 13+18+19+8 = **58**）
  - ⭐ **兩個方向住在同一棵 fixture 樹裡**（`W99-fixture-closed` 必紅 / `W98-fixture-active` 必綠），
    所以負面對照組**不可能被悄悄拿掉** —— 它是正面對照組的兄弟目錄
- [x] ⭐ **修掉 E5 找到的真陽性**（不是只寫 detector 就算）
  - ✅ **5 個 stale marker 全翻**，每個都用 `gh pr list --json number,mergeCommit` 查證：
    `CH-005` → **#6 `58d39ec`** · `CH-006` → **#7 `f4054f2`** · `CH-007` → **#9 `a7f5fd6`** ·
    `CH-041` → **#84 `700ef62`** · `ADR-0005` → **#31 `b20f3f1`**
  - ⛔ 其中 `CH-006` / `CH-007` **E5 看不到**（`**Phase**: 無`）⇒ 記 `AD-E5BlindToStandaloneCh-1` 🟡
- [x] **BACKLOG 計數同步** —— detector 報 total 175→**176** / P1 94→**95**，照抄

### 2.2 四個落點各補兩格

- [x] **`.claude/commands/phase-closeout.md`** —— ADR 格 + `PR-pending` 格
- [x] **`.claude/rules/task-workflow.md` §Closeout Self-Check** —— 同上
  - ⚠️ 先確認 `check_rules_hygiene.py` 的 byte headroom（plan R5）；
    不足則**精簡別處**而不是放棄那一格
  - ✅ **25,435 → 25,954 / 32,000**（headroom **6,046**）⇒ **R5 未觸發，未動別處**
- [x] **`_templates/phase/checklist.md.tpl` §4.2** —— 同上
  - ⚠️ **此處兩格的位置刻意不同**：`PR-pending` 格排在 `Commit → PR` **之後**（翻標記在 merge 之後
    才做得到）。⛔ AC-5 約束的是**措辭**逐字相同，不是位置（plan R11）
- [x] **`_templates/phase/retrospective.md.tpl` §Closeout Self-Check** —— 同上
- [x] ⭐ **四處措辭一致**
  - DoD: 避免 `AD-SpecMergeFieldByField-1` 的形狀（四份各寫各的，日後合併時無聲丟東西）
  - Verify: 逐處對讀
  - ✅ **改用機械驗證而非「逐處對讀」** —— 對兩格各取 md5：
    ADR 格 `b164af498534` ×4 · `PR-pending` 格 `4e3fa0fcfa5a` ×4 ⇒ **逐字相同**。
    ⭐ 「對讀」正是 `AD-ProxyMetricAsAnswer-1` 會出事的地方，本片改成可重跑的指令

### 2.x Full gate

- [x] `format:check` · `lint` · `type-check` · `test`（api + web）· `build` · `run_all` **9/9**
  - ✅ format `All matched files use Prettier code style!` ×2 · lint clean ×2 · type clean ×2
  - ✅ api **484 passed / 40 suites** · **web 單獨跑 `Test Files 10 passed (10)` /
    `Tests 95 passed (95)`**（⭐ Day-0 的規則：合併跑可能只跑一部分而回報綠，**記下檔數那一行**）
  - ✅ build `✓ Compiled successfully in 36.5s` + `✓ Generating static pages (25/25)`
  - ✅ `run_all` **9/9** · detector 測試 **4 檔 58 tests** 全綠
  - ⚠️ **`path-references` 曾紅 27 條** —— 全是測試裡的合成路徑（本來就不該存在）；
    依 repo 既有慣例逐行加 `# path-check: ignore — synthetic`，**不是放寬 detector**
- [x] **⏱ 寫入本日耗時到 progress.md**

---

## Day 3 — 負面驗證 (US-5) — ⛔ 不是 drive-through

_(本片**零 user-facing 變更**，無真 UI 可開。報告一律寫「**gate-only verified**」，
絕不暗示可用性。取代 drive-through 的是下方的負面驗證 —— `AD-NegativeGate-1` 的形狀。)_

### 3.1 乾淨狀態

- [ ] **確認工作樹只有本片的變更，無殘留 fixture**
  - DoD: `git status --short` 逐行可解釋
  - ⚠️ Risk Class C **N/A** —— 本片零 runtime 變更，無服務需要重啟

### 3.2 負面驗證（MANDATORY）

- [ ] ⭐ **E5 對一個刻意壞掉的 fixture 實測轉紅**
  - DoD: ⛔ **預測寫在執行之前** —— 預測哪一條會紅、哪些必須維持綠
  - Verify: 跑 detector，比對預測與實際
- [ ] **移除 fixture 後轉綠**
  - DoD: ⛔ **兩個方向都要跑** —— 只證明「會綠」證明不了它會擋
- [ ] ⭐ **合法的 `PR-pending` 不可被擋**（plan R4）
  - DoD: 造一個「pre-doc 仍 `active` + 標記 `PR-pending`」的狀態，E5 必須**維持綠**
  - ⛔ 否則每一次 closeout 都會紅，而那會讓人把 E5 關掉
- [ ] **把預測 vs 實際的對照表寫入 progress.md**
  - DoD: 表格形式，含「預測維持綠」那幾格 —— W22 證明那幾格才是買到東西的地方
- [ ] **⏱ 寫入本日耗時到 progress.md**

---

## Day 4 — closeout

### 4.1 Change record

- [ ] **`docs/03-implementation/changes/CH-043-<slug>.md`**（Problem / Root Cause /
      Solution / Verification / Impact —— 含**負面驗證 PASS** 與關掉的 AD）
  - ⛔ **Verification 段必須寫「gate-only verified」** —— 本片沒有 drive-through

### 4.2 Closeout

- [ ] `retrospective.md` Q1-Q7 + calibration（`docs / audit / template` **0.40**，**第 1 個資料點**）
- [ ] `calibration-matrix.md` 新增一行（**≤ 1 行 ~250 字元**，敘述 → `calibration-log.md`）
  - ⚠️ 該 class 在 live 表上**今天不存在**，本片是它的第一行
- [ ] Final gate sweep: `format:check` · `lint` · `type-check` · `test` · `build` · `run_all` 9/9
      + **gate 射程聲明**（哪些只在 CI 成立）
- [ ] ⭐ **ADR 格自檢（本片新加的那一格，第一次用在自己身上）**
  - DoD: 本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？有就在本片修，或開 AD
- [ ] ⭐ **`PR-pending` 格自檢** —— merge 後翻標記，並以 `gh pr view --json state,mergedAt` **驗證**
- [ ] 導航檔: `CLAUDE.md` Current-Phase + Last-Updated · `MEMORY.md` pointer + subfile ·
      `BACKLOG.md`（CLOSE `AD-LocalPasswordFallback-1` · `AD-30` · `AD-43` ·
      `AD-StalePrPendingNoDetector-1`）
- [ ] Anti-pattern 自檢（retro Q5）：AP-1..AP-7 → 違規數
- [ ] **⏱ 寫入本日耗時到 progress.md**
- [ ] **Commit** → ⏳ PR push + open → CI → merge: **PENDING USER CONFIRMATION**
      （push 是 outward-facing）→ merge 經 `gh` 驗證後翻狀態標籤
