# 00 — Project Charter

## Vision

Build an internal GRC platform that gives a regional IT office a single, trustworthy view of governance, risk, and compliance across the group's APAC subsidiaries — replacing scattered spreadsheets and email with one relationship-driven source of truth, and doing so on a foundation secure and auditable enough that the platform itself sets the example for the controls it enforces.

## Confirmed decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Internal build (not buy/OEM) | Confirmed by stakeholder. Commercial platforms are reference/benchmark only. |
| D2 | Multi-entity, multi-jurisdiction, single group (not multi-tenant SaaS) | Regional IT office serves group subsidiaries; entities share one taxonomy with entity-scoped access and roll-up. |
| D3 | Industry: technology & services | Prioritises IT/cyber risk, privacy, third-party risk, ISO 27001 / SOC 2 alignment over BFSI-style prudential regimes. |
| D4 | Foundation-first sequencing | Build the backbone before functional modules. |
| D5 | Security-and-risk credibility tenet | The platform must not itself be a source of risk; it is subject to its own governance. |
| D6 | **Jurisdictions: 14 OpCos across 12 jurisdictions** — China, Hong Kong (×2), Singapore (×2), Korea, Taiwan, Malaysia, Thailand, Indonesia, Philippines, Vietnam, Australia, New Zealand. **India excluded** (confirmed). Japan is group HQ, not an APAC OpCo. | **China in scope → PIPL data localisation is a hard requirement** (per-region deployment from day one; ADR-0006 blocking for M0). Data protection is the common regulatory thread across all in-scope jurisdictions. Full OpCo list in `15-design-alignment.md`. |
| D7 | Primary driver: internal governance & visibility | Leadership / regional office needs to see posture across subsidiaries. Not a compliance deadline — confirms foundation-first, keeps Wave 1 lean, and makes the roll-up dashboard the flagship. |
| D8 | Target users: full Three Lines + management | First-line business/ops, second-line risk & compliance, infosec/IT, and management consumers. Internal audit (third line) deferred to Wave 2. Implies lightweight first-line UX. |
| D9 | Confirmed pain points | Data silos + Excel/email manual; inconsistency across subsidiaries; no posture visibility / reactive; multi-jurisdiction fragmentation. |
| D10 | **Build path affirmed with eyes open** | A build-vs-buy baseline study recommended *against* a full self-build (favouring a hybrid OEM/partner model). Stakeholder reviewed that recommendation and **consciously affirmed the internal build**. The risks that study flagged are therefore treated as explicit design constraints, not open questions. |

| D11 | **Methodology anchored to the company's existing templates** | Four source documents (RCI Risk Management Procedure + Risk Management Report; Security Incident Template V2; APAC ISMS Profile) and the four-document supplier management set define how this organisation actually works. The platform digitises **these**, rather than a generic GRC model — lowering adoption friction and preserving ISO 27001 certification continuity. |
| D12 | **Five capability additions confirmed** | AI agent (`14`, Wave 3); security incident (`11`, Wave 2); risk management per RCI procedure (Wave 1, methodology corrected); supplier management (`12`, Wave 2); APAC ISMS profile (`13`, Wave 1). |

## Consequences of anchoring to the real templates

| Discovery | Consequence |
|---|---|
| Risk = Likelihood × **MAX of five impact types**, score 1–25, **≥16 requires treatment**, residual ≥16 → IT Risk Register | Corrected the risk scoring model in `02a` before any table was built |
| Risk assessment is **asset-based** (asset group → asset → threat → vulnerability → CIA) | **Asset Inventory promoted to Wave 1**; Threat and Vulnerability added as reusable libraries |
| **Statement of Applicability** is a mandatory ISO 27001 output | Added to the data model (`02a`) |
| Master frameworks are **ISO 27001:2022 Annex A + ISO/IEC 27017**, not SOC 2 | Wave 2 content strategy corrected (`10`) |
| RCSA, control testing and vendor service audits share one pattern | **Shared assessment/questionnaire engine** built once (`05`) |
| Procedures specify retention (3 years / 1 year / latest version) | **Records retention** is a platform capability (`05`) |
| Every procedure carries the same control block; classification is Internal / Restricted / Confidential | Controlled-document metadata and a **data classification scheme** are platform-level (`05`) |
| Incidents trigger risk re-assessment | Incident module moved up to Wave 2 to close the loop |

