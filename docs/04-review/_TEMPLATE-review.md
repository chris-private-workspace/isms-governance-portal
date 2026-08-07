# {Code|Security|Architecture} Review — {scope} — YYYY-MM-DD

**Reviewer**: {name}
**Scope**: {what was reviewed — commit range / component / whole surface}
**Method**: {手動閱讀 / 自動掃描工具 + 版本 / 兩者}

## 判定

| | |
|---|---|
| **結論** | PASS / PASS with findings / FAIL |
| **Blocking findings** | N |
| **Non-blocking** | N |

## Findings

| # | 嚴重度 | 位置 | 發現 | 建議 | Follow-up |
|---|---|---|---|---|---|
| F1 | Blocking / Major / Minor / Nit | `file:line` | | | `BUG-NNN` / `CH-NNN` / 不處理（理由）|

## 檢查過但沒問題的

<!-- 這一段的價值：下次 review 知道哪些已經看過。沒寫 = 下次要重看一遍。 -->

- {area} — {為什麼判定 OK}

## 沒檢查的（明確）

- {area} — {為什麼略過：不在 scope / 需要另外的專業 / 下次}
