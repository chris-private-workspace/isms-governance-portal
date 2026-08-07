# 06 — Tech Stack & Architecture Decisions

Technology choices are **recommendations with rationale**, not mandates. Each significant one is an open ADR to be confirmed early in the build. The selection principles matter more than any specific pick.

## Selection principles

- **Security & auditability first** — mature security ecosystem, easy to lock down, easy to log.
- **Relational integrity** — the core is a richly linked graph of records; strong relational guarantees matter.
- **Entity-scoping support** — native row-level security is a big advantage.
- **Sovereign-deployable** — must run in cloud, on-prem, or isolated deployments without re-architecture.
- **Longevity & hiring** — boring, well-supported technology over novelty.
- **Claude-Code-friendly** — widely-used languages/frameworks with strong typing and test tooling.

## Recommended stack (to confirm via ADRs)

| Layer | Recommendation | Why | Alternatives |
|---|---|---|---|
| Database | **PostgreSQL** | Native **row-level security** for entity-scoping; JSONB for governed extensions; strong integrity; runs anywhere incl. sovereign/on-prem | — (strong recommendation) |
| Backend | A **statically-typed, mature framework** with first-class auth/ORM/migrations | Speeds a secure, relational, auditable build | e.g. TypeScript/NestJS, Python/Django, Java-Kotlin/Spring — pick one in ADR-0001 |
| Frontend | **React + TypeScript** | Ubiquitous, typed, good for role-based dashboards | — |
| AuthN | **OIDC** provider (self-hostable, e.g. Keycloak, or managed) | Delegated auth + MFA without storing passwords | — |
| Infra | **Containers + scanned IaC** (e.g. Kubernetes + Terraform) | Portable across cloud/on-prem/sovereign; reproducible | — |
| Secrets | **Managed secrets store** | No secrets in code/images | — |

Note on the backend choice: a framework with strong built-in **auth, permissions, admin, ORM, and record history** shortens the path to a secure, audited GRC backbone. Weigh that against end-to-end type sharing with a TypeScript frontend. This trade-off is exactly what ADR-0001 should settle.

## Open decisions (ADRs to write first)

| ADR | Decision | Notes |
|---|---|---|
| ADR-0001 | Backend language & framework | Weigh built-in auth/permissions/history vs. end-to-end TypeScript |
| ADR-0002 | Workflow engine: build vs. embed | Lean configurable state machine; avoid heavyweight BPM in Wave 1 |
| ADR-0003 | Audit-trail hash-chain design | Per-row chain vs. periodic anchoring; verification routine |
| ADR-0004 | Entity-scoping enforcement | PostgreSQL RLS strategy; how user scope maps to policies |
| ADR-0005 | Governed extension storage | JSONB + central field catalog; validation approach |
| ADR-0006 | Deployment & residency topology | Per-region deployment for data-residency jurisdictions |
| ADR-0007 | Identity provider | Self-hosted (Keycloak) vs. managed IdP |
| ADR-0008 | AI agent architecture | Self-built retrieval vs. Copilot Studio integration vs. hybrid per region (`14`) |
| ADR-0009 | AI processing location & model-agnostic inference interface | Sovereignty control — where inference happens is a compliance decision, not a vendor preference (`14`) |

Add ADRs as new foundational decisions arise. Do not make these silently in code.

> **ADR-0006 is blocking for M0.** China is in scope, so PIPL data localisation is a
> hard day-one requirement — the deployment topology cannot be deferred until after
> the data model is built. See `03-multi-entity-and-jurisdiction.md`.

## ADR template

**Canonical template: [`../14-adr/0000-TEMPLATE.md`](../14-adr/0000-TEMPLATE.md).**
Save new ADRs as `docs/14-adr/NNNN-short-title.md` and add a row to
[`../14-adr/README.md`](../14-adr/README.md).

The template requires four blocks:

| Block | What it must contain |
|---|---|
| **Context** | The problem and the constraints that apply (security, residency, scope) |
| **Options** | **At least 2** — if there is only one, this is not a decision |
| **Decision** | What was chosen and why **in our situation** (「because it's best practice」is not a reason) |
| **Consequences** | What cost was accepted **+ the falsifiability condition** ⭐ |

> ⭐ **Falsifiability — what observation would overturn this decision?**
> The most-skipped and most-important section. An ADR without it is an
> unfalsifiable statement of faith, not an engineering decision.

**This project adds a fifth required block:**

| Block | What it must contain |
|---|---|
| **Security & compliance impact** | How the decision affects the 9 guardrails in `CLAUDE.md`, and specifically: entity-scoping (g4), audit-trail integrity (g5), and data residency (g8). An ADR that weakens any of these must say so explicitly rather than omitting it. |
