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

---

## Day 1 — 2026-08-12

### Today's Accomplishments

- **1.1 / 1.2** `Issue` + `Action` 兩個 model、**4 個 enum**、一個 migration
  （`20260812211801_issue_and_action`）：複合錨點 · 複合 FK · 六條 per-command policy ·
  兩個 `validate_extensions` trigger · GRANT 無 DELETE · FORCE RLS
- **1.3** 兩個 repository + spec（各 100% 覆蓋）+ `scoped-client.types.ts` 兩個介面
- **計畫外**：錨點重新校準 5 處活參考（見 checklist 1.3 末項）

### ⭐ D1 分流：第一次導出「選項 B」

W07 design note D1 把 trigger 定位成「**父表結構上給不起錨點時**才用的東西」，不是更好的機制。
`issues` 沒有 `controls` 那個約束（無 M:N 連結表要求兩側 entity 不同），所以它給得起
`@@unique([id, org_entity_id])`，`actions` 因此走**複合 FK**。

**三次的機制不同，而不變的是那條不變式**：

| phase | 子表 → 父表 | 機制 |
|---|---|---|
| W05 | `assets` → `asset_groups` | 複合 FK |
| W07 | `control_tests` → `controls` | BEFORE trigger（父表拒絕錨點）|
| **W08** | `actions` → `issues` | **複合 FK**（父表給得起）|

三者要保護的是同一件事：**「別人的 issue」與「不存在的 issue」必須產生同一個錯誤**。
repository 一旦能先查父表就能分辨兩者 —— 那正是 約束 8 禁止的 oracle。
所以 `ScopedActionClient` 依然**不含** `issue` delegate。

⛔ **這只是結構上成立，還不是量出來的。** Day 3 的 N1 會移掉複合 FK 重跑跨實體測試 ——
若它仍然紅，擋住的就不是那把鑰匙，`AD-BorrowedRefusal-1` 就是第 4 次。

### Drift / Issue（Day 1）

| ID | Finding | 處置 |
|---|---|---|
| **D-migts** ⭐ | **Prisma 用 UTC 生成 migration 目錄名，而 W07 手建的用本地時間** —— 新 migration `20260812131655`（UTC）排在**已套用**的 `20260812164500`（本地）**之前** | 重命名為 `20260812211801`（本地當下，晚於它）。目錄名的唯一功能是排序，正確順序就是它現在表示的。⚠️ 今日限定（明天 UTC 戳自然勝出），但**手建 migration 的時區慣例未定** → 記 AD |
| **D-enumcount** | plan §3.0/§4 寫「+3 enum」，實際 **4 個**（`IssueSource`/`IssueSeverity`/`IssueStatus`/`ActionStatus`）；checklist 1.1 標題寫「+2」卻列了 3 個名字 | 起草筆誤，不影響範圍。checklist 已註明 |
| **D-specgap** ⭐ | `Issue` 的**兩條入邊都只有 enum 沒有 FK**：`source='test'` 說不出哪一次 test（`02a:229` 無 companion id）；`risk_accepted` 說不出哪個 risk（`02a:372-383` 只畫轉換，§3 無欄位）。而 `Evidence` 對同一個問題有 `linked_type` + `linked_id` | 照規格建 + 寫進 schema docstring。⛔ **不發明 `source_id`**（已確認參數 #9）→ Day 4 記一條 AD（兩者**合併成一條**，因為是同一個形狀）|
| **D-globfalse** | 我用 Glob 查生成的 migration 得「No files found」，據此差點判定「Prisma 靜默失效」。實際檔案存在（3494 bytes） | ⚠️ 同一個形狀又一次：**工具回報「找不到」不等於「不存在」**。改用直接列目錄後確認。與 Day 0 那個「exit 1 = 指令不存在，不是 gate 紅」是同族 |

### 工時

| 區段 | 起 | 迄 | 實際 | 錨點 |
|---|---|---|---|---|
| Day 1（1.1 → 1.x gate + 錨點校準）| 21:11:56 | 21:28:30 | **16 min 34 s** | ✅ 兩端閉合 |

