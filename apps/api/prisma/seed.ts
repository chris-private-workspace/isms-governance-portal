/**
 * File: apps/api/prisma/seed.ts
 * Purpose: Idempotent development data, spanning two entities, so a screen has something true to show.
 * Category: core-model (development affordance — never runs against a deployed database)
 * Scope: Phase W22 (M1 slice — risks vertical slice)
 * Owner: docs/01-planning/W22-risks-vertical-slice/plan.md §3.2
 *
 * Description:
 *   Three decisions here are load-bearing and none of them is obvious.
 *
 *   1. IT WRITES ACROSS TWO ENTITIES, ON PURPOSE. AC-3 asks for risks in both
 *      SG1 and HK1 because with rows in only one entity, "the scope filter
 *      works" and "there is no scope filter" produce the identical screen. A
 *      one-sided fixture cannot fail, which is the same reason
 *      int-global-setup.js seeds both sides.
 *
 *   2. IT CONNECTS AS THE OWNER, NOT AS THE APPLICATION. A cross-entity write
 *      is exactly what RLS refuses, and refusing it is correct — so a seed that
 *      went through the scoped client could only ever seed one entity. Using
 *      DATABASE_URL_MIGRATE is not a loophole around 約束 8; it is the same
 *      separation prisma.config.ts already draws, applied to the one job that
 *      legitimately sits outside the request path.
 *      ⚠️ Which is also why this file refuses to run with NODE_ENV=production.
 *
 *   3. THE REF CODES ARE FIXED, IN A RESERVED BLOCK. Idempotency needs a stable
 *      unique key, and ref_code is unique — but issueRefCode() allocates the
 *      NEXT number on every call, so a seed built on it would create a fresh
 *      set of rows each run and satisfy AC-2 never. The 9xxxxx block cannot
 *      collide with the counter, which runs upward from 000001, and it lets a
 *      reader tell a seeded row from a real one at a glance.
 *
 *   guardrail 7: no personal names, no email addresses, no account or card
 *   numbers of any shape. The owner columns stay NULL — they are filled by a
 *   credential at M4, and inventing a person here would be inventing PII.
 *
 * Key Components:
 *   - RISKS: the fixture set — 4 in SG1, 3 in HK1, scores chosen to span the bands
 *   - main(): upsert by fixed id, then report the per-entity counts it produced
 *
 * Created: 2026-08-18 (Phase W22)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Initial creation (Phase W22) — CH-042
 *
 * Related:
 *   - apps/api/test/int-global-setup.js — the same two-sided principle, for tests
 *   - CLAUDE.md guardrail 7 · 約束 8
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_ASSET = '00000000-0000-0000-0000-000000000a20';
const HK1_ASSET = '00000000-0000-0000-0000-000000000a21';
const THREAT = '00000000-0000-0000-0000-000000000a30';
const VULN = '00000000-0000-0000-0000-000000000a40';

/** Every seeded row says so, in a column the screen renders. */
const MARK = 'DEMO SEED —';

type ScoreSet = { lkh: number; fin: number; bop: number; lry: number; rep: number; sis: number };

interface SeedRisk {
  id: string;
  refCode: string;
  orgEntityId: string;
  assetId: string;
  title: string;
  category: string;
  description: string;
  ciaType: 'c' | 'i' | 'a' | 'ci' | 'ca' | 'ia' | 'cia';
  before?: ScoreSet;
  after?: ScoreSet;
}

/**
 * Scores span every band the register distinguishes: one residual >= 16
 * (requires_treatment AND in_it_risk_register), several acceptable, and one row
 * left entirely unassessed — because NULL is a state the screen has to render,
 * and a fixture where everything is scored lets a missing null-check through.
 *
 * ⚠️ Within each set, MAX and SUM disagree. {2,5,1,3,1} maxes at 5 and sums to
 * 12; a set like {5,0,0,0,0} would look identical under either rule and prove
 * nothing about which one the generated column applies.
 */
