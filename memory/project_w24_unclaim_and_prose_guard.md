# W24 — 平台停止宣稱它沒有的認證，以及一個讓整行輸出隱形的 mock

**Phase**: W24 — Unclaim the platform, wire policies, guard the prose
**Period**: 2026-08-19 ~ 2026-08-20
**Branch**: `feature/W24-policies-prose-guard`
**Base**: `main` `5e517c5`
**PR**: **MERGED** (PR #91, `662d658`) 2026-08-20T06:03:23Z
**權威**: [`retrospective.md`](../docs/01-planning/W24-policies-read-path-and-prose-guard/retrospective.md) ·
[`CH-044`](../docs/03-implementation/changes/CH-044-unclaim-the-platform-and-guard-the-prose.md)

---

## 這個 phase 的一句話

把 `AD-FixtureProseBecomesForgedEvidence-1` 從一條「記得檢查」的規則，變成兩個封閉集合的機械守衛 ——
順帶發現平台在自己的登入頁上宣稱兩項它沒有的認證，而那一頁已經公開在網際網路上。

---

## ⭐ 核心發現 1：一個「移除三條認證宣稱」的任務，正確交付是移除**兩條**

plan 把 `/login` 的三條 claim 寫成同一類（都是行銷文案，都該拿掉）。逐條查之後：

| claim | 內容 | 裁決 |
|---|---|---|
| 1 | `SOC 2 Type II certified` | **假** → 換成 `Built to ISO/IEC 27001 & 27017` |
| 2 | `Tamper-evident, append-only audit trail` | ⭐ **實測為真** —— `audit-trail/chain.ts` + migration + 15 個被稽核的模型 ⇒ **不動** |
| 3 | `ISO/IEC 27001 certified` | **假** → 換成 `Entity-scoped access, enforced in the database`（ADR-0004 + RLS 24 表） |

**拿掉一句真話換來的誠實是負的。** plan 之所以把三條寫成一類，是起草時假設它們同類 —— 它們不同類。

⚠️ 附帶：**只換文字不換 affordance 等於沒修**（W22 的教訓，本片第一次預先套用）。
三個綠勾與 shell 的綠點 + 綠光暈 `--rag-g` → `--rag-n`，且**用 computed style 驗證**：
`rgb(124,135,148)`，而 `--rag-g` (`#1e8a5c`) 在那三處一次未出現。看截圖不算數。

---

## ⭐⭐ 核心發現 2（最重要）：mock 簡化掉一個轉換，使**整行輸出結構上不可觀測**

Day 3 drive-through 在 `/policies` 點第二下（套用篩選）就看到假話：

| 篩選 | 列數 | meta 行 | 畫面上真的 under review |
|---|---|---|---|
| Published | 1 | `1 policies · **1 under review**` | **0** |
| All | 8 | `8 policies · 1 under review` | 1 |

根因 `policies/page.tsx:136-139` —— `view` 是篩選後、`underReview` 從 `rows`（全集）算，
`:242` 把兩者印在同一句話裡。

**但真正值得記的是「為什麼 8 個測試全過」**：`policies.test.tsx` 的 shell mock 寫

```ts
trf: (key, vars) => { void vars; return t('zh-Hant', key); }
```

⇒ **每一個經由 `trf` 印出的數字**在該檔案裡都渲染成未插值的模板字串，
meta 行的任何數字錯誤**在測試環境裡不存在**。這不是覆蓋率問題，再寫十條測試也抓不到。
**AP-6**（mock 簡化掉關鍵行為）。修法是讓 mock 走真的 `tf()` —— 缺口才露出來，
新測試才能先紅後綠。→ `AD-MockDropsInterpolation-1`

> 通則：**凡是「簡化掉一個轉換」的 mock，先問「這個簡化讓什麼斷言變成不可能」。**

---

## 守衛的兩個設計決定（拿掉就會壞）

1. **錨定封閉集合，不枚舉文案關鍵字。** 規則 1 判定「已接 API 的表面 × 標了 `@record-claim`
   的 export 出現在**值位置**」。W23 因為枚舉開放集合漏掉 44%（`AD-NarrowPatternWideClaim-1`）。
2. ⛔ **每個型別位置的放行同時是一個洞，所以各測兩面。** `ReturnType<typeof riskSignOff>`
   是 W22 對 `/risks/[id]` 的**正確**中性化；若守衛寫成「提到就報」，它會對唯一做對的那一頁
   天天開火，一個 phase 內就被關掉。
3. **掃描面含 `components/shell/**`** —— 槓桿最高的一條不在任何 `page.tsx` 裡
   （`shell.env.meta` 渲染在 25 個畫面上），且 `AppShell.tsx:247` 自己就在呼叫 `fetch()`。
4. ⭐ **守衛第一次真實執行抓到的是它自己的缺陷**：它報的 2 個違規都是**說明該宣稱為何剛被移除**
   的註解。一條分不出「平台通過 SOC 2」與「我們刪掉了那句話」的規則，
   **會讓正確的修法變得無法記錄** ⇒ 加 `strip_comments()`，且 claim 查 stripped body、
   allowlist 查原始 source（那是測試抓到的）。

四次中性化，**每次預測寫在執行之前，四次全中**（`AD-GateGreenDecaysAfterFix-1`：
`run_all` 全綠不是證據）。

---

## Calibration —— 本專案第一次 re-point

- class `pattern-reuse-feature`（**第 12 點**）· agent-delegated `partial`
- B1 20.5 hr → committed **7.7 hr**（0.50 × 0.75）→ actual **~2.9 hr** ⇒ ratio **0.377 UNDER**
- 量法與 W18 相同 ⇒ W18 訂的「第 12 點同量法再 <0.7 則 re-point 0.45」**字面觸發** ⇒ **0.50 → 0.45**
- ⛔ **但 re-point 治標**：0.45 只把 committed 降到 6.9，ratio 仍 0.42。
  真訊號是 `actual / bottom-up`：W22 **0.26** · W23 **0.25** · W24 **0.141**
  ⇒ **該修的是估算方法，不是乘數**（`AD-BottomUpEstimateInflated-1` 第 3 點）
- ⚠️ **B1 vs B2 分辨力低，且 plan §7 事前就說了**：B2 7.6 → 0.382，calibrated B1 7.7 → 0.377，
  只差 **0.005**。正確讀法是**兩者都高估約 2.6 倍**，不是「兩種方法都對」

---

## 關閉 / 新增

**關閉 2 條**：
- `AD-FixtureProseBecomesForgedEvidence-1` —— **機械層**（checklist 模板具名格 + detector）。
  ⛔ **存量 27 頁文案不在關閉範圍**，帳在 `docs/09-analysis/fixture-prose-inventory-20260819.md`
- `AD-UndiagnosedWebTestFailure-1` —— 根因是 `vitest.config.mts` 的 `poolOptions` 配置死掉，
  修後乾淨負載 **11/11 · 104 tests · exit 0**

**新增 14 條**（detector 報 total 177→**189** / P1 96→**101** / P2 76→**83**，P0 不變 5），
領銜 `AD-MockDropsInterpolation-1`。另兩條既有 AD 補了 W24 資料點
（`AD-ScopeSelectorInertOnLiveScreens-1` · ⛔ `AD-ShaDetectorConsoleEncoding-1`
—— 後者**今天又撞到一次**，證明它不是某支 detector 的缺陷，是**任何印中文的 Python 腳本**
在此環境的預設行為）。

---

## Gate

lint **0** · format **clean ×2** · type **0** · api test **484 / 40 suites** ·
api int **269 / 21** · web **`Test Files 11` / 104 tests**（95 → +9）· build clean ·
`run_all` **10/10**（9 → 10，新增 `fixture-prose`）

⚠️ **同一份 code 在高負載下只跑 7/11 檔**（4 個 worker 啟動 timeout, exit 1），
乾淨負載 11/11 ⇒ 另開 `AD-VitestWorkerTimeoutUnderLoad-1`。
**與剛關掉的那條症狀相反**（那條是綠的假零，這條是紅的）。

---

## 檔案變更

| 範疇 | 檔案 |
|---|---|
| `ui` | `i18n/auth.{en,zh-Hant}.json` · `i18n/{en,zh-Hant}.json` · `i18n/registers.{en,zh-Hant}.json`（15 新 key）· `login/page.tsx` · `components/shell/AppShell.tsx` · **NEW** `lib/api/client.ts` · **NEW** `lib/api/policies.ts` · `lib/api/risks.ts` · `(app)/policies/page.tsx` · **NEW** `(app)/policies/policies.test.tsx` · `data/**` 8 檔（13 個 `@record-claim`，13 insertions / **0 deletions**）· `vitest.config.mts` |
| `core-model` | `apps/api/prisma/seed.ts`（8 筆 policies，owner 全 NULL —— guardrail 7） |
| tooling | **NEW** `scripts/lint/check_fixture_prose.py` · **NEW** `scripts/lint/tests/test_fixture_prose.py`（29 tests）· **NEW** `.fixture-prose.json` · `scripts/lint/run_all.py` |
| docs | **NEW** `docs/09-analysis/fixture-prose-inventory-20260819.md` · `_templates/phase/checklist.md.tpl`（§2.y 具名格） |
