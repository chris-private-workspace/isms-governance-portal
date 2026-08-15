# Phase W14 — Retrospective

**Phase**: W14 — Attestation, and the second polymorphic link
**Period**: 2026-08-15 ~ 2026-08-15（單日，四個 Day 在同一個工作區段內完成）
**Plan**: [plan.md](./plan.md)
**PR**: #63（**MERGED** 2026-08-15 10:51:18Z，`e9ab83a`）—— 六個 required check 全 SUCCESS，
⛔ **又是 rebase merge，九個 SHA 全被改寫**（`AD-DesignNoteAnchor-1` **連續第 6 次**）
**Change record**: `docs/03-implementation/changes/CH-031-w14-attestation.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | `Attestation` model + migration，`result` / `status` 取捨記在 docstring | ✅ 完成 |
| US-2 | trigger 依 `linked_type` 分支，fail-closed 保留，跨實體被拒 | ✅ 完成 |
| US-3 | `Policy.requires_attestation` | 🚧 **移出本片 → M6** |
| US-4 | `AUDITED_MODELS` 15 → 16 + 覆蓋測試 +1 | ✅ 完成 |
| US-5 | 四個中性化，預期先 commit | ✅ 完成（3 命中 / 1 半錯）|
| US-6 | closeout 六件 | ✅ 完成 |

**實體數**：21 → **22 / 35**（`check_entity_index.py` 機械導出，非手數）。

**未完成項目**：**US-3 一項**。Day 1 撞到它今天**沒有讀者也沒有寫者** ——
`ScopedAttestationClient` 刻意不暴露 `policy`（那是 oracle 防線）· `policy.controller.ts` 在 plan §4 是
UNTOUCHED 所以 create 不接受它 · 無 M5 workflow · 無 UI ⇒ **永遠為 `false`，關掉不會壞任何東西**。
使用者裁定移出 → **M6**，登記為 `AD-PolicyAttestationFlag-1`。
⛔ **checklist 1.3 與 plan §6 的 US-3 一律維持未勾** —— 它不是做完了，是被移出了。

⇒ `status: closed_partial`。

---

## Q2 — Calibration（工時校準）

- **Scope class**: `pattern-reuse-feature`（**第 7 個資料點**）
- **Agent-delegated**: **no**（plan 時宣告，自己直接做）⇒ `agent_factor` 1.0 ⇒ 三段式
- **Bottom-up est**: **4.0 hr**（schema+migration 1.5 · trigger 1.0 · endpoints+tests 1.0 · closeout 0.5）
- **Committed (calibrated)**: **2.0 hr**（mult 0.50）
- **Actual**: **2.26 hr**（135.57 min）—— ⚠️ **post-merge 修正**，見下
- **Ratio**: **1.13**
- **Band 判定**: **IN**（0.7–1.2）

### ⭐ 量法對照 —— 本片是 `AD-CalibrationWindowCrossSession-1` 的第一個實測資料點

plan §7 **事先宣告**採候選新規則：「含 Day 0，**逐段相加並排除任何 > 60 min 的 commit 間隙**」。

| 量法 | 全 phase（九個 commit）|
|---|---|
| 逐段相加（排除 > 60 min）| **135.57 min** |
| 原始窗口法（末 − 首）| **135.57 min** |

八個間隙**最大 34.87 min**（`5d37a77` → `9c71f50`，polymorphic guard + 契約反轉那一段），
全部低於 60 min 門檻 ⇒ 兩法**逐位相同**。

⚠️ **本節的數字在 closeout 當下是區間 1.08–1.13，post-merge 才變精確 —— 而修正的方向值得記。**
closeout 時 Day 4 只能量到「最後一個產物寫入」（28.3 min）當**下界**，因為 closeout commit 還不存在。
merge 之後真值是 **34.68 min**，落在我當時所報區間的**上緣**。
⇒ **這個下界慣例系統性低估 closeout —— 本次 6.4 min（約 19%）。**
W13 的 28.0 min 用的是同一個慣例，**所以那也是下界不是值**。
⭐ 兩個 phase 的 band 判定都不受影響，所以修法不是「別用下界」，是「**下界要標成下界**」。

⛔ **這只證明了一半，而那一半不是它要解決的問題。**
plan §7 預期「單一 session 完成則兩法同值」—— 實測如預期。但那證明的是**新量法不擾動舊量法本來就答對的那一類**。
W13 的失效模式（跨夜等使用者 ⇒ 窗口給 13.7 hr / ratio 6.08）在本 phase **結構上不可能重現**，
因此**也就沒有被驗證修復**。

⇒ **`AD-CalibrationWindowCrossSession-1` 不關閉。** 解封條件：下一個真正跨 session 的 phase，
兩法必須給出**不同**的值，且窗口法的那個必須是明顯荒謬的那個。

**行動**: **KEEP** 0.50 —— 七個點跨 0.23~1.24，無 3-phase 同向趨勢（W13 IN、W14 IN、W11 1.24 為單次離群依規則忽略）。

- [x] 已回填 `calibration-matrix.md`（**325 字元**，lint 上限 400）
- [x] 完整敘述已寫入 `calibration-log.md` §1
- [x] `|R − 1.0|` = 8–13% < 30% ⇒ **不需**記 AD

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量**：**8 條**（D1–D8）—— 其中 **5 條是真正的 drift**（plan 講錯）：D1 · D5 · D6 · D7 · D8；
  3 條是**確認**（plan 講對）：D2 · D3 · D4
- **Prong 分佈**：Prong 1（path）**0 drift**，7/7 absent · 5/5 exists 全中 ｜
  Prong 2（content）**D1 / D5 / D6 / D8** ｜ Prong 3（schema）前三項確認，
  ⚠️ 第四項（migration head）**改用等價證據** —— `_prisma_migrations` 查詢用錯 role 而失敗，
  改以 int suite 的 `rebuilt, migrated and seeded` 為證，**兩者不等價**（它驗的是 `isms_test` 不是 dev DB），已記在 progress.md
- **Day-0 成本**：**16.2 min**（`736b1f1` → `6701305`）
- **預防的返工**：~**1.5–2 hr**
- **ROI**: ~**6–7×**

### 最有價值的那個 drift：**D5**

`controls_read` 含 `applies_to_scope = 'group' OR …`，而 `assert_parent_in_scope()` 靠 RLS 過濾
⇒ group-shared control 對**任何**實體都 reachable。
若中性化 N1 拿一個 group control 當標的，它**修法前後都會成功** —— `AD-VacuousScopeTest-1` 的形狀，
**而 W13 才剛掃 13 個 spec 補過 4 處同形缺陷**。

⭐ **它是因為 checklist 明確列了 `D-subject-both-built` 這一項才被問出來的** ——
那條檢查項正是為了 `AD-Day0ReadNotApplied-1`（W13：Day 0 **讀過**關鍵 docstring 卻沒套用到做法上）而加的。
⇒ **上一個 phase 的 AD 在下一個 phase 的 checklist 上變成一條具體的檢查項，然後真的抓到了東西。**
這是 AD → checklist 這條迴路第一次可以指著一個具體戰果。

**而它的價值在 Day 2 被實測釘死**：加 trigger 之前測試 7（group control）就是綠的，加了之後**仍綠**；
測試 8（entity-local control）紅 → 綠。
⇒ **只寫測試 7 會得到一條什麼都不證明的測試；只寫測試 8 則證不出那條放寬是刻意的。兩側都要。**

---

## Q4 — 做得好的（保持）

- **⭐ 「先跑再修」的順序被當成不可顛倒的紀律，而它是這次驗收的全部價值來源。**
  checklist 1.1 要求在**碰 `AUDITED_MODELS` 之前**先建表 + repository 再跑 int suite。
  得到「恰好 1 紅、訊息自己指名 `Attestation`、15 條逐模型覆蓋測試一條未動」。
  先改再跑得到的是綠色，而**綠色不能區分「守衛有效」與「守衛從不看新表」**。

- **⭐ 先 grep 消費者再寫預測**（`AD-NeutralisationConsumerGrep-1`，W13 的 N1/N3 少算的修法）。
  grep **推翻了兩個直覺**：`AUDITED_MODELS` 有四個消費者（含 W13 漏掉的 `bench.int`），
  但逐處讀之後確認它們只把**整個集合**交給 recorder、不檢查名稱 ⇒ 移除單一名稱不影響它們。
  **N2 因此預測「恰好 2」並實際命中 2。**

- **設計決定全部指向先例，而且指得出分歧點。** `result` 用 String 的理由不是「我覺得」，
  是「本 schema 兩個先例分歧（`Evidence.kind` vs `SoA.implementation_status`），
  **分野是值域有沒有外部來源**」—— ISO 27001 固定了 SoA 的，attestation 的沒有。

- **舊守衛一行未動。** `assert_parent_in_scope()` 有三個 phase 依賴它，新需求走**新函式**
  ⇒ 回歸面為零，且新函式當下就有兩個呼叫端（不是 AP-5）。

- **契約按它自己寫下的條件到期，測試跟著反轉而原文保留。**
  `evidence.repository.ts:26` 在 W07 就寫好了到期條件，本片同時做了三件事因為它們是同一件事。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | **0** | `attestation.module.ts` 接進 `bootstrap/app.module.ts`，從主入點可追蹤 |
| AP-2 Cross-directory scattering | **0** | repository → `core-model/` · controller → `modules/attestation/` · 守衛 → `prisma/migrations/`，各歸其位 |
| AP-3 Potemkin | **0 出貨** ⚠️ **1 攔下** | US-3 若照 plan 做就是一個「關掉不會壞任何東西」的欄位。Day 1 問出「誰會讀它」⇒ 使用者裁定移出。⚪ 純後端無 drive-through，**gate-only verified** |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | **0** | `assert_polymorphic_parent_in_scope()` 是 variadic，但**當下就有兩個呼叫端**且映射不重疊 —— 與 W07 給舊函式收參數的判準相同 |
| AP-6 Mock vs real divergence | N/A | 未引入 mock；int suite 跑真 PostgreSQL |
| AP-7 命名 / orphan claim | ⛔ **1** | 見下 |
| **總計** | **1** | |

### ⛔ AP-7 的那一次：我自己造成的 stale docstring

Day 2 把 `AUDITED_MODELS` 從 15 改成 16，但 `audit.module.ts` 的 docstring **沒跟著改**，
於是 `f0cc0a7`–`706d94d` 這幾個 commit 裡住著三句錯的宣稱：
「rerun the derivation rather than trusting these **fifteen** strings」·
「forward … → **16** delegates」·「reverse … → **22**」。

⚠️ **而那段 docstring 的第一句正是 `⭐ DERIVED, NOT TRANSCRIBED — rerun the derivation`** ——
它叫讀者重跑導出，我改了清單卻沒重跑它。Day 4 重跑，真值是 **17 delegates / 23 models / 6 無寫入路徑**
（與「5 個模型無寫入路徑 + AuditLog」自洽）。

順帶修掉一段 W13 留下的同類 stale（「plan §3.3 connects **ONE** module」「Connecting the other **ten**」
「before ADR-0003 **chooses** a strategy」—— ADR-0003 已採納、清單已是 16）。
⛔ **記在這裡而不是靜靜改掉**：那是 AP-7 的教科書形狀 ——「註解也算 code，引用已被移除的東西就是誤導人的 orphan claim」。

**Lint**: `run_all.py` **8/8** ✅

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-PrismaEnumThreeTruths-1` | 一個 enum 值有**三份真相**（`schema.prisma` / **generated client** / DB catalog），而中間那份會 runtime 驗證。`ALTER TYPE … ADD VALUE` 未配 `prisma generate` ⇒「DB 接受、應用層拒絕」，**只在部署時現形** | CI 套用 migration 後跑 `prisma generate` 並斷言產物 `git diff --exit-code`；或 `postmigrate` hook 強制 generate。⚠️ 先確認產物是否進版控 | 候選 |
| `AD-TextEditStructuralScope-1` | **用便宜的字串操作做需要理解結構的工作 —— 同一天兩次**（Day 2 全檔 replace 誤改 `assessment_instances` → 7 紅；Day 3 `t.index('  ],')` 切出語法錯誤）。⛔ **兩次都不是我發現的** | 跨多行/多處的文字操作必須錨定**結構邊界**（唯一 ref code / 含換行的完整界定符），並在操作後 `assert` 計數符合預期 | 候選 |
| `AD-PolicyAttestationFlag-1` | `Policy.requires_attestation` 規格有而欄位未建 —— 今天沒有讀者也沒有寫者 | 移出 → M6；解封條件是 Policy 模組真的要讀它的那一片 | 已登記（Day 1，使用者裁定）|

