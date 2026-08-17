# Phase W18 Progress

**Phase**: W18 — M1 slice 13: `Event` + `posture_snapshot`

---

## Day 0 — 2026-08-17

### ⏱️ Calibration T0

**T0 = `2026-08-17T02:47:33Z`**（local 10:47:33）

⭐ **蓋在讀第一個檔案之前** —— 這是 W17 retrospective 指定的改進。
W16 的 T0 蓋在動 plan 之前、W17 蓋在動 checklist 之前，兩次都讓**起草段落在量測窗口之外**，
所以 W17 的 `actual ~2.5 hr` 是**下限**、`ratio 0.78` 是偏低的估計。

本片的窗口從**規格都還沒讀**的這一刻開始，所以分子第一次涵蓋整段工作。

⚠️ 量法宣告（`AD-CalibrationNoTimeRecord-1` 要求）：
逐段量測，每個 commit 的 author date 為段界，T0 至首個 commit 為第一段。
間隙 > 30 min 的視為中斷，在此逐條列出並說明是否計入。

### 起草前的既知狀態

- `main` = `fd6472a`，工作樹 clean，只有 `main` 一個分支
- `run_all` **9/9**（`sha-anchors` 自 CH-036 起為常設 gate）
- 實體索引 **32 / 36** —— 本片目標 **34 / 36**
- M1 其餘 4 張表中，`AccessRequest` / `AccessReviewCampaign` **不在本片**：
  `02a:325` 的 `org_entity_id` nullable 與約束 8 鐵律 1 直接衝突，需使用者裁決（slice 14）

---

### Plan 核可

使用者於 2026-08-17 核可 plan（`status: draft` → `active`），指示「可以開始執行 W18」。
分支 `feature/W18-event-and-posture-snapshot` 自 `main` `fd6472a` 開出。

---

## Day 0 — Drift Findings

