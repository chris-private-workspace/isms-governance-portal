# Observability — 埋點規則

**Purpose**: 讓系統的每一次執行都能被回答「發生了什麼、花了多久、為什麼失敗」。

**Category**: Development Process / Operations
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

> **Modification History**
> - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

**Trigger（什麼時候讀這份）**：新增埋點 / 動 trace context / 加 metric /
定義 SLO / 「線上出事了但看不出為什麼」。

---

## 核心原則

**觀測性是 cross-cutting concern，不是一個功能模組。**

它不屬於任何一個範疇，而是**穿過所有範疇**。沒有埋點的系統，出事時只能靠猜。

```
各功能範疇 ──每個都埋點──> OpenTelemetry SDK
                              ├─ trace   → Jaeger / Tempo
                              ├─ metrics → Prometheus
                              └─ logs    → Loki / CloudWatch
                                            └─> Dashboard
```

> **不要等到出事才補埋點**。出事當下最缺的就是「上次正常時長什麼樣」的對照組。

---

## 必埋點位置

不是「埋越多越好」，是**埋在邊界上**。下列 5 類邊界，每一類都要：

| # | 邊界 | 埋什麼 | 為什麼 |
|---|---|---|---|
| 1 | **請求 / 工作單元的開頭與結尾** | span + 耗時 + 結果（成功/失敗/中止）| 沒有這個，其他都無處掛載 |
| 2 | **每次外部呼叫前後**（DB / API / 第三方 / LLM）| span + 耗時 + 狀態碼 + 重試次數 | 大多數延遲來自這裡 |
| 3 | **每次失敗**（例外 / 非 2xx / 驗證不通過）| 錯誤類型 + 是否可重試 + 上下文 | 「失敗率」比「平均延遲」更早示警 |
| 4 | **重試 / 降級 / 熔斷發生時** | 觸發原因 + 第幾次 | 靜默重試會把故障偽裝成「有點慢」|
| 5 | **狀態持久化的寫入與讀取** | 耗時 + 大小 | 狀態層是最常見的隱藏瓶頸 |

**成對埋**：只埋開頭不埋結尾，等於只知道「開始過」，不知道有沒有結束、花多久。

```python
# ✅ 成對 + 帶結果
with tracer.start_as_current_span("work_unit") as span:
    span.set_attribute("tenant_id", tenant_id)
    try:
        result = await do_work()
        span.set_attribute("outcome", "success")
        return result
    except Exception as e:
        span.set_attribute("outcome", "error")
        span.set_attribute("error.type", type(e).__name__)
        span.record_exception(e)
        raise
    finally:
        metrics.work_duration.observe(elapsed, {"outcome": outcome})
```

> 範例用 Python / OTel，**原則與語言、廠商無關**。

---

## Trace context 必須沿鏈傳遞，不可斷裂

一條 trace 斷在哪裡，你就在那裡失去視野。

```python
# ✅ 正確 —— context 沿呼叫鏈傳下去
async def handle_request(req, trace_context: TraceContext):
    with tracer.start_span("step_a", context=trace_context) as span:
        await downstream(req, trace_context=span.context)   # 傳下去

# ❌ 禁止 —— 下游自己開新 root span，trace 斷成兩截
async def handle_request(req):
    with tracer.start_span("step_a"):
        await downstream(req)        # downstream 內部 start_span() 沒有 parent
```

**常見的斷裂點**（每一個都要檢查）：

- 背景任務 / queue consumer —— context 沒有跟著訊息走
- 執行緒池 / `run_in_executor` —— context 是 thread-local，不會自動跨執行緒
- 重試包裝器 —— 重試時開了新 span 卻沒接上原本的 parent
- 跨服務呼叫 —— 沒有把 traceparent 放進 HTTP header

### 串流 / 非同步事件要帶 `trace_id`

若系統會推事件給前端（SSE / WebSocket），**每個事件都帶 `trace_id`**。
使用者回報「剛剛那次很慢」時，你能直接從畫面上的 id 跳到那條 trace。

---

## Metric 最小集合

