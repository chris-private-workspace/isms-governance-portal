# PAR fill notes — APAC ISMS Governance Platform

**Purpose**: Traceability for every technical answer written into the RCI Project Authorization
Request, plus the open items the requestor must close before submitting.

**Category / Scope**: Reference / Azure resource request (the number `CH-010` is reserved for this)
**Created**: 2026-08-09
**Last Modified**: 2026-08-09
**Status**: Draft — Section 1 complete except the fields marked below

> **Modification History**
> - 2026-08-09: Initial creation — Section 1 filled from ADR-0007 / 0010 / 0011 and docs 04 / 07 / 15 / 16

---

## Files

| File | Role |
|---|---|
| `RCI Project Authorization Request Process v1.9.docx` | **Blank master — do not edit.** Kept clean so a future request starts from the real template |
| `PAR-APAC-ISMS-Governance-Platform-2026-08-09.docx` | The filled instance. Answers are in dark blue; fields the requestor must complete are in red |
| This file | Which repo document each answer came from |

Section 2 (Recommended Solution) and Section 3 (Approval) are filled by RAPO / RIT, not by us.

---

## 1. Decisions this form settles

**The deployment region was an open decision until this form.** ADR-0010 fixed *one* region and
explicitly deferred *which* region to the resource request. ⚠️ Its parameter table pointed at
**`CH-009`**, not `CH-010` — a stale pointer, because CH-009 was reassigned to the
track-classification fix. Both the region and the pointer were corrected on 2026-08-10.

| Decision | Value | Where it now lives |
|---|---|---|
| RCI datacentre | **RCI3 — Azure Singapore** | `ADR-0010` §Operational parameters (back-filled 2026-08-10) · [`CH-010`](../../03-implementation/changes/CH-010-azure-resource-request.md) |
| Environment scope of the request | dev + staging + production, all three at once | ADR-0010 (3 environments) |
| Subscription split | production isolated; dev + staging share | ADR-0010 |
| IaC tool (ADR-0011 deferred it here) | **Neither** — this project authors no IaC | `CH-010` §Solution ① · `AD-IaCEvidence-1` stays open for the *evidence* |

✅ **Back-port done (2026-08-10)**: `ADR-0010:73` now names the region, `ADR-0011:115` carries the
IaC answer, `decision-form.md` OQ-1 records it, and `CH-010` exists — so the four forward references
that `AD-ChNumber-1` reserved the number for now resolve.

---

## 2. Answer → source

| Form field | Answer | Source |
|---|---|---|
| Project name / objective | APAC ISMS Governance Platform, ISO 27001 + 27017, 13 OpCos / 11 jurisdictions, roll-up dashboard as flagship | `00-project-charter.md` D6/D7/D11 · `07-wave1-build-plan.md` §Scope |
| Hosted on | RCI3 Azure Singapore | User decision, 2026-08-09 (see §1) |
| VM specification | **None — no IaaS VM** | ADR-0011 (Container Apps) |
| Container platform | Azure Container Apps; `isms-api` **internal ingress only** (3210), `isms-web` external (3200) | ADR-0011 §Decision, §Consequences |
| Container registry | **One shared ACR** across all three environments, images by tag | ADR-0011 "the first shared resource in an otherwise per-environment design" |
| AKS | Not required | ADR-0011 option C rejected — a cluster is a second system to secure for two HTTP services |
| Database | PostgreSQL Flexible Server; RLS is the isolation barrier and cannot be substituted | ADR-0010 §Security impact g4 ("RLS is the **only** barrier") · `docker/compose.yml:8` runs the same engine locally |
| prod DB sizing / HA / PITR | GP D2ds_v5, 256 GB, zone-redundant, PITR ≥ 14 d | Derived from ADR-0010's **RTO 4 h / RPO 15 min** |
| RTO / RPO rationale | "losing audit-trail entries is a break in an evidence chain" | ADR-0010 §Operational parameters, verbatim reasoning |
| Blob storage | Evidence files, immutability on the evidence container | `04-security-by-design.md` §Integrity — evidence-grade |
| Key Vault / managed identity | No secret in source or image | `04` §Secure SDLC · `.env.example:10` |
| Log Analytics + App Insights, 180 d | Structured logs shipped deliberately | ADR-0011 §Consequences — the corporate proxy blocks ACA log endpoints, so stdout cannot be relied on |
| **Enterprise TLS certificate, not Azure defaults** | Hard requirement, stated three times in the form | `04:93` "Defaults are the risk" · ADR-0011 §"A reason that was considered and found false" · `16-secure-development-dod.md` |
| Identity | Entra ID, OIDC + PKCE, MFA, FIDO2 for Platform Admin, 2 break-glass | ADR-0007 §記錄的偏離 — supersedes the deliverable's Okta/SAML, retains every policy requirement |
| Entity scope from token only | "never from a request parameter" | `CLAUDE.md` 約束 8 · ADR-0007 §這個決定約束了什麼 |
| Six roles × eleven modules | Platform Admin, Regional ISO, OpCo Admin, Control Owner, OpCo OS, Auditor | `15-design-alignment.md` §5.1 |
| Access path (internal network / VPN / S2S, **no Internet**) | Application sits on the corporate private VNet | `BACKLOG.md` `AD-DAST-1` — infra confirmed private VNet, 2026-08-08 |
| Timeline M0–M9 | M0 complete 8 Aug 2026; dev needed from M1 | `07-wave1-build-plan.md` §Build sequence · W01 merged PR #18 |
| Third party | None — internal build | `00-project-charter.md` D1 |
| Note 7 — IaC scan evidence | We author no IaC; ask RIT for its scan evidence | `BACKLOG.md` `AD-IaCEvidence-1` — the obligation moved, it did not disappear |
| Note 8 — DAST path | GitHub-hosted runners cannot reach a private-VNet staging | `BACKLOG.md` `AD-DAST-1` |

