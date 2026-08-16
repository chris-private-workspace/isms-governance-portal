/**
 * File: apps/api/src/core-model/retention-and-hold.int.spec.ts
 * Purpose: Pin the two tables W17 ships, which are isolated by two DIFFERENT
 *   mechanisms — a grant for one, row-level security for the other.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W17 (M1 slice 12)
 * Owner: docs/02-architecture/05-platform-foundation-services.md §Records retention
 *
 * Description:
 *   Raw `pg`, no Nest and no Prisma, for W15's two reasons: a test that reaches
 *   the database through the code under test cannot tell which layer refused,
 *   and there IS no code under test — this slice ships two tables and zero
 *   repositories, deliberately.
 *
 *   ⛔ TWO CONNECTIONS, and which one each test uses is load-bearing. The
 *   application role holds SELECT only on retention_policies, so PostgreSQL
 *   refuses its inserts on privilege — 42501 — BEFORE evaluating any constraint.
 *   A uniqueness or FK assertion issued as isms_app would go green while never
 *   reaching the constraint (W15 Day-0 D7). Those run as the owner.
 *
 *   ⚠️ 42501 APPEARS THREE TIMES BELOW MEANING THREE DIFFERENT THINGS, so each
 *   test says which layer it is asserting rather than "this is refused":
 *     - test 3  — no GRANT at all on retention_policies
 *     - test 8  — no GRANT UPDATE on legal_holds
 *     - test 7  — the grant exists and the RLS WITH CHECK refused the row
 *   W10's N1a and W16's N3a both measured that a missing grant and a missing
 *   policy fail differently (42501 vs no error and rowCount 0), which is why no
 *   test here claims "the table is immutable" — that claim would still pass if
 *   half of it quietly disappeared.
 *
 * Created: 2026-08-16 (Phase W17)
 * Last Modified: 2026-08-16
 *
 * Modification History (newest-first):
 *   - 2026-08-16: Initial creation (Phase W17)
 */
import { Client } from 'pg';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_USER = '00000000-0000-0000-0000-0000000000d0';

/** Exists in no table. Verified zero hits across apps/api before use — W14 lost
 *  seven tests to an id that was already an assessment instance. */
const NOWHERE = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/**
 * The six confirmed classes, transcribed from 05:73-80 — NOT read back from the
 * seed array. A count derived from the thing it is checking is the vacuous shape
 * AD-VacuousScopeTest-1 names; this list is an external fact, so the assertion
 * can disagree with the fixture (W15's IN_SCOPE does the same job).
 */
const CLASSES = [
  'Audit issues & evidence',
  'External party assessments',
  'ISMS profile versions',
  'Platform audit log',
  'Risk Management Report & SoA',
  'Security incident records',
];

/** Per-test connections: `app.entity_scope` becomes *defined* once set on a
 *  session, and test 2 depends on a session where it never was. */
async function asApp(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

/** The role the seed runs as — the only one that can write retention_policies. */
async function asOwner(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL_MIGRATE });
  await client.connect();
  return client;
}

