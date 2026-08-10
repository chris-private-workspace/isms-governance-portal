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
| Project name / objective | APAC ISMS Governance Platform. **Eight governance domains** — ISMS profile, ISMS AI agent, policy and standards, incident reporting, OS portfolio, supplier management, risk management, audit issues | **Requestor, 2026-08-10.** ⚠️ This is the scope statement the form carries; it is broader than `07-wave1-build-plan.md` §Scope, which sequences these across waves. The form describes the target platform, the build plan describes the order |
| Hosted on | RCI3 Azure Singapore | User decision, 2026-08-09 (see §1) |
| VM specification | **None — no IaaS VM** | ADR-0011 (Container Apps) |
| Container platform | Azure Container Apps; `isms-api` **internal ingress only** (3210), `isms-web` external (3200) | ADR-0011 §Decision, §Consequences |
| Container registry | **One shared ACR** across all three environments, images by tag | ADR-0011 "the first shared resource in an otherwise per-environment design" |
| AKS · Azure DevOps · Event Grid | **Rows removed from the resource table** (2026-08-10) — the form should carry only what is actually requested. The fact that they were considered survives as a one-line note above the table | ADR-0011 option C rejected AKS; CI/CD runs on the existing corporate GitHub organisation |
| Azure OpenAI | **Requested**, for the ISMS AI agent domain, from a later phase. GPT-4o-class, Southeast Asia, ~500k prompt / ~150k completion tokens per day | Requestor decision 2026-08-10. ⚠️ **Estimate with no traffic behind it.** ADR-0008 / 0009 are undecided, so the form asks for capacity, not a design — and `CLAUDE.md` 約束 7 keeps the model a configuration choice |
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
| Timeline (4 tasks) | Portal launch mid-Aug, no later than end of Aug 2026 · Phase 2 Sep · Phase 3 Oct · Phase 4 Nov 2026 | **Requestor, 2026-08-10.** Replaces the earlier M0–M9 mapping. ⚠️ Phase 4 was given as "Sep 2026" and read as a typo for November — confirmed by the requestor |
| Schedule risk stated on the form | End of August is achievable only if PAR approval and provisioning run without a gap | The form's own introduction allows 1–2 weeks for the PAR process, ending at GM approval; the request was raised 10 Aug 2026 |
| Third party | None — internal build | `00-project-charter.md` D1 |
| Note 7 — IaC scan evidence | We author no IaC; ask RIT for its scan evidence | `BACKLOG.md` `AD-IaCEvidence-1` — the obligation moved, it did not disappear |
| Note 8 — DAST path | GitHub-hosted runners cannot reach a private-VNet staging | `BACKLOG.md` `AD-DAST-1` |

---

## 3. Assumptions written into the form — challenge these

| # | Assumption | Why it was made | If wrong |
|---|---|---|---|
| A1 | `RA` = RAU, `RSP` = RSG, `RMS` = RMY | The form's 11 codes do not match our 13-OpCo list in `15` §1 | Tick different boxes; note 2 asks RIT to correct it |
| A2 | RKR and RID are counted as **internal** users | Your decision, 2026-08-09. The form's own remark says OpCos outside the O365 tenant count as *external* | Note 1 surfaces the conflict explicitly and asks RIT to confirm tenant status — it is not hidden |
| A3 | ~~Dates: dev Sep 2026, staging Nov 2026, prod Feb 2027~~ → **superseded 2026-08-10**: portal launch by end of August 2026, Phases 2–4 in Sep / Oct / Nov | Requestor's schedule, not derived | Edit the timeline table in Table 1 |
| A7 | Phase 2–4 **content** is not stated on the form — only their dates and that they need no further resource beyond the Azure OpenAI capacity | The requestor gave dates, not scope. Inventing module scope would put claims in front of RIT that nobody has agreed | If a phase does need new Azure resource, this form under-requests — say so before submitting |
| A4 | Requesting OpCo is RAPO (Regional IT) | Section 2 of the form is "Filled by RAPO" | Change the Opcos field |
| A5 | Browser-only access, corporate-managed devices, unmanaged devices **not permitted** | No mobile or PC client exists in the design deliverable | Tick the mobile/PC-client boxes if that changes |
| A6 | Container/DB sizing figures | Estimates for a 13-OpCo internal governance tool; no load test exists yet | RIT will size in Section 2 — that is their job, ours is to state the shape |

---

## 4. Still to complete before submitting

- [x] ~~Requester name~~ (Chris Lai) · ~~Project Sponsor~~ (Dewey Lou) — entered 2026-08-10
- [ ] Department · Project Manager · Project technical contact
- [ ] **Number of Administrators** (Table 3) — Platform Admin + Regional ISO
- [ ] **Number of internal users** (Table 4) — across 13 OpCos × six roles
- [ ] Confirm the Request Date (currently 9 August 2026, while the schedule note says 10 August)
- [ ] ⚠️ **Resolve the integration contradiction** — see §5

---

## 4b. ⚠️ One internal contradiction, unresolved

"Integration with existing system?" was changed from **Yes** to **No** during manual editing on
2026-08-10, but the "If yes, please answer" block below it is still filled in, and describes the
Microsoft Entra ID integration in detail — including the **three App Registrations RIT has to
create** and the group/claim mapping that carries entity scope into the token.

Both readings are defensible: Entra ID SSO is arguably "just authentication", not a system
integration. But the form cannot say *no integration* while requesting App Registrations two rows
below. **Pick one before submitting:**

| Option | Consequence |
|---|---|
| Flip back to **Yes** | The Entra ID block reads as intended; RIT plans the App Registrations |
| Keep **No**, clear the block | Then the App Registration requirement must move to "Addition Requirement", or it will be missed |

Leaving it as-is risks the identity integration being invisible to RIT's planning, and M4 cannot
start without those App Registrations (`ADR-0007`, `07:35`).

---

## 5. What was verified, and what was not

**Verified** — structurally and textually, by reading the saved `.docx` back:

- **27 checkboxes ticked** (`w14:checked val="1"` **and** the glyph ☐ → ☒ — both, because Word
  renders the glyph while the flag is what a form reader queries). This started as 33; the manual
  edit of 2026-08-10 deliberately changed six, and the diff was checked box by box rather than by
  count: integration **Yes → No**; **VPN client** and **Site-to-Site VPN** cleared in both the
  administrator and internal-user sections, leaving *Internal network* only; **Password** cleared
  in both, leaving *MFA* only. Nothing was lost accidentally.
- every form placeholder cleared rather than concatenated (`EmailN/A` was a real defect on the
  first pass, caused by appending to a content control instead of replacing its body)
- all five structured sub-tables populated: VM spec, Other Resources, start/stop schedule,
  source→destination protocol matrix, project timeline
- the architecture diagram is embedded, and was re-inserted (not byte-swapped) when Azure OpenAI
  was added to it — the canvas grew, and a byte swap would have kept the old extent and squashed it

**Not verified** — stated plainly rather than implied:

- **The document has not been opened in Word by me.** Page breaks, row pagination and how the
  tables flow across pages are unchecked. Open it once before sending.
- Cost estimation is Section 2's job (RIT), so no figures were proposed.
- **The Azure OpenAI token estimate has no traffic behind it.** It is arithmetic on an assumed
  query volume, stated as such on the form itself.
- The resource table's section header still reads "ACA/AKS/DevSecOps" — that is the blank form's
  own heading and was left alone even though the AKS and DevOps rows under it were removed.

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
