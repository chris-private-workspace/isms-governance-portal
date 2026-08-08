# 附加規則包：實體範疇資料隔離（Entity-Scoped Data Isolation）

**Trigger**：任何碰資料存取層的工作 —— 建表 / 寫 query / 開 endpoint / 設計 RLS policy /
做滾升聚合 / 處理保留與刪除。

**Purpose**：把 guardrail 4（一切 entity-scoped）與 guardrail 5（不可篡改稽核軌跡）
從原則變成可執行、可測試、可機械強制的規則。

**Why 這條要獨立成規則包**：範疇隔離失敗**不是一般 bug，是合規事故**。
造成它的往往只是**一個忘了加 `WHERE entity_id ...` 的 query**。這種錯誤靠 code review 抓不穩。
更嚴重的是：這是一套**給稽核人員看的 ISMS 平台** —— 一次跨 OpCo 洩漏，
毀掉的不只是資料，是這個平台聲稱要提供的保證本身（guardrail 1）。

> ⚠️ **本專案不是對外多租戶 SaaS**（已確認參數 #2）。隔離軸是**組織實體**，不是客戶租戶。
> 機制大致相同，但有一個**關鍵差異**：**區域滾升是合法的跨實體讀取**。
> SaaS 的答案是「永遠不准跨」；這裡的答案是「跨要走授權路徑，且自身也要被稽核」。
> 下方 §滾升 是本規則包與原始 SaaS 版本差異最大的一節，**不要跳過**。

> 程式碼範例用 SQL + Python 示意。**ADR-0001（框架）與 ADR-0004（RLS 策略）尚未拍板** ——
> 語法會變，原則不變。RLS 段落假設 PostgreSQL，那是 `03` 目前的方向而非定案。

---

## 三條鐵律（無例外）

### 鐵律 1：所有業務 table 必有 `entity_id`

任何存放業務資料（非全域參考資料）的表，都必須有 `NOT NULL` 的 `entity_id`，
指向組織階層中的**擁有實體**（guardrail 3：每筆記錄都有所屬組織實體）。

```sql
-- ✅ 正確
CREATE TABLE risk_assessments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id     UUID NOT NULL,                      -- 鐵律
    asset_id      UUID NOT NULL,
    likelihood    SMALLINT NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
    -- 五種衝擊類型，取 MAX（RCI 程序，已確認參數 #7）
    impact_fin    SMALLINT NOT NULL CHECK (impact_fin BETWEEN 1 AND 5),
    impact_bop    SMALLINT NOT NULL CHECK (impact_bop BETWEEN 1 AND 5),
    impact_lry    SMALLINT NOT NULL CHECK (impact_lry BETWEEN 1 AND 5),
    impact_rep    SMALLINT NOT NULL CHECK (impact_rep BETWEEN 1 AND 5),
    impact_sis    SMALLINT NOT NULL CHECK (impact_sis BETWEEN 1 AND 5),
    deleted_at    TIMESTAMPTZ,                        -- 軟刪除（guardrail 3）
    version       INTEGER NOT NULL DEFAULT 1,         -- 版本歷史（guardrail 3）
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_entity FOREIGN KEY (entity_id) REFERENCES org_entities(id)
);

-- 範疇過濾是每個 query 的第一個條件 → 複合索引以 entity_id 起頭
CREATE INDEX idx_risk_assessments_entity_asset ON risk_assessments(entity_id, asset_id);
```

**子表也要帶 `entity_id`**，即使能經由父表 join 得到。冗餘是**故意的** ——
它讓每個 query 都能單獨過濾，不必依賴 join 的正確性，也讓 RLS policy 能直接掛在子表上。

**全域參考資料**可以沒有 `entity_id` —— 本專案的合法清單：

