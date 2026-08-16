/**
 * File: apps/api/src/core-model/isms-profile.int.spec.ts
 * Purpose: Pin every constraint W16 ships, because W16 ships nothing else —
 *   five entity-scoped tables, no repository, no controller, no endpoint.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W16 (M1 slice 11)
 * Owner: docs/02-architecture/13-isms-profile-module.md §Data model
 *
 * Description:
 *   Raw `pg`, no Nest and no Prisma, for the reason W02's rls-direct spec gives
 *   and the one W15's jurisdiction spec adds: a test that reaches the database
 *   through the code under test cannot say which layer refused, and here there
 *   is no code under test at all.
 *
 *   ⛔ 42501 MEANS TWO DIFFERENT THINGS IN THIS FILE and the test names say
 *   which. PostgreSQL uses it both for "no privilege" (test 8 — the version
 *   table has no GRANT UPDATE) and for "new row violates row-level security
 *   policy" (test 2 — the row named another entity). Same code, different
 *   layer; a test called "the database refuses X" would cover both and prove
 *   neither (AD-TestNameWiderThanProof-1).
 *
 *   ⭐ Tests 5 and 6 are the positive form of AD-UniqueKeyOracle-1, which the
 *   two earlier data points were not. W10 and W11 both DISCOVERED an oracle and
 *   removed it. Here the criterion was applied before the table existed, so
 *   what these assert is that the two outcomes a caller can observe depend only
 *   on that caller's own rows — success and 23505 both, not just the refusal.
 *
 *   Successful inserts run inside a transaction that is rolled back. Every
 *   other suite in this file leaves nothing behind because its writes fail;
 *   these two do not have that luxury.
 *
 * Key Components:
 *   - asApp / asOwner: the two connections, and which is used is load-bearing
 *   - FIVE: the table list tests 3 and 9 iterate, so a table cannot be omitted
 *
 * Created: 2026-08-16 (Phase W16)
 * Last Modified: 2026-08-16
 *
 * Modification History (newest-first):
 *   - 2026-08-16: Initial creation (Phase W16)
 */
import { Client } from 'pg';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

const SG1_PROFILE = '00000000-0000-0000-0000-000000160001';
const HK1_PROFILE = '00000000-0000-0000-0000-000000160002';

/** Exists in no table. W14 lost seven tests to an id that was already in use. */
const NOWHERE = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/** The five tables this slice adds, in the order 02a §0 lists them plus the
 *  version table. Tests 3 and 9 iterate this rather than naming tables inline:
 *  W15's equivalent hard-coded three names, which pinned those three and said
 *  nothing about the next table anyone adds. */
const FIVE = [
  'approved_offerings',
  'isms_contacts',
  'isms_profile_versions',
  'isms_profiles',
  'isms_sites',
];

/** The four editable tables. isms_profile_versions is deliberately absent —
 *  see test 8. */
const MUTABLE = ['approved_offerings', 'isms_contacts', 'isms_profiles', 'isms_sites'];

async function asApp(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

/** The role the seed and the migrations run as. */
async function asOwner(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL_MIGRATE });
  await client.connect();
  return client;
}

