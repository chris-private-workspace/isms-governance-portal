# 15 — Design Alignment (from the ISMS Governance Platform handoff)

A high-fidelity design handoff (`design_handoff_isms_grc_platform`) now exists, produced in Claude Design. It is **more concrete than these planning docs in several areas** and reveals scope decisions that were not previously captured. This document records the alignment: what the design confirms, what it adds, and what conflicts and must be decided.

**The handoff is authoritative for UI**; these docs remain authoritative for data model, security, and sequencing. Where they disagree on domain logic, the source company procedures (`02a`, `11`, `12`) win — see §4.

---

## 1. ✅ RESOLVED — jurisdiction scope

**Confirmed: India is removed, China is added.** The scope is **14 OpCos**:

| Code | Company | Country |
|---|---|---|
| RAP | Ricoh Asia Pacific Pte Ltd (Regional HQ) | Singapore |
| RAPO | Ricoh Asia Pacific Operations Ltd (Supply chain) | Hong Kong |
| RHK | Ricoh Hong Kong Ltd | Hong Kong |
| RSG | Ricoh Singapore Pte Ltd | Singapore |
| RAU | Ricoh Australia Pty Ltd | Australia |
| RNZ | Ricoh New Zealand Ltd | New Zealand |
| RMY | Ricoh (Malaysia) Sdn Bhd | Malaysia |
| RTH | Ricoh (Thailand) Ltd | Thailand |
| RKR | Ricoh Korea Co Ltd | Korea |
| RTW | Ricoh Taiwan Ltd | Taiwan |
| RID | PT Ricoh Indonesia | Indonesia |
| RPH | Ricoh Philippines Inc | Philippines |
| RVN | Ricoh Vietnam Co Ltd | Vietnam |
| **RCN** | **China entity** *(code and legal name to confirm)* | **China** |

~~RIN — Ricoh India Ltd~~ — **removed from scope.** Remove India sample data and DPDP from the obligation plan.

### Consequences

- **PIPL data localisation is restored as a hard day-one requirement.** Per-region deployment capability (**ADR-0006**) is back to **blocking for M0** — the architecture must support storing and processing the China entity's data in-country without forking the codebase.
- **AI processing location becomes a sovereignty control**, not a feature (`14`, ADR-0009). An external inference API may be unusable for the China entity; the inference endpoint must be swappable per region.
- **12 jurisdictions** in scope for the obligation library: China (PIPL/DSL/CSL), Hong Kong (PDPO), Singapore (PDPA), Malaysia (PDPA), Thailand (PDPA), Indonesia (PDP Law), Philippines (Data Privacy Act), Vietnam (PDPD), Korea (PIPA), Taiwan (PDPA), Australia (Privacy Act), New Zealand (Privacy Act). **India/DPDP is out.**
- The frameworks-first strategy (`10` §2) matters more, not less, at 12 jurisdictions: one ISO 27001 + 27017 control set with obligations mapped onto it, rather than twelve parallel libraries.

### Two small follow-ups

- **Japan** is not an OpCo in this list. The most likely reason is that Japan is group HQ rather than an APAC subsidiary under this regional office — consistent with the design. Worth a one-line confirmation, but not blocking.
- **Language set.** The design ships EN + 日本語. With China in and India out, and OpCos in Korea, Taiwan, Hong Kong and SE Asia, confirm the intended set — plausibly **EN + 简体中文 + 繁體中文 + 한국어 + 日本語** (the last for group reporting). i18n must be in place from M0 regardless of which languages ship first.

## 2. Scope reframed: ISMS governance, not generic GRC

The design frames the product as an **APAC ISMS Governance Platform** — ISO/IEC 27001 + 27017 management across the OpCos — rather than a general-purpose GRC suite. This is **narrower and sharper**, and consistent with the technology-and-services positioning. Adopt this framing: the ISMS is the organising spine, and other GRC domains attach to it.

---

## 3. Three modules the plan did not have

### 3.1 Risk programme
The **Risk Management Report as a controlled, versioned artifact**, distinct from the live risk register. Two tabs:
- **Procedure** — the risk management procedure rendered as a numbered document.
- **Report** — the Excel workbook reproduced as sheets (Services, Assets, Threats, Risk assessment, Treatment), versioned as a whole (`rmVersions`).

*Design consequence:* the register is the working data; the programme is the **point-in-time controlled deliverable** produced from it. Model the report as a versioned snapshot over register data, not a second copy of it.

### 3.2 Audit issues (fuller than the "lightweight audit" decision)
Audit findings are a first-class module with `AF-YYYY-NNN` refs and richer structure than planned: source (**certification body** / internal audit), audit name, **Annex A clause**, grade (**Major / Minor**), finding text, **CAP** (corrective action plan), evidence, verification, link to related record.

Lifecycle: `Raised → CAP submitted → CAP in progress → Verification → Closed`. **Major nonconformities require verified effectiveness before certificate recommendation.** Passing the CAP date without evidence escalates to the Information Security Committee and flags the record red.

*This exceeds the Wave 2 "lightweight audit" decision (W2-2).* Recommend accepting it — it is driven by real certification-body practice, and the extra structure is the part that carries certification risk.

