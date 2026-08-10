# `16` 的 28 點 secure-development DoD —— 自動化可行性分類

**Purpose**: 逐點判定「可機械化 / 需人工 / 已被現有 CI 覆蓋」，作為 `AD-SecDoDAutomation-1` 實作前的依據。
**Category / Scope**: Analysis / M0 DoD 第 2 項
**Created**: 2026-08-10
**Last Modified**: 2026-08-10
**Status**: Active

> **Modification History**
> - 2026-08-10: Initial creation —— `STATUS_AUDIT.md` 2026-08-10 §2.7 AD-4 的處置第一步

---

## 為什麼先分類再實作

`07:31` 的 M0 DoD 要求 "plus the **automated** secure-development DoD checks (`16`)"，
而 grep `scripts/` + `.github/` 對 `16-secure-development-dod` / `28 點` **零命中**。

但「補上自動化」不是一個可以直接開工的任務 —— **28 點裡有相當比例根本不可能在 CI 裡驗證**
（TLS 密碼套件、憑證 CN/SAN、管理埠）。跳過分類直接建，會產出一批對那些項目
「回報通過但什麼都沒檢查」的 gate ——— 那正是 `AD-NegativeGate-1` 的形狀，
而這個專案在一個 phase 內踩過它 5 次。

---

## 涵蓋聲明

**判定依據**：`docs/02-architecture/16-secure-development-dod.md` 全文（91 行）·
`apps/api/src/bootstrap/security.spec.ts` 實際斷言 · `.github/workflows/` 三個 workflow ·
`scripts/lint/` 現有 detector。

**沒有讀到**：`reference/Secure-Dev-DoD-Checklist.xlsx` 的 findings register
（**刻意不在版控**，只存在本機磁碟）。因此本分類以 `16` 的文件內容為準；
`16:90` 要求的「對照 findings register 驗證修復」**不在本次射程內**。

**沒有判定**：各點的實作成本。分類回答「能不能機械化」，不回答「要多久」。

---

## 分類總表

| 類 | 意義 | 數量 |
|---|---|---|
| **A** | 已被現有 CI check 覆蓋（可指到 `file:line`）| **4 完整 + 2 部分** |
| **B** | 可機械化，**今天就有標的** | **3 完整 + 2 部分** |
| **C** | 可機械化，但**今天沒有標的** —— 建了就是 AP-3/AP-5 | **7** |
| **D** | **不可**在 CI 機械化 —— 部署期組態，只能部署後探測或人工簽核 | **5** |
| **N** | **需拍板是否適用** —— ADR-0007 選了 Entra ID SSO，平台不處理密碼 | **5** |

合計 28。

---

## 逐點判定

### Transport & certificates（1–6）

| # | 檢查點 | 類 | 依據 |
|---|---|---|---|
| 1 | HTTPS only；非 HTTPS 301/302 | **D** | ACA ingress 組態。CI 無部署環境可測 |
| 2 | `Strict-Transport-Security` 全回應 | **A** | `security.spec.ts:66` —— 斷言 `max-age ≥ 31536000` + `includeSubDomains` |
| 3 | TLS 1.2+ only；停用 SSLv2/v3、TLS 1.0/1.1 | **D** | 部署期 |
| 4 | Cipher suites 限 ECDHE + AEAD | **D** | 部署期 |
| 5 | 憑證 CN **與** SAN 符合真實 hostname；自訂網域 | **D** | 部署期。⚠️ `16:78` 明文：ACA 的 `*.azurecontainerapps.io` **同樣是平台預設**，兩個平台都要組態掉 |
| 6 | 管理／部署埠對外關閉或 IP 限制 | **D** | 部署期。⚠️ `STATUS_AUDIT.md` §2.10 第 5 項記「管理埠未取得實據」，本點即該缺口 |

> **五點 D 全部集中在這一組，且全部是 M0 DoD 第 5 項的內容。**
> 它們不會有 CI gate —— 只能靠部署後探測（DAST 的自然落點，見 `AD-DAST-1`）或人工簽核。

