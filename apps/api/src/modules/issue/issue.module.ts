/**
 * File: apps/api/src/modules/issue/issue.module.ts
 * Purpose: Wires the issue module.
 * Category: modules
 * Scope: Phase W08 (M1 slice 5)
 *
 * Description:
 *   Mirrors control-test.module.ts. IssueRepository is stateless and takes its
 *   client per call, so there is nothing for a core-model module to hold.
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W08)
 */
import { Module } from '@nestjs/common';
import { IssueRepository } from '../../core-model/issue.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { IssueController } from './issue.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [IssueController],
  providers: [IssueRepository],
})
export class IssueModule {}
