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
 *   - POLICIES: 11 rows — 7 SG1 / 4 HK1; all six states inside SG1, one soft-deleted
 *   - main(): upsert by fixed id, then report the per-entity counts it produced
 *
 * Created: 2026-08-18 (Phase W22)
 * Last Modified: 2026-08-19
 *
 * Modification History (newest-first):
 *   - 2026-08-19: Add POLICIES — six states, one soft-deleted (Phase W24) — CH-044
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

/**
 * Policies (W24). Same reserved 9xxxxx block, same fixed ids, same reasons.
 *
 * WHAT THIS SET HAS TO PROVE — one row exists for each of these, not for volume:
 *
 *   1. TWO ENTITIES. Same argument as RISKS above: with rows on one side only,
 *      "the scope filter works" and "the scope filter is absent" render
 *      identically.
 *
 *   2. ALL SIX LIFECYCLE STATES (02a:300-312), AND ALL SIX INSIDE SG1. The
 *      screen paints status as a coloured pill and the API's vocabulary is not
 *      the fixture's, so a state with no row is a mapping nobody exercised.
 *      They sit in one entity because SG1 is the DEFAULT scope
 *      (dev-principal.ts:100 falls back to ['SG1'] and .env does not set
 *      DEV_PRINCIPAL_ENTITIES) — spreading them across both entities reads as
 *      balanced and quietly makes half of them reachable only by editing an
 *      env var first.
 *
 *   3. retiredAt IS NOT status='retired'. schema.prisma:361 draws that line and
 *      this is the set that can show it: POL-SG1-900003 is retired as a
 *      LIFECYCLE state and MUST appear in the list; POL-SG1-900004 is
 *      soft-deleted and MUST NOT, because policy.repository.ts:86 filters
 *      `retiredAt: null`. With only one of the two, a working filter and a
 *      missing one look the same.
 *
 * owner/createdBy/updatedBy stay NULL. That is not "not wired yet" — it is
 * guardrail 7. Inventing a person here would be inventing PII.
 *
 * MARK goes in the title because Policy has no description column, and a seeded
 * row has to say so in a column the screen actually renders. The titles are
 * deliberately unlike the fixture's ("Information Security Policy", …) so the
 * negative test — fixture titles absent from the DOM — cannot pass by accident.
 */
interface SeedPolicy {
  id: string;
  refCode: string;
  orgEntityId: string;
  title: string;
  version: number;
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'under_revision' | 'retired';
  /** Non-null = soft-deleted (guardrail 3). The list must not show it. */
  retiredAt: Date | null;
}