### 3.3 OS portfolio
A regional catalogue of Office Service offerings with security posture: category, stage (Live / Mature / Growth / Pilot), residual risk, data classification handled, contracts, primary control, last security review, delivering OpCos, and — importantly — **certification position**, warning when a service sits **outside certified ISMS scope** (an ISMS scope extension and service risk assessment are required before it can be sold as a certified offering).

*This is the regional counterpart to the per-OpCo "approved products & services" list in the ISMS profile, and it answers a real governance question: which services are we selling that our certificate does not actually cover?*

---

## 4. Where the design simplifies domain logic — the procedures win

The risk form in the design captures a **single impact value** (`imp`, `lik`, `inh`). The company's **RCI Risk Management Procedure** requires **five impact types** (FIN, BOP, LRY, REP, SIS) scored independently with the **maximum** taken, and scoring **before and after control**.

**Build to `02a`, not to the design's simplification**: the risk form must capture all five impact dimensions and both score sets. The design's visual treatment (live score computation, score chips, 5×5 heat matrix) still applies — it just needs five inputs feeding the max rather than one.

*(The design's sample data is also arithmetically inconsistent in places — e.g. `imp:4, lik:4, inh:20`. Treat sample data as illustrative only.)*

---

## 5. Confirmed and made concrete by the design

### 5.1 Six roles (replaces the abstract "three lines" role sketch)
**Platform admin · Regional ISO · OpCo admin · Control owner · OpCo OS · Auditor**, with verbs Full / Approve / Edit / Create / Read / None across eleven modules (`permMatrix`).

Enforce in **three places**: navigation (a module at None is not rendered), route (forbidden route redirects), action (missing-verb buttons not rendered; read-only roles get an explanatory banner, not a disabled form). **Entity scope sits on top of role** and must be enforced server-side on every query — **including the agent's retrieval**.

Note `OpCo OS` — a business-line-specific role, and `Auditor` holding Full only on audit issues. This is real segregation of duties, not a generic template.

### 5.2 Access management (new to the foundation)
Beyond RBAC, the design specifies: **access requests** (requester, requested access, business reason, approver, status), **access review campaigns** with progress tracking, and authentication/session policy — **SAML SSO, MFA, session timeout, IP restriction, just-in-time auditor access, break-glass accounts**.

*JIT auditor access and break-glass are exactly the controls the platform should exemplify (Entity Zero). Add them to `05`.*

### 5.3 Records retention — actual periods, plus legal hold
| Record class | Retention | Basis |
|---|---|---|
| Security incident records | 3 years after closure | ISO 27001 A.5.28 · group records policy |
| Risk Management Report & SoA | 3 years per version | RM procedure |
| ISMS profile versions | 3 years per version | Controlled document register |
| **Audit issues & evidence** | **6 years** | Certification body requirement |
| External party assessments | Contract term + 2 years | A.5.19–A.5.22 |
| **Platform audit log** | **7 years, immutable** | Append-only, **SHA-256 chained** |

**Legal hold** is a first-class concept (records can be held from disposal) — this was missing from `05` and must be added: a hold suspends retention disposal and is itself auditable.

### 5.4 Integrations named
Jira, ServiceNow, Splunk, Okta, AWS Config, Microsoft 365, Slack — with connected state and last-sync. Useful targets for the Wave 3 connector framework; Okta/M365 also inform the identity ADR (ADR-0007).

### 5.5 ISMS profile — the agreed field list
The design states this list is agreed and should be kept exactly:
- **Standards**: ISO 27001, ISO 27017 (toggles)
- Company name · Country · Number of certificates
- **Sites** — repeatable: site name, address, employees in scope
- Scope statement
- **ISMS leader** — name, department, email, address, phone

Plus, per OpCo: certification state (Certified / In scope / Not in scope), **certificate number, certification body, issue date, expiry date, surveillance date**, ISO name, review date, posture.

**Versioning:** save-as-new-version increments the version, marks the previous **superseded**, stamps actor **and their role**, writes a history entry; prior versions stay readable; blank site rows discarded.

*Update `13` accordingly. Note the design drops the certifier-comment / company-reply fields present in the source spreadsheet — confirm whether those are still needed.*

---

## 6. UI: the handoff supersedes the design brief

`09-ui-design-brief.md` was written to commission the design. The handoff now supersedes it as the UI specification: it fixes design tokens (light + dark), typography (**IBM Plex Sans**, with **IBM Plex Mono for every identifier, date, percentage, count and filename**), spacing, radius, density, iconography, the app shell, and all 30 screens.

Navigation groups: **Oversight** (Dashboard, Risks, Risk programme, Controls, Policies, Issues, Assessments, Audit issues) · **Operations** (ISMS AI Agent, Security incidents, Suppliers) · **Compliance** (APAC ISMS profiles, OS portfolio) · **System** (Admin).

Accessibility conventions to preserve: **status is never colour alone** (always a word or number beside the dot); real `<table>` semantics; row click target duplicated as a focusable link.

**Localisation conflict:** the design ships **EN + 日本語**. The charter specifies zh-Hant, ja, ko, en + SEA languages. If Japan is out of scope (§1), the language set needs revisiting. Decide alongside §1.

---

## 7. Actions arising

| # | Action | Priority |
|---|---|---|
| 1 | ~~Resolve the jurisdiction conflict~~ → ✅ **Resolved: India out, China in.** ADR-0006 (per-region deployment for PIPL) is now blocking for M0 | **Done — ADR-0006 blocking** |
| 2 | Confirm the language set (and Japan's status) | Medium |
| 3 | Accept the fuller audit-issues module (revises W2-2) | High |
| 4 | Add access management + legal hold to the foundation (`05`) | High |
| 5 | Add Risk programme and OS portfolio to the module plan | Medium |
| 6 | Build the risk form to five impact dimensions per `02a`, not the design's single value | Medium |
| 7 | Confirm whether certifier-comment / company-reply fields remain in the ISMS profile | Low |
| 8 | **`data.js` cannot be ported as-is** — the flagship dashboard is keyed by country, which structurally cannot hold 14 OpCos across 12 jurisdictions (§8) | **Blocking for M8** |
| 9 | Rebuild the OpCo fixture: `opcos.js` has India and lacks China — inverted from §1 (§8) | **High** |
| 10 | Decide how the RM Report register sheet relates to the live register — two incompatible risk shapes exist (§8) | High |

---

## 8. Sample-data audit — findings that revise this document

Full audit: [`../09-analysis/mockup-data-vs-spec-audit-20260807.md`](../09-analysis/mockup-data-vs-spec-audit-20260807.md)
(all 24 files in `data/`, snapshot dated 2026-08-07). Only the findings that **change what §1–§7
above say** are recorded here; the rest stay in the analysis.

### 8.1 The sample data predates §1 — and contradicts itself

`opcos.js` lists 14 OpCos including **`RIN` Ricoh India Ltd** with **no China entity** — exactly
inverted from §1's resolution. But `data.js` has China and no India. **Two files in the same
handoff disagree about the scope.** `Japan` is also used as an operating entity in five files,
which §1 rules out.

### 8.2 Two incompatible entity-keying conventions ⚠️

| Convention | Files | Holds §1's scope? |
|---|---|---|
| Country name (`entity:'Singapore'`) | `data.js`, `risks.js`, `controls.js`, `issues.js`, `notifications.js` | ❌ RAP and RSG are both Singapore; RAPO and RHK both Hong Kong |
| OpCo code (`opco:'RSG'`) | `opcos.js`, `incidents.js`, `auditIssues.js`, `suppliers.js`, `accessRequests.js`, `osServices.js` | ✅ |

The roll-up dashboard aggregate is in the first group. **This is a 約束 6 STOP-and-ask** — the
matrix's visual treatment stands, its entity keying does not. §6 above says the handoff supersedes
`09` as the UI specification; that remains true for layout and tokens, and does **not** extend to
the entity model underneath.

### 8.3 §4 was right, and there is a third representation

§4 flagged the single `imp` value. The audit confirms it and adds: `riskRegister.js` uses a
completely different shape (`item, tv, existing, add, who, target, score` — no likelihood or
impact at all), and `osServices.js` expresses residual risk as a RAG band. Three representations,
one procedure.

Notably **`answers.js` states the RCI model correctly**, including the five impact types and the
≥16 threshold. The agent's canned answers are more accurate than the UI's sample data — which
reinforces §4's ruling rather than weakening it.

### 8.4 §3.2 understated the audit-issues module

The real sample data carries values §3.2 did not record: grade **Observation**; source **Customer
audit**; statuses **Overdue** and **Accepted**; and `clause` holding **ISO 27001 main-body
clauses** (`6.1.3`, `7.2, 7.3`, `7.5.2`), multi-valued. A field typed to Annex A only would reject
real findings.

### 8.5 Financial-services residue in the Wave 1 core files

`data.js` carries prudential regulators (MAS / FSA / APRA / HKMA / BNM / PBoC) in its `juris`
field, and AML / CTF / sanctions / reconciliation content runs through `risks.js`, `controls.js`,
`issues.js` and `policies.js`. `00` D3 puts this project in **technology & services** and
explicitly prioritises ISO 27001 alignment *over* BFSI-style prudential regimes.

The ISMS-derived files (`opcos.js`, `incidents.js`, `auditIssues.js`, `suppliers.js`,
`osServices.js`, `catalogue.js`, `rmVersions.js`, `retention.js`, `answers.js`) are clean and are
the better source wherever two files disagree. **The BFSI residue is concentrated in exactly the
Wave 1 proof modules** — strip it at port time.

### 8.6 §5.2's access management is confirmed and extended

`sessionPolicy.js` names **Okta** (SAML 2.0, local passwords disabled), hardware key for Platform
admin, 30 min idle / 12 h absolute, JIT auditor expiry, two break-glass accounts raising a P1 to
the Group CISO. Okta is a direct input to **ADR-0007**. `accessRequests.js` also shows requests
must support an **external party with no OpCo** and a **time-boxed grant**.
