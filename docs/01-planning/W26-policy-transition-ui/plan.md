---
status: active   # draft | active | closed | closed_partial —— 機器可讀的唯一權威
---

# Phase W26 Plan — 政策狀態推進的 UI 入口，與前端第一條寫入路徑

**Summary**: 關掉 `AD-PolicyTransitionNoUiEntry-1` —— W25 建出 `PATCH /policies/:id/status` 並在真 stack 上驗過，
但 `/policies` 沒有任何控件會呼叫它，**對使用者而言那個能力不存在**。本片在列上加**動詞按鈕**
（Submit for review / Approve / Publish / …），合法目標由 **API 回傳**而非前端複製一份表。
⛔ 這**不是** pattern-reuse —— `apps/web` 今天對 NestJS 後端**零個寫入呼叫**，`client.ts` 只 export `get<T>`
⇒ 本片同時要建**前端的寫入半邊**（動詞 + 能承載 422 結構化 body 的錯誤型別 + 第一個 mutation state pattern）。
**Drive-through MANDATORY**（user-facing）。**不需要 design note**（非 spike —— 但需要一筆**已核可的設計偏離**，見 §3.1）。

**Status**: Approved-to-execute（使用者 2026-08-21 核可；控件形狀與合法轉換來源同日拍板 —— 見 §3.1 / §3.2）

**Branch**: `feature/W26-policy-transition-ui`
**Base**: `main` HEAD `0f09f27`（W25 post-merge —— 六個標記翻牌 + 死 SHA 錨點修正）
**Slice**: standalone —— 關掉 `AD-PolicyTransitionNoUiEntry-1`（M5 的 Potemkin 缺口）
**Scope decisions**:
(a) 控件形狀 = **動詞按鈕**，非狀態下拉、非簽核抽屜 —— 使用者拍板，記為已核可偏離
(b) 合法轉換 **由 API 回傳**（每列一個 `allowed`），前端不複製轉換表
(c) **不做權限閘** —— RBAC 未強制（M4 未建），按鈕對所有人渲染，本片明確記錄此射程
(d) **不碰詳情頁** —— `/policies/[id]` 仍讀 fixture，本片只動列表

---

## 0. Background

### The gap（`AD-PolicyTransitionNoUiEntry-1`）

W25 建出並驗證了整條轉換路徑：端點通、稽核落列、防篡改鏈成立、非法轉換回 422 且附合法選項。
**但 `/policies` 上沒有任何控件會呼叫它。**

使用者今天在畫面上看得到六個狀態徽章，卻**沒有任何方式改變其中任何一個**。

### Why it matters（缺失的能力）

M5 的 DoD 是「drives the policy approval flow」。一條使用者按不到的轉換路徑，
對 approval flow 的貢獻是零 —— 這正是 AP-3 Potemkin 的定義：能力在、無入口。

⚠️ 這也是本 repo 第一次讓前端真的**寫**後端。在此之前所有畫面都是唯讀的，
所以本片建立的不只是一個按鈕，是**之後每一個寫入畫面都會沿用的形狀**。

### Root cause（recon code read，含 `file:line`；全部於 §checklist 0.1 重新驗證）

| Layer | Reality（on `main` HEAD `0f09f27`）| Anchor |
|-------|--------------------------------------------|--------|
| 前端 API client | **只 export 一個動詞** `get<T>` —— 無 post / patch / put | `apps/web/src/lib/api/client.ts:76` |
| 前端寫入呼叫 | `method:'POST'\|'PATCH'\|'PUT'\|'DELETE'` 全樹 **4 個命中，全部打 `/api/demo-session`**（Next.js route handler，非 NestJS）| `login/page.tsx:211` · `AppShell.tsx:247` · `demo-session.test.ts:45,83` |
| 錯誤型別 | `ApiUnavailableError` 只模型化「連不上」；`get` 把 404 收斂成 `null`、其餘非 ok 一律 throw ⇒ **沒有承載 `{from,to,allowed}` 的詞彙** | `client.ts:59-68,87-92` |
| `/policies` 頁面狀態 | 一個物件三個欄位 `{rows, failed, loading}` —— **沒有第四個狀態**可表達「這一列正在送出」 | `policies/page.tsx:84-88` |
| 狀態徽章 | **inline JSX 不是元件**；顏色經 `STATUS` map → `Rating` → `tok()` | `policies/page.tsx:479-500` · `:75-82` |
| 合法轉換表 | **只存在於 API 側**，且刻意綁定 Prisma enum（`Record<PolicyStatus, …>` 窮舉）| `apps/api/src/workflow/transitions.ts:68-76` |
| 端點契約 | 422 body = `{message, from, to, allowed}`；400 / 404 各有形狀 | `apps/api/src/modules/policy/policy.controller.ts:143-185` |
| 設計交付物 | ⛔ **兩份 mockup 都沒有狀態推進控件** —— 狀態是唯讀 pill / badge | `fragments/screens/09-policies.html:39` · `10-policy-detail.html:20,67-68` |

