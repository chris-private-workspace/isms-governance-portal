# Phase W15 Progress

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## Day 0 — 2026-08-16 · Plan-vs-Repo Verify

**Base**: `main` HEAD `52a74ac`（CH-032 收尾）。分支 `feature/W15-jurisdiction-and-obligations`
的第一個 commit 同時帶了 plan/checklist 與審計 #6 的 7 條漂移修正（使用者裁決夾帶）。

### Prong 1 — path verify ✅

| 類別 | 預期 | 實際 |
|---|---|---|
| NEW（migration 目錄 · `jurisdiction.int.spec.ts` · progress · retro · `CH-033`）| 全部不存在 | ✅ 全部 absent |
| EDIT（`schema.prisma` · `int-global-setup.js` · `multi-tenant-data.md`）| 全部存在 | ✅ 全部 exists |
| `CH-033` | 未被佔用 | ✅ 最大號是 `CH-032` |

### Prong 3 — schema verify ✅（⚠️ 附帶條件）

migration 鏈一致 —— **證據是 int suite 的 `[int] isms_test rebuilt, migrated and seeded`**，
**不是** `_prisma_migrations` 查詢。⛔ **兩者不等價**（W14 Day 0 記過同一件事）：
int 用的是 `isms_test`，**dev DB (`isms_dev`) 的 head 本次未被驗證**。
⚠️ 這與 `AD-DevDbChecksumDrift-1` 是同一個角落 —— 本片會是**第四次**繞開它。

### D-baselines ✅ —— **全部逐位對上 plan §Ground truth**

| Gate | plan 宣稱 | 實測 |
|---|---|---|
| api unit | 480 / 40 | ✅ **480 / 40** |
| api int | 218 / 17 | ✅ **218 / 17** |
| web | 10 / 1 | ✅ **10 / 1** |
| coverage | 92.14 / 91.77 / 98.98 / 93.56 | ✅ **逐位相符** |
| lint · type-check | 0 · 0 | ✅ 0 · 0 |
| `lint:negative` | PASS | ✅ **0** |
| `run_all` | 8 / 8 | ✅ **0** |
| `check_entity_index` | 22 / 35 | ✅ **0** |

---

## Drift findings

> 格式：`D{N}` · Finding · Implication。⛔ **不默默改 plan §3 原文** ——
> finding 進 plan §8 Risks，保留「原本計畫什麼 vs 現實逼你改成什麼」的軌跡。

### D1 — `jurisdiction` 在 `apps/api` **全樹**零命中 ✅

plan 只驗過 `schema.prisma` 那一半；本次擴大到整個 `apps/api`（大小寫不敏感）——
schema · migrations · src · test **全部零命中**。⇒ 本片是純新增，無殘留可衝突。

### D2 — `org_entities` 沒有 RLS，**而且只有 `GRANT SELECT`** ⭐

```sql
-- 20260809075152_entity_scope_spike/migration.sql:88
GRANT SELECT ON "org_entities" TO isms_app;
```

`ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` 對它**零命中**，與 `multi-tenant-data.md:61`
（「組織階層本身。它**定義**範疇，不能被範疇過濾」）一致。

⇒ plan 的預期（加一個 nullable 欄位不需重寫 policy）**正確**。
⭐ **但多量到一件 plan 沒問的事**：應用層對 `org_entities` **只有 SELECT**
⇒ AC-3 的「既有 seed 列已指過去」**物理上不能走應用層**，只能在 seed（superuser）階段做。
plan §3.0 的做法正好一致，但那是**碰巧對的**，不是因為 plan 想過這件事。

### D3 ⭐ — seed 的 `entities` 只有 5 列，而其中一列**結構上沒有管轄區**

```
APAC (region) → SG (country) → SG1 (legal_entity)
              → HK (country) → HK1 (legal_entity)
```

⇒ plan §3.1 **D5（`jurisdiction_id` nullable）的理由因此升級**：
plan 寫的是「NOT NULL 需要 backfill，而哪家 OpCo 屬哪個管轄區是業務事實」——
那是**方便性**的論證。實際更強的理由是**表達力**：
**`APAC` 是 region 節點，它跨 11 個管轄區，沒有任何單一值是對的。**
⇒ NOT NULL 不只是麻煩，它**表達不出組織階層的根節點**。

