/**
 * File: apps/api/test/int-env.js
 * Purpose: Point each worker's DATABASE_URL at the integration database.
 * Category: Tooling / test infrastructure
 * Scope: Phase W02
 *
 * Description:
 *   PrismaService reads DATABASE_URL at construction, and jest workers are
 *   separate processes — so setting it in globalSetup is not enough. Each
 *   worker recomputes it from the same helper, which also means a worker can
 *   never end up pointed at isms_dev because an environment variable failed to
 *   propagate.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
const { testUrls } = require('./int-db');

const { app, owner } = testUrls();
process.env.DATABASE_URL = app;
process.env.DATABASE_URL_MIGRATE = owner;
