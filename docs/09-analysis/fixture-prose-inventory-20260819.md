# Fixture prose inventory — 每一頁對「某一筆記錄」做出的陳述

**Purpose**: `AD-FixtureProseBecomesForgedEvidence-1` 的存量清單。**每一片把畫面接上 API 之前，
先讀這一頁的那一節**，逐條問「API 送得出來嗎」。

**Category / Scope**: Analysis / W24
**Created**: 2026-08-19
**Last Modified**: 2026-08-19
**Status**: Active — 存量清單，隨每一片接 API 而縮短

> **Modification History**
> - 2026-08-19: Initial creation (Phase W24) — CH-044

---

## 0. 這份文件為什麼存在

W19 交付 30 個畫面、全部餵 fixture，其中包含**治理語彙**：具名簽核人與日期、帶 SHA-256 hash
的稽核軌跡、`append-only` / `Tamper-evident` / `Record locked` 的完整性宣稱。

整頁都是樣本時它們無害。**表頭變成真實資料的那一刻，它們變成偽造的治理證物**
（guardrail 2 + 5）。W22 在 `/risks/[id]` 上發現這件事並**手工**清掉了那一頁。

⛔ **手工處置不會自己傳播到下一頁。** 這份清單是它的替代品。

**機械層由 `scripts/lint/check_fixture_prose.py` 承接** —— 但它只涵蓋被標了
`@record-claim` 的 export（今天 13 個），**看不見**硬編碼在 i18n 或 JSX 裡的陳述。
那一半由本文件 + `checklist.md.tpl` 的具名檢查項承接。

---

## 1. ⭐ 判準與收斂規則（重跑前必讀）

一段內容算「治理陳述」，如果它宣稱關於**某一筆具體記錄**（或關於**平台自己**）的下列任一：

| 類型 | 內容 |
|---|---|
| **1 簽核 / 核准** | 具名的人 + 角色 + 日期 |
| **2 稽核軌跡 / 完整性** | hash 值 · `append-only` · `tamper-evident` · `chained` · `locked` · 版本鏈 |
| **3 治理狀態宣稱** | `Ratified by …` · `Approved by …` · `Certified` · `Verified` · 合規百分比 |
| **4 時間承諾** | `Next review: <date>` · `Due <date>` · SLA 剩餘 · 到期日 |
| **5 視覺 affordance** | 盾牌 / 鎖 / 綠勾 / 綠色狀態燈 —— **即使旁邊沒有文字** |

**不算**：純導航標籤、欄位名稱、**區塊標題**（「簽核鏈」這個標題本身是真的 ——
平台確實有這個功能；假的是「這筆記錄有這些簽名」）、圖表軸標籤。

### ⛔ 類型 5 的收斂規則 —— 沒有這一條，重跑會得到不同的數字

`tok()` 驅動了幾乎每一個表格列的狀態 pill，字面套用類型 5 會讓將近每一列都符合。
本盤點採用的收斂：

> **只列「綠色標記的是一筆記錄的治理／合規狀態」的情形。**
> **排除**純風險評級（severity S1-S3 · issue severity · risk band）
> 與產品生命週期（`osPortfolio` stage）與權限層級（`permKey.ts:47` 的 `F` = Full）。

⚠️ 若日後把規則放寬到「任何綠色語意」，**第一個會被納入的是 `permKey.ts:47`**。

**`tok('G')` 確認是綠**（不是推論）：`lib/tok.ts:46-48` → `--rag-g` =
`#1E8A5C`（light，`tokens.css:36`）/ `#3FB07C`（dark，`:90`）。default 分支落到
灰 `#7C8794`，不會誤染綠。

---

## 2. 跨頁重複 —— 修一次能修幾頁（槓桿最高的先做）

