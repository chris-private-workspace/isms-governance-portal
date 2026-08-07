# ADR-0001: Backend is NestJS + Prisma in a monorepo alongside the Next.js frontend

**Date**: 2026-08-07
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: 無 —— `CH-005`

---

## Context

M0 cannot start without this. `07-wave1-build-plan.md:31` makes ADR-0001 part of M0's definition of
done; `CLAUDE.md` §Scopes has all eight scope directories reading `⚠️ 待 ADR-0001`; §Development
Commands is empty. No table can be created and no directory named until this settles.

`06-tech-stack-and-decisions.md:19` framed the choice as an abstract trade-off — "a framework with
strong built-in auth, permissions, admin, ORM and record history" versus "end-to-end type sharing
with a TypeScript frontend". That framing omitted the decisive input: **the organisation already
runs three projects**, and four of their five layers are already uniform.

| | `ai-enterprise-knowledge` | `unified-operation-platform` | `ai-document-extraction` |
|---|---|---|---|
| Shape | `backend/` + `frontend/` | **monorepo** `apps/api` + `apps/web` | Next.js full-stack |
| Backend | FastAPI (Py 3.12) | **NestJS 10** + `@nestjs/swagger` | Next.js route handlers |
| Data | psycopg3, no ORM | Prisma 6 | Prisma 7 + `@prisma/adapter-pg` |
| Frontend | Next.js · Tailwind · shadcn | `apps/web` | Next.js 15 · Tailwind · shadcn |
| IdP | Entra ID | Entra ID | next-auth v5 |
| Cloud | Azure | Azure | Azure |

**Already standardised: frontend, PostgreSQL, Entra ID, Azure. Only the backend framework differs.**

Binding constraints from this project specifically:

- **guardrail 4** — entity-scoping enforced at the **database** layer (RLS), not application-only
- **guardrail 5** — append-only hash-chained audit trail that **no domain write can bypass** (`05:24`)
- **`05:33` API-first** — "the UI is just another client", because three consumers need that API:
  the connector framework (`05:34`), the Wave 3 agent's entity-scoped retrieval (`14:22`), and
  **cross-region roll-up, which is inter-process by construction** under ADR-0006
- **已確認參數 13** — six roles × eleven modules enforced server-side at nav / route / action layers
- **CLAUDE.md §Scopes** — eight scopes that must not cross-import
- Single developer; per-region deployment multiplies every operational cost by region count

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** Django + DRF | Strongest longevity (DSF, 20 yrs); ORM signals give a *framework-level* audit interception point; admin covers reference-data CRUD free | Built-in permissions are model-level CRUD only — object-level is ignored by `ModelBackend`, so 六角色 × entity scope is self-built anyway; **fourth backend stack** in the estate; two languages | High — new stack to learn and maintain |
| **B** NestJS 10 + Prisma 7 | Converges on an existing internal deployment; module boundaries map onto the eight scopes; `@nestjs/swagger` is the API-first contract layer; one language with the frontend; shared types package | Smaller maintainer team than Django/Spring/.NET; RLS needs a client-extension wrapper, not out of the box | Low — already running in `unified-operation-platform` |
| **C** Next.js as full-stack backend | Fewest moving parts; matches `ai-document-extraction` | Server Actions **remove** the API layer `05:33` requires; Edge middleware cannot open a TCP connection to PostgreSQL, so route-layer permission checks scatter; no framework-level write interception | Low upfront, high at M3/M8 |
| **D** FastAPI | Also an existing asset; light; precise session control suits RLS | `ai-enterprise-knowledge` runs it **without an ORM** (connection-per-op psycopg3) — this project's core is a graph of 19+ entities and 14 many-to-many relationships (`02:40`), which is the case an ORM exists for; still two languages | Medium |

---

## Decision

**選 B — NestJS 10 + Prisma 7 (`@prisma/adapter-pg`), monorepo `apps/api` + `apps/web` +
`packages/types`.**

Because this estate already standardised four layers and left exactly one open, the question is not
"which framework is best" but "**do we converge or add a fourth stack**". NestJS is the only
existing backend whose shape matches what this project needs: separated front and back, an explicit
API surface, and Swagger already wired — the three things `05:33` demands and that cross-region
roll-up makes non-optional.

Two secondary fits that are specific to this project rather than general merit:

- **NestJS modules give the eight scopes a mechanical boundary.** `CLAUDE.md` §Scopes forbids
  cross-scope imports; module + `eslint-plugin-boundaries` makes that a build failure rather than a
  review convention. Django would enforce it by directory discipline plus a custom detector.
- **One type definition instead of two.** 19+ entities, the six-role × eleven-module matrix, and the
  nine fixed `posture_snapshot` metric keys (`03:72`) are shared by both sides. A Python backend
  means OpenAPI codegen that goes stale and must be gated in CI.

### 否決其他選項的理由

- **C (Next.js as backend)** — its core value proposition is removing the API layer, and this
  project's architecture requires that layer for three named consumers. Writing only route handlers
  would keep the API but discard everything Next.js offers over Express. Separately, Edge-runtime
  middleware cannot query the database, so 參數 13's route-layer enforcement would scatter across
  every handler.
