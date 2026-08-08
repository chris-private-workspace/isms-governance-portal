# W01 — Monorepo scaffold（2026-08-08 closed_partial）

**Authoritative**: `docs/01-planning/W01-monorepo-scaffold/retrospective.md`
**Design note**: `docs/02-architecture/design-notes/W01-monorepo-scaffold.md`
**Change record**: `docs/03-implementation/changes/CH-011-w01-monorepo-scaffold.md`
**PR**: #18

---

## 這個 phase 真正的產出

不是「建了一個 monorepo」—— 是**把八個一直在回報 SUCCESS 的休眠 gate 變成真的會叫**。
交付前 `ci.yml` 五步與 `security-scan.yml` 四個 job 全綠，而它們什麼都沒檢查。

## ⭐ 最重要的教訓：「綠燈但什麼都沒做」在一個 phase 內出現 5 次

| # | 什麼是綠的 | 實際上 |
|---|---|---|
| 1 | `npm run lint` | boundaries 規則零強制力（**六種**設定失效方式，全部表現為綠）|
| 2 | `security-scan` 四 job success | 三個掃了 0 個目標（`<…>` 佔位符 / glob 不匹配）|
| 3 | `npm run build` 成功 | 產物 require 不到 Prisma client，起不來 |
| 4 | helmet `xPoweredBy:false` | `X-Powered-By: Express` 照樣回（對 Express 無效，要對 adapter `disable`）|
| 5 | CI Tests 步驟 success | 跑 `test` 不是 `test:cov` → 覆蓋率 45% 一路綠到 Day 3 |

**共同結構**：全是「**設定型**強制力」。你寫一段設定宣告某件事該被檢查；
設定損壞時**它不會報錯，它會安靜地什麼都不做**，而外層 EXIT=0 讀起來像通過。

→ `AD-NegativeGate-1`（🔴 P0 候選）：每個宣稱會擋住某件事的機制，
必須附一個**常駐的、CI 會跑的**負面案例。W01 只做了一次性手動驗證。

## 其他值得記住的

- **跑著的 API 比自己的 `dist` 舊 11m52s** —— 用 mtime 比對抓到，不是看 port 擁有者 PID。
  若直接對它 drive-through，驗到的是舊 code 而畫面不會告訴你（Risk Class C 實例）
- **修好了要用「失敗形狀改變」證明** —— `npm run start` 修正後仍失敗，
  但從 `Cannot find module` 變成 `EADDRINUSE`，那個變化才是證據
- **i18n 缺 key 型別檢查抓不到** —— `TranslationKey` 只從 `zh-Hant` 推導，
  其他語系是 `Record<string,string>`。parity 測試是唯一閂門
- **不可行動的 finding 要修掃描範圍，不是加豁免** —— semgrep 掃到設計交付物的
  vendored bundle（312 檔 / 19 blocking），改掃描範圍後 47 檔 / 0 findings
- **CH 編號要 grep 全 repo 的引用，不是 `ls` 目錄** —— CH-010 已被四處前向引用預留，
  本 phase 因此用 CH-011（`AD-ChNumber-1`）

## 未關閉（M1 之前必看）

- ⚠️ **entity scoping / RLS 完全未實作**。`prisma.service.ts:12` 明文標示。
  目前零 model 所以無資料可洩，**M1 加第一張表的瞬間即成為 guardrail 4 違反**
- **`core-model` 經 DI 而非 import 取得範疇化 client** —— **設計意圖，尚未跑過**，
  由 ADR-0004 驗證。它是 `scope-boundaries.md` 矩陣中一個 ❌ 的承重假設
- 兩個 Dockerfile **從未被 build 過**（`AD-ImageBuild-1`）
- 安全標頭**無自動化斷言**（手動 curl 實測 ≠ 自動化斷言）
- M0 DoD 六項：3 關閉 / 2 部分 / 1 無標的（IaC，⛔ 不得打勾）

## Calibration

`greenfield-scaffold` 第 1 個資料點：committed 14.4 hr → actual ~5 hr → ratio ~0.35（UNDER）。
⚠️ **`progress.md` 零工時紀錄**，數字由 commit 時間戳回推 → 資料點品質打折（`AD-TimeTracking-1`）。
行動：**等更多資料點**，不以單點調乘數。
