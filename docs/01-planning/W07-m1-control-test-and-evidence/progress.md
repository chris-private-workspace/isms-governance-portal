# Phase W07 Progress

[Plan](./plan.md) · [Checklist](./checklist.md)

---

## Day 0 — 2026-08-12（plan-vs-repo verify）

### Today's Accomplishments

- Plan + checklist 起草（frozen template，非抄 W06）
- 使用者裁決 2 項：Scope decision (b) `result` 不建 · (e) US-4 留在本 phase
- 三-prong Day-0 verify 全跑完
- Baselines 實測

### Day 0 — Drift Findings

| ID | Finding | Implication | Verdict |
|----|---------|-------------|---------|
| **D1** | `app.module.ts` **不在** plan §4 #17 寫的 `apps/api/src/app.module.ts`；實際位置 `apps/api/src/bootstrap/app.module.ts`，六個 module 掛在 `:44-49` | plan §4 的路徑要用實際的；`task-workflow.md` §Risk Class D（plan 引用路徑靠猜）第 N 次 | 🟡 小調整 |
| **D2** | ⛔ **`D-force` 是假警報，而假警報是我自己製造的** —— 第一次用 `grep "FORCE ROW LEVEL"`（單空格）得到 3/7，實際 W05/W06 的 migration 為對齊寫成 `FORCE  ROW LEVEL`（**兩空格**）。容忍空白重查：**ENABLE 7 筆 / FORCE 7 筆，7 張表全部都有** | plan §3.x 的「FORCE RLS 全表補齊」一項作廢；新表照樣加 `FORCE`。⚠️ **這是 `feedback_evidence_must_support_claim` 的再犯** —— 用字面 grep 這個便宜代理去回答需要讀內容的問題，並且**已經當成事實對使用者講過一次** | ✅ 設計不變 / ⚠️ 紀律 |
| **D3** | `schema.prisma:448` 的「`ControlTest` does not exist until M7」建表後即 orphan claim（AP-7）。⚠️ 但 `:482` 與 `:761` 的「§4 defines lifecycles for Policy, Risk, Issue and **ControlTest** only」**不會**變 orphan —— 本 phase 給 `ControlTest` `status` 正是**依據**那句話 | 只改 `:448` 一處；**不要順手改另外兩處**（改了才是製造 orphan） | 🟡 小調整 |
| **D4** | `AssetGroup:515` / `Asset:574` 有 `@@unique([id, orgEntityId])`；`Control:754` 明文拒絕；`assets` 的複合 FK 在 `20260811024841_asset_and_risk_chain/migration.sql:214` | plan §0 的核心前提（複合 FK 這招在 `ControlTest → Control` 用不上）**成立** | ✅ 確認 |
| **D5** | ⭐ `governed_extensions/migration.sql:89-91` 記錄 **W03 已實測**：`SECURITY INVOKER` trigger 的 catalog 讀取**受 catalog 自己的 RLS 約束**，且仍看得到 global + own 列；並明寫 `DEFINER` 是 escalation surface、不得拿來「修」可見性問題 | M3 的候選機制在本 codebase **有實測前例**，spike 風險下降。⚠️ **但 M1 仍未被任何既有量測回答** —— RI（外鍵）檢查是否繞過 RLS 是另一個問題，trigger 的前例答不了它 | ✅ 降風險 |
| **D6** | `02a` §0 索引把 `Jurisdiction` / `posture_snapshot` 的 Note 寫成「**Built** without …」，而 migrations 全樹對兩個關鍵字**零命中**，且 `02a:175` 自己寫 `Jurisdiction` **is built in M2** | 索引把「規格未含某些欄位」寫成了「表已建」，會誤導後續 slice 排程。Day 4 一併更正（plan §4 #21） | 🟡 小調整 |
| **D-baselines** | lint **0**（api+web）· type-check **clean**（api+web）· test **19 suites / 192 tests passed** · coverage **statements 93.36 / branches 92.47 / functions 95.74**（門檻 80/70/80/80）· build **clean** · `run_all` **6/6** | closeout 時對比用 | ✅ |

### Go / No-Go