- **A (Django)** — its two real advantages shrink under inspection. The permission system is
  model-level CRUD; entity scope is delivered by RLS regardless of framework. Admin covers reference
  data, but of the Wave 1 tables only ~3–4 (threat library, vulnerability library, assessment
  templates, obligations) need a maintenance UI — the static ones (Annex A's 93 controls, 12
  jurisdictions, six asset classes) load by data migration. That leaves longevity as the sole
  remaining advantage, bought at the price of a fourth stack.
- **D (FastAPI)** — an existing asset, but the reference implementation runs ORM-less against a flat
  document store. Rebuilding a 19-entity relational graph that way is the wrong shape, and it keeps
  the two-language cost without the type-sharing benefit.

---

## Consequences

### 我們接受了什麼

- **Weaker governance than the alternatives.** NestJS is maintained by a small team, not a
  foundation (Django/DSF) or a vendor LTS (Spring, .NET). For a platform with a 5–10 year expected
  life this is a real risk, accepted knowingly — see 可證偽條件 #2. The mitigating fact is that
  divergence itself is a support risk, and this estate already carries it.
- **RLS is not out of the box.** Prisma requires a client extension wrapping every query in
  `$transaction` + `set_config('app.entity_scope', …, true)`. That wrapper must be written and
  proven; it is not a framework guarantee.
- **No free admin.** ~3–4 reference tables need a maintenance UI built by hand.
- **npm's supply-chain surface is deeper than PyPI's.** Mitigated by lockfile pinning plus the SCA
  gate guardrail 7 already mandates, but the transitive dependency depth is accepted.

### 這個決定約束了什麼

- **Every database access goes through the Prisma client extension.** Raw `$queryRaw`, migration
  scripts and Prisma Studio bypass it; CI must detect those paths mechanically, not by review.
- Repository shape is fixed: `apps/api` · `apps/web` · `packages/types`.
- PostgreSQL is confirmed (already the strong recommendation at `06:18`) — the RLS mechanism above
  has no equivalent elsewhere.
- Scope boundaries are enforced by NestJS modules; `CLAUDE.md` §Scopes directories follow that shape.

### 可證偽條件 ⭐

1. **The load-bearing assumption is that one Prisma client extension can satisfy guardrails 4 and 5
   simultaneously. It has not been tested.** If the W01 spike shows any write path that bypasses the
   extension *and* cannot be caught mechanically in CI, then entity-scoping or audit completeness is
   unenforceable and this decision must be reopened — replacing Prisma with Drizzle/Kysely first,
   and only then reconsidering the framework. ADR-0004 carries that verification.
2. If NestJS ships no security release for **12 consecutive months**, the longevity risk accepted
   above has materialised.
3. If group IT mandates a backend standard (e.g. .NET), organisational convergence — the entire
   basis of this decision — points elsewhere and this ADR is superseded.

### Rollback

- **NestJS → another TypeScript framework** (Fastify + hand-rolled DI): ~3–5 days. Business logic
  lives in plain service classes; only the DI wiring and decorators are framework-specific.
- **NestJS → Python**: effectively a rewrite. Not a rollback.
- **回滾窗口**: cost rises sharply after **M3**, because the audit hash-chain's interception point is
  implemented inside the Prisma extension. Before M3 the exposure is schema plus scaffolding.

---

## Security & compliance impact

*(This project's mandatory fifth block — `06:70`. An ADR that weakens any guardrail must say so.)*

| Guardrail | Effect |
|---|---|
| **g4 — entity-scoped, DB-enforced** | ⚠️ **Depends on an unverified mechanism.** Prisma abstracts connection handling; the extension wrapper restores the per-request control RLS needs. Stated as design intent, verified by ADR-0004. `decision-form.md` OQ-3's documented-downgrade rule applies if it fails. |
| **g5 — tamper-evident audit trail** | ⚠️ Same mechanism, same verification. Weaker than Django's ORM signals, which are framework-level. Accepted because the extension covers both guardrails at once; rejected as acceptable if #1 above fires. |
| **g8 — privacy & residency** | Neutral-to-positive. A containerised Node service deploys unchanged into any region including Azure China (ADR-0006). No framework component pins processing to a geography. |
| **g7 — secure SDLC** | Positive on tooling (one SCA/SAST/SBOM chain instead of two, multiplied across regions), negative on surface (npm transitive depth). Net accepted with pinning + SCA gate. |
| **g1 — the platform must not be a risk source** | NestJS and Prisma are both widely deployed and actively maintained. The residual concern is dependency depth, tracked as a supply-chain risk per `04:74`. |
| **g3 — canonical core** | Neutral. Prisma schema is a single declarative source; governed extensions land in JSONB per ADR-0005. |

---

## 相關

- **實作**: `CH-005` · unblocks M0 (`07:31`) → M1
- **相關 ADR**: ADR-0006 (topology — decided together) · ADR-0007 (IdP) ·
  **ADR-0004 verifies this ADR's load-bearing assumption** · ADR-0003 · ADR-0005
- **關閉**: `decision-form.md` OQ-2
- **上游**: `06-tech-stack-and-decisions.md` §Recommended stack · `05-platform-foundation-services.md`
