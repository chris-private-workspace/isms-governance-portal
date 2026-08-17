# Phase W19 — Retrospective

**Phase**: W19 — mockup port（把設計交付物的 30 個畫面移植進 `apps/web`）
**Period**: 2026-08-17 ~ 2026-08-17（單日，含一次關機中斷）
**Plan**: [plan.md](./plan.md)
**PR**: ⏳ PR-pending（push 需使用者確認）
**Change record**: `docs/03-implementation/changes/CH-038-w19-mockup-port.md`

---

## Q1 — 交付了什麼？

| US | Deliverable | 狀態 |
|----|------------|------|
| US-1 | 三支 CSS verbatim copy + `globals.css` + self-host 字型 + detector config（含負面測試）| ✅ 完成 |
| US-2 | App shell（左 rail + topbar + scope/period + 語言 + 主題）| ✅ 完成 |
| US-3 | 27 個 screen `page.tsx` + 共用 primitive | ✅ 完成（build 路由表實測 31 條）|
| — | `30-ai-drawer`（第 3 個 shell 區塊，US 之間的縫隙）| ✅ Day 4 補做 |
| US-4 | 23 支 fixture 移植 + 三處憲章清理 + `DemoBadge` 全覆蓋 | ✅ 完成（另加 14 支 `extended/`）|
| US-5 | Persona 登入（httpOnly cookie、零憑證儲存、production 拒絕）| ✅ 完成 |
| US-6 | Drive-through 30 個畫面 + 截圖 + observed-vs-intended | ✅ 完成（**30 / 30**，含 Day 4 補的 ai-drawer）|
| US-7 | `page-inventory.md` + `design-system.md` + closeout | ✅ 完成 |

**Deliverable 以外、closeout 才發現並補做的一項**：
`30-ai-drawer`（浮動 AI 助理啟動鈕 + 側滑抽屜，66 行）**在 Day 0-3 全程沒有被移植**，
而 plan 的「30 個畫面 = 3 shell + 27 screens」把它算在內。

⚠️ **它沒有出現在任何一份 checklist 條目上** —— plan 的 US 切分
（US-2「app shell」/ US-3「27 個 screen」）**把第三個 shell 區塊掉在中間**，
於是 27/27 全綠時看起來像是完成了。→ `AD-DeliverableGapBetweenUS-1`

Day 4 補做並**開車驗證**：啟動鈕 fixed / z-60 / 右下角、面板 392px、
「未連接任何模型」有顯示、**零廠商字串洩漏**、4 個建議提示點下去產生真實答案、
**自由輸入不作答只回誠實通知**、`/admin` 等其他畫面上同樣存在 ⇒ **30 / 30**。

**未完成／已知不做**：

- **視覺像素 diff** —— 本片的保真度比對是代碼層。明列於 `page-inventory.md` 覆蓋聲明
- **zh-Hant 譯文品質稽核** —— 只驗了 key 對稱與 en 存有原文
- **API 串接** —— 全部 27 畫面資料仍為 fixture，這是設計中的範圍

---

## Q2 — Calibration（工時校準）

- **Scope class**: `mockup-port`（**第 1 個資料點**，本片新建）
- **Agent-delegated**: `yes`（plan 時宣告）· sub-class `greenfield-port-style`
- **Bottom-up est**: **69 hr**（Day-0 由 55 修正而來 —— 見 Q3）
- **Committed (calibrated)**: **17 hr**（69 × 0.55 = 38，再 × agent_factor 0.45）
- **Actual**: **6.9 – 8.0 hr**（見下方量法）
- **Ratio**: **0.40 – 0.47**
- **Band 判定**: **UNDER**（< 0.7），且不是邊緣值

### ⚠️ 量法與它的不確定性（不給假精確）

progress.md **沒有逐日工時紀錄**，所以 actual 由 commit 時間戳量：

| 區段 | 時長 |
|---|---|
| 分支點 `cd8e22b` 13:47 → 首個 W19 commit 15:10（plan / checklist / Day-0）| 1.38 hr |
| 15:10 → 17:58（Day 1-2 前段，關機前）| 2.80 hr |
| 19:03 → 21:44（Day 2 收尾 + Day 3 + 保真度比對）| 2.68 hr |
| **小計（排除 17:58–19:03 的中斷）** | **6.86 hr** |
| 若把整段中斷計入（其中確有 agent 在跑）| 7.95 hr |