- D1 是路徑更正、D3/D6 是文件更正、D2 移除一個原本就在 §Out of Scope 的項目、D5 降風險
- **範圍變動 < 20% → GO**，繼續 Day 1
- 依規則**不回頭改 plan §Technical Spec**；上述 verdict 留在本檔，plan 的 §STALE placeholder 保留原文
  以維持「原本以為什麼 vs 現實是什麼」的審計軌跡

### Blockers

- 🚧 **checklist §0.2（開分支）待 PR #43 落地** —— #43 動的是 `BACKLOG.md:109`，W07 Day 4 也要改
  `BACKLOG.md`。現在從 `bb63baf` 開分支會讓兩者在同一個檔案相撞，正是 `AD-DesignNoteAnchor-1`
  第三形態的形狀。**解封條件**：#43 merged（CI 已全綠 + `mergeState=CLEAN`，等使用者按）

### 逐任務實際工時（`AD-CalibrationNoActual-1` 的執行面）

⚠️ **Day 0 沒有可靠的逐任務計時** —— 本檔的分鐘數紀錄**自 Day 1 起**用可觀察的時間戳記錄，
不回頭編 Day 0 的數字。Day 0 結束時間戳：**2026-08-12 12:27 +0800**（Day 1 的第一筆以此為起點）。

### Notes

- D2 的教訓值得帶到 Day 1 的量測：**量測結果一律讀輸出，不從 pattern 命中數推論**。
  W06 的 N4 空跑（anchor 中性化前後逐字相同）與今天的兩空格 grep 是同一個根因的兩種外觀。

---

## Day 1 — 2026-08-12（量測：RI 檢查與 RLS 的關係）

### 逐任務實際工時

| 任務 | 起 | 訖 | 實際 |
|---|---|---|---|
| 分支 §0.2（含 upstream footgun 修正）+ 讀既有接線（`int-global-setup.js` / `int-db.js` / `app_entity_scope`）| 12:27 | ~12:31 | **~4 min** |
| Round 1 腳本（M1-M4）撰寫 + 兩次 module 解析修正 + 執行 | ~12:31 | ~12:35 | **~4 min** |
| Round 2 腳本（M5-M8）撰寫 + 執行 | ~12:35 | 12:37 | **~2 min** |
| **Day 1 量測小計** | 12:27 | 12:37 | **~10 min** |

> bottom-up 對「量測」估的是 **2.0 hr**，實際 ~10 min。原因不是估錯難度，是**估算沒把
> 「量測床已經存在」算進去** —— `int-global-setup.js` 可以直接 `require()` 呼叫，
> 三個 fixture control（SG1 local / SG1-owned group / HK1 local）W06 已經種好。
> 這一項留給 Day 4 retro Q2 歸因，**不當場調乘數**（單點不調，需 3-phase 證據）。

### 量測結果（真 PostgreSQL `isms_test`，app role `isms_app_user`，非 superuser 且 `rolbypassrls=false`）

**實驗對照組** —— HK1 範疇下對三個 control 的可見性：
`a50` SG1 entity-local → **0 列**（看不到）· `a51` SG1 擁有的 group → 1 列 · `a52` HK1 own → 1 列。

| # | 問題 | 結果 |
|---|---|---|
| **M1** | 無 trigger 時，HK1 寫一列 `control_id` = `a50`（**存在但 HK1 完全看不到**）| ⛔ **INSERT 成功** —— **RI（外鍵）檢查繞過 RLS** |
| **M2** | 同上但指向 `a51`（group，可見）| 成功（依 `02a:415` 這是合法的）|
| **M2b** | 指向自己的 `a52` | 成功 |
| **M2c** | 指向**完全不存在**的 id | 拒絕 `23503` |
| **M3** | **無 FK**（Evidence 形狀），`linked_id` = `a50` | 成功 —— 沒有任何東西反對 |
| **M3b** | 無 FK，`linked_id` = 純垃圾 | **也成功** —— 連「指向真實存在的東西」都沒人管 |