**更新的既有 AD**：`AD-CalibrationWindowCrossSession-1`（首個實測，**只證明一半，不關閉**）·
`AD-AuditWriteOpsUntested-1`（16 個寫入仍全是 create）· `AD-ModuleCoverageDilution-1`
（**再現但成因不同** —— 這次是新模組缺 unit spec，不是 `*.module.ts`）·
`AD-DevDbChecksumDrift-1`（**第三次撞上、第三次繞開**）

- [x] 已記入 `docs/01-planning/BACKLOG.md`

### ⚠️ 一條沒有開成 AD 的觀察

本次 gate script 用了 `tail -25`，把 coverage 的 `All files` 摘要行切掉了。
判定沒錯（退出碼取自 `PIPESTATUS[0]`，不是 `tail` 的），但**數字得重跑一次才拿到**。
⇒ 這是 `AD-GrepAssertion-1` 的鄰居而不是它本身：那條講的是「退出碼被 `tail` 吃掉」，
這次退出碼是對的，被吃掉的是**證據**。不另開 AD，因為修法已經在那條 AD 上（gate 輸出逐項可見）。

---

## Q7 — Carryover

**帶到下個 phase 的**：

- **US-3 `Policy.requires_attestation`** → **M6**（`AD-PolicyAttestationFlag-1`）
- `AD-PrismaEnumThreeTruths-1` / `AD-TextEditStructuralScope-1` → BACKLOG，由使用者排序
- `AD-CalibrationWindowCrossSession-1` **仍開著** —— 下一個跨 session 的 phase 才驗得了
- `AD-DevDbChecksumDrift-1` **第三次繞開** ⇒ 每次繞開都很便宜，那正是它活到第三次的原因
- ⚠️ **M1 的 DoD 仍未達成** —— 22/35，其餘 13 張表是 slice 10..N

