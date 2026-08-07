---
name: drive-through-over-paper-metrics
description: "Gate 全綠只證明零件對，curl 只證明 API 會回應；兩者都不證明人能真的用。User-facing 功能標 done 前必須實際開車。"
metadata:
  type: feedback
---

# Drive-Through 重於 Paper Metrics

> **一句話原則**：gate 全綠只證「零件對」、curl 只證「API 會回應」，
> **兩者都不證「人能真的用」**。

## 觸發事件（來源專案，2026-06）

某個 PR 一次修了主流量頁面上的 5 個問題，每一個都是教科書級的 Potemkin：

1. 「新增 session」按鈕**沒接 handler**（純視覺死控件）
2. 側邊 6 列 session 列表是 **fixture 假資料**
3. Header 的模型徽章**寫死**成某個模型名，實際跑的是另一個仍顯示假標籤
4. 每輪的角色標籤**寫死**
5. **Agent 的最終答案根本不渲染** —— 使用者送出後什麼都看不到

**關鍵在於：這五個全部通過了所有 gate**（type check 0 錯 / 761 個前端測試通過 / lint 10/10 /
設計比對 byte-identical）。Gate 全綠，頁面卻不能用。

更難堪的是：前一個 PR 的落差報告寫了「端到端跑通、~80-85% working」，
但那是用 **curl/probe** 驗的 —— 報告裡甚至**自己註明「UI 驅動未做」**，
卻仍給出讓人以為能用的百分比。

## 根因：「驗證」被偷換成三層，而只做了前兩層

| 層級 | 證明的事 | 做了沒 |
|------|---------|-------|
| **Gate 層** | 零件正確 | ✅ 做爆了 |
| **Curl/probe 層** | API 會回應 | ✅ 做了 |
| **Drive-Through 層** | **整台車能開** | ❌ **一直缺席** |

「主流量驗證原則」要求的本來就是第 3 層，但**「能驗證」被讀成「測試會過」**，
而不是「有人真的開過車」。整套流程機器（plan → checklist → gate → retrospective → calibration）
獎勵的是「過 gate」，所以所有人（包括 AI）拼命優化過 gate。

## 為什麼是系統性的，不是偶然

大量精緻的流程 artifact 製造出**進度幻覺**：calibration 算到小數點兩位、
8 點品質 gate、21 份規劃文件、一長串分析報告…… 精密度全砸在**過程指標**上。

對照組：同一時間，頁面上的按鈕是死的。

**精密與粗糙的反差，正是紙面 vs 實際的裂縫。**
專案早就警覺（文件裡反覆寫「code 85% / runtime 40%」），
但**警覺停在文件層，沒變成「打開瀏覽器開車」的動作** —— 警覺本身也成了 paper。

## 規則

**禁止**：
- ❌ gate 過了就標「verified / ~X% working」→ 沒開車一律寫「**未驗證 (gate-only)**」
- ❌ 用 curl/probe 通過當「功能能用」
- ❌ 死控件 / fixture 假資料 / 寫死標籤 / 結果不渲染
- ❌ 後端沒接就用假資料**但不標示**（要嘛標 DEMO，要嘛留白，不可假裝真）

**Drive-Through DoD**：
1. 開真 UI + 真後端 + 真服務（非 echo / 非 mock），走完主路徑
2. 逐控件確認：**可點 / 有效果 / 標籤真實 / 結果真的渲染**
3. 截圖 +「實際發生 vs 預期流程」對照記入 progress
4. 發現 Potemkin → **修到能用才算 done**
5. 不能開車的（純後端 / 純 infra）→ 報告明確標「gate-only verified」，不給能用百分比

## 補充教訓

**測試通過 ≠ 功能生效。** 有一次某個標記功能加了測試也過了，
但 drive-through 發現它**對一整類輸入完全沒生效** —— **那個「通過的測試」認證了這個跳過**。

Related: [[feedback_never_fabricate_tool_results]] · anti-patterns-checklist.md AP-3 Potemkin
