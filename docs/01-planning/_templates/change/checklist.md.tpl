# CH-{NNN} — Checklist

> 從 [`spec.md`](./spec.md) §3 Acceptance Criteria 導出。
> 🔴 **只能 `[ ]` -> `[x]`，不能刪未勾選項**（PROCESS R6）。做不完就標 🚧 + 理由。

## 實作

- [ ] **{原子項}**
  - DoD: {可測量的完成定義}
  - Verify: `{指令}`

## 測試

- [ ] **{新增 / 修改的測試}**
  - DoD: {測什麼；行為變更必須有測試證明新行為}
  - Verify: `{測試指令}`

## 驗收（對應 spec §3）

- [ ] **{acceptance 條件}**
  - Verify: `{指令或走查步驟}`

## Drive-through（user-facing 才需要，PROCESS R8）

- [ ] **真 UI + 真後端走完主路徑**
  - DoD: 逐控件可點、有效果、標籤真實、結果真的渲染
  - 證據: 截圖 + 「實際發生 vs 預期」對照 -> `progress.md`

## 收尾

- [ ] `progress.md` 寫完成摘要，`spec.md` status -> `done`
- [ ] BACKLOG 同步（R7）
- [ ] 架構級決定有 ADR（R5）
