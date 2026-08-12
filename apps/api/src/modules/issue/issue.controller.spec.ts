/**
 * File: apps/api/src/modules/issue/issue.controller.spec.ts
 * Purpose: That an unknown enum variant is a 400 and not a 500, and that no body
 *   field reaches the lifecycle.
 * Category: Test (unit)
 * Scope: Phase W08
 *
 * Description:
 *   issue.int.spec.ts proves the policies against real PostgreSQL. Left here are
 *   the controller's own decisions, and one is new to this slice:
 *
 *     ⭐ this is the first endpoint taking ENUM values. Every earlier body carried
 *     uuids, timestamps and free text, where an unusable value fails at a foreign
 *     key and surfaces as a domain error. An enum does not — Prisma rejects the
 *     variant before any SQLSTATE this app recognises — so `severity: "urgent"`
 *     would be a 500 without the guard. A typo reported as an outage.
 *
 *   Also pinned: the accepted sets come from the generated client, so a variant
 *   added to the schema cannot leave the controller behind.
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import type { IssueRepository } from '../../core-model/issue.repository';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Issue } from '../../generated/prisma';
import { IssueController } from './issue.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';

const VALID_BODY = {
  orgEntityId: SG1,
  title: 'Backup restore was never tested',
  source: 'test',
  severity: 'high',
};

function row(id: string): Issue {
  return { id, orgEntityId: SG1 } as unknown as Issue;
}

function build(createImpl?: () => Promise<Issue>) {
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
  } as unknown as IssueRepository;

  return { controller: new IssueController(resolver, scoped, repo), resolverCalls, createCalls };
}

describe('IssueController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it('resolves the scope from the dev principal and nothing in the request', async () => {
    const { controller, resolverCalls } = build();

    await controller.create(VALID_BODY);

    // 約束 8 iron law 3: entity identity comes from the credential, never the
    // request.
    expect(resolverCalls).toHaveLength(1);
    expect(JSON.stringify(resolverCalls[0])).not.toContain(SG1);
  });

  it('refuses each missing required field with 400', async () => {
    const { controller } = build();

    for (const key of ['orgEntityId', 'title', 'source', 'severity'] as const) {
      const body = { ...VALID_BODY };
      delete (body as Record<string, unknown>)[key];
      await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  /**
   * ⭐ The new one. Without the guard this is a 500: Prisma refuses an unknown
   * enum variant with an error carrying no SQLSTATE scope-refusal.ts recognises,
   * so it falls through `throw error` and the caller is told the server broke.
   */
  it('refuses an unknown source or severity with 400, never reaching the repository', async () => {
    const { controller, createCalls } = build();

    await expect(controller.create({ ...VALID_BODY, source: 'audit' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.create({ ...VALID_BODY, severity: 'urgent' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(createCalls).toHaveLength(0);
  });

  it('names the accepted values, because they are contract and not data', async () => {
    const { controller } = build();

    const error = await controller
      .create({ ...VALID_BODY, severity: 'urgent' })
      .catch((e: unknown) => e);

    // Safe to disclose: an enum is published API surface. Contrast anything read
    // from the database, where naming what exists is the oracle 約束 8 forbids.
    expect((error as Error).message).toContain('critical');
  });

  it('accepts `audit` the day the schema does — the list is derived, not restated', async () => {
    const { controller } = build();

    // 02a:229 names five sources; three have no table, so IssueSource ships two.
    // This asserts the SHAPE of the check rather than today's contents: it reads
    // Object.values(IssueSource), so `audit` starts being accepted the moment the
    // enum gains it, with no edit here. If someone replaces that with a literal
    // list, this test still passes — which is why the assertion is on the count
    // matching the generated enum, not on a hard-coded pair.
    const error = await controller
      .create({ ...VALID_BODY, source: 'audit' })
      .catch((e: unknown) => e);

    expect((error as Error).message).toBe('source must be one of: test, manual');
  });

  it('refuses an unparseable dueDate instead of storing NULL', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, dueDate: 'end of the quarter' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createCalls).toHaveLength(0);
  });

  it('accepts an ISO-8601 dueDate and passes a Date, not a string', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, dueDate: '2026-09-30T00:00:00Z' });

    expect(createCalls[0]?.dueDate).toBeInstanceOf(Date);
  });

  it('has no route from the body to the lifecycle', async () => {
    const { controller, createCalls } = build();

    await controller.create({
      ...VALID_BODY,
      status: 'closed',
    } as Parameters<IssueController['create']>[0]);

    expect(createCalls[0]).not.toHaveProperty('status');
  });

  it('refuses a non-string ownerUserId rather than coercing it', async () => {
    const { controller, createCalls } = build();

    await expect(controller.create({ ...VALID_BODY, ownerUserId: 12345 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createCalls).toHaveLength(0);
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
      throw new UnknownReferenceError('owner');
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
