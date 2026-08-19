---
status: active  # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W23 Plan — settle the local-password conflict, and give closeout the cell it lacks

**Summary**: 兩件事併一片。**(A)** 裁決 `AD-LocalPasswordFallback-1`（🔴 P0，已卡兩個 phase）——
stakeholder 要保留本地密碼登入，而**已採納**的 ADR-0007 說平台不存密碼、登入頁不得有密碼欄位。
載體必須是 ADR（R5）。**(B)** 給 closeout 補上它缺的兩格（**ADR** 與 **`PR-pending`**），
一次修掉審計 #7 的 18 條的根因（`AD-45`）與 `AD-46`。
⛔ **本片的 (A) 極可能零產品 code** —— W19 已把 code 做成符合現行 ADR 的樣子。
非 spike，**不產出 design note**；**產出一份 ADR**。
⚠️ **Day 3 不是 drive-through 而是負面驗證** —— 本片無 user-facing surface 變更，
報告一律寫「gate-only verified」。

**Status**: **Approved-to-execute**（使用者 2026-08-19 —— 核可全片範圍，
並拍板 §3.6 的 **D1 = (a) break-glass 應急路徑**）

**Branch**: `feature/W23-adr-and-closeout-gate`
**Base**: `main` HEAD **`c2f823c`**（PR #88 status audit #8 merge 後，SHA 改寫第 15 次）
**Slice**: standalone —— 關 `AD-LocalPasswordFallback-1`（🔴 P0）·
順帶關審計 #7 的 **AD-30** 與 **AD-43**（兩者都住在 ADR-0007 裡，改它時不修等於明知故留）
**Scope decisions**: (a) ADR 用**新號取代**而非就地改（依 `14-adr/README.md:138-143`）
(b) 兩格補在**四個落點**而非一個 (c) `PR-pending` 那格要有**機械守衛**，不只是清單文字
(d) **不碰產品 code**，除非 (A) 的裁決要求

---

## 0. Background

### The gap（`AD-LocalPasswordFallback-1` 🔴 P0 · 審計 #8 的 `AD-45` / `AD-46`）

**(A)** 2026-08-17 W19 drive-through 就 `/my-profile` 的「變更密碼」提出矛盾時，
使用者裁決**本地帳號流程應保留**，作為本機開發與備用路徑。
而 ADR-0007（**已採納**）說的是相反的事。**兩個都有效，而它們不能同時為真。**

**(B)** 審計 #7 指名了 18 條漂移的根因 —— **phase closeout 的檢查表沒有一格是 ADR**。
**又過了一個完整的 phase（W22），那一格仍然沒有被加。** 同時 `AD-46` 顯示
`PR-pending` 也沒有任何機械守衛：W21 的四處假 pending 跨整個 W22 沒有被發現，
而 `run_all` 一路 9/9。

### Why it matters（缺失的能力）

**(A)** 這是唯一一條**架構級且已卡兩個 phase**的 P0。它擋著 M4（真認證）：
`0007:90` 今天仍指示「**M4 must define** how the six roles are provisioned in each
[identity plane]」，而規劃 M4 的人讀到它會照做。

**(B)** 「指名根因」與「修掉根因」之間**沒有任何機制**。這一片就是那個機制 ——
否則審計 #9 會再數一次同樣的 18 條。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `c2f823c`）| Anchor |
|-------|--------------------------------------------|--------|
| ADR 的禁令 | 「`05:7`'s "the platform does not store passwords" holds: **no local credential store**」 | `docs/14-adr/0007-identity-provider.md:102` |
| ⭐ **而它引用的原文是條件句** | `05:7` 寫的是「does not store passwords itself **where an IdP can be** [used]」—— **ADR 轉述時把條件拿掉了** | `docs/02-architecture/05-*.md:7` |
| 登入頁現況 | **已無密碼欄位** —— 「Every `<input type="password">` — **five of them** across the states」已移除，換成 persona picker | `apps/web/src/app/login/page.tsx:23-24` |
| 個人頁現況 | 「變更密碼」**渲染為 disabled**，且註解明寫**修正必須先有 ADR 修訂** | `apps/web/src/app/(app)/my-profile/page.tsx:37,423` |
| 有測試釘著 | 斷言 `input[type="password"]` **長度為 0** | `apps/web/src/app/(app)/my-profile/my-profile.test.tsx:54-56` |
| ADR 的 Azure China 殘留（`AD-30`）| `:21` · `:90` · `:135` · `:145` 仍以現在式談 Azure China 與 two identity planes | `docs/14-adr/0007-identity-provider.md:21,90,135,145` |
| ADR 的可證偽條件已死（`AD-43`）| FC1 寫 `14 OpCos`（真值 **13**）；FC2 以「Azure China instance 無法同步」為條件，**那個 instance 不存在** ⇒ **永遠不會 fire** | `docs/14-adr/0007-identity-provider.md:107-113` |
| closeout 的四個落點皆無 ADR 格 | 逐處確認 | `.claude/commands/phase-closeout.md:127` · `.claude/rules/task-workflow.md:395` · `_templates/phase/checklist.md.tpl:97` · `_templates/phase/retrospective.md.tpl:112` |
| detector 不看 `PR-pending` | E1/E2/E3/E4 全部只讀 pre-doc 的 `status:` frontmatter 與內文標記 | `scripts/lint/check_status_markers.py:30-42,232` |

