# GRC Platform — Foundation & Backbone

An internally built, multi-entity, multi-jurisdiction **Governance, Risk & Compliance (GRC)** platform for a regional IT office serving APAC subsidiaries.

> **Central tenet — the platform must not itself be a source of risk.**
> This is a system that manages security and risk. If the platform is itself insecure, fragile, or unauditable, it has no credibility. Every architectural and implementation decision in this repository is therefore held to the same standards the platform is designed to enforce. See [`docs/04-security-by-design.md`](docs/04-security-by-design.md). This is non-negotiable.

## Current phase

Planning & architecture for the **Wave 1 backbone** — the shared foundation on which all future modules are built. The single most important artifact is the **core data model** ([`docs/02-core-data-model.md`](docs/02-core-data-model.md)); it is the heart of the system and the most common reason self-built GRC systems fail when it is done poorly.

## Confirmed context

| Parameter | Decision |
|---|---|
| Build orientation | **Internal build** (not vendor selection) |
| Audience | **Multi-entity, multi-jurisdiction single group** — regional IT office serving APAC subsidiaries (not external multi-tenant SaaS) |
| Industry | **Technology & services** |
| Jurisdictions | NE Asia (JP/KR/CN/HK/TW) + SE Asia (SG/MY/TH/ID/PH/VN) + Oceania (AU/NZ); India excluded. **China in scope → PIPL residency is a hard requirement.** |
| Primary driver | **Internal governance & visibility** — the cross-entity roll-up dashboard is the flagship deliverable |
| Target users | Full Three Lines + management (audit deferred to Wave 2) |
| Sequencing | **Foundation-first** — backbone before modules |

All kickoff prerequisites are confirmed; see [`docs/00-project-charter.md`](docs/00-project-charter.md). Backbone implementation can proceed in parallel with deepening the functional-module design.

## Repository structure

```
grc-platform/
├── README.md                              You are here
├── CLAUDE.md                              Project context & guardrails for Claude Code — read first
└── docs/
    ├── 00-project-charter.md              Vision, confirmed decisions, open items, principles
    ├── 01-architecture-overview.md        Layered architecture, backbone components, deployment
    ├── 02-core-data-model.md          ★   The heart: entities, relationships, ERD, taxonomy rules
    │   └── 02a-data-model-spec.md          Field-, enum-, and lifecycle-level detail (build follows this)
    ├── 03-multi-entity-and-jurisdiction.md  Org hierarchy, entity-scoping, data residency, obligation matrix
    ├── 04-security-by-design.md       ★   The credibility tenet: secure-by-design, self-governance, threat model
    ├── 05-platform-foundation-services.md   RBAC, workflow engine, audit trail, integration/API
    ├── 06-tech-stack-and-decisions.md     Recommended stack + open architecture decisions (ADRs)
    ├── 07-wave1-build-plan.md             Wave 1 build sequence, definition of done, Claude Code milestones
    ├── 08-rollup-dashboard-spec.md         Flagship dashboard: layout, metrics, RAG thresholds, data needs
    ├── 09-ui-design-brief.md               UI design brief to hand to Claude Design (screens, patterns, visual direction)
    ├── 10-wave2-compliance-and-obligations.md  Wave 2: compliance module + obligation-content strategy
    ├── 11-security-incident-module.md      Security incident form, severity SLAs, workflow (Wave 2)
    ├── 12-supplier-management-module.md    Supplier / TPRM lifecycle from the source documents (Wave 2)
    ├── 13-isms-profile-module.md           Per-entity ISMS profile + approved OP/OS offerings (Wave 1)
    ├── 14-ai-agent.md                      Conversational AI agent + sovereignty constraint (Wave 3)
    ├── 15-design-alignment.md          ★   Delta vs. the design handoff — read before building UI
    ├── 16-secure-development-dod.md    ★   28-point secure-development DoD from our own scan results
    └── adr/                               Architecture Decision Records
└── reference/                             Source artifacts (confidential — see reference/README.md)
```

## How to use this with Claude Code

1. Open this folder as a Claude Code project.
2. Claude Code will read `CLAUDE.md` automatically — it encodes the non-negotiable guardrails and conventions for all work in this repo.
3. Read the `docs/` in numerical order. `02` and `04` are the load-bearing ones.
4. Start implementation from [`docs/07-wave1-build-plan.md`](docs/07-wave1-build-plan.md), which sequences the backbone build and maps it to milestones.
5. Record every significant technical decision as an ADR in `docs/adr/` (template provided in `06`).

## Language convention

- **Code, comments, and technical documents:** English.
- **End-user-facing text, UI copy, and end-user documentation:** Traditional Chinese (繁體中文).

## Disclaimer

This repository is planning and technical guidance. It is **not legal or compliance advice**. Specific regulatory obligations per jurisdiction must be confirmed with qualified Legal / Compliance / Security subject-matter experts.