⚠️ 順帶：seed 只有 **2 個 OpCo**（SG1 / HK1），而已確認參數 #4 是 **13 家**。
本片**不擴充 OpCo seed**（那不是本片的範圍），但 AC-4 需要 11 個管轄區才有意義 —— 見 D7。

### D4 — `Threat` / `Vulnerability` 確認**沒有** `ref_code` ✅

`schema.prisma:779` / `:797` 逐欄位讀過：只有 `id` · 業務欄位 · `version` · 三個時間戳。
⇒ plan §3.1 D2 的形狀正確，本片**不需要動 `RefCodeCounter`**。

### D5 — 全域參考清單逐列複驗 ✅

`multi-tenant-data.md:57-66` 五列逐列讀過：`org_entities` · `frameworks`/`framework_controls` ·
`threats`/`vulnerabilities` · **`jurisdictions`/`regulations`** · `risk_scales`。
⇒ 本片三張表裡**兩張已在清單上**、**`obligations` 確實不在** —— plan §3.1 D1 的前提成立。

### D6 — 漂移守衛確實從 repository 的寫入呼叫導出 ✅

`audit-coverage.int.spec.ts:515-539` 逐行讀過：`readdirSync(core-model)` → regex
`client\.(\w+)\.(?:${WRITE_OPS})\(` → 首字母大寫還原 → 與 `AUDITED_MODELS` **雙向**比對，
且帶 `expect(reachable.size).toBeGreaterThan(10)` 的非空前提（`AD-VacuousScopeTest-1` 的防護）。

⇒ plan §3.1 **D3 的假設成立**：3 個 model + 零 repository ⇒ 不進 `reachable` ⇒ **不該轉紅**。
⭐ 而反向的 `unreachable` 檢查意味著：**若我誤把三個名字加進清單，它會從另一半轉紅**。
⛔ Day 1 仍要**實際觀察**，不是引用本段（W13 `AD-Day0ReadNotApplied-1`：讀到了不等於套用了）。

### D7 ⛔⭐ — **plan 完全沒有寫 GRANT，而先例是 `SELECT` only**

| 表 | GRANT | 性質 |
|---|---|---|
| `threats` / `vulnerabilities` | **SELECT** | 全域參考庫 |
| `users` · `org_entities` | **SELECT** | identity / spine |
| `extension_fields` | SELECT, **INSERT, UPDATE** | catalog（有 nullable scope，應用層真的會寫）|

⇒ 本片三張表照 `threats` 抄：**`GRANT SELECT` only**。

⭐⭐ **而這與 plan §3.1 D3 完全自洽，且比 plan 的論證更強**：
plan 說「不接 `AUDITED_MODELS`，因為零 repository」——
實際上**應用層對這三張表根本沒有寫入權限**，所以「零寫入路徑」不是今天的巧合，
而是**資料庫層強制的**。⇒ D3 從「今天沒有寫者」升級為「**寫者被 GRANT 擋著**」。

⛔ **但它對 AC-5 有具體後果**：FK 完整性測試**不能透過應用層 INSERT**。
⇒ AC-5 必須以 **superuser 連線**執行，與 W02 那 8 個「完全不經應用層」的測試同一形狀。
**plan §5 的 AC-5 沒有指定連線，那是一個必須在 Day 2 前補上的空白。**

### D8 — 11 個管轄區的清單存在且逐字可抄，**而且它同時給了每個管轄區的主要法規**

`15:41` 原文：Hong Kong (PDPO) · Singapore (PDPA) · Malaysia (PDPA) · Thailand (PDPA) ·
Indonesia (PDP Law) · Philippines (Data Privacy Act) · Vietnam (PDPD) · Korea (PIPA) ·
Taiwan (PDPA) · Australia (Privacy Act) · New Zealand (Privacy Act)。
**India/DPDP 與 China/PIPL 均排除**（與已確認參數 #4 一致）。

⇒ **seed 範圍需要一個 plan 沒做的區分**：

