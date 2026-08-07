# Testing Rules

**Purpose**: 測試分層、覆蓋率門檻、測試隔離的常見陷阱。

**Category / Scope**: Quality / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

**Trigger（什麼時候 Read）**: 寫測試 / 測試隔離出問題 / 規劃某範疇的測試策略。

---

## 測試分層

| 層 | 測什麼 | 速度 | 門檻 |
|----|-------|------|------|
| **Unit** | 單一函式 / class 的邏輯 | 毫秒 | ≥ 80% |
| **Contract** | 介面實作是否符合契約（所有實作跑同一套）| 毫秒-秒 | 每個公開 ABC 一套 |
| **Integration** | 跨元件 / 真 DB / 真外部服務 | 秒 | ≥ 60% |
| **E2E** | 完整使用者路徑 | 秒-分 | ≥ 1 個關鍵閉環 |
| **Drive-Through** | 人開真 UI 走完流程 | 分 | 每個 user-facing 功能（見 `verification-discipline.md`）|

> **注意最後一層**：drive-through **不是**自動化測試，它是**人**（或瀏覽器自動化 + 人看截圖）
> 實際走一遍。自動化測試可以全綠而功能完全不可用 —— 這是真實發生過的。

---

## Contract Test 模式

當一個介面有多個實作（mock + real、多個 provider、多個 storage backend），
**所有實作跑同一套測試**：

```python
# tests/contract/test_storage_contract.py
class StorageContractTests:
    """Every Storage implementation must pass these."""

    @pytest.fixture
    def storage(self) -> Storage:
        raise NotImplementedError  # subclass provides

    def test_put_then_get_roundtrips(self, storage): ...
    def test_get_missing_returns_none(self, storage): ...
    def test_delete_is_idempotent(self, storage): ...

class TestMemoryStorage(StorageContractTests):
    @pytest.fixture
    def storage(self): return MemoryStorage()

class TestS3Storage(StorageContractTests):
    @pytest.fixture
    def storage(self): return S3Storage(...)
```

**為什麼**：這是 **AP-6（Mock vs Real Divergence）**的結構性解法。
Mock 與 real 共用測試 = 它們不可能靜默分歧。

---

## 常見陷阱

### 陷阱 1：模組級 Singleton 跨測試汙染 ⭐ 最常見

**症狀**：整合測試共用 module-level singleton（service factory / config cache / metrics registry）
→ 第二個 fixture 拿到上一個測試的 cached instance → 連鎖失敗，錯誤訊息通常完全不相干
（如「event loop closed」）。

**症狀特徵**：**單獨跑會過，一起跑會爆**；或**改變測試順序結果就變**。

**修正**：per-suite autouse fixture 重設受影響的 singleton：

```python
# tests/integration/conftest.py
@pytest.fixture(autouse=True)
def reset_singletons():
    reset_service_factory()
    reset_config_cache()
    yield
    reset_service_factory()
```

**根治**：重構成 DI 注入，不用 module-level cache。

### 陷阱 2：新加的外部呼叫揭露潛伏的隔離漏洞

**症狀**：把一個新的 DB / HTTP 呼叫加進原本不碰外部的 endpoint 之後，
**原本會過的測試開始失敗**。

**根因**：測試 client override 了 auth，但**沒有** override DB session / HTTP client。
在該 endpoint 不碰 DB 時這個漏洞是隱形的。

**修正**：確認測試 suite 的依賴 override 涵蓋了**新開始碰外部**的那個 endpoint。

### 陷阱 3：測試通過但功能沒生效

**症狀**：功能有測試、測試綠、但實際跑起來完全沒作用。

**真實案例**：某個標記邏輯加了測試也通過了，但 drive-through 發現對**一整類**輸入完全沒生效
（那類輸入是裸陣列，標記邏輯只處理 dict）。**那個「通過的測試」認證了這個跳過。**

**根因**：測試只餵了它自己設計的輸入形狀，沒有涵蓋真實的輸入分佈。

**修正**：
- 測試的 fixture 要來自**真實輸出的快照**，不是手工捏的理想輸入
- 加**負面測試**：「關掉這個功能會壞什麼」—— 答不出來就是 Potemkin
- **Drive-through 是唯一能抓到這類問題的機制**

### 陷阱 4：Skip 累積

**症狀**：`@skip` / `.skip` / `xfail` 標記越來越多，沒人記得為什麼。

**規則**：
- ❌ **不准 skip 測試蒙混過關** —— 壞了就修，真的不需要就刪
- ✅ 唯一可接受的 skip：**平台限制**（如「這個測試只在 Linux 跑」）且有註解說明
- 每個 phase closeout 掃一次 skip 清單

