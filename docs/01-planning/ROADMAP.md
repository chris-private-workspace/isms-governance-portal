# ROADMAP — 執行順序層

**Purpose**: 回答「**先做哪個？要等什麼？**」。**不**回答「有什麼工作」—— 那是 `BACKLOG.md`。

**Category**: Planning
**Created**: 2026-08-07
**Last Modified**: 2026-08-13
**Status**: Active

> **Modification History**
> - 2026-08-13: Advance item 4 to M1 slice 7 (W10) — 19/35, a unique index measured as an oracle
> - 2026-08-13: Advance item 4 to M1 slice 6 (W09) — 17/35, denominator −1 by user ruling
> - 2026-08-13: Advance item 4 to M1 slice 5 (W08) — 14/36, the criterion finally split
> - 2026-08-12: Advance item 4 to M1 slice 4 (W07); add item 9 — the anchor detector, deferred ONTO this list
> - 2026-08-12: Advance item 4 to M1 slice 3 (Phase W06) — 8/35 entities, ADR-0014, clause 2 refuted
> - 2026-08-11: Advance item 4 to M1 slice 2 (Phase W05) — 7/35 entities, invariants adjudicated
> - 2026-08-10: Drop the duplicated negative-gate count — single source is BACKLOG (audit AD-8)
> - 2026-08-10: Phase 無 —— 首次填入排序項（CH-016）；啟用門檻已達成，見下方 §為什麼現在啟用
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

---

## 職責分工（不要搞混，也不要在本檔複製 BACKLOG 內容）

| 文件 | 回答什麼問題 | 內容 |
|---|---|---|
| [`BACKLOG.md`](./BACKLOG.md) | **有什麼工作？做到哪？** | 單一來源（PROCESS R7）—— 分類 · 狀態 · 完整細節 · 實據 |
| **本檔** | **先做哪個？要等什麼？** | **只有順序 + 前置條件**，每項一行，細節一律 link 回 BACKLOG |

**為什麼要分開**：BACKLOG 有分區和狀態，但**沒有順序** —— 讀完仍然不知道下一步做哪個。
**為什麼不合併**：BACKLOG 會越來越長，在裡面排序會讓兩種資訊互相淹沒。
**為什麼不複製細節**：複製 = 造出第二份要同步的清單 → **必然 stale**。
這跟 `STATUS_AUDIT.md` §5 是同一條鐵律。

> ⚠️ **只有在 BACKLOG 已經長到「讀完不知道下一步」的時候才需要本檔。**
> 專案早期（待辦 < 10 項）**不要**開這一層 —— 多一份要同步的文件就是多一個漂移面。

### 為什麼 2026-08-10 才啟用

首次跨來源審計（[`STATUS_AUDIT.md`](./STATUS_AUDIT.md) §2.7 **AD-2**）量到：本檔自建立起
**零排序項**，而它自己設的門檻已經成立 —— `BACKLOG.md` §Open 有 **48 條**。

更關鍵的是 **AD-5** 揭露的失效模式：`AD-CIRequired-1` 的解封條件（「W01 骨架建立後設」）
**成立了兩次而無人察覺**，因為它只寫在 BACKLOG 的備註欄裡，而備註欄沒有人會逐條回頭掃。
同一種病在 `AD-ImageDigest-1` / `AD-ImageBuild-1` 已經出現過 —— **這是第 3 次**。

所以本檔的職責比模板寫的更具體一點：**有解封條件、有前置依賴、有死線的項目，
必須出現在一份會被讀的清單上**，而不只是 48 條備註裡的一句話。

---

## 怎麼用

1. **開 session 想知道做什麼** → 由上而下找第一個 `▶` 或 `⬜`，那個就是下一項
2. **想知道該項細節** → 跟「細節」欄的連結去 BACKLOG / phase folder，**不要只讀本檔就開工**
3. **完成一項** → 本檔標 `✅` **同時**更新 BACKLOG 對應行
   —— 收尾時要回頭改**兩處**，只改一處就是下一次審計的漂移發現
4. **識別到新工作** → **先進 BACKLOG**（R7），再決定插入本檔哪個位置

**標記**：`✅` 完成 · `▶` 進行中 · `⬜` 未開始 · `⏸` 等外部 · `⏰` 有死線

---

## 主線（依序）

<!-- 每項一行。超過一行代表細節該回 BACKLOG。 -->

