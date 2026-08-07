# 01 — Architecture Overview

## Philosophy: foundation-first

The most common way a self-built GRC system fails is by shipping a set of disconnected form-and-list modules that each define "risk", "control", and "owner" their own way. We avoid this by building the shared backbone first and making every future module sit on it.

The backbone is the bottom four concerns below plus a security baseline that wraps all of them.

## Layered architecture

```
┌──────────────────────────────────────────────────────────┐
│ Presentation            role-based UI, dashboards, portal │
├──────────────────────────────────────────────────────────┤
│ Application / Modules   (Wave 1: Policy, Risk, Control)   │
├──────────────────────────────────────────────────────────┤
│ Workflow & Rules        configurable workflow, approvals  │
├──────────────────────────────────────────────────────────┤
│ CORE DATA MODEL         ★ entity graph = single source    │
│                           of truth (see doc 02)           │
├──────────────────────────────────────────────────────────┤
│ Integration             API-first; connectors (later)     │
├──────────────────────────────────────────────────────────┤
│ Data & Analytics        reporting, evidence store         │
├──────────────────────────────────────────────────────────┤
│ Infrastructure          cloud / on-prem / sovereign; RBAC │
└──────────────────────────────────────────────────────────┘
   security-by-design wraps every layer (see doc 04)
```

## Wave 1 backbone components

These are the components to build first. Each has its own doc.

| Component | What it provides | Doc |
|---|---|---|
| **Core data model** | The entity graph linking risk, control, obligation, policy, process, asset, entity, event, issue, test/evidence. Canonical core + governed extensions. | `02` |
| **Multi-entity & jurisdiction model** | Organisational hierarchy (region → country → legal entity → business unit), entity-scoped access, jurisdiction tagging, data residency, regulation-to-control matrix. | `03` |
| **Identity, RBAC & access** | Authentication (SSO/MFA), entity-scoped authorisation, Three Lines separation, segregation of duties. | `05` |
| **Workflow & rules engine** | Configurable state machines, approvals, SLAs, escalation. Kept lean in Wave 1. | `05` |
| **Audit trail** | Append-only, tamper-evident, evidence-grade logging of every change. | `05` |
| **Integration & API foundation** | API-first design; a connector framework to be populated (HRIS, ITSM, SIEM) in later waves. | `05` |
| **Security baseline** | Secure-by-design controls applied across all of the above; the platform's own governance ("Entity Zero"). | `04` |

Two minimal proof modules ride on the backbone to demonstrate it end-to-end: **Policy Management** (exercises documents, workflow, attestation, entity roll-out) and **Risk + Control registers** (exercise the relational heart). See `07`.

## Cross-cutting design rules

- **Entity-scoping everywhere.** Every domain record carries an owning organisational entity; access is filtered by it (prefer database-enforced row-level security).
- **Everything is audited.** No state change bypasses the audit trail.
- **Secure and fail-secure by default.** Deny by default; least privilege; validated inputs; no implicit trust between components.
- **API-first.** The UI is a client of the same API everything else uses; this keeps integration and automation first-class.
- **Deployment-portable.** The design must run in cloud, on-premises, or a sovereign/isolated deployment without re-architecture, because APAC data-residency requirements can force any of these.

## Deployment topology (target)

- Containerised services, orchestrated (e.g. Kubernetes), described entirely in scanned infrastructure-as-code.
- A relational database of record with row-level security for entity-scoping.
- A separate, restricted store or table design for the append-only audit trail.
- Secrets held in a managed secrets store, never in images or code.
- Able to be deployed per-region where data residency demands local processing/storage (see `03` and `04`).

Concrete technology choices are proposed in `06` and tracked as ADRs — they are deliberately not hard-coded here.