| 表 | seed | 理由 |
|---|---|---|
| `jurisdictions` | **11 列（全部）** | 固定的集團事實（參數 #4），非編造資料；且 AC-4「讀到全部 11 個」需要它才有意義 |
| `regulations` | **2 列**（SG PDPA · HK PDPO）| ⚠️ **僅為讓 FK 鏈可測的最小 fixture**，對應 seed 裡實際存在的兩個 OpCo。⛔ **這不是 D003 的「填充義務庫」** —— 那指的是法規**條文內容**的訂閱 |
| `obligations` | **1 列** | 同上，最小 fixture。⛔ 條文用佔位文字，**不抄真實法條**（本 repo 無授權的法規全文）|

⚠️ **這個區分必須寫在 seed 的註解裡**，否則下一個人會把它讀成「義務庫已經開始填充」。

---

## Go / No-Go

| 面向 | 判定 |
|---|---|
| 核心交付物 | **不變** —— 3 張表 · `OrgEntity.jurisdiction_id` · 全域清單舉證 · 兩次中性化 |
| 受影響 | GRANT 形狀（D7，**plan 沒寫**）· AC-5 的連線（D7）· seed 範圍三分（D8）· D5 的理由強化（D3）|
| 範圍變動 | 估 **~15%** —— 全部落在「怎麼做」，**沒有一項改變「做什麼」** |
| **判定** | ✅ **GO** —— 繼續 Day 1。D2 / D3 / D7 / D8 進 plan §8 Risks |

⚠️ **本次 Day 0 最有價值的一條是 D7**，而它的形狀值得記：
**plan 有五個明確標示的決策點，而漏掉的那一項不在其中任何一個裡** ——
GRANT 從頭到尾沒有被問過，因為前九片的表都是 entity-scoped 且理所當然地需要寫入權限。
⇒ **一個「每次都一樣所以不必問」的東西，在第一次不一樣的時候不會舉手。**

## Remaining for Day 1

- ⭐ 先建表 + 跑 int suite，**觀察漂移守衛仍綠**（D6 的實地驗證，W14 的反向對照組）
- migration 含 `GRANT SELECT` only（D7），理由寫進註解
- seed 三分（D8），且區分寫進註解

---

## Day 1 — 2026-08-16 · Schema + migration

### ⛔⭐ 1.0 checklist 1.1 的原文是一條恆真的檢查 —— 在執行它之前先說

checklist 1.1 寫的是「觀察漂移守衛**仍綠**」。**那個觀察單獨看什麼都不證明。**

W14 的 progress 對它的**正向**版本寫過一句話：

> 「先改再跑得到的是綠色，而綠色**不能區分**『守衛有效』與『守衛從不看新表』。」

⇒ W15 是同一句話的**鏡像**，而 checklist 正好踩進去：
「3 個新 model + 零 repository ⇒ 守衛綠」與「守衛從來不看新 model ⇒ 守衛永遠綠」
**產生一模一樣的觀察**。⭐ **這是 `AD-VacuousScopeTest-1` 出現在 checklist 自己身上**，
而 W13 才剛為它掃過 13 個 spec、補了 4 處。

⚠️ 更值得說的是**它為什麼溜進來**：W14 的檢查有價值，是因為那次的預期是**紅**——
紅色會指名、會定位、無法造假。這一片把同一個檢查抄過來，**方向翻了而沒有人重新問它證明什麼**。
⇒ **一個檢查的價值不在它的動作，在它的預期結果能不能區分兩種世界。**

### 1.0b 因此把 1.1 拆成兩半，**第二半才是驗收**

| | 做什麼 | 預期 | 它排除什麼 |
|---|---|---|---|
| **1.1a** | 建 3 表 + 零 repository → 跑 int | **全綠 218 / 17**，守衛不動 | 排除「新 model 會讓守衛誤報」（AP-3 的另一半：清單裡有 `unreachable` 的名字）|
| **1.1b** ⭐ | **暫時**加一個 `jurisdiction.repository.ts` stub（內含 `client.jurisdiction.create(`）→ 跑 int | ⛔ **恰好 1 紅**，訊息**自己指名 `Jurisdiction`**，落在 **`unaudited`** 側 | 排除「守衛從不看新 model」—— **只有這一半能做到** |

**⇒ 預測（本節在執行前 commit）**：

