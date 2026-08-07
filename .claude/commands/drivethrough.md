---
description: Drive-through 驗收 — 開真 UI + 真後端走完主路徑，逐控件走查
---

# Drive-Through Acceptance

**Gate 全綠只證明零件對；curl 通過只證明 API 會回應。兩者都不證明「人能真的用」。**

先讀 `.claude/rules/verification-discipline.md`（already in context）。

## 1. Clean Restart（先做，否則驗證的是舊程式）

只在**程序啟動時**生效的修正（wiring / env / DI singleton），
對著已在跑的 dev server 驗證會看起來「沒生效」。

- [ ] 列出所有相關程序（含 spawn 出來的 worker —— 它們的 cmdline 可能不含 server 名字）
- [ ] 檢視 PID / PPID / StartTime → 殺掉父程序已死、或 StartTime 早於本次重啟的
- [ ] 確認 port 空出，新程序是**唯一擁有者**
- [ ] **擷取證明 wiring 生效的 startup log 行**

⚠️ 孤兒 worker 可能因 SO_REUSEADDR 仍在服務該 port，而依 PID kill 完全漏掉它。
**要驗證的是「活著的服務程序」，不是「port 擁有者 PID」。**

## 2. 走完主路徑

用**真實服務**（非 mock / 非 echo）觸發功能的主要使用路徑，從頭到尾。

## 3. 逐控件走查（核心）

對路徑上的**每一個**控件填這張表：

| 控件 / 步驟 | 可點？ | 有效果？ | 標籤真實？ | 結果渲染？ | 備註 |
|------------|-------|---------|-----------|-----------|------|

四個問題的意思：

- **可點？** —— 有 handler 嗎（不是死控件）
- **有效果？** —— 點了真的發生事情嗎（不是空 handler）
- **標籤真實？** —— 顯示的值是真的嗎（不是硬編碼 / 不是誤導）
- **結果渲染？** —— 後端回了，畫面上看得到嗎

任何一格 ❌ = **AP-3 Potemkin**，修到能用才算 done。

## 4. Observed vs Intended

| 步驟 | 預期 | 實際 | 判定 |
|------|------|------|------|

## 5. 證據

- [ ] 截圖 → `docs/01-planning/W{NN}-{slug}/artifacts/`
- [ ] 上面兩張表寫進 progress.md Day 3
- [ ] **Verdict**: ✅ DRIVE-THROUGH PASS / ❌ FAIL（修正後重跑）

## 誠實回報規則

| 你做了什麼 | 你可以寫什麼 |
|-----------|------------|
| 跑了 gate | 「gate-only verified」 |
| 跑了 curl / API 測試 | 「API verified, UI 未驅動」 |
| **實際開車走完** | 「drive-through PASS」 |

❌ **絕不**在沒開車的情況下寫「verified」或「~X% working」。

## 純後端 / 純 infra 的例外

沒有人會透過 UI 驅動的東西可以豁免，
**但報告必須明確寫「gate-only verified」**，不可暗示可用性。
