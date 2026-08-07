# 03 — Multi-Entity & Jurisdiction Model

## Multi-entity, not multi-tenant

The platform serves multiple subsidiaries of **one group**. That is a multi-entity problem, not a multi-tenant one:

- **Multi-entity (this system):** one system, one data model. Subsidiaries are nodes in an organisational hierarchy. Their data is separated by *access scope*, but they share one taxonomy, and the regional office can roll up across all of them.
- **Multi-tenant SaaS (not this system):** every customer is a fully isolated tenant with its own data and configuration — appropriate only if the group later sells this to non-group clients.

Building multi-tenant isolation we don't need would add cost and complexity for no benefit. If external commercialisation is ever decided, it becomes a new ADR.

## Organisational hierarchy

`OrgEntity` is self-referential and typed:

```
Region (APAC)
└── Country (e.g. Singapore)
    └── Legal entity (e.g. Group SG Pte Ltd)
        └── Business unit
```

Every domain record (risk, control, policy, asset, …) references an owning `OrgEntity`. This single reference powers both access-scoping and reporting roll-up.

## Entity-scoping (prefer database-enforced)

Access is filtered by organisational entity **by default**. Enforce this as close to the data as possible:

- **Recommended:** database **row-level security (RLS)** keyed to the user's entity scope, so a query cannot return another entity's rows even if application code has a bug. (PostgreSQL RLS is the leading candidate — see ADR in `06`.)
- Application-layer checks are defence-in-depth *on top of*, not instead of, database enforcement.
- A user's scope can be a single entity, a subtree (e.g. all of Singapore), or the whole region (regional office). Scope is derived from role assignment (see `05`).

## Visibility & roll-up