| 表 | 為什麼全域 |
|---|---|
| `org_entities` | 組織階層本身。它**定義**範疇，不能被範疇過濾 |
| `frameworks` / `framework_controls` | ISO 27001 Annex A、27017 條文 —— 集團共用 |
| `threat_library` / `vulnerability_library` | 可重用庫（已確認參數 #8）|
| `jurisdictions` / `regulations` | 管轄區與法規參考資料 |
| `risk_scales` | 集團標準量表。**per-entity 校準走設定表，不是分叉這張表**（參數 #7）|

> 這五類以外要新增全域表，**必須在 PR 描述中舉證**。預設是「有 `entity_id`」，例外要說明。

### 鐵律 2：所有 query 必須以範疇過濾

每個 SELECT / INSERT / UPDATE / DELETE 都要帶。**注意是範疇（一個子樹），不是單一 ID** ——
見 §滾升。

```python
# ✅ 正確
async def get_risk(risk_id: UUID, scope: EntityScope) -> Risk:
    stmt = select(Risk).where(
        (Risk.id == risk_id)
        & (Risk.entity_id.in_(scope.authorized_entity_ids))
        & (Risk.deleted_at.is_(None))          # 軟刪除也要過濾
    )
    return await db.execute(stmt)

# ❌ 禁止 —— 洩漏風險
async def get_risk(risk_id: UUID) -> Risk:
    return await db.execute(select(Risk).where(Risk.id == risk_id))
```

### 鐵律 3：所有 endpoint 必須注入 `current_entity_scope`

實體範疇**只能**由已驗證的憑證／session 推導，**永遠不能**來自請求參數。

```python
# ✅ 正確
@app.get("/api/v1/risks/{risk_id}")
async def get_risk(
    risk_id: UUID,
    scope: EntityScope = Depends(resolve_entity_scope),   # 從 JWT + 角色推導
):
    result = await db.get_risk(risk_id, scope)
    if not result:
        raise HTTPException(status_code=404)
    return result

# ❌ 禁止 —— 從 query string 讀，可被偽造
@app.get("/api/risks")
async def list_risks(entity_id: UUID = Query(...)):
    ...
```

使用者**可以**在 UI 選擇「檢視哪個 OpCo」（設計交付物有 switch-entity 螢幕），
但那是**在既有授權子樹內的篩選**，不是範疇的來源：

```python
# 使用者要求檢視特定實體 → 先驗證它在授權子樹內
if requested_entity_id not in scope.authorized_entity_ids:
    raise HTTPException(status_code=404)      # 404 不是 403
```

**已確認參數 #13 要求三層強制**（導航／路由／動作）**+ 伺服器端 + 含 agent 檢索**。
UI 藏起選單**不算**強制 —— 每一層都要各自成立。

> ⭐ **AI agent 檢索走同一條路徑。** Wave 3 的 agent 若用獨立的檢索管線繞過 scope，
> 那是把整層防禦打穿（`14` + ADR-0008）。Agent 的資料存取**必須**經過同一個 scope 解析。

---

## 404，不是 403

查不到資料時回 **404**，**不要**區分「不存在」與「存在但不在你的範疇內」。

回 403 等於告訴對方「你猜的 ID 是對的，只是不屬於你」—— 那是可列舉的資訊洩漏。
在這個平台上更敏感：ID 可列舉意味著**可以推測出其他 OpCo 有多少風險、多少事件**。

---

## 滾升（Roll-up）—— 與 SaaS 隔離最大的差異 ⭐

跨實體讀取在本專案是**產品的核心價值**（已確認參數 #5：滾升儀表板是旗艦）。
所以規則不是「禁止跨實體」，而是：

### 三個條件，全部要成立

1. **走明確的授權範疇擴張** —— Regional ISO 的 scope 是一個**子樹**，不是「全部」。
   子樹來自組織階層 + 角色指派，**不是** query 參數，也**不是**硬編碼的 `if role == 'regional_iso': return all()`。
2. **滾升路徑自身被稽核** —— 「誰在什麼時候看了哪些實體的聚合」要進稽核軌跡（guardrail 5）。
   讀取也是事件。
