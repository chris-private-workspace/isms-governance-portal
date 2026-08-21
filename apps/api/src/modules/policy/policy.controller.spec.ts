/**
 * File: apps/api/src/modules/policy/policy.controller.spec.ts
 * Purpose: 404-not-403, the 422 translation, and that no request input reaches the scope.
 * Category: Test (unit)
 * Scope: Phase W03
 *
 * Description:
 *   policy.int.spec.ts proves the scoping against real PostgreSQL. What is left
 *   for a unit test is the controller's own decisions, and each is asserted by
 *   what it refuses:
 *
 *     - an id the scoped client cannot see produces 404, never 403
 *     - an extension failure produces 422 carrying the key, not a 500
 *     - resolve() is called with the dev principal and NOTHING from the request
 *
 *   The last one is the important one. 約束 8 鐵律 3 says the scope comes from a
 *   credential, never from a parameter — so the test asserts on the argument the
 *   resolver actually received, rather than trusting that no parameter was
 *   plumbed through.
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import type { PolicyRepository } from '../../core-model/policy.repository';
import { ScopeRefusedError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Policy, PolicyStatus } from '../../generated/prisma';
import { POLICY_STATUSES, POLICY_TRANSITIONS, allowedTargets } from '../../workflow/transitions';
import { PolicyController } from './policy.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const MINE = 'policy-mine';

// `status` defaults rather than being omitted: every real row has one, and a
// fixture without it would let `allowed` be computed from undefined and still
// look green.
function policy(id: string, status: PolicyStatus = 'draft'): Policy {
  return { id, orgEntityId: SG1, title: 't', extensions: {}, status } as unknown as Policy;
}

function build(rows: Policy[] = [policy(MINE)]) {
  const resolverCalls: unknown[] = [];

  const resolver = {
    resolve: async (assignment: unknown) => {
      resolverCalls.push(assignment);
      return {} as EntityScope;
    },
  } as unknown as EntityScopeResolver;

  const scoped = { forScope: () => ({}) } as unknown as ScopedPrismaFactory;

  const repo = {
    list: async () => rows,
    create: async () => policy('created'),
  } as unknown as PolicyRepository;

  return {
    controller: new PolicyController(resolver, scoped, repo),
    resolverCalls,
    repo,
  };
}

describe('PolicyController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it('marks every response as dev-principal scoped', async () => {
    const { controller } = build();

    const listed = await controller.list();
    const single = await controller.byId(MINE);

    expect(listed).toMatchObject({ _devPrincipal: true });
    expect(single).toMatchObject({ _devPrincipal: true });
  });

  // ---- 鐵律 3 ----

  it('resolves the scope from the principal only — nothing from the request', async () => {
    const { controller, resolverCalls } = build();

    // Deliberately an id that will 404. The scope must already have been
    // resolved by then, and resolved from the principal — what the caller asked
    // for must not have reached that decision even on the failing path.
    await controller.byId('any-id-a-caller-chose').catch(() => undefined);

    expect(resolverCalls).toHaveLength(1);
    expect(resolverCalls[0]).toEqual({
      subjectId: 'dev-principal',
      assignedEntityCodes: ['SG1'],
      rollUp: false,
    });
    // The id the caller supplied must not appear anywhere in what decided scope.
    expect(JSON.stringify(resolverCalls[0])).not.toContain('any-id-a-caller-chose');
  });

  // ---- 404, never 403 ----

  it('answers 404 for a row the scoped client cannot see', async () => {
    const { controller } = build([policy(MINE)]);

    await expect(controller.byId('someone-elses-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 404 identically for a row that never existed', async () => {
    const { controller } = build([]);

    const outOfScope = await controller.byId('someone-elses-id').catch((e) => e);
    const neverExisted = await controller.byId('never-existed').catch((e) => e);

    // Same class AND same message shape: a caller must not be able to tell the
    // two apart, because telling them apart confirms an id exists.
    expect(outOfScope).toBeInstanceOf(NotFoundException);
    expect(neverExisted).toBeInstanceOf(NotFoundException);
    expect(outOfScope.message.replace(/someone-elses-id/, 'X')).toBe(
      neverExisted.message.replace(/never-existed/, 'X'),
    );
  });

  // ---- body validation ----

  // Cases, in order: both fields missing · no orgEntityId · no title ·
  // orgEntityId present but not a string.
  it.each([{}, { title: 'x' }, { orgEntityId: SG1 }, { orgEntityId: 1, title: 'x' }])(
    'rejects an invalid body (case %#)',
    async (body) => {
      const { controller } = build();

      await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects extensions that are not an object', async () => {
    const { controller } = build();

    await expect(
      controller.create({ orgEntityId: SG1, title: 'x', extensions: 'nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ---- 422, not 500 ----

  it('translates an extension failure into 422 carrying the key', async () => {
    const { controller, repo } = build();
    (repo as { create: unknown }).create = async () => {
      throw new ExtensionValidationError('extension key "nope" is not declared', 'nope');
    };

    const error = await controller
      .create({ orgEntityId: SG1, title: 'x', extensions: { nope: 1 } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error.getResponse()).toMatchObject({ key: 'nope' });
  });

  // ---- a refused write is 404, not 500 ----

  it('answers 404 when the database refuses the write for scope', async () => {
    const { controller, repo } = build();
    (repo as { create: unknown }).create = async () => {
      throw new ScopeRefusedError(HK1);
    };

    const error = await controller.create({ orgEntityId: HK1, title: 'planted' }).catch((e) => e);

    // 500 was the pre-fix behaviour: an authorisation outcome filed as an
    // outage, which loses the attempt in the noise of real failures.
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.message).not.toMatch(/scope|denied|forbidden|permission/i);
  });

  it('answers a refused write identically to a write naming nothing real', async () => {
    const { controller, repo } = build();
    (repo as { create: unknown }).create = async (_c: unknown, input: { orgEntityId: string }) => {
      // Both cases arrive here as the same error, because postgres evaluates the
      // RLS WITH CHECK before the foreign key and never reaches 23503 (W03 Day 3
      // measured 4 × 42501, 0 × 23503 against the running API).
      throw new ScopeRefusedError(input.orgEntityId);
    };

    const real = await controller.create({ orgEntityId: HK1, title: 'x' }).catch((e) => e);
    const fictional = await controller
      .create({ orgEntityId: '11111111-2222-3333-4444-555555555555', title: 'x' })
      .catch((e) => e);

    expect(real.getStatus()).toBe(fictional.getStatus());
    expect(real.message.replace(HK1, 'X')).toBe(
      fictional.message.replace('11111111-2222-3333-4444-555555555555', 'X'),
    );
  });

  it('does not swallow errors that are not the caller fault', async () => {
    const { controller, repo } = build();
    const boom = new Error('connection lost');
    (repo as { create: unknown }).create = async () => {
      throw boom;
    };

    await expect(controller.create({ orgEntityId: SG1, title: 'x' })).rejects.toBe(boom);
  });

  // ---- `allowed`: the edges, derived (W26) ----
  //
  // ⛔ EVERY EXPECTATION BELOW IS DERIVED FROM POLICY_TRANSITIONS, NEVER TYPED
  // OUT. A hand-written expectation would be edited in the same commit as any
  // change to the table, so it could never catch the table changing — it would
  // only assert that two hand-copies agree, which is the shape W25 measured as
  // worthless (`wc -l` counting comment density). Derived, these tests fail the
  // moment the controller stops reading the table.

  it('attaches the legal next states to every listed row', async () => {
    const rows = POLICY_STATUSES.map((status) => policy(`p-${status}`, status));
    const { controller } = build(rows);

    const listed = (await controller.list()) as {
      data: { status: PolicyStatus; allowed: readonly PolicyStatus[] }[];
    };

    // ⛔ Anti-vacuity first: an empty POLICY_STATUSES would make the loop below
    // run zero times and `toHaveLength(0)` agree with it, so this test would
    // pass while asserting nothing. Same guard i18n.test.ts:149 uses.
    expect(POLICY_STATUSES.length).toBeGreaterThan(0);

    // Every state, not a sample: the map has as many keys as the result has rows.
    expect(listed.data).toHaveLength(POLICY_STATUSES.length);
    for (const row of listed.data) {
      expect(row.allowed).toEqual(allowedTargets(row.status));
    }
  });

  it('gives a terminal state an empty list, not a missing field', async () => {
    // transitions.ts:63-67 argues the empty array is a CLAIM. A caller that got
    // `undefined` would have to decide what absence meant, and the two obvious
    // readings — "no edges" and "not computed" — render differently.
    const { controller } = build([policy('p-retired', 'retired')]);

    const listed = (await controller.list()) as { data: { allowed: unknown }[] };

    expect(listed.data[0]).toHaveProperty('allowed');
    expect(listed.data[0]?.allowed).toEqual([]);
    expect(POLICY_TRANSITIONS.retired).toEqual([]); // the premise, asserted
  });

  it('attaches them on the single-row read too', async () => {
    const { controller } = build([policy(MINE, 'in_review')]);

    const single = (await controller.byId(MINE)) as {
      data: { allowed: readonly PolicyStatus[] };
    };

    expect(single.data.allowed).toEqual(allowedTargets('in_review'));
  });

  it('⭐ a transition answers with the NEW state edges, not the old ones', async () => {
    // This is the half AC-5 depends on. The caller replaces its row with this
    // response; if `allowed` described the state the row just left, the screen
    // would offer the wrong actions until something refetched — and it would
    // look right, because the status beside them would already be correct.
    const before = policy(MINE, 'draft');
    const after = policy(MINE, 'in_review');
    const { controller, repo } = build([before]);
    (repo as { byId: unknown }).byId = async () => before;
    (repo as { transitionStatus: unknown }).transitionStatus = async () => after;

    const answer = (await controller.transition(MINE, { to: 'in_review' })) as {
      data: { status: PolicyStatus; allowed: readonly PolicyStatus[] };
    };

    expect(answer.data.status).toBe('in_review');
    expect(answer.data.allowed).toEqual(allowedTargets('in_review'));
    // Named explicitly so the failure message says WHICH state leaked through.
    expect(answer.data.allowed).not.toEqual(allowedTargets('draft'));
  });
});