| # | 項目 | 標記 | 前置條件 | 細節 |
|---|---|---|---|---|
| 1 | `AD-CacheControl-1` —— 定義「什麼算 sensitive」的 `Cache-Control` 預設 | ✅ | — | W03（2026-08-10）—— 判準是「entity-scoped 嗎」不是「敏感嗎」→ 全域無例外清單 |
| 2 | `AD-SecDoDAutomation-1` —— `16` 的 28 點**分類** | ✅ | — | [分類報告](../09-analysis/secure-dev-dod-automation-classification-20260810.md)（2026-08-10）|
| 2b | `AD-SecDoDAutomation-1` —— **B 類三點**（#17 seed 資料無 checksum-valid 卡號 · #10 瀏覽器儲存禁令 · #25 危險 sink）| ⬜ | 第 2 項（已完成）| 同上 §建議的實作順序 |
| 2c | **拍板：Entra ID 之後，`16` #11–15 的密碼／憑證責任邊界** | ⬜ | — | 同上 §需要拍板的 —— **可能值得一份 ADR** |
| 3 | **OQ-6 spike → ADR-0005** —— 受治理擴充欄位的儲存機制 | ✅ | — | W03（2026-08-10）—— [`ADR-0005`](../14-adr/0005-governed-extension-storage.md)；兩層獨立性已元驗證 |
| 4 | **M1 — Data foundation** | ▶ | **slice 7 / N 已交付**（W10，2026-08-13，**MERGED PR #52**，`afa667a`）—— `02a` §3.1 的版本化快照兩張表 + 四個端點，**19 / 35 實體**。⭐⭐ 規格同時給了 `current_version_id`（父表）與 `state`（子表）兩種「哪一版現行」的說法，而它們**互斥** —— 翻 `state` 就是編輯一列 `02a:260` 說永不編輯的資料。只建父表指標，換到版本表**一條 `FOR UPDATE` policy 都沒有**（ADR-0014 缺席即最嚴格），「至多一個現行版」變成**構造上為真**而非靠索引。⛔⭐ **本片最重要的產出是一個被量出來的漏洞**：`@@unique([reportId, versionLabel])` 兩個值都來自 request body，而**唯一索引不受 RLS 管且早於複合 FK 觸發** —— 實測「撞別實體的標籤 → 23505 / 不撞 → 23503」，可一次一猜列舉別人的版本史。修法是把 `org_entity_id` 放進鍵（對合法列完全冗餘）→ `AD-UniqueKeyOracle-1`（P0 候選，值得一條 detector）。⭐ promote 移進 DB 的 `AFTER INSERT` trigger，因為 `runScoped` 讓每個 operation 各自成一個交易；副作用是介面**更窄**。🚩 元驗證 **6/6**，N1a 證明缺席的 policy 自己撐得住、N4 零轉紅暴露 INSERT policy 零覆蓋（`AD-BorrowedRefusal-1` 第 5 次），而補的測試第一版被 `RETURNING` 遮蔽 —— **一條已記錄的陷阱再次被踩，抓到它的是重跑中性化**。⛔ **M1 的 DoD 仍未達成** —— 其餘 16 張表是 slice 8..N ‖ **前一片**（W09，2026-08-13，**MERGED PR #50**，`6446099`）—— `05` §Shared assessment engine 的三張表 + 六個端點，**17 / 35 實體**（分子 +3、**分母 −1**：使用者裁決 `Assessment (RCSA)` 是用例不是表，`02a:34` 改註記不刪列，分母由 `check_entity_index.py` 導出）。⭐ `05:39` 明文要求這個引擎「build **once** rather than three times」，而 W07 的 `ControlTest` 已經開始了它警告的那件事。⭐⭐ **`template_version` 逼出一個三選一**：呼叫端傳（是宣稱不是快照）· 開父表 delegate（為一個整數拆掉三個 phase 的 oracle 防線）· **DB 在 `BEFORE INSERT` 填**（選它，介面維持窄且欄位真的是規格說的意思）。而那個 trigger 差一點自己開 oracle —— `COALESCE(...,0)` 不 RAISE 才讓兩種不可達都收斂到 23503。⭐ **`evidence` 首次回頭補複合錨點**：前三次父子表都同 phase 出生，「父表給得起但還沒有」從未被問過。⭐ **本 schema 第一個跨欄位約束**（SoD CHECK，四方向實測，UPDATE 免費涵蓋）。🚩 元驗證 **6/6 方向全中**，含兩個反直覺預測。⛔ **M1 的 DoD 仍未達成** —— 其餘 18 張表是 slice 7..N ‖ **前一片**（W08，2026-08-13，**MERGED PR #47**，`74d8d56`）—— `Issue` + `Action`（CAPA）+ 兩組端點，**14 / 36 實體**（`check_entity_index.py` 機械導出）。⭐⭐ **W07 的 D1 判準第一次導出「另一個」答案** —— 它說 trigger 是父表**結構上**給不起錨點時才用的，而在此之前每個父表都給不起；`issues` 沒有 M7 連結表的約束，所以 `actions` 走**複合 FK**。**N1 是結論**：移掉那把鑰匙，跨實體引用**插入成功**，恰好 3 個測試轉紅、其餘 8 個不受影響。順帶量到 **FK 免費涵蓋 UPDATE**。⭐ `AD-BorrowedRefusal-1` **第 4 次在寫測試時就被設計掉**（前三次都是事後抓到）。⛔ **M1 的 DoD 仍未達成** —— 其餘 22 張表是 slice 6..N ‖ **前一片**（W07，2026-08-12，**MERGED PR #44**，`19bc4f7`）—— `ControlTest` + `Evidence` + 兩組端點，**12 / 36 實體**（W08 起真的機械導出：`check_entity_index.py`，`run_all` 7/7 —— ⚠️ **分母也是手寫的**，實為 36 非 35，差在 foundation services 節）。⭐ 第一次遇到**複合 FK 結構上不可用**的子表（`controls` 明文拒絕錨點；`evidence.linked_id` 多型無 FK）。量測答案：**RI 檢查繞過 RLS**，「指向看不到的父列」INSERT **成功** —— 與「不存在 → 23503」合起來是**存在性 oracle**，發生在資料庫層。機制由量測導出：`BEFORE INSERT OR UPDATE` + `SECURITY INVOKER` trigger，⭐⭐ **關掉 oracle 的是執行順序不是 trigger 本身**。元驗證 **8/8 全紅**（N2/N4 修法前為 **0** → `AD-BorrowedRefusal-1` 第 3 次，**結構性解法門檻成立**）。⛔ **M1 的 DoD 仍未達成** —— 其餘 23 張表是 slice 5..N；⛔ `AD-RiskBand-1` 仍必須在 M8 之前拍板 ‖ **前一片**（W06，**MERGED PR #41**，`3a3606b`）—— `Control` + 三個寫入端點 + **ADR-0014**（範疇可以是**列**的屬性；三條 per-command policy，無 `FOR DELETE`）。⭐ **W05 兩條新條款的裁決：條款 1 夠用 / 條款 2 需再加** —— 「繞開發號的直接寫入測試」被實測推翻：Prisma `create()` 的 `RETURNING` 讓 SELECT policy 先擋，所以它測的是**讀**的 policy。新版條款要求該寫入**不得產生 `RETURNING`**，且驗收是「中性化 `WITH CHECK` 後它會紅」。**W04 七不變式第二次負載：可複製 6 / 需補充 1**（權限檢查在 RLS 之前）。⚠️ **M1 的 DoD 仍未達成** —— 35 個實體裡建了 **8** 個，其餘 27 張表是 slice 4..N；⛔ **`AD-RiskBand-1` 必須在 M8 之前拍板**（儀表板數的是分帶不是分數）| [`07:32`](../02-architecture/07-wave1-build-plan.md) · [W06 retro §US-6](./W06-m1-control-and-asset-endpoints/retrospective.md) · [W06 design note](../02-architecture/design-notes/W06-row-level-scope.md) |
| 5 | `AD-ScopedClientDI-1` —— 範疇化 client 如何抵達 `core-model` | ✅ | — | W03（2026-08-10）—— ⚠️ **結論與原提議不同**：token 不建（零消費者），型別是 `core-model` 自宣告的結構型別，實例走方法參數 |
| 6 | `AD-ScopeConcurrency-1` —— 並行範疇汙染的常駐測試 | ✅ | — | W03（2026-08-10）—— 40 次**交錯**查詢，逐列斷言 |
| 7 | `AD-SecDoDAutomation-1` **實作** | ⬜ | 第 2 項的分類結果 —— 跳過分類會建出對人工項目無效的假 gate | [`BACKLOG.md`](./BACKLOG.md) |
| 8 | **拍板：編號引用的「預留 vs 失效」判準** —— `AD-StaleRecordRef-1` 的 detector 前置 | ⬜ | — | [`BACKLOG.md`](./BACKLOG.md) —— 前向引用預留編號是**合法的**（`AD-ChNumber-1`），detector 不能單純要求「解析得到」|
| 9 | **`AD-DesignNoteAnchor-1` 的 detector** —— `file:line` 內容比對 + `git merge-base --is-ancestor <sha> main` | ⬜ | — | ⭐ **本列存在的理由就是這條 AD 自己的失效形狀**：上一次的再延寫成「slice 3 處理」放在 BACKLOG **備註欄**，而 W06 就是 slice 3，收尾時沒有人回頭看（`AD-5`：有解封條件的項目必須出現在一份**會被讀**的清單上）。使用者 2026-08-12 **明確再延**，這次落在主線上。**現成驗收命中**：`02a:413` 被 ADR-0014（3 處）· `schema.prisma:894` · W06 design note `:64` 引用，實際內容在 `:415`；另有 W01 兩個**不在 `main` 上**的 SHA。⚠️ W07 已交付**上游的**便宜解法（`AD-MdAnchorLineShift-1`：被錨定的文件編輯不得改變行數），但它管不了刻意的結構性改寫 → detector 仍需要。⭐ **W07 post-merge 量到一條設計約束**：PR #44 又是 rebase merge，五個 SHA 全被改寫、14 處引用已改指 main 側；但 closeout 文件裡**刻意保留了 3 處已死的 SHA**，因為那幾句話的內容就是「這些 SHA 不在 main 上了」。**detector 必須分辨「引用」與「提及」** —— 單純數 SHA 出現次數會把正確的說明判成漂移。⭐ 另一條：**author date 不受 rebase 影響**（逐一比對過），所以依賴 commit 時間戳的 calibration 推導不需要跟著改。⭐⭐ **W10 提供了本條最尖銳的一個實例**：PR #52（又是 rebase merge）改寫的 SHA 裡，有一個的**唯一作用就是可查證性** —— closeout 引用 `8179319` 來證明「六個中性化的預期方向寫在執行之前」。SHA 一改寫，那句證據就指向一個 main 上不存在的物件，**而所有 gate 仍然全綠**。已改指 `8a9cce6` 並補上 author date（07:54:16Z，兩側相同）。⇒ detector 的價值判準因此更清楚：它要抓的不是「SHA 過期」，是**「一句話的證明力靜默消失」**。⛔⭐ **CH-027（PR #54）提供了最強的一個實例：那份 progress 先寫下這個教訓，然後自己踩了它** —— 它引用 `56822e4` 證明六個中性化的預測寫在執行之前，rebase 改寫成 `7c8d46f` 後該引用在 main 上指向不存在的物件，**而 PR 描述與 commit message 裡的舊值已發布、永遠改不了**。⇒ 這條 AD 的必要性不再需要論證：**「記得回頭改」在一份剛寫完「記得回頭改」的文件上失效了**。⭐ 連帶第 2 次量到 **author date 逐秒不變**（`09:31:41+08:00`），穩定錨點是它而不是 SHA |
| 10 | **`AD-CountBeforeLastEdit-1` 的機械導出** —— `BACKLOG.md` §Open 的總數與三個優先度計數改由腳本重算並比對，不符即 fail | ✅ | **CH-027**（2026-08-14）—— ⛔ **原寫「排 W09 Day 0（不另開 CH）」，而那個落點失效了兩次**（W09、W10 各一次）。使用者 2026-08-14 改判獨立 CH。**理由留在這裡而不是靜靜改掉**：先例 `check_entity_index.py` 之所以成功，是因為它**是 W08 的 deliverable、進了 W08 的 checklist**，有一個 `[ ]` 盯著；本條在 W09 / W10 只存在於**本表的一列**，而 **ROADMAP 的列不是 checklist 的列** —— 沒有任何會被逐項勾選的清單提到它，兩次 closeout 都沒有東西發現它沒被做（`AD-5` 再現）。⇒ **「複製成功的先例」複製到的必須是那個先例真正生效的機制，不是它的表面形狀** | ⭐ **完全複製已成功的先例**：`AD-EntityCountDerivation-1` / `AD-EntityIndexIncomplete-1` 是同一個形狀（手寫計數器），排進 W08 Day 0 由 `check_entity_index.py` 一次關掉，**沒有吃掉 `CH-017` 的治理配額**。⚠️ **今天只做了一半** —— 數字改成「先跑指令再抄」，但沒有任何東西會在不符時 fail，而本條的證據就是「靠紀律重跑」會在最警覺時失效（W08 closeout 認真做了兩種數法對照，然後又加了一條而沒重數）|

