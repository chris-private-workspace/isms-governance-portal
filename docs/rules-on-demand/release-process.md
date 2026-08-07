# Release 流程

**Purpose**: 版本策略、release checklist、環境分層、rollback、hotfix 流程。

**Category / Scope**: DevOps / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

**Trigger（什麼時候 Read）**: 要發版 / 要 hotfix / 要設定部署流程 / 要停用某個 pipeline。

> **來源標示**：環境分層、CI 階段、secret 輪替、「停用要寫明 re-enable criteria」
> 抽自來源專案的已驗證實踐。**版本策略與 release checklist 是設計提案** ——
> 來源專案在抽取時尚未實際發過版（pre-launch），請在你的專案前 2-3 次 release 後
> 依實際情況修正本檔。

---

## 版本策略

採 [Semantic Versioning](https://semver.org)：`MAJOR.MINOR.PATCH`

| 段 | 什麼時候加 | 判準 |
|---|-----------|------|
| **MAJOR** | 破壞相容 | 使用者/呼叫端**必須改東西**才能繼續運作 |
| **MINOR** | 加功能，向後相容 | 新端點 / 新選填欄位 / 新設定（有預設值）|
| **PATCH** | 修 bug，行為不變 | 修正後的行為 = 原本**應該**有的行為 |

### 什麼算 breaking（最常被誤判的）

| 變更 | Breaking? |
|------|-----------|
| 刪 / 改名 API 欄位、端點、CLI 旗標 | ✅ MAJOR |
| **加必填**欄位 / 參數 | ✅ MAJOR |
| 加**選填**欄位（有預設值）| ❌ MINOR |
| 改預設值 | ✅ MAJOR —— 沒改設定的人行為會變 |
| 縮小接受範圍（原本允許的輸入現在被拒）| ✅ MAJOR |
| 放寬接受範圍 | ❌ MINOR |
| 錯誤訊息文字改變 | ⚠️ 若有人 parse 它 → MAJOR（這就是為什麼要給 error code）|
| 效能變慢但功能相同 | ⚠️ 若超出 SLO → 當 breaking 處理 |
| **事件 / 訊息 schema 加必填欄位** | ✅ MAJOR —— 舊消費者會爆 |

**判準一句話**：**有沒有人會因為升級而壞掉，而且他什麼都沒做錯？**

### 0.x 的例外

`0.x` 階段：MINOR 可以 breaking（`0.3.0 → 0.4.0`），PATCH 不行。
但**仍然要在 release notes 明確標出 breaking**，不能因為是 0.x 就靜默。

---

## 環境分層

| 環境 | 用途 | 資料 | 誰能部署 |
|------|------|------|---------|
| **dev** | 本機開發 | 假資料 | 任何人，隨時 |
| **staging** | 上線前驗證 | production 的**去識別化**副本 | 自動（merge 到主分支即部署）|
| **production** | 真實使用者 | 真實 | **人工觸發**（見下方 checklist）|

**鐵律**：

- ❌ **production 不自動部署** —— 至少要有一個人按下按鈕並確認 checklist
- ❌ **staging 不用真實個資** —— 去識別化或合成資料
- ✅ **staging 的環境變數 / 設定盡量與 production 同構** —— 差異本身就是 bug 來源

---

## Release Checklist

> 複製這一段到 release 的 issue / PR 描述裡逐項打勾。

### Pre-flight（切版之前）

- [ ] 主分支 CI 全綠（含 `python scripts/lint/run_all.py`）
- [ ] 所有要進這一版的 PR 都已 merge（`gh pr list --state open` 確認沒有漏掉的）
- [ ] **CHANGELOG 已更新**（見下方 §CHANGELOG 慣例）
- [ ] 版號決定好了，且**理由寫得出來**（是哪個變更讓它成為 MAJOR/MINOR？）
- [ ] Breaking change 已在 CHANGELOG 標明 + 有遷移說明
- [ ] Migration（DB / 設定）已測過，且**確認可逆**（或明確標記不可逆）
- [ ] 新增 / 變更的環境變數已列出，且**部署環境已設定好**
- [ ] Staging 已部署此版本並**實際驅動過主路徑**（drive-through，不是只看 health check）

### Cut（切版）

- [ ] 開 release 分支或直接從主分支切 tag（依你的分支策略）
- [ ] `git tag -a vX.Y.Z -m "..."` —— **annotated tag，不是 lightweight**
- [ ] 產生 release notes（模板：`docs/13-deployment/_TEMPLATE-release-notes.md`）
- [ ] 推 tag：`git push origin vX.Y.Z`

### Deploy

- [ ] 部署到 production
- [ ] **確認部署的真的是這個版本**（查 build info / commit SHA，不要只看「部署成功」）
- [ ] 健康檢查通過

### Verify（⭐ 最容易被跳過的一步）

- [ ] **實際驅動主路徑**（真 UI + 真後端，見 `.claude/rules/verification-discipline.md`）
- [ ] 檢查錯誤率 / 延遲，與部署前對比
- [ ] 檢查日誌有沒有新的例外類型
- [ ] **這一版的主要新功能，實際用一次**

> 「部署成功」只證明程式跑起來了。**跟 gate 全綠一樣，它不證明能用。**

### Announce

- [ ] Release notes 發布
- [ ] 有 breaking change → 通知受影響的使用者 / 下游
- [ ] 更新對外文件（API doc / README 的版本標示）

### Post-release

- [ ] 觀察窗口（依你的流量決定，通常 1-24 小時）
- [ ] 若有異常 → 執行 rollback（見下方）
- [ ] 若一切正常 → 在 CHANGELOG 標記此版已穩定

---

## Rollback

**Rollback 計畫要在部署前就準備好，不是出事才想。**

| 項目 | 要事先確認 |
|------|-----------|
| **怎麼回** | 重新部署前一版 tag？藍綠切換？feature flag 關掉？ |
| **多快** | 從決定回滾到完成，估計多久 |
| **資料怎麼辦** | 這一版寫進去的資料，回滾後舊版讀得懂嗎？ |
| **Migration 可逆嗎** | 不可逆的 migration = **不能單純回滾**，要有補救腳本 |
| **決策門檻** | 什麼指標超過什麼值就回滾（**事先訂好**，不要在事發時辯論）|

### 不可逆 migration 的處理

若某次 migration 不可逆（刪欄位 / 改型別而丟失資訊）：

1. **拆成兩次 release**：先加新欄位並雙寫（可逆）→ 觀察穩定 → 下一版才刪舊欄位
2. 或明確標記「此版不可回滾」，並準備前滾（fix-forward）方案

---

## Hotfix 流程

生產出事，等不到下一個 phase。

**繞過 phase 流程，但不繞過紀錄。**

1. 從**production 的 tag** 開分支（不是從主分支 —— 主分支可能有未發布的變更）
   ```bash
   git checkout -b hotfix/vX.Y.Z+1 vX.Y.Z
   ```
2. 最小修正（只修這一個問題，**不順手改別的**）
3. **寫重現測試** —— 即使很趕。沒有測試的 hotfix 會再犯
4. 快速驗證 → 部署 → **drive-through 確認真的修好**
5. 切 PATCH tag 發布
6. **把修正 merge 回主分支**（否則下一版會 regress —— 這是 hotfix 最常見的失誤）
7. **事後補 FIX 紀錄**（`docs/03-implementation/bugs/`），含：
   - 為什麼現有測試沒抓到
   - 為什麼 staging 沒抓到
   - 預防措施

> 第 6 步和第 7 步在壓力下最容易被跳過，而它們正是防止同一個 hotfix 再來一次的關鍵。

---

## CHANGELOG 慣例

專案根目錄維護 `CHANGELOG.md`，採 [Keep a Changelog](https://keepachangelog.com) 格式：

```markdown
## [Unreleased]
### Added
### Changed
### Fixed

## [1.2.0] — 2026-08-15
### Added
- <使用者視角的描述>（#PR）

### Changed
- **BREAKING**: <什麼改了 + 怎麼遷移>（#PR）

### Fixed
- <修了什麼>（FIX-042, #PR）
```

**寫給使用者看，不是寫給自己看**：

```
❌ 「重構 PricingEngine，抽出 RoundingPolicy」
✅ 「修正多行訂單在訂單級折扣下的稅額計算（原本會多收）」
```

**Unreleased 區塊隨 PR 累積** —— 不要等到要發版才回頭翻 git log。

---

## 停用某個東西時，寫明「重新啟用的條件」⭐

> 這條抽自來源專案的真實實踐，很值得保留。

當你停用一個 workflow / feature flag / 排程任務時，**在原地寫下**：

1. **為什麼停** —— 具體原因，不是「暫時關掉」
2. **什麼時候會重新啟用** —— 可檢查的條件清單
3. **怎麼重新啟用** —— 具體步驟

範例（來源專案的 deploy workflow）：

```yaml
# 2026-05-04: DISABLED — workflow_dispatch only.
#
# Why disabled:
#   Chronically failing since 2026-05-03 because (a) App Service NOT yet
#   provisioned; (b) GitHub Secrets not configured; (c) blue-green slot swap
#   targets resources that don't exist. The chronic red checks created PR-view
#   noise but were never blocking.
#
# Re-enable criteria (delete this notice + restore push: trigger when ALL met):
#   1. App Service provisioned
#   2. Container registry provisioned
#   3. GitHub Secrets configured: <list>
#   4. Smoke-test stage gated against actual production URL
```

**為什麼重要**：沒有這段的話，半年後沒人知道這東西為什麼是關的、能不能開。
它會永遠是關的，或被某個人在不知情下打開然後爆炸。

---

## Secret 管理

| 層 | 存哪 | 誰能看 |
|---|------|-------|
| 本機開發 | `.env`（**gitignore**）| 開發者自己 |
| CI | CI 的 secret store | CI job |
| Production | 雲端 secret manager / vault | 部署流程 |

**鐵律**：

- ❌ **絕不 commit secret** —— 若不慎 commit：**立即輪替**，不要只是 `git rm`
  （git history 裡還在，而且可能已經被 clone）
- ✅ `.env.example` 列出所有變數名（**不含值**）
- ✅ 定期輪替（訂一個週期，寫在這裡）
- ✅ CI 加 secret scanning

---

## 相關

- `.claude/rules/verification-discipline.md` —— 部署後的 verify 不能只看 health check
- `docs/rules-on-demand/git-workflow.md` —— tag / 分支策略
- `docs/13-deployment/_TEMPLATE-release-notes.md`
- `docs/INFORMATION-FLOW.md` §情境 D
