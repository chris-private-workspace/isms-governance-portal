/**
 * File: apps/api/src/core-model/prisma.service.ts
 * Purpose: The single PostgreSQL client the API is allowed to hold.
 * Category: core-model
 * Scope: Phase W01 (M0)
 * Owner: docs/14-adr/0001-backend-framework.md §Consequences
 *
 * Description:
 *   Wraps PrismaClient over the pg driver adapter. It lives in `core-model`
 *   because the core model owns persistence of the entity graph.
 *
 *   ⚠️ THIS CLIENT IS NOT YET ENTITY-SCOPED. ADR-0001:104 records that Prisma
 *   needs a client extension wrapping every query in a transaction that sets
 *   `app.entity_scope`, and that the wrapper "must be written and proven; it
 *   is not a framework guarantee". Writing it is ADR-0004's spike, and it is
 *   the load-bearing assumption behind ADR-0001 §可證偽條件 #1. Until then
 *   there is nothing to scope — the schema has no tables — but the moment M1
 *   adds one, an unscoped client becomes a guardrail-4 violation.
 *
 *   When the extension lands, ownership of the client moves to `entity-scope`
 *   and reaches this scope by DI, never by import (scope-boundaries.md
 *   §一個尚未被驗證的設計意圖). No unscoped client should be exported at all.
 *
 * Key Components:
 *   - PrismaService: Nest lifecycle wrapper; connects on init, disconnects on destroy
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01) — unscoped, zero models
 *
 * Related:
 *   - CLAUDE.md 約束 8 · docs/rules-on-demand/multi-tenant-data.md
 */
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // Fail loudly at construction. A client that silently points nowhere
      // turns a configuration error into an intermittent runtime one.
      throw new Error('DATABASE_URL is not set — copy .env.example to .env');
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
