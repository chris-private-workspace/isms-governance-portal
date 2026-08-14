/**
 * File: apps/api/src/audit-trail/bench.int.spec.ts
 * Purpose: The numbers ADR-0003 is decided on — A versus B, on the real write path, against a control.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W12 (M3 spike, ADR-0003)
 * Owner: docs/14-adr/0003-audit-trail-hash-chain.md
 *
 * Description:
 *   decision-form.md:19 says the cost of changing this decision later is high,
 *   and 14-adr/README.md:106 deferred it until there was something to measure on
 *   — the criterion being write throughput. There is now, so this measures
 *   rather than reasons.
 *
 *   ⭐ THE CONTROL GROUP IS THE SAME PATH WITH THE HOOK ABSENT. Same repository,
 *   same table, same policies, same transaction wrapper — SoaModule composed on
 *   its own simply has no AuditModule in its graph. It is not a second code path
 *   that resembles the first.
 *
 *   ⛔ THIS IS A CROSS-LAYER COMPARISON AND THE RESULT TABLE MUST SAY SO. A
 *   hashes in PL/pgSQL inside the database; B hashes in V8 in the API process.
 *   The two numbers are not the same quantity measured twice, and subtracting
 *   them is meaningless. What they do support is the shape of the difference,
 *   which is what the decision needs.
 *
 *   ⚠️ Predictions P1-P5 were written into progress.md and committed (1fcdf8f)
 *   BEFORE this file ran. Anything here that contradicts them is reported as
 *   measured, and the instrument is suspected first — three times this phase a
 *   surprising number has been the measurement's fault, not the system's.
 *
 *   A dedicated entity keeps this suite from perturbing audit.int.spec.ts: ten
 *   thousand rows under SG1 would make its chain walk quadratic in wall-clock
 *   for no reason.
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { AppModule } from '../bootstrap/app.module';
import { AUDIT_HOOK } from '../contracts/audit-hook';
import { SoaRepository } from '../core-model/soa.repository';
import { EntityScopeResolver } from '../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../entity-scope/scoped-prisma.provider';
import { SoaModule } from '../modules/soa/soa.module';
import { AUDITED_MODELS } from './audit.module';
import { AuditLogRecorder } from './audit.recorder';
import { GENESIS_HASH, anchorHash, contentHash } from './chain';
import { verifyAnchoredChain, verifyChain, type StoredAuditRow } from './verify';

const BENCH_ID = '00000000-0000-0000-0000-00000000be00';
const BENCH_CODE = 'W12BENCH';
const FRAMEWORK = 'ISO 27001';

/** Enough samples for a p95 to mean something, few enough to keep the suite short. */
const WARMUP = 20;
const SAMPLES = 200;
const CHAIN_LENGTHS = [1_000, 10_000] as const;

interface Timing {
  p50: number;
  p95: number;
  min: number;
  n: number;
}

