/**
 * File: apps/api/src/entity-scope/entity-scope.resolver.spec.ts
 * Purpose: Proves roll-up is a subtree, never "everything", and never empty.
 * Category: Test
 * Scope: Phase W02 (entity-scoping spike)
 *
 * Description:
 *   The hierarchy below mirrors the fixtures the migration seeds, so the same
 *   shape is asserted here and against real PostgreSQL on Day 3. The test that
 *   matters is the sibling one: an APAC/SG roll-up must not reach HK. A
 *   resolver that returned every entity would satisfy every other assertion in
 *   this file.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
import { EntityScopeError, EntityScopeResolver } from './entity-scope.resolver';
import type { PrismaService } from '../core-model/prisma.service';

interface Row {
  id: string;
  code: string;
  path: string;
}

const TREE: Row[] = [
  { id: 'id-apac', code: 'APAC', path: '/apac' },
  { id: 'id-sg', code: 'SG', path: '/apac/sg' },
  { id: 'id-sg1', code: 'SG1', path: '/apac/sg/sg1' },
  { id: 'id-hk', code: 'HK', path: '/apac/hk' },
  { id: 'id-hk1', code: 'HK1', path: '/apac/hk/hk1' },
];

/**
 * A stand-in for the org_entities table that answers the two queries the
 * resolver issues. It filters in memory rather than returning a fixed list, so
 * a resolver that stopped filtering would fail here instead of passing.
 */
function resolverOverTree(tree: Row[] = TREE): EntityScopeResolver {
  const findMany = ({ where }: { where: Record<string, unknown> }) => {
    if (where.code) {
      const codes = (where.code as { in: string[] }).in;
      return Promise.resolve(tree.filter((r) => codes.includes(r.code)));
    }
    const clauses = where.OR as ({ path: string } | { path: { startsWith: string } })[];
    return Promise.resolve(
      tree.filter((r) =>
        clauses.some((c) =>
          typeof c.path === 'string' ? r.path === c.path : r.path.startsWith(c.path.startsWith),
        ),
      ),
    );
  };
  return new EntityScopeResolver({
    connection: { orgEntity: { findMany } },
  } as unknown as PrismaService);
}

const assignment = (codes: string[], rollUp: boolean) => ({
  subjectId: 'subject-under-test',
  assignedEntityCodes: codes,
  rollUp,
});

describe('EntityScopeResolver', () => {
  it('without roll-up, resolves to exactly the assigned entities', async () => {
    const scope = await resolverOverTree().resolve(assignment(['SG1'], false));

    expect(scope.entityIds).toEqual(['id-sg1']);
    expect(scope.rollUp).toBe(false);
  });

  it('with roll-up, resolves to the subtree — and stops at the sibling branch', async () => {
    const scope = await resolverOverTree().resolve(assignment(['SG'], true));

    expect([...scope.entityIds].sort()).toEqual(['id-sg', 'id-sg1']);
    // The assertion this whole file exists for: a regional grant is a subtree
    // root, not a bypass (multi-tenant-data.md:145).
    expect(scope.entityIds).not.toContain('id-hk');
    expect(scope.entityIds).not.toContain('id-hk1');
  });

  it('a region-wide roll-up reaches both branches, still by subtree', async () => {
    const scope = await resolverOverTree().resolve(assignment(['APAC'], true));

    expect([...scope.entityIds].sort()).toEqual(['id-apac', 'id-hk', 'id-hk1', 'id-sg', 'id-sg1']);
  });

  it('keeps the assignment roots for the audit trail', async () => {
    const scope = await resolverOverTree().resolve(assignment(['SG', 'HK'], true));

    expect(scope.rootCodes).toEqual(['SG', 'HK']);
  });

  it('rejects the whole assignment when any code is unknown', async () => {
    // Resolving the half that existed would quietly narrow a principal's scope
    // on a typo, which reads downstream as "that entity has no records".
    await expect(resolverOverTree().resolve(assignment(['SG1', 'NOPE'], false))).rejects.toThrow(
      /unknown or retired org entity code\(s\): NOPE/,
    );
  });

  it('refuses an assignment with no entities at all', async () => {
    await expect(resolverOverTree().resolve(assignment([], true))).rejects.toThrow(
      EntityScopeError,
    );
  });

  it('refuses to issue a scope that resolved to nothing', async () => {
    await expect(resolverOverTree([]).resolve(assignment(['SG1'], false))).rejects.toThrow(
      EntityScopeError,
    );
  });
});
