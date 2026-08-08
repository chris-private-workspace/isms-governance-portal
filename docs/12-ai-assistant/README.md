# 12-ai-assistant — AI 協作素材

**Purpose**: 給 AI coding agent 用的素材：session 起手 prompt、詳版 onboarding、交接模板。
**Created**: 2026-08-07
**Status**: Active

## 住客

```
12-ai-assistant/
├── 01-prompts/
│   ├── session-start.template.md      <- 詳版 onboarding：session 起手載入的快照
│   ├── compact-session.template.md    <- /compact 之前用的摘要格式（**模版，勿就地改**）
│   ├── compact-session.md             <- ↑ 的專案專屬實際版（本專案用這份）
│   └── SESSION_SUMMARY.template.md    <- slim 摘要（若有 SessionStart hook，自動注入）
└── _TEMPLATE-handoff.md               <- 任務交接（含走過的死路）
```

## 三份 prompt 的分工

| Prompt | 何時用 |
|---|---|
| `session-start.md` | 每個 session 開頭（詳版）|
| `compact-session.md` | `/compact` 之前（結尾，含紀律自檢）|
| `SESSION_SUMMARY.md` | hook 自動注入（slim 即時摘要）|

## `session-start.md` 的角色

CLAUDE.md 是**精簡憲法**（原則、導航、不常變）；
這一份補充 **volatile 的當前座標**（component 清單 / open questions / 當前 phase / 權威排序）。

- 把模板 copy 成去掉 `.template` 的檔名再填
- Volatile 部分隨 phase 變，**每次 phase 收尾的 doc-sync 時更新**
- **避免與 CLAUDE.md 重複** —— 這層補充 CLAUDE.md 沒有的東西

## 慣例
- CLAUDE.md 保持精簡（index 層）；細節 onboarding 落這層（detail 層）
- 這層的內容過期比不存在更危險 —— 過期就刪，不要留著誤導