## Self-build risk guardrails (from the build-vs-buy study)

| Risk flagged | Our guardrail | Where |
|---|---|---|
| Core data model / taxonomy is the hardest part and where builds fail | Treated as the heart; foundation-first; canonical core + governed extensions | `02`, `02a` |
| Workflow / rules engine (SLA, escalation, SoD) is hard | Lean configurable state machine in Wave 1; no heavyweight BPM | `05`, ADR-0002 |
| **Perpetual obligation-content maintenance** (the largest ongoing burden) | Frameworks-first + scope discipline + AI-assisted change parsing + a ready ingestion path for bought content | `10` §2 |
| Framework updates, certifications, audit-trail integrity | Secure-by-design + "Entity Zero" self-governance | `04` |
| Value deferred by years | Lean Wave 1 with the roll-up dashboard as an early, visible payoff | `07`, `08` |

> Note: the taxonomy and target-operating-model work is explicitly tool-agnostic — it retains its value even if the group ever revisits the build decision.

## Kickoff prerequisites — all confirmed

The prerequisites that gate Wave 1 scope are resolved (see D1–D9). No open item currently blocks the backbone or the confirmed Wave 1 module set. Remaining detail (exact per-jurisdiction obligation content, specific legacy tooling to migrate) is captured progressively during implementation and Wave 2 design.

## How the pain points map to Wave 1

| Pain point (D9) | Wave 1 response |
|---|---|
| Data silos + Excel/email manual | The single-source-of-truth backbone replaces scattered forms |
| Inconsistent practices / no standardisation | Policy Management (standardised roll-out + attestation) + group-shared/inherited control library |
| No posture visibility / reactive | Cross-entity roll-up dashboard + Risk/Control registers (the posture source) |
| Multi-jurisdiction fragmentation | Foundation made ready (jurisdiction-tagged taxonomy + regulation-to-control matrix); fully operationalised in the Wave 2 compliance module |

## Guiding principles

- **Single source of truth over module count.** The value is in the linked data model, not in how many modules exist.
- **Canonical core, governed local extensions.** One shared definition per entity; local variation is a controlled extension, never a fork.
- **Secure, auditable, resilient by default.** See `04-security-by-design.md`. Non-negotiable.
- **Design the taxonomy for the future, build the modules for now.** Reserve dimensions for IT assets, vendors, and data flows from day one.
- **Lightweight first line.** First-line business users won't tolerate a heavy tool; keep their input (e.g. RCSA) simple to avoid compliance fatigue and produce real posture data.

## Non-goals (for this phase)

- Not external multi-tenant SaaS. (Revisit if the group later decides to serve non-group clients.)
- Not all fourteen functional modules at once. Waves 2 and 3 (compliance/assurance; IT-cyber/TPRM/privacy/incident/BCM/audit) come after the backbone is proven.
- Not a from-scratch heavyweight BPM engine in Wave 1 — keep workflow lean and configurable.

## Success criteria for the foundation

- The core data model expresses risk ↔ control ↔ obligation ↔ policy ↔ process ↔ asset ↔ entity ↔ event ↔ issue as first-class, linked entities with stable IDs.
- Any record can be scoped to an organisational entity and rolled up to the region; the roll-up dashboard shows posture across subsidiaries with drill-down.
- An obligation can be tagged to a jurisdiction, and one control can satisfy obligations across multiple jurisdictions.
- China / PIPL residency can be honoured via per-region deployment without code forks; the platform is localisable (zh-Hant, ja, ko, en + SEA).
- Every state change is captured in a tamper-evident audit trail.
- The platform can be registered and assessed inside its own system ("Entity Zero").
- A security review of the foundation finds no control the platform enforces that the platform itself violates.
