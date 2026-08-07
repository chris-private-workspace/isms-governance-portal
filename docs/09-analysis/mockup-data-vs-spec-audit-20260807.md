# Design-handoff sample data vs. specs — reconciliation audit

**Date**: 2026-08-07 — **this is a point-in-time snapshot.** It reflects the handoff as committed
in `afb0429` and the specs as of the same commit.
**Scope**: all 24 files in `docs/06-reference/design_handoff_isms_grc_platform/data/`
**Compared against**: `02a-data-model-spec.md`, `03-multi-entity-and-jurisdiction.md`,
`08-rollup-dashboard-spec.md`, `13-isms-profile-module.md`, `15-design-alignment.md`
**Closes**: `AD-Mockup-1`

> **Why this audit exists.** `data/README.md` states: *"Field names here are the ones used
> throughout the fragments, so keeping them makes the fragments read directly against your data."*
> That makes these files the **de-facto API contract for all 30 screens** — not decoration.
> `15` §4 correctly says the sample *values* are illustrative only; this audit is about the
> *shapes* and the *entity model*, which are not.

---

## 0. Headline

**The handoff uses two incompatible entity-keying conventions, and the flagship dashboard uses
the one that cannot represent the confirmed scope.**

| Convention | Files | Can it hold 14 OpCos / 12 jurisdictions? |
|---|---|---|
| Keyed by **country name** (`entity:'Singapore'`) | `data.js`, `risks.js`, `controls.js`, `issues.js`, `notifications.js` | ❌ **No** — RAP and RSG are both Singapore; RAPO and RHK are both Hong Kong |
| Keyed by **OpCo code** (`opco:'RSG'`) | `opcos.js`, `incidents.js`, `auditIssues.js`, `suppliers.js`, `accessRequests.js`, `osServices.js` | ✅ Yes |

`data.js` — the roll-up dashboard aggregate, the Wave 1 flagship — is in the first group. Porting
it verbatim inherits an entity model that structurally cannot express the confirmed scope.

**This is a 約束 6 STOP-and-ask, not an approximation to make quietly.** The design's *visual*
treatment of the comparison matrix stands; its *entity keying* does not.

---

## 1. Scope contradictions

`15` §1 confirmed: **India out, China in.** The sample data predates that resolution and is
internally inconsistent about it.

| File | Finding | Severity |
|---|---|---|
| `opcos.js` | 14 rows, but includes **`RIN` Ricoh India Ltd** and has **no `RCN` China entity**. Exactly inverted from `15` §1 | 🔴 |
| `data.js` | Includes **China**, excludes India — **contradicts `opcos.js` in the same handoff** | 🔴 |
| `osServices.js` | `RIN` appears in the `opcos[]` array of OS-201, OS-252, OS-260 | 🟡 |
| `data.js`, `risks.js`, `controls.js`, `issues.js`, `notifications.js` | **`Japan` used as an operating entity.** `15` §1: Japan is group HQ, **not an APAC OpCo** | 🔴 |
| `answers.js` | Correctly references `RVN` and its out-of-scope status — no contradiction | ✅ |

**Consequence:** the 14-row OpCo list must be rebuilt before any screen is ported. `opcos.js` is
otherwise the best-shaped file in the set — replace `RIN` with `RCN` rather than re-deriving it.

---

## 2. Domain framing — financial-services residue

`data.js` carries `local:'MAS regulated'` and `juris:'Singapore (MAS)'`, with FSA / APRA / HKMA /
BNM / PBoC across the other rows. These are **prudential banking regulators**.

`00` D3 confirms the industry as **technology & services**, and states it *"prioritises IT/cyber
risk, privacy, third-party risk, ISO 27001 / SOC 2 alignment **over BFSI-style prudential
regimes**"*.

Corroborating traces of the same origin:

| File | BFSI content |
|---|---|
| `risks.js` | "AML transaction monitoring gaps", "Sanctions screening false-negatives", `category:'Financial'` |
| `controls.js` | "AML alert investigation SLA", "Sanctions list auto-update", "Monthly reconciliation sign-off" |
| `issues.js` | AML ageing, sanctions false-negative, reconciliation variance |
| `policies.js` | "AML / CTF Policy" (POL-410) |

**Two generations of data are present in one handoff.** The ISMS-correct files (`opcos.js`,
`incidents.js`, `auditIssues.js`, `suppliers.js`, `osServices.js`, `catalogue.js`, `rmVersions.js`,
`retention.js`, `answers.js`) are excellent and clearly derived from the real company procedures.
The BFSI-residue files are the **older core** (`data.js`, `risks.js`, `controls.js`, `issues.js`,
`policies.js`, `notifications.js`) — and those are precisely the Wave 1 proof modules.

Separate issue in the same field: `juris` conflates *jurisdiction* with *financial regulator*.
`03`'s jurisdiction model is about **data residency and data-protection law** (PIPL / PDPO / PDPA)
— a different axis entirely. Do not port `juris` as the jurisdiction field.

---

