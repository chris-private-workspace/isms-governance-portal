/**
 * File: apps/api/src/core-model/jurisdiction.int.spec.ts
 * Purpose: Pin the two properties W15's three tables are DEFINED by absence —
 *   no row-level security, and no write path for the application role.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W15 (M1 slice 10)
 * Owner: docs/rules-on-demand/multi-tenant-data.md:57-67 (global reference tables)
 *
 * Description:
 *   Raw `pg`, no Nest and no Prisma, for two independent reasons rather than
 *   one. First the W02 reason (rls-direct.int.spec.ts): a test that reaches the
 *   database through the code under test cannot tell which of the two layers
 *   refused. Second, and specific to this slice: there IS no code under test —
 *   W15 ships three tables and zero repositories, deliberately (plan §3.1 D3).
 *
 *   ⛔ Two connections, and which one each test uses is load-bearing. The
 *   application role holds `GRANT SELECT` only on all three tables (Day-0 D7),
 *   so PostgreSQL refuses its inserts on privilege — 42501 — BEFORE any
 *   constraint is evaluated. A foreign-key assertion issued as isms_app would
 *   therefore go green while never once reaching the foreign key. The FK tests
 *   run as the owner, the same role the seed uses, which is the same shape as
 *   W02's tests that bypass the application entirely.
 *
 *   ⭐ Test 6 exists because nothing else in the repo could fail if
 *   `org_entities_jurisdiction_id_fkey` were dropped: the seed only ever
 *   supplies ids that exist, so AC-3 was a structural claim with no behaviour
 *   behind it and the N1 neutralisation would have falsified nothing (W15 Day-2
 *   D9).
 *
 * Created: 2026-08-16 (Phase W15)
 * Last Modified: 2026-08-16
 *
 * Modification History (newest-first):
 *   - 2026-08-16: Initial creation (Phase W15)
 */
import { Client } from 'pg';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const SG = '00000000-0000-0000-0000-0000000001a1';
const PDPA = '00000000-0000-0000-0000-0000000001b0';

/** Exists in no table. Verified zero hits across apps/api before use — W14 lost
 *  seven tests to an id that was already an assessment instance. */
const NOWHERE = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/** The in-scope group, quoted from 15:41 (已確認參數 #4) — NOT read back from
 *  the seed array. A count derived from the thing it is checking is the vacuous
 *  shape AD-VacuousScopeTest-1 names; this list is an external fact, so the
 *  assertion can disagree with the fixture. */
const IN_SCOPE = ['AU', 'HK', 'ID', 'KR', 'MY', 'NZ', 'PH', 'SG', 'TH', 'TW', 'VN'];

const THREE = ['jurisdictions', 'obligations', 'regulations'];

/** Per-test connections: `app.entity_scope` becomes *defined* once set on a
 *  session, and test 2 depends on a session where it never was. */
async function asApp(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

/** The role the seed runs as — the only one that can write these tables. */
async function asOwner(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL_MIGRATE });
  await client.connect();
  return client;
}

const codes = async (client: Client): Promise<string[]> => {
  const { rows } = await client.query(
    'SELECT code FROM jurisdictions WHERE retired_at IS NULL ORDER BY 1',
  );
  return rows.map((r: { code: string }) => r.code);
};

