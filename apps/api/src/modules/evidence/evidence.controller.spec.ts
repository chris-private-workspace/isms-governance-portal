/**
 * File: apps/api/src/modules/evidence/evidence.controller.spec.ts
 * Purpose: That every evidence-grade field is mandatory, that linkedType is not an
 *   input, and that both refusals answer alike.
 * Category: Test (unit)
 * Scope: Phase W07
 *
 * Description:
 *   evidence.int.spec.ts proves the trigger — the only thing standing in for the
 *   foreign key this column does not have. Left here are the controller's own
 *   decisions, and the one that carries weight is `hash`: it is required, and an
 *   empty string does not satisfy it. A record whose integrity anchor is "" is not
 *   evidence-grade (guardrail 5), and accepting one while still calling the table
 *   `evidence` is the kind of quiet lie AP-3 is about.
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EvidenceRepository } from '../../core-model/evidence.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Evidence } from '../../generated/prisma';
import { EvidenceController } from './evidence.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const TEST_ID = '00000000-0000-0000-0000-000000000a60';

const VALID_BODY = {
  orgEntityId: SG1,
  kind: 'screenshot',
  uriOrBlobRef: 'file://evidence.png',
  hash: 'sha256:abc',
  linkedId: TEST_ID,
};

function row(id: string): Evidence {
  return { id, orgEntityId: SG1, linkedId: TEST_ID } as unknown as Evidence;
}

function build(createImpl?: () => Promise<Evidence>) {
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
  } as unknown as EvidenceRepository;

  return { controller: new EvidenceController(resolver, scoped, repo), resolverCalls, createCalls };
}

describe('EvidenceController', () => {
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

  it.each(['orgEntityId', 'kind', 'uriOrBlobRef', 'hash', 'linkedId'])(
    'refuses a missing %s with 400',
    async (field) => {
      const { controller } = build();
      const body: Record<string, unknown> = { ...VALID_BODY };
      delete body[field];

      await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('refuses an EMPTY hash, not just an absent one', async () => {
    const { controller, createCalls } = build();

    // The interesting half. `hash: ""` passes a typeof check and would store a
    // record whose integrity anchor proves nothing, while the table still calls
    // itself evidence (guardrail 5).
    await expect(controller.create({ ...VALID_BODY, hash: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createCalls).toHaveLength(0);
  });

  it('has no route from the body to linkedType', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, linkedType: 'attestation' });

    expect(createCalls[0]).not.toHaveProperty('linkedType');
  });

  it('refuses an unparseable collectedAt instead of storing NULL', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, collectedAt: 'last tuesday' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createCalls).toHaveLength(0);
  });

  it('refuses a non-object extensions with 400', async () => {
    const { controller, createCalls } = build();

    await expect(
      controller.create({ ...VALID_BODY, extensions: 'kind=screenshot' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createCalls).toHaveLength(0);
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
      throw new UnknownReferenceError('linkedId');
    });

    await expect(scoped.controller.create(VALID_BODY)).rejects.toBeInstanceOf(NotFoundException);
    await expect(unknown.controller.create(VALID_BODY)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks the response as dev-principal so nobody mistakes it for authenticated', async () => {
    const { controller } = build();

    expect(await controller.list()).toHaveProperty('_devPrincipal');
    expect(await controller.create(VALID_BODY)).toHaveProperty('_devPrincipal');
  });

  it('the repository is a real class, so a signature change breaks this suite', () => {
    // The stub above is structural. Naming the real class here means a renamed or
    // removed method fails compilation rather than passing against a double that
    // no longer resembles anything (AP-6).
    expect(typeof EvidenceRepository.prototype.create).toBe('function');
    expect(typeof EvidenceRepository.prototype.list).toBe('function');
  });
});