- **1.1a**：`api int` **218 / 17**，與 Day-0 baseline **逐位相同**；`audit-coverage` 的
  「the allowlist still matches the write surface」**綠**。
- **1.1b**：`api int` **217 passed / 1 failed**，該 1 條是漂移守衛，訊息含 `"Jurisdiction"`
  且出現在 `unaudited` 陣列（**不是** `unreachable`）；⭐ **其餘 16 個 suite 一條不動**。
- **1.1b 還原後**：回到 218 / 17。

⚠️ **若 1.1b 沒有轉紅**，那不是「守衛壞了」的結論就能收工的 ——
要先確認 stub 真的落在 `core-model/` 且 regex 真的匹配到它（`readdirSync` 只掃該目錄一層）。

### 1.1 執行結果 —— **兩半都命中**（預測 commit `4fa64d2`）

| | 預期 | 實際 | |
|---|---|---|---|
| **1.1a** 3 表 + 零 repository | 218 / 17，守衛綠 | **218 / 17**，`rebuilt, migrated and seeded` | ✅ 逐位相同 |
| **1.1b** + stub repository | **恰好 1 紅**，指名 `Jurisdiction`，在 `unaudited` | **1 failed / 217 passed / 218 total**，`Test Suites: 1 failed, 16 passed` | ✅ **逐項命中** |
| **還原** | 218 / 17，`git status` 空 | **218 / 17**，`git status` 空 | ✅ |

1.1b 的原文：

```
● audit coverage (integration) › the allowlist still matches the write surface

    - Array []
    + Array [
    +   "Jurisdiction",
    > 543 |     expect(unaudited).toEqual([]);

Test Suites: 1 failed, 16 passed, 17 total
Tests:       1 failed, 217 passed, 218 total
```

| 觀察 | 意義 |
|---|---|
| **恰好 1 紅** | 其餘 16 個 suite **一條未動** ⇒ 守衛的偵測獨立於它們 |
| 訊息**自己指名 `Jurisdiction`** | 它是從 `core-model` 原始碼導出的，不是比對硬編碼清單 |
| 落在 **`unaudited`**（`:543`）而非 `unreachable` | 雙向比對的**正確那一側**：新寫入面存在而清單沒跟上 |
| stub **無人 import** 卻仍被偵測 | 證實守衛讀的是**文字**不是 build graph ⇒ 「其餘不動」是構造上必然，不是運氣 |

⭐⭐ **兩半合起來才是結論，而任一半單獨都不是**：

- **1.1a 單獨** = 「守衛正確忽略無寫入路徑的 model」與「守衛從不看新 model」**不可區分**
- **1.1b 單獨** = 只證明它會對某個字串開火，不證明它**不會誤報**（清單裡的 `unreachable` 那一半）
- **兩者合起來** = 守衛量的是**寫入面**，不是表數 ⇒ W14（有 repository 而未接清單 ⇒ 紅）
  與 W15（無 repository ⇒ 綠）是**同一個機制的兩個方向**，各自被實測釘住

⚠️ 而 1.1b 是 checklist **原本沒有**的一項。它被加進來，是因為在執行 1.1 之前先問了
「這個觀察能區分哪兩種世界」—— ⛔ **那個問題本該在寫 checklist 的時候問，而不是在執行前**。

### 1.2 Schema + migration

- `ResidencyPolicy` enum + 3 個 model + `OrgEntity.jurisdictionId`（nullable）
- migration **手寫、UTC 時間戳** `20260816045848`（本地時間是 UTC+8，用它會超前八小時）
- ⛔ **第四次繞開 `AD-DevDbChecksumDrift-1`** —— 記在這裡而不是靜靜繞過

**三個「不建」的理由強度不同，Day 1 讀 `Threat` 的 docstring 才發現它們該分開寫：**

| 省略 | 強度 | 依據 |
|---|---|---|
| `extensions` | ⭐ **機械強制** | `validate_extensions()` **無條件**讀 `NEW.org_entity_id`（`governed_extensions/migration.sql:112` · `:116` · `:140` —— **本片逐行驗證過，行號與 docstring 逐字相符**）⇒ 掛到沒有該欄位的表上是 **runtime error，不是政策選擇** |
| `ref_code` | **結構性** | 發號是 per-entity 的（`ref_code_counters`），這裡沒有 entity 可發號 |
| `status` | **判斷** | `02a` §4 無此三個實體的 lifecycle ⇒ 建了就是發明一份業務沒同意的詞彙表（W14 `Attestation` 同一判準）|

