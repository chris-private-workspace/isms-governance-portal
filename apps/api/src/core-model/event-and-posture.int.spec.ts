/**
 * File: apps/api/src/core-model/event-and-posture.int.spec.ts
 * Purpose: Pin the two tables W18 ships — same isolation mechanism, and two
 *   different reasons for the same missing UPDATE grant.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W18 (M1 slice 13)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 (Event) and §7 (posture_snapshot)
 *
 * Description:
 *   Raw `pg`, no Nest and no Prisma, for W15's two reasons: a test that reaches
 *   the database through the code under test cannot tell which layer refused,
 *   and there IS no code under test — this slice ships two tables and zero
 *   repositories, deliberately.
 *
 *   ⛔ BOTH TABLES REFUSE UPDATE, AND THE TWO REFUSALS ARE NOT THE SAME CLAIM.
 *   posture_snapshots is append-only BY SPECIFICATION (02a:475, "do not
 *   retro-edit them") and has no unblock condition. events is append-only BY
 *   INABILITY: advancing an event needs `status`, and 02a:417 and 11:45-58 give
 *   incompatible lifecycles, so the column does not exist yet. That one unblocks
 *   at M6. Each test below says which of the two it is asserting, because a
 *   single test named "the table is immutable" would go on passing after the
 *   distinction stopped being true.
 *
 *   ⚠️ 42501 APPEARS BELOW MEANING TWO DIFFERENT THINGS, exactly as it did in
 *   W17's spec: an RLS WITH CHECK refusing a cross-entity row (tests 5, 11) and
 *   a missing GRANT UPDATE (tests 7, 13). Same SQLSTATE, different layer. W10's
 *   N1a and W16's N3a measured that these fail differently — with a GRANT but no
 *   policy an UPDATE raises nothing at all and reports rowCount 0 — which is why
 *   no test here claims more than the layer it names.
 *
 * Created: 2026-08-17 (Phase W18)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W18)
 */
import { Client } from 'pg';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

/**
 * The nine governed metric keys, transcribed from 02a:482-483 — NOT read back
 * from the seed array or from pg_enum. A list derived from the thing it checks
 * is the vacuous shape AD-VacuousScopeTest-1 names; this is an external fact, so
 * test 15 can disagree with the schema.
 */
const METRIC_KEYS = [
  'control_coverage_effective',
  'control_coverage_risk',
  'high_critical_count',
  'open_critical_issues',
  'overdue_tests',
  'policy_attestation',
  'posture_rag',
  'rcsa_completion',
  'total_risks',
];

/**
 * The seven columns 02a:465-473 specifies, and nothing else. Transcribed from
 * the spec, so test 14 compares the database against the DOCUMENT rather than
 * against itself.
 */
const POSTURE_COLUMNS = [
  'captured_at',
  'id',
  'metric_key',
  'metric_value',
  'org_entity_id',
  'period',
  'rag',
];

/** The five residency columns 02a:488 says are NOT BUILT in Wave 1. */
const RESIDENCY_COLUMNS = [
  'replicated_at',
  'replicated_to_region',
  'source_region',
  'transfer_approved_at',
  'transfer_approved_by',
];

/** Per-test connections: `app.entity_scope` becomes *defined* once set on a
 *  session, and a shared client would leak that between tests. */
async function asApp(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

/** The role the seed runs as — needed wherever a constraint, not a grant, is
 *  the thing under test. */
async function asOwner(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL_MIGRATE });
  await client.connect();
  return client;
}

