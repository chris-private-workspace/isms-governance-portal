/**
 * File: apps/api/src/modules/rm-report/rm-report.module.ts
 * Purpose: Wires the controlled risk-management deliverable and its snapshots.
 * Category: modules
 * Scope: Phase W10 (M1 slice 7)
 *
 * Description:
 *   Mirrors assessment.module.ts: two tables behind one controller, because
 *   issuing a version is one act that touches both and 02a §3.1 describes them as
 *   one deliverable rather than two.
 *
 *   One repository, stateless, taking its client per call — nothing to hold.
 *
 * Created: 2026-08-13 (Phase W10)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W10)
 */
import { Module } from '@nestjs/common';
import { RmReportRepository } from '../../core-model/rm-report.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { RmReportController } from './rm-report.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [RmReportController],
  providers: [RmReportRepository],
})
export class RmReportModule {}
