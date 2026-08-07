---
name: day0-must-grep-plan-assumptions
description: "Plan 的每個對現有 code 的假設，Day 0 必須 grep 驗證。檔案存在不代表內容如你所想。實測 ROI 4-60×。"
metadata:
  type: feedback
---

# Day 0 必須 grep 驗證 plan 的假設

**規則**：Plan 起草完、寫第一行 code 之前，對 repo 做**三-prong grep 驗證**。

## 為什麼 plan 必然偏離 repo

從記憶 + 對話上下文起草的 plan **必然**會偏離真實 repo。不是因為粗心：

- Class 名字在 phase 之間被改過
- 表名 / 欄位在別的 PR 裡動過
- 測試 fixture 路徑因 conftest 重構而位移
- Service 簽名在無關的 PR 裡演化了
- **內容漂移**：檔案存在，但它的**內容**跟 plan 的宣稱不一樣

## 三-prong

| Prong | 驗證什麼 | 何時 |
|-------|---------|------|
| **1 路徑** | plan 提到的每個路徑存在/不存在是否如預期 | 永遠 |
| **2 內容** ⭐ | plan 對現有 code 的每個事實斷言，grep 該符號確認 | 永遠 |
| **2.5 子元件樹** | 前端頁面重構時深入子元件 grep | 前端 phase |
| **3 Schema** | DB 欄位級別比對 | 動 DB 時 |

**Prong 1 單獨做是不夠的。** 最有價值的發現幾乎都來自 Prong 2。

## 實測 ROI

| 情境 | 成本 | 預防的返工 | ROI |
|------|------|-----------|-----|
| 首次套用（5 個 drift）| ~55 min | ~3-4 hr | 4-8× |
| 第 2-6 次（11 個 drift）| ~75 min | ~9-10 hr + 2 個 production 級 bug | 7-8× |
| 前端子元件樹掃描 | ~5-10 min | ~3-5 hr 的範圍爆炸 | 20-60× |

**最戲劇性的一次**：Day-0 內容 grep 發現「需要完整設計 + 接線（10-12 hr）」的假設是錯的 ——
介面早就實作了、也被主流程呼叫了，只有一個屬性是死的。**範圍當場縮到「純接線 5-6 hr」。**
路徑驗證抓不到這個 —— 所有被引用的檔案都存在。

## 幽靈檔案會傳播

有一次一個**根本不存在**的測試檔 + 測試 marker，在 **3 份 plan 之間傳播** ——
plan 引用了它，下一份 plan 抄了這個引用，沒有人去 Glob 過。
直到某次 Prong-1 掃描才發現。

→ **測試基礎設施（fixture / marker / e2e spec）也要驗，不只驗產品程式碼。**

## 記錄紀律

drift finding 加到 **plan §Risks**，**不要**默默改 §Technical Spec。

默默改寫 = 銷毀「原本計畫什麼 vs 現實逼你改成什麼」的審計軌跡。
三個月後你會想知道當初的假設錯在哪。

## Go / No-Go

| 範圍變動 | 行動 |
|---------|------|
| ≤ 20% | 繼續，風險記入 §Risks |
| 20-50% | 修訂 plan，**跟使用者再確認** |
| > 50% | **中止**，用現實基線重寫 |

Related: `docs/rules-on-demand/day0-plan-verify.md`（完整程序 + drift-class 表）
