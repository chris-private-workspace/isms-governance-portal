# Risk Register

**Purpose**: Living 風險登記。**不是寫一次就算的文件** —— 每次 phase 收尾要複查。
**Created**: 2026-08-07
**Last Reviewed**: 2026-08-10
**Status**: Active

> **和 BACKLOG 的分工（這條最容易搞混）**：
> BACKLOG 裝**待辦** —— 「要做的事」。本表裝**風險** —— 「可能發生的壞事」。
> 「pooler 下 `set_config` 未驗」是待辦（`AD-PoolerScope-1`）；
> 「隔離保證依賴一個未經 production 負載驗證的機制」是風險（R3）。
> **本表不複製 AD 細節**，只 link。

---

## 活躍風險

| # | 風險 | 可能性 | 影響 | 緩解 | 狀態 | 最後複查 |
|---|---|---|---|---|---|---|
| R1 | **自建路徑本身** —— build-vs-buy 分析曾建議不要自建；stakeholder 在知情下確認。其風險自此是設計約束而非未知數 | 中 | 高 | Foundation-first 排序；兩個最小模組端到端證明骨幹，而不是先鋪功能面 | 已接受（知情決定，`00` D10 / 已確認參數 #14）| 2026-08-10 |
| R2 | **單人開發，沒有第二雙眼睛** —— `required_approving_review_count: 0`，沒有 reviewer 存在 | 高 | 中 | ①PR 開著睡一晚，隔天用 reviewer 心態重讀；②六個 required check（`CH-015` 起真的會擋）；③每個宣稱會擋東西的機制附常駐負面案例 | 緩解中 | 2026-08-10 |
| R3 | ⭐ **實體隔離只剩一層屏障** —— ADR-0010 拿掉物理隔離後，RLS 是**唯一**的隔離機制（`07:33`）。隔離失敗不是一般 bug，是合規事故 | 低 | **極高** | W02 交付：RLS + `FORCE`、`WITH CHECK`、不 GRANT DELETE、`app_entity_scope()` fail-closed、20 個整合測試（8 個完全不經應用層）、旁路 detector。**已用「弄壞它看它紅」驗過**（policy → `USING(true)` 導致 14/20 紅）。**W03 補上並行汙染的常駐測試**（40 次交錯查詢逐列斷言）| 緩解中 —— 剩餘缺口**只剩** `AD-PoolerScope-1`（pooler 下 tx-local `set_config` 未驗）。~~`AD-ScopeConcurrency-1`~~ 已於 W03 關閉 | 2026-08-10 |
| R4 | ⭐ **稽核軌跡尚不存在，而資料已經在寫** —— guardrail 5 要求所有狀態變更進 append-only 防篡改日誌；**沒有任何稽核軌跡**。滾升是合法的跨實體讀取，它**必須被稽核**才不會變成後門。⚠️ **敞口逐 phase 擴大**：W02 兩張表 → W04 +2（`users` / `ref_code_counters`）→ **W05 +3**（`asset_groups` / `assets` / `risks`），今日**七張表、無一有稽核** | **確定（現況）** | 高 | 攔截點已就位（ADR-0004 的 client extension 就是 M3 的落點）。⚠️ **緩解措施本身沒有進展** —— 三個 phase 以來擴大的是敞口不是防護；`created_by`/`updated_by` 欄位存在但**永遠是 NULL**（刻意：填佔位使用者會讓 M3 的問題用謊話被回答）| **開放** —— M3 / ADR-0003 / OQ-4。⛔ **每個新增業務表的 phase 都會讓它更大，而沒有任何 gate 會叫** | 2026-08-11 |
| R5 | **設定型強制力靜默失效** —— 設定損壞時不報錯，而是安靜地什麼都不做，外層 `EXIT=0` 讀起來像通過 | 高 | 中 | 結構性解法：每個宣稱會擋住某件事的機制，必須附一個**會被它擋住**的常駐負面案例，且在 CI 裡執行。⚠️ **實例清單見 `AD-NegativeGate-1`（唯一權威）—— 本表刻意不複製計數**，因為手動維護的計數器在三處各寫一次時必然漂移（審計 AD-8）| 緩解中 —— `AD-NegativeGate-1` **刻意保持開啟**（見「已實現」表 E1）| 2026-08-10 |
| R6 | **AI 輔助開發的一致性漂移** —— 單人 + AI 的組合缺少「另一個人會覺得奇怪」這道天然檢查 | 高 | 中 | 凍結模板作為絕對錨點（不模仿上一個 phase）；always-loaded 規則有 byte 預算機械強制；跨來源審計（`STATUS_AUDIT.md`）| 緩解中 —— 見「已實現」表 E2 / E3 | 2026-08-10 |
| R7 | **M0 DoD 有兩項不是本專案單方面能關閉的** —— DAST 需 VNet 內 runner；IaC 沒有標的（義務已移交 infra team）| 高 | 中 | ⛔ 不得逕行打勾或標 N/A。二選一：引用對方的掃描證據，或明記「由內部第三方營運」| 卡外部 —— `AD-DAST-1` · `AD-IaCEvidence-1`，排序見 [`ROADMAP.md`](./ROADMAP.md) §等外部 | 2026-08-10 |
| R8 | ⭐ **Entity Zero（guardrail 2）在 Wave 1 沒有承載體** —— 平台要以資產身分登記在自己系統內、受自己的控制約束，但那個模組要到 M4/M5 才存在 | **確定（現況）** | 中 | **本表即為過渡承載體**（見下方 §Entity Zero 遷移標記）。模組上線時把標記過的列遷進平台自己的 Risk Register | 緩解中 | 2026-08-10 |

