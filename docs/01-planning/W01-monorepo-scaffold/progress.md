# Phase W01 Progress — Monorepo scaffold

[Plan](./plan.md) · [Checklist](./checklist.md)

---

# Day 0 — 2026-08-08

## Today's Accomplishments

- Branch `feature/W01-monorepo-scaffold` 自 `main` `dc0c880` 建立
- 三-prong Day-0 verify 全部執行（Prong 1 · Prong 2 六個 D-item · Prong 2.5 N/A · Prong 3 N/A）

## Drift findings

| D-ID | Finding | Implication |
|------|---------|-------------|
| **D-boundaries-matrix** | `scope-boundaries.md` 仍有 **11 處**佔位符（`<範疇名>` / `<目錄>` / `<職責>` / `_contracts` 範例矩陣） | ✅ 如 plan §0 所述。填矩陣是 Day 1 第一項，非附帶 |
| **D-ciguard** | `ci.yml` 中 `! -f package.json` 共 **6 處** —— 5 個是真的 guard 步驟（`:114 :123 :130 :138 :146`），第 6 處在檔頭註解 `:16` | 計數與 plan §0 的「五個 guard 步驟」一致。無影響，記錄以免日後誤讀 grep 數字 |
| **D-scanjobs** | `security-scan.yml` 四個 job 名稱與 plan 一致（`:65 secret-scan` · `:132 dependency-scan` · `:184 static-analysis` · `:207 container-scan`） | 無漂移 |
| **D-envexample** | `.env.example` 確認**不存在**，而 `CLAUDE.md:344` 寫「複製 `.env.example` 到 `.env`」 | ✅ 如 plan §4 #3 所述，本 phase 新增 |
| **D-nest-prisma-ver** | ⚠️ **真實漂移** —— npm registry 現況：`@nestjs/core` **11.1.28**（ADR-0001 寫 **NestJS 10**）· `prisma` / `@prisma/client` **7.9.1**（ADR-0001 寫 Prisma 7 ✅ 相符）· `next` **16.3.0**（ADR-0001 §Context 的 estate 表記姊妹專案為 Next.js 15） | **→ plan §8 新增 R-8**。ADR-0001 的決定是**框架**不是版本，但 `CLAUDE.md` §Tech Stack 與 ADR 標題都字面寫著 NestJS 10。依 `CLAUDE.md` §禁止反模式「不默默替使用者選技術」，**已向使用者表面化，等回覆**。不改 ADR 內文（`14-adr/README.md` §取代舊 ADR 的流程）|
| **D-ports** | 3200 / 3210 / 5433 三個埠皆 **free**（`Get-NetTCPConnection -State Listen`） | 依 plan 使用，無需改號 |
| **D-toolchain** | Node **v22.21.0** · npm **10.9.4** · Docker **29.5.3** 皆就緒 | 無阻斷 |

## D-baselines（於 `main` `dc0c880`）

```
run_all                       6/6 passed
  rules-hygiene · doc-links · path-references · status-markers(4 pre-doc, E1-E4 clean)
  mockup-fidelity(SKIP) · workflow-placeholders(4 known unfilled)
CI "gates"                    SUCCESS（PR #17）
lint / type-check / test / build   ⚠️ SKIP —— 非 pass。骨架未建立，5 個步驟印 skip notice
security-scan                 secret-scan 真跑；其餘 3 個 job 無標的
coverage                      n/a（repo 內零行 TypeScript）
```

## Go / no-go

**GO** —— 範圍變動遠低於 20%。唯一實質發現 `D-nest-prisma-ver` 不改變任何交付物、
檔案清單或驗收判準，只影響 `package.json` 裡的一個版本號。已加為 plan §8 R-8。

## Remaining for Next Day

- Day 1.1 `scope-boundaries.md` 範疇表 + import 矩陣（**不依賴版本決定，可先做**）
- Day 1.2 起需要 `D-nest-prisma-ver` 的回覆才能定 `package.json`

---

# Day 1 — 2026-08-08

## Today's Accomplishments

- **1.1 完成** —— `scope-boundaries.md` §範疇定義（8 列）+ §範疇歸屬決策樹 + §import 矩陣（8×8）
  由模板佔位符填為本專案內容。順帶把 §共用型別 的 Python/`_contracts` 範例與 §常見違規表
  改成本專案的真實範疇名 —— 否則同一份文件會同時存在兩套範疇詞彙。
  - Verify: Grep `<範疇名>|<目錄>|<職責>|_contracts` → **0 命中**（DoD 要求）· run_all **6/6**
  - Diff: `68 33 docs/rules-on-demand/scope-boundaries.md`

### 矩陣裡三個需要說明的 ❌

| 決定 | 理由 |
|---|---|
| `audit-trail` **連 `core-model` 都不 import** | 稽核若依賴領域結構，每加一個實體就要改稽核程式。只認契約層的通用形狀，guardrail 5 的「無旁路」才不會隨領域演進破洞 |
| `core-model` 不能 import `entity-scope` | 下層不 import 上層。但 guardrail 4 要求每個存取都被 scope 包住 → 解法是 **DI 注入而非 import**：範疇化的 Prisma client 由 `entity-scope` 提供，型別住契約層，`core-model` 拿不到未範疇化的 client |
| `modules/` 之間互不 import | 兩個模組要協作就下沉到共用範疇或走契約層，否則 Policy 與 Risk 會長成一團 |

⚠️ 第二列**是設計意圖，尚未跑過** —— 已在該檔明確標示，由 ADR-0004 的 spike 驗證。
它同時是 ADR-0001 §可證偽條件 #1 的承重假設。

## 🚧 阻塞

- **1.2 起需要 `D-nest-prisma-ver` 的回覆** —— `package.json` 要寫哪個 NestJS 主版本。
  已向使用者表面化，等回覆。1.1 不受影響故先完成。

## Notes

- Day-0 的 ROI 又一次由**版本**這一類漂移貢獻 —— plan 是照 ADR 寫的，而 ADR 是三天前寫的。
  `day0-plan-verify.md` 的 Prong 2 把「plan 對現有事實的斷言」擴及外部 registry 是對的。
