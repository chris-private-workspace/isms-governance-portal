# Phase W10 Progress — RM report as an immutable versioned snapshot

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## Day 0 — 2026-08-13 — Plan-vs-Repo Verify

### Today's Accomplishments

- PR #51 merged 驗證（`gh pr view 51` → `MERGED`, `d6300ce`, 06:59:39Z, `laitim2001`）
- main 同步 `6446099..d6300ce`；本機 `chore/w09-status-flip` 刪除
- 分支 `feature/W10-rm-report-snapshot` 開於 `d6300ce`
- 三-prong verify 完成，**6 條 drift finding**（其中 1 條把一個核心假設從推論變成量測）

### Drift findings

| ID | Finding | Implication |
|----|---------|-------------|
| **D1** | plan §3.0/§4 寫「EDIT `ref-code.ts` +2 前綴」，但 `ref-code.ts` **沒有前綴登記表**，而且 `:65-69` 的 docstring **明文拒絕**建一個（「Rather than invent a registry here and make it look authoritative, each repository names its own prefix and the ambiguity stays visible」）。實際前綴是各 repository 的 module 常數：`ACTN` `AGRP` `AST` `ASIN` `ASRP` `ASTM` `CTST` `CTRL` `EVID` `ISSU` `POL` `RISK` | `ref-code.ts` 改為 **UNTOUCHED**；新前綴宣告在新的 repository 檔內。→ plan §8 新增一列 |
| **D2** | plan §4 列了 **2 個** repository 檔。repo 裡兩種先例都有：`asset.repository.ts` 用 `GROUP_*`/`ASSET_*` 常數在**一個檔**處理 AssetGroup+Asset；W08 的 issue/action 是**兩個檔** | 發版是**跨兩張表的單一交易**（insert 版本 → repoint 父表）。拆兩個檔會讓其中一個伸手進另一個的表，或把交易推給 controller。→ 採 `asset.repository.ts` 先例，**一個檔**。plan §4 減 2 個 NEW 檔 |
| **D3** ⭐ | **D-circular-fk 由推論變成量測**。Prisma 7 `validate` 接受把父表自己的 `id` 當 FK 欄位之一；`migrate diff` 產出的 DDL 正確（兩條 FK 都在兩張 `CREATE TABLE` 之後才 `ALTER TABLE ADD CONSTRAINT`）；**runtime probe 四項全中**：`current_version_id IS NULL` 的報告插得進去（MATCH SIMPLE），第一版插得進去，promote 成功，**報告 2 指向報告 1 的版本被 23503 拒絕**（DETAIL 顯示它在檢查 `(current_version_id, id)` 這一對） | plan §0 的 C 方案**照設計可建**，§8 前兩列風險關閉。probe 全程在 `BEGIN`/`ROLLBACK` 內，dev DB 無殘留 |
| **D4** | 全部 migration 的 GRANT **都是表級**，無 column-level 先例。另外 `threats` / `vulnerabilities` / `org_entities` / `users` 是 `GRANT SELECT` only | `SELECT, INSERT`（無 UPDATE）是**新的組合但不是新的形狀** —— 「少給一個動詞」已有先例。C 方案不需引入新 GRANT 機制 ✅ |
| **D5** | `@@unique([a, b])` 確實產生真的唯一索引，命名 `<table>_<cols>_key`（實例：`asset_groups_id_org_entity_id_key`；probe 產出 `rm_report_versions_id_report_id_key`） | 複合 FK 需要的唯一索引由 schema 宣告即得，migration 不必手寫 ✅ |
| **D6** | policy 命名慣例是 `<table>_read` / `<table>_insert` / `<table>_update`，每張表三條（`20260812211801_issue_and_action:124-146`） | `rm_report_versions` 只建 `_read` / `_insert` **兩條**，`_update` 的缺席會在 migration 裡一眼看得出來 ✅ |

**Detector 名稱解析**：`check_entity_index.py:180` 用 `{model, table, ALIASES.get(model)}` 比對索引。
`RiskManagementReport` / `RMReportVersion` 在 `02a:40` 就是這兩個名字 → **不需要加 ALIAS**。

### Baselines（**實測，非引用** —— 全部與 W09 closeout 記錄相符）

| Gate | 實測 |
|---|---|
| api unit | **315 / 31 suites** |
| api int | **145 / 11 suites** |
| web | **10 / 1** |
| lint | **0 / 0**（api + web）|
| type-check | clean ×2 |
| build | clean ×2 |
| `run_all.py` | **7 / 7** |
| `check_entity_index` | **17 / 35** |

### Go / No-Go

範圍變動：16 個 file-list 條目中 **2 個**改變（D1 → `ref-code.ts` 轉 UNTOUCHED；
D2 → 減 1 個 repository 檔 + 1 個 spec 檔）= **~12.5%**，**≤ 20% → 繼續 Day 1**，
兩條 finding 記入 plan §8 Risks，§4 同步標註 drift ID 而**不刪除原列**。

### Remaining for Next Day

- Day 1：schema 兩張 model + migration（policy 兩條不是三條）+ 前綴常數

### Notes

- ⭐ **D3 是本次 Day 0 的全部價值**：C 方案有兩個「應該可以」的假設（Prisma 表達得出來、
  MATCH SIMPLE 讓 NULL 指標通過）。兩者都便宜到可以量，而任一為假都會讓整個方案在 Day 1 崩掉。
  ⛔ 這正是 W09 retro 說「實測而非引用」的那件事，只是這次做在假設**還沒寫進 code** 之前。
