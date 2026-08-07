# 04-review — 審查記錄

**Purpose**: Code review / security review / architecture review 的產出記錄。
**Created**: 2026-08-07
**Status**: Active

## 建議住客
- Security review report（每次審查一份，標日期）
- 大型 code review 的 findings 匯總
- Release 前的 review checklist 結果

## 慣例
- 一次審查一份文件：`{type}-review-{YYYY-MM-DD}.md`
- Findings 需要 follow-up → 開對應 `../03-implementation/` 的 CH/BUG **並在 BACKLOG 登記**（R7）
- Review 只記**發現**與**判定**；修復過程屬 CH/BUG 那一份

## 與鄰層的分工
- 這層 = 「我們檢查了什麼、發現什麼」
- `../09-analysis/` = 「我們調查了什麼」（研究導向，非審查導向）

模板：[`_TEMPLATE-review.md`](./_TEMPLATE-review.md)
