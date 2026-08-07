# Design-handoff screen fragments vs. specs — discovery audit

**Date**: 2026-08-07 — **point-in-time snapshot**, against `c24e578`.
**Scope**: all 30 fragments in `docs/06-reference/design_handoff_isms_grc_platform/fragments/`
(3 shell + 27 screens, ~470 KB of markup)
**Compared against**: `02a`, `05`, `08`, `11`, `12`, `13`, `15`, `17`
**Method**: structural sweep (targeted grep over labels, headings, nav items, enum options,
`sc-for` placeholder counts) plus full reads of the screens where the sweep flagged an anomaly.

> **Pure discovery — no spec was rewritten from these findings.** Where a spec statement is
> factually wrong about the design, it is corrected in place (`15` §6). Where the design is
> missing something the procedures require, it is recorded, **not designed**.

---

## 0. Headline

**The financial-services and India residue that CH-002 found in `data/*.js` is not in the
fragments.** A sweep for `India · RIN · Japan · MAS · FSA · APRA · HKMA · BNM · PBoC · AML ·
sanctions · DPDP` across all 30 files returns **one real hit** (an entity dropdown on the
registration screen). The port hazard identified in CH-002 is confined to the sample data and the
standalone prototype — **the markup is clean**.

That materially reduces the cost of `AD-Port-BFSI`: it is a data-fixture job, not a markup sweep.

The offsetting finding is the opposite shape. **Three screens are missing content the procedures
require**, and one of them is the most privacy-sensitive field group in the platform.

---

## 1. The risk form is much thinner than `15` §4 recorded 🔴

`15` §4 flagged the single impact value. The form has **seven fields total**:

`Risk title*` · `Description` · `Entity*` · `Category*` · `Owner` · `Treatment status` ·
`Impact` (5 buttons) · `Likelihood` (5 buttons) → a single **"Residual rating"** readout.

| Gap | Against |
|---|---|
| **No before/after-control structure at all.** One score set, labelled *Residual*. `15` §4 asked for "both score sets" but did not record that the form has no such structure to extend | `02a` §2 — scored **twice**, `score_before` and `score_after` |
| **The entire asset-based chain is absent** — no asset, threat, vulnerability, CIA type | Confirmed parameter #8: asset group → asset → threat → vulnerability → CIA. Asset/Threat/Vulnerability libraries are **Wave 1** |
| **`Owner` is a free-text `<input>`**, not a user picker | `02a` `risk_owner_user_id` FK. Free text means no FK, no SoD enforcement (`02a` §5.2), no notification routing (`notifyRules.js`) |
| Stated formula on-screen: *"Residual = impact × likelihood"* | Procedure: `Likelihood × MAX(FIN, BOP, LRY, REP, SIS)` |
| `Entity` dropdown, `hint-placeholder-count="6"` | 14 OpCos |

> This is not "add four inputs". The form implements a **different risk methodology** — a generic
> 5×5 with one score, versus the RCI procedure's asset-based, five-dimension, before-and-after
> model. `15` §4's ruling ("build to the procedure, not the mockup") holds; the size of the delta
> did not.

## 2. The incident form has no restricted block 🔴

`11` §Access control specifies an "other information" block — **violating acts, motives,
disciplinary action, president view** — which "contains employee-conduct and potentially personal
data", must be "permission-gated to the CISO/HR roles, hidden from ordinary incident handlers, and
its access itself audited".

**It is entirely absent from screen 17.** A sweep for `violat|motive|disciplinary|president` across
all 27 screens returns nothing.

Porting the form as designed silently drops **both** a documented requirement **and** the access
control that protects it. Confirmed parameter #9 applies: follow the source document.

Otherwise screen 17 is good, and matches `11` field for field — including `Ticket number`,
`Incident occurred` vs `Incident discovered`, `Root cause`, `Workaround — action plan`,
`Corrective action plan`, `Preventive action plan`, `ISO/IEC 27001 clause`, and the
"Caused by insufficient staff awareness" flag (`awareness_related`). It also uses **`OpCo *`** —
the correct entity key.

## 3. Navigation has five groups, not four — `15` §6 is wrong 🟡

Actual structure in `02-app-shell.html`:

| Group | Items |
|---|---|
| **Intelligence** | ISMS AI Agent — badged `AI`, **first item in the sidebar** |
| Oversight | Dashboard · Risks · Risk programme · Controls · Policies · Issues · Assessments · Audit issues |
| Operations | Incidents · Suppliers |
| Compliance | ISMS profiles · OS portfolio |
| System | Admin |

`15` §6 lists four groups and places the AI Agent inside *Operations*. Two consequences:

- **The Wave 3 AI agent is the top nav item, above the flagship dashboard.** Waves 1–2 ship with
  either a prominent dead entry or a visibly empty first group. That is a product-positioning
  decision hiding in a nav structure, and it has not been made anywhere.