### Session & cookies（7–10）

| # | 檢查點 | 類 | 依據 |
|---|---|---|---|
| 7 | Cookie 設 `Secure` / `HttpOnly` / 明確 `SameSite` | **C** | 今天**沒有任何 cookie**。M4 identity 是觸發點 |
| 8 | 登入後重生 session ID 並失效舊的 | **C** | M4 |
| 9 | Session ID 來自 CSPRNG，**≥128 bits** | **C** | M4。⚠️ 若 Entra ID + stateless token，這點的**形狀會變** |
| 10 | ⭐ **無憑證／token／個資進 `localStorage` / `sessionStorage`** | **B** | **今天就有標的**（`apps/web` 已存在）。eslint `no-restricted-globals` / 自訂 detector 即可。CLAUDE.md guardrail 7 把它列為**兩條最容易不小心違反**之一 |

### Authentication & credentials（11–15）

| # | 檢查點 | 類 | 依據 |
|---|---|---|---|
| 11 | 密碼只出現在認證請求 | **N** | ADR-0007 已採納 Entra ID（OIDC）—— **平台不處理密碼** |
| 12 | 密碼 salted strong hash **／ 憑證外流時用強隨機 token** | **N（部分）** | 前半 N/A。⚠️ **後半仍適用** —— API token、邀請連結、`AccessRequest` 自助入口 |
| 13 | 含密碼欄位的表單只走 HTTPS | **N** | 無本地密碼表單 |
| 14 | 暴力破解保護（3–5 次鎖定 + 解鎖路徑）| **N** | Entra ID 管登入。⚠️ **但平台自己的端點呢？** 未答 |
| 15 | 敏感欄位 `autocomplete="off"` + 強密碼規則 | **N** | 同 11 / 13 |

> ⛔ **這五點不可逕行標 N/A。** ADR-0007 把認證移給 IdP，但 `16` 是逐 story 的 DoD ——
> 它預設平台自己處理密碼。**「哪些責任隨 OIDC 移轉給 Entra ID、哪些留在平台」需要一次明確拍板**，
> 否則 M0 收尾時會有五個沒有人能回答的格子。第 12 點後半與第 14 點**幾乎確定仍是平台的責任**。

### Data protection（16–19）

| # | 檢查點 | 類 | 依據 |
|---|---|---|---|
| 16 | 伺服器端遮蔽卡號／身分證號／PII | **C** | 今天沒有 PII 欄位。`16:71` 指名 incident records（Wave 2）與 ISMS leader 聯絡資料 |
| 17 | ⭐ **測試／示範資料無 checksum-valid 卡號、無真實個資** | **B** | **今天就有標的** —— W02 已有 seed fixture。`16:85` 明文列為 CI 項；`16:67` 記載既有應用掃出 **24 個** checksum-valid 卡號樣式；CLAUDE.md guardrail 7 明文禁止 |
| 18 | 移除 `Server` / `X-Powered-By` / `X-AspNet*` 指紋標頭 | **A** | `security.spec.ts:75-80` —— 四個標頭斷言**不存在**（不是空值）|
| 19 | 無備份檔／設定檔／目錄列表可被 forced browsing | **B（部分）** | 可機械化的部分：斷言 build 產物不含 `.env` / source map / `.bak`。**完整驗證需 DAST** |

### Security headers（20–22）

| # | 檢查點 | 類 | 依據 |
|---|---|---|---|
| 20 | CSP 含 `frame-ancestors 'self'` | **A** | `security.spec.ts:84-89` —— 送的是 `'none'`，**比要求的 `'self'` 更嚴格**（已在該處註記）|
| 21 | `nosniff` / `Referrer-Policy` / `Permissions-Policy` / `X-Frame-Options` | **A** | `security.spec.ts:93-100` 四個逐條斷言。`Permissions-Policy` 是 helmet **不提供**的那個，CH-012 之前缺席 |
| 22 | 敏感頁面與 API 回應 `Cache-Control: no-store, private` | **B** | ❌ 完全未做 = `AD-CacheControl-1`。⚠️ **前置是政策決定**（「什麼算 sensitive」），不是寫 header |

