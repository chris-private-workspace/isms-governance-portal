# CH-029 — The audit trail, and the difference between refusing and saying so

**Type**: Change (phase-produced record — W12, audit-trail spike)
**Status**: Closed（PR pending）
**Created**: 2026-08-14
**Phase**: [W12](../../01-planning/W12-m3-audit-trail-spike/plan.md)

---

## Problem

guardrail 5 requires every state change to reach an append-only, tamper-evident log. Before this
phase, **not one write in the system was audited** — nineteen business tables, 172 integration
tests, zero audit rows.

Three consequences were already on file, and each is worse than a missing feature:

- `evidence` (W07) exists **for the purpose of** evidence-grade claims, and writing to it left no
  trace.
- `Issue.status = risk_accepted` is a formal acceptance of risk. It was an enum value with no
  signature.
- W11's `applicable = false` on a Statement of Applicability row is a formal **control exclusion** —
  the thing an ISO 27001 auditor reads first — writable by anyone, at any time, for any stated
  reason, with `created_by` permanently NULL.

`RISK_REGISTER` **R4** had grown every phase since W02 without any gate objecting, and the register
row says so about itself. And `07` §Security gate holds that no milestone is done until "every
state change is audited", which made **M1's definition of done unreachable** no matter how many
tables were built.

## Root cause

Not a defect — an unbuilt slice whose gate had already opened without anyone noticing.

`14-adr/README.md:106` deferred **OQ-4** with a *specific* reason rather than a vague one: the
criterion is **write throughput**, and with zero code there was nothing to measure. That is a good
deferral. What was missing is the other half — **nothing was watching for the condition to stop
holding**. It stopped holding several phases ago.

So the root cause is structural: a deferral whose unblocking condition is real, checkable, and
**unowned**. `decision-form.md:19` also had "誰能決定" as ⚠️ 未指定, so nobody was going to be asked
either.

## Solution

One table, one trigger, two chain strategies measured against each other, a contract layer, and
exactly one module connected.

| File | Type | Note |
|------|------|------|
| `prisma/schema.prisma` | edit | `model AuditLog` (22 models) |
| `migrations/20260814065711_audit_log/migration.sql` | new | **hand-written** — the checksum drift from `CH-028` still blocks `migrate dev` |
| `contracts/audit-hook.ts` | new | `AuditHook` + `AUDIT_HOOK` (`:76`, `:99`) — **zero imports**, which is the whole point |
| `audit-trail/chain.ts` · `.spec.ts` | new | shared canonical payload + strategy B; 25 unit tests |
| `audit-trail/verify.ts` · `.spec.ts` | new | `verifyChain` / `verifyAnchoredChain`; 17 unit tests |
| `audit-trail/audit.recorder.ts` · `.spec.ts` | new | the hook implementation, both `ChainMode`s; 27 unit tests |
| `audit-trail/audit.module.ts` | new | `@Global`; `AUDITED_MODELS` is **one name** (`:38`) |
| `audit-trail/audit.int.spec.ts` · `bench.int.spec.ts` | new | 12 + 3 integration tests |
| `entity-scope/scoped-prisma.provider.ts` · `.spec.ts` | edit | `runScoped` takes an audit thunk; the row joins `$transaction` at `:111` |
| `bootstrap/app.module.ts` | edit | `+AuditModule` (`:63`) |
| `docs/14-adr/0003-*.md` · `decision-form.md` · `14-adr/README.md` | new / edit | OQ-4 closed |

**Five decisions worth re-reading before changing any of this:**

1. **The trigger is `BEFORE INSERT`, and append-only is why.** An `AFTER` trigger cannot modify
   `NEW`, so storing the hash would require an `UPDATE` — against a table that deliberately has no
   UPDATE grant and no UPDATE policy. **The two designs are mutually exclusive**: a chain written by
   an `AFTER` trigger needs exactly the privilege append-only exists to withhold. Plan and checklist
   both said `AFTER INSERT`; the original text is kept, unedited, beside the correction.

2. **`occurred_at` is `TIMESTAMPTZ(3)` and every other timestamp in this schema is `(6)`**
   (`migration.sql:30`). At (6) the stored value is microseconds, a JavaScript `Date` holds
   milliseconds, and the hash covers the timestamp — so **every row would recompute to a different
   hash from outside the database**. `verify` would have been an alarm that is always on, and no
   gate would have caught it: the chain is self-consistent inside PostgreSQL and the tests would
   pass. Measured that (3) **rounds** rather than truncates, so both writers land on the same
   millisecond boundary.

3. **The interception point goes through a contract, because the boundary matrix forbids the direct
   call in both directions.** `eslint.config.mjs:74` denies `entity-scope → audit-trail`, `:78`
   denies `audit-trail → core-model`. ADR-0004 says three times that the interception point lives
   inside the entity-scope client extension — and it does, but only via `contracts/audit-hook.ts`.
   ⛔ The MATRIX was not touched; it guards `CH-012`'s standing negative fixture.

