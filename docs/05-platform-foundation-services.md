# 05 — Platform Foundation Services

These cross-cutting services support every module. Build them as part of the backbone, kept deliberately lean in Wave 1.

## Identity, RBAC & access

- **Authentication:** delegate to an OIDC identity provider; enforce MFA. The platform does not store passwords itself where an IdP can be used.
- **Authorisation model:** role-based, with each assignment carrying an **entity scope** (single entity, subtree, or region) — this is what feeds the row-level security in `03`. Add attribute-based rules where a permission depends on record attributes.
- **Three Lines separation:** first-line (owns/operates controls), second-line (oversight, frameworks), third-line (independent audit). Encode as distinct role sets with **segregation-of-duties** constraints (e.g. a control's owner cannot sign off its own independent test).
- **Wave 1 scope:** a working role catalog for the proof modules (policy, risk, control), entity-scoped enforcement, and SoD checks. Just-in-time privileged elevation can be minimal but must be logged.

## Workflow & business-rules engine

- **Purpose:** drive review/approval/attestation lifecycles (e.g. policy draft → review → approve → publish; issue → action → closure).
- **Approach:** a **configurable state machine** with transitions, guards, SLAs, escalation, and notifications. Do **not** build a heavyweight BPM engine in Wave 1 (charter non-goal); keep it lean and data-driven so states/transitions are configuration, not code. Build-vs-embed is an open ADR (`06`).
- **Wave 1 scope:** enough to run the policy approval flow and the issue→action flow end-to-end, with SLA timers and escalation.

## Audit trail (evidence-grade)

- **Append-only.** No updates or deletes to log rows.
- **Tamper-evident.** Each entry stores a hash over its content plus the previous entry's hash (a hash chain), so any tampering breaks the chain and is detectable; the platform can verify the chain on demand.
- **Content.** Actor, action, target reference, before/after snapshot (or diff), timestamp, and source context.
- **Coverage.** Every create/update/retire on every domain entity, plus security-relevant events (logins, permission changes, privileged elevation).
- **Wave 1 scope:** the chained log table, a write path that no domain write can bypass, and a verify-integrity routine. The exact hash-chain design is an open ADR (`06`).

## Notifications

- Fan out workflow events (assignments, approvals due, SLA breaches, escalations) to users via their preferred channel.
- Keep the mechanism simple in Wave 1 (in-app + email); make it an interface so channels can be added later.

## Integration & API foundation

- **API-first.** Every capability is exposed through a versioned API; the UI is just another client. This makes automation and later integrations first-class.
- **Connector framework:** define the shape of connectors now (auth, sync, mapping to the core data model) but populate them later — HRIS (org hierarchy, joiners/movers/leavers), ITSM/CMDB (assets), SIEM (control evidence) arrive in later waves.
- **Security:** authenticated, authorised (same entity-scoping), rate-limited, and audited like everything else.
- **Wave 1 scope:** the API surface for the proof modules plus the connector interface definition — no live external connectors yet.

## Shared assessment / questionnaire engine ★

Three separate needs turn out to be the same pattern: **RCSA**, **control testing**, and **vendor service audits** all follow *template of questions → assign to a subject → respond → review → produce findings → raise issues*. Build this **once** as a reusable engine with different question-set templates, rather than three times.

- `AssessmentTemplate` — named question set, versioned, with sections and question types (yes/no/NA, score, free text, evidence-required flag).
- `AssessmentInstance` — template + subject (risk / control / vendor / entity) + period + assignee + reviewer + status.
- `AssessmentResponse` — per-question answer, optional evidence attachment.
- Findings → `Issue` → `Action`, using the standard workflow.

Segregation of duties applies: the reviewer must not be the assignee, and for vendor audits the auditor must be independent of the relationship manager.

## Access management (beyond RBAC)

Specified by the design handoff and required for the platform to exemplify its own controls:

- **Access requests** — requester, requested access, business reason, approver, status. An approval workflow, fully audited.
- **Access review campaigns** — periodic recertification of who has what, with per-reviewer progress tracking. (Note: an audit finding in the sample data is precisely a privileged-access review that was performed but not evidenced — the campaign exists so evidence is captured automatically.)
- **Authentication & session policy** — SAML SSO, enforced MFA, session timeout, IP restriction.
- **Just-in-time auditor access** — time-boxed elevation for third-line users rather than standing rights.
- **Break-glass accounts** — emergency access, heavily restricted, alarmed and fully audited on use.

These are Entity Zero controls as much as product features: the platform must be able to evidence its own access governance.

## Records retention

Both the risk management and supplier management procedures specify retention periods (e.g. Asset Inventory 3 years, Risk Management Report 3 years, Approved Vendor List latest version, Supplier Service Report 1 year). Retention is therefore a **platform-level capability**, not a per-module afterthought.

- A `retention_policy` per record type: duration, trigger (creation / closure / supersession), and disposition (retain / archive / purge).
- Must reconcile with soft-delete and the immutable audit trail: **retiring a record must never break audit-trail integrity**. Retention governs the *record*; the audit trail of what happened is preserved per its own rules.
- Retention actions are themselves audited.

**Legal hold** is a first-class concept: a hold suspends disposal for the affected records regardless of their retention period, is applied and released by authorised roles only, and is itself auditable. Records under hold must be visibly flagged.

Confirmed retention periods (from the design handoff's records-and-retention section):

| Record class | Retention | Basis |
|---|---|---|
| Security incident records | 3 years after closure | ISO 27001 A.5.28 · group records policy |
| Risk Management Report & SoA | 3 years per version | RM procedure |
| ISMS profile versions | 3 years per version | Controlled document register |
| Audit issues & evidence | **6 years** | Certification body requirement |
| External party assessments | Contract term + 2 years | A.5.19–A.5.22 |
| Platform audit log | **7 years, immutable** | Append-only, SHA-256 chained — no disposal |

## Controlled documents & data classification

Every source procedure carries the same control block, which the policy/document module must support natively: **document owner, classification, publication date, version number, revision date, summary of changes, distribution list (copy / issued to / location)**.

The group's **data classification scheme** observed in these documents is **Internal · Restricted · Confidential**. Model it as a first-class, configurable enumeration and apply it consistently to documents, assets, and information handled in vendor risk assessments — several modules reference it (e.g. "highest classification of information involved").

## How these fit together

A typical write (e.g. approving a policy) flows: authenticated request → authorisation with entity scope → workflow transition with guard/SLA → domain write → **audit-trail entry** → notification. No step is optional; the audit-trail entry in particular is mandatory for every state change.
