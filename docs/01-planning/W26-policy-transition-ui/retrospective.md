# Phase W26 — Retrospective

**Phase**: W26 — 政策狀態推進的 UI 入口
**Period**: 2026-08-21 ~ 2026-08-21
**Plan**: [plan.md](./plan.md)
**PR**: **MERGED (#100, `1743be8`)** ＋ closeout **#101** —— ⚠️ **兩個**：#100 交付功能與 drive-through
並於 `2026-08-21T09:32:05Z` merge（`gh pr view` 驗證），**不含** Day 4；closeout 在 #101
**Change record**: `docs/03-implementation/changes/CH-048-policy-transition-ui.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 設計偏離記錄（`15-design-alignment.md`）| ✅ 完成（**§4.1 + §7**，位置與 plan 猜的不同）|
| US-2 | API 每個 policy 回應附 `allowed` | ✅ 完成（**三處**：`list` / `byId` / **`transition`**）|
| US-3 | `client.ts` 的 `patch<T>` + `ApiRefusedError` | ✅ 完成 |
| US-4 | `policies.ts` 的 `transitionPolicy` + `PolicyRow.allowed` | ✅ 完成 |
| US-5 | `page.tsx` 動詞按鈕 + `pending` + 三種失敗 | ✅ 完成 |
| US-6 | i18n 動詞 key × 2 locale | ✅ 完成（實際 **16 key** × 2，非預估的 6）|
| US-7 | Drive-through PASS + 截圖 | ✅ 完成 |
| US-8 | CH-048 + retro + calibration + 導航檔 + BACKLOG | ✅ 完成 |

**未完成項目**：無。**但交付的射程比 US 標題聽起來窄**，見 Q7。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `greenfield-feature`（**第 2 個**資料點）
- **Agent-delegated**: `no`（plan 宣告值；實際亦為 no —— 見 Q4）
- **Bottom-up est**: **17.0 hr**
- **Committed (calibrated)**: **9.35 hr**（mult 0.55）
- **Actual**: **~2.75 hr** —— ⚠️ **量法必須寫清楚**：
  commit 區間 **15:39 → 17:33 = 1.9 hr**（首「plan, checklist, and a Day-0…」→
  末「CI is green, and int runs 9.5x faster…」），加 Day 4 closeout（~0.6 hr）與
  plan 起草（commit 之前，~0.3 hr）。
  ⛔ **刻意用 subject + 時間而不是 SHA**：第一版寫了 SHA，PR #100 以 rebase merge 之後
  兩個 SHA **雙雙不再解析**，`check_sha_anchors.py` 當場打紅。
  ⇒ **量法不該錨在會被改寫的識別碼上** —— 那會讓它每次 rebase merge 失效一次。
  ⛔ **這是估計不是碼表**：本 repo 沒有逐任務計時，progress.md 的每日條目也沒有記時數。
  區間下界 1.9（純 commit 跨距），上界 ~3.0。
- **Ratio**: 2.75 / 9.35 = **0.29**
- **Band 判定**: **UNDER**（< 0.7）

**發生了什麼**：與 W22（同 class，ratio **0.46**）同向且更低。
bottom-up 的 17 hr 裡最大的三塊是 `page.tsx` 3.5 · client 寫入半邊 2.5 · 前端測試 2.5 ——
三者實際合計不到 1.5 hr。**不是因為做得少**（測試 +16 條、i18n 16 key、三條失敗路徑都做了），
而是 bottom-up 對「一個已知形狀的前端切片」系統性高估。

**行動**: **re-point `greenfield-feature` 0.55 → 0.45**。判準字面觸發（matrix 該行：
「若第 2 點同 < 0.7 → 0.45 且同時重估 bottom-up 方法」）。

⛔ **但這個 re-point 刻意不建立在 0.29 這個數字上。**
`AD-CalibrationT0PlacementShift-1` 明訂「3-phase 移動平均**不得跨量法計算**」，
而 W22 是**當日逐筆量測**、W26 是**事後由 commit 反推** —— **正是不同量法**。
⇒ 論證改成區間形式：推估的 actual 是**下限**（commit 跨距不含思考與閱讀）⇒ 真實 ≥ 2.75；
**即使翻倍到 5.5 hr，ratio 也只有 0.59 —— 仍然 < 0.7**。
⇒ 判準**在任何合理量法下都觸發**，re-point 不需要等一個更精確的分子。

⛔ **但 re-point 治標不治本，而 matrix 那行自己就這麼說了。**
`actual/bottom-up` 五個點：0.26 → 0.25 → 0.141 → 0.129 → **0.162**（本片）——
⚠️ **本片是這條單調下降序列的第一次回升**，所以「單調」這個描述從今天起不成立，
而 `AD-BottomUpEstimateInflated-1` 的論證不依賴單調性（它依賴的是**全部遠低於 1**）。
如實記錄，因為那條 AD 在 W25 被升為「已驗證」時引用了「四點單調下降」。

### ⭐ 第二個預測的結算（plan §7 登記，可證偽）

**預測：actual 落在 1.6 – 3.2 hr。** 實際 ~2.75 hr ⇒ **命中**。

⚠️ **命中的份量要打折**：那個區間寬 2 倍（1.6→3.2），而近四片的 actual 全部落在其中。
⇒ 它預測的其實是「W26 和最近四片差不多」，那是一個弱主張。
**下一次要縮窄區間才有鑑別力** —— 例如「落在 2.0–3.0」。
⭐ 這比「中了」本身重要：**一個永遠會中的預測不是預測**。

- [x] 已回填 `CALIBRATION-MATRIX.md`（≤ 1 行 ~250 字元）
- [x] 完整敘述已寫入 `CALIBRATION-LOG.md` §1
- [x] |R - 1.0| > 30% ⇒ AD 已記入 BACKLOG（沿用 `AD-BottomUpEstimateInflated-1`，不開新條）

---

## Q3 — Day-0 驗證的投報率

- Drift 數量：**8**（Prong 1: 0 / Prong 2: 8 / Prong 2.5: 0 / Prong 3: N/A）
- Day-0 成本：~30 min
- **預防的返工**：~2.5 hr
- **ROI**: ~**5×**

**最有價值的那個 drift**：**D2**（`allowedTargets()` / `canTransition()` / `isTerminal()` /
`POLICY_TRANSITION_EDGES` **都已存在**）。plan 打算重寫導出邏輯；D2 讓 §1.2 變成
「呼叫既有函式」而不是「寫第二份導出」——**若沒抓到，那就是一份與 `transitions.ts` 平行的真相**，
正是 ADR-0002 選窮舉 Record 要防的東西。

**第二有價值的是 D3**：它擋下我自己發明的動詞名「Return to draft」，
而正解 `changes requested` 就寫在 `02a:365`。⇒ 違反已確認參數 #9 的邊緣。
⭐ 而 D3 在 Day 1 **又收窄了一次**：那張圖只標了**一條**邊，
所以「照來源文件命名」這句話對其餘六條**根本無從遵守** —— Day 0 沒看出這一層。

---

## Q4 — 做得好的（保持）

- **中性化四次，預測全部寫在執行之前，四次逐條命中**（Day 1 兩次 + Day 2 兩次）。
  ⭐ N1（`advance()` 忽略 `to`）的價值特別高：**其餘每一條測試都點第一顆按鈕**，
  所以忽略參數的實作會讓它們全部照樣綠 —— 沒有這條中性化，那個行為從未被驗證。
- **「不重整」用 window marker 量，不用推論。** 點第一顆按鈕前種一個變數，
  頁面若重整它會消失；五次互動後仍存活。⇒ AC-5 有了可觀察的證據而不是「看起來沒閃」。
- **422 / 404 用 fetch 攔截只改請求、不碰回應。** 走的是真正的按鈕點擊路徑，
  回應是伺服器自己的判斷 ⇒ **不是 mock**，AP-6 不適用。
- **文案逐條唸而不是整批判斷。** 「Nothing was changed」對三個分支裡的兩個為真、
  一個為假 —— 整批判斷必然放它過去。
- **不派 subagent，而且理由寫下來了**（垂直切片 + 介面需要猜 + 命名脈絡轉述成本）。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 動詞按鈕從 `/policies` 主流量可達；無 PoC 目錄 |
| AP-2 Cross-directory scattering | 0 | ⭐ 刻意**不**把 `patch` 與 `get` 合併：兩者差在 422 的語義，合併只會多一個為了合併而存在的分支 |
| AP-3 Potemkin | 0 | **drive-through PASS**；本片存在的目的就是關掉一個 AP-3 |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | 無契約層、無 data library、`PolicyRow` 仍是「本 app 對線路的看法」 |
| AP-6 Mock vs real divergence | 0 | 失敗路徑走真伺服器；unreachable 是真的殺進程 |
| AP-7 命名 / orphan claim | **0（修掉 2 個）** | D4（`shell.inert` 說「沒有後端」）· D5（列註解說「沒有動作可停用」）—— ⭐ **兩者都是新增正確的 code 讓舊的真話變成假話**，沒有任何 lint 會叫 |
| **總計** | **0** | |

**Lint**: `run_all.py` **11/11** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-Adr0003Fc3Triggered-1` | 一份**已採納** ADR 的可證偽條件，其「現況」欄的證據基礎被本片改變；而**沒有任何機制會問起** —— 是 closeout 那一格的手動複查抓到的 | ⭐ 提議：ADR 的可證偽條件表若含「現況（日期）」欄，該欄應**被 closeout 檢查表點名**（現行那格問的是「ADR 是否變得不準確」，而 FC 的現況欄不是「不準確」，是**過期**）| 候選 |
| `AD-DiffEmptinessAsSafetyProof-1` | ⭐ **刪分支前的安全檢查用錯了工具，而它的輸出看起來像「不安全」** —— 我寫的是 `git diff HEAD..<branch>`，非空就判定不可刪。它**必然**非空：那 19 insertions 是**被我改掉的舊版本文字**（`CLAUDE.md` 的舊 `PR-pending` 字串），不是獨有內容。⇒ **一個檔案被修改過，雙向 diff 本來就都非空** | 「這個分支/檔案能不能刪」要用 **patch-id 比對**（`git cherry`）不是 diff 空不空。實測 `git cherry` 給 10 個 `-`、獨有 patch **0** ⇒ 安全。⚠️ 這是 `feedback_evidence_must_support_claim` 的新形態：**拿便宜的代理指標（diff 是否為空）回答一個需要 patch 級比對的問題**，而且它**偏向保守**所以不會被質疑 —— 「檢查說不安全」沒有人會回頭挑戰 | 候選 |
| `AD-WeakIntervalPrediction-1` | plan §7 的第二預測「1.6–3.2 hr」**命中了，但區間寬 2 倍且近四片全部落在其中** ⇒ 它預測的是「和最近幾片差不多」 | 登記可證偽預測時，區間寬度必須 < 最近三片 actual 的全距，否則不算預測 | 候選 |
| `AD-CalibrationNoTimeRecord-1`（**第 4 次**）| retro Q2 的 Actual 是**從 commit 時間戳推估的**，不是量到的 | ⛔ **修正我第一版的判斷** —— 我原本記成一條新 AD。它不是：**W22 已經發明並驗證了解法**（把提醒從 plan §7 的散文移到 **checklist 每個 Day 一個具名 `[ ]`**，四天四筆全中）。W26 復發的根因是**那個解法沒有進 frozen template**，只活在 W22 那一份 checklist 的實例裡 ⇒ 與 `AD-65` 同形：**已知的正確方法沒有被套用到第二個場合**。提議：`_templates/phase/checklist.md.tpl` 每個 Day 尾端加具名計時格（模板變更 ⇒ 需 2-3 phase 驗證後回流）| 驗證中(1/3) |

- [x] 已記入 `docs/01-planning/BACKLOG.md`（`AD-Adr0003Fc3Triggered-1` 等 6 條）

⚠️ 後兩條**未進 §Open 表**（它們是 retro 方法論的候選，尚未有第 2 個實例）。
⛔ 這正是 `status-audit` skill 警告的形狀 —— 「沒進表的 AD 對每一個工具都不可見」。
如實記在這裡，下一片若再現同一症狀就升上去。

---

## Q7 — Carryover

**帶到下個 phase 的**：

- `ADR-0003` FC3 是否觸發 → `AD-Adr0003Fc3Triggered-1`（**需使用者裁定**，本片刻意不決定）
- ⭐ **ROADMAP 對 M5 完全沉默** → `AD-RoadmapHasNoM5Slot-1`（**需使用者裁定**）——
  closeout 自檢「兩份都存在，收尾要同時改兩處」查出來的。逐項讀完 10 個項次：
  `OQ-4 spike`（4b）與 `OQ-6 spike`（3）都有列，而 **`OQ-7 spike`（W25）與 M5 的 UI 入口（W26）都沒有**
  ⇒ 這兩片是**繞過排序層**被選出來的。
  ⛔ **本片刻意不補一列** —— 補列會掩蓋真正的判準問題：ROADMAP 到底是「所有工作的排序」
  還是「AD / spike 的排序」？10 項裡 9 項是 AD 或 OQ spike ⇒ **後者才符合現況**，
  若是如此該修的是它的自我描述而不是補列
- `ADR-0002` vs `05:15` 的權威衝突 → `AD-Adr0002VsDesignDoc-1`
- 稽核缺 `actor_id` → 既有，等 **M4**
- refusal chip 樣式 / favicon → `AD-RefusalChipsLowContrast-1` · `AD-FaviconMissing-1`

**這個 phase 關掉的**：

- `AD-PolicyTransitionNoUiEntry-1` ✅ **CLOSED**

⛔ **關閉的射程必須跟著這條走**：本片證明的是「**任何**打開這個畫面的人都能推進政策狀態」，
**不是**「有權限的人能推進」。`AD-RbacUnenforced-1` 仍然開著，
而畫面上的 `policies.actions.noRoleCheck` 是它今天唯一的使用者可見承載。

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（**沒有**加 phase 歷史列）
      ⭐ **而這一格是被機械擋下來才做對的**：翻 PR 標記時我在 Current Phase 那格加了一句
      「⚠️ 兩個 PR：#100 不含 Day 4 closeout」的說明 —— `check_rules_hygiene.py` 當場報
      **30,037 > 30,000 bytes**。那句話是**歷史紀錄**，正是 closeout policy 禁止進導航檔的東西。
      ⇒ 拿掉後 29,931。⛔ **兩個 PR 的來龍去脈留在 retrospective / memory subfile / BACKLOG**，
      導航檔只留狀態指標。**byte 預算不是為了省空間，是為了讓「只能改 2 行」這條規則有牙齒**
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— 見下方註記
- [x] **`plan.md` frontmatter `status:` 已翻成 `closed`，內文標記一致（R9）**
- [x] ⭐ **已採納的 ADR 已複查（雙向）** ——
      **方向一**（本片是否讓既有 ADR 失準）：**ADR-0002 四條可證偽條件全部未觸發**
      （無 OpCo 分流 · 無 SLA/升級 · 無第三條流程 · 無執行期變更），
      且本片**強化**它（`allowed` 由 `modules` 層導出，證明編譯期表能服務執行期 UI 需求）。
      **ADR-0003 FC3 的現況欄過期** ⇒ `AD-Adr0003Fc3Triggered-1`。
      **方向二**（本片新產物是否違反更高權威）：§4.1 的動詞命名對已確認參數 #9 是**弱主張**，
      已在文件與 code 註解兩處明寫射程 ⇒ 不違反，但也不可被引用為「照程序命名」。
- [x] ⭐ **`PR-pending` 標記已翻** —— **PR #100 以 `gh pr view` 驗證為 MERGED**
      （`1743be8`，`2026-08-21T09:32:05Z`）。本片相關 **8 個檔案 11 處**，逐處處理。
      ⭐ **這次沒有漏算，方法變了**：改用 `Grep -o`，長行不再被折成
      `[Omitted long matching line]` —— **那正是前兩次少算的成因**，
      而不是「數的時候不夠仔細」（`AD-MarkerCountUnderReported-1`）。
      ⛔ **並非全部都要翻**：`CH-048:87`（「PR #100 的 CI 6/6」）與 `checklist:312`
      （「PR #100 已開」）是**歷史陳述且為真**，翻掉它們反而是竄改紀錄。
      翻的是宣稱**當前狀態**的那些。
      ⛔⭐ **而 detector 對這整件事沉默**：`check_status_markers.py` 是靜態的、**不查 GitHub**，
      所以 `PR-pending` 在 PR 被 merge 那一刻起就是假的，而它照樣回 clean。
      **只有 `gh pr view` 會說實話** —— 這正是那條規則寫「不採信宣稱」的理由
- [x] `python scripts/lint/run_all.py` 全綠

> **`RISK_REGISTER.md` 複查結果**：本片沒有讓任何一條活躍風險的敞口變大或變小。
> 最接近的是 **R8**（Entity Zero 在 Wave 1 無承載體）—— 不受影響。
> ⚠️ 但 `AD-Adr0003Fc3Triggered-1` **可能**屬於 register 的範疇（稽核可用性），
> 若使用者裁定 FC3 觸發，該條要進 register 而不只是 BACKLOG。
