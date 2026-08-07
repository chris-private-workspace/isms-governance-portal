# APAC ISMS Governance Platform — 系統架構主 spec

**Purpose**: 系統的 WHAT + WHY 的**入口**。本專案的架構真理分散在 `02-architecture/` 的
18 份既有規格中，本檔是導向它們的薄轉址層 + 摘要。
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active
**Version**: 0.2

> **Modification History**
> - 2026-08-07: Repointed to the project's existing 18 specs (template default was a blank form)

> ⚠️ **本檔刻意保持薄。** 這個專案在套用開發流程模版之前，架構文件就已經完整存在於
> `02-architecture/00`–`16`。把內容複製到這裡會製造兩份會漂移的真相。
> **改架構請改 `02-architecture/` 的對應規格，不是改這裡。**

---

## 1. 系統要做什麼

區域 ISO 打開儀表板，看見 14 家 APAC OpCo 的 ISMS 現況（風險、控制、政策、事件、供應商）
彙總為一張圖，並能下鑽到單一 OpCo 乃至單筆風險。OpCo 的控制負責人在同一套系統裡
做 RCSA、維護資產清冊、回報事件、上傳證據。所有輸入沿用公司既有的表單與程序
（RCI 風險管理程序、事件範本、供應商管理程序、APAC ISMS profile），
不是另一套要重新學的模型。

平台自身也是它管的一項資產（"Entity Zero"），受自己的政策與稽核軌跡約束。

| 詳細 | 去哪 |
|---|---|
| 願景、已確認決策、非目標 | [`02-architecture/00-project-charter.md`](./02-architecture/00-project-charter.md) |
| 旗艦儀表板規格 | [`02-architecture/08-rollup-dashboard-spec.md`](./02-architecture/08-rollup-dashboard-spec.md) |

## 2. 分層

7 層，由上而下：`Presentation → Application/Modules → Workflow & Rules →`
**`CORE DATA MODEL`** `→ Integration → Data & Analytics → Infrastructure`。
security-by-design 橫切每一層。

**關鍵不變式**：
- 上層可依賴下層，**下層絕不 import 上層**
- 核心資料模型層不依賴任何模組
- 稽核與 entity-scoping 是橫切關注點，不是某層的私有功能

> 完整分層圖與各層職責：[`02-architecture/01-architecture-overview.md`](./02-architecture/01-architecture-overview.md)

## 3. 範疇（Scopes）

| # | 範疇 | 目錄 | 職責 |
|---|------|------|------|
| 1 | `core-model` | ⚠️ 待 ADR-0001 | 實體圖：risk / control / obligation / policy / process / asset / entity / event / issue / evidence |
| 2 | `entity-scope` | ⚠️ 待 ADR-0001 | 組織階層、entity scoping / RLS、管轄區標記、資料落地路由 |
| 3 | `identity` | ⚠️ 待 ADR-0001 | 認證（SSO/MFA）、entity-scoped 授權、三道防線分離、SoD |
| 4 | `workflow` | ⚠️ 待 ADR-0001 | 可設定狀態機、簽核、SLA、升級 |
| 5 | `audit-trail` | ⚠️ 待 ADR-0001 | Append-only、防篡改、證據等級日誌 |
| 6 | `api` | ⚠️ 待 ADR-0001 | API-first 契約層；連接器框架（後續 wave 填充）|
| 7 | `modules` | ⚠️ 待 ADR-0001 | Wave 1 兩個證明模組：Policy Management、Risk + Control registers |
| 8 | `ui` | ⚠️ 待 ADR-0001 | 角色式 UI、滾升儀表板；消費設計交付物的 tokens 與 class 名 |

> **目錄欄位在 ADR-0001（後端語言與框架）拍板前無法填寫** —— 這是刻意的：
> 先選框架再定目錄結構，不要反過來。

> 跨範疇 import 規則：[`rules-on-demand/scope-boundaries.md`](./rules-on-demand/scope-boundaries.md)
> 跨範疇契約登記：[`02-architecture/cross-scope-interfaces.md`](./02-architecture/cross-scope-interfaces.md)

## 4. 資料流

