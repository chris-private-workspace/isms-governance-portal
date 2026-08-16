# Phase W17 Progress

**Plan**: [plan.md](./plan.md) · **Checklist**: [checklist.md](./checklist.md)
**T0 (UTC)**: `2026-08-16T13:24:10Z` —— 蓋在動 checklist **之前**
（`AD-CalibrationNoTimeRecord-1` 的最小改進，W16 retro 指定）。
⚠️ **plan 起草段發生在 T0 之前 ⇒ 那一段仍是估算**，如實標註。

---

# Day 0 — 2026-08-16

## Prong 1 — Path verify

14 個路徑逐一測。**4 NEW 全部 absent ✅ · 5 EDIT 全部 present ✅ · UNTOUCHED 3 項中 1 項失敗**。
`CH-035` 未被佔用（現有最大 `CH-034`）· `migrations/` 無 retention|hold 目錄（0）。

## Prong 2 / 3 — Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | plan §4 把 `AUDITED_MODELS` 的家寫成 `apps/api/src/audit-trail/audited-models.ts` —— **該檔不存在**。真實位置是 `audit.module.ts`（`audit-coverage.int.spec.ts:68` 從那裡 import） | UNTOUCHED 那一列指向一個不存在的檔 ⇒ 「不碰它」是空話。`task-workflow.md` §Risk Class D 的原形：plan 引用檔案路徑靠猜 | 🟡 改 plan §4 |
| **D2** | plan §3.z 與 checklist 1.x 寫 `npm run lint:negative -w apps/api` —— 該 script **不在** `apps/api/package.json`，它是 **root** script（`assert-boundary-gate.mjs && assert-no-scope-bypass.mjs`） | ⛔ **我自己的 baseline 掃描就用了錯的形式** ⇒ 那一行的 `EXIT` 無意義。⭐ 正是 W16 記下的「`EXIT=1` 有兩義」：**跑了不通過** vs **指令不存在**，而我這次踩的是第二種 | 🟡 改 plan + checklist + 重跑該項 |
| **D3** | plan §3.z / §8 說全域表的約束測試走「superuser 連線」。實際 W15 用的是 `asOwner()` + **`DATABASE_URL_MIGRATE`**（`jurisdiction.int.spec.ts:63-67`），那是 **migration owner 角色**不是 superuser | 名詞錯會讓下一個人去找 superuser 憑證。機制不變、名稱要改 | 🟡 改 plan 用語 |
| **D4** ⭐⭐ | `Grep 'FORCE ROW LEVEL SECURITY'`（單空格）在全 migrations 只回 **3** 個命中，而 W16 宣稱為 5 張表加了 FORCE。**差點據此發出「16 張表有 DR3 缺口」的 P0 警報** —— 實情是 W16 寫成 `FORCE  ROW LEVEL SECURITY`（**兩個空格**對齊）。寬容 pattern 實測：**ENABLE 24 / FORCE 24 / 缺口 0** | ⭐ **`AD-NarrowPatternWideClaim-1` 再現，而這次的代價方向是反的**：前幾次是窄 pattern 讓我**漏看問題**，這次是窄 pattern 差點讓我**對一個做對了的東西發警報**。⇒ 零命中與低命中**都**要先問「它如果存在會長什麼樣」 | 🟢 無需改動；記錄 |
| **D5** | 全樹 `*.spec.ts` 掃 `ON DELETE` / `onDelete` / `confdeltype` → **2 個命中，兩個都是註解**（`audit-coverage.int.spec.ts:417` · `rm-report.int.spec.ts:97`） | plan §3.2 的宣稱（本 repo 無任何測試斷言 `ON DELETE`）**仍成立** ⇒ 顯式 `onDelete` 的唯一守門仍是 `migrate diff` | 🟢 宣稱成立 |
| **D6** | 漂移守衛（`audit-coverage.int.spec.ts:515-546`）掃 `core-model/*.ts`（排除 `.spec.`）的 `client.<delegate>.<WRITE_OPS>(`，雙向斷言為空，並有 `reachable.size > 10` 的非空守衛 | W17 兩張表**零 repository** ⇒ 不進 `reachable` ⇒ 守衛保持綠。**這是讀了程式碼確認的，不是假設**。連帶：本片新增的 `.int.spec.ts` 落在 `.spec.` 排除規則內，不會汙染掃描 | 🟢 無阻塞 |
| **D7** ⭐ | `AD-UniqueKeyOracle-1` 的 W16 記錄是 `@@unique` **10** / 單欄 `@unique` **22** / `CREATE UNIQUE INDEX` **34**，且量法有寫下來。**在 W16 的 base commit `157921f` 上重跑，我得到 14 / 21** —— 且若照它寫的第 2 條 pattern（未排除 `@@`）應得 **35** 而非 22。**三個數字沒有一個能重現** | ⛔ W16 的**結論**（逐處讀出的 Category A–D 表、「今天零個可達 oracle」）**站得住** —— 那是讀出來的不是數出來的。但它的**計數不可重現** ⇒「計數有沒有如預期成長」對 W17 **不是可用的檢查**。⭐ 教訓：**量法寫下來還不夠，要寫到能重現** | 🟡 新 AD 候選 |
| **D8** | 本片規劃的 13 個識別字逐一量長度，最長 **35**（`retention_policies_record_class_key`），`NAMEDATALEN` 63 | 無需任何 `map:`。W11 / W16 的截斷風險在本片不存在 | 🟢 無風險 |
| **D9** | `AD-DevDbChecksumDrift-1` **第 6 次，數字更精確**：`prisma migrate status` 報 **6 支未套用**（`soa` · `audit_log` · `attestation` · `polymorphic_parent_guard` · `jurisdiction_and_obligations` · `isms_profile`）⇒ `isms_dev` 是 **17 / 23**，最後套用的是 `20260813153153_version_label_key_scoped`（W10 era）。⚠️ W16 記的是 17 / 22 —— 分母 +1 是 W16 自己那支，**分子未動**，兩者一致 | 開發用 DB 落後 6 支且**連續六個 phase 沒人修**。本片仍不修（節流閘：順路發現、不阻塞、非安全），但**不再用它當任何基準** | 🟡 記錄，量法改走 D10 |
| **D10** ⭐⭐ | **W15 / W16 稱為「Prong 3 欄位級 diff」的那個工具，量的不是它宣稱的東西**。三種形式實測：**(A)** `--from-migrations`（真正的 schema↔migrations 檢查）⛔ **跑不起來** —— Prisma 7 要求 `datasource.shadowDatabaseUrl`，而 `prisma.config.ts` 沒設；**(B)** `--from-config-datasource`（預設打 `isms_dev`）→ EXIT 2，但輸出**被 6 支未套用的 migration 淹沒**，分不出「schema 漂移」與「DB 落後」；**(C)** 我第一次覆寫 `DATABASE_URL` 想改指 `isms_test` —— **無效**，因為 `prisma.config.ts:53,61` **優先用 `DATABASE_URL_MIGRATE`**（C 的輸出是 B 的超集，兩者其實同一次量測）| ⭐ **新的可跑量法（D）**：覆寫 **`DATABASE_URL_MIGRATE`** 指向 `isms_test` —— 該庫由 `int-global-setup.js:564-578` 的 `DROP + CREATE + prisma migrate deploy` **從 migration 檔**建成（**非**從 `schema.prisma` push ⇒ 非循環）。實測分離出**恰好 2 條**真實漂移：`audit_log.prev_hash`/`row_hash` 的 default 表示法不同 · `statements_of_applicability` 的 index rename（⭐ **逐字重現 W16 的 DR12** —— W11 的 67 字元名被 `NAMEDATALEN` 截成 63）| 🟡 **改 checklist 1.2 的 Verify** |
| **D11** | 我用 `ls prisma/migrations -d prisma/migrations/*/ \| wc -l` 得到 **24**，而 `prisma migrate status` 說 **23**（Glob 也是 23）| 我的指令把父目錄一起數進去了。**自己的量測錯誤，記在這裡而不是靜靜改掉** —— 與 D4 / D7 同一族：便宜的代理指標回答需要精確計數的問題 | 🟢 已更正為 23 |