⭐ **只有第三個是我的選擇**，而 plan §3.1 D2 把三者寫成同一種理由。

### 1.3 Seed —— 三分，以及一個**被驗證過**的計數 assert

依 Day-0 D8 分三段（**11 個管轄區 / 2 個 regulation / 1 個 obligation**），
且**區分寫進 seed 註解**：後兩者是「讓 FK 鏈可測的最小 fixture」，⛔ **不是 D003 的填充義務庫**
（那指的是法規**條文內容**的訂閱）。條文用合成佔位文字 —— 本 repo 無授權重製法條。

⭐ **`entities` 加了第 7 個元素 `jurisdictionId`，而 `APAC` 的是 `null`** ——
那是本片 D5 論證的實體化：region 節點跨 11 個管轄區，沒有正確的單一值。

**id 撞號預防**：`01xx` 區段在 `apps/api` **全樹零命中**後才使用
（W14 因 `ab0` 撞上 assessment instance 而損失 7 個測試，且那次是全域 replace 讓它不可見）。

#### ⚠️ 計數 assert：它防什麼、**不防什麼**

`AD-TextEditStructuralScope-1` 的修法是兩半 —— 錨定結構邊界（本次用 Edit 的精確匹配達成）
**＋ assert 計數**。第二半已加：seed 完成後逐表比對 `count(*)` 與陣列長度。

⭐ **而它自己也被驗證了**（`AD-NegativeGate-1`：宣稱會擋東西的機制必須附一個會被它擋住的案例）。
暫時把 INSERT 迴圈改成 `.slice(0, 10)`，實測：

```
Error: Jest: Got error running globalSetup … reason:
[int] seed count mismatch for jurisdictions: expected 11, found 10.
The seed edit did not land where it was meant to (AD-TextEditStructuralScope-1).
```

⛔ **但它的覆蓋範圍比它的名字窄，寫下來以免下一個人高估它**：

| 失效模式 | 這個 assert 抓得到嗎 |
|---|---|
| INSERT 迴圈沒把陣列裡的列全插進去 | ✅ **抓得到**（已實測）|
| 某列 INSERT 靜默失敗 / 被 ON CONFLICT 吞掉 | ✅ 抓得到 |
| **陣列本身被編輯錯**（少一列 / 多一列）| ⛔ **抓不到** —— `expected` 是從**同一個陣列**導出的，兩邊會一起動 |
| id 撞號（W14 的實際失效）| ⛔ **抓不到** —— 列數不變，內容錯 |

⇒ **它是「INSERT 端」的守衛，不是「資料正確性」的守衛。**
真正擋住 W14 那次失效的，是 seed 之前的**零命中驗證**，不是這個 assert。
⚠️ 兩者一起才覆蓋，而 `AD-TextEditStructuralScope-1` 的原文把它們寫成同一條修法的兩半 ——
本片是那條 AD 的第一次實地套用，**而套用之後才看清楚兩半各自管什麼。**

### 1.x partial gate ✅ (Day 1) —— 各自 exit code 分開取

| Gate | 結果 | baseline |
|---|---|---|
| `type-check` api+web | **0** | 0 |
| `lint` api+web | **0** | 0 |
| `format:check` api | **0** | 0 |
| `run_all` | **0**（8/8）| 8/8 |
| **api int** | **0** —— **218 / 17** | 218 / 17（**不變，如預期**）|
| `check_entity_index` | ⭐ **25 / 35** | 22 / 35（**+3**）|

⚠️ **int 測試數維持 218 是預期的** —— 本片到 Day 1 為止**沒有新增任何測試**
（AC-4 / AC-5 是 Day 2）。⛔ 若它變動了，那本身是發現。

## Remaining for Day 2

- `jurisdiction.int.spec.ts`：AC-4（全域可讀）+ AC-5（FK 完整性）
- ⛔ **AC-5 必須用 superuser 連線**（Day-0 D7：`GRANT SELECT` only ⇒ 應用層插不進去），
  形狀抄 W02 那 8 個「完全不經應用層」的測試
