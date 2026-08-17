# W20 — Responsive layout（全片回退）

**Phase**: W20 · **Closed**: 2026-08-18 · **PR**: 無（分支未 push） · **Status**: `closed_partial`
**權威來源**: [`W20-responsive-layout/retrospective.md`](../docs/01-planning/W20-responsive-layout/retrospective.md)
**Change record**: 無 —— 回退後沒有行為變更可記錄

---

## 一句話

Day 0 / Day 1 執行完畢、每一項 gate 全綠、drive-through 也真的做了，
**而整片被使用者裁定回退**（`6f2c712`，`apps/web` 淨產出 **0 行**）——
因為錯的不是執行，是**前提**。

---

## ⭐⭐ 核心：一個現有機制全都看不見的失敗

| 機制 | 它驗什麼 | 對本片的判定 |
|---|---|---|
| Gate（format / lint / type / test / build） | 零件對不對 | ✅ 全綠 |
| Day-0 三-prong verify | **plan 對 repo 的斷言**是否屬實 | ✅ 斷言全部屬實 |
| Drive-through | 人能不能真的用 | ✅ 做了，多寬度實測 |
| Anti-pattern 清單 | 做出來的東西有沒有壞形狀 | ✅ AP-1..AP-7 全 0 |
| **使用者** | **做的是不是該做的東西** | ❌ **三次否決** |

三-prong 驗的是「斷言」不是「目的」；AP 清單量的是「東西的形狀」不是「該不該做這個東西」。
⇒ **兩者對這種錯都是結構性沉默，不是漏網。**

否決序列：「不行」→ 換方案再否決 →「現在也只是固定的大小, **你是否先參考 mockup 的大小吧**」。
第三句點出根因：plan 從第一行就假設任務是「**發明**交付物沒有的響應式」，
使用者要的是「**參考**交付物的尺寸」。這兩句話在 plan 的每一節都長得幾乎一樣。

---

## 交付物的三個發現（本片唯一沒隨回退失效的東西）

1. **standalone HTML 跑不起 30 個畫面** —— `__dcRegistry` 只有 **1 個**項目（封面頁）。
   30 個畫面只存在於帶 `{{ }}` 模板語法的 fragment ⇒ **無法用「開起來比對」驗保真度**
2. **dashboard 已經和 mockup 一樣** —— grid 宣告與 `max-width`（兩邊皆 **0**）逐項相同
3. ⭐ **交付物自我矛盾** —— `README.md` 規格圖寫「main content, **max-width 1400px**」，
   `base.css:48` 有該規則，而 **`class="page"` 在交付物 fragment 與 `apps/web` 皆 0 次**
   ⇒ 這條規格**兩邊都從未實作**。在它被裁定之前，「和 mockup 一樣」**沒有可驗收的定義**

---

## 順帶量到的兩件事

- **約束 6 的後半句全站未達成** —— `apps/web/src` 的 `className` = **0**（靜態 grep 與執行期
  DOM 兩法一致）⇒ 逐字複製進來的 CSS class **全是死碼**。W19 全片用 inline style 實作視覺，
  結果與 mockup 一致 —— 所以不是壞了，是**約束的字面要求與實際做法不符且無人記錄**。
  而 `check_mockup_fidelity` 對此**完全盲目**（它驗 CSS 檔完整性，不驗有沒有消費者）
- **dev-only 陷阱**：`127.0.0.1:3200` 會被 Next.js 16 的 dev origin 檢查回 **403**（三個 JS chunk
  載不進來），`localhost:3200` 正常。`curl` 不帶 `Origin` 所以看起來是 200 ——
  帶 header 重跑才看到 403 ⇒ **之後的 drive-through 一律用 `localhost`**

---

## 執行品質（值得保留的部分）

- **中性化預測寫在執行之前，兩次都命中**（「3 紅 4 綠」/「1 紅」實測完全一致）
- **1.3 抓到一個會靜默消失的角色**：照 plan 隱藏 topbar 文字塊，使用者角色在 1440px 以下
  將完全不可達（使用者選單有 name + email 但**沒有角色**）⇒ 先補進下拉再隱藏
- **回退驗證比對了檔案清單，不只內容** —— `git checkout <sha> -- <path>` **不刪除**該 commit
  不存在的檔，只比內容會得到「回退完成」的假結論。四個 W20 新增檔要 `git rm`
- **三個 plan 處方在實作時被推翻，全部記錄而非默默改**（其中「搜尋框 `min(230px,100%)`」
  在數學上是 no-op —— `100%` 相對於 flex 容器）

---

## Carryover

- ⭐⭐ **ROADMAP 9b（`required_linear_history` 重審）第三次沒有著落** ——
  W17（第 9 次）· W18（第 10 次）兩次 retro 都沒記序數，W20 本要接手而自己被回退
- `AD-Mockup-Responsive-1` **重開**，且被 `AD-HandoffSelfContradiction-1` 阻擋
- `AD-CalibrationNoTimeRecord-1` **第 2 次** —— 更難堪的是 W20 的 plan §7
  **明文引用了這條當警告**，然後照樣只有 Day 1 有時間記錄
  ⇒ 「在 plan 裡寫一句提醒」對這個問題**無效**
- **本片不產生 calibration 資料點**（`greenfield-feature` 的 0.55 仍未經驗證）
