# 本地開發環境 Setup

**Purpose**: 從零到能跑起來。**每一步都要有「預期看到什麼」。**
**Created**: 2026-08-07
**Last Modified**: 2026-08-07

## 前置

| 需要 | 版本 | 怎麼確認 |
|---|---|---|
| | | `{指令}` |

## 步驟

1. **取得程式碼**
   ```bash
   git clone {repo}
   cd isms-governance-portal
   ```

2. **環境變數**
   ```bash
   cp .env.example .env
   ```
   完整變數清單即 `.env.example` 的內容 —— **不在本檔重複**（會不同步）。

   > **非顯而易見的部署要求**：<在此記錄那些「不寫下來就會踩」的環境設定>

3. **安裝依賴**
   ```bash
   {指令}
   ```

4. **啟動**
   ```bash
   {指令}
   ```
   **預期看到**：{輸出}

## Services / Ports

| Service | Port |
|---------|------|
| <service> | <port> |

## 確認裝對了

```bash
<test 指令>
python scripts/lint/run_all.py
```

## 常見失敗

| 症狀 | 原因 | 解法 |
|---|---|---|
| | | |
