/**
 * File: apps/api/src/modules/control-test/control-test.controller.spec.ts
 * Purpose: That the scope comes from the principal, that a bad timestamp is refused
 *   rather than dropped, and that no body field reaches the lifecycle.
 * Category: Test (unit)
 * Scope: Phase W07
 *
 * Description:
 *   control-test.int.spec.ts proves the policies and the trigger against real
 *   PostgreSQL. Left here are the controller's own decisions, and two of them are
 *   non-decisions worth pinning:
 *
 *     - there is no route from the request body to `status`. The repository drops
 *       it, but a body field that silently does nothing is how an API grows a lie.
 *     - an unparseable `scheduledFor` is a 400, not a NULL. Storing NULL would let
 *       the caller believe the value was accepted (AD-SilentFieldDrop-1).
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ControlTestRepository } from '../../core-model/control-test.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { ControlTest } from '../../generated/prisma';
import { ControlTestController } from './control-test.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const CONTROL = '00000000-0000-0000-0000-000000000a50';

const VALID_BODY = { orgEntityId: SG1, controlId: CONTROL };

function row(id: string): ControlTest {
  return { id, orgEntityId: SG1, controlId: CONTROL } as unknown as ControlTest;
}

function build(createImpl?: () => Promise<ControlTest>) {
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
  } as unknown as ControlTestRepository;

  return {
    controller: new ControlTestController(resolver, scoped, repo),
    resolverCalls,
    createCalls,
  };
}

describe('ControlTestController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it('resolves the scope from the dev principal and nothing in the request', async () => {
    const { controller, resolverCalls } = build();

    await controller.create({ ...VALID_BODY, orgEntityId: SG1 });

    // 約束 8 iron law 3: entity identity comes from the credential, never the
    // request. If a body field ever reached this call the whole model is gone.
    expect(resolverCalls).toHaveLength(1);
    expect(JSON.stringify(resolverCalls[0])).not.toContain(SG1);
  });

  it('refuses a missing orgEntityId or controlId with 400', async () => {
    const { controller } = build();

    await expect(controller.create({ controlId: CONTROL })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.create({ orgEntityId: SG1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses an unparseable scheduledFor instead of storing NULL', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, scheduledFor: 'sometime next quarter' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // The repository must never have been reached: a rejected value that still
    // produced a row is the silent-drop failure wearing a 201.
    expect(createCalls).toHaveLength(0);
  });

  it('accepts an ISO-8601 scheduledFor and passes a Date, not a string', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, scheduledFor: '2026-09-30T00:00:00Z' });

    expect(createCalls[0]?.scheduledFor).toBeInstanceOf(Date);
  });

  it('has no route from the body to the lifecycle', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, status: 'passed', conclusion: 'fine' });

    expect(createCalls[0]).not.toHaveProperty('status');
    expect(createCalls[0]).not.toHaveProperty('conclusion');
  });

  it('refuses a non-string testerUserId rather than coercing it', async () => {
    const { controller, createCalls } = build();

    // A number here is a plausible client bug (an employee id, not a uuid).
    // Coercing it would send a value the users foreign key then rejects as a
    // 404, which reads as "that person does not exist" for a type error.
    await expect(controller.create({ ...VALID_BODY, testerUserId: 12345 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createCalls).toHaveLength(0);
  });

  it('refuses a scheduledFor that is not even a string', async () => {
    const { controller } = build();

    // The other half of readTimestamp's guard: `new Date(1759190400000)` is a
    // perfectly valid Date, so without the typeof check an epoch number would be
    // silently accepted through a field documented as ISO-8601.
    await expect(
      controller.create({ ...VALID_BODY, scheduledFor: 1759190400000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a non-object extensions with 400', async () => {
    const { controller } = build();

    await expect(
      controller.create({ ...VALID_BODY, extensions: 'reviewCycle=annual' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('turns an extension failure into 422 carrying the key', async () => {
    const { controller } = build(() => {
      throw new ExtensionValidationError('unknown key', 'nope');
    });

    await expect(controller.create(VALID_BODY)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('turns both refusals into the same 404', async () => {
    const scoped = build(() => {
      throw new ScopeRefusedError(SG1);
    });
    const unknown = build(() => {
      throw new UnknownReferenceError('control or tester');
    });

    // Two different causes, one answer. Which of them it was — and whether the
    // thing exists at all — is not something the caller gets to learn.
    await expect(scoped.controller.create(VALID_BODY)).rejects.toBeInstanceOf(NotFoundException);
    await expect(unknown.controller.create(VALID_BODY)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks the response as dev-principal so nobody mistakes it for authenticated', async () => {
    const { controller } = build();

    const listed = await controller.list();
    const created = await controller.create(VALID_BODY);

    expect(listed).toHaveProperty('_devPrincipal');
    expect(created).toHaveProperty('_devPrincipal');
  });
});