⇒ 區間 **6.9–8.0 hr**。**兩端都給，因為那 65 分鐘裡有一部分是工作、一部分是關機，我量不出比例。**

⚠️ 這是 `AD-CalibrationT0PlacementShift-1`（W18）的**第二個變體**：那條講 T0 落在哪裡，
本片新增的是**窗口內部有閒置區段**。matrix 現有欄位表達不了這件事。

### 發生了什麼

**`agent_factor` 假設 agent 取代循序工作，但本片是 3 個 agent 同時跑。**
27 個畫面分三批平行，wall-clock 被壓縮的程度遠超過 0.45 這個係數所描述的。
0.45 是「一個 agent 比人快多少」；實際發生的是「三個 agent 同時做三件事」。

**這不是雜訊，是這個 class 的結構特徵** —— `mockup-port` 天然可切成互不相干的畫面，
所以它幾乎總是能平行化。但**單一資料點不調乘數**（matrix 規則），
而且本片的估算信心在 plan 就標為低（NEW class 無歷史）。

**行動**: **等更多資料點**。不 re-point。
預先判準：第 2 個 `mockup-port` 資料點若**同樣落在 < 0.7 且同樣是多 agent 平行**，
則 re-point 的對象**不是 class 乘數 0.55，而是 `agent_factor`** ——
應為「平行度」而非「是否委派」建一個維度。

- [x] 已回填 `calibration-matrix.md`（≤ 1 行）
- [x] 完整敘述已寫入 `calibration-log.md` §1
- [x] |R − 1.0| > 30% → AD 已記入 BACKLOG（`AD-AgentParallelismFactor-1`）

---

## Q3 — Day-0 驗證的投報率

- **Drift 數量**：**22**（Day-0 **12** · Day 1-2 **6** · Day 2-3 **4**）
  ⚠️ 編號有斷號：**D19–D21 從未指派**（我在續寫 progress 時直接跳到 D22）。不要去找。
- **Day-0 成本**：未逐項計時；由 commit 區段推估 ≈ **1.4 hr**（含起草 plan/checklist）
- **預防的返工**：見下

### ⭐ 最有價值的 drift：D9 —— plan 的三個指標全部量錯單位

plan 用 **行數**當作**出現次數**：inline style 估 ~2,000、實測 **2,651**（+32.6%）；
值洞 +61.7%；控制流 −9.7%。⇒ bottom-up 估算由 **55 hr 修正為 69 hr**。

**若沒抓到**：整個 phase 的工時承諾會建立在低估 20% 的基數上，
而後續每個 Day 的落後都會被誤讀為「執行不力」而非「基數錯誤」。

### 其他高價值的

| Drift | 若沒抓到會怎樣 |
|---|---|
| **D10** —— 30 個 fragment **完全沒有 class 屬性** | 會照 playbook 去「消費 `components.css` 的 class 名」，而那 77 個 class **一個都不會被用到**。整條路線是空的 |
| **D11** —— 零 `aria-`，但 `components.css` 有 3 條選擇器依賴它 | 那三條 CSS **永遠不會生效**，而視覺比對看不出來。⇒ **a11y 與視覺保真度在此是同一件事** |
| **D5** —— plan 完全漏了中國（8 處跨 5 檔）| 已排除的管轄區會出現在畫面上（參數 #4）|
| **D3** —— 註冊畫面有密碼欄位 | 與 **ADR-0007** 直接衝突的 UI 會被照抄進去 |

**ROI**：Day-0 的 1.4 hr 至少換到「不走一條空路線」（D10）與「工時基數修正」（D9）兩項，
兩者都是**方向性**錯誤而非局部錯誤 —— 局部錯誤事後可修，方向錯誤要重做。

---

## Q4 — 做得好的（保持）

