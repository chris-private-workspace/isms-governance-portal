# ADR-0007: Microsoft Entra ID as the identity provider, superseding the handoff's Okta

**Date**: 2026-08-07
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: 無 —— `CH-005`

---

## Context

`decision-form.md` OQ-5 notes why this cannot be deferred to M4's implementation: **how six roles ×
entity scope map onto the wire depends on the IdP's capabilities** (groups, claims, SCIM). Getting
it wrong is a schema decision, not a configuration one.

Two inputs now exist that did not when `06:21` recommended "an OIDC provider, self-hostable e.g.
Keycloak, or managed":

- **All three existing projects authenticate against Microsoft Entra ID** — `python-jose` +
  `msal-react`, `jwks-rsa`, and `next-auth v5` respectively (ADR-0001 §Context).
- **ADR-0006 settled Azure**, including Azure China, which runs its own Entra ID instance.

Working against this: **the design handoff names Okta explicitly.** CH-002's audit recorded
`sessionPolicy.js` as "SAML 2.0 / Okta, hardware key for Platform admin, 30 min idle / 12 h
absolute, IP restriction, JIT auditor expiry, 2 break-glass with P1 to Group CISO" and flagged it as
**"direct input to ADR-0007"** (`docs/09-analysis/mockup-data-vs-spec-audit-20260807.md:199`).

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** Microsoft Entra ID | Already the organisational standard across three projects; native to the chosen cloud; Azure China ships a matching in-country instance, so it composes with ADR-0006 | Contradicts the design deliverable; ties identity to one vendor | Low — existing integrations to copy |
| **B** Okta | What the deliverable specifies | Not an organisational asset. Adopting it means operating a **second** IdP alongside the Entra ID the group already runs, for one application | Medium, and permanent |
| **C** Keycloak (self-hosted) | No vendor tie; deployable in-country anywhere | **The platform would operate its own identity system.** Under guardrail 1 that adds attack surface and an availability dependency to a product whose entire premise is not being a risk source | High, ongoing |

---

## Decision

**選 A — Microsoft Entra ID, via OIDC. This supersedes the design handoff's Okta and its SAML 2.0
assumption.**

The deliverable is authoritative for UI (已確認參數 11), but `sessionPolicy.js` is not a UI decision
— it names an infrastructure vendor. `06:11`'s selection principle ("longevity & hiring — boring,
well-supported technology") counts existing organisational assets, and the group already runs Entra
ID everywhere. Introducing a second IdP for one application inverts that principle.

On protocol: the deliverable says SAML 2.0, but `04:49` and `06:21` both specify **OIDC**, and the
authority order puts design documents above deliverables (`CLAUDE.md` §權威排序). Entra ID serves
both; OIDC is chosen for consistency with the design documents and with all three existing projects.

### ⚠️ 記錄的偏離（約束 6）

Under 約束 6 a divergence from the deliverable must be **documented and approved, never
approximated silently**. This is that record:

| | Deliverable (`sessionPolicy.js`) | Decided | 偏離? |
|---|---|---|---|
| Vendor | Okta | **Entra ID** | ✅ yes — organisational asset wins |
| Protocol | SAML 2.0 | **OIDC** | ✅ yes — design docs (`04:49`, `06:21`) win over deliverable |
| Hardware key for Platform admin | required | required | no — Entra authentication strength |
| 30 min idle / 12 h absolute | required | required | no — Entra sign-in frequency + session controls |
| IP restriction | required | required | no — Entra named locations |
| JIT auditor expiry | required | required | no — time-boxed elevation (`05:56`) |
| 2 break-glass, P1 to Group CISO | required | required | no — Entra emergency access accounts |

**Only the vendor and the protocol change. Every policy requirement the deliverable specifies is
retained**, which is the distinction that makes this a substitution rather than a scope reduction.
`15-design-alignment.md` carries the matching row.

### 否決其他選項的理由

- **B (Okta)** — the deliverable's choice reflects a design-time assumption, not a group standard.
  Running two IdPs means two sets of conditional-access policies, two break-glass procedures and two
  audit surfaces for one application.
