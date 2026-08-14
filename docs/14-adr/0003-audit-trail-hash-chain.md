# ADR-0003: The audit trail is a per-row hash chain computed by a database trigger, fed by an application-layer interception point

**Date**: 2026-08-14
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: W12

---

## Context

`decision-form.md` OQ-4 has been open since 2026-08-07. `14-adr/README.md:106` deferred it with a
specific reason rather than a vague one: the criterion is **write throughput**, and with zero code
there was nothing to measure. That condition stopped holding several phases ago — twenty tables,
172 integration tests and a real PostgreSQL — and nobody went back to look.

Three things make it due now rather than merely possible.

- **guardrail 5** requires every state change to reach an append-only, tamper-evident log. Before
  this phase, **not one write in the system was audited**.
- **`RISK_REGISTER` R4** grew every phase without a gate ever objecting: W02 two tables → W11
  **eighteen**, none audited. The register entry says so about itself.
- **`07` §Security gate** says no milestone is done until "every state change is audited", which
  made **M1's definition of done unreachable** regardless of how many tables were built.

W12 was the spike. This records what it decided; the measurements are in
`docs/02-architecture/design-notes/W12-audit-trail.md` and the raw numbers in the phase's
`progress.md`.

---

## Options

Two were implemented as real write paths and measured. The third is derived from the other two and
**was not built** — stated plainly rather than presented as if it had been.

| Option | Where the hash is computed | 優點 | 缺點 |
|---|---|---|---|
| **A** — per-row chain | **PostgreSQL, `BEFORE INSERT` trigger** | Every row links to its predecessor; tampering is localised to **one row**; the application cannot get it wrong or skip it; one clock | Serialises writes per entity (advisory lock); hash logic lives in PL/pgSQL |
| **B** — periodic anchoring | **The API process (V8)** | Cheaper writes under contention; no lock, no read-before-write | Tampering localises only to a **segment of N rows**; the hash is whatever the application says it is; the timestamp is the application's clock, and several instances have several clocks |
| **C** — hybrid | Both | Would combine A's linkage with B's anchors | ⚠️ **NOT IMPLEMENTED.** Its write cost is A's (it is A plus periodic anchors) and its verification cost falls between A and B — and verification cost was measured to have no signal, so C buys nothing measurable over A while adding a second mechanism |

⛔ **A and B are not one quantity measured twice.** A hashes in PL/pgSQL inside the database; B
hashes in V8 in the API process. The numbers below support the *shape* of the difference, not
arithmetic between them.

---

## Decision

**Adopt A.** Additionally, and on a separate axis:

- **The interception point is an application-layer hook** in the entity-scope client extension,
  reached through `contracts/audit-hook.ts` so neither scope imports the other.
- **The audit row is enlisted in the same transaction as the domain write**, so the two commit
  together or not at all.
- **A write that cannot be attributed to an entity does not happen** — the recorder throws and the
  transaction is never built.
- **Append-only is enforced twice**: `SELECT, INSERT` only in the GRANT, and no `FOR UPDATE` or
  `FOR DELETE` policy at all.

The split is deliberate and worth naming: **the application decides WHAT is recorded; the database
decides THAT it is linked.**

### Why A, from the measurements

1. **Sequentially the two are indistinguishable.** Both add ~2–3 ms to a ~37 ms write (~7%). Across
   two runs the ordering of A and B *flipped*, and the difference sat inside the control drift. So
   "A costs more" is simply **not supported** for uncontended writes.
2. **Under contention A costs 1.6× B, and that reproduces.** Eight writers on one entity: A's p50
   overhead 41.6 ms and 26.1 ms across two runs; B's 25.6 ms and 16.4 ms. Ratios **1.63** and
   **1.59**. ⚠️ A sequential benchmark cannot see this at all — a lock nobody contends costs
   nothing — which is why the concurrency measurement was added.
3. **Most of the cost is auditing at all, not the strategy.** B is already 16–26 ms above the
   control; A is a further 10–16 ms above B. The first decision is whether to audit; the second is
   comparatively cheap either way.
4. **Verification cost has no signal.** B/A ranged **0.84–1.20** across two runs, and at 10 000 rows
   the *shared* fetch (714–753 ms) dominates the walk (249–279 ms). One of the two cost dimensions
   this phase set out to compare turned out not to discriminate — that is a result, and it removes
   B's expected advantage there.