> 三-prong 程序見 `docs/rules-on-demand/day0-plan-verify.md`。
> ⛔ 鐵律：**不默改 plan §Technical Spec** —— 需要改的寫進 §Risks，保留審計軌跡。

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | ⭐ **plan §3.x 對 `Event.status` 的第一個理由是錯的。** plan 寫「不在 `02a:233` 的欄位清單上」—— 但 `02a:157` 明文 *"Only entity-specific fields are shown; every entity also carries the §1.1 base fields"*，而 `status` 是 §1.1 base field（`02a:93`）。§3 的每一行**都只列 entity-specific 欄位**，所以「不在那一行上」對任何 base field 都成立，不構成理由 | 省略 `status` 的理由收斂成**單一條且等級是 JUDGEMENT**：`02a:417` 給 Event **5 態**（Reported → Triaged → Investigating → Resolved → Closed），`11:45-58` 的 mermaid 給 **8 個具名狀態**，共通只有 4 個，**從未裁決**。⚠️ 與 `Attestation` 的 `status` 省略（`schema.prisma:2228-2235`）同族但**理由相反**：那裡是「§4 沒給它 lifecycle」，這裡是「§4 給了，而另一份權威給了不相容的另一份」 | 🔴 **改 plan §Risks**（已加） |
| **D2** | `events` 的 base-field 信封 = `attestations` + `legal_holds` 的**同一個信封**，逐欄相同：`id` · `ref_code` · `org_entity_id` · `created_by` · `updated_by` · `version` · `extensions` · `created_at` · `updated_at` · `retired_at`。三者共同省略 `status` · `owner_user_id` · `is_active` | §3.1 欄位數定案 = 6 domain + `org_entity_id` + 9 個 base 欄位。`owner_user_id` 省略理由沿用 `schema.prisma:303-305`（M4 之前無指派路徑）；`is_active` 沿用 `:306-308`（**零張表實作**，`AD-IsActiveNeverBuilt-1`）| ✅ 無變動 |
| **D3** | ⭐⭐ **`posture_snapshots` 不帶 `ref_code` / `version` / `updated_at` / `updated_by` / `retired_at` / `extensions`，而先例是 `AuditLog` 不是 `Attestation`。** `schema.prisma:2063-2065`：*"Audit rows are read as a chain, never cited individually, and a ref_code counter is one more write on the hottest path"*；`:2067-2072`：*"⛔ A `retired_at` on an append-only trail IS A REDACTION MECHANISM"* | 三個理由**逐條命中快照**：排程 job 批次寫入（13 OpCo × 9 metric = 每期 117 列，全部在同一個 job 裡）· 讀的是矩陣從不個別引用 · `02a:475` 明文 append-only ⇒ `retired_at` 會是 redaction。⭐ **`02a:465-473` 的 7 欄清單與這個推論獨立地同意** —— 兩條路徑得到同一個答案 | ✅ 強化理由 |
| **D4** | `PostureSnapshot` **需要** ALIAS；`Event` **不需要**。`check_entity_index.py:187` 是三元組交集 `{model, table, ALIASES.get(model)}` ∩ `indexed`，**無 snake_case 轉換、無單複數規則、無 case folding**（`:22-27` 明說「no rule connecting them」）| `PostureSnapshot`/`posture_snapshots` 皆 ≠ `posture_snapshot`（`02a:42` 的字面）⇒ 不加 ALIAS 則 detector **FAIL**。與 W17 `RetentionPolicy` 同構，照抄 `:87-93` 的註解形狀。`Event` 的 model 名直接命中 `02a:38` 的 `Event` | ✅ plan §4 已列 |
| **D5** | audit guard 從 **`core-model/*.ts` 的 `client.X.<write>(` 呼叫點**導出寫入面（`audit-coverage.int.spec.ts:516-531`），**不是**從 Prisma DMMF。零 repository 的 model 不進 `delegates` ⇒ 三個斷言（`:543-545`）全部通過 | 兩表**不進** `AUDITED_MODELS`，且這不是豁免是結構結果。既有先例 **10 個**（W15 三表 · W16 五表 · W17 兩表）零 repository 且 guard 綠。⭐ 理由要寫成 **42501 grant 測試**而非清單條目 —— `retention-and-hold.int.spec.ts:119-122` 與 `jurisdiction.int.spec.ts:197-201` 的形狀 | ✅ 無變動 |
| **D6** | `08` 的 RAG 字面**自相分歧**：`:35` 表頭是 `Green / Amber / Red`，`:45` 的規則散文是 `red / amber / green`。`02a:472` 只說 "derived band at capture time"，**沒有給值域** | ⇒ 規格**沒有**權威字面，改由專案慣例決定：`schema.prisma` 的 **33 個 enum 全部小寫 snake_case，零例外** ⇒ `enum PostureRag { green amber red }` | ✅ 已定案 |
| **D7** | ⚠️ **`EventSeverity` 的字面需要一個判斷。** `11:37-39` 的字面是 **`S1` / `S2` / `S3`**（大寫），而 33/33 個既有 enum 全小寫 —— 且 **`CiaType { c i a ci }`（`schema.prisma:473`）是把大寫縮寫小寫化的直接先例**（CIA → c/i/a），`AssetCategory.physical_and_virtual` 是第二個 | 🟡 **我的決定，標為可推翻**：採 **`{ s1 s2 s3 }`** + `@@map("event_severity")`。理由：使用者裁決的實質是**三級值域**（S1/S2/S3 三個等級與其 SLA），不是字面大小寫；資料層小寫、UI 顯示由 i18n 層負責（guardrail 9）。⛔ 已在本輪回報中向使用者明確標出，可即時推翻 | 🟡 **待使用者確認**（不阻塞）|
| **D8** | `AD-UniqueKeyOracle-1` 判準（`BACKLOG.md:268` 原文）：**「這個 tuple 是呼叫端給的嗎 —— 是 → `org_entity_id` 必須在鍵裡」**。⭐ 該條同時記載失敗模式的描述被 W11 修正過：**正確判準是「兩個可分辨的結果」，成功也算一個**，不是「兩個不同的 SQLSTATE」 | `(org_entity_id, period, metric_key)`：`period` 與 `metric_key` **都來自呼叫端**（排程 job 傳入）⇒ 判準觸發 ⇒ `org_entity_id` 必須在鍵裡 ⇒ **本片的鍵設計正確**。⭐ 這是該條的**第 4 個資料點、第 2 個正面的**。⛔ 中性化 N4 因此要改設計：不是「刪 unique」，而是**「把 `org_entity_id` 從鍵裡拿掉」**，證明 oracle 出現（W16 N2b 先例）| 🟡 **改 N4 設計** |
| **D9** | `apps/api/package.json:19` 的 `prisma:migrate` = **`prisma migrate dev`** —— 正是 `AD-DevDbChecksumDrift-1` 擋住的那個子指令。W17 Day 1 用 **`migrate deploy`** 一次把 `isms_dev` 從 17/23 補到 24/24 | checklist 1.2 的 Verify 指令**不能照抄 plan** —— 改用 `npx prisma migrate deploy`。migration **手寫**（自 W11 起的常態）。⚠️ 這是該 AD 的第 7 次相關接觸，但**不是第 7 次繞開** —— W17 已證明 `deploy` 可用 | 🟡 **改 Verify 指令** |
| **D10** | `apps/api/package.json` **無 `prisma:format` script**（只有 `prisma:generate` / `prisma:migrate`）| checklist 1.1 的 Verify 改用 `npx prisma format` / `npx prisma validate` | 🟢 小調整 |
| **D11** | 🟡 **順路發現（不當場修）**：`audit.module.ts:48-57` 的註解說 *"grep -c '^model' → **23**"* 且 *"⛔ FIVE MODELS ARE ABSENT: OrgEntity, User, ExtensionField, Threat, Vulnerability"* —— 實際今天是 **33 models、17 個無寫入路徑**。AP-7 orphan claim 形狀 | ⛔ **不當場修**（Step 0.0 節流閘：順路發現 → 記 BACKLOG）。⚠️ 本片加 2 個 model 會讓它更陳舊（33 → 35）⇒ closeout 時記進 BACKLOG 為新 AD | 🟢 記 BACKLOG |
| **D-baselines** | api unit **480 / 40 suites** ✅ · branches **91.77** ✅ · funcs **98.98** ✅ · lines **93.57** ✅（三者自 `coverage/clover.xml:4` 逐位算出：`725/790` · `195/197` · `1149/1228`）· `run_all` **9 / 9** ✅ · `check_entity_index` **32 / 36** ✅ | ⚠️ **stmts 92.14 未被本次證實** —— 我用 `tail -30` 跑 unit，把 coverage 的 `All files` 行截掉了（`AD-PartialGateReportedAsFull-1` 的形狀），clover 沒有直接對應 jest `statements` 的欄位。**如實記為未驗證**，Day 4 final sweep 取完整輸出。api int **248 / 20 suites** ✅（`[int] isms_test rebuilt, migrated and seeded`，192.8 s）| 🟡 **1 項未驗** |