3. **絕不變成繞過過濾的後門** —— 滾升 query 一樣經過 scope 過濾，只是子樹比較大。
   **禁止**為了滾升而存在一條「跳過 RLS 的聚合連線」。

```sql
-- ✅ 正確：滾升是子樹過濾，不是無過濾
-- authorized_subtree(:user_scope_root) 回傳該使用者授權根節點下的所有實體 id
SELECT e.region, COUNT(*) FILTER (WHERE r.residual_score >= 16) AS needs_treatment
FROM risk_assessments r
JOIN org_entities e ON e.id = r.entity_id
WHERE r.entity_id IN (SELECT id FROM authorized_subtree(:user_scope_root))
  AND r.deleted_at IS NULL
GROUP BY e.region;

-- ❌ 禁止：用 admin/service 連線繞過 RLS 做聚合
SET ROLE rollup_service;   -- 繞過整層防禦
SELECT region, COUNT(*) FROM risk_assessments GROUP BY region;
```

### 聚合也會洩漏

即使不回傳個別記錄，**聚合值本身就是資訊**。一個只被授權看 OpCo A 的人，
若能取得「全區域平均風險分數」與「不含 A 的平均」，就能推算出其他 OpCo 的值。

**規則**：聚合的分母必須落在授權子樹內。**禁止**提供「全集團基準線」給沒有全集團範疇的角色 ——
除非那個基準線是**刻意公開的**且經過明確決策（寫成 ADR）。

### 單一部署讓繞過更容易寫 ⚠️

原本這裡寫的是「資料落地與滾升的張力」—— 中國 PIPL 要求境內處理，與跨區滾升衝突。
**中國已於 2026-08-08 移出範圍**（`CH-008`、ADR-0010），張力消失，但留下一個**更難察覺的**問題：

> **實體隔離少了一道物理防線。** 分區部署時，跨越中國邊界的讀取在物理上不可能。
> 現在全部實體同一個資料庫 —— **RLS 是唯一的屏障**。
>
> 具體風險：滾升現在只是一個少了 `WHERE entity_id` 的查詢。
> 它跑得通、看起來對、測試也會過（因為資料真的在那裡）。
> **這正是 CLAUDE.md 約束 8 的四個範疇測試必須逐個 endpoint 做的原因** ——
> 尤其是「RLS 層獨立成立」那一項：用 `psql` 直接連、不經應用程式，證明隔離成立。

---

## 兩層防禦：DB 層 vs 應用層

guardrail 4 明說**優先資料庫層強制**，不能只靠應用層檢查。

| 情境 | 建議 |
|---|---|
| 每請求獨立連線 | **RLS policy** —— DB 層強制，最安全 |
| 用 PgBouncer / pgcat 等 pooler（無法 per-request `SET LOCAL`）| 應用層 filter，**但要在 ADR-0004 記錄這個降級與其理由** |
| 高風險表（稽核軌跡 / 證據 / 事件）| **兩者都用** |

```sql
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_scope_risk_assessments ON risk_assessments
    FOR ALL
    USING (entity_id = ANY (string_to_array(current_setting('app.entity_scope'), ',')::uuid[]));
```

**RLS 不是萬靈丹**：它依賴 `SET LOCAL app.entity_scope` 真的有被設定。
若 middleware 漏設，policy 會讓 query 回傳**空集合**（不是報錯）——
一個看起來像「這個 OpCo 沒有風險」的靜默失敗。**在這個平台上那不是空畫面，是錯誤的保證。**
所以 middleware 必須有測試覆蓋，且**空結果與未設定 scope 要能區分**。

---

## 禁止行為對照

