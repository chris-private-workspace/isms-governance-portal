# Phase W08 Progress

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## Day 0 — 2026-08-12

### Today's Accomplishments

- **0.2 Branch** — `feature/W08-issue-and-action` 建於 `origin/main` `edb5853`；
  `git rev-parse HEAD` == `git rev-parse origin/main` **True**
  （`AD-DesignNoteAnchor-1` 第三形態的防線：不從已合併的 feature branch 延續）
- **0.1 Prong 1 — path verify** — plan §4 的 28 個目標逐一確認；
  16 個 plan 引用的 `AD-*` + 11 個 checklist 引用的 `AD-*` **全部在 `BACKLOG.md` 存在**
  （`AD-AdRegistry-1` 通過）；`CH-023` 未被佔用（`CH-02[3-9]` 全 repo 零命中）
- **0.1 Prong 2 — content verify** — 見下方 Drift findings（**12 條，其中 1 條是 plan 自己的錯誤斷言**）
- **0.1 Prong 3 — schema verify** — `issues` / `actions` 對 `schema.prisma` 零命中；
  複合 FK 藍本 SQL 逐字讀出；⭐ **migration checksum 首次做內容比對**（見 D-checksum）
- **D-baselines** — 逐 workspace 分開跑取真退出碼，**全程未用 `tail`**（`AD-GrepAssertion-1` (d)）

### Drift findings

| ID | Finding | Implication |
|---|---|---|
| **D-refcounter** | ⛔ **plan Scope decision (f) 的理由有一句是錯的** —— 我寫「`RefCodeCounter` 沒有 `org_entity_id`」，實際 `schema.prisma:173` **有**，且該 model 的 docstring `:163` 明寫「Entity-scoped **ON PURPOSE**」 | 排除的**決定**不變（使用者裁決），但**理由必須重寫**。正確判準：它沒有 §1.1 base fields（無 `id`／`ref_code`／`status`／`owner_user_id`／`version`／`extensions`／`retired_at`／`is_active`），主鍵是 `@@id([orgEntityId, entityType])`；而且它是**發** `ref_code` 的機制，不是**被發**的記錄。→ plan §Scope decision (f) 已更正 |
| **D-namemap** ⭐ | **三個名字都不一樣**：model `ExtensionField` · table `extension_fields` · `02a` §0 索引 `extension_field_catalog`。彼此**不是機械可導的** | detector **不能做逐字比對**，必須帶一份明文別名映射。這擴大了 `AD-EntityIndexIncomplete-1` 的範圍：索引不只**漏了**一個實體，還用了一個**跟 schema 和 DB 都對不上**的名字 → §Risks |
| **D-denominator** | 手數 `02a` §0 兩次得 **23 + 9 + 4 = 36**；`BACKLOG.md` 記的分母是 **35**（23+**8**+4）。差在 foundation services 一節 —— 該節 5 列共 **9** 個實體（`User` · `audit_log` · `retention_policy` · `LegalHold` · `AccessRequest` · `AccessReviewCampaign` · `AssessmentTemplate` · `AssessmentInstance` · `AssessmentResponse`）| ⛔ **不得先假設 35 是對的** —— detector 逐節印出分節數字，由它回答。⚠️ 這是同一個計數器的**第四個**人算值（8 / 9 / 10 / 12 之後，分母也加入了）|
| **D-migcount** | plan §4 的 UNTOUCHED 行寫「既有 **8** 個 migration」，實際是 **10** 個 | plan 已更正。不影響範圍 |
| **D-source** ✅ | 確認 `02a:229` 的 `Issue.source` 是**裸 enum**：全檔 grep `source` 無 `source_id`；§5 關係規則（`:404-411`）也**沒有** Issue → ControlTest 的邊 | Scope decision (c) 成立。與 D-issuestatus 合併登記為一條 AD |
| **D-issuestatus** ✅ | `RiskAccepted`（`02a:379-380`）**只存在於狀態機**，沒有任何欄位指向 `risks` | ⭐ **與 D-source 同形狀** —— `Issue` 的兩條入邊（來源、風險接受）**都只有 enum 沒有 FK**。合併成一條 AD 比拆兩條準確 |
| **D-verifiedby** ✅ | `02a` 全檔僅 `:231` 一處提到 `verified_by`，**無型別定義**。⭐ 但同一行內 `assignee_user_id` 用 `_user_id`、`verified_by` 用 `_by` —— 與 §1.1 的 `created_by`／`updated_by` 同慣例 | 照 `createdBy` 的形狀建（`String? @db.Uuid`，**無 Prisma relation**）。**命名慣例本身就是依據**，不是猜 |
| **D-blueprint** ✅ | 複合 FK 在本專案**已有 2 個實例**，SQL 逐字讀出：`assets_asset_group_id_org_entity_id_fkey` 與 `risks_asset_id_org_entity_id_fkey`，父側是 `asset_groups_id_org_entity_id_key` / `assets(id, org_entity_id)` | §3.3 的藍本是實打實的。⚠️ 因此 plan Summary 的「第一次」指的是 **W07 D1 判準寫下來之後第一次遇到父表給得起錨點**，不是「第一次用複合 FK」|
| **D-anchor** | `02a` 被 **329 處** `file:line` 錨定，跨 **66 個檔**（`schema.prisma` 55 · `risk-score.ts` 9 · ADR-0013 8 · ADR-0014 7 …）。扣掉 W08 自己新寫的 25 處 = **304** | ⛔ 比 `AD-MdAnchorLineShift-1` 記錄的「~30 個」**大一個數量級**。§3.x 的 `02a` 編輯行數紀律是硬要求，不是建議 |
| **D-globaltables** ✅ | `Threat`（`:634`）／`Vulnerability`（`:668`）無 `org_entity_id`，但 docstring 指向 `multi-tenant-data.md:63` 的五張合法全域參考表，且說明了連帶的 `ref_code`／`extensions` 缺席原因 | 非隱患，有完整記錄。detector 不需特別處理 |
| **D-checksum** ✅ ⭐ | **10/10** migration 的 `_prisma_migrations.checksum` 與檔案 sha256 **逐字相符**，全部 `finished_at` 非空 | `AD-MigrationChecksum-1` 提議的「比對內容而非清單」**首次真的執行**，通過。順帶關掉 `AD-DevDbDrift-1` 的 Day-0 檢查：`isms_dev` 未落後 |
| **D-baselines** ✅ | 逐項與 W07 closeout 記錄**完全一致**（下表）| 無漂移 |

