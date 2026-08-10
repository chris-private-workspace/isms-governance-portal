/**
 * File: apps/api/src/entity-scope/entity-scope.int.spec.ts
 * Purpose: The four scope tests of CLAUDE.md 約束 8, against real PostgreSQL,
 *   through the wiring the application actually uses.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W02 (entity-scoping spike)
 * Owner: docs/rules-on-demand/multi-tenant-data.md §測試
 *
 * Description:
 *   Everything here resolves out of a compiled Nest module graph, so a broken
 *   provider or a missing export fails as a wiring error rather than being
 *   silently replaced by a double. That distinction is the point: unit tests
 *   already cover the wrapper's shape, and they would keep passing if the
 *   database enforced nothing at all.
 *
 *   ⚠️ No HTTP surface exists in this phase (plan §3.x), so "404 not 403" is
 *   asserted where it actually originates: an out-of-scope row and a row that
 *   never existed must be indistinguishable at the data layer. If they differ
 *   here, no controller can make them agree later — and a 403 would confirm to
 *   a caller that the id it guessed is real.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Assert isolation, not an exact row list (W03) — order-dependent on CI
 *   - 2026-08-09: Initial creation (Phase W02)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { EntityScopeModule } from './entity-scope.module';
import { EntityScopeError, EntityScopeResolver, type EntityScope } from './entity-scope.resolver';
import { ScopedPrismaFactory } from './scoped-prisma.provider';
import { PrismaService } from '../core-model/prisma.service';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const HK1_POLICY = '00000000-0000-0000-0000-0000000000f1';
const SG1_POLICY = '00000000-0000-0000-0000-0000000000f0';
const NEVER_EXISTED = '00000000-0000-0000-0000-00000000dead';

describe('entity scoping (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [EntityScopeModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  const scopeFor = (codes: string[], rollUp = false): Promise<EntityScope> =>
    resolver.resolve({ subjectId: 'integration-test', assignedEntityCodes: codes, rollUp });

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(await scopeFor(codes, rollUp));

  // === 1. cross-entity read denied ==========================================

  /**
   * ⚠️ Asserted as an isolation property, NOT as an exact row list.
   *
   * The first version compared the titles to `['SG1 access control policy']`,
   * which also asserted "no other SG1 row exists" — fixture bookkeeping, not
   * isolation. That held only while this was the only suite touching policies.
   * W03 added one that WRITES, and jest orders suites by file size on a cold
   * cache but by previous timings on a warm one, so the two suites ran in one
   * order locally and the other on CI: green here, red there, same commit.
   *
   * Soft-deleting the other suite's rows does not fix it either, because this
   * query passes no `retiredAt` filter — a retired row is still returned.
   *
   * So the assertion now says what the test name has always claimed: every row
   * belongs to SG1, and HK1's row is not among them.
   */
  it('sees its own entity and nothing else', async () => {
    const rows = await (await clientFor(['SG1'])).policy.findMany();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.orgEntityId === SG1)).toBe(true);
    expect(rows.map((r) => r.id)).toContain(SG1_POLICY);
    expect(rows.map((r) => r.id)).not.toContain(HK1_POLICY);
  });

  it('cannot read another entity by id, and cannot tell it apart from a row that never existed', async () => {
    const client = await clientFor(['SG1']);

    const outOfScope = await client.policy.findUnique({ where: { id: HK1_POLICY } });
    const nonexistent = await client.policy.findUnique({ where: { id: NEVER_EXISTED } });

    // Identical, deliberately. This is what makes 404 the honest status later:
    // a 403 here would confirm that HK1_POLICY is a real id.
    expect(outOfScope).toBeNull();
    expect(nonexistent).toBeNull();
    expect(outOfScope).toEqual(nonexistent);
  });

  // === 2. cross-entity write denied, AND the data did not change ============

  it('cannot insert a row into another entity', async () => {
    const client = await clientFor(['SG1']);

    await expect(
      client.policy.create({ data: { orgEntityId: HK1, title: 'planted by SG1' } }),
    ).rejects.toThrow(/row-level security/i);

    // Asserting the rejection alone would miss "refused, but wrote anyway".
    const hk = await (await clientFor(['HK1'])).policy.findMany();
    expect(hk.map((r) => r.title)).toEqual(['HK1 access control policy']);
  });

  it('cannot move one of its own rows into another entity', async () => {
    const client = await clientFor(['SG1']);

    await expect(
      client.policy.update({ where: { id: SG1_POLICY }, data: { orgEntityId: HK1 } }),
    ).rejects.toThrow(/row-level security/i);

    // WITH CHECK is what refuses this; USING alone would have let the row walk
    // out of scope. Re-read to prove the row stayed where it was.
    const rows = await (await clientFor(['SG1'])).policy.findMany({ where: { id: SG1_POLICY } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.orgEntityId).toBe(SG1);
  });

  it('accepts a write into its own entity — the refusals above are not just "everything fails"', async () => {
    const client = await clientFor(['SG1']);

    const created = await client.policy.create({
      data: { orgEntityId: SG1, title: 'written by SG1' },
    });
    expect(created.orgEntityId).toBe(SG1);

    // No DELETE privilege exists by design (guardrail 3), so retire it instead.
    await client.policy.update({ where: { id: created.id }, data: { retiredAt: new Date() } });
    const live = await client.policy.findMany({ where: { retiredAt: null } });
    expect(live.map((r) => r.title)).toEqual(['SG1 access control policy']);
  });

  // === 4. roll-up limited to the authorised subtree ==========================

  it('rolls up the authorised subtree and stops at the sibling branch', async () => {
    const rows = await (await clientFor(['SG'], true)).policy.findMany();

    expect(rows.every((r) => r.orgEntityId === SG1)).toBe(true);
    expect(rows.some((r) => r.orgEntityId === HK1)).toBe(false);
  });

  it('rolls up the whole region when the grant reaches that far', async () => {
    const rows = await (await clientFor(['APAC'], true)).policy.findMany();

    expect(new Set(rows.map((r) => r.orgEntityId))).toEqual(new Set([SG1, HK1]));
  });

  it('a country grant without roll-up sees nothing below it', async () => {
    // SG holds no policies of its own; its child does. Without roll-up the
    // grant must not inherit downwards — otherwise "roll-up" would be a label
    // on behaviour that happens regardless.
    const rows = await (await clientFor(['SG'])).policy.findMany();

    expect(rows).toEqual([]);
  });

  // === fail-closed: an unset scope errors, it does not return "no records" ===

  it('refuses an unscoped query instead of returning an empty result', async () => {
    // The connection has served scoped queries above, which is exactly the case
    // Day-0 could not see: set_config leaves app.entity_scope defined as '',
    // so current_setting stops raising and the policy filters everything away.
    // Migration 20260809171812 turned that back into an error.
    await expect(prisma.connection.policy.findMany()).rejects.toThrow(
      /app\.entity_scope is not set/,
    );
  });

  it('distinguishes "no records" from "no scope"', async () => {
    // Same query, same connection: one is empty because the entity has no live
    // policies, the other refuses. If both came back as [], "this OpCo has no
    // policies" would be indistinguishable from "nobody said which OpCo".
    const empty = await (await clientFor(['HK'])).policy.findMany();
    expect(empty).toEqual([]);

    await expect(prisma.connection.policy.findMany()).rejects.toThrow(
      /app\.entity_scope is not set/,
    );
  });

  it('refuses an empty scope in the application layer too, before the database sees it', async () => {
    const empty = { entityIds: [], rootCodes: [], rollUp: false } as unknown as EntityScope;

    expect(() => factory.forScope(empty)).toThrow(EntityScopeError);
  });

  it('refuses to resolve a scope for an entity that does not exist', async () => {
    await expect(scopeFor(['NOT-AN-OPCO'])).rejects.toThrow(EntityScopeError);
  });
});