⭐⭐ **bottom-up 對應項估 3.25 hr（195 min），實際 16.5 min —— 高估 11.8 倍。**

plan §7 已經按 `AD-BottomUpBlueprint-1` 的建議改用「寫差異」估法（9.5 hr vs W07 的 19.75），
**而仍然高估一個數量級**。W07 的 `actual/bottom-up` 是 0.17；本日這一段是 **0.085**。

→ 初步結論（Day 4 retro 定案）：**問題不在估法的粒度，在於「有藍本時要多久」的直覺本身是錯的**。
把 bottom-up 拆得更細不會收斂，因為每一項都用同一個錯誤的單位成本。
⚠️ 這條要等 Day 2-4 的資料才能下定論 —— 單日單段不足以推翻一個估算方法。

### Remaining for Next Day

- Day 2：controller + module × 2、int spec × 2（各四個範疇測試）、繞開發號的直接寫入測試、full gate

---

## Day 2 — 2026-08-12

### Today's Accomplishments

- **2.1** `modules/issue/` + `modules/action/`：controller · module · controller spec 各兩份；
  `app.module.ts` 掛上（現有 8 個業務 module）
- **2.2** `issue.int.spec.ts`（9 測試）· `action.int.spec.ts`（11 測試）· `int-global-setup.js`
  種入 issues `a80`/`a81` + actions `a90`/`a91` + 兩個導出的 ref_code counter
- **2.x** full gate 全綠

### ⭐ 第一個 body 帶 enum 的端點，和它帶來的新失敗模式

前面每一片的 request body 都只有 uuid / timestamp / 自由文字。這些東西給錯值時，
會在**外鍵**上失敗，而外鍵的 SQLSTATE 是 `scope-refusal.ts` 認得的 → 變成 404。

**enum 不是這樣。** Prisma 在任何 SQLSTATE 產生**之前**就拒絕未知 variant，錯誤裡沒有
這個 app 認得的碼，於是掉進 `throw error` → **500**。

> `{"severity": "urgent"}` 是一個 typo，而沒有守衛時它被回報成伺服器故障。

守衛寫在 controller，且合法值由 `Object.values(IssueSource)` **導出**：

```
const SOURCES = Object.values(IssueSource) as string[];
```

⚠️ **抄一份字面清單會是一個會說謊的 docstring** —— `02a:229` 列了五個 source，三個因為
目標表不存在而未建（`IssueSource` 今天只有 `test` / `manual`）。那天 `audit` 進了 schema，
字面清單會繼續拒絕它，而**不會有任何測試失敗來說這件事**。

### Drift / Issue（Day 2）

| ID | Finding | 處置 |
|---|---|---|
| **D-modcov** | **coverage 三項低於 Day-0 baseline**（92.07/91.9/96.63/93.62 vs 92.58/92.32/96.26/94）| **已歸因，不是退化**：`modules/*/*.module.ts` 全部 0%（既有 6 個 + 新 2 個），它們是 DI metadata 沒有可測邏輯。`entity-scope.module.ts`/`health.module.ts` 是 100% 因為有 unit test 直接 import 它們。jest 門檻 80/70/80/80 → 四項遠高於，**gate 綠**。⛔ **但趨勢要記**：每加一個 module 稀釋一次，第 20 個時會很明顯 → Day 4 進 BACKLOG（候選：`collectCoverageFrom` 排除 `*.module.ts`，或給它們一個統一 smoke test）|

### 第 4 次 `AD-BorrowedRefusal-1` —— 這次是**寫測試時**就避開的

`action.int.spec.ts` 測試 8 要證明 `actions_insert` 的 `WITH CHECK` **自己**會擋。
顯而易見的寫法是「SG1 的 client 寫一列 `orgEntityId: HK1` + `issueId: SG1_ISSUE`」——
而那會靠**複合 FK 的 23503** 通過，`actions_insert` 從未被評估。

