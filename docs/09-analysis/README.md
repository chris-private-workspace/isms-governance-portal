# 09-analysis — 深度分析報告

**Purpose**: 一次性的調查 / research / 診斷報告。
**Created**: 2026-08-07
**Status**: Active

> **索引在 [`INDEX.md`](./INDEX.md) —— 每份新增必須加 1 行。**

## 與 02-architecture 的分工

| | 性質 |
|---|---|
| `../02-architecture/` | **持久的架構真理**（應該長怎樣）|
| 這層 | **某個時間點的調查快照**（當時實際長怎樣 / 查到什麼）|

## 建議住客
- 技術調查報告：`{topic}-investigation-{YYYYMMDD}.md`
- 外部研究產出（vendor 比較 / 業界做法 / 標準）
- 複雜 bug 或品質問題的根因分析
- **現實檢查 / 落差審計**（實際做到 vs 宣稱做到）—— 這類最有價值也最容易沒人寫

## 慣例
1. **檔名含日期**，天然按時間排序
2. **開頭寫明「這是 YYYY-MM-DD 的快照」** —— 避免半年後被當成現況
3. 一個批次的多份分析放**子目錄**，不要平鋪
4. 調查得出架構決定 → 決定進 `../14-adr/`，分析報告留這層做佐證
5. 調查識別出待辦 → 進 `../01-planning/BACKLOG.md`（R7）

模板：[`_TEMPLATE-analysis.md`](./_TEMPLATE-analysis.md)（查自己的系統）· [`_TEMPLATE-research.md`](./_TEMPLATE-research.md)（查外部知識）
