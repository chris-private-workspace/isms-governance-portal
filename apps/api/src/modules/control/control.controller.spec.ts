/**
 * File: apps/api/src/modules/control/control.controller.spec.ts
 * Purpose: That the scope comes from the principal, the enums are the spec's, and
 *   nothing lets a caller reach applies_to_scope.
 * Category: Test (unit)
 * Scope: Phase W06
 *
 * Description:
 *   control.int.spec.ts proves the policies against real PostgreSQL. Left here
 *   are the controller's own decisions, and one of them is a non-decision worth
 *   pinning: there is no route from the request body to `applies_to_scope`. The
 *   database would refuse it anyway, but a body field that silently does nothing
 *   is how an API grows a lie.
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ControlRepository } from '../../core-model/control.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Control } from '../../generated/prisma';
import { ControlController } from './control.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';

const VALID_BODY = {
  orgEntityId: SG1,
  title: 'Quarterly privileged access recertification',
  type: 'detective',
  nature: 'manual',
  frequency: 'quarterly',
};

function control(id: string): Control {
  return { id, orgEntityId: SG1, title: 't' } as unknown as Control;
}

function build(createImpl?: () => Promise<Control>) {
  const resolverCalls: unknown[] = [];
  const createCalls: unknown[] = [];

  const resolver = {
    resolve: async (assignment: unknown) => {
      resolverCalls.push(assignment);
      return {} as EntityScope;
    },
  } as unknown as EntityScopeResolver;

  const scoped = { forScope: () => ({}) } as unknown as ScopedPrismaFactory;

  const repo = {
    list: async () => [control('listed')],
    create: async (_client: unknown, input: unknown) => {
      createCalls.push(input);
      return createImpl ? createImpl() : control('created');
    },
  } as unknown as ControlRepository;

  return { controller: new ControlController(resolver, scoped, repo), resolverCalls, createCalls };
}

describe('ControlController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it('resolves the scope from the dev principal and nothing in the request', async () => {
    const { controller, resolverCalls } = build();

    await controller.create({ ...VALID_BODY });

    expect(resolverCalls).toHaveLength(1);
    const seen = resolverCalls[0] as Record<string, unknown>;
    expect(Object.keys(seen).sort()).toEqual(['assignedEntityCodes', 'rollUp', 'subjectId']);
    expect(JSON.stringify(seen)).not.toContain(SG1);
  });

  it('never forwards applies_to_scope or effectiveness, however the body is dressed up', async () => {
    const { controller, createCalls } = build();

    await controller.create({
      ...VALID_BODY,
      appliesToScope: 'group',
      applies_to_scope: 'group',
      effectiveness: 'effective',
    } as Record<string, unknown>);

    const forwarded = createCalls[0] as Record<string, unknown>;
    expect(Object.keys(forwarded).sort()).toEqual([
      'description',
      'extensions',
      'frameworkRefs',
      'frequency',
      'nature',
      'orgEntityId',
      'title',
      'type',
    ]);
  });

  it('answers 404 for an out-of-scope entity — never 403', async () => {
    const { controller } = build(() => Promise.reject(new ScopeRefusedError(SG1)));

    await expect(controller.create({ ...VALID_BODY })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 422 carrying the key when an extension is invalid', async () => {
    const { controller } = build(() =>
      Promise.reject(new ExtensionValidationError('unknown key: foo', 'foo')),
    );

    const error = await controller.create({ ...VALID_BODY }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject({ key: 'foo' });
  });

  it.each([['orgEntityId'], ['title']])('refuses a body missing %s with 400', async (field) => {
    const { controller } = build();
    const body: Record<string, unknown> = { ...VALID_BODY };
    delete body[field];

    await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['type', 'mitigating'],
    ['nature', 'semi-automated'],
    ['frequency', 'fortnightly'],
  ])('refuses an invalid %s with 400', async (field, value) => {
    const { controller } = build();

    await expect(controller.create({ ...VALID_BODY, [field]: value })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses frameworkRefs that is a bare string rather than wrapping it', async () => {
    const { controller } = build();

    // Wrapping would make `"A.5.9, A.8.1"` — one string holding two clauses —
    // indistinguishable from a correct single-element array.
    await expect(
      controller.create({ ...VALID_BODY, frameworkRefs: 'ISO 27001 A.5.9' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts an absent frameworkRefs and forwards undefined, not []', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY });

    // The repository owns the empty-array default; two places deciding it is how
    // they drift.
    expect((createCalls[0] as Record<string, unknown>)['frameworkRefs']).toBeUndefined();
  });

  it('forwards a description when one is given', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, description: 'Reviewed by the SG1 ISO each quarter' });

    expect((createCalls[0] as Record<string, unknown>)['description']).toBe(
      'Reviewed by the SG1 ISO each quarter',
    );
  });

  it('forwards a valid frameworkRefs array unchanged', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, frameworkRefs: ['ISO 27001 A.5.15', 'A.8.2'] });

    expect((createCalls[0] as Record<string, unknown>)['frameworkRefs']).toEqual([
      'ISO 27001 A.5.15',
      'A.8.2',
    ]);
  });

  it('refuses an array holding a non-string clause', async () => {
    const { controller } = build();

    // `[null]` or `[{}]` reaching the database would become a Prisma type error
    // several layers down, reported as 500 — a caller's mistake recorded as an
    // outage.
    await expect(
      controller.create({ ...VALID_BODY, frameworkRefs: ['A.5.9', null] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a non-object extensions with 400, not a 500 from deeper down', async () => {
    const { controller } = build();

    await expect(
      controller.create({ ...VALID_BODY, extensions: 'reviewCycle=annual' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets an unrecognised error through untranslated', async () => {
    const boom = new Error('connection reset');
    const { controller } = build(() => Promise.reject(boom));

    // ⚠️ A controller that mapped everything to 404 would report an outage as
    // "not found" — and the entity-scope 404s would stop meaning anything.
    await expect(controller.create({ ...VALID_BODY })).rejects.toBe(boom);
  });

  it('marks every response as coming from the dev principal', async () => {
    const { controller } = build();

    expect(await controller.list()).toHaveProperty('_devPrincipal');
  });
});
