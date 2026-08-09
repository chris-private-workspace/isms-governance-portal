/**
 * File: apps/api/src/health/health.service.ts
 * Purpose: Reports whether the API can actually reach PostgreSQL right now.
 * Category: bootstrap (operational surface, not a domain scope)
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   Issues a real `SELECT 1` per request. It is deliberately not cached and
 *   not derived from a startup flag: the W01 acceptance criteria require that
 *   stopping PostgreSQL flips the response to 'down' while the API keeps
 *   serving. A health check that cannot report failure is exactly the
 *   Potemkin shape AP-3 describes — structure present, no behaviour behind it.
 *
 *   It calls `probe()` rather than issuing the query itself. Health has no
 *   principal and therefore no entity scope, so it is the one caller that
 *   legitimately touches the database without one — narrowing its dependency to
 *   a named liveness method keeps that exemption visible and countable instead
 *   of leaving a general-purpose `$queryRaw` outside entity-scope (W02).
 *
 * Key Components:
 *   - HealthService.check(): the only method; returns HealthResponse
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Call PrismaService.probe() instead of $queryRaw (Phase W02)
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { Injectable, Logger } from '@nestjs/common';
import type { HealthResponse } from '@isms/types';
import { PrismaService } from '../core-model/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.probe();
      return { status: 'up', db: 'up' };
    } catch (error) {
      // The API is still up; only its dependency is not. Say so precisely
      // rather than returning a single opaque boolean.
      this.logger.warn(`database probe failed: ${(error as Error).message}`);
      return { status: 'up', db: 'down' };
    }
  }
}