| 禁止 | 為什麼 | 正確做法 |
|---|---|---|
| `SELECT * FROM t WHERE id = $1` | 跨實體讀 | 加 `AND entity_id IN (scope)` |
| `UPDATE t SET ... WHERE id = $1` | 跨實體寫 | 同上 |
| `DELETE FROM t WHERE ...` | 硬刪除違反 guardrail 3 | 軟刪除：`UPDATE SET deleted_at = NOW()` |
| `if role == 'regional_iso': return all()` | 角色不等於範疇 | 由組織階層解析授權子樹 |
| 用 service/admin 連線做滾升聚合 | 繞過整層防禦 | 子樹過濾（見 §滾升）|
| 為滾升開一條免 RLS 的唯讀複本 | 同上，只是換個地方 | 複本一樣要有 RLS |
| 在 `localStorage` 存 scope 或 token | **guardrail 7 明文禁止** | 伺服器端 session / httpOnly cookie |

---

## 個資、保留與刪除

### 分類與加密

`05` 定義了資料分類方案（Internal / Restricted / Confidential）。個資欄位加密儲存，
分類標記驅動保留與遮蔽規則。

### 保留期限來自程序，不是自己訂

公司程序已指定保留期（3 年／1 年／最新版本 —— 見 `00` §Consequences 與 `05`）。
**不要自行發明保留期**（已確認參數 #9：照來源文件）。

### 刪除權 vs 不可篡改稽核軌跡 —— 真實張力 ⚠️

guardrail 5 要求稽核軌跡**append-only、防篡改**。個資刪除權要求移除個人資料。
兩者直接衝突。

**解法：稽核軌跡存假名，不存個資。**

```python
async def erase_person(person_id: UUID, scope: EntityScope):
    async with db.transaction():
        person = await db.get_person(person_id, scope)   # 一樣要帶 scope
        if not person:
            raise ValueError("Not found")

        # 1. 刪業務表中的個資欄位（軟刪除 + 欄位清空）
        await db.redact_person_pii(person_id, scope)

        # 2. 稽核軌跡不改寫 —— 它從一開始就只存假名
        #    若既有紀錄存了個資，那是設計缺陷，要開 BUG，不是就地改 log
        # 3. 把這次刪除本身記進稽核軌跡
        await audit.log_erasure(person_id, scope, actor=current_user)
```

> **絕不 `UPDATE audit_log SET ...`。** 改寫稽核軌跡就是破壞 guardrail 5 ——
> 那條 hash chain（ADR-0003）會斷，而且平台將無法證明自己日誌的完整性（guardrail 2）。
> 正確做法是**從第一天就不要把個資寫進去**。

### Log 脫敏

應用日誌與稽核軌跡都不得含個資明文。`16` 的 28 點 DoD 涵蓋這項 —— **對照它驗證，不要宣稱**。

---

## 測試：每個業務 endpoint 四個案例

前三個沿用標準隔離測試，**第四個是本專案特有的**。這是最低要求，不是建議。

```python
async def test_cross_entity_read_denied():
    risk_a = await db.create_risk(entity_id=opco_a.id, title="A 的機密風險")
    with pytest.raises(HTTPException) as exc:
        await get_risk(risk_a.id, scope=scope_of(opco_b))
    assert exc.value.status_code == 404          # 404 不是 403


async def test_cross_entity_write_denied():
    risk_b = await db.create_risk(entity_id=opco_b.id, likelihood=2)
    with pytest.raises(HTTPException) as exc:
        await update_risk(risk_b.id, scope=scope_of(opco_a), likelihood=5)
    assert exc.value.status_code == 404
    # 關鍵：確認資料真的沒被改（只驗回應碼會漏掉「回 404 但資料被改了」）
    assert (await get_risk(risk_b.id, scope_of(opco_b))).likelihood == 2


async def test_rls_policy_enforced_independently():
    """繞過應用層直接驗 DB 層 —— 證明兩層防禦各自成立。"""
    async with db.session() as session:
        await session.execute(text("SET LOCAL app.entity_scope = :s"), {"s": str(opco_a.id)})
        rows = (await session.execute(select(risk_assessments))).fetchall()
        assert all(r.entity_id == opco_a.id for r in rows)


async def test_rollup_limited_to_authorized_subtree():
    """⭐ 本專案特有：滾升角色只看到授權子樹，不是全部。"""
    await db.create_risk(entity_id=opco_a.id, residual_score=20)   # 在 SEA 子樹內
    await db.create_risk(entity_id=opco_ne.id, residual_score=20)  # 在 NE Asia 子樹內

    result = await rollup_dashboard(scope=scope_of_region("SEA"))

    assert opco_a.id in result.contributing_entity_ids
    assert opco_ne.id not in result.contributing_entity_ids
    # 聚合分母也必須落在子樹內 —— 否則能反推子樹外的值
    assert result.denominator == count_entities_in("SEA")
```