**Baselines 實測（2026-08-12，逐 workspace 分開跑，取各自退出碼）**

| Gate | W07 記錄 | Day 0 實測 | |
|---|---|---|---|
| unit（api）| 235 / 23 suites | **235 passed / 23 suites** | ✅ |
| int（api）| 105 / 8 suites | **105 passed / 8 suites** | ✅ |
| web | 10 | **10 passed / 1 file** | ✅ |
| coverage（stmt/br/fn/line）| 92.58 / 92.32 / 96.26 / 94 | **92.58 / 92.32 / 96.26 / 94** | ✅ |
| lint | 0/0 | EXIT=0（api）· EXIT=0（web）| ✅ |
| format:check | ✅×2 | EXIT=0 ×2 | ✅ |
| type-check | ✅×2 | EXIT=0 ×2 | ✅ |
| build | ✅×2 | EXIT=0 ×2 | ✅ |
| `run_all` | 6/6 | **6/6 passed** | ✅ |
| `lint:negative` | PASS | **PASS — 35 檔 0 bypass 3 allowlisted**（skipped 31 test + 2 fixture）| ✅ |

### Issue / 本日的誠實紀錄

- ⚠️ **我把 `lint:negative` 的 EXIT=1 差點當成 baseline 紅。** 實際訊息是
  `Missing script: "lint:negative"` —— 它在 **root** 的 `package.json:19`，不在 `apps/api`。
  **exit 1 代表「指令不存在」不是「gate 失敗」**，兩者在退出碼上不可分辨。
  用正確的呼叫重跑後 PASS。→ 這是 `AD-GrepAssertion-1` 家族的一個小變體：
  **退出碼也是一個代理指標**，非零不等於它所守的那件事失敗了。
- ⚠️ **D-refcounter 是我在 plan 裡寫下一個沒查過的斷言。** 「它沒有 `org_entity_id`」聽起來
  很合理（發號表嘛），而 schema 的 docstring 恰恰是在強調相反的事。
  **裁決本身沒被影響**（使用者選的是「排除」不是「因為沒有 org_entity_id 而排除」），
  但如果沒有 Day-0 這一步，那個錯誤理由就會被寫進 detector 的註解裡當成判準。

### 0.3 實體計數 detector（US-1）— 交付與量測

**機械答案：`12 / 36`，不是 `12 / 35`。** 逐節：Shared core **23** · Foundation services **9** ·
Module-local Wave 1 **4**；`schema.prisma` 13 個 model，扣掉 `EXCLUDED` 的 `RefCodeCounter` = 12。

