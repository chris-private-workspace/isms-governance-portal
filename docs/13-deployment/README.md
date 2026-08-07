# 13-deployment — 部署

**Purpose**: 部署 topology / runbook / 環境對照 / 上線檢查 / release notes。
**Created**: 2026-08-07
**Status**: Active

## 建議住客（按需）
- `01-topology.md` — 資源清單 + 網路 + 一頁架構摘要
- `02-environment-reference.md` — 環境變數對照（**哪些是 secret**）
- `03-build-images.md` — build 產物怎麼來
- `04-deploy-runbook.md` — 實際部署逐步（**as-built，不是原始藍圖**）
- `05-prod-hardening-checklist.md` — 上線前安全自檢
- `06-as-built.md` — **實際跑著的環境**（資源名 / URL / 已 defer 的項）

## 兩條實戰教訓

1. **Runbook 要寫 as-built，不是藍圖。** 實際部署常與原計畫有大出入
   （proxy 擋住某條路、權限拿不到、SDK 行為不同）。
   藍圖留在 ADR / plan 裡做決策記錄；**runbook 必須是「照著做真的會成功」的那一版**。
2. **部署狀態要實測，不要從設定檔推論。** 見 `../11-env-resources-detail/README.md`。

## 與鄰層的分工
- 架構**決定**（為什麼是這個 topology）→ `../14-adr/`
- 部署**執行計畫**（這次要做什麼）→ `../01-planning/W{NN}-*/`
- 部署**步驟與現況**（怎麼做、現在長怎樣）→ 這層

模板：[`_TEMPLATE-runbook.md`](./_TEMPLATE-runbook.md) · [`_TEMPLATE-release-notes.md`](./_TEMPLATE-release-notes.md)
