/**
 * File: apps/api/src/audit-trail/audit.recorder.spec.ts
 * Purpose: Pin what the recorder decides to audit, and what it refuses to guess.
 * Category: audit-trail
 * Scope: Phase W12 (M3 spike, ADR-0003)
 *
 * Description:
 *   Three decisions live here and none of them are observable from the
 *   integration suite without a database round trip per case: which operations
 *   count as writes, which models are connected, and what happens when the
 *   entity cannot be determined. The third is the important one — it must
 *   THROW, because a guessed entity files evidence under the wrong OpCo and an
 *   audit trail that is confidently wrong is worse than one with a gap.
 *
 *   The writer double records rather than executes, which also pins the property
 *   the whole design rests on: intercept() must not await anything.
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 */
import type { AuditLogWriter } from '../contracts/audit-hook';
import { AuditLogRecorder, UnattributableWriteError } from './audit.recorder';
import { GENESIS_HASH, contentHash } from './chain';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

const AUDITED = 'StatementOfApplicability';

interface Recorder {
  writer: AuditLogWriter;
  created: Record<string, unknown>[];
}

function recordingWriter(): Recorder {
  const created: Record<string, unknown>[] = [];
  return {
    created,
    writer: {
      auditLog: {
        create(args: { data: Record<string, unknown> }) {
          created.push(args.data);
          return { PRISMA_PROMISE: true };
        },
      },
    },
  };
}

const recorder = new AuditLogRecorder(new Set([AUDITED]));

const write = (over: Record<string, unknown> = {}) => ({
  model: AUDITED,
  operation: 'create',
  args: { data: { orgEntityId: SG1, refCode: 'SOA-SG1-1', clauseRef: 'A.5.9' } },
  ...over,
});

describe('AuditLogRecorder — what it records', () => {
  it('returns an unstarted promise for a write on a connected model', () => {
    const rec = recordingWriter();

    const entry = recorder.intercept(rec.writer, write(), { entityIds: [SG1] });

    expect(entry).toEqual({ PRISMA_PROMISE: true });
    expect(rec.created).toHaveLength(1);
  });

  it('records the operation, resource and scope the auditor needs', () => {
    const rec = recordingWriter();

    recorder.intercept(rec.writer, write(), { entityIds: [SG1, HK1] });

    expect(rec.created[0]).toMatchObject({
      orgEntityId: SG1,
      operation: `${AUDITED}.create`,
      resourceType: AUDITED,
      resourceId: 'SOA-SG1-1',
      actorScope: `${SG1},${HK1}`,
      accessAllowed: true,
    });
  });

  it('leaves actor_id null rather than inventing a user', () => {
    // 02a:311 keeps the actor pseudonymous, and there is no identity model until
    // M4. A placeholder would answer "who did this" with a lie.
    const rec = recordingWriter();

    recorder.intercept(rec.writer, write(), { entityIds: [SG1] });

    expect(rec.created[0]?.actorId).toBeNull();
  });

  it('stores the REQUESTED payload as after, and OMITS before rather than nulling it', () => {
    // ⚠️ Two separate claims, both pinned because both were learned the hard way.
    //
    // `after` is what was asked for rather than what was stored: the array form
    // of $transaction admits no read, so the result is unavailable. A limitation,
    // not a feature.
    //
    // ⛔ `before` must be ABSENT, not null. Passing null to a Json? field makes
    // Prisma store JSON null, which is a value the hash covers and which reads
    // back from JavaScript indistinguishably from SQL NULL — so verify
    // recomputes the wrong bytes. W12 Day 2 measured exactly that: every row
    // reported broken at the first row.
    const rec = recordingWriter();

    recorder.intercept(rec.writer, write(), { entityIds: [SG1] });

    expect(rec.created[0]).not.toHaveProperty('before');
    expect(rec.created[0]?.after).toEqual({
      orgEntityId: SG1,
      refCode: 'SOA-SG1-1',
      clauseRef: 'A.5.9',
    });
  });

  it('omits after too when the operation carries no payload', () => {
    const rec = recordingWriter();

    recorder.intercept(rec.writer, write({ operation: 'delete', args: { where: { id: 'x' } } }), {
      entityIds: [SG1],
    });

    expect(rec.created[0]).not.toHaveProperty('after');
  });
});