| 陳述 / 機制 | 頁數 | 位置 |
|---|---|---|
| ~~`shell.env.meta` = "v2.4 · SOC 2 Type II"~~ ✅ **W24 已修** | ~~25~~ | `AppShell.tsx:448`。⭐ **它不在任何 `page.tsx` 裡** —— 逐頁掃 page.tsx 會 100% 漏掉 |
| ~~`/login` 三條 claim + 綠勾~~ ✅ **W24 部分修**（claim1/claim3 改；**claim2 實測為真，保留**） | ~~1~~ | `auth.en.json:6-8` · `login/page.tsx:311-325` |
| shell 側欄綠光暈圓點 ✅ **W24 已改中性** | 25 | `AppShell.tsx:435-444` |
| `tok()` 綠色狀態 pill / dot（Approved / Closed / Effective / Published / Certified / Good / Active / Connected …） | **17** | dashboard · controls · controls/[id] · policies* · policies/[id] · issues · issues/[id] · incidents · incidents/[ref] · audit-issues · audit-issues/[ref] · suppliers · suppliers/[ref] · isms-profiles · os-portfolio · admin · ai-assistant |
| `"append-only · SHA-256 chained"` **逐字相同** | **3** | `controls/[id]`（`deep.en.json:263`）· `admin`（`admin.en.json:165`）· `admin` retention 表（`retention.ts:32`） |
| `"Tamper-evident"` + **綠底盾牌徽章** | **2** | `controls/[id]:1094-1120` · `admin:1926-1947` |
| `"Record locked · tamper-evident ledger active"` + 綠鎖 | **2** | `controls/[id]` · ~~`risks/[id]`~~（W22 已移除，key `deep.en.json:3` 仍在） |
| `"M. Tan · Regional Governance"` 簽核人 | **2** | `controls/[id]`（`deep.en.json:258`）· ~~`risks/[id]`~~（W22 已移除） |
| `"Information Security Committee"` 作為核准方 | **6** | policies/[id] · incidents/[ref] · audit-issues/[ref] · isms-profiles · risk-programme · ai-assistant |
| **綠勾清單**（同一份固定清單套在每一筆記錄上） | **4** | suppliers/[ref]（4+3）· os-portfolio（5）· risk-programme（3）· my-profile（4） |
| 「已完成」勾選框 / 綠色 stepper（**fixture 決定，非記錄決定**） | **4** | issues/[id]（固定 2/4）· assessments（固定 2/4）· incidents/[ref]（8 段）· audit-issues/[ref]（5 段 + 5 步驟） |
| 具名人員 + 日期的稽核／活動列 | **5** | controls/[id] · issues/[id] · incidents/[ref] · admin · my-profile |
| shell topbar 範疇選單 14 顆 posture 圓點（5 綠） | 25 | `AppShell.tsx:586-594` |
| shell 通知抽屜 6 則具名記錄狀態 | 25 | `AppShell.tsx:204-226`（**區域常數，不在 `data/`**） |
| `DemoBadge` **缺席** | **2** | `/` 與 `/login` —— DemoBadge 只在 `(app)` route group |

> ⭐ **`/login` 有 `auth.footer` =「示範版本 · 非正式環境」，`/` 沒有任何標示。**

### ⛔ 下一片接畫面時最該先看的三處

1. **`/controls/[id]`** —— 它**仍在做 `/risks/[id]` 已被明令禁止的事**：綠掛鎖 +
   `Record locked · tamper-evident ledger active` + 三個簽名（含 `M. Tan · Regional
   Governance`，15 May 2026）+ 5 列 SHA-256 hash + 3 份 sha 證據。**同一組 i18n key、
   同兩條 guardrail，W22 只修了一邊。** 它的 fixture 已標 `@record-claim`（4 個），
   所以 `check_fixture_prose.py` 會在它接上 API 的那一刻開火。
2. **`/admin`** —— 14 條，含 10 列系統稽核日誌（具名 actor + 來源 IP）與
   `Tamper-evident` 盾牌。`systemAudit.ts` 的 `SYSTEM_AUDIT` 已標 `@record-claim`。
3. **`/risk-programme`** —— **29 條**（全 app 最多）。它的程序原文**刻意不走 i18n 字典**
   （page 檔頭自陳），所以字典層的檢查完全看不到它。

---

## 3. 逐頁清單（27 頁，含 0 條的）

> 條數為**補掃後**。每一頁另有 **shell 貢獻的 4 條**（綠點 · 範疇選單 · APAC 硬編碼 `'A'` ·
> 通知抽屜），僅 `(app)` 內的 25 頁；不重複計入下表。

