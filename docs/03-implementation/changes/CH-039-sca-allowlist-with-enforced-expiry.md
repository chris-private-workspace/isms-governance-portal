# CH-039: SCA 有了逐條豁免，而真正的機制是到期日

**Date**: 2026-08-17
**Phase**: W19（PR #79 被擋時產生）
**Scope**: 非範疇 —— `scripts/lint` + `.github/workflows`
**Components**: —
**PR**: 併入 PR #79

---

## Problem

W19 的 PR 被 `依賴漏洞 — SCA` 擋住：**GHSA-ggr8-5vv4-36mx**（DeepmergeTS stack
exhaustion，high）。

而這條**不是 W19 引入的**：傳遞路徑是
`apps/api → prisma@7.9.1 → @prisma/config@7.9.1 → deepmerge-ts@7.1.5`，
且同一個檢查在本片**前一個 commit 上仍是綠的**（相隔約 40 分鐘）——
是新公布的 advisory 打到完全沒改過的相依。這正是 `security-scan.yml` 檔頭
自己預言的情況：「一條今天才公布的 CVE，會影響一段**完全沒改過**的 code」。

---

## Root Cause

`npm audit --audit-level=low` 是一個**沒有逐條豁免辦法**的 pass/fail。

而同一份 workflow 的分流規則寫的是三選一：

> 逐條分流：修 / **豁免（寫理由 + 到期日）** / 誤報（寫理由）

**中間那個選項沒有工具。** 於是被擋住時只剩兩條路，而該檔自己把兩條都列為錯的：

| 做法 | workflow 自己的判語 |
|---|---|
| 整體調高 severity 門檻 | 「讓還有一堆發現的掃描報綠 = **假綠**」 |
| 讓 job 長期紅 | 「長期紅會侵蝕『紅 = 有東西壞了』這個訊號」 |

---

## Solution

### ⭐ 這個 CH 的核心是**到期日**，不是白名單

一個沒有人會回頭看的到期日，等於一個多寫了幾行字的靜默豁免 ——
而這個 repo 的 `.gitleaks.toml` 才剛為白名單寫過同一句話
（「一個靜靜生效的白名單是最容易被遺忘的安全缺口」）。

所以 `check_sca_allowlist.py` 把到期日做成**獨立的硬失敗**：

> **接受條目一旦過期，gate 就紅 —— 與該漏洞是否仍然存在無關。**

閘門會在「這個決定該重新檢視」的那一天變紅，而不是安靜地續期。
續期是一個必須有人動手、且要說得出理由的編輯，**那就是全部的機制**。

### 建了什麼

| 檔案 | 作用 |
|---|---|
| `scripts/lint/check_sca_allowlist.py` | 跑 `npm audit --json`，扣掉逐條接受的 advisory，其餘一律紅；**先檢查到期** |
| `.sca-allowlist.json` | 接受條目：advisory / package / severity / **expires** / owner / reason / review_action，缺一不可（機器驗證） |
| `.github/workflows/security-scan.yml` | SCA job 改呼叫該 detector；`--audit-level=low` 這個**最嚴門檻不變** |

### 為什麼不加 `audit-ci` 之類的相依

它們的 allowlist **沒有原生到期機制**，而到期正是本 CH 唯一在乎的東西。
本專案已有 9 個自訂 detector，順著既有紋理寫 ~130 行，比為了一個做不到重點的功能
再拉一個供應鏈相依合理。

### ⚠️ 為什麼**不**進 `run_all.py`

`npm audit` 需要網路。把它放進本機那道快速閘，會讓 `run_all` 在離線時失敗。
**只在 CI 跑**，並在 workflow 內註明理由。

---

## Verification

**三個狀態都實測，因為一個只會變綠的閘門什麼都沒證明：**

| 狀態 | 結果 |
|---|---|
| 接受條目在期限內 | `sca-allowlist: OK (no unaccepted vulnerabilities, 1 accepted and in date)` — **exit 0** |
| **把 `expires` 改成昨天** | **exit 1**，且同時報出兩件事：接受已過期、該漏洞因此重新變成未接受 |
| 把接受條目移除 | **exit 1** — `unaccepted vulnerability: deepmerge-ts (high): GHSA-ggr8-5vv4-36mx` |

`run_all.py` **9/9**（未新增條目 —— 見上方為何不進 run_all）。

---

## Impact

### 這條接受的射程（寫在 `.sca-allowlist.json` 裡，此處摘要）

- **可達性極低**：`@prisma/config` 用它合併 **Prisma 的設定檔**，發生在 CLI / build 路徑，
  輸入是我們版控裡的自有設定 —— **不在請求路徑上，也不接受攻擊者控制的資料**。
  遞迴物件圖無法由外部構造送達。
- **非破壞性修法不存在**（三條都實測過）：
  脆弱範圍 `<8.0.0` ⇒ patch 級無效；npm `overrides` 拉到 `^8.0.1` **不生效**
  （磁碟上仍是 7.1.5，`@prisma/config` 的範圍不相容）；
  npm 唯一建議是把 prisma **降到 6.12.0**，semver-major 且推翻 **ADR-0001** 的 Prisma 7。
- **正解在上游**：等 Prisma 發出改依 `deepmerge-ts@8` 的版本。
- **到期日 2026-11-17**（3 個月）。到期時重跑 `npm ls deepmerge-ts`：
  已升級則刪除本條，否則重新評估可達性再更新 —— **不要無理由續期**。

### 對後續的約束

- 之後每一條「暫時接受」的相依漏洞都走這個檔，**且都會有一個會自己叫的到期日**
- ⚠️ 這個 detector 檢查的是「每個 finding 要嘛不存在、要嘛被有意識地接受且仍在期限內」。
  **它不檢查那個接受是否正確** —— reason 是散文，沒有機器讀它

---

## 相關

- [`.sca-allowlist.json`](../../../.sca-allowlist.json) —— 接受條目與理由
- [`.gitleaks.toml`](../../../.gitleaks.toml) —— 同一天、同一套紀律套在密鑰掃描器上（誤報，非豁免）
- `CH-038` —— W19 mockup port，本 CH 是它的 PR 被擋時產生的
