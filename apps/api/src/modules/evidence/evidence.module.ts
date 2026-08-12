/**
 * File: apps/api/src/modules/evidence/evidence.module.ts
 * Purpose: Wires the evidence module.
 * Category: modules
 * Scope: Phase W07 (M1 slice 4)
 *
 * Description:
 *   Mirrors control-test.module.ts. EvidenceRepository is stateless and takes its
 *   client per call, so there is nothing for a core-model module to hold.
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07)
 */
import { Module } from '@nestjs/common';
import { EvidenceRepository } from '../../core-model/evidence.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { EvidenceController } from './evidence.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [EvidenceController],
  providers: [EvidenceRepository],
})
export class EvidenceModule {}
