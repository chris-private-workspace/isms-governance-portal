# 附加規則包：LLM / AI Agent 專案

**適用**：專案的核心是 LLM 呼叫、agent loop、或 AI 工具編排。

bootstrap 詢問「LLM/AI project?」回答 yes 時，這份內容會被加掛到：
- `CLAUDE.md` §核心約束（約束 7：LLM Provider Neutrality）
- `.claude/rules/anti-patterns-checklist.md` 的附加章節
- `docs/rules-on-demand/llm-agent-antipatterns.md`（新檔）

---

## 附加約束：LLM Provider Neutrality ⭐⭐⭐

> 這條約束的驗收標準是：**30 分鐘換 provider 不改業務代碼。**

- ❌ 核心邏輯目錄任何檔案禁止 `import openai` / `import anthropic` / 任何 SDK 直接 import
- ❌ 工具定義禁止用某個 provider 的原生 schema
- ✅ 全透過抽象層的 `ChatClient` ABC + 中性的 `ToolSpec` + 中性的 `Message`
- ✅ 用 lint detector 強制檢查（見 `lint-detector-authoring.md`）

**為什麼**：provider 的 API 會變、價格會變、可用性會變、模型會退役。
把 SDK 型別洩漏到業務邏輯裡，等於把整個 codebase 綁死在一個供應商的 API 形狀上。

**實作要點**：

```
adapters/
├── _base/
│   ├── chat_client.py     # ChatClient ABC + 中性型別
│   └── types.py           # Message / ToolSpec / StopReason（provider 中立）
├── openai/                # ← 唯一可以 import openai 的地方
└── anthropic/             # ← 唯一可以 import anthropic 的地方

<核心邏輯>/                # ← 絕對不可以 import 任何 SDK
```

---

## 附加反模式（4 條，加在核心 7 條之上）

### AP-A1：Pipeline 偽裝成 Loop

**症狀**：代碼用 `for step in steps:` 線性執行固定步數，包裝成 loop 外殼，
但**工具結果不回注 LLM**。

**自我檢查**：
- 有 `for step in ...` 的順序執行嗎？
- 工具結果是否以 message 形式 append 回 messages 讓 LLM 重新推理？
- 是 `while` 由 stop_reason 驅動退出，還是固定次數迴圈？

```python
# ❌ 反模式 —— 固定 3 步，工具結果死在 step 內
async def run(self, ctx):
    for step in [step1, step2, step3]:
        await step.execute(ctx)
    return ctx

# ✅ 正確 —— while 驅動，結果回注
async def run(self, state):
    while True:
        response = await self.client.chat(state.messages, ...)
        if response.stop_reason == StopReason.END_TURN:
            return response
        for tc in response.tool_calls:
            result = await self.executor.execute(tc)
            state.messages.append(Message(role="tool", content=result))
```

**為什麼重要**：這是 agent 與 pipeline 的**根本差異**。
沒有回注就沒有迭代，沒有迭代就不是 agent。

### AP-A2：Context Rot 被忽略

**症狀**：沒有 compaction / observation masking / token 預算追蹤；
10+ turn 對話必然劣化。

**自我檢查**：
- Loop 是否在每輪開頭檢查是否需要壓縮？
- Token 用量有 metrics / 監控嗎？
- 有 30+ turn 的測試案例嗎？
- Compaction 有品質測試（壓縮後不丟關鍵資訊）嗎？

**修補**：Context 管理是 Day 1 必做，不是「之後再說」。
Loop 每輪呼叫 `compactor.compact_if_needed(state)`。

### AP-A3：沒有集中的 Prompt 組裝

**症狀**：Prompt 組裝散在多處；每個 LLM 呼叫點各自組 messages；
memory / context 是否真的注入無人保證。

**自我檢查**：
- 所有 LLM 呼叫是否都透過同一個 PromptBuilder？
- 有沒有地方裸組 `messages = [{"role": "system", ...}, ...]`？
- Memory 層是否真的被注入 —— **有測試證明嗎**？

**修補**：PromptBuilder 是**唯一入口**。加 lint 禁止裸組 messages list。

### AP-A4：沒有驗證迴路

**症狀**：Agent 輸出後完全沒有驗證；沒有 self-correction；
LLM 給的答案沒人檢查對不對。

**自我檢查**：
- Agent 輸出是否有驗證步驟？
- Verifier 失敗後是否自動觸發 self-correction（最多 N 次）？
- Verification 結果是否在事件流 / 日誌中可見？

**修補**：至少要有規則型 verifier + LLM-judge verifier 各一個；
失敗自動觸發修正（上限 2 次）；結果有審計紀錄。

---

## 附加的 Drive-Through 要求

AI 專案的 drive-through **必須用真實的 LLM**，不能用 echo / mock：

- ❌ 用 mock LLM 跑通就說「端到端驗證」
- ✅ 真實 provider + 真實 model + 真實 token 消耗

**為什麼**：mock LLM 的行為是確定性的，真實 LLM 不是。
只有真實 LLM 才會暴露：prompt 組裝的問題、工具 schema 的問題、
stop_reason 處理的問題、串流解析的問題。

---

## 附加的測試要求

| 測試類型 | 要求 |
|---------|------|
| **多輪對話測試** | ≥ 1 個 30+ turn 的案例（測 context rot）|
| **Provider 契約測試** | 每個 adapter 跑同一套 ChatClient 契約測試 |
| **成本標記** | 會產生費用的測試要標記 + 文件註明估算成本 |
| **確定性測試** | prompt 組裝 / 解析 / 工具 schema 必須有不呼叫 LLM 的單元測試 |

---

## 額外的 lint detector 建議

| Detector | 檢查什麼 |
|----------|---------|
| `check_llm_sdk_leak.py` | 核心目錄有沒有 SDK import（**必備**）|
| `check_promptbuilder_usage.py` | 有沒有裸組 messages list |
| `check_pipeline_disguise.py` | 有沒有 for-loop 偽裝的 agent loop |

撰寫方式見 `docs/rules-on-demand/lint-detector-authoring.md`。
⚠️ 記得做 **code-aware masking** —— 否則會抓到規則文件裡的反例程式碼。