⭐ **M1 + M2c 合起來就是一個 oracle**：指向別人的私有列 → 成功；指向不存在的 id → `23503`。
呼叫者因此能分辨「存在但不是你的」與「不存在」——
**正是 約束 8 要求查無資料回 404 而非 403 的那個洩漏，只是發生在資料庫層而不是 HTTP 層。**

### 候選機制的量測（`BEFORE INSERT OR UPDATE` + `SECURITY INVOKER` trigger，`NOT EXISTS → RAISE 42501`）

| # | 問題 | 結果 |
|---|---|---|
| **M4a** | 裝上 trigger 後重跑 M1 | 拒絕 `42501` ✅ |
| **M4b** | 裝上 trigger 後重跑 M2（group）| 仍然成功 ✅ —— **合法路徑未被誤擋** |
| **M5** | ⭐⭐ **trigger 是關掉 oracle，還是只換個編號？** | **關掉了** —— 「存在但不可見」與「不存在」**都回 `42501`**，兩者不可分辨 |
| **M6** | UPDATE 路徑：把自己的列重新指向不可見的父列 | 拒絕 `42501` ✅（`BEFORE INSERT **OR UPDATE**` 是必要的）|
| **M7** | 合法路徑（own / group）在 trigger 開著時 | 兩者皆成功 ✅ |
| **M8** | **中性化**：`DISABLE TRIGGER` 後重跑 M5a | **轉為成功** ✅ —— 證明**擋住它的確實是 trigger**，不是別的東西 |

**M5 為什麼是關鍵**：BEFORE trigger **先於** FK 檢查執行，所以不存在的 id 也走 `NOT EXISTS` 分支、
同樣拿到 `42501`，`23503` 根本沒機會發生。如果順序相反，就會變成「不存在 → 23503 /
存在但不可見 → 42501」——**oracle 會原封不動地活下來，而外觀上像修好了**。這一項不量就會漏。

**M8 為什麼要跑**：W06 的 N4 空跑教訓 —— 沒有中性化過的「擋阻機制」不算被驗證過。
這次把中性化直接寫進量測腳本，而不是留到 Day 3。

### 由結果導出的機制選擇

- **`ControlTest.control_id` → `controls`**：複合 FK 不可用（`Control:754` 明文拒絕），
  單純 FK **不足**（M1）→ **`BEFORE INSERT OR UPDATE` SECURITY INVOKER trigger**，
  條件 `NOT EXISTS (SELECT 1 FROM controls WHERE id = NEW.control_id)`，`RAISE ... ERRCODE '42501'`。
  前例：`governed_extensions/migration.sql:89-91`（W03 已實測 trigger 讀取受 RLS 過濾）。
- **`Evidence.linked_id`**：沒有 FK，所以 trigger **同時扮演缺席的 FK**（M3b：垃圾 id 也會被擋）。
  因 `linked_type` 只有 `control_test` 一個值（Scope decision (a)），trigger 檢查 `control_tests`。
- ⚠️ **不需要**新的 ADR —— 這不是「選 A 不選 B」的取捨，是量測排除了其他選項後剩下的唯一可行解。
  它會約束後續 27 張表，所以歸屬 **design note**（本 phase 已預定產出）而非 ADR。

### Notes

- 量測腳本**不進 repo**（plan §3.1）—— 進 repo 的是它導出的 policy / trigger 與測試。
  兩個腳本留在 scratchpad：`w07-m1-measure.js`（M1-M4）· `w07-m5-oracle.js`（M5-M8）。
- `isms_test` 被兩次 `globalSetup()` 重建；那是它每次跑測試都會發生的事，非額外副作用。

---

## Day 2 — 2026-08-12（兩張表 + 兩組端點 + 隔離修補）

### 逐任務實際工時

