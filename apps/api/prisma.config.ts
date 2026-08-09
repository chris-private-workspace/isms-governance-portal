/**
 * File: apps/api/prisma.config.ts
 * Purpose: Connection settings for Prisma's CLI (migrate / introspect).
 * Category: core-model
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   Prisma 7 removed `url` from the datasource block, so the CLI reads its
 *   connection from here while the running application gets its own through
 *   the driver adapter in src/core-model/prisma.service.ts. Keeping them
 *   separate is useful rather than merely required: from M2 the application
 *   must connect as a role that RLS applies to, whereas migrations must not.
 *   A single shared URL would quietly hand the app migration privileges, and
 *   an application connecting as owner bypasses row-level security entirely —
 *   the failure mode that runs, looks right, and passes tests.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01) — required by Prisma 7 (P1012)
 *
 * Related:
 *   - CLAUDE.md 約束 8 · docs/rules-on-demand/multi-tenant-data.md
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer loads .env implicitly, and the CLI's cwd is apps/api
// while the single .env lives at the monorepo root. Both candidates are tried
// so the command behaves the same whether invoked from the root workspace or
// from inside apps/api.
for (const candidate of ['.env', '../../.env']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    config({ path });
    break;
  }
}

// `prisma generate` needs no connection string; `prisma migrate` does. Declaring
// the datasource only when a URL is present keeps both honest: a fresh clone and
// CI can generate the client with no .env, while migrate still fails loudly
// rather than against a fake URL planted to keep CI quiet.
//
// ⚠️ DATABASE_URL_MIGRATE, not DATABASE_URL. W02 measured what the header above
// only predicted: the application role must be one that RLS applies to, and the
// migration role must own the schema. Falling back to DATABASE_URL keeps
// single-role setups working, but the fallback is the unsafe direction — it is
// here so migrations still run, never so the app can borrow owner privileges.
const url = process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(url
    ? {
        datasource: {
          url: process.env.DATABASE_URL_MIGRATE ? env('DATABASE_URL_MIGRATE') : env('DATABASE_URL'),
        },
      }
    : {}),
});