實際寫法：`issueId: HK1_ISSUE` 配 `orgEntityId: HK1` —— **這一對是匹配的**，複合 FK 滿足，
所以擋它的只可能是 RLS。三個 bypass 齊備：

| bypass | 防的是誰代勞 | 出處 |
|---|---|---|
| 不經 `issueRefCode` | W04 的 counter policy | W05 clause 2 |
| `createMany`（無 `RETURNING`）| SELECT policy | W06 Day 3 |
| **父子 entity 配對匹配** | **複合 FK** | **W08（本次）** |

⛔ 三次的代勞者各不相同（counter · `RETURNING` · trigger），所以規則不能列舉代勞者 ——
唯一可靠的判準仍是 **Day 3 N3：中性化 `actions_insert` 後這個測試要轉紅**。**尚未驗。**

### 一個 W07 沒有的好處（順帶量到）

複合 FK **不需要被要求就涵蓋 UPDATE**。W07 的 trigger 必須明寫 `BEFORE INSERT OR UPDATE`
才擋得住「先合法寫入、再改指向」的兩步走（W07 Day 1 M6 量到的）。
`actions` 的測試 6 走同一條路徑而**沒有為此寫任何額外的 SQL** —— 少一件會被忘記的事。

### 工時

| 區段 | 起 | 迄 | 實際 | 錨點 |
|---|---|---|---|---|
| Day 2（2.1 → 2.x full gate）| 22:49:30 | 23:01:43 | **12 min 13 s** | ✅ 兩端閉合 |

bottom-up 對應項（controller+module ×2 = 1.0 · int spec ×2 = 1.5）= **2.5 hr / 150 min**
→ 高估 **12.3 倍**。與 Day 1 的 11.8 倍**一致**，不是離群值。

→ 兩天兩段，同一個方向、同一個量級。`AD-BottomUpBlueprint-1` 的判斷（「該修的是估算不是乘數」）
現在有第二、第三個資料點；Day 4 retro 定案時應該提出**具體的替代估法**而不只是再記一次。

### Remaining for Next Day

- Day 3：乾淨重啟 → API-level 走查（真進程 + 真 PostgreSQL）→ **N1-N6 元驗證**
  （N1 = 移掉複合 FK 後測試 4 必須**轉綠**；N3 = 中性化 `actions_insert` 後測試 8 必須轉紅）

---

## Day 3 — 2026-08-12

⚪ **API-level verified（gate + 真進程 + 真 PostgreSQL），無 UI，不主張可用性。**
本 phase 沒有任何 user-facing surface，所以這裡**不是** drive-through，措辭不得暗示可用性。

### 3.1 乾淨重啟 —— 沒有東西要殺

3210 本來就沒有 listener。14 個 node 程序逐一檢視後**一個都沒碰**：3200 是本專案的
web dev server（PID 11688→36748，**8/8 啟動，非本 session**）· 別專案 frontend · azurite ·
playwright MCP · statusline。

啟動 log 是 **Day 2 刻意不宣稱的那件事**（「路由掛上了」）的證據：

```
LOG [InstanceLoader] IssueModule dependencies initialized +0ms
LOG [InstanceLoader] ActionModule dependencies initialized +0ms
LOG [RouterExplorer] Mapped {/issues, GET} route +0ms
LOG [RouterExplorer] Mapped {/issues, POST} route +1ms
LOG [RouterExplorer] Mapped {/actions, GET} route +0ms
LOG [RouterExplorer] Mapped {/actions, POST} route +0ms
WARN [DevPrincipal] DEV PRINCIPAL ACTIVE — EVERY entity-scoped endpoint is scoped by a
     hard-coded assignment (SG1), not by any credential.
[isms-api] listening on http://127.0.0.1:3210 (api-docs at /api-docs)
```

收工後 `TaskStop` + 複驗：**3210 free**，無父程序已死的殘留 worker。

### 3.2 API-level 走查 — observed vs intended