5. **A localises tampering to a row; B to a segment.** Pinned as a test, not described as a caveat
   (`verify.spec.ts`: the same edit that A names at index 1, B can only place inside the anchor at
   index 3). For a log an auditor reads, "one of these hundred rows changed" is a materially weaker
   statement.
6. **A cannot be got wrong from TypeScript.** The trigger runs on every insert into the table,
   including inserts B's path would make. B's hash is whatever the application computed — a bug
   there produces a chain that verifies perfectly over wrong content.

### 否決其他選項的理由

**B** — rejected on 5 and 6, not on cost. Its cost advantage is real but bounded (10–16 ms under
8-way single-entity contention, nothing measurable sequentially), and it buys that with a weaker
tamper localisation and a hash the application is trusted to compute correctly. On a table whose
entire purpose is being trustworthy, that is the wrong trade.

**C** — rejected as unmeasurable gain. Its only advantage over A would be cheaper verification, and
verification cost was measured not to discriminate. Adding a second mechanism for a benefit that
does not show up in the numbers is AP-5.

---

## Consequences

### 我們接受了什麼

- **Writes to an audited entity serialise.** `pg_advisory_xact_lock` per entity, held inside the
  domain write's transaction. Measured cost under 8-way contention on ONE entity: +26 to +42 ms p50
  on a ~130 ms baseline. Entities do not contend with each other.
- **`occurred_at` is `TIMESTAMPTZ(3)`, alone in this schema.** The hash covers it, and a JavaScript
  `Date` holds milliseconds — at (6) every row recomputes to a different hash from outside the
  database, which would make `verify` an alarm that is always on. Two audit rows may now share a
  timestamp; nothing depends on them not doing so.
- **The chain is per-entity, not global.** A `SECURITY INVOKER` trigger sees only rows the caller's
  policies admit, and every function in this schema is `SECURITY INVOKER` for a reason
  (`20260809171812:25`). A global chain would make each entity's log depend on rows it must not be
  able to read. Measured, not assumed: HK1's first row starts at genesis rather than continuing
  SG1's chain.
- **`before` is always NULL and `after` is the REQUESTED payload, not the stored row.**
  `runScoped` hands `$transaction` an array of unstarted promises, so nothing in the audit row can
  depend on the write's result. The single statement that *would* capture true before/after is an
  `INSERT ... SELECT` naming the domain table — precisely what `eslint.config.mjs:75-77` forbids the
  `audit-trail` scope, for precisely the stated reason.
- **`resource_id` is unavailable on a create.** Prisma assigns the id after this point; a
  server-issued `ref_code` stands in, which covers every module here but is a convention.
- **Raw queries are not audited.** `$queryRaw` has no model name and is invisible to the hook. A
  named hole, not an oversight; closing it needs statement parsing.
- **One module is connected.** `AUDITED_MODELS` holds exactly one name. Connecting the other ten is
  a change to that line — and the table-level coverage that buys is **1 of 21**, not 1 of 19 as an
  earlier draft of this ADR said (see Security & compliance impact).

### 這個決定約束了什麼

- **ADR-0004's claim survives, through a layer it never mentioned.** `0004:85 / :120 / :132` say
  three times that the interception point sits inside the same client extension as entity scoping.
  It does — but only via `contracts/audit-hook.ts`, because the boundary matrix forbids
  `entity-scope → audit-trail` and `audit-trail → core-model` in both directions. Anyone reading
  ADR-0004 alone would try the direct call and find it mechanically refused.
- **`ScopedPrismaFactory` takes the hook OPTIONALLY, and that is a fail-open.** Requiring it would
  break eleven integration suites that compose a single module. What compensates is that
  `audit.int.spec.ts` composes `AppModule`, so removing the import turns it red — verified by
  actually removing it (N2: 10 of 12 tests failed).
- **Append-only holds twice but speaks once.** Measured by restoring the UPDATE grant alone: the
  GRANT raises `42501`; the absent policy silently affects **zero rows**. Both refuse. ⚠️ A blanket
  `GRANT ALL ON ALL TABLES` would leave append-only intact and **mute**.

### 可證偽條件 ⭐

Each is observable and re-runnable today. `bench.int.spec.ts` is the instrument for FC1 and FC2.