→ ⇒ **(A) 缺的是一個決定不是一段 code**（產品端已符合現行 ADR）；
**(B) 缺的是四處清單文字 + 一條機械檢查**（清單文字擋不住「收尾時漏一步」，`AD-46` 已證明）。

### The design（ADR：1 新檔 + 1 行 Status · 治理：4 處清單 + 1 條 detector 檢查 + 負面案例）

```
NEW   docs/14-adr/0015-<slug>.md              取代 ADR-0007；含可證偽條件（真的會 fire 的）
EDIT  docs/14-adr/0007-identity-provider.md   ⛔ 只改 Status 那一行（README:143 的鐵律）
EDIT  docs/14-adr/README.md                   索引 +1 行 · 0007 Status 更新
EDIT  scripts/lint/check_status_markers.py    +E5：pre-doc 已 closed 而標記仍 PR-pending → FAIL
EDIT  scripts/lint/__fixtures__/…             E5 的負面案例（會被它擋住的那個）
EDIT  .claude/commands/phase-closeout.md      +ADR 格 +PR-pending 格
EDIT  .claude/rules/task-workflow.md          §Closeout Self-Check 同上
EDIT  docs/01-planning/_templates/phase/checklist.md.tpl        §4.2 同上
EDIT  docs/01-planning/_templates/phase/retrospective.md.tpl    §Closeout Self-Check 同上
UNTOUCHED apps/web/src/app/login/page.tsx     產品 code 不動（除非 D1 裁決要求）
```

**為何用新號取代而非就地改 ADR-0007**：`14-adr/README.md:138-143` 只定義了「取代」流程
（新 ADR 寫 `取代: ADR-NNN`，舊 ADR **只改 Status 那一行**）。**本 repo 沒有「就地修訂」的慣例**，
而發明一個新慣例不在本片範圍內。⚠️ 代價寫出來：ADR-0007 的**正確部分**（選 Entra ID）
會被連帶取代 —— 新 ADR 必須把它們**重述**而不是靠讀者去讀被取代的檔。

### Ground truth（recon head-start —— 於 `main` HEAD `c2f823c` 讀過的 code）

- `0007:4` — `**Status**: **已採納**`
- `0007:102` — 平台不存密碼的宣稱，**引用 `05:7` 時省略了條件子句**
- `0007:106-113` — 可證偽條件兩條，**一條數字過期、一條永遠不會 fire**
- `login/page.tsx:17` — 「a password-reset flow would be a screen for a mechanism that [does not exist]」
- `my-profile/page.tsx:42` — 「a password field over no backend is the Potemkin control this same [phase removed]」
- `check_status_markers.py:42` — 「Missing sibling frontmatter is fine by design」（E4 的既有豁免，E5 不得破壞它）
- `14-adr/README.md:117` — 編號往後接，不佔用 `0002/0003/0008/0009` ⇒ 下一個是 **0015**

**Baselines（W22 closeout）**: api test **484 / 40 suites** · api int **269 / 21 suites** ·
web test **95 / 10 files** · lint clean · type clean · format clean · build clean ·
`run_all` **9/9** · entity **34 / 36** · BACKLOG **173**（P0 6 / P1 92 / P2 75）。
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-adr-breakglass** ⭐⭐ — plan 把衝突寫錯了方向：**ADR-0007 其實要求 break-glass**
  （`:67` 指派給 Entra emergency access accounts · `:103` 引 `05:49`）→ §8 **R9**
