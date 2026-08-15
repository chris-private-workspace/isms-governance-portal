/**
 * File: apps/api/src/modules/attestation/attestation.controller.spec.ts
 * Purpose: That subjectType is a checked input, that scope never comes from the
 *   request, and that both refusals answer alike.
 * Category: Test (unit)
 * Scope: Phase W14
 *
 * Description:
 *   attestation.int.spec.ts proves the trigger — including the one case it
 *   legitimately lets through (a group-shared control, reachable from any entity
 *   by design). Left here are the controller's own decisions, and the one that
 *   carries weight is `subjectType`: the Prisma enum is erased at compile time and
 *   a body arrives as unknown, so an unchecked value would reach the database and
 *   be refused by the trigger's unmapped-type branch instead — a 500-shaped path
 *   for what is plainly a client error.
 *
 * Created: 2026-08-15 (Phase W14)
 * Last Modified: 2026-08-15
 *
 * Modification History (newest-first):
 *   - 2026-08-15: Initial creation (Phase W14)
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AttestationRepository } from '../../core-model/attestation.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Attestation } from '../../generated/prisma';
import { AttestationController } from './attestation.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const POLICY_ID = '00000000-0000-0000-0000-0000000000f0';

const VALID_BODY = {
  orgEntityId: SG1,
  subjectType: 'policy',
  subjectId: POLICY_ID,
  result: 'acknowledged',
};

function row(id: string): Attestation {
  return { id, orgEntityId: SG1, subjectId: POLICY_ID } as unknown as Attestation;
}

function build(createImpl?: () => Promise<Attestation>) {
  const resolverCalls: unknown[] = [];
  const createCalls: Record<string, unknown>[] = [];

  const resolver = {
    resolve: async (assignment: unknown) => {
      resolverCalls.push(assignment);
      return {} as EntityScope;
    },
  } as unknown as EntityScopeResolver;

  const scoped = { forScope: () => ({}) } as unknown as ScopedPrismaFactory;

  const repo = {
    list: async () => [row('listed')],
    create: async (_client: unknown, input: Record<string, unknown>) => {
      createCalls.push(input);
      return createImpl ? createImpl() : row('created');
    },
  } as unknown as AttestationRepository;

  return {
    controller: new AttestationController(resolver, scoped, repo),
    resolverCalls,
    createCalls,
  };
}

describe('AttestationController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it('resolves the scope from the dev principal and nothing in the request', async () => {
    const { controller, resolverCalls } = build();

    await controller.create(VALID_BODY);

    // 約束 8 iron law 3: entity identity comes from a credential, never a
    // parameter. The body names SG1 and the assignment must not.
    expect(resolverCalls).toHaveLength(1);
    expect(JSON.stringify(resolverCalls[0])).not.toContain(SG1);
  });

  it.each(['orgEntityId', 'subjectId', 'result'])(
    'refuses a missing %s with 400',
    async (field) => {
      const { controller } = build();
      const body: Record<string, unknown> = { ...VALID_BODY };
      delete body[field];

      await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('refuses an EMPTY result, not just an absent one', async () => {
    const { controller, createCalls } = build();

    // An attestation whose outcome is "" records that someone touched a form, not
    // that they agreed to anything — the same judgement evidence applies to `hash`.
    await expect(controller.create({ ...VALID_BODY, result: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createCalls).toHaveLength(0);
  });

  /**
   * ⛔ The check that keeps a client error from arriving as a database error.
   *
   * The trigger refuses an unmapped subject_type too (it fails closed), but by
   * then it is a 23503 raised inside a write — the wrong shape for "you sent a
   * word that is not a subject type".
   */
  it.each(['assessment', 'risk', '', 'POLICY', 42, null])(
    'refuses subjectType %p with 400 before anything reaches the database',
    async (value) => {
      const { controller, createCalls } = build();

      await expect(controller.create({ ...VALID_BODY, subjectType: value })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(createCalls).toHaveLength(0);
    },
  );

  it('accepts both legal subject types', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, subjectType: 'policy' });
    await controller.create({ ...VALID_BODY, subjectType: 'control' });

    expect(createCalls.map((c) => c.subjectType)).toEqual(['policy', 'control']);
  });

  it('refuses an unparseable attestedAt instead of storing NULL', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, attestedAt: 'last tuesday' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createCalls).toHaveLength(0);
  });

  it('refuses a non-object extensions with 400', async () => {
    const { controller } = build();

    await expect(
      controller.create({ ...VALID_BODY, extensions: 'not-an-object' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a non-string userId with 400', async () => {
    const { controller } = build();

    await expect(controller.create({ ...VALID_BODY, userId: 42 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('turns an extension failure into 422 carrying the key', async () => {
    const { controller } = build(() => {
      throw new ExtensionValidationError('unknown key', 'nope');
    });

    const error = await controller.create(VALID_BODY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
  });

  /**
   * ⭐ The two refusals must be one answer. Whether the subject exists at all is
   * not something a caller gets to learn — a 403 for "not yours" and a 404 for
   * "no such row" would confirm the id was a real one somewhere.
   */
  it('turns both refusals into the same 404', async () => {
    const scopeRefused = build(() => {
      throw new ScopeRefusedError(SG1);
    });
    const unknownRef = build(() => {
      throw new UnknownReferenceError('subjectId');
    });

    const a = await scopeRefused.controller.create(VALID_BODY).catch((e: unknown) => e);
    const b = await unknownRef.controller.create(VALID_BODY).catch((e: unknown) => e);

    expect(a).toBeInstanceOf(NotFoundException);
    expect(b).toBeInstanceOf(NotFoundException);
  });

  it('marks the response as dev-principal so nobody mistakes it for authenticated', async () => {
    const { controller } = build();

    const created = await controller.create(VALID_BODY);
    const listed = await controller.list();

    // verification-discipline.md §Mock 的誠實原則: the marker is not optional, and
    // CH-012 measured what happens when one exists but does not fire for a whole
    // class of case — the passing test certified the gap.
    expect(created).toHaveProperty('_devPrincipal', true);
    expect(listed).toHaveProperty('_devPrincipal', true);
  });
});