- **C (Keycloak)** — self-hosting identity makes the platform responsible for the availability and
  security of its own authentication plane. `04:62` requires the platform to be up **during a
  crisis**; adding a self-run IdP to the critical path works against that.

---

## Consequences

### 我們接受了什麼

- **Vendor tie to Microsoft**, already accepted at the cloud layer by ADR-0006. Concentration risk
  is real and is tracked as a platform risk rather than dismissed.
- **Two identity planes.** The global tenant and Azure China's instance are administered separately;
  role assignments do not automatically flow between them. M4 must define how the six roles are
  provisioned in each. ⚠️ **Unverified operational detail** — confirm with the Azure team before M4.
- **Segregation of duties is not delivered by the IdP.** Entra expresses group membership and
  conditional access; it does not know that an auditor must not edit the controls they assure
  (`05:9`). SoD stays an application-layer constraint enforced server-side (已確認參數 13).

### 這個決定約束了什麼

- Entity scope reaches the application as an OIDC claim or group mapping, and **only from the
  token/session — never from a request parameter** (`CLAUDE.md` 約束 8). That claim is what feeds the
  RLS session variable ADR-0001 relies on.
- `05:7`'s "the platform does not store passwords" holds: no local credential store.
- Access requests, review campaigns and break-glass (`05:49`) remain **platform features**, not
  Entra features — they are Entity Zero controls that must be evidenced from within the product.

### 可證偽條件 ⭐

1. **If Entra ID cannot express six roles × entity subtree scope** — e.g. group-claim count limits
   bite at 14 OpCos × 6 roles, or subtree scope has no natural group representation — then scope
   must live in an application-side role-to-scope table. That is a documented downgrade, not a
   silent one, and it changes how M4 is built.
2. If the Azure China instance cannot synchronise role definitions with the global tenant, China
   needs its own administration procedure and the "one canonical role catalog" assumption fails.
3. If group IT standardises on a different IdP, the organisational-convergence basis of this
   decision disappears.

### Rollback

- **Entra → another OIDC provider**: moderate. Cost is concentrated in conditional-access policy
  re-expression and group-to-scope mapping, not in application code, provided the app consumes only
  standard OIDC claims. **Design constraint: do not consume Entra-proprietary claim shapes.**
- **回滾窗口**: after **M4** provisions real users and scope assignments, migration means re-issuing
  every assignment. Before M4 it is configuration only.

---

## Security & compliance impact

*(This project's mandatory fifth block — `06:70`.)*

| Guardrail | Effect |
|---|---|
| **g6 — least privilege & SoD** | Partial. Entra covers authentication strength, conditional access and JIT elevation; **SoD and Three-Lines separation remain application-enforced**. Do not assume the IdP delivers them. |
| **g4 — entity-scoped access** | Enabling. The scope claim is the input to the RLS session variable. ⚠️ Corollary: a mis-issued claim is now a data-isolation failure, so claim issuance is a security-critical path and must be audited. |
| **g8 — residency** | Positive. Azure China's separate instance keeps Chinese users' identity data in-country, consistent with ADR-0006. |
| **g5 — audit trail** | Sign-ins and permission changes must reach the platform's own append-only log (`05:23`), not only Entra's. Entra logs are not evidence-grade **for this platform's** chain. |
| **g1 — must not be a risk source** | Positive versus self-hosting: no identity plane of our own to secure, patch and keep available during a crisis. |
| **g2 — Entity Zero** | Access requests and review campaigns stay in-product precisely so the platform can evidence its own access governance (`05:54`). |

---

## 相關

- **實作**: `CH-005`; consumed at **M4** (`07:35`)
- **相關 ADR**: ADR-0006 (Azure China's separate instance) · ADR-0001 (`jwks-rsa` precedent in
  `unified-operation-platform`)
- **關閉**: `decision-form.md` OQ-5
- **偏離記錄**: `15-design-alignment.md` — Okta → Entra ID, SAML → OIDC
- **上游**: CH-002 audit (`docs/09-analysis/mockup-data-vs-spec-audit-20260807.md:199`)