### Injection & output encoding（23–25）

| # | 檢查點 | 類 | 依據 |
|---|---|---|---|
| 23 | 反射輸出按 context 編碼 | **C** | React 預設跳脫；今天前端只有一頁、無反射輸出。semgrep 規則的標的還不存在 |
| 24 | Redirect / callback 參數走 **allow-list** | **C** | M4。⚠️ `16:70`：既有 finding 就在 `/api/auth/callback/credentials` —— **正是我們 SSO 流程的形狀**，「allow-list from day one」 |
| 25 | ⭐ 避免危險 sink（`innerHTML` / `eval` / `document.write`）| **B** | **今天就有標的**。eslint（`react/no-danger`、`no-eval`）或 semgrep 規則 |

### Dependencies & platform（26–28）

| # | 檢查點 | 類 | 依據 |
|---|---|---|---|
| 26 | 第三方腳本盤點 + **SRI** + CSP `script-src` allow-list | **C** | 今天**無第三方腳本**（此宣稱本身值得一個 detector，但今天零標的）|
| 27 | 平台元件／runtime／函式庫在支援中的已修補版本 | **A（部分）** | SCA（`npm audit --audit-level=low`）+ trivy 覆蓋**依賴與容器**。⚠️ **runtime 版本本身未驗**；`AD-TrivyFullImage-1` 記載 trivy 只掃 base image |
| 28 | **Gate**：分支掃描無新的 Level 3+ Confirmed Vulnerability | **A（部分）** | SCA / SAST / trivy 三者實跑（`CH-015` 起為 required check）。⚠️ **無 DAST**（`AD-DAST-1`）；且 **"Level 3+" 是 Qualys 的分級，從未對應到現有工具的門檻** |

---

## 建議的實作順序

**第一批 —— 今天就有標的（B 類，3 完整）**：

1. **#17 seed 資料檢查** —— 最高優先。`16:85` 明文列為 CI 項，guardrail 7 明文禁止，
   而**種子資料只會越來越多**，晚做要回頭掃更多檔
2. **#10 瀏覽器儲存禁令** —— guardrail 7 兩條最容易違反之一，前端還只有一頁，現在設成本最低
3. **#25 危險 sink** —— eslint 規則，成本近乎零

**第二批 —— 有前置**：

4. **#22 `Cache-Control`** —— 前置是**政策決定**（`AD-CacheControl-1`，已在 ROADMAP 主線第 1 項）
5. **#19 build 產物檢查** —— 部分可做

**不建議現在做**：C 類 7 點 —— 今天沒有標的，建了就是零消費者的 gate（AP-3 + AP-5）。
它們的觸發點是 M4（7 / 8 / 9 / 24）、Wave 2（16）、前端長大之後（23 / 26）。

---

## 需要拍板的（⛔ 不可由我代答）

1. ⭐ **N 類五點（11–15）**：ADR-0007 把認證移給 Entra ID 之後，
   **哪些密碼／憑證責任隨之移轉、哪些留在平台**？
   第 12 點後半（強隨機 token）與第 14 點（平台自身端點的暴力破解保護）
   幾乎確定仍是平台責任，但其餘三點需要明確裁決 —— 否則 M0 收尾時是五個空格。
   **這可能值得一份 ADR**（責任邊界會約束 M4 的多個決定）。
2. **#28 的 "Level 3+" 門檻**如何對應到 npm audit / semgrep / trivy 的嚴重度分級？
   目前三者各有各的門檻，**沒有任何一個對應到 Qualys 的 Level 3**。

---

## 這份分類回答不了的

- **`16:90` 的 fix-verification 紀律** —— 要求對照 findings register 確認修復真的關掉了對應的
  finding ID。register 在 `reference/` 且**刻意不在版控**，本次未讀
- **各點的實作成本** —— 本分類只判定可行性
- **D 類五點的替代驗證方式** —— 部署後探測是自然落點，但那依賴 `AD-DAST-1` 的解封