describe('records retention and legal hold — two tables, two isolation mechanisms', () => {
  // === retention_policies: global, and the GRANT is what isolates it =========

  it('1. an SG1-scoped connection reads all six retention classes — no policy filters this table', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      const { rows } = await client.query(
        'SELECT record_class FROM retention_policies WHERE retired_at IS NULL',
      );
      // Sorted in JS, not by SQL ORDER BY: collation decides where '&' sorts
      // relative to a letter, and W16's test 3 was rewritten for exactly that.
      expect(rows.map((r: { record_class: string }) => r.record_class).sort()).toEqual(CLASSES);
    } finally {
      await client.end();
    }
  });

  it('2. a connection that was NEVER scoped reads them too — nothing here consults app.entity_scope', async () => {
    const client = await asApp();
    try {
      // The stronger half, and it distinguishes a case test 1 cannot: a policy
      // that happens to be permissive still calls current_setting, which raises
      // 42704 on an unscoped session. Six rows here means no policy is evaluated
      // at all, not that one was evaluated and let everything past.
      const { rows } = await client.query('SELECT record_class FROM retention_policies');
      expect(rows).toHaveLength(6);
    } finally {
      await client.end();
    }
  });

  it('3. the application role cannot INSERT a retention policy — the grant is the isolation', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        client.query(
          `INSERT INTO retention_policies (id, record_class, duration, basis, updated_at)
           VALUES (gen_random_uuid(), 'Invented class', '1 year', 'nothing', now())`,
        ),
        // 42501 HERE MEANS "no privilege", which is what makes "no write path to
        // audit" a database guarantee rather than a property of today's code —
        // and it is why this model is absent from AUDITED_MODELS.
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('4. two policies for the same record class are refused — as the owner, because the app never gets that far', async () => {
    const client = await asOwner();
    try {
      await expect(
        client.query(
          `INSERT INTO retention_policies (id, record_class, duration, basis, updated_at)
           VALUES (gen_random_uuid(), $1, '1 year', 'duplicate', now())`,
          [CLASSES[0]],
        ),
        // SQLSTATE, never the message: a wording change in a PostgreSQL point
        // release would otherwise break a test that is right (AD-GrepAssertion-1).
      ).rejects.toMatchObject({ code: '23505' });
    } finally {
      await client.end();
    }
  });

  it('5. the catalog agrees: row-level security is OFF on retention_policies and no policy exists', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        `SELECT c.relrowsecurity,
                (SELECT count(*)::int FROM pg_policies p
                  WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = 'retention_policies'`,
      );
      expect(rows).toHaveLength(1);
      expect({ rls: rows[0].relrowsecurity, policies: rows[0].policies }).toEqual({
        rls: false,
        policies: 0,
      });
    } finally {
      await client.end();
    }
  });

  // === legal_holds: entity-scoped, and RLS is what isolates it ===============

  it('6. legal_holds has row-level security ENABLED *and* FORCED', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        `SELECT c.relrowsecurity, c.relforcerowsecurity
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = 'legal_holds'`,
      );
      expect(rows).toHaveLength(1);
      // ⭐ BOTH, and forced is the half W16's plan forgot: without it the table
      // OWNER reads straight through every policy, and this suite connects as
      // isms_app_user — so every scope assertion below would pass against a
      // guardrail-4 hole none of them can see.
      expect({ rls: rows[0].relrowsecurity, forced: rows[0].relforcerowsecurity }).toEqual({
        rls: true,
        forced: true,
      });
    } finally {
      await client.end();
    }
  });

  it('7. an SG1-scoped connection reads its own two holds and neither of HK1s', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      const { rows } = await client.query('SELECT ref_code, org_entity_id FROM legal_holds');

      expect(rows.map((r: { ref_code: string }) => r.ref_code).sort()).toEqual([
        'HOLD-SG1-000001',
        'HOLD-SG1-000002',
      ]);
      // Asserting the ref codes rather than a count: "two rows" would also hold
      // if the policy leaked one of HK1's and dropped one of SG1's.
      expect(rows.every((r: { org_entity_id: string }) => r.org_entity_id === SG1)).toBe(true);
    } finally {
      await client.end();
    }
  });

  it('8. a hold filed under HK1 from an SG1-scoped session is refused', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        client.query(
          // ⚠️ org_entity_id and scope_ref carry the SAME VALUE and must still be
          // separate placeholders. Reusing $1 for a uuid column and a text column
          // makes PostgreSQL unable to infer one type and it raises 42P08 at
          // PARSE time — before any policy or constraint is consulted. Measured:
          // the first run of tests 8, 10 and 11 all failed that way, and all
          // three would have PASSED had they asserted only `.rejects`.
          `INSERT INTO legal_holds (id, org_entity_id, ref_code, scope_type, scope_ref, reason,
                                    applied_by, updated_at)
           VALUES (gen_random_uuid(), $1, 'HOLD-XENT-000001', 'entity', $2, 'cross-entity write',
                   $3, now())`,
          [HK1, HK1, SG1_USER],
        ),
        // 42501 HERE MEANS the opposite of test 3: the grant EXISTS and the RLS
        // WITH CHECK refused the row. Same SQLSTATE, different layer — which is
        // why neither test claims "writes are refused" without saying by what.
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('9. the application role cannot UPDATE a hold — releasing one is not expressible yet', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        client.query(
          `UPDATE legal_holds SET released_at = now(), released_by = $1
            WHERE ref_code = 'HOLD-SG1-000001'`,
          [SG1_USER],
        ),
        // ⛔ THE CLAIM IS NARROW ON PURPOSE: "the app role cannot UPDATE",
        // NOT "holds are immutable". 05:69 restricts release to authorised
        // roles and Role is an M4 entity (02a:71), so the honest state today is
        // that release has no expressible form. W16's N3a measured the wider
        // claim's failure mode: with a GRANT but no policy the same statement
        // raises NOTHING and reports rowCount 0, so a test asserting
        // immutability would still pass with half the guard gone.
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('10. a release recorded without a releaser is refused', async () => {
    const client = await asOwner();
    try {
      await expect(
        client.query(
          `INSERT INTO legal_holds (id, org_entity_id, ref_code, scope_type, scope_ref, reason,
                                    applied_by, released_at, updated_at)
           VALUES (gen_random_uuid(), $1, 'HOLD-SG1-000099', 'entity', $2, 'half a release',
                   $3, now(), now())`,
          [SG1, SG1, SG1_USER],
        ),
        // 23514 — the CHECK. Prisma cannot express one, so `migrate diff` is
        // blind to it: this test is the only thing standing between the
        // constraint and silent removal.
      ).rejects.toMatchObject({ code: '23514' });
    } finally {
      await client.end();
    }
  });

  it('11. a hold applied by a user who does not exist is refused', async () => {
    const client = await asOwner();
    try {
      await expect(
        client.query(
          `INSERT INTO legal_holds (id, org_entity_id, ref_code, scope_type, scope_ref, reason,
                                    applied_by, updated_at)
           VALUES (gen_random_uuid(), $1, 'HOLD-SG1-000098', 'entity', $2, 'absent applier',
                   $3, now())`,
          [SG1, SG1, NOWHERE],
        ),
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await client.end();
    }
  });

  it('13. an in-scope hold CAN be inserted by the application role — the positive half', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      // ⭐ THIS TEST EXISTS BECAUSE N4 FOUND NOTHING. Dropping the
      // legal_holds_insert policy left all 247 tests green: an absent policy
      // refuses (ADR-0014), which is the same observable as a correct policy
      // refusing test 8's cross-entity row. So test 8 pins that the policy is
      // not WIDER than it should be, and nothing pinned that it exists at all —
      // the table could have gone read-only for the application role in silence.
      //
      // Inside a transaction that is rolled back: test 7 asserts SG1 sees
      // exactly two holds, and a committed row here would make that assertion
      // depend on file order rather than on the policy.
      await client.query('BEGIN');
      const { rowCount } = await client.query(
        `INSERT INTO legal_holds (id, org_entity_id, ref_code, scope_type, scope_ref, reason,
                                  applied_by, updated_at)
         VALUES (gen_random_uuid(), $1, 'HOLD-SG1-000097', 'entity', $2, 'in-scope write',
                 $3, now())`,
        [SG1, SG1, SG1_USER],
      );
      expect(rowCount).toBe(1);
      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });

  // === AC-4: the grants themselves, exactly ==================================

  it('12. the application role holds exactly SELECT on retention_policies and SELECT+INSERT on legal_holds', async () => {
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
        [['legal_holds', 'retention_policies']],
      );

      // toEqual, not toContain: the whole point is that UPDATE and DELETE are
      // ABSENT, and toContain would pass with either of them added.
      expect(rows).toEqual([
        { table_name: 'legal_holds', privs: ['INSERT', 'SELECT'] },
        { table_name: 'retention_policies', privs: ['SELECT'] },
      ]);
    } finally {
      await client.end();
    }
  });
});