describe('the ISMS profile tables, with the application removed', () => {
  // === Entity scoping =======================================================

  it('1. an SG1-scoped connection reads none of HK1 rows, in all five tables', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      for (const table of FIVE) {
        const { rows } = await client.query(
          `SELECT count(*)::int AS n FROM ${table} WHERE org_entity_id = $1`,
          [HK1],
        );
        expect({ table, visible: rows[0].n }).toEqual({ table, visible: 0 });
      }

      // ⭐ The other half, and without it the loop above is satisfied by five
      // empty tables. The seed puts exactly one row per table in each entity.
      for (const table of FIVE) {
        const { rows } = await client.query(
          `SELECT count(*)::int AS n FROM ${table} WHERE org_entity_id = $1`,
          [SG1],
        );
        expect({ table, own: rows[0].n }).toEqual({ table, own: 1 });
      }
    } finally {
      await client.end();
    }
  });

  it('2. an SG1-scoped INSERT that names HK1 is refused by policy, and HK1 row count is unchanged', async () => {
    const app = await asApp();
    const owner = await asOwner();
    try {
      const before = await owner.query(
        `SELECT count(*)::int AS n FROM isms_profiles WHERE org_entity_id = $1`,
        [HK1],
      );

      await app.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        app.query(
          `INSERT INTO isms_profiles (id, org_entity_id, ref_code, profile_year, updated_at)
           VALUES (gen_random_uuid(), $1, 'ISMS-HK1-999999', 2099, now())`,
          [HK1],
        ),
        // 42501 here is the INSERT policy's WITH CHECK, not a missing privilege:
        // isms_app holds INSERT on this table (test 9 asserts exactly that).
      ).rejects.toMatchObject({ code: '42501' });

      const after = await owner.query(
        `SELECT count(*)::int AS n FROM isms_profiles WHERE org_entity_id = $1`,
        [HK1],
      );
      expect(after.rows[0].n).toBe(before.rows[0].n);
    } finally {
      await app.end();
      await owner.end();
    }
  });

  it('3. the catalog agrees: RLS is enabled AND forced on all five, with the expected policy commands', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        `SELECT c.relname,
                c.relrowsecurity      AS enabled,
                c.relforcerowsecurity AS forced,
                (SELECT array_agg(p.cmd ORDER BY p.cmd) FROM pg_policies p
                  WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS cmds
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = ANY($1)
          ORDER BY 1`,
        [FIVE],
      );

      // Length first: without it, a table dropped from the migration would take
      // its own assertion with it and every remaining one would still pass.
      //
      // ⚠️ Sorted in JS, not trusted from SQL's ORDER BY. Under a C collation
      // `isms_profile_versions` sorts before `isms_profiles` (underscore < 's');
      // under en_US.UTF-8 punctuation is ignored at the primary level and the
      // order flips. A test that depends on which one the container was
      // initialised with is a test that fails on somebody else's machine.
      expect([...rows.map((r: { relname: string }) => r.relname)].sort()).toEqual([...FIVE].sort());

      for (const row of rows) {
        const expectedCmds = MUTABLE.includes(row.relname)
          ? ['INSERT', 'SELECT', 'UPDATE']
          : ['INSERT', 'SELECT'];

        // ⭐ `forced` is asserted, not just `enabled`. Without FORCE the table
        // OWNER bypasses every policy — and because this suite connects as the
        // application role, tests 1 and 2 would pass on a table the owner can
        // read straight through. W16's plan said ENABLE and stopped there;
        // Day-0 caught it, and this is the assertion that would have.
        expect({
          table: row.relname,
          enabled: row.enabled,
          forced: row.forced,
          cmds: row.cmds,
        }).toEqual({
          table: row.relname,
          enabled: true,
          forced: true,
          cmds: expectedCmds,
        });
      }
    } finally {
      await client.end();
    }
  });

  // === The composite foreign key ============================================

  it('4. a site naming another entity profile is refused, though both the entity and the profile exist', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      // ⭐ Every value here is real: SG1 is SG1's own entity (so the INSERT
      // policy passes) and HK1_PROFILE is a seeded row. The only thing wrong is
      // the PAIR, which is the whole reason the key is composite. With two
      // independent single-column FKs this insert would succeed and the row
      // would claim SG1 while pointing into HK1.
      await expect(
        client.query(
          `INSERT INTO isms_sites (id, org_entity_id, isms_profile_id, ref_code, site_name, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'SITE-SG1-999999', 'Borrowed', now())`,
          [SG1, HK1_PROFILE],
        ),
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await client.end();
    }
  });

  it('5. a site naming a profile that exists nowhere is refused too', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      // Separate from test 4 on purpose: "absent" and "not yours" must both be
      // refused, and one test covering only one of them looks identical.
      await expect(
        client.query(
          `INSERT INTO isms_sites (id, org_entity_id, isms_profile_id, ref_code, site_name, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'SITE-SG1-999998', 'Nowhere', now())`,
          [SG1, NOWHERE],
        ),
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await client.end();
    }
  });

  // === AD-UniqueKeyOracle-1, proved positively ==============================

  it('6. profile_year collides only within SG1: HK1 holding 2099 does not stop SG1 taking it', async () => {
    const owner = await asOwner();
    const app = await asApp();
    try {
      await owner.query('BEGIN');
      await owner.query(
        `INSERT INTO isms_profiles (id, org_entity_id, ref_code, profile_year, updated_at)
         VALUES (gen_random_uuid(), $1, 'ISMS-HK1-002099', 2099, now())`,
        [HK1],
      );
      await owner.query('COMMIT');

      await app.query(`SET app.entity_scope = '${SG1}'`);
      await app.query('BEGIN');

      // (a) HK1 now holds 2099. SG1 taking the same year SUCCEEDS, because
      //     org_entity_id is in the key. Drop it and this becomes 23505 — the
      //     oracle, letting SG1 enumerate which years HK1 has one guess at a
      //     time (W10 on rm_report_versions, W11 on SoA).
      await app.query(
        `INSERT INTO isms_profiles (id, org_entity_id, ref_code, profile_year, updated_at)
         VALUES (gen_random_uuid(), $1, 'ISMS-SG1-002099', 2099, now())`,
        [SG1],
      );

      // (b) SG1 taking a year SG1 already holds is refused. The two observable
      //     outcomes therefore depend only on SG1's own rows.
      await expect(
        app.query(
          `INSERT INTO isms_profiles (id, org_entity_id, ref_code, profile_year, updated_at)
           VALUES (gen_random_uuid(), $1, 'ISMS-SG1-002026', 2026, now())`,
          [SG1],
        ),
      ).rejects.toMatchObject({ code: '23505' });

      await app.query('ROLLBACK');
    } finally {
      await owner.query(`DELETE FROM isms_profiles WHERE ref_code = 'ISMS-HK1-002099'`);
      await app.end();
      await owner.end();
    }
  });

  it('7. version_label collides only within SG1: HK1 holding v9.9 does not stop SG1 taking it', async () => {
    const owner = await asOwner();
    const app = await asApp();
    try {
      await owner.query(
        `INSERT INTO isms_profile_versions
           (id, org_entity_id, isms_profile_id, ref_code, version_label, versioned_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'ISMV-HK1-009900', 'v9.9', DATE '2026-02-01', now())`,
        [HK1, HK1_PROFILE],
      );

      await app.query(`SET app.entity_scope = '${SG1}'`);
      await app.query('BEGIN');

      await app.query(
        `INSERT INTO isms_profile_versions
           (id, org_entity_id, isms_profile_id, ref_code, version_label, versioned_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'ISMV-SG1-009900', 'v9.9', DATE '2026-02-01', now())`,
        [SG1, SG1_PROFILE],
      );

      await expect(
        app.query(
          `INSERT INTO isms_profile_versions
             (id, org_entity_id, isms_profile_id, ref_code, version_label, versioned_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'ISMV-SG1-000100', 'v1.0', DATE '2026-02-01', now())`,
          [SG1, SG1_PROFILE],
        ),
      ).rejects.toMatchObject({ code: '23505' });

      await app.query('ROLLBACK');
    } finally {
      await owner.query(`DELETE FROM isms_profile_versions WHERE ref_code = 'ISMV-HK1-009900'`);
      await app.end();
      await owner.end();
    }
  });

  // === The cross-column CHECK ===============================================

  it('8. a contact that names neither a user nor a name is refused', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      await expect(
        client.query(
          `INSERT INTO isms_contacts (id, org_entity_id, isms_profile_id, ref_code, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'ICON-SG1-999999', now())`,
          [SG1, SG1_PROFILE],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    } finally {
      await client.end();
    }
  });

  // === Immutability, named for the half it actually proves ===================

  it('9. the application role has no UPDATE privilege on a version row — 42501, before any policy', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      // ⚠️ THE NAME OF THIS TEST IS NARROW ON PURPOSE. It does not prove the
      // table is immutable; it proves the GRANT half. W10's N1a measured that
      // the two layers fail differently — no GRANT gives 42501, while GRANT
      // without a FOR UPDATE policy gives no error and zero rows affected — so
      // a test called "versions are immutable" would pass with the policy half
      // silently gone. N3a is the experiment that separates them.
      await expect(
        client.query(
          `UPDATE isms_profile_versions SET note = 'rewritten' WHERE org_entity_id = $1`,
          [SG1],
        ),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  // === The grants themselves ================================================

  it('10. isms_app holds exactly the expected privilege set on each of the five tables', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        // ⚠️ `::text` on both projected columns, and it is not decoration.
        // information_schema exposes these as the `sql_identifier` domain, which
        // node-pg has no parser for: `array_agg` of them arrives as the literal
        // string '{INSERT,SELECT,UPDATE}' rather than an array, and toEqual
        // against an array then fails on a grant set that is actually correct.
        // Measured, not anticipated — the first run of this test failed exactly
        // that way while tests 1-9 passed.
        `SELECT table_name::text AS table_name,
                array_agg(privilege_type::text ORDER BY privilege_type) AS privs
           FROM information_schema.role_table_grants
          WHERE grantee = 'isms_app' AND table_name = ANY($1)
          GROUP BY table_name
          ORDER BY 1`,
        [FIVE],
      );

      // Sorted in JS for the collation reason test 3 gives.
      expect([...rows.map((r: { table_name: string }) => r.table_name)].sort()).toEqual(
        [...FIVE].sort(),
      );

      for (const row of rows) {
        // ⭐ EQUALITY, not containment. `toContain` would pass just as happily
        // with a stray GRANT DELETE, and a mis-typed grant on an append-only
        // table is precisely the shape that produces an unauditable write
        // (guardrail 5). AD-W15ConstraintSurfaceUntested-1 names this as the
        // fix W15 should have had.
        const expected = MUTABLE.includes(row.table_name)
          ? ['INSERT', 'SELECT', 'UPDATE']
          : ['INSERT', 'SELECT'];
        expect({ table: row.table_name, privs: row.privs }).toEqual({
          table: row.table_name,
          privs: expected,
        });
      }
    } finally {
      await client.end();
    }
  });
});