| # | 送出 | 預期 | **實際** | |
|---|---|---|---|---|
| A1 | `GET /issues` | 200 · 空 · 帶 `_devPrincipal` | `200 {"data":[],"_devPrincipal":true,…}` | ✅ |
| A2 | `POST /issues` SG1 有效 | 201 · `ISSU-SG1-000001` · `open` | `201` `ISSU-SG1-000001` · `status:"open"` · `dueDate`/`ownerUserId`/`description` 皆 **null** | ✅ |
| A3 | `POST /issues` HK1 | **404 不是 403** | `404 org entity …c1 not found` | ✅ |
| A4 | `severity:"urgent"` | **400 不是 500** ⭐ | `400 severity must be one of: low, medium, high, critical` | ✅ |
| A5 | `source:"audit"` | 400 · 清單導出 | `400 source must be one of: test, manual` | ✅ |
| B1 | `POST /actions` 自己的 issue | 201 · `ACTN-SG1-000001` | `201` · `completedAt`/`verifiedBy` null · `status:"open"` | ✅ |
| B2 | `issueId` 不存在 | 404 · **只帶欄位名** | `404 issue or assignee not found` | ✅ |
| B3a | `issueId` = HK1 的 issue（**存在**但不可讀）| 404 | `404 issue or assignee not found` | ✅ |
| B3b | `issueId` = 完全不存在 | **與 B3a 逐字相同** | `404 issue or assignee not found` | ✅ |
| B4 | `GET /actions` | 列出 B1 | 一筆 | ✅ |
| B5 | `GET /issues` | 只見 SG1 的 | 一筆；看不到手動種入的 HK1 那筆 | ✅ |

⭐ **B3a / B3b 是 API 層的 oracle 測試**：為它在 `isms_dev` 種了一筆 HK1 的 issue（`…dd01`）。
兩個回應**逐字相同** —— 呼叫者無法分辨「那個 id 屬於別人」與「那個 id 不存在」。

⚠️ **A4 是本 phase 新增的守衛第一次在真進程上被驗。** 沒有它，一個 typo 是 500。

⚠️ `isms_dev` 現在多了走查產生的資料（1 issue + 1 action + 1 筆手動種入的 HK1 issue）。留著。

### 3.3 元驗證 N1-N6

⚠️ **中性化必須改 migration 檔本身。** `int-global-setup.js:317-318` 每次 `test:int` 都
`DROP DATABASE … WITH (FORCE)` + `CREATE` + `migrate deploy` —— 直接下的 SQL 會被沖掉。

| N | 中性化 | 預期 | **實際轉紅** | |
|---|---|---|---|---|
| **N1** | 移掉 `actions_issue_id_org_entity_id_fkey` | 測試 4 轉紅 | **4、5、6**（其餘 **8 綠**）| ✅ |
| **N2** | `issues_insert` `WITH CHECK` → `true` | 測試 7 | **只有 7** | ✅ |
| **N3** | `actions_insert` `WITH CHECK` → `true` | 測試 8 | **只有 8** | ✅ |
| **N4** | `issues_read` `USING` → `true` | 測試 5 | **5 + 9**（roll-up）| ✅ |
| **N5** | `actions_read` `USING` → `true` | 測試 7 | **7 + 11**（roll-up）| ✅ |
| **N6** | fixture 的孤兒變成非孤兒 | `run_all` 6/7 | **6/7 `[FAIL] entity-index`** | ✅ |

**⭐⭐ N1 是本 phase 的核心結論。** W07 design note 的 D1 判準說「父表給得起錨點時用複合 FK」——
移掉那把鑰匙，跨實體引用**插入成功**（`Received promise resolved instead of rejected`），
而其餘 8 個測試不受影響。**擋住它的確實是複合 FK，不是別的東西。**

N1 順帶證實了 Day 2 只是「結構上推論」的那件事：測試 6（UPDATE 重指向）從未為 UPDATE 寫過
任何額外 SQL，卻隨 FK 一起失效 —— **FK 免費涵蓋 UPDATE**，而 W07 的 trigger 必須明寫
`BEFORE INSERT OR UPDATE` 才行（W07 Day 1 M6）。

