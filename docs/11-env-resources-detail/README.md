# 11-env-resources-detail — 環境資源細節

**Purpose**: 雲端 / 基礎設施資源的清單與位置。
**Created**: 2026-08-07
**Status**: Active

## 建議住客
- 雲端資源清單（resource 名 / region / tier / 用途）
- 服務 endpoint（非機密）
- 憑證的**位置**（存在哪，不是憑證本身）
- 環境對照（local / staging / production 各自的資源）

## 安全紅線

- **絕不**在這一層寫 connection string / API key / password / token
- 只寫「資源叫什麼、在哪、怎麼拿」，實際憑證由 env var / vault 提供
- 這條同時是 CLAUDE.md 的核心約束之一 —— 違反視為 STOP-and-ask

## 一個實戰教訓

講環境狀態時要分清**「部署模板」和「實際跑著的東西」兩本帳**。
日常部署可能只換 image 不碰模板，環境變數也可能直接設在執行實體上 ——
**從模板推論不出實際狀態**。一律用實際查詢指令實測，並把指令寫進文件裡。

模板：[`_TEMPLATE-resources.md`](./_TEMPLATE-resources.md)
