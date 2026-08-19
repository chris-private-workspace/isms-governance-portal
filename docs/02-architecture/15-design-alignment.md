# 15 — Design Alignment (from the ISMS Governance Platform handoff)

A high-fidelity design handoff (`design_handoff_isms_grc_platform`) now exists, produced in Claude Design. It is **more concrete than these planning docs in several areas** and reveals scope decisions that were not previously captured. This document records the alignment: what the design confirms, what it adds, and what conflicts and must be decided.

**The handoff is authoritative for UI**; these docs remain authoritative for data model, security, and sequencing. Where they disagree on domain logic, the source company procedures (`02a`, `11`, `12`) win — see §4.

---

## 1. ✅ RESOLVED — jurisdiction scope

**Confirmed: India and China are both out of scope.** The scope is **13 OpCos**.

> **History**: India was removed first; China was added, then removed on **2026-08-08** (`CH-008`)
> as a product-scope decision. Both removals are recorded here rather than erased, because the
> jurisdiction count drives the obligation library, the flagship dashboard, and the deployment
> topology — a reader who sees only the final number cannot tell which of those were re-derived.

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

~~RIN — Ricoh India Ltd~~ — **removed from scope.** Remove India sample data and DPDP from the obligation plan.
~~RCN — China entity~~ — **removed from scope 2026-08-08** (`CH-008`). Its code and legal name were never confirmed, which is a small piece of corroborating evidence that it was the least-established of the fourteen.

### Consequences

- **No localisation requirement remains in scope** → single-region deployment (**ADR-0010**, superseding ADR-0006). M0 is unblocked on topology.
- ~~AI processing location becomes a sovereignty control~~ — ⚠️ premise withdrawn with China. The model-agnostic inference interface survives on commercial grounds, not regulatory ones (`14`, `AD-Constraint7-1`).
- **11 jurisdictions** in scope for the obligation library: Hong Kong (PDPO), Singapore (PDPA), Malaysia (PDPA), Thailand (PDPA), Indonesia (PDP Law), Philippines (Data Privacy Act), Vietnam (PDPD), Korea (PIPA), Taiwan (PDPA), Australia (Privacy Act), New Zealand (Privacy Act). **India/DPDP and China/PIPL are both out.**
- The frameworks-first strategy (`10` §2) matters more, not less, at 11 jurisdictions: one ISO 27001 + 27017 control set with obligations mapped onto it, rather than eleven parallel libraries.

### Two small follow-ups

- **Japan** is not an OpCo in this list. The most likely reason is that Japan is group HQ rather than an APAC subsidiary under this regional office — consistent with the design. Worth a one-line confirmation, but not blocking.
- **Language set.** The design ships EN + 日本語. With both India and China out, and OpCos in Korea, Taiwan, Hong Kong and SE Asia, confirm the intended set — plausibly **EN + 繁體中文 + 한국어 + 日本語** (the last for group reporting). 简体中文 dropped with China. i18n must be in place from M0 regardless of which languages ship first.

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

> ⚠️ **The gap is larger than this section originally stated** (found 2026-08-07, CH-004 — full
> detail in [`../09-analysis/screen-fragment-audit-20260807.md`](../09-analysis/screen-fragment-audit-20260807.md) §1).
> Screen 05 has **seven fields total** and **no before/after-control structure at all** — a single
> readout labelled "Residual". It is also missing the entire **asset → threat → vulnerability →
> CIA** chain, which confirmed parameter #8 places in Wave 1, and `Owner` is a free-text input
> rather than a user reference (so no FK, no SoD enforcement, no notification routing).
>
> This is not "add four inputs to an existing form" — the screen implements a **different risk
> methodology**. The ruling above stands; the scope of the rebuild does not.

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
Jira, ServiceNow, Splunk, Okta, AWS Config, Microsoft 365, Slack — with connected state and last-sync. Useful targets for the Wave 3 connector framework. ⚠️ **Okta is no longer the IdP** — see §8.6 and [ADR-0015](../14-adr/0015-identity-provider-and-local-break-glass.md) (which supersedes ADR-0007); it may still appear here as an *integration target* if any OpCo runs it, but it is not this platform's authentication path.

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

Navigation groups — **corrected 2026-08-07 (CH-004) against `02-app-shell.html`. There are five
groups, not four, and the AI agent has its own.**

| Group | Items |
|---|---|
| **Intelligence** | ISMS AI Agent — badged `AI`, **first item in the sidebar** |
| **Oversight** | Dashboard · Risks · Risk programme · Controls · Policies · Issues · Assessments · Audit issues |
| **Operations** | Incidents · Suppliers |
| **Compliance** | ISMS profiles · OS portfolio |
| **System** | Admin |

> ⚠️ **The Wave 3 AI agent is the top nav item, above the flagship dashboard.** Waves 1–2 ship
> with either a prominent dead entry or a visibly empty first group. That is a product-positioning
> decision sitting inside a nav structure, and it has not been made anywhere — see `AD-Nav-1`.

