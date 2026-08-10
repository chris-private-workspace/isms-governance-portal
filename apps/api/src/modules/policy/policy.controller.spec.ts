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
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Policy } from '../../generated/prisma';
import { PolicyController } from './policy.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const MINE = 'policy-mine';

function policy(id: string): Policy {
  return { id, orgEntityId: SG1, title: 't', extensions: {} } as unknown as Policy;
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

  it('does not swallow errors that are not the caller fault', async () => {
    const { controller, repo } = build();
    const boom = new Error('connection lost');
    (repo as { create: unknown }).create = async () => {
      throw boom;
    };

    await expect(controller.create({ orgEntityId: SG1, title: 'x' })).rejects.toBe(boom);
  });
});