| 任務 | 起 | 訖 | 實際 |
|---|---|---|---|
| schema（2 enum + 2 model + header/orphan-claim 更正）| 12:37 | ~13:05 | **~28 min** |
| migration：Prisma 產生 + 手寫 GRANT / RLS / policies / trigger | ~13:05 | ~13:30 | **~25 min** |
| ⚠️ SQLSTATE 改判（42501 → 23503）+ surgical 回滾 + 重新量測 | ~13:30 | ~13:45 | **~15 min** |
| scoped-client 型別 + 2 repository + 2 controller + 2 module + wiring | ~13:45 | ~14:10 | **~25 min** |
| int seed + 2 個 int spec + 修 3 個失敗 | ~14:10 | ~14:28 | **~18 min** |
| 4 個 unit spec + coverage 歸因 + 補 4 個分支測試 | ~14:28 | ~14:38 | **~10 min** |
| US-4 `extension_fields`（紅測試 → migration → 綠）| ~14:38 | ~14:43 | **~5 min** |
| **Day 2 小計** | 12:37 | 14:43 | **~2 hr 6 min** |

> bottom-up 對 Day 2 涵蓋的任務估 **~10.5 hr**（表 2.5+2.0 · 表 2.0+2.0 · int 2.5 ·
> extension_fields 1.0，扣掉 Day 3 的部分）。實際 ~2.1 hr。與 Day 1 同一個方向、同一個原因：
> **既有藍本的複用率遠高於 bottom-up 的假設** —— 五個 repository / controller / int spec 的形狀
> 已由 W03-W06 定死，寫的是差異不是全部。留給 Day 4 retro Q2，**不當場調乘數**。

### 交付

| 項目 | 狀態 |
|---|---|
| `control_tests` · `evidence` 兩張表 + migration | ✅ |
| `assert_parent_in_scope()` trigger（2 個 table 各一個 trigger）| ✅ |
| `/control-tests` · `/evidence` 端點（掛進 `app.module.ts:50-51`）| ✅ |
| `extension_fields` per-command 拆分 | ✅ **紅 → 綠**（見下） |
| `risks` int 11b carryover | ⏳ **Day 3**（與元驗證一起做才驗得出「會轉紅」）|

### ⭐ Day 2 的三個發現

**一、SQLSTATE 選錯了，而 `scope-refusal.ts` 早就寫好了正確答案。**
trigger 原本 raise `42501`，那會讓 repository 只能丟 `ScopeRefusedError` ——
訊息是「org entity X not found」，但真正錯的是 `control_id`：**歸因錯誤的 404**。
改成 `23503`：`UnknownReferenceError` 的 docstring 寫的正是這個情境
（「either because no such record exists, or because it belongs to another entity」），
且它**只帶欄位名不帶 id**。改完**重新量一次**（不因為「只是改個常數」就假設 M5 的結論還成立）——
oracle 仍關閉（兩者同為 `23503`），且現在兩個訊號各說各的：
父列不可達 `23503`（欄位名）· 列自身越界 `42501`（org entity）。

**二、⭐ `AD-BorrowedRefusal-1` 第三次，新形狀：trigger 跑在該列自身的 `WITH CHECK` 之前。**
兩個「釘 INSERT policy」的測試第一版都是**綠的**，但綠的原因是 trigger 先擋 ——
那張表自己的 `WITH CHECK` **從未被評估**。前兩次是 ref-code counter（W05）與 `RETURNING`（W06），
這次是 trigger。修法：讓 trigger 通過（父列取當前範疇讀得到的），`WITH CHECK` 才是唯一還能拒絕的。
⛔ **依 `.claude/rules/README.md` 強度階梯，第 3 次應改結構性解法** —— 見 Day 4 的 AD。

**三、Prisma 會改寫 `23503` 的訊息，不改寫 `42501`。**
`23503` → "Foreign key constraint violated"（trigger 自己的文字被丟掉）；
`42501` 它沒有對應，所以原樣透出。所以斷言 PostgreSQL 原始訊息只對 RLS 有效。
`scope-refusal.ts` 讀 SQLSTATE 而非文字，正是為了這件事 —— 兩個碼都完整到達 repository。

### US-4：先看到紅

```
修補前：expect(result.count).toBe(0)  →  Received: 1
        SG1 成功把 org_entity_id IS NULL 的 group 宣告改成自己名下
修補後：104 skipped, 1 passed
```