→ 修正必須做三件事：**(1)** 給 `client.ts` 一個寫入動詞與一個能帶結構化 body 的錯誤型別；
**(2)** 讓 API 回傳每一列的合法目標，前端才不必複製那張表；**(3)** 在列上渲染動詞按鈕並處理三種失敗形狀。

### The design（FE 寫入半邊 + API 一個衍生欄位 + 6 個雙語動詞）

```
API（小）
  policy.controller.ts   list() / byId() 的每一列附加 allowed: PolicyStatus[]
                         ← 由 POLICY_TRANSITIONS[status] 導出，不是新的真相來源
  transitions.ts         UNTOUCHED —— 表本身不動

FE（本片的主體，greenfield）
  lib/api/client.ts      + patch<T>(path, body)          ← 本樹第一個寫入動詞
                         + ApiRefusedError（帶 {from,to,allowed}）  ← 422 專用
  lib/api/policies.ts    + transitionPolicy(id, to)
                         + PolicyRow.allowed 欄位
  policies/page.tsx      每列渲染 allowed.map(動詞按鈕)
                         + 第四個狀態：pending（哪一列正在送出）
                         + 三種失敗的呈現（422 / 404 / 連不上）
  i18n/registers.*.json  + 6 個動詞 key × 2 locale
```

**為何 `allowed` 由伺服器算而不是前端查表**：W25 選候選 A 的**全部理由**就是
schema↔實作的型別綁定（`transitions.ts:68` 的窮舉 `Record`）。在前端再拓一份表等於把那個好處丟掉，
並製造出 ADR-0002 當初正是為了避免的漂移。
⭐ 額外的好處在 M4 才會兌現：屆時伺服器可以依呼叫者的權限**過濾** `allowed`，前端一行都不用改。

### Ground truth（recon head-start —— 於 `main` HEAD `0f09f27` 讀過的 code）

- `apps/web/src/lib/api/client.ts:76` — 全檔唯一 export 是 `get<T>`（**我自己 grep 驗過，非 agent 轉述**）
- `apps/web/src/app/(app)/policies/page.tsx:433` — `<tr>` 無 `onClick`；`policies.test.tsx:150-161` **斷言**它不可點
- `apps/api/src/modules/policy/policy.controller.ts:161-166` — 422 body 四個欄位
- `apps/api/src/workflow/transition.guard.ts:73-81` — **拒絕 `from === to`**（02a §4 無自環）⇒ 動詞按鈕從構造上不會產生這種請求
- `docs/02-architecture/15-design-alignment.md:103` — 「缺少該動詞的按鈕**不渲染**；唯讀角色給說明橫幅，不是 disabled 表單」
- `docs/02-architecture/15-design-alignment.md:165` — 「狀態**絕不只靠顏色**」
- `apps/web/src/i18n/i18n.test.ts:121,125,139-153` — parity test 三項：key-set 對等 / 無空值 / 原始碼掃描
- `docs/06-reference/.../09-policies.html:14-18` — action bar 只有 `Category ▼` `Status ▼`（**皆為篩選器**）與 `New policy`（**我自己讀過原文**）

