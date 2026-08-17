# Mockup Fidelity — 觸發式規則

**Purpose**: 前端頁面開發時的保真度紀律。**方法論本體在 playbook，本檔只給紅線與 DoD。**
**Category**: Frontend / Design Fidelity
**Status**: Active
**Trigger**: 前端頁面開發 / mockup port / 改設計系統 / 改 `styles-mockup.css` / 新增視覺 primitive

> **方法論全文（含 4-layer sync protocol、遷移 checklist、anti-pattern 目錄）**：
> [`docs/06-reference/mockup-to-production-frontend-playbook.md`](../06-reference/mockup-to-production-frontend-playbook.md)
> —— **寫第一頁之前先讀那份。** 本檔不重複它的內容。

> **Modification History**
> - 2026-08-07: Initial creation

---

## 唯一視覺真相來源

| 來源 | 角色 |
|------|------|
| `<mockup 目錄>/styles.css` | ⭐ **canonical** —— 設計師唯一改這裡 |
| `<mockup 目錄>/page-*.jsx` | 組件邏輯層原型 —— **重寫**（不是複製） |
| `<frontend>/styles-mockup.css` | Layer 2 —— canonical 的 **byte-identical 複製**（`diff` 必須只剩已知差異）|

**mockup 是兩層，處理方式相反**：CSS **複製**，邏輯 **重寫**。混淆這兩層是所有 drift 的根因。

---

## 7 條紅線

1. ❌ **翻譯 CSS** —— 讀 mockup 樣式再手工拼成 utility class
2. ❌ **色彩空間轉換** —— `oklch → HSL` 之類，跨色彩空間無法用眼湊準
3. ❌ **直接編輯 Layer 2**（`styles-mockup.css`）—— 它不是 source of truth，下次 re-sync 會被覆蓋
4. ❌ **用 component library 預設值取代 mockup 樣式** —— primitive 只作 a11y 外殼，不作樣式替代層
5. ❌ **以「production 簡化版」名義裁剪 mockup widget / 改 layout**
6. ❌ **後端沒有就刪 widget** —— 後端權威只管資料契約，不管視覺元素存不存在。
   照 mockup 渲染，資料用 fixture 但**必須標示 DEMO**（未標示的 fixture = Potemkin）
7. ❌ **在組件裡寫死色值** —— 一律 `var(--token)`
   （⚠️ **本專案不是 `oklch(var(--token))`** —— 交付物 token 是 HEX（`styles/tokens.css:24`
   `--primary: #2A5BD7`），包一層 `oklch()` 會產生**無效 CSS 且靜默失效**。
   W19 實測：同一句錯誤建議還藏在 `check_mockup_fidelity.py` 的違規訊息裡。關閉 `AD-CssToken-1`）

---

## 🛡️ 衍生文件不是真相來源（AuditDocSync）

當某份**稽核衍生文件**（drift audit report / parity verdict / 盤點表）聲明元件 X
有屬性 Y，而 mockup 來源檔顯示的是 Z：

> **mockup 檔贏。更新那份稽核文件去對齊 mockup，不是反過來。**

**為什麼需要明文規定這件事**：稽核文件是**衍生資料** —— 由人看著 mockup 截圖 + 讀頁面
**手抄**出來的。一旦某次稽核把「tab 順序是 A/B/C/D」寫進報告，後續每一個 phase 都引用
**那份報告**，不再回去看 mockup。**手抄錯誤會一路往前傳，而且沒有人會挑戰它** ——
因為每個人看到的都是同一份衍生文件。

真實案例：某份稽核報告把 4 個 tab 的名稱抄錯，該錯誤**連續傳播 23 個 phase 沒被發現**，
直到有人真的去 grep mockup 原始檔。期間每一次「production 與稽核文件對齊」的檢查都是綠的 ——
**對齊了一份錯的東西**。

**Day-0 強制步驟**（drift audit / re-point phase 的 Prong 2 必含）：

1. **直接讀 mockup 來源檔**，不要只讀稽核文件
2. **把稽核文件的聲明拿去 grep 來源檔**對照
3. 有出入 → **稽核文件是錯的**：更新它、加 inline note 註明何時發現、
   回頭查這個手抄錯誤是哪一次引入的（同一份文件裡通常不只一處）

```bash
# 例：稽核文件聲明 tabs = "Run/Tools/Memory/Verify"
grep -n -i "tab" <mockup 目錄>/page-<name>.jsx
# 實際顯示 "Turn/Trace/Memory/Tree" → 稽核文件手抄錯誤
```

**更新協定**：加 inline note（`<!-- Day-0 Prong 2: 第 N 列的聲明是手抄錯誤；mockup 實為 X -->`）
→ 若 mockup 與 production 其實一致，把 verdict 從 NEAR-PARITY / FAIL 改回 PARITY
→ 完整根因寫進該 phase 的 retrospective → 若像是整份稽核語料的系統性問題，記一條 AD。

> 這條規則的重量隨時間增加：**衍生文件只會越來越多**（每次 drift audit 都產生新的一份），
> 手抄錯誤累積的機率每個 phase 都在升高。只檢查「production vs 稽核文件」**永遠不夠** ——
> 必須打通到 mockup 來源檔。

---

## DoD（每個前端頁面 task）

1. `diff <mockup>/styles.css <frontend>/styles-mockup.css` → **只剩已知的 directive 差異**
2. `python scripts/lint/check_mockup_fidelity.py` → exit 0（`run_all.py` 已包含）
3. **代碼層並排比對**：mockup `page-*.jsx` vs 生產 `page.tsx`，逐行確認
   class 名 / inline style / 結構 / 互動行為一致
4. 真瀏覽器截圖 mockup vs production（同一 viewport），**computed-style 量測**代表元素
   —— 擷取方法（static serve、不要 `file://`、hash-nav sweep、量測什麼）見 playbook §7.3
5. drift 分類 + parity verdict 記入 `progress.md`
6. **fundamental drift（多項形狀不對）→ 先換方法再重建**，不用會 drift 的方法 redo

> ⚠️ **第 1-2 項是機制守衛，不 measure 視覺**。真正的保真度 gate 是第 3-4 項。
> 曾有 4 處 fundamental drift **通過全部自動化 gate** 出貨。

---

## 新增 / 修改 primitive 時

1. 改 Layer 1 canonical → 2. 整檔 re-copy 到 Layer 2 → 3. **色彩** token 變了才動 Layer 3/4
4. 在 `docs/02-architecture/design-system.md` 的 primitive index 加一行
   （若是 **composite pattern** → 加在 §Composite patterns，**並寫上它的 anti-pattern 那一行**）
5. 若這是 **drift 修復** → 同一個 commit 內在該檔的 drift incident log 加一行

⚠️ **第 2 步的「整檔 re-copy」有已聲明的例外** —— 當 Layer 3 已擁有某批 token 時，
Layer 2 會刻意不帶它們，整檔 copy 會把那個刻意的差異抹掉。
差異要逐條聲明進 `.mockup-fidelity.json` 的 `ignore_diff_patterns`，
**不要只把 `allowed_header_diff_lines` 調大**（那等於靜靜容許同樣行數的真 drift）。
完整說明見 playbook §4.2。

## 每條路由的 parity 帳本

移植橫跨多個 phase 時，用 `docs/02-architecture/page-inventory.md`  <!-- path-check: ignore — 由 _TEMPLATE-page-inventory.md 複製後才存在 -->
（模板 `_TEMPLATE-page-inventory.md`）記每條路由的 parity 狀態。
**⚠️ translated 標記的頁面不要 patch** —— 換方法後一次性重建（playbook §7.2）。