function summarise(samplesMs: number[]): Timing {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const at = (q: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
  return { p50: at(0.5), p95: at(0.95), min: sorted[0]!, n: sorted.length };
}

const ms = (value: number): string => value.toFixed(3);

describe('audit trail benchmark (integration)', () => {
  let owner: Client;
  let audited: TestingModule;
  let control: TestingModule;
  let appChain: TestingModule;

  /** One (module -> [factory, resolver, repo]) triple per group. */
  const harness = async (moduleRef: TestingModule) => {
    const resolver = moduleRef.get(EntityScopeResolver);
    const factory = moduleRef.get(ScopedPrismaFactory);
    const repo = moduleRef.get(SoaRepository);
    const client = factory.forScope(
      await resolver.resolve({
        subjectId: 'w12-bench',
        assignedEntityCodes: [BENCH_CODE],
        rollUp: false,
      }),
    );
    return { client, repo };
  };

  beforeAll(async () => {
    owner = new Client({ connectionString: process.env.DATABASE_URL_MIGRATE });
    await owner.connect();
    await owner.query(
      `INSERT INTO org_entities (id, code, name, type, path, version, created_at, updated_at)
       VALUES ($1, $2, 'W12 benchmark entity', 'legal_entity', '/apac/w12bench', 1, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [BENCH_ID, BENCH_CODE],
    );

    audited = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await audited.init();

    // The control: no AuditModule in the graph, so ScopedPrismaFactory's optional
    // hook is absent and the identical write produces no audit row.
    control = await Test.createTestingModule({ imports: [SoaModule] }).compile();
    await control.init();

    // Strategy B: the same production wiring with the recorder in app-chain mode.
    appChain = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AUDIT_HOOK)
      .useValue(new AuditLogRecorder(AUDITED_MODELS, 'app-chain'))
      .compile();
    await appChain.init();
  }, 60_000);

  afterAll(async () => {
    await Promise.all([audited?.close(), control?.close(), appChain?.close()]);
    if (owner !== undefined) {
      // Order matters: audit rows and statements both reference the entity.
      await owner.query('DELETE FROM audit_log WHERE org_entity_id = $1', [BENCH_ID]);
      await owner.query('DELETE FROM statements_of_applicability WHERE org_entity_id = $1', [
        BENCH_ID,
      ]);
      await owner.query('DELETE FROM ref_code_counters WHERE org_entity_id = $1', [BENCH_ID]);
      await owner.query('DELETE FROM org_entities WHERE id = $1', [BENCH_ID]);
      await owner.end();
    }
  }, 60_000);

  let seq = 0;

  const writeOnce = async (repo: SoaRepository, client: unknown): Promise<void> => {
    seq += 1;
    await repo.create(
      client as Parameters<SoaRepository['create']>[0],
      {
        orgEntityId: BENCH_ID,
        framework: FRAMEWORK,
        clauseRef: `B.${seq}`,
        applicable: true,
        implementationStatus: 'implemented',
      } as Parameters<SoaRepository['create']>[1],
    );
  };

  /**
   * Measure two groups by ALTERNATING them, not by running one after the other.
   *
   * ⛔ The first version of this file ran control, then A, then B, and reported
   * that auditing made writes FASTER — control p50 44.9, A 42.7, B 40.7. Adding
   * an INSERT cannot speed a write up, so the instrument was wrong: each group
   * builds its own TestingModule with its own connection pool, and every group
   * after the first inherited a warmed pool and warmed PostgreSQL caches. The
   * bias was larger than the effect being measured.
   *
   * Alternating puts both groups through the same conditions sample by sample.
   */
  const timeAlternating = async (
    left: TestingModule,
    right: TestingModule,
  ): Promise<[Timing, Timing]> => {
    const l = await harness(left);
    const r = await harness(right);

    for (let i = 0; i < WARMUP; i += 1) {
      await writeOnce(l.repo, l.client);
      await writeOnce(r.repo, r.client);
    }

    const leftSamples: number[] = [];
    const rightSamples: number[] = [];
    for (let i = 0; i < SAMPLES; i += 1) {
      let started = process.hrtime.bigint();
      await writeOnce(l.repo, l.client);
      leftSamples.push(Number(process.hrtime.bigint() - started) / 1e6);

      started = process.hrtime.bigint();
      await writeOnce(r.repo, r.client);
      rightSamples.push(Number(process.hrtime.bigint() - started) / 1e6);
    }
    return [summarise(leftSamples), summarise(rightSamples)];
  };

  const auditRowCount = async (): Promise<number> => {
    const { rows } = await owner.query(
      'SELECT count(*)::int AS n FROM audit_log WHERE org_entity_id = $1',
      [BENCH_ID],
    );
    return rows[0].n;
  };

  const triggerExists = async (): Promise<boolean> => {
    const { rows } = await owner.query(
      "SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'audit_log_chain' AND NOT tgisinternal",
    );
    return rows[0].n === 1;
  };

  it('writes: each strategy against a control measured beside it', async () => {
    // ⭐ INSTRUMENT CHECK 1, before any timing: the control must genuinely not
    // audit. If it did, the comparison would be between two audited paths and
    // every number below would be meaningless while looking perfectly fine.
    const beforeControl = await auditRowCount();
    const probe = await harness(control);
    await writeOnce(probe.repo, probe.client);
    expect(await auditRowCount()).toBe(beforeControl);

    const beforeAudited = await auditRowCount();
    const auditedProbe = await harness(audited);
    await writeOnce(auditedProbe.repo, auditedProbe.client);
    expect(await auditRowCount()).toBe(beforeAudited + 1);

    // Phase 1 — trigger present. Control and A alternate.
    expect(await triggerExists()).toBe(true);
    const [controlA, a] = await timeAlternating(control, audited);

    // Phase 2 — trigger dropped, because it would overwrite the hash the
    // application computed. Control and B alternate. Dropped, measured,
    // restored, and the restoration is asserted rather than assumed.
    await owner.query('DROP TRIGGER "audit_log_chain" ON "audit_log"');
    let controlB: Timing;
    let b: Timing;
    try {
      expect(await triggerExists()).toBe(false);
      [controlB, b] = await timeAlternating(control, appChain);
    } finally {
      await owner.query(
        'CREATE TRIGGER "audit_log_chain" BEFORE INSERT ON "audit_log" FOR EACH ROW EXECUTE FUNCTION audit_log_chain()',
      );
    }
    expect(await triggerExists()).toBe(true);

    const overheadA = a.p50 - controlA.p50;
    const overheadB = b.p50 - controlB.p50;
    // ⭐ INSTRUMENT CHECK 2: the two controls ran in different phases under the
    // same conditions. If they disagree by more than the overheads being
    // reported, the environment moved during the run and the comparison is not
    // worth reading. Printed rather than asserted — this is a spike, and a noisy
    // machine is a fact about the measurement, not a test failure.
    const controlDrift = Math.abs(controlA.p50 - controlB.p50);

    // ⛔ Cross-layer: A hashes in PL/pgSQL inside the database, B hashes in V8
    // in the API process. Same row, different machines doing the work — these
    // are not one quantity measured twice.
    console.log(
      [
        '',
        '=== W12 write cost (ms per create through the repository) ===',
        `control (phase 1)     p50 ${ms(controlA.p50)}  p95 ${ms(controlA.p95)}  min ${ms(controlA.min)}`,
        `A (trigger, plpgsql)  p50 ${ms(a.p50)}  p95 ${ms(a.p95)}  min ${ms(a.min)}`,
        `control (phase 2)     p50 ${ms(controlB.p50)}  p95 ${ms(controlB.p95)}  min ${ms(controlB.min)}`,
        `B (app chain, V8)     p50 ${ms(b.p50)}  p95 ${ms(b.p95)}  min ${ms(b.min)}`,
        '',
        `overhead A  p50 +${ms(overheadA)}  p95 +${ms(a.p95 - controlA.p95)}`,
        `overhead B  p50 +${ms(overheadB)}  p95 +${ms(b.p95 - controlB.p95)}`,
        `control drift between phases: ${ms(controlDrift)}  (n=${SAMPLES} each, alternated)`,
        '',
      ].join('\n'),
    );

    expect(controlA.n).toBe(SAMPLES);
    expect(a.p50).toBeGreaterThan(0);
    expect(b.p50).toBeGreaterThan(0);
  }, 600_000);

  /**
   * The measurement the sequential test structurally cannot make.
   *
   * ⭐ Strategy A's headline cost is a per-entity advisory lock, and a lock that
   * is never contended costs almost nothing. One writer at a time therefore
   * measures everything about A EXCEPT the thing that decides whether it scales.
   * Every writer here targets the SAME entity, which is the worst case and also
   * the realistic one — an OpCo's users all write to their own OpCo.
   *
   * ⚠️ Order bias is deliberately pointed AGAINST the hypothesis: the group
   * expected to be slower runs SECOND, where warmed pools and caches help it. If
   * it still looks worse from that position, the effect is not an artefact.
   */
  const timeConcurrent = async (
    moduleRef: TestingModule,
    writers: number,
    perWriter: number,
  ): Promise<Timing & { wallMs: number }> => {
    const lanes = await Promise.all(
      Array.from({ length: writers }, async () => harness(moduleRef)),
    );
    for (const lane of lanes) await writeOnce(lane.repo, lane.client);

    const samples: number[] = [];
    const started = process.hrtime.bigint();
    await Promise.all(
      lanes.map(async (lane) => {
        for (let i = 0; i < perWriter; i += 1) {
          const t0 = process.hrtime.bigint();
          await writeOnce(lane.repo, lane.client);
          samples.push(Number(process.hrtime.bigint() - t0) / 1e6);
        }
      }),
    );
    const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
    return { ...summarise(samples), wallMs };
  };

  it('writes under concurrency: what a per-entity lock actually costs', async () => {
    const WRITERS = 8;
    const PER_WRITER = 25;

    expect(await triggerExists()).toBe(true);
    const controlA = await timeConcurrent(control, WRITERS, PER_WRITER);
    const a = await timeConcurrent(audited, WRITERS, PER_WRITER);

    await owner.query('DROP TRIGGER "audit_log_chain" ON "audit_log"');
    let controlB: Timing & { wallMs: number };
    let b: Timing & { wallMs: number };
    try {
      expect(await triggerExists()).toBe(false);
      controlB = await timeConcurrent(control, WRITERS, PER_WRITER);
      b = await timeConcurrent(appChain, WRITERS, PER_WRITER);
    } finally {
      await owner.query(
        'CREATE TRIGGER "audit_log_chain" BEFORE INSERT ON "audit_log" FOR EACH ROW EXECUTE FUNCTION audit_log_chain()',
      );
    }
    expect(await triggerExists()).toBe(true);

    const line = (label: string, t: Timing & { wallMs: number }): string =>
      `${label.padEnd(21)} p50 ${ms(t.p50)}  p95 ${ms(t.p95)}  wall ${ms(t.wallMs)}  n=${t.n}`;

    console.log(
      [
        '',
        `=== W12 write cost under ${WRITERS} concurrent writers on ONE entity ===`,
        line('control (phase 1)', controlA),
        line('A (trigger, plpgsql)', a),
        line('control (phase 2)', controlB),
        line('B (app chain, V8)', b),
        '',
        `overhead A  p50 +${ms(a.p50 - controlA.p50)}  p95 +${ms(a.p95 - controlA.p95)}  wall +${ms(a.wallMs - controlA.wallMs)}`,
        `overhead B  p50 +${ms(b.p50 - controlB.p50)}  p95 +${ms(b.p95 - controlB.p95)}  wall +${ms(b.wallMs - controlB.wallMs)}`,
        `control drift between phases: ${ms(Math.abs(controlA.p50 - controlB.p50))}`,
        '',
      ].join('\n'),
    );

    expect(a.n).toBe(WRITERS * PER_WRITER);
    expect(b.n).toBe(WRITERS * PER_WRITER);
  }, 600_000);

  it('verification: fetch, then hash — at 1k and 10k rows', async () => {
    // A-shaped rows, chained by the trigger itself, generated in bulk. The write
    // path is measured above; what matters here is having a real chain of a
    // known length to walk.
    await owner.query('DELETE FROM audit_log WHERE org_entity_id = $1', [BENCH_ID]);
    await owner.query(
      `INSERT INTO audit_log (org_entity_id, actor_scope, operation, resource_type, resource_id)
       SELECT $1::uuid, $1::text, 'Bench.create', 'Bench', 'BENCH-' || g
       FROM generate_series(1, $2::int) AS g`,
      [BENCH_ID, Math.max(...CHAIN_LENGTHS)],
    );

    const { client } = await harness(audited);
    const lines: string[] = ['', '=== W12 verification cost (ms) ==='];

    for (const length of CHAIN_LENGTHS) {
      const fetchStarted = process.hrtime.bigint();
      const rows = (await client.auditLog.findMany({
        orderBy: { id: 'asc' },
        take: length,
      })) as unknown as StoredAuditRow[];
      const fetchMs = Number(process.hrtime.bigint() - fetchStarted) / 1e6;
      expect(rows).toHaveLength(length);

      const aStarted = process.hrtime.bigint();
      const aVerdict = verifyChain(rows);
      const aMs = Number(process.hrtime.bigint() - aStarted) / 1e6;
      expect(aVerdict.intact).toBe(true);

      // The same content re-shaped as strategy B would have stored it: content
      // hashes with no per-row link, an anchor every 100. Built here rather than
      // written to the database because what is being compared is the COST OF
      // WALKING a chain, and both walks start from rows already in memory.
      const bRows: StoredAuditRow[] = [];
      let prevAnchor: Uint8Array = GENESIS_HASH;
      let segment: Uint8Array[] = [];
      for (const row of rows) {
        const hash = contentHash(row);
        bRows.push({ ...row, prevHash: GENESIS_HASH, rowHash: hash });
        segment.push(hash);
        if (segment.length === 100) {
          const next = anchorHash(prevAnchor, segment);
          bRows.push({ ...row, operation: 'audit.anchor', prevHash: prevAnchor, rowHash: next });
          prevAnchor = next;
          segment = [];
        }
      }

      const bStarted = process.hrtime.bigint();
      const bVerdict = verifyAnchoredChain(bRows);
      const bMs = Number(process.hrtime.bigint() - bStarted) / 1e6;
      expect(bVerdict.intact).toBe(true);

      lines.push(
        `n=${length}  fetch ${ms(fetchMs)} (shared)  A walk ${ms(aMs)}  B walk ${ms(bMs)}  ratio B/A ${(bMs / aMs).toFixed(2)}`,
      );
    }

    console.log(lines.concat('').join('\n'));
  }, 300_000);
});
