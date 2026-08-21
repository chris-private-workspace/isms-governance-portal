/**
 * File: apps/api/src/workflow/workflow.int.spec.ts
 * Purpose: The first UPDATE in this repo, measured end to end — audit coverage, and the four scope tests.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W25 (M5 spike — candidate A)
 * Owner: CLAUDE.md 約束 8 · guardrail 5 · docs/02-architecture/02a-data-model-spec.md §4
 *
 * Description:
 *   ⭐ EVERY OTHER AUDIT TEST IN THIS REPO EXERCISES A `create`. W25 Day 0
 *   measured that the product tree contained zero `client.*.update` calls, so
 *   "updates are audited" was an allowlist entry that nothing had ever walked
 *   (audit-coverage.int.spec.ts:26-32 says so in as many words). This file is
 *   that walk, which is why it composes AppModule rather than a test-local graph:
 *   the audit hook is @Optional, so a narrower module would measure a wiring
 *   where it is switched off.
 *
 *   Two halves, and they use different entry points on purpose:
 *
 *     - LEGALITY goes through PolicyController, because the guard lives there.
 *       core-model may not import workflow, so a repository-level test could not
 *       see the lifecycle at all and would prove only that a write happened.
 *     - SCOPE goes through PolicyRepository with explicitly scoped clients,
 *       because the controller always uses the dev principal and a scope test
 *       that cannot choose its scope is vacuous (AD-VacuousScopeTest-1).
 *
 *   ⛔ THREE STRUCTURAL LIMITS ARE PINNED HERE AS TESTS RATHER THAN DESCRIBED IN
 *   A DOCUMENT, so that fixing one turns this file red and someone reads why:
 *     1. `before` is always SQL NULL — the recorder cannot read prior state
 *     2. the create row and the transition rows carry DIFFERENT resource ids
 *     3. a roll-up scope cannot transition at all
 *   All three are inputs to ADR-0003, not defects to patch here.
 *
 * Created: 2026-08-21 (Phase W25)
 * Last Modified: 2026-08-21
 *
 * Modification History (newest-first):
 *   - 2026-08-21: Pin the dev-principal scope (W25) — CI runs it as HK1, local as SG1
 *   - 2026-08-21: Initial creation (Phase W25) — the tree's first update, measured
 */
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { AppModule } from '../bootstrap/app.module';
import { PolicyRepository } from '../core-model/policy.repository';
import { EntityScopeResolver } from '../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../entity-scope/scoped-prisma.provider';
import type { Policy, PolicyStatus } from '../generated/prisma';
import { PolicyController } from '../modules/policy/policy.controller';
import { POLICY_INITIAL_STATUS } from './transitions';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

interface AuditRow {
  resourceId: string | null;
  resourceType: string | null;
  operation: string;
  orgEntityId: string;
  actorId: string | null;
  actorScope: string;
  accessAllowed: boolean;
  before: unknown;
  after: unknown;
}

