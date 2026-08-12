/**
 * File: apps/api/src/modules/asset/asset.module.ts
 * Purpose: Wires the asset chain module.
 * Category: modules
 * Scope: Phase W06 (M1 slice 3)
 *
 * Description:
 *   Mirrors risk.module.ts. One module for both resources because they are one
 *   chain — see asset.controller.ts.
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W06)
 */
import { Module } from '@nestjs/common';
import { AssetRepository } from '../../core-model/asset.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { AssetController } from './asset.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [AssetController],
  providers: [AssetRepository],
})
export class AssetModule {}
