---
name: check-existing-before-building
description: "建任何新東西之前先 Grep。假設某個東西不存在就直接新建，是重複實作的頭號來源。"
metadata:
  type: feedback
---

# 建之前先查

**規則**：建立任何新的 service / helper / util / 型別 / 抽象之前，**先 Grep**。

## 為什麼

「假設某個東西不存在，就直接新建了一個」是**跨目錄散落**與**重複實作**的頭號來源。

這在 AI 輔助開發下特別容易發生，因為：

- AI 不會自動知道 repo 裡已經有什麼
- 從對話上下文推斷出來的「應該沒有」很容易是錯的
- 新建一個檔案的阻力比找到既有的更低

**後果**：兩份幾乎一樣的 retry 邏輯 / 三個地方各自定義同一個 enum /
兩套做同一件事但行為微妙不同的 helper。它們在建立當下看起來一樣，
但會**分歧**，而分歧的那天 bug 會出現在邊界上，極難 debug。

## 權威排序（查的順序）

1. **設計權威文件** —— `docs/02-architecture/`
2. **當前 phase plan / checklist** —— 當前迭代的決定
3. **既有程式碼** —— **先 Grep，不要假設**

## 具體做法

```bash
# 1. 這個概念是否已經存在？
grep -rn "class .*<ConceptName>\|def .*<concept_name>" <src_root>

# 2. 這個功能是否已經有人做了？
grep -rn "<關鍵動詞>" <src_root>

# 3. 這個型別是否已經在契約層定義了？
ls <contracts_dir>/
```

找到既有的 → **用它 / 擴充它**。沒找到才建新的。

## 相關的禁止反模式

- ❌ **「某某框架已經有 X，用它的」** —— 若該框架已被淘汰 / 封存，
  翻它的原始碼找實作是浪費時間。先確認它在**當前架構**裡的地位
- ❌ **「為了未來可能用到」建抽象層** —— YAGNI。
  第二個實作出現時再抽象，**那時你才真的知道正確的抽象邊界**
- ❌ **「先寫一批新規劃文件再實作」** —— 見 [[feedback_doc_growth_follows_runtime]]

## 這也是 Day-0 Prong 2 的一部分

Day-0 的內容驗證本質上就是這條規則的制度化版本 ——
把「先查再建」從**個人習慣**變成**流程關卡**。

Related: [[feedback_day0_must_grep_plan_assumptions]] · `docs/rules-on-demand/scope-boundaries.md`