## 3. Risk scoring — confirms `15` §4 and extends it

Already known from `15` §4:

- `risks.js` carries a **single `imp`**, not the five RCI impact types. ✔ confirmed
- `RSK-1042`: `imp:5, lik:4, inh:25` → 5 × 4 = 20, not 25. ✔ confirmed

**New findings:**

| # | Finding | Severity |
|---|---|---|
| 3.1 | **Two incompatible risk representations exist.** `risks.js` is `{imp, lik, inh}`; `riskRegister.js` is `{item, tv, desc, existing, add, who, target, status, score}` — no likelihood or impact at all, only a final `score`. The second is the RM Report register sheet. `02a` models only the first shape | 🔴 |
| 3.2 | `osServices.js` `risk:'A'` and `notifications.js` `sev:'R'` express residual risk as a **RAG band**, not a 1–25 score. A third representation | 🟡 |
| 3.3 | **`answers.js` states the RCI model correctly** — "Likelihood × Impact, both 5-point; impact is the highest score across finance, business operations, legal & regulatory, reputation, and sensitive information or life safety", plus the ≥16 threshold and IT Risk Register overflow. Its worked example ("likelihood 3 × impact 4 = 12") is arithmetically sound | ✅ |

3.3 is the interesting one: **the agent's canned answers are domain-correct while the UI sample
data is not.** The handoff contains its own contradiction, and the correct version is the one that
matches `02a`. This strengthens the `15` §4 ruling — build to the procedure — rather than
weakening it.

---

## 4. Enum values and fields the specs do not carry

Recorded as gaps to decide, **not** as fields to adopt automatically. Sample data does not get to
amend the canonical model (`15` §4); but where the mockup has a field `02a` lacks, the screens
will need *something* there.

### 4.1 `auditIssues.js` — richer than `15` §3.2 recorded

| Aspect | `15` §3.2 says | Sample data also has |
|---|---|---|
| `grade` | Major / Minor | **Observation** |
| `src` | Certification body / Internal audit | **Customer audit** |
| `status` | Raised → CAP submitted → CAP in progress → Verification → Closed | **Overdue**, **Accepted** |
| `clause` | "Annex A clause" | **ISO 27001 main-body clauses** (`6.1.3`, `7.2, 7.3`, `7.5.2`) — and **multi-valued** |
| `link` | "link to related record" | Polymorphic across `INC-` / `EPR-` / `RSK-` / `POL-` / `CTL-` |

The main-body clauses matter: an audit finding against clause 6.1.3 (risk treatment) or 7.5.2
(documented information) is not an Annex A control gap, so a field typed to Annex A only will
reject real findings.

### 4.2 `incidents.js`

| Field | Note |
|---|---|
| `bu` | Business unit as **free text** ("Service Operations", "Field Service"). `02a` `OrgEntity.type` has `business_unit` as a **hierarchy node**. Decide which — they are not interchangeable |
| `ticket` | External ITSM reference (`SD-88214`). Not in `02a` |
| `next` | Next-update commitment ("Twice-daily update due 18:00 SGT") — an SLA obligation, driven by S1/S2/S3 per `11` |
| `clause` | Multi-valued Annex A, same as 4.1 |
| `status` | Investigation / Root cause analysis / Corrective action / Notified / Closed — verify against `11`'s canonical lifecycle |

### 4.3 `suppliers.js` — 16 fields, no counterpart in `02a`

`ref, date, party, asset, access, cls, dur, people, reason, adequate, tpAdequate, newCtl, by,
opco, review, status`. This mirrors the External Party Risk Assessment Form closely.

`07` says `Vendor` is *"defined in the model now, not surfaced as a module"* — but `02a` §3 has
**no Vendor / ExternalParty entity at all**. That is a genuine gap against the stated Wave 1
position, not a Wave 2 deferral.

### 4.4 Entities with no `02a` counterpart

| Source | Concept | Note |
|---|---|---|
| `reportLibrary.js` | Scheduled report definitions (`name, aud, freq, next, fmt, owner, status`) | Reporting is a platform capability; nothing models it |
| `notifyRules.js` | Notification rules (`ev, to, ch, sla, on`) — channels include **Teams and SMS** | `05` covers notifications; `02a` has no entity |
| `rmVersions.js` | `by:'ITSC'`, `appr:'ISC'` — **governance bodies** (IT Steering Committee, Information Security Committee) as approvers | `02a` has no committee/approval-body concept; approvals are modelled as users |
| `knowledgeSources.js` | Agent knowledge index with sync state | Wave 3, but informs ADR-0008 |
| `accessReviews.js` | Campaign (`camp, scope, due, done, total, owner`) | `15` §5.2 flagged this; still not in `02a` |

### 4.5 Smaller field gaps

