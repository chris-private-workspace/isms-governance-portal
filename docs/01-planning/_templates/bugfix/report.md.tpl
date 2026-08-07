---
status: triaged   # triaged | investigating | fixing | verifying | done | wont-fix —— 機器可讀的唯一權威
affects_components: []   # 影響哪些 component（見 docs/02-architecture/COMPONENT_CATALOG.md）
---

# BUG-NNN — <Bug 簡短描述>

> **用於**：bug 修復。位置 `docs/03-implementation/bugs/BUG-NNN-<slug>/report.md`
> 編號單調遞增 —— 建立前先查：`ls docs/03-implementation/bugs/ | sort -V | tail -1`
>
> ⚠️ **這份模板有兩個問題是其他 bug 紀錄不會問的**（§為什麼沒被抓到 / §預防措施）。
> 不回答它們，同一類 bug 會反覆出現。
>
> **這是「完整形式」**（Sev1/Sev2、或調查跨天）。Sev3/Sev4 當天收得掉的，
> 改用單檔 1-page：`../record.md.tpl`。判準見 `docs/01-planning/PROCESS.md` §4.3。
> 兩者的骨幹相同（Problem / Root Cause / Solution / Verification / Impact），
> 差別只在這份多了逐步驟的調查欄位。
>
> 複製時刪掉這個 blockquote，**但保留最上面的 frontmatter** ——
> `status:` 是這個 BUG 死活的唯一權威（PROCESS R9），
> `python scripts/lint/check_status_markers.py` 會檢查。
> 下面那行 `**Status**` 是給人看的軌跡，粗粒度必須與 frontmatter 一致。

**Date**: YYYY-MM-DD
**Phase**: W{NN}（或 `無 phase —— hotfix`）
**Severity**: 🔴 高（資料錯誤 / 阻擋使用）/ 🟡 中 / 🟢 低
**Scope**: <受影響的範疇 / 模組>
**Status**: ✅ 已修復 / 🔄 進行中 / ⏳ 待處理
**PR**: #N

---

## Problem

### 症狀

<使用者或系統觀察到的現象。**從外部視角描述**，不是從程式碼視角。>

### 重現步驟

1. <步驟>
2. <步驟>
3. 觀察到 <問題現象>

**重現率**: 100% / 間歇（<條件>）/ 只在 <特定環境>

### 預期 vs 實際

| | 行為 |
|---|------|
| **預期** | <應該發生什麼> |
| **實際** | <實際發生什麼> |

### 影響

- **使用者影響**: <誰受影響、影響多大>
- **資料影響**: <有沒有產生錯誤資料？需要修補嗎？>
- **範圍**: <多少 % 的請求 / 哪些功能路徑>

---

## Root Cause

### 根因

<為什麼會發生。**寫根因不是表象。**>

```
❌ 表象：「金額算錯了」
✅ 根因：「稅在折扣解析之前就算了，因為 price() 的階段順序照著 spec §3 的
         段落順序寫，而 §4 才定義了正確的先後」
```

### 問題程式碼

```<lang>
# <file>:<line>
<問題程式碼片段>
```

### ⭐ 為什麼現有測試沒抓到？

<**這一節常常比 bug 本身更有價值** —— 它指向測試策略的漏洞。>

常見答案：
- 測試只餵了自己設計的理想輸入，沒涵蓋真實輸入分佈
- 測試測的是實作（mock 呼叫次數）而非行為
- 這條路徑根本沒有測試
- 有測試但它斷言錯了（測試本身有 bug）
- 只有 gate 層驗證，沒有 drive-through

---

## Solution

### 解決方法

<採用的修復方式；若有多個方案，說明為何選這個。>

### 修改檔案

| 檔案 | 類型 | 說明 |
|------|------|------|
| `<path>:<line>` | 修改 / 新增 / 刪除 | <說明> |

### 修復後程式碼

```<lang>
# <file>:<line>
<修復後片段>
```

---

## Verification

### 重現測試（先寫會失敗的測試，再修）

- `<test name>` — <測什麼>；**修復前 FAIL / 修復後 PASS**

### 回歸測試

- [ ] 既有測試全通過（<N> passed）
- [ ] 相鄰功能未受影響
- [ ] <特定的回歸風險點>

### 驗證指令

```bash
<可重現的指令>
```

### Drive-through（user-facing 時 MANDATORY）

<實際操作步驟 + 觀察到的結果 + 截圖路徑>

**Verdict**: ✅ PASS / ⚪ N/A（純後端 —— 本 FIX 為 **gate-only verified**）

> ⚠️ 沒開車就不要寫「verified」。

---

## Impact

- **Breaking change**: yes / no
- **Migration**: yes / no（yes 則寫編號 + 是否可逆）
- **Config**: <新增 / 變更的環境變數 + 預設值>
- **重啟需求**: <startup-only 的 wiring 要特別標>
- **Rollback**: <怎麼回滾 + 估時>

---

## ⭐ 預防措施

<沒有這一節，這份紀錄只是修好了一次。>

### 短期

- [ ] <立即可做的：加測試 / 加斷言 / 加日誌>

### 長期

- [ ] <結構性的：加 lint detector / 改測試策略 / 改流程規則 / 重構掉這類 bug 的可能性>

**若根因指向流程漏洞** → 記一條 AD 到 `docs/01-planning/BACKLOG.md`：
`AD-<Topic>-<N>`

---

## 相關

- **同類 bug**: <之前的 FIX-XXX；若這是第 2 次以上，在預防措施要寫結構性解法>
- **相關設計文件**: <design note / 核心設計文件的段落>
- **PR**: #N