**⭐⭐ N3 = `AD-BorrowedRefusal-1` 第 4 次確認不存在。** Day 2 刻意把測試 8 的
`(issueId, orgEntityId)` 寫成**匹配的一對**，好讓複合 FK 無法代勞；N3 證明了那個設計有效 ——
中性化 `actions_insert` 後**只有它**轉紅。

### Drift / Issue（Day 3）

| ID | Finding | 處置 |
|---|---|---|
| **D-n6design** ⭐ | **N6 第一版是我把元驗證本身設計錯了** —— 把 fixture 的 `ShadowLedger` 改名成 `Policy2` + table `policies`，以為它就不再是孤兒；而 `Policy2` 與 `policies` **都不在**索引上（索引寫的是 `Policy`），所以它仍然是孤兒，`run_all` 照樣 7/7、EXIT=0 | ⛔ **EXIT=0 讀起來像「N6 通過」**。查了才發現是設計錯。更正版改成 `Risk` + `risks`（真的在索引上）→ 6/7 FAIL ✅。→ 通則：**元驗證本身也會有 bug，而它的 bug 長得跟「通過」一樣** |
| **D-widename** | 測試 6（issue）與測試 9（action）—— 兩個「cross-entity WRITE through the repository」—— 在 INSERT policy 中性化下**仍然綠**。它們借的是 `ref_code_counters` 的拒絕（W05 的形狀）| **不是缺口**：7/8 才是 INSERT policy 的專屬測試且正確轉紅。但那兩個測試的**名稱比它們實際證明的寬** → Day 4 記一條 AD（名稱應該說「repository 路徑會拒絕」，不是「cross-entity WRITE 被 X 拒絕」）|
| **D-pollfalse** | 啟動後 90 秒的 poll 回報 `API DID NOT COME UP`，而 6 秒後手動查是 **200**。⚠️ 我第一時間提出「Windows 先解析 IPv6」的解釋並寫進了回覆 —— **實測 `localhost` 與 `127.0.0.1` 兩個都通，那個解釋是錯的** | **根因未確定**（最可能是 16 秒 tsc 編譯讓它卡在窗口邊緣）。⛔ 記為未確定，**不編一個聽起來合理的原因**。與 Day 0「exit 1 = 指令不存在」、Day 1「Glob 找不到 ≠ 檔案不存在」同族：**工具的否定回報不是事實的否定** |

### 工時

| 區段 | 起 | 迄 | 實際 | 錨點 |
|---|---|---|---|---|
| Day 3（3.1 → N6 + checksum 複驗）| 23:32:28 | 23:42:11 | **9 min 43 s** | ✅ 兩端閉合 |

bottom-up 對應項（分流+元驗證 0.75 · Day 3 API 驗證 0.75）= **1.5 hr / 90 min** → 高估 **9.3 倍**。

**四段合計**：bottom-up 8.0 hr（480 min）· 實際 **46.4 min** · ratio **0.097**。
Day 0 那段（無起點錨點）不計。⛔ 遠低於 `CALIBRATION-MATRIX.md` 的 0.4 下限，且**方向一致、
無離群值** —— Day 4 retro 要提出具體的替代估法，不是再記一次「高估了」。

### Remaining for Next Day

- Day 4 closeout：`CH-023` · W07 design note 追加 D1 分流結果（**同行追加，行數不變**）·
  retrospective + calibration · 新 AD 登記 · 導航檔 · `git diff --name-status` 對照 plan §4

---

## Day 4 — 2026-08-13

### Today's Accomplishments

- **4.1** `CH-023` · W07 design note 追加 D1 分流結果（**1/1，344 = 344**）· BACKLOG 新增 6 條 AD
- **4.2** `retrospective.md` Q1-Q7 · calibration matrix + log · `RISK_REGISTER` R4 ·
  `CLAUDE.md` · `ROADMAP.md` · `MEMORY.md` + `memory/project_w08_issue_and_action.md` ·
  `status: closed` · final gate sweep