### Prong 2 — 逐字確認通過的（無 drift）

| 檢查 | 結果 |
|---|---|
| `02a:50` | `retention_policy` · `LegalHold` 同列，Wave **1**，described in `05` §Records retention ✅ |
| `02a:314-316` | 6 個欄位名逐字相符 plan §3.1 ✅ |
| `02a:318-321` | 8 個欄位名逐字相符 plan §3.2 ✅ |
| `02a:314-315` | 值域 `creation/closure/supersession` · `retain/archive/purge` 逐字相符 ✅ |
| `05:73-80` | **恰好 6 列**（Security incident 3y · RM Report & SoA 3y/version · ISMS profile versions 3y/version · Audit issues & evidence **6y** · External party Contract term+2y · Platform audit log **7y immutable**）✅ |
| `polymorphic_parent_guard:46-59` ⭐ | `parent_id := (…)::uuid` 在 **line 47**，mapping walk 在 **52-59** ⇒ **cast 確實早於 walk**。plan §3.3 的 D3 論證成立 ✅ |
| `jurisdiction_and_obligations:11-50,145-149` | 全域表無 RLS / 無 policy / `GRANT SELECT` only ✅ |
| `multi-tenant-data.md:57-65` | 豁免清單 5 列，`retention_policy` **不在上面** ⇒ 必須走 `:81` 舉證 ✅ |
| `schema.prisma` | `^model ` = **31** · `^enum ` = **30**，header 自稱 31（自我可重現）✅ |
| `RetentionPolicy` / `LegalHold` | 全 schema **零命中** ✅ |

