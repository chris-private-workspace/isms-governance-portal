# 12 — Supplier Management Module (TPRM)

Designed from the company's existing supplier management document set: one governing procedure plus three forms. The procedure defines the lifecycle; the forms are the artifacts produced at each stage.

## Source documents

| Document | Role | Retention (per procedure) |
|---|---|---|
| **RCI Supplier Management Procedure** (docx) | Governs the whole lifecycle | — (controlled document) |
| **Approved Vendor List** (xlsx) | The master register | Latest version |
| **External Party Risk Assessment Form** (xlsx) | Risk assessment when an external party needs access | 3 years |
| **External Service Provider Service Audit Checklist** (xlsx) | Periodic assurance | 3 years |
| *Vendor Evaluation Report* | **Not yet provided** — onboarding evaluation | 3 years |
| *Supplier Registration Form* | **Not yet provided** — onboarding registration | 3 years |
| *Supplier Service Report* | **Not yet provided** — ongoing service reporting | 1 year |

> Three onboarding/reporting forms referenced by the procedure have not been supplied. The onboarding stage is modelled generically below and should be refined once those forms are available.

## Lifecycle

```
Selection → Risk assessment → Management approval → Contract & NDA
   → Service transition → Ongoing monitoring → Annual service audit
   → (renewal | remediation | termination)
```

Key procedural rules to enforce in the workflow:

- **Risk assessment must be approved by management *before* the outsourcing contract is signed.** This is a hard gate, not a reminder.
- Every approved supplier is subject to an **annual performance review / service audit** by the respective Division/Department Head.
- Persistent non-conformance → escalation → possible contract termination.
- Termination has its own checklist (service transition back, return of documents/records, purge/destruction of copies and media, perpetual confidentiality obligations) — model it as a **verified checklist**, not free text.

## Selection criteria (from the procedure)

Company reputation & history · quality of service to other customers · financial stability & commercial record · internal and external audit findings · employee retention rates · **quality/security certifications held (ISO 9000, ISO/IEC 27001)**. Further information-security criteria may be added as an output of risk assessment.

## Data model

Makes concrete the `Vendor` entity reserved in Wave 1.

**Vendor** — base fields (incl. `org_entity_id` = the OpCo), `name`, `contact_details`, `products_or_services_provided`, `status` (prospective / approved / suspended / terminated), `approved_at`, `relationship_manager_user_id`, `certifications_held`, `tier`/`criticality`, `contract_ref`, `nda_signed` (bool + date).

**VendorEvaluation** — selection-criteria scoring, evaluator, decision, approval. *(Refine when the Vendor Evaluation Report is provided.)*

**ExternalPartyRiskAssessment** — the access-driven assessment, mapping 1:1 to the form:

| Field | Notes |
|---|---|
| `ref`, `assessment_date` | |
| `vendor_id` / `external_party_name` | FK where the party is a registered vendor |
| `asset_or_facility_accessed` | **FK → Asset** where possible — links TPRM into the core model |
| `access_type` | physical / logical / onsite / offsite (multi-select) |
| `highest_information_classification` | Internal / Restricted / Confidential |
| `duration_frequency` | e.g. realtime, on demand |
| `external_personnel_handling_data` | |
| `business_reason` | |
| `risks_of_providing_access` | → link to `Risk` records |
| `existing_controls` | → **link to `Control`** records |
| `control_adequate` (bool) | |
| `available_third_party_controls` | |
| `third_party_control_adequate` (bool) | |
| `new_control_required` | → raises an `Issue`/`Action` when yes |
| `performed_by_user_id`, `performed_at` | |

> Note the trigger: this assessment is **access-driven** — it fires when an external party needs access to information processing facilities or information, not merely when a contract is signed. Model the trigger accordingly.

**VendorServiceAudit** — periodic assurance, implemented on the shared assessment engine (see `05`). Header: vendor, audit date, auditor. Question sections per the checklist:

1. **Service Quality and Improvements** (5 questions)
2. **Outsourced IT Operations, Physical and Environmental Security** (7 questions)
3. **Information Security** (4 questions)
4. **Outsourced System Development and Maintenance** (5 questions)
5. **Follow-up action taken and external service provider's response**

Answers support N/A. Findings → `Issue` → `Action`, tracked to closure like any other issue.

*(Template housekeeping: the source checklist numbers section 2 as 1,2,3,4,6,7 — the missing 5 appears to be a template slip; renumber when digitising.)*

## Relationships into the core model

| Link | Why it matters |
|---|---|
| Vendor ↔ Asset | which assets/facilities the vendor can reach |
| Vendor ↔ Risk | risks arising from the relationship and the access granted |
| Vendor ↔ Control | controls relied on to make the access acceptable |
| Vendor ↔ Issue/Action | audit findings and remediation |
| Vendor → OrgEntity | which OpCo owns the relationship |

This is what makes TPRM part of the single source of truth rather than a separate vendor spreadsheet: vendor risk lands in the same risk register and rolls up to the same dashboard.

## Roles

Designated relationship manager per OpCo · Respective Division/Department Head (contracts, monitoring, annual audit) · Regional Information Security Governance (assists with risk assessment) · Management (approves risk assessment before contract) · Management Representative (service audit).

## Wave placement

**Wave 2** alongside the compliance and assurance modules — the vendor service audit reuses the same assessment engine as RCSA and control testing, so building them together avoids duplicated effort.