| 頁 | 條數 | 主要類型 | 最危險的一條 |
|---|---|---|---|
| `/` | **0** | — | — |
| `/login` | 7 → **4**（W24 修 3） | 3 | ~~"SOC 2 Type II · ISO/IEC 27001 certified" + 綠勾~~ ✅ |
| `/dashboard` | 6 | 3,5 | Top residual risks 讀 fixture `risks.ts`，⛔ **且連到已接 API 的 `/risks/[id]`** → 必定 404 |
| `/controls` | 3 | 3,5 | 每列 Result badge "Effective" + 綠點 |
| `/controls/[id]` | **11 群** | 1,2,5 | 綠掛鎖 + 3 簽名 + 5 列 SHA-256 hash（見 §2） |
| `/policies` | 3 → **0**（W24 全處置） | 3,4,5 | ~~Next review · Attestation % · group-wide~~ ✅ |
| `/policies/[id]` | **13** | 1,2,3,4 | 封面 "Approved by: Information Security Committee"；內文「委員會核准本政策並至少每年複審」 |
| `/issues` | 2 | 3,4,5 | Status pill + Due |
| `/issues/[id]` | 5 | 1,3,5 | 修補檢核表**固定前兩項打勾**（每一筆 issue 都相同，含已 Closed 的） |
| `/incidents` | 3 | 3,4,5 | KPI "reviewed on behalf of CISO" 綠字 |
| `/incidents/[ref]` | **11** | 1,3,4,5 | 8 段綠色 stepper + 審批鏈 "W. Cheung — on behalf of CISO" |
| `/incidents/new` | **0** | — | ⚠️ 空白表單，但見 §5 |
| `/isms-profiles` | **11** | 1,2,3,5 | 認證徽章 "Certified" 綠 + 版本歷史具名作者 + 儲存 toast 宣稱「前一版已保留並標為 superseded」（**毫無持久化**） |
| `/os-portfolio` | 6 | 3,5 | 5 條交付安全要求各配綠勾，**所有服務共用同一份**（含 "Not yet in scope" 的 OS-295） |
| `/risk-programme` | **29** | 1,2,3,4,5 | 5 列版本鏈（Prepared by ITSC / Approved by ISC）+ 送審文件組 3 個綠勾 |
| `/assessments` | 7 | 3,5 | Q1/Q2 **預選綠色選項** + Q4 **預填完整證言** + "Autosaved 1 min ago"（無任何儲存） |
| `/audit-issues` | 4 | 3,5 | KPI "Closed this year / verified and evidenced" 綠字 |
| `/audit-issues/[ref]` | **9** | 1,3,4,5 | 矯正行動 5 步全綠勾 + "Verified by: BSI lead auditor"。⚠️ 另見 §5 白勾缺陷 |
| `/suppliers` | 3 | 3,4,5 | Controls adequacy "Yes" 綠 |
| `/suppliers/[ref]` | 7 | 1,3,5 | 決策橫幅「Access approved under existing controls」綠底 + 7 個綠勾（8 家供應商共用同一份） |
| `/suppliers/new` | **0** | — | ⚠️ 見 §5 |
| `/admin` | **14** | 1,2,3,5 | 系統稽核日誌 10 列（具名 actor + 來源 IP）+ `Tamper-evident` 盾牌 |
| `/ai-assistant` | 4 | 1,3,5 | Knowledge sources "Synced 12m ago" 綠點（宣稱 87 份政策、341 筆事件已同步） |
| `/my-profile` | 7 | 1,3,5 | Permissions 4 條各配綠勾 + "Approved treatment for RSK-0987 · 2h ago" |
| `/switch-entity-role` | 1 | 1,3 | 每列宣稱此帳號在該範疇持有的角色（page 檔頭自陳是 **genuinely invented**） |
| `/preferences` | **0** | — | — |
| `/risks/new` | **0** | — | ⚠️ 空白表單 |

**合計**：約 **180 條**（156 條初盤 + `/risk-programme` +21 + `/controls/[id]` +5 群
+ `/isms-profiles` +3，扣除 W24 已處置的 `/policies` 3 條與 `/login` 3 條）。
⚠️ **這是一個約數，不是精算** —— 「一群 hash 列」算 1 條還是 5 條沒有統一定義。
**逐頁小節才是可用的單位，總數不是。**

---

## 4. `/policies/[id]` 的 9 個無來源區塊（它今天不接 API 的證據）

W24 只接了列表頁。詳情頁的解封條件是**可觀察的**，記在 `plan.md §9`：

