# 反模式檢查清單（PR 必通）

**Purpose**: 每個 PR merge 前必須能對下列全部回答 ✅ 或 N/A。

**Category**: Development Process / Code Review
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

---

## 使用方法

提交 PR 前逐一自檢，填 ✅（通過）/ ❌（未通過）/ N/A（不適用）。
有 ❌ 必須修正才能 merge。Reviewer 將此清單作為**強制 code review 項**。

> **這 7 條是通用核心。** AI / LLM 專案另有 4 條附加反模式 ——
> 見 `docs/rules-on-demand/llm-agent-antipatterns.md`（若你的專案是 AI 專案，bootstrap 會裝上）。  <!-- path-check: ignore -->
> 你也應該隨專案演進**加入自己領域的反模式**（每條都要有真實的踩坑證據，不要憑空想像）。

---

## AP-1：Side-Track Code Pollution（旁支代碼污染）

**症狀**：代碼存在但主流量無人呼叫；模組標「PoC」/「Experimental」但久不淘汰；
多個版本並存（`_v1` / `_v2`）。

**自我檢查**：
- 新代碼能從主入點（API / CLI / 主流程）追蹤到呼叫嗎？
- 若是 PoC，有明確的 deadline（≤ 2 phase）嗎？
- 有 `_v1` / `_v2` / `_old` / `_new` 後綴的多版本嗎？

**修補**：
- 主流量代碼必須能從進入點追蹤
- PoC 放 `experimental/` 目錄（不在主 src）
- 定期檢查無人使用的代碼，逾期刪除
- 禁止多版本並存；重命名完整後刪舊版

---

## AP-2：Cross-Directory Scattering（跨目錄散落）

**症狀**：同一範疇代碼分布超過 2 個目錄；跨目錄互不知情；重複實作。

**自我檢查**：
- 此 PR 涉及的功能集中在一個目錄嗎？
- 該功能的資料結構 / 介面是否有重複定義？
- 建新東西前，**Grep 過了嗎**？

**修補**：
- 每個範疇代碼集中於單一目錄
- 跨範疇共用邏輯放對應的 cross-cutting 目錄
- Code review 時檢查目錄裡是否混入不屬於該範疇的邏輯

---

## AP-3：Potemkin Features（結構槽位但無內容）⭐ 最重要

**症狀**：模組存在 + 接口完整，但沒有實際邏輯；命名誤導（叫 verifier 但只 save）；
死控件（無 handler）；fixture 假資料裝成真；結果不渲染；empty stub 久未補。

**自我檢查**：
- **若此功能被關掉，會發生什麼錯誤？你能明確回答嗎？**（答不出來 = Potemkin）
- 單元測試覆蓋率 ≥ 80%？
- 命名與行為一致嗎（verifier 真的在驗證？）？
- **做過 drive-through 了嗎？**（見 `.claude/rules/verification-discipline.md`）

**修補**：
- DoD：主流量 e2e 測試 + **負面測試**（關掉會壞什麼）
- Naming review：module / class / function 名稱是否與功能對齊
- **Drive-through 是這條的唯一有效偵測機制** —— 靜態檢查抓不到「有 handler 但 handler 是空的」

---

## AP-4：PoC Accumulation（PoC 堆積）

**症狀**：`experimental/` 持續累積但很少合併；PoC 結束無「合併或淘汰」決策；
新 PoC 變成永久代碼。

**自我檢查**：
- 若此 PR 是 PoC，有明確的 hypothesis（要驗證什麼）嗎？
- 有明確的 deadline（≤ 2 phase）嗎？
- PoC 結束後有決策文件（合併 / 刪除）嗎？

**修補**：
- PoC 最多 2 phase，結束時必須決定合併或刪除
- **不合併 = 刪除**；沒有「保留以備將來」
- 定期檢查 experimental 目錄

---

## AP-5：Speculative Abstraction（為未來預留的抽象）

**症狀**：為「未來可能的供應商切換 / 擴充」建抽象層，但實際只用 1 個實作；
抽象層複雜度遠超實際需求。

**自我檢查**：
- 此 PR 中的抽象有**當前真實使用案例**嗎？
- 還是「為了將來可能」預留的？
- 有沒有「等下個版本可能會用」的代碼？

**修補**：
- **YAGNI**：只支援當下確定使用的情境
- 第二個實作出現時再抽象（那時你才真的知道正確的抽象邊界）
- 禁止「為了未來預留」的抽象層

---

## AP-6：Mock vs Real Divergence（假貨與真貨分歧）

**症狀**：開發環境用 mock、主流量用 real，但兩者邏輯逐漸分歧；
bug 在 dev 不重現、prod 才出現。

**自我檢查**：
- Mock 與 real 是否透過**同一個介面 / 抽象基底**？
- CI 是否跑兩遍：mock 環境 + real 環境？
- Mock 是否簡化了關鍵 edge case（特別是錯誤處理）？
- **Mock 模式有沒有明確標示？**（見 `verification-discipline.md` §Mock 的誠實原則）

**修補**：
- Mock 與 real 共用介面
- 關鍵範疇驗收必須通過 real 環境
- Mock 不簡化關鍵 edge case
- Mock 模式必須在 runtime 可見（啟動警告 + 結果標記）

---

## AP-7：命名版本後綴遺留 / 命名與行為不符

**症狀**：檔名 / class 名 / function 名出現 `_v1` / `_v2` / `_old` / `_new` / `_legacy`；
命名與實際行為不符；重命名遺漏。

**自我檢查**：
- 此 PR 有 `_v1` / `_v2` / `_old` 等後綴嗎？
- 命名是否反映實際做的事？
- Refactor 時是否用 grep 確認全 codebase 無遺漏？
- **註解 / docstring 有沒有引用已被移除的東西？**（那是誤導人的 orphan claim）

**修補**：
- 禁止版本後綴；要重命名就完整 refactor + grep 確認
- 不留 alias / 向後相容名稱（除非有明確的 deprecation 計畫）
- 註解與 docstring 也算 code —— 引用死掉的東西就是 dead code

---

## PR Template 片段

```markdown
## Anti-Pattern Checklist

- [ ] ✅ AP-1: 不是 side-track（從主入點可追蹤）
- [ ] ✅ AP-2: 不跨目錄散落（同功能集中一處；建前 Grep 過）
- [ ] ✅ AP-3: 不是 Potemkin（有實際邏輯 + 負面測試 + drive-through）
- [ ] ✅ AP-4: 不是無計畫 PoC（有 deadline + 決策）
- [ ] ✅ AP-5: 沒有「為未來預留」抽象（真實使用案例）
- [ ] ✅ AP-6: Mock 與 real 同介面 + mock 有標示
- [ ] ✅ AP-7: 無版本後綴 + 命名一致 + 註解無 orphan claim

## 若有 ❌
請說明為何不適用或如何修正：
```

---

## 每 Phase 結束的反模式審計

在 retrospective 中記錄：

```markdown
### Phase W{NN} Anti-Pattern Audit

- AP-1 違反次數：__
- ... (AP-7)
- **總違反次數：__**

**Action Items**：
- ...
```

---

**維護責任**：Code reviewer 為 PR 自檢官；phase 結束時審計違反情況。
新增反模式的門檻：**必須有 2 次以上真實踩坑證據**，不接受憑空想像的規則。