根因寫進 migration：`UPDATE` 的兩個子句作用在**不同的列** —— `USING` 看舊列（group，通過）、
`WITH CHECK` 看新列（已改成自己，通過）。拆成 per-command 後兩側同一條件，兩步走不出去。
⛔ DELETE 半段**不補 policy** —— 缺少 GRANT 已經擋住，且 privilege 檢查在 RLS 之前（W06 test 10）。

### Gate（實際輸出，非「都過了」）

> ⛔ **這張表的前三列在 Day 3 被推翻，見 Day 3 §「兩個假 gate 宣稱」。**
> `format:check` 與 `type-check` 當時**其實是紅的**（`apps/api` 各兩個問題），
> 而我用 `tail -N` 讀多 workspace 的 npm 輸出，只看到最後一個（web）的成功訊息。
> 下表保留原樣不修改 —— 那是當時真的寫下的東西，改掉就銷毀了證據。

| Gate | 結果 | vs Day-0 baseline |
|---|---|---|
| lint（api + web）| **0** | = |
| format:check | all files pass | = |
| type-check（api + web）| clean | = |
| unit test | **23 suites / 235 tests passed**（+43）| 192 → 235 |
| coverage | stmt **92.58** · br **92.32** · fn **96.26** · lines **94** | stmt −0.78 · br −0.15 |
| int test | **8 suites / 105 tests passed**（+1）| 104 → 105 |
| build（api + web）| clean | = |
| `run_all` | **6/6** | = |

**coverage 退步的歸因**（W06 的做法：先歸因再補，不塞測試湊數）：
第一次跑是 stmt 91.83 / br 90.41。branches 的降幅是**真的**（module 檔無分支，不可能是它們造成的），
所以逐處查出四個未走到的分支並各補一個**帶主張**的測試（非字串 `testerUserId`、epoch number
`scheduledFor`、evidence 的非物件 `extensions`、未知資料庫錯誤原樣拋出）→ br 90.41 → **92.32**。
**剩下的差距全部是兩個新 `.module.ts` 的 0%**，與既有四個 module 檔完全一致；
W07 新增的**每一個非 module 檔案都是 100% statements**。

### Notes

- `isms_dev` 曾為了改 SQLSTATE 做過一次 surgical 回滾（只 drop 這個 migration 幾分鐘前建的
  兩張表 / 兩個 type / 一個 function / 兩個 trigger + 刪 `_prisma_migrations` 一列），未動其他物件。
- `git checkout -b X origin/main` 會把 upstream 設成 `origin/main` —— 裸 `git push` 會推 main。
  已 `--unset-upstream`；push 時用 `-u origin <branch>`。

---

## Day 3 — 2026-08-12（API-level 驗證 + 元驗證）

### 逐任務實際工時

| 任務 | 起 | 訖 | 實際 |
|---|---|---|---|
| 進程盤點（3210 空 / 3200 是別人的）+ rebuild + 啟動 + startup log | 14:43 | ~14:58 | **~15 min** |
| 主路徑 API-level（SG1 → HK1 → SG 滾升，三次啟動）| ~14:58 | ~15:12 | **~14 min** |
| carryover：`risks` int 11b 改 `createMany` | ~15:12 | ~15:15 | **~3 min** |
| 元驗證 harness + 8 輪中性化 + N7 錨點修正重跑 | ~15:15 | ~15:50 | **~35 min** |
| ⛔ 兩個假 gate 宣稱的發現與修正 | ~15:50 | ~16:05 | **~15 min** |
| **Day 3 小計** | 14:43 | 16:05 | **~1 hr 22 min** |

> 時間戳說明：本節的分鐘數以工具呼叫的實際間隔記錄；`date` 在 14:43 與 15:14 各取過一次，
> 中間的分段是估到最近的 5 分鐘，**不是精確計時**。標示出來以免下游把它當成秒級資料。

### ⚪ 環境（沒有殺任何不屬於本 session 的東西）

- **port 3210 開始時沒有 listener** —— 沒有陳舊 api 進程要清
- **port 3200 有一個 Next.js dev server（PID 36748，啟動於 2026-08-08 20:54）** ——
  比本 session 早四天，**不是我開的**，依 `local-runtime-ops.md` §4 沒有碰它。本 phase 無 UI，也不需要它