- ⭐ **派工 prompt 一律要求「回報衝突而不是自行消化」。**
  它今天擋下 **5 個我自己的錯誤**：術語給錯（控制措施 vs 控制項，已擴散到 3 個 agent）·
  叫 agent 跑不存在的 `npm run format`（且危險的是那個看似合理的補救 —— workspace-wide
  `prettier --write` 會覆寫另外兩個 agent 正在寫的檔）· 說 fragment 有 37 個 `<sc-if>`
  （實際 36，我把註解算進去）· 說 `audit-issues/[ref]` 有 3 個死控件（實際 4，第 4 個在非預設分頁）·
  說 `assistant.*` 字典在 `details.*.json`（實際在 `settings.*.json`）。
  **擋住它們的不是我的自律，是那一句要求。**
  ⭐ 而 design-system 那份報告更進一步：它去查了我聲稱的守衛，發現
  **`i18n.test.ts` check 3 的射程只有 2%** —— 那是我在四份 prompt 裡都引用過的東西。
- **修死控件時先問「能不能真的做到」再談停用。** 2 個因此變成真的能用（語言卡），
  而不是被一律停用掉。
- **機械守衛在發現當天就落地**（`check_hover_rules`），並且**先寫負面測試看它變紅**再看它變綠。
- **fixture 先機械複製、diff 21/21 IDENTICAL 之後才清理** —— 複製與編輯分兩步，
  所以「哪裡被改了」永遠可追。

---

## Q5 — Anti-Pattern 自檢

| AP | 違規數 | 說明 |
|----|-------|------|
| AP-1 Side-track | 0 | 27 條路由全部從導航或列點擊可達；**本片補上的正是既有的斷點** |
| AP-2 Cross-directory scattering | **1（已記錄未修）** | ⚠️ `answerFor` 在 assistant 全頁與 drawer 兩處**逐字重複**。抽共用要動一個**已驗收**的畫面，超出 drawer 的授權範圍 ⇒ `AD-DrawerAnswerDuplication-1`。**不寫 0** —— 記錄未修不等於沒發生 |
| AP-3 Potemkin | **25 → 0** | ⭐ drive-through 抓到 25 個死控件，全部處置後複驗零違規 |
| AP-4 PoC accumulation | N/A | 無 PoC |
| AP-5 Speculative abstraction | 0 | `setLocale` 是補完既有模式（`setScope` 同理），非預留 |
| AP-6 Mock vs real divergence | 0 | 全部 fixture，且 **27/27 頁 DemoBadge 可見** + AI 助理標「未連接任何模型」 |
| AP-7 命名 / orphan claim | **11 → 0** | ⭐ 修死控件時，11 處註解與檔頭宣稱變成假話（「rendered as designed」「unwired」），全部改寫 |
| **總計** | **1（處置後）** | 但**發生數是 37** —— 記在這裡才有意義 |

**Lint**: `run_all.py` **9/9** ✅

⚠️ **AP-3 的 25 與 AP-7 的 11 都是 drive-through 之後才可見的。** 若本片停在 gate 全綠，
這張表會是全 0 —— **而那個 0 是假的**。

---

## Q6 — 下次要改的（Action / Decision items）

