# Pull Request

## Summary

<!-- 1-3 句。改了什麼、為什麼。 -->

## Phase linkage

- Phase plan: `docs/01-planning/W{NN}-{slug}/plan.md`
- Phase checklist: `docs/01-planning/W{NN}-{slug}/checklist.md`
- Progress doc: `docs/01-planning/W{NN}-{slug}/progress.md`
- Change record: `docs/03-implementation/<type>/<ID>-<slug>.md`

## Anti-Patterns Checklist

<!-- 見 .claude/rules/anti-patterns-checklist.md -->

- [ ] **AP-1** 不是 side-track（從主入點可追蹤到呼叫）
- [ ] **AP-2** 不跨目錄散落（建新東西前 Grep 過了）
- [ ] **AP-3** 不是 Potemkin（有實際邏輯 + 負面測試 + drive-through）
- [ ] **AP-4** 不是無計畫 PoC（有 deadline + 決策出口）
- [ ] **AP-5** 沒有「為未來預留」的抽象（有當前真實使用案例）
- [ ] **AP-6** Mock 與 real 共用介面 + mock 模式有標示
- [ ] **AP-7** 無版本後綴 + 命名一致 + 註解無 orphan claim

## Scope Boundaries

- [ ] 所有新檔案明確歸屬於一個範疇
- [ ] 跨範疇型別來自共用契約層（沒有平行定義）
- [ ] 沒有反向依賴（低層 import 高層）

## Verification

### Gates（本機跑過）

- [ ] `<format 指令>`
- [ ] `<lint 指令>` — **無 `--silent`**
- [ ] `<type check 指令；無型別系統則填 echo 'n/a'>`
- [ ] `<test 指令>`
- [ ] `python scripts/lint/run_all.py`

### Drive-Through（user-facing 功能 MANDATORY）

<!-- 見 .claude/rules/verification-discipline.md -->

- [ ] 開真 UI + 真後端 + 真服務走完主路徑
- [ ] 逐控件走查：可點 / 有效果 / 標籤真實 / 結果渲染
- [ ] 截圖 + observed-vs-intended 已附（progress.md Day 3）

**Verdict**: ✅ DRIVE-THROUGH PASS / ⚪ N/A（純後端 —— 本 PR 為 **gate-only verified**）

> ⚠️ 沒開過車就**不要**寫「verified」。寫「gate-only verified」。

## Test plan

<!-- 條列：怎麼驗證的。含負面測試（關掉會壞什麼）。 -->

-
-

## Impact

- **Breaking change**: yes / no
- **Migration required**: yes / no
- **Config change**: <新增/變更的環境變數>
- **Rollback**: <怎麼回滾>

---

🤖 依 `.claude/rules/task-workflow.md` §Before Commit Checklist
