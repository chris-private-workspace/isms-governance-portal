/**
 * File: apps/api/src/bootstrap/app.module.ts
 * Purpose: Root module. Imports every scope module the app currently has.
 * Category: bootstrap (NOT a scope)
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   The composition root is the one place allowed to reach across all scopes,
 *   because assembling them is its whole job (eslint.config.mjs encodes that).
 *   Right now it imports exactly one: health. The seven scope directories are
 *   empty on purpose — an empty NestJS module answers "nothing" to AP-3's
 *   question "what breaks if you switch it off", so each module is created
 *   when its scope receives real code, from M1 onward.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from '../health/health.module';

// One .env at the monorepo root. `npm run dev -w apps/api` sets cwd to
// apps/api, so the root file has to be named explicitly — the default lookup
// would miss it and DATABASE_URL would be undefined at construction time.
const ENV_FILES = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')];

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ENV_FILES }), HealthModule],
})
export class AppModule {}