> **W02 已經提前交付了 M2 的核心**（RLS 在資料庫層強制範疇，ADR-0004）。
> M2 剩下的是組織階層與管轄區標記，不在上表 —— 它跟著 M1 的實體一起長。

---

## ⏰ 有死線的（不受「押後」影響）

<!-- 押後一條主線是合理的，但死線不會等人。任何有外部時間限制的項目放這裡，
     即使它在主線上排得很後面。 -->

| 死線 | 項目 | 不做的後果 | 細節 |
|---|---|---|---|
| **2026-09-07** | `AD-TrivyExempt-1` —— distroless base 的 `libssl3` 六條 trivy 豁免到期 | 到期即自動變紅（trivy `expired_at`，不需要有人記得）。⚠️ **CH-015 讓後果升級**：`容器映像 — trivy` 從 2026-08-10 起是 **required check**，所以到期不再只是「CI 有個叉」，而是**所有 PR 停止可 merge**。到期時二選一：重拉已重建的 base → 刪 `.trivyignore.yaml`；或**逐條重新分流**（不可靜靜延期）| [`BACKLOG.md`](./BACKLOG.md) |

---

## ⏸ 等外部（不佔主線順位）

| 項目 | 等什麼 | 誰能解 | 細節 |
|---|---|---|---|
| `AD-DAST-1` | 一條能碰到 staging 的路徑 —— GitHub 託管 runner 在公網，接不到只存在私有 VNet 的 staging | infra team（RIT）提供 VNet 內 self-hosted runner，**或**使用者拍板等價路徑 | [`BACKLOG.md`](./BACKLOG.md) |
| `AD-IaCEvidence-1` | infra team 的 IaC 掃描證據（本專案沒有 IaC 可掃，義務已換手未消失）| RIT —— PAR 第 7 點已索取 | [`BACKLOG.md`](./BACKLOG.md) |

