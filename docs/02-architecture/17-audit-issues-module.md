# 17 — Audit Issues Module

Audit findings as a first-class module. **Accepted 2026-08-07 (CH-003)**, revising the earlier
Wave 2 decision **W2-2** ("audit module lightweight") on the recommendation in `15` §3.2.

## Why this overrides W2-2

The lightweight decision was made before the design handoff existed. Three things changed it:

1. The handoff specifies the module concretely and ships two screens for it (25, 26).
2. `permMatrix.js` gives **`Auditor` Full permission on this module and only this module** — it is
   the one place third-line independence is expressed as a capability rather than a restriction.
3. **The extra structure is the part that carries certification risk.** A major nonconformity with
   an untracked corrective action plan is how a certificate is lost; a lightweight issue list
   cannot evidence CAP verification to a certification body.

The cost is accepted knowingly: this is more than a generic issue list, and it is Wave 2 work.

## Relationship to `Issue`

`AuditIssue` is **not** a subtype of the Wave 1 `Issue` entity, and must not be collapsed into it.

| | `Issue` (`02a`) | `AuditIssue` (here) |
|---|---|---|
| Raised by | assessment / test / audit / incident / manual | an audit engagement, always |
| Carries | severity, due date, actions | audit name, source body, clause, grade, CAP, verification, certificate impact |
| Retention | per record class | **6 years** — certification body requirement |
| Closure | remediated → verified | **Major grades require verified effectiveness before certificate recommendation** |

An `AuditIssue` **may raise** one or more `Issue`/`Action` records for the remediation work
itself — that reuses the shared workflow. What stays here is the audit-facing record.

## Data model

**AuditIssue** — base fields per `02a` §1.1, including `org_entity_id` (the OpCo the finding is
against), plus:

| Field | Notes |
|---|---|
| `ref_code` | `AF-YYYY-NNN` |
| `title` | |
| `source` | enum — see below. ⚠️ **three values, not two** |
| `audit_name` | e.g. "BSI surveillance audit 2026", "FY26 ISMS internal audit" |
| `clause_refs` | ⚠️ **multi-valued, and spans both ISO 27001 main-body and Annex A** — see below |
| `grade` | enum — see below. ⚠️ **three values, not two** |
| `finding_text` | The auditor's statement, verbatim |
| `raised_at`, `due_at`, `closed_at` | |
| `owner_user_id` | Accountable for the CAP |
| `related_type` + `related_id` | Polymorphic — observed linking to `INC-` / `EPR-` / `RSK-` / `POL-` / `CTL-` |
| `certificate_impact` | Derived from `grade` — drives the recommendation gate below |

**CorrectiveActionPlan** — `audit_issue_id` (FK), `plan_text`, `submitted_by`, `submitted_at`,
`target_date`, `verification_method`, `verified_by`, `verified_at`, `effectiveness_confirmed`
(bool). Evidence attaches through the Wave 1 `Evidence` entity (polymorphic), not a private field.

> Modelled as a separate entity rather than columns on `AuditIssue` because a rejected CAP is
> resubmitted — the history of *what was proposed and why it was not accepted* is what an auditor
> asks for at the next surveillance visit.

## Enumerations

Values taken from the design handoff's `auditIssues.js`, audited 2026-08-07. `15` §3.2 recorded
only a subset of each; the third value in the first two rows is real and was being dropped.

| Enum | Values |
|---|---|
| `source` | `certification_body` · `internal_audit` · **`customer_audit`** |
| `grade` | `major` · `minor` · **`observation`** |
| `status` | `raised` · `cap_submitted` · `cap_in_progress` · `verification` · `closed` · **`overdue`** · **`accepted`** |

**`clause_refs` must accept ISO 27001 main-body clauses, not only Annex A.** Observed values
include `6.1.3` (risk treatment), `7.2, 7.3` (competence / awareness) and `7.5.2` (documented
information) alongside `A.7.14`, `A.5.22`, `A.8.24`. A field typed to Annex A would **reject real
findings** — and management-system nonconformities against the main body are precisely the ones
that threaten certification.

> `overdue` is a **derived** state (past `due_at` without verification evidence), not one an
> operator sets. `accepted` applies to observations that are acknowledged without a CAP — it is a
> terminal state distinct from `closed`.

## Lifecycle

```
Raised → CAP submitted → CAP in progress → Verification → Closed
   │            │                │
   │            └────────────────┴──── (past due, no evidence) ──► Overdue ──► back to prior state
   │
   └─ (observation, no CAP required) ──► Accepted
```

Two rules from `15` §3.2, both hard:

- **Major nonconformities require verified effectiveness before certificate recommendation.**
  `effectiveness_confirmed` must be true, with evidence attached, before `closed` is reachable
  for `grade = major`. Enforce at the transition, not as a reminder.
- **Passing the CAP target date without evidence escalates to the Information Security Committee**
  and flags the record red. This is a notification rule (`notifyRules.js`: "Audit issue overdue" →
  issue owner, OpCo ISO, Internal Audit, daily digest) plus a derived state, not a manual step.

## Retention

**6 years for audit issues and their evidence** — certification body requirement (`05`, and
`retention.js` records one item currently under legal hold in this class). Longer than every other
record class except the platform audit log. Disposal requires **manual approval**.

## Access control

`permMatrix.js`, role order: Platform admin · Regional ISO · OpCo admin · Control owner · OpCo OS ·
Auditor → `['F','F','E','E','—','F']`.

- **`Auditor` holds Full here and nowhere else.** This is third-line independence made concrete:
  the auditor can raise and manage findings but cannot edit the controls they assure
  (`02a` §5.2 SoD).
- `OpCo OS` has no access at all.
- Entity scope applies on top as everywhere: an OpCo sees its own findings; the Regional ISO sees
  the authorised subtree (`rules-on-demand/multi-tenant-data.md`).

## Wave placement

**Wave 2**, alongside the compliance and assurance modules. The CAP verification flow reuses the
shared workflow engine (`05`), and evidence reuses the Wave 1 `Evidence` entity — so nothing here
needs building twice.

The **entities** are specified now (this document) because `02a` §0's index must be complete for
M1 to know what it is *not* building.
