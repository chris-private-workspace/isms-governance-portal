# 07-skills — 專案專屬 AI skill 說明

**Purpose**: 記錄專案專屬的 AI agent skill / checklist 的設計與用法。
（實際的 skill 檔可能住在 `.claude/skills/`；這一層做文檔說明。）  <!-- path-check: ignore -->
**Created**: 2026-08-07
**Status**: Active

## 建議住客
- 反模式自檢 checklist（commit / 驗收前掃一次專案反覆出現的坑）
- 專案專屬的 review / verification skill 說明

## 與 memory 的分工

| | 記什麼 |
|---|---|
| **memory**（`memory/`）| **單一事實**（踩過的坑、使用者偏好、專案狀態）|
| **skill**（這層）| **一組要一起跑的檢查步驟** |

## 慣例
- Skill 的內容應該是「專案反覆踩到、值得固化成自動檢查」的東西
- 能寫成 lint 的就寫成 lint（`scripts/lint/`），skill 是給無法機械化的部分用的

模板：[`_TEMPLATE-skill.md`](./_TEMPLATE-skill.md)