### Prong 1 — Path verify

| 目標 | 期望 | 實際 |
|---|---|---|
| `migrations/<ts>_event_and_posture_snapshot/` | 不存在 | ✅ 24 個 migration，無此名 |
| `core-model/event-and-posture.int.spec.ts` | 不存在 | ✅ core-model 下 42 檔，無此名 |
| `CH-037` | 未被佔用 | ✅ 最大號 `CH-036`（資料夾形式）|
| `schema.prisma` · `test/int-global-setup.js` · `check_entity_index.py` | 存在 | ✅ 三者皆在 |

### Prong 3 — Schema verify

`Grep "model Event|PostureSnapshot|posture_snapshot|event_id|eventId"` 於 `apps/api` ⇒ **零命中**。
⇒ 兩表確實從未建過，且**沒有任何既有表帶反向 FK 欄位**（plan §0 的宣稱成立）。

### Go / No-Go

**GO。** 範圍變動 **≈ 0%** —— 11 條 drift 沒有一條改變交付物清單：
D1 / D3 / D8 是**論證強化或修正**（同樣的欄位、更硬的理由）、D4 / D9 / D10 是**指令與一行 ALIAS**、
D11 是記錄項。唯一待確認的 D7 是一個 enum 的大小寫，**不阻塞 Day 1**。

⭐ **本次 Day-0 的最高價值產出是 D1 與 D3** —— 兩者都不是「plan 漏了什麼」，
而是「plan 給的理由撐不住／不夠硬」。D1 若沒抓到，`Event.status` 的省略會用一個
**對任何 base field 都成立**的假理由寫進 migration banner，成為下一個 phase 抄襲的模板。