describe('AuditLogRecorder — app-chain mode (strategy B)', () => {
  // ⛔ These exist because a coverage report said the app-chain branch had no
  // unit test at all. The benchmark exercises it, but a benchmark asserts
  // TIMINGS — so strategy B's write path was about to be compared on cost
  // without anything having checked that it writes a correct hash.
  const AT = new Date('2026-08-14T00:00:00.000Z');
  const appChain = new AuditLogRecorder(new Set([AUDITED]), 'app-chain', () => AT);

  it('leaves both hash columns to the trigger in db-trigger mode', () => {
    const rec = recordingWriter();

    recorder.intercept(rec.writer, write(), { entityIds: [SG1] });

    expect(rec.created[0]).not.toHaveProperty('rowHash');
    expect(rec.created[0]).not.toHaveProperty('prevHash');
    // Also no timestamp: the column default is the database's clock, which is
    // the one A hashes over.
    expect(rec.created[0]).not.toHaveProperty('occurredAt');
  });

  it('writes the hash itself, unlinked, with its own timestamp', () => {
    const rec = recordingWriter();

    appChain.intercept(rec.writer, write(), { entityIds: [SG1] });

    const row = rec.created[0]!;
    expect(row.occurredAt).toBe(AT);
    expect(row.prevHash).toEqual(GENESIS_HASH);
    // ⭐ Recomputed here from the same content the row claims to describe, so
    // this fails if the recorder ever hashes a different set of fields than it
    // stores — the exact drift that would make a chain unverifiable.
    expect(row.rowHash).toEqual(
      contentHash({
        orgEntityId: SG1,
        actorId: null,
        actorScope: SG1,
        operation: `${AUDITED}.create`,
        resourceType: AUDITED,
        resourceId: 'SOA-SG1-1',
        accessAllowed: true,
        attemptedEntity: null,
        before: null,
        after: { orgEntityId: SG1, refCode: 'SOA-SG1-1', clauseRef: 'A.5.9' },
        occurredAt: AT,
      }),
    );
  });

  it('uses a real clock when none is injected', () => {
    // The default parameter is a function, and until this existed it was the one
    // thing in the file no test had ever called — invisible in a line-coverage
    // report, which said 100%, and visible in the function count, which did not.
    const rec = recordingWriter();
    const withDefaultClock = new AuditLogRecorder(new Set([AUDITED]), 'app-chain');

    const before = Date.now();
    withDefaultClock.intercept(rec.writer, write(), { entityIds: [SG1] });
    const stamped = (rec.created[0]?.occurredAt as Date).getTime();

    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(Date.now());
  });

  it('still refuses an unattributable write — the mode does not relax that', () => {
    const rec = recordingWriter();
    const noEntity = write({ operation: 'update', args: { where: { id: 'abc' }, data: {} } });

    expect(() => appChain.intercept(rec.writer, noEntity, { entityIds: [SG1, HK1] })).toThrow(
      UnattributableWriteError,
    );
  });
});

describe('AuditLogRecorder — what it declines', () => {
  it.each(['findMany', 'findUnique', 'findFirst', 'count', 'aggregate', 'groupBy'])(
    'records nothing for %s, because reads are not writes',
    (operation) => {
      const rec = recordingWriter();

      expect(recorder.intercept(rec.writer, write({ operation }), { entityIds: [SG1] })).toBeNull();
      expect(rec.created).toHaveLength(0);
    },
  );

  it.each(['create', 'update', 'upsert', 'delete', 'updateMany', 'deleteMany'])(
    'records %s, so adding a write operation does not silently escape auditing',
    (operation) => {
      const rec = recordingWriter();

      expect(
        recorder.intercept(rec.writer, write({ operation }), { entityIds: [SG1] }),
      ).not.toBeNull();
    },
  );

  it('records nothing for a model outside the allowlist', () => {
    // The allowlist is what limits W12 to one module. This asserts it DECIDES,
    // rather than the phase merely happening not to write elsewhere.
    const rec = recordingWriter();

    expect(recorder.intercept(rec.writer, write({ model: 'Policy' }), { entityIds: [SG1] })).toBe(
      null,
    );
    expect(rec.created).toHaveLength(0);
  });

  it('⚠️ records nothing for a raw query, which is a named hole and not an oversight', () => {
    const rec = recordingWriter();

    expect(
      recorder.intercept(rec.writer, write({ model: undefined }), { entityIds: [SG1] }),
    ).toBeNull();
  });
});

describe('AuditLogRecorder — what it refuses to guess', () => {
  it('falls back to a single-entity scope when the payload carries no entity', () => {
    const rec = recordingWriter();
    const noEntity = write({ operation: 'update', args: { where: { id: 'abc' }, data: {} } });

    recorder.intercept(rec.writer, noEntity, { entityIds: [SG1] });

    expect(rec.created[0]?.orgEntityId).toBe(SG1);
  });

  it('throws rather than pick one when the scope names several and the payload names none', () => {
    const rec = recordingWriter();
    const noEntity = write({ operation: 'update', args: { where: { id: 'abc' }, data: {} } });

    expect(() => recorder.intercept(rec.writer, noEntity, { entityIds: [SG1, HK1] })).toThrow(
      UnattributableWriteError,
    );
    // The point: nothing was built, so runScoped has nothing to enlist and the
    // domain write never happens either.
    expect(rec.created).toHaveLength(0);
  });

  it('prefers the payload entity over the scope, because that is the row being written', () => {
    const rec = recordingWriter();

    recorder.intercept(rec.writer, write({ args: { data: { orgEntityId: HK1 } } }), {
      entityIds: [SG1, HK1],
    });

    expect(rec.created[0]?.orgEntityId).toBe(HK1);
  });

  it('⚠️ leaves resource_id null on a create with no reference code', () => {
    // Prisma assigns the id after this point, so there is nothing to record.
    // Every module here issues a ref_code, which is why this is usually filled —
    // a convention, not a guarantee.
    const rec = recordingWriter();

    recorder.intercept(rec.writer, write({ args: { data: { orgEntityId: SG1 } } }), {
      entityIds: [SG1],
    });

    expect(rec.created[0]?.resourceId).toBeNull();
  });
});
