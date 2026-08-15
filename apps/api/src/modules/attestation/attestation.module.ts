/**
 * File: apps/api/src/modules/attestation/attestation.module.ts
 * Purpose: Wires the attestation module.
 * Category: modules
 * Scope: Phase W14 (M1 slice 9)
 *
 * Description:
 *   Mirrors evidence.module.ts. AttestationRepository is stateless and takes its
 *   client per call, so there is nothing for a core-model module to hold.
 *
 * Created: 2026-08-15 (Phase W14)
 * Last Modified: 2026-08-15
 *
 * Modification History (newest-first):
 *   - 2026-08-15: Initial creation (Phase W14)
 */
import { Module } from '@nestjs/common';
import { AttestationRepository } from '../../core-model/attestation.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { AttestationController } from './attestation.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [AttestationController],
  providers: [AttestationRepository],
})
export class AttestationModule {}
