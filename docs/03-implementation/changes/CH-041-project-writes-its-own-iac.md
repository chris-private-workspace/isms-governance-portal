# CH-041: 本專案開始寫自己的 IaC —— CH-010 記錄的分工已不成立

**Date**: 2026-08-18
**Phase**: W21
**Scope**: Infrastructure / Deployment · Secure SDLC
**Components**: —
**PR**: #TBD

---

## Problem

`CH-010:51` 記錄「**兩個都不選 —— 本專案不寫 IaC**」，理由是「infra team 建立並營運全部
Azure 資源（2026-08-08 確認）」。這句話從 W01 起被四處當成前提：

| 依賴它的地方 | 依賴的內容 |
|---|---|
| `W01/retrospective.md:182` | M0 DoD #3「IaC skeleton scanned」**不得打勾或標 N/A** |
| `RISK_REGISTER.md` R7 | 「IaC 沒有標的（義務已移交 infra team）」 |
| `STATUS_AUDIT.md:197` | 「本 repo 內結構上零標的」 |
| `ADR-0011:119` | IaC 工具選型的問題「沒有東西可選」 |
| `W01/plan.md:200,290` | 「不寫 IaC —— 已無標的」 |

**W21 讓這句話變成假的。** 使用者 2026-08-18 指示開始部署，實測顯示這個身分**自己建得起
ACR / ACA environment / Container App**（建不起來的只有 resource group）。本片因此在
`infra/azure/provision.sh` 放了一支進版控的 `az` 腳本 —— **那就是 IaC**。

---

## Root Cause

`CH-010:51` 把一個**分工決定**寫成了一句**關於世界的事實**，而沒有附帶「什麼情況下它會不再成立」。

事實會過期，決定不會 —— 而過期的事實不會舉手。2026-08-08 到 2026-08-18 之間，
真正改變的是**使用者手上有了可以建資源的憑證**；那一天沒有任何東西指向 `CH-010:51`。

⭐ 這與 ROADMAP 9b 的失效**同形**：一個宣稱的有效性條件只活在散文裡，
沒有任何機械承載會在條件變動時叫一聲。9b 是計數器沒人遞增，這裡是前提沒人重驗。

---

## Solution

| 檔案 | 類型 | 說明 |
|------|------|------|
| `infra/azure/provision.sh` | 新增 | 冪等的資源建立腳本；RG 是**前置檢查**不是步驟 |
| `infra/azure/README.md` | 新增 | 資源清單 · 擁有者 · 重建方式 · **明列不做的事** |
| `.github/workflows/security-scan.yml:229-241` | 修改 | semgrep 目標加 `infra` —— 見下方 load-bearing |
| `.env.example` | 修改 | 補 5 個已被程式碼讀取的變數（逐個 grep 確認有消費者） |

**`CH-010:51` 那一格刻意不改字。** 它記錄的是 2026-08-08 當時為真的東西，改掉等於銷毀
「當初依據什麼決定」的軌跡（`AP-7` 的註解版本）。本記錄是它的後繼，由 §相關 雙向連結。

**Load-bearing，拿掉就會壞**：`provision.sh` 每次重跑都**重新斷言** `adminUserEnabled=false`
與 `allowInsecure=false`，而不只在 create 分支設定一次。理由是 M0 DoD #5 要的不是「曾經設對」
而是「現在是對的」—— 只設一次的安全設定，是沒有人在看的安全設定。

---

## Verification

**Gate**: `run_all` 見 W21 retrospective §gate 射程聲明 · `provision.sh` 第二次執行
**created 0 / existing 4**（AC-4 的冪等半邊，實跑）

**新增測試**: 無自動化測試 —— 這支腳本的斷言**寫在它自己裡面**（兩個 `die`），
且只能對真 Azure 執行。**這是刻意的取捨，不是遺漏**：mock 一個 `az` 來測 shell 分支，
測到的是 mock 的形狀（`AP-6`）。

⛔ **AC-4 的另一半未驗**：「在**乾淨的 RG** 上重跑產生等價資源」做不到 ——
Day-0 `D-rg-map` 量到 southeastasia 只有**一個**可寫 RG。create 分支因此**從未被執行過**，
它在 Day 1 是以逐條手打的 `az` 指令完成的，腳本是事後固化。

**Drive-through**: ✅ 部署出的網址走完 29 路由（W21 Day 3）；`DEMO_AUTH` 負面測試（Day 4）。

**Verdict**: ⚠️ **PARTIAL** —— 冪等半邊 PASS，乾淨-RG 半邊**無法驗證**（環境限制，非取捨）。

---

## Impact

- **Breaking change**: no
- **Migration**: no
- **Config**: `.env.example` 補 `API_HOST` `WEB_ORIGIN` `DEV_PRINCIPAL_ENTITIES`
  `DEV_PRINCIPAL_ROLLUP` `DEMO_AUTH`（全部是**既有**消費者，非新增行為）
- **重啟需求**: 無（本記錄不改任何執行中的程式碼）
- **Rollback**: 刪 `infra/` 並還原 semgrep 目標清單；Azure 資源不受影響（腳本只是它們的**描述**，
  不是它們的來源 —— 這正是「事後固化」的代價）

---

## 相關

- **不關閉**: `AD-IaCEvidence-1` —— ⛔ **它的前提翻了，但它不因此關閉，而是分裂成兩半**：
  - **(a) RIT 營運的資源** —— 仍需對方的掃描證據，PAR 第 7 點已索取。**原樣不動**
  - **(b) 本 repo 的 IaC** —— **今天才第一次存在**。實測 `provision.sh` 目前**沒有任何掃描器
    覆蓋**：semgrep 原本只掃 `apps packages scripts`，`trivy config` 不支援 shell
    （它支援 Terraform / CFN / K8s / Helm / ARM / Dockerfile）。本記錄把 `infra` 加進
    semgrep 目標 —— ⚠️ **加了目標不等於產生了覆蓋**，semgrep 只在 CI 跑，本機無從量測，
    答案要在 PR 的 CI log 讀。→ `AD-IaCScanCoverageUnmeasured-1`
- **改變狀態**: **M0 DoD #3** 從「⛔ 結構上無標的」變成「**有標的，覆蓋未量測**」——
  ⛔ 仍**不得打勾**，但**不再是外部阻塞**：這一半現在是我們自己的工作
- **前例**: `CH-010`（本記錄的前身）· `CH-008`（同樣是「已記錄的前提失效」，
  當時是中國移出讓 ADR-0006 的拓撲變錯）
- **產生的待辦** → `docs/01-planning/BACKLOG.md`