- **Local view:** a subsidiary user sees and operates their own entity's data.
- **Regional roll-up:** the regional office sees aggregated posture across all entities, and can drill down.
- **Shared vs local records:** a group-level control library can be defined once at the region and *inherited* by entities, with entities able to add local controls. Inheritance is explicit in the model (a control's owning entity plus an "applies-to" scope), never a copy-paste per subsidiary.

## Jurisdiction & data residency

- `Jurisdiction` carries a residency policy. Some APAC jurisdictions require data localisation (e.g. China PIPL); others permit cross-border transfer under conditions.
- The architecture must allow **per-region deployment** of storage/processing where a jurisdiction demands it, without forking the codebase. The data model tags records with jurisdiction so residency rules can be applied and evidenced.
- Where AI features are added later, *where the AI processing runs* is itself a residency control, not just a feature — treat it accordingly.

> **Confirmed:** 14 OpCos across 12 jurisdictions (China, HK, SG, KR, TW, MY, TH, ID, PH, VN, AU, NZ). India is out of scope. See `15-design-alignment.md` §1 for the OpCo list.
>
> **China's inclusion makes localisation binding**: the China entity's data must be storable and processable in-country, and the platform must support this **without forking the codebase**. Settle this in ADR-0006 before M1 creates any table, since it constrains deployment topology, data partitioning and the inference endpoint used by the Wave 3 agent.

## Cross-border data classification (input to ADR-0006)

> **Purpose of this section.** ADR-0006 cannot be answered in the abstract ("what does PIPL
> require?"). It becomes answerable once you can point at the specific fields that would leave
> the jurisdiction. This is that list. **Take it to Legal / the DPO — this repository is not
> legal advice.** The engineering options in §Deployment consequences plug the answer straight in.

Two different laws create two different questions, and they land on different tiers:

| Law | What it constrains | Which tier it bites |
|---|---|---|
| **PIPL** | Personal information (个人信息) | T2 and T3 only — **T1 contains none** |
| **DSL / CSL** | "Important data" (重要数据) — plausibly includes security posture | **Potentially all three, including T1** |

The DSL/CSL question is the harder one and the one that decides the topology. A statement like
"the China entity has 7 high/critical risks and 62% control coverage" is security-posture
intelligence about the company, independent of whether any person is named in it.

### Tier 1 — Aggregate posture metrics

One `posture_snapshot` row per (entity, period, metric). This is what the entity-comparison
matrix in `08` reads — the flagship panel.

| `metric_key` | Definition | Example | Personal info | Reveals posture |
|---|---|---|---|---|
| `total_risks` | count of active Risk in scope | `47` | No | Low |
| `high_critical_count` | count where `rating_residual ∈ {High, Critical}` | `7` | No | **High** |
| `control_coverage_risk` | % of risks with ≥1 linked control | `84` | No | **High** |
| `control_coverage_effective` | % of controls with `effectiveness = effective` | `71` | No | **High** |
| `overdue_tests` | controls past their `frequency` window | `4` | No | **High** |
| `open_critical_issues` | `Issue.severity = critical`, status ≠ Closed | `2` | No | **High** |
| `rcsa_completion` | completed ÷ scheduled Assessment in period | `92` | No | Medium |
| `policy_attestation` | acknowledged ÷ required | `88` | No | Medium |
| `posture_rag` | derived band | `amber` | No | Medium |

Row-identifying fields: `org_entity_id` (identifies a company, not a person), `period`,
`captured_at`. **No tier-1 field contains personal information.**

### Tier 2 — Drill-down record list

Returned when a user clicks an entity row. Fields taken from `02a` §3 (Risk) and confirmed
against the design handoff's `data/risks.js`.

| Field | Example | Personal info | Reveals posture |
|---|---|---|---|
| `ref_code` | `RSK-0987` | No | Low |
| `title` | "Cross-border personal data transfer" | No | **High** — the title names the weakness |
| `category` | `Data Privacy` | No | Low |
| `score_before` / `score_after` | `20` / `12` | No | **High** |
| `status` | `Treatment` | No | Medium |
| **`risk_owner` name + job title** | `L. Wang`, `Data Protection Officer` | **Yes** | No |
| linked control count | `4` | No | Medium |
| `updated_at` | `2026-08-02` | No | No |

> ⭐ **The personal information and the posture intelligence are separable.** `risk_owner` is the
> only tier-2 field carrying personal information. Replace it with a pseudonym or a role code on
> transfer and the PIPL question disappears from this tier entirely, leaving only the DSL/CSL
> question. This is a cheap and high-leverage design lever — see
> `Jurisdiction.cross_border_pseudonymise_actors` in `02a` §3.

### Tier 3 — Full records and evidence

The regional office does not need these for day-to-day oversight.

| Field / record | Personal info | Reveals posture |
|---|---|---|
| `Risk.description` (full narrative) | Possible | **High** |
| `Asset` / `Threat` / `Vulnerability` links (named) | No | **Highest** — named assets tied to named weaknesses is directly exploitable |
| `Evidence` files (scan reports, config screenshots) | Possible | **Highest** |
| `Assessment` / RCSA answers | Possible | High |
| ISMS leader contact block (name, email, address, phone — `15` §5.5) | **Yes** | No |
| `Attestation` records (who acknowledged which policy, when) | **Yes** | Low |
| Audit-trail actor identity | **Yes**, if real names are stored | Medium |

> The audit-trail row is a design choice, not a given. `rules-on-demand/multi-tenant-data.md`
> §個資、保留與刪除 already requires the audit trail to store **pseudonyms, not personal data** —
> driven by the conflict between the erasure right and guardrail 5. That decision also removes
> this row from the PIPL surface. Two constraints, one fix.

### Deployment consequences

The tier that may cross determines the topology. **The topology cannot be deferred** — where the
database physically sits is settled before M1 creates the first table.

| If Legal says | Topology | What the regional dashboard loses |
|---|---|---|
| T1 may cross | **Per-region deployment; only `posture_snapshot` rows replicate** | China appears as a matrix row with no in-place drill-down; clicking through hands off to the China instance |
| Only part of T1 may cross (e.g. `posture_rag` but not counts) | Same topology, narrower allowlist | The matrix shows a RAG band for China but no comparable numbers |
| No T1 may cross | **Fully partitioned; China outside the regional roll-up** | The flagship view covers 13 of 14 OpCos. **This is a real loss of the primary driver — surface it to the stakeholder, do not absorb it silently** |

A single deployment with a China carve-out is **rejected**: it degrades into a monolith with
conditional branches, which contradicts the "without forking the codebase" requirement above.

### What is decided regardless of the legal answer

**The border is configuration on `Jurisdiction`, not a code branch.** Field-level transfer rules
live in the residency policy (`02a` §3), so:

- a change in the legal position is a configuration change, not a re-architecture;
- if Vietnam or Indonesia tighten later, the same mechanism applies without a new ADR;
- "what actually crossed the border, when, under what basis" is queryable and evidenceable —
  which is precisely the self-demonstration guardrail 2 ("Entity Zero") demands.

### Questions for Legal / the DPO

Phrased to be answerable, rather than as "what does PIPL require":

1. Do the **tier-1 aggregate posture metrics** above (counts, percentages, RAG — no record content,
   no personal information) constitute an outbound transfer of important data when replicated from
   the China deployment to the regional deployment?
2. If not permitted, is **`posture_rag` alone** (a red/amber/green band with no underlying numbers)
   treated differently?
3. For **tier 2**, what conditions attach to transferring a China-based employee's **name and job
   title** as a risk owner — and does replacing it with a pseudonym or role code remove the
   requirement?
4. What **retention and deletion** obligations attach to whatever does cross, once it sits in the
   regional deployment?

## Regulation-to-control matrix

The pay-off of jurisdiction-tagged obligations plus many-to-many `Control ↔ Obligation` (from `02`):

- One control satisfies the equivalent obligation across multiple jurisdictions simultaneously.
- Compliance coverage per entity/jurisdiction, and gaps, are queries over this matrix rather than separate per-country spreadsheets.
- Adding a new jurisdiction means adding its obligations and mapping them to (mostly existing) controls — not rebuilding a parallel compliance stack.

## Design checklist for anything touching this layer

- Does every new record get an owning `OrgEntity`?
- Is access filtered by entity scope at the database layer, not just the app?
- Can this be rolled up to the region and drilled back down?
- If it concerns compliance, is the obligation jurisdiction-tagged and mapped through the matrix rather than duplicated per country?
- Does any residency requirement constrain where this data may live?
