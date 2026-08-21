# W25 — OQ-7 spike：精簡狀態機的邊界

**Phase**: W25 · **Period**: 2026-08-21（單日）· **Status**: `closed` · **PR**: PR-pending
**權威來源**: `docs/01-planning/W25-oq7-workflow-spike/retrospective.md`

---

## 做了什麼

回答 OQ-7（workflow engine 自建 vs 嵌入）。**兩個候選都真的建出來**，跑同一條 Policy 生命週期
（`02a-data-model-spec.md:362-370` 的 7 條實邊），量同一組五個維度。
使用者拍板選 **候選 A（自建宣告式轉換表）** → **ADR-0002 已採納**，候選 B 與 `xstate` 相依**已刪**。

順帶建出**本 repo 第一條 domain update 路徑**（`PATCH /policies/:id/status`）——
在此之前整棵產品樹零個 `client.*.update`。

---

## ⭐ 五個值得記住的東西

### 1. `wc -l` 量到的是註解密度，不是實作

plan §3.4 **指定**用 `wc -l` 量「定義行數」。照做得到 191 vs 105 ⇒「B 少 45%」。
非註解行是 46 vs 32；**再扣掉候選 B 向候選 A 借的 15 行**（`IllegalTransitionError` 14 行 +
`POLICY_STATUSES` 1 行）⇒ **46 vs ≈47，打平**。
⇒ 代理指標這次是**被 plan 指定的**，起草時就該擋 → `AD-ProxyMetricInPlanItself-1`。

### 2. 唯一分出高下的維度：schema↔實作的型別綁定

| 實驗 | 候選 A | 候選 B |
|---|---|---|
| 刪掉 `retired` 狀態 | **type-check FAIL** | **type-check PASS（完全沉默）** |
| 加一個 enum 沒有的狀態 | FAIL | FAIL，**但擋下它的是我手寫的 `PolicyEvent`，不是 XState** |

⇒ 改用慣用的業務動詞命名事件（`SUBMIT`/`APPROVE`），那個連結**完全消失**。

### 3. 替換實驗：把論述變成量測

候選 B 的 assert **同簽名、同錯誤類別** ⇒ 把 controller 的 import 換過去跑完整套件
（unit **512/42** + int **280/22** 全綠，只改一行）。
⇒ 兩個副產品：**接合成本 = 0 額外接線**（量到的），**ADR-0002 的 rollback 成本 < 1 天**（走過的）。

### 4. `updateMany` 會 commit 出一筆假稽核列

`runScoped` 一次呼叫 = 一個 `$transaction`，稽核 entry 在寫入**之前**就進去且讀不到結果。
⇒ `updateMany` 匹配不到時回 `{count:0}` 而交易**照樣 COMMIT** ⇒ 留下一筆「宣稱轉換發生了」的列。
`update` 會拋 → 回滾 → 稽核列一起消失。

同理：`expected` 必須在 `where` 裡（compare-and-set），不能在上面的 `if` 裡 ——
read-then-write 跨兩個交易，中間有 TOCTOU 窗。測試因此**斷言位置而非結果**。

### 5. 「單獨跑綠」不是套件綠的證據

新 int 套件單獨跑 **11/11 綠**，完整跑弄紅**別人的 3 條**（留下 10 筆存活 row，
而那三條斷言整份清單）。⛔ **這個坑逐字寫在 `jest.int.config.js:51-55`，W03 踩過。**
⇒ 中間那個 11/11 是**真的**，所以它不會被當成錯誤陳述 —— 它會被當成好消息。

---

## 三條稽核的結構性限制（釘成測試，不是寫進文件）

| | 內容 | 去向 |
|---|---|---|
| `before` 恆 SQL NULL | `audit.recorder.ts:153` —— `runScoped` 交給 `$transaction` 的是未啟動的 promise | ADR-0003 輸入 |
| create 與 update 的 `resource_id` 不同 | `:252` `where.id ?? data.id ?? data.refCode` ⇒ create 記 refCode、update 記 UUID ⇒ **單一 key 取不到完整歷史** | ADR-0003 輸入 |
| 滾升 scope **不能轉換** | `:229-244` payload 無 `orgEntityId` 且多實體 ⇒ 拒絕。**第一個 update 才讓這條分支可達** | 釘成測試 |

`actorId` 亦恆 NULL（M4 未建）⇒ **「誰核准了這份政策」今天記不下來**，而那是 approval flow 的核心欄位。

---

## Calibration

- `spike` 0.65，**第 7 個**資料點 · bottom-up **20.5** → committed **13.3** → actual **≈2.64 hr**
- ratio **0.199 UNDER**；⛔ **plan §7 登記的預測（2.9–5.3 hr / 0.22–0.40）往下沒中**
- `actual/bottom-up` = **0.129**，接上 W22 0.26 · W23 0.25 · W24 0.141
  ⇒ **四點單調下降、跨四個 class** ⇒ `AD-BottomUpEstimateInflated-1` 升為**已驗證**
- **KEEP 0.65** —— 乘數在追一個被污染的分子，該換的是分子的產生方式

---

## Drive-through

九步全中。`POL-SG1-000002` 由 draft 推到 published，列表徽章跟著變；兩次非法轉換各 **422** 且列出 `allowed`。
真 dev DB：**恰好 3 筆 `Policy.update`**，兩次 422 **零筆**；
`prev_hash` 逐列等於前一列 `row_hash`（4 筆全 `chained = t`）
⇒ **本 repo 第一次在 update 路徑上驗證防篡改鏈**。

⭐ 額外做了一個不在清單裡的檢查：標題列的「1 under review」是算的還是寫死的？
**製造變化**（再推一筆到 in_review）⇒ 變成「2 under review」⇒ 導出的。

⛔ **射程**：`/policies` 上**沒有控件會呼叫轉換端點** ⇒ **使用者今天無法從介面推進狀態**
（plan §3.x 排除建控件）→ `AD-PolicyTransitionNoUiEntry-1`。

---

## 我這一片犯的錯（都由工具而非推理抓到）

1. Day 0 把狀態圖的 **7** 條實邊數成 8（把兩個 pseudostate 算進去）—— 第 7 個手寫計數器出錯
2. `D-audit-on-transition` 第一次交的是**讀 code**，而那格 DoD 白紙黑字寫「實測，不採信推論」——
   回頭補做才挖出 D6-D9
3. 整合測試預期寫成 `policy.update`，實際是 `Policy.update`（Prisma **model** 名）
4. 新套件留下 10 筆 row 弄紅別人三條（見上）
5. 在**截圖**上把 50% 透明的藍看成可用的藍，誤判 `New policy` 為死控件 ——
   查 DOM 推翻自己。**截圖不能用來推論 disabled 狀態**
6. E1 的**原**預測錯了（預測「打平各 2 行」，實際兩邊都 type-check 失敗）——
   修正後的預測在執行前另記，**原預測保留不刪**
7. 在 retro 裡把還沒做的 closeout 項目先勾成 `[x]` —— 當場發現並立刻補做

---

## 關掉的 / 產生的

**關掉**：OQ-7 ✅ · D004 重新評估完成（維持 defer，**解封條件改寫** —— 原條件「撐不住 M5 負載」不可證偽）
· `AD-BottomUpEstimateInflated-1` 升為已驗證 · **`AD-50` 修掉**（CLAUDE.md 兩處把 0007 列為已採納且未提 0015，連兩次 closeout 沒抓到）

**產生**：9 條 AD（§Open 197 → **206**）· **OQ-9**（per-OpCo 簽核流程 —— 未驗且會推翻 ADR-0002，
已指名 stakeholder）
