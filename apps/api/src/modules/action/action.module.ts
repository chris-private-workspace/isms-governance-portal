/**
 * File: apps/api/src/modules/action/action.module.ts
 * Purpose: Wires the action module.
 * Category: modules
 * Scope: Phase W08 (M1 slice 5)
 *
 * Description:
 *   Mirrors issue.module.ts. Kept SEPARATE from it rather than merged, for the
 *   reason ScopedAssetClient and ScopedAssetGroupClient are separate: one module
 *   holding both repositories would put an issue delegate within reach of the
 *   action write path, and not being able to reach it is the guard.
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W08)
 */
import { Module } from '@nestjs/common';
import { ActionRepository } from '../../core-model/action.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { ActionController } from './action.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [ActionController],
  providers: [ActionRepository],
})
export class ActionModule {}
