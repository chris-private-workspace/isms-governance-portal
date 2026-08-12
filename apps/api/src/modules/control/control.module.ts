/**
 * File: apps/api/src/modules/control/control.module.ts
 * Purpose: Wires the control library module.
 * Category: modules
 * Scope: Phase W06 (M1 slice 3)
 *
 * Description:
 *   Mirrors risk.module.ts. ControlRepository is stateless and takes its client
 *   per call, so there is nothing for a core-model module to hold, and the
 *   dev-principal warning stays where the stub is rather than being repeated
 *   here (AP-2).
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W06)
 */
import { Module } from '@nestjs/common';
import { ControlRepository } from '../../core-model/control.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { ControlController } from './control.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [ControlController],
  providers: [ControlRepository],
})
export class ControlModule {}
