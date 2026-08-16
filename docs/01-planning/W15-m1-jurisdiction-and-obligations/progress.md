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