4. **The recorder omits the `before` key rather than writing `null`, and a CHECK constraint makes
   the alternative impossible** (`migration.sql:75-78`). Prisma returns JavaScript `null` for **both**
   SQL NULL and JSON `null`, so a verifier cannot tell them apart — the fix is not more branching,
   it is making the ambiguous state unrepresentable. The constraint was verified independently by
   inserting `'null'::jsonb` directly and watching it refuse.

5. **`AUDITED_MODELS` holds one name.** Connecting the other ten modules is an edit to that line;
   this phase deliberately connected one, because the deliverable was **numbers**, not coverage.

**Load-bearing detail that looks small:** `GRANT USAGE ON SEQUENCE "audit_log_id_seq"`
(`migration.sql:132`). Every other table here uses a client-generated UUID, so this is the first
migration in the repo that needs it at all — INSERT on a table does not confer `nextval`.

## Verification

⛔ **gate-only verified.** No user-facing surface, so no drive-through was performed and nothing
here should be read as a statement about usability.

**Gates** (十一項, each taking its own exit code, never a `$?` inherited from a pipeline; re-run
after Day 3's neutralisations were restored):

| Gate | Result |
|---|---|
| api unit | **451 / 38 suites** (from 376 / 35) |
| api int | **187 / 15 suites** (from 172 / 13) |
| web | 10 / 1 |
| format · lint · type-check · build · `lint:negative` | 0 · 0 · 0 · clean ×2 · PASS |
| coverage | **92.27 / 91.66 / 98.95 / 93.64** — **all four above baseline** (91.83 / 91.01 / 97.5 / 93.29) |
| `run_all.py` | **8 / 8** |
| `check_entity_index` | **21 / 35** (from 20 / 35) |

⭐ Coverage rising on all four is a first in several phases — and it happened **because the gate
went red first**. See below.

**Measurement — A vs B on two cost axes, predictions committed (`5956711`) before the benchmark
ran.** Single-machine Docker on Windows, one entity, `n=200` per group, two independent runs;
these are evidence of *relative* shape, not production numbers.

| | run 1 | run 2 |
|---|---|---|
| sequential write overhead p50 (A / B) | +2.636 / +1.840 ms | +2.442 / **+2.874** ms |
| **8-way single-entity** overhead p50 (A / B) | +41.638 / +25.577 ms | +26.117 / +16.413 ms |
| **A / B ratio under contention** | **1.63** | **1.59** |
| verification walk, 10 000 rows (A / B) | 278.9 / 235.2 ms (**0.84**) | 249.1 / 249.4 ms (**1.00**) |

Three results the ADR is built on: **sequentially the two are indistinguishable** (the ordering
flipped between runs and the gap sits inside the control drift); **most of the cost is auditing at
all**, not the strategy (B is already 16–26 ms over the control, A a further 10–16 ms over B); and
⛔ **verification cost has no signal** — one of the two axes the phase set out to compare turned
out not to discriminate, which removes B's expected advantage there.

🚩 **The first benchmark said auditing makes writes faster.** Inserting an extra row cannot do
that, so the instrument was wrong, not the finding: three groups run in sequence each build their
own `TestingModule` and therefore their own connection pool, and the ~4 ms warm-up bias exceeded
the ~2 ms effect. Rewritten to **interleave**, plus two built-in instrument checks — the control
group's writes must leave `audit_log` unchanged and the audited group's must add exactly one, and
the control drift is printed beside every reported overhead.

⭐ **The concurrency measurement was not in the plan.** A's whole cost is a per-entity advisory
lock, and **a single-threaded benchmark cannot see it** — an uncontended lock is nearly free. That
axis is where the decision was actually made.

**Meta-verification — four neutralisations, 4/4 on direction**, written down and committed
(**`aec77f2`**) before any of them ran. Every one is a *permit*, not a deletion.

| N | Neutralised | Predicted red | Measured |
|---|---|---|---|
| N1 | trigger stops linking (`prev_hash` always genesis) | 4 | **4, exactly those** |
| N2 | `AuditModule` removed from `app.module.ts` | 5 + bench instrument | **7 + bench** |
| N3 | UPDATE grant restored | 1 | **1, exactly that one** |
| N4 | SELECT policy → `USING (true)` | 5 | 5, **but one wrong member** |

⭐⭐ **N3 answered the question this repo has got wrong twice.** W10 claimed the policy refuses
cross-entity writes and was wrong; W11 claimed a `WITH CHECK` does and was wrong. With the grant
restored the test reported `Received: "NO ERROR"` — ⛔ and *no error* is not *no change*, so the
rows were counted rather than inferred: **7 rows visible** to that connection, `UPDATE 0`,
**0 rows changed**, `operation` unchanged. **Both layers refuse; only one of them speaks.** The
GRANT raises `42501`; the absent policy silently affects zero rows. ⚠️ A blanket
`GRANT ALL ON ALL TABLES` would leave append-only intact and **mute** — the hardest kind of defence
to notice has become the only one left. Written back into `migration.sql:104-124`.

🚩 **N2 found that the first of the four 約束-8 scope tests passes with auditing entirely off.**
`every()` is true and `some()` is false on an empty array, so "HK1 cannot see SG1's rows" and "there
are no rows" are the same observation — the shape W11 already recorded once. Non-empty preconditions
were added and **N2 re-run** (the step W10 and W11 each skipped): **7 red → 10 red**. The two still
green are correctly green — they exercise the database layer through a raw connection and a direct
client write, neither of which involves the hook.

🚩🚩 **The coverage red found something worth more than the coverage.** `audit.recorder.ts` was at
88.88% functions with 100% lines, and the uncovered function was the **`app-chain` branch** — which
means **nothing had ever asserted that strategy B writes a correct hash**, while B was about to be
used as the cost baseline for the whole decision. A benchmark asserts *time*, and time does not care
whether the writer is broken: an implementation that writes 32 zero bytes would have benchmarked
beautifully. Two tests were added — a unit round-trip and an integration one that recomputes from
the **stored** row, through PostgreSQL's jsonb normalisation and the (3) rounding rather than
around them.

⚠️ **N4's mechanism is measured; its break *kind* is derived.** Under N4 an SG1-scoped query does
return two entities' rows (measured: SG1 7 + HK1 2). But the predicted `foreign` verdict was never
observed at runtime — the failure output printed only `intact: false` — so it is inferred from
`verifyChain`'s ordering (`verify.ts:110`), which has its own unit test. Recorded as derived, not
measured. The prediction attached to the wrong test because **execution order inside the spec file
decides when the second entity's rows exist**, and the pairing was made semantically rather than
temporally.

**Verdict**: ⚪ N/A — pure backend, **gate-only verified**.

## Impact

- **Breaking change**: no. **Migration**: `20260814065711_audit_log`, additive; reversible by
  dropping one table, three functions and one trigger.
- **20 → 21 / 35** Wave-1 entities, mechanically derived by `check_entity_index.py`.
- **guardrail 5 gains its first mechanism.** ⚠️ **Coverage is 1 of 21 tables.** R4 moves to 🟡
  partial and must be read as "first mitigation" — never as resolved.
- ⛔ **Deriving that denominator corrected R4's own counter, which said 18.** Summing
  `CREATE TABLE` across every migration gives **21** (2·1·2·**5**·1·2·2·3·2·1): R4's hand-maintained
  chain **skips W03's `extension_fields` entirely** and records W05 as +3 when it created **five**
  tables (`threats` and `vulnerabilities`, the two global libraries, were dropped). This is
  `AD-RiskTableCountManual-1` landing for the first time, on the exact failure it described.
- **`07` §Security gate is now reachable** rather than satisfied. The gate says *every* state
  change; one module is connected.
- ⚠️ **`before` is always NULL and `after` is the requested payload, not the stored row.**
  `runScoped` hands `$transaction` an array of unstarted promises, so nothing in the audit row can
  depend on the write's result. The only statement that could capture true before/after is an
  `INSERT ... SELECT` naming the domain table — exactly what `eslint.config.mjs:75-77` forbids this
  scope, for the reason written there. **The boundary rule predicted this limit before it was hit.**
- ⚠️ **`resource_id` is unavailable on a create** — Prisma assigns the id after this point; a
  server-issued `ref_code` stands in, which covers every module here but is a convention.
- ⚠️ **Raw queries are not audited.** `$queryRaw` has no model name and is invisible to the hook.
  A named hole; closing it needs statement parsing.
- ⚠️ **`ScopedPrismaFactory` takes the hook `@Optional`, which is a fail-open**
  (`scoped-prisma.provider.ts:168`). Requiring it would break eleven integration suites that compose
  a single module. What compensates: `audit.int.spec.ts` composes `AppModule`, so removing the
  import turns it red — verified by removing it (N2).
- ⚠️ **Writes to an audited entity serialise** per entity (`pg_advisory_xact_lock`,
  `migration.sql:282`). Entities do not contend with each other.
- ⚠️ **Strategy B stays in the repository although the ADR rejected it** — it is the baseline FC1
  and FC2 are measured against. ⛔ If they have not been re-measured by the end of Wave 1, delete B
  and rewrite both conditions in absolute terms.

## Related

- [ADR-0003](../../14-adr/0003-audit-trail-hash-chain.md) — the decision, with five falsifiable
  conditions
- [W12 design note](../../02-architecture/design-notes/W12-audit-trail.md) — the verified invariants
- [W12 progress](../../01-planning/W12-m3-audit-trail-spike/progress.md) §Day 2 / §Day 3 — the
  benchmark tables and the neutralisation results
- **關掉的待辦**: OQ-4 → ADR-0003; `AD-BorrowedRefusal-1` reaches its **7th** form and this time
  gets an answer rather than another wrong claim
- **同類前例**: `CH-026` (W10) and `CH-028` (W11) — the same "which layer refuses" question, wrong
  both times, which is why N3 counted rows instead of trusting an error string