**Baselines（W25 closeout）**: api unit **507/41** · api int **280/22** · web **104/11** ·
lint **0** · type **0** · format **0** · build **EXIT 0** · `run_all` **11/11**
Day-0 重新驗證。

### STALE / drift findings（Day-0；完整細節 → progress.md —— 此處是 placeholder，於 §checklist 0.1 填入）

- **D-client-single-verb** — 重新確認 `client.ts` 仍只有 `get`（本片的 greenfield 判定與 calibration class 全繫於此）
- **D-edge-list** — 從 `transitions.ts` **導出**七條邊並逐條對上 6 個動詞；⛔ 不手數（W25 Day 0 就把 7 條數成 8）
- **D-seed-states** — `seed.ts` 直接寫 status（`AD-SeedBypassesRepository-1`）⇒ demo 列可能停在守衛產生不出的狀態，按鈕會據此渲染
- **D-inert-key** — `New policy` 用的 `shell.inert` 是**共用** key（`AD-SharedInertProseInaccurate-1`）⇒ 本片新增按鈕**不得**沿用它
- **D-row-not-clickable** — 確認列仍不可點且測試仍鎖著；新按鈕在不可點的列裡要能單獨接收點擊

## 1. Phase Goal

在 `/policies` 讓使用者**真的能推進政策狀態** —— 每列依伺服器回傳的 `allowed` 渲染動詞按鈕，
點下去打 `PATCH /policies/:id/status`，成功則該列狀態與徽章即時更新，
失敗則依 422 / 404 / 連不上三種形狀給出不同且誠實的訊息。
證明方式：gates 全綠 **+ MANDATORY drive-through**（真 UI + 真後端 + 真 DB，含三種失敗路徑各走一次）。
**不產出 design note**（非 spike）；**產出一筆已核可的設計偏離**寫入 `15-design-alignment.md`。

## 2. User Stories

- **US-1**（設計權威）: 作為維護者，我希望控件形狀有一筆**寫下來的、已核可的偏離**，以便下一個人知道它為何存在而交付物裡沒有。
- **US-2**（API）: 作為前端，我希望每一列**告訴我它能去哪裡**，以便我不必複製一份會漂移的轉換表。
- **US-3**（前端基礎）: 作為維護者，我希望 `client.ts` 有寫入動詞與能承載 422 結構化 body 的錯誤型別，以便之後每個寫入畫面都沿用同一個形狀。
- **US-4**（使用者）: 作為政策擁有者，我希望在列表上按一個動詞就能推進政策，以便我不必請工程師下 curl。
- **US-5**（誠實的失敗）: 作為使用者，我希望三種失敗看起來不一樣，以便我知道是我做錯了、東西不見了、還是系統掛了。
- **US-6**（雙語）: 作為非英語使用者，我希望動詞是繁體中文，以便 parity test 與 guardrail 9 成立。
- **US-7**（drive-through, MANDATORY）: 作為維護者，我希望有人**真的開車**走完主路徑與三條失敗路徑，以便「能用」不是從 gate 推論出來的。
- **US-8**（closeout）: 作為維護者，我希望 AD 關閉、calibration 記錄、導航檔與 BACKLOG 更新。

## 3. Technical Specifications

### 3.0 Architecture（檔案變更形狀）

```
NEW   docs/01-planning/W26-policy-transition-ui/{plan,checklist,progress,retrospective}.md
NEW   docs/03-implementation/changes/CH-048-policy-transition-ui.md

EDIT  apps/api/src/modules/policy/policy.controller.ts    list()/byId() 附加 allowed
EDIT  apps/api/src/modules/policy/policy.controller.spec.ts

EDIT  apps/web/src/lib/api/client.ts                      + patch<T> + ApiRefusedError
NEW   apps/web/src/lib/api/client.test.ts                 ← 若不存在則新建（Day 0 Prong 1 確認）
EDIT  apps/web/src/lib/api/policies.ts                    + transitionPolicy + allowed 欄位
EDIT  apps/web/src/app/(app)/policies/page.tsx            動詞按鈕 + pending 狀態 + 失敗呈現
EDIT  apps/web/src/app/(app)/policies/policies.test.tsx
EDIT  apps/web/src/i18n/registers.en.json                 + 6 動詞
EDIT  apps/web/src/i18n/registers.zh-Hant.json            + 6 動詞

EDIT  docs/02-architecture/15-design-alignment.md          §7 加一列：已核可的偏離
EDIT  docs/01-planning/BACKLOG.md                          關 1 條 + 記本輪順路發現
UNTOUCHED  apps/api/src/workflow/transitions.ts            ⭐ 表本身不動 —— 那是 ADR-0002 的核心
UNTOUCHED  apps/web/src/app/(app)/policies/[id]/page.tsx   詳情頁仍讀 fixture，本片不碰
UNTOUCHED  apps/web/src/i18n/en.json                       `shell.inert` 不動（另一條 AD 的射程）
```

