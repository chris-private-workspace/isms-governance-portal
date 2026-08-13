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
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Phase W07 — control tests and evidence, one per entity
 *   - 2026-08-12: Phase W06 — controls, incl. the group row the app cannot write
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
  // W06. Three controls, and the THIRD one is the point: `applies_to_scope =
  // group` is seeded through the OWNER connection because the application
  // cannot write it — the insert policy carries `AND applies_to_scope <>
  // 'group'` (ADR-0014). Exactly the same arrangement extension_fields already
  // has for its global rows, and for the same reason: publishing to the whole
  // group is not something one OpCo does on the others' behalf.
  //
  // ⚠️ The group row is OWNED BY SG1. That is what makes "HK1 can read it"
  // a real cross-entity read rather than a row nobody owns.
  controls: [
    // [id, orgEntityId, refCode, title, type, nature, frequency, appliesToScope]
    [
      '00000000-0000-0000-0000-000000000a50',
      '00000000-0000-0000-0000-0000000000c0',
      'CTRL-SG1-000001',
      'SG1 quarterly access review',
      'detective',
      'manual',
      'quarterly',
      'entity',
    ],
    [
      '00000000-0000-0000-0000-000000000a51',
      '00000000-0000-0000-0000-0000000000c0',
      'CTRL-SG1-000002',
      'Group password standard',
      'preventive',
      'automated',
      'continuous',
      'group',
    ],
    [
      '00000000-0000-0000-0000-000000000a52',
      '00000000-0000-0000-0000-0000000000c1',
      'CTRL-HK1-000001',
      'HK1 quarterly access review',
      'detective',
      'manual',
      'quarterly',
      'entity',
    ],
  ],
  // W07. One test per entity, each against that entity's OWN control. Both sides
  // for the reason the asset fixtures give: with only SG1 rows, "HK1 cannot see
  // SG1's test" and "HK1 has no tests" are the same observation.
  //
  // ⚠️ Seeded through the OWNER connection, which is also the only way this can
  // work: control_tests carries a BEFORE INSERT trigger whose lookup runs under
  // the caller's policies, and this connection never sets app.entity_scope.
  controlTests: [
    // [id, orgEntityId, refCode, controlId]
    [
      '00000000-0000-0000-0000-000000000a60',
      '00000000-0000-0000-0000-0000000000c0',
      'CTST-SG1-000001',
      '00000000-0000-0000-0000-000000000a50',
    ],
    [
      '00000000-0000-0000-0000-000000000a61',
      '00000000-0000-0000-0000-0000000000c1',
      'CTST-HK1-000001',
      '00000000-0000-0000-0000-000000000a52',
    ],
  ],
  // W07. One per entity, each linked to that entity's own test above.
  evidence: [
    // [id, orgEntityId, refCode, linkedId]
    [
      '00000000-0000-0000-0000-000000000a70',
      '00000000-0000-0000-0000-0000000000c0',
      'EVID-SG1-000001',
      '00000000-0000-0000-0000-000000000a60',
    ],
    [
      '00000000-0000-0000-0000-000000000a71',
      '00000000-0000-0000-0000-0000000000c1',
      'EVID-HK1-000001',
      '00000000-0000-0000-0000-000000000a61',
    ],
  ],
  // W08. One finding per entity. Both sides again, for the reason the asset
  // fixtures give: with only SG1 rows, "HK1 cannot see SG1's issue" and "HK1 has
  // no issues" are the same observation.
  issues: [
    // [id, orgEntityId, refCode, title, source, severity]
    [
      '00000000-0000-0000-0000-000000000a80',
      '00000000-0000-0000-0000-0000000000c0',
      'ISSU-SG1-000001',
      'Backup restore was never tested',
      'test',
      'high',
    ],
    [
      '00000000-0000-0000-0000-000000000a81',
      '00000000-0000-0000-0000-0000000000c1',
      'ISSU-HK1-000001',
      'Leavers keep VPN access past their last day',
      'manual',
      'critical',
    ],
  ],
  // W08. One action per entity, each under that entity's OWN issue — the
  // composite key permits nothing else, which is what the suite goes on to pin.
  actions: [
    // [id, orgEntityId, refCode, issueId, description]
    [
      '00000000-0000-0000-0000-000000000a90',
      '00000000-0000-0000-0000-0000000000c0',
      'ACTN-SG1-000001',
      '00000000-0000-0000-0000-000000000a80',
      'Schedule a quarterly restore drill',
    ],
    [
      '00000000-0000-0000-0000-000000000a91',
      '00000000-0000-0000-0000-0000000000c1',
      'ACTN-HK1-000001',
      '00000000-0000-0000-0000-000000000a81',
      'Wire offboarding to the VPN directory group',
    ],
  ],
  // W09. One template and one assignment per entity. The template's `version` is
  // left at its default 1 here; the suite bumps SG1's to 2 in place to prove the
  // snapshot trigger copies what it finds rather than always writing 1.
  assessmentTemplates: [
    // [id, orgEntityId, refCode, name, subjectType]
    [
      '00000000-0000-0000-0000-000000000aa0',
      '00000000-0000-0000-0000-0000000000c0',
      'ASTM-SG1-000001',
      'Annual RCSA',
      'risk',
    ],
    [
      '00000000-0000-0000-0000-000000000aa1',
      '00000000-0000-0000-0000-0000000000c1',
      'ASTM-HK1-000001',
      'Access review questionnaire',
      'control',
    ],
  ],
  // ⚠️ Neither instance names a reviewer. The SoD check only fires when two names
  // are present, so a seed that filled both would be asserting the rule holds
  // rather than leaving the suite free to test both sides of it.
  assessmentInstances: [
    // [id, orgEntityId, refCode, templateId, subjectType, subjectId]
    [
      '00000000-0000-0000-0000-000000000ab0',
      '00000000-0000-0000-0000-0000000000c0',
      'ASIN-SG1-000001',
      '00000000-0000-0000-0000-000000000aa0',
      'risk',
      '00000000-0000-0000-0000-000000000a20',
    ],
    [
      '00000000-0000-0000-0000-000000000ab1',
      '00000000-0000-0000-0000-0000000000c1',
      'ASIN-HK1-000001',
      '00000000-0000-0000-0000-000000000aa1',
      'control',
      '00000000-0000-0000-0000-000000000a21',
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
  for (const [
    id,
    orgEntityId,
    refCode,
    title,
    type,
    nature,
    frequency,
    appliesToScope,
  ] of SEED.controls) {
    await seed.query(
      `INSERT INTO controls (id, org_entity_id, ref_code, title, type, nature,
                             frequency, applies_to_scope, updated_at)
       VALUES ($1, $2, $3, $4, $5::control_type, $6::control_nature,
               $7::control_frequency, $8::control_applies_to_scope, now())`,
      [id, orgEntityId, refCode, title, type, nature, frequency, appliesToScope],
    );
  }
  for (const [id, orgEntityId, refCode, controlId] of SEED.controlTests) {
    await seed.query(
      `INSERT INTO control_tests (id, org_entity_id, ref_code, control_id, updated_at)
       VALUES ($1, $2, $3, $4, now())`,
      [id, orgEntityId, refCode, controlId],
    );
  }
  for (const [id, orgEntityId, refCode, linkedId] of SEED.evidence) {
    await seed.query(
      `INSERT INTO evidence (id, org_entity_id, ref_code, kind, uri_or_blob_ref, hash,
                             collected_at, linked_type, linked_id, updated_at)
       VALUES ($1, $2, $3, 'screenshot', 'file://seed/evidence.png',
               'sha256:0000000000000000000000000000000000000000000000000000000000000000',
               now(), 'control_test'::evidence_linked_type, $4, now())`,
      [id, orgEntityId, refCode, linkedId],
    );
  }
  for (const [id, orgEntityId, refCode, title, source, severity] of SEED.issues) {
    await seed.query(
      `INSERT INTO issues (id, org_entity_id, ref_code, title, source, severity, updated_at)
       VALUES ($1, $2, $3, $4, $5::issue_source, $6::issue_severity, now())`,
      [id, orgEntityId, refCode, title, source, severity],
    );
  }
  for (const [id, orgEntityId, refCode, issueId, description] of SEED.actions) {
    await seed.query(
      `INSERT INTO actions (id, org_entity_id, ref_code, issue_id, description, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [id, orgEntityId, refCode, issueId, description],
    );
  }
  for (const [id, orgEntityId, refCode, name, subjectType] of SEED.assessmentTemplates) {
    await seed.query(
      `INSERT INTO assessment_templates
         (id, org_entity_id, ref_code, name, subject_type, definition, updated_at)
       VALUES ($1, $2, $3, $4, $5::assessment_subject_type, $6::jsonb, now())`,
      [
        id,
        orgEntityId,
        refCode,
        name,
        subjectType,
        // Two questions with ids, because the suite answers one of them and then
        // answers a third that was never asked — which must succeed, since
        // nothing can refuse it.
        JSON.stringify({
          sections: [
            {
              id: 's1',
              title: 'Access',
              questions: [
                { id: 'q1', type: 'yes_no_na', text: 'Are leaver accounts revoked in 24h?' },
                { id: 'q2', type: 'score', text: 'Rate the evidence quality 1-5' },
              ],
            },
          ],
        }),
      ],
    );
  }
  // ⚠️ template_version is NOT supplied — the BEFORE INSERT trigger fills it from
  // the template. Passing one here would seed the very assertion the suite makes.
  for (const [id, orgEntityId, refCode, templateId, subjectType, subjectId] of SEED
    .assessmentInstances) {
    await seed.query(
      `INSERT INTO assessment_instances
         (id, org_entity_id, ref_code, template_id, template_version,
          subject_type, subject_id, period, updated_at)
       VALUES ($1, $2, $3, $4, 0, $5::assessment_subject_type, $6, now(), now())`,
      [id, orgEntityId, refCode, templateId, subjectType, subjectId],
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
  // W06. Counts the group-shared row too — it carries an SG1 ref_code, so
  // skipping it would hand the next SG1 control a number already taken.
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'control', count(*), now() FROM controls GROUP BY org_entity_id`,
  );
  // W07. Same derivation, same reason: hard-coding these would hand the first
  // test created through the API a number the seed already used.
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'control_test', count(*), now() FROM control_tests GROUP BY org_entity_id`,
  );
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'evidence', count(*), now() FROM evidence GROUP BY org_entity_id`,
  );
  // W08. Same derivation, same reason.
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'issue', count(*), now() FROM issues GROUP BY org_entity_id`,
  );
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'action', count(*), now() FROM actions GROUP BY org_entity_id`,
  );
  // W09. `assessment_response` is deliberately NOT seeded — no responses exist,
  // so its counter starts absent and issueRefCode's upsert creates it. Same
  // reasoning W05 recorded for `risk`: the first-ever code for a type is a path
  // that otherwise never runs.
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'assessment_template', count(*), now() FROM assessment_templates GROUP BY org_entity_id`,
  );
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'assessment_instance', count(*), now() FROM assessment_instances GROUP BY org_entity_id`,
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