---

## 3. Assumptions written into the form — challenge these

| # | Assumption | Why it was made | If wrong |
|---|---|---|---|
| A1 | `RA` = RAU, `RSP` = RSG, `RMS` = RMY | The form's 11 codes do not match our 13-OpCo list in `15` §1 | Tick different boxes; note 2 asks RIT to correct it |
| A2 | RKR and RID are counted as **internal** users | Your decision, 2026-08-09. The form's own remark says OpCos outside the O365 tenant count as *external* | Note 1 surfaces the conflict explicitly and asks RIT to confirm tenant status — it is not hidden |
| A3 | Dates: dev Sep 2026, staging Nov 2026, prod Feb 2027 | Derived from M0-complete plus the M1–M9 sequence | Edit the timeline table in Table 1 |
| A4 | Requesting OpCo is RAPO (Regional IT) | Section 2 of the form is "Filled by RAPO" | Change the Opcos field |
| A5 | Browser-only access, corporate-managed devices, unmanaged devices **not permitted** | No mobile or PC client exists in the design deliverable | Tick the mobile/PC-client boxes if that changes |
| A6 | Container/DB sizing figures | Estimates for a 13-OpCo internal governance tool; no load test exists yet | RIT will size in Section 2 — that is their job, ours is to state the shape |

---

## 4. Still to complete before submitting

- [ ] Requester name · Department · Project Manager · Project technical contact
- [ ] Project Sponsor (suggested in the form: G.M. CISO IT / Chief Digital Officer)
- [ ] **Number of Administrators** (Table 3) — Platform Admin + Regional ISO
- [ ] **Number of internal users** (Table 4) — across 13 OpCos × six roles
- [ ] Confirm the Request Date (currently 9 August 2026)

---

## 5. What was verified, and what was not

**Verified** — structurally and textually, by reading the saved `.docx` back:

- 33 checkboxes set (`w14:checked val="1"` **and** the glyph changed ☐ → ☒ — both, because Word
  renders the glyph while the flag is what a form reader queries)
- every form placeholder cleared rather than concatenated (`EmailN/A` was a real defect on the
  first pass, caused by appending to a content control instead of replacing its body)
- all five structured sub-tables populated: VM spec, Other Resources, start/stop schedule,
  source→destination protocol matrix, project timeline
- the architecture diagram is embedded in the document (`word/media/image5.png`)

**Not verified** — stated plainly rather than implied:

- **The document has not been opened in Word.** Page breaks, row pagination and how the tables
  flow across pages are unchecked. Open it once before sending; expect the form to be longer than
  the blank master because several answers are substantial.
- Cost estimation is Section 2's job (RIT), so no figures were proposed.

---

## 6. Points RIT is most likely to push back on

Worth having an answer ready for each:

1. **PostgreSQL rather than Azure SQL.** Not a preference — RLS is the entity-isolation mechanism,
   and after ADR-0010 it is the only one.
2. **Three environments at once.** The PAR runs 1–2 weeks and ends at GM approval; splitting it
   means running that twice.
3. **Production in a separate subscription.** This is the least-privilege boundary for a system
   that holds the group's own risk and audit records.
4. **Enterprise certificate and DNS name.** The sibling project `unified-operation-platform`
   shipped without one (ADR-0011 records this), so "the other project didn't need it" is a
   foreseeable response. It is a `16` DoD requirement here.
5. **No IaaS VM.** The form is VM-shaped throughout; expect the question.
