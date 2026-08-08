# 10 — Wave 2: Compliance & Obligations (+ content strategy)

Wave 2 closes the loop: Wave 1 built **Define + Manage + visibility**; Wave 2 adds **Assure** (compliance, control testing, light audit) and **Respond** (issues/CAPA), so the system becomes a running cycle rather than a static register.

## Confirmed Wave 2 scope decisions

| # | Decision | Rationale |
|---|---|---|
| W2-1 | **Content strategy = A + B as the foundation, C to reduce monitoring load, D deferred** | See §2. Directly mitigates the biggest self-build risk. |
| W2-2 | **Audit module: lightweight in Wave 2**, expand later | Audit is not a first-wave user group; findings → issues is enough for now |
| W2-3 | **Control testing: manual tests + evidence in Wave 2**; keep CCM interface hooks in the model, real CCM in Wave 3 | CCM needs SIEM/cloud integrations that arrive in Wave 3 |
| W2-4 | **Content subscription (D) deferred to a later phase** | Build the ingestion interface now, leave it unpopulated — same pattern as the CCM hooks |

## 1. Modules in this wave

| Module | Functional content | Builds on Wave 1 |
|---|---|---|
| **Compliance & obligations** | Regulation/framework library, jurisdiction-tagged obligation library, obligation→control matrix, regulatory change management (RCM), compliance monitoring | Sits on the Wave 1 control library; completes "Define" |
| **Control testing** | Test definition & scheduling by control frequency, execution, evidence capture, result → control effectiveness, failure → issue | Tests every Wave 1 control; writes back effectiveness |
| **Audit (lightweight)** | Findings capture → issues → follow-up. Third-line independence enforced via RBAC/SoD | Uses Wave 1 entities/controls as the audit scope |
| **Issues & CAPA** | Intake (from test / audit / incident / RCSA), triage, action plans, verification, closure | Issue/Action entities already defined in Wave 1 |
| **Security incident** (`11`) | Incident form per the company template, S1/S2/S3 severity SLAs, RCA, corrective/preventive actions, CISO review & approval | Moved up from Wave 3 — the template and workflow rules already exist, and incidents trigger risk re-assessment |
| **Supplier management / TPRM** (`12`) | Approved vendor register, access-driven external-party risk assessment, annual service audit, contract/NDA and termination checklists | Makes the reserved `Vendor` entity concrete; the service audit reuses the shared assessment engine |

**The loop:** testing and audit **verify** whether controls actually work → failures raise **issues** → issues spawn **corrective actions** → completion **feeds back** to update risk and control state. Once this turns, the dashboard shows a trajectory of improvement, not just a snapshot — which answers the internal-visibility stakeholders' real question: *"are we getting better?"*

## 2. Obligation content strategy ★

The single biggest risk of the self-build path is **perpetual obligation-content maintenance** — commercial platforms win on pre-built regulatory content libraries. This strategy structurally shrinks that burden.

### A. Frameworks-first (the leverage)

Anchor on **one master control set** — **ISO 27001:2022 Annex A + ISO/IEC 27017** (cloud controls) — and map every in-scope jurisdiction's data-protection obligations onto that same control set. Do **not** build six parallel regulatory libraries.

> **Corrected from the company's actual practice.** An earlier draft assumed ISO 27001 + SOC 2 TSC. The Risk Management Report shows controls are selected from **ISO 27001:2022 Annex A and ISO/IEC 27017** — so those are the master frameworks. SOC 2 can be added later if a customer requires it. The **Statement of Applicability (SoA)** is the mandatory output of control selection and is modelled in `02a`.

| One master control (maintained once) | Simultaneously satisfies |
|---|---|
| Periodic access review | Access-control obligations under SG PDPA, HK PDPO, KR PIPA, AU Privacy Act, … |
| Encryption & transmission protection | Security-measure obligations across jurisdictions |
| Incident notification procedure | Breach-notification obligations across jurisdictions |

Long-term you maintain **one framework + one mapping table**. When a law changes, you revise the affected obligations and their mappings — not a whole parallel library. The Wave 1 many-to-many `Control ↔ Obligation` relationship exists precisely for this.

### B. Scope discipline

The obligation library covers **only** the jurisdictions actually managed (NE Asia, SE Asia, Oceania per the charter) plus the frameworks actually being certified against (ISO 27001, SOC 2). No global catalogue. This keeps the surface area an order of magnitude smaller.

### C. AI-assisted regulatory change parsing

Monitor sources → detect change → **AI parses and proposes** affected obligations and controls (as a draft) → **human review** → update obligations/mappings → gap → issue/CAPA.

**Human-in-the-loop is mandatory.** AI proposes; people decide. For a trust product, compliance judgement cannot be fully delegated to a model — but using it to cut the monitoring load (the "hundreds of regulatory alerts" problem) is a high-value AI application in a self-build.

### D. Content subscription — deferred

Subscribing to a regulatory-content provider for obligation text ("build the platform, buy the content") remains the smart hedge, but is **deferred to a later phase**. Build the **ingestion interface** now and leave it unpopulated, exactly like the CCM hooks — so adopting D later is a plug-in, not a rework.

> **Why this holds up:** one framework + one mapping table (A) × only the jurisdictions we actually manage (B) × AI watching for changes (C) × a ready import path for bought content (D-ready). Together these shrink the "endless content maintenance" trap the build-vs-buy research warned about.

## 3. Data model additions

Extends the `Regulation` / `Obligation` entities already reserved in Wave 1 (`02`/`02a`).

| Entity / table | Purpose | Status |
|---|---|---|
| `Framework` | Master control framework (ISO 27001 Annex A, SOC 2 TSC): id, name, version, clauses | New |
| `FrameworkControlMapping` | Master control ↔ framework clause | New |
| `ObligationControlMapping` | **The workhorse**: obligation ↔ control, with mapping rationale and coverage strength | Relationship defined in Wave 1; made concrete here |
| `ComplianceStatus` | Per obligation, per entity — **derived**, never hand-entered | New |
| `RegulatoryChange` | Change record + source + impact analysis + review state | New |
| `ContentIngestion` (interface only) | Import path for subscribed content (D) — defined, unpopulated | New, deferred |

### Derived compliance status

`ComplianceStatus` is **computed**, not typed in: from the **effectiveness** of the mapped controls (from Wave 2 manual testing) plus **coverage**. An obligation with no effective mapped control = a **gap** → automatically becomes an Issue → CAPA.

This makes compliance posture live and dashboard-ready (a compliance view per jurisdiction and per entity), moving with test results rather than sitting stale in a spreadsheet.

## 4. Regulatory change management (RCM) flow

```
source monitoring → change detected → AI parses & drafts impact
   → human review & confirm → update obligations + mappings
   → gap analysis → issue / CAPA → re-test → compliance status updates
```

Every step writes to the audit trail; the human review step is a required state transition (it cannot be auto-approved).

## 5. Still to design in this wave

- Control testing module detail (test definition, scheduling logic by frequency, evidence handling, SoD on tester vs. reviewer).
- Lightweight audit module detail (findings → issues → follow-up).
- Issues/CAPA workflow detail (intake routing by source, triage, verification).
- Compliance views on the dashboard (per-jurisdiction, per-entity compliance posture).