### 3.1 設計偏離的記錄（US-1）— `docs/02-architecture/15-design-alignment.md`

⛔ **本片的第一件事，不是寫 code。**

實測（我自己讀過原文，非 agent 轉述）：`09-policies.html` 的 action bar 只有
`Category ▼` / `Status ▼`（**兩個都是篩選器**）與 `New policy`；列內狀態是唯讀 pill。
`10-policy-detail.html` 的標頭動作是 `Open in new tab` 與 `Download`；
兩份 fragment 中 `approve|publish|submit|retire|workflow|transition|送審|核准` 的全部命中 = **1 個**，
而它是 `:28` 帶生效日的**唯讀 metadata 行**。

⇒ 交付物把政策當成**文件**（下載 / 開新分頁 / 版本歷史），不是工作流項目。
`15-design-alignment.md` 亦無 policy 模組章節。**這是 §約束 6 的 STOP-and-ask，已停並由使用者拍板。**

寫入 `15` §7 的一列必須包含：偏離什麼 · 為何交付物答不出 · 選了什麼形狀 · 誰核可 · 何時 ·
以及**它與 `:103`（缺動詞不渲染）的關係**。

### 3.2 API 附加 `allowed`（US-2）— `apps/api/src/modules/policy/policy.controller.ts`

- `list()` 與 `byId()` 回傳的每一列附加 `allowed: PolicyStatus[]`，值 = `POLICY_TRANSITIONS[row.status]`
- ⛔ **`transitions.ts` 一行都不改** —— `allowed` 是那張表的**導出值**，不是第二個真相來源
- 終端狀態（`retired`）回 `[]` ⇒ 前端自然不渲染任何按鈕，**不需要特例分支**
- 型別：`PolicyStatus` 已由 Prisma 生成；`allowed` 的型別綁在同一個 enum 上
- 測試：每個 status 的 `allowed` 對上表；`retired` 為空陣列

### 3.3 前端寫入半邊（US-3）— `apps/web/src/lib/api/client.ts`

- `patch<T>(path, body)` —— 本樹**第一個**打 NestJS 的寫入動詞
- `ApiRefusedError` —— 專門承載 422 的 `{message, from, to, allowed}`；
  ⚠️ 與既有 `ApiUnavailableError`（只表達「連不上」）**並存而非取代**
- 三種回應各自映射：**422 → `ApiRefusedError`** · **404 → `null`**（沿用 `get` 的既有收斂）· **其餘非 ok → throw**
- ⛔ **不引入資料庫層以外的任何 data library** —— `client.ts:16-17` 已就此表態（「AP-5 with a spinner」），本片不推翻它

### 3.4 動詞按鈕與 mutation state（US-4, US-5）— `policies/page.tsx`

六個動詞，**依目標狀態**命名（七條邊映到六個動詞，因為 `→in_review` 有兩個來源共用同一個動詞）：

| 目標 | key | en | zh-Hant |
|---|---|---|---|
| `in_review` | `policies.action.submitForReview` | Submit for review | 送出審查 |
| `approved` | `policies.action.approve` | Approve | 核准 |
| `draft` | `policies.action.returnToDraft` | Return to draft | 退回草稿 |
| `published` | `policies.action.publish` | Publish | 發布 |
| `under_revision` | `policies.action.startRevision` | Start revision | 開始修訂 |
| `retired` | `policies.action.retire` | Retire | 退役 |

