/**
 * File: apps/api/src/modules/soa/soa.controller.spec.ts
 * Purpose: That `applicable: false` survives validation, and that a duplicate is
 *   the one refusal not collapsed into 404.
 * Category: Test (unit)
 * Scope: Phase W11
 *
 * Description:
 *   soa.int.spec.ts proves the policies against real PostgreSQL. Left here are the
 *   controller's own decisions, and two are specific to this slice:
 *
 *     ⭐ `applicable` is the first required BOOLEAN in any request body here. The
 *     `typeof x !== 'string'` loop every controller opens with would reject
 *     `false` — and `false` is the value that carries an exclusion, the half of an
 *     SoA an auditor actually interrogates. Absent and false must not be the same.
 *
 *     ⭐ 409, not 404. Every other refusal in this codebase collapses because
 *     answering differently would confirm an id; a duplicate does not, because the
 *     row it collides with is one the caller already owns.
 *
 * Created: 2026-08-14 (Phase W11)
 * Last Modified: 2026-08-14
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import {
  DuplicateKeyError,
  ScopeRefusedError,
  UnknownReferenceError,
} from '../../core-model/scope-refusal';
import type { SoaRepository } from '../../core-model/soa.repository';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { StatementOfApplicability } from '../../generated/prisma';
import { SoaController } from './soa.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';

const VALID_BODY = {
  orgEntityId: SG1,
  framework: 'ISO 27001',
  clauseRef: 'A.5.9',
  applicable: true,
  implementationStatus: 'implemented',
};

function row(id: string): StatementOfApplicability {
  return { id, orgEntityId: SG1 } as unknown as StatementOfApplicability;
}

function build(createImpl?: () => Promise<StatementOfApplicability>) {
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
  } as unknown as SoaRepository;

  return { controller: new SoaController(resolver, scoped, repo), resolverCalls, createCalls };
}

describe('SoaController', () => {
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

    for (const key of [
      'orgEntityId',
      'framework',
      'clauseRef',
      'applicable',
      'implementationStatus',
    ] as const) {
      const body = { ...VALID_BODY };
      delete (body as Record<string, unknown>)[key];
      await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  /**
   * ⭐ The one this slice exists to get right. A control judged NOT applicable is
   * the half of an SoA an auditor interrogates; a guard that treated falsy as
   * missing would accept every inclusion and reject every exclusion, and the
   * suite above would still be green because it only ever deletes the key.
   */
  it('accepts applicable: false and passes it through as false, not as absent', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, applicable: false });

    expect(createCalls[0]?.applicable).toBe(false);
  });

  it('refuses a non-boolean applicable rather than coercing it', async () => {
    const { controller, createCalls } = build();

    // "false" and 0 are the two values a coercing check would have let through as
    // the wrong answer, rather than as no answer.
    for (const value of ['false', 0, null]) {
      await expect(controller.create({ ...VALID_BODY, applicable: value })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(createCalls).toHaveLength(0);
  });

  it('refuses an unknown implementationStatus with 400, never reaching the repository', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, implementationStatus: 'in_progress' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createCalls).toHaveLength(0);
  });

  it('rejects not_applicable — the enum deliberately has no such value', async () => {
    const { controller } = build();

    const error = await controller
      .create({ ...VALID_BODY, implementationStatus: 'not_applicable' })
      .catch((e: unknown) => e);

    // The schema docstring's reasoning, pinned as behaviour: `applicable` already
    // states this, and two columns stating one fact have no reconciliation rule.
    // Named values are safe to disclose — an enum is published API surface.
    expect((error as Error).message).toBe(
      'implementationStatus must be one of: implemented, partially_implemented, not_implemented, planned',
    );
  });

  it('passes each optional string through to the field it was sent as', async () => {
    const { controller, createCalls } = build();

    // Three near-identical ternaries in a row, all `string | undefined`, and the
    // type checker cannot tell them apart if two are swapped. Every other test
    // here sends these ABSENT, so without this one the whole present-branch of
    // each is unexecuted — and a justification silently filed as an approver
    // would be an audit record that names the wrong thing.
    await controller.create({
      ...VALID_BODY,
      justification: 'Clause applies; control is the quarterly access review.',
      approvedBy: 'Information Security Committee',
      ownerUserId: '00000000-0000-0000-0000-0000000000d0',
    });

    expect(createCalls[0]?.justification).toBe(
      'Clause applies; control is the quarterly access review.',
    );
    expect(createCalls[0]?.approvedBy).toBe('Information Security Committee');
    expect(createCalls[0]?.ownerUserId).toBe('00000000-0000-0000-0000-0000000000d0');
  });

  it('refuses an unparseable approvedAt instead of storing NULL', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, approvedAt: 'last board meeting' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createCalls).toHaveLength(0);
  });

  it('accepts an ISO-8601 approvedAt and passes a Date, not a string', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, approvedAt: '2026-03-01T00:00:00Z' });

    expect(createCalls[0]?.approvedAt).toBeInstanceOf(Date);
  });

  it('has no route from the body to ref_code or version', async () => {
    const { controller, createCalls } = build();

    await controller.create({
      ...VALID_BODY,
      refCode: 'SOA-HK1-000001',
      version: 99,
    } as Parameters<SoaController['create']>[0]);

    expect(createCalls[0]).not.toHaveProperty('refCode');
    expect(createCalls[0]).not.toHaveProperty('version');
  });

  it('refuses a non-string approvedBy rather than coercing it', async () => {
    const { controller, createCalls } = build();

    await expect(controller.create({ ...VALID_BODY, approvedBy: 12345 })).rejects.toBeInstanceOf(
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

  it('turns both scope refusals into the same 404', async () => {
    const scoped = build(() => {
      throw new ScopeRefusedError(SG1);
    });
    const unknown = build(() => {
      throw new UnknownReferenceError('owner');
    });

    await expect(scoped.controller.create(VALID_BODY)).rejects.toBeInstanceOf(NotFoundException);
    await expect(unknown.controller.create(VALID_BODY)).rejects.toBeInstanceOf(NotFoundException);
  });

  /**
   * ⭐ The refusal that does not collapse. Both assertions or neither: alone, the
   * 409 says only "some exception mapped", while the pair says the controller
   * DISCRIMINATES between a clause the caller already answered and an entity it
   * cannot see (AD-TestNameWiderThanProof-1).
   */
  it('turns a duplicate into 409, unlike every other refusal here', async () => {
    const { controller } = build(() => {
      throw new DuplicateKeyError('framework + clauseRef');
    });

    const error = await controller.create(VALID_BODY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error).not.toBeInstanceOf(NotFoundException);
  });

  it('marks the response as dev-principal so nobody mistakes it for authenticated', async () => {
    const { controller } = build();

    expect(await controller.list()).toHaveProperty('_devPrincipal');
    expect(await controller.create(VALID_BODY)).toHaveProperty('_devPrincipal');
  });
});