describe('the jurisdiction spine and obligation library, with the application removed', () => {
  // === AC-4: global readability, stated as what it proves ====================

  it('1. an SG1-scoped connection reads all eleven jurisdictions — no policy filters this table', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      // SG1's own jurisdiction is SG. A well-meant "only show jurisdictions
      // your entities are in" policy would return exactly one row here, which
      // is the failure this test is shaped to catch (neutralisation N2).
      expect(await codes(client)).toEqual(IN_SCOPE);
    } finally {
      await client.end();
    }
  });

  it('2. a connection that was NEVER scoped reads them too — nothing here consults app.entity_scope', async () => {
    const client = await asApp();
    try {
      // The stronger half of AC-4, and it distinguishes a case test 1 cannot:
      // a policy that happens to be permissive still calls current_setting,
      // which raises 42704 on an unscoped session (rls-direct test 6 pins that
      // for policies). Eleven rows coming back here means no policy is
      // evaluated at all, not that one was evaluated and let everything past.
      expect(await codes(client)).toEqual(IN_SCOPE);
    } finally {
      await client.end();
    }
  });

  it('3. the catalog agrees: row-level security is off and zero policies exist on all three', async () => {
    const client = await asApp();
    try {
      const { rows } = await client.query(
        `SELECT c.relname,
                c.relrowsecurity,
                (SELECT count(*)::int FROM pg_policies p
                  WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = ANY($1)
          ORDER BY 1`,
        [THREE],
      );

      // Length first: tests 1 and 2 only ever touch jurisdictions, so without
      // this the other two tables could be missing entirely — or acquire RLS —
      // with every assertion above still green.
      expect(rows.map((r: { relname: string }) => r.relname)).toEqual(THREE);
      for (const row of rows) {
        expect({ table: row.relname, rls: row.relrowsecurity, policies: row.policies }).toEqual({
          table: row.relname,
          rls: false,
          policies: 0,
        });
      }
    } finally {
      await client.end();
    }
  });

  // === AC-5: referential integrity, as the owner, because the app cannot ======

  it('4. an obligation naming a regulation that does not exist is refused', async () => {
    const client = await asOwner();
    try {
      await expect(
        client.query(
          `INSERT INTO obligations (id, regulation_id, jurisdiction_id, reference, text, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 's.absent-parent', 'x', now())`,
          [NOWHERE, SG],
        ),
        // SQLSTATE, never the message: a wording change in a PostgreSQL point
        // release would otherwise break a test that is right (AD-GrepAssertion-1).
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await client.end();
    }
  });

  it('5. an obligation naming a jurisdiction that does not exist is refused', async () => {
    const client = await asOwner();
    try {
      // Both FKs, separately. 02a:427 requires two N:1 links, and one composite
      // test satisfying only one of them would look identical to this pair.
      await expect(
        client.query(
          `INSERT INTO obligations (id, regulation_id, jurisdiction_id, reference, text, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 's.absent-jurisdiction', 'x', now())`,
          [PDPA, NOWHERE],
        ),
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await client.end();
    }
  });

  it('6. an org_entity naming a jurisdiction that does not exist is refused — AC-3, which nothing else could fail', async () => {
    const client = await asOwner();
    try {
      await expect(
        client.query(
          `INSERT INTO org_entities (id, code, name, type, path, jurisdiction_id, updated_at)
           VALUES (gen_random_uuid(), 'ZZ-int', 'Nowhere', 'legal_entity'::org_entity_type,
                   '/apac/zz-int', $1, now())`,
          [NOWHERE],
        ),
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await client.end();
    }
  });

  // === The grant, which is what makes plan §3.1 D3 a database guarantee =======

  it('7. the application role can write none of the three — SELECT is the only privilege', async () => {
    const client = await asApp();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      // ⭐ Every value below is real and seeded, so nothing but the missing
      // privilege can be doing the refusing. This is the load-bearing test for
      // the decision NOT to add these models to AUDITED_MODELS (plan §3.1 D3):
      // "there is no write path to audit" is a property of the grants, not an
      // observation about which repositories happen to exist today.
      const denied = { code: '42501' };
      await expect(
        client.query(
          `INSERT INTO jurisdictions (id, code, name, updated_at)
           VALUES (gen_random_uuid(), 'ZZ', 'Invented by SG1', now())`,
        ),
      ).rejects.toMatchObject(denied);
      await expect(
        client.query(
          `INSERT INTO regulations (id, name, jurisdiction_id, updated_at)
           VALUES (gen_random_uuid(), 'Invented by SG1', $1, now())`,
          [SG],
        ),
      ).rejects.toMatchObject(denied);
      await expect(
        client.query(
          `INSERT INTO obligations (id, regulation_id, jurisdiction_id, reference, text, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 's.invented', 'x', now())`,
          [PDPA, SG],
        ),
      ).rejects.toMatchObject(denied);
    } finally {
      await client.end();
    }
  });
});