⚠️ 上表的邊↔動詞對應**必須於 Day 0 由 `transitions.ts` 導出後逐條核對**（`D-edge-list`）——
不手數。W25 Day 0 就把七條邊數成八條。

- 頁面狀態加**第四個欄位** `pending: {id, to} | null` —— 送出中的那一列停用它自己的按鈕
- 成功：以回應的 `data` 就地取代該列（狀態 + 徽章 + `allowed` 一起更新）⇒ **不重整**
- 失敗三形狀分別呈現，且 **422 要把 `allowed` 顯示出來**（那正是後端附上它的用意）
- `15:165`「狀態絕不只靠顏色」對按鈕同樣成立：動詞是**文字**，不是色塊

### 3.x 明確不做的事

- ❌ **權限閘** —— RBAC 未強制（M4 未建，`AD-RbacUnenforced-1`）。按鈕對所有人渲染。
  ⚠️ 這與 `15:103`（缺動詞就不渲染）**表面衝突**：今天不存在「這個人缺哪個動詞」這個概念。本片明確記錄，不假裝有做。
- ❌ **簽核抽屜 / 核准人 / 意見** —— `actorId` 恆 NULL（M4），做出來會是一半空的介面（AP-3）
- ❌ **SLA timer / 升級** —— ⛔ 它會**推翻 ADR-0002**（可證偽條件 2），要先重開 ADR
- ❌ **issue→action 生命週期** —— M5 的第二條流程，另一片
- ❌ **詳情頁接 API** —— `AD-PolicyDetailBackendMissing-1`，且它被 schema 擋著（文件本體 + 版本歷史）
- ❌ **列變成可點** —— W24 刻意的分歧，且測試鎖著；本片只在列內加按鈕
- ❌ **拆 `shell.inert` key** —— `AD-SharedInertProseInaccurate-1` 的射程，不順手做
- ❌ **建共用契約層** —— `PolicyRow` 仍是手寫的「本 app 對線路的看法」（`AD-RiskContractUndeclared-1`），本片不解決

### 3.y Validation（US-1..US-8）

Gates: format **0** · lint **0** · type **0** · api unit **≥ 507** · api int **280/22** ·
web **≥ 104** · build clean · `run_all` **11/11**。
加上 §3.x 之外的 **drive-through（MANDATORY）** —— 主路徑 + 三條失敗路徑各走一次。

## 4. File Change List

| # | File | Action |
|---|------|--------|
| 1 | `docs/01-planning/W26-policy-transition-ui/plan.md` | NEW |
| 2 | `docs/01-planning/W26-policy-transition-ui/checklist.md` | NEW |
| 3 | `docs/01-planning/W26-policy-transition-ui/progress.md` | NEW |
| 4 | `docs/01-planning/W26-policy-transition-ui/retrospective.md` | NEW |
| 5 | `docs/02-architecture/15-design-alignment.md` | EDIT（§7 加一列已核可偏離）|
| 6 | `apps/api/src/modules/policy/policy.controller.ts` | EDIT |
| 7 | `apps/api/src/modules/policy/policy.controller.spec.ts` | EDIT |
| 8 | `apps/web/src/lib/api/client.ts` | EDIT |
| 9 | `apps/web/src/lib/api/client.test.ts` | NEW（Day 0 Prong 1 確認是否已存在）|
| 10 | `apps/web/src/lib/api/policies.ts` | EDIT |
| 11 | `apps/web/src/app/(app)/policies/page.tsx` | EDIT |
| 12 | `apps/web/src/app/(app)/policies/policies.test.tsx` | EDIT |
| 13 | `apps/web/src/i18n/registers.en.json` | EDIT |
| 14 | `apps/web/src/i18n/registers.zh-Hant.json` | EDIT |
| 15 | `docs/03-implementation/changes/CH-048-policy-transition-ui.md` | NEW |
| 16 | `docs/01-planning/BACKLOG.md` | EDIT |
| — | `apps/api/src/workflow/transitions.ts` | **UNTOUCHED** ⭐ 表不動是 ADR-0002 的核心 |
| — | `apps/api/src/workflow/transition.guard.ts` | **UNTOUCHED** |
| — | `apps/web/src/app/(app)/policies/[id]/page.tsx` | **UNTOUCHED** |
| — | `apps/web/src/i18n/en.json` | **UNTOUCHED**（`shell.inert` 屬另一條 AD）|
| — | `packages/types/` | **UNTOUCHED**（不在本片建契約層）|