- 全程只殺過我自己在本 session 啟動的 api 進程（5944 → 60444 → 36672），
  每次殺之前都先確認 `StartTime` 與 PID
- PostgreSQL：`docker/compose.yml` 已 up 2 天（healthy），未重啟

### Startup log 證明 wiring 生效（不是推測）

```
[InstanceLoader] ControlTestModule dependencies initialized
[InstanceLoader] EvidenceModule dependencies initialized
[RouterExplorer] Mapped {/control-tests, GET} route
[RouterExplorer] Mapped {/control-tests, POST} route
[RouterExplorer] Mapped {/evidence, GET} route
[RouterExplorer] Mapped {/evidence, POST} route
[DevPrincipal] WARN  DEV PRINCIPAL ACTIVE — ... (SG1) ... not by any credential
```

### ⚪ API-level 驗證（真進程 + 真 PostgreSQL `isms_dev`）

**⛔ 這不是 drive-through。** 這兩組端點**沒有 UI**，所以本節只證明「API 會回應且行為正確」，
**不主張任何可用性**。依 `verification-discipline.md` §適用範圍的純後端豁免。

**scope = SG1**

| 動作 | 觀察 | 預期 |
|---|---|---|
| `GET /control-tests`（前）| 200, 0 rows | ✅ |
| `POST /control-tests`（自己的 control）| **201** `ref=CTST-SG1-000001 status=scheduled scheduledFor=2026-09-30T00:00:00.000Z _devPrincipal=true` | ✅ |
| `GET /control-tests`（後）| 200, 1 row | ✅ |
| `POST /evidence`（綁那個 test）| **201** `ref=EVID-SG1-000001 linkedType=control_test` | ✅ |
| `GET /evidence` | 200, 1 row | ✅ |
| `POST /control-tests` 指向 **HK1 私有 control** | **404** `{"message":"control or tester not found"}` | ✅ |
| `POST /control-tests` 指向**不存在的 id** | **404** `{"message":"control or tester not found"}` | ✅ |
| ⭐ **oracle 在 HTTP 層** | **CLOSED —— status 與 body 完全相同** | ✅ |
| `POST /evidence` 指向不存在的 test | **404** `{"message":"linkedId not found"}` | ✅ |
| `POST /control-tests` `orgEntityId=HK1` | **404** `{"message":"org entity ...c1 not found"}` | ✅ |
| `POST /control-tests` 壞的 `scheduledFor` | **400** `scheduledFor must be an ISO-8601 string when present` | ✅ |
| `POST /evidence` 空 `hash` | **400** `hash is required and must be a non-empty string` | ✅ |

⭐ **Day 2 的 SQLSTATE 改判在這裡看得見價值**：父列不可達回「control or tester not found」、
列自身越界回「org entity ... not found」——**歸因正確**，而兩者都是 404、都不洩漏存在性。

**scope = HK1**（重啟，`DEV_PRINCIPAL_ENTITIES=HK1`，startup log 確認 `assignment (HK1)`）

| 動作 | 觀察 |
|---|---|
| `GET /control-tests` | 0 rows —— 看不到 `CTST-SG1-000001` |
| `POST /control-tests` 指向 **SG1 的 group control** | **201** `CTST-HK1-000001` ✅ **合法的跨實體引用** |
| `POST /control-tests` 指向 SG1 私有 control | **404**，訊息與上面完全相同 |
| 再讀 `GET /control-tests` | `CTST-HK1-000001` —— **只有自己的** |

⚠️ 第一次讀是 0 rows，而「HK1 看不到 SG1 的列」與「HK1 沒有列」在那時是**同一個觀察**。
所以在 HK1 建了自己的列之後**再讀一次**，雙邊都有資料時才算真的量到隔離。

**scope = SG + roll-up**（第三次重啟）：`CTST-SG1-000001` / `EVID-SG1-000001` 可見，
`CTST-HK1-000001` **不可見** —— 四個範疇問題在 HTTP 層全部驗完。

### 元驗證：8 個機制逐一中性化

