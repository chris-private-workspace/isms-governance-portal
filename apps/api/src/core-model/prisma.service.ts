/**
 * File: apps/api/src/core-model/prisma.service.ts
 * Purpose: Owns the PostgreSQL connection. Deliberately NOT a query surface.
 * Category: core-model
 * Scope: Phase W01 (M0) · W02 (entity-scoping spike)
 * Owner: docs/14-adr/0001-backend-framework.md §Consequences
 *
 * Description:
 *   Holds one PrismaClient over the pg driver adapter, and hands out exactly
 *   two things: a liveness probe, and — to entity-scope alone — the raw client
 *   to wrap.
 *
 *   Until W02 this class *extended* PrismaClient, so anyone who injected it was
 *   one property access away from an unscoped query against every table. It no
 *   longer does. `connection` is the single named token through which an
 *   unscoped query can still be reached, which is what lets the bypass detector
 *   state a rule instead of an allowlist: entity-scope wraps it, and nothing
 *   else touches it.
 *
 *   Why the connection stays here rather than moving into entity-scope wholesale
 *   (which prisma.service.ts:19-22 predicted in W01): the generated client is
 *   classified as core-model by eslint.config.mjs:60, and health needs a
 *   liveness probe that exists before any principal — and therefore before any
 *   scope — does. What moved to entity-scope is the *query surface*, which is
 *   the half that guardrail 4 is about. See the W02 design note.
 *
 * Key Components:
 *   - PrismaService.connection: the raw client; entity-scope's factory wraps it
 *   - PrismaService.probe(): SELECT 1, for the health endpoint
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Stop extending PrismaClient; expose connection + probe (W02)
 *   - 2026-08-08: Initial creation (Phase W01) — unscoped, zero models
 *
 * Related:
 *   - CLAUDE.md 約束 8 · docs/rules-on-demand/multi-tenant-data.md
 */
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /**
   * ⚠️ Unscoped. Only `entity-scope`'s ScopedPrismaFactory may query through
   * this; every other caller must inject the scoped client it produces.
   * Querying a business table here bypasses row-level security's application
   * half — the database half still refuses, but as a 42501 at runtime rather
   * than as a design that cannot go wrong.
   */
  readonly connection: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // Fail loudly at construction. A client that silently points nowhere
      // turns a configuration error into an intermittent runtime one.
      throw new Error('DATABASE_URL is not set — copy .env.example to .env');
    }
    this.connection = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.connection.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.$disconnect();
  }

  /**
   * Liveness only. `SELECT 1` reads no table, so it engages no RLS policy and
   * needs no entity scope — which is the whole reason health may call it before
   * anyone has authenticated.
   */
  async probe(): Promise<void> {
    await this.connection.$queryRaw`SELECT 1`;
  }
}