Labels in the shell differ from the earlier prose here: **"Incidents"** (not "Security
incidents"), **"ISMS profiles"** (not "APAC ISMS profiles").

Accessibility conventions to preserve: **status is never colour alone** (always a word or number beside the dot); real `<table>` semantics; row click target duplicated as a focusable link.

**Localisation conflict:** the design ships **EN + 日本語**. The charter specifies zh-Hant, ja, ko, en + SEA languages. If Japan is out of scope (§1), the language set needs revisiting. Decide alongside §1.

---

## 7. Actions arising

| # | Action | Priority |
|---|---|---|
| 1 | ~~Resolve the jurisdiction conflict~~ → ✅ **Resolved: India out; China added then removed 2026-08-08 (`CH-008`).** 13 OpCos / 11 jurisdictions. Topology settled by ADR-0010 | **Done** |
| 2 | Confirm the language set (and Japan's status) | Medium |
| 3 | ~~Accept the fuller audit-issues module (revises W2-2)~~ → ✅ **Accepted 2026-08-07 (CH-003).** Specified in [`17-audit-issues-module.md`](17-audit-issues-module.md) | **Done** |
| 4 | ~~Add access management + legal hold to the foundation (`05`)~~ → ✅ **Already done** — `05` §Access management and §Records retention carry both. This row was stale. Entities now specified in `02a` §3.2 (CH-003) | **Done** |
| 5 | Add Risk programme and OS portfolio to the module plan | Medium |
| 6 | Build the risk form to five impact dimensions per `02a`, not the design's single value | Medium |
| 7 | Confirm whether certifier-comment / company-reply fields remain in the ISMS profile | Low |
| 8 | **`data.js` cannot be ported as-is** — the flagship dashboard is keyed by country, which structurally cannot hold 13 OpCos across 11 jurisdictions (Singapore ×2, Hong Kong ×2) (§8) | **Blocking for M8** |
| 9 | Rebuild the OpCo fixture to the 13-OpCo list: `opcos.js` has `RIN` India, which is out (§8). ⚠️ With China also out, the fixture needs **13 rows, neither RIN nor RCN** | **High** |
| 10 | ~~Decide how the RM Report register sheet relates to the live register~~ → ✅ **Decided 2026-08-07 (CH-003): versioned snapshot over the live register, not a second store.** Entities in `02a` §3.1 | **Done** |

---

## 8. Sample-data audit — findings that revise this document

Full audit: [`../09-analysis/mockup-data-vs-spec-audit-20260807.md`](../09-analysis/mockup-data-vs-spec-audit-20260807.md)
(all 24 files in `data/`, snapshot dated 2026-08-07). Only the findings that **change what §1–§7
above say** are recorded here; the rest stay in the analysis.

### 8.1 The sample data predates §1 — and contradicts itself

`opcos.js` lists 14 OpCos including **`RIN` Ricoh India Ltd** with **no China entity**; `data.js`
has China and no India. **Two files in the same handoff disagree about the scope.** `Japan` is also
used as an operating entity in five files, which §1 rules out.

> **Simplified by `CH-008`**: with China now also out, the target is a single **13-OpCo** list
> containing neither `RIN` nor `RCN`. The original audit finding (2026-08-07) recommended
> substituting `RIN` → `RCN`; **that recommendation is superseded** — delete the row instead.

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

> ### ✅ RESOLVED 2026-08-07 (CH-005) — 已核可的偏離：Okta → Entra ID, SAML → OIDC
> ### ⭐ AMENDED 2026-08-19 (W23) — break-glass 的**實作位置**改為平台本地
>
> [`ADR-0015`](../14-adr/0015-identity-provider-and-local-break-glass.md) supersedes
> [`ADR-0007`](../14-adr/0007-identity-provider.md), which supersedes the deliverable's vendor and
> protocol. This is a **recorded deviation under 約束 6**, not an approximation — logged here
> because `CLAUDE.md` 約束 6 makes this file the single source for fidelity exceptions.
>
> | | Deliverable | Decided | 偏離? |
> |---|---|---|---|
> | Vendor | Okta | **Microsoft Entra ID** | ✅ organisational asset — all three sibling projects run it |
> | Protocol | SAML 2.0 | **OIDC** | ✅ `04:49` + `06:21` specify OIDC; design docs outrank deliverables |
> | hardware key (Platform admin) · 30 min idle / 12 h absolute · IP restriction · JIT auditor expiry | required | **all retained** | ❌ none |
> | **2 break-glass → P1 to Group CISO** | required | **retained — but implemented *platform-local*, not in the IdP** (ADR-0015) | ❌ none *against the deliverable* — ⭐ the requirement is unchanged; what changed is where it lives, because an IdP-hosted emergency account still needs the IdP to be reachable |
>
> **Only the vendor and protocol change; every policy requirement survives.** That distinction is
> what makes this a substitution rather than a scope reduction — the latter is what 約束 6 exists
> to prevent. Note also that Entra provides authentication strength and conditional access but
> **not SoD** — `05:9`'s "an auditor cannot edit the controls they assure" stays application-layer.
>
> ⭐ **The deliverable itself distinguishes the two**, which is why the amendment is not a scope
> change: `sessionPolicy.js` specifies *"local passwords disabled"* **and** *"two break-glass
> accounts"* in the same policy (§8.6 above). Break-glass is not a local password login here either
> — ADR-0015 forbids self-service credential management outright.