| 項 | 結果 |
|---|---|
| `check_entity_index.py` | `OK (12 / 36 Wave-1 entities built)` |
| self-test（無條件，非旗標後）| `SELF-TEST PASS — fixture orphan detected`（`ShadowLedger`）|
| `run_all` | **6/6 → 7/7 passed** |
| `02a` §0 同行追加 | `git diff --numstat` **1/1** · 總行數 **495 = 495** · `02a:229`/`:231` 逐字未動 |
| **N0 元驗證** ⭐ | 清空 `EXCLUDED` → 真 schema **FAIL** 並指名 `RefCodeCounter`（EXIT=1）；還原 → EXIT=0 |
| 導航面更正 | `CLAUDE.md:79` · `ROADMAP.md:72` → **12/36**（CLAUDE.md 的「其餘 23」→ 24）|

**為什麼 N0 是必要的，而 self-test 不夠**：self-test 只證明 detector 抓得到**fixture 裡**的孤兒。
`RefCodeCounter` 是不是真的靠 `EXCLUDED` 才通過，還是靠別的原因（例如它的名字碰巧命中某個
索引 token）—— 那要清空 `EXCLUDED` 才知道。這是 `AD-BorrowedRefusal-1` 的同一個問題形狀
搬到 detector 上：**機制在、綠燈在，不代表綠的是這個機制。**

**兩處實作偏離（皆已記錄，非默默改）**：

1. **excluded 清單住在 detector，不在 `02a` §0** —— plan Scope decision (f) 原寫「`02a` §0 加一個
   明文 excluded 清單」，而 §0 位於檔案開頭（line 16-83），在那裡插入新段落會讓其後
   **304 處錨點全部偏移**，與 `AD-MdAnchorLineShift-1` 直接衝突。解法：清單在
   `check_entity_index.py` 的 `EXCLUDED`（它是可執行的真相且有 N0 守著），`02a` §0
   **同行追加**一句指向它 + 說明為什麼是同行追加。「明記」與「明文白名單」兩項要求都達成。
2. **`STATUS_AUDIT.md` 的 12/35 不當場改** —— 它是 2026-08-12 那次審計的快照（歷史），
   依 `AD-DesignNoteAnchor-1` 建立的活參考／歷史快照分流原則，由下次審計更正。
   `BACKLOG.md:71` 是活的追蹤文件但屬 Day 4 closeout 的範圍，一併留到那時改。

### 工時

| 區段 | 起 | 迄 | 實際 | 錨點 |
|---|---|---|---|---|
| Day 0 verify（plan 起草 → Prong 1-3 → baselines）| — | 20:06:46 | **~est** | ⚠️ **單端** |
| 0.3 detector（讀藍本 → 寫 → fixture → N0 → 導航面）| 20:06:46 | 20:14:46 | **8 min** | ✅ **兩端閉合** |

⛔ 依 `AD-EstimateAsMeasurement-1`：第一段**起點無可觀察錨點**（branch 建立不產生 commit），
標 `~est` 且 **不進 calibration**。第二段兩端都是 `Get-Date` 輸出，**可進**。

⭐ **detector 段：bottom-up 估 0.75 hr（45 min），實際 8 min —— 高估 5.6 倍。**
plan §7 把它標為【半藍本】，而實際上 `scripts/lint/` 的 6 個既有檔 + `assert-no-scope-bypass.mjs`
的 self-test 形狀合起來就是完整藍本；真正新寫的只有「解析 markdown 表格」那 30 行。
→ `AD-BottomUpBlueprint-1` 的第一個 W08 資料點，方向與 W07 一致。

### Go / No-Go

**GO。** 12 條 drift 中沒有一條改變 §5 Acceptance 或 §4 File Change List 的主體：

- D-refcounter / D-migcount → plan 文字更正（已做）
- D-namemap → detector 增加一份別名映射，是實作細節不是範圍變動
- D-denominator → 本來就是 detector 要回答的問題，Day 0 只是確認它比預期更需要回答
- D-source / D-issuestatus / D-verifiedby → 全部**確認** plan 的假設，無一推翻

範圍變動估計 **< 10%**（判準：`day0-plan-verify.md` ≤ 20% → 繼續 Day 1，風險記入 §Risks）。

### Remaining for Next Day

- Day 0 §0.3 detector（本日續做）→ 然後 Day 1 的 `Issue` / `Action` model + migration