---

## 交易型測試：兩個必知 pattern

> 適用於**有交易型資料庫**的專案。兩個都是「測試自己把自己搞壞」的典型 ——
> 症狀出現在別的地方，看起來完全不像是測試設計的問題。
> 下面的程式碼是 SQLAlchemy 風味的示意；概念與 ORM 無關。

### Pattern 1：SAVEPOINT —— 驗證「錯誤發生之前」留下的狀態

**什麼時候需要**：測試**故意觸發**一個 DB 錯誤（約束違反、故意的壞資料），
然後要驗證**錯誤之前**那段程式留下的狀態仍然正確（審計列、事件紀錄、軟失敗紀錄）。

天真的 `try/except` 會**毒化外層交易** —— 之後每一個查詢都炸
（`PendingRollbackError` / `InFailedSqlTransaction`），你根本讀不到要驗證的東西。

```python
async def test_audit_row_survives_downstream_error(db_session):
    # 錯誤前的路徑 —— 應該成功；trigger 在這裡觸發
    await db_session.execute(insert(audit_log).values(event="X"))

    # 把「故意出錯」那段包進 SAVEPOINT
    async with db_session.begin_nested():        # ← SAVEPOINT，例外時自動回滾
        try:
            await db_session.execute(insert(t).values(violates_constraint=True))
        except IntegrityError:
            pass                                  # 只回滾到 SAVEPOINT，外層交易還活著

    # 外層交易可用 —— 驗證錯誤前的狀態確實留下了
    row = (await db_session.execute(select(audit_log))).scalar_one()
    assert row.chain_hash is not None
```

**反模式**：

- ❌ `try/except` 不包 SAVEPOINT → 毒化外層交易，後續查詢全炸
- ❌ **另開一個 session 繞過毒化** → 丟掉 session-local 的設定
  （例如多租戶的 `SET LOCAL tenant_id`）→ RLS 回傳空集合 →
  **測試會過，但是為了錯的理由過的**。這比失敗更危險
- ❌ 中途抽換 session → 把模組級 singleton 的 event-loop 問題（陷阱 1）叫回來

**什麼時候不需要**：純單元測試（無 DB）；或「錯誤本身就要往外傳」才是測試目的時。

### Pattern 2：已 commit 的資料要自己清

**什麼時候需要**：測試打的 endpoint **內部自己呼叫 `commit()`**
（常見於 PATCH / 建立資源的路由），而測試又把自己的 session 注入給該路由。
那個 commit 會把測試種的資料**真的寫進去** —— 越過 fixture teardown 的 `rollback()`
（對一個已經 commit 的 session，rollback 是 no-op）。

**症狀**：第一次跑過，第二次撞 unique 約束（`Key (code)=(...) already exists`）。
而且**是在別的測試上炸**，看起來像那個測試壞了。

```python
# conftest.py
_COMMITTING_TEST_KEYS = ("CASE_A", "CASE_B")   # 每加一個會 commit 的測試就補一個

async def _clear_committed_rows() -> None:
    """若有保護性 trigger（如 append-only 的審計表）擋住 CASCADE 刪除，
    在【同一個交易內】開關它：commit => trigger 已恢復 + 資料已刪；
    任何錯誤 => rollback => trigger 仍在 + 什麼都沒刪。"""
    async with factory() as session:
        try:
            await session.execute(text("ALTER TABLE audit_log DISABLE TRIGGER <worm_trigger>"))
            await session.execute(text("DELETE FROM <table> WHERE key = ANY(:keys)"),
                                  {"keys": list(_COMMITTING_TEST_KEYS)})
            await session.execute(text("ALTER TABLE audit_log ENABLE TRIGGER <worm_trigger>"))
            await session.commit()
        except Exception:          # 盡力清理，絕不讓清理失敗拖垮測試
            await session.rollback()

@pytest.fixture(autouse=True)
async def _isolation():
    await _clear_committed_rows()      # ← 前
    yield
    await _clear_committed_rows()      # ← 後
```

**為什麼 trigger 要在同一個交易裡開關**：若 DELETE 的 CASCADE 會碰到 append-only
的審計表，沒先關 trigger 整個 DELETE 就失敗 —— 而 `try/except` 會把它吞掉，
結果是**什麼都沒清、也沒有人知道**。單一交易的「關 → 刪 → 開 → commit」
保證兩個方向都安全。

**反模式**：