- **D-05-conditional** ⭐ — 確認且更強：`0007:102` 的截斷**改變了 `05:7` 的語義** → §8 R9
- **D-adr-fc** ⭐ — 確認且更強：可證偽條件有 **3 條**，**FC3 是健康的**（`AD-43` 漏點名）→ §8 **R10**
- **D-closeout-cells** — 確認，但 `grep -ci` 差點誤判；⚠️ 四份清單**已非彼此鏡像** → §8 **R11**
- **D-rules-budget** — headroom **6,565 bytes**（32,000 − 25,435）⇒ **R5 未觸發**

## 1. Phase Goal

**讓 `AD-LocalPasswordFallback-1` 從「兩個互相矛盾的有效決定」變成「一個有記錄、有可證偽條件的決定」，
並讓下一次 closeout 在漏掉 ADR 或 `PR-pending` 時會被機械擋下。**
證明方式：ADR-0015 採納且 ADR-0007 Status 已翻；`check_status_markers.py` 新增的 E5
**用一個刻意壞掉的 fixture 證明它會紅**（不是只證明它會綠）。
⛔ **非 spike，不產出 design note；產出一份 ADR。**
⚠️ **無 user-facing 變更 ⇒ Day 3 是負面驗證不是 drive-through，報告寫「gate-only verified」。**

## 2. User Stories