| 區塊 | API 來源 |
|---|---|
| 標題 · refCode · status | ✅ **有** |
| `meta`（category · owner） | ⛔ |
| `side.document`（檔名 · 格式 · 大小 · 頁數） | ⛔ Policy 無檔案欄位 |
| `side.publication`（published · uploaded · nextReview · attestation） | ⛔ |
| `side.versions`（3 列版本歷史） | ⛔ `version` 只是一個 Int，不是歷史 |
| `side.toc` + 文件預覽（4 頁） | ⛔ **9 份 fixture policy 共用同一份內容** |
| `attByEntity`（13 列認證率） | ⛔ 無欄位、無端點 |
| `linkedControls` | ⛔ controls 未接 |
| download / print / zoom / pager | ⛔ 操作在 fixture 文件上 |

⇒ 接完只剩 **3** 個真欄位（對照：W22 的 `risks/[id]` 接完留下 **9** 個）。
**那不是誠實的代價，是後端還沒有這一頁需要的東西。**

---

## 5. 同形但不在上表的三類（各自另記）

1. **表單的「預先斷言」** —— 三個 `new` 表單條數計 0，但：`suppliers/new/page.tsx:157-158`
   兩組 checkbox **全部預設打勾**（含 "Non-disclosure agreement"、"External party risk
   assessment"）；`supplierForm.by.default` 預填「Regional Information Security Officer」。
   ⇒ **使用者按 Submit 之前就已經簽過一次名了。**
2. **affordance 的鏡像缺陷** —— `audit-issues/[ref]/page.tsx:716-734`：外框有 `a.done ?`
   條件，內部 `stroke="#fff"` 的勾**無條件渲染** ⇒ 未完成步驟 = 透明底 + 白勾。
   「只換文字不換 affordance」的**反面**：affordance 的狀態邏輯只做了一半。
3. **死檔** —— `data/notifications.ts` 全樹**零 import**（shell 用自己的區域常數），
   而它的檔頭寫著「Screens consuming it must render the demo marker」。貢獻 0 條，
   但它是 AP-1 + AP-7。

---

## 6. ⚠️ 覆蓋聲明

**方法**：兩輪唯讀掃描（派工）+ 我親自補讀 2 檔。每一條都追到**渲染點**（`page.tsx` 的實際
JSX 行），不從 fixture 的存在推論它上了畫面。綠燈判定一律追到 `tok()` → CSS 變數的實際色值，
或直接讀 SVG 的 `stroke="var(--rag-g)"`。grep 只用於**定位**，命中後開檔逐行讀。

**掃了什麼**：
- **27 個 `page.tsx` 全部**（`admin/page.tsx` 2077 行分兩次讀完）
- **`data/` 23 檔 + `data/extended/` 24 檔** —— 兩輪合併後**零遺漏**
  （兩輪都漏的 `permMatrix.ts` / `adminSections.ts` 由我補讀，依收斂規則各 **0** 條）
- **9 份 `en` 字典 + 9 份 `zh-Hant` 字典全文**
- `components/shell/` 全樹（`AppShell.tsx` 1239 行 · `AiDrawer.tsx` · `shell-state.ts`）
- `lib/tok.ts` · `lib/posture.ts` · `styles/tokens.css`

**⛔ 沒掃到 / 不確定的**：
1. **21 個畫面的 inline 硬編碼陳述** —— 第一輪讀了全部 27 個 `page.tsx`，但第二輪只深讀
   4 個。`AppShell.tsx:204-226` 那 6 則通知正是「藏在元件裡的區域常數，`data/` 裡找不到」，
   **同一形狀在別的畫面很可能還有**。
2. **`/risk-programme` 的 29 條是下限** —— `riskProgramme.ts` / `rmReport.ts` 是**未經 i18n
   的程序原文**且全文渲染，字典層的檢查看不到它們。
3. **未做 drive-through** —— 本文件是**靜態閱讀**（gate 層）。條件式綠燈（如「Approved 時才綠」）
   沒有截圖佐證。依 `verification-discipline.md`，本文件的正確標籤是
   「**gate-only / 靜態閱讀**」，不是「已驗證」。
4. **總數是約數** —— 見 §3 末的說明。

**補掃時發現的 zh-Hant 問題**（不屬本盤點，已記 BACKLOG）：
`riskProg.doc.classificationValue` EN `"Restricted"` / ZH「機密」是**兩個不同分級**
（repo 自己的詞彙表把「限閱」與「機密」分開）· `deep.zh-Hant.json:6` 錯字「捷造」→「捏造」·
`append-only · SHA-256 chained` 有兩種繁中譯法 · `Information Security Officer` 有三種。
