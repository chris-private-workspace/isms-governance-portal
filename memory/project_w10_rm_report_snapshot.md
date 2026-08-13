# W10 — RM report as an immutable versioned snapshot (M1 slice 7)

**Closed**: 2026-08-13 · **PR**: #52 MERGED (`afa667a`) · **Retro**:
`docs/01-planning/W10-m1-rm-report-snapshot/retrospective.md` ·
**CH**: `docs/03-implementation/changes/CH-026-w10-rm-report-snapshot.md`

---

## 交付

`RiskManagementReport` + `RMReportVersion` + 4 個端點 + **3 個 migration**（plan 只預期 1）。
**19 / 35 實體**。M1 DoD 的 `versioning` 第一次有標的 —— 前 17 張表沒有一張保存過去的內容。

## ⭐⭐ `02a` 給了兩個互斥欄位，選一個（本 phase 最值得複用的推理）

`current_version_id` 在父表（:253）與 `state: current/superseded` 在子表（:257）說同一件事，
而 :260 說版本**永不編輯** —— 翻 `state` 就是一次編輯。

| 選項 | 為什麼不 |
|---|---|
| 兩個都建 | 兩處一事實無調解規則 —— `02a:225` 為 `ControlTest.result` 拒絕過 |
| 只建 `state` | 需要 `FOR UPDATE` policy，凍結就只剩 GRANT 撐著 |
| **只建父表指標** ✅ | 版本表**一條 `FOR UPDATE` policy 都沒有**；「至多一個現行版」**構造上為真**；superseded 導出 |

## ⭐ 三個 migration，兩個是量測逼出來的

1. **promote 進 DB**：`runScoped` 把每個 operation 各自包進交易（`set_config` 必須 transaction-local），
   所以 repository 的兩次呼叫是兩個工作單元；W04 已拒絕穿 `$transaction`（會加寬每個介面）。
   而代價非裝飾性 —— promote 失敗的版本**永遠補救不了**（唯一標籤拒絕重試）。
   → `AFTER INSERT` trigger。**副作用是介面更窄**：版本 client 連 `rmReport.update` 都不需要。
2. **唯一索引是 existence oracle**（→ `AD-UniqueKeyOracle-1`，P0 候選）：唯一索引**不受 RLS 管**
   且**早於複合 FK**。實測：寫進別人的報告，撞標籤 **23505**（DETAIL 印出對方 id）、不撞 **23503**。
   修法是把 `org_entity_id` 放進鍵 —— 對合法列**完全冗餘**（複合 FK 已強迫兩者相等）。

## 🚩 元驗證 6/6，以及我自己被自己的測試糾正兩次

- **N1a**（放行 GRANT、policy 留空）→ raw UPDATE **不報錯但零筆被改**
  ⇒ **缺席的 policy 自己撐得住**。N1b（兩層都拿掉）→ 快照真的被改寫。
- ⛔ **migration 註解的因果被 int 測試推翻**：我寫「GRANT 是縱深、policy 是執行的那一半」，
  而測試 6（附了預測）拿到 **42501** —— 權限在 policy 之前檢查。當天就地更正。
- ⛔ **N4 零轉紅（如預測）** = INSERT policy 零覆蓋 → `AD-BorrowedRefusal-1` **第 5 次**，
  第 2 次事先預測到。補的測試 15 第一版用 `create()`，**N4 重跑仍全綠** ——
  `RETURNING` 讓 SELECT policy 遮蔽 `WITH CHECK`（`AD-ReturningMasksCheck-1`，**本 repo 已記錄過**）。
  改 raw INSERT 才轉紅。⭐ **抓到它的不是那份紀錄，是「補完測試後再跑一次中性化」**。

## Calibration

`pattern-reuse-feature` 第 4 點，ratio **0.24 UNDER**（0.82 hr / 3.5 hr，Day 1-3 四段閉合）。
⭐ **四點跨 0.23~0.84 的分散第一次有解釋**：0.23/0.24 **不含 Day 0**、0.50/0.84 **含** ——
不是雜訊也不是雙峰，是**同一欄混了兩種量法** → `AD-CalibrationDay0InOrOut-1`。

## Anti-pattern

AP-7 **1 個，當天已修**（migration 註解的 orphan claim）。其餘 0。
AP-3 複查過「快照表但不能產生快照」：**不是** Potemkin —— 關掉它會壞的三件事各有測試且中性化各自轉紅。
⛔ **gate-only verified** —— 無 UI，故無 drive-through。
