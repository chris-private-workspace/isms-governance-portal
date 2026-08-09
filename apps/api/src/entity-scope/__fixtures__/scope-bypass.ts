/**
 * File: apps/api/src/entity-scope/__fixtures__/scope-bypass.ts
 * Purpose: Deliberately bypasses entity scoping, so the detector has something
 *   it must reject on every CI run.
 * Category: Test fixture (never executed, never imported by production code)
 * Scope: Phase W02
 * Owner: scripts/assert-no-scope-bypass.mjs
 *
 * Description:
 *   ⚠️ THIS FILE IS WRONG ON PURPOSE. Do not copy it, do not import it, and do
 *   not "fix" it — fixing it disarms the only thing proving the detector is
 *   alive.
 *
 *   `assert-no-scope-bypass.mjs` skips __fixtures__ during its normal scan and
 *   points at this file during its self-test, requiring a finding for each rule
 *   it claims to enforce. Without that, a detector whose regexes had gone stale
 *   would report "0 violations" and read exactly like success — which is how
 *   W01 shipped a boundaries config that enforced nothing (CH-012).
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
import { PrismaClient } from '../../generated/prisma';
import type { PrismaService } from '../../core-model/prisma.service';

// Rule `new-client`: a second client, outside the one place allowed to build
// one — a whole connection pool that no extension wraps.
export const rogueClient = new PrismaClient();

// Rule `unscoped-connection`: reaching past the scoped surface into the raw
// connection, which reads business tables with no app.entity_scope set.
export async function readEveryEntitysPolicies(prisma: PrismaService) {
  return prisma.connection.policy.findMany();
}

// Rule `raw-query`: raw SQL is invisible to the client extension, so nothing
// sets the scope and nothing in the type system objects.
export async function rawCount(prisma: PrismaService) {
  return prisma.connection.$queryRaw`SELECT count(*) FROM policies`;
}
