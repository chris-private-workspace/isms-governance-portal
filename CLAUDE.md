# CLAUDE.md — Project Context & Guardrails

This file is the standing context for all Claude Code work in this repository. Read it before making any change.

## What this project is

An internally built **GRC (Governance, Risk & Compliance) platform** for a regional IT office that provides GRC services and guidance to multiple **APAC subsidiaries** of a single group. The organisation is in the **technology & services** sector.

We are currently building the **Wave 1 backbone** — the shared foundation (data model, entity/jurisdiction model, identity & access, workflow, audit trail, security baseline) — before building functional modules. Foundation-first is a deliberate decision.

## Confirmed parameters (do not re-litigate without explicit instruction)

- **Internal build**, not a commercial platform deployment. Commercial platforms (ServiceNow, Archer, MetricStream, IBM OpenPages, LogicGate, etc.) are **feature benchmarks and reference architectures only**, never dependencies.
- **Multi-entity, multi-jurisdiction, single group.** This is NOT external multi-tenant SaaS. Use an organisational hierarchy with entity-scoped access — not full tenant isolation. (Details: `docs/03-multi-entity-and-jurisdiction.md`.)
- **Foundation-first sequencing.** The core taxonomy must be designed from day one to accommodate IT assets, suppliers/vendors, and data flows, even though those modules come in later waves.
- **Jurisdictions:** NE Asia (JP/KR/CN/HK/TW) + SE Asia (SG/MY/TH/ID/PH/VN) + Oceania (AU/NZ); India excluded. **China is in scope, so PIPL data localisation is a hard requirement** — per-region deployment from day one (ADR-0006). Localisation/i18n (zh-Hant, ja, ko, en + SEA) is a foundation concern.
- **Primary driver: internal governance & visibility.** The cross-entity roll-up dashboard is the flagship; Wave 1 stays lean (no compliance/incident modules pulled forward).
- **Target users: full Three Lines + management** (first-line business/ops, second-line risk & compliance, infosec/IT, management consumers). Internal audit deferred to Wave 2. Keep first-line UX lightweight (RCSA).
- **Risk scoring follows the company's RCI Risk Management Procedure**, not a generic 5×5: `Risk = Likelihood(1–5) × MAX(FIN, BOP, LRY, REP, SIS)` giving **1–25**; scored **before and after control**; **<16 acceptable, ≥16 requires treatment**; residual ≥16 goes to the **IT Risk Register**. Scales are group-standard with governed per-entity calibration via configuration only. See `docs/02a`.
- **Risk assessment is asset-based**: asset group → asset → threat → vulnerability → CIA type. The **Asset Inventory, Threat and Vulnerability libraries are Wave 1**, not later. **Statement of Applicability** is a required ISO 27001 output.
- **The platform digitises the company's existing templates**, not a generic GRC model. When designing a form or workflow, follow the source document (see `docs/11`–`13`) rather than inventing fields.
- **Product framing: an APAC ISMS Governance Platform** (ISO/IEC 27001 + 27017 across the OpCos), not a general-purpose GRC suite. The ISMS is the organising spine.
- **A high-fidelity design handoff exists and is authoritative for UI** (tokens, typography, shell, all 30 screens). Domain logic still follows the company procedures in `docs/02a`, `11`, `12` — where the design simplifies (notably the risk form's single impact value), **build to the procedure, not the mockup**. See `docs/15-design-alignment.md`.
- **Scope: 14 OpCos across 12 jurisdictions.** India is **out**; China is **in**; Japan is group HQ, not an APAC OpCo. Full list in `docs/15-design-alignment.md` §1. Because China is in scope, **PIPL data localisation is a hard day-one requirement — ADR-0006 (per-region deployment) is blocking for M0**, and AI processing location is a sovereignty control (ADR-0009). Ignore India/DPDP and any India sample data in the design handoff.
- **Six roles** (Platform admin, Regional ISO, OpCo admin, Control owner, OpCo OS, Auditor) × eleven modules, enforced at navigation, route **and** action level, with entity scope on top, server-side, including agent retrieval.
- **Build path affirmed with eyes open.** A build-vs-buy study recommended against a full self-build; the stakeholder consciously affirmed the internal build. Its flagged risks are now design constraints (see `docs/00` guardrails). The heaviest one — obligation-content maintenance — is answered by the frameworks-first strategy in `docs/10`.
- **Wave 2 decisions:** content strategy = frameworks-first (ISO 27001 Annex A + SOC 2 TSC) + scope discipline + AI-assisted change parsing, with content subscription deferred (build the ingestion interface, leave it unpopulated); audit module lightweight; control testing manual + evidence, with CCM hooks reserved for Wave 3.

## Non-negotiable guardrails

These are hard constraints. If a requested change would violate one, stop and flag it rather than proceeding.

1. **The platform must not itself be a source of risk.** This is a security/risk system; it has to be exemplary. Every design and code decision must be defensible against the very controls this platform is built to enforce. When in doubt, choose the more secure, more auditable option. See `docs/04-security-by-design.md`.
2. **Self-governance ("Entity Zero").** The platform is registered as an asset inside its own system and is subject to its own policies, controls, risk assessments, and audit trail. It must be able to demonstrate its own compliance (e.g. ISO 27001, SOC 2) using its own capabilities.
3. **The core data model is sacred.** Maintain a *canonical core with governed local extensions*. Every record has a stable unique ID, an owning organisational entity (for scoping and roll-up), full version history, soft-delete, and is captured in the audit trail. Do not let individual modules invent their own private definitions of shared entities (risk, control, obligation, issue, owner). See `docs/02-core-data-model.md`.
4. **Everything is entity-scoped.** Data access is filtered by organisational entity by default (prefer database-enforced row-level security, not just application checks). Regional roll-up is additive on top of that.
5. **Immutable, evidence-grade audit trail.** All state changes are recorded in an append-only, tamper-evident log. Auditors must be able to trust it; the platform must be able to prove its own log integrity.
6. **Least privilege & segregation of duties.** Entity-scoped RBAC (plus attribute-based rules where needed). Enforce the Three Lines of Defense separation and auditor independence through permissions.
7. **Secure SDLC.** No secrets in source. Dependency, static, and dynamic scanning (SCA/SAST/DAST) in CI. Produce an SBOM. Sign build artifacts. Infrastructure-as-code is scanned too.
   **Every story must pass the 28-point secure-development Definition of Done in `docs/16-secure-development-dod.md`**, derived from the organisation's own Qualys/Rapid7 scan results. Verify fixes against the findings register in `reference/Secure-Dev-DoD-Checklist.xlsx` rather than asserting them. Two rules that are easy to break by accident: **never put credentials, tokens or personal data in localStorage/sessionStorage**, and **never generate seed or demo data containing checksum-valid card numbers or real personal data**. Do not inherit platform defaults for TLS certificates, security headers or management ports — configure them explicitly.
8. **Privacy & data residency by design.** Data minimisation, purpose limitation, and support for jurisdiction-specific data-residency/localisation requirements (e.g. China PIPL) are architectural concerns, not afterthoughts.
9. **Language:** code/comments/technical docs in English; any end-user-facing text and UI copy in **Traditional Chinese (繁體中文)**.

## How to work in this repository

- **Docs-first.** The `docs/` set is the source of truth for architecture. If code and docs disagree, reconcile them — update the doc in the same change.
- **Record decisions as ADRs.** Any significant technical choice (framework, workflow engine, audit-trail scheme, etc.) gets an ADR in `docs/adr/`. Template and the current open-decision list are in `docs/06-tech-stack-and-decisions.md`. Several foundational decisions are still open — surface them, don't silently pick.
- **Security gate every increment.** No increment is "done" until it meets the checks in `docs/04-security-by-design.md` and `docs/07-wave1-build-plan.md` (tests, threat considerations, audit logging, access scoping).
- **Build in the sequence in `docs/07-wave1-build-plan.md`.** The backbone comes before modules; within the backbone, the data model and entity/jurisdiction/RLS layer come before anything that depends on them.
- **Ask when a prerequisite is missing.** Some parameters (primary driver, specific jurisdictions, target roles) are still open; where they block a decision, ask rather than assuming.

## Document map

| File | Purpose |
|---|---|
| `docs/00-project-charter.md` | Vision, confirmed decisions, open items, guiding principles, non-goals |
| `docs/01-architecture-overview.md` | Layered architecture, Wave 1 backbone components, deployment topology |
| `docs/02-core-data-model.md` ★ | Entities, relationships, ERD, taxonomy design rules — the heart |
| `docs/03-multi-entity-and-jurisdiction.md` | Org hierarchy, entity-scoping/RLS, data residency, regulation-to-control matrix |
| `docs/04-security-by-design.md` ★ | Secure-by-design tenets, self-governance, threat model, controls, secure SDLC |
| `docs/05-platform-foundation-services.md` | Identity/RBAC, workflow engine, audit trail, notifications, integration/API |
| `docs/06-tech-stack-and-decisions.md` | Recommended stack, selection principles, open ADRs, ADR template |
| `docs/07-wave1-build-plan.md` | Build sequence, definition of done, testing/security gates, milestones |
| `docs/08-rollup-dashboard-spec.md` | Flagship dashboard: layout, metrics, RAG thresholds |
| `docs/09-ui-design-brief.md` | UI design brief (screens, patterns, visual direction) |
| `docs/10-wave2-compliance-and-obligations.md` | Wave 2 compliance module + obligation-content strategy |
| `docs/11-security-incident-module.md` | Security incident form, S1/S2/S3 SLAs, workflow (Wave 2) |
| `docs/12-supplier-management-module.md` | Supplier/TPRM lifecycle from the four source documents (Wave 2) |
| `docs/13-isms-profile-module.md` | Per-entity ISMS profile + approved OP/OS offerings (Wave 1) |
| `docs/14-ai-agent.md` | Conversational agent, sovereignty constraint, guardrails (Wave 3) |
| `docs/15-design-alignment.md` ★ | Delta vs. the design handoff: scope, new modules, roles, retention, access management |
| `docs/16-secure-development-dod.md` ★ | 28-point secure-development Definition of Done from the organisation's own scans |
| `reference/` | Source artifacts: secure-development guidance + DoD checklist workbook (confidential) |