const POLICIES: SeedPolicy[] = [
  {
    id: '0000ff00-0000-0000-0000-000000000001',
    refCode: 'POL-SG1-900001',
    orgEntityId: SG1,
    title: MARK + ' Cryptographic key handling standard',
    version: 3,
    status: 'published',
    retiredAt: null,
  },
  {
    id: '0000ff00-0000-0000-0000-000000000002',
    refCode: 'POL-SG1-900002',
    orgEntityId: SG1,
    title: MARK + ' Remote working security baseline',
    version: 1,
    status: 'draft',
    retiredAt: null,
  },
  {
    // Retired as a LIFECYCLE state — a live, visible record that happens to be
    // at the end of its life. It MUST show up in the register.
    id: '0000ff00-0000-0000-0000-000000000003',
    refCode: 'POL-SG1-900003',
    orgEntityId: SG1,
    title: MARK + ' Legacy VPN acceptable use (superseded)',
    version: 5,
    status: 'retired',
    retiredAt: null,
  },
  {
    // Soft-deleted at the RECORD level. It MUST NOT show up. Its status is
    // deliberately `approved` rather than `retired`, so that a filter keying on
    // the wrong column would be visible: it would leak an approved policy.
    id: '0000ff00-0000-0000-0000-000000000004',
    refCode: 'POL-SG1-900004',
    orgEntityId: SG1,
    title: MARK + ' Withdrawn draft, soft-deleted — must not be listed',
    version: 2,
    status: 'approved',
    retiredAt: new Date('2026-07-01T00:00:00.000Z'),
  },
  // The next three exist because SG1 is the DEFAULT scope. dev-principal.ts:100
  // falls back to ['SG1'] and .env does not set DEV_PRINCIPAL_ENTITIES, so SG1
  // is what someone sees after a clone, a seed and a page load. Spreading the
  // six states across two entities looked balanced and meant three of them were
  // only reachable by editing an env var first.
  {
    id: '0000ff00-0000-0000-0000-000000000009',
    refCode: 'POL-SG1-900005',
    orgEntityId: SG1,
    title: MARK + ' Supplier security assessment procedure',
    version: 2,
    status: 'in_review',
    retiredAt: null,
  },
  {
    id: '0000ff00-0000-0000-0000-00000000000a',
    refCode: 'POL-SG1-900006',
    orgEntityId: SG1,
    title: MARK + ' Business continuity testing standard',
    version: 6,
    status: 'under_revision',
    retiredAt: null,
  },
  {
    id: '0000ff00-0000-0000-0000-00000000000b',
    refCode: 'POL-SG1-900007',
    orgEntityId: SG1,
    title: MARK + ' Mobile device management standard',
    version: 1,
    status: 'approved',
    retiredAt: null,
  },
  {
    id: '0000ff00-0000-0000-0000-000000000005',
    refCode: 'POL-HK1-900001',
    orgEntityId: HK1,
    title: MARK + ' Third-party access control standard',
    version: 2,
    status: 'published',
    retiredAt: null,
  },
  {
    id: '0000ff00-0000-0000-0000-000000000006',
    refCode: 'POL-HK1-900002',
    orgEntityId: HK1,
    title: MARK + ' Incident evidence retention procedure',
    version: 1,
    status: 'in_review',
    retiredAt: null,
  },
  {
    id: '0000ff00-0000-0000-0000-000000000007',
    refCode: 'POL-HK1-900003',
    orgEntityId: HK1,
    title: MARK + ' Privileged account review procedure',
    version: 4,
    status: 'under_revision',
    retiredAt: null,
  },
  {
    // `approved` needs a row of its own. The soft-deleted POL-SG1-900004 also
    // carries that status, but it is filtered out of every list, so without
    // this row `approved` would be covered in the fixture and invisible on the
    // screen — six states seeded, five states renderable.
    id: '0000ff00-0000-0000-0000-000000000008',
    refCode: 'POL-HK1-900004',
    orgEntityId: HK1,
    title: MARK + ' Data classification handling rules',
    version: 1,
    status: 'approved',
    retiredAt: null,
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

    for (const policy of POLICIES) {
      const fields = {
        orgEntityId: policy.orgEntityId,
        refCode: policy.refCode,
        title: policy.title,
        version: policy.version,
        status: policy.status,
        // Unlike RISKS, retiredAt is NOT forced to null here: one row is
        // soft-deleted on purpose and resetting it would delete the only
        // evidence that the repository's `retiredAt: null` filter does anything.
        retiredAt: policy.retiredAt,
      };

      await prisma.policy.upsert({
        where: { id: policy.id },
        create: { id: policy.id, ...fields },
        update: fields,
      });
    }

    const polCounts = await prisma.policy.groupBy({
      by: ['orgEntityId'],
      where: { retiredAt: null },
      _count: { _all: true },
    });
    const polEntities = await prisma.orgEntity.findMany({
      where: { id: { in: polCounts.map((c) => c.orgEntityId) } },
      select: { id: true, code: true },
    });

    // Counted over the seeded ids ONLY. The first version of this reduced
    // polCounts, which counts every policy in the database — so on a dev
    // database holding anything else it reported a number this seed never
    // produced and threw. What the assertion below is about is whether the
    // soft-delete took, not whether the database is otherwise empty.
    const live = await prisma.policy.count({
      where: { id: { in: POLICIES.map((p) => p.id) }, retiredAt: null },
    });
    const liveAll = polCounts.reduce((n, row) => n + row._count._all, 0);
    console.log(
      '[seed] ' +
        POLICIES.length +
        ' demo policies upserted, ' +
        live +
        ' of them live (' +
        liveAll +
        ' live in this database in total). Live policies per entity:',
    );
    for (const row of polCounts) {
      const code = polEntities.find((e) => e.id === row.orgEntityId)?.code ?? row.orgEntityId;
      console.log('[seed]   ' + code + ': ' + row._count._all);
    }

    if (polCounts.length < 2) {
      throw new Error(
        'seed produced policies in ' +
          polCounts.length +
          ' entity; same reason as risks above — one-sided fixtures cannot tell a working scope filter from an absent one.',
      );
    }

    // The soft-deleted row is the point, so its absence is asserted rather than
    // assumed. If this ever equals POLICIES.length, either the seed stopped
    // soft-deleting or `retiredAt` stopped meaning anything — and the screen
    // would be listing a withdrawn policy without anything going red.
    const softDeleted = POLICIES.filter((p) => p.retiredAt !== null).length;
    if (live !== POLICIES.length - softDeleted) {
      throw new Error(
        'expected ' +
          (POLICIES.length - softDeleted) +
          ' live policies (' +
          POLICIES.length +
          ' seeded, ' +
          softDeleted +
          ' soft-deleted) but the database reports ' +
          live +
          '.',
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
