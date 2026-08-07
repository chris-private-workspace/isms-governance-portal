# Design System

**Purpose**: 前端設計系統的 dev API reference + **drift incident log** + **維護排程**。
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **前置**：本檔假設你已讀過
> [`../06-reference/mockup-to-production-frontend-playbook.md`](../06-reference/mockup-to-production-frontend-playbook.md)。
> 沒有 mockup 的專案可以刪掉本檔（記得同時清掉指向它的連結）。

> **為什麼要有這一份**：開發者**查文件**，不去 `styles.css` 重新推導。
> **每次重新推導 = 再 drift 一次。**

---

## 0. Quick reference

| | |
|---|---|
| Canonical CSS（Layer 1）| `{mockup 路徑}/styles.css` |
| 生產採用（Layer 2）| `{frontend 路徑}/styles-mockup.css` |
| Token 橋接（Layer 3）| `{frontend 路徑}/globals.css` |
| 型別鏡像（Layer 4）| `{frontend 路徑}/theming/tokens.ts` |
| 色彩空間 | {oklch / …} —— **不做轉換** |
| Lint | `python scripts/lint/check_mockup_fidelity.py` |
| 路由 ↔ mockup 頁對照 | `_TEMPLATE-page-inventory.md` → 你的 `page-inventory.md` |

---

## 1. Token reference

> ⚠️ **不是只有色彩。** 只記色彩會讓人以為「所有 token 都會傳到 Layer 3/4」——
> 實際上**只有色彩 token 會**。其餘 token 只活在 Layer 1→2，
> 在 Layer 3/4 找不到它們**是正確的**，不是遺漏。

| Token 類 | 例 | 傳到 Layer 3/4？ |
|---|---|---|
| **色彩（亮）** | `--background` / `--accent` | ✅ |
| **色彩（暗）** | `.dark` 覆寫 | ✅ |
| Radius | `--radius-sm/md/lg` | ❌ 只在 Layer 1→2 |
| Shadow | `--shadow-1/2` | ❌ |
| Font | family / size / weight / feature-settings | ❌ |
| Density | 行高 / 控件高度 | ❌ |
| Layout var | sidebar 寬 / topbar 高 / 內容最大寬 | ❌ |
| Animation | duration / easing | ❌ |

> **色彩 token 也有兩個家** —— 被 utility 消費的 palette token 走 Layer 3/4；
> 只被 mockup class 用到的 status token 留在 Layer 1→2 而**不進** Layer 3/4。
> 加新 token 前先確認它屬於哪一類（見 playbook §4.2 的例外說明）。

### 1.1 色彩語意

| Token | 語意 | 亮 | 暗 |
|---|---|---|---|
| `--accent` | | | |

---

## 2. Primitive index

| Class | 用途 | 變體 | 備註 |
|---|---|---|---|
| `.btn` | | `.btn-icon` / `.btn-primary` | |
| `.card` | | | |

## 3. Layout patterns

| Pattern | Class 組合 | 用在哪 |
|---|---|---|
| | | |

## 4. Composite patterns ⭐

> **這一節是本檔最高價值的部分。** Primitive 在 `styles.css` 裡一 grep 就有；
> **composite pattern 才是會被重新推導、而且推導錯的東西** ——
> 它由多個 primitive + 定位邏輯 + 互動狀態組成，而那個組合方式只存在於 mockup 的 JSX 裡。
>
> 每個 composite 都要寫 **anti-pattern 那一行**（「不要用 X 取代它」），
> 因為最常見的 drift 就是「拿 component library 的相近 primitive 頂替」。

每個 pattern 一節，格式：

```markdown
### 4.N <Pattern 名>

**用在**：<哪些頁 / 哪些位置>
**組成**：<primitive 組合 + 關鍵 class>
**關鍵行為**：<定位 / 觸發 / 鍵盤 / 焦點>
**mockup 來源**：`page-<name>.jsx:<line>`
**⛔ Anti-pattern**：<不要用什麼取代它，為什麼>
```

常見需要被記錄的 composite（依你的專案取捨）：

