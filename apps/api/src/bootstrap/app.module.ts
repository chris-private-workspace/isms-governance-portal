/**
 * File: apps/api/src/bootstrap/app.module.ts
 * Purpose: Root module. Imports every scope module the app currently has.
 * Category: bootstrap (NOT a scope)
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   The composition root is the one place allowed to reach across all scopes,
 *   because assembling them is its whole job (eslint.config.mjs encodes that).
 *   It imports six: health, entity-scope (W02), policy (W03), risk (W05), and
 *   control + asset (W06). The remaining scope directories stay empty on
 *   purpose: an empty NestJS module answers "nothing" to AP-3's question "what
 *   breaks if you switch it off", so each is created when its scope receives
 *   real code.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Import SoaModule (W11) — the mandatory ISO 27001 artifact
 *   - 2026-08-13: Import RmReportModule (W10) — the versioned snapshot pair
 *   - 2026-08-13: Import AssessmentModule (W09) — one module, three tables
 *   - 2026-08-12: Import IssueModule + ActionModule (W08) — slice 5's endpoints
 *   - 2026-08-12: Import ControlTestModule + EvidenceModule (W07) — slice 4's endpoints
 *   - 2026-08-12: Import ControlModule + AssetModule (W06) — slice 3's endpoints
 *   - 2026-08-11: Import RiskModule — the asset-based risk chain (W05)
 *   - 2026-08-10: Import PolicyModule — the first business endpoint (W03)
 *   - 2026-08-09: Import EntityScopeModule now that the scope has code (W02)
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EntityScopeModule } from '../entity-scope/entity-scope.module';
import { HealthModule } from '../health/health.module';
import { ActionModule } from '../modules/action/action.module';
import { AssessmentModule } from '../modules/assessment/assessment.module';
import { AssetModule } from '../modules/asset/asset.module';
import { ControlModule } from '../modules/control/control.module';
import { ControlTestModule } from '../modules/control-test/control-test.module';
import { EvidenceModule } from '../modules/evidence/evidence.module';
import { IssueModule } from '../modules/issue/issue.module';
import { PolicyModule } from '../modules/policy/policy.module';
import { RiskModule } from '../modules/risk/risk.module';
import { RmReportModule } from '../modules/rm-report/rm-report.module';
import { SoaModule } from '../modules/soa/soa.module';

// One .env at the monorepo root. `npm run dev -w apps/api` sets cwd to
// apps/api, so the root file has to be named explicitly — the default lookup
// would miss it and DATABASE_URL would be undefined at construction time.
const ENV_FILES = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ENV_FILES }),
    EntityScopeModule,
    HealthModule,
    PolicyModule,
    RiskModule,
    ControlModule,
    AssetModule,
    ControlTestModule,
    EvidenceModule,
    IssueModule,
    ActionModule,
    AssessmentModule,
    RmReportModule,
    SoaModule,
  ],
})
export class AppModule {}
