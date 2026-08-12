/**
 * File: apps/api/src/modules/asset/asset.controller.spec.ts
 * Purpose: That both refusals answer identically, and that neither resource reads
 *   an entity from the request.
 * Category: Test (unit)
 * Scope: Phase W06
 *
 * Description:
 *   asset.int.spec.ts proves the database refuses. Here the question is whether
 *   the two refusals stay indistinguishable at the edge — a 404 for the
 *   out-of-scope entity and something else for the unreachable group would let a
 *   caller ask "does this asset group exist somewhere I cannot see?" and get an
 *   answer.
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AssetRepository } from '../../core-model/asset.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { Asset, AssetGroup } from '../../generated/prisma';
import { AssetController } from './asset.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const GROUP = '00000000-0000-0000-0000-000000000a10';

const GROUP_BODY = { orgEntityId: SG1, name: 'SG1 services', assetCategory: 'services' };
const ASSET_BODY = {
  orgEntityId: SG1,
  name: 'SG1 settlement service',
  assetGroupId: GROUP,
  assetCategory: 'services',
  classification: 'restricted',
};

function build(impl?: { create?: () => Promise<Asset>; createGroup?: () => Promise<AssetGroup> }) {
  const resolverCalls: unknown[] = [];

  const resolver = {
    resolve: async (assignment: unknown) => {
      resolverCalls.push(assignment);
      return {} as EntityScope;
    },
  } as unknown as EntityScopeResolver;

  const scoped = { forScope: () => ({}) } as unknown as ScopedPrismaFactory;

  const repo = {
    list: async () => [{ id: 'a' } as unknown as Asset],
    listGroups: async () => [{ id: 'g' } as unknown as AssetGroup],
    create: async () => (impl?.create ? impl.create() : ({ id: 'created' } as unknown as Asset)),
    createGroup: async () =>
      impl?.createGroup ? impl.createGroup() : ({ id: 'created' } as unknown as AssetGroup),
  } as unknown as AssetRepository;

  return { controller: new AssetController(resolver, scoped, repo), resolverCalls };
}

describe('AssetController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it.each([
    ['assets', (c: AssetController) => c.create({ ...ASSET_BODY })],
    ['asset-groups', (c: AssetController) => c.createGroup({ ...GROUP_BODY })],
  ])('resolves %s scope from the principal, never from the body', async (_label, call) => {
    const { controller, resolverCalls } = build();

    await call(controller);

    expect(resolverCalls).toHaveLength(1);
    const seen = resolverCalls[0] as Record<string, unknown>;
    expect(Object.keys(seen).sort()).toEqual(['assignedEntityCodes', 'rollUp', 'subjectId']);
    expect(JSON.stringify(seen)).not.toContain(SG1);
  });

  // ---- the pair that must stay indistinguishable ----

  it.each([
    ['out-of-scope entity', new ScopeRefusedError(SG1)],
    ['unreachable asset group', new UnknownReferenceError('asset group')],
  ])('answers 404 for %s — never 403, never 500', async (_label, thrown) => {
    const { controller } = build({ create: () => Promise.reject(thrown) });

    await expect(controller.create({ ...ASSET_BODY })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 422 carrying the key when an extension is invalid', async () => {
    const { controller } = build({
      createGroup: () => Promise.reject(new ExtensionValidationError('unknown key: foo', 'foo')),
    });

    const error = await controller.createGroup({ ...GROUP_BODY }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject({ key: 'foo' });
  });

  // ---- request validation ----

  it.each([['orgEntityId'], ['name'], ['assetGroupId']])(
    'refuses an asset body missing %s with 400',
    async (field) => {
      const { controller } = build();
      const body: Record<string, unknown> = { ...ASSET_BODY };
      delete body[field];

      await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('refuses an asset group body missing name with 400', async () => {
    const { controller } = build();
    const body: Record<string, unknown> = { ...GROUP_BODY };
    delete body['name'];

    await expect(controller.createGroup(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['assetCategory', 'hardware'],
    ['classification', 'top_secret'],
  ])('refuses an invalid %s with 400', async (field, value) => {
    const { controller } = build();

    await expect(controller.create({ ...ASSET_BODY, [field]: value })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('validates assetCategory on asset-groups too, not only on assets', async () => {
    const { controller } = build();

    // Two endpoints take the same enum. Validating it on one of them is how a
    // rule ends up half-enforced — and the group is the half that assets are
    // then filed under.
    await expect(
      controller.createGroup({ ...GROUP_BODY, assetCategory: 'hardware' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses `physical & virtual` written as two categories', async () => {
    const { controller } = build();

    // 02a:202 writes "physical & virtual" as ONE category; a caller splitting it
    // is making a domain error, not a typo.
    await expect(
      controller.create({ ...ASSET_BODY, assetCategory: 'physical' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['assets', (c: AssetController) => c.create({ ...ASSET_BODY, extensions: 'k=v' })],
    ['asset-groups', (c: AssetController) => c.createGroup({ ...GROUP_BODY, extensions: 'k=v' })],
  ])('refuses a non-object extensions on %s with 400', async (_label, call) => {
    const { controller } = build();

    await expect(call(controller)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['assets', (c: AssetController) => c.create({ ...ASSET_BODY })],
    ['asset-groups', (c: AssetController) => c.createGroup({ ...GROUP_BODY })],
  ])('lets an unrecognised error through untranslated on %s', async (_label, call) => {
    const boom = new Error('connection reset');
    const { controller } = build({
      create: () => Promise.reject(boom),
      createGroup: () => Promise.reject(boom),
    });

    // ⚠️ `translate()` returns unknown errors unchanged on purpose. Mapping
    // everything to 404 would turn an outage into "not found" and drain the
    // meaning out of the entity-scope 404s next to it.
    await expect(call(controller)).rejects.toBe(boom);
  });

  it('marks every response as coming from the dev principal', async () => {
    const { controller } = build();

    expect(await controller.list()).toHaveProperty('_devPrincipal');
    expect(await controller.listGroups()).toHaveProperty('_devPrincipal');
  });
});
