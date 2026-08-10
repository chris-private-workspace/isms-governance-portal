/**
 * File: apps/api/src/modules/policy/policy.module.ts
 * Purpose: Wires the first proof module; announces the dev principal at boot.
 * Category: modules
 * Scope: Phase W03 (governed extensions)
 *
 * Description:
 *   PolicyRepository is provided here rather than by core-model, because it is
 *   stateless and takes its client per call — there is nothing for a core-model
 *   module to hold. EntityScopeModule supplies the resolver and the factory.
 *
 *   onModuleInit is where the dev-principal warning fires. Putting it in the
 *   module rather than in main.ts means it also fires in any test that boots
 *   this module, so the warning cannot drift out of the path that uses the stub.
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Initial creation (Phase W03)
 */
import { Module, type OnModuleInit } from '@nestjs/common';
import { PolicyRepository } from '../../core-model/policy.repository';
import { EntityScopeModule } from '../../entity-scope/entity-scope.module';
import { warnDevPrincipalActive } from './dev-principal';
import { PolicyController } from './policy.controller';

@Module({
  imports: [EntityScopeModule],
  controllers: [PolicyController],
  providers: [PolicyRepository],
})
export class PolicyModule implements OnModuleInit {
  onModuleInit(): void {
    warnDevPrincipalActive();
  }
}
