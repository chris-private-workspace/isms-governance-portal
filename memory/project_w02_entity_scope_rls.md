# W02 — Entity-scoping RLS spike（2026-08-09 closed）

**Authoritative**: `docs/01-planning/W02-entity-scope-rls-spike/retrospective.md`
**Design note**: `docs/02-architecture/design-notes/W02-entity-scope-rls.md`
**Change record**: `docs/03-implementation/changes/CH-014-w02-entity-scope-rls.md`
**ADR**: `docs/14-adr/0004-entity-scoping-enforcement.md`
**PR**: #25（MERGED `02dffef`）

---

## 這個 phase 真正的產出

不是「建了兩張表」—— 是**把 ADR-0001 的承重賭注從假設變成量測**。
ADR-0001:121-125 押注「一個 Prisma client extension 能同時滿足 guardrail 4 與 5」，
並註明**未經測試**。W02 裁決：**未觸發**（三條旁路路徑全部由 CI 機械偵測）。

## ⭐ 最重要的教訓：Day-0 的結論範圍過窄，比沒有結論更危險

Day-0 量到「不帶 `missing_ok` 的 `current_setting` 未設定時 `42704`」，
判定 **fail-closed 由 PostgreSQL 免費提供**，寫進 plan §3.2、據此**減了 0.5 hr**。

Day 2 量到那句話的邊界：

```
virgin 連線                     -> ERROR 42704       ← Day-0 量的那個
同一連線跑過一次 scoped query 後 -> 0 rows，無錯誤    ← Day-0 沒量的那個
```

`set_config(…, true)` 的**值**是 transaction-local，「這個參數存在」不是。
COMMIT 後參數仍在、值為空字串，`current_setting` 從此不 raise。
**production 的 pooled 連線從第二個請求起全部如此。**

失敗形態因此不是「query 報錯」，而是「這個 OpCo 沒有 policy」——
`multi-tenant-data.md:207-210` 指名不得發生的那一種假話。

> 通則：**對有狀態的行為（GUC / session / cache / 連線）只測第一次呼叫，
> 得到的結論只在第一次成立。** → `AD-Day0Scope-1`

## 「改了設定 ≠ 我以為的狀態達成」—— 本 phase 四次

| # | 改了什麼 | 以為 | 實際 |
|---|---|---|---|
| 1 | CH-013 拿掉 openssl | 會壞 | 只有警告，build 綠 |
| 2 | `$extends` prototype 檢查 | 不存在 | 存在（Proxy 提供）—— 假陰性 |
| 3 | `RESET app.entity_scope` | 回到「未設定」 | 回到**預設值空字串** —— 控制組從未被套用 |
| 4 | 改了 `.env.example` | `.env` 也改了 | **沒有** —— 整輪探測以 superuser 跑，十二項全綠而 RLS 全程未生效 |

第 4 次代價是真的：探測把一列 fixture 從 SG1 搬到了 HK1。
**若沒跑那一輪而直接寫 provider 加測試，測試會全綠而且證明不了任何事。**

→ 現在每個量測腳本與 `int-global-setup.js` 都**先斷言前提**（角色 `super=f bypassrls=f`）。

## 前提沒被斷言的測量，綠紅都不可採信

第二輪探測報「80 次交錯讀 → 40 次污染」，看起來像 extension 洩漏。
實際是殘留 fixture 讓 SG1 回 2 列而我斷言 `length === 1` ——
40 個「污染」全是 `want=SG1, got=[SG1,SG1]`，**沒有一次跨實體**。
加 premise check 重測 → 0 錯。

## 三次元驗證（每個宣稱會擋東西的機制都弄壞過）

| 弄壞什麼 | 結果 |
|---|---|
| RLS policy → `USING (true)` | 20 個整合測試**紅 14** → 還原 20/20 |
| 生產程式碼加真旁路 | detector FAIL，指到 `health.service.ts:43` |
| detector 自己的 pattern 中性化 | **self-test FAIL 且在掃描前就停** |

`AD-NegativeGate-1` 4/5 → **5/5**。同形狀第 3 次，所以這次改**結構**：
detector 的 self-test **不在旗標後面**，每次執行都跑。

## 其他值得記住的

- **`PrismaService` 不再 `extends PrismaClient`** —— 之前任何 injector 離未範疇化查詢
  只有一個屬性存取。新測試直接斷言那個「不存在」，否則有人加回 `extends` 不會有測試變紅
- **`EntityScope` 用未匯出的 symbol brand** —— 鐵律 3 因此是編譯錯誤而非 review 意見。
  TS 拒絕我自己第一版的 cast，那正是它在生效
- **Risk Class C 第二次**：port 3210 的進程比編譯後的 entity-scope 程式碼**舊 4 小時 10 分**，
  從未載入過 `EntityScopeModule`
- **Coverage 從 100% 掉到 39.91%**，沒有一行生產程式碼改變 —— 被排除的 int spec
  仍被 `collectCoverageFrom` 計入
- **`scope-boundaries.md:124` 的設計意圖做不到** —— 範疇化 client 的型別不能住契約層
  （葉節點不能 import generated Prisma 型別）。可行拆法：token 在 `api`、型別在 `core-model`
- **plan 裡命名的 AD 沒進 BACKLOG** —— `AD-RLS-Unverified` 關不掉，因為它從未開啟 →
  `AD-AdRegistry-1`

## Calibration

`spike` 第 1 個資料點：bottom-up 17 hr → committed 11 hr (0.65) → actual ~12.1 hr → **ratio 1.10 IN band**。
**但品質有瑕疵**：Day 0 未逐項計時（~2.0 hr 是回推），且逐項加總不含間隙成本。
KEEP 0.65，等第 2、3 個資料點。