### Oracle sweep（覆蓋聲明 —— 掃了什麼 / 什麼方法 / 什麼沒掃到）

**方法**（寫到能重現，這是 D7 的直接回應）：

```
(1) Select-String -Path apps/api/prisma/schema.prisma -Pattern '@@unique'            → 18 行
(2) Select-String -Path apps/api/prisma/schema.prisma -Pattern '(?<!@)@unique'       → 26 行
(3) Select-String -Path apps/api/prisma/migrations/*/migration.sql -Pattern 'CREATE UNIQUE INDEX' → 43 行
(3b) 同上再加 '.*WHERE'（partial）                                                    → 0 行
```

⚠️ **這是行數不是出現次數** —— 逐行一個的情況下兩者相同，但沒有驗證過。
（`AD-TextEditStructuralScope-1` 記過同一個混淆：Grep 回報行數而我當成出現次數。）

**判準套用到本片自己的鍵**（直接讀，不靠計數）：

| 鍵 | 呼叫端可選？ | 可達？ | 裁決 |
|---|---|---|---|
| `retention_policies_pkey`（`id` UUID）| ❌ 伺服器生成 | — | ✅ 安全（AD 明文豁免 A）|
| `retention_policies_record_class_key`（`record_class`）| ✅ 是 | ⛔ **今天不可達** —— `GRANT SELECT` only，app 角色無 INSERT | ⚠️ **安全性來自 GRANT，不來自鍵的設計** —— 必須寫進 migration banner |
| `legal_holds_pkey`（`id` UUID）| ❌ 伺服器生成 | — | ✅ 安全 |
| `legal_holds` 無其他唯一鍵 | — | — | ✅ 無 oracle 面 |

**沒掃到的**：⛔ partial unique index 的**運算式**未讀（本次 0 條故無標的，但方法未驗證）。
⛔ 未驗證「呼叫端真的能給這些欄位」—— 本片零 repository 故無呼叫端可讀，
該檢查要等 M6b。

## Baselines —— 與 plan §0 **逐位相符**

| Gate | 結果 | vs plan §0 |
|---|---|---|
| `format:check` api/web | EXIT=0 | ✅ |
| `lint` api/web | EXIT=0 | ✅ |
| `type-check` api/web | EXIT=0 | ✅ |
| `build` api/web | EXIT=0 | ✅ |
| `lint:negative`（**root form**）| EXIT=0 —— boundaries PASS · no-scope-bypass PASS（60 檔掃描 / 0 bypass / 3 allowlisted / 跳過 59 test + 2 fixture）| ✅ |
| api unit `test:cov` | **480 / 40**，coverage **92.14 / 91.77 / 98.98 / 93.56** | ✅ 逐位 |
| api int `test:int` | **235 / 19** | ✅ |
| web `test` | **10 / 1** | ✅ |
| `run_all` | **8 / 8** | ✅ |
| `check_entity_index` | **30 / 36**（schema 31 models）| ✅ |

⛔ **D2 的證據逐字留存** —— 錯的形式跑出來是：

```
$ npm run lint:negative -w apps/api
npm error To see a list of scripts, run: npm run --workspace=@isms/api@0.0.0
EXIT=1
```

⇒ 那個 `EXIT=1` 是**指令不存在**，不是「跑了不通過」。若不看輸出只看 exit code，
它與一個真正失敗的 gate **長得一模一樣**。

## Go / No-Go — ✅ **GO**

**11 條 drift，零條動到 §Technical Spec 的設計。** 分類：

- **文件層 3 條**（D1 / D2 / D3）—— plan 的路徑與用語錯誤，已就地修正並在此留痕
- **方法層 5 條**（D4 / D7 / D9 / D10 / D11）—— 量法本身有問題，其中
  **D10 產出一個比 W15 / W16 更可信的新工具**
- **確認 plan 宣稱成立 3 條**（D5 / D6 / D8）

範圍變動 **< 10%**（僅 checklist 1.2 的 Verify 指令改寫）⇒ **繼續 Day 1**。
⛔ 依規則，drift 不默默改 §Technical Spec —— D10 已加進 plan §8 Risks。