**這個 phase 關掉的**：

- **無 AD 關閉。** 本片是 plan 的 deliverable，不是在關 AD。
- ⭐ 但它是 **W13 漂移守衛的第一次實戰**，也是 **`AD-Day0ReadNotApplied-1` 修法的第一個戰果**（D5）。

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（Current Phase **1 行** + Last Updated **1 行**，無歷史列）
- [x] `MEMORY.md` 新條目 **293 字元**（`AD-MemoryEntryRatchet-1` 上限 300；⛔ 未參照前一條的長度）
- [x] Phase 細節完整保存在 `memory/project_w14_attestation.md` + 本檔 + progress.md
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`（不在 CLAUDE.md）
- [x] Calibration ratio 回填 matrix（325 字元 ≤ 400）+ log
- [x] ⭐ **`RISK_REGISTER.md` 已複查** —— **R3 / R4 兩列更新**：R3 記下 ADR-0014 的 `group` 逃生口
      **第一次傳播到第二張表**（「跨實體被拒」對本表只有 `subject_type = policy` 時是全稱的）；
      R4 記下漂移守衛的第一次實戰驗證。其餘 R1/R2/R5–R8 **看過，本 phase 未改變其敞口**
- [x] `plan.md` frontmatter `status: closed_partial`，§6 US-3 維持 🚧 未勾（R9）
- [x] `python scripts/lint/run_all.py` **8/8** 全綠
