/**
 * File: apps/api/src/entity-scope/entity-scope.module.ts
 * Purpose: Provides scope resolution and the scoped client; exports nothing unscoped.
 * Category: entity-scope
 * Scope: Phase W02 (entity-scoping spike)
 *
 * Description:
 *   PrismaService is provided here and exported, because health probes the same
 *   pool the application queries through — a liveness check against a second,
 *   otherwise-unused pool reports on nothing anyone uses. What is NOT exported
 *   is a queryable client: since W02 PrismaService no longer extends
 *   PrismaClient, so importing it yields a connection holder and a probe, and
 *   the only way to reach a table is ScopedPrismaFactory.
 *
 *   This is the first scope module with real code in it. The other seven
 *   directories stay empty on purpose (app.module.ts:10-13): an empty module
 *   answers "nothing" to AP-3's "what breaks if you switch it off".
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
import { Module } from '@nestjs/common';
import { PrismaService } from '../core-model/prisma.service';
import { EntityScopeResolver } from './entity-scope.resolver';
import { ScopedPrismaFactory } from './scoped-prisma.provider';

@Module({
  providers: [PrismaService, EntityScopeResolver, ScopedPrismaFactory],
  exports: [PrismaService, EntityScopeResolver, ScopedPrismaFactory],
})
export class EntityScopeModule {}
