/**
 * File: apps/api/src/modules/risk/risk.module.ts
 * Purpose: Wires the second proof module.
 * Category: modules
 * Scope: Phase W05 (M1 slice 2)
 *
 * Description:
 *   Mirrors policy.module.ts: RiskRepository is stateless and takes its client
 *   per call, so there is nothing for a core-model module to hold.
 *
 *   ⚠️ It does NOT repeat PolicyModule's dev-principal warning. Two modules each
 *   announcing the same stub at boot would print it twice and make the count
 *   look like a measure of something. The warning belongs to the stub, and the
 *   stub is announced once — this module imports it from there rather than
 *   growing its own copy (AP-2: the same concern in two directories).
 *
 * Created: 2026-08-11 (Phase W05)
 * Last Modified: 2026-08-11
 *
 * Modification History (newest-first):
 *   - 2026-08-11: Initial creation (Phase W05)
 */
import { Module } from '@nestjs/common';
import { RiskRepository } from '../../core-model/risk.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { RiskController } from './risk.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [RiskController],
  providers: [RiskRepository],
})
export class RiskModule {}
