/**
 * File: apps/api/src/modules/action/action.controller.spec.ts
 * Purpose: That issueId is passed through untouched and no body field can sign off
 *   the action.
 * Category: Test (unit)
 * Scope: Phase W08
 *
 * Description:
 *   action.int.spec.ts proves the composite key refuses another entity's issue.
 *   Left here are the controller's own decisions — chiefly that it never inspects
 *   the parent, and that `status` / `completedAt` / `verifiedBy` have no route in
 *   from the request.
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ActionRepository } from '../../core-model/action.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Action } from '../../generated/prisma';
import { ActionController } from './action.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const ISSUE = '00000000-0000-0000-0000-000000000a80';

const VALID_BODY = {
  orgEntityId: SG1,
  issueId: ISSUE,
  description: 'Schedule a quarterly restore drill',
};

function row(id: string): Action {
  return { id, orgEntityId: SG1, issueId: ISSUE } as unknown as Action;
}

function build(createImpl?: () => Promise<Action>) {
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
  } as unknown as ActionRepository;

  return { controller: new ActionController(resolver, scoped, repo), resolverCalls, createCalls };
}

describe('ActionController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it('resolves the scope from the dev principal and nothing in the request', async () => {
    const { controller, resolverCalls } = build();

    await controller.create(VALID_BODY);

    expect(resolverCalls).toHaveLength(1);
    expect(JSON.stringify(resolverCalls[0])).not.toContain(SG1);
  });

  it('refuses each missing required field with 400', async () => {
    const { controller } = build();

    for (const key of ['orgEntityId', 'issueId', 'description'] as const) {
      const body = { ...VALID_BODY };
      delete (body as Record<string, unknown>)[key];
      await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('passes issueId through untouched — the database decides whether it is reachable', async () => {
    const { controller, createCalls } = build();

    await controller.create(VALID_BODY);

    // No lookup here or in the repository. Whether that id belongs to another
    // entity, or to nothing at all, is answered by one composite key with one
    // error — which is what stops the endpoint being an existence oracle.
    expect(createCalls[0]?.issueId).toBe(ISSUE);
  });

  it('has no route from the body to completion or verification', async () => {
    const { controller, createCalls } = build();

    await controller.create({
      ...VALID_BODY,
      status: 'verified',
      completedAt: '2026-09-30T00:00:00Z',
      verifiedBy: '00000000-0000-0000-0000-0000000000d0',
    } as Parameters<ActionController['create']>[0]);

    // All three together are an assignee signing off their own work. 02a:398
    // separates Completed from Verified precisely so that takes two actors.
    expect(createCalls[0]).not.toHaveProperty('status');
    expect(createCalls[0]).not.toHaveProperty('completedAt');
    expect(createCalls[0]).not.toHaveProperty('verifiedBy');
  });

  it('refuses an unparseable dueDate instead of storing NULL', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, dueDate: 'when we get to it' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createCalls).toHaveLength(0);
  });

  it('accepts an ISO-8601 dueDate and passes a Date, not a string', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, dueDate: '2026-09-30T00:00:00Z' });

    expect(createCalls[0]?.dueDate).toBeInstanceOf(Date);
  });

  it('refuses a non-string assigneeUserId rather than coercing it', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, assigneeUserId: 12345 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createCalls).toHaveLength(0);
  });

  it('refuses a non-object extensions with 400', async () => {
    const { controller } = build();

    await expect(
      controller.create({ ...VALID_BODY, extensions: 'owner=ops' }),
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
      throw new UnknownReferenceError('issue or assignee');
    });

    await expect(scoped.controller.create(VALID_BODY)).rejects.toBeInstanceOf(NotFoundException);
    await expect(unknown.controller.create(VALID_BODY)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks the response as dev-principal so nobody mistakes it for authenticated', async () => {
    const { controller } = build();

    expect(await controller.list()).toHaveProperty('_devPrincipal');
    expect(await controller.create(VALID_BODY)).toHaveProperty('_devPrincipal');
  });
});
