/**
 * File: apps/api/test/int-db.js
 * Purpose: Shared knowledge of where the integration-test database lives.
 * Category: Tooling / test infrastructure
 * Scope: Phase W02
 *
 * Description:
 *   Both the global setup and each worker need the same two URLs, and they run
 *   in different processes — so both derive them here rather than trusting an
 *   environment variable to survive the fork.
 *
 *   The guard is not decoration. These URLs are handed to DROP DATABASE, and
 *   the developer's DATABASE_URL points at isms_dev. A rewrite that silently
 *   failed would drop the working database, so a name that does not end in
 *   `_test` aborts instead.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const TEST_DB = 'isms_test';

function loadEnv() {
  for (const candidate of ['.env', '../../.env']) {
    const path = resolve(process.cwd(), candidate);
    if (existsSync(path)) {
      require('dotenv').config({ path, quiet: true });
      return;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Integration tests need a real PostgreSQL — copy .env.example to .env ` +
        'and start docker/compose.yml.',
    );
  }
  return value;
}

/** Swap the database name, keeping credentials, host, port and query string. */
function pointAt(url, database) {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function testUrls() {
  loadEnv();
  const app = pointAt(requireEnv('DATABASE_URL'), TEST_DB);
  const owner = pointAt(requireEnv('DATABASE_URL_MIGRATE'), TEST_DB);

  for (const url of [app, owner]) {
    if (!new URL(url).pathname.endsWith('_test')) {
      throw new Error(`refusing to operate on ${url} — the integration database must end in _test`);
    }
  }

  return { app, owner, adminUrl: pointAt(requireEnv('DATABASE_URL_MIGRATE'), 'postgres'), TEST_DB };
}

module.exports = { testUrls, TEST_DB };