先有這 4 類，再談其他。每一類都要有 `tenant_id`（或等價的租戶/客戶維度）label ——
**沒有租戶維度的 metric，在多租戶系統裡幾乎沒有診斷價值**（「整體 p99 正常」掩蓋
「某個大客戶全掛」）。

| 類型 | Metric | Labels |
|---|---|---|
| **延遲** | `<unit>_duration_seconds`（histogram）| tenant / outcome |
| **流量** | `<unit>_total`（counter）| tenant / type |
| **錯誤** | `<unit>_errors_total`（counter）| tenant / error_type / retryable |
| **飽和** | queue 深度 / 連線池使用率（gauge）| resource |

> 這是 Google SRE 的 **四個黃金訊號**（延遲 / 流量 / 錯誤 / 飽和）。
> 若你的系統有計費或配額，**再加一個成本/用量 counter** —— 它同時是財務訊號與濫用偵測訊號。

**Label 基數警告**：不要把 `user_id` / `request_id` / 原始 URL 放進 label。
高基數 label 會讓 Prometheus 記憶體爆掉。那些屬於 **trace 屬性**，不是 metric label。

---

## 鎖定 SDK 版本

```
# ✅ 鎖具體版本
opentelemetry-api==1.22.0
opentelemetry-sdk==1.22.0

# ❌ 禁止 —— OTel 的 minor 版常帶 breaking change
opentelemetry-api>=1.20
```

觀測性套件是**出事時你唯一的眼睛**。它自己因為自動升級而壞掉，是最糟的時機。

---

## 結構化 log

log 是給機器查的，不是給人讀的。用 JSON，不要用字串拼接。

```python
# ✅ 可查詢
logger.info("tool_executed", extra={
    "tool_name": name, "duration_ms": ms, "status": status,
    "tenant_id": tenant_id, "trace_id": trace_id,
})

# ❌ 不可查詢
logger.info(f"Tool {name} took {ms}ms and returned {status}")
```

**每條 log 都要有 `trace_id`** —— 否則你有 log、有 trace，卻無法把兩者對起來。

> 若專案有 PII 規範，log 輸出前必須脫敏。見對應的資料規則。

---

## 機械強制：埋點覆蓋率測試

「請記得埋點」是勸世文。寫成測試：

```python
def test_critical_paths_are_instrumented():
    """關鍵路徑上的函式必須有 span。"""
    for module, func_name in CRITICAL_PATHS:
        source = inspect.getsource(getattr(module, func_name))
        assert "start_as_current_span" in source or "@traced" in source, \
            f"{module.__name__}.{func_name} 沒有埋點"
```

或寫成 lint detector（見 `docs/rules-on-demand/lint-detector-authoring.md`）。

**從 allowlist 開機**：先把現有未埋點的函式列進白名單讓測試變綠，
之後每次有人要加白名單就得在 PR 裡說明 —— 那就是你要的審查點。

---

## 反模式

| 反模式 | 為什麼壞 |
|---|---|
| 只在成功路徑埋點 | 出事時剛好什麼都沒有 |
| 只埋開頭不埋結尾 | 只知道開始過，不知道結束沒、花多久 |
| `user_id` / `request_id` 當 metric label | 高基數，會壓垮 metric 後端 |
| log 用字串拼接 | 無法查詢、無法聚合 |
| trace 在背景任務 / 執行緒池斷掉 | 最需要看的非同步路徑正好沒有視野 |
| 觀測性套件版本開放升級 | 出事當天眼睛跟著壞掉 |
| 埋了但沒人看 | 沒有 dashboard / 告警的埋點等於沒埋 |

---

## DoD（任何新增的執行路徑）

- [ ] 工作單元開頭 + 結尾成對埋點，帶結果（成功 / 失敗 / 中止）
- [ ] 每次外部呼叫有 span + 耗時
- [ ] 失敗路徑有錯誤類型 + 是否可重試
- [ ] trace context 沿鏈傳遞（含背景任務 / 執行緒池 / 跨服務）
- [ ] 四個黃金訊號的 metric 有涵蓋，且帶租戶維度
- [ ] log 是結構化的，且每條帶 `trace_id`
- [ ] 沒有把高基數欄位放進 metric label