describe('policy lifecycle transition (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: PolicyRepository;
  let controller: PolicyController;

  /**
   * ⛔ THE CONTROLLER'S SCOPE IS AMBIENT, SO THIS SUITE HAS TO PIN IT.
   *
   * dev-principal.ts:100-110 reads DEV_PRINCIPAL_ENTITIES on EVERY call, and the
   * legality half below creates its subjects in SG1. A machine whose .env omits
   * the variable gets ['SG1'] by fallback and sees green; CI copies .env.example
   * (ci.yml:235), which sets HK1 — and app.module.ts:54 loads that file. So the
   * caller was looking at a different entity than the one holding the row, and
   * five tests that passed locally answered 404 on CI. Local green was never
   * evidence about CI here, because the two runs disagreed about who was asking.
   *
   * Roll-up is pinned for a measured reason, not a hypothetical one: scope 4
   * below shows a roll-up scope CANNOT transition at all, so a developer running
   * with DEV_PRINCIPAL_ROLLUP=true would turn this half red with a message about
   * guessing an entity, which names nothing that is actually wrong.
   *
   * Restored in afterAll because maxWorkers is 1 — a leaked value follows the
   * rest of the run into other suites. risk.int.spec.ts:434-448 saves and
   * restores for exactly this reason; W25 shipped without noticing that precedent.
   */
  const priorEntities = process.env.DEV_PRINCIPAL_ENTITIES;
  const priorRollUp = process.env.DEV_PRINCIPAL_ROLLUP;

  const restoreDevPrincipalEnv = () => {
    for (const [key, prior] of [
      ['DEV_PRINCIPAL_ENTITIES', priorEntities],
      ['DEV_PRINCIPAL_ROLLUP', priorRollUp],
    ] as const) {
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };

  beforeAll(async () => {
    process.env.DEV_PRINCIPAL_ENTITIES = 'SG1';
    process.env.DEV_PRINCIPAL_ROLLUP = 'false';

    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(PolicyRepository);
    controller = moduleRef.get(PolicyController);
  });

  /**
   * ⛔ RETIRING EVERY ROW THIS SUITE CREATED IS NOT TIDINESS, IT IS REQUIRED.
   *
   * jest.int.config.js:51-55 records the trap in as many words: maxWorkers is 1,
   * so serial execution decides the ORDER but does not undo the write, and a
   * suite that leaves live rows behind fails somebody else's assertion about a
   * whole list. W03 learned it when policy.int.spec.ts broke
   * entity-scope.int.spec.ts; W25 Day 1 repeated it exactly — three tests in two
   * other suites went red on the first full run while this file was green in
   * isolation.
   */
  const teardown: (() => Promise<unknown>)[] = [];

  afterAll(async () => {
    for (const retire of teardown.reverse()) {
      await retire();
    }
    await moduleRef.close();
    restoreDevPrincipalEnv();
  });

  let seq = 0;

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-workflow', assignedEntityCodes: codes, rollUp }),
    );

  const createPolicy = async (code: 'SG1' | 'HK1' = 'SG1'): Promise<Policy> => {
    seq += 1;
    const row = await repo.create(await clientFor([code]), {
      orgEntityId: code === 'HK1' ? HK1 : SG1,
      title: `W25 transition subject ${seq}`,
    });

    teardown.push(async () =>
      (await clientFor([code])).policy.update({
        where: { id: row.id },
        data: { retiredAt: new Date() },
      }),
    );

    return row;
  };

  /**
   * Audit rows for ONE resource id, in write order.
   *
   * ⛔ By resource id, never by a count delta: jest runs integration suites in
   * parallel workers against one database, so "the table grew by one" is a race
   * between suites — the reason audit-coverage.int.spec.ts:180-184 gives.
   */
  const auditRowsFor = async (resourceId: string): Promise<AuditRow[]> => {
    const client = await clientFor(['SG1']);
    const rows = await client.auditLog.findMany({
      where: { resourceId },
      orderBy: { id: 'asc' },
    });
    return rows as unknown as AuditRow[];
  };

  const statusOf = async (id: string, code: 'SG1' | 'HK1' = 'SG1'): Promise<PolicyStatus | null> =>
    (await repo.byId(await clientFor([code]), id))?.status ?? null;

  const rawAs = async (url: string | undefined, scope?: string): Promise<Client> => {
    const client = new Client({ connectionString: url });
    await client.connect();
    if (scope !== undefined) await client.query(`SET app.entity_scope = '${scope}'`);
    return client;
  };

  // === US-2 / AC-2: what one legal transition records =======================

  it('writes exactly one audit row per legal transition, naming the row and the new status', async () => {
    const policy = await createPolicy();

    await controller.transition(policy.id, { to: 'in_review' });

    const rows = await auditRowsFor(policy.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      // PascalCase: the recorder builds it from the Prisma MODEL name
      // (audit.recorder.ts:148), which is `Policy`, not the delegate name.
      operation: 'Policy.update',
      resourceType: 'Policy',
      resourceId: policy.id,
      orgEntityId: SG1,
      accessAllowed: true,
      // Asserted, not ignored: null is the honest answer until M4, and a
      // placeholder would answer "who did this" with a lie
      // (audit-coverage.int.spec.ts:201-203 makes the same call).
      actorId: null,
      actorScope: SG1,
    });
    expect((rows[0]?.after as { status?: string })?.status).toBe('in_review');
  });

  it('⛔ pins the limit: `before` is SQL NULL on every transition row', async () => {
    // Not an oversight and not fixable from here — runScoped hands $transaction
    // an array of UNSTARTED promises, so every column must be computable before
    // the domain write runs (audit.recorder.ts:20-31, :153). An INSERT..SELECT
    // could read prior state and is refused to this scope by eslint.config.mjs.
    // ⇒ ADR-0003 input. If this test ever goes red, the limit was lifted — go
    //   simplify the from-derivation below, which exists only because of it.
    const policy = await createPolicy();
    await controller.transition(policy.id, { to: 'in_review' });

    expect((await auditRowsFor(policy.id))[0]?.before).toBeNull();
  });

  it('⭐ reconstructs the from side of every transition from the chain', async () => {
    // This is the whole of AC-2's revised "from" requirement. A test that only
    // asserted `to` would pass against an audit trail that cannot answer "who
    // moved this policy out of approved" — the proxy-metric shape.
    const policy = await createPolicy();
    await controller.transition(policy.id, { to: 'in_review' });
    await controller.transition(policy.id, { to: 'approved' });
    await controller.transition(policy.id, { to: 'published' });

    const rows = await auditRowsFor(policy.id);
    const tos = rows.map((r) => (r.after as { status: PolicyStatus }).status);

    // The predecessor of row i is row i-1's `after`. Row 0 has no predecessor in
    // THIS chain — see the disjoint-resource-id test for why the create row is
    // not available here — so it comes from the schema default.
    const derived = tos.map((to, i) => [i === 0 ? POLICY_INITIAL_STATUS : tos[i - 1], to]);

    expect(derived).toEqual([
      ['draft', 'in_review'],
      ['in_review', 'approved'],
      ['approved', 'published'],
    ]);
  });

  it('⛔ pins the limit: the create row and the transition rows use different resource ids', async () => {
    // resolveResource() is `where.id ?? data.id ?? data.refCode`
    // (audit.recorder.ts:252-257). A create has no `where` and Prisma assigns the
    // id afterwards, so it files under the REF CODE; an update files under the
    // UUID. Consequence: no single `WHERE resource_id = ?` returns one policy's
    // whole history, which is why the derivation above starts from the default
    // instead of from the create row. ⇒ ADR-0003 input.
    const policy = await createPolicy();
    await controller.transition(policy.id, { to: 'in_review' });

    const byRefCode = await auditRowsFor(policy.refCode);
    const byId = await auditRowsFor(policy.id);

    expect(byRefCode.map((r) => r.operation)).toEqual(['Policy.create']);
    expect(byId.map((r) => r.operation)).toEqual(['Policy.update']);
  });

  // === AC-1: an illegal transition, through the composition that ships ======

  it('refuses an illegal transition with the legal alternatives, and writes nothing', async () => {
    const policy = await createPolicy();

    const error = await controller
      .transition(policy.id, { to: 'approved' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject({
      from: 'draft',
      to: 'approved',
      allowed: ['in_review'],
    });

    // Both halves matter: the row did not move, AND no audit row claims it did.
    // The guard runs before the write, so "nothing happened" has to mean nothing
    // was recorded either.
    expect(await statusOf(policy.id)).toBe('draft');
    expect(await auditRowsFor(policy.id)).toHaveLength(0);
  });

  it('rejects a status that is not on the enum before it reaches the database', async () => {
    const policy = await createPolicy();

    await expect(controller.transition(policy.id, { to: 'archived' })).rejects.toThrow(
      /must be one of/,
    );
  });

  it('answers 404 for a policy id that does not exist', async () => {
    await expect(
      controller.transition('00000000-0000-0000-0000-0000000000ff', { to: 'in_review' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // === AC-3 / 約束 8: the four scope tests ==================================

  it('scope 1 — a cross-entity read returns nothing, not a refusal', async () => {
    const policy = await createPolicy('SG1');

    expect(await repo.byId(await clientFor(['HK1']), policy.id)).toBeNull();
  });

  it('scope 2 — a cross-entity transition is refused AND the row is unchanged', async () => {
    const policy = await createPolicy('SG1');

    const result = await repo.transitionStatus(await clientFor(['HK1']), {
      id: policy.id,
      expected: 'draft',
      next: 'in_review',
    });

    expect(result).toBeNull();
    // The second half is the one that would be missed: a refusal that still
    // wrote would be a silent isolation failure, which is a compliance incident
    // rather than a bug (CLAUDE.md 約束 8).
    expect(await statusOf(policy.id)).toBe('draft');
    expect(await auditRowsFor(policy.id)).toHaveLength(0);
  });

  it('scope 3 — RLS refuses the same UPDATE on a raw connection, with no application layer present', async () => {
    // Independent standing: the repository could be deleted and this would hold.
    // Measured as an affected-row count rather than an error, because the policy
    // is FOR ALL with USING — an out-of-scope row is invisible to the UPDATE, so
    // PostgreSQL reports zero rows rather than raising.
    const policy = await createPolicy('SG1');
    const raw = await rawAs(process.env.DATABASE_URL, HK1);
    try {
      const result = await raw.query(
        `UPDATE policies SET status = 'in_review' WHERE id = $1 RETURNING id`,
        [policy.id],
      );
      expect(result.rowCount).toBe(0);
    } finally {
      await raw.end();
    }

    expect(await statusOf(policy.id)).toBe('draft');
  });

  it('⛔ scope 4 — a roll-up scope can READ across entities but cannot transition', async () => {
    // ⭐ NOT the test the plan expected, and the difference is a finding. A
    // roll-up scope names more than one entity, and a transition payload is
    // `{status}` with no orgEntityId — so resolveEntity() (audit.recorder.ts:229-244)
    // refuses rather than filing the evidence under a guessed entity.
    //
    // This branch was unreachable before today: every create carries its
    // orgEntityId in the payload. The first update in the tree is what reaches it.
    //
    // Failing closed is the right behaviour — 憲章 calls roll-up a cross-entity
    // READ — but it is behaviour nobody chose on purpose, so it is pinned here.
    const policy = await createPolicy('SG1');
    const rollUp = await clientFor(['APAC'], true);

    expect(await repo.byId(rollUp, policy.id)).not.toBeNull();

    await expect(
      repo.transitionStatus(rollUp, { id: policy.id, expected: 'draft', next: 'in_review' }),
    ).rejects.toThrow(/would guess/);

    expect(await statusOf(policy.id)).toBe('draft');
  });
});
