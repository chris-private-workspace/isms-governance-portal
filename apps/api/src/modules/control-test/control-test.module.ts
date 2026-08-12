/**
 * File: apps/api/src/modules/control-test/control-test.module.ts
 * Purpose: Wires the control-test module.
 * Category: modules
 * Scope: Phase W07 (M1 slice 4)
 *
 * Description:
 *   Mirrors control.module.ts. ControlTestRepository is stateless and takes its
 *   client per call, so there is nothing for a core-model module to hold.
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07)
 */
import { Module } from '@nestjs/common';
import { ControlTestRepository } from '../../core-model/control-test.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { ControlTestController } from './control-test.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [ControlTestController],
  providers: [ControlTestRepository],
})
export class ControlTestModule {}
