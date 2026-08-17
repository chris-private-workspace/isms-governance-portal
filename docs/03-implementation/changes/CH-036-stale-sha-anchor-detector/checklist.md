# CH-036 — Checklist

> 從 [`spec.md`](./spec.md) §Acceptance 導出。
> 🔴 **只能 `[ ]` → `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

---

## 🔴 執行順序的硬 gate

**§3 的文件修正不得早於 §2.3 的人工複核。** 使用者裁決「一併修那 ~40 處」，
但判準未複核就動文件 = 判準有誤時改錯地方且要改回來。
⇒ **§2.3 未勾之前，§3 一項都不准開始。**

---

## 1. 實作

- [x] **1.1 `scripts/lint/check_sha_anchors.py`** —— detector 本體
  - DoD: `find_violations(repo_root) -> list[Violation]` 純函式；`Violation` 是 **NamedTuple**
    （非 dataclass —— `lint-detector-authoring.md:120-121` importlib 相容性）；
    `main()` 只做 argparse + 印出；支援 `--root`
  - DoD: pattern 是 `\b([0-9a-f]{7}|[0-9a-f]{40})\b`，**不是 `{7,40}`**（AC-2 / D2）
  - DoD: docstring 記下「7 位縮寫」這個假設何時會失效、屆時怎麼辦（D2 的脆弱點）
  - Verify: `python scripts/lint/check_sha_anchors.py --root .`

- [x] **1.2 判準：在 `origin/main` 或當前 HEAD 上**（D1）
  - DoD: 兩者皆不可達才算違規；**不是**只問 `origin/main`（那會讓每個 closeout PR 自己紅）
  - DoD: `origin/main` 不存在時**不得靜默放行** —— 要明確報錯（`AD-NegativeGate-1`）
  - Verify: 在 feature 分支上跑 → 該分支自己的 SHA 不告警

- [x] **1.3 2a / 2b 區分邏輯**（D3 —— 本 CH 最難的一項）
  - DoD: 三條放行規則：(a) 行內含 `改寫`/`死值`/`不在 main`/`rebase`/`repoint`/`已失效`；
    (b) `X → Y` 且**左死右活**；(c) tag `refs/tags/archive/*` 可達
  - DoD: ⛔ **`X → Y` 兩側都死 ⇒ 一定告警**（量測窗口的重載反例：`W15/retrospective.md:85`）
  - Verify: 告警數 ≈ 40 而非 120

- [x] **1.4 效能：不在迴圈裡逐個 spawn git**（`lint-detector-authoring.md:89-90`）
  - DoD: 唯一 token 去重後**一次** `git cat-file --batch-check` 解析，
    再一次 `git rev-list` 取 main 可達集合；全 repo 跑完在數秒內
  - Verify: 計時輸出

- [x] **1.5 無條件 self-test（雙向）**（D5 / AC-4）
  - DoD: 每次真實掃描**之前**跑；baseline 必須過 **且** 破壞版必須被抓，
    任一不成立即 exit 1（`check_backlog_counts.py:250-256` 的慣例）
  - Verify: 暫時弄壞 self-test 的 fixture → detector 應該 exit 1

- [x] **1.6 註冊進 `run_all.py` 的 `DETECTORS`**（`:52-71`）
  - DoD: `run_all` 從 8/8 → **9/9**
  - Verify: `python scripts/lint/run_all.py`

- [x] **1.7 `ci.yml` 的 `gates` job 加 `fetch-depth: 0`**（使用者裁決）
  - DoD: 比照 `security-scan.yml:72-76` 附**理由註解**（為什麼這個 job 需要全歷史）
  - Verify: AC-8 的 CI log

## 2. 測試與複核

- [x] **2.1 `scripts/lint/tests/test_sha_anchors.py`**（`unittest`，非 pytest）
  - DoD: 含 `lint-detector-authoring.md:218` 的**兩個必備**：註解裡的假陽性 · docstring 裡的假陽性
  - DoD: 四類長度誤報各一（日期 8 · run ID 11 · migration timestamp 14 · checksum 前綴 8）
  - DoD: `X → Y` 左死右活放行 · **兩側都死被抓** · tag 保留的 `31f76e2` 放行
  - DoD: `test_live_repo` 對**真實檔案**跑（`test_backlog_counts.py:69-72` 的慣例）
  - Verify: `python scripts/lint/tests/test_sha_anchors.py`

- [x] **2.2 AC-2 —— 分類數字與 spec 的量測逐項對得上**
  - DoD: 類 2 = 120 處 / 53 token · 類 4 殘留 = 1 · 類 3 = 3 處
  - DoD: ⛔ **對不上要查清楚，不准調數字遷就**
  - Verify: detector 的 `--stats` 輸出 vs spec §Problem 的表

- [x] **2.3 🔴 AC-3 —— 人工複核 2a/2b 判準**（§3 的前置 gate）
  - DoD: detector **逐條列出**被判為 2a（放行）的清單
  - DoD: 我**逐條讀過**並確認每一條放行都正確；誤判寫進 `progress.md`
  - DoD: ⚠️ 若判準有誤 → 修 1.3 後重跑；連續兩次仍有誤 → **退回 warning 並記 AD**（AC-7 的退場條件）
  - Verify: `progress.md` 有複核記錄與逐條結論

## 3. 既有壞錨點修正（使用者裁決；🔴 2.3 未勾不得開始）

- [x] **3.1 建立舊 SHA → 新 SHA 的對應表**
  - DoD: ⚠️ gc 已跑，舊物件不存在 ⇒ **靠 commit subject + author date 比對**
    （`git log --format='%h %ad %s'`），不能靠 `git show`
  - DoD: 查不到對應的逐一列出並說明處置（不是靜默跳過）
  - Verify: 對應表寫進 `progress.md`

- [x] **3.2 逐處重指 ~40 個 2b 壞錨點**
  - DoD: 只改 SHA，**不改敘述**；文件行數不變（`AD-MdAnchorLineShift-1`）
  - DoD: 已知重點：`CH-034:75`（中性化預測）· `W16/retrospective.md:83` ·
    `CALIBRATION-LOG.md:99`（W15 量測窗口兩端）· `W01/retrospective.md:52` + `CALIBRATION-LOG.md:384`
    （W01 工時論證）· `W16/progress.md:249/250/510`（三格工時表）
  - Verify: 逐檔 `git diff --numstat` 確認行數不變

- [x] **3.3 AC-9 —— detector 對全樹回報零違規**
  - DoD: ⛔ 這是**唯一能證明「真的修完」的斷言**
  - Verify: `python scripts/lint/check_sha_anchors.py --root .` → 0 violations

## 4. 驗收（對應 spec §Acceptance）

- [x] **AC-1 ~ AC-7 逐條確認**
  - Verify: `python scripts/lint/run_all.py` **9/9** + 測試檔全綠
- [ ] 🚧 **AC-8 —— CI 上 `origin/main` 可解析** —— **阻塞：本機答不出來**
  - 🚧 解封條件：PR 開出後看 `gates` job 的 log。`actions/checkout@v4` 在 `pull_request`
    事件下是否建立 `refs/remotes/origin/main`，我手上**只有依已知行為的推導**
  - DoD: ⭐ **貼出 CI log 行**，不接受推導
  - DoD: 若實測不可解析 → 改為 detector 自行 `git fetch origin main`，並更新 spec D4
  - Verify: PR 的 CI log
- [x] **既有 8 個 detector 逐位不變**
  - Verify: `run_all` 輸出對照

## Drive-through

- [x] ⚪ **N/A —— 純 lint 工具，gate-only verified**
  - ⛔ 非省略：零端點、零 UI、零 CLI 使用者路徑
  - ⭐ **AC-8 的 CI 實測是這一層的等價物** —— 本機綠而 CI 跑不起來是本 CH 最可能的失敗方式

## 5. 收尾

- [ ] 🚧 `progress.md` 寫完成摘要 ✅，`spec.md` status → `done` —— **阻塞於 AC-8**
      （現為 `active`；CI 驗證前標 `done` 就是宣稱一件沒被證明的事）
- [x] `ROADMAP.md` 主線第 9 列 ⬜ → **🟡 而非 ✅** —— 該列標題有兩個交付物，
      `file:line` 內容比對**仍不存在**；標 ✅ 會讓剩下那一半消失（理由寫在該列）
- [x] BACKLOG 同步（R7）：`AD-DesignNoteAnchor-1` / `AD-RebaseStaleShaRef-1` 的 detector 部分關閉；
      新 AD 加入（未填 `<sha>` 佔位符 · 7 位縮寫假設 · 錨點慣例）；**計數照 detector 印的抄**
- [x] 架構級決定有 ADR（R5）—— 預期 **無**（一支 lint 工具不約束未來架構）
- [ ] PR：push → CI → `gh pr view --json state,mergedAt` **驗證** merged → 翻 `PR-pending`
