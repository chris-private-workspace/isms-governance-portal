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