- ❌ 改成維護一份永久 allowlist 而不清資料 → 新的 committing 測試會靜默把 flake 帶回來
- ❌ 不開關 trigger 就 DELETE → 失敗被 `try/except` 吞掉
- ❌ 讓 committing 測試改用隨機後綴的 key → 失去可讀的測試 ID，斷言變難讀
- ❌ 為測試 DB 全域關掉保護 trigger → 那個 trigger 本來就是別處要測的不變式

**什麼時候不需要**：只讀的 endpoint（沒有內部 commit）；或路由用的是另一個從不 commit 的 session。

---

## 測試要測「行為」不測「實作」

```python
# ❌ 測實作 —— 重構就爆，但功能沒壞
def test_pricing_calls_discount_resolver_twice():
    engine.price(order)
    assert mock_resolver.call_count == 2

# ✅ 測行為 —— 重構不爆，功能壞了才爆
def test_order_level_discount_applies_before_tax():
    result = engine.price(order_with_20pct_discount)
    assert result.tax == pytest.approx(result.subtotal_after_discount * TAX_RATE)
```

**判準**：如果你重構了內部實作但沒改行為，這個測試會不會爆？
會 → 它測的是實作，重寫它。

### ⚠️ 唯一的例外：產出「會被別處解譯的字串」的函式

上面那條規則有一個**明確的 carve-out** —— 凡是**拼接查詢字串**的函式
（SQL / OData filter / LDAP filter / 路徑 / 任何 DSL），**必須斷言產出的字串本身**，
不可以只斷言行為。

**為什麼這裡行為斷言會失效**：這種函式的「行為」在單元測試裡是**被 mock 中介**的。
一個**被污染、但剛好仍然命中目標**的 filter，行為斷言（「刪對了那一份」）**照樣是綠的**。

```python
# ❌ 只有行為斷言 —— 對「多了一段注入但仍然命中」的 filter 一樣會過
def test_delete_removes_the_right_doc():
    svc.delete(doc_id="a'b")
    assert fake_index.deleted == ["a'b"]

# ✅ 連產出的字串一起釘死 —— 污染會立刻現形
def test_filter_escapes_single_quote():
    assert build_filter(doc_id="a'b") == "doc_id eq 'a''b'"
```

**同一條紀律的第二半：收窄輸入的 regex 要有反證測試釘住自己。**
一條用來限制輸入的 pattern，如果沒有測試證明它**擋得住**該擋的東西，
日後有人「順手整靚」它、把它放寬了，**不會有任何東西變紅**。

```python
def test_doc_id_pattern_rejects_quote():      # 反證測試：證明它擋得住
    assert DOC_ID_RE.fullmatch("a'b") is None
```

**判準**：這個函式的產出物，會不會**被另一個系統當成語法解譯**？
會 → 斷言字串本身。不會 → 回到上面的通則，測行為。

**觸發來源**：一個 filter 逸出缺陷在整套測試全綠的情況下上線 ——
每一條相關測試都是行為斷言，而受污染的 filter 仍然命中了目標文件。

---

## 負面測試（Definition of Done 的一部分）

每個功能都要有**至少一個**回答「關掉它會壞什麼」的測試。

```python
def test_discount_rule_disabled_falls_back_to_list_price():
    engine = PricingEngine(rules=[])       # 關掉折扣
    result = engine.price(order)
    assert result.total == order.list_price_total   # 明確的 fallback 行為
```

**為什麼**：這是 **AP-3（Potemkin Feature）** 的自檢問題的程式化版本。
若你寫不出這個測試，代表這個功能可能根本沒在做事。

---

## 覆蓋率的正確用法

- 覆蓋率是**下限指標**，不是目標。100% 覆蓋率的爛測試比 70% 的好測試糟
- 看**未覆蓋的行**，不看百分比 —— 那些行為什麼沒被測到？
- **不要為了衝數字寫沒有斷言的測試**（呼叫一遍就結束的「測試」）

```bash
<coverage 指令>
```

---

## 測試檔案組織

```
tests/
├── unit/           # 對應 src/ 的結構
├── contract/       # 每個公開介面一套
├── integration/    # 跨元件 / 真外部依賴
│   └── conftest.py # ← singleton reset fixture 住這
└── e2e/            # 完整路徑
```

**命名**：`test_<被測對象>_<情境>_<期望>`

```python
def test_pricing_with_zero_line_items_returns_zero_total(): ...
def test_storage_get_after_delete_returns_none(): ...
```

好的測試名字讓你**不用讀 body 就知道壞在哪**。