- `multi-tenant-data.md` 全域清單 +1 列 `obligations` + 舉證（D1）

---

## Day 2 — 2026-08-16 · 整合測試 + 全域清單舉證

### ⛔⭐ D9 —— **AC-3 是一條沒有測試的驗收標準，而 N1 正要去中性化它**

依 `AD-NeutralisationConsumerGrep-1`（W13：中性化前先 grep 消費者，不要列「我以為會受影響的」），
在寫測試**之前**先反查 N1 的標的：

```
Grep "jurisdiction" apps/api/src --glob *.spec.ts  →  No matches found
```

⇒ **全 repo 零個測試提到 jurisdiction**。而 plan §5 是這樣寫的：

| | 原文 |
|---|---|
| **AC-3** | `org_entities.jurisdiction_id` 存在、nullable、FK 指向 `jurisdictions(id)`；既有 seed 列已指過去 |
| **AC-6（N1）** | 移除 `org_entities.jurisdiction_id` 的 FK 約束 → **AC-3 的測試轉紅** |

⛔ **「AC-3 的測試」不存在。** AC-3 被寫成**結構性**斷言（欄位在、型別對、seed 指過去），
而這三件事**在 FK 被移除之後全部仍然成立** —— seed 從來只插入存在的 id，
所以拿掉約束不會讓任何東西變紅。**N1 原本會是一場空實驗**，
而它回報的「沒有測試轉紅」會與「守衛沒接上」長得一模一樣。

⭐ **這與 Day 1 的 1.1 是同一個形狀，第二次**：
> 一條檢查的價值不在它的動作，在它的**預期結果能不能區分兩種世界**。

差別在偵測時機：1.1 是我在**寫下預期時**發現的，D9 是我在**執行 grep 時**發現的。
兩次都在動手前，而兩次都不是靠 plan —— **plan 兩次都把恆真的東西寫成驗收**。

⇒ 處置：`jurisdiction.int.spec.ts` 補測試 6（見下），**AC-3 因此才有可被 N1 falsify 的行為**。
⇒ 不改 plan §5 的原文（保留「計畫寫了什麼 vs 現實是什麼」的軌跡），本條進 §Risks。

### 2.1 `jurisdiction.int.spec.ts` —— 7 個測試，逐個說明買到什麼

checklist 2.1 列的是 2 項（AC-4 / AC-5）。實際寫了 **7 個 `it()`**，**沒有一個是投機的** ——
每一個都釘住一句已經被寫下來的斷言：

| # | 測試 | 它釘住的那句話 | 若刪掉會漏掉什麼 |
|---|---|---|---|
| 1 | SG1 範疇連線讀到全部 11 個 | AC-4 本體 | — |
| 2 | **從未設過 scope** 的連線也讀到 11 個 | 「**沒有 policy**」而非「policy 剛好放行」 | 任何呼叫 `current_setting` 的 policy 會在未設 scope 時 raise 42704（`rls-direct` 測試 6 對 `policies` 釘過這件事）。⇒ 測試 1 分不出「permissive policy」與「無 policy」，測試 2 可以 |
| 3 | catalog 直接讀 `relrowsecurity` + `pg_policies` = 0，**三張表**| migration banner 的整段理由 | 測試 1/2 **只碰 `jurisdictions`**。`regulations` / `obligations` 被加上 RLS 時，1 與 2 全綠 |
| 4 | `obligations` 指向不存在的 `regulation_id` → **23503** | AC-5 前半 | — |
| 5 | `obligations` 指向不存在的 `jurisdiction_id` → **23503** | AC-5 後半 | `02a:427` 要求**兩條** N:1；一個複合案例只滿足其中一條時，看起來和這一對一模一樣 |
| 6 | ⭐ `org_entities` 指向不存在的 `jurisdiction_id` → **23503** | **AC-3**（D9） | **N1 沒有標的** |
| 7 | 應用角色**三張表都寫不進去** → **42501** | plan §3.1 **D3** | 「沒有寫入路徑可稽核」會退回成「今天剛好沒有 repository」的觀察 |