| 類型 | 為什麼容易 drift |
|---|---|
| **視窗錨定的 popover / menu** | 相近的 library primitive 用不同的定位策略，rich content 會被 thin default 吃掉 |
| **Wizard stepper** | 圓圈尺寸 / 連接線 / 完成態，逐項湊必錯 |
| **Toggle row**（標題 + 說明 + 徽章 + 警告） | 多個 primitive 的組合間距 |
| **Disabled affordance**（範疇邊界的「看得到但不可用」） | 直接刪掉元素 = 破壞邊界的可見性（見 playbook §9） |
| **Modal / overlay** | 焦點管理與視覺分屬不同層 |
| **空 / 錯誤 / 無權限狀態** | 最常被漏，也最少截圖 |

## 5. Interaction states

| 狀態 | 慣例 |
|---|---|
| hover / focus / active / disabled / loading / empty / error | |

---

## 6. Drift incident log

**每次 drift 修復在此加一行**（與修復同一個 commit）。

| 日期 | Drift 內容 | 哪邊對 | 修復 commit |
|---|---|---|---|
| YYYY-MM-DD | | mockup / 生產 | `{sha}` |

> 這張表的用途不是問責，是**看出 pattern**：
> 同一類 drift 出現第三次，代表 sync protocol 有個步驟不夠機械化。
>
> **文件本身錯了也要記一行。** 真實案例：某專案「預期差異」清單只列了 2 項，
> 實測是 79 行 —— 那次修的是文件，不是 CSS，但它同樣是一次 drift。

---

## 7. Sync protocol

完整程序見 playbook §4.2。摘要：
**Layer 1 改 → 整檔 re-copy 到 Layer 2 → 色彩 token 變了才動 Layer 3/4 → 跑 lint → 測暗色模式。**

⚠️ **絕不直接編輯 Layer 2。**

### 7.1 預期差異（**必須帶量測日期**）

`diff <Layer 1> <Layer 2>` 應該只剩下列項目。**其餘任何差異 = drift。**

| 預期差異 | 為什麼合法 |
|---|---|
| 頂部 utility directive | 生產端才需要 |
| 行尾 CRLF / LF | checkout 差異 |
| {你的專案刻意剔走的區塊} | {為什麼；由哪一層擁有} |

**最後量測**：`YYYY-MM-DD` · 實測差異 `N` 行 · 執行者 `{誰}`

> ⚠️ **這張表是衍生資料，會 stale。** 每次量測完回頭更新它 + 換日期。
> **沒有日期的預期差異清單不可信** —— 它可能是三個 phase 之前的實況。
> 對應的機械聲明寫進 `.mockup-fidelity.json` 的 `ignore_diff_patterns`
> （**不要**只把 `allowed_header_diff_lines` 調大 —— 那等於靜靜容許同樣行數的真 drift）。

---

## 8. Maintenance checklist

> 沒有排程的 drift 偵測 = 沒有 drift 偵測。**這一節要有 owner 和日期，否則刪掉它比較誠實。**

**Cadence**: 每 {3} 個月
**Next due**: `YYYY-MM-DD`
**Owner**: {姓名 / 角色}
**提醒機制**: {行事曆 / 排程工具 / 「第一個跨過到期日的 phase 在收尾自查加一項」}

若同一季內有重大發版 → **提前**跑，不要順延。

**Checklist**：

- [ ] 跑 §7 的 `diff`；任何非「預期差異」的行都要查
- [ ] **回頭更新 §7.1 的預期差異表 + 量測日期**（這一步最常被略過）
- [ ] 跑 `python scripts/lint/check_mockup_fidelity.py` → exit 0
- [ ] 寫死色值掃描 → 0 命中
- [ ] type check / lint → exit 0
- [ ] 開 mockup 與生產，隨機點 5 條路由並排比對；切暗色模式再比一次
- [ ] §6 drift incident log 補上這一季的修復
- [ ] 更新本節 **Next due** 往後推一個 cadence

---

## 相關

- [`../06-reference/mockup-to-production-frontend-playbook.md`](../06-reference/mockup-to-production-frontend-playbook.md) — 方法論全文
- [`../rules-on-demand/mockup-fidelity.md`](../rules-on-demand/mockup-fidelity.md) — 紅線與 DoD
- [`./COMPONENT_CATALOG.md`](./COMPONENT_CATALOG.md) — component 清單（本設計系統服務哪些 component）
