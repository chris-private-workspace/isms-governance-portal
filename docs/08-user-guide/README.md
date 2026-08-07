# 08-user-guide — 終端使用者手冊（對外）

**Purpose**: 給終端使用者看的操作 / 配置 / troubleshooting 手冊。**對外**。
**Created**: 2026-08-07
**Status**: Active

## 建議住客（按需）
- `01-overview.md` — 平台概覽
- `02-setup-guide.md` — 使用者 setup
- `03-configuration-reference.md` — 配置 / 旋鈕參考（**含出廠值**）
- `04-troubleshooting.md` — 故障排查

## 關鍵維護規則

**手冊裡的出廠值 / 預設值必須與 code 一致。**
若某個 ADR 改了預設值 → **必須同步更新這一層的對應手冊**，否則手冊會誤導使用者。

這一層是「回答使用者操作問題」的 first stop ——
**AI 不應該憑記憶重新推導旋鈕值，應該查這一層**（查不到就去讀 code，然後把它寫進來）。

## 與 05-usage 的分工
- 對外終端使用者 → 這層
- 對內開發者 → `../05-usage/`

模板：[`_TEMPLATE-page.md`](./_TEMPLATE-page.md)
