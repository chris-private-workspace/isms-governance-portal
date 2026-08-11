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
 * Last Modified: 2026-08-11
 *
 * Modification History (newest-first):
 *   - 2026-08-11: Phase W05 — the asset chain, two entities deep, plus libraries
 *   - 2026-08-10: Phase W04 — users, policy ref_code, counters derived from seed
 *   - 2026-08-10: Phase W03 — extension catalog seeded via the owner connection
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
  // W04. No real personal data and no real mailbox: example.* is reserved by
  // RFC 6761 and the names describe roles, not people (guardrail 7 forbids
  // realistic PII in seed data, and an ISMS platform seeding fake staff would
  // be exactly the kind of self-violation guardrail 1 rules out).
  users: [
    // [id, oidcSubject, email, displayName]
    [
      '00000000-0000-0000-0000-0000000000d0',
      'oidc|seed-sg1-owner',
      'sg1.owner@example.internal',
      'SG1 Policy Owner (seed)',
    ],
    [
      '00000000-0000-0000-0000-0000000000d1',
      'oidc|seed-hk1-owner',
      'hk1.owner@example.internal',
      'HK1 Policy Owner (seed)',
    ],
  ],
  // ref_code is explicit here, and the counters are derived from these rows
  // below rather than hard-coded. Hard-coding both is how a seed and its
  // sequence drift apart: the first policy created through the API would be
  // issued a number already taken, and the unique index would reject a write
  // the caller did nothing wrong to make.
  policies: [
    // [id, orgEntityId, title, refCode, ownerUserId]
    [
      '00000000-0000-0000-0000-0000000000f0',
      '00000000-0000-0000-0000-0000000000c0',
      'SG1 access control policy',
      'POL-SG1-000001',
      '00000000-0000-0000-0000-0000000000d0',
    ],
    [
      '00000000-0000-0000-0000-0000000000f1',
      '00000000-0000-0000-0000-0000000000c1',
      'HK1 access control policy',
      'POL-HK1-000001',
      '00000000-0000-0000-0000-0000000000d1',
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
    // W05. Declared for `risk` so the extension path has a second entity type to
    // prove it is keyed by entity_type and not merely working for policies.
    ['00000000-0000-0000-0000-0000000000e4', null, 'risk', 'riskAppetite', 'string', false],
  ],
  // W05. BOTH entities get a group and an asset. One-sided fixtures are how an
  // isolation suite passes while proving nothing: with only SG1 data, "HK1
  // cannot see SG1's asset" and "HK1 has no assets" are the same observation.
  assetGroups: [
    // [id, orgEntityId, refCode, name, assetCategory]
    [
      '00000000-0000-0000-0000-000000000a10',
      '00000000-0000-0000-0000-0000000000c0',
      'AGRP-SG1-000001',
      'SG1 core platform',
      'software',
    ],
    [
      '00000000-0000-0000-0000-000000000a11',
      '00000000-0000-0000-0000-0000000000c1',
      'AGRP-HK1-000001',
      'HK1 core platform',
      'software',
    ],
  ],
  assets: [
    // [id, orgEntityId, refCode, name, assetGroupId, assetCategory, classification]
    [
      '00000000-0000-0000-0000-000000000a20',
      '00000000-0000-0000-0000-0000000000c0',
      'AST-SG1-000001',
      'SG1 payments API',
      '00000000-0000-0000-0000-000000000a10',
      'software',
      'confidential',
    ],
    [
      '00000000-0000-0000-0000-000000000a21',
      '00000000-0000-0000-0000-0000000000c1',
      'AST-HK1-000001',
      'HK1 payments API',
      '00000000-0000-0000-0000-000000000a11',
      'software',
      'confidential',
    ],
  ],
  // Global libraries (multi-tenant-data.md:63) — no org_entity_id, and that is
  // the property the suite pins: BOTH entities must read the same rows.
  threats: [
    ['00000000-0000-0000-0000-000000000a30', 'Unauthorized Logical Access', 'access'],
    ['00000000-0000-0000-0000-000000000a31', 'Espionage and Intellectual Theft', 'espionage'],
  ],
  vulnerabilities: [
    [
      '00000000-0000-0000-0000-000000000a40',
      'Insufficient Visitor Control and Monitoring',
      'physical',
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
  for (const [id, oidcSubject, email, displayName] of SEED.users) {
    await seed.query(
      `INSERT INTO users (id, oidc_subject, email, display_name, updated_at)
       VALUES ($1, $2, $3, $4, now())`,
      [id, oidcSubject, email, displayName],
    );
  }
  for (const [id, orgEntityId, title, refCode, ownerUserId] of SEED.policies) {
    await seed.query(
      `INSERT INTO policies (id, org_entity_id, title, ref_code, owner_user_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [id, orgEntityId, title, refCode, ownerUserId],
    );
  }
  for (const [id, orgEntityId, refCode, name, assetCategory] of SEED.assetGroups) {
    await seed.query(
      `INSERT INTO asset_groups (id, org_entity_id, ref_code, name, asset_category, updated_at)
       VALUES ($1, $2, $3, $4, $5::asset_category, now())`,
      [id, orgEntityId, refCode, name, assetCategory],
    );
  }
  for (const [
    id,
    orgEntityId,
    refCode,
    name,
    assetGroupId,
    assetCategory,
    classification,
  ] of SEED.assets) {
    await seed.query(
      `INSERT INTO assets (id, org_entity_id, ref_code, name, asset_group_id,
                           asset_category, classification, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::asset_category, $7::asset_classification, now())`,
      [id, orgEntityId, refCode, name, assetGroupId, assetCategory, classification],
    );
  }
  for (const [id, name, category] of SEED.threats) {
    await seed.query(
      `INSERT INTO threats (id, name, category, updated_at) VALUES ($1, $2, $3, now())`,
      [id, name, category],
    );
  }
  for (const [id, name, category] of SEED.vulnerabilities) {
    await seed.query(
      `INSERT INTO vulnerabilities (id, name, category, updated_at) VALUES ($1, $2, $3, now())`,
      [id, name, category],
    );
  }
  // Derived, not declared: the counter must reflect what was just seeded, and
  // the only way to guarantee that is to compute it from those rows. Identical
  // to the backfill in 20260810185500_user_and_base_fields for the same reason.
  //
  // ⚠️ W05 adds two more counted types. `risk` is deliberately NOT seeded — no
  // risks exist yet, so its counter starts absent and issueRefCode's upsert
  // creates it. That path (first-ever code for a type) had no coverage before.
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'policy', count(*), now() FROM policies GROUP BY org_entity_id`,
  );
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'asset_group', count(*), now() FROM asset_groups GROUP BY org_entity_id`,
  );
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'asset', count(*), now() FROM assets GROUP BY org_entity_id`,
  );
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