⛔ **連線的選擇是有承載力的，不是風格**：測試 4/5/6 走 **owner** 連線。
PostgreSQL **先查權限再查約束** —— 以 `isms_app` 發出的同一句 INSERT 會拿到 **42501**，
`rejects` 仍然會綠，而**那條 FK 從頭到尾沒有被碰到**。
這正是 Day-0 D7 那條「AC-5 的連線在原文中是空白」所指的東西，
而測試 7 把這個順序**變成可見的**：同樣三句 INSERT，換一個角色，錯誤碼從 23503 變 42501。

⚠️ 測試 1/2 斷言的是**排序後的 code 清單**而不是 `count = 11`：
清單來自 `15:41`（已確認參數 #4）**手寫**，不是從 seed 陣列導出的。
從被檢查的東西導出期望值，就是 `AD-VacuousScopeTest-1` 的形狀 ——
Day 1 的計數 assert 已經量到它抓不到「陣列本身被編輯錯」。這裡的清單**可以與 fixture 不同意**。

⚠️ `NOWHERE = ffffffff-...-ffffffffffff` 使用前已驗證 `apps/api` 全樹零命中
（W14 因為 id 撞號掉了 7 個測試）。

**結果**：`api int` **225 / 18**（+7 tests / +1 suite），EXIT=0。⛔ 七個第一次跑就全綠 ——
其中 1/2/3/6 的**可證偽性由 Day 3 的 N1/N2 負責證明**，今天不宣稱。

### 2.2 全域清單 + `obligations` + 舉證（D1）✅ —— 但**做了兩次**

### ⛔⭐ D10 —— **第一版加了一列，而那違反 repo 自己既有的一條 AD**

第一版照 plan 寫的做：在表格**插入一列** `obligations`。做完立刻反查引用：

```
Grep "multi-tenant-data\.md:[0-9]+(-[0-9]+)?"  →  100+ 命中（含 generated）
```

插在第 65 行 ⇒ **舊行號 ≥ 65 的每一個引用都少了 1**。於是開始分流修補
（`schema.prisma` · `audit.recorder.ts` ×2 · `rls-direct.int.spec.ts` · `BACKLOG` ·
`DEFERRED_REGISTER` · 本片 migration，共 7 檔），並準備為「已採納 ADR 不回頭改」
與「歷史紀錄不動」寫一段判準。

⛔ **然後在寫 BACKLOG 條目之前先查了 BACKLOG，發現這條規則已經存在：**

> **`AD-MdAnchorLineShift-1`**（W07 Day 4，🟡 P1）——「一次 markdown 編輯插入 8 行，
> 就讓 ~30 個 `02a:NNN` 錨點全部偏 +13」。**通則：被大量錨定的文件，編輯不得改變行數。**
> W07 的解法是把多行註記改寫成**同一行追加**，並以 `git diff --numstat` + 總行數驗證。

⇒ **全部還原，改照那條 AD 做**：`obligations` **併入既有的
`jurisdictions` / `regulations` 那一列**，不新增列。

| 量測 | 值 |
|---|---|
| 行數 | **390 → 390** |
| `git diff --numstat` | **1 / 1**（一行改，零增零刪）|
| 錨點抽驗 `:64` `:67` `:81` `:145` `:161` `:197` `:212` `:294` | **逐個逐字不變** |
| 需要重新指向的檔案 | **0**（第一版是 7 檔 + 3 份 ADR 的未決問題）|

⭐ **併入其實比新增一列更貼合這張表自己的慣例** —— 表中既有的
`frameworks` / `framework_controls`、`threats` / `vulnerabilities` 本來就是「一個家族一列」，
而管轄區→法規→義務正是一條家族鏈。**零位移是附帶的，不是硬凹的。**

⚠️ 它同時取消了第一版的另一個連帶修改：新增一列會讓緊接其後的
「上面**五**類全部沒有個資」變成錯的（要改「六」）。併入之後**仍然是五列**，那句話不必動 ——
少改一處就少一個出錯面。

#### 這次的教訓不是「規則寫過了」，是**規則寫過了而我先做完才查**

