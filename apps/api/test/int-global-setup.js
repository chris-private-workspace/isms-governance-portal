/**
 * File: apps/api/test/int-global-setup.js
 * Purpose: Build the integration database from nothing on every run, then prove
 *   the premise the whole suite rests on before a single test executes.
 * Category: Tooling / test infrastructure
 * Scope: Phase W02
 *
 * Description:
 *   Drop, create, migrate, seed. Recreating rather than truncating is what makes
 *   this suite also the first thing that ever runs `prisma migrate deploy`
 *   against a clean database — until now migrations had only ever been applied
 *   to a developer's isms_dev, which is the same shape as CH-013's "the
 *   Dockerfile had never been built" (W02 Day 1 notes).
 *
 *   ⚠️ The role assertion is the load-bearing part of this file. A superuser
 *   bypasses row-level security even with FORCE, so if the suite connected as
 *   one, every isolation test below would pass while proving nothing. That is
 *   not hypothetical: it happened on 2026-08-09, when .env still held W01's
 *   single-role URL and a twelve-check probe came back entirely green with RLS
 *   never once applied. Asserting the premise costs one query.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { Client } = require('pg');
const { testUrls, TEST_DB } = require('./int-db');

// Stable ids so assertions can name entities instead of threading ids around.
const SEED = {
  entities: [
    ['00000000-0000-0000-0000-0000000000a0', 'APAC', 'APAC', 'region', null, '/apac'],
    ['00000000-0000-0000-0000-0000000000b0', 'SG', 'Singapore', 'country', 'APAC', '/apac/sg'],
    [
      '00000000-0000-0000-0000-0000000000c0',
      'SG1',
      'SG OpCo 1',
      'legal_entity',
      'SG',
      '/apac/sg/sg1',
    ],
    ['00000000-0000-0000-0000-0000000000b1', 'HK', 'Hong Kong', 'country', 'APAC', '/apac/hk'],
    [
      '00000000-0000-0000-0000-0000000000c1',
      'HK1',
      'HK OpCo 1',
      'legal_entity',
      'HK',
      '/apac/hk/hk1',
    ],
  ],
  policies: [
    [
      '00000000-0000-0000-0000-0000000000f0',
      '00000000-0000-0000-0000-0000000000c0',
      'SG1 access control policy',
    ],
    [
      '00000000-0000-0000-0000-0000000000f1',
      '00000000-0000-0000-0000-0000000000c1',
      'HK1 access control policy',
    ],
  ],
  // W03 (ADR-0005). Seeded through the OWNER connection on purpose: a global
  // declaration (org_entity_id NULL) cannot be written through a scoped client,
  // because the catalog's WITH CHECK requires org_entity_id = ANY(scope). That
  // is the design — declaring a field for the whole group is not something one
  // OpCo may do on everyone's behalf — and it means group-wide rows arrive by
  // migration or admin path, which here is this seed.
  extensionFields: [
    // [id, orgEntityId, entityType, key, dataType, required]
    ['00000000-0000-0000-0000-0000000000e0', null, 'policy', 'reviewCycle', 'string', false],
    ['00000000-0000-0000-0000-0000000000e1', null, 'policy', 'cycleCount', 'number', false],
    [
      '00000000-0000-0000-0000-0000000000e2',
      '00000000-0000-0000-0000-0000000000c0',
      'policy',
      'sgRegRef',
      'string',
      false,
    ],
    [
      '00000000-0000-0000-0000-0000000000e3',
      '00000000-0000-0000-0000-0000000000c1',
      'policy',
      'hkRegRef',
      'string',
      false,
    ],
  ],
};

module.exports = async function globalSetup() {
  const { app, owner, adminUrl } = testUrls();

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  // WITH (FORCE) terminates leftover sessions from an interrupted run; without
  // it a stray connection makes the drop fail and the suite runs against last
  // run's data, which is the quietest possible way to test nothing.
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  const prismaCli = resolve(__dirname, '../../../node_modules/prisma/build/index.js');
  const migrate = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL_MIGRATE: owner, DATABASE_URL: owner },
    encoding: 'utf8',
  });
  if (migrate.status !== 0) {
    throw new Error(
      `prisma migrate deploy failed on ${TEST_DB}:\n${migrate.stdout}${migrate.stderr}`,
    );
  }

  const seed = new Client({ connectionString: owner });
  await seed.connect();
  for (const [id, code, name, type, parentCode, path] of SEED.entities) {
    await seed.query(
      `INSERT INTO org_entities (id, code, name, type, parent_id, path, updated_at)
       VALUES ($1, $2, $3, $4::org_entity_type,
               (SELECT id FROM org_entities WHERE code = $5), $6, now())`,
      [id, code, name, type, parentCode, path],
    );
  }
  for (const [id, orgEntityId, title] of SEED.policies) {
    await seed.query(
      'INSERT INTO policies (id, org_entity_id, title, updated_at) VALUES ($1, $2, $3, now())',
      [id, orgEntityId, title],
    );
  }
  for (const [id, orgEntityId, entityType, key, dataType, required] of SEED.extensionFields) {
    await seed.query(
      `INSERT INTO extension_fields (id, org_entity_id, entity_type, key, data_type, required, updated_at)
       VALUES ($1, $2, $3, $4, $5::extension_data_type, $6, now())`,
      [id, orgEntityId, entityType, key, dataType, required],
    );
  }
  await seed.end();

  // Premise, not decoration: everything below is meaningless if RLS does not
  // apply to the role the tests connect as.
  const probe = new Client({ connectionString: app });
  await probe.connect();
  const { rows } = await probe.query(
    'SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
  );
  await probe.end();

  const role = rows[0];
  if (!role || role.rolsuper || role.rolbypassrls) {
    throw new Error(
      `integration tests would connect as ${role?.rolname ?? 'unknown'} ` +
        `(super=${role?.rolsuper} bypassrls=${role?.rolbypassrls}). ` +
        'Row-level security does not apply to such a role, so every isolation ' +
        'assertion in this suite would pass without testing anything.',
    );
  }

  console.log(
    `\n[int] ${TEST_DB} rebuilt, migrated and seeded; app role ${role.rolname} is least-privilege.`,
  );
};