- Labels differ from `15` §6: **"Incidents"** not "Security incidents"; **"ISMS profiles"** not
  "APAC ISMS profiles".

Also unspecified anywhere: **nav count badges** (Assessments `5` amber, Incidents `2` red). These
imply a per-user, scope-filtered pending count on two modules.

## 4. The entity/role switcher conflates two orthogonal axes 🟡

Screen 29 renders `roleOptions` — `hint-placeholder-count="7"` — as flat buttons, each with a
country **flag**, one chip, and the caption *"Change the entity you are acting for. Your
permissions and scope adjust to the selected role."*

`15` §5.1 requires the opposite model: **"Entity scope sits on top of role"** — 6 roles × entity
scope, orthogonal. A flat list of pre-baked (entity, role) pairs does not scale to 14 OpCos × 6
roles, and the flag is country-keyed again.

## 5. The registration screen carries pre-`15` vocabulary 🟡

`01-auth-full-screen-no-shell.html`:

- **Entity** dropdown — six hard-coded country options: `Singapore · Japan · Australia ·
  Hong Kong · Malaysia · China`. Country-keyed, and Japan is not an OpCo (`15` §1).
- **Requested role** — `Risk Owner · Control Owner · Auditor (read-only) · Regional Governance`.
  **None of these is one of the confirmed six roles.** `15` §5.1 states the six "replace the
  abstract three-lines role sketch"; this screen still has the sketch.

It also ties into `AccessRequest` (`02a` §3.2): "Request access" is the self-service entry point
for the access-request workflow, so its role vocabulary is not cosmetic.

## 6. Fragments contain no role logic at all 🟡

Role names appear **twice across all 30 files**. There is no conditional rendering, no
permission gate, no read-only banner in the markup — it all lives in the prototype's logic class.

`15` §5.1 requires enforcement at **navigation, route and action** level. Porting the fragments
therefore delivers **zero** of that; all three layers are built from scratch. Worth stating
explicitly because "we ported the screens" can easily be heard as "the permission model came with
them".

## 7. Dashboard matrix confirms the `data.js` metric gap at markup level 🟢

Columns: `Entity · Overall · Risks · High / Crit · Ctrl cov. · Overdue · Open crit. · RCSA %`

- **`policy_attestation` is absent** — `08` defines nine metrics, the matrix shows seven.
- **`Ctrl cov.` is one column** where `08` defines two (% risks with ≥1 control, % controls
  effective).
- The column header is the generic `Entity`, so the country-key problem is in the **data**, not
  the markup — the table itself is agnostic.
- ✅ Real `<table>` / `<th>` semantics, per `15` §6's accessibility convention.

## 8. Smaller confirmations

| Finding | Note |
|---|---|
| Screen 23 has **no certifier-comment / company-reply** fields | Confirms `15` §5.5 and its open action `15` §7 #7, now verified at markup level |
| Screen 22 (supplier form) matches `12`'s `ExternalPartyRiskAssessment` closely | Name of external party · business reason · asset accessed · type of access · highest classification · duration/frequency · external personnel · controls adequate · performed by |
| Screen 23 carries the full ISMS leader block | Name · Department · Email · Phone · Address — matches `15` §5.5 |
| Preferences (28) has a language selector, `hint-placeholder-count="5"` | Five languages. `15` §6 says the design ships EN + 日本語; the affordance is wider. Actual list is in the logic class |
| My profile (27) has **Timezone** | Supports `07`'s "timezone-aware" foundation requirement |

---

## 9. What this changes

| Action | Priority |
|---|---|
| Risk form: rebuild to the RCI methodology — five impacts × before/after, plus the asset→threat→vulnerability→CIA chain, and `Owner` as a user picker | 🔴 P0 — it is a different methodology, not a field gap |
| Incident form: add the restricted block **with** its CISO/HR permission gate and access auditing | 🔴 P0 — privacy control, `11` mandates it |
| Decide whether the AI agent stays the first nav item in Waves 1–2 | 🟡 P1 — product positioning |
| Entity/role switcher: rebuild as role × scope, not a flat pair list | 🟡 P1 |
| Registration screen: replace the role vocabulary with the confirmed six; fix the entity list | 🟡 P1 |
| Specify the nav count badges (what counts, whose scope, refresh) | 🟢 P2 |
| `AD-Port-BFSI` rescope: **data fixtures only, markup is clean** | 🟢 P2 — cost reduced |

## 10. Method note

Findings were read from the files. The sweep pattern for §0 was
`India|RIN\b|Japan|日本|MAS|FSA|APRA|HKMA|BNM|PBoC|AML|[Ss]anctions|DPDP`; `AML` matched only as a
substring of `SAML`, and was discarded on inspection rather than reported. Screens not named in
this document were swept but showed no spec conflict — absence from this list means checked, not
skipped.