中性化改的是 **migration**，不是活資料庫 —— int suite 每次 `globalSetup` 都會 drop/recreate
`isms_test`，直接改資料庫會在任何測試執行之前被洗掉，然後整輪回綠而什麼都沒證明。
每一輪都先斷言**位元組真的變了**才跑（W06 的 N4 是靜默 no-op）。

| # | 中性化的機制 | 結果 |
|---|---|---|
| N1 | `control_tests_read` USING → `true` | **RED ×1** |
| N2 | `control_tests_insert` WITH CHECK → `true` | **RED ×1** |
| N3 | `evidence_read` USING → `true` | **RED ×1** |
| N4 | `evidence_insert` WITH CHECK → `true` | **RED ×1** |
| N5 | `control_tests` 的 trigger 移除 | **RED ×3** |
| N6 | `evidence` 的 trigger 移除 | **RED ×2** |
| N7 | `risks` WITH CHECK → `true`（carryover 驗收）| **RED ×1** |
| N8 | `extension_fields_update` USING 還原成修補前形狀 | **RED ×1** |

**8/8 —— 每個宣稱會擋東西的機制，都有至少一個測試在它被移除時轉紅。**
所有 migration 事後以 `git diff` + grep 確認**逐位元組還原**（無殘留 `NEUTRALISED` / `(true)`）。

⛔ **N7 第一次跑是「STAYED GREEN」，而那是我的量測錯誤不是發現。**
我的錨點 `WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));` 在那個 migration 裡出現**三次**
（`asset_groups` / `assets` / `risks`），`String.replace` 換掉第一個 ——
**我中性化的是 `asset_groups`，`risks` 從未被動過**。改用完整 policy 區塊當唯一錨點後重跑：RED ×1。
零轉紅先查是不是假象，這條規則今天第二次救回一個錯誤結論。

### ⛔ 兩個假 gate 宣稱（Day 2 報告的更正）

Day 3 收尾跑 gate 時發現 **`format:check` 與 `type-check` 在 Day 2 其實都是紅的**：

- `format:check`：`evidence.repository.spec.ts` · `scoped-client.types.ts` 兩個檔案未過
- `type-check`：`control-test.controller.spec.ts:122` · `evidence.controller.spec.ts:112` 各一個
  **TS2353**（spec 故意送出 body 型別沒有的欄位，但沒有 cast）

**根因是同一個**：我用 `... 2>&1 | tail -N` 讀**多 workspace** 的 npm 輸出。
兩次都是 `apps/api` 失敗、`apps/web` 成功，而 `tail` 只留下最後一個 workspace 的成功訊息。
**`tail -N` 用在多 workspace 輸出上就是一個會藏住失敗的過濾器** ——
與 CLAUDE.md 禁止 `lint --silent` 是同一族的錯誤，我在同一天違反了它自己記載的那條教訓。

⚠️ 另一個相關事實：jest 不做完整型別檢查（TS2353 在測試裡不會炸），
所以那兩個型別錯誤**只有 `tsc --noEmit` 抓得到** —— 235 個測試全綠並不涵蓋它。

已修正並以**逐 workspace 可見**的方式重驗（兩個 header 都在、中間無 error）。
→ Day 4 記一條 AD：gate 輸出的讀法本身需要一條規則。

### Gate（Day 3 收尾，實際輸出）

| Gate | 結果 |
|---|---|
| lint（api + web）| **0**，兩個 workspace 皆可見 |
| format:check（api + web）| **All matched files use Prettier code style!** ×2 |
| type-check（api + web）| clean，兩個 workspace 皆可見 |
| unit test | **23 suites / 235 tests passed** |
| coverage | stmt **92.58** · br **92.32** · fn **96.26** · lines **94** |
| int test | **8 suites / 105 tests passed** |
| build（api + web）| clean |
| `run_all` | **6/6** |

### Notes

- 結束時 port 3210 **無 listener**（已確認 count=0）—— 沒有留下背景進程。
- `isms_dev` 現有 W07 的驅動資料（`CTST-SG1-000001` / `CTST-HK1-000001` / `EVID-SG1-000001`），
  那是 dev 資料庫的常態，不是測試污染（int 跑在 `isms_test`，每次重建）。