| AD ID | 症狀 | 提議 | 狀態 |
|-------|------|------|------|
| `AD-ProxyMetricAsAnswer-1` | ⭐⭐ **同一 session 內 7 次**拿便宜的代理指標／估值回答需要精算的問題（原始 grep 命中數 ×3 · 搜錯範圍 ×2 · 偵測器誤報 ×1 · **把加總估了寫進交付物** ×1）| 強度階梯門檻是 3 次 ⇒ **要結構性解法不是再寫一次紀律**。提議：任何進入交付物的數字，必須由**當場執行的指令**產生並貼出輸出，不得由閱讀推得 | 候選 |
| `AD-DeliverableGapBetweenUS-1` | plan 的 US 切分讓 `30-ai-drawer` 掉在 US-2 與 US-3 中間，27/27 全綠時看起來完成了 | US 覆蓋率要對得上 §Summary 的總數；closeout 加一步「§Summary 宣告的數量 vs 實際交付」 | 候選 |
| `AD-AgentParallelismFactor-1` | `agent_factor` 描述「是否委派」，但真正壓縮 wall-clock 的是**平行度** | matrix 增一個平行度維度（1 agent / 2-3 / 4+），與 agent_factor 正交 | 候選（需第 2 個資料點）|
| `AD-CalibrationIdleWindow-1` | 量測窗口內部有閒置區段（關機），matrix 現有欄位表達不了 | actual 允許記區間而非單值；或明訂「中斷 > 30 min 需分段記錄」 | 候選 |
| `AD-I18nScannerCoverage-1` | ⭐ **一個被本 phase 廣泛引用的守衛，射程只有 2%** —— `i18n.test.ts` check 3 比對兩參數 `t(locale,'key')`，而 27 畫面全用單參數 `tr('key')` ⇒ 它看得到 13 個 key，看不到 718 個 | 擴 regex 吃單參數；或改為 lint 禁止 `tr(` 內出現樣板字串。⚠️ 真正在守的是型別 `tr: (key: TranslationKey)`，而 `as` cast 正好會拿掉它 | 候選 |
| `AD-OrphanCssShipped-1` | 77 個 CSS class 零使用者卻仍被 import 進 bundle；`className` 全 repo 0 命中 | 把只存在該檔的兩個值搬走後移除 import，並修正 `components.css` 檔頭那句不實宣稱 | 候選 |
| `AD-DrawerAnswerDuplication-1` | `answerFor` 在 assistant 全頁與 drawer 兩處逐字重複（AP-2）；且 drawer 的對話 state 是 local，與設計的共用 `chatMsgs` 不符 | 兩檔同開時把 state 與 `answerFor` 一起提升到 shell | 候選 |

- [x] 已記入 `docs/01-planning/BACKLOG.md`

> ⭐ **後三條全部是 closeout 當天才浮出來的，而且都是 agent 回報的**（design-system 與 AiDrawer 兩份報告）。
> 這與 Q4 第一條是同一件事的兩面：**要求回報衝突，收到的不只是「我做完了」**。

---

## Q7 — Carryover

**帶到下個 phase 的**：

- 視覺像素 diff → 未開 AD（範圍已在 `page-inventory.md` 覆蓋聲明中明列）
- API 串接（27 畫面仍全 fixture）→ 設計中的下一片
- `AD-LocalPasswordFallback-1` 🔴 **P0** —— 需 **ADR-0007 修訂**，本片不得實作
- `AD-RbacUnenforced-1` 🟡 · `AD-FixtureEnumUntranslated-1` 🟢 ·
  `AD-ShellMinWidth-1` 🟢 · `AD-NewRouteAsymmetry-1` 🟢
- Q6 的 **7** 條新 AD

**這個 phase 關掉的**：

- `AD-CssToken-1` ✅ CLOSED —— 紅線 7 在本專案是錯的，已以 narrow exemption list 落地
- `AD-Mockup-3` ✅ CLOSED —— 13 家 OpCo，India 刪除且不補 `RCN`，Japan 非營運實體
- `AD-Port-BFSI` ✅ CLOSED —— 全 app grep 0 命中
- `AD-Auth-1` ✅ CLOSED —— login 移除密碼欄位、13 OpCo、六角色
- `AD-Mockup-2` ⚠️ **狀態改為「已渲染，結構問題仍開」** —— 儀表板不再以國家為鍵，
  但跨實體滾升的正確聚合規則仍未決（`regionPosture` 取中位數是可解釋值，非治理級規則）

---

## Closeout Self-Check

- [x] `CLAUDE.md` 變更只有導航 / 原則 / 規則層級（沒有加 phase 歷史列）
- [x] `MEMORY.md` 新條目是 ~250-300 字元的品質指標
- [x] Phase 細節完整保存在 memory subfile + 本檔
- [x] Carryover 記在 `docs/01-planning/BACKLOG.md`
- [x] Calibration ratio 回填 matrix
- [x] Matrix 那一行 ≤ 1 行 ~250 字元
- [x] ⭐ `RISK_REGISTER.md` 已複查
- [x] `plan.md` frontmatter `status:` 已翻，內文標記一致（R9）
- [x] `python scripts/lint/run_all.py` 全綠