describe('events and posture_snapshots — one mechanism, two reasons for append-only', () => {
  // === events ================================================================

  it('1. events has row-level security ENABLED *and* FORCED', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        `SELECT c.relrowsecurity, c.relforcerowsecurity
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = 'events'`,
      );
      expect(rows).toHaveLength(1);
      // BOTH. Without FORCE the table owner reads straight through every policy,
      // and while this suite connects as isms_app_user, the seed does not — so
      // every scope assertion below would pass against a guardrail-4 hole.
      expect({ rls: rows[0].relrowsecurity, forced: rows[0].relforcerowsecurity }).toEqual({
        rls: true,
        forced: true,
      });
    } finally {
      await client.end();
    }
  });

  it('2. an SG1-scoped connection reads its own two events and neither of HK1s', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      const { rows } = await client.query('SELECT ref_code, org_entity_id FROM events');

      // Asserting the ref codes rather than a count: "two rows" would also hold
      // if the policy leaked HK1's and dropped one of SG1's.
      expect(rows.map((r: { ref_code: string }) => r.ref_code).sort()).toEqual([
        'EVT-SG1-000001',
        'EVT-SG1-000002',
      ]);
      expect(rows.every((r: { org_entity_id: string }) => r.org_entity_id === SG1)).toBe(true);
    } finally {
      await client.end();
    }
  });

  it('3. all three severity levels survived the round trip', async () => {
    const client = await asOwner();
    try {
      const { rows } = await client.query('SELECT severity::text AS severity FROM events');
      // ::text because node-pg has no parser for a custom enum type. Read as the
      // OWNER: this is about the DOMAIN, not about scope, and an app-role read
      // would see only SG1's two rows and quietly drop s3 — the assertion would
      // then be about the policy while claiming to be about the enum.
      //
      // ⚠️ SORTED IN JS, NOT BY SQL, and the first version of this test got that
      // wrong: it ordered by ref_code and predicted s2,s1,s3, while the database
      // returned s3,s2,s1 because EVT-HK1 sorts before EVT-SG1. The prediction
      // was the bug, but ORDER BY was the weakness — W17's test 1 already
      // recorded that collation decides how punctuation sorts, and a fixture
      // ref_code is not something this assertion should depend on at all. What
      // it means to check is that each level is REACHABLE, which is a set.
      expect(rows.map((r: { severity: string }) => r.severity).sort()).toEqual(['s1', 's2', 's3']);
    } finally {
      await client.end();
    }
  });

  it('4. the one seeded loss_amount round-trips at DECIMAL(18,2)', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      const { rows } = await client.query(
        `SELECT loss_amount::text AS loss_amount FROM events WHERE ref_code = 'EVT-SG1-000002'`,
      );
      expect(rows).toHaveLength(1);
      // ⚠️ '4820.00' and not '4820': the scale is the assertion. A column
      // narrowed to DECIMAL(18,0) or widened to a float would still hold the
      // value and would fail here, which is the only place that shows up —
      // Prisma's migrate diff does not compare precision on an existing column.
      //
      // ⛔ THIS DOES NOT MEAN THE COLUMN IS USABLE. Nothing in production writes
      // it (zero repositories) and there is no currency column beside it, so the
      // number is uninterpretable across thirteen OpCos. Recorded as AP-3 in this
      // phase's audit; the test pins the type, not the capability.
      expect(rows[0].loss_amount).toBe('4820.00');
    } finally {
      await client.end();
    }
  });

  it('5. an event filed under HK1 from an SG1-scoped session is refused by the policy', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        client.query(
          `INSERT INTO events (id, org_entity_id, ref_code, title, occurred_at, detected_at,
                               severity, description, updated_at)
           VALUES (gen_random_uuid(), $1, 'EVT-XENT-000001', 'cross-entity write',
                   now(), now(), 's3', 'refused', now())`,
          [HK1],
        ),
        // 42501 HERE MEANS the grant EXISTS and the RLS WITH CHECK refused the
        // row — the opposite of test 7's 42501.
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('6. an in-scope event CAN be inserted by the application role — the positive half', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      // ⭐ THIS TEST EXISTS BECAUSE W17's N4 FOUND NOTHING. Dropping that
      // phase's INSERT policy left all 247 tests green: an absent policy refuses
      // (ADR-0014), which is the same observable as a correct policy refusing
      // test 5's cross-entity row. So test 5 pins that the policy is not WIDER
      // than it should be, and only this one pins that it exists at all — the
      // table could otherwise go read-only for the application role in silence.
      //
      // Inside a rolled-back transaction: test 2 asserts SG1 sees exactly two
      // events, and a committed row here would make that depend on file order.
      await client.query('BEGIN');
      const { rowCount } = await client.query(
        `INSERT INTO events (id, org_entity_id, ref_code, title, occurred_at, detected_at,
                             severity, description, updated_at)
         VALUES (gen_random_uuid(), $1, 'EVT-SG1-000097', 'in-scope write',
                 now(), now(), 's2', 'accepted', now())`,
        [SG1],
      );
      expect(rowCount).toBe(1);
      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });

  it('7. the application role cannot UPDATE an event — advancing one is not expressible yet', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        client.query(`UPDATE events SET title = 'edited' WHERE ref_code = 'EVT-SG1-000001'`),
        // ⛔ THE CLAIM IS NARROW ON PURPOSE: "the app role cannot UPDATE", NOT
        // "events are immutable". This table is append-only BY INABILITY —
        // 02a:417 and 11:45-58 disagree about the lifecycle, so `status` does not
        // exist and there is nothing to advance. At M6 this refusal is expected
        // to be replaced by a narrow policy, unlike test 13's.
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  // === posture_snapshots =====================================================

  it('8. posture_snapshots has row-level security ENABLED *and* FORCED', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        `SELECT c.relrowsecurity, c.relforcerowsecurity
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = 'posture_snapshots'`,
      );
      expect(rows).toHaveLength(1);
      // Asserted per table rather than in one query over both: a single row
      // returning true would satisfy a two-table claim while saying nothing
      // about the other table.
      expect({ rls: rows[0].relrowsecurity, forced: rows[0].relforcerowsecurity }).toEqual({
        rls: true,
        forced: true,
      });
    } finally {
      await client.end();
    }
  });

  it('9. an SG1-scoped connection reads its own three snapshots and neither of HK1s', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      const { rows } = await client.query(
        `SELECT period, metric_key::text AS metric_key, metric_value::text AS metric_value,
                rag::text AS rag
           FROM posture_snapshots ORDER BY period, metric_key`,
      );

      expect(
        rows.map(
          (r: { period: string; metric_key: string; metric_value: string; rag: string }) =>
            `${r.period}/${r.metric_key}/${r.metric_value}/${r.rag}`,
        ),
      ).toEqual([
        '2026-07/rcsa_completion/83.3333/amber',
        '2026-Q3/posture_rag/2.0000/amber',
        '2026-Q3/total_risks/42.0000/green',
      ]);
      // The whole tuple, not a count: this pins the two period formats 02a:469
      // allows, the DECIMAL(18,4) scale, and the band — all three of which a
      // count would let through unchanged.
    } finally {
      await client.end();
    }
  });

  it('10. HK1 holds a snapshot with the SAME period and metric_key as SG1 — the key admits both', async () => {
    const client = await asOwner();
    try {
      const { rows } = await client.query(
        `SELECT org_entity_id FROM posture_snapshots
          WHERE period = '2026-Q3' AND metric_key = 'total_risks'
          ORDER BY org_entity_id`,
      );
      // ⭐ THE POSITIVE FORM OF AD-UniqueKeyOracle-1's FIX. Two rows here means
      // org_entity_id is genuinely part of the unique key. Read as the owner
      // deliberately — an app-role read is filtered to one entity by RLS and
      // would see exactly one row whether or not the key is correct, which is
      // the shape of a test that cannot fail.
      expect(rows.map((r: { org_entity_id: string }) => r.org_entity_id)).toEqual([SG1, HK1]);
    } finally {
      await client.end();
    }
  });

  it('11. a snapshot filed under HK1 from an SG1-scoped session is refused by the policy', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        client.query(
          `INSERT INTO posture_snapshots (id, org_entity_id, period, metric_key, metric_value, rag)
           VALUES (gen_random_uuid(), $1, '2026-Q4', 'overdue_tests', 1, 'green')`,
          [HK1],
        ),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('12. an in-scope snapshot CAN be inserted by the application role — the positive half', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await client.query('BEGIN');
      const { rowCount } = await client.query(
        `INSERT INTO posture_snapshots (id, org_entity_id, period, metric_key, metric_value, rag)
         VALUES (gen_random_uuid(), $1, '2026-Q4', 'overdue_tests', 4, 'amber')`,
        [SG1],
      );
      expect(rowCount).toBe(1);
      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });

  it('13. the application role cannot UPDATE a snapshot — 02a:475 forbids retro-editing', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        client.query(
          `UPDATE posture_snapshots SET metric_value = 999
            WHERE period = '2026-Q3' AND metric_key = 'total_risks'`,
        ),
        // ⛔ UNLIKE test 7, THIS ONE HAS NO UNBLOCK CONDITION. 02a:475 is a
        // direct instruction — "snapshots are historical record, do not
        // retro-edit them" — so a future phase adding GRANT UPDATE here would be
        // contradicting the spec rather than completing it.
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('14. a duplicate (entity, period, metric_key) is refused — as the owner, because the app never gets that far', async () => {
    const client = await asOwner();
    try {
      await expect(
        client.query(
          `INSERT INTO posture_snapshots (id, org_entity_id, period, metric_key, metric_value, rag)
           VALUES (gen_random_uuid(), $1, '2026-Q3', 'total_risks', 43, 'red')`,
          [SG1],
        ),
        // SQLSTATE, never the message (AD-GrepAssertion-1). Run as the owner
        // because the app role would be refused by RLS first on a foreign entity
        // and would succeed on its own — either way never reaching the index,
        // which is W15 Day-0 D7's finding.
      ).rejects.toMatchObject({ code: '23505' });
    } finally {
      await client.end();
    }
  });

  // === the schema itself =====================================================

  it('15. the nine governed metric keys are exactly what 02a:482-483 lists', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        `SELECT e.enumlabel::text AS label
           FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'posture_metric_key'
          ORDER BY e.enumlabel`,
      );
      // toEqual against a transcribed list, not toContain: 02a:477 calls the set
      // "fixed, governed … not free-form", and the failure this guards against
      // is someone ADDING a tenth, which toContain would wave through.
      expect(rows.map((r: { label: string }) => r.label)).toEqual(METRIC_KEYS);
    } finally {
      await client.end();
    }
  });

  it('16. posture_snapshots has exactly 02a:465-473s seven columns — and the instrument is checked first', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        `SELECT column_name::text AS column_name
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'posture_snapshots'
          ORDER BY column_name`,
      );
      const present = rows.map((r: { column_name: string }) => r.column_name);

      // ⛔ POSITIVE CONTROL FIRST. The next assertion is that five columns are
      // ABSENT, and a query that returns nothing — wrong table name, wrong
      // schema, a typo — proves absence for every column ever named. So the
      // instrument has to demonstrate it can see something before its zero is
      // worth anything.
      expect(present).toEqual(POSTURE_COLUMNS);

      // Now the absence claim rests on a query just shown to work.
      expect(RESIDENCY_COLUMNS.filter((c) => present.includes(c))).toEqual([]);
      // ⚠️ The five are absent because 02a:488's banner says NOT BUILT in
      // Wave 1 — a single deployment region (ADR-0010) means nothing replicates
      // and they would have no consumer. Building them is what guardrail 8 calls
      // AP-5. This assertion is what makes that a fact about the database rather
      // than a claim in a migration comment.
    } finally {
      await client.end();
    }
  });

  it('17. the application role holds exactly SELECT+INSERT on both tables', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        // ⚠️ `::text` on both projected columns, and it is not decoration.
        // information_schema exposes these as the `sql_identifier` domain, which
        // node-pg has no parser for: array_agg of them arrives as the literal
        // string '{INSERT,SELECT}' rather than an array, and toEqual against an
        // array then fails on a grant set that is actually correct (W16 measured
        // this — its first run failed exactly that way).
        `SELECT table_name::text AS table_name,
                array_agg(privilege_type::text ORDER BY privilege_type) AS privs
           FROM information_schema.role_table_grants
          WHERE grantee = 'isms_app' AND table_name = ANY($1)
          GROUP BY table_name
          ORDER BY 1`,
        [['events', 'posture_snapshots']],
      );

      // toEqual, not toContain: the whole point is that UPDATE and DELETE are
      // ABSENT, and toContain would pass with either of them added.
      expect(rows).toEqual([
        { table_name: 'events', privs: ['INSERT', 'SELECT'] },
        { table_name: 'posture_snapshots', privs: ['INSERT', 'SELECT'] },
      ]);
    } finally {
      await client.end();
    }
  });
});