### plan §4 對照 —— 28/28，零計畫外

`git diff --name-status edb5853..HEAD` 逐一對照 plan §4：**28 個目標全部命中**，
UNTOUCHED 五項（`entity-scope.resolver.ts` · `modules/control-test/` · `evidence/` ·
既有 10 個 migration · `docs/14-adr/` · `.github/workflows/`）**全部未動**。
本次**沒有**漏做的附帶動作（`AD-DecisionSideEffect-1` 的檢查，成本 < 1 min）。

### ⚠️ Calibration —— 兩個定義差 3.6 倍，而差額可以被算出來

| 定義 | 值 | Ratio | Band |
|---|---|---|---|
| 拍板的窗口（`AD-CalibrationMetric-2`）| `20:17:02 → 00:1x` ≈ **238 min / 3.97 hr** | **0.84** | **IN** |
| 逐段兩端錨點加總 | **~66 min / 1.1 hr** | **0.23** | **UNDER** |

差額 **169 min（71%）** 是四次等待使用者回覆的間隔，且它**可以獨立機械算出** ——
每個 Day 的起始時間戳減去前一個 commit 的時間戳：`55 + 78 + 28 + 8`。
`238 − 169 = 69`，與逐段量測的 **66** 對得上（差 3 min 是 commit 本身）。

⭐ **兩個方法交叉驗證成功，所以問題不在量測而在定義。**
⚠️ **那個 IN 是巧合** —— 169 分鐘恰好把 0.23 抬進 band → `AD-CalibrationIdleGap-1`。

⛔ **`AD-BottomUpBlueprint-1` 的提議被執行了，而它沒有收斂**：`actual/bottom-up` = **0.116**，
比 W07 的 0.17 **還低**，四段全在 9-12 倍之間無離群值。AD **不關**，附替代方案。

### Drift / Issue（Day 4）

| ID | Finding | 處置 |
|---|---|---|
| **D-memkw** | **`MEMORY.md` 的 W05/W06/W07 三條 Keywords 原本錯位** —— 第 65 行是 W06 的、66 行是 W05 的，而 **W07 完全沒有 Keywords**。累積自 W05→W07 三次 closeout | 在我要加 W08 的**同一區塊**，故一併歸位 + 補上 W07 缺的那行。**沒有刪除任何既有 Keywords**。⚠️ 這不是「順路開新工作」（節流閘），是「不在錯的結構上疊加」—— 若照原樣加 W08，錯位會更難看懂 |
| **D-adcount** | BACKLOG 條數的兩種數法給出 **75 vs 77** | 查了：差額是**優先度判準表**的 3 個示例（130-132 行，不是 AD 條目）減去 `AD-NegativeGate-1` 的 `🔴 **P0 候選**`（格式與 pattern 不符）。⚠️ BACKLOG 開頭記錄過「第一版數法的欄位索引假設對兩列失效」—— **同一個坑的第二次**，這次兩種數法對照後才取值，並把數法寫進 BACKLOG 開頭 |

### 工時

| 區段 | 起 | 迄 | 實際 | 錨點 |
|---|---|---|---|---|
| Day 4（4.1 → final gate）| 23:54:26 | **00:14:39** | **20 min 13 s** | ✅ 兩端閉合 |

**五段合計**（Day 0 verify 段無起點錨點，不計）：**~66 min**。
bottom-up 對應項（closeout 1.5 hr = 90 min）→ Day 4 高估 **4.5 倍** ——
⭐ **這是五段裡最低的**，因為 closeout 的工作量**不隨藍本複用而縮減**（文件是新寫的）。
→ 這條觀察支持 retro Q2 的替代方案：**藍本度分級**，而不是對所有項目套同一個乘數。

### Remaining

- ⏳ **PR push + open → CI → merge：等使用者確認**（push 是 outward-facing）