## 5. Acceptance Criteria

1. **AC-1** `15-design-alignment.md` §7 有一列記錄本次偏離：交付物為何答不出、選了什麼、誰核可、何時。
2. **AC-2** `GET /policies` 的每一列帶 `allowed`，值逐一等於 `POLICY_TRANSITIONS[status]`；`retired` 為 `[]`。**測試以表導出比對，不硬編碼期望值。**
3. **AC-3** `client.ts` 有 `patch<T>`；422 產生 `ApiRefusedError` 且 `{from,to,allowed}` 可讀；404 → `null`；其餘非 ok → throw。**三條各有測試。**
4. **AC-4** `/policies` 每列依 `allowed` 渲染動詞按鈕；`retired` 的列**零個按鈕**（不是 disabled 按鈕）。
5. **AC-5** 成功轉換後該列的狀態文字、徽章、`allowed` **就地更新，不需重整**。
6. **AC-6** 三種失敗各自可辨：422 顯示 `allowed`；404 顯示「不存在或不在你的範疇內」；連不上顯示既有的不可用狀態。
7. **AC-7** 6 個動詞 key 於 `en` 與 `zh-Hant` 皆存在且非空；`i18n.test.ts` 三項全過。
8. **AC-8 Drive-through PASS（MANDATORY，真 UI + 真後端 + 真 DB）** —— 主路徑推進至少兩步且徽章跟著變；**三條失敗路徑各走一次**；真 DB 直查確認稽核列數與 `prev_hash` 鏈；截圖 + observed-vs-intended 記入 progress.md。（**不是** gate-only。）
9. **AC-9** `AD-PolicyTransitionNoUiEntry-1` CLOSED；calibration 已記錄；導航檔 + BACKLOG 已更新。

## 6. Deliverables

- [ ] US-1 `15-design-alignment.md` §7 的已核可偏離列
- [ ] US-2 API 每列附加 `allowed`（由表導出）+ 測試
- [ ] US-3 `client.ts` 的 `patch<T>` + `ApiRefusedError` + 測試
- [ ] US-4 `/policies` 的動詞按鈕 + pending 狀態
- [ ] US-5 三種失敗的可辨呈現 + 測試
- [ ] US-6 6 個動詞 × 2 locale + parity 通過
- [ ] US-7 Drive-through PASS（主路徑 + 三條失敗路徑）+ 截圖
- [ ] US-8 CH-048 + retrospective + calibration + 導航檔 + BACKLOG

## 7. Workload Calibration

- Scope class **`greenfield-feature` 0.55**（**第 2 個資料點**；W22 是第 1 個，ratio **0.46 UNDER**，
  matrix 該行狀態為 KEEP 且註明「若第 2 點同 < 0.7 → 0.45 且同時重估 bottom-up 方法」）。
  ⛔ **不是 `pattern-reuse-feature`** —— recon 實測 `apps/web` 對 NestJS **零個寫入呼叫**，
  `client.ts` 只 export `get<T>`（`client.ts:76`）⇒ 沒有可抄的藍本，這是 greenfield。
  起草時原本寫的是 0.45，**Day 0 recon 推翻了它**。
- **Agent-delegated: `no`**（< 20% —— 本片含設計偏離裁決與失敗語義取捨，監督成本高於自己寫）。
  `agent_factor` **1.0** → 三段式。
- Bottom-up est **~17.0 hr**（Day-0 0.5 · API+測 2.0 · client 寫入半邊+測 2.5 · policies.ts+測 1.0 ·
  page.tsx 按鈕與 mutation state 3.5 · i18n 0.8 · 前端測試 2.5 · 設計偏離記錄 0.7 · drive-through 1.5 · closeout 2.0）
  → class-calibrated commit **~9.35 hr** (mult 0.55)。Day-4 retro Q2 驗證。

