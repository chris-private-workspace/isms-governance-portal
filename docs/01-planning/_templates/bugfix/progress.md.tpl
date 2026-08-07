# BUG-{NNN} — Progress

**Status**: triaged | investigating | fixing | verifying | done | wont-fix
**Report**: [`report.md`](./report.md) · **Checklist**: [`checklist.md`](./checklist.md)

---

## 時間線

| 時間 | 事件 |
|---|---|
| YYYY-MM-DD HH:MM | 回報 |
| | 重現成功 / 失敗（怎麼試的）|
| | 假設 N：{} -> 排除，因為 {} |
| | 根因確認：`file:line` |
| | 修復完成 |
| | 驗證通過 |

> **排除掉的假設要寫下來。** 那是這份文件第二有價值的部分 ——
> 下次類似症狀，別人不用再走一次同樣的死路。

---

## 收尾摘要

**根因**：{一句話}

**為什麼測試沒抓到**：{這題必答。答不出來代表你還不知道怎麼防止再發生。}

**Regression test**：`{測試名}` —— 修前 fail、修後 pass 都實際跑過：是 / 否

**同類型掃描**：{Grep 了什麼；有沒有別處也中}

**Postmortem**：需要（Sev1/2）/ 不需要
