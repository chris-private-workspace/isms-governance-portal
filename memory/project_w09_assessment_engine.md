# W09 — Shared assessment engine (M1 slice 6)

**Closed**: 2026-08-13 · **PR**: #50 MERGED (`6446099`) · **Retro**:
`docs/01-planning/W09-m1-assessment-engine/retrospective.md` ·
**CH**: `docs/03-implementation/changes/CH-024-w09-assessment-engine.md`

---

## 交付

`AssessmentTemplate` / `AssessmentInstance` / `AssessmentResponse` + 六個端點，
兩個 migration。**17 / 35 實體** —— 分子 +3、**分母 −1**（`Assessment` 停止是一個要建的列）。

`05:38-47` 用 ★ 標記這個引擎並要求 build **once** "rather than three times"，
而 W07 的 `ControlTest` 已經開始了它警告的事。

## 三個第一次

1. **`evidence` 首次回頭補複合錨點** —— `asset_groups`/`assets`/`issues` 三個錨點
   都是**與需要它的子表同 phase 出生**的，所以「父表給得起但它還沒有」這個情況
   從未發生過。W07 的 D1 判準（trigger 只用於**結構上**給不起的父表）答得出來：
   `evidence` 無 `applies_to_scope` → 給得起 → 走 FK。
2. **本 schema 第一個跨欄位約束** —— `assessment_instances_sod`
   `CHECK (reviewer IS NULL OR reviewer <> assignee)`。四方向實測，
   ⭐ **UPDATE 是免費的**（W07 的 trigger 必須明寫 `OR UPDATE`）：
   宣告式約束涵蓋你沒想到的路徑，命令式守衛只涵蓋你列出的。
3. **`AD-BorrowedRefusal-1` 首次被事先預測** —— N2 的預期表寫著「16 仍綠」，
   理由是 repository 路徑先呼叫 `issueRefCode`，counter policy 會代為拒絕。成立。

## ⭐⭐ `template_version` 的三選一（本 phase 最值得複用的推理）

`02a:330` 要它是**快照**，取快照要讀模板；但每個 scoped client 自 W05 起
**刻意不給父表 delegate**（「不給才叫寫不出來，而不只是不建議」）。

| 選項 | 為什麼不 |
|---|---|
| 呼叫端傳 | 不是快照，是**宣稱** |
| 開 `assessmentTemplate` delegate | 為一個整數拆掉三個 phase 的防線 |
| **DB 在 `BEFORE INSERT` 填** | ✅ 介面窄 + 欄位是規格說的意思 |

⭐ 而那個 trigger **差一點自己開 oracle**：不可達模板若 `RAISE`，
「別人的」與「不存在的」會得到不同錯誤。`COALESCE(..., 0)` 不 RAISE，
讓複合 FK 用 23503 拒絕兩者。**0 不是 NULL** —— BEFORE trigger 也跑在 `NOT NULL` 之前。

## 🚩 元驗證 6/6，以及第一次什麼都沒量到

六個中性化的預期方向**寫在跑之前**，含「預期不動的」。六個全中，
兩個是反直覺預測（N2 的 16 仍綠 · N4 的 9c **錯誤地**仍綠）。

⛔ **第一次 N1 用 `psql` 改 `isms_test`，得到 20/20 全綠** —— 不是守衛多餘，
是 int setup 每次都重建資料庫。**中性化要改來源（migration），不是改狀態。**
→ `AD-NeutraliseRebuiltState-1`。抓到它的唯一原因是預期寫在前面。

## ⛔ 使用者裁決的未預見代價

「`Assessment` 是用例不是表」是基於**欄位重疊**做的，**enum 沒有被比對**：
引擎是 `risk/control/vendor/entity`（兩處獨立指定），`02a:223` 是
`risk/control/**process**/entity`。`process` 失去落點 → `AD-AssessmentProcessSubject-1`，
**需要使用者裁決**。通則：合併規格的決定要**逐欄位含 enum 比對**。

## Calibration

`pattern-reuse-feature` 第 3 點。窗口 ratio **0.50 UNDER**（1.88 hr / 3.75 hr）。
四段皆 commit-to-commit 閉合，但**每段含量不到的等待前綴** → 是上界不是工時。

⛔ **推翻了 `AD-CalibrationIdleGap-1` 的提議**：它說扣除值「可從 commit 機械導出」，
而使用者訊息的時間戳不在 git 裡。
⭐ **`AD-BottomUpBlueprint-1` 的新估法首次對照成功**：預測 64 min vs 實測上界 58.5
（誤差 < 10%；同期舊法誤差 7.7 倍）。

## Anti-pattern

AP-1..AP-7 全 0。⛔ **gate-only verified** —— 無 UI，故無 drive-through，
報告不得暗示可用性。
