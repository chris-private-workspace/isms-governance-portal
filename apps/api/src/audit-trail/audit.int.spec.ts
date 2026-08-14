/**
 * File: apps/api/src/audit-trail/audit.int.spec.ts
 * Purpose: Prove the audit row is written by the wiring that ships, and that the database refuses to change it.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W12 (M3 spike, ADR-0003)
 * Owner: CLAUDE.md 約束 8 · guardrail 5 · docs/02-architecture/05-platform-foundation-services.md:18-24
 *
 * Description:
 *   ⭐ THIS FILE COMPOSES AppModule, NOT SoaModule, AND THAT IS THE POINT. Every
 *   other integration suite builds a TestingModule from the one module it tests,
 *   which is faster and cannot see wiring. The audit hook is injected optionally
 *   (see ScopedPrismaFactory's constructor for why it has to be), so a
 *   test-local graph would pass just as happily with the audit trail switched
 *   off. Composing the real root is what makes W12's N2 neutralisation — delete
 *   one line from app.module.ts — turn this suite red instead of quietly
 *   stopping the trail.
 *
 *   The four scope tests 約束 8 requires are here, and the fourth is stated
 *   precisely rather than generously: append-only is measured by WHICH layer
 *   refuses, using a raw connection so the answer is a SQLSTATE and not an
 *   inference. W10 asserted the policy did it and was wrong; W11 asserted a
 *   WITH CHECK did it and was wrong. This file reports what it saw.
 *
 *   Tampering is done with the OWNER connection, because the application role
 *   cannot — which is itself the first result.
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W12)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { AppModule } from '../bootstrap/app.module';
import { AUDIT_HOOK } from '../contracts/audit-hook';
import { SoaRepository } from '../core-model/soa.repository';
import { EntityScopeResolver } from '../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../entity-scope/scoped-prisma.provider';
import { AUDITED_MODELS } from './audit.module';
import { AuditLogRecorder } from './audit.recorder';
import { contentHash } from './chain';
import { verifyChain, type StoredAuditRow } from './verify';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const FRAMEWORK = 'ISO 27001';
const MODEL = 'StatementOfApplicability';

describe('audit trail (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: SoaRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(SoaRepository);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  /** Clause refs must stay unique per entity for the life of the run. */
  let seq = 0;

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-audit', assignedEntityCodes: codes, rollUp }),
    );

  const createSoa = async (code: 'SG1' | 'HK1') => {
    seq += 1;
    return repo.create(await clientFor([code]), {
      orgEntityId: code === 'HK1' ? HK1 : SG1,
      framework: FRAMEWORK,
      clauseRef: `W12.${seq}`,
      applicable: true,
      implementationStatus: 'implemented',
    } as Parameters<SoaRepository['create']>[1]);
  };

  const auditRows = async (code: 'SG1' | 'HK1'): Promise<StoredAuditRow[]> => {
    const client = await clientFor([code]);
    const rows = await client.auditLog.findMany({ orderBy: { id: 'asc' } });
    return rows as unknown as StoredAuditRow[];
  };

  /** A raw connection, so a refusal is a SQLSTATE rather than something inferred. */
  const rawAs = async (url: string | undefined, scope?: string): Promise<Client> => {
    const client = new Client({ connectionString: url });
    await client.connect();
    if (scope !== undefined) await client.query(`SET app.entity_scope = '${scope}'`);
    return client;
  };

  const sqlstateOf = async (client: Client, sql: string): Promise<string> => {
    try {
      await client.query(sql);
      return 'NO ERROR';
    } catch (error) {
      return (error as { code?: string }).code ?? 'UNKNOWN';
    }
  };

  // === US-4: the write path, through the wiring that ships =================

  it('writes exactly one audit row for one domain write', async () => {
    const before = (await auditRows('SG1')).length;

    const row = await createSoa('SG1');

    const after = await auditRows('SG1');
    expect(after).toHaveLength(before + 1);
    expect(after.at(-1)).toMatchObject({
      operation: `${MODEL}.create`,
      resourceType: MODEL,
      resourceId: row.refCode,
      orgEntityId: SG1,
      actorId: null,
      accessAllowed: true,
    });
  });

  it('records nothing for a read', async () => {
    const client = await clientFor(['SG1']);
    await createSoa('SG1');
    const before = (await auditRows('SG1')).length;
    // ⛔ Non-emptiness first. "A read added nothing" and "nothing is being
    // recorded at all" are the same observation on an empty table — W12's N2
    // measured this test staying green with the audit trail switched off.
    expect(before).toBeGreaterThan(0);

    await client.statementOfApplicability.findMany({ take: 1 });

    expect(await auditRows('SG1')).toHaveLength(before);
  });

  it('leaves no audit row behind when the domain write fails', async () => {
    // Atomicity is the claim, and a refused write is how to test it: the unique
    // key rejects the second insert, and the audit row must roll back with it.
    // If the two were separate transactions this suite would be one row heavier.
    seq += 1;
    const clause = `W12.dup.${seq}`;
    const client = await clientFor(['SG1']);
    const payload = {
      orgEntityId: SG1,
      framework: FRAMEWORK,
      clauseRef: clause,
      applicable: true,
      implementationStatus: 'implemented' as const,
    };

    await repo.create(client, payload as Parameters<SoaRepository['create']>[1]);
    const afterFirst = (await auditRows('SG1')).length;
    // ⛔ Non-emptiness first — otherwise "the failed write left nothing" holds
    // trivially on a table nothing ever writes to (W12 N2).
    expect(afterFirst).toBeGreaterThan(0);

    await expect(
      repo.create(client, payload as Parameters<SoaRepository['create']>[1]),
    ).rejects.toThrow();

    expect(await auditRows('SG1')).toHaveLength(afterFirst);
  });

  // === US-2: the chain, on real rows =======================================

  it('chains the rows it writes, and verify walks them intact', async () => {
    await createSoa('SG1');
    await createSoa('SG1');

    const verdict = verifyChain(await auditRows('SG1'));

    expect(verdict).toEqual({ intact: true, rowsChecked: expect.any(Number) });
    expect(verdict.rowsChecked).toBeGreaterThan(1);
  });

  it('keeps a separate chain per entity, both starting at genesis', async () => {
    await createSoa('HK1');

    expect(verifyChain(await auditRows('HK1')).intact).toBe(true);
    expect(verifyChain(await auditRows('SG1')).intact).toBe(true);

    const sg = await auditRows('SG1');
    const hk = await auditRows('HK1');
    // Two chains, not one interleaved: HK1's first row cannot reference a hash
    // it is not allowed to read.
    expect(Buffer.from(hk[0]!.prevHash).equals(Buffer.alloc(32))).toBe(true);
    expect(Buffer.from(sg[0]!.prevHash).equals(Buffer.alloc(32))).toBe(true);
  });

  // === 約束 8: the four scope tests ========================================

  it('約束 8 (1) — cross-entity read is refused', async () => {
    await createSoa('SG1');
    await createSoa('HK1');

    const sg = await auditRows('SG1');
    const hk = await auditRows('HK1');

    // ⛔ BOTH SIDES MUST BE NON-EMPTY BEFORE THE ISOLATION CLAIM MEANS ANYTHING.
    // The first version of this test asserted only `every` and `some` over HK1's
    // view, and W12's N2 measured it staying GREEN with the audit trail switched
    // off entirely: on an empty array `every` is true and `some` is false. "HK1
    // cannot see SG1's rows" and "there are no rows" were the same observation —
    // the exact shape W11 recorded and this file reproduced anyway.
    expect(sg.length).toBeGreaterThan(0);
    expect(hk.length).toBeGreaterThan(0);

    expect(hk.every((r) => r.orgEntityId === HK1)).toBe(true);
    expect(sg.every((r) => r.orgEntityId === SG1)).toBe(true);
  });

  it('約束 8 (2) — cross-entity write is refused and nothing changes', async () => {
    const sgBefore = await auditRows('SG1');
    const client = await clientFor(['HK1']);

    await expect(
      client.auditLog.create({
        data: {
          orgEntityId: SG1,
          actorScope: HK1,
          operation: 'forged.write',
          accessAllowed: true,
        },
      }),
    ).rejects.toThrow();

    // Checking the response alone would miss "refused, but written anyway".
    const sgAfter = await auditRows('SG1');
    expect(sgAfter).toHaveLength(sgBefore.length);
    expect(sgAfter.some((r) => r.operation === 'forged.write')).toBe(false);
  });

  it('約束 8 (3) — the RLS layer holds with the application removed', async () => {
    const client = await rawAs(process.env.DATABASE_URL, SG1);
    try {
      const role = await client.query(
        'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
      );
      // Restated here because this is the test that would look most convincing
      // while proving nothing.
      expect(role.rows[0].rolsuper).toBe(false);
      expect(role.rows[0].rolbypassrls).toBe(false);

      const { rows } = await client.query('SELECT DISTINCT org_entity_id FROM audit_log');
      expect(rows.map((r) => r.org_entity_id)).toEqual([SG1]);
    } finally {
      await client.end();
    }
  });

  it('約束 8 (4) — append-only, and WHICH layer refuses is measured not assumed', async () => {
    const client = await rawAs(process.env.DATABASE_URL, SG1);
    try {
      const update = await sqlstateOf(client, "UPDATE audit_log SET operation = 'tampered'");
      const remove = await sqlstateOf(client, 'DELETE FROM audit_log');

      // 42501 is `permission denied for table` — the GRANT, which is the layer
      // that gets there first. ⛔ This does NOT show the absent UPDATE/DELETE
      // policies also refuse: while the grant is missing, that layer is
      // unobservable. Day 3's N3 restores the grant and measures what happens.
      expect(update).toBe('42501');
      expect(remove).toBe('42501');
    } finally {
      await client.end();
    }
  });

  // === US-3: strategy B writes rows that verify, not just rows that are fast =

  it('strategy B writes a hash that checks out against the row it describes', async () => {
    // ⛔ Without this, W12 would be comparing the COST of two strategies while
    // only one of them had ever been checked for CORRECTNESS. The benchmark
    // asserts timings; timings are happy to be produced by a broken writer.
    const appChain = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AUDIT_HOOK)
      .useValue(new AuditLogRecorder(AUDITED_MODELS, 'app-chain'))
      .compile();
    await appChain.init();

    const owner = await rawAs(process.env.DATABASE_URL_MIGRATE);
    try {
      // The trigger would overwrite what the application computed, so B can only
      // be observed with it out of the way. Dropped, measured, restored — and
      // the restoration is asserted, not assumed.
      await owner.query('DROP TRIGGER "audit_log_chain" ON "audit_log"');

      const resolverB = appChain.get(EntityScopeResolver);
      const factoryB = appChain.get(ScopedPrismaFactory);
      const repoB = appChain.get(SoaRepository);
      seq += 1;
      await repoB.create(
        factoryB.forScope(
          await resolverB.resolve({
            subjectId: 'int-audit-b',
            assignedEntityCodes: ['HK1'],
            rollUp: false,
          }),
        ),
        {
          orgEntityId: HK1,
          framework: FRAMEWORK,
          clauseRef: `W12.b.${seq}`,
          applicable: true,
          implementationStatus: 'implemented',
        } as Parameters<SoaRepository['create']>[1],
      );

      const written = (await auditRows('HK1')).at(-1)!;
      expect(Buffer.from(written.prevHash).equals(Buffer.alloc(32))).toBe(true);
      // Recomputed from the row as STORED — which is the check that matters,
      // because it closes the loop through PostgreSQL's jsonb normalisation and
      // its timestamp rounding rather than around them.
      expect(Buffer.from(written.rowHash).equals(contentHash(written))).toBe(true);
    } finally {
      await owner.query(
        'CREATE TRIGGER "audit_log_chain" BEFORE INSERT ON "audit_log" FOR EACH ROW EXECUTE FUNCTION audit_log_chain()',
      );
      const { rows } = await owner.query(
        "SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'audit_log_chain' AND NOT tgisinternal",
      );
      expect(rows[0].n).toBe(1);
      await owner.end();
      await appChain.close();
    }
  }, 60_000);

  // === US-2: tamper detection, with the privileges to actually tamper ======

  describe('tamper detection', () => {
    it('names the edited row, then calls the chain intact again once restored', async () => {
      await createSoa('SG1');
      const rows = await auditRows('SG1');
      expect(verifyChain(rows).intact).toBe(true);

      const target = rows.at(-1)!;
      const owner = await rawAs(process.env.DATABASE_URL_MIGRATE);
      try {
        // The owner is a superuser here, which is exactly why the application
        // must never connect as one — and why this is the only way to produce
        // the state verify exists to detect.
        await owner.query('UPDATE audit_log SET operation = $1 WHERE id = $2', [
          'tampered.write',
          target.id,
        ]);

        const verdict = verifyChain(await auditRows('SG1'));
        expect(verdict.intact).toBe(false);
        if (verdict.intact) throw new Error('unreachable');
        expect(verdict.firstBreak.kind).toBe('content');
        expect(verdict.firstBreak.id).toBe(target.id);

        await owner.query('UPDATE audit_log SET operation = $1 WHERE id = $2', [
          target.operation,
          target.id,
        ]);
        expect(verifyChain(await auditRows('SG1')).intact).toBe(true);
      } finally {
        await owner.end();
      }
    });

    it('detects a row whose before/after payload was edited', async () => {
      // The payload is the part an attacker would most want to change — it is
      // the record of WHAT was done — so it has to be inside the hash.
      await createSoa('SG1');
      const rows = await auditRows('SG1');
      const target = rows.at(-1)!;

      const owner = await rawAs(process.env.DATABASE_URL_MIGRATE);
      try {
        await owner.query('UPDATE audit_log SET after = $1 WHERE id = $2', [
          JSON.stringify({ clauseRef: 'A.5.99' }),
          target.id,
        ]);

        const verdict = verifyChain(await auditRows('SG1'));
        expect(verdict.intact).toBe(false);
        if (verdict.intact) throw new Error('unreachable');
        expect(verdict.firstBreak.id).toBe(target.id);

        await owner.query('UPDATE audit_log SET after = $1 WHERE id = $2', [
          JSON.stringify(target.after),
          target.id,
        ]);
        expect(verifyChain(await auditRows('SG1')).intact).toBe(true);
      } finally {
        await owner.end();
      }
    });
  });
});
