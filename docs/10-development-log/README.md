# 10-development-log — 開發日誌

**Purpose**: Daily / weekly 的跨 phase 時間線敘事。**選用。**
**Created**: 2026-08-07
**Status**: Active

## 結構
```
10-development-log/
├── 01-daily/    <- {YYYY-MM-DD}.md
└── 02-weekly/   <- {YYYY-Wnn}.md
```

## 與 phase progress.md 的分工

| | 性質 |
|---|---|
| `../01-planning/W{NN}-*/progress.md` | **per-phase 的結構化紀錄**（Day-N、drift、drive-through）|
| 這層 | **跨 phase 的時間線敘事** |

## 這層是選用的

若 phase `progress.md` 已足夠追蹤，**不一定要另開日誌**。
適合開的情況：需要跨 phase 回顧、或要定期向 stakeholder 匯報。

⚠️ 如果你發現自己在兩邊寫同樣的東西 —— 停掉這一層。重複紀錄比沒有紀錄更糟。

模板：[`01-daily/_TEMPLATE-daily.md`](./01-daily/_TEMPLATE-daily.md) · [`02-weekly/_TEMPLATE-weekly.md`](./02-weekly/_TEMPLATE-weekly.md)
