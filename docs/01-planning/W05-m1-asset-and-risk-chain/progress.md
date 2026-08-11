# Phase W05 Progress

**Phase**: W05 — M1 slice 2: the asset-based risk chain
**Plan**: [plan.md](./plan.md)  ← 四件套共置於同一個資料夾
**Branch**: `feature/W05-m1-asset-risk-chain`

---

## Day 0 — 2026-08-11 — Plan-vs-Repo Verify

### Drift findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-ratingband** ⭐⭐ | **`rating_*` 不是 `score_*` 的別名，是另一個概念，而我在 plan 裡把它當成命名漂移。** `score_before`/`score_after` 是 **1–25 整數**（`02a:194-195`）；`rating_inherent`/`rating_residual` 是**分帶**（`02a:405` "computed from the configured matrix"，`03:90` / `08:25` 皆寫 `∈ {High, Critical}`）。⚠️ **旗艦儀表板數的是分帶不是分數**（`02a:414` · `08:25`）| ⛔ **但本 phase 仍不建 `rating_*`**，三個獨立理由：(a) `02a` §3 的 Risk 欄位規格**只列 `score_*`**，沒有 `rating_*` 欄位；(b) **`02a:405` 與 `:429` 互相矛盾** —— 405 說它是 derived、429 說「risk owner **enters** it，系統*可以*建議」；(c) `02a:429` 本身就是**開放決策 #5，明訂 "Confirm before M7"`。→ 建了就是替一個未拍板的決定選邊 | 🟡 記錄 → plan §8 加一列風險 |
| **D-riskscales** ⭐ | **`risk_scales` 只存在於 `multi-tenant-data.md:65`，`02a` 與任何設計文件從未提過它。** 全 repo 除該行與 W05 自己的 pre-doc 外**零命中** | ⭐ **這讓 D2-C 的理由比原本更強**：今天建它不只是零消費者（AP-5），還得**自行發明它的欄位** —— 直接違反已確認參數 #9「不得自行發明欄位」。D2 拍板為 C 是對的，但**理由要換成這一條** | ✅ 強化既有裁決 |
| **D-tablename** | `multi-tenant-data.md:**63**`（plan 寫 `:61`，**行號本身漂移**）寫 `threat_library` / `vulnerability_library`；`02a:30` 的 §0 索引寫 `Threat` · `Vulnerability` | D4 已拍板依 `02a` → `threats` / `vulnerabilities`。**同時更正 `:63`**。⚠️ 順帶記：plan 引用的兩個行號（`:61` `:62`）**都不準**，實際是 `:63` `:65` —— Risk Class D 的形狀（plan 引用路徑靠猜），這次是行號 | 🟢 修正引用 |
| **D-entityindex** | 五個實體**全部已在 `02a` §0 索引表上**：`Risk`（`:29`）· `Threat`·`Vulnerability`（`:30`）· `AssetGroup`·`Asset`（`:31`）| ✅ **§0 不需修改**，plan §3.0 的判斷成立。⚠️ **第一次 grep 回報 0 命中是我 pattern 錯了** —— §0 把成對實體寫在**同一格**（`` `Threat` · `Vulnerability` ``），而我用 `^\| \`X\` \|` 要求獨佔首格。**零命中先證明搜對地方**（`feedback_evidence_must_support_claim`） | ✅ 確認 |
| **D-w04shape** | W04 design note §2/§3 的**八個 `file:line` 錨點逐條解析** —— 全部命中預期內容（`User:115` · `RefCodeCounter:147` · `ref-code:97` upsert · `policy.repository:104` validate · `:117` issueRefCode · `int.spec:117` 案例 2b · `:241` 40 並發 · `scoped-client.types:78`）| ✅ **藍本未漂移**，可作為本 phase 的複製來源。US-6 的裁決有可靠起點 | ✅ 確認 |
| **D-orphanclaim** | `schema.prisma:164-166` 的 W04 docstring 寫著 "Risk carries four FKs to tables **this phase does not build** (Asset, Threat, Vulnerability)" | 本 phase 建完就是 orphan claim（AP-7）。**Day 2 改 `Policy` docstring 時必須同時更新** —— 與 W04 的 `D-userfk-comment` 完全同形狀 | 🟢 Day 2 待辦 |
| **D-devdb** ⭐ | `isms_dev` **5 目錄 / 5 列 / 全 applied**，且**五個 sha256 checksum 逐一相符** | ⭐ **`AD-MigrationChecksum-1` 的直接對策生效**：W04 只驗 `applied=true` 而在 Day 2 撞到 checksum 不符；本次把比對升級為「內容一致」，起點乾淨 | ✅ 確認 |
| **D-adrnum** | ADR 目錄有 `0001/0004/0005/0006/0007/0010/0011/0012`；`ADR-0013` 全 repo 零命中（W05 pre-doc 除外） | ADR-**0013** 可用。⚠️ `0002/0003/0008/0009` 是**有主題的預留**，不可填（`AD-ChNumber-1`） | ✅ 確認 |
| **D-baselines** | lint **0** · type **0** · format **0** · unit **86** · int **34** · web **10** · build **0** · `run_all` **6/6** · `lint:negative` PASS（**18 檔 0 bypass 3 allowlisted**）· coverage **94.11 / 90.42 / 92.45 / 94.76** | **與 plan §0 記載完全相符**，W04 closeout 之後無漂移 | ✅ |

