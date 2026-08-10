# Phase W03 Progress

## Day 0 — 2026-08-10 — Plan-vs-Repo Verify

### Drift Findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D-proc-freshness** | api 進程 PID 36976 啟動於 `2026-08-09 19:30:13`，而 `dist/entity-scope/*.js` 的 mtime 是 `2026-08-09 23:50:16` —— **進程比它要執行的產物早 4h20m**。web 進程 PID 36748 啟動於 `2026-08-08 20:54`，早於 W01 交付 | 這兩個進程的**任何 runtime 觀測都不可採信**。Day 3 的 clean restart 不是可選項。⚠️ W02 記錄的是「舊 4h10m」——**幾乎是同一個進程，當時發現後並沒有真的被換掉**（Risk Class C 第 3 次）| 🟡 已知風險 → plan §8 已有一行；Day 3.1 處理 |
| **D-scopefn-shape** | `app_entity_scope()` 回傳 **`uuid[]`** 不是 `uuid`；policy 實為 `org_entity_id = ANY (app_entity_scope())`；scope 從 `app.entity_scope` 讀**逗號分隔**的 uuid 清單。函式為 `STABLE` + `SECURITY INVOKER` | plan 起草時憑記憶假設單一 uuid，probe 因此第一輪失敗。**repository 的 scope 是多值**，並行測試要用不同的 **id 集合**而非單一 id。§3.2 具體化，未推翻 | 🟡 小調整 |
| **D-jsonb-rls** ⭐ | 五案例實測（受限角色，前提已斷言）：**CASE1** 欄位 SG1 + JSONB 內宣稱 `org_entity_id=HK1` → **INSERT 被放行**；**CASE2** SG1 讀得回；**CASE3** HK1 `sees=0`（**無讀取洩漏**）；**CASE4** 欄位層級跨實體寫入 → `violates row-level security policy`（控制組成立）；**CASE5** scope 帶兩個 id → 滾升正常 | ⭐ **`WITH CHECK` 完全不管 JSONB 內容**。好消息：不造成讀取洩漏。壞消息：**catalog 驗證必須在寫入路徑，而且是唯一一道防線** —— entity scoping 有 RLS 當第二層，擴充欄位治理沒有。直接回答 `06:35` 留白的 "validation approach"，並成為 ADR-0005 的可證偽條件與 §Security impact 素材 | 🟢 §3.1 未被推翻，**被具體化** |
| **D-probe-setup** | 第一輪 probe 的 `CREATE POLICY` 因型別不符而失敗，留下一張 **FORCE-RLS 但無 policy** 的表（＝全部拒絕）。`CASE2 sg1_sees=0` / `CASE3 hk1_sees=0` **看起來像結果，實際什麼都沒證明** | **前提斷言必須涵蓋 setup，不只角色**。第二輪加入 `SETUP ok: policy present` 才有效。這是「前提沒被斷言的測量，綠紅都不可採信」的**第 2 次**（W02 第 1 次是殘留 fixture 汙染斷言）| 🟢 已修正；教訓進 retro |
| **D-scopedclient-split** | `scope-boundaries.md:120-128` **仍寫著**「型別住在契約層」的設計意圖，並自承「尚未跑過……**驗證失敗則本節與上表都要重寫**」。W02 已量到它做不到（契約層是葉節點，不能 import generated Prisma 型別）| W03 Day 2 就是那個驗證。**已加一條 Day 4 checklist 項**：用量到的三段拆法取代該節的設計意圖文字 | 🟢 已納入 checklist |
| **D-schema-claims** | `schema.prisma:95-104` 的 8 個刻意缺欄清單與 plan §0 **逐項一致**；`Policy` 全欄位確為 scalar；`extensions` 標註 `needs ADR-0005, not adopted` | plan §0 的 Root cause 表無需修正 | ✅ |
| **D-adr5-tendency** | `06:18` "JSONB for governed extensions" · `06:35` "JSONB + central field catalog; **validation approach**" —— 逐字確認 | spike 要驗的是**留白的那一半**（validation），不是重開方案比較。§3.1 的定位正確 | ✅ |
| **D-env-role** | int 測試的 global-setup 印出 `[int] isms_test rebuilt, migrated and seeded; app role isms_app_user is least-privilege.`；probe 亦實測 `isms_app_user super=false bypassrls=false` | **測試連線與 probe 連線的角色前提皆成立**。⚠️ **dev server 的連線角色尚未驗** —— 待 Day 3.1 clean restart | 🟡 部分 |
| **D-baselines** | lint 0 · type-check 0 · format 0 · unit **33**（cov 95.95/82.35/88/96.29）· web **10** · int **20** · **build 0** | 與 plan §0 宣稱**逐項一致**，無需修訂 | ✅ |

### Prong 1 — Path verify

全部符合預期：`contracts/` 與 `modules/` 僅有 `.gitkeep`；`core-model/` 僅 `prisma.service.ts` + spec；
`docs/14-adr/0005-*` 不存在（0002/0003/0005 皆無）；`design-notes/` 僅 W01/W02；
**`CH-018` 未被佔用**（grep 全 repo 的 `CH-\d+` 引用，非 `ls` 目錄 —— `AD-ChNumber-1`）。

### Go / No-Go

**GO —— 範圍變動 < 20%。**

- `D-jsonb-rls` **具體化**了 §3.1（catalog 驗證的位置從「待定」變成「必須在寫入路徑且是唯一防線」），
  但沒有推翻它 —— §5 Acceptance 與 §7 Workload 皆不需修訂
- `D-scopefn-shape` 是 probe 寫法的修正，不影響交付物
- `D-proc-freshness` 已在 plan §8，Day 3.1 有對應 checklist 項
- `D-scopedclient-split` **增加**一條 Day 4 checklist 項（文件同步），不增加設計工作

### Today's Accomplishments

- 0.1 三-prong Day-0 verify — 9 個 drift 全部有結論（3 個 ✅ · 4 個 🟢 · 2 個 🟡）
- 0.2 Branch `feature/W03-governed-extension`（從 `main` `5bbc252`）
- 額外：`D-jsonb-rls` 的五案例實測（原 checklist 只要求「最小實測」，實際做成了可直接進 ADR 的證據）

### Issue / Discovery

⚠️ **本 phase 承諾的「逐日計時」（`AD-TimeTracking-2`）在 AI 執行下做不到。**
工作由 AI session 執行，我沒有牆鐘可讀，逐項工時**無法由我自行量測** ——
W02 的 12.1 hr 也是從 commit 時間戳回推的。這使 `AD-TimeTracking-1/2` 的可行性存疑：
它們要求的資料在目前的執行模式下**只能回推，不能量測**。
**Day 4 retro 要正面處理這一條**，而不是再記一次「這次也沒計時」。

### Remaining for Day 1

- 1.1 三方案最小實測（`D-jsonb-rls` 已完成其中最關鍵的一項 —— catalog 範疇歸屬與
  「第二次呼叫」案例仍待做）
- 1.2 ADR-0005 起草與採納

### Notes

- probe 腳本保留在 scratchpad，**未進版控**（一次性量測，非常駐測試）。
  其結論已完整轉錄到本檔 `D-jsonb-rls` 一列
- `isms_dev`（compose 的 `POSTGRES_USER`）是 **superuser 且 bypassrls** ——
  compose.yml 註解已警告。所有 RLS 實測一律 `SET ROLE isms_app_user` 後進行
