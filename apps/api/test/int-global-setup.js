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
  // W15. The eleven in-scope jurisdictions, quoted from 15:41 — a settled group
  // fact (已確認參數 #4), not fabricated fixture data. India/DPDP and China/PIPL
  // are both out of scope and deliberately absent.
  //
  // ⚠️ All eleven are residency_policy `none`, and that is the real position
  // rather than a placeholder: China was the only in-scope jurisdiction that was
  // ever anything else, and it left on 2026-08-08 (CH-008 / ADR-0010 / D001).
  //
  // ⛔ The 01xx id range is new in W15 — verified zero hits across apps/api
  // before use, because W14 lost seven tests to an id collision (ab0 was already
  // an assessment instance) that a global replace had made invisible.
  jurisdictions: [
    // [id, code, name]
    ['00000000-0000-0000-0000-0000000001a0', 'HK', 'Hong Kong'],
    ['00000000-0000-0000-0000-0000000001a1', 'SG', 'Singapore'],
    ['00000000-0000-0000-0000-0000000001a2', 'MY', 'Malaysia'],
    ['00000000-0000-0000-0000-0000000001a3', 'TH', 'Thailand'],
    ['00000000-0000-0000-0000-0000000001a4', 'ID', 'Indonesia'],
    ['00000000-0000-0000-0000-0000000001a5', 'PH', 'Philippines'],
    ['00000000-0000-0000-0000-0000000001a6', 'VN', 'Vietnam'],
    ['00000000-0000-0000-0000-0000000001a7', 'KR', 'Korea'],
    ['00000000-0000-0000-0000-0000000001a8', 'TW', 'Taiwan'],
    ['00000000-0000-0000-0000-0000000001a9', 'AU', 'Australia'],
    ['00000000-0000-0000-0000-0000000001aa', 'NZ', 'New Zealand'],
  ],

  // W15. ⛔ THE MINIMUM FIXTURE THAT MAKES THE FK CHAIN TESTABLE — this is NOT
  // the obligation library being populated.
  //
  // D003 defers "regulatory content subscription" to Wave 2 on the ground that
  // 已確認參數 #15 says build the interface, do not fill it. That defers the
  // CONTENT — the actual body of statute. Two named regulations and one clause
  // of placeholder text exist here so that 02a:427's two required N:1 links have
  // something to point at in a test. If you find yourself adding a third
  // regulation because a feature needs it, that feature is Wave 2.
  //
  // ⚠️ The clause text is deliberately synthetic. This repo has no licence to
  // reproduce statute, and `reference/` is excluded from version control.
  regulations: [
    // [id, name, jurisdictionId]
    ['00000000-0000-0000-0000-0000000001b0', 'PDPA', '00000000-0000-0000-0000-0000000001a1'],
    ['00000000-0000-0000-0000-0000000001b1', 'PDPO', '00000000-0000-0000-0000-0000000001a0'],
  ],
  obligations: [
    // [id, regulationId, jurisdictionId, reference, text]
    [
      '00000000-0000-0000-0000-0000000001c0',
      '00000000-0000-0000-0000-0000000001b0',
      '00000000-0000-0000-0000-0000000001a1',
      's.placeholder',
      'Placeholder clause text (seed). Not statute — see the comment above.',
    ],
  ],

  // ⚠️ W15 added a 7th element, jurisdictionId. APAC's is NULL and that is the
  // point rather than an omission: a `region` node spans all eleven, so there is
  // no correct single value — which is why the column is nullable (02a:159 does
  // not say, and NOT NULL could not express this row).
  entities: [
    // [id, code, name, type, parentCode, path, jurisdictionId]
    ['00000000-0000-0000-0000-0000000000a0', 'APAC', 'APAC', 'region', null, '/apac', null],
    [
      '00000000-0000-0000-0000-0000000000b0',
      'SG',
      'Singapore',
      'country',
      'APAC',
      '/apac/sg',
      '00000000-0000-0000-0000-0000000001a1',
    ],
    [
      '00000000-0000-0000-0000-0000000000c0',
      'SG1',
      'SG OpCo 1',
      'legal_entity',
      'SG',
      '/apac/sg/sg1',
      '00000000-0000-0000-0000-0000000001a1',
    ],
    [
      '00000000-0000-0000-0000-0000000000b1',
      'HK',
      'Hong Kong',
      'country',
      'APAC',
      '/apac/hk',
      '00000000-0000-0000-0000-0000000001a0',
    ],
    [
      '00000000-0000-0000-0000-0000000000c1',
      'HK1',
      'HK OpCo 1',
      'legal_entity',
      'HK',
      '/apac/hk/hk1',
      '00000000-0000-0000-0000-0000000001a0',
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
  // W14. One sign-off per entity, each on that entity's OWN policy.
  //
  // ⚠️ Seeded through the OWNER connection for the same reason control_tests is:
  // attestations carries a BEFORE INSERT trigger whose lookup runs under the
  // caller's policies, and this connection never sets app.entity_scope.
  //
  // ⭐ Both sides, and here it buys something specific beyond the usual reason:
  // evidence.int.spec.ts needs a real attestation id to prove EvidenceLinkedType's
  // second value resolves against a DIFFERENT table. A fabricated uuid would be
  // refused by the trigger and the test could not tell that apart from the branch
  // being absent.
  attestations: [
    // [id, orgEntityId, refCode, subjectType, subjectId]
    [
      '00000000-0000-0000-0000-000000000ac0',
      '00000000-0000-0000-0000-0000000000c0',
      'ATT-SG1-000001',
      'policy',
      '00000000-0000-0000-0000-0000000000f0',
    ],
    [
      '00000000-0000-0000-0000-000000000ac1',
      '00000000-0000-0000-0000-0000000000c1',
      'ATT-HK1-000001',
      'policy',
      '00000000-0000-0000-0000-0000000000f1',
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
  // W16. One ISMS profile per entity plus one of each child. BOTH entities
  // again, for the reason the asset fixtures give: with only SG1 rows, "HK1
  // cannot read SG1's profile" and "HK1 has no profile" are the same
  // observation, and only the second one is true.
  //
  // ⚠️ Every person here is an obvious fixture string (guardrail 7: no real
  // personal data in seed or demo data, ever).
  ismsProfiles: [
    // [id, orgEntityId, refCode, profileYear]
    [
      '00000000-0000-0000-0000-000000160001',
      '00000000-0000-0000-0000-0000000000c0',
      'ISMS-SG1-000001',
      2026,
    ],
    [
      '00000000-0000-0000-0000-000000160002',
      '00000000-0000-0000-0000-0000000000c1',
      'ISMS-HK1-000001',
      2026,
    ],
  ],
  ismsSites: [
    // [id, orgEntityId, ismsProfileId, refCode, siteName, isHeadOffice]
    [
      '00000000-0000-0000-0000-000000160011',
      '00000000-0000-0000-0000-0000000000c0',
      '00000000-0000-0000-0000-000000160001',
      'SITE-SG1-000001',
      'Fixture Head Office (SG1)',
      true,
    ],
    [
      '00000000-0000-0000-0000-000000160012',
      '00000000-0000-0000-0000-0000000000c1',
      '00000000-0000-0000-0000-000000160002',
      'SITE-HK1-000001',
      'Fixture Head Office (HK1)',
      true,
    ],
  ],
  ismsContacts: [
    // [id, orgEntityId, ismsProfileId, refCode, name, role]
    [
      '00000000-0000-0000-0000-000000160021',
      '00000000-0000-0000-0000-0000000000c0',
      '00000000-0000-0000-0000-000000160001',
      'ICON-SG1-000001',
      'Fixture ISMS Lead (SG1)',
      'ISMS lead',
    ],
    [
      '00000000-0000-0000-0000-000000160022',
      '00000000-0000-0000-0000-0000000000c1',
      '00000000-0000-0000-0000-000000160002',
      'ICON-HK1-000001',
      'Fixture ISMS Lead (HK1)',
      'ISMS lead',
    ],
  ],
  approvedOfferings: [
    // [id, orgEntityId, ismsProfileId, refCode, name, businessLine, offeringType, approvalStatus]
    [
      '00000000-0000-0000-0000-000000160031',
      '00000000-0000-0000-0000-0000000000c0',
      '00000000-0000-0000-0000-000000160001',
      'OFFR-SG1-000001',
      'Fixture Managed Print Service',
      'os',
      'service',
      'approved',
    ],
    [
      '00000000-0000-0000-0000-000000160032',
      '00000000-0000-0000-0000-0000000000c1',
      '00000000-0000-0000-0000-000000160002',
      'OFFR-HK1-000001',
      'Fixture Multifunction Printer',
      'op',
      'product',
      'proposed',
    ],
  ],
  ismsProfileVersions: [
    // [id, orgEntityId, ismsProfileId, refCode, versionLabel]
    [
      '00000000-0000-0000-0000-000000160041',
      '00000000-0000-0000-0000-0000000000c0',
      '00000000-0000-0000-0000-000000160001',
      'ISMV-SG1-000001',
      'v1.0',
    ],
    [
      '00000000-0000-0000-0000-000000160042',
      '00000000-0000-0000-0000-0000000000c1',
      '00000000-0000-0000-0000-000000160002',
      'ISMV-HK1-000001',
      'v1.0',
    ],
  ],
  // W17. The six confirmed retention classes, QUOTED from 05:73-80 — a settled
  // group fact (已確認參數 #9: digitise the company's existing forms, do not
  // invent fields), not fabricated fixture data. The same standing as the eleven
  // jurisdictions above, and the same consequence: retention.int.spec.ts checks
  // this list against CLASSES, which is transcribed from 05 separately and NOT
  // read back from here, so the assertion can disagree with the fixture.
  //
  // ⛔ THREE COLUMNS ARE ABSENT FROM EVERY ROW, and that is the source's shape
  // rather than an incomplete fixture. 05:73-80 has three columns — class,
  // retention, basis — and 02a:314 says so itself: what 05 confirms is "the six
  // confirmed CLASSES AND PERIODS". trigger, disposition and review_cadence have
  // no per-row source, which is why Day 2 made the first two nullable. Filling
  // them here would be inventing four of six values and then testing against the
  // invention.
  //
  // ⛔ The 017xxxx id range is new in W17 — verified ZERO hits across apps/api
  // before use, the check W15 introduced after W14 lost seven tests to an id
  // collision that a global replace had made invisible.
  retentionPolicies: [
    // [id, recordClass, duration, basis]
    [
      '00000000-0000-0000-0000-000000170001',
      'Security incident records',
      '3 years after closure',
      'ISO 27001 A.5.28 · group records policy',
    ],
    [
      '00000000-0000-0000-0000-000000170002',
      'Risk Management Report & SoA',
      '3 years per version',
      'RM procedure',
    ],
    [
      '00000000-0000-0000-0000-000000170003',
      'ISMS profile versions',
      '3 years per version',
      'Controlled document register',
    ],
    [
      '00000000-0000-0000-0000-000000170004',
      'Audit issues & evidence',
      '6 years',
      'Certification body requirement',
    ],
    [
      '00000000-0000-0000-0000-000000170005',
      'External party assessments',
      'Contract term + 2 years',
      'A.5.19–A.5.22',
    ],
    [
      '00000000-0000-0000-0000-000000170006',
      'Platform audit log',
      '7 years, immutable',
      'Append-only, SHA-256 chained — no disposal',
    ],
  ],
  // W17. BOTH entities again, for the reason the asset and profile fixtures
  // give: with only SG1 rows, "HK1 cannot read SG1's hold" and "HK1 has no
  // holds" are the same observation, and only the second one is true.
  //
  // ⚠️ Row 3 is RELEASED — released_at and released_by both set — and it is the
  // only row that exercises legal_holds_released_pair_check from the satisfied
  // side. Without it the CHECK would only ever be tested by the rows that leave
  // both NULL, and "the constraint exists" would rest on one half of it.
  legalHolds: [
    // [id, orgEntityId, refCode, scopeType, scopeRef, reason, appliedBy, releasedBy]
    [
      '00000000-0000-0000-0000-000000170011',
      '00000000-0000-0000-0000-0000000000c0',
      'HOLD-SG1-000001',
      'record',
      '00000000-0000-0000-0000-000000160001',
      'Fixture hold — litigation (SG1)',
      '00000000-0000-0000-0000-0000000000d0',
      null,
    ],
    [
      '00000000-0000-0000-0000-000000170012',
      '00000000-0000-0000-0000-0000000000c1',
      'HOLD-HK1-000001',
      'class',
      'Security incident records',
      'Fixture hold — regulatory request (HK1)',
      '00000000-0000-0000-0000-0000000000d1',
      null,
    ],
    [
      '00000000-0000-0000-0000-000000170013',
      '00000000-0000-0000-0000-0000000000c0',
      'HOLD-SG1-000002',
      'entity',
      '00000000-0000-0000-0000-0000000000c0',
      'Fixture hold — closed matter (SG1)',
      '00000000-0000-0000-0000-0000000000d0',
      '00000000-0000-0000-0000-0000000000d0',
    ],
  ],
  // W18. Both entities again, for the reason every fixture since W05 gives:
  // with only SG1 rows, "HK1 cannot read SG1's event" and "HK1 has no events"
  // are the same observation and only the second one is true.
  //
  // All three severity levels appear at least once. An enum value no row ever
  // holds is a value nothing exercises — the column would accept it and no test
  // would notice if the type were narrowed.
  //
  // ⚠️ Row 2 carries a loss_amount and is the only thing that will put a number
  // in that column before M6. The schema docstring says every PRODUCTION row is
  // NULL; that stays true. This is the seed supplying a literal, exactly as it
  // does for legal_holds.ref_code, and it is here so DECIMAL(18,2) is exercised
  // rather than merely declared.
  events: [
    // [id, orgEntityId, refCode, title, occurredAt, detectedAt, severity, description, lossAmount]
    [
      '00000000-0000-0000-0000-000000180001',
      '00000000-0000-0000-0000-0000000000c0',
      'EVT-SG1-000001',
      'Fixture event — phishing mail reported by staff (SG1)',
      '2026-07-14T02:10:00Z',
      '2026-07-14T06:45:00Z',
      's2',
      'Fixture row. Reported through the security mailbox; nothing left the OpCo.',
      null,
    ],
    [
      '00000000-0000-0000-0000-000000180002',
      '00000000-0000-0000-0000-0000000000c0',
      'EVT-SG1-000002',
      'Fixture event — laptop lost in transit (SG1)',
      '2026-07-28T09:00:00Z',
      '2026-07-28T09:30:00Z',
      's1',
      'Fixture row. Full-disk encrypted. Carries the only non-null loss_amount.',
      '4820.00',
    ],
    [
      '00000000-0000-0000-0000-000000180003',
      '00000000-0000-0000-0000-0000000000c1',
      'EVT-HK1-000001',
      'Fixture event — non-critical print server outage (HK1)',
      '2026-08-02T01:15:00Z',
      '2026-08-02T01:20:00Z',
      's3',
      'Fixture row. No information impact; work continued on the secondary queue.',
      null,
    ],
  ],
  // W18. ⭐ ROWS 1 AND 4 ARE THE POINT: same period, same metric_key, different
  // entity. They can only coexist because org_entity_id is IN the unique key,
  // so this fixture is a standing assertion about the key's shape rather than
  // background data (AD-UniqueKeyOracle-1, Day-0 D8).
  //
  // ⚠️ CONSEQUENCE FOR NEUTRALISATION, stated in advance because W16's N2a
  // showed how it reads otherwise: removing org_entity_id from that key makes
  // these two rows collide DURING SETUP. The suite dies in globalSetup with a
  // 23505 rather than failing a named test, and a crash looks like the
  // neutralisation was wrong rather than like it worked. That crash IS the
  // expected red for N4.
  //
  // Two period formats on purpose — `2026-Q3` and `2026-07`. 02a:469 gives both
  // ("e.g. 2026-Q3 or month key") with no rule for choosing, which is why the
  // column is TEXT; a fixture using only one shape would let a later DATE or
  // enum narrowing pass unnoticed. All three rag bands appear.
  postureSnapshots: [
    // [id, orgEntityId, period, metricKey, metricValue, rag]
    [
      '00000000-0000-0000-0000-000000180011',
      '00000000-0000-0000-0000-0000000000c0',
      '2026-Q3',
      'total_risks',
      '42',
      'green',
    ],
    [
      '00000000-0000-0000-0000-000000180012',
      '00000000-0000-0000-0000-0000000000c0',
      '2026-Q3',
      'posture_rag',
      '2',
      'amber',
    ],
    [
      '00000000-0000-0000-0000-000000180013',
      '00000000-0000-0000-0000-0000000000c0',
      '2026-07',
      'rcsa_completion',
      '83.3333',
      'amber',
    ],
    [
      '00000000-0000-0000-0000-000000180014',
      '00000000-0000-0000-0000-0000000000c1',
      '2026-Q3',
      'total_risks',
      '17',
      'green',
    ],
    [
      '00000000-0000-0000-0000-000000180015',
      '00000000-0000-0000-0000-0000000000c1',
      '2026-07',
      'open_critical_issues',
      '3',
      'red',
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
  // W15. Jurisdictions FIRST — org_entities.jurisdiction_id references them, and
  // the reference data has to exist before the rows that point at it.
  for (const [id, code, name] of SEED.jurisdictions) {
    await seed.query(
      `INSERT INTO jurisdictions (id, code, name, updated_at) VALUES ($1, $2, $3, now())`,
      [id, code, name],
    );
  }
  for (const [id, name, jurisdictionId] of SEED.regulations) {
    await seed.query(
      `INSERT INTO regulations (id, name, jurisdiction_id, updated_at)
       VALUES ($1, $2, $3, now())`,
      [id, name, jurisdictionId],
    );
  }
  for (const [id, regulationId, jurisdictionId, reference, text] of SEED.obligations) {
    await seed.query(
      `INSERT INTO obligations (id, regulation_id, jurisdiction_id, reference, text, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [id, regulationId, jurisdictionId, reference, text],
    );
  }
  for (const [id, code, name, type, parentCode, path, jurisdictionId] of SEED.entities) {
    await seed.query(
      `INSERT INTO org_entities (id, code, name, type, parent_id, path, jurisdiction_id, updated_at)
       VALUES ($1, $2, $3, $4::org_entity_type,
               (SELECT id FROM org_entities WHERE code = $5), $6, $7, now())`,
      [id, code, name, type, parentCode, path, jurisdictionId],
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
  for (const [id, orgEntityId, refCode, subjectType, subjectId] of SEED.attestations) {
    await seed.query(
      `INSERT INTO attestations (id, org_entity_id, ref_code, subject_type, subject_id,
                                 attested_at, result, updated_at)
       VALUES ($1, $2, $3, $4::attestation_subject_type, $5, now(), 'acknowledged', now())`,
      [id, orgEntityId, refCode, subjectType, subjectId],
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
  // W16. isms_profiles FIRST — the four child tables carry a composite FK to
  // (id, org_entity_id) and cannot be inserted before the row they point at.
  //
  // ⚠️ THIS ORDERING IS HELD BY HAND. Nothing in this file checks that inserts
  // are topologically sorted; the only signal is a 23503 at setup time, which
  // fails the whole suite rather than naming the mistake.
  for (const [id, orgEntityId, refCode, profileYear] of SEED.ismsProfiles) {
    await seed.query(
      `INSERT INTO isms_profiles (id, org_entity_id, ref_code, profile_year, updated_at)
       VALUES ($1, $2, $3, $4, now())`,
      [id, orgEntityId, refCode, profileYear],
    );
  }
  for (const [id, orgEntityId, profileId, refCode, siteName, isHeadOffice] of SEED.ismsSites) {
    await seed.query(
      `INSERT INTO isms_sites (id, org_entity_id, isms_profile_id, ref_code, site_name,
                               is_head_office, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [id, orgEntityId, profileId, refCode, siteName, isHeadOffice],
    );
  }
  for (const [id, orgEntityId, profileId, refCode, name, role] of SEED.ismsContacts) {
    await seed.query(
      `INSERT INTO isms_contacts (id, org_entity_id, isms_profile_id, ref_code, name, role,
                                  updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [id, orgEntityId, profileId, refCode, name, role],
    );
  }
  for (const [
    id,
    orgEntityId,
    profileId,
    refCode,
    name,
    businessLine,
    offeringType,
    approvalStatus,
  ] of SEED.approvedOfferings) {
    await seed.query(
      `INSERT INTO approved_offerings (id, org_entity_id, isms_profile_id, ref_code, name,
                                       business_line, offering_type, approval_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::offering_business_line, $7::offering_type,
               $8::offering_approval_status, now())`,
      [id, orgEntityId, profileId, refCode, name, businessLine, offeringType, approvalStatus],
    );
  }
  for (const [id, orgEntityId, profileId, refCode, versionLabel] of SEED.ismsProfileVersions) {
    await seed.query(
      `INSERT INTO isms_profile_versions (id, org_entity_id, isms_profile_id, ref_code,
                                          version_label, versioned_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, DATE '2026-01-31', now())`,
      [id, orgEntityId, profileId, refCode, versionLabel],
    );
  }
  // W17. Reference data, no dependencies — order does not matter here, unlike
  // the profile block above.
  //
  // ⚠️ trigger / disposition / review_cadence are OMITTED FROM THE INSERT, not
  // passed as NULL, so this statement says what the source says and nothing
  // more. See the SEED.retentionPolicies comment for why the source stops at
  // three columns.
  for (const [id, recordClass, duration, basis] of SEED.retentionPolicies) {
    await seed.query(
      `INSERT INTO retention_policies (id, record_class, duration, basis, updated_at)
       VALUES ($1, $2, $3, $4, now())`,
      [id, recordClass, duration, basis],
    );
  }
  // ⚠️ THIS INSERT IS ITSELF AN ASSERTION, and W16's N2a is why it says so out
  // loud: when that phase narrowed a unique key, the seed violated it first and
  // the suite died in setup — a crash instead of a named failure, which reads
  // like the neutralisation was wrong rather than like it worked. The
  // constraints these rows depend on: legal_holds_org_entity_id_fkey,
  // legal_holds_applied_by_fkey, legal_holds_released_by_fkey,
  // legal_holds_ref_code_key, and legal_holds_released_pair_check (row 3 is the
  // satisfied side; rows 1 and 2 are the both-NULL side).
  for (const [
    id,
    orgEntityId,
    refCode,
    scopeType,
    scopeRef,
    reason,
    appliedBy,
    releasedBy,
  ] of SEED.legalHolds) {
    await seed.query(
      `INSERT INTO legal_holds (id, org_entity_id, ref_code, scope_type, scope_ref, reason,
                                applied_by, released_by, released_at, updated_at)
       VALUES ($1, $2, $3, $4::legal_hold_scope_type, $5, $6, $7, $8,
               CASE WHEN $8::uuid IS NULL THEN NULL ELSE now() END, now())`,
      [id, orgEntityId, refCode, scopeType, scopeRef, reason, appliedBy, releasedBy],
    );
  }
  // W18. Constraints these rows depend on: events_org_entity_id_fkey,
  // events_ref_code_key, and the event_severity domain. ⚠️ `updated_at` is
  // supplied explicitly — Prisma's @updatedAt is client-side and puts no DEFAULT
  // on the column, so a seed that omits it fails on NOT NULL (legal_holds above
  // does the same for the same reason).
  //
  // ⚠️ `$9::decimal` rather than a bare $9: node-pg sends JS null untyped, and
  // PostgreSQL cannot infer a type for a parameter that is NULL in every row it
  // sees first. The cast is what stops a 42P08 at PARSE time — the same failure
  // W17's tests 8, 10 and 11 all hit on their first run.
  for (const [
    id,
    orgEntityId,
    refCode,
    title,
    occurredAt,
    detectedAt,
    severity,
    description,
    lossAmount,
  ] of SEED.events) {
    await seed.query(
      `INSERT INTO events (id, org_entity_id, ref_code, title, occurred_at, detected_at,
                           severity, description, loss_amount, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::event_severity, $8, $9::decimal, now())`,
      [id, orgEntityId, refCode, title, occurredAt, detectedAt, severity, description, lossAmount],
    );
  }
  // W18. ⭐ This loop is an assertion about the unique key, not just data —
  // rows 1 and 4 share (period, metric_key) and differ only by entity, so they
  // insert cleanly if and only if org_entity_id is part of
  // posture_snapshots_org_entity_id_period_metric_key_key. See the fixture
  // comment for what that means when N4 removes it.
  //
  // captured_at is left to its DEFAULT: 02a:473 calls it the capture timestamp
  // and a seeded literal would be a fixture pretending to be a measurement.
  for (const [id, orgEntityId, period, metricKey, metricValue, rag] of SEED.postureSnapshots) {
    await seed.query(
      `INSERT INTO posture_snapshots (id, org_entity_id, period, metric_key, metric_value, rag)
       VALUES ($1, $2, $3, $4::posture_metric_key, $5::decimal, $6::posture_rag)`,
      [id, orgEntityId, period, metricKey, metricValue, rag],
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
  await seed.query(
    `INSERT INTO ref_code_counters (org_entity_id, entity_type, last_seq, updated_at)
     SELECT org_entity_id, 'attestation', count(*), now() FROM attestations GROUP BY org_entity_id`,
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

  // W15. Assert the reference-data seed landed at the expected COUNT, not just
  // without error. AD-TextEditStructuralScope-1's fix is two halves — anchor the
  // edit to a structural boundary AND assert the result — because W14 lost seven
  // tests to an edit that "succeeded" while silently hitting a second occurrence.
  //
  // ⚠️ This also protects a claim the tests depend on: jurisdiction.int.spec.ts
  // asserts an entity-scoped connection reads ALL ELEVEN jurisdictions. If the
  // seed silently dropped to two, that assertion would still pass its own shape
  // while proving far less — AD-VacuousScopeTest-1 arriving through the fixture
  // rather than through the test.
  const counted = new Client({ connectionString: owner });
  await counted.connect();
  // ⚠️ W16, STATED SO IT IS NOT MISREAD LATER: this guard is SELF-REFERENTIAL.
  // `expected` comes from the same array the INSERT loop reads, so it catches an
  // insert that failed to land and NOT an edit to SEED itself. What closes that
  // half for the jurisdictions is jurisdiction.int.spec.ts's IN_SCOPE list,
  // which is quoted from 15:41 and deliberately not read back from the seed.
  // The five W16 tables have no equivalent external fact to anchor against —
  // their rows are fixtures we invented — so for those this is a landing check
  // and nothing more. Do not describe it in a phase document as "the seed has a
  // guard" without that qualifier.
  for (const [table, expected] of [
    ['jurisdictions', SEED.jurisdictions.length],
    ['regulations', SEED.regulations.length],
    ['obligations', SEED.obligations.length],
    ['org_entities', SEED.entities.length],
    ['isms_profiles', SEED.ismsProfiles.length],
    ['isms_sites', SEED.ismsSites.length],
    ['isms_contacts', SEED.ismsContacts.length],
    ['approved_offerings', SEED.approvedOfferings.length],
    ['isms_profile_versions', SEED.ismsProfileVersions.length],
    // W17. `retention_policies` DOES have an external anchor, unlike the five
    // W16 tables above: retention.int.spec.ts holds CLASSES, transcribed from
    // 05:73-80 separately. So for this one the qualifier in the comment above
    // does not apply — both halves are closed. `legal_holds` is a fixture we
    // invented, so it is a landing check and nothing more.
    ['retention_policies', SEED.retentionPolicies.length],
    ['legal_holds', SEED.legalHolds.length],
    // W18. Both are fixtures this phase invented, like legal_holds — landing
    // checks rather than external anchors. ⚠️ The posture count is the one that
    // earns its keep: five rows across two entities and two period formats, so
    // a silent narrowing of the unique key surfaces here as a count mismatch in
    // the cases where it does not already crash the insert.
    ['events', SEED.events.length],
    ['posture_snapshots', SEED.postureSnapshots.length],
  ]) {
    const { rows: c } = await counted.query(`SELECT count(*)::int AS n FROM ${table}`);
    if (c[0].n !== expected) {
      await counted.end();
      throw new Error(
        `[int] seed count mismatch for ${table}: expected ${expected}, found ${c[0].n}. ` +
          'The seed edit did not land where it was meant to (AD-TextEditStructuralScope-1).',
      );
    }
  }
  await counted.end();

  console.log(
    `\n[int] ${TEST_DB} rebuilt, migrated and seeded; app role ${role.rolname} is least-privilege.`,
  );
};
