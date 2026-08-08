/**
 * File: apps/api/src/health/health.module.ts
 * Purpose: Wires the health endpoint to the database client.
 * Category: bootstrap (operational surface, not a domain scope)
 * Scope: Phase W01 (M0)
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { Module } from '@nestjs/common';
import { PrismaService } from '../core-model/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, PrismaService],
})
export class HealthModule {}
