/**
 * File: apps/api/src/modules/soa/soa.module.ts
 * Purpose: Wires the Statement of Applicability module.
 * Category: modules
 * Scope: Phase W11 (M1 slice 8)
 *
 * Description:
 *   Mirrors issue.module.ts. SoaRepository is stateless and takes its client per
 *   call, so there is nothing for a core-model module to hold.
 *
 * Created: 2026-08-14 (Phase W11)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W11)
 */
import { Module } from '@nestjs/common';
import { SoaRepository } from '../../core-model/soa.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { SoaController } from './soa.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [SoaController],
  providers: [SoaRepository],
})
export class SoaModule {}