⛔ 動手前該做的檢索是 `BACKLOG` 而不只是 `rules-on-demand/`：
`AD-MdAnchorLineShift-1` 是一條**通則**（"被大量錨定的文件，編輯不得改變行數"），
但它住在 BACKLOG 的 P1 列裡 —— **沒有任何 always-loaded 規則、也沒有任何 lint 帶著它**。
⇒ 這是 `AD-NegativeGate-1` 家族的另一種形態：**規則存在、正確、而且沒有東西在執行它**。
W07 自己就寫過「這比 detector 便宜得多 —— detector 只能在偏移**之後**告警，
本規則讓偏移不發生」；本次證明了那條規則**在沒有載體時**連自己都攔不住。

⭐ **順帶量到的三個實例（不是本次造成的，且因為零位移而更乾淨）**：
`entity-scope.resolver.ts:16`、`:39`、`entity-scope.resolver.spec.ts:80`
三處引 `:145` / `:144-149` 宣稱「滾升是子樹不是繞道」，而 `:145` 實際是
**「查不到資料時回 404」**那一節 —— 由 W04 / W05 對本檔的兩次編輯造成
（`156e8ea` / `8f08f3f`），**本次零位移，所以這三處與 W15 無關**。
`AD-16` 只列了 3 個實例，這是第 **4 / 5 / 6** 個 → BACKLOG，
作為 ROADMAP 第 9 列 detector 的現成驗收料。⛔ **不當場修**（節流閘）。

#### 2.2 最終狀態 ✅

`multi-tenant-data.md:64` 一列涵蓋三張表，舉證與 migration banner **同一段論證**：
`02a:200` 五個欄位全部是法規內容 · per-entity 的是「靠哪個控制項滿足」住在
`ObligationControlMapping`（`10:69`，Wave 2）· 範疇化等於**把法條複製 13 份**。
migration banner 的 "by one row" 一併改寫（引用已不成立的東西 = orphan claim）。

### 2.x Full gate ✅ —— 十三項各自 exit code 分開取

| Gate | 結果 | baseline |
|---|---|---|
| `format:check` api | **0** | 0 |
| `format:check` web | **0** | 0 |
| `lint` api+web | **0** | 0 |
| `type-check` api+web | **0** | 0 |
| `build` api | **0** | 0 |
| `build` web | **0** | 0 |
| `lint:negative` | **0** —— 60 檔掃描 / 0 bypass / 3 allowlisted | PASS |
| **api unit** | **0** —— **480 / 40** | 480 / 40（**不變**）|
| ⭐ **api int** | **0** —— **225 / 18** | 218 / 17（**+7 / +1**）|
| web unit | **0** —— **10 / 1** | 10 / 1 |
| coverage | **92.14 / 91.77 / 98.98 / 93.56** | **逐位不變** |
| `run_all` | **0**（8/8）| 8/8 |
| `check_entity_index` | **25 / 35** | 25 / 35 |

⭐ **coverage 逐位不變是 checklist 2.x 先寫下的預期並且命中** ——
本片零 `.ts` 產品檔，新增的是 `.int.spec.ts`（不在 unit config 的計算範圍內）。
⛔ 若它動了，那本身會是發現（`AD-ModuleCoverageDilution-1`）。

⚠️ **上表是 D10 還原之後重跑的完整一輪**，不是還原前那一輪的數字 ——
還原動到 `schema.prisma` / `audit.recorder.ts` / migration 註解，
`prisma generate` 跟著重跑（`GEN_EXIT=0`）之後才取這十三個 exit code。
⛔ 沿用還原前的數字會是「用另一個世界的證據寫這個世界的結論」。

## Remaining for Day 3

- ⛔ **先 grep 消費者再寫預測**（`AD-NeutralisationConsumerGrep-1`）—— D9 已先做過一半
- **N1** 移除 `org_entities.jurisdiction_id` FK → 預期 **測試 6 單獨轉紅**，其餘 224 不動
- **N2** 給 `jurisdictions` 加 entity-scoped RLS policy → 預期 **測試 1 / 2 / 3 轉紅**
  （⚠️ 不只 AC-4 一條：測試 2 走 42704 路徑、測試 3 讀 catalog，**三條的紅法各不相同**，
  這比「AC-4 轉紅」是更強的預測，因此**先寫下再執行**）
- 預測與實際逐項對照，**命中與落空都記**，⛔ 預測錯不改預測