const RISKS: SeedRisk[] = [
  {
    id: '0000ee00-0000-0000-0000-000000000001',
    refCode: 'RISK-SG1-900001',
    orgEntityId: SG1,
    assetId: SG1_ASSET,
    title: 'Credential stuffing against the payments API',
    category: 'Access control',
    description:
      MARK +
      ' reused passwords from an unrelated breach are replayed against the payments API until one succeeds.',
    ciaType: 'cia',
    before: { lkh: 4, fin: 2, bop: 5, lry: 1, rep: 3, sis: 1 },
    after: { lkh: 2, fin: 2, bop: 3, lry: 1, rep: 2, sis: 1 },
  },
  {
    id: '0000ee00-0000-0000-0000-000000000002',
    refCode: 'RISK-SG1-900002',
    orgEntityId: SG1,
    assetId: SG1_ASSET,
    title: 'Shared administrator account on the payments database',
    category: 'Access control',
    description:
      MARK +
      ' one administrator credential is used by several engineers, so no action can be attributed to a person.',
    ciaType: 'ci',
    before: { lkh: 5, fin: 4, bop: 5, lry: 3, rep: 4, sis: 1 },
    after: { lkh: 4, fin: 3, bop: 4, lry: 2, rep: 3, sis: 1 },
  },
  {
    id: '0000ee00-0000-0000-0000-000000000003',
    refCode: 'RISK-SG1-900003',
    orgEntityId: SG1,
    assetId: SG1_ASSET,
    title: 'TLS termination on the public ingress uses an inherited default',
    category: 'Cryptography',
    description: MARK + ' the ingress accepts a cipher suite nobody chose, because nobody set one.',
    ciaType: 'c',
    before: { lkh: 3, fin: 1, bop: 4, lry: 2, rep: 3, sis: 1 },
    after: { lkh: 2, fin: 1, bop: 2, lry: 1, rep: 2, sis: 1 },
  },
  {
    id: '0000ee00-0000-0000-0000-000000000004',
    refCode: 'RISK-SG1-900004',
    orgEntityId: SG1,
    assetId: SG1_ASSET,
    title: 'Backup restore for the payments API has never been exercised',
    category: 'Business continuity',
    description:
      MARK +
      ' backups run and are reported as successful; no restore has been attempted. Deliberately left UNASSESSED — the screen has to render a risk with no score.',
    ciaType: 'a',
  },
  {
    id: '0000ee00-0000-0000-0000-000000000005',
    refCode: 'RISK-HK1-900001',
    orgEntityId: HK1,
    assetId: HK1_ASSET,
    title: 'Credential stuffing against the payments API',
    category: 'Access control',
    description:
      MARK +
      ' the same threat as SG1-900001, raised separately by HK1. Two entities can hold the same risk without sharing a row.',
    ciaType: 'cia',
    before: { lkh: 4, fin: 2, bop: 5, lry: 1, rep: 3, sis: 1 },
    after: { lkh: 2, fin: 1, bop: 2, lry: 1, rep: 2, sis: 1 },
  },
  {
    id: '0000ee00-0000-0000-0000-000000000006',
    refCode: 'RISK-HK1-900002',
    orgEntityId: HK1,
    assetId: HK1_ASSET,
    title: 'Vendor remote access is not session-recorded',
    category: 'Supplier management',
    description:
      MARK +
      ' a maintenance vendor connects to the payments API out of hours and nothing records what was done.',
    ciaType: 'ci',
    before: { lkh: 4, fin: 2, bop: 4, lry: 4, rep: 3, sis: 1 },
    after: { lkh: 3, fin: 2, bop: 3, lry: 4, rep: 2, sis: 1 },
  },
  {
    id: '0000ee00-0000-0000-0000-000000000007',
    refCode: 'RISK-HK1-900003',
    orgEntityId: HK1,
    assetId: HK1_ASSET,
    title: 'Data room visitor access is recorded on paper only',
    category: 'Physical security',
    description:
      MARK +
      ' the visitor log is a paper book at reception, so a question about last quarter takes days to answer.',
    ciaType: 'ca',
    before: { lkh: 3, fin: 1, bop: 2, lry: 3, rep: 2, sis: 1 },
    after: { lkh: 1, fin: 1, bop: 2, lry: 1, rep: 1, sis: 1 },
  },
];

function spread(prefix: 'Before' | 'After', set?: ScoreSet): Record<string, number> {
  if (!set) {
    return {};
  }
  return {
    ['lkh' + prefix]: set.lkh,
    ['fin' + prefix]: set.fin,
    ['bop' + prefix]: set.bop,
    ['lry' + prefix]: set.lry,
    ['rep' + prefix]: set.rep,
    ['sis' + prefix]: set.sis,
  };
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'seed.ts refuses to run with NODE_ENV=production. It connects as the schema owner and writes across entities; both are development-only affordances.',
    );
  }

  const connectionString = process.env.DATABASE_URL_MIGRATE;
  if (!connectionString) {
    throw new Error('DATABASE_URL_MIGRATE is not set. See .env.example.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    for (const risk of RISKS) {
      const fields = {
        orgEntityId: risk.orgEntityId,
        refCode: risk.refCode,
        title: risk.title,
        category: risk.category,
        description: risk.description,
        assetId: risk.assetId,
        threatId: THREAT,
        vulnerabilityId: VULN,
        ciaType: risk.ciaType,
        // retiredAt is reset on every run: a row retired by hand while trying
        // something has to come back, or the second run leaves a different
        // database than the first and AC-2 is satisfied only by luck.
        retiredAt: null,
        ...spread('Before', risk.before),
        ...spread('After', risk.after),
      };

      await prisma.risk.upsert({
        where: { id: risk.id },
        create: { id: risk.id, ...fields },
        update: fields,
      });
    }

    // Report what is in the database, not what was just sent to it. A seed that
    // prints its own input says nothing about whether the database agreed.
    const counts = await prisma.risk.groupBy({
      by: ['orgEntityId'],
      where: { retiredAt: null },
      _count: { _all: true },
    });
    const entities = await prisma.orgEntity.findMany({
      where: { id: { in: counts.map((c) => c.orgEntityId) } },
      select: { id: true, code: true },
    });

    console.log('[seed] ' + RISKS.length + ' demo risks upserted. Live risks per entity:');
    for (const row of counts) {
      const code = entities.find((e) => e.id === row.orgEntityId)?.code ?? row.orgEntityId;
      console.log('[seed]   ' + code + ': ' + row._count._all);
    }

    if (counts.length < 2) {
      throw new Error(
        'seed produced risks in ' +
          counts.length +
          ' entity; AC-3 requires at least two, or scope filtering working and scope filtering being absent look identical on screen.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
