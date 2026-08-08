/**
 * File: apps/api/src/health/health.controller.ts
 * Purpose: `GET /health` — the one endpoint W01 ships.
 * Category: bootstrap (operational surface, not a domain scope)
 * Scope: Phase W01 (M0)
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@isms/types';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'API liveness plus a live database probe.' })
  check(): Promise<HealthResponse> {
    return this.health.check();
  }
}