> ### Entity Zero 遷移標記
>
> **R3 · R4 · R5 · R7** 是**平台自身**作為受管資產的風險，不只是專案交付風險。
> Risk Register 模組（M4/M5）上線時，這四條要遷入**平台自己的系統** ——
> 那次遷移本身就是 guardrail 2 的第一次證明，而且用的是**真實資料**，
> 不是種子資料（guardrail 7 禁止產生假的示範資料，這正好繞開它）。
>
> 其餘（R1 · R2 · R6 · R8）是專案交付風險，留在本表。

---

## 已實現的風險（變成事件）

| # | 風險 | 何時實現 | 實際影響 | 事後 |
|---|---|---|---|---|
| E1 | **R5 設定型強制力靜默失效** | **5 次**：W01 一個 phase 內 5 次（boundaries 六種失效皆 lint 綠 · 三個掃描 job success 卻掃 0 目標 · build 成功但產物起不到 · `helmet({xPoweredBy:false})` 對 Express 無效 · CI 跑 `test` 而非 `test:cov` 導致 45% 覆蓋率一路綠）| 每一次都是「gate 回報通過但什麼都沒檢查」。最久的一個橫跨整個 W01 | 無 postmortem（不是 bug 軌）—— 結構性解法在 `AD-NegativeGate-1`，CH-012 / CH-013 / W02 各交付負面案例 |
| E2 | **R6 漂移：拿代理指標回答需要讀內容的問題** | **6 次**（W02 一個 session 內）：`.env` 未同步 → 殘留 fixture 汙染斷言 → detector 對註解開火 → `grep "^\[warn\]"` 撞 ANSI 色碼 → `super=f` 撞 `true/false` → haste 警告本機快取熱 | 其中一次**把「format clean」寫進了 commit message 與 PR 描述**，而那個 0 命中是 pattern 永不匹配造成的 | 已於 `bd107cf` 更正。第 5 次起改結構：斷言用退出碼或 SQL 述詞，不 grep 格式化輸出（`AD-GrepAssertion-1`）|
| E3 | ⭐ **R3 隔離失敗（開發環境）** | W02 Day 2：改了 `.env.example` 但 `.env` 沒改，整輪探測以 **superuser** 連線 —— `FORCE ROW LEVEL SECURITY` 對 superuser 無效，**十二項全綠而 RLS 全程未生效** | **一列 fixture 從 SG1 被搬到了 HK1** —— 這是一次真實的跨實體寫入。發生在開發資料庫，非 production。⚠️ 若沒跑那一輪而直接寫 provider 加測試，**測試會全綠而且證明不了任何事** | 無 postmortem（開發環境）。修法：每個量測腳本與 `int-global-setup.js` **先斷言前提**（角色 `super=f bypassrls=f`）。缺口仍在應用程式啟動時 —— `AD-EnvDrift-1` |

> 這張表比上面那張更有價值：**它告訴你當初的可能性評估準不準**。
> 如果一堆「低可能性」都實現了，你的評估方式有問題，不是運氣不好。

---

## 慣例

- 每個 phase 的 `plan.md` §Risks 只放**該 phase 特有**的風險；跨 phase 的長期風險住這裡
- 風險關閉要寫**為什麼關**（緩解完成？還是條件消失？）
- Bug postmortem 若揭露新的風險型態 → 加進本表（PROCESS §4.5 步驟 10）
