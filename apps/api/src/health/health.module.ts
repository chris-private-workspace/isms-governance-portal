/**
 * File: apps/api/src/health/health.module.ts
 * Purpose: Wires the health endpoint to the database client.
 * Category: bootstrap (operational surface, not a domain scope)
 * Scope: Phase W01 (M0)
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Take the connection from EntityScopeModule, not its own (W02)
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { Module } from '@nestjs/common';
import { EntityScopeModule } from '../entity-scope/entity-scope.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

// Importing rather than providing PrismaService is the point: providing it here
// too would give health a second connection pool, and the endpoint would then
// report on a pool no request ever uses.
@Module({
  imports: [EntityScopeModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