---

## 稽核軌跡

記錄每次跨實體存取**嘗試**（包含被擋下的），以及每次**滾升讀取**。

```sql
CREATE TABLE audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    entity_id           UUID NOT NULL,           -- 被存取資料的擁有實體
    actor_id            UUID,                    -- 假名，不是個資
    actor_scope         TEXT NOT NULL,           -- 當時的授權子樹（滾升可稽核性）
    operation           VARCHAR(128) NOT NULL,
    resource_type       VARCHAR(64),
    resource_id         VARCHAR(256),
    access_allowed      BOOLEAN NOT NULL,
    attempted_entity    UUID,                    -- 跨實體嘗試時記錄
    prev_hash           BYTEA NOT NULL,          -- hash chain（ADR-0003）
    row_hash            BYTEA NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

被擋下的嘗試比成功的存取更值得看 —— 它們是入侵偵測訊號。
在這個平台上還有第二層意義：**它們是平台能證明自己 entity-scoping 有效的證據**（guardrail 2）。

---

## 機械強制（建議加的 lint）

勸世文擋不住「這次先不加 `entity_id`，之後補」。寫成 detector：

| Detector | 抓什麼 |
|---|---|
| `check_entity_scoped_query` | ORM query 沒有 scope 過濾（全域表 allowlist 例外）|
| `check_endpoint_scope_dep` | route handler 沒有 `current_entity_scope` 依賴 |
| `check_business_table_entity_col` | migration 新增業務表卻沒有 `entity_id NOT NULL` |
| `check_no_hard_delete` | 業務表出現 `DELETE FROM`（違反 guardrail 3 軟刪除）|
| `check_audit_log_immutable` | 出現 `UPDATE audit_log` / `DELETE FROM audit_log` |
| `check_no_browser_storage_secrets` | `localStorage` / `sessionStorage` 存 token 或個資（guardrail 7）|

撰寫方式見 [`lint-detector-authoring.md`](./lint-detector-authoring.md)。

> 從 **allowlist 開機**：先把上表五類全域表列進白名單讓 detector 立刻能綠，
> 之後每次有人想加白名單就得在 PR 裡說明理由 —— 那正是你要的那道審查。

---

## Definition of Done（任何碰資料層的任務）

- [ ] 新表有 `entity_id NOT NULL` + FK + 以 `entity_id` 起頭的複合索引
- [ ] 新表有 `deleted_at`（軟刪除）與版本欄位（guardrail 3）
- [ ] 新 query 全部帶 scope 過濾，且過濾軟刪除
- [ ] 新 endpoint 接 `current_entity_scope`，範疇來自憑證而非參數
- [ ] 三層強制各自成立：導航 / 路由 / 動作（已確認參數 #13）
- [ ] 查無資料回 **404**，不區分「不存在」與「不在範疇內」
- [ ] 四個範疇測試（跨實體讀拒絕 / 跨實體寫拒絕且資料未變 / RLS 獨立成立 / 滾升限於授權子樹）
- [ ] 狀態變更寫入稽核軌跡，且軌跡中**無個資明文**
- [ ] 若涉及跨區資料流：**先確認 ADR-0006 已拍板**，否則停下來問
- [ ] 全域表（無 `entity_id`）在 PR 描述中明示並說明理由
- [ ] 通過 `16` 的 28 點 secure-development DoD 中適用項，**對照 findings register 驗證**