### ⭐ 第二個預測（可證偽，與上面那個並列而非取代）

`AD-BottomUpEstimateInflated-1` 已於 W25 升為**已驗證**（`actual/bottom-up` 0.26 → 0.25 → 0.141 → **0.129**，
四點單調下降、跨四個 scope class）。它的提議是停止用 bottom-up，改對照最近幾片的 actual 直接給區間。

⚠️ **但同 class 湊不出三個同量法的點** —— `CALIBRATION-LOG.md` 明寫「3-phase 移動平均**不得跨量法計算**」
（`AD-CalibrationT0PlacementShift-1`），而 `greenfield-feature` 用現行量法只有 W22 一點。
所以改用**最近四片、不分 class、同量法**的實際值：

| Phase | class | actual |
|---|---|---|
| W22 | `greenfield-feature` | 3.18 hr |
| W23 | `docs / audit / template` | 1.6 hr |
| W24 | `pattern-reuse-feature` | 2.9 hr |
| W25 | `spike` | 2.64 hr |

**預測：W26 的 actual 落在 1.6 – 3.2 hr**（若成立 ⇒ ratio 約 **0.17 – 0.34**，遠低於 band，
而那正是 `AD-BottomUpEstimateInflated-1` 預期的）。
⛔ **中或不中都照實記** —— W25 登記的預測就沒中（往下沒中），而那本身是資訊。

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| **R1 — ⛔ ADR-0002 可能違反 `05-platform-foundation-services.md:15`** —— `05:15` 逐字要求「states/transitions are **configuration, not code**」，而 `0002:79` 逐字寫「編譯期，沒有執行期設定路徑」。**設計文件權威高於 ADR**（CLAUDE.md §權威排序）。ADR-0002 全檔只引用 `05:16`（SLA），**從未 engage `:15`** | 本片**建立在 ADR-0002 之上**但不加深這個衝突：`transitions.ts` UNTOUCHED，`allowed` 是導出值。⇒ 記為 AD 進 BACKLOG，**不在本片解決**（那是一次拍板 + 一份文件修正，不是一個 phase）。⚠️ 若使用者裁決 `05:15` 為準，本片的 API 形狀**不需改**（伺服器算 `allowed` 對兩種實作都成立）|
| **R2 — 前端零寫入先例 ⇒ 沒有可抄的錯誤處理形狀** | 這正是 class 改判 greenfield 的原因。⭐ 反過來用：本片建的形狀會被之後每個寫入畫面沿用 ⇒ `client.ts` 的三條映射（422/404/其餘）**必須各有測試**，不能只測 happy path |
| **R3 — `15:103`（缺動詞不渲染）今天無法遵守** —— RBAC 未強制 | 明確記錄射程而非假裝合規（`AD-RbacUnenforced-1` 解封條件是 M4）。⛔ **不做 disabled 按鈕** —— `:103` 明說唯讀角色要給說明橫幅而不是 disabled 表單，做成 disabled 是兩頭不討好 |
| **R4 — seed 直接寫 status（`AD-SeedBypassesRepository-1`）** ⇒ demo 列可能停在守衛產生不出的狀態 | Day-0 `D-seed-states` 實查 demo 8 筆的狀態分佈；drive-through **刻意挑一筆 seed 資料**推進，看 `allowed` 是否合理 |
| **R5 — mutation 後就地更新 vs 重整** —— AC-5 明寫「不需重整」，而 W25 checklist 3.2 的同一句 DoD **當時明寫未達成** | 本片有控件了，所以這條這次真的可驗。⚠️ 驗法是**製造變化再觀察**（W25 Day 3 對標題列計數用過這招），不是看截圖推論 |
| **R6 — Risk Class C：陳舊 dev server 掩蓋 wiring 修正** | Day 3 乾淨重啟：殺掉 3200/3210 上**所有**陳舊程序（含孤兒 spawn worker），確認 port 空出，擷取 startup log 證明新程序 |
| **R7 — Risk Class E 的變體：CI 與本機環境不同** —— W25 剛被這個弄紅（`DEV_PRINCIPAL_ENTITIES` CI `HK1` / 本機 fallback `SG1`）| ⭐ `AD-VerificationEnvironmentIsAnAxis-1`：**Day 3 結束就 push 讓 CI 跑一次**，不要把 push 排在所有文件寫完之後。前端測試若涉及 scope，比照 `risk.int.spec.ts:434-448` 釘住 env |
| **R9 —（Day-0 D3）⛔ plan §3.4 自己發明了一個動詞名** —— `transitions.ts:70` 記錄 **02a:365 把 `in_review → draft` 命名為 "changes requested"**，而我寫的是「Return to draft / 退回草稿」 | **違反已確認參數 #9**（工作流照來源文件，不得自行發明）。⇒ 動詞改為 **"Request changes" / 要求修改**。⚠️ 這條的價值不只在改一個字：它證明**動詞命名不是 UX 選擇而是領域事實**，其餘五個動詞在 Day 1 也要逐一回頭對 `02a` §4 的邊標籤，不是照我的直覺 |
| **R10 —（Day-0 D4）⛔ 本片會讓 `shell.inert` 在 `/policies` 上當場自相矛盾** —— 該 key 有 **24 個 call site 跨 13 個檔**（plan §3.x 只提到 `risks/[id]`，低估了），字串逐字是「This port has **no backend** that can perform it」。W26 之後 `New policy` 會與**可用的動詞按鈕並列** | plan §3.x 明文排除動它（`AD-SharedInertProseInaccurate-1` 的射程）。**但那條排除是在不知道本片會製造矛盾的前提下寫的。** ⇒ **需使用者裁決**，不自行推翻自己的 Out-of-Scope。最小選項：只給 `/policies` 的 `New policy` 一個自己的 key（~2 行 + 2 個 i18n 值），不動其餘 23 個 call site |
| **R11 —（Day-0 D5）`page.tsx:425-432` 的註解會被本片變成 orphan claim** —— 它逐字寫「there is no action here to disable」，而本片正是要在該列加動作 | AP-7，且是**本片造成的**。註解也算 code ⇒ Day 2 一併改。⚠️ 不是刪掉它 —— 它同時解釋了「為何列不可點」（詳情頁仍讀 fixture），那部分**仍然為真**，要保留 |
| **R8 — i18n parity 的原始碼掃描可被繞過** —— `i18n.test.ts:143` 的 regex 只匹配 `t(locale, '字面量')`，**runtime 組出來的 key 會空過** | 動詞 key 若用 `` `policies.action.${verb}` `` 拼裝，parity 掃描抓不到 ⇒ **改用明確的字面量對照表**（`Record<PolicyStatus, TranslationKey>`），讓掃描看得見每一個 key |

## 9. Out of Scope（這個 phase 不做 → 另開 slice / AD）

- **RBAC / 權限閘** — `AD-RbacUnenforced-1`，解封條件 M4
- **簽核抽屜、核准人、意見** — 需要 `actorId`（M4）；今天做會是一半空的介面
- **SLA timer / 升級** — ⛔ 會推翻 ADR-0002 可證偽條件 2，要先重開 ADR
- **issue→action 生命週期** — M5 第二條流程，另一片
- **詳情頁接 API** — `AD-PolicyDetailBackendMissing-1`（被 schema 擋著）
- **列可點 / 詳情連結** — W24 刻意分歧，測試鎖著
- **拆 `shell.inert` key** — `AD-SharedInertProseInaccurate-1`
- **共用契約層（`packages/types`）** — `AD-RiskContractUndeclared-1`
- **ADR-0002 vs `05:15` 的裁決** — 本片 §8 R1 記錄之，另開 AD；那是一次拍板不是一個 phase
- **`PROGRESS-METRICS.md` §3 散文與 §2 表格的矛盾** — W25 遺留，記 AD
- **ROADMAP 落後 4 個 phase** — `AD-53` / `AD-56` 已在榜第 3 次，本片不順手修