| # | 條件 | 現況（2026-08-14）| 觸發時 |
|---|---|---|---|
| **FC1** | A's p50 write overhead exceeds **2×** B's under 8 concurrent writers on one entity, in `bench.int.spec.ts` | **1.63 / 1.59** across two runs | Revisit A. The per-entity lock is the suspect; B or C becomes the candidate |
| **FC2** | Verifying ONE entity's chain takes **> 60 s** | 10 000 rows ≈ 1.0 s end to end (fetch + walk), linear ⇒ ~600 k rows | The linear per-entity walk is no longer adequate ⇒ implement C's anchors as checkpoints |
| **FC3** | Any requirement needs the **true prior state** in `before` (an update's real old values, per `05:22`) | Not required by any built feature | The application-layer interception cannot supply it. Move the audit WRITE into a per-table trigger, which sees `OLD`/`NEW` for free |
| **FC4** ⭐ | A write arrives under a scope naming **more than one entity** with no `orgEntityId` in its payload | Cannot happen — no roll-up endpoint exists until M8 | `UnattributableWriteError` is raised and the write is refused. **This condition fires by construction**, loudly, the first time a roll-up write is attempted |
| **FC5** | `chain.spec.ts`'s PostgreSQL vectors stop matching | 25/25 green against PostgreSQL 18.4 | The shared hash definition has broken — jsonb rendering, `sha256`, or timestamp formatting moved. Nothing outside the database can verify A's chain until it is restored |

⚠️ **FC1 and FC2 require strategy B to remain in the repository.** `AuditLogRecorder`'s `app-chain`
mode is production code that nothing in production selects, which is AP-1's shape. It is kept for a
stated, current purpose — it is the baseline these conditions are measured against — and **not**
because it might be useful later. ⛔ If FC1 and FC2 have not been re-measured by the end of Wave 1,
delete B and rewrite these two conditions in absolute terms.

### Rollback

The table is additive and the trigger is one function plus one trigger. Reverting to B is:
`DROP TRIGGER audit_log_chain`, switch `AuditModule`'s recorder to `'app-chain'`, and add anchor
writing (not built). Rows written under A remain verifiable by `verifyChain`; rows written under B
would need `verifyAnchoredChain`. **A mixed table cannot be verified by either routine**, so a
switch needs a cut-over marker row — not built, and a reason to decide once rather than twice.

---

## Security & compliance impact

- **guardrail 5** gains its first mechanism. ⚠️ **Coverage is 1 of 21 tables** — the mechanism
  exists; the coverage does not. R4 must be read as "first mitigation", never as "resolved".
  ⛔ 21 is derived (`schema.prisma`'s `^model` count minus `audit_log` itself, cross-checked
  against `CREATE TABLE` summed over every migration). **R4's own hand-maintained counter said
  18** and was wrong by three — `AD-RiskTableCountManual-1`, landing on the failure it predicted.
- **guardrail 2 (self-governance)** — the platform can now demonstrate its own log's integrity on
  demand, and name the first row that fails rather than answering with a boolean.
- **02a:311's reconciliation of the erasure right holds**: `actor_id` is pseudonymous with no
  foreign key to `users`, so a data-subject erasure cannot leave a provably intact chain over
  content that no longer says what it said.
- ⚠️ **Personal data can still reach the log through `after`**, because it carries whatever the
  caller wrote. That constraint belongs to the modules; this table cannot enforce it, and guardrail
  5 forbids editing it out afterwards.
- **`05:24`'s "a write path that no domain write can bypass"** is satisfied *within the wired
  application*. It is not absolute: an unwired module, or a raw query, records nothing. The absolute
  form is a trigger per domain table (see FC3).

---

## 相關

- `docs/02-architecture/design-notes/W12-audit-trail.md` — the measurements and how they were taken
- `docs/03-implementation/changes/CH-029-w12-audit-trail.md` — what shipped
- `docs/02-architecture/05-platform-foundation-services.md:18-24` — the four properties required
- `docs/rules-on-demand/multi-tenant-data.md` §稽核軌跡 — the field list this table implements
- **ADR-0004** — the client extension this hooks into, and the claim that needed a contract layer
- **ADR-0014** — "an absent policy is stricter than a narrow one", now with a measurement: stricter,
  and quieter
