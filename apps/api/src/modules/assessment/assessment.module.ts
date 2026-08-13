/**
 * File: apps/api/src/modules/assessment/assessment.module.ts
 * Purpose: Wires the shared assessment engine.
 * Category: modules
 * Scope: Phase W09 (M1 slice 6)
 *
 * Description:
 *   Mirrors issue.module.ts, with one difference worth naming: three repositories
 *   behind one controller. 05:39 builds the engine once, so its HTTP surface is
 *   one module rather than three that would each need the same wiring.
 *
 *   All three repositories are stateless and take their client per call, so there
 *   is nothing for a core-model module to hold.
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W09)
 */
import { Module } from '@nestjs/common';
import { AssessmentInstanceRepository } from '../../core-model/assessment-instance.repository';
import { AssessmentResponseRepository } from '../../core-model/assessment-response.repository';
import { AssessmentTemplateRepository } from '../../core-model/assessment-template.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { AssessmentController } from './assessment.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [AssessmentController],
  providers: [
    AssessmentTemplateRepository,
    AssessmentInstanceRepository,
    AssessmentResponseRepository,
  ],
})
export class AssessmentModule {}