主流量：一次風險評估從輸入到滾升。

```
控制負責人 (OpCo)                          區域 ISO
      |                                         |
      v                                         v
  [RCSA 表單]                            [滾升儀表板]
      |                                         ^
      v                                         |
  entity_id 由 session 推導                 授權子樹聚合
      |                                         |
      v                                         |
  [風險評估]  L(1-5) x MAX(FIN,BOP,LRY,REP,SIS) |
      |         = 1-25，控制前後各評一次         |
      v                                         |
  殘餘 >= 16 ? --yes--> [IT Risk Register] -----+
      |                                         |
      no                                        |
      v                                         |
  [核心資料模型] --- entity-scoped (RLS) -------+
      |
      v
  [稽核軌跡]  append-only + hash chain（每次寫入與每次滾升讀取）
```

> ⚠️ **跨區聚合這一段尚未有定案** —— 中國 PIPL 落地與跨區滾升直接衝突，
> 由 **ADR-0006** 決定。M0 阻斷項，見 [`rules-on-demand/multi-tenant-data.md`](./rules-on-demand/multi-tenant-data.md) §滾升。

## 5. 關鍵技術決策

**全部未拍板。** 9 份基礎 ADR 一份都還沒寫 —— 這是目前最大的單一阻斷點。

| 決策 | 選了什麼 | ADR |
|---|---|---|
| 後端語言與框架 | ⚠️ 未定 | `14-adr/` ADR-0001 |
| Workflow engine：自建 vs 嵌入 | ⚠️ 未定 | ADR-0002 |
| 稽核軌跡 hash-chain 設計 | ⚠️ 未定 | ADR-0003 |
| Entity-scoping 強制方式 | ⚠️ 未定（方向：PostgreSQL RLS）| ADR-0004 |
| 受治理擴充欄位儲存 | ⚠️ 未定（方向：JSONB + field catalog）| ADR-0005 |
| **部署與資料落地拓撲** | ⚠️ 未定 —— **M0 阻斷項** | ADR-0006 |
| Identity provider | ⚠️ 未定 | ADR-0007 |
| AI agent 架構 | ⚠️ 未定 | ADR-0008 |
| AI 處理地點（主權控制）| ⚠️ 未定 | ADR-0009 |

完整清單與阻斷關係：[`14-adr/README.md`](./14-adr/README.md)
選型原則與 ADR 模板：[`02-architecture/06-tech-stack-and-decisions.md`](./02-architecture/06-tech-stack-and-decisions.md)

## 6. 明確不做的

- **不是對外多租戶 SaaS。** 若集團日後決定服務非集團客戶再重議。
- **不是一次做完十四個功能模組。** Wave 2/3 在骨幹被證明之後才開始。
- **Wave 1 不做重量級 BPM 引擎。** 工作流保持精簡且可設定。
- **不做通用 GRC 模型。** 平台數位化公司既有範本，不發明欄位。
- **不支援印度 / DPDP。** 印度明確排除；忽略設計交付物中的印度樣本資料。

## 7. Frozen sections

| 章節 | Frozen？ | 改動門檻 |
|---|---|---|
| §2 分層 | 是 | ADR + owner approve |
| §3 範疇 | 是 | ADR + owner approve |
| §6 明確不做的 | 是 | 這些是已確認參數，見 `CLAUDE.md` §已確認參數 —— 改動需明確指示 |

---

## 相關
- 核心資料模型（**最重要的一份**）→ [`02-architecture/02-core-data-model.md`](./02-architecture/02-core-data-model.md) + [`02a-data-model-spec.md`](./02-architecture/02a-data-model-spec.md)
- 安全設計 → [`02-architecture/04-security-by-design.md`](./02-architecture/04-security-by-design.md)
- 建置順序 → [`02-architecture/07-wave1-build-plan.md`](./02-architecture/07-wave1-build-plan.md)
- 部署 topology → [`13-deployment/`](./13-deployment/README.md)
- Component 逐項 → [`02-architecture/COMPONENT_CATALOG.md`](./02-architecture/COMPONENT_CATALOG.md)
- 未拍板的問題 → [`decision-form.md`](./decision-form.md)