| File | Field | Gap |
|---|---|---|
| `opcos.js` | `role:'Regional HQ' \| 'Supply chain' \| 'Sales & service'` | An OpCo **function**. `02a` `OrgEntity.type` is structural (region/country/legal_entity/business_unit) — this is a different axis |
| `opcos.js` | `iso:'A. Kumar'` | List view carries the ISMS leader **name only**; `15` §5.5 requires the full block (name, department, email, address, phone) on the profile |
| `policies.js` | `file:{name, fmt, size, pages, uploaded, note}` plus `toc[]` / `versions[]` per `data/README.md` | `02a` `Policy` has only `body_ref` — no file metadata, no table of contents, no per-policy version array |
| `accessRequests.js` | `who:'External — BSI auditor'`, `opco:'—'`, `ask:'Auditor (read-only) — 14 days'` | Requests must support an **external party with no OpCo** and a **time-boxed grant**. Ties to `sessionPolicy.js` JIT auditor expiry |
| `catalogue.js` | `biz:'OP' \| 'OS'`, each offering linked to one `risk` + one `ctl` | Per `13`. The 1:1 risk/control link is likely a simplification — real offerings map to many |

---

## 5. Dashboard metrics vs. `08`

`data.js` fields: `risks, high, cov, overdue, open, rcsa, overall`, plus `prev:{cov, rcsa, high}`.

| `08` / `02a` `metric_key` | In `data.js`? |
|---|---|
| `total_risks` | ✅ `risks` |
| `high_critical_count` | ✅ `high` |
| `control_coverage_risk` | ⚠️ `cov` — **one number where `08` defines two** (% risks with ≥1 control, and % controls effective) |
| `control_coverage_effective` | ❌ collapsed into `cov` |
| `overdue_tests` | ✅ `overdue` |
| `open_critical_issues` | ✅ `open` |
| `rcsa_completion` | ✅ `rcsa` |
| `policy_attestation` | ❌ **absent from the aggregate** (exists per-policy as `att` in `policies.js`) |
| `posture_rag` | ✅ `overall` |

**`prev:{...}` independently validates the `posture_snapshot` decision** (`02a` §7): the mockup
already assumes a prior-period comparison exists. It carries three of the nine metrics, so the
trend affordance in the design is narrower than the model supports — not a conflict, but the
design will need extending rather than the model trimming.

---

## 6. Files that are clean

No spec conflict found. Worth saying explicitly — most of the newer files are in good shape and
should be treated as the better source where two files disagree.

| File | Note |
|---|---|
| `retention.js` | Matches `15` §5.3 exactly, and adds `hold` ("2 under legal hold") and `disp` (disposal action) — **confirms legal hold is real, not aspirational** |
| `permMatrix.js` | 11 modules × 6 roles, verbs F/A/E/C/R/—. Matches `15` §5.1. This is the canonical module list |
| `sessionPolicy.js` | SAML 2.0 / Okta, hardware key for Platform admin, 30 min idle / 12 h absolute, IP restriction, JIT auditor expiry, 2 break-glass with P1 to Group CISO. **Names Okta — direct input to ADR-0007** |
| `rmVersions.js` | Version history shape is sound (`ver, by, note, eff, appr`) |
| `accessReviews.js` | Campaign shape is sound |
| `osServices.js` | Shape sound; only the `RIN` membership and RAG-risk issues above |
| `answers.js` | Domain-correct throughout; the RCI scoring answer is the most accurate risk-model statement in the whole handoff |

---

## 7. What this changes

| Action | Where | Priority |
|---|---|---|
| Rebuild the 14-OpCo list: `RIN` → `RCN`; remove `Japan` as an operating entity | Port-time data fixture | 🔴 P0 |
| Decide the entity key for the dashboard — OpCo code, not country. **`data.js` cannot be ported as-is** | `08` + M8 | 🔴 P0 |
| Decide how the RM Report register sheet (`riskRegister.js` shape) relates to the live register | `02a` + `15` §3.1 | 🔴 P0 |
| Add `Vendor`/`ExternalParty` to `02a` — `07` already claims it is defined | `02a` §3 | 🔴 P0 |
| Widen `auditIssues` enums: `Observation`, `Customer audit`, `Overdue`, `Accepted`, multi-valued main-body + Annex A clauses | `15` §3.2 → `02a` | 🟡 P1 |
| Decide `business_unit`: hierarchy node or free text | `02a` §3 | 🟡 P1 |
| Decide whether governance bodies (ISC / ITSC) are modelled, or approvals stay user-only | `02a` + `05` | 🟡 P1 |
| Model report schedules and notification rules | `02a` + `05` | 🟡 P1 |
| Extend `Policy` with file metadata, TOC and version array | `02a` §3 | 🟡 P1 |
| Strip BFSI content when porting: AML/CTF/sanctions/reconciliation rows and `juris` regulators | Port-time | 🟡 P1 |
| Feed Okta into ADR-0007 | `14-adr/` | 🟢 P2 |

---

## 8. Method note

Every finding above was read from the file, not inferred. Sample **values** are illustrative
(`15` §4) and are cited only where the value demonstrates a **shape or scope** problem — an
inverted OpCo list, a country-keyed entity, a second risk representation. Where a file is merely
unrealistic (a made-up certificate number), it is not listed.