- **US-1**（decision）: 作為 stakeholder，我希望本地密碼登入這件事有一個明確的決定，以便 M4 規劃時不必猜。
- **US-2**（ADR）: 作為維護者，我希望那個決定寫成 ADR 且**它的可證偽條件真的可能 fire**，以便它不會變成第二個 FC2。
- **US-3**（債務）: 作為維護者，我希望改 ADR-0007 時**順手關掉住在它裡面的 AD-30 與 AD-43**，以便不留明知故犯的漂移。
- **US-4**（治理）: 作為維護者，我希望 closeout 有 ADR 與 `PR-pending` 兩格，以便下一次漏掉時有人叫。
- **US-5**（負面驗證, **MANDATORY**）: 作為維護者，我希望新的 E5 **被證明會擋住它宣稱會擋的東西**。
- **US-6**（closeout）: 作為維護者，我希望這一片的取捨被記錄下來。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW       docs/14-adr/0015-<slug>.md                              → 取代 0007
EDIT      docs/14-adr/0007-identity-provider.md                   → ⛔ 只改 Status 一行
EDIT      docs/14-adr/README.md                                   → 索引 + Status
EDIT      scripts/lint/check_status_markers.py                    → +E5
EDIT      scripts/lint/__fixtures__/<新 fixture>                  → E5 的負面案例
EDIT      scripts/lint/tests/test_status_markers.py（或新建）      → E5 兩個方向
EDIT      .claude/commands/phase-closeout.md                      → 兩格
EDIT      .claude/rules/task-workflow.md                          → 兩格
EDIT      docs/01-planning/_templates/phase/checklist.md.tpl      → 兩格
EDIT      docs/01-planning/_templates/phase/retrospective.md.tpl  → 兩格
UNTOUCHED apps/**                                                 → 產品 code 零變更
UNTOUCHED docs/02-architecture/05-*.md                            → 見 §3.5
```

### 3.1 ADR-0015（US-1, US-2, US-3）— `docs/14-adr/0015-*.md`

- **§Decision 必須回答 §3.6 D1 的那個問題**，不得含糊帶過
- **§可證偽條件必須真的可能 fire** —— `AD-43` 的教訓：FC2 以一個不存在的東西為條件
- **重述 ADR-0007 的正確部分**（Entra ID 的選擇與理由），不靠讀者去讀被取代的檔
- **關 `AD-30`**：不得再以現在式談 Azure China 或 two identity planes（ADR-0010 已移出範圍）
- **關 `AD-43`**：OpCo 數用 **13**（已確認參數 #4 / #12）
- ⭐ **必須處理 `05:7` 的條件子句** —— 原文是 conditional，ADR-0007 轉述時省略了它

### 3.2 ADR-0007 與索引（US-3）

⛔ **`0007` 只改 Status 那一行**（`README:143` 明訂）。不修內文的錯 —— 被取代的 ADR
保留原貌是它的作用；修它等於竄改歷史紀錄。

### 3.3 E5：`PR-pending` 的機械守衛（US-4, US-5）— `check_status_markers.py`

- **檢查形狀**：某檔含 `PR-pending` / `#TBD`，而**對應 phase 的 pre-doc `status:` 已是
  `closed` / `closed_partial`** → FAIL
- ⛔ **不是「出現 `PR-pending` 就 fail」** —— closeout 當下它本來就該存在。
  **矛盾**才是該 fail 的東西
- ⚠️ **不得破壞 E4 的既有豁免**（`:42`「Missing sibling frontmatter is fine by design」）
- **必須有負面案例**（`AD-NegativeGate-1`）—— 一個 fixture 讓 E5 轉紅，且在 CI 裡跑

### 3.4 closeout 兩格（US-4）— 四個落點

四處**措辭一致**，避免 `AD-SpecMergeFieldByField-1` 的形狀：

1. **ADR 格** —— 「本 phase 有沒有讓某份**已採納**的 ADR 變得不準確？有就在本片修，或開 AD。」
2. **`PR-pending` 格** —— 「merge 後翻標記，並以 `gh pr view --json state,mergedAt` **驗證**。」

### 3.5 明確不做的事

- ❌ **不改 `docs/02-architecture/05-*.md`** —— 它的條件句是**對的**，錯的是 ADR 的轉述
- ❌ **不改產品 code** —— 除非 D1 裁決要求（見 §8 R2）
- ❌ **不處置審計 #7 的其餘 16 條** —— 本片只關住在 ADR-0007 裡的 AD-30 / AD-43
- ❌ **不建「就地修訂 ADR」的新慣例** —— 用既有的取代流程
- ❌ **不做 M4 的真認證** —— 本片只決定它的前提

### 3.6 ✅ 一個決策點 —— 已於 2026-08-19 拍板

| # | 決策 | 定案 | 依據 |
|---|------|------|------|
| **D1** | **本地密碼路徑的性質** | ✅ **(a) break-glass 應急路徑** —— MFA + 金鑰保管 + 全程稽核 + 時效，**僅在 IdP 不可用時開啟** | 使用者 2026-08-19。否決 **(b) 與 SSO 並列的一般登入**：它讓平台自己成為憑證保管者，`guardrail 1`（平台本身不得成為風險來源）與 `05:7` 的門檻最高。否決 **(c) 僅本機開發**：它**否定了 2026-08-17 裁決裡的「備用路徑」** —— production 若 Entra ID 掛掉就完全登不進去 |

⇒ **對本片的三個推論**（Day 0 逐條驗證）：

1. **`apps/**` 仍是 UNTOUCHED** —— break-glass 依定義**不是預設路徑**，登入頁今天沒有密碼欄位
   與 (a) **不矛盾**；實作屬 M4。⇒ plan R2 **未觸發**，範圍不擴大
2. ⚠️ **但 `/my-profile` 的「變更密碼」按鈕在 (a) 之下仍然是錯的** ——
   break-glass **不是自助改密碼**。該按鈕今天是 disabled ⇒ 無害，但它的**存在理由**
   （`my-profile/page.tsx:37` 說「等 ADR 修訂」）在本片之後就不成立了 ⇒ **開一條 AD，不當場改**
3. **ADR-0015 必須寫出 break-glass 的四個管控**（MFA / 金鑰保管 / 全程稽核 / 時效），
   否則它只是把「(b) 一般登入」換一個名字 —— 那正是 `AD-43` 那種「條件寫了但不會 fire」的近親

### 3.7 Validation（US-1..US-6）

Gates: lint clean · api test **484** · web test **95** · type clean · build clean ·
`run_all` **9/9 → 9/9**（E5 是既有 detector 的新檢查，不是第 10 個 detector）。
加上 §3.3 的**負面驗證（MANDATORY）**：E5 必須被證明會紅。
⛔ **無 drive-through** —— 零 user-facing 變更；報告寫「gate-only verified」。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `docs/14-adr/0015-<slug>.md` | NEW — 取代 0007 |
| 2 | `docs/14-adr/0007-identity-provider.md` | EDIT — **只改 Status 一行** |
| 3 | `docs/14-adr/README.md` | EDIT — 索引 + 0007 Status |
| 4 | `scripts/lint/check_status_markers.py` | EDIT — +E5 |
| 5 | `scripts/lint/__fixtures__/<新>` | NEW — E5 的負面案例 |
| 6 | `scripts/lint/tests/test_status_markers.py` | NEW / EDIT — E5 兩個方向 |
| 7 | `.claude/commands/phase-closeout.md` | EDIT — 兩格 |
| 8 | `.claude/rules/task-workflow.md` | EDIT — 兩格 |
| 9 | `docs/01-planning/_templates/phase/checklist.md.tpl` | EDIT — 兩格 |
| 10 | `docs/01-planning/_templates/phase/retrospective.md.tpl` | EDIT — 兩格 |
| 11 | `docs/03-implementation/changes/CH-043-*.md` | NEW — 變更記錄 |
| — | `apps/**` | **UNTOUCHED** — 產品 code 零變更 |
| — | `docs/02-architecture/05-*.md` | **UNTOUCHED** — 它的條件句是對的（§3.5）|
| — | `docs/14-adr/0001-backend-framework.md` | **UNTOUCHED** — 它也有 Azure China 殘留（`AD-30`），但本片只關 0007 那半 |

## 5. Acceptance Criteria

1. **AC-1** D1 已拍板且**寫在 ADR-0015 的 §Decision 裡**，不是留在對話記錄
2. **AC-2** ADR-0015 的**每一條可證偽條件都能指出一個今天可觀察的觸發路徑** ——
   ⛔ 不得再出現 FC2 那種「以不存在的東西為條件」
3. **AC-3** ADR-0007 Status 已翻為 `已被 ADR-0015 取代`，且**內文一字未改**；README 索引同步
4. **AC-4** ADR-0015 全檔**零** Azure China 現在式敘述、OpCo 數為 **13** ⇒ `AD-30` / `AD-43` 關閉
5. **AC-5** 四個 closeout 落點都有 ADR 與 `PR-pending` 兩格，且**措辭一致**
6. **AC-6 負面驗證 PASS（MANDATORY）** —— E5 對一個刻意壞掉的 fixture **實測轉紅**，
   移除 fixture 後轉綠；**兩個方向都要跑**，只證明「會綠」證明不了它會擋
7. **AC-7** `run_all` **9/9**，且 E5 在 CI 裡跑過（本片 PR 的 CI run）
8. **AC-8** `AD-LocalPasswordFallback-1` CLOSED · `AD-30` / `AD-43` CLOSED ·
   `AD-StalePrPendingNoDetector-1` CLOSED；calibration 已記錄；導航檔 + BACKLOG 已更新

## 6. Deliverables

- [ ] US-1 —— D1 拍板
- [ ] US-2 —— ADR-0015 採納，可證偽條件真的可能 fire
- [ ] US-3 —— `AD-30` / `AD-43` 關閉
- [ ] US-4 —— 四個落點各兩格
- [ ] US-5 —— E5 負面驗證 PASS
- [ ] US-6 —— `CH-043` + retrospective + calibration

## 7. Workload Calibration

- Scope class **`docs / audit / template` 0.40**（`CALIBRATION-MATRIX.md` §常見 scope class
  起始建議值；⭐ **本片是這個 class 的第 1 個資料點** —— live 表上今天**沒有這一列**）。
  ⛔ **刻意不用 `greenfield-feature` 0.55**：本片零產品 code，變異來源是**決策等待**不是實作。
  ⚠️ 而 detector 那半（E5 + fixture + 測試）**不是純寫作** —— 它是 `lint-detector-authoring.md`
  的射程，且 W22 的 calibration 教訓正是「有藍本的東西被當成沒藍本估」：
  **E5 有藍本**（E1-E4 就在同一個檔裡）。
- **Agent-delegated: `no`**（< 20%）—— 本片的核心是 D1 的判讀與 ADR 的措辭，
  那是**最不該委派**的東西（W21 實測：agent 擴大掃描射程有效，代判讀會出錯）。
- Bottom-up est ~**6.5 hr**（Day-0 0.5 · ADR-0015 起草 2 · 0007+README 0.5 ·
  E5 + fixture + 測試 1.5 · 四個落點 0.5 · 負面驗證 0.5 · closeout 1）
  → **calibrated commit ~2.6 hr (mult 0.40)**。Day-4 retro Q2 驗證。
- ⚠️ **逐日耗時記到 progress.md，每個 Day 收尾當下記** ——
  W22 證明第 3 級（checklist 具名 `[ ]`）有效，本片沿用。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **R1 — D1 未拍板則本片的一半做不了** | ⛔ **這是硬阻塞不是風險**：ADR 內文不能在決定之前寫。Day 0 就要取得裁決；未取得則**只做 (B)**，(A) 留 `[ ]` + 🚧，phase 收為 `closed_partial` |
| **R2 — D1 若選 (a) 或 (b)，產品 code 可能要改** | 本片 §4 宣告 `apps/**` UNTOUCHED。若裁決要求改，那是**新的範圍** ⇒ 依 `task-workflow.md` Go/No-Go 判準重新評估，不默默擴大。⚠️ (c) 則零 code 變更 |
| **R3 — 取代整份 ADR-0007 會連帶取代它正確的部分** | 新 ADR **重述** Entra ID 的選擇與理由。⛔ 不可寫「其餘同 0007」—— 那讓讀者必須讀一份已被取代的檔 |
| **R4 — E5 可能誤擋 closeout 當下的合法 `PR-pending`** | 檢查的是**矛盾**（pre-doc 已 `closed` 而標記仍 pending），不是 `PR-pending` 本身。**負面案例必須同時涵蓋「合法的 PR-pending 不可被擋」** —— 否則 E5 會讓每個 closeout 都紅 |
| **R5 — 動 `.claude/rules/task-workflow.md` 會撞 byte 預算** | `check_rules_hygiene.py` 機械強制。兩格是**兩行**，但要先確認 headroom；不足則先精簡別處而**不是**放棄那一格 |
| **R6 — 治理工具的配額（§Step 0.0）** | 本片是**每 phase 1 個治理 CH**的那一個。⇒ 期間發現的其他治理問題一律記 BACKLOG，不當場做 |
| **R7 — Risk Class C（陳舊程序）** | N/A —— 本片零 runtime 變更，無服務需要重啟 |
| **R8 — `AD-NarrowPatternWideClaim-1`（🔴 P0 候選）** | E5 要 grep `PR-pending`，而審計 #8 剛示範過窄 pattern 會漏。⇒ E5 的比對集合必須**逐檔列名於測試**，不靠一條 regex 的命中數。⭐ **Day 0 又中兩次**：`grep -c type="password"` 回報 1（是註解）· `grep -ci ADR` 回報 3/5（是別的問題的命中）—— 兩次都靠**讀原文**解掉 |
| **R9 — 本 plan 對衝突的描述方向錯了（Day-0 `D-adr-breakglass`）** | ⛔ **ADR-0007 不禁止 break-glass —— 它要求 break-glass**（`:67` 的比較表整列 `2 break-glass, P1 to Group CISO` 標 `required\|required\|no — **Entra emergency access accounts**`；`:103` 說它 remain platform features，引 `05:49`；`05:57` 明訂該控制）。⇒ ADR-0015 要論證的**不是「該不該有 break-glass」**（已經有了），而是「**它可不可以是本地的、能在 Entra 掛掉時仍然可用**」。⚠️ 這讓 D1=(a) 的意義更尖銳而非改變它：使用者要的正是「Entra 掛掉時仍能進去」，而 Entra emergency account 給不了那個。⇒ §3.1 的第一條改為「§Decision 必須回答**這個**問題」 |
| **R10 — FC3 是健康的，別跟著 FC1/FC2 一起丟（Day-0 `D-adr-fc`）** | `AD-43` 只點名 FC1（`14 OpCos` 過期）與 FC2（以不存在的 Azure China instance 為條件），**漏了 FC3「If group IT standardises on a different IdP」—— 那一條可觀察、真的會 fire**。⇒ ADR-0015 **保留 FC3**、修 FC1 的數字為 **13**、刪 FC2 並寫明為何刪。⛔ 全部重寫會把唯一健康的那條一起丟掉 |
| **R11 — 「四處措辭一致」不能解讀成四份清單收斂（Day-0 `D-closeout-cells`）** | 四份 Self-Check **今天已經不是彼此的鏡像**（`task-workflow.md` 既無 `RISK_REGISTER` 格也無 `status:` 格；`retrospective.md.tpl` 兩者都有）。⇒ AC-5 的「措辭一致」只約束**新增的那兩格逐字相同**，**不是**把四份清單統一 —— 後者是另一片的工作，且會超出治理配額 |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **M4 真認證** → 本片只決定它的前提
- **審計 #7 的其餘 16 條** → 本片只關 ADR-0007 內的兩條；其餘依 `AD-45` 分批
- **`ADR-0001` 的 Azure China 殘留** → 同屬 `AD-30`，但那是另一份 ADR，另開
- **`AD-FixtureProseBecomesForgedEvidence-1`** → 下一片接畫面時的前置
- **ROADMAP 補前端／部署落點（`AD-48`）** → 誘人（它就在隔壁），但那是第二個治理項，**超出配額**
