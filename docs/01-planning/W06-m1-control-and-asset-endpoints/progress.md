# Phase W06 Progress

**Phase**: W06 — M1 slice 3: the control library and the asset write path
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W06-m1-control-and-asset-endpoints`

---

## Day 0 — 2026-08-11 — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-precedent** ⭐⭐⭐ | **不對稱的 `USING` / `WITH CHECK` 已經存在，而我在 plan 裡寫它「首次」出現。** `extension_fields`（W03，`20260810134319_governed_extensions/migration.sql:80-83`）就是：`USING (org_entity_id IS NULL OR = ANY(scope))` · `WITH CHECK (org_entity_id = ANY(scope))`，且 `:73-79` 的理由**幾乎逐字就是 `Control` 的問題**（「group-wide 的宣告每個實體都可用，但**沒有哪個 OpCo 可以代表其他人宣告它**」）。⚠️ 而 W05 自己的 migration `:350-352` 還寫著「extension catalog differs precisely because it HAS a global half」—— **線索一直在，我沒讀** | ⭐ **改變 phase 的分類**：D1 不是「發明一個新 RLS 形狀」而是「**判斷 W03 的形狀適不適用於一張業務表**」。→ plan §1/§7 的「改判 spike」條件**大概率不成立**，class 維持 `pattern-reuse-feature` 0.50。同時 **D1 的選項 B 有先例了**（NULL sentinel），不再是無中生有 —— 但 `extension_fields` 是 **catalog** 不是業務表，鐵律 1 的豁免理由**未必可移轉**，這正是 D1 要裁決的 | 🔴 **重寫 plan §8 的兩列風險** |
| **D-frequency** ⛔⛔ | **`02a:124` 定義了 `Control frequency` 的完整值域**：`continuous · daily · weekly · monthly · quarterly · annual · event-driven`。plan §0 寫的是「⛔ **全 repo 未定義**（零命中）」 | ⭐ **D2 直接消失**，不需要拍板，照抄 `02a` | 🔴 **plan 斷言錯誤** |
| **D-nature** ⛔ | **`02a:123` 定義了 `Control nature`**：`manual · automated · hybrid`。plan 寫的是「值域**只在** `09:54`（設計交付物）」 | ⭐ **D3 直接消失**。`09:54` 只是重述 `02a`，不是唯一來源 → 沒有權威衝突要裁決 | 🔴 **plan 斷言錯誤** |
| **D-groupscope** | `02a:217` / `02a:**413**`（plan 寫 412，**差一行**）之外另有兩處：**`02-core-data-model.md:26` 把 `org_entity_id` 明列在 `Control` 的欄位清單裡**；`00-project-charter.md:59` 把「group-shared/inherited control library」列為**「不一致的作法」這個痛點的解法之一** | D1 的選項空間被壓縮：**B（nullable）與 `02:26` 的欄位清單衝突**；**C（延後）砍掉憲章列為價值主張的能力**。⛔ **但仍不代選** —— 呈報後由使用者拍板 | 🟡 記錄 → plan §8 |
| **D-w05shape** | W05 retro §US-6 追加的兩條條款，錨點**逐條解析成功**：複合 FK `assets_asset_group_id_org_entity_id_fkey`（`20260811024841_*/migration.sql:214`）· 繞開發號的直接寫入測試（`risk.int.spec.ts:288` "11b. the risks policy refuses a cross-entity write on its own, without the counter"） | ✅ 兩條條款**可作為本 phase 的施工依據**，US-6 的裁決有可靠起點 | ✅ 確認 |
| **D-refprefix** | `02a:**91**`（plan 引用 `:89`，**差兩行**）—— `ref_code` 只說「prefix by type + entity」，**`Control` 沒有指定縮寫** | 比照 `Policy` 自宣告，**不建 prefix 登記表**（W04 裁決）。⚠️ 順帶發現 **`risk.repository.ts:64` 的註解引用 `02a:89`，實際是 `:91`** —— live code 裡的行錨偏移，屬 `AD-DesignNoteAnchor-1` 家族。**不當場修**（節流閘），closeout 時記入該 AD | 🟢 記錄 |
| **D-claudemd** | `CLAUDE.md` = **29,804 / 30,000**，headroom **196**。預算由 `scripts/lint/check_rules_hygiene.py` 機械強制 | 確認 `AD-ClaudeMdBudget-1` 觸發條件成立。US-1 的目標（headroom ≥ 1,500）需移出約 **1,300+ bytes** | ✅ 確認 |
| **D-devdb** ⭐ | `isms_dev` **6 目錄 / 6 列 / 全 applied，且六個 sha256 逐一相符** | `AD-MigrationChecksum-1` 的對策連續第二個 phase 生效，起點乾淨 | ✅ 確認 |
| **D-control-absent** | `Control` 在 `schema.prisma` 與 `prisma/migrations/**` **零命中** | 確認是新建不是重建 | ✅ 確認 |
| **D-baselines** | lint **0** · type **0** · format **0** · unit **138**（15 suites）· int **54**（4 suites）· web **10** · build **0** · `run_all` **6/6** · `lint:negative` PASS（**22 檔 0 bypass 3 allowlisted**）· `CLAUDE.md` 29,804 | **與 plan §0 記載完全相符**，W05 closeout 之後無漂移 | ✅ |

### Prong 覆蓋

- **Prong 1（path）**: 10 個路徑（NEW 4 · EDIT 6）+ `CH-021` 佔用（**grep 全 repo 的引用，不是 `ls` 目錄**）
  + ADR 編號（`0014` 可用；`0002/0003/0008/0009` 仍是無檔案的預留主題），**0 個漂移**
- **Prong 2（content）**: 6 個 plan 宣稱驗證，**3 個實質推翻（`D-precedent` · `D-frequency` · `D-nature`）
  + 2 個引用行號錯誤（`D-groupscope` 差 1 行 · `D-refprefix` 差 2 行）**
- **Prong 2.5（child tree）**: **N/A** —— 無前端工作
- **Prong 3（schema）**: `Control` 零命中 · migration head + checksum 六項相符 ·
  `asset_groups`/`assets` 的 policy 與複合 FK 實際形狀已讀，**0 個漂移**

> ⭐ **Prong 2 連續第四個 phase 是唯一有實質產出的 prong**（W03 / W04 / W05 / W06）。
> 而本次它推翻的**全部三項都是我自己在 plan 裡寫的**，不是 repo 漂移。

### ⛔⛔ 三次錯誤是同一種，而且比 W05 那兩次更嚴重

W05 Day-0 犯過兩次「零命中但搜錯地方」。**本次的形狀更糟：我對從未搜過的東西寫下了「零命中」。**

`02a:116-129` 是**一張連續的值域表**。我的 recon pattern 是
`preventive|detective|corrective|control type|control nature|framework_refs|applies_to_scope|effectiveness`
—— 它命中 `:122`（type）與 `:125`（effectiveness），**pattern 裡根本沒有 `frequency`**。
我看到相鄰四列裡的兩列，就對另外兩列下了「未定義」的結論，而**那張表就在同一個畫面上**。

`D-precedent` 是同一個病的第三種形態：我讀了 W05 的 RLS policy，
**卻沒讀它正下方那句指名 `extension_fields` 有 global half 的註解**。

> **共同結構：讀「命中的行」而不是「它們所在的區塊」。**
> grep 給的是行，而結論需要的是上下文。→ 這條要進 closeout 的 AD。

### Go / No-Go

**範圍變動**: **~12%，且方向是縮小** → **繼續 Day 1**

- **減少**：D2 / D3 消失（兩個決定變成照抄），Day 1 少一個工作項
- **不變**：deliverables 完全不變（`Control` + 3 端點 + CLAUDE.md 瘦身）
- **改變的是理由不是內容**：D1 從「發明新形狀」降級為「判斷既有形狀是否可移轉」

依 `day0-plan-verify.md` 鐵律，**不改 plan §3 Technical Spec 的選項原文**（保留「當時考慮過什麼」），
改動加進 **§8 Risks**。

### 時間

依 `AD-CalibrationMetric-2` 的**新定義**（本 phase 是它的第一次實際套用）：
`actual` = **branch 上第一個 commit** → closeout commit 的牆鐘跨度，`git log` 機械導出，
**且明記 plan/checklist 起草不在窗口內，故為下界**。Day 4 retro Q2 填入。

### Remaining for Next Day

- **Day 1**：US-1 `CLAUDE.md` 瘦身（**開工前先做**）→ D1 量測與呈報
- ⛔ **D1 的量測重心已改變**：不再是「能不能做出不對稱的 policy」（W03 已證明可以），
  而是「**`extension_fields` 的豁免理由能不能移轉到一張業務表**」——
  前者是 PostgreSQL 的問題，後者是 guardrail 的問題
- ~~D2 `frequency` 值域~~ · ~~D3 `nature` 權威~~ —— **Day-0 已解決，照抄 `02a:123-124`**