> 這兩條**都影響 M0 DoD**，且**都不是本專案單方面能關掉的**。
> ⛔ M0 收尾時不得逕行打勾或標 N/A —— 要嘛引用對方的證據，要嘛明記「由內部第三方營運」。

---

## 押後到某個里程碑之後

<!-- 明確押後的東西寫在這裡，而不是從清單上消失。
     「消失」跟「刻意押後」在三個月後看起來一模一樣。 -->

| 項目 | 押到何時 | 為什麼可以等 |
|---|---|---|
| `AD-Mockup-2` · `AD-Mockup-3`（🔴 P0）| **M8 移植前** | 兩者阻斷的是旗艦儀表板的資料結構（以國家為鍵，容不下 13 OpCo），**不阻斷 M1–M7**。在沒有 runtime 的情況下討論 UI 落差，違反「文檔成長跟隨已驗證的 runtime」|
| `AD-RiskForm-1`（🔴 P0）| **M7 前** | 風險表單實作的是另一套方法論 —— 要在 Risk register 真的開始建時才有標的可對 |
| `AD-Incident-1`（🔴 P0）| **Wave 2** | 已確認參數 #5：Wave 1 不提前拉合規／事件模組。缺的 restricted block 連同它的 CISO/HR 權限隔離一起走 |

> **第 5 條 P0 刻意不在本表**：`AD-NegativeGate-1`（🔴 P0 候選）不是一件「要做完的事」——
> 它是每個 phase 都在消費的紀律，**刻意保持開啟**。
> ⚠️ **實例計數不寫在這裡** —— 清單的唯一權威是 [`BACKLOG.md`](./BACKLOG.md) 的該列（審計 AD-8：
> 同一個手動計數器寫在三處，W03 交付第 6 個時三處都沒跟上）。
> 把它排進順序會製造「做完就關掉」的錯覺。