### Prong 覆蓋

- **Prong 1（path）**: 10 個路徑（NEW 5 · EDIT 5）+ `CH-020` 佔用（**grep 全 repo 的引用，不是 `ls`**）
  + ADR 編號，**0 個漂移**
- **Prong 2（content）**: 5 個 plan 宣稱驗證，**2 個實質發現（`D-ratingband` · `D-riskscales`）
  + 1 個引用錯誤（`D-tablename` 行號）**
- **Prong 2.5（child tree）**: **N/A** —— 無前端工作
- **Prong 3（schema）**: 五個實體在 `prisma/` **僅命中 W04 的註解**（無 model）· migration head + checksum，
  **0 個漂移 + 1 個待處理的 orphan claim**

> ⭐ **Prong 2 連續第三個 phase 是唯一有實質產出的 prong**（W03 / W04 / W05）。
> 而本次它抓到的是**我自己在 plan 裡寫錯的一個概念** —— `rating_*` 被我當成 `score_*` 的舊名。
> 若沒抓到，W05 會交付一組儀表板讀不到的欄位，而**每一項 gate 都會是綠的**。
>
> ⚠️ **本次 Day-0 我自己犯了兩個「證據不支持結論」的錯**，都在第一次嘗試時：
> (a) `grep -c "🔴 P0"`（審計 #3）與 (b) `D-entityindex` 的成對格 pattern —— **兩次都是零命中，
> 兩次都是搜錯地方**。零命中的正確反應是先問「它如果存在會長什麼樣」。

### Go / No-Go

**範圍變動**: **~5%** → **繼續 Day 1**

`D-ratingband` 與 `D-riskscales` 都**不改變交付內容**，而是**強化既有裁決的理由**並新增一條 §8 風險。
`D-tablename` 只是修正引用行號。依 `day0-plan-verify.md` 鐵律，**不改 plan §3 Technical Spec**，
改動加進 **§8 Risks**。

### 時間

依 `AD-CalibrationMetric-1` 的定義（W04 起實施）：`actual` = branch base `a2b1906`
→ closeout commit 的牆鐘跨度，`git log` 機械導出。Day 4 retro Q2 填入。

### Remaining for Next Day

- Day 1 全部（⛔ **第一件事是 Prisma generated column 的 drift 探測** —— D1-A 的成立條件）
- ⛔ **Day 1 必須做但不在原 checklist 上的一件事**：`plan.md` §8 加入 `D-ratingband` 的風險列
  （儀表板讀分帶、本 phase 只交付分數）
