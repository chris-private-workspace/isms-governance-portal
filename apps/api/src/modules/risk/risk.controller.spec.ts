/**
 * File: apps/api/src/modules/risk/risk.controller.spec.ts
 * Purpose: The two refusals that share one answer, the 422 translation, and that no request input reaches the scope.
 * Category: Test (unit)
 * Scope: Phase W05
 *
 * Description:
 *   risk.int.spec.ts proves the scoping and the formula against real PostgreSQL.
 *   What is left here is the controller's own decisions:
 *
 *     - ScopeRefusedError AND UnknownReferenceError both produce 404. Two
 *       different database refusals, one answer — if either ever produced a
 *       distinct status, the pair would become an oracle.
 *     - a bad score produces 422 carrying the COLUMN, not a 500
 *     - resolve() is called with the dev principal and NOTHING from the request
 *
 *   The last one is asserted on the argument the resolver actually received,
 *   rather than by trusting that no parameter was plumbed through (約束 8 鐵律 3).
 *
 * Created: 2026-08-11 (Phase W05)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Add byId cases (Phase W22) — the two 404s must be one answer
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import type { RiskRepository } from '../../core-model/risk.repository';
import { RiskScoreValidationError } from '../../core-model/risk-score';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Risk } from '../../generated/prisma';
import { RiskController } from './risk.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const ASSET = '00000000-0000-0000-0000-000000000a20';
const THREAT = '00000000-0000-0000-0000-000000000a30';
const VULN = '00000000-0000-0000-0000-000000000a40';

const VALID_BODY = {
  orgEntityId: SG1,
  title: 'Credential stuffing',
  assetId: ASSET,
  threatId: THREAT,
  vulnerabilityId: VULN,
  ciaType: 'cia',
};

function risk(id: string): Risk {
  return { id, orgEntityId: SG1, title: 't' } as unknown as Risk;
}

function build(createImpl?: () => Promise<Risk>, rows: Risk[] = [risk('listed')]) {
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
    list: async () => rows,
    create: async (_client: unknown, input: unknown) => {
      createCalls.push(input);
      return createImpl ? createImpl() : risk('created');
    },
  } as unknown as RiskRepository;

  return { controller: new RiskController(resolver, scoped, repo), resolverCalls, createCalls };
}

describe('RiskController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it('resolves the scope from the dev principal and nothing in the request', async () => {
    const { controller, resolverCalls } = build();

    await controller.create({ ...VALID_BODY, orgEntityId: SG1 });

    // The resolver sees a principal, not a body. If a future edit threaded an
    // entity id from the request into resolve(), this is what would catch it.
    expect(resolverCalls).toHaveLength(1);
    const seen = resolverCalls[0] as Record<string, unknown>;
    expect(Object.keys(seen).sort()).toEqual(['assignedEntityCodes', 'rollUp', 'subjectId']);
    expect(JSON.stringify(seen)).not.toContain(SG1);
  });

  // ---- the two refusals that must be indistinguishable ----

  it.each([
    ['out-of-scope entity', new ScopeRefusedError(SG1)],
    ['unreachable asset', new UnknownReferenceError('asset, threat or vulnerability')],
  ])('answers 404 for %s — never 403', async (_label, thrown) => {
    const { controller } = build(() => Promise.reject(thrown));

    await expect(controller.create({ ...VALID_BODY })).rejects.toBeInstanceOf(NotFoundException);
  });

  // ---- the caller's data ----

  it('answers 422 carrying the column when a score is out of band', async () => {
    const { controller } = build(() =>
      Promise.reject(new RiskScoreValidationError('lkh_before must be 1–5', 'lkh_before')),
    );

    const error = await controller.create({ ...VALID_BODY }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject({
      key: 'lkh_before',
    });
  });

  it.each([['orgEntityId'], ['title'], ['assetId'], ['threatId'], ['vulnerabilityId']])(
    'refuses a body missing %s with 400',
    async (field) => {
      const { controller } = build();
      const body: Record<string, unknown> = { ...VALID_BODY };
      delete body[field];

      await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('refuses a ciaType outside the seven combinations', async () => {
    const { controller } = build();

    await expect(controller.create({ ...VALID_BODY, ciaType: 'x' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // The empty combination is not one of the seven either — three booleans
    // would have allowed it, which is why D3 chose an enum.
    await expect(controller.create({ ...VALID_BODY, ciaType: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  // ---- what reaches the repository ----

  it('passes score sets through unchanged, including values a validator must reject', async () => {
    const { controller, createCalls } = build();

    await controller.create({ ...VALID_BODY, before: { lkh: '4', fin: 2 } });

    // "4" is NOT dropped. Dropping it would turn a typo into a silently absent
    // field, which the all-or-none rule would then report as a different problem.
    expect(createCalls[0]).toMatchObject({ before: { lkh: '4', fin: 2 } });
  });

  it('never forwards a score to the repository, even when one is sent', async () => {
    const { controller, createCalls } = build();

    // ⚠️ The cast is the point, not a workaround. `CreateRiskBody` has no
    // `scoreBefore`, so TypeScript refuses this literal outright — a typed
    // caller CANNOT express it. The cast reproduces what an untyped HTTP client
    // actually sends, which is the only way this field ever arrives.
    await controller.create({
      ...VALID_BODY,
      scoreBefore: 1,
      acceptanceStatus: 'acceptable',
    } as Record<string, unknown>);

    expect(createCalls[0]).not.toHaveProperty('scoreBefore');
    expect(createCalls[0]).not.toHaveProperty('acceptanceStatus');
  });

  it('refuses a non-object extensions bag with 400', async () => {
    const { controller } = build();

    await expect(
      controller.create({ ...VALID_BODY, extensions: 'reviewCycle=annual' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a non-object score set with 400', async () => {
    const { controller } = build();

    // `before: 20` is the shape a caller reaches for when they think the field
    // is the score. Answering 400 rather than silently ignoring it is what makes
    // "the server computes the score" discoverable instead of mysterious.
    await expect(controller.create({ ...VALID_BODY, before: 20 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('translates an extension failure to 422 carrying the key', async () => {
    const { controller } = build(() =>
      Promise.reject(new ExtensionValidationError('key "x" is not declared', 'x')),
    );

    const error = await controller.create({ ...VALID_BODY }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject({ key: 'x' });
  });

  it('rethrows an unrecognised failure instead of dressing it as the caller’s fault', async () => {
    const boom = new Error('connection reset');
    const { controller } = build(() => Promise.reject(boom));

    // A 4xx here would file an outage as bad input, which is the failure mode
    // that makes an incident invisible in the metrics that matter.
    await expect(controller.create({ ...VALID_BODY })).rejects.toBe(boom);
  });

  it('marks every response as dev-principal scoped', async () => {
    const { controller } = build();

    // `_devPrincipal`, the same marker the policy endpoints carry. It is what a
    // caller sees when the scope came from a stub rather than a credential, so
    // it must not quietly disappear when M4 replaces the stub — it must be
    // removed deliberately.
    expect(await controller.list()).toHaveProperty('_devPrincipal', true);
    expect(await controller.byId('listed')).toHaveProperty('_devPrincipal', true);
    expect(await controller.create({ ...VALID_BODY })).toHaveProperty('_devPrincipal', true);
  });

  // ---- byId: the same two refusals, now on the read path ----

  it('returns the row when the scoped client returned it', async () => {
    const { controller } = build(undefined, [risk('mine')]);

    expect(await controller.byId('mine')).toMatchObject({ data: { id: 'mine' } });
  });

  it('reads the scope from the principal, never from the id in the path', async () => {
    const { controller, resolverCalls } = build(undefined, []);

    await controller.byId(SG1).catch(() => undefined);

    // The id a caller put in the URL is the most obvious thing to reach for
    // when widening a scope, so assert on what resolve() actually received
    // rather than trusting that nobody plumbed it through (約束 8 鐵律 3).
    expect(resolverCalls).toHaveLength(1);
    expect(JSON.stringify(resolverCalls[0])).not.toContain(SG1);
  });

  it('answers 404 for a row the scoped client cannot see', async () => {
    const { controller } = build(undefined, [risk('mine')]);

    await expect(controller.byId('someone-elses-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 404 identically for a row that never existed', async () => {
    const { controller } = build(undefined, []);

    const outOfScope = await controller.byId('someone-elses-id').catch((e) => e);
    const neverExisted = await controller.byId('never-existed').catch((e) => e);

    // Same class AND same message shape: a caller must not be able to tell the
    // two apart, because telling them apart confirms an id exists.
    expect(outOfScope).toBeInstanceOf(NotFoundException);
    expect(neverExisted).toBeInstanceOf(NotFoundException);
    expect((outOfScope as Error).message.replace(/someone-elses-id/, 'X')).toBe(
      (neverExisted as Error).message.replace(/never-existed/, 'X'),
    );
  });
});
